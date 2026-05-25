// Portal Events — Manage images tab (Phase 5M.3B)

'use strict';

function api() {
    return window.EventsManageImagesApi || {};
}

function esc(s) {
    const el = document.createElement('span');
    el.textContent = s == null ? '' : String(s);
    return el.innerHTML;
}
function money(cents) {
    return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
}

// ─── Images tab ─────────────────────────────────────────────────
// Pending file selections (set by drop-zone wiring, cleared on save)
const imgFiles = { banner: null, embed: null };

function imgDropZone(id, label, hint, currentUrl) {
    const STATE = api().getState?.() || {};
    const hasImg = !!currentUrl;
    return `
        <div id="${id}Zone" class="em-img-zone${hasImg ? ' em-img-zone--has' : ''}" data-zone="${id}">
            <input id="${id}FileInput" type="file" accept="image/*" style="display:none">
            <img id="${id}Preview" src="${esc(currentUrl)}" alt=""
                 style="width:100%;border-radius:10px;object-fit:cover;max-height:200px;margin-bottom:10px;${hasImg ? '' : 'display:none'}">
            <div id="${id}Prompt" style="${hasImg ? 'display:none' : ''}">
                <svg style="width:32px;height:32px;color:#9ca3af;margin-bottom:8px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4-4a3 3 0 014 0l4 4m-4-4l1.5-1.5a3 3 0 014 0L20 16M14 8h.01M4 19h16a1 1 0 001-1V6a1 1 0 00-1-1H4a1 1 0 00-1 1v12a1 1 0 001 1z"/></svg>
                <p style="font-size:13px;font-weight:700;color:#374151;margin:0 0 2px">${label}</p>
                <p style="font-size:11px;color:#9ca3af;margin:0">${hint}</p>
            </div>
            ${hasImg ? `<p style="font-size:11px;color:#9ca3af;margin:0 0 8px;text-align:center">Click or drop to replace</p>` : ''}
            <button type="button" class="em-btn-ghost" style="font-size:12px;padding:6px 12px" data-pick="${id}">Choose file</button>
        </div>
        <p style="font-size:11px;color:#9ca3af;margin-top:6px">Or paste a URL:</p>
        <input id="${id}UrlInput" class="em-input" type="url" placeholder="https://…" value="${esc(currentUrl)}" style="margin-top:4px">
    `;
}

function imagesHtml() {
    const STATE = api().getState?.() || {};
    const e = STATE.event;
    return `
        <style>
            .em-img-zone { border:2px dashed #e5e7eb; border-radius:14px; padding:24px 16px; text-align:center; cursor:pointer; transition:border-color .15s,background .15s; display:flex; flex-direction:column; align-items:center; gap:4px; }
            .em-img-zone:hover, .em-img-zone.em-drag-over { border-color:#818cf8; background:#f5f3ff; }
            .em-img-zone--has { padding:14px 16px; }
        </style>

        <div class="em-card em-command-card mb-4">
            <p class="em-command-eyebrow">Images</p>
            <h3 class="em-command-title">Banner &amp; embed image</h3>
            <p class="em-command-copy">The banner is shown at the top of the event detail page. The embed image is used for social media previews — if none is set, the banner is used as fallback.</p>
        </div>

        <div class="em-card mb-3">
            <div class="em-section-head" style="margin-bottom:12px">
                <div>
                    <h3 class="em-section-title">Event banner</h3>
                    <p class="em-section-sub">Hero image on the public event page. Min 1200×400 px recommended.</p>
                </div>
            </div>
            ${imgDropZone('emBanner', 'Drop image here or click to upload', 'JPG, PNG, WebP · max 10 MB', e.banner_url || '')}
        </div>

        <div class="em-card mb-4">
            <div class="em-section-head" style="margin-bottom:12px">
                <div>
                    <h3 class="em-section-title">Embed / social preview image</h3>
                    <p class="em-section-sub">Used when the event link is shared on social media. 1200×630 px recommended. Falls back to the banner.</p>
                </div>
            </div>
            ${imgDropZone('emEmbed', 'Drop image here or click to upload', 'JPG, PNG, WebP · max 10 MB · optional', e.embed_image_url || '')}
        </div>

        <div style="display:flex;align-items:center;gap:10px">
            <button id="emImagesSave" class="em-btn-primary">Save images</button>
            <span id="emImagesSaveStatus" style="font-size:12px;color:#6b7280"></span>
        </div>
    `;
}

function wireImages() {
    const STATE = api().getState?.() || {};
    const e = STATE.event;
    // Reset pending file selections when re-rendering
    imgFiles.banner = null;
    imgFiles.embed  = null;

    ['banner', 'embed'].forEach(key => {
        const zoneId   = `em${key.charAt(0).toUpperCase() + key.slice(1)}`;
        const zone     = document.getElementById(`${zoneId}Zone`);
        const fileInput= document.getElementById(`${zoneId}FileInput`);
        const urlInput = document.getElementById(`${zoneId}UrlInput`);
        const preview  = document.getElementById(`${zoneId}Preview`);
        const prompt   = document.getElementById(`${zoneId}Prompt`);
        const pickBtn  = zone?.querySelector(`[data-pick="${zoneId}"]`);
        if (!zone || !fileInput || !urlInput) return;

        function applyFile(file) {
            if (!file || !file.type.startsWith('image/')) return;
            imgFiles[key] = file;
            const reader = new FileReader();
            reader.onload = ev => {
                preview.src = ev.target.result;
                preview.style.display = '';
                if (prompt) prompt.style.display = 'none';
                urlInput.value = '';
            };
            reader.readAsDataURL(file);
        }

        // Click zone or pick button → open file picker
        zone.addEventListener('click', (ev) => {
            if (ev.target === pickBtn || pickBtn?.contains(ev.target)) return; // handled below
            fileInput.click();
        });
        pickBtn?.addEventListener('click', (ev) => { ev.stopPropagation(); fileInput.click(); });
        fileInput.addEventListener('change', () => { if (fileInput.files[0]) applyFile(fileInput.files[0]); });

        // Drag and drop
        zone.addEventListener('dragover', (ev) => { ev.preventDefault(); zone.classList.add('em-drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('em-drag-over'));
        zone.addEventListener('drop', (ev) => {
            ev.preventDefault();
            zone.classList.remove('em-drag-over');
            const file = ev.dataTransfer.files?.[0];
            if (file) applyFile(file);
        });

        // URL input → live preview
        urlInput.addEventListener('input', () => {
            const val = urlInput.value.trim();
            imgFiles[key] = null; // clear pending file if URL typed manually
            if (val) { preview.src = val; preview.style.display = ''; if (prompt) prompt.style.display = 'none'; }
            else { preview.style.display = 'none'; if (prompt) prompt.style.display = ''; }
        });
    });

    document.getElementById('emImagesSave')?.addEventListener('click', async () => {
        const saveBtn = document.getElementById('emImagesSave');
        const status  = document.getElementById('emImagesSaveStatus');
        saveBtn.disabled = true;

        const slug = e.slug || e.id;

        async function resolveUrl(key, currentUrl) {
            const file = imgFiles[key];
            if (file) {
                status.textContent = `Uploading ${key}…`;
                const ext  = file.name.split('.').pop().toLowerCase() || 'jpg';
                const path = key === 'embed'
                    ? `embeds/${slug}-${Date.now()}.${ext}`
                    : `${slug}-${Date.now()}.${ext}`;
                const { error: upErr } = await supabaseClient.storage
                    .from('event-banners')
                    .upload(path, file, { contentType: file.type, upsert: true });
                if (upErr) throw new Error(`${key} upload failed: ${upErr.message}`);
                return supabaseClient.storage.from('event-banners').getPublicUrl(path).data.publicUrl;
            }
            // Fall back to URL input
            const zoneId  = `em${key.charAt(0).toUpperCase() + key.slice(1)}`;
            return document.getElementById(`${zoneId}UrlInput`)?.value.trim() || null;
        }

        try {
            status.textContent = 'Saving…';
            const [bannerUrl, embedUrl] = await Promise.all([
                resolveUrl('banner', e.banner_url),
                resolveUrl('embed',  e.embed_image_url),
            ]);

            const { error } = await supabaseClient
                .from('events')
                .update({ banner_url: bannerUrl, embed_image_url: embedUrl })
                .eq('id', e.id);
            if (error) throw error;

            STATE.event.banner_url      = bannerUrl;
            STATE.event.embed_image_url = embedUrl;
            imgFiles.banner = null;
            imgFiles.embed  = null;
            status.textContent = 'Saved ✓';
            setTimeout(() => { status.textContent = ''; }, 2500);
            api().notifyParent?.('updated', e.id);
        } catch (err) {
            status.textContent = 'Error: ' + (err.message || 'save failed');
        } finally {
            saveBtn.disabled = false;
        }
    });
}

export const manageImagesApi = {
    imagesHtml,
    wireImages
};

globalThis.EventsManageImages = manageImagesApi;
