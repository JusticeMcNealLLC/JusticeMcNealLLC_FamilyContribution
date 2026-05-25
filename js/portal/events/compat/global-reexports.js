/* Portal Events — Classic global re-exports (Phase 5L.4)
   Loaded last in the classic chain (before manage/sheet.js).
   Mirrors onclick handlers that expect window.evt* after all owners load. */
(function () {
    'use strict';

    function exp(name, fn) {
        if (typeof fn !== 'undefined') window[name] = fn;
    }

    exp('evtHandleRsvp', typeof evtHandleRsvp !== 'undefined' ? evtHandleRsvp : undefined);
    exp('evtHandleRaffleEntry', typeof evtHandleRaffleEntry !== 'undefined' ? evtHandleRaffleEntry : undefined);
    exp('evtOpenScanner', typeof evtOpenScanner !== 'undefined' ? evtOpenScanner : undefined);
    exp('evtOpenRaffleDraw', typeof evtOpenRaffleDraw !== 'undefined' ? evtOpenRaffleDraw : undefined);
    exp('evtDrawWinner', typeof evtDrawWinner !== 'undefined' ? evtDrawWinner : undefined);
    exp('evtToggleModal', typeof evtToggleModal !== 'undefined' ? evtToggleModal : undefined);
    exp('evtUpdateStatus', typeof evtUpdateStatus !== 'undefined' ? evtUpdateStatus : undefined);
    exp('evtCopyShareUrl', typeof evtCopyShareUrl !== 'undefined' ? evtCopyShareUrl : undefined);
    exp('evtCloseScanner', typeof evtCloseScanner !== 'undefined' ? evtCloseScanner : undefined);
    exp('evtCloseRaffleDraw', typeof evtCloseRaffleDraw !== 'undefined' ? evtCloseRaffleDraw : undefined);
    exp('evtAddCostItem', typeof evtAddCostItem !== 'undefined' ? evtAddCostItem : undefined);
    exp('evtRemoveCostItem', typeof evtRemoveCostItem !== 'undefined' ? evtRemoveCostItem : undefined);
    exp('evtUpdateCostItem', typeof evtUpdateCostItem !== 'undefined' ? evtUpdateCostItem : undefined);
    exp('evtJoinWaitlist', typeof evtJoinWaitlist !== 'undefined' ? evtJoinWaitlist : undefined);
    exp('evtLeaveWaitlist', typeof evtLeaveWaitlist !== 'undefined' ? evtLeaveWaitlist : undefined);
    exp('evtDuplicateEvent', typeof evtDuplicateEvent !== 'undefined' ? evtDuplicateEvent : undefined);
    exp('evtCancelEvent', typeof evtCancelEvent !== 'undefined' ? evtCancelEvent : undefined);
    exp('evtRescheduleEvent', typeof evtRescheduleEvent !== 'undefined' ? evtRescheduleEvent : undefined);
    exp('evtDeleteEvent', typeof evtDeleteEvent !== 'undefined' ? evtDeleteEvent : undefined);
    exp('evtClaimWaitlistSpot', typeof evtClaimWaitlistSpot !== 'undefined' ? evtClaimWaitlistSpot : undefined);
    exp('evtShowUploadForm', typeof evtShowUploadForm !== 'undefined' ? evtShowUploadForm : undefined);
    exp('evtUploadDocument', typeof evtUploadDocument !== 'undefined' ? evtUploadDocument : undefined);
    exp('evtDownloadDocument', typeof evtDownloadDocument !== 'undefined' ? evtDownloadDocument : undefined);
    exp('evtMarkDistributed', typeof evtMarkDistributed !== 'undefined' ? evtMarkDistributed : undefined);
    exp('evtDeleteDocument', typeof evtDeleteDocument !== 'undefined' ? evtDeleteDocument : undefined);
    exp('evtOpenDocumentsPanel', typeof evtOpenDocumentsPanel !== 'undefined' ? evtOpenDocumentsPanel : undefined);
    exp('evtCloseDocumentsPanel', typeof evtCloseDocumentsPanel !== 'undefined' ? evtCloseDocumentsPanel : undefined);
    exp('evtInitMap', typeof evtInitMap !== 'undefined' ? evtInitMap : undefined);
    exp('evtToggleLocationSharing', typeof evtToggleLocationSharing !== 'undefined' ? evtToggleLocationSharing : undefined);
    exp('evtJoinCompetition', typeof evtJoinCompetition !== 'undefined' ? evtJoinCompetition : undefined);
    exp('evtSubmitEntry', typeof evtSubmitEntry !== 'undefined' ? evtSubmitEntry : undefined);
    exp('evtCastVote', typeof evtCastVote !== 'undefined' ? evtCastVote : undefined);
    exp('evtModerateEntry', typeof evtModerateEntry !== 'undefined' ? evtModerateEntry : undefined);
    exp('evtContributeToPrizePool', typeof evtContributeToPrizePool !== 'undefined' ? evtContributeToPrizePool : undefined);
    exp('evtStartPhase', typeof evtStartPhase !== 'undefined' ? evtStartPhase : undefined);
    exp('evtAdvancePhase', typeof evtAdvancePhase !== 'undefined' ? evtAdvancePhase : undefined);
    exp('evtExtendPhase', typeof evtExtendPhase !== 'undefined' ? evtExtendPhase : undefined);
    exp('evtFinalizeCompetition', typeof evtFinalizeCompetition !== 'undefined' ? evtFinalizeCompetition : undefined);
    exp('evtRecalcCompTiers', typeof evtRecalcCompTiers !== 'undefined' ? evtRecalcCompTiers : undefined);
    exp('evtUploadPhoto', typeof evtHandlePhotoSelect !== 'undefined' ? evtHandlePhotoSelect : undefined);
    exp('evtDeletePhoto', typeof evtDeletePhoto !== 'undefined' ? evtDeletePhoto : undefined);
    exp('evtViewPhoto', typeof evtViewPhoto !== 'undefined' ? evtViewPhoto : undefined);
    exp('evtNavigateToEvent', typeof evtNavigateToEvent !== 'undefined' ? evtNavigateToEvent : undefined);
    exp('evtNavigateToList', typeof evtNavigateToList !== 'undefined' ? evtNavigateToList : undefined);
})();
