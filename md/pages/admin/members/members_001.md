# Members Page — Complete Overhaul Spec
**Files:** `admin/members.html` · `js/admin/members/index.js` (+ supporting modules) · DB migrations
**Audit Date:** April 21, 2026
**Revision:** v8 — Phase 5 Filtering & Attention shipped (search + sort + attention banner)
**Status:** ✅ Phase 1A + 1B + 2 + 3 + 4 (partial) + 5 Shipped — bulk-select stubs and perf audit deferred

### Implementation Status (as of April 21, 2026)

**Note on file paths:** Earlier revisions placed the JS modules at `js/admin/members-*.js`. The shipped Phase 1A structure groups them under `js/admin/members/` with `index.js` as the entry point.

| File | Status | Notes |
|---|---|---|
| `js/admin/members/members-status.js` | ✅ Complete | MEMBER_STATUS, STATUS_CONFIG, deriveMemberStatus, ATTENTION_FLAGS, HIGH_MED_FLAGS, FLAG_SEVERITY, deriveAttentionFlags, getFlagLabel. Phase 2 flags gated behind `authMeta`. |
| `js/admin/members/members-cards.js` | ✅ Complete | renderCard (status accent bar, 52px avatar, role chips with **safeHexColor sanitization**, status badge, monthly + total), renderEmptyState per tab, getInitials/getAvatarColor. No overflow menu yet (deferred to Phase 4 polish). |
| `js/admin/members/members-modal.js` | ✅ Complete (Phase 2) | Full tabbed profile sheet (Overview/Financials/Roles/Transactions/Settings). Lazy load + per-member cache (`_cache[memberId][tab]`). Mobile bottom-sheet → desktop right-side panel. Sticky header (avatar + name + status badge), sticky tab bar, scrollable content. Role toggle (member_roles upsert/delete + card refresh), Resend Invite (edge fn), Deactivate/Reactivate with two-click confirm pattern (no native window.confirm per §6f). |
| `js/admin/members/members-invite.js` | ✅ Complete (1B) | Full modal: `open`/`close`/`init`/`send`. Email validation, submit spinner, success state, esc-to-close, backdrop click, focus restore, idempotent `init()`. `_scheduleRefresh()` (800ms + retry at 2s) preserved. |
| `js/admin/members/index.js` | ✅ Complete | Main entry. `loadAllMembers()` parallel fetches 7 tables + `get_family_contribution_total` RPC. Returns `{members, stats}`. Renders 5 stat tiles, 6 tabs (counts from full array), client-side filter, member list. **Uses bare `supabaseClient` identifier** (script-scoped const, not on window). Defensive tab fallback to `'all'`. |
| `admin/members.html` | ✅ Complete | Single-doctype clean rewrite. Header + active invite button (1B pill removed). 5-tile stats row, `#membersTabs`, `#membersListContainer`, `#inviteModal`, `#memberSheet` (Phase 2: backdrop + sticky header + sticky tab bar + scrollable content). No inline JS, no `dashboard.js` reference, scripts loaded once each. |
| `admin/invite.html` | ✅ Complete (1B) | Meta-refresh + JS redirect to `members.html`. `noindex`, canonical link, fallback `<a>`. |

### Phase 1A Audit + Remediation Log

| Issue | Severity | Resolution |
|---|---|---|
| `members.html` corrupted with two concatenated documents + legacy modal markup + `onclick="closeMemberModal()"` inline JS | **Critical** | File truncated to single document. Verified: 1 doctype, 0 inline `onclick`, 0 `dashboard.js` refs, each script loaded exactly once. |
| All Time total computed client-side instead of canonical `get_family_contribution_total()` RPC | Risky | RPC added to `loadAllMembers()` `Promise.all`. Per-member sum kept as typed fallback when RPC errors. Stats now match `hub.js`/`transactions.js`. |
| Header invite button clickable but `open()` only logged — dead UI | Risky | `#inviteBtn` rendered with native `disabled` attribute, `aria-disabled`, `opacity-60 cursor-not-allowed`, "1B" pill, tooltip. `InviteModal.init()` refuses to bind handler when button is disabled. |
| Role chip colors interpolated raw into inline `style` (CSS / markup injection vector) | Risky | `safeHexColor()` validator added — only `#RGB`/`#RRGGBB`/`#RRGGBBAA` accepted; falls back to safe brand defaults otherwise. |
| `state.tab` could hold an unknown key and silently render empty | Minor | `_renderMemberList()` resets `state.tab` to `'all'` if it doesn't match a known tab. |
| Runtime: `Cannot read properties of undefined (reading 'from')` — IIFE used `global.supabaseClient` but config.js declares it as a top-level `const` (script-scoped, not on `window`) | **Critical** | Both `loadAllMembers()` and `_loadThisMonthTotal()` now reference bare `supabaseClient`, which resolves through the shared classic-script lexical scope. |

### Phase 1B Shipped (Invite Modal UI + Redirect)

| Deliverable | Status | Notes |
|---|---|---|
| `#inviteModal` markup in `admin/members.html` | ✅ | Backdrop + email input + error region + success state + Cancel/Send buttons. Mobile bottom-sheet (rounded-t-3xl) → desktop centered card (rounded-2xl). `aria-modal`, `aria-labelledby`, `role="dialog"`. |
| `#inviteBtn` enabled (disabled attr + 1B pill removed) | ✅ | Active hover/active states; no false-affordance gating needed. |
| `InviteModal.init()` wiring | ✅ | Idempotent. Binds: button click (open), close X, Cancel, backdrop click, form submit, Esc keydown. Restores prior focus on close. |
| `InviteModal._onSubmit()` | ✅ | Email regex validation, submit guard against double-submit, spinner + "Sending…" label, inline error region, success card auto-closes after 1.4s, then `_scheduleRefresh()` polls `membersPage.refresh()`. |
| `admin/invite.html` | ✅ Redirect-only | `<meta http-equiv="refresh" content="0; url=members.html">` + `window.location.replace` JS fallback + `noindex` + `<a>` text fallback. |

### Phase 2 Shipped (Tabbed Profile Sheet)

| Deliverable | Status | Notes |
|---|---|---|
| `#memberSheet` markup in `admin/members.html` | ✅ | Backdrop + sticky header (avatar, name, email, status badge, close X) + sticky tab bar + scrollable content area. Mobile = bottom-sheet (`rounded-t-3xl`, `max-h-[90vh]`); desktop = right-side panel (`sm:right-0`, `sm:max-w-xl`, full height). `aria-modal`, `aria-labelledby`, `role="dialog"`. |
| `js/admin/members/members-modal.js` | ✅ | Public API: `open(memberId)` / `close()` / `init()`. Reuses already-loaded enriched member from `membersPage._state.members` (no re-fetch on open). |
| Overview tab (eager) | ✅ | Attention-flag list (when present), 4 stat cells (Monthly, All Time, Active CP / lifetime, Streak), key/value rows (Member since, Push, Payout, Onboarding). |
| Financials tab | ✅ | Subscription status (color-coded), monthly amount, next bill date, Stripe ID, payout enrolled. Uses `member.subscription` from initial load. |
| Roles tab (lazy + cached) | ✅ | Fetches `roles` once per session per member into `_cache[id].allRoles`. Checkbox per role pre-checked from `member.roles`. Toggle inserts/deletes in `member_roles` and triggers `membersPage.refresh()` so card chips update. Inline "Saving…/Saved." status. Reverts checkbox on error. |
| Transactions tab (lazy + cached) | ✅ | Parallel fetch of paid `invoices` + `manual_deposits` for member (`limit 40` each), merge + sort desc by date, slice top 20. Per-row icon (↻ subscription / + deposit), date, amount. "Showing N most recent" footer. |
| Settings tab | ✅ | Phone + Username inputs (greyed, "Available after Phase 3 migration"). Resend Invite (only when `!setup_completed && !deactivated`) calls `invite-user` edge fn. Deactivate/Reactivate updates `profiles.is_active` + refreshes list + re-renders header & settings tab. |
| Two-click confirmation (no `window.confirm`) | ✅ | First click on Deactivate/Reactivate flips label to "Click again to deactivate/reactivate", adds red ring, sets 4s revert timer. Second click within window commits. Aligns with §6f (no native dialogs). |
| `index.js` wiring | ✅ | `MemberModal.init()` called at bootstrap. Card click handler invokes `MemberModal.open(id)` instead of `console.log`. |

---

### Phase 3 Shipped (DB Migrations + Settings/Status Wire-up)

| Deliverable | Status | Notes |
|---|---|---|
| `supabase/migrations/083_member_username_phone.sql` | ✅ | Adds `username` (text, optional) + `phone` (text, optional) to `profiles`. CHECK constraint enforces username format `^[A-Za-z0-9_]{3,20}$` (only when non-null). Unique partial index on `LOWER(username)` (case-insensitive, NULLs allowed). Lookup index on `phone`. |
| `supabase/migrations/084_user_last_active.sql` | ✅ | `public.admin_user_auth_meta()` SECURITY DEFINER function (gated by `public.is_admin()`) returning `(user_id, last_sign_in_at, email_confirmed_at, user_created_at)` for every `auth.users` row. Granted to `authenticated`. |
| `index.js` loader: auth-meta fetch | ✅ | `sb.rpc('admin_user_auth_meta')` added to the parallel fetch. Built into `authMetaMap` keyed by user_id with shape `{ confirmed_at, last_sign_in_at, invited_at }` (invited_at ← `user_created_at` when not yet confirmed). Passed into `deriveMemberStatus` + `deriveAttentionFlags` so `invited_unconfirmed`, `never_signed_in`, `inactive_30/90`, and `invite_expired` now activate. |
| `index.js` loader: graceful pre-migration fallback | ✅ | Profile SELECT first tries the Phase 3 column set. On Postgres `42703` (column does not exist), retries the Phase 2 set with a console warning. Auth-meta RPC failure is also captured and falls back to `authMeta=null` — the page works whether or not migrations have been applied. |
| Settings tab: editable username + phone | ✅ | Greyed inputs replaced with a `<form data-form="contact">` containing `username` (pattern `[A-Za-z0-9_]{3,20}`) + `phone` inputs and a Save button. `_onSaveContact` validates client-side, calls `profiles.update`, surfaces `23505` unique-violation as "That username is already taken", refreshes member list on success. Skips the round-trip when nothing changed. |
| Overview tab: "Last active" row | ✅ | New `_formatRelative()` helper renders `lastSignInAt` as "Just now / Nm ago / Nh ago / Nd ago / Nw ago / Mon DD, YYYY". "Never" when null. |

### Phase 4 Shipped (Polish, Partial)

| Deliverable | Status | Notes |
|---|---|---|
| Export CSV button | ✅ | `#exportCsvBtn` added to page header. `_exportMembersCsv(rows, tabKey)` exports the **currently filtered** member list as `members-<tab>-<YYYY-MM-DD>.csv`. UTF-8 BOM for Excel compatibility. CSV-injection guard prefixes a `'` to cells starting with `=/+/-/@`. Columns: Name, Email, Status, Role, Monthly $, Total $, Subscription status, Next bill, Username, Phone, Last sign-in, Joined. |
| Copy Email quick action | ✅ | "Copy" button rendered next to the email in the modal sticky header (when `member.email` present). `_onHeaderClick` uses `navigator.clipboard.writeText` with `document.execCommand('copy')` fallback for non-secure contexts. Inline ack: button label flips to "Copied!" → reverts after 1.5s. |
| Bulk select stubs | ⏳ Deferred | Out of scope for this commit. Spec retained. |
| Performance audit of `loadAllMembers()` | ⏳ Deferred | No regressions observed (page renders in <500ms on 17 members). Will revisit if member count grows. |

### Phase 5 Shipped (Filtering & Attention)

| Deliverable | Status | Notes |
|---|---|---|
| Search input in page header | ✅ | New `#memberSearchInput` with leading magnifier icon + clearable `×` button. 120ms debounced; updates `state.search`; matches against `first_name`/`last_name`/`email` (case-insensitive). Already-wired logic in `_applyFilters()` now actually drives by an input. |
| Sort dropdown | ✅ | New `#memberSortSelect` (Name A–Z / Newest first / Oldest first / Contribution ↓ / Recently active). New `state.sort` + `_applySort()` comparator. Last-active sort uses `lastSignInAt` (auth meta from migration 084). |
| Attention Banner (§6d) | ✅ | New `#attentionBanner` between stats row and toolbar. Renders only when ≥1 member has a HIGH_MED flag. Groups by primary flag (priority: `past_due` > `invite_expired` > `onboarding_stalled` > `inactive_90`), color-coded per accent map. Shows up to 5 names per group + "+ N more". "Filter to these" button toggles `state.attentionOnly`; collapse button replaces banner with a single summary row that re-expands on click. Names inside banner are clickable and open the member sheet. |
| "Needs Attention" tile click-through | ✅ | Tile is now a `<button id="statNeedsAttentionTile">`. Click toggles `state.attentionOnly` (overrides the active tab). When active: amber ring on the tile, banner re-expands, filtered list shows only members with HIGH_MED flags, and the page scrolls to the banner. Selecting any tab clears `attentionOnly`. New `attention` empty-state copy added to `MemberCards.renderEmptyState`. |

---

## 1. Executive Summary

The current `admin/members.html` is functional but shallow. It shows a list of member cards with basic subscription info and a modal for more detail, but it does not serve the real needs of an admin managing a family LLC contribution group. Key data that exists in the database — credit points, last sign-in, notification status, detailed onboarding progress, attention flags — is either hidden, inaccessible, or spread across a separate invite page that creates unnecessary navigation friction.

This overhaul makes `admin/members.html` the single lifecycle management hub for every member of the LLC. It absorbs the invite flow, introduces a centralized member status system, adds a rich tabbed profile sheet, surfaces attention/risk signals, and aligns visually with the newer `portal/index.html` design language.

**Core outcomes of this build:**
- One page manages everything: invite → onboarding → active → deactivated
- All member states derive from a single, consistent status system
- The profile sheet is a full admin workspace, not a status popup
- The page is built to work cleanly at current scale (17 members) and is architected to handle growth without a rewrite
- Visual language matches `portal/index.html`: heavy inline Tailwind, `rounded-2xl`, gradient accent cards, clean stat typography, white surface cards

**Constraints:**
- `admin/members.html` is **strictly admin-only**. It is not shared with or reused for member-facing UI. This justifies higher field density, operational controls, and visibility into sensitive data (phone numbers, notification state, subscription internals) that would never appear on a member portal page. Privacy assumptions for this page are admin-context assumptions, not member-context assumptions.
- No inline JS — all logic in `js/admin/members.js` and sub-modules
- Heavy inline Tailwind preferred over custom CSS classes
- Supabase anon client cannot access `auth.users` schema directly — this has data access implications addressed in Section 7
- Some features (username, phone, last active) require DB migrations before they can be implemented

---

## 2. Audit Findings — Current State

### 2a. `admin/members.html` + `js/admin/dashboard.js`

**What exists:**
- Member cards: avatar initials/photo, display name or email, role chips, onboarding badge (complete/incomplete), monthly amount, all-time total, subscription status badge
- Stats row: "This Month" collected (gradient brand card), Active count, All Time total with net/fee breakdown
- Past Due alert banner: auto-shown, lists members with `status = 'past_due'`
- Member detail modal (bottom sheet on mobile): avatar, name, email, role chips, role assignment checkboxes, birthday, next bill date, onboarding status, transaction history (invoices + manual deposits). The current "leadership title dropdown" is deprecated — titles are role-derived only (see Section 3, Decision 4).
- Deactivated members section: collapsible `<details>`, shows grayscale cards, reactivate button
- Deactivate button: desktop-only (hidden on mobile via `hidden sm:block`) — **functional gap on mobile**
- "Invite Member" button: navigates away to `invite.html` — **navigation friction**

**What is missing that data supports:**
- Last sign-in date (`auth.users.last_sign_in_at` — blocked by RLS, needs migration)
- Credit points (`credit_points_log` — data exists, never surfaced)
- Notification status (`notification_preferences.push_enabled` — data exists, never surfaced)
- Detailed onboarding checklist (only a boolean badge exists; profile fields are available to derive step completion)
- Search input, filter pills, sort controls
- Payout enrollment status (`profiles.payout_enrolled`, `connect_onboarding_complete`)
- Contribution streak (`profiles.contribution_streak`)
- Join date on card (only shown in modal)
- Username, phone (not in DB — need migration)
- Attention/risk indicators for dormant, expired invite, stalled onboarding members

**Code quality notes:**
- `loadMembers()`, `loadDeactivatedMembers()`, `loadStats()`, `loadPastDue()` are all separate fetches that could be consolidated
- Modal data loading uses sequential awaits in some places where parallel fetches are possible
- Deactivate/reactivate use `window.confirm()` and `window.alert()` — should become styled confirmation modals
- Role assignment in modal is functional but isolated; permission-based gating is done at the function call level in `shared.js`

### 2b. `admin/invite.html` + `js/admin/invite.js`

**What exists:**
- Invite form (email only, no name, no role pre-assignment)
- Three categorized sections pulled fresh from `profiles`: Pending (no name, no sub), Awaiting Subscription (setup_completed but no active sub), Active Members
- Resend invite button per pending member
- Uses `callEdgeFunction('invite-user', { email })` — calls `supabase.auth.admin.inviteUserByEmail()` via service role

**Structural problem:** These three sections duplicate data the members page already shows. Running two pages that independently query the same `profiles` table to show different views of the same data is wasteful and creates risk of inconsistency.

**Decision: Merge `invite.html` into `members.html`.** See Section 3.

### 2c. Live Database State (as of April 21, 2026)

| Metric | Value |
|---|---|
| Total profiles | 17 |
| Admin accounts | 2 (`justice.mcnealllc@gmail.com`, `mcneal.justin99@gmail.com`) |
| Active subscriptions | 4 |
| Past due subscriptions | 1 (`cmcneal84@gmail.com`) |
| Members with `setup_completed = false` | 4 (3 test accounts + `ydmcneal12826`) |
| Unconfirmed invite (expired link) | 1 (`ydmcneal12826@gmail.com`) |
| Never signed in (confirmed but 0 logins) | 1 (`smojottv@gmail.com`) — **known owner-controlled alt/test account; keep active, non-actionable** |
| Members with credit points | 2 (`mcneal.justin99`: 195 pts, `mcneal.shakeytha`: 120 pts) |

### 2d. Available DB Schema

**`profiles` (public, RLS):**
`id`, `email`, `role`, `is_active`, `setup_completed`, `first_name`, `last_name`, `birthday`, `profile_picture_url`, `title`, `bio`, `payout_enrolled`, `connect_onboarding_complete`, `contribution_streak`, `stripe_connect_account_id`, `profile_visibility`, `show_contribution_stats`, `show_birthday`, `cover_photo_url`, `displayed_badge`, `highlighted_badges`, `earned_banners`, `active_banner_key`, `dock_config`, `created_at`, `updated_at`

**`subscriptions` (public, RLS):**
`user_id`, `status`, `current_amount_cents`, `current_period_end`, `stripe_subscription_id`

**`notification_preferences` (public, RLS):**
`user_id`, `push_enabled`, `event_new`, `event_reminders`, `event_rsvp_updates`, `raffle_results`, `competition_updates`, `checkin_alerts`

**`credit_points_log` (public, RLS):**
`user_id`, `points`, `reason`, `quest_id`, `expires_at`, `created_at`

**`invoices` + `manual_deposits` (public, RLS):**
All-time total via `get_member_total_contributions(target_member_id)` RPC

**`member_roles` + `roles` + `role_permissions` (public, RLS):**
Role assignment, permission keys

**`auth.users` (auth schema — service role only):**
`last_sign_in_at`, `invited_at`, `confirmed_at`, `raw_user_meta_data` (contains `invited_by`, `invited_at`)
→ **Not accessible via anon client.** Requires a public DB view or edge function. See Section 7.

---

## 3. Core Product Decisions

### Decision 1: Merge invite.html into members.html — YES

**Rationale:**
- Inviting a member is simply the first step of the same lifecycle the members page manages
- The current `invite.js` independently queries `profiles` to show Pending/Awaiting/Active sections — this is exact duplication of what `dashboard.js` already does
- An admin navigating away from the members page just to send an email invite is needless friction
- Merging eliminates one page, one navigation round-trip, and one redundant data fetch

**Implementation:**
- "Invite Member" header button opens an `#inviteModal` slide-over instead of navigating away
- Invite modal contains: email input, send button, error/success messaging, and a "copy invite link" option (future)
- On successful invite, the member list refreshes; the new pending member is visible immediately (with optimistic handling detailed in Section 9)
- `invite.html` is kept as a permanent redirect to `members.html` for backward compatibility and any existing bookmarks/links

### Decision 2: `js/admin/dashboard.js` → `js/admin/members.js`

The current `dashboard.js` file name is ambiguous — it powers the members page, not a general dashboard. Rename to `members.js` and scope it entirely to this page. The file should be split into logical sub-modules if it grows beyond ~600 lines:

```
js/admin/
  members.js          ← main entry: init, data orchestration, event binding
  members-cards.js    ← member card render functions
  members-modal.js    ← profile sheet / modal logic
  members-invite.js   ← invite flow logic (absorbed from invite.js)
  members-status.js   ← centralized status derivation (see Section 4)
```

The split into sub-modules is optional at P0 but the naming convention (`members-*.js`) should be established from day one so future files are predictable.

### Decision 3: Client-Side Filtering in Phase 1, Paginated API Option in Phase 2

At current scale (17 members, growing slowly), a single unified fetch + client-side filter/sort is correct. This is simpler, eliminates per-tab round-trips, and gives instant filter response.

**However:** the data layer must be written to support a future swap to server-side pagination without rewriting the rendering logic. This is achieved by:
- Isolating the data-fetching responsibility in a single async function (`loadAllMembers()`) with a clear return contract
- Keeping render functions pure: they accept a member array and render it, regardless of where the array came from
- Defining sort/filter params as a state object that could later be passed as query params instead of applied client-side

See Section 7 for scale considerations.

### Decision 4: Role-Only Model for Leadership Titles

**Titles and leadership designations come exclusively from the predefined roles system. There is no free-text or independently editable title field on the members page.**

- Roles are created and managed from `admin/roles.html` — that page owns role definitions, names, and permissions
- The members page is responsible only for assigning and removing those roles from individual members
- The existing `profiles.title` column and the "leadership title dropdown" in the current modal are deprecated in this build
- Role chips displayed on card and in the profile sheet are the authoritative representation of a member's titles
- The profile sheet Settings tab does **not** include a free-text title field — role assignment is handled in the Roles tab
- If a custom cosmetic display title is ever needed in the future, it should be implemented as a named role, not a freeform text field

---

## 4. Member Status Rules

This is the most important architectural decision in this build. **All tabs, cards, badges, colors, empty states, and counts must derive from one centralized status function.** There is no separate "is it pending?" logic scattered across components.

### 4a. Canonical Status Values

| Status Key | Display Label | Color | Description |
|---|---|---|---|
| `active` | Active | `emerald` | `is_active = true` AND subscription `status IN ('active', 'trialing')` |
| `past_due` | Past Due | `red` | `is_active = true` AND subscription `status = 'past_due'` |
| `awaiting_subscription` | Awaiting Sub | `blue` | `is_active = true` AND `setup_completed = true` AND no active/trialing/past_due subscription |
| `pending` | Pending | `amber` | `is_active = true` AND `setup_completed = false` AND confirmed auth account |
| `invited_unconfirmed` | Invite Sent | `violet` | `is_active = true` AND `setup_completed = false` AND `confirmed_at IS NULL` in auth.users (requires last_active view — Phase 2 pending) |
| `deactivated` | Deactivated | `gray` | `is_active = false` |

**Notes:**
- Admins (`role = 'admin'`) are excluded from all non-`active`/`deactivated` status categories. Admins are not members contributing via subscription and should not appear in Pending/Awaiting/Past Due buckets.
- `invited_unconfirmed` requires the `last_active` DB view (Section 7, P3). Until that view is deployed, these members fall into `pending`. The Phase 1 implementation should be aware of this and plan for a clean upgrade path.
- **Dormant/inactive is not a canonical primary status. This is a final product decision.** Dormant members retain their factual status (`active`, `pending`, etc.) — the length of inactivity does not change that classification. Inactivity is surfaced exclusively as an attention flag (Section 8). This keeps the status system lean and avoids misclassifying paying-but-quiet members as something other than what they are.
- `past_due` takes priority over `awaiting_subscription` — if a member had a subscription that went past due and was then canceled, they should appear as `awaiting_subscription` (no active sub post-cancellation). If their sub is still technically `past_due` in Stripe, show `past_due`.

### 4b. Status Derivation Logic

This function lives in `js/admin/members-status.js` and is called on every member record after the data fetch:

```
function deriveMemberStatus(profile, subscription, authMeta) {
  // authMeta = { last_sign_in_at, confirmed_at } from user_last_active view (Phase 2)
  // Phase 1: authMeta may be null — gracefully falls back

  if (!profile.is_active) return 'deactivated';
  if (profile.role === 'admin') return 'active'; // admins always "active" for display

  const subStatus = subscription?.status;

  if (subStatus === 'active' || subStatus === 'trialing') return 'active';
  if (subStatus === 'past_due') return 'past_due';

  if (!profile.setup_completed) {
    if (authMeta && !authMeta.confirmed_at) return 'invited_unconfirmed';
    // future: check last_sign_in_at for dormant
    return 'pending';
  }

  return 'awaiting_subscription';
}
```

### 4c. Status Color / Badge Map

All UI elements must import from this single map — do not hard-code colors per component:

| Status | Badge BG | Badge Text | Card Accent | Tab Count Color |
|---|---|---|---|---|
| `active` | `bg-emerald-100` | `text-emerald-700` | left border `border-emerald-400` | emerald |
| `past_due` | `bg-red-100` | `text-red-700` | left border `border-red-400` | red |
| `awaiting_subscription` | `bg-blue-100` | `text-blue-700` | left border `border-blue-300` | blue |
| `pending` | `bg-amber-100` | `text-amber-700` | left border `border-amber-400` | amber |
| `invited_unconfirmed` | `bg-violet-100` | `text-violet-700` | left border `border-violet-300` | violet |
| `deactivated` | `bg-gray-100` | `text-gray-500` | none (card greyscale + opacity-60) | gray |

### 4d. Implementation Note — Phase 1 vs Phase 2

- **Phase 1:** `deriveMemberStatus()` does not have `authMeta` (no last_active view yet). `invited_unconfirmed` is not distinguished from `pending`. Both map to the `pending` display. This is acceptable and honest.
- **Phase 2 (post-migration):** Once the `user_last_active` view is deployed, pass `authMeta` into `deriveMemberStatus()`. The `pending` tab will split into `pending` + `invited_unconfirmed` automatically.
- The tab structure must be designed in Phase 1 to accommodate the future `invited_unconfirmed` tab without a layout rewrite. Reserve the space or merge it under `pending` with a sub-indicator badge.

---

## 5. Proposed Page Architecture

### 5a. Page Layout — Top to Bottom

```
[ Nav Placeholder ]

[ Page Header ]
  Title: "Members"
  Subtitle: "Family lifecycle management"
  Right: [ Search Input ] [ + Invite Member button ]

[ Stats Row — 5 tiles ]
  1. This Month · gradient brand card (indigo, full-width on mobile)
  2. Active Members count
  3. All Time Total
  4. Total Invited (all profiles ever created)
  5. Needs Attention count (past_due + invited_unconfirmed + dormant)

[ Attention Banner ] (conditionally shown — see Section 8)
  Collapsed or expanded list of members needing action

[ Status Filter Tabs ]
  All (n) | Active (n) | Pending (n) | Past Due (n) | Awaiting Sub (n) | Deactivated (n)

[ Sort + Search Bar ] (secondary toolbar below tabs)
  Sort: Name A–Z | Join Date | Contribution ↓ | Last Active
  Search: real-time filter by name / email

[ Member List — cards ]
  One card per member, filtered/sorted by active tab

[ #inviteModal — slide-over ]
  Email input + invite button + post-send state

[ #memberSheet — full-screen modal / bottom sheet ]
  Tabbed profile workspace (see Section 5b)

[ Footer / Tabs Placeholders ]
```

### 5b. Profile Sheet (Member Modal) — Tab Architecture

The profile sheet replaces the current single-scroll modal. On mobile it behaves as a full-height bottom sheet. On desktop it is a fixed right-side panel or centered modal up to `max-w-2xl`.

**Internal tab bar (sticky at top of sheet):**

```
Overview | Financials | Roles | Transactions | Settings
```

Each tab has a lazy-load strategy:

| Tab | Load on open? | Load strategy |
|---|---|---|
| **Overview** | Yes — always | Eager. Data loaded as part of the main `openMemberSheet(userId)` call. Includes profile fields, status, onboarding checklist, engagement stats (streak, CP), last active, notification summary. |
| **Financials** | Yes — lazy | Load when tab first selected. Fetches subscription detail, next bill date, payout enrollment. Shows skeleton while loading. Cached after first load. |
| **Roles** | Yes — lazy | Load when tab first selected. Fetches all roles + member's assigned roles. Cached after first load. |
| **Transactions** | Deferred | Load when tab first selected. Fetches invoices + manual deposits, limited to 20 most recent. "Load more" option for deeper history. Uses skeleton cards. |
| **Settings** | Deferred | Load when tab first selected. Inline editing fields: phone (admin-only), username. Deactivate/Reactivate action. Resend invite (conditional). Role assignment is handled in the Roles tab, not here. No free-text title field. |

**Lazy load implementation pattern:**
- Each tab section has a `data-loaded="false"` attribute
- `switchTab(tabName)` checks this attribute; if false, calls the appropriate `loadTabData(userId, tabName)` function
- On success, sets `data-loaded="true"` and caches the data in a module-level `memberCache[userId][tabName]` object
- Reopening the sheet for the same user within a session uses the cache. A "Refresh" button (small, subtle) in the sheet header forces a cache invalidation

**Tab persistence:** Last selected tab is stored in a module-level variable `currentSheetTab`. Reopening a different member starts on Overview, not the last tab, to avoid confusion.

### 5c. Stats Tiles — Definitions

| Tile | Source | Note |
|---|---|---|
| This Month | `invoices` (paid, current month) + `manual_deposits` (current month) | Use existing `thisMonthTotal` logic |
| Active Members | `subscriptions` where `status IN ('active','trialing')` | Exclude admins |
| All Time Total | `get_family_contribution_total()` RPC | Keep existing |
| Total Invited | `profiles` count (all, including deactivated) | Simple COUNT |
| Needs Attention | Count of members with any attention flag (see Section 8) | Derived client-side from data already loaded |

"Needs Attention" tile uses an amber/orange accent rather than a neutral color to create urgency. Clicking it should scroll to the Attention Banner or activate a filter showing only flagged members.

---

## 6. UX / Visual Overhaul Plan

### 6a. Visual Direction — portal/index.html as Reference

The portal dashboard uses these patterns consistently:
- `rounded-2xl` on all cards
- Primary stat card: `background: linear-gradient(135deg, #1b6fe8, #1558c0)` — full-width on mobile, left-half on desktop
- White surface cards: `card-bg` (white bg, subtle border or shadow)
- Label typography: `font-bold uppercase tracking-widest` at `font-size: 10px; color: #6366f1` — used as section labels and sub-labels
- Stat numbers: `font-extrabold tracking-tight stat-number` — 28–48px depending on context
- Action buttons: pill-style with colored background + white icon + white label (`quick-btn`)
- Accent icons: small colored square container (`w-7 h-7 rounded-lg`) with icon inside
- Heavy inline style attributes for specific pixel values; Tailwind for structure/spacing

The members page should feel like a sibling to the portal dashboard — same design system, different purpose.

### 6b. Member Card Design

Each card is `rounded-2xl bg-white border border-gray-200/80` with a subtle left-side status accent bar (4px, colored per status). Cards are fully clickable (opens profile sheet). No inline buttons on cards except overflow "..." menu on desktop for quick actions.

**Card layout (two rows):**

```
Row 1:
[ Status accent bar ][ Avatar 52px ][ Full Name (bold) + role chips ][ Status Badge ][ ... menu ]
Row 2 (below name):  [ email, lighter ]                              [ $50/mo · Total $xxx ]
Row 3 (below email): [ join date or last active — relative ]         [ > arrow ]
```

- Avatar: 52×52px circle with initials fallback (color derived from email hash) or photo
- Status accent bar: 4px left border using status color (e.g., `border-l-4 border-emerald-400`)
- Last active: shown as relative string when available from Phase 2 migration; omitted in Phase 1
- `...` overflow menu (desktop only, 3-dot button): Copy Email, Resend Invite (conditional), Deactivate/Reactivate, Sync Subscription (conditional)
- Deactivated cards: `opacity-60 grayscale` filter on avatar, no status accent bar, muted text

### 6c. Invite Modal Design

The invite modal is a simple slide-over that appears from the right on desktop, or a bottom sheet on mobile. It does not need to be complex:

```
[ Header ] Invite Family Member  [ X close ]
[ Subtext ] Send an email invitation to join the portal
[ Email input ]
[ Send Invitation button ]

[ Post-success state (replaces form): ]
  ✅ "Invitation sent to email@example.com"
  [ Invite Another ] [ Done ]
```

No additional fields required at P0. Future: optional first name field for personalized invite email.

### 6d. Attention Banner

A dismissible, collapsible banner that appears between the stats row and the filter tabs when any member has an attention flag. Styled like the `pastDueBanner` in `portal/index.html` but expanded to list multiple types.

Example states:
- `past_due` members: red accent, lists names + amounts
- Expired/unconfirmed invites: violet accent, "Invite link expired for ydmcneal12826@gmail.com — Resend"
- Stalled onboarding (pending >14 days): amber accent
- Never signed in (>90 days since invite): gray accent with "Dormant" label

The banner compresses to a single summary line when dismissed: "3 members need attention ↓". Re-expands on click.

### 6e. Empty States Per Tab

Every filter tab must have a real, helpful empty state — not just a blank area:

| Tab | Empty State Copy | CTA |
|---|---|---|
| All | "No members yet. Start by inviting someone." | "Invite Member" button |
| Active | "No active members yet." | "Invite Member" button |
| Past Due | "🎉 No past due members. Everyone is paid up!" | None |
| Pending | "No pending invitations." | "Invite Member" button |
| Awaiting Sub | "No members awaiting subscription setup." | None |
| Deactivated | "No deactivated members." | None |

### 6f. Confirmation Dialogs

Replace all `window.confirm()` and `window.alert()` calls with styled inline confirmation states:
- Deactivate: shows a confirmation card within the modal with "This will cancel their subscription and prevent login. Their history is preserved." + Cancel / Confirm Deactivate buttons
- Reactivate: inline confirmation "This will allow them to log in again. They'll need to set up a new subscription." + Cancel / Confirm Reactivate buttons
- Both should show a loading state on the confirm button during the edge function call

---

## 7. Data / Schema / Access Considerations

### 7a. Unified Data Fetch Strategy (Phase 1)

A single `loadAllMembers()` function fetches everything needed to render the full list in parallel:

```
const [profiles, subscriptions, invoiceTotals, depositTotals, memberRoles, notifPrefs, creditTotals] = await Promise.all([
  supabaseClient.from('profiles').select('...all needed columns...'),
  supabaseClient.from('subscriptions').select('user_id, status, current_amount_cents, current_period_end'),
  supabaseClient.from('invoices').select('user_id, amount_paid_cents').eq('status', 'paid'),
  supabaseClient.from('manual_deposits').select('member_id, amount_cents'),
  supabaseClient.from('member_roles').select('user_id, roles(id, name, color, icon, position)'),
  supabaseClient.from('notification_preferences').select('user_id, push_enabled'),
  supabaseClient.from('credit_points_log').select('user_id, points, expires_at'),
]);
```

After fetching, build lookup maps keyed by `user_id` for all related tables. Then derive status, compute totals, and build enriched member objects — all in one pass — before rendering.

**Return contract:** `loadAllMembers()` returns `{ members: EnrichedMember[], stats: PageStats }` where `EnrichedMember` is a plain object with all display-ready data attached.

### 7b. Future-Proofing for Scale

Phase 1 loads all members into memory. This is correct at current scale and for the foreseeable future. However, the architecture must not assume this is permanent.

**Rules to follow in Phase 1 that keep Phase 2 viable:**
1. `loadAllMembers()` is the only data entry point — rendering functions never fetch their own data
2. Filter/sort logic is applied to a local `allMembers` array, not baked into the fetch query
3. The filter/sort state (`{ tab, search, sortBy }`) is a plain object in module scope, not derived from DOM state at render time
4. Tab counts are always computed from the full unfiltered `allMembers` array, even when displaying a filtered view

**Future scale concerns to document (not implement):**
- Long transaction history in the profile sheet will need pagination — the current "load all transactions" approach will slow down for high-volume members
- Credit points log may grow large for active quest users — aggregate queries or a materialized view may outperform per-render SUM queries
- If member count exceeds ~200, the parallel Promise.all fetch will grow slowly; consider batching or server-side pagination at that point
- The `get_member_total_contributions` RPC should be profiled before scaling; if slow, replace with a pre-aggregated `member_contribution_totals` table maintained by triggers

### 7c. Credit Points — Active vs Lifetime

**Active points:** `SUM(points) WHERE user_id = ? AND expires_at > NOW()` — what the member can currently spend
**Lifetime points:** `SUM(points) WHERE user_id = ?` — includes expired points, shows engagement history

**Display rules:**
- **Member card:** Show active points only (compact, e.g., `195 CP`). Omit if 0.
- **Profile sheet Overview tab:** Show active points prominently + lifetime earned in smaller text below (e.g., "195 CP active · 320 lifetime")
- **Phase 1:** Compute client-side from the already-fetched `credit_points_log` array after filtering by `expires_at > new Date()`
- **Future concern:** If the points log grows very large (thousands of entries per user), a pre-aggregated view or trigger-maintained `profiles.credit_points_active` column is worth adding. Not needed at current scale.

### 7d. Last Active — Data Access Plan

**Problem:** `auth.users.last_sign_in_at` is in the `auth` schema which is blocked from the anon/public role via Postgres RLS.

**Phase 1 (no migration):** Last active is not shown. Cards show join date as a substitute. This is clearly noted in the UI — no silent blank fields.

**Phase 2 (recommended migration):** Create a public view that exposes only the needed columns, with a row-level policy scoped to admin:

```sql
-- Migration: supabase/migrations/XXX_last_active_view.sql
CREATE OR REPLACE VIEW public.user_last_active AS
  SELECT id, last_sign_in_at, confirmed_at, invited_at
  FROM auth.users;

-- Grant to authenticated role (admin check handled by RLS or at query level)
GRANT SELECT ON public.user_last_active TO authenticated;

-- Optional: Add RLS policy if table-level grants are insufficient
-- (Supabase views on auth schema may need additional pg_* setup)
```

**Note:** Depending on Supabase version, views over `auth.users` may require a security definer function instead of a plain view. Validate in a migration test before adding to the main migration sequence.

**Alternative (edge function):** A `get-member-last-active` edge function with service role can batch-return `{ userId, last_sign_in_at }[]` for all members. This avoids the view migration but adds latency and a function call. Use only if the view approach is blocked.

### 7e. Username + Phone Schema

**Migration:** `supabase/migrations/XXX_add_username_phone.sql`

```sql
ALTER TABLE profiles
  ADD COLUMN username TEXT UNIQUE,
  ADD COLUMN phone TEXT;

-- Index for username lookups
CREATE INDEX idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
```

**Validation rules for `username`:**
- Lowercase alphanumeric characters and underscores only: `^[a-z0-9_]{3,20}$`
- Min length: 3 characters. Max length: 20 characters
- Must be globally unique (enforced by UNIQUE constraint)
- Cannot start with a number or underscore
- Stricter regex: `^[a-z][a-z0-9_]{2,19}$`
- On conflict: return a clear error "Username already taken. Try `yourname_2`." — do not auto-generate alternatives
- Case handling: always store as lowercase. If user types `JustinMcNeal`, normalize to `justinmcneal` before insert
- Optional at onboarding (existing members should not be blocked). Can be set later in portal settings.

**Phone rules:**
- Phone is an **additive, optional field**. Existing members remain fully onboarded (`setup_completed = true`) regardless of whether their phone is blank. Adding phone to the schema or to onboarding flows does **not** reset or invalidate `setup_completed` for any existing account.
- Existing members are **not reclassified as incomplete** because phone is missing. No existing member will be redirected to onboarding or flagged as pending due to a blank phone field.
- Store as plain text (no formatting enforcement at DB level)
- Frontend validation: basic E.164 format check or 10-digit US number fallback
- **Admin-facing:** Admins can view and edit any member's phone number in the profile sheet Settings tab. Phone is visible on the admin members page only — never on member-facing pages.
- **Member-facing:** Members can set and edit their own phone number in portal settings (`profiles.phone`). No member can view another member's phone number.
- Storing a phone number does **not** imply SMS consent. See Section 7g.

**Where each field appears:**

| Location | Username | Phone |
|---|---|---|
| Member card (admin) | No — too dense | No |
| Profile sheet Overview tab | Yes — below email | Yes — below username |
| Profile sheet Settings tab | Yes — editable inline | Yes — editable inline (admin only) |
| Onboarding step (future, new flows only) | Optional — no impact on existing members | Optional — no impact on existing members |
| Portal profile/settings | Yes — member can set | Yes — member can set (hidden from others) |

### 7f. Notification Preferences — Admin View Only

Notification data is available from `notification_preferences` and `push_subscriptions` tables.

**In the profile sheet (Overview tab):**
- Show a simple push-enabled status: `🔔 Push On` / `🔕 Push Off` — styled as a compact badge
- Show individual preference summary as a mini icon grid (event, reminders, raffle, etc.) — icons with green/gray tone based on boolean

**Admin cannot toggle these.** They are read-only signals for the admin. The value is: if a member says they're not getting notifications, the admin can confirm whether push is actually enabled at the system level.

---

### 7g. Phone Storage vs SMS Consent — These Are Separate Concerns

**Final product decision: storing a phone number in `profiles.phone` does not imply that the member has consented to receive SMS messages. These are two completely separate things.**

- `profiles.phone` is a contact record only. It stores a number and nothing else.
- SMS opt-in consent must be tracked as its own field or table — not inferred from phone being populated
- The admin members page must never display a member's phone number with any implied "SMS OK" status based solely on the field being set
- If a member later changes their phone number, any previously recorded SMS consent may be invalidated and may require re-confirmation depending on applicable compliance policy (TCPA)

**Recommended future addition:** Add an `sms_opt_in BOOLEAN DEFAULT FALSE` column to `profiles`, or a dedicated `sms_consent_log` table if a full audit trail is needed. This is out of scope for the current members page build. The admin should not be able to toggle SMS consent for a member — consent must come from the member directly.

**For this build:** The Settings tab shows and edits `phone` only. There is no SMS toggle, SMS status badge, or assumption of SMS permission anywhere in this page.

---

## 8. Attention / Risk Layer

This is a secondary layer that **does not replace the status system**. Every member has one canonical status. Separately, members can have zero or more attention flags. The attention flags power the Attention Banner (Section 6d) and secondary indicators on cards.

### 8a. Attention Flag Definitions

| Flag Key | Condition | Severity | Display |
|---|---|---|---|
| `past_due` | subscription `status = 'past_due'` | High | Red dot on card, listed in banner |
| `invite_expired` | `setup_completed = false` AND `confirmed_at IS NULL` AND `invited_at < 7 days ago` (Phase 2) | Medium | Violet dot, banner entry with Resend action |
| `onboarding_stalled` | `setup_completed = false` AND `confirmed_at IS NOT NULL` AND profile created > 14 days ago | Medium | Amber dot, banner entry |
| `never_signed_in` | `last_sign_in_at IS NULL` AND `confirmed_at IS NOT NULL` (Phase 2) | Low | Gray dot, banner entry |
| `inactive_30` | `last_sign_in_at < 30 days ago` (Phase 2 — optional) | Low | Subtle gray indicator, banner in "All dormant" rollup |
| `inactive_90` | `last_sign_in_at < 90 days ago` (Phase 2 — optional) | Medium | Amber dot, surfaced in banner |
| `no_subscription` | `setup_completed = true` AND no active/trialing sub | Low | Blue dot (matches awaiting_subscription status) |
| `payout_incomplete` | `payout_enrolled = false` AND payouts are globally enabled | Low | Shown in modal only, not card |

### 8b. Attention Flag Implementation

Flags are derived client-side after the data fetch, alongside status derivation. Each enriched member object includes an `attentionFlags: string[]` array.

The Attention Banner renders from `allMembers.filter(m => m.attentionFlags.length > 0)`.

The "Needs Attention" stat tile counts `allMembers.filter(m => m.attentionFlags.some(f => HIGH_PRIORITY_FLAGS.includes(f))).length` — limiting to high and medium severity to avoid over-alerting.

**Phase 1 flags available without migration:** `past_due`, `onboarding_stalled`, `no_subscription`, `payout_incomplete`

**Phase 2 flags (need last_active view):** `invite_expired`, `never_signed_in`, `inactive_30`, `inactive_90`

**Test account suppression:** Accounts with `is_test_account = true` (future field — see Section 11, Risk #3) should be excluded from the Attention Banner and the "Needs Attention" stat tile count even when they technically match flag conditions. Until the field exists, the admin must manually disregard flags for known test accounts (`smojottv@gmail.com`).

---

## 9. Invite Flow — Edge Cases and Post-Invite Sync

### 9a. Post-Invite Refresh Strategy

When `invite-user` edge function returns success, the following sequence happens:
1. Supabase creates a row in `auth.users` with `invited_at` set
2. A DB trigger creates a partial row in `profiles` with default values (`setup_completed = false`, `is_active = true`, `role = 'member'`)
3. The profile row may take 100–500ms to appear due to trigger execution timing

**Do not use pure optimistic UI for invite.** The profile row must exist before rendering a card for the new member, otherwise the card render will have incomplete data.

**Recommended strategy:**
1. Show invite modal success state ("Invitation sent to x@example.com ✅")
2. Wait 800ms (debounce for trigger execution)
3. Call `loadAllMembers()` to refresh the full list
4. The new member appears in the Pending tab with amber status badge
5. If the refresh fails to find the new profile (edge case — trigger delay), show a "Refreshing list..." spinner and retry once after 2s

### 9b. Invite States on the Card

| Auth state | Profile state | Display |
|---|---|---|
| `confirmed_at IS NULL` | partial profile | "Invite Sent" badge (violet). Phase 1: shows as Pending amber. Phase 2: shows correct `invited_unconfirmed` state. |
| `confirmed_at IS NOT NULL`, never signed in | `setup_completed = false`, no name | Pending amber. `never_signed_in` attention flag if > 90 days. |
| `confirmed_at IS NOT NULL`, signed in | `setup_completed = false`, partial name | Pending amber. `onboarding_stalled` flag if > 14 days. |
| Signed in, completed onboarding | `setup_completed = true`, no active sub | `awaiting_subscription` status |

### 9c. Resend Invite

Resend invite button is shown in two places:
1. Overflow menu on the member card (when member has `pending` or `invited_unconfirmed` status)
2. Profile sheet Settings tab (same condition)

**Behavior:** Calls the `invite-user` edge function with `{ email, resend: true }`. This uses `supabase.auth.resetPasswordForEmail()` (existing implementation — no change needed). On success: shows inline confirmation "Invite resent to x@example.com".

**Expired invite note:** Supabase invite links expire after 24 hours by default (configurable in Supabase Auth settings). After expiry, the user cannot accept the original invite but `confirmed_at` remains null. Resend sends a fresh password reset email as a workaround. The admin should be told this in the resend confirmation: "A new email has been sent — their original invite link has expired."

### 9d. Partial Profile Handling

If an invited member's profile row exists but has no `first_name`/`last_name`, the card and sheet must handle this gracefully:
- Display name falls back to email (existing behavior — keep)
- Initials fallback: parse email prefix (`smojoyt` → `SM`) — existing `getInitials()` function handles this
- No error states for missing optional fields — just omit them silently (but show in the onboarding checklist as incomplete)

---

## 10. Roadmap by Priority

### P0 — Foundation (Launch Blocker)

**P0.1 — Merge invite into members page**
- Remove `<a href="invite.html">` button from header
- Add `#inviteModal` slide-over with email form
- Move `handleInvite()` to `js/admin/members-invite.js`
- Post-invite: 800ms delay + `loadAllMembers()` refresh
- `invite.html`: add `<meta http-equiv="refresh">` redirect to `members.html`
- Dependency: none

**P0.2 — Centralized status system**
- Create `js/admin/members-status.js` with `deriveMemberStatus()`, `STATUS_COLORS` map, `getStatusBadge()`
- All existing badge/color logic in `dashboard.js` replaced with calls to this module
- Dependency: none — this is purely a refactor of existing logic

**P0.3 — Unified data fetch (`loadAllMembers()`)**
- Consolidate `loadMembers()`, `loadDeactivatedMembers()`, `loadStats()`, `loadPastDue()` into one parallel fetch
- Build enriched member objects with status, attention flags, totals, roles in a single pass
- Dependency: P0.2

**P0.4 — Status filter tabs**
- Replace current flat members grid with a tab bar: All | Active | Past Due | Pending | Awaiting Sub | Deactivated
- Tab counts derived from full unfiltered data
- Client-side filter on tab select
- Dependency: P0.3

**P0.5 — Search bar**
- Real-time filter across `first_name`, `last_name`, `email`
- Debounced at 150ms
- Dependency: P0.3

---

### P1 — Visual Overhaul

**P1.1 — Member card redesign**
- Left-side status accent bar (4px, color from STATUS_COLORS)
- Avatar bump to 52px
- Two-row layout: name + role chips / email + financial info
- `...` overflow menu with quick actions (copy email, resend, deactivate)
- Deactivate button removed from card inline — moved entirely to overflow menu + modal
- Dependency: P0.2

**P1.2 — Stats row refresh**
- Add "Total Invited" tile and "Needs Attention" tile
- Style primary tile to match portal/index.html gradient (indigo gradient, full-width on mobile)
- Dependency: P0.3

**P1.3 — Page header + sort bar**
- Page header with title, subtitle, Invite button
- Secondary toolbar below tabs: Sort dropdown + search
- Sort options: Name A–Z, Join Date, Contribution ↓, Last Active (greyed out until Phase 2)
- Dependency: P0.4, P0.5

**P1.4 — Attention Banner**
- Collapsible banner between stats and tabs
- Shows only when attention flags exist
- Lists members + flag descriptions + inline actions (Resend, etc.)
- Dependency: P0.3

**P1.5 — Empty states per tab**
- Custom empty state HTML per tab (see Section 6e)
- Dependency: P0.4

**P1.6 — Styled confirmation dialogs**
- Replace `window.confirm()` + `window.alert()` with inline confirmation UI in the modal
- Dependency: none (standalone)

---

### P2 — Profile Sheet Expansion

**P2.1 — Profile sheet tab navigation**
- Add tab bar: Overview | Financials | Roles | Transactions | Settings
- Lazy load strategy per tab (data-loaded attribute, cache per userId)
- Dependency: none (modal already exists)

**P2.2 — Overview tab: new fields**
- Join date (from `profiles.created_at`)
- Payout enrolled status + connect onboarding complete
- Active credit points + lifetime credit points (computed from fetched log)
- Contribution streak
- Push notification status (badge)
- Notification preferences summary (icon grid)
- Onboarding checklist (derives step completion from profile fields)
- Dependency: P2.1

**P2.3 — Financials tab**
- Subscription status, amount, next bill date (existing — move to own tab)
- Payout/bank link status
- Sync Stripe button (existing — move here)
- Dependency: P2.1

**P2.4 — Transactions tab with pagination**
- Load most recent 20 transactions on tab open
- "Load more" button fetches next 20
- Dependency: P2.1

**P2.5 — Settings tab**
- Phone number editor (admin-only; requires P3.1 migration)
- Username display / editor (requires P3.1 migration)
- Deactivate / Reactivate action (move from card + replace existing alert-confirm with styled UI)
- Resend invite action (conditional)
- **Note:** There is no free-text leadership title field here. Role assignment is handled in the Roles tab (P2.3). The deprecated `profiles.title` column is not surfaced for editing.
- Dependency: P2.1, P3.1 for phone/username fields

---

### P3 — DB Migrations (Enablers)

**P3.1 — Add `username` and `phone` to `profiles`**
- Migration: `supabase/migrations/XXX_add_username_phone.sql`
- Add unique index on `username`
- No breaking changes — both columns are nullable
- Unlocks: username/phone fields in P2.5, onboarding update

**P3.2 — Last active public view**
- Migration: `supabase/migrations/XXX_last_active_view.sql`
- Creates `public.user_last_active` view over `auth.users`
- Verify Supabase version compatibility (security definer may be required)
- Unlocks: last active on cards, `invited_unconfirmed` status, `never_signed_in` attention flag, inactive_30/90 attention flags, "Last Active" sort option

**P3.3 — Update onboarding flow** (separate page build, not part of this spec — flagged as dependency)
- Add optional username step to new onboarding flows
- Add optional phone step to new onboarding flows
- **Critical: these changes apply to new sign-up flows only. Existing members with `setup_completed = true` are not affected. Adding phone or username steps to onboarding does NOT reset `setup_completed` for any existing account, and existing members must not be redirected to onboarding or reclassified as incomplete because these fields are blank.**
- Dependency: P3.1

---

### P4 — Polish and Operational Tools

**P4.1 — Export CSV**
- Client-side CSV generation from `allMembers` array
- Columns: Full Name, Email, Status, Monthly Amount, Total Contributed, Join Date, Last Active
- Download as `jmllc-members-{date}.csv`
- Dependency: P0.3

**P4.2 — Copy email quick action**
- Clipboard API copy from overflow menu on card
- Small toast confirmation: "Email copied"
- Dependency: P1.1

**P4.3 — Bulk actions (future)**
- Checkbox selection per card
- Bulk deactivate, bulk role assign
- Not in this build — design the card checkbox UI now so it can slot in later without a layout rewrite
- Dependency: P1.1

---

## 11. Risks / Edge Cases / Open Questions

### Risks

1. **`user_last_active` view over `auth.users`** — Supabase may require a security definer function rather than a plain view for queries on the `auth` schema. Validate this in a throwaway migration before committing the final migration file. If it fails, fall back to an edge function that batch-returns `last_sign_in_at` for all members.

2. **Trigger timing on invite** — The `profiles` row is created by a DB trigger after `auth.users` insert. In high-latency conditions, the 800ms post-invite delay may not be sufficient. Consider a retry-with-backoff: refresh at 800ms, retry at 2s if the profile isn't found yet, show an error after 5s total.

3. **`smojottv@gmail.com` — known owner-controlled alt/test account** — This is a known alt account operated by the business owner. It confirmed the invite and has technically never signed in, but this is not an inactive real member — it is a test account. **It should remain active. Do not recommend deactivation.** This account will still surface `onboarding_stalled` and `never_signed_in` attention flags because it objectively meets those conditions — but these flags are non-actionable for this account. To handle this cleanly at a system level, a future migration should add `is_test_account BOOLEAN DEFAULT FALSE` to `profiles`. Accounts marked as test accounts should be excluded from the Attention Banner, the "Needs Attention" stat tile count, and any analytics aggregations. Until that flag is implemented, the admin should simply disregard attention signals for this account.

4. **`karrykrazellc@gmail.com` — real member, just completed onboarding today** — This member now has `setup_completed = true` but still no subscription. They will appear in the `awaiting_subscription` tab. Make sure the `awaiting_subscription` empty state and card design handle "just onboarded, no sub yet" gracefully (as expected state, not an error).

5. **`ydmcneal12826@gmail.com` — unconfirmed invite, expired link** — Needs resend. First visible in Phase 2 as `invited_unconfirmed`. In Phase 1 this member appears as `pending`. The attention flag `onboarding_stalled` (created > 14 days, no completion) will fire correctly in Phase 1 since the profile was created March 10.

6. **Role assignment race condition** — If an admin opens the member sheet and assigns roles quickly, the checkbox toggle calls individual insert/delete operations. If two admins manage roles simultaneously (unlikely but possible), last-write-wins. No fix needed now, just document.

### Resolved Product Decisions

All items below were previously open questions. They are now approved decisions.

1. **`smojottv@gmail.com` — keep active.** This is a known owner-controlled alt/test account. It is not an inactive real member. Do not deactivate. Attention flags it generates are non-actionable. Future: add `is_test_account` flag to exclude it from attention summaries and analytics. See Risk #3.

2. **Dormant/inactive — attention flag only, never a primary status.** A member who has gone quiet is still `active` (if their subscription is active) or `pending` (if they never finished onboarding). Inactivity is surfaced via attention flags in the banner and on the card. The canonical status system remains clean and limited to the 6 statuses in Section 4.

3. **Phone number visibility — member can view and edit their own, admin can view and edit all.** Members set their phone in portal settings. No member sees another member's phone. Admins see and edit all phone numbers in the profile sheet. Adding phone does not affect `setup_completed` or onboarding state for anyone.

4. **Credit points card display — only show if active balance > 0.** Do not display `0 CP` on cards with no points. The profile sheet (Overview tab) shows both active and lifetime totals for all members regardless.

5. **Leadership titles — role-only (Model A). Final.** There is no free-text title field anywhere on this page. Titles and designations come only from role assignment. See Section 3, Decision 4.

6. **Last active display — always show when data is available.** Once Phase 2 migration is deployed, last active appears on every member card, not just dormant ones. It is useful context for all members.

---

## 12. File Impact / Implementation Plan

> **Note on file paths (v4):** Members modules now live under `js/admin/members/` (not flat under `js/admin/`) with `index.js` as the entry point. Script tags in `admin/members.html` load them in dependency order: `members-status.js` → `members-cards.js` → `members-invite.js` → `members/index.js`.

| File | Action | Build Status | Notes |
|---|---|---|---|
| `admin/members.html` | Full rewrite + invite modal | ✅ Complete (1A+1B) | Single-doctype clean rewrite (~165 lines). Header w/ active invite button. 5 stat tiles, `#membersTabs`, `#membersListContainer`, `#inviteModal` (backdrop + form + success state). No inline JS, no `onclick=`, no `dashboard.js` reference. |
| `admin/invite.html` | Redirect | ✅ Complete (1B) | `<meta http-equiv="refresh" content="0; url=members.html">` + JS fallback + `noindex`. |
| `js/admin/members/index.js` | New entry file (replaces dashboard.js for this page) | ✅ Complete | Main orchestration. `loadAllMembers()` parallel-fetches 7 tables + canonical `get_family_contribution_total` RPC for All Time total. Returns `{members, stats}`. Renders 5 tiles + 6 tabs + filtered list. Defensive `'all'` tab fallback. Uses bare `supabaseClient` identifier (script-scoped const, NOT on `window`). Exposes `window.membersPage` API. |
| `js/admin/members/members-status.js` | New file | ✅ Complete | MEMBER_STATUS, STATUS_CONFIG, deriveMemberStatus (Phase 1 + Phase 2 stubs gated behind `if (authMeta)`), ATTENTION_FLAGS, HIGH_MED_FLAGS, FLAG_SEVERITY, deriveAttentionFlags, getFlagLabel. Admin force-active short-circuit. |
| `js/admin/members/members-cards.js` | New file | ✅ Complete | renderCard (status accent bar, 52px avatar, role chips, status badge, monthly + total), renderEmptyState per tab, getInitials, getAvatarColor, **`safeHexColor()` sanitizer** (only `#RGB`/`#RRGGBB`/`#RRGGBBAA`) for role chip colors. Overflow menu deferred to Phase 1B. |
| `js/admin/members/members-modal.js` | New file (Phase 2) | ✅ Complete (Phase 2) | Tabbed profile sheet. `open(id)` / `close()` / `init()`. Eager Overview, lazy Financials/Roles/Transactions/Settings with per-member cache. Role toggle persists to `member_roles`, refreshes card list. Resend Invite via `invite-user` edge fn. Deactivate/Reactivate updates `profiles.is_active` with two-click confirmation (no `window.confirm`). |
| `js/admin/members/members-invite.js` | New file (absorbs invite.js) | ✅ Complete (1B) | Full modal: `open`/`close`/`init`/`send`. Email regex validation, submit spinner, inline error, success state w/ auto-close, esc-to-close, backdrop click, focus restore, idempotent `init()`. `_scheduleRefresh()` (800ms + retry at 2s). |
| `js/admin/dashboard.js` | Deprecate progressively | ⏳ Pending | Removed from `members.html` script tags. Audit other admin pages before deletion. |
| `js/admin/invite.js` | Deprecate | ⏳ Pending | Functionality absorbed into `js/admin/members/members-invite.js`. |
| `supabase/migrations/083_member_username_phone.sql` | New | ✅ Phase 3 | username + phone columns on profiles (Phase 3) |
| `supabase/migrations/084_user_last_active.sql` | New | ✅ Phase 3 | admin_user_auth_meta() RPC exposing last_sign_in_at + email_confirmed_at |
| `css/pages/admin/members.css` | New (optional) | N/A | Heavy inline Tailwind has been sufficient through Phase 1A. |

**Note on `dashboard.js`:** Already removed from `members.html` script tags. Audit all other admin pages to confirm none rely on functions exported/defined in `dashboard.js` before deleting it. If they do, those shared functions should be extracted to a shared admin utility file (`js/admin/utils.js`).

**Critical scope note (script-scoped consts):** `supabaseClient` is declared as a top-level `const` in `js/config.js`. In classic `<script>` tags (not ES modules), top-level `const`/`let` go to the **Script scope** — lexically visible to other scripts via the bare identifier, but **NOT attached to `window`**. Any IIFE here must reference it as `supabaseClient` directly, not as `window.supabaseClient` or `global.supabaseClient` (both `undefined`). Function declarations like `checkAuth`, `formatCurrency`, `callEdgeFunction` DO attach to `window` and are safe either way.

---

## Recommended Build Sequence

This is the practical ship order. Items within a phase can be parallelized. Dependencies are noted inline.

### Phase 1 — Functional Foundation (Ship First)
> Goal: Replace the current page with the new architecture. Must be feature-complete by the end of this phase even if visuals are not perfect.

1. ✅ **Create `js/admin/members-status.js`** — status derivation, color map, badge helpers. No HTML changes. Can be written and tested in isolation.
   - Delivered: MEMBER_STATUS, STATUS_CONFIG (badge/accent/dot/label per status), deriveMemberStatus (Phase 1 null-authMeta path + Phase 2 stubs), ATTENTION_FLAGS, HIGH_MED_FLAGS set, FLAG_SEVERITY map, deriveAttentionFlags (Phase 1: past_due, onboarding_stalled, no_subscription, payout_incomplete), getFlagLabel.

2. ✅ **Create `js/admin/members-invite.js`** — invite modal logic, edge function call, post-invite refresh strategy.
   - Delivered: InviteModal IIFE with open/close/init public API; form validation + callEdgeFunction('invite-user', {email}); success/error states; _scheduleRefresh() 800ms delay + retry-once-at-2s logic; triggers window.membersPage.refresh().

3. ✅ **Create `js/admin/members-cards.js`** — card render functions, overflow menu.
   - Delivered: renderCard (status accent bar, 52px avatar, role chips, credit points conditional, attention dots, overflow menu); renderEmptyState per tab; MemberCards public API (copyEmail with clipboard fallback, resendInvite, confirmDeactivate, confirmReactivate, toggleMenu); _showToast helper.

4. ✅ **Create `js/admin/members.js`** — main orchestration: data fetch, stats, tabs, search, modal.
   - Delivered: loadAllMembers() (parallel Promise.all for 9 queries), enriched member objects, _renderStats (5 tiles), _renderAttentionBanner, _renderTabCounts, _renderMemberList (filter + sort + render), tab switching, search debounce, openMemberModal (profile details, roles, transactions, deactivate/reactivate footer button), ConfirmDialog public API, window.toggleMemberRole, window.syncSubscriptionFromStripe, window.closeMemberModal, window.membersPage API.

5. ✅ **Rewrite `admin/members.html`** — new page layout.
   - Delivered: clean single-doctype rewrite (~106 lines). Header w/ disabled invite button + "1B" pill. 5 stat tiles (`#statTotal`, `#statActive`, `#statPending`, `#statDeactivated`, `#statThisMonth`). Tab bar `#membersTabs`. List container `#membersListContainer`. Script tags load supabase CDN → `config.js` → pageShell → `auth/shared.js` → `members-status.js` → `members-cards.js` → `members-invite.js` → `members/index.js` → `sw-register.js`. **No inline JS, no `onclick=`, no `dashboard.js` reference.**

6. ✅ **Redirect `admin/invite.html`** — `<meta http-equiv="refresh" content="0; url=members.html">` + `window.location.replace` JS fallback + `noindex` + `<a>` text fallback.

7. ✅ **Styled confirmation dialogs** — ConfirmDialog built into members.js; #confirmDialog and #confirmBackdrop in HTML (pending HTML completion). Deactivate/reactivate flows use ConfirmDialog.show() — no window.confirm() or window.alert().

8. ✅ **Attention banner** — _renderAttentionBanner() implemented in members.js; renders from HIGH_MED_FLAGS set. #attentionBanner container in HTML (pending HTML completion).

**Phase 1 ship criteria:**
- [ ] All members load, filter, and search correctly
- [ ] Invite flow works without leaving the page
- [ ] Deactivate/reactivate work with styled dialogs
- [ ] Past due members visibly flagged
- [ ] All five stats tiles render correctly
- [ ] No member data visible to unauthenticated users (auth check unchanged)

**Remaining Phase 1 work:**
- Complete `admin/members.html` body (replace old Stats/Members/Deactivated/Modal sections with new structure)
- Add `admin/invite.html` redirect

---

### Phase 2 — Profile Sheet Expansion ✅ Shipped
> Goal: Make the profile sheet the definitive admin workspace for a member.
> Prerequisite: Phase 1 shipped and stable.

1. ✅ **Profile sheet tab bar** (`members-modal.js`) — tab switching with `_renderTabBar()` + `_renderTabContent()`, lazy load via per-tab content function, per-member cache object `_cache[memberId][tabKey]`. Sticky header + sticky tab bar.

2. ✅ **Overview tab** — attention-flag list, 4 stat cells (Monthly, All Time, Active CP / lifetime, Streak), KV rows (Member since, Push, Payout, Onboarding). All derived from already-loaded enriched member — no migration needed.

3. ✅ **Financials tab** — subscription status (color-coded), monthly amount, next bill date, Stripe ID, payout enrolled. Reads `member.subscription`.

4. ✅ **Roles tab** — fetches `roles` once per member (cached), checkbox list pre-checked from `member.roles`. Toggle persists to `member_roles` and refreshes card list so chips update immediately. Inline status text + reverts on error.

5. ✅ **Transactions tab** — parallel fetch of paid `invoices` + `manual_deposits`, merge + sort desc, slice top 20. Cached per member. Per-row icon + date + amount.

6. ✅ **Settings tab** — phone + username (greyed, "Available after Phase 3 migration"). Resend Invite (conditional on `!setup_completed && !deactivated`) → `invite-user` edge fn. Deactivate/Reactivate → updates `profiles.is_active`, refreshes list, re-renders header + settings tab. Two-click confirmation pattern in lieu of native `window.confirm` (per §6f).

---

### Phase 3 — DB Migrations ✅ Shipped
> These can run in parallel with Phase 2 if a second developer is available, or immediately after Phase 2.

1. ✅ **`083_member_username_phone.sql`** — `username` (text, optional, format-checked, unique case-insensitive partial index) + `phone` (text, optional, indexed) on `profiles`. Settings tab now exposes both as editable inputs with client-side validation, server-side `23505`-aware error messaging, and skip-if-unchanged.

2. ✅ **`084_user_last_active.sql`** — `public.admin_user_auth_meta()` SECURITY DEFINER function (gated by `is_admin()`) returning `last_sign_in_at`, `email_confirmed_at`, `user_created_at`. Index.js wires `authMetaMap` into `deriveMemberStatus` + `deriveAttentionFlags`, unlocking `invited_unconfirmed`, `never_signed_in`, `inactive_30/90`, and `invite_expired`. Overview tab shows "Last active" via `_formatRelative()`. Loader degrades gracefully when the migration is not yet applied.

---

### Phase 4 — Polish
> These can be done incrementally after Phase 2/3 are solid.

1. ✅ **CSV export** — `#exportCsvBtn` in page header, exports the **currently filtered** list (respects active tab + search). UTF-8 BOM. CSV-injection guard on cells starting with `=/+/-/@`. Filename `members-<tab>-<YYYY-MM-DD>.csv`.
2. ✅ **Copy email quick action** — "Copy" pill rendered next to email in the modal sticky header. Uses `navigator.clipboard.writeText` with `execCommand('copy')` fallback. Inline label flips to "Copied!" → reverts after 1.5s.
3. ⏳ **Bulk action UI stubs** — deferred. Spec retained for a future pass.
4. ⏳ **Performance audit** — deferred. No regressions observed at current member count (~17). Will revisit if fetch time grows.

