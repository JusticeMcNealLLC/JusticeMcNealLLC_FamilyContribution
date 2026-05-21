# Event Coordinator Role — Audit & Implementation Plan

Date: 2026-05-21

Documentation and audit only. No runtime code, schema, RLS, Edge Function, or `portal/events.html` changes in this document.

## Related docs

| Doc | Purpose |
| --- | --- |
| `docs/improvements/pages/events/list.md` | Improvement backlog entry 001 |
| `docs/audit/pages/events/019_major_events_improvements_planning.md` | Refactor checkpoint; classifies permission work as schema/RLS-gated |
| `docs/audit/pages/events/018_phase_4i_live_verifier_status.md` | Live classic-runtime verifier (do not recreate) |

## 1. Goal

Introduce an **Event Coordinator** capability so designated users can perform **all Events-system admin actions globally**, without becoming full site admins.

### Intended capabilities (v1)

- Create events (`events.create`)
- Manage any event: edit metadata, status, hosts, RSVP tools, waitlist, refunds/cancellations where part of Events admin
- Open and use `EventsManage` / `EventsCreate` flows on `portal/events.html`
- Access `admin/events.html` (Events dashboard) if product wants parity with current admin event tooling
- Use host-style controls: scanner, competition moderation, raffle draw, documents (when treated as Events admin)
- Award event banners if that remains an Events admin action (`events.banners`)

### Explicit non-goals (v1)

- **No** `admin.dashboard`, members, orders, finance, tax, investments, brand, quests, LLC documents (non-event), roles admin, notifications, etc.
- **No** `profiles.role = 'admin'` as a side effect (must not sync via `admin.dashboard`)
- **No** Admin Hub link or unrelated admin tiles
- **No** per-event assignment (document as future improvement)
- **No** Phase 5 / compatibility-helper wiring / `portal/events.html` loader changes as part of this improvement

### Product decision (v1)

`event_coordinator` manages **all** Events admin actions **globally**. Per-event assignment is deferred.

---

## 2. Current Role Model

The site uses **two overlapping systems**. Both must be understood before adding `event_coordinator`.

### A. Legacy `profiles.role` (binary)

| Value | Meaning |
| --- | --- |
| `member` | Default portal user |
| `admin` | Legacy flag; synced from RBAC (see below) |

**Storage:** `profiles.role` — `TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin'))` (migrations `001`, `003`).

**Sync:** Trigger `sync_profile_role()` on `member_roles` (migration `079`) sets `profiles.role = 'admin'` iff the user holds **any** role with permission `admin.dashboard`; otherwise `'member'`.

**Implication:** A user with only `events.create` / `events.manage_all` / `events.banners` stays `profiles.role = 'member'`. There is **no** column value `event_coordinator` today.

### B. RBAC (`roles`, `role_permissions`, `member_roles`)

| System role | UUID | Notes |
| --- | --- | --- |
| **Owner** | `00000000-0000-0000-0000-000000000001` | All 22 permission keys including `admin.dashboard` and all Events keys |
| **Member** | `00000000-0000-0000-0000-000000000002` | No admin permissions |

Custom roles can be created in `admin/roles.html` (`js/admin/roles.js`) with arbitrary permission subsets.

**Permission check (client):** `hasPermission(key)` in `js/auth/shared.js` — reads `window.__userPermissions` loaded from `member_roles` → `role_permissions`.

**Permission check (DB):** `public.has_permission(permission_key)` and `public.user_has_permission(uid, perm)` (migration `078`, `080`).

**`is_admin()` (DB):** Redefined in migration `080` as `has_permission('admin.dashboard')` — not “any admin-like user.”

**`is_owner()` (DB):** Holds system role named `Owner`.

### Naming collision: “owner” vs “admin”

- **Owner** = RBAC system role (full permissions).
- **admin** in `profiles.role` = legacy boolean synced from `admin.dashboard` (typically Owner or custom role with that permission).
- **Event host** = per-event `event_hosts` row or `events.created_by` — not a global role.

---

## 3. Current Event Permission Model

### Permission keys (Events)

Defined in `js/admin/roles.js` / seeded in migration `078`:

| Key | Label | Typical use |
| --- | --- | --- |
| `events.create` | Create new events | Insert events (with `081` policy), portal Create button |
| `events.manage_all` | Edit/cancel any event | Full event RLS in `080`, manage sheet data, Edge Functions |
| `events.banners` | Award event banners | Admin events dashboard banners tab |

### Who can create events

| Layer | Rule |
| --- | --- |
| **RLS** | `events` INSERT: `has_permission('events.create') OR has_permission('events.manage_all')` (`081`, `080`) |
| **Portal UI** | `hasPermission('events.create') \|\| evtCurrentUserRole === 'admin'` — `init.js`, `list.js` (multiple CTAs) |
| **Gap** | User with `events.create` via RBAC but `profiles.role = member` gets UI if `hasPermission` runs; legacy `evtCurrentUserRole === 'admin'` fallback is redundant for Owner |

### Who can manage events (global)

| Layer | Rule |
| --- | --- |
| **RLS** | Most event child tables: `has_permission('events.manage_all')` (`080`) |
| **Portal host UI** | `isHost = creator \|\| event_hosts row \|\| evtCurrentUserRole === 'admin'` — `detail.js` |
| **Gap** | `events.manage_all` without `profiles.role = admin` does **not** set `isHost` today → no Manage sheet, scanner, host nav |
| **Manage sheet** | `EventsManage.open()` has **no** permission guard; relies on host UI entry + RLS on save |
| **Admin dashboard** | `admin/events.html` → `checkAuth({ permission: 'events.manage_all' })` — **blocked** by legacy `profiles.role` gate (see §8) |

### Who can edit title/description / status

- Host/creator via detail inline edit and `EventsManage` overview tab (RLS: host policies OR `events.manage_all`).
- Global managers need `events.manage_all` at RLS; UI requires `isHost` or admin profile role today.

### Who can access manage sheet

- Opened from detail/bottom nav when `isHost` (see above).
- Admin dashboard opens with `source: 'admin'` (extra admin-only UI blocks in sheet, e.g. featured toggle — no permission check in JS).

### Scanner / check-in

- `evtOpenScanner` from host UI / manage sheet; no separate role check in `scanner.js`.
- RLS `event_checkins` INSERT: creator, `event_hosts`, `events.manage_all`, or self check-in (`080`).

### RSVP / waitlist / refunds

- Host flows in `rsvp.js`, manage sheet; admin delete RSVP policy uses `events.manage_all` (`090`).
- `evtDeleteEvent` — **client-only** `evtCurrentUserRole === 'admin'` (`rsvp.js`); RLS delete uses `events.manage_all`.
- Edge: `process-event-cancellation` — host OR `user_has_permission(..., 'events.manage_all')`.
- Edge: `manage-event-participation` — host OR `events.manage_all`.
- Edge: `manage-event-waitlist` — service/cron; no user role check.

### Competition / raffle / documents

| Area | Frontend | Backend |
| --- | --- | --- |
| Competition UI | `isHost` in `competition.js` | Many policies still `profiles.role = 'admin'` in `068`, `069` |
| Raffle | Host + manage sheet | `064`, `087`, `088` mix `profiles.role = admin` and `080` `has_permission` |
| Documents | `isHost` hides member upload panel | `067` policies use `profiles.role = 'admin'` |
| Scrapbook | `evtCurrentUserRole === 'admin'` for upload/delete override | `080` includes `event_photos` for `events.manage_all` |

### Admin-only event controls (UI)

| Control | Current gate |
| --- | --- |
| Delete event | `evtCurrentUserRole === 'admin'` (`detail.js`, `rsvp.js`) |
| Draft events in list | `evtCurrentUserRole === 'admin'` + creator (`list.js`) |
| Featured toggle | Comment “admin only”; no JS permission check (`manage/sheet.js`) |
| Admin hub Events tile | `data-permission="events.manage_all"` + hub requires `admin.dashboard` |

### Public / ticket page

- `js/events/ticket.js`: `prof?.role === 'admin'` → `isHost` (legacy profile role only).

---

## 4. Cross-Site Role Usage

Places where `admin` / `profiles.role` appear **outside** portal Events — risk if `event_coordinator` is implemented as `profiles.role = 'admin'` or broad `is_admin()`:

| Area | Pattern | Risk for event_coordinator |
| --- | --- | --- |
| `js/auth/shared.js` `checkAuth({ permission })` | Sets `needsAdmin=true` → requires `profile.role === 'admin'` **before** `hasPermission` | **Blocks** `admin/events.html` and any permission-only admin page for coordinators |
| `js/auth/shared.js` `addAdminDashboardLink()` | `admin.dashboard` or `profile.role === 'admin'` | Correctly hidden if no `admin.dashboard` |
| `js/auth/login.js`, `reset-password.js`, `splash.js` | Redirect admins vs portal | Coordinators stay on portal paths |
| `js/admin/hub.js` | `admin.dashboard` | Hub hidden |
| `js/admin/*.js` | Per-page `checkAuth({ permission: '...' })` | All blocked by profile.role gate except users with `admin.dashboard` |
| `js/admin/profits.js`, `tax-prep.js` | Extra `profile.role !== 'admin'` | Defense in depth |
| `js/portal/feed/init.js`, `familyTree/*`, `profile/loader.js` | `role === 'admin'` for moderation/features | Coordinators must not gain feed/family admin powers |
| `js/admin/members/*` | `role === 'admin'` for counts/status | Unrelated |
| Non-event RLS / storage | `profiles.role = 'admin'` in many migrations | Must not grant coordinator access |

**Safe pattern:** Implement coordinator as **RBAC role + permission keys**, not as `profiles.role = 'admin'`.

---

## 5. Database / Supabase Audit

Do not modify yet. Checklist for implementation phase.

### `profiles.role`

- CHECK allows only `member`, `admin`.
- Adding literal `event_coordinator` requires migration altering CHECK + audit all readers.
- **Recommended v1:** Do **not** add a new `profiles.role` value; use RBAC role name `Event Coordinator` in `roles` table.

### `sync_profile_role` trigger (`079`)

- Only promotes to `admin` when `admin.dashboard` present.
- Coordinators with Events permissions only should remain `member` — **correct for isolation**.

### RLS — migrated vs legacy

**Uses `has_permission('events.*')` (migration `080`, `081`, `090`):**

- `events` (insert/update/delete rules)
- `event_checkins`, `event_hosts`, `event_cost_items`, `event_waitlist`, `event_refunds`
- `event_raffle_entries`, `event_raffle_winners`, `event_guest_rsvps`, `event_documents`, `event_locations`
- `competition_*`, `prize_pool_contributions`, `event_photos` (per `080` comments)
- Storage buckets tied in `080`

**Still uses `profiles.role = 'admin'` (needs migration to `has_permission` for coordinator access):**

- `063_events_tables.sql` — early event policies (may coexist with `080` policies)
- `066_llc_events_core.sql`
- `067_event_documents_map.sql`
- `064_event_raffle_tables.sql`
- `068_competition_events.sql`
- `069_event_polish_gamification.sql`
- `087_event_raffle_winner_choice_update.sql`
- `088_event_raffle_prizes_bucket.sql` (partial: admin-only write paths)

**Action:** Inventory live policies in Supabase (`pg_policies`) before coding; add migration replacing inline `profiles.role = 'admin'` on event-related tables with `has_permission('events.manage_all')` (or appropriate key).

### Edge / DB functions

- `is_admin()` → `admin.dashboard` only — coordinators should **not** pass.
- `has_permission()` / `user_has_permission()` — primary enforcement for coordinators.

### Seed role (recommended)

Insert system or documented custom role, e.g. **Event Coordinator**, with permissions:

- `events.create`
- `events.manage_all`
- `events.banners`

Explicitly **exclude** all `admin.*`, `finance.*`, `content.*` (except if product later splits event-document permissions).

---

## 6. Edge Function Audit

| Function | Role / permission check | event_coordinator v1 | Risk | Recommended change |
| --- | --- | --- | --- | --- |
| `process-event-cancellation` | Host OR `user_has_permission(..., 'events.manage_all')` | Allow | Low | None if RBAC role granted |
| `manage-event-participation` | Host OR `events.manage_all` | Allow | Low | None |
| `manage-event-waitlist` | Service role / cron | N/A | Low | None |
| `create-event-checkout` | Payment/business rules; no admin role | N/A | Low | None |
| `rsvp-guest-free`, `raffle-guest-free` | Guest flows | N/A | Low | None |
| `event-og` | Public | N/A | Low | None |
| `send-event-reminders` | Scheduled | Review caller | Med | Confirm no admin-only assumption |
| `invite-user` | `admin.invite` | **Deny** | Low | No change |
| `deactivate-user`, `reactivate-user` | `admin.members` | **Deny** | Low | No change |
| `sync-subscription` | `admin.members` | **Deny** | Low | No change |
| All finance/connect functions | Various `finance.*` / admin | **Deny** | Low | No change |

No Edge Function changes required for v1 if coordinators receive `events.manage_all` and RLS legacy policies are fixed.

---

## 7. Frontend Audit

### Events portal (`js/portal/events/`)

| File | Issue | Change type |
| --- | --- | --- |
| `init.js` | Create button: `hasPermission('events.create') \|\| evtCurrentUserRole === 'admin'` | Add `canCreateEvents()` helper |
| `list.js` | Same for CTAs; drafts gated on `evtCurrentUserRole === 'admin'` | Use `canManageEvents()` for drafts/global manage |
| `detail.js` | `isHost` includes only `evtCurrentUserRole === 'admin'`; delete gated on admin profile | `isHost` should include `hasPermission('events.manage_all')`; delete uses `canManageEvents()` |
| `rsvp.js` | `evtDeleteEvent` admin profile check | `canManageEvents()` |
| `scrapbook.js` | Admin profile for upload/delete override | `canManageEvents()` |
| `manage/sheet.js` | No open guard; featured toggle unguarded | Optional open guard; gate featured on `events.banners` or `canManageEvents()` |
| `create/sheet.js` | Relies on entry points | Indirect via create gates |
| `documents.js`, `competition.js`, `map.js`, `scanner.js`, `raffle.js` | Host via `isHost` from detail | Fixed when `isHost` definition fixed |
| `state.js` | `evtCurrentUserRole` | Keep for compat; prefer helpers |
| `compat/external-globals.js` | Documents `hasPermission` dependency | Helpers should use same contract |

### Shared auth

| File | Issue |
| --- | --- |
| `js/auth/shared.js` | `checkAuth({ permission })` incorrectly requires `profiles.role === 'admin'` for **all** permission-gated admin pages |

**Required fix for coordinator access to `admin/events.html`:** Split “admin area login” from “permission check” — e.g. only require `profile.role === 'admin'` when `permissionKey === 'admin.dashboard'`, or add `checkAuth({ permission, skipLegacyAdminRole: true })`.

### Admin

| File | Notes |
| --- | --- |
| `admin/index.html` | Events tile uses `events.manage_all`; hub still needs `admin.dashboard` |
| `js/admin/events-dashboard.js` | `events.manage_all` — blocked by `checkAuth` legacy gate |
| `js/admin/hub.js` | Hides tiles by permission — coordinator won't see hub without `admin.dashboard` |

### Public events

| File | Notes |
| --- | --- |
| `js/events/ticket.js` | `prof?.role === 'admin'` for host — update to permission-aware helper or shared host check |

### Must NOT change (for coordinator isolation)

- Unrelated `js/admin/*` pages (except `checkAuth` shared fix and optional deep-link to events dashboard).
- `portal/events.html` script list (per task constraint).

---

## 8. Permission Design Recommendation

**Do not** implement `event_coordinator` as `profiles.role = 'admin'`.

### Recommended model (v1)

1. **RBAC role** in `roles` table: name `Event Coordinator` (display); store permissions on `role_permissions`.
2. **Permission bundle:** `events.create`, `events.manage_all`, `events.banners`.
3. **Client helpers** (new, in `js/auth/shared.js` or `js/portal/events/permissions.js`):

```javascript
function canCreateEvents() {
  return hasPermission('events.create') || hasPermission('events.manage_all');
}
function canManageEvents() {
  return hasPermission('events.manage_all');
}
function canManageEventBanners() {
  return hasPermission('events.banners') || hasPermission('events.manage_all');
}
function canAccessAdminDashboard() {
  return hasPermission('admin.dashboard');
}
function canManageUsers() { return hasPermission('admin.members'); }
function canManageOrders() { return false; /* or future key */ }
```

4. **Replace** `evtCurrentUserRole === 'admin'` in Events code with `canManageEvents()` / `canCreateEvents()` where the intent is “global event admin,” not “full site admin.”
5. **Keep** creator / `event_hosts` checks for per-event host behavior.
6. **`evtCurrentUserRole`:** Deprecate gradually; still loaded for onboarding skip and legacy paths.

### `isHost` recommendation

```javascript
const isGlobalEventManager = canManageEvents();
const isHost = isCreator || !!hostRecord || isGlobalEventManager;
```

### Admin page access

- Coordinators should reach **`admin/events.html` only** (optional product choice) via fixed `checkAuth`, not full hub.
- Alternative: portal-only management (no admin HTML) — simpler but loses banners/revenue table unless ported.

**Rule:** `event_coordinator` passes Events helpers; fails `canAccessAdminDashboard()`, `canManageUsers()`, finance/content admin helpers.

---

## 9. Implementation Plan

### Phase 1 — Audit and permission design (this document)

- [x] Inventory roles, permissions, RLS, Edge Functions, frontend gates
- [ ] Product sign-off on admin/events.html access vs portal-only

### Phase 2 — Shared permission helper update

- Add `canCreateEvents`, `canManageEvents`, `canManageEventBanners`, etc.
- Fix `checkAuth({ permission })` legacy `profiles.role` coupling
- Do **not** grant unrelated admin permissions

### Phase 3 — Events frontend update

- Update `isHost`, create CTAs, delete, drafts, scrapbook, ticket page
- Gate featured toggle / admin-only sheet sections
- No `portal/events.html` structural change

### Phase 4 — Supabase / RLS / Edge Function updates

- Seed **Event Coordinator** role + permissions
- Migration: replace remaining event-related `profiles.role = 'admin'` policies with `has_permission(...)`
- Verify `080` policies are authoritative on production
- Edge functions: confirm no change beyond RBAC assignment

### Phase 5 — Tests

Static smokes:

- `hasPermission` / helper behavior
- `checkAuth` allows `events.manage_all` with `profiles.role = member`

E2E (seeded accounts):

| Account | manage events | create | admin hub | members admin |
| --- | --- | --- | --- | --- |
| Owner/admin | yes | yes | yes | yes |
| event_coordinator | yes | yes | no | no |
| member | no | no | no | no |
| host (creator only) | own event | if granted | no | no |

### Phase 6 — Deployment and live verification

- Assign test user `member_roles` → Event Coordinator role
- Verify portal create/manage/delete, RLS writes, raffle/documents/competition
- Verify negative: finance admin, members, hub
- Re-run `test/_verify-events-live-globals.js` if runtime touched (later phase)

---

## 10. Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Granting `admin.dashboard` or `profiles.role = admin` by mistake | **Critical** | Use Events-only permission bundle; code review |
| `checkAuth` blocks coordinators on `admin/events.html` | **High** | Phase 2 fix |
| UI allows action but legacy RLS denies (raffle, competition, documents) | **High** | Phase 4 policy migration + live policy audit |
| `isHost` not updated → coordinator sees member UI only | **High** | Phase 3 |
| `evtDeleteEvent` client gate vs RLS mismatch | Med | Align on `canManageEvents()` |
| Featured toggle / financial admin views exposed in manage sheet | Med | Permission-gate UI sections |
| `addAdminDashboardLink` shows hub if mis-assigned `admin.dashboard` | Med | Never assign that permission |
| Tests lack coordinator fixture | Med | Seed role + test user in Phase 5 |
| Confusion between RBAC “Owner” and profile “admin” | Low | Document in admin training |
| Phase 5 / helper wiring accidentally started | Med | Keep scope boundaries in PR |

---

## 11. Questions / Follow-ups

| Question | v1 assumption |
| --- | --- |
| Should coordinators manage **all** events or only assigned? | **All** (global) |
| See event finances / revenue in admin dashboard? | **Yes** if they use `admin/events.html`; portal manage sheet already shows money metrics — confirm product |
| Manage refunds/cancellations? | **Yes** via `events.manage_all` + existing flows |
| Manage competitions / raffles / documents? | **Yes** (Events admin); requires RLS migration |
| Per-event assignment later? | Document as **002** future improvement |
| Portal-only vs `admin/events.html`? | **Open** — recommend portal + fixed deep-link to events dashboard for banners/revenue |
| Rename permission keys vs role display name? | Use RBAC role **Event Coordinator**; no new `profiles.role` enum value in v1 |
| Should coordinators delete events? | Treat same as admin event delete if they have `events.manage_all` |
| Onboarding: skip for coordinators? | Likely yes if they are staff; decide in Phase 2 (`checkAuth` onboarding branch uses `profile.role !== 'admin'`) |

### Future improvement (not v1)

- **002 — Per-event coordinator assignment** (`event_hosts` role expansion or new table)
- Split `events.documents` permission from `content.documents` if LLC doc overlap becomes an issue

---

## Appendix A — Search inventory (2026-05-21)

Terms searched: `admin`, `owner`, `member`, `event_coordinator`, `hasPermission`, `role`, `evtCurrentUserRole`, `profiles`, `is_admin`, `events.create`, `events.manage_all`, `EventsManage`, `EventsCreate`.

**`event_coordinator`:** no matches in codebase (greenfield).

**Events-related permission files:** `init.js`, `list.js`, `detail.js`, `rsvp.js`, `scrapbook.js`, `manage/sheet.js`, `create/sheet.js`, `admin/events-dashboard.js`, `js/auth/shared.js`, `078`–`081`, `080` events section, `090`, Edge functions listed in §6.

**Existing audit docs (not modified):** `018_phase_4i_live_verifier_status.md`, `019_major_events_improvements_planning.md`.
