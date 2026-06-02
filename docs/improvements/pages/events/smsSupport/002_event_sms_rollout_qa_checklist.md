# Event SMS Support — Rollout QA Checklist (Phase 6)

Date: 2026-06-02  
Project: `jcrsfzcabzdeqixbewgf` (justicemcnealllc_db2)  
Related: `roadmap.md`, `001_event_sms_support_audit_and_plan.md`

**Purpose:** Verify Event SMS is safe to operate in staging/production before enabling real Twilio sends.  
**Scope:** QA and rollout only — no new features in this phase.

---

## Phase completion reference

| Phase | Status | Notes |
| --- | --- | --- |
| 0 Discovery | Complete | `001_event_sms_support_audit_and_plan.md` |
| 1 Schema / RLS | Complete | `094_event_sms_notifications.sql` applied |
| 2 Twilio Edge Functions | Complete | Deployed to staging project |
| 3 RSVP capture | Complete | Guest + member consent paths |
| 4 Manage Notifications UI | Complete | Manual send + history |
| 5 Automated SMS | Complete | RSVP confirmation, 24h reminders, cancellation prompt |
| 6 QA / rollout | **Current** | This checklist |

---

## 1. Infrastructure preflight

### 1.1 Database migration

- [ ] Migration `supabase/migrations/094_event_sms_notifications.sql` applied on target project
- [ ] Tables exist: `sms_phone_contacts`, `sms_global_suppressions`, `event_sms_recipients`, `sms_messages`, `sms_message_deliveries`, `sms_inbound_messages`
- [ ] Permission seed present: `events.manage_notifications` on Owner + Event Coordinator roles
- [ ] PostgREST exposes tables (no 404 on `event_sms_recipients` from portal)

**Verify (SQL Editor):**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'sms_%' OR table_name = 'event_sms_recipients'
ORDER BY 1;
```

### 1.2 Edge Functions deployed

Confirm in [Supabase Functions](https://supabase.com/dashboard/project/jcrsfzcabzdeqixbewgf/functions):

| Function | Required for |
| --- | --- |
| `send-sms` | Core send (service role) |
| `send-event-sms` | Manual / cancellation sends (JWT) |
| `send-event-rsvp-confirmation` | Optional direct invoke; RSVP uses shared helper in RSVP functions |
| `schedule-event-sms-reminders` | 24h reminder cron / manual invoke |
| `twilio-sms-inbound-webhook` | STOP / START / HELP |
| `twilio-sms-status-callback` | Delivery status updates |
| `upsert-event-sms-recipient` | Member SMS opt-in |
| `rsvp-guest-free` | Guest free RSVP + SMS upsert |
| `create-event-checkout` | Paid guest SMS metadata |
| `stripe-webhook` | Paid guest SMS upsert |

**Deploy command (when code changes):**

```bash
supabase functions deploy send-sms send-event-sms send-event-rsvp-confirmation schedule-event-sms-reminders twilio-sms-inbound-webhook twilio-sms-status-callback upsert-event-sms-recipient rsvp-guest-free create-event-checkout stripe-webhook --project-ref jcrsfzcabzdeqixbewgf
```

---

## 2. Secrets and environment flags

Set in **Supabase Dashboard → Project Settings → Edge Functions → Secrets**.  
**Never commit secrets to git.**

| Secret | Purpose |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Twilio API auth |
| `TWILIO_AUTH_TOKEN` | Twilio API auth + webhook signature validation |
| `TWILIO_FROM_PHONE` | E.164 sender (if not using Messaging Service) |
| `TWILIO_MESSAGING_SERVICE_SID` | Optional Messaging Service (preferred for A2P) |
| `SMS_SEND_ENABLED` | Must be `true` for real Twilio API calls |
| `SMS_DRY_RUN` | When `true`, writes dry-run delivery rows (no Twilio charge) |
| `SMS_RSVP_CONFIRMATIONS_ENABLED` | When `true`, sends RSVP confirmation after opt-in RSVP |
| `SMS_REMINDERS_ENABLED` | When `true`, `schedule-event-sms-reminders` processes events |

### Recommended safe initial setup (staging QA)

```txt
SMS_SEND_ENABLED=false
SMS_DRY_RUN=true
SMS_RSVP_CONFIRMATIONS_ENABLED=true
SMS_REMINDERS_ENABLED=true
```

With this setup:

- RSVP confirmations and reminders **create** `sms_messages` + `sms_message_deliveries` with `dry_run_*` SIDs
- No Twilio charges
- Manual sends via `send-event-sms` also respect dry-run via `isSmsDryRun()`

### Production real-send gate (only after dry-run QA passes)

```txt
SMS_SEND_ENABLED=true
SMS_DRY_RUN=false
```

Keep automations off until ready:

```txt
SMS_RSVP_CONFIRMATIONS_ENABLED=true   # when ready for live confirmations
SMS_REMINDERS_ENABLED=true            # when cron/manual reminder QA passes
```

### Rollback (disable sends quickly)

1. Set `SMS_SEND_ENABLED=false` and/or `SMS_DRY_RUN=true`
2. Set `SMS_RSVP_CONFIRMATIONS_ENABLED=false` and `SMS_REMINDERS_ENABLED=false`
3. Do not invoke `schedule-event-sms-reminders` from cron until re-enabled
4. Manual sends from Manage Event still no-op to Twilio while dry-run / send disabled

---

## 3. Twilio console configuration

### 3.1 Webhook URLs (project `jcrsfzcabzdeqixbewgf`)

| Webhook | URL |
| --- | --- |
| Inbound SMS | `https://jcrsfzcabzdeqixbewgf.supabase.co/functions/v1/twilio-sms-inbound-webhook` |
| Status callback | `https://jcrsfzcabzdeqixbewgf.supabase.co/functions/v1/twilio-sms-status-callback` |

**Inbound:** Configure on the Twilio phone number or Messaging Service → “A MESSAGE COMES IN” → POST to inbound URL.  
**Status:** Set on Messaging Service or pass via `StatusCallback` on outbound (Edge `executeSendSms` sets default status callback URL automatically).

Both functions validate `X-Twilio-Signature` using `TWILIO_AUTH_TOKEN`.

### 3.2 Outbound sender

- [ ] Either `TWILIO_MESSAGING_SERVICE_SID` **or** `TWILIO_FROM_PHONE` is set (not both required; Messaging Service preferred)
- [ ] Number/Messaging Service is approved for your use case (A2P 10DLC if US)

---

## 4. Functional QA matrix

Record **Pass / Fail / N/A** and tester + date.

### 4.1 RSVP capture (no send required)

| # | Scenario | Expected | ☐ |
| --- | --- | --- | --- |
| G1 | Guest RSVP, no phone | RSVP succeeds; no `event_sms_recipients` row | |
| G2 | Guest RSVP, phone + consent checked | `sms_phone_contacts` + `event_sms_recipients` (`opted_in=true`, `consent_source=guest_rsvp`) | |
| G3 | Guest RSVP, phone, consent unchecked | RSVP succeeds; no opt-in recipient row | |
| G4 | Paid guest checkout with phone + consent in metadata | Webhook creates recipient row after payment | |
| M1 | Member RSVP + SMS checkbox, profile has phone | `upsert-event-sms-recipient` → opted in | |
| M2 | Member opt-out (uncheck) | Recipient `opted_out_at` set / `opted_in=false` | |
| M3 | Member opt-in, no profile phone | 400 with friendly error; RSVP not blocked | |

### 4.2 Manage Event — Notifications tab

| # | Scenario | Expected | ☐ |
| --- | --- | --- | --- |
| N1 | Host/coordinator opens Notifications | Tab loads (no 404); empty state if no rows | |
| N2 | Recipients table | Phones **masked** (`***-***-1234`); no full E.164 in DOM | |
| N3 | Manual compose, select recipients, send (dry-run) | `sms_messages` (`manual`) + deliveries with dry-run SID | |
| N4 | Message type: cancellation / update | `message_type` stored correctly on send | |
| N5 | Non-manager member | Cannot read other events’ SMS data (RLS) | |

### 4.3 Automated SMS (dry-run)

| # | Scenario | Expected | ☐ |
| --- | --- | --- | --- |
| A1 | RSVP confirmation (`SMS_RSVP_CONFIRMATIONS_ENABLED=true`, dry-run) | One `rsvp_confirmation` message; no duplicate on repeat RSVP | |
| A2 | 24h reminder manual invoke | See §5; `reminder_24h` row for event in 23–25h window | |
| A3 | Reminder duplicate | Second invoke skips event (`events_skipped_duplicate`) | |
| A4 | Cancellation prompt | Cancel event → modal → Skip = no send | |
| A5 | Cancellation prompt Send (dry-run) | `cancellation` message to all opted-in | |

### 4.4 Twilio inbound / status

| # | Scenario | Expected | ☐ |
| --- | --- | --- | --- |
| T1 | Inbound `STOP` | `sms_global_suppressions` row; future sends skipped | |
| T2 | Inbound `START` / `UNSTOP` | Suppression released (per implementation) | |
| T3 | Status callback `delivered` / `failed` | `sms_message_deliveries.status` updated | |
| T4 | Invalid Twilio signature | 403; no DB corruption | |

### 4.5 Permissions and RLS

| # | Scenario | Expected | ☐ |
| --- | --- | --- | --- |
| P1 | Event host with `events.manage_notifications` | Can open Notifications + send | |
| P2 | Event creator | Can manage notifications | |
| P3 | Random authenticated member | Denied recipient/message history for others’ events | |
| P4 | `send-event-sms` without permission | 403 from Edge Function | |

### 4.6 Privacy / compliance

| # | Check | ☐ |
| --- | --- | --- |
| C1 | No full phone in Manage UI, API responses to browser, or Edge logs (mask only) | |
| C2 | SMS only sent to `opted_in` + not globally suppressed | |
| C3 | STOP suppresses subsequent sends | |
| C4 | Consent captured only when user provides phone + opts in | |

---

## 5. Test commands (no secrets in commands)

Replace `YOUR_SERVICE_ROLE_KEY` with the project service role key from the dashboard (do not paste into docs/git).

### 5.1 Manual 24h reminder invoke

```bash
curl -s -X POST "https://jcrsfzcabzdeqixbewgf.supabase.co/functions/v1/schedule-event-sms-reminders" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{}"
```

**Expected (reminders disabled):**

```json
{"success":true,"enabled":false,"events_checked":0,...}
```

**Expected (reminders enabled, dry-run):** `enabled: true`, `events_sent` ≥ 0 when an event starts in 23–25 hours and has opted-in recipients.

### 5.2 Manual send via send-event-sms (coordinator JWT)

Use a logged-in host session token (not service role). Dry-run is enforced when `SMS_DRY_RUN=true` or `SMS_SEND_ENABLED≠true` even if `dry_run: false` in body.

```bash
curl -s -X POST "https://jcrsfzcabzdeqixbewgf.supabase.co/functions/v1/send-event-sms" \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"event_id\":\"EVENT_UUID\",\"body\":\"Test message. Reply STOP to opt out.\",\"message_type\":\"manual\",\"select_all_opted_in\":true,\"recipient_ids\":[]}"
```

### 5.3 RSVP confirmation direct invoke (optional)

```bash
curl -s -X POST "https://jcrsfzcabzdeqixbewgf.supabase.co/functions/v1/send-event-rsvp-confirmation" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"event_id\":\"EVENT_UUID\",\"event_sms_recipient_id\":\"RECIPIENT_UUID\"}"
```

### 5.4 Twilio inbound webhook (signature required)

Inbound tests require a valid `X-Twilio-Signature` computed with your auth token and the full webhook URL + POST body. Use **Twilio Console → Monitor → Messaging logs** or Twilio’s request inspector against the live URL rather than hand-crafted curl without signature.

---

## 6. Static smoke checks (repo)

Run from repo root:

```bash
node test/_smoke-event-sms-notifications-ui.js
node test/_smoke-event-sms-rsvp-confirmation.js
node test/_smoke-event-sms-reminders.js
node test/_smoke-phase3c-manage-bridge.js
node test/_smoke-manage-module-helpers.js
```

Record results in the sign-off section below.

---

## 7. Cron / scheduler (production)

`schedule-event-sms-reminders` is **not** wired to pg_cron in this repo yet.

Before production reminders:

- [ ] Choose scheduler (Supabase cron, external cron, GitHub Action, etc.)
- [ ] Invoke every 15–60 minutes with **service role** Authorization header
- [ ] Confirm `SMS_REMINDERS_ENABLED=true` only when ready
- [ ] Monitor first runs: `events_sent`, `recipients_sent`, failed deliveries

**Disable reminders:** unset cron job + `SMS_REMINDERS_ENABLED=false`.

---

## 8. Production sign-off

| Role | Name | Date | Notes |
| --- | --- | --- | --- |
| Engineering | | | |
| Product / Owner | | | |

**Sign-off criteria:**

- [ ] All §4 critical paths Pass in staging with dry-run
- [ ] Twilio webhooks configured and tested (STOP + status)
- [ ] Secrets documented in password manager / Supabase only
- [ ] Real-send gate approved (`SMS_SEND_ENABLED=true`, `SMS_DRY_RUN=false`)
- [ ] 48h monitoring plan for failed deliveries

---

## 9. Remaining rollout tasks (post-checklist)

- [ ] Schedule `schedule-event-sms-reminders` in production
- [ ] Live Twilio number / Messaging Service campaign registration (if US A2P)
- [ ] Update `roadmap.md` Phase 6 to Complete after sign-off
- [ ] Optional: add `003` entry to `docs/improvements/pages/events/list.md`
- [ ] Phase 7 (email, unified prefs) — separate initiative
