# Events Refactor Phase 4 Preparation Plan

Date: 2026-05-19

This document plans Phase 4 before any app-code changes. It defines the internal architecture, state ownership, data-service boundaries, compatibility approach, and test readiness needed before physical file splitting or `portal/events.html` script cleanup.

Phase 4 should not begin by changing `portal/events.html`. The current bridge stack is stable because classic script compatibility has been preserved. Phase 4 should use that bridge stack to make internal dependencies explicit while leaving the public runtime behavior unchanged.

## Current Status After Phase 1-3E

Completed so far:

- Phase 1 created the `window.PortalEvents.initEventsPage` bridge and duplicate-init guard.
- Phase 2 exposed constants and raffle model surfaces under `window.PortalEvents` while preserving `window.EventsRaffleModel`.
- Phase 3A exposed list helpers under `window.PortalEvents.list`.
- Phase 3B exposed detail helpers and a lightweight detail registry under `window.PortalEvents.detail`.
- Phase 3C exposed manage sheet helpers under `window.PortalEvents.manage` while preserving `window.EventsManage`.
- Phase 3D exposed create sheet helpers under `window.PortalEvents.create` while preserving `window.EventsCreate`.
- Phase 3E exposed competition helpers under `window.PortalEvents.competition` while preserving competition `window.evt*` globals.

Important current constraints:

- `portal/events.html` still uses classic scripts.
- No `type="module"` switch has happened.
- No physical file splitting has happened as part of the Phase 1-3E bridge stack.
- No database schema changes have been made for the refactor.
- No Supabase policy changes have been made for the refactor.
- No user-facing behavior changes were intended.

## Current Bridge Surfaces Available

The following namespaced surfaces are available now and should be treated as the compatibility edge for future work:

- `window.PortalEvents.initEventsPage`
- `window.PortalEvents.constants`
- `window.PortalEvents.raffleModel`
- `window.PortalEvents.list`
- `window.PortalEvents.detail`
- `window.PortalEvents.manage`
- `window.PortalEvents.create`
- `window.PortalEvents.competition`

These surfaces are not yet true ES module exports. They are stable bridge surfaces that let Phase 4 design internal boundaries before Phase 5 changes the page entry strategy.

## Current Legacy Globals Intentionally Preserved

The following globals must remain available during Phase 4:

- `window.EventsRaffleModel`
- `window.EventsManage`
- `window.EventsCreate`
- Existing `window.evt*` functions

The `window.evt*` surface currently includes functions used by list rendering, detail rendering, RSVP/waitlist flows, raffle actions, scanner actions, comments, documents, map, scrapbook, create/manage sheets, and competition actions. Phase 4 should not remove these names until inline handlers and classic-script consumers have been replaced or wrapped safely.

## Proposed Phase 4 Goals

Phase 4 should prepare the codebase for modular internals without changing the external script-loading contract.

Goals:

- Map internal dependencies across list, detail, create, manage, raffle, competition, comments, documents, map, scanner, and scrapbook code.
- Decide ownership for shared event state, current user state, permission state, RSVP state, and selected event/detail state.
- Define a shared data-service layer for Supabase reads/writes, Edge Function calls, and storage operations.
- Define compatibility layer boundaries so `window.PortalEvents.*`, `window.Events*`, and `window.evt*` stay available while internals move toward imports.
- Prepare for Phase 5 module entry by identifying what `index.js` will eventually import and initialize.
- Avoid changing `portal/events.html` too early.
- Avoid physical file splitting until state and data dependencies are documented enough to prevent behavior drift.

Non-goals for Phase 4 preparation:

- Do not switch `portal/events.html` to `type="module"`.
- Do not delete legacy globals.
- Do not physically split oversized files yet.
- Do not rewrite Supabase queries unless a later implementation phase explicitly scopes that work.
- Do not merge unrelated `events-dashboard.js` cleanup into the portal module plan.

## Proposed Future Folder Structure

This is a plan only. It should not be implemented until Phase 4 subphases approve boundaries and tests.

```txt
js/portal/events/
  index.js
  init.js
  compat/
    window-exports.js
    inline-handlers.js
    external-globals.js
  state/
    event-state.js
    user-state.js
    filters-state.js
  services/
    events-api.js
    rsvps-api.js
    waitlist-api.js
    documents-api.js
    storage-api.js
    competition-api.js
    admin-actions-api.js
  shared/
    dom.js
    formatters.js
    permissions.js
    dates.js
    errors.js
  list/
    index.js
    render.js
    filters.js
    search.js
    calendar.js
    cards.js
    hero.js
  detail/
    index.js
    render.js
    registry.js
    cta.js
    hero.js
    raffle-section.js
  create/
    index.js
    sheet.js
    state.js
    validation.js
    submit.js
  manage/
    index.js
    sheet.js
    tabs.js
    overview.js
    images.js
    rsvps.js
    money.js
    documents.js
    raffle.js
    competition.js
    danger.js
  competition/
    index.js
    render.js
    actions.js
    tiers.js
  raffle/
    model.js
    actions.js
    draw.js
  comments/
    index.js
  documents/
    index.js
  map/
    index.js
  scanner/
    index.js
  scrapbook/
    index.js
```

The final structure may be smaller. Phase 4 should choose folders based on real dependency boundaries, not just file size.

## State Ownership Plan

### Current Global State

Current portal event state is spread across classic globals and module-local variables. Known categories include:

- Loaded events collection, commonly accessed as `evtAllEvents` or `window.evtAllEvents`.
- RSVP map, commonly accessed as `evtAllRsvps` or `window.evtAllRsvps`.
- Current user profile and permission state, including `evtCurrentUser` and related display fields.
- Current list filters, search state, calendar/list mode, and session storage state.
- Current detail event state and browser URL/detail route state.
- Create sheet draft/step/upload/validation state.
- Manage sheet active event, active tab, edit state, RSVP/document/money/raffle state.
- Competition phase, entries, votes, winners, prize contribution, and tier calculator state.
- Raffle config, categories, item entries, draw state, and CTA intent state.

### Proposed `eventState` Shape

Phase 4 should define a single state owner before moving internals to imports. A proposed shape:

```js
eventState = {
  initialized: false,
  currentUser: null,
  currentProfile: null,
  permissions: {
    canCreate: false,
    canManageAll: false,
  },
  events: [],
  rsvpsByEventId: {},
  filters: {
    tab: 'upcoming',
    type: 'all',
    category: 'all',
    lifecycle: 'active',
    date: null,
    search: '',
    view: 'list',
  },
  detail: {
    eventId: null,
    event: null,
    cleanupTasks: [],
  },
  create: {
    isOpen: false,
    draft: null,
    step: 1,
  },
  manage: {
    isOpen: false,
    eventId: null,
    activeTab: 'overview',
  },
  competition: {
    byEventId: {},
  },
};
```

This shape should be refined from actual code reads before implementation.

### What Should Remain Compatibility-only On `window`

During Phase 4, these should remain on `window` only as compatibility exports:

- `window.PortalEvents.*` public bridge namespaces.
- `window.EventsRaffleModel`.
- `window.EventsManage`.
- `window.EventsCreate`.
- Existing `window.evt*` functions used by inline handlers or cross-script calls.
- Temporary diagnostic or sheet helper globals that are currently called by inline `onclick` attributes.

New internal code should prefer explicit state/service dependencies, but Phase 4 should keep compatibility exports until Phase 5 readiness is proven.

### How To Avoid Duplicate Initialization

Phase 1 already added a duplicate-init guard. Phase 4 should preserve and strengthen that model:

- Keep one canonical initializer: `initEventsPage()`.
- Store initialization state in one place, either the existing guard or `eventState.initialized`.
- Ensure future module entry calls the same initializer rather than duplicating DOMContentLoaded behavior.
- Keep event listener registration idempotent.
- Ensure list/detail navigation cleanup removes timers, subscriptions, map watchers, and bottom CTA listeners.
- Add tests that call `window.PortalEvents.initEventsPage()` more than once and verify no duplicate network calls, cards, listeners, or sheet roots.

## Data-service Plan

Phase 4 should separate data access from rendering and sheet logic. These service boundaries are proposed for planning.

### Event List Data

Responsibilities:

- Fetch upcoming/past/all events.
- Fetch current user's RSVP map.
- Fetch host/creator display data if needed.
- Normalize date/time/location fields for list rendering.

Potential service:

- `services/events-api.js`
- `services/rsvps-api.js`

### Detail Data

Responsibilities:

- Resolve event by ID from state or Supabase.
- Fetch RSVP, attendee counts, comments, documents, map/location, scrapbook, raffle, and competition sections as needed.
- Keep detail refresh in sync with list state after RSVP/manage/create changes.

Potential service:

- `services/events-api.js`
- `services/rsvps-api.js`
- Feature-specific APIs for comments/documents/scrapbook/competition.

### Manage Data

Responsibilities:

- Read event details for editing.
- Update title, description, images, status, featured flag, cost/money fields, raffle config, documents, RSVPs, and danger-zone actions.
- Dispatch or preserve `events:manage:updated`, `events:manage:deleted`, and raffle refresh events.

Potential service:

- `services/admin-actions-api.js`
- `services/events-api.js`
- `services/documents-api.js`
- `services/storage-api.js`

### Create Submit / Data

Responsibilities:

- Own create-sheet draft normalization.
- Validate required fields before submit.
- Upload banner/embed images.
- Insert draft or published event.
- Persist raffle and competition setup fields.
- Refresh list/detail state after creation.

Potential service:

- `services/events-api.js`
- `services/storage-api.js`

### Competition Data / Actions

Responsibilities:

- Load competition phases, entries, votes, winners, and prize pool contributions.
- Join competition.
- Submit text, link, or file entries.
- Cast votes.
- Moderate entries.
- Start, advance, extend, and finalize phases.
- Recalculate tiers.

Potential service:

- `services/competition-api.js`
- `services/storage-api.js`

### RSVP / Waitlist / Admin Actions

Responsibilities:

- RSVP going/maybe/cancel flows.
- Paid RSVP checkout redirect.
- Waitlist join/leave/claim flows.
- Admin event status actions such as cancel, reschedule, duplicate, complete, reset, or delete.
- Keep list/detail state synchronized after action completion.

Potential service:

- `services/rsvps-api.js`
- `services/waitlist-api.js`
- `services/admin-actions-api.js`

### Documents / Storage

Responsibilities:

- Upload event documents.
- Delete documents.
- Generate signed URLs or downloads.
- Manage distributed visibility.
- Upload create/manage banner, embed, scrapbook, profile, or competition entry files where applicable.

Potential service:

- `services/documents-api.js`
- `services/storage-api.js`

### Raffle Model / Data

Responsibilities:

- Normalize legacy and category/item raffle config.
- Compute categories, item counts, total winners, draw mode labels, and default display values.
- Submit raffle entries and draw winners.
- Preserve `window.EventsRaffleModel` during migration.

Potential service/module:

- `raffle/model.js`
- `raffle/actions.js`

## Compatibility Plan

### Globals That Must Remain During Phase 4

These must remain through Phase 4 implementation:

- `window.PortalEvents.initEventsPage`
- `window.PortalEvents.constants`
- `window.PortalEvents.raffleModel`
- `window.PortalEvents.list`
- `window.PortalEvents.detail`
- `window.PortalEvents.manage`
- `window.PortalEvents.create`
- `window.PortalEvents.competition`
- `window.EventsRaffleModel`
- `window.EventsManage`
- `window.EventsCreate`
- Existing `window.evt*` functions

### What Can Become Internal Imports Later

After a compatibility wrapper is in place, these can become internal imports in later implementation phases:

- Constants currently exposed through `window.PortalEvents.constants`.
- Raffle normalization helpers currently exposed through `window.EventsRaffleModel` and `window.PortalEvents.raffleModel`.
- List render helpers currently exposed through `window.PortalEvents.list`.
- Detail render helpers currently exposed through `window.PortalEvents.detail`.
- Manage/create sheet methods currently exposed through `window.EventsManage`, `window.EventsCreate`, and `window.PortalEvents.*`.
- Competition render/action helpers currently exposed through `window.evt*` and `window.PortalEvents.competition`.
- Supabase query blocks currently embedded inside feature files.

### Inline Handlers Blocking Full Module Conversion

Full module conversion is blocked while HTML strings or DOM templates still call globals directly through inline handlers. Known categories:

- RSVP buttons calling `evtHandleRsvp` or related RSVP helpers.
- Raffle buttons calling raffle entry/draw helpers.
- Competition buttons calling join, submit, vote, moderation, phase, contribution, finalize, and tier helpers.
- Manage sheet controls calling sheet-scoped helpers or `window.EventsManage` methods.
- Create sheet controls calling step/update/upload/tier helper functions.
- Detail buttons calling map, lightbox, CTA panel, scanner, share, and manage helpers.
- Document, scrapbook, and scanner controls that reference `window.evt*` handlers.

Phase 4 should inventory inline handlers before implementation. Options include replacing inline handlers with delegated event listeners or keeping a small `compat/inline-handlers.js` wrapper until Phase 5.

## Risk Map

### Highest-risk Files

- `js/portal/events/init.js`: bootstrap, auth, current user, permissions, and global exports.
- `js/portal/events/list.js`: shared event list state, filters, search, calendar, hero, and card rendering.
- `js/portal/events/detail.js`: route/detail rendering, registry, multiple feature integrations, cleanup responsibilities.
- `js/portal/events/manage/sheet.js`: large stateful sheet with many tabs and admin actions.
- `js/portal/events/create/sheet.js`: large stateful create flow with uploads, validation, raffle, and competition setup.
- `js/portal/events/competition.js`: multiple tables/actions, inline handlers, storage uploads, phase transitions, and prize logic.
- `js/portal/events/raffle-model.js`: shared config normalization relied on by detail/create/manage.

### Highest-risk Flows

- Authenticated page load and redirect behavior.
- Duplicate initialization and duplicate event listeners.
- Event list render and filter/search/calendar state restoration.
- Direct event-detail URL routing and browser back/forward behavior.
- RSVP, paid RSVP, waitlist, and raffle-intent flows.
- Create sheet draft/publish/upload flows.
- Manage sheet overview/image/RSVP/money/docs/raffle/competition/danger actions.
- Competition join/submit/vote/moderation/phase/finalize flows.
- Documents and storage operations.
- Map, scanner, live location, and cleanup of timers/subscriptions/watchers.

### Cache / Deployment Concerns

- Cloudflare can serve stale bare JS assets with `max-age=14400`.
- Cache-busted URLs can update before the actual bare script URL used by `portal/events.html`.
- Future deploy verification must check the actual bare script URLs, cache headers, and live runtime globals.
- Phase 5 must account for service worker/browser cache risk when changing script loading strategy.

### Auth / Session Concerns

- Current user and permission setup are central to create/manage visibility.
- Live E2E has observed a member-account `evtCurrentUser=null` condition, treated as pre-existing, but Phase 4 should avoid hiding auth/session failures behind refactor changes.
- Tests should cover admin, member, logged-out, and expired-session behavior where practical.

### No-events-in-DB Testing Limitation

Several live checks passed with no event cards or no suitable competition event available. This limits coverage for:

- Detail interaction depth.
- Manage edit/save flows.
- Create-to-detail/list refresh behavior.
- Competition entry/vote/phase interactions.
- RSVP and waitlist behavior.

Phase 4 should not proceed to Phase 5 readiness without seeded test data that exercises these flows.

## Phase 4 Recommended Subphases

### Phase 4A: State / Data Boundary Planning

Deliverables:

- Inventory all global state reads/writes.
- Define final `eventState` shape.
- Identify state mutations that should move behind setters/actions.
- Document current Supabase and Edge Function calls by feature.

Exit criteria:

- A dependency/state map exists for list, detail, create, manage, competition, RSVP/waitlist, documents, and raffle.

### Phase 4B: Compatibility Wrapper Design

Deliverables:

- Define `compat/window-exports.js` responsibilities.
- Define `compat/inline-handlers.js` responsibilities.
- Decide which legacy names stay exported and which are internal-only later.
- Define how `window.PortalEvents.*` bridges are populated from future modules.

Exit criteria:

- A clear public compatibility surface exists before internals move.

### Phase 4C: Module Import Map / Design

Deliverables:

- Draft an import map for future `index.js`.
- Define feature module boundaries and service dependencies.
- Identify circular dependency risks.
- Decide which modules can be extracted first with lowest risk.

Exit criteria:

- Phase 5 single-entry design has a dependency order that can be tested locally before HTML changes.

### Phase 4D: Test Plan Expansion

Deliverables:

- Add or plan seeded fixture data.
- Expand E2E coverage for detail, manage, create, competition, RSVP/waitlist, and duplicate init.
- Separate smoke tests from live verification tests.
- Define cache-aware deployment verification for each changed asset.

Exit criteria:

- Phase 5 has enough coverage to detect behavior drift before and after script cleanup.

### Phase 4E: Pre-Phase-5 Readiness Checklist

Deliverables:

- Confirm all bridge surfaces still exist.
- Confirm legacy globals still exist where inline handlers require them.
- Confirm new services/state boundaries are used internally where implemented.
- Confirm no known direct global dependency remains unaccounted for.
- Confirm rollback plan for restoring classic script list.

Exit criteria:

- `portal/events.html` can be changed in Phase 5 with known dependency order, tests, and rollback.

## Required Test Improvements Before Phase 5

Before Phase 5 changes script loading, add or prepare test fixtures for:

- Seeded test event.
- Seeded competition event.
- Seeded manage/edit test event.
- Detail page E2E coverage.
- Manage sheet E2E coverage.
- Create sheet E2E coverage.
- Competition E2E smoke.
- RSVP and waitlist E2E coverage where feasible.
- Duplicate-init E2E coverage after any module-entry rehearsal.
- Cache-aware live asset verification for every changed bare script URL.

Minimum recommended fixture set:

- One upcoming free event with attendee/RSVP coverage.
- One event owned or manageable by admin for manage-sheet tests.
- One competition-enabled event with at least one phase and entry state.
- One raffle-enabled event with category/item config.
- One document-enabled event with safe test document metadata.

## `events-dashboard.js` Recommendation

`events-dashboard.js` should be handled separately from portal Phase 4.

Recommendation:

- If admin dashboard cleanup is urgent, do it before Phase 4 as a separate admin-dashboard phase with separate tests and commit history.
- If portal modularization is the priority, defer `events-dashboard.js` until after Phase 4 preparation.
- Do not mix `events-dashboard.js` changes with Phase 4 portal architecture work.

Reason:

- The completed Phase 1-3E bridge stack is scoped to portal events scripts.
- Admin dashboard cleanup has different entrypoints, flows, and risk.
- Mixing them would make regressions harder to isolate.

## Final Recommendation For The Next Actual Coding Step

Next actual coding step: Phase 4A, state/data boundary inventory, as documentation or a very small non-behavioral code-adjacent inventory only.

Recommended first implementation-adjacent action:

- Create a dependency/state inventory for `init.js`, `list.js`, `detail.js`, `manage/sheet.js`, `create/sheet.js`, `competition.js`, and `raffle-model.js`.
- Do not change runtime code during that inventory.
- Use the inventory to decide the first safe internal service or state wrapper.

Why this should come next:

- Phase 1-3E established the compatibility bridges.
- The next risk is hidden shared global state, not missing public namespaces.
- A state/data inventory reduces the chance that future imports or physical splits break list/detail/manage/create/competition synchronization.

Do not start Phase 5 until Phase 4E readiness is complete.
