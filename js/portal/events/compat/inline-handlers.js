'use strict';

// Inventory only — not loaded by portal/events.html until an explicit compat gate (Phase 5J.3+).
var EXPECTED_HANDLER_GROUPS = {
    rsvp: ['evtHandleRsvp', 'evtHandleRaffleEntry', 'evtHandleFreeRaffleEntry', 'evtRequestGraceRefund'],
    waitlist: ['evtJoinWaitlist', 'evtLeaveWaitlist', 'evtClaimWaitlistSpot'],
    raffle: ['evtOpenRaffleDraw', 'evtDrawWinner'],
    competition: [
        'evtJoinCompetition',
        'evtSubmitEntry',
        'evtCastVote',
        'evtModerateEntry',
        'evtContributeToPrizePool',
        'evtStartPhase',
        'evtAdvancePhase',
        'evtFinalizeCompetition'
    ],
    documents: ['evtOpenDocumentsPanel', 'evtUploadDocument', 'evtDeleteDocument'],
    scrapbook: ['evtUploadPhoto', 'evtDeletePhoto', 'evtViewPhoto'],
    map: ['evtInitMap', 'evtToggleLocationSharing'],
    scanner: ['evtOpenScanner', 'evtCloseScanner'],
    team: ['evtOpenTeamToolsPanel', 'evtOpenTeamChat', 'evtCloseCtaPanel', 'evtInitBottomNav'],
    detail: ['evtOpenDetail', 'evtNavigateToEvent', 'evtNavigateToList'],
    detailTemplate: [
        'evtOpenLightbox',
        'evtOpenFullscreenMap',
        'evtPostComment',
        'evtNavigateToList'
    ],
    detailSections: [
        'evtHandleRsvp',
        'evtHandleRaffleEntry',
        'evtHandleFreeRaffleEntry',
        'evtOpenTeamToolsPanel',
        'evtMessageHost',
        'evtCopyShareUrl',
        'evtDownloadIcs',
        'evtJoinWaitlist',
        'evtLeaveWaitlist',
        'evtClaimWaitlistSpot',
        'evtRequestGraceRefund',
        'evtUpdateStatus',
        'evtCancelEvent',
        'evtRescheduleEvent',
        'evtDuplicateEvent',
        'evtDeleteEvent',
        'EventsManage.open'
    ],
    postRender: [],
    create: [],
    manage: [],
    comments: ['evtPostComment', 'evtLoadComments']
};

function getRoot() {
    if (typeof window !== 'undefined') return window;
    if (typeof globalThis !== 'undefined') return globalThis;
    return null;
}

function createSummary() {
    return {
        installed: [],
        preserved: [],
        skipped: [],
        replaced: []
    };
}

function mergeSummary(target, source) {
    target.installed = target.installed.concat(source.installed);
    target.preserved = target.preserved.concat(source.preserved);
    target.skipped = target.skipped.concat(source.skipped);
    target.replaced = target.replaced.concat(source.replaced);
    return target;
}

function assignHandler(name, fn, options) {
    var root = getRoot();
    var summary = createSummary();
    var replaceExisting = !!(options && options.replaceExisting);

    if (!root || !name || typeof fn !== 'function') {
        summary.skipped.push(name || '');
        return summary;
    }

    if (typeof root[name] === 'function' && !replaceExisting) {
        summary.preserved.push(name);
        return summary;
    }

    if (typeof root[name] === 'function' && replaceExisting) {
        root[name] = fn;
        summary.replaced.push(name);
        return summary;
    }

    root[name] = fn;
    summary.installed.push(name);
    return summary;
}

function assignHandlers(handlers, options) {
    var summary = createSummary();
    if (!handlers) return summary;

    Object.keys(handlers).forEach(function (name) {
        mergeSummary(summary, assignHandler(name, handlers[name], options));
    });

    return summary;
}

function installInlineHandlers(groups, options) {
    var summary = createSummary();
    if (!groups) return summary;

    Object.keys(groups).forEach(function (groupName) {
        mergeSummary(summary, assignHandlers(groups[groupName], options));
    });

    return summary;
}

var InlineHandlers = {
    getRoot: getRoot,
    assignHandler: assignHandler,
    assignHandlers: assignHandlers,
    installInlineHandlers: installInlineHandlers,
    EXPECTED_HANDLER_GROUPS: EXPECTED_HANDLER_GROUPS
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = InlineHandlers;
}

if (typeof window !== 'undefined') {
    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.inlineHandlers = InlineHandlers;
}
