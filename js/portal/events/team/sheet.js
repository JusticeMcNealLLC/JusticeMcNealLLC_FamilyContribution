// Portal Events — Team sheet orchestrator (mirrors manage/sheet.js)

'use strict';

const STATE = {
    eventId: null,
    event: null,
    activeTab: 'tools',
    toolsView: 'list',
    ctx: {},
};

const Shell = window.EventsTeamShell;
const ToolsList = window.EventsTeamToolsList;
const Panels = window.EventsTeamPanels;

function ctxForEvent(eventId) {
    const ctx = window.__evtTeamToolsCtx || {};
    if (ctx.eventId !== eventId) return {};
    return ctx;
}

function renderToolsTab() {
    const { event, eventId, ctx, toolsView } = STATE;
    if (!event || !eventId) return;

    const rsvp = (window.evtAllRsvps || globalThis.evtAllRsvps)[eventId];
    Shell.setContentMode('default');

    if (toolsView === 'ticket') {
        Shell.renderContent(Panels.ticketHtml(event, rsvp, { variant: 'sheet' }));
        Panels.wireTicketQr(event, rsvp);
        return;
    }

    if (toolsView === 'raffle') {
        Shell.renderContent(Panels.raffleHtml(event, eventId, rsvp, { variant: 'sheet' }));
        return;
    }

    Shell.renderContent(ToolsList.toolsHtml(
        event,
        eventId,
        rsvp,
        ctx.myRaffleEntry ?? null,
        !!ctx.entriesClosed,
        !!ctx.eventIsFull,
        { canManageEvent: !!ctx.canManageEvent },
    ));
}

function renderTab(tab) {
    const prevTab = STATE.activeTab;
    STATE.activeTab = tab;
    if (tab === 'chat') {
        Shell.setContentMode('chat');
        const chat = globalThis.PortalEvents?.team?.chat;
        if (chat?.initTab) chat.initTab(STATE.eventId, STATE.event);
        return;
    }
    if (tab === 'tools' && prevTab === 'chat') STATE.toolsView = 'list';
    Shell.renderTabs();
    renderToolsTab();
}

function open(eventId, opts = {}) {
    if (!eventId) return;

    const event = (window.evtAllEvents || globalThis.evtAllEvents).find(e => e.id === eventId);
    if (!event) return;

    Shell.ensureMounted();
    STATE.eventId = eventId;
    STATE.event = event;
    STATE.ctx = ctxForEvent(eventId);
    STATE.activeTab = Shell.getTabs().some(t => t.key === opts.tab) ? opts.tab : 'tools';
    STATE.toolsView = opts.toolsView || 'list';

    Shell.setLoadingChrome();
    Shell.openPanel();
    Shell.renderHeader();
    Shell.renderTabs();
    renderTab(STATE.activeTab);
}

function collapseCtaOverlay() {
    const panel = document.getElementById('evtCtaPanel');
    const bar = document.getElementById('evtCtaBar');
    if (panel) {
        panel.classList.add('hidden');
        panel.innerHTML = '';
    }
    if (bar) {
        bar.classList.remove('evt-cta-bar-expanded');
        if (document.body.dataset.evtCtaSheetLocked === '1') {
            document.documentElement.classList.remove('evt-cta-sheet-open');
            document.body.classList.remove('evt-cta-sheet-open');
            const y = parseInt(document.body.style.top || '0', 10) * -1 || 0;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.width = '';
            delete document.body.dataset.evtCtaSheetLocked;
            window.scrollTo(0, y);
        }
    }
}

function close() {
    if (typeof globalThis.evtCleanupTeamChat === 'function') window.evtCleanupTeamChat();
    Shell.closePanel();
    STATE.eventId = null;
    STATE.event = null;
    STATE.toolsView = 'list';
    STATE.activeTab = 'tools';
    STATE.ctx = {};
}

function closeLegacyCtaPanel() {
    collapseCtaOverlay();
    if (document.getElementById('etSheet')?.classList.contains('et-open')) close();
}

function openToolsView(view) {
    if (!['ticket', 'raffle'].includes(view)) return;
    STATE.toolsView = view;
    Shell.renderTabs();
    renderToolsTab();
}

function backToToolsList() {
    STATE.toolsView = 'list';
    Shell.renderTabs();
    renderToolsTab();
}

globalThis.EventsTeamShellApi = {
    getState: () => STATE,
    onClose: closeLegacyCtaPanel,
    renderTab,
};

export const eventsTeamApi = { open, close, openToolsView, backToToolsList };

globalThis.EventsTeam = eventsTeamApi;
globalThis.evtOpenTeamToolsPanel = (eventId) => open(eventId, { tab: 'tools', toolsView: 'list' });
globalThis.evtCloseCtaPanel = closeLegacyCtaPanel;
globalThis.evtOpenTeamChat = (eventId) => open(eventId, { tab: 'chat' });

const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
PortalEvents.team = PortalEvents.team || {};
PortalEvents.team.open = eventsTeamApi.open;
PortalEvents.team.close = eventsTeamApi.close;
PortalEvents.team.openToolsView = eventsTeamApi.openToolsView;
PortalEvents.team.backToToolsList = eventsTeamApi.backToToolsList;
