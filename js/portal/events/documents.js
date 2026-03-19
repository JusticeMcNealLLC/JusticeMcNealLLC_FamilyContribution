// ═══════════════════════════════════════════════════════════
// Portal Events — Documents (Upload & Download)
// Host: upload per-member & group docs
// Member: view & download their assigned + group docs
// ═══════════════════════════════════════════════════════════

const DOC_TYPES = [
    { value: 'plane_ticket', label: '✈️ Plane Ticket', perMember: true },
    { value: 'group_ticket', label: '🎫 Group Ticket / Pass', perMember: false },
    { value: 'itinerary', label: '📋 Itinerary', perMember: false },
    { value: 'receipt', label: '🧾 Receipt', perMember: false },
    { value: 'other', label: '📎 Other', perMember: false },
];

// ─── Build Documents Section HTML ──────────────────────

async function evtBuildDocumentsHtml(event, isHost, hasRsvp) {
    const eventId = event.id;
    const isLlc = event.event_type === 'llc';
    if (!isLlc) return '';

    // Load existing documents
    const { data: docs } = await supabaseClient
        .from('event_documents')
        .select('*, profiles:target_user_id(first_name, last_name)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

    const allDocs = docs || [];
    const groupDocs = allDocs.filter(d => !d.target_user_id);
    const myDocs = allDocs.filter(d => d.target_user_id === evtCurrentUser.id);

    // ── Host View: Full document management ──
    if (isHost) {
        // Load RSVPed members for per-member uploads
        const { data: rsvps } = await supabaseClient
            .from('event_rsvps')
            .select('user_id, profiles!event_rsvps_user_id_fkey(first_name, last_name)')
            .eq('event_id', eventId)
            .eq('status', 'going');

        const goingMembers = (rsvps || []).map(r => ({
            id: r.user_id,
            name: `${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''}`.trim() || 'Unknown'
        }));

        // Per-member docs table
        const perMemberRows = goingMembers.map(m => {
            const memberDocs = allDocs.filter(d => d.target_user_id === m.id);
            const docsHtml = memberDocs.length
                ? memberDocs.map(d => `
                    <div class="flex items-center gap-2 text-xs bg-white rounded-lg px-2 py-1 border border-gray-100">
                        <span>${evtDocTypeIcon(d.doc_type)}</span>
                        <span class="truncate max-w-[120px]">${evtEscapeHtml(d.file_name)}</span>
                        ${d.distributed ? '<span class="text-emerald-600 font-bold">✓</span>' : `<button onclick="evtMarkDistributed('${d.id}','${eventId}')" class="text-blue-500 hover:text-blue-700 text-xs font-semibold">Mark Sent</button>`}
                        <button onclick="evtDeleteDocument('${d.id}','${eventId}')" class="text-red-400 hover:text-red-600 ml-auto">✕</button>
                    </div>`).join('')
                : '<span class="text-xs text-gray-400 italic">No docs</span>';

            return `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                    <div class="flex items-center gap-2 min-w-0">
                        <div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold shrink-0">${(m.name[0] || '?').toUpperCase()}</div>
                        <span class="text-sm font-medium text-gray-700 truncate">${evtEscapeHtml(m.name)}</span>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">${docsHtml}
                        <button onclick="evtShowUploadForm('${eventId}','${m.id}','${evtEscapeHtml(m.name)}')" class="text-xs text-brand-600 hover:text-brand-700 font-semibold whitespace-nowrap">+ Upload</button>
                    </div>
                </div>`;
        }).join('');

        // Group docs list
        const groupDocsHtml = groupDocs.length
            ? groupDocs.map(d => `
                <div class="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                    <span class="text-base">${evtDocTypeIcon(d.doc_type)}</span>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-700 truncate">${evtEscapeHtml(d.label)}</p>
                        <p class="text-xs text-gray-400">${evtEscapeHtml(d.file_name)}</p>
                    </div>
                    ${d.distributed ? '<span class="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Sent</span>' : `<button onclick="evtMarkDistributed('${d.id}','${eventId}')" class="text-xs text-blue-500 hover:text-blue-700 font-semibold">Mark Sent</button>`}
                    <button onclick="evtDeleteDocument('${d.id}','${eventId}')" class="text-red-400 hover:text-red-600 text-sm">✕</button>
                </div>`).join('')
            : '<p class="text-xs text-gray-400 italic py-2">No group documents yet</p>';

        return `
            <div class="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <div class="flex items-center gap-2 mb-3">
                    <span class="text-lg">📄</span>
                    <h4 class="text-sm font-bold text-gray-800">Event Documents</h4>
                    <span class="ml-auto text-xs text-gray-500">${allDocs.length} total</span>
                </div>

                <!-- Group Documents -->
                <div class="mb-4">
                    <div class="flex items-center justify-between mb-2">
                        <h5 class="text-xs font-bold text-gray-600 uppercase tracking-wide">Group Documents</h5>
                        <button onclick="evtShowUploadForm('${eventId}',null,'Group')" class="text-xs text-brand-600 hover:text-brand-700 font-semibold">+ Upload Group Doc</button>
                    </div>
                    ${groupDocsHtml}
                </div>

                <!-- Per-Member Documents -->
                <div>
                    <h5 class="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Per-Member Documents</h5>
                    ${goingMembers.length ? perMemberRows : '<p class="text-xs text-gray-400 italic">No RSVPed members yet</p>'}
                </div>

                <!-- Upload Form (hidden, shown dynamically) -->
                <div id="docUploadForm" class="hidden mt-4 p-3 bg-white border border-gray-200 rounded-xl space-y-3">
                    <div class="flex items-center justify-between">
                        <h5 class="text-sm font-bold text-gray-700">Upload Document</h5>
                        <button onclick="document.getElementById('docUploadForm').classList.add('hidden')" class="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    <p class="text-xs text-gray-500" id="docUploadTarget"></p>
                    <input type="hidden" id="docTargetUserId" value="">
                    <input type="hidden" id="docEventId" value="${eventId}">
                    <input type="text" id="docLabel" placeholder="Document label (e.g. Flight DFW→MIA)" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <select id="docType" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                        ${DOC_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
                    </select>
                    <input type="file" id="docFileInput" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" class="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100">
                    <button onclick="evtUploadDocument()" id="docUploadBtn" class="w-full bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition">Upload</button>
                </div>
            </div>`;
    }

    // ── Member View: Download their docs ──
    if (!hasRsvp) return '';

    const visibleDocs = [...myDocs, ...groupDocs];
    if (visibleDocs.length === 0) return '';

    const docsListHtml = visibleDocs.map(d => {
        const isPersonal = !!d.target_user_id;
        return `
            <div class="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                <span class="text-xl">${evtDocTypeIcon(d.doc_type)}</span>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-700 truncate">${evtEscapeHtml(d.label)}</p>
                    <p class="text-xs text-gray-400">${isPersonal ? '🔒 Personal' : '👥 Group'} • ${evtEscapeHtml(d.file_name)}</p>
                </div>
                <button onclick="evtDownloadDocument('${d.id}','${d.file_path}','${evtEscapeHtml(d.file_name)}')" class="bg-brand-50 text-brand-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-brand-100 transition flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    Download
                </button>
            </div>`;
    }).join('');

    return `
        <div class="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
            <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">📄</span>
                <h4 class="text-sm font-bold text-gray-800">Your Documents</h4>
                <span class="ml-auto text-xs text-gray-500">${visibleDocs.length} file${visibleDocs.length !== 1 ? 's' : ''}</span>
            </div>
            ${docsListHtml}
        </div>`;
}

// ─── Helper: Doc Type Icon ──────────────────────────────

function evtDocTypeIcon(type) {
    const icons = { plane_ticket: '✈️', group_ticket: '🎫', itinerary: '📋', receipt: '🧾', other: '📎' };
    return icons[type] || '📎';
}

// ─── Show Upload Form (positioned for target) ──────────

function evtShowUploadForm(eventId, targetUserId, targetName) {
    const form = document.getElementById('docUploadForm');
    if (!form) return;
    form.classList.remove('hidden');
    document.getElementById('docTargetUserId').value = targetUserId || '';
    document.getElementById('docEventId').value = eventId;
    document.getElementById('docUploadTarget').textContent = targetUserId
        ? `Uploading for: ${targetName}`
        : 'Uploading group document (visible to all RSVPed members)';

    // Default doc type based on target
    const typeSelect = document.getElementById('docType');
    if (targetUserId) {
        typeSelect.value = 'plane_ticket';
    } else {
        typeSelect.value = 'itinerary';
    }
}

// ─── Upload Document ────────────────────────────────────

async function evtUploadDocument() {
    const btn = document.getElementById('docUploadBtn');
    btn.disabled = true;
    btn.textContent = 'Uploading…';

    try {
        const eventId = document.getElementById('docEventId').value;
        const targetUserId = document.getElementById('docTargetUserId').value || null;
        const label = document.getElementById('docLabel').value.trim();
        const docType = document.getElementById('docType').value;
        const fileInput = document.getElementById('docFileInput');
        const file = fileInput.files[0];

        if (!label) throw new Error('Please enter a document label');
        if (!file) throw new Error('Please select a file');

        // Upload to storage
        const ext = file.name.split('.').pop();
        const storagePath = `${eventId}/${targetUserId || 'group'}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

        const { error: uploadErr } = await supabaseClient.storage
            .from('event-documents')
            .upload(storagePath, file, { contentType: file.type });

        if (uploadErr) throw uploadErr;

        // Insert DB record
        const { error: dbErr } = await supabaseClient
            .from('event_documents')
            .insert({
                event_id: eventId,
                uploaded_by: evtCurrentUser.id,
                target_user_id: targetUserId,
                doc_type: docType,
                label,
                file_path: storagePath,
                file_name: file.name,
                file_size_bytes: file.size,
                mime_type: file.type,
            });

        if (dbErr) throw dbErr;

        // Reset form and refresh detail
        document.getElementById('docUploadForm').classList.add('hidden');
        document.getElementById('docLabel').value = '';
        fileInput.value = '';

        // Re-open detail to refresh
        evtOpenDetail(eventId);
    } catch (err) {
        console.error('Document upload error:', err);
        alert(`Upload failed: ${err.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Upload';
    }
}

// ─── Download Document ──────────────────────────────────

async function evtDownloadDocument(docId, filePath, fileName) {
    try {
        const { data, error } = await supabaseClient.storage
            .from('event-documents')
            .download(filePath);

        if (error) throw error;

        // Create download link
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Download error:', err);
        alert(`Download failed: ${err.message}`);
    }
}

// ─── Mark Document as Distributed ───────────────────────

async function evtMarkDistributed(docId, eventId) {
    try {
        const { error } = await supabaseClient
            .from('event_documents')
            .update({ distributed: true })
            .eq('id', docId);
        if (error) throw error;
        evtOpenDetail(eventId);
    } catch (err) {
        console.error('Mark distributed error:', err);
        alert(`Failed: ${err.message}`);
    }
}

// ─── Delete Document ────────────────────────────────────

async function evtDeleteDocument(docId, eventId) {
    if (!confirm('Delete this document?')) return;
    try {
        // Get file path first for storage cleanup
        const { data: doc } = await supabaseClient
            .from('event_documents')
            .select('file_path')
            .eq('id', docId)
            .single();

        if (doc?.file_path) {
            await supabaseClient.storage.from('event-documents').remove([doc.file_path]);
        }

        const { error } = await supabaseClient
            .from('event_documents')
            .delete()
            .eq('id', docId);
        if (error) throw error;

        evtOpenDetail(eventId);
    } catch (err) {
        console.error('Delete document error:', err);
        alert(`Delete failed: ${err.message}`);
    }
}
