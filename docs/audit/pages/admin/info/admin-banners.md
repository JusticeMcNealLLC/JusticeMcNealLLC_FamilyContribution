# 🎨 Admin Banners — Banner Management Page Spec

**Status:** 🔲 Not Started  
**Priority:** Medium  
**Goal:** Give admin full CRUD control over the banner catalog — create new banners, edit visuals (background, foreground, Lottie overlay, position), preview in real-time, and manage which members have earned them.

---

## Overview

The banner management page is the admin interface for the `cosmetics` table (filtered to `type = 'banner'`). Currently banners are seeded via migration 052 and the only way to add/edit them is raw SQL. This page makes the catalog fully manageable from the UI.

> **Note:** Badge management is a separate page — see `md/llc/admin-badges.md`.

---

## Current Banner System

### How Banners Work

Banners are profile cover images displayed at the top of a member's profile. There are three visual tiers:

| Tier | Background | Foreground / Overlay | Examples |
|------|-----------|---------------------|----------|
| **Common** | Tailwind CSS gradient only | None | Twilight, Emerald Wave, Rose Gold, Sunset, Cosmic Purple, Ocean Breeze |
| **Epic / Rare** | Tailwind CSS gradient | Lottie particle overlay (sparkle, lightning, fire, confetti, stars) | Storm, Inferno, Celebration, Starfield |
| **Legendary (Animated)** | Full background image (`.webp`) + CSS class | Lottie overlay | Founders Constellation, Cat Banner |

### Current Data Model

Banners live in the `cosmetics` table:

```sql
-- cosmetics table (migration 051)
key             TEXT PRIMARY KEY,    -- unique identifier
type            TEXT DEFAULT 'banner',
name            TEXT NOT NULL,       -- display name
rarity          TEXT DEFAULT 'common',  -- common | rare | epic | legendary
preview_class   TEXT,                -- CSS class for animated banners (e.g. 'founders-banner-preview')
gradient        TEXT,                -- Tailwind gradient (e.g. 'from-slate-900 to-purple-900')
lottie_effect   TEXT,                -- key into LottieEffects.BANNER_EFFECTS
is_animated     BOOLEAN DEFAULT false,
is_quest_locked BOOLEAN DEFAULT false,
quest_unlock_key TEXT,               -- quest auto_detect_key that awards this
sort_order      INTEGER DEFAULT 0,
created_at      TIMESTAMPTZ DEFAULT now()
```

### Current Banners (12 seeded)

| Key | Name | Rarity | Background | Lottie | Animated |
|-----|------|--------|-----------|--------|----------|
| `founders-animated` | Founders Constellation | legendary | `founder1.webp` via CSS class | sparkle | ✅ |
| `cat-playing` | Cat Banner | legendary | `cat1.webp` via CSS class | cat-playing | ✅ |
| `storm` | Storm | epic | `from-slate-900 to-purple-900` | lightning | ❌ |
| `inferno` | Inferno | epic | `from-red-900 to-orange-600` | fire | ❌ |
| `celebration` | Celebration | rare | `from-pink-500 to-violet-600` | confetti | ❌ |
| `starfield` | Starfield | rare | `from-slate-900 to-indigo-950` | stars | ❌ |
| 6× common gradients | Various | common | Pure gradient key | — | ❌ |

### Lottie Effects Available

| Key | Name | Source | Notes |
|-----|------|--------|-------|
| `sparkle` | Founders Sparkle | `assets/lottie/founders.json` | Local file |
| `cat-playing` | Cat Playing | `assets/lottie/cat-playing.json` | Local file |
| `lightning` | Lightning | LottieFiles CDN | — |
| `confetti` | Confetti | LottieFiles CDN | — |
| `fire` | Fire | LottieFiles CDN | — |
| `smoke` | Mystic Smoke | LottieFiles CDN | Not mapped to any banner yet |
| `stars` | Stars | LottieFiles CDN | — |

---

## Page Location

- **HTML:** `admin/banners.html`
- **JS:** `js/admin/banners.js`
- **Hub Card:** Added to `admin/index.html`

---

## Feature Requirements

### MVP Features

#### 1. Banner Catalog Table
- [ ] Table/grid listing all banners from `cosmetics` table where `type = 'banner'`
- [ ] Columns: Preview thumbnail, Name, Key, Rarity, Background type (gradient/image/animated), Lottie effect, Quest-locked, Sort order, Actions
- [ ] Live preview thumbnail for each banner — render the actual gradient/image + Lottie overlay in a small card
- [ ] Sort by: sort_order (default), rarity, name, date created
- [ ] Filter by: rarity (all / common / rare / epic / legendary), quest-locked (all / yes / no)
- [ ] Search by name or key

#### 2. Create New Banner
- [ ] Modal or slide-over form to add a new banner
- [ ] Fields:
  - **Key** (auto-generated slug from name, editable) — must be unique in `cosmetics` table
  - **Name** (display name)
  - **Rarity** (dropdown: common, rare, epic, legendary)
  - **Background type** (radio: Gradient / Uploaded Image)
    - **Gradient mode:** Two color pickers (from-color, to-color) + direction selector (to-r, to-br, to-b, to-bl, to-l, to-tl, to-t, to-tr)
    - **Image mode:** Upload `.webp` / `.png` / `.jpg` to Supabase Storage `banner-assets/` bucket → generates `preview_class` + CSS
  - **Lottie Overlay** (dropdown: none, sparkle, lightning, confetti, fire, smoke, stars, cat-playing, or "Custom URL")
    - Custom URL: paste any LottieFiles JSON URL
  - **Lottie Position / Style:**
    - Opacity slider (0–100%, default 55%)
    - Blend mode selector (screen, normal, overlay, multiply)
    - Scale (50%–200%, default 100%)
  - **Foreground Image** (optional): Upload a PNG/WebP that overlays the banner (e.g. a character, logo, or object). Positioned independently of the Lottie.
    - Position: X offset (%), Y offset (%)
    - Size: Width (%), Height (auto)
    - Opacity (0–100%)
  - **Quest-locked** (toggle)
  - **Quest unlock key** (text, only shown if quest-locked)
  - **Sort order** (number)
- [ ] **Live preview panel** — renders the full banner as it would appear on a profile while editing
  - Shows background gradient or image
  - Overlays Lottie animation in real-time
  - Overlays foreground image with current position/size
  - Updates on every field change (debounced)

#### 3. Edit Existing Banner
- [ ] Click any banner row → opens edit modal pre-filled with current values
- [ ] Same form as create, but key is read-only (primary key)
- [ ] All changes reflected in live preview before saving
- [ ] Save writes to `cosmetics` table

#### 4. Delete Banner
- [ ] Delete button with confirmation modal ("Delete [Name]? This will remove it from X members who have it equipped.")
- [ ] On delete: 
  - Remove from `cosmetics` table (CASCADE deletes `member_cosmetics` entries)
  - Members using this banner as their active banner get reset to default
- [ ] Cannot delete if it's the last banner in the catalog (safety)

#### 5. Member Assignment
- [ ] "Award to Member" action per banner
  - Opens a member picker (search by name)
  - Inserts into `member_cosmetics` with `awarded_by = 'admin'`
- [ ] "Revoke from Member" — removes the `member_cosmetics` row
- [ ] Click banner → expandable row or side panel showing which members have earned it and how (quest / admin / system)

#### 6. Reorder
- [ ] Drag-to-reorder or manual sort_order number editing
- [ ] Sort order determines display order in the member's banner picker

---

### Foreground Image System (New)

Currently banners support:
1. Background: gradient OR uploaded image with CSS class
2. Overlay: Lottie particle animation

This spec adds a **third layer — foreground image**:

```
┌─────────────────────────────┐
│      Lottie Overlay         │  ← Layer 3: Lottie particles (sparkle, fire, etc.)
│  ┌───────────────────────┐  │
│  │   Foreground Image    │  │  ← Layer 2: PNG/WebP overlay (character, logo, etc.)
│  │   (positioned)        │  │
│  └───────────────────────┘  │
│      Background             │  ← Layer 1: Gradient or full-bleed image
└─────────────────────────────┘
```

#### Database Addition
Add to `cosmetics` table:
```sql
foreground_url      TEXT,      -- Supabase Storage URL for foreground PNG/WebP
foreground_x        INTEGER DEFAULT 50,  -- X position (0-100, %)
foreground_y        INTEGER DEFAULT 50,  -- Y position (0-100, %)
foreground_width    INTEGER DEFAULT 40,  -- Width as % of banner width
foreground_opacity  INTEGER DEFAULT 100, -- 0-100
lottie_opacity      INTEGER DEFAULT 55,  -- 0-100 (currently implicit in JS)
lottie_blend        TEXT DEFAULT 'screen', -- blend mode
lottie_scale        INTEGER DEFAULT 100, -- 50-200, as % of container
```

#### Storage
- New Supabase Storage bucket: `banner-assets`
- Background images: `banner-assets/bg/{key}.webp`
- Foreground images: `banner-assets/fg/{key}.webp`
- Public read access, admin-only upload

---

### Live Preview Component

The banner preview is the centerpiece of the editor:

```
┌─────────────────────────────────────────────┐
│                                              │
│         LIVE BANNER PREVIEW                  │
│         (300×120 in editor,                  │
│          rendered exactly as                 │
│          it appears on profile)              │
│                                              │
└─────────────────────────────────────────────┘
```

- Aspect ratio matches profile cover (~5:2)
- Background: gradient div OR `<img>` with `object-fit: cover`
- Foreground: absolutely positioned `<img>` with draggable positioning
- Lottie: rendered via `LottieEffects.renderBannerEffect()` with custom opacity/blend/scale
- Updates live as form values change (color pickers, sliders, position)
- **Drag-to-position**: Foreground image can be dragged within the preview to set X/Y position (writes back to form fields)

---

### Gradient Builder

For common/gradient banners, provide a visual gradient builder:

- **From color**: Color picker with Tailwind color suggestions (preset swatches for all Tailwind 500/600s)
- **To color**: Same color picker
- **Direction**: 8-direction selector (grid of arrows: ↗ ↑ ↖ ← ↙ ↓ ↘ →)
- **Live preview** updates as colors/direction change
- Outputs a Tailwind gradient string: `from-{color} to-{color}` + direction class on the container

---

### Admin Hub Card

```
Icon: 🎨 / palette SVG
Color: pink / fuchsia theme
Title: Banners
Subtitle: Manage banners, preview effects, and award banners to members
Position: After Quests card in the admin hub grid
```

---

## UI Layout

### Desktop
```
┌──────────────────────────────────────────────────────┐
│  ← Back to Hub              Banners                   │
│                                             [+ New]  │
├──────────────────────────────────────────────────────┤
│ 🔍 Search...    [Rarity ▾]  [Locked ▾]  [Sort ▾]   │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────┐  Founders Constellation   legendary  ✨     │
│  │prev │  founders-animated        Quest: ✅         │
│  └─────┘  3 members earned                  [⋮]     │
│  ─────────────────────────────────────────────────   │
│  ┌─────┐  Storm                    epic      ⚡     │
│  │prev │  storm                    Quest: ❌         │
│  └─────┘  0 members earned                  [⋮]     │
│  ─────────────────────────────────────────────────   │
│  ┌─────┐  Twilight                 common            │
│  │prev │  from-blue-500…           Quest: ❌         │
│  └─────┘  5 members earned                  [⋮]     │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Create/Edit Modal (Full-screen on mobile)
```
┌──────────────────────────────────────────────────────┐
│  Create New Banner                            [✕]    │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  │            LIVE PREVIEW (5:2 aspect)             │ │
│  │                                                  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  Name: [____________________]                         │
│  Key:  [____________________]  (auto-generated)       │
│  Rarity: [common ▾]                                   │
│                                                       │
│  ── Background ──────────────────────────────────    │
│  ◉ Gradient   ○ Upload Image                         │
│  From: [🎨 #6366f1]   To: [🎨 #a855f7]              │
│  Direction: [↗]                                       │
│                                                       │
│  ── Foreground Image (optional) ─────────────────    │
│  [📁 Upload PNG/WebP]  or drag & drop                │
│  Position: X [50%] Y [50%]                           │
│  Size: [40%]  Opacity: [100%]                        │
│                                                       │
│  ── Lottie Overlay ──────────────────────────────    │
│  Effect: [none ▾]                                     │
│  Opacity: [═══════●═══] 55%                          │
│  Blend:  [screen ▾]                                   │
│  Scale:  [═══════●═══] 100%                          │
│                                                       │
│  ── Settings ────────────────────────────────────    │
│  Quest-locked: [toggle]                               │
│  Quest key:    [____________________]                 │
│  Sort order:   [0]                                    │
│                                                       │
│              [Cancel]  [Save Banner]                  │
└──────────────────────────────────────────────────────┘
```

---

## Technical Notes

### CSS Generation for Image Banners

When an admin uploads a background image for a new banner:
1. Image is uploaded to `banner-assets/bg/{key}.webp`
2. The `preview_class` is set to `{key}-banner-preview`
3. A corresponding CSS rule needs to be injected:
   - **Option A (recommended):** Store the background image URL in a new `bg_image_url` column. The JS renderer dynamically applies `background-image: url(...)` instead of relying on static CSS classes.
   - **Option B:** Auto-generate CSS and inject via `<style>` tag at render time.

> Recommended: Option A — eliminates the need for CSS file edits when creating banners. Add `bg_image_url TEXT` to the cosmetics table.

### Rendering Pipeline (Updated)

When rendering a banner on profile:
```
1. Check bg_image_url → if set, apply as background-image
2. Else check gradient → apply Tailwind gradient classes
3. Else check preview_class → apply static CSS class (legacy animated banners)
4. If foreground_url → render positioned <img> overlay
5. If lottie_effect → render LottieEffects overlay with custom opacity/blend/scale
```

### Database Changes Needed

```sql
-- Add to cosmetics table (migration):
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS bg_image_url TEXT;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS foreground_url TEXT;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS foreground_x INTEGER DEFAULT 50;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS foreground_y INTEGER DEFAULT 50;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS foreground_width INTEGER DEFAULT 40;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS foreground_opacity INTEGER DEFAULT 100;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS lottie_opacity INTEGER DEFAULT 55;
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS lottie_blend TEXT DEFAULT 'screen';
ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS lottie_scale INTEGER DEFAULT 100;
```

Storage bucket:
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('banner-assets', 'banner-assets', true);
```

---

## References

- `supabase/migrations/051_cosmetics_tables.sql` — Cosmetics schema
- `supabase/migrations/052_seed_cosmetics_catalog.sql` — Seed data
- `js/lottie-effects.js` — Lottie animation engine
- `js/portal/profile/loader.js` — Banner rendering on profile
- `js/portal/profile/edit.js` — Banner picker in profile edit
- `js/portal/profile/badges.js` — Badge + banner catalogs, apply logic
- `css/shared.css` — Banner CSS classes, badge chip styles
- `md/llc/admin-badges.md` — Badge management page spec (companion)

---

*Last Updated: March 14, 2026 | Maintained By: Justin McNeal (Admin)*
