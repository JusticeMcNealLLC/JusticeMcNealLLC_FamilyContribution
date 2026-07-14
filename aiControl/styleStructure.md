# CSS / Style Structure

Guidelines for organizing styles in this project. Visual tokens and brand rules live in [websiteTheme.md](./websiteTheme.md). JavaScript layout rules live in [jsFileStructure.md](./jsFileStructure.md).

## Core rules

1. **One theme:** All new UI uses **Theme_JMLLC001** tokens — not legacy `brand-*`, indigo, or one-off hex in markup when a theme utility exists.
2. **Layered stylesheets:** Load CSS in a fixed order (theme → Tailwind → shared → page). Later layers override earlier ones only when intentional.
3. **Shared vs page-specific:** Shell chrome and cross-page utilities belong in shared CSS. Layout and components unique to one HTML page belong in `css/pages/…`.
4. **Pick one portal page convention:** For a given page, prefer **either** a small page CSS file **or** Tailwind utilities in HTML — not an ad hoc mix of both for the same patterns.
5. **Rebuild Tailwind after token changes:** `css/tailwind.Theme_JMLLC001.css` is compiled. Run `npm run build:tailwind:Theme_JMLLC001` when adding utilities or changing the theme config.

## Stylesheet stack (load order)

Every page should follow this order in `<head>`:

```html
<link rel="stylesheet" href="…/theme/Theme_JMLLC001/Theme_JMLLC001.css">
<link rel="stylesheet" href="…/css/tailwind.Theme_JMLLC001.css">
<link rel="stylesheet" href="…/css/shared.css">
<!-- optional: page-specific -->
<link rel="stylesheet" href="…/css/pages/{area}/{page}.css">
```

| Layer | File | Purpose |
|-------|------|---------|
| 1 — Theme tokens & base | `theme/Theme_JMLLC001/Theme_JMLLC001.css` | CSS variables (`--color-primary`, fonts, shadows), minimal reset, base element styles (links, buttons) |
| 2 — Utilities | `css/tailwind.Theme_JMLLC001.css` | Prebuilt Tailwind classes (`bg-primary`, `text-foreground`, `font-headline`, layout, spacing) |
| 3 — Shared | `css/shared.css` | Page shell (sidebar, tab bar, drawer, notification panel), cross-page animations/utilities, admin chrome |
| 4 — Page (optional) | `css/pages/{area}/{name}.css` | Styles used on one page (or one screen) only |

**Example — portal dashboard** (`pages/portal/index.html`) uses **Option A** (page CSS only for visuals; Tailwind limited to layout utilities like `flex`, `grid`, `gap`, `hidden`):

```html
<link rel="stylesheet" href="../../theme/Theme_JMLLC001/Theme_JMLLC001.css">
<link rel="stylesheet" href="../../css/tailwind.Theme_JMLLC001.css">
<link rel="stylesheet" href="../../css/shared.css">
<link rel="stylesheet" href="../../css/pages/portal/index.css">
```

Dashboard semantic classes live in `css/pages/portal/index.css` (e.g. `.dashboard-hero-card`, `.quick-btn--history`). Do not duplicate those colors in Tailwind utilities on the same elements.

**Example — login** (no page CSS, no shell):

```html
<link rel="stylesheet" href="../../theme/Theme_JMLLC001/Theme_JMLLC001.css">
<link rel="stylesheet" href="../../css/tailwind.Theme_JMLLC001.css">
<link rel="stylesheet" href="../../css/pages/login.css">
```

Login uses `css/pages/login.css` instead of `shared.css` because it has no portal/admin shell.

## What belongs where

### Theme (`Theme_JMLLC001.css`)

- Design tokens only + global base styles
- Do **not** put page layout or shell components here

### Tailwind build (`tailwind.Theme_JMLLC001.css`)

- Utility classes generated from `theme/Theme_JMLLC001/tailwind.config.Theme_JMLLC001.js`
- Prefer theme utilities over hard-coded colors in HTML
- For repeated portal patterns, consider `@layer components` in the Tailwind source (see [Portal page styling convention](#portal-page-styling-convention))

### Shared (`shared.css`) — current + target

**Today:** one file (~1,500 lines) covering shell, utilities, badges, and admin styles.

**Responsibilities (keep these in shared, not page CSS):**

| Area | Classes / selectors | Used by |
|------|---------------------|---------|
| Portal desktop sidebar | `.portal-side-nav`, `.portal-nav-link` | `pageShell` (portal pages) |
| Mobile tab bar | `.bottom-tab-bar`, `.has-bottom-bar` | `pageShell` |
| Nav drawer | `.nav-drawer`, `.nav-drawer-item` | `pageShell` |
| Notification panel | `.notif-panel`, `.notif-item` | `pageShell` + notifications JS |
| Cross-page utilities | `.skeleton`, `.fade-in`, `.pulse-dot`, `.stat-number` | Many portal/admin pages |
| Badge chips | `.badge-chip`, `.badge-chip-overlay` | Profiles, nav, quests |
| Admin sidebar | `#sideNav`, `.nav-admin-link` | Admin pages |

**Target layout (incremental split — do not big-bang unless migrating):**

```
css/
  shared.css              ← thin aggregator @import (or load multiple links)
  shell/
    portal-sidebar.css
    tab-bar.css
    drawer.css
    notifications.css
  utilities/
    animations.css        ← skeleton, fade-in, pulse-dot
    badges.css
  admin/
    sidebar.css           ← admin pages only
  pages/
    portal/
      index.css           ← dashboard-only
    login.css
    …
```

Admin HTML can load `css/admin/sidebar.css` (or equivalent) **instead of** pulling admin rules on every portal page once split.

### Page-specific (`css/pages/…`)

Use when:

- Layout or components exist on **one** HTML file (e.g. dashboard hero card, activity carousel grid)
- Markup would become unreadable if every repeated block used 8+ Tailwind classes
- Responsive behavior is unique to that page (`#activityTrack` desktop grid vs mobile carousel)

Do **not** use page CSS for:

- Sidebar, tab bar, drawer, notification panel ( → shared )
- Colors/fonts already covered by theme + Tailwind ( → utilities )
- Logic duplicated on multiple portal pages ( → shared or Tailwind `@layer components` )

## Portal page styling convention

Choose **one** primary approach per page:

### Option A — Page CSS file (current dashboard pattern)

- Semantic classes: `.dashboard-hero-card`, `.card-bg`, `.progress-fill`
- HTML stays shorter; change the look in one file
- **Use for:** complex single pages (dashboard), unique layouts

### Option B — Tailwind in HTML

- All styling via utility classes; no page CSS file
- **Use for:** simple pages, prototypes, or when classes are not repeated

### Option C — Tailwind component layer (recommended middle ground)

Define reusable portal components once in the Tailwind source, rebuild:

```css
@layer components {
  .portal-card {
    @apply bg-background border border-border shadow-card rounded-2xl;
  }
  .portal-eyebrow {
    @apply text-[10px] font-bold uppercase tracking-widest text-primary;
  }
}
```

- **Use for:** patterns shared across multiple portal pages without bloating HTML

**Rule:** Do not define the same pattern in both page CSS and Tailwind components.

## Mapping theme tokens to Tailwind

| CSS variable (`Theme_JMLLC001.css`) | Tailwind utility |
|-------------------------------------|------------------|
| `--color-primary` | `primary`, `bg-primary`, `text-primary` |
| `--color-accent` | `accent`, `bg-accent`, `text-accent` |
| `--color-accent-soft` | `bg-accent-soft` |
| `--color-surface` | `bg-surface` |
| `--color-border` | `border-border` |
| `--color-text` / `--color-text-muted` | `text-foreground`, `text-muted` |
| `--font-headline` | `font-headline` |
| `--font-body` | `font-body` |
| `--shadow-sm` / `--shadow-md` | `shadow-card`, `shadow-card-md` |

Prefer these over inline `style="color:#13366e"` or legacy `brand-600`.

## Relationship to `pageShell`

Portal and admin pages inject chrome via `js/components/pageShell/`. That markup expects classes defined in **`shared.css`** (not in page CSS).

Required placeholders on shell pages:

- `#nav-placeholder`
- `#footer-placeholder`
- `#tabs-placeholder` (portal mobile)

Shell pages should **always** include `shared.css` unless the shell styles have been moved to a dedicated `css/shell/` bundle loaded explicitly.

## Migration roadmap (recommended order)

1. **Theme-align shell** — Replace legacy indigo/`brand-*` in `shared.css` and pageShell render strings with theme tokens.
2. **Split `shared.css`** — Extract shell, utilities, and admin into separate files; keep a single import path for compatibility.
3. **Standardize portal pages** — As each portal HTML file is themed, pick page CSS *or* Tailwind components; remove duplicate one-off styles.
4. **Optional: drop page CSS where trivial** — e.g. replace `css/pages/portal/index.css` with utilities or `@layer components` when the dashboard stabilizes.

Do **not** remove `shared.css` entirely until shell styles live elsewhere.

## Anti-patterns

- Loading legacy `css/tailwind.portal.css` on Theme_JMLLC001 pages
- Duplicating shell styles in page CSS
- New hex colors in HTML when a theme token exists
- Adding utilities by editing the compiled `tailwind.Theme_JMLLC001.css` by hand (edit config + rebuild)
- Inline `<style>` blocks except tiny page-specific overrides (prefer page CSS file)

## Checklist for new pages

- [ ] Load `Theme_JMLLC001.css` + `tailwind.Theme_JMLLC001.css`
- [ ] Load `shared.css` if the page uses portal/admin shell (`data-page-type`, pageShell placeholders)
- [ ] Add `css/pages/…` only if the page has unique layout not covered by utilities or shared components
- [ ] Use theme utilities (`text-primary`, `bg-surface`) instead of legacy `brand-*` / raw hex
- [ ] Set `<meta name="theme-color" content="#13366e">`
- [ ] If new Tailwind classes are needed, update `tailwind.config.Theme_JMLLC001.js` and rebuild
- [ ] Document any new shared pattern in this file or move it into shared/shell CSS

## Related files

| Doc / path | Role |
|------------|------|
| [websiteTheme.md](./websiteTheme.md) | Brand colors, typography, usage |
| [jsFileStructure.md](./jsFileStructure.md) | JS module layout (mirrors `pages/` under `js/pages/`) |
| `theme/Theme_JMLLC001/` | Theme source + Tailwind config |
| `js/components/pageShell/README.md` | Shell placeholders and script order |
| `css/shared.css` | Shared shell + utilities (to be split) |
| `css/pages/` | Page-specific styles |
