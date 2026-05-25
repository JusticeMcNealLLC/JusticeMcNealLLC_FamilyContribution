# Phase 5M.1.3 — Create Raffle Builder Extraction (Completion Status)

**Document:** `059_phase_5m1_3_raffle_builder_completion.md`  
**Path:** `docs/audit/pages/events/059_phase_5m1_3_raffle_builder_completion.md`  
**Date:** 2026-05-21  
**Status:** **Complete** — raffle builder module extracted; smokes green; ready for next create slice approval  
**Approval:** `058_phase_5m1_3_raffle_builder_approval.md` (`a6b0cd8`)  
**Implementation:** `d4bfe02` — Extract Events create raffle builder  
**Prior checkpoint:** `057_phase_5m1_2_sheet_steps_completion.md` (`73a1dc3`, impl `c0ab1da`)

---

## 1. Completion Summary

Phase **5M.1.3 — raffle builder extraction** is **complete**.

| Milestone | Commit | What shipped |
| --- | --- | --- |
| **5M.1.3 approval** | `a6b0cd8` | Raffle builder extraction scope approved |
| **5M.1.3 implementation** | `d4bfe02` | `create/raffle-builder.js` + thin orchestrator + loader/smokes |

| Property | Value |
| --- | --- |
| **Raffle module** | `js/portal/events/create/raffle-builder.js` (new) |
| **Namespace** | `window.EventsCreateRaffleBuilder` |
| **Orchestrator** | `create/sheet.js` — lifecycle, STATE, `_render`, `_submit`, bridges |
| **Product behavior** | **No intentional change** — same Create sheet raffle UX |
| **`portal/events.html`** | **Unchanged** (3-tag model) |
| **`list.js` / `manage/sheet.js`** | **Unchanged** |
| **`css/**`** | **Unchanged** |
| **5M.1.4+** | **Not started** |
| **5L.4** | **Not started** |

---

## 2. Files Changed in Implementation (`d4bfe02`)

| File | Change |
| --- | --- |
| `js/portal/events/create/raffle-builder.js` | **Created** — raffle builder HTML/wire/mutations + review HTML |
| `js/portal/events/create/sheet.js` | **Reduced** — raffle bodies removed; `_raffleApi`, `_bindCreateStepsApi`, `_submit` retained |
| `js/portal/events/classic-chain-loader.js` | **Updated** — `create/raffle-builder.js` before `create/sheet.js`; **33** middle scripts |
| `test/_smoke-phase3d-create-bridge.js` | **Updated** — raffle module, 33-chain, orchestrator ownership |
| `test/_smoke-phase5l-readiness.js` | **Updated** — 33-chain + raffle-builder order |
| `test/_smoke-phase5l3-rehearsal.js` | **Updated** — 33-chain + raffle-builder order |

**Not changed:** `portal/events.html`, `create.js`, step modules (`step-*.js`), `create/geocode.js`, `list.js`, `manage/sheet.js`, `css/**`.

---

## 3. Extracted Raffle Module

Classic script style (IIFE, `'use strict'`, no `import`/`export`). Registers **`window.EventsCreateRaffleBuilder`** at load time.

### 3.1 Public module API

| Symbol | Role |
| --- | --- |
| **`builderHtml`** | Raffle entry price, categories, items, validation summary, prize image rows |
| **`wire`** | Category/item field listeners, add/remove/move, prize image click/drag-drop/clear |
| **`reviewHtml`** | Review-step per-category prize summary rows |
| **`ensureRaffleConfig`** | Creates/normalizes `STATE.form.raffle_config` via `EventsRaffleModel` |
| **`normalizeRaffleConfig`** | Re-normalizes config after mutations |
| **`raffleModel`** | Lazy accessor → **`window.EventsRaffleModel`** |

### 3.2 Runtime dependencies (unchanged contract)

| Dependency | Usage |
| --- | --- |
| **`window.EventsCreateSteps.getState`** | Reads/writes `STATE` (registered by `sheet.js` before user interaction) |
| **`window.EventsCreateSteps.render`** | Re-render after raffle mutations / prize images |
| **`window.EventsCreateSteps.esc`** | HTML escape in builder/review markup |
| **`window.EventsRaffleModel`** | Config CRUD, validation, ordered categories/items |

### 3.3 Step module integration (unchanged call path)

| Consumer | Hook (via `_bindCreateStepsApi`) | Module API |
| --- | --- | --- |
| **`step-pricing.js`** | `EventsCreateSteps.raffleBuilderHtml` | `builderHtml` |
| **`step-pricing.js`** | `EventsCreateSteps.wireRaffleBuilder` | `wire` |
| **`step-pricing.js`** | `EventsCreateSteps.ensureRaffleConfig` | `ensureRaffleConfig` |
| **`step-review.js`** | `EventsCreateSteps.raffleReviewHtml` | `reviewHtml` |

Pricing/review sources were **not** modified in 5M.1.3; hooks remain stable names on `EventsCreateSteps`.

### 3.4 Moved from `sheet.js` (no longer in orchestrator source)

| Former symbol | Now in module |
| --- | --- |
| `_raffleBuilderHtml` | `builderHtml` |
| `_wireRaffleBuilder` | `wire` |
| `_raffleReviewHtml` | `reviewHtml` |
| `_ensureRaffleConfig` | `ensureRaffleConfig` |
| `_normalizeRaffleConfig` | `normalizeRaffleConfig` |
| `_raffleModel` | `raffleModel` |
| Category/item mutations, `_setPrizeImage`, `_drawModeOptions`, `_moveEntry`, `_renumberSortOrders` | Internal to `raffle-builder.js` |

---

## 4. Sheet Orchestrator Remains (`create/sheet.js`)

| Area | Symbols / behavior |
| --- | --- |
| **Public API** | `open`, `close`, `isFlagOn` → `window.EventsCreate`, `window.PortalEvents.create` |
| **State machine** | `STATE`, `STEPS`, `_render`, `_validateStep`, `_back`, `_next` |
| **DOM shell** | `_ensureMounted`, `_confirmClose` |
| **Submit / storage** | `_submit`, `_submitting`, banner/embed uploads, prize uploads at publish, Supabase insert, `events:created` |
| **Raffle bridge** | `_raffleApi()` → `window.EventsCreateRaffleBuilder` |
| **Step API registration** | `_bindCreateStepsApi()` maps raffle hooks to module |
| **Validation (pricing)** | `rb.raffleModel().validateConfig(rb.ensureRaffleConfig())` |
| **Submit (raffle)** | `rb.raffleModel().normalizeConfig(rb.ensureRaffleConfig())`, `getTotalWinnerCount` |
| **Helpers** | `_esc` |

**Not extracted in 5M.1.3:** `_submit` and non–raffle-builder storage paths (**5M.1.4**).

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
  → create/raffle-builder.js
  → create/sheet.js
  → documents.js → …
```

| Property | Value |
| --- | --- |
| **Middle script count** | **33** (was 32 after 5M.1.2; +1 raffle module) |
| **New entry** | `create/raffle-builder.js` after `create/step-review.js`, **before** `create/sheet.js` |
| **`portal/events.html`** | **Not modified** — loader-only wiring |

---

## 6. Validation Summary

All commands run against commit **`d4bfe02`**.

### 6.1 Syntax checks

| Command | Result |
| --- | --- |
| `node --check js/portal/events/create/sheet.js` | **OK** |
| `node --check js/portal/events/create/raffle-builder.js` | **OK** |
| `node --check js/portal/events/classic-chain-loader.js` | **OK** |

### 6.2 Primary create / gate smokes

| Command | Result |
| --- | --- |
| `node test/_smoke-phase3d-create-bridge.js` | **123 / 123 PASS** |
| `node test/_smoke-phase5l-readiness.js` | **38 / 38 PASS** (33-chain) |
| `node test/_smoke-phase5l3-rehearsal.js` | **16 / 16 PASS** |
| `node test/_smoke-phase1-bridge.js` | **PASS** |
| `node test/_smoke-phase3a-list-bridge.js` | **PASS** |
| `node test/_smoke-phase3c-manage-bridge.js` | **PASS** |
| `node test/_smoke-phase3b-detail-bridge.js` | **PASS** |

### 6.3 Regression smokes (5M.1.3 closeout)

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
| Portal Events → Create → raffle builder toggle/UI | **Not run** in implementation session |
| Draft/publish with raffle prizes | **Optional follow-up** on staging/production |

---

## 7. Optional Manual QA Recommendation

Quick pass if desired before **5M.1.4**:

1. Open portal **Events** page.
2. Click **Create** — confirm sheet opens.
3. Step through **Basics → When & Where → Pricing → Review**.
4. On **Pricing**, enable **Add a raffle** — confirm builder renders (categories, items, entry price).
5. **Add / edit / remove / reorder** categories and items if supported.
6. Attach a **prize image** on an item — confirm preview updates.
7. On **Review**, confirm **raffle summary** rows appear when raffle is enabled.
8. Confirm **Save draft** / **Publish** footer controls still render.
9. Confirm **no console errors** during the flow.

---

## 8. Exit Criteria (from `058`)

| Criterion | Met? |
| --- | :---: |
| `create/raffle-builder.js` in loader before `create/sheet.js` | ✓ |
| `EventsCreateRaffleBuilder` namespace with approved API | ✓ |
| `create/sheet.js` still owns `EventsCreate` / `PortalEvents.create` / `_submit` | ✓ |
| Step hooks on `EventsCreateSteps` preserved | ✓ |
| **3D** smoke passes | ✓ |
| **5L readiness / 5L3** pass (33-chain) | ✓ |
| No `portal/events.html` diff | ✓ |
| No `list` / `manage` diff | ✓ |
| No `css/**` diff in implementation commit | ✓ |

**5M.1.3 exit criteria: satisfied.**

---

## 9. Current Status

| Track | Status |
| --- | --- |
| **5M.0** smoke baseline | **Complete** |
| **5M.1.1** geocode extraction | **Complete** (`0ee3794`) |
| **5M.1.2** sheet step extraction | **Complete** (`c0ab1da`) |
| **5M.1.3** raffle builder extraction | **Complete** (`d4bfe02`) |
| **5M.1.4** submit/storage extraction | **Not started** — needs `060` approval |
| **5M.1.5** legacy `create.js` split | **Not started** |
| **5M.2 list / 5M.3 manage** | **Not started** |
| **5L.4** | **Not started** |

```text
058 approve 5M.1.3 → d4bfe02 raffle-builder → 059 complete (this doc)
  → 060 approve 5M.1.4 (next) → implementation PR
```

---

## 10. Recommended Next Gate

| Doc (proposed) | Purpose |
| --- | --- |
| **`060_phase_5m1_4_submit_storage_approval.md`** | Approve **5M.1.4** — submit/storage extraction from `create/sheet.js` |

### 10.1 Suggested next slice preview (not approved here)

**5M.1.4** would likely move persistence logic into a dedicated module, for example:

| Target (proposed) | Scope |
| --- | --- |
| **`create/submit.js`** or similar | `_submit`, `_submitting` |
| **Storage helpers** | Banner/embed upload paths; prize image upload loop at publish |
| **Record building** | Supabase `events` insert payload, slug generation, `events:created` dispatch |

**Do not** combine **5M.1.4** with **5M.1.5** legacy `create.js` split, **list/manage** refactors, or **5L.4** in one PR.

---

## 11. No-Go Reminders (post-5M.1.3)

- Do **not** combine **5M.1.4** submit/storage with **5M.1.5** legacy `create.js` split.
- Do **not** combine create work with **list** or **manage** refactors.
- Do **not** combine with **5L.4** or **CSS cleanup**.
- Do **not** modify **production** `portal/events.html` without a new approval gate.
- Do **not** treat **`059`** as approval for **5M.1.4** implementation.

---

## 12. Rollback Reference

Revert raffle builder extraction only:

```bash
git revert d4bfe02
```

Restores raffle builder functions inside `create/sheet.js` and 32-script loader chain (post–5M.1.2, pre–5M.1.3). Re-run §6 smokes after revert.

---

## 13. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/059_phase_5m1_3_raffle_builder_completion.md
git add docs/audit/pages/events/059_phase_5m1_3_raffle_builder_completion.md
git diff --staged --name-only
git commit -m "Add Phase 5M.1.3 raffle builder completion"
git push
```

---

## Appendix — Quick reference

| Question | Answer |
| --- | --- |
| Is 5M.1.3 done? | **Yes** (`d4bfe02`) |
| Where is raffle builder? | `js/portal/events/create/raffle-builder.js` |
| Namespace? | `window.EventsCreateRaffleBuilder` |
| Chain count? | **33** middle scripts |
| Next approval doc? | **`060_phase_5m1_4_submit_storage_approval.md`** |
