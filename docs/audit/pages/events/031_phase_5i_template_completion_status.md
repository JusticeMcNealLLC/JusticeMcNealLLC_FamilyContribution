# Events Refactor — Phase 5I Template-Shell Completion Status

**Document:** `031_phase_5i_template_completion_status.md`  
**Date:** 2026-05-23  
**Status:** **Complete** — Phase 5I.1 implemented, static smokes green, live-verified on production  
**Planning audit commit:** `4b36642` — Add Phase 5I template shell audit (`030_phase_5i_template_shell_audit.md`)  
**Latest code commit (5I.1):** `42b1c0f` — Extract Event detail template shell  
**Related:** `030_phase_5i_template_shell_audit.md`, `029_phase_5h6_post_render_completion_status.md`, `027_phase_5h_section_builder_completion_status.md`, `025_phase_5_remaining_refactor_completion_roadmap.md`  
**Scope:** Portal Events detail **template shell** extraction (`js/portal/events/detail/template.js` classic script + `detail.js` orchestration delegation)  
**Out of scope:** Pre-template dead-code cleanup (5I.2), compat wiring, Phase 5L module entry, list/manage/create refactors

---

## 1. Completion Summary

Phase **5I.1** mechanical template-shell extraction is **complete**. The ~238-line `detailView.innerHTML` template literal moved from `detail.js` to `detail/template.js` as `evtBuildDetailTemplate(templateCtx)` with **no intentional markup changes**. `detail.js` builds `templateCtx`, assigns `detailView.innerHTML`, then runs the same post-render delegation chain as after 5H.6.4.

| Milestone | Commit | What shipped |
| --- | --- | --- |
| **5I audit** | `4b36642` | `030_phase_5i_template_shell_audit.md` — inventory, `templateCtx` field list, Option A recommendation, 5I.1 plan |
| **5I.1** | `42b1c0f` | `detail/template.js` created; one script tag in `portal/events.html`; `detail.js` delegates; `let costBreakdownHtml` fix; new smoke `_smoke-phase5i-template-shell.js` |

### 5I.1 deliverables

| Item | Location |
| --- | --- |
| **New file** | `js/portal/events/detail/template.js` (~302 lines, classic IIFE) |
| **API** | `function evtBuildDetailTemplate(templateCtx) { return \`...\`; }` |
| **Legacy global** | `window.evtBuildDetailTemplate` |
| **Namespace** | `PortalEvents.detail.template.build` |
| **Bridges** | `detail.template`, `detail.buildTemplate` in `detail.js` |
| **HTML load order** | `post-render.js` → **`template.js`** → `detail.js` (single new tag) |
| **Pre-template fix** | `const costBreakdownHtml` → `let costBreakdownHtml` (collapsible wrapper reassignment) |

### Per-PR file touch (5I.1)

| Files |
| --- |
| `js/portal/events/detail/template.js` (create) |
| `js/portal/events/detail.js` (remove inline template; `templateCtx` + delegation) |
| `portal/events.html` (one script tag) |
| `test/_smoke-phase5i-template-shell.js` (create) |
| `test/_smoke-phase3b-detail-bridge.js` |
| `test/_smoke-phase5h-detail-open-split.js` |
| `test/_smoke-phase5h6-post-render-bridge.js` |

### `evtOpenDetail` flow after 5I.1

```text
await evtLoadDetailContext(eventId)                    // detail/data.js
call evtBuildDetail*Html(ctx) + pre-template assembly  // detail/sections.js + detail.js
detailView.classList.add(...)
detailView.innerHTML = evtBuildDetailTemplate(templateCtx)  // detail/template.js
document.title + scroll + evtInitSectionAnimations()
evtRunDetailPostRenderUi({ ... })                      // detail/post-render.js
evtInitHeroCollapse()                                  // no-op stub in detail.js
evtRunDetailPostRenderBasics({ eventId })
setTimeout(100ms): renderQrCanvases + initInlineMaps
```

**`#myTicketQR` note:** Canvas element HTML is still built in `detail.js` pre-template (`qrHtml`); template injects via `${qrHtml}` in the sidebar. Post-render paints the canvas in `detail/post-render.js`.

---

## 2. Current Architecture

### Detail slice load order (`portal/events.html`)

Classic scripts only — **no `type="module"`** on portal Events feature files. `init.js` remains **last** among `js/portal/events/*`.

```text
../js/portal/events/team/chat.js
../js/portal/events/team/tools.js
../js/portal/events/detail/presentation.js
../js/portal/events/detail/raffle-render.js
../js/portal/events/detail/map-overlay.js
../js/portal/events/detail/fragments.js      ← _ed* fragment helpers
../js/portal/events/detail/data.js           ← evtLoadDetailContext
../js/portal/events/detail/sections.js      ← 18 evtBuildDetail*Html builders
../js/portal/events/detail/post-render.js   ← post-render hooks (5H.6)
../js/portal/events/detail/template.js      ← evtBuildDetailTemplate (5I.1)
../js/portal/events/detail.js               ← evtOpenDetail orchestrator
../js/portal/events/comments.js
… (rsvp, create, manage, etc.)
../js/portal/events/init.js                 ← last among portal Events scripts
```

### Supporting detail / team modules (earlier phases)

| Module | Role |
| --- | --- |
| `detail/fragments.js` | `evtEdCard`, `evtEdSectionHead`, … — used inside `template.js` via `window.evtEd*` |
| `detail/presentation.js` | Markdown, lightbox, section animations |
| `detail/raffle-render.js` | Raffle prize/winner rails |
| `detail/map-overlay.js` | Fullscreen map overlay |
| `team/tools.js` | CTA bar, Team Tools, `evtInitBottomNav` |
| `team/chat.js` | Team Chat panel |

### Responsibility split after 5I.1

| Module | Responsibility |
| --- | --- |
| `detail/data.js` | `evtLoadDetailContext` |
| `detail/sections.js` | Section HTML partials |
| `detail/template.js` | Main page shell HTML (`evtBuildDetailTemplate`) |
| `detail/post-render.js` | Comments trigger, avatars, QR canvas, maps, countdown, Team Tools ctx, bottom nav |
| `detail.js` | `evtOpenDetail`, pre-template assembly, `templateCtx`, post-render calls, exports |

Approximate line counts (repo, May 2026): `detail.js` ~351, `detail/template.js` ~302, `detail/post-render.js` ~190, `detail/sections.js` ~588, `detail/data.js` ~206.

---

## 3. Current `detail.js` Status

| Item | Status |
| --- | --- |
| **`async function evtOpenDetail`** | Still defined and exported (`window.evtOpenDetail`, `detail.open`) |
| **Role** | **Primarily orchestration** — no inline template literal |
| **Context** | Delegates to `window.evtLoadDetailContext` (`detail/data.js`) |
| **Section HTML** | Delegates to `window.evtBuildDetail*Html` (`detail/sections.js`) |
| **Template shell** | Delegates to `window.evtBuildDetailTemplate(templateCtx)` (`detail/template.js`) |
| **Post-render** | Delegates to `evtRunDetailPostRenderUi`, `evtRunDetailPostRenderBasics`, QR/maps `setTimeout` (`detail/post-render.js`) |
| **Pre-template in `detail.js`** | `bannerBg`, async ticket `qrHtml` + check-in fetch, `descHtml`, cost collapsible wrapper, dead strings (`venueQrHtml`, `scannerBtn`, unused builder outputs) |
| **Exports / bridges / register** | Still in `detail.js` |
| **Phase 5L** | **Not started** — no `type="module"` on portal Events scripts |

---

## 4. Verification Summary

### Static regression gate (all passed after `42b1c0f`)

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

| Smoke | Result (post–5I.1) |
| --- | --- |
| `_smoke-phase1-bridge.js` | **28/28** pass |
| `_smoke-phase3b-detail-bridge.js` | **264/264** pass |
| `_smoke-phase5h-detail-open-split.js` | **100/100** pass |
| `_smoke-phase5h6-post-render-bridge.js` | **50/50** pass |
| `_smoke-phase5i-template-shell.js` | **27/27** pass |
| `_smoke-event-team-tools-ui.js` | all pass |
| `_smoke-event-team-chat-ui.js` | all pass |
| `_smoke-portal-event-raffle-rsvp-parity.js` | all pass |

### Live QA (production — `https://justicemcneal.com`)

**Test event:** `yolanda-adam-and-justin-birthday-celebration-mov3ceo1`  
**Commit verified:** `42b1c0f`

| Area | Result |
| --- | --- |
| **Assets** | `post-render.js` → `template.js` → `detail.js`; template **HTTP 200**; `evtBuildDetailTemplate` + `PortalEvents.detail.template` on live; `detail.js` delegates; no inline `detailView.innerHTML = \`` |
| **Admin — layout** | Detail opens; desktop (main + sidebar); mobile (hero + qi-bar) |
| **Admin — hero** | Banner renders; lightbox opens on click |
| **Admin — actions** | Header actions; RSVP card; raffle section |
| **Admin — Team** | Team Tools + Team Chat **PASS** (isolated run; see caveats) |
| **Admin — content** | Comments; avatar stacks; desktop + mobile maps; countdown digits update |
| **Admin — maps** | Fullscreen overlay **PASS** (programmatic open/close) |
| **Admin — CTA** | Single mobile bottom nav on load |
| **Member regression** | Detail loads; no Team button; RSVP/raffle; comments/avatars/maps; mobile CTA |
| **Console / network** | No portal JS 4xx; no console errors on exercised paths |

### Known automation caveats (not treated as 5I.1 regressions)

| Check | Note |
| --- | --- |
| **Team Chat chained after Team Tools** | One headless run hit `Execution context was destroyed` when opening Team Chat immediately after Team Tools on the same page; **isolated Team Chat run PASS** |
| **Fullscreen map click** | Programmatic `evtOpenFullscreenMap` **PASS**; embedded map click-to-overlay can be flaky headless |
| **Manage Event sheet** | Not in 5I.1 gate; headless detect remains flaky when attempted |
| **QR-eligible canvas** | `#myTicketQR` paint not exercised without going + `attendee_ticket` + `qr_token` account; ineligible paths error-free |
| **CTA after `evtCloseCtaPanel`** | Floating shell cleanup may remove `#evtCtaBar` (expected) |

---

## 5. Remaining Work

Detail mechanical split (**data → sections → post-render → template → thin orchestrator**) is **functionally complete** for classic-script extraction. Remaining work is cleanup, compat, and module entry — not more template slices unless a fresh audit finds missed inline HTML.

| Work item | Target | Notes |
| --- | --- | --- |
| **5I.2 cleanup (optional)** | `detail.js` pre-template | Remove or document dead: `venueQrHtml`, `scannerBtn`, unused `hostControlsHtml` / `attendeeBreakdownHtml`; optional cost-wrapper tidy now that `let costBreakdownHtml` is fixed |
| **Compat / export wiring** | `compat/window-exports.js`, `detail/exports.js` | **After** template + post-render stable; own PR |
| **Phase 5L module entry** | `index.js` + `portal/events.html` | **Last** gate; single `type="module"` when orchestrator is thin |
| **List / manage / create refactors** | Various | Separate tracks; not combined with detail cleanup |

---

## 6. Recommended Next Step

1. **Do not start Phase 5L** (module entry, `type="module"`, or aggressive script reduction) yet.
2. **Do not start compat wiring** until you explicitly approve the next gate.
3. **Next recommended work:** small **5I.2 cleanup audit or PR** for pre-template dead code in `detail.js` — **not** compat/module-entry in the same change.
4. Optional: commit this checkpoint doc (`031_…`) after approval.

---

## 7. No-Go Reminder

**Do not combine in a single PR:**

- Pre-template dead-code cleanup (5I.2)
- Compat / export wiring
- Phase 5L module entry
- List / manage / create refactors

Each concern needs its own gate: static smokes, live QA on birthday event (+ member regression), and explicit approval.

---

## Appendix — `templateCtx` fields (5I.1)

`detail.js` passes these keys to `evtBuildDetailTemplate`:

`event`, `eventId`, `start`, `timeStr`, `tc`, `cpName`, `showTime`, `showLocation`, `showNotes`, `isPast`, `isClosed`, `deadlinePassed`, `rsvpEnabled`, `bannerBg`, `heroStatusBadgeHtml`, `pageHeaderActionsHtml`, `mobileAttendeesHtml`, `mobileHostedHtml`, `descHtml`, `descIsLong`, `eventContextHtml`, `attendeePreviewHtml`, `organizerHtml`, `waitlistHtml`, `thresholdHtml`, `costBreakdownHtml`, `locationReqHtml`, `graceHtml`, `raffleHtml`, `mapHtml`, `competitionHtml`, `scrapbookHtml`, `relatedHtml`, `rsvpButtons`, `teamHubCardHtml`, `qrHtml`, `documentsHtml`, `shareCardHtml`.

**Checkpoint chain:** 5H complete (`027`, `029`) → 5I audit (`030`) → **5I.1 complete (`031`, `42b1c0f`)** → optional 5I.2 cleanup → compat → Phase 5L.
