# Events Refactor Phase 4H Runtime Harness Status

Date: 2026-05-21

This document summarizes Phase 4H local-only runtime harness coverage for the portal events compatibility helpers. It is documentation only. It does not modify app code, edit `portal/events.html`, wire helpers into runtime, touch `events-dashboard.js`, or start Phase 5.

## 1. Summary

Phase 4H added local-only Node runtime harness coverage for all three Phase 4F compatibility helpers:

- `js/portal/events/compat/external-globals.js`
- `js/portal/events/compat/window-exports.js`
- `js/portal/events/compat/inline-handlers.js`

The harnesses load the helpers through CommonJS in Node and exercise behavior against controlled globals. They do not load the helpers in the browser and do not change the live portal events runtime.

## 2. Harness Status

| Harness | Commit | Test file | Helper tested | Validation result | Helper bug found? | Runtime/browser wiring changed? |
| --- | --- | --- | --- | --- | --- | --- |
| External globals runtime harness | `c5bc5e9` | `test/_harness-phase4h-external-globals-runtime.js` | `js/portal/events/compat/external-globals.js` | `52 checks - 52 pass, 0 fail` | No | No |
| Window exports runtime harness | `26939b5` | `test/_harness-phase4h-window-exports-runtime.js` | `js/portal/events/compat/window-exports.js` | `46 checks - 46 pass, 0 fail` | No | No |
| Inline handlers runtime harness | `f5ee75d` | `test/_harness-phase4h-inline-handlers-runtime.js` | `js/portal/events/compat/inline-handlers.js` | `68 checks - 68 pass, 0 fail` | No | No |

## 3. Scenario Coverage

### `external-globals.js`

The external globals runtime harness covers:

- Required globals present: `supabaseClient`, `checkAuth`, and `hasPermission`.
- Action-dependent globals present: `callEdgeFunction` and `getFunctionUrl`.
- Optional globals present: `QRCode`, `jsQR`, `L`, notification API globals, and push API globals.
- Optional fallback global names for notifications and push helpers.
- Optional globals missing returning `null`.
- Required and action-dependent globals missing throwing clear errors.
- `getExternalDeps()` returning required, action-dependent, and optional dependencies.
- Cleanup after each scenario so fake globals do not pollute later checks.

### `window-exports.js`

The window exports runtime harness covers:

- Creating and preserving the `window.PortalEvents` namespace.
- Assigning namespaced APIs under `PortalEvents.*`.
- Preserving `EventsCreate`, `EventsManage`, and `EventsRaffleModel` by default.
- Explicit classic-global replacement when requested.
- Installing the full bridge API surface for init, constants, raffle model, list, detail, manage, create, and competition APIs.
- Installing representative legacy `evt*` globals from a globals bag.
- Idempotent repeated installation.
- Cleanup after each scenario so fake globals do not pollute later checks.

### `inline-handlers.js`

The inline handlers runtime harness covers:

- Installing a new `evtHandleRsvp` handler.
- Preserving existing handlers by default.
- Replacing existing handlers only with `{ replaceExisting: true }`.
- Skipping non-function values and recording them in `skipped`.
- Installing multiple handlers through `assignHandlers()`.
- Installing grouped handlers for RSVP, competition, documents, map, scanner, and detail surfaces.
- Summary fields for `installed`, `preserved`, `skipped`, and `replaced`.
- Idempotent repeated installation.
- Empty input summaries.
- Cleanup after each scenario so fake globals do not pollute later checks.

## 4. Current Runtime Wiring Status

All three helper files remain unwired:

- They are not loaded by `portal/events.html`.
- They are not imported by runtime code.
- They are not part of the browser execution path.
- There is no Phase 5 module entry.
- `portal/events.html` still uses the current classic script loading model.
- Existing classic runtime files still own their current globals and `window.PortalEvents.*` bridge assignments.

## 5. What Phase 4H Proves

Phase 4H proves that:

- The compatibility helpers can be loaded through CommonJS in Node.
- Required, action-dependent, and optional external global behavior is tested.
- Missing required external globals fail clearly in the helper layer.
- Optional external globals degrade to `null` where expected.
- Window export installation behavior is tested.
- Classic global preservation and explicit replacement behavior are tested.
- Inline handler preserve, replace, skip, grouped install, and summary behavior are tested.
- Global pollution cleanup is tested after each local runtime scenario.

## 6. What Phase 4H Does Not Prove

Phase 4H does not prove:

- Browser runtime integration.
- Real `portal/events.html` helper loading.
- Seeded app workflows.
- Live globals after helper wiring.
- Inline handlers in real generated markup.
- CDN, cache, or service-worker behavior for newly loaded helper assets.
- Phase 5 readiness.

## 7. Remaining Blockers Before Runtime Wiring

Before any runtime wiring, the remaining blockers are:

- Consolidated live verifier coverage for the current classic runtime contract.
- Runtime integration design approval.
- Browser/page integration harness coverage.
- Seeded fixtures and seeded E2E coverage for representative portal events workflows.
- Cache verification for any changed or newly loaded bare JS assets.
- Rollback rehearsal for any `portal/events.html` or script-loading change.

## 8. Recommended Next Step

Recommended next step: consolidate the live global verifier into one env-only script before wiring helpers.

This is the safest next step because Phase 4H now proves the helpers behave correctly in isolated Node harnesses, but the current browser runtime contract still needs one repeatable verifier before any helper becomes part of the page execution path. A consolidated verifier should measure the current classic page state without changing it, including representative `window.PortalEvents.*`, `window.EventsCreate`, `window.EventsManage`, `window.EventsRaffleModel`, and legacy `window.evt*` globals.

After that verifier is reviewed and passing, the project can evaluate a small browser/page integration harness or a classic-script rehearsal plan. Runtime wiring and Phase 5 should remain blocked until those gates are approved.
