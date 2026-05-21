# Events Refactor Phase 4G Compatibility Runtime Integration Plan

Date: 2026-05-21

This document plans how the Phase 4F compatibility helpers could eventually be introduced into the portal events runtime. It is documentation only. It does not modify app code, edit `portal/events.html`, import or wire helpers, create tests, create fixtures, touch `events-dashboard.js`, or start Phase 5.

References:

- `docs/audit/pages/events/011_phase_4b_compatibility_wrapper_design.md`
- `docs/audit/pages/events/012_phase_4c_module_import_map_design.md`
- `docs/audit/pages/events/014_phase_4e_pre_phase_5_readiness_review.md`
- `docs/audit/pages/events/015_phase_4f_compat_helpers_status.md`
- `js/portal/events/compat/external-globals.js`
- `js/portal/events/compat/window-exports.js`
- `js/portal/events/compat/inline-handlers.js`

## 1. Current Status

Phase 4F created the three compatibility helpers that Phase 4B designed:

- `js/portal/events/compat/external-globals.js`
- `js/portal/events/compat/window-exports.js`
- `js/portal/events/compat/inline-handlers.js`

All three helpers are tested by static/runtime smoke tests:

- `test/_smoke-phase4f-external-globals.js` passed `82 checks - 82 pass, 0 fail`.
- `test/_smoke-phase4f-window-exports.js` passed `73 checks - 73 pass, 0 fail`.
- `test/_smoke-phase4f-inline-handlers.js` passed `94 checks - 94 pass, 0 fail`.

Current runtime status:

- The helpers are not loaded by `portal/events.html`.
- The helpers are not imported by runtime code.
- The helpers currently have no browser runtime effect on the live portal events page.
- `portal/events.html` still uses the classic script list and current script order.
- Existing runtime files still own their current globals and `window.PortalEvents.*` bridges.
- Phase 5 is still blocked by verifier, fixture, E2E, state-wrapper, service-wrapper, cache verification, rollback, and integration rehearsal gaps.

## 2. Integration Goals

Successful runtime integration should preserve the current user-visible behavior while making compatibility ownership more explicit.

Integration must:

- Preserve current portal events behavior.
- Preserve classic script compatibility until the approved module-entry phase.
- Preserve `window.PortalEvents.*` bridge surfaces.
- Preserve `window.EventsCreate`.
- Preserve `window.EventsManage`.
- Preserve `window.EventsRaffleModel`.
- Preserve legacy `window.evt*` handler names used by generated markup and cross-file calls.
- Avoid duplicate initialization.
- Avoid duplicate event listeners.
- Avoid duplicate network calls, realtime subscriptions, sheet roots, camera streams, and animation frames.
- Avoid breaking inline handlers.
- Avoid changing `portal/events.html` too early.
- Avoid replacing current globals unless a later approved integration step has tests proving replacement is intentional and safe.

Integration should not make the compatibility helpers business-logic owners. They should remain adapters for dependencies, public window exports, and inline-handler names.

## 3. Candidate Integration Strategies

### Option A: Local-Only Harness Integration

Use Node or Playwright/local harnesses to exercise the helpers without loading them on the live page.

What changes:

- Add or run harness tests that require the helpers and install them against mocked or local browser-like globals.
- No `portal/events.html` change.
- No live browser script-load change.
- No production runtime behavior change.

Risk level: Low.

Pros:

- Exercises real helper behavior before the helpers touch the page.
- Can validate missing dependency failures and optional dependency fallback behavior.
- Can test preserve-by-default behavior for existing globals.
- Can test inline handler installation summaries without exposing users to the new adapters.
- Supports repeatable regression checks in CI or local scripts.

Cons:

- Does not prove actual page load order or CDN/global timing.
- Does not catch every browser-only behavior unless the harness uses Playwright or a real browser context.
- Requires careful mocks so tests do not become disconnected from the real runtime contract.

Validation needed:

- Helper smoke tests remain green.
- Harness tests install `externalGlobals`, `windowExports`, and `inlineHandlers` against controlled globals.
- Preserve-by-default and explicit replacement paths are covered.
- Missing required globals fail clearly.
- Optional globals degrade to `null` where expected.
- No helper introduces duplicate init, listener, or handler installation side effects.

Rollback notes:

- Remove the harness test or disable its invocation if it proves flawed.
- No production rollback is needed because runtime files and `portal/events.html` remain unchanged.

### Option B: Classic Script Rehearsal

Add helpers to the classic script list before `init.js`, but only in a later approved phase.

What changes:

- In a later approved implementation step, `portal/events.html` would load the helper files as classic scripts before `init.js`.
- Existing classic feature files would still load and own their current behavior.
- The helpers would expose `window.PortalEvents.externalGlobals`, `window.PortalEvents.windowExports`, and `window.PortalEvents.inlineHandlers` in the browser.

Risk level: Medium to High.

Pros:

- Tests real browser script loading while preserving the classic page architecture.
- Can prove helpers are syntactically safe as classic scripts in the actual page.
- Could provide a bridge between current classic runtime and future module entry.
- Gives the live verifier something concrete to inspect before Phase 5.

Cons:

- It modifies `portal/events.html`, so it is a runtime change even if helper functions are not actively called.
- Browser cache behavior for new bare JS assets must be verified.
- Script order must be exact; adding helpers too early or too late could hide timing problems.
- Any helper self-registration under `window.PortalEvents.*` is a browser-visible state change.
- It could create confusion if helpers exist on `window` but current runtime does not use them yet.

Validation needed:

- Static script-order smoke test for `portal/events.html`.
- Browser load smoke with console error and failed request checks.
- Live global verifier checking helper bridge surfaces and existing Phase 1-3E surfaces.
- Bare asset cache checks for the added helper URLs.
- Duplicate initialization and duplicate listener checks.
- Rollback rehearsal to remove helper script tags and verify the old classic page state.

Rollback notes:

- Remove the helper script tags from `portal/events.html`.
- Verify the bare `portal/events.html` asset and affected helper URLs are fresh.
- Rerun the live global verifier and page-load smoke checks.
- Confirm `window.PortalEvents.*`, `window.EventsCreate`, `window.EventsManage`, `window.EventsRaffleModel`, and representative `window.evt*` globals remain available through the original classic files.

### Option C: Future Module-Entry Integration

Import helpers from a future `index.js` after Phase 5 readiness gates pass.

What changes:

- In a later Phase 5 module-entry step, `js/portal/events/index.js` would become the module orchestrator.
- The module entry would import `external-globals.js`, receive or import feature APIs, call `window-exports.js`, call `inline-handlers.js`, and then invoke one canonical initializer.
- `portal/events.html` would eventually switch to one module script only after rehearsal and approval.

Risk level: High.

Pros:

- Aligns with the Phase 4C future architecture.
- Gives one orchestrator control over dependency access, compatibility installation, and initialization order.
- Avoids adding transitional classic helper tags if the project is ready to jump directly to a rehearsed module entry later.
- Can reduce long-term duplicate compatibility wiring once feature modules exist.

Cons:

- Phase 5 is not ready now.
- Current files are still classic scripts, not native modules.
- Feature APIs are not physically split into importable modules yet.
- `init.js` still owns classic `DOMContentLoaded` behavior and must remain duplicate-init safe.
- A module entry could run alongside old classic paths if the switch is not carefully rehearsed.
- Rollback and cache verification become critical because `portal/events.html` would change.

Validation needed:

- All Phase 4F helper smokes.
- Local module-entry rehearsal in a branch or isolated page.
- Consolidated live global verifier.
- Seeded E2E for list/detail/create/manage/RSVP/waitlist/documents/raffle/competition/map/scanner/scrapbook flows as applicable.
- Duplicate init tests.
- Create/manage singleton tests.
- Bare asset cache checks.
- Documented rollback rehearsal.

Rollback notes:

- Restore the previous classic script list in `portal/events.html`.
- Remove or disable the module entry script.
- Verify bare `portal/events.html` and changed JS assets are fresh.
- Rerun live global verifier and seeded smoke coverage.
- Confirm no stale module asset is still being served in the browser path.

## 4. Recommended Strategy

Recommended strategy:

1. Local-only harness tests first.
2. Consolidated live verifier next.
3. Classic script rehearsal only if the project needs a pre-module browser-loading proof.
4. Module-entry integration later, after Phase 5 readiness gates pass.

This recommendation matches the current evidence:

- The helpers exist and have smoke tests.
- They are not loaded by the browser yet.
- `portal/events.html` still depends on the current classic script order.
- The live verifier is still fragmented.
- Seeded fixtures and seeded E2E are still missing.
- State and service wrappers are still missing.
- Cache verification and rollback have not been rehearsed.

The safest next step is Option A: add local-only runtime harness coverage for the helpers without loading them on the live page. After that, consolidate the live verifier so the current runtime contract is measurable before any browser loading or integration change.

## 5. Helper-by-Helper Integration Plan

### `external-globals.js`

When it should first be used:

- First in tests only, through local-only runtime harness coverage.
- Later by a classic rehearsal or future module entry when there is an approved plan for dependency validation timing.

Dependencies it should validate first:

- Required: `supabaseClient`, `checkAuth`, and `hasPermission`.
- Action-dependent required: `callEdgeFunction` and `getFunctionUrl` when checkout/admin/action paths explicitly request them.
- Optional: `QRCode`, `jsQR`, `L`, notification helper globals, and push helper globals.

Whether it should be called by tests only first:

- Yes. The first integration pass should call it from tests only. That keeps failure-mode validation separate from the live browser page.

Failure modes needing tests:

- Missing `supabaseClient` fails clearly before private data access.
- Missing `checkAuth` fails clearly before private boot.
- Missing `hasPermission` fails clearly before create/manage affordances can fail open.
- Missing `callEdgeFunction` fails only when action-dependent code asks for it.
- Missing `getFunctionUrl` fails only when URL construction is requested.
- Missing `QRCode`, `jsQR`, or `L` returns `null` and allows degraded UI paths.
- Notification and push helpers remain optional.

Unclear items:

- The exact public notification API surface remains unclear. The current helper treats notification globals as optional. A follow-up check should confirm whether a stable notifications API should be exposed later.

### `window-exports.js`

When it should first install real APIs:

- First in a local-only harness with mocked APIs.
- Later against real runtime APIs only after the live verifier can confirm existing globals before and after installation.

How to avoid replacing current live globals:

- Use preserve-by-default behavior.
- Do not pass `options.replaceClassicGlobals: true` during early integration.
- Prefer namespace extension through `assignNamespace()` instead of replacing entire `window.PortalEvents.*` objects.
- Install only missing or explicitly approved API surfaces in early rehearsals.

How it should preserve `EventsCreate`, `EventsManage`, and `EventsRaffleModel`:

- Keep `window.EventsCreate` as the public create sheet object with `open`, `close`, and `isFlagOn`.
- Keep `window.EventsManage` as the public manage sheet object with `open`, `close`, and `refreshRaffle`.
- Keep `window.EventsRaffleModel` as the public raffle model API used by detail/create/manage/raffle paths.
- Treat `window.PortalEvents.create`, `window.PortalEvents.manage`, and `window.PortalEvents.raffleModel` as aliases or compatible namespace bridges, not replacements that change behavior.

How to handle `window.evt*`:

- Use the `globals` bag only with explicit names.
- Do not generate compatibility globals from broad object loops unless tests can prove the full expected surface.
- Preserve current `window.evt*` handlers unless a later approved step explicitly replaces them with canonical handlers.
- Validate representative handlers in the live verifier before and after any integration.

### `inline-handlers.js`

When it should first install real handlers:

- First in a local-only harness with mocked handler functions.
- Later in a browser rehearsal only after representative inline handler groups have tests.

How it should map existing inline handler names:

- Keep explicit groups for RSVP, waitlist, raffle, competition, documents, scrapbook, map, scanner, detail, create, manage, and comments.
- Preserve existing handlers by default.
- Use `replaceExisting: true` only for a deliberate migration where the replacement function is confirmed as canonical.
- Record `installed`, `preserved`, `skipped`, and `replaced` summary results in tests.

Which handler group should be tested first:

- Test the detail/RVP path first if using mocked/local harness coverage, because `evtHandleRsvp` is a small, high-value representative inline action.
- For live or seeded E2E, test list/detail navigation plus RSVP/waitlist first because those flows touch the common user path without requiring admin mutation surfaces.
- Competition should not be the first live group because it has wider table, storage, vote, moderation, and phase risks.

When delegated listeners can replace inline handlers:

- Only after the relevant inline group has seeded or mocked E2E coverage.
- Only one category at a time.
- Only after the compatibility handler remains available during the migration.
- Only after duplicate listener tests prove delegated listeners do not bind repeatedly after navigation, refresh, or detail re-render.

## 6. Required Test Gates Before Wiring

Before any runtime wiring, these gates should pass:

- Existing Phase 4F helper smoke tests.
- Runtime harness tests for the three helpers.
- Consolidated live global verifier for current Phase 1-3E surfaces.
- Live verifier checks for `window.PortalEvents.*`, `window.EventsCreate`, `window.EventsManage`, `window.EventsRaffleModel`, and representative `window.evt*` handlers.
- Duplicate init tests for repeated `initEventsPage()` calls.
- Duplicate event listener tests for list filters, detail actions, create/manage buttons, and delegated handler paths.
- Inline handler tests for representative RSVP/waitlist, detail, competition, documents, map/scanner, and media actions.
- Create sheet singleton tests.
- Manage sheet singleton tests.
- Seeded fixture tests where realistic list/detail/manage/create/competition data is required.
- Seeded E2E for the highest-risk workflows before module-entry integration.
- Missing required dependency tests for `supabaseClient`, `checkAuth`, `hasPermission`, `callEdgeFunction`, and `getFunctionUrl`.
- Missing optional dependency degraded-mode tests for `QRCode`, `jsQR`, `L`, notification helpers, and push helpers.
- Bare asset cache checks for any JS asset added to or changed in the browser runtime path.
- Rollback check proving the prior classic runtime can be restored and verified.

## 7. Runtime Integration Order

Safe proposed order:

1. Keep the current helpers isolated and maintain their smoke tests.
2. Strengthen static smoke tests only if gaps are found in the current helper contracts.
3. Add local-only runtime harness tests for `external-globals.js` using mocked required and optional globals.
4. Add local-only runtime harness tests for `window-exports.js` using mocked APIs and existing globals.
5. Add local-only runtime harness tests for `inline-handlers.js` using mocked handler groups.
6. Consolidate the live verifier for the current classic runtime before any helper browser loading.
7. Use `window-exports.js` in a local-only harness against a representative `PortalEvents` object.
8. Use `inline-handlers.js` in a local-only harness against representative `evt*` handlers.
9. Decide whether a classic script rehearsal is needed.
10. If approved later, rehearse helper browser loading in a controlled branch or local/staging environment, with cache checks and rollback ready.
11. Only after verifier, fixture, E2E, state-wrapper, service-wrapper, cache, and rollback gates pass, consider Phase 5 module-entry integration.

## 8. Rollback Plan

### Rollback for Option A: Local-Only Harness Integration

- Remove or disable the harness tests.
- Keep helper files unchanged if their contracts remain valid.
- No runtime rollback is needed because the browser path was not changed.
- Rerun helper smoke tests to confirm the helpers remain stable.

### Rollback for Option B: Classic Script Rehearsal

- Remove helper script tags from `portal/events.html`.
- Revert any helper installation calls added during the rehearsal.
- Confirm existing classic files still install prior globals.
- Verify `window.PortalEvents.*`, `window.EventsCreate`, `window.EventsManage`, `window.EventsRaffleModel`, and representative `window.evt*` handlers.
- Confirm bare asset freshness for `portal/events.html` and any helper JS assets using headers such as `cf-cache-status`, `Age`, `ETag`, `Last-Modified`, and `Cache-Control`.
- Rerun the consolidated live global verifier.

### Rollback for Option C: Future Module-Entry Integration

- Restore the previous classic script list in `portal/events.html`.
- Remove the module-entry script from the page.
- Revert module-entry helper installation calls.
- Confirm helper-imported modules are no longer required for page boot.
- Confirm bare asset freshness for `portal/events.html`, the module entry, and changed runtime assets.
- Rerun the live global verifier, helper smokes, duplicate-init checks, and seeded workflow tests.
- Confirm the prior classic globals are restored by the classic files, not by stale cached module assets.

## 9. Go / No-Go Recommendation

Should helpers be wired into live runtime now? No.

Should Phase 5 start now? No.

Next single safest step: implement local-only runtime harness tests for the three compatibility helpers, starting with `external-globals.js`, without loading the helpers from `portal/events.html` and without changing runtime code.

After local harness coverage exists, the next safest follow-up is to consolidate the live global verifier for the current classic runtime. That verifier should measure the existing contract before any browser loading rehearsal or module-entry work begins.
