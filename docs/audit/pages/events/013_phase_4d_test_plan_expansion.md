# Events Refactor Phase 4D Test Plan Expansion

Date: 2026-05-21

This document expands the test plan for the portal events refactor before any module-entry work, `portal/events.html` cleanup, compatibility wrapper implementation, physical file splitting, fixture creation, or database changes.

This phase is documentation only. It does not implement tests, create fixtures, modify runtime code, edit `portal/events.html`, modify database data, or start Phase 5.

References:

- `docs/audit/pages/events/009_phase_4_preparation_plan.md`
- `docs/audit/pages/events/010_phase_4a_state_data_boundary_inventory.md`
- `docs/audit/pages/events/011_phase_4b_compatibility_wrapper_design.md`
- `docs/audit/pages/events/012_phase_4c_module_import_map_design.md`

## 1. Current Test Coverage Summary

Current Phase 1-3E testing is strongest around static compatibility invariants and live global surface checks. It does not yet provide reliable seeded coverage for full event workflows.

| Test file | Purpose | What it protects | Static or live | Credentials needed | Limitations |
| --- | --- | --- | --- | --- | --- |
| `test/_smoke-phase1-bridge.js` | Static smoke for Phase 1 init bridge. | `init.js` duplicate guard, named `initEventsPage()`, `window.PortalEvents.initEventsPage`, classic `DOMContentLoaded` registration, classic `index.js` namespace seed, no `type="module"` entry. | Static. | No. | Regex/file-content based; does not prove runtime listener behavior beyond source invariants. |
| `test/_smoke-phase2-low-risk-modules.js` | Static smoke for Phase 2 constants and raffle-model bridges. | Bare constants remain classic-compatible, `window.PortalEvents.constants`, `window.EventsRaffleModel`, `window.PortalEvents.raffleModel`, classic loader invariants. | Static. | No. | Does not execute real raffle/create/manage/detail flows. |
| `test/_smoke-phase3a-list-bridge.js` | Static smoke for Phase 3A list bridge. | `window.PortalEvents.list` keys, list helper exports, prior Phase 1/2 bridge regressions. | Static. | No. | Does not prove seeded list rendering or filter behavior in browser. |
| `test/_smoke-phase3b-detail-bridge.js` | Static smoke for Phase 3B detail bridge. | `window.PortalEvents.detail`, detail registry, detail public helpers, prior bridge regressions. | Static. | No. | Does not prove direct detail URL, feature sections, or generated inline handlers in browser. |
| `test/_smoke-phase3c-manage-bridge.js` | Static smoke for Phase 3C manage bridge. | `window.PortalEvents.manage`, `window.EventsManage`, manage/detail registration, prior bridge regressions. | Static. | No. | Does not prove edit/save, tab switching, admin action behavior, or seeded manage data. |
| `test/_smoke-phase3d-create-bridge.js` | Static smoke for Phase 3D create bridge. | `window.PortalEvents.create`, `window.EventsCreate`, safe namespace seeding, prior bridge regressions. | Static. | No. | Does not prove successful create submit, upload, validation, or draft/publish flows. |
| `test/_smoke-phase3e-competition-bridge.js` | Static smoke for Phase 3E competition bridge. | Competition legacy `evt*` functions, inline handler strings, `window.PortalEvents.competition` assignments, external dependency strings, table/storage strings, prior bridge regressions. | Static. | No. | Does not execute competition join/submit/vote/moderation/phase/finalize flows. |
| `test/_e2e-phase1-bridge.js` | Playwright live E2E for Phase 1 bridge. | Admin/member login, events page boot, `window.PortalEvents.initEventsPage`, duplicate init guard, create button visibility, create sheet open/close, console/network health. | Live Playwright against `https://justicemcneal.com`. | Yes: `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_MEMBER_EMAIL`, `E2E_MEMBER_PASSWORD`. | Skips detail/manage/back flow when there are no event cards; member path can skip render if `checkAuth()` returns null for the account/profile; depends on live data. |
| `test/_e2e-phase3d-create-bridge.js` | Playwright live E2E for Phase 3D create bridge. | Admin login, prior Phase 1-3C globals, `window.EventsCreate`, `window.PortalEvents.create`, create sheet open/close and singleton DOM. | Live Playwright; defaults to live site but supports `E2E_BASE_URL`. | Yes, currently has env fallback credentials in file; should be moved to env-only before hardening. | Does not submit a created event; uses fixed local Chromium path; mostly validates bridge/sheet availability. |
| `test/_verify-phase3a-live.js` | Live verifier for Phase 3A list globals. | Live `window.PortalEvents.list` keys, legacy list `window.evt*` globals, Phase 1/2 globals, browser fetch probe for live `list.js`. | Live Playwright. | Yes, currently includes hardcoded admin credentials in the script; should be converted to env-only. | Appears in current worktree; commit/tracking state should be confirmed before relying on it. Focuses on globals, not user workflows. |
| `test/_verify-phase3b-live.js` | Live verifier for Phase 3B detail globals. | Intended to verify live detail bridge/globals and prior bridge regressions. | Live Playwright. | Likely yes; exact credential handling should be reviewed before hardening. | Appears in current worktree; commit/tracking state and current assertion scope should be confirmed. |
| `test/_verify-phase3c-live.js` | Live verifier for Phase 3C manage globals. | `window.PortalEvents.manage`, `window.EventsManage`, `_emToggleFeatured`, detail registry manage registration, prior Phase 1-3A globals. | Live Playwright. | Yes, currently has env fallback credentials and fixed Chromium path. | Checks live globals and registry, not full manage edit/save behavior; page error listener appears attached after navigation in the sampled file, so it may miss early errors. |

Additional existing event smoke tests cover many UI polish and feature slices, such as event CSS, calendar/search/chips/hero/rails, guest ticket lookup, raffle model, and manage command tabs. They are useful regression guards but are not yet a Phase 5 readiness suite for module entry.

Unclear items:

- No dedicated committed `test/_verify-phase3e-live.js` file was found. Phase 3E live verification was performed as a focused Playwright command during the earlier phase, but should be consolidated into a reusable script before Phase 5.
- `test/_verify-phase3a-live.js` and `test/_verify-phase3b-live.js` currently appear as untracked files in the worktree status. Confirm whether they should be committed, rewritten, or replaced by a consolidated live verifier.

## 2. Current Coverage Gaps

Known gaps before module-entry work:

- No reliable seeded event detail flow that always has a known event card and known direct detail URL.
- No full manage edit/save E2E for title, description, status, media, tabs, documents, raffle, competition, and danger actions.
- No competition event interaction E2E for join, submit, vote, moderate, phase transition, prize contribution, finalization, and tier recalculation.
- No RSVP/waitlist fixture coverage for going/cancel/waitlist/claim/grace refund paths.
- No documents upload/download/delete/distribution fixture coverage.
- No map/scanner lifecycle fixture coverage for Leaflet init, realtime cleanup, geolocation toggles, camera stream cleanup, and QR scan paths.
- No scrapbook fixture coverage for upload/view/delete/permissions.
- No missing optional dependency tests for `QRCode`, `jsQR`, `L`, notification helpers, or push helpers.
- No required dependency failure-mode tests for `supabaseClient`, `checkAuth`, `hasPermission`, or `callEdgeFunction`.
- No full module-entry rehearsal yet.
- No single consolidated live verifier that checks all current `window.PortalEvents.*`, `window.Events*`, representative `window.evt*`, bare asset URLs, and console/page errors after deployment.
- No rollback rehearsal that proves the classic script list can be restored quickly if a module entry fails live verification.
- No automated check that changed bare JS assets are refreshed at the actual URLs used by `portal/events.html`, not only cache-busted URLs.

## 3. Seeded Test Data Plan

The Phase 5 test suite needs stable data that can be created, verified, and cleaned up. The fixtures should use a clear prefix such as `E2E Phase 4D` and a unique run id.

| Fixture | Purpose | Required fields | Owner/admin assumptions | Cleanup strategy | Creation method |
| --- | --- | --- | --- | --- | --- |
| Seeded upcoming free event | Stable list render, direct detail URL, RSVP free-going/cancel paths. | Title, slug, `status='open'`, future `start_at`, `event_type`, location, capacity, RSVP enabled, no payment required. | Owned by admin E2E account or a known host account. | Delete event and dependent RSVPs/waitlist/comments/photos/docs by run id. | Prefer SQL script or Playwright setup using service-role-safe endpoint if available; manual only for first rehearsal. |
| Seeded admin-owned/manageable event | Manage open/close, title/description edit/save, status changes, tabs. | Same as upcoming event plus known `created_by`, host/admin access, editable title/description. | Admin account must have permission to manage it. | Revert edits or delete fixture event after suite. | SQL script preferred for deterministic owner/host rows. |
| Seeded competition event | Competition render/actions and phase controls. | Competition config, phases, entry rules, voting rules, prize pool settings, future/open status. | Admin can moderate and advance phases; member can join/submit/vote. | Delete competition rows, storage objects, and event. | SQL script plus optional Playwright upload setup. |
| Seeded raffle event | Raffle entry, free/paid entry, draw queue, manage raffle refresh. | Raffle enabled, normalized raffle prizes/categories/items, winner count, RSVP/entry pricing rules. | Admin can draw; member/guest can enter if applicable. | Delete raffle entries/winners and event. | SQL script preferred. |
| Seeded event with documents | Documents panel/upload/download/delete/distribution. | Event row, `event_documents` rows, storage paths or upload target, target user where applicable. | Admin/host can upload/delete/distribute; member can download assigned docs. | Remove storage objects and document rows. | SQL plus storage setup script, or Playwright upload setup. |
| Seeded event with scrapbook photos | Scrapbook render/upload/view/delete and permissions. | Event row, existing `event_photos` rows, storage paths, uploader ids. | Admin/owner can delete; member can upload where allowed. | Remove storage objects and photo rows. | SQL plus storage setup script. |
| Seeded RSVP/waitlist state | RSVP going/cancel, waitlist join/leave/claim, capacity behavior. | Event capacity, RSVP rows, waitlist rows, timestamps/positions. | Admin owns event; member account has known RSVP/waitlist state. | Delete RSVP/waitlist rows by event/run id. | SQL script preferred because capacity/waitlist ordering must be deterministic. |
| Seeded guest/member RSVP state | Guest lookup, guest RSVP rendering, check-in/scanner paths if needed. | `event_guest_rsvps`, member RSVP rows, ticket/check-in metadata where applicable. | Admin can check in; member/guest state should not depend on live production randomness. | Delete guest/member RSVP/check-in rows by event/run id. | SQL script preferred; Playwright setup acceptable for guest RSVP if public flow exists. |

Fixture rules:

- Do not create seeded data during Phase 4D.
- Prefer idempotent SQL or setup scripts over manual data once the schema is confirmed.
- Every fixture needs a run id, created-by marker, and cleanup query.
- Avoid deleting non-fixture rows by title-only matching.
- Keep storage cleanup paired with database cleanup.
- Use admin/member E2E accounts only after the account/profile state is verified.

## 4. Static Smoke Test Plan

Future static smoke tests should run quickly without credentials and catch unsafe refactor drift before Playwright starts.

Planned static suites:

- Classic loader order guard: verify `portal/events.html` still loads the expected classic scripts in the expected order until Phase 5.
- No accidental `portal/events.html` changes during Phase 4: fail if portal event scripts switch to `type="module"`, are removed, or are reordered without an approved phase.
- Compatibility wrapper exports: once wrappers exist, verify `compat/window-exports.js` exports/installers preserve `window.PortalEvents.*`, `window.EventsCreate`, `window.EventsManage`, `window.EventsRaffleModel`, and representative `window.evt*` names.
- External global accessor contracts: verify `compat/external-globals.js` classifies required vs optional dependencies and exposes required accessors.
- Inline handler mappings: verify current inline handler names are mapped by `compat/inline-handlers.js` before generated markup is changed.
- Bridge surfaces: verify all current Phase 1-3E surfaces remain available while internals move.
- No native export in classic-loaded files until Phase 5: fail if current classic files gain native `export` while still loaded by `portal/events.html` classic script tags.
- No orphan split files: fail if new `js/portal/events/**` subfiles exist but are neither imported by the module entry nor loaded by classic script tags in their intended phase.
- Cache-aware asset URL checks: verify the test plan lists every changed bare JS asset URL that must be checked post-deploy.
- Dependency direction checks: once modules exist, verify services do not import feature modules and compatibility wrappers are not imported by feature internals.
- Registry checks: verify detail registry entries are installed through the intended internal registry/compat path.

## 5. Playwright E2E Plan

Future Playwright tests should be split into small focused suites that can run against local/staging first, then live.

Required E2E paths:

- Admin login: verifies admin credentials, redirect away from login, profile/auth state, and admin affordances.
- Member login: verifies member credentials, redirect, member permissions, and lack of admin-only controls.
- Logged-out redirect behavior: direct `portal/events.html` access should redirect or block correctly.
- Event list render: seeded event appears, empty state logic is not used when seeded events exist, filters/search/chips do not crash.
- Direct event detail URL: seeded slug/id URL opens detail reliably after refresh.
- List to detail to back navigation: card click opens detail, back returns to list, browser back/forward works.
- Create sheet open/close: `window.EventsCreate` and UI buttons open/close one sheet root with no duplicates.
- Create draft/publish smoke: fill minimum fields, validate required fields, upload optional media if fixture-ready, submit, then clean up.
- Manage sheet open/close: admin opens from detail/list/manage CTA, tab roots are singletons, close cleans up.
- Title/description edit/save: edit seeded manageable event, save, verify list/detail refresh, then revert or cleanup.
- RSVP going/cancel: member/admin marks going and cancels; state map and UI update once.
- Waitlist join/leave/claim if applicable: deterministic capacity fixture drives waitlist paths.
- Documents panel/upload/download/delete: seeded event opens panel, uploads file, downloads/gets signed URL, deletes row/storage object.
- Raffle entry/draw if applicable: member enters, admin draws, draw queue/winners reflect raffle model.
- Competition join/submit/vote/phase/finalize: seeded competition covers member and admin paths, including file upload where configured.
- Map open/close/location toggle: map initializes with `L`, location share toggles, realtime/geolocation cleanup runs on close.
- Scanner open/close/camera cleanup: scanner opens if permissions are stubbed/mocked, closes and stops streams/animation frames.
- Scrapbook upload/view/delete: upload fixture photo, open viewer, delete where allowed.
- Duplicate initialization checks: call `window.PortalEvents.initEventsPage()` repeatedly and assert no duplicate cards, listeners, network storms, sheet roots, or custom events.
- Console/page/network health: no uncaught page errors; console errors filtered only for known non-critical noise; failed Supabase/portal requests are reported with context.

Playwright design notes:

- Use environment variables only for credentials.
- Prefer `E2E_BASE_URL` for local/staging/live reuse.
- Avoid fixed local Chromium executable paths where possible; if needed, centralize the path in one helper.
- Use seeded fixture IDs/slugs instead of depending on production data being present.
- Tests that mutate data must clean up or run against isolated seeded rows.

## 6. Live Deployment Verification Plan

Post-deploy verification must check the real assets and runtime path used by `portal/events.html`.

Requirements:

- Check actual bare JS asset URLs, for example `https://justicemcneal.com/js/portal/events/competition.js`, not only cache-busted URLs.
- For each changed JS asset, capture `cf-cache-status`, `Age`, `ETag`, `Last-Modified`, `Cache-Control`, and any origin/proxy cache headers present.
- Confirm cache-busted URL freshness separately, but treat it as insufficient until the bare URL used by `portal/events.html` is fresh.
- Verify `portal/events.html` itself references the expected asset URL and query string, if any.
- Run live global checks after bare asset refresh.
- Run E2E after deployment with admin and member accounts.
- Verify no uncaught page errors or relevant console errors after events navigation.
- Verify no unexpected portal/Supabase network failures for the tested flows.
- Record remote commit hash and live asset freshness evidence together.

Rollback notes:

- Keep the last known-good classic script commit hash available.
- If module entry fails, restore `portal/events.html` to the classic script list and push a rollback commit.
- Verify rollback using the same bare asset URL and live global checks.
- Do not purge caches as a substitute for validating the actual loaded URL.

## 7. Missing Dependency / Degraded Mode Tests

Optional globals should degrade without blocking the full events page.

Optional dependency tests:

- `QRCode`: simulate missing QR library and verify ticket/QR UI shows a readable fallback or disables QR-only controls without crashing list/detail.
- `jsQR`: simulate missing scanner library and verify scanner controls report unavailable while page/list/detail still load.
- `L`: simulate missing Leaflet and verify map controls hide/disable or show map unavailable while other detail sections still load.
- Notification helpers: simulate missing notification API and verify events page does not fail boot. Exact helper names need follow-up grep/test before implementation.
- Push helpers: simulate missing push API and verify push registration failure does not block events page. Exact helper coupling remains unclear and should be verified.

Required dependency tests:

- `supabaseClient`: missing client should fail clearly for page data boot; no obscure downstream `undefined.from` errors.
- `checkAuth`: missing auth helper should fail clearly before private portal data loads.
- `hasPermission`: missing permission helper should fail closed for create/manage affordances and log a clear diagnostic.
- `callEdgeFunction`: missing Edge Function caller should fail clearly when checkout/admin action paths are invoked, while non-action read-only views can still render where possible.
- `getFunctionUrl`: missing helper should degrade optional geocode behavior if geocode remains optional, but fail clearly if a required function URL is requested.

Implementation note for later: these tests should use browser context script injection, route interception, or future `external-globals` test hooks. Do not mutate production scripts to simulate missing globals.

## 8. Phase 5 Readiness Test Gates

Before `portal/events.html` can switch to one module entry, the following must pass:

- All Phase 1-3E static smoke suites.
- New Phase 4 static smoke suites for loader order, compatibility wrappers, external globals, inline handler mappings, bridge surfaces, and no orphan module files.
- Seeded Playwright E2E for list, direct detail URL, list/detail/back navigation, create sheet, manage sheet, RSVP/waitlist, documents, raffle, competition, map/scanner, and scrapbook as scoped.
- Compatibility wrapper tests proving `window.PortalEvents.*`, `window.EventsCreate`, `window.EventsManage`, `window.EventsRaffleModel`, and representative `window.evt*` names survive.
- Inline handler tests proving current generated markup actions still resolve.
- Duplicate init tests proving repeated initializer calls do not duplicate listeners, cards, sheet roots, custom events, realtime subscriptions, camera streams, or network calls beyond expected refreshes.
- Missing optional dependency degraded-mode tests.
- Required dependency clear-failure tests.
- Live deployment verifier consolidation that checks all current bridge surfaces and representative legacy globals.
- Deployment cache verification against actual bare asset URLs used by `portal/events.html`.
- Rollback rehearsal proving classic script loading can be restored and verified.
- Confirm `events-dashboard.js` remains outside the portal module migration unless separately scoped.

## 9. Recommended Test Implementation Order

Safest order for adding tests later:

1. Expand static smoke tests around loader order and compatibility contracts.
2. Consolidate live global verifiers into one env-only script covering Phase 1-3E surfaces.
3. Write the seeded fixture plan in executable form, but run first in a disposable/local/staging environment.
4. Add seeded event list/detail route E2E.
5. Add create/manage sheet E2E with no destructive production writes.
6. Add RSVP/waitlist and raffle E2E.
7. Add competition E2E for render/action/admin flows.
8. Add documents/storage and scrapbook E2E.
9. Add map/scanner lifecycle and cleanup E2E with permissions mocked where possible.
10. Add missing dependency/degraded-mode tests.
11. Add Phase 5 module-entry rehearsal tests behind a local/staging-only page or branch before changing live `portal/events.html`.
12. Add deployment cache verification automation for changed bare assets.

This order keeps low-risk static coverage ahead of browser/data mutation tests and avoids making module-entry work the first place where dependency problems are discovered.

## 10. Phase 4E Readiness Checklist

Before moving into Phase 4E pre-Phase-5 readiness review, confirm:

- [ ] Current Phase 1-3E tests are inventoried.
- [ ] Live verifier scripts are consolidated or their tracking state is decided.
- [ ] Credential handling is env-only for future live tests.
- [ ] Seeded fixture list is reviewed and accepted.
- [ ] Cleanup strategy exists for every fixture.
- [ ] Static smoke expansion scope is approved.
- [ ] Playwright E2E expansion scope is approved.
- [ ] Missing dependency/degraded-mode test approach is approved.
- [ ] Deployment cache verification checklist is approved.
- [ ] Rollback rehearsal requirements are approved.
- [ ] No tests or fixtures have been implemented during Phase 4D.
- [ ] No app code has been modified during Phase 4D.
- [ ] `portal/events.html` is unchanged.
- [ ] `events-dashboard.js` is untouched.

Recommended Phase 4E focus: use this test plan, the Phase 4B compatibility design, and the Phase 4C import map to perform a pre-Phase-5 readiness review before any implementation starts.
