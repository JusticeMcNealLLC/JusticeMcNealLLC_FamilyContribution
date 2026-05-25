# Events Refactor — Phase 5L.3 Approach Selection (Planning Only)

**Document:** `040_phase_5l3_approach_selection.md`  
**Path:** `docs/audit/pages/events/040_phase_5l3_approach_selection.md`  
**Date:** 2026-05-23  
**Status:** **Approach selection only** — **not approval to implement**, **no HTML/JS/CSS changes**  
**Related:** `039_phase_5l3_html_consolidation_preflight.md`, `035_phase_5l_module_entry_readiness_audit.md`, `037_phase_5l2_boot_completion_status.md`, `025_phase_5_remaining_refactor_completion_roadmap.md`  
**Preflight gate:** `907c666` — Add Phase 5L.3 HTML consolidation preflight  
**Out of scope:** `portal/events.html`, `js/**`, `css/**`, smoke tests, compat load, 5L.3 implementation

---

## 1. What This Document Is

This file **compares safe paths** for Phase **5L.3** (HTML / script consolidation) so a product/tech owner can **choose one option** before any work touches `portal/events.html`.

| This document **is** | This document **is not** |
| --- | --- |
| An options comparison (A–D) | Written approval to start 5L.3 |
| Input to the approval checklist in `039` | A 5L.3 implementation PR |
| A recommendation (Option B first) | Permission to add `type="module"` or load compat |

**Creating `040` does not approve 5L.3.** See §5.

---

## 2. Current Baseline (unchanged until 5L.3 is approved and shipped)

| Item | Confirmed state |
| --- | --- |
| **Portal Events classic scripts** | **29** (scoped smoke parser on `portal/events.html`) |
| **`index.js`** | **First** among `js/portal/events/*` |
| **`init.js`** | **Last** among `js/portal/events/*` (before `sw-register.js`) |
| **`type="module"`** | **None** on portal Events tags |
| **Compat installers** | **Dormant** — not in production HTML |
| **Boot** | 5L.2 idempotent `initEventsPage` (`b084f62`) |
| **`EXPECTED_PORTAL_SCRIPT_COUNT`** | **29** |
| **5L readiness smoke** | **33/33** pass |
| **5L.3 implementation** | **NOT started** — on hold per `039` |

---

## 3. Options Compared

### Option A — Pause / defer 5L.3

| Dimension | Detail |
| --- | --- |
| **Scope** | No change to `portal/events.html` or Events load model. Continue audits on **list**, **manage**, **create** monoliths; optional 5J.2 / `evtMessageHost` in separate PRs. |
| **Pros** | **Lowest immediate risk**; zero production deploy surface; preserves proven 29-script classic boot; team can reduce blast radius before any HTML change. |
| **Risks** | HTML consolidation debt remains; duplicate script maintenance continues; module-entry benefits delayed. |
| **Required validation** | Keep running standing Phase 5 + 5L smokes on `master`; no 5L.3-specific QA. |
| **Rollback complexity** | **N/A** — nothing shipped. |
| **Recommendation** | **Valid default** if product priority is stability or monolith reduction first. |

---

### Option B — Rehearsal-first consolidation (recommended)

| Dimension | Detail |
| --- | --- |
| **Scope** | **Local or staging rehearsal only** first — e.g. `events.rehearsal.html`, branch-only HTML, or harness page that mirrors the 29-script order with a **candidate** reduced/module load model. **No production `portal/events.html` change** until rehearsal passes full static + live QA gates in `039`. |
| **Pros** | **Safest path when uncertainty remains**; proves load order, globals, and `initEventsPage` / boot without user-facing production risk; aligns with `035` Option B; smoke expectations can be tuned on rehearsal before prod. |
| **Risks** | Rehearsal drift if not kept in sync with prod HTML; extra maintenance until rehearsal is promoted or deleted; still requires discipline not to merge prod HTML early. |
| **Required validation** | Full static gate (§6); rehearsal live QA (list, detail, nav, Team Tools/Chat, duplicate init, member view); document rehearsal URL and SHA; only then open prod HTML PR per `039` §4. |
| **Rollback complexity** | **Low** for first pass — delete or ignore rehearsal assets; production untouched. |
| **Recommendation** | **Preferred** unless there is a **strong** reason to change production HTML immediately (see §4). |

---

### Option C — Minimal production script-tag reduction

| Dimension | Detail |
| --- | --- |
| **Scope** | **Touch only** the Events `<script>` block in **`portal/events.html`**. Remove or merge tags only where load order and globals are **already proven** (e.g. combine inert shells, drop redundant ordering duplicates — **not** list/manage/create refactors). Update `EXPECTED_PORTAL_SCRIPT_COUNT` / smoke parser **after** confirming new count. |
| **Pros** | Direct progress on consolidation; smaller diff than full module entry; may reduce HTTP requests without changing module system. |
| **Cons / risks** | **Production deploy risk**; easy to break implicit global order; one wrong tag order breaks detail/team/init; requires **full live QA + rollback** on first prod change. |
| **Required validation** | All of `039` §5–§6; update `_smoke-phase5l-readiness.js` if tag count or block boundaries change; verify prod + local scoped parser agree. |
| **Rollback complexity** | **Medium** — revert single focused commit; restore 29-tag classic block (document baseline SHA). |
| **Recommendation** | **Second step after Option B rehearsal passes**, or only if rehearsal is skipped with explicit acceptance of prod risk. |

---

### Option D — Full module-entry conversion

| Dimension | Detail |
| --- | --- |
| **Scope** | Single **`type="module"`** entry (or equivalent) replacing most or all classic portal Events tags; `index.js` / `init.js` orchestration redesigned; likely needs export graph and boot rewrite. |
| **Pros** | Long-term maintainability; clearest boundary for future splits; aligns with end-state in `035` Option C/D. |
| **Risks** | **Highest risk** — global ordering, onclick handlers, classic IIFEs, and 29-file dependency graph; high chance of subtle regressions; **must not** combine with **5L.4** compat runtime in same PR. |
| **Required validation** | Everything in `039`; extended e2e; likely staging period; explicit plan for `PortalEvents.initEventsPage` and DOMContentLoaded; compat inventory frozen by 5J smoke. |
| **Rollback complexity** | **High** — full HTML block revert + possible JS boot revert. |
| **Recommendation** | **Defer** until rehearsal (Option B) and/or minimal reduction (Option C) prove load model; only pursue with explicit approval and dedicated PR(s). |

---

## 4. Summary Matrix

| Option | Prod HTML change | Risk | Rollback | When to choose |
| --- | --- | --- | --- | --- |
| **A — Pause** | None | Lowest | N/A | Stability first; monolith audits before consolidation |
| **B — Rehearsal first** | None initially | Low | Low | **Default recommendation** — uncertainty or first-time consolidation |
| **C — Minimal prod reduction** | Yes (Events block only) | Medium | Medium | After B passes; small proven tag merges only |
| **D — Full module entry** | Yes (major) | High | High | Long-term goal; not next step unless dependencies proven |

---

## 5. Explicit Approval Language

| Statement | Status |
| --- | --- |
| This document (`040`) approves 5L.3 implementation | **NO** |
| `039` preflight alone approves implementation | **NO** |
| User / product owner must **explicitly name one option** (A, B, C, or D) before Cursor or any contributor edits **`portal/events.html`** for 5L.3 | **REQUIRED** |
| Option B may include rehearsal HTML/JS on a **branch** without prod approval; **production** `portal/events.html` still requires separate sign-off per `039` §4 | **REQUIRED** |

Suggested approval record (for PR or ticket):

```text
Approved 5L.3 approach: [ A | B | C | D ]
Production portal/events.html editable: [ yes / no ]
Compat runtime (5L.4) in scope: [ no — default ]
Baseline master SHA: __________
```

---

## 6. Recommended Path (unless moving faster is required)

**Recommend Option B first:**

1. **Rehearsal-first** — validate candidate load order and boot on staging/local **without** production HTML change in the first implementation pass.
2. **No compat runtime loading** in the rehearsal or first prod PR (**5L.4** separate).
3. **No** list / manage / create monolith refactors in the same workstream.
4. **No** CSS or unrelated docs cleanup bundled with 5L.3.
5. After rehearsal + smokes + live QA → consider **Option C** (minimal prod tag reduction) with rollback plan from `039` §8.
6. **Defer Option D** until C (or repeated B cycles) de-risks the dependency graph.

**Option A** remains appropriate if the team chooses monolith audits (`list.js`, `manage/sheet.js`, `create/sheet.js`) before any HTML consolidation.

---

## 7. Required Validation (by option)

### All options (maintain baseline on `master`)

```bash
node test/_smoke-phase5l-readiness.js
```

Expect: **33/33** pass, `EXPECTED_PORTAL_SCRIPT_COUNT = 29`, until HTML actually changes.

### Option B / C / D (before merging any load-model change)

```bash
git status --short
node --check test/_smoke-phase5l-readiness.js
node test/_smoke-phase5l-readiness.js
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3b-detail-bridge.js
node test/_smoke-phase5h-detail-open-split.js
node test/_smoke-phase5h6-post-render-bridge.js
node test/_smoke-phase5i-template-shell.js
node test/_smoke-phase5j-compat-exports.js
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

Live QA: see `039` §6 (list, detail, nav, single CTA, duplicate init, Team Tools/Chat, member view, no console errors).

---

## 8. No-Go Reminders

**Do not combine in one PR or deploy:**

- **5L.3** HTML/script work (whichever option is approved)
- **5L.4** compat runtime load (`installWindowExports`, compat script tags)
- List / manage / create **monolith refactors**
- CSS / `md/**` / unrelated **docs cleanup**
- Supabase / admin changes

**Do not** stage unrelated workspace noise when committing audit docs.

---

## 9. Phase 5L Doc Chain

```text
035 — 5L.0 module entry readiness audit
036 — 5L.1 readiness completion (dc5d203)
037 — 5L.2 boot completion (b084f62)
038 — 5L doc path inventory (ddd9ef6)
039 — 5L.3 preflight / approval gate (907c666)
040 — 5L.3 approach selection (this doc — planning only)
```

**Next after explicit option approval:** Implementation per chosen option + `039` checklist — **not** automatic.

---

## 10. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/040_phase_5l3_approach_selection.md
git add docs/audit/pages/events/040_phase_5l3_approach_selection.md
git diff --staged --name-only
git commit -m "Add Phase 5L.3 approach selection"
git push
```
