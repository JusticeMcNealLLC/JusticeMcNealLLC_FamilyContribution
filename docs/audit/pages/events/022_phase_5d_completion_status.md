# Events Refactor — Phase 5D Completion Status

**Document:** `022_phase_5d_completion_status.md`  
**Date:** 2026-05-21  
**Status:** **Complete** — 5D.1–5D.3 implemented, static smokes green, live-verified on production  
**Baseline plan:** `021_phase_5d_detail_split_plan.md`  
**Scope:** Portal Events detail micro-extractions only (`js/portal/events/detail/*` classic scripts)  
**Out of scope:** Phase 5E compat wiring, Phase 5F module entry, main `evtOpenDetail` render split, `js/events/**`, `admin/**`, `supabase/**` (no new migrations in 5D)

---

## 1. Completion Summary

Phase **5D** safe detail extractions are **complete** and **live-verified** on `https://justicemcneal.com`.

| Slice | File | Commit | Status |
| --- | --- | --- | --- |
| **5D.1** | `js/portal/events/detail/presentation.js` | `e2dc6f9` | Shipped + live QA pass |
| **5D.2** | `js/portal/events/detail/raffle-render.js` | `3993b54` | Shipped + live QA pass |
| **5D.3** | `js/portal/events/detail/map-overlay.js` | `dd1a5d1` | Shipped + live QA pass |

All three modules remain **classic scripts** (IIFE, `'use strict'`, no `import`/`export`). Every extracted helper keeps its legacy **`window.evt*`** global and a matching **`PortalEvents.detail.*`** namespace entry; `detail.js` assigns **bridges only** (no reimplemented bodies).

**Not done in Phase 5D (by design):**

- Main **`async function evtOpenDetail`** render/data-fetch pipeline (still in `detail.js`)
- Inline Leaflet init for `#detailEventMap` / `#detailEventMapMobile` (post-render `setTimeout` in `detail.js`)
- Shared `_ed*` fragment helpers (`_edMetaRow`, `_edCard`, etc.) — still in `detail.js`
- Phase **5E** / **5F**

---

## 2. Implemented Extractions

### 5D.1 — `detail/presentation.js`

| Global | Namespace | Role |
| --- | --- | --- |
| `evtMiniMarkdown` | `PortalEvents.detail.presentation` | Inline markdown → HTML (escape, links, bold, italic) |
| `evtOpenLightbox` | ↑ | Banner full-screen lightbox |
| `evtInitSectionAnimations` | ↑ | IntersectionObserver fade-in on `.ed-card` |
| `evtStartLiveCountdown` | ↑ | Hero `.evt-status-badge` live countdown (`_evtCountdownInterval`) |

`detail.js` bridges: `detail.miniMarkdown`, `detail.openLightbox`, `detail.initSectionAnimations`, `detail.startLiveCountdown` → `window.evt*`.

Call sites inside `evtOpenDetail` use `window.evtMiniMarkdown`, `window.evtInitSectionAnimations`, etc., where needed for IIFE scope.

---

### 5D.2 — `detail/raffle-render.js`

| Global | Notes |
| --- | --- |
| `evtDetailRaffleConfig` | Normalize raffle config from event record |
| `evtDetailRaffleCategories` | Category list for detail rail |
| `evtDetailRaffleItems` | Items per category |
| `evtDetailRaffleWinnerCount` | Winner count helper |
| `evtDetailDrawModeLabel` | Draw mode label (detail copy) |
| `evtDrawModeLabel` | Alias (distinct from `raffle.js` draw-mode helper) |
| `evtDetailPrizeMedia` | Prize media HTML (internal; used by prizes rail) |
| `evtDetailRafflePrizesHtml` | Prize rail HTML |
| `evtDetailRaffleWinnersHtml` | Winners rail HTML |
| `evtRaffleLockedDesktopHtml` | Desktop locked raffle block + Team Tools hint (`onclick="evtOpenTeamToolsPanel(...)"`) |

Namespace: `PortalEvents.detail.raffleRender`.

Private `_raffleSectionHead` duplicated locally for winners section (main `_edSectionHead` remains in `detail.js`).

`detail.js` bridges: `detail.raffleConfig` … `detail.raffleLockedDesktopHtml` → `window.evt*`.

RSVP/entry handlers (`evtHandleRaffleEntry`, `evtHandleFreeRaffleEntry`) **remain** in `detail.js` template strings.

---

### 5D.3 — `detail/map-overlay.js`

| Global | Role |
| --- | --- |
| `evtOpenFullscreenMap` | Open `#fullscreenMapOverlay`, init Leaflet on `#fullscreenMapContainer`, set directions link |
| `evtRecenterFullscreenMap` | Re-center fullscreen map to stored coords |
| `evtCloseFullscreenMap` | Hide overlay, destroy map instance, restore `body` scroll |

Module state: `_fullscreenMap`, `_fullscreenMapCoords` (scoped in `map-overlay.js`).

Namespace: `PortalEvents.detail.mapOverlay` (`open`, `recenter`, `close`).

`detail.js` bridges: `detail.openFullscreenMap`, `detail.recenterFullscreenMap`, `detail.closeFullscreenMap` → `window.evt*`.

Inline map click in `evtOpenDetail` calls `window.evtOpenFullscreenMap(...)`. Overlay markup stays in `portal/events.html` (`#fullscreenMapOverlay`, `#fullscreenMapContainer`, `#fullscreenMapDirections`).

---

## 3. Live QA Results

**Environment:** Production — `https://justicemcneal.com`  
**Test event:** `yolanda-adam-and-justin-birthday-celebration-mov3ceo1` (has `location_lat` / `location_lng`)  
**Actor:** Event coordinator (`.env.local` E2E credentials; not printed in logs)

### Asset checks

| Asset | HTTP | Notes |
| --- | --- | --- |
| `detail/presentation.js` | **200** | Loaded in HTML after `team/tools.js`, before `detail.js` |
| `detail/raffle-render.js` | **200** | Order: after `presentation.js`, before `map-overlay.js` |
| `detail/map-overlay.js` | **200** | ~2.8 KB; contains all three fullscreen helpers + namespace |
| `detail.js` | **200** | Map helpers **not** redefined; bridges only |

### Runtime behavior

| Area | Result |
| --- | --- |
| **5D.1 — Presentation** | Description markdown renders; banner lightbox path intact; section animations run post-render; countdown path wired (badge-dependent) |
| **5D.2 — Raffle render** | Raffle section visible; prize rail renders (14 tiles on test event); winners rail N/A when no drawn winners |
| **5D.3 — Map overlay** | Inline map renders (Leaflet in `#detailEventMap`); click opens fullscreen; recenter + close work; directions → Google Maps URL with encoded address |
| **Team Tools** | Panel opens from host CTA / Team action |
| **Team Chat** | Opens from Team Tools; input/thread visible |
| **RSVP / Raffle parity** | No regression vs parity smokes; locked desktop raffle UI path unchanged in extracted module |

### Console / network

- **No** console errors or `pageerror` during successful coordinator pass.
- **No** failed fetches for `detail/presentation.js`, `detail/raffle-render.js`, or `detail/map-overlay.js`.

**Note:** Desktop inline map sits below the fold; manual scroll may be required before click (expected UX, not a 5D.3 defect).

### Static validation (local, post-`dd1a5d1`)

| Command | Result |
| --- | --- |
| `node test/_smoke-phase1-bridge.js` | **28/28 pass** |
| `node test/_smoke-phase3b-detail-bridge.js` | **141/141 pass** (includes 5D.1–5D.3 bridge + HTML order checks) |
| `node test/_smoke-event-team-tools-ui.js` | **All pass** |
| `node test/_smoke-event-team-chat-ui.js` | **All pass** |
| `node test/_smoke-portal-event-raffle-rsvp-parity.js` | **All pass** |

---

## 4. Current Script Order

Portal Events **detail slice** (classic `<script src="...">` tags in `portal/events.html`):

```text
../js/portal/events/team/chat.js
../js/portal/events/team/tools.js
../js/portal/events/detail/presentation.js
../js/portal/events/detail/raffle-render.js
../js/portal/events/detail/map-overlay.js
../js/portal/events/detail.js
```

(Followed by other portal Events modules — `comments.js`, `rsvp.js`, … — then **`init.js` last**.)

### Invariants confirmed (live + smokes)

| Invariant | Status |
| --- | --- |
| No `type="module"` on portal Events scripts | **Yes** — Phase 5F deferred |
| `init.js` remains last among `js/portal/events/*` | **Yes** |
| `portal/events.html` remains classic-script based | **Yes** |
| `index.js` does not call `initEventsPage()` directly | **Yes** (Phase 1 guard intact) |

---

## 5. Current `detail.js` Size / Status

| Metric | Value |
| --- | --- |
| **Lines (current)** | **~1,147** (`detail.js` on `master` after `dd1a5d1`) |
| **Lines (pre–5D baseline in audit)** | ~1,338 (after 5B/5C, before 5D.1) |
| **Reduction** | ~190 lines moved to `detail/*` |

**Still in `detail.js`:**

- Namespace bootstrap, `detail.register` / `detail.get`
- `_edMetaRow`, `_edPill`, `_edCard`, `_edNotice`, `_edSectionHead`
- **`async function evtOpenDetail`** — full render template, Supabase fetches, permissions, RSVP/raffle section assembly, post-render hooks
- Deferred inline map init (`setTimeout` → `L.map` on `#detailEventMap` / `#detailEventMapMobile`)
- Hero collapse **no-ops** (`evtInitHeroCollapse`, `evtCleanupHeroCollapse`)
- Public exports and all `detail.*` bridges to extracted modules + team scripts

---

## 6. Recommended Next Step

### Preferred recommendation

**Pause before splitting the main `evtOpenDetail` render function.** Phase 5D achieved the planned safe extractions; further detail work should be a deliberate, separately audited effort. **Do not start Phase 5F** (single ES module entry) yet.

### Options (pick one when resuming Events refactor)

| Option | Description | Risk |
| --- | --- | --- |
| **A** | **Stop Phase 5 here** and move to another page/feature | Lowest |
| **B** | Continue with lower-risk **`detail/fragments.js`** (`_ed*` HTML composers shared by render + future splits) | Low–medium |
| **C** | Plan **`evtOpenDetail()` render split** as its own micro-audit (subsection boundaries in `021` §1) | High — separate PR gate |
| **D** | **Phase 5E** — compat/export wiring only (`compat/*` mirrors, no behavior change) | Low |

**Suggested default:** **Option A** or **Option B** if more Events cleanup is desired soon; **Option C** only after explicit audit + smoke expansion.

---

## 7. Known Follow-ups

| Item | Priority | Notes |
| --- | --- | --- |
| Extend `_qa-event-team-chat-live.js` deploy checks | Optional | Assert `presentation.js`, `raffle-render.js`, `map-overlay.js` on live HTML (asset fetch already validates in ad-hoc QA) |
| Extract `_ed*` fragment helpers → `detail/fragments.js` | Optional | Reduces duplication with `raffle-render.js` private section head |
| Split main `evtOpenDetail` render | Deferred | High blast radius; inline `onclick` and Supabase block must stay coordinated |
| Phase **5E** compat/export wiring | Deferred | No runtime behavior change |
| Phase **5F** module entry | **Not started** | Requires full classic-global inventory + single entry script |
| `_smoke-events-009-raffle-model.js` | Low | May still reference pre-5D paths in `detail.js`; run before relying on it |
| Public events (`js/events/**`) | Out of scope | Separate surface from portal detail |
| Admin dashboard Events | Out of scope | Not part of portal Phase 5 |

---

## 8. Commit Reference

| Phase | Commit | Message |
| --- | --- | --- |
| 5D audit plan | `4968583` | Phase 5D detail split plan (doc only) |
| 5D.1 | `e2dc6f9` | Extract Event detail presentation helpers |
| 5D.2 | `3993b54` | Extract Event detail raffle render helpers |
| 5D.3 | `dd1a5d1` | Extract Event detail fullscreen map overlay helpers |

---

## 9. Sign-off

| Gate | Status |
| --- | --- |
| 5D.1–5D.3 implemented on `master` | **Yes** |
| Classic scripts + legacy globals preserved | **Yes** |
| Static smokes (Phase 1, 3B, team, raffle parity) | **Yes** |
| Live QA (production, coordinator event) | **Yes** |
| Phase 5E / 5F / main render split | **Not started** (intentional) |

**Phase 5D: COMPLETE.**
