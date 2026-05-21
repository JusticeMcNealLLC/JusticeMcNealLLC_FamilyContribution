# Events Improvements List

## 001 — Event Coordinator Role / Events Moderation Permissions

Introduce an `event_coordinator` role that can create, manage, and modify events like an admin for Events-only workflows, without granting general admin access across the website.

**Status:** Planning / audit (see `moderation/000_event_coordinator_role_audit.md`)

**Scope (v1):** Global Events admin actions for all events (not per-event assignment).

**Out of scope (v1):** Per-event coordinator assignment, Phase 5 module entry, `portal/events.html` script-list changes.
