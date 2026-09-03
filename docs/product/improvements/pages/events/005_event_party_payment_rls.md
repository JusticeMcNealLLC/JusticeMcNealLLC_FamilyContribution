# Event party / payment RLS review

**Status:** Applied to remote `justicemcnealllc_db2` on 2026-08-30 via `20260830223000_098_event_party_payment_rls.sql`  
**Parent:** [000_events_system_overhaul_brainstorm.md](./000_events_system_overhaul_brainstorm.md) (§13.1 FINAL)  
**Tables:** `event_parties`, `event_seats`, `event_payment_plans`, `event_payment_installments`

---

## Access matrix

| Actor | Access |
| --- | --- |
| `service_role` | ALL (Checkout, webhook, magic-link, cron edges) |
| Creator / `event_hosts` / `events.manage_all` | SELECT all four; UPDATE `event_parties` + `event_seats` only |
| Member payer (`payer_user_id = auth.uid()`) | SELECT own party + related seats/plan/installments; UPDATE own party (acks/vote) if not cancelled |
| Anon / guest browser | **None** |
| Other authenticated members | **None** |

Guest `invite_token` / seat `info_invite_token` are **not** enforced in RLS. Edges must use **service_role** and validate tokens in application code ([004](./004_event_edge_function_contracts.md)).

Payment plan/installment **writes** (amounts, Stripe ids, status) are **service_role only** — hosts may SELECT for Money tab, not mutate money fields via PostgREST.

---

## Helper

`public.can_manage_event_party_data(p_event_id uuid)` — SECURITY DEFINER

True when `auth.uid()` is event `created_by`, an `event_hosts` row, or has `events.manage_all` (same pattern as team chat / SMS manage helpers).

---

## Replaced

Broad `authenticated SELECT` policies from migrations 096/097 (`event_*_auth_select`).

---

## Out of scope (this pass)

- RLS changes on legacy `event_rsvps` / `event_guest_rsvps`
- Anon token policies
- Edge function implementation
