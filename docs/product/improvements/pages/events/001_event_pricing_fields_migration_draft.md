# Event pricing / capacity / pay-method fields — migration draft

**Status:** Applied to remote `justicemcnealllc_db2` on 2026-08-30 via `20260830215900_095_event_pricing_capacity_fields.sql`  
**Date:** 2026-08-30  
**Parent:** [000_events_system_overhaul_brainstorm.md](./000_events_system_overhaul_brainstorm.md) (§13.1)  
**Extends:** `events` from `supabase/migrations/063_events_tables.sql` (`rsvp_cost_cents`, `max_participants`, `pricing_mode`, `rsvp_deadline`)

---

## 1. Goals

Add first-class columns for:

- Adult vs kid pricing (kids free **or** separate kid price)
- Fund deadline (installment money due — distinct from RSVP close)
- ACH / card toggles + optional per-event card fee override (bps)
- Capacity mode + what counts toward the max (adults only vs everyone)

Reuse existing `max_participants` and keep `rsvp_cost_cents` for legacy readers.

## 2. Non-goals (this draft)

- Applying the migration live
- Seat / party tables, payment schedules, Stripe fee math in app code
- Create UI
- Dropping `rsvp_cost_cents` or `event_refunds`

---

## 3. Column design

| Column | Type | Default | Meaning |
| --- | --- | --- | --- |
| `adult_price_cents` | `INT NOT NULL` | `0` | Price per adult seat (cents) |
| `kids_free` | `BOOLEAN NOT NULL` | `TRUE` | If true, kids are not billed |
| `kid_price_cents` | `INT NULL` | `NULL` | Per-kid price when `kids_free = false`; must be null when kids free |
| `fund_deadline` | `TIMESTAMPTZ NULL` | `NULL` | Last date for installment funding (e.g. Colorado Oct/Nov 2027) |
| `ach_payments_enabled` | `BOOLEAN NOT NULL` | `TRUE` | Allow ACH / bank debit |
| `card_payments_enabled` | `BOOLEAN NOT NULL` | `TRUE` | Allow card (fee pass-through in app) |
| `card_fee_bps` | `INT NULL` | `NULL` | Optional override in basis points (e.g. `290` ≈ 2.90%); `NULL` → platform default in code |
| `capacity_mode` | `TEXT NOT NULL` | `'none'` | `'none'` \| `'soft'` \| `'hard'` |
| `capacity_counts` | `TEXT NOT NULL` | `'adults'` | `'adults'` \| `'all'` — what fills `max_participants` |

### Existing columns (unchanged ownership)

| Column | Role after this draft |
| --- | --- |
| `rsvp_cost_cents` | **Legacy.** Backfill source for `adult_price_cents`. App should **prefer** `adult_price_cents` and **write-through** to `rsvp_cost_cents` until old readers are retired. |
| `max_participants` | Capacity **limit** when `capacity_mode ≠ 'none'`; should be `NULL` when mode is `'none'`. |
| `min_participants` | Unchanged (planning floor; not capacity enforcement). |
| `pricing_mode` | Still `'free'` \| `'paid'` \| `'free_paid_raffle'`. Paid trip events use `'paid'` plus the new price columns. |
| `rsvp_deadline` | When RSVP closes — **independent** of `fund_deadline` (money due). |
| `event_waitlist` | Used when `capacity_mode = 'soft'` and the event is at capacity. |

---

## 4. Capacity semantics

Creator configures three things:

1. **Mode** (`capacity_mode`)
   - `none` — no max (Colorado). Ignore `max_participants` for enforcement (prefer `NULL`).
   - `soft` — at capacity → waitlist (`event_waitlist`); do not hard-block if product allows join waitlist.
   - `hard` — at capacity → block new RSVP seats that would exceed the limit.
2. **Limit** — existing `max_participants` (positive int when mode ≠ `none`).
3. **What counts** (`capacity_counts`)
   - `adults` — only adult seats count toward the max (kids do not fill the cap, free or paid).
   - `all` — every person (adult + kid) counts.

Default when enabling a max later: `capacity_counts = 'adults'` (sensible for lodging/adult-seat trips).

Enforcement counts seats from the future party/seat model (next §13.1 item), not designed here.

---

## 5. Constraints / checks

- `adult_price_cents >= 0`
- `card_fee_bps IS NULL OR card_fee_bps >= 0`
- `capacity_mode IN ('none', 'soft', 'hard')`
- `capacity_counts IN ('adults', 'all')`
- Kids pricing:
  - If `kids_free = TRUE` → `kid_price_cents IS NULL`
  - If `kids_free = FALSE` → `kid_price_cents IS NOT NULL AND kid_price_cents >= 0`
- Capacity:
  - If `capacity_mode = 'none'` → `max_participants IS NULL` (soft rule; enforce in app if DB check is awkward with existing data)
  - If `capacity_mode IN ('soft','hard')` → `max_participants IS NOT NULL AND max_participants > 0`
- At least one of `ach_payments_enabled` / `card_payments_enabled` should be true when `pricing_mode = 'paid'` (app validation; optional DB check later)

---

## 6. Backfill

```sql
UPDATE events
SET adult_price_cents = COALESCE(rsvp_cost_cents, 0)
WHERE adult_price_cents = 0
  AND COALESCE(rsvp_cost_cents, 0) > 0;
```

- Existing free events: `adult_price_cents = 0`, `kids_free = TRUE`.
- Existing `max_participants` set with no mode: leave `capacity_mode = 'none'` until create UI maps old max → soft/hard (or one-time host review). Document for apply pass: optional follow-up to set `capacity_mode = 'hard'` where `max_participants IS NOT NULL` if product wants parity with today’s soft behavior — **default draft: do not auto-flip mode** (avoids changing live event behavior unexpectedly).

---

## 7. App read/write transition (note only)

| Action | Rule |
| --- | --- |
| Read price | `adult_price_cents` first; fallback `rsvp_cost_cents` if column missing mid-deploy |
| Write price | Set `adult_price_cents` **and** `rsvp_cost_cents` to the same adult amount until legacy paths removed |
| Card total | `base_cents` from seats; if card, apply fee using `card_fee_bps` or platform default so **net ≈ base** |
| Colorado example | `adult_price_cents = 100000`, `kids_free = TRUE`, `kid_price_cents = NULL`, `fund_deadline` ≈ 2027-10/11, `capacity_mode = 'none'`, ACH+card enabled |

---

## 8. Relation to parent spec

| Spec idea | Column(s) |
| --- | --- |
| Adult / kid pricing | `adult_price_cents`, `kids_free`, `kid_price_cents` |
| Fund deadline | `fund_deadline` |
| ACH preferred + card | `ach_payments_enabled`, `card_payments_enabled`, `card_fee_bps` |
| Capacity none/soft/hard + adults vs all | `capacity_mode`, `capacity_counts`, `max_participants` |

---

## 9. Applied SQL

Migration file: [`supabase/migrations/20260830215900_095_event_pricing_capacity_fields.sql`](../../../../supabase/migrations/20260830215900_095_event_pricing_capacity_fields.sql)

(Source of truth is that file; see git history for the exact applied statements.)

---

## 10. Defaults for new events

| Setting | Default |
| --- | --- |
| `kids_free` | `true` |
| `ach_payments_enabled` / `card_payments_enabled` | `true` |
| `capacity_mode` | `none` |
| `capacity_counts` | `adults` |
| `card_fee_bps` | `NULL` (platform default) |
| `fund_deadline` | set by creator for installment trips |

---

## 11. Done criteria for this checklist item

- [x] Columns and constraints documented
- [x] Capacity mode + counts locked
- [x] Legacy `rsvp_cost_cents` / `max_participants` relationship documented
- [x] Live migration applied — `20260830215900_095_…` on remote 2026-08-30
