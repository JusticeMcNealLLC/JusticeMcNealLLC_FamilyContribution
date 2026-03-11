# Phase 5 — Events & Family Activities

**Status:** 🔲 Not Started  
**Priority:** Medium  
**Goal:** Bring the family together IRL with organized events and shared experiences.  
**Full Spec:** See [md/pages/events.md](../pages/events.md)

---

## 5A. Events System

**Milestone unlock:** $1,000 (Four Figures tier)  
**Depends on:** Phase 4D (notifications) for push alerts

### Event Types
| Type | Description | Payment |
|------|-------------|---------|
| **Member Events** | Free gatherings, celebrations, meetups | Free — RSVP only |
| **LLC Events** | Officially organized — cost shared among attendees | Stripe — immediate capture |
| **Competition Events** | 4-phase contest system (registration → active → voting → results) | Prize pool |

### Member Events
- [ ] Create event (title, description, date/time, location, cover image)
- [ ] RSVP system (binary Going / Not Going for free events)
- [ ] Attendee list with profile pics
- [ ] Event comments / discussion thread
- [ ] QR code check-in per member (generated on profile page, jsQR scanner)
- [ ] QR valid only during event window + 24h after
- [ ] CP awarded on check-in (tied to Phase 2B quest)
- [ ] Event Coordinator role (`'coordinator'` on `profiles.role`)
- [ ] Sub-coordinator scanner access via `event_hosts` table
- [ ] 7-day + 72h RSVP deadline warnings
- [ ] Per-member document upload (private/per-member — not shared)
- [ ] Document notification flagged as private

### LLC Events (Paid)
- [ ] Cost breakdown builder (itemize expenses — venue, food, transport, etc.)
- [ ] **Cost breakdown locked on first payment** — surplus stays with LLC
- [ ] **Immediate Stripe capture** (no deferred auth)
- [ ] **Fidelity risk disclosure** shown at checkout
- [ ] **No-refund policy** logged at checkout (`accepted_no_refund_policy` + timestamp)
- [ ] **Waitlist** with 24h claim window and auto-advance
- [ ] **No +1s** — one spot per member account
- [ ] **No RSVP transfers** — forfeited spots go to waitlist
- [ ] Threshold: minimum RSVPs required before event is confirmed (one-time extension allowed)
- [ ] Private partial refund path if non-refundable expense cancellation applies

### Competition Events
| Phase | What Happens |
|-------|-------------|
| **1. Registration** | Members submit entries; admin approves/rejects |
| **2. Active** | Entry period open; file size limits (10MB images/PDFs, 50MB video) |
| **3. Voting** | Members vote; self-voting blocked server-side |
| **4. Results** | Ties = shared prize; winner tier config (1st/2nd/3rd % split) |

- [ ] Minimum entries threshold — event extends or cancels if not met
- [ ] Entry moderation (approve/reject)
- [ ] Self-voting blocked server-side
- [ ] Ties result in shared prize
- [ ] Winner tier config: 1st/2nd/3rd % split (admin configurable)
- [ ] Prize pool contribution tracking per member

### Live Map (LLC Events)
- [ ] Supabase Realtime for live attendee map (no polling)
- [ ] Privacy banner while location sharing is active
- [ ] Opt-out at any time during event
- [ ] Leaflet.js + OpenStreetMap

### Event Discovery Feed
- [ ] Upcoming events: list + calendar toggle
- [ ] Past events: scrapbook/archive view
- [ ] Type filters (Member / LLC / Competition)
- [ ] Duplicate event tool (admin can clone a past event)
- [ ] Timezone display — both event timezone and member's local time
- [ ] Notification channel preferences for events (in Settings)

### Notification Touchpoints
- New event created → all members
- 7-day RSVP deadline warning
- 72h RSVP deadline warning
- Waitlist spot available (24h claim window)
- Document uploaded (private per recipient)
- Event cancelled
- Competition results posted

### Database (12 tables)
```sql
events                    -- type CHECK, timezone, cost_breakdown_locked, winner_tier_config JSONB
event_cost_items          -- line items for LLC event cost breakdown
event_rsvps               -- accepted_no_refund_policy, accepted_no_refund_at
event_checkins            -- QR check-in records
event_documents           -- per-member private documents
event_locations           -- live location data (Realtime)
competition_phases        -- phase definitions per event
competition_entries       -- member submissions
competition_votes         -- voting records (self-vote blocked)
prize_pool_contributions  -- prize pool tracking
event_waitlist            -- waitlist queue with 24h claim window
event_hosts               -- sub-coordinator scanner access
```

### Edge Cases (17 documented in full spec)
- Partial refund on non-refundable expense cancellation
- Cost breakdown change after first payment → rejected
- Waitlist auto-advance on cancellation
- QR code attempted after expiry window
- Tie in competition voting
- Entry below minimum threshold → extend or cancel
- Self-vote attempt → blocked + flagged
- Member RSVP transfer attempt → rejected
- Event cancelled after payments collected → refund flow
- Live map opt-out mid-event
- See [md/pages/events.md](../pages/events.md) for full list

---

## 5B. Vacation / Trip Events (Special Type)

**Goal:** Trip-style events with a deposit requirement — the LLC acts as the trip fund manager.

- [ ] Trip-style events with **deposit requirement**
- [ ] Members RSVP by submitting a deposit (goes into a trip pot)
- [ ] Pot covers shared expenses (Airbnb, rentals, activities)
- [ ] LLC pays from the pot on behalf of the group
- [ ] **No refunds for last-minute cancellations** (policy clearly stated at RSVP)
- [ ] Trip expense breakdown visible to all attendees
- [ ] Trip budget tracker (target vs. collected)

### Example Flow
```
Jennifer creates "Jennifer's 54th Birthday Bash"
    📍 The Venue, Atlanta GA
    📅 Saturday, July 18th at 6:00 PM

    → Push notifications sent to all members
    → Members tap → see event details → RSVP
    → Jennifer sees RSVP list with profile pics
    → Event page shows countdown, attendee list, and comments
```

### Implementation Order
1. Phase 5A-1: Member Events (no Stripe) — list, create, RSVP, QR check-in, CP
2. Phase 5A-2: LLC Events core (cost builder, Stripe, waitlist, threshold)
3. Phase 5A-3: LLC Events documents + live Leaflet.js map
4. Phase 5A-4: Competition Events (phases, voting, prize pool)
5. Phase 5A-5: Badges, banners, notifications, admin dashboard
6. Phase 5B: Vacation/Trip events

> **Before building:** Create all 12 Supabase tables from the schema above.
