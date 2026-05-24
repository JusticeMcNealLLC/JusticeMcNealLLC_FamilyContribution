# Events Refactor — Phase 5I Template Shell Audit

**Document:** `030_phase_5i_template_shell_audit.md`  
**Date:** 2026-05-23  
**Status:** Audit / planning only — **no runtime changes**  
**Baseline:** `detail.js` after Phase 5H.6.4 (`ee62118`); checkpoint `029_phase_5h6_post_render_completion_status.md` (`90dd802`)  
**Related:** `028_phase_5h6_template_vs_post_render_audit.md`, `027_phase_5h_section_builder_completion_status.md`, `025_phase_5_remaining_refactor_completion_roadmap.md`  
**Scope:** Plan extraction of `detailView.innerHTML` from `js/portal/events/detail.js` → future `js/portal/events/detail/template.js`  
**Out of scope:** Implementation, `portal/events.html` edits (except noting future single script tag), compat wiring, Phase 5L, list/manage/create refactors

---

## Executive summary

After **5H.1–5H.6.4**, `detail.js` is **~554 lines** total. The largest remaining block is the **~238-line** `detailView.innerHTML` template literal (**lines 200–438**). Post-render is fully delegated to `detail/post-render.js`.

**Recommendation:** **Proceed with Phase 5I.1** — one mechanical move: `function evtBuildDetailTemplate(templateCtx) { return \`...\`; }` in `detail/template.js`, with **no markup or handler renames**. `detail.js` builds `templateCtx`, assigns `detailView.innerHTML`, then runs existing post-render calls unchanged.

**Risk level:** **Medium-low** for a byte-identical move if `templateCtx` is complete and fragment helpers (`_edCard`, `_edSectionHead`) are resolved from `window` in `template.js`.

**Defer:** Splitting the shell into hero/sidebar sub-builders (Option B) until after 5I.1 is live-QA’d.

---

## 1. Current `detail.js` inventory (post–5H.6.4)

**File:** `js/portal/events/detail.js` (~**554** lines)

| Lines | Section | Responsibility |
| ---: | --- | --- |
| **14–22** | IIFE namespace | `PortalEvents.detail`, `detail.register` / `detail.get` |
| **30–34** | Fragment aliases | `_edMetaRow`, `_edPill`, `_edCard`, `_edNotice`, `_edSectionHead` ← `window.evtEd*` from `fragments.js` |
| **42–465** | **`async function evtOpenDetail(eventId)`** | Full open path |
| **43–44** | Context load | `await window.evtLoadDetailContext(eventId)`; early return |
| **46–93** | Destructure `ctx` | 40+ fields from `detail/data.js` (not all used in template) |
| **95–192** | **Pre-template assembly** | Section builder calls, `bannerBg`, ticket `qrHtml` + Supabase check-in fetch, dead `venueQrHtml` / `scannerBtn`, `descHtml`, cost collapsible wrapper |
| **198–199** | DOM target | `getElementById('eventsDetailView')`, `classList.add` |
| **200–438** | **Template shell** | `detailView.innerHTML = \`...\`` (~238 lines) |
| **440–464** | **Post-render delegation** | title/scroll/animations → `evtRunDetailPostRenderUi` → hero stub → `evtRunDetailPostRenderBasics` → `setTimeout` QR + maps |
| **474–475** | Hero collapse stubs | `evtInitHeroCollapse`, `evtCleanupHeroCollapse` (no-ops) |
| **480–551** | **Exports / bridges / register** | `window.evtOpenDetail`, `detail.*` bridges, `detail.register(...)` |

### What is **not** in `detail.js` anymore

- Section HTML bodies (`evtBuildDetail*Html`) → `detail/sections.js`
- Context fetch/derivation → `detail/data.js`
- Post-render hooks → `detail/post-render.js`
- Fullscreen overlay → `detail/map-overlay.js`
- Team Tools / Chat bodies → `team/tools.js`, `team/chat.js`

### Pre-template-only variables (stay in `detail.js` for 5I.1)

| Variable | Lines | In main template? | Notes |
| --- | ---: | --- | --- |
| `heroStatusBadgeHtml` | 99 | Yes (interpolated) | From sections |
| `bannerBg` | 102–104 | Yes (`style="${bannerBg}"`) | Built in `detail.js` |
| `transportContextHtml` | 106 | Indirect | Inside `eventContextHtml` |
| `locationReqHtml` | 107 | Yes (dynamic cards array) | |
| `qrHtml` | 109–137 | Yes (sidebar) | **Async Supabase** check-in fetch; HTML only here, canvas paint in post-render |
| `venueQrHtml` | 139–148 | **No** | Dead — not inserted |
| `scannerBtn` | 150–154 | **No** | Dead — not inserted |
| `costBreakdownHtml` | 156, 184–192 | Yes | **Bug:** `const` at 156 then reassigned at 186 if `rsvp_cost_cents` — fix to `let` in 5I.1 pre-template touch |
| `thresholdHtml` | 158 | Yes | Always `''` |
| `thresholdContextHtml`, `eventContextHtml` | 159–160 | Yes | |
| `waitlistHtml`, `graceHtml` | 162–163 | Yes | |
| `rsvpButtons`, `raffleHtml` | 165–166 | Yes | |
| `hostControlsHtml`, `attendeeBreakdownHtml` | 169, 167 | **No** | Dead — not inserted |
| `attendeePreviewHtml`, `shareCardHtml`, … | 170–177 | Yes | Section partials |
| `rawDesc`, `descHtml`, `descIsLong` | 180–182 | Yes | `evtMiniMarkdown` |

---

## 2. Template dependency inventory

### 2.1 `templateCtx` fields (recommended single object for 5I.1)

Build in `detail.js` immediately before `evtBuildDetailTemplate(templateCtx)`:

| Field | Source | Used in template for |
| --- | --- | --- |
| `event` | `ctx` | title, category, location, banner, gated notes, cancellation, coords |
| `eventId` | param / `ctx` | comments post button |
| `start` | `ctx` (`Date`) | `toLocaleDateString` in hero, qi-bar, sidebar |
| `timeStr` | `ctx` | hero, qi-bar, sidebar when `showTime` |
| `tc` | `ctx` | subtitle fallback (`tc.label`) |
| `cpName` | `ctx` | hosted-by copy |
| `showTime` | `ctx` | conditional time rows |
| `showLocation` | `ctx` | location rows, map cards |
| `showNotes` | `ctx` | gated notes card |
| `isPast`, `isClosed` | `ctx` | countdown card conditional |
| `deadlinePassed` | `ctx` | deadline banner |
| `rsvpEnabled` | `ctx` | sidebar RSVP card |
| `bannerBg` | pre-template | hero `style` |
| `heroStatusBadgeHtml` | sections | hero nav |
| `pageHeaderActionsHtml` | sections | page header |
| `mobileAttendeesHtml` | sections | main column |
| `mobileHostedHtml` | sections | main column |
| `descHtml`, `descIsLong` | pre-template | about card |
| `eventContextHtml` | pre-template | about context list |
| `attendeePreviewHtml` | sections | about grid |
| `organizerHtml` | sections | about right column |
| `waitlistHtml`, `thresholdHtml`, `costBreakdownHtml`, `locationReqHtml`, `graceHtml`, `raffleHtml`, `mapHtml`, `competitionHtml`, `scrapbookHtml` | sections / pre-template | dynamic `_edCard` strip |
| `relatedHtml` | sections | related events card |
| `rsvpButtons` | sections | sidebar RSVP |
| `teamHubCardHtml` | sections | sidebar |
| `qrHtml` | pre-template | sidebar ticket card |
| `documentsHtml` | `ctx` | sidebar docs |
| `shareCardHtml` | sections | sidebar share |

**Not required inside template function** (post-render only): `rsvp`, `myRaffleEntry`, `entriesClosed`, `eventIsFull`, `isHost`, `canAccessTeamHub`, `canCreateTeamChat`, `memberGoing`, `showLocation` (maps use post-render `setTimeout`).

**Destructured from `ctx` but unused in template or pre-template today:** `dateStr`, `endTimeStr`, `isLlc`, `isComp`, `goingList`, `maybeList`, `guestGoingList`, `checkins`, `checkinCount`, `costItems`, `waitlist`, `myWaitlistEntry`, `raffleEntryCount`, `myRaffleEntry`, `raffleWinners`, `isCreator`, `canManageEvent`, `canAccessTeamHub`, `isHost`, `canCreateTeamChat`, `creatorProfile`, `cpInitials`, `cpBadge`, `cpTitle`, `memberGoing`, `hasRsvp`, `canRsvp`, etc. — keep in `evtOpenDetail` for pre-template/ post-render; omit from `templateCtx` unless needed later.

### 2.2 Globals / helpers the template body calls

| Helper | Origin | Required in `template.js` |
| --- | --- | --- |
| `evtEscapeHtml(...)` | `utils.js` / global | `window.evtEscapeHtml` |
| `_edSectionHead(title)` | `fragments.js` | `window.evtEdSectionHead` or alias |
| `_edCard(inner, className)` | `fragments.js` | `window.evtEdCard` |
| `navigator.userAgent` | browser | Maps link URL choice (Apple vs Google) — **must remain in template literal** |
| `encodeURIComponent(event.location_text)` | — | Maps links |

### 2.3 Stable DOM IDs / hooks (must not change in 5I.1)

`#eventsDetailView` (outer — set on element before `innerHTML`), `#evtDescWrap`, `#detailEventMap`, `#detailEventMapMobile`, `#portalCommentsSection`, `#portalCommentsList`, `#portalCommentInput`, `#portalCommentSelfAvatar`, `#myTicketQR`, `#edCountdownCard`, `#edCdDays`…`#edCdSecs`, map overlay markup containers (empty divs only in template).

---

## 3. Inline handler inventory

### 3.1 Handlers in **template shell** (`detail.js` lines 200–438)

| Handler / pattern | Location | Notes |
| --- | --- | --- |
| `evtNavigateToList()` | Page header back, hero back pill | |
| `evtOpenLightbox('${event.banner_url}')` | Hero when `event.banner_url` | URL in attribute — preserve escaping behavior |
| `evtOpenFullscreenMap(lat, lng)` | Mobile qi-bar location column | Coords from `event` |
| Read-more toggle | Inline `onclick` on description button | `getElementById('evtDescWrap')` |
| `evtPostComment('${eventId}')` | Comments post button | |
| External maps `<a href="...">` | Mobile/desktop map overlays, sidebar | Not `onclick`; uses `navigator.userAgent` |

**Not in main template** but in **pre-template** strings inserted into template:

| Handler | Location |
| --- | --- |
| `this.classList.toggle('open')` | Cost breakdown collapsible wrapper (`detail.js` 187) |
| `evtOpenScanner('${eventId}')` | `scannerBtn` — **dead**, not rendered |

### 3.2 Handlers in **section partials** (injected via `${...}`; remain in `sections.js`)

These do **not** move with 5I.1; they ride inside HTML partials:

| Handler | Typical partial |
| --- | --- |
| `evtOpenTeamToolsPanel` | `teamHubCardHtml`, page header, organizer |
| `EventsManage.open` | `pageHeaderActionsHtml`, host controls (unused in template) |
| `evtHandleRsvp`, `evtMessageHost` | `rsvpButtons` |
| `evtHandleRaffleEntry`, `evtHandleFreeRaffleEntry` | `raffleHtml` |
| `evtUpdateStatus`, `evtCancelEvent`, `evtRescheduleEvent`, `evtDuplicateEvent`, `evtDeleteEvent` | `hostControlsHtml` (unused in template) |
| `evtClaimWaitlistSpot`, `evtLeaveWaitlist`, `evtJoinWaitlist` | `waitlistHtml` |
| `evtRequestGraceRefund` | `graceHtml` |
| `evtCopyShareUrl` | `pageHeaderActionsHtml`, `shareCardHtml` |
| `evtDownloadIcs` | `pageHeaderActionsHtml` |
| `evtNavigateToEvent`, `evtOpenDetail` | `relatedHtml` |
| `profile.html?id=` navigation | `organizerHtml`, `mobileHostedHtml` |
| Clipboard IIFE | `shareCardHtml` |

### 3.3 Handlers in **team/tools.js** CTA (post-render, not template)

`evtInitBottomNav`, `evtOpenCtaPanel`, `evtHandleRsvp`, `evtHandleRaffleEntry`, `evtCloseCtaPanel`, etc. — unchanged by 5I.

---

## 4. Proposed template extraction design

### Option A — Single `evtBuildDetailTemplate(templateCtx)` in `detail/template.js`

```javascript
function evtBuildDetailTemplate(templateCtx) {
  const _edCard = window.evtEdCard;
  const _edSectionHead = window.evtEdSectionHead;
  const { event, eventId, start, /* … */ } = templateCtx;
  return `<!-- identical markup -->`;
}
```

**Pros:** One PR, one live-QA gate, easiest diff review (move-only). Matches 5H.6 slice discipline.  
**Cons:** Large single file (~250 lines template); still acceptable as classic IIFE.

### Option B — Template.js + sub-builders (`buildHeroTemplate`, `buildSidebarTemplate`, …)

**Pros:** Smaller units for future edits.  
**Cons:** Multiple PRs or larger PR; higher risk of accidental markup drift between regions; harder “move-only” review.

### Option C — Defer template; refactor list/manage/create first

**Pros:** None for detail completion.  
**Cons:** Leaves `detail.js` orchestrator overweight; blocks thin orchestrator and Phase 5L prep.

---

## 5. Recommendation

**Adopt Option A for Phase 5I.1.**

`templateCtx` can be passed cleanly: all template interpolations are local variables or section partials already computed in `evtOpenDetail` before insert. No change to RSVP/raffle logic, data loading, or post-render timing.

**5I.1 is feasible and recommended** as the next implementation slice.

**Optional same-PR fix (low risk):** change `const costBreakdownHtml` → `let costBreakdownHtml` at line 156 before collapsible wrapper — pre-existing runtime bug when `event.rsvp_cost_cents` is set.

**Do not include in 5I.1:** removing dead `venueQrHtml` / `scannerBtn` / unused `hostControlsHtml` unless approved as separate cleanup PR.

---

## 6. Proposed 5I implementation plan

### 6.1 Phase 5I.1 — Mechanical template move (first slice)

| Item | Plan |
| --- | --- |
| **New file** | `js/portal/events/detail/template.js` (classic IIFE) |
| **Script order** | `…/detail/sections.js` → `post-render.js` → **`template.js`** → `detail.js` |
| **HTML change** | One new `<script src="../js/portal/events/detail/template.js"></script>` after `post-render.js`, before `detail.js` |
| **Export** | `window.evtBuildDetailTemplate = evtBuildDetailTemplate` |
| **Namespace** | `PortalEvents.detail.template = { build: evtBuildDetailTemplate }` |
| **Bridges** | `detail.template = …`, `detail.buildTemplate = window.evtBuildDetailTemplate` |
| **`detail.js`** | Build `templateCtx`; `detailView.innerHTML = window.evtBuildDetailTemplate(templateCtx)`; post-render unchanged |

### 6.2 Files to edit (5I.1)

| File | Change |
| --- | --- |
| `js/portal/events/detail/template.js` | **Create** — template literal only |
| `js/portal/events/detail.js` | Remove inline template; build `templateCtx`; delegate |
| `portal/events.html` | **One** classic script tag (implementation gate only) |
| `test/_smoke-phase5i-template-shell.js` | **Create** — load order, exports, delegation, no `innerHTML = \`` in `detail.js` |
| `test/_smoke-phase3b-detail-bridge.js` | Extend — template.js exists, `evtBuildDetailTemplate`, bridges |
| `test/_smoke-phase5h-detail-open-split.js` | Extend — orchestrator still owns `evtOpenDetail` |
| `test/_smoke-phase5h6-post-render-bridge.js` | Confirm post-render untouched |

### 6.3 No-go conditions (5I.1)

- Intentionally changing rendered HTML or CSS class names
- Renaming inline `onclick` handlers or DOM ids
- Changing RSVP/raffle/check-in business logic
- Moving post-render, data, or section code
- Starting Phase 5L / removing classic globals
- Compat / `window-exports` wiring
- More than one new script tag or reordering unrelated portal scripts
- Combining template move with list/manage/create refactors

### 6.4 Follow-on slices (after 5I.1 live QA)

| Slice | Scope |
| --- | --- |
| **5I.2** (optional) | Move `qrHtml` HTML builder to `template.js` or `sections.js` — only if desired; keeps async fetch in `detail.js` |
| **5I.3** (optional) | Pre-template cleanup: dead strings, `let costBreakdownHtml`, unused variables |
| **5J+** | Thin orchestrator comments only; compat wiring; Phase 5L last |

---

## 7. No-go criteria (program-wide)

Do **not** combine in one PR:

- Template shell extraction (5I)
- Compat / export wiring
- Phase 5L module entry
- Post-render moves (already done)
- Data/context moves (already done)
- List / manage / create refactors

---

## 8. Required tests

### Existing gate (must pass after 5I.1)

```bash
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3b-detail-bridge.js
node test/_smoke-phase5h-detail-open-split.js
node test/_smoke-phase5h6-post-render-bridge.js
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

### Recommended new smoke: `test/_smoke-phase5i-template-shell.js`

| Check | Purpose |
| --- | --- |
| `detail/template.js` exists; classic IIFE; no `export` | File shape |
| `function evtBuildDetailTemplate` | API |
| `window.evtBuildDetailTemplate` + `PortalEvents.detail.template.build` | Globals |
| `portal/events.html` order: `post-render.js` → `template.js` → `detail.js` | Load order |
| `detail.js` calls `evtBuildDetailTemplate` | Delegation |
| `detail.js` does **not** contain `detailView.innerHTML = \`` | Template moved |
| `detail.js` still has `async function evtOpenDetail` | Orchestrator |
| `template.js` contains stable ids: `detailEventMap`, `portalCommentsList`, `edCountdownCard`, `myTicketQR` | DOM contract |
| No `type="module"`; `init.js` last | Phase 5L guard |

---

## 9. Live QA plan (post–5I.1)

**Test event:** `yolanda-adam-and-justin-birthday-celebration-mov3ceo1`  
**Paths:** admin/coordinator + member regression

| Area | Checks |
| --- | --- |
| **Assets** | `template.js` HTTP 200; script order; live `detail.js` delegates |
| **Layout** | Detail opens; desktop two-column + mobile qi-bar/cards |
| **Hero** | Banner/lightbox (`evtOpenLightbox`); back navigation |
| **RSVP / raffle** | Sidebar + main raffle section; CTA bar actions |
| **Team** | Team Tools + Team Chat; single CTA bar on load |
| **Comments / avatars** | Discussion loads; stacks paint |
| **QR** | No errors on ineligible path; eligible path data-dependent |
| **Maps** | Inline desktop + mobile tiles; fullscreen overlay (programmatic OK) |
| **Countdown** | Sidebar digits update |
| **Member** | No Team button; CTA/RSVP/raffle for account state |
| **Regression** | No console/network errors; no duplicate CTA overlays |

**Known automation caveats** (not 5I regressions): Manage sheet detect flaky; fullscreen map click flaky; QR canvas needs eligible account; CTA bar removed after floating-shell close.

---

## 10. Final go / no-go

| Decision | Outcome |
| --- | --- |
| **Start 5I implementation?** | **YES** — after this audit is committed and approved |
| **First slice** | **5I.1** — single `evtBuildDetailTemplate(templateCtx)` mechanical move + one script tag + new smoke |
| **Blocked until 5I.1 done** | Compat wiring, Phase 5L, template sub-split (Option B), list/manage/create refactors |
| **Highest-risk dependencies** | See below |

### Highest-risk dependencies

| Risk | Mitigation |
| --- | --- |
| Incomplete `templateCtx` | Checklist in §2.1; copy destructuring block verbatim into builder call |
| `const costBreakdownHtml` reassignment | Use `let` in same PR (one-line fix) |
| Fragment helpers in closure | Bind `window.evtEdCard` / `window.evtEdSectionHead` inside `template.js` |
| `navigator.userAgent` in template | Keep expressions inside moved literal unchanged |
| `start` Date formatting | Pass `start` on `templateCtx` as live `Date` |
| Section partials with embedded handlers | Do not regenerate partials — only move shell |
| Script load order | `template.js` after `post-render.js`, before `detail.js` |

---

## Appendix — Current detail module graph

```text
data.js          → evtLoadDetailContext
sections.js      → evtBuildDetail*Html (18 builders)
post-render.js   → evtRunDetailPostRenderBasics | renderQrCanvases | initInlineMaps | runUi
template.js      → (planned) evtBuildDetailTemplate
detail.js        → evtOpenDetail orchestrator
presentation.js  → markdown, lightbox, animations
map-overlay.js   → fullscreen map
fragments.js     → _ed* helpers
team/tools.js    → CTA / Team Tools
team/chat.js     → Team Chat
```

**Checkpoint chain:** 5H complete (`027`, `029`) → **5I audit (this doc)** → **5I.1 implementation** → live QA → optional 5I.2/5I.3 cleanup → compat → Phase 5L.
