// treeEdit.js — handles the 'Add Relation' modal and suggestion submission
(function(){
    async function openModal() {
        const modal = document.getElementById('relationModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        await populateMemberSelects();
    }

    function closeModal() {
        const modal = document.getElementById('relationModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    async function populateMemberSelects() {
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('is_active', true)
            .order('first_name', { ascending: true });

        const a = document.getElementById('personASelect');
        const b = document.getElementById('personBSelect');
        if (!a || !b) return;
        a.innerHTML = '<option value="">— select —</option>';
        b.innerHTML = '<option value="">— select —</option>';
        if (error) { console.error('profiles error', error); return; }
        profiles.forEach(p => {
            const label = `${p.first_name || ''} ${p.last_name || ''}`.trim();
            const opt = `<option value="${p.id}">${escapeHtml(label)}</option>`;
            a.insertAdjacentHTML('beforeend', opt);
            b.insertAdjacentHTML('beforeend', opt);
        });
    }

    async function submitSuggestion() {
        const a = document.getElementById('personASelect').value;
        const b = document.getElementById('personBSelect').value;
        const relation = document.getElementById('relationType').value;
        const note = document.getElementById('relationNote').value.trim();
        const btn = document.getElementById('submitRelation');

        if (!a || !b || !relation) {
            alert('Please select both people and a relation.');
            return;
        }

        if (a === b) {
            alert('Person A and Person B cannot be the same.');
            return;
        }

        setButtonLoading(btn, true, 'Submit Suggestion');

        const { data: session } = await supabaseClient.auth.getSession();
        const userId = session?.session?.user?.id;
        if (!userId) {
            alert('You must be signed in to submit suggestions.');
            setButtonLoading(btn, false, 'Submit Suggestion');
            return;
        }

        const payload = {
            person_a: a,
            person_b: b,
            relation: relation,
            metadata: note ? { note } : {},
            status: 'pending',
            created_by: userId
        };

        const { error } = await supabaseClient
            .from('family_relations')
            .insert(payload);

        if (error) {
            console.error('insert error', error);
            alert('Failed to submit suggestion.');
            setButtonLoading(btn, false, 'Submit Suggestion');
            return;
        }

        setButtonLoading(btn, false, 'Submit Suggestion');
        closeModal();
        alert('Relation suggestion submitted — awaits admin approval.');
    }

    function escapeHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    document.addEventListener('DOMContentLoaded', function(){
        const addBtn = document.getElementById('addRelationBtn');
        const cancel = document.getElementById('cancelRelation');
        const submit = document.getElementById('submitRelation');
        const modal = document.getElementById('relationModal');

        if (addBtn) addBtn.addEventListener('click', openModal);
        if (cancel) cancel.addEventListener('click', closeModal);
        if (submit) submit.addEventListener('click', submitSuggestion);

        // close on backdrop click
        if (modal) modal.addEventListener('click', function(e){ if (e.target === modal) closeModal(); });
    });
})();
