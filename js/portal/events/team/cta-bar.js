// Portal Events — Mobile bottom CTA bar (non-team RSVP/ticket/raffle)

'use strict';

import { evtDataAction } from '../core/actions.js';
import {
    TW_CTA_BTN,
    TW_CTA_BAR,
    TW_CTA_ACTIONS,
    TW_CTA_RSVP,
    TW_CTA_RSVP_DONE,
    TW_CTA_RAFFLE,
    TW_CTA_RAFFLE_OUTLINE,
    TW_CTA_RAFFLE_DONE,
    TW_CTA_DISABLED,
    TW_CTA_RAFFLE_LOCKED,
    TW_CTA_COMP,
    TW_CTA_COMP_DONE,
    TW_CTA_FOOTNOTE,
} from './ui-tw.js';

const EVT_CTA_ICONS = {
    check:  '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>',
    ticket: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"/></svg>',
    lock:   '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>',
    manage: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
    team:   '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path stroke-linecap="round" stroke-linejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
};

const TW_CTA_PANEL = 'evt-cta-panel relative flex w-full flex-col min-h-0 flex-1 overflow-y-auto px-4 py-3 max-lg:border-0 max-lg:bg-transparent';
const TW_CTA_PANEL_EXPANDED = 'evt-cta-bar-expanded max-lg:top-[max(6px,env(safe-area-inset-top))] max-lg:bottom-[calc(56px+env(safe-area-inset-bottom))] max-lg:justify-end max-lg:gap-2.5 max-lg:overflow-hidden max-lg:overscroll-none max-lg:bg-white/95 max-lg:backdrop-blur-xl max-lg:shadow-[0_-6px_28px_rgba(15,23,42,0.1)] max-lg:border-t max-lg:border-black/5';
const TW_CTA_CLOSE = 'absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border-0 bg-gray-100 text-lg font-bold leading-none text-gray-700';

let _ctaSheetScrollY = 0;

function lockCtaScroll() {
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    if (document.body.dataset.evtCtaSheetLocked === '1') return;
    _ctaSheetScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.dataset.evtCtaSheetLocked = '1';
    document.documentElement.classList.add('evt-cta-sheet-open');
    document.body.classList.add('evt-cta-sheet-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${_ctaSheetScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
}

function unlockCtaScroll() {
    if (document.body.dataset.evtCtaSheetLocked !== '1') return;
    delete document.body.dataset.evtCtaSheetLocked;
    document.documentElement.classList.remove('evt-cta-sheet-open');
    document.body.classList.remove('evt-cta-sheet-open');
    const y = _ctaSheetScrollY;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, y);
}

function expandCtaBar(bar) {
    if (!bar) return;
    bar.classList.add(...TW_CTA_PANEL_EXPANDED.split(/\s+/).filter(Boolean));
    lockCtaScroll();
}

function collapseCtaBar(bar) {
    if (bar) bar.classList.remove(...TW_CTA_PANEL_EXPANDED.split(/\s+/).filter(Boolean));
    unlockCtaScroll();
}

function cleanupDetailFabs() {
    document.getElementById('evtDetailFabs')?.remove();
}

function mountDetailFabs(eventId, { manage, team }) {
    cleanupDetailFabs();
    if (!manage && !team) return;

    const manageBtn = manage
        ? `<button type="button" class="evt-detail-fab evt-detail-fab--manage" aria-label="Manage event" onclick="window.EventsManage ? window.EventsManage.open('${eventId}',{source:'portal'}) : (window.location='../admin/events.html?id=${eventId}')">${EVT_CTA_ICONS.manage}</button>`
        : '';
    const teamBtn = team
        ? `<button type="button" class="evt-detail-fab evt-detail-fab--team evt-cta-team" aria-label="Open event team tools" onclick="window.EventsTeam.open('${eventId}',{tab:'tools'})">${EVT_CTA_ICONS.team}</button>`
        : '';

    const wrap = document.createElement('div');
    wrap.id = 'evtDetailFabs';
    wrap.className = 'evt-detail-fabs';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Event tools');
    // Team above, Manage closest to the thumb (same corner as Create).
    wrap.innerHTML = teamBtn + manageBtn;
    document.body.appendChild(wrap);
}

function raffleLockedCtaBtnHtml() {
    return `<button type="button" class="${TW_CTA_BTN} ${TW_CTA_RAFFLE_LOCKED}" disabled aria-disabled="true">${EVT_CTA_ICONS.ticket} Enter Raffle</button>`;
}

function closeCtaPanel() {
    const panel = document.getElementById('evtCtaPanel');
    const bar = document.getElementById('evtCtaBar');
    if (panel) {
        panel.classList.add('hidden');
        panel.innerHTML = '';
    }
    if (bar) collapseCtaBar(bar);
}

function openCtaPanel(kind, eventId) {
    const event = (window.evtAllEvents || globalThis.evtAllEvents).find(e => e.id === eventId);
    if (!event) return;
    const bar = document.getElementById('evtCtaBar');
    const panel = document.getElementById('evtCtaPanel');
    if (!bar || !panel) return;

    const rsvp = (window.evtAllRsvps || globalThis.evtAllRsvps)[eventId];
    const Panels = window.EventsTeamPanels || {};
    const closeBtn = `<button type="button" class="${TW_CTA_CLOSE}" ${evtDataAction('evtCloseCtaPanel')} aria-label="Close">×</button>`;

    expandCtaBar(bar);
    panel.className = TW_CTA_PANEL;
    panel.classList.remove('hidden');

    if (kind === 'ticket' && Panels.ticketHtml) {
        panel.innerHTML = `${closeBtn}${Panels.ticketHtml(event, rsvp, { variant: 'cta', canvasId: 'evtCtaTicketQR' })}`;
        Panels.wireTicketQr?.(event, rsvp, { canvasId: 'evtCtaTicketQR' });
        return;
    }

    if (kind === 'raffle' && Panels.raffleHtml) {
        panel.innerHTML = `${closeBtn}${Panels.raffleHtml(event, eventId, rsvp, { variant: 'cta' })}`;
    }
}

function cleanupBottomNav() {
    closeCtaPanel();
    unlockCtaScroll();
    cleanupDetailFabs();
    const el = document.getElementById('evtCtaBar');
    if (el) el.remove();
    const hint = document.querySelector('.bottom-tab-bar .swipe-hint');
    if (hint) hint.style.display = '';
    document.body.classList.remove('evt-cta-active');
    if (typeof globalThis.evtCleanupHeroCollapse === 'function') window.evtCleanupHeroCollapse();
}

function initBottomNav(event, eventId, rsvp, myRaffleEntry, entriesClosed, eventIsFull, isHost, canAccessTeamHub, myCompetitionEntry, competitionPhases, myCompVote) {
    cleanupBottomNav();

    if (window.matchMedia('(min-width: 1024px)').matches) return;

    const isCompetition = event.event_type === 'competition';
    const rsvpEnabled = event.rsvp_enabled !== false;
    const raffleEnabled = !!event.raffle_enabled;
    const teamHubAccess = !!canAccessTeamHub || isHost
        || (typeof canAccessAdminDashboard === 'function' && canAccessAdminDashboard());

    if (!isHost && !teamHubAccess && !rsvpEnabled && !raffleEnabled && !isCompetition) return;

    if (isHost || teamHubAccess) {
        mountDetailFabs(eventId, { manage: !!isHost, team: !!teamHubAccess });
        return;
    }

    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const canRsvp = rsvpEnabled && ['open', 'confirmed', 'active'].includes(event.status) && !entriesClosed;
    const compPh = window.EventsCompetitionPhases || {};
    const phases = compPh.normalizePhases ? compPh.normalizePhases(competitionPhases) : (competitionPhases || []);
    const displayPhaseNum = compPh.resolveDisplayPhase ? compPh.resolveDisplayPhase(phases, new Date()) : 0;
    const votingOpen = compPh.isVotingOpen ? compPh.isVotingOpen(phases, new Date()) : false;
    const submissionOpen = compPh.isSubmissionOpen ? compPh.isSubmissionOpen(phases, new Date()) : false;
    const hasSubmission = compPh.entryHasSubmission ? compPh.entryHasSubmission(myCompetitionEntry) : false;
    const entryFee = event.competition_config?.entry_fee_cents || 0;
    const showCompJoin = isCompetition && !isHost && !teamHubAccess && displayPhaseNum <= 1 && !isClosed;
    const showCompSubmit = isCompetition && !isHost && !teamHubAccess && submissionOpen && !!myCompetitionEntry && !isClosed;
    const memberGoingNav = typeof globalThis.evtIsCommittedGoing === 'function'
        ? window.evtIsCommittedGoing(event, rsvp)
        : (window.EventsHelpers?.rsvpIsCommittedGoing?.(event, rsvp)
            || !!(rsvp && (event.pricing_mode === 'paid' ? rsvp.paid === true : (rsvp.status === 'going' || rsvp.paid === true))));
    const voterCtx = { hasRsvp: memberGoingNav, hasCompEntry: !!myCompetitionEntry };
    const voterEligible = compPh.isVoterEligible
        ? compPh.isVoterEligible(event.competition_config || {}, voterCtx)
        : true;
    const showCompVote = isCompetition && !isHost && !teamHubAccess && votingOpen && voterEligible && !isClosed;

    let primaryBtn = '';
    let secondaryBtn = '';
    let ctaFootnote = '';

    if (showCompJoin) {
            if (myCompetitionEntry) {
                primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_COMP_DONE}" disabled>${EVT_CTA_ICONS.check} Registered</button>`;
            } else if (entryFee > 0) {
                primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_COMP}" ${evtDataAction('evtJoinCompetition', eventId)}>${EVT_CTA_ICONS.ticket} Join — ${formatCurrency(entryFee)}</button>`;
            } else {
                primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_COMP}" ${evtDataAction('evtJoinCompetition', eventId)}>${EVT_CTA_ICONS.ticket} Join as Competitor</button>`;
            }
        } else if (showCompSubmit) {
            if (hasSubmission) {
                primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_COMP_DONE}" disabled>${EVT_CTA_ICONS.check} Submitted</button>`;
            } else {
                primaryBtn = `<button type="button" class="${TW_CTA_BTN} ${TW_CTA_COMP}" onclick="document.getElementById('competition-section')?.scrollIntoView({behavior:'smooth',block:'start'})">📤 Submit your entry</button>`;
            }
        } else if (showCompVote) {
            if (myCompVote) {
                primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_COMP_DONE}" disabled>${EVT_CTA_ICONS.check} Voted</button>`;
            } else {
                primaryBtn = `<button type="button" class="${TW_CTA_BTN} ${TW_CTA_COMP}" onclick="document.getElementById('competition-section')?.scrollIntoView({behavior:'smooth',block:'start'})">🗳️ Cast your vote</button>`;
            }
        }

        if (rsvpEnabled) {
            const plan = (globalThis.evtMyPaymentPlans || {})[eventId] || null;
            const hasDraft = !!(window.EventsRsvpWizard?.hasDraft?.(eventId, 'member'));
            const cta = (window.EventsHelpers?.rsvpCtaState)
                ? window.EventsHelpers.rsvpCtaState(event, { rsvp, plan, hasDraft })
                : null;

            if (cta?.kind === 'going') {
                const cancelBtn = cta.showCancel
                    ? `<button type="button" class="${TW_CTA_BTN} ed-cta-cancel-btn" ${evtDataAction('evtCancelMyParticipation', eventId)} aria-label="${cta.cancelLabel || 'Cancel'}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        <span>${cta.cancelLabel || 'Cancel'}</span>
                       </button>`
                    : '';
                const sub = cta.subLabel ? ` · ${cta.subLabel}` : '';
                primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_RSVP_DONE}" ${evtDataAction('evtOpenCtaPanel', 'ticket', eventId)}>${EVT_CTA_ICONS.ticket} ${cta.label}${sub}</button>${cancelBtn}`;
            } else if (cta?.kind === 'continue') {
                primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_RSVP}" ${evtDataAction('evtHandleRsvp', eventId, 'going')}>Continue RSVP</button>`;
            } else if (canRsvp && !eventIsFull && event.pricing_mode === 'paid') {
                const adultPrice = typeof globalThis.evtDetailAdultPriceCents === 'function'
                    ? globalThis.evtDetailAdultPriceCents(event)
                    : (event.adult_price_cents ?? event.rsvp_cost_cents ?? 0);
                const kidsPricingVaries = event.kids_free !== false
                    || (event.kid_price_cents != null && Number(event.kid_price_cents) !== Number(adultPrice));
                const label = kidsPricingVaries
                    ? 'RSVP'
                    : `RSVP — ${formatCurrency(adultPrice)}`;
                primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_RSVP}" ${evtDataAction('evtHandleRsvp', eventId, 'going')}>${label}</button>`;
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
            const memberGoingNav = typeof globalThis.evtIsCommittedGoing === 'function'
                ? window.evtIsCommittedGoing(event, rsvp)
                : (window.EventsHelpers?.rsvpIsCommittedGoing?.(event, rsvp)
                    || !!(rsvp && (event.pricing_mode === 'paid' ? rsvp.paid === true : (rsvp.status === 'going' || rsvp.paid === true))));
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
                if (hasPrimary) secondaryBtn = raffleSlot;
                else primaryBtn = raffleSlot;
            }
        }

    if (!primaryBtn && !secondaryBtn) return;

    const bar = document.createElement('div');
    bar.id = 'evtCtaBar';
    bar.className = TW_CTA_BAR + (ctaFootnote ? ' evt-cta-bar-has-footnote' : '');
    bar.innerHTML = `<div id="evtCtaPanel" class="${TW_CTA_PANEL} hidden"></div><div class="${TW_CTA_ACTIONS}">${primaryBtn + secondaryBtn}</div>${ctaFootnote}`;
    document.body.appendChild(bar);
    document.body.classList.add('evt-cta-active');

    const hint = document.querySelector('.bottom-tab-bar .swipe-hint');
    if (hint) hint.style.display = 'none';

    if (!window.__evtCtaPanelEscBound) {
        window.__evtCtaPanelEscBound = true;
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            const p = document.getElementById('evtCtaPanel');
            if (p && !p.classList.contains('hidden')) closeCtaPanel();
        });
    }
}

export const teamCtaBarApi = {
    initBottomNav,
    cleanupBottomNav,
    openCtaPanel,
    closeCtaPanel,
    raffleLockedCtaBtnHtml,
};

globalThis.evtInitBottomNav = initBottomNav;
globalThis.evtCleanupBottomNav = cleanupBottomNav;
globalThis.evtOpenCtaPanel = openCtaPanel;
globalThis.raffleLockedCtaBtnHtml = raffleLockedCtaBtnHtml;
