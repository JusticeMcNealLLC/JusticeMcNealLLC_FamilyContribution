# 🏅 Admin Badges Management Page Spec

**Status:** 🔲 Not Started  
**Priority:** Medium  
**Goal:** Give admin full CRUD control over the badge catalog — create, edit, and delete badges, configure rarity and effects, manage quest-locking, and award/revoke badges to members.

> **Note:** Banner management is a separate page — see `md/llc/admin-banners.md`.

---

## Overview

The badge management page is the admin interface for the `cosmetics` table (filtered to `type = 'badge'`). Badges are displayed on member profiles as chips, can be highlighted, and higher-rarity badges include Lottie particle effects. Currently badges are hard-coded in `BADGE_CATALOG` (in `js/portal/quests/config.js`) and seeded in migration 052. This page makes the catalog fully dynamic.

---

## Current Badge System

### How Badges Work

Badges are small icons/chips displayed on a member's profile. Members can:
- Earn badges via quests, admin grants, or system triggers
- Display one **primary** badge (`profiles.displayed_badge`)
- Highlight up to 3 badges (`profiles.highlighted_badges` TEXT[])
- Epic and legendary badges get Lottie particle effects

### Current Data Model

Badges live in the `cosmetics` table (same as banners):

```sql
key             TEXT PRIMARY KEY,
type            TEXT DEFAULT 'badge',
name            TEXT NOT NULL,
emoji           TEXT,                -- display emoji
description     TEXT,                -- tooltip / profile card text
rarity          TEXT DEFAULT 'common',  -- common | rare | epic | legendary
lottie_effect   TEXT,                -- badge Lottie effect key (epic/legendary only)
is_quest_locked BOOLEAN DEFAULT false,
quest_unlock_key TEXT,
sort_order      INTEGER DEFAULT 0,
created_at      TIMESTAMPTZ DEFAULT now()
```

Ownership tracked in `member_cosmetics`:

```sql
id              UUID PRIMARY KEY,
user_id         UUID REFERENCES profiles(id),
cosmetic_key    TEXT REFERENCES cosmetics(key),
earned_at       TIMESTAMPTZ DEFAULT now(),
awarded_by      TEXT DEFAULT 'quest'  -- 'quest' | 'admin' | 'system'
```

Legacy `member_badges` table (synced via trigger):

```sql
id              UUID PRIMARY KEY,
user_id         UUID REFERENCES auth.users(id),
badge_key       TEXT NOT NULL,
earned_at       TIMESTAMPTZ DEFAULT now(),
is_displayed    BOOLEAN DEFAULT false
```

### Current Badges (9 seeded)

| Key | Name | Emoji | Rarity | Quest-Locked | Description |
|-----|------|-------|--------|-------------|-------------|
| `founding_member` | Founding Member | 🏛️ | legendary | ❌ | Original family member |
| `shutterbug` | Shutterbug | 📸 | rare | ❌ | Uploaded a profile photo |
| `streak_master` | Streak Master | 🔥 | epic | ❌ | 6+ month contribution streak |
| `streak_legend` | Streak Legend | ⚡ | legendary | ❌ | 12+ month contribution streak |
| `first_seed` | First Seed | 🌱 | common | ❌ | Made first contribution |
| `four_figures` | Four Figures | 💰 | rare | ❌ | Total contributions reached $1,000 |
| `quest_champion` | Quest Champion | 🏆 | epic | ❌ | Completed all available quests |
| `fidelity_linked` | Fidelity Linked | 🔗 | common | ❌ | Linked Fidelity brokerage account |
| `birthday_vip` | Birthday VIP | 🎂 | rare | ❌ | Received a birthday payout |

### Badge Lottie Effects

From `js/lottie-effects.js`:

| Effect Key | Applied To | Visual |
|-----------|-----------|--------|
| `legendary` | Legendary badges | Gold sparkle particles around badge chip |
| `epic` | Epic badges | Purple/blue shimmer particles |

These are applied automatically based on `rarity` — the `lottie_effect` column on badges is currently unused (effects are derived from rarity tier).

### Badge Chip CSS

From `css/shared.css`:
```css
.badge-chip                  /* Base badge pill */
.badge-rarity-common         /* Gray border */
.badge-rarity-rare           /* Blue border + subtle glow */
.badge-rarity-epic           /* Purple border + glow */
.badge-rarity-legendary      /* Gold border + animated glow */
```

---

## Page Location

- **HTML:** `admin/badges.html`
- **JS:** `js/admin/badges.js`
- **Hub Card:** Shared with cosmetics (or sub-nav within cosmetics page)

> **Implementation Choice:** Badges could be a separate page or a tab within the cosmetics page. Recommend **separate page** (`admin/badges.html`) since the user explicitly asked for "a different file for that."

---

## Feature Requirements

### 1. Badge Catalog Table

- [ ] Grid/table listing all badges from `cosmetics` where `type = 'badge'`
- [ ] Each row shows: Emoji, Name, Key, Rarity (color-coded chip), Description, Quest-locked status, Members earned count, Actions
- [ ] Badge chip preview rendered with correct rarity CSS class
- [ ] Legendary/epic badges show Lottie effect preview (small animated particles)
- [ ] Sort by: sort_order (default), rarity, name, date created
- [ ] Filter by: rarity, quest-locked
- [ ] Search by name/key

### 2. Create New Badge

- [ ] Modal/form to add a new badge
- [ ] Fields:
  - **Key** (auto-slug from name, editable, unique)
  - **Name** (display name)
  - **Emoji** (emoji picker or manual input)
  - **Description** (text — shown on profile card tooltip)
  - **Rarity** (dropdown: common, rare, epic, legendary)
    - Visual preview of the badge chip updates as rarity changes
    - Shows Lottie effect preview for epic/legendary
  - **Custom Lottie Effect** (optional — override the default rarity-based effect)
    - Dropdown: none, legendary-sparkle, epic-shimmer, or Custom URL
  - **Quest-locked** (toggle)
  - **Quest unlock key** (text, shown if quest-locked)
  - **Sort order** (number)
- [ ] **Live preview** — renders the badge chip exactly as it would appear on a profile
  - Emoji + name in a pill
  - Correct rarity border/glow
  - Lottie particles if epic/legendary

### 3. Edit Existing Badge

- [ ] Click row → opens edit form pre-filled
- [ ] Key is read-only
- [ ] Live preview updates on every change
- [ ] Save writes to `cosmetics` table

### 4. Delete Badge

- [ ] Delete with confirmation ("Delete [Name]? X members will lose this badge.")
- [ ] On delete:
  - Remove from `cosmetics` (CASCADE removes `member_cosmetics` entries)
  - Members with this as `displayed_badge` get reset to null
  - Remove from any `highlighted_badges` arrays
- [ ] Cannot delete the last badge

### 5. Member Management

- [ ] **Award badge** — per-badge action
  - Member search/picker (by name or email)
  - Inserts into `member_cosmetics` with `awarded_by = 'admin'`
  - Also writes to legacy `member_badges` for backward compat (or rely on sync trigger)
- [ ] **Revoke badge** — removes `member_cosmetics` row
  - If member had it as `displayed_badge`, reset to null
  - If member had it in `highlighted_badges`, remove from array
- [ ] **Members panel** — expand a badge row to see all members who earned it
  - Shows: member name, avatar, earn date, awarded_by source
  - Actions: revoke

### 6. Bulk Actions

- [ ] Select multiple badges → bulk delete, bulk update rarity, bulk toggle quest-lock
- [ ] "Award to All Members" — mass-grant a badge (useful for event badges)

---

## UI Layout

### Desktop — Badge Catalog
```
┌──────────────────────────────────────────────────────┐
│  ← Back to Hub           Badges                      │
│                                          [+ New]     │
├──────────────────────────────────────────────────────┤
│ 🔍 Search...    [Rarity ▾]   [Locked ▾]  [Sort ▾]  │
├──────────────────────────────────────────────────────┤
│                                                       │
│  🏛️  Founding Member     legendary ⭐               │
│      Original family member                          │
│      3 members earned           [Award] [Edit] [⋮]  │
│  ─────────────────────────────────────────────────   │
│  🔥  Streak Master        epic 💜                    │
│      6+ month streak                                 │
│      1 member earned            [Award] [Edit] [⋮]  │
│  ─────────────────────────────────────────────────   │
│  🌱  First Seed           common                     │
│      Made first contribution                         │
│      7 members earned           [Award] [Edit] [⋮]  │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Create/Edit Modal
```
┌──────────────────────────────────────────────────────┐
│  Create New Badge                             [✕]    │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Preview: ┌──────────────────────┐                   │
│           │  🏛️ Founding Member  │ ← live chip      │
│           └──────────────────────┘                   │
│           (with rarity glow + Lottie if applicable)  │
│                                                       │
│  Name:    [____________________]                      │
│  Key:     [founding_member_____]  (auto)              │
│  Emoji:   [🏛️]  [Pick emoji]                         │
│  Description: [________________________]              │
│                                                       │
│  Rarity:  [legendary ▾]                               │
│                                                       │
│  ── Lottie Override (optional) ──────────────────    │
│  Effect: [default for rarity ▾]                       │
│                                                       │
│  ── Quest Settings ──────────────────────────────    │
│  Quest-locked: [toggle]                               │
│  Quest key:    [____________________]                 │
│                                                       │
│  Sort order: [0]                                      │
│                                                       │
│              [Cancel]  [Save Badge]                   │
└──────────────────────────────────────────────────────┘
```

### Award Modal
```
┌──────────────────────────────────────────────────────┐
│  Award "Founding Member" 🏛️                  [✕]     │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Search member: [____________________]               │
│                                                       │
│  ┌────────────────────────────────────────────┐      │
│  │ 🧑 Justin McNeal         Already earned ✓  │      │
│  │ 🧑 Sarah Williams        [Award]           │      │
│  │ 🧑 Marcus Johnson        [Award]           │      │
│  └────────────────────────────────────────────┘      │
│                                                       │
│  [Award to All Members]                              │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## Technical Notes

### Removing Hardcoded BADGE_CATALOG

Currently `js/portal/quests/config.js` contains a hardcoded `BADGE_CATALOG`:

```js
export const BADGE_CATALOG = {
  founding_member: { name: 'Founding Member', emoji: '🏛️', description: '...', rarity: 'legendary' },
  // ...
};
```

**Migration path:**
1. Admin badges page manages via `cosmetics` table (source of truth)
2. Portal-side code should fetch from DB instead of hardcoded catalog
3. Transition: keep hardcoded catalog as fallback, merge with DB rows at runtime
4. End state: remove `BADGE_CATALOG` entirely, all badges from DB

Same for `BANNER_CATALOG` in `js/portal/profile/badges.js`.

### Legacy member_badges Sync

Migration 051 created a trigger that syncs `member_cosmetics` → `member_badges` for backward compatibility. Ensure:
- Admin awards write to `member_cosmetics` (trigger handles `member_badges`)
- Admin revokes delete from `member_cosmetics` (trigger or admin JS handles `member_badges`)
- If member has badge as `displayed_badge` or in `highlighted_badges` on profiles table, clean up on revoke

### No Database Changes Needed

Unlike the banners spec, badges don't need new columns — the existing `cosmetics` schema already covers all badge fields (key, name, emoji, description, rarity, is_quest_locked, quest_unlock_key, sort_order). The only new column consideration:

- **Optional:** `badge_icon_url` (TEXT) — for custom badge images instead of emoji. Future enhancement.

---

## References

- `supabase/migrations/051_cosmetics_tables.sql` — Cosmetics + member_cosmetics schema
- `supabase/migrations/052_seed_cosmetics_catalog.sql` — Seeded badges
- `js/portal/quests/config.js` — Hardcoded BADGE_CATALOG (to be deprecated)
- `js/portal/profile/badges.js` — Badge rendering + BANNER_CATALOG
- `js/lottie-effects.js` — BADGE_EFFECTS (legendary, epic particle effects)
- `css/shared.css` — Badge chip rarity CSS classes
- `md/llc/admin-banners.md` — Banner management page spec (companion)

---

*Last Updated: March 14, 2026 | Maintained By: Justin McNeal (Admin)*
