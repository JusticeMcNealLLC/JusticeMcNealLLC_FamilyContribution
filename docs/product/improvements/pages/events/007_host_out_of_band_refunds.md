# Host runbook — Out-of-band refunds only

**Policy (§13.10):** There are **no in-app refunds** in the event system. Cancel, reschedule, medical, host/trip change, and partial months already paid do **not** trigger Stripe refunds from the portal or public site.

## What hosts can do in-app

- Cancel or reschedule an event (status / date only)
- View paid / remaining / failed on the Money tab
- Cancel participation / reset test participation — soft-cancels party + pending installments; does **not** refund Stripe (§13.12 line 462)

## Rare exceptions (out-of-band)

1. Manager approves an exception (different process — not self-serve).
2. Refund in **Stripe Dashboard** against the PaymentIntent / Customer for that payer.
3. Optionally note the outcome offline for ops; `event_refunds` is legacy audit history only — the app does not create new refund rows from cancel/grace flows.

## Attendee messaging

Disclaimers and RSVP copy state payments are non-refundable for the payment period unless organizers cancel or handle an approved exception outside the app.

## Related code

- [`process-event-cancellation`](../../../../supabase/functions/process-event-cancellation/index.ts) — status-only cancel; rejects `single_user_refund`
- [`manage-event-participation`](../../../../supabase/functions/manage-event-participation/index.ts) — host cancel/reset participation; cancels party/open plans without refunds
- Edge contracts: [004](./004_event_edge_function_contracts.md)
