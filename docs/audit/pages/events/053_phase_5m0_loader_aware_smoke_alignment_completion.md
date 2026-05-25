# Phase 5M.0 — Loader-Aware Smoke Baseline Alignment (Completion Status)

**Document:** `053_phase_5m0_loader_aware_smoke_alignment_completion.md`  
**Path:** `docs/audit/pages/events/053_phase_5m0_loader_aware_smoke_alignment_completion.md`  
**Date:** 2026-05-21  
**Status:** **Complete** — 5M.0 test-only PR merged; static smokes green against 3-tag production model  
**Approval:** `052_phase_5m0_loader_aware_smoke_alignment_approval.md` (`0604dbb`)  
**Implementation:** `9ee6e90` — Align Phase 3 smokes with Events loader chain  
**Prior review:** `051_list_manage_create_audit_review.md` (`e8c0024`)  
**Related:** `050_list_manage_create_risk_smoke_map.md`, `052_phase_5m0_loader_aware_smoke_alignment_approval.md`

---

## 1. Completion Summary

Phase **5M.0 — loader-aware smoke baseline alignment** is **complete**.

| Milestone | Commit | What shipped |
| --- | --- | --- |
| **5M.0 approval** | `0604dbb` | Gate doc — test-only scope authorized |
| **5M.0 implementation** | `9ee6e90` | Phase 3A / 3C / 3D smokes aligned to classic-chain-loader |

| Property | Value |
| --- | --- |
| **PR type** | **Test-only** |
| **`portal/events.html`** | **Unchanged** |
| **`js/portal/events/**`** | **Unchanged** |
| **`css/**`** | **Unchanged** |
| **5M.1 create implementation** | **Not started** |
| **5L.4 compat bootstrap** | **Not started** |
| **list / manage / create runtime refactors** | **Not started** |

The repository smoke baseline now matches the **production 3-tag loader model** before any **5M.1** create-track code work.

---

## 2. Files Changed in 5M.0

| File | Change |
| --- | --- |
| `test/_smoke-phase3a-list-bridge.js` | **Updated** — loader-aware list checks |
| `test/_smoke-phase3c-manage-bridge.js` | **Updated** — loader-aware manage checks (`manage/sheet.js?v=112`) |
| `test/_smoke-phase3d-create-bridge.js` | **Updated** — loader-aware create checks + `create.js` coverage |
| `test/_portal-events-classic-chain.js` | **Unchanged** — existing helpers sufficient |

**No other files** in commit `9ee6e90`.

---

## 3. What Changed

### 3.1 Production load model (recognized by smokes)

```text
portal/events.html
  1. ../js/portal/events/index.js
  2. ../js/portal/events/classic-chain-loader.js   ← 27 middle scripts
  3. ../js/portal/events/init.js
```

Middle modules (`list.js`, `create.js`, `create/sheet.js`, `manage/sheet.js?v=112`, detail pipeline, etc.) are injected by `js/portal/events/classic-chain-loader.js`, not by per-module `<script>` tags in HTML.

### 3.2 Smoke alignment by surface

| Smoke | Before (fragile) | After (5M.0) |
| --- | --- | --- |
| **Phase 3A** (`list.js`) | `html.includes('…/list.js')` | `parseClassicChain` + `isProductionLoaded` for `list.js`; chain membership; 3-tag loader reference |
| **Phase 3C** (`manage/sheet.js`) | Direct HTML tag for `manage/sheet.js` | `isProductionLoaded` for `manage/sheet.js?v=112`; orphan `manage/*.js` via chain |
| **Phase 3D** (`create`) | `events.includes('create/sheet.js')` only | `create.js` + `create/sheet.js` in chain; `chainOrderOk(create.js, create/sheet.js)`; `create.js` geocode/legacy symbol checks |

### 3.3 Helpers used (pattern from Phase 3B)

From `test/_portal-events-classic-chain.js`:

- `parseClassicChain(root)` — reads `classic-chain-loader.js` chain array
- `isProductionLoaded(html, chain, portalSrc)` — HTML tag **or** chain entry
- `chainOrderOk(chain, …)` — used in 3D for create.js → create/sheet.js
- `portalEventsHtmlScripts(html)` — confirms `init.js` last among portal Events HTML tags

### 3.4 Strictness preserved

- IIFE / no native `export` checks unchanged
- `PortalEvents.list` / `PortalEvents.manage` / `PortalEvents.create` bridge key checks unchanged
- `EventsManage`, `EventsCreate`, `_emToggleFeatured`, custom event string checks unchanged
- Phase 1 / 2 / cross-phase regression sections unchanged

---

## 4. Validation Summary

All commands run on the **5M.0 implementation** branch state (commit `9ee6e90`).

### 4.1 Primary 5M.0 smokes

| Command | Result |
| --- | --- |
| `node test/_smoke-phase3a-list-bridge.js` | **75 / 75 PASS** |
| `node test/_smoke-phase3c-manage-bridge.js` | **63 / 63 PASS** |
| `node test/_smoke-phase3d-create-bridge.js` | **73 / 73 PASS** |

### 4.2 Regression smokes (required by `052`)

| Command | Result |
| --- | --- |
| `node test/_smoke-phase1-bridge.js` | **PASS** |
| `node test/_smoke-phase5l-readiness.js` | **PASS** |
| `node test/_smoke-phase5l3-rehearsal.js` | **PASS** |
| `node test/_smoke-phase3b-detail-bridge.js` | **PASS** |

### 4.3 Additional gate smokes (run at 5M.0 closeout)

| Command | Result |
| --- | --- |
| `node test/_smoke-phase5h-detail-open-split.js` | **PASS** |
| `node test/_smoke-phase5h6-post-render-bridge.js` | **PASS** |
| `node test/_smoke-phase5i-template-shell.js` | **PASS** |
| `node test/_smoke-phase5j-compat-exports.js` | **PASS** |
| `node test/_smoke-event-team-tools-ui.js` | **PASS** |
| `node test/_smoke-event-team-chat-ui.js` | **PASS** |
| `node test/_smoke-portal-event-raffle-rsvp-parity.js` | **PASS** |

---

## 5. Exit Criteria (from `052`)

| Criterion | Met? |
| --- | :---: |
| **3A** passes against current **3-tag** `portal/events.html` | ✓ |
| **3C** passes against current **3-tag** `portal/events.html` | ✓ |
| **3D** passes against current **3-tag** `portal/events.html` | ✓ |
| **5L readiness** still passes | ✓ |
| **Phase 1 bridge** still passes | ✓ |
| **5L3 rehearsal** still passes | ✓ |
| **No** `js/portal/events/**` diff in 5M.0 PR | ✓ |
| **No** `portal/events.html` diff in 5M.0 PR | ✓ |
| **No** `css/**` diff in 5M.0 PR | ✓ |

**5M.0 exit criteria: satisfied.**

---

## 6. Current Status

| Track | Status |
| --- | --- |
| **5M.0 loader-aware smoke alignment** | **Complete** (`0604dbb` + `9ee6e90`) |
| **5M.1 create implementation** | **Not started** — needs `054` approval |
| **5M.2 list implementation** | **Not started** |
| **5M.3 manage implementation** | **Not started** |
| **5L.4 compat bootstrap** | **Not started** |
| **Phase 5L** | **Closed** (unchanged) |

```text
046–051 audits → 052 approve 5M.0 → 9ee6e90 implement 5M.0 → 053 complete (this doc)
  → 054 approve 5M.1.0 (next) → 5M.1.1+ code (after 054)
```

---

## 7. Recommended Next Gate

| Doc (proposed) | Purpose |
| --- | --- |
| **`054_phase_5m1_0_create_implementation_approval.md`** | Approve the **first create-track runtime** gate after smoke baseline is clean |

### Planning note (not approved in `053`)

After **`054`** approval, the audit track recommends the first **code** slice:

| Slice (proposed) | Scope | Status |
| --- | --- | --- |
| **5M.1.1** | Extract `evtGeocodeAddress` + helpers from `create.js` into e.g. `create/geocode.js` | **Not approved** — requires `054` + per-slice PR |

**Do not** implement **5M.1.1** or any create split until **`054`** is committed and a focused PR is opened under that scope.

---

## 8. No-Go Reminders (post-5M.0)

- Do **not** combine **create** implementation with **list** or **manage** refactors in one PR.
- Do **not** combine **5M.1** with **5L.4** or **CSS cleanup**.
- Do **not** modify **production** `portal/events.html` or loader chain without a new approval gate.
- Do **not** treat **`053`** as approval for **5M.1.0** or **5M.1.1** — completion only.

---

## 9. Rollback Reference

If a future change breaks loader-aware smokes:

1. Revert test commit(s) — e.g. `git revert 9ee6e90` for 5M.0-only rollback.
2. Approval doc **`052`** and this completion doc **`053`** remain valid for a corrected retry.

---

## 10. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/053_phase_5m0_loader_aware_smoke_alignment_completion.md
git add docs/audit/pages/events/053_phase_5m0_loader_aware_smoke_alignment_completion.md
git diff --staged --name-only
git commit -m "Add Phase 5M.0 smoke alignment completion status"
git push
```

---

## Appendix — Quick reference

| Question | Answer |
| --- | --- |
| Is 5M.0 done? | **Yes** |
| Can 5M.1 code start? | **After `054` approval** |
| Were runtime files touched in 5M.0? | **No** |
| Are 3A/3C/3D green on 3-tag HTML? | **Yes** (75 / 63 / 73) |
