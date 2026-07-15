# Events Refactor Phase 4F Compatibility Helpers Status

Date: 2026-05-21

This document summarizes Phase 4F Steps 1-3 for the portal events refactor. These steps implemented compatibility helpers and static smoke coverage only. The helpers are intentionally not imported, loaded by `portal/events.html`, or wired into runtime yet.

## 1. Executive Summary

Phase 4F created the three planned compatibility helper files from the Phase 4B wrapper design:

1. Step 1: `js/portal/events/compat/external-globals.js`
2. Step 2: `js/portal/events/compat/window-exports.js`
3. Step 3: `js/portal/events/compat/inline-handlers.js`

Each helper has a matching static/runtime smoke test. All three helpers remain isolated. No browser loading, module entry, global removal, runtime integration, or `portal/events.html` changes have been made.

## 2. Phase 4F Step Summary

| Step | Commit | Files changed | Purpose | Smoke test | Validation result | Wired into runtime? |
| --- | --- | --- | --- | --- | --- | --- |
| Step 1: external globals | `abeb7a8` | `js/portal/events/compat/external-globals.js`; `test/_smoke-phase4f-external-globals.js` | Provides classic-safe accessors for required, action-dependent, and optional external globals used by portal events. | `test/_smoke-phase4f-external-globals.js` | `82 checks - 82 pass, 0 fail` | No. The helper is not loaded by `portal/events.html` and is not imported by runtime code. |
| Step 2: window exports | `5bef2d8` | `js/portal/events/compat/window-exports.js`; `test/_smoke-phase4f-window-exports.js` | Provides a repeat-safe installer for `window.PortalEvents.*`, preserved classic globals, and future legacy global export bags. | `test/_smoke-phase4f-window-exports.js` | `73 checks - 73 pass, 0 fail` | No. The helper is not loaded by `portal/events.html` and is not imported by runtime code. |
| Step 3: inline handlers | `2e59d9b` | `js/portal/events/compat/inline-handlers.js`; `test/_smoke-phase4f-inline-handlers.js` | Provides a future-safe installer for legacy inline handler names on `window`, preserving existing handlers by default and supporting explicit replacement. | `test/_smoke-phase4f-inline-handlers.js` | `94 checks - 94 pass, 0 fail` | No. The helper is not loaded by `portal/events.html` and is not imported by runtime code. |

## 3. Current Compatibility Helper Files

The Phase 4F compatibility helper files now present in the repo are:

- `js/portal/events/compat/external-globals.js`
- `js/portal/events/compat/window-exports.js`
- `js/portal/events/compat/inline-handlers.js`

These files use classic-safe JavaScript and avoid native `import` or `export` syntax. They expose CommonJS exports for smoke tests and browser bridge assignments under `window.PortalEvents.*` for future runtime integration.

## 4. Current Phase 4F Smoke Tests

The Phase 4F smoke test files now present in the repo are:

- `test/_smoke-phase4f-external-globals.js`
- `test/_smoke-phase4f-window-exports.js`
- `test/_smoke-phase4f-inline-handlers.js`

The tests validate syntax, export strategy, helper surfaces, no-module constraints, runtime idempotency behavior, and that `portal/events.html` has not been wired to the helpers.

## 5. What Has Not Changed

Phase 4F Steps 1-3 did not change runtime loading or behavior:

- `portal/events.html` remains unchanged.
- The compatibility helpers are not imported yet.
- The compatibility helpers are not loaded by the browser yet.
- No runtime behavior changes are intended from these commits.
- No `window.evt*` globals were removed.
- No `window.EventsCreate`, `window.EventsManage`, or `window.EventsRaffleModel` globals were removed.
- No module-entry switch was made.
- No `type="module"` event entry was introduced.
- No physical file splitting was performed.
- `events-dashboard.js` remains outside this portal-events refactor scope.

## 6. Remaining Blockers Before Phase 5

Phase 5 should not start yet. The following blockers remain:

- The compatibility helpers need a runtime integration plan before any wiring happens.
- Consolidated live verifier coverage is still needed.
- Seeded fixtures are still needed.
- Seeded E2E coverage is still needed.
- A state wrapper is still needed to reduce shared global divergence risk.
- Service wrappers are still needed around Supabase, Edge Function, and storage boundaries.
- Cache verification automation is still needed for changed bare JS assets.
- Rollback rehearsal is still needed before any module-entry attempt.

## 7. Recommended Next Step

Recommended next step: Option C, plan runtime integration of the helpers without wiring yet.

This is the safest next step because the helper files and smoke tests now exist, but the project still needs an explicit integration sequence before any runtime loader or `portal/events.html` change. The plan should define load order, ownership, fallback behavior, test gates, and rollback checkpoints while keeping the current classic runtime untouched.

A practical next document or task should specify:

- Which helper would be integrated first and why.
- Whether integration should happen through a future module entry, classic script rehearsal, or a local-only test harness.
- Which globals each helper would own during the first integration pass.
- Which smoke and live verifier checks must pass before and after integration.
- How to roll back to the current classic script list if a rehearsal fails.

Do not wire these helpers into runtime until that integration plan is reviewed and approved.
