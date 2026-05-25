# Events Refactor — Phase 5J.1 Compat Export Inventory Completion Status

**Document:** `034_phase_5j1_compat_inventory_completion_status.md`  
**Date:** 2026-05-23  
**Status:** **Complete** — Phase 5J.1 implemented, static smokes green (inventory-only; no live QA required)  
**Planning audit commit (5J):** `6b13165` — Add Phase 5J compat export wiring audit (`033_phase_5j_compat_export_wiring_audit.md`)  
**Latest implementation commit (5J.1):** `c365706` — Add Phase 5J.1 compat export inventory smoke  
**Related:** `033_phase_5j_compat_export_wiring_audit.md`, `032_phase_5i2_cleanup_completion_status.md`, `023_phase_5e_export_wiring_plan.md`, `025_phase_5_remaining_refactor_completion_roadmap.md`  
**Scope:** Static export manifest smoke + dormant-compat inventory refresh — **no runtime wiring**  
**Out of scope:** `portal/events.html` compat load, `compat/window-exports.js` runtime install, Phase 5L module entry, list/manage/create refactors

---

## 1. Completion Summary

Phase **5J.1** compat/export **inventory** is **complete**. A new static smoke freezes the post–5I export map and confirms compat helper scripts remain **dormant** on the production script path.

| Milestone | Commit | What shipped |
| --- | --- | --- |
| **5J audit** | `6b13165` | `033_phase_5j_compat_export_wiring_audit.md` — global/namespace inventory, inline handler tiers, Option B phased plan |
| **5J.1** | `c365706` | `test/_smoke-phase5j-compat-exports.js`; `compat/inline-handlers.js` `EXPECTED_HANDLER_GROUPS` refresh (inventory only) |

### 5J.1 deliverables

| Item | Location |
| --- | --- |
| **New smoke** | `test/_smoke-phase5j-compat-exports.js` (92 checks) |
| **Inventory refresh** | `js/portal/events/compat/inline-handlers.js` — post–5I handler groups (`team`, `detailTemplate`, `detailSections`, expanded `rsvp`); comment that file is not loaded by HTML |
| **Runtime behavior** | **Unchanged** — owner scripts still assign `window.evt*` directly at load time |
| **`portal/events.html`** | **Unchanged** — compat scripts **not** loaded |
| **Compat installers** | **Dormant** — `installWindowExports` / `installInlineHandlers` not called from any loaded `js/portal/events/**` script (excluding `compat/`) |

### Per-PR file touch (5J.1)

| Files |
| --- |
| `test/_smoke-phase5j-compat-exports.js` (create) |
| `js/portal/events/compat/inline-handlers.js` (inventory only) |

**Not changed in 5J.1:** `portal/events.html`, `compat/window-exports.js`, `compat/external-globals.js`, `detail.js`, `detail/*`, `team/*`, `init.js`.

---

## 2. What 5J.1 Verifies

`_smoke-phase5j-compat-exports.js` asserts the following contract (static file reads only):

### HTML / compat dormant

| Check | Result |
| --- | --- |
| `portal/events.html` does **not** load `compat/window-exports.js`, `compat/inline-handlers.js`, `compat/external-globals.js` | Enforced |
| HTML does **not** reference `installWindowExports`, `installInlineHandlers`, `externalGlobals` | Enforced |
| No `type="module"` on portal Events scripts | Enforced |
| `init.js` remains **last** among `js/portal/events/*` | Enforced |
| Compat files **exist** and define installers | Enforced |
| **No** `installWindowExports(` / `installInlineHandlers(` in 29 loaded portal scripts (excluding `compat/`) | Enforced |

### Detail pipeline owner exports

| Module | Key assertions |
| --- | --- |
| `detail/data.js` | `window.evtLoadDetailContext`, `PortalEvents.detail.data.loadContext` |
| `detail/sections.js` | `evtBuildDetailRsvpSectionHtml`, `evtBuildDetailRaffleSectionHtml`, `evtBuildDetailShareCardHtml`, `PortalEvents.detail.sections` |
| `detail/template.js` | `window.evtBuildDetailTemplate`, `PortalEvents.detail.template.build` |
| `detail/post-render.js` | four post-render hooks + `PortalEvents.detail.postRender` |
| `detail/map-overlay.js` | `evtOpenFullscreenMap`, `evtCloseFullscreenMap`, `PortalEvents.detail.mapOverlay` |
| `detail/fragments.js` | `evtEdCard`, `evtEdSectionHead`, `PortalEvents.detail.fragments` |
| `detail/presentation.js` | `evtOpenLightbox`, `PortalEvents.detail.presentation` |
| `detail/raffle-render.js` | `evtDetailRaffleConfig`, `evtRaffleLockedDesktopHtml`, `PortalEvents.detail.raffleRender` |

### `detail.js` bridges

`detail.loadContext`, `detail.buildTemplate`, `detail.runPostRenderUi`, `detail.renderQrCanvases`, `detail.initInlineMaps`, `detail.openTeamToolsPanel`, `detail.openTeamChat`, `detail.openFullscreenMap`, nested `detail.template` / `detail.postRender` / `detail.sections` / `detail.data`, plus `evtOpenDetail`, `detail.register`.

### Team exports

`team/tools.js`: `evtOpenTeamToolsPanel`, `evtInitBottomNav`, `PortalEvents.team.tools`.  
`team/chat.js`: `evtOpenTeamChat`, `evtSendTeamChatMessage`, `PortalEvents.team.chat`.

### Init barrel

`init.js`: `evtHandleRsvp`, `evtHandleRaffleEntry`, `evtOpenScanner`, `evtNavigateToEvent`, `evtNavigateToList`, `PortalEvents.initEventsPage`.

### Inline handler strings (preserved in template/sections/team sources)

`evtHandleRsvp`, `evtHandleRaffleEntry`, `evtHandleFreeRaffleEntry`, `evtOpenTeamToolsPanel`, `evtOpenLightbox`, `evtOpenFullscreenMap`, `evtPostComment`, `evtCopyShareUrl`, `evtDownloadIcs`, `EventsManage.open`, waitlist/host/navigation handlers, `evtOpenDetail`, etc.

### `evtMessageHost` (noted, not failed)

Smoke **notes** (○) that `evtMessageHost` still appears in `detail/sections.js` onclick strings but **no** `function evtMessageHost` exists under `js/portal/events/` — pre-existing gap documented in `033_…`. 5J.1 does **not** treat this as a regression.

---

## 3. Current State

| Item | Status |
| --- | --- |
| **Owner scripts** | Still assign `window.evt*` and `PortalEvents.*` at classic script load time (unchanged) |
| **`PortalEvents.detail.*` bridges** | Still assigned at end of `detail.js` IIFE (unchanged) |
| **Compat installers** | Present on disk; **not** loaded or invoked on live path |
| **`portal/events.html`** | Unchanged since 5I.1 (detail load order: `post-render.js` → `template.js` → `detail.js`) |
| **Phase 5L** | **Not started** — no `type="module"` entry |

Export manifest is now **machine-checked** by `_smoke-phase5j-compat-exports.js` on every gate run that includes it.

---

## 4. Validation Summary

### Phase 5J.1 smoke (after `c365706`)

```bash
node test/_smoke-phase5j-compat-exports.js
```

| Result | Detail |
| --- | --- |
| **5J.1 smoke** | **92/92 pass**, **1 noted** (`evtMessageHost` inventory note) |

### Full static regression gate (all passed with 5J.1 in tree)

```bash
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3b-detail-bridge.js
node test/_smoke-phase5h-detail-open-split.js
node test/_smoke-phase5h6-post-render-bridge.js
node test/_smoke-phase5i-template-shell.js
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

| Smoke | Result (post–5J.1) |
| --- | --- |
| `_smoke-phase1-bridge.js` | ALL PASS |
| `_smoke-phase3b-detail-bridge.js` | ALL PASS |
| `_smoke-phase5h-detail-open-split.js` | **100/100** |
| `_smoke-phase5h6-post-render-bridge.js` | **50/50** |
| `_smoke-phase5i-template-shell.js` | **29/29** |
| `_smoke-event-team-tools-ui.js` | all pass |
| `_smoke-event-team-chat-ui.js` | all pass |
| `_smoke-portal-event-raffle-rsvp-parity.js` | all pass |

### Live QA

**Not required** for 5J.1 — static/inventory-only change; no deployed script path or runtime behavior change. Production export surface unchanged from post–5I.2 (`8c46532`).

---

## 5. Remaining Work

| Work item | Target | Notes |
| --- | --- | --- |
| **5J.2 (optional)** | `detail/exports.js` | Move flat `PortalEvents.detail.*` bridges out of `detail.js`; one script tag; no compat load |
| **`evtMessageHost` (optional)** | `rsvp.js` or messaging module | Implement or remove onclick — separate from compat/5L |
| **Phase 5L readiness audit** | Doc-only | Prerequisites for module entry without changing HTML yet |
| **Phase 5L module entry** | `index.js` + `portal/events.html` | **Last** — after readiness audit + explicit approval |
| **5J.3 / compat runtime** | `compat/window-exports.js` in HTML | Only if 5L bootstrap requires central install; gated smokes + live QA |
| **List / manage / create refactors** | Various | Separate tracks |

---

## 6. Recommended Next Step

1. **Do not load** `compat/window-exports.js`, `compat/inline-handlers.js`, or `compat/external-globals.js` in `portal/events.html` yet.
2. **Do not start Phase 5L** module entry until a readiness audit is approved.
3. **Choose one next gate (explicit approval):**
   - **A) 5J.2** — `detail/exports.js` bridge consolidation (one HTML script tag; still no compat runtime), or
   - **B) Phase 5L readiness audit** — doc-only inventory of module-entry prerequisites.
4. Optional: commit this checkpoint doc (`034_…`) after approval.
5. Add `_smoke-phase5j-compat-exports.js` to the standing gate list in future completion docs / CI notes.

---

## 7. No-Go Reminder

**Do not combine in a single PR:**

- Compat runtime wiring (`events.html` compat tags or `installWindowExports` without gate)
- Phase 5L module entry
- List / manage / create refactors
- Unrelated CSS / `md/**` / docs cleanup

Each concern needs its own gate: static smokes (including 5J.1 where relevant), live QA when runtime changes, and explicit approval.

---

## Appendix — Checkpoint chain

5I complete (`031`, `032`) → 5J audit (`033`, `6b13165`) → **5J.1 inventory smoke (`034`, `c365706`)** → optional 5J.2 → Phase 5L readiness audit → 5L module entry.
