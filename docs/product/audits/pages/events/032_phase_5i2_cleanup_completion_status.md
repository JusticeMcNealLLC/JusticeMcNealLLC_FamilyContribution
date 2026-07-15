# Events Refactor — Phase 5I.2 Pre-Template Cleanup Completion Status

**Document:** `032_phase_5i2_cleanup_completion_status.md`  
**Date:** 2026-05-23  
**Status:** **Complete** — Phase 5I.2 implemented, static smokes green, live-verified on production  
**Prior template commit (5I.1):** `42b1c0f` — Extract Event detail template shell  
**Latest code commit (5I.2):** `8c46532` — Remove dead pre-template code from Event detail orchestrator  
**Related:** `031_phase_5i_template_completion_status.md`, `030_phase_5i_template_shell_audit.md`, `029_phase_5h6_post_render_completion_status.md`, `025_phase_5_remaining_refactor_completion_roadmap.md`  
**Scope:** Portal Events detail **pre-template dead-code cleanup** in `js/portal/events/detail.js` only (+ smoke assertions)  
**Out of scope:** `portal/events.html` changes, compat wiring, Phase 5L module entry, list/manage/create refactors

---

## 1. Completion Summary

Phase **5I.2** dead pre-template cleanup is **complete**. Removed unused HTML assembly and redundant locals from `evtOpenDetail()` in `detail.js` that were left over after Phase 5I.1 moved the page shell to `detail/template.js`. **No intentional markup or runtime behavior changes** — only deletion of code that never reached `templateCtx` or the template.

| Milestone | Commit | What shipped |
| --- | --- | --- |
| **5I.2** | `8c46532` | Remove dead pre-template blocks and unused section-builder calls from `detail.js`; extend static smokes |

### Removed from `detail.js` (5I.2)

| Item | Reason |
| --- | --- |
| **`venueQrHtml` block** | Built host venue QR markup pre-template; never passed into `templateCtx` or `evtBuildDetailTemplate` |
| **`scannerBtn` block** | Built host scanner button HTML pre-template; unused after template extraction |
| **`evtBuildDetailHostControlsHtml(ctx)` call** | Return value never used in `templateCtx` |
| **`evtBuildDetailAttendeeBreakdownHtml(ctx)` call** | Return value never used in `templateCtx` |
| **`const thresholdHtml = ''`** | Redundant local; replaced with inline `thresholdHtml: ''` in `templateCtx` |

### Kept in `detail.js` (5I.2)

| Item | Role |
| --- | --- |
| **`qrHtml`** | Pre-template ticket QR canvas HTML; injected into template via `templateCtx.qrHtml`; painted in `detail/post-render.js` (`#myTicketQR`) |
| **`costBreakdownHtml`** | Built via `evtBuildDetailCostBreakdownHtml(ctx)`; used in template sidebar |
| **All `evtOpenDetail` orchestration** | Context load → section builders → `templateCtx` → template → post-render delegation unchanged |

### Per-PR file touch (5I.2)

| Files |
| --- |
| `js/portal/events/detail.js` |
| `test/_smoke-phase3b-detail-bridge.js` |
| `test/_smoke-phase5h-detail-open-split.js` |
| `test/_smoke-phase5i-template-shell.js` |

**Not changed in 5I.2:** `portal/events.html`, `detail/template.js`, `detail/sections.js`, `detail/post-render.js`, `detail/data.js`. Section builders `evtBuildDetailHostControlsHtml` and `evtBuildDetailAttendeeBreakdownHtml` remain defined in `sections.js` for possible future use but are no longer called from the orchestrator.

---

## 2. Current Detail State

After 5I.1 + 5I.2, the detail stack is a thin classic-script pipeline:

| Module | Responsibility |
| --- | --- |
| **`detail/data.js`** | `evtLoadDetailContext` — Supabase/context load |
| **`detail/sections.js`** | Section HTML partials (`evtBuildDetail*Html`) |
| **`detail/template.js`** | Main page shell (`evtBuildDetailTemplate(templateCtx)`) |
| **`detail/post-render.js`** | Post-render hooks (comments trigger, avatars, QR canvas, maps, countdown, Team Tools ctx, bottom nav) |
| **`detail.js`** | **`evtOpenDetail` orchestration** — pre-template assembly (`qrHtml`, `descHtml`, cost wrapper, etc.), `templateCtx`, template assign, post-render delegation, exports |

### `evtOpenDetail` flow (after 5I.2)

```text
await evtLoadDetailContext(eventId)                    // detail/data.js
call evtBuildDetail*Html(ctx) + pre-template assembly  // sections.js + detail.js (qrHtml, descHtml, cost wrapper)
detailView.classList.add(...)
detailView.innerHTML = evtBuildDetailTemplate(templateCtx)  // detail/template.js
document.title + scroll + evtInitSectionAnimations()
evtRunDetailPostRenderUi({ ... })                      // detail/post-render.js
evtInitHeroCollapse()                                  // no-op stub
evtRunDetailPostRenderBasics({ eventId })
setTimeout(100ms): renderQrCanvases + initInlineMaps
```

### Portal / Phase gates

| Item | Status |
| --- | --- |
| **`portal/events.html`** | **Unchanged in 5I.2** (load order unchanged since 5I.1: `post-render.js` → `template.js` → `detail.js`) |
| **Classic scripts** | No `type="module"` on portal Events feature files |
| **`init.js`** | Still **last** among `js/portal/events/*` |
| **Phase 5L** | **Not started** |

Approximate line count: `detail.js` ~303 lines (down from ~351 post–5I.1).

---

## 3. Verification Summary

### Static regression gate (all passed after `8c46532`)

```bash
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3b-detail-bridge.js
node test/_smoke-phase5h-detail-open-split.js
node test/_smoke-phase5h6-post-render-bridge.js
node test/_smoke-phase5i-template-shell.js
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

| Smoke | Result (post–5I.2) |
| --- | --- |
| `_smoke-phase1-bridge.js` | **28/28** pass |
| `_smoke-phase3b-detail-bridge.js` | **ALL PASS** (includes 5I.2 negative checks: dead `venueQrHtml` / `scannerBtn` absent; unused host/attendee breakdown calls removed) |
| `_smoke-phase5h-detail-open-split.js` | **100/100** pass |
| `_smoke-phase5h6-post-render-bridge.js` | **50/50** pass |
| `_smoke-phase5i-template-shell.js` | **29/29** pass |
| `_smoke-event-team-tools-ui.js` | all pass |
| `_smoke-event-team-chat-ui.js` | all pass |
| `_smoke-portal-event-raffle-rsvp-parity.js` | all pass |

### Live QA (production — `https://justicemcneal.com`)

**Test event:** `yolanda-adam-and-justin-birthday-celebration-mov3ceo1`  
**Commit verified:** `8c46532`

| Area | Result |
| --- | --- |
| **Assets** | `detail.js` + `detail/template.js` **HTTP 200**; live `detail.js` lacks `venueQrHtml`, `scannerBtn`, `evtBuildDetailHostControlsHtml(ctx)`, `evtBuildDetailAttendeeBreakdownHtml(ctx)`; still exposes `evtOpenDetail`, `evtLoadDetailContext`, `evtBuildDetailTemplate`, `qrHtml`, `costBreakdownHtml`; `myTicketQR` in `detail.js` pre-template (not in `template.js`); load order and `init.js` last unchanged |
| **Visible change** | **None expected** — cleanup only removed dead code paths |
| **Admin / host — layout** | Detail opens; desktop (main + sidebar); mobile (hero + qi-bar) |
| **Admin / host — hero** | Banner renders; lightbox opens (`.ed-hero` click → `.evt-lightbox`) |
| **Admin / host — actions** | RSVP card; raffle section |
| **Admin / host — Team** | Team Tools + Team Chat **PASS** (programmatic / parity; see caveats) |
| **Admin / host — content** | Comments (4 loaded); avatar stacks; desktop + mobile Leaflet maps; countdown digits |
| **Admin / host — maps** | Fullscreen overlay **PASS** (`evtOpenFullscreenMap(lat, lng, …)` + `#fullscreenMapOverlay`) |
| **Admin / host — CTA** | Single bottom nav on load (`#evtCtaBar` count ≤ 1) |
| **Member regression** | Detail loads; **no Team button**; RSVP/raffle UI; comments/avatars/maps/countdown; single CTA; ticket/QR CTA path **PASS** in parity run |
| **Console / network** | **No** portal Events JS 4xx; **no** console errors on exercised detail paths |

### Known automation caveats (not treated as 5I.2 regressions)

| Check | Note |
| --- | --- |
| **Manage Event sheet** | Headless detect flaky in `_qa-portal-parity-signed-in.js` — pre-existing |
| **Scanner in Team Tools list** | Same parity flake when chained after Manage — unrelated to pre-template cleanup |
| **Desktop Team button click after mobile viewport** | Desktop `.ed-outline-btn` Team not visible on mobile width; use mobile CTA or `evtOpenTeamToolsPanel` |
| **Fullscreen map bare call** | `evtOpenFullscreenMap()` without `lat`/`lng` does not open overlay; call with event coordinates **PASS** |
| **QR-eligible canvas paint** | `#myTicketQR` `QRCode.toCanvas` not fully exercised without going + `attendee_ticket` + `qr_token`; ineligible paths error-free |
| **Team Chat chained after Team Tools** | Isolated `evtOpenTeamChat` **PASS**; chained headless can flake |

---

## 4. Remaining Work

Detail mechanical split (**data → sections → post-render → template → thin orchestrator**) plus **5I.2 pre-template cleanup** is **complete** for the classic-script track. Remaining work is compat, module entry, and other portal surfaces — not more dead-code removal in `detail.js` unless a fresh audit finds new orphans.

| Work item | Target | Notes |
| --- | --- | --- |
| **Compat / export wiring** | `compat/window-exports.js`, `detail/exports.js`, `023_phase_5e_export_wiring_plan.md` | Own PR; **after** explicit approval; do not mix with 5L |
| **Phase 5L readiness audit** | Docs + inventory | Confirm orchestrator thin enough, script order, global contract before module entry |
| **Phase 5L module entry** | `index.js` + `portal/events.html` | **Last** gate; single `type="module"` when approved |
| **List / manage / create refactors** | Various | Separate tracks per `025_phase_5_remaining_refactor_completion_roadmap.md` |

---

## 5. Recommended Next Step

1. **Do not start Phase 5L** (module entry, `type="module"`, or aggressive script reduction) yet.
2. **Do not start compat wiring** in the same PR as 5L or unrelated cleanup.
3. **Next gate (choose one, explicit approval):**
   - **Compat / export wiring audit** — inventory live globals vs `PortalEvents.detail.*` bridges before implementation PR, or
   - **Phase 5L readiness audit** — confirm module-entry prerequisites without changing `portal/events.html` yet.
4. Optional: commit this checkpoint doc (`032_…`) after approval.

---

## 6. No-Go Reminder

**Do not combine in a single PR:**

- Compat / export wiring
- Phase 5L module entry
- List / manage / create refactors
- Unrelated CSS / docs / `md/**` cleanup

Each concern needs its own gate: static smokes, live QA on birthday event (+ member regression), and explicit approval.

---

## Appendix — Checkpoint chain

5H complete (`027`, `029`) → 5I audit (`030`) → 5I.1 template shell (`031`, `42b1c0f`) → **5I.2 pre-template cleanup (`032`, `8c46532`)** → compat wiring → Phase 5L.
