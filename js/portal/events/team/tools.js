/* ════════════════════════════════════════════════════════════
   Portal Events — Team Tools & CTA bar (Phase 5C)
   Tailwind-first; minimal CSS hooks in base.css for safe-area.
   ════════════════════════════════════════════════════════════ */

'use strict';

import { evtDataAction } from '../core/actions.js';
import {
    TW_CTA_BTN,
    TW_CTA_BAR,
    TW_CTA_ACTIONS,
    TW_CTA_RSVP,
    TW_CTA_RSVP_DONE,
    TW_CTA_MANAGE,
    TW_CTA_TEAM,
    TW_CTA_RAFFLE,
    TW_CTA_RAFFLE_OUTLINE,
    TW_CTA_RAFFLE_DONE,
    TW_CTA_DISABLED,
    TW_CTA_RAFFLE_LOCKED,
    TW_CTA_FOOTNOTE,
    TW_FLOATING_SHELL,
    TW_DESKTOP_OVERLAY,
    TW_PANEL_BASE,
    TW_PANEL_TOOLS,
    TW_CLOSE_BTN,
    TW_PANEL_HEAD,
    TW_PANEL_HEAD_TITLE,
    TW_PANEL_HEAD_SUB,
    TW_TOOL_BTN,
    TW_TOOL_MAIN,
    TW_TOOL_SUB,
    TW_TOOL_LIST,
    TW_RAFFLE_BUY,
    TW_TICKET_CARD,
    twPanelClasses,
    twAdd,
    twRemove,
    expandCtaSheet,
    collapseCtaSheet,
    unlockCtaSheetScroll,
} from './ui-tw.js';


const EVT_CTA_ICONS = {
    check:  '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>',
    ticket: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"/></svg>',
    lock:   '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>',
    manage: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
};

/** Legacy global hook — styles live in Tailwind (ui-tw.js). */
function injectTeamToolsStyles() { /* noop */ }

function raffleLockedCtaBtnHtml() {
    return `<button type="button" class="${TW_CTA_BTN} ${TW_CTA_RAFFLE_LOCKED}" disabled aria-disabled="true">${EVT_CTA_ICONS.ticket} Enter Raffle</button>`;
}

function canUseEventScanner(event, canManageEvent) {
    const checkinEnabled = event.checkin_enabled !== false;
    return checkinEnabled && canManageEvent
        && event.checkin_mode === 'attendee_ticket'
        && ['open', 'confirmed', 'active'].includes(event.status);
}

function teamToolsRow(label, sub, onClick, disabled) {
    const subHtml = sub ? `<span class="${TW_TOOL_SUB}">${sub}</span>` : '';
    if (disabled) {
        return `<button type="button" class="${TW_TOOL_BTN}" disabled aria-disabled="true"><span class="${TW_TOOL_MAIN}">${label}</span>${subHtml}</button>`;
    }
    return `<button type="button" class="${TW_TOOL_BTN}" onclick="${onClick}"><span class="${TW_TOOL_MAIN}">${label}</span>${subHtml}</button>`;
}

function buildTeamToolsPanelHtml(event, eventId, rsvp, myRaffleEntry, entriesClosed, eventIsFull, opts) {
    const { canManageEvent } = opts;
    const rsvpEnabled = event.rsvp_enabled !== false;
    const raffleEnabled = !!event.raffle_enabled;
    const canRsvp = rsvpEnabled && ['open', 'confirmed', 'active'].includes(event.status) && !entriesClosed;
    const hasGoingRsvp = typeof globalThis.evtIsGoingRsvp === 'function'
        ? window.evtIsGoingRsvp(rsvp)
        : !!(rsvp && (rsvp.status === 'going' || rsvp.paid === true));
    const rows = [];

    rows.push(teamToolsRow('Team Chat', 'Private team coordination', `evtCloseCtaPanel();evtOpenTeamChat('${eventId}')`, false));

    if (rsvpEnabled) {
        if (!canRsvp) {
            rows.push(teamToolsRow('RSVP as Myself', 'RSVP is closed for this event', '', true));
        } else if (eventIsFull && !hasGoingRsvp) {
            rows.push(teamToolsRow('RSVP as Myself', 'Event is full', '', true));
        } else if (hasGoingRsvp) {
            rows.push(teamToolsRow('RSVP as Myself', "You're RSVP'd — tap to update", `evtCloseCtaPanel();evtHandleRsvp('${eventId}','going')`, false));
        } else if (event.pricing_mode === 'paid') {
            rows.push(teamToolsRow('RSVP as Myself', `Paid RSVP — ${formatCurrency(event.rsvp_cost_cents)}`, `evtCloseCtaPanel();evtHandleRsvp('${eventId}','going')`, false));
        } else {
            rows.push(teamToolsRow('RSVP as Myself', 'Count yourself as going', `evtCloseCtaPanel();evtHandleRsvp('${eventId}','going')`, false));
        }
    }

    if (raffleEnabled) {
        const raffleBundled = typeof globalThis.evtIsRaffleBundledWithPaidRsvp === 'function'
            ? window.evtIsRaffleBundledWithPaidRsvp(event)
            : (event.pricing_mode === 'paid' && rsvpEnabled);
        if (raffleBundled) {
            rows.push(teamToolsRow('Enter Raffle', rsvp?.paid ? 'Included with your paid RSVP' : 'Included with paid RSVP', '', true));
        } else if (myRaffleEntry) {
            rows.push(teamToolsRow('Enter Raffle', 'Already entered', '', true));
        } else if (entriesClosed) {
            rows.push(teamToolsRow('Enter Raffle', 'Entries are closed', '', true));
        } else if (!hasGoingRsvp) {
            rows.push(teamToolsRow('Enter Raffle', 'RSVP first to enter the raffle', '', true));
        } else {
            rows.push(teamToolsRow('Enter Raffle', event.raffle_entry_cost_cents > 0 ? formatCurrency(event.raffle_entry_cost_cents) : 'Free entry', `evtOpenCtaPanel('raffle','${eventId}')`, false));
        }
    }

    if (hasGoingRsvp) {
        rows.push(teamToolsRow('View Ticket', 'Your RSVP confirmation', `evtOpenCtaPanel('ticket','${eventId}')`, false));
    }

    if (canUseEventScanner(event, canManageEvent)) {
        rows.push(teamToolsRow('Scanner', 'Scan attendee QR codes', `evtCloseCtaPanel();evtOpenScanner('${eventId}')`, false));
    }

    if (canManageEvent) {
        const manageClick = `evtCloseCtaPanel();(window.EventsManage?window.EventsManage.open('${eventId}',{source:'portal'}):(window.location='../admin/events.html?id=${eventId}'))`;
        rows.push(teamToolsRow('Manage Event', 'Hosts, RSVP, raffle, settings', manageClick, false));
    }

    return `<div class="${TW_TOOL_LIST}">${rows.join('')}</div>`;
}

function ensureCtaBarShell() {
    let bar = document.getElementById('evtCtaBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'evtCtaBar';
        bar.className = window.matchMedia('(min-width: 1024px)').matches
            ? `${TW_FLOATING_SHELL} ${TW_DESKTOP_OVERLAY}`
            : TW_CTA_BAR;
        bar.dataset.evtFloatingShell = '1';
        bar.innerHTML = `<div id="evtCtaPanel" class="${TW_PANEL_BASE} ${TW_PANEL_TOOLS} hidden"></div><div class="${TW_CTA_ACTIONS} lg:hidden" hidden aria-hidden="true"></div>`;
        document.body.appendChild(bar);
        document.body.classList.add('evt-cta-active');
    }
    return bar;
}

function applyDesktopTeamToolsOverlay(bar) {
    if (!bar || !window.matchMedia('(min-width: 1024px)').matches) return;
    twAdd(bar, TW_FLOATING_SHELL, TW_DESKTOP_OVERLAY);
    const actions = bar.querySelector('.evt-cta-actions');
    if (actions) actions.classList.add('lg:hidden');
    if (!bar.dataset.evtOverlayCloseBound) {
        bar.dataset.evtOverlayCloseBound = '1';
        bar.addEventListener('click', (e) => {
            if (e.target === bar) closeCtaPanel();
        });
    }
}

function setPanelLayout(panel, mode, { expanded = false, visible = true } = {}) {
    panel.className = twPanelClasses(mode, { expanded });
    panel.classList.toggle('hidden', !visible);
}

function closeCtaPanel() {
    if (typeof globalThis.evtCleanupTeamChat === 'function') window.evtCleanupTeamChat();
    const panel = document.getElementById('evtCtaPanel');
    const bar = document.getElementById('evtCtaBar');
    if (panel) {
        panel.classList.add('hidden');
        panel.innerHTML = '';
    }
    if (bar) {
        collapseCtaSheet(bar);
        twRemove(bar, TW_FLOATING_SHELL, TW_DESKTOP_OVERLAY);
        if (bar.dataset.evtFloatingShell === '1') {
            delete bar.dataset.evtFloatingShell;
            cleanupBottomNav();
            return;
        }
    }
}

function panelHead(title, sub) {
    return `<div class="${TW_PANEL_HEAD}"><strong class="${TW_PANEL_HEAD_TITLE}">${title}</strong><span class="${TW_PANEL_HEAD_SUB}">${sub}</span></div>`;
}

function openCtaPanel(kind, eventId) {
    const event = (window.evtAllEvents || globalThis.evtAllEvents).find(e => e.id === eventId);
    if (!event) return;
    const bar = ensureCtaBarShell();
    const panel = document.getElementById('evtCtaPanel');
    if (!panel) return;
    if (bar.dataset.evtFloatingShell === '1') applyDesktopTeamToolsOverlay(bar);

    const rsvp = (window.evtAllRsvps || globalThis.evtAllRsvps)[eventId];
    const closeBtn = `<button type="button" class="${TW_CLOSE_BTN}" ${evtDataAction('evtCloseCtaPanel')} aria-label="Close">×</button>`;
    expandCtaSheet(bar);
    setPanelLayout(panel, 'tools', { expanded: true, visible: true });

    const memberGoing = typeof globalThis.evtIsGoingRsvp === 'function'
        ? window.evtIsGoingRsvp(rsvp)
        : !!(rsvp && (rsvp.status === 'going' || rsvp.paid === true));

    if (kind === 'ticket') {
        const hasQr = memberGoing && rsvp?.qr_token && event.checkin_mode === 'attendee_ticket';
        panel.innerHTML = `
        ${closeBtn}
        ${panelHead("You're going", evtEscapeHtml(event.title || 'Event'))}
        <div class="${TW_TICKET_CARD}">
            ${hasQr ? '<canvas id="evtCtaTicketQR"></canvas><p>Show this QR code at check-in</p>' : '<div class="ed-notice"><span class="ed-notice-emoji">✅</span><div><p class="ed-notice-title">You are on the RSVP list</p><p class="ed-notice-sub">No QR ticket is required for this event.</p></div></div>'}
        </div>`;
        if (hasQr) {
            const canvas = document.getElementById('evtCtaTicketQR');
            const qrUrl = `${window.location.origin}/events/?e=${event.slug}&ticket=${rsvp.qr_token}`;
            (async () => {
                try {
                    const QRCode = typeof globalThis.evtEnsureQRCode === 'function'
                        ? await window.evtEnsureQRCode()
                        : window.QRCode;
                    if (QRCode && canvas?.isConnected) {
                        QRCode.toCanvas(canvas, qrUrl, { width: 172, margin: 2 });
                    }
                } catch (err) {
                    console.warn('CTA ticket QR failed:', err);
                }
            })();
        }
        return;
    }

    const raffleBundled = typeof globalThis.evtIsRaffleBundledWithPaidRsvp === 'function'
        ? window.evtIsRaffleBundledWithPaidRsvp(event)
        : (event.pricing_mode === 'paid' && event.rsvp_enabled !== false);
    if (raffleBundled) {
        panel.innerHTML = `
        ${closeBtn}
        ${panelHead('Raffle included', 'Raffle entry is included when you complete your paid RSVP for this event.')}`;
        return;
    }

    if (!memberGoing) {
        panel.innerHTML = `
        ${closeBtn}
        ${panelHead('RSVP first', 'Once you are going, this same member RSVP will be used for the raffle entry.')}
        <button type="button" onclick="globalThis.evtCtaRaffleIntent ='${eventId}';evtHandleRsvp('${eventId}','going')" class="${TW_RAFFLE_BUY}">RSVP to Enter Raffle</button>`;
        return;
    }

    const cost = event.raffle_entry_cost_cents || 0;
    panel.innerHTML = `
    ${closeBtn}
    ${panelHead('Enter the raffle', cost > 0 ? 'Confirm to start checkout. Raffle tickets are non-refundable.' : 'One tap and you are in the draw.')}
    <button type="button" onclick="${cost > 0 ? `evtHandleRaffleEntry('${eventId}')` : `evtHandleFreeRaffleEntry('${eventId}')`}" class="${TW_RAFFLE_BUY}">${cost > 0 ? `Buy Raffle Entry — ${formatCurrency(cost)}` : 'Enter Raffle — Free'}</button>`;
}

function openTeamToolsPanel(eventId) {
    if (typeof globalThis.evtCleanupTeamChat === 'function') window.evtCleanupTeamChat();
    const event = (window.evtAllEvents || globalThis.evtAllEvents).find(e => e.id === eventId);
    if (!event) return;

    const ctx = window.__evtTeamToolsCtx || {};
    const rsvp = (window.evtAllRsvps || globalThis.evtAllRsvps)[eventId];
    const myRaffleEntry = ctx.eventId === eventId ? ctx.myRaffleEntry : null;
    const entriesClosed = ctx.eventId === eventId ? !!ctx.entriesClosed : false;
    const eventIsFull = ctx.eventId === eventId ? !!ctx.eventIsFull : false;
    const canManageEvent = ctx.eventId === eventId ? !!ctx.canManageEvent : false;

    let bar = document.getElementById('evtCtaBar');
    if (!bar) bar = ensureCtaBarShell();
    applyDesktopTeamToolsOverlay(bar);
    const panel = document.getElementById('evtCtaPanel');
    if (!panel) return;

    const closeBtn = `<button type="button" class="${TW_CLOSE_BTN}" ${evtDataAction('evtCloseCtaPanel')} aria-label="Close">×</button>`;
    const actionsHtml = buildTeamToolsPanelHtml(event, eventId, rsvp, myRaffleEntry, entriesClosed, eventIsFull, { canManageEvent });

    expandCtaSheet(bar);
    setPanelLayout(panel, 'tools', { expanded: true, visible: true });
    panel.innerHTML = `
    ${closeBtn}
    ${panelHead('Event Tools', 'Team coordination and your personal RSVP, raffle, and ticket.')}
    ${actionsHtml}`;

    if (!window.__evtTeamToolsEscBound) {
        window.__evtTeamToolsEscBound = true;
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            const p = document.getElementById('evtCtaPanel');
            if (p && !p.classList.contains('hidden')) closeCtaPanel();
        });
    }
}

function cleanupBottomNav() {
    if (typeof globalThis.evtCleanupTeamChat === 'function') window.evtCleanupTeamChat();
    unlockCtaSheetScroll();
    const el = document.getElementById('evtCtaBar');
    if (el) el.remove();
    const hint = document.querySelector('.bottom-tab-bar .swipe-hint');
    if (hint) hint.style.display = '';
    document.body.classList.remove('evt-cta-active');
    if (typeof globalThis.evtCleanupHeroCollapse === 'function') window.evtCleanupHeroCollapse();
}

function initBottomNav(event, eventId, rsvp, myRaffleEntry, entriesClosed, eventIsFull, isHost, canAccessTeamHub) {
    cleanupBottomNav();

    // Desktop uses inline header actions (detail/sections.js); sticky bar is mobile-only.
    if (window.matchMedia('(min-width: 1024px)').matches) return;

    const rsvpEnabled  = event.rsvp_enabled !== false;
    const raffleEnabled = !!event.raffle_enabled;
    const teamHubAccess = !!canAccessTeamHub || isHost
        || (typeof canAccessAdminDashboard === 'function' && canAccessAdminDashboard());

    if (!isHost && !teamHubAccess && !rsvpEnabled && !raffleEnabled) return;

    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const canRsvp  = rsvpEnabled && ['open','confirmed','active'].includes(event.status) && !entriesClosed;

    let primaryBtn   = '';
    let secondaryBtn = '';
    let ctaFootnote  = '';

    const teamBtn = `<button type="button" class="${TW_CTA_BTN} ${TW_CTA_TEAM}" ${evtDataAction('evtOpenTeamToolsPanel', eventId)} aria-label="Open event team tools">Team</button>`;

    if (isHost) {
        primaryBtn = `<button type="button" class="${TW_CTA_BTN} ${TW_CTA_MANAGE}" onclick="window.EventsManage ? window.EventsManage.open('${eventId}',{source:'portal'}) : (window.location='../admin/events.html?id=${eventId}')">${EVT_CTA_ICONS.manage} Manage Event</button>`;
        if (teamHubAccess) secondaryBtn = teamBtn;
    } else if (teamHubAccess) {
        primaryBtn = teamBtn;
    } else {
        if (rsvpEnabled) {
            if (rsvp?.paid) {
                primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_RSVP_DONE}" ${evtDataAction('evtOpenCtaPanel', 'ticket', eventId)}>${EVT_CTA_ICONS.ticket} RSVP'd · Ticket</button>`;
            } else if (rsvp?.status === 'going') {
                primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_RSVP_DONE}" ${evtDataAction('evtOpenCtaPanel', 'ticket', eventId)}>${EVT_CTA_ICONS.ticket} Going · Ticket</button>`;
            } else if (canRsvp && !eventIsFull && event.pricing_mode === 'paid') {
                primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_RSVP}" ${evtDataAction('evtHandleRsvp', eventId, 'going')}>RSVP — ${formatCurrency(event.rsvp_cost_cents)}</button>`;
            } else if (canRsvp && !eventIsFull) {
                primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_RSVP}" ${evtDataAction('evtHandleRsvp', eventId, 'going')}>RSVP</button>`;
            } else if (eventIsFull) {
                primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_DISABLED}" disabled>${EVT_CTA_ICONS.lock} Full</button>`;
            } else {
                primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_DISABLED}" disabled>${EVT_CTA_ICONS.lock} ${isClosed ? 'Closed' : 'RSVP Closed'}</button>`;
            }
        }

        if (raffleEnabled) {
            const raffleIncluded = typeof globalThis.evtIsRaffleBundledWithPaidRsvp === 'function'
                ? window.evtIsRaffleBundledWithPaidRsvp(event)
                : (event.pricing_mode === 'paid' && rsvpEnabled);
            const memberGoingNav = typeof globalThis.evtIsGoingRsvp === 'function'
                ? window.evtIsGoingRsvp(rsvp)
                : !!(rsvp && (rsvp.status === 'going' || rsvp.paid === true));
            if (!raffleIncluded) {
                const hasPrimary = !!primaryBtn;
                const activeCls = hasPrimary ? TW_CTA_RAFFLE_OUTLINE : TW_CTA_RAFFLE;
                let raffleSlot = '';
                if (myRaffleEntry) {
                    raffleSlot = `<button class="${TW_CTA_BTN} ${TW_CTA_RAFFLE_DONE}" disabled>${EVT_CTA_ICONS.check} Entered</button>`;
                } else if (entriesClosed) {
                    raffleSlot = `<button class="${TW_CTA_BTN} ${TW_CTA_DISABLED}" disabled>${EVT_CTA_ICONS.lock} Entries Closed</button>`;
                } else if (!memberGoingNav) {
                    raffleSlot = raffleLockedCtaBtnHtml();
                    ctaFootnote = `<p class="${TW_CTA_FOOTNOTE}">RSVP first to enter the raffle</p>`;
                } else if (event.raffle_entry_cost_cents > 0) {
                    raffleSlot = `<button class="${TW_CTA_BTN} ${activeCls}" ${evtDataAction('evtOpenCtaPanel', 'raffle', eventId)}>${EVT_CTA_ICONS.ticket} Raffle — ${formatCurrency(event.raffle_entry_cost_cents)}</button>`;
                } else {
                    raffleSlot = `<button class="${TW_CTA_BTN} ${activeCls}" ${evtDataAction('evtOpenCtaPanel', 'raffle', eventId)}>${EVT_CTA_ICONS.ticket} Enter Raffle</button>`;
                }
                if (hasPrimary) {
                    secondaryBtn = raffleSlot;
                } else {
                    primaryBtn = raffleSlot;
                }
            }
        }
    }

    if (!primaryBtn && !secondaryBtn) return;

    const bar = document.createElement('div');
    bar.id = 'evtCtaBar';
    bar.className = TW_CTA_BAR + (ctaFootnote ? ' evt-cta-bar-has-footnote' : '');
    bar.innerHTML = `<div id="evtCtaPanel" class="${TW_PANEL_BASE} ${TW_PANEL_TOOLS} hidden"></div><div class="${TW_CTA_ACTIONS}">${primaryBtn + secondaryBtn}</div>${ctaFootnote}`;
    document.body.appendChild(bar);
    document.body.classList.add('evt-cta-active');

    const hint = document.querySelector('.bottom-tab-bar .swipe-hint');
    if (hint) hint.style.display = 'none';
}

export const teamToolsApi = {
    injectStyles: injectTeamToolsStyles,
    ensureCtaBarShell,
    applyDesktopTeamToolsOverlay,
    buildPanelHtml: buildTeamToolsPanelHtml,
    open: openTeamToolsPanel,
    closePanel: closeCtaPanel,
    openCtaPanel,
    initBottomNav,
    cleanupBottomNav,
    raffleLockedCtaBtnHtml,
};

globalThis.evtInjectTeamToolsStyles = injectTeamToolsStyles;
globalThis.evtEnsureCtaBarShell = ensureCtaBarShell;
globalThis.evtApplyDesktopTeamToolsOverlay = applyDesktopTeamToolsOverlay;
globalThis.evtOpenTeamToolsPanel = openTeamToolsPanel;
globalThis.evtCloseCtaPanel = closeCtaPanel;
globalThis.evtOpenCtaPanel = openCtaPanel;
globalThis.evtInitBottomNav = initBottomNav;
globalThis.evtCleanupBottomNav = cleanupBottomNav;

const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
PortalEvents.team = PortalEvents.team || {};
PortalEvents.team.tools = teamToolsApi;
