# Events Refactor — Phase 5L.3 HTML / Script Consolidation Preflight (Approval Gate)

**Document:** `039_phase_5l3_html_consolidation_preflight.md`  
**Path:** `docs/audit/pages/events/039_phase_5l3_html_consolidation_preflight.md`  
**Date:** 2026-05-23  
**Status:** **Preflight / approval only** — **no implementation**, **no HTML changes**, **no runtime changes in this step**  
**Related:** `035_phase_5l_module_entry_readiness_audit.md`, `036_phase_5l1_readiness_completion_status.md`, `037_phase_5l2_boot_completion_status.md`, `038_phase_5l_doc_path_inventory.md`, `025_phase_5_remaining_refactor_completion_roadmap.md`  
**Prior gates:** `dc5d203` (5L.1 doc), `1df9cdf` (5L.1 smoke), `b084f62` (5L.2 boot), `7a13830` (5L.2 script-count note)  
**Out of scope for 5L.3 preflight doc:** Any edit to `portal/events.html`, `js/**`, `css/**`, smoke tests, compat load, Supabase, admin

---

## 1. What This Document Is

This file is an **approval gate and preflight plan** only. It records what must be true **before** anyone starts Phase **5L.3** work (reducing or consolidating classic `<script>` tags in `portal/events.html`).

| This document **is** | This document **is not** |
| --- | --- |
| A checklist for explicit written approval | Permission to change production HTML |
| A validation and live-QA gate list | A 5L.3 implementation PR |
| A rollback outline | Compat runtime wiring (that is **5L.4**, separate) |

**Do not treat creation of `039` as approval to begin 5L.3.**

---

## 2. Current Confirmed Baseline (pre–5L.3)

All items below are satisfied on `master` as of the 5L.2 completion line (`b084f62` boot + `7a13830` doc correction).

| Baseline item | Confirmed state |
| --- | --- |
| **Portal Events classic scripts** | **29** tags in `portal/events.html` (scoped smoke parser: `<!-- Events modules` → before `sw-register`) |
| **`index.js`** | **First** among `js/portal/events/*` |
| **`init.js`** | **Last** among `js/portal/events/*` (before `sw-register.js`) |
| **`type="module"`** | **None** on portal Events script tags |
| **Compat installers** | **Dormant** — `compat/window-exports.js`, `inline-handlers.js`, `external-globals.js` **not** in production HTML |
| **Boot idempotency** | `initEventsPage` guarded (`_eventsPageInitialized`, listener/popstate bind-once) — `b084f62` |
| **5L readiness smoke** | **`_smoke-phase5l-readiness.js`** — **33/33** pass (3 monolith notes) |
| **`EXPECTED_PORTAL_SCRIPT_COUNT`** | **29** — matches HTML; **do not** lower to 28 without re-auditing HTML |
| **Canonical audit docs** | `docs/audit/pages/events/` (`035`–`038`, this `039`) |

### Script order reference (29)

See `035_phase_5l_module_entry_readiness_audit.md` §1 for the full ordered inventory (`index.js` … `init.js`).

---

## 3. Phase 5L.3 Objective (after explicit approval only)

**Goal:** Reduce or consolidate **portal Events script loading** in `portal/events.html` — e.g. fewer classic tags, optional single entry script, and/or `type="module"` **only if** explicitly chosen in the approved plan.

**Must preserve:**

- Correct load order for detail pipeline, team, list, manage, create, and **`init.js` last** (or equivalent boot contract if module entry replaces classic boot).
- No regression in auth boot, list render, detail open, Team Tools/Chat, RSVP/raffle parity.
- Idempotent init behavior from 5L.2 (`PortalEvents.initEventsPage` / duplicate-init safety).

**Not in 5L.3 scope:**

- List / manage / create **monolith refactors** (logic moves inside `list.js`, etc.).
- CSS / visual cleanup.
- Unrelated `docs/**` or `md/**` cleanup.
- Supabase / admin schema or RLS.
- Compat runtime load (**5L.4** — separate approval).

---

## 4. Explicit Approval Checklist (required before any 5L.3 code/HTML PR)

All boxes must be satisfied **before** the first commit that touches `portal/events.html` or production Events load order.

| # | Gate | Owner / evidence |
| --- | --- | --- |
| 1 | **Written approval** to start 5L.3 (product/tech sign-off; link or date in PR) | Required |
| 2 | **Approved approach** documented (e.g. Option B rehearsal vs Option C tag reduction — see `035`) | Required |
| 3 | **Rollback plan** agreed (§7 below) | Required |
| 4 | **Baseline commit** recorded (current `master` SHA before 5L.3 HTML change) | Required |
| 5 | **Local static smokes** green (§5) on the 5L.3 branch **before** merge | Required |
| 6 | **Production / staging live QA** green (§6) after deploy | Required |
| 7 | **Smoke expectations updated** if script count or load model changes (`EXPECTED_PORTAL_SCRIPT_COUNT`, parser rules) | Required when HTML changes |
| 8 | **5L.4 compat load** explicitly **out of scope** for the 5L.3 PR unless separate approval | Required |

**Default:** If any item is missing → **no-go** for 5L.3 implementation.

---

## 5. Proposed Implementation Constraints (5L.3 PR)

When implementation is approved, keep the first 5L.3 PR **focused**:

| Constraint | Rule |
| --- | --- |
| **PR scope** | **One focused PR** — HTML/load-order (+ minimal JS only if required for boot under new load model) |
| **HTML** | `portal/events.html` Events script block only (or approved staging page first) |
| **No** list/manage/create refactors | Do not split monoliths in the same PR |
| **No** CSS cleanup | No `css/pages/portal/events/**` drive-by |
| **No** unrelated docs | No `md/**` or general docs churn |
| **No** Supabase / admin | Schema, RLS, admin UI out of scope |
| **No** compat runtime | Do not call `installWindowExports` / load compat scripts unless **5L.4** approved |
| **No** `type="module"`** | Unless explicitly listed in the approved 5L.3 plan |
| **Preserve** | `init.js` boot contract or documented equivalent; 5L.2 idempotency |

Optional **staging-first** path (from `035`): rehearse on `events.rehearsal.html` or local harness **before** production `portal/events.html` — still requires approval and the same smoke/QA gates.

---

## 6. Required Validation Commands (static, pre-merge)

Run from repo root on the **5L.3 branch** after HTML/load changes:

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

If `init.js` or boot wiring changes:

```bash
node --check js/portal/events/init.js
```

| Expectation | Post–5L.3 |
| --- | --- |
| `_smoke-phase5l-readiness.js` | **PASS** — update `EXPECTED_PORTAL_SCRIPT_COUNT` / parser rules if tag count changes |
| Phase 5 bridge/detail/team/raffle smokes | **ALL PASS** |
| No compat installers in HTML | **PASS** unless 5L.4 explicitly approved |

---

## 7. Required Live QA Checklist (post-deploy)

Use production or approved staging. Primary test event: `yolanda-adam-and-justin-birthday-celebration-mov3ceo1`.

### Boot / list

| Check | Pass criteria |
| --- | --- |
| Portal Events page loads | No blank shell; auth flow completes |
| Events list renders | Hero/grid/bucket UI visible (not only `data-evt-card` count) |
| Console / network | No new errors on load |

### Detail navigation

| Check | Pass criteria |
| --- | --- |
| Open event detail | Detail view renders |
| List → detail → back → list | Navigation works |
| Re-open detail | Still works |
| Single CTA bar | One `#evtCtaBar`; no duplicate CTAs |
| Comments | No duplicate comment blocks / duplicate loads |

### Duplicate init (5L.2 regression)

| Check | Pass criteria |
| --- | --- |
| `window._eventsPageInitialized === true` after boot | Yes |
| `PortalEvents.initEventsPage()` ×2 in console | No crash; no duplicate UI; no full reload burst |

### Host (admin / coordinator)

| Check | Pass criteria |
| --- | --- |
| Team Tools | Opens **once**; close/reopen OK |
| Team Chat | Opens from Team Tools **once**; no duplicate overlays |
| Manage Event | Opens if permitted |

### Member (non-host)

| Check | Pass criteria |
| --- | --- |
| List / detail | Loads |
| No Team button | Host-only Team CTA hidden |
| RSVP / Raffle / Ticket | Correct for account state; single CTA bar |

---

## 8. Rollback Plan

If production/staging live QA **fails** after a 5L.3 deploy:

| Step | Action |
| --- | --- |
| 1 | **Revert** the 5L.3 merge commit (or redeploy prior `master` SHA) — **only** the 5L.3 HTML/load PR scope |
| 2 | **Restore** prior classic load model: **29** sequential portal Events scripts, `index.js` first, `init.js` last, no compat in HTML |
| 3 | **Re-run** static smokes (§5) on reverted tree — expect **33/33** 5L readiness + full Phase 5 gate |
| 4 | **Re-run** live QA (§6) on production |
| 5 | **Post-mortem** — update this doc or a 5L.3 completion doc with failure mode before retry |

Do **not** roll forward with compat load or monolith refactors as a “fix” in the same revert window.

---

## 9. No-Go Reminders

**Do not combine in one PR or one deploy:**

| Combined work | Why blocked |
| --- | --- |
| **5L.3** HTML/script consolidation | This phase |
| **5L.4** compat runtime load | Separate approval and QA |
| **5L.2** boot changes | Already shipped (`b084f62`) |
| List / manage / create monolith refactors | Blast radius |
| CSS / unrelated docs cleanup | Noise and review risk |
| Supabase / admin changes | Unrelated |

---

## 10. Phase 5L Status Summary

| Phase | Status |
| --- | --- |
| **5L.0** audit (`035`) | Complete |
| **5L.1** readiness smoke (`036`, `1df9cdf`) | Complete |
| **5L.2** boot hardening (`037`, `b084f62`, live QA) | Complete |
| **5L doc paths** (`038`, `ddd9ef6`) | Complete |
| **5L.3** HTML consolidation | **NOT STARTED** — **ON HOLD** until §4 approval |
| **5L.4** compat bootstrap | Not started |

---

## 11. Doc-Only Commit Workflow (this file)

Stage **only** this preflight document:

```bash
git status --short
git diff -- docs/audit/pages/events/039_phase_5l3_html_consolidation_preflight.md
git add docs/audit/pages/events/039_phase_5l3_html_consolidation_preflight.md
git diff --staged --name-only
git commit -m "Add Phase 5L.3 HTML consolidation preflight"
git push
```

---

## Appendix — Checkpoint chain

`035` (5L.0 audit) → `036` / `1df9cdf` (5L.1) → `037` / `b084f62` (5L.2) → `038` / `ddd9ef6` (paths) → **`039` (5L.3 preflight — hold)** → 5L.3 implementation (after approval) → optional 5L.4 compat.
