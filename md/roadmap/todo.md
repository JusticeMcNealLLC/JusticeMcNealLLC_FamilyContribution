# 🚀 TODO Roadmap (Organized)

---

## 🔴 Phase 1 — Core Systems (High Impact / Foundation)
These directly impact how your platform works long-term.

### 🧠 Quest & Credit System
- [ ] Audit and revamp quest system (separate permanent vs dynamic logic)
- [ ] Build quest creation + completion pipeline
- [ ] Define credit score logic tied to quests
- [ ] Handle streak resets and point removal logic

---

### 🎨 Cosmetics System (Core Rebuild)
- [ ] Rethink cosmetics system to resemble Discord-style system
- [ ] Improve cosmetics pipeline logic
- [ ] Define cosmetic types:
  - Mini Banner (feed)
  - Profile Banner
  - Badges
  - Profile Decoration
- [ ] Lock certain cosmetics behind contribution tiers

---

### 💰 Contribution Tiers System
- [ ] Create 3 contribution tiers (Level 1 / 2 / 3 — names TBD)
- [ ] Define features & benefits per tier
- [ ] Lock features (e.g., animated reactions) behind tiers

---

### 👥 Members / Identity System
- [ ] Add Member ID system
- [ ] Convert "Members" → "Family List"
- [ ] Restrict list to members on Family Tree
- [ ] Build reusable **Mini Profile Modal**
  - Name
  - Location
  - Cosmetics
  - Birthday
  - Descendants
  - Future expansion ready

---

### 📅 Events System (Upgrade)
- [ ] Convert Event Modal → Full Event Page
- [ ] Add Event ID system
- [ ] Add creator info (profile + cosmetics)
- [ ] Add RSVP state ("You're going")
- [ ] Improve share link behavior
- [ ] Add invite flow:
  - "You've been invited by..."
  - Delayed continue action

---

## 🟡 Phase 2 — UX & Platform Experience

### 🧭 Navigation & Layout
- [ ] Move desktop headers behind nav (full-width layout)
- [ ] Fix admin desktop nav
- [ ] Prevent multiple dropdowns open at once
- [ ] Remove "Dashboard" from nav (logo = home)
- [ ] Remove "Justice McNeal" text (logo only)
- [ ] Add bottom nav drawer (mobile, scrollable)
- [ ] Update mobile nav (Fidelity-inspired)
- [ ] Add LLC progress bar (desktop + mobile)
- [ ] Add nav skeleton / preload state

---

### 🔐 Auth / Access Control
- [ ] Make most pages member-only
- [ ] Add "Welcome back" login loading state

---

### 🎨 Branding & Visual Identity
- [ ] Create new logo
- [ ] Build global brand settings page
- [ ] Add page background controls
- [ ] Login page:
  - Bigger centered logo
  - Update subtext copy
  - Add subtle animated blue background

---

## 🟢 Phase 3 — Feature Enhancements

### 💳 My Finances Page (Major Upgrade)
- [ ] Fix existing issues
- [ ] Add transaction search
- [ ] Add filter & sort UI
- [ ] View transactions by category/type
- [ ] Improve manual categorization
- [ ] Add more categories/subcategories
- [ ] Add AI auto-categorization
- [ ] Improve spotlight visuals

---

### 🧬 Family Tree System
- [ ] Redesign header
- [ ] Add animated background
- [ ] Add "Recent Changes" log
- [ ] Clicking member → focus on tree position
- [ ] Add "New Relation" button (desktop corner)
- [ ] Improve member search panel:
  - Include profile + cosmetics
- [ ] Integrate search into members panel
- [ ] Members tab shows cosmetics
- [ ] Clicking member opens mini profile modal

---

### 📰 Feed System
- [ ] Add profile cosmetics to posts
- [ ] Admin-only announcements
- [ ] Auto-post milestones
- [ ] Add reactions (Discord-style)
- [ ] Animated reactions (tier-locked)

---

### 🔗 Quick Links / Dashboard UX
- [ ] Make quick links scrollable OR single-row
- [ ] Improve layout consistency across pages

---

### 📣 Notifications System
- [ ] Send notifications for LLC milestones

---

## 🔵 Phase 4 — Polish & Page-Specific Improvements

### 🎯 Individual Pages

#### Login Page
- [ ] Background animation (subtle blue)
- [ ] Better branding + messaging

#### One-Time Deposit Page
- [ ] More official background (no animation)

#### Profile Settings
- [ ] More compact layout
- [ ] Improve settings pipeline

#### Events Page
- [ ] Add search / filter / sort options

#### Invest Page
- [ ] Improve banner + header design

---

## ⚪ Phase 5 — Future / Nice-to-Have

- [ ] Cosmetic management dashboard (admin)
- [ ] Advanced branding controls per page
- [ ] Expanded AI features across platform

---

# 🧭 Suggested Build Order (IMPORTANT)

1. **Quest + Credit System**
2. **Cosmetics System**
3. **Contribution Tiers**
4. **Mini Profile System**
5. **Events System Upgrade**
6. **Navigation Cleanup**
7. **My Finances AI + UX**
8. **Feed + Social Features**
9. **Family Tree Enhancements**
10. **Polish + Branding**

---

# 🧠 Notes

- Prioritize systems that:
  - Affect **money**
  - Affect **trust/credit**
  - Affect **user identity**

- Everything else = enhancement layer