# Events Refactor — Phase 5D Detail Split Plan (Micro-Audit)

**Document:** `021_phase_5d_detail_split_plan.md`  
**Date:** 2026-05-21  
**Status:** Planning / audit only — **no runtime changes**  
**Baseline:** `detail.js` ≈ **1,338 lines** after Phase 5B (`team/chat.js`) and 5C (`team/tools.js`), commit `20e990a` verified on live  
**Scope:** Portal Events `js/portal/events/detail.js` and proposed `js/portal/events/detail/*` classic scripts  
**Out of scope:** `portal/events.html` edits (until implementation gate), `supabase/**`, `admin/**`, `js/events/**`, `css/**`, Phase 5F module entry

---

## Executive summary

Phase 5D continues shrinking `detail.js` by extracting **self-contained classic-script modules** loaded **after** `team/tools.js` and **before** `detail.js`. The main `evtOpenDetail` render/data-fetch block (~1,020 lines) stays in `detail.js` for this phase.

**Recommended first implementation (5D.1):** `js/portal/events/detail/presentation.js` — mini-markdown, banner lightbox, section fade-in observer, hero status countdown.

**Recommended second implementation (5D.2):** `js/portal/events/detail/raffle-render.js` — raffle prize/winner HTML helpers + `evtRaffleLockedDesktopHtml` (parity-gated).

**Defer:** `evtOpenDetail` render split (Option E) until team + presentation + raffle slices are stable.

**Go / no-go:** **GO** for Phase 5D.1 implementation planning; **no-go** for touching `evtOpenDetail` body in the first PR.

---

## 1. Current `detail.js` inventory (post 5B / 5C)

File: `js/portal/events/detail.js` — single IIFE, classic script, `PortalEvents.detail` namespace + sub-registry.

| Lines (approx.) | Section | Responsibility |
| --- | --- | --- |
| 1–13 | Header comment | M2 refactor notes |
| 14–22 | Namespace bootstrap | `PortalEvents.detail`, `_registry`, `register`, `get` |
| 24–32 | `evtMiniMarkdown` | Inline markdown → HTML (`evtEscapeHtml`, links, bold, italic) |
| 34–43 | `evtOpenLightbox` | Banner full-screen lightbox DOM |
| 45–53 | `evtInitSectionAnimations` | IntersectionObserver on `.ed-card` |
| 55–89 | `evtStartLiveCountdown` | Hero `.evt-status-badge` ticker (`_evtCountdownInterval`) |
| 91–123 | `_edMetaRow`, `_edPill`, `_edCard`, `_edNotice`, `_edSectionHead` | Small HTML fragment composers (used heavily inside `evtOpenDetail`) |
| 125–188 | Raffle render helpers | `evtDetailRaffleConfig` … `evtDetailRaffleWinnersHtml` — v2 prize rail + winner rail |
| 190–192 | Section divider | Comment before main render |
| 194–1217 | **`async function evtOpenDetail`** | **Main detail pipeline** (see subsection table below) |
| 1219–1268 | Fullscreen map overlay | `evtOpenFullscreenMap`, `evtRecenterFullscreenMap`, `evtCloseFullscreenMap`; module state `_fullscreenMap` |
| 1270–1276 | Hero collapse stubs | `evtInitHeroCollapse` / `evtCleanupHeroCollapse` no-ops (external callers) |
| 1278 | Comment | Points to `team/tools.js` for CTA / Team Tools |
| 1280–1288 | `evtRaffleLockedDesktopHtml` | Desktop locked raffle CTA + Team hint (`onclick="evtOpenTeamToolsPanel(...)"`) |
| 1290–1327 | Public exports | `window.evt*` + `detail.*` mirrors (incl. raffle + team bridges) |
| 1328–1336 | `detail.register(...)` | Lazy refs to `evtHandleRsvp`, raffle, comments, documents, scrapbook, map, scanner |

### `evtOpenDetail` internal subsections (lines 194–1217)

| Lines (approx.) | Subsection | Responsibility |
| --- | --- | --- |
| 194–208 | Entry + date formatting | Resolve event from `evtAllEvents` / `evtAllRsvps`; locale strings; `TYPE_COLORS` |
| 210–318 | **Data fetching** | Supabase: RSVPs, guests, checkins, LLC cost items, waitlist, raffle entries/winners, host record, creator profile; sub-module HTML (`evtBuildDocumentsHtml`, `evtBuildMapHtml`, etc.) |
| 278–287 | Permissions | `evtCurrentUser`, `canManageEvents`, `canAccessAdminDashboard`, `isHost`, `canAccessTeamHub` |
| 314–332 | RSVP / gate flags | `evtIsGoingRsvp`, `memberGoing`, `showTime` / `showLocation` / `showNotes`, `entriesClosed`, `canRsvp`, `eventIsFull` |
| 338–370 | Hero badge + banner + transport + location notice | Status badge HTML; `bannerBg`; LLC transport copy |
| 370–516 | Ticket QR + costs + waitlist + grace | Attendee ticket QR block; LLC cost breakdown; waitlist UI; rescheduled grace refund |
| 532–600 | RSVP buttons HTML | Host Team/Manage rows; paid/free RSVP; closed states; inline `evtHandleRsvp`, `evtOpenTeamToolsPanel` |
| 602–654 | Raffle section assembly | Calls raffle helpers + `evtRaffleLockedDesktopHtml`; `evtHandleRaffleEntry` / `evtHandleFreeRaffleEntry` |
| 656–740 | Attendees + host controls | `buildPersonRow`; host breakdown; scanner/manage dropdown (`EventsManage`, `canManageEvents`) |
| 743–1106 | **Main template string** | Description (`evtMiniMarkdown`), related events, hero/desktop/mobile layout, sidebar cards, share row; inline `evtOpenLightbox`, `evtOpenFullscreenMap` |
| 1108–1135 | Post-render: title, scroll, animations, sidebar countdown | `evtInitSectionAnimations`; `#edCd*` interval + cleanup |
| 1137–1148 | Team Tools context + bottom nav | `window.__evtTeamToolsCtx`; `window.evtInitBottomNav(...)` |
| 1149–1191 | Comments + avatar stacks | `evtLoadComments`; `_edAvatarData` + ResizeObserver |
| 1193–1216 | Deferred QR + inline Leaflet maps | `QRCode.toCanvas`; `#detailEventMap` → `evtOpenFullscreenMap` |

### Already extracted (not in `detail.js`)

| File | Lines (approx.) | Role |
| --- | --- | --- |
| `team/chat.js` | ~500+ | Team Chat UI, Realtime, `evtOpenTeamChat`, `PortalEvents.team.chat` |
| `team/tools.js` | ~410+ | CTA bar, Team Tools panel, `evtOpenTeamToolsPanel`, `evtInitBottomNav`, `PortalEvents.team.tools` |

### `detail/` directory

**Does not exist yet.** Phase 5D creates `js/portal/events/detail/` with one or more classic IIFEs (same pattern as `team/`).

---

## 2. Dependency map by candidate

Legend: **H** = hard dependency (must load before use), **S** = soft (guarded `typeof` check), **I** = inline HTML `onclick` requires `window.*` at click time.

### Shared globals (all candidates)

| Symbol | Source | Used by |
| --- | --- | --- |
| `evtEscapeHtml` | `utils.js` (classic global) | Markdown, raffle HTML, map popup, most of `evtOpenDetail` |
| `window.PortalEvents` | `index.js` + feature IIFEs | Namespace assignment in each new file |
| `supabaseClient` | `config.js` | Only `evtOpenDetail` (+ extracted modules should not add new queries in 5D.1–5D.2) |

### Option A — Presentation utilities (`evtMiniMarkdown`, lightbox, animations, countdown)

| Dependency | Type | Notes |
| --- | --- | --- |
| `evtEscapeHtml` | H | From `utils.js` (already before `detail.js` in HTML) |
| `document`, `requestAnimationFrame` | H | DOM-only |
| `#eventsDetailView .ed-card` | S | Animations no-op if detail not mounted |
| `#eventsDetailView .evt-status-badge` | S | Countdown no-op if badge missing |
| `_evtCountdownInterval` | Internal | Module-scoped `var` in new file |
| `window.evtMiniMarkdown` | I | Description HTML built inside `evtOpenDetail` template |
| `window.evtOpenLightbox` | I | Hero `onclick="evtOpenLightbox('...')"` |
| `evtInitSectionAnimations` | Called from `evtOpenDetail` post-render | Not inline |
| `evtStartLiveCountdown` | Called from `evtOpenDetail` (hero badge path) | Verify call sites in render |
| `PortalEvents.detail.miniMarkdown` etc. | Export | Phase 3B smoke expects mirrors |

**Does not use:** `evtCurrentUser`, `EventsRaffleModel`, `evtHandleRsvp`, `evtOpenCtaPanel`, Supabase.

**Risk:** Low — no business logic, no RLS, no parity surface.

---

### Option B — Fullscreen map overlay

| Dependency | Type | Notes |
| --- | --- | --- |
| `#fullscreenMapOverlay`, `#fullscreenMapContainer`, `#fullscreenMapDirections` | H | Markup in `portal/events.html` |
| `L` (Leaflet) | H | CDN, loaded before portal scripts |
| `evtEscapeHtml` | H | Marker popup |
| `_fullscreenMap`, `_fullscreenMapCoords` | Internal | Module state |
| `window.evtOpenFullscreenMap` | I | Hero quick-info + inline map click in `evtOpenDetail` `setTimeout` |
| `window.evtRecenterFullscreenMap`, `window.evtCloseFullscreenMap` | I | Overlay buttons in HTML |
| `detail.openFullscreenMap` / `closeFullscreenMap` / `recenterFullscreenMap` | Export | phase3b smoke |

**Does not use:** Supabase directly.

**Risk:** Moderate — mobile overlay + Leaflet lifecycle; manual QA on tap-to-expand map.

---

### Option C — Raffle render helpers + locked desktop HTML

| Dependency | Type | Notes |
| --- | --- | --- |
| `window.EventsRaffleModel` | H (guarded) | `raffle-model.js` loads before `detail.js` |
| `evtEscapeHtml` | H | Tile/winner escaping |
| `_edSectionHead` | H | Used by `evtDetailRaffleWinnersHtml` — **move with raffle slice** or duplicate one-liner |
| `evtDetailRaffleConfig` … `evtDetailRaffleWinnersHtml` | Called from `evtOpenDetail` raffle block | Stay callable as `window.*` or `detail.*` |
| `evtRaffleLockedDesktopHtml` | Called from raffle block | References `evtOpenTeamToolsPanel` (I) — **team/tools.js must load first** |
| `evtHandleRaffleEntry`, `evtHandleFreeRaffleEntry` | I | Remain in `evtOpenDetail` HTML strings (not moved in 5D.2) |
| `window.evtIsGoingRsvp`, `memberGoing` | Used in `evtOpenDetail` only for raffle **assembly** | Helpers themselves only format data |

**Risk:** Medium — `_smoke-portal-event-raffle-rsvp-parity.js` and `_smoke-events-009-raffle-model.js` assert helper presence; locked UI copy ties to RSVP parity.

---

### Option D — Ticket / QR / gated content (inside `evtOpenDetail`)

| Dependency | Type | Notes |
| --- | --- | --- |
| `evtCurrentUser`, `rsvp`, `memberGoing` | H | QR fetch + display |
| `QRCode` (CDN) | H | `QRCode.toCanvas` in post-render `setTimeout` |
| `event.checkin_mode`, `gate_*` flags | H | Gated sections |
| `showTime` / `showLocation` / `showNotes` | H | Host vs member visibility |

**Risk:** Medium–high — recent RSVP/ticket parity work; tightly coupled to `evtOpenDetail` fetch and template.

**Recommendation:** Do **not** extract in first 5D PRs; optional later slice `detail/ticket.js` only with dedicated parity QA.

---

### Option E — Main `evtOpenDetail` render / data-fetch split

| Dependency | Type | Notes |
| --- | --- | --- |
| `evtAllEvents`, `evtAllRsvps` | H | Cache from `list.js` / `utils.js` |
| `evtCurrentUser` | H | Throughout fetch + permissions |
| `canManageEvents`, `canAccessAdminDashboard` | H | `auth/shared.js` |
| `evtIsGoingRsvp`, `evtIsRaffleBundledWithPaidRsvp` | H/S | `rsvp.js` |
| `TYPE_COLORS`, `CATEGORY_ICONS`, `formatCurrency`, `evtBadgeChip` | H | constants / utils |
| `evtBuildDocumentsHtml`, `evtBuildMapHtml`, `evtBuildCompetitionHtml`, `evtBuildScrapbookHtml` | H | Feature scripts |
| `evtLoadComments`, `evtInitBottomNav`, `evtOpenTeamToolsPanel` | H | comments.js, team/tools.js |
| `EventsManage`, `EventsCard` | S | Host manage / related cards |
| `detail.register` sub-modules | H | Registry must remain on `detail` object |
| All presentation + raffle + map helpers | H | Either pre-extracted or bridged |

**Risk:** High — largest blast radius; touches list routing, RSVP refresh, documents/competition rescrape.

**Recommendation:** **Defer** to Phase 5D-late or **5E** per user preference and `020` §6.

---

## 3. Candidate extraction comparison

| Option | Target | ~Lines removed | Risk | Parity / live QA | Line-impact |
| --- | --- | --- | --- | --- | --- |
| **A** | `detail/presentation.js` | ~65 | **Low** | phase3b + visual manual | Low–medium |
| **B** | `detail/map-overlay.js` | ~50 | **Moderate** | Map tap, directions link | Medium |
| **C** | `detail/raffle-render.js` | ~72 (+ `_edSectionHead` if bundled) | **Medium** | **Required:** raffle RSVP parity smoke | Medium–high |
| **D** | Ticket/QR block inside render | ~80+ (partial) | **Medium–high** | RSVP/ticket parity | Medium |
| **E** | `detail/render.js` (full `evtOpenDetail`) | ~1,020 | **High** | Full portal Events QA | **Very high** |

### Sequencing aligned with `020_phase_5_readiness_and_execution_plan.md` §6

| Step | Slice | Rationale |
| --- | --- | --- |
| **5D.1** | Option A → `detail/presentation.js` | Safest first PR; validates `detail/` folder + HTML script insertion pattern |
| **5D.2** | Option C → `detail/raffle-render.js` | Self-contained; matches original Phase 5D raffle plan; run parity smokes |
| **5D.3** | Option B → `detail/map-overlay.js` | Isolated Leaflet overlay |
| **5D.4+** | Option D (optional), then E | Only after smokes + live Team/RSVP QA green |

---

## 4. Recommendation

### Do not split `evtOpenDetail` first

The render function is the integration hub for Supabase fetches, permission gates, RSVP/raffle HTML assembly, sub-module builders, Team context, and post-render hooks. Extracting it first would recreate the Phase 5B/5C risk profile at larger scale.

### Safest first Phase 5D implementation: **Option A → `js/portal/events/detail/presentation.js`**

**Why:**

1. **Self-contained** — DOM utilities only; no Supabase, no coordinator permissions, no raffle parity.
2. **High confidence** — Live QA already green; changes are mechanical move + `window`/`detail` re-export from `detail.js` shim (same pattern as 5B/5C).
3. **Useful shrink** — ~65 lines (~5% of file) plus clears top-of-file clutter before harder slices.
4. **Preserves inline handlers** — `evtOpenLightbox` / `evtMiniMarkdown` stay on `window` for template strings.
5. **Low coupling** — `_edMetaRow` and render helpers remain in `detail.js` for the main template until a later phase.

### Second PR: **Option C → `js/portal/events/detail/raffle-render.js`**

Move:

- `evtDetailRaffleConfig` through `evtDetailRaffleWinnersHtml`
- `evtRaffleLockedDesktopHtml`
- `_edSectionHead` (only if not shared elsewhere — today used in winners + many `evtOpenDetail` blocks; **prefer keeping `_edSectionHead` in `detail.js` until render split**, and pass section head HTML into winners helper OR duplicate minimal wrapper in raffle file)

**Pragmatic approach for 5D.2:** Move `_edSectionHead` into `raffle-render.js` as a private helper **only used by raffle winners**; leave duplicate-free `_edSectionHead` in `detail.js` for main render (small duplication acceptable) **or** extract `detail/fragments.js` later for shared `_ed*` helpers.

---

## 5. Proposed target files

### 5D.1 (recommended first)

```text
js/portal/events/detail/presentation.js
```

**Contents:**

- `evtMiniMarkdown`
- `evtOpenLightbox`
- `evtInitSectionAnimations`
- `evtStartLiveCountdown` (+ module-scoped `_evtCountdownInterval`)
- `PortalEvents.detail.presentation` namespace (optional, mirrors `team.chat` pattern)
- Assign all `window.evt*` and `detail.miniMarkdown` / `detail.openLightbox` / `detail.initSectionAnimations` / `detail.startLiveCountdown`

### 5D.2 (second)

```text
js/portal/events/detail/raffle-render.js
```

**Contents:**

- Raffle config/HTML helpers (`evtDetailRaffle*` )
- `evtRaffleLockedDesktopHtml`
- `PortalEvents.detail.raffleRender` (optional)
- `detail.raffleConfig` … `detail.raffleWinnersHtml` mirrors

### 5D.3 (third)

```text
js/portal/events/detail/map-overlay.js
```

**Contents:**

- Fullscreen map trio + `_fullscreenMap` state

### Future (not 5D.1)

```text
js/portal/events/detail/render.js   # evtOpenDetail only — defer
js/portal/events/detail/fragments.js # shared _ed* helpers — optional before render split
```

### Proposed `portal/events.html` script order (implementation gate)

Insert new `detail/*.js` files **after** `team/tools.js`, **before** `detail.js`:

```html
<script src="../js/portal/events/team/chat.js"></script>
<script src="../js/portal/events/team/tools.js"></script>
<!-- 5D.1 --> <script src="../js/portal/events/detail/presentation.js"></script>
<!-- 5D.2 --> <script src="../js/portal/events/detail/raffle-render.js"></script>
<!-- 5D.3 --> <script src="../js/portal/events/detail/map-overlay.js"></script>
<script src="../js/portal/events/detail.js"></script>
…
<script src="../js/portal/events/init.js"></script>  <!-- still last among portal Events -->
```

Still **no** `type="module"` on portal Events scripts until Phase 5F.

---

## 6. Compatibility plan

### Must remain on `window` (inline handlers + cross-script)

| Global | After 5D.1 | After 5D.2 | Notes |
| --- | --- | --- | --- |
| `evtOpenDetail` | `detail.js` | `detail.js` | list/rsvp/competition call sites |
| `evtMiniMarkdown` | **presentation.js** | same | |
| `evtOpenLightbox` | **presentation.js** | same | |
| `evtInitSectionAnimations` | **presentation.js** | same | |
| `evtStartLiveCountdown` | **presentation.js** | same | |
| `evtOpenFullscreenMap` | `detail.js` → map file in 5D.3 | | |
| `evtRecenterFullscreenMap`, `evtCloseFullscreenMap` | same | | |
| `evtInitHeroCollapse`, `evtCleanupHeroCollapse` | `detail.js` | no-op stubs stay until callers removed |
| `evtOpenTeamToolsPanel`, `evtOpenTeamChat`, CTA helpers | `team/tools.js`, `team/chat.js` | unchanged |
| `evtHandleRsvp`, `evtHandleRaffleEntry`, etc. | `rsvp.js`, `raffle.js` | unchanged |

### Must remain on `PortalEvents.detail`

| Property | Owner after split |
| --- | --- |
| `detail.open` | `detail.js` |
| `detail.openLightbox`, `detail.miniMarkdown`, `detail.initSectionAnimations`, `detail.startLiveCountdown` | Bridge from `detail.js` or assign in presentation.js + re-bridge |
| `detail.raffleConfig` … `detail.raffleWinnersHtml` | raffle-render.js (5D.2) |
| `detail.openFullscreenMap` … | map-overlay.js (5D.3) |
| `detail.openTeamToolsPanel`, `detail.openTeamChat`, CTA bridges | Still `window` → `team/*` |
| `detail.register` / `detail.get` | **`detail.js` only** |
| `detail._registry` | **`detail.js` only** |

### `detail.js` shim pattern (same as 5B/5C)

After extraction, `detail.js` should:

- Keep IIFE + namespace bootstrap + `detail.register(...)` + **`evtOpenDetail`** body + thin assignments, e.g. `detail.openLightbox = window.evtOpenLightbox`.
- **Not** re-implement moved functions (smoke checks `!detailBody.includes('function evtOpenLightbox')` when enforced — update smokes per slice).

### Team Tools integration

- `window.__evtTeamToolsCtx` — stays in `evtOpenDetail` post-render (`detail.js`).
- `evtRaffleLockedDesktopHtml` — move to raffle-render in 5D.2; keep `onclick="evtOpenTeamToolsPanel(...)"` string.

---

## 7. Test plan

### Before any `portal/events.html` change

```bash
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3b-detail-bridge.js
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

Optional regression:

```bash
node test/_smoke-events-009-raffle-model.js
node test/_verify-events-live-globals.js   # after deploy
```

### Per-slice updates (implementation)

| Slice | Smoke / test updates |
| --- | --- |
| **5D.1 presentation** | Extend `_smoke-phase3b-detail-bridge.js`: expect helpers in `detail/presentation.js`; `detail.js` bridges only; HTML order `tools → presentation → detail` |
| **5D.2 raffle-render** | `_smoke-phase3b-detail-bridge.js`, `_smoke-events-009-raffle-model.js`, `_smoke-portal-event-raffle-rsvp-parity.js` paths |
| **5D.2** | Manual: locked raffle until RSVP; host Team hint; prize rail |
| **5D.3 map** | Manual: tap map → fullscreen → recenter → close |
| **All** | Re-run Team Tools + Team Chat smokes; optional `node test/_qa-event-team-chat-live.js` after deploy |

### After deploy (production)

- Open test event detail → banner lightbox → description formatting.
- Hero countdown / status badge (event not ended).
- Section fade-in on scroll.
- Team Tools + Chat regression (no duplicate CTA bars).
- Raffle parity (after 5D.2).

---

## 8. Go / no-go

| Question | Decision |
| --- | --- |
| Proceed with Phase 5D implementation? | **YES** — start with **5D.1 `detail/presentation.js`** |
| First extraction | **`js/portal/events/detail/presentation.js`** (Option A) |
| Defer `evtOpenDetail` split? | **YES** — not in first 5D PR |
| Safe to plan Phase 5E / 5F? | Plan only; do not start until 5D.1–5D.3 smokes + live QA pass |
| Ready to commit this audit doc? | **YES** (documentation only; user may commit when ready) |

### Implementation checklist (for next task — not this audit)

1. Add `detail/presentation.js` classic IIFE; move four functions.
2. Update `portal/events.html` script tag (gated).
3. Trim `detail.js`; add bridges.
4. Update `_smoke-phase3b-detail-bridge.js` (and team smokes if load-order asserts expand).
5. Run full test plan §7; manual lightbox + countdown.
6. Commit, deploy, optional live globals verifier.

---

## References

- `docs/audit/pages/events/020_phase_5_readiness_and_execution_plan.md` — Phase 5B–5F strategy
- `js/portal/events/detail.js` — current monolith baseline (~1,338 lines)
- `js/portal/events/team/chat.js`, `team/tools.js` — extraction pattern to follow
- `test/_smoke-phase3b-detail-bridge.js` — bridge + load-order contract
