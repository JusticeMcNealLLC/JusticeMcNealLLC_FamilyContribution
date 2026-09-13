# Colorado launch — create package (§13.15 line 480)

Staging create for the family snowboarding trip. About / included / disclaimers are filled in **§13.15 line 481** (see below). Do **not** collect RSVPs until ready for dry-run (**482**) — first RSVP locks pricing/disclaimers.

## Locked field values

| Field | Value |
| --- | --- |
| `event_type` | `member` |
| `member_only` | `false` |
| `title` | `Colorado Snowboarding Trip 2028` |
| `slug` | `colorado-snowboarding-2028` |
| `category` | `trip` |
| `location_text` | `Keystone, Colorado` |
| `location_nickname` | `Keystone` |
| `location_lat` / `location_lng` | `39.60500` / `-105.95417` (Keystone Resort — portal map) |
| `pricing_mode` | `paid` |
| `adult_price_cents` | `100000` ($1000) |
| `rsvp_cost_cents` | `100000` (write-through) |
| `kids_free` | `true` |
| `kid_price_cents` | `NULL` |
| `capacity_mode` | `none` |
| `max_participants` | `NULL` |
| `fund_deadline` | `2027-11-01` (America/New_York start-of-day) |
| `start_date` | `2028-01-25` (late January; Keystone) |
| `status` | `open` (after dry-run prep **482**) |
| ACH / card | DB defaults (`TRUE`) |

**Staging row (applied):** `id = d92a898d-a6e8-4e11-a40f-32f2dd857b4c`, `slug = colorado-snowboarding-2028`.

## Apply (staging)

```bash
node scripts/create-colorado-event-2028.js
```

Idempotent on `slug = colorado-snowboarding-2028`. Creator = Justin profile (`mcneal.justin99@gmail.com`).

SQL source of truth: [`scripts/create-colorado-event-2028.sql`](../../../scripts/create-colorado-event-2028.sql).

Verify:

```bash
node test/_smoke-event-colorado-create.js
```

## Portal recreate (production later)

Portal → Events → Create → type **Member**:

| Step | Set |
| --- | --- |
| Basics | Title, category **Trip**, location Keystone |
| When | Start **2028-01-25**; capacity **No limit** |
| Pricing | Paid; adult **1000**; **Kids free**; fund deadline **2027-11-01** |
| Review | Save as **draft** (or open when ready for dry-run) |

Then complete **481** (About tabs, clothing options, no-refund disclaimers) before invites.

## §13.15 line 481 — About + clothing + disclaimers

Applied on staging (`slug = colorado-snowboarding-2028`):

| Column | Content |
| --- | --- |
| `about_tabs` | Itinerary, What's covered, What to bring, Lodging & travel |
| `included_items` | Clothing size (XS–XXL) + Clothing color (Trip clothing preset) |
| `disclaimers` | `default-no-refunds` (no in-app refunds; rare out-of-band only) + `default-flyers` |

```bash
node scripts/fill-colorado-event-content-2028.js
```

SQL: [`scripts/fill-colorado-event-content-2028.sql`](../../../scripts/fill-colorado-event-content-2028.sql).

Verify:

```bash
node test/_smoke-event-colorado-content.js
```

Still **open** after dry-run prep (**482**). Do not send **family** SMS until **483**.

## §13.15 line 482 — E2E dry run

See **[colorado_launch_dry_run.md](./colorado_launch_dry_run.md)** for the Pass/Fail checklist.

```bash
node scripts/prep-colorado-dry-run-2028.js
node scripts/verify-colorado-dry-run-2028.js --pre
# …walkthrough…
node scripts/verify-colorado-dry-run-2028.js --post
```

## Next checklist items

- **483** — Real family SMS + cache/SW bump
- **484** — Live support notes
