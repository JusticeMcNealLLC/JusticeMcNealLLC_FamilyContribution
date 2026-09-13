-- §13.15 line 482 — prep Colorado dry-run: open status + amenity voting
-- Apply via: node scripts/prep-colorado-dry-run-2028.js

UPDATE events SET
    status = 'open',
    amenity_voting = $av$
{
  "enabled": true,
  "options": [
    {
      "id": "co-am-dinner",
      "label": "Group dinner night",
      "description": "Shared sit-down dinner for the party."
    },
    {
      "id": "co-am-lessons",
      "label": "Ski/snowboard lesson block",
      "description": "Group lesson time on the mountain."
    },
    {
      "id": "co-am-hot-tub",
      "label": "Hot tub / lodge hangout",
      "description": "Evening lodge hangout and hot tub."
    }
  ],
  "closes_at": null,
  "results_visible": "after_close"
}
$av$::jsonb
WHERE slug = 'colorado-snowboarding-2028'
RETURNING
    id,
    slug,
    status,
    (amenity_voting->>'enabled')::boolean AS voting_enabled,
    jsonb_array_length(amenity_voting->'options') AS amenity_options_len,
    adult_price_cents,
    kids_free,
    jsonb_array_length(COALESCE(disclaimers, '[]'::jsonb)) AS disclaimers_len;
