// js/portal/familyTree/edit.js
// Handles the "Add Relation" modal and suggestion submission.

(function () {

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function escapeHtml(s) {
        return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ─── Modal open / close ───────────────────────────────────────────────────

    function openModal() {
        const modal = document.getElementById('relationModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        populateMemberSelects();
    }

    function closeModal() {
        const modal = document.getElementById('relationModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    // ─── Populate selects ─────────────────────────────────────────────────────

    async function populateMemberSelects() {
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('is_active', true)
            .order('first_name', { ascending: true });

        const selA = document.getElementById('personASelect');
        const selB = document.getElementById('personBSelect');
        if (!selA || !selB) return;

        selA.innerHTML = '<option value="">— select —</option>';
        selB.innerHTML = '<option value="">— select —</option>';
        if (error) { console.error('[treeEdit] profiles error', error); return; }

        profiles.forEach(p => {
            const label = `${p.first_name || ''} ${p.last_name || ''}`.trim();
            const html  = `<option value="${p.id}">${escapeHtml(label)}</option>`;
            selA.insertAdjacentHTML('beforeend', html);
            selB.insertAdjacentHTML('beforeend', html);
        });
    }

    // ─── Submit suggestion ────────────────────────────────────────────────────

    async function submitSuggestion() {
        const a        = document.getElementById('personASelect').value;
        const b        = document.getElementById('personBSelect').value;
        const relation = document.getElementById('relationType').value;
        const note     = document.getElementById('relationNote').value.trim();
        const btn      = document.getElementById('submitRelation');

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

        // Build payload — fetch role once and reuse below
        let isAdmin = false;
        let payload = {
            person_a:   a,
            person_b:   b,
            relation,
            metadata:   note ? { note } : {},
            status:     'pending',
            created_by: userId,
        };

        try {
            const { data: me } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();
            if (me && me.role === 'admin') {
                isAdmin            = true;
                payload.status     = 'approved';
                payload.approved_by = userId;
            }
        } catch (_) { /* fall back to pending */ }

        // Duplicate check
        try {
            const { data: existing } = await supabaseClient
                .from('family_relations')
                .select('id, status')
                .eq('person_a', a)
                .eq('person_b', b)
                .eq('relation', relation);

            if (existing && existing.length) {
                if (existing.find(r => r.status === 'approved')) {
                    setButtonLoading(btn, false, 'Submit Suggestion');
                    closeModal();
                    alert('This relation already exists.');
                    return;
                }

                if (existing.find(r => r.status === 'pending')) {
                    if (isAdmin) {
                        const ids = existing.filter(r => r.status === 'pending').map(r => r.id);
                        const { error: updErr } = await supabaseClient
                            .from('family_relations')
                            .update({ status: 'approved', approved_by: userId, updated_at: new Date().toISOString() })
                            .in('id', ids);
                        if (updErr) console.error('[treeEdit] approve existing error', updErr);
                        setButtonLoading(btn, false, 'Submit Suggestion');
                        closeModal();
                        if (window.loadFamilyTree) window.loadFamilyTree();
                        alert('Existing suggestion approved.');
                    } else {
                        setButtonLoading(btn, false, 'Submit Suggestion');
                        alert('A similar suggestion is already pending admin approval.');
                    }
                    return;
                }
            }
        } catch (err) {
            console.error('[treeEdit] duplicate check error', err);
        }

        // Insert
        const { error } = await supabaseClient.from('family_relations').insert(payload);
        if (error) {
            console.error('[treeEdit] insert error', error);
            alert('Failed to submit suggestion.');
            setButtonLoading(btn, false, 'Submit Suggestion');
            return;
        }

        setButtonLoading(btn, false, 'Submit Suggestion');
        closeModal();
        if (payload.status === 'approved') {
            if (window.loadFamilyTree) window.loadFamilyTree();
            alert('Relation added.');
        } else {
            alert('Suggestion submitted — awaits admin approval.');
        }
    }

    // ─── Bootstrap ────────────────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', function () {
        const addBtn  = document.getElementById('addRelationBtn');
        const cancel  = document.getElementById('cancelRelation');
        const submit  = document.getElementById('submitRelation');
        const modal   = document.getElementById('relationModal');

        if (addBtn)  addBtn.addEventListener('click', openModal);
        if (cancel)  cancel.addEventListener('click', closeModal);
        if (submit)  submit.addEventListener('click', submitSuggestion);
        if (modal)   modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    });

})();
