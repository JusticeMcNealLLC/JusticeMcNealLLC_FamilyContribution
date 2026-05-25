# Events Refactor — List / Manage / Create Monolith Audit Kickoff

**Document:** `046_list_manage_create_audit_kickoff.md`  
**Path:** `docs/audit/pages/events/046_list_manage_create_audit_kickoff.md`  
**Date:** 2026-05-21  
**Status:** **Audit kickoff only** — planning and scope definition; **no implementation**  
**Prior gate:** `045_phase_5l_closeout_and_next_gate.md` (`d483f6a`) — Phase 5L closed; recommends this track  
**Related:** `025_phase_5_remaining_refactor_completion_roadmap.md`, `036_phase_5l1_readiness_completion_status.md`, `044_phase_5l3_option_c_production_completion.md`

---

## 1. Kickoff Statement

Phase **5L** is **closed**. The next recommended Events refactor track is **audit-only** work on the remaining **list / manage / create** monolith areas **before** any split or refactor PRs.

This document **starts that audit track**. It does **not**:

- Refactor `list.js`, `manage/sheet.js`, `create.js`, or `create/sheet.js`
- Change `portal/events.html`, loader chain, CSS, Supabase, or admin code
- Start **5L.4** compat bootstrap or **Option D** module entry

Follow-on audit deliverables (numbered `047+`, TBD) will fill in the **proposed sections** below after review of this kickoff.

---

## 2. Baseline After Phase 5L

| Item | Confirmed state |
| --- | --- |
| **Phase 5L** | **Closed** (`045`, `d483f6a`) |
| **Production script model** | **3** classic tags: `index.js` → `classic-chain-loader.js` → `init.js` |
| **Middle scripts** | **27** via loader (`js/portal/events/classic-chain-loader.js`), same order as former 29-tag block |
| **`type="module"`** | **None** on portal Events |
| **Compat installers** | **Not** in production HTML; dormant in repo |
| **Production live QA** | **18/18 PASS** on `https://justicemcneal.com/portal/events.html` (`044`) |
| **5L readiness smoke** | **37/37** pass (3 monolith notes) |
| **5L3 rehearsal smoke** | **15/15** pass |
| **Phase 1 bridge smoke** | **28/28** pass |
| **Full Phase 5 gate** | **ALL PASS** |
| **5L.4 / Option D** | **Not started**, **not approved** |
| **list / manage / create refactors** | **Not started** |

### Loader positions (relevant to audit)

From `classic-chain-loader.js` (production order excerpt):

```text
… → raffle-model.js → list.js → team/* → detail/* → …
→ create.js → create/sheet.js → … → manage/sheet.js?v=112 → (init.js after loader)
```

`list.js` loads **before** detail pipeline; **create** loads **after** detail/rsvp; **manage/sheet.js** is **last** in the middle chain (cache-bust `?v=112`).

---

## 3. Scope of This Audit Track

### In scope (primary files)

| Surface | Path(s) | Approx. size (lines, repo snapshot) | Role |
| --- | --- | ---: | --- |
| **List** | `js/portal/events/list.js` | ~2,761 | List view, filters, calendar, buckets, hero, cards |
| **Manage** | `js/portal/events/manage/sheet.js` | ~2,140 | `EventsManage` — edit event, hosts, raffle admin, sheet UI |
| **Create (orchestrator)** | `js/portal/events/create.js` | ~625 | Create flow entry, sheet open/close, bridges |
| **Create (sheet)** | `js/portal/events/create/sheet.js` | ~1,009 | `EventsCreate` multi-step sheet |

### In scope (bridge seams only)

Audit **detail / list / init** touchpoints only where needed to understand list↔detail navigation, create/manage sheet roots, and global bridges — **not** a second full detail refactor pass (detail split largely complete through Phase 5H–5I).

| Seam | Typical files |
| --- | --- |
| List ↔ detail routing | `utils.js` (`evtRouteByUrl`, `evtNavigateToList`), `init.js`, `list.js` card links |
| Create sheet DOM | `#ecSheetRoot`, `EventsCreate` / `PortalEvents.create` |
| Manage sheet DOM | `#emSheetRoot`, `EventsManage` / `PortalEvents.manage` |
| Shared state | `state.js`, `constants.js`, `raffle-model.js` |

### Out of scope

| Area | Reason |
| --- | --- |
| **5L.4** compat runtime bootstrap | Separate risk profile; not combined with this track |
| **Production HTML / script tag changes** | Requires new approval gate (`039`-style); 3-tag model is settled |
| **Option D** (`type="module"` entry) | Not approved |
| **CSS cleanup** | Separate PR discipline |
| **Supabase / admin** | No schema or dashboard work in this track |
| **Implementation / refactor PRs** | **After** audit review and explicit per-phase approval |
| **Public `js/events/**`** | Portal Events only |

---

## 4. Audit Goals

The follow-on audit work (sections §6) must produce evidence-backed answers for:

| Goal | Question the audit must answer |
| --- | --- |
| **Remaining monoliths** | What are the largest functions/regions per file? What is already extracted vs still inline? |
| **Safe split seams** | Natural boundaries (filters vs render vs calendar vs hero; manage tabs vs raffle; create steps) with minimal cross-calls |
| **Global / window bridge dependencies** | Which `window.evt*`, `EventsManage`, `EventsCreate`, `PortalEvents.*` names are required by HTML/onclick/other scripts? |
| **Inline handler dependencies** | Which `onclick="…"` and template strings still target list/manage/create symbols? |
| **Smoke coverage gaps** | What Phase 3A/3C/3D and 5L smokes already freeze; what is missing before a split PR |
| **Recommended phase order** | Ordered, small PR sequence (e.g. create sheet before list, per `025`) with rollback and QA per step |

---

## 5. Known Context (pre-audit, from prior docs)

| Source | Note |
| --- | --- |
| `025` roadmap | Identified `list.js`, `manage/sheet.js`, `create/sheet.js` as dominant remaining monoliths after detail work |
| `036` / `5L.1` smoke | `MONOLITHS` awareness checks — files **present**, **not split** in 5L |
| `026` / detail audits | Detail path largely decomposed; **list/manage/create** called out as next blast-radius reduction |
| Phase 3 smokes | `test/_smoke-phase3a-list-bridge.js`, `_smoke-phase3c-manage-bridge.js`, `_smoke-phase3d-create-bridge.js` — regression baselines |

Line counts drift; the audit must **re-measure** at kickoff execution time.

---

## 6. Proposed Audit Sections (deliverables TBD)

Each subsection below is a **planned audit chapter** — to be completed in a future doc (e.g. `047_list_surface_inventory.md`) after this kickoff is approved. **No findings are asserted here.**

### 6.1 List surface inventory

| Audit task | Output |
| --- | --- |
| File structure (IIFE, exports, `PortalEvents.list`) | Section map with line ranges |
| Major subsystems | Filters (`#evtFilter*`), hero, lifecycle buckets, calendar, card render, empty states |
| Public globals | `window.evtLoadEvents`, `window.evtRenderEvents`, etc. |
| Coupling to detail | Card `href`, `evtOpenDetail` callers, URL `?event=` |
| DOM / HTML contracts | `portal/events.html` list shell IDs (read-only inventory) |

### 6.2 Manage surface inventory

| Audit task | Output |
| --- | --- |
| `EventsManage` API surface | open/close/save, raffle admin, host tools |
| Sheet lifecycle | `#emSheetRoot`, backdrop, steps/tabs |
| Dependencies | `manage/sheet.js?v=112` cache bust; raffle-model, state, detail bridges |
| Permission paths | Host vs admin vs coordinator (align with team/tools patterns) |

### 6.3 Create surface inventory

| Audit task | Output |
| --- | --- |
| `create.js` vs `create/sheet.js` split | Responsibility boundary today |
| `EventsCreate` / `PortalEvents.create` | Step machine, validation, Supabase writes (inventory only) |
| Sheet lifecycle | `#ecSheetRoot`, back/next, publish |
| Overlap with manage | Shared patterns worth one abstraction later (audit note only) |

### 6.4 Shared dependencies and bridge seams

| Audit task | Output |
| --- | --- |
| Load order | Loader chain indices for list, create, manage |
| `init.js` callers | What list/manage/create assume after boot |
| `constants.js` / `state.js` / `utils.js` | Shared mutable state used by all three |
| Detail/list handoff | `evtRouteByUrl`, `evtAllEvents`, slug routing |
| Compat | Confirm compat installers still **not** required for these surfaces |

### 6.5 Risk map

| Risk category | Examples to score in audit |
| --- | --- |
| **Regression** | Filter state, calendar month nav, manage raffle save, create publish |
| **Global contract** | Breaking `window.evt*` or `onclick` handlers |
| **Cache/CDN** | `manage/sheet.js?v=112` bump discipline on any manage touch |
| **PR size** | Single PR line-count limits; deploy rollback complexity |
| **Live QA** | Which flows need Playwright signed-in QA per split |

### 6.6 Smoke / test coverage map

| Existing smoke | Covers |
| --- | --- |
| `_smoke-phase3a-list-bridge.js` | List IIFE, globals, `PortalEvents.list`, HTML load via loader |
| `_smoke-phase3c-manage-bridge.js` | Manage bridge, init regression |
| `_smoke-phase3d-create-bridge.js` | Create bridge, E2E patterns |
| `_smoke-phase5l-readiness.js` | Monolith presence + line counts (info) |
| Phase 5 gate | Detail/team/raffle — partial indirect coverage for list→detail |

| Gap (to confirm in audit) | Likely need |
| --- | --- |
| Filter/hero/calendar sub-split | New static smoke per extracted file |
| Manage sub-split | Extend 3C or add 5M-* smoke |
| Create step split | Extend 3D |
| Post-split live QA | Checklist per PR (mirror `044` 18-point where applicable) |

### 6.7 Recommended next implementation phases (planning only)

**Draft order** (to be validated by audit — **not approved here**):

| Order | Phase (proposed ID) | Target | Rationale (hypothesis) |
| ---: | --- | --- | --- |
| 1 | **5M.0** | Audit completion docs (`047`–`049` or combined inventory) | Evidence before code |
| 2 | **5M.1** | `create/sheet.js` (+ `create.js` boundary) | Smallest isolated surface vs list |
| 3 | **5M.2** | `list.js` — filters/state slice | Highest line count; split by concern in multiple PRs |
| 4 | **5M.3** | `list.js` — render/calendar/hero slices | Depends on 5M.2 patterns |
| 5 | **5M.4** | `manage/sheet.js` | Last; preserve `?v=` bump; host/raffle risk |

Each implementation phase will require its own **approval + completion** doc pair (mirror 5L.3 pattern). **None are authorized by this kickoff.**

---

## 7. Recommendation

| Action | Status |
| --- | --- |
| **Proceed with audit-only work** | **Yes** — execute §6 inventories in follow-on docs |
| **Start refactors now** | **No** — wait until audit is reviewed and a specific phase (e.g. 5M.1) is explicitly approved |
| **Start 5L.4 compat** | **No** — keep separate unless product overrides `045` |
| **Short production soak** | Optional in parallel — monitor after 5L.3; does not block audit |

**Default path:** Complete **list → manage → create inventories** and **risk/smoke maps**, then hold a short review to pick the **first implementation slice** (likely create, per `025`).

---

## 8. No-Go Reminders

- Do **not** combine **list / manage / create** refactors with **5L.4** compat runtime load in one PR.
- Do **not** combine **CSS cleanup** with runtime or HTML changes.
- Do **not** modify **production** `portal/events.html` or the **3-tag loader model** without a **new** written approval gate.
- Do **not** add `type="module"` without explicit **Option D** approval.
- Do **not** treat this kickoff as approval to edit `js/**` — implementation requires a later gate per slice.
- Do **not** stage unrelated local workspace noise in the kickoff commit.

---

## 9. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/046_list_manage_create_audit_kickoff.md
git add docs/audit/pages/events/046_list_manage_create_audit_kickoff.md
git diff --staged --name-only
git commit -m "Add Events list manage create audit kickoff"
git push
```

---

## Appendix — Checkpoint chain

`045` (5L closeout) → **`046` (this kickoff)** → *planned: list inventory, manage inventory, create inventory, combined risk/smoke doc, first 5M.x approval*.
