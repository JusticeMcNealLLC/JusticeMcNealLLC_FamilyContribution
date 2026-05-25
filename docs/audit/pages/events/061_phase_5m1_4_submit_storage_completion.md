# Phase 5M.1.4 — Create Submit / Storage Extraction (Completion Status)

**Document:** `061_phase_5m1_4_submit_storage_completion.md`  
**Path:** `docs/audit/pages/events/061_phase_5m1_4_submit_storage_completion.md`  
**Date:** 2026-05-21  
**Status:** **Complete** — submit/storage module extracted; smokes green; ready for next create slice approval  
**Approval:** `060_phase_5m1_4_submit_storage_approval.md` (`70884e3`)  
**Implementation:** `ecced37` — Extract Events create submit storage  
**Prior checkpoint:** `059_phase_5m1_3_raffle_builder_completion.md` (`c6be4ac`, impl `d4bfe02`)

---

## 1. Completion Summary

Phase **5M.1.4 — submit/storage extraction** is **complete**.

| Milestone | Commit | What shipped |
| --- | --- | --- |
| **5M.1.4 approval** | `70884e3` | Submit/storage extraction scope approved (`060`) |
| **5M.1.4 implementation** | `ecced37` | `create/submit.js` + thin orchestrator delegate + loader/smokes |

| Property | Value |
| --- | --- |
| **Submit module** | `js/portal/events/create/submit.js` (new) |
| **Namespace** | `window.EventsCreateSubmit` |
| **Orchestrator** | `create/sheet.js` — lifecycle, STATE, `_render`, `_validateStep`, bridges, thin `_submit` |
| **Product behavior** | **No intentional change** — same draft/publish, storage paths, post-create host behavior |
| **`portal/events.html`** | **Unchanged** (3-tag model) |
| **`create.js` / `list.js` / `manage/sheet.js`** | **Unchanged** |
| **`css/**`** | **Unchanged** |
| **5M.1.5+** | **Not started** |
| **5L.4** | **Not started** |

---

## 2. Files Changed in Implementation (`ecced37`)

| File | Change |
| --- | --- |
| `js/portal/events/create/submit.js` | **Created** — submit guard, validation, uploads, record assembly, Supabase insert, `events:created` |
| `js/portal/events/create/sheet.js` | **Reduced** — async `_submit` body removed; thin delegate + `EventsCreateSteps.validateStep` / `close` wiring |
| `js/portal/events/classic-chain-loader.js` | **Updated** — `create/submit.js` after `create/raffle-builder.js`, before `create/sheet.js`; **34** middle scripts |
| `test/_smoke-phase3d-create-bridge.js` | **Updated** — submit module ownership, 34-chain, loader order |
| `test/_smoke-phase5l-readiness.js` | **Updated** — 34-chain + submit order |
| `test/_smoke-phase5l3-rehearsal.js` | **Updated** — 34-chain + submit order |

**Not changed:** `portal/events.html`, `create.js`, step modules (`step-*.js`), `create/geocode.js`, `create/raffle-builder.js`, `list.js`, `manage/sheet.js`, `css/**`.

---

## 3. Extracted Submit Module

Classic script style (IIFE, `'use strict'`, no `import`/`export`). Registers **`window.EventsCreateSubmit`** at load time. Loads **before** `create/sheet.js`; reads orchestrator hooks from **`EventsCreateSteps`** at submit time (registered by `sheet.js` via `_bindCreateStepsApi()`).

### 3.1 Public module API

| Symbol | Role |
| --- | --- |
| **`submit(status)`** | Async publish/draft handler; `status` is `'draft'` or `'open'` |

### 3.2 Module responsibilities

| Area | Behavior |
| --- | --- |
| **`_submitting` guard** | Re-entrancy guard; early return if already in flight |
| **Draft/open validation** | `EventsCreateSteps.validateStep()` for publish; title/start required checks |
| **Event record assembly** | Builds Supabase `events` insert payload from `STATE.form` + geocode + raffle config |
| **Supabase events insert** | `supabaseClient.from('events').insert(record).select().single()` |
| **Banner/embed uploads** | `STATE.bannerFile` / `STATE.embedImageFile` → `event-banners` bucket (same paths as pre-extract) |
| **Raffle prize uploads** | `STATE.prizeImageFiles` at publish → `event-raffle-prizes` via **`EventsCreateRaffleBuilder`** |
| **`#ecError` error UI** | Renders escaped error in `#ecError` via `EventsCreateSteps.esc`; fallback `alert` |
| **`events:created` dispatch** | `document.dispatchEvent(new CustomEvent('events:created', { detail: { event: data, status } }))` |
| **Post-submit behavior** | `EventsCreateSteps.close()`; `evtNavigateToEvent` on publish or `evtLoadEvents` fallback |

### 3.3 Runtime dependencies (unchanged contract)

| Dependency | Usage |
| --- | --- |
| **`EventsCreateSteps.getState`** | Reads `STATE` for form, files, geocode |
| **`EventsCreateSteps.validateStep`** | Publish-step validation (wired by `sheet.js`) |
| **`EventsCreateSteps.esc`** | HTML escape for error banner |
| **`EventsCreateSteps.close`** | Close sheet after successful insert |
| **`EventsCreateRaffleBuilder`** | `ensureRaffleConfig`, `raffleModel().normalizeConfig`, prize upload loop |
| **`window.evtCurrentUser`** | Creator ID (fallback `supabaseClient.auth.getUser()`) |
| **`window.evtGenerateSlug`** | Slug generation when present |
| **`supabaseClient`** | Auth, storage, `events` table |

### 3.4 Moved from `sheet.js` (no longer in orchestrator source)

| Former symbol / block | Now in module |
| --- | --- |
| `let _submitting` | `submit.js` (module scope) |
| `async function _submit(status) { … }` body | `async function submit(status) { … }` |
| Banner/embed upload helpers | Inside `submit()` |
| Prize image upload loop at publish | Inside `submit()` |
| Record assembly + insert | Inside `submit()` |
| `events:created` dispatch | Inside `submit()` |
| Post-submit close / navigation / list refresh | Inside `submit()` |

---

## 4. Sheet Orchestrator Remains (`create/sheet.js`)

| Area | Symbols / behavior |
| --- | --- |
| **Public API** | `open`, `close`, `isFlagOn` → `window.EventsCreate`, `window.PortalEvents.create` |
| **State machine** | `STATE`, `STEPS`, `_render`, `_validateStep`, `_back`, `_next` |
| **DOM shell** | `_ensureMounted`, `_confirmClose`, step footer wiring (`ecDraftBtn`, `ecNextBtn`) |
| **Submit delegate** | `_submit(status)` → `window.EventsCreateSubmit.submit(status)` only |
| **Step API registration** | `_bindCreateStepsApi()` — `getState`, `render`, `validateStep`, `close`, `esc`, raffle hooks |
| **Raffle bridge** | `_raffleApi()` → `window.EventsCreateRaffleBuilder` |
| **Validation (pricing)** | `rb.raffleModel().validateConfig(rb.ensureRaffleConfig())` in `_validateStep` |
| **Helpers** | `_esc` |

**Not in orchestrator after 5M.1.4:** `_submitting`, Supabase insert, storage uploads, `events:created` dispatch.

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
  → create/submit.js
  → create/sheet.js
  → documents.js → …
```

| Property | Value |
| --- | --- |
| **Middle script count** | **34** (was 33 after 5M.1.3; +1 submit module) |
| **New entry** | `create/submit.js` after `create/raffle-builder.js`, **before** `create/sheet.js` |
| **`portal/events.html`** | **Not modified** — loader-only wiring |

---

## 6. Validation Summary

All commands run against commit **`ecced37`**.

### 6.1 Syntax checks

| Command | Result |
| --- | --- |
| `node --check js/portal/events/create/sheet.js` | **OK** |
| `node --check js/portal/events/create/submit.js` | **OK** |
| `node --check js/portal/events/classic-chain-loader.js` | **OK** |

### 6.2 Primary create / gate smokes

| Command | Result |
| --- | --- |
| `node test/_smoke-phase3d-create-bridge.js` | **137 / 137 PASS** |
| `node test/_smoke-phase5l-readiness.js` | **38 / 38 PASS** (34-chain) |
| `node test/_smoke-phase5l3-rehearsal.js` | **16 / 16 PASS** |
| `node test/_smoke-phase1-bridge.js` | **PASS** |
| `node test/_smoke-phase3a-list-bridge.js` | **PASS** |
| `node test/_smoke-phase3c-manage-bridge.js` | **PASS** |
| `node test/_smoke-phase3b-detail-bridge.js` | **PASS** |

### 6.3 Regression smokes (5M.1.4 closeout)

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
| Portal Events → Create → draft/publish with uploads | **Not run** in implementation session |
| `events:created` → list refresh via `init.js` | **Optional follow-up** on staging/production |

---

## 7. Optional Manual QA Recommendation

Quick pass on staging if desired before **5M.1.5**:

1. Open portal **Events** page.
2. Click **Create** — confirm sheet opens.
3. Step through **Basics → When & Where → Pricing → Review**.
4. Confirm **Save draft** renders and follows the expected path in a safe/staging context.
5. Confirm **Publish** renders and follows the expected path in a safe/staging context.
6. Confirm **banner/embed** upload controls still render on Basics.
7. Confirm **raffle prize image** behavior if exercised on Pricing.
8. Confirm **`events:created`** still dispatches after sheet submit (network/custom event).
9. Confirm **list refresh** still occurs through the existing `init.js` listener.
10. Confirm **no console errors** during the flow.

---

## 8. Exit Criteria (from `060`)

| Criterion | Met? |
| --- | :---: |
| `create/submit.js` in loader after `create/raffle-builder.js`, before `create/sheet.js` | ✓ |
| `EventsCreateSubmit` namespace with `submit` API | ✓ |
| `create/sheet.js` still owns `EventsCreate` / `PortalEvents.create` orchestration | ✓ |
| `EventsCreateSteps` hooks preserved (`validateStep`, `close`, raffle, steps) | ✓ |
| **3D** smoke passes (137 checks) | ✓ |
| **5L readiness / 5L3** pass (34-chain) | ✓ |
| No `portal/events.html` diff | ✓ |
| No `list` / `manage` / `create.js` diff | ✓ |
| No `css/**` diff in implementation commit | ✓ |

**5M.1.4 exit criteria: satisfied.**

---

## 9. Current Status

| Track | Status |
| --- | --- |
| **5M.0** smoke baseline | **Complete** |
| **5M.1.1** geocode extraction | **Complete** (`0ee3794`) |
| **5M.1.2** sheet step extraction | **Complete** (`c0ab1da`) |
| **5M.1.3** raffle builder extraction | **Complete** (`d4bfe02`) |
| **5M.1.4** submit/storage extraction | **Complete** (`ecced37`) |
| **5M.1.5** legacy `create.js` split | **Not started** |
| **5M.1.6** modal unification / deprecation | **Not started** |
| **5M.2 list / 5M.3 manage** | **Not started** |
| **5L.4** | **Not started** |

```text
060 approve 5M.1.4 → ecced37 submit-storage → 061 complete (this doc)
  → 062 approve 5M.1.5 (next) → implementation PR
```

---

## 10. Recommended Next Gate

| Doc (proposed) | Purpose |
| --- | --- |
| **`062_phase_5m1_5_legacy_create_split_approval.md`** | Approve **5M.1.5** — legacy `create.js` split |

### 10.1 Suggested next slice preview (not approved here)

**5M.1.5** would likely split legacy `create.js` into focused modules such as:

| Target (proposed) | Scope |
| --- | --- |
| **Legacy LLC cost builder** | Cost/tier UI used by legacy modal path |
| **Legacy modal location validation** | Location fields + geocode wiring in `#createModal` |
| **Legacy `evtHandleCreate` submit branches** | Draft/publish paths distinct from sheet |
| **Preview helpers** | Legacy preview rendering |

**Do not** approve or implement **5M.1.5** in this document (`061`).

**Do not** combine **5M.1.5** with **5M.1.6** modal unification/deprecation, **list/manage** refactors, or **5L.4** in one PR.

---

## 11. No-Go Reminders (post-5M.1.4)

- Do **not** combine **5M.1.5** legacy `create.js` split with **5M.1.6** modal unification/deprecation.
- Do **not** combine create work with **list** or **manage** refactors.
- Do **not** combine with **5L.4** or **CSS cleanup**.
- Do **not** modify **production** `portal/events.html` without a new approval gate.
- Do **not** treat **`061`** as approval for **5M.1.5** implementation.

---

## 12. Rollback Reference

Revert submit/storage extraction only:

```bash
git revert ecced37
```

Restores async `_submit` body inside `create/sheet.js` and 33-script loader chain (post–5M.1.3, pre–5M.1.4). Re-run §6 smokes after revert.

---

## 13. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/061_phase_5m1_4_submit_storage_completion.md
git add docs/audit/pages/events/061_phase_5m1_4_submit_storage_completion.md
git diff --staged --name-only
git commit -m "Add Phase 5M.1.4 submit storage completion"
git push
```

---

## Appendix — Quick reference

| Question | Answer |
| --- | --- |
| Is 5M.1.4 done? | **Yes** (`ecced37`) |
| Where is submit/storage? | `js/portal/events/create/submit.js` |
| Namespace? | `window.EventsCreateSubmit` |
| Chain count? | **34** middle scripts |
| Next approval doc? | **`062_phase_5m1_5_legacy_create_split_approval.md`** |
