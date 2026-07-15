# Events Refactor Phase 1-3E Wrap-up

Date: 2026-05-17

This document records the completed portal events refactor work through Phase 3E. These phases were intentionally bridge-only or compatibility-first changes. The live page still runs the classic script list from `portal/events.html`; no module entry switch has happened yet.

## Completed Phase Summary

### Phase 1: Init Bridge

Commit:

- `31ed9b4` - `Refactor events bootstrap with Phase 1 init bridge`

Files changed:

- `js/portal/events/index.js`
- `js/portal/events/init.js`
- `test/_e2e-phase1-bridge.js`
- `test/_smoke-phase1-bridge.js`

Bridge / namespace added:

- Seeded `window.PortalEvents` through `index.js`.
- Added `window.PortalEvents.initEventsPage = initEventsPage`.
- Added a duplicate-init guard in `init.js` so future orchestration can call the initializer without double-loading events.

Behavior intentionally preserved:

- `portal/events.html` continued to load classic scripts.
- Existing `DOMContentLoaded` bootstrap behavior stayed in place.
- Existing `window.evt*` globals exported by `init.js` remained available.
- Create permission behavior, list rendering, RSVP handlers, modal helpers, scanner helpers, raffle draw helpers, and share/status helpers were not intentionally changed.

Validation results:

- Static smoke: `test/_smoke-phase1-bridge.js` passed.
- Latest regression run during Phase 3E: Phase 1 smoke passed `28/28`.

Live verification results:

- Baseline live E2E was rerun after Phase 3E deployment: `20/20` pass.
- Confirmed `window.PortalEvents` and `window.PortalEvents.initEventsPage` exist live.
- Confirmed duplicate-init guard behavior still works live.
- Known live note: the member account path reported `evtCurrentUser=null`, treated as a pre-existing account/profile issue and not a Phase 1 regression.

Known limitations:

- `index.js` is a bridge seed, not yet the real module entrypoint.
- `portal/events.html` still loads the full classic script list.
- Internal state and cross-file dependencies still use legacy globals.

### Phase 2: Constants And Raffle Model Bridges

Commit:

- `5ef1180` - `Add Phase 2 events compatibility bridges`

Files changed:

- `js/portal/events/constants.js`
- `js/portal/events/raffle-model.js`
- `test/_smoke-phase2-low-risk-modules.js`

Bridge / namespace added:

- Added `window.PortalEvents.constants` as a namespaced constants surface.
- Added `window.PortalEvents.raffleModel` as a namespaced alias of the existing raffle model API.

Behavior intentionally preserved:

- `window.EventsRaffleModel` remained the primary classic-script raffle model global.
- Raffle normalization, categories, item handling, winner-count helpers, draw-mode labels, and default emoji behavior stayed compatible with existing detail/create/manage callers.
- No raffle database, storage, or policy behavior was changed.

Validation results:

- Static smoke: `test/_smoke-phase2-low-risk-modules.js` passed.
- Latest regression run during Phase 3E: Phase 2 smoke passed `28/28`.

Live verification results:

- Later live verifications confirmed `window.PortalEvents.constants`, `window.PortalEvents.raffleModel`, and `window.EventsRaffleModel` remained present.
- Phase 3C live verifier included Phase 2 live regression checks.
- Phase 3E baseline E2E still passed after this bridge stack was deployed.

Known limitations:

- Constants and raffle model are still loaded as classic scripts.
- The namespaced surfaces are aliases for compatibility, not module imports yet.

### Phase 3A: List Bridge

Commit:

- `67eb836` - `Expose Phase 3A events list bridge helpers`

Files changed:

- `js/portal/events/list.js`
- `test/_smoke-phase3a-list-bridge.js`

Bridge / namespace added:

- Added or expanded `window.PortalEvents.list`.
- Exposed list rendering and helper surfaces including load/render/search/filter/hero/card helpers and Phase 3A list helpers such as calendar, going rail, top picks, mini calendar, RSVP list, stats card, bucket rendering, and filter predicate helpers.

Behavior intentionally preserved:

- Existing list UI behavior remained classic-script driven.
- Existing list globals such as `window.evtLoadEvents`, `window.evtRenderEvents`, `window.evtSetupSearch`, `window.evtInitFilterChips`, `window.evtRenderFeatured`, `window.evtUpdateHeroStats`, and `window.evtRenderCard` were preserved.
- Filtering, search, hero/top-picks/list rendering, calendar/list affordances, and create tile permission behavior were not intentionally changed.

Validation results:

- Static smoke: `test/_smoke-phase3a-list-bridge.js` passed.
- Latest regression run during Phase 3E: Phase 3A smoke passed `72/72`.

Live verification results:

- A local live verifier exists at `test/_verify-phase3a-live.js` and verifies the live list namespace, Phase 3A keys, legacy list globals, and Phase 1/2 surfaces.
- Later Phase 3C and Phase 3E live checks confirmed `window.PortalEvents.list` remained present as part of regression coverage.
- Phase 3E baseline E2E confirmed the live events list still renders and duplicate init remains controlled.

Known limitations:

- `list.js` was not physically split.
- List internals still read and write shared global event state.

### Phase 3B: Detail Bridge

Commit:

- `ecd23dc` - `Expose Phase 3B events detail bridge helpers`

Files changed:

- `js/portal/events/detail.js`
- `test/_smoke-phase3b-detail-bridge.js`

Bridge / namespace added:

- Added or expanded `window.PortalEvents.detail`.
- Added a lightweight detail registry at `window.PortalEvents.detail._registry` with `detail.register(...)`.
- Registered sub-surfaces for RSVP, raffle, competition, comments, documents, scrapbook, map, and scanner integrations.
- Mirrored detail helpers such as open, lightbox, fullscreen map, CTA panel, bottom nav, section animations, markdown, hero collapse, and raffle helper functions.

Behavior intentionally preserved:

- Existing detail globals such as `window.evtOpenDetail`, `window.evtOpenLightbox`, `window.evtOpenFullscreenMap`, `window.evtRecenterFullscreenMap`, `window.evtCloseFullscreenMap`, `window.evtMiniMarkdown`, `window.evtInitSectionAnimations`, `window.evtStartLiveCountdown`, `window.evtInitHeroCollapse`, `window.evtCleanupHeroCollapse`, `window.evtInitBottomNav`, `window.evtCleanupBottomNav`, `window.evtOpenCtaPanel`, and `window.evtCloseCtaPanel` were preserved.
- Inline handlers and downstream calls to legacy globals were preserved.
- Detail rendering, RSVP, raffle, comments, documents, scrapbook, map, scanner, and competition rendering behavior were not intentionally changed.

Validation results:

- Static smoke: `test/_smoke-phase3b-detail-bridge.js` passed.
- Latest regression run during Phase 3E: Phase 3B smoke passed `90/90`.

Live verification results:

- A local live verifier exists at `test/_verify-phase3b-live.js` and verifies the live detail namespace, registry keys, legacy detail globals, and Phase 3B source markers.
- Later Phase 3C live verification confirmed `window.PortalEvents.detail` and `detail.register` remained live.
- Phase 3E live verification confirmed the page still loads without console errors after the bridge stack.

Known limitations:

- `detail.js` was not physically split.
- The registry is a bridge abstraction only; feature internals still depend on legacy global timing and shared state.

### Phase 3C: Manage Sheet Bridge

Commits:

- `fb74715` - `Expose Phase 3C events manage bridge helpers`
- `f5738ec` - `test: add Phase 3C live globals verifier`

Files changed:

- `js/portal/events/manage/sheet.js`
- `test/_smoke-phase3c-manage-bridge.js`
- `test/_verify-phase3c-live.js`

Bridge / namespace added:

- Added `window.PortalEvents.manage`.
- Exposed `window.PortalEvents.manage.open`.
- Exposed `window.PortalEvents.manage.close`.
- Exposed `window.PortalEvents.manage.refreshRaffle`.
- Registered the manage bridge into `window.PortalEvents.detail._registry.manage`.

Behavior intentionally preserved:

- Existing `window.EventsManage` remained available.
- Existing `EventsManage.open`, `EventsManage.close`, and `EventsManage.refreshRaffle` behavior was preserved.
- Manage sheet opening from portal detail/admin contexts, close behavior, overview/images/RSVPs/money/docs/raffle/competition/danger areas, and `events:manage:*` refresh behavior were not intentionally changed.

Validation results:

- Static smoke: `test/_smoke-phase3c-manage-bridge.js` passed.
- Latest regression run during Phase 3E: Phase 3C smoke passed `60/60`.

Live verification results:

- Phase 3C live globals verification completed successfully.
- The live verifier confirmed `window.PortalEvents.manage`, `open`, `close`, `refreshRaffle`, preserved `window.EventsManage`, detail registry integration, and prior Phase 1-3A surfaces.
- A verifier bug was corrected during the phase: `waitForURL` callbacks receive a URL object, so URL checks must use `.toString()`.

Known limitations:

- `manage/sheet.js` was not physically split.
- Manage internals still use sheet-local state, inline handlers, and legacy globals.

### Phase 3D: Create Sheet Bridge

Commits:

- `03f6f6e` - `Expose Phase 3D events create bridge helpers`
- `1a31a2f` - `Fix Phase 3D create bridge runtime seed`

Files changed:

- `js/portal/events/create/sheet.js`
- `test/_e2e-phase3d-create-bridge.js`
- `test/_smoke-phase3d-create-bridge.js`

Bridge / namespace added:

- Added `window.PortalEvents.create`.
- Exposed `window.PortalEvents.create.open`.
- Exposed `window.PortalEvents.create.close`.
- Exposed `window.PortalEvents.create.isFlagOn`.
- Final bridge seeds `window.PortalEvents = window.PortalEvents || {};` before assigning `create`.

Behavior intentionally preserved:

- Existing `window.EventsCreate` remained available.
- Existing `EventsCreate.open`, `EventsCreate.close`, and `EventsCreate.isFlagOn` behavior was preserved.
- Create button behavior, create sheet rendering, close behavior, steps, upload flows, draft/publish path, raffle setup, competition setup, and permission-gated visibility were not intentionally changed.

Validation results:

- Static smoke: `test/_smoke-phase3d-create-bridge.js` passed.
- Latest regression run during Phase 3E: Phase 3D smoke passed `64/64`.
- Phase 3D dedicated E2E passed after the runtime seed fix.

Live verification results:

- Phase 3D was live verified after the actual bare `create/sheet.js` URL refreshed.
- Strict Phase 3D live E2E passed `24/24`.
- Baseline live E2E passed `20/20`.
- Live globals verified `window.PortalEvents.create` plus preserved `window.EventsCreate`.

Known limitations:

- `create/sheet.js` was not physically split.
- The first Phase 3D bridge only assigned under `if (window.PortalEvents)`; live runtime showed that was too weak. The fix was to seed `window.PortalEvents` before assignment.
- Cloudflare cache delayed the bare `create/sheet.js` update, so verification waited for the actual bare script URL.

### Phase 3E: Competition Bridge

Commit:

- `a913794` - `Expose Phase 3E events competition bridge helpers`

Files changed:

- `js/portal/events/competition.js`
- `test/_smoke-phase3e-competition-bridge.js`

Bridge / namespace added:

- Added `window.PortalEvents.competition`.
- Exposed `window.PortalEvents.competition.buildHtml`.
- Exposed `window.PortalEvents.competition.buildSubmitFormHtml`.
- Exposed `window.PortalEvents.competition.join`.
- Exposed `window.PortalEvents.competition.submitEntry`.
- Exposed `window.PortalEvents.competition.castVote`.
- Exposed `window.PortalEvents.competition.moderateEntry`.
- Exposed `window.PortalEvents.competition.contributeToPrizePool`.
- Exposed `window.PortalEvents.competition.startPhase`.
- Exposed `window.PortalEvents.competition.advancePhase`.
- Exposed `window.PortalEvents.competition.extendPhase`.
- Exposed `window.PortalEvents.competition.finalize`.
- Exposed `window.PortalEvents.competition.recalcTiers`.

Behavior intentionally preserved:

- Existing competition `window.evt*` globals remained available.
- Inline competition handlers stayed compatible.
- Competition detail rendering, join, entry submission, voting, moderation, prize-pool contribution, phase actions, finalization, and tier recalculation were not intentionally changed.
- Existing table/storage dependencies were not changed: `competition_phases`, `competition_entries`, `competition_votes`, `competition_winners`, `prize_pool_contributions`, `events`, and storage bucket `competition-entries`.

Validation results:

- Static smoke: `test/_smoke-phase3e-competition-bridge.js` passed `72/72`.
- Latest full regression chain before commit/push also passed:
  - Phase 3D: `64/64`
  - Phase 3C: `60/60`
  - Phase 3B: `90/90`
  - Phase 3A: `72/72`
  - Phase 2: `28/28`
  - Phase 1: `28/28`

Live verification results:

- `origin/master` was confirmed at `a91379441da6e08ae8500b20ca7b1d4f05f32df5`.
- Cache-busted `competition.js` updated before the actual bare script URL.
- Final actual bare URL check succeeded for `https://justicemcneal.com/js/portal/events/competition.js`.
- Final bare asset cache headers included `cf-cache-status: EXPIRED`, `ETag: W/"6a0a5e69-9768"`, and `Last-Modified: Mon, 18 May 2026 00:33:45 GMT`.
- Baseline live E2E passed `20/20`.
- Focused local-only Phase 3E Playwright global verifier passed `30/30`.
- Live page confirmed it loaded the actual bare `competition.js` resource, not only a cache-busted URL.

Known limitations:

- `competition.js` was not physically split.
- No deeper competition interaction flow was exercised if no suitable live competition event existed.
- Competition internals still depend on classic global timing and shared event state.

## Current Bridge Surfaces

The following bridge surfaces are now available for future module-entry work:

- `window.PortalEvents.initEventsPage`
- `window.PortalEvents.constants`
- `window.PortalEvents.raffleModel`
- `window.PortalEvents.list`
- `window.PortalEvents.detail`
- `window.PortalEvents.manage`
- `window.PortalEvents.create`
- `window.PortalEvents.competition`

Important detail surfaces currently include:

- `window.PortalEvents.detail.register(...)`
- `window.PortalEvents.detail._registry`
- Registry keys for `rsvp`, `raffle`, `competition`, `comments`, `documents`, `scrapbook`, `map`, `scanner`, and `manage`.

## Legacy Globals Intentionally Preserved

These compatibility globals remain intentionally preserved while `portal/events.html` still uses classic scripts:

- `window.EventsRaffleModel`
- `window.EventsManage`
- `window.EventsCreate`
- Existing `window.evt*` globals from events init, list, detail, RSVP, raffle, scanner, comments, documents, map, scrapbook, and competition code.

Competition legacy globals confirmed live after Phase 3E:

- `window.evtBuildCompetitionHtml`
- `window.evtBuildSubmitFormHtml`
- `window.evtJoinCompetition`
- `window.evtSubmitEntry`
- `window.evtCastVote`
- `window.evtModerateEntry`
- `window.evtContributeToPrizePool`
- `window.evtStartPhase`
- `window.evtAdvancePhase`
- `window.evtExtendPhase`
- `window.evtFinalizeCompetition`
- `window.evtRecalcCompTiers`

## What Has Not Changed

- `portal/events.html` still uses classic scripts.
- There has been no `type="module"` switch yet.
- No physical file splitting has happened yet in this phase stack.
- No database schema changes were made.
- No Supabase policy changes were made.
- No user-facing behavior changes were intended.
- `events-dashboard.js` has not been started as part of this wrap-up.
- Phase 4 and Phase 5 have not started.

## Deployment And Cache Lesson

Cloudflare can serve stale bare JavaScript assets because these files are cached with `max-age=14400`.

Observed deployment behavior:

- A cache-busted source URL may show the new deployed code before the actual bare script URL updates.
- The real browser path from `portal/events.html` uses the bare script URL, for example `https://justicemcneal.com/js/portal/events/competition.js`.
- Final live success must not be claimed until the actual bare script URL contains the expected bridge.

Future deploy verification should always check:

- Current remote HEAD.
- The actual bare script URL loaded by `portal/events.html`.
- Cache headers such as `cf-cache-status`, `Age`, `ETag`, `Last-Modified`, and `Cache-Control`.
- Runtime globals from the live page after the bare asset refreshes.

## Recommended Next Steps

### Option A: Separate Admin Dashboard Cleanup For `events-dashboard.js`

Use this if the next priority is reducing admin dashboard risk before touching the portal module system.

Why it helps:

- `events-dashboard.js` is outside the completed portal bridge stack.
- It can be audited and cleaned up separately without mixing portal Phase 4/5 concerns.
- This avoids letting admin dashboard changes blur the portal events migration history.

Recommended handling:

- Make it a separate phase with its own audit, smoke checks, and commit.
- Do not combine it with portal `events.html` script cleanup.

### Option B: Phase 4 Preparation For Imports, State, And Data Services

Use this if the next priority is continuing the portal events refactor while keeping `portal/events.html` unchanged.

Why it helps:

- Phase 1-3E created stable bridge surfaces first.
- Phase 4 can now plan internal imports, state ownership, and data-service boundaries behind those surfaces.
- This is the safest next portal step before any single-entry module switch.

Recommended handling:

- Inventory shared globals such as `evtAllEvents`, `evtAllRsvps`, `evtCurrentUser`, and permission state.
- Plan a data/service layer for Supabase reads/writes and Edge Function calls.
- Replace cross-module global reads internally only after each feature has a compatibility edge.
- Keep public `window.PortalEvents.*`, `window.Events*`, and `window.evt*` compatibility intact during the transition.

### Option C: Phase 5 Planning For Single Module Entry And Script Cleanup

Use this only after Phase 4 has clear internal dependency boundaries.

Why it helps:

- Phase 5 is the eventual cleanup point for `portal/events.html`.
- It should replace the classic events script list with one module entry only after globals and imports are mapped.

Recommended handling:

- Prepare a rollback plan that restores the old script list.
- Include service-worker/cache strategy because mixed old/new JS assets are a real deployment risk.
- Run the full checklist from `007_testing_checklist.md` before and after the script switch.

## Recommendation

Recommended next step: Option B, Phase 4 preparation.

Reason:

- Phase 1-3E successfully established bridge surfaces without changing user-facing behavior.
- The portal side is now ready for internal dependency planning, but not yet ready for a `type="module"` switch.
- Phase 4 preparation keeps `portal/events.html` stable while reducing the risk of hidden global dependencies before Phase 5.

If admin dashboard work is more urgent, do Option A as a separate track first. Do not combine Option A with Phase 4 or Phase 5.
