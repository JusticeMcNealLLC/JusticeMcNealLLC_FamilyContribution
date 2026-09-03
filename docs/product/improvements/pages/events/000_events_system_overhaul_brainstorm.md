# Events System Overhaul — Brainstorm / Spec

**Status:** Living spec + actionable checklist (implementation proceeds plan-section by plan-section)  
**Date:** 2026-08-30 (checklist expanded; §11 resolved same day)  
**Primary driver:** Colorado snowboarding trip (January 2028)  
**Scope:** Universal events platform; Colorado is the first paid multi-month worked example  
**How to use §13:** Each checkbox is sized for **one plan-mode session** (spec → implement → smoke). Work top-to-bottom within a section; sections can overlap slightly when noted. Check items only when that slice is **done in production-ready form** for that phase’s bar (MVP vs final called out).

Related: existing modularization audits under `docs/product/audits/pages/events/`, public guest RSVP in `events/` + `js/events/`, portal create/manage in `js/portal/events/`.

---

## 1. Goals / Non-goals

### Goals

- Host events on the site with RSVP, rich About content, optional paid plans, voting, and host manage tools.
- Support **public** events anyone can join **without** becoming an LLC member.
- Support **priced multi-person trips** with one-time pay or monthly installments until a fund deadline, ACH-first via Stripe.
- Let creators define About tabs, included options (sizes/colors), disclaimers, and (where relevant) LLC / Competition surfaces without the legacy editor.
- Keep UX aligned with Theme_JMLLC001, site-config, and mobile (safe areas, bottom bar, `viewport-fit=cover`).
- Ship in **phases** so the site is announce-ready in ~2–3 months with a long payment runway before trip.
- Let hosts send **professional system SMS invites** (members + optional numbers) when an event is ready — not only a personal text with a link.

### Non-goals (this overhaul)

- Redesigning LLC membership, invite-only benefits, or contribution billing as a product.
- Creating a second “lightweight member” tier that blurs invite-only LLC status.
- Switching payment processors to Square (or anything non-Stripe) for v1.
- Implementing every guest-payment variant in v1 — document the matrix; pick lean MVP later.
- Building a new transactional **email** stack for event invites/magic links (SMS + on-screen links instead).
- **Competition** depth blocking Colorado trip announce (Competition is parallel FINAL; Colorado won’t use it).

---

## 2. Current State Snapshot

### Public (non–member-only) events

| Piece | Today |
| --- | --- |
| Surface | `events/index.html`, `js/events/` |
| Guest RSVP | Name + email (+ optional phone); **no account** — “No account needed” |
| Free path | Edge `rsvp-guest-free` → `event_guest_rsvps` + `guest_token` |
| Paid path | `create-event-checkout` → Stripe Checkout; webhook marks guest paid |
| Identity | Email + UUID `guest_token` (ticket URL), not a portal user |
| Progress UI | RSVP / paid / QR / check-in — **not** installment balance or schedule |

### Portal (members)

| Piece | Today |
| --- | --- |
| Surface | Portal events + `js/portal/events/` |
| RSVP | Authenticated → `event_rsvps` |
| Create / manage | Create sheet, manage tabs (Overview, RSVPs, Money, Competition, Raffle, etc.) |
| Guest vs member | Members on public page use member RSVP when signed in; guest form hidden |

### Gaps for Colorado-style trips

- No monthly schedule / remaining balance / early payoff for event payers (especially guests).
- No first-class adult vs kid costing (creator: kids free **or** separate kid price) + sizes/options + multi-person attach flows.
- ~~No creator-configured disclaimer acknowledgment gate on RSVP.~~ → Done for self RSVP (§13.5); multi-seat / manage “who acked” still open (§13.8 / §13.12).
- About tabs / included options / voting / LLC + Competition need a clean create path without legacy editor dependency.
- Manage roster needs payment status + sizes + guest relationships for hosts.
- No host-triggered **SMS event invites** (only personal share / on-page ticket URLs today).
- No installment magic-link **SMS** delivery (tokens stay in-browser).

---

## 3. Identity Model (locked recommendation)

### Principle

**LLC membership stays invite-only.** Public event participation does **not** create a member or grant LLC benefits.

### Default: keep true guest checkout, extend with magic-link payments

1. **Free / simple RSVP** — Same as today: name, email, phone; write `event_guest_rsvps`; issue `guest_token`.
2. **Paid / installment events** — Still guest RSVP at signup. After plan setup, **SMS** a **magic link** (plus on-screen show/copy) to a **“My trip payments”** page scoped by `guest_token` (ticket-style). Guest can:
   - See amount due, paid, remaining, next debit date
   - Change nothing about LLC membership
   - Pay off early / view payment status
3. **Signed-in members** — Continue portal RSVP / `event_rsvps`; payment progress can live in portal *and/or* the same payment surfaces keyed by member id.
4. **No lightweight account tier** — Avoid password accounts that look like “almost members.” Token + SMS magic link is enough for 16-month trip funding.
5. **Event invite SMS** (separate from payment magic links) — Host triggers invites to selected members (phones on file) and/or extra numbers; message includes event name + public URL.

### Why this fits Justice McNeal LLC

- Anyone can join an event the family opens to the public.
- Progress visibility does not require inviting them into the LLC.
- Reuses existing `guest_token` mental model (tickets already work this way).
- Hosts still see guests in manage; members remain a separate roster lane.

### Explicit non-decision

If a guest later becomes an invited member, linking their prior guest RSVP/payments to a member profile can be a later migration — not required for announce MVP.

---

## 4. Payments (locked: Stripe ACH preferred + card with fee pass-through)

### Processor

- **Stay on Stripe.** **Do not move to Square.**
- **ACH / bank debit preferred** (default path, shown first) for ~$1000 installments.
- **Card allowed** as a secondary path. **Payer covers card fees** so the trip pot is not eaten (~3% × $1000 ≈ $30/adult; ~$300 across 10 adults).
- RSVP must show both totals clearly, e.g. “Pay with bank: $1000” / “Pay with card: ~$1031” (exact formula at implement time: card total covers Stripe % + any fixed fee so **net ≈ base total**).
- **Checkout redirect** to attach ACH/card and start full/first charge (`create-event-party-checkout`) — see [004_event_edge_function_contracts.md](./004_event_edge_function_contracts.md).

### Refunds (locked)

- **No refunds in the event system, period** — cancel, medical, host/trip change, partial months already paid: **no in-app refund**.
- Rare exceptions are **out-of-band only** (manager-approved on a different process). Disclaimers must state the no-refund rule plainly.

### Price mechanics (universal; Colorado numbers in §9)

- Event defines **adult price**, **fund deadline**, and optional **event date** (see migration draft [001_event_pricing_fields_migration_draft.md](./001_event_pricing_fields_migration_draft.md)).
- **Kids pricing (creator choice, locked product rule):**
  - Toggle: **kids free** vs **kids paid**
  - If kids paid: creator sets a **kid price** (may differ from adult — e.g. adult $1000, kid $400)
  - Base RSVP total = `(# billable adults × adult price) + (# billable kids × kid price or $0 if free)`
  - If paying by **card**, charge the **fee-inclusive** amount derived from that base (`card_fee_bps` on event or platform default).
- **Capacity (creator choice):** `capacity_mode` none | soft (waitlist) | hard; limit via existing `max_participants`; `capacity_counts` **adults** (only adult seats fill the cap) or **all** (adults + kids). Colorado: mode `none`.
- Attendee chooses at RSVP:
  - **Pay in full** or **monthly** until deadline: `monthly ≈ remaining_balance ÷ months_remaining` (recalculate on early payments / schedule changes).
  - Method: **ACH (preferred)** or **card (fee-inclusive)**.
  - Monthly debits on the **anniversary** of plan start (`anchor_at`); short months clamped (e.g. 31 → 28).
  - Schedule is **app-owned** (`event_payment_plans` / `event_payment_installments`) — not a Stripe Subscription. See [003_event_payment_schedule_migration_draft.md](./003_event_payment_schedule_migration_draft.md).
- **Pay off early** anytime (remaining balance in one debit/charge); cancels future pending installments.
- Failed ACH/card: clear status in magic-link page + host manage; retry / update method (implementation detail later).

### Data concepts (logical)

- **Party** (`event_parties`) — payer unit; disclaimer acks; amenity vote; future payment schedule
- **Seat** (`event_seats`) — adult|kid; options JSON; optional info-invite token
- Payer identity — member `event_rsvps` or guest `event_guest_rsvps` linked via `party_id`
- **Payment plan** (`event_payment_plans`) — full \| monthly; ach \| card; remaining; next debit; Stripe customer/PM
- **Installments** (`event_payment_installments`) — scheduled / full / payoff rows with PaymentIntent ids

### Why ACH over “just use someone else’s card on their phone”

People *can* pay informally off-platform; the product still needs:

- Host visibility of who is funded
- Predictable runway to the deadline
- Disclaimers and included options tied to the same roster

Off-platform workarounds are fine socially; they should not be the only path for hosts.

---

## 5. RSVP + Included Options + Disclaimers

### RSVP flow (target outline)

1. Open event (public or portal) — via host **SMS invite** link or shared public URL.
2. Choose attendance: self + optional guests (adult/kid) — exact multi-person UX depends on §6 MVP pick.
3. Select **included options** (e.g. clothing size/color) per person where the event defines them.
4. Enter **phone** (and email for guests as needed).
5. **Acknowledge disclaimers** (required; creator-configured), including locked defaults:
   - **No refunds for any reason** via the event system
   - Flyers still pay full / no plane-ticket reimbursement
   - Any other creator-defined clauses
6. **Amenities vote** (if event has voting) — **once per party**, during RSVP **before** payment. Vote is **provisional** until payment plan is **committed**. Never commit / cancel / drop → **vote removed / does not count**. Free-only events: completed RSVP counts.
7. Choose **payment** (if priced): pay in full vs monthly; ACH vs card (show fee-inclusive card total).
8. Confirm → create party + seats + primary RSVP → Stripe setup → **SMS + on-screen** payment magic link (`party.invite_token`).

Disclaimers are acknowledged **once per party** (covers the whole group).

### Phone

Require phone on RSVP for contact, **invite SMS**, payment magic-link SMS, and reminders. Align with existing SMS consent patterns (`SMS_SEND_ENABLED` / Twilio event SMS).

---

## 6. Multi-Person / Guest Payment Matrix (Option C — document all)

Colorado reality: one adult may pay for a spouse; kids ride free; ~10 adults / ~5 kids. Guests need sizes and disclaimer ack even when not paying.

**v1 code does not have to implement every row.** Hosts need a clear MVP lean (below).

| ID | Flow | Who fills sizes/disclaimers | Who pays | Pros | Cons |
| --- | --- | --- | --- | --- | --- |
| **A** | Payer-owned form | Payer for everyone | Payer | Simplest; one Stripe customer; roster complete in one session | Spouse must trust payer with sizes; less self-serve |
| **B** | Invite link (info only) | Guest via link | Payer | Accurate sizes; payer still owns money | Two-step; link expiry / nag |
| **C** | Guest self-registers + pays | Guest | Guest | Matches “use your own phone/bank”; clean Stripe identity | Harder for “I’ll cover my spouse”; fragmented host view until linked |
| **D** | Verify code → charge another person’s bank | Guest or payer | Other person’s PM after 6-digit confirm | Feels clever for “guest pays with spouse’s bank” | High Stripe + legal friction; consent/abuse risk; **defer** |
| **E** | Guest form first → payer “Add guest” | Guest then payer attaches | Payer (price updates) | Guest agency without paying; payer controls money | Needs pending-guest pool + attach UX |

### Lean recommendation (for later implementation, not locked in code yet)

1. **MVP:** **A + B** — payer can enter everyone *or* send invite links for sizes/disclaimers; payer’s ACH covers selected seats using event adult/kid prices.
2. **Soon after:** **E** if “guest fills first” is common in the family.
3. **Also support:** **C** as “I’m paying for myself” on the same event (independent guest/member RSVP).
4. **Defer:** **D** (verify-code bank share).

### Flow D — explicitly deferred

**Not shipping.** There is no 6-digit verify-code path to charge another person’s bank or card. Guests and members use: self-pay (**C**), payer-owned seats (**A**), size/disclaimer invite links (**B**), or attach-later “someone else will pay / Add guest” (**E**).

**Data shape (locked):** `event_parties` + `event_seats` — see [002_event_seat_party_model_migration_draft.md](./002_event_seat_party_model_migration_draft.md). Disclaimers and amenity vote are **once per party**. Seats inherit payer via `party_id` (checklist `paid_by`). Adult vs kid costing remains **per event, creator-configured**.

---

## 7. Event Create / About Tabs / Voting / Included Options / LLC + Competition

### Create flow targets

- Remove reliance on the **legacy editor** for primary create/edit.
- Creator-defined **About tabs** (examples: Itinerary, What’s covered, What to bring, Lodging, Travel).
- **What’s included** catalog with selectable options (size, color, etc.) that flow into RSVP.
- **Disclaimer** step in create: paste/configure clauses (defaults include **no refunds period** + flyer ticket clause).
- **Capacity:** creator chooses **none / soft cap + waitlist / hard cap**. Colorado uses **no cap**.
- **Voting** (amenities): enable + options in create; RSVP order and commit rules in §5 / §11.
- **LLC** tab: create + detail + manage wired for real data (MVP thin OK).
- **Competition** (parallel FINAL — not on Colorado critical path): coordinator creates competition with **prizes**, **rules**, **enter**, **file upload** (e.g. logo GFX), **submission window**, then **voting window**, **winner by votes**. Event date vs submission deadline are separate. Colorado trip does **not** plan to use Competition; build while revamping so other events can.
- Pricing: adult price; kids free **or** kids paid with separate kid price; fund deadline; ACH preferred + card fee pass-through.
- Visibility: public vs member-only (existing `member_only` concept).

### Detail / public page

- Tabbed About content; included list; clear price + deadline (ACH vs card totals when relevant); RSVP CTA.
- Mobile-first; theme tokens; no hover-only critical actions.

---

## 8. Admin / Manage / Team

Hosts and admins need (especially for Colorado):

| Need | Notes |
| --- | --- |
| Roster | Members + guests; adults vs kids; linked “paid by” relationships |
| Options | Sizes/colors per person |
| Disclaimers | Who acknowledged / when |
| Money | Paid / scheduled / remaining / failed; ACH vs card; **no in-app refunds** |
| **SMS invites** | Host-triggered: pick members with phones and/or add numbers; send event name + public link (Twilio). Shareable URL still works as fallback |
| Comms | Resend **payment** magic-link SMS; respect SMS consent / `SMS_SEND_ENABLED` |
| Capacity | Honors creator setting (Colorado: none) |
| Team | Coordinators / roles as existing moderation plans evolve |

Build on existing manage tabs (`RSVPs`, `Money`, etc. in portal events manage) rather than a separate Colorado-only admin. Reuse existing event SMS edge functions where possible.

---

## 9. Colorado Worked Example

| Field | Value |
| --- | --- |
| Trip | Family snowboarding — Colorado |
| Event date | **January 2028** |
| Announce / site ready | **~2–3 months** — product announce-ready; host sends **system SMS invites** (and/or shares public URL) |
| Payment deadline | **October or November 2027** (~16 months runway from now; ~11–12 months from announce) |
| Price | **$1000 / adult**; ACH preferred; card allowed with fee pass-through |
| Kids | Creator sets **kids free** for this trip (e.g. ~10 adults / ~5 kids). Other events may set a separate kid price. |
| Capacity | **No cap** for Colorado (creator could enable caps on other events) |
| Pay options | Full or monthly until deadline; payoff early OK |
| Processor | Stripe — ACH preferred + card fee-inclusive |
| Refunds | **None** in event system |
| Audience | Open event; **not** LLC-membership-gated |
| Identity | Guest SMS magic-link payments; members optional if already invited |
| Disclaimers | No refunds period; flyers pay full / no ticket reimbursement |
| Included | e.g. clothing size/color as selectable options |
| About tabs | Itinerary, what’s covered, what to bring, etc. (creator-defined) |
| Competition | **Not used** for this trip; platform feature built in parallel |

Example monthly math (illustrative): if someone RSVPs with **12 months** left and chooses monthly for $1000 → ~**$83.33**/month; after three on-time payments, remaining ~$750 can be paid off early in one debit.

---

## 10. Phased Roadmap (summary)

Aim: **announce-ready MVP in ~2–3 months**; full finalized product through the checklist in **§13**.

**“Announce-ready”** means the product cut is live so the host can tell people about Colorado — primarily via **host-triggered system SMS invites** (professional), with the **public share link** as fallback. It is **not** a hardcoded announcement banner on every event page.

| Milestone | Meaning |
| --- | --- |
| **Start** | Spec locked (this doc); current guest RSVP + one-shot Stripe checkout |
| **Announce-ready** | Colorado event live: RSVP, disclaimers, sizes, adult/kid pricing, ACH + fee-inclusive card, amenities vote rules, payment magic-link SMS, **host SMS invites**, host roster/money; **no Competition required** |
| **Finished** | All §13 boxes checked — universal create/manage, guest flows A+B (+C/E), voting polish, **full Competition**, failure UX, theme/mobile, Colorado operating as the production event |

High-level order (detail + checkboxes in §13):

0. Spec lock → 1. Data model → 2. Create (pricing, About, options, disclaimers, LLC; Competition parallel) → 3. Public detail → 4. RSVP → 5. Multi-person → 6. Payments → 7. Magic-link page → 8. Manage + SMS invites → 9. Voting → 10. Theme/mobile → 11. Colorado launch → 12. Harden to 100%

**Announce-ready cut line:** public event page; RSVP with phone, disclaimers, included options, amenities vote; creator adult/kid prices + capacity setting; ACH full/monthly + card fee pass-through; SMS payment magic link; host SMS invites; host roster + payment status.  
**After announce / before Finished:** guest attach **E**, self-pay **C** polish, **Competition** depth, failure/retry polish, legacy editor fully retired.

---

## 11. Resolved (announce-ready)

Former open questions — locked 2026-08-30:

| Topic | Decision |
| --- | --- |
| **Refunds** | **No refunds in the event system, period.** Out-of-band manager exceptions only (different process). |
| **“Announce stub”** | Not a UI widget. Means **announce-ready policy + product cut**. Host tells people via **system SMS invites** and/or public link. |
| **Event invites** | **Host-triggered SMS** (Twilio): select members with phones and/or add numbers; professional invite with event link. Share URL remains. Not an auto-blast without host action. |
| **Payment magic links** | **SMS** + on-screen show/copy after RSVP/pay setup. **No** new transactional email stack. Distinct from invite SMS. |
| **ACH vs card** | **ACH preferred**; **card allowed** with **fee pass-through** (show both prices). |
| **Capacity** | **Creator-configurable:** mode none/soft/hard; `capacity_counts` adults \| all; Colorado **no cap**. |
| **Amenity voting** | **Once per party**, during RSVP **before** payment; counts only after **payment plan committed** (or RSVP complete if free event). Cancel/never-pay → vote removed. |
| **Competition** | Full feature (prizes, rules, upload, submission + voting windows, winner by votes) as **FINAL parallel** track. **Not required** for Colorado announce; trip won’t use it. |

Nothing material left open for announce. Implementation details (exact Stripe fee formula constants, SMS copy templates) land in later checklist items.

---

## 12. Locked Decisions Summary

| Topic | Decision |
| --- | --- |
| Processor | Stripe (not Square); **ACH preferred**; **card with fee pass-through**; **Checkout redirect** for plan setup |
| Refunds | **None** in event system; out-of-band only |
| Membership | Invite-only LLC unchanged; public events ≠ membership |
| Guest identity | True guest checkout + `guest_token` payments page |
| Event invites | Host-triggered **SMS** to members/numbers + shareable link fallback |
| Payment magic links | **SMS** + on-screen; no new email stack |
| Seat / party model | `event_parties` + `event_seats`; disclaimer + amenity vote **once per party**; seats inherit payer via `party_id` |
| Seat pricing | Creator **adult price**; kids free **or** separate **kid price** |
| Capacity | Creator: mode none/soft/hard; counts **adults** or **all**; Colorado **no cap** |
| Card fees | Fee pass-through; optional per-event `card_fee_bps`, else platform default |
| Amenity voting | Pre-pay in RSVP; counts after plan commit (or free RSVP) |
| Colorado price | $1000/adult; kids free |
| Pay modes | Full or monthly to deadline; **anniversary** debits; early payoff; **app-owned** schedule (not Stripe Subscription) |
| Trip / announce | Jan 2028 trip; ~2–3 months to announce-ready; host SMS invites |
| Guest payment UX | A–E documented; MVP lean A+B; defer D |
| Competition | Parallel FINAL; not on Colorado critical path |
| Create | About tabs, included options, disclaimers, LLC; drop legacy editor reliance |
| Visuals | Theme_JMLLC001 + mobile rules; phased delivery |
| Execution | §13 checklist; one plan-mode session per checkbox |

---

## 13. Actionable checklist — Start → Finished

**Legend**

- `[ ]` not started · `[x]` done
- **MVP** = needed for announce-ready · **FINAL** = needed for 100% finished product
- Each item ≈ one plan-mode pass unless marked *(batch OK with …)*

### 13.0 Spec & kickoff (START)

- [x] **MVP** — Brainstorm spec written (`000_events_system_overhaul_brainstorm.md`)
- [x] **MVP** — Locked: Stripe ACH, guest magic-link identity, no lightweight membership tier
- [x] **MVP** — Locked: guest matrix A–E documented; MVP lean A+B; defer D
- [x] **MVP** — Locked: creator adult price + kids free *or* separate kid price
- [x] **MVP** — Linked from `docs/product/todo.md`
- [x] **MVP** — Resolve open questions §11 enough for announce (refunds, capacity, voting, ACH+card fees, SMS invites + magic links, Competition parallel) — *done 2026-08-30*

### 13.1 Data model & backend contracts

- [x] **MVP** — Design event pricing fields: `adult_price_cents`, `kids_free`, `kid_price_cents`, `fund_deadline`, capacity mode/counts, ACH/card flags — migration draft → [001_event_pricing_fields_migration_draft.md](./001_event_pricing_fields_migration_draft.md)
- [x] **MVP** — Design seat / party model: adult|kid, options JSON, disclaimer ack, provisional amenity vote, `paid_by` / payer link → [002_event_seat_party_model_migration_draft.md](./002_event_seat_party_model_migration_draft.md)
- [x] **MVP** — Design payment schedule tables (plan, remaining, next debit, method ACH|card, Stripe ids) — migration draft → [003_event_payment_schedule_migration_draft.md](./003_event_payment_schedule_migration_draft.md)
- [x] **MVP** — Edge function contract sketch: create RSVP+plan, webhook events, magic-link auth, host SMS invite — *doc only* → [004_event_edge_function_contracts.md](./004_event_edge_function_contracts.md)
- [x] **MVP** — Apply pricing + seat migrations to Supabase → `20260830215900_095_event_pricing_capacity_fields.sql`, `20260830215901_096_event_parties_and_seats.sql` (remote 2026-08-30)
- [x] **MVP** — Apply payment-schedule migrations to Supabase → `20260830220000_097_event_payment_schedules.sql` (remote 2026-08-30)
- [x] **FINAL** — RLS/policies review for guest token vs member vs host for new tables → [005_event_party_payment_rls.md](./005_event_party_payment_rls.md) (`20260830223000_098_event_party_payment_rls.sql`)
- [x] **FINAL** — Backfill/compat for existing free + one-shot paid events → [006_event_legacy_forward_compat.md](./006_event_legacy_forward_compat.md) (forward-only; no historical party backfill)

### 13.2 Create — Pricing & money settings

- [x] **MVP** — Create UI: adult price input → `js/portal/events/create/step-pricing.js`, `sheet.js`, `step-review.js` (+ submit read shim; `adult_price_cents` persist deferred to next item)
- [x] **MVP** — Create UI: kids free toggle; if off, kid price input (validate ≥ 0, can differ from adult) → `step-pricing.js`, `sheet.js`, `step-review.js` (persist deferred)
- [x] **MVP** — Create UI: fund deadline + event date; show helper copy for monthly math → `step-pricing.js`, `pricing-helpers.js`, `sheet.js`, `step-review.js` (persist deferred)
- [x] **MVP** — Create UI: capacity mode (none / soft+waitlist / hard) + optional seat limits → `step-when.js`, `sheet.js`, `step-review.js` (persist deferred)
- [x] **MVP** — Persist pricing settings on create/update; show on manage overview → `create/submit.js` dual-write + capacity/kids/fund; `manage/overview.js` Details rows (create insert only; edit after RSVPs is FINAL)
- [x] **FINAL** — Edit pricing rules safely after RSVPs exist → hard lock after first member/guest RSVP; manage overview `pricing-editor.js` (editable at 0 RSVPs; dual-write + count guard; **no refunds**)

### 13.3 Create — About tabs

- [x] **MVP** — About tab builder: add/rename/reorder/remove custom tabs + body content → `create/step-about.js` + About step in sheet (form state only; persist deferred)
- [x] **MVP** — Persist About tabs; render on public/portal detail → `about_tabs` JSONB (`099`), create submit write, `EventsAboutTabs` + portal/public detail tabs
- [x] **FINAL** — Richer editor (images/links) within theme; no legacy editor required for About → create About markdown toolbar (B/I/Link/Image URL); `miniMarkdown` images; `EventsAboutTabs.bodyToHtml` render; theme CSS (manage About edit deferred)

### 13.4 Create — What’s included + selectable options

- [x] **MVP** — Included items list in create (name, required?, option type: size/color/text/select) → `create/step-included.js` + Included step in sheet (form state only; persist deferred)
- [x] **MVP** — Persist included catalog; expose to RSVP form per seat → `included_items` JSONB (`100`), create submit write, `EventsIncludedItems`, RSVP fields portal/public, party+seat via `rsvp-guest-free` / `rsvp-member-party` / checkout+webhook (self-only; multi-seat §13.8)
- [x] **FINAL** — Option presets / reorder / per-role (adult vs kid) option sets → `applies_to` on catalog items; size/color/trip-clothing presets in create; RSVP/edges filter by seat role (self = adult)

### 13.5 Create — Disclaimers

- [x] **MVP** — Disclaimer editor in create (default templates: **no refunds period**; flyers pay full / no ticket reimbursement) → `create/step-disclaimers.js` + Disclaimers step after Pricing
- [x] **MVP** — Store required clauses; RSVP must ack each (timestamp) → `events.disclaimers` JSONB (`101`), create submit write, `EventsDisclaimers` + Deno `_shared/disclaimers.ts`; portal/public (+ CTA) checkboxes; party `disclaimer_acks` via `rsvp-guest-free` / `rsvp-member-party` / checkout+webhook (party required when any required disclaimer even if included catalog empty; legacy paid no-refund checkbox replaced when clauses present)
- [x] **FINAL** — Version disclaimers if host edits after early RSVPs → hard-lock after first member/guest RSVP (pricing pattern); manage overview `disclaimers-editor.js` editable until lock; re-ack / bump version deferred

### 13.6 Create — Retire legacy editor; LLC + Competition

- [x] **MVP** — New events creatable/editable without legacy editor for Colorado path → member create sheet + `EventsCreate.open({ eventId })` edit hydrate/update; Manage **Edit event**; pricing/disclaimers lock after RSVPs; legacy retained for LLC/Competition FINAL
- [x] **MVP** — LLC tab: create + detail + manage surfaces wired for real data (thin OK) → sheet-native LLC type + `step-llc.js` (cost items, transport, dual buy-in `adult_price_cents`/`rsvp_cost_cents`); submit writes LLC columns + `event_cost_items`; Manage Edit for LLC; detail/manage read path reused; invest-ack / Money budget / legacy removal → FINAL
- [x] **FINAL** — Legacy editor fully removed or redirect-only; no dual write → `#createModal` + `legacy-*.js` deleted; all create entry points use `EventsCreate.open()` sheet only (Member + LLC); Competition create deferred to Competition FINAL
- [x] **FINAL** — LLC event flows complete for production use → invest-eligible create toggle + RSVP ack (`invest-ack.js`, checkout validation); Manage Money trip budget; plane ticket handoff ops (Overview/RSVPs/Docs coverage)
- [x] **FINAL** — Competition: create prizes + rules + enter CTA → sheet-native `step-competition.js`; create/edit persist `competition_config` + `winner_tier_config` + initial phases; mobile Join-as-Competitor sticky CTA
- [x] **FINAL** — Competition: submission window + file upload (e.g. GFX) → `EventsCompetitionPhases` helper; Manage Comp submission window editor; detail window gating + signed URL GFX upload
- [x] **FINAL** — Competition: voting window after submissions close; winner by votes
- [x] **FINAL** — Competition: manage/detail complete for production use

*(Competition is **not** required for Colorado announce-ready.)*

### 13.7 Public / portal event detail

- [x] **MVP** — Detail shows price summary (adult / kids free or kid price), deadline, About tabs, included list
- [x] **MVP** — Clear RSVP CTA; member vs guest paths preserved
- [x] **FINAL** — Voting UI on detail for results (casting is in RSVP; §13.13)
- [x] **FINAL** — Performance/cache (`?v=`, SW bump) for detail assets

### 13.8 RSVP — Core (single payer, self)

- [x] **MVP** — Require phone (+ email for guests)
- [x] **MVP** — Adult/kid seat picker respecting event kids pricing
- [x] **MVP** — Included options per seat
- [x] **MVP** — Disclaimer acknowledgments gate (incl. no-refunds)
- [x] **MVP** — Amenities vote step before payment (if enabled); provisional until plan commit
- [x] **MVP** — Payment choice UI: pay in full vs monthly; ACH vs card with fee-inclusive card total shown
- [x] **MVP** — Submit creates RSVP + seats; hooks payment setup (stub OK until §13.10)
- [x] **FINAL** — Portal member RSVP parity with public guest for all new fields

### 13.9 Multi-person / guests (flows A–E)

- [x] **MVP** — **A** Payer-owned: add adult/kid guests on same form; sizes/disclaimers; price rolls up
- [x] **MVP** — **B** Invite link: guest fills sizes/disclaimers only; payer remains charged party
- [x] **FINAL** — **C** Self-pay guest/member independent RSVP polish (already partly exists — align with new seats/options)
- [x] **FINAL** — **E** Guest completes form first; payer “Add guest”; price updates
- [x] **FINAL** — Explicit **D deferred** note in UI/docs (no verify-code bank share)
- [x] **FINAL** — Host roster shows party links (`paid_by`, invite pending, incomplete options)

### 13.10 Payments — Stripe schedules (ACH + card)

- [x] **MVP** — Stripe Customer + ACH PaymentMethod collect for event plans
- [x] **MVP** — Card path with fee-inclusive total (net ≈ base); show ACH vs card on RSVP
- [x] **MVP** — One-time full pay path; mark schedule complete
- [x] **MVP** — Monthly schedule until fund deadline; amount = remaining ÷ months left
- [x] **MVP** — Webhook handlers: succeeded / failed / updated → DB schedule status
- [x] **MVP** — Early payoff: charge remaining, cancel future schedule
- [x] **FINAL** — Failed payment UX: payer notified via SMS; retry / update method
- [x] **FINAL** — Idempotency, audit log, reconcile job for missed webhooks
- [x] **FINAL** — Confirm **no in-app refund** flows (host docs only for out-of-band)

### 13.11 Magic-link “My trip payments” page

- [x] **MVP** — Public page route auth’d by `guest_token` (and member equivalent)
- [ ] **MVP** — Show total, paid, remaining, next debit, plan type, method (ACH/card)
- [ ] **MVP** — Pay off early CTA
- [ ] **MVP** — **SMS** magic link on RSVP/pay setup + resend from manage; **on-screen show/copy**
- [ ] **FINAL** — Update payment method from this page
- [ ] **FINAL** — Theme/mobile polish; safe-area; no tab-bar collision on portal embeds if any

### 13.12 Manage / admin / team + SMS invites

- [ ] **MVP** — RSVPs tab: adults/kids, options, disclaimer ack, payer links, vote status
- [ ] **MVP** — Money tab: per-payer paid/remaining/next/failed (Stripe-backed)
- [ ] **MVP** — **Host SMS invites:** pick members with phones and/or add numbers; send event name + public link
- [ ] **MVP** — Resend payment magic-link SMS; basic export or copy roster
- [ ] **MVP** — Capacity behavior matches create setting (Colorado: none)
- [ ] **FINAL** — Invite send log / resent history (thin)
- [ ] **FINAL** — Team/coordinator tools aligned with moderation plans
- [ ] **FINAL** — Danger-zone safe for payment-linked RSVPs (**no refund button**; cancel participation only as product allows)

### 13.13 Voting (amenities)

- [x] **MVP** — Create: enable voting + option list
- [x] **MVP** — RSVP: cast vote before payment; store provisional vs counted
- [ ] **MVP** — On plan commit → count vote; on cancel/never-pay → remove vote
- [ ] **FINAL** — Close voting; show results to attendees as configured; host results view polished

### 13.14 Theme, mobile, style-guide

- [ ] **MVP** — Public event + RSVP + magic-link: Theme_JMLLC001 tokens, mobile-first, `viewport-fit=cover`, safe areas
- [ ] **MVP** — Create/manage sheets usable on phone for host tasks needed at announce (incl. SMS invite)
- [ ] **FINAL** — Style-guide checklist pass for all new surfaces
- [ ] **FINAL** — Portal events list/detail visual parity with dashboard reference where applicable

### 13.15 Colorado launch package

- [ ] **MVP** — Create Colorado event with $1000 adult, kids free, no capacity cap, Oct/Nov 2027 deadline, Jan 2028 date
- [ ] **MVP** — About tabs + included clothing options + no-refund disclaimers filled
- [ ] **MVP** — End-to-end dry run: SMS invite → guest RSVP → vote → ACH/card setup → magic-link SMS → host roster/money
- [ ] **MVP** — Host sends real SMS invites to family; cache/SW bump
- [ ] **FINAL** — Live family rollout support notes (resend links, failure playbook, out-of-band refund policy reminder)

### 13.16 Harden → Finished (100%)

- [ ] **FINAL** — All MVP items above checked
- [ ] **FINAL** — Guest flows A+B+C+E complete; D documented as out of product
- [ ] **FINAL** — Legacy editor gone; LLC production-complete; Competition production-complete
- [ ] **FINAL** — Payment failure/retry/reconcile production-complete
- [ ] **FINAL** — Voting production-complete
- [ ] **FINAL** — Theme/mobile/style-guide complete for all new surfaces
- [ ] **FINAL** — Docs updated (this file §13 all `[x]`; short runbook for hosts)
- [ ] **FINAL** — **Finished product sign-off** — Colorado (and future events) run only on this system

---

### Progress snapshot

| Section | Focus |
| --- | --- |
| 13.0 | Spec — **done** |
| 13.1–13.6 | Backend + create (Competition = FINAL) |
| 13.7–13.9 | Detail + RSVP + guests |
| 13.10–13.12 | Money + payer page + manage/SMS invites |
| 13.13–13.14 | Voting + theme |
| 13.15–13.16 | Launch → 100% |

*When starting implementation: take the next unchecked **MVP** item (or a marked batch) into plan mode, implement only that slice, check it off here, then stop or take the next.*