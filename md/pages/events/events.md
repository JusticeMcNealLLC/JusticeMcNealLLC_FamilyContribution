# Events System — Full Pipeline Audit
**Date:** May 3, 2026  
**Auditor:** GitHub Copilot  
**Purpose:** Reference document for future upgrades, refactors, and onboarding. Covers every layer of the events system from database schema through edge functions, portal UI, public page, admin dashboard, and gamification.

> **Last updated:** May 3, 2026 — events_006 (admin-controlled featured banner) implemented. See [§28 Changelog](#28-changelog).

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Database Schema](#2-database-schema)
3. [Edge Functions (Backend)](#3-edge-functions-backend)
4. [JS Module Architecture](#4-js-module-architecture)
5. [Public Event Page (`/events/`)](#5-public-event-page-events)
6. [Portal Events Page (`/portal/events.html`)](#6-portal-events-page-portaleventshtml)
7. [Admin Events Dashboard (`/admin/events.html`)](#7-admin-events-dashboard-admineventshtml)
8. [CSS & Styling](#8-css--styling)
9. [Event Lifecycle State Machine](#9-event-lifecycle-state-machine)
10. [RSVP Pipeline](#10-rsvp-pipeline)
11. [Ticketing & QR Check-In](#11-ticketing--qr-check-in)
12. [Payment & Stripe Integration](#12-payment--stripe-integration)
13. [Raffle System](#13-raffle-system)
14. [Competition System](#14-competition-system)
15. [Live Map System](#15-live-map-system)
16. [Documents System](#16-documents-system)
17. [Scrapbook (Photo Gallery)](#17-scrapbook-photo-gallery)
18. [Comments System](#18-comments-system)
19. [Notifications & Reminders](#19-notifications--reminders)
20. [Gamification & Badges](#20-gamification--badges)
21. [Waitlist System](#21-waitlist-system)
22. [Refund System](#22-refund-system)
23. [OG / Social Preview](#23-og--social-preview)
24. [Role & Permission Guards](#24-role--permission-guards)
25. [Feature Flags](#25-feature-flags)
26. [Known Gaps & Issues](#26-known-gaps--issues)
27. [Upgrade Recommendations](#27-upgrade-recommendations)

---

## 1. System Overview

The events system is a full-stack feature built on **Supabase (PostgreSQL + Edge Functions + Realtime + Storage)**, **Stripe** for payments, **Leaflet.js** for live maps, **jsQR** for in-browser QR scanning, and **QRCode.js** for QR generation. The frontend is vanilla JavaScript spread across modular IIFE files, with Tailwind CSS (CDN) for styling.

### Three Event Types
| Type | Creator | Visibility | Notes |
|---|---|---|---|
| `llc` | Admin only | Members + optional public | Org-run trips, outings. Cost breakdown, transportation, documents. |
| `member` | Any member (with permission) | Members + optional public | Community-organized events. |
| `competition` | Admin/permitted member | Members + optional public | Multi-phase competitions with entries, voting, prizes. |

### Three Surfaces
| Surface | Path | Audience |
|---|---|---|
| **Public Event Page** | `/events/?e={slug}` | Anyone with the link (anonymous + signed-in) |
| **Portal Events** | `/portal/events.html` | Authenticated members |
| **Admin Events Dashboard** | `/admin/events.html` | Admin role + `events.manage_all` permission |

---

## 2. Database Schema

All migrations live in `supabase/migrations/`. Events-relevant ones span `063` through `084`.

### 2.1 Core Table: `events`
**Migration:** `063_events_tables.sql` + many `ALTER TABLE` patches in subsequent migrations.

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `created_by` | UUID → profiles | Event creator |
| `event_type` | TEXT | `llc` \| `member` \| `competition` |
| `title` | TEXT | Event name |
| `slug` | TEXT UNIQUE | URL identifier (e.g. `summer-cookout-1abc2`) |
| `description` | TEXT | Public description (supports mini-markdown) |
| `gated_notes` | TEXT | Private notes visible only to RSVPed attendees |
| `banner_url` | TEXT | Cover image URL (Supabase Storage) |
| `start_date` | TIMESTAMPTZ | Event start (stored in UTC) |
| `end_date` | TIMESTAMPTZ | Optional end time |
| `timezone` | TEXT | Display TZ, default `America/New_York` |
| `location_text` | TEXT | Human-readable address |
| `location_nickname` | TEXT | Short name shown on cards (added migration `082`) |
| `location_lat` / `location_lng` | FLOAT | Geocoded coordinates |
| `max_participants` | INT | Cap on RSVPs; triggers waitlist when hit |
| `min_participants` | INT | Minimum for event to be "confirmed" |
| `status` | TEXT | See lifecycle below |
| `rsvp_deadline` | TIMESTAMPTZ | Locks RSVP after this time |
| `member_only` | BOOLEAN | If true, guests cannot RSVP |
| `pricing_mode` | TEXT | `free` \| `paid` \| `free_paid_raffle` |
| `rsvp_cost_cents` | INT | Amount charged for paid RSVP |
| `raffle_entry_cost_cents` | INT | Standalone raffle ticket price |
| `raffle_enabled` | BOOLEAN | Toggles raffle section |
| `raffle_type` | TEXT | `digital` \| `physical` |
| `raffle_draw_trigger` | TEXT | `manual` \| `auto` |
| `raffle_prizes` | JSONB | Array of `{ place, label }` objects |
| `raffle_winner_count` | INT | How many winners to draw (added migration `065`) |
| `gate_time` / `gate_location` / `gate_notes` | BOOLEAN | Info-gating toggles |
| `checkin_mode` | TEXT | `attendee_ticket` \| `venue_scan` |
| `checkin_enabled` | BOOLEAN | Toggle check-in feature (migration `076`) |
| `venue_qr_token` | TEXT UNIQUE | Token for venue-scan QR posters |
| `rsvp_enabled` | BOOLEAN | Toggle RSVP (migration `076`) |
| `transportation_enabled` | BOOLEAN | Toggle transportation section (migration `076`) |
| `transportation_mode` | TEXT | `llc_provides` \| `self_arranged` |
| `transportation_estimate_cents` | INT | Per-person transportation cost estimate |
| `llc_cut_pct` | FLOAT | LLC revenue share % |
| `invest_eligible` | BOOLEAN | Whether attendance counts toward investment eligibility |
| `cost_breakdown` | JSONB | Cached cost summary |
| `cost_breakdown_locked` | BOOLEAN | Prevents member edits to breakdown |
| `show_cost_breakdown` | BOOLEAN | Admin toggle to show/hide breakdown to members (migration `072`) |
| `non_refundable_expenses_cents` | INT | Deducted from refunds on cancel |
| `rescheduled_at` / `grace_window_end` / `original_start_date` | TIMESTAMPTZ | Reschedule tracking |
| `cancellation_note` | TEXT | Shown to members on cancel |
| `competition_config` | JSONB | Competition settings (entry type, fees, voter eligibility, etc.) |
| `total_prize_pool_cents` | INT | Running prize pool total |
| `winner_tier_config` | JSONB | Prize tiers |
| `category` | TEXT | Event category (party, birthday, trip, etc.) — added migration `064` |
| `is_featured` | BOOLEAN | Admin-controlled portal hero banner flag. Only one event may be featured at a time (enforced by `trg_single_featured_event` trigger). Added migration `085` |
| `created_at` | TIMESTAMPTZ | Row creation time |

**Status values (lifecycle):** `draft` → `open` → `confirmed` → `active` → `completed` | `cancelled`

---

### 2.2 `event_rsvps`
| Column | Type | Description |
|---|---|---|
| `event_id` / `user_id` | UUID | Composite unique |
| `status` | TEXT | `going` \| `maybe` \| `not_going` |
| `paid` | BOOLEAN | Paid RSVP flag |
| `stripe_payment_intent_id` | TEXT | Stripe reference |
| `amount_paid_cents` | INT | Actual amount charged |
| `refunded` / `refund_amount_cents` | - | Refund tracking |
| `accepted_no_refund_policy` | BOOLEAN + TIMESTAMPTZ | Consent capture |
| `qr_token` | TEXT UNIQUE | 32-char hex token used for QR code generation |
| `grace_refund_eligible` | BOOLEAN | Set during reschedule grace window |
| `invest_eligible_acknowledged` | BOOLEAN + TIMESTAMPTZ | Fidelity risk acknowledgement |

---

### 2.3 `event_guest_rsvps`
Non-member (public) RSVPs. Name + email stored. Unique `guest_token` used for QR + ticket lookup.

| Column | Description |
|---|---|
| `guest_token` | UUID-like token; embedded in QR URL param `?guest_token=` |
| `paid` / `stripe_payment_intent_id` | Paid guest RSVP support |
| `accepted_no_refund_policy` | Consent capture |

**RLS:** Service role full access. Authenticated users can read. Anonymous users can read (enables `?guest_token=` ticket lookup). Admins can delete.

---

### 2.4 `event_checkins`
One row per check-in (member OR guest, never both). Unique indexes enforce one check-in per user per event and one per guest_token per event.

| Column | Description |
|---|---|
| `user_id` | Member check-in (NULL for guests) |
| `guest_token` | Guest check-in (NULL for members) |
| `checked_in_by` | Who scanned the QR (host/staff) |
| `checkin_mode` | `attendee_ticket` or `venue_scan` |

**Trigger:** `trg_checkin_badge` → auto-awards badges on member check-in (see [§20](#20-gamification--badges)).

---

### 2.5 `event_hosts`
Co-host / check-in staff assignments per event.
- Roles: `checkin_staff`, `co_host`
- Both portal and admin manage sheets use this table to determine host-level access.

---

### 2.6 `event_raffle_entries`
One row per entry (member or guest). Supports both free and paid entries.
- `UNIQUE(event_id, user_id)` and `UNIQUE(event_id, guest_token)` — one entry per person per event.
- Paid entries link to a `stripe_payment_intent_id`.

### 2.7 `event_raffle_winners`
Drawn winners stored here. `UNIQUE(event_id, place)` — one winner per place per event.

---

### 2.8 `event_cost_items` (LLC events only)
Line-item cost breakdown for LLC-organized events.
- Categories: `lodging`, `transportation`, `food`, `gear`, `entertainment`, `other`
- Per-item `included_in_buyin` flag controls whether it's split into the RSVP cost.
- `avg_per_person_cents` stored for display.

---

### 2.9 `event_waitlist`
Ordered waitlist per event. Status machine: `waiting` → `offered` → `claimed` | `expired` | `removed`.
- `offer_expires_at` — waitlisted users have a time window to claim.
- Managed by `manage-event-waitlist` edge function.

---

### 2.10 `event_refunds`
Audit trail for all refunds issued.
- Reasons: `event_cancelled`, `min_not_met`, `reschedule_grace`, `manual`, `admin_override`
- Status: `pending` → `processed` | `failed`
- Links to both member (`user_id`) and guest (`guest_email`) refund scenarios.

---

### 2.11 Competition Tables (Migration `068`)
| Table | Purpose |
|---|---|
| `competition_phases` | Up to 4 phases per event; `status`: `pending` → `active` → `completed` \| `extended` \| `cancelled` |
| `competition_entries` | Member submissions (file, link, or text). Moderation flag. `vote_count` denormalized. |
| `competition_votes` | One vote per voter per event. `UNIQUE(event_id, voter_id)`. |
| `prize_pool_contributions` | Member contributions to the prize pool (paid via Stripe). |
| `competition_winners` | Places 1–3; `payout_status`: `pending` → `processing` → `paid` \| `failed`. `needs_1099` flag. |

---

### 2.12 `event_documents` (Migration `067`)
Attached files for LLC events. Two modes:
- **Group docs** (`target_user_id IS NULL`): visible to all RSVPed members (itinerary, receipts, group tickets)
- **Per-member docs** (`target_user_id IS NOT NULL`): visible only to the named member (plane tickets)
- Storage bucket: `event-documents`
- Doc types: `plane_ticket`, `group_ticket`, `itinerary`, `receipt`, `other`

---

### 2.13 `event_locations` (Migration `067`)
Live location sharing per user per event.
- `sharing_active` toggle; `lat`/`lng` updated in real-time via Supabase Realtime.
- `updated_at` used to show staleness on map.
- Available from event `start_date` through `end_date + 24h`.

---

### 2.14 `event_photos` (Migration `069`)
Scrapbook photos uploaded by RSVPed members after event completes.
- Storage bucket: `event-photos` (public, 10MB per file limit)
- Any RSVPed member or admin can upload. Uploader or admin can delete.

---

### 2.15 `event_comments` (Migration `077`)
Threaded-capable comments on events. Currently flat (no threading in UI yet).
- Members: `user_id` required. Guests: `user_id IS NULL`, `guest_token` required.
- 2000-char body limit enforced at DB level.
- `parent_id` column exists but threading is not yet implemented in the UI.

---

### 2.16 `notification_preferences`
Per-user toggles for event notification categories:
`event_new`, `event_reminders`, `event_rsvp_updates`, `event_rsvp_deadline`, `raffle_results`, `competition_updates`, `checkin_alerts`, `push_enabled`

---

## 3. Edge Functions (Backend)

All edge functions are Deno TypeScript under `supabase/functions/`. They use `@supabase/supabase-js@2` with the service role key (bypasses RLS). CORS headers are set for all origins.

### 3.1 `create-event-checkout`
**File:** `supabase/functions/create-event-checkout/index.ts`  
**Purpose:** Creates a Stripe Checkout Session for paid event flows.  
**Accepts:** `event_id`, `type` (`rsvp` | `raffle_entry` | `competition_entry` | `prize_pool`), optional `guest_name`/`guest_email`, `from_waitlist`, `invest_eligible_acknowledged`, `amount_cents`.  
**Flow:**
1. Authenticates caller (member JWT or guest by name+email).
2. Validates event status, RSVP deadline, member-only flag.
3. Determines amount based on `type` + event config.
4. Creates Stripe Checkout Session with `success_url` pointing back to `/portal/connect-return.html` or `/events/?e={slug}`.
5. Returns `{ url }` — caller redirects to Stripe.  
**Webhook:** Stripe payment completion is handled by `stripe-webhook` function which marks RSVP/raffle entry as `paid: true`.

---

### 3.2 `rsvp-guest-free`
**File:** `supabase/functions/rsvp-guest-free/index.ts`  
**Purpose:** Free RSVP for non-member guests (no Stripe).  
**Flow:**
1. Validates event is free, open, not member-only, and deadline has not passed.
2. Normalizes email to lowercase.
3. Checks for duplicate RSVP (returns existing token if found — idempotent).
4. Inserts into `event_guest_rsvps` with a generated `guest_token`.
5. Returns `{ guest_token, status }`.

---

### 3.3 `raffle-guest-free`
**File:** `supabase/functions/raffle-guest-free/index.ts`  
**Purpose:** Free raffle entry for non-member guests.  
**Flow:** Similar to `rsvp-guest-free` — validates event, checks for duplicate, inserts into `event_raffle_entries` with a unique `guest_token`.

---

### 3.4 `process-event-cancellation`
**File:** `supabase/functions/process-event-cancellation/index.ts`  
**Purpose:** Handles event cancellation, reschedule grace refunds, and min-not-met partial refunds.  
**Auth:** Requires JWT; caller must be event creator, a listed host, or hold `events.manage_all` permission.  
**Reasons:** `event_cancelled`, `min_not_met`, `reschedule_grace`, `manual`, `admin_override`  
**Flow (full cancel):**
1. Loads all paid RSVPs for the event.
2. Deducts `non_refundable_expenses_cents` proportionally.
3. Calls Stripe Refund API for each paid RSVP.
4. Inserts row into `event_refunds`.
5. Updates event `status` to `cancelled`, sets `cancellation_note`.
6. Triggers push notification to all RSVPed users.

**Flow (single-user grace refund):**
1. Verifies `grace_window_end` is still in the future.
2. Issues Stripe refund for that user only.
3. Marks RSVP `grace_refund_eligible = false` (one-time).

---

### 3.5 `manage-event-waitlist`
**File:** `supabase/functions/manage-event-waitlist/index.ts`  
**Actions:** `offer_next` | `expire_offers` | `advance_all`  
**Flow:**
1. `expire_offers`: finds all `offered` entries past `offer_expires_at`, marks them `expired`, auto-calls `offer_next` for each.
2. `offer_next`: finds the next `waiting` entry by `position`, updates status to `offered`, sets `offer_expires_at` (24h), sends push notification to user.
3. `advance_all`: runs expire + offer_next across all active events with waitlists that have capacity.

---

### 3.6 `send-event-reminders`
**File:** `supabase/functions/send-event-reminders/index.ts`  
**Purpose:** Cron-triggered (intended for a scheduled job). Sends push notifications at 3 reminder windows: 7 days, 72 hours, day-of (0–12h).  
**Flow:**
1. For each window, queries `events` within the time range with `status IN ('open','confirmed','active')`.
2. For each event, gets all `going` RSVPs.
3. Filters out users with `event_reminders = false` in `notification_preferences`.
4. Calls `send-push-notification` for each eligible user.

> **Note:** No cron job is currently wired up in `supabase/config.toml`. This function must be called externally or via a pg_cron job.

---

### 3.7 `event-og`
**File:** `supabase/functions/event-og/index.ts`  
**Purpose:** Generates rich Open Graph previews for shared event links.  
**Technical note:** Supabase sandboxes `text/html` responses. This function returns valid XHTML as `text/xml` — crawlers read OG tags, browsers receive a JS redirect to the real `/events/?e={slug}` page.  
**Features:** Dynamic title, description, date/time, optional inviter name from `?ref=` param.

---

### 3.8 `geocode-address`
**File:** `supabase/functions/geocode-address/index.ts`  
**Purpose:** Server-side proxy for the US Census Bureau Geocoder (which has no CORS headers).  
**Used by:** Event create/edit forms to convert an address string to `{ lat, lng }` stored on the event.  
**Returns:** `{ found: true, lat, lng, display }` or `{ found: false }`.

---

## 4. JS Module Architecture

### 4.1 Shared Components (`js/components/events/`)
These load before all surface-specific modules.

| File | Namespace | Purpose |
|---|---|---|
| `constants.js` | `window.EventsConstants` | Category emoji, tag classes, gradients, type colors, status colors, pricing modes |
| `helpers.js` | `window.EventsHelpers` | `escapeHtml`, `miniMarkdown`, `formatMoney`, `formatDate`, `relativeTime`, `ordinal`, `generateSlug`, `groupByBucket` |
| `card.js` | `window.EventsCard` | Renders a single event card HTML (used in list view) |
| `pills.js` | `window.EventsPills` | Renders category/type pill HTML |

### 4.2 Portal Events Modules (`js/portal/events/`)
These modules are loaded in dependency order. `init.js` **must load last**.

| File | Purpose |
|---|---|
| `state.js` | Shared mutable state: `evtCurrentUser`, `evtCurrentUserRole`, `evtActiveTab`, `evtBannerFile`, `evtAllEvents`, `evtAllRsvps`, `evtScannerStream` |
| `constants.js` | Local constants (mirrors `window.EventsConstants`) |
| `utils.js` | `evtToggleModal`, `evtGenerateSlug`, `evtEscapeHtml`, `evtNavigateToEvent`, `evtNavigateToList`, `evtRouteByUrl`, `evtLoadDetailBySlug` |
| `list.js` | `window.PortalEvents.list` — full list view: editorial hero, buckets, segmented filter, search, calendar, mini-calendar, "Going" rail, "Top Picks" rail, sessionStorage persistence |
| `detail.js` | `window.PortalEvents.detail` — event detail view: immersive hero, meta rows, RSVP, raffle, competition, documents, map, scrapbook, comments |
| `rsvp.js` | `evtHandleRsvp()` — free and paid RSVP logic |
| `scanner.js` | `evtOpenScanner()`, `evtProcessCheckin()` — camera-based QR scanner using jsQR |
| `map.js` | `evtInitMap()`, `evtToggleLocationSharing()` — Leaflet.js live map with Supabase Realtime |
| `documents.js` | `evtBuildDocumentsHtml()` — upload/view/download event docs |
| `scrapbook.js` | `evtBuildScrapbookHtml()`, `evtHandlePhotoSelect()` — photo gallery |
| `comments.js` | `evtLoadComments()`, `evtPostComment()` |
| `competition.js` | `evtBuildCompetitionHtml()` — phases, entries, voting, prize pool |
| `raffle.js` | Portal raffle entry + admin draw functions |
| `create/sheet.js` | `window.EventsCreate` — new 4-step event creation bottom-sheet (BETA, feature-flagged) |
| `manage/sheet.js` | `window.EventsManage` — 7-tab management bottom-sheet (overview, RSVPs, money, docs, raffle, comp, danger) |
| `init.js` | Bootstrap: `checkAuth()`, loads profile/role, shows "Create" button, wires event listeners, calls `evtLoadEvents()`, routes by URL |

### 4.3 Public Event Modules (`js/events/`)
| File | Purpose |
|---|---|
| `index.js` | Bootstrap: parses `?e=` slug, loads session, calls `pubLoadEvent()`, sets up shared state |
| `hero.js` | Renders banner, title, tags, status badge, countdown, share button |
| `body.js` | Renders event body: about section, host card, date/calendar, map, gated notes, cost breakdown |
| `rsvp.js` | Member + guest RSVP section; paid RSVP checkout redirect |
| `raffle.js` | Raffle section: prizes, entry buttons (free/paid), guest form |
| `ticket.js` | QR ticket display, venue check-in button, guest lookup form |

### 4.4 Admin Dashboard (`js/admin/events-dashboard.js`)
Single file. Loads all events, RSVPs, check-ins. Renders stats cards, event table (filterable by status), competition payout management, and banner award tools.

---

## 5. Public Event Page (`/events/`)

**HTML:** `events/index.html`  
**CSS:** `css/pages/public-event.css`  
**Scripts:** `js/events/index.js`, `hero.js`, `body.js`, `rsvp.js`, `raffle.js`, `ticket.js` (plus shared `config.js`, QRCode.js, jsQR, Leaflet)

### 5.1 Entry Point Flow
```
URL: /events/?e={slug}[&ticket={qr_token}][&guest_token={token}][&checkin=1][&ref={inviter_id}]
```

1. `DOMContentLoaded`: parse URL params (`slug`, `isCheckin`, `ticketToken`, `pubGuestToken`).
2. `supabaseClient.auth.getSession()` — optional; sets `pubCurrentUser` if signed in.
3. `pubLoadEvent(slug)`:
   - Queries `events` table by slug (excludes `draft`).
   - Loads member RSVP count (`event_rsvps` where `status = 'going'`).
   - Loads guest RSVP count (`event_guest_rsvps` where `paid = true`).
   - If signed in: loads current user's RSVP.
   - If `?guest_token=`: loads guest RSVP.
4. Calls `pubRenderEvent()` to paint the page.

### 5.2 Page Sections (in render order)
1. **Hero banner** — event image / category gradient fallback, share button, category tags
2. **Status badge** — live countdown (ticks every second inside 1 hour), live/completed/cancelled pill
3. **Location pill** — `location_nickname` or truncated address
4. **Invite banner** — personalized invite if `?ref=` param present
5. **Attendee count** — combined member + guest "going" count
6. **Add to Calendar** — generates `.ics` download link
7. **About** — organizer card, description (mini-markdown rendered)
8. **Map** — Leaflet map with pin (requires `location_lat`/`location_lng`); tap to expand fullscreen
9. **Gated notes** — shown only to paid/going RSVPs
10. **RSVP section** — context-driven (see §10)
11. **Guest RSVP form** — name + email form (non-member-only events)
12. **Guest lookup** — "Already RSVP'd?" accordion, email lookup → ticket display
13. **Member-only notice** — shown when `member_only = true` and not signed in
14. **Ticket QR** — generated via QRCode.js; URL encodes `?ticket={qr_token}`; shows checked-in overlay if already scanned
15. **Venue check-in** — button for venue-scan mode events (when `checkin_mode = 'venue_scan'`)
16. **Raffle section** — prizes list, entry buttons (see §13)
17. **Comments section** — flat list, post form
18. **Cost breakdown** — LLC events with `show_cost_breakdown = true`

---

## 6. Portal Events Page (`/portal/events.html`)

**HTML:** `portal/events.html`  
**CSS:** `css/pages/portal/events/index.css` (imports 8 sub-files)  
**Script load order:** `constants.js` → `helpers.js` → `card.js` → `pills.js` → `state.js` → `utils.js` → `list.js` → `detail.js` → all sub-modules → `create/sheet.js` → `manage/sheet.js` → `init.js`

### 6.1 List View
- **Header:** Personalized greeting ("Hey, Justin 👋"), event count subtitle
- **"You're going" rail:** Horizontal scroll of events the user is RSVPed to (Phase B container; populated by `list.js`)
- **"Top Picks" rail:** LLC/pinned future events (rendered when ≥2 qualify)
- **Filter strip (sticky):** Segmented control (Upcoming / Past / Going / Saved), search toggle, date-filter dropdown, calendar view toggle, type-menu dropdown
- **Category chip rail:** All / LLC / Member / Competition (inline emoji chips)
- **Search:** Expandable row with suggestions (recent queries from sessionStorage + quick category chips)
- **Hero card:** Admin-controlled featured event. An admin sets `is_featured = true` on any event via the Manage Sheet → Overview tab toggle. Only one event can be featured at a time (DB trigger enforces this). If no event is featured the hero container is hidden (`#evtHero:empty { display: none }`). The "FEATURED EVENT" kicker label only renders when `event.is_featured === true`. Prior to events_006, selection used an algorithmic waterfall (going-soon → pinned LLC → soonest upcoming).
- **Bucketed groups:** Today / This week / Later this month / Next month / Future — each bucket truncated to 6 with a "See all" link
- **Calendar view:** Mini-calendar + day-details modal (D1 spec)
- **Session persistence:** `sessionStorage` key `evt_list_state_v1` stores search query, type filter, category, view mode, and active tab on every state change

### 6.2 Detail View
URL-routed via `?event={slug}`. Browser history pushState for back/forward support.

- Fetches full event + RSVPs + check-ins + host status on open.
- Dark immersive hero → light content cards below.
- Sticky title row (CSS-only, no JS scroll listener).
- Sections rendered by sub-modules: `detail.js` (main scaffold), then calls into `documents.js`, `map.js`, `scrapbook.js`, `comments.js`, `competition.js`, `raffle.js`.

### 6.3 Create Flow
Two parallel paths:

**Legacy modal (default):** `#createModal` — inline HTML form for all event types (LLC, member, competition, edits, drafts). Handles banner upload, geocoding, raffle config, cost items.

**New sheet (BETA, feature-flagged):** `window.EventsCreate` — 4-step bottom-sheet (Basics → When & Where → Pricing → Review). Currently limited to `member` events only. Enable via:
```javascript
localStorage.setItem('events.newCreate', '1')
// or add ?newCreate=1 to any portal/events.html URL
```

### 6.4 Manage Flow
`window.EventsManage.open(eventId, { source: 'admin' | 'portal' })` — 7-tab bottom-sheet (lazy-loaded per tab):
1. **Overview** — event stats (going, maybe, checked-in, revenue)
2. **RSVPs** — full RSVP list with status pills, check-in badges, member avatars
3. **Money** — revenue breakdown, refund management
4. **Docs** — document upload/management (LLC events only)
5. **Raffle** — entry list, draw raffle button, winners reveal
6. **Comp** — competition phases, entry moderation, vote tallies
7. **Danger Zone** — cancel event, mark active, mark completed

---

## 7. Admin Events Dashboard (`/admin/events.html`)

**JS:** `js/admin/events-dashboard.js`  
**Auth guard:** `checkAuth({ permission: 'events.manage_all' })`

### 7.1 Stats Row
- Total events (with breakdown: active / completed / cancelled)
- Total RSVPs (going + maybe breakdown)
- Event revenue (sum of paid RSVPs × event cost — estimated, not from Stripe)
- Competitions (total + active)

### 7.2 Tabs
1. **All Events** — card grid filterable by status. Each card has "Manage" button → opens `EventsManage` sheet.
2. **Competition Payouts** — lists competitions with winners, payout status per winner, 1099 flags.
3. **Banner Awards** — mass-award cosmetic banners to all checked-in attendees of a selected event.

> **Note:** Revenue stat is estimated from `rsvp_cost_cents * paid_rsvp_count`. It does not query Stripe directly. A discrepancy can occur if different ticket prices were charged.

---

## 8. CSS & Styling

### Portal Events CSS (`css/pages/portal/events/`)
Split into 8 modular files, imported via `index.css`:

| File | Scope |
|---|---|
| `base.css` | Resets, typography, shared tokens, animation utilities |
| `cards.css` | Event cards (banner, gradient fallback, tags, meta row, RSVP button) |
| `hero.css` | Editorial hero card (full-bleed image, overlay, CTA) |
| `layout.css` | Grid, shell, rail, bucket layout, calendar grid |
| `filters.css` | Segmented control, filter chips, search expand, type menu, category chips |
| `calendar.css` | Mini-calendar grid, day cells, active-day highlights |
| `rail.css` | Horizontal scroll rails ("You're going", "Top Picks") |
| `detail.css` | Detail page: hero, meta cards, RSVP section, map, scrapbook, comments |

### Public Event CSS (`css/pages/public-event.css`)
Single file for the public `/events/` page. Contains skeleton loaders, nav, hero, body, RSVP, raffle, ticket QR, cost breakdown, and responsive utilities.

---

## 9. Event Lifecycle State Machine

```
draft → open → confirmed → active → completed
                                  ↘
                              cancelled (from any state except completed)
```

| Status | Meaning | RSVP Allowed |
|---|---|---|
| `draft` | Admin-only visible, not shown on public/portal | No |
| `open` | Accepting RSVPs | Yes |
| `confirmed` | Min participants met; still accepting RSVPs | Yes |
| `active` | Event is happening right now | Yes (edge case) |
| `completed` | Event is over | No |
| `cancelled` | Cancelled; refunds processed | No |

**Status transitions in the codebase:**
- `draft → open`: Publish button in manage sheet (Danger Zone tab) or admin form.
- `open → confirmed`: Currently manual — no auto-trigger when `min_participants` is met.
- `open/confirmed → active`: Manual via manage sheet ("Mark as Active").
- `active → completed`: Manual via manage sheet ("Mark as Completed").
- Any → `cancelled`: Via `process-event-cancellation` edge function.

> **Gap:** There is no automated trigger to transition `open → confirmed` when min participants is met. This is a manual step.

---

## 10. RSVP Pipeline

### 10.1 Member Free RSVP
1. User taps "Going" or "Interested" button.
2. `evtHandleRsvp(eventId, status)` in `portal/events/rsvp.js`:
   - Time-based guard: blocks if event is closed, past, or deadline passed.
   - Checks for existing RSVP.
   - Toggle off: deletes existing RSVP (blocked if `paid = true`).
   - Toggle to different status: `UPDATE event_rsvps SET status = $1`.
   - New RSVP: `INSERT INTO event_rsvps (event_id, user_id, status)`.
3. Re-renders event card + detail RSVP section.

### 10.2 Member Paid RSVP
1. User taps "RSVP — $X.XX" button.
2. `confirm()` dialog shown with no-refund policy.
3. `callEdgeFunction('create-event-checkout', { event_id, type: 'rsvp' })`.
4. Redirected to Stripe Checkout.
5. On success, Stripe webhook → `stripe-webhook` edge function → marks `event_rsvps.paid = true`.
6. User redirected back to event page; ticket QR is now visible.

### 10.3 Guest Free RSVP
1. User fills in name + email on public event page.
2. `pubHandleGuestRsvp()` in `js/events/rsvp.js`:
   - Validates form.
   - Calls `rsvp-guest-free` edge function.
   - Response includes `guest_token`.
   - Page reloads with `?guest_token={token}` appended → shows ticket QR.

### 10.4 Guest Paid RSVP
1. Guest fills in name + email.
2. `callEdgeFunction('create-event-checkout', { event_id, type: 'rsvp', guest_name, guest_email })`.
3. Redirected to Stripe Checkout.
4. On success, Stripe webhook creates `event_guest_rsvps` record with `paid = true` and `guest_token`.
5. Stripe success URL includes `?guest_token=` so the page shows the ticket on return.

### 10.5 Guest Ticket Lookup
"Already RSVP'd?" accordion on public page. User enters email → queries `event_guest_rsvps` by email → displays ticket QR with their `guest_token` in the URL.

---

## 11. Ticketing & QR Check-In

### 11.1 QR Generation
- **Member:** QR encodes `https://justicemcneal.com/events/?e={slug}&ticket={qr_token}` — `qr_token` is a unique 32-char hex stored in `event_rsvps`.
- **Guest:** Same URL pattern with `?guest_token={guest_token}` instead of `?ticket=`.
- QR rendered client-side via `QRCode.toCanvas()` (QRCode.js library).

### 11.2 Attendee-Ticket Mode (default)
Host/staff uses portal `evtOpenScanner()`:
1. Camera opened via `navigator.mediaDevices.getUserMedia`.
2. jsQR library parses each video frame.
3. On scan, `evtParseQrData()` extracts `event_id` (from slug lookup) + `qr_token` or `guest_token`.
4. `evtProcessCheckin()`:
   - Tries to find member RSVP by `qr_token` in `event_rsvps`.
   - Falls back to guest RSVP by `guest_token` in `event_guest_rsvps`.
   - Inserts into `event_checkins`.
   - Displays member name + success UI.

### 11.3 Venue-Scan Mode
When `checkin_mode = 'venue_scan'`:
- A unique `venue_qr_token` is stored on the event.
- A scannable QR poster is provided at the venue entrance.
- Attendees scan it with their own phone → redirected to event page with `?checkin=1`.
- The page shows a "Check In Now" button → writes to `event_checkins`.

### 11.4 Already-Checked-In Overlay
When a QR is displayed and the member/guest has already checked in:
- QR canvas is dimmed to 30% opacity.
- A green checkmark circle overlay is rendered on top.
- Check-in timestamp is shown below.
- `navigator.vibrate([100, 50, 100])` — haptic confirmation.

---

## 12. Payment & Stripe Integration

### 12.1 Payment Types
| `type` param | Amount Source | On Success |
|---|---|---|
| `rsvp` (member) | `event.rsvp_cost_cents` | Webhook marks `event_rsvps.paid = true` |
| `rsvp` (guest) | `event.rsvp_cost_cents` | Webhook inserts `event_guest_rsvps` with `paid = true` |
| `raffle_entry` | `event.raffle_entry_cost_cents` | Webhook marks `event_raffle_entries.paid = true` |
| `competition_entry` | `competition_config.entry_fee_cents` | Webhook marks `competition_entries` |
| `prize_pool` | Custom `amount_cents` | Webhook inserts `prize_pool_contributions` |

### 12.2 Stripe Webhook (`stripe-webhook`)
Listens for `checkout.session.completed`. Uses event metadata (`event_id`, `type`, `user_id` / `guest_email`, etc.) stored on the Checkout Session to determine what to update. Uses service role key to bypass RLS.

### 12.3 Non-Refundable Policy
All paid RSVPs are **non-refundable by default** unless:
- Admin cancels the event → `process-event-cancellation` issues refunds.
- Event is rescheduled → grace window allows self-refund.
- Admin performs a `manual` or `admin_override` refund.

Users must click through a `confirm()` dialog acknowledging the policy. `accepted_no_refund_policy` and `accepted_no_refund_at` are stored on the RSVP row.

---

## 13. Raffle System

### 13.1 Entry Types
| Scenario | Method |
|---|---|
| Paid RSVP event | Entry auto-included with RSVP — no separate raffle ticket needed |
| Free event (free raffle) | One-click entry (no payment) |
| Free event (paid raffle) | Stripe checkout → `raffle_entry` type |
| Guest (free raffle) | Name + email form → `raffle-guest-free` edge function |
| Guest (paid raffle) | Name + email form → `create-event-checkout` with `type: 'raffle_entry'` |

### 13.2 Draw
- Triggered manually by host via "Draw Raffle" button in manage sheet → Raffle tab.
- Selects `raffle_winner_count` random entries from `event_raffle_entries`.
- Inserts into `event_raffle_winners` with place (1, 2, 3…).
- Winners displayed on public event page and portal detail page.

### 13.3 Prize Display
`raffle_prizes` is a JSONB array of `{ place: int, label: string }`. Displayed as an ordered list on the event page. Ordinal suffixes auto-generated (1st, 2nd, 3rd…).

---

## 14. Competition System

### 14.1 Phases (1–4)
Each competition event has up to 4 phases defined in `competition_phases`. Status machine: `pending → active → completed | extended | cancelled`. Each phase has `starts_at` / `ends_at`. An active phase can be extended once (`extended_once` flag prevents double extensions).

**Phase roles (conventional — not enforced at DB level):**
- Phase 1: Registration / entry submission
- Phase 2: Public voting
- Phase 3: Finalist judging
- Phase 4: Results announcement

### 14.2 Entry Submission
- Members submit during Phase 1 (or whichever phase is marked `active`).
- Entry types: `file`, `link`, `text`.
- Files uploaded to Supabase Storage.
- `UNIQUE(event_id, user_id)` — one entry per member per competition.
- Moderation flag (`moderated`) — admin can soft-hide entries without deleting them.

### 14.3 Voting
- One vote per voter per event (`UNIQUE(event_id, voter_id)`).
- Voter eligibility controlled by `competition_config.voter_eligibility`: `all_members` | `rsvped_only` | `competitors_only`.
- `vote_count` denormalized on `competition_entries` for fast display.

### 14.4 Prize Pool
- Members can voluntarily contribute to the prize pool via `prize_pool` Stripe checkout type.
- `total_prize_pool_cents` on the event is updated after each contribution.
- `competition_config.house_pct` controls what percentage LLC keeps.

### 14.5 Winners & Payouts
- Admin selects winners (places 1–3) in manage sheet → Comp tab.
- Inserts into `competition_winners` with `payout_status: 'pending'`.
- Payout triggered by admin → calls `send-payout` edge function.
- `needs_1099` flag auto-set based on payout amount threshold.

---

## 15. Live Map System

**File:** `js/portal/events/map.js`  
**Available:** LLC events only, RSVPed members + hosts, during event window (start → end + 24h).

### 15.1 Location Sharing
1. Member taps "Share My Location" toggle → `evtToggleLocationSharing(eventId)`.
2. `navigator.geolocation.watchPosition()` starts tracking.
3. Every position update: upsert into `event_locations` (lat, lng, `sharing_active: true`, `updated_at: now()`).
4. Supabase Realtime subscription listens to `event_locations` changes → updates other members' markers in real time.

### 15.2 Map Rendering
- Leaflet.js with OpenStreetMap tiles.
- Each sharing member shown as a colored marker with initials + name tooltip.
- Stale locations (not updated in last 5 minutes) shown with a different marker style.
- Stop sharing: upserts `sharing_active: false`; marker hidden from others.

### 15.3 Privacy
- Location data stored in DB — **not** ephemeral.
- Visible only to other RSVPed members and hosts.
- `event_locations` RLS requires `auth.uid() IS NOT NULL` and active RSVP.

> **Gap:** Location data is never auto-deleted. `event_locations` rows persist indefinitely after event ends. A cleanup policy or scheduled purge would improve privacy hygiene.

---

## 16. Documents System

**File:** `js/portal/events/documents.js`  
**Available:** LLC events only.

### 16.1 Upload (Host/Admin)
1. Host selects document type and file from manage sheet → Docs tab.
2. File uploaded to `event-documents` storage bucket.
3. Row inserted into `event_documents` (with `target_user_id` for per-member docs, or null for group docs).

### 16.2 Download (Member)
Members see two sections:
- **Your Documents:** Per-member docs (plane ticket, etc.)
- **Group Documents:** Shared docs (itinerary, group tickets)

Members can view/download from the event detail page.

### 16.3 "Mark as Distributed"
Hosts can mark per-member docs as `distributed: true` to track which tickets have been handed out.

---

## 17. Scrapbook (Photo Gallery)

**File:** `js/portal/events/scrapbook.js`  
**Available:** Completed events only (`status = 'completed'`). RSVPed members + admins can upload.

- Photos uploaded to `event-photos` storage bucket (public, 10MB limit).
- Supported formats: JPG, PNG, WebP, GIF.
- Grid display (2 cols mobile, 3 cols desktop).
- Uploader name shown on each photo.
- Optional caption overlaid at bottom of photo.
- Uploader or admin can delete (trashcan button visible on hover).
- Lightbox viewer: `evtViewPhoto()` opens fullscreen overlay.

---

## 18. Comments System

**File:** `js/portal/events/comments.js`  
**Available:** All event types on portal detail view.

- Flat list (no threading yet despite `parent_id` column existing).
- 2000-char limit enforced at DB level.
- Members: display name + avatar. Guests: `guest_name` field.
- Relative timestamps ("2h ago", "3d ago", etc.).
- Comments load on detail view open, refresh on post.
- `event_comments` is accessible on the public page too (though the UI there is not yet implemented).

> **Gap:** No moderation tools for comments in the current manage sheet. Admins can delete from the DB directly but there's no UI for it.

---

## 19. Notifications & Reminders

### 19.1 DB Triggers (automatic)
| Trigger | Table | Event | Action |
|---|---|---|---|
| `trg_checkin_badge` | `event_checkins` | AFTER INSERT | Award badges, send check-in notification |
| `trg_rsvp_notify` | `event_rsvps` | AFTER INSERT | Notify event creator of new "going" RSVP |
| `on_document_notify_member` | `event_documents` | AFTER INSERT | Notify member when a per-member doc is uploaded |

### 19.2 Push Reminders (Edge Function)
`send-event-reminders` function sends push notifications at:
- 7 days before event
- 72 hours before event
- Day-of (within 12 hours of start)

Respects `notification_preferences.event_reminders` per user.

> **Gap:** No scheduler/cron is wired up for `send-event-reminders`. It must be called manually or via an external cron (pg_cron, Supabase Cron, GitHub Actions, etc.).

### 19.3 Notification Preferences
Per-user table `notification_preferences`. Toggles: `event_new`, `event_reminders`, `event_rsvp_updates`, `event_rsvp_deadline`, `raffle_results`, `competition_updates`, `checkin_alerts`, `push_enabled`.

---

## 20. Gamification & Badges

### 20.1 Event Badges (seeded in migration `069`)
| Badge Key | Emoji | Trigger |
|---|---|---|
| `event_participant` | 🎉 | Check into any event |
| `trip_veteran` | 🏔️ | Check into 3+ LLC trips |
| `never_miss` | 🎵 | Check into 5+ total events |
| `comp_winner` | 🏆 | Win 1st place in a competition |
| `top_competitor` | 🥇 | Place top 3 in a competition |
| `fundraiser_champ` | 💰 | Contribute to a prize pool |
| `event_organizer` | 📋 | Create event with 5+ checked-in attendees |

### 20.2 Auto-Award Trigger
`trg_checkin_badge` fires on every insert into `event_checkins`. It:
1. Awards `event_participant` immediately.
2. Counts total check-ins → awards `never_miss` at 5+.
3. Counts LLC event check-ins → awards `trip_veteran` at 3+.
4. Sends a check-in notification to the member (respecting prefs).

The DB function `award_event_badge(user_id, badge_key)` inserts to both `member_badges` and `member_cosmetics` (idempotent via `ON CONFLICT DO NOTHING`).

### 20.3 Banner Awards
`award_event_banner_to_attendees(event_id, banner_key)` — admin tool in `/admin/events.html` → Banners tab. Mass-awards a cosmetic banner to all members who checked in to a specific event.

---

## 21. Waitlist System

**Edge function:** `manage-event-waitlist`

### Flow
1. Event reaches `max_participants` capacity.
2. Subsequent "Going" RSVP attempts: user is placed on waitlist with next available `position`.
3. When a spot opens (cancellation or refund), host/admin calls `manage-event-waitlist` with `action: 'offer_next'`.
4. Next person in line (lowest `position` in `waiting` status) is sent a push notification and offered the spot for 24 hours.
5. If they don't claim within 24h, `expire_offers` moves them to `expired` and auto-advances to next person.
6. `advance_all` handles all active events at once (for cron use).

> **Gap:** `manage-event-waitlist` has no automatic invocation. When a paid RSVP is refunded and a spot opens, there is no trigger or webhook handler that calls `offer_next`. This must be done manually.

---

## 22. Refund System

**Edge function:** `process-event-cancellation`

### Refund Reasons
| Reason | Triggered By |
|---|---|
| `event_cancelled` | Admin cancels event — all paid attendees refunded minus non-refundable expenses |
| `min_not_met` | Event didn't meet min participants — full refunds |
| `reschedule_grace` | Event rescheduled — member can request refund within grace window |
| `manual` | Admin-initiated per-member refund |
| `admin_override` | Full override, ignores policies |

### Deductions
`non_refundable_expenses_cents` is divided by total going count to get a per-person deduction. This is subtracted from each refund amount. Stored in `event_refunds.deduction_cents`.

### Stripe Integration
Refunds are issued via `stripe.refunds.create({ payment_intent: ..., amount: ... })`. Partial refunds are supported for deductions.

---

## 23. OG / Social Preview

**Edge function:** `event-og`

When a member shares an event link, the URL can be routed through:
```
https://{supabase_project}.supabase.co/functions/v1/event-og?e={slug}&ref={user_id_prefix}
```
This returns XHTML with proper OG meta tags (title, description, image, date, inviter name). Social platforms (iMessage, Slack, WhatsApp, Twitter) read these tags for rich previews.

The `?ref=` param stores the inviter's user ID prefix (first 8 chars). The function does a prefix query on `profiles` to get the first name for a personalized preview ("Justin invited you to...").

---

## 24. Role & Permission Guards

### Auth Check
Every portal/admin page calls `checkAuth()` from `js/auth/shared.js`. This verifies Supabase session and redirects to `/auth/login.html?redirect=...` if unauthenticated.

For admin pages:
```javascript
checkAuth({ permission: 'events.manage_all' })
```

### Permission System
Permissions are stored in `roles_permissions` table (migration `078`). `user_has_permission(uid, perm)` is a PG function.  
Key events permissions:
- `events.create` — can create events (shown "Create Event" button)
- `events.manage_all` — full admin access to manage sheet + admin dashboard
- `events.checkin` — can scan QR / open scanner

### RLS Policies
All events-related tables have RLS enabled. Key patterns:
- Service role bypasses all RLS (used by edge functions and webhooks).
- Admins (profiles.role = 'admin') have full access to most tables.
- Members can read events, read their own RSVPs, insert their own RSVPs.
- Event creators and listed hosts have elevated access to their own events.
- Anonymous users can read non-draft events and guest RSVP records (for ticket lookup).

---

## 25. Feature Flags

### New Create Sheet (M4a)
```javascript
// Enable
localStorage.setItem('events.newCreate', '1')
// or add ?newCreate=1 to portal/events.html URL

// Disable
localStorage.removeItem('events.newCreate')
// or add ?newCreate=0 to URL
```
When disabled: legacy `#createModal` HTML form is used for all event types.  
When enabled: new 4-step `EventsCreate` bottom-sheet used for **member** events only. LLC, competition, edit, and draft flows still use the legacy modal.

---

## 26. Known Gaps & Issues

### Critical Gaps
1. **No cron/scheduler for `send-event-reminders`** — reminders are never sent unless the function is called manually or wired to a cron.
2. **No auto-trigger for waitlist advancement** — when a spot opens via refund/cancellation, `manage-event-waitlist` is not automatically called.
3. **No auto-transition from `open` → `confirmed`** — when `min_participants` is met, status does not change automatically.
4. **Revenue stat in admin is estimated** — uses `rsvp_cost_cents × paid_count`, not actual Stripe charges. Discrepancies possible (promo codes, custom amounts, etc.).

### Security Notes
5. **CORS is `*` on all edge functions** — acceptable for public endpoints (guest RSVP, OG). For `create-event-checkout` and `process-event-cancellation`, should be restricted to the app origin in production.
6. **Guest comment RLS** — guests can post comments with any `guest_token`. There is no validation that the `guest_token` belongs to an actual RSVP for this event.
7. **Location data retention** — `event_locations` rows are never deleted. Should implement a cleanup policy.

### UX Gaps
8. **Comment moderation** — no admin UI to delete comments; must use DB directly.
9. **New create sheet is BETA** — only supports `member` events; LLC + competition still use the legacy modal which has inconsistent UX.
10. **Threading in comments** — `parent_id` column exists but threading is not implemented in the UI.
11. **Competition badge auto-award** — `comp_winner` and `top_competitor` badges are defined but the trigger to award them after `competition_winners` is inserted is not visible in the scanned migrations. May need to be implemented.
12. **`event_organizer` badge** — defined but no trigger checks "5+ checked-in attendees" on the event's creator automatically.
13. ~~**`is_pinned` on events was phantom**~~ — `_pickHero()` referenced `e.is_pinned` (Rule 2) but the column only exists on the `posts` table, never `events`. Rule 2 never fired. **Resolved in events_006** (migration `085`, replaced with `is_featured`).

---

## 27. Upgrade Recommendations

### Priority 1 — Production Stability
- Wire `send-event-reminders` to a Supabase Cron job (`pg_cron`) or a scheduled GitHub Actions workflow.
- Add a database trigger or webhook on RSVP deletion/cancellation to auto-call `manage-event-waitlist` with `offer_next`.
- Add a database trigger on RSVP count change to auto-promote `open → confirmed` when `min_participants` is met.
- Fix admin revenue stat to query Stripe Balance Transactions API for accuracy.

### Priority 2 — Security
- Restrict CORS on sensitive edge functions (`create-event-checkout`, `process-event-cancellation`) to `https://justicemcneal.com`.
- Add guest comment validation: verify `guest_token` belongs to an `event_guest_rsvp` row for the same `event_id` before inserting comment.
- Implement `event_locations` cleanup: delete rows older than 24h after event end (pg_cron or trigger).

### Priority 3 — Feature Completion
- Implement comment threading (UI using existing `parent_id` column).
- Add admin comment moderation UI in the manage sheet (Danger Zone or new tab).
- Graduate `EventsCreate` new sheet from BETA: extend to LLC and competition types, retire legacy modal.
- Implement missing badge award triggers for `comp_winner`, `top_competitor`, and `event_organizer`.
- Add a "Saved / Bookmarked" events feature (the "Saved" filter tab exists in UI but no `event_saves` table or logic is present).

### Priority 4 — Architecture
- Replace global `var` state in public event page (`pubCurrentEvent`, `pubCurrentUser`, etc.) with a proper module scope to prevent accidental global pollution.
- Consolidate the two parallel RSVP renderers (public `pubRenderRsvpSection` and portal `evtHandleRsvp`) into a shared component to reduce drift.
- Move inline Tailwind config from each HTML `<head>` into a shared bundled config (currently duplicated in every HTML file).
- Consider a build step (Vite/esbuild) to bundle the growing number of JS modules rather than relying on script tag load order.
- `event-og` workaround (XHTML as text/xml) is brittle — evaluate moving to a custom domain edge proxy that can serve proper HTML with OG tags.

---

## 28. Changelog

### events_006 — Admin-Controlled Featured Banner (May 3, 2026)
**Goal:** Allow admins to explicitly designate one event as the portal hero banner. If none is featured, the banner hides completely.

**Files changed:**

| File | Change |
|---|---|
| `supabase/migrations/085_event_featured_flag.sql` | Adds `is_featured BOOLEAN DEFAULT FALSE` to `events`, partial index `idx_events_featured`, and `trg_single_featured_event` BEFORE UPDATE trigger to enforce single-featured invariant |
| `js/portal/events/list.js` | `_pickHero()` replaced — old 3-rule waterfall removed; now returns `events.find(e => e.is_featured && not cancelled/draft) \|\| null`. Call site `_pickHero(filtered, rsvps)` → `_pickHero(filtered)`. Added `events:manage:updated` listener that calls `evtLoadEvents()` to refresh hero after admin toggle. "FEATURED EVENT" kicker made conditional on `event.is_featured === true` |
| `js/portal/events/manage/sheet.js` | Overview tab renders an admin-only toggle switch (when `STATE.source === 'admin'`) that calls `supabaseClient.from('events').update({ is_featured })` and fires `events:manage:updated`. `window._emToggleFeatured()` handler registered globally |
| `js/admin/events-dashboard.js` | Event title cells in the card grid now show a `★` (amber) badge when `e.is_featured === true` |
| `css/pages/portal/events/hero.css` | Added `#evtHero:empty { display: none; }` so the container collapses with no visible gap when no event is featured |

**DB migration applied:** `085_event_featured_flag.sql` — pushed to production via `supabase db push --include-all` (also applied 080–082 which were pending).

**Behaviour summary:**
- Exactly one event can be featured at a time (DB trigger auto-unfeatures the previous one).
- If no event is featured, `_pickHero()` returns `null`, `_renderHero(null)` clears `#evtHero`, and the CSS `empty` guard hides it.
- Toggling in the manage sheet immediately refreshes the portal list view via a `CustomEvent` → `evtLoadEvents()`.
