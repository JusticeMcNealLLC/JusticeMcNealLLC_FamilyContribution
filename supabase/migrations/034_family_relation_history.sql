-- Migration 034: family_relation_history audit table and trigger

CREATE TABLE IF NOT EXISTS public.family_relation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_relation_id uuid REFERENCES public.family_relations(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_id uuid NULL REFERENCES profiles(id),
  old_row jsonb,
  new_row jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_relation_history_relation_id ON public.family_relation_history(family_relation_id, created_at DESC);

-- Function to log changes
CREATE OR REPLACE FUNCTION family_relation_history_log()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_action text;
  v_actor uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    v_actor := NEW.created_by;
    INSERT INTO public.family_relation_history (family_relation_id, action, actor_id, old_row, new_row)
    VALUES (NEW.id, v_action, v_actor, NULL, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
      v_action := 'status:' || COALESCE(NEW.status,'');
      -- prefer approved_by if set, else created_by
      v_actor := COALESCE(NEW.approved_by, NEW.created_by);
    ELSE
      v_action := 'update';
      v_actor := COALESCE(NEW.approved_by, NEW.created_by);
    END IF;
    INSERT INTO public.family_relation_history (family_relation_id, action, actor_id, old_row, new_row)
    VALUES (COALESCE(NEW.id, OLD.id), v_action, v_actor, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_family_relation_history_log ON public.family_relations;
CREATE TRIGGER trg_family_relation_history_log
AFTER INSERT OR UPDATE ON public.family_relations
FOR EACH ROW
EXECUTE FUNCTION family_relation_history_log();
