-- §13.15 line 480 — Colorado Snowboarding Trip 2027 (staging draft)
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
    itinerary,
    location_text,
    location_nickname,
    location_lat,
    location_lng,
    start_date,
    end_date,
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
    fund_deadline,
    transportation_enabled,
    transportation_mode,
    transportation_method,
    transportation_estimate_cents
)
SELECT
    creator.id,
    'llc',
    'trip',
    'Colorado Snowboarding Trip 2027',
    'colorado-snowboarding-2028',
    'Family snowboarding trip — Keystone, Colorado. Pricing and capacity locked for launch; About, included items, and disclaimers filled in §13.15 line 481.',
    $itinerary$
{
  "enabled": true,
  "days": [
  { "id": "co-day-1", "date": "2027-12-14", "title": "Arrival & rest day", "activities": [{ "id": "co-act-arrive", "title": "Arrive in Colorado", "details": "Arrive, get settled, and check in to the selected lodging." }] },
  { "id": "co-day-2", "date": "2027-12-15", "title": "Snowboarding day", "activities": [{ "id": "co-act-snowboard-1", "title": "Snowboarding", "details": "First full mountain day." }] },
  { "id": "co-day-3", "date": "2027-12-16", "title": "Mountain + ice skating", "activities": [{ "id": "co-act-snowboard-2", "title": "Snowboarding", "details": "Optional second mountain day." }, { "id": "co-act-ice-skating", "title": "Ice skating", "details": "Group ice skating outing." }] },
  { "id": "co-day-4", "date": "2027-12-17", "title": "Snow tubing + group dinner", "activities": [{ "id": "co-act-tubing", "title": "Snow tubing", "details": "Group snow tubing outing." }, { "id": "co-act-dinner", "title": "Group dinner night", "details": "Shared dinner plan; restaurant and timing to be announced." }] },
  { "id": "co-day-5", "date": "2027-12-18", "title": "Departure & rest day", "activities": [{ "id": "co-act-depart", "title": "Depart Colorado", "details": "Pack up and head home." }] }
  ]
}
$itinerary$::jsonb,
    'Keystone, Colorado',
    'Keystone',
    39.60500,   -- Keystone Resort (portal inline map)
    -105.95417,
    TIMESTAMPTZ '2027-12-14 00:00:00-05',
    TIMESTAMPTZ '2027-12-18 23:59:59-05',
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
    TIMESTAMPTZ '2027-11-01 00:00:00-04',
    FALSE,
    NULL,
    NULL,
    NULL
FROM creator
WHERE EXISTS (SELECT 1 FROM creator)
ON CONFLICT (slug) DO UPDATE SET
    event_type = EXCLUDED.event_type,
    category = EXCLUDED.category,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    itinerary = EXCLUDED.itinerary,
    location_text = EXCLUDED.location_text,
    location_nickname = EXCLUDED.location_nickname,
    location_lat = EXCLUDED.location_lat,
    location_lng = EXCLUDED.location_lng,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
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
    fund_deadline = EXCLUDED.fund_deadline,
    transportation_enabled = EXCLUDED.transportation_enabled,
    transportation_mode = EXCLUDED.transportation_mode,
    transportation_method = EXCLUDED.transportation_method,
    transportation_estimate_cents = EXCLUDED.transportation_estimate_cents
RETURNING id, slug, location_lat, location_lng, adult_price_cents, kids_free, capacity_mode, fund_deadline, start_date, end_date, status;
