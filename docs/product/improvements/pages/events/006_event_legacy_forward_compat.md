# Legacy free / one-shot events — forward-only compat

**Status:** Locked 2026-08-30 (FINAL §13.1)  
**Parent:** [000_events_system_overhaul_brainstorm.md](./000_events_system_overhaul_brainstorm.md)  
**Related:** [001](./001_event_pricing_fields_migration_draft.md) · [002](./002_event_seat_party_model_migration_draft.md) · [003](./003_event_payment_schedule_migration_draft.md) · [004](./004_event_edge_function_contracts.md)

---

## Decision

**Forward-only.** Existing `event_rsvps` / `event_guest_rsvps` rows keep working **without** `party_id`. Do **not** invent `event_parties` / `event_seats` / payment plans for historical RSVPs.

New Colorado-style / installment RSVPs use the party + plan model going forward.

---

## What stays as source of truth (legacy)

| Path | Tables / functions |
| --- | --- |
| Free guest RSVP | `rsvp-guest-free` → `event_guest_rsvps` |
| One-shot paid RSVP/raffle | `create-event-checkout` + `stripe-webhook` → `paid` / `amount_paid_cents` on RSVP rows |
| Tickets / check-in | Existing `guest_token` / `qr_token` flows |

These remain until an event is created/paid through `create-event-party-checkout` (then that party’s rows use the new tables).

---

## Pricing columns

- Migration [095](../../../../supabase/migrations/20260830215900_095_event_pricing_capacity_fields.sql) already set `adult_price_cents = COALESCE(rsvp_cost_cents, 0)` where needed.
- **No further resync migration** in this pass — 095 is sufficient for current remote state.
- **App read (when UI lands):** prefer `adult_price_cents`; fallback `rsvp_cost_cents` if ever null/0 with legacy cost set.
- **App write (create/edit):** set **both** `adult_price_cents` and `rsvp_cost_cents` to the adult amount so legacy checkout readers stay correct.

---

## Manage / Money / roster UI rules

| Situation | Display |
| --- | --- |
| RSVP `party_id IS NULL` | Legacy roster + paid flags / `amount_paid_cents` |
| RSVP `party_id` set | Prefer party seats + `event_payment_plans` / installments |

Do not require parties for past events to appear in manage.

---

## Explicit non-goals

- SQL backfill creating one party per historical RSVP
- Fake completed payment plans for past one-shot checkouts
- Removing or breaking `create-event-checkout` / free guest RSVP in this pass

---

## Done

- [x] Forward-only decision locked
- [x] Read/write + manage display rules documented
- [x] No historical party backfill
- [x] adult_price: 095 sufficient (no 099)
