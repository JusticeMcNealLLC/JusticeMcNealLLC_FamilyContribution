// ═══════════════════════════════════════════════════════════
// Portal Events — Scrapbook (Photo Upload & Gallery)
// Past events allow RSVPed members to upload photos.
// ═══════════════════════════════════════════════════════════

/**
 * Build the scrapbook HTML section for a completed event.
 * Shows a photo grid + upload button for RSVPed members.
 */
async function evtBuildScrapbookHtml(event, hasRsvp) {
    if (event.status !== 'completed') return '';

    // Load photos
    const { data: photos } = await supabaseClient
        .from('event_photos')
        .select('*, profiles:user_id(first_name, last_name, profile_picture_url)')
        .eq('event_id', event.id)
        .order('uploaded_at', { ascending: false });

    const photoList = photos || [];
    const canUpload = hasRsvp || evtCurrentUserRole === 'admin';

    let galleryHtml = '';
    if (photoList.length) {
        galleryHtml = `
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                ${photoList.map(p => {
                    const name = p.profiles ? `${p.profiles.first_name || ''} ${p.profiles.last_name || ''}`.trim() : 'Member';
                    const canDelete = p.user_id === evtCurrentUser.id || evtCurrentUserRole === 'admin';
                    return `
                        <div class="relative group rounded-xl overflow-hidden bg-gray-100 aspect-square">
                            <img src="${p.file_url}" alt="${evtEscapeHtml(p.caption || '')}" class="w-full h-full object-cover cursor-pointer" onclick="evtViewPhoto('${p.file_url}', '${evtEscapeHtml(p.caption || '')}', '${evtEscapeHtml(name)}')">
                            ${p.caption ? `<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                <p class="text-white text-[10px] leading-tight truncate">${evtEscapeHtml(p.caption)}</p>
                            </div>` : ''}
                            <div class="absolute top-1 left-1 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                                <span class="text-white text-[9px] font-medium">${evtEscapeHtml(name)}</span>
                            </div>
                            ${canDelete ? `
                            <button onclick="evtDeletePhoto('${event.id}', '${p.id}', '${p.file_url}')" class="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs">&times;</button>
                            ` : ''}
                        </div>`;
                }).join('')}
            </div>`;
    } else {
        galleryHtml = `<p class="text-xs text-gray-400 mt-2">No photos yet. Be the first to share a memory!</p>`;
    }

    const uploadHtml = canUpload ? `
        <div class="mt-3 p-3 border-2 border-dashed border-gray-200 rounded-xl text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition" id="scrapbookDropzone" onclick="document.getElementById('scrapbookFileInput').click()">
            <input type="file" id="scrapbookFileInput" accept="image/*" multiple class="hidden" onchange="evtHandlePhotoSelect('${event.id}')">
            <svg class="w-6 h-6 text-gray-300 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <p class="text-xs text-gray-400">Drop photos or tap to upload</p>
            <p class="text-[10px] text-gray-300 mt-0.5">JPG, PNG, WebP • Max 10MB per photo</p>
        </div>
        <div id="scrapbookUploadProgress" class="hidden mt-2">
            <div class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4 text-brand-500" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                <span class="text-xs text-brand-600" id="scrapbookUploadText">Uploading...</span>
            </div>
        </div>
    ` : '';

    return `
        <div class="mt-6 p-4 bg-white rounded-xl border border-gray-200/80">
            <div class="flex items-center justify-between">
                <h4 class="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    📸 Scrapbook
                    <span class="text-xs font-normal text-gray-400">(${photoList.length} photo${photoList.length !== 1 ? 's' : ''})</span>
                </h4>
            </div>
            ${galleryHtml}
            ${uploadHtml}
        </div>
    `;
}

/**
 * Handle photo file selection from the file input.
 */
async function evtHandlePhotoSelect(eventId) {
    const input = document.getElementById('scrapbookFileInput');
    const files = Array.from(input?.files || []);
    if (!files.length) return;

    const progress = document.getElementById('scrapbookUploadProgress');
    const progressText = document.getElementById('scrapbookUploadText');
    if (progress) progress.classList.remove('hidden');

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    let uploaded = 0;

    for (const file of files) {
        if (!allowed.includes(file.type)) {
            alert(`Skipped "${file.name}" — only JPG, PNG, WebP, GIF allowed.`);
            continue;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert(`Skipped "${file.name}" — max 10MB per photo.`);
            continue;
        }

        if (progressText) progressText.textContent = `Uploading ${uploaded + 1} of ${files.length}...`;

        try {
            const ext = file.name.split('.').pop();
            const filePath = `${evtCurrentUser.id}/${eventId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

            const { error: uploadErr } = await supabaseClient.storage
                .from('event-photos')
                .upload(filePath, file, { upsert: false });
            if (uploadErr) throw uploadErr;

            const { data: urlData } = supabaseClient.storage
                .from('event-photos')
                .getPublicUrl(filePath);

            // Prompt for caption on first photo only
            let caption = null;
            if (files.length === 1) {
                caption = prompt('Add a caption? (optional)');
            }

            const { error: insertErr } = await supabaseClient
                .from('event_photos')
                .insert({
                    event_id: eventId,
                    user_id: evtCurrentUser.id,
                    file_url: urlData.publicUrl,
                    caption: caption || null,
                });
            if (insertErr) throw insertErr;

            uploaded++;
        } catch (err) {
            console.error('Photo upload error:', err);
            alert('Failed to upload photo: ' + (err.message || 'Unknown error'));
        }
    }

    if (progress) progress.classList.add('hidden');
    if (input) input.value = '';

    if (uploaded > 0) {
        alert(`✅ ${uploaded} photo${uploaded > 1 ? 's' : ''} uploaded!`);
        // Refresh the detail modal to show new photos
        evtOpenDetail(eventId);
    }
}

/**
 * Delete a scrapbook photo.
 */
async function evtDeletePhoto(eventId, photoId, fileUrl) {
    if (!confirm('Delete this photo?')) return;

    try {
        // Delete the DB record
        const { error } = await supabaseClient
            .from('event_photos')
            .delete()
            .eq('id', photoId);
        if (error) throw error;

        // Try to remove from storage (extract path from URL)
        try {
            const url = new URL(fileUrl);
            const path = url.pathname.split('/event-photos/')[1];
            if (path) {
                await supabaseClient.storage.from('event-photos').remove([decodeURIComponent(path)]);
            }
        } catch (e) {
            console.warn('Storage cleanup failed (non-critical):', e);
        }

        // Refresh detail
        evtOpenDetail(eventId);
    } catch (err) {
        console.error('Delete photo error:', err);
        alert('Failed to delete photo.');
    }
}

/**
 * View a photo in a lightbox overlay.
 */
function evtViewPhoto(url, caption, name) {
    // Remove any existing lightbox
    const existing = document.getElementById('photoLightbox');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'photoLightbox';
    overlay.className = 'fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4';
    overlay.innerHTML = `
        <div class="max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <img src="${url}" alt="${caption}" class="max-w-full max-h-[80vh] rounded-lg object-contain shadow-2xl">
            ${caption || name ? `
            <div class="mt-3 text-center">
                ${caption ? `<p class="text-white text-sm">${evtEscapeHtml(caption)}</p>` : ''}
                ${name ? `<p class="text-gray-400 text-xs mt-1">📷 ${evtEscapeHtml(name)}</p>` : ''}
            </div>` : ''}
        </div>
        <button class="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-light transition" onclick="document.getElementById('photoLightbox').remove()">&times;</button>
    `;
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
}
