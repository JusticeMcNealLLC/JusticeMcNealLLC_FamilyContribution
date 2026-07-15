# Events Improvements List

## 001 — Event Coordinator Role / Events Moderation Permissions

Introduce an `event_coordinator` role that can create, manage, and modify events like an admin for Events-only workflows, without granting general admin access across the website.

**Status:** Planning / audit (see `moderation/000_event_coordinator_role_audit.md`)

**Scope (v1):** Global Events admin actions for all events (not per-event assignment).

**Out of scope (v1):** Per-event coordinator assignment, Phase 5 module entry, `portal/events.html` script-list changes.

**Phase 4 plan:** `moderation/001_event_coordinator_supabase_rls_plan.md` (RBAC seed + RLS gap audit — not applied yet).

---

## 002 — Event Team Chat / Event Team Hub

Add a private event team chat and tools hub for event creators, event coordinators, admins, and future volunteers — **separate from the full Manage Event module**.

**Status:** Planning / audit (see `team-chat/000_event_team_chat_audit.md`)

**Problem:** Users who can manage an event are treated as `isHost`, which hides personal RSVP / raffle / ticket actions (especially on mobile) and bundles all coordination into Manage Event.

**Direction (v1):**

- Keep **Manage Event** for admin/editing (`EventsManage` sheet).
- Add **Team / Event Tools** sheet with permission-based actions (Team Chat, RSVP as Myself, Enter Raffle, View Ticket, Scanner, etc.).
- Do **not** put team chat only inside Manage Event (blocks future volunteers).
- Enforce chat with **Supabase RLS + Realtime**, not frontend-only.

**Phased rollout:** Action menu cleanup (Phase 2) → chat tables/RLS (Phase 3) → chat UI (Phase 4) → volunteers (Phase 5) → tasks (Phase 6).

**Out of scope (this item):** Attendee-visible chat, email-to-member matching, Phase 5 portal loader refactor, implementing volunteers/tasks in v1.
