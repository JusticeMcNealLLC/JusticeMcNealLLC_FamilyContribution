# Events Refactor — Phase 5H.6 Template vs Post-Render Audit

**Document:** `028_phase_5h6_template_vs_post_render_audit.md`  
**Date:** 2026-05-23  
**Status:** Audit / planning only — **no runtime changes**  
**Baseline:** `detail.js` after Phase 5H.5 (`2a33db4`); checkpoint `027_phase_5h_section_builder_completion_status.md` (`984b651`)  
**Related:** `025_phase_5_remaining_refactor_completion_roadmap.md`, `026_phase_5g_evt_open_detail_split_audit.md`, `027_phase_5h_section_builder_completion_status.md`  
**Scope:** Decide the next extraction boundary after the completed **5H section-builder** track  
**Out of scope:** Implementation, `portal/events.html` edits, Phase 5L module entry, template move in this audit PR

---

## Executive summary

After **5H.1–5H.5**, `detail.js` shrank from ~1,024 lines of `evtOpenDetail` to **~508 lines** inside the function (~630 lines file total). Remaining bulk is:

1. **~240 lines** — `detailView.innerHTML` template shell (hero, grid, sidebar, comments markup shell).
2. **~110 lines** — post-render hooks (countdown, Team Tools, comments, avatars, QR canvas, inline Leaflet).
3. **~55 lines** — pre-template orchestration still in `detail.js` (banner, ticket QR **HTML** + extra check-in query, scanner button string, description, cost collapsible wrapper).

**Recommendation:** **Proceed with post-render extraction before template** (Option B), in **small slices** passing a single **`postRenderCtx`** object. **Do not** move the full template (Option A) until post-render boundaries are stable and live-QA’d per slice.

**First implementation slice (if approved):** **5H.6.1 — avatar stack paint + `evtLoadComments` trigger** → `detail/post-render.js` (classic IIFE), leaving QR/Leaflet/countdown/Team Tools in `detail.js` for 5H.6.2+.

---

## 1. Current `detail.js` inventory (post–5H.5)

**File:** `js/portal/events/detail.js` (~**629** lines total)  
**Function:** `async function evtOpenDetail(eventId)` — **lines 41–548**  
**Outside function:** IIFE namespace/registry (**14–22**), fragment aliases (**29–33**), hero-collapse stubs (**557–558**), exports/bridges/register (**566–627**)

### 1.1 `evtOpenDetail()` orchestration

| Lines | Section | Responsibility |
| ---: | --- | --- |
| **41–43** | Context load | `await window.evtLoadDetailContext(eventId)`; early return if null |
| **45–92** | Destructure `ctx` | All flags/lists/html partials from `detail/data.js` |
| **94–191** | Pre-template assembly | Call `window.evtBuildDetail*Html(ctx)`; `bannerBg`; ticket QR **HTML** + Supabase check-in fetch; venue QR / scanner strings (mostly unused in template); `evtMiniMarkdown` description; **cost breakdown collapsible wrapper** (mutates `costBreakdownHtml` — see note below) |
| **197–437** | **Template shell** | `detailView.classList` + `detailView.innerHTML = \`...\`` |
| **439–547** | **Post-render hooks** | See §1.2 |
| **548** | End of function | — |

**Note (tech debt):** Lines **184–190** reassign `costBreakdownHtml` declared with `const` at **156**. If `event.rsvp_cost_cents` is set, this would throw at runtime; use `let` or a separate `costBreakdownWrapped` variable when touching this region (fix in the same PR as template or pre-template cleanup, not required for 5H.6.1).

**Dead / unused pre-template variables (pre-existing):**

| Variable | Built | Inserted in template? |
| --- | --- | --- |
| `venueQrHtml` | 139–147 | No (comment: moved to Manage sheet) |
| `scannerBtn` | 150–154 | No |
| `hostControlsHtml` | 168 | No |
| `attendeeBreakdownHtml` | 166 | No |
| `thresholdHtml` | 157 | Always `''` |

### 1.2 Post-render hooks (detail.js **439–547**)

| Lines | Hook | Dependencies | DOM / globals |
| ---: | --- | --- | --- |
| **439–441** | Document title, scroll, section animations | `event.title`; `window.evtInitSectionAnimations` | `document`, `window` |
| **443–466** | **Sidebar countdown** (inline `_tickCd`, not `evtStartLiveCountdown`) | `event.start_date`, `isPast`, `isClosed`; IDs `edCdDays`…`edCdSecs`, `edCountdownCard` | `document`, `setInterval`, `popstate`, `evtDetailUnmount` |
| **468–476** | **`window.__evtTeamToolsCtx`** | `eventId`, raffle/RSVP flags, host/team permissions | `window` |
| **477–479** | **Team Tools / CTA bar** | `window.evtInitBottomNav(event, eventId, rsvp, …)` | `team/tools.js` |
| **480** | Hero collapse no-op | `evtInitHeroCollapse()` | stub |
| **481** | **Comments** | `evtLoadComments(eventId)` | `comments.js` |
| **483–486** | Host dropdown click-away | `.evt-host-dropdown` | `document` listener |
| **488–522** | **Avatar paint** | `window._edAvatarData[eventId]` seeded in `sections.js` (`evtBuildDetailAttendeePreviewHtml`); IDs `edAttendeeRow-*`, `edAvatarStack-*`, `edAvatarStackMobile-*` | `setTimeout(0)`, `ResizeObserver` |
| **524–547** | **QR canvas + inline Leaflet** | `memberGoing`, `rsvp.qr_token`, `event.slug`, `showLocation`, coords; `QRCode`, `L` | `#myTicketQR`, `#detailEventMap`, `#detailEventMapMobile`; `window.evtOpenFullscreenMap` on map click |

**Countdown clarification:** `window.evtStartLiveCountdown` exists in `detail/presentation.js` and is **bridged** on `detail.startLiveCountdown` (**579**) but is **not called** from `evtOpenDetail` today. Hero badge countdown text is **static HTML** from `evtBuildDetailHeroStatusBadgeHtml` (sections.js). Sidebar “Starts In” uses **inline** `_tickCd` in detail.js.

### 1.3 Template shell (detail.js **197–437**)

~**240 lines** single template literal including:

- Page header (back, title, `${pageHeaderActionsHtml}`)
- Hero (`bannerBg`, `${heroStatusBadgeHtml}`, title, info bar)
- Mobile qi-bar, mobile map card markup (`#detailEventMapMobile`), `${mobileAttendeesHtml}`, `${mobileHostedHtml}`
- About grid (description, `${attendeePreviewHtml}`, `${organizerHtml}`, desktop `#detailEventMap`)
- Dynamic cards: waitlist, cost, raffle, `${mapHtml}`, competition, scrapbook
- Comments **shell** (`#portalCommentsSection`, `onclick="evtPostComment('${eventId}')"`)
- `${relatedHtml}`, cancellation note, sidebar summary, RSVP card, `${teamHubCardHtml}`, `${qrHtml}`, documents, countdown **markup**, `${shareCardHtml}`

**Inline handlers:** 30+ distinct `onclick` / `href` patterns (see `026` §2 and `compat/inline-handlers.js` groups). Template move risks **string drift** and **load-order** surprises; smokes do not parse template bodies today.

### 1.4 QR / ticket logic split across two phases

| Phase | Location | What |
| --- | --- | --- |
| **Pre-render (HTML)** | detail.js **108–136** | Extra `event_checkins` query; builds `${qrHtml}` sidebar card with `#myTicketQR` canvas placeholder |
| **Post-render (paint)** | detail.js **525–531** | `QRCode.toCanvas` when `memberGoing && attendee_ticket` |

Venue QR HTML (**139–147**) is dead in template; venue canvas comment says Manage sheet owns it.

### 1.5 Exports / bridges / register (detail.js **566–627**)

Unchanged pattern: `window.evtOpenDetail`, hero-collapse stubs, flat bridges to presentation/raffle/map/team, **5E.1 nested aliases**, `detail.loadContext`, `detail.sections`, `detail.register('rsvp' | …)`.

---

## 2. Compare next extraction options

### Option A — `detail/template.js`

Move **`detailView.innerHTML` template shell** (~197–437); keep post-render in `detail.js`.

| Pros | Cons |
| --- | --- |
| Largest line reduction in one file | Highest inline-handler / interpolation risk |
| Clear separation “HTML shape” vs “behavior” | Template needs **20+ parameters** or a fat `renderCtx` |
| | Easy to break `${}` nesting / mobile map card |
| | **Must not** combine with post-render in one PR |

### Option B — `detail/post-render.js`

Move post-render hooks (**439–547**) behind e.g. `window.evtRunDetailPostRender(postRenderCtx)`.

| Pros | Cons |
| --- | --- |
| Matches user preference: pass **context object** | Multiple concerns still tangled in one block today |
| Smaller blast radius than template | Leaflet/QR need **CDN globals** (`L`, `QRCode`) |
| Can slice: avatars → QR → maps → team/countdown | `_edAvatarData` contract spans **sections.js** + post-render |
| **No template `onclick` moves** | New script tag in HTML when file is added |

### Option C — `detail/qr.js` or `detail/ticket.js`

Move ticket QR **HTML build + check-in query + canvas paint** only.

| Pros | Cons |
| --- | --- |
| Very focused | Leaves avatar/maps/team/countdown in `detail.js` |
| Good if check-in flows are fragile | Still splits QR across two call sites unless both move |
| | Extra Supabase query (**113–118**) arguably belongs in **`data.js`** not qr |

### Option D — Pause detail refactor → list / manage / create audits

| Pros | Cons |
| --- | --- |
| `list.js` / `manage/sheet.js` are larger files | Leaves `evtOpenDetail` template monolith |
| | Post-render remains mixed with orchestrator |
| | **5H momentum lost**; detail is now “small enough” to finish |

**Audit decision:** **Reject D** for now. **Defer A** until **B** is partially complete. **C** is a valid **sub-slice of B** (5H.6.2), not a competing track.

---

## 3. Risk analysis

### Option A — template.js

| Dimension | Assessment |
| --- | --- |
| **Files created** | `detail/template.js` |
| **Files edited** | `detail.js`, smokes (`phase3b`, `phase5h`) |
| **`portal/events.html`** | **Yes** — insert `<script>` after `sections.js`, before `detail.js` |
| **Dependency risk** | **High** — every `ctx` field used in template must be passed explicitly |
| **Inline handler risk** | **High** — template is the densest `onclick` surface |
| **Live QA** | Full detail checklist (§7) |
| **Rollback** | Revert commit; remove script tag |

### Option B — post-render.js (full block)

| Dimension | Assessment |
| --- | --- |
| **Files created** | `detail/post-render.js` |
| **Files edited** | `detail.js`, smokes |
| **`portal/events.html`** | **Yes** — after `sections.js`, before `detail.js` |
| **Dependency risk** | **Medium** — `postRenderCtx` must mirror closure vars |
| **Inline handler risk** | **Low** — no template string move |
| **Live QA** | Per-slice subset (§7) |
| **Rollback** | Revert commit; remove script tag |

### Option B — sliced (recommended)

| Slice | Risk | HTML change |
| --- | --- | --- |
| **5H.6.1** Avatars + comments + host dropdown | **Low** | Yes (one script tag) |
| **5H.6.2** QR canvas paint (+ optional check-in fetch → data.js) | **Low–medium** | Same file |
| **5H.6.3** Inline Leaflet (`detailEventMap` ×2) | **Medium** | Same file |
| **5H.6.4** Sidebar countdown + `__evtTeamToolsCtx` + `evtInitBottomNav` | **Medium** | Same file |
| **5H.6.5** Dead string cleanup (`venueQrHtml`, etc.) | **Low** | No new file |

### Option C — qr.js only

| Dimension | Assessment |
| --- | --- |
| **Files created** | `detail/qr.js` (optional) |
| **Dependency risk** | **Medium** — splits HTML vs paint unless both move together |
| **Inline handler risk** | **None** in QR block |
| **Live QA** | Ticket QR + member/admin check-in states |

### Option D — pause

| Dimension | Assessment |
| --- | --- |
| **Risk** | **N/A** (no detail change) |
| **Opportunity cost** | Detail refactor near completion; template still blocks thin orchestrator |

---

## 4. Recommendation

**Order:** **Post-render first (Option B, sliced)** → **pre-template cleanup / QR HTML** → **template shell (Option A)** → thin `evtOpenDetail` → Phase 5L (much later).

**Rationale:**

1. User preference: post-render only if DOM deps fit a **context object** — **yes**: `postRenderCtx = { eventId, event, rsvp, memberGoing, showLocation, isPast, isClosed, isHost, canAccessTeamHub, canCreateTeamChat, myRaffleEntry, entriesClosed, eventIsFull, … }`.
2. Template move does **not** clarify post-render boundaries; the reverse does.
3. **`_edAvatarData`** is already a cross-module contract (`sections.js` writes, `detail.js` reads); documenting it in post-render.js reduces risk before template extraction.
4. **`evtStartLiveCountdown`** is unused in open path — sidebar countdown should move with post-render slice **5H.6.4**, not presentation.js.

**Do not** move the full post-render block (**439–547**) in a single PR — countdown, Team Tools, avatars, QR, and Leaflet have different globals and QA surfaces.

---

## 5. Proposed next implementation

### 5H.6.1 — Avatar paint + comments trigger (recommended first PR)

| Item | Detail |
| --- | --- |
| **Create** | `js/portal/events/detail/post-render.js` (classic IIFE) |
| **Export** | `window.evtDetailPaintAttendeeAvatars({ eventId })` |
| | `window.evtDetailAfterMount({ eventId })` — calls `evtLoadComments`, host dropdown listener, avatar paint |
| **Move from detail.js** | Lines **481**, **483–486**, **488–522** |
| **Leave in detail.js** | Template, QR HTML, QR paint, Leaflet, countdown, Team Tools |
| **`portal/events.html`** | Add `<script src="../js/portal/events/detail/post-render.js"></script>` after `sections.js`, before `detail.js` |
| **`detail.js` end** | `window.evtDetailAfterMount({ eventId, … })` one call |

**`postRenderCtx` minimum for 5H.6.1:**

```js
{ eventId }
```

Avatar paint reads `window._edAvatarData[eventId]` only; comments need `eventId` only.

### 5H.6.2 — QR canvas paint (+ optional data.js check-in)

| Move | Lines **525–531**; consider moving check-in query **113–118** into `evtLoadDetailContext` returning `myCheckin` on `ctx` |
| Export | `window.evtDetailPaintTicketQr({ event, rsvp, memberGoing })` |

### 5H.6.3 — Inline Leaflet

| Move | Lines **533–546** (`_initMap` for `detailEventMap` + `detailEventMapMobile`) |
| Export | `window.evtDetailInitInlineMaps({ event, showLocation })` |
| QA | Embedded map + fullscreen overlay click |

### 5H.6.4 — Countdown + Team Tools context

| Move | Lines **443–466**, **468–479** |
| Export | `window.evtDetailInitSidebarCountdown({ event, isPast, isClosed })`, `window.evtDetailInitTeamTools({ … })` |

### 5H.6.5 — Pre-template dead code cleanup (optional)

Remove or stop computing `venueQrHtml`, `scannerBtn`, `hostControlsHtml`, `attendeeBreakdownHtml`; fix `costBreakdownHtml` `const` reassignment.

### 5H.6.6+ — Template shell (`detail/template.js`)

Only after **5H.6.1–5H.6.4** live-QA green:

| Export | `window.evtBuildDetailTemplateHtml(renderCtx)` returning full innerHTML string |
| **Keep in detail.js** | `getElementById`, `classList`, assign innerHTML, call post-render |

---

## 6. Required tests

### Existing gate (every 5H.6 implementation PR)

```bash
node --check js/portal/events/detail/post-render.js   # when file exists
node --check js/portal/events/detail.js
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3b-detail-bridge.js
node test/_smoke-phase5h-detail-open-split.js
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

### Recommended new smoke (5H.6.1)

**`test/_smoke-phase5h6-post-render-bridge.js`** (add when `post-render.js` lands):

| Check | Purpose |
| --- | --- |
| `post-render.js` IIFE, no `export` | Classic-script safe |
| `window.evtDetailAfterMount` assigned | Orchestrator delegation |
| `portal/events.html` load order: `sections.js` → `post-render.js` → `detail.js` | No orphan script |
| `detail.js` calls `window.evtDetailAfterMount` (or slice-specific fn) | Wiring |
| `_edAvatarData` still written in `sections.js` | Cross-module contract |

Extend **`_smoke-phase3b-detail-bridge.js`** with post-render namespace bridge if `PortalEvents.detail.postRender` is added.

---

## 7. Live QA plan

**Environment:** Production `https://justicemcneal.com`  
**Primary event:** `yolanda-adam-and-justin-birthday-celebration-mov3ceo1`  
**Member account:** normal member (no Team button)

| Check | 5H.6.1 | 5H.6.2 | 5H.6.3 | 5H.6.4 | Template |
| --- | --- | --- | --- | --- | --- |
| Detail opens | ✓ | ✓ | ✓ | ✓ | ✓ |
| RSVP / raffle | ✓ | ✓ | ✓ | ✓ | ✓ |
| Team Tools / Chat | ✓ | ✓ | ✓ | **✓** | ✓ |
| Comments load | **✓** | ✓ | ✓ | ✓ | ✓ |
| Attendee avatars (desktop + mobile) | **✓** | ✓ | ✓ | ✓ | ✓ |
| QR / ticket (going + attendee_ticket) | — | **✓** | ✓ | ✓ | ✓ |
| Embedded map | — | — | **✓** | ✓ | ✓ |
| Fullscreen map | — | — | **✓** | ✓ | ✓ |
| Sidebar countdown | — | — | — | **✓** | ✓ |
| Manage sheet | ✓ | ✓ | ✓ | ✓ | ✓ |
| Member regression | ✓ | ✓ | ✓ | ✓ | ✓ |
| No duplicate CTA bars | ✓ | ✓ | ✓ | ✓ | ✓ |
| Console / portal JS 4xx | ✓ | ✓ | ✓ | ✓ | ✓ |

**Automation caveats (unchanged):** Manage Event sheet and fullscreen map overlay may be flaky headless; use programmatic `EventsManage.open` / `evtOpenFullscreenMap` when needed.

**Data-dependent (skip if no event):** LLC threshold/transport, waitlist/grace, related-events rail, paid ticket QR states.

---

## 8. Final go / no-go

| Question | Answer |
| --- | --- |
| **Start implementation now?** | **Yes** — but only **5H.6.1** (avatar paint + comments + host dropdown) after explicit approval of this audit |
| **Exact first slice** | **5H.6.1** — `detail/post-render.js` + HTML script tag + `evtDetailAfterMount` delegation |
| **Blocked until later** | Full template shell; full post-render monolith in one PR; `detail/qr.js` as sole track without post-render file; compat/`exports.js`; **Phase 5L** |
| **Template extraction** | **No-go** until 5H.6.1–5H.6.4 complete and live-QA’d |

### No-go reminder (same PR)

Do **not** combine:

- Template shell move  
- Full post-render extraction (all hooks at once)  
- Compat wiring  
- Phase 5L module entry  

---

## Appendix A — Load order after 5H.6.1 (proposed)

```text
team/chat.js → team/tools.js → presentation.js → raffle-render.js → map-overlay.js
  → fragments.js → data.js → sections.js → post-render.js → detail.js → … → init.js
```

## Appendix B — Cross-module contracts to preserve

| Contract | Writer | Reader |
| --- | --- | --- |
| `window._edAvatarData[eventId]` | `detail/sections.js` (`evtBuildDetailAttendeePreviewHtml`) | Post-render avatar paint |
| `window.__evtTeamToolsCtx` | detail.js (→ post-render 5H.6.4) | `team/tools.js` CTA panel |
| `#portalCommentsSection` / `evtLoadComments` | Template shell | `comments.js` |
| `#myTicketQR` | QR HTML in detail.js | QR paint (5H.6.2) |
| `#detailEventMap` / `#detailEventMapMobile` | Template shell | Leaflet init (5H.6.3) |

## Appendix C — What remains in `detail.js` after full 5H.6 (target state)

| Region | ~Lines (current) | After 5H.6.1–5H.6.5 |
| --- | ---: | --- |
| Orchestrator + pre-template | 41–191 | Shrinks slightly (QR query optional move to data.js) |
| Template shell | 197–437 | Unchanged until 5H.6.6+ |
| Post-render | 439–547 | Replaced by `window.evtDetailAfterMount` + slice calls |
| Bridges / register | 566–627 | Unchanged |

**Target `evtOpenDetail` shape:**

```text
ctx = await evtLoadDetailContext(id)
html = assemble section vars + evtBuildDetailTemplateHtml(renderCtx)   // future
mount innerHTML
evtDetailAfterMount(postRenderCtx)   // incremental slices
```
