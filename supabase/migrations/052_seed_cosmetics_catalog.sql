-- ══════════════════════════════════════════════════════════════
-- Migration 052 — Seed Cosmetics Catalog + Migrate Existing Data
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Seed Banner Catalog ───────────────────────────────────
-- Matches the hardcoded BANNER_CATALOG in js/portal/profile/badges.js
INSERT INTO cosmetics (key, type, name, rarity, preview_class, lottie_effect, is_animated, is_quest_locked, sort_order)
VALUES
    ('founders-animated', 'banner', 'Founders Constellation', 'legendary', 'founders-banner-preview', 'sparkle',    true,  true,  10),
    ('cat-playing',       'banner', 'Cat Banner',             'legendary', 'cat-banner-preview',       'cat-playing',true,  true,  20),
    ('storm',             'banner', 'Storm',                  'epic',      NULL,                        'lightning',  false, false, 30),
    ('inferno',           'banner', 'Inferno',                'epic',      NULL,                        'fire',       false, false, 40),
    ('celebration',       'banner', 'Celebration',            'rare',      NULL,                        'confetti',   false, false, 50),
    ('starfield',         'banner', 'Starfield',              'rare',      NULL,                        'stars',      false, false, 60),
    ('from-blue-500 to-purple-600',   'banner', 'Twilight',      'common', NULL, NULL, false, false, 70),
    ('from-emerald-500 to-teal-600',  'banner', 'Emerald Wave',  'common', NULL, NULL, false, false, 80),
    ('from-rose-500 to-pink-600',     'banner', 'Rose Gold',     'common', NULL, NULL, false, false, 90),
    ('from-amber-500 to-orange-600',  'banner', 'Sunset',        'common', NULL, NULL, false, false, 100),
    ('from-violet-500 to-indigo-600', 'banner', 'Cosmic Purple', 'common', NULL, NULL, false, false, 110),
    ('from-cyan-500 to-blue-600',     'banner', 'Ocean Breeze',  'common', NULL, NULL, false, false, 120)
ON CONFLICT (key) DO UPDATE SET
    name          = EXCLUDED.name,
    rarity        = EXCLUDED.rarity,
    preview_class = EXCLUDED.preview_class,
    lottie_effect = EXCLUDED.lottie_effect,
    is_animated   = EXCLUDED.is_animated,
    sort_order    = EXCLUDED.sort_order;

-- Store gradient strings for non-animated banners
UPDATE cosmetics SET gradient = 'from-slate-900 to-purple-900' WHERE key = 'storm';
UPDATE cosmetics SET gradient = 'from-red-900 to-orange-600'   WHERE key = 'inferno';
UPDATE cosmetics SET gradient = 'from-pink-500 to-violet-600'  WHERE key = 'celebration';
UPDATE cosmetics SET gradient = 'from-slate-900 to-indigo-950' WHERE key = 'starfield';
-- Gradient-as-key banners (the key IS the gradient string)
UPDATE cosmetics SET gradient = key WHERE key LIKE 'from-%';

-- ─── 2. Seed Badge Catalog ────────────────────────────────────
-- Matches the hardcoded BADGE_CATALOG in js/portal/quests/config.js
INSERT INTO cosmetics (key, type, name, emoji, description, rarity, is_quest_locked, sort_order)
VALUES
    ('founding_member', 'badge', 'Founding Member',    '🏅', 'Joined during year 1 of the LLC',            'legendary', true,  200),
    ('shutterbug',      'badge', 'Shutterbug',          '📸', 'Uploaded a profile picture',                  'common',    false, 210),
    ('streak_master',   'badge', 'Streak Master',       '🔥', '6+ consecutive on-time months',               'epic',      true,  220),
    ('streak_legend',   'badge', 'Streak Legend',       '⚡', '12+ consecutive on-time months',              'legendary', true,  230),
    ('first_seed',      'badge', 'First Seed Witness',  '🌱', 'Active member when $500 milestone hit',       'rare',      false, 240),
    ('four_figures',    'badge', 'Four Figure Club',    '💵', 'Active when $1,000 milestone hit',            'epic',      false, 250),
    ('quest_champion',  'badge', 'Quest Champion',      '🎯', 'Completed 10+ quests',                        'epic',      true,  260),
    ('fidelity_linked', 'badge', 'Fidelity Linked',     '🏦', 'Opened Fidelity account & linked cashback',   'rare',      true,  270),
    ('birthday_vip',    'badge', 'Birthday VIP',        '🎂', 'Linked bank for birthday payouts',            'rare',      false, 280)
ON CONFLICT (key) DO UPDATE SET
    name        = EXCLUDED.name,
    emoji       = EXCLUDED.emoji,
    description = EXCLUDED.description,
    rarity      = EXCLUDED.rarity,
    sort_order  = EXCLUDED.sort_order;

-- ─── 3. Link Cosmetics → Their Unlocking Quests ───────────────
-- Records which quest auto_detect_key grants each cosmetic.
UPDATE cosmetics SET quest_unlock_key = 'upload_photo'          WHERE key = 'shutterbug';
UPDATE cosmetics SET quest_unlock_key = 'streak_6'              WHERE key = 'streak_master';
UPDATE cosmetics SET quest_unlock_key = 'streak_12'             WHERE key = 'streak_legend';
UPDATE cosmetics SET quest_unlock_key = 'activate_subscription' WHERE key = 'founding_member';
UPDATE cosmetics SET quest_unlock_key = 'activate_subscription' WHERE key = 'founders-animated';
-- fidelity_linked is awarded on manual quest approval for 'Link Cashback to LLC'

-- ─── 4. Link Quests → Their Cosmetic Rewards ──────────────────
-- badge_reward_key (already exists from migration 043)
-- banner_reward_key (new in migration 051)
UPDATE quests SET badge_reward_key  = 'shutterbug'      WHERE auto_detect_key = 'upload_photo';
UPDATE quests SET badge_reward_key  = 'streak_master'   WHERE auto_detect_key = 'streak_6';
UPDATE quests SET badge_reward_key  = 'streak_legend'   WHERE auto_detect_key = 'streak_12';
UPDATE quests SET badge_reward_key  = 'founding_member' WHERE auto_detect_key = 'activate_subscription';
UPDATE quests SET badge_reward_key  = 'fidelity_linked' WHERE title = 'Link Cashback to LLC';
UPDATE quests SET banner_reward_key = 'founders-animated' WHERE auto_detect_key = 'activate_subscription';

-- ─── 5. Migrate Existing Badges → member_cosmetics ───────────
-- Back-fill member_cosmetics from the existing member_badges table.
INSERT INTO member_cosmetics (user_id, cosmetic_key, earned_at, awarded_by)
SELECT
    mb.user_id,
    mb.badge_key,
    COALESCE(mb.earned_at, mb.created_at, now()),
    'system'
FROM member_badges mb
-- Only import badges that exist in the cosmetics catalog
WHERE EXISTS (SELECT 1 FROM cosmetics c WHERE c.key = mb.badge_key AND c.type = 'badge')
ON CONFLICT (user_id, cosmetic_key) DO NOTHING;

-- ─── 6. Migrate Existing Earned Banners → member_cosmetics ───
-- Back-fill member_cosmetics from profiles.earned_banners TEXT[] column.
INSERT INTO member_cosmetics (user_id, cosmetic_key, earned_at, awarded_by)
SELECT
    p.id,
    unnested_banner,
    now(),
    'system'
FROM profiles p,
     LATERAL UNNEST(COALESCE(p.earned_banners, '{}'::TEXT[])) AS unnested_banner
-- Only import banners that exist in the cosmetics catalog
WHERE EXISTS (SELECT 1 FROM cosmetics c WHERE c.key = unnested_banner AND c.type = 'banner')
ON CONFLICT (user_id, cosmetic_key) DO NOTHING;

-- ─── 7. Populate active_banner_key from cover_gradient ────────
-- Sync the new FK-backed column for any member who has a valid cover_gradient.
UPDATE profiles
SET active_banner_key = cover_gradient
WHERE cover_gradient IS NOT NULL
  AND EXISTS (SELECT 1 FROM cosmetics c WHERE c.key = cover_gradient AND c.type = 'banner')
  AND active_banner_key IS NULL;
