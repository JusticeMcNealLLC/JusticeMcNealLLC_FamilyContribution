# Portal Events — compat layer

| File | Status |
|------|--------|
| `global-reexports.js` | **Active** — loaded at end of `classic-chain-loader.js`; assigns `window.evt*` for inline handlers |
| `inline-handlers.js` | Dormant — Phase 4H grouped handler installer (not in production chain) |
| `window-exports.js` | Dormant — Phase 5L.4 `installWindowExports` API (not in production chain) |
| `external-globals.js` | Dormant — test / future module entry helpers |

Production boot: `index.js` → `classic-chain-loader.js` → `init.js`.
