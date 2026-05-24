# Events Refactor — Phase 5H.6 Post-Render Completion Status

**Document:** `029_phase_5h6_post_render_completion_status.md`  
**Date:** 2026-05-23  
**Status:** **Complete** — Phases 5H.6.1–5H.6.4 implemented, static smokes green, live-verified on production  
**Latest code commit (5H.6.4):** `ee62118` — Extract Event detail countdown and Team Tools post-render hook  
**Related:** `027_phase_5h_section_builder_completion_status.md`, `028_phase_5h6_template_vs_post_render_audit.md`, `025_phase_5_remaining_refactor_completion_roadmap.md`  
**Scope:** Portal Events detail **post-render hooks** only (`js/portal/events/detail/post-render.js` classic script + `detail.js` orchestration delegation)  
**Out of scope:** Template shell move, compat wiring, Phase 5L module entry, list/manage/create refactors

---

## 1. Completion Summary

Phase **5H.6** mechanical post-render extraction is **complete**. All post-render responsibilities that lived at the end of `evtOpenDetail()` (after template insert) have been moved to `detail/post-render.js` in four gated slices. `detail.js` remains the orchestrator: load context → call section builders → assemble `detailView.innerHTML` → delegate post-render hooks.

| Slice | Commit | What moved |
| --- | --- | --- |
| **5H.6.1** | `a7344df` | `detail/post-render.js` created; `evtRunDetailPostRenderBasics` — comments trigger (`evtLoadComments`), avatar stack paint (`window._edAvatarData`), host dropdown outside-click listener; `portal/events.html` script tag added (`sections.js` → **post-render.js** → `detail.js`) |
| **5H.6.2** | `fb2bb9b` | `evtRenderDetailQrCanvases` — `QRCode.toCanvas` on `#myTicketQR` (attendee-ticket path) |
| **5H.6.3** | `3a479d6` | `evtInitDetailInlineMaps` — inline Leaflet for `#detailEventMap` and `#detailEventMapMobile`; map click → `evtOpenFullscreenMap` |
| **5H.6.4** | `ee62118` | `evtRunDetailPostRenderUi` — sidebar countdown (`_tickCd`, `#edCountdownCard`, `#edCdDays`…`#edCdSecs`), `window.__evtTeamToolsCtx`, `window.evtInitBottomNav(...)` |

### Export pattern (all 5H.6 slices)

Each hook is exposed as:

- Legacy global: `window.evtRunDetailPostRenderBasics`, `window.evtRenderDetailQrCanvases`, `window.evtInitDetailInlineMaps`, `window.evtRunDetailPostRenderUi`
- Namespace: `PortalEvents.detail.postRender.{runBasics, renderQrCanvases, initInlineMaps, runUi}`
- Bridges in `detail.js`: `detail.runPostRenderBasics`, `detail.renderQrCanvases`, `detail.initInlineMaps`, `detail.runPostRenderUi`

### Per-slice file touch (typical PR)

| Files |
| --- |
| `js/portal/events/detail/post-render.js` |
| `js/portal/events/detail.js` (delegation only; template unchanged) |
| `test/_smoke-phase5h6-post-render-bridge.js` (added in 5H.6.1; extended each slice) |
| `test/_smoke-phase3b-detail-bridge.js` |
| `test/_smoke-phase5h-detail-open-split.js` |

**Not moved in Phase 5H.6 (by design):**

- Full `detailView.innerHTML` template scaffold
- `async function evtOpenDetail` ownership
- Pre-template orchestration in `detail.js` (banner, ticket QR **HTML** + check-in query, description, cost collapsible wrapper, section builder calls)
- Fullscreen map overlay (`detail/map-overlay.js`)
- Comments implementation (`comments.js`); post-render only **triggers** load
- Team Tools / Chat panel bodies (`team/tools.js`, `team/chat.js`); post-render only sets context and calls `evtInitBottomNav`

### `evtOpenDetail` post-render call order (after template insert)

```text
document.title + scroll + evtInitSectionAnimations()
window.evtRunDetailPostRenderUi({ event, eventId, isPast, isClosed, rsvp, … })   // 5H.6.4
evtInitHeroCollapse()                                                            // no-op stub
window.evtRunDetailPostRenderBasics({ eventId })                                 // 5H.6.1
setTimeout(100ms):
  window.evtRenderDetailQrCanvases({ event, eventId, rsvp, memberGoing })        // 5H.6.2
  window.evtInitDetailInlineMaps({ event, showLocation })                          // 5H.6.3
```

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
../js/portal/events/detail/fragments.js      ← Phase 5F-prep (_ed* fragment helpers)
../js/portal/events/detail/data.js           ← Phase 5H.1 (context loader)
../js/portal/events/detail/sections.js      ← Phase 5H.2–5H.5 (section HTML builders)
../js/portal/events/detail/post-render.js   ← Phase 5H.6.1–5H.6.4 (post-render hooks)
../js/portal/events/detail.js               ← orchestrator + template
../js/portal/events/comments.js
… (rsvp, create, manage, etc.)
../js/portal/events/init.js                 ← last among portal Events scripts
```

### Earlier detail / team extractions (pre–5H.6)

| Phase | File | Role |
| --- | --- | --- |
| **5B** | `team/chat.js` | Team Chat panel, Realtime, `evtOpenTeamChat` / send / cleanup |
| **5C** | `team/tools.js` | CTA bar, Team Tools panel, `evtOpenTeamToolsPanel`, `evtInitBottomNav` |
| **5D.1** | `detail/presentation.js` | Markdown, lightbox, section animations; `evtStartLiveCountdown` exists but is **not** used by `evtOpenDetail` (sidebar uses inline `_tickCd` in post-render.js) |
| **5D.2** | `detail/raffle-render.js` | Raffle prize/winner rails, locked desktop block |
| **5D.3** | `detail/map-overlay.js` | Fullscreen map overlay open / recenter / close |
| **5F-prep** | `detail/fragments.js` | `_ed*` HTML fragments (`evtEdMetaRow`, `evtEdCard`, …) |
| **5H.1–5H.5** | `detail/data.js`, `detail/sections.js` | Context loader + 18 section builders (see `027_…`) |

### Responsibility split after 5H.6.4

| Module | Responsibility |
| --- | --- |
| `detail/data.js` | `evtLoadDetailContext(eventId)` → `ctx` or `null` |
| `detail/sections.js` | 18 `evtBuildDetail*Html(ctx)` section builders; seeds `window._edAvatarData` |
| `detail/post-render.js` | All post-render hooks (comments trigger, avatars, host dropdown, QR canvas, inline maps, countdown, Team Tools ctx, bottom nav) |
| `detail.js` | `evtOpenDetail`, template assembly, orchestration delegation, registry bridges |

Approximate line counts (repo, May 2026): `detail.js` ~554, `detail/post-render.js` ~190, `detail/sections.js` ~588, `detail/data.js` ~206.

---

## 3. Current `detail.js` Status

| Item | Status |
| --- | --- |
| **`async function evtOpenDetail`** | Still defined in `detail.js`; exported as `window.evtOpenDetail` and `detail.open` |
| **Full main template** | Still inline in `detail.js` (`detailView.innerHTML = \`...\``) |
| **Post-render hooks** | **Delegated** to `detail/post-render.js` via four `window.evt*` entry points |
| **Section HTML builders** | Delegated to `detail/sections.js` (unchanged from 5H.5) |
| **QR ticket HTML** | Still built in `detail.js` (canvas element in template); **canvas paint** in post-render.js |
| **Module entry / Phase 5L** | **Not started** — no `type="module"` on portal Events scripts |

**Removed from `detail.js` (5H.6):** `_tickCd`, `window.__evtTeamToolsCtx = …`, inline `evtInitBottomNav(…)`, `evtLoadComments` call, avatar paint IIFE, host dropdown listener, `QRCode.toCanvas`, `L.map` / `_initMap`.

---

## 4. Verification Summary

### Static regression gate (all passed after `ee62118`)

```bash
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3b-detail-bridge.js
node test/_smoke-phase5h-detail-open-split.js
node test/_smoke-phase5h6-post-render-bridge.js
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

| Smoke | Result (post–5H.6.4) |
| --- | --- |
| `_smoke-phase1-bridge.js` | **28/28** pass |
| `_smoke-phase3b-detail-bridge.js` | **254/254** pass (includes 5H.6.1–5H.6.4 delegation + negative checks on `detail.js`) |
| `_smoke-phase5h-detail-open-split.js` | **97/97** pass |
| `_smoke-phase5h6-post-render-bridge.js` | **49/49** pass |
| `_smoke-event-team-tools-ui.js` | all pass |
| `_smoke-event-team-chat-ui.js` | all pass |
| `_smoke-portal-event-raffle-rsvp-parity.js` | all pass |

### Live QA (production — `https://justicemcneal.com`)

**Test event:** `yolanda-adam-and-justin-birthday-celebration-mov3ceo1`  
**Commits verified in production:** `a7344df` (5H.6.1) through `ee62118` (5H.6.4)

| Slice / area | Result |
| --- | --- |
| **Asset / load order** | `sections.js` → `post-render.js` → `detail.js`; all **HTTP 200**; live `post-render.js` exposes all four hooks; `detail.js` delegates `evtRunDetailPostRenderUi` and no longer contains `_tickCd`, `__evtTeamToolsCtx =`, or inline `evtInitBottomNav(` |
| **5H.6.1 — comments / avatars / host dropdown** | Comments load; avatar stacks paint; no console errors |
| **5H.6.2 — QR canvas** | No errors on ineligible paths; **QR-eligible canvas paint not exercised** (no test account with going + `attendee_ticket` + `qr_token` at QA time) |
| **5H.6.3 — inline maps** | Desktop + mobile Leaflet tiles render; no Leaflet console errors; fullscreen map **PASS** via programmatic `evtOpenFullscreenMap` / `evtCloseFullscreenMap` |
| **5H.6.4 — countdown / Team Tools / CTA** | Sidebar countdown card present with updating digits (e.g. `21` days); `evtRunDetailPostRenderUi` / `__evtTeamToolsCtx` on window; mobile bottom nav (`#evtCtaBar`); Team Tools + Team Chat **PASS** (programmatic open); single CTA bar on load |
| **Member regression** | Detail loads; no Team button; mobile CTA present; RSVP/raffle UI; comments, avatars, maps; no portal JS 4xx / console errors |

### Data-dependent / automation caveats (not treated as 5H.6 regressions)

| Check | Note |
| --- | --- |
| **QR-eligible ticket canvas** | Skipped without account/event with going + `checkin_mode === 'attendee_ticket'` + `rsvp.qr_token`; ineligible paths verified error-free |
| **Manage Event sheet** | Headless `EventsManage.open` / host-button click did not consistently detect manage sheet — **flaky** in automation; not linked to post-render slices |
| **Fullscreen map click** | Overlay module works; **click** on embedded map to open overlay can be flaky headless; programmatic open **PASS** |
| **CTA bar after `evtCloseCtaPanel`** | Floating shell cleanup removes `#evtCtaBar` (expected); not duplicate bars |
| **Admin RSVP/Raffle from CTA** | Birthday admin path uses Manage/Team CTA; RSVP/raffle verified in detail UI, not click-through on admin CTA |

---

## 5. Remaining Refactor Work

Phase 5H.6 **post-render track is done**. Remaining `detail.js` bulk is primarily **template + pre-template orchestration**.

| Work item | Target (proposed) | Notes |
| --- | --- | --- |
| **Template shell extraction** | `detail/template.js` | Move `detailView.innerHTML` scaffold; keep variable injection in orchestrator |
| **Thin `evtOpenDetail()` cleanup** | `detail.js` | After template move: load ctx → build sections → render template → post-render calls only |
| **Pre-template cleanup** | `detail.js` or small helper | Ticket QR HTML + check-in fetch, dead `venueQrHtml` / `scannerBtn` strings, cost collapsible `const` reassignment (see `028_…`) |
| **Compat / export wiring** | `compat/window-exports.js`, `detail/exports.js` | **Only after** template shell is stable and live-QA’d |
| **Phase 5L module entry / HTML cleanup** | `index.js` + `portal/events.html` | Last gate; single `type="module"` when orchestrator is thin |

**Not planned inside 5H.6:** list/manage/create refactors, Supabase migrations, `js/events/**` public-site changes.

---

## 6. Recommended Next Step

1. **Do not start Phase 5L** (module entry, `type="module"`, or aggressive `portal/events.html` script reduction) yet.
2. **Do not start another 5H.6 post-render slice** — track is complete.
3. **Next gated work:** dedicated **Phase 5I template-shell audit** (planning doc only) before moving `detailView.innerHTML` — inventory template variables, `postRenderCtx` vs `templateCtx`, and HTML/script tag plan for `detail/template.js`.
4. **First implementation slice after audit approval:** template shell → `detail/template.js` only (no compat, no Phase 5L in the same PR).

---

## 7. No-Go Reminder

**Do not combine in a single PR:**

- Template shell move
- Compat wiring (`compat/window-exports.js`, `detail/exports.js`)
- Module entry / Phase 5L
- List / manage / create refactors

Each concern needs its own gate: static smokes, live QA on birthday event (+ member regression), and explicit approval before the next slice.

---

## Appendix — Post-render API (`detail/post-render.js`)

| Global | Namespace method | Phase | Role |
| --- | --- | --- | --- |
| `evtRunDetailPostRenderBasics` | `postRender.runBasics` | 5H.6.1 | Comments, host dropdown, avatar paint |
| `evtRenderDetailQrCanvases` | `postRender.renderQrCanvases` | 5H.6.2 | `#myTicketQR` canvas |
| `evtInitDetailInlineMaps` | `postRender.initInlineMaps` | 5H.6.3 | `#detailEventMap`, `#detailEventMapMobile` |
| `evtRunDetailPostRenderUi` | `postRender.runUi` | 5H.6.4 | Countdown, `__evtTeamToolsCtx`, `evtInitBottomNav` |

**Total:** 4 post-render entry points; 1 new classic script file; 1 HTML script tag (added in 5H.6.1, unchanged through 5H.6.4).
