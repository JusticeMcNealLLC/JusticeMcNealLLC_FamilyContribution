# Phase 4 — Family Social Hub

**Status:** ⚡ In Progress (4A ✅ · 4B ✅ · 4C–4F 🔲)  
**Priority:** Medium  
**Goal:** Make the portal more than finances — make it the family's digital home.

---

## 4A. Social Feed & Announcements ✅

> Home becomes the **Feed** — posts, announcements, milestones, and family updates in one scrollable timeline.

### Context-Aware Mobile Header

| Page | Left | Center | Right |
|------|------|--------|-------|
| Home (Feed) | ➕ New Post | Logo | ❤️ Notifications |
| All other pages | Logo | — | — |

### Features Built
- [x] Context-aware mobile top nav (dynamic icons per page)
- [x] Home page = social feed (Feed tab in nav)
- [x] New Post button (➕) opens composer
- [x] Notifications bell/heart with unread badge
- [x] Profile accessible via bottom tab avatar
- [x] Admin announcements (pinned to top of feed)
- [x] Social feed — post text, images, videos
- [x] Like, comment, bookmark posts
- [x] Feed filtering (All / Announcements / Milestones / Member Posts / Saved)
- [x] Threaded replies
- [x] @mentions — tag family members in posts and replies
- [x] Post editing and deletion (own posts only)
- [x] Emoji reactions (6-picker)
- [x] Image/video upload (up to 4 images, preview before posting)
- [x] New posts indicator while scrolling
- [x] Infinite scroll (IntersectionObserver + scroll fallback)
- [x] Admin compose button (announce button, admin-only, amber highlight)

### Pending
- [ ] Link preview cards
- [ ] Milestone celebration auto-posts

---

## 4B. Member Profiles (Instagram-Style) ✅

### Profile Header
- [x] Cover photo / banner (reward-only — earned, not freely selectable)
- [x] Large profile picture with badge overlay
- [x] Display name + editable bio/tagline (200 chars)
- [x] Stats bar: Posts | Contributed | Streak | CP
- [x] "Edit Profile" button (own profile) + Settings gear
- [x] Contribution streak fire emoji with count

### Profile Content Tabs
- [x] **Posts** tab — 3-column Instagram-style image grid with hover overlay
- [x] **Feed** tab — chronological list of all member's posts
- [x] **Milestones** tab — personal badges + quest timeline
- [ ] **Photos** tab — all images by date *(future)*
- [ ] **Activity** tab — full action timeline *(future)*

### Post Types
- [x] Text, Photo, Photo + Caption, Announcement (admin)
- [x] Multi-image posts (up to 4)
- [x] Post privacy: Family or Private
- [x] Edit / delete own posts
- [x] Relative timestamps ("2m ago", "3d ago")

### Privacy & Settings
- [x] `profile_visibility` + `show_` flags (bio, birthday, contribution stats, posts)
- [x] Profile visibility: Family or Private (RLS enforced)
- [x] Profile route: `/portal/profile.html?id={user_id}`

### Pending
- [ ] Hide contribution amount (show streak but not dollar amount)
- [ ] Block / mute other members
- [ ] Image compression / thumbnail generation (edge function)
- [ ] Responsive: full-width cover on mobile, constrained on desktop

---

## 4C. Private Messaging (DMs) — Snapchat-Style 🔲

**Status:** Not Started  

### Core DMs
- [ ] One-on-one direct messages between members
- [ ] Real-time messaging (Supabase Realtime)
- [ ] Message notifications
- [ ] Read receipts
- [ ] Optional: Group chats

### Ephemeral / Snapchat Features
- [ ] Ephemeral messages — auto-delete after view (configurable: on view / 24h / 7d)
- [ ] "Snap" button — quick photo/video message with caption
- [ ] Story-style — 24-hour story visible to all family members
- [ ] Story viewers list
- [ ] Message streaks — consecutive days messaging (🔥 streak counter)
- [ ] Streak milestone celebrations (7d, 30d, 100d)
- [ ] Quick reactions to snaps (❤️ 😂 🔥 😮)
- [ ] Screenshot notification ("[Name] screenshotted your message!")
- [ ] Archive option — save messages before they disappear

### Database
- `ephemeral_messages` — sender_id, receiver_id, content, media_url, expires_at, viewed_at, type
- `stories` — author_id, media_url, caption, created_at, expires_at
- `story_views` — story_id, viewer_id, viewed_at
- `message_streaks` — user_a_id, user_b_id, current_streak, longest_streak, last_message_at

---

## 4D. Push & Text Notifications 🔲

**Status:** Not Started  

### In-App Feed Notifications
- [ ] Heart icon in feed header → notification center page
- [ ] Real-time notification: someone liked your post
- [ ] Real-time notification: someone commented on your post
- [ ] Real-time notification: someone replied to your comment
- [ ] Unread count badge (red dot with number)
- [ ] Notification center page — list of social interactions
- [ ] Mark as read / mark all read
- [ ] Tap notification → jump to relevant post

### Push & SMS
- [ ] Web push notifications (service workers — free, browser-native)
- [ ] SMS/text notifications via Twilio
- [ ] Notification channel preferences per member (what they want, which channel)

### Notification Types
- New announcements
- Event invites & RSVPs
- DM received
- Milestone reached
- Loan status updates
- Subscription reminders
- Birthday celebration received
- Quest available / completed

---

## 4E. Family Location Map (GPS) 🔲

**Status:** Not Started  
**Tech:** Leaflet.js + OpenStreetMap (free)

- [ ] Opt-in location sharing (off by default)
- [ ] Interactive map with member pin avatars
- [ ] Accuracy levels: Precise / City-level / Off
- [ ] Last updated timestamp per member
- [ ] "Check In" button — manually share current location
- [ ] Location history (optional)
- [ ] Geofence alerts (optional)
- [ ] Privacy controls — who can see your location
- [ ] Full-screen map on mobile with bottom sheet for member list
- [ ] Database:
  - `member_locations` — user_id, latitude, longitude, accuracy, updated_at, sharing_level
  - `location_checkins` — user_id, latitude, longitude, place_name, created_at

---

## 4F. Family Business Directory 🔲

**Status:** Not Started  

**Concept:** Dedicated business pages for members who own a business. Two tiers with separate badges + banners. Admin manages all listings.

### Business Tiers
| Tier | Requirement | Badge |
|------|-------------|-------|
| **Official** | Has LLC/EIN — verified by admin | Official Business badge + banner |
| **Small Business** | Social media page, website, or side hustle — no formal entity | Small Business badge + banner |

### Features to Build
- [ ] Business page creation (name, logo, description, photos, website, social links, owner profile link)
- [ ] Badge assignment and tier classification — admin only
- [ ] Business directory page (all family businesses with tier filter)
- [ ] Business link shown on owner's profile
- [ ] Admin console for managing listings, editing pages, approving, assigning badge/banner per tier
