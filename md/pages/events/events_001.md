# 📅 Events Page — Feature Specification

> **Vision:** A full-featured family events hub where the LLC can organize paid, coordinated experiences (trips, outings, retreats) and members can post their own social gatherings — all with RSVPs, check-ins, payments, documents, and gamification baked in.

---

## Overview

The Events page serves two distinct purposes depending on who is creating the event. Both types live on the same page and are visually distinguished, but behave very differently under the hood.

| | **LLC Event** | **Member Event** |
|---|---|---|
| **Created by** | President role (for now) | President role (for now) |
| **Scale** | Large, planned trips & experiences | Birthdays, hangouts, casual meet-ups |
| **Payment** | Yes — RSVP requires Stripe payment | Optional — paid or free (configurable) |
| **Cost breakdown** | Full line-item budget visible on event | None |
| **Documents** | Admin uploads tickets, passes, etc. | None |
| **Minimum ticket** | Yes — auto-cancel if minimum not met | No |
| **Revenue share** | Yes — LLC takes a cut | No |
| **Map** | Live GPS map during event | No |
| **QR check-in** | Yes (dual mode) | Yes (dual mode) |
| **Competition mode** | Optional | Optional |
| **Public page** | Yes — shareable link, no login | Yes — shareable link, no login |
| **Member-only** | Configurable (on/off) | Configurable (on/off) |
| **Raffle / Giveaway** | Optional | Optional |
| **Two-tier info** | Yes — gated details after RSVP | Yes — gated details after RSVP |

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

## Cross-Cutting Features

*These capabilities apply to **all** event types (LLC, Member, and Competition).*

### 🔐 Creation Permissions

> **For now**, only members with the **President** role can create events of any type. This can be expanded later to allow other roles (e.g. Event Coordinator, Admin) to create events.

> **Event Coordinator role (future)** — a new role value (`'coordinator'`) on the `profiles.role` column. Coordinators can create and manage LLC events but otherwise have standard member access. Assigned by admins from the admin dashboard. Disabled for v1.

### 🔗 Public Event Pages & Shareable Links

Every event gets a **public-facing page** with a unique shareable URL. This is the primary way to invite people.

- [x] Each event generates a **shareable link** (e.g. `justicemcnealllc.com/events/?e=justins-birthday`)
- [x] Uses **query parameter** routing (`/events/?e={slug}`) since GitHub Pages doesn't support dynamic routes natively
- [x] The public page is **front-facing** — **no sign-in is required** to view it
- [x] The link can be texted, posted on social media, or shared anywhere
- [x] The event page shows a **public preview tier** of information (see Two-Tier Info below)

#### Member-Only Toggle

- [x] When creating an event, the coordinator can toggle **"Member Only"** on or off
- [x] **Member Only = OFF (default):** Anyone with the link can view the event page and RSVP (pay). No login required. Non-members RSVP by entering their name and email at checkout.
- [x] **Member Only = ON:** The public page shows event basics (title, image, date), but the RSVP button requires the user to sign in as an active member. Non-members see: *"This is a members-only event. Sign in to RSVP."*
- [x] The coordinator sees a preview of the public page before publishing

#### Guest Ticket Retrieval (Non-Members)

- [x] Guests (non-members) who RSVP'd and paid can **retrieve their ticket** by returning to the event link and entering their email
- [x] An **"Already RSVP'd?"** section on the public event page lets them enter their email to look up their record
- [x] If the email matches a paid `event_guest_rsvps` record for that event, the page reveals their QR ticket + gated details
- [x] No account creation needed — purely email-based lookup
- [x] If no match, shows: *"No RSVP found for that email. Check the email you used at checkout."*

#### Two-Tier Information Gating

Event details are split into two tiers:

| | **Pre-RSVP (Public)** | **Post-RSVP (Unlocked)** |
|---|---|---|
| Event title | ✅ | ✅ |
| Cover image / banner | ✅ | ✅ |
| Event date (day only, no time) | ✅ | ✅ |
| Coordinator's chosen description | ✅ | ✅ |
| RSVP price | ✅ | ✅ |
| Giveaway/raffle info (prizes, # winners) | ✅ | ✅ |
| **Exact time** | ❌ | ✅ |
| **Exact location / address** | ❌ | ✅ |
| **QR code (event ticket)** | ❌ | ✅ |
| **Additional coordinator notes** | ❌ | ✅ |
| **Gated documents (if any)** | ❌ | ✅ |

- [x] The coordinator chooses which fields go in each tier when creating the event
- [x] For **free events**, all info can be visible immediately (no gating needed)
- [x] For **paid events**, gated info unlocks after successful Stripe payment
- [x] Gated info also unlocks for events where the event is free but the raffle is paid — after paying the raffle entry fee

#### Flexible Pricing Modes

The coordinator picks one of these pricing modes when creating the event:

| Mode | How it works |
|---|---|
| **Fully Paid** | RSVP costs money. All details + QR code unlock after payment. |
| **Free Event, Paid Raffle** | Event details are visible to all RSVPs (free). But raffle entry + QR ticket require a separate paid "raffle entry" purchase. |
| **Fully Free** | No payment at all. All info visible on RSVP. Raffle (if any) is free entry from attendees. |

- [x] All payments are **non-refundable** (RSVP and raffle entry)
- [x] **Adults only** — each person must RSVP individually. Couples RSVP separately, each paying their own fee. No +1 / guest RSVPs.

#### Stripe Payment Architecture

- [x] Event payments use the **same Stripe account** as member contributions (LLC's BlueVine-connected Stripe account)
- [x] A new **`create-event-checkout`** Supabase Edge Function handles event-specific Checkout Sessions
- [x] Checkout Sessions are **one-time payments** (not subscriptions) with `mode: 'payment'`
- [x] The edge function accepts a `type` param: `'rsvp'` | `'raffle_entry'` | `'competition_entry'` | `'prize_pool'`
- [x] Metadata on the Checkout Session includes: `event_id`, `user_id` (or `guest_email` + `guest_name`), `type`
- [x] On webhook `checkout.session.completed`, the function creates the `event_rsvps` / `event_guest_rsvps` / `event_raffle_entries` record
- [x] Event payments are tagged with `metadata.category = 'event'` so they're distinguishable from monthly contributions in Stripe dashboard
- [x] Funds route directly to the LLC's BlueVine bank via Stripe — no Connect payouts needed

### 👁️ Event Preview

- [x] Before publishing, the coordinator gets a **full preview** of the event as it will appear to the public
- [x] Preview shows both tiers: what the public sees before RSVP, and what they'll see after
- [x] Preview is accessible via a "Preview" button in the creation/edit form
- [x] Preview opens in a modal or overlay styled exactly like the live public page
- [x] No data is saved or published until the coordinator explicitly clicks **"Publish"**
- [x] Draft events are visible only to the creator until published

---

## Feature Specification

---

### 🏔️ LLC Events

#### Creating an LLC Event
> Only users with the **President** role can create LLC events (for now).

**Required Fields:**
- [x] Event title
- [x] Event type (Trip, Outing, Retreat, Dinner, Holiday, Birthday, Custom)
- [x] Description / overview (rich text) — this is the **public-facing** description shown pre-RSVP
- [x] Cover banner image (uploaded or generated)
- [x] Event date(s) — single day or multi-day range
- [x] Location — text address + optional map pin
- [x] Max participant count (hard cap — RSVP closes when full)
- [x] RSVP deadline — defaults to 3 months before event date

**Visibility & Pricing Settings:**
- [x] **Member-only toggle** — restrict RSVP to signed-in active members (default: off)
- [x] **Pricing mode** — Fully Paid / Free Event, Paid Raffle / Fully Free
- [x] **RSVP price** (if paid) — flat amount in dollars
- [x] **Raffle entry price** (if "Free Event, Paid Raffle" mode)
- [x] **Gated details** — coordinator marks which fields are hidden until post-RSVP (time, location, notes, etc.)

**Gated Details (post-RSVP content):**
- [x] Exact event time
- [x] Exact address / location details
- [x] Coordinator private notes (additional info for attendees only)
- [x] Attached documents (PDFs, images)

**Giveaway / Raffle Setup (optional):**
- [x] Enable raffle toggle
- [x] Number of winners (e.g. 1st place, 2nd place)
- [x] Prize description per tier (text, e.g. "$50 cash", "Gift basket")
- [x] Raffle mode: **Digital** (system picks from checked-in attendees) or **Physical** (coordinator runs manually, system just tracks attendance)
- [x] If digital: system auto-selects winner(s) from checked-in attendees and sends notifications
- [x] Raffle draw timing: coordinator triggers manually ("Draw Winner" button) or auto-draw at event end time

**Cost Breakdown Builder:**
The event coordinator fills out a detailed cost breakdown table. Each line item has:
- [x] Line item name (e.g. "Airbnb", "Ski Lift Passes", "Car Rental")
- [x] Category (Lodging, Transportation, Food, Gear, Entertainment, Other)
- [x] Total cost for the group
- [x] Whether it's **included in buy-in** or **out-of-pocket** (member pays separately)
- [x] Notes / source link (e.g. "Based on Expedia quote for 4 pax, March 15")
- [x] Optional: "Average per person" for out-of-pocket items so members know what to budget

**Auto-calculated fields:**
- [x] **Total included cost** = sum of all "included in buy-in" line items
- [x] **Buy-in (RSVP cost)** = Total included cost ÷ Min participant count (uses min_participants as divisor, not max)
- [x] **Estimated out-of-pocket** = sum of average per-person out-of-pocket items
- [x] **Grand total per person** = Buy-in + Out-of-pocket estimate

**Cost Breakdown Lock Policy:**
- [x] Once the **first RSVP payment is received**, the cost breakdown is **locked** — no line items can be added, edited, or removed
- [x] If actual costs come in lower than estimated, the difference is **retained by the LLC** (not refunded to members)
- [x] Admin can post a note on the event explaining any cost variance, but the buy-in amount is final once payments begin
- [x] If admin needs to update costs before any payments are received, the breakdown is freely editable

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

- [x] Members click **"RSVP — $800"** button on the event page
- [x] Stripe Checkout opens for the buy-in amount
- [x] On success → member is added to the confirmed RSVP list
- [x] RSVP list shows: confirmed members with avatars, open spots remaining
- [x] RSVP closes automatically when: (a) deadline passes, or (b) max participants reached
- [x] **RSVP is binary for paid events** — no "Maybe" option. You're either paid in (confirmed) or not. "Maybe" is only available on free member events.
- [x] **No +1 / guest RSVPs** — each RSVP is tied to one member account. If someone wants to attend, they must be an active contributing member and RSVP themselves. One spot per person, always.

**Waitlist:**
- [x] When all spots are filled, members can join a **waitlist** (no payment required to join the waitlist)
- [x] If a spot opens (coordinator-raised max, or a forfeited spot), the first person on the waitlist is notified via push notification with a **24-hour window** to complete their RSVP payment
- [x] If they don't pay within 24 hours, the spot passes to the next waitlisted member
- [x] Waitlist position is shown to the member: "You're #3 on the waitlist"
- [x] **No RSVP transfers** — if a confirmed member can no longer attend, they forfeit their spot and payment with no refund. The freed spot goes to the next waitlisted member who pays the full current buy-in price.

- [x] **No-refund disclaimer** displayed prominently before checkout:
  > *"By completing your RSVP, you agree that your payment is non-refundable unless this event is cancelled or rescheduled by LLC staff. Cancelling your own RSVP forfeits your payment. See Cancellation Policy below."*
- [x] Member acceptance of the no-refund policy is **logged** at checkout: `accepted_no_refund_policy = true`, `accepted_no_refund_at = NOW()` stored on the RSVP record

**Payment Timing:**
- [x] Payment is **captured immediately** at RSVP time — funds are taken at Stripe checkout, not authorized-and-held
- [x] This prevents card declines months later for far-future events
- [x] No deferred capture regardless of how far out the event is

**Payment Routing:**
- [x] All RSVP funds collected to the LLC BlueVine business bank account via Stripe
- [x] If the event is **scheduled far in advance** (>6 months), admin has option to flag the event pool as "invest-eligible" — coordinator can move collected funds to Fidelity to earn interest until event spend begins
- [x] Interest earned on event funds stays in the LLC general fund (not returned to members)
- [x] **Invest-eligible disclosure** — if a member RSVPs to an invest-eligible event, a prominent notice is shown at checkout: *"This event's funds may be held in a Fidelity investment account. If this event is cancelled while funds are invested, your refund may take several business days while funds are liquidated and transferred back before Stripe can issue the return."* Member must explicitly acknowledge this before completing RSVP.

**LLC Revenue Share:**
- [x] When creating the event, coordinator can set an optional **LLC contribution percentage** (e.g. 5%)
- [x] This % is added to the buy-in automatically: Buy-in = (Included Costs ÷ Max Participants) + LLC cut
- [x] The LLC cut is labeled on the event page: *"Includes 5% LLC community contribution"*
- [x] These funds go to the LLC general fund after the event closes/completes

#### Minimum Threshold

- [x] Event coordinator sets a **minimum participant count** required for the event to proceed
- [x] Example: "Minimum 3 of 6 spots must be filled by Jan 15 or event auto-cancels"
- [x] A progress bar on the event page shows current RSVP count vs. minimum needed
- [x] If minimum is not met by the deadline → **auto-cancel triggers**:
  - Event status changes to "Cancelled — Minimum Not Met"
  - All RSVP payments are automatically refunded via Stripe
  - Push notification + email sent to all RSVPed members
- [x] If minimum is met → event is **confirmed** and RSVP remains open until max is reached or deadline hits

#### Cancellation & Rescheduling (Admin)

- [x] Admin can **cancel** a confirmed event at any time
  - If no non-refundable group expenses have been paid: all RSVP members receive a full Stripe refund
  - If the coordinator has already paid for **non-refundable group items** (e.g. Airbnb deposit, non-refundable tickets): admin enters the total non-refundable amount, which is deducted proportionally from each member's refund. A note is posted on the event explaining the deduction. The remainder is refunded via Stripe.
  - Push notification: "❌ [Event] has been cancelled. Your refund of $X has been issued."
- [x] Admin can **reschedule** an event
  - New date/time shown on event page
  - Existing RSVPs preserved (not auto-refunded)
  - Push notification: "📅 [Event] has been rescheduled to [New Date]. Tap to view details."
  - Members have a **reschedule grace window** (e.g. 72 hours) to cancel their RSVP and receive a full refund if the new date doesn't work for them
- [x] Admin can **issue a manual refund** to specific members at any time (e.g. coordinator error, member hardship)

#### Supporting Documents

After the RSVP deadline closes, the event coordinator researches and purchases items (tickets, passes, etc.) and uploads documents to the event:

- [x] Admin uploads documents per item (PDF, image, or file)
- [x] Document types:
  - **Plane Ticket** — uploaded per-member (coordinator sees each RSVPed member's name and uploads their specific ticket)
  - **Group Ticket / Pass** — single document shared with all RSVPed members
  - **Itinerary** — PDF version of the full trip plan
  - **Receipt** — proof of purchase for group expenses
  - **Other**
- [x] RSVPed members can **download their documents** from the event page after upload
- [x] Members can print or present documents as needed (e.g. boarding pass at airport)
- [x] Non-RSVPed members cannot access documents
- [x] Admin can mark each document as **"Distributed"** once uploaded

**Supported vs. Out-of-Pocket Transportation:**
- [x] When creating the event, coordinator marks plane tickets as either:
  - **"LLC Provides"** — tickets are purchased and uploaded to the portal
  - **"Self-Arranged"** — members buy their own; coordinator adds an "avg. cost estimate" for budgeting
- [x] If self-arranged, the event page shows a note: *"✈️ Members are responsible for their own travel to [City]. Estimated round-trip cost: ~$320."*

#### Event Requirements (RSVP Gating)

Certain events can require members to meet conditions before or during the event:

- [x] **Location sharing required** — member must have location sharing enabled for the duration of the event
  - Checked at check-in via QR scan
  - If not enabled, member is prompted to enable it before the QR scan completes
- [ ] **Active subscription required** — only active contributors can RSVP
- [ ] **Custom requirements** — coordinator can add text requirements (e.g. "Must be 18+", "Bring valid ID")
- [x] Requirements listed clearly on the event page before RSVP button

#### Live Event Map

During an active event, a dedicated map is available to all RSVPed members:

- [x] Opt-in only — members choose to share location during that specific event
- [x] Map uses Leaflet.js + OpenStreetMap (free)
- [x] Member's initials pinned to their current GPS position (green circle for self, indigo for others)
- [x] **Powered by Supabase Realtime** — location pins update in real time via `event_locations` table subscription (no polling needed; pins move live as members move)
- [x] If a member **opts out mid-event**, their pin disappears from the map within the next Realtime update cycle — no stale last-known position lingers
- [x] **Privacy banner** — while a member is actively sharing location for an event, a persistent banner displays on their screen: *"You're sharing your location for [Event Name]. Tap to stop."* So they always know and can revoke instantly.
- [x] Only visible to RSVPed members (RLS enforced)
- [x] Admin can see all opted-in members on a single view
- [x] Map accessible from the event detail page during event window (event start → event end + 24h)
- [x] Database: `event_locations` table (event_id, user_id, latitude, longitude, sharing_active, updated_at)

---

### 🎉 Member Events

> Created by the President (for now). Social events with optional paid RSVP and raffle capabilities.

#### Creating a Member Event

- [x] Event title
- [x] Description (public-facing, pre-RSVP)
- [x] Cover banner image (optional upload, or auto-generated colored banner)
- [x] Date and time
- [x] Location (text address)
- [x] Max attendees (optional)
- [x] Event type: Party, Hangout, Birthday, Game Night, Cookout, Other
- [x] **Member-only toggle** (default: off)
- [x] **Pricing mode**: Fully Free / Fully Paid / Free Event, Paid Raffle
- [x] **Gated details** (time, location, coordinator notes) — hidden until post-RSVP if paid
- [x] **Giveaway / Raffle setup** (optional — see Raffle & Giveaway section)
- [x] **Event preview** before publishing

#### RSVP

- [x] **Free events:** Members tap **"RSVP"** → added to the Going list. RSVP options: **Going** / **Maybe** / **Not Going**
- [x] **Paid events:** Members tap **"RSVP — $XX"** → Stripe Checkout for the amount. On success, added to confirmed list. No "Maybe" option for paid.
- [x] **Free Event + Paid Raffle:** RSVP is free (Going/Maybe/Not Going). Raffle entry is a separate paid button.
- [x] Attendee list visible on event page with member avatars
- [x] Event creator gets push notification when someone RSVPs (via `on_rsvp_notify_creator` trigger)
- [x] **Non-members (public events):** Enter name + email at checkout. Receive a confirmation page with their QR ticket. No account required.
- [x] All payments are **non-refundable**
- [x] Each person RSVPs individually — no +1, no couples, adults only

#### QR Code Check-In (Dual Mode)

The coordinator picks one of **two check-in modes** when creating the event:

| Mode | How It Works | Best For |
|---|---|---|
| **Attendee Ticket Mode** | Each RSVP'd attendee gets a personal QR code (their "ticket"). Coordinator/staff **scans attendee's QR** at the door. | Smaller events, VIP feel, attendees show their phone like a concert ticket |
| **Venue Scan Mode** | Coordinator displays a **single event QR code** on a screen/printout at the venue. Attendees **scan the venue QR** with their phone to check in. | Larger events, less staff needed, self-service check-in |

##### Attendee Ticket Mode
- [x] On successful RSVP (or payment), the attendee receives a **unique QR code** on their confirmation page and in their event details
- [x] For **members**: QR is accessible from their profile page, settings, and the event detail page
- [x] For **non-members (public events)**: QR is shown on the payment confirmation page + accessible via email ticket lookup
- [x] Check-in staff opens the **scanner** on the event page and scans each attendee's QR
- [x] The QR encodes: `event_id + user_id (or guest_token)` signed with an HMAC to prevent spoofing

##### Venue Scan Mode
- [x] The event has a single **event-level QR code** generated at creation
- [x] Coordinator can display this QR on any screen, projector, or print it out at the entrance
- [x] Attendees scan the QR with their phone camera → opens a check-in page
- [x] **Members** are auto-identified by their session and checked in instantly
- [x] **Non-members (public events)** enter their RSVP confirmation code or email to match their ticket
- [x] Check-in page shows: "✅ Welcome, [Name]! You're checked in."

##### Common to Both Modes
- [x] **Scanner access** — the QR scanner is visible only to: the event creator, admins, and any **sub-coordinators** explicitly granted check-in access
  - Coordinator can designate additional people as check-in staff from the event management panel
  - Non-designated people never see the scanner UI
- [x] Uses `qrcode.js` to generate, `jsQR` to scan via camera
- [ ] QR codes are **only valid during the event window** (event start → event end + 24h) — expired codes return a rejection message
- [x] Successful scan → attendee marked **"Checked in ✅"** on the event attendee list
- [x] Duplicate scans show **"Already checked in ✅"** — no double-counting
- [ ] Attendance data is recorded and feeds into **Credit Points** (for members):
  - RSVP'd and showed up → +CP bonus
  - RSVP'd and no-showed → potential CP impact (configurable per event)
  - Attended without RSVP → still gets check-in CP (if walk-ins allowed)
- [x] **Attendance count is live** — coordinator sees a real-time counter of checked-in attendees
- [x] Database: `event_checkins` (event_id, user_id, guest_token, checked_in_at, checked_in_by, mode)

---

### 🎰 Raffle & Giveaway System

> Any event (LLC or Member) can optionally include a raffle/giveaway. This is separate from the Competition system — raffles are luck-based draws from attendees, not skill-based contests.

#### Raffle Configuration (at Event Creation)

- [x] **Enable Raffle** toggle — off by default
- [x] **Raffle type:**
  - **Digital Raffle** — the system randomly picks winner(s) from checked-in attendees
  - **Physical Raffle** — coordinator runs the draw manually at the event; the system only tracks attendance for the pool
- [x] **Number of winners** — configurable (e.g. 1st place, 2nd place, 3rd place)
- [x] **Prize description per tier** — text field (e.g. "1st Place: $100 cash", "2nd Place: $50 gift card")
- [x] **Raffle entry requirement:**
  - Automatically entered by checking in (free raffle)
  - Requires separate paid raffle entry ("Free Event, Paid Raffle" pricing mode)
  - Included with paid RSVP ("Fully Paid" mode — RSVP + raffle bundled)
- [x] **Draw trigger:**
  - **Manual** — coordinator presses a "Draw Winner" button at the event
  - **Auto** — system draws automatically at the event end time

#### How the Digital Raffle Works

1. Attendees check in at the event (via QR scan, either mode)
2. The system builds a **raffle pool** of all checked-in attendees who are eligible (RSVP'd + checked in + raffle entry paid if applicable)
3. When the coordinator taps **"Draw Winner"** (or auto-draw triggers):
   - System uses a **cryptographically random** selection (`crypto.getRandomValues()`) to pick winner(s)
   - Winners are selected sequentially: 1st place drawn first, then 2nd place from remaining pool, etc.
   - A **celebration animation** plays on the coordinator's screen (Lottie confetti) with the winner's name
4. **Notifications are sent immediately:**
   - 🏆 **To the winner(s):** *"Congrats! You just won [1st/2nd place] in the [Event Name] raffle! Prize: [description]"*
   - 📣 **To all checked-in attendees:** *"[Winner Name] just won the [Event Name] raffle! 🎉"*
   - Notifications sent via **push notification** (for users with the web app installed)
   - Also visible as an **in-app notification** on the notifications page
5. Winners are displayed on the event detail page permanently: *"🏆 Raffle Winners: 1st — [Name], 2nd — [Name]"*

#### Raffle on the Public Event Page

- [x] If an event has a raffle configured, the **public page (pre-RSVP)** shows:
  - 🎰 **"Raffle / Giveaway"** section
  - Number of winners (e.g. "2 winners will be drawn")
  - Prize descriptions (e.g. "1st Place: $100 cash • 2nd Place: $50 gift card")
  - Entry requirement (e.g. "Included with RSVP" or "Raffle entry: $10")
- [x] This incentivizes people to RSVP — they can see what they could win before paying

#### Physical Raffle Support

- [ ] If raffle type is **Physical**, the coordinator runs the draw manually at the event
- [ ] The system provides:
  - A **printable attendance list** of all checked-in attendees (downloadable from the event management page)
  - Coordinator uses this list for their physical draw method (balls, names in a hat, etc.)
- [ ] Coordinator can optionally **record the winner(s)** in the system after the draw for record-keeping and notifications
- [ ] If recorded, the same winner notifications are sent to attendees

#### Raffle Edge Cases

- [x] **Not enough attendees for prizes** — if fewer people check in than there are prize tiers, system only awards to the people present (e.g. 2 winners configured but only 1 checked in = that person wins 1st, 2nd is void)
- [x] **Winner not present (digital)** — impossible, because the pool is only checked-in attendees
- [x] **Raffle entry paid but attendee doesn't check in** — they are NOT in the raffle pool. No refund. Raffle entry is non-refundable.
- [x] **Coordinator wants to re-draw** — not allowed once drawn. Results are final. (Prevents manipulation.)

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

- [x] "Join as Competitor" button on the event page
- [x] Optional entry fee (set by organizer — goes to prize pool)
- [x] Even without entry fee, a **Community Prize Pool** can be funded:
  - Any member (including non-competitors) can contribute to the prize pool
  - Prize pool total displayed on event page with a progress bar
  - Contributions go through Stripe to LLC account
- [x] Competitor list visible: "X competitors registered"
- [x] Phase stays open until organizer-set registration deadline

#### Phase 2 — Active Competition

- [x] Phase opens automatically on the set date
- [x] Competitors submit their entry:
  - File upload (image, PDF, video) — **file size limits enforced**: max 10MB for images/PDFs, max 50MB for video
  - External link
  - Text / description
- [x] Entries can be kept **private until voting phase** (organizer choice) or **visible immediately**
- [x] Countdown timer showing time remaining in competition phase
- [x] Late submissions blocked after deadline (server-side enforced, not just UI)
- [x] **Entry moderation** — admins and coordinators can remove any submitted entry before voting opens (spam, inappropriate content, rule violation). Removed entrant is notified with a reason.
- [x] **Minimum entries threshold** — coordinator sets a minimum number of entries required for voting to begin. If fewer entries are submitted by the deadline, the competition phase is extended once (organizer sets extension window) or cancelled with full prize pool refund.

#### Phase 3 — Voting

- [x] All submissions displayed in an anonymous (or named) gallery
- [x] Each eligible voter gets **one vote** (ranked-choice or simple pick, organizer choice)
- [x] **Self-voting is blocked** — competitors cannot vote for their own entry (enforced server-side via `check_no_self_vote()` trigger)
- [x] Eligible voters: all RSVPed members, or all active members, or competitors-only (organizer sets)
- [x] Live vote tally optionally shown (or hidden until results)
- [x] Voting closes on organizer-set deadline

#### Phase 4 — Results

- [x] Winner(s) announced on event page with celebration animation (Lottie)
- [x] Push notification to all event participants + followers: "🏆 [Name] won [Event]!"
- [x] **Tie handling** — in the event of a tie, the prize is **split equally** among tied winners. Organizer can optionally configure multiple winner tiers (1st/2nd/3rd) with a percentage split (e.g. 60% / 30% / 10%) when setting up the competition.
- [x] Prize distribution:
  - Winner(s) receive prize pool via Stripe payout to their connected bank
  - Organizer can set a **house percentage** (e.g. 10% goes to LLC fund before payout)
  - Receipts visible on event page and in admin payout console
  - **IRS 1099-NEC flag** — if any single winner receives $600 or more in prize money in a calendar year, the admin payout console flags this for 1099-NEC reporting. The LLC is responsible for filing; the system surfaces the alert, it does not auto-file.
- [x] **Rewards:**
  - Winner receives an **exclusive event badge** (auto-generated or admin-designed)
  - Participation badge for all competitors who submitted
  - CP bonus for participating, voting, and winning

---

### 🎨 Visual Features (All Event Types)

#### Event Banners

- [x] Every event has a full-width cover banner
- [x] Sources:
  - Admin/member uploads a custom image
  - Auto-generated color gradient banner with event title + emoji
  - Admin can upload a designed banner for LLC events
- [x] Banners appear on the event card in the events list and as a hero on the event detail page
- [x] Special events can award a **member banner** to participants that shows on their profile (like milestone cover banners) — via `award_event_banner_to_attendees()` function + admin dashboard UI

#### Badges for Events

- [x] **Participant Badge** — attended any LLC event (auto-awarded on check-in via `on_event_checkin_badge` trigger)
- [x] **Trip Veteran** — attended 3+ LLC trips (auto-awarded on check-in)
- [x] **Never Miss a Beat** — RSVP'd and checked in to 5+ events (auto-awarded on check-in)
- [x] **Competition Winner** — won a competition event (auto-awarded via `on_comp_winner_badge` trigger)
- [x] **Top Competitor** — placed top 3 in a competition (auto-awarded via `on_comp_winner_badge` trigger)
- [x] **Fundraiser Champion** — contributed to a prize pool (auto-awarded via `on_prize_pool_badge` trigger)
- [x] **Event Organizer** — created a member event with 5+ attendees (auto-awarded via `on_event_complete_badge` trigger)
- [ ] Event-specific badges: each LLC event gets its own commemorative badge (e.g. "Ski Trip 2026 🎿") — no per-event badge creation mechanism yet
- [x] Badges displayed on member profile → Milestones tab

---

### � Event Discovery & Feed

#### Events Page Layout

- [x] **Default view** — card feed sorted by soonest upcoming event
- [x] **Tabs** — Upcoming | Past
  - Upcoming: all open/confirmed/active events, RSVP status shown on card if member has RSVPd
  - Past: completed events with summary (attendee count, photos if any, winner for competitions)
- [x] **Filter bar** — filter by event type: All / LLC Events / Member Events / Competitions
- [ ] **Calendar toggle** — optional calendar view showing events on a monthly grid alongside the card feed
- [x] **Event card** shows: banner, title, date, type tag, RSVP count / spots left, member's RSVP status (Going / Waitlisted / etc.)

#### Past Events (Scrapbook)

- [x] Completed events remain visible on the Past tab indefinitely
- [x] Past event detail page shows: final attendee list, documents (if LLC event), final RSVP count, competition winner
- [x] Photo gallery per past event — any RSVPed member can upload photos post-event; photos displayed in a scrapbook-style grid on the past event page (with lightbox viewer, drag & drop upload, caption support)

#### Recurring Events

- [x] No built-in recurrence system for v1, but coordinators can **duplicate any event** with one tap
  - Duplicating copies all fields (title, cost items, location, settings) into a new draft with date cleared
  - Saves significant setup time for recurring events like monthly game nights or annual trips

#### Timezone Awareness

- [x] All event dates/times stored as `TIMESTAMPTZ` (timezone-aware) in the database
- [ ] Event detail page displays the event time in the **event's local timezone** (based on event location) and also shows the member's local time in parentheses if different
  - Example: *"Saturday March 14 at 9:00 AM MST (11:00 AM EST)"*
- [x] Event creation form includes a timezone picker that defaults to the coordinator's detected timezone

---

### �🔔 Notifications

Push notifications, in-app notifications, and optionally SMS for:

**Event Lifecycle:**
- [ ] New event published → **posted to the member feed** automatically (feed card with banner, title, date, RSVP button)
- [x] New LLC event posted → all active members (via `on_event_published` trigger)
- [x] New member event posted → all members (via `on_event_published` trigger)
- [x] **Event reminder — 7-day warning** (one week out) — via `send-event-reminders` edge function
- [x] **Event reminder — 72-hour warning** (final reminder) — via `send-event-reminders` edge function
- [x] **Event reminder — Day-of** (morning of the event: "[Event] is today!") — via `send-event-reminders` edge function
- [x] RSVP deadline approaching — **24-hour warning** (reminds members who haven't RSVP'd) — via `send-event-reminders` edge function
- [x] Waitlist spot available — "A spot opened up for [Event]. You have 24 hours to claim it." — via `manage-event-waitlist` edge function
- [ ] Minimum threshold met — "Event is confirmed! ✅"
- [ ] Minimum not met — "Event auto-cancelled. Refund issued."
- [ ] Event cancelled by admin → all RSVPed members (push notification)
- [ ] Event rescheduled → all RSVPed members (push notification)
- [x] **Document uploaded** → **private, per-member only** — only the specific member whose document was uploaded receives this notification (via `on_document_notify_member` trigger)
- [x] Someone RSVPs to your event → event creator notified (via `on_rsvp_notify_creator` trigger)

**Raffle / Giveaway:**
- [x] 🏆 **Raffle winner** → winner notified: *"Congrats! You won [place] in the [Event] raffle! Prize: [description]"* (via `on_raffle_winner_notify` trigger)
- [x] 📣 **Raffle drawn** → all checked-in attendees notified: *"[Winner] just won the [Event] raffle! 🎉"* (via `on_raffle_winner_notify` trigger)
- [x] If multiple winners, one notification per draw (1st place, then 2nd place)

**Competition:**
- [x] Competition phase change (Phase 1 → 2 → 3 → 4) — via `on_comp_phase_notify` trigger
- [x] Voting opens (triggered by phase change to Phase 3)
- [x] Winner announced (via `on_comp_winner_badge` trigger)
- [ ] Prize deposited

**Check-in:**
- [x] Check-in confirmed (on QR scan) — via `on_event_checkin_badge` trigger (creates notification)
- [ ] CP awarded for attendance

**Notification Channel Preferences:**
- [x] Members can configure per-channel preferences in **Settings** (a new "Notifications" section on `settings.html`)
  - **Event Notifications**: New events posted, event reminders, RSVP deadlines (on/off)
  - **My RSVPs**: Updates to events I've RSVP'd to (cancellations, reschedules, documents) (on/off)
  - **Raffle**: Raffle results and winner announcements (on/off)
  - **Competitions**: Phase changes, voting, results (on/off)
  - **Check-ins**: QR scan confirmations, CP awards (on/off)
  - Push notifications: on/off per category
  - In-app notifications: always on
  - SMS (if implemented): on/off globally

---

## Database Schema

> 20 tables across migrations 063–077. Schema below reflects the **final consolidated state** after all migrations are applied.

```sql
-- ═══════════════════════════════════════════════════════════════
-- 1. Core event record (063, altered in 064–068, 072, 076)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by      UUID REFERENCES profiles(id),
    event_type      TEXT NOT NULL CHECK (event_type IN ('llc', 'member', 'competition')),
    title           TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    description     TEXT,
    gated_notes     TEXT,
    banner_url      TEXT,
    start_date      TIMESTAMPTZ NOT NULL,
    end_date        TIMESTAMPTZ,
    timezone        TEXT DEFAULT 'America/New_York',
    location_text   TEXT,
    location_lat    FLOAT,
    location_lng    FLOAT,
    max_participants INT,
    min_participants INT,
    status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','open','confirmed','active','completed','cancelled')),
    rsvp_deadline   TIMESTAMPTZ,

    -- Visibility & pricing
    member_only     BOOLEAN DEFAULT FALSE,
    pricing_mode    TEXT DEFAULT 'free' CHECK (pricing_mode IN ('free','paid','free_paid_raffle')),
    rsvp_cost_cents INT DEFAULT 0,
    raffle_entry_cost_cents INT DEFAULT 0,

    -- Info gating
    gate_time       BOOLEAN DEFAULT FALSE,
    gate_location   BOOLEAN DEFAULT FALSE,
    gate_notes      BOOLEAN DEFAULT FALSE,

    -- Check-in
    checkin_mode    TEXT DEFAULT 'attendee_ticket' CHECK (checkin_mode IN ('attendee_ticket','venue_scan')),
    venue_qr_token  TEXT UNIQUE,                            -- (added 064) venue-scan mode token

    -- LLC-specific
    llc_cut_pct     FLOAT DEFAULT 0,
    invest_eligible BOOLEAN DEFAULT FALSE,
    location_required BOOLEAN DEFAULT FALSE,
    cost_breakdown_locked BOOLEAN DEFAULT FALSE,
    cost_breakdown  JSONB,                                  -- (added 066) snapshot of cost items
    non_refundable_expenses_cents INT DEFAULT 0,            -- (added 066) for proportional refund deductions
    show_cost_breakdown BOOLEAN DEFAULT TRUE,               -- (added 072) toggle visibility to attendees

    -- Cancellation / Rescheduling
    rescheduled_at       TIMESTAMPTZ,                       -- (added 066)
    grace_window_end     TIMESTAMPTZ,                       -- (added 066) 72h refund grace
    original_start_date  TIMESTAMPTZ,                       -- (added 066) saved on reschedule
    cancellation_note    TEXT,                               -- (added 066)

    -- Transportation
    transportation_mode           TEXT DEFAULT 'llc_provides' CHECK (transportation_mode IN ('llc_provides','self_arranged')),  -- (added 067)
    transportation_estimate_cents INT,                       -- (added 067)

    -- Feature toggles
    rsvp_enabled          BOOLEAN DEFAULT TRUE,             -- (added 076)
    checkin_enabled        BOOLEAN DEFAULT TRUE,            -- (added 076)
    transportation_enabled BOOLEAN DEFAULT TRUE,            -- (added 076)

    -- Raffle / giveaway
    raffle_enabled      BOOLEAN DEFAULT FALSE,
    raffle_type         TEXT CHECK (raffle_type IN ('digital','physical')),
    raffle_draw_trigger TEXT DEFAULT 'manual' CHECK (raffle_draw_trigger IN ('manual','auto')),
    raffle_prizes       JSONB,                              -- [{"place":1,"description":"$100 cash"}, ...]
    raffle_winner_count INT DEFAULT 1,                      -- (added 065)

    -- Competition
    winner_tier_config    JSONB,
    competition_config    JSONB,                             -- (added 068) phase definitions
    total_prize_pool_cents INT DEFAULT 0,                   -- (added 068)

    -- Metadata
    category    TEXT DEFAULT 'other',                        -- (added 064)
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 2. RSVPs — members (063, altered 066)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE event_rsvps (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES profiles(id),
    status      TEXT DEFAULT 'going' CHECK (status IN ('going','maybe','not_going')),
    paid        BOOLEAN DEFAULT FALSE,
    stripe_payment_intent_id TEXT,
    amount_paid_cents INT DEFAULT 0,
    refunded    BOOLEAN DEFAULT FALSE,
    refund_amount_cents INT DEFAULT 0,
    accepted_no_refund_policy BOOLEAN DEFAULT FALSE,
    accepted_no_refund_at TIMESTAMPTZ,
    qr_token    TEXT DEFAULT encode(gen_random_bytes(16), 'hex') UNIQUE,
    invest_eligible_acknowledged    BOOLEAN DEFAULT FALSE,  -- (added 066)
    invest_eligible_acknowledged_at TIMESTAMPTZ,            -- (added 066)
    grace_refund_eligible           BOOLEAN DEFAULT FALSE,  -- (added 066)
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 3. Guest RSVPs — non-members on public events (065)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE event_guest_rsvps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    guest_name      TEXT NOT NULL,
    guest_email     TEXT NOT NULL,
    guest_token     TEXT UNIQUE NOT NULL,
    status          TEXT DEFAULT 'going',
    paid            BOOLEAN DEFAULT FALSE,
    stripe_payment_intent_id TEXT,
    amount_paid_cents INT DEFAULT 0,
    accepted_no_refund_policy BOOLEAN DEFAULT FALSE,
    accepted_no_refund_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, guest_email)
);

-- ═══════════════════════════════════════════════════════════════
-- 4. Check-ins — QR scan attendance, members + guests (063)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE event_checkins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES profiles(id) NULL,
    guest_token     TEXT NULL,
    checked_in_by   UUID REFERENCES profiles(id) NULL,
    checkin_mode    TEXT DEFAULT 'attendee_ticket' CHECK (checkin_mode IN ('attendee_ticket','venue_scan')),
    checked_in_at   TIMESTAMPTZ DEFAULT NOW()
    -- Partial UNIQUE: (event_id, user_id) WHERE user_id IS NOT NULL
    -- Partial UNIQUE: (event_id, guest_token) WHERE guest_token IS NOT NULL
);

-- ═══════════════════════════════════════════════════════════════
-- 5. Co-hosts / sub-coordinators (063)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE event_hosts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES profiles(id),
    role        TEXT DEFAULT 'checkin_staff' CHECK (role IN ('checkin_staff','co_host')),
    granted_by  UUID REFERENCES profiles(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 6. Raffle entries (064)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE event_raffle_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES profiles(id) NULL,
    guest_token     TEXT NULL,
    paid            BOOLEAN DEFAULT FALSE,
    stripe_payment_intent_id TEXT,
    amount_paid_cents INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id),
    UNIQUE(event_id, guest_token)
);

-- ═══════════════════════════════════════════════════════════════
-- 7. Raffle winners (064)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE event_raffle_winners (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
    place           INT NOT NULL,
    user_id         UUID REFERENCES profiles(id) NULL,
    guest_token     TEXT NULL,
    prize_description TEXT,
    drawn_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, place)
);

-- ═══════════════════════════════════════════════════════════════
-- 8. Notification preferences (065)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE notification_preferences (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    event_new            BOOLEAN DEFAULT TRUE,
    event_reminders      BOOLEAN DEFAULT TRUE,
    event_rsvp_updates   BOOLEAN DEFAULT TRUE,
    event_rsvp_deadline  BOOLEAN DEFAULT TRUE,
    raffle_results       BOOLEAN DEFAULT TRUE,
    competition_updates  BOOLEAN DEFAULT TRUE,
    checkin_alerts       BOOLEAN DEFAULT TRUE,
    push_enabled         BOOLEAN DEFAULT TRUE,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 9. Cost breakdown line items — LLC events (066)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE event_cost_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,              -- "Airbnb", "Ski Lift Passes"
    category    TEXT NOT NULL CHECK (category IN ('lodging','transportation','food','gear','entertainment','other')),
    total_cost_cents INT NOT NULL DEFAULT 0,
    included_in_buyin BOOLEAN DEFAULT TRUE,
    avg_per_person_cents INT DEFAULT 0,
    notes       TEXT,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 10. Waitlist — sold-out LLC events (066)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE event_waitlist (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES profiles(id),
    position    INT NOT NULL,
    status      TEXT DEFAULT 'waiting' CHECK (status IN ('waiting','offered','expired','claimed','removed')),
    offered_at       TIMESTAMPTZ,
    offer_expires_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 11. Refund records (066)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE event_refunds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES profiles(id),
    guest_email     TEXT,
    original_amount_cents INT NOT NULL,
    refund_amount_cents   INT NOT NULL,
    deduction_cents       INT DEFAULT 0,
    reason          TEXT NOT NULL CHECK (reason IN ('event_cancelled','min_not_met','reschedule_grace','manual','admin_override')),
    stripe_refund_id          TEXT,
    stripe_payment_intent_id  TEXT,
    status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','processed','failed')),
    notes           TEXT,
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 12. Supporting documents — LLC events (067)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE event_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    uploaded_by     UUID NOT NULL REFERENCES profiles(id),
    target_user_id  UUID REFERENCES profiles(id),  -- NULL = group doc shared with all
    doc_type        TEXT NOT NULL CHECK (doc_type IN ('plane_ticket','group_ticket','itinerary','receipt','other')),
    label           TEXT NOT NULL,
    file_path       TEXT NOT NULL,          -- Supabase Storage path
    file_name       TEXT NOT NULL,
    file_size_bytes INT,
    mime_type       TEXT,
    distributed     BOOLEAN DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 13. Live location sharing during event (067) — Realtime enabled
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE event_locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES profiles(id),
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    sharing_active BOOLEAN DEFAULT TRUE,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 14. Competition phases (068)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE competition_phases (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    phase_num   INT NOT NULL CHECK (phase_num BETWEEN 1 AND 4),
    name        TEXT NOT NULL,
    description TEXT,
    starts_at   TIMESTAMPTZ NOT NULL,
    ends_at     TIMESTAMPTZ NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','extended','cancelled')),
    extended_once BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, phase_num)
);

-- ═══════════════════════════════════════════════════════════════
-- 15. Competition entries (068)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE competition_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    file_url        TEXT,
    file_name       TEXT,
    file_size_bytes BIGINT,
    mime_type       TEXT,
    external_url    TEXT,
    entry_type      TEXT NOT NULL CHECK (entry_type IN ('file','link','text')),
    moderated       BOOLEAN DEFAULT FALSE,
    moderated_by    UUID REFERENCES auth.users(id),
    moderation_reason TEXT,
    vote_count      INT DEFAULT 0,
    submitted_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 16. Competition votes (068)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE competition_votes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    voter_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_id    UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
    voted_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, voter_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 17. Prize pool contributions (068)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE prize_pool_contributions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    contributor_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount_cents    INT NOT NULL CHECK (amount_cents > 0),
    stripe_payment_intent_id TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 18. Competition winners (068)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE competition_winners (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    entry_id            UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    place               INT NOT NULL CHECK (place BETWEEN 1 AND 3),
    prize_amount_cents  INT DEFAULT 0,
    stripe_payout_id    TEXT,
    payout_status       TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending','processing','paid','failed')),
    needs_1099          BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, place)
);

-- ═══════════════════════════════════════════════════════════════
-- 19. Event photos — scrapbook (069)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE event_photos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_url    TEXT NOT NULL,
    caption     TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 20. Event comments (077)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE event_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL for guest comments
    guest_name  TEXT,
    guest_token TEXT,
    body        TEXT NOT NULL CHECK (char_length(body) <= 2000),
    parent_id   UUID REFERENCES event_comments(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT now()
);
```

### Storage Buckets
| Bucket | Purpose |
|---|---|
| `event-banners` | Event banner images (public) |
| `event-documents` | Supporting documents — tickets, itineraries, receipts (private, RLS) |
| `competition-entries` | Competition file uploads (private, RLS) |
| `event-photos` | Scrapbook photos (private, RLS) |

### Database Functions & Triggers (migrations 069–070)
| Function | Trigger | Fires On |
|---|---|---|
| `award_event_badge(user_id, badge_key)` | — | Called by other triggers |
| `award_event_banner_to_attendees(event_id, cosmetic_id)` | — | Called from admin dashboard |
| `on_event_checkin_badge()` | `trg_event_checkin_badge` | `event_checkins` INSERT |
| `on_comp_winner_badge()` | `trg_comp_winner_badge` | `competition_winners` INSERT |
| `on_event_published()` | `trg_event_published` | `events` UPDATE (status → 'open') |
| `on_rsvp_notify_creator()` | `trg_rsvp_notify_creator` | `event_rsvps` INSERT |
| `on_document_notify_member()` | `trg_document_notify_member` | `event_documents` INSERT (target_user_id IS NOT NULL) |
| `on_raffle_winner_notify()` | `trg_raffle_winner_notify` | `event_raffle_winners` INSERT |
| `on_comp_phase_notify()` | `trg_comp_phase_notify` | `competition_phases` UPDATE (status changed) |
| `increment_vote_count()` | `trg_increment_vote` | `competition_votes` INSERT |
| `decrement_vote_count()` | `trg_decrement_vote` | `competition_votes` DELETE |

### Badge Cosmetics (seeded in migration 069)
| Key | Label |
|---|---|
| `event_participant` | Event Explorer |
| `trip_veteran` | Trip Veteran (3+ LLC events) |
| `never_miss` | Never Miss (5 consecutive) |
| `comp_winner` | Competition Champion |
| `top_competitor` | Top Competitor (3+ entries) |
| `fundraiser_champ` | Fundraiser Champ ($200+ prize pool) |
| `event_organizer` | Event Organizer (created 3+ events) |

---

## Implementation Phases

### Phase 5A-1a — Free Events + QR Check-In (Foundation)
*Get a working event page up with free RSVPs and attendance tracking. No payments yet.*

- [x] Database migration: `events`, `event_rsvps`, `event_checkins`, `event_hosts` tables
- [x] `events/index.html` — public event page (query param: `?e={slug}`), no auth required
- [x] `portal/events.html` — member event list feed (upcoming/past tabs, type filters)
- [x] Create event form (member event type, description, banner upload, date/time, location, timezone)
- [x] **Event preview** before publishing (preview modal showing public + gated views)
- [x] Draft → Published status flow
- [x] Event detail page with attendee list
- [x] Free RSVP (Going / Maybe / Not Going) for members
- [x] QR code dual-mode: Attendee Ticket Mode + Venue Scan Mode
- [x] Check-in scanner (creator + designated co-hosts via `event_hosts`)
- [x] Live attendance counter
- [ ] CP award on check-in
- [ ] Feed integration — new events auto-posted to member feed
- [ ] Push notification: new event published, someone RSVP'd to your event

### Phase 5A-1b — Paid RSVP + Raffle
*Add Stripe payments, pricing modes, and the giveaway/raffle system.*

- [x] Database migration: `event_raffle_entries`, `event_raffle_winners` tables + raffle columns on `events`
- [x] `create-event-checkout` Supabase Edge Function (one-time Stripe Checkout Sessions)
- [x] Stripe webhook handler for `checkout.session.completed` → creates RSVP/raffle records
- [x] Flexible pricing modes: Fully Free / Fully Paid / Free Event, Paid Raffle
- [x] Two-tier info gating (gate_time, gate_location, gate_notes) — gated details unlock after payment
- [x] Non-refund policy acceptance logged at checkout
- [x] Raffle configuration in event creation (enable, type, # winners, prizes, draw trigger)
- [x] Digital raffle draw (cryptographic random from checked-in pool, celebration animation)
- [ ] Physical raffle support (printable attendance list, optional winner recording)
- [ ] Raffle winner + all-attendee push notifications
- [x] Raffle info displayed on public event page (pre-RSVP incentive)

### Phase 5A-1c — Public Guest Flow + Notifications
*Non-member RSVPs, guest tickets, event reminders, notification preferences.*

- [x] Database migration: `event_guest_rsvps` table
- [x] Member-only toggle on event creation
- [x] Guest RSVP flow: name + email at Stripe Checkout (no account required)
- [x] Guest QR ticket on payment confirmation page
- [x] "Already RSVP'd?" email lookup on public event page for ticket retrieval
- [x] Guest check-in support (both QR modes)
- [x] Guest raffle eligibility (checked in + paid if applicable)
- [x] Event reminder notifications: 7-day, 72-hour, day-of
- [x] RSVP deadline reminders
- [x] Notification preferences in Settings (`settings.html` → Notifications section) — per-category toggle

### Phase 5A-2 — LLC Events (Core)
*Paid RSVP, cost breakdown builder, minimum threshold, waitlist.*

- [x] LLC event creation (President role only for now)
- [x] Cost breakdown builder UI with lock-on-first-payment logic
- [x] Stripe immediate capture for RSVP buy-in (no deferred auth)
- [x] No-refund policy acceptance logged at checkout
- [x] Invest-eligible flag + Fidelity risk disclosure at checkout
- [x] Minimum threshold + auto-cancel + auto-refund logic
- [x] Waitlist system (`event_waitlist` table, 24h offer window, auto-advance)
- [x] Cancellation + rescheduling + 72h grace window + partial non-refundable expense handling
- [x] Duplicate event tool

### Phase 5A-3 — LLC Events (Documents & Map)
*Enhancements after core LLC flow is working.*

- [x] Document upload system (per-member + group docs)
- [x] Member document download page
- [x] Live event map (Leaflet.js)
- [x] Location-sharing requirement enforcement

### Phase 5A-4 — Competition Events
*Phase-based competitions, voting, prize pool, multi-winner.*

- [x] Competition phase builder (Registration → Active → Voting → Results)
- [x] Entry submission (file upload with size limits, link, text)
- [x] Entry moderation (admin/coordinator can remove entries)
- [x] Minimum entries threshold + one-time extension option
- [x] Voting system (self-voting blocked server-side)
- [x] Tie handling + winner tier configuration (1st/2nd/3rd split)
- [x] Prize pool funding (Stripe)
- [x] Winner announcement + Stripe payout + 1099-NEC flag
- [x] Competition badge generation

### Phase 5A-5 — Polish & Gamification
*Badges, banners, Credit Points, notifications, settings.*

- [x] Event-specific badges (per event — generic cosmetics, not per-event custom)
- [x] Global event achievement badges (7 badge cosmetics seeded)
- [x] Member event banners (awarded post-event via admin dashboard, shows on profile)
- [x] Past events scrapbook (photo upload, completed event archive with gallery/lightbox)
- [x] Full notification system for all event triggers (7-day + 72h + day-of reminders, per-member document alerts, RSVP/raffle/competition notifications)
- [x] Notification channel preferences in Settings (`settings.html` → Notifications section, 7 categories)
- [x] Admin events dashboard (`admin/events.html` — overview stats, events table, competition payouts with 1099 flags, banner award tool)

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
| Non-member RSVPs to public event | Guest RSVP record created with name + email + unique guest_token. QR ticket generated from guest_token. No account needed. |
| Non-member tries to RSVP to member-only event | Blocked — must sign in as active member first. Public page shows: "This is a members-only event. Sign in to RSVP." |
| Paid RSVP refund requested | All RSVP and raffle payments are non-refundable. No exceptions except event cancellation by admin. |
| Raffle entry paid but attendee doesn't check in | Not in the raffle pool. No refund. Entry fee is non-refundable. |
| Fewer checked-in attendees than raffle prizes | System awards only as many prizes as there are checked-in eligible people. Remaining tiers are void. |
| Coordinator requests raffle re-draw | Not allowed. Results are final once drawn. Prevents manipulation. |
| Raffle drawn but nobody checked in yet | "Draw Winner" button disabled until at least 1 eligible check-in. |
| Couple wants to RSVP together / +1 | Not supported. Each person RSVPs and pays individually. Adults only. |
| Competition entry submitted after deadline | Blocked server-side. No late submissions regardless of UI state. |
| Self-vote in competition | Blocked server-side. Competitor's own entry is excluded from their eligible vote choices. |
| Winner payout over $600 in a calendar year | Admin payout console flags the winner for 1099-NEC reporting. LLC is responsible for filing. System surfaces the alert only — does not auto-file. |

---

**Last Updated:** March 31, 2026
**Status:** Full audit complete — spec reconciled with codebase. All implementation phases (5A-1a through 5A-5) are built and deployed across migrations 063–077. 20 database tables, 4 storage buckets, 8 Supabase Edge Functions, 11 database triggers, 7 badge cosmetics. Frontend: 3 HTML pages + 15+ JS modules across public/portal/admin tiers. Remaining unimplemented items: feed integration, Credit Points (CP) tie-in, physical raffle printable list, QR time-window validation, timezone dual-display, push notifications for event cancellation/rescheduling/minimum threshold, and per-event commemorative badges.
