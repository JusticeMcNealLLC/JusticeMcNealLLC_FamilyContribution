# Events Refactor Phase 4A State/Data Boundary Inventory

Date: 2026-05-21

This document is a documentation-only Phase 4A inventory. It records the current portal events state/data boundaries before any runtime code changes, physical file splitting, or `portal/events.html` script cleanup.

No app code is changed by this phase. The goal is to make hidden shared state, Supabase access, Edge Function usage, storage usage, cross-file dependencies, and inline handler dependencies visible before future modularization work begins.

## Scope And Current Constraints

In scope:

- Shared global state.
- Local feature state that affects shared behavior.
- State mutations.
- Supabase reads and writes.
- Edge Function calls.
- Storage bucket usage.
- Cross-file dependencies.
- Inline handler dependencies.
- Current ownership problems.
- Recommended future state/service boundaries.

Out of scope:

- No app-code changes.
- No `portal/events.html` changes.
- No physical file splitting.
- No removal of globals.
- No Phase 5 work.
- No `events-dashboard.js` work.

## Files Included In This Inventory

Portal events scripts currently in scope:

- `js/portal/events/index.js`
- `js/portal/events/init.js`
- `js/portal/events/state.js`
- `js/portal/events/constants.js`
- `js/portal/events/utils.js`
- `js/portal/events/list.js`
- `js/portal/events/detail.js`
- `js/portal/events/rsvp.js`
- `js/portal/events/raffle.js`
- `js/portal/events/raffle-model.js`
- `js/portal/events/comments.js`
- `js/portal/events/documents.js`
- `js/portal/events/map.js`
- `js/portal/events/scanner.js`
- `js/portal/events/scrapbook.js`
- `js/portal/events/competition.js`
- `js/portal/events/create.js`
- `js/portal/events/create/sheet.js`
- `js/portal/events/manage/sheet.js`

Note: `create.js` appears to be an older/legacy create flow while `create/sheet.js` is the current sheet bridge path. Both remain relevant because classic globals and inline handlers still exist.

## Existing Bridge And Compatibility Surfaces

The Phase 1-3E bridge stack currently provides these namespaced surfaces:

- `window.PortalEvents.initEventsPage`
- `window.PortalEvents.constants`
- `window.PortalEvents.raffleModel`
- `window.PortalEvents.list`
- `window.PortalEvents.detail`
- `window.PortalEvents.manage`
- `window.PortalEvents.create`
- `window.PortalEvents.competition`

Legacy globals intentionally preserved during Phase 4:

- `window.EventsRaffleModel`
- `window.EventsManage`
- `window.EventsCreate`
- Existing `window.evt*` functions

Phase 4A should treat those surfaces as compatibility boundaries. They are not yet a clean internal module architecture.

## Shared Global State Inventory

The current shared mutable state is seeded mostly in `state.js` and then read or mutated across multiple classic scripts.

### Primary State Globals

Current shared state variables:

- `evtCurrentUser`: authenticated Supabase user returned by `checkAuth()`.
- `evtCurrentUserRole`: role/permission state used by list/detail/manage affordances.
- `evtActiveTab`: list tab state, initially `upcoming`.
- `evtBannerFile`: legacy create modal banner file.
- `evtEmbedImageFile`: legacy create modal embed image file.
- `evtAllEvents`: loaded events collection.
- `evtAllRsvps`: RSVP map keyed by `event_id`.
- `evtScannerStream`: active scanner camera stream.
- `evtScannerAnimFrame`: scanner animation frame handle.

Window mirrors and related globals:

- `window.evtAllEvents`: assigned by `list.js` and read by list/detail/RSVP/competition/map/utils.
- `window.evtAllRsvps`: assigned by `list.js` and mutated by `rsvp.js`.
- `window.evtCurrentUserName`: assigned by `init.js` from profile data.
- `window.evtCurrentUserPic`: assigned by `init.js` from profile data.
- `window.evtCurrentUserInitials`: assigned by `init.js` from profile data.
- `window.evtCtaRaffleIntent`: used by detail/RSVP raffle CTA flow.

Initialization guard:

- `_eventsPageInitialized` in `init.js` prevents duplicate page initialization.

### Local Feature State With Shared Effects

`create/sheet.js` owns a local `STATE` object:

- Current create step.
- Form values.
- Banner file and preview URL.
- Embed image file and preview URL.
- Geocode result.
- Raffle prize image files and previews.
- Raffle config.
- Competition setup fields.

`create/sheet.js` also owns `_submitting` to guard duplicate submit.

`manage/sheet.js` owns a local `STATE` object:

- `eventId`.
- `source`.
- `event`.
- `rsvps`.
- `guestRsvps`.
- `checkins`.
- `activeTab`.
- `editCopyOnOpen`.
- `tabData` cache.

`manage/sheet.js` also owns `qrCodeLoadPromise` and tab-specific transient state.

Other local state owners:

- `scanner.js` owns scanner stream/frame behavior through shared scanner globals.
- `map.js` owns map/location sharing runtime state and geolocation/watch behavior.
- `list.js` owns many DOM/list local states such as filters, search, calendar, rail gestures, sticky header, mobile affordances, and session-storage-backed UI choices.
- `detail.js` owns detail cleanup state for hero/bottom CTA/map/countdown/listeners.

## State Mutation Inventory

### Bootstrap And User State

`init.js` mutates:

- `_eventsPageInitialized` from `false` to `true`.
- `evtCurrentUser` from `checkAuth()`.
- `evtCurrentUserRole` and current profile display values after reading `profiles`.
- `window.evtCurrentUserName`, `window.evtCurrentUserPic`, and `window.evtCurrentUserInitials`.

Ownership issue:

- Auth/user/profile state is owned by `init.js`, but many feature files read it directly as a global.

Future boundary:

- Move current user/profile/permission data behind `state/user-state` and a `permissions` helper, then keep `window.evtCurrentUser*` as compatibility exports only.

### Event List And RSVP Cache

`list.js` mutates:

- `window.evtAllEvents` after fetching `events`.
- `window.evtAllEvents` again when admin draft events are merged.
- `window.evtAllRsvps` after fetching current-user RSVPs.
- DOM state for filters, search, calendar, hero, rails, groups, empty state, and mobile controls.

`rsvp.js` mutates:

- `evtAllRsvps[eventId]`.
- `window.evtAllRsvps[eventId]`.
- Deletes RSVP entries on cancel.
- Updates RSVP status optimistically and after Supabase writes.
- Clears `window.evtCtaRaffleIntent` after raffle-intent RSVP flow.

Ownership issue:

- `evtAllRsvps` exists both as lexical global and `window` mirror. This creates risk of one map changing while the other is stale.

Future boundary:

- Create a single `eventState.rsvpsByEventId` owner with setter helpers such as `setRsvp(eventId, record)`, `removeRsvp(eventId)`, and `replaceRsvpMap(map)`.
- Export `window.evtAllRsvps` from compatibility code as a mirror until inline handlers are gone.

### Detail State

`detail.js` reads:

- `evtAllEvents` / `window.evtAllEvents`.
- `evtAllRsvps` / `window.evtAllRsvps`.
- `evtCurrentUser`.
- `evtCurrentUserRole`.

`detail.js` mutates/coordinates:

- URL/detail route state.
- Detail view DOM.
- Hero collapse state.
- Bottom CTA panel state.
- Countdown/listener cleanup.
- Raffle CTA intent through `window.evtCtaRaffleIntent`.

Ownership issue:

- Detail owns route/render cleanup but not the event or RSVP data it renders.

Future boundary:

- Give detail a `detailState` slice containing `eventId`, `event`, `rsvp`, `cleanupTasks`, and `activePanel`, populated from shared state/service APIs.

### Create Sheet State

`create/sheet.js` mutates:

- Local `STATE.form` fields from input listeners.
- Local file/preview/geocode state.
- Raffle config and prize image state.
- `_submitting` guard.
- Dispatches `events:created` after insert.

Ownership issue:

- Create submit currently combines validation, upload, record construction, Supabase insert, post-create event dispatch, and sheet UI state.

Future boundary:

- Split later into `createState`, `createValidation`, `createSubmitService`, and shared `storageService`, while keeping `window.EventsCreate` and `window.PortalEvents.create` as compatibility wrappers.

### Manage Sheet State

`manage/sheet.js` mutates:

- Local `STATE.eventId`, `STATE.source`, `STATE.event`, `STATE.rsvps`, `STATE.guestRsvps`, `STATE.checkins`, `STATE.activeTab`, `STATE.editCopyOnOpen`, and `STATE.tabData`.
- `STATE.event.title`, `STATE.event.description`, `STATE.event.banner_url`, `STATE.event.embed_image_url`, and `STATE.event.status` after writes.
- `STATE.tabData` cache after docs/raffle/competition operations.
- Dispatches `events:manage:updated` and `events:manage:deleted` events.

Ownership issue:

- Manage owns a separate event copy from `evtAllEvents`, so list/detail can become stale unless event notifications are handled correctly.

Future boundary:

- Put manage event mutation behind an `eventsAdminService` and then update `eventState.events` through a single reconciliation path.

### Competition State

`competition.js` reads:

- `evtCurrentUser`.
- `evtAllEvents`.
- Current event competition config.

It loads and mutates:

- `competition_phases`.
- `competition_entries`.
- `competition_votes`.
- `competition_winners`.
- `prize_pool_contributions`.
- `events` status during finalization.
- Storage bucket `competition-entries`.

Ownership issue:

- Competition data is loaded on demand inside render/action functions and not cached centrally.

Future boundary:

- Create `competitionService` and optional `eventState.competitionByEventId[eventId]` cache for phase/entry/vote/winner/contribution snapshots.

### Scanner And Map State

`scanner.js` reads event/user state and mutates check-in rows.

`map.js` reads event/user state and mutates `event_locations` rows while owning location sharing/watch behavior.

Ownership issue:

- Device resources and live location state are side effects outside the main event data owner.

Future boundary:

- Keep camera/geolocation lifecycle in feature modules, but move data writes to `checkinService` and `locationService`.

## Supabase Data Access Inventory

### Tables Read/Written

Tables used by portal events scripts:

- `profiles`
- `events`
- `event_rsvps`
- `event_guest_rsvps`
- `event_checkins`
- `event_cost_items`
- `event_waitlist`
- `event_raffle_entries`
- `event_raffle_winners`
- `event_hosts`
- `event_comments`
- `event_documents`
- `event_locations`
- `event_photos`
- `competition_phases`
- `competition_entries`
- `competition_votes`
- `competition_winners`
- `prize_pool_contributions`

### Reads By Feature

Bootstrap:

- `init.js` reads `profiles` for user role and display profile.

List:

- `list.js` reads `events`.
- `list.js` reads admin draft `events` for admins.
- `list.js` reads `event_rsvps` for current-user RSVP map.
- `list.js` reads RSVP/guest RSVP counts from `event_rsvps` and `event_guest_rsvps`.

Detail:

- `detail.js` reads `event_rsvps`, `event_guest_rsvps`, `event_checkins`, `event_cost_items`, `event_waitlist`, `event_raffle_entries`, `event_raffle_winners`, `event_hosts`, and `profiles`.

Comments:

- `comments.js` reads `event_comments` with user profile data.

Documents:

- `documents.js` reads `event_documents`.

Map:

- `map.js` reads `event_locations` and `profiles`.

Scanner:

- `scanner.js` reads `event_locations`, `event_rsvps`, `event_guest_rsvps`, and `event_checkins`.

Scrapbook:

- `scrapbook.js` reads `event_photos`.

Raffle:

- `raffle.js` reads `event_raffle_entries`, `event_raffle_winners`, and `event_guest_rsvps`.

Competition:

- `competition.js` reads `competition_phases`, `competition_entries`, `competition_votes`, `competition_winners`, and `prize_pool_contributions`.

Manage:

- `manage/sheet.js` reads `events`, `event_rsvps`, `event_guest_rsvps`, `event_checkins`, `event_documents`, `event_raffle_entries`, `event_raffle_winners`, `prize_pool_contributions`, `competition_phases`, `competition_entries`, `competition_votes`, and `competition_winners`.

### Writes By Feature

Create:

- `create/sheet.js` inserts into `events`.
- Legacy `create.js` inserts into `events`, `event_cost_items`, and `competition_phases`.

RSVP / Waitlist / Admin Actions:

- `rsvp.js` inserts, upserts, updates, and deletes `event_rsvps`.
- `rsvp.js` reads/writes `event_waitlist`.
- `rsvp.js` updates `events` for status/admin actions.
- `rsvp.js` duplicates `events` and `event_cost_items` for duplicate-event flow.

Raffle:

- `raffle.js` inserts `event_raffle_entries`.
- `raffle.js` inserts and reads `event_raffle_winners`.

Comments:

- `comments.js` inserts `event_comments`.

Documents:

- `documents.js` inserts, updates, and deletes `event_documents`.

Map:

- `map.js` upserts/deletes `event_locations`.

Scanner:

- `scanner.js` inserts `event_checkins` for member and guest scans.

Scrapbook:

- `scrapbook.js` inserts and deletes `event_photos`.

Manage:

- `manage/sheet.js` updates/deletes `events`.
- `manage/sheet.js` updates/deletes/inserts `event_documents`.
- `manage/sheet.js` updates raffle config on `events`.
- `manage/sheet.js` reads and refreshes raffle/competition/money data.

Competition:

- `competition.js` inserts/updates/deletes `competition_entries`.
- `competition.js` inserts `competition_votes`.
- `competition.js` updates `competition_phases`.
- `competition.js` inserts `competition_winners`.
- `competition.js` updates `events` during finalization.

## Edge Function Calls

Current Edge Functions called from portal events scripts:

- `create-event-checkout`
- `process-event-cancellation`
- `manage-event-participation`

Usage by feature:

- `rsvp.js` calls `create-event-checkout` for paid RSVP, raffle, and waitlist/claim-style payment flows.
- `competition.js` calls `create-event-checkout` for competition join/payment or prize-pool contribution flows.
- `rsvp.js` calls `process-event-cancellation` for cancellation/refund flows.
- `manage/sheet.js` calls `manage-event-participation` for admin participation/payment/status operations.

Future boundary:

- Wrap Edge Functions in `services/edge-functions.js` or feature services such as `checkoutService`, `eventCancellationService`, and `participationService`.
- Keep payload construction close to the feature service, not in render code.
- Standardize error handling and redirect handling.

## Storage Bucket Usage

Buckets used by portal events scripts:

- `event-banners`
- `event-raffle-prizes`
- `event-documents`
- `event-photos`
- `competition-entries`

Usage by feature:

- `create/sheet.js`: uploads banner and embed image to `event-banners`; uploads raffle prize images to `event-raffle-prizes`.
- Legacy `create.js`: uploads banner/embed images to `event-banners`.
- `manage/sheet.js`: uploads banner/embed images to `event-banners`; uploads raffle prize images to `event-raffle-prizes`; uploads/removes documents in `event-documents`.
- `documents.js`: uploads, signs/downloads, and removes files in `event-documents`.
- `scrapbook.js`: uploads/removes event photos in `event-photos`.
- `competition.js`: uploads competition file entries to `competition-entries`.

Future boundary:

- Create a `storageService` with named helpers for each bucket.
- Keep bucket names centralized.
- Return both storage path and public/signed URL consistently.
- Require callers to distinguish public buckets from signed-download buckets.

## Cross-file Dependency Inventory

### Shared Globals Used Across Files

- `evtCurrentUser`: used by init, list, detail, RSVP, competition, create, create sheet, manage sheet, comments, documents, map, scanner, scrapbook.
- `evtCurrentUserRole`: used by list, detail, scrapbook, and permission-gated UI.
- `evtAllEvents`: used by list, detail, RSVP, raffle, competition, map, scanner, utils.
- `evtAllRsvps`: used by list, detail, RSVP.
- `window.evtAllEvents`: used as a mirror/fallback in list, detail, RSVP, and utilities.
- `window.evtAllRsvps`: used as a mirror/fallback in list, detail, and RSVP.
- `window.evtCurrentUserName`, `window.evtCurrentUserPic`, `window.evtCurrentUserInitials`: used by list/comments display.
- `window.evtCtaRaffleIntent`: used between detail CTA rendering and RSVP completion.

### Feature-to-feature Calls

- `init.js` calls `evtLoadEvents`, `evtRouteByUrl`, `evtRenderEvents`, scanner helpers, create helpers, and modal helpers.
- `detail.js` calls or emits inline handlers for RSVP, raffle, waitlist, scanner, documents, comments, map, share, admin status, create/manage, and competition features.
- `manage/sheet.js` calls `window.evtOpenScanner`, `window.evtOpenRaffleDraw`, and registers itself into `window.PortalEvents.detail`.
- `create/sheet.js` dispatches `events:created`, which `init.js` uses to reload events.
- `manage/sheet.js` dispatches `events:manage:updated` and `events:manage:deleted`, which list/detail/admin contexts use to refresh.
- `utils.js` reads and mutates `evtAllEvents` when resolving direct event URLs.
- `competition.js` calls `evtOpenDetail` and `evtLoadEvents` after actions.

### Bridge Dependencies

- `index.js` seeds `window.PortalEvents`.
- Feature bridges assume `window.PortalEvents` exists or seed it locally.
- `manage/sheet.js` currently registers with `window.PortalEvents.detail.register` only if detail is already available.
- `detail.js` registry stores feature integrations, including competition and manage.

Future boundary:

- Phase 4 should define import direction and event bus direction before extracting files.
- Recommended direction: services/state/shared utilities have no feature imports; features import services/state; compat exports import features; `index.js` coordinates initialization.

## Inline Handler Dependency Inventory

Inline handlers are the largest blocker for full module conversion because classic HTML strings call `window` functions directly.

### RSVP / Waitlist / Admin Handlers

Handlers referenced inline include:

- `evtHandleRsvp`
- `evtJoinWaitlist`
- `evtLeaveWaitlist`
- `evtClaimWaitlistSpot`
- `evtRequestGraceRefund`
- `evtMessageHost`
- `evtUpdateStatus`
- `evtCancelEvent`
- `evtRescheduleEvent`
- `evtDuplicateEvent`
- `evtDeleteEvent`

Primary locations:

- `detail.js`
- `rsvp.js`

### Raffle Handlers

Handlers referenced inline include:

- `evtHandleRaffleEntry`
- `evtHandleFreeRaffleEntry`
- `evtOpenRaffleDraw`
- `evtDrawWinner`
- `evtCloseRaffleDraw`

Primary locations:

- `detail.js`
- `raffle.js`
- `manage/sheet.js`

### Competition Handlers

Handlers referenced inline include:

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

Primary location:

- `competition.js`

### Detail / Navigation / Media Handlers

Handlers referenced inline include:

- `evtOpenDetail`
- `evtNavigateToList`
- `evtCopyShareUrl`
- `evtDownloadIcs`
- `evtOpenLightbox`
- `evtOpenFullscreenMap`
- `evtRecenterFullscreenMap`
- `evtCloseFullscreenMap`
- `evtOpenCtaPanel`
- `evtCloseCtaPanel`
- `evtPostComment`
- `evtOpenDocumentsPanel`
- `evtCloseDocumentsPanel`
- `evtDownloadDocument`
- `evtOpenScanner`

Primary locations:

- `detail.js`
- `documents.js`
- `map.js`
- `scanner.js`
- `comments.js`

### Create / Legacy Create Handlers

Handlers referenced inline include:

- `evtAddCostItem`
- `evtRemoveCostItem`
- `evtUpdateCostItem`
- `evtClosePreview`

Primary location:

- `create.js`

Note: the newer `create/sheet.js` uses direct event listeners and local `STATE` more heavily, but it still depends on global user/auth/Supabase state and exports `window.EventsCreate`/`window.PortalEvents.create`.

### Manage Sheet Handlers

Manage sheet mostly wires event listeners after render, but some inline/script string dependencies remain:

- `window.EventsManage.close()`.
- `window.evtOpenScanner`.
- `window.evtOpenRaffleDraw`.
- `window._emToggleFeatured` compatibility helper.

Future boundary:

- Create `compat/inline-handlers.js` as an explicit adapter while replacing inline strings with delegated listeners over time.
- Do not remove any `window.evt*` handler until the relevant inline handler inventory is cleared and tested.

## Current Ownership Problems

### State Ownership Is Split

Problem:

- `state.js` declares global state, `list.js` assigns `window` mirrors, `rsvp.js` mutates both lexical globals and window mirrors, and feature files read whichever form is available.

Risk:

- Stale state between list/detail/manage after RSVP, create, manage update, or delete.

Recommendation:

- Introduce one `eventState` owner with compatibility mirrors written in one place.

### Data Access Is Embedded In Render/Action Code

Problem:

- Supabase reads/writes are embedded directly in list/detail/create/manage/competition/render functions.

Risk:

- Hard to test, hard to reuse, and risky to split files because UI and persistence are coupled.

Recommendation:

- Move data access behind services by feature/domain before physical splitting.

### Create And Manage Have Separate Local State Models

Problem:

- `create/sheet.js` and `manage/sheet.js` each own substantial local `STATE`, but they also depend on global auth/current user/state and dispatch document events for parent refresh.

Risk:

- Future imports may accidentally duplicate sheet roots, listeners, submit guards, or cached tab data.

Recommendation:

- Keep each sheet's UI state local, but move persistence and shared refresh/reconciliation into services/state actions.

### Inline Handlers Require Window Globals

Problem:

- Many rendered HTML strings call `evt*` functions directly.

Risk:

- Switching to ES modules or removing globals will break user actions even if imports compile.

Recommendation:

- Keep a compatibility handler layer until inline handlers are replaced by delegated listeners.

### Detail Registry Is Useful But Not Complete Ownership

Problem:

- `window.PortalEvents.detail._registry` maps feature entrypoints, but feature data still comes from globals and direct Supabase calls.

Risk:

- Registry may create a false sense that detail dependencies are modular.

Recommendation:

- Treat registry as a compatibility discovery layer, not the final module boundary.

### Deployment Cache Can Hide Runtime State Changes

Problem:

- Cloudflare can serve stale bare JS assets with `max-age=14400`.

Risk:

- Local/cache-busted verification can pass while `portal/events.html` still loads stale scripts.

Recommendation:

- Every future changed script must be verified at the actual bare URL used by `portal/events.html` before claiming live success.

## Recommended Future State Boundaries

### `state/event-state.js`

Responsibilities:

- Own `events` collection.
- Own `rsvpsByEventId`.
- Own selected/detail event ID.
- Own initialization flag or mirror it from init guard.
- Expose read helpers and mutation helpers.
- Notify/render callers through explicit actions, not ad hoc global mutation.

Compatibility exports:

- `window.evtAllEvents`.
- `window.evtAllRsvps`.

### `state/user-state.js`

Responsibilities:

- Own `currentUser`.
- Own profile display fields.
- Own role and permission values.
- Expose `canCreateEvent`, `canManageEvent`, and admin checks.

Compatibility exports:

- `evtCurrentUser` while classic scripts remain.
- `evtCurrentUserRole` while classic scripts remain.
- `window.evtCurrentUserName`.
- `window.evtCurrentUserPic`.
- `window.evtCurrentUserInitials`.

### `state/ui-state.js`

Responsibilities:

- Own list filters/search/view/calendar state.
- Own transient CTA panel state.
- Own route/detail mode state.
- Keep session storage interactions centralized.

Compatibility exports:

- `evtActiveTab` while classic scripts remain.

### Local Feature State

Keep local, but make persistence external:

- Create sheet step/form/file preview state can remain local to create UI.
- Manage sheet active tab/cache state can remain local to manage UI.
- Scanner camera stream and map geolocation watch should remain local lifecycle state.

Move out:

- Supabase writes.
- Edge Function calls.
- Storage uploads.
- Shared event/RSVP reconciliation.

## Recommended Future Service Boundaries

### `services/events-api.js`

Own:

- Fetch event lists.
- Fetch one event by ID or slug.
- Insert event.
- Update event fields.
- Delete event.
- Duplicate event.
- Update status.

Current source files:

- `list.js`
- `detail.js`
- `utils.js`
- `create.js`
- `create/sheet.js`
- `manage/sheet.js`
- `rsvp.js`
- `competition.js`

### `services/rsvps-api.js`

Own:

- Fetch current-user RSVP map.
- Fetch member RSVPs.
- Fetch guest RSVPs.
- Upsert RSVP.
- Cancel RSVP.
- RSVP counts and paid RSVP state.

Current source files:

- `list.js`
- `detail.js`
- `rsvp.js`
- `manage/sheet.js`
- `scanner.js`
- `raffle.js`

### `services/waitlist-api.js`

Own:

- Fetch event waitlist.
- Join waitlist.
- Leave waitlist.
- Claim waitlist spot.

Current source files:

- `detail.js`
- `rsvp.js`

### `services/checkins-api.js`

Own:

- Fetch check-ins.
- Insert member check-in.
- Insert guest check-in.
- Detect duplicate check-ins.

Current source files:

- `detail.js`
- `manage/sheet.js`
- `scanner.js`

### `services/documents-api.js`

Own:

- Fetch event documents.
- Insert document metadata.
- Update distribution flags.
- Delete document metadata.
- Request signed URLs.

Current source files:

- `documents.js`
- `manage/sheet.js`

### `services/storage-api.js`

Own:

- Upload banner/embed images.
- Upload raffle prize images.
- Upload event documents.
- Upload scrapbook photos.
- Upload competition entry files.
- Delete stored objects.
- Return public URLs or signed URLs consistently.

Current buckets:

- `event-banners`
- `event-raffle-prizes`
- `event-documents`
- `event-photos`
- `competition-entries`

### `services/raffle-api.js`

Own:

- Fetch raffle entries/winners.
- Insert raffle entry.
- Draw/store winners.
- Keep model normalization separate from DB writes.

Current source files:

- `detail.js`
- `raffle.js`
- `manage/sheet.js`
- `create/sheet.js`
- `raffle-model.js`

### `services/competition-api.js`

Own:

- Fetch phases, entries, votes, winners, and contributions.
- Join competition.
- Submit entry.
- Cast vote.
- Moderate entry.
- Start/advance/extend phases.
- Finalize winners.
- Update event completion status after finalization.

Current source files:

- `competition.js`
- `manage/sheet.js`

### `services/checkout-api.js`

Own:

- Calls to `create-event-checkout`.
- Checkout payload normalization.
- Redirect URL validation.

Current source files:

- `rsvp.js`
- `competition.js`

### `services/admin-actions-api.js`

Own:

- Calls to `process-event-cancellation`.
- Calls to `manage-event-participation`.
- Event cancellation/refund/admin participation actions.

Current source files:

- `rsvp.js`
- `manage/sheet.js`

### `services/comments-api.js`

Own:

- Fetch comments.
- Insert comments.

Current source file:

- `comments.js`

### `services/location-api.js`

Own:

- Fetch live event locations.
- Upsert current user's location.
- Delete current user's location sharing row.

Current source files:

- `map.js`
- `scanner.js`

### `services/scrapbook-api.js`

Own:

- Fetch event photos.
- Insert photo metadata.
- Delete photo metadata and stored photo.

Current source file:

- `scrapbook.js`

## Recommended Migration Approach After This Inventory

1. Keep `portal/events.html` unchanged.
2. Keep every current `window.PortalEvents.*`, `window.Events*`, and `window.evt*` export intact.
3. Create documentation-level dependency maps before code moves.
4. Introduce service wrappers behind existing functions one domain at a time.
5. Introduce state helper wrappers around `evtAllEvents`, `evtAllRsvps`, and current user data.
6. Make compatibility mirrors write from one place only.
7. Replace inline handlers gradually with delegated listeners or a formal `compat/inline-handlers.js` adapter.
8. Add seeded E2E data before risky interaction refactors.
9. Only after Phase 4E readiness should Phase 5 consider changing `portal/events.html`.

## Phase 4A Findings Summary

Most important findings:

- `evtAllEvents`, `evtAllRsvps`, `evtCurrentUser`, and `evtCurrentUserRole` are the central shared state risks.
- `list.js` is the primary loader for event/RSVP state, but many other files read or mutate that state directly.
- `rsvp.js` directly mutates RSVP state and also performs checkout/admin action side effects.
- `detail.js` is a high-risk integration layer because it renders many features and contains many inline handlers.
- `create/sheet.js` and `manage/sheet.js` have large local `STATE` objects that should stay local for UI, but their data writes should move behind services.
- `competition.js` needs its own service boundary before any split because it spans five competition tables, event finalization, checkout, and storage.
- Inline handlers are the main blocker to removing `window.evt*` globals.
- Storage bucket names and Edge Function names should be centralized before Phase 5.

## Recommended Next Step

Next recommended step after this document is approved:

- Create a Phase 4B compatibility wrapper design document.

Reason:

- Phase 4A shows that state and data dependencies are heavily tied to `window` globals and inline handlers.
- Before introducing services or imports, the project needs a formal compatibility wrapper design that states exactly how `window.PortalEvents.*`, `window.Events*`, and `window.evt*` will be populated during migration.

Do not start Phase 4B implementation yet. Keep the next step documentation-first unless explicitly approved.
