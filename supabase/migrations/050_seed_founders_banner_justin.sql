-- Migration 050: Seed founders-animated banner for Justin (mcneal.justin99@gmail.com)
-- The earned_banners column was added in migration 049, but the back-fill only copied
-- the then-active cover_gradient. Justin had 'cat-playing' active at migration time,
-- so 'founders-animated' was never added to his earned_banners array.
-- This corrects that omission.

UPDATE profiles
SET earned_banners = array_append(earned_banners, 'founders-animated')
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'mcneal.justin99@gmail.com'
)
AND NOT ('founders-animated' = ANY(COALESCE(earned_banners, '{}'::TEXT[])));
