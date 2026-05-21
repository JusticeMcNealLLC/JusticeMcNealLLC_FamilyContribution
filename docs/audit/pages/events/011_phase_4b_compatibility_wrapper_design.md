# Events Refactor Phase 4B Compatibility Wrapper Design

Date: 2026-05-21

This document designs the compatibility wrapper strategy for the portal events refactor. It is documentation only. It does not create `js/portal/events/compat/window-exports.js`, `js/portal/events/compat/inline-handlers.js`, or `js/portal/events/compat/external-globals.js` yet.

References:

- `docs/audit/pages/events/009_phase_4_preparation_plan.md`
- `docs/audit/pages/events/010_phase_4a_state_data_boundary_inventory.md`

## 1. Current Compatibility Problem

The portal events page still uses classic script loading from `portal/events.html`. Scripts execute in order and share state through top-level names and `window` globals. This is the core compatibility constraint for Phase 4.

Current page loading includes external libraries and global app helpers before portal event scripts:

- Supabase browser client from CDN.
- `../js/config.js`, which provides `supabaseClient` and function URL helpers.
- Page shell, notification, and push scripts.
- `../js/auth/shared.js`, which provides auth and permission helpers such as `checkAuth` and `hasPermission`.
- QR and scanner libraries: `QRCode` and `jsQR`.
- Leaflet global `L` for maps.
- Classic portal event scripts from `index.js` through `init.js`.

The current events runtime depends on several public global surfaces:

- `window.evt*` globals used by generated markup, cross-file calls, and legacy behavior.
- `window.EventsCreate` for the create sheet.
- `window.EventsManage` for the manage sheet.
- `window.EventsRaffleModel` for raffle config normalization and draw helpers.
- `window.PortalEvents.*` bridge surfaces introduced in Phase 1-3E.

Generated markup still contains many inline handlers such as `onclick="evtHandleRsvp(...)"`, `onclick="evtJoinCompetition(...)"`, `onclick="evtOpenDocumentsPanel(...)"`, `onchange="evtToggleLocationSharing(...)"`, and older create cost-builder handlers. These handlers require names to exist on `window`, regardless of whether future internals become imports.

Compatibility wrappers are needed because future module code cannot safely remove or rename globals until every classic caller, inline handler, and external dependency has an explicit adapter. Without a wrapper strategy, Phase 4/5 work could break working flows even if imported code compiles.

## 2. Compatibility Goals

Phase 4B protects the current runtime contract while allowing future internal imports.

Goals:

- No behavior change.
- No broken inline handlers.
- No missing globals.
- No duplicate initialization.
- No broken list/detail/create/manage/competition flows.
- No `portal/events.html` changes yet.
- No physical file splitting yet.
- No removal of `window.evt*`, `window.Events*`, or `window.PortalEvents.*` surfaces yet.
- Future internals can move toward imports while current classic-script behavior remains intact.
- Missing optional external libraries degrade gracefully where the current UI can reasonably continue.
- Missing required platform dependencies fail clearly and early, not through obscure downstream errors.

Compatibility wrappers should be boring and conservative. Their job is to hold the outside contract steady while implementation details change behind it.

## 3. Proposed `compat/window-exports.js`

### Purpose

Future `compat/window-exports.js` should be the single place that attaches internal event APIs to `window` for classic compatibility.

It should answer one question: given internal modules or existing classic functions, what public `window` names must exist after event scripts initialize?

### Load / Import Timing

Before Phase 5:

- It should not be added to `portal/events.html` yet unless a later approved implementation phase explicitly scopes that change.
- It can be designed to be imported by future module entry code.
- It can also be callable from classic scripts if a transitional phase needs it, but that should be a deliberate step.

During Phase 5:

- It should run after internal modules are imported and before `initEventsPage()` is called.
- It should attach compatibility globals before any generated markup can invoke inline handlers.

### What It Should Attach

It should attach or preserve:

- `window.PortalEvents`
- `window.PortalEvents.initEventsPage`
- `window.PortalEvents.constants`
- `window.PortalEvents.raffleModel`
- `window.PortalEvents.list`
- `window.PortalEvents.detail`
- `window.PortalEvents.manage`
- `window.PortalEvents.create`
- `window.PortalEvents.competition`
- `window.EventsRaffleModel`
- `window.EventsCreate`
- `window.EventsManage`
- Existing `window.evt*` functions used by classic scripts and inline handlers.

### Safe Seed Rules

Use safe seed patterns:

```js
window.PortalEvents = window.PortalEvents || {};
window.PortalEvents.list = window.PortalEvents.list || {};
```

Assignments should be repeat-safe:

- Preserve existing objects when possible.
- Fill missing methods.
- Replace methods only when the replacement is the intended canonical implementation.
- Avoid replacing entire namespace objects if another script has already attached keys.

Example design pattern:

```js
function assignNamespace(root, key, api) {
  root[key] = root[key] || {};
  Object.assign(root[key], api);
  return root[key];
}
```

### How To Preserve `window.evt*`

Future modules should export internal actions with stable names. `window-exports.js` should map them to legacy globals:

```js
window.evtHandleRsvp = rsvpActions.handleRsvp;
window.evtOpenDetail = detailActions.open;
window.evtJoinCompetition = competitionActions.join;
```

The mapping should be explicit, grouped by feature, and covered by static smoke tests. Avoid loops over unnamed objects for critical compatibility globals because missing or misspelled keys should be easy to review.

### How To Preserve `window.EventsCreate`

`window.EventsCreate` should remain an object with at least:

- `open`
- `close`
- `isFlagOn`

It should point to the same implementation as `window.PortalEvents.create` during migration.

### How To Preserve `window.EventsManage`

`window.EventsManage` should remain an object with at least:

- `open`
- `close`
- `refreshRaffle`

It should point to the same implementation as `window.PortalEvents.manage` during migration.

### How To Preserve `window.EventsRaffleModel`

`window.EventsRaffleModel` should remain the classic raffle model API. `window.PortalEvents.raffleModel` should remain an alias to the same API or a compatible wrapper.

Do not split model normalization from this public surface until detail/create/manage raffle callers are fully moved to imports.

### How To Preserve `window.PortalEvents.*`

`window.PortalEvents.*` should become the public bridge registry for future module internals. During Phase 4, each namespace should remain available after script load and should be treated as compatibility-safe.

### What Should Not Belong Here

`window-exports.js` should not own:

- Supabase queries.
- Edge Function calls.
- Storage uploads.
- DOM rendering.
- Event listener binding, except perhaps one small export-time guard if absolutely needed.
- Business logic.
- Test fixtures.
- Cache-busting or deployment checks.

It should only attach public compatibility names.

## 4. Proposed `compat/inline-handlers.js`

### Purpose

Future `compat/inline-handlers.js` should preserve old inline handler names while the UI migrates away from inline `onclick`, `onchange`, and related attributes.

It should be a temporary adapter between generated markup and imported/internal actions.

### Current Inline Handler Categories

Observed categories:

- RSVP and waitlist buttons.
- Competition controls.
- Documents controls.
- Scrapbook controls.
- Map and scanner controls.
- Manage sheet inline controls.
- Legacy create sheet / create modal controls.
- Detail navigation, media, share, CTA, and admin controls.
- Raffle entry/draw controls.

### Temporary Window Handlers

Because the current markup calls global functions directly, the future handler adapter should keep these names on `window` until each markup category is migrated.

Suggested shape:

```js
export function installInlineHandlers(actions) {
  window.evtHandleRsvp = actions.rsvp.handle;
  window.evtJoinWaitlist = actions.waitlist.join;
  window.evtJoinCompetition = actions.competition.join;
  window.evtOpenDocumentsPanel = actions.documents.openPanel;
}
```

The adapter should be idempotent and should avoid rebinding document-level delegated listeners more than once.

### Delegated Listener Migration

Long-term, inline handlers should be replaced with data attributes and delegated listeners, for example:

```html
<button data-evt-action="rsvp" data-event-id="..." data-status="going"></button>
```

Then a feature module or `inline-handlers` adapter can bind one listener per container.

Do not do this globally all at once. Migrate one category at a time with tests.

### RSVP Buttons

Current handlers include:

- `evtHandleRsvp`
- `evtJoinWaitlist`
- `evtLeaveWaitlist`
- `evtClaimWaitlistSpot`
- `evtRequestGraceRefund`
- `evtMessageHost`

Migration strategy:

- Keep current `window.evt*` handlers.
- Add wrapper actions that call imported RSVP/waitlist services later.
- Replace detail markup with delegated `data-evt-action` attributes only after RSVP E2E coverage exists.

### Competition Controls

Current handlers include:

- `evtJoinCompetition`
- `evtSubmitEntry`
- `evtCastVote`
- `evtModerateEntry`
- `evtContributeToPrizePool`
- `evtStartPhase`
- `evtAdvancePhase`
- `evtExtendPhase`
- `evtFinalizeCompetition`
- `evtRecalcCompTiers`

Migration strategy:

- Keep handlers globally exported through Phase 4.
- Move implementation behind `competitionActions` and `competitionService` later.
- Replace inline competition controls after seeded competition E2E smoke exists.

### Documents Controls

Current handlers include:

- `evtOpenDocumentsPanel`
- `evtCloseDocumentsPanel`
- `evtShowUploadForm`
- `evtUploadDocument`
- `evtDownloadDocument`
- `evtMarkDistributed`
- `evtDeleteDocument`

Migration strategy:

- Keep global handlers.
- Route implementations through `documentsActions` and `documentsService` later.
- Degrade gracefully if document storage/signing helpers fail, but fail visibly for upload/delete errors.

### Scrapbook Controls

Current handlers include:

- `evtUploadPhoto`
- `evtDeletePhoto`
- `evtViewPhoto`
- `evtHandlePhotoSelect` as the actual selected-file action.

Migration strategy:

- Keep global handlers while markup uses inline `onchange`/`onclick`.
- Replace with delegated upload/photo actions after seeded photo fixture coverage exists.

### Map / Scanner Controls

Current handlers include:

- `evtInitMap`
- `evtToggleLocationSharing`
- `evtOpenScanner`
- `evtCloseScanner`
- `evtOpenFullscreenMap`
- `evtRecenterFullscreenMap`
- `evtCloseFullscreenMap`

Migration strategy:

- Keep global handlers because they manage browser APIs and device resources.
- Move Supabase reads/writes behind `locationService` and `checkinsService` first.
- Replace inline handlers only after map/scanner cleanup tests exist.

### Manage Sheet Inline Controls

Known dependencies include:

- `window.EventsManage.close()`.
- `window.evtOpenScanner`.
- `window.evtOpenRaffleDraw`.
- `_emToggleFeatured`.

Migration strategy:

- Keep `window.EventsManage` and `_emToggleFeatured` until manage sheet controls are fully delegated.
- Prefer wiring button listeners after render where possible.
- Ensure sheet root and per-tab listeners do not duplicate.

### Create Sheet Controls

Legacy `create.js` still has inline cost-builder and preview handlers:

- `evtAddCostItem`
- `evtRemoveCostItem`
- `evtUpdateCostItem`
- `evtClosePreview`

Current `create/sheet.js` uses direct listeners and local `STATE` more heavily, but `window.EventsCreate` and `window.PortalEvents.create` must remain.

Migration strategy:

- Keep legacy create handlers until legacy create modal/form is intentionally retired or fully wrapped.
- Do not remove `create.js` from `portal/events.html` until Phase 5 readiness proves it is safe.

## 5. Proposed `compat/external-globals.js`

### Purpose

Future `compat/external-globals.js` should provide safe accessors for globals loaded outside the portal events module stack.

It should not hide real configuration errors. It should make dependency expectations explicit.

### External Global Contract

| Dependency | Current source | Current users | Proposed accessor | Missing behavior |
| --- | --- | --- | --- | --- |
| `supabaseClient` | `../js/config.js` after Supabase CDN | Nearly all event data modules | `getSupabaseClient()` | Fail hard with clear error; page cannot load event data without it. |
| `callEdgeFunction` | `../js/config.js` or shared config helper | RSVP, competition, manage | `getCallEdgeFunction()` | Fail hard for checkout/admin action attempts; non-payment views can degrade until action is invoked. |
| `getFunctionUrl` | `../js/config.js` or shared config helper | Legacy create geocode flow | `getFunctionUrlHelper()` | Degrade gracefully for optional geocode; hard fail if a required function URL is requested. |
| `checkAuth` | `../js/auth/shared.js` | `init.js` | `getCheckAuth()` | Fail hard for page initialization because auth gates the portal. |
| `hasPermission` | `../js/auth/shared.js` | `init.js`, permission-gated UI | `getHasPermission()` | Degrade to false for optional affordances, but log clearly; admin/create visibility may be hidden. |
| `QRCode` | CDN script in `portal/events.html` | QR/ticket/check-in rendering, exact users should be re-grepped before implementation | `getQRCode()` | Degrade gracefully where QR rendering is optional; show readable fallback if ticket QR cannot render. |
| `jsQR` | CDN script in `portal/events.html` | `scanner.js` | `getJsQR()` | Degrade gracefully by showing scanner unavailable; do not crash page load. |
| `L` | Leaflet CDN script in `portal/events.html` | `map.js` | `getLeaflet()` | Degrade gracefully by hiding/disabled map controls or showing map unavailable. |
| Notification helpers | `../js/components/notifications.js` | Page shell / notification UI; events code impact unclear | `getNotificationsApi()` | Degrade gracefully; should not block events page. Follow-up grep before implementation. |
| Push helpers | `../js/push.js` | Push registration/page shell; events code impact unclear | `getPushApi()` | Degrade gracefully; should not block events page. Follow-up grep before implementation. |

Unclear items:

- The exact `QRCode` use inside portal events should be confirmed before implementation. The page loads QRCode and scanner/test flows likely rely on QR rendering, but Phase 4B did not need deeper proof.
- Notification/push helper coupling to portal event flows is unclear. Current loading order includes those scripts, but direct event-module usage should be verified with a focused grep/test before wrapping.

### Accessor Design

Accessor helpers should return the dependency or throw/return null based on dependency class.

Suggested pattern:

```js
export function requireGlobal(name, purpose) {
  if (typeof window[name] === 'undefined') {
    throw new Error(`${name} is required for ${purpose}`);
  }
  return window[name];
}

export function optionalGlobal(name) {
  return typeof window[name] === 'undefined' ? null : window[name];
}
```

Do not access optional globals repeatedly throughout feature code. Centralize the check and let UI decide whether to render or disable optional controls.

## 6. Bridge Surface Contract

| Surface | Current purpose | Future module replacement | Long-term status | Risk |
| --- | --- | --- | --- | --- |
| `window.PortalEvents.initEventsPage` | Public callable page initializer with duplicate guard. | `initEventsPage` imported by future `index.js`. | Stay public during and likely after migration for diagnostics/E2E. | High: page boot depends on it. |
| `window.PortalEvents.constants` | Namespaced constants bridge. | Imported constants module. | Compatibility-only long-term. | Low. |
| `window.PortalEvents.raffleModel` | Namespaced alias to raffle model API. | Imported `raffle/model` module. | Compatibility-only while create/detail/manage use globals. | Medium: raffle config is shared. |
| `window.PortalEvents.list` | Namespaced list load/render/filter/search/calendar helpers. | Imported list feature module. | Compatibility-only long-term, except useful diagnostics. | High: main page render. |
| `window.PortalEvents.detail` | Detail render/navigation helpers and registry. | Imported detail feature module plus registry/feature wiring. | Possibly public diagnostics, but mostly compatibility. | High: many feature integrations. |
| `window.PortalEvents.manage` | Manage sheet `open`, `close`, `refreshRaffle`. | Imported manage feature module. | Public enough to keep for admin/portal open calls. | High: admin/host operations. |
| `window.PortalEvents.create` | Create sheet `open`, `close`, `isFlagOn`. | Imported create feature module. | Public enough to keep for create CTA calls. | High: create workflow. |
| `window.PortalEvents.competition` | Competition render/action helper bridge. | Imported competition feature module/actions. | Compatibility-only long-term after inline handlers move. | High: many actions/tables. |

## 7. Legacy Global Contract

All legacy globals below should remain through Phase 4. Removal requires the readiness criteria listed for each group.

### Init / List / Detail

Examples:

- `evtLoadEvents`
- `evtRenderEvents`
- `evtSetupSearch`
- `evtInitFilterChips`
- `evtRenderFeatured`
- `evtUpdateHeroStats`
- `evtRenderCard`
- `evtOpenDetail`
- `evtNavigateToEvent`
- `evtNavigateToList`
- `evtOpenLightbox`
- `evtOpenFullscreenMap`
- `evtRecenterFullscreenMap`
- `evtCloseFullscreenMap`
- `evtCopyShareUrl`
- `evtDownloadIcs`
- `evtOpenCtaPanel`
- `evtCloseCtaPanel`

Why they still exist:

- List/detail generated markup and route helpers call them directly.
- E2E and live verification use some of these names.

Future replacement:

- `listActions`, `detailActions`, `router`, and delegated listeners.

Removal readiness:

- No inline markup references remain.
- Route/detail/list E2E covers direct URL, back to list, browser navigation, and duplicate init.

### RSVP / Waitlist

Examples:

- `evtHandleRsvp`
- `evtHandleRaffleEntry`
- `evtHandleFreeRaffleEntry`
- `evtJoinWaitlist`
- `evtLeaveWaitlist`
- `evtClaimWaitlistSpot`
- `evtRequestGraceRefund`
- `evtMessageHost`

Why they still exist:

- Detail CTA, raffle CTA, paid RSVP, and waitlist markup call them inline.

Future replacement:

- `rsvpActions`, `waitlistActions`, `checkoutService`, delegated detail/CTA listeners.

Removal readiness:

- Seeded RSVP/waitlist E2E exists and all inline RSVP/waitlist calls are replaced.

### Create / Manage

Examples:

- `window.EventsCreate.open`
- `window.EventsCreate.close`
- `window.EventsCreate.isFlagOn`
- `window.EventsManage.open`
- `window.EventsManage.close`
- `window.EventsManage.refreshRaffle`
- `evtAddCostItem`
- `evtRemoveCostItem`
- `evtUpdateCostItem`
- `evtClosePreview`
- `_emToggleFeatured`

Why they still exist:

- Create/manage sheets are opened from multiple contexts.
- Legacy create controls and manage helpers still rely on globals.

Future replacement:

- `createActions`, `manageActions`, local sheet state modules, services for persistence.

Removal readiness:

- Create and manage E2E cover open/close, no duplicate roots, submit/edit/save paths, and legacy create path retirement is explicit.

### Comments / Documents

Examples:

- `evtPostComment`
- `evtOpenDocumentsPanel`
- `evtCloseDocumentsPanel`
- `evtShowUploadForm`
- `evtUploadDocument`
- `evtDownloadDocument`
- `evtMarkDistributed`
- `evtDeleteDocument`

Why they still exist:

- Detail comments and documents markup call them inline.

Future replacement:

- `commentsActions`, `documentsActions`, `documentsService`, delegated listeners.

Removal readiness:

- Comments/documents E2E exists with upload/download/delete/distribution coverage.

### Map / Scanner

Examples:

- `evtInitMap`
- `evtToggleLocationSharing`
- `evtOpenScanner`
- `evtCloseScanner`

Why they still exist:

- Map controls and scanner controls are invoked by inline markup and modal listeners.

Future replacement:

- `mapActions`, `scannerActions`, `locationService`, `checkinsService`.

Removal readiness:

- Map and scanner E2E/manual smoke proves cleanup of geolocation, realtime subscriptions, camera streams, and modal roots.

### Raffle

Examples:

- `window.EventsRaffleModel`
- `evtOpenRaffleDraw`
- `evtCloseRaffleDraw`
- `evtDrawWinner`
- `evtHandleRaffleEntry`
- `evtHandleFreeRaffleEntry`

Why they still exist:

- Detail, create, manage, and raffle draw flows share raffle model and action globals.

Future replacement:

- `raffleModel`, `raffleActions`, `raffleService`.

Removal readiness:

- Raffle config normalization and draw E2E/static tests cover create/manage/detail parity.

### Competition

Examples:

- `evtBuildCompetitionHtml`
- `evtBuildSubmitFormHtml`
- `evtJoinCompetition`
- `evtSubmitEntry`
- `evtCastVote`
- `evtModerateEntry`
- `evtContributeToPrizePool`
- `evtStartPhase`
- `evtAdvancePhase`
- `evtExtendPhase`
- `evtFinalizeCompetition`
- `evtRecalcCompTiers`

Why they still exist:

- Competition markup calls actions inline.
- Detail registry uses competition build helpers.

Future replacement:

- `competitionRenderer`, `competitionActions`, `competitionService`.

Removal readiness:

- Seeded competition E2E covers render, join, submit, vote, moderation, phase transitions, contribution, finalization, and tier recalculation.

### Scrapbook

Examples:

- `evtUploadPhoto`
- `evtDeletePhoto`
- `evtViewPhoto`
- `evtHandlePhotoSelect`

Why they still exist:

- Scrapbook generated markup calls them inline.

Future replacement:

- `scrapbookActions`, `scrapbookService`, delegated upload/photo controls.

Removal readiness:

- Scrapbook E2E/manual smoke covers render, upload, view, delete, and permissions.

## 8. Idempotency Rules

Compatibility wrappers must be repeat-safe.

Rules:

- Never overwrite existing namespaces blindly.
- Always seed with safe patterns such as `window.PortalEvents = window.PortalEvents || {}`.
- Preserve existing namespace objects and assign keys into them.
- Bridge assignments should be repeat-safe.
- If replacing a function, replace only with the canonical implementation for that phase.
- `initEventsPage()` must remain guarded.
- Document-level event listeners must avoid duplicate binding.
- Window-level scroll/resize/popstate listeners must avoid duplicate binding.
- Sheet roots must not duplicate: create sheet root and manage sheet root should remain singletons.
- Custom events such as `events:created`, `events:manage:updated`, and `events:manage:deleted` should not be double-dispatched by wrappers.
- Compatibility installers should be explicit about whether they install only globals or also listeners.
- Wrappers should be safe to call in tests more than once.

Recommended installer shape:

```js
let installed = false;

export function installWindowExports(apis) {
  if (installed) return window.PortalEvents;
  installed = true;
  window.PortalEvents = window.PortalEvents || {};
  // assign APIs here
  return window.PortalEvents;
}
```

If an installer must support hot replacement during tests, expose a deliberate test-only reset instead of relying on accidental reinstallation.

## 9. Migration Strategy

Safe order for moving from globals to imports:

1. Keep classic scripts and current globals.
2. Introduce compatibility wrapper design in docs first.
3. Add compatibility wrappers behind existing globals in a later approved implementation phase.
4. Keep `portal/events.html` unchanged while wrappers are introduced.
5. Move internal code to call wrapper accessors where it reduces risk.
6. Replace direct external global reads with `external-globals` accessors.
7. Replace direct shared state global reads with state helpers.
8. Replace direct data access with feature services.
9. Replace inline handlers with delegated listeners or wrapper handlers one category at a time.
10. Expand tests after each category migration.
11. Only after wrapper, state, service, and inline-handler readiness should Phase 5 prepare a single module entry.

Adjusted for this codebase:

- Start with `external-globals` and `window-exports` because they are easiest to verify statically.
- Do not tackle `detail.js` inline handlers all at once; it is the highest integration risk.
- Competition should get service/action boundaries before physical file splitting.
- Create/manage sheets should preserve their local UI `STATE` while moving persistence behind services later.

## 10. Testing Strategy

Compatibility wrapper work needs both static and live verification.

Static smoke tests:

- Verify every expected `window.PortalEvents.*` assignment exists.
- Verify every expected `window.Events*` assignment exists.
- Verify every expected `window.evt*` compatibility mapping exists.
- Verify wrappers use safe seed patterns.
- Verify wrappers do not change `portal/events.html` during Phase 4.

Live globals verification:

- Verify `window.PortalEvents.initEventsPage`.
- Verify `window.PortalEvents.constants`.
- Verify `window.PortalEvents.raffleModel`.
- Verify `window.PortalEvents.list`.
- Verify `window.PortalEvents.detail`.
- Verify `window.PortalEvents.manage`.
- Verify `window.PortalEvents.create`.
- Verify `window.PortalEvents.competition`.
- Verify representative `window.evt*`, `window.EventsCreate`, `window.EventsManage`, and `window.EventsRaffleModel` globals.

Duplicate init tests:

- Call `window.PortalEvents.initEventsPage()` more than once.
- Assert no duplicate event cards.
- Assert no duplicate network requests beyond expected refresh behavior.
- Assert no duplicate listeners that double-trigger actions.

Missing external global tests:

- Simulate missing optional `jsQR` and assert scanner degrades gracefully.
- Simulate missing optional `L` and assert map controls degrade gracefully.
- Simulate missing required `supabaseClient` and assert clear failure.
- Simulate missing `hasPermission` and assert create/manage affordances fail closed.

Create/manage sheet tests:

- Create sheet open/close does not duplicate `#ecSheetRoot`.
- Manage sheet open/close does not duplicate `#emSheetRoot`.
- Reopening sheets does not duplicate listeners.
- Manage/update custom events fire once per action.

Inline handler smoke tests:

- Trigger representative RSVP inline handler.
- Trigger representative competition inline handler.
- Trigger representative document inline handler.
- Trigger representative scrapbook inline handler.
- Trigger representative map/scanner inline handler.
- Trigger representative create/manage compatibility handlers.

Deployment cache checks:

- For every changed bare JS asset, verify the actual URL loaded by `portal/events.html`.
- Do not rely only on cache-busted URLs.
- Capture `cf-cache-status`, `Age`, `ETag`, `Last-Modified`, and `Cache-Control`.
- Run live globals verification after bare asset refresh.

## 11. Phase 4C Readiness Checklist

Before Phase 4C module import map/design starts, confirm:

- [ ] Known globals are documented.
- [ ] Inline handler categories are documented.
- [ ] External globals are documented.
- [ ] Wrapper responsibilities are agreed.
- [ ] `window-exports.js` responsibilities are agreed.
- [ ] `inline-handlers.js` responsibilities are agreed.
- [ ] `external-globals.js` responsibilities are agreed.
- [ ] Test strategy is defined.
- [ ] Optional vs required external dependencies are classified.
- [ ] Idempotency rules are agreed.
- [ ] No app code has been changed for Phase 4B.
- [ ] No JS compatibility files have been created yet.
- [ ] `portal/events.html` is unchanged.
- [ ] `events-dashboard.js` is untouched.

## Key Recommendations

Recommended future implementation order:

1. Implement `compat/external-globals.js` first because it makes required/optional dependencies explicit.
2. Implement `compat/window-exports.js` second to centralize the public bridge contract.
3. Implement `compat/inline-handlers.js` third, initially as a pure adapter for current `window.evt*` names.
4. Add static smoke tests before changing any feature internals.
5. Move feature internals to imports only after the compatibility wrappers are tested.

Do not implement these wrappers yet. Phase 4B is complete when this design is reviewed, accepted, and committed.
