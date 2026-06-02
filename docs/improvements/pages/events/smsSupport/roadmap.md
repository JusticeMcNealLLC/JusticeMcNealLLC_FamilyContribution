# Event SMS Support — Roadmap

Date: 2026-06-02 (updated Phase 6)

**Status:** Phases 1–5 **complete** on staging (`jcrsfzcabzdeqixbewgf`). **Phase 6 (QA / rollout)** is current. See `002_event_sms_rollout_qa_checklist.md`.

## Related docs

| Doc | Purpose |
| --- | --- |
| `001_event_sms_support_audit_and_plan.md` | Current-state audit, data model, Twilio/RLS/UI plans, risks |
| `002_event_sms_rollout_qa_checklist.md` | Phase 6 QA, secrets, webhooks, sign-off |
| `docs/improvements/pages/events/list.md` | Events improvement backlog (add **003** when ready) |
| `docs/improvements/pages/events/moderation/000_event_coordinator_role_audit.md` | Event Coordinator RBAC |
| `docs/todo.md` | Product notes on SMS vs push (lines 14–15) |

---

## Goal

Add **optional guest phone + SMS consent** at RSVP, **member event SMS opt-in** using profile phone when available, **automated** RSVP confirmation and 24-hour reminders, and **manual** coordinator/admin SMS from a new **Notifications** tab in Manage Event — on a **shared SMS backend** with **Events-specific** recipient/UI logic.

## Non-goals (remaining)

- Email or push inside the Notifications tab (Phase 7)
- Moving or merging the existing PWA push stack
- Per-event coordinator assignment (global `events.manage_all` remains today)
- Member profile phone editing in portal (can follow separately)

---

## Phase 0 — Discovery / audit ✅ Complete

**Deliverable:** `001_event_sms_support_audit_and_plan.md`

**Exit criteria:** Met — architecture, permission name, and implementation order agreed.

---

## Phase 1 — Schema / RLS ✅ Complete

**Deliverable:** `supabase/migrations/094_event_sms_notifications.sql` (applied staging)

| Table | Role |
| --- | --- |
| `sms_phone_contacts` | Normalized E.164 phone, optional `user_id` |
| `sms_global_suppressions` | Twilio STOP / global block |
| `event_sms_recipients` | Per-event opt-in, RSVP link |
| `sms_messages` | Outbound batches |
| `sms_message_deliveries` | Per-recipient status |
| `sms_inbound_messages` | Inbound audit |

**Exit criteria:** Met — migration applied; RLS + `events.manage_notifications` seeded.

---

## Phase 2 — Twilio Edge Functions ✅ Complete

| Function | Status |
| --- | --- |
| `send-sms` | Deployed |
| `send-event-sms` | Deployed |
| `twilio-sms-status-callback` | Deployed |
| `twilio-sms-inbound-webhook` | Deployed |
| `schedule-event-sms-reminders` | Deployed (gated by `SMS_REMINDERS_ENABLED`) |
| `send-event-rsvp-confirmation` | Deployed |
| RSVP/checkout functions updated | Deployed |

**Exit criteria:** Met — staging functions + env flag design in place.

---

## Phase 3 — RSVP capture ✅ Complete

- Guest optional phone + consent → `rsvp-guest-free` / checkout metadata / `stripe-webhook`
- Member opt-in → `upsert-event-sms-recipient`

**Exit criteria:** Met — recipient rows created; no automated send until Phase 5 flags enabled.

---

## Phase 4 — Manage Event Notifications UI ✅ Complete

- Notifications tab in Manage shell
- Recipients (masked phones), filters, manual send, message history
- Permission: `events.manage_notifications` + host/creator

**Exit criteria:** Met — manual send via `send-event-sms` in staging.

---

## Phase 5 — Automated messages ✅ Complete

| Message | Implementation |
| --- | --- |
| RSVP confirmation | `SMS_RSVP_CONFIRMATIONS_ENABLED`; non-blocking after RSVP upsert |
| 24h reminder | `schedule-event-sms-reminders`; `SMS_REMINDERS_ENABLED` |
| Cancellation | Manual modal after cancel; `message_type=cancellation`, no auto-send |

**Exit criteria:** Met — automations gated by env flags; dry-run supported.

---

## Phase 6 — QA / rollout 🔄 Current

**Deliverable:** `002_event_sms_rollout_qa_checklist.md`

| Area | Checks |
| --- | --- |
| Staging | Guest + member RSVP, paid guest, manage tab, automations dry-run |
| Twilio | Webhooks, STOP/START, status callback |
| Compliance | Consent, STOP suppression, masked phones |
| Permissions | Host/coordinator vs member RLS |
| Production | Secrets, webhook URLs, cron plan, rollback |

**Exit criteria:** Production rollout sign-off; monitor failed deliveries first 48h.

---

## Phase 7 — Future

- Email channel in Notifications tab
- Bridge to PWA push preferences (separate channels)
- Dedicated JMLLC Twilio number/account
- Message templates, scheduled manual sends
- Website-wide SMS reusing shared `send-sms`
- Member portal phone edit + global SMS category prefs

---

## Implementation order (completed)

1. Phase 1 — schema + RLS  
2. Phase 2 — Twilio Edge Functions  
3. Phase 3 — RSVP capture  
4. Phase 4 — Notifications tab  
5. Phase 5 — RSVP confirmation + 24h reminders + cancellation prompt  
6. **Phase 6 — QA / rollout (in progress)**

---

## Dependency order (diagram)

```mermaid
flowchart LR
  P0[Phase 0 Audit]
  P1[Phase 1 Schema]
  P2[Phase 2 Twilio Edge]
  P3[Phase 3 RSVP Capture]
  P4[Phase 4 Manage UI]
  P5[Phase 5 Automated SMS]
  P6[Phase 6 QA Rollout]
  P7[Phase 7 Future]

  P0 --> P1 --> P2
  P2 --> P3
  P2 --> P4
  P3 --> P5
  P4 --> P5
  P5 --> P6 --> P7
```
