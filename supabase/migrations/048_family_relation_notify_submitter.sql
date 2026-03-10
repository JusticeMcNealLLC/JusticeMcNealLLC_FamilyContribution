-- Migration 048: Also notify the submitter when their family relation suggestion
-- is saved, linking them back to the family tree (not the admin approvals page).
-- Admins already receive a notification via migration 033.

CREATE OR REPLACE FUNCTION notify_admins_on_family_relation_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    admin_rec   RECORD;
    actor_name  text;
    actor_avatar text;
BEGIN
    IF NEW.status = 'pending' THEN
        SELECT COALESCE(first_name,'') || ' ' || COALESCE(last_name,''), profile_picture_url
        INTO actor_name, actor_avatar
        FROM profiles WHERE id = NEW.created_by;

        -- Notify all admins → link to the approvals page
        FOR admin_rec IN SELECT id FROM profiles WHERE role = 'admin' LOOP
            INSERT INTO notifications (user_id, type, message, actor_id, actor_name, actor_avatar, link)
            VALUES (
                admin_rec.id,
                'family_relation',
                actor_name || ' submitted a family relation suggestion',
                NEW.created_by,
                actor_name,
                actor_avatar,
                '/admin/family-approvals.html'
            );
        END LOOP;

        -- Notify the submitter → link back to the family tree
        INSERT INTO notifications (user_id, type, message, actor_id, actor_name, actor_avatar, link)
        VALUES (
            NEW.created_by,
            'family_relation',
            'Your family relation suggestion is awaiting admin approval.',
            NEW.created_by,
            actor_name,
            actor_avatar,
            '/portal/family-tree.html'
        );
    END IF;

    RETURN NEW;
END;
$$;
