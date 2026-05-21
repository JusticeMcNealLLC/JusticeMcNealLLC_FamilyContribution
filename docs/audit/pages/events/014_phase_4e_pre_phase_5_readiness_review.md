# Events Refactor Phase 4E Pre-Phase-5 Readiness Review

Date: 2026-05-21

This document is the pre-Phase-5 readiness review for the portal events refactor. It consolidates the Phase 4 preparation plan, Phase 4A state/data boundary inventory, Phase 4B compatibility wrapper design, Phase 4C module import map design, and Phase 4D test plan expansion.

This phase is documentation only. It does not implement compatibility files, create JS modules, create tests, create fixtures, modify runtime code, edit `portal/events.html`, modify database data, touch `events-dashboard.js`, or start Phase 5.

References:

- `docs/audit/pages/events/009_phase_4_preparation_plan.md`
- `docs/audit/pages/events/010_phase_4a_state_data_boundary_inventory.md`
- `docs/audit/pages/events/011_phase_4b_compatibility_wrapper_design.md`
- `docs/audit/pages/events/012_phase_4c_module_import_map_design.md`
- `docs/audit/pages/events/013_phase_4d_test_plan_expansion.md`

## 1. Executive Summary

Decision: Not ready for Phase 5 today.

The portal events refactor has a stable Phase 1-3E compatibility bridge and a strong Phase 4 design foundation, but the project should not switch `portal/events.html` to a single module entry yet. The current runtime still depends on classic script order, legacy `window.evt*` handlers, `window.EventsCreate`, `window.EventsManage`, `window.EventsRaffleModel`, and several external globals loaded before the portal event scripts.

The project is ready to begin careful pre-Phase-5 implementation work, starting with compatibility wrappers and tests. It is not ready for Phase 5 module-entry work because the compatibility JS files do not exist yet, inline handler mapping is still design-only, seeded E2E coverage has not been implemented, live verifier consolidation is incomplete, fixture data is not available for reliable workflows, and rollback/cache verification has not been rehearsed.

Summary recommendation: start implementation with compatibility wrappers and their smoke tests, not with `portal/events.html` module-entry changes.

## 2. Completed Work Summary

Phase 1-3E bridge work is complete at the planning-review level:

- Phase 1 established `window.PortalEvents.initEventsPage` and a duplicate initialization guard.
- Phase 2 exposed constants and raffle model compatibility surfaces while preserving `window.EventsRaffleModel`.
- Phase 3A exposed list helper surfaces under `window.PortalEvents.list`.
- Phase 3B exposed detail helper surfaces and a detail registry under `window.PortalEvents.detail`.
- Phase 3C exposed manage sheet surfaces under `window.PortalEvents.manage` while preserving `window.EventsManage`.
- Phase 3D exposed create sheet surfaces under `window.PortalEvents.create` while preserving `window.EventsCreate`.
- Phase 3E exposed competition helper surfaces under `window.PortalEvents.competition` while preserving competition `window.evt*` globals.

Phase 4 preparation is complete as documentation:

- The Phase 4 preparation plan defined the major architecture goals, compatibility constraints, proposed future folder structure, state ownership direction, data-service direction, and the rule that `portal/events.html` should not change too early.
- Phase 4A inventoried shared state, local feature state, Supabase access, Edge Function usage, storage usage, cross-file dependencies, inline handler dependencies, and future state/service ownership boundaries.
- Phase 4B designed the compatibility wrapper strategy for `compat/window-exports.js`, `compat/inline-handlers.js`, and `compat/external-globals.js`.
- Phase 4C designed the future module import map and the eventual single-entry `index.js` orchestration model.
- Phase 4D expanded the test plan, including static smoke tests, seeded Playwright E2E coverage, live deployment verification, missing dependency tests, rollback rehearsal, and Phase 5 test gates.

No Phase 4 implementation work has been approved or performed by this document.

## 3. Readiness Matrix

| Area | Current status | Readiness level | Blocker or gap | Required next action |
| --- | --- | --- | --- | --- |
| Compatibility wrappers | Designed in Phase 4B; files not implemented. | Not ready for Phase 5. | `compat/external-globals.js`, `compat/window-exports.js`, and `compat/inline-handlers.js` do not exist yet. | Implement wrappers in small approved steps and add static smoke coverage. |
| External globals | Required and optional dependencies identified. | Conditionally ready for wrapper implementation. | No accessor layer exists; missing dependency behavior is not tested. | Implement `external-globals` accessors and classify required vs optional dependencies in tests. |
| Window exports | Current bridge surfaces exist through classic scripts. | Conditionally ready for compatibility wrapping. | No single installer owns `window.PortalEvents.*`, `window.Events*`, and representative `window.evt*` exports. | Implement repeat-safe `window-exports` installer without removing existing globals. |
| Inline handlers | Handler categories are documented. | Not ready for Phase 5. | Generated markup still calls `window.evt*` names directly; wrapper/delegation adapter is not implemented. | Implement explicit inline handler mapping, then migrate categories only after tests exist. |
| State ownership | Current state inventory is documented. | Not ready for module internals. | Shared state still spans lexical globals, `window` mirrors, feature-local state, and duplicated event copies. | Add state wrapper/getter layer first; do not remove legacy globals yet. |
| Service boundaries | Proposed APIs are documented. | Conditionally ready for gradual implementation. | Data reads/writes remain mixed into feature files; service wrappers are not implemented. | Add service wrappers behind current callers before moving feature internals to imports. |
| Module import map | Future import order and module responsibilities are documented. | Design ready, implementation not ready. | Physical module files and dependency boundaries do not exist yet. | Use import map as a guide after wrappers/tests are in place. |
| Test coverage | Static bridge tests exist for Phase 1-3E; some live checks exist. | Not ready for Phase 5. | Seeded workflow E2E, wrapper tests, dependency tests, and module-entry rehearsal are missing. | Expand static smoke tests and add seeded Playwright coverage before module entry. |
| Seeded fixtures | Fixture plan exists in Phase 4D. | Not ready. | No executable fixture setup/cleanup exists; reliable detail/manage/competition data is not guaranteed. | Build fixture scripts in local/staging first with run ids and cleanup. |
| Deployment cache verification | Requirements are documented. | Not ready. | Bare asset URL freshness is not automated; Cloudflare can serve stale JS. | Add cache-aware verifier for every changed bare JS asset used by `portal/events.html`. |
| Rollback plan | Rollback notes exist. | Not ready. | Classic script rollback has not been rehearsed after a module-entry attempt. | Rehearse and document rollback using bare asset checks and live globals. |
| `events-dashboard.js` isolation | Explicitly scoped out of portal module migration. | Ready as a boundary. | Dirty/unrelated worktree changes may exist, but they are outside this portal plan. | Keep admin dashboard cleanup separate unless separately scoped. |
| `portal/events.html` readiness | Still uses classic script list. | Not ready for module switch. | Page depends on classic script order and globals; module-entry rehearsal has not happened. | Leave unchanged until wrappers, tests, fixtures, verifier, and rollback gates pass. |

## 4. Phase 5 Blockers

Phase 5 is blocked by these items:

- Compatibility JS files are not implemented yet.
- `compat/external-globals.js` does not yet provide required/optional dependency accessors.
- `compat/window-exports.js` does not yet install or preserve all public bridge and legacy global names from one place.
- `compat/inline-handlers.js` does not yet map current generated inline handlers.
- Inline handlers have not been wrapped, delegated, or migrated.
- Seeded tests have not been implemented.
- Module-entry rehearsal has not been done.
- No fixture data exists for reliable detail, manage, create, RSVP/waitlist, documents, raffle, competition, map/scanner, or scrapbook flows.
- `portal/events.html` still uses the classic script list, and that is currently the working runtime dependency graph.
- Cloudflare bare-asset cache behavior must be handled for every changed JS asset used by `portal/events.html`.
- Rollback to the classic script list has not been rehearsed.
- Current live verifier coverage is fragmented; Phase 3E verification was not consolidated into a committed reusable script.
- Some live verifier scripts appear to have unclear tracking state and credential handling that should be hardened before relying on them.
- Missing optional dependency behavior for `QRCode`, `jsQR`, `L`, notification helpers, and push helpers is not tested.
- Required dependency clear-failure behavior for `supabaseClient`, `checkAuth`, `hasPermission`, `callEdgeFunction`, and `getFunctionUrl` is not tested.
- State/global divergence risks remain, especially around `evtAllEvents`, `evtAllRsvps`, detail state, manage state, and local sheet state.
- `events-dashboard.js` must remain outside the portal-events Phase 5 scope unless a separate approval explicitly includes it.

## 5. What Can Be Implemented Before Phase 5

The following implementation work can happen before module entry, if approved and kept small:

- Implement `compat/external-globals.js` as a dependency accessor layer.
- Add static smoke tests for required and optional external global contracts.
- Implement `compat/window-exports.js` as a repeat-safe compatibility installer.
- Add static smoke tests for `window.PortalEvents.*`, `window.EventsCreate`, `window.EventsManage`, `window.EventsRaffleModel`, and representative `window.evt*` exports.
- Implement `compat/inline-handlers.js` as an explicit mapping for existing inline handler names.
- Add inline handler smoke tests before generated markup changes.
- Consolidate live global verifier coverage into one env-only script for Phase 1-3E surfaces.
- Create a seeded fixture plan or script for local/staging with run ids and cleanup.
- Add seeded E2E coverage for detail, manage, create, RSVP/waitlist, documents, raffle, competition, map/scanner, and scrapbook flows.
- Add a state wrapper around current globals without removing legacy globals.
- Add service wrappers around Supabase, Edge Function, and storage calls without changing callers yet.
- Add deployment cache verification automation for changed bare asset URLs.
- Rehearse rollback while the classic script list is still the known-good fallback.

This work should preserve existing runtime behavior and should not require `portal/events.html` to switch to `type="module"`.

## 6. What Should Not Be Done Yet

Do not do these items yet:

- Do not switch `portal/events.html` to one module entry yet.
- Do not delete classic script tags.
- Do not remove `window.evt*` globals.
- Do not remove `window.EventsCreate`.
- Do not remove `window.EventsManage`.
- Do not remove `window.EventsRaffleModel`.
- Do not physically split high-risk files yet.
- Do not rewrite generated inline markup before wrapper tests exist.
- Do not move state ownership by deleting current globals before a compatibility mirror exists.
- Do not rewrite Supabase queries as part of wrapper creation unless separately scoped.
- Do not create production fixture data without an approved setup and cleanup strategy.
- Do not rely on cache-busted asset checks as proof that the actual bare asset URL is fresh.
- Do not mix `events-dashboard.js` cleanup into portal-events Phase 5.
- Do not start Phase 5 until the entry criteria checklist below is satisfied.

## 7. Recommended Next Implementation Sequence

Recommended sequence before Phase 5:

1. Phase 4F or Phase 4 implementation step 1: implement `compat/external-globals.js` only.
2. Add static smoke tests for required and optional external globals.
3. Implement `compat/window-exports.js` with repeat-safe namespace/object preservation.
4. Add static smoke tests and live global checks for window exports.
5. Implement `compat/inline-handlers.js` with explicit current handler mappings.
6. Add inline handler smoke tests.
7. Consolidate live verifier scripts into one env-only verifier covering Phase 1-3E surfaces, representative legacy globals, page errors, relevant console errors, and bare asset URLs.
8. Create seeded fixture setup/cleanup plan or scripts for local/staging first.
9. Add seeded event list and direct detail E2E.
10. Add create and manage sheet E2E with no destructive production writes.
11. Add RSVP/waitlist, raffle, competition, documents/storage, scrapbook, map, and scanner E2E by fixture priority.
12. Add state wrapper implementation without removing legacy globals.
13. Add service wrappers without changing callers yet.
14. Rehearse deployment cache checks and rollback from a controlled branch/staging flow.
15. Only then consider a Phase 5 module-entry rehearsal behind a local/staging page or branch.
16. Switch `portal/events.html` to one module entry only after the rehearsal and gates pass.

## 8. Risk Ranking

| Risk | Ranking | Why it matters | Mitigation before Phase 5 |
| --- | --- | --- | --- |
| Auth/session | High | `initEventsPage()` depends on `checkAuth()`, profile state, permissions, and private portal routing. | Add env-only admin/member/logged-out E2E and clear required dependency failures. |
| Duplicate initialization | High | Module entry could accidentally run alongside existing `DOMContentLoaded` behavior or duplicate listeners/network calls. | Preserve one canonical initializer and add repeated-init tests. |
| Inline handlers | High | Generated markup still calls `window.evt*`; missing names break user actions immediately. | Implement `inline-handlers` mapping and smoke tests before markup changes. |
| State/global divergence | High | Lexical globals and `window` mirrors can become stale, especially RSVP and event maps. | Add a state wrapper and compatibility mirrors before moving internals. |
| Manage sheet | High | Manage owns separate event/tab/doc/raffle/competition state and admin mutations. | Add seeded manage E2E and service wrappers before splitting. |
| Create sheet | High | Create owns local draft, upload, geocode, raffle, and competition setup state. | Keep `window.EventsCreate`, add smoke/E2E coverage, and split only after tests. |
| Detail registry | Medium | Feature sections rely on registry timing and current classic load order. | Test registry entries and install order before module entry. |
| Competition flows | High | Competition spans inline actions, Supabase tables, storage, Edge Functions, votes, moderation, and phases. | Add seeded competition E2E before module switch. |
| Storage uploads | High | Create, documents, competition entries, and scrapbook can leave orphan files or fail due to storage policies. | Use fixture cleanup and storage service wrappers in staging first. |
| Map/scanner cleanup | Medium | Leaflet, geolocation, camera streams, and animation frames need reliable cleanup. | Add lifecycle tests with mocked permissions where possible. |
| Cloudflare cache | High | Live bare JS assets can remain stale even when cache-busted URLs are fresh. | Verify actual bare asset URLs and record headers after deploys. |
| Rollback complexity | High | A failed module entry must be reversible quickly and verifiably. | Rehearse restoring classic script loading and verifying live globals/assets. |
| `events-dashboard.js` scope bleed | Medium | Admin dashboard work is separate and could obscure portal events risks. | Keep it out of Phase 5 unless separately approved. |

## 9. Go / No-Go Decision

Should Phase 5 start now? No.

Should implementation start with compatibility wrappers instead? Yes. The next implementation work should start with compatibility wrappers and tests, especially `compat/external-globals.js`, then `compat/window-exports.js`, then `compat/inline-handlers.js`.

Should `events-dashboard.js` be handled before or after wrapper implementation? It should be handled separately, not before wrapper implementation as part of this portal-events path. The portal-events Phase 5 readiness work should keep `events-dashboard.js` isolated unless a separate scope explicitly approves admin dashboard cleanup.

Next single safest step: implement `compat/external-globals.js` only, with static smoke tests for required and optional dependency classification. This creates a small, testable boundary without changing `portal/events.html`, removing globals, splitting high-risk files, or altering runtime behavior.

## 10. Phase 5 Entry Criteria Checklist

Before Phase 5 can start, all of the following should be true:

- [ ] `compat/external-globals.js` exists and classifies required vs optional globals.
- [ ] Static tests cover `compat/external-globals.js` required and optional behavior.
- [ ] `compat/window-exports.js` exists and is repeat-safe.
- [ ] Static tests cover `window.PortalEvents.*`, `window.EventsCreate`, `window.EventsManage`, `window.EventsRaffleModel`, and representative `window.evt*` exports.
- [ ] `compat/inline-handlers.js` exists and maps the current inline handler surface.
- [ ] Static tests cover inline handler mappings.
- [ ] Current `portal/events.html` classic loader order is guarded by static tests until the approved module-entry switch.
- [ ] No native `export` syntax is introduced into classic-loaded files before the module-entry phase.
- [ ] Live verifier coverage is consolidated into an env-only script.
- [ ] Live verifier checks all current `window.PortalEvents.*` surfaces.
- [ ] Live verifier checks `window.EventsCreate`, `window.EventsManage`, and `window.EventsRaffleModel`.
- [ ] Live verifier checks representative `window.evt*` legacy handlers.
- [ ] Live verifier checks page errors, relevant console errors, and relevant failed requests.
- [ ] Live verifier checks actual bare JS asset URLs used by `portal/events.html`.
- [ ] Seeded fixture setup and cleanup strategy is approved.
- [ ] Seeded fixtures exist for reliable list/detail/manage/create/competition coverage in local or staging.
- [ ] Seeded E2E exists for list render and direct detail URL.
- [ ] Seeded E2E exists for list/detail/back navigation.
- [ ] Seeded E2E exists for create sheet open/close and draft/publish smoke where safe.
- [ ] Seeded E2E exists for manage sheet open/close and edit/save.
- [ ] Seeded E2E exists for RSVP/waitlist paths.
- [ ] Seeded E2E exists for raffle paths.
- [ ] Seeded E2E exists for competition join/submit/vote/admin phase paths.
- [ ] Seeded E2E exists for documents/storage paths.
- [ ] Seeded E2E exists for scrapbook paths.
- [ ] Seeded or mocked E2E exists for map and scanner lifecycle cleanup.
- [ ] Missing optional dependency degraded-mode tests exist for `QRCode`, `jsQR`, `L`, notification helpers, and push helpers where applicable.
- [ ] Required dependency clear-failure tests exist for `supabaseClient`, `checkAuth`, `hasPermission`, `callEdgeFunction`, and `getFunctionUrl` where applicable.
- [ ] State wrapper or ownership plan is implemented enough to prevent `evtAllEvents` and `evtAllRsvps` divergence during module migration.
- [ ] Service wrapper plan is implemented enough to avoid feature-to-service dependency confusion during module migration.
- [ ] Detail registry install order is tested.
- [ ] Duplicate initialization tests prove repeated initializer calls do not duplicate cards, listeners, network calls, sheet roots, custom events, realtime subscriptions, camera streams, or animation frames beyond expected refreshes.
- [ ] Deployment cache verification records `cf-cache-status`, `Age`, `ETag`, `Last-Modified`, `Cache-Control`, and related headers for changed bare JS assets.
- [ ] Rollback rehearsal proves the classic script list can be restored and verified.
- [ ] `portal/events.html` remains unchanged until the approved Phase 5 module-entry step.
- [ ] `events-dashboard.js` remains outside the portal-events Phase 5 scope unless separately approved.
- [ ] The team has reviewed and approved a go/no-go decision immediately before changing `portal/events.html`.

Final recommendation: do not start Phase 5 yet. Start the next approved implementation phase with compatibility wrapper groundwork, beginning with `compat/external-globals.js` and its static tests.
