// Portal Events — Create sheet: Basics step (Phase 5M.1.2)

'use strict';

function _esc(s) {
    return window.EventsCreateSteps.esc(s);
}

function _setImageFile(imageFile, fileKey, previewKey) {
    const STATE = window.EventsCreateSteps.getState();
    if (!imageFile) return;
    if (!imageFile.type.match(/^image\/(png|jpeg|webp)$/)) { alert('Please choose a PNG, JPG, or WebP image.'); return; }
    if (imageFile.size > 5 * 1024 * 1024) { alert('File must be under 5 MB.'); return; }
    STATE[fileKey] = imageFile;
    const reader = new FileReader();
    reader.onload = () => {
        STATE[previewKey] = reader.result;
        window.EventsCreateSteps.render();
    };
    reader.readAsDataURL(imageFile);
}

function _wireImageUpload(dropId, fileId, clearId, fileKey, previewKey) {
    const STATE = window.EventsCreateSteps.getState();
    const drop = document.getElementById(dropId);
    const file = document.getElementById(fileId);

    if (drop && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
        const dt = drop.querySelector('.ec-drop-hint-desktop');
        const tt = drop.querySelector('.ec-drop-hint-touch');
        if (dt) dt.style.display = '';
        if (tt) tt.style.display = 'none';
    }

    drop?.addEventListener('click', () => file.click());
    drop?.addEventListener('dragover', (e) => {
        e.preventDefault();
        drop.classList.add('ec-banner-drop--over');
    });
    drop?.addEventListener('dragleave', (e) => {
        if (!drop.contains(e.relatedTarget)) {
            drop.classList.remove('ec-banner-drop--over');
        }
    });
    drop?.addEventListener('drop', (e) => {
        e.preventDefault();
        drop.classList.remove('ec-banner-drop--over');
        _setImageFile(e.dataTransfer?.files?.[0], fileKey, previewKey);
    });

    file?.addEventListener('change', () => _setImageFile(file.files[0], fileKey, previewKey));
    document.getElementById(clearId)?.addEventListener('click', () => {
        STATE[fileKey] = null;
        STATE[previewKey] = null;
        if (file) file.value = '';
        window.EventsCreateSteps.render();
    });
}

function html() {
    const STATE = window.EventsCreateSteps.getState();
    const CATEGORIES = window.EventsCreateSteps.CATEGORIES;
    const f = STATE.form;
    const types = [
        { key:'member', emoji:'👥', label:'Member event', sub:'Anyone can RSVP', enabled:true },
        { key:'llc', emoji:'🏢', label:'LLC event', sub:'Use legacy editor for now', enabled:false },
        { key:'competition', emoji:'🏆', label:'Competition', sub:'Use legacy editor for now', enabled:false },
    ];
    return `
        <div class="ec-row">
            <label class="ec-label">Event type</label>
            <div class="ec-grid-2" style="grid-template-columns:1fr 1fr 1fr">
                ${types.map(t => `
                    <div class="ec-type-card ${f.event_type === t.key ? 'active' : ''} ${!t.enabled ? 'disabled' : ''}" data-type="${t.key}" ${!t.enabled ? 'data-disabled="1"' : ''}>
                        <div class="ec-type-emoji">${t.emoji}</div>
                        <div class="text-sm font-bold text-gray-800 mt-1">${t.label}</div>
                        <div class="text-xs text-gray-500">${t.sub}</div>
                    </div>
                `).join('')}
            </div>
            <p class="ec-help">LLC &amp; Competition events use the legacy form — select Member to continue here.</p>
        </div>

        <div class="ec-row">
            <label class="ec-label">Title</label>
            <input id="ecTitle" class="ec-input" type="text" maxlength="120" placeholder="What's the occasion?" value="${_esc(f.title)}">
        </div>

        <div class="ec-row">
            <label class="ec-label">Category</label>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${CATEGORIES.map(c =>
                    `<button type="button" class="ec-pill ${f.category === c.key ? 'active' : ''}" data-cat="${c.key}">${c.label}</button>`
                ).join('')}
            </div>
        </div>

        <div class="ec-row">
            <label class="ec-label">Description</label>
            <textarea id="ecDesc" class="ec-input ec-textarea" maxlength="2000" placeholder="Tell members what to expect…">${_esc(f.description)}</textarea>
        </div>

        <div class="ec-row">
            <label class="ec-label">Banner image (optional)</label>
            <input id="ecBannerFile" type="file" accept="image/png,image/jpeg,image/webp" style="display:none">
            ${STATE.bannerPreviewUrl
                ? `<div><img src="${STATE.bannerPreviewUrl}" class="ec-banner-preview" alt=""><button type="button" id="ecBannerClear" class="text-xs text-red-600 font-semibold mt-1">Remove</button></div>`
                : `<div id="ecBannerDrop" class="ec-banner-drop">
                        <div style="font-size:28px">🖼️</div>
                        <div class="text-sm font-semibold text-gray-700 mt-1"><span class="ec-drop-hint-desktop" style="display:none">Drag &amp; drop or click to upload</span><span class="ec-drop-hint-touch">Tap to upload</span></div>
                        <div class="text-xs text-gray-400">PNG / JPG / WebP · max 5 MB</div>
                   </div>`
            }
            <p class="ec-help">Landscape image for event pages and cards.</p>
        </div>

        <div class="ec-row">
            <label class="ec-label">Embed image (optional)</label>
            <input id="ecEmbedImageFile" type="file" accept="image/png,image/jpeg,image/webp" style="display:none">
            ${STATE.embedImagePreviewUrl
                ? `<div><img src="${STATE.embedImagePreviewUrl}" class="ec-embed-preview" alt=""><button type="button" id="ecEmbedImageClear" class="text-xs text-red-600 font-semibold mt-1">Remove</button></div>`
                : `<div id="ecEmbedImageDrop" class="ec-banner-drop">
                        <div style="font-size:28px">▣</div>
                        <div class="text-sm font-semibold text-gray-700 mt-1"><span class="ec-drop-hint-desktop" style="display:none">Drag &amp; drop or click to upload</span><span class="ec-drop-hint-touch">Tap to upload</span></div>
                        <div class="text-xs text-gray-400">Portrait works best · PNG / JPG / WebP · max 5 MB</div>
                   </div>`
            }
            <p class="ec-help">Used only for iMessage, Discord, and other link previews. Falls back to the banner if empty.</p>
        </div>
    `;
}

function wire() {
    const STATE = window.EventsCreateSteps.getState();
    document.querySelectorAll('[data-type]').forEach(el => {
        el.addEventListener('click', () => {
            if (el.dataset.disabled) return;
            STATE.form.event_type = el.dataset.type;
            window.EventsCreateSteps.render();
        });
    });
    document.querySelectorAll('[data-cat]').forEach(el => {
        el.addEventListener('click', () => {
            STATE.form.category = el.dataset.cat;
            window.EventsCreateSteps.render();
        });
    });
    document.getElementById('ecTitle')?.addEventListener('input', e => STATE.form.title = e.target.value);
    document.getElementById('ecDesc')?.addEventListener('input', e => STATE.form.description = e.target.value);

    _wireImageUpload('ecBannerDrop', 'ecBannerFile', 'ecBannerClear', 'bannerFile', 'bannerPreviewUrl');
    _wireImageUpload('ecEmbedImageDrop', 'ecEmbedImageFile', 'ecEmbedImageClear', 'embedImageFile', 'embedImagePreviewUrl');
}

export const createStepBasicsApi = { html, wire };

globalThis.EventsCreateSteps = globalThis.EventsCreateSteps || {};
globalThis.EventsCreateSteps.basics = createStepBasicsApi;
