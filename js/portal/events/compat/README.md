# Portal Events — compat layer

| File | Status |
|------|--------|
| `global-reexports.js` | **Active** — loaded at end of `classic-chain-loader.js`; assigns `window.evt*` for inline handlers |
| `inline-handlers.js` | Dormant — Phase 4H grouped handler installer (not in production chain) |
| `window-exports.js` | Dormant — Phase 5L.4 `installWindowExports` API (not in production chain) |
| `external-globals.js` | Dormant — test / future module entry helpers |

Production boot: `events.bundle.js` (esbuild IIFE from `main.js`).

| Command | Purpose |
|---------|---------|
| `npm run build:events` | Verify `main.js` + bundle to `events.bundle.js` |
| `npm run dev:events` | Watch mode — rebuild bundle on save |
| `npm run verify:events-main` | Validate `main.js` import list |

Optional dev: `portal/events.dev.html` loads `main.js` as `type="module"` (many requests).
