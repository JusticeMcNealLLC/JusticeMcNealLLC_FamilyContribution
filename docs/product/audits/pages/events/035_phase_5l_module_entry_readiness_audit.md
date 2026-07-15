# Events Refactor — Phase 5L Module Entry Readiness Audit

**Document:** `035_phase_5l_module_entry_readiness_audit.md`  
**Date:** 2026-05-23  
**Status:** Audit / planning — **no runtime changes in this step**  
**Latest compat checkpoint:** `034_phase_5j1_compat_inventory_completion_status.md` (`8b23c87` doc, `c365706` code)  
**Related:** `033_phase_5j_compat_export_wiring_audit.md`, `034_phase_5j1_compat_inventory_completion_status.md`, `025_phase_5_remaining_refactor_completion_roadmap.md`, `020_phase_5_readiness_and_execution_plan.md`  
**Scope:** Readiness for future Portal Events **module entry** and `portal/events.html` script consolidation  
**Out of scope:** `portal/events.html` edits, `type="module"` on production, compat runtime load, global removal, list/manage/create refactors, `js/events/**`, schema/RLS

---

## Executive summary

Portal Events is **ready for planning** Phase 5L but **not ready for production script-tag replacement**. The detail stack is thin and export-stable (`5H`–`5I`, `5J.1` smoke). **List**, **manage**, and **create** remain large classic monoliths; boot still depends on **29 sequential classic scripts** and `init.js` registering `DOMContentLoaded → initEventsPage`.

**Recommendation:** **Option B first** — a **readiness / rehearsal module** (or staging-only HTML) that validates boot and export surfaces **without removing classic tags**. Defer **Option C** (replace the script chain) until **5K-style staging** is green and monolith risk is accepted. **Option A** (stop) is valid if product priority shifts. **Option D** (list/manage/create first) reduces 5L blast radius but **delays** HTML consolidation.

**5J.2** (`detail/exports.js`) is **optional**, not a hard blocker — bridges already live in `detail.js` and are frozen by `_smoke-phase5j-compat-exports.js`.

**Go for implementation?** **Conditional go** for **5L.1 rehearsal smoke + optional staging harness only**. **No-go** for production classic-tag removal in the first 5L implementation PR.

---

## 1. Current script order inventory

Source: `portal/events.html` (Events modules block, lines 894–923). **Verified:** no `type="module"` on portal Events scripts; **compat scripts absent**; `init.js` is the last `js/portal/events/*` script before `sw-register.js`.

### External / page shell (before portal Events — not Phase 5L scope)

CDN: QRCode, jsQR, Leaflet, Supabase. Then: `config.js`, nav/helpers, `auth/shared.js`, and four `js/components/events/*` shared modules.

### Portal Events classic scripts (29 tags, in order)

| # | Script | Category |
| --- | --- | --- |
| 1 | `index.js` | Namespace shell (~22 lines; no boot) |
| 2 | `constants.js` | Portal constants |
| 3 | `state.js` | Lexical auth state |
| 4 | `utils.js` | Shared utilities |
| 5 | `raffle-model.js` | `EventsRaffleModel` |
| 6 | `list.js` | **List monolith** (~2,761 lines) |
| 7 | `team/chat.js` | Team Chat |
| 8 | `team/tools.js` | Team Tools / CTA |
| 9 | `detail/presentation.js` | Detail presentation |
| 10 | `detail/raffle-render.js` | Detail raffle rails |
| 11 | `detail/map-overlay.js` | Fullscreen map |
| 12 | `detail/fragments.js` | `_ed*` fragments |
| 13 | `detail/data.js` | Context loader |
| 14 | `detail/sections.js` | Section builders (~588 lines) |
| 15 | `detail/post-render.js` | Post-render hooks |
| 16 | `detail/template.js` | Template shell |
| 17 | `detail.js` | **Detail orchestrator** (~303 lines) |
| 18 | `comments.js` | Comments |
| 19 | `rsvp.js` | RSVP / parity helpers |
| 20 | `create.js` | Create shell |
| 21 | `create/sheet.js` | **Create monolith** (~1,009 lines) |
| 22 | `documents.js` | Documents |
| 23 | `map.js` | Live map section |
| 24 | `scanner.js` | Scanner |
| 25 | `raffle.js` | Raffle draw UI |
| 26 | `competition.js` | Competition (~741 lines) |
| 27 | `scrapbook.js` | Scrapbook |
| 28 | `manage/sheet.js?v=112` | **Manage monolith** (~2,140 lines) |
| 29 | `init.js` | **Bootstrap last** — `DOMContentLoaded`, `initEventsPage`, init barrel exports |

### Summary counts

| Metric | Value |
| --- | --- |
| **Portal Events classic `<script>` tags** | **29** |
| **Detail pipeline scripts** | **9** (`presentation` → `detail.js`) |
| **Team scripts** | **2** (before detail pipeline) |
| **List / manage / create monoliths** | **3** (`list.js`, `create/sheet.js`, `manage/sheet.js`) |
| **Compat scripts in HTML** | **0** (`window-exports`, `inline-handlers`, `external-globals` **not loaded**) |
| **`type="module"` on portal Events** | **None** |
| **`init.js` position** | **Last** among `js/portal/events/*` |

### Boot model today

```text
[29 classic scripts execute in order, each assigning window.evt* / PortalEvents.*]
        ↓
init.js loads last → document.addEventListener('DOMContentLoaded', initEventsPage)
        ↓
initEventsPage (guard: _eventsPageInitialized)
  → checkAuth → profile → evtSetupListeners → evtLoadEvents → evtRouteByUrl → popstate
```

`index.js` comment (line 20–21): *Future Phase 5: call initEventsPage here once HTML is switched to a single module entry* — **not active**.

---

## 2. Module-entry prerequisites

All must be true **before** any production Phase 5L PR that changes `portal/events.html` load model:

| Prerequisite | Current status |
| --- | --- |
| **Export manifest smoke green** | `_smoke-phase5j-compat-exports.js` — **92/92** at `c365706` |
| **Full static gate green** | Phase 1, 3B, 5H, 5H.6, 5I, 5J, team, parity smokes |
| **Inline handler strings preserved** | Frozen in 5H/5J smokes; 16+ hard-required names in template/sections/team |
| **Owner scripts expose `window.evt*`** | Each detail/team/list owner assigns at load; init barrel assigns page actions |
| **`PortalEvents.initEventsPage` + guard** | `init.js`: `_eventsPageInitialized`; `window.PortalEvents.initEventsPage` |
| **Compat dormant OR explicitly gated** | **Dormant** today; any load requires 5J.3 gate + live verifier update |
| **No global removal in first 5L PR** | Required — onclick and legacy callers depend on `window.evt*` |
| **Detail orchestration stable** | 5I.1 + 5I.2 complete; `detail.js` orchestrator only |
| **Staging rehearsal (recommended)** | Per `025` §5K — prove boot before production HTML switch |
| **Rollback plan** | Revert `portal/events.html` to 29-tag list; redeploy prior commit |

### Additional readiness gaps (non-blocking for 5L.1 doc/smoke only)

| Gap | Notes |
| --- | --- |
| **`evtMessageHost`** | Referenced in RSVP HTML; **no implementation** in portal Events — fix in separate PR |
| **`020` script inventory outdated** | Lists pre–5H/5I order (`detail.js` monolith); this doc supersedes for 5L planning |
| **Monolith size** | `list.js` + `manage/sheet.js` still dominate line count and global surface |

---

## 3. Implementation options compared

| Option | Description | Risk | Verdict |
| --- | --- | --- | --- |
| **A — Keep classic scripts; stop** | No Phase 5L; exports frozen by 5J.1 | **None** | Valid if HTML consolidation is deferred indefinitely |
| **B — Module entry + keep classic scripts** | Add `type="module"` rehearsal (or staging HTML) that **imports nothing critical** or only calls `PortalEvents.initEventsPage` after verifying exports — **classic tags remain** | **Low–Medium** | **Recommended first implementation** |
| **C — Replace many tags with one module** | Single entry imports submodules; remove classic tags | **Critical** | **Final target**; not first PR |
| **D — List/manage/create refactors before 5L** | Shrink monoliths first | **Medium** (scope) | Reduces 5L risk; **delays** HTML cleanup |

### Audit decision (aligns with stated preference)

- **Do not replace the classic script chain in the first Phase 5L implementation PR.**
- **First code slice:** **5L.1** — static `_smoke-phase5l-readiness.js` + optional **staging-only** `events.rehearsal.html` or module that runs **after** classic scripts and asserts `PortalEvents` / `initEventsPage` (no tag removal).
- **Production `portal/events.html`:** unchanged until **5L.3** after staging live QA ≥1 cycle (`025` guidance).

**5J.2** is **not required** before 5L.1 — organizational only; export contracts already enforced.

---

## 4. Recommendation — safest Phase 5L path

```text
5L.0  ← this audit doc (complete)
5L.1  ← _smoke-phase5l-readiness.js (+ optional staging rehearsal HTML/module, classic tags stay)
5L.2  ← boot guard test: single initEventsPage path; duplicate-init smoke extension
5L.3  ← production HTML consolidation (ONLY after staging + full live QA)
5L.4  ← compat/window-exports in bootstrap (ONLY if 5L.3 module entry requires it)
```

Optional parallel track (not Phase 5L): **5J.2** `detail/exports.js`, **evtMessageHost** fix, list/manage audits.

---

## 5. Proposed Phase 5L sequence (micro phases)

### 5L.0 — Readiness audit (this document)

| Item | Detail |
| --- | --- |
| **Files created** | `035_phase_5l_module_entry_readiness_audit.md` |
| **Files edited** | None (runtime) |
| **Risk** | None |
| **Tests** | N/A |
| **Live QA** | Not required |
| **Rollback** | N/A |

### 5L.1 — Readiness smoke + optional rehearsal (no production HTML change)

| Item | Detail |
| --- | --- |
| **Files created** | `test/_smoke-phase5l-readiness.js`; optional `portal/events.rehearsal.html` or `js/portal/events/bootstrap.rehearsal.js` (staging/local) |
| **Files edited** | None on production `events.html` |
| **Risk** | **Low** |
| **Tests** | New 5L smoke + full gate including 5J.1 |
| **Live QA** | Optional staging URL only if rehearsal HTML added |
| **Rollback** | Delete rehearsal assets; no production impact |

**Behavior:** Classic chain unchanged. Rehearsal module may call `PortalEvents.initEventsPage()` **once** behind guard to prove namespace path — must not double-fire with `DOMContentLoaded` unless guard proven.

### 5L.2 — Init orchestration hardening

| Item | Detail |
| --- | --- |
| **Files edited** | `init.js` and/or `index.js` (guard comments, optional move of `DOMContentLoaded` registration behind feature flag) |
| **Risk** | **Medium** (double init) |
| **Tests** | Phase 1 bridge + 5L readiness + `_verify-events-live-globals.js` duplicate-init checks |
| **Live QA** | Birthday event + member; list load; **no duplicate** `evtLoadEvents` / double sheets |
| **Rollback** | Revert init/index commit |

### 5L.3 — Controlled `portal/events.html` script consolidation

| Item | Detail |
| --- | --- |
| **Files edited** | `portal/events.html` — reduce script tags (module entry or 3–5 bundles) |
| **Risk** | **Critical** |
| **Prerequisites** | 5L.1–5L.2 green on **staging**; export smoke; live globals verifier |
| **Tests** | Full static battery; update smokes for new HTML |
| **Live QA** | Full checklist (§8) coordinator + member on production after deploy |
| **Rollback** | Revert HTML to 29-tag checkpoint (`034` / this doc §1) |

### 5L.4 — Compat `window-exports` integration (conditional)

| Item | Detail |
| --- | --- |
| **Files edited** | `compat/window-exports.js` caller in module bootstrap; maybe `events.html` +1 compat tag |
| **Risk** | **Medium–High** (overwrite vs preserve) |
| **When** | Only if 5L.3 module bootstrap cannot rely on owner assignments; use `replaceClassicGlobals: false` |
| **Tests** | 5J.1 + 4F smokes; live verifier |
| **Rollback** | Remove compat call; restore owner-only assigns |

---

## 6. No-go criteria (any Phase 5L implementation PR)

- Removing classic `window.evt*` or `EventsManage` / `EventsCreate` globals
- Removing classic `<script>` tags in the **first** 5L implementation PR
- Renaming inline `onclick` handlers (`evtHandleRsvp`, etc.) without HTML migration
- Loading `compat/window-exports.js` in production HTML without explicit 5L.4 gate
- Combining module entry with **list** / **manage** / **create** refactors
- Changing RSVP/raffle business rules as part of 5L
- Touching **`js/events/**`** (public pages) or **`events-dashboard.js`**
- Schema / RLS / Supabase migrations
- Unrelated CSS / `md/**` / docs cleanup in the same PR

---

## 7. Required tests

### Current gate (run before/after every Phase 5L slice)

```bash
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3b-detail-bridge.js
node test/_smoke-phase5h-detail-open-split.js
node test/_smoke-phase5h6-post-render-bridge.js
node test/_smoke-phase5i-template-shell.js
node test/_smoke-phase5j-compat-exports.js
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

### Recommended new smoke — `test/_smoke-phase5l-readiness.js`

Static checks only (no browser):

| Category | Examples |
| --- | --- |
| **HTML** | 29 portal Events scripts; `init.js` last; no `type="module"`; no `compat/` in HTML |
| **Boot** | `init.js` has `_eventsPageInitialized` guard + `PortalEvents.initEventsPage` |
| **Index** | `index.js` does not call `initEventsPage` today |
| **Detail pipeline order** | `post-render.js` → `template.js` → `detail.js` in HTML |
| **5J regression** | Re-export or document that 5J.1 checks remain valid (optional: spawn 5J smoke from CI doc) |
| **Future module** | If `bootstrap.js` added later: must not use native `export` without gate doc update |

Add to gate list in completion docs after 5L.1 lands.

### Live verifier (when runtime loader changes)

```bash
node test/_verify-events-live-globals.js
```

Update `ABSENT_HELPERS` / expected surfaces if compat is intentionally loaded (5L.4).

---

## 8. Live QA plan (required for 5L.2+ runtime/HTML changes; baseline for 5L.3)

**Test event:** `yolanda-adam-and-justin-birthday-celebration-mov3ceo1`  
**Environments:** Staging first for 5L.1–5L.2; production after 5L.3 deploy.

| Area | Checks |
| --- | --- |
| **Boot** | Single init; no duplicate list render; no duplicate create/manage sheet roots |
| **List** | Events list loads; filters; open event card |
| **Detail — admin** | Desktop + mobile layout; hero/lightbox; RSVP; raffle; comments; avatars; maps; countdown |
| **Detail — Team** | Team Tools + Team Chat (isolated if chained flake) |
| **Detail — member** | No Team button; RSVP/raffle CTA; comments/avatars/maps |
| **QR** | No console errors on ineligible paths; eligible path if test account available |
| **Create** | Open create sheet; close; no duplicate sheet root |
| **Manage** | Open manage sheet from host path |
| **Routing** | `?event=slug`; `popstate` back to list |
| **Console / network** | No portal Events JS 4xx; no uncaught errors on exercised paths |

**5L.1 only (smoke doc):** Live QA **not required** — static/inventory.

---

## 9. Final go / no-go

| Question | Answer |
| --- | --- |
| **Should Phase 5L implementation start?** | **Yes, narrowly** — start **5L.1** (readiness smoke ± staging rehearsal). **No** for production script-tag replacement yet. |
| **Exact first implementation slice** | **5L.1** — `test/_smoke-phase5l-readiness.js`; optional staging rehearsal asset; **no** `portal/events.html` change |
| **Is 5J.2 needed first?** | **No** — optional bridge consolidation; not a prerequisite for 5L.1 |
| **What remains blocked** | Production `type="module"` entry; classic tag removal (5L.3); compat runtime (5L.4); global removal; onclick migration; list/manage/create monolith splits (separate tracks) |

**Go** for 5L.1 planning/implementation after this audit doc is committed.  
**No-go** for combining 5L.3 HTML cleanup with any other refactor in one PR.

---

## Appendix — Checkpoint chain

5J.1 complete (`034`, `c365706`) → **5L.0 readiness audit (this doc)** → 5L.1 readiness smoke → 5L.2 init hardening → 5L.3 HTML consolidation → optional 5L.4 compat bootstrap.

**Detail stack (ready for module import design, not yet ES modules):**

```text
detail/data.js → detail/sections.js → (orchestrator pre-template in detail.js)
→ detail/template.js → detail/post-render.js
team/tools.js + team/chat.js (parallel to detail pipeline in HTML order)
```
