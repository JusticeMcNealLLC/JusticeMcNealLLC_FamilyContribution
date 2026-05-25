# Phase 5M.1.5 — Legacy `create.js` Split (Completion Status)

**Document:** `063_phase_5m1_5_legacy_create_split_completion.md`  
**Path:** `docs/audit/pages/events/063_phase_5m1_5_legacy_create_split_completion.md`  
**Date:** 2026-05-21  
**Status:** **Complete** — legacy create modules split; smokes green; ready for create-path decision gate  
**Approval:** `062_phase_5m1_5_legacy_create_split_approval.md` (`274f919`)  
**Implementation:** `d76113d` — Split Events legacy create modules  
**Prior checkpoint:** `061_phase_5m1_4_submit_storage_completion.md` (`2ecec93`, impl `ecced37`)

---

## 1. Completion Summary

Phase **5M.1.5 — legacy `create.js` split** is **complete**.

| Milestone | Commit | What shipped |
| --- | --- | --- |
| **5M.1.5 approval** | `274f919` | Legacy create split scope approved (`062`) |
| **5M.1.5 implementation** | `d76113d` | Four `create/legacy-*.js` modules + thin `create.js` facade + loader/smokes |

| Property | Value |
| --- | --- |
| **Legacy modules** | `legacy-costs.js`, `legacy-location.js`, `legacy-preview.js`, `legacy-submit.js` |
| **`create.js`** | **Thin facade** — comments only; no moved function bodies |
| **`#createModal`** | **Preserved** — not removed or unified |
| **Default create UX** | **Unchanged** — `EventsCreate` sheet remains primary (`create/sheet.js`) |
| **Product behavior** | **No intentional change** — same legacy modal, LLC/competition, preview, post-create flow |
| **`portal/events.html`** | **Unchanged** (3-tag model) |
| **`create/sheet.js` / submit / raffle / steps** | **Unchanged** |
| **`list.js` / `manage/sheet.js`** | **Unchanged** |
| **`css/**`** | **Unchanged** |
| **5M.1.6** | **Not started** |
| **5M.2 / 5M.3 / 5L.4** | **Not started** |

---

## 2. Files Changed in Implementation (`d76113d`)

| File | Change |
| --- | --- |
| `js/portal/events/create/legacy-costs.js` | **Created** — LLC cost builder |
| `js/portal/events/create/legacy-location.js` | **Created** — legacy location validation + geo cache |
| `js/portal/events/create/legacy-preview.js` | **Created** — preview open/close |
| `js/portal/events/create/legacy-submit.js` | **Created** — `evtHandleCreate` + member/LLC/competition paths |
| `js/portal/events/create.js` | **Reduced** — thin facade / compatibility comments only |
| `js/portal/events/classic-chain-loader.js` | **Updated** — legacy modules after geocode, before `create.js`; **38** middle scripts |
| `test/_smoke-phase3d-create-bridge.js` | **Updated** — legacy modules, globals, 38-chain, facade checks |
| `test/_smoke-phase5l-readiness.js` | **Updated** — 38-chain + legacy order |
| `test/_smoke-phase5l3-rehearsal.js` | **Updated** — 38-chain + legacy order |

**Not changed:** `portal/events.html`, `create/sheet.js`, `create/submit.js`, `create/raffle-builder.js`, `create/step-*.js`, `create/geocode.js`, `list.js`, `manage/sheet.js`, `css/**`, `init.js`.

---

## 3. Legacy Modules Summary

All modules use classic script style (IIFE, `'use strict'`, no `import`/`export`). Public APIs are assigned to **`window`** for `init.js` listeners and inline `onclick` / `onchange` handlers in generated HTML.

### 3.1 `create/legacy-costs.js`

| Area | Detail |
| --- | --- |
| **Role** | LLC cost breakdown builder for `#createModal` |
| **State** | `window.evtCostItems` (array of cost line items) |
| **Functions** | `evtToggleLlcFields`, `evtAddCostItem`, `evtRemoveCostItem`, `evtRenderCostItems`, `evtUpdateCostItem`, `evtRecalcCostSummary` |
| **Inline handlers** | Generated cost rows use `onclick="evtRemoveCostItem(...)"`, `onchange="evtUpdateCostItem(...)"` — globals must remain on `window` |
| **Dependencies** | `evtEscapeHtml`, `formatCurrency` (`utils.js`) |

### 3.2 `create/legacy-location.js`

| Area | Detail |
| --- | --- |
| **Role** | Live address validation on `#eventLocation` in legacy modal |
| **State** | `window._evtLocGeoCache` — `{ address, result }` for publish-time reuse |
| **Functions** | `evtSetLocationIcon`, `evtSetLocationStatus`, `evtValidateLocation`, `evtInitLocationValidation` |
| **Geocode** | Calls **`window.evtGeocodeAddress`** (`create/geocode.js`); does not reimplement geocode |
| **Wiring** | `init.js` calls `evtInitLocationValidation()` at boot |

### 3.3 `create/legacy-preview.js`

| Area | Detail |
| --- | --- |
| **Role** | Legacy form preview in `#eventsDetailView` |
| **Functions** | `evtHandlePreview`, `evtClosePreview` |
| **Behavior** | Hides `#createModal`, shows preview HTML; **Back to Editor** uses inline `onclick="evtClosePreview()"` |
| **Dependencies** | `evtBannerFile`, `evtToggleModal`, `evtEscapeHtml` |

### 3.4 `create/legacy-submit.js`

| Area | Detail |
| --- | --- |
| **Role** | `#createEventForm` submit — legacy publish path |
| **Function** | `evtHandleCreate` (async) |
| **Event types** | `member`, `llc`, `competition` via `#eventType` |
| **Uploads** | `evtBannerFile` / `evtEmbedImageFile` → `event-banners` bucket |
| **Side tables** | `event_cost_items` (LLC), `competition_phases` (competition) |
| **Geocode** | Uses `window._evtLocGeoCache` or live `window.evtGeocodeAddress` |
| **Post-create** | `evtToggleModal('createModal', false)`; **`await evtLoadEvents()`**; **`evtNavigateToEvent(data.slug)`** |
| **Not added** | **`events:created`** dispatch (legacy path never had it; unchanged) |

### 3.5 `create.js` (facade)

| Area | Detail |
| --- | --- |
| **Role** | Compatibility slot in loader chain; documents module locations |
| **Content** | Header comments only — **no** function implementations |
| **Loader** | Still loaded **after** legacy modules, **before** step modules |

---

## 4. Public Globals Preserved

| Global | Module |
| --- | --- |
| `window.evtHandleCreate` | `legacy-submit.js` |
| `window.evtToggleLlcFields` | `legacy-costs.js` |
| `window.evtAddCostItem` | `legacy-costs.js` |
| `window.evtRemoveCostItem` | `legacy-costs.js` |
| `window.evtRenderCostItems` | `legacy-costs.js` |
| `window.evtUpdateCostItem` | `legacy-costs.js` |
| `window.evtRecalcCostSummary` | `legacy-costs.js` |
| `window.evtSetLocationIcon` | `legacy-location.js` |
| `window.evtSetLocationStatus` | `legacy-location.js` |
| `window.evtValidateLocation` | `legacy-location.js` |
| `window.evtInitLocationValidation` | `legacy-location.js` |
| `window.evtHandlePreview` | `legacy-preview.js` |
| `window.evtClosePreview` | `legacy-preview.js` |
| `window.evtCostItems` | `legacy-costs.js` |
| `window._evtLocGeoCache` | `legacy-location.js` |

**Also unchanged:** `window.evtGeocodeAddress` (`create/geocode.js`), `window.EventsCreate` / `window.PortalEvents.create` (`create/sheet.js`), `window.EventsCreateSubmit` (`create/submit.js`).

---

## 5. Loader Chain Update

### 5.1 Production 3-tag model (unchanged HTML)

```text
portal/events.html
  1. index.js
  2. classic-chain-loader.js
  3. init.js
```

### 5.2 Middle chain excerpt (create)

```text
… → rsvp.js
  → create/geocode.js
  → create/legacy-costs.js
  → create/legacy-location.js
  → create/legacy-preview.js
  → create/legacy-submit.js
  → create.js
  → create/step-basics.js
  → create/step-when.js
  → create/step-pricing.js
  → create/step-review.js
  → create/raffle-builder.js
  → create/submit.js
  → create/sheet.js
  → documents.js → …
```

| Property | Value |
| --- | --- |
| **Middle script count** | **38** (was 34 after 5M.1.4; +4 legacy modules) |
| **Legacy insertion** | After `create/geocode.js`, **before** `create.js` |
| **`create.js`** | Remains in chain as thin facade |
| **`portal/events.html`** | **Not modified** — loader-only wiring |

---

## 6. Validation Summary

All commands run against commit **`d76113d`**.

### 6.1 Syntax checks

| Command | Result |
| --- | --- |
| `node --check js/portal/events/create.js` | **OK** |
| `node --check js/portal/events/create/legacy-costs.js` | **OK** |
| `node --check js/portal/events/create/legacy-location.js` | **OK** |
| `node --check js/portal/events/create/legacy-preview.js` | **OK** |
| `node --check js/portal/events/create/legacy-submit.js` | **OK** |
| `node --check js/portal/events/classic-chain-loader.js` | **OK** |

### 6.2 Primary create / gate smokes

| Command | Result |
| --- | --- |
| `node test/_smoke-phase3d-create-bridge.js` | **146 / 146 PASS** |
| `node test/_smoke-phase5l-readiness.js` | **38 / 38 PASS** (38-chain) |
| `node test/_smoke-phase5l3-rehearsal.js` | **16 / 16 PASS** |
| `node test/_smoke-phase1-bridge.js` | **PASS** |
| `node test/_smoke-phase3a-list-bridge.js` | **PASS** |
| `node test/_smoke-phase3c-manage-bridge.js` | **PASS** |
| `node test/_smoke-phase3b-detail-bridge.js` | **PASS** |

### 6.3 Regression smokes (5M.1.5 closeout)

| Command | Result |
| --- | --- |
| `node test/_smoke-phase5h-detail-open-split.js` | **PASS** |
| `node test/_smoke-phase5h6-post-render-bridge.js` | **PASS** |
| `node test/_smoke-phase5i-template-shell.js` | **PASS** |
| `node test/_smoke-phase5j-compat-exports.js` | **PASS** |
| `node test/_smoke-event-team-tools-ui.js` | **PASS** |
| `node test/_smoke-event-team-chat-ui.js` | **PASS** |
| `node test/_smoke-portal-event-raffle-rsvp-parity.js` | **PASS** |

### 6.4 Manual QA

| Item | Status |
| --- | --- |
| Default Create → EventsCreate sheet | **Not run** |
| Legacy `#createModal` + LLC costs + preview + publish | **Optional follow-up** on staging |

---

## 7. Optional Manual QA Recommendation

Quick pass on staging if desired before **5M.1.6 decision**:

1. Open portal **Events** page.
2. Confirm default **Create** opens **EventsCreate sheet** (not legacy modal).
3. If legacy modal path is accessible (`EventsCreate` unavailable or explicit fallback), confirm **`#createModal`** opens.
4. Legacy **location** field: typing/blur still validates via geocode indicator.
5. **LLC** event type: cost rows add/edit/remove/recalculate; inline handlers work.
6. **Preview** opens and **Back to Editor** restores modal.
7. Legacy **Publish** (`evtHandleCreate`) completes without console errors (safe test account).
8. Confirm list refresh + navigation to new event slug after legacy create.
9. Confirm **no console errors** during either create path.

---

## 8. Exit Criteria (from `062`)

| Criterion | Met? |
| --- | :---: |
| Four `create/legacy-*.js` modules in loader after geocode, before `create.js` | ✓ |
| `create.js` reduced to thin facade | ✓ |
| All §4 `window.*` legacy globals preserved | ✓ |
| Sheet / submit / raffle / step modules untouched | ✓ |
| **3D** smoke passes (146 checks) | ✓ |
| **5L readiness / 5L3** pass (38-chain) | ✓ |
| No `portal/events.html` diff | ✓ |
| No `list` / `manage` diff | ✓ |
| No `css/**` diff in implementation commit | ✓ |
| `#createModal` not removed | ✓ |

**5M.1.5 exit criteria: satisfied.**

---

## 9. Current Status

| Track | Status |
| --- | --- |
| **5M.0** smoke baseline | **Complete** |
| **5M.1.1** geocode extraction | **Complete** (`0ee3794`) |
| **5M.1.2** sheet step extraction | **Complete** (`c0ab1da`) |
| **5M.1.3** raffle builder extraction | **Complete** (`d4bfe02`) |
| **5M.1.4** submit/storage extraction | **Complete** (`ecced37`) |
| **5M.1.5** legacy `create.js` split | **Complete** (`d76113d`) |
| **5M.1.6** create-path decision / modal unification | **Not started** |
| **5M.2 list** refactor | **Not started** |
| **5M.3 manage** refactor | **Not started** |
| **5L.4** | **Not started** |

```text
062 approve 5M.1.5 → d76113d legacy split → 063 complete (this doc)
  → 064 approve 5M.1.6 create-path decision (next)
```

**Create-track modularization (5M.1.1–5M.1.5) is structurally complete.** Remaining create work is a **product/technical decision** (5M.1.6), not further mechanical extraction.

---

## 10. Recommended Next Gate

| Doc (proposed) | Purpose |
| --- | --- |
| **`064_phase_5m1_6_create_path_decision_approval.md`** | Approve the next create-track **decision gate**: whether to keep legacy `#createModal`, unify sheet/modal paths, or defer legacy deprecation |

**5M.1.6 should be a product/technical decision document first**, not immediate implementation.

---

## 11. Suggested Next Gate Preview (not approved here)

Compare options in **`064`** before any runtime work:

| Option | Summary |
| --- | --- |
| **A — Status quo** | Keep **EventsCreate sheet** (member) + **legacy modal** (LLC/competition) as-is. Lowest risk; no HTML change. |
| **B — Extend sheet, deprecate later** | Add LLC/competition to **EventsCreate** sheet over time; deprecate `#createModal` in a later phase after parity proof. |
| **C — Long-term dual path** | Keep legacy modal **only** for LLC/competition indefinitely; sheet for member events only. |
| **D — Defer unification** | Close create modularization track; move to **5M.2 list** or **5M.3 manage** refactor next. |

**Do not** approve or implement **5M.1.6** in this document (`063`).

---

## 12. No-Go Reminders (post-5M.1.5)

- Do **not** remove **`#createModal`** without explicit product approval in **`064`**.
- Do **not** combine **5M.1.6** with **list/manage** refactors or **5L.4**.
- Do **not** modify **production** `portal/events.html` without a new approval gate.
- Do **not** combine with **CSS cleanup**.
- Do **not** treat **`063`** as approval for **5M.1.6** implementation.

---

## 13. Rollback Reference

Revert legacy create split only:

```bash
git revert d76113d
```

Restores monolithic `create.js` (~575 lines) and **34-script** loader chain (post–5M.1.4, pre–5M.1.5). Re-run §6 smokes after revert.

---

## 14. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/063_phase_5m1_5_legacy_create_split_completion.md
git add docs/audit/pages/events/063_phase_5m1_5_legacy_create_split_completion.md
git diff --staged --name-only
git commit -m "Add Phase 5M.1.5 legacy create split completion"
git push
```

---

## Appendix — Quick reference

| Question | Answer |
| --- | --- |
| Is 5M.1.5 done? | **Yes** (`d76113d`) |
| Where is legacy create? | `create/legacy-*.js` + thin `create.js` |
| Chain count? | **38** middle scripts |
| Is `#createModal` removed? | **No** |
| Next approval doc? | **`064_phase_5m1_6_create_path_decision_approval.md`** |
