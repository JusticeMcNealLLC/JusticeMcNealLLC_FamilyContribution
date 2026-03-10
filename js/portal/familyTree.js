// familyTree.js — reads approved relations and renders the tree (read-only)
(async function(){
    async function loadFamily() {
        // load active profiles
        const { data: profiles, error: pErr } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name, title, profile_picture_url, displayed_badge, highlighted_badges, is_active')
            .eq('is_active', true);

        if (pErr) { console.error('profiles error', pErr); return; }
        console.log('[familyTree] profiles fetched:', Array.isArray(profiles) ? profiles.length : 0, (profiles||[]).slice(0,10));
        // load approved relations
        const { data: relations, error: rErr } = await supabaseClient
            .from('family_relations')
            .select('*')
            .eq('status', 'approved');

        if (rErr) { console.error('relations error', rErr); return; }
        console.log('[familyTree] relations fetched:', Array.isArray(relations) ? relations.length : 0, (relations||[]).slice(0,10));
        // Build nodes map
        const nodes = {};
        profiles.forEach(p => {
            const name = ((p.first_name||'') + ' ' + (p.last_name||'')).trim();
            nodes[p.id] = { data: { id: p.id, label: name || p.id } };
        });

        // Build edges
        const edges = relations.map((r) => ({ data: { id: r.id, source: r.person_a, target: r.person_b, relation: r.relation } }));

        // Ensure nodes exist for any referenced profile
        relations.forEach(r => {
            if (!nodes[r.person_a]) nodes[r.person_a] = { data: { id: r.person_a, label: r.person_a } };
            if (!nodes[r.person_b]) nodes[r.person_b] = { data: { id: r.person_b, label: r.person_b } };
        });

        const elements = Object.values(nodes).concat(edges);
        console.log('[familyTree] built elements -> nodes:', Object.keys(nodes).length, 'edges:', edges.length, 'total:', elements.length, (elements||[]).slice(0,10));

        // render list of members
        const listEl = document.getElementById('memberList');
        listEl.innerHTML = '';
        profiles.forEach(p => {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 p-2 rounded hover:bg-surface-50 cursor-pointer';

            // avatar (image or initial)
            const avatarHtml = p.profile_picture_url
                ? `<img src="${p.profile_picture_url}" alt="${escapeHtml((p.first_name||'') + ' ' + (p.last_name||''))}" class="w-10 h-10 object-cover rounded-full">`
                : `<div class="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-sm text-gray-600">${(p.first_name||'').charAt(0)}</div>`;

            // displayed badge overlay
            let badgeOverlay = '';
            if (p.displayed_badge && typeof buildNavBadgeOverlay === 'function') {
                badgeOverlay = `<div class="absolute -bottom-0.5 -right-0.5">${buildNavBadgeOverlay(p.displayed_badge)}</div>`;
            }

            // highlighted badges (small chips next to name)
            let highlightsHtml = '';
            if (Array.isArray(p.highlighted_badges) && p.highlighted_badges.length > 0) {
                const shown = p.highlighted_badges.slice(0,3);
                highlightsHtml = '<div class="flex items-center gap-1 mt-1">' + shown.map(bk => (typeof buildBadgeChip === 'function' ? buildBadgeChip(bk, 'sm') : '')) .join('') + '</div>';
            }

            div.innerHTML = `
                <div class="relative flex-shrink-0">${avatarHtml}${badgeOverlay}</div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900 truncate">${escapeHtml((p.first_name||'') + ' ' + (p.last_name||''))}</div>
                    <div class="text-xs text-gray-500 truncate">${escapeHtml(p.title||'')}</div>
                    ${highlightsHtml}
                </div>
                <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            `;
            div.addEventListener('click', () => window.location.href = `profile.html?id=${p.id}`);
            listEl.appendChild(div);
        });

            // If current user is admin, load pending suggestions inline
            // Probe whether this client can read pending family_relations rows.
            // If the query succeeds (no error) we assume the user has admin access and show the approvals panel.
            try {
                const probe = await supabaseClient
                    .from('family_relations')
                    .select('id', { limit: 1 })
                    .eq('status', 'pending');
                if (!probe.error) {
                    showAdminApprovals();
                }
            } catch (err) {
                // silent - not admin or request failed
            }

        // init viz
        try {
            console.log('[familyTree] initializing TreeViz with elements:', elements.length);
            if (window.TreeViz) TreeViz.init('#cy', elements);
        } catch (err) {
            console.error('[familyTree] TreeViz.init error', err);
        }
    }

    function escapeHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    window.loadFamilyTree = loadFamily;

    // Hook refresh/search
    document.addEventListener('DOMContentLoaded', function(){
        const search = document.getElementById('searchInput');
        const refresh = document.getElementById('refreshBtn');
        if (refresh) refresh.addEventListener('click', loadFamily);
        if (search) search.addEventListener('input', function(){ /* simple client filter could be added later */ });
        loadFamily();
    });
    
    async function showAdminApprovals() {
        const wrap = document.getElementById('adminApprovalsWrap');
        const list = document.getElementById('adminApprovalsList');
        if (!wrap || !list) return;
        wrap.classList.remove('hidden');
        list.innerHTML = '<div class="text-sm text-gray-500">Loading...</div>';

        const { data: pending, error } = await supabaseClient
            .from('family_relations')
            .select('id, person_a, person_b, relation, metadata, created_by, created_at')
            .eq('status','pending')
            .order('created_at', { ascending: false });

        if (error) { list.innerHTML = '<div class="text-sm text-red-600">Failed to load</div>'; console.error(error); return; }

        if (!pending || pending.length === 0) { list.innerHTML = '<div class="text-sm text-gray-400">No pending suggestions</div>'; return; }

        list.innerHTML = '';
        for (const r of pending) {
            const { data: a } = await supabaseClient.from('profiles').select('id, first_name, last_name').eq('id', r.person_a).single();
            const { data: b } = await supabaseClient.from('profiles').select('id, first_name, last_name').eq('id', r.person_b).single();

            const row = document.createElement('div');
            row.className = 'flex items-center justify-between gap-3 p-2 rounded bg-surface-50 border border-gray-100';
            row.innerHTML = `
                <div class="text-sm">${escapeHtml((a.first_name||'')+' '+(a.last_name||''))} → ${escapeHtml((b.first_name||'')+' '+(b.last_name||''))}</div>
                <div class="flex items-center gap-2">
                    <button data-id="${r.id}" data-action="approve" class="px-2 py-1 bg-emerald-600 text-white rounded text-sm">Approve</button>
                    <button data-id="${r.id}" data-action="reject" class="px-2 py-1 bg-red-50 text-red-700 rounded text-sm">Reject</button>
                </div>
            `;
            list.appendChild(row);
        }

        list.addEventListener('click', async function(e){
            const btn = e.target.closest('button');
            if (!btn) return;
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            if (!id || !action) return;
            if (action === 'approve') await updateStatusInline(id, 'approved');
            if (action === 'reject') await updateStatusInline(id, 'rejected');
            // refresh both approvals and main list
            await showAdminApprovals();
            await loadFamily();
        });
    }

    async function updateStatusInline(id, status) {
        try {
            const { data: sess } = await supabaseClient.auth.getSession();
            const approver = sess?.data?.session?.user?.id || null;
            const { error } = await supabaseClient
                .from('family_relations')
                .update({ status: status, approved_by: approver, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) console.error('update status error', error);
        } catch (err) { console.error('updateStatusInline error', err); }
    }
})();
