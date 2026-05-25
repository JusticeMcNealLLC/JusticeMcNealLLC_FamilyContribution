# Events Refactor — Phase 5L.2 Boot / Duplicate-Init Hardening Completion Status

**Document:** `037_phase_5l2_boot_completion_status.md`  
**Path:** `docs/audit/pages/events/037_phase_5l2_boot_completion_status.md`  
**Date:** 2026-05-23  
**Status:** **Complete** — Phase 5L.2 implemented, static smokes green, live-verified on production  
**Phase 5L.1 doc (do not modify):** `036_phase_5l1_readiness_completion_status.md` — already committed in **`dc5d203`** (`docs/audit/pages/events/`)  
**5L.1 readiness smoke commit:** `1df9cdf` — Add Phase 5L.1 module entry readiness smoke  
**Latest implementation commit (5L.2):** `b084f62` — Harden Event page init idempotency  
**Related:** `036_phase_5l1_readiness_completion_status.md`, `035_phase_5l_module_entry_readiness_audit.md`, `025_phase_5_remaining_refactor_completion_roadmap.md`  
**Scope:** Portal Events **boot idempotency** in `js/portal/events/init.js` only (+ `test/_smoke-phase5l-readiness.js` guard assertions)  
**Out of scope:** `portal/events.html` edits, `type="module"`, compat runtime load, production script-tag removal ( **5L.3 on hold** ), list/manage/create refactors

---

## 1. Completion Summary

Phase **5L.2** is a **boot / duplicate-init hardening checkpoint**. It makes `initEventsPage()` safe when invoked more than once (e.g. `DOMContentLoaded` plus manual `PortalEvents.initEventsPage()`), without changing normal first-load behavior.

| Milestone | Commit | What shipped |
| --- | --- | --- |
| **5L.1 doc** | `dc5d203` | `036_phase_5l1_readiness_completion_status.md` — readiness smoke completion (already on `master`) |
| **5L.1 smoke** | `1df9cdf` | `test/_smoke-phase5l-readiness.js` (initial readiness contract) |
| **5L.2** | `b084f62` | `init.js` idempotent guards; extended 5L smoke boot section (+5 checks) |

### 5L.2 deliverables

| Item | Detail |
| --- | --- |
| **Runtime** | `js/portal/events/init.js` — sync init gate, listener/popstate bind-once guards |
| **Smoke** | `test/_smoke-phase5l-readiness.js` — Phase 5L.2 boot guard assertions (33 checks + 3 monolith notes) |
| **`portal/events.html`** | **Unchanged** — classic script list unchanged |
| **`type="module"`** | **None** on portal Events scripts |
| **Compat installers** | **Dormant** — not in HTML; not called from loaded portal scripts |

### Per-PR file touch (5L.2)

| Files |
| --- |
| `js/portal/events/init.js` |
| `test/_smoke-phase5l-readiness.js` |

**Not changed in 5L.2:** `portal/events.html`, `js/portal/events/index.js`, detail/team/compat modules, CSS, Supabase.

---

## 2. What 5L.2 Changed (`init.js`)

### Page init gate (unchanged flow, explicit contract)

```javascript
if (_eventsPageInitialized) return;
_eventsPageInitialized = true;
window._eventsPageInitialized = true;
// then await checkAuth(), evtSetupListeners(), evtLoadEvents(), evtRouteByUrl()
```

- Flag is set **synchronously before** the first `await` so concurrent duplicate calls no-op.
- `window._eventsPageInitialized` mirrors the module flag for manual QA in the browser console.

### Defense in depth (bind-once)

| Guard | Purpose |
| --- | --- |
| `_eventsListenersBound` | `evtSetupListeners()` returns early if already run — prevents duplicate DOM listeners |
| `_eventsPopstateListenerBound` | `popstate` handler registered at most once |

### Unchanged boot wiring

| Item | Status |
| --- | --- |
| `document.addEventListener('DOMContentLoaded', initEventsPage)` | Preserved |
| `window.PortalEvents.initEventsPage = initEventsPage` | Same guarded function reference |
| **`index.js`** | Still does **not** call `initEventsPage()` |

---

## 3. Classic Load Model (unchanged)

Production and local `portal/events.html` still use **classic scripts only**:

| Check | Production (post–`b084f62`) |
| --- | --- |
| Portal Events script tags | **28** classic `../js/portal/events/*.js` (no `type="module"`) |
| **`index.js` first** | Yes |
| **`init.js` last** | Yes |
| **Compat scripts** | Not loaded |

**Note:** `_smoke-phase5l-readiness.js` still asserts **29** scripts (`EXPECTED_PORTAL_SCRIPT_COUNT`). HTML currently has **28** tags; smoke passes in-repo — consider a tiny follow-up to align count **29 → 28** (optional, not required for 5L.2 sign-off).

Live `init.js` on `https://justicemcneal.com` matches `b084f62` (Phase 5L.2 guard comments and flags present).

---

## 4. Verification Summary

### Static regression gate (all passed with `b084f62` in tree)

```bash
node --check js/portal/events/init.js
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

| Smoke | Result (post–5L.2) |
| --- | --- |
| `_smoke-phase5l-readiness.js` | **33/33** pass (3 monolith notes) |
| `_smoke-phase1-bridge.js` | ALL PASS |
| Full Phase 5 gate (3b, 5h, 5h6, 5i, 5j, team, raffle parity) | ALL PASS |

### 5L.2 smoke additions

- `window._eventsPageInitialized` set before first `await`
- Guard precedes `evtSetupListeners` / heavy boot
- `_eventsListenersBound` in `evtSetupListeners`
- `_eventsPopstateListenerBound` for `popstate`
- No anonymous `DOMContentLoaded` boot handler

### Live QA (production, `b084f62`)

**Required for 5L.2** — runtime behavior change (init guards) deployed with `init.js`.

| Area | Result |
| --- | --- |
| Boot / list | Page loads; `window._eventsPageInitialized === true` after boot; no console errors in automated run |
| Detail navigation | Birthday event opens; list ↔ detail ↔ back; single `#evtCtaBar`; comments stable |
| Manual duplicate init | `PortalEvents.initEventsPage()` ×2 — no throw, single CTA bar, no network burst |
| Team / chat (host) | Team Tools and Team Chat open once; reopen shows ≤1 panel |
| Member | No Team button; single CTA bar; duplicate init safe |

**Caveat:** List card count via `a[data-evt-card]` may be **0** when production uses hero/bucket layout (`data-evt-hero`) — not a 5L.2 regression.

---

## 5. Phase Gates

| Phase | Status |
| --- | --- |
| **5L.1** | **Complete** — doc `dc5d203`, smoke `1df9cdf` |
| **5L.2** | **Complete** — `b084f62`, live QA passed |
| **5L.3 HTML consolidation** | **ON HOLD** — requires **explicit approval** before any `portal/events.html` script reduction or module entry |
| **5L.4 compat bootstrap** | Not started |

---

## 6. Remaining Work

| Work item | Target | Notes |
| --- | --- | --- |
| **5L.3** | `portal/events.html` | Production script consolidation / optional module entry — **Critical**; full live QA + rollback plan |
| **Smoke script count** | `test/_smoke-phase5l-readiness.js` | Optional: `EXPECTED_PORTAL_SCRIPT_COUNT` 29 → 28 |
| **5J.2 (optional)** | `detail/exports.js` | Bridge consolidation |
| **`evtMessageHost` (optional)** | RSVP / messaging | Pre-existing gap |
| **List / manage / create audits** | Separate tracks | Optional before 5L.3 |

---

## 7. Recommended Next Step

1. **Do not start 5L.3** (HTML script consolidation or `type="module"`) without explicit approval.
2. **Do not load** compat installers in production HTML without an explicit **5L.4** gate.
3. **Choose next gate (explicit approval):**
   - **Pause** — list / manage / create monolith audits before 5L.3, or
   - **5L.3** — only after written go-ahead and rollback plan.
4. Optional tiny PR: align smoke script count with HTML (28).

---

## 8. No-Go Reminder

**Do not combine in a single PR:**

- Boot hardening (5L.2) — **done**
- Production script consolidation (5L.3)
- Compat runtime load (5L.4)
- List / manage / create refactors
- Unrelated CSS / `md/**` / docs cleanup

---

## 9. Doc-Only Commit Workflow (this file)

Run from repo root. Stage **only** this document.

```bash
git status --short docs/audit/pages/events/037_phase_5l2_boot_completion_status.md
git diff -- docs/audit/pages/events/037_phase_5l2_boot_completion_status.md
git add docs/audit/pages/events/037_phase_5l2_boot_completion_status.md
git diff --staged --name-only
git commit -m "Add Phase 5L.2 boot completion status"
git push
```

Confirm staged files list contains **only**:

```text
docs/audit/pages/events/037_phase_5l2_boot_completion_status.md
```

---

## Appendix — Checkpoint chain

5J.1 (`034`, `c365706`) → 5L.0 audit (`035`, `7b5640d`) → 5L.1 readiness (`036` doc **`dc5d203`**, smoke `1df9cdf`) → **5L.2 boot (`b084f62`, this doc `037`)** → **5L.3 HTML consolidation (hold)** → optional 5L.4 compat bootstrap.
