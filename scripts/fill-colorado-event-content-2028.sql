-- §13.15 line 481 — fill About / included clothing / disclaimers on Colorado 2028 draft
-- Idempotent full replace of the three JSONB columns.
-- Apply via: node scripts/fill-colorado-event-content-2028.js

UPDATE events SET
    about_tabs = $about$
[
  {
    "id": "co-tab-itinerary",
    "title": "Itinerary",
    "body": "**Late January 2028 — Keystone, Colorado**\n\n**Leave:** 3:00 AM (Georgia)\n\n- **3:00 AM** — Leave\n- **6:00 AM** — Fuel / breakfast\n- **9:00 AM** — Driver swap\n- **Noon** — Lunch\n- **3:00 PM** — Fuel\n- **6:00 PM** — Dinner\n- **9:00–11:00 PM** — Arrive Keystone area\n\nFour stops planned for fuel and meals. Payment / fund deadline: **November 1, 2027**."
  },
  {
    "id": "co-tab-covered",
    "title": "What's covered",
    "body": "**$1,000 per adult**; **kids free**.\n\nThe trip pool covers shared lodging, travel/car prep, supplies, and on-mountain amenities as the host budget allows.\n\n**Included apparel**\n- **Black beanie** — one size, one color. Adults get one; older kids may fit. No RSVP choice.\n- **Snow pants** — adults only. Pick your size at RSVP. Kids bring their own (we are not ordering kid sizes).\n\nACH preferred; card allowed with fee pass-through. Pay in full or monthly until the deadline; early payoff is OK."
  },
  {
    "id": "co-tab-bring",
    "title": "What to bring",
    "body": "**Clothing / gear (plan to have):**\n\n- Goggles\n- Gloves\n- Puffer jacket\n- Sweater\n- Warm socks\n- Hand warmers\n- Sturdy shoes (e.g. Hoka or New Balance)\n- **Kids:** your own snow pants\n\nAdults pick **snow-pants size** at RSVP. The trip beanie is one-size black — nothing to choose.\n\n**Also:** offline maps, charging cables, and a travel playlist."
  },
  {
    "id": "co-tab-lodging",
    "title": "Lodging & travel",
    "body": "Base area: **Keystone, Colorado**.\n\nLodging and convoy details will be shared with confirmed parties (group lodging / vehicles).\n\nGuests who book their own flights or separate lodging pay those costs themselves — see the disclaimers."
  }
]
$about$::jsonb,
    included_items = $included$
[
  {
    "id": "co-inc-beanie",
    "name": "Black beanie",
    "required": false,
    "option_type": "info",
    "applies_to": "all",
    "choices": [],
    "image_url": "/assets/events/colorado-2028-beanie.jpg"
  },
  {
    "id": "co-inc-pants",
    "name": "Snow pants",
    "required": true,
    "option_type": "size",
    "applies_to": "adult",
    "choices": ["S", "M", "L", "XL", "XXL", "3XL", "4XL"],
    "image_url": "/assets/events/colorado-2028-snow-pants.jpg"
  }
]
$included$::jsonb,
    disclaimers = $disclaimers$
[
  {
    "id": "default-no-refunds",
    "title": "No refunds",
    "body": "Payments for this event are non-refundable for any reason via the event system. Rare exceptions are handled only out-of-band by the host (not as in-app refunds).",
    "required": true,
    "is_default": true
  },
  {
    "id": "default-flyers",
    "title": "Flyers / tickets",
    "body": "Guests who book their own travel (flights, etc.) are responsible for those costs; the event fee does not reimburse tickets or travel.",
    "required": true,
    "is_default": true
  }
]
$disclaimers$::jsonb
WHERE slug = 'colorado-snowboarding-2028'
RETURNING
    id,
    slug,
    jsonb_array_length(about_tabs) AS about_tabs_len,
    jsonb_array_length(included_items) AS included_items_len,
    jsonb_array_length(disclaimers) AS disclaimers_len,
    status;
