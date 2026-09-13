-- §13.15 line 480 — Colorado Snowboarding Trip 2028 (staging draft)
-- Idempotent on slug. created_by resolved from Justin profile email.
-- Apply via: node scripts/create-colorado-event-2028.js

WITH creator AS (
    SELECT id
    FROM profiles
    WHERE email = 'mcneal.justin99@gmail.com'
    LIMIT 1
)
INSERT INTO events (
    created_by,
    event_type,
    category,
    title,
    slug,
    description,
    location_text,
    location_nickname,
    location_lat,
    location_lng,
    start_date,
    timezone,
    status,
    member_only,
    pricing_mode,
    adult_price_cents,
    rsvp_cost_cents,
    kids_free,
    kid_price_cents,
    capacity_mode,
    max_participants,
    fund_deadline
)
SELECT
    creator.id,
    'member',
    'trip',
    'Colorado Snowboarding Trip 2028',
    'colorado-snowboarding-2028',
    'Family snowboarding trip — Keystone, Colorado. Pricing and capacity locked for launch; About, included items, and disclaimers filled in §13.15 line 481.',
    'Keystone, Colorado',
    'Keystone',
    39.60500,   -- Keystone Resort (portal inline map)
    -105.95417,
    TIMESTAMPTZ '2028-01-25 12:00:00-05',
    'America/New_York',
    'draft',
    FALSE,
    'paid',
    100000,
    100000,
    TRUE,
    NULL,
    'none',
    NULL,
    TIMESTAMPTZ '2027-11-01 00:00:00-04'
FROM creator
WHERE EXISTS (SELECT 1 FROM creator)
ON CONFLICT (slug) DO UPDATE SET
    event_type = EXCLUDED.event_type,
    category = EXCLUDED.category,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    location_text = EXCLUDED.location_text,
    location_nickname = EXCLUDED.location_nickname,
    location_lat = EXCLUDED.location_lat,
    location_lng = EXCLUDED.location_lng,
    start_date = EXCLUDED.start_date,
    timezone = EXCLUDED.timezone,
    status = EXCLUDED.status,
    member_only = EXCLUDED.member_only,
    pricing_mode = EXCLUDED.pricing_mode,
    adult_price_cents = EXCLUDED.adult_price_cents,
    rsvp_cost_cents = EXCLUDED.rsvp_cost_cents,
    kids_free = EXCLUDED.kids_free,
    kid_price_cents = EXCLUDED.kid_price_cents,
    capacity_mode = EXCLUDED.capacity_mode,
    max_participants = EXCLUDED.max_participants,
    fund_deadline = EXCLUDED.fund_deadline
RETURNING id, slug, location_lat, location_lng, adult_price_cents, kids_free, capacity_mode, fund_deadline, start_date, status;
