// Admin approvals for family_relations
(async function(){
    async function loadPending() {
        const { data: pending, error } = await supabaseClient
            .from('family_relations')
            .select('id, person_a, person_b, relation, metadata, created_by, created_at')
            .eq('status','pending')
            .order('created_at', { ascending: false });

        if (error) { console.error('loadPending error', error); return; }

        const container = document.getElementById('approvalsList');
        const emptyEl   = document.getElementById('approvalsEmpty');
        const headerEl  = document.getElementById('pendingHeader');
        const countEl   = document.getElementById('pendingCount');
        container.innerHTML = '';

        if (!pending || !pending.length) {
            if (emptyEl)  emptyEl.classList.remove('hidden');
            if (headerEl) headerEl.classList.add('hidden');
            return;
        }

        if (emptyEl)  emptyEl.classList.add('hidden');
        if (headerEl) headerEl.classList.remove('hidden');
        if (countEl)  countEl.textContent = pending.length;

        for (const r of pending) {
            // fetch profiles for display
            const { data: a } = await supabaseClient.from('profiles').select('id, first_name, last_name, title').eq('id', r.person_a).limit(1).single();
            const { data: b } = await supabaseClient.from('profiles').select('id, first_name, last_name, title').eq('id', r.person_b).limit(1).single();

            const card = document.createElement('div');
            card.className = 'bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 flex flex-col gap-3';
            card.innerHTML = `
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <div class="text-sm font-bold text-gray-900">${escapeHtml((a.first_name||'')+' '+(a.last_name||''))} → ${escapeHtml((b.first_name||'')+' '+(b.last_name||''))}</div>
                        <div class="text-xs text-gray-500 mt-0.5">Relation: <span class="font-medium text-gray-700">${escapeHtml(r.relation)}</span> · Suggested ${new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <button data-id="${r.id}" data-action="approve" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition">Approve</button>
                        <button data-id="${r.id}" data-action="reject"  class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg transition">Reject</button>
                        <button data-id="${r.id}" data-action="history" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition">History</button>
                    </div>
                </div>
                <div id="history-${r.id}" class="hidden mt-1 text-xs text-gray-600 bg-gray-50 rounded-xl p-3"></div>
            `;

            container.appendChild(card);
        }

        container.addEventListener('click', async function(e){
            const btn = e.target.closest('button');
            if (!btn) return;
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            if (action === 'approve') {
                await setStatus(id, 'approved');
                await loadPending();
                return;
            }
            if (action === 'reject') {
                await setStatus(id, 'rejected');
                await loadPending();
                return;
            }
            if (action === 'history') {
                const histEl = document.getElementById('history-' + id);
                if (!histEl) return;
                if (!histEl.classList.contains('hidden')) { histEl.classList.add('hidden'); return; }
                histEl.innerHTML = 'Loading history...';
                histEl.classList.remove('hidden');
                const history = await loadHistory(id);
                if (!history || !history.length) { histEl.innerHTML = '<div class="text-gray-400">No history.</div>'; return; }
                histEl.innerHTML = history.map(h => `<div class="mb-2"><div class="font-medium">${escapeHtml(h.action)}</div><div class="text-xs text-gray-500">${new Date(h.created_at).toLocaleString()} • ${escapeHtml(h.actor_name||'System')}</div><pre class="bg-gray-50 p-2 rounded text-xs overflow-auto mt-1">${escapeHtml(JSON.stringify(h.diff || h.new_row || h.old_row || {}, null, 2))}</pre></div>`).join('');
                return;
            }
        });
    }

    async function loadHistory(familyRelationId) {
        const { data, error } = await supabaseClient
            .from('family_relation_history')
            .select('action, actor_id, old_row, new_row, created_at')
            .eq('family_relation_id', familyRelationId)
            .order('created_at', { ascending: false });
        if (error) { console.error('history load error', error); return []; }

        // Resolve actor names (cache)
        const actorIds = Array.from(new Set(data.map(d => d.actor_id).filter(Boolean)));
        const actorMap = {};
        if (actorIds.length) {
            const { data: actors } = await supabaseClient.from('profiles').select('id, first_name, last_name').in('id', actorIds);
            if (actors) actors.forEach(a => actorMap[a.id] = (a.first_name||'') + ' ' + (a.last_name||''));
        }

        return data.map(d => ({
            action: d.action,
            actor_id: d.actor_id,
            actor_name: actorMap[d.actor_id] || null,
            old_row: d.old_row,
            new_row: d.new_row,
            created_at: d.created_at,
            diff: d.new_row || d.old_row
        }));
    }

    async function setStatus(id, status) {
        const { data: session } = await supabaseClient.auth.getSession();
        const approver = session?.session?.user?.id || null;
        const { error } = await supabaseClient
            .from('family_relations')
            .update({ status: status, approved_by: approver, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) console.error('update status error', error);
    }

    function escapeHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    document.addEventListener('DOMContentLoaded', async function(){
        await loadPending();
    });
})();
