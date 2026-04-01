-- ═══════════════════════════════════════════════════════════════
-- Migration 080: Permission Enforcement — RLS
-- PA-RM-01 Step 6: Replace is_admin() and inline role checks
-- with granular has_permission() checks across all tables.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Redefine is_admin() as wrapper ─────────────────────────
-- Zero breakage: any remaining is_admin() calls now route through
-- the permission system.  Owner role has admin.dashboard, so
-- existing behavior is preserved.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.has_permission('admin.dashboard');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 2. user_has_permission() — explicit user_id variant ───────
-- Used by edge functions (service-role client) where auth.uid()
-- is not available.

CREATE OR REPLACE FUNCTION public.user_has_permission(uid UUID, perm TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.member_roles mr
        JOIN public.role_permissions rp ON rp.role_id = mr.role_id
        WHERE mr.user_id = uid
          AND rp.permission = perm
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 3. Seed content.feed permission for Owner role ────────────

INSERT INTO role_permissions (role_id, permission) VALUES
    ('00000000-0000-0000-0000-000000000001', 'content.feed')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 4. Drop + Recreate Admin Policies with has_permission()
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- admin.members — profiles
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles" ON profiles
    FOR SELECT USING (public.has_permission('admin.members'));

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE
    USING (public.has_permission('admin.members'))
    WITH CHECK (public.has_permission('admin.members'));

-- ──────────────────────────────────────────────────────────────
-- finance.transactions — subscriptions, invoices, app_settings
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can read all subscriptions" ON subscriptions;
CREATE POLICY "Admins can read all subscriptions" ON subscriptions
    FOR SELECT USING (public.has_permission('finance.transactions'));

DROP POLICY IF EXISTS "Admins can read all invoices" ON invoices;
CREATE POLICY "Admins can read all invoices" ON invoices
    FOR SELECT USING (public.has_permission('finance.transactions'));

DROP POLICY IF EXISTS "Admins can update settings" ON app_settings;
CREATE POLICY "Admins can update settings" ON app_settings
    FOR UPDATE USING (public.has_permission('finance.payouts'));

DROP POLICY IF EXISTS "Admins can insert settings" ON app_settings;
CREATE POLICY "Admins can insert settings" ON app_settings
    FOR INSERT WITH CHECK (public.has_permission('finance.payouts'));

-- ──────────────────────────────────────────────────────────────
-- finance.investments — investment_snapshots, investment_holdings
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can insert snapshots" ON investment_snapshots;
CREATE POLICY "Admins can insert snapshots" ON investment_snapshots
    FOR INSERT WITH CHECK (public.has_permission('finance.investments'));

DROP POLICY IF EXISTS "Admins can update snapshots" ON investment_snapshots;
CREATE POLICY "Admins can update snapshots" ON investment_snapshots
    FOR UPDATE
    USING (public.has_permission('finance.investments'))
    WITH CHECK (public.has_permission('finance.investments'));

DROP POLICY IF EXISTS "Admins can delete snapshots" ON investment_snapshots;
CREATE POLICY "Admins can delete snapshots" ON investment_snapshots
    FOR DELETE USING (public.has_permission('finance.investments'));

DROP POLICY IF EXISTS "Admins can insert holdings" ON investment_holdings;
CREATE POLICY "Admins can insert holdings" ON investment_holdings
    FOR INSERT WITH CHECK (public.has_permission('finance.investments'));

DROP POLICY IF EXISTS "Admins can update holdings" ON investment_holdings;
CREATE POLICY "Admins can update holdings" ON investment_holdings
    FOR UPDATE
    USING (public.has_permission('finance.investments'))
    WITH CHECK (public.has_permission('finance.investments'));

DROP POLICY IF EXISTS "Admins can delete holdings" ON investment_holdings;
CREATE POLICY "Admins can delete holdings" ON investment_holdings
    FOR DELETE USING (public.has_permission('finance.investments'));

-- ──────────────────────────────────────────────────────────────
-- finance.deposits — manual_deposits
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can read all deposits" ON manual_deposits;
CREATE POLICY "Admins can read all deposits" ON manual_deposits
    FOR SELECT USING (public.has_permission('finance.deposits'));

DROP POLICY IF EXISTS "Admins can insert deposits" ON manual_deposits;
CREATE POLICY "Admins can insert deposits" ON manual_deposits
    FOR INSERT WITH CHECK (public.has_permission('finance.deposits'));

DROP POLICY IF EXISTS "Admins can update deposits" ON manual_deposits;
CREATE POLICY "Admins can update deposits" ON manual_deposits
    FOR UPDATE
    USING (public.has_permission('finance.deposits'))
    WITH CHECK (public.has_permission('finance.deposits'));

DROP POLICY IF EXISTS "Admins can delete deposits" ON manual_deposits;
CREATE POLICY "Admins can delete deposits" ON manual_deposits
    FOR DELETE USING (public.has_permission('finance.deposits'));

-- ──────────────────────────────────────────────────────────────
-- finance.expenses — llc_expenses + storage (llc-receipts)
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admin can view expenses" ON llc_expenses;
CREATE POLICY "Admin can view expenses" ON llc_expenses
    FOR SELECT USING (public.has_permission('finance.expenses'));

DROP POLICY IF EXISTS "Admin can create expenses" ON llc_expenses;
CREATE POLICY "Admin can create expenses" ON llc_expenses
    FOR INSERT WITH CHECK (public.has_permission('finance.expenses'));

DROP POLICY IF EXISTS "Admin can update expenses" ON llc_expenses;
CREATE POLICY "Admin can update expenses" ON llc_expenses
    FOR UPDATE USING (public.has_permission('finance.expenses'));

DROP POLICY IF EXISTS "Admin can delete expenses" ON llc_expenses;
CREATE POLICY "Admin can delete expenses" ON llc_expenses
    FOR DELETE USING (public.has_permission('finance.expenses'));

DROP POLICY IF EXISTS "Admin can upload receipts" ON storage.objects;
CREATE POLICY "Admin can upload receipts" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'llc-receipts'
        AND public.has_permission('finance.expenses')
    );

DROP POLICY IF EXISTS "Admin can view receipts" ON storage.objects;
CREATE POLICY "Admin can view receipts" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'llc-receipts'
        AND public.has_permission('finance.expenses')
    );

DROP POLICY IF EXISTS "Admin can delete receipts" ON storage.objects;
CREATE POLICY "Admin can delete receipts" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'llc-receipts'
        AND public.has_permission('finance.expenses')
    );

-- ──────────────────────────────────────────────────────────────
-- finance.tax_prep — tax_quarterly_payments, tax_checklist
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admin can view quarterly payments" ON tax_quarterly_payments;
CREATE POLICY "Admin can view quarterly payments" ON tax_quarterly_payments
    FOR SELECT USING (public.has_permission('finance.tax_prep'));

DROP POLICY IF EXISTS "Admin can insert quarterly payments" ON tax_quarterly_payments;
CREATE POLICY "Admin can insert quarterly payments" ON tax_quarterly_payments
    FOR INSERT WITH CHECK (public.has_permission('finance.tax_prep'));

DROP POLICY IF EXISTS "Admin can update quarterly payments" ON tax_quarterly_payments;
CREATE POLICY "Admin can update quarterly payments" ON tax_quarterly_payments
    FOR UPDATE USING (public.has_permission('finance.tax_prep'));

DROP POLICY IF EXISTS "Admin can delete quarterly payments" ON tax_quarterly_payments;
CREATE POLICY "Admin can delete quarterly payments" ON tax_quarterly_payments
    FOR DELETE USING (public.has_permission('finance.tax_prep'));

DROP POLICY IF EXISTS "Admin can view checklist" ON tax_checklist;
CREATE POLICY "Admin can view checklist" ON tax_checklist
    FOR SELECT USING (public.has_permission('finance.tax_prep'));

DROP POLICY IF EXISTS "Admin can insert checklist" ON tax_checklist;
CREATE POLICY "Admin can insert checklist" ON tax_checklist
    FOR INSERT WITH CHECK (public.has_permission('finance.tax_prep'));

DROP POLICY IF EXISTS "Admin can update checklist" ON tax_checklist;
CREATE POLICY "Admin can update checklist" ON tax_checklist
    FOR UPDATE USING (public.has_permission('finance.tax_prep'));

DROP POLICY IF EXISTS "Admin can delete checklist" ON tax_checklist;
CREATE POLICY "Admin can delete checklist" ON tax_checklist
    FOR DELETE USING (public.has_permission('finance.tax_prep'));

-- ──────────────────────────────────────────────────────────────
-- finance.payouts — payouts, payout_enrollments
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Members can view own payouts" ON payouts;
CREATE POLICY "Members can view own payouts" ON payouts
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.has_permission('finance.payouts')
    );

DROP POLICY IF EXISTS "Admins can insert payouts" ON payouts;
CREATE POLICY "Admins can insert payouts" ON payouts
    FOR INSERT WITH CHECK (public.has_permission('finance.payouts'));

DROP POLICY IF EXISTS "Admins can update payouts" ON payouts;
CREATE POLICY "Admins can update payouts" ON payouts
    FOR UPDATE USING (public.has_permission('finance.payouts'));

DROP POLICY IF EXISTS "Members can view own enrollments" ON payout_enrollments;
CREATE POLICY "Members can view own enrollments" ON payout_enrollments
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.has_permission('finance.payouts')
    );

-- ──────────────────────────────────────────────────────────────
-- content.documents — llc_documents, llc_document_shares + storage
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "admin_read_llc_documents" ON llc_documents;
CREATE POLICY "admin_read_llc_documents" ON llc_documents
    FOR SELECT USING (public.has_permission('content.documents'));

DROP POLICY IF EXISTS "admin_insert_llc_documents" ON llc_documents;
CREATE POLICY "admin_insert_llc_documents" ON llc_documents
    FOR INSERT WITH CHECK (public.has_permission('content.documents'));

DROP POLICY IF EXISTS "admin_update_llc_documents" ON llc_documents;
CREATE POLICY "admin_update_llc_documents" ON llc_documents
    FOR UPDATE USING (public.has_permission('content.documents'));

DROP POLICY IF EXISTS "admin_delete_llc_documents" ON llc_documents;
CREATE POLICY "admin_delete_llc_documents" ON llc_documents
    FOR DELETE USING (public.has_permission('content.documents'));

DROP POLICY IF EXISTS "admin_read_llc_document_shares" ON llc_document_shares;
CREATE POLICY "admin_read_llc_document_shares" ON llc_document_shares
    FOR SELECT USING (public.has_permission('content.documents'));

DROP POLICY IF EXISTS "admin_insert_llc_document_shares" ON llc_document_shares;
CREATE POLICY "admin_insert_llc_document_shares" ON llc_document_shares
    FOR INSERT WITH CHECK (public.has_permission('content.documents'));

DROP POLICY IF EXISTS "admin_upload_llc_documents" ON storage.objects;
CREATE POLICY "admin_upload_llc_documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'llc-documents'
        AND public.has_permission('content.documents')
    );

DROP POLICY IF EXISTS "admin_read_llc_document_files" ON storage.objects;
CREATE POLICY "admin_read_llc_document_files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'llc-documents'
        AND public.has_permission('content.documents')
    );

DROP POLICY IF EXISTS "admin_delete_llc_document_files" ON storage.objects;
CREATE POLICY "admin_delete_llc_document_files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'llc-documents'
        AND public.has_permission('content.documents')
    );

-- ──────────────────────────────────────────────────────────────
-- content.quests — quests, member_quests, credit_points_log,
--                  member_badges, cosmetics, member_cosmetics
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view active quests" ON quests;
CREATE POLICY "Anyone can view active quests" ON quests
    FOR SELECT USING (
        is_active = true
        OR public.has_permission('content.quests')
    );

DROP POLICY IF EXISTS "Admins can manage quests" ON quests;
CREATE POLICY "Admins can manage quests" ON quests
    FOR ALL
    USING (public.has_permission('content.quests'))
    WITH CHECK (public.has_permission('content.quests'));

DROP POLICY IF EXISTS "Users can view own quests" ON member_quests;
CREATE POLICY "Users can view own quests" ON member_quests
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.has_permission('content.quests')
    );

DROP POLICY IF EXISTS "Users can update own quests" ON member_quests;
CREATE POLICY "Users can update own quests" ON member_quests
    FOR UPDATE
    USING (user_id = auth.uid() OR public.has_permission('content.quests'))
    WITH CHECK (user_id = auth.uid() OR public.has_permission('content.quests'));

DROP POLICY IF EXISTS "Users can insert own quests" ON member_quests;
CREATE POLICY "Users can insert own quests" ON member_quests
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        OR public.has_permission('content.quests')
    );

DROP POLICY IF EXISTS "Admins can delete member quests" ON member_quests;
CREATE POLICY "Admins can delete member quests" ON member_quests
    FOR DELETE USING (public.has_permission('content.quests'));

DROP POLICY IF EXISTS "Users can view own CP log" ON credit_points_log;
CREATE POLICY "Users can view own CP log" ON credit_points_log
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.has_permission('content.quests')
    );

DROP POLICY IF EXISTS "System/admin can insert CP" ON credit_points_log;
CREATE POLICY "System/admin can insert CP" ON credit_points_log
    FOR INSERT WITH CHECK (
        public.has_permission('content.quests')
        OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can view own badges" ON member_badges;
CREATE POLICY "Users can view own badges" ON member_badges
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.has_permission('content.quests')
    );

DROP POLICY IF EXISTS "System/admin can insert badges" ON member_badges;
CREATE POLICY "System/admin can insert badges" ON member_badges
    FOR INSERT WITH CHECK (
        public.has_permission('content.quests')
        OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update own badges" ON member_badges;
CREATE POLICY "Users can update own badges" ON member_badges
    FOR UPDATE
    USING (user_id = auth.uid() OR public.has_permission('content.quests'))
    WITH CHECK (user_id = auth.uid() OR public.has_permission('content.quests'));

DROP POLICY IF EXISTS "cosmetics_admin_write" ON cosmetics;
CREATE POLICY "cosmetics_admin_write" ON cosmetics
    FOR ALL
    USING (public.has_permission('content.quests'))
    WITH CHECK (public.has_permission('content.quests'));

DROP POLICY IF EXISTS "member_cosmetics_admin_insert" ON member_cosmetics;
CREATE POLICY "member_cosmetics_admin_insert" ON member_cosmetics
    FOR INSERT WITH CHECK (public.has_permission('content.quests'));

DROP POLICY IF EXISTS "member_cosmetics_admin_delete" ON member_cosmetics;
CREATE POLICY "member_cosmetics_admin_delete" ON member_cosmetics
    FOR DELETE USING (public.has_permission('content.quests'));

-- ──────────────────────────────────────────────────────────────
-- admin.notifications — notifications, push_subscriptions
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "notif_admin_select" ON notifications;
CREATE POLICY "notif_admin_select" ON notifications
    FOR SELECT USING (public.has_permission('admin.notifications'));

DROP POLICY IF EXISTS "notif_admin_insert" ON notifications;
CREATE POLICY "notif_admin_insert" ON notifications
    FOR INSERT WITH CHECK (public.has_permission('admin.notifications'));

DROP POLICY IF EXISTS "push_admin_select" ON push_subscriptions;
CREATE POLICY "push_admin_select" ON push_subscriptions
    FOR SELECT USING (public.has_permission('admin.notifications'));

-- ──────────────────────────────────────────────────────────────
-- admin.roles — roles, role_permissions, member_roles, role_audit_log
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "roles_insert_admin" ON roles;
CREATE POLICY "roles_insert_admin" ON roles
    FOR INSERT WITH CHECK (public.has_permission('admin.roles'));

DROP POLICY IF EXISTS "roles_update_admin" ON roles;
CREATE POLICY "roles_update_admin" ON roles
    FOR UPDATE USING (public.has_permission('admin.roles'));

DROP POLICY IF EXISTS "roles_delete_admin" ON roles;
CREATE POLICY "roles_delete_admin" ON roles
    FOR DELETE USING (public.has_permission('admin.roles'));

DROP POLICY IF EXISTS "role_permissions_insert_admin" ON role_permissions;
CREATE POLICY "role_permissions_insert_admin" ON role_permissions
    FOR INSERT WITH CHECK (public.has_permission('admin.roles'));

DROP POLICY IF EXISTS "role_permissions_update_admin" ON role_permissions;
CREATE POLICY "role_permissions_update_admin" ON role_permissions
    FOR UPDATE USING (public.has_permission('admin.roles'));

DROP POLICY IF EXISTS "role_permissions_delete_admin" ON role_permissions;
CREATE POLICY "role_permissions_delete_admin" ON role_permissions
    FOR DELETE USING (public.has_permission('admin.roles'));

DROP POLICY IF EXISTS "member_roles_select_admin" ON member_roles;
CREATE POLICY "member_roles_select_admin" ON member_roles
    FOR SELECT USING (public.has_permission('admin.roles'));

DROP POLICY IF EXISTS "member_roles_insert_admin" ON member_roles;
CREATE POLICY "member_roles_insert_admin" ON member_roles
    FOR INSERT WITH CHECK (public.has_permission('admin.roles'));

DROP POLICY IF EXISTS "member_roles_update_admin" ON member_roles;
CREATE POLICY "member_roles_update_admin" ON member_roles
    FOR UPDATE USING (public.has_permission('admin.roles'));

DROP POLICY IF EXISTS "member_roles_delete_admin" ON member_roles;
CREATE POLICY "member_roles_delete_admin" ON member_roles
    FOR DELETE USING (public.has_permission('admin.roles'));

DROP POLICY IF EXISTS "role_audit_log_select_admin" ON role_audit_log;
CREATE POLICY "role_audit_log_select_admin" ON role_audit_log
    FOR SELECT USING (public.has_permission('admin.roles'));

DROP POLICY IF EXISTS "role_audit_log_insert_admin" ON role_audit_log;
CREATE POLICY "role_audit_log_insert_admin" ON role_audit_log
    FOR INSERT WITH CHECK (public.has_permission('admin.roles'));

-- ──────────────────────────────────────────────────────────────
-- admin.brand — storage (profile-pictures/brand)
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can upload brand logos" ON storage.objects;
CREATE POLICY "Admins can upload brand logos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profile-pictures'
        AND (storage.foldername(name))[1] = 'brand'
        AND public.has_permission('admin.brand')
    );

DROP POLICY IF EXISTS "Admins can update brand logos" ON storage.objects;
CREATE POLICY "Admins can update brand logos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'profile-pictures'
        AND (storage.foldername(name))[1] = 'brand'
        AND public.has_permission('admin.brand')
    );

DROP POLICY IF EXISTS "Admins can delete brand logos" ON storage.objects;
CREATE POLICY "Admins can delete brand logos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'profile-pictures'
        AND (storage.foldername(name))[1] = 'brand'
        AND public.has_permission('admin.brand')
    );

-- ──────────────────────────────────────────────────────────────
-- content.feed — posts, post_comments
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "posts_admin_update" ON posts;
CREATE POLICY "posts_admin_update" ON posts
    FOR UPDATE USING (public.has_permission('content.feed'));

DROP POLICY IF EXISTS "posts_admin_delete" ON posts;
CREATE POLICY "posts_admin_delete" ON posts
    FOR DELETE USING (public.has_permission('content.feed'));

DROP POLICY IF EXISTS "post_comments_delete" ON post_comments;
CREATE POLICY "post_comments_delete" ON post_comments
    FOR DELETE USING (
        author_id = auth.uid()
        OR public.has_permission('content.feed')
    );

-- ──────────────────────────────────────────────────────────────
-- content.family_approvals — family_tree_people, tree_settings
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "creator or admin update tree people" ON family_tree_people;
CREATE POLICY "creator or admin update tree people" ON family_tree_people
    FOR UPDATE USING (
        created_by = auth.uid()
        OR public.has_permission('content.family_approvals')
    );

DROP POLICY IF EXISTS "admin delete tree people" ON family_tree_people;
CREATE POLICY "admin delete tree people" ON family_tree_people
    FOR DELETE USING (public.has_permission('content.family_approvals'));

DROP POLICY IF EXISTS "admins write tree_settings" ON tree_settings;
CREATE POLICY "admins write tree_settings" ON tree_settings
    FOR ALL
    USING (public.has_permission('content.family_approvals'))
    WITH CHECK (public.has_permission('content.family_approvals'));

-- ──────────────────────────────────────────────────────────────
-- events.manage_all — events, event_checkins, event_hosts,
--   event_cost_items, event_waitlist, event_refunds,
--   event_raffle_entries, event_raffle_winners,
--   event_guest_rsvps, event_documents, event_locations,
--   competition_*, prize_pool_contributions, event_photos
--   + storage buckets
-- ──────────────────────────────────────────────────────────────

-- events
DROP POLICY IF EXISTS "events_insert_admin" ON events;
CREATE POLICY "events_insert_admin" ON events
    FOR INSERT WITH CHECK (public.has_permission('events.manage_all'));

DROP POLICY IF EXISTS "events_update_admin" ON events;
CREATE POLICY "events_update_admin" ON events
    FOR UPDATE USING (public.has_permission('events.manage_all'));

DROP POLICY IF EXISTS "events_delete_admin" ON events;
CREATE POLICY "events_delete_admin" ON events
    FOR DELETE USING (public.has_permission('events.manage_all'));

-- event_checkins
DROP POLICY IF EXISTS "checkins_insert_host" ON event_checkins;
CREATE POLICY "checkins_insert_host" ON event_checkins
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM event_hosts WHERE event_id = event_checkins.event_id AND user_id = auth.uid()
        )
        OR public.has_permission('events.manage_all')
        OR user_id = auth.uid()
    );

-- event_hosts
DROP POLICY IF EXISTS "hosts_insert_creator" ON event_hosts;
CREATE POLICY "hosts_insert_creator" ON event_hosts
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid())
        OR public.has_permission('events.manage_all')
    );

DROP POLICY IF EXISTS "hosts_delete_creator" ON event_hosts;
CREATE POLICY "hosts_delete_creator" ON event_hosts
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid())
        OR public.has_permission('events.manage_all')
    );

-- event_cost_items
DROP POLICY IF EXISTS "cost_items_insert_admin" ON event_cost_items;
CREATE POLICY "cost_items_insert_admin" ON event_cost_items
    FOR INSERT WITH CHECK (public.has_permission('events.manage_all'));

DROP POLICY IF EXISTS "cost_items_update_admin" ON event_cost_items;
CREATE POLICY "cost_items_update_admin" ON event_cost_items
    FOR UPDATE USING (public.has_permission('events.manage_all'));

DROP POLICY IF EXISTS "cost_items_delete_admin" ON event_cost_items;
CREATE POLICY "cost_items_delete_admin" ON event_cost_items
    FOR DELETE USING (public.has_permission('events.manage_all'));

-- event_waitlist
DROP POLICY IF EXISTS "waitlist_admin_all" ON event_waitlist;
CREATE POLICY "waitlist_admin_all" ON event_waitlist
    FOR ALL USING (public.has_permission('events.manage_all'));

-- event_refunds
DROP POLICY IF EXISTS "refunds_select_admin" ON event_refunds;
CREATE POLICY "refunds_select_admin" ON event_refunds
    FOR SELECT USING (public.has_permission('events.manage_all'));

-- event_raffle_entries
DROP POLICY IF EXISTS "raffle_entries_delete_admin" ON event_raffle_entries;
CREATE POLICY "raffle_entries_delete_admin" ON event_raffle_entries
    FOR DELETE USING (public.has_permission('events.manage_all'));

-- event_raffle_winners
DROP POLICY IF EXISTS "raffle_winners_insert_admin" ON event_raffle_winners;
CREATE POLICY "raffle_winners_insert_admin" ON event_raffle_winners
    FOR INSERT WITH CHECK (
        public.has_permission('events.manage_all')
        OR EXISTS (
            SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "raffle_winners_delete_admin" ON event_raffle_winners;
CREATE POLICY "raffle_winners_delete_admin" ON event_raffle_winners
    FOR DELETE USING (public.has_permission('events.manage_all'));

-- event_guest_rsvps
DROP POLICY IF EXISTS "guest_rsvps_admin_delete" ON event_guest_rsvps;
CREATE POLICY "guest_rsvps_admin_delete" ON event_guest_rsvps
    FOR DELETE USING (public.has_permission('events.manage_all'));

-- event_documents
DROP POLICY IF EXISTS "event_docs_select_member" ON event_documents;
CREATE POLICY "event_docs_select_member" ON event_documents
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND (
            (target_user_id IS NULL AND EXISTS (
                SELECT 1 FROM event_rsvps
                WHERE event_id = event_documents.event_id
                  AND user_id = auth.uid()
                  AND status = 'going'
            ))
            OR target_user_id = auth.uid()
            OR public.has_permission('events.manage_all')
            OR EXISTS (SELECT 1 FROM events WHERE id = event_documents.event_id AND created_by = auth.uid())
            OR EXISTS (SELECT 1 FROM event_hosts WHERE event_id = event_documents.event_id AND user_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "event_docs_insert_admin" ON event_documents;
CREATE POLICY "event_docs_insert_admin" ON event_documents
    FOR INSERT WITH CHECK (
        public.has_permission('events.manage_all')
        OR EXISTS (SELECT 1 FROM events WHERE id = event_documents.event_id AND created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM event_hosts WHERE event_id = event_documents.event_id AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "event_docs_update_admin" ON event_documents;
CREATE POLICY "event_docs_update_admin" ON event_documents
    FOR UPDATE USING (
        public.has_permission('events.manage_all')
        OR EXISTS (SELECT 1 FROM events WHERE id = event_documents.event_id AND created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM event_hosts WHERE event_id = event_documents.event_id AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "event_docs_delete_admin" ON event_documents;
CREATE POLICY "event_docs_delete_admin" ON event_documents
    FOR DELETE USING (
        public.has_permission('events.manage_all')
        OR EXISTS (SELECT 1 FROM events WHERE id = event_documents.event_id AND created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM event_hosts WHERE event_id = event_documents.event_id AND user_id = auth.uid())
    );

-- event_locations
DROP POLICY IF EXISTS "event_locations_select" ON event_locations;
CREATE POLICY "event_locations_select" ON event_locations
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND (
            EXISTS (
                SELECT 1 FROM event_rsvps
                WHERE event_id = event_locations.event_id
                  AND user_id = auth.uid()
                  AND status = 'going'
            )
            OR public.has_permission('events.manage_all')
        )
    );

-- competition tables
DROP POLICY IF EXISTS "comp_phases_admin_all" ON competition_phases;
CREATE POLICY "comp_phases_admin_all" ON competition_phases
    FOR ALL USING (public.has_permission('events.manage_all'));

DROP POLICY IF EXISTS "comp_entries_admin_all" ON competition_entries;
CREATE POLICY "comp_entries_admin_all" ON competition_entries
    FOR ALL USING (public.has_permission('events.manage_all'));

DROP POLICY IF EXISTS "comp_votes_admin_all" ON competition_votes;
CREATE POLICY "comp_votes_admin_all" ON competition_votes
    FOR ALL USING (public.has_permission('events.manage_all'));

DROP POLICY IF EXISTS "prize_pool_admin_all" ON prize_pool_contributions;
CREATE POLICY "prize_pool_admin_all" ON prize_pool_contributions
    FOR ALL USING (public.has_permission('events.manage_all'));

DROP POLICY IF EXISTS "comp_winners_admin_all" ON competition_winners;
CREATE POLICY "comp_winners_admin_all" ON competition_winners
    FOR ALL USING (public.has_permission('events.manage_all'));

-- event_photos
DROP POLICY IF EXISTS "event_photos_delete" ON event_photos;
CREATE POLICY "event_photos_delete" ON event_photos
    FOR DELETE USING (
        auth.uid() = user_id
        OR public.has_permission('events.manage_all')
    );

-- storage: event-banners
DROP POLICY IF EXISTS "event_banners_upload" ON storage.objects;
CREATE POLICY "event_banners_upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'event-banners'
        AND auth.uid() IS NOT NULL
        AND public.has_permission('events.manage_all')
    );

DROP POLICY IF EXISTS "event_banners_delete" ON storage.objects;
CREATE POLICY "event_banners_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'event-banners'
        AND auth.uid() IS NOT NULL
        AND public.has_permission('events.manage_all')
    );

-- storage: event-documents
DROP POLICY IF EXISTS "event_docs_storage_upload" ON storage.objects;
CREATE POLICY "event_docs_storage_upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'event-documents'
        AND auth.uid() IS NOT NULL
        AND public.has_permission('events.manage_all')
    );

DROP POLICY IF EXISTS "event_docs_storage_delete" ON storage.objects;
CREATE POLICY "event_docs_storage_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'event-documents'
        AND auth.uid() IS NOT NULL
        AND public.has_permission('events.manage_all')
    );

-- storage: competition-entries (uid OR admin)
DROP POLICY IF EXISTS "comp_entry_delete" ON storage.objects;
CREATE POLICY "comp_entry_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'competition-entries'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR public.has_permission('events.manage_all')
        )
    );

-- storage: event-photos (uid OR admin)
DROP POLICY IF EXISTS "evt_photo_delete" ON storage.objects;
CREATE POLICY "evt_photo_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'event-photos'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR public.has_permission('events.manage_all')
        )
    );

-- ═══════════════════════════════════════════════════════════════
-- Done.  All 106 admin-gated policies now use granular
-- has_permission() checks.  is_admin() is now a thin wrapper
-- calling has_permission('admin.dashboard'), so any policy
-- missed here still works through the permission system.
-- ═══════════════════════════════════════════════════════════════
