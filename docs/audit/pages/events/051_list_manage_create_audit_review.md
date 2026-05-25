# Events Refactor — List / Manage / Create Audit Review

**Document:** `051_list_manage_create_audit_review.md`  
**Path:** `docs/audit/pages/events/051_list_manage_create_audit_review.md`  
**Date:** 2026-05-21  
**Status:** **Audit review complete** — audit track closed for planning; **no implementation**  
**Prior gate:** Phase 5L closed (`045`, `d483f6a`)  
**Audit set:** `046` (`1ce201c`) → `047` (`59fbe7e`) → `048` (`8e6f2c0`) → `049` (`5224f0e`) → `050` (`d21d6eb`)  
**Related:** `025_phase_5_remaining_refactor_completion_roadmap.md`, `050_list_manage_create_risk_smoke_map.md`

---

## 1. Audit Set Reviewed

This review closes the **list / manage / create** audit track opened after Phase 5L. The following deliverables were read as a set and are considered **complete for planning purposes**.

| Doc | Commit | Title | Role |
| --- | --- | --- | --- |
| **`046_list_manage_create_audit_kickoff.md`** | `1ce201c` | Audit kickoff | Scope, goals, loader positions, out-of-scope boundaries |
| **`047_list_surface_inventory.md`** | `59fbe7e` | List surface inventory | `list.js` (~2,761 lines): responsibilities, functions, seams, risks, 5M.2.x preview |
| **`048_create_surface_inventory.md`** | `8e6f2c0` | Create surface inventory | Dual paths: `create.js` + `create/sheet.js` (~1,634 combined); 5M.1.x preview |
| **`049_manage_surface_inventory.md`** | `5224f0e` | Manage surface inventory | `manage/sheet.js` (~2,140 lines); 8 tabs; no `manage.js`; 5M.3.x preview |
| **`050_list_manage_create_risk_smoke_map.md`** | `d21d6eb` | Risk & smoke map | Cross-surface risks, smoke matrix, dependencies, implementation order |

### 1.1 Audit coverage checklist

| Goal (from `046`) | Evidence |
| --- | --- |
| Remaining monoliths sized and mapped | `047`–`049` line counts, function inventories, tab/step models |
| Safe split seams identified | Per-surface “split seam” sections in each inventory |
| Global / bridge dependencies documented | `PortalEvents.*`, `evt*`, `EventsCreate` / `EventsManage`, inline onclick |
| Smoke coverage gaps listed | `050` §5–§6; 3A/3C/3D vs 3-tag loader called out |
| Recommended phase order | `050` §8; affirmed below with **5M.0** prepended |

### 1.2 Production baseline (unchanged by this review)

| Item | State |
| --- | --- |
| **Portal Events HTML** | **3-tag** model: `index.js` → `classic-chain-loader.js` (27 scripts) → `init.js` |
| **Phase 5L** | **Closed** — no further 5L work required for this track |
| **Live QA** | **18/18 PASS** on production URL (`044`) — list-heavy; create publish / manage tabs not fully gated |
| **5L.4 / Option D** | **Not started**, **not in scope** for 5M |

---

## 2. Final Audit Conclusion

### 2.1 Verdict

The **046–050 audit set is complete enough** to begin **planning** Phase **5M.x** implementation slices. Inventories provide:

- File boundaries and approximate size
- Public API and custom-event contracts
- High/medium/low risk regions
- Proposed per-surface slice sequences (5M.1 / 5M.2 / 5M.3)

### 2.2 What this document does **not** do

| Item | Status |
| --- | --- |
| **Start implementation** | **No** — no runtime, HTML, CSS, or test changes |
| **Approve any 5M.1 / 5M.2 / 5M.3 code slice** | **No** — each slice needs its own approval doc |
| **Approve 5M.0 smoke work** | **No** — deferred to **`052_phase_5m0_loader_aware_smoke_alignment_approval.md`** |
| **Replace per-slice QA** | **No** — Phase 5 gate + live QA still required after each future PR |

### 2.3 Per-slice approval rule (mandatory)

Every future PR must have:

1. A **written approval document** naming the slice ID (e.g. `5M.0`, `5M.1.1`).
2. **Scope boundaries** (files touched, explicit out-of-scope list).
3. **Smoke / QA plan** before merge.
4. **One focused PR** — no multi-surface or multi-track bundling.

**This review (`051`) is audit sign-off only.** It does not substitute for slice-level approval.

---

## 3. Recommended Implementation Order

The audit track recommends the following **sequence** for all **5M** work. **Order is planning guidance; not implementation approval.**

```text
5M.0  Smoke baseline alignment (loader-aware 3A/3C/3D)
  ↓
5M.1  Create track
  ↓
5M.2  List track
  ↓
5M.3  Manage track
```

### 3.1 Why **5M.0** precedes **5M.1**

`050` identified that legacy Phase **3A / 3C / 3D** static smokes may still assert **direct** `<script src="…/list.js">` (and create/manage equivalents) in `portal/events.html`. Production now loads those modules only via **`classic-chain-loader.js`**.

| Risk without 5M.0 | Mitigation |
| --- | --- |
| False red smokes on HTML tag checks | Align 3A/3C/3D with `test/_portal-events-classic-chain.js` (`isProductionLoaded`, `parseClassicChain`) |
| Refactor PRs blamed for pre-existing smoke drift | Green **test-only** baseline before first runtime split |
| Orphan-file checks tied to HTML only | Assert chain membership for `list/`, `create/`, `manage/` siblings |

**5M.0 is smoke-only.** It must not include list/create/manage runtime refactors, HTML changes, or 5L.4.

### 3.2 Why **5M.1 Create** second

| Factor | Notes |
| --- | --- |
| **Size** | ~1,634 lines combined — smallest of the three surfaces |
| **Containment** | Default `#ecSheetRoot` sheet is IIFE-isolated |
| **Coupling** | Feeds list via `events:created` / `evtLoadEvents` — easier to test after list listener baseline exists in smokes |
| **Risk profile** | High insert/geocode risk, but **no** in-portal destructive delete path |

### 3.3 Why **5M.2 List** third

| Factor | Notes |
| --- | --- |
| **Size** | 2,761 lines — largest monolith |
| **Centrality** | `loadEvents` / `renderEvents` orchestrate hero, filters, calendar, buckets |
| **Existing QA** | Strongest behavioral coverage today (live QA 18/18) |
| **Strategy** | Gradual extraction (search → rail → filters → calendar → hero → orchestrator) per `047` |

### 3.4 Why **5M.3 Manage** last

| Factor | Notes |
| --- | --- |
| **Destructive scope** | Danger zone, permanent delete, participation reset edge |
| **Raffle tab** | Largest in-file block; `EventsRaffleModel` + storage + draw handoff |
| **Inline onclick** | `_emToggleFeatured`, scanner handoff |
| **Smoke depth** | Weakest tab CRUD automation; benefits from 5M.0 + create/list stability first |

---

## 4. Recommended First Implementation Gate

### 4.1 Gate ID: **5M.0 — loader-aware smoke baseline alignment**

| Property | Value |
| --- | --- |
| **Type** | **Test-only** PR |
| **Approves** | Updating static smokes to understand 3-tag loader model |
| **Does not approve** | Any `5M.1.x` create code split |

### 4.2 Proposed scope (for `052` approval doc)

**In scope:**

| File | Change |
| --- | --- |
| `test/_smoke-phase3a-list-bridge.js` | Replace direct `list.js` HTML tag check with `isProductionLoaded(html, chain, '../js/portal/events/list.js')`; chain order optional assert |
| `test/_smoke-phase3c-manage-bridge.js` | Same for `manage/sheet.js?v=112`; orphan `manage/*.js` via chain |
| `test/_smoke-phase3d-create-bridge.js` | Same for `create/sheet.js`; consider adding **`create.js`** presence in chain |
| `test/_portal-events-classic-chain.js` | **Reuse** — no change required unless helper gaps found |

**Pattern reference:** `test/_smoke-phase3b-detail-bridge.js` (already loader-aware).

**Explicitly out of scope for 5M.0:**

- `js/portal/events/**` runtime files (list, create, manage, loader, init)
- `portal/events.html`
- `css/**`
- 5L.4 compat bootstrap
- New behavioral E2E for create publish or manage tabs (optional follow-on, not required for 5M.0 minimum)

### 4.3 Exit criteria (5M.0 complete)

- Phase **3A, 3C, 3D** pass against current `portal/events.html` (3-tag).
- Phase **5L readiness** and Phase **1 bridge** still pass (regression).
- No runtime or production HTML diff in the same PR.

---

## 5. Create Track Preview (planning only — not approved)

After **5M.0** completes, the **create** track is the recommended first **runtime** refactor series. **Nothing below is approved by `051`.**

| Phase (proposed) | Scope | Approval status |
| --- | --- | --- |
| **5M.1.0** | Create implementation approval doc | **Required** before any create code PR |
| **5M.1.1** | Extract **`evtGeocodeAddress` + helpers** from `create.js` | **Likely first code slice** per `048` — smallest shared IO boundary |
| **5M.1.2** | Sheet step modules (basics / when / pricing / review) | Deferred |
| **5M.1.3** | Raffle builder submodule | Deferred |
| **5M.1.4** | `_submit` + storage helpers | Deferred — high test need |
| **5M.1.5** | Legacy `create.js` split (LLC costs, `evtHandleCreate`) | Deferred |
| **5M.1.6** | Unify sheet + modal OR deprecate modal | **Product gate** |

### 5.1 Create decisions still open

| Decision | Owner | Blocks |
| --- | --- | --- |
| LLC / competition in sheet vs legacy-only | Product | Whether `5M.1.5` / `5M.1.6` are needed |
| Keep `#createModal` in HTML | Product + eng | `048` — modal is only LLC/comp path today |
| Extend 3D smoke to cover `create.js` | Eng | Recommended in `050`; can ship with 5M.0 or 5M.1.0 |

---

## 6. Risks Accepted / Deferred

Risks are **acknowledged** for the 5M program. Mitigation is **deferred** to per-slice work and smokes — not resolved by this review.

| Risk | Surface | Disposition |
| --- | --- | --- |
| **Danger zone + participation reset** | Manage | **Highest operational risk** — defer code splits until 5M.3; require staging tests |
| **`loadEvents` / global caches** | List | **Highest coupling risk** — defer orchestrator move to late 5M.2.x |
| **`renderEvents` mode orchestration** | List | Accept regression cost; mitigate with live QA subset per slice |
| **`_submit` / `evtHandleCreate` inserts** | Create | Accept; golden tests in 5M.1.4+ |
| **Dual create paths** | Create | **Deferred product/technical decision** — sheet default vs legacy modal |
| **LLC/competition legacy modal** | Create | **Cannot remove** without explicit product approval (`048`, `046`) |
| **Inline `onclick` dependencies** | Create, Manage, Detail/Team | Accept until compat cleanup slices (5M.3.8, create LLC HTML) |
| **Custom event contracts** | All | Freeze `events:created`, `events:manage:updated`/`deleted` — test on change |
| **3A/3C/3D HTML tag false failures** | Tests | **Mitigate in 5M.0** (not accepted long-term) |
| **Weak create/manage E2E** | QA | Accept for audit close; add in 5M.1+ / 5M.3+ gates |

---

## 7. No-Go Reminders

These apply to **all** work after this review, including **5M.0**:

- Do **not** combine **5M.0** smoke alignment with **create / list / manage** runtime refactors in one PR.
- Do **not** combine any **5M.x** slice with **5L.4** compat bootstrap or **Option D** module entry.
- Do **not** combine **5M.x** with **CSS cleanup** or unrelated doc/md churn.
- Do **not** change **production** `portal/events.html` or loader chain without a **new approval gate** (e.g. `039`-style preflight).
- Do **not** treat **`051`** as approval for **5M.1.1** geocode extraction or any other code change.
- Do **not** stage unrelated workspace noise (e.g. `filters.css`, mass `md/**` moves) in audit or smoke PRs.

---

## 8. Recommended Next Doc

| Doc | Purpose |
| --- | --- |
| **`052_phase_5m0_loader_aware_smoke_alignment_approval.md`** | **Approve** the smoke-only **5M.0** baseline alignment before any create/list/manage implementation |

**052 should specify:**

- Exact files changed (3A, 3C, 3D minimum).
- Required gate commands (3A, 3C, 3D, 5L readiness, Phase 1 bridge).
- Explicit out-of-scope (runtime, HTML, CSS, 5L.4).
- Rollback: revert test commit only.

**After 052 and a successful 5M.0 PR:**

- **`053_phase_5m1_0_create_implementation_approval.md`** (or equivalent naming) — first **runtime** gate for create track.

---

## 9. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/051_list_manage_create_audit_review.md
git add docs/audit/pages/events/051_list_manage_create_audit_review.md
git diff --staged --name-only
git commit -m "Add Events list manage create audit review"
git push
```

---

## Appendix — Audit track timeline

```text
Phase 5L closed (d483f6a)
  → 046 kickoff (1ce201c)
  → 047 list inventory (59fbe7e)
  → 048 create inventory (8e6f2c0)
  → 049 manage inventory (5224f0e)
  → 050 risk/smoke map (d21d6eb)
  → 051 audit review (this doc) — AUDIT TRACK CLOSED FOR PLANNING
  → 052 5M.0 approval (proposed next)
  → 5M.0 PR (tests only, after 052)
  → 5M.1+ (after 5M.0, per-slice approval)
```

---

## Appendix — Quick reference: what is approved today

| Item | Approved? |
| --- | --- |
| Audit track 046–050 complete | **Yes** (this review) |
| Begin **planning** 5M.x | **Yes** |
| **5M.0** smoke PR | **No** — needs `052` |
| **5M.1.1** geocode extraction | **No** |
| **5M.2.x** list splits | **No** |
| **5M.3.x** manage splits | **No** |
| **5L.4** | **No** |
