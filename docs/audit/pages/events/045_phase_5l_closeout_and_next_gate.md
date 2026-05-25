# Events Refactor — Phase 5L Closeout and Next Gate

**Document:** `045_phase_5l_closeout_and_next_gate.md`  
**Path:** `docs/audit/pages/events/045_phase_5l_closeout_and_next_gate.md`  
**Date:** 2026-05-21  
**Status:** **Phase 5L closed** — through **5L.3 Option C** on production; **no new implementation** in this step  
**Latest production checkpoint:** `044_phase_5l3_option_c_production_completion.md` (`fba8347`)  
**Related:** `035`–`044` Phase 5L audit chain, `025_phase_5_remaining_refactor_completion_roadmap.md`

---

## 1. Closeout Statement

Phase **5L** (module-entry readiness, boot hardening, and production script consolidation) is **complete** as of **5L.3 Option C**:

- Production `portal/events.html` uses the **3-tag classic model** with `classic-chain-loader.js` preserving **27** middle scripts in former production order.
- Static smokes, full Phase 5 gate, and **production live QA (18/18)** are green.
- **5L.4** compat runtime bootstrap, **Option D** full module entry, and **list/manage/create** monolith refactors were **not** started.

This document **closes Phase 5L** and records the **recommended next gate** only — **no code, HTML, CSS, or test changes**.

---

## 2. Phase 5L Document Chain

All numbered Phase **5L** audit docs live under **`docs/audit/pages/events/`**:

| Doc | Phase | Title |
| --- | --- | --- |
| **035** | 5L.0 | Module entry readiness audit |
| **036** | 5L.1 | Readiness completion status |
| **037** | 5L.2 | Boot / duplicate-init hardening completion |
| **038** | 5L | Doc path inventory / cleanup |
| **039** | 5L.3 | HTML consolidation preflight (approval gate) |
| **040** | 5L.3 | Approach selection (Options A–D) |
| **041** | 5L.3 | Option B approval (rehearsal only) |
| **042** | 5L.3 | Option B rehearsal completion |
| **043** | 5L.3 | Option C approval (production reduction) |
| **044** | 5L.3 | Option C production completion |
| **045** | 5L | **Closeout and next gate (this doc)** |

---

## 3. Key Commits

| Commit | Summary |
| --- | --- |
| `1df9cdf` | **5L.1** — Add Phase 5L.1 module entry readiness smoke (`test/_smoke-phase5l-readiness.js`) |
| `b084f62` | **5L.2** — Harden Event page init idempotency (`init.js` + smoke guards) |
| `9701850` | **5L.3 Option B** — Rehearsal harness (`events.rehearsal.html`, rehearsal loader, rehearsal smoke) |
| `db46da4` | Phase 1 smoke alignment (`window._eventsPageInitialized` before first `await`) |
| `47afcae` | **5L.3 Option C approval** (doc only) |
| `8cb205e` | **5L.3 Option C** — Reduce Events production script tags (3-tag model + production loader) |
| `fba8347` | **5L.3 production completion** status (`044`) |

Supporting doc-only commits in the same arc include `dc5d203` (036), `1c4ea8a` / `ddd9ef6` (037–038 paths), `907c666` (039), `d083c6f` (040), `3748302` (041), `f56b893` (042).

---

## 4. Final Production State

**URL:** `https://justicemcneal.com/portal/events.html`  
**Deploy path:** `portal/events.html` (not rehearsal URL)

### Script load model

```text
1. ../js/portal/events/index.js
2. ../js/portal/events/classic-chain-loader.js  → document.write 27 middle scripts
3. ../js/portal/events/init.js
```

| Property | Value |
| --- | --- |
| Portal Events `<script>` tags in HTML | **3** |
| `index.js` | **First** |
| Middle loader | `js/portal/events/classic-chain-loader.js` |
| `init.js` | **Last** (before `sw-register.js`) |
| Middle script count (via loader `chain`) | **27** (same order as pre–Option C 29-tag block) |
| `type="module"` | **None** on portal Events scripts |
| Compat installers in production HTML | **None** |
| `index.js` calls `initEventsPage()` | **No** (namespace shell only) |
| 5L.2 boot guards | **Active** (`_eventsPageInitialized`, listener bind-once) |

### Out of scope (unchanged / not started)

| Track | Status |
| --- | --- |
| **Option D** — full module entry | **Not started**, **not approved** |
| **5L.4** — compat runtime bootstrap | **Not started**, **not approved** |
| **list / manage / create** monolith refactors | **Not started** |
| **CSS / Supabase / admin** | **Not touched** in 5L.3 Option C arc |

---

## 5. Validation Summary

| Gate | Result |
| --- | --- |
| `node test/_smoke-phase5l-readiness.js` | **37/37** pass (3 monolith notes) |
| `node test/_smoke-phase5l3-rehearsal.js` | **15/15** pass |
| `node test/_smoke-phase1-bridge.js` | **28/28** pass |
| Phase 5 gate (3b, 5h, 5h6, 5i, 5j, team, raffle, etc.) | **ALL PASS** |
| Production live QA — `portal/events.html` | **18/18 PASS** (`044`) |

Production HTML fetch confirms **3 tags**, correct order, loader **HTTP 200** with **27** chain entries, no `type="module"`, no compat in HTML.

---

## 6. Rollback Reference

If production script consolidation regresses after **Option C**:

| Step | Action |
| --- | --- |
| 1 | **Revert** `8cb205e` (or redeploy pre–Option C `master` SHA) to restore the **29-script** block in `portal/events.html` |
| 2 | Revert bundled smoke/helper changes from the same commit if needed (`EXPECTED_PORTAL_SCRIPT_COUNT`, `_portal-events-classic-chain.js`, etc.) |
| 3 | Rerun static smokes: phase1, 5L readiness, 5L3 rehearsal, full Phase 5 gate |
| 4 | Rerun production live QA on `https://justicemcneal.com/portal/events.html` (18-point checklist in `044`) |

`portal/events.rehearsal.html` may remain for regression comparison; it is not the production deploy path.

---

## 7. Current Status

| Milestone | Status |
| --- | --- |
| **Phase 5L.0** (readiness audit) | **Complete** (`035`) |
| **Phase 5L.1** (readiness smoke) | **Complete** (`036`, `1df9cdf`) |
| **Phase 5L.2** (boot hardening) | **Complete** (`037`, `b084f62`) |
| **Phase 5L.3 Option B** (rehearsal) | **Complete** (`042`, `9701850`) |
| **Phase 5L.3 Option C** (production) | **Complete** (`044`, `8cb205e`) |
| **Phase 5L script consolidation** | **Complete** — production **3-tag** model shipped |
| **Phase 5L.4** compat bootstrap | **Not started**, **not approved** |
| **Option D** module entry | **Not started**, **not approved** |

**Phase 5L is closed.** Further work requires a **new** explicit gate (see §8).

---

## 8. Recommended Next Gate (planning only)

Three tracks are viable; **none** are approved or implemented by this closeout.

| Option | Track | Risk profile | When to choose |
| --- | --- | --- | --- |
| **A** | **5L.4 compat bootstrap preflight** | **Higher** — touches runtime global wiring / optional installer load | Strong need to activate `compat/window-exports` or nested alias gaps block a future module entry |
| **B** | **list / manage / create monolith audits** | **Lower** — read-only audits first; splits are separate PRs | **Default** — reduce blast radius before any compat or module entry |
| **C** | **Pause and monitor production** | **Lowest** — no repo change | Short soak after Option C; gather user/staging signal |

### Recommendation

**Prefer Option B — list / manage / create monolith audits** unless there is a **strong, documented** need for **5L.4** now.

| Rationale | Detail |
| --- | --- |
| **Blast radius** | `list.js`, `manage/sheet.js`, and `create/sheet.js` remain the largest line-count risks (`036` / readiness smoke notes) |
| **Compat separation** | **5L.4** changes **how** globals are installed at runtime — different failure modes than HTML tag count |
| **5L.3 just shipped** | Production consolidation is fresh; optional soak (Option C) can run in parallel with audit planning |
| **Option D hold** | Full `type="module"` entry remains **out of scope** until explicit approval after any future HTML/bootstrap gate |

If **5L.4** is chosen later, require a **new** preflight/approval doc (mirror `039` / `043`) — **do not** bundle with Option B splits or CSS cleanup.

---

## 9. No-Go Reminders

- Do **not** combine **5L.4** compat runtime load with **list / manage / create** refactors in one PR.
- Do **not** combine **CSS cleanup** with **runtime** or **HTML** changes in one PR.
- Do **not** modify **production** `portal/events.html` again without a **new** written approval gate (preflight + sign-off).
- Do **not** add `type="module"` on portal Events scripts without explicit **Option D** approval.
- Do **not** treat this closeout doc as permission to start **5L.4**, **Option D**, or monolith **implementation** — audits and approvals first.

---

## 10. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/045_phase_5l_closeout_and_next_gate.md
git add docs/audit/pages/events/045_phase_5l_closeout_and_next_gate.md
git diff --staged --name-only
git commit -m "Add Phase 5L closeout and next gate"
git push
```

---

## Appendix — Checkpoint chain (5L series)

`035` (5L.0 audit) → `036` (5L.1) → `037` (5L.2) → `038` (paths) → `039`–`040` (5L.3 planning) → `041`–`042` (Option B) → `043`–`044` (Option C) → **`045` (5L closeout)** → *next gate: B (recommended) or A/C per §8*.
