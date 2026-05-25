# Phase 5M.1.6 — Create Path Decision (Approval)

**Document:** `064_phase_5m1_6_create_path_decision_approval.md`  
**Path:** `docs/audit/pages/events/064_phase_5m1_6_create_path_decision_approval.md`  
**Date:** 2026-05-21  
**Status:** **APPROVED (decision gate only)** — records product/technical decision; **no runtime work authorized**  
**Prior completion:** `063_phase_5m1_5_legacy_create_split_completion.md` (`bb403d7`, impl `d76113d`)  
**Create inventory:** `048_create_surface_inventory.md` (`8e6f2c0`)  
**Program approval:** `054_phase_5m1_0_create_implementation_approval.md` (`d04bef2`)

---

## Important: What This Commit Approves

| This commit (`064` doc) | Not authorized by this commit |
| --- | --- |
| Documentation-only **decision** | Any `js/**`, HTML, CSS, or test changes |
| **Option D** — defer create-path unification | Removing `#createModal` |
| Close **5M.1.6 implementation** as out of scope for now | Extending EventsCreate sheet for LLC/competition |
| Authorize **planning** for **5M.2 list** next | Merging sheet + legacy submit behavior |
| | **5L.4**, list/manage runtime refactors |

**Phase 5M.1.6 is approved as a decision record, not an implementation slice.** Any future create-path product work requires a **new** approval doc (e.g. sheet LLC extension, modal deprecation).

---

## 1. Current Baseline

| Item | State |
| --- | --- |
| **5M.1.1** geocode extraction | **Complete** (`0ee3794`, `15c3692`) |
| **5M.1.2** sheet step extraction | **Complete** (`c0ab1da`, `73a1dc3`) |
| **5M.1.3** raffle builder extraction | **Complete** (`d4bfe02`, `c6be4ac`) |
| **5M.1.4** submit/storage extraction | **Complete** (`ecced37`, `2ecec93`) |
| **5M.1.5** legacy `create.js` split | **Complete** (`d76113d`, `bb403d7`) |
| **Create surface** | **Structurally modularized** — no monolithic create runtime left |
| **Default create path** | **EventsCreate sheet** (`window.EventsCreate.open`) |
| **Legacy path** | **`#createModal`** preserved — member / LLC / competition |
| **Sheet event types** | **Member** events (M4a); LLC/competition not in sheet UI |
| **Legacy event types** | **Member, LLC, competition** |
| **`portal/events.html`** | **3-tag** model — **unchanged** since 5L.3 |
| **Middle chain count** | **38** scripts |
| **Product behavior** | **No intentional change** through 5M.1.5 |
| **5M.1.6 implementation** | **Deferred** (this doc) |
| **5M.2 / 5M.3 / 5L.4** | **Not started** |

```text
Create loader excerpt (post–5M.1.5):
  … → create/geocode.js
    → create/legacy-costs.js → legacy-location.js → legacy-preview.js → legacy-submit.js
    → create.js (facade)
    → create/step-*.js → raffle-builder.js → submit.js → sheet.js → …
```

---

## 2. Current Create Paths

### 2.1 Path A — EventsCreate sheet (default)

| Property | Detail |
| --- | --- |
| **Entry** | `#createEventBtn`, `#emptyCreateBtn`, list create affordances → `init.js` `_openCreate()` → `EventsCreate.open()` |
| **UX** | Modern **4-step sheet** (Basics → When & Where → Pricing → Review) |
| **Event types** | **Member** events only in product UI |
| **Runtime modules** | `create/sheet.js` orchestrator; `create/step-*.js`; `create/raffle-builder.js`; `create/submit.js`; `create/geocode.js` for `_doGeocode` |
| **Persistence** | Draft / publish via `EventsCreateSubmit.submit`; `status` `'draft'` \| `'open'` |
| **Post-create** | `events:created` custom event → **`init.js`** listener calls `evtLoadEvents()`; publish may `evtNavigateToEvent(slug)` |

### 2.2 Path B — Legacy `#createModal` (fallback + LLC/competition)

| Property | Detail |
| --- | --- |
| **Entry** | `init.js` `_openCreate()` **fallback** if `EventsCreate` unavailable; otherwise separate flows that open modal when needed |
| **UX** | Single-page **`#createEventForm`** inside `#createModal` |
| **Event types** | **Member, LLC, competition** (`#eventType`) |
| **Runtime modules** | `create/legacy-costs.js`, `legacy-location.js`, `legacy-preview.js`, `legacy-submit.js`; thin `create.js` facade |
| **Persistence** | Publish-only via `evtHandleCreate`; **`status: 'open'`** |
| **Post-create** | Direct **`evtLoadEvents()`** + **`evtNavigateToEvent(slug)`** — **no** `events:created` dispatch |

### 2.3 Shared vs divergent behavior

| Concern | Shared? | Notes |
| --- | --- | --- |
| **Geocode** | Yes | `window.evtGeocodeAddress` (`create/geocode.js`) |
| **Loader** | Yes | Classic chain **38** modules; `portal/events.html` unchanged |
| **Banner/embed files** | Partially | Legacy: `evtBannerFile` / `evtEmbedImageFile` (`state.js`); Sheet: `STATE.bannerFile` / `STATE.embedImageFile` |
| **List refresh** | Both reload list | Sheet via `events:created` + submit fallback; legacy via direct `evtLoadEvents()` |
| **Navigation after create** | Both can navigate | Sheet on publish; legacy always navigates to new slug |
| **LLC cost builder** | Legacy only | `legacy-costs.js` + inline handlers |
| **Competition phases** | Legacy only | `legacy-submit.js` inserts `competition_phases` |

---

## 3. Decision Options

### Option A — Keep both paths as-is

| Pros | Cons |
| --- | --- |
| **No product change** | Dual-path complexity remains |
| **Lowest immediate risk** | LLC/competition still require legacy modal |
| Sheet stays default | Different post-create contracts persist |
| Legacy remains LLC/competition path | Manual QA burden for two paths |

**Fit:** Stable refactor checkpoint; acceptable if next work is **list/manage**.

---

### Option B — Extend EventsCreate sheet to support LLC/competition

| Pros | Cons |
| --- | --- |
| Single modern UX long-term | **Large product + engineering scope** |
| Could eventually deprecate modal | LLC cost builder + competition phases in sheet UI |
| | Requires **new approval**, design, and QA before modal removal |
| | High regression risk for paid/RSVP/competition rules |

**Fit:** Future **product-gated** track — **not** approved in this doc.

---

### Option C — Keep legacy modal only for LLC/competition long-term

| Pros | Cons |
| --- | --- |
| Clear split: sheet = member, modal = LLC/comp | Two UIs indefinitely |
| Middle-ground vs full unification | Users may need guidance on which path to use |
| Lower risk than Option B | `#createModal` HTML + legacy modules remain forever until a later decision |

**Fit:** Viable product policy — but still needs **UX documentation**; does not require immediate implementation.

---

### Option D — Defer create-path decision; move to list refactor (recommended)

| Pros | Cons |
| --- | --- |
| **Create modularization complete** — no blocking structural debt | Create-path product questions stay open |
| **No runtime risk** now | `#createModal` remains in HTML |
| Refactor momentum continues to **5M.2 list** | Optional manual QA still recommended |
| Aligns with audit plan (list/manage after create) | Options B/C remain for a future gate |

**Fit:** **Recommended** — create runtime is stable; list surface is the next high-value refactor target per `046`–`051` audit track.

---

## 4. Recommended Decision

**Recommend Option D**, with **Option A** as the implicit runtime policy until a future product gate:

| Decision element | Choice |
| --- | --- |
| **Implement 5M.1.6 unification now?** | **No** |
| **Remove `#createModal`?** | **No** |
| **Change EventsCreate sheet behavior?** | **No** |
| **Change LLC/competition legacy behavior?** | **No** |
| **Next refactor track** | **5M.2 list** (after create-track closeout doc) |
| **Sheet LLC/competition extension** | **Deferred** — requires separate product approval (Option B or C revisit) |

**Rationale:**

1. **5M.1.1–5M.1.5** achieved the structural goal: modular classic scripts, **38-chain** loader, smokes green, HTML untouched.
2. Remaining create work is **product policy**, not mechanical extraction.
3. **List** (`list.js` ~3k lines) is the next approved program direction (`054`, `051`) with higher refactor ROI than speculative sheet extension.
4. Forcing path unification now would mix **product**, **HTML**, and **QA** risk without a dedicated implementation approval.

---

## 5. Explicit Approval Decision

### 5.1 Approved: Option D — Defer create-path implementation

This document **approves**:

| Approved | Detail |
| --- | --- |
| **Defer 5M.1.6 runtime implementation** | No sheet/modal merge, no modal removal, no LLC/competition sheet work in 5M.1.6 |
| **Maintain Option A runtime policy** | Dual paths unchanged: sheet default, legacy fallback + LLC/competition |
| **Proceed to create-track closeout + list planning** | Next docs below; **not** created in this commit |

### 5.2 Not approved (require future docs)

| Item | Required gate |
| --- | --- |
| Remove `#createModal` | Product sign-off + HTML approval + implementation PR |
| Unify post-create (`events:created` vs direct reload) | Behavior approval + small targeted PR |
| Extend sheet for LLC/competition (Option B) | Product spec + `065+` implementation approval |
| Formal long-term dual path policy doc (Option C) | Product/UX doc optional; not blocking list refactor |

### 5.3 No runtime changes authorized

**Zero** files in `js/**`, `portal/events.html`, `css/**`, or `test/**` are authorized by **`064`**.

---

## 6. Recommended Next Documents

| Order | Doc (proposed) | Purpose |
| --- | --- | --- |
| **1** | **`065_phase_5m1_create_track_closeout.md`** | Formal closeout of **5M.1.x** create modularization; record final chain, modules, and deferred items |
| **2** | **`066_phase_5m2_0_list_refactor_approval.md`** (or `065` if closeout merged) | Approve **5M.2** list refactor scope — **implementation not started** until that doc |

**Do not** create **`065`** or **`066`** in this commit.

---

## 7. Risks and Deferred Items

| Item | Status |
| --- | --- |
| **LLC/competition in EventsCreate sheet** | **Deferred** — legacy modal required today |
| **`#createModal` in HTML** | **Required** — do not remove without explicit product approval |
| **Post-create path parity** | Sheet uses `events:created`; legacy uses direct `evtLoadEvents` + navigate — **documented divergence** |
| **Manual QA** | Full sheet draft/publish + legacy LLC/competition publish **still recommended** on staging |
| **Inline onclick on LLC cost rows** | Legacy contract — preserved in `legacy-costs.js` |
| **Competition phase inserts** | Legacy-only — any sheet port needs schema/UI parity review |
| **create.js facade** | May remain comments-only until modal deprecation is approved |

---

## 8. No-Go Reminders

- Do **not** remove **`#createModal`** without explicit product approval and a new implementation gate.
- Do **not** merge sheet and legacy paths without a **separate** implementation approval (not 5M.1.6).
- Do **not** combine create-path changes with **5M.2 list** or **5M.3 manage** in one PR.
- Do **not** combine with **5L.4** or **CSS cleanup**.
- Do **not** modify **production** `portal/events.html` under this decision doc.
- Do **not** treat **`064`** as approval to implement Option B or C.

---

## 9. Exit Criteria (decision gate)

| Criterion | Met? |
| --- | :---: |
| Options A–D documented | ✓ |
| Explicit selection recorded (Option D) | ✓ |
| No runtime implementation authorized | ✓ |
| Next doc pointers defined | ✓ |
| Create modularization treated as complete | ✓ |

---

## 10. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/064_phase_5m1_6_create_path_decision_approval.md
git add docs/audit/pages/events/064_phase_5m1_6_create_path_decision_approval.md
git diff --staged --name-only
git commit -m "Add Phase 5M.1.6 create path decision"
git push
```

---

## Appendix — Quick reference

| Question | Answer |
| --- | --- |
| What was decided? | **Option D** — defer 5M.1.6 implementation; keep dual paths |
| Is modal removed? | **No** |
| Is sheet changed? | **No** |
| What's next? | **`065`** create track closeout → **`066`** (or next) **5M.2 list** approval |
| Chain count (unchanged)? | **38** middle scripts |
