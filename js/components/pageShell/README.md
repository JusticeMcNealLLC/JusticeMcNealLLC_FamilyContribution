# pageShell

Shared portal/admin chrome: desktop sidebar, mobile header, footer, bottom tab bar, nav drawer, and notification panel.

## HTML

One ES module entry per page (portal: `pages/portal/`, admin: `admin/`):

```html
<script type="module" src="../../js/components/pageShell/index.js"></script>
```

Place after `config.js`, before `auth/shared.js`. The page `<body>` must set `data-page-type` and `data-active-page`. Placeholders: `#nav-placeholder`, `#footer-placeholder`, `#tabs-placeholder`.

## Mobile header slots

`#mobileHeader` is one bar with three slots: `#mhSlotLeft`, `#mhSlotCenter`, `#mhSlotRight`.

- **Default:** logo + “Justice McNeal” in center.
- **Feed:** New Post (left) + brand (center) + notifications (right).
- Pages may fill slots at runtime instead of adding a second top bar.

```js
window.PageShell.setMobileHeader({
  left: '<button …>Back</button>',
  center: '<!-- logo -->',
  right: '<button …>Share</button>',
});
window.PageShell.resetMobileHeader(); // restore page preset after inject
```

Omit a key to leave that slot unchanged. Immersive pages (e.g. quests) may still hide `#mobileHeader` via CSS.

## Layout

```
pageShell/
  index.js              ← entry: reads context, builds HTML, wires UI
  state/
    icons.js
    pageContext.js
    portalNavIcons.js
  utils/
    svgPath.js
  render/
    links.js
    portalSidebar.js
    adminSidebar.js
    mobileHeader.js     ← slotted left/center/right
    footer.js
    tabBar.js
    drawer.js
    notificationPanel.js
  ui/
    inject.js
    mobileHeaderSlots.js ← setMobileHeader / resetMobileHeader
    dropdowns.js
    drawer.js
    profileLoader.js
    adminBadges.js
    reentrySplash.js
```

Shared site components live under `js/components/`, not `js/pages/`.
