# Events Refactor — Phase 5G `evtOpenDetail()` Split Audit

**Document:** `026_phase_5g_evt_open_detail_split_audit.md`  
**Date:** 2026-05-21  
**Status:** Audit / planning only — **no runtime changes**  
**Baseline:** `detail.js` after Phase 5F-prep (`22a2a23` live-verified)  
**Related:** `025_phase_5_remaining_refactor_completion_roadmap.md`, `021_phase_5d_detail_split_plan.md`  
**Scope:** Portal Events `async function evtOpenDetail()` in `js/portal/events/detail.js`  
**Out of scope:** Phase 5H implementation, `portal/events.html` edits, `js/events/**`, schema/RLS, Phase 5L module entry

---

## Executive summary

`evtOpenDetail()` spans **lines 39–1062** (~**1,024 lines**) in `detail.js` — the largest remaining monolith in the portal Events detail stack. It mixes **Supabase I/O**, **derived permission/state flags**, **~30+ inline `onclick` handlers**, a **~280-line main template string**, and **post-render DOM hooks** (Team Tools context, comments, avatars, QR, Leaflet).

**Recommendation:** **Proceed to Phase 5H incrementally (Option C)** — **not** a single-file move. **First slice: 5H.1 data loader only** (`detail/data.js`) returning an explicit context object; keep all HTML assembly in `detail.js` until 5H.2.

**Do not** defer entirely to list/manage/create unless 5H.1 proves infeasible in review (unlikely).

---

## 1. Current `evtOpenDetail()` inventory

**File:** `js/portal/events/detail.js`  
**Function:** `async function evtOpenDetail(eventId)` — **39–1062**  
**Remaining in `detail.js` outside function:** namespace/registry (14–31), fragment aliases (27–31), exports/bridges (1064–1137)

### Section map (post–5F-prep line numbers)

| Lines | Section | Responsibility |
| ---: | --- | --- |
| **39–53** | Event lookup + date setup | Resolve `event` from `evtAllEvents`; `rsvp`; locale date/time strings; `TYPE_COLORS`; `isLlc` / `isComp` |
| **55–121** | Core Supabase fetches | `event_rsvps`, `event_guest_rsvps`, `event_checkins`, LLC `event_cost_items`, `event_waitlist`, raffle entries/winners |
| **123–153** | Host/creator resolution | `event_hosts`, creator `profiles` fetch; `canManageEvent`, `canAccessTeamHub`, `isHost`; creator display fields |
| **159–177** | Submodule HTML + gates | `await evtBuildDocumentsHtml`, `evtBuildMapHtml`, competition/scrapbook; `showTime/Location/Notes`; time locks (`entriesClosed`, `canRsvp`, `eventIsFull`) |
| **179–195** | Hero status badge | Countdown label / CSS class for hero pill |
| **197–213** | Banner + context notices | `bannerBg`; LLC transport copy; location-required `_edNotice` |
| **215–243** | Attendee ticket QR block | Conditional check-in query; QR canvas HTML |
| **245–254** | Venue QR (host) | Host venue scan canvas placeholder |
| **256–260** | Scanner button HTML | `evtOpenScanner` inline button |
| **262–302** | LLC cost breakdown | Cost item rows, pills, section head, totals |
| **304–325** | Threshold / social proof | LLC min-participants messaging |
| **327–361** | Waitlist UI | Join/leave/claim waitlist HTML + section head |
| **363–375** | Grace window | Reschedule refund notice |
| **377–445** | RSVP card HTML | Host/member/paid/free/closed states; Team + Manage buttons |
| **447–499** | Raffle section HTML | Prize/winner rails via raffle-render helpers; entry/locked buttons |
| **501–508** | `buildPersonRow` (nested) | Avatar row helper for host breakdown |
| **510–538** | Attendee breakdown (host) | Going / interested / checked-in lists |
| **540–560** | Host controls | Publish/complete/cancel/reschedule/duplicate/delete; Manage sheet |
| **562–584** | Attendee preview | `_edAvatarData` seed; avatar stack placeholders |
| **586–662** | Pre-template assembly | Description markdown; organizer; team hub card; related events; cost toggle wrap |
| **668–951** | **Main template string** | `detailView.innerHTML = \`...\`` — hero, layout, sidebar, cards, comments shell, share row |
| **953–1061** | **Post-render hooks** | Title/scroll; animations; sidebar countdown; `__evtTeamToolsCtx`; bottom nav; comments; avatar paint; QR + inline maps |

### Size summary

| Metric | Value |
| --- | --- |
| `detail.js` total | ~1,134 lines |
| `evtOpenDetail` body | ~1,024 lines (~90% of file) |
| Main `innerHTML` template | ~668–951 (~283 lines) |
| Supabase query block | ~55–153 + nested QR query ~220–225 |

### Already extracted (used by `evtOpenDetail`, not in function body)

| Module | Role |
| --- | --- |
| `detail/fragments.js` | `_edMetaRow` … `_edSectionHead` via `window.evtEd*` aliases |
| `detail/presentation.js` | `evtMiniMarkdown`, `evtInitSectionAnimations`, `evtOpenLightbox` |
| `detail/raffle-render.js` | Raffle prize/winner/locked HTML |
| `detail/map-overlay.js` | `evtOpenFullscreenMap` (inline + Leaflet click) |
| `team/tools.js` | `evtInitBottomNav`, `evtOpenTeamToolsPanel` |
| `team/chat.js` | (indirect via Team Tools) |
| `documents.js`, `map.js`, `competition.js`, `scrapbook.js` | `evtBuild*Html` async/sync builders |
| `rsvp.js`, `raffle.js` | Handlers referenced in inline HTML (`evtHandleRsvp`, etc.) |

---

## 2. Dependency graph

Legend: **H** = required at runtime, **S** = guarded/`typeof` check, **I** = inline HTML needs `window.*` at click time, **A** = async/await

### Global / environment dependencies (whole function)

| Symbol | Source | Usage |
| --- | --- | --- |
| `evtAllEvents` / `window.evtAllEvents` | `state.js` / list load | Event lookup **H** |
| `evtAllRsvps` / `window.evtAllRsvps` | `state.js` | RSVP map **H** |
| `evtCurrentUser` | `state.js` (lexical global) | All permission + raffle/waitlist queries **H** |
| `supabaseClient` | `config.js` | All Supabase calls **H** |
| `canManageEvents` | `js/auth/shared.js` | Host/admin checks **S** |
| `canAccessAdminDashboard` | auth shared | Team hub access **S** |
| `evtIsGoingRsvp` | `rsvp.js` | Going/member flags **S** |
| `evtIsRaffleBundledWithPaidRsvp` | `rsvp.js` | Raffle bundled UI **S** |
| `evtCanEnterMemberRaffle` | `rsvp.js` | **Not called inside `evtOpenDetail` today** — used elsewhere (CTA/team) |
| `evtCurrentEvent` | — | **Not referenced in `detail.js`** |
| `TYPE_COLORS` | `constants.js` | Event type styling **H** |
| `formatCurrency` | utils/helpers | LLC/RSVP/raffle display **H** |
| `evtEscapeHtml` | `utils.js` | All user text in HTML **H** |
| `evtBadgeChip` | utils/helpers | Creator badge **S** |
| `window.evtEd*` | `detail/fragments.js` | Fragment HTML **H** (load order) |
| `window.evtMiniMarkdown` | presentation | Description **H** |
| `window.evtDetailRaffle*` | raffle-render | Raffle section **H** |
| `window.evtRaffleLockedDesktopHtml` | raffle-render | Locked raffle **H** |
| `window.evtInitSectionAnimations` | presentation | Post-render **H** |
| `window.evtInitBottomNav` | team/tools | Post-render **S** |
| `window.evtOpenFullscreenMap` | map-overlay | Map click **H** (post-render JS, not inline) |
| `evtBuildDocumentsHtml` | documents.js | Sidebar card **A** |
| `evtBuildMapHtml` | map.js | Sidebar card **S** |
| `evtBuildCompetitionHtml` | competition.js | Competition events **A** |
| `evtBuildScrapbookHtml` | scrapbook.js | Scrapbook card **S** |
| `evtLoadComments` | comments.js | Post-render **H** |
| `EventsManage` / `window.EventsManage` | manage/sheet.js | Manage buttons **I** |
| `EventsCard` | components | **Not used in `evtOpenDetail`** |
| `QRCode` | CDN | Ticket QR canvas **S** (post-render) |
| `L` (Leaflet) | CDN | Inline maps **S** (post-render) |
| `document`, `window` | DOM | Mount + hooks **H** |

### Per-section dependency notes

| Section | Key deps beyond globals |
| --- | --- |
| Data fetch (55–153) | Tables: `event_rsvps`, `event_guest_rsvps`, `event_checkins`, `event_cost_items`, `event_waitlist`, `event_raffle_entries`, `event_raffle_winners`, `event_hosts`, `profiles` |
| Submodule builds (161–164) | Must complete **before** gate flags if builders need `hasRsvp`/`isHost` |
| RSVP HTML (377–445) | `evtHandleRsvp`, `evtOpenTeamToolsPanel`, `EventsManage.open` **I** |
| Raffle HTML (447–499) | `evtHandleRaffleEntry`, `evtHandleFreeRaffleEntry` **I**; locked HTML may embed `evtOpenTeamToolsPanel` **I** |
| Host controls (540–560) | `evtUpdateStatus`, `evtCancelEvent`, `evtRescheduleEvent`, `evtDuplicateEvent`, `evtDeleteEvent`, `EventsManage.open` **I** |
| Template (668–951) | Navigation: `evtNavigateToList`, `evtCopyShareUrl`, `evtDownloadIcs`; `evtOpenLightbox`, `evtOpenFullscreenMap` **I**; `evtPostComment` **I**; `evtNavigateToEvent`, `evtOpenDetail` **I** |
| Post-render (953–1061) | `window.__evtTeamToolsCtx`; `_edAvatarData`; `evtInitHeroCollapse` no-op |

### Script load order constraint (today)

```text
… → detail/fragments.js → detail.js → comments.js → rsvp.js → … → init.js
```

`evtHandleRsvp` is defined in `rsvp.js` **after** `detail.js` — safe because handlers bind at click time; `detail.register('rsvp', …)` uses lazy `() => window.evtHandleRsvp`.

Any new `detail/data.js` must load **after** `utils.js` + `state.js` + auth globals, **before** `detail.js`.

---

## 3. Inline handler inventory

All handlers below must remain on `window` (or `window.EventsManage`) with **identical names** through any split.

### RSVP / waitlist / grace

| Handler | Where used |
| --- | --- |
| `evtHandleRsvp` | RSVP primary/update/interested buttons |
| `evtMessageHost` | Paid/free RSVP rows |
| `evtJoinWaitlist` | LLC full event |
| `evtLeaveWaitlist` | Waitlist row |
| `evtClaimWaitlistSpot` | Waitlist offer |
| `evtRequestGraceRefund` | Rescheduled grace |

### Team / manage / scanner

| Handler | Where used |
| --- | --- |
| `evtOpenTeamToolsPanel` | Host RSVP row, team hub card |
| `window.EventsManage.open(...)` | Host Manage Event button; host Manage event gear |
| `evtOpenScanner` | Host scanner button |

### Raffle

| Handler | Where used |
| --- | --- |
| `evtHandleRaffleEntry` | Paid raffle entry (desktop) |
| `evtHandleFreeRaffleEntry` | Free raffle entry (desktop) |
| *(via `evtRaffleLockedDesktopHtml`)* | `evtOpenTeamToolsPanel` in locked block — **defined in raffle-render.js** |

### Host lifecycle

| Handler | Where used |
| --- | --- |
| `evtUpdateStatus` | Publish / complete |
| `evtCancelEvent` | Host dropdown |
| `evtRescheduleEvent` | LLC reschedule |
| `evtDuplicateEvent` | Host dropdown |
| `evtDeleteEvent` | Admin/coordinator delete |

### Navigation / media / comments

| Handler | Where used |
| --- | --- |
| `evtNavigateToList` | Header + hero back |
| `evtNavigateToEvent` | Related event cards (slug) |
| `evtOpenDetail` | Related event cards (id fallback) |
| `evtCopyShareUrl` | Header share |
| `evtDownloadIcs` | Calendar/bookmark buttons |
| `evtOpenLightbox` | Hero banner click |
| `evtOpenFullscreenMap` | Quick-info location column **I**; map Leaflet uses `window.evtOpenFullscreenMap` in JS |
| `evtPostComment` | Comments post button |

### Non-global / DOM-only (lower risk)

| Pattern | Notes |
| --- | --- |
| `onclick="this.classList.toggle..."` | Cost breakdown toggle |
| Read-more description toggle | Inline DOM only |
| Share copy IIFE | `navigator.clipboard` |
| `window.location.href='profile.html?id=...'` | Organizer / avatar clicks |
| Host dropdown fallback | `this.nextElementSibling.classList.toggle('open')` when no `EventsManage` |

**Count:** ~**25 distinct `window.evt*` / `EventsManage` handler names** embedded in template strings (plus self-navigation `evtOpenDetail`).

---

## 4. Proposed split options

### Option A — data / render / post-render (+ orchestrator)

| File | Role |
| --- | --- |
| `detail/data.js` | Async fetch + derived flags → `DetailContext` object |
| `detail/render.js` | HTML section builders + main template from context |
| `detail/post-render.js` | DOM mount side effects, timers, maps, QR |
| `detail.js` | Thin `evtOpenDetail`: `ctx = await load(); html = render(ctx); mount(ctx, html); postRender(ctx)` |

| Pros | Cons |
| --- | --- |
| Clear boundaries | 3 new scripts + HTML order |
| Matches roadmap 5H.1–5H.4 | Render still huge initially |
| Testable data layer | Context object design must be stable |

**Risk:** Medium–high (manageable if phased 5H.1→5H.4)

---

### Option B — single `detail/open.js`

Move ~1,000 lines to one new file; `detail.js` keeps registry/exports only.

| Pros | Cons |
| --- | --- |
| One new script tag | Still a monolith |
| Minimal orchestration | Hard to review/test |
| | Does not reduce complexity |

**Risk:** Medium blast radius, **low structural benefit** — **not recommended**

---

### Option C — incremental slices (recommended)

| Phase | Extract | Leave in `detail.js` |
| --- | --- | --- |
| **5H.1** | Supabase + permissions + flags → `detail/data.js` | All HTML + post-render |
| **5H.2** | Section HTML builders → `detail/render-sections.js` or split by domain | Template glue + post-render |
| **5H.3** | Post-render → `detail/post-render.js` | Orchestrator only |
| **5H.4** | Main template + thin orchestrator | Registry/exports |

| Pros | Cons |
| --- | --- |
| Smallest PRs | Longer calendar |
| Rollback per slice | Temporary cross-file coupling via context |
| Matches successful 5D/5F pattern | Needs discipline on context shape |

**Risk:** Low per slice if gates enforced — **recommended**

---

### Option D — defer split; refactor list/manage/create first

| Pros | Cons |
| --- | --- |
| `list.js` (~2,978 lines) is larger | Detail remains highest interaction/parity risk |
| Lower user-facing regression on list | Inline handler density highest in detail |
| | 5F-prep specifically unblocks detail split |

**Risk:** Avoids 5H but **does not reduce detail debt** — valid only if pausing detail work entirely

---

## 5. Recommendation

**Primary:** **Option C — incremental**, starting with **5H.1 data extraction only**.

**Rationale:**

1. **5F-prep (`fragments.js`) is done** — shared HTML composers no longer block a data/render boundary.
2. **Data block (55–177)** has the clearest boundary: async I/O + derived booleans, **no inline HTML** except through submodule `await evtBuild*Html` calls.
3. **Do not move template strings in 5H.1** — preserves all inline handlers verbatim in `detail.js`.
4. **Do not use Option B** — replaces one monolith with another.
5. **Option D** is a fallback if 5H.1 review finds context object too entangled; audit finds entanglement is **manageable** with explicit `DetailContext`.

**5H.1 design sketch (for implementation plan, not code now):**

```javascript
// detail/data.js — exports window.evtLoadDetailContext (name TBD)
async function evtLoadDetailContext(eventId) {
  // returns { event, eventId, rsvp, lists, flags, submoduleHtml, creatorProfile, ... }
}
// detail.js evtOpenDetail:
const ctx = await window.evtLoadDetailContext(eventId);
if (!ctx) return;
// existing HTML sections read from ctx instead of locals
```

Use **`window.evtLoadDetailContext`** + `PortalEvents.detail.data.load` mirror (match existing export pattern).

---

## 6. Proposed Phase 5H sequence

### 5H.1 — Extract detail data loader

| Item | Detail |
| --- | --- |
| **Creates** | `js/portal/events/detail/data.js` |
| **Edits** | `detail.js` (replace fetch block with context call); `portal/events.html` (+1 script after `fragments.js`); `_smoke-phase3b-detail-bridge.js`; new `_smoke-phase5h-detail-open-split.js` |
| **Risk** | **Medium** |
| **HTML order** | `… → fragments.js → **data.js** → detail.js` |
| **Tests** | phase1, phase3b, team tools/chat, raffle parity + **phase5h** |
| **Manual QA** | Open detail (member + host); LLC + member events; raffle enabled; documents/map cards appear |
| **Rollback** | Revert data.js + script tag; inline fetches back into `detail.js` |

---

### 5H.2 — Extract template section builders

| Item | Detail |
| --- | --- |
| **Creates** | `detail/render-sections.js` (or `detail/render.js` partial) |
| **Moves** | RSVP block, raffle block, host controls, LLC blocks, hero preamble — **not** main layout template yet |
| **Risk** | **High** |
| **Tests** | All 5H.1 + expanded phase5h inline handler grep |
| **Manual QA** | Full RSVP matrix; host dropdown; waitlist; grace |
| **Rollback** | Revert render file; sections back in `detail.js` |

---

### 5H.3 — Extract post-render hooks

| Item | Detail |
| --- | --- |
| **Creates** | `detail/post-render.js` |
| **Moves** | Lines ~953–1061: countdown, Team Tools ctx, bottom nav, comments, avatars, QR, Leaflet |
| **Risk** | **Medium–high** (timing-sensitive `setTimeout`) |
| **Tests** | phase5h + map overlay live check |
| **Manual QA** | QR ticket, inline map, Team Tools CTA, comments load, avatar stack resize |
| **Rollback** | Revert post-render file |

---

### 5H.4 — Thin orchestrator + main template

| Item | Detail |
| --- | --- |
| **Creates** | Optional `detail/render-layout.js` for giant `innerHTML` template |
| **Leaves in `detail.js`** | Registry, exports, `evtOpenDetail` ~30-line orchestrator |
| **Risk** | **High** (largest template move) |
| **Tests** | Full smoke battery + live globals verifier |
| **Manual QA** | Full checklist §9 |
| **Rollback** | Revert layout split; keep 5H.1–5H.3 if already stable |

**Do not combine 5H.2 + 5H.3 + 5H.4 in one PR.**

---

## 7. No-go criteria

Stop and revert if any of the following occur during Phase 5H:

| # | Condition |
| --- | --- |
| 1 | **Inline handler renamed** or moved to module-only export without `window.*` |
| 2 | **RSVP/raffle parity broken** — `_smoke-portal-event-raffle-rsvp-parity.js` fails |
| 3 | **Multiple concerns in one PR** (e.g. data + template + post-render together) |
| 4 | **`_smoke-phase3b-detail-bridge.js` fails** on `master` after merge |
| 5 | **Live globals verifier** missing `window.evtOpenDetail`, `PortalEvents.detail.open`, or raffle/RSVP handlers |
| 6 | **`portal/events.html` script order** breaks lazy registry (e.g. `data.js` after `detail.js`) |
| 7 | **Touching `js/events/**`** (public pages) or **Supabase schema/RLS** for refactor-only work |
| 8 | **Changing `evtBuild*Html` contracts** without updating documents/map/competition/scrapbook smokes |
| 9 | **Removing `window.__evtTeamToolsCtx`** or altering shape without updating `team/tools.js` |

---

## 8. Required tests

### Minimum gate (every 5H PR)

```bash
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3b-detail-bridge.js
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

### Recommended new smoke: `test/_smoke-phase5h-detail-open-split.js`

Assert:

- `detail/data.js` (after 5H.1) exists and is in `portal/events.html` when present on disk
- Load order: `fragments.js → data.js → detail.js` (extend as render/post-render files appear)
- `detail.js` contains `async function evtOpenDetail` but **not** reimplemented fetch helpers (`from('event_rsvps')` count drops or moves to data.js)
- No duplicate `evtOpenDetail` definitions across files
- All inline handler names from §3 still present in source (grep inventory)
- `window.evtOpenDetail` still assigned from `detail.js`
- No `type="module"` on portal Events scripts

### Optional per phase

| Phase | Extra |
| --- | --- |
| 5H.1 | Grep: Supabase table names only in `data.js` |
| 5H.3 | Assert post-render `setTimeout` for maps still in one file |
| 5H.4 | `node test/_verify-events-live-globals.js` on staging |

---

## 9. Live QA plan

Run on **staging/production** after each 5H slice deploy. Minimum event: birthday slug (`yolanda-adam-and-justin-birthday-celebration-mov3ceo1`); add LLC event for waitlist/cost if available.

| Area | Steps |
| --- | --- |
| **Detail open** | URL `?event={slug}`; list card → detail |
| **Member RSVP** | Not going → RSVP → going; interested toggle |
| **Raffle parity** | Before RSVP: locked desktop + Team hint; after RSVP: entry CTA / free entry |
| **Host/coordinator** | Team Tools → RSVP self, raffle, ticket; Team Chat send |
| **Map overlay** | Inline map → fullscreen → recenter → close |
| **Comments** | Thread loads; post comment |
| **Ticket/QR** | Attendee ticket event: QR canvas renders (if test data) |
| **Documents** | Gated docs card visible when configured |
| **Competition** | Open competition-type event if exists |
| **Scanner/manage** | Host: scanner button; Manage sheet opens via `EventsManage` |
| **Related events** | Card navigates (`evtNavigateToEvent` / `evtOpenDetail`) |
| **Console/network** | No 404 on new `detail/*` scripts; no uncaught errors |

Credentials: `.env.local` E2E coordinator + member (do not log passwords).

---

## 10. Final go / no-go

| Question | Decision |
| --- | --- |
| **Should Phase 5H start?** | **Yes — but 5H.1 only first**, after this audit is committed and reviewed |
| **First implementation slice** | **`detail/data.js`** — async context loader; **no HTML moves** |
| **Defer to list/manage/create?** | **No** — detail data split is the correct next step per roadmap |
| **Start 5H in same PR as this audit?** | **No** — audit doc only (Phase 5G) |

### Phase 5G sign-off

| Gate | Status |
| --- | --- |
| `evtOpenDetail` inventoried | **Yes** (§1) |
| Dependency graph documented | **Yes** (§2) |
| Inline handlers catalogued | **Yes** (§3) |
| Split options compared | **Yes** (§4) |
| 5H micro-sequence defined | **Yes** (§6) |
| Runtime code changed | **No** (intentional) |

**Phase 5G: COMPLETE (audit). Phase 5H: APPROVED TO PLAN — implement 5H.1 only when explicitly gated.**

---

## 11. Related documents

| Doc | Role |
| --- | --- |
| `025_phase_5_remaining_refactor_completion_roadmap.md` | Full program through 5L |
| `021_phase_5d_detail_split_plan.md` | Original subsection table (line numbers outdated — use §1 here) |
| `022_phase_5d_completion_status.md` | 5D live sign-off |
| `024_phase_5e_checkpoint_status.md` | Pause checkpoint before 5G |

---

## Appendix — Current detail script slice

```text
team/chat.js
team/tools.js
detail/presentation.js
detail/raffle-render.js
detail/map-overlay.js
detail/fragments.js    ← 5F-prep (22a2a23)
detail.js              ← evtOpenDetail + exports
```

**Proposed after 5H.1:**

```text
… → detail/fragments.js → detail/data.js → detail.js → …
```
