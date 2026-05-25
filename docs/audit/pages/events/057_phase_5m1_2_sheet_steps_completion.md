# Phase 5M.1.2 — Create Sheet Step Extraction (Completion Status)

**Document:** `057_phase_5m1_2_sheet_steps_completion.md`  
**Path:** `docs/audit/pages/events/057_phase_5m1_2_sheet_steps_completion.md`  
**Date:** 2026-05-21  
**Status:** **Complete** — sheet step modules extracted; smokes green; ready for next create slice approval  
**Approval:** `056_phase_5m1_2_sheet_steps_approval.md` (`8c3cecb`)  
**Implementation:** `c0ab1da` — Extract Events create sheet step modules  
**Prior checkpoint:** `055_phase_5m1_1_geocode_extraction_completion.md` (`15c3692`, impl `0ee3794`)

---

## 1. Completion Summary

Phase **5M.1.2 — sheet step extraction** is **complete**.

| Milestone | Commit | What shipped |
| --- | --- | --- |
| **5M.1.2 approval** | `8c3cecb` | Sheet step module extraction scope approved |
| **5M.1.2 implementation** | `c0ab1da` | Four `create/step-*.js` modules + thin orchestrator + loader/smokes |

| Property | Value |
| --- | --- |
| **Step modules** | `step-basics.js`, `step-when.js`, `step-pricing.js`, `step-review.js` (new) |
| **Orchestrator** | `create/sheet.js` — lifecycle, STATE, raffle builder, submit, bridges |
| **Namespace** | `window.EventsCreateSteps` — per-step `{ html, wire }` + orchestrator API hooks |
| **Product behavior** | **No intentional change** — same 4-step Create sheet UX |
| **`portal/events.html`** | **Unchanged** (3-tag model) |
| **`list.js` / `manage/sheet.js`** | **Unchanged** |
| **`css/**`** | **Unchanged** |
| **5M.1.3+** | **Not started** |
| **5L.4** | **Not started** |

---

## 2. Files Changed in Implementation (`c0ab1da`)

| File | Change |
| --- | --- |
| `js/portal/events/create/step-basics.js` | **Created** — Basics step HTML/wire + image upload |
| `js/portal/events/create/step-when.js` | **Created** — When & Where HTML/wire + geocode |
| `js/portal/events/create/step-pricing.js` | **Created** — Pricing HTML/wire; raffle builder via orchestrator API |
| `js/portal/events/create/step-review.js` | **Created** — Review HTML/wire; raffle review via orchestrator API |
| `js/portal/events/create/sheet.js` | **Reduced** — step render/wire delegated; orchestrator + raffle + submit retained |
| `js/portal/events/classic-chain-loader.js` | **Updated** — four step scripts before `create/sheet.js`; **32** middle scripts |
| `test/_smoke-phase3d-create-bridge.js` | **Updated** — step modules, chain order, orchestrator ownership |
| `test/_smoke-phase5l-readiness.js` | **Updated** — 32-chain + step order |
| `test/_smoke-phase5l3-rehearsal.js` | **Updated** — 32-chain + step order |

**Not changed:** `portal/events.html`, `create.js`, `create/geocode.js`, `list.js`, `manage/sheet.js`, `css/**`.

---

## 3. Extracted Step Modules

All step modules use **classic script** style (IIFE, `'use strict'`, no `import`/`export`). Each registers on **`window.EventsCreateSteps`**.

### 3.1 `step-basics.js` — `EventsCreateSteps.basics`

| Symbol | Role |
| --- | --- |
| `html` | Basics step markup (type, title, category, description, banner/embed) |
| `wire` | Event listeners for basics fields |
| `_wireImageUpload` | Banner + embed drag/drop and file pickers (step-local helper) |

Uses orchestrator API: `getState`, `render`, `esc`, `CATEGORIES`.

### 3.2 `step-when.js` — `EventsCreateSteps.when`

| Symbol | Role |
| --- | --- |
| `html` | When & Where markup (dates, timezone, location, max attendees, RSVP deadline) |
| `wire` | Input listeners + debounced address geocode trigger |

Geocode calls **`window.evtGeocodeAddress`** (from `create/geocode.js`, 5M.1.1).

Uses orchestrator API: `getState`, `esc`, `TIMEZONES`.

### 3.3 `step-pricing.js` — `EventsCreateSteps.pricing`

| Symbol | Role |
| --- | --- |
| `html` | Pricing mode, RSVP cost, raffle toggle, member-only |
| `wire` | Pricing controls + delegates raffle builder wiring |

**Raffle builder HTML** embedded via **`EventsCreateSteps.raffleBuilderHtml`** (still implemented in `sheet.js` until 5M.1.3).

Uses orchestrator API: `getState`, `render`, `esc`, `ensureRaffleConfig`, `wireRaffleBuilder`, `raffleBuilderHtml`.

### 3.4 `step-review.js` — `EventsCreateSteps.review`

| Symbol | Role |
| --- | --- |
| `html` | Review summary cards (basics, when/where, pricing) |
| `wire` | No-op (preserved prior behavior) |

**Raffle review rows** via **`EventsCreateSteps.raffleReviewHtml`** (still in `sheet.js`).

Uses orchestrator API: `getState`, `esc`, `CATEGORIES`, `raffleReviewHtml`.

### 3.5 Orchestrator API (`_bindCreateStepsApi` in `sheet.js`)

Registered when `sheet.js` loads (after `_esc` is defined):

```text
EventsCreateSteps.getState
EventsCreateSteps.render
EventsCreateSteps.esc
EventsCreateSteps.CATEGORIES
EventsCreateSteps.TIMEZONES
EventsCreateSteps.raffleBuilderHtml
EventsCreateSteps.raffleReviewHtml
EventsCreateSteps.ensureRaffleConfig
EventsCreateSteps.wireRaffleBuilder
```

`_render` dispatches: `steps.basics|when|pricing|review.html()` then `.wire()`.

---

## 4. Sheet Orchestrator Remains (`create/sheet.js`)

| Area | Symbols / behavior |
| --- | --- |
| **Public API** | `open`, `close`, `isFlagOn` → `window.EventsCreate`, `window.PortalEvents.create` |
| **State machine** | `STATE`, `STEPS`, `_render`, `_validateStep`, `_back`, `_next` |
| **DOM shell** | `_ensureMounted`, `_confirmClose` |
| **Raffle builder** | `_raffleBuilderHtml`, `_wireRaffleBuilder`, `_raffleModel`, `_ensureRaffleConfig`, mutation helpers, `_setPrizeImage`, `_raffleReviewHtml` |
| **Persistence** | `_submit`, `_submitting`, banner/embed/prize storage uploads |
| **Helpers** | `_esc`, `_bindCreateStepsApi` |
| **Events** | `events:created` custom event on successful publish/draft |

**Not extracted in 5M.1.2:** raffle builder internals (5M.1.3), submit/storage (5M.1.4).

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
  → create.js
  → create/step-basics.js
  → create/step-when.js
  → create/step-pricing.js
  → create/step-review.js
  → create/sheet.js
  → documents.js → …
```

| Property | Value |
| --- | --- |
| **Middle script count** | **32** (was 28 after 5M.1.1; +4 step modules) |
| **New entries** | `create/step-basics.js` … `create/step-review.js` between `create.js` and `create/sheet.js` |
| **`portal/events.html`** | **Not modified** — loader-only wiring |

---

## 6. Validation Summary

All commands run against commit **`c0ab1da`**.

### 6.1 Syntax checks

| Command | Result |
| --- | --- |
| `node --check js/portal/events/create/sheet.js` | **OK** |
| `node --check js/portal/events/create/step-basics.js` | **OK** |
| `node --check js/portal/events/create/step-when.js` | **OK** |
| `node --check js/portal/events/create/step-pricing.js` | **OK** |
| `node --check js/portal/events/create/step-review.js` | **OK** |
| `node --check js/portal/events/classic-chain-loader.js` | **OK** |

### 6.2 Primary create / gate smokes

| Command | Result |
| --- | --- |
| `node test/_smoke-phase3d-create-bridge.js` | **109 / 109 PASS** |
| `node test/_smoke-phase5l-readiness.js` | **38 / 38 PASS** (32-chain) |
| `node test/_smoke-phase5l3-rehearsal.js` | **16 / 16 PASS** |
| `node test/_smoke-phase1-bridge.js` | **PASS** |
| `node test/_smoke-phase3a-list-bridge.js` | **PASS** |
| `node test/_smoke-phase3c-manage-bridge.js` | **PASS** |
| `node test/_smoke-phase3b-detail-bridge.js` | **PASS** |

### 6.3 Regression smokes (5M.1.2 closeout)

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
| Portal Events → Create → all four steps | **Not run** in implementation session |
| Image upload / geocode / draft-publish UI | **Optional follow-up** on staging/production |

---

## 7. Optional Manual QA Recommendation

Quick pass if desired before **5M.1.3**:

1. Open portal **Events** page.
2. Click **Create** — confirm `EventsCreate` sheet opens.
3. Step through **Basics → When & Where → Pricing → Review**.
4. Confirm **state persists** when moving back/forward.
5. Confirm **banner/embed image** controls render and accept files.
6. On **When & Where**, enter an address — confirm **geocode** status updates.
7. On **Review**, confirm **Publish** / **Save draft** footer controls render.
8. Confirm **no console errors** during the flow.

---

## 8. Exit Criteria (from `056`)

| Criterion | Met? |
| --- | :---: |
| Four step modules in loader before `create/sheet.js` | ✓ |
| `create/sheet.js` still owns `EventsCreate` / `PortalEvents.create` | ✓ |
| Raffle builder + submit remain in orchestrator | ✓ |
| **3D** smoke passes | ✓ |
| **5L readiness / 5L3** pass (32-chain) | ✓ |
| No `portal/events.html` diff | ✓ |
| No `list` / `manage` diff | ✓ |
| No `css/**` diff in implementation commit | ✓ |

**5M.1.2 exit criteria: satisfied.**

---

## 9. Current Status

| Track | Status |
| --- | --- |
| **5M.0** smoke baseline | **Complete** |
| **5M.1.1** geocode extraction | **Complete** (`0ee3794`) |
| **5M.1.2** sheet step extraction | **Complete** (`c0ab1da`) |
| **5M.1.3** raffle builder extraction | **Not started** — needs `058` approval |
| **5M.1.4** submit/storage extraction | **Not started** |
| **5M.2 list / 5M.3 manage** | **Not started** |
| **5L.4** | **Not started** |

```text
056 approve 5M.1.2 → c0ab1da steps → 057 complete (this doc)
  → 058 approve 5M.1.3 (next) → implementation PR
```

---

## 10. Recommended Next Gate

| Doc (proposed) | Purpose |
| --- | --- |
| **`058_phase_5m1_3_raffle_builder_approval.md`** | Approve **5M.1.3** — raffle builder extraction from `create/sheet.js` |

### 10.1 Suggested next slice preview (not approved here)

**5M.1.3** would likely move raffle builder render/wire/mutations into a dedicated module, for example:

| Target (proposed) | Scope |
| --- | --- |
| **`create/raffle-builder.js`** (name TBD) | `_raffleBuilderHtml`, `_wireRaffleBuilder`, category/item mutations, prize image upload wiring |

**Do not** combine **5M.1.3** with submit/storage (**5M.1.4**), legacy `create.js` work, or list/manage refactors in one PR.

---

## 11. No-Go Reminders (post-5M.1.2)

- Do **not** combine **5M.1.3** raffle builder with **5M.1.4** submit/storage extraction.
- Do **not** combine create work with **list** or **manage** refactors.
- Do **not** combine with **5L.4** or **CSS cleanup**.
- Do **not** modify **production** `portal/events.html` without a new approval gate.
- Do **not** treat **`057`** as approval for **5M.1.3** implementation.

---

## 12. Rollback Reference

Revert sheet step extraction only:

```bash
git revert c0ab1da
```

Restores monolithic step functions in `create/sheet.js` and 28-script loader chain (post–5M.1.1, pre–5M.1.2). Re-run §6 smokes after revert.

---

## 13. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/057_phase_5m1_2_sheet_steps_completion.md
git add docs/audit/pages/events/057_phase_5m1_2_sheet_steps_completion.md
git diff --staged --name-only
git commit -m "Add Phase 5M.1.2 sheet step completion"
git push
```

---

## Appendix — Quick reference

| Question | Answer |
| --- | --- |
| Is 5M.1.2 done? | **Yes** (`c0ab1da`) |
| Where are steps? | `js/portal/events/create/step-*.js` |
| Namespace? | `window.EventsCreateSteps` |
| Chain count? | **32** middle scripts |
| Next approval doc? | **`058_phase_5m1_3_raffle_builder_approval.md`** |
