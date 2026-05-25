# Phase 5M.1.1 — Create Geocode Extraction (Completion Status)

**Document:** `055_phase_5m1_1_geocode_extraction_completion.md`  
**Path:** `docs/audit/pages/events/055_phase_5m1_1_geocode_extraction_completion.md`  
**Date:** 2026-05-21  
**Status:** **Complete** — geocode module extracted; smokes green; ready for next create slice approval  
**Approval:** `054_phase_5m1_0_create_implementation_approval.md` (`d04bef2`)  
**Implementation:** `0ee3794` — Extract Events create geocode helpers  
**Prior checkpoint:** `053_phase_5m0_loader_aware_smoke_alignment_completion.md` (`d99539f`)

---

## 1. Completion Summary

Phase **5M.1.1 — geocode extraction** is **complete**.

| Milestone | Commit | What shipped |
| --- | --- | --- |
| **5M.1.0 approval** | `d04bef2` | Create-track planning; **5M.1.1** slice approved |
| **5M.1.1 implementation** | `0ee3794` | `create/geocode.js` + loader + smoke updates |

| Property | Value |
| --- | --- |
| **Geocode module** | `js/portal/events/create/geocode.js` (new) |
| **Public API** | **`window.evtGeocodeAddress`** preserved (plus helper exports) |
| **Product behavior** | **No intentional change** — same geocode flow for sheet + legacy modal |
| **`portal/events.html`** | **Unchanged** (3-tag model) |
| **`list.js` / `manage/sheet.js`** | **Unchanged** |
| **`css/**`** | **Unchanged** |
| **5M.1.2+** | **Not started** |
| **5L.4** | **Not started** |

---

## 2. Files Changed in Implementation (`0ee3794`)

| File | Change |
| --- | --- |
| `js/portal/events/create/geocode.js` | **Created** — IIFE; geocode helpers + `window.*` assignments |
| `js/portal/events/create.js` | **Reduced** — geocode bodies removed; calls `window.evtGeocodeAddress` |
| `js/portal/events/classic-chain-loader.js` | **Updated** — `create/geocode.js` before `create.js`; 28 middle scripts |
| `test/_smoke-phase3d-create-bridge.js` | **Updated** — geocode module + chain order assertions |
| `test/_smoke-phase5l-readiness.js` | **Updated** — 28-chain + `create/geocode.js` → `create.js` → `create/sheet.js` |
| `test/_smoke-phase5l3-rehearsal.js` | **Updated** — 28-chain + create geocode order |

**Not changed:** `portal/events.html`, `create/sheet.js` (behavior via existing `window.evtGeocodeAddress` call), `list.js`, `manage/sheet.js`, `evtHandleCreate` insert logic.

---

## 3. Extracted API

### 3.1 Functions moved to `create/geocode.js`

| Function | Role |
| --- | --- |
| `evtExpandAddress` | US address abbreviation expansion |
| `evtGeocodeCensus` | Census / edge-function geocode |
| `evtGeocodeNominatim` | OSM Nominatim fallback |
| **`evtGeocodeAddress`** | **Primary public API** — multi-source geocode orchestration |

### 3.2 Constants moved

| Constant | Role |
| --- | --- |
| `STREET_ABBREVS` | Street-type abbreviation map |
| `STATE_ABBREVS` | US state abbreviation map |

### 3.3 Window exports (preserved)

```text
window.evtExpandAddress
window.evtGeocodeCensus
window.evtGeocodeNominatim
window.evtGeocodeAddress
```

### 3.4 Remaining in `create.js` (legacy modal location UI)

| Symbol | Role |
| --- | --- |
| `evtSetLocationIcon` | Legacy `#createModal` location icon states |
| `evtSetLocationStatus` | Legacy location status text |
| `evtValidateLocation` | Debounced/blur validation (uses `window.evtGeocodeAddress`) |
| `evtInitLocationValidation` | Wires `#eventLocation` listeners |
| `_evtLocGeoCache` | Publish-time geocode cache for legacy form |

**Consumers unchanged:**

- `create/sheet.js` — `_doGeocode` → `window.evtGeocodeAddress`
- `create.js` — `evtValidateLocation` / `evtHandleCreate` → `window.evtGeocodeAddress`

---

## 4. Loader Chain Update

### 4.1 Production 3-tag model (unchanged HTML)

```text
portal/events.html
  1. index.js
  2. classic-chain-loader.js
  3. init.js
```

### 4.2 Middle chain excerpt (create)

```text
… → rsvp.js → create/geocode.js → create.js → create/sheet.js → documents.js → …
```

| Property | Value |
| --- | --- |
| **Middle script count** | **28** (was 27 before 5M.1.1) |
| **New entry** | `create/geocode.js` immediately **before** `create.js` |
| **Order preserved** | `create.js` still **before** `create/sheet.js` |
| **`portal/events.html`** | **Not modified** — loader-only wiring |

---

## 5. Validation Summary

All commands run against commit **`0ee3794`**.

### 5.1 Syntax checks

| Command | Result |
| --- | --- |
| `node --check js/portal/events/create/geocode.js` | **OK** |
| `node --check js/portal/events/create.js` | **OK** |
| `node --check js/portal/events/create/sheet.js` | **OK** |
| `node --check js/portal/events/classic-chain-loader.js` | **OK** |

### 5.2 Primary create / gate smokes

| Command | Result |
| --- | --- |
| `node test/_smoke-phase3d-create-bridge.js` | **83 / 83 PASS** |
| `node test/_smoke-phase3a-list-bridge.js` | **PASS** |
| `node test/_smoke-phase3c-manage-bridge.js` | **PASS** |
| `node test/_smoke-phase3b-detail-bridge.js` | **PASS** |
| `node test/_smoke-phase1-bridge.js` | **PASS** |
| `node test/_smoke-phase5l-readiness.js` | **PASS** (28-chain) |
| `node test/_smoke-phase5l3-rehearsal.js` | **PASS** |

### 5.3 Regression smokes (5M.1.1 closeout)

| Command | Result |
| --- | --- |
| `node test/_smoke-phase5h-detail-open-split.js` | **PASS** |
| `node test/_smoke-phase5h6-post-render-bridge.js` | **PASS** |
| `node test/_smoke-phase5i-template-shell.js` | **PASS** |
| `node test/_smoke-phase5j-compat-exports.js` | **PASS** |
| `node test/_smoke-event-team-tools-ui.js` | **PASS** |
| `node test/_smoke-event-team-chat-ui.js` | **PASS** |
| `node test/_smoke-portal-event-raffle-rsvp-parity.js` | **PASS** |

### 5.4 Manual QA

| Item | Status |
| --- | --- |
| Portal Events → Create → When & Where geocode | **Not run** in implementation session |
| `window.evtGeocodeAddress` callable | **Optional follow-up** on staging/production |

Suggested manual checks if desired:

1. Open portal Events → Create (`EventsCreate` sheet).
2. When & Where step → enter address → confirm geocode resolves.
3. Confirm no console errors on open/geocode.
4. Legacy `#createModal` path: confirm `evtValidateLocation` still works if exercised.

---

## 6. Exit Criteria (from `054` §6)

| Criterion | Met? |
| --- | :---: |
| Geocode module loads before `create.js` / `create/sheet.js` | ✓ |
| `window.evtGeocodeAddress` preserved | ✓ |
| **3D** smoke passes | ✓ |
| **5L readiness** passes | ✓ |
| **Phase 1 bridge** passes | ✓ |
| No `portal/events.html` diff | ✓ |
| No `list` / `manage` diff | ✓ |
| No `evtHandleCreate` / sheet UI changes | ✓ |

**5M.1.1 exit criteria: satisfied.**

---

## 7. Current Status

| Track | Status |
| --- | --- |
| **5M.0** smoke baseline | **Complete** |
| **5M.1.1** geocode extraction | **Complete** (`0ee3794`) |
| **5M.1.2** sheet step extraction | **Not started** — needs `056` approval |
| **5M.1.3–5M.1.6** | **Not started** |
| **5M.2 list / 5M.3 manage** | **Not started** |
| **5L.4** | **Not started** |

```text
054 approve 5M.1 → 0ee3794 geocode → 055 complete (this doc)
  → 056 approve 5M.1.2 (next) → implementation PR
```

---

## 8. Recommended Next Gate

| Doc (proposed) | Purpose |
| --- | --- |
| **`056_phase_5m1_2_sheet_steps_approval.md`** | Approve **5M.1.2** — sheet step module extraction |

### 8.1 Suggested next slice preview (not approved here)

**5M.1.2** would likely split `create/sheet.js` step rendering/wiring into focused modules, for example:

| Module (proposed) | Scope |
| --- | --- |
| **Basics step** | `_basicsHtml`, `_wireBasics`, step-1 validation |
| **When / location step** | `_whenHtml`, `_wireWhen`, `_doGeocode` integration |
| **Pricing step** | `_pricingHtml`, `_wirePricing`, raffle toggle wiring |
| **Review step** | `_reviewHtml`, `_wireReview`, publish/draft affordances |

**Do not** combine **5M.1.2** with raffle builder (**5M.1.3**), submit/storage (**5M.1.4**), or legacy `create.js` split (**5M.1.5**) in one PR.

---

## 9. No-Go Reminders (post-5M.1.1)

- Do **not** combine **5M.1.2** with **5M.1.3** raffle builder extraction.
- Do **not** combine create work with **list** or **manage** refactors.
- Do **not** combine with **5L.4** or **CSS cleanup**.
- Do **not** modify **production** `portal/events.html` without a new approval gate.
- Do **not** treat **`055`** as approval for **5M.1.2** implementation.

---

## 10. Rollback Reference

Revert geocode extraction only:

```bash
git revert 0ee3794
```

Restores inline geocode in `create.js` and 27-script loader chain. Re-run §5 smokes after revert.

---

## 11. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/055_phase_5m1_1_geocode_extraction_completion.md
git add docs/audit/pages/events/055_phase_5m1_1_geocode_extraction_completion.md
git diff --staged --name-only
git commit -m "Add Phase 5M.1.1 geocode extraction completion"
git push
```

---

## Appendix — Quick reference

| Question | Answer |
| --- | --- |
| Is 5M.1.1 done? | **Yes** (`0ee3794`) |
| Where is geocode? | `js/portal/events/create/geocode.js` |
| Public API? | `window.evtGeocodeAddress` |
| Chain count? | **28** middle scripts |
| Next approval doc? | **`056_phase_5m1_2_sheet_steps_approval.md`** |
