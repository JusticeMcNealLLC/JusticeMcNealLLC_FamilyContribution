# Portal Events — compat layer

| File | Status |
|------|--------|
| `publish-globals.js` | **Active** — assign `globalThis` + `window` for HTML-facing handlers |
| `global-reexports.js` | **Active** — mirrors key `globalThis.evt*` → `window` at end of bundle |
| `inline-handlers.js` | Archive — Phase 4F inventory; not in production bundle |
| `window-exports.js` | Archive — Phase 5L.4 API; not in production bundle |
| `external-globals.js` | Archive — test / future helpers; not in production bundle |

Production boot: `events.bundle.js` (esbuild IIFE from `main.js`).

UI clicks use **`core/actions.js`** delegated `data-evt-action` (see `CONTRIBUTING.md`).

| Command | Purpose |
|---------|---------|
| `npm run build:events` | Verify `main.js` + bundle to `events.bundle.js` |
| `npm run dev:events` | Watch mode — rebuild bundle on save |
| `npm run verify:events-main` | Validate `main.js` import list |

Optional dev: `portal/events.dev.html` loads `main.js` as `type="module"` (many requests).
