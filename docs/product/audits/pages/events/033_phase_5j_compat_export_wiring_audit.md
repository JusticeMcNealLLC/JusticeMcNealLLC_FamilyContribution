# Events Refactor — Phase 5J Compat / Export Wiring Audit

**Document:** `033_phase_5j_compat_export_wiring_audit.md`  
**Date:** 2026-05-23  
**Status:** Audit / planning — **no runtime changes in this step**  
**Latest detail checkpoint:** `032_phase_5i2_cleanup_completion_status.md` (`b12c66a` doc, `8c46532` code)  
**Related:** `023_phase_5e_export_wiring_plan.md`, `032_phase_5i2_cleanup_completion_status.md`, `031_phase_5i_template_completion_status.md`, `025_phase_5_remaining_refactor_completion_roadmap.md`, `018_phase_4i_live_verifier_status.md`  
**Scope:** Inventory Portal Events **global / namespace export surfaces** and compat helper files before any implementation or Phase 5L  
**Out of scope:** Runtime wiring, `portal/events.html` edits, global removal, Phase 5L module entry, list/manage/create refactors

---

## Executive summary

After Phase **5I.2**, the portal Events detail stack is split across classic owner scripts. Each owner already assigns **`window.evt*`** (or **`window.Events*`**) and a matching **`PortalEvents.*`** submodule. `detail.js` adds **flat bridges** on `PortalEvents.detail.*` plus a small **`detail.register`** registry.

Three compat helpers exist under `js/portal/events/compat/` but are **not loaded** by `portal/events.html`. Production behavior depends entirely on per-file assignments at script load time — which is **working** and live-verified through `8c46532`.

**Recommendation:** **Option B (phased)** — do **not** skip to Phase 5L module entry without a compat/readiness gate. First implementation slice: **5J.1 inventory smoke only** (no HTML change). Optional **5J.2** `detail/exports.js` to consolidate bridges. Defer loading `compat/window-exports.js` into the live page until **5J.3** or Phase **5L** bootstrap, with smokes proving no duplicate/conflict.

**Compat before Phase 5L?** **Yes** for documentation + **5J.1** static export smoke + **Phase 5L readiness audit** (separate doc). Full `installWindowExports()` runtime wiring is **optional** if 5J.1 proves the current owner exports are complete.

---

## 1. Current global surface inventory

Legend:

| Tag | Meaning |
| --- | --- |
| **Owner** | File that defines and assigns the symbol |
| **Window** | Explicit `window.name = …` (or classic top-level `function` → `window` in browser) |
| **NS** | `PortalEvents.*` submodule object |
| **Bridge** | Flat alias on `PortalEvents.detail.*` assigned in `detail.js` |
| **State** | Mutable shared data on `window` (not a function export) |

### 1.1 Detail pipeline (post–5I.2) — requested symbols

| Symbol | Owner | Window | NS | Bridge (`detail.js`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `evtOpenDetail` | `detail.js` | ✓ | `detail.open` | ✓ (local fn) | Orchestrator |
| `evtLoadDetailContext` | `detail/data.js` | ✓ | `detail.data.loadContext` | `detail.loadContext` | |
| `evtBuildDetailTemplate` | `detail/template.js` | ✓ | `detail.template.build` | `detail.buildTemplate` | |
| `evtBuildDetail*Html` (18 builders) | `detail/sections.js` | ✓ each | `detail.sections.build*` | — | Orchestrator calls `window.evtBuildDetail…` directly |
| `evtRunDetailPostRenderBasics` | `detail/post-render.js` | ✓ | `detail.postRender.runBasics` | `detail.runPostRenderBasics` | |
| `evtRenderDetailQrCanvases` | `detail/post-render.js` | ✓ | `detail.postRender.renderQrCanvases` | `detail.renderQrCanvases` | |
| `evtInitDetailInlineMaps` | `detail/post-render.js` | ✓ | `detail.postRender.initInlineMaps` | `detail.initInlineMaps` | |
| `evtRunDetailPostRenderUi` | `detail/post-render.js` | ✓ | `detail.postRender.runUi` | `detail.runPostRenderUi` | |
| `evtOpenTeamToolsPanel` | `team/tools.js` | ✓ | `team.tools.open` | `detail.openTeamToolsPanel` | |
| `evtOpenTeamChat` | `team/chat.js` | ✓ | `team.chat.open` | `detail.openTeamChat` | |
| `evtHandleRsvp` | `init.js` (re-export) | ✓ | `detail.register('rsvp')` | — | Defined in `rsvp.js`; assigned on `window` from `init.js` |
| `evtHandleRaffleEntry` | `init.js` | ✓ | registry | — | `rsvp.js` |
| `evtHandleFreeRaffleEntry` | `rsvp.js` | classic global | — | — | Used in `sections.js` onclick |
| `evtOpenFullscreenMap` | `detail/map-overlay.js` | ✓ | `detail.mapOverlay.open` | `detail.openFullscreenMap` | Inline + Leaflet click |

### 1.2 Detail — presentation, fragments, raffle-render, map

| Symbol | Owner | Window | NS |
| --- | --- | --- | --- |
| `evtMiniMarkdown` | `detail/presentation.js` | ✓ | `detail.presentation.miniMarkdown` |
| `evtOpenLightbox` | `detail/presentation.js` | ✓ | `detail.presentation.openLightbox` |
| `evtInitSectionAnimations` | `detail/presentation.js` | ✓ | `detail.presentation.initSectionAnimations` |
| `evtStartLiveCountdown` | `detail/presentation.js` | ✓ | `detail.presentation.startLiveCountdown` |
| `evtEdMetaRow`, `evtEdPill`, `evtEdCard`, `evtEdNotice`, `evtEdSectionHead` | `detail/fragments.js` | ✓ | `detail.fragments.*` |
| `evtDetailRaffleConfig` … `evtRaffleLockedDesktopHtml` | `detail/raffle-render.js` | ✓ | `detail.raffleRender.*` |
| `evtDrawModeLabel` | `detail/raffle-render.js` | ✓ (alias) | same fn as `evtDetailDrawModeLabel` |
| `evtRecenterFullscreenMap`, `evtCloseFullscreenMap` | `detail/map-overlay.js` | ✓ | `detail.mapOverlay.*` |
| `evtInitHeroCollapse`, `evtCleanupHeroCollapse` | `detail.js` (no-op) | ✓ | `detail.initHeroCollapse` / `cleanupHeroCollapse` |

### 1.3 Team / CTA (beyond requested list)

| Symbol | Owner | Window | NS |
| --- | --- | --- | --- |
| `evtInjectTeamToolsStyles` | `team/tools.js` | ✓ | `team.tools.injectStyles` |
| `evtEnsureCtaBarShell` | `team/tools.js` | ✓ | `team.tools.ensureCtaBarShell` |
| `evtApplyDesktopTeamToolsOverlay` | `team/tools.js` | ✓ | `team.tools.applyDesktopTeamToolsOverlay` |
| `evtCloseCtaPanel`, `evtOpenCtaPanel` | `team/tools.js` | ✓ | `team.tools.closePanel` / `openCtaPanel` |
| `evtInitBottomNav`, `evtCleanupBottomNav` | `team/tools.js` | ✓ | bridged on `detail.*` |
| `evtSendTeamChatMessage`, `evtCleanupTeamChat` | `team/chat.js` | ✓ | `team.chat.send` / `cleanup` |

### 1.4 List, init, shared utilities

| Symbol | Owner | Window | NS |
| --- | --- | --- | --- |
| `evtLoadEvents`, `evtRenderEvents`, `evtSetupSearch`, `evtInitFilterChips` | `list.js` | ✓ | `PortalEvents.list.load` / `render` / … |
| `evtRenderFeatured`, `evtUpdateHeroStats`, `evtRenderCard` | `list.js` | ✓ | partial on `list` NS |
| `evtSetVlift`, `evtIsVlift` | `list.js` | ✓ | — |
| `PortalEvents.initEventsPage` | `init.js` | — | `PortalEvents.initEventsPage` |
| `evtNavigateToEvent`, `evtNavigateToList` | `init.js` | ✓ | — |
| `evtCopyShareUrl`, `evtDownloadIcs` | `init.js` / `utils.js` | ✓ | `evtDownloadIcs` in `utils.js` |
| `evtEscapeHtml`, `evtGenerateSlug`, `evtToggleModal` | `utils.js` / `init.js` | classic / window | Used in templates and HTML builders |
| `evtIsGoingRsvp`, `evtIsRaffleEntriesOpen`, `evtIsRaffleBundledWithPaidRsvp`, `evtCanEnterMemberRaffle` | `rsvp.js` | ✓ | — |

### 1.5 Classic `Events*` objects

| Symbol | Owner | Window | NS |
| --- | --- | --- | --- |
| `EventsManage` | `manage/sheet.js` | ✓ | `PortalEvents.manage` (+ `detail.register('manage')`) |
| `EventsCreate` | `create/sheet.js` | ✓ | `PortalEvents.create` |
| `EventsRaffleModel` | `raffle-model.js` | ✓ | `PortalEvents.raffleModel` |

### 1.6 Init.js barrel (portal page actions)

Assigned from `init.js` on `window` (implementations live in `rsvp.js`, `scanner.js`, `documents.js`, `competition.js`, `scrapbook.js`, `map.js`, `create.js`, etc.):

`evtHandleRsvp`, `evtHandleRaffleEntry`, `evtOpenScanner`, `evtCloseScanner`, `evtOpenRaffleDraw`, `evtCloseRaffleDraw`, `evtDrawWinner`, `evtUpdateStatus`, `evtCancelEvent`, `evtRescheduleEvent`, `evtDuplicateEvent`, `evtDeleteEvent`, `evtJoinWaitlist`, `evtLeaveWaitlist`, `evtClaimWaitlistSpot`, `evtAddCostItem`, `evtRemoveCostItem`, `evtUpdateCostItem`, `evtOpenDocumentsPanel`, `evtCloseDocumentsPanel`, `evtShowUploadForm`, `evtUploadDocument`, `evtDownloadDocument`, `evtMarkDistributed`, `evtDeleteDocument`, `evtInitMap`, `evtToggleLocationSharing`, `evtJoinCompetition`, `evtSubmitEntry`, `evtCastVote`, `evtModerateEntry`, `evtContributeToPrizePool`, `evtStartPhase`, `evtAdvancePhase`, `evtExtendPhase`, `evtFinalizeCompetition`, `evtRecalcCompTiers`, `evtUploadPhoto`, `evtDeletePhoto`, `evtViewPhoto`, `evtNavigateToEvent`, `evtNavigateToList`.

`PortalEvents.competition.*` mirrors competition functions in `competition.js`.

### 1.7 Comments, documents, scrapbook, map builders

| Symbol | Owner | Window | Notes |
| --- | --- | --- | --- |
| `evtLoadComments`, `evtPostComment` | `comments.js` | classic global | `post-render.js` calls `window.evtLoadComments` |
| `evtBuildCompetitionHtml` | `competition.js` | classic global | Used from `detail/data.js` |
| `evtBuildDocumentsHtml` | `documents.js` | classic global | Registry only |
| `evtBuildScrapbookHtml` | `scrapbook.js` | classic global | Registry only |
| `evtBuildMapHtml` | `map.js` | classic global | Registry only |

### 1.8 Shared state globals (not export wiring — document for 5L)

| Symbol | Typical writer | Consumers |
| --- | --- | --- |
| `evtAllEvents`, `evtAllRsvps`, `evtAttendees`, `evtAttendeeCounts` | `list.js` | list, detail, team, rsvp |
| `evtActiveTab` | `list.js` | list filters |
| `evtCurrentUser` | `init.js` / `state.js` | auth-gated actions |
| `evtCurrentUserName`, `evtCurrentUserPic`, `evtCurrentUserInitials` | `init.js` | UI chrome |
| `evtCtaRaffleIntent` | `team/tools.js`, `rsvp.js` | CTA raffle-after-RSVP |
| `window.__evtTeamToolsCtx` | `detail/post-render.js` | Team Tools panel |

### 1.9 Audit finding — inline handler without confirmed owner

| Symbol | Referenced in | Defined in repo? |
| --- | --- | --- |
| `evtMessageHost` | `detail/sections.js` onclick (2×) | **No `function evtMessageHost` found** under `js/portal/events/` or `portal/events.html` |

Smokes only assert the **string** appears in `detail.js` + `detail/sections.js` (`_smoke-phase5h-detail-open-split.js`). Treat as **pre-existing gap** — compat work must not remove the onclick string; implementation PR may need to wire or restore `evtMessageHost` (out of scope for this audit doc).

---

## 2. PortalEvents namespace inventory

### 2.1 Top-level `PortalEvents`

| Key | Owner file | Loaded by `events.html`? |
| --- | --- | --- |
| `initEventsPage` | `init.js` | ✓ (last script) |
| `constants` | `constants.js` | ✓ |
| `raffleModel` | `raffle-model.js` | ✓ |
| `list` | `list.js` | ✓ |
| `detail` | `detail.js` + submodules | ✓ |
| `manage` | `manage/sheet.js` | ✓ |
| `create` | `create/sheet.js` | ✓ |
| `competition` | `competition.js` | ✓ |
| `team` | `team/tools.js`, `team/chat.js` | ✓ |
| `windowExports` | `compat/window-exports.js` | **✗ not in HTML** |
| `inlineHandlers` | `compat/inline-handlers.js` | **✗ not in HTML** |
| `externalGlobals` | `compat/external-globals.js` | **✗ not in HTML** |

`index.js` is loaded first but only seeds `PortalEvents = {}` (no feature APIs).

### 2.2 `PortalEvents.detail` tree (loaded path)

| Submodule | Owner | Primary keys |
| --- | --- | --- |
| `detail` (root) | `detail.js` | `_registry`, `register`, `get`, flat bridges, `open` |
| `detail.data` | `detail/data.js` | `loadContext` |
| `detail.sections` | `detail/sections.js` | `buildRsvpSectionHtml` … `buildPageHeaderActionsHtml` (18) |
| `detail.template` | `detail/template.js` | `build` |
| `detail.postRender` | `detail/post-render.js` | `runBasics`, `renderQrCanvases`, `initInlineMaps`, `runUi` |
| `detail.presentation` | `detail/presentation.js` | `miniMarkdown`, `openLightbox`, `initSectionAnimations`, `startLiveCountdown` |
| `detail.raffleRender` | `detail/raffle-render.js` | `config`, `categories`, `items`, `prizesHtml`, … |
| `detail.mapOverlay` | `detail/map-overlay.js` | `open`, `recenter`, `close` |
| `detail.fragments` | `detail/fragments.js` | `metaRow`, `pill`, `card`, `notice`, `sectionHead` |
| `detail.team` | alias | `detail.team = PortalEvents.team` (from `detail.js`) |

Nested aliases on `PortalEvents.detail` for `presentation`, `raffleRender`, `mapOverlay`, `fragments`, `data`, `sections`, `postRender`, `template` are assigned at end of `detail.js` IIFE when submodule objects exist.

### 2.3 `PortalEvents.team`

| Submodule | Owner | Keys |
| --- | --- | --- |
| `team.tools` | `team/tools.js` | `open`, `closePanel`, `initBottomNav`, `cleanupBottomNav`, … |
| `team.chat` | `team/chat.js` | `open`, `send`, `cleanup`, `ensureChat`, `loadMessages`, `subscribe` |

### 2.4 `detail.register` registry (lazy)

Registered in `detail.js`: `rsvp`, `raffle`, `competition`, `comments`, `documents`, `scrapbook`, `map`.  
`manage` self-registers from `manage/sheet.js` when `detail.register` exists.

---

## 3. Inline handler dependency inventory

Sources: `detail/template.js`, `detail/sections.js`, `detail/raffle-render.js`, `team/tools.js` (CTA HTML), plus `init.js` / list card handlers.

### 3.1 Hard-required globals (onclick / HTML string — must exist at click time)

These **must** remain on `window` (or global scope) for current markup. Removing or renaming without HTML migration **breaks production**.

| Group | Handlers |
| --- | --- |
| **Navigation** | `evtNavigateToList`, `evtNavigateToEvent`, `evtOpenDetail` |
| **RSVP / waitlist** | `evtHandleRsvp`, `evtJoinWaitlist`, `evtLeaveWaitlist`, `evtClaimWaitlistSpot`, `evtRequestGraceRefund` |
| **Raffle** | `evtHandleRaffleEntry`, `evtHandleFreeRaffleEntry` |
| **Host actions** | `evtUpdateStatus`, `evtCancelEvent`, `evtRescheduleEvent`, `evtDuplicateEvent`, `evtDeleteEvent`, `EventsManage.open` (often `window.EventsManage.open`) |
| **Team** | `evtOpenTeamToolsPanel`, `evtCloseCtaPanel` (CTA internals) |
| **Presentation** | `evtOpenLightbox`, `evtOpenFullscreenMap` |
| **Comments** | `evtPostComment` |
| **Share / calendar** | `evtCopyShareUrl`, `evtDownloadIcs` |
| **Competition / docs / scrapbook / scanner** | `evtJoinCompetition`, `evtSubmitEntry`, … (per section HTML from other modules); `evtOpenScanner`, `evtOpenDocumentsPanel`, `evtUploadPhoto`, `evtViewPhoto`, … |

### 3.2 Compatibility-only globals

Symbols that exist primarily for **Phase 3B bridges**, smokes, or discoverability — not referenced in detail template onclick strings:

| Symbol | Role |
| --- | --- |
| Flat `PortalEvents.detail.*` mirrors of `window.evt*` | Backward compatibility / namespace discovery |
| `evtInitHeroCollapse`, `evtCleanupHeroCollapse` | No-op stubs; external callers must not throw |
| `evtStartLiveCountdown` | Exported; sidebar countdown uses inline `_tickCd` in `post-render.js` instead |
| `evtBuildDetailHostControlsHtml`, `evtBuildDetailAttendeeBreakdownHtml` | Still on `window` from `sections.js`; **orchestrator no longer calls** (5I.2) |
| `PortalEvents.detail.register('*')` lazy refs | Indirection for future module entry |

### 3.3 Can eventually move behind namespace calls (not before 5L gate)

Requires **HTML or template string migration** — do not do in compat-only PR:

| Current pattern | Target |
| --- | --- |
| `onclick="evtHandleRsvp('…')"` | `onclick="PortalEvents.detail…"` or data-attribute delegation |
| `onclick="evtOpenTeamToolsPanel('…')"` | `PortalEvents.team.tools.open(…)` |
| `window.EventsManage.open(…)` | `PortalEvents.manage.open(…)` (already mirrored) |

Phase **5L** module entry may centralize exports but **must keep** classic `window.evt*` aliases until a dedicated HTML migration phase.

---

## 4. Existing compat files

| File | Exposes | Loaded by `portal/events.html`? | Runtime role today |
| --- | --- | --- | --- |
| `compat/window-exports.js` | `PortalEvents.windowExports` — `installWindowExports`, `assignGlobals`, `preserveClassicGlobal` | **No** | Dormant installer API; **never called** on live path |
| `compat/inline-handlers.js` | `PortalEvents.inlineHandlers` — `installInlineHandlers`, `EXPECTED_HANDLER_GROUPS` | **No** | Dormant; documents expected handler groups (rsvp, raffle, detail, scanner, …) |
| `compat/external-globals.js` | `PortalEvents.externalGlobals` — `getSupabaseClient`, `getCheckAuth`, `getQRCode`, `getLeaflet`, … | **No** | Dormant accessors for **site** globals (`supabaseClient`, `checkAuth`, …) |

`test/_verify-events-live-globals.js` treats `PortalEvents.windowExports`, `PortalEvents.inlineHandlers`, and `PortalEvents.externalGlobals` as **absent** on production — confirming compat is **not** wired.

**Important:** Calling `installWindowExports()` without a carefully built API object could **duplicate or overwrite** namespaces already assigned by owner scripts. Any load-order change must be gated by new smokes and live QA.

---

## 5. Recommendation (Options A–D)

| Option | Summary | Verdict |
| --- | --- | --- |
| **A** — Leave globals as-is; proceed straight to Phase 5L readiness | Lowest churn; exports already work | **Partial** — acceptable only after **5J.1** smoke proves export map; skips dormant compat alignment |
| **B** — Phased compat: inventory smoke → optional `detail/exports.js` → gated `window-exports` / 5L bootstrap | Matches existing compat files + live verifier contract | **Recommended** |
| **C** — `detail/exports.js` only | Consolidates bridges; does not address list/manage/init or compat installers | **Supplement to B**, not alone |
| **D** — Defer compat; refactor list/manage/create first | Detail track just finished | **Not recommended** as next gate |

**Selected strategy: Option B (phased).**

Rationale:

1. Owner-file exports are **complete and live-verified** — no urgent runtime fix.
2. Compat files are **stale relative to 5I** (handler groups omit post-render symbols, template builders, team chat).
3. Phase **5L** needs a **frozen export manifest** — 5J.1 smoke provides that without changing HTML.
4. Loading `window-exports.js` in `events.html` **before** inventory risks subtle overwrites — defer to **5J.3** or 5L bootstrap.

---

## 6. Proposed implementation plan (if approved)

| Slice | Scope | `portal/events.html`? | Behavior change? |
| --- | --- | --- | --- |
| **5J.1** | Add `test/_smoke-phase5j-compat-exports.js` — assert export map, compat **not** in HTML, critical handlers present, `detail.js` bridges, live-absent `windowExports`/`inlineHandlers`/`externalGlobals` on production path | **No** | **No** |
| **5J.2** (optional) | Create `detail/exports.js` — move flat `detail.*` bridge block from end of `detail.js`; one new script tag **after** submodules, **before** `detail.js` | **Yes** (one tag) | **No** (move only) |
| **5J.3** (gate) | Wire `compat/window-exports.js` only if 5L bootstrap needs central install — call `installWindowExports` from module entry with **preserve** semantics (`replaceClassicGlobals: false`) | **Yes** (when approved) | **Risk** — requires full smoke + live QA |
| **5L readiness audit** | Separate doc: script order, `index.js` entry, which globals module importers need | Doc only first | **No** |
| **5L module entry** | Single `type="module"` entry in `index.js` | **Yes** | **Last** — after 5J.1 (+ optional 5J.2) |

**Do not** remove existing `window.evt*` or `Events*` globals in any 5J slice.

---

## 7. No-go criteria (implementation phase)

Do **not** combine in one PR:

- Compat runtime wiring (`events.html` compat tags or `installWindowExports` without gate)
- Phase 5L module entry (`type="module"`)
- List / manage / create refactors
- Runtime behavior changes (RSVP rules, template markup, raffle logic)
- Removal of legacy globals
- Unrelated CSS / `md/**` / docs cleanup

---

## 8. Required tests

### Current gate (unchanged — run before/after any 5J implementation)

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

### Recommended new smoke — `test/_smoke-phase5j-compat-exports.js`

| Check category | Examples |
| --- | --- |
| **HTML** | `portal/events.html` does **not** load `compat/window-exports.js`, `compat/inline-handlers.js`, `compat/external-globals.js` (until explicit 5J.3 approval) |
| **Detail owners** | Each post–5I module assigns expected `window.evt*` + `PortalEvents.detail.*` |
| **Bridges** | `detail.js` contains `detail.loadContext`, `detail.buildTemplate`, `detail.runPostRenderUi`, nested `detail.sections` / `detail.template` aliases |
| **Team** | `window.evtOpenTeamToolsPanel`, `PortalEvents.team.tools.open` |
| **Init barrel** | `init.js` still assigns `window.evtHandleRsvp`, `window.PortalEvents.initEventsPage` |
| **Inline preservation** | Reuse or extend handler name list from `_smoke-phase5h-detail-open-split.js` |
| **Negative** | `installWindowExports` not invoked from loaded portal scripts (static scan) |

Optional: extend `_verify-events-live-globals.js` with post–5I export checks (separate PR).

---

## 9. Final go / no-go

| Question | Answer |
| --- | --- |
| **Should compat wiring happen before Phase 5L readiness?** | **Yes** for **5J.1** (export manifest smoke + audit approval). **Optional** for **5J.2** bridge consolidation. **5J.3** / `window-exports.js` in HTML only if 5L bootstrap requires it — not required solely because compat files exist. |
| **Exact first implementation slice** | **5J.1** — `test/_smoke-phase5j-compat-exports.js` + refresh `EXPECTED_HANDLER_GROUPS` in `inline-handlers.js` (inventory only). **No** `portal/events.html` change. |
| **What remains blocked** | Phase **5L** module entry; any global removal; onclick → namespace migration; loading compat installers without 5J.1 green + live QA |

**Go** for Phase **5J.1** documentation and smoke (after this audit doc is committed).  
**No-go** for compat HTML wiring, Phase 5L, and combined refactors until explicit approval per slice.

---

## Appendix — `portal/events.html` script order (reference)

Classic scripts only; `init.js` last:

```text
index.js → constants.js → state.js → utils.js → raffle-model.js → list.js
→ team/chat.js → team/tools.js
→ detail/presentation.js → detail/raffle-render.js → detail/map-overlay.js
→ detail/fragments.js → detail/data.js → detail/sections.js
→ detail/post-render.js → detail/template.js → detail.js
→ comments.js → rsvp.js → create.js → create/sheet.js → documents.js
→ map.js → scanner.js → raffle.js → competition.js → scrapbook.js
→ manage/sheet.js → init.js
```

**Checkpoint chain:** 5I complete (`031`, `032`) → **5J audit (this doc)** → 5J.1 smoke → optional 5J.2 exports → 5L readiness audit → 5L module entry.
