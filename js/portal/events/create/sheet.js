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
        embedImageFile: null,
        embedImagePreviewUrl: null,
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
                .ec-embed-preview { width:100%; max-width:240px; aspect-ratio:4/5; object-fit:cover; border-radius:12px; display:block; }
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
        STATE.embedImageFile = null;
        STATE.embedImagePreviewUrl = null;
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
        if (STATE.form.title || STATE.bannerFile || STATE.embedImageFile) {
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
        const steps = window.EventsCreateSteps || {};
        if (key === 'basics' && steps.basics)  { c.innerHTML = steps.basics.html();  steps.basics.wire(); }
        if (key === 'when' && steps.when)      { c.innerHTML = steps.when.html();    steps.when.wire(); }
        if (key === 'pricing' && steps.pricing){ c.innerHTML = steps.pricing.html(); steps.pricing.wire(); }
        if (key === 'review' && steps.review)  { c.innerHTML = steps.review.html();  steps.review.wire(); }
    }

    function _raffleApi() {
        return window.EventsCreateRaffleBuilder;
    }

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
                const rb = _raffleApi();
                const result = rb.raffleModel().validateConfig(rb.ensureRaffleConfig());
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

    function _submit(status) {
        window.EventsCreateSubmit.submit(status);
    }

    // ─── Helpers ────────────────────────────────────────────────────
    function _esc(s) {
        const el = document.createElement('span');
        el.textContent = s == null ? '' : String(s);
        return el.innerHTML;
    }

    function _bindCreateStepsApi() {
        window.EventsCreateSteps = window.EventsCreateSteps || {};
        window.EventsCreateSteps.getState = () => STATE;
        window.EventsCreateSteps.render = _render;
        window.EventsCreateSteps.validateStep = _validateStep;
        window.EventsCreateSteps.close = close;
        window.EventsCreateSteps.esc = _esc;
        window.EventsCreateSteps.CATEGORIES = CATEGORIES;
        window.EventsCreateSteps.TIMEZONES = TIMEZONES;
        const rb = _raffleApi();
        window.EventsCreateSteps.raffleBuilderHtml = rb.builderHtml;
        window.EventsCreateSteps.raffleReviewHtml = rb.reviewHtml;
        window.EventsCreateSteps.ensureRaffleConfig = rb.ensureRaffleConfig;
        window.EventsCreateSteps.wireRaffleBuilder = rb.wire;
    }

    _bindCreateStepsApi();

    // ─── Public surface ─────────────────────────────────────────────
    window.EventsCreate = { open, close, isFlagOn };

    // PortalEvents.create namespace bridge (additive — preserves window.EventsCreate)
    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.create = window.PortalEvents.create || {};
    window.PortalEvents.create.open = open;
    window.PortalEvents.create.close = close;
    window.PortalEvents.create.isFlagOn = isFlagOn;
})();
