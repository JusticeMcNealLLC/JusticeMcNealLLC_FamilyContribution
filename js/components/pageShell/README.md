# pageShell

Shared portal/admin chrome: desktop sidebar, mobile header, footer, bottom tab bar, nav drawer, and notification panel.

## HTML

One ES module entry per page (portal: `pages/portal/`, admin: `admin/`):

```html
<script type="module" src="../../js/components/pageShell/index.js"></script>
```

Place after `config.js`, before `auth/shared.js`. The page `<body>` must set `data-page-type` and `data-active-page`. Placeholders: `#nav-placeholder`, `#footer-placeholder`, `#tabs-placeholder`.

## Layout

```
pageShell/
  index.js              ← entry: reads context, builds HTML, wires UI
  state/
    icons.js            ← SVG path constants
    pageContext.js      ← body dataset → { pageType, active, isAdmin }
    portalNavIcons.js   ← Theme_JMLLC001 portal sidebar icons
  utils/
    svgPath.js          ← path → <path> element
  render/
    links.js            ← link/tab builders
    portalSidebar.js
    adminSidebar.js
    mobileHeader.js
    footer.js
    tabBar.js
    drawer.js
    notificationPanel.js
  ui/
    inject.js           ← placeholders, body restructure, scroll restore
    dropdowns.js        ← More / profile accordions
    drawer.js           ← swipe drawer + dock customization
    profileLoader.js    ← loadNavProfile (also on window for auth/shared.js)
    adminBadges.js
    reentrySplash.js
```

Shared site components live under `js/components/`, not `js/pages/`.
