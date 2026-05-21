# Events Refactor Phase 4I Live Verifier Status

Date: 2026-05-21

This document summarizes the successful consolidated live verifier run for the current portal events runtime contract. It is documentation only. It does not modify app code, edit `portal/events.html`, wire compatibility helpers into runtime, create or modify tests, touch `events-dashboard.js`, or start Phase 5.

## 1. Summary

Phase 4I ran the committed consolidated live verifier against the live site before any compatibility helper wiring or Phase 5 work.

Verifier run:

- Test file: `test/_verify-events-live-globals.js`
- Result: `67 passed, 0 failed, 0 skipped`
- Base URL: `https://justicemcneal.com`
- Runtime wiring changed: No
- `portal/events.html` changed: No
- Phase 5 started: No

The verifier confirmed that the current classic portal events runtime still exposes the expected bridge surfaces and representative legacy globals while the Phase 4F helper surfaces remain absent from the live browser path.

## 2. Admin Verification Result

Admin live verification passed.

Confirmed:

- Admin login succeeded.
- `portal/events.html` loaded.
- `window.PortalEvents.*` bridge surfaces exist.
- Legacy globals exist.
- Representative `window.evt*` functions exist.
- Duplicate init guard passed.
- Event card count remained unchanged after duplicate init.
- No duplicate create sheet root was created.
- No duplicate manage sheet root was created.
- No uncaught page errors were reported.
- No relevant console errors were reported.
- No failed portal events JS requests were reported.
- No failed portal events JS responses were reported.

Verified bridge surfaces included:

- `window.PortalEvents`
- `window.PortalEvents.initEventsPage`
- `window.PortalEvents.constants`
- `window.PortalEvents.raffleModel`
- `window.PortalEvents.list`
- `window.PortalEvents.detail`
- `window.PortalEvents.manage`
- `window.PortalEvents.create`
- `window.PortalEvents.competition`

Verified representative legacy globals included:

- `window.EventsRaffleModel`
- `window.EventsManage`
- `window.EventsCreate`
- `window.evtLoadEvents`
- `window.evtRenderEvents`
- `window.evtOpenDetail`
- `window.evtHandleRsvp`
- `window.evtOpenDocumentsPanel`
- `window.evtOpenScanner`
- `window.evtBuildCompetitionHtml`
- `window.evtJoinCompetition`
- `window.evtSubmitEntry`
- `window.evtCastVote`
- `window.evtFinalizeCompetition`

Verified representative bridge functions included:

- `window.PortalEvents.list.renderCalendar`
- `window.PortalEvents.list.matchesType`
- `window.PortalEvents.detail.open`
- `window.PortalEvents.detail.miniMarkdown`
- `window.PortalEvents.manage.open`
- `window.PortalEvents.manage.close`
- `window.PortalEvents.create.open`
- `window.PortalEvents.create.close`
- `window.PortalEvents.competition.buildHtml`
- `window.PortalEvents.competition.recalcTiers`

## 3. Member Smoke Result

Member smoke passed.

Confirmed:

- Member login succeeded.
- Events page loaded.
- `window.PortalEvents` exists for the member session.
- Admin-only create button was hidden for the member session.
- No uncaught page errors were reported.
- No relevant console errors were reported.
- No failed portal events JS requests were reported.
- No failed portal events JS responses were reported.

## 4. Baseline E2E Result

Baseline E2E was also run:

- Test file: `test/_e2e-phase1-bridge.js`
- Result: `20 checks - 20 pass, 0 fail`

The first baseline invocation could not resolve `playwright` from the default Node resolution path. The baseline was rerun successfully after setting `NODE_PATH` to the repo's existing `scripts/node_modules` dependency location. This did not change repo files.

The baseline E2E noted the known member condition:

- `evtCurrentUser=null` for the member session.

The baseline script classified this as a pre-existing account/profile issue, not a Phase 1 regression.

## 5. Bare Asset And Cache Result

The consolidated verifier confirmed that required portal events JS assets loaded and returned HTTP 200.

Checked assets:

- `/js/portal/events/init.js`
- `/js/portal/events/list.js`
- `/js/portal/events/detail.js`
- `/js/portal/events/manage/sheet.js?v=112`
- `/js/portal/events/create/sheet.js`
- `/js/portal/events/competition.js`

Cache observations:

| Asset | HTTP | CF cache status | Age | Cache-Control |
| --- | --- | --- | --- | --- |
| `/js/portal/events/init.js` | `200` | `EXPIRED` | `0` | `max-age=14400` |
| `/js/portal/events/list.js` | `200` | `EXPIRED` | `0` | `max-age=14400` |
| `/js/portal/events/detail.js` | `200` | `EXPIRED` | `0` | `max-age=14400` |
| `/js/portal/events/manage/sheet.js?v=112` | `200` | `MISS` | `0` | `max-age=14400` |
| `/js/portal/events/create/sheet.js` | `200` | `EXPIRED` | `0` | `max-age=14400` |
| `/js/portal/events/competition.js` | `200` | `EXPIRED` | `0` | `max-age=14400` |

Each required asset also reported `ETag` and `Last-Modified` headers. The verifier recorded cache state only; it did not require cache misses or freshness as a pass condition.

## 6. Phase 4F Helper Surfaces

The verifier confirmed the Phase 4F helper surfaces are still absent live, as expected:

- `window.PortalEvents.externalGlobals`
- `window.PortalEvents.windowExports`
- `window.PortalEvents.inlineHandlers`

This confirms the helpers remain unwired and are not currently part of the browser execution path.

## 7. Credential Handling

The live verification used temporary process-only environment variables for the terminal session.

Confirmed handling:

- Credentials were supplied through environment variables only.
- No credentials were written to repo files.
- No credentials were written to `.env`.
- Passwords were not printed in the final report.
- Password environment variables were cleared after the run.
- Email and base URL environment variables were also cleared after the run.
- Temporary `NODE_PATH` used for the baseline retry was cleared after the run.

## 8. Repo Cleanliness

The verification did not modify or stage files.

Confirmed:

- `git diff --staged --name-only` returned no files after verification.
- Final worktree status only showed pre-existing unrelated unstaged and untracked changes.
- `events-dashboard.js` remained outside this portal-events verifier step.

## 9. Recommendation

Recommended next step: keep helpers unwired and decide the next planning move before any runtime change.

Specifically:

- Compatibility helpers should remain unwired.
- `portal/events.html` should remain unchanged.
- Phase 5 should remain blocked.
- The next portal-events step should be a runtime integration design decision, not implementation.
- It is also reasonable to pause portal-events work and separately handle the unrelated `events-dashboard.js` worktree changes before continuing integration planning.

A future runtime integration plan should define the approved sequence, browser/page harness gates, cache checks, rollback rehearsal, and exactly when any helper may become part of the live browser execution path.
