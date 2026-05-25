# Phase 5M.1.0 — Create Implementation (Approval)

**Document:** `054_phase_5m1_0_create_implementation_approval.md`  
**Path:** `docs/audit/pages/events/054_phase_5m1_0_create_implementation_approval.md`  
**Date:** 2026-05-21  
**Status:** **APPROVED (gate only)** — authorizes **5M.1.1** as the next runtime PR; **no code in this commit**  
**5M.0 complete:** `053_phase_5m0_loader_aware_smoke_alignment_completion.md` (`d99539f`, impl `9ee6e90`)  
**Create inventory:** `048_create_surface_inventory.md` (`8e6f2c0`)  
**Audit review:** `051_list_manage_create_audit_review.md` (`e8c0024`)

---

## Important: What This Commit Approves

| This commit (`054` doc) | Future implementation PR(s) |
| --- | --- |
| Documentation-only approval | Runtime + optional loader/smoke updates |
| **Does not** modify `js/**`, HTML, CSS, or tests | **5M.1.1** may touch approved files only |
| Approves **create-track planning** | Slices **5M.1.2+** are planned, **not** approved for the next PR |

**Only `5M.1.1` geocode extraction is approved for the immediate next implementation PR.**

---

## 1. Current Baseline

| Item | State |
| --- | --- |
| **Phase 5L** | **Closed** — production 3-tag model (`index.js` → `classic-chain-loader.js` → `init.js`) |
| **Phase 5M.0** | **Complete** — loader-aware 3A/3C/3D (`0604dbb`, `9ee6e90`, `d99539f`) |
| **Smoke baseline** | **Green** — 3A 75/75, 3C 63/63, 3D 73/73; Phase 1, 5L readiness, 5L3, 3B, 5H/5I/5J pass |
| **047 list inventory** | Complete (`59fbe7e`) |
| **048 create inventory** | Complete (`8e6f2c0`) |
| **049 manage inventory** | Complete (`5224f0e`) |
| **050 risk/smoke map** | Complete (`d21d6eb`) |
| **051 audit review** | Complete (`e8c0024`) |
| **5M.1 create implementation** | **Not started** (this doc opens the track) |
| **5M.2 / 5M.3** | **Not started** |
| **5L.4** | **Not started** |

```text
Loader chain (create excerpt):
  … → rsvp.js → create.js → create/sheet.js → documents.js → …
```

---

## 2. Create Surface Summary (from `048`)

| File | Lines (approx.) | Role |
| --- | ---: | --- |
| **`js/portal/events/create.js`** | **625** | Legacy modal path, LLC cost builder, **shared geocoding**, `evtHandleCreate` |
| **`js/portal/events/create/sheet.js`** | **1,009** | Default **`EventsCreate`** 4-step sheet, draft/publish, raffle builder, storage |

### Dual create paths

| Path | Entry | Primary file | Event types |
| --- | --- | --- | --- |
| **A — Sheet (default)** | `#createEventBtn` → `EventsCreate.open()` | `create/sheet.js` | Member (sheet UI); LLC/competition disabled in sheet |
| **B — Legacy modal** | `EventsCreate` missing → `#createModal` / `evtHandleCreate` | `create.js` + HTML form | Member, LLC, competition |

**Cross-dependency:** `create/sheet.js` **`_doGeocode`** calls **`window.evtGeocodeAddress`** defined in **`create.js`** today.

### Geocode-related symbols in `create.js` (extraction target for 5M.1.1)

| Symbol | Role |
| --- | --- |
| `evtExpandAddress` | Address normalization before geocoders |
| `evtGeocodeCensus` | Edge / Census geocode attempt |
| `evtGeocodeNominatim` | OSM fallback |
| **`evtGeocodeAddress`** | **Public API** — used by sheet + legacy location flow |

Legacy-only location UI helpers (`evtSetLocationIcon`, `evtValidateLocation`, `evtInitLocationValidation`) remain in **`create.js`** for **5M.1.1** unless they are direct dependencies of moved geocode helpers (move only what geocode needs).

---

## 3. Approved Create-Track Sequence (Planning)

The following **5M.1.x** sequence is **approved for planning**. **Implementation PR approval is per slice.**

| Phase | Scope | Next PR? |
| --- | --- | :---: |
| **5M.1.1** | **Geocode extraction** | **Yes — approved now** |
| **5M.1.2** | Sheet step module extraction (basics / when / pricing / review) | No — after 5M.1.1 completion doc |
| **5M.1.3** | Raffle builder submodule under `create/` | No |
| **5M.1.4** | `_submit` + storage helpers | No |
| **5M.1.5** | Legacy `create.js` split (LLC costs, `evtHandleCreate` branches) | No |
| **5M.1.6** | Optional unify sheet + modal OR deprecate legacy path | **Product gate** — not technical-only |

**Order rationale (`048`, `051`):** Create is smallest combined surface (~1.6k lines); geocode is the **smallest shared IO boundary** with clear consumers (sheet + legacy).

---

## 4. Approved First Slice: **5M.1.1 — Geocode Extraction**

### 4.1 Approval statement

**APPROVED:** Phase **5M.1.1 — geocode extraction** as the **first create-track runtime PR**.

### 4.2 In scope

| Item | Requirement |
| --- | --- |
| **Source** | Extract geocode helpers from `js/portal/events/create.js` |
| **Target module** | `js/portal/events/create/geocode.js` (preferred) or equivalently named create geocode module under `js/portal/events/create/` |
| **Public API** | **`window.evtGeocodeAddress`** must remain callable with **unchanged behavior** |
| **Consumers** | `create/sheet.js` `_doGeocode` and legacy `create.js` location/geocode callers |
| **Loader order** | New module must load **before** `create.js` and **`create/sheet.js`** need geocode (e.g. insert `create/geocode.js` immediately before `create.js` in `classic-chain-loader.js`) |
| **`create.js`** | Thin orchestrator for LLC/modal/`evtHandleCreate`; may re-export or delegate to geocode module; **no** insert-behavior changes |
| **Smokes** | Update **only as required** — e.g. `test/_smoke-phase3d-create-bridge.js` orphan-file / chain checks for `create/geocode.js`; extend 5L readiness chain list if applicable |

### 4.3 Suggested loader change (implementation PR)

```text
Current:  … → rsvp.js → create.js → create/sheet.js → …
Proposed: … → rsvp.js → create/geocode.js → create.js → create/sheet.js → …
```

`portal/events.html` stays **3-tag** — middle chain update via **`classic-chain-loader.js` only**.

### 4.4 Implementation constraints

- Geocode module: **classic script** (IIFE or top-level assignments), **no** native `export`.
- Assign **`window.evtGeocodeAddress`** (and internal helpers) from the new file.
- Preserve edge-function / fetch behavior in `evtGeocodeCensus`, `evtGeocodeNominatim`, `evtGeocodeAddress`.
- **`create.js`** must not break bare/global calls used by legacy HTML (`onclick` on LLC cost lines unchanged in this slice).

---

## 5. Explicitly Out of Scope for 5M.1.1

| Out of scope | Reason |
| --- | --- |
| **`evtHandleCreate` insert logic** | 5M.1.4+ |
| **`EventsCreate` sheet UI / steps** | 5M.1.2+ |
| **Create form product behavior** | No feature changes |
| **Remove `#createModal`** | Product approval required (`048`) |
| **Unify sheet + legacy modal** | 5M.1.6 product gate |
| **LLC / competition behavior** | Legacy-only path — untouched |
| **`list.js` / `manage/sheet.js`** | Wrong track |
| **`portal/events.html`** | Separate approval gate |
| **5L.4 compat bootstrap** | Different risk profile |
| **CSS cleanup** | Separate PR discipline |
| **5M.1.2+ slices** | Separate approval after completion docs |

---

## 6. Required Validation After 5M.1.1 Implementation

Run on the **5M.1.1 PR** branch before merge.

### 6.1 Syntax / static

```bash
node --check js/portal/events/create.js
node --check js/portal/events/create/sheet.js
node --check js/portal/events/create/geocode.js
node --check js/portal/events/classic-chain-loader.js
```

### 6.2 Smokes (minimum)

```bash
node test/_smoke-phase3d-create-bridge.js
node test/_smoke-phase5l-readiness.js
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3a-list-bridge.js
node test/_smoke-phase3c-manage-bridge.js
node test/_smoke-phase3b-detail-bridge.js
```

### 6.3 Full gate (if practical)

Run repository **Phase 5 gate** / full portal Events smoke suite used at 5M.0 closeout.

---

## 7. QA Expectations (Manual / Staging)

After **5M.1.1** merge, verify on portal Events page:

| Check | Expected |
| --- | --- |
| **Create button** | Opens **`EventsCreate`** sheet (default path) |
| **When & Where geocode** | Sheet step geocode still resolves lat/lng |
| **Legacy modal** | If exercised, **`evtGeocodeAddress`** still available on `window` |
| **Console** | No new errors on open create / geocode |
| **`events:created`** | Publish/draft still dispatches; list still reloads via `init.js` listener |

No dedicated create-publish E2E is required for **5M.1.1** unless regressions are suspected.

---

## 8. Rollback

If geocode behavior or smokes regress after **5M.1.1**:

1. **Revert** the 5M.1.1 implementation commit (loader + `create/geocode.js` + `create.js` edits).
2. **Restore** geocode helpers inline in `create.js` if partial revert is insufficient.
3. Re-run §6 smokes before re-attempting.

Approval doc **`054`** remains valid for a corrected **5M.1.1** retry.

---

## 9. No-Go Reminders

- **One PR** — **5M.1.1 only**; no 5M.1.2+ in the same merge.
- **No** list/manage refactors, **5L.4**, or CSS in the same PR.
- **No** production HTML changes to satisfy tests — use loader chain only.
- **Do not** treat **`054`** as approval for **5M.1.2** or later slices.

---

## 10. Recommended Next Doc

| Doc | Purpose |
| --- | --- |
| **`055_phase_5m1_1_geocode_extraction_completion.md`** | Completion checkpoint after successful **5M.1.1** implementation PR |

**After `055`:** optional **`056_phase_5m1_2_sheet_steps_approval.md`** (or equivalent) before **5M.1.2** code — **not** approved here.

---

## 11. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/054_phase_5m1_0_create_implementation_approval.md
git add docs/audit/pages/events/054_phase_5m1_0_create_implementation_approval.md
git diff --staged --name-only
git commit -m "Approve Phase 5M.1 create implementation"
git push
```

---

## Appendix — Approval summary

| Item | Approved? |
| --- | --- |
| Create-track **planning** (5M.1.1–5M.1.6) | **Yes** (planning) |
| **5M.1.1** geocode extraction PR | **Yes** |
| **5M.1.2+** runtime PRs | **No** — need per-slice approval |
| **5M.2 list / 5M.3 manage** | **No** |
| **5L.4** | **No** |
| **Implementation in this commit** | **No** |
