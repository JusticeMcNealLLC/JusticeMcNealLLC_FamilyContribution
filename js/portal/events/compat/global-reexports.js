/* Portal Events — Classic global re-exports (Phase 5L.4)
   Loaded last in the classic chain (before manage/sheet.js).
   Mirrors onclick handlers that expect window.evt* after all owners load. */
(function () {
    'use strict';

    function exp(name, fn) {
        if (typeof fn !== 'undefined') window[name] = fn;
    }

    function g(name) {
        return globalThis[name];
    }

    exp('evtHandleRsvp', typeof g('evtHandleRsvp') === 'function' ? g('evtHandleRsvp') : undefined);
    exp('evtHandleRaffleEntry', typeof g('evtHandleRaffleEntry') === 'function' ? g('evtHandleRaffleEntry') : undefined);
    exp('evtOpenScanner', typeof g('evtOpenScanner') === 'function' ? g('evtOpenScanner') : undefined);
    exp('evtOpenRaffleDraw', typeof g('evtOpenRaffleDraw') === 'function' ? g('evtOpenRaffleDraw') : undefined);
    exp('evtDrawWinner', typeof g('evtDrawWinner') === 'function' ? g('evtDrawWinner') : undefined);
    exp('evtToggleModal', typeof g('evtToggleModal') === 'function' ? g('evtToggleModal') : undefined);
    exp('evtUpdateStatus', typeof g('evtUpdateStatus') === 'function' ? g('evtUpdateStatus') : undefined);
    exp('evtCopyShareUrl', typeof g('evtCopyShareUrl') === 'function' ? g('evtCopyShareUrl') : undefined);
    exp('evtCloseScanner', typeof g('evtCloseScanner') === 'function' ? g('evtCloseScanner') : undefined);
    exp('evtCloseRaffleDraw', typeof g('evtCloseRaffleDraw') === 'function' ? g('evtCloseRaffleDraw') : undefined);
    exp('evtAddCostItem', typeof g('evtAddCostItem') === 'function' ? g('evtAddCostItem') : undefined);
    exp('evtRemoveCostItem', typeof g('evtRemoveCostItem') === 'function' ? g('evtRemoveCostItem') : undefined);
    exp('evtUpdateCostItem', typeof g('evtUpdateCostItem') === 'function' ? g('evtUpdateCostItem') : undefined);
    exp('evtJoinWaitlist', typeof g('evtJoinWaitlist') === 'function' ? g('evtJoinWaitlist') : undefined);
    exp('evtLeaveWaitlist', typeof g('evtLeaveWaitlist') === 'function' ? g('evtLeaveWaitlist') : undefined);
    exp('evtDuplicateEvent', typeof g('evtDuplicateEvent') === 'function' ? g('evtDuplicateEvent') : undefined);
    exp('evtCancelEvent', typeof g('evtCancelEvent') === 'function' ? g('evtCancelEvent') : undefined);
    exp('evtRescheduleEvent', typeof g('evtRescheduleEvent') === 'function' ? g('evtRescheduleEvent') : undefined);
    exp('evtDeleteEvent', typeof g('evtDeleteEvent') === 'function' ? g('evtDeleteEvent') : undefined);
    exp('evtClaimWaitlistSpot', typeof g('evtClaimWaitlistSpot') === 'function' ? g('evtClaimWaitlistSpot') : undefined);
    exp('evtShowUploadForm', typeof g('evtShowUploadForm') === 'function' ? g('evtShowUploadForm') : undefined);
    exp('evtUploadDocument', typeof g('evtUploadDocument') === 'function' ? g('evtUploadDocument') : undefined);
    exp('evtDownloadDocument', typeof g('evtDownloadDocument') === 'function' ? g('evtDownloadDocument') : undefined);
    exp('evtMarkDistributed', typeof g('evtMarkDistributed') === 'function' ? g('evtMarkDistributed') : undefined);
    exp('evtDeleteDocument', typeof g('evtDeleteDocument') === 'function' ? g('evtDeleteDocument') : undefined);
    exp('evtOpenDocumentsPanel', typeof g('evtOpenDocumentsPanel') === 'function' ? g('evtOpenDocumentsPanel') : undefined);
    exp('evtCloseDocumentsPanel', typeof g('evtCloseDocumentsPanel') === 'function' ? g('evtCloseDocumentsPanel') : undefined);
    exp('evtInitMap', typeof g('evtInitMap') === 'function' ? g('evtInitMap') : undefined);
    exp('evtToggleLocationSharing', typeof g('evtToggleLocationSharing') === 'function' ? g('evtToggleLocationSharing') : undefined);
    exp('evtJoinCompetition', typeof g('evtJoinCompetition') === 'function' ? g('evtJoinCompetition') : undefined);
    exp('evtSubmitEntry', typeof g('evtSubmitEntry') === 'function' ? g('evtSubmitEntry') : undefined);
    exp('evtCastVote', typeof g('evtCastVote') === 'function' ? g('evtCastVote') : undefined);
    exp('evtModerateEntry', typeof g('evtModerateEntry') === 'function' ? g('evtModerateEntry') : undefined);
    exp('evtContributeToPrizePool', typeof g('evtContributeToPrizePool') === 'function' ? g('evtContributeToPrizePool') : undefined);
    exp('evtStartPhase', typeof g('evtStartPhase') === 'function' ? g('evtStartPhase') : undefined);
    exp('evtAdvancePhase', typeof g('evtAdvancePhase') === 'function' ? g('evtAdvancePhase') : undefined);
    exp('evtExtendPhase', typeof g('evtExtendPhase') === 'function' ? g('evtExtendPhase') : undefined);
    exp('evtFinalizeCompetition', typeof g('evtFinalizeCompetition') === 'function' ? g('evtFinalizeCompetition') : undefined);
    exp('evtRecalcCompTiers', typeof g('evtRecalcCompTiers') === 'function' ? g('evtRecalcCompTiers') : undefined);
    exp('evtUploadPhoto', typeof g('evtHandlePhotoSelect') === 'function' ? g('evtHandlePhotoSelect') : undefined);
    exp('evtDeletePhoto', typeof g('evtDeletePhoto') === 'function' ? g('evtDeletePhoto') : undefined);
    exp('evtViewPhoto', typeof g('evtViewPhoto') === 'function' ? g('evtViewPhoto') : undefined);
    exp('evtNavigateToEvent', typeof g('evtNavigateToEvent') === 'function' ? g('evtNavigateToEvent') : undefined);
    exp('evtNavigateToList', typeof g('evtNavigateToList') === 'function' ? g('evtNavigateToList') : undefined);
})();
