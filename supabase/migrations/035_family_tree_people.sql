-- 035_family_tree_people.sql
-- Adds non-member "ghost" profiles for the family tree (deceased relatives, etc.)
-- and tracks which side of a relation is a member vs. a tree_person.

-- ─── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.family_tree_people (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name  TEXT        NOT NULL,
  photo_url     TEXT,
  birth_year    INTEGER,
  death_year    INTEGER,
  notes         TEXT,
  created_by    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Track person type on relations ──────────────────────────────────────────
ALTER TABLE public.family_relations
  ADD COLUMN IF NOT EXISTS person_a_type TEXT NOT NULL DEFAULT 'member'
    CHECK (person_a_type IN ('member', 'tree_person')),
  ADD COLUMN IF NOT EXISTS person_b_type TEXT NOT NULL DEFAULT 'member'
    CHECK (person_b_type IN ('member', 'tree_person'));

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.family_tree_people ENABLE ROW LEVEL SECURITY;

-- Active members can read all tree people
CREATE POLICY "active members read tree people"
  ON public.family_tree_people FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- Active members can create non-member entries
CREATE POLICY "active members insert tree people"
  ON public.family_tree_people FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- Creator or admin can update
CREATE POLICY "creator or admin update tree people"
  ON public.family_tree_people FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── Storage bucket for tree-person photos ────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('tree-people', 'tree-people', true)
  ON CONFLICT (id) DO NOTHING;

DO $pol$ BEGIN

  CREATE POLICY "public read tree-people"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'tree-people');

EXCEPTION WHEN duplicate_object THEN NULL; END $pol$;

DO $pol$ BEGIN

  CREATE POLICY "authenticated upload tree-people"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'tree-people'
      AND auth.role() = 'authenticated'
    );

EXCEPTION WHEN duplicate_object THEN NULL; END $pol$;

DO $pol$ BEGIN

  CREATE POLICY "authenticated update tree-people"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'tree-people'
      AND auth.role() = 'authenticated'
    );

EXCEPTION WHEN duplicate_object THEN NULL; END $pol$;
