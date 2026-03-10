-- 039_cleanup_yolanda_and_admin_delete_policy.sql
-- 1. Delete Yolanda McNeal (birth 1972) + any related family_relations (no FK cascade exists)
-- 2. Add admin DELETE policy on family_tree_people

DO $$
DECLARE
  yolanda_id UUID;
BEGIN
  SELECT id INTO yolanda_id
    FROM public.family_tree_people
   WHERE display_name = 'Yolanda McNeal' AND birth_year = 1972
   LIMIT 1;

  IF yolanda_id IS NOT NULL THEN
    DELETE FROM public.family_relations
     WHERE person_a = yolanda_id OR person_b = yolanda_id;
    DELETE FROM public.family_tree_people WHERE id = yolanda_id;
  END IF;
END $$;

-- Admin can delete any tree_person row
DO $pol$ BEGIN
  CREATE POLICY "admin delete tree people"
    ON public.family_tree_people FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $pol$;
