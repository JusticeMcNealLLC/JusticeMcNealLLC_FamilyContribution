# Events Refactor — Phase 5L.1 Module Entry Readiness Smoke Completion Status

**Document:** `036_phase_5l1_readiness_completion_status.md`  
**Date:** 2026-05-23  
**Status:** **Complete** — Phase 5L.1 implemented, static smokes green (readiness-only; no live QA required)  
**Planning audit commit (5L.0):** `7b5640d` — Add Phase 5L module entry readiness audit (`035_phase_5l_module_entry_readiness_audit.md`)  
**Latest implementation commit (5L.1):** `1df9cdf` — Add Phase 5L.1 module entry readiness smoke  
**Related:** `035_phase_5l_module_entry_readiness_audit.md`, `034_phase_5j1_compat_inventory_completion_status.md`, `033_phase_5j_compat_export_wiring_audit.md`, `025_phase_5_remaining_refactor_completion_roadmap.md`  
**Scope:** Static Phase 5L **readiness smoke** — classic script model frozen before any module entry or HTML consolidation  
**Out of scope:** `portal/events.html` edits, `type="module"`, compat runtime load, production script-tag removal, list/manage/create refactors

---

## 1. Completion Summary

Phase **5L.1** module-entry **readiness smoke** is **complete**. A new static test documents and guards the post–5J classic-script load model so future Phase 5L work cannot silently start module entry or compat wiring without explicit gates.

| Milestone | Commit | What shipped |
| --- | --- | --- |
| **5L.0 audit** | `7b5640d` | `035_phase_5l_module_entry_readiness_audit.md` — script inventory, options A–D, micro-phase plan 5L.0–5L.4 |
| **5L.1** | `1df9cdf` | `test/_smoke-phase5l-readiness.js` (28 checks + 3 monolith info notes) |

### 5L.1 deliverables

| Item | Detail |
| --- | --- |
| **New smoke** | `test/_smoke-phase5l-readiness.js` |
| **Runtime behavior** | **Unchanged** — no production boot path change |
| **`portal/events.html`** | **Unchanged** — still **29** classic portal Events `<script>` tags |
| **`type="module"`** | **None** on portal Events scripts |
| **Compat installers** | **Dormant** — not in HTML; not called from loaded portal scripts |

### Per-PR file touch (5L.1)

| Files |
| --- |
| `test/_smoke-phase5l-readiness.js` (create) |

**Not changed in 5L.1:** `portal/events.html`, all `js/portal/events/**` runtime modules, `compat/*` load order.

---

## 2. What 5L.1 Verifies

`_smoke-phase5l-readiness.js` asserts the following contract (static file reads only):

### HTML / classic load model

| Check | Result |
| --- | --- |
| **29** portal Events classic scripts in `portal/events.html` | Enforced |
| **`index.js` first** among `js/portal/events/*` | Enforced |
| **`init.js` last** among `js/portal/events/*` (before `sw-register.js`) | Enforced |
| **`index.js` does not call `initEventsPage()`** | Enforced (namespace shell only) |
| **No `type="module"`** on portal Events script tags | Enforced |
| **Not consolidated** to single module-only loader | Enforced |
| **Compat scripts not loaded** (`window-exports`, `inline-handlers`, `external-globals`) | Enforced |

### Detail pipeline order (preserved)

```text
team/chat.js → team/tools.js → detail/presentation.js → detail/raffle-render.js
→ detail/map-overlay.js → detail/fragments.js → detail/data.js → detail/sections.js
→ detail/post-render.js → detail/template.js → detail.js
```

Sub-order **post-render → template → detail.js** explicitly checked.

### Boot guard (`init.js`)

| Check | Result |
| --- | --- |
| `initEventsPage` defined | Enforced |
| `_eventsPageInitialized` guard | Enforced |
| `DOMContentLoaded` → `initEventsPage` | Enforced |
| `PortalEvents.initEventsPage` assigned | Enforced |
| **No boot from `index.js`** | Enforced |

### Export readiness (5J prerequisite)

| Check | Result |
| --- | --- |
| `test/_smoke-phase5j-compat-exports.js` exists | Enforced |
| 5J smoke content covers dormant compat, detail exports, team exports, init barrel | Enforced (string guards in 5L smoke) |

### No-go: Phase 5L implementation not started

| Check | Result |
| --- | --- |
| No `installWindowExports(` in loaded portal scripts (29 files, `compat/` excluded from walk) | Enforced |
| No `installInlineHandlers(` in loaded portal scripts | Enforced |
| No module-entry bootstrap script in HTML | Enforced |

### Monolith awareness (noted, not failures)

| File | Approx. lines (at `1df9cdf`) |
| --- | --- |
| `js/portal/events/list.js` | ~2,979 |
| `js/portal/events/manage/sheet.js` | ~2,327 |
| `js/portal/events/create/sheet.js` | ~1,100 |

---

## 3. Current State

| Item | Status |
| --- | --- |
| **Portal Events loader** | **Classic scripts only** — 29 tags; unchanged since 5I.1 detail pipeline |
| **Module entry** | **Not started** — no `type="module"`; `index.js` does not orchestrate boot |
| **Script consolidation** | **Not started** — full tag list still in `portal/events.html` |
| **Detail split** | **Complete** — `data` → `sections` → pre-template in `detail.js` → `template` → `post-render` |
| **Export manifest** | Smoke-guarded by **5J.1** (`_smoke-phase5j-compat-exports.js`) + **5L.1** (load model) |
| **Compat** | On disk; **not loaded** on live path |
| **Large monoliths** | `list.js`, `manage/sheet.js`, `create/sheet.js` remain primary line-count risk for future 5L.3 |

---

## 4. Validation Summary

### Phase 5L.1 smoke (after `1df9cdf`)

```bash
node test/_smoke-phase5l-readiness.js
```

| Result | Detail |
| --- | --- |
| **5L.1 smoke** | **28/28 pass**, **3 noted** (monolith line counts) |

### Full static regression gate (all passed with 5L.1 in tree)

```bash
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3b-detail-bridge.js
node test/_smoke-phase5h-detail-open-split.js
node test/_smoke-phase5h6-post-render-bridge.js
node test/_smoke-phase5i-template-shell.js
node test/_smoke-phase5j-compat-exports.js
node test/_smoke-phase5l-readiness.js
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

| Smoke | Result (post–5L.1) |
| --- | --- |
| `_smoke-phase1-bridge.js` | ALL PASS |
| `_smoke-phase3b-detail-bridge.js` | ALL PASS |
| `_smoke-phase5h-detail-open-split.js` | **100/100** |
| `_smoke-phase5h6-post-render-bridge.js` | **50/50** |
| `_smoke-phase5i-template-shell.js` | **29/29** |
| `_smoke-phase5j-compat-exports.js` | **92/92** (1 noted: `evtMessageHost`) |
| `_smoke-phase5l-readiness.js` | **28/28** (3 monolith notes) |
| `_smoke-event-team-tools-ui.js` | all pass |
| `_smoke-event-team-chat-ui.js` | all pass |
| `_smoke-portal-event-raffle-rsvp-parity.js` | all pass |

### Live QA

**Not required** for 5L.1 — static/readiness-only change; no deployed script path or runtime behavior change. Production behavior unchanged from post–5I.2 / 5J.1 (`8c46532` / `c365706` code paths).

---

## 5. Remaining Work

| Work item | Target | Notes |
| --- | --- | --- |
| **5L.2** | `init.js` / boot path | Duplicate-init hardening; optional staging rehearsal; **live QA** on birthday event + list load |
| **Staging module rehearsal** | `events.rehearsal.html` or local harness (`025` §5K) | Classic tags stay on production until 5L.3 |
| **5L.3** | `portal/events.html` consolidation | Production script reduction / module entry — **Critical**; full live QA + rollback |
| **5L.4** | `compat/window-exports.js` | Only if module bootstrap requires central install |
| **5J.2 (optional)** | `detail/exports.js` | Bridge consolidation; not required for 5L.2 |
| **`evtMessageHost` (optional)** | RSVP / messaging | Pre-existing gap; separate PR |
| **List / manage / create audits** | Separate tracks | Optional path before 5L.3 to reduce blast radius |

---

## 6. Recommended Next Step

1. **Do not start production script consolidation** (`portal/events.html` tag removal or `type="module"`) yet.
2. **Do not load** compat installers in production HTML without an explicit **5L.4** gate.
3. **Next gate (choose one, explicit approval):**
   - **5L.2** — init / duplicate-boot hardening + live QA (still no HTML consolidation), or
   - **Pause** — audit **list** / **manage** / **create** monoliths before any 5L.3 HTML change.
4. Optional: commit this checkpoint doc (`036_…`) after approval.
5. Add `_smoke-phase5l-readiness.js` to standing gate lists in future completion docs / CI notes.

---

## 7. No-Go Reminder

**Do not combine in a single PR:**

- Boot / init hardening (5L.2)
- Production script consolidation (5L.3)
- Compat runtime load (5L.4)
- List / manage / create refactors
- Unrelated CSS / `md/**` / docs cleanup

Each concern needs its own gate: static smokes (5J + 5L), live QA when runtime or HTML changes, and explicit approval.

---

## Appendix — Checkpoint chain

5J.1 complete (`034`, `c365706`) → 5L.0 audit (`035`, `7b5640d`) → **5L.1 readiness smoke (`036`, `1df9cdf`)** → 5L.2 boot hardening → 5L.3 HTML consolidation → optional 5L.4 compat bootstrap.
