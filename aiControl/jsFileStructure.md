# JavaScript File Structure

Guidelines for organizing JavaScript in this project.

## Core rules

1. **Max file size:** Each `.js` file must not exceed **500 lines of code**.
2. **Page entry point:** Every page has one `index.js` that is imported into the HTML. It wires the page together and does not hold large amounts of logic.
3. **Split by purpose:** Supporting files are separated by the section they affect or the job they perform (parsing, rendering, UI, state, export, utilities, etc.).
4. **Organize with folders:** Use folders and files to reflect responsibility — not one large flat file per page.

## Directory layout

JavaScript mirrors the page structure under `pages/`:

```
js/
  components/             ← shared UI used across many pages (not page-specific)
    pageShell/            ← portal/admin nav shell (see pageShell/README.md)
  pages/
    {pageName}/
      index.js              ← entry point (imported by the HTML page)
      state/                ← shared state, constants, sample/fixture data
      parse/                ← input parsing and normalization
      render/               ← DOM / SVG rendering
      export/               ← export actions (PNG, etc.)
      ui/                   ← event handlers, theme, errors, panel behavior
      utils/                ← small shared helpers (escape, format, etc.)
```

Not every page needs every folder. Only create folders that match real responsibilities on that page.

**HTML pages** live under `pages/{pageName}/` (e.g. `pages/login/`, `pages/portal/`, `pages/reset-password/`). **Page-specific JS** stays in `js/pages/{pageName}/` when using the module pattern; portal feature code remains in `js/portal/` for now.

**Shared components** (nav shell, notifications wrapper, etc.) belong under `js/components/`, not `js/pages/`. Page-specific logic stays in `js/pages/{pageName}/`. Legacy portal feature bundles remain under `js/portal/` until migrated.

## Example: `portal` dashboard

```
js/pages/portal/
  index.js
  loaders/
    dashboard.js
    subscription.js
    nextMilestone.js
    cpStatus.js
  ui/
    greeting.js
    activityCarousel.js
    successBanner.js
  utils/
    billingDate.js
    subscriptionStatus.js
```

Domain tier data stays in `js/portal/milestones/state/tiers.js` and `js/portal/quests/state/cpTiers.js`.

## `index.js` responsibilities

The page `index.js` should:

- Import modules from supporting files
- Register `DOMContentLoaded` (or equivalent) initialization
- Attach event listeners to buttons, inputs, and controls
- Call setup functions exported from other modules

The page `index.js` should **not**:

- Contain large parsing, rendering, or export implementations
- Exceed 500 lines
- Duplicate logic that belongs in a supporting file

## HTML import

Use ES modules with no build step:

```html
<script type="module" src="../../js/pages/{pageName}/index.js"></script>
```

Supporting files are imported from `index.js` (or from each other) using relative paths:

```js
import { buildFullPrompt } from "./export/formatMarkdown.js";
```

## Naming conventions

| Item | Convention | Example |
|------|------------|---------|
| Page entry | `index.js` | `js/pages/promptMaker/index.js` |
| State / config | `state/{name}.js` | `state/settings.js` |
| Parsing | `parse/{format}.js` | `parse/drawioXml.js` |
| Rendering | `render/{target}.js` | `render/nodes.js` |
| UI behavior | `ui/{panel}.js` | `ui/import.js` |
| Utilities | `utils/{name}.js` | `utils/escape.js` |

Use **camelCase** file names that describe the file's purpose.

## When to split a file

Split when:

- A file approaches or exceeds 500 lines
- A file handles more than one clear responsibility
- Logic can be reused or tested in isolation
- A section (import panel, renderer, theme, export) has enough code to stand alone

Keep together when:

- The code is a few small related helpers
- Splitting would create unnecessary indirection

## Example: `promptMaker`

```
js/pages/promptMaker/
  index.js
  state/
    defaults.js       ← sample JMLF structure
    nodeStyles.js     ← Main Node / Sub Node / Sub Node 2
    prompt.js         ← in-memory document + mutations
  export/
    formatText.js     ← short chart-details block
    formatHierarchy.js
    formatMarkdown.js ← full AI prompt template
    formatJson.js
  render/
    form.js           ← header + node card DOM
  ui/
    bindForm.js
    preview.js
    refresh.js
    copy.js
    download.js
```

## Checklist for new pages

- [ ] Create `js/pages/{pageName}/index.js` as the only script tag on the page
- [ ] Keep `index.js` under 500 lines
- [ ] Place logic in subfolders by section or purpose
- [ ] Ensure no supporting file exceeds 500 lines
- [ ] Use ES module `import` / `export` between files
