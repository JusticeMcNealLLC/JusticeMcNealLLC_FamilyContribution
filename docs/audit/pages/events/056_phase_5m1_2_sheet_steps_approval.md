# Phase 5M.1.2 — Create Sheet Step Extraction (Approval)

**Document:** `056_phase_5m1_2_sheet_steps_approval.md`  
**Path:** `docs/audit/pages/events/056_phase_5m1_2_sheet_steps_approval.md`  
**Date:** 2026-05-21  
**Status:** **APPROVED (gate only)** — authorizes a **future** 5M.1.2 runtime PR; **no code in this commit**  
**Prior completion:** `055_phase_5m1_1_geocode_extraction_completion.md` (`15c3692`, impl `0ee3794`)  
**Create inventory:** `048_create_surface_inventory.md` (`8e6f2c0`)  
**Program approval:** `054_phase_5m1_0_create_implementation_approval.md` (`d04bef2`)

---

## Important: What This Commit Approves

| This commit (`056` doc) | Future 5M.1.2 PR (not started) |
| --- | --- |
| Documentation-only approval | Runtime + optional loader/smoke updates |
| **Does not** modify `js/**`, HTML, CSS, or tests | **Will** add `create/step-*.js` and thin `create/sheet.js` |
| Approves **5M.1.2 only** | **5M.1.3+** require separate approval docs |

**Phase 5M.1.2 is approved as a scope definition.** Implementation may proceed in a **separate** PR touching only approved files.

---

## 1. Current Baseline

| Item | State |
| --- | --- |
| **Phase 5M.0** | **Complete** — loader-aware 3A/3C/3D (`d99539f`, `9ee6e90`) |
| **Phase 5M.1.1** | **Complete** — `create/geocode.js` (`0ee3794`, `15c3692`) |
| **`create/geocode.js`** | Loads **before** `create.js` and `create/sheet.js` |
| **Default create UX** | `EventsCreate` → `create/sheet.js` (~1,009 lines, IIFE) |
| **Legacy create UX** | `#createModal` + `create.js` / `evtHandleCreate` — **unchanged** |
| **`portal/events.html`** | **3-tag** model — **not modified** since 5L.3 |
| **Middle chain count** | **28** scripts (post–5M.1.1) |
| **5M.1.2 implementation** | **Not started** |
| **5M.1.3+ / 5M.2 / 5M.3 / 5L.4** | **Not started** |

```text
Current create loader excerpt:
  … → rsvp.js → create/geocode.js → create.js → create/sheet.js → documents.js → …
```

---

## 2. Create Sheet Summary (from `048` / `055`)

| Property | Value |
| --- | --- |
| **File** | `js/portal/events/create/sheet.js` |
| **Lines** | **~1,009** |
| **Pattern** | Classic IIFE; injects `#ecSheetRoot` |
| **Steps** | **Basics** → **When & Where** → **Pricing** → **Review** |
| **Public API** | `window.EventsCreate`, `window.PortalEvents.create` (`open`, `close`, `isFlagOn`) |
| **Custom event** | `events:created` on successful publish/draft |

### 2.1 Step-related functions (extraction targets)

| Step | Render | Wire | Notes |
| --- | --- | --- | --- |
| **Basics** | `_basicsHtml` | `_wireBasics` | Includes banner/embed via `_wireImageUpload` (basics-only) |
| **When** | `_whenHtml` | `_wireWhen` | Includes `_doGeocode` → `window.evtGeocodeAddress` |
| **Pricing** | `_pricingHtml` | `_wirePricing` | Embeds `_raffleBuilderHtml()` in HTML — **builder stays in sheet** for 5M.1.2 |
| **Review** | `_reviewHtml` | `_wireReview` | Currently no-op wire |

### 2.2 Remains in `create/sheet.js` (orchestrator — not 5M.1.2 scope)

| Area | Functions / symbols |
| --- | --- |
| **Lifecycle** | `_ensureMounted`, `open`, `close`, `_confirmClose` |
| **Step machine** | `_render`, `_back`, `_next`, `_validateStep`, `STATE`, `STEPS` |
| **Raffle builder** | `_raffleBuilderHtml`, `_wireRaffleBuilder`, `_normalizeRaffleConfig`, prize image helpers, etc. (**5M.1.3**) |
| **Persistence** | `_submit`, `_submitting` (**5M.1.4**) |
| **Shared helpers** | `_esc`, `_raffleModel`, `_ensureRaffleConfig`, `_setImageFile`, `_setPrizeImage`, review raffle HTML |
| **Bridges** | `window.EventsCreate`, `window.PortalEvents.create` |

**5M.1.2 focus:** step **render + wire** only — not raffle builder, not submit/storage, not product changes.

---

## 3. Approved 5M.1.2 Scope

### 3.1 Approval statement

**APPROVED:** Phase **5M.1.2 — sheet step module extraction** as the **next create-track runtime PR**.

### 3.2 Target modules (under `js/portal/events/create/`)

| Module (preferred name) | Moves from `sheet.js` |
| --- | --- |
| **`create/step-basics.js`** | `_basicsHtml`, `_wireBasics`, `_wireImageUpload` (only used by basics) |
| **`create/step-when.js`** | `_whenHtml`, `_wireWhen`, `_doGeocode` |
| **`create/step-pricing.js`** | `_pricingHtml`, `_wirePricing` — may **call** `_raffleBuilderHtml` still defined on orchestrator |
| **`create/step-review.js`** | `_reviewHtml`, `_wireReview` |

Alternative names (`step-basics.js`, etc.) are acceptable if consistent.

### 3.3 Integration pattern (implementation choice)

Implementer may use either pattern, documented in **`057` completion**:

| Pattern | Description |
| --- | --- |
| **A — Namespace** | Each step module registers `window.PortalEvents.create.steps.basics = { html, wire }` (or similar); `sheet.js` dispatches |
| **B — Global hooks** | Each module assigns `window.EventsCreateSteps = { basics: { … } }` with stable names |
| **C — Thin sheet delegates** | Step modules export via IIFE closure + single assign object read by `sheet.js` |

**Requirement:** `create/sheet.js` remains the **orchestrator** — owns `open`/`close`/`_render`/`_validateStep`/`STATE`/`STEPS`.

### 3.4 Must preserve (no intentional behavior change)

| Contract | Requirement |
| --- | --- |
| **`EventsCreate.open` / `close` / `isFlagOn`** | Unchanged signatures and behavior |
| **`window.EventsCreate`** | `{ open, close, isFlagOn }` |
| **`window.PortalEvents.create`** | Mirror of above |
| **`STATE` / `STEPS`** | Same step keys: `basics`, `when`, `pricing`, `review` |
| **`_render` dispatch** | Same step index → same UI |
| **`_validateStep`** | Same validation rules (may move code only if rules unchanged) |
| **`_doGeocode`** | Still uses **`window.evtGeocodeAddress`** from `create/geocode.js` |
| **Image upload (basics)** | Banner/embed pickers still mutate `STATE` |
| **Draft / publish** | `_submit('draft'|'open')` unchanged in orchestrator |
| **`events:created`** | Unchanged dispatch |
| **`#ecSheetRoot` DOM** | Same element IDs in generated HTML |

---

## 4. Explicitly Out of Scope for 5M.1.2

| Out of scope | Reason / defer to |
| --- | --- |
| **Raffle builder** — `_raffleBuilderHtml`, `_wireRaffleBuilder`, `_normalizeRaffleConfig`, `_updateCategory`, `_updateItem`, `_remove*`, `_move*`, prize image maps | **5M.1.3** |
| **`_submit` / storage / Supabase insert** | **5M.1.4** |
| **`evtHandleCreate` / LLC cost builder** | **5M.1.5** (`create.js`) |
| **Unify sheet + legacy modal / remove `#createModal`** | **5M.1.6** product gate |
| **LLC / competition product behavior** | Unchanged |
| **`list.js` / `manage/sheet.js`** | **5M.2 / 5M.3** |
| **`portal/events.html`** | Separate approval gate |
| **5L.4 compat bootstrap** | Different track |
| **CSS cleanup** | Separate PR |
| **5M.1.3+ in same PR** | One slice per PR |

---

## 5. Loader Requirements

### 5.1 Rules

- Update **`js/portal/events/classic-chain-loader.js` only** — **not** `portal/events.html`.
- New modules: **classic script**, **no** native `export`.
- Load **after** `create/geocode.js`, **before** `create/sheet.js`.
- **`create.js`** position unchanged (legacy modal; does not require step modules).

### 5.2 Recommended chain order (preferred)

Load step modules **immediately before** `create/sheet.js` so the orchestrator can call into registered step APIs at runtime:

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

| Rationale | |
| --- | --- |
| **`create.js` before steps** | Legacy path unchanged; geocode already available |
| **Steps before `sheet.js`** | Orchestrator loads last among create modules; all step registrations exist before `sheet.js` IIFE runs |
| **Avoid** `step-*` before `create.js` unless implementer documents a hard dependency |

**Alternative** (allowed if documented in PR + `057`):

```text
… → create/geocode.js → create/step-*.js → create.js → create/sheet.js → …
```

Only if `create.js` has **no** new dependency on step modules.

### 5.3 Chain count expectation

| Before 5M.1.2 | After 5M.1.2 (expected) |
| ---: | ---: |
| **28** middle scripts | **32** (+4 step modules) |

---

## 6. Smoke / Test Expectations (implementation PR)

Update **only as needed**:

| Test | Expected updates |
| --- | --- |
| **`test/_smoke-phase3d-create-bridge.js`** | `create/step-*.js` in chain; load order before `create/sheet.js`; orchestrator still owns `EventsCreate` / `PortalEvents.create`; step fns not required in `sheet.js` source if moved |
| **`test/_smoke-phase5l-readiness.js`** | Chain count **32**; step order assertions |
| **`test/_smoke-phase5l3-rehearsal.js`** | Chain count **32** |
| **Other smokes** | Touch only if direct failure |

### 6.1 Suggested new 3D checks

- Each `create/step-*.js` exists, IIFE, no `export`.
- `create/sheet.js` still assigns `window.EventsCreate`.
- `create/sheet.js` still contains `_render`, `_validateStep`, `_submit`.
- `create/sheet.js` does **not** contain `_basicsHtml` (etc.) after extraction — or delegates in one line to step module.

---

## 7. Required Validation After 5M.1.2 Implementation

```bash
node --check js/portal/events/create/sheet.js
node --check js/portal/events/create/step-basics.js
node --check js/portal/events/create/step-when.js
node --check js/portal/events/create/step-pricing.js
node --check js/portal/events/create/step-review.js
node --check js/portal/events/classic-chain-loader.js

node test/_smoke-phase3d-create-bridge.js
node test/_smoke-phase5l-readiness.js
node test/_smoke-phase5l3-rehearsal.js
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3a-list-bridge.js
node test/_smoke-phase3c-manage-bridge.js
node test/_smoke-phase3b-detail-bridge.js
```

Full **Phase 5 gate** — run if practical (same suite as 5M.1.1 closeout).

---

## 8. Manual QA Expectations

After implementation, if practical:

| Check | Expected |
| --- | --- |
| Open portal Events → **Create** | `EventsCreate` sheet opens |
| Step **Basics** | Fields render; banner/embed pickers work |
| Step **When & Where** | Date/location fields; **geocode** resolves via `evtGeocodeAddress` |
| Step **Pricing** | Pricing + raffle section visible (builder still in orchestrator) |
| Step **Review** | Summary renders |
| **Back/Next** | `STATE` persists between steps |
| **Save draft / Publish** | Still wired (orchestrator `_submit`) |
| **Console** | No new errors |

---

## 9. Rollback

1. **Revert** the 5M.1.2 implementation commit(s).
2. Restore step functions inline in `create/sheet.js` if needed.
3. Restore loader chain to **28** entries (5M.1.1 shape).
4. Re-run §7 smokes.

Approval doc **`056`** remains valid for a corrected retry.

---

## 10. No-Go Reminders

- **One PR** — **5M.1.2 step extraction only**.
- **No** raffle builder (**5M.1.3**) or submit (**5M.1.4**) in the same merge.
- **No** list/manage refactors, **5L.4**, or CSS cleanup.
- **No** production HTML changes.
- **Do not** treat **`056`** as approval for **5M.1.3** or later.

---

## 11. Recommended Next Doc

| Doc | Purpose |
| --- | --- |
| **`057_phase_5m1_2_sheet_steps_completion.md`** | Completion checkpoint after successful **5M.1.2** PR |

**After `057`:** optional **`058_phase_5m1_3_raffle_builder_approval.md`** (or equivalent) before **5M.1.3** code.

---

## 12. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/056_phase_5m1_2_sheet_steps_approval.md
git add docs/audit/pages/events/056_phase_5m1_2_sheet_steps_approval.md
git diff --staged --name-only
git commit -m "Approve Phase 5M.1.2 sheet step extraction"
git push
```

---

## Appendix — Approval summary

| Item | Approved? |
| --- | --- |
| **5M.1.2** sheet step extraction PR | **Yes** |
| **5M.1.2** in this commit | **No** (doc only) |
| **5M.1.3** raffle builder | **No** |
| **5M.1.4** submit/storage | **No** |
| **5M.2 / 5M.3 / 5L.4** | **No** |
