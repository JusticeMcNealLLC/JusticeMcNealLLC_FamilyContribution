# Phase 8 — Delegated actions & init hardening (complete)

**Status:** Complete (2026-05-25)  
**Build:** `events.bundle.js?v=123+`

## Summary

Replaced inline `onclick="evt*"` with `data-evt-action` delegated clicks. `init.js` imports boot handlers directly. Legacy create modules use `export` + `publishGlobals()`.

## Deliverables

| Item | Path |
|------|------|
| Action delegate + `evtDataAction()` | `core/actions.js` |
| Global publish helper | `compat/publish-globals.js` |
| Manage → list sync listener | `list/manage-sync.js` |
| Contributor guide | `js/portal/events/CONTRIBUTING.md` |
| Smoke | `test/_smoke-phase8-actions-delegate.js` |

## Verification

```bash
npm run build:events
node test/_smoke-phase8-actions-delegate.js
node test/_smoke-events-bundle.js
node test/_smoke-phase5l-readiness.js
```

## Remaining optional follow-ups

- Import between modules instead of `globalThis` for internal-only calls
- ESM `export` on `js/components/events/*`
- Trim `compat/global-reexports.js` once external callers migrate
- Convert `core/raffle-model.js` UMD → ESM if bundle-only
