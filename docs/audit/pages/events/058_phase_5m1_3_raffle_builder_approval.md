# Phase 5M.1.3 — Create Raffle Builder Extraction (Approval)

**Document:** `058_phase_5m1_3_raffle_builder_approval.md`  
**Path:** `docs/audit/pages/events/058_phase_5m1_3_raffle_builder_approval.md`  
**Date:** 2026-05-21  
**Status:** **APPROVED (gate only)** — authorizes a **future** 5M.1.3 runtime PR; **no code in this commit**  
**Prior completion:** `057_phase_5m1_2_sheet_steps_completion.md` (`73a1dc3`, impl `c0ab1da`)  
**Create inventory:** `048_create_surface_inventory.md` (`8e6f2c0`)  
**Program approval:** `054_phase_5m1_0_create_implementation_approval.md` (`d04bef2`)

---

## Important: What This Commit Approves

| This commit (`058` doc) | Future 5M.1.3 PR (not started) |
| --- | --- |
| Documentation-only approval | Runtime + loader/smoke updates |
| **Does not** modify `js/**`, HTML, CSS, or tests | **Will** add `create/raffle-builder.js` (or approved name) and thin raffle surface in `create/sheet.js` |
| Approves **5M.1.3 only** | **5M.1.4+** require separate approval docs |

**Phase 5M.1.3 is approved as a scope definition.** Implementation may proceed in a **separate** PR touching only approved files.

---

## 1. Current Baseline

| Item | State |
| --- | --- |
| **Phase 5M.0** | **Complete** — loader-aware 3A/3C/3D (`d99539f`, `9ee6e90`) |
| **Phase 5M.1.1** | **Complete** — `create/geocode.js` (`0ee3794`, `15c3692`) |
| **Phase 5M.1.2** | **Complete** — four `create/step-*.js` modules (`c0ab1da`, `73a1dc3`) |
| **`create/sheet.js`** | **Orchestrator** — open/close, STATE, `_render`, raffle builder, `_submit`, bridges |
| **`step-pricing.js`** | Calls **`EventsCreateSteps.raffleBuilderHtml`**, **`ensureRaffleConfig`**, **`wireRaffleBuilder`** (defined on orchestrator API today) |
| **`step-review.js`** | Calls **`EventsCreateSteps.raffleReviewHtml`** (defined on orchestrator API today) |
| **`portal/events.html`** | **3-tag** model — **not modified** since 5L.3 |
| **Middle chain count** | **32** scripts (post–5M.1.2) |
| **5M.1.3 implementation** | **Not started** |
| **5M.1.4+ / 5M.2 / 5M.3 / 5L.4** | **Not started** |

```text
Current create loader excerpt:
  … → create/geocode.js → create.js
    → create/step-basics.js → create/step-when.js
    → create/step-pricing.js → create/step-review.js
    → create/sheet.js → documents.js → …
```

**Product behavior:** No intentional change through 5M.1.2; 5M.1.3 must preserve the same Create sheet raffle UX.

---

## 2. Raffle Builder Summary (still in `create/sheet.js`)

Post–5M.1.2, raffle logic remains in the orchestrator IIFE (~lines 250–570 in current `sheet.js`). Step modules reach it only via **`_bindCreateStepsApi()`** hooks on **`window.EventsCreateSteps`**.

### 2.1 Render / wire

| Function | Role |
| --- | --- |
| **`_raffleBuilderHtml`** | HTML for raffle entry price, categories, items, validation summary, prize image rows |
| **`_wireRaffleBuilder`** | DOM listeners: category/item fields, add/remove/move, prize image click/drag-drop/clear |
| **`_drawModeOptions`** | `<select>` options for category draw mode |
| **`_raffleReviewHtml`** | Review-step rows per category (item list text) — **tightly coupled** to builder config |

### 2.2 Model / config

| Function | Role |
| --- | --- |
| **`_raffleModel()`** | Lazy accessor → **`window.EventsRaffleModel`** (throws if missing) |
| **`_ensureRaffleConfig()`** | Creates/normalizes `STATE.form.raffle_config` via model |
| **`_normalizeRaffleConfig()`** | Re-normalizes config after mutations |

### 2.3 Category / item mutations

| Function | Role |
| --- | --- |
| **`_updateCategory`** | Field updates on category rows (`winner_count`, label, `draw_mode`, etc.) |
| **`_updateItem`** | Field updates on item rows (`quantity`, name, emoji, `category_id`, etc.) |
| **`_removeCategory`** | Remove category; reassign items to fallback category |
| **`_removeItem`** | Remove prize item |
| **`_moveCategory`** | Reorder category via `_moveEntry` |
| **`_moveItem`** | Reorder item via `_moveEntry` |
| **`_moveEntry`** | Shared up/down reorder helper |
| **`_renumberSortOrders`** | `sort_order` renumbering after reorder |

### 2.4 Prize images (create-sheet builder UI)

| Function / state | Role |
| --- | --- |
| **`_setPrizeImage`** | Validates file, stores in **`STATE.prizeImageFiles`**, preview in **`STATE.prizeImagePreviews`**, triggers `_render` |
| **`STATE.prizeImageFiles`** | `item.id → File` pending upload at submit |
| **`STATE.prizeImagePreviews`** | `item.id → data-URL` for builder/review UI |
| **Prize upload in `_wireRaffleBuilder`** | `[data-ec-prize-drop]`, `[data-ec-prize-file]`, `[data-ec-prize-clear]` |

**Note:** Banner/embed uploads and **`_submit`** storage paths for banners/embeds are **5M.1.4** — not 5M.1.3. Prize image **upload at submit** may remain in `_submit` even if **`_setPrizeImage`** moves with the builder (see §3.4).

### 2.5 External dependency

| Dependency | Usage |
| --- | --- |
| **`window.EventsRaffleModel`** | `createDefaultConfig`, `normalizeConfig`, `validateConfig`, `getOrderedCategories`, `getItemsForCategory`, `getTotalWinnerCount`, `createCategory`, `createItem`, etc. |
| **`_esc`** | HTML escape in builder/review markup (orchestrator today; module may call **`EventsCreateSteps.esc`**) |
| **`_render`** | Re-render after mutations / prize image pick (orchestrator; module calls **`EventsCreateSteps.render`**) |

### 2.6 Validation touchpoints (stay in orchestrator for 5M.1.3)

| Location | Role |
| --- | --- |
| **`_validateStep`** (pricing key) | Raffle enabled → `EventsRaffleModel.validateConfig(_ensureRaffleConfig())` |
| **`_submit`** | Normalizes `raffle_config`, uploads **`STATE.prizeImageFiles`**, sets `raffle_prizes` / `raffle_winner_count` on insert |

**5M.1.3** may move **`_ensureRaffleConfig`** implementation to the raffle module but **must not** change validation rules or submit record shape.

---

## 3. Approved 5M.1.3 Scope

### 3.1 Approval statement

**APPROVED:** Phase **5M.1.3 — raffle builder extraction** as the **next create-track runtime PR**.

### 3.2 Target module (preferred)

| File | Purpose |
| --- | --- |
| **`js/portal/events/create/raffle-builder.js`** | Classic IIFE; owns raffle builder render/wire/mutations |

Alternative names (`create-raffle-builder.js`, etc.) are acceptable if documented in PR + **`059` completion**.

### 3.3 Allowed to move

| Area | Symbols (current names) |
| --- | --- |
| **Builder HTML** | `_raffleBuilderHtml`, `_drawModeOptions` |
| **Builder wire** | `_wireRaffleBuilder` |
| **Config helpers** | `_raffleModel`, `_ensureRaffleConfig`, `_normalizeRaffleConfig` (if create-sheet-specific) |
| **Mutations** | `_updateCategory`, `_updateItem`, `_removeCategory`, `_removeItem`, `_moveCategory`, `_moveItem`, `_moveEntry`, `_renumberSortOrders` |
| **Prize image UI** | `_setPrizeImage` and prize-drop wiring inside `_wireRaffleBuilder` |
| **Review HTML** | `_raffleReviewHtml` — **allowed** if moved with builder (low-risk; same model/config contract) |

### 3.4 Integration pattern (implementation choice)

| Pattern | Description |
| --- | --- |
| **Preferred namespace** | `window.EventsCreateRaffleBuilder = { builderHtml, wire, reviewHtml, ensureConfig, … }` |
| **Alternative** | Extend `window.EventsCreateSteps` with `raffle` sub-object — **must** keep existing **`raffleBuilderHtml` / `wireRaffleBuilder` / `raffleReviewHtml` / `ensureRaffleConfig`** hook names or update **`step-pricing.js` / `step-review.js`** in the **same** PR with identical behavior |

**Orchestrator (`create/sheet.js`) after 5M.1.3:**

- Still owns **`open` / `close` / `isFlagOn`**, **`STATE`**, **`STEPS`**, **`_render`**, **`_validateStep`**, **`_back` / `_next`**, **`_submit`**, **`_esc`**, **`_bindCreateStepsApi`** (or equivalent registration).
- Registers raffle module APIs for step modules (same external contract as today).
- May retain thin delegates: `EventsCreateSteps.raffleBuilderHtml = () => EventsCreateRaffleBuilder.builderHtml()`.

### 3.5 Must preserve (no intentional behavior change)

| Contract | Requirement |
| --- | --- |
| **`window.EventsCreate`** | `{ open, close, isFlagOn }` unchanged |
| **`window.PortalEvents.create`** | Mirror unchanged |
| **`window.EventsCreateSteps`** | Step modules **`basics` / `when` / `pricing` / `review`** unchanged; raffle hooks callable |
| **`STATE.form.raffle_*`** | Same fields and mutation semantics |
| **`STATE.prizeImageFiles` / `prizeImagePreviews`** | Same keys and submit consumption |
| **Pricing step** | Raffle toggle still shows builder when enabled |
| **Review step** | Raffle summary rows when `raffle_enabled` |
| **`EventsRaffleModel`** | Same global; no model API changes |
| **`_validateStep` (pricing)** | Same raffle validation errors |
| **`_submit`** | Same insert payload for raffle fields and prize uploads |
| **`events:created`** | Unchanged |
| **DOM IDs / `data-ec-*` attributes** | Unchanged in generated HTML |

---

## 4. Explicitly Out of Scope for 5M.1.3

| Out of scope | Reason / defer to |
| --- | --- |
| **`_submit` extraction** | **5M.1.4** |
| **Banner/embed storage helpers** | **5M.1.4** (not raffle-builder UI) |
| **Publish/draft behavior changes** | Product — not this slice |
| **`create.js` legacy modal split** | **5M.1.5** |
| **`evtHandleCreate` changes** | **5M.1.5** |
| **LLC / competition behavior** | Unchanged |
| **Removing `#createModal`** | **5M.1.6** product gate |
| **`list.js` / `manage/sheet.js`** | **5M.2 / 5M.3** |
| **`portal/events.html`** | Separate approval gate |
| **5L.4 compat bootstrap** | Different track |
| **CSS cleanup** | Separate PR |
| **5M.1.4+ in same PR** | One slice per PR |
| **`js/portal/events/raffle-model.js`** | Shared model — do not fork |

---

## 5. Loader Requirements

### 5.1 Rules

- Update **`js/portal/events/classic-chain-loader.js` only** — **not** `portal/events.html`.
- New module: **classic script**, **no** native `export`.
- Load **after** all `create/step-*.js`, **before** `create/sheet.js` (orchestrator registers APIs at runtime; sheet must load after module assigns namespace).

### 5.2 Recommended chain order (preferred)

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

| Rationale | |
| --- | --- |
| **Steps before raffle module** | Step sources unchanged; still call hooks registered later by sheet |
| **Raffle module before `sheet.js`** | Namespace exists before orchestrator `_bindCreateStepsApi` runs |
| **`create.js` position** | Unchanged (legacy modal) |

### 5.3 Chain count expectation

| Before 5M.1.3 | After 5M.1.3 (expected) |
| ---: | ---: |
| **32** middle scripts | **33** (+1 `create/raffle-builder.js`) |

---

## 6. Smoke / Test Expectations (implementation PR)

Update **only as needed**:

| Test | Expected updates |
| --- | --- |
| **`test/_smoke-phase3d-create-bridge.js`** | `create/raffle-builder.js` in chain; order before `create/sheet.js`; orchestrator still owns `EventsCreate` / `PortalEvents.create`; raffle builder fns not required in `sheet.js` if moved; step hook contract preserved |
| **`test/_smoke-phase5l-readiness.js`** | Chain count **33**; raffle module order assertions |
| **`test/_smoke-phase5l3-rehearsal.js`** | Chain count **33** |
| **Other smokes** | Touch only if direct failure |

### 6.1 Suggested new 3D checks

- `create/raffle-builder.js` exists, IIFE, no `export`.
- `create/sheet.js` still assigns `window.EventsCreate`.
- `create/sheet.js` still contains `_render`, `_validateStep`, `_submit`.
- `create/sheet.js` does **not** contain `_raffleBuilderHtml` body (or delegates in one line to raffle module).
- `EventsRaffleModel` still referenced from raffle module or orchestrator validation/submit.

---

## 7. Required Validation After 5M.1.3 Implementation

```bash
node --check js/portal/events/create/sheet.js
node --check js/portal/events/create/raffle-builder.js
node --check js/portal/events/classic-chain-loader.js

node test/_smoke-phase3d-create-bridge.js
node test/_smoke-phase5l-readiness.js
node test/_smoke-phase5l3-rehearsal.js
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3a-list-bridge.js
node test/_smoke-phase3c-manage-bridge.js
node test/_smoke-phase3b-detail-bridge.js
```

Full **Phase 5 gate** — run if practical (same suite as 5M.1.2 closeout):

```bash
node test/_smoke-phase5h-detail-open-split.js
node test/_smoke-phase5h6-post-render-bridge.js
node test/_smoke-phase5i-template-shell.js
node test/_smoke-phase5j-compat-exports.js
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

---

## 8. Manual QA Expectations

After implementation, if practical:

| Check | Expected |
| --- | --- |
| Open portal Events → **Create** | Sheet opens |
| Steps **Basics → When & Where → Pricing → Review** | State persists across steps |
| **Pricing** — enable raffle | Builder section renders (categories, items, entry price) |
| **Add / edit / remove / reorder** categories & items | Same behavior as pre-5M.1.3 |
| **Prize image** pick on an item | Preview updates; clear works |
| **Review** | Raffle summary rows when raffle enabled |
| **Save draft / Publish** | Footer controls still work (`_submit` in orchestrator) |
| **Console** | No new errors |

---

## 9. Rollback

1. **Revert** the 5M.1.3 implementation commit(s).
2. Restore raffle builder functions inside **`create/sheet.js`**.
3. Remove **`create/raffle-builder.js`** from loader; restore **32**-script chain.
4. Re-run §7 smokes.

```bash
git revert <5M.1.3-impl-commit>
```

---

## 10. No-Go Reminders

- Do **not** combine **5M.1.3** with **5M.1.4** submit/storage extraction.
- Do **not** combine with **5M.1.5** legacy `create.js` split.
- Do **not** combine create work with **list** or **manage** refactors.
- Do **not** combine with **5L.4** or **CSS cleanup**.
- Do **not** modify **production** `portal/events.html` without a new approval gate.
- Do **not** treat **`058`** as permission to implement — only **`059`**-tracked PR after this gate.

---

## 11. Recommended Next Doc After Implementation

| Doc (proposed) | Purpose |
| --- | --- |
| **`059_phase_5m1_3_raffle_builder_completion.md`** | Document successful completion of 5M.1.3 raffle builder extraction |

---

## 12. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/058_phase_5m1_3_raffle_builder_approval.md
git add docs/audit/pages/events/058_phase_5m1_3_raffle_builder_approval.md
git diff --staged --name-only
git commit -m "Approve Phase 5M.1.3 raffle builder extraction"
git push
```

---

## Appendix — Quick reference

| Question | Answer |
| --- | --- |
| Is 5M.1.3 approved? | **Yes (gate only)** — this doc |
| Is 5M.1.3 implemented? | **No** — awaiting runtime PR |
| Target file? | `js/portal/events/create/raffle-builder.js` (preferred) |
| Namespace? | `window.EventsCreateRaffleBuilder` (preferred) or stable `EventsCreateSteps` hooks |
| Chain count after? | **33** middle scripts |
| Next completion doc? | **`059_phase_5m1_3_raffle_builder_completion.md`** |
