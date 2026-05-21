# Event Coordinator — Supabase / RLS / RBAC Plan (Phase 4)

Date: 2026-05-21

Documentation and audit only. **No migrations, RLS, Edge Functions, or app code changes** in this phase.

Related:

- `docs/improvements/pages/events/moderation/000_event_coordinator_role_audit.md` — original cross-stack audit
- `docs/improvements/pages/events/list.md` — improvement 001 backlog entry

Completed client phases:

- **Phase 2** — `canCreateEvents()`, `canManageEvents()`, `canManageEventBanners()`, `checkAuth({ permission })` fix (`js/auth/shared.js`)
- **Phase 3** — Portal Events UI gates (`js/portal/events/*`, `js/events/ticket.js` optional helper)

---

## 1. Executive summary

Event Coordinator v1 should be implemented as an **RBAC role** in `roles` / `role_permissions` / `member_roles`, **not** as a new `profiles.role` value. Coordinators keep `profiles.role = member` unless they separately hold `admin.dashboard`.

**Good news:** Migration `080` and `081` already moved most core Events tables to `public.has_permission('events.create')` / `events.manage_all`. Edge functions `process-event-cancellation` and `manage-event-participation` already use `user_has_permission(..., 'events.manage_all')`.

**Gap:** A small set of **post-080** policies still gate on `profiles.role = 'admin'`. Those will block coordinators at the database layer even though Phase 3 UI allows actions. A focused follow-up migration is required.

**RBAC seed:** Recommend a **system role migration** (fixed UUID) plus assignment via admin UI — not a `profiles.role` enum change.

**Edge functions:** No code changes required for v1 coordinator flows already using `events.manage_all`.

---

## 2. RBAC role seed recommendation

### 2.1 Where permissions are defined today

| Layer | Location | Notes |
| --- | --- | --- |
| DB seed (Owner) | `supabase/migrations/078_roles_permissions.sql` | Inserts all 22 permission keys on Owner role `00000000-0000-0000-0000-000000000001` |
| DB functions | `078` — `has_permission()`, `is_owner()`; `080` — `user_has_permission(uid, perm)` | Client + Edge Function checks |
| Profile sync | `079` / `081` — `sync_profile_role()` trigger | Sets `profiles.role = admin` only when user has `admin.dashboard` |
| Admin UI catalog | `js/admin/roles.js` — `PERM_CATALOG` | Same 22 keys; used to edit custom roles |
| Legacy profile column | `profiles.role` CHECK `('member', 'admin')` | `001`, `003` — **do not extend for Event Coordinator** |

### 2.2 System roles today

| Role | UUID | Permissions |
| --- | --- | --- |
| Owner | `00000000-0000-0000-0000-000000000001` | All 22 keys (full admin + events) |
| Member | `00000000-0000-0000-0000-000000000002` | None |

Custom roles: created in `admin/roles.html` → `roles` + `role_permissions`; users assigned via `member_roles`.

### 2.3 Recommended v1 role

| Field | Value |
| --- | --- |
| **Display name** | `Event Coordinator` |
| **Suggested DB name** | `Event Coordinator` (unique in `roles.name`) |
| **Suggested system UUID** | `00000000-0000-0000-0000-000000000003` (new, next after Member) |
| **is_system** | `TRUE` (undeletable like Owner/Member; prevents accidental removal) |
| **position** | e.g. `50` (between Owner and Member) |
| **icon / color** | e.g. `🎟️` / `#2563eb` (product choice) |

**Permission keys (exact):**

```
events.create
events.manage_all
events.banners
```

**Explicitly excluded:**

```
admin.dashboard
admin.roles
admin.members
admin.invite
admin.notifications
admin.brand
finance.*
content.documents   (LLC documents — not event_documents)
content.quests
content.banners     (catalog banners — not events.banners)
content.family_approvals
```

### 2.4 Seed via migration vs admin UI

| Approach | Recommendation |
| --- | --- |
| **Migration seed (recommended)** | Insert role + `role_permissions` in SQL so dev/staging/prod share the same role ID and permission bundle. Reproducible deploys. |
| **Admin UI only** | Possible but error-prone (manual clicks, drift between environments). Use UI only to **assign** users to the seeded role. |
| **profiles.role** | **Do not** add `event_coordinator` to CHECK constraint. |

After migration, owners use **Admin → Roles** to grant the role to users (`member_roles` insert). No change to `js/admin/roles.js` required for v1 if permissions already exist in `PERM_CATALOG.Events`.

### 2.5 `profiles.role` behavior for coordinators

- `sync_profile_role()` only promotes to `admin` when `admin.dashboard` is present (`079`, `081`).
- Event Coordinator permissions alone → **`profiles.role` stays `member`** ✓
- Owner users already have all Events permissions via Owner role.

---

## 3. Current RLS findings

### 3.1 How PostgreSQL RLS applies here

- Policies are **permissive** (OR): if **any** policy allows an operation, it succeeds.
- Migration `080` used `DROP POLICY IF EXISTS` + `CREATE` for many policies **by name**, replacing older `profiles.role = admin` definitions.
- Policies **not** dropped/replaced in `080`+ remain as additional OR branches (usually harmless) or as **sole** gates (blocking).

### 3.2 Already coordinator-ready (has_permission)

These were updated in `080` / `081` / `090` (representative list):

| Table / resource | Policy pattern | Permission |
| --- | --- | --- |
| `events` | INSERT | `events.create` OR `events.manage_all` (`081`) |
| `events` | UPDATE / DELETE | `events.manage_all` |
| `event_checkins` | INSERT | creator / host / `events.manage_all` |
| `event_hosts` | INSERT / DELETE | creator / `events.manage_all` |
| `event_cost_items` | INSERT / UPDATE / DELETE | `events.manage_all` |
| `event_waitlist` | ALL (`waitlist_admin_all`) | `events.manage_all` |
| `event_refunds` | SELECT (`refunds_select_admin`) | `events.manage_all` |
| `event_raffle_entries` | DELETE | `events.manage_all` |
| `event_raffle_winners` | INSERT / DELETE | `events.manage_all` (+ creator on INSERT) |
| `event_guest_rsvps` | DELETE (`guest_rsvps_admin_delete`) | `events.manage_all` (`080`) |
| `event_rsvps` | DELETE (`rsvps_delete_managed_events`) | `events.manage_all` + host (`090`) |
| `event_documents` | SELECT / INSERT / UPDATE / DELETE | `events.manage_all` + host paths |
| `event_locations` | SELECT | RSVP going OR `events.manage_all` |
| `competition_phases` | ALL (`comp_phases_admin_all`) | `events.manage_all` |
| `competition_entries` | ALL (`comp_entries_admin_all`) | `events.manage_all` |
| `competition_votes` | ALL | `events.manage_all` |
| `competition_winners` | ALL | `events.manage_all` |
| `prize_pool_contributions` | ALL | `events.manage_all` |
| `event_photos` | DELETE | owner OR `events.manage_all` |
| Storage `event-banners` | upload / delete | `events.manage_all` |
| Storage `event-documents` | upload / delete | `events.manage_all` |
| Storage `competition-entries` | delete | owner folder OR `events.manage_all` |
| Storage `event-photos` | delete (`evt_photo_delete`) | owner OR `events.manage_all` |

`is_admin()` (migration `080`) = `has_permission('admin.dashboard')` only — coordinators must **not** rely on `is_admin()` for Events access.

### 3.3 Legacy policies still blocking coordinators

These use `profiles.role = 'admin'` and were **not** superseded by `has_permission` (or were added after `080`):

| Migration | Table / bucket | Policy name | Operation | Issue |
| --- | --- | --- | --- | --- |
| `087` | `event_raffle_winners` | `raffle_winners_update_admin` | UPDATE | Admin profile or event creator only — **no `events.manage_all`** |
| `088` | storage `event-raffle-prizes` | `raffle_prizes_delete` | DELETE | Admin profile only |
| `088` | storage `event-raffle-prizes` | `raffle_prizes_update` | UPDATE | `admin` or `member` — coordinators can update as members ✓ |
| `088` | storage `event-raffle-prizes` | `raffle_prizes_upload` | INSERT | `admin` or `member` — coordinators can upload ✓ |

### 3.4 Policies that should remain unchanged (non-coordinator)

Do **not** widen these for Event Coordinator:

| Area | Example migrations | Gate | Reason |
| --- | --- | --- | --- |
| LLC documents | `053_llc_documents.sql` | `content.documents` / `profiles.role = admin` | Not Events |
| Finances | `080` finance section | `finance.*` | Not Events |
| Admin hub data | profiles, subscriptions, deposits, etc. | `admin.*` | Not Events |
| Member management | `admin.members` Edge Functions | `admin.members` | Not Events |
| Quests / feed / family | `080` content.* | `content.quests`, etc. | Not Events |
| `is_admin()` callers outside Events | various | `admin.dashboard` | Full admin only |

### 3.5 Optional enhancement (not required for minimal v1)

| Topic | Current behavior | Recommendation |
| --- | --- | --- |
| Draft event visibility | `events_select_published` — drafts visible to `created_by` only (`063`) | Coordinators with `events.manage_all` may not see **other users’** drafts in list queries. Consider **new SELECT policy** OR extend query in app. Product decision. |
| `events.banners` vs `is_featured` | Featured toggle updates `events.is_featured` via `events_update_admin` → needs `events.manage_all` ✓ | `events.banners` used for admin dashboard banner awards; coordinator has key. Featured column does not need separate RLS if `manage_all` present. |

### 3.6 `event_documents` vs LLC `content.documents`

- **`event_documents`** table: governed by Events policies in `080` — coordinator with `events.manage_all` ✓
- **`llc_documents`** / `content.documents`: separate — coordinator must **fail** ✓

---

## 4. Edge Function findings

| Function | Auth / permission check | Coordinator v1 | Code change? | Risk |
| --- | --- | --- | --- | --- |
| `process-event-cancellation` | `user_has_permission(uid, 'events.manage_all')` OR creator OR `event_hosts` | Pass | **No** | Low |
| `manage-event-participation` | Same pattern | Pass | **No** | Low |
| `manage-event-waitlist` | Service role / cron; no user role | N/A | **No** | Low |
| `create-event-checkout` | Payment/business rules | N/A (attendee) | **No** | Low |
| `rsvp-guest-free` | Guest flow | N/A | **No** | Low |
| `raffle-guest-free` | Guest flow | N/A | **No** | Low |
| `event-og` | Public | N/A | **No** | Low |
| `send-event-reminders` | Service role cron | N/A | **No** | Low |
| `invite-user` | `admin.invite` | **Deny** | **No** | Low |
| `deactivate-user` / `reactivate-user` | `admin.members` | **Deny** | **No** | Low |
| `sync-subscription` | `admin.members` | **Deny** | **No** | Low |
| Finance / payout functions | `finance.*` | **Deny** | **No** | Low |

**Conclusion:** No Edge Function changes required for Event Coordinator v1 if RBAC role is assigned and RLS gaps in §3.3 are fixed.

---

## 5. Draft migration strategy (DO NOT APPLY YET)

**Proposed file:** `supabase/migrations/091_event_coordinator_rbac_and_rls.sql`

Two parts: (A) RBAC seed, (B) RLS policy fixes.

### 5.1 Part A — RBAC seed (DRAFT SQL)

```sql
-- DRAFT — not applied
-- Event Coordinator system role (v1)

INSERT INTO roles (id, name, color, icon, position, is_system)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'Event Coordinator',
    '#2563eb',
    '🎟️',
    50,
    TRUE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission) VALUES
    ('00000000-0000-0000-0000-000000000003', 'events.create'),
    ('00000000-0000-0000-0000-000000000003', 'events.manage_all'),
    ('00000000-0000-0000-0000-000000000003', 'events.banners')
ON CONFLICT DO NOTHING;

-- Optional: backfill member_roles for known test coordinator UUID
-- INSERT INTO member_roles (user_id, role_id, granted_by) VALUES (...);
```

**Do not:**

- Alter `profiles.role` CHECK
- Grant `admin.dashboard`
- Modify `sync_profile_role()` logic

### 5.2 Part B — RLS fixes (DRAFT SQL)

```sql
-- DRAFT — not applied
-- Fix post-080 legacy admin-profile gates for Events

-- 087: raffle winner choice updates
DROP POLICY IF EXISTS raffle_winners_update_admin ON event_raffle_winners;
CREATE POLICY raffle_winners_update_admin ON event_raffle_winners
    FOR UPDATE
    USING (
        public.has_permission('events.manage_all')
        OR EXISTS (SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid())
    )
    WITH CHECK (
        public.has_permission('events.manage_all')
        OR EXISTS (SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid())
    );

-- 088: raffle prize image storage delete
DROP POLICY IF EXISTS raffle_prizes_delete ON storage.objects;
CREATE POLICY raffle_prizes_delete ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'event-raffle-prizes'
        AND auth.uid() IS NOT NULL
        AND public.has_permission('events.manage_all')
    );

-- Optional: align UPDATE with manage_all (today allows any member)
-- DROP POLICY IF EXISTS raffle_prizes_update ON storage.objects;
-- CREATE POLICY ... has_permission('events.manage_all') OR host/creator ...
```

### 5.3 Optional Part C — draft SELECT for all drafts (product-gated)

```sql
-- DRAFT — only if product wants coordinators to see all draft events
CREATE POLICY events_select_manage_all_drafts ON events
    FOR SELECT USING (
        public.has_permission('events.manage_all')
    );
-- Note: OR-combines with events_select_published; may expose draft rows globally to managers.
```

### 5.4 Pre-deploy verification on live Supabase

Before applying migration, run on target project:

```sql
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE tablename IN (
  'events', 'event_raffle_winners', 'event_documents', 'competition_phases'
)
OR policyname ILIKE '%raffle%'
ORDER BY tablename, policyname;
```

Confirm which policies exist in production (names may differ if manual edits occurred).

### 5.5 Rollback plan

- RBAC: `DELETE FROM member_roles WHERE role_id = '...0003'`; `DELETE FROM role_permissions WHERE role_id = '...0003'`; `DELETE FROM roles WHERE id = '...0003'`
- RLS: re-run previous policy definitions from `087` / `088` or restore from migration down script

---

## 6. Test plan

### 6.1 Before migration (baseline)

Document current behavior with test accounts:

| Account | Roles / permissions | Expected today |
| --- | --- | --- |
| Owner | Owner system role | Full access |
| Legacy admin profile | `admin.dashboard` + synced `profiles.role = admin` | Full access |
| Member | Member only | Portal member, no create/manage |
| Coordinator (manual) | Assign `events.*` via custom role **before** system seed | UI works (Phase 3); RLS may fail on raffle UPDATE / prize delete |

### 6.2 After RBAC seed + RLS migration

| Test | Pass criteria |
| --- | --- |
| Admin/Owner manage events | Unchanged |
| Coordinator create event | INSERT succeeds with `events.create` |
| Coordinator edit any event | UPDATE succeeds with `events.manage_all` |
| Coordinator delete event | DELETE succeeds with `events.manage_all` |
| Coordinator featured toggle | UPDATE `events.is_featured` succeeds |
| Coordinator raffle draw / winner choice | UPDATE `event_raffle_winners` succeeds |
| Coordinator delete raffle prize image | Storage DELETE on `event-raffle-prizes` succeeds |
| Coordinator competition phase advance | `competition_*` admin policies pass |
| Coordinator event documents | CRUD on `event_documents` + storage |
| Coordinator refunds / cancellation | Edge function + `event_refunds` read |
| Member without permissions | UI hidden; RLS denies writes |
| Coordinator → profiles | `profiles.role = member` |
| Coordinator → admin hub | `checkAuth({ permission: 'admin.dashboard' })` fails |
| Coordinator → `llc_documents` | SELECT/INSERT denied |
| Coordinator → `manual_deposits` | denied (`finance.deposits`) |

### 6.3 Automated tests to add (Phase 5 / post-migration)

- Static: migration file contains seed UUID and three permission keys only
- SQL policy test script (optional): document expected `pg_policies` rows
- E2E with seeded coordinator user (after test account + role assignment)
- Re-run `test/_smoke-event-coordinator-permissions.js` and `test/_smoke-event-coordinator-events-ui.js`

---

## 7. Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Assuming `080` applied everywhere but prod drift | High | `pg_policies` audit before migrate |
| OR policies hide missing migration (legacy + new both exist) | Med | Live policy inventory |
| Seeding role without assigning users | Med | Document assignment steps in deploy runbook |
| Accidentally granting `admin.dashboard` | Critical | Code review seed SQL; only three keys |
| `events_select_manage_all_drafts` over-exposes drafts | Med | Product sign-off before Part C |
| Coordinator blocked on one raffle path while UI works | High | Fix `087` / `088` in Part B |
| `content.documents` confused with `event_documents` | Med | Keep permissions separate in docs/training |

---

## 8. Open questions

| Question | v1 recommendation |
| --- | --- |
| Seed role in migration or manual UI? | **Migration seed** + UI assignment |
| See event money/revenue? | Yes via `events.manage_all` (manage sheet / admin events dashboard); no finance tables |
| Delete events? | Yes — RLS `events_delete_admin` uses `events.manage_all`; UI uses `canManageEvents()` |
| Manage refunds? | Yes — `event_refunds` SELECT + cancellation Edge Function with `events.manage_all` |
| Event documents vs LLC docs? | **event_documents** only; not `content.documents` |
| See all drafts vs own drafts? | **Open** — optional Part C migration |
| `events.banners` vs featured hero? | Featured uses `events.manage_all` on `events` row; banner awards use `events.banners` in admin UI |
| Load `shared.js` on public `events/index.html` for ticket host? | Optional app follow-up (not RLS) |

---

## 9. Recommended next step

1. **Product sign-off** on this plan and open questions (especially draft visibility).
2. **Approve** draft migration `091_event_coordinator_rbac_and_rls.sql` (RBAC seed + §5.2 RLS fixes only).
3. Run **`pg_policies` audit** on staging/production.
4. Apply migration to staging → manual QA with coordinator test user.
5. **Phase 5** — E2E tests + assign production coordinators via `member_roles`.

Do **not** start Phase 5 module entry or modify `portal/events.html`.

---

## Appendix — Policy migration matrix

| Object | Policy | Current gate (blocking?) | Recommended permission |
| --- | --- | --- | --- |
| `event_raffle_winners` | `raffle_winners_update_admin` | `profiles.role = admin` OR creator (**blocks coordinator**) | Add `has_permission('events.manage_all')` |
| `storage.objects` | `raffle_prizes_delete` | `profiles.role = admin` (**blocks**) | `has_permission('events.manage_all')` |
| `events` | `events_*` | Already `has_permission` | No change |
| `event_documents` | `event_docs_*` | Already `has_permission` | No change |
| `competition_*` | `comp_*_admin_all` | Replaced in `080` | No change |
| `llc_documents` | `admin_*` | `content.documents` | **Do not change** |
