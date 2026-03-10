// js/portal/familyTree/edit.js
// Handles the "Add Relation" modal — member/non-member toggle, photo upload, submission.

(function () {

    // ─── State ────────────────────────────────────────────────────────────────

    const personMode = { a: 'member', b: 'member' };

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function escapeHtml(s) {
        return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function el(id) { return document.getElementById(id); }

    // ─── Toggle ───────────────────────────────────────────────────────────────

    function setPersonMode(person, mode) {
        personMode[person] = mode;
        const P = person.toUpperCase();

        const btnMember    = el(`person${P}ToggleMember`);
        const btnNonMember = el(`person${P}ToggleNonMember`);
        const memberSec    = el(`person${P}MemberSection`);
        const nonMemberSec = el(`person${P}NonMemberSection`);

        const activeClasses   = ['bg-brand-600', 'text-white'];
        const inactiveClasses = ['text-gray-500', 'hover:bg-gray-50'];

        if (mode === 'member') {
            btnMember.classList.add(...activeClasses);
            btnMember.classList.remove(...inactiveClasses);
            btnNonMember.classList.remove(...activeClasses);
            btnNonMember.classList.add(...inactiveClasses);
            memberSec.classList.remove('hidden');
            nonMemberSec.classList.add('hidden');
        } else {
            btnNonMember.classList.add(...activeClasses);
            btnNonMember.classList.remove(...inactiveClasses);
            btnMember.classList.remove(...activeClasses);
            btnMember.classList.add(...inactiveClasses);
            memberSec.classList.add('hidden');
            nonMemberSec.classList.remove('hidden');
        }
    }

    // ─── Admin mode ───────────────────────────────────────────────────────────

    let _isAdmin = false;

    function setAdminMode(val) {
        _isAdmin = val;
        const title = el('relationModalTitle');
        const btn   = el('submitRelation');
        if (title) title.textContent = val ? 'Add Relation'  : 'Suggest a Relation';
        if (btn)   btn.textContent   = val ? 'Add Relation'  : 'Submit Suggestion';
    }

    // ─── Modal open / close ───────────────────────────────────────────────────

    function openModal() {
        const modal = el('relationModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Reset to member mode for both sides
        setPersonMode('a', 'member');
        setPersonMode('b', 'member');

        // Clear non-member inputs
        ['personAName', 'personBName'].forEach(id => { const e = el(id); if (e) e.value = ''; });
        ['personAPhoto', 'personBPhoto'].forEach(id => { const e = el(id); if (e) e.value = ''; });
        ['personABirth', 'personADeath', 'personBBirth', 'personBDeath'].forEach(id => { const e = el(id); if (e) e.value = ''; });

        populateMemberSelects();
    }

    function closeModal() {
        const modal = el('relationModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    // ─── Populate member selects ──────────────────────────────────────────────

    async function populateMemberSelects() {
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('is_active', true)
            .order('first_name', { ascending: true });

        const selA = el('personASelect');
        const selB = el('personBSelect');
        if (!selA || !selB) return;

        selA.innerHTML = '<option value="">— select member —</option>';
        selB.innerHTML = '<option value="">— select member —</option>';
        if (error) { console.error('[treeEdit] profiles error', error); return; }

        profiles.forEach(p => {
            const label = `${p.first_name || ''} ${p.last_name || ''}`.trim();
            const html  = `<option value="${p.id}">${escapeHtml(label)}</option>`;
            selA.insertAdjacentHTML('beforeend', html);
            selB.insertAdjacentHTML('beforeend', html);
        });
    }

    // ─── Upload photo for non-member ──────────────────────────────────────────

    async function uploadTreePersonPhoto(fileInput) {
        const file = fileInput?.files?.[0];
        if (!file) return null;

        const ext  = file.name.split('.').pop();
        const path = `public/${crypto.randomUUID()}.${ext}`;

        const { data, error } = await supabaseClient.storage
            .from('tree-people')
            .upload(path, file, { cacheControl: '3600', upsert: false });

        if (error) { console.error('[treeEdit] photo upload error', error); return null; }

        const { data: urlData } = supabaseClient.storage.from('tree-people').getPublicUrl(data.path);
        return urlData?.publicUrl || null;
    }

    // ─── Resolve a person (member select OR create non-member row) ───────────

    async function resolvePerson(person) {
        const P    = person.toUpperCase();
        const mode = personMode[person];

        if (mode === 'member') {
            const id = el(`person${P}Select`)?.value;
            if (!id) throw new Error(`Please select a member for Person ${P}.`);
            return { id, type: 'member' };
        }

        // Non-member: validate + insert
        const displayName = el(`person${P}Name`)?.value.trim();
        if (!displayName) throw new Error(`Please enter a name for Person ${P}.`);

        const photoUrl  = await uploadTreePersonPhoto(el(`person${P}Photo`));
        const birthYear = parseInt(el(`person${P}Birth`)?.value, 10) || null;
        const deathYear = parseInt(el(`person${P}Death`)?.value, 10) || null;

        const payload = { display_name: displayName };
        if (photoUrl)  payload.photo_url  = photoUrl;
        if (birthYear) payload.birth_year = birthYear;
        if (deathYear) payload.death_year = deathYear;

        const { data, error } = await supabaseClient
            .from('family_tree_people')
            .insert(payload)
            .select('id')
            .single();

        if (error || !data?.id) {
            console.error('[treeEdit] tree_person insert error', error);
            throw new Error(`Failed to create non-member entry for Person ${P}.`);
        }

        return { id: data.id, type: 'tree_person' };
    }

    // ─── Submit suggestion ────────────────────────────────────────────────────

    async function submitSuggestion() {
        const relation = el('relationType')?.value;
        const note     = el('relationNote')?.value.trim();
        const btn      = el('submitRelation');

        if (!relation) {
            alert('Please choose a relationship type.');
            return;
        }

        setButtonLoading(btn, true, 'Submit Suggestion');

        try {
            // Resolve both sides (may insert non-member rows)
            let personA, personB;
            try {
                [personA, personB] = await Promise.all([resolvePerson('a'), resolvePerson('b')]);
            } catch (err) {
                alert(err.message);
                return;
            }

            if (personA.id === personB.id) {
                alert('Person A and Person B cannot be the same.');
                return;
            }

            const { data: session } = await supabaseClient.auth.getSession();
            const userId = session?.session?.user?.id;
            if (!userId) { alert('You must be signed in.'); return; }

            let isAdmin = false;
            try {
                const { data: me } = await supabaseClient
                    .from('profiles').select('role').eq('id', userId).single();
                if (me?.role === 'admin') isAdmin = true;
            } catch (_) { /* pending */ }

            const payload = {
                person_a:      personA.id,
                person_b:      personB.id,
                person_a_type: personA.type,
                person_b_type: personB.type,
                relation,
                metadata:      note ? { note } : {},
                status:        isAdmin ? 'approved' : 'pending',
                created_by:    userId,
            };
            if (isAdmin) payload.approved_by = userId;

            // Duplicate check
            try {
                const { data: existing } = await supabaseClient
                    .from('family_relations')
                    .select('id, status')
                    .eq('person_a', personA.id)
                    .eq('person_b', personB.id)
                    .eq('relation', relation);

                if (existing?.length) {
                    if (existing.find(r => r.status === 'approved')) {
                        closeModal();
                        alert('This relation already exists.');
                        return;
                    }
                    if (existing.find(r => r.status === 'pending')) {
                        if (isAdmin) {
                            const ids = existing.filter(r => r.status === 'pending').map(r => r.id);
                            await supabaseClient
                                .from('family_relations')
                                .update({ status: 'approved', approved_by: userId, updated_at: new Date().toISOString() })
                                .in('id', ids);
                            closeModal();
                            if (window.loadFamilyTree) window.loadFamilyTree();
                            alert('Existing suggestion approved.');
                        } else {
                            alert('A similar suggestion is already pending admin approval.');
                        }
                        return;
                    }
                }
            } catch (err) { console.error('[treeEdit] duplicate check error', err); }

            // Insert relation
            const { error } = await supabaseClient.from('family_relations').insert(payload);
            if (error) {
                console.error('[treeEdit] insert error', error);
                alert('Failed to submit suggestion.');
                return;
            }

            closeModal();
            if (payload.status === 'approved') {
                if (window.loadFamilyTree) window.loadFamilyTree();
                alert('Relation added.');
            } else {
                alert('Suggestion submitted — awaits admin approval.');
            }

        } finally {
            setButtonLoading(btn, false, 'Submit Suggestion');
        }
    }

    // ─── Edit existing relation (admin) ──────────────────────────────────────

    let _editEdgeId = null;

    function openEditEdge(edge) {
        _editEdgeId = edge.id;
        const labelEl = el('editRelationLabel');
        if (labelEl) labelEl.textContent = `${edge.sourceLabel} \u2192 ${edge.targetLabel}`;
        // Pre-select current relation type by clicking its pill
        const pill = document.querySelector(`.edit-rel-pill[data-value="${edge.relation}"]`);
        if (pill) pill.click();
        const modal = el('editRelationModal');
        if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    }

    function closeEditModal() {
        const modal = el('editRelationModal');
        if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
        _editEdgeId = null;
    }

    async function saveEditRelation() {
        if (!_editEdgeId) return;
        const relation = el('editRelationType')?.value;
        const btn      = el('saveEditRelation');
        setButtonLoading(btn, true, 'Save');
        const { error } = await supabaseClient
            .from('family_relations')
            .update({ relation, updated_at: new Date().toISOString() })
            .eq('id', _editEdgeId);
        setButtonLoading(btn, false, 'Save');
        if (error) { console.error('[treeEdit] save edit error', error); alert('Failed to save.'); return; }
        closeEditModal();
        if (window.loadFamilyTree) window.loadFamilyTree();
    }

    async function deleteEditRelation() {
        if (!_editEdgeId) return;
        if (!confirm('Delete this connection permanently?')) return;
        const btn = el('deleteEditRelation');
        setButtonLoading(btn, true, 'Delete');
        const { error } = await supabaseClient
            .from('family_relations')
            .delete()
            .eq('id', _editEdgeId);
        setButtonLoading(btn, false, 'Delete');
        if (error) { console.error('[treeEdit] delete error', error); alert('Failed to delete.'); return; }
        closeEditModal();
        if (window.loadFamilyTree) window.loadFamilyTree();
    }

    // ─── Bootstrap ────────────────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', function () {
        const addBtn      = el('addRelationBtn');
        const addBtnMob   = el('addRelationBtnMobile');
        const cancel = el('cancelRelation');
        const submit = el('submitRelation');
        const modal  = el('relationModal');

        if (addBtn)    addBtn.addEventListener('click', openModal);
        if (addBtnMob) addBtnMob.addEventListener('click', openModal);
        if (cancel) cancel.addEventListener('click', closeModal);
        if (submit) submit.addEventListener('click', submitSuggestion);
        if (modal)  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

        // Person mode toggle buttons
        ['a', 'b'].forEach(person => {
            const P = person.toUpperCase();
            el(`person${P}ToggleMember`)?.addEventListener('click',    () => setPersonMode(person, 'member'));
            el(`person${P}ToggleNonMember`)?.addEventListener('click', () => setPersonMode(person, 'non-member'));
        });

        // Edit modal wiring
        el('cancelEditRelation')?.addEventListener('click',  closeEditModal);
        el('saveEditRelation')?.addEventListener('click',    saveEditRelation);
        el('deleteEditRelation')?.addEventListener('click',  deleteEditRelation);
        el('editRelationModal')?.addEventListener('click', e => { if (e.target === el('editRelationModal')) closeEditModal(); });
    });

    // Expose edit API for viz.js edge tap
    window.FamilyTreeEdit = { openEditEdge, setAdminMode };

})();
