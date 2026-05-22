# Event Team Chat / Event Team Hub — Audit & Plan

Date: 2026-05-21

**Status:** Planning / audit only. No runtime code, migrations, or `portal/events.html` changes in this document.

## Related docs

| Doc | Purpose |
| --- | --- |
| `docs/improvements/pages/events/list.md` | Improvement backlog **002** |
| `docs/improvements/pages/events/moderation/000_event_coordinator_role_audit.md` | Event Coordinator RBAC (global `events.manage_all`) |
| `docs/todo.md` | Product notes on team chat, volunteers, tasks |

---

## 1. Goal

Plan a **private, per-event team coordination surface** (chat + future tools) for people running the event — separate from the attendee experience and separate from the full **Manage Event** admin sheet.

### Intended users (conceptual)

- Event creator (`events.created_by`)
- Per-event hosts (`event_hosts`)
- Global event managers (`events.manage_all` — Event Coordinator, Owner)
- Site admins/owners (`admin.dashboard` / Owner role)
- **Future:** event volunteers (limited access — chat/tasks/scanner, not full manage)

### Non-goals (this improvement track)

- Attendee-visible group chat
- Auto-login or email-to-member matching on public RSVP
- Phase 5 module-entry / `portal/events.html` loader refactor
- Implementing volunteers or tasks in v1

---

## 2. Current event role model (audit)

The app uses **overlapping** concepts. Team chat planning must not conflate them.

### 2.1 Database / RBAC

| Concept | Storage / check | Scope |
| --- | --- | --- |
| **Event creator** | `events.created_by` → `profiles` | Per event |
| **Event host (per-event)** | `event_hosts` (`role`: `checkin_staff` \| `co_host`) | Per event; granted by creator/admin |
| **Event Coordinator (global)** | RBAC role + `events.create`, `events.manage_all`, `events.banners` | **All events** (not per-event assignment today) |
| **Owner / full admin** | RBAC Owner + `admin.dashboard` → `profiles.role` sync | Site-wide |
| **Member attendee** | `event_rsvps` (`status`: `going`, `maybe`, `not_going`) | Per event, own row |
| **Guest attendee** | `event_guest_rsvps` | Per event, email/token |

**Client helpers** (`js/auth/shared.js`):

- `canCreateEvents()` → `events.create` OR `events.manage_all`
- `canManageEvents()` → `events.manage_all` only
- `canManageEventBanners()` → `events.banners` OR `events.manage_all`
- `canAccessAdminDashboard()` → `admin.dashboard` (not granted to Event Coordinators)

**Portal detail “host” flag** (`js/portal/events/detail.js`):

```javascript
const isCreator = event.created_by === evtCurrentUser.id;
const hostRecord = await event_hosts ...;
const isHost = isCreator || !!hostRecord || canManageEvents();
```

**Important:** `isHost === true` for **any** user with `events.manage_all`, even if they did not create the event and are not in `event_hosts`. That drives UI as “you’re hosting” and replaces attendee CTAs.

There is **no** `event_volunteers` table or `events.team_chat` permission today.

### 2.2 Role matrix (who gets what today)

| User type | Manage Event / sheet | Treated as `isHost` | Personal RSVP UI | Raffle entry UI | Ticket CTA (mobile) |
| --- | --- | --- | --- | --- | --- |
| Creator | Yes | Yes | Hidden (“You’re hosting!”) | Needs `going` RSVP row | **Manage only** |
| `event_hosts` row | Yes (via isHost) | Yes | Hidden | Needs `going` RSVP | **Manage only** |
| Event Coordinator | Yes | Yes (via `canManageEvents`) | Hidden | Needs `going` RSVP | **Manage only** |
| Owner / `admin.dashboard` | Yes | Yes if `canManageEvents` | Hidden | Same | **Manage only** |
| Member attendee | No | No | Full RSVP | If going / paid rules | RSVP + raffle |
| Guest | No | No | Public guest form | Guest rules | Public CTAs |

### 2.3 `event_hosts` vs “Event Coordinator”

| | `event_hosts` | Event Coordinator (`events.manage_all`) |
| --- | --- | --- |
| Assignment | Per event, explicit row | Global RBAC |
| Typical use | Check-in staff, co-host | Edit any event, delete, raffle admin, etc. |
| Chat v1 (proposed) | Include | Include |
| Manage sheet | Indirect via `isHost` | Direct via `isHost` |

Per-event **coordinator assignment** is **not** implemented (noted in moderation docs as future).

---

## 3. Current action button layout (audit)

### 3.1 Portal event detail — desktop

| Surface | File | Behavior for `isHost` |
| --- | --- | --- |
| RSVP card | `detail.js` ~529–541 | “You’re hosting!” + **Manage Event** only — no Going/Not going, no paid RSVP |
| Raffle block | `detail.js` ~592–617 | Uses normal member rules: needs `rsvp.status === 'going'` or paid; shows “RSVP to Enter Raffle” if not |
| Host Controls | `detail.js` ~682–702 | Publish/complete/cancel + **Manage event** gear (legacy dropdown fallback) |
| Attendee breakdown | `detail.js` ~652–679 | Host-only lists |
| Scanner / venue QR | `detail.js` ~399–417 | Host-only; scanner also in `manage/sheet.js` |

### 3.2 Portal event detail — mobile sticky CTA

| File | Function | Host behavior |
| --- | --- | --- |
| `detail.js` | `evtInitBottomNav()` ~1252–1316 | If `isHost`: **only** `primaryBtn = Manage Event`. **No** RSVP, raffle, or ticket slot. |
| `detail.js` | `evtOpenCtaPanel()` ~1353+ | Ticket / raffle panels — unreachable from bottom bar when host |

**UX gap (confirmed):** Event Coordinators and creators who are “hosts” lose the obvious mobile path to **RSVP as myself**, **enter raffle**, and **view ticket**, because the bottom bar is replaced by Manage Event.

Public event page (`js/events/*`) is separate; hosts/coordinators use **portal** detail for member flows.

### 3.3 Manage Event module

| File | Entry |
| --- | --- |
| `manage/sheet.js` | `window.EventsManage.open(eventId, { source: 'portal' })` |
| `detail.js` | Buttons call `EventsManage.open` |

Sheet tabs (command / money / raffle / comp / etc.) are **full management** — appropriate for coordinators, **not** for future volunteers.

### 3.4 Other entry points

| Feature | File | Gate |
| --- | --- | --- |
| Create event | `list.js`, `create/sheet.js` | `canCreateEvents()` |
| Delete event | `detail.js` dropdown | `canManageEvents()` |
| Featured banner | `manage/sheet.js` | `canManageEventBanners()` |
| List “my drafts” | `list.js` | `canManageEvents()` + `created_by` filter |

---

## 4. UX problem statement

**Symptom:** Users who can manage an event are folded into `isHost`, which:

1. Replaces attendee CTAs with “You’re hosting!” on desktop.
2. Shows **only Manage Event** on mobile — hiding RSVP / raffle / ticket actions.
3. Bundles **team coordination** (future chat) with **administration** (Manage sheet).

**Why it matters for team chat:**

- Putting chat **only** inside Manage Event would force volunteers (future) to open admin tooling they must not access.
- Coordinators still need to **RSVP and enter raffles as individuals** without giving up manage access.

**Product direction (approved for planning):**

- Keep **Manage Event** for editing/admin (status, money, raffle draw, documents admin, scanner config, etc.).
- Add a separate **Team** / **Event Tools** entry (sheet or hub) for permission-based actions including **Team Chat**, **RSVP as myself**, **Enter raffle**, **View ticket**, **Scanner** (when allowed).

---

## 5. Recommended UX options

### Option A — Chat inside Manage Event

| Pros | Cons |
| --- | --- |
| Reuses existing sheet shell | Volunteers cannot access without manage permissions |
| One place for “running the event” | Chat buried behind heavy admin UI |
| Less new navigation | Mobile manage sheet already dense (tabs) |

**Verdict:** Poor fit for volunteers and for “quick coordination.” **Not recommended** as primary surface.

### Option B — Separate “Team Chat” button only

| Pros | Cons |
| --- | --- |
| Clear entry to chat | Does not fix RSVP/raffle/ticket gap for hosts |
| Simple mental model | Two buttons (Manage + Chat) still leave other actions orphaned |

**Verdict:** Good for chat, **insufficient alone** for full team hub.

### Option C — Event Tools bottom sheet (recommended v1 shell)

| Pros | Cons |
| --- | --- |
| One **Team** / **⋯** button next to Manage on mobile | New UI component to build |
| Permission-filtered action list | Must maintain action registry |
| Fits chat + RSVP-as-self + raffle + ticket + scanner | Slightly more complex than single chat button |
| Volunteers later: subset of actions only | |

**Example (mobile):**

```text
[ Manage Event ]  [ Team ▾ ]

Team sheet:
  Team Chat
  RSVP as Myself
  Enter Raffle
  View Ticket
  Open Scanner
  ———
  Manage Event   (optional duplicate link)
```

**Verdict:** **Recommended v1** — matches product preference in `docs/todo.md` and this audit.

### Option D — Dedicated Event Team Hub page

| Pros | Cons |
| --- | --- |
| Room for chat + tasks + timeline | New route/page; more navigation |
| Clear separation from attendee detail | Higher build cost for v1 |
| Good for Phase 5+ | May duplicate Manage sheet links |

**Verdict:** Strong **Phase 4+** target; optional v1 if chat needs full-page layout. Can start as sheet and promote to `/portal/events-team.html?event=<slug>` later.

### Recommended v1 UX (summary)

1. **Split flags** in portal detail (implementation phase 2):
   - `canManageEvent` — open Manage sheet (creator, hosts, `events.manage_all`, or future manage permission)
   - `canAccessTeamHub` — open Team sheet (creator, hosts, coordinators, admins; later volunteers)
   - `hasPersonalAttendeeActions` — show RSVP/raffle/ticket regardless of manage role (based on `event_rsvps` / raffle row, not `isHost` alone)

2. **Mobile bottom bar:**
   - Primary: **Manage Event** (if `canManageEvent`)
   - Secondary: **Team** (if `canAccessTeamHub`)
   - If user is not a manager but is attendee: keep current RSVP/raffle bar

3. **Desktop:** Team card or compact “Event tools” row under host RSVP area with same actions.

4. **Team Chat v1:** Open from Team sheet → full-screen panel or sub-route; not inside Manage tabs.

---

## 6. Chat access model (v1 proposal)

### 6.1 Who can access Event Team Chat

| Actor | v1 access | Enforcement |
| --- | --- | --- |
| Event creator | Yes | `events.created_by = auth.uid()` |
| `event_hosts` (any role) | Yes | Row in `event_hosts` |
| `events.manage_all` | Yes | `has_permission('events.manage_all')` |
| `admin.dashboard` / Owner | Yes | `has_permission('admin.dashboard')` |
| Normal member (RSVP only) | **No** | — |
| Guest | **No** | — |
| **Volunteers** | **No (v1)** | Phase 5 |

### 6.2 Enforcement layers (required)

| Layer | Purpose |
| --- | --- |
| **Supabase RLS** | Authoritative: only team members read/insert `event_chat_messages` for that `event_id` |
| **Realtime** | `supabase_realtime` on messages table; channel filters by `event_id`; RLS still applies |
| **Frontend** | Hide Team Chat action if `!canAccessTeamChat(event)` — UX only, not security |
| **Edge Function (optional)** | v2: rate limits, profanity, system messages; not required for v1 if RLS is tight |

**Do not rely on frontend-only hiding** for confidentiality.

### 6.3 Suggested DB helper (future migration)

```sql
-- Conceptual; not implemented
public.can_access_event_team_chat(p_event_id uuid) RETURNS boolean
  AS $$ creator OR event_hosts OR events.manage_all OR admin.dashboard $$;
```

Use same predicate in RLS policies for `event_chats` / `event_chat_messages`.

### 6.4 Future permission key (optional)

| Permission | Purpose |
| --- | --- |
| `events.team_chat` | Read/post team chat (narrower than `manage_all`) |
| `events.team_hub` | Open Team tools sheet (chat + tasks read) |

Volunteers would get `events.team_chat` (+ task permissions) **without** `events.manage_all`.

---

## 7. Volunteer future model

### 7.1 Proposed `event_volunteers` (Phase 5)

| Column | Purpose |
| --- | --- |
| `id` | PK |
| `event_id` | FK → `events` |
| `user_id` | FK → `profiles` |
| `role_label` | Optional: `setup`, `checkin`, `decor` |
| `granted_by` | Who assigned |
| `created_at` | Audit |

**Volunteers may access (future):**

- Team chat (likely combined channel or `event_chat_channels` with `audience = team|volunteers`)
- Assigned tasks (`event_tasks`)
- Event-day timeline (future)
- Scanner / check-in **only if** explicitly granted (reuse `event_hosts.checkin_staff` or new flag)

**Volunteers must not access:**

- Edit event title/description/pricing (Manage sheet Overview)
- Delete event / refunds admin / financial tabs
- Featured banner controls
- Raffle prize setup / draw (unless new permission)
- Full attendee PII export beyond check-in needs

### 7.2 Assignment UI (future)

- In Manage sheet or Team hub: “Assign volunteer” → pick member → inserts `event_volunteers`
- Notification to volunteer (Phase 6+)

---

## 8. Database design options

### 8.1 `event_chats` (v1 — recommended)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | |
| `event_id` | UUID UNIQUE FK | One team thread per event in v1 |
| `created_at` | timestamptz | |
| `archived_at` | timestamptz nullable | When event cancelled/completed |

**RLS:** SELECT/INSERT for `can_access_event_team_chat(event_id)`; no anon.

### 8.2 `event_chat_messages` (v1)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | |
| `event_id` | UUID FK | Denormalized for RLS/index |
| `chat_id` | UUID FK → `event_chats` | |
| `user_id` | UUID FK → `profiles` | Sender |
| `body` | text | Plain text v1 |
| `created_at` | timestamptz | |
| `edited_at` | timestamptz nullable | v2 |
| `deleted_at` | timestamptz nullable | Soft delete / moderation |

**RLS:** SELECT for team; INSERT own row + team check; UPDATE/DELETE own or `events.manage_all` for moderation.

### 8.3 `event_chat_members` (later)

Only needed if multiple channels per event (e.g. “Staff only” vs “Staff + volunteers”). **Defer** until volunteer channel is required.

### 8.4 `event_volunteers` (Phase 5)

See §7. RLS: managers insert; volunteer read own row; team chat policy includes volunteer EXISTS.

### 8.5 `event_tasks` (Phase 6)

| Column | Purpose |
| --- | --- |
| `event_id`, `title`, `status`, `assigned_to`, `due_at`, `created_by` | Per-event task list |

Link from Team hub; optional chat system message when task assigned (later).

---

## 9. Realtime strategy

| Approach | Pros | Cons | Recommendation |
| --- | --- | --- | --- |
| **Supabase Realtime** on `event_chat_messages` | Native; matches `event_locations` pattern | Must verify RLS + replica identity | **v1 default** |
| Polling (30s) | Simple | Laggy; more load | Fallback only |
| Edge Function send | Centralized validation | Extra latency; more code | v2 for bots/system messages |

**v1 implementation notes:**

- `ALTER PUBLICATION supabase_realtime ADD TABLE event_chat_messages;`
- Client subscribes: `filter: event_id=eq.<id>`
- Initial load: `select * from event_chat_messages where event_id = ? order by created_at asc limit 100`
- Paginate older messages on scroll (v1.1)

---

## 10. Notification strategy

| Feature | Phase |
| --- | --- |
| Unread badge on Team button | Phase 4 (optional v1.1) — `last_read_at` per user per chat |
| In-app notification row | Phase 6+ — `notifications` table integration |
| Push (web push) | ROADMAP Phase 4C — not v1 |
| Email digest | Out of scope |

**v1:** No push; optional simple “N new messages” when opening Team sheet if cheap (`event_chat_reads` table).

---

## 11. Security / RLS risks

| Risk | Mitigation |
| --- | --- |
| Volunteers get `events.manage_all` by mistake | Separate permissions; never map volunteer → `isHost` → Manage |
| Chat visible to attendees | Strict RLS; no public anon policies; no client-side-only gate |
| Coordinators cannot RSVP / raffle | Split `isHost` from attendee actions (Phase 2) |
| Realtime leaks rows | Enable RLS on messages; test with attendee JWT |
| Message deletion / moderation | Allow `events.manage_all` + creator soft-delete |
| Creator leaves org | Chat remains; creator row on `events` still historical |
| Cancelled/archived events | Stop INSERT or show read-only banner when `archived_at` set |
| Guests access private chat | No guest policies; reject anon |

---

## 12. Implementation phases (recommended)

| Phase | Scope | Deliverables |
| --- | --- | --- |
| **1 — Audit & UX design** | This doc | Role map, UX recommendation, schema sketch |
| **2 — Event action menu cleanup** | Portal JS only | `canManageEvent` / `canAccessTeamHub` / personal attendee actions; Team sheet with actions (chat placeholder OK) |
| **3 — Database + RLS** | Migrations | `event_chats`, `event_chat_messages`, `can_access_event_team_chat()`, Realtime publication |
| **4 — Team chat UI** | Portal JS | Chat panel in Team hub; subscribe/send; basic moderation |
| **5 — Volunteers** | DB + UI | `event_volunteers`, narrow permissions, volunteer channel optional |
| **6 — Tasks** | DB + UI | `event_tasks`, assign/complete, link from Team hub |

**Out of scope for this track:** Phase 5 portal module refactor, public page changes, unrelated admin systems.

---

## 13. Recommended v1 (smallest useful slice)

Aligns with product preference:

1. **Phase 2 (ship first):** Event **Team** bottom sheet + desktop entry
   - Actions (permission-filtered): Team Chat (placeholder or “coming soon”), RSVP as Myself, Enter Raffle, View Ticket, Scanner (if allowed), link to Manage Event
   - Fix mobile bar: **Manage** + **Team** for managers; restore attendee CTAs inside Team sheet

2. **Phase 3–4:** Real team chat (DB + UI) behind Team Chat action — **not** inside Manage tabs

3. **Defer:** Volunteers, tasks, multi-channel chat, push notifications

### v1 permission sketch (frontend)

```javascript
// Conceptual — Phase 2 implementation
function canManageEvent(event, user) {
  return isCreator || isEventHost || canManageEvents();
}
function canAccessTeamChat(event, user) {
  return canManageEvent(event, user) || canAccessAdminDashboard();
}
function showPersonalAttendeeActions(event, user) {
  // Always evaluate RSVP/raffle state for authenticated user
  return !!evtCurrentUser && event.rsvp_enabled !== false;
}
```

### Chat placeholder copy (Phase 2)

If Phase 3 not ready: Team sheet opens with “Team Chat — coming soon” and disabled composer; still ship action menu fix.

---

## 14. Files reference (implementation phase — do not change yet)

| Area | Primary files |
| --- | --- |
| Detail render + `isHost` | `js/portal/events/detail.js` |
| Mobile CTA | `js/portal/events/detail.js` (`evtInitBottomNav`, `evtOpenCtaPanel`) |
| RSVP | `js/portal/events/rsvp.js` |
| Raffle | `js/portal/events/detail.js`, raffle handlers in `rsvp.js` |
| Manage sheet | `js/portal/events/manage/sheet.js` |
| Permissions | `js/auth/shared.js` |
| State | `js/portal/events/state.js` (`evtCurrentUserRole` — lightly used) |
| Schema | `supabase/migrations/063_events_tables.sql`, `091_event_coordinator_rbac_and_rls.sql` |

---

## 15. Open questions (for product sign-off)

1. Should **checkin_staff** hosts see full team chat, or only scanner + tasks?
2. One chat thread per event, or separate **Staff** vs **Staff+Volunteers** threads in v2?
3. Should coordinators who are not in `event_hosts` appear as “team” via `events.manage_all` only? (**Current code: yes via `isHost`.**)
4. Is **RSVP as myself** required to be a real `going` row, or display-only “host attending” without DB row?
5. Team hub as sheet vs dedicated page for chat history on mobile keyboards?

---

*End of audit — planning only; no code or migrations in this change set.*
