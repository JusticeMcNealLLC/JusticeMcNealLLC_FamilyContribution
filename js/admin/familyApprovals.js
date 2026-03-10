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
        container.innerHTML = '';

        for (const r of pending) {
            // fetch profiles for display
            const { data: a } = await supabaseClient.from('profiles').select('id, first_name, last_name, title').eq('id', r.person_a).limit(1).single();
            const { data: b } = await supabaseClient.from('profiles').select('id, first_name, last_name, title').eq('id', r.person_b).limit(1).single();

            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg border p-3 flex items-start justify-between gap-3';
            card.innerHTML = `
                <div>
                    <div class="text-sm font-medium">${escapeHtml((a.first_name||'')+' '+(a.last_name||''))} → ${escapeHtml((b.first_name||'')+' '+(b.last_name||''))}</div>
                    <div class="text-xs text-gray-500">Relation: ${escapeHtml(r.relation)} • Suggested: ${new Date(r.created_at).toLocaleString()}</div>
                </div>
                <div class="flex items-center gap-2">
                    <button data-id="${r.id}" data-action="approve" class="px-3 py-1 bg-emerald-600 text-white rounded">Approve</button>
                    <button data-id="${r.id}" data-action="reject" class="px-3 py-1 bg-red-100 text-red-700 rounded">Reject</button>
                </div>
            `;

            container.appendChild(card);
        }

        container.addEventListener('click', async function(e){
            const btn = e.target.closest('button');
            if (!btn) return;
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            if (action === 'approve') await setStatus(id, 'approved');
            if (action === 'reject') await setStatus(id, 'rejected');
            await loadPending();
        });
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
