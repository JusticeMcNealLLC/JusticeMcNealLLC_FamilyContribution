// js/portal/familyTree/index.js
// Orchestrates data fetching, member list rendering, admin approvals, and tree init.

(async function () {

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function escapeHtml(s) {
        return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function fullName(p) {
        return ((p.first_name || '') + ' ' + (p.last_name || '')).trim();
    }

    // ─── Data ─────────────────────────────────────────────────────────────────

    async function fetchData() {
        const [{ data: profiles, error: pErr }, { data: relations, error: rErr }] = await Promise.all([
            supabaseClient
                .from('profiles')
                .select('id, first_name, last_name, title, profile_picture_url, displayed_badge, highlighted_badges, is_active')
                .eq('is_active', true),
            supabaseClient
                .from('family_relations')
                .select('*')
                .eq('status', 'approved'),
        ]);

        if (pErr) { console.error('[familyTree] profiles error', pErr); return null; }
        if (rErr) { console.error('[familyTree] relations error', rErr); return null; }

        return { profiles: profiles || [], relations: relations || [] };
    }

    // ─── Elements builder ─────────────────────────────────────────────────────

    function buildElements(profiles, relations) {
        const nodes = {};
        profiles.forEach(p => {
            nodes[p.id] = { data: { id: p.id, label: fullName(p) || p.id } };
        });
        relations.forEach(r => {
            if (!nodes[r.person_a]) nodes[r.person_a] = { data: { id: r.person_a, label: r.person_a } };
            if (!nodes[r.person_b]) nodes[r.person_b] = { data: { id: r.person_b, label: r.person_b } };
        });
        const edges = relations.map(r => ({ data: { id: r.id, source: r.person_a, target: r.person_b, relation: r.relation } }));
        return Object.values(nodes).concat(edges);
    }

    // ─── Member list ──────────────────────────────────────────────────────────

    function renderMemberList(profiles) {
        const listEl = document.getElementById('memberList');
        if (!listEl) return;
        listEl.innerHTML = '';

        profiles.forEach(p => {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 p-2 rounded hover:bg-surface-50 cursor-pointer';

            const avatarHtml = p.profile_picture_url
                ? `<img src="${p.profile_picture_url}" alt="${escapeHtml(fullName(p))}" class="w-10 h-10 object-cover rounded-full">`
                : `<div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-600">${(p.first_name || '').charAt(0)}</div>`;

            let badgeOverlay = '';
            if (p.displayed_badge && typeof buildNavBadgeOverlay === 'function') {
                badgeOverlay = `<div class="absolute -bottom-0.5 -right-0.5">${buildNavBadgeOverlay(p.displayed_badge)}</div>`;
            }

            let highlightsHtml = '';
            if (Array.isArray(p.highlighted_badges) && p.highlighted_badges.length > 0) {
                const chips = p.highlighted_badges.slice(0, 3)
                    .map(bk => (typeof buildBadgeChip === 'function' ? buildBadgeChip(bk, 'sm') : ''))
                    .join('');
                highlightsHtml = `<div class="flex items-center gap-1 mt-1">${chips}</div>`;
            }

            div.innerHTML = `
                <div class="relative flex-shrink-0">${avatarHtml}${badgeOverlay}</div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900 truncate">${escapeHtml(fullName(p))}</div>
                    <div class="text-xs text-gray-500 truncate">${escapeHtml(p.title || '')}</div>
                    ${highlightsHtml}
                </div>
                <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>`;
            div.addEventListener('click', () => { window.location.href = `profile.html?id=${p.id}`; });
            listEl.appendChild(div);
        });
    }

    // ─── Admin approvals panel ────────────────────────────────────────────────

    async function updateStatusInline(id, status) {
        try {
            const { data: sess } = await supabaseClient.auth.getSession();
            const approver = sess?.session?.user?.id || null;
            const { error } = await supabaseClient
                .from('family_relations')
                .update({ status, approved_by: approver, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) console.error('[familyTree] update status error', error);
        } catch (err) {
            console.error('[familyTree] updateStatusInline error', err);
        }
    }

    async function showAdminApprovals() {
        const wrap = document.getElementById('adminApprovalsWrap');
        const list = document.getElementById('adminApprovalsList');
        if (!wrap || !list) return;
        wrap.classList.remove('hidden');
        list.innerHTML = '<div class="text-sm text-gray-500">Loading…</div>';

        const { data: pending, error } = await supabaseClient
            .from('family_relations')
            .select('id, person_a, person_b, relation, metadata, created_by, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            list.innerHTML = '<div class="text-sm text-red-600">Failed to load</div>';
            console.error('[familyTree] pending error', error);
            return;
        }
        if (!pending || pending.length === 0) {
            list.innerHTML = '<div class="text-sm text-gray-400">No pending suggestions</div>';
            return;
        }

        // Batch-fetch all referenced profiles in one query (no N+1)
        const personIds = [...new Set(pending.flatMap(r => [r.person_a, r.person_b]))];
        const { data: profileRows } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', personIds);
        const profileMap = {};
        (profileRows || []).forEach(p => { profileMap[p.id] = p; });

        list.innerHTML = '';
        for (const r of pending) {
            const a = profileMap[r.person_a] || {};
            const b = profileMap[r.person_b] || {};
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between gap-3 p-2 rounded bg-surface-50 border border-gray-100';
            row.innerHTML = `
                <div class="text-sm">${escapeHtml(fullName(a))} → ${escapeHtml(fullName(b))}</div>
                <div class="flex items-center gap-2">
                    <button data-id="${r.id}" data-action="approve" class="px-2 py-1 bg-emerald-600 text-white rounded text-sm">Approve</button>
                    <button data-id="${r.id}" data-action="reject"  class="px-2 py-1 bg-red-50 text-red-700 rounded text-sm">Reject</button>
                </div>`;
            list.appendChild(row);
        }

        // { once: true } prevents listener stacking across re-renders
        list.addEventListener('click', async function handler(e) {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            btn.disabled = true;
            const { id, action } = btn.dataset;
            if (action === 'approve') await updateStatusInline(id, 'approved');
            if (action === 'reject')  await updateStatusInline(id, 'rejected');
            await loadFamily(); // full re-render including approvals panel
        }, { once: true });
    }

    // ─── Main load ────────────────────────────────────────────────────────────

    async function loadFamily() {
        const result = await fetchData();
        if (!result) return;

        const { profiles, relations } = result;
        const elements = buildElements(profiles, relations);

        renderMemberList(profiles);

        // Admin probe: if pending rows are readable, show approvals panel
        try {
            const probe = await supabaseClient
                .from('family_relations')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending');
            if (!probe.error) showAdminApprovals();
        } catch (_) { /* not admin */ }

        // Init / refresh the Cytoscape tree
        try {
            if (window.TreeViz) TreeViz.init('#cy', elements);
        } catch (err) {
            console.error('[familyTree] TreeViz.init error', err);
        }
    }

    // ─── Bootstrap ────────────────────────────────────────────────────────────

    window.loadFamilyTree = loadFamily;

    document.addEventListener('DOMContentLoaded', function () {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', loadFamily);
        loadFamily();
    });

})();
