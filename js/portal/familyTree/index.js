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

        // Build a name set of active members for deduplication against non-member tree people
        const memberNameSet = new Set(
            profiles.map(p => fullName(p).toLowerCase().trim()).filter(Boolean)
        );

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
            // Skip non-member entries whose name matches a real member (they've since joined)
            const normalised = (tp.display_name || '').toLowerCase().trim();
            if (memberNameSet.has(normalised)) return;
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

        return { elements: nodes.concat(edges), connectedIds };
    }

    // ─── Member list ──────────────────────────────────────────────────────────

    function renderMemberList(profiles, treePeople) {
        const listEl = document.getElementById('memberList');
        if (!listEl) return;
        listEl.innerHTML = '';

        // --- Active members ---
        profiles.forEach(p => {
            const div = document.createElement('div');
            div.className = 'member-row flex items-center gap-3 px-4 py-3 cursor-pointer';
            div.dataset.name = fullName(p).toLowerCase();
            const avatarHtml = p.profile_picture_url
                ? `<img src="${p.profile_picture_url}" alt="${escapeHtml(fullName(p))}" class="w-10 h-10 object-cover rounded-full">`
                : `<div class="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-sm font-semibold text-brand-600">${(p.first_name || '?').charAt(0)}</div>`;

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

        // --- Non-member / family tree people ---
        const tp = treePeople || [];
        if (tp.length > 0) {
            // Divider
            const divider = document.createElement('div');
            divider.className = 'px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-surface-100 border-t border-gray-100';
            divider.textContent = 'Non-Members';
            listEl.appendChild(divider);

            tp.forEach(person => {
                const div = document.createElement('div');
                div.className = 'member-row flex items-center gap-3 px-4 py-3';
                div.dataset.name = (person.display_name || '').toLowerCase();

                const avatarHtml = person.photo_url
                    ? `<img src="${person.photo_url}" alt="${escapeHtml(person.display_name)}" class="w-10 h-10 object-cover rounded-full opacity-75">`
                    : `<div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-400">${(person.display_name || '?').charAt(0)}</div>`;

                const deceasedBadge = person.death_year
                    ? `<span class="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Deceased</span>`
                    : '';

                const years = person.birth_year
                    ? (person.death_year ? `${person.birth_year}–${person.death_year}` : `b. ${person.birth_year}`)
                    : '';

                div.innerHTML = `
                    <div class="relative flex-shrink-0">${avatarHtml}</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center">
                            <span class="text-sm font-medium text-gray-600 truncate">${escapeHtml(person.display_name)}</span>
                            ${deceasedBadge}
                        </div>
                        <div class="text-xs text-gray-400 truncate">${escapeHtml(years)}</div>
                    </div>`;
                listEl.appendChild(div);
            });
        }
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

    // Stores full pending detail data keyed by relation id
    const _pendingDetailMap = {};

    function openPendingDetail(id) {
        const d = _pendingDetailMap[id];
        if (!d) return;

        const typeBadge = t => t === 'tree_person'
            ? '<span class="text-[10px] font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">Non-member</span>'
            : '<span class="text-[10px] font-semibold px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded-full">Member</span>';

        const setAvatar = (elId, name, type) => {
            const el = document.getElementById(elId);
            if (!el) return;
            el.textContent = (name || '?').charAt(0).toUpperCase();
            const isMember = type !== 'tree_person';
            el.className = 'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ' +
                (isMember ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500');
        };

        const relLabel = { parent:'Parent', child:'Child', spouse:'Spouse', sibling:'Sibling', other:'Other' };
        const submittedAt = d.created_at
            ? new Date(d.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
            : '';
        const note = d.metadata?.note || '';

        document.getElementById('pendingDetailSubmitter').textContent =
            `Suggested by ${d.nameSubmitter || 'Unknown'}${submittedAt ? ' \u00b7 ' + submittedAt : ''}`;

        document.getElementById('pendingDetailPersonA').innerHTML =
            `<span class="text-sm font-semibold text-gray-900">${escapeHtml(d.nameA)}</span>${typeBadge(d.person_a_type)}`;
        document.getElementById('pendingDetailPersonB').innerHTML =
            `<span class="text-sm font-semibold text-gray-900">${escapeHtml(d.nameB)}</span>${typeBadge(d.person_b_type)}`;

        setAvatar('pendingDetailAvatarA', d.nameA, d.person_a_type);
        setAvatar('pendingDetailAvatarB', d.nameB, d.person_b_type);

        document.getElementById('pendingDetailRelation').textContent = relLabel[d.relation] || d.relation;

        const noteEl = document.getElementById('pendingDetailNote');
        if (note) { noteEl.textContent = note; noteEl.classList.remove('hidden'); }
        else { noteEl.classList.add('hidden'); }

        const approveBtn = document.getElementById('pendingDetailApprove');
        const rejectBtn  = document.getElementById('pendingDetailReject');
        if (approveBtn) approveBtn.dataset.id = id;
        if (rejectBtn)  rejectBtn.dataset.id  = id;

        const modal = document.getElementById('pendingDetailModal');
        if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    }

    function closePendingDetail() {
        const modal = document.getElementById('pendingDetailModal');
        if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    }

    async function showAdminApprovals() {
        const wrap = document.getElementById('adminApprovalsWrap');
        const list = document.getElementById('adminApprovalsList');
        if (!wrap || !list) return;
        wrap.classList.remove('hidden');
        list.innerHTML = '<div class="px-4 py-3 text-sm text-gray-400">Loading…</div>';

        const { data: pending, error } = await supabaseClient
            .from('family_relations')
            .select('id, person_a, person_b, person_a_type, person_b_type, relation, metadata, created_by, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            list.innerHTML = '<div class="px-4 py-3 text-sm text-red-600">Failed to load</div>';
            console.error('[familyTree] pending error', error);
            return;
        }
        if (!pending || pending.length === 0) {
            list.innerHTML = '<div class="px-4 py-3 text-sm text-gray-400">No pending suggestions</div>';
            if (window.FamilyTreeUI) window.FamilyTreeUI.setPendingBadge(0);
            return;
        }

        if (window.FamilyTreeUI) window.FamilyTreeUI.setPendingBadge(pending.length);

        // Batch-fetch all referenced profiles AND tree_people (people + submitters)
        const allIds = [...new Set(pending.flatMap(r => [r.person_a, r.person_b, r.created_by].filter(Boolean)))];
        const [{ data: profileRows }, { data: tpRows }] = await Promise.all([
            supabaseClient.from('profiles').select('id, first_name, last_name').in('id', allIds),
            supabaseClient.from('family_tree_people').select('id, display_name').in('id', allIds),
        ]);
        const nameMap = {};
        (profileRows || []).forEach(p  => { nameMap[p.id]  = ((p.first_name || '') + ' ' + (p.last_name || '')).trim() || p.id; });
        (tpRows      || []).forEach(tp => { nameMap[tp.id] = tp.display_name; });

        // Store full data for detail modal
        pending.forEach(r => {
            _pendingDetailMap[r.id] = {
                ...r,
                nameA:         nameMap[r.person_a]   || 'Unknown',
                nameB:         nameMap[r.person_b]   || 'Unknown',
                nameSubmitter: nameMap[r.created_by] || 'Unknown',
            };
        });

        list.innerHTML = '';
        for (const r of pending) {
            const d = _pendingDetailMap[r.id];
            const row = document.createElement('div');
            row.className = 'flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition cursor-pointer';
            row.dataset.pendingId = r.id;
            row.innerHTML = `
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-800 truncate">${escapeHtml(d.nameA)} → ${escapeHtml(d.nameB)}</div>
                    <div class="text-xs text-gray-400 capitalize mt-0.5">${escapeHtml(r.relation)} · tap for details</div>
                </div>
                <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button data-id="${r.id}" data-action="approve" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition">✓</button>
                    <button data-id="${r.id}" data-action="reject"  class="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold border border-red-100 transition">✕</button>
                </div>`;
            list.appendChild(row);
        }

        list.addEventListener('click', async function handler(e) {
            // Quick approve/reject buttons
            const btn = e.target.closest('button[data-action]');
            if (btn) {
                btn.disabled = true;
                const { id, action } = btn.dataset;
                if (action === 'approve') await updateStatusInline(id, 'approved');
                if (action === 'reject')  await updateStatusInline(id, 'rejected');
                closePendingDetail();
                await loadFamily();
                return;
            }
            // Row tap → open detail modal
            const row = e.target.closest('[data-pending-id]');
            if (row) openPendingDetail(row.dataset.pendingId);
        }, { once: true });

        // Wire detail modal approve/reject (re-wire each time approvals refresh)
        const approveBtn = document.getElementById('pendingDetailApprove');
        const rejectBtn  = document.getElementById('pendingDetailReject');
        const wireDetailBtn = (btn, status) => {
            if (!btn) return;
            btn.onclick = async () => {
                const id = btn.dataset.id;
                if (!id) return;
                btn.disabled = true;
                await updateStatusInline(id, status);
                closePendingDetail();
                await loadFamily();
            };
        };
        wireDetailBtn(approveBtn, 'approved');
        wireDetailBtn(rejectBtn,  'rejected');
    }

    // ─── Main load ────────────────────────────────────────────────────────────

    async function loadFamily() {
        // ── Access gate: only active contributors and admins ───────────────
        try {
            const { data: sess } = await supabaseClient.auth.getSession();
            const uid = sess?.session?.user?.id;
            if (!uid) { window.location.href = '/login.html'; return; }

            const [{ data: me }, { data: sub }] = await Promise.all([
                supabaseClient.from('profiles').select('role').eq('id', uid).single(),
                supabaseClient.from('subscriptions')
                    .select('status')
                    .eq('user_id', uid)
                    .in('status', ['active', 'trialing'])
                    .maybeSingle(),
            ]);

            const isAdmin          = me?.role === 'admin';
            const hasActiveSub     = !!sub;

            if (!isAdmin && !hasActiveSub) {
                _showAccessGate();
                return;
            }
        } catch (_) {
            _showAccessGate();
            return;
        }

        const result = await fetchData();
        if (!result) return;

        const { profiles, relations, treePeople } = result;
        const { elements, connectedIds } = buildElements(profiles, relations, treePeople);

        // Only show non-members who appear in at least one approved relation
        const approvedTreePeople = (treePeople || []).filter(tp => connectedIds.has(tp.id));
        renderMemberList(profiles, approvedTreePeople);
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
                if (window.FamilyTreeUI) window.FamilyTreeUI.showCanvas();

                // Fetch shared positions from DB (set by admin, visible to all)
                let savedPositions = null;
                try {
                    const { data: setting } = await supabaseClient
                        .from('tree_settings')
                        .select('value')
                        .eq('key', 'tree_positions')
                        .maybeSingle();
                    if (setting?.value && Object.keys(setting.value).length > 0) {
                        savedPositions = setting.value;
                    }
                } catch (_) { /* table may not exist yet — fall back to auto layout */ }

                const onPositionSave = async (posObj) => {
                    try {
                        await supabaseClient.from('tree_settings').upsert(
                            { key: 'tree_positions', value: posObj, updated_at: new Date().toISOString() },
                            { onConflict: 'key' }
                        );
                    } catch (_) {}
                };

                requestAnimationFrame(() => {
                    if (window.TreeViz) TreeViz.init('#cy', elements, {
                        positions:      savedPositions,
                        onPositionSave: onPositionSave,
                    });
                });
            }
        } catch (err) {
            console.error('[familyTree] TreeViz.init error', err);
        }
    }

    // ─── Bootstrap ────────────────────────────────────────────────────────────

    function _showAccessGate() {
        const gate = document.getElementById('accessGate');
        if (gate) { gate.classList.remove('hidden'); gate.classList.add('flex'); }
        ['treePageHeader', 'treeMainGrid', 'addRelationBtnMobile'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
    }

    window.loadFamilyTree = loadFamily;

    document.addEventListener('DOMContentLoaded', function () {
        // Close pending-detail modal
        const cpd = document.getElementById('closePendingDetail');
        if (cpd) cpd.addEventListener('click', closePendingDetail);
        const pdm = document.getElementById('pendingDetailModal');
        if (pdm) pdm.addEventListener('click', e => { if (e.target === pdm) closePendingDetail(); });

        loadFamily();
    });

})();
