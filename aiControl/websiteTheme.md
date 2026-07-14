# Justice McNeal LLC Website Theme

Official visual constants for **Justice McNeal LLC** — designed for the family contribution platform, member profiles, dashboards, social features, payment flows, and legacy planning pages.

## Brand Direction

The Justice McNeal LLC website should feel:

- Professional and trustworthy
- Family-centered and legacy-focused
- Clean, readable, and accessible
- Strong enough for financial contribution tracking
- Warm enough for a private family/social platform

## Typography

### Headline Font

**Source Serif 4**

Use for:

- Page titles
- Hero headings
- Section headers
- Important legacy/foundation messaging
- Formal presentation-style copy

### Body Font

**Atkinson Hyperlegible Next**

Use for:

- Paragraphs
- Dashboard text
- Buttons
- Forms
- Navigation
- Profile details
- Contribution records
- Tables and cards

### Font Pairing Purpose

**Source Serif 4** gives the brand a serious, legacy-driven, institutional feel.  
**Atkinson Hyperlegible Next** keeps the platform highly readable for family members across phones, tablets, and desktop screens.

## Color Palette

| Token | HEX | RGB | CMYK | Purpose |
|---|---:|---:|---:|---|
| Background | `#FFFFFF` | `255, 255, 255` | `0, 0, 0, 0` | Main page background and clean content areas |
| Text | `#0B2545` | `11, 37, 69` | `84, 46, 0, 73` | Primary text, headings, icons, and serious brand elements |
| Primary | `#13366E` | `19, 54, 110` | `83, 51, 0, 57` | Buttons, links, active states, key calls to action |
| Accent | `#0E8B8B` | `14, 139, 139` | `90, 0, 0, 45` | Progress, highlights, success states, contribution emphasis |
| Surface | `#EEF2F6` | `238, 242, 246` | `3, 2, 0, 4` | Cards, dashboards, form panels, light sections |
| Border | `#D5DFEC` | `213, 223, 236` | `10, 6, 0, 7` | Dividers, card borders, input borders, subtle outlines |

## Color Usage

### Background — `#FFFFFF`

Use as the main website background to keep the platform clean, modern, and easy to read.

### Text — `#0B2545`

Use for primary written content, major headings, icons, and formal brand moments. This color should carry most of the visual seriousness of the brand.

### Primary — `#13366E`

Use for important interactive elements such as:

- Primary buttons
- Navigation highlights
- Links
- Selected tabs
- Contribution actions
- Dashboard emphasis

### Accent — `#0E8B8B`

Use sparingly for moments that should feel positive, active, or growth-oriented:

- Contribution progress
- Success badges
- Family milestone highlights
- Active status indicators
- Secondary buttons
- Charts and progress bars

### Surface — `#EEF2F6`

Use for soft background sections and cards:

- Member profile cards
- Contribution summaries
- Dashboard panels
- Notification boxes
- Form containers

### Border — `#D5DFEC`

Use for subtle separation:

- Card borders
- Table dividers
- Form input outlines
- Dashboard grid lines
- Icon containers

## Logo Color Direction

The Justice McNeal LLC logo should use:

- Deep navy main mark: `#0B2545`
- Primary blue support tone: `#13366E`
- Teal accent/swoosh: `#0E8B8B`
- White version for dark backgrounds

The logo should feel clean, established, trustworthy, and suitable for both family and financial contexts.

## CSS Variables

```css
:root {
  --font-headline: "Source Serif 4", Georgia, serif;
  --font-body: "Atkinson Hyperlegible Next", Arial, sans-serif;

  --color-background: #ffffff;
  --color-text: #0b2545;
  --color-primary: #13366e;
  --color-accent: #0e8b8b;
  --color-surface: #eef2f6;
  --color-border: #d5dfec;
}
```

## Suggested UI Styling

### Buttons

Primary buttons should use the primary blue background with white text.

```css
.button-primary {
  background: var(--color-primary);
  color: #ffffff;
  border: 1px solid var(--color-primary);
  font-family: var(--font-body);
  font-weight: 700;
}
```

Secondary buttons can use a white or surface background with primary blue text.

```css
.button-secondary {
  background: #ffffff;
  color: var(--color-primary);
  border: 1px solid var(--color-border);
  font-family: var(--font-body);
  font-weight: 700;
}
```

Accent buttons or positive actions may use the teal accent.

```css
.button-accent {
  background: var(--color-accent);
  color: #ffffff;
  border: 1px solid var(--color-accent);
  font-family: var(--font-body);
  font-weight: 700;
}
```

### Cards

Cards should feel clean, structured, and readable.

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: 16px;
}
```

### Headings

```css
h1, h2, h3 {
  font-family: var(--font-headline);
  color: var(--color-text);
  letter-spacing: -0.02em;
}
```

### Body Text

```css
body {
  background: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-body);
}
```

## Accessibility Notes

- Keep body text in `#0B2545` on white or light surface backgrounds.
- Use teal accent mostly for highlights, not long paragraphs.
- Avoid placing small white text on teal unless the text is bold and large enough.
- Use clear spacing between cards, buttons, forms, and dashboard sections.
- Keep contribution and payment flows simple, readable, and direct.

## Best Use Cases

This theme is best suited for:

- Justice McNeal LLC website
- Family contribution portal
- Member profiles
- Internal social feed
- Contribution dashboard
- Trust and LLC education pages
- Legacy planning documents
- Financial overview cards
- Mobile app interface

## Brand Summary

**Source Serif 4 + Atkinson Hyperlegible Next** creates a strong balance between legacy and usability. The navy, blue, teal, and soft surface palette makes Justice McNeal LLC feel trustworthy, modern, organized, and family-centered.
