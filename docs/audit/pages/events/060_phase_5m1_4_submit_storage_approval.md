# Phase 5M.1.4 — Create Submit / Storage Extraction (Approval)

**Document:** `060_phase_5m1_4_submit_storage_approval.md`  
**Path:** `docs/audit/pages/events/060_phase_5m1_4_submit_storage_approval.md`  
**Date:** 2026-05-21  
**Status:** **APPROVED (gate only)** — authorizes a **future** 5M.1.4 runtime PR; **no code in this commit**  
**Prior completion:** `059_phase_5m1_3_raffle_builder_completion.md` (`c6be4ac`, impl `d4bfe02`)  
**Create inventory:** `048_create_surface_inventory.md` (`8e6f2c0`)  
**Program approval:** `054_phase_5m1_0_create_implementation_approval.md` (`d04bef2`)

---

## Important: What This Commit Approves

| This commit (`060` doc) | Future 5M.1.4 PR (not started) |
| --- | --- |
| Documentation-only approval | Runtime + loader/smoke updates |
| **Does not** modify `js/**`, HTML, CSS, or tests | **Will** add `create/submit.js` (or approved name) and thin submit surface in `create/sheet.js` |
| Approves **5M.1.4 only** | **5M.1.5+** require separate approval docs |

**Phase 5M.1.4 is approved as a scope definition.** Implementation may proceed in a **separate** PR touching only approved files.

---

## 1. Current Baseline

| Item | State |
| --- | --- |
| **Phase 5M.0** | **Complete** — loader-aware 3A/3C/3D (`d99539f`, `9ee6e90`) |
| **Phase 5M.1.1** | **Complete** — `create/geocode.js` (`0ee3794`, `15c3692`) |
| **Phase 5M.1.2** | **Complete** — four `create/step-*.js` modules (`c0ab1da`, `73a1dc3`) |
| **Phase 5M.1.3** | **Complete** — `create/raffle-builder.js` (`d4bfe02`, `c6be4ac`) |
| **`create/sheet.js`** | **Orchestrator** — ~460 lines; open/close, STATE, `_render`, `_validateStep`, `_submit`, bridges |
| **`portal/events.html`** | **3-tag** model — **not modified** since 5L.3 |
| **Middle chain count** | **33** scripts (post–5M.1.3) |
| **5M.1.4 implementation** | **Not started** |
| **5M.1.5+ / 5M.2 / 5M.3 / 5L.4** | **Not started** |

```text
Current create loader excerpt:
  … → create/geocode.js → create.js
    → create/step-basics.js → create/step-when.js
    → create/step-pricing.js → create/step-review.js
    → create/raffle-builder.js
    → create/sheet.js → documents.js → …
```

**Product behavior:** No intentional change through 5M.1.3; 5M.1.4 must preserve the same draft/publish, storage, and post-create host-page behavior.

---

## 2. Submit / Storage Summary (still in `create/sheet.js`)

Post–5M.1.3, persistence logic remains in the orchestrator IIFE (approx. lines 296–425 in current `sheet.js`).

### 2.1 Entry points and guards

| Symbol / wiring | Role |
| --- | --- |
| **`_submit(status)`** | Async publish/draft handler; `status` is `'draft'` or `'open'` |
| **`let _submitting`** | Re-entrancy guard; early return if already in flight |
| **`ecDraftBtn` click** | `_submit('draft')` (wired in `_ensureMounted`) |
| **`_next()` on review step** | `_submit('open')` after validation passes |
| **Pre-submit validation** | `_validateStep()` for publish; title/start checks for both paths |
| **UI during submit** | Disables `#ecNextBtn` / `#ecDraftBtn`; label → `Saving…` / `Publishing…`; restored in `finally` |

### 2.2 Auth, slug, and storage uploads

| Area | Behavior |
| --- | --- |
| **Creator ID** | `window.evtCurrentUser.id` or `supabaseClient.auth.getUser()` |
| **Slug** | `window.evtGenerateSlug(title)` or fallback slug + timestamp |
| **Banner** | `STATE.bannerFile` → `event-banners` bucket, path `{slug}-{ts}.{ext}` |
| **Embed image** | `STATE.embedImageFile` → same bucket, path `embeds/{slug}-{ts}.{ext}` |
| **Prize images** | `STATE.prizeImageFiles` loop at submit → `event-raffle-prizes` bucket, path `{slug}/{itemId}-{ts}.{ext}`; mutates `raffleConfig.items[].image_url` via **`EventsCreateRaffleBuilder`** (`rb.ensureRaffleConfig`, `rb.raffleModel`) |

### 2.3 Record building and insert

| Area | Behavior |
| --- | --- |
| **Date normalization** | `start_date`, `end_date`, `rsvp_deadline` → ISO strings |
| **Money fields** | `rsvp_cost_cents`, `raffle_entry_cost_cents` from dollar form fields |
| **Location** | `location_text`, `location_nickname`, `STATE.geocode` lat/lng |
| **Raffle payload** | Normalized `raffle_config`, `raffle_winner_count`, `raffle_enabled` flags |
| **`record.status`** | `'draft'` or `'open'` per submit path |
| **Insert** | `supabaseClient.from('events').insert(record).select().single()` |

### 2.4 Post-submit host integration

| Area | Behavior |
| --- | --- |
| **`close()`** | Sheet closes after successful insert |
| **`events:created`** | `document.dispatchEvent(new CustomEvent('events:created', { detail: { event: data, status } }))` |
| **Navigation** | Publish + slug → `window.evtNavigateToEvent(data.slug)` if defined |
| **List reload** | Else `window.evtLoadEvents()`; **`init.js`** also listens for `events:created` and calls `evtLoadEvents()` |
| **Error display** | `#ecError` innerHTML with `_esc(msg)` or `alert` fallback |

### 2.5 External dependencies (must remain callable)

| Dependency | Usage in submit path |
| --- | --- |
| **`supabaseClient`** | Auth, storage, `events` insert |
| **`window.evtGenerateSlug`** | Slug generation (optional) |
| **`window.evtCurrentUser`** | Creator ID (optional) |
| **`window.EventsCreateRaffleBuilder`** | Prize config normalize + winner count at submit |
| **`_validateStep` / `_esc` / `close`** | Orchestrator; module may receive via API hooks |

---

## 3. Approved 5M.1.4 Scope

### 3.1 Approval statement

**APPROVED:** Phase **5M.1.4 — submit/storage extraction** as the **next create-track runtime PR**.

### 3.2 Target module (preferred)

| File | Purpose |
| --- | --- |
| **`js/portal/events/create/submit.js`** | Classic IIFE; owns draft/publish submit + storage uploads + insert |

Alternative names (`create-submit.js`, etc.) are acceptable if documented in PR + **`061` completion**.

### 3.3 Allowed to move

| Area | Current location | Notes |
| --- | --- | --- |
| **`_submit`** | `sheet.js` | Main async handler |
| **`_submitting` guard** | `sheet.js` | May live in module if behavior identical |
| **Banner / embed upload blocks** | Inside `_submit` | `event-banners` bucket paths |
| **Prize image upload loop** | Inside `_submit` | Uses `rb.*` + `STATE.prizeImageFiles` |
| **Record object assembly** | Inside `_submit` | All `events` row fields |
| **Slug helper usage** | Inside `_submit` | No change to slug algorithm |
| **Insert + error handling** | Inside `_submit` | Supabase + `#ecError` / alert |
| **Post-submit dispatch** | Inside `_submit` | `events:created`, navigate, `evtLoadEvents` |
| **Small helpers** | If tightly coupled | e.g. buildRecord, uploadBanner, uploadEmbed, uploadPrizeImages — implementer choice |

### 3.4 Integration pattern (implementation choice)

| Pattern | Description |
| --- | --- |
| **Preferred namespace** | `window.EventsCreateSubmit = { submit, … }` where `submit(status)` mirrors `_submit(status)` |
| **Orchestrator wiring** | `sheet.js` keeps thin delegates: `_submit(status) => EventsCreateSubmit.submit(status)` or registers hook on `EventsCreateSteps` / shared API object |
| **State access** | Module reads `STATE` via **`EventsCreateSteps.getState()`** (same as step/raffle modules) |
| **Validation** | Module calls orchestrator-provided **`validateStep`** or receives `EventsCreateSteps.validateStep` if exposed for 5M.1.4 |
| **Close / esc** | Module calls **`close()`** and **`esc()`** via orchestrator hooks after successful submit / error render |

**Requirement:** `create/sheet.js` remains the **orchestrator** for UI lifecycle — owns `open`/`close`/`_render`/`_validateStep`/`_next`/`_back`, DOM mount, footer button wiring that **invokes** submit.

### 3.5 Must preserve (no intentional behavior change)

| Contract | Requirement |
| --- | --- |
| **`EventsCreate.open` / `close` / `isFlagOn`** | Unchanged |
| **`window.EventsCreate`** | `{ open, close, isFlagOn }` |
| **`window.PortalEvents.create`** | Mirror unchanged |
| **`window.EventsCreateSteps`** | Step + raffle hooks unchanged |
| **`window.EventsCreateRaffleBuilder`** | Unchanged; submit still normalizes raffle at publish |
| **`STATE` fields consumed by submit** | Same keys and semantics |
| **`events:created` detail** | `{ event: data, status }` unchanged |
| **`init.js` listener** | No change required; still reloads list on event |
| **Storage buckets / paths** | `event-banners`, `event-raffle-prizes`, path patterns unchanged |
| **Draft vs publish rules** | Same validation gates and alerts |
| **Member-only `event_type: 'member'`** | Unchanged |

---

## 4. Explicitly Out of Scope for 5M.1.4

| Out of scope | Reason / defer to |
| --- | --- |
| **Legacy `create.js` split** | **5M.1.5** — `evtHandleCreate`, LLC costs, `#createModal` |
| **Modal unification / removing `#createModal`** | **5M.1.6** product gate |
| **`evtHandleCreate` changes** | **5M.1.5** |
| **LLC / competition behavior** | Unchanged |
| **`list.js` / `manage/sheet.js`** | **5M.2 / 5M.3** |
| **`portal/events.html`** | Separate approval gate |
| **5L.4 compat bootstrap** | Different track |
| **CSS cleanup** | Separate PR |
| **Create UI redesign** | Product — not this slice |
| **Broader storage architecture** | e.g. new buckets, CDN changes — not required for extraction |
| **5M.1.5+ in same PR** | One slice per PR |

---

## 5. Loader Requirements

### 5.1 Rules

- Update **`js/portal/events/classic-chain-loader.js` only** — **not** `portal/events.html`.
- New module: **classic script**, **no** native `export`.
- Load **after** `create/raffle-builder.js`, **before** `create/sheet.js`.

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
  → create/submit.js
  → create/sheet.js
  → documents.js → …
```

| Rationale | |
| --- | --- |
| **Raffle before submit** | Submit uses `EventsCreateRaffleBuilder` at publish time |
| **Submit before sheet** | Namespace exists before orchestrator wires footer / `_next` |
| **`create.js` position** | Unchanged (legacy modal) |

### 5.3 Chain count expectation

| Before 5M.1.4 | After 5M.1.4 (expected) |
| ---: | ---: |
| **33** middle scripts | **34** (+1 `create/submit.js`) |

---

## 6. Smoke / Test Expectations (implementation PR)

Update **only as needed**:

| Test | Expected updates |
| --- | --- |
| **`test/_smoke-phase3d-create-bridge.js`** | `create/submit.js` in chain; order `raffle-builder` → `submit` → `sheet`; orchestrator still owns `EventsCreate` / `PortalEvents.create`; `_submit` body not required in `sheet.js` if moved |
| **`test/_smoke-phase5l-readiness.js`** | Chain count **34**; submit module order |
| **`test/_smoke-phase5l3-rehearsal.js`** | Chain count **34** |
| **Other smokes** | Touch only if direct failure |

### 6.1 Suggested new 3D checks

- `create/submit.js` exists, IIFE, no `export`.
- `create/sheet.js` still assigns `window.EventsCreate`.
- `create/sheet.js` still contains `_render`, `_validateStep`, `open`, `close`.
- `create/sheet.js` still references `events:created` or delegates submit that dispatches it.
- `create/submit.js` references `supabaseClient`, `events:created`, storage buckets.
- `init.js` still has `events:created` listener (regression — no change expected).

---

## 7. Required Validation After 5M.1.4 Implementation

```bash
node --check js/portal/events/create/sheet.js
node --check js/portal/events/create/submit.js
node --check js/portal/events/classic-chain-loader.js

node test/_smoke-phase3d-create-bridge.js
node test/_smoke-phase5l-readiness.js
node test/_smoke-phase5l3-rehearsal.js
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3a-list-bridge.js
node test/_smoke-phase3c-manage-bridge.js
node test/_smoke-phase3b-detail-bridge.js
```

Full **Phase 5 gate** — run if practical (same suite as 5M.1.3 closeout):

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

After implementation, if practical (prefer **staging** for publish):

| Check | Expected |
| --- | --- |
| Open portal Events → **Create** | Sheet opens |
| Steps **Basics → When & Where → Pricing → Review** | State persists |
| **Save draft** | Triggers submit path with `status: 'draft'`; no console errors |
| **Publish** (safe env) | Triggers `status: 'open'`; validation enforced |
| **Banner / embed** | Upload controls still work; URLs in record if files selected |
| **Raffle + prize images** | Prize files upload at submit when configured |
| **`events:created`** | Fires after success; list reload via `evtLoadEvents` / `init.js` |
| **Navigation** | Publish may navigate to new event slug when `evtNavigateToEvent` exists |
| **Console** | No new errors |

---

## 9. Rollback

1. **Revert** the 5M.1.4 implementation commit(s).
2. Restore **`_submit`** and storage logic inside **`create/sheet.js`**.
3. Remove **`create/submit.js`** from loader; restore **33**-script chain.
4. Re-run §7 smokes.

```bash
git revert <5M.1.4-impl-commit>
```

---

## 10. No-Go Reminders

- Do **not** combine **5M.1.4** with **5M.1.5** legacy `create.js` split.
- Do **not** combine with **5M.1.6** modal unification or `#createModal` removal.
- Do **not** combine create work with **list** or **manage** refactors.
- Do **not** combine with **5L.4** or **CSS cleanup**.
- Do **not** modify **production** `portal/events.html` without a new approval gate.
- Do **not** treat **`060`** as permission to implement — only **`061`**-tracked PR after this gate.

---

## 11. Recommended Next Doc After Implementation

| Doc (proposed) | Purpose |
| --- | --- |
| **`061_phase_5m1_4_submit_storage_completion.md`** | Document successful completion of 5M.1.4 submit/storage extraction |

---

## 12. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/060_phase_5m1_4_submit_storage_approval.md
git add docs/audit/pages/events/060_phase_5m1_4_submit_storage_approval.md
git diff --staged --name-only
git commit -m "Approve Phase 5M.1.4 submit storage extraction"
git push
```

---

## Appendix — Quick reference

| Question | Answer |
| --- | --- |
| Is 5M.1.4 approved? | **Yes (gate only)** — this doc |
| Is 5M.1.4 implemented? | **No** — awaiting runtime PR |
| Target file? | `js/portal/events/create/submit.js` (preferred) |
| Namespace? | `window.EventsCreateSubmit` (preferred) |
| Chain count after? | **34** middle scripts |
| Next completion doc? | **`061_phase_5m1_4_submit_storage_completion.md`** |
