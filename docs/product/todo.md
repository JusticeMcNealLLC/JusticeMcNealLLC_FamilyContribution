# Todo

**Priority:** P1 (do soon) → P4 (later / big bets)  
**Difficulty:** `xs` · `s` · `m` · `l` · `xl` (how big the overhaul / effort)

Format: `[ ] P# · size — task`

---

## Platform / Architecture

- [ ] **P1 · xl** — Revamp every page to match the JS file structure and website theme (dashboard done as reference; remaining portal/admin pages still open)
- [ ] **P3 · s** — Activity feed section `.md`
- [ ] **P4 · xl** — React.js migration
- [ ] **P4 · m** — Changelog page?

---

## Navigation / Mobile Shell

- [ ] **P1 · m** — Fix mobile view for dashboard so it works with iPhone dock area
- [ ] **P1 · m** — Mobile nav bar: fix not being able to swipe left
- [ ] **P1 · m** — Bottom nav for mobile swipe-over fix
- [ ] **P2 · m** — Universal mobile view activator (esp. for events page)
- [ ] **P2 · m** — Better bottom nav for admin pages
- [ ] **P2 · m** — Better admin hub for mobile devices
- [ ] **P2 · l** — Mobile update tracker and force users to update their apps

---

## Dashboard

- [ ] **P2 · s** — Monthly contribution + next bill date placeholder for non-contributing members
- [ ] **P2 · m** — Dashboard quick links and additional pages

---

## Auth / Login / Onboarding

- [ ] **P2 · s** — Onboarding phone number
- [ ] **P2 · s** — Checks on the “you’re all set” fix for onboarding
- [ ] **P2 · m** — Enable notifications only after / if added to the homescreen (onboarding)

---

## Contribution / Billing

- [ ] **P2 · m** — Contribution page audit
- [ ] **P3 · l** — Borrow money feature

---

## Events — Core & List

- [ ] **P1 · s** — Past events go in their own Past Events section (not Tonight); on mobile remove the Past badge over the event banner
- [ ] **P1 · s** — Events page top nav combine for mobile
- [ ] **P2 · m** — Events page audit
- [ ] **P2 · s** — Event w/ raffle enter and sub-text fix
- [ ] **P2 · m** — Events page map view upgrade

---

## Events — RSVP / Attendance

- [ ] **P2 · m** — Add RSVP entry popup after people RSVP asking if they want to join the raffle
- [ ] **P2 · l** — Allow multi-RSVPing from one person (guests/kids — kid count; guests get names)

---

## Events — Raffle

- [ ] **P2 · m** — Add raffle discounted price + timeline before price increases (urgency)
- [ ] **P3 · m** — Improved raffle prize show-off to drive importance/urgency

---

## Events — Team / Roles / Chat / Tasks

- [ ] **P2 · l** — Add volunteer role for events (admins / coordinators / creators assign volunteers; access volunteer group chat)
- [ ] **P2 · xl** — Event group chat for roles (coordinators, creator, admins; later volunteers). Manage button + chat button → chat list / rooms
- [ ] **P2 · l** — Event to-do page (create/complete tasks; assign to volunteers, coordinators, creators, admins)
- [ ] **P3 · m** — Team page not hard-coded

---

## Events — Media / Summary / Merch

- [ ] **P2 · l** — Take images via the website and auto-upload to the DB
- [ ] **P2 · m** — After event management can audit images
- [ ] **P3 · l** — After event ends: summary with images and turnout description
- [ ] **P3 · m** — Replay and reaction feature for event discussion
- [ ] **P4 · xl** — Paid food plates system with menus?

---

## Events — Finance / Reporting

- [ ] **P3 · m** — Event expenses report feature

---

## Feed

- [ ] **P1 · s** — Feed page like count fix
- [ ] **P2 · s** — Feed page scroll on sorting
- [ ] **P2 · s** — Feed card background and border change depending on post type
- [ ] **P2 · m** — Feed notification for likes, comments, and replies

---

## Quests / Milestones / Cosmetics

- [ ] **P2 · s** — Quest page skeleton fix
- [ ] **P2 · m** — Milestone page audit
- [ ] **P2 · s** — Milestone page: date achieved and est. arrival date
- [ ] **P2 · m** — Milestone unlock revamp
- [ ] **P2 · l** — Complete cosmetic system override

---

## Investments / Finances

- [ ] **P2 · m** — Fix investments page
- [ ] **P2 · xl** — Auto-pull investment amount from Fidelity for the investments page
- [ ] **P2 · m** — Logo load on My Finances (account link instead of statement upload)

---

## Family Tree / Location

- [ ] **P2 · m** — Family tree page members-only full page fix
- [ ] **P3 · l** — Enable location for members to see locations (yours has to be active)

---

## Docs / Content

- [ ] **P2 · l** — Member-only docs page (general docs; role-gated create/edit/remove; role-specific docs)

---

## Admin

- [ ] **P1 · s** — Admin members page skeleton fix
- [ ] **P1 · s** — Admin event dashboard fix for going amount
- [ ] **P1 · m** — Admin page manage event fix
- [ ] **P2 · s** — Complete your profile notification control for admins

---

## Notifications (Push + SMS)

- [ ] **P2 · xl** — SMS via Twilio + solid notification foundation (separate SMS vs push; event RSVP opt-in, reminders, cancel; billing past-due; per-type member controls for events/feed/profile/etc.)

---

## Brand / Settings

- [ ] **P2 · m** — Brand settings: change mobile and desktop backgrounds (Supabase + code)

---

## Done

- [x] Audit over the entire roles system when it comes to roles of the website
- [x] Audit over the events page so event coordinators can manage events
- [x] Add ability to edit event title and description in the manage event module
- [x] Fix public events page to show full amount of attendees
- [x] Share button on event details should share the same link as manage-event invite link
- [x] Increase visual of the team module popup
- [x] Event tools UI height increase (full screen on mobile)
- [x] Change rules from `aiControl` into the actual Cursor rules folder (`.cursor/rules/`)
- [x] Fix next bill date not showing on index / dashboard (subscription refresh + hero bill date)
- [x] Time-based greeting on dashboard (Good morning / afternoon / evening)
- [x] Change login page to an image instead of the video
- [x] Dashboard Option A theme pass (hero contribution card, quick-link theme cards, full-width desktop layout, SW/CDN cache bust)
- [x] Organize md files into `docs/product`, `docs/business`, and `docs/legal`
