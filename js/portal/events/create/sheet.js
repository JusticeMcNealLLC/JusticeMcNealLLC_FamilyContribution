// ═══════════════════════════════════════════════════════════
// Event Create Sheet  (M4a — multi-step, Member events only)
//
// DEFAULT for all create-event entry points. Legacy #createModal
// kept as a fallback for LLC/Competition (greyed-out in Step 1).
//
// 4 steps:  Basics  →  When & Where  →  Pricing  →  Review
//
// Public surface:
//   window.EventsCreate.open()
//   window.EventsCreate.close()
//   window.EventsCreate.isFlagOn()  — kept for compatibility, always true
// ═══════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── Feature flag ── always on (sheet is now the default) ─────
    function isFlagOn() { return true; }

    const STEPS = [
        { key: 'basics',  label: 'Basics' },
        { key: 'when',    label: 'When & Where' },
        { key: 'pricing', label: 'Pricing' },
        { key: 'review',  label: 'Review' },
    ];

    const STATE = {
        step: 0,
        bannerFile: null,
        bannerPreviewUrl: null,
        geocode: null, // { lat, lng, display } or null
        prizeImageFiles: {},    // item.id → File
        prizeImagePreviews: {}, // item.id → data-URL
        form: {
            event_type: 'member',
            title: '',
            category: 'other',
            description: '',
            start_date: '',
            end_date: '',
            timezone: 'America/New_York',
            location_text: '',
            location_nickname: '',
            max_participants: '',
            rsvp_deadline: '',
            pricing_mode: 'free',
            rsvp_cost_dollars: '',
            raffle_enabled: false,
            raffle_entry_cost_dollars: '',
            raffle_config: null,
            member_only: false,
        },
    };

    const CATEGORIES = [
        { key:'party',         label:'🎉 Party' },
        { key:'birthday',      label:'🎂 Birthday' },
        { key:'trip',          label:'✈️ Trip' },
        { key:'cookout',       label:'🍔 Cookout' },
        { key:'game_night',    label:'🎮 Game Night' },
        { key:'meeting',       label:'📋 Meeting' },
        { key:'fundraiser',    label:'💰 Fundraiser' },
        { key:'volunteer',     label:'🤝 Volunteer' },
        { key:'celebration',   label:'🥳 Celebration' },
        { key:'other',         label:'📌 Other' },
    ];

    const TIMEZONES = [
        'America/New_York', 'America/Chicago', 'America/Denver',
        'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
    ];

    // ─── DOM injection ──────────────────────────────────────────────
    function _ensureMounted() {
        if (document.getElementById('ecSheetRoot')) return;
        const root = document.createElement('div');
        root.id = 'ecSheetRoot';
        root.innerHTML = `
            <div id="ecSheetBackdrop" class="fixed inset-0 bg-black/40 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-200 z-[60]"></div>
            <div id="ecSheet" class="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none z-[61]">
                <div id="ecSheetPanel" class="bg-white w-full sm:max-w-2xl sm:max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto translate-y-full sm:translate-y-4 sm:opacity-0 transition-all duration-300 flex flex-col" style="max-height:92vh">
                    <header class="px-5 sm:px-6 pt-4 pb-3 border-b border-gray-100 flex items-start gap-3 flex-shrink-0">
                        <div class="flex-1 min-w-0">
                            <p class="text-[11px] uppercase tracking-wide font-bold text-brand-600">Create Event <span class="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px]">BETA</span></p>
                            <h2 id="ecSheetTitle" class="text-lg sm:text-xl font-extrabold text-gray-900 truncate">New event</h2>
                            <p id="ecSheetSub" class="text-xs text-gray-400 mt-0.5"></p>
                        </div>
                        <button id="ecSheetClose" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0" aria-label="Close">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </header>
                    <div id="ecSheetSteps" class="flex items-center justify-center gap-2 px-5 py-2 border-b border-gray-100 flex-shrink-0"></div>
                    <div id="ecSheetContent" class="flex-1 overflow-y-auto px-5 sm:px-6 py-5"></div>
                    <footer id="ecSheetFooter" class="px-5 sm:px-6 py-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
                        <button id="ecBackBtn" class="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-2">Back</button>
                        <div class="flex items-center gap-2">
                            <button id="ecDraftBtn" class="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-2">Save draft</button>
                            <button id="ecNextBtn" class="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition">Next</button>
                        </div>
                    </footer>
                </div>
            </div>
            <style>
                .ec-step-dot { width:8px; height:8px; border-radius:50%; background:#e5e7eb; transition:background .15s,width .15s; }
                .ec-step-dot.active { background:#4f46e5; width:24px; border-radius:4px; }
                .ec-step-dot.done { background:#a5b4fc; }
                .ec-label { display:block; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px; }
                .ec-input { width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; font-size:16px; color:#111827; background:#fff; }
                .ec-input:focus { outline:none; border-color:#4f46e5; box-shadow:0 0 0 3px rgba(79,70,229,.12); }
                .ec-textarea { min-height:90px; resize:vertical; font-family:inherit; }
                .ec-help { font-size:11px; color:#9ca3af; margin-top:4px; }
                .ec-row { margin-bottom:14px; }
                .ec-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
                @media(max-width:480px) { .ec-grid-2 { grid-template-columns:1fr; } }
                .ec-type-card { padding:14px; border:2px solid #e5e7eb; border-radius:12px; cursor:pointer; transition:border-color .15s,background .15s; }
                .ec-type-card.active { border-color:#4f46e5; background:#eef2ff; }
                .ec-type-card.disabled { opacity:.45; cursor:not-allowed; }
                .ec-type-emoji { font-size:24px; line-height:1; }
                .ec-banner-drop { border:2px dashed #d1d5db; border-radius:12px; padding:24px; text-align:center; cursor:pointer; transition:border-color .15s,background .15s; }
                .ec-banner-drop:hover { border-color:#a5b4fc; background:#fafafa; }
                .ec-banner-drop--over { border-color:#4f46e5; background:#eef2ff; }
                .ec-banner-preview { width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:12px; }
                .ec-pill { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; background:#f3f4f6; color:#374151; cursor:pointer; border:1px solid transparent; }
                .ec-pill.active { background:#4f46e5; color:#fff; }
                .ec-checkbox-row { display:flex; gap:10px; align-items:flex-start; padding:10px; border:1px solid #e5e7eb; border-radius:10px; cursor:pointer; }
                .ec-checkbox-row input { margin-top:3px; }
                .ec-review-card { background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:14px; margin-bottom:10px; }
                .ec-review-row { display:flex; justify-content:space-between; gap:10px; padding:6px 0; font-size:13px; border-bottom:1px solid #f1f5f9; }
                .ec-review-row:last-child { border-bottom:none; }
                .ec-review-row span:first-child { color:#6b7280; }
                .ec-review-row span:last-child { color:#111827; font-weight:600; text-align:right; }
                .ec-error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:10px 12px; border-radius:10px; font-size:13px; margin-bottom:10px; }
                .ec-loc-status { font-size:11px; margin-top:4px; }
                .ec-raffle-box { border:1px solid #e5e7eb; border-radius:14px; padding:12px; background:#fafafa; }
                .ec-raffle-section { border:1px solid #e5e7eb; border-radius:12px; padding:10px; background:#fff; margin-top:10px; }
                .ec-raffle-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
                .ec-raffle-grid { display:grid; grid-template-columns:1.2fr .8fr .65fr auto; gap:8px; align-items:end; }
                .ec-raffle-item-grid { display:grid; grid-template-columns:.45fr 1.1fr .9fr .55fr auto; gap:8px; align-items:end; margin-top:8px; }
                .ec-icon-btn { width:34px; height:34px; border-radius:9px; border:1px solid #e5e7eb; background:#fff; color:#4b5563; font-weight:800; display:inline-flex; align-items:center; justify-content:center; }
                .ec-icon-btn:hover { border-color:#c7d2fe; color:#4f46e5; background:#eef2ff; }
                .ec-mini-btn { border:1px solid #e5e7eb; background:#fff; color:#374151; border-radius:9px; padding:7px 10px; font-size:12px; font-weight:700; }
                .ec-mini-btn:hover { border-color:#c7d2fe; color:#4f46e5; background:#eef2ff; }
                .ec-raffle-summary { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
                .ec-raffle-chip { display:inline-flex; align-items:center; gap:4px; padding:4px 8px; border-radius:999px; background:#eef2ff; color:#4338ca; font-size:11px; font-weight:700; }
                .ec-raffle-item-wrap { border:1px solid #e5e7eb; border-radius:12px; padding:10px; background:#fff; margin-top:8px; }
                .ec-prize-img-row { margin-top:8px; display:flex; align-items:center; gap:8px; }
                .ec-prize-img-drop { flex:0 0 auto; width:72px; height:72px; border:2px dashed #d1d5db; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-direction:column; cursor:pointer; transition:border-color .15s,background .15s; font-size:11px; color:#9ca3af; text-align:center; overflow:hidden; }
                .ec-prize-img-drop:hover, .ec-prize-img-drop--over { border-color:#4f46e5; background:#eef2ff; color:#4f46e5; }
                .ec-prize-img-drop img { width:100%; height:100%; object-fit:cover; border-radius:8px; display:block; }
                .ec-prize-img-label { flex:1; min-width:0; font-size:11px; color:#6b7280; }
                .ec-prize-img-label strong { display:block; color:#374151; font-size:12px; margin-bottom:1px; }
                .ec-prize-img-clear { border:1px solid #fecaca; background:#fef2f2; color:#dc2626; border-radius:7px; padding:4px 8px; font-size:11px; font-weight:700; white-space:nowrap; }
                .ec-prize-img-clear:hover { background:#fee2e2; }
                @media(max-width:560px) { .ec-raffle-grid, .ec-raffle-item-grid { grid-template-columns:1fr; } .ec-icon-btn { width:100%; } }
                @media(max-width:639px){ #ecSheetPanel { max-height: 94vh; } }
            </style>
        `;
        document.body.appendChild(root);

        document.getElementById('ecSheetClose').addEventListener('click', _confirmClose);
        document.getElementById('ecSheetBackdrop').addEventListener('click', _confirmClose);
        document.getElementById('ecBackBtn').addEventListener('click', _back);
        document.getElementById('ecNextBtn').addEventListener('click', _next);
        document.getElementById('ecDraftBtn').addEventListener('click', () => _submit('draft'));
    }

    // ─── Open / Close ───────────────────────────────────────────────
    function open() {
        _ensureMounted();
        STATE.step = 0;
        STATE.bannerFile = null;
        STATE.bannerPreviewUrl = null;
        STATE.geocode = null;
        STATE.prizeImageFiles = {};
        STATE.prizeImagePreviews = {};
        Object.assign(STATE.form, {
            event_type: 'member', title: '', category: 'other', description: '',
            start_date: '', end_date: '', timezone: 'America/New_York',
            location_text: '', location_nickname: '',
            max_participants: '', rsvp_deadline: '',
            pricing_mode: 'free', rsvp_cost_dollars: '',
            raffle_enabled: false, raffle_entry_cost_dollars: '',
            raffle_config: null,
            member_only: false,
        });
        _render();

        const sheet = document.getElementById('ecSheet');
        const panel = document.getElementById('ecSheetPanel');
        const backdrop = document.getElementById('ecSheetBackdrop');
        sheet.classList.add('ec-open');
        backdrop.classList.remove('opacity-0', 'pointer-events-none');
        backdrop.classList.add('opacity-100');
        requestAnimationFrame(() => {
            panel.classList.remove('translate-y-full', 'sm:translate-y-4', 'sm:opacity-0');
            panel.classList.add('translate-y-0', 'sm:opacity-100');
        });
        document.body.style.overflow = 'hidden';
    }

    function close() {
        const sheet = document.getElementById('ecSheet');
        if (!sheet || !sheet.classList.contains('ec-open')) return;
        const panel = document.getElementById('ecSheetPanel');
        const backdrop = document.getElementById('ecSheetBackdrop');
        panel.classList.add('translate-y-full', 'sm:translate-y-4', 'sm:opacity-0');
        panel.classList.remove('translate-y-0', 'sm:opacity-100');
        backdrop.classList.add('opacity-0', 'pointer-events-none');
        backdrop.classList.remove('opacity-100');
        document.body.style.overflow = '';
        setTimeout(() => sheet.classList.remove('ec-open'), 250);
    }

    function _confirmClose() {
        if (STATE.form.title || STATE.bannerFile) {
            if (!confirm('Discard this event? Your draft will not be saved.')) return;
        }
        close();
    }

    // ─── Render ─────────────────────────────────────────────────────
    function _render() {
        // Step dots
        const dots = document.getElementById('ecSheetSteps');
        dots.innerHTML = STEPS.map((s, i) =>
            `<div class="ec-step-dot ${i === STATE.step ? 'active' : (i < STATE.step ? 'done' : '')}" title="${s.label}"></div>`
        ).join('');
        document.getElementById('ecSheetSub').textContent = `Step ${STATE.step + 1} of ${STEPS.length} · ${STEPS[STATE.step].label}`;

        // Footer button labels
        document.getElementById('ecBackBtn').style.visibility = STATE.step === 0 ? 'hidden' : 'visible';
        document.getElementById('ecNextBtn').textContent = STATE.step === STEPS.length - 1 ? 'Publish' : 'Next';

        // Step body
        const key = STEPS[STATE.step].key;
        const c = document.getElementById('ecSheetContent');
        if (key === 'basics')  { c.innerHTML = _basicsHtml();  _wireBasics(); }
        if (key === 'when')    { c.innerHTML = _whenHtml();    _wireWhen(); }
        if (key === 'pricing') { c.innerHTML = _pricingHtml(); _wirePricing(); }
        if (key === 'review')  { c.innerHTML = _reviewHtml();  _wireReview(); }
    }

    // ─── Step 1 — Basics ────────────────────────────────────────────
    function _basicsHtml() {
        const f = STATE.form;
        const types = [
            { key:'member', emoji:'👥', label:'Member event', sub:'Anyone can RSVP', enabled:true },
            { key:'llc',    emoji:'🏢', label:'LLC event',    sub:'Use legacy editor for now',  enabled:false },
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
            </div>
        `;
    }

    function _wireBasics() {
        document.querySelectorAll('[data-type]').forEach(el => {
            el.addEventListener('click', () => {
                if (el.dataset.disabled) return;
                STATE.form.event_type = el.dataset.type;
                _render();
            });
        });
        document.querySelectorAll('[data-cat]').forEach(el => {
            el.addEventListener('click', () => {
                STATE.form.category = el.dataset.cat;
                _render();
            });
        });
        document.getElementById('ecTitle')?.addEventListener('input', e => STATE.form.title = e.target.value);
        document.getElementById('ecDesc')?.addEventListener('input', e => STATE.form.description = e.target.value);

        const drop = document.getElementById('ecBannerDrop');
        const file = document.getElementById('ecBannerFile');

        // Show desktop hint on non-touch devices
        if (drop && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
            const dt = drop.querySelector('.ec-drop-hint-desktop');
            const tt = drop.querySelector('.ec-drop-hint-touch');
            if (dt) dt.style.display = '';
            if (tt) tt.style.display = 'none';
        }

        drop?.addEventListener('click', () => file.click());

        // Drag & drop (desktop only — touch devices don't fire dragover)
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
            const f = e.dataTransfer?.files?.[0];
            if (!f) return;
            if (!f.type.match(/^image\/(png|jpeg|webp)$/)) { alert('Please drop a PNG, JPG, or WebP image.'); return; }
            if (f.size > 5 * 1024 * 1024) { alert('File must be under 5 MB.'); return; }
            STATE.bannerFile = f;
            const r = new FileReader();
            r.onload = () => { STATE.bannerPreviewUrl = r.result; _render(); };
            r.readAsDataURL(f);
        });

        file?.addEventListener('change', () => {
            const f = file.files[0];
            if (!f) return;
            if (f.size > 5 * 1024 * 1024) { alert('File must be under 5 MB.'); return; }
            STATE.bannerFile = f;
            const r = new FileReader();
            r.onload = () => { STATE.bannerPreviewUrl = r.result; _render(); };
            r.readAsDataURL(f);
        });
        document.getElementById('ecBannerClear')?.addEventListener('click', () => {
            STATE.bannerFile = null; STATE.bannerPreviewUrl = null; _render();
        });
    }

    // ─── Step 2 — When & Where ──────────────────────────────────────
    function _whenHtml() {
        const f = STATE.form;
        return `
            <div class="ec-grid-2">
                <div class="ec-row">
                    <label class="ec-label">Starts</label>
                    <input id="ecStart" class="ec-input" type="datetime-local" value="${_esc(f.start_date)}">
                </div>
                <div class="ec-row">
                    <label class="ec-label">Ends (optional)</label>
                    <input id="ecEnd" class="ec-input" type="datetime-local" value="${_esc(f.end_date)}">
                </div>
            </div>

            <div class="ec-row">
                <label class="ec-label">Timezone</label>
                <select id="ecTz" class="ec-input">
                    ${TIMEZONES.map(tz => `<option value="${tz}" ${tz === f.timezone ? 'selected' : ''}>${tz.replace('_', ' ')}</option>`).join('')}
                </select>
            </div>

            <div class="ec-row">
                <label class="ec-label">Location nickname</label>
                <input id="ecLocNick" class="ec-input" type="text" maxlength="60" placeholder="e.g. Mom's house, Cabin in the woods" value="${_esc(f.location_nickname)}">
                <p class="ec-help">Shown on the banner instead of the full address.</p>
            </div>

            <div class="ec-row">
                <label class="ec-label">Address</label>
                <input id="ecLoc" class="ec-input" type="text" placeholder="123 Main St, City, ST" value="${_esc(f.location_text)}">
                <div id="ecLocStatus" class="ec-loc-status" style="color:#9ca3af">${STATE.geocode ? `📍 ${_esc(STATE.geocode.display || 'Located')}` : 'Type an address to geocode (optional).'}</div>
            </div>

            <div class="ec-grid-2">
                <div class="ec-row">
                    <label class="ec-label">Max attendees (optional)</label>
                    <input id="ecMax" class="ec-input" type="number" min="1" placeholder="No limit" value="${_esc(f.max_participants)}">
                </div>
                <div class="ec-row">
                    <label class="ec-label">RSVP deadline (optional)</label>
                    <input id="ecDeadline" class="ec-input" type="datetime-local" value="${_esc(f.rsvp_deadline)}">
                </div>
            </div>
        `;
    }

    let _locDebounce;
    function _wireWhen() {
        const get = id => document.getElementById(id);
        get('ecStart')?.addEventListener('input', e => STATE.form.start_date = e.target.value);
        get('ecEnd')?.addEventListener('input', e => STATE.form.end_date = e.target.value);
        get('ecTz')?.addEventListener('change', e => STATE.form.timezone = e.target.value);
        get('ecLocNick')?.addEventListener('input', e => STATE.form.location_nickname = e.target.value);
        get('ecMax')?.addEventListener('input', e => STATE.form.max_participants = e.target.value);
        get('ecDeadline')?.addEventListener('input', e => STATE.form.rsvp_deadline = e.target.value);
        const loc = get('ecLoc');
        loc?.addEventListener('input', e => {
            STATE.form.location_text = e.target.value;
            STATE.geocode = null;
            clearTimeout(_locDebounce);
            const status = get('ecLocStatus');
            if (status) { status.textContent = '…'; status.style.color = '#9ca3af'; }
            _locDebounce = setTimeout(_doGeocode, 700);
        });
    }

    async function _doGeocode() {
        const status = document.getElementById('ecLocStatus');
        const addr = (STATE.form.location_text || '').trim();
        if (!addr || addr.length < 6) {
            if (status) { status.textContent = 'Type an address to geocode (optional).'; status.style.color = '#9ca3af'; }
            return;
        }
        try {
            // Reuse existing helper if available
            if (typeof window.evtGeocodeAddress === 'function') {
                const r = await window.evtGeocodeAddress(addr);
                if (r && r.lat && r.lng) {
                    STATE.geocode = { lat: r.lat, lng: r.lng, display: r.display || addr };
                    if (status) { status.textContent = `📍 ${STATE.geocode.display}`; status.style.color = '#059669'; }
                    return;
                }
            }
            if (status) { status.textContent = '⚠️ Could not locate — saved as text only.'; status.style.color = '#d97706'; }
        } catch (_) {
            if (status) { status.textContent = '⚠️ Geocoding error — saved as text only.'; status.style.color = '#d97706'; }
        }
    }

    // ─── Step 3 — Pricing ───────────────────────────────────────────
    function _pricingHtml() {
        const f = STATE.form;
        const modes = [
            { key:'free',            label:'Free',            sub:'No payment required' },
            { key:'paid',            label:'Paid RSVP',       sub:'Stripe checkout on RSVP' },
            { key:'free_paid_raffle',label:'Free + paid raffle', sub:'Free entry, paid raffle entries' },
        ];
        const showRsvpCost = f.pricing_mode === 'paid';
        const showRaffleConfig = f.raffle_enabled;
        return `
            <div class="ec-row">
                <label class="ec-label">Pricing mode</label>
                <div style="display:flex;flex-direction:column;gap:8px">
                    ${modes.map(m => `
                        <label class="ec-checkbox-row" style="cursor:pointer">
                            <input type="radio" name="ecMode" value="${m.key}" ${f.pricing_mode === m.key ? 'checked' : ''}>
                            <div class="flex-1">
                                <div class="text-sm font-bold text-gray-800">${m.label}</div>
                                <div class="text-xs text-gray-500">${m.sub}</div>
                            </div>
                        </label>
                    `).join('')}
                </div>
            </div>

            ${showRsvpCost ? `
            <div class="ec-row">
                <label class="ec-label">RSVP price (USD)</label>
                <input id="ecCost" class="ec-input" type="number" min="0" step="0.01" placeholder="0.00" value="${_esc(f.rsvp_cost_dollars)}">
            </div>
            ` : ''}

            <div class="ec-row">
                <label class="ec-checkbox-row">
                    <input type="checkbox" id="ecRaffleEnabled" ${f.raffle_enabled ? 'checked' : ''}>
                    <div class="flex-1">
                        <div class="text-sm font-bold text-gray-800">Add a raffle</div>
                        <div class="text-xs text-gray-500">Members can buy raffle entries for prizes.</div>
                    </div>
                </label>
            </div>

            ${showRaffleConfig ? `
            ${_raffleBuilderHtml()}
            ` : ''}

            <div class="ec-row">
                <label class="ec-checkbox-row">
                    <input type="checkbox" id="ecMemberOnly" ${f.member_only ? 'checked' : ''}>
                    <div class="flex-1">
                        <div class="text-sm font-bold text-gray-800">Members only</div>
                        <div class="text-xs text-gray-500">Hide from the public event page; logged-in members only.</div>
                    </div>
                </label>
            </div>
        `;
    }

    function _raffleBuilderHtml() {
        const model = _raffleModel();
        const config = _ensureRaffleConfig();
        const categories = model.getOrderedCategories(config);
        const items = config.items || [];
        const validation = model.validateConfig(config);
        const totalWinners = model.getTotalWinnerCount(config);
        return `
            <div class="ec-row">
                <label class="ec-label">Raffle entry price (USD)</label>
                <input id="ecRafflePrice" class="ec-input" type="number" min="0" step="0.01" placeholder="0.00" value="${_esc(STATE.form.raffle_entry_cost_dollars)}">
                <p class="ec-help">Use 0.00 for a free raffle. Prize images come later; emoji fallbacks are available now.</p>
            </div>

            <div class="ec-row ec-raffle-box">
                <div class="ec-raffle-head">
                    <div>
                        <div class="text-sm font-extrabold text-gray-900">Prize categories</div>
                        <div class="text-xs text-gray-500">Draw order follows the category order below.</div>
                    </div>
                    <button type="button" class="ec-mini-btn" data-ec-raffle-add-category>Add category</button>
                </div>
                ${categories.map((category, index) => `
                    <div class="ec-raffle-section" data-ec-category-row="${index}">
                        <div class="ec-raffle-grid">
                            <div>
                                <label class="ec-label">Category</label>
                                <input class="ec-input" data-ec-category-field="label" data-ec-category-id="${_esc(category.id)}" value="${_esc(category.label)}" maxlength="80">
                            </div>
                            <div>
                                <label class="ec-label">Draw mode</label>
                                <select class="ec-input" data-ec-category-field="draw_mode" data-ec-category-id="${_esc(category.id)}">
                                    ${_drawModeOptions(category.draw_mode)}
                                </select>
                            </div>
                            <div>
                                <label class="ec-label">Winners</label>
                                <input class="ec-input" type="number" min="0" step="1" data-ec-category-field="winner_count" data-ec-category-id="${_esc(category.id)}" value="${category.winner_count ?? ''}">
                            </div>
                            <div style="display:flex;gap:4px">
                                <button type="button" class="ec-icon-btn" title="Move up" data-ec-category-move="up" data-ec-category-id="${_esc(category.id)}">↑</button>
                                <button type="button" class="ec-icon-btn" title="Move down" data-ec-category-move="down" data-ec-category-id="${_esc(category.id)}">↓</button>
                                <button type="button" class="ec-icon-btn" title="Remove" data-ec-category-remove="${_esc(category.id)}">×</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="ec-row ec-raffle-box">
                <div class="ec-raffle-head">
                    <div>
                        <div class="text-sm font-extrabold text-gray-900">Prize items</div>
                        <div class="text-xs text-gray-500">Add the items being given away. Emoji is used when no image is uploaded.</div>
                    </div>
                    <button type="button" class="ec-mini-btn" data-ec-raffle-add-item>Add item</button>
                </div>
                ${items.length ? items.map((item, index) => {
                    const preview = STATE.prizeImagePreviews[item.id] || item.image_url || null;
                    const fileName = STATE.prizeImageFiles[item.id]?.name || null;
                    return `
                    <div class="ec-raffle-item-wrap" data-ec-item-row="${index}">
                        <div class="ec-raffle-item-grid">
                            <div>
                                <label class="ec-label">Emoji</label>
                                <input class="ec-input" data-ec-item-field="emoji" data-ec-item-id="${_esc(item.id)}" value="${_esc(item.emoji || '🎁')}" maxlength="4">
                            </div>
                            <div>
                                <label class="ec-label">Item name</label>
                                <input class="ec-input" data-ec-item-field="name" data-ec-item-id="${_esc(item.id)}" value="${_esc(item.name)}" maxlength="120">
                            </div>
                            <div>
                                <label class="ec-label">Category</label>
                                <select class="ec-input" data-ec-item-field="category_id" data-ec-item-id="${_esc(item.id)}">
                                    ${categories.map(category => `<option value="${_esc(category.id)}" ${item.category_id === category.id ? 'selected' : ''}>${_esc(category.label)}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="ec-label">Qty</label>
                                <input class="ec-input" type="number" min="1" step="1" data-ec-item-field="quantity" data-ec-item-id="${_esc(item.id)}" value="${item.quantity || 1}">
                            </div>
                            <div style="display:flex;gap:4px">
                                <button type="button" class="ec-icon-btn" title="Move up" data-ec-item-move="up" data-ec-item-id="${_esc(item.id)}">↑</button>
                                <button type="button" class="ec-icon-btn" title="Move down" data-ec-item-move="down" data-ec-item-id="${_esc(item.id)}">↓</button>
                                <button type="button" class="ec-icon-btn" title="Remove" data-ec-item-remove="${_esc(item.id)}">×</button>
                            </div>
                        </div>
                        <div class="ec-prize-img-row">
                            <input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" data-ec-prize-file="${_esc(item.id)}">
                            <div class="ec-prize-img-drop" data-ec-prize-drop="${_esc(item.id)}" title="Click or drag an image here">
                                ${preview ? `<img src="${_esc(preview)}" alt="Prize image">` : `<span style="font-size:18px">📷</span>`}
                            </div>
                            <div class="ec-prize-img-label">
                                ${preview
                                    ? `<strong>${fileName ? _esc(fileName) : 'Image set'}</strong><span>Drag a new image or click the thumbnail to replace</span>`
                                    : `<strong>Prize image</strong><span>Click or drag &amp; drop a photo (PNG/JPG/WebP · max 5 MB)</span>`
                                }
                            </div>
                            ${preview ? `<button type="button" class="ec-prize-img-clear" data-ec-prize-clear="${_esc(item.id)}">Remove</button>` : ''}
                        </div>
                    </div>`;
                }).join('') : `<div class="text-xs text-gray-500 bg-white border border-dashed border-gray-300 rounded-xl p-3">No prize items yet. Add at least one item before publishing.</div>`}

                <div class="ec-raffle-summary">
                    <span class="ec-raffle-chip">${categories.length} categories</span>
                    <span class="ec-raffle-chip">${items.length} items</span>
                    <span class="ec-raffle-chip">${totalWinners} winners</span>
                </div>
                ${validation.valid ? '' : `<div class="ec-error" style="margin-top:10px">${validation.errors.map(_esc).join('<br>')}</div>`}
            </div>
        `;
    }

    function _drawModeOptions(selected) {
        const options = [
            ['specific_item', 'Specific items'],
            ['random_item', 'Random item in category'],
            ['winner_choice', 'Winner chooses later'],
        ];
        return options.map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`).join('');
    }

    function _wirePricing() {
        document.querySelectorAll('input[name="ecMode"]').forEach(el => {
            el.addEventListener('change', () => { STATE.form.pricing_mode = el.value; _render(); });
        });
        document.getElementById('ecCost')?.addEventListener('input', e => STATE.form.rsvp_cost_dollars = e.target.value);
        document.getElementById('ecRaffleEnabled')?.addEventListener('change', e => {
            STATE.form.raffle_enabled = e.target.checked;
            if (STATE.form.raffle_enabled) _ensureRaffleConfig();
            _render();
        });
        document.getElementById('ecRafflePrice')?.addEventListener('input', e => STATE.form.raffle_entry_cost_dollars = e.target.value);
        _wireRaffleBuilder();
        document.getElementById('ecMemberOnly')?.addEventListener('change', e => STATE.form.member_only = e.target.checked);
    }

    function _wireRaffleBuilder() {
        if (!STATE.form.raffle_enabled) return;
        document.querySelectorAll('[data-ec-category-field]').forEach(input => {
            input.addEventListener('input', () => _updateCategory(input.dataset.ecCategoryId, input.dataset.ecCategoryField, input.value));
            input.addEventListener('change', () => _updateCategory(input.dataset.ecCategoryId, input.dataset.ecCategoryField, input.value, true));
        });
        document.querySelectorAll('[data-ec-item-field]').forEach(input => {
            input.addEventListener('input', () => _updateItem(input.dataset.ecItemId, input.dataset.ecItemField, input.value));
            input.addEventListener('change', () => _updateItem(input.dataset.ecItemId, input.dataset.ecItemField, input.value, true));
        });
        document.querySelector('[data-ec-raffle-add-category]')?.addEventListener('click', () => {
            const model = _raffleModel();
            const config = _ensureRaffleConfig();
            const nextOrder = (config.categories.length + 1) * 10;
            config.categories.push(model.createCategory({ label: 'New Tier', sort_order: nextOrder, winner_count: 1 }));
            _normalizeRaffleConfig();
            _render();
        });
        document.querySelector('[data-ec-raffle-add-item]')?.addEventListener('click', () => {
            const model = _raffleModel();
            const config = _ensureRaffleConfig();
            if (!config.categories.length) config.categories.push(model.createCategory({ id: 'general', label: 'Raffle Prizes', sort_order: 10 }));
            const nextOrder = (config.items.length + 1) * 10;
            config.items.push(model.createItem({ category_id: config.categories[0].id, name: 'New prize item', sort_order: nextOrder }));
            _normalizeRaffleConfig();
            _render();
        });
        document.querySelectorAll('[data-ec-category-remove]').forEach(button => {
            button.addEventListener('click', () => _removeCategory(button.dataset.ecCategoryRemove));
        });
        document.querySelectorAll('[data-ec-item-remove]').forEach(button => {
            button.addEventListener('click', () => _removeItem(button.dataset.ecItemRemove));
        });
        document.querySelectorAll('[data-ec-category-move]').forEach(button => {
            button.addEventListener('click', () => _moveCategory(button.dataset.ecCategoryId, button.dataset.ecCategoryMove));
        });
        document.querySelectorAll('[data-ec-item-move]').forEach(button => {
            button.addEventListener('click', () => _moveItem(button.dataset.ecItemId, button.dataset.ecItemMove));
        });

        // ── Prize image upload (click + drag & drop) ──
        document.querySelectorAll('[data-ec-prize-drop]').forEach(zone => {
            const itemId = zone.dataset.ecPrizeDrop;
            const fileInput = document.querySelector(`[data-ec-prize-file="${CSS.escape(itemId)}"]`);
            if (!fileInput) return;

            zone.addEventListener('click', () => fileInput.click());

            zone.addEventListener('dragover', e => {
                e.preventDefault();
                zone.classList.add('ec-prize-img-drop--over');
            });
            zone.addEventListener('dragleave', e => {
                if (!zone.contains(e.relatedTarget)) zone.classList.remove('ec-prize-img-drop--over');
            });
            zone.addEventListener('drop', e => {
                e.preventDefault();
                zone.classList.remove('ec-prize-img-drop--over');
                const f = e.dataTransfer?.files?.[0];
                if (!f) return;
                _setPrizeImage(itemId, f);
            });

            fileInput.addEventListener('change', () => {
                const f = fileInput.files?.[0];
                if (!f) return;
                _setPrizeImage(itemId, f);
            });
        });
        document.querySelectorAll('[data-ec-prize-clear]').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.dataset.ecPrizeClear;
                delete STATE.prizeImageFiles[itemId];
                delete STATE.prizeImagePreviews[itemId];
                // Also clear stored image_url on the item
                const config = _ensureRaffleConfig();
                const item = config.items.find(i => i.id === itemId);
                if (item) item.image_url = null;
                _render();
            });
        });
    }

    function _setPrizeImage(itemId, file) {
        if (!file.type.match(/^image\/(png|jpeg|webp)$/)) { alert('Please use a PNG, JPG, or WebP image.'); return; }
        if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB.'); return; }
        STATE.prizeImageFiles[itemId] = file;
        const reader = new FileReader();
        reader.onload = () => { STATE.prizeImagePreviews[itemId] = reader.result; _render(); };
        reader.readAsDataURL(file);
    }

    function _raffleModel() {
        if (!window.EventsRaffleModel) throw new Error('Raffle model helper is not loaded.');
        return window.EventsRaffleModel;
    }

    function _ensureRaffleConfig() {
        const model = _raffleModel();
        if (!STATE.form.raffle_config) STATE.form.raffle_config = model.createDefaultConfig();
        STATE.form.raffle_config = model.normalizeConfig(STATE.form.raffle_config);
        return STATE.form.raffle_config;
    }

    function _normalizeRaffleConfig() {
        STATE.form.raffle_config = _raffleModel().normalizeConfig(STATE.form.raffle_config);
        return STATE.form.raffle_config;
    }

    function _updateCategory(categoryId, field, value, rerender = false) {
        const config = _ensureRaffleConfig();
        const category = config.categories.find(entry => entry.id === categoryId);
        if (!category) return;
        if (field === 'winner_count') category[field] = value === '' ? null : Math.max(0, Math.floor(Number(value) || 0));
        else category[field] = value;
        _normalizeRaffleConfig();
        if (rerender) _render();
    }

    function _updateItem(itemId, field, value, rerender = false) {
        const config = _ensureRaffleConfig();
        const item = config.items.find(entry => entry.id === itemId);
        if (!item) return;
        if (field === 'quantity') item[field] = Math.max(1, Math.floor(Number(value) || 1));
        else item[field] = value;
        _normalizeRaffleConfig();
        if (rerender) _render();
    }

    function _removeCategory(categoryId) {
        const config = _ensureRaffleConfig();
        if (config.categories.length <= 1) {
            alert('Keep at least one raffle category.');
            return;
        }
        config.categories = config.categories.filter(category => category.id !== categoryId);
        const fallbackCategoryId = config.categories[0]?.id || 'general';
        config.items.forEach(item => {
            if (item.category_id === categoryId) item.category_id = fallbackCategoryId;
        });
        _renumberSortOrders(config.categories);
        _normalizeRaffleConfig();
        _render();
    }

    function _removeItem(itemId) {
        const config = _ensureRaffleConfig();
        config.items = config.items.filter(item => item.id !== itemId);
        _renumberSortOrders(config.items);
        _normalizeRaffleConfig();
        _render();
    }

    function _moveCategory(categoryId, direction) {
        const config = _ensureRaffleConfig();
        _moveEntry(config.categories, categoryId, direction);
        _normalizeRaffleConfig();
        _render();
    }

    function _moveItem(itemId, direction) {
        const config = _ensureRaffleConfig();
        _moveEntry(config.items, itemId, direction);
        _normalizeRaffleConfig();
        _render();
    }

    function _moveEntry(entries, id, direction) {
        const ordered = [...entries].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));
        const index = ordered.findIndex(entry => entry.id === id);
        if (index < 0) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= ordered.length) return;
        const moving = ordered[index];
        ordered[index] = ordered[targetIndex];
        ordered[targetIndex] = moving;
        _renumberSortOrders(ordered);
        entries.splice(0, entries.length, ...ordered);
    }

    function _renumberSortOrders(entries) {
        entries.forEach((entry, index) => entry.sort_order = (index + 1) * 10);
    }

    // ─── Step 4 — Review ────────────────────────────────────────────
    function _reviewHtml() {
        const f = STATE.form;
        const cat = CATEGORIES.find(c => c.key === f.category)?.label || f.category;
        const start = f.start_date ? new Date(f.start_date).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '—';
        const pricingLabel = ({ free:'Free', paid:`Paid · $${f.rsvp_cost_dollars || '0.00'}`, free_paid_raffle:'Free + paid raffle' })[f.pricing_mode];
        return `
            <div id="ecError"></div>

            ${STATE.bannerPreviewUrl ? `<img src="${STATE.bannerPreviewUrl}" class="ec-banner-preview mb-3" alt="">` : ''}

            <div class="ec-review-card">
                <h3 class="font-bold text-gray-800 text-sm mb-2">${_esc(f.title || 'Untitled event')}</h3>
                <div class="ec-review-row"><span>Type</span><span>${f.event_type}</span></div>
                <div class="ec-review-row"><span>Category</span><span>${cat}</span></div>
                ${f.description ? `<div class="ec-review-row"><span>Description</span><span style="max-width:60%">${_esc(f.description.slice(0, 120))}${f.description.length > 120 ? '…' : ''}</span></div>` : ''}
            </div>

            <div class="ec-review-card">
                <h3 class="font-bold text-gray-800 text-sm mb-2">When & Where</h3>
                <div class="ec-review-row"><span>Starts</span><span>${start}</span></div>
                <div class="ec-review-row"><span>Timezone</span><span>${f.timezone}</span></div>
                ${f.location_nickname ? `<div class="ec-review-row"><span>Location</span><span>${_esc(f.location_nickname)}</span></div>` : ''}
                ${f.location_text ? `<div class="ec-review-row"><span>Address</span><span style="max-width:60%">${_esc(f.location_text)}${STATE.geocode ? ' 📍' : ''}</span></div>` : ''}
                ${f.max_participants ? `<div class="ec-review-row"><span>Max attendees</span><span>${f.max_participants}</span></div>` : ''}
            </div>

            <div class="ec-review-card">
                <h3 class="font-bold text-gray-800 text-sm mb-2">Pricing</h3>
                <div class="ec-review-row"><span>Mode</span><span>${pricingLabel}</span></div>
                <div class="ec-review-row"><span>Raffle</span><span>${f.raffle_enabled ? `Yes · $${f.raffle_entry_cost_dollars || '0.00'}/entry` : 'No'}</span></div>
                ${f.raffle_enabled ? _raffleReviewHtml() : ''}
                <div class="ec-review-row"><span>Visibility</span><span>${f.member_only ? 'Members only' : 'Public'}</span></div>
            </div>

            <p class="text-xs text-gray-400 text-center">Tap <strong>Publish</strong> to go live, or <strong>Save draft</strong> to finish later.</p>
        `;
    }

    function _raffleReviewHtml() {
        const model = _raffleModel();
        const config = _ensureRaffleConfig();
        return model.getOrderedCategories(config).map(category => {
            const items = model.getItemsForCategory(config, category.id);
            const itemText = items.length
                ? items.map(item => `${item.emoji || '🎁'} ${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`).join(', ')
                : 'No items yet';
            return `<div class="ec-review-row"><span>${_esc(category.label)}</span><span style="max-width:60%">${_esc(itemText)}</span></div>`;
        }).join('');
    }

    function _wireReview() { /* no-op */ }

    // ─── Validation ─────────────────────────────────────────────────
    function _validateStep() {
        const f = STATE.form;
        const key = STEPS[STATE.step].key;
        if (key === 'basics') {
            if (!f.title.trim()) return 'Title is required.';
            if (f.title.trim().length < 3) return 'Title must be at least 3 characters.';
            if (f.event_type !== 'member') return 'M4a only supports Member events. Use the legacy "Create Event" button for LLC or Competition.';
        }
        if (key === 'when') {
            if (!f.start_date) return 'Start date is required.';
            if (f.end_date && f.end_date < f.start_date) return 'End date must be after start date.';
            if (f.rsvp_deadline && f.rsvp_deadline > f.start_date) return 'RSVP deadline must be before the event starts.';
        }
        if (key === 'pricing') {
            if (f.pricing_mode === 'paid' && (!f.rsvp_cost_dollars || Number(f.rsvp_cost_dollars) <= 0)) return 'Paid events need a price greater than zero.';
            if (f.raffle_enabled && Number(f.raffle_entry_cost_dollars || 0) < 0) return 'Raffle entry price cannot be negative.';
            if (f.raffle_enabled) {
                const result = _raffleModel().validateConfig(_ensureRaffleConfig());
                if (!result.valid) return result.errors[0];
            }
        }
        return null;
    }

    function _back() {
        if (STATE.step === 0) return;
        STATE.step--;
        _render();
    }

    function _next() {
        const err = _validateStep();
        if (err) return alert(err);
        if (STATE.step < STEPS.length - 1) {
            STATE.step++;
            _render();
        } else {
            _submit('open');
        }
    }

    // ─── Submit ─────────────────────────────────────────────────────
    let _submitting = false;
    async function _submit(status) {
        if (_submitting) return;
        const err = _validateStep();
        if (err && status === 'open') return alert(err);

        const f = STATE.form;
        if (!f.title.trim()) return alert('Title is required to save.');
        if (status === 'open' && !f.start_date) return alert('Start date is required to publish.');

        const errBox = document.getElementById('ecError');
        if (errBox) errBox.innerHTML = '';

        _submitting = true;
        const nextBtn = document.getElementById('ecNextBtn');
        const draftBtn = document.getElementById('ecDraftBtn');
        const origNext = nextBtn?.textContent;
        const origDraft = draftBtn?.textContent;
        if (nextBtn)  nextBtn.disabled  = true;
        if (draftBtn) draftBtn.disabled = true;
        if (status === 'draft' && draftBtn) draftBtn.textContent = 'Saving…';
        if (status === 'open' && nextBtn)   nextBtn.textContent = 'Publishing…';

        try {
            const userId = (window.evtCurrentUser && window.evtCurrentUser.id) || (await supabaseClient.auth.getUser()).data.user?.id;
            if (!userId) throw new Error('Not signed in.');

            const slug = (typeof window.evtGenerateSlug === 'function')
                ? window.evtGenerateSlug(f.title.trim())
                : f.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '-' + Date.now().toString(36);

            // Banner upload (if any)
            let bannerUrl = null;
            if (STATE.bannerFile) {
                const ext  = STATE.bannerFile.name.split('.').pop();
                const path = `${slug}-${Date.now()}.${ext}`;
                const up = await supabaseClient.storage
                    .from('event-banners')
                    .upload(path, STATE.bannerFile, { contentType: STATE.bannerFile.type });
                if (up.error) throw new Error('Banner upload failed: ' + up.error.message);
                bannerUrl = supabaseClient.storage.from('event-banners').getPublicUrl(path).data.publicUrl;
            }

            // Prize image uploads (if any)
            const raffleConfig = f.raffle_enabled ? _raffleModel().normalizeConfig(_ensureRaffleConfig()) : null;
            if (raffleConfig) {
                const prizeUploads = Object.entries(STATE.prizeImageFiles);
                for (const [itemId, imgFile] of prizeUploads) {
                    const item = raffleConfig.items.find(i => i.id === itemId);
                    if (!item) continue;
                    const ext  = imgFile.name.split('.').pop().toLowerCase() || 'jpg';
                    const path = `${slug}/${itemId}-${Date.now()}.${ext}`;
                    const up   = await supabaseClient.storage
                        .from('event-raffle-prizes')
                        .upload(path, imgFile, { contentType: imgFile.type });
                    if (up.error) throw new Error(`Prize image upload failed: ${up.error.message}`);
                    item.image_url = supabaseClient.storage.from('event-raffle-prizes').getPublicUrl(path).data.publicUrl;
                }
            }
            const startISO = f.start_date ? new Date(f.start_date).toISOString() : null;
            const endISO   = f.end_date   ? new Date(f.end_date).toISOString()   : null;
            const deadline = f.rsvp_deadline ? new Date(f.rsvp_deadline).toISOString() : null;
            const rsvpCents = f.pricing_mode === 'paid' ? Math.round(Number(f.rsvp_cost_dollars || 0) * 100) : 0;
            const raffleCents = f.raffle_enabled ? Math.round(Number(f.raffle_entry_cost_dollars || 0) * 100) : 0;
            const raffleWinnerCount = raffleConfig ? _raffleModel().getTotalWinnerCount(raffleConfig) : 0;

            const record = {
                created_by: userId,
                event_type: 'member',
                title: f.title.trim(),
                slug,
                category: f.category,
                description: f.description.trim() || null,
                banner_url: bannerUrl,
                start_date: startISO,
                end_date: endISO,
                timezone: f.timezone,
                location_text: f.location_text.trim() || null,
                location_nickname: f.location_nickname.trim() || null,
                location_lat: STATE.geocode?.lat || null,
                location_lng: STATE.geocode?.lng || null,
                max_participants: f.max_participants ? Number(f.max_participants) : null,
                rsvp_deadline: deadline,
                member_only: !!f.member_only,
                pricing_mode: f.pricing_mode,
                rsvp_cost_cents: rsvpCents,
                raffle_enabled: !!f.raffle_enabled,
                raffle_entry_cost_cents: raffleCents,
                raffle_prizes: raffleConfig,
                raffle_winner_count: raffleWinnerCount,
                status,
            };

            const { data, error } = await supabaseClient.from('events').insert(record).select().single();
            if (error) throw error;

            close();
            // Notify host page so it can reload + navigate
            document.dispatchEvent(new CustomEvent('events:created', { detail: { event: data, status } }));

            if (status === 'open' && data.slug && typeof window.evtNavigateToEvent === 'function') {
                window.evtNavigateToEvent(data.slug);
            } else if (typeof window.evtLoadEvents === 'function') {
                window.evtLoadEvents();
            }
        } catch (e) {
            const msg = (e && e.message) ? e.message : String(e);
            const errBox2 = document.getElementById('ecError');
            if (errBox2) errBox2.innerHTML = `<div class="ec-error">${_esc(msg)}</div>`;
            else alert('Save failed: ' + msg);
        } finally {
            _submitting = false;
            if (nextBtn)  { nextBtn.disabled  = false; if (origNext)  nextBtn.textContent  = origNext; }
            if (draftBtn) { draftBtn.disabled = false; if (origDraft) draftBtn.textContent = origDraft; }
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────
    function _esc(s) {
        const el = document.createElement('span');
        el.textContent = s == null ? '' : String(s);
        return el.innerHTML;
    }

    // ─── Public surface ─────────────────────────────────────────────
    window.EventsCreate = { open, close, isFlagOn };
})();
