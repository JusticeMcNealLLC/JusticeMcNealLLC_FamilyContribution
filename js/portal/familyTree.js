// familyTree.js — reads approved relations and renders the tree (read-only)
(async function(){
    async function loadFamily() {
        // load active profiles
        const { data: profiles, error: pErr } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name, title, profile_picture_url, is_active')
            .eq('is_active', true);

        if (pErr) { console.error('profiles error', pErr); return; }

        // load approved relations
        const { data: relations, error: rErr } = await supabaseClient
            .from('family_relations')
            .select('*')
            .eq('status', 'approved');

        if (rErr) { console.error('relations error', rErr); return; }

        // Build nodes map
        const nodes = {};
        profiles.forEach(p => {
            nodes[p.id] = { data: { id: p.id, label: (p.first_name||'') + ' ' + (p.last_name||'').split(' ')[0] } };
        });

        // Build edges
        const edges = relations.map((r) => ({ data: { id: r.id, source: r.person_a, target: r.person_b, relation: r.relation } }));

        // Ensure nodes exist for any referenced profile
        relations.forEach(r => {
            if (!nodes[r.person_a]) nodes[r.person_a] = { data: { id: r.person_a, label: r.person_a } };
            if (!nodes[r.person_b]) nodes[r.person_b] = { data: { id: r.person_b, label: r.person_b } };
        });

        const elements = Object.values(nodes).concat(edges);

        // render list of members
        const listEl = document.getElementById('memberList');
        listEl.innerHTML = '';
        profiles.forEach(p => {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 p-2 rounded hover:bg-surface-50 cursor-pointer';
            div.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-sm text-gray-600">${(p.first_name||'').charAt(0)}</div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900">${escapeHtml((p.first_name||'') + ' ' + (p.last_name||''))}</div>
                    <div class="text-xs text-gray-500">${escapeHtml(p.title||'')}</div>
                </div>
                <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            `;
            div.addEventListener('click', () => window.location.href = `profile.html?id=${p.id}`);
            listEl.appendChild(div);
        });

        // init viz
        if (window.TreeViz) TreeViz.init('#cy', elements);
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
})();
