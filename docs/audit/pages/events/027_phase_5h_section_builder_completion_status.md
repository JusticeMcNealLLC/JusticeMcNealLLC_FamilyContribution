# Events Refactor — Phase 5H Section-Builder Completion Status

**Document:** `027_phase_5h_section_builder_completion_status.md`  
**Date:** 2026-05-23  
**Status:** **Complete** — Phases 5H.1–5H.5 implemented, static smokes green, live-verified on production  
**Latest code commit (5H.5):** `2a33db4` — Extract final Event detail section builders  
**Related:** `021_phase_5d_detail_split_plan.md`, `022_phase_5d_completion_status.md`, `024_phase_5e_checkpoint_status.md`, `025_phase_5_remaining_refactor_completion_roadmap.md`  
**Scope:** Portal Events detail **section HTML builders** and **data context loader** only (`js/portal/events/detail/*` classic scripts)  
**Out of scope:** Template shell move, post-render extraction, compat wiring, Phase 5L module entry, `portal/events.html` changes in 5H (load order was established in 5H.1 and held through 5H.5)

---

## 1. Completion Summary

Phase **5H** mechanical section-builder extraction is **complete**. All safe inline HTML fragment builders that lived inside `evtOpenDetail()` have been moved to `detail/sections.js` (and context loading to `detail/data.js`). `detail.js` remains the orchestrator: it loads context, calls builders, assembles the main `innerHTML` template, and runs post-render hooks.

| Slice | File(s) | Commit | What moved |
| --- | --- | --- | --- |
| **5H.1** | `js/portal/events/detail/data.js` | `22b1ab1` | `evtLoadDetailContext` — Supabase fetches, derived flags, RSVP/raffle/permission context for detail render |
| **5H.2** | `js/portal/events/detail/sections.js` (initial) | `dbc151f` | `evtBuildDetailRsvpSectionHtml`, `evtBuildDetailRaffleSectionHtml`, `evtBuildDetailHostControlsHtml` |
| **5H.3** | `detail/sections.js` | `f99a40d` | `evtBuildDetailWaitlistHtml`, `evtBuildDetailGraceNoticeHtml`, `evtBuildDetailCostBreakdownHtml`, `evtBuildDetailAttendeeBreakdownHtml` |
| **5H.4** | `detail/sections.js` | `787eee6` | `evtBuildDetailHeroStatusBadgeHtml`, `evtBuildDetailTransportNoticeHtml`, `evtBuildDetailLocationNoticeHtml`, `evtBuildDetailThresholdHtml`, `evtBuildDetailAttendeePreviewHtml`, `evtBuildDetailShareCardHtml` |
| **5H.5** | `detail/sections.js` | `2a33db4` | `evtBuildDetailOrganizerHtml`, `evtBuildDetailTeamHubHtml`, `evtBuildDetailRelatedEventsHtml`, `evtBuildDetailMobileAttendeesHtml`, `evtBuildDetailMobileHostedHtml`, `evtBuildDetailPageHeaderActionsHtml` |

### Export pattern (all 5H slices)

Each builder is exposed as:

- Legacy global: `window.evtBuildDetail*Html`
- Namespace: `PortalEvents.detail.sections.build*Html` (camelCase method names on `sections` object)
- Bridge in `detail.js`: `detail.sections = window.PortalEvents.detail.sections`

`detail.js` calls `window.evtBuildDetail*Html(ctx)` inside `evtOpenDetail`; it does **not** reimplement builder bodies.

### Per-slice file touch (typical PR)

| Files |
| --- |
| `js/portal/events/detail/sections.js` and/or `detail/data.js` |
| `js/portal/events/detail.js` (delegation + template variable wiring only) |
| `test/_smoke-phase3b-detail-bridge.js` |
| `test/_smoke-phase5h-detail-open-split.js` |

**Not moved in Phase 5H (by design):**

- Full `detailView.innerHTML` / `main.innerHTML` template scaffold
- Post-render: QR canvas, inline Leaflet for `#detailEventMap` / `#detailEventMapMobile`, avatar stack paint, `evtLoadComments`, countdown, Team Tools context assignment
- `descHtml` via `evtMiniMarkdown` (presentation.js)
- Cost breakdown **collapsible wrapper** mutation (still orchestrated in `detail.js` after builder returns HTML)

### Pre-existing dead code (unchanged in 5H)

`hostControlsHtml` and `attendeeBreakdownHtml` are still computed in `evtOpenDetail` but are **not** inserted into the current template (pre-existing; not introduced by 5H).

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
../js/portal/events/detail.js               ← orchestrator + template + post-render
../js/portal/events/comments.js
… (rsvp, create, manage, etc.)
../js/portal/events/init.js                 ← last among portal Events scripts
```

### Earlier detail / team extractions (pre–5H)

| Phase | File | Role |
| --- | --- | --- |
| **5B** | `team/chat.js` | Team Chat panel, Realtime, `evtOpenTeamChat` / send / cleanup |
| **5C** | `team/tools.js` | CTA bar, Team Tools panel, `evtOpenTeamToolsPanel`, bottom nav |
| **5D.1** | `detail/presentation.js` | Markdown, lightbox, section animations, live countdown |
| **5D.2** | `detail/raffle-render.js` | Raffle prize/winner rails, locked desktop block |
| **5D.3** | `detail/map-overlay.js` | Fullscreen map overlay open / recenter / close |
| **5F-prep** | `detail/fragments.js` | `_ed*` HTML fragments (`evtEdMetaRow`, `evtEdCard`, …) |

### Responsibility split after 5H.5

| Module | Responsibility |
| --- | --- |
| `detail/data.js` | `evtLoadDetailContext(eventId)` → `ctx` or `null` |
| `detail/sections.js` | 18 `evtBuildDetail*Html(ctx)` section builders |
| `detail.js` | `evtOpenDetail`, template assembly, post-render hooks, `window.evtOpenDetail`, registry bridges |

Approximate line counts (repo, May 2026): `detail.js` ~629, `detail/sections.js` ~588, `detail/data.js` ~206.

---

## 3. Current Status

| Item | Status |
| --- | --- |
| **`async function evtOpenDetail`** | Still defined in `detail.js`; exported as `window.evtOpenDetail` and `detail.open` |
| **Section HTML builders** | Live in `detail/sections.js`; `detail.js` delegates via `window.evtBuildDetail*Html(ctx)` |
| **Full main template** | Still inline in `detail.js` (`detailView.innerHTML = \`...\``) |
| **Post-render hooks** | Still in `detail.js` (end of `evtOpenDetail`) |
| **QR / ticket rendering** | Still in `detail.js` (`setTimeout` → `QRCode.toCanvas` on `#myTicketQR`) |
| **Inline Leaflet init** | Still in `detail.js` (`_initMap('detailEventMap')`, `_initMap('detailEventMapMobile')`) |
| **Comments** | `evtLoadComments(eventId)` called from `detail.js`; implementation in `comments.js` |
| **Avatar painting** | `window._edAvatarData` + `setTimeout` avatar stack paint in `detail.js` |
| **Countdown** | Via `window.evtStartLiveCountdown` (presentation.js), invoked from `detail.js` |
| **Team Tools context** | `evtInitBottomNav` / panel wiring from `team/tools.js`; context assignment still triggered from detail render path |
| **Module entry / Phase 5L** | **Not started** — no `type="module"` on portal Events scripts |

---

## 4. Verification Summary

### Static regression gate (all passed after `2a33db4`)

```bash
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3b-detail-bridge.js
node test/_smoke-phase5h-detail-open-split.js
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

| Smoke | Result (post–5H.5) |
| --- | --- |
| `_smoke-phase1-bridge.js` | **28/28** pass |
| `_smoke-phase3b-detail-bridge.js` | **220/220** pass (includes 5H.1–5H.5 builders, load order, delegation) |
| `_smoke-phase5h-detail-open-split.js` | **85/85** pass |
| `_smoke-event-team-tools-ui.js` | all pass |
| `_smoke-event-team-chat-ui.js` | all pass |
| `_smoke-portal-event-raffle-rsvp-parity.js` | all pass |

### Live QA (production — `https://justicemcneal.com`)

**Test event:** `yolanda-adam-and-justin-birthday-celebration-mov3ceo1`  
**Commits verified in production:** `22b1ab1` (5H.1) through `2a33db4` (5H.5)

| Area | Result |
| --- | --- |
| **Asset / load order** | `detail/data.js` → `detail/sections.js` → `detail.js`; all **HTTP 200**; six 5H.5 builders present in live `sections.js`; `detail.js` delegates, does not redefine builders |
| **5H.5 runtime (birthday)** | Detail opens; organizer + mobile hosted-by; attendee preview + mobile stack; header Share + Add to Calendar; RSVP + raffle; comments; embedded map widget; single CTA bar; `window.evtBuildDetail*Html` present |
| **Member regression** | Detail loads; no Team button; hosted-by / attendees render; RSVP/raffle UI correct; no portal JS 4xx / console errors |
| **Team Tools / Team Chat** | **PASS** via `evtOpenTeamToolsPanel` / `evtOpenTeamChat` (programmatic open; sidebar Team link hidden on desktop — click automation unreliable) |
| **RSVP / raffle** | **PASS** |
| **Comments / embedded map** | **PASS** |

### Data-dependent sections (skipped when no catalog event)

Live QA could not exercise every builder UI on production without a matching event:

| Builder / UI | Skip reason |
| --- | --- |
| Related events rail | Only one event in catalog at QA time |
| LLC threshold context | No suitable multi-threshold event in catalog |
| Transport / location notices | No event with those flags in catalog |
| Waitlist / grace notice | No waitlist/grace-state event in catalog |

Skips are **environment/data**, not 5H wiring failures.

### Known automation caveats (not treated as 5H regressions)

| Check | Note |
| --- | --- |
| **Manage Event sheet** | Headless `EventsManage.open` / host-button click did not consistently surface `#emSheetRoot` — flaky in automation; manual spot-check recommended |
| **Fullscreen map overlay** | Embedded Leaflet map **PASS**; `evtOpenFullscreenMap` open/close **flaky** in headless runs (overlay module works; inline map click path harder to automate) |
| **Desktop “Team” sidebar link** | Hidden off-screen; use CTA bar or `evtOpenTeamToolsPanel(id)` for automation |

---

## 5. Remaining Detail Refactor Work

Phase 5H **section-builder track is done**. Remaining `detail.js` work is **orchestration / template / post-render**, not more `evtBuildDetail*Html` slices unless a new audit finds missed inline HTML.

| Work item | Target (proposed) | Notes |
| --- | --- | --- |
| **Template shell extraction** | `detail/template.js` | Move `detailView.innerHTML` scaffold; keep variable injection in orchestrator |
| **Post-render hook extraction** | `detail/post-render.js` | QR, Leaflet, avatar paint, comments init trigger, countdown wiring |
| **QR / ticket rendering separation** | Part of post-render or dedicated helper | `QRCode.toCanvas`, ticket/venue QR HTML |
| **Inline Leaflet init separation** | Part of post-render | `#detailEventMap`, `#detailEventMapMobile` |
| **Comments / avatar paint separation** | Part of post-render | `_edAvatarData`, `evtLoadComments` call site |
| **Thin `evtOpenDetail()` orchestrator** | `detail.js` | Load ctx → build sections → assemble template → call post-render |
| **Phase 5L module entry / HTML cleanup** | `index.js` + `portal/events.html` | Only after template + post-render stable; single `type="module"` gate |

---

## 6. Recommended Next Step

1. **Do not start Phase 5L** (module entry, `type="module"`, or aggressive `portal/events.html` script reduction) yet.
2. **Do not start another 5H builder slice** unless a fresh audit finds remaining inline section HTML in `detail.js`.
3. **Next gated work:** dedicated **Phase 5H.6 audit** (planning doc only) to choose order and boundaries between:
   - **template shell** → `detail/template.js`
   - **post-render hooks** → `detail/post-render.js`  
   Run that audit before the first implementation PR.

---

## 7. No-Go Reminder

**Do not combine in a single PR:**

- Template shell move
- Post-render extraction
- Compat wiring (`compat/window-exports.js`, `detail/exports.js`)
- Phase 5L module entry

Each concern needs its own gate: static smokes, live QA on birthday event (+ member regression), and explicit approval before the next slice.

---

## Appendix — Section builders in `detail/sections.js` (complete list)

| Builder | Phase |
| --- | --- |
| `evtBuildDetailRsvpSectionHtml` | 5H.2 |
| `evtBuildDetailRaffleSectionHtml` | 5H.2 |
| `evtBuildDetailHostControlsHtml` | 5H.2 |
| `evtBuildDetailWaitlistHtml` | 5H.3 |
| `evtBuildDetailGraceNoticeHtml` | 5H.3 |
| `evtBuildDetailCostBreakdownHtml` | 5H.3 |
| `evtBuildDetailAttendeeBreakdownHtml` | 5H.3 |
| `evtBuildDetailHeroStatusBadgeHtml` | 5H.4 |
| `evtBuildDetailTransportNoticeHtml` | 5H.4 |
| `evtBuildDetailLocationNoticeHtml` | 5H.4 |
| `evtBuildDetailThresholdHtml` | 5H.4 |
| `evtBuildDetailAttendeePreviewHtml` | 5H.4 |
| `evtBuildDetailShareCardHtml` | 5H.4 |
| `evtBuildDetailOrganizerHtml` | 5H.5 |
| `evtBuildDetailTeamHubHtml` | 5H.5 |
| `evtBuildDetailRelatedEventsHtml` | 5H.5 |
| `evtBuildDetailMobileAttendeesHtml` | 5H.5 |
| `evtBuildDetailMobileHostedHtml` | 5H.5 |
| `evtBuildDetailPageHeaderActionsHtml` | 5H.5 |

**Total:** 18 section builders + 1 context loader (`evtLoadDetailContext` in `detail/data.js`).
