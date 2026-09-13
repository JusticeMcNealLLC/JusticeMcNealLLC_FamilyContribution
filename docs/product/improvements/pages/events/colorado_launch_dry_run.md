# Colorado launch — E2E dry run (§13.15 line 482)

Staging walkthrough for **SMS invite → guest RSVP → vote → ACH/card setup → magic-link SMS → host roster/money**.

**Event:** `colorado-snowboarding-2028` (`d92a898d-a6e8-4e11-a40f-32f2dd857b4c`)  
**Public URL:** `/events/?e=colorado-snowboarding-2028`  
**SMS:** keep **dry-run** (`SMS_DRY_RUN=true` / `SMS_SEND_ENABLED≠true`). Live family Twilio is **483**.

Prep (idempotent):

```bash
node scripts/prep-colorado-dry-run-2028.js
node scripts/verify-colorado-dry-run-2028.js --pre
```

Post-check after the walkthrough:

```bash
node scripts/verify-colorado-dry-run-2028.js --post
```

Secrets / flags: [smsSupport/002_event_sms_rollout_qa_checklist.md](./smsSupport/002_event_sms_rollout_qa_checklist.md). Out-of-band refunds: [007_host_out_of_band_refunds.md](./007_host_out_of_band_refunds.md).

## Pass / Fail checklist

| Step | Action | Pass criteria | Result |
| --- | --- | --- | --- |
| Preflight | Stripe **test** keys + webhook on staging; SMS dry-run flags; edges deployed | Secrets + flags OK | |
| Prep | Run prep script; open public event page | `status=open`; amenity voting ≥2 options | |
| Invite | Host Manage → Overview → SMS invites to **tester** phone (or curl `send-event-invites`) | `sms_messages` with `message_type=event_invite` (dry-run SID OK) | |
| RSVP | Guest: party seats, clothing size/color, disclaimers, **amenity vote**, pay choice | `event_parties` + seats; vote provisional then counted on pay commit | |
| Pay | Stripe Checkout ACH **or** card (test PM) | Checkout completes; webhook commits `event_payment_plans` | |
| Magic-link | Payment SMS and/or on-screen `?t=` | `event_payment_link` SMS row and/or `/events/payments/?t=…` loads | |
| Host | Manage → RSVPs + Money | Roster shows party; Money shows plan / paid / remaining | |

## Cleanup

- Cancel test participation from Manage Danger / participation tools if needed.
- Refund any stuck **test** charge only via Stripe Dashboard (out-of-band).

## Related

- Create package: [colorado_launch_create.md](./colorado_launch_create.md)
- Edge contracts: [004_event_edge_function_contracts.md](./004_event_edge_function_contracts.md)

## Implement-session status

| Gate | Status |
| --- | --- |
| Prep (`open` + amenity voting) | Done — `node scripts/prep-colorado-dry-run-2028.js` |
| `verify --pre` | Green |
| Guest/host walkthrough (invite → RSVP → vote → Checkout → magic-link → Manage) | **Pending host** — needs Manage JWT, tester phone, Stripe test Checkout |
| `verify --post` | Red until walkthrough completes |
| Brainstorm **482** | Stays open until `--post` is green |

Do **not** check off §13.15 line 482 until `node scripts/verify-colorado-dry-run-2028.js --post` passes.
