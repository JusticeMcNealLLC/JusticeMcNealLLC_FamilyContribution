# Phase 5M.0 — Loader-Aware Smoke Baseline Alignment (Approval)

**Document:** `052_phase_5m0_loader_aware_smoke_alignment_approval.md`  
**Path:** `docs/audit/pages/events/052_phase_5m0_loader_aware_smoke_alignment_approval.md`  
**Date:** 2026-05-21  
**Status:** **APPROVED (gate only)** — authorizes a **future** test-only PR; **no code in this commit**  
**Prior review:** `051_list_manage_create_audit_review.md` (`e8c0024`)  
**Risk map:** `050_list_manage_create_risk_smoke_map.md` (`d21d6eb`)

---

## Important: What This Commit Approves

| This commit (`052` doc) | Future 5M.0 PR (not started) |
| --- | --- |
| Documentation-only approval record | Test-only smoke updates |
| **Does not** modify tests | **Will** modify `test/_smoke-phase3a|3c|3d-*.js` |
| **Does not** start 5M.0 implementation | Implementation begins only after this approval is merged |

**Phase 5M.0 is approved as a scope definition.** Work may proceed on a **separate** PR that touches only approved test files.

---

## 1. Current Baseline

| Item | State |
| --- | --- |
| **Phase 5L** | **Closed** (`045`, `d483f6a`) |
| **Production load model** | **3** classic tags: `index.js` → `classic-chain-loader.js` (27 middle scripts) → `init.js` |
| **Audit track 046–050** | Complete (`047`–`050` inventories + risk map) |
| **Audit review `051`** | Closes audit track for planning (`e8c0024`) |
| **5M.0 implementation** | **Not started** |
| **5M.1 create implementation** | **Not approved** |
| **5L.4 compat bootstrap** | **Not started** |
| **list / manage / create refactors** | **Not started** |

```text
portal/events.html (production)
  <script src="../js/portal/events/index.js">
  <script src="../js/portal/events/classic-chain-loader.js">
  <script src="../js/portal/events/init.js">
```

Middle modules (`list.js`, `create.js`, `create/sheet.js`, `manage/sheet.js?v=112`, etc.) are injected by `classic-chain-loader.js`, not by per-file tags in HTML.

---

## 2. Why 5M.0 Is Needed

`050` and `051` documented a **smoke baseline mismatch** after Phase 5L.3 Option C:

| Smoke | Legacy assumption | Production today |
| --- | --- | --- |
| **`test/_smoke-phase3a-list-bridge.js`** | `portal/events.html` contains `src="…/list.js"` | `list.js` loaded via **chain only** |
| **`test/_smoke-phase3c-manage-bridge.js`** | Direct `manage/sheet.js` tag in HTML | `manage/sheet.js?v=112` via **chain only** |
| **`test/_smoke-phase3d-create-bridge.js`** | Direct `create/sheet.js` tag in HTML | `create/sheet.js` via **chain only** |

**Already loader-aware (reference pattern):**

- `test/_smoke-phase3b-detail-bridge.js` — uses `test/_portal-events-classic-chain.js`
- `test/_smoke-phase5l-readiness.js` — asserts 3-tag model and chain array

**Why before runtime refactors:**

- First `5M.1` / `5M.2` / `5M.3` PR must not be blocked by **pre-existing** false failures on HTML tag checks.
- Establishes a **green, honest** static gate aligned with production loader truth.
- Reduces risk of misattributing smoke regressions to monolith splits.

---

## 3. Approved 5M.0 Scope

### 3.1 Approval statement

**APPROVED:** Phase **5M.0 — loader-aware smoke baseline alignment**

| Property | Value |
| --- | --- |
| **PR type** | **Test-only** |
| **Runtime** | **No changes** to `js/portal/events/**` |
| **HTML** | **No changes** to `portal/events.html` |
| **CSS** | **No changes** to `css/**` |
| **Refactors** | **No** list / create / manage splits |
| **Compat** | **No** 5L.4 bootstrap |

### 3.2 Expected files to change (future PR)

| File | Required? | Purpose |
| --- | :---: | --- |
| `test/_smoke-phase3a-list-bridge.js` | **Yes** | Loader-aware `list.js` load + orphan `list/` check |
| `test/_smoke-phase3c-manage-bridge.js` | **Yes** | Loader-aware `manage/sheet.js?v=112` + orphan `manage/` check |
| `test/_smoke-phase3d-create-bridge.js` | **Yes** | Loader-aware `create/sheet.js` + **`create.js`** in chain |
| `test/_portal-events-classic-chain.js` | **Optional** | Only if helper gaps block 3A/3C/3D (prefer reuse) |

**Reference implementation:** `test/_smoke-phase3b-detail-bridge.js` + `test/_portal-events-classic-chain.js`.

### 3.3 Expected changes (behavioral requirements)

1. **Replace** direct `html.includes('src="../js/portal/events/…")` load assertions with:
   - `parseClassicChain(root)` from `classic-chain-loader.js`
   - `isProductionLoaded(html, chain, '../js/portal/events/<module>')` for each surface module

2. **Recognize chain-loaded modules** (minimum):
   - `list.js`
   - `create.js` and `create/sheet.js` (3D should assert **both** in chain order: `create.js` before `create/sheet.js`)
   - `manage/sheet.js?v=112` (match loader string exactly, including cache-bust query)

3. **Orphan subdirectory checks** — any `.js` under `js/portal/events/list/`, `create/`, or `manage/` must be listed in the chain (or explicitly in HTML if ever reintroduced), not only in HTML.

4. **Optional but encouraged:**
   - `chainOrderOk(chain, 'list.js', …)` where order matters for create/manage relative to detail/init assumptions
   - Retain existing strict checks: IIFE, no `export`, `PortalEvents.*` keys, internal function string presence, no `type="module"` on portal Events scripts

5. **Keep tests strict** — do not weaken bridge key assertions or remove regression sections; only fix **load-path** detection.

### 3.4 Suggested 3D enhancement (in scope for 5M.0)

`050` noted 5L readiness monolith list omits `create.js`. The 5M.0 PR **may** add:

- `isProductionLoaded` for `../js/portal/events/create.js`
- `chainOrderOk(chain, 'create.js', 'create/sheet.js')`

This is **loader documentation**, not a behavioral create E2E.

---

## 4. Explicitly Out of Scope

The future 5M.0 PR **must not** include:

| Out of scope | Reason |
| --- | --- |
| `js/portal/events/**` runtime edits | 5M.0 is smoke-only |
| `portal/events.html` changes | Separate approval gate required |
| `css/**` changes | Separate track |
| **5L.4** compat bootstrap / Option D | Different risk profile |
| **5M.1** create implementation / geocode extraction | Requires separate approval after 5M.0 **completion** doc |
| **5M.2** list / **5M.3** manage refactors | After 5M.0 exit criteria |
| New product behavior | No feature work |
| Broad test rewrites | No unrelated smokes, no full gate restructure — **loader-awareness only** |
| New Playwright E2E for create publish or manage tabs | Optional later; not required for 5M.0 minimum |
| Changing `classic-chain-loader.js` chain order or count | Runtime change — forbidden in 5M.0 |

---

## 5. Required Validation After 5M.0 Implementation

Run on the **5M.0 test-only PR** branch before merge.

### 5.1 Minimum (must pass)

```bash
node --check test/_smoke-phase3a-list-bridge.js
node test/_smoke-phase3a-list-bridge.js

node --check test/_smoke-phase3c-manage-bridge.js
node test/_smoke-phase3c-manage-bridge.js

node --check test/_smoke-phase3d-create-bridge.js
node test/_smoke-phase3d-create-bridge.js

node test/_smoke-phase1-bridge.js
node test/_smoke-phase5l-readiness.js
node test/_smoke-phase5l3-rehearsal.js
```

### 5.2 Regression (must pass)

| Command | Purpose |
| --- | --- |
| `node test/_smoke-phase3b-detail-bridge.js` | Detail bridge unchanged by 5M.0 pattern |
| `node test/_smoke-phase2-low-risk-modules.js` | Constants/state/utils/raffle-model |

### 5.3 Full gate (run if practical)

Execute the repository **Phase 5 gate** script or documented full smoke sequence used after Phase 5L (all portal Events smokes that ran green at 5L closeout).

**Document results** in `053_phase_5m0_loader_aware_smoke_alignment_completion.md` after merge.

---

## 6. Exit Criteria

5M.0 is **complete** when the **test-only PR** is merged and:

| Criterion | Required |
| --- | :---: |
| **3A** passes against current **3-tag** `portal/events.html` | ✓ |
| **3C** passes against current **3-tag** `portal/events.html` | ✓ |
| **3D** passes against current **3-tag** `portal/events.html` | ✓ |
| **5L readiness** still passes | ✓ |
| **Phase 1 bridge** still passes | ✓ |
| **5L3 rehearsal** still passes | ✓ |
| **No** `js/portal/events/**` diff in the 5M.0 PR | ✓ |
| **No** `portal/events.html` diff in the 5M.0 PR | ✓ |
| **No** `css/**` diff in the 5M.0 PR | ✓ |

---

## 7. Rollback

If smoke baseline alignment causes unexpected gate instability:

1. **Revert** the 5M.0 test-only commit(s) — single revert PR is sufficient.
2. **Do not** revert `052` approval doc unless scope was wrong; the doc remains valid for a corrected 5M.0 attempt.
3. Record failure mode in completion doc or a short audit note before retrying.

**Rollback does not** authorize runtime or HTML changes as a workaround.

---

## 8. Next Steps After 5M.0

| Step | Doc / action | When |
| --- | --- | --- |
| **1** | Merge **5M.0 test-only PR** (this approval scope) | After implementer opens PR |
| **2** | `053_phase_5m0_loader_aware_smoke_alignment_completion.md` | After merge + validation commands green |
| **3** | `054` or `053_phase_5m1_0_create_implementation_approval.md` (naming TBD) | **Only after** 5M.0 complete — first **runtime** create gate |
| **4** | **5M.1.1** geocode extraction PR | **Only after** 5M.1.0 approval — **not** approved here |

```text
052 (this doc) → 5M.0 PR (tests) → 053 completion → 5M.1.0 approval → 5M.1.1+ code
```

**Do not** start create/list/manage implementation before 5M.0 exit criteria are met.

---

## 9. No-Go Reminders (5M.0 PR)

- **One PR** — test loader alignment only; no drive-by test cleanups unless required for green 3A/3C/3D.
- **No** bundling with 5M.1, 5M.2, 5M.3, 5L.4, or CSS.
- **No** staging unrelated workspace files in the 5M.0 PR.
- **No** interpreting this approval as permission to change production HTML to satisfy old smokes.

---

## 10. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/052_phase_5m0_loader_aware_smoke_alignment_approval.md
git add docs/audit/pages/events/052_phase_5m0_loader_aware_smoke_alignment_approval.md
git diff --staged --name-only
git commit -m "Approve Phase 5M.0 loader-aware smoke alignment"
git push
```

---

## Appendix — Approval summary

| Item | Status |
| --- | --- |
| **5M.0 loader-aware smoke alignment** | **APPROVED** (future PR) |
| **5M.0 in this commit** | **Not implemented** |
| **5M.1 create** | **Not approved** |
| **5L.4** | **Not approved** |
| **Runtime / HTML / CSS** | **Forbidden** in 5M.0 PR |
