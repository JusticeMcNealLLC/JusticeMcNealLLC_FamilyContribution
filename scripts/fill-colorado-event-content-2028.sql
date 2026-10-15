-- §13.15 line 481 — fill About / included clothing / disclaimers on Colorado 2027 draft
-- Idempotent full replace of the About, itinerary, included, and disclaimer JSONB columns.
-- Apply via: node scripts/fill-colorado-event-content-2028.js

UPDATE events SET
    about_tabs = $about$
[
  {
    "id": "co-tab-itinerary",
    "title": "Itinerary",
    "body": "**December 14-18, 2027 - Keystone, Colorado**\n\n**Travel plan:** The group will travel by air from **Atlanta to Denver**. Everyone is responsible for booking and paying for their own plane ticket. **Planning tip:** Airfare is often worth watching about **30-45 days before departure**, although prices vary and there is no guaranteed best booking window. Denver is about an hour from the Airbnb area, so we plan to coordinate **2-3 rental cars**, depending on final headcount. Rental-car details, drivers, and exact timing will be shared as plans are finalized.\n\nThe event will not provide group transportation. Guests are responsible for arranging and paying for transportation to and from the airport and around Keystone, including their share of rental-car and fuel costs unless the host announces otherwise.\n\nPayment / fund deadline: **November 1, 2027**."
  },
  {
    "id": "co-tab-covered",
    "title": "What's covered",
    "body": "**$1,000 per adult**; **kids free**.\n\nThe trip pool covers shared lodging, supplies, and on-mountain amenities as the host budget allows. **Airfare and transportation are not included.** Everyone is responsible for booking and paying for their own plane ticket. The event will not provide group transportation to/from the airport or around Keystone; each guest is responsible for arranging and paying for those costs.\n\n**Included apparel**\n- **Black beanie** — one size, one color. Adults get one; older kids may fit. No RSVP choice.\n- **Snow pants** — adults only. Pick your size at RSVP. Kids bring their own (we are not ordering kid sizes).\n\nACH preferred; card allowed with fee pass-through. Pay in full or monthly until the deadline; early payoff is OK."
  },
  {
    "id": "co-tab-bring",
    "title": "What to bring",
    "body": "**Clothing / gear (plan to have):**\n\n- Goggles\n- Gloves\n- Puffer jacket\n- Sweater\n- Warm socks\n- Hand warmers\n- Sturdy shoes (e.g. Hoka or New Balance)\n- **Kids:** your own snow pants\n\nAdults pick **snow-pants size** at RSVP. The trip beanie is one-size black — nothing to choose.\n\n**Travel:** your plane ticket, valid ID/travel documents, and a plan for your own airport and local transportation. The event will not provide group transportation.\n\n**Also:** offline maps, charging cables, and a travel playlist."
  },
  {
    "id": "co-tab-lodging",
    "title": "Lodging & travel",
    "body": "Base area: **Keystone, Colorado**.\n\nWe will be choosing between [three different Airbnbs](https://www.airbnb.com/). It is currently too early to reserve them, so pricing and availability are not known yet.\n\nThe current flight plan is **Atlanta to Denver**. Denver is about an hour from the Airbnb area, so we plan to coordinate **2-3 rental cars**, depending on final headcount. Rental-car details, drivers, and exact timing will be shared as plans are finalized.\n\nFlights are not included. Everyone is responsible for booking and paying for their own plane ticket. **Planning tip:** Airfare is often worth watching about **30-45 days before departure**, although prices vary and there is no guaranteed best booking window. The event will not provide group transportation to/from the airport or around Keystone; guests must arrange and pay for their own transportation, including their share of rental-car and fuel costs unless the host announces otherwise.\n\nAs the event gets closer and we have more details, we will send a message to everyone who RSVPs."
  }
]
$about$::jsonb,
    itinerary = $itinerary$
{
  "enabled": true,
  "days": [
  {
    "id": "co-day-1",
    "date": "2027-12-14",
    "title": "Arrival & rest day",
    "activities": [
      { "id": "co-act-arrive", "title": "Arrive in Colorado", "details": "Arrive, get settled, and check in to the selected lodging." }
    ]
  },
  {
    "id": "co-day-2",
    "date": "2027-12-15",
    "title": "Snowboarding day",
    "activities": [
      { "id": "co-act-snowboard-1", "title": "Snowboarding", "details": "First full mountain day. Final timing and group details will be shared later." }
    ]
  },
  {
    "id": "co-day-3",
    "date": "2027-12-16",
    "title": "Mountain + ice skating",
    "activities": [
      { "id": "co-act-snowboard-2", "title": "Snowboarding", "details": "Optional second mountain day." },
      { "id": "co-act-ice-skating", "title": "Ice skating", "details": "Group ice skating outing; timing will be finalized closer to the trip." }
    ]
  },
  {
    "id": "co-day-4",
    "date": "2027-12-17",
    "title": "Snow tubing + group dinner",
    "activities": [
      { "id": "co-act-tubing", "title": "Snow tubing", "details": "Group snow tubing outing." },
      { "id": "co-act-dinner", "title": "Group dinner night", "details": "Shared dinner plan; restaurant and timing to be announced." }
    ]
  },
  {
    "id": "co-day-5",
    "date": "2027-12-18",
    "title": "Departure & rest day",
    "activities": [
      { "id": "co-act-depart", "title": "Depart Colorado", "details": "Pack up and head home. Guests arrange and pay for their own transportation." }
    ]
  }
  ]
}
$itinerary$::jsonb,
    rsvp_questions = $questions$
[
  {
    "id": "co-q-big-mountain",
    "prompt": "Do you plan on snowboarding on the big mountain?",
    "type": "yes_no",
    "required": true,
    "choices": [
      { "id": "yes", "label": "Yes" },
      { "id": "no", "label": "No" }
    ]
  }
]
$questions$::jsonb,
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
    "title": "Flights & transportation",
    "body": "Airfare and transportation are not included. Everyone is responsible for booking and paying for their own plane ticket and arranging and paying for airport and local transportation. The event fee does not reimburse flights, rideshares, rental cars, or other transportation costs.",
    "required": true,
    "is_default": true
  }
]
$disclaimers$::jsonb,
    transportation_enabled = FALSE,
    transportation_mode = NULL,
    transportation_method = NULL,
    transportation_estimate_cents = NULL
WHERE slug = 'colorado-snowboarding-2028'
RETURNING
    id,
    slug,
    jsonb_array_length(about_tabs) AS about_tabs_len,
    jsonb_array_length(included_items) AS included_items_len,
    jsonb_array_length(disclaimers) AS disclaimers_len,
    status;
