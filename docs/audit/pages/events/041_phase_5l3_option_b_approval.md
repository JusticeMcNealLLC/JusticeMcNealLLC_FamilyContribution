# Events Refactor — Phase 5L.3 Option B Written Approval (Rehearsal Only)

**Document:** `041_phase_5l3_option_b_approval.md`  
**Path:** `docs/audit/pages/events/041_phase_5l3_option_b_approval.md`  
**Date:** 2026-05-23  
**Status:** **Written approval recorded** — **Option B rehearsal only**; **not** production HTML consolidation  
**Related:** `039_phase_5l3_html_consolidation_preflight.md` (`907c666`), `040_phase_5l3_approach_selection.md` (`d083c6f`), `037_phase_5l2_boot_completion_status.md`, `035_phase_5l_module_entry_readiness_audit.md`  
**Baseline implementation:** `b084f62` (5L.2 boot), `7a13830` (script-count note)  
**This commit:** Documentation only — **no implementation** in the approval commit itself

---

## 1. Approval Statement

**Approved:** Phase **5L.3 Option B — Rehearsal-first consolidation** (per `040` §3 Option B).

**Not approved in this gate:** Production changes to `portal/events.html`, Option C, Option D, 5L.4 compat runtime, monolith refactors, CSS, Supabase/admin, or unrelated docs cleanup.

| Field | Value |
| --- | --- |
| **Approved option** | **B** — Rehearsal-first consolidation |
| **Approver** | Product / tech owner (JMLLC Events refactor workflow) |
| **Approval date** | 2026-05-23 |
| **Preflight reference** | `039_phase_5l3_html_consolidation_preflight.md` |
| **Approach reference** | `040_phase_5l3_approach_selection.md` (recommends Option B) |
| **Baseline `master` at approval** | Record at start of first rehearsal PR (e.g. post–`d083c6f` doc chain) |

This document is the **written approval** required by `039` §4 item 1 for **beginning Option B rehearsal work**. It does **not** satisfy approval for editing **production** `portal/events.html` (see §4).

---

## 2. Current Baseline (unchanged until production 5L.3 is separately approved)

| Item | State |
| --- | --- |
| **Portal Events classic scripts** | **29** (`portal/events.html`, scoped smoke parser) |
| **`index.js`** | **First** among `js/portal/events/*` |
| **`init.js`** | **Last** among `js/portal/events/*` |
| **`type="module"`** | **None** on portal Events scripts |
| **Compat installers** | **Dormant** — not loaded in production HTML |
| **`EXPECTED_PORTAL_SCRIPT_COUNT`** | **29** |
| **5L readiness smoke** | **33/33** pass |
| **5L.2 boot** | Idempotent `initEventsPage` (`b084f62`) |

Production `https://justicemcneal.com/portal/events.html` remains on this baseline until a **later**, explicitly approved production HTML change (Option C or promoted rehearsal).

---

## 3. Approved Approach — Option B (Rehearsal-First)

| Principle | Rule |
| --- | --- |
| **Rehearse first** | Validate candidate script load order / boot on **rehearsal-only** HTML or harness **before** any production HTML edit |
| **Isolation** | Rehearsal must not change production deploy artifacts unless a separate approval is recorded |
| **Smoke-driven** | Use `039` / `037` static gates; update rehearsal-specific smoke only when needed to assert rehearsal HTML |
| **Promotion path** | After rehearsal passes → seek **separate** written approval for production `portal/events.html` (Option C or equivalent per `040`) |

---

## 4. First Implementation Pass — Boundaries

### Allowed in the first rehearsal PR(s)

| Allowed | Notes |
| --- | --- |
| **Rehearsal-only HTML** | e.g. `portal/events.rehearsal.html`, branch-only page, or local harness mirroring Events shell |
| **Minimal JS for rehearsal boot** | Only if required to exercise candidate load order on rehearsal page — **not** required to change production `init.js` in pass 1 |
| **Rehearsal / harness smoke updates** | e.g. new `test/_smoke-phase5l3-rehearsal.js` or scoped checks — **only** if needed to validate rehearsal; do not weaken production 5L.1 smoke |
| **Docs for rehearsal** | Completion notes after rehearsal PR merges (separate from this approval doc) |

### Required — first pass

| Required | Rule |
| --- | --- |
| **Do not touch production `portal/events.html`** | **Hard boundary** for Option B pass 1 |
| **Do not remove production script tags** | Baseline 29 tags remain on prod path |
| **Do not add `type="module"`** to production Events scripts in pass 1 |
| **One focused PR** per `039` §5 — rehearsal scope only |

### Explicitly not approved (first pass or bundled)

| Not approved | Option / work |
| --- | --- |
| **Option C** | Minimal **production** script-tag reduction |
| **Option D** | Full module-entry conversion on production |
| **5L.4** | Compat runtime loading (`installWindowExports`, compat script tags in HTML) |
| **Monolith refactors** | `list.js`, `manage/sheet.js`, `create/sheet.js` |
| **CSS cleanup** | `css/pages/portal/events/**` |
| **Supabase / admin** | Schema, RLS, admin UI |
| **Unrelated docs** | `md/**`, general `docs/**` cleanup |

---

## 5. Validation Required (After Rehearsal Implementation — Not This Doc Commit)

Run on the **rehearsal branch** after rehearsal code exists:

```bash
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

Plus any **rehearsal-specific** smoke added for the harness.

| Gate | Expectation |
| --- | --- |
| **Production 5L smoke** | Still **33/33** on unchanged `portal/events.html` |
| **Rehearsal smoke** | **PASS** for load order, boot, no compat in rehearsal HTML unless separately approved |
| **`master` production HTML** | Unchanged in rehearsal-only PR |

---

## 6. Live QA Notes

| Context | Requirement |
| --- | --- |
| **Rehearsal** | QA on **rehearsal URL / local harness only** — list boot, detail open, nav, single CTA, duplicate init safe, Team Tools/Chat (host), member view without host controls |
| **Rehearsal must not alter production runtime** | No deploy of rehearsal HTML to production `portal/events.html` in pass 1 |
| **Before any production HTML change** | **Full production live QA** per `039` §6 required **after** separate production approval — not satisfied by this Option B approval alone |

---

## 7. Rollback Note (Rehearsal)

If rehearsal implementation fails local/static validation:

| Step | Action |
| --- | --- |
| 1 | **Revert** only the rehearsal commit(s) (harness HTML, rehearsal JS, rehearsal smoke) |
| 2 | **Leave** production `portal/events.html` and 29-script baseline **unchanged** |
| 3 | **Re-run** `node test/_smoke-phase5l-readiness.js` on `master` — expect **33/33** |
| 4 | **Do not** compensate by loading compat or merging monolith refactors in the same revert window |

Production rollback for a **future** prod HTML change remains per `039` §8.

---

## 8. No-Go Reminders

- Do **not** combine rehearsal with **5L.4** compat load.
- Do **not** combine with list / manage / create refactors.
- Do **not** combine with CSS or unrelated workspace cleanup.
- Do **not** treat this approval as permission to edit **production** `portal/events.html` in the first pass.

---

## 9. Next Steps (After This Approval Doc)

1. **Implement** Option B rehearsal per §4 (separate PR(s) — not this doc-only commit).
2. **Run** §5 validation on rehearsal branch.
3. **Run** §6 rehearsal live QA.
4. **Record** rehearsal completion doc (e.g. `042_…`) when green.
5. **Seek separate written approval** before any production `portal/events.html` change (Option C / promotion).

---

## 10. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/041_phase_5l3_option_b_approval.md
git add docs/audit/pages/events/041_phase_5l3_option_b_approval.md
git diff --staged --name-only
git commit -m "Approve Phase 5L.3 Option B rehearsal"
git push
```

---

## Appendix — Phase 5L doc chain

`035` → `036` (`dc5d203`) → `037` (`b084f62`) → `038` (`ddd9ef6`) → `039` (`907c666`) → `040` (`d083c6f`) → **`041` (Option B approval — rehearsal only)** → rehearsal implementation (next) → optional production HTML approval (later).
