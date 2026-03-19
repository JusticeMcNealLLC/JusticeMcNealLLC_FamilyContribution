// ═══════════════════════════════════════════════════════════
// Portal Events — Init (Bootstrap + Event Listeners)
// This file must load LAST — it depends on all other modules.
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    evtCurrentUser = await checkAuth();
    if (!evtCurrentUser) return;

    // Get role to decide if "Create" button shows
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', evtCurrentUser.id)
        .single();
    evtCurrentUserRole = profile?.role;

    if (evtCurrentUserRole === 'admin') {
        document.getElementById('createEventBtn').classList.remove('hidden');
        document.getElementById('createEventBtn').classList.add('flex');
    }

    // Auto-detect timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzSel = document.getElementById('eventTimezone');
    if (tzSel) {
        for (const opt of tzSel.options) {
            if (opt.value === tz) { opt.selected = true; break; }
        }
    }

    evtSetupListeners();
    await evtLoadEvents();
});

// ─── Event Listeners ────────────────────────────────────

function evtSetupListeners() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            evtActiveTab = btn.dataset.tab;
            evtRenderEvents();
        });
    });

    // Type filter
    document.getElementById('typeFilter').addEventListener('change', evtRenderEvents);

    // Create modal
    document.getElementById('createEventBtn')?.addEventListener('click', () => evtToggleModal('createModal', true));
    document.getElementById('closeCreateModal')?.addEventListener('click', () => evtToggleModal('createModal', false));
    document.getElementById('createModalOverlay')?.addEventListener('click', () => evtToggleModal('createModal', false));

    // Detail modal
    document.getElementById('detailModalOverlay')?.addEventListener('click', () => evtToggleModal('detailModal', false));

    // Scanner modal
    document.getElementById('closeScannerModal')?.addEventListener('click', evtCloseScanner);
    document.getElementById('scannerModalOverlay')?.addEventListener('click', evtCloseScanner);

    // Banner upload
    const dropzone = document.getElementById('bannerDropzone');
    const fileInput = document.getElementById('bannerFile');
    dropzone?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', evtHandleBannerSelect);
    dropzone?.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('border-brand-400'); });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('border-brand-400'));
    dropzone?.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('border-brand-400');
        if (e.dataTransfer.files[0]) {
            fileInput.files = e.dataTransfer.files;
            evtHandleBannerSelect();
        }
    });

    // Create form
    document.getElementById('createEventForm')?.addEventListener('submit', evtHandleCreate);

    // Preview button
    document.getElementById('previewEventBtn')?.addEventListener('click', evtHandlePreview);

    // ── Pricing Mode Toggle ──────────────────────────────
    const pricingModeEl = document.getElementById('pricingMode');
    pricingModeEl?.addEventListener('change', () => {
        const mode = pricingModeEl.value;
        const rsvpCostGroup = document.getElementById('rsvpCostGroup');
        const raffleEntryCostGroup = document.getElementById('raffleEntryCostGroup');

        // Show RSVP cost only for 'paid' mode
        if (rsvpCostGroup) rsvpCostGroup.classList.toggle('hidden', mode !== 'paid');

        // Show raffle entry cost field only for free_paid_raffle
        if (raffleEntryCostGroup) raffleEntryCostGroup.classList.toggle('hidden', mode !== 'free_paid_raffle');
    });

    // ── Raffle Toggle ────────────────────────────────────
    const raffleToggle = document.getElementById('raffleEnabled');
    raffleToggle?.addEventListener('change', () => {
        const config = document.getElementById('raffleConfig');
        if (config) config.classList.toggle('hidden', !raffleToggle.checked);
    });

    // ── Winner Count → Prize Inputs ──────────────────────
    const winnerCountEl = document.getElementById('raffleWinnerCount');
    winnerCountEl?.addEventListener('change', () => {
        const count = parseInt(winnerCountEl.value) || 1;
        const container = document.getElementById('rafflePrizesList');
        if (!container) return;

        let html = '';
        for (let i = 1; i <= count; i++) {
            html += `<div class="flex items-center gap-2">
                <span class="text-xs font-bold text-gray-500 w-6">#${i}</span>
                <input type="text" name="rafflePrize${i}" placeholder="Prize for ${i}${evtOrdinalSuffix ? evtOrdinalSuffix(i) : 'th'} place" class="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500">
            </div>`;
        }
        container.innerHTML = html;
    });

    // ── Raffle Draw Modal Close ──────────────────────────
    document.getElementById('closeRaffleDrawModal')?.addEventListener('click', () => evtToggleModal('raffleDrawModal', false));
    document.getElementById('raffleDrawOverlay')?.addEventListener('click', () => evtToggleModal('raffleDrawModal', false));

    // ── LLC Event Type Toggle ────────────────────────────
    document.getElementById('eventType')?.addEventListener('change', evtToggleLlcFields);

    // ── Competition Tier Calculator ──────────────────────
    document.getElementById('compTier1Pct')?.addEventListener('input', evtRecalcCompTiers);
    document.getElementById('compTier2Pct')?.addEventListener('input', evtRecalcCompTiers);
    document.getElementById('compTier3Pct')?.addEventListener('input', evtRecalcCompTiers);

    // ── LLC Cost Builder ─────────────────────────────────
    document.getElementById('addCostItemBtn')?.addEventListener('click', evtAddCostItem);
    document.getElementById('eventMax')?.addEventListener('change', evtRecalcCostSummary);
    document.getElementById('eventMax')?.addEventListener('input', evtRecalcCostSummary);
    document.getElementById('eventLlcCut')?.addEventListener('change', evtRecalcCostSummary);
    document.getElementById('eventLlcCut')?.addEventListener('input', evtRecalcCostSummary);

    // ── Transportation Mode Toggle ───────────────────────
    const transportEl = document.getElementById('eventTransportation');
    transportEl?.addEventListener('change', () => {
        const group = document.getElementById('transportEstimateGroup');
        if (group) group.classList.toggle('hidden', transportEl.value !== 'self_arranged');
    });
}

// ─── Global Exports (for onclick handlers in HTML) ──────

window.evtHandleRsvp = evtHandleRsvp;
window.evtHandleRaffleEntry = evtHandleRaffleEntry;
window.evtOpenScanner = evtOpenScanner;
window.evtOpenRaffleDraw = evtOpenRaffleDraw;
window.evtDrawWinner = evtDrawWinner;
window.evtToggleModal = evtToggleModal;
window.evtUpdateStatus = evtUpdateStatus;
window.evtCopyShareUrl = evtCopyShareUrl;
window.evtCloseScanner = evtCloseScanner;
window.evtCloseRaffleDraw = evtCloseRaffleDraw;
window.evtAddCostItem = evtAddCostItem;
window.evtRemoveCostItem = evtRemoveCostItem;
window.evtUpdateCostItem = evtUpdateCostItem;
window.evtJoinWaitlist = evtJoinWaitlist;
window.evtLeaveWaitlist = evtLeaveWaitlist;
window.evtDuplicateEvent = evtDuplicateEvent;
window.evtCancelEvent = evtCancelEvent;
window.evtRescheduleEvent = evtRescheduleEvent;
window.evtClaimWaitlistSpot = evtClaimWaitlistSpot;
// Document management exports
window.evtShowUploadForm = evtShowUploadForm;
window.evtUploadDocument = evtUploadDocument;
window.evtDownloadDocument = evtDownloadDocument;
window.evtMarkDistributed = evtMarkDistributed;
window.evtDeleteDocument = evtDeleteDocument;
// Live map exports
window.evtInitMap = evtInitMap;
window.evtToggleLocationSharing = evtToggleLocationSharing;
// Competition exports
window.evtJoinCompetition = evtJoinCompetition;
window.evtSubmitEntry = evtSubmitEntry;
window.evtCastVote = evtCastVote;
window.evtModerateEntry = evtModerateEntry;
window.evtContributeToPrizePool = evtContributeToPrizePool;
window.evtStartPhase = evtStartPhase;
window.evtAdvancePhase = evtAdvancePhase;
window.evtExtendPhase = evtExtendPhase;
window.evtFinalizeCompetition = evtFinalizeCompetition;
window.evtRecalcCompTiers = evtRecalcCompTiers;
// Scrapbook exports
window.evtUploadPhoto = evtHandlePhotoSelect;
window.evtDeletePhoto = evtDeletePhoto;
window.evtViewPhoto = evtViewPhoto;
