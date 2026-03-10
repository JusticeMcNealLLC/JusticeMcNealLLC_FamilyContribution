-- Migration 033: notify admins when a new family_relations suggestion is inserted

-- Function to create notifications for all admins when a pending suggestion is created
CREATE OR REPLACE FUNCTION notify_admins_on_family_relation_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    admin_rec RECORD;
    actor_name text;
    actor_avatar text;
BEGIN
    IF NEW.status = 'pending' THEN
        SELECT COALESCE(first_name,'') || ' ' || COALESCE(last_name,''), profile_picture_url
        INTO actor_name, actor_avatar
        FROM profiles WHERE id = NEW.created_by;

        FOR admin_rec IN SELECT id FROM profiles WHERE role = 'admin' LOOP
            INSERT INTO notifications (user_id, type, message, actor_id, actor_name, actor_avatar, link)
            VALUES (
                admin_rec.id,
                'family_relation',
                'New family relation suggestion awaiting approval',
                NEW.created_by,
                actor_name,
                actor_avatar,
                '/admin/family-approvals.html'
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger
DROP TRIGGER IF EXISTS trg_notify_admins_on_family_rel_insert ON public.family_relations;
CREATE TRIGGER trg_notify_admins_on_family_rel_insert
AFTER INSERT ON public.family_relations
FOR EACH ROW
EXECUTE FUNCTION notify_admins_on_family_relation_insert();
