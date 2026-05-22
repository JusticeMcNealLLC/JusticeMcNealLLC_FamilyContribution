# Event Team Chat v1 — Schema & RLS Plan

Date: 2026-05-21  
**Status:** Approved for migration `093_event_team_chat.sql` (not applied to production yet).  
**Prerequisite:** `000_event_team_chat_audit.md`, Phase 2 Team Tools sheet (placeholder chat).

---

## Goal

Add a **private, per-event team chat** in Supabase with authoritative RLS. One `team` thread per event for people who run the event — not attendees, guests, or anonymous users.

**Out of scope (this migration):** Portal/UI, Realtime client wiring, push/unread, volunteers, tasks, `event_chat_members`, Edge Functions.

---

## v1 access model

| Actor | Access | Mechanism |
| --- | --- | --- |
| Event creator | Read/write messages; create team chat row | `events.created_by = auth.uid()` |
| Per-event host (`event_hosts`, any role) | Read/write messages | Row in `event_hosts` for `event_id` |
| Global event manager | Read/write messages; create/update chat metadata | `has_permission('events.manage_all')` |
| Owner (RBAC) | Same as global manager | Owner role includes `events.manage_all` (migration 078) |
| Event Coordinator | Same as global manager | Role `000…0003` has `events.manage_all` (091) |
| Member attendee (RSVP only) | **Denied** | No matching predicate |
| Guest / anon | **Denied** | No policies for `anon`; `auth.uid()` required |

**Explicit exclusions (v1):**

- `admin.dashboard` **alone** does **not** grant chat access (legacy `profiles.role = 'admin'` without RBAC is insufficient).
- Volunteers (future `event_volunteers`) — no access until a later permission/migration.
- Public / portal attendee flows must not query these tables.

**Frontend (later):** `canAccessTeamHub` / Team sheet is UX-only; security is RLS + JWT.

---

## Tables

### `event_chats`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | `gen_random_uuid()` |
| `event_id` | `uuid` NOT NULL FK → `events` ON DELETE CASCADE | |
| `chat_type` | `text` NOT NULL DEFAULT `'team'` | CHECK `= 'team'` in v1 |
| `title` | `text` nullable | Optional display label |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | |
| `created_by` | `uuid` FK → `auth.users` | Who created the chat row |

**Constraints:**

- `UNIQUE (event_id, chat_type)` — one team chat per event.
- `chat_type` CHECK limited to `'team'` for v1 extensibility.

### `event_chat_messages`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `chat_id` | `uuid` NOT NULL FK → `event_chats` ON DELETE CASCADE | |
| `event_id` | `uuid` NOT NULL FK → `events` ON DELETE CASCADE | Denormalized for RLS + indexes |
| `sender_id` | `uuid` NOT NULL FK → `auth.users` | Must equal `auth.uid()` on INSERT |
| `body` | `text` NOT NULL | Trimmed non-empty, max 4000 chars |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | |
| `updated_at` | `timestamptz` | Set by trigger on body edit |
| `deleted_at` | `timestamptz` | Soft delete (moderation) |
| `deleted_by` | `uuid` FK → `auth.users` | Who moderated |

**Constraints:**

- `CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 4000)`
- Trigger `event_chat_messages_enforce_event_id` — `event_id` must match parent `event_chats.event_id`

**Indexes:**

- `event_chats(event_id)`
- `event_chat_messages(chat_id, created_at)`
- `event_chat_messages(event_id, created_at)` — list + Realtime filter

---

## RLS strategy

### Helper: `public.can_access_event_team_chat(p_event_id uuid)`

`STABLE`, `SECURITY DEFINER`, `search_path = public`. Returns true when `auth.uid()` is not null and:

1. `EXISTS (SELECT 1 FROM events WHERE id = p_event_id AND created_by = auth.uid())`, or  
2. `EXISTS (SELECT 1 FROM event_hosts WHERE event_id = p_event_id AND user_id = auth.uid())`, or  
3. `public.has_permission('events.manage_all')`.

`GRANT EXECUTE` to `authenticated` only (no `anon`).

All chat policies use this helper (or stricter checks for writes) so predicates stay consistent.

### `event_chats`

| Operation | Who |
| --- | --- |
| SELECT | `can_access_event_team_chat(event_id)` |
| INSERT | Creator for that `event_id` **or** `events.manage_all`; `created_by = auth.uid()` |
| UPDATE | Creator **or** `events.manage_all` |
| DELETE | **No policy v1** (retain history; archive later) |

### `event_chat_messages`

| Operation | Who |
| --- | --- |
| SELECT | `can_access_event_team_chat(event_id)` |
| INSERT | `can_access_event_team_chat(event_id)` AND `sender_id = auth.uid()` |
| UPDATE | **Sender:** own row, `deleted_at IS NULL`, may edit `body` only. **Moderation:** creator or `events.manage_all` may set `deleted_at` / `deleted_by` (soft delete). |
| DELETE | **No policy v1** — hard delete disallowed; use soft delete |

**Attendee test:** JWT for user with only `event_rsvps` row → SELECT returns 0 rows.

**Anon:** No table policies for `anon`; default deny.

---

## Realtime strategy

**Decision (v1 migration):** Add `event_chat_messages` to `supabase_realtime` publication (same pattern as `event_locations` in 067).

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE event_chat_messages;
```

**Client (Phase 4, not this migration):**

- Subscribe with filter `event_id=eq.<uuid>`.
- Initial page: `SELECT … WHERE event_id = ? AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 100`.
- RLS still filters rows per subscriber.

**Follow-up (document only, not in 093):**

- `REPLICA IDENTITY FULL` on `event_chat_messages` if UPDATE payloads need full row visibility under strict filters (not used elsewhere in repo yet).
- `event_chats` not added to publication (metadata changes are rare; poll or refetch on open).

---

## Message moderation / deletion

| Action | v1 |
| --- | --- |
| User edits own message | UPDATE `body` while `deleted_at IS NULL` |
| User hard-deletes | Not allowed (no DELETE policy) |
| Manager/creator soft-delete | UPDATE `deleted_at`, `deleted_by` |
| UI “[deleted]” | Phase 4 — filter `deleted_at IS NULL` or show placeholder |

Creator can moderate without `events.manage_all` (matches event document host/creator pattern in 067).

---

## Seed / backfill

**Recommendation: no backfill in migration 093.**

| Approach | Verdict |
| --- | --- |
| Insert team chat for every existing event | **Defer** — unnecessary rows; many events never use chat |
| Lazy create on first Team Chat open (Phase 4) | **Preferred** — `INSERT INTO event_chats` by creator or `events.manage_all` when none exists |
| Host opens chat before row exists | Host can post only after chat exists; UI calls ensure-chat (creator/manage_all) or shows “ask organizer to start chat” |

Hosts with access can read messages once chat exists but **cannot** INSERT into `event_chats` (only creator / `events.manage_all`).

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Attendee reads team messages | Strict RLS; smoke + manual JWT tests |
| `admin.dashboard` without `events.manage_all` expects chat | Document exclusion; align product with RBAC |
| Duplicate team chats | `UNIQUE (event_id, chat_type)` |
| `event_id` / `chat_id` mismatch | BEFORE INSERT/UPDATE trigger |
| Realtime leaks | RLS on messages; never subscribe with service key in browser |
| Coordinator spam / abuse | Phase 4 rate limit optional; v1 rely on small team audience |
| Draft events | Chat allowed if user passes `can_access` (creator/manage_all/host); UI may hide until published |

---

## Test plan

### Static (CI-safe)

- `node test/_smoke-event-team-chat-migration.js` — schema, RLS, helper, no anon, no portal/UI edits.

### After apply (staging)

1. **Creator** — create chat, post message, read own thread.  
2. **event_hosts** user — read + insert message; cannot insert second `event_chats` row.  
3. **Event Coordinator** (`events.manage_all`) — read/post on event they do not own.  
4. **Member attendee** — `SELECT` returns empty; `INSERT` denied.  
5. **Anon** — no access.  
6. **Soft delete** — manager sets `deleted_at`; sender cannot edit deleted row.  
7. **Realtime** — second browser receives INSERT (staging).  
8. **Cascade** — delete test event removes chats/messages.

---

## Rollout plan

1. Review PR: plan doc + `093_event_team_chat.sql` + smoke only.  
2. Apply migration on staging; run manual JWT tests above.  
3. Apply production during low-traffic window.  
4. Phase 4 UI: ensure-chat, composer, Realtime subscribe (no change to Manage Event sheet).  
5. Monitor Supabase logs for RLS violations.

**Do not apply migration until approved** (per handoff).

---

## Future: volunteers & tasks

| Phase | Addition |
| --- | --- |
| Volunteers | `event_volunteers` + `events.team_chat` permission or channel `chat_type = 'volunteers'` |
| Tasks | `event_tasks` linked from Team hub; optional system messages in chat |
| Multi-channel | `event_chat_members` or multiple `chat_type` values |
| Unread | `event_chat_reads (user_id, chat_id, last_read_at)` |

---

## Implementation reference

| Artifact | Path |
| --- | --- |
| Migration | `supabase/migrations/093_event_team_chat.sql` |
| Smoke | `test/_smoke-event-team-chat-migration.js` |
| Audit | `docs/improvements/pages/events/team-chat/000_event_team_chat_audit.md` |

Related RLS patterns: `067_event_documents_map.sql` (creator + `event_hosts`), `091_event_coordinator_rbac_and_rls.sql` (`events.manage_all`).

---

*End of plan — migration 093 implements this document.*
