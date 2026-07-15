# Events Refactor — Phase 5E Checkpoint Status

**Document:** `024_phase_5e_checkpoint_status.md`  
**Date:** 2026-05-21  
**Status:** **Checkpoint / pause recommended** — Phases 5B–5E.1 complete on `master`  
**Latest code commit:** `c075ede` (5E.1 nested namespace aliases)  
**Related:** `020_phase_5_readiness_and_execution_plan.md`, `022_phase_5d_completion_status.md`, `023_phase_5e_export_wiring_plan.md`

---

## 1. Summary

Portal Events refactor work through **Phase 5E.1** is **complete**, **static-smoke verified**, and **production-deployed** (detail extractions live-QA’d in prior gates). The codebase is in a **stable checkpoint**; further export consolidation or module entry should **not** proceed without a new audit and explicit approval.

### Completed work

| Phase | Deliverable | Commit (representative) | Notes |
| --- | --- | --- | --- |
| **5B** | `js/portal/events/team/chat.js` | `513da50` | Team Chat UI, Realtime, `evtOpenTeamChat` / `evtSendTeamChatMessage` / `evtCleanupTeamChat` |
| **5C** | `js/portal/events/team/tools.js` | `20e990a` | CTA bar, Team Tools panel, bottom nav, `evtOpenTeamToolsPanel` |
| **5D.1** | `js/portal/events/detail/presentation.js` | `e2dc6f9` | Markdown, lightbox, section animations, live countdown |
| **5D.2** | `js/portal/events/detail/raffle-render.js` | `3993b54` | Raffle prize/winner HTML, locked desktop block |
| **5D.3** | `js/portal/events/detail/map-overlay.js` | `dd1a5d1` | Fullscreen map open / recenter / close |
| **5E plan** | `023_phase_5e_export_wiring_plan.md` | `8ede59d` | Export map audit; options A–D |
| **5E.1** | Nested aliases on `PortalEvents.detail` | `c075ede` | `detail.presentation`, `detail.raffleRender`, `detail.mapOverlay`, `detail.team` |

### Documentation milestones

| Doc | Purpose |
| --- | --- |
| `021_phase_5d_detail_split_plan.md` | 5D extraction boundaries |
| `022_phase_5d_completion_status.md` | 5D.1–5D.3 sign-off + live QA |
| `023_phase_5e_export_wiring_plan.md` | Export surfaces; 5E.1 vs 5E.2 vs 5F |

### Export model after 5E.1

Each extracted module still owns **`window.evt*`** and its **submodule namespace** (`PortalEvents.detail.presentation`, `PortalEvents.team.chat`, etc.). `detail.js` continues to provide:

- **Flat bridges** — `detail.miniMarkdown`, `detail.openTeamChat`, `detail.raffleConfig`, …
- **Nested aliases (5E.1)** — `detail.presentation`, `detail.raffleRender`, `detail.mapOverlay`, `detail.team` → same objects as owner modules
- **Registry** — `detail.register('rsvp' | 'raffle' | …)`
- **Main render** — `async function evtOpenDetail` (~1,160 lines)

---

## 2. Current Script Model

`portal/events.html` loads portal Events as **classic scripts** (no bundler, no `type="module"` on feature files).

### Detail / team slice (load order)

```text
../js/portal/events/team/chat.js
../js/portal/events/team/tools.js
../js/portal/events/detail/presentation.js
../js/portal/events/detail/raffle-render.js
../js/portal/events/detail/map-overlay.js
../js/portal/events/detail.js
```

Preceded by: `index.js`, `constants.js`, `state.js`, `utils.js`, `raffle-model.js`, `list.js`, …  
Followed by: `comments.js`, `rsvp.js`, `create.js`, …, **`init.js` last** among `js/portal/events/*`.

### Invariants (unchanged since Phase 5D)

| Invariant | Status |
| --- | --- |
| **No `type="module"`** on portal Events feature scripts | Yes — Phase 5F deferred |
| **`init.js` remains last** | Yes — Phase 1 duplicate-init guard intact |
| **Legacy `window.evt*` globals preserved** | Yes — inline `onclick` and smokes depend on them |
| **`EventsCreate` / `EventsManage` / `EventsRaffleModel`** | Unchanged (other portal modules) |
| **`compat/window-exports.js` not in HTML** | Yes — not wired in 5E.1 |
| **`detail/exports.js` does not exist** | Yes — 5E.2 not started |

### Standard regression gate

```bash
node test/_smoke-phase1-bridge.js
node test/_smoke-phase3b-detail-bridge.js   # 147 checks incl. 5E.1 aliases
node test/_smoke-event-team-tools-ui.js
node test/_smoke-event-team-chat-ui.js
node test/_smoke-portal-event-raffle-rsvp-parity.js
```

---

## 3. Current Status

The Events refactor is **stable and safe to pause here**.

| Area | State |
| --- | --- |
| Team Chat / Team Tools | Extracted, bridged, live-verified historically |
| Detail presentation / raffle / map overlay | Extracted, live-verified (`022`) |
| Export discoverability | 5E.1 nested aliases shipped (`c075ede`) |
| `detail.js` size | ~1,161 lines — main `evtOpenDetail` + `_ed*` fragments remain |
| Production | `master` through `c075ede` pushed to `origin/master` |
| Known local noise | Unrelated unstaged files (`css/**`, `md/**`, etc.) — not part of this checkpoint |

**No open blocker** requires immediate 5E.2 or 5F work.

---

## 4. What Not To Start Yet

Defer until a **new audit + explicit go** (see `023` §8):

| Item | Why defer |
| --- | --- |
| **5E.2 — `detail/exports.js`** | Requires new `<script>` in `portal/events.html`; moves flat bridge block out of `detail.js` |
| **Broad `compat/window-exports.js` wiring** | Designed for orchestrated / module-entry consolidation; risk of order bugs if enabled early |
| **Phase 5F — single module entry** | Needs full global inventory, HTML script list reduction, live globals verifier, rollback rehearsal |
| **Main `evtOpenDetail()` render split** | Highest blast radius (~900+ lines, Supabase, inline handlers); separate micro-audit required (`021` §1) |

Also **out of scope** for this program unless separately approved: public `js/events/**`, admin dashboard Events, new Supabase migrations for refactor-only work.

---

## 5. Recommended Next Step

### Preferred: pause Events refactor

Treat **5B–5E.1** as a completed tranche. Move to **another page or product feature** until Events detail work is prioritized again.

### If continuing Events later (pick one path)

| Path | Action |
| --- | --- |
| **A — Low risk** | New audit for `detail/fragments.js` (`_edMetaRow`, `_edCard`, `_edSectionHead`, …) before any render split |
| **B — High risk** | New audit for `evtOpenDetail()` subsection split (`021` render table); not combined with 5E.2/5F |
| **C — Export only** | Revisit **5E.2** only after approving HTML change + live asset QA |

**Do not** start 5E.2, compat wiring, 5F, or main render split in the same PR as unrelated features.

### Optional housekeeping (non-blocking)

- Add live deploy checks for all `detail/*` scripts in `_qa-event-team-chat-live.js`
- Add `024`-style checkpoint note to team chat completion doc cross-link
- Run `node test/_verify-events-live-globals.js` after next production deploy

---

## 6. Commit Reference (checkpoint line)

| Phase | Commit | Message |
| --- | --- | --- |
| 5B | `513da50` | Extract Event Team Chat from detail module |
| 5C | `20e990a` | Extract Event Team Tools from detail module |
| 5D.1 | `e2dc6f9` | Extract Event detail presentation helpers |
| 5D.2 | `3993b54` | Extract Event detail raffle render helpers |
| 5D.3 | `dd1a5d1` | Extract Event detail fullscreen map overlay helpers |
| 5D doc | `6da6233` | Add Phase 5D completion status for Events refactor |
| 5E plan | `8ede59d` | Add Phase 5E export wiring plan for Events refactor |
| **5E.1** | **`c075ede`** | **Add nested PortalEvents detail namespace aliases** |

---

## 7. Sign-off

| Gate | Status |
| --- | --- |
| 5B Team Chat extraction | **Complete** |
| 5C Team Tools extraction | **Complete** |
| 5D detail micro-extractions | **Complete** |
| 5E.1 nested namespace aliases | **Complete** |
| 5E.2 / compat / 5F / render split | **Not started** (intentional) |
| Refactor pause at this checkpoint | **Recommended** |

**Events refactor checkpoint: 5B–5E.1 COMPLETE — pause before 5E.2 or 5F.**
