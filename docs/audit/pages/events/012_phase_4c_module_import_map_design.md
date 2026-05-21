# Events Refactor Phase 4C Module Import Map Design

Date: 2026-05-21

This document designs the future module import map for the portal events refactor. It is documentation only. It does not implement imports, create module files, create compatibility files, change `portal/events.html`, split files, remove globals, or start Phase 5.

References:

- `docs/audit/pages/events/009_phase_4_preparation_plan.md`
- `docs/audit/pages/events/010_phase_4a_state_data_boundary_inventory.md`
- `docs/audit/pages/events/011_phase_4b_compatibility_wrapper_design.md`

## 1. Current Classic Script Load Order

`portal/events.html` currently loads classic scripts in a fixed order. That order is the runtime dependency graph today.

### Third-party Libraries

Current order:

1. `https://cdn.tailwindcss.com` in the document head.
2. `https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js`.
3. `https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js`.
4. `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js`.
5. `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`.

Current globals from this group:

- `QRCode`
- `jsQR`
- `L`
- `supabase`

Order matters because portal event scripts assume these names are already available when QR, scanner, map, and Supabase data paths run.

### Shared Config/Auth/Page Shell

Current order:

1. `../js/config.js`
2. `../js/components/pageShell/icons.js`
3. `../js/components/pageShell/helpers.js`
4. `../js/components/pageShell/nav.js`
5. `../js/components/pageShell/dropdowns.js`
6. `../js/components/pageShell/drawer.js`
7. `../js/components/pageShell/profile-loader.js`
8. `../js/components/pageShell/index.js`
9. `../js/components/notifications.js`
10. `../js/push.js`
11. `../js/auth/shared.js`

Current globals/helpers from this group include:

- `supabaseClient`
- `callEdgeFunction`
- `getFunctionUrl`
- `checkAuth`
- `hasPermission`
- Page shell helpers and notification/push helpers.

Order matters because `config.js` creates the Supabase client and Edge Function helpers before auth and events scripts use them. Auth/shared must load before `init.js` calls `checkAuth()` and `hasPermission()`.

### Shared Event Components

Current order:

1. `../js/components/events/constants.js`
2. `../js/components/events/helpers.js`
3. `../js/components/events/pills.js`
4. `../js/components/events/card.js`

Order matters because portal event list/detail renderers use shared event constants, helpers, pill rendering, and card rendering while still running as classic scripts.

### Portal Event Files

Current order:

1. `../js/portal/events/index.js`
2. `../js/portal/events/constants.js`
3. `../js/portal/events/state.js`
4. `../js/portal/events/utils.js`
5. `../js/portal/events/raffle-model.js`
6. `../js/portal/events/list.js`
7. `../js/portal/events/detail.js`
8. `../js/portal/events/comments.js`
9. `../js/portal/events/rsvp.js`
10. `../js/portal/events/create.js`
11. `../js/portal/events/create/sheet.js`
12. `../js/portal/events/documents.js`
13. `../js/portal/events/map.js`
14. `../js/portal/events/scanner.js`
15. `../js/portal/events/raffle.js`
16. `../js/portal/events/competition.js`
17. `../js/portal/events/scrapbook.js`
18. `../js/portal/events/manage/sheet.js?v=112`
19. `../js/portal/events/init.js`
20. `../js/sw-register.js`

Order matters because:

- `index.js` seeds `window.PortalEvents` before feature files attach namespaces.
- `constants.js`, `state.js`, and `utils.js` seed values used by later feature files.
- `raffle-model.js` defines `window.EventsRaffleModel` before detail, create, manage, and raffle flows read it.
- `detail.js` creates `window.PortalEvents.detail` and the `detail.register()` registry before manage registers itself.
- `create/sheet.js` defines `window.EventsCreate` before `init.js` wires create buttons.
- `manage/sheet.js` defines `window.EventsManage` and registers with detail before `init.js` can route and render details.
- `competition.js` defines competition globals before detail-rendered competition controls can call them.
- `init.js` intentionally loads last because it calls auth, wires listeners, exports legacy handlers, calls `evtLoadEvents()`, and routes the initial URL.

## 2. Future Single Entry Goal

The eventual Phase 5 target is one module entry from `portal/events.html`:

```html
<script type="module" src="../js/portal/events/index.js"></script>
```

That switch should not happen during Phase 4C. Phase 4C only defines the future architecture.

Future `js/portal/events/index.js` should become a small orchestrator. It should not contain feature business logic. Its responsibilities should be limited to:

- Import external dependency accessors.
- Import shared constants/utilities.
- Import state owners.
- Import services/data APIs.
- Import pure models.
- Import feature modules and their public action/render APIs.
- Install compatibility wrappers before UI actions can fire.
- Call one canonical initializer.

Business logic should live in feature modules and services, not in the entry file. Compatibility wrappers must be installed before inline handlers, route actions, create/manage buttons, or detail feature actions can fire.

`initEventsPage()` should remain the one canonical initializer. Current `init.js` already has a duplicate init guard and is exported as `window.PortalEvents.initEventsPage`; the future module entry should call that same initializer rather than creating a second startup path.

## 3. Proposed Future Import Order

Proposed future import order for `js/portal/events/index.js`:

1. External global accessors.
2. Shared constants and pure utilities.
3. State modules.
4. Services/data APIs.
5. Pure models such as raffle model.
6. Feature modules.
7. Compatibility wrappers.
8. Initializer.

Detailed order:

1. `./compat/external-globals.js`
2. `./shared/constants.js` or existing constants bridge replacement.
3. `./shared/dom.js`, `./shared/formatters.js`, `./shared/dates.js`, `./shared/permissions.js`, `./shared/errors.js` as needed.
4. `./state/event-state.js`, `./state/user-state.js`, `./state/filters-state.js`.
5. `./services/events-api.js`, `./services/rsvps-api.js`, `./services/documents-api.js`, `./services/storage-api.js`, `./services/competition-api.js`, `./services/admin-actions-api.js`, and follow-up services such as waitlist/checkins/location if split later.
6. `./raffle/model.js`.
7. Feature modules: list, detail, create, manage, competition, RSVP/waitlist, raffle, comments, documents, map, scanner, scrapbook.
8. `./compat/window-exports.js`.
9. `./compat/inline-handlers.js`.
10. `./init.js`.

Important ordering rule: services and models should not import feature modules. Features may import services/models or receive them by dependency injection. Compatibility wrappers may import nothing except types/helpers if possible; they should receive feature APIs from `index.js`.

## 4. Proposed Future `index.js` Shape

Pseudocode only:

```js
import { getExternalDeps } from './compat/external-globals.js';

import { EVENT_CONSTANTS } from './shared/constants.js';
import { eventState } from './state/event-state.js';
import { userState } from './state/user-state.js';
import { filtersState } from './state/filters-state.js';

import { createEventsApi } from './services/events-api.js';
import { createRsvpsApi } from './services/rsvps-api.js';
import { createDocumentsApi } from './services/documents-api.js';
import { createStorageApi } from './services/storage-api.js';
import { createCompetitionApi } from './services/competition-api.js';
import { createAdminActionsApi } from './services/admin-actions-api.js';

import { raffleModel } from './raffle/model.js';

import { createListFeature } from './list/index.js';
import { createDetailFeature } from './detail/index.js';
import { createCreateFeature } from './create/index.js';
import { createManageFeature } from './manage/index.js';
import { createCompetitionFeature } from './competition/index.js';
import { createRaffleFeature } from './raffle/index.js';
import { createCommentsFeature } from './comments/index.js';
import { createDocumentsFeature } from './documents/index.js';
import { createMapFeature } from './map/index.js';
import { createScannerFeature } from './scanner/index.js';
import { createScrapbookFeature } from './scrapbook/index.js';

import { createFeatureRegistry } from './detail/registry.js';
import { installWindowExports } from './compat/window-exports.js';
import { installInlineHandlers } from './compat/inline-handlers.js';
import { initEventsPage } from './init.js';

const deps = getExternalDeps();

const services = {
  events: createEventsApi({ supabaseClient: deps.supabaseClient }),
  rsvps: createRsvpsApi({ supabaseClient: deps.supabaseClient, callEdgeFunction: deps.callEdgeFunction }),
  documents: createDocumentsApi({ supabaseClient: deps.supabaseClient }),
  storage: createStorageApi({ supabaseClient: deps.supabaseClient }),
  competition: createCompetitionApi({ supabaseClient: deps.supabaseClient, callEdgeFunction: deps.callEdgeFunction }),
  adminActions: createAdminActionsApi({ supabaseClient: deps.supabaseClient, callEdgeFunction: deps.callEdgeFunction })
};

const registry = createFeatureRegistry();

const features = {
  list: createListFeature({ deps, state: eventState, filtersState, services }),
  detail: createDetailFeature({ deps, state: eventState, userState, services, registry, raffleModel }),
  create: createCreateFeature({ deps, state: eventState, services, raffleModel }),
  manage: createManageFeature({ deps, state: eventState, services, registry, raffleModel }),
  competition: createCompetitionFeature({ deps, state: eventState, services, raffleModel }),
  raffle: createRaffleFeature({ deps, state: eventState, services, raffleModel }),
  comments: createCommentsFeature({ deps, userState, services }),
  documents: createDocumentsFeature({ deps, userState, services }),
  map: createMapFeature({ deps, state: eventState, services }),
  scanner: createScannerFeature({ deps, state: eventState, services }),
  scrapbook: createScrapbookFeature({ deps, userState, services })
};

registry.register('rsvp', features.rsvps);
registry.register('raffle', features.raffle);
registry.register('competition', features.competition);
registry.register('comments', features.comments);
registry.register('documents', features.documents);
registry.register('map', features.map);
registry.register('scanner', features.scanner);
registry.register('scrapbook', features.scrapbook);
registry.register('manage', features.manage);

installWindowExports({ constants: EVENT_CONSTANTS, state: eventState, raffleModel, features, initEventsPage });
installInlineHandlers({ features, registry });

initEventsPage({ deps, state: eventState, userState, filtersState, services, features, registry });
```

Notes:

- This pseudocode intentionally avoids top-level feature execution before compatibility installers run.
- The actual implementation may need a smaller dependency object to avoid passing too much everywhere.
- `features.rsvps` is shown conceptually; the current code has `rsvp.js`, and a future `rsvp/index.js` or `rsvps/index.js` name should be chosen before implementation.
- `init.js` must stop binding its own `DOMContentLoaded` listener before the final module switch, or the listener must remain guarded and tested to prevent duplicate initialization.

## 5. Proposed Feature Module Import Map

| Future module path | Current source file | Responsibility | Imports needed | Exports provided | Depends on | Risk level | Migration notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `init.js` | `js/portal/events/init.js` | Auth bootstrap, one canonical initializer, top-level listener wiring, initial load, URL route. | External deps, state owners, list/detail/create/manage APIs, router helpers. | `initEventsPage`, possibly `setupListeners`. | `checkAuth`, `hasPermission`, `supabaseClient`, list load/render, many legacy handlers. | High | Must remain last conceptually; remove or guard classic `DOMContentLoaded` path before module switch. |
| `state/event-state.js` | `js/portal/events/state.js` plus state from list/detail/rsvp/manage/create. | Own events, RSVP map, detail slice, create/manage open state, scanner/map state handles. | None or tiny state helpers. | `eventState`, getters/setters, subscription hooks if needed. | Current global mirrors: `evtAllEvents`, `evtAllRsvps`, scanner globals. | High | Start with wrappers over current globals; avoid stale lexical/window map divergence. |
| `compat/external-globals.js` | New future file based on `config.js`, auth/shared, CDN globals. | Required/optional external dependency accessors. | None, except `window`. | `getExternalDeps`, `requireGlobal`, `optionalGlobal`. | `supabaseClient`, `callEdgeFunction`, `getFunctionUrl`, `checkAuth`, `hasPermission`, `QRCode`, `jsQR`, `L`. | Medium | Implement before single entry; missing required deps should fail clearly. |
| `compat/window-exports.js` | New future file based on Phase 1-3E bridge exports. | Install `window.PortalEvents.*`, `window.Events*`, and `window.evt*` compatibility names. | Feature APIs passed from index. | `installWindowExports`. | All public feature APIs. | High | Must run before generated UI actions can fire; repeat-safe. |
| `compat/inline-handlers.js` | New future file based on current inline `onclick`/`onchange` calls. | Preserve inline handler names and/or install delegated adapters. | Feature actions, registry. | `installInlineHandlers`. | RSVP, competition, documents, scrapbook, map, scanner, create/manage actions. | High | Keep simple at first; migrate one handler category at a time. |
| `services/events-api.js` | `list.js`, `detail.js`, `create.js`, `create/sheet.js`, `manage/sheet.js`, `competition.js`. | Event reads/writes, drafts/status updates, host/profile lookups if not split. | Supabase client. | `fetchEvents`, `fetchEventDetail`, `createEvent`, `updateEvent`, `deleteEvent`. | `events`, `event_hosts`, `profiles`. | High | Separate list/detail read shapes from admin mutation shapes. |
| `services/rsvps-api.js` | `list.js`, `detail.js`, `rsvp.js`, `manage/sheet.js`. | RSVP, guest RSVP, waitlist, check-in related reads/writes where scoped to attendance. | Supabase client, Edge Function caller for checkout/cancel. | `fetchRsvpMap`, `setRsvp`, `cancelRsvp`, `joinWaitlist`, `claimWaitlistSpot`. | `event_rsvps`, `event_guest_rsvps`, `event_waitlist`, `create-event-checkout`, `process-event-cancellation`. | High | May need separate `waitlist-api.js` and `checkins-api.js`; decide after test plan. |
| `services/documents-api.js` | `documents.js`, `manage/sheet.js`. | Document metadata reads/writes and distribution status. | Supabase client. | `fetchDocuments`, `insertDocument`, `markDistributed`, `deleteDocumentRow`. | `event_documents`. | Medium | Keep storage file operations in `storage-api.js`. |
| `services/storage-api.js` | `create.js`, `create/sheet.js`, `documents.js`, `scrapbook.js`, `competition.js`, `manage/sheet.js`. | Upload/download/sign/remove storage objects. | Supabase client. | `uploadFile`, `getPublicUrl`, `createSignedUrl`, `removeFiles`. | Buckets: event-documents, event-photos, competition-entries, event banners/images. | High | Bucket names should be constants; permissions and path conventions must be tested. |
| `services/competition-api.js` | `competition.js`, `detail.js`, `create.js`, `create/sheet.js`, `manage/sheet.js`. | Competition phase/entry/vote/winner/contribution data and actions. | Supabase client, Edge Function caller, storage API. | `fetchCompetitionBundle`, `join`, `submitEntry`, `vote`, `moderate`, `advancePhase`, `finalize`. | Competition tables, events status, `create-event-checkout`. | High | Break render/action/data mixing before file splitting. |
| `services/admin-actions-api.js` | `manage/sheet.js`, `rsvp.js`, `detail.js`. | Host/admin mutations, cancellation, participation management. | Supabase client, Edge Function caller. | `updateEvent`, `deleteEvent`, `manageParticipation`, `processCancellation`. | `manage-event-participation`, event admin tables. | High | Define permissions and event refresh notifications carefully. |
| `list/index.js` | `list.js` | Event list load/render/filter/search/calendar/hero/cards. | State, events API, RSVP API, shared card/pill helpers, router. | `loadEvents`, `renderEvents`, filter/search actions, list API for compat. | Event state, filters state, detail navigation. | High | `list.js` is large; split internally only after tests cover list views. |
| `detail/index.js` | `detail.js` | Detail render, route handling, CTA, feature sections, feature registry consumer. | State, services, registry, raffle model, feature builders. | `openDetail`, `routeByUrl`, `navigateToList`, `register`, `renderDetail`. | List state, RSVP state, feature modules. | High | Highest circular risk; registry should break direct feature imports. |
| `create/index.js` | `create/sheet.js` plus legacy `create.js` | Create event sheet, validation, uploads, submit, legacy create compatibility. | State, events API, storage API, competition API, raffle model, external deps. | `open`, `close`, `isFlagOn`, create actions. | `EventsCreate`, create form DOM, storage, event insert, competition seed. | High | Keep legacy `create.js` mapped until retirement is explicit. |
| `manage/index.js` | `manage/sheet.js` | Manage sheet, tabs, admin edits, RSVPs/checkins, documents, raffle, competition, danger actions. | State, services, registry, raffle model, scanner/raffle actions. | `open`, `close`, `refreshRaffle`. | `EventsManage`, `evtOpenScanner`, `evtOpenRaffleDraw`, detail registry. | High | Avoid direct detail import; register manage action through registry from index. |
| `competition/index.js` | `competition.js` | Competition render/actions/tier calculator. | Competition API, storage API, event state, current user state. | `buildHtml`, `buildSubmitFormHtml`, `join`, `submitEntry`, `castVote`, admin phase actions. | Detail render, list refresh, Edge Function checkout. | High | Separate pure render from async actions before import conversion. |
| `raffle/model.js` | `raffle-model.js` | Pure raffle normalization, category/order/draw helpers. | Constants only. | `raffleModel` API, defaults. | Create/detail/manage/raffle. | Medium | Good early module candidate because it is closest to pure model code. |
| `comments/index.js` | `comments.js` | Load/post comments. | Supabase/comments service or events API, user state. | `loadComments`, `postComment`, build/render helpers. | Detail registry, current user display globals. | Medium | Should receive user profile instead of reading `window.evtCurrentUserPic`. |
| `documents/index.js` | `documents.js` | Build documents UI and handle upload/download/delete/distribute. | Documents API, storage API, user state. | `buildDocumentsHtml`, document actions. | Detail registry, storage, current user. | Medium | Keep inline handler exports until delegated. |
| `map/index.js` | `map.js` | Build map UI, live location sharing, Leaflet lifecycle, realtime channels. | External `L`, location service, event/user state. | `buildMapHtml`, `initMap`, `toggleLocationSharing`, cleanup actions. | Detail registry, Supabase realtime, geolocation. | High | Device/realtime cleanup makes this risky. |
| `scanner/index.js` | `scanner.js` | QR scanner, camera lifecycle, check-in actions. | External `jsQR`, checkins/RSVP service, state. | `openScanner`, `closeScanner`, scan actions. | Manage sheet, detail, camera API. | High | Must prove stream/frame cleanup before module switch. |
| `scrapbook/index.js` | `scrapbook.js` | Scrapbook photo render/upload/view/delete. | Storage API, photos API or events API, user state. | `buildScrapbookHtml`, upload/delete/view actions. | Detail registry, storage, inline handlers. | Medium | Exact service boundary may need follow-up grep/test. |

Unclear item: the final name for RSVP feature actions (`rsvp/index.js` vs `rsvps/index.js`) should be decided in a later implementation plan. The required import map above keeps RSVP data under `services/rsvps-api.js` and treats RSVP UI/actions as part of the detail/inline-handler adapter unless separated later.

## 6. Circular Dependency Risk Map

| Current cycle | Why it exists | Proposed break strategy | Risk level |
| --- | --- | --- | --- |
| list <-> detail | List renders cards and opens detail; detail reads `evtAllEvents` and navigates back to list. | Introduce a router/navigation dependency owned by `init` or `index`; list emits/open-detail action, detail reads state through `eventState`. | High |
| detail <-> RSVP | Detail renders CTA based on RSVP state; RSVP mutates `evtAllRsvps` and re-renders detail/list. | Put RSVP mutations in `rsvps-api` plus state setters; detail subscribes or receives refreshed state. | High |
| detail <-> documents/comments/map/competition/scrapbook | Detail renders feature sections and current registry entries reference `window.evt*` functions. | Evolve `detail.register()` into an internal registry installed by `index`; detail consumes registry entries without importing every feature directly. | High |
| create/manage <-> raffle model | Create/manage both normalize raffle config and manage reads/writes raffle setup; raffle draw also reads model. | Keep `raffle/model.js` pure and imported by create/manage/raffle/detail. No model imports from features. | Medium |
| competition <-> detail/list refresh | Competition actions read `evtAllEvents`, render inside detail, and may update event status/list visibility. | Competition actions call `competition-api` and then publish state refresh events; list/detail consume state changes. | High |
| init <-> feature modules | `init.js` wires every listener and calls list load; features depend on auth/user/profile state initialized by `init`. | `index.js` constructs deps/state/features first, then calls `initEventsPage({ deps, state, features })`; `init` does not import feature modules directly where avoidable. | High |
| services <-> state | Current data calls are inside feature files that also mutate globals. Services may be tempted to mutate state directly. | Services return data only; state setters live in state modules or feature orchestration. Avoid service imports from state. | High |
| manage <-> detail registry | Manage registers itself into `window.PortalEvents.detail` after detail loads. | `index.js` owns registry creation and registration order; manage exports API without importing detail. | Medium |
| scanner/map <-> manage/detail | Detail and manage open scanner/map actions; scanner/map need event/user state and cleanup. | Pass scanner/map actions through registry or feature dependency object; keep camera/geolocation lifecycle isolated. | High |
| compatibility wrappers <-> features | Wrappers need feature APIs, while features may be tempted to call wrapper globals. | Wrappers receive feature APIs from `index`; features never import wrappers and never depend on `window` for internal calls. | High |

## 7. Dependency Injection Plan

Dependency injection should be used where it reduces hidden global reads and circular imports.

### Supabase Client

Use `getExternalDeps()` to obtain `supabaseClient` once. Pass it to service factories such as `createEventsApi`, `createRsvpsApi`, `createDocumentsApi`, `createStorageApi`, and `createCompetitionApi`.

Avoid importing or reading `supabaseClient` directly in feature modules after service boundaries exist.

### Auth Helpers

Pass `checkAuth` and `hasPermission` into `initEventsPage()` or an auth service. `init` should update user/permission state and then features should read that state or receive permission predicates.

`hasPermission` should fail closed if missing in optional UI contexts, as planned in Phase 4B.

### External Libraries

Pass optional external libraries into only the modules that need them:

- `L` to map.
- `jsQR` to scanner.
- `QRCode` to ticket/QR flows after exact users are confirmed.

Optional libraries should not block list/detail boot if their feature is not invoked.

### Event State

Pass `eventState`, `userState`, and `filtersState` into feature factories. Avoid importing mutable singleton state into services.

### Router/Navigation

Create one navigation/router dependency that owns URL changes and detail/list transitions. Inject it into list/detail instead of letting list and detail import each other.

### Feature Registries

Create registry once in `index.js`. Pass it to detail and registration calls. This breaks direct imports from detail into documents/comments/map/scanner/competition/scrapbook/manage.

### Services

Use service factories with explicit dependencies. Features can either import service factories from `index.js` assembly or receive ready-made service instances.

Recommendation: `index.js` should assemble service instances and pass them into feature factories. That keeps service construction centralized and makes tests easier.

## 8. Feature Registry Plan

### Current Use

`detail.js` currently creates `window.PortalEvents.detail` and provides `detail.register()`. It registers feature placeholders for:

- `rsvp`
- `raffle`
- `competition`
- `comments`
- `documents`
- `scrapbook`
- `map`
- `scanner`

`manage/sheet.js` registers `manage` later if `window.PortalEvents.detail.register` exists.

The current registry stores functions that return `window.evt*` globals. This is a compatibility bridge, not yet a true internal dependency boundary.

### Future Role

The registry should evolve into an internal feature registry owned by `index.js` or `detail/registry.js`.

Future responsibilities:

- Store feature render builders and action APIs.
- Let detail render optional feature sections without importing every feature directly.
- Let manage/scanner/map/competition register public actions in a controlled order.
- Provide a stable compatibility surface for `window.PortalEvents.detail.register()` until callers are migrated.

### Migration Path

1. Keep current `window.PortalEvents.detail.register()` behavior.
2. Introduce an internal `createFeatureRegistry()` in a later implementation phase.
3. Have `window.PortalEvents.detail.register()` delegate to the internal registry.
4. Move detail feature lookups from `window.evt*` to registry entries.
5. Keep compatibility wrappers exporting legacy `window.evt*` names until inline handlers are gone.
6. Remove direct registry use from `window` only after Phase 5 readiness and compatibility tests prove it is safe.

### Risk

Risk is high because detail is the integration point for most event subfeatures. A registry migration should be tested with seeded detail pages that include RSVP, raffle, competition, documents, comments, map, scanner, scrapbook, and manage affordances.

## 9. Service Import Boundaries

General rule: services may import shared constants/utilities and receive external deps, but services should not import feature modules or mutable UI state.

### List Data

`list/index.js` should receive `eventsApi`, `rsvpsApi`, and state setters. It can call services directly because list owns initial event and RSVP cache loading.

### Detail Data

`detail/index.js` should receive service functions through dependencies rather than importing all services directly. Detail has many feature integrations, so dependency injection keeps it from becoming a service dependency hub.

### Manage Data

`manage/index.js` should receive `eventsApi`, `rsvpsApi`, `documentsApi`, `storageApi`, `competitionApi`, and `adminActionsApi`. Manage can use several services directly because it owns a complex admin sheet, but it should not mutate shared event state except through provided state reconciliation helpers.

### Create Submit

`create/index.js` should receive `eventsApi`, `storageApi`, and `competitionApi`. Submit logic should orchestrate validation, upload, insert, and post-create events, but actual Supabase/storage calls should live in services.

### RSVP/Waitlist

RSVP and waitlist actions should receive `rsvpsApi`, `eventsApi` where needed, and state setters. They should not import detail/list directly. Re-render should happen through state notifications or explicit callbacks passed by `index`/`init`.

### Competition

`competition/index.js` should receive `competitionApi`, `storageApi`, `eventsApi` if finalization changes event status, current user state, and refresh callbacks. It should not import detail/list directly.

### Documents/Storage

`documents/index.js` should receive `documentsApi` and `storageApi`. `storageApi` should own bucket/path mechanics; document UI should own rendering and user actions.

### Raffle

`raffle/model.js` should be pure and imported directly by create/detail/manage/raffle/competition if needed. Raffle actions that write entries/winners should use a service boundary. Do not let the pure model import services or state.

## 10. Phase 5 Readiness Gates

Before switching `portal/events.html` to a module entry, all of the following must be true:

- Import map reviewed and accepted.
- Compatibility wrappers implemented and tested.
- `compat/external-globals.js` classifies required vs optional dependencies and has missing-dependency tests.
- `compat/window-exports.js` preserves `window.PortalEvents.*`, `window.EventsCreate`, `window.EventsManage`, `window.EventsRaffleModel`, and representative `window.evt*` names.
- `compat/inline-handlers.js` wraps or delegates current inline handlers enough that generated markup still works.
- `initEventsPage()` remains the one canonical initializer.
- Duplicate initialization tests pass.
- State mirror strategy is implemented for `evtAllEvents`, `evtAllRsvps`, user/profile display globals, and scanner globals.
- Service boundaries exist for event list/detail, RSVP/waitlist, documents/storage, competition, create, and manage admin actions.
- Test fixtures exist for seeded event list, event detail, manage, create, RSVP, raffle, competition, documents, map/scanner, and scrapbook flows.
- E2E coverage exists for seeded event/detail/manage/create/competition flows.
- Inline handler smoke tests cover representative RSVP, competition, documents, scrapbook, map/scanner, create, manage, and raffle controls.
- Deployment cache verification plan exists for every changed bare JS asset used by `portal/events.html`.
- Rollback plan exists: restore classic script list and known-good bridge commit if module entry fails live verification.
- `events-dashboard.js` remains outside the portal module migration unless separately scoped.

## 11. Recommended Phase 4D Next Step

Recommended Phase 4D: expand the test plan before implementing any import changes.

Phase 4D should define the static and E2E coverage needed to make Phase 4 implementation safe:

- Static checks for current globals and future compatibility exports.
- Static checks for classic loader order and no accidental `portal/events.html` changes during Phase 4.
- Duplicate init tests.
- Seeded list/detail route tests.
- Seeded create/manage sheet tests.
- Seeded RSVP/waitlist/raffle tests.
- Seeded competition tests covering render and action globals.
- Documents/scrapbook/map/scanner smoke tests.
- Missing optional dependency tests for `jsQR` and `L`.
- Live deployment cache verification checklist for actual bare script URLs.

Do not start Phase 5 until Phase 4D testing gates and Phase 4 compatibility wrappers are in place.
