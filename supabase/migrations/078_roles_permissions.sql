-- ============================================================
-- 078: Roles & Permissions System (PA-RM-01, Step 1)
-- Discord-style role management with granular permissions.
-- Tables: roles, role_permissions, member_roles, role_audit_log
-- Functions: has_permission(), is_owner()
-- ============================================================

-- ── 1. Roles Table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    color       TEXT DEFAULT '#6366f1',
    icon        TEXT DEFAULT '',
    position    INT NOT NULL DEFAULT 0,
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Role Permissions Table ───────────────────────────────
-- Each row = one permission granted to one role.

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission  TEXT NOT NULL,
    PRIMARY KEY (role_id, permission)
);

-- ── 3. Member Roles Table ───────────────────────────────────
-- Many-to-many: a member can hold multiple roles.

CREATE TABLE IF NOT EXISTS member_roles (
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- ── 4. Role Audit Log ──────────────────────────────────────
-- Immutable record of every role change.

CREATE TABLE IF NOT EXISTS role_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action          TEXT NOT NULL,
    target_user_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
    role_id         UUID REFERENCES roles(id) ON DELETE SET NULL,
    details         JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. Indexes ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_member_roles_user   ON member_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_role   ON member_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_perm ON role_permissions(permission);
CREATE INDEX IF NOT EXISTS idx_roles_position      ON roles(position);
CREATE INDEX IF NOT EXISTS idx_role_audit_log_actor ON role_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_log_target ON role_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_log_created ON role_audit_log(created_at DESC);

-- ── 6. Seed System Roles ────────────────────────────────────

-- Owner: position 0 (highest), all permissions, undeletable
INSERT INTO roles (id, name, color, icon, position, is_system)
VALUES ('00000000-0000-0000-0000-000000000001', 'Owner', '#dc2626', '👑', 0, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Member: position 999 (lowest), basic portal access, undeletable
INSERT INTO roles (id, name, color, icon, position, is_system)
VALUES ('00000000-0000-0000-0000-000000000002', 'Member', '#6b7280', '👤', 999, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ── 7. Seed Owner Permissions (all 22 keys) ────────────────

INSERT INTO role_permissions (role_id, permission) VALUES
    -- Administration
    ('00000000-0000-0000-0000-000000000001', 'admin.dashboard'),
    ('00000000-0000-0000-0000-000000000001', 'admin.roles'),
    ('00000000-0000-0000-0000-000000000001', 'admin.members'),
    ('00000000-0000-0000-0000-000000000001', 'admin.invite'),
    ('00000000-0000-0000-0000-000000000001', 'admin.notifications'),
    ('00000000-0000-0000-0000-000000000001', 'admin.brand'),
    -- Finances
    ('00000000-0000-0000-0000-000000000001', 'finance.deposits'),
    ('00000000-0000-0000-0000-000000000001', 'finance.transactions'),
    ('00000000-0000-0000-0000-000000000001', 'finance.payouts'),
    ('00000000-0000-0000-0000-000000000001', 'finance.profits'),
    ('00000000-0000-0000-0000-000000000001', 'finance.expenses'),
    ('00000000-0000-0000-0000-000000000001', 'finance.tax_prep'),
    ('00000000-0000-0000-0000-000000000001', 'finance.investments'),
    -- Events
    ('00000000-0000-0000-0000-000000000001', 'events.create'),
    ('00000000-0000-0000-0000-000000000001', 'events.manage_all'),
    ('00000000-0000-0000-0000-000000000001', 'events.banners'),
    -- Content
    ('00000000-0000-0000-0000-000000000001', 'content.documents'),
    ('00000000-0000-0000-0000-000000000001', 'content.quests'),
    ('00000000-0000-0000-0000-000000000001', 'content.banners'),
    ('00000000-0000-0000-0000-000000000001', 'content.family_approvals')
ON CONFLICT DO NOTHING;

-- Member role gets no admin permissions (portal-only access)

-- ── 8. has_permission() Function ────────────────────────────
-- Returns TRUE if auth.uid() holds any role that has the given permission key.
-- SECURITY DEFINER: bypasses RLS (same pattern as is_admin()).

CREATE OR REPLACE FUNCTION public.has_permission(permission_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.member_roles mr
        JOIN public.role_permissions rp ON rp.role_id = mr.role_id
        WHERE mr.user_id = auth.uid()
          AND rp.permission = permission_key
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 9. is_owner() Function ──────────────────────────────────
-- Returns TRUE if auth.uid() holds the Owner system role.

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.member_roles mr
        JOIN public.roles r ON r.id = mr.role_id
        WHERE mr.user_id = auth.uid()
          AND r.is_system = TRUE
          AND r.name = 'Owner'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 10. Auto-update updated_at on roles ─────────────────────

CREATE OR REPLACE FUNCTION public.update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION public.update_roles_updated_at();

-- ── 11. RLS Policies ────────────────────────────────────────

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_audit_log ENABLE ROW LEVEL SECURITY;

-- Roles: anyone authenticated can read (needed for display), only admins can write
CREATE POLICY "roles_select_authenticated" ON roles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "roles_insert_admin" ON roles
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "roles_update_admin" ON roles
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "roles_delete_admin" ON roles
    FOR DELETE USING (public.is_admin());

-- Role permissions: anyone authenticated can read, only admins can write
CREATE POLICY "role_permissions_select_authenticated" ON role_permissions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "role_permissions_insert_admin" ON role_permissions
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "role_permissions_update_admin" ON role_permissions
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "role_permissions_delete_admin" ON role_permissions
    FOR DELETE USING (public.is_admin());

-- Member roles: users can read their own, admins can read all and write
CREATE POLICY "member_roles_select_own" ON member_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "member_roles_select_admin" ON member_roles
    FOR SELECT USING (public.is_admin());

CREATE POLICY "member_roles_insert_admin" ON member_roles
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "member_roles_update_admin" ON member_roles
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "member_roles_delete_admin" ON member_roles
    FOR DELETE USING (public.is_admin());

-- Audit log: admins can read, system inserts (via service role or trigger)
CREATE POLICY "role_audit_log_select_admin" ON role_audit_log
    FOR SELECT USING (public.is_admin());

CREATE POLICY "role_audit_log_insert_admin" ON role_audit_log
    FOR INSERT WITH CHECK (public.is_admin());

-- ── 12. Migrate Existing Users ──────────────────────────────
-- Assign Owner role to all current admins.
-- Assign Member role to all current members.

INSERT INTO member_roles (user_id, role_id, granted_by, granted_at)
SELECT id, '00000000-0000-0000-0000-000000000001', id, NOW()
FROM profiles
WHERE role = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO member_roles (user_id, role_id, granted_by, granted_at)
SELECT id, '00000000-0000-0000-0000-000000000002', id, NOW()
FROM profiles
WHERE role = 'member'
ON CONFLICT DO NOTHING;

-- Log the migration
INSERT INTO role_audit_log (actor_id, action, target_user_id, role_id, details)
SELECT id, 'role_assigned', id,
    CASE WHEN role = 'admin' THEN '00000000-0000-0000-0000-000000000001'::UUID
         ELSE '00000000-0000-0000-0000-000000000002'::UUID END,
    '{"source": "migration_078", "note": "Initial migration from profiles.role"}'::JSONB
FROM profiles;
