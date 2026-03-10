-- Migration 032: family_relations table + RLS policies
-- Member-suggested edits model: inserts default to 'pending', admins approve.

CREATE TABLE IF NOT EXISTS public.family_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_a uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  person_b uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relation text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  created_by uuid NOT NULL REFERENCES profiles(id),
  approved_by uuid NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable row level security
ALTER TABLE public.family_relations ENABLE ROW LEVEL SECURITY;

-- Allow SELECT of approved relations to everyone; admins can view all
CREATE POLICY "select_public" ON public.family_relations
  FOR SELECT
  USING (
    status = 'approved' OR ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  );

-- Admins get full access
CREATE POLICY "admins_full" ON public.family_relations
  FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Members may INSERT suggestions (must be pending and created_by = auth.uid())
CREATE POLICY "members_insert_suggest" ON public.family_relations
  FOR INSERT
  WITH CHECK (created_by = auth.uid() AND status = 'pending');

-- Creator can UPDATE their own pending suggestion
CREATE POLICY "creator_modify_pending" ON public.family_relations
  FOR UPDATE
  USING (created_by = auth.uid() AND status = 'pending')
  WITH CHECK (created_by = auth.uid() AND status = 'pending');

-- Creator can DELETE their own pending suggestion
CREATE POLICY "creator_delete_pending" ON public.family_relations
  FOR DELETE
  USING (created_by = auth.uid() AND status = 'pending');
