# Phase 5M.1.5 — Legacy `create.js` Split (Approval)

**Document:** `062_phase_5m1_5_legacy_create_split_approval.md`  
**Path:** `docs/audit/pages/events/062_phase_5m1_5_legacy_create_split_approval.md`  
**Date:** 2026-05-21  
**Status:** **APPROVED (gate only)** — authorizes a **future** 5M.1.5 runtime PR; **no code in this commit**  
**Prior completion:** `061_phase_5m1_4_submit_storage_completion.md` (`2ecec93`, impl `ecced37`)  
**Create inventory:** `048_create_surface_inventory.md` (`8e6f2c0`)  
**Program approval:** `054_phase_5m1_0_create_implementation_approval.md` (`d04bef2`)

---

## Important: What This Commit Approves

| This commit (`062` doc) | Future 5M.1.5 PR (not started) |
| --- | --- |
| Documentation-only approval | Runtime + loader/smoke updates |
| **Does not** modify `js/**`, HTML, CSS, or tests | **Will** add legacy create modules under `create/` and thin `create.js` (or approved equivalent) |
| Approves **5M.1.5 only** | **5M.1.6+** require separate approval docs |

**Phase 5M.1.5 is approved as a scope definition.** Implementation may proceed in a **separate** PR touching only approved files.

---

## 1. Current Baseline

| Item | State |
| --- | --- |
| **Phase 5M.0** | **Complete** — loader-aware 3A/3C/3D (`d99539f`, `9ee6e90`) |
| **Phase 5M.1.1** | **Complete** — `create/geocode.js` (`0ee3794`, `15c3692`) |
| **Phase 5M.1.2** | **Complete** — four `create/step-*.js` modules (`c0ab1da`, `73a1dc3`) |
| **Phase 5M.1.3** | **Complete** — `create/raffle-builder.js` (`d4bfe02`, `c6be4ac`) |
| **Phase 5M.1.4** | **Complete** — `create/submit.js` (`ecced37`, `2ecec93`) |
| **`create/sheet.js`** | **EventsCreate orchestrator** — open/close, STATE, `_render`, `_validateStep`, thin `_submit` → `EventsCreateSubmit` |
| **`create.js`** | **~575 lines** — legacy `#createModal` path + shared globals used by `init.js` |
| **`portal/events.html`** | **3-tag** model — **not modified** since 5L.3 |
| **Middle chain count** | **34** scripts (post–5M.1.4) |
| **5M.1.5 implementation** | **Not started** |
| **5M.1.6 / 5M.2 / 5M.3 / 5L.4** | **Not started** |

```text
Current create loader excerpt:
  … → create/geocode.js → create.js
    → create/step-basics.js → create/step-when.js
    → create/step-pricing.js → create/step-review.js
    → create/raffle-builder.js → create/submit.js
    → create/sheet.js → documents.js → …
```

**Product behavior:** No intentional change through 5M.1.4. **5M.1.5** must preserve legacy modal, LLC/competition create, preview, and post-create host behavior.

### Dual create paths (unchanged contract)

| Path | Entry | Primary runtime |
| --- | --- | --- |
| **Sheet (default)** | `EventsCreate.open()` / `#createEventBtn` | `create/sheet.js` + step modules + `EventsCreateSubmit` |
| **Legacy modal (fallback)** | `evtToggleModal('createModal')` when sheet unavailable | `#createEventForm` + **`evtHandleCreate`** in `create.js` (to be split) |

---

## 2. Legacy `create.js` Summary (remaining surface)

`js/portal/events/create.js` is a **top-level classic script** (no IIFE). Functions are global by declaration; **`init.js`** wires listeners and assigns selected symbols to **`window`** for inline handlers.

### 2.1 LLC cost breakdown builder

| Symbol | Role |
| --- | --- |
| **`COST_CATEGORIES`** | Category labels for cost line items |
| **`evtCostItems`** | Module-level array of LLC cost rows |
| **`evtToggleLlcFields`** | Show/hide `#llcFieldsSection` / `#compFieldsSection`; LLC pricing locks; competition forces `memberOnly` |
| **`evtAddCostItem`** | Push new cost row; re-render list |
| **`evtRemoveCostItem`** | Remove row by id; recalc summary |
| **`evtRenderCostItems`** | Render `#costItemsList` with **inline `onclick=`** (`evtRemoveCostItem`, `evtUpdateCostItem`) |
| **`evtUpdateCostItem`** | Mutate row field; optional re-render on `included_in_buyin` |
| **`evtRecalcCostSummary`** | Update `#costSummary` DOM; suggested `llcRsvpOverride` |

**Wired from:** `init.js` — `#eventType` change → `evtToggleLlcFields`; `#addCostItemBtn` → `evtAddCostItem`; `window.evtAddCostItem`, `window.evtRemoveCostItem`, `window.evtUpdateCostItem` for inline HTML.

### 2.2 Legacy location validation

| Symbol | Role |
| --- | --- |
| **`_evtLocGeoCache`** | `{ address, result }` cache for publish-time geocode reuse |
| **`_evtLocDebounce`** | Debounce timer for live validation |
| **`evtSetLocationIcon`** | Icon state on `#eventLocation` (`hide` / `loading` / `ok` / `warn`) |
| **`evtSetLocationStatus`** | Status text/color on location field |
| **`evtValidateLocation`** | Debounced/blur validation via **`window.evtGeocodeAddress`** |
| **`evtInitLocationValidation`** | Bind `#eventLocation` input/blur listeners |

**Wired from:** `init.js` — `evtInitLocationValidation()` during boot.

**Geocode:** **`evtGeocodeAddress`** lives in **`create/geocode.js`** (5M.1.1); **must not** move back into `create.js`.

### 2.3 Legacy preview

| Symbol | Role |
| --- | --- |
| **`evtHandlePreview`** | Build preview HTML in `#eventsDetailView`; uses `evtBannerFile`, gate flags |
| **`evtClosePreview`** | Clear detail view; restore list; reopen `#createModal` |

**Wired from:** `init.js` — `#previewEventBtn` click. **Inline:** `onclick="evtClosePreview()"` in generated preview markup.

### 2.4 Legacy submit — `evtHandleCreate`

| Area | Behavior |
| --- | --- |
| **Entry** | `#createEventForm` submit (`init.js` listener) |
| **Event types** | `member`, `llc`, `competition` via `#eventType` |
| **Storage** | `evtBannerFile` / `evtEmbedImageFile` (`state.js`) → `event-banners` bucket |
| **RSVP / LLC pricing** | LLC buy-in from `evtCostItems` + `llcRsvpOverride`; member/competition branches |
| **Geocode** | Cached `_evtLocGeoCache` or live `window.evtGeocodeAddress`; confirm if unmapped |
| **LLC extras** | `min_participants`, `llc_cut_pct`, transport, `cost_breakdown`, `event_cost_items` insert |
| **Competition extras** | `competition_config`, `winner_tier_config`, `competition_phases` insert |
| **Raffle (legacy form)** | Simple prize text inputs → `raffle_prizes` array |
| **Insert** | `supabaseClient.from('events').insert` — **`status: 'open'`** (publish only) |
| **Post-create** | Form reset; clear files/cost/geo UI; `evtToggleModal('createModal', false)`; **`await evtLoadEvents()`**; **`evtNavigateToEvent(data.slug)`** |
| **Errors** | `alert` + console; restore `#publishEventBtn` |

**Note:** Legacy path does **not** dispatch `events:created` (sheet path does). Do not add that in 5M.1.5.

### 2.5 External dependencies (must remain callable)

| Dependency | Usage |
| --- | --- |
| **`window.evtGeocodeAddress`** | Location validation + publish geocode (`create/geocode.js`) |
| **`evtBannerFile` / `evtEmbedImageFile`** | `state.js` globals; banner/embed upload in `evtHandleCreate` / preview |
| **`evtCurrentUser`** | `created_by` on legacy insert |
| **`evtGenerateSlug`** | `utils.js` |
| **`evtEscapeHtml`** | `utils.js` — cost row HTML + preview |
| **`formatCurrency`** | `utils.js` — cost summary |
| **`evtToggleModal`** | Close/open `#createModal` |
| **`evtLoadEvents` / `evtNavigateToEvent`** | Post-create list refresh + navigation |
| **`supabaseClient`** | Storage + `events`, `event_cost_items`, `competition_phases` |

### 2.6 What is **not** in `create.js` (do not move into legacy split)

| Surface | Owner |
| --- | --- |
| Sheet orchestrator | `create/sheet.js` |
| Sheet submit/storage | `create/submit.js` |
| Sheet steps | `create/step-*.js` |
| Sheet raffle builder | `create/raffle-builder.js` |
| Geocode implementation | `create/geocode.js` |

---

## 3. Approved 5M.1.5 Scope

Split **`js/portal/events/create.js`** into focused legacy modules under **`js/portal/events/create/`**, using **classic script style** (IIFE + `'use strict'` per module, **no** native `import`/`export`).

### 3.1 Approved module files

| Module | Primary contents |
| --- | --- |
| **`create/legacy-costs.js`** | `COST_CATEGORIES`, `evtCostItems`, LLC cost builder functions |
| **`create/legacy-location.js`** | `_evtLocGeoCache`, `_evtLocDebounce`, location icon/status/validate/init |
| **`create/legacy-preview.js`** | `evtHandlePreview`, `evtClosePreview` |
| **`create/legacy-submit.js`** | `evtHandleCreate` and tightly coupled submit-only helpers if needed |
| **`create.js` (retained)** | **Thin legacy facade** — optional re-exports, file header, or minimal glue only; **no** duplicated bodies |

Alternative names are acceptable if clearly prefixed (`legacy-*`) and documented in the implementation completion report.

### 3.2 Allowed to move

| From `create.js` | Target module |
| --- | --- |
| LLC cost builder block | `legacy-costs.js` |
| Location validation block | `legacy-location.js` |
| Preview block | `legacy-preview.js` |
| `evtHandleCreate` + publish-only helpers | `legacy-submit.js` |
| Supporting module state (`evtCostItems`, `_evtLocGeoCache`, etc.) | Same module as primary consumer |

### 3.3 Required public globals (must survive split)

Implementation **must** preserve these names on **`window`** (or equivalent global callable from inline HTML / `init.js`):

| Global | Used by |
| --- | --- |
| **`window.evtHandleCreate`** | `#createEventForm` submit (`init.js`) |
| **`window.evtToggleLlcFields`** | `#eventType` change (`init.js`) |
| **`window.evtAddCostItem`** | `#addCostItemBtn`, inline cost row HTML |
| **`window.evtRemoveCostItem`** | Inline cost row `onclick` |
| **`window.evtRenderCostItems`** | Internal + optional external |
| **`window.evtUpdateCostItem`** | Inline cost row `onchange` |
| **`window.evtRecalcCostSummary`** | Cost mutations |
| **`window.evtValidateLocation`** | Debounced location validation |
| **`window.evtInitLocationValidation`** | `init.js` boot |
| **`window.evtHandlePreview`** | `#previewEventBtn` |
| **`window.evtClosePreview`** | Inline preview `onclick` |

**Also preserve** undeclared-global behavior where `init.js` references bare identifiers (`evtHandleCreate`, `evtToggleLlcFields`, etc.) — either keep top-level assignments in `create.js` facade or ensure `init.js` load order still sees globals (prefer explicit `window.*` assignment in each legacy module).

### 3.4 Behavior preservation (non-negotiable)

| Behavior | Requirement |
| --- | --- |
| Legacy `#createModal` submit | Same `evtHandleCreate` semantics |
| LLC cost UI | Add/edit/remove/recalc; inline `onclick` / `onchange` strings unchanged |
| Member / LLC / competition inserts | Same record shapes and side-table inserts |
| Preview | Same DOM targets (`#eventsDetailView`, modal toggle) |
| Geocode | **`window.evtGeocodeAddress`** only; cache behavior preserved |
| Banner/embed files | **`evtBannerFile` / `evtEmbedImageFile`** unchanged |
| Post-create | `evtLoadEvents` + `evtNavigateToEvent`; **no** new `events:created` on legacy path |
| Default Create button | Still opens **EventsCreate sheet** (`EventsCreate.open`) |

### 3.5 Approved runtime files (implementation PR)

| File | Action |
| --- | --- |
| `js/portal/events/create/legacy-costs.js` | **Create** |
| `js/portal/events/create/legacy-location.js` | **Create** |
| `js/portal/events/create/legacy-preview.js` | **Create** |
| `js/portal/events/create/legacy-submit.js` | **Create** |
| `js/portal/events/create.js` | **Reduce** — thin facade / glue |
| `js/portal/events/classic-chain-loader.js` | **Update** — insert legacy modules; update middle count |
| `test/_smoke-phase3d-create-bridge.js` | **Update** — loader order, legacy globals, chain count |
| `test/_smoke-phase5l-readiness.js` | **Update** — chain count/order if hardcoded |
| `test/_smoke-phase5l3-rehearsal.js` | **Update** — chain count/order if hardcoded |

**Do not modify:** `portal/events.html`, `create/sheet.js`, `create/submit.js`, `create/raffle-builder.js`, `create/step-*.js`, `create/geocode.js`, `list.js`, `manage/sheet.js`, `css/**`, `init.js` (unless a minimal unavoidable global export fix is required — prefer module `window` assignments instead).

---

## 4. Explicitly Out of Scope for 5M.1.5

| Item | Reason |
| --- | --- |
| Removing **`#createModal`** | **5M.1.6** modal unification / deprecation |
| Unifying sheet and legacy modal | **5M.1.6** |
| Deprecating legacy create path | **5M.1.6** |
| Changing LLC/competition business rules | Product change |
| Changing **EventsCreate** sheet behavior | Out of slice |
| Changing **`create/submit.js`** | Completed in 5M.1.4 |
| Changing **`create/raffle-builder.js`** | Completed in 5M.1.3 |
| Changing **step modules** | Completed in 5M.1.2 |
| **List / manage** refactors | **5M.2 / 5M.3** |
| **`portal/events.html`** changes | Loader-only wiring |
| **5L.4** compat bootstrap | Separate track |
| **CSS cleanup** | Unrelated |
| **Product behavior changes** | Refactor-only slice |
| Adding **`events:created`** to legacy path | Behavior change |

---

## 5. Loader Requirements

- **Update `classic-chain-loader.js` only** — do **not** modify `portal/events.html`.
- **Classic script style** — synchronous chain via existing loader; no `type="module"`.
- **Preserve** all `window` globals required by inline handlers and `init.js`.

### 5.1 Approved load order (recommended)

Load legacy modules **after** `create/geocode.js` and **before** `create.js` (facade), so geocode exists before location/submit, and globals are registered before the thin `create.js` slot and sheet pipeline:

```text
… → rsvp.js
  → create/geocode.js
  → create/legacy-costs.js
  → create/legacy-location.js
  → create/legacy-preview.js
  → create/legacy-submit.js
  → create.js                    ← thin facade (optional re-exports only)
  → create/step-basics.js
  → create/step-when.js
  → create/step-pricing.js
  → create/step-review.js
  → create/raffle-builder.js
  → create/submit.js
  → create/sheet.js
  → documents.js → …
```

| Rationale | Detail |
| --- | --- |
| **After geocode** | `legacy-location.js` / `legacy-submit.js` call `window.evtGeocodeAddress` |
| **Costs before location/submit** | `evtHandleCreate` reads `evtCostItems` owned by costs module |
| **Preview before submit** | Independent; loads before submit for clarity |
| **`create.js` before steps** | Preserves historical slot; steps/sheet unchanged |
| **Sheet pipeline unchanged** | `raffle-builder` → `submit` → `sheet` order frozen from 5M.1.4 |

**Expected middle chain count after implementation:** **38** (+4 legacy modules). Confirm in implementation PR and update smokes.

### 5.2 Alternative order (not preferred)

```text
… → create/geocode.js → create.js → legacy-costs → legacy-location → legacy-preview → legacy-submit → step-basics → …
```

Only use if dependency analysis proves the recommended order unsafe; document rationale in **`063`** completion report.

---

## 6. Smoke / Test Expectations (implementation PR)

Update tests **only as needed**:

| Test | Expectation |
| --- | --- |
| **`test/_smoke-phase3d-create-bridge.js`** | New legacy modules in loader chain; order `geocode → legacy-* → create.js → steps`; **EventsCreate** / **PortalEvents.create** checks unchanged; **`evtHandleCreate`** still defined (facade or `legacy-submit.js`); **`window.evtGeocodeAddress`** still from geocode module; LLC cost globals preserved; add checks that split modules assign required **`window.*`** legacy APIs |
| **`test/_smoke-phase5l-readiness.js`** | Update middle count (likely **38**) and create excerpt order |
| **`test/_smoke-phase5l3-rehearsal.js`** | Same count/order updates |

**Must remain green without semantic changes:** Phase 1, 3A, 3B, 3C, 5H, 5H6, 5I, 5J, team, raffle parity smokes.

---

## 7. Required Validation After Implementation

```bash
node --check js/portal/events/create.js
node --check js/portal/events/create/legacy-costs.js
node --check js/portal/events/create/legacy-location.js
node --check js/portal/events/create/legacy-preview.js
node --check js/portal/events/create/legacy-submit.js
node --check js/portal/events/classic-chain-loader.js

node test/_smoke-phase3d-create-bridge.js
node test/_smoke-phase5l-readiness.js
node test/_smoke-phase5l3-rehearsal.js
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3a-list-bridge.js
node test/_smoke-phase3c-manage-bridge.js
node test/_smoke-phase3b-detail-bridge.js
node test/_smoke-phase5h-detail-open-split.js
node test/_smoke-phase5h6-post-render-bridge.js
node test/_smoke-phase5i-template-shell.js
node test/_smoke-phase5j-compat-exports.js
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

---

## 8. Manual QA Expectations (after implementation)

If practical on staging:

1. Open portal **Events** page.
2. Confirm default **Create** opens **EventsCreate sheet** (not legacy modal).
3. If legacy modal path is accessible (`EventsCreate` unavailable or explicit fallback), confirm **`#createModal`** opens.
4. Legacy **location** field: typing/blur still validates via geocode indicator.
5. **LLC** event type: cost rows add/edit/remove/recalculate; inline handlers work.
6. **Preview** opens and **Back to Editor** (`evtClosePreview`) restores modal.
7. Legacy **Publish** (`evtHandleCreate`) completes without console errors (safe test account).
8. Confirm list refresh + navigation to new event slug after legacy create.

---

## 9. Rollback

- Revert the **5M.1.5 implementation commit** if legacy create behavior or smokes regress.
- Restoration target: monolithic `create.js` (~575 lines) and **34-script** loader chain (pre–5M.1.5).
- Re-run §7 smokes after revert.

```bash
git revert <5M.1.5-implementation-sha>
```

---

## 10. No-Go Reminders

- Do **not** combine **5M.1.5** with **5M.1.6** modal unification/deprecation.
- Do **not** combine create work with **list** or **manage** refactors.
- Do **not** combine with **5L.4** or **CSS cleanup**.
- Do **not** modify **production** `portal/events.html` without a new approval gate.
- Do **not** treat **`062`** as approval for **5M.1.6** or list/manage work.

---

## 11. Recommended Next Doc After Implementation

| Doc (proposed) | Purpose |
| --- | --- |
| **`063_phase_5m1_5_legacy_create_split_completion.md`** | Document successful completion of 5M.1.5 legacy `create.js` split |

### 11.1 Suggested follow-on gate (not approved here)

After **5M.1.5** completion, the next approval doc would likely be:

| Doc (proposed) | Purpose |
| --- | --- |
| **`064_phase_5m1_6_modal_unification_approval.md`** | Approve modal unification / legacy deprecation (**5M.1.6**) |

**Do not** approve or implement **5M.1.6** in this document (`062`).

---

## 12. Exit Criteria (for implementation PR)

| Criterion | Required |
| --- | :---: |
| Four `create/legacy-*.js` modules in loader after `geocode`, before `create.js` | ✓ |
| `create.js` reduced to thin facade (no duplicate bodies) | ✓ |
| All §3.3 `window.*` legacy globals preserved | ✓ |
| Sheet / submit / raffle / step modules untouched | ✓ |
| **3D** smoke passes | ✓ |
| **5L readiness / 5L3** pass with updated chain count | ✓ |
| No `portal/events.html` diff | ✓ |
| No `list` / `manage` diff | ✓ |
| No `css/**` diff in implementation commit | ✓ |

---

## 13. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/062_phase_5m1_5_legacy_create_split_approval.md
git add docs/audit/pages/events/062_phase_5m1_5_legacy_create_split_approval.md
git diff --staged --name-only
git commit -m "Approve Phase 5M.1.5 legacy create split"
git push
```

---

## Appendix — Quick reference

| Question | Answer |
| --- | --- |
| Is 5M.1.5 approved? | **Yes (gate only)** — this doc |
| Is 5M.1.5 implemented? | **No** |
| What file is split? | `js/portal/events/create.js` |
| New modules? | `legacy-costs`, `legacy-location`, `legacy-preview`, `legacy-submit` |
| Chain count (expected)? | **38** middle scripts (+4) |
| Next completion doc? | **`063_phase_5m1_5_legacy_create_split_completion.md`** |
