# Events Refactor — Phase 5E Export Wiring Plan

**Document:** `023_phase_5e_export_wiring_plan.md`  
**Date:** 2026-05-21  
**Status:** Audit / planning — **no runtime changes in this step**  
**Baseline:** Phase 5D complete (`022_phase_5d_completion_status.md`, commits through `6da6233`)  
**Scope:** Portal Events export surfaces for extracted `team/*` and `detail/*` classic scripts  
**Out of scope:** Phase 5F module entry, `portal/events.html` edits (until implementation gate), `supabase/**`, `admin/**`, `js/events/**`, `css/**`, broad `compat/*` wiring

---

## Executive summary

Extracted Events modules already export correctly for production: each **owner file** assigns `window.evt*` globals and a **`PortalEvents.*` submodule object**. `detail.js` additionally assigns **flat `PortalEvents.detail.*` mirrors** for backward compatibility and Phase 3B smokes.

**Phase 5E safest path:** **Document the export map now (this file).** Defer moving wiring into `detail/exports.js` or `compat/window-exports.js` until a small, gated implementation PR is approved.

**Recommendation:** **Option A + optional micro-step 5E.1** — audit complete; implementation **no-go for this PR** unless explicitly approving nested submodule aliases only (no HTML change).

---

## 1. Current Export Surfaces

Legend:

- **Owner** — module that defines the function and assigns `window.evt*`
- **NS** — `PortalEvents.*` submodule object on the owner
- **Bridge** — flat assignment on `PortalEvents.detail.*` in `detail.js` (end of IIFE)
- **Local** — assigned only on `window` from `detail.js` (function still defined in `detail.js`)

### 1.1 `js/portal/events/detail.js`

| Symbol | Kind | Notes |
| --- | --- | --- |
| `PortalEvents.detail` (bootstrap) | Infrastructure | `_registry`, `register`, `get` — created at IIFE start |
| `evtOpenDetail` | **Local** → `window.evtOpenDetail` | Main render pipeline (~900+ lines) |
| `evtInitHeroCollapse` | **Local** → `window.*` | No-op stubs (external callers) |
| `evtCleanupHeroCollapse` | **Local** → `window.*` | No-op stubs |
| `detail.open` | **Bridge** | `= evtOpenDetail` (local fn, not `window`) |
| `detail.initHeroCollapse` | **Bridge** | `= evtInitHeroCollapse` (local) |
| `detail.cleanupHeroCollapse` | **Bridge** | `= evtCleanupHeroCollapse` (local) |
| `detail.openLightbox` … `detail.raffleLockedDesktopHtml` | **Bridge** | `= window.evt*` (extracted modules) |
| `detail.openTeamChat` … `detail.closeCtaPanel` | **Bridge** | `= window.evt*` (team modules) |
| `detail.register('rsvp' \| 'raffle' \| …)` | Registry | Lazy refs to other portal scripts |

**Not exported from `detail.js`:** nested pointers `detail.presentation`, `detail.raffleRender`, `detail.mapOverlay`, `detail.team` (submodule objects exist on owners only).

---

### 1.2 `js/portal/events/detail/presentation.js` (5D.1)

| `window.evt*` | `PortalEvents.detail.presentation` key |
| --- | --- |
| `evtMiniMarkdown` | `miniMarkdown` |
| `evtOpenLightbox` | `openLightbox` |
| `evtInitSectionAnimations` | `initSectionAnimations` |
| `evtStartLiveCountdown` | `startLiveCountdown` |

**Bridged in `detail.js`:** `detail.miniMarkdown`, `detail.openLightbox`, `detail.initSectionAnimations`, `detail.startLiveCountdown` → respective `window.evt*`.

---

### 1.3 `js/portal/events/detail/raffle-render.js` (5D.2)

| `window.evt*` | `PortalEvents.detail.raffleRender` key |
| --- | --- |
| `evtDetailRaffleConfig` | `config` |
| `evtDetailRaffleCategories` | `categories` |
| `evtDetailRaffleItems` | `items` |
| `evtDetailRaffleWinnerCount` | `winnerCount` |
| `evtDetailDrawModeLabel` | `drawModeLabel` |
| `evtDrawModeLabel` | *(alias — same fn as drawModeLabel)* |
| `evtDetailRafflePrizesHtml` | `prizesHtml` |
| `evtDetailRaffleWinnersHtml` | `winnersHtml` |
| `evtRaffleLockedDesktopHtml` | `lockedDesktopHtml` |

**Internal (not on `window`):** `evtDetailPrizeMedia`, `_raffleSectionHead`.

**Bridged in `detail.js`:** `detail.raffleConfig` … `detail.raffleLockedDesktopHtml` (flat names differ from `raffleRender.*` keys).

---

### 1.4 `js/portal/events/detail/map-overlay.js` (5D.3)

| `window.evt*` | `PortalEvents.detail.mapOverlay` key |
| --- | --- |
| `evtOpenFullscreenMap` | `open` |
| `evtRecenterFullscreenMap` | `recenter` |
| `evtCloseFullscreenMap` | `close` |

**Bridged in `detail.js`:** `detail.openFullscreenMap`, `detail.recenterFullscreenMap`, `detail.closeFullscreenMap`.

**Inline HTML / Leaflet:** `onclick="evtOpenFullscreenMap(...)"`, `dMap.on('click', () => window.evtOpenFullscreenMap(...))` — requires `window.evt*` at click time.

---

### 1.5 `js/portal/events/team/chat.js` (5B)

| `window.evt*` | `PortalEvents.team.chat` key |
| --- | --- |
| `evtOpenTeamChat` | `open` |
| `evtSendTeamChatMessage` | `send` |
| `evtCleanupTeamChat` | `cleanup` |

**NS-only (not `window.evt*`):** `ensureChat`, `loadMessages`, `subscribe`, `maxLength`.

**Bridged in `detail.js`:** `detail.openTeamChat` only.

---

### 1.6 `js/portal/events/team/tools.js` (5C)

| `window.evt*` | `PortalEvents.team.tools` key |
| --- | --- |
| `evtInjectTeamToolsStyles` | `injectStyles` |
| `evtEnsureCtaBarShell` | `ensureCtaBarShell` |
| `evtApplyDesktopTeamToolsOverlay` | `applyDesktopTeamToolsOverlay` |
| `evtOpenTeamToolsPanel` | `open` |
| `evtCloseCtaPanel` | `closePanel` |
| `evtOpenCtaPanel` | `openCtaPanel` |
| `evtInitBottomNav` | `initBottomNav` |
| `evtCleanupBottomNav` | `cleanupBottomNav` |

**NS-only:** `buildPanelHtml`, `raffleLockedCtaBtnHtml`.

**Bridged in `detail.js`:** `detail.openTeamToolsPanel`, `detail.openCtaPanel`, `detail.closeCtaPanel`, `detail.initBottomNav`, `detail.cleanupBottomNav`.

**Not bridged to `detail.*`:** `evtInjectTeamToolsStyles`, `evtEnsureCtaBarShell`, `evtApplyDesktopTeamToolsOverlay` (used by chat/tools internally).

---

### 1.7 Compat helpers (exist, **not loaded** on portal page)

| File | Runtime on `portal/events.html` | Role |
| --- | --- | --- |
| `compat/window-exports.js` | **No** | `installWindowExports`, `assignGlobals`, namespace merge — tested by `_smoke-phase4f-window-exports.js` |
| `compat/inline-handlers.js` | **No** | `installInlineHandlers`, `EXPECTED_HANDLER_GROUPS` — inventory for inline `onclick` names |

`test/_smoke-phase4f-window-exports.js` explicitly expects compat **not** in `portal/events.html` yet.

---

## 2. Duplication / Scattered Wiring

### 2.1 Triple surface pattern (extracted detail modules)

For each 5D slice, the same API is exposed **three ways**:

1. **Owner:** `window.evtFoo = fn` + `PortalEvents.detail.<slice>.<key> = fn`
2. **Shim:** `detail.<legacyName> = window.evtFoo` in `detail.js`
3. **Call sites:** mix of `window.evtFoo`, bare `evtFoo` in HTML strings, and `detail.*` (rare)

This is **intentional** for Phase 3B compatibility, not accidental drift.

### 2.2 Naming asymmetry (flat vs nested)

| Submodule object | Example nested key | Flat `detail.*` bridge |
| --- | --- | --- |
| `detail.presentation` | `miniMarkdown` | `detail.miniMarkdown` |
| `detail.raffleRender` | `config` | `detail.raffleConfig` |
| `detail.mapOverlay` | `open` | `detail.openFullscreenMap` |
| `team.tools` | `open` | `detail.openTeamToolsPanel` |

Consumers may use either style; smokes enforce **flat `detail.*` bridges**, not nested `detail.presentation.*`.

### 2.3 Where assignments live

| Concern | Location |
| --- | --- |
| `window.evt*` for extracted features | Owner module (chat, tools, presentation, raffle-render, map-overlay) |
| `window.evtOpenDetail`, hero stubs | `detail.js` |
| Flat `PortalEvents.detail.*` mirrors | `detail.js` export block (~lines 1107–1134) |
| `PortalEvents.detail._registry` | `detail.js` only |
| `PortalEvents.team.*` | `team/*.js` only (no `detail.team` shim) |

### 2.4 Smoke / verifier enforcement

| Test | What it locks |
| --- | --- |
| `_smoke-phase3b-detail-bridge.js` | Owner `window.evt*` in correct file; bridges in `detail.js`; HTML load order; no reimplementation in `detail.js` |
| `_smoke-event-team-tools-ui.js` | tools.js ownership + detail bridges |
| `_smoke-event-team-chat-ui.js` | chat.js ownership + `detail.openTeamChat` |
| `_smoke-portal-event-raffle-rsvp-parity.js` | raffle paths in raffle-render + tools |
| `_smoke-phase4f-window-exports.js` | compat helper API; **not** in HTML |
| `_verify-events-live-globals.js` | Broad production global inventory (includes `PortalEvents.windowExports` when compat loaded — N/A on portal today) |

### 2.5 Obvious duplicates (safe to document, risky to “fix”)

- `evtDrawModeLabel` in `raffle-render.js` aliases `evtDetailDrawModeLabel`; separate `evtDrawModeLabel` may exist in `raffle.js` — **do not consolidate** without parity audit.
- `PortalEvents.detail.presentation.miniMarkdown` and `detail.miniMarkdown` point at the same function via two assignment paths — **redundant but required** until Phase 5F.
- Bridge block in `detail.js` is the **single** place flat mirrors are assigned; owner modules do **not** assign `detail.*` — good separation.

### 2.6 Missing / optional surfaces (not bugs)

| Gap | Risk if added |
| --- | --- |
| `detail.presentation = PortalEvents.detail.presentation` | Low — documentation alias only |
| `detail.raffleRender`, `detail.mapOverlay` | Low |
| `detail.team = PortalEvents.team` | Low — discoverability |
| `detail.*` for `evtInjectTeamToolsStyles` etc. | Low usage; internal to team stack |

No smoke failures indicate a **missing required** mirror today.

---

## 3. Compatibility Constraints

**Must not change in Phase 5E** (without explicit Phase 5F program):

| Constraint | Reason |
| --- | --- |
| All listed `window.evt*` names remain on `window` | Inline HTML, legacy scripts, live verifier |
| `EventsCreate`, `EventsManage`, `EventsRaffleModel` | Admin/manage/create bridges (other files) |
| Flat `PortalEvents.detail.*` mirrors | Phase 3B smokes, external readers |
| `PortalEvents.detail.presentation` / `raffleRender` / `mapOverlay` | 5D namespace contract |
| `PortalEvents.team.chat` / `team.tools` | 5B/5C contract |
| `detail.register(...)` stays in `detail.js` | Registry ownership |
| `portal/events.html` classic scripts only | No `type="module"` until 5F |
| Script order: chat → tools → presentation → raffle-render → map-overlay → **detail.js** → … → **init.js last** | Load-order dependency |
| `init.js` does not move before feature scripts | Phase 1 guard |
| Do not remove owner-module `window.evt*` assignments | Inline handlers bind at click time |

**Compat helpers:** `installWindowExports` is designed for a **future orchestrator** (5F or post-consolidation). Calling it from portal HTML **before** all feature IIFEs run would not install per-file exports unless every module registers through it — **not** a drop-in for current owner-module pattern.

---

## 4. Phase 5E Options

### Option A — Documentation only (this document)

Record export map; no code/HTML changes.

| Pros | Cons |
| --- | --- |
| Zero regression risk | Duplication remains |
| Unblocks team review of 5F later | No line-count win in `detail.js` |

---

### Option B — Add `js/portal/events/detail/exports.js`

Classic IIFE loaded **after** `detail.js` (or after all owners, before `comments.js`), containing **only** flat `PortalEvents.detail.*` bridge assignments moved from `detail.js`.

| Pros | Cons |
| --- | --- |
| `detail.js` slimmer export section | **New script tag** in `portal/events.html` (gated) |
| Single file to read mirrors | Registry + `evtOpenDetail` still in `detail.js`; split brain |
| | Must not run before owners assign `window.evt*` |

**Load order if implemented:**  
`… → map-overlay.js → detail.js → **exports.js** → comments.js → …`

---

### Option C — Wire `compat/window-exports.js` in HTML

Load compat early; modules call `installWindowExports` at end.

| Pros | Cons |
| --- | --- |
| Central API | **High churn** — every owner file must adopt |
| Matches Phase 4F design | Risk of double-assign / order bugs |
| | Overkill for 5E; better suited to **5F** single entry |

**Recommendation:** **Do not** enable on portal page in 5E.

---

### Option D — Leave exports in owner modules + `detail.js` shim

Status quo; proceed to `detail/fragments.js` or pause Phase 5.

| Pros | Cons |
| --- | --- |
| Proven on live | Scattered map |

---

## 5. Recommendation

**Primary:** **Option A now** — approve this audit, commit doc only, **pause implementation**.

**Do not:**

- Wire `compat/window-exports.js` into `portal/events.html` yet.
- Move all exports into one file yet.
- Remove any `window.evt*` or flat `detail.*` mirror.

**If a follow-up 5E.1 micro-PR is approved (lowest risk, no HTML):**

Add **nested aliases** at the end of `detail.js` export block (owner globals already on `window`):

```javascript
detail.presentation  = window.PortalEvents.detail.presentation;
detail.raffleRender  = window.PortalEvents.detail.raffleRender;
detail.mapOverlay      = window.PortalEvents.detail.mapOverlay;
detail.team            = window.PortalEvents.team;
```

- Keeps flat bridges and smokes unchanged.
- Improves discoverability for new code preferring nested namespaces.
- Extend `_smoke-phase3b-detail-bridge.js` with optional checks.

**If a follow-up 5E.2 PR is approved (requires HTML gate):**

Extract flat bridge block to `detail/exports.js` per Option B; run full smoke + live asset order check.

**Preferred product direction after 5E:** Pause main `evtOpenDetail` split; consider `detail/fragments.js` (_ed* helpers) or other page work (per `022`).

---

## 6. Implementation Definition (if 5E.1 or 5E.2 approved)

### 5E.1 — Nested aliases only

| Touch | Change |
| --- | --- |
| `detail.js` | Add 4 lines (aliases above) |
| `test/_smoke-phase3b-detail-bridge.js` | Assert aliases exist |
| `portal/events.html` | **No change** |

### 5E.2 — `detail/exports.js`

| Touch | Change |
| --- | --- |
| `detail/exports.js` | New IIFE: read `const detail = window.PortalEvents.detail`, assign flat bridges |
| `detail.js` | Remove moved bridge lines; keep `window.evtOpenDetail`, registry, local hero stubs |
| `portal/events.html` | One `<script>` after `detail.js` |
| Smokes | HTML order check + bridge location |

### Explicitly out of 5E implementation scope

- Changing owner-module `window.evt*` assignment style
- `installWindowExports` in production HTML
- Removing flat `detail.*` mirrors
- Phase 5F / module entry
- `evtOpenDetail` render split

### Optional non-code follow-ups (anytime)

- Extend `_qa-event-team-chat-live.js` deploy fetch list for `presentation.js`, `raffle-render.js`, `map-overlay.js`
- Add `023` export map table to Phase 3B smoke header comment (doc reference only)

---

## 7. Tests Required Before Any Phase 5E Implementation

Run and expect **all pass** before merging implementation:

```bash
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3b-detail-bridge.js
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

**If `portal/events.html` changes:**

```bash
node test/_smoke-phase4f-window-exports.js   # confirm compat still not auto-loaded unless intended
# Live: fetch portal/events.html + new script URL 200
# Manual: Team Tools, Team Chat, detail open, raffle, fullscreen map
```

**Recommended before production deploy (implementation PRs):**

```bash
node test/_verify-events-live-globals.js
```

---

## 8. Go / No-Go

| Gate | Decision |
| --- | --- |
| Phase 5E audit document (`023`) | **GO** — create and commit this file |
| Phase 5E implementation (exports.js, compat wiring, bridge moves) | **NO-GO now** — wait for explicit approval of 5E.1 or 5E.2 |
| Phase 5F module entry | **NO-GO** |
| `portal/events.html` changes | **NO-GO** in audit-only step |

**Summary:** Export wiring is **healthy but duplicated by design**. Phase 5E should **standardize documentation first**; only then consider a **tiny** nested-alias PR (5E.1) or a **script-tagged** bridge extraction (5E.2).

---

## 9. Export Surface Quick Reference

```
window.evt*  ←── owner IIFE (team/*, detail/*, detail.js local)
      ↑
PortalEvents.detail.<flat>  ←── detail.js bridges (compatibility)
PortalEvents.detail.<slice> ←── owner NS (presentation, raffleRender, mapOverlay)
PortalEvents.team.*         ←── team/chat.js, team/tools.js
```

**Classic loader (unchanged):**

```text
team/chat.js → team/tools.js → detail/presentation.js → detail/raffle-render.js
  → detail/map-overlay.js → detail.js → … → init.js
```

---

## 10. Related Documents

| Doc | Role |
| --- | --- |
| `020_phase_5_readiness_and_execution_plan.md` | Phase 5E/5F roadmap |
| `021_phase_5d_detail_split_plan.md` | Extraction boundaries |
| `022_phase_5d_completion_status.md` | 5D sign-off |
