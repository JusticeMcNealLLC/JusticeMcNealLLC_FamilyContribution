// Portal Events — Team sheet shell (mirrors manage/shell.js)

'use strict';

const ET_TABS = [
    { key: 'tools', label: 'Tools' },
    { key: 'chat', label: 'Chat' },
];

function api() {
    return window.EventsTeamShellApi || {};
}

function getState() {
    return api().getState?.() || {};
}

function ensureMounted() {
    if (document.getElementById('etSheetRoot')) return;
    const root = document.createElement('div');
    root.id = 'etSheetRoot';
    root.innerHTML = `
        <div id="etSheetBackdrop" class="fixed inset-0 bg-black/40 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-200 z-[60]"></div>
        <div id="etSheet" class="et-sheet-hidden fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none z-[61]">
            <div id="etSheetPanel" class="bg-white w-full sm:max-w-3xl sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-none translate-y-full sm:translate-y-4 sm:opacity-0 transition-all duration-300 flex flex-col" style="max-height:90vh">
                <header id="etSheetHeader" class="px-5 sm:px-6 pt-4 pb-3 border-b border-gray-100 flex items-start gap-3 flex-shrink-0">
                    <div class="flex-1 min-w-0">
                        <p class="text-[11px] uppercase tracking-wide font-bold text-brand-600">Event Team</p>
                        <h2 id="etSheetTitle" class="text-lg sm:text-xl font-extrabold text-gray-900 truncate">…</h2>
                        <p id="etSheetSub" class="text-xs text-gray-400 mt-0.5"></p>
                    </div>
                    <button id="etSheetClose" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0" aria-label="Close">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </header>
                <nav id="etSheetTabs" class="flex gap-1 px-3 sm:px-4 border-b border-gray-100 overflow-x-auto flex-shrink-0" style="scrollbar-width:none;-ms-overflow-style:none"></nav>
                <div id="etSheetContent" class="flex-1 overflow-y-auto px-5 sm:px-6 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"></div>
            </div>
        </div>
        <style>
            .et-sheet-hidden { display:none !important; }
            #etSheetTabs::-webkit-scrollbar { display: none; }
            #etSheetContent.et-sheet-content-chat { overflow:hidden; display:flex; flex-direction:column; min-height:0; padding-bottom:0; }
            .et-tab { white-space:nowrap; padding:10px 12px; font-size:13px; font-weight:600; color:#6b7280; border-bottom:2px solid transparent; transition:color .15s,border-color .15s; cursor:pointer; background:none; border-top:none; border-left:none; border-right:none; }
            .et-tab:hover { color:#374151; }
            .et-tab.active { color:#4f46e5; border-bottom-color:#4f46e5; }
            .em-card { background:#fff; border:1px solid rgba(0,0,0,.06); border-radius:16px; padding:16px; }
            .em-op-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
            .em-op-card { min-height:120px; display:flex; flex-direction:column; gap:8px; cursor:pointer; transition:box-shadow .15s,border-color .15s; border:1px solid rgba(0,0,0,.06); border-radius:16px; padding:16px; background:#fff; text-align:left; width:100%; }
            .em-op-card:hover:not(:disabled) { border-color:rgba(79,70,229,.25); box-shadow:0 4px 14px rgba(15,23,42,.06); }
            .em-op-card:disabled { opacity:.55; cursor:not-allowed; }
            .em-op-title { font-size:15px; font-weight:800; color:#111827; margin:0; line-height:1.15; }
            .em-op-copy { font-size:12px; line-height:1.45; color:#6b7280; margin:0; }
            .em-section-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:12px; }
            .em-section-title { margin:0; color:#111827; font-size:14px; font-weight:850; }
            .em-section-sub { margin:3px 0 0; color:#94a3b8; font-size:12px; line-height:1.4; }
            .em-btn-primary { background:#4f46e5; color:#fff; padding:9px 14px; border-radius:10px; font-size:13px; font-weight:700; border:none; cursor:pointer; width:100%; }
            .em-btn-primary:hover { background:#4338ca; }
            .em-btn-ghost { background:#f3f4f6; color:#374151; padding:8px 14px; border-radius:10px; font-size:13px; font-weight:600; border:none; cursor:pointer; }
            .em-btn-ghost:hover { background:#e5e7eb; }
            .em-placeholder { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; text-align:center; color:#9ca3af; }
            .et-tools-back { margin-bottom:12px; }
            @media(max-width:639px){ #etSheetPanel { max-height: 92vh; } .em-op-grid { grid-template-columns:1fr; } }
        </style>
    `;
    document.body.appendChild(root);

    document.getElementById('etSheetClose').addEventListener('click', () => api().onClose?.());
    document.getElementById('etSheetBackdrop').addEventListener('click', () => api().onClose?.());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('etSheet')?.classList.contains('et-open')) api().onClose?.();
    });
}

function renderHeader() {
    const e = getState().event;
    if (!e) return;
    document.getElementById('etSheetTitle').textContent = e.title;
    const dateStr = new Date(e.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const typeLabel = ({ llc: 'LLC', member: 'Member', competition: 'Competition' })[e.event_type] || e.event_type;
    document.getElementById('etSheetSub').textContent = `${typeLabel} · ${dateStr} · Team coordination`;
}

function renderTabs() {
    const STATE = getState();
    const bar = document.getElementById('etSheetTabs');
    const showTabs = STATE.toolsView === 'list';
    bar.style.display = showTabs ? '' : 'none';
    if (!showTabs) return;
    bar.innerHTML = ET_TABS.map(t =>
        `<button type="button" class="et-tab${t.key === STATE.activeTab ? ' active' : ''}" data-tab="${t.key}">${t.label}</button>`
    ).join('');
    bar.querySelectorAll('.et-tab').forEach(btn => {
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
    document.getElementById('etSheetContent').innerHTML = html;
}

function setContentMode(mode) {
    const el = document.getElementById('etSheetContent');
    if (!el) return;
    el.classList.toggle('et-sheet-content-chat', mode === 'chat');
}

function setLoadingChrome() {
    document.getElementById('etSheetTitle').textContent = 'Loading…';
    document.getElementById('etSheetSub').textContent = '';
    renderTabs();
    setContentMode('default');
    renderContent('<div class="em-placeholder"><div style="font-size:13px">Loading…</div></div>');
}

function openPanel() {
    const sheet = document.getElementById('etSheet');
    const panel = document.getElementById('etSheetPanel');
    const backdrop = document.getElementById('etSheetBackdrop');
    sheet.classList.remove('et-sheet-hidden');
    sheet.classList.add('et-open');
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    backdrop.classList.add('opacity-100');
    requestAnimationFrame(() => {
        panel.classList.remove('pointer-events-none', 'translate-y-full', 'sm:translate-y-4', 'sm:opacity-0');
        panel.classList.add('pointer-events-auto', 'translate-y-0', 'sm:opacity-100');
    });
    document.body.style.overflow = 'hidden';
}

function closePanel() {
    const sheet = document.getElementById('etSheet');
    const panel = document.getElementById('etSheetPanel');
    const backdrop = document.getElementById('etSheetBackdrop');
    if (!sheet || !sheet.classList.contains('et-open')) return;
    panel.classList.add('pointer-events-none', 'translate-y-full', 'sm:translate-y-4', 'sm:opacity-0');
    panel.classList.remove('pointer-events-auto', 'translate-y-0', 'sm:opacity-100');
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    backdrop.classList.remove('opacity-100');
    document.body.style.overflow = '';
    setTimeout(() => {
        sheet.classList.remove('et-open');
        sheet.classList.add('et-sheet-hidden');
    }, 250);
}

export const teamShellApi = {
    ensureMounted,
    renderHeader,
    renderTabs,
    renderContent,
    setContentMode,
    setLoadingChrome,
    openPanel,
    closePanel,
    getTabs: () => ET_TABS,
};

globalThis.EventsTeamShell = teamShellApi;
