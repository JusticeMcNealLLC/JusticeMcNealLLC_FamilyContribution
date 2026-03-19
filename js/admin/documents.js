// Admin Documents Vault
// Upload, view, delete, search, and share LLC documents via Supabase Storage

const STORAGE_BUCKET = 'llc-documents';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
    'application/pdf',
    'image/png', 'image/jpeg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv', 'text/plain'
];

const CATEGORY_CONFIG = {
    'formation':            { label: 'Formation Documents', icon: '📋', color: 'indigo' },
    'ein':                  { label: 'EIN / Tax ID', icon: '🏛️', color: 'blue' },
    'operating-agreement':  { label: 'Operating Agreement', icon: '📝', color: 'violet' },
    'banking':              { label: 'Banking', icon: '🏦', color: 'emerald' },
    'tax':                  { label: 'Tax Filings', icon: '🧾', color: 'amber' },
    'stripe':               { label: 'Stripe / Payments', icon: '💳', color: 'purple' },
    'insurance':            { label: 'Insurance', icon: '🛡️', color: 'teal' },
    'contract':             { label: 'Contracts', icon: '🤝', color: 'rose' },
    'receipt':              { label: 'Receipts', icon: '🧾', color: 'orange' },
    'other':                { label: 'Other', icon: '📁', color: 'gray' },
};

let currentUser = null;
let allDocuments = [];
let pendingDeleteId = null;
let pendingDeletePath = null;
let pendingShareDocId = null;
let pendingShareFilePath = null;
let selectedFile = null;

document.addEventListener('DOMContentLoaded', async function () {
    currentUser = await checkAuth(true);
    if (!currentUser) return;

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);

    // Upload modal
    document.getElementById('uploadBtn').addEventListener('click', openUploadModal);
    document.getElementById('uploadModalOverlay').addEventListener('click', closeUploadModal);
    document.getElementById('uploadCancelBtn').addEventListener('click', closeUploadModal);
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);

    // File input / drag & drop
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', handleFileDrop);
    document.getElementById('clearFileBtn').addEventListener('click', clearFile);

    // Delete modal
    document.getElementById('deleteModalOverlay').addEventListener('click', closeDeleteModal);
    document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('deleteConfirmBtn').addEventListener('click', confirmDelete);

    // Share modal
    document.getElementById('shareModalOverlay').addEventListener('click', closeShareModal);
    document.getElementById('shareCancelBtn').addEventListener('click', closeShareModal);
    document.getElementById('generateShareBtn').addEventListener('click', generateShareLink);
    document.getElementById('copyLinkBtn').addEventListener('click', copyShareLink);

    // Search
    document.getElementById('searchInput').addEventListener('input', renderDocuments);

    // Load documents
    await loadDocuments();
});

// ─── Load Documents ─────────────────────────────────────

async function loadDocuments() {
    try {
        const { data, error } = await supabaseClient
            .from('llc_documents')
            .select('*')
            .eq('is_archived', false)
            .order('created_at', { ascending: false });

        if (error) throw error;
        allDocuments = data || [];

        // Load share count
        const { count } = await supabaseClient
            .from('llc_document_shares')
            .select('*', { count: 'exact', head: true });

        updateStats(count || 0);
        renderDocuments();
    } catch (err) {
        console.error('Failed to load documents:', err);
        showError('Failed to load documents: ' + err.message);
    }
}

function updateStats(shareCount) {
    document.getElementById('statTotal').textContent = allDocuments.length;

    const uniqueCategories = new Set(allDocuments.map(d => d.category));
    document.getElementById('statCategories').textContent = uniqueCategories.size;

    const totalBytes = allDocuments.reduce((sum, d) => sum + (d.file_size || 0), 0);
    document.getElementById('statSize').textContent = formatFileSize(totalBytes);

    document.getElementById('statShares').textContent = shareCount;
}

// ─── Render Documents ───────────────────────────────────

function renderDocuments() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const container = document.getElementById('categoriesContainer');
    const emptyState = document.getElementById('emptyState');

    // Filter
    const filtered = searchTerm
        ? allDocuments.filter(d =>
            d.name.toLowerCase().includes(searchTerm) ||
            d.description?.toLowerCase().includes(searchTerm) ||
            d.file_name.toLowerCase().includes(searchTerm) ||
            d.category.toLowerCase().includes(searchTerm)
        )
        : allDocuments;

    if (filtered.length === 0 && !searchTerm) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    // Group by category
    const grouped = {};
    for (const doc of filtered) {
        if (!grouped[doc.category]) grouped[doc.category] = [];
        grouped[doc.category].push(doc);
    }

    // Build HTML — iterate in category config order
    let html = '';
    for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
        const docs = grouped[key];
        if (!docs || docs.length === 0) {
            // Show empty category only when not searching
            if (!searchTerm) {
                html += buildCategorySection(key, config, []);
            }
            continue;
        }
        html += buildCategorySection(key, config, docs);
    }

    container.innerHTML = html;

    // Attach action listeners
    container.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', handleDocAction);
    });
}

function buildCategorySection(key, config, docs) {
    const hasDocuments = docs.length > 0;
    const openAttr = hasDocuments ? 'open' : '';

    let docsHtml = '';
    if (hasDocuments) {
        docsHtml = docs.map(doc => `
            <div class="flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition group">
                <div class="w-9 h-9 bg-${config.color}-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg class="w-4.5 h-4.5 text-${config.color}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900 truncate">${escapeHtml(doc.name)}</div>
                    <div class="text-xs text-gray-400">${escapeHtml(doc.file_name)} · ${formatFileSize(doc.file_size)} · ${formatDate(doc.created_at)}</div>
                    ${doc.description ? `<div class="text-xs text-gray-500 mt-0.5 truncate">${escapeHtml(doc.description)}</div>` : ''}
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition">
                    <button data-action="download" data-path="${escapeHtml(doc.file_path)}" data-name="${escapeHtml(doc.file_name)}" title="Download" class="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </button>
                    <button data-action="share" data-id="${doc.id}" data-path="${escapeHtml(doc.file_path)}" data-name="${escapeHtml(doc.name)}" title="Share" class="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                    </button>
                    <button data-action="delete" data-id="${doc.id}" data-path="${escapeHtml(doc.file_path)}" data-name="${escapeHtml(doc.name)}" title="Delete" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>
        `).join('');
    } else {
        docsHtml = `
            <div class="px-4 py-6 text-center text-gray-400 text-sm">No documents in this category</div>
        `;
    }

    return `
        <details class="category-section bg-white rounded-2xl border border-gray-200/80 overflow-hidden" ${openAttr}>
            <summary class="flex items-center gap-3 px-4 sm:px-5 py-3.5 cursor-pointer select-none hover:bg-surface-50 transition">
                <svg class="w-4 h-4 text-gray-400 chevron flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                <span class="text-base">${config.icon}</span>
                <span class="font-semibold text-gray-900 text-sm">${config.label}</span>
                <span class="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">${docs.length}</span>
            </summary>
            <div class="border-t border-gray-100 divide-y divide-gray-100">
                ${docsHtml}
            </div>
        </details>
    `;
}

// ─── Document Actions ───────────────────────────────────

function handleDocAction(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;

    if (action === 'download') {
        downloadDocument(btn.dataset.path, btn.dataset.name);
    } else if (action === 'share') {
        openShareModal(btn.dataset.id, btn.dataset.path, btn.dataset.name);
    } else if (action === 'delete') {
        openDeleteModal(btn.dataset.id, btn.dataset.path, btn.dataset.name);
    }
}

async function downloadDocument(filePath, fileName) {
    try {
        const { data, error } = await supabaseClient.storage
            .from(STORAGE_BUCKET)
            .download(filePath);

        if (error) throw error;

        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Download failed:', err);
        showError('Failed to download: ' + err.message);
    }
}

// ─── Upload ─────────────────────────────────────────────

function openUploadModal() {
    document.getElementById('uploadModal').classList.remove('hidden');
    document.getElementById('uploadForm').reset();
    clearFile();
    hideMessages();
    document.getElementById('uploadProgress').classList.add('hidden');
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.add('hidden');
    clearFile();
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
}

function handleFileDrop(e) {
    e.preventDefault();
    document.getElementById('dropZone').classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
}

function setSelectedFile(file) {
    if (file.size > MAX_FILE_SIZE) {
        showError('File too large. Maximum size is 10MB.');
        return;
    }

    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|png|jpe?g|docx?|xlsx?|csv|txt)$/i)) {
        showError('File type not supported. Use PDF, PNG, JPG, DOCX, XLSX, CSV, or TXT.');
        return;
    }

    selectedFile = file;
    document.getElementById('dropZone').classList.add('hidden');
    document.getElementById('filePreview').classList.remove('hidden');
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);

    // Auto-fill name from file name (strip extension)
    const nameInput = document.getElementById('docName');
    if (!nameInput.value) {
        nameInput.value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    }
}

function clearFile() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('dropZone').classList.remove('hidden');
    document.getElementById('filePreview').classList.add('hidden');
}

async function handleUpload(e) {
    e.preventDefault();
    hideMessages();

    if (!selectedFile) {
        showError('Please select a file to upload.');
        return;
    }

    const name = document.getElementById('docName').value.trim();
    const category = document.getElementById('docCategory').value;
    const description = document.getElementById('docDescription').value.trim();

    if (!name) { showError('Please enter a document name.'); return; }
    if (!category) { showError('Please select a category.'); return; }

    const btn = document.getElementById('uploadSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Uploading...';

    const progressContainer = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressText = document.getElementById('uploadProgressText');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '10%';
    progressText.textContent = 'Uploading file...';

    try {
        // Build storage path: category/timestamp-filename
        const timestamp = Date.now();
        const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${category}/${timestamp}-${sanitizedName}`;

        progressBar.style.width = '30%';

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseClient.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, selectedFile, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        progressBar.style.width = '70%';
        progressText.textContent = 'Saving metadata...';

        // Insert metadata record
        const { error: dbError } = await supabaseClient
            .from('llc_documents')
            .insert({
                category,
                name,
                file_name: selectedFile.name,
                file_path: storagePath,
                file_size: selectedFile.size,
                mime_type: selectedFile.type || 'application/octet-stream',
                description: description || null,
                uploaded_by: currentUser.id,
            });

        if (dbError) throw dbError;

        progressBar.style.width = '100%';
        progressText.textContent = 'Done!';

        closeUploadModal();
        showSuccess(`"${name}" uploaded successfully.`);
        await loadDocuments();

    } catch (err) {
        console.error('Upload failed:', err);
        showError('Upload failed: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Upload Document';
    }
}

// ─── Delete ─────────────────────────────────────────────

function openDeleteModal(id, path, name) {
    pendingDeleteId = id;
    pendingDeletePath = path;
    document.getElementById('deleteModalText').textContent = `Are you sure you want to delete "${name}"? This cannot be undone.`;
    document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
    pendingDeleteId = null;
    pendingDeletePath = null;
    document.getElementById('deleteModal').classList.add('hidden');
}

async function confirmDelete() {
    if (!pendingDeleteId) return;

    const btn = document.getElementById('deleteConfirmBtn');
    btn.disabled = true;
    btn.textContent = 'Deleting...';

    try {
        // Delete from storage
        if (pendingDeletePath) {
            const { error: storageErr } = await supabaseClient.storage
                .from(STORAGE_BUCKET)
                .remove([pendingDeletePath]);

            if (storageErr) console.warn('Storage delete warning:', storageErr);
        }

        // Delete metadata
        const { error: dbErr } = await supabaseClient
            .from('llc_documents')
            .delete()
            .eq('id', pendingDeleteId);

        if (dbErr) throw dbErr;

        closeDeleteModal();
        showSuccess('Document deleted.');
        await loadDocuments();

    } catch (err) {
        console.error('Delete failed:', err);
        showError('Failed to delete: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Delete';
    }
}

// ─── Share ───────────────────────────────────────────────

function openShareModal(id, path, name) {
    pendingShareDocId = id;
    pendingShareFilePath = path;
    document.getElementById('shareDocName').textContent = name;
    document.getElementById('shareLinkContainer').classList.add('hidden');
    document.getElementById('shareNote').value = '';
    document.getElementById('shareExpiry').value = '86400';
    document.getElementById('shareModal').classList.remove('hidden');
}

function closeShareModal() {
    pendingShareDocId = null;
    pendingShareFilePath = null;
    document.getElementById('shareModal').classList.add('hidden');
}

async function generateShareLink() {
    if (!pendingShareFilePath) return;

    const btn = document.getElementById('generateShareBtn');
    btn.disabled = true;
    btn.textContent = 'Generating...';

    try {
        const expiresIn = parseInt(document.getElementById('shareExpiry').value);
        const note = document.getElementById('shareNote').value.trim();

        // Generate signed URL
        const { data, error } = await supabaseClient.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(pendingShareFilePath, expiresIn);

        if (error) throw error;

        const signedUrl = data.signedUrl;

        // Log the share
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
        await supabaseClient
            .from('llc_document_shares')
            .insert({
                document_id: pendingShareDocId,
                shared_by: currentUser.id,
                recipient_note: note || null,
                expires_at: expiresAt,
                signed_url: signedUrl
            });

        // Show link
        document.getElementById('shareLinkInput').value = signedUrl;
        document.getElementById('shareLinkContainer').classList.remove('hidden');

        // Update share count
        const { count } = await supabaseClient
            .from('llc_document_shares')
            .select('*', { count: 'exact', head: true });
        document.getElementById('statShares').textContent = count || 0;

    } catch (err) {
        console.error('Share failed:', err);
        showError('Failed to generate share link: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Generate Link';
    }
}

function copyShareLink() {
    const input = document.getElementById('shareLinkInput');
    navigator.clipboard.writeText(input.value).then(() => {
        const btn = document.getElementById('copyLinkBtn');
        btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Copied!`;
        setTimeout(() => {
            btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg> Copy`;
        }, 2000);
    });
}

// ─── Helpers ─────────────────────────────────────────────

function showSuccess(msg) {
    const el = document.getElementById('successMsg');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
}

function showError(msg) {
    const el = document.getElementById('errorMsg');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 8000);
}

function hideMessages() {
    document.getElementById('successMsg')?.classList.add('hidden');
    document.getElementById('errorMsg')?.classList.add('hidden');
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }
    return size.toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
