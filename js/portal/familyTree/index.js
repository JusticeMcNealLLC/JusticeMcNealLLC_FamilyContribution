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
        const [
            { data: profiles,    error: pErr },
            { data: relations,   error: rErr },
            { data: treePeople,  error: tErr },
        ] = await Promise.all([
            supabaseClient
                .from('profiles')
                .select('id, first_name, last_name, title, profile_picture_url, displayed_badge, highlighted_badges, is_active')
                .eq('is_active', true),
            supabaseClient
                .from('family_relations')
                .select('*')
                .eq('status', 'approved'),
            supabaseClient
                .from('family_tree_people')
                .select('id, display_name, photo_url, birth_year, death_year, notes'),
        ]);

        if (pErr) { console.error('[familyTree] profiles error', pErr); return null; }
        if (rErr) { console.error('[familyTree] relations error', rErr); return null; }
        // tree_people table may not exist yet — treat as empty rather than crashing
        if (tErr) console.warn('[familyTree] tree_people not ready yet:', tErr.message);

        return {
            profiles:   profiles   || [],
            relations:  relations  || [],
            treePeople: treePeople || [],
        };
    }

    // ─── Elements builder ─────────────────────────────────────────────────────

    function buildElements(profiles, relations, treePeople) {
        // Unified person lookup (id → node data)
        const personMap = {};

        profiles.forEach(p => {
            personMap[p.id] = {
                id:       p.id,
                label:    fullName(p) || p.id,
                photo:    p.profile_picture_url || null,
                isMember: true,
                deceased: false,
            };
        });

        (treePeople || []).forEach(tp => {
            personMap[tp.id] = {
                id:       tp.id,
                label:    tp.display_name,
                photo:    tp.photo_url || null,
                isMember: false,
                deceased: !!tp.death_year,
            };
        });

        // Only edges between people we know
        const edges = relations
            .filter(r => personMap[r.person_a] && personMap[r.person_b])
            .map(r => ({ data: { id: r.id, source: r.person_a, target: r.person_b, relation: r.relation } }));

        // Only include nodes that appear in at least one edge (connected-only graph)
        const connectedIds = new Set(edges.flatMap(e => [e.data.source, e.data.target]));
        const nodes = [...connectedIds].map(id => {
            const d = { ...personMap[id] };
            // Cytoscape ignores null/undefined for data() selectors — keep photo only if truthy
            if (!d.photo) delete d.photo;
            return { data: d };
        });

        return nodes.concat(edges);
    }

    // ─── Member list ──────────────────────────────────────────────────────────

    function renderMemberList(profiles) {
        const listEl = document.getElementById('memberList');
        if (!listEl) return;
        listEl.innerHTML = '';

        profiles.forEach(p => {
            const div = document.createElement('div');
            div.className = 'member-row flex items-center gap-3 px-4 py-3 cursor-pointer';
            div.dataset.name = fullName(p).toLowerCase();
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
            list.innerHTML = '<div class="px-4 py-3 text-sm text-gray-400">No pending suggestions</div>';
            if (window.FamilyTreeUI) window.FamilyTreeUI.setPendingBadge(0);
            return;
        }

        if (window.FamilyTreeUI) window.FamilyTreeUI.setPendingBadge(pending.length);

        // Batch-fetch all referenced profiles AND tree_people in two queries (no N+1)
        const personIds = [...new Set(pending.flatMap(r => [r.person_a, r.person_b]))];
        const [{ data: profileRows }, { data: tpRows }] = await Promise.all([
            supabaseClient.from('profiles').select('id, first_name, last_name').in('id', personIds),
            supabaseClient.from('family_tree_people').select('id, display_name').in('id', personIds),
        ]);
        const profileMap = {};
        (profileRows  || []).forEach(p  => { profileMap[p.id]  = { first_name: p.first_name,   last_name: p.last_name }; });
        (tpRows       || []).forEach(tp => { profileMap[tp.id] = { first_name: tp.display_name, last_name: '' }; });

        list.innerHTML = '';
        for (const r of pending) {
            const a = profileMap[r.person_a] || {};
            const b = profileMap[r.person_b] || {};
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-50 transition';
            row.innerHTML = `
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-800 truncate">${escapeHtml(fullName(a))} → ${escapeHtml(fullName(b))}</div>
                    <div class="text-xs text-gray-400 capitalize mt-0.5">${escapeHtml(r.relation)}</div>
                </div>
                <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button data-id="${r.id}" data-action="approve" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition">Approve</button>
                    <button data-id="${r.id}" data-action="reject"  class="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition">Reject</button>
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

        const { profiles, relations, treePeople } = result;
        const elements = buildElements(profiles, relations, treePeople);

        renderMemberList(profiles);
        if (window.FamilyTreeUI) {
            window.FamilyTreeUI.hideMemberSkeleton();
            window.FamilyTreeUI.setMemberCount(profiles.length);
        }

        // Check actual role — members only see approved rows so the old
        // probe (count pending) silently returns 0 for everyone with no error.
        try {
            const { data: sess } = await supabaseClient.auth.getSession();
            const uid = sess?.session?.user?.id;
            if (uid) {
                const { data: me } = await supabaseClient
                    .from('profiles').select('role').eq('id', uid).single();
                if (me?.role === 'admin') {
                    showAdminApprovals();
                    if (window.TreeViz?.setAdmin)            window.TreeViz.setAdmin(true);
                    if (window.FamilyTreeEdit?.setAdminMode) window.FamilyTreeEdit.setAdminMode(true);
                }
            }
        } catch (_) { /* non-admin or session error */ }

        // Init / refresh the Cytoscape tree
        try {
            const nodeCount = elements.filter(e => !e.data.source).length;
            if (nodeCount === 0) {
                if (window.FamilyTreeUI) window.FamilyTreeUI.showEmpty();
            } else {
                // Show the container FIRST so #cy has real dimensions, then init on next paint
                if (window.FamilyTreeUI) window.FamilyTreeUI.showCanvas();
                requestAnimationFrame(() => {
                    if (window.TreeViz) TreeViz.init('#cy', elements);
                });
            }
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
