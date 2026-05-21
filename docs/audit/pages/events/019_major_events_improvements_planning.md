# Events Refactor Phase 4J Major Events Improvements Planning

Date: 2026-05-21

This document plans the next major Events page improvement phase before any user-facing implementation starts. It is documentation only. It does not modify app code, edit `portal/events.html`, wire compatibility helpers into runtime, create tests, touch `events-dashboard.js`, or start Phase 5.

## 1. Current Refactor Checkpoint

Current portal-events status:

- Phase 1 through Phase 3E bridge work is complete.
- Phase 4 planning is complete.
- Phase 4F compatibility helpers are implemented but unwired.
- Phase 4H local-only runtime harnesses are complete for all three compatibility helpers.
- Phase 4I live verifier passed against the live site.
- `portal/events.html` is still classic-script based and stable.
- The Phase 4F helper surfaces remain absent live, as expected.
- No compatibility helper is loaded by `portal/events.html`.
- No compatibility helper is imported by runtime code.
- No Phase 5 module-entry switch has started.

The current classic runtime is therefore verified and stable enough to support carefully scoped improvements. It is not yet proven enough for broad deletion, architecture replacement, or large data-flow rewrites without more planning and seeded tests.

## 2. Why Heavy Improvements Need Planning First

The next Events improvements are not small polish tasks. They may delete old systems, add new systems, replace existing flows, introduce new data surfaces, and change member/admin/host experiences. Those changes can easily cross runtime boundaries that the current refactor deliberately protected.

Planning is needed before coding because:

- The page still depends on classic script order and legacy `window.evt*` handler names.
- Generated markup still calls inline handlers.
- Create, manage, detail, RSVP, waitlist, documents, map, scanner, raffle, and competition flows share state through current globals.
- Heavy UI changes can hide broken data or permission paths unless seeded fixtures exist.
- New systems may need database schema, storage, Edge Function, RLS, notification, analytics, or permission changes.
- Removing code before proving all callers are gone can break live inline handlers and cross-file calls.
- Browser cache and Cloudflare behavior can make rollout and rollback harder if multiple JS assets change at once.
- The unrelated dirty `events-dashboard.js` worktree state should not be mixed into portal-events runtime planning or commits.

The safest posture is to decide the improvement category first, then choose whether it can happen on the current classic runtime or needs additional test, compatibility, schema, or module-entry gates.

## 3. Categories Of Possible Heavy Changes

Potential heavy improvement categories include:

- Deletions of old systems, unused handlers, unused markup paths, stale tabs, legacy globals, or duplicate rendering paths.
- Additions of new systems such as event recommendations, richer RSVP workflows, host dashboards, attendee tools, notifications, analytics, or payment-aware experiences.
- Replacement of existing event flows such as list browsing, detail routing, create sheet, manage sheet, RSVP, waitlist, raffle, competition, documents, map, scanner, or comments.
- New UI/UX layouts for event discovery, detail pages, mobile navigation, hosted-event controls, member dashboards, or admin operations.
- New admin/manage flows for approvals, event lifecycle, documents, payouts, reporting, or moderation.
- New database-backed features requiring tables, columns, views, functions, storage buckets, or Edge Functions.
- New analytics/tracking for event views, RSVP conversion, host actions, waitlist movement, document activity, or competition engagement.
- New permission roles for admin, host, co-host, member, guest, approver, finance, or document manager capabilities.
- New public, member, host, and admin experiences that may share data but need different permissions and UI affordances.

## 4. Decision Matrix

| Change type | Safe before Phase 5? | Needs better tests first? | Needs helpers wired first? | Needs Phase 5/module entry? | Needs schema/RLS work? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Copy, spacing, icons, labels, minor layout adjustments | Yes | Basic smoke/live verifier | No | No | No | Keep changes small and verify current classic globals stay intact. |
| Additive UI inside existing list/detail sections using existing data | Usually | Seeded list/detail fixtures recommended | No | No | No | Prefer classic-runtime-safe changes if existing data contracts are unchanged. |
| Additive create/manage UI using existing fields | Sometimes | Create/manage seeded E2E required | No | No | No | Avoid changing sheet lifecycle, singleton roots, or permissions without targeted tests. |
| Deleting old handlers, globals, tabs, or fallback paths | No | Yes | Often | Sometimes | No | Deletions are risky while inline handlers and cross-file calls still exist. Search and live verification are not enough by themselves. |
| Replacing RSVP or waitlist flow | Not yet | Yes | Maybe | No, unless architecture changes | Maybe | Needs seeded members, event capacity cases, auth states, and permission checks. |
| Replacing competition, raffle, or documents/storage flows | Not yet | Yes | Maybe | Maybe | Maybe | These touch richer data/storage/action paths and need E2E plus rollback. |
| New database-backed feature | No | Yes | Maybe | Not inherently | Yes | Requires migration, RLS, seed data, and admin/member permission tests. |
| New analytics/tracking | Sometimes | Yes | No | No | Maybe | Must avoid blocking page boot, leaking sensitive data, or creating noisy failures. |
| New permission roles | No | Yes | Maybe | Not inherently | Yes | Requires RLS, UI visibility checks, and negative tests. |
| Large component/module split or global ownership rewrite | No | Yes | Yes | Usually | No | Better aligned with Phase 5 or a dedicated integration phase. |
| One-module `portal/events.html` entry | No | Yes | Yes | Yes | No | This is Phase 5 and should remain blocked until explicitly approved. |

## 5. Should Phase 5 Happen Before Improvements?

Phase 5 should not be required before all heavy improvements.

Recommended decision:

- Do not make Phase 5 a blanket prerequisite for user-facing improvements.
- Do require Phase 5 or a module-entry rehearsal for improvements that depend on new module ownership, broad file splitting, deleting compatibility globals, or replacing the script-loading model.
- Allow carefully scoped improvements on the current classic runtime when they preserve existing globals, do not require helper wiring, do not delete inline handler surfaces, and have adequate seeded tests.

The Phase 4I verifier proves the current classic runtime contract is healthy. That makes the classic runtime a viable base for additive, scoped improvements. It does not make large deletions, data-model changes, permission changes, or flow replacements safe by itself.

## 6. Safest Next Phase Sequence

Recommended sequence before heavy implementation:

1. Create a feature roadmap for major Events improvements.
2. Classify each proposed feature using the decision matrix in this document.
3. Add seeded fixtures and E2E coverage for the flows that the first feature will touch.
4. Run the consolidated live verifier and baseline smoke suite before implementation.
5. Implement one bounded improvement at a time on the current classic runtime when possible.
6. Keep compatibility helpers unwired unless a specific approved integration step needs them.
7. Reserve Phase 5/module entry for architecture changes that truly require module ownership or script-list replacement.
8. Re-run live verifier, targeted seeded E2E, cache checks, and rollback notes after each bounded improvement.

This sequence lets user-facing work proceed without forcing Phase 5 too early, while still preventing large untested rewrites.

## 7. Tests Needed Before Heavy Improvements

Before heavy Events improvements, add or confirm seeded coverage for:

- Seeded event list with at least one upcoming event, one hosted/admin-visible event, one member-visible event, and one edge-case empty/hidden state.
- Detail page routing from list click and direct URL.
- Manage sheet open, close, tab rendering, save/update, delete/disabled states, and singleton root behavior.
- Create sheet open, close, step navigation, validation, image upload path, and singleton root behavior.
- RSVP and waitlist flows for available capacity, full capacity, cancel, rejoin, and permission/auth states.
- Competition flows for join, submit, vote, moderate, phase advance, finalize, and tier recalculation.
- Documents/storage flows for upload, list, open/download, delete, and permission failures.
- Map and scanner flows for optional dependencies, missing APIs, open/close behavior, and mobile-safe failure states.
- Member/admin/host permissions, including negative checks for hidden admin-only controls.
- Live global verifier checks after any runtime-affecting change.
- Cache verification for any changed bare JS assets.

## 8. Key Risks

Heavy improvements carry these risks:

- Breaking the current classic runtime by changing load order, global names, or initialization ownership.
- Deleting code still used by inline handlers, generated markup, cross-file calls, or external pages.
- Changing flows without seeded data, causing tests to pass only against empty states.
- Mixing unrelated `events-dashboard.js` work with portal-events work, making review and rollback harder.
- Creating schema/RLS drift between UI assumptions and Supabase permissions.
- Introducing Cloudflare stale-asset issues when changed JS, HTML, and service worker behavior are not verified together.
- Making broad UI replacements before proving create/manage/detail/RSVP/competition/document flows still work for admin, host, and member roles.
- Wiring compatibility helpers or starting Phase 5 as a side effect of user-facing work.

## 9. Final Recommendation

Final recommendation:

- Do not finish Phase 5 before every heavy improvement.
- Do finish feature roadmap and seeded test fixtures before heavy improvements.
- Do require Phase 5 only for improvements that need module-entry ownership, script-list replacement, or broad compatibility-global deletion.
- Do keep helpers unwired until a reviewed runtime integration step explicitly needs them.
- Do keep `portal/events.html` unchanged until an approved script-loading rehearsal or Phase 5 step.

The next safest single step is to create a major Events feature roadmap that ranks proposed improvements and labels each one as classic-safe, test-gated, helper-integration-gated, Phase-5-gated, or schema/RLS-gated.

If portal-events work pauses before that roadmap, handle the unrelated `events-dashboard.js` worktree changes separately and in their own scope. Do not combine admin dashboard cleanup with portal-events runtime or user-facing Events improvements.
