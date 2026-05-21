# Event Coordinator Rollout — QA Checklist

Current rollout state and manual QA remaining before production.

**Model:** Event Coordinator is RBAC-based (`member_roles` + permissions). Coordinators keep `profiles.role = member`. They do not receive `admin.dashboard`, finance, or unrelated admin access.

---

## Completed work

| Item | Status | Notes |
|------|--------|--------|
| Audit / planning docs | Committed | `000_event_coordinator_role_audit.md`, `001_event_coordinator_supabase_rls_plan.md`, `list.md` |
| Shared permission helpers | Committed | `js/auth/shared.js` — `canCreateEvents()`, `canManageEvents()`, `canManageEventBanners()`, `canAccessAdminDashboard()` |
| Portal Events UI permission gates | Committed | Portal Events modules use helpers instead of `evtCurrentUserRole === 'admin'` |
| Migration 091 | Committed | `091_event_coordinator_rbac_and_rls.sql` — role seed + raffle winner UPDATE + raffle prize storage DELETE |
| Staging migration applied | Done | `090`, `091` applied via `supabase db push --include-all` on staging (`jcrsfzcabzdeqixbewgf`) |
| Deactivated-user auth loophole | Fixed | `a9e6717` — block at `checkAuth()`, login, reset-password (`profiles.is_active === false` only) |
| Events profile 406 hardening | Committed | `d1fec21` — `.maybeSingle()` + creator fallbacks (orthogonal to coordinator) |
| Profile/avatar RLS widening (092) | Discarded | Not needed; missing avatars were caused by deactivated test account (`is_active = false`), not Events/coordinator bugs |

---

## Manual QA checklist (staging)

Run on staging with a dedicated test user. Record pass/fail and date.

### Role & assignment

- [ ] **Event Coordinator** system role exists (`00000000-0000-0000-0000-000000000003`)
- [ ] Role permissions are **exactly** three keys:
  - [ ] `events.create`
  - [ ] `events.manage_all`
  - [ ] `events.banners`
- [ ] Role does **not** include `admin.dashboard`, `admin.members`, `finance.*`, `content.documents`, or other admin keys
- [ ] Test user assigned Event Coordinator via Admin → Roles / `member_roles`
- [ ] Test user `profiles.role` remains **`member`** (not `admin`)

### Portal Events — coordinator (positive)

- [ ] Can open **portal Events** (`portal/events.html`)
- [ ] **Create event** visible and works (`canCreateEvents()`)
- [ ] **Manage / edit** any event works (`canManageEvents()` — host controls, manage sheet, RSVP admin tools as designed)
- [ ] **Featured / banner** toggle works where UI exposes it (`canManageEventBanners()`)
- [ ] **Raffle** flows work: prizes, entries, winner update / prize storage paths covered by 091 policies

### Portal Events — normal member (negative)

- [ ] Member **without** coordinator role **cannot** create events (no create button / gate holds)
- [ ] Member **without** coordinator role **cannot** manage events they did not create (unless existing creator/host rules apply)

### Admin access (negative)

Coordinator must **not** reach:

- [ ] **Admin Hub** / `admin.dashboard` pages
- [ ] **Members admin** (`admin.members`)
- [ ] **Finance admin** (e.g. transactions, payouts, expenses)
- [ ] **LLC docs** / `content.documents` (or equivalent LLC document admin)

### Account lifecycle (coordinator test user)

- [ ] **Deactivated** coordinator (`profiles.is_active = false`) cannot sign in normally
- [ ] **Deactivated** coordinator cannot complete forgot-password → portal (`login.html?error=account_deactivated`)
- [ ] **Reactivated** coordinator (`is_active = true`) can sign in and Events QA above still passes

### Profile display (sanity)

- [ ] With **active** coordinator account, Discussion / Who’s coming show **real names/avatars** (not only “Member”) for other active members on the event
- [ ] Deactivated viewer showing “Member” / missing peer avatars is **expected** (037 RLS), not a coordinator regression

---

## Production rollout checklist

Complete after staging manual QA passes.

1. [ ] **Staging QA** — all items above signed off
2. [ ] **`pg_policies` verification** — confirm patched policies on production DB:
   - `raffle_winners_update_admin` uses `has_permission('events.manage_all')` (or event creator)
   - `raffle_prizes_delete` on `event-raffle-prizes` uses `has_permission('events.manage_all')`
   - Event Coordinator role + `role_permissions` rows present
3. [ ] **Apply migration 091** to production (and **090** if not already applied) — same process as staging; do not skip ordering / `--include-all` if CLI requires it
4. [ ] **Assign real coordinators** — production `member_roles` for trusted users only
5. [ ] **Live verifier / smoke checks**
   - `node test/_smoke-event-coordinator-permissions.js`
   - `node test/_smoke-event-coordinator-events-ui.js`
   - `node test/_smoke-event-coordinator-rls-migration.js`
   - `node test/_smoke-deactivated-user-auth-block.js`
6. [ ] **Monitor** browser console on portal Events + admin Events for 24–48h after rollout
7. [ ] **Monitor** Supabase logs for RLS/auth errors on `profiles`, `events`, raffle tables

---

## Known follow-ups (out of v1 rollout)

| Topic | Notes |
|-------|--------|
| Draft visibility | Decide whether coordinators see **all** drafts vs only own (`list.js` drafts query today may be creator-scoped) |
| Public ticket page | `events/index.html` does not load `js/auth/shared.js` — `canManageEvents()` no-op until helper loaded (optional) |
| Deactivate hardening | Optional: Auth **ban** / revoke sessions in `deactivate-user` edge function (emails may still send; browser gate is in place via `a9e6717`) |
| Tailwind CDN | `cdn.tailwindcss.com` production warning — separate cleanup, not blocker for coordinator RBAC |
| Public event profile display | Anonymous public event pages may still show “Member” for commenters; distinct from portal coordinator QA |
| `092` event display profiles | **Not approved** — do not apply RLS widening unless product explicitly requests inactive-member event visibility |

---

## Reference commits (master)

| Commit | Summary |
|--------|---------|
| Planning / audit docs | Event coordinator documentation chain |
| Permission helpers + Events UI | Phase 2–3 portal gates |
| `5373590` | Migration 091 + RLS smoke |
| `d1fec21` | Events profile 406 fallbacks |
| `a9e6717` | Deactivated-user auth block |

---

*Last updated: rollout doc created for pre-production sign-off.*
