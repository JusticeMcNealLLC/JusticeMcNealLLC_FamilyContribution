// Portal Events — Manage docs tab (Phase 5M.3B)

'use strict';

function api() {
    return window.EventsManageDocsApi || {};
}

function esc(s) {
    const el = document.createElement('span');
    el.textContent = s == null ? '' : String(s);
    return el.innerHTML;
}
function money(cents) {
    return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
}

// ═══════════════════════════════════════════════════════════════
// M3b — DOCS TAB
// ═══════════════════════════════════════════════════════════════
async function loadDocs() {
    const STATE = api().getState?.() || {};
    const { data, error } = await supabaseClient
        .from('event_documents')
        .select('id, doc_type, label, file_name, file_size_bytes, file_path, distributed, target_user_id, created_at, profiles:target_user_id(first_name, last_name, profile_picture_url)')
        .eq('event_id', STATE.eventId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return { docs: data || [] };
}

function docTypeIcon(type) {
    const STATE = api().getState?.() || {};
    return ({
        plane_ticket: '✈️', group_ticket: '🎫', itinerary: '🗺️',
        receipt: '🧾', other: '📄',
    })[type] || '📄';
}

function formatBytes(bytes) {
    const STATE = api().getState?.() || {};
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function docsHtml() {
    const STATE = api().getState?.() || {};
    const docs = STATE.tabData.docs.docs;
    const groupDocs = docs.filter(d => !d.target_user_id);
    const memberDocs = docs.filter(d => d.target_user_id);
    const goingMembers = STATE.rsvps
        .filter(r => r.status === 'going')
        .map(r => {
            const profile = r.profiles || {};
            return {
                id: r.user_id,
                name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Member',
            };
        });

    const distributedCount = docs.filter(d => d.distributed).length;
    const pendingCount = docs.length - distributedCount;
    const distributedPct = docs.length ? Math.round((distributedCount / docs.length) * 100) : 0;
    const totalBytes = docs.reduce((sum, d) => sum + (d.file_size_bytes || 0), 0);

    function docRow(d) {
        const distBtn = d.distributed
            ? `<button class="em-pill em-pill-checked" data-doc-action="undistribute" data-id="${d.id}" style="border:none;cursor:pointer">Distributed ✓</button>`
            : `<button class="em-pill em-pill-paid" data-doc-action="distribute" data-id="${d.id}" style="border:none;cursor:pointer">Mark sent</button>`;
        return `
            <div class="em-attendee-card">
                <div class="em-avatar" style="background:#fef3c7;color:#92400e;font-size:16px">${docTypeIcon(d.doc_type)}</div>
                <div class="em-attendee-main">
                    <p class="em-attendee-name">${esc(d.label || d.file_name || 'Document')}</p>
                    <p class="em-attendee-sub">${esc(d.file_name || '')} · ${formatBytes(d.file_size_bytes)}</p>
                    <div class="flex flex-wrap gap-1 mt-2">${distBtn}<span class="em-pill em-pill-going">${d.target_user_id ? 'Member file' : 'Group file'}</span></div>
                </div>
                <button data-doc-action="delete" data-id="${d.id}" class="text-xs text-red-600 font-semibold hover:underline" style="background:none;border:none;cursor:pointer">Delete</button>
            </div>
        `;
    }

    function memberSection(memberDoc) {
        // Group per-member docs by user
        const byUser = {};
        memberDoc.forEach(d => {
            const uid = d.target_user_id;
            (byUser[uid] = byUser[uid] || { user: d.profiles, docs: [] }).docs.push(d);
        });
        const userList = Object.values(byUser);
        if (!userList.length) return `<p class="text-xs text-gray-400 italic py-2">No per-member documents yet.</p>`;
        return userList.map(u => {
            const p = u.user || {};
            const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
            return `
                <div style="margin-bottom:14px">
                    <div class="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">${esc(name)} <span class="text-gray-400 font-normal">· ${u.docs.length}</span></div>
                    ${u.docs.map(docRow).join('')}
                </div>
            `;
        }).join('');
    }

    const memberOptions = goingMembers.map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');
    const typeOptions = (api().getDocTypes?.() || []).map(t => `<option value="${esc(t.value)}">${esc(t.label)}</option>`).join('');

    return `
        <div class="em-card em-command-card mb-4">
            <p class="em-command-eyebrow">Document handoff</p>
            <h3 class="em-command-title">${pendingCount ? `${pendingCount} document${pendingCount === 1 ? '' : 's'} pending` : 'Documents are caught up'}</h3>
            <p class="em-command-copy">Upload group files or member-specific travel docs here. Attendees only see a retrieval button on the event page.</p>
            <div class="em-op-progress" style="margin-top:14px;background:rgba(255,255,255,.22)"><span style="width:${distributedPct}%;background:#a7f3d0"></span></div>
        </div>

        <div class="em-metric-grid mb-4">
            <div class="em-metric"><span>Total files</span><strong>${docs.length}</strong><small>${formatBytes(totalBytes)}</small></div>
            <div class="em-metric"><span>Distributed</span><strong>${distributedCount}</strong><small>${distributedPct}% complete</small></div>
            <div class="em-metric"><span>Pending</span><strong>${pendingCount}</strong><small>Need handoff</small></div>
            <div class="em-metric"><span>Member files</span><strong>${memberDocs.length}</strong><small>${groupDocs.length} group</small></div>
        </div>

        <div class="em-card mb-4">
            <div class="em-section-head"><div><h3 class="em-section-title">Upload document</h3><p class="em-section-sub">Choose who can retrieve this file from the attendee-facing document viewer.</p></div></div>
            <div class="grid sm:grid-cols-2 gap-3">
                <label class="text-xs font-bold uppercase tracking-wide text-gray-500">Visible to
                    <select id="emDocTargetMode" class="em-input mt-1">
                        <option value="group">Everyone RSVP'd</option>
                        <option value="member">Specific member</option>
                    </select>
                </label>
                <label id="emDocMemberWrap" class="text-xs font-bold uppercase tracking-wide text-gray-500 hidden">Member
                    <select id="emDocMember" class="em-input mt-1">
                        ${memberOptions || '<option value="">No RSVP\'d members yet</option>'}
                    </select>
                </label>
                <label class="text-xs font-bold uppercase tracking-wide text-gray-500">Label
                    <input id="emDocLabel" type="text" class="em-input mt-1" placeholder="Flight ticket, itinerary, receipt">
                </label>
                <label class="text-xs font-bold uppercase tracking-wide text-gray-500">Type
                    <select id="emDocType" class="em-input mt-1">${typeOptions}</select>
                </label>
                <label class="text-xs font-bold uppercase tracking-wide text-gray-500 sm:col-span-2">File
                    <input id="emDocFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" class="em-input mt-1">
                </label>
            </div>
            <div class="flex items-center justify-between gap-3 mt-3">
                <p class="text-xs text-gray-400">Uploads live here in Manage Event. Members only see a document viewer button on the event page.</p>
                <button id="emDocUploadBtn" class="em-btn-primary">Upload</button>
            </div>
        </div>

        <div class="em-card mb-3">
            <div class="em-section-head"><div><h3 class="em-section-title">Group documents <span class="text-gray-400 font-normal">· ${groupDocs.length}</span></h3><p class="em-section-sub">Visible to everyone with RSVP access.</p></div></div>
            ${groupDocs.length ? groupDocs.map(docRow).join('') : `<p class="text-xs text-gray-400 italic py-2">No group documents yet.</p>`}
        </div>

        <div class="em-card">
            <div class="em-section-head"><div><h3 class="em-section-title">Per-member documents <span class="text-gray-400 font-normal">· ${memberDocs.length}</span></h3><p class="em-section-sub">Private files for individual attendees, like tickets or receipts.</p></div></div>
            ${memberSection(memberDocs)}
        </div>
    `;
}

function wireDocs() {
    const STATE = api().getState?.() || {};
    const targetMode = document.getElementById('emDocTargetMode');
    const memberWrap = document.getElementById('emDocMemberWrap');
    const type = document.getElementById('emDocType');
    if (type) type.value = 'itinerary';
    targetMode?.addEventListener('change', () => {
        memberWrap?.classList.toggle('hidden', targetMode.value !== 'member');
        if (type) type.value = targetMode.value === 'member' ? 'plane_ticket' : 'itinerary';
    });
    document.getElementById('emDocUploadBtn')?.addEventListener('click', uploadDocFromManage);

    document.getElementById('emSheetContent').querySelectorAll('[data-doc-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const action = btn.dataset.docAction;
            const id = btn.dataset.id;
            if (action === 'delete') {
                if (!confirm('Delete this document? This cannot be undone.')) return;
                const doc = STATE.tabData.docs.docs.find(d => d.id === id);
                if (doc?.file_path) await supabaseClient.storage.from('event-documents').remove([doc.file_path]);
                const { error } = await supabaseClient.from('event_documents').delete().eq('id', id);
                if (error) return alert('Delete failed: ' + error.message);
            } else {
                const { error } = await supabaseClient
                    .from('event_documents')
                    .update({ distributed: action === 'distribute' })
                    .eq('id', id);
                if (error) return alert('Update failed: ' + error.message);
            }
            STATE.tabData.docs = null;
            api().renderTab?.('docs');
            api().notifyParent?.('updated', STATE.eventId);
        });
    });
}

async function uploadDocFromManage() {
    const STATE = api().getState?.() || {};
    const btn = document.getElementById('emDocUploadBtn');
    const mode = document.getElementById('emDocTargetMode')?.value || 'group';
    const targetUserId = mode === 'member' ? (document.getElementById('emDocMember')?.value || '') : '';
    const label = (document.getElementById('emDocLabel')?.value || '').trim();
    const docType = document.getElementById('emDocType')?.value || 'other';
    const file = document.getElementById('emDocFile')?.files?.[0];

    if (mode === 'member' && !targetUserId) return alert('Choose a member for this document.');
    if (!label) return alert('Add a document label.');
    if (!file) return alert('Choose a file to upload.');

    btn.disabled = true;
    btn.textContent = 'Uploading...';
    try {
        const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
        const storagePath = `${STATE.eventId}/${targetUserId || 'group'}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error: uploadErr } = await supabaseClient.storage
            .from('event-documents')
            .upload(storagePath, file, { contentType: file.type || 'application/octet-stream' });
        if (uploadErr) throw uploadErr;

        const { error: dbErr } = await supabaseClient
            .from('event_documents')
            .insert({
                event_id: STATE.eventId,
                uploaded_by: globalThis.evtCurrentUser.id,
                target_user_id: targetUserId || null,
                doc_type: docType,
                label,
                file_path: storagePath,
                file_name: file.name,
                file_size_bytes: file.size,
                mime_type: file.type,
            });
        if (dbErr) throw dbErr;

        STATE.tabData.docs = null;
        api().renderTab?.('docs');
        api().notifyParent?.('updated', STATE.eventId);
    } catch (err) {
        alert('Upload failed: ' + (err.message || err));
    } finally {
        btn.disabled = false;
        btn.textContent = 'Upload';
    }
}

export const manageDocsApi = {
    loadDocs,
    docsHtml,
    wireDocs,
    uploadDocFromManage
};

globalThis.EventsManageDocs = manageDocsApi;
