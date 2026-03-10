-- 036_drop_family_relations_fk.sql
-- person_a and person_b can now reference either profiles OR family_tree_people.
-- Drop the hard FK constraints added in 032 so non-member UUIDs can be inserted.

ALTER TABLE public.family_relations
  DROP CONSTRAINT IF EXISTS family_relations_person_a_fkey,
  DROP CONSTRAINT IF EXISTS family_relations_person_b_fkey;

-- Also drop the created_by FK so tree_people creators are not blocked either
-- (created_by always references a real auth user so we keep it)

-- Ensure the type columns from 035 exist (idempotent)
ALTER TABLE public.family_relations
  ADD COLUMN IF NOT EXISTS person_a_type TEXT NOT NULL DEFAULT 'member'
    CHECK (person_a_type IN ('member', 'tree_person')),
  ADD COLUMN IF NOT EXISTS person_b_type TEXT NOT NULL DEFAULT 'member'
    CHECK (person_b_type IN ('member', 'tree_person'));
