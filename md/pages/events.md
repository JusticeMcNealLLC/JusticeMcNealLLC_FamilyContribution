# 📅 Events Page — Feature Specification

> **Vision:** A full-featured family events hub where the LLC can organize paid, coordinated experiences (trips, outings, retreats) and members can post their own social gatherings — all with RSVPs, check-ins, payments, documents, and gamification baked in.

---

## Overview

The Events page serves two distinct purposes depending on who is creating the event. Both types live on the same page and are visually distinguished, but behave very differently under the hood.

| | **LLC Event** | **Member Event** |
|---|---|---|
| **Created by** | Admin / Event Coordinator role | Any active member |
| **Scale** | Large, planned trips & experiences | Birthdays, hangouts, casual meet-ups |
| **Payment** | Yes — RSVP requires Stripe payment | No cash — RSVP only |
| **Cost breakdown** | Full line-item budget visible on event | None |
| **Documents** | Admin uploads tickets, passes, etc. | None |
| **Minimum ticket** | Yes — auto-cancel if minimum not met | No |
| **Revenue share** | Yes — LLC takes a cut | No |
| **Map** | Live GPS map during event | No |
| **QR check-in** | Yes | Yes |
| **Competition mode** | Optional | Optional |

---

## Event Types at a Glance

### 1. LLC Events
> Coordinated by staff. Fully budgeted, RSVP-gated, payment-required experiences.
> Examples: Snowboarding trip, family cruise, weekend retreat, holiday dinner.

### 2. Member Events
> Posted by any active member. Social RSVPs, no payments.
> Examples: Birthday party, local hangout, game night, cookout.

### 3. Competition / Fundraiser Events
> A special variant of either LLC or Member events — phase-based, prize-pool, voting.
> Examples: Logo redesign contest, cooking competition, trivia tournament.

---

## Feature Specification

---

### 🏔️ LLC Events

#### Creating an LLC Event
> Only users with the **Admin** or **Event Coordinator** role can create LLC events.

> **Event Coordinator role** — a new role value (`'coordinator'`) on the `profiles.role` column. Coordinators can create and manage LLC events but otherwise have standard member access. Assigned by admins from the admin dashboard.

**Required Fields:**
- [ ] Event title
- [ ] Event type (Trip, Outing, Retreat, Dinner, Holiday, Custom)
- [ ] Description / overview (rich text)
- [ ] Cover banner image (uploaded or generated)
- [ ] Event date(s) — single day or multi-day range
- [ ] Location — text address + optional map pin
- [ ] Max participant count (hard cap — RSVP closes when full)
- [ ] RSVP deadline — defaults to 3 months before event date

**Cost Breakdown Builder:**
The event coordinator fills out a detailed cost breakdown table. Each line item has:
- [ ] Line item name (e.g. "Airbnb", "Ski Lift Passes", "Car Rental")
- [ ] Category (Lodging, Transportation, Food, Gear, Entertainment, Other)
- [ ] Total cost for the group
- [ ] Whether it's **included in buy-in** or **out-of-pocket** (member pays separately)
- [ ] Notes / source link (e.g. "Based on Expedia quote for 4 pax, March 15")
- [ ] Optional: "Average per person" for out-of-pocket items so members know what to budget

**Auto-calculated fields:**
- [ ] **Total included cost** = sum of all "included in buy-in" line items
- [ ] **Buy-in (RSVP cost)** = Total included cost ÷ Max participant count
- [ ] **Estimated out-of-pocket** = sum of average per-person out-of-pocket items
- [ ] **Grand total per person** = Buy-in + Out-of-pocket estimate

**Cost Breakdown Lock Policy:**
- [ ] Once the **first RSVP payment is received**, the cost breakdown is **locked** — no line items can be added, edited, or removed
- [ ] If actual costs come in lower than estimated, the difference is **retained by the LLC** (not refunded to members)
- [ ] Admin can post a note on the event explaining any cost variance, but the buy-in amount is final once payments begin
- [ ] If admin needs to update costs before any payments are received, the breakdown is freely editable

**Example breakdown display:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SNOWBOARDING TRIP — Cost Breakdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✈ Plane Tickets (avg est.)     ~$320/person   OUT OF POCKET
  🏠 Airbnb (4 nights)           $1,200         INCLUDED
  🚗 Car Rental                  $400           INCLUDED
  🎿 Ski Lift Passes (4 days)    $800           INCLUDED
  🎿 Rental Gear (4 days)        $480           INCLUDED
  🍕 Group Food Budget           $320           INCLUDED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total Included Cost:           $3,200
  Max Participants:              4
  ──────────────────────────────────────────
  💳 RSVP Buy-In:                $800/person
  ✈ Est. Out-of-Pocket:         ~$320/person
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💰 Est. Total Per Person:      ~$1,120
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### RSVP & Payment

- [ ] Members click **"RSVP — $800"** button on the event page
- [ ] Stripe Checkout opens for the buy-in amount
- [ ] On success → member is added to the confirmed RSVP list
- [ ] RSVP list shows: confirmed members with avatars, open spots remaining
- [ ] RSVP closes automatically when: (a) deadline passes, or (b) max participants reached
- [ ] **RSVP is binary for paid events** — no "Maybe" option. You're either paid in (confirmed) or not. "Maybe" is only available on free member events.
- [ ] **No +1 / guest RSVPs** — each RSVP is tied to one member account. If someone wants to attend, they must be an active contributing member and RSVP themselves. One spot per person, always.

**Waitlist:**
- [ ] When all spots are filled, members can join a **waitlist** (no payment required to join the waitlist)
- [ ] If a spot opens (coordinator-raised max, or a forfeited spot), the first person on the waitlist is notified via push notification with a **24-hour window** to complete their RSVP payment
- [ ] If they don't pay within 24 hours, the spot passes to the next waitlisted member
- [ ] Waitlist position is shown to the member: "You're #3 on the waitlist"
- [ ] **No RSVP transfers** — if a confirmed member can no longer attend, they forfeit their spot and payment with no refund. The freed spot goes to the next waitlisted member who pays the full current buy-in price.

- [ ] **No-refund disclaimer** displayed prominently before checkout:
  > *"By completing your RSVP, you agree that your payment is non-refundable unless this event is cancelled or rescheduled by LLC staff. Cancelling your own RSVP forfeits your payment. See Cancellation Policy below."*
- [ ] Member acceptance of the no-refund policy is **logged** at checkout: `accepted_no_refund_policy = true`, `accepted_no_refund_at = NOW()` stored on the RSVP record

**Payment Timing:**
- [ ] Payment is **captured immediately** at RSVP time — funds are taken at Stripe checkout, not authorized-and-held
- [ ] This prevents card declines months later for far-future events
- [ ] No deferred capture regardless of how far out the event is

**Payment Routing:**
- [ ] All RSVP funds collected to the LLC BlueVine business bank account via Stripe
- [ ] If the event is **scheduled far in advance** (>6 months), admin has option to flag the event pool as "invest-eligible" — coordinator can move collected funds to Fidelity to earn interest until event spend begins
- [ ] Interest earned on event funds stays in the LLC general fund (not returned to members)
- [ ] **Invest-eligible disclosure** — if a member RSVPs to an invest-eligible event, a prominent notice is shown at checkout: *"This event's funds may be held in a Fidelity investment account. If this event is cancelled while funds are invested, your refund may take several business days while funds are liquidated and transferred back before Stripe can issue the return."* Member must explicitly acknowledge this before completing RSVP.

**LLC Revenue Share:**
- [ ] When creating the event, coordinator can set an optional **LLC contribution percentage** (e.g. 5%)
- [ ] This % is added to the buy-in automatically: Buy-in = (Included Costs ÷ Max Participants) + LLC cut
- [ ] The LLC cut is labeled on the event page: *"Includes 5% LLC community contribution"*
- [ ] These funds go to the LLC general fund after the event closes/completes

#### Minimum Threshold

- [ ] Event coordinator sets a **minimum participant count** required for the event to proceed
- [ ] Example: "Minimum 3 of 6 spots must be filled by Jan 15 or event auto-cancels"
- [ ] A progress bar on the event page shows current RSVP count vs. minimum needed
- [ ] If minimum is not met by the deadline → **auto-cancel triggers**:
  - Event status changes to "Cancelled — Minimum Not Met"
  - All RSVP payments are automatically refunded via Stripe
  - Push notification + email sent to all RSVPed members
- [ ] If minimum is met → event is **confirmed** and RSVP remains open until max is reached or deadline hits

#### Cancellation & Rescheduling (Admin)

- [ ] Admin can **cancel** a confirmed event at any time
  - If no non-refundable group expenses have been paid: all RSVP members receive a full Stripe refund
  - If the coordinator has already paid for **non-refundable group items** (e.g. Airbnb deposit, non-refundable tickets): admin enters the total non-refundable amount, which is deducted proportionally from each member's refund. A note is posted on the event explaining the deduction. The remainder is refunded via Stripe.
  - Push notification: "❌ [Event] has been cancelled. Your refund of $X has been issued."
- [ ] Admin can **reschedule** an event
  - New date/time shown on event page
  - Existing RSVPs preserved (not auto-refunded)
  - Push notification: "📅 [Event] has been rescheduled to [New Date]. Tap to view details."
  - Members have a **reschedule grace window** (e.g. 72 hours) to cancel their RSVP and receive a full refund if the new date doesn't work for them
- [ ] Admin can **issue a manual refund** to specific members at any time (e.g. coordinator error, member hardship)

#### Supporting Documents

After the RSVP deadline closes, the event coordinator researches and purchases items (tickets, passes, etc.) and uploads documents to the event:

- [ ] Admin uploads documents per item (PDF, image, or file)
- [ ] Document types:
  - **Plane Ticket** — uploaded per-member (coordinator sees each RSVPed member's name and uploads their specific ticket)
  - **Group Ticket / Pass** — single document shared with all RSVPed members
  - **Itinerary** — PDF version of the full trip plan
  - **Receipt** — proof of purchase for group expenses
  - **Other**
- [ ] RSVPed members can **download their documents** from the event page after upload
- [ ] Members can print or present documents as needed (e.g. boarding pass at airport)
- [ ] Non-RSVPed members cannot access documents
- [ ] Admin can mark each document as **"Distributed"** once uploaded

**Supported vs. Out-of-Pocket Transportation:**
- [ ] When creating the event, coordinator marks plane tickets as either:
  - **"LLC Provides"** — tickets are purchased and uploaded to the portal
  - **"Self-Arranged"** — members buy their own; coordinator adds an "avg. cost estimate" for budgeting
- [ ] If self-arranged, the event page shows a note: *"✈️ Members are responsible for their own travel to [City]. Estimated round-trip cost: ~$320."*

#### Event Requirements (RSVP Gating)

Certain events can require members to meet conditions before or during the event:

- [ ] **Location sharing required** — member must have location sharing enabled for the duration of the event
  - Checked at check-in via QR scan
  - If not enabled, member is prompted to enable it before the QR scan completes
- [ ] **Active subscription required** — only active contributors can RSVP
- [ ] **Custom requirements** — coordinator can add text requirements (e.g. "Must be 18+", "Bring valid ID")
- [ ] Requirements listed clearly on the event page before RSVP button

#### Live Event Map

During an active event, a dedicated map is available to all RSVPed members:

- [ ] Opt-in only — members choose to share location during that specific event
- [ ] Map uses Leaflet.js + OpenStreetMap (free)
- [ ] Member's profile picture pinned to their current GPS position
- [ ] **Powered by Supabase Realtime** — location pins update in real time via `event_locations` table subscription (no polling needed; pins move live as members move)
- [ ] If a member **opts out mid-event**, their pin disappears from the map within the next Realtime update cycle — no stale last-known position lingers
- [ ] **Privacy banner** — while a member is actively sharing location for an event, a persistent banner displays on their screen: *"You're sharing your location for [Event Name]. Tap to stop."* So they always know and can revoke instantly.
- [ ] Only visible to RSVPed members (RLS enforced)
- [ ] Admin can see all opted-in members on a single view
- [ ] Map accessible from the event detail page during event window (event start → event end + 24h)
- [ ] Database: `event_locations` table (event_id, user_id, latitude, longitude, updated_at)

---

### 🎉 Member Events

> Any active member can create a member event. No payments. Social RSVPs only.

#### Creating a Member Event

- [ ] Event title
- [ ] Description
- [ ] Cover banner image (optional upload, or auto-generated colored banner)
- [ ] Date and time
- [ ] Location (text address)
- [ ] Max attendees (optional)
- [ ] Event type: Party, Hangout, Birthday, Game Night, Cookout, Other

#### RSVP (No Payment)

- [ ] Members tap **"RSVP"** → added to the Going list
- [ ] RSVP options: **Going** / **Maybe** / **Not Going**
- [ ] Attendee list visible on event page with member avatars
- [ ] Event creator gets push notification when someone RSVPs
- [ ] No Stripe involved — purely social

#### QR Code Check-In

- [ ] When the event is created, a unique **QR code** is generated for that event
- [ ] **Scanner access** — the QR scanner is visible on the event detail page only to: the event creator, admins, event coordinators, and any **sub-coordinators** explicitly granted check-in access by the creator/coordinator
  - For LLC events, the coordinator can designate additional members as check-in staff (sub-coordinators) directly from the event management panel — useful for large events with many attendees arriving at once
  - Non-designated members never see the scanner UI, even if they're RSVPed
- [ ] When an attendee arrives, the scanner operator opens the event on their phone and scans the attendee's QR badge
- [ ] Each member has a **personal check-in QR code** accessible from their member profile page and settings. Uses `qrcode.js` to generate, `jsQR` to scan via camera.
- [ ] QR codes for a given event are **only valid during the event window** (event start → event end + 24h) — expired codes return a rejection message instead of a check-in
- [ ] Successful scan → attendee is marked "Checked in ✅" on the event attendee list
- [ ] Attendance data is recorded and feeds into **Credit Points**:
  - RSVP'd and showed up → +CP bonus
  - RSVP'd and no-showed → potential CP impact (configurable per event)
  - Attended without RSVP → still gets check-in CP
- [ ] Database: `event_checkins` (event_id, user_id, checked_in_at, checked_in_by)

---

### 🏆 Competition & Fundraiser Events

> A special event type that runs in phases. Works for creative contests, tournaments, fundraisers, or any group challenge.

#### Event Phases

Competition events have a defined set of phases that run sequentially:

| Phase | Name | Purpose |
|---|---|---|
| **Phase 1** | **Registration** | Members sign up as a competitor. Prize pool accumulates from entry fees (optional). |
| **Phase 2** | **Active Competition** | Competitors submit their entries (file upload, link, or description). Duration is set by coordinator. |
| **Phase 3** | **Voting** | All members (or RSVPed members only) vote on submissions. Each member gets one vote. |
| **Phase 4** | **Results** | Winner(s) announced. Prize deposited via Stripe to winner's connected bank. |

#### Phase 1 — Registration

- [ ] "Join as Competitor" button on the event page
- [ ] Optional entry fee (set by organizer — goes to prize pool)
- [ ] Even without entry fee, a **Community Prize Pool** can be funded:
  - Any member (including non-competitors) can contribute to the prize pool
  - Prize pool total displayed on event page with a progress bar
  - Contributions go through Stripe to LLC account
- [ ] Competitor list visible: "X competitors registered"
- [ ] Phase stays open until organizer-set registration deadline

#### Phase 2 — Active Competition

- [ ] Phase opens automatically on the set date
- [ ] Competitors submit their entry:
  - File upload (image, PDF, video) — **file size limits enforced**: max 10MB for images/PDFs, max 50MB for video
  - External link
  - Text / description
- [ ] Entries can be kept **private until voting phase** (organizer choice) or **visible immediately**
- [ ] Countdown timer showing time remaining in competition phase
- [ ] Late submissions blocked after deadline (server-side enforced, not just UI)
- [ ] **Entry moderation** — admins and coordinators can remove any submitted entry before voting opens (spam, inappropriate content, rule violation). Removed entrant is notified with a reason.
- [ ] **Minimum entries threshold** — coordinator sets a minimum number of entries required for voting to begin. If fewer entries are submitted by the deadline, the competition phase is extended once (organizer sets extension window) or cancelled with full prize pool refund.

#### Phase 3 — Voting

- [ ] All submissions displayed in an anonymous (or named) gallery
- [ ] Each eligible voter gets **one vote** (ranked-choice or simple pick, organizer choice)
- [ ] **Self-voting is blocked** — competitors cannot vote for their own entry (enforced server-side)
- [ ] Eligible voters: all RSVPed members, or all active members, or competitors-only (organizer sets)
- [ ] Live vote tally optionally shown (or hidden until results)
- [ ] Voting closes on organizer-set deadline

#### Phase 4 — Results

- [ ] Winner(s) announced on event page with celebration animation (Lottie)
- [ ] Push notification to all event participants + followers: "🏆 [Name] won [Event]!"
- [ ] **Tie handling** — in the event of a tie, the prize is **split equally** among tied winners. Organizer can optionally configure multiple winner tiers (1st/2nd/3rd) with a percentage split (e.g. 60% / 30% / 10%) when setting up the competition.
- [ ] Prize distribution:
  - Winner(s) receive prize pool via Stripe payout to their connected bank
  - Organizer can set a **house percentage** (e.g. 10% goes to LLC fund before payout)
  - Receipts visible on event page and in admin payout console
  - **IRS 1099-NEC flag** — if any single winner receives $600 or more in prize money in a calendar year, the admin payout console flags this for 1099-NEC reporting. The LLC is responsible for filing; the system surfaces the alert, it does not auto-file.
- [ ] **Rewards:**
  - Winner receives an **exclusive event badge** (auto-generated or admin-designed)
  - Participation badge for all competitors who submitted
  - CP bonus for participating, voting, and winning

---

### 🎨 Visual Features (All Event Types)

#### Event Banners

- [ ] Every event has a full-width cover banner
- [ ] Sources:
  - Admin/member uploads a custom image
  - Auto-generated color gradient banner with event title + emoji
  - Admin can upload a designed banner for LLC events
- [ ] Banners appear on the event card in the events list and as a hero on the event detail page
- [ ] Special events can award a **member banner** to participants that shows on their profile (like milestone cover banners)

#### Badges for Events

- [ ] **Participant Badge** — attended any LLC event
- [ ] **Trip Veteran** — attended 3+ LLC trips
- [ ] **Never Miss a Beat** — RSVP'd and checked in to 5+ events
- [ ] **Competition Winner** — won a competition event
- [ ] **Top Competitor** — placed top 3 in a competition
- [ ] **Fundraiser Champion** — contributed to a prize pool
- [ ] **Event Organizer** — created a member event with 5+ attendees
- [ ] Event-specific badges: each LLC event gets its own commemorative badge (e.g. "Ski Trip 2026 🎿")
- [ ] Badges displayed on member profile → Milestones tab

---

### � Event Discovery & Feed

#### Events Page Layout

- [ ] **Default view** — card feed sorted by soonest upcoming event
- [ ] **Tabs** — Upcoming | Past
  - Upcoming: all open/confirmed/active events, RSVP status shown on card if member has RSVPd
  - Past: completed events with summary (attendee count, photos if any, winner for competitions)
- [ ] **Filter bar** — filter by event type: All / LLC Events / Member Events / Competitions
- [ ] **Calendar toggle** — optional calendar view showing events on a monthly grid alongside the card feed
- [ ] **Event card** shows: banner, title, date, type tag, RSVP count / spots left, member's RSVP status (Going / Waitlisted / etc.)

#### Past Events (Scrapbook)

- [ ] Completed events remain visible on the Past tab indefinitely
- [ ] Past event detail page shows: final attendee list, documents (if LLC event), final RSVP count, competition winner
- [ ] Future enhancement: photo gallery per past event — any RSVPed member can upload photos post-event; photos displayed in a scrapbook-style grid on the past event page

#### Recurring Events

- [ ] No built-in recurrence system for v1, but coordinators can **duplicate any event** with one tap
  - Duplicating copies all fields (title, cost items, location, settings) into a new draft with date cleared
  - Saves significant setup time for recurring events like monthly game nights or annual trips

#### Timezone Awareness

- [ ] All event dates/times stored as `TIMESTAMPTZ` (timezone-aware) in the database
- [ ] Event detail page displays the event time in the **event's local timezone** (based on event location) and also shows the member's local time in parentheses if different
  - Example: *"Saturday March 14 at 9:00 AM MST (11:00 AM EST)"*
- [ ] Event creation form includes a timezone picker that defaults to the coordinator's detected timezone

---

### �🔔 Notifications

Push notifications, in-app notifications, and optionally SMS for:

- [ ] New LLC event posted → all active members
- [ ] New member event posted → followers / all members (configurable)
- [ ] RSVP deadline approaching — **7-day warning** (one week out, for travel planning)
- [ ] RSVP deadline approaching — **72-hour warning** (final reminder)
- [ ] Waitlist spot available — "A spot opened up for [Event]. You have 24 hours to claim it."
- [ ] Minimum threshold met — "Event is confirmed! ✅"
- [ ] Minimum not met — "Event auto-cancelled. Refund issued."
- [ ] Event cancelled by admin → all RSVPed members
- [ ] Event rescheduled → all RSVPed members
- [ ] **Document uploaded** → **private, per-member only** — only the specific member whose document was uploaded receives this notification. Never broadcast. Ticket distribution is personal.
- [ ] Someone RSVPs to your event
- [ ] Competition phase change (Phase 1 → 2 → 3 → 4)
- [ ] Voting opens
- [ ] Winner announced
- [ ] Prize deposited
- [ ] Check-in confirmed (on QR scan)
- [ ] CP awarded for attendance

**Notification Channel Preferences:**
- [ ] Members can configure per-channel preferences in **Settings** (a new "Notifications" section on `settings.html`)
  - Push notifications: on/off per category (Events, Competitions, My RSVPs, Check-ins)
  - In-app notifications: always on
  - SMS (if implemented): on/off globally

---

## Database Schema

```sql
-- Core event record
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by      UUID REFERENCES profiles(id),
    event_type      TEXT NOT NULL CHECK (event_type IN ('llc', 'member', 'competition')),
    title           TEXT NOT NULL,
    description     TEXT,
    banner_url      TEXT,
    start_date      TIMESTAMPTZ NOT NULL,
    end_date        TIMESTAMPTZ,
    timezone        TEXT DEFAULT 'America/New_York', -- event's local timezone
    location_text   TEXT,
    location_lat    FLOAT,
    location_lng    FLOAT,
    max_participants INT,
    min_participants INT,
    status          TEXT DEFAULT 'draft',    -- 'draft' | 'open' | 'confirmed' | 'active' | 'completed' | 'cancelled'
    rsvp_deadline   TIMESTAMPTZ,
    rsvp_cost_cents INT DEFAULT 0,           -- 0 = free member event
    llc_cut_pct     FLOAT DEFAULT 0,         -- % of RSVP cost going to LLC fund
    invest_eligible BOOLEAN DEFAULT FALSE,
    location_required BOOLEAN DEFAULT FALSE,
    cost_breakdown_locked BOOLEAN DEFAULT FALSE, -- true once first RSVP payment received
    winner_tier_config JSONB,                -- e.g. [{"place":1,"pct":60},{"place":2,"pct":30},{"place":3,"pct":10}]
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Cost breakdown line items (LLC events)
CREATE TABLE event_cost_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
    label       TEXT NOT NULL,              -- "Airbnb", "Ski Lift Passes"
    category    TEXT,                       -- 'lodging' | 'transport' | 'food' | 'gear' | 'entertainment' | 'other'
    total_cost_cents INT NOT NULL,
    included_in_buyin BOOLEAN DEFAULT TRUE, -- false = out-of-pocket
    avg_per_person_cents INT,               -- for out-of-pocket estimates
    notes       TEXT,
    sort_order  INT DEFAULT 0
);

-- RSVPs
CREATE TABLE event_rsvps (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES profiles(id),
    status      TEXT DEFAULT 'going',       -- 'going' | 'not_going' (no 'maybe' for paid events; 'maybe' only valid when rsvp_cost_cents = 0)
    paid        BOOLEAN DEFAULT FALSE,
    stripe_payment_intent_id TEXT,
    amount_paid_cents INT DEFAULT 0,
    refunded    BOOLEAN DEFAULT FALSE,
    refund_amount_cents INT DEFAULT 0,
    accepted_no_refund_policy BOOLEAN DEFAULT FALSE,  -- logged at checkout
    accepted_no_refund_at TIMESTAMPTZ,               -- timestamp of acceptance
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Check-ins (QR scan attendance)
CREATE TABLE event_checkins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES profiles(id),
    checked_in_by   UUID REFERENCES profiles(id), -- who scanned the QR
    checked_in_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Supporting documents (LLC events)
CREATE TABLE event_documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
    for_user_id UUID REFERENCES profiles(id) NULL, -- NULL = shared with all RSVPs
    doc_type    TEXT,                       -- 'ticket' | 'pass' | 'itinerary' | 'receipt' | 'other'
    label       TEXT NOT NULL,
    file_url    TEXT NOT NULL,
    distributed BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live location during event
CREATE TABLE event_locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES profiles(id),
    latitude    FLOAT NOT NULL,
    longitude   FLOAT NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Competition phases
CREATE TABLE competition_phases (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
    phase_num   INT NOT NULL,               -- 1 | 2 | 3 | 4
    name        TEXT NOT NULL,
    description TEXT,
    starts_at   TIMESTAMPTZ,
    ends_at     TIMESTAMPTZ,
    status      TEXT DEFAULT 'pending'      -- 'pending' | 'active' | 'completed'
);

-- Competition entries
CREATE TABLE competition_entries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES profiles(id),
    title       TEXT,
    description TEXT,
    file_url    TEXT,
    external_url TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Competition votes
CREATE TABLE competition_votes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
    voter_id    UUID REFERENCES profiles(id),
    entry_id    UUID REFERENCES competition_entries(id),
    voted_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, voter_id)             -- one vote per person per competition
);

-- Prize pool contributions
CREATE TABLE prize_pool_contributions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
    contributor_id  UUID REFERENCES profiles(id),
    amount_cents    INT NOT NULL,
    stripe_payment_intent_id TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Waitlist for sold-out LLC events
CREATE TABLE event_waitlist (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES profiles(id),
    position    INT NOT NULL,              -- 1-based queue position
    notified_at TIMESTAMPTZ,              -- when the spot offer was sent
    offer_expires_at TIMESTAMPTZ,         -- 24h window to claim spot
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Co-hosts / sub-coordinators with check-in scanner access
CREATE TABLE event_hosts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES profiles(id),
    role        TEXT DEFAULT 'checkin_staff', -- 'checkin_staff' | 'co_host'
    granted_by  UUID REFERENCES profiles(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);
```

---

## Implementation Phases

### Phase 5A-1 — Member Events (Ship First)
*Lowest complexity, highest engagement, no Stripe needed.*

- [ ] `events.html` page with event list feed (upcoming/past tabs, type filters)
- [ ] Create event form (member event type + timezone picker)
- [ ] Event detail page with attendee list
- [ ] RSVP (going / maybe / not going)
- [ ] Member QR code generated and accessible on profile/settings page
- [ ] Event QR code generation + check-in scanner (creator + co-host access via `event_hosts`)
- [ ] CP award on check-in
- [ ] Push notification on new event

### Phase 5A-2 — LLC Events (Core)
*Paid RSVP, cost breakdown builder, minimum threshold, waitlist.*

- [ ] LLC event creation (admin/coordinator only — requires `coordinator` role on profiles)
- [ ] Cost breakdown builder UI with lock-on-first-payment logic
- [ ] Stripe immediate capture for RSVP buy-in (no deferred auth)
- [ ] No-refund policy acceptance logged at checkout
- [ ] Invest-eligible flag + Fidelity risk disclosure at checkout
- [ ] Minimum threshold + auto-cancel + auto-refund logic
- [ ] Waitlist system (`event_waitlist` table, 24h offer window, auto-advance)
- [ ] Cancellation + rescheduling + 72h grace window + partial non-refundable expense handling
- [ ] Duplicate event tool

### Phase 5A-3 — LLC Events (Documents & Map)
*Enhancements after core LLC flow is working.*

- [ ] Document upload system (per-member + group docs)
- [ ] Member document download page
- [ ] Live event map (Leaflet.js)
- [ ] Location-sharing requirement enforcement

### Phase 5A-4 — Competition Events
*Phase-based competitions, voting, prize pool, multi-winner.*

- [ ] Competition phase builder (Registration → Active → Voting → Results)
- [ ] Entry submission (file upload with size limits, link, text)
- [ ] Entry moderation (admin/coordinator can remove entries)
- [ ] Minimum entries threshold + one-time extension option
- [ ] Voting system (self-voting blocked server-side)
- [ ] Tie handling + winner tier configuration (1st/2nd/3rd split)
- [ ] Prize pool funding (Stripe)
- [ ] Winner announcement + Stripe payout + 1099-NEC flag
- [ ] Competition badge generation

### Phase 5A-5 — Polish & Gamification
*Badges, banners, Credit Points, notifications, settings.*

- [ ] Event-specific badges (per event)
- [ ] Global event achievement badges
- [ ] Member event banners (awarded post-event, shows on profile)
- [ ] Past events scrapbook (photo upload, completed event archive)
- [ ] Full notification system for all event triggers (7-day + 72h reminders, per-member document alerts)
- [ ] Notification channel preferences in Settings (`settings.html` → Notifications section)
- [ ] Admin events dashboard (overview of all events, funds, RSVPs, payouts, 1099 flags)

---

## Edge Cases & Policy Decisions

| Scenario | Decision |
|---|---|
| Member cancels their own RSVP | Spot forfeited with no refund. The freed spot is offered to the #1 waitlisted member (24h to claim). Admin can issue a manual exception refund if warranted. |
| Event cancelled by admin (no non-refundable expenses) | Full auto-refund to all RSVPed members via Stripe. |
| Event cancelled by admin (non-refundable expenses already paid) | Admin enters total non-refundable amount; deducted proportionally from each refund. A public note is posted on the event explaining the deduction. Remainder refunded via Stripe. |
| Event rescheduled | Existing RSVPs preserved. 72h grace window for members to get a full refund if the new date doesn't work. After window, RSVP is locked in. |
| Minimum participants not met by deadline | Auto-cancel + full auto-refund to all RSVPed members. Push notification sent. |
| Cost breakdown edited after first payment received | Blocked — cost breakdown is locked at first payment. Admin can post a note explaining cost changes, but buy-in is immutable. Surplus (if costs come in lower) stays with LLC. |
| Member no-shows (RSVP'd, no check-in) | CP impact configurable per event (organizer sets severity). No financial consequence. |
| Winner of competition doesn't have bank linked | Prize held in LLC account. Winner is prompted to link Stripe Connect. Prize released once linked. |
| Tie in competition votes | Prize split equally among tied winners. If winner tiers are configured (1st/2nd/3rd), tied entries for one tier share that tier's prize percentage equally. |
| Minimum competition entries not met before voting | Phase 2 is extended once (organizer sets extension length). If still not met after extension, competition is cancelled and all prize pool contributions are refunded. |
| Prize pool contributor — event/competition cancelled | Full refund to all prize pool contributors via Stripe. |
| Waitlist spot offer expires (24h window not claimed) | Spot passes to next person on waitlist. Expired offer member stays on waitlist at their original position unless they remove themselves. |
| Event creator's account deactivated | Admin inherits ownership of the event. Event continues normally; admin receives all creator-level notifications for that event going forward. |
| Funds sent to Fidelity + event cancelled | Member was informed at RSVP checkout of this risk. Admin must manually initiate liquidation from Fidelity → BlueVine, then process Stripe refunds. Flagged as a manual reconciliation task in the admin console. Refund may take several business days. |
| Duplicate QR scan (member already checked in) | Show "Already checked in ✅" — no duplicate CP award. |
| Competition entry submitted after deadline | Blocked server-side. No late submissions regardless of UI state. |
| Self-vote in competition | Blocked server-side. Competitor's own entry is excluded from their eligible vote choices. |
| Winner payout over $600 in a calendar year | Admin payout console flags the winner for 1099-NEC reporting. LLC is responsible for filing. System surfaces the alert only — does not auto-file. |

---

**Last Updated:** March 10, 2026
**Status:** 📋 Spec Complete (v2 — reviewed and expanded) — Not Started
