-- 038_cleanup_duplicate_tree_people.sql
-- Remove duplicate family_tree_people rows created during testing,
-- keeping only the Yolanda McNeal entry with birth_year = 1972.
DELETE FROM public.family_tree_people
WHERE display_name = 'Yolanda McNeal'
  AND (birth_year IS DISTINCT FROM 1972);
