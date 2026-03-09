-- ─── Notification Triggers ───────────────────────────────
-- Automatically create notifications when social interactions
-- and gamification events occur. Uses the create_notification()
-- helper from migration 023.
-- ──────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════
-- 1. POST LIKE → notify the post author
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_author_id uuid;
    v_preview   text;
BEGIN
    -- Get the post author and a content preview
    SELECT author_id, LEFT(content, 80)
    INTO v_author_id, v_preview
    FROM posts WHERE id = NEW.post_id;

    IF v_author_id IS NULL THEN RETURN NEW; END IF;

    PERFORM create_notification(
        v_author_id,
        'like',
        NULL,  -- message auto-built by frontend from actor_name + type
        NEW.user_id,
        'feed.html#post-' || NEW.post_id
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_like ON post_likes;
CREATE TRIGGER trg_notify_post_like
    AFTER INSERT ON post_likes
    FOR EACH ROW
    EXECUTE FUNCTION notify_post_like();


-- ═══════════════════════════════════════════════════════════
-- 2. POST COMMENT → notify post author (and parent comment author for replies)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_post_author   uuid;
    v_parent_author uuid;
    v_preview       text;
BEGIN
    -- Get the post author
    SELECT author_id INTO v_post_author
    FROM posts WHERE id = NEW.post_id;

    -- Notify the post author about the new comment
    IF v_post_author IS NOT NULL THEN
        PERFORM create_notification(
            v_post_author,
            'comment',
            NULL,
            NEW.author_id,
            'feed.html#post-' || NEW.post_id
        );
    END IF;

    -- If this is a reply to another comment, notify the parent comment author too
    IF NEW.parent_id IS NOT NULL THEN
        SELECT author_id INTO v_parent_author
        FROM post_comments WHERE id = NEW.parent_id;

        -- Only notify if parent author != post author (avoid double notif)
        -- and parent author != comment author (create_notification already skips self)
        IF v_parent_author IS NOT NULL AND v_parent_author IS DISTINCT FROM v_post_author THEN
            PERFORM create_notification(
                v_parent_author,
                'comment',
                NULL,
                NEW.author_id,
                'feed.html#post-' || NEW.post_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_comment ON post_comments;
CREATE TRIGGER trg_notify_post_comment
    AFTER INSERT ON post_comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_post_comment();


-- ═══════════════════════════════════════════════════════════
-- 3. COMMENT LIKE → notify the comment author
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION notify_comment_like()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_comment_author uuid;
    v_post_id        uuid;
BEGIN
    -- Get the comment author and its post
    SELECT author_id, post_id
    INTO v_comment_author, v_post_id
    FROM post_comments WHERE id = NEW.comment_id;

    IF v_comment_author IS NULL THEN RETURN NEW; END IF;

    PERFORM create_notification(
        v_comment_author,
        'like',
        NULL,
        NEW.user_id,
        'feed.html#post-' || v_post_id
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment_like ON comment_likes;
CREATE TRIGGER trg_notify_comment_like
    AFTER INSERT ON comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION notify_comment_like();


-- ═══════════════════════════════════════════════════════════
-- 4. BADGE EARNED → notify the member
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION notify_badge_earned()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_badge_name text;
BEGIN
    -- Map badge_key to display name
    v_badge_name := REPLACE(INITCAP(REPLACE(NEW.badge_key, '_', ' ')), ' ', ' ');

    PERFORM create_notification(
        NEW.user_id,
        'badge',
        'You earned the ' || v_badge_name || ' badge!',
        NULL,
        'profile.html'
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_badge_earned ON member_badges;
CREATE TRIGGER trg_notify_badge_earned
    AFTER INSERT ON member_badges
    FOR EACH ROW
    EXECUTE FUNCTION notify_badge_earned();


-- ═══════════════════════════════════════════════════════════
-- 5. QUEST COMPLETED → notify the member
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION notify_quest_completed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_quest_title text;
    v_cp_reward   int;
BEGIN
    -- Only fire when status changes TO 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
        SELECT title, cp_reward INTO v_quest_title, v_cp_reward
        FROM quests WHERE id = NEW.quest_id;

        PERFORM create_notification(
            NEW.user_id,
            'quest',
            'Quest completed: ' || COALESCE(v_quest_title, 'Unknown') || ' (+' || COALESCE(v_cp_reward, 0) || ' CP)',
            NEW.verified_by,  -- admin who verified, if any
            'quests.html'
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_quest_completed ON member_quests;
CREATE TRIGGER trg_notify_quest_completed
    AFTER UPDATE ON member_quests
    FOR EACH ROW
    EXECUTE FUNCTION notify_quest_completed();


-- ═══════════════════════════════════════════════════════════
-- 6. PAYOUT SENT → notify the recipient
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION notify_payout_sent()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_amount_str text;
    v_type_label text;
BEGIN
    -- Only fire when status changes TO 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
        v_amount_str := '$' || ROUND(NEW.amount_cents / 100.0, 2)::text;
        v_type_label := INITCAP(REPLACE(COALESCE(NEW.payout_type, 'custom'), '_', ' '));

        PERFORM create_notification(
            NEW.user_id,
            'payout',
            v_type_label || ' payout of ' || v_amount_str || ' sent to your bank!',
            NEW.created_by,
            'settings.html'
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_payout_sent ON payouts;
CREATE TRIGGER trg_notify_payout_sent
    AFTER UPDATE ON payouts
    FOR EACH ROW
    EXECUTE FUNCTION notify_payout_sent();


-- ═══════════════════════════════════════════════════════════
-- 7. @MENTION in post content → notify mentioned members
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION notify_post_mentions()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_mention     text;
    v_mentions    text[];
    v_target_id   uuid;
    v_name_parts  text[];
BEGIN
    -- Extract @mentions from content (pattern: @FirstName LastName)
    -- This is a simple approach — find all @Name Name patterns
    SELECT ARRAY(
        SELECT (regexp_matches(NEW.content, '@([A-Za-z]+ [A-Za-z]+)', 'g'))[1]
    ) INTO v_mentions;

    IF v_mentions IS NULL OR array_length(v_mentions, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    FOREACH v_mention IN ARRAY v_mentions LOOP
        v_name_parts := string_to_array(v_mention, ' ');
        IF array_length(v_name_parts, 1) >= 2 THEN
            SELECT id INTO v_target_id
            FROM profiles
            WHERE LOWER(first_name) = LOWER(v_name_parts[1])
              AND LOWER(last_name)  = LOWER(v_name_parts[2])
            LIMIT 1;

            IF v_target_id IS NOT NULL THEN
                PERFORM create_notification(
                    v_target_id,
                    'mention',
                    NULL,
                    NEW.author_id,
                    'feed.html#post-' || NEW.id
                );
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_mentions ON posts;
CREATE TRIGGER trg_notify_post_mentions
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION notify_post_mentions();


-- ═══════════════════════════════════════════════════════════
-- 8. @MENTION in comment content → notify mentioned members
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION notify_comment_mentions()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_mention     text;
    v_mentions    text[];
    v_target_id   uuid;
    v_name_parts  text[];
BEGIN
    SELECT ARRAY(
        SELECT (regexp_matches(NEW.content, '@([A-Za-z]+ [A-Za-z]+)', 'g'))[1]
    ) INTO v_mentions;

    IF v_mentions IS NULL OR array_length(v_mentions, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    FOREACH v_mention IN ARRAY v_mentions LOOP
        v_name_parts := string_to_array(v_mention, ' ');
        IF array_length(v_name_parts, 1) >= 2 THEN
            SELECT id INTO v_target_id
            FROM profiles
            WHERE LOWER(first_name) = LOWER(v_name_parts[1])
              AND LOWER(last_name)  = LOWER(v_name_parts[2])
            LIMIT 1;

            IF v_target_id IS NOT NULL THEN
                PERFORM create_notification(
                    v_target_id,
                    'mention',
                    NULL,
                    NEW.author_id,
                    'feed.html#post-' || NEW.post_id
                );
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment_mentions ON post_comments;
CREATE TRIGGER trg_notify_comment_mentions
    AFTER INSERT ON post_comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_comment_mentions();
