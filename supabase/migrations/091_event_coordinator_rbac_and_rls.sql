-- ============================================================
-- 091: Event Coordinator — RBAC seed + Events RLS gap fixes (v1)
--
-- Seeds system role "Event Coordinator" with Events-only permissions.
-- Patches legacy admin-profile RLS gates left by 087 / 088.
--
-- Does NOT:
--   • alter profiles.role or sync_profile_role()
--   • grant admin.dashboard, finance.*, content.*, or other admin.*
--   • add draft-visibility SELECT policies (deferred)
-- ============================================================

-- ── Part A: Event Coordinator system role ───────────────────

INSERT INTO roles (id, name, color, icon, position, is_system)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'Event Coordinator',
    '#2563eb',
    '🎟️',
    50,
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    name       = EXCLUDED.name,
    color      = EXCLUDED.color,
    icon       = EXCLUDED.icon,
    position   = EXCLUDED.position,
    is_system  = EXCLUDED.is_system;

INSERT INTO role_permissions (role_id, permission) VALUES
    ('00000000-0000-0000-0000-000000000003', 'events.create'),
    ('00000000-0000-0000-0000-000000000003', 'events.manage_all'),
    ('00000000-0000-0000-0000-000000000003', 'events.banners')
ON CONFLICT DO NOTHING;

-- ── Part B: event_raffle_winners UPDATE (replaces 087 legacy gate) ──
-- Allow global event managers (events.manage_all) or event creator.

DROP POLICY IF EXISTS raffle_winners_update_admin ON event_raffle_winners;

CREATE POLICY raffle_winners_update_admin ON event_raffle_winners
    FOR UPDATE
    USING (
        public.has_permission('events.manage_all')
        OR EXISTS (
            SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
        )
    )
    WITH CHECK (
        public.has_permission('events.manage_all')
        OR EXISTS (
            SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
        )
    );

-- ── Part C: event-raffle-prizes storage DELETE (replaces 088 legacy gate) ──

DROP POLICY IF EXISTS raffle_prizes_delete ON storage.objects;

CREATE POLICY raffle_prizes_delete ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'event-raffle-prizes'
        AND auth.uid() IS NOT NULL
        AND public.has_permission('events.manage_all')
    );
