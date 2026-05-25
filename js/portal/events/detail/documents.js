import { evtDataAction } from '../core/actions.js';
// ═══════════════════════════════════════════════════════════
// Portal Events — Detail documents (upload & download)
// Host: upload per-member & group docs
// Member: view & download their assigned + group docs
// ═══════════════════════════════════════════════════════════

function evtDocTypes() {
    const types = window.EventsConstants && window.EventsConstants.EVENT_DOC_TYPES;
    return types && types.length ? types : [];
}

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
    const myDocs = allDocs.filter(d => d.target_user_id === globalThis.evtCurrentUser.id);

    if (isHost) return '';

    // ── Member View: Download their docs ──
    if (!hasRsvp) return '';

    const visibleDocs = [...myDocs, ...groupDocs];
    if (visibleDocs.length === 0) return '';

    window._evtVisibleDocuments = window._evtVisibleDocuments || {};
    window._evtVisibleDocuments[eventId] = visibleDocs.map(d => ({
        id: d.id,
        doc_type: d.doc_type,
        label: d.label,
        file_name: d.file_name,
        file_path: d.file_path,
        target_user_id: d.target_user_id,
    }));

    return `
        <div class="ed-docs-launch">
            <div class="ed-docs-launch-copy">
                <span class="ed-docs-launch-icon">📄</span>
                <div>
                    <p class="ed-docs-launch-title">Documents available</p>
                    <p class="ed-docs-launch-sub">${visibleDocs.length} file${visibleDocs.length !== 1 ? 's' : ''} ready for this event</p>
                </div>
            </div>
            <button type="button" ${evtDataAction('evtOpenDocumentsPanel', eventId)} class="ed-action-btn ed-docs-launch-btn">View Documents</button>
        </div>`;
}

function evtOpenDocumentsPanel(eventId) {
    const docs = window._evtVisibleDocuments?.[eventId] || [];
    if (!docs.length) return;
    const existing = document.getElementById('evtDocsPanelRoot');
    if (existing) existing.remove();

    const rows = docs.map(d => {
        const isPersonal = !!d.target_user_id;
        return `
            <div class="evt-doc-row">
                <span class="evt-doc-icon">${evtDocTypeIcon(d.doc_type)}</span>
                <div class="evt-doc-copy">
                    <p>${evtEscapeHtml(d.label || d.file_name || 'Document')}</p>
                    <span>${isPersonal ? 'Personal' : 'Group'} · ${evtEscapeHtml(d.file_name || '')}</span>
                </div>
                <button ${evtDataAction('evtDownloadDocument', d.id, d.file_path, evtEscapeHtml(d.file_name || 'document'))} class="evt-doc-download">Download</button>
            </div>`;
    }).join('');

    const root = document.createElement('div');
    root.id = 'evtDocsPanelRoot';
    root.className = 'evt-docs-panel-root';
    root.innerHTML = `
        <div class="evt-docs-panel-backdrop" ${evtDataAction('evtCloseDocumentsPanel')}></div>
        <section class="evt-docs-panel" role="dialog" aria-modal="true" aria-label="Event documents">
            <header class="evt-docs-panel-head">
                <div>
                    <p>Event Documents</p>
                    <h3>Your files</h3>
                </div>
                <button ${evtDataAction('evtCloseDocumentsPanel')} aria-label="Close documents">×</button>
            </header>
            <div class="evt-docs-list">${rows}</div>
        </section>`;
    document.body.appendChild(root);
    requestAnimationFrame(() => root.classList.add('open'));
}

function evtCloseDocumentsPanel() {
    const root = document.getElementById('evtDocsPanelRoot');
    if (!root) return;
    root.classList.remove('open');
    setTimeout(() => root.remove(), 180);
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
                uploaded_by: globalThis.evtCurrentUser.id,
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
        globalThis.evtOpenDetail(eventId);
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
        globalThis.evtOpenDetail(eventId);
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

        globalThis.evtOpenDetail(eventId);
    } catch (err) {
        console.error('Delete document error:', err);
        alert(`Delete failed: ${err.message}`);
    }
}

import { publishGlobals } from '../compat/publish-globals.js';
publishGlobals({
    evtBuildDocumentsHtml,
    evtOpenDocumentsPanel,
    evtCloseDocumentsPanel,
    evtShowUploadForm,
    evtUploadDocument,
    evtDownloadDocument,
    evtMarkDistributed,
    evtDeleteDocument,
});
