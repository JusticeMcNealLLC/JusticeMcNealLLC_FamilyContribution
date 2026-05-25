# Portal Events — contributor guide

Production loads a single bundle: `main.js` → `npm run build:events` → `events.bundle.js`.

## Adding or changing a module

1. Put code in the right feature folder (`list/`, `detail/`, `create/`, `manage/`, `engagement/`, `team/`, `core/`).
2. Add an `import './your/module.js'` line to **`main.js`** in the correct order (dependencies first).
3. Run `npm run verify:events-main` and `npm run build:events`.
4. Bump `events.bundle.js?v=` in `portal/events.html`.

## Module conventions (ESM)

Each module should follow this pattern:

```javascript
'use strict';

// 1. Imports from siblings (preferred over globalThis)
import { evtDataAction } from '../core/actions.js';

// 2. Named functions / exports
export function evtDoSomething(id) { /* … */ }

// 3. HTML-facing globals only (for data-evt-action delegate + legacy callers)
import { publishGlobals } from '../compat/publish-globals.js';
publishGlobals({ evtDoSomething });
```

**Do not** assign `globalThis.evt*` by hand — use `publishGlobals()`.

**Do not** add new inline `onclick="evt…"` in HTML templates. Use delegated actions:

```javascript
import { evtDataAction } from '../core/actions.js';

// In template strings:
`<button type="button" ${evtDataAction('evtHandleRsvp', eventId, 'going')}>RSVP</button>`
```

Static markup in `portal/events.html`:

```html
<button type="button" data-evt-action="evtCloseFullscreenMap">Close</button>
```

The delegate in `core/actions.js` resolves handlers from `globalThis` at click time.

## When to use globals vs imports

| Use | When |
|-----|------|
| **`import`** | New code calling another module from JS |
| **`publishGlobals()`** | Handler referenced from HTML (`data-evt-action`) or external pages |
| **`globalThis` reads** | Shared session state (`evtCurrentUser`, `evtAllEvents`) until state module migration |

`init.js` imports boot dependencies directly — do not add `evtHandler()` lookups there.

## Compat folder

| File | Status |
|------|--------|
| `publish-globals.js` | **Active** — use in every module with HTML-facing handlers |
| `global-reexports.js` | **Active** — mirrors key `globalThis.evt*` → `window` for inline legacy |
| `inline-handlers.js`, `window-exports.js`, `external-globals.js` | **Archive** — kept for Phase 4F/5J smokes only; not in bundle |

## Commands

```bash
npm run verify:events-main
npm run build:events
npm run dev:events          # watch rebuild
node test/_smoke-events-bundle.js
node test/_smoke-phase8-actions-delegate.js
```
