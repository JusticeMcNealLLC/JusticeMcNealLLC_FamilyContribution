# Events Refactor — List Surface Inventory (`list.js`)

**Document:** `047_list_surface_inventory.md`  
**Path:** `docs/audit/pages/events/047_list_surface_inventory.md`  
**Date:** 2026-05-21  
**Status:** **Audit complete (inventory only)** — no implementation  
**Kickoff:** `046_list_manage_create_audit_kickoff.md` (`1ce201c`)  
**Prior gate:** Phase 5L closed (`045`); production 3-tag model (`8cb205e`, `044`)  
**Audit target:** `js/portal/events/list.js`  
**Related:** `025_phase_5_remaining_refactor_completion_roadmap.md`, `test/_smoke-phase3a-list-bridge.js`

---

## 1. Baseline

| Item | State |
| --- | --- |
| **Phase 5L** | **Closed** (`d483f6a`) |
| **Production load model** | **3** classic tags via `classic-chain-loader.js` |
| **046 kickoff** | Committed — list/manage/create audit track started |
| **This doc** | **Audit-only** — first detailed inventory (list surface) |
| **Implementation** | **Not started**, **not approved** |
| **5L.4 / Option D** | **Not started** |

### Loader position

In `classic-chain-loader.js`, `list.js` is the **4th** middle script:

`constants.js` → `state.js` → `utils.js` → `raffle-model.js` → **`list.js`** → `team/*` → `detail/*` → …

List runs **before** detail pipeline and **before** create/manage modules. It may call into detail navigation (`evtNavigateToEvent` / `evtOpenDetail`) and RSVP (`evtHandleRsvp`) at runtime only.

---

## 2. File Snapshot

| Metric | Value (repo snapshot, 2026-05-21) |
| --- | ---: |
| **Path** | `js/portal/events/list.js` |
| **Lines** | **2,761** |
| **Bytes** | **~148 KB** |
| **Structure** | Single IIFE `(function () { 'use strict'; … })();` |
| **Module pattern** | Classic script — **no** native `export` |
| **Header spec** | `events_003` A2/A3 + `events_004` D1/D3 + vlift features (F1–F14, E3–E11, etc.) |

---

## 3. High-Level Responsibility Map

| Subsystem | Primary functions | DOM / data touchpoints |
| --- | --- | --- |
| **Data loading** | `loadEvents` | Supabase `events`, `event_rsvps`, `event_guest_rsvps`; writes `window.evtAllEvents`, `evtAllRsvps`, `evtAttendees`, `evtAttendeeCounts` |
| **Main render orchestrator** | `renderEvents` | `#evtGroups`, `#evtHero`, `#emptyState`, `#evtCalendarMount`; branches calendar vs search vs bucketed list |
| **List / bucket rendering** | `_renderBucket`, `H.groupByBucket` | `#evtGroups`; bucket labels (Today / This week / …); E11 expand/collapse |
| **Card rendering** | `evtRenderCard` → `EventsCard.render` | `data-evt-card` anchors; category emoji filter `data-evt-cat` |
| **Editorial hero** | `_pickHero`, `_renderHero` | `#evtHero`; `data-evt-hero*`, heart, going cluster, CTA |
| **Going rail** | `_renderGoingRail`, `_miniCard` | `#evtGoingRail`; `data-evt-mini` |
| **Top picks** | `_renderTopPicks` | `#evtTopPicks` (vlift-gated inside renderer) |
| **Live banner** | `_renderLiveBanner` | `#evtLiveBanner`; `data-evt-live` |
| **Mini calendar (right rail)** | `_renderMiniCalendar`, `_activeDay` | `#evtMiniCalMount` (F10); day filter via `_matchesDate` |
| **Full calendar view** | `_renderCalendar`, `_openDayModal`, `_groupEventsByDay` | `#evtCalendarMount`, `#evtCalGrid`, day modal |
| **My RSVPs rail** | `_renderMyRsvps` | `#evtMyRsvpsMount`; `data-evt-myrsvp`, `data-evt-myrsvps-all` |
| **Stats card** | `_renderStatsCard` | `#evtStatsMount`; `data-evt-stats-all` → calendar view |
| **Filters — lifecycle tab** | `_switchLifecycleTab`, `initFilterChips` (seg) | `#evtLifecycleSeg`; `window.evtActiveTab` |
| **Filters — type** | `_matchesType`, `_syncTypeChips`, type menu + chip rail | `#evtTypeMenu`, `#evtTypeChips`, `#typeFilter` |
| **Filters — category** | `_matchesCategory`, `_renderActiveFilterPill` | `_activeCategory`; `data-evt-cat`, `data-clear-cat` |
| **Filters — date** | `_matchesDate`, `_initDateMenu` | `#evtDateMenu`, `_activeDate` |
| **Search** | `setupSearch`, `_renderSearchSuggest`, history helpers | `#evtSearchInput`, `#evtSearchExpand`, `#evtSearchSuggest` |
| **Search mode render** | inside `renderEvents` | Flat two-tier title/desc sort; disables bucketing |
| **State persistence** | `_persistState`, `_restoreState` | `sessionStorage` `evt_list_state_v1`, `evt_search_hist_v1` |
| **Header chrome** | `_renderHeaderCount`, `_renderHeaderGreeting`, `_initHeaderBell` | `#evtHeaderCount`, `#evtHeaderTitle`, `#evtHeaderBell` → `#notifBtn` |
| **Vlift / mobile UX** | `_initVlift`, `_initMobileFilterStrip`, `_initStickyHeader`, `_initMobileFab`, `_initPullToRefresh` | `body.evt-vlift`, `#evtMobileSearchHost`, FAB, PTR indicator |
| **Gestures / context menu** | `_initSwipeGestures`, `_openContextSheet`, `_runContextAction` | Swipe on cards; share/ICS/hide/RSVP cancel |
| **Skeletons** | `renderSkeletons` | `#evtGroups` on `_onReady` |
| **Empty states** | `_renderEmptyCopy`, `_upgradeEmptyIllo` | `#emptyTitle`, `#emptySubtext`, `#emptyCreateBtn` |
| **Bridge exports** | `window.evt*`, `window.PortalEvents.list` | See §5–§6 |
| **Cross-module hooks** | `events:manage:updated` listener | Reload via `evtLoadEvents` after manage sheet save |

**Approx. DOM ID references:** **~88** `getElementById` / querySelector hooks — list owns most list-view shell IDs in `portal/events.html`.

---

## 4. Function Inventory (by category)

Legend: **R** render, **F** filter/match, **S** state, **D** DOM binding/init, **B** bridge/export, **U** utility, **?** mixed.

### 4.1 Core public API

| Function | Cat | Role |
| --- | --- | --- |
| `loadEvents` | B+R | Async fetch; populate globals; call `renderEvents` |
| `renderEvents` | R | Main list/calendar/search orchestrator |
| `setupSearch` | D+F | Search input, debounce, expand/collapse, suggest panel |
| `initFilterChips` | D+F | Lifecycle seg, type menu, chip rail, empty create, date menu |
| `renderSkeletons` | R | Loading placeholders via `Card.skeleton()` |

### 4.2 Render — surfaces

| Function | Cat | Role |
| --- | --- | --- |
| `_renderHero` | R | Editorial hero card HTML + wire hero interactions |
| `_pickHero` | F+R | Hero selection rule (upcoming tab) |
| `_heroBg` | U | Hero background gradient helper |
| `_renderBucket` | R | Bucket section + card grid + create tile injection |
| `_renderGoingRail` | R | Horizontal going rail |
| `_miniCard` | R | Mini card HTML for rail / top picks |
| `_renderTopPicks` | R | Top picks scroller (vlift) |
| `_renderLiveBanner` | R | Live-now banner |
| `_renderMiniCalendar` | R | Right-rail month grid |
| `_renderMyRsvps` | R | Right-rail RSVP rows |
| `_renderStatsCard` | R | Right-rail stats + link to calendar |
| `_renderCalendar` | R | Full calendar month grid |
| `_openDayModal` / `_closeDayModal` | R+D | Day detail modal |
| `_renderHeaderCount` / `_renderHeaderGreeting` | R | Page header stats + greeting |
| `_renderActiveFilterPill` | R+D | Category filter pill strip |
| `_renderEmptyCopy` | R | Tab-specific empty state copy |
| `_renderSearchSuggest` | R+D | Search history/suggestions dropdown |
| `_attendeeCluster` | R | Hero overlay avatar cluster HTML |
| `_renderHeaderCount` (via stub) | B | `evtUpdateHeroStats` delegates here |

### 4.3 Filter / match predicates

| Function | Cat | Role |
| --- | --- | --- |
| `_matchesType` | F | LLC / social / all type filter |
| `_matchesCategory` | F | Category emoji filter |
| `_matchesLifecycle` | F | upcoming / past / going / saved tab logic |
| `_matchesDate` | F | Date menu + mini-cal day filter |
| `_notHidden` | F | Session hide-list (`_hiddenIds`) |
| `_groupEventsByDay` | U | Calendar grouping helper |
| `_localDateKey` | U | Local date key for calendar |

### 4.4 State / persistence

| Function | Cat | Role |
| --- | --- | --- |
| `_persistState` / `_restoreState` | S | `sessionStorage` list UI state |
| `_readHistory` / `_writeHistory` / `_pushHistory` / `_removeHistory` / `_clearHistory` | S | Search history |
| `_switchLifecycleTab` | S+D | Programmatic tab switch |
| `_applyRestoredUi` | S+D | Apply restored state to visible chrome |
| `_syncTypeChips` | S+D | Sync chip rail active state |

### 4.5 DOM binding / init (local)

| Function | Cat | Role |
| --- | --- | --- |
| `_onReady` | D | DOMContentLoaded bootstrap: skeletons, inits, bell |
| `_initViewToggle` / `_applyViewChrome` | D | List vs calendar toggle |
| `_initFilterChips` (partial) | D | See §4.1 |
| `_initDateMenu` | D+F | Date filter dropdown |
| `_initStickyHeader` | D | Condensing header scroll |
| `_initMobileFab` | D | Mobile create FAB |
| `_initPullToRefresh` | D | PTR → `evtLoadEvents` |
| `_initMobileFilterStrip` | D | Move search row on mobile breakpoint |
| `_initVlift` | D | Vlift body class + `evtSetVlift` / `evtIsVlift` globals |
| `_initGreeting` | D | F1 greeting slot |
| `_initSwipeGestures` | D | Touch swipe on cards |
| `_initHeaderBell` / `_wireHeaderBellBadge` | D | Portal header notification bell proxy |
| `_wireCardClicks` | D | Delegated navigation, bucket toggle, create tile |
| `_wireCalendarClicks` | D | Calendar cell clicks |
| `_wireSuggestClicks` | D | Search suggest interactions |
| `_hideSearchSuggest` | D | Close suggest panel |

### 4.6 Context sheet / share / ICS

| Function | Cat | Role |
| --- | --- | --- |
| `_ensureContextSheet` / `_openContextSheet` / `_closeContextSheet` | D+R | Long-press / context actions sheet |
| `_runContextAction` | ? | Share, ICS, hide, RSVP cancel |
| `_confirmCancelRsvp` | ? | RSVP cancel via `evtHandleRsvp` |
| `_eventShareUrl` / `_copyToClipboard` / `_toast` | U | Share/copy helpers |
| `_icsDate` / `_icsEscape` / `_downloadIcs` | U | ICS export |
| `_ensureSwipeAction` / `_resetSwipeCard` | D | Swipe action UI |

### 4.7 Utilities

| Function | Cat | Role |
| --- | --- | --- |
| `_escapeAttr` | U | Attribute escaping |
| `_toIsoDate` | U | Date formatting |
| `_bucketLabelEmoji` | U | Bucket header emoji |
| `_readVlift` | U | URL `?vlift=` read |
| `_isMobileTouch` / `_prefersReducedMotion` | U | Feature detection |
| `_upgradeEmptyIllo` | U | Lazy Lottie empty illustration |

---

## 5. Global / Bridge Dependency Map

### 5.1 Reads (upstream modules / globals)

| Dependency | Used for |
| --- | --- |
| `window.EventsConstants` (`C`) | Category emoji, gradients, tags |
| `window.EventsHelpers` (`H`) | `escapeHtml`, `relativeDate`, `formatDate`, **`groupByBucket`** |
| `window.EventsPills` (`P`) | `statePill`, `countdownChip` on hero/cards |
| `window.EventsCard` (`Card`) | `render`, `skeleton` |
| `supabaseClient` | All list data queries |
| `evtCurrentUser` | RSVPs, drafts, permissions (from `init.js` / auth) |
| `canManageEvents()` | Draft events query |
| `canCreateEvents()` | Create tile, empty CTA, FAB |
| `checkAuth` | Indirect — user must exist before `loadEvents` runs |
| `window.evtActiveTab` | Lifecycle tab (read/write) |
| `window.evtCurrentUserName` / `Pic` / `Initials` | Greeting (set in `init.js`, read in list) |
| `document.getElementById('notifBtn')` | Bell proxy (pageShell) |

### 5.2 Writes (list-owned global caches)

| Global | Set in | Consumers |
| --- | --- | --- |
| `window.evtAllEvents` | `loadEvents` | `renderEvents`, detail routing, manage refresh |
| `window.evtAllRsvps` | `loadEvents` | Cards, hero, detail |
| `window.evtAttendees` | `loadEvents` | Card avatar stacks |
| `window.evtAttendeeCounts` | `loadEvents` | Card “N going” labels |
| `window.evtActiveTab` | filters / restore | `renderEvents`, `_matchesLifecycle` |
| `window.evtSetVlift` / `window.evtIsVlift` | `_initVlift` | Vlift toggles (testing/URL) |

### 5.3 Runtime calls to other portal modules (no static import)

| Callee | Call sites | Purpose |
| --- | --- | --- |
| `window.evtNavigateToEvent` | Hero, cards, rail, picks, banner | Preferred SPA navigation (likely `utils.js`) |
| `window.evtOpenDetail` | Fallback if navigate missing | Detail open by id |
| `window.evtHandleRsvp` | Hero heart, context sheet, swipe | RSVP toggle ( `rsvp.js` ) |
| `window.evtLoadEvents` | PTR, `events:manage:updated` | Reload list after external edit |
| `#createEventBtn.click()` | Create tile, empty CTA, FAB | Delegates to **create** flow (`init.js` listener) |

**Manage:** No direct `EventsManage` import. **Indirect:** `document.addEventListener('events:manage:updated', …)` reloads list when manage sheet saves.

**Create:** No `EventsCreate` symbol in `list.js` — only DOM click delegation to `#createEventBtn`.

**Detail:** Navigation only via `evtNavigateToEvent` / `evtOpenDetail`; list does not import `detail.js` symbols.

### 5.4 `window.PortalEvents.list` namespace (Phase 3A discovery surface)

Assigned at EOF — mirrors closures for Phase 5 splitting:

| Key | Backing |
| --- | --- |
| `load`, `render`, `setupSearch`, `initFilterChips` | Public API |
| `renderHero`, `pickHero`, `renderSkeletons`, `renderCalendar`, `renderGoingRail`, `renderTopPicks`, `renderMiniCalendar`, `renderMyRsvps`, `renderStatsCard`, `renderBucket` | Sub-renderers |
| `matchesType`, `matchesCategory`, `matchesLifecycle`, `matchesDate` | Predicates |
| `initStickyHeader`, `initMobileFab` | UI init (partial — other inits not exported on namespace) |

Classic globals **also** assigned: `evtLoadEvents`, `evtRenderEvents`, `evtSetupSearch`, `evtInitFilterChips`, `evtRenderCard`, stubs `evtRenderFeatured`, `evtUpdateHeroStats`.

---

## 6. Inline Handler / Markup Dependency Notes

List uses **`addEventListener`** for almost all interactions — **not** inline `onclick="..."` in generated HTML.

### 6.1 `data-evt-*` attributes (generated markup → wired in JS)

| Attribute | Wired by | Action |
| --- | --- | --- |
| `data-evt-card` | `_wireCardClicks` | Open detail; intercept `data-evt-cat`, `data-evt-card-rsvp` |
| `data-evt-mini` | swipe + rail/top-picks listeners | Mini card nav |
| `data-evt-hero`, `data-evt-hero-cta`, `data-evt-hero-going`, `data-evt-hero-heart`, `data-evt-hero-details` | `_renderHero` listeners | Hero nav / RSVP |
| `data-evt-create-tile` | `_wireCardClicks` | Trigger `#createEventBtn` |
| `data-evt-bucket-toggle` | `_wireCardClicks` | E11 bucket expand |
| `data-evt-live` | `_renderLiveBanner` | Live event nav |
| `data-evt-myrsvp`, `data-evt-myrsvps-all` | `_renderMyRsvps` | Rail nav / switch to Going tab |
| `data-evt-stats-all` | `_renderStatsCard` | Switch to calendar view |
| `data-evt-cat` | inside card HTML (`EventsCard`) | Category filter from card |

### 6.2 External HTML dependencies (`portal/events.html`)

List assumes static shell elements exist: `#eventsListView`, `#evtPageHeader`, `#evtFilterStrip`, `#evtLifecycleSeg`, `#evtGroups`, `#evtHero`, `#evtGoingRail`, `#evtTopPicks`, `#evtLiveBanner`, `#evtCalendarMount`, `#emptyState`, `#createEventBtn`, search/filter IDs, optional right-rail mounts. **Changing HTML IDs requires coordinated list + smoke updates.**

### 6.3 `init.js` contract (must preserve on any split)

| Call from `init.js` | List export |
| --- | --- |
| `await evtLoadEvents()` | `loadEvents` |
| `evtSetupListeners()` → includes filter/search wiring | `setupSearch`, `initFilterChips` |
| `typeFilter` change → `evtRenderEvents()` | `renderEvents` |

---

## 7. Split Seam Candidates

### 7.1 Safer extraction candidates (lower coupling)

| Candidate module (proposed) | Functions / scope | Notes |
| --- | --- | --- |
| **Search + suggest** | `setupSearch`, `_renderSearchSuggest`, history helpers, `_hideSearchSuggest`, `_wireSuggestClicks` | Mostly self-contained; clear DOM IDs |
| **Right-rail widgets** | `_renderMiniCalendar`, `_renderMyRsvps`, `_renderStatsCard` | Mount-point isolated; re-call from `renderEvents` |
| **Stats / empty illustration** | `_renderStatsCard`, `_upgradeEmptyIllo`, `_renderEmptyCopy` | Low cross-deps |
| **Header bell proxy** | `_initHeaderBell`, `_wireHeaderBellBadge` | Odd but isolated; depends on pageShell `#notifBtn` |
| **ICS / share helpers** | `_downloadIcs`, `_copyToClipboard`, `_eventShareUrl`, `_toast` | Pure utilities |

### 7.2 Medium risk (needs predicate + render contract frozen)

| Candidate | Functions | Risk |
| --- | --- | --- |
| **Filter state module** | `_matches*`, `_persistState`, `_restoreState`, `_activeType/Category/Date/View`, `initFilterChips`, `_initDateMenu` | Shared mutable module state; many `renderEvents` call sites |
| **Calendar mode** | `_renderCalendar`, `_wireCalendarClicks`, day modal, `_groupEventsByDay` | Branches early in `renderEvents`; shares filters |
| **Hero + picks + banner + rail** | `_renderHero`, `_renderGoingRail`, `_renderTopPicks`, `_renderLiveBanner` | Shared `eventsById`, hero exclusion logic, vlift gates |
| **Bucket renderer** | `_renderBucket` + E11 toggle | Depends on `Card.render`, create tile, `_wireCardClicks` |

### 7.3 Risky — defer until dedicated smoke + live QA per slice

| Area | Why risky |
| --- | --- |
| **`loadEvents`** | Single source of global caches; draft query; attendee aggregation contract (§12.1); all downstream pages depend on shape |
| **`renderEvents`** | Central orchestrator; search vs calendar vs bucket modes; ordering rules |
| **`_wireCardClicks`** | All navigation + filter interception + create delegation |
| **Swipe + context sheet** | Touch gestures, RSVP cancel, hide list, share — cross-cuts RSVP + detail |
| **Vlift + mobile strip + PTR + FAB** | Layout side effects; `body` class; breakpoint listeners |

**Recommendation:** Any first **list** implementation PR should **not** move `loadEvents` or `renderEvents` until sub-renderers have their own smokes and a pinned orchestrator contract test.

---

## 8. Smoke / Test Coverage Map

### 8.1 Existing coverage (indirect or direct)

| Smoke / test | What it covers for `list.js` |
| --- | --- |
| **`test/_smoke-phase3a-list-bridge.js`** | **Primary** — IIFE, globals, `PortalEvents.list` keys, internal fn presence, loader includes `list.js` |
| **`test/_smoke-phase5l-readiness.js`** | Monolith file exists + line count note |
| **`test/_smoke-phase1-bridge.js`** | `init.js` calls `evtLoadEvents` / filter wiring (list must export) |
| **`test/_smoke-phase3b-detail-bridge.js`** | List bridge regression section |
| **`test/_smoke-phase3d-create-bridge.js`** | Create bridge; list create tile → `#createEventBtn` not asserted deeply |
| **`test/_smoke-phase3c-manage-bridge.js`** | Manage; `events:manage:updated` reload path not deeply asserted |
| **`test/_smoke-phase4f-external-globals.js`** | Lists `list.js` in portal inventory |
| **Feature smokes** (`_smoke-f1`, `f3`, `f4`, `f7`, `f8`, `f10`–`f14`, `e*`, `d*`) | Target specific list features (vlift, filters, calendar, etc.) — run selectively |
| **Production live QA (`044`)** | List shell, hero, buckets, list↔detail nav — **18/18** on production URL |

### 8.2 Gaps recommended before refactor PRs

| Gap | Suggested addition |
| --- | --- |
| **Loader-order + `PortalEvents.list.render` callable** | Static smoke asserting namespace methods exist after chain parse (optional extend 3A) |
| **`loadEvents` global shape** | Smoke or unit-style fixture: mock Supabase → `evtAllEvents` / attendee maps populated |
| **Search mode** | Assert `_matches*` + flat sort behavior or golden HTML fragment |
| **Calendar mode** | Month nav + `_activeView === 'calendar'` branch |
| **Bucket E11 expand** | Toggle slug + re-render |
| **`events:manage:updated`** | Listener triggers reload (could be light integration test) |
| **Post-split per-file smokes** | One smoke per extracted file before moving orchestrator |

---

## 9. Risk Map

### 9.1 High risk

| Area | Impact if broken |
| --- | --- |
| **`loadEvents` + global caches** | Empty list, wrong RSVPs, broken detail/manage/create |
| **`renderEvents` orchestration** | Wrong mode (search/calendar/bucket); hero/rail duplication |
| **`_wireCardClicks` / navigation** | Cards open wrong event or full page reload |
| **`H.groupByBucket` contract** | Bucket labels/order wrong |
| **`init.js` boot order** | List inits before DOM ready — mitigated by `_onReady` |

### 9.2 Medium risk

| Area | Impact |
| --- | --- |
| Filter persistence (`sessionStorage`) | Tab/type/category lost on refresh |
| Vlift + mobile DOM moves | Search/filter unreachable on mobile |
| Hero selection + pinned LLC sort | Wrong featured event |
| Attendee query cap (5 avatars) | UI wrong but bounded |
| Context sheet / swipe | Edge UX regressions |

### 9.3 Low risk (extraction-friendly)

| Area | Notes |
| --- | --- |
| Search suggest / history | Isolated |
| Right-rail mini cal / my RSVPs / stats | Remount on each `renderEvents` |
| Empty-state copy variants | Copy-only |
| Header count string | Display-only |

---

## 10. Recommended Implementation Phases (audit-only — not approved)

Proposed **list-only** sequence for future **5M.2.x** work after audit review. **Do not implement** without a written approval doc per slice.

| Phase (proposed) | Scope | Preconditions |
| --- | --- | --- |
| **5M.2.0** | Audit sign-off on this inventory + optional `048` create / `049` manage inventories | This doc reviewed |
| **5M.2.1** | Extract **search + suggest** module; no orchestrator move | New smoke; 3A still green |
| **5M.2.2** | Extract **right-rail** trio (mini cal, my RSVPs, stats) | Mount ID contract frozen |
| **5M.2.3** | Extract **filter predicates + persistence** | Predicate unit tests |
| **5M.2.4** | Extract **calendar mode** submodule | Calendar smoke + live QA subset |
| **5M.2.5** | Extract **hero + rails + banner** | Live QA hero/rail/top picks |
| **5M.2.6** | Thin **`renderEvents`** + optional **`loadEvents` split** | Full 18-point live QA + Phase 5 gate |

**Order note:** `046` / `025` still favor auditing **create** before large list splits; list inventory can proceed in parallel with **`048_create_surface_inventory.md`** (recommended **next audit doc**).

---

## 11. No-Go Reminders

- Do **not** combine **list** refactors with **manage** or **create** in one PR.
- Do **not** combine with **5L.4** compat bootstrap.
- Do **not** combine with **CSS cleanup**.
- Do **not** modify **production** `portal/events.html` or loader chain without a new approval gate.
- Do **not** treat this inventory as **implementation approval**.

---

## 12. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/047_list_surface_inventory.md
git add docs/audit/pages/events/047_list_surface_inventory.md
git diff --staged --name-only
git commit -m "Add Events list surface inventory"
git push
```

---

## Appendix — Related files (not in scope to edit)

| File | Relationship |
| --- | --- |
| `js/components/events/card.js` | Card HTML for list grid |
| `js/components/events/helpers.js` | `groupByBucket`, formatting |
| `js/portal/events/init.js` | Boots list APIs |
| `js/portal/events/utils.js` | `evtNavigateToEvent`, routing |
| `js/portal/events/rsvp.js` | `evtHandleRsvp` |
| `portal/events.html` | List shell DOM |
