# Phase 5M.2 — List Track Closeout & Manage Refactor Plan

**Document:** `066_phase_5m2_list_closeout_and_manage_plan.md`  
**Path:** `docs/audit/pages/events/066_phase_5m2_list_closeout_and_manage_plan.md`  
**Date:** 2026-05-21  
**Status:** **Closeout / planning** — documentation only  
**Prior plan:** `065_phase_5m_create_closeout_and_list_plan.md` (`52ce885`)  
**List inventory:** `047_list_surface_inventory.md`  
**Manage inventory:** `049_manage_surface_inventory.md`

---

## 1. List Track Closeout

List modularization **5M.2A–5M.2C** is **complete**. `list.js` is a thinner orchestrator (~1,430 lines) around seven classic modules under `js/portal/events/list/`.

| Bundle | Commit | Outcome |
| --- | --- | --- |
| **5M.2A** search + right rail | `e42c61f` | `search.js`, `right-rail.js`, `header.js` |
| **5M.2B** filters + calendar | `0eb279e` | `filters.js`, `calendar.js` |
| **5M.2C** hero + rails + buckets | `38b9158` | `hero-rails.js`, `buckets.js` (+ restored `attendeeCluster` in hero-rails) |

### Extracted modules (production chain)

```text
raffle-model.js
  → list/search.js → list/right-rail.js → list/header.js
  → list/filters.js → list/calendar.js
  → list/hero-rails.js → list/buckets.js
  → list.js
```

| Property | Value |
| --- | --- |
| **Middle chain count** | **45** scripts |
| **`portal/events.html`** | **Unchanged** (3-tag loader) |
| **Loader updates** | `classic-chain-loader.js` only |

### Still in `list.js` (orchestrator)

| Area | Notes |
| --- | --- |
| **`loadEvents`** | Supabase load, RSVP/attendee scoped queries, cache writes |
| **`renderEvents`** | Calendar/search/normal modes; delegates to list modules |
| **`_wireCardClicks`** | Create tile, bucket expand, card → detail, category filter |
| **Mobile / vlift** | `_initStickyHeader`, `_initMobileFab`, `_initMobileFilterStrip`, `_initPullToRefresh`, `_initVlift` (not split — deemed higher coupling) |
| **Gestures / context** | Swipe sheet, context menu, hidden-event session set |
| **View toggle** | `_initViewToggle`, `_applyViewChrome` |
| **Empty state / skeletons** | `_renderEmptyCopy`, `renderSkeletons` |

### Validation

| Gate | Result |
| --- | --- |
| **`node --check`** on touched list modules + `list.js` | Pass (per bundle commits) |
| **Regression smokes** | Phase 3A list bridge, 5L readiness/rehearsal, Phase 1/3B–3D/5H–5J, team, raffle parity — **pass** after 5M.2C |
| **Manual browser QA** | **Not run** in agent session — recommend staging pass: list load, search, filters, calendar, hero CTA/heart, going rail, top picks, buckets, create tile, list → detail → back |

**Public bridges preserved:** `window.evtLoadEvents`, `window.evtRenderEvents`, `window.evtSetupSearch`, `window.evtInitFilterChips`, `window.PortalEvents.list.*`.

**List track: closed for structural refactor.**

---

## 2. Manage Bundled Plan (5M.3)

**Target:** `js/portal/events/manage/sheet.js` (~2,140 lines, single IIFE). **Pattern:** same as List/Create — classic scripts under `js/portal/events/manage/`, **no** `portal/events.html` changes; update `classic-chain-loader.js` only when adding entries.

**Inventory:** `049_manage_surface_inventory.md` — 8 tabs, heavy raffle block, danger/participation edges, inline `onclick` on featured toggle.

### Bundle 5M.3A — Manage shell + overview

**Goal:** Extract sheet lifecycle and overview tab without touching destructive or lazy-heavy tabs first.

| Area | Representative symbols (`049` §5.1–5.2) |
| --- | --- |
| **Shell** | `_ensureMounted`, `open`, `close`, `_loadEventData`, `_renderHeader`, `_renderTabs`, `_renderContent`, `_renderTab`, `_renderTabAsync`, `_refreshEventManager`, `_notifyParent`, `_emptyHtml` |
| **Overview** | `_overviewHtml`, `_wireOverview`, `_saveEventCopy`, `_ensureQrCode`, `_renderOverviewQrs` |
| **Bridge** | Keep `window.EventsManage`, `window.PortalEvents.manage`, `detail.register` on thin facade |

**Risk:** Medium — tab routing and async tab races; overview copy save + featured toggle + scanner handoff.

---

### Bundle 5M.3B — Images, docs, RSVPs, money, competition

**Goal:** Extract data-heavy tabs that are mostly CRUD or read-only dashboards.

| Area | Representative symbols |
| --- | --- |
| **Images** | `_imgDropZone`, `_imagesHtml`, `_wireImages` (storage upload) |
| **RSVPs** | `_rsvpsHtml`, `_wireRsvps`, `_removeParticipationPerson` |
| **Money** | `_loadMoney`, `_moneyHtml`, `_wireMoney` (read-only) |
| **Docs** | `_loadDocs`, `_docsHtml`, `_wireDocs`, `_uploadDocFromManage`, helpers |
| **Competition** | `_loadComp`, `_compHtml`, `_wireComp` (read-only) |

**Risk:** Medium — participation edge on RSVP remove; doc storage paths; image upload parity.

---

### Bundle 5M.3C — Raffle, danger, participation, onclick cleanup

**Goal:** Extract highest-risk surfaces last; reduce inline handlers where safe.

| Area | Representative symbols |
| --- | --- |
| **Raffle** | `_loadRaffle` … `_assignWinnerChoice`, `refreshRaffle`, `EventsRaffleModel` / `evtOpenRaffleDraw` integration |
| **Danger** | `_dangerHtml`, `_wireDanger`, `_runDangerAction`, `_resetParticipation`, `_getParticipationResetCounts` |
| **Cleanup** | `window._emToggleFeatured` → delegated listener; audit remaining inline `onclick` in manage DOM strings |

**Risk:** **High** — cancel/complete/delete/reset participation; raffle draw and winner assignment. **Extra caution** on destructive actions and confirm copy.

---

## 3. Boundaries

| Rule | Detail |
| --- | --- |
| **`portal/events.html`** | **No changes** |
| **5L.4 compat bootstrap** | **Not started** |
| **Create / List runtime** | **No drive-by changes** except tiny compatibility fix if unavoidable (avoid by design) |
| **Do not combine** Manage bundles with Create path work or List cleanup in the same PR |
| **CSS** | **Out of scope** — no `css/**` in manage bundles |
| **Destructive actions** | Danger + participation reset + delete — test on staging; preserve confirm UX |
| **Doc cadence** | One plan/closeout per major track; no per-slice approval/completion docs |

---

## 4. Recommended Next Implementation

**Start with Bundle 5M.3A — Manage shell + overview.**

| Reason | Detail |
| --- | --- |
| **Foundation** | `open` / `close` / tab router must stay stable before splitting lazy tabs |
| **Lower blast radius** | Overview is eager-loaded; no raffle/danger edges in first slice |
| **Smoke** | Extend `test/_smoke-phase3c-manage-bridge.js` per bundle; full regression set after each commit |
| **Loader** | Insert `manage/*.js` before `manage/sheet.js` (or replace sections incrementally) — document order in first manage commit |

**After 5M.3A:** 5M.3B → 5M.3C.

### Per-bundle checklist (when implementing)

- Classic IIFE modules; namespaces e.g. `PortalEventsManageShell`, `PortalEventsManageOverview`, …
- `node --check` on touched files
- Phase 3C manage bridge + regression smokes
- Stage only bundle-related `js/**` + loader + targeted tests — no `css/**`, `portal/events.html`, md noise

---

## 5. Reference — Loader Context

```text
Current middle chain (excerpt):
  … → list/buckets.js → list.js → team/* → detail/* → …
  → create/* → documents.js → map.js → scanner.js → raffle.js
  → competition.js → scrapbook.js → manage/sheet.js?v=112
```

Manage modules will load **before** `manage/sheet.js` (dependencies: `state`, `utils`, `raffle-model`, `EventsRaffleModel` consumers already in chain).

---

## Appendix — Quick reference

| Question | Answer |
| --- | --- |
| Is List structurally done? | **Yes** (5M.2A–5M.2C) |
| What's next? | **5M.3A** Manage shell + overview |
| How many manage bundles? | **3** (A → B → C) |
| HTML changes? | **No** |
| Manual list QA? | **Recommended** — not run in closeout session |
