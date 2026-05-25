# Phase 5M — Create Track Closeout & List Refactor Plan

**Document:** `065_phase_5m_create_closeout_and_list_plan.md`  
**Path:** `docs/audit/pages/events/065_phase_5m_create_closeout_and_list_plan.md`  
**Date:** 2026-05-21  
**Status:** **Planning / closeout** — no implementation in this commit  
**Create decision:** `064_phase_5m1_6_create_path_decision_approval.md` (`e9e9d29`) — **Option D**  
**List inventory:** `047_list_surface_inventory.md` (`59fbe7e`)  
**Risk map:** `050_list_manage_create_risk_smoke_map.md`

---

## 1. Create Track Closeout

Structural modularization **5M.1.1–5M.1.5** is **complete**. Path unification **5M.1.6** is **deferred** (no runtime work).

| Phase | Commit (impl) | Outcome |
| --- | --- | --- |
| **5M.1.1** geocode | `0ee3794` | `create/geocode.js` → `window.evtGeocodeAddress` |
| **5M.1.2** sheet steps | `c0ab1da` | Four `create/step-*.js` → `EventsCreateSteps` |
| **5M.1.3** raffle builder | `d4bfe02` | `create/raffle-builder.js` → `EventsCreateRaffleBuilder` |
| **5M.1.4** submit/storage | `ecced37` | `create/submit.js` → `EventsCreateSubmit` |
| **5M.1.5** legacy split | `d76113d` | `legacy-*.js` + thin `create.js` facade |
| **5M.1.6** path decision | `e9e9d29` (doc) | **Option D** — defer unification; dual paths unchanged |

### Current create behavior (preserved)

| Path | Entry | Event types | Modules |
| --- | --- | --- | --- |
| **A — EventsCreate sheet (default)** | `#createEventBtn` → `EventsCreate.open()` | Member (M4a) | `sheet`, `step-*`, `raffle-builder`, `submit`, `geocode` |
| **B — Legacy `#createModal`** | Fallback if sheet unavailable; LLC/competition | Member, LLC, competition | `legacy-costs`, `legacy-location`, `legacy-preview`, `legacy-submit` |

| Property | Value |
| --- | --- |
| **`#createModal`** | **Retained** — not removed |
| **LLC / competition** | **Unchanged** — legacy modal only |
| **`portal/events.html`** | **Unchanged** (3-tag loader model) |
| **Middle chain count** | **38** scripts |
| **Post-create** | Sheet: `events:created` + `init.js` reload; legacy: `evtLoadEvents` + navigate (unchanged divergence) |

**Create track: closed for structural refactor.** Further create work is **product-gated** (sheet LLC/competition, modal deprecation) — not in the current List bundle plan.

---

## 2. New Documentation Cadence

Going forward on the Events page refactor:

| Old pattern | New pattern |
| --- | --- |
| Approval + completion doc per tiny slice (5M.1.x) | **Bundled implementation phases** with one plan doc and one summary when a bundle lands |
| Many sequential `06x_approval` / `06x_completion` files | **This doc** closes Create; **one doc per major bundle** (plan or closeout) |
| Heavy gate overhead | **Lightweight planning**; trust implementation to stay in approved bundle scope and report clearly in commit/PR notes |

**When to write a doc:**

- Closing a **major track** (e.g. Create closeout — this file).
- **Bundled phase plan** before a multi-slice implementation stretch (List 5M.2A–C below).
- **Final bundle summary** after a bundle is done and smokes are green (optional single `066+` style file — only if useful).

**When not to write a doc:**

- Every extraction PR, loader +1 script, or smoke count bump.
- Doc-only rehash of decisions already recorded in git history.

---

## 3. Bundled List Refactor Plan (5M.2)

**Target:** `js/portal/events/list.js` (~2,760 lines, single IIFE). **Pattern:** classic scripts under `js/portal/events/list/` (or `list/*.js`), same as create — **no** `portal/events.html` changes; update `classic-chain-loader.js` only when adding chain entries.

**Planning approved** for three bundles (implementation order fixed below).

### Bundle 5M.2A — Search + right rail

**Goal:** Extract lower-coupling UI slices before touching `loadEvents` / `renderEvents` core.

| Area | Representative symbols (`047`) | DOM / notes |
| --- | --- | --- |
| **Search** | `setupSearch`, `_renderSearchSuggest`, search history helpers | `#evtSearchInput`, `#evtSearchExpand`, `#evtSearchSuggest` |
| **Mini calendar** | `_renderMiniCalendar`, `_activeDay` | `#evtMiniCalMount` |
| **My RSVPs** | `_renderMyRsvps` | `#evtMyRsvpsMount` |
| **Stats card** | `_renderStatsCard` | `#evtStatsMount` |
| **Header helpers** | `_renderHeaderCount`, `_renderHeaderGreeting`, `_initHeaderBell` | Low-risk chrome if isolated cleanly |

**Leaves in `list.js` for later bundles:** `loadEvents`, `renderEvents`, filters, hero, buckets, full calendar, vlift init.

**Risk:** Low–medium — mostly render/bind; search mode still orchestrated by `renderEvents` until 5M.2C.

---

### Bundle 5M.2B — Filters + calendar

**Goal:** Extract filter state/matching and full calendar mode.

| Area | Representative symbols | DOM / notes |
| --- | --- | --- |
| **Lifecycle / type / category / date** | `_switchLifecycleTab`, `_matchesType`, `_matchesCategory`, `_matchesDate`, `_initDateMenu`, `initFilterChips` (filter portions) | `#evtLifecycleSeg`, `#evtTypeMenu`, `#evtTypeChips`, `#evtDateMenu` |
| **Persistence** | `_persistState`, `_restoreState` | `sessionStorage` `evt_list_state_v1`, `evt_search_hist_v1` |
| **Full calendar** | `_renderCalendar`, `_openDayModal`, `_closeDayModal`, `_groupEventsByDay` | `#evtCalendarMount`, `#evtCalGrid`, day modal |

**Risk:** Medium — filter matching drives what `renderEvents` shows; persistence must restore identically.

---

### Bundle 5M.2C — Hero / rails / buckets + orchestrator cleanup

**Goal:** Extract remaining list render surfaces; thin `list.js` to orchestration + `loadEvents` + slim `renderEvents`.

| Area | Representative symbols | DOM / notes |
| --- | --- | --- |
| **Hero** | `_pickHero`, `_renderHero`, `_heroBg`, `_attendeeCluster` | `#evtHero` |
| **Going rail** | `_renderGoingRail`, `_miniCard` | `#evtGoingRail` |
| **Top picks** | `_renderTopPicks` | `#evtTopPicks` |
| **Live banner** | `_renderLiveBanner` | `#evtLiveBanner` |
| **Buckets** | `_renderBucket`, bucket helpers (`H.groupByBucket`) | `#evtGroups` |
| **Orchestrator** | `loadEvents`, `renderEvents` (reduced), `renderSkeletons`, empty states, vlift/mobile if not moved earlier | Central list API |

**Risk:** Medium–high — `renderEvents` is the integration hub; do **only after** 5M.2A and 5M.2B are stable and smokes green.

**Preserve:** `window.evtLoadEvents`, `window.evtRenderEvents`, `window.PortalEvents.list` bridge (`test/_smoke-phase3a-list-bridge.js`).

---

## 4. Boundaries

| Rule | Detail |
| --- | --- |
| **Create runtime** | Do **not** modify except a **tiny** compatibility fix if a list bundle has a hard dependency (avoid by design). |
| **Manage runtime** | **Out of scope** for 5M.2 bundles (`manage/sheet.js` untouched). |
| **`portal/events.html`** | **No changes** — list modules inject into existing IDs only. |
| **5L.4 compat bootstrap** | **Not started**. |
| **CSS cleanup** | **Out of scope** — no drive-by `css/**` in list bundles. |
| **Bundle scope** | One bundle per implementation stretch; no hero + filters + search in a single PR unless explicitly replanned. |
| **`#createModal`** | **Do not remove**; create path decision unchanged. |

---

## 5. Recommended Next Implementation

**Start with Bundle 5M.2A — Search + right rail.**

| Reason | Detail |
| --- | --- |
| **Lower risk** | Does not split `loadEvents` or main `renderEvents` branching first |
| **Clear DOM ownership** | Right-rail mounts and search panel are bounded surfaces (`047` §3) |
| **Smoke safety** | Phase 3A list bridge can be extended incrementally; full gate smokes after each bundle |
| **User-visible stability** | Filters, hero, and bucket list behavior unchanged until later bundles |

**After 5M.2A:** 5M.2B → 5M.2C. Optional single summary doc when all three bundles complete (not required per bundle).

### Per-bundle implementation checklist (runtime, when started)

- Classic IIFE modules, no native `import`/`export`.
- Update `classic-chain-loader.js` order (list modules after `list.js` or replace sections per chosen pattern — document in first bundle commit message).
- Run `node --check` on touched files.
- Run `node test/_smoke-phase3a-list-bridge.js` + Phase 1/3B/3D/5L smokes as regression set.
- `git status` — no staged `css/**`, `portal/events.html`, or md noise.

---

## 6. Reference — Loader Context

```text
Current middle chain (excerpt):
  constants.js → state.js → utils.js → raffle-model.js
  → list.js → team/* → detail/* → …
  → create/geocode → legacy-* → create.js → step-* → raffle-builder → submit → sheet
  → … → manage/sheet.js
```

List modules will insert **after** dependencies (`state`, `utils`, `raffle-model`, `constants`) and **before** or **around** `list.js` per bundle — exact order decided in **5M.2A** implementation (not in this doc).

---

## 7. Deferred / Out of Scope

| Item | Notes |
| --- | --- |
| Create path unification (5M.1.6 impl) | Deferred by `e9e9d29` |
| Manage refactor (5M.3) | After List bundles |
| 5L.4 | Not started |
| Manual full create QA | Still recommended on staging |
| List vlift / gestures / PTR | Can stay in orchestrator until 5M.2C or a follow-on bundle if too coupled |

---

## Appendix — Quick reference

| Question | Answer |
| --- | --- |
| Is Create structurally done? | **Yes** (5M.1.1–5M.1.5; 5M.1.6 deferred) |
| What's next? | **5M.2A** Search + right rail |
| How many list bundles? | **3** (A → B → C) |
| HTML changes? | **No** |
| New doc cadence? | **Bundled** — not per tiny slice |
