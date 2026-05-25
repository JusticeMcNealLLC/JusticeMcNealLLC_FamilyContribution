// Portal Events — Manage sheet shell (Phase 5M.3A)

'use strict';

const M3A_TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'images',   label: 'Images'   },
    { key: 'rsvps',    label: 'RSVPs'    },
    { key: 'money',    label: 'Money'    },
    { key: 'docs',     label: 'Docs'     },
    { key: 'raffle',   label: 'Raffle'   },
    { key: 'comp',     label: 'Comp'     },
    { key: 'danger',   label: 'Danger Zone' },
];

function api() {
    return window.EventsManageShellApi || {};
}

function getState() {
    return api().getState?.() || {};
}

    function ensureMounted() {
    if (document.getElementById('emSheetRoot')) return;
    const root = document.createElement('div');
    root.id = 'emSheetRoot';
    root.innerHTML = `
        <div id="emSheetBackdrop" class="fixed inset-0 bg-black/40 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-200 z-[60]"></div>
        <div id="emSheet" class="em-sheet-hidden fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none z-[61]">
            <div id="emSheetPanel" class="bg-white w-full sm:max-w-3xl sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-none translate-y-full sm:translate-y-4 sm:opacity-0 transition-all duration-300 flex flex-col" style="max-height:90vh">
                <header id="emSheetHeader" class="px-5 sm:px-6 pt-4 pb-3 border-b border-gray-100 flex items-start gap-3 flex-shrink-0">
                    <div class="flex-1 min-w-0">
                        <p class="text-[11px] uppercase tracking-wide font-bold text-brand-600">Manage Event</p>
                        <h2 id="emSheetTitle" class="text-lg sm:text-xl font-extrabold text-gray-900 truncate">…</h2>
                        <p id="emSheetSub" class="text-xs text-gray-400 mt-0.5"></p>
                    </div>
                    <button id="emSheetClose" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0" aria-label="Close">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </header>
                <nav id="emSheetTabs" class="flex gap-1 px-3 sm:px-4 border-b border-gray-100 overflow-x-auto flex-shrink-0" style="scrollbar-width:none;-ms-overflow-style:none"></nav>
                <div id="emSheetContent" class="flex-1 overflow-y-auto px-5 sm:px-6 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"></div>
            </div>
        </div>
        <style>
            .em-sheet-hidden { display:none !important; }
            #emSheetTabs::-webkit-scrollbar { display: none; }
            .em-tab { white-space:nowrap; padding:10px 12px; font-size:13px; font-weight:600; color:#6b7280; border-bottom:2px solid transparent; transition:color .15s,border-color .15s; cursor:pointer; }
            .em-tab:hover { color:#374151; }
            .em-tab.active { color:#4f46e5; border-bottom-color:#4f46e5; }
            .em-tab.placeholder { color:#cbd5e1; }
            .em-tab.placeholder.active { color:#9ca3af; border-bottom-color:#cbd5e1; }
            .em-card { background:#fff; border:1px solid rgba(0,0,0,.06); border-radius:16px; padding:16px; }
            .em-op-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:12px; }
            .em-op-card { min-height:150px; display:flex; flex-direction:column; gap:12px; }
            .em-op-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
            .em-op-kicker { font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:#9ca3af; margin:0 0 3px; }
            .em-op-title { font-size:15px; font-weight:800; color:#111827; margin:0; line-height:1.15; }
            .em-op-icon { width:34px; height:34px; border-radius:12px; display:flex; align-items:center; justify-content:center; background:#f3f4f6; flex-shrink:0; }
            .em-op-copy { font-size:12px; line-height:1.45; color:#6b7280; margin:0; }
            .em-op-meta { margin-top:auto; display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
            .em-op-chip { display:inline-flex; align-items:center; gap:4px; padding:4px 8px; border-radius:999px; background:#f8fafc; color:#475569; font-size:11px; font-weight:700; }
            .em-op-progress { height:7px; border-radius:999px; overflow:hidden; background:#eef2f7; margin-top:auto; }
            .em-op-progress span { display:block; height:100%; width:0; border-radius:inherit; background:#4f46e5; }
            .em-command-card { background:linear-gradient(135deg,#111827,#312e81); color:#fff; border:0; overflow:hidden; position:relative; }
            .em-command-card:after { content:""; position:absolute; width:180px; height:180px; border-radius:50%; background:rgba(255,255,255,.08); right:-70px; top:-80px; }
            .em-command-eyebrow { font-size:10px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#c7d2fe; margin:0 0 6px; }
            .em-command-title { font-size:20px; font-weight:850; margin:0; line-height:1.15; }
            .em-command-copy { font-size:12px; line-height:1.5; color:#dbeafe; margin:8px 0 0; max-width:560px; }
            .em-metric-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
            .em-metric { background:#fff; border:1px solid rgba(15,23,42,.06); border-radius:16px; padding:13px; min-width:0; }
            .em-metric span { display:block; font-size:10px; font-weight:800; letter-spacing:.08em; color:#94a3b8; text-transform:uppercase; }
            .em-metric strong { display:block; margin-top:5px; font-size:22px; line-height:1; color:#0f172a; }
            .em-metric small { display:block; margin-top:5px; color:#64748b; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            .em-section-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:12px; }
            .em-section-title { margin:0; color:#111827; font-size:14px; font-weight:850; }
            .em-section-sub { margin:3px 0 0; color:#94a3b8; font-size:12px; line-height:1.4; }
            .em-attendee-card { display:flex; gap:12px; align-items:flex-start; padding:13px 0; border-top:1px solid #f1f5f9; }
            .em-attendee-card:first-of-type { border-top:0; padding-top:0; }
            .em-attendee-main { flex:1; min-width:0; }
            .em-attendee-name { margin:0; font-size:14px; font-weight:800; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            .em-attendee-sub { margin:2px 0 0; color:#64748b; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            .em-money-layout { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(260px,.9fr); gap:12px; align-items:start; }
            .em-money-row { display:flex; justify-content:space-between; gap:14px; padding:11px 0; border-top:1px solid #f1f5f9; font-size:13px; }
            .em-money-row:first-child { border-top:0; padding-top:0; }
            .em-money-row span { color:#64748b; }
            .em-money-row strong { color:#111827; }
            .em-stat { display:flex; flex-direction:column; gap:4px; }
            .em-stat-label { font-size:11px; text-transform:uppercase; letter-spacing:.04em; font-weight:600; color:#6b7280; }
            .em-stat-num { font-size:24px; font-weight:800; color:#111827; }
            .em-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f1f5f9; }
            .em-row:last-child { border-bottom:none; }
            .em-avatar { width:32px; height:32px; border-radius:50%; background:#e0e7ff; color:#4f46e5; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; overflow:hidden; }
            .em-avatar img { width:100%; height:100%; object-fit:cover; }
            .em-pill { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
            .em-pill-going { background:#d1fae5; color:#065f46; }
            .em-pill-maybe { background:#fce7f3; color:#9d174d; }
            .em-pill-not { background:#fee2e2; color:#991b1b; }
            .em-pill-paid { background:#fef3c7; color:#92400e; }
            .em-pill-checked { background:#ede9fe; color:#5b21b6; }
            .em-danger-card { background:#fef2f2; border:1px solid #fecaca; border-radius:14px; padding:14px; margin-bottom:10px; }
            .em-danger-title { font-weight:700; color:#991b1b; font-size:14px; }
            .em-danger-sub { font-size:12px; color:#7f1d1d; margin-top:2px; margin-bottom:10px; }
            .em-btn-danger { background:#dc2626; color:#fff; padding:8px 14px; border-radius:10px; font-size:13px; font-weight:600; border:none; cursor:pointer; }
            .em-btn-danger:hover { background:#b91c1c; }
            .em-btn-ghost { background:#f3f4f6; color:#374151; padding:8px 14px; border-radius:10px; font-size:13px; font-weight:600; border:none; cursor:pointer; }
            .em-btn-ghost:hover { background:#e5e7eb; }
            .em-btn-primary { background:#4f46e5; color:#fff; padding:9px 14px; border-radius:10px; font-size:13px; font-weight:700; border:none; cursor:pointer; }
            .em-btn-primary:hover { background:#4338ca; }
            .em-btn-primary:disabled { opacity:.55; cursor:not-allowed; }
            .em-input { width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:9px 11px; font-size:13px; color:#111827; background:#fff; }
            .em-input:focus { outline:none; border-color:#818cf8; box-shadow:0 0 0 3px rgba(129,140,248,.18); }
            .em-textarea { width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:9px 11px; font-size:13px; color:#111827; background:#fff; resize:vertical; min-height:92px; }
            .em-textarea:focus { outline:none; border-color:#818cf8; box-shadow:0 0 0 3px rgba(129,140,248,.18); }
            .em-placeholder { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; text-align:center; color:#9ca3af; }
            .em-placeholder svg { width:48px; height:48px; margin-bottom:12px; opacity:.4; }
            @media(max-width:639px){
                #emSheetPanel { max-height: 92vh; }
                .em-op-grid { grid-template-columns:1fr; }
                .em-metric-grid { grid-template-columns:1fr 1fr; }
                .em-money-layout { grid-template-columns:1fr; }
            }
            @media(min-width:640px) and (max-width:900px){ .em-op-grid { grid-template-columns:1fr 1fr; } .em-money-layout { grid-template-columns:1fr; } }
        </style>
    `;
    document.body.appendChild(root);

    document.getElementById('emSheetClose').addEventListener('click', () => api().onClose?.());
    document.getElementById('emSheetBackdrop').addEventListener('click', () => api().onClose?.());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('emSheet')?.classList.contains('em-open')) api().onClose?.();
    });
}

function renderHeader() {
    const e = getState().event;
    if (!e) return;
    document.getElementById('emSheetTitle').textContent = e.title;
    const dateStr = new Date(e.start_date).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
    const typeLabel = ({ llc:'LLC', member:'Member', competition:'Competition' })[e.event_type] || e.event_type;
    document.getElementById('emSheetSub').textContent = `${typeLabel} · ${dateStr} · ${(e.status || '').toUpperCase()}`;
}

// ─── Tab bar ────────────────────────────────────────────────────
function renderTabs() {
    const STATE = getState();
    const bar = document.getElementById('emSheetTabs');
    bar.innerHTML = M3A_TABS.map(t =>
        `<button class="em-tab${t.placeholder ? ' placeholder' : ''}${t.key === STATE.activeTab ? ' active' : ''}" data-tab="${t.key}">${t.label}${t.placeholder ? ' <span style="font-size:9px;opacity:.7">soon</span>' : ''}</button>`
    ).join('');
    bar.querySelectorAll('.em-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const st = getState();
            st.activeTab = btn.dataset.tab;
            renderTabs();
            api().renderTab?.(st.activeTab);
            btn.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
        });
    });
}

function renderContent(html) {
    document.getElementById('emSheetContent').innerHTML = html;
}


function setLoadingChrome() {
    document.getElementById('emSheetTitle').textContent = 'Loading event…';
    document.getElementById('emSheetSub').textContent = '';
    renderTabs();
    renderContent('<div class="em-placeholder"><div style="font-size:13px">Loading…</div></div>');
}

function openPanel() {
    const sheet = document.getElementById('emSheet');
    const panel = document.getElementById('emSheetPanel');
    const backdrop = document.getElementById('emSheetBackdrop');
    sheet.classList.remove('em-sheet-hidden');
    sheet.classList.add('em-open');
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    backdrop.classList.add('opacity-100');
    requestAnimationFrame(() => {
        panel.classList.remove('pointer-events-none', 'translate-y-full', 'sm:translate-y-4', 'sm:opacity-0');
        panel.classList.add('pointer-events-auto', 'translate-y-0', 'sm:opacity-100');
    });
    document.body.style.overflow = 'hidden';
}

function closePanel() {
    const sheet = document.getElementById('emSheet');
    const panel = document.getElementById('emSheetPanel');
    const backdrop = document.getElementById('emSheetBackdrop');
    if (!sheet || !sheet.classList.contains('em-open')) return;
    panel.classList.add('pointer-events-none', 'translate-y-full', 'sm:translate-y-4', 'sm:opacity-0');
    panel.classList.remove('pointer-events-auto', 'translate-y-0', 'sm:opacity-100');
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    backdrop.classList.remove('opacity-100');
    document.body.style.overflow = '';
    setTimeout(() => {
        sheet.classList.remove('em-open');
        sheet.classList.add('em-sheet-hidden');
    }, 250);
}


export const manageShellApi = {
    ensureMounted,
    renderHeader,
    renderTabs,
    renderContent,
    setLoadingChrome,
    openPanel,
    closePanel,
    getTabs: () => M3A_TABS,
};

globalThis.EventsManageShell = manageShellApi;
