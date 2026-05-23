# Events Refactor — Remaining Completion Roadmap (Checkpoint → Phase 5F)

**Document:** `025_phase_5_remaining_refactor_completion_roadmap.md`  
**Date:** 2026-05-21  
**Status:** Planning / audit only — **no runtime changes**  
**Checkpoint:** `024_phase_5e_checkpoint_status.md` (`master` through `5e27643`)  
**Scope:** Finish portal Events refactor safely through classic-script splits, compat consolidation, and eventual single entry + `portal/events.html` cleanup  
**Out of scope:** Public `js/events/**`, admin dashboard, new product features, one-shot “big bang” HTML/module switch

---

## Executive summary

Phases **5B–5E.1** extracted team + detail helpers and added nested export aliases. **`detail.js` still owns ~1,023 lines of `evtOpenDetail()`** plus five `_ed*` fragment helpers. **`list.js` (~2,978 lines)** and **`manage/sheet.js` (~2,326 lines)** are the other dominant files.

**Finish strategy:** many small gated PRs — **one file or one concern per PR**, static smokes + live globals verifier + targeted manual QA after each HTML-touching step.

**Next implementation (recommended):** **`detail/fragments.js`** (this doc labels it **Phase 5F-prep**; not module entry).

**True Phase 5F** (per `020`): single orchestrated entry + `portal/events.html` script list reduction — only as **Phase 5L** after **5K** rehearsal.

---

## 1. Current baseline (post–5E.1)

### Completed extractions

| Phase | File(s) |
| --- | --- |
| 5B | `team/chat.js` |
| 5C | `team/tools.js` |
| 5D.1 | `detail/presentation.js` |
| 5D.2 | `detail/raffle-render.js` |
| 5D.3 | `detail/map-overlay.js` |
| 5E.1 | Nested aliases on `PortalEvents.detail` in `detail.js` |

### Current detail / team script order (`portal/events.html`)

```text
team/chat.js → team/tools.js → detail/presentation.js → detail/raffle-render.js
  → detail/map-overlay.js → detail.js → comments.js → … → init.js (last)
```

**23** portal Events classic scripts today (was ~19 before 5B/5D splits). `compat/*` **not** loaded.

### Invariants (must hold until 5L)

- No `type="module"` on feature scripts until final gate
- `init.js` remains last among `js/portal/events/*`
- All legacy `window.evt*` names used in HTML/onclick remain on `window`
- `EventsCreate`, `EventsManage`, `EventsRaffleModel` unchanged
- `detail.register(...)` lazy refs still resolve (e.g. `evtHandleRsvp` after `rsvp.js`)

---

## 2. Remaining large files (line counts)

Counts from repo at checkpoint (`wc` / line count, May 2026).

| File | Lines (approx.) | Primary responsibility |
| --- | ---: | --- |
| `list.js` | **2,978** | List view, filters, calendar, buckets, hero |
| `manage/sheet.js` | **2,326** | `EventsManage` — edit event, raffle admin, hosts |
| `detail.js` | **1,160** | Registry, bridges, **`evtOpenDetail` ~66–1089**, post-render, exports |
| `create/sheet.js` | **1,099** | `EventsCreate` sheet |
| `create.js` | **700** | Create flow shell |
| `competition.js` | **851** | Competition UI + handlers |
| `rsvp.js` | **599** | RSVP / waitlist / parity helpers |
| `raffle.js` | **432** | Raffle entry actions |
| `map.js` | **325** | Live map section |
| `init.js` | **314** | Boot, listeners, routing |
| `documents.js` | **266** | Documents panel |
| `scanner.js` | **240** | Scanner |
| `scrapbook.js` | **210** | Scrapbook |
| `utils.js` | **228** | Shared utilities |
| `comments.js` | **99** | Comments |
| `index.js` | **22** | `PortalEvents` shell only |
| `portal/events.html` | **921** | Markup + 23 script tags |

### `detail.js` internal split (today)

| Region | Lines (approx.) | Notes |
| --- | ---: | --- |
| Namespace + registry | 14–22 | Stays in `detail.js` |
| `_edMetaRow` … `_edSectionHead` | 30–58 | **Candidate → `detail/fragments.js`** |
| `async function evtOpenDetail` | **66–1089** | **~1,023 lines** — needs dedicated audit (5G) before split (5H) |
| Hero collapse stubs | 1098–1099 | Stay in `detail.js` |
| Bridges + 5E.1 aliases + `register` | 1105–1158 | Stay until 5J (`exports.js` optional) |

### `index.js` / `init.js` today

- **`index.js`:** does not call `initEventsPage()` — comment-only future hook.
- **`init.js`:** `initEventsPage`, duplicate-init guard, `evtSetupListeners`, `evtLoadEvents`, `evtRouteByUrl`.

### Compat layer (dormant)

| File | Loaded? | Purpose |
| --- | --- | --- |
| `compat/window-exports.js` | **No** | `installWindowExports` — merge namespaces + globals |
| `compat/inline-handlers.js` | **No** | `installInlineHandlers` — inventory + safe assign |
| `compat/external-globals.js` | **No** | External script expectations |

Live verifier (`_verify-events-live-globals.js`) expects compat helpers **absent** on production until explicitly wired.

---

## 3. Full remaining phase sequence

Mapping to earlier docs (`020` Phase 5F = module entry) vs this roadmap:

| This doc | `020` name | Deliverable |
| --- | --- | --- |
| **5F-prep** | — | `detail/fragments.js` |
| **5G** | — | `evtOpenDetail` split **audit** (doc only) |
| **5H** | 5D-late / render | Split `evtOpenDetail` into `detail/*` |
| **5I** | — | `list` / `manage` / `create` extraction audits + slices |
| **5J** | 5E.2 + compat | `detail/exports.js` + optional compat wiring |
| **5K** | 5F rehearsal | `index.js` orchestrator **staging only** |
| **5L** | 5F production | `portal/events.html` cleanup, module or bundled entry |

---

### Phase 5F-prep — `detail/fragments.js`

**Goal:** Extract HTML fragment composers used by `evtOpenDetail` (and optionally dedupe `raffle-render.js` private section head).

| Item | Detail |
| --- | --- |
| **Move** | `_edMetaRow`, `_edPill`, `_edCard`, `_edNotice`, `_edSectionHead` |
| **Export** | `window.evtEdMetaRow` … or `PortalEvents.detail.fragments.*` + flat bridges in `detail.js` |
| **HTML** | One new `<script>` after `map-overlay.js`, before `detail.js` |
| **Risk** | **Low** |
| **Do not** | Touch `evtOpenDetail` body yet |

**Tests:** phase1, phase3b (+ fragment checks), team tools/chat, raffle parity; `node --check` new file.

**Live QA:** Open detail → cards/sections render; raffle winners section if data exists.

**Rollback:** Revert commit; remove script tag.

**No-go:** Any change to `evtOpenDetail` logic; removing flat `_ed*` usage without bridge.

---

### Phase 5G — `evtOpenDetail()` split audit (documentation only)

**Goal:** Produce `026_phase_5h_evt_open_detail_split_plan.md` (or similar) with exact line ranges, dependency graph, inline handler list, and PR slicing.

| Item | Detail |
| --- | --- |
| **Inputs** | `021` subsection table (update line numbers), `inline-handlers.js` EXPECTED_HANDLER_GROUPS, grep `onclick=` in template strings |
| **Outputs** | Recommended file boundaries: `data.js` / `render.js` / `post-render.js` (or `open.js` orchestrator) |
| **Risk** | **N/A** (planning) |
| **HTML** | None |

**No-go:** Starting 5H in the same PR as the audit.

---

### Phase 5H — Split `evtOpenDetail()` (highest detail risk)

**Goal:** Break ~1,023-line function into classic modules without behavior change.

**Suggested structure (finalize in 5G audit):**

| File | Responsibility |
| --- | --- |
| `detail/data.js` | Supabase fetches, permissions, RSVP/raffle flags, derived lists |
| `detail/render.js` | Template string assembly (largest chunk) |
| `detail/post-render.js` | DOM insert, animations, bottom nav, comments, QR, inline maps |
| `detail.js` | Thin `evtOpenDetail` orchestrator: call data → render → mount → post-render |

**Alternative (safer first slice):** extract **data only** in 5H.1; render in 5H.2; post-render in 5H.3.

| Item | Detail |
| --- | --- |
| **Risk** | **High** |
| **HTML** | 2–4 new script tags (strict order: data → render → post-render → detail.js) |

**Tests:** All standard smokes; consider new `_smoke-phase5h-detail-open.js` for “no duplicate evtOpenDetail”, HTML order, no fn bodies in `detail.js`.

**Live QA (required):** Coordinator event with location, raffle, Team Tools/Chat, RSVP going/not going, guest gate, manage dropdown, documents/competition if enabled.

**Rollback:** Revert split commits; keep 5F-prep fragments.

**No-go criteria:**

- Any failing phase3b or live globals verifier
- Changed inline handler names
- `rsvp.js` load order broken (`evtHandleRsvp` undefined at register time is OK — lazy — but must work at click)
- Production deploy without staging rehearsal

---

### Phase 5I — `list.js` / `manage/sheet.js` / `create/sheet.js`

**Goal:** Reduce monoliths after detail path is stable.

**Recommended order:**

1. **`create/sheet.js`** (~1,099) — already partially isolated as `EventsCreate`; audit vs `create.js` (~700)
2. **`list.js`** (~2,978) — split by concern: filters/state, render/calendar, hero (multiple PRs)
3. **`manage/sheet.js`** (~2,326) — split after list patterns proven; preserve `?v=112` cache bust

| Sub-phase | Risk |
| --- | --- |
| 5I-a create audit + small extract | Medium |
| 5I-b list audit + 1st slice (e.g. `list/filters.js`) | Medium–High |
| 5I-c manage audit + 1st slice | High |

**Tests per slice:** phase3a list bridge, phase3c manage, phase3d create; coordinator UI smoke; live globals.

**Live QA:** List filters, open create sheet, open manage sheet, save/cancel smoke.

**No-go:** Splitting list and manage in one PR; changing `EventsManage.open` signature.

---

### Phase 5J — Compat / export wiring (optional consolidation)

**Goal:** Reduce duplicate bridge noise; **not** required for correctness today.

| Option | When |
| --- | --- |
| **`detail/exports.js`** | Move flat `detail.* = window.evt*` block from `detail.js`; load after `detail.js` |
| **`compat/window-exports.js`** | Only when a single orchestrator (5K) registers all modules |
| **`compat/inline-handlers.js`** | Dev/staging audit tool or 5K helper — not broad production wiring in first pass |

| Item | Detail |
| --- | --- |
| **Risk** | **Medium** (order + double-assign) |
| **Prerequisite** | 5H stable; inventories updated |

**Tests:** phase3b, phase4f window-exports, inline-handlers; live globals (update if compat loaded intentionally).

**No-go:** Wiring compat in HTML before 5K rehearsal; removing owner-module `window.evt*` assignments.

---

### Phase 5K — Single-entry rehearsal (staging / local only)

**Goal:** Prove `index.js` can call `initEventsPage()` after all modules attach exports — **without** changing production HTML yet.

| Item | Detail |
| --- | --- |
| **Harness** | Local `portal/events.rehearsal.html` or feature flag branch — **not** production `events.html` initially |
| **`index.js`** | Import/load orchestration design: dynamic script list vs build step (if build added, document separately) |
| **Compat** | Trial `installWindowExports` from rehearsal entry only |
| **Risk** | **High** (boot order) |

**Tests:** Full static smoke battery on rehearsal HTML; `_verify-events-live-globals.js` against staging URL.

**Live QA:** Full coordinator + member flows on **staging** only.

**No-go:** Production HTML switch; removing classic scripts before verifier green on staging.

---

### Phase 5L — `portal/events.html` cleanup (production Phase 5F)

**Goal:** Replace 23-tag classic list with minimal loader (single module entry or 3–5 bundle scripts).

| Item | Detail |
| --- | --- |
| **Risk** | **Critical** |
| **Prerequisites** | 5H + 5I core splits done; 5K staging green ≥1 week; rollback rehearsed |
| **CDN** | Cache-bust every touched asset (`manage/sheet.js?v=` pattern) |

**Tests:** All phase smokes against **new** HTML; live globals admin + member; Team Chat live script optional.

**Live QA checklist:** Login, list, detail, RSVP, raffle, Team Tools/Chat, Create, Manage, Scanner, Documents, Competition, popstate routing.

**Rollback:** Revert HTML to checkpoint script list (`024` §2); redeploy prior commit within 15 minutes.

**No-go criteria:**

- Any missing `window.evt*` from `_verify-events-live-globals.js`
- `init.js` not last or double `initEventsPage` without guard
- Staging not matching production verifier results

---

## 4. Risk summary

| Phase | Risk | HTML change? |
| --- | --- | --- |
| 5F-prep fragments | **Low** | Yes (+1 script) |
| 5G audit | None | No |
| 5H evtOpenDetail split | **High** | Yes (+2–4 scripts) |
| 5I list/manage/create | **Medium–High** | Yes (incremental) |
| 5J exports/compat | **Medium** | Maybe (+1 script) |
| 5K rehearsal | **High** | Staging only first |
| 5L html cleanup | **Critical** | Yes (major) |

---

## 5. Required tests (every implementation PR)

### Static (CI-safe) — minimum gate

```bash
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3b-detail-bridge.js
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

### Phase-specific (add when touching area)

| Area | Additional smokes |
| --- | --- |
| List | `_smoke-phase3a-list-bridge.js` |
| Manage | `_smoke-phase3c-manage-bridge.js` |
| Create | `_smoke-phase3d-create-bridge.js` |
| Competition | `_smoke-phase3e-competition-bridge.js` |
| Compat | `_smoke-phase4f-window-exports.js`, `_smoke-phase4f-inline-handlers.js` |
| Low-level modules | `_smoke-phase2-low-risk-modules.js` |

### Live / staging (before production HTML change)

```bash
node test/_verify-events-live-globals.js
# Optional: _qa-event-team-chat-live.js, _qa-portal-parity-signed-in.js
```

Update `_verify-events-live-globals.js` `REQUIRED_ASSETS` when new `detail/*` URLs ship.

---

## 6. Live QA gates (by phase)

| Phase | Minimum manual |
| --- | --- |
| 5F-prep | Detail open; section cards; meta rows |
| 5H | Full detail matrix (host, member, guest gate, map, raffle, team) |
| 5I list | Filter tabs, calendar, open card → detail |
| 5I manage/create | Open sheets, save field, close |
| 5L | Full portal Events regression (30–45 min coordinator + member) |

Test event (historical): `yolanda-adam-and-justin-birthday-celebration-mov3ceo1`.

---

## 7. Rollback plan (template)

1. **Identify** last green commit (smokes + live verifier hash).
2. **Revert** PR commit(s); if HTML changed, revert `portal/events.html` first.
3. **Deploy** previous `master`; bump `?v=` on any cached `manage/sheet.js`.
4. **Verify** `node test/_verify-events-live-globals.js` + open detail + Team Chat within 15 minutes.
5. **Post-mortem** update audit doc “no-go” if new failure mode found.

---

## 8. Explicit program no-go criteria

Stop the line and do not proceed to next phase if:

- Production incident linked to script order or missing global
- phase3b or phase1 smokes fail on `master`
- Live verifier reports missing `window.evtOpenDetail`, `EventsManage`, or `PortalEvents.detail.open`
- Inline handler renamed without HTML/template update
- Multiple concerns in one PR (split + compat + html)
- Skipping staging before 5L

---

## 9. Should the next implementation be `detail/fragments.js`?

**Yes.**

| Criterion | fragments | evtOpenDetail split | 5E.2 exports | 5L module entry |
| --- | --- | --- | --- | --- |
| Blast radius | Small | Large | Medium | Critical |
| HTML tags | +1 | +2–4 | +1 | −20 |
| Unblocks 5H | Yes (shared helpers stable) | — | No | No |
| Matches checkpoint `024` | Yes | Deferred | Deferred | Deferred |

**Sequence:** **5F-prep (fragments)** → **5G (audit doc)** → **5H.1 data slice** → … → **5J** → **5K** → **5L**.

Do **not** skip 5G audit before 5H. Do **not** jump to 5L.

---

## 10. Related documents

| Doc | Role |
| --- | --- |
| `020_phase_5_readiness_and_execution_plan.md` | Original Phase 5 program |
| `021_phase_5d_detail_split_plan.md` | Detail extraction boundaries |
| `022_phase_5d_completion_status.md` | 5D sign-off |
| `023_phase_5e_export_wiring_plan.md` | Export options; 5E.1 vs 5E.2 |
| `024_phase_5e_checkpoint_status.md` | Pause point (5B–5E.1) |

---

## 11. Sign-off (planning)

| Item | Status |
| --- | --- |
| Remaining path documented | **Yes** |
| Line counts captured | **Yes** |
| Next implementation identified | **`detail/fragments.js` (5F-prep)** |
| 5E.2 / 5F / render split deferred | **Yes** |
| Runtime / HTML changes in this task | **None** |

**Ready for review:** commit this roadmap, then open implementation PR for **5F-prep** only.
