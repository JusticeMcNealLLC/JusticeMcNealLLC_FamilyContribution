# Event Coordinator — Completion Status (v1)

**Status:** Complete after staging QA. Ready to move to the next Events improvement.

**Date:** May 2026  
**Environment validated:** Staging (`jcrsfzcabzdeqixbewgf`)

---

## 1. Completion summary

Event Coordinator **v1** is **complete** for staging. Manual QA on staging passed for RBAC assignment, portal Events permissions, admin isolation, account lifecycle (deactivate/reactivate), and profile display for active coordinators.

This feature was delivered without changing `portal/events.html` or starting Events Phase 5 (module entry). Production database rollout for migration **091** remains a separate step (see §4).

---

## 2. What was implemented

### RBAC role

- System role **Event Coordinator** (`00000000-0000-0000-0000-000000000003`)
- Assigned via `member_roles` (Admin → Roles)
- Coordinators keep **`profiles.role = member`**

### Permissions (exactly three)

| Permission | Purpose |
|------------|---------|
| `events.create` | Create events |
| `events.manage_all` | Manage/edit any event, host tools, RSVP admin actions |
| `events.banners` | Featured / banner controls on managed events |

**Not granted:** `admin.dashboard`, `admin.members`, `finance.*`, `content.documents`, or other unrelated admin keys.

### Shared permission helpers (`js/auth/shared.js`)

- `canCreateEvents()`
- `canManageEvents()`
- `canManageEventBanners()`
- `canAccessAdminDashboard()`
- `checkAuth({ permission })` — permission-only users (e.g. coordinators) are not blocked by `profiles.role !== 'admin'` unless `admin.dashboard` is required

### Portal Events UI

- Create, manage, host, featured/banner, and related gates use helpers instead of `evtCurrentUserRole === 'admin'`
- Files: `js/portal/events/init.js`, `list.js`, `detail.js`, `rsvp.js`, `scrapbook.js`, `manage/sheet.js`, `js/events/ticket.js` (optional helper + legacy fallback)

### Database / RLS

- **`091_event_coordinator_rbac_and_rls.sql`** — role seed + `role_permissions`; raffle winner UPDATE policy; raffle prize storage DELETE policy
- Staging: migrations **090** and **091** applied via `supabase db push --include-all`

### Related fixes (same rollout window)

| Change | Commit / note |
|--------|----------------|
| Deactivated-user auth block | `a9e6717` — login, reset-password, `checkAuth()`; `profiles.is_active === false` only |
| Events profile 406 hardening | `d1fec21` — `.maybeSingle()` + creator fallbacks |
| Profile/avatar RLS widening (092) | **Not implemented** — root cause was deactivated test account; discarded |

### Documentation

- `000_event_coordinator_role_audit.md`
- `001_event_coordinator_supabase_rls_plan.md`
- `002_event_coordinator_rollout_qa_checklist.md`
- `003_event_coordinator_completion_status.md` (this file)

---

## 3. QA results (staging — passed)

Manual testing on staging confirmed:

| Check | Result |
|-------|--------|
| Coordinator can **create** events | Pass |
| Coordinator can **manage / edit** events | Pass |
| Coordinator can use **featured / banner** controls | Pass |
| Coordinator can use **event admin tools** (manage sheet, raffle flows, etc.) | Pass |
| Normal member **cannot** create/manage all events (without role) | Pass |
| Coordinator **cannot** access Admin Hub | Pass |
| Coordinator **cannot** access members admin | Pass |
| Coordinator **cannot** access finance admin | Pass |
| Coordinator **cannot** access LLC docs / `content.documents` | Pass |
| **Deactivated** coordinator cannot log in (incl. reset-password loophole closed) | Pass |
| **Reactivated** coordinator can log in | Pass |
| **Active** coordinator sees profile **names / avatars** on Events (Discussion, Who’s coming) | Pass |

**Note:** Missing peer avatars + “Member” labels for a **deactivated** viewer are expected under current `profiles` RLS (`037`), not an Event Coordinator defect.

Static smokes (repo): `_smoke-event-coordinator-permissions.js`, `_smoke-event-coordinator-events-ui.js`, `_smoke-event-coordinator-rls-migration.js`, `_smoke-deactivated-user-auth-block.js`, `_smoke-events-profile-images.js`.

---

## 4. Production rollout status

**Production rollout: pending**

Known state as of this document:

- Migration **091** (and **090** if required) was applied on **staging** only.
- Production apply of **091**, production `pg_policies` verification, and assignment of real coordinator users on production are **not** recorded as complete in this repo history.

Before production: follow §Production rollout in `002_event_coordinator_rollout_qa_checklist.md`, then update this section to **Production rollout: complete** with date and operator notes.

---

## 5. Phase 5 decision

**Phase 5 is not required for Event Coordinator v1 and remains paused.**

Reasons:

- Current **classic Events** runtime (`init.js` + modules) is stable on staging after this work.
- Live verifier / static smokes passed for permission and bridge invariants.
- Feature was completed through **RBAC seed**, **targeted RLS (091)**, **shared helpers**, and **portal Events UI gates** — no `portal/events.html` or module-entry refactor required.
- Phase 5 (ESM / `PortalEvents` orchestrator) is a separate modernization track, not a blocker for coordinators.

---

## 6. Known follow-ups (non-blocking)

| Item | Priority |
|------|----------|
| **Production rollout** — apply 091 (+ 090 if needed), verify policies, assign coordinators | Required before production use |
| Optional **draft visibility** — all drafts vs creator-only for coordinators | Product decision |
| Optional **public ticket page** — load `js/auth/shared.js` on `events/index.html` for `canManageEvents()` | Low |
| Optional **Auth ban / revoke sessions** on `deactivate-user` | Security hardening |
| **Tailwind CDN** warning on portal pages | Separate production cleanup |
| **Per-event coordinator assignment** (not in v1) | Future |
| **Phase 5** module-entry work | Only when explicitly scheduled |

---

## 7. Next feature recommendation

**Event Coordinator v1 is done on staging.** Production DB rollout and coordinator assignments on production remain when you are ready.

**Ready to move to the next Events improvement** — pick the next item from the Events roadmap / improvements list (e.g. draft visibility, public event polish, or the next planned Events page feature). Do not start Phase 5 unless that is explicitly chosen as the next project.

---

## Reference commits (master)

| Commit | Summary |
|--------|---------|
| `5373590` | Migration 091 + Event Coordinator RBAC/RLS |
| `d1fec21` | Events profile 406 fallbacks |
| `a9e6717` | Deactivated-user auth block |
| `aa5bf37` | Rollout QA checklist doc |
