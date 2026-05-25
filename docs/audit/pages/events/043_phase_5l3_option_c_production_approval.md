# Events Refactor — Phase 5L.3 Option C Production Script-Tag Reduction (Written Approval)

**Document:** `043_phase_5l3_option_c_production_approval.md`  
**Path:** `docs/audit/pages/events/043_phase_5l3_option_c_production_approval.md`  
**Date:** 2026-05-23  
**Status:** **Written approval recorded** — authorizes a **future** Option C implementation commit; **this commit does not implement Option C**  
**Prior gates:** `041` Option B rehearsal approval (`3748302`), `9701850` rehearsal harness, `042` rehearsal completion (`f56b893`, 18/18 live QA), `db46da4` phase1 bridge alignment  
**Related:** `039_phase_5l3_html_consolidation_preflight.md`, `040_phase_5l3_approach_selection.md`, `042_phase_5l3_option_b_rehearsal_completion.md`

---

## 1. Approval Statement

**Approved:** Phase **5L.3 Option C — Minimal production script-tag reduction** for `portal/events.html` only, using the **rehearsal-proven 3-tag classic load model** from Option B.

| Field | Value |
| --- | --- |
| **Approved option** | **C** — Production Events script block consolidation (not Option D, not 5L.4) |
| **Approver** | Product / tech owner (JMLLC Events refactor workflow) |
| **Approval date** | 2026-05-23 |
| **Baseline `master` before Option C implementation** | Record SHA at start of Option C PR (post–`db46da4` doc/smoke chain) |

**This document (`043`) does not modify `portal/events.html`, JS, CSS, or tests.** Implementation occurs in a **separate** commit/PR after this approval is merged.

---

## 2. Baseline Before Option C (current production)

| Item | Confirmed state |
| --- | --- |
| **Production portal Events scripts** | **29** classic tags (`<!-- Events modules` → before `sw-register`, scoped parser) |
| **`index.js`** | **First** among `js/portal/events/*` |
| **`init.js`** | **Last** among `js/portal/events/*` |
| **`type="module"`** | **None** on portal Events scripts |
| **Compat installers** | **Dormant** — not in production HTML |
| **5L.2 boot** | Idempotent `initEventsPage` (`b084f62`) |
| **`EXPECTED_PORTAL_SCRIPT_COUNT`** | **29** (until Option C implementation updates smoke) |
| **Static smokes** | phase1 **28/28**, 5L readiness **33/33**, 5L3 rehearsal **15/15**, full Phase 5 gate **ALL PASS** |
| **Production runtime** | Unchanged since rehearsal work; deploy path `portal/events.html` |

---

## 3. Evidence From Option B (rehearsal)

| Evidence | Result |
| --- | --- |
| **Rehearsal page** | `portal/events.rehearsal.html` — **3** portal Events script tags |
| **Rehearsal model** | `index.js` → `rehearsal/classic-chain-loader.js` → `init.js` |
| **Loader behavior** | Synchronous `document.write` of **27** middle modules in **production order** |
| **Rehearsal live QA** | `https://justicemcneal.com/portal/events.rehearsal.html` — **18/18 PASS** (`042`) |
| **Rehearsal smoke** | `test/_smoke-phase5l3-rehearsal.js` — **15/15 PASS** |
| **Production during rehearsal** | `portal/events.html` **unchanged**; production count **29** |
| **No `type="module"` / no compat** | Rehearsal and production |

Option C promotes the **same load contract** to production HTML, not a new module-entry design (Option D).

---

## 4. Approved Option C Scope (implementation commit)

### In scope

| Item | Rule |
| --- | --- |
| **`portal/events.html`** | Replace the **29-tag** Events script block with the **3-tag** model proven on rehearsal |
| **Tag 1** | `../js/portal/events/index.js` (unchanged role) |
| **Tag 2** | `../js/portal/events/rehearsal/classic-chain-loader.js` **or** a **production-safe equivalent** (e.g. move/rename to `js/portal/events/classic-chain-loader.js` with same chain array and sync injection — **no behavior change**, naming only if desired) |
| **Tag 3** | `../js/portal/events/init.js` (unchanged role; still **last** before `sw-register.js`) |
| **Load order** | Middle **27** scripts identical to current production order (loader chain must match `042` / rehearsal smoke) |
| **Smoke updates** | **Minimal** — e.g. `EXPECTED_PORTAL_SCRIPT_COUNT` **29 → 3** in `_smoke-phase5l-readiness.js`; keep production-unmodified guards where rehearsal HTML remains |
| **Classic scripts only** | **No `type="module"`** |

### Out of scope (same PR)

| Not approved | Notes |
| --- | --- |
| **Option D** | Full module-entry conversion |
| **5L.4** | Compat runtime load (`installWindowExports`, compat script tags) |
| **Monolith refactors** | `list.js`, `manage/sheet.js`, `create/sheet.js` |
| **CSS / docs / `md/**` cleanup** | Unrelated churn |
| **Supabase / admin** | Schema, RLS, admin UI |
| **`portal/events.rehearsal.html`** | May remain for regression; not required to delete in Option C |

### Implementation boundaries

- **One focused commit/PR** — Option C HTML (+ minimal smoke + optional loader path rename only).
- **No unrelated files** staged.
- **Preserve** boot contract: `DOMContentLoaded` → `initEventsPage`, 5L.2 idempotency guards unchanged unless a bugfix is required and called out separately.

---

## 5. Required Validation (after Option C implementation, before merge)

Run from repo root on the **Option C branch**:

```bash
node --check test/_smoke-phase1-bridge.js
node test/_smoke-phase1-bridge.js
node --check test/_smoke-phase5l-readiness.js
node test/_smoke-phase5l-readiness.js
node --check test/_smoke-phase5l3-rehearsal.js
node test/_smoke-phase5l3-rehearsal.js
node test/_smoke-phase3b-detail-bridge.js
node test/_smoke-phase5h-detail-open-split.js
node test/_smoke-phase5h6-post-render-bridge.js
node test/_smoke-phase5i-template-shell.js
node test/_smoke-phase5j-compat-exports.js
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

| Expectation | Post–Option C |
| --- | --- |
| `_smoke-phase5l-readiness.js` | **PASS** with updated script count (**3**) and order checks |
| `_smoke-phase5l3-rehearsal.js` | **PASS** if rehearsal page retained |
| Phase 5 gate | **ALL PASS** |
| `init.js` / phase1 bridge | **PASS** (no init contract regression) |
| Production HTML | **No** compat scripts; **no** `type="module"` on Events tags |

---

## 6. Required Production Live QA (after deploy)

Apply to **`https://justicemcneal.com/portal/events.html`** (production URL, not rehearsal only).

| # | Check | Pass criteria |
| --- | --- | --- |
| 1 | List page loads | No blank shell |
| 2 | Auth completes | Login → Events |
| 3 | List / hero / bucket UI | Renders |
| 4 | Detail opens | Birthday / slug test event |
| 5 | List → detail → back | Navigation works |
| 6 | Single `#evtCtaBar` | One bar |
| 7 | Comments stable | No duplicate blocks |
| 8 | `window._eventsPageInitialized === true` | After boot |
| 9 | `PortalEvents.initEventsPage()` ×2 | No crash; no duplicate UI; no reload burst |
| 10 | Host Team Tools | Opens once |
| 11 | Host Team Chat | Opens once |
| 12 | Member view | No host-only Team control |
| 13 | Console / network | No new errors |

Mirror checklist from `042` rehearsal QA, applied to **production** path.

---

## 7. Rollback Plan

If production live QA **fails** after Option C deploy:

| Step | Action |
| --- | --- |
| 1 | **Revert** the Option C merge commit only (restore **29-script** block in `portal/events.html`) |
| 2 | **Revert** smoke count changes if bundled in same commit |
| 3 | **Redeploy** prior `master` SHA |
| 4 | **Rerun** §5 static smokes — expect **29** count and **33/33** 5L readiness |
| 5 | **Rerun** §6 production live QA |
| 6 | **Post-mortem** before retry; do not bundle 5L.4 or monolith work in rollback PR |

Rehearsal page (`events.rehearsal.html`) may remain as fallback reference during rollback investigation.

---

## 8. No-Go Reminders

- Do **not** combine Option C with **5L.4** compat runtime load.
- Do **not** combine with **Option D** full module entry.
- Do **not** combine with list / manage / create refactors or CSS cleanup.
- Do **not** treat this approval as permission to remove `portal/events.rehearsal.html` unless explicitly requested.

---

## 9. Phase Status

| Phase | Status |
| --- | --- |
| **5L.3 Option B rehearsal** | **Complete** (`9701850`, `042`) |
| **5L.3 Option C production reduction** | **APPROVED** (this doc) — **implementation not started** in `043` commit |
| **5L.3 Option D** | **Not approved** |
| **5L.4 compat bootstrap** | **Not approved** |

---

## 10. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/043_phase_5l3_option_c_production_approval.md
git add docs/audit/pages/events/043_phase_5l3_option_c_production_approval.md
git diff --staged --name-only
git commit -m "Approve Phase 5L.3 Option C production reduction"
git push
```

---

## Appendix — Checkpoint chain

`041` (B approval) → `9701850` / `042` (rehearsal) → **`043` (C production approval — this doc)** → Option C implementation PR → `044` completion doc (future) → optional 5L.4 / D (separate approvals).
