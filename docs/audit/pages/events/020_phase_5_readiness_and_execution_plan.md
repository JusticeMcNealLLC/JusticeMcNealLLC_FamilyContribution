# Events Refactor — Phase 5 Readiness and Execution Plan

**Document:** `020_phase_5_readiness_and_execution_plan.md`  
**Date:** 2026-05-21  
**Status:** Planning / audit only — no runtime changes in this task  
**Scope:** Portal Events (`portal/events.html`, `js/portal/events/**`)  
**Out of scope:** Public event pages (`js/events/**`, `events/index.html`), admin `events-dashboard.js`, new migrations, `portal/events.html` edits

---

## 1. Current Completed State

### Feature work paused

Major user-facing Events features are **paused** so the refactor can continue safely. Phase 5 planning and staged extraction can proceed without mixing in new product scope.

### Major completed systems (since Phase 1–4 bridge)

| System | Summary | Primary touchpoints |
| --- | --- | --- |
| **Events refactor Phase 1–4** | Classic-script bridge: `window.PortalEvents.*`, `window.Events*`, preserved `window.evt*` handlers; Phase 4 compat helpers implemented (unwired). | `index.js`, `init.js`, feature IIFEs, `js/portal/events/compat/*` |
| **Event Coordinator role** | `canManageEvents()` / coordinator permissions for manage surfaces. | `js/auth/shared.js`, `detail.js`, `manage/sheet.js` |
| **Public event attendance count** | RPC-backed going count on public event pages. | `js/events/**`, Supabase RPC (not portal Phase 5) |
| **Public login redirect** | Guest flows redirect to portal event after sign-in. | `js/events/**`, auth |
| **Event Team Tools sheet** | Mobile/desktop Team CTA → tools panel (RSVP self, raffle, scanner, etc.). | `detail.js` (~lines 1279–1882) |
| **Event Team Chat v1** | `event_chats` / `event_chat_messages`, Realtime, UI in Team tools. | `detail.js` (~lines 1366–1718), migration `093_event_team_chat.sql` |
| **Portal RSVP/raffle parity** | `going` / `paid`, locked raffle until RSVP; shared helpers. | `rsvp.js`, `detail.js`, `list.js` |
| **Deactivated-user auth fix** | Block deactivated accounts at auth boundary. | `js/auth/shared.js`, `js/config.js` |
| **Events profile 406 hardening** | `.maybeSingle()` / null stubs for missing profile rows. | `detail.js`, `list.js`, related loaders |

### Refactor checkpoint

- `portal/events.html` still loads **19 portal Events classic scripts** (plus shared components/auth) in a fixed order; `init.js` is last.
- `js/portal/events/index.js` is a **namespace shell only** (21 lines); it does not orchestrate boot yet.
- Phase 4F compat files exist (`compat/window-exports.js`, `compat/external-globals.js`, `compat/inline-handlers.js`) but are **not referenced** by `portal/events.html` or runtime modules.
- Live globals verifier (`test/_verify-events-live-globals.js`) has passed against production in Phase 4I; re-run after any loader or split change.

---

## 2. Current Script Loading Model

Source: `portal/events.html` (lines 871–914). **Do not change order without a gated plan.**

### External / infrastructure (before portal Events)

| Order | Script |
| --- | --- |
| 1–3 | QRCode, jsQR, Leaflet (CDN) |
| 4 | `@supabase/supabase-js@2` (CDN) |
| 5 | `js/config.js` (`supabaseClient`, `checkAuth`, edge helpers) |
| 6–12 | Page shell (`icons`, `helpers`, `nav`, `dropdowns`, `drawer`, `profile-loader`, `index`) |
| 13–14 | `notifications.js`, `push.js` |
| 15 | `js/auth/shared.js` (`canManageEvents`, `canCreateEvents`, permissions) |

### Shared event components (M0)

| Order | Script |
| --- | --- |
| 16–19 | `js/components/events/constants.js`, `helpers.js`, `pills.js`, `card.js` |

### Portal Events feature scripts (order matters)

| Order | Script | Role |
| --- | --- | --- |
| 20 | `js/portal/events/index.js` | `window.PortalEvents` shell |
| 21 | `constants.js` | Portal + shared constants bridge |
| 22 | `state.js` | Lexical `evtCurrentUser`, role |
| 23 | `utils.js` | Shared portal event utilities |
| 24 | `raffle-model.js` | `window.EventsRaffleModel` |
| 25 | `list.js` | List view, filters, hero, buckets |
| 26 | `detail.js` | Detail render, Team tools/chat, CTA bar |
| 27 | `comments.js` | Comments load/post |
| 28 | `rsvp.js` | `evtHandleRsvp`, `evtIsGoingRsvp`, parity helpers |
| 29 | `create.js` | Create flow shell |
| 30 | `create/sheet.js` | `window.EventsCreate` |
| 31 | `documents.js` | Documents section |
| 32 | `map.js` | Live map |
| 33 | `scanner.js` | Check-in scanner |
| 34 | `raffle.js` | Raffle entry handling |
| 35 | `competition.js` | Competition UI + `PortalEvents.competition` |
| 36 | `scrapbook.js` | Scrapbook section |
| 37 | `manage/sheet.js` | `window.EventsManage` |
| 38 | `init.js` | **`initEventsPage`**, listeners, `evtLoadEvents`, URL routing |
| 39 | `sw-register.js` | Service worker |

**Dependency rule:** `detail.js` loads before `rsvp.js` but registers `detail.register('rsvp', …)` pointing at `window.evtHandleRsvp` defined later in `rsvp.js`. `init.js` must remain last among portal Events scripts.

**HTML size:** `portal/events.html` ≈ **917** lines (markup + script tags).

---

## 3. Current Bridge / Compatibility Surfaces

### `window.PortalEvents` (namespace)

| Key | Owner file | Notes |
| --- | --- | --- |
| `(root)` | `index.js` | Empty object initializer |
| `initEventsPage` | `init.js` | Async boot; duplicate-init guard `_eventsPageInitialized` |
| `list` | `list.js` | `load`, `render`, filter/render helpers (discovery surface) |
| `detail` | `detail.js` | Direct APIs + `register()` / `get()` registry |
| `manage` | `manage/sheet.js` | `open`, `close`, `refreshRaffle` |
| `create` | `create/sheet.js` | `open`, `close`, `isFlagOn` |
| `competition` | `competition.js` | Build/join/vote/moderate helpers |
| `constants` | `constants.js` | (if exposed — verify in bridge smoke) |
| `raffleModel` | `raffle-model.js` | Mirror of raffle model (verify live verifier) |

**Future (Phase 5F):** `index.js` may call `PortalEvents.initEventsPage()` once; `init.js` must keep guard to avoid double boot.

### Legacy classic globals (must preserve through extractions)

| Global | Owner | Consumers |
| --- | --- | --- |
| `window.EventsCreate` | `create/sheet.js` | Inline onclick, list create tile, init |
| `window.EventsManage` | `manage/sheet.js` | Host manage buttons, inline scanner handoff |
| `window.EventsRaffleModel` | `raffle-model.js` | create sheet, manage raffle, detail raffle HTML |
| `window.evtLoadEvents` / `evtRenderEvents` | `list.js` | `init.js` |
| `window.evtOpenDetail` | `detail.js` | routing, cards, list |
| `window.evtHandleRsvp` / `evtIsGoingRsvp` / `evtIsRaffleBundledWithPaidRsvp` | `rsvp.js` | list, detail, team tools |
| `window.evtOpenTeamToolsPanel` / `evtOpenTeamChat` / `evtSendTeamChatMessage` / `evtCleanupTeamChat` | `detail.js` | inline onclick in generated HTML |
| `window.evtInitBottomNav` / `evtCleanupBottomNav` / `evtOpenCtaPanel` / `evtCloseCtaPanel` | `detail.js` | detail lifecycle |
| `window.evtNavigateToEvent` | `list.js` / init routing | hero, cards |
| Feature `evt*` | `comments`, `map`, `scanner`, `raffle`, `competition`, `scrapbook`, `documents` | `detail.register(...)` and inline handlers |

### `PortalEvents.detail` registry

Registered modules (lazy refs to `window.evt*`): `rsvp`, `raffle`, `competition`, `comments`, `documents`, `scrapbook`, `map`, `scanner`.

Direct assignments include: `open`, `openLightbox`, map helpers, CTA panel, raffle HTML builders, **`openTeamToolsPanel`**, **`openTeamChat`**.

### Phase 4 compat (implemented, not wired)

| File | Purpose |
| --- | --- |
| `compat/window-exports.js` | Repeat-safe installer for `PortalEvents` + classic globals |
| `compat/external-globals.js` | Accessors for Supabase, auth, permissions, CDN libs |
| `compat/inline-handlers.js` | Explicit map of inline handler names |

**Phase 5 note:** Wire compat layer only when consolidating exports (Phase 5E+), not as the first extraction step.

### Shared components

`window.EventsConstants`, `EventsHelpers`, `EventsPills`, `EventsCard` — used heavily by `list.js`; keep load order before portal list.

---

## 4. Large File Candidates

Line counts (2026-05-21, including blanks):

| File | Lines | Risk | Split priority |
| --- | ---: | --- | --- |
| `js/portal/events/list.js` | **2,978** | High | After `detail.js` team extractions; split by view (hero/filters/buckets/calendar/vlift) |
| `js/portal/events/manage/sheet.js` | **2,326** | High | Tab-based extractions (`overview`, `rsvps`, `docs`, `raffle`, …) |
| `js/portal/events/detail.js` | **2,124** | **Highest** | **First** — Team Chat + Team Tools |
| `js/portal/events/create/sheet.js` | **1,099** | Medium | Form sections / raffle builder |
| `js/portal/events/rsvp.js` | **513** | Low | Optional `rsvp/parity.js` if parity grows |
| `js/portal/events/init.js` | **315** | Low | Keep thin until single entry |

### `detail.js` — recommended split map

| Approx. lines | Block | Target file (Phase 5B–D) |
| --- | --- | --- |
| 25–193 | Markdown, lightbox, raffle prize HTML helpers | `detail/raffle-render.js` or keep until render split |
| 194–1222 | `evtOpenDetail` main render + data fetch | `detail/render.js` (largest chunk; split last) |
| 1223–1278 | Fullscreen map | `detail/map-overlay.js` (or defer to existing `map.js`) |
| 1279–1367 | `evtInjectTeamToolsStyles` | `team/tools-styles.js` |
| 1366–1718 | **Team Chat** (ensure, load, send, Realtime, panel) | **`team/chat.js`** |
| 1720–1807 | Raffle-locked CTA HTML, `evtTeamToolsRow`, `evtBuildTeamToolsPanelHtml` | **`team/tools.js`** |
| 1808–2010 | CTA shell, desktop overlay, `evtOpenTeamToolsPanel`, bottom nav | **`team/tools.js`** + `detail/cta-bar.js` |
| 2010–2124 | Panel open/close, `window` / `detail.*` exports | `detail.js` shim (re-exports only) |

### `list.js` — split candidates (Phase 5+)

- Hero + featured selection (`_renderHero`, `_pickHero`)
- Filter strip / vlift / lifecycle (`_initMobileFilterStrip`, segmented control)
- Bucket rendering + calendar view
- Data load (`loadEvents`, attendee batching)
- Keep `window.PortalEvents.list` aggregation in a thin `list.js` or `list/index.js` shim

### `manage/sheet.js` — split candidates

- Per-tab HTML + wire functions: `_overviewHtml`, `_rsvpsHtml`, `_docsHtml`, `_raffleHtml`, `_moneyHtml`, `_imagesHtml`, `_dangerHtml`
- Raffle prize editor block (~1646–2115) is its own sub-module candidate
- Preserve `window.EventsManage` + `PortalEvents.manage` on a thin shell

### `create/sheet.js` — split candidates

- Raffle config UI (uses `EventsRaffleModel`)
- Core form / validation / submit
- Preserve `window.EventsCreate` on shell

---

## 5. New Feature Impact on Phase 5

| Feature | Phase 5 impact |
| --- | --- |
| **Team Chat v1** | ~350 lines added to `detail.js`; uses `supabaseClient`, `evtCurrentUser`, `canManageEvents`, inline `onclick`, Realtime channel cleanup. **First extraction target** (`team/chat.js`). |
| **Team Tools sheet** | CTA bar, desktop overlay, tools panel HTML, scanner/RSVP/raffle rows; depends on `rsvp.js` helpers. **Second extraction target** (`team/tools.js`). |
| **Event Coordinator** | Permission checks via `canManageEvents()` in `auth/shared.js` — extractions must not duplicate permission logic; keep importing/calling shared helper. |
| **RSVP/raffle parity** | `evtIsGoingRsvp`, locked raffle UI in `detail.js` + `rsvp.js`; extract team/tools together with parity-aware CTAs; do not break `detail.register('rsvp')`. |
| **Public event changes** | `js/events/**` is a **separate surface** — do not merge into portal Phase 5 splits. |
| **Profile 406 / auth deactivation** | Cross-cutting; regression-test auth boot in `init.js` after any loader change. |

### Inline handler inventory (Team Chat / Tools)

These **must** remain on `window` after extraction:

- `evtOpenTeamToolsPanel('…')`
- `evtOpenTeamChat('…')`
- `evtSendTeamChatMessage('…')`
- `evtCloseCtaPanel()` (used before opening chat)
- `evtHandleRsvp('…','going')` (team tools rows)

Extraction pattern: new file defines functions; thin `detail.js` (or `team/index.js` loaded before `detail.js`) assigns `window.evtOpenTeamChat = …`.

---

## 6. Phase 5 Recommended Strategy

Staged path aligned with user preference: **classic scripts first**, **no `portal/events.html` module entry until late**.

### Phase 5A — Readiness doc only ✅

This document. No code changes.

### Phase 5B — Extract Team Chat from `detail.js`

- Add `js/portal/events/team/chat.js` (classic IIFE).
- Move: `EVT_TEAM_CHAT_MAX_LEN` through `evtSendTeamChatMessage`, Realtime subscribe/cleanup, injected chat CSS (or move CSS to `css/pages/portal/events/team-chat.css` in a later polish).
- `detail.js` retains: `window.evtOpenTeamChat`, `detail.openTeamChat`, and delegates to `PortalEvents.team.chat` or `window.evtTeamChat.*` if namespaced.
- Insert script tag in `portal/events.html` **after** `state.js` / `utils.js`, **before** `detail.js` (only when implementation approved).
- Update `test/_smoke-event-team-chat-ui.js` paths if needed.

### Phase 5C — Extract Team Tools / CTA action menu

- Add `js/portal/events/team/tools.js`.
- Move: styles injection, tools panel builders, `evtOpenTeamToolsPanel`, CTA bar / bottom nav / desktop overlay (coordinate with 5B cleanup).
- Preserve `evtInitBottomNav` / `evtCleanupBottomNav` on window (may stay on detail shim until CTA split).

### Phase 5D — Split `detail.js` submodules (non-team)

- Raffle render helpers → `detail/raffle-render.js`
- Main `evtOpenDetail` → `detail/render.js` (highest risk — do after team + tests green)
- Optional map overlay extraction

### Phase 5E — Consolidate entry wiring

- Optionally wire `compat/window-exports.js` from a new orchestrator script.
- Centralize export list; reduce duplicate `window` assignments.
- Still **classic scripts** in HTML.

### Phase 5F — Single entry / `portal/events.html` cleanup

- `type="module"` or single bundled entry from `js/portal/events/index.js`.
- Remove redundant script tags only after: all smokes, live globals verifier, manual QA, rollback rehearsal.
- Cloudflare cache bust every touched bare asset.

### Explicitly out of Phase 5 (unless separately approved)

- Public `js/events/**` module migration
- `events-dashboard.js` admin surface
- Deleting `window.evt*` or `EventsCreate` / `EventsManage`
- New product features

---

## 7. Tests Required Before Touching `portal/events.html`

Run (and expect pass) before **any** new script tag or reorder in `portal/events.html`:

### Static smokes (CI-safe)

| Test | Command |
| --- | --- |
| Phase 1 bridge | `node test/_smoke-phase1-bridge.js` |
| Phase 3B detail bridge | `node test/_smoke-phase3b-detail-bridge.js` |
| Event Coordinator UI | `node test/_smoke-event-coordinator-events-ui.js` |
| Team Tools UI | `node test/_smoke-event-team-tools-ui.js` |
| Team Chat UI | `node test/_smoke-event-team-chat-ui.js` |
| Public attendance | `node test/_smoke-public-event-attendance.js` |
| Portal raffle/RSVP parity | `node test/_smoke-portal-event-raffle-rsvp-parity.js` |

### Optional but recommended before 5F

| Test | Notes |
| --- | --- |
| Phase 3A/3C/3D/3E bridge smokes | Regression on list/manage/create/competition |
| Phase 4F compat smokes | If wiring `compat/*` |
| `node test/_smoke-event-team-chat-migration.js` | Schema only; if DB touched |
| `node test/_smoke-events-profile-images.js` | Profile fetch patterns |

### Live / manual (credentials via `.env.local`)

| Test | Command |
| --- | --- |
| Consolidated live globals | `node test/_verify-events-live-globals.js` |
| Event Team Chat QA | `node test/_qa-event-team-chat-live.js` |
| Portal RSVP/raffle parity QA | `node test/_qa-portal-parity-signed-in.js` |

### Per-extraction gate (5B/5C)

After adding `team/chat.js` or `team/tools.js` to HTML:

1. All static smokes above  
2. Manual: open event → Team → Team Chat → send → back → Realtime (two users if possible)  
3. Manual: desktop Team button opens overlay; mobile bottom nav Team works  
4. Re-run live globals verifier if deploying to production  

---

## 8. Rollback Plan

### For classic script additions (5B–5E)

1. **Git revert** the commit that added/changed script tags in `portal/events.html`.
2. Deploy prior commit; verify bare asset URLs (cache bust query param on `manage/sheet.js` pattern: `?v=NNN`).
3. Run `node test/_verify-events-live-globals.js` against production/staging.
4. Confirm `window.evtOpenTeamChat` and Team Tools still exist on `detail.js` bundle if rollback removes split files.

### For Phase 5F module entry (future)

1. Revert `portal/events.html` to full classic script list (known-good order in §2).
2. Revert `index.js` if it started calling `initEventsPage` on import.
3. Purge CDN/browser cache; bump `?v=` on any changed asset.
4. Live verifier + manual Team Chat / RSVP / Manage open smoke on staging within 15 minutes.

### Data / backend

Team Chat rollback is **frontend-only** for Phase 5 splits; migration `093` is already applied — do not roll back DB as part of JS loader rollback.

---

## 9. Go / No-Go Decision

| Question | Recommendation |
| --- | --- |
| Start Phase 5 **implementation** immediately? | **Conditional go** — begin **5B (Team Chat extraction)** only; not 5F. |
| Change `portal/events.html` to single module entry now? | **No-go** |
| Change `portal/events.html` to add one classic script (`team/chat.js`)? | **Go** after 5B implementation + smokes; small, reversible. |
| Wire Phase 4 compat helpers first? | **Optional** — not blocking; wire in 5E when consolidating exports. |
| Split `list.js` or `manage/sheet.js` before `detail.js` team chunks? | **No-go** — detail team blocks are the highest churn, best ROI, lowest cross-file risk. |

### Preferred execution order (summary)

1. **Do not** switch `portal/events.html` to a module entry yet.  
2. **Do** extract Team Chat → `js/portal/events/team/chat.js` (classic IIFE, preserve all `window.evt*` names).  
3. **Do** extract Team Tools → `js/portal/events/team/tools.js`.  
4. **Then** tackle `detail/render.js` and other large files.  
5. **Only then** consider `index.js` orchestration + HTML cleanup (5F).

---

## 10. First Recommended Implementation Step

**Phase 5B:** Create `js/portal/events/team/chat.js`, move Team Chat functions and styles from `detail.js`, re-export on `window` from a minimal `detail.js` shim, add one `<script src="../js/portal/events/team/chat.js"></script>` immediately before `detail.js`, run static smokes + manual Team Chat QA.

Do **not** remove or rename existing `window.evtOpenTeamChat` / `detail.openTeamChat` in the same PR without updating `test/_smoke-phase3b-detail-bridge.js` and `test/_smoke-event-team-chat-ui.js`.

---

## References

- `docs/audit/pages/events/008_phase_1_to_3e_wrapup.md`
- `docs/audit/pages/events/014_phase_4e_pre_phase_5_readiness_review.md`
- `docs/audit/pages/events/019_major_events_improvements_planning.md`
- `docs/improvements/pages/events/team-chat/002_event_team_chat_completion_status.md`
- `portal/events.html` script block (lines 871–914)
