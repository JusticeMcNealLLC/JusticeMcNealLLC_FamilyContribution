// ═══════════════════════════════════════════════════════════
// Portal Events — Init (Bootstrap + Event Listeners)
// This file must load LAST — it depends on all other modules.
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    evtCurrentUser = await checkAuth();
    if (!evtCurrentUser) return;

    // Get role for backward compat, show "Create" button based on permission
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', evtCurrentUser.id)
        .single();
    evtCurrentUserRole = profile?.role;

    if (hasPermission('events.create') || evtCurrentUserRole === 'admin') {
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

    // ── URL Routing: check for ?event={slug} on initial load ──
    evtRouteByUrl();

    // ── Browser back/forward support ──
    window.addEventListener('popstate', () => evtRouteByUrl());
});

// ─── Raffle Cost Hint Helper ────────────────────────────

function evtUpdateRaffleCostHint() {
    const costGroup = document.getElementById('raffleEntryCostGroup');
    const hint = document.getElementById('raffleCostHint');
    const mode = document.getElementById('pricingMode')?.value || 'free';
    const raffleOn = document.getElementById('raffleEnabled')?.checked;

    if (!costGroup) return;

    if (mode === 'paid') {
        // Paid RSVP → raffle included, hide cost input
        costGroup.classList.add('hidden');
        if (hint) hint.textContent = 'Raffle entry is included free with paid RSVP.';
    } else {
        // Free or RSVP-disabled → show cost input for standalone raffle ticket
        costGroup.classList.remove('hidden');
        if (hint) hint.textContent = 'This is the price for a standalone raffle ticket.';
    }
}

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

    // Live address validation (debounced input + blur)
    evtInitLocationValidation();

    // Preview button
    document.getElementById('previewEventBtn')?.addEventListener('click', evtHandlePreview);

    // ── Pricing Mode Toggle ──────────────────────────────
    const pricingModeEl = document.getElementById('pricingMode');
    pricingModeEl?.addEventListener('change', () => {
        const mode = pricingModeEl.value;
        const rsvpCostGroup = document.getElementById('rsvpCostGroup');

        // Show RSVP cost only for 'paid' mode
        if (rsvpCostGroup) rsvpCostGroup.classList.toggle('hidden', mode !== 'paid');

        // Update raffle entry cost hint / visibility based on pricing mode
        evtUpdateRaffleCostHint();
    });

    // ── Raffle Toggle ────────────────────────────────────
    const raffleToggle = document.getElementById('raffleEnabled');
    raffleToggle?.addEventListener('change', () => {
        const config = document.getElementById('raffleConfig');
        if (config) config.classList.toggle('hidden', !raffleToggle.checked);
        evtUpdateRaffleCostHint();
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
                <input type="text" name="rafflePrize" placeholder="Prize for ${i}${evtOrdinalSuffix ? evtOrdinalSuffix(i) : 'th'} place" class="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500">
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
    document.getElementById('eventMinParticipants')?.addEventListener('change', evtRecalcCostSummary);
    document.getElementById('eventMinParticipants')?.addEventListener('input', evtRecalcCostSummary);
    document.getElementById('eventLlcCut')?.addEventListener('change', evtRecalcCostSummary);
    document.getElementById('eventLlcCut')?.addEventListener('input', evtRecalcCostSummary);

    // Track manual edits to LLC RSVP override so auto-fill doesn't overwrite user input
    const llcOverride = document.getElementById('llcRsvpOverride');
    llcOverride?.addEventListener('input', () => { llcOverride.dataset.userEdited = 'true'; });
    llcOverride?.addEventListener('change', () => { llcOverride.dataset.userEdited = 'true'; });

    // ── Transportation Mode Toggle ───────────────────────
    const transportEl = document.getElementById('eventTransportation');
    transportEl?.addEventListener('change', () => {
        const group = document.getElementById('transportEstimateGroup');
        if (group) group.classList.toggle('hidden', transportEl.value !== 'self_arranged');
    });

    // ── Transportation Enable Toggle ─────────────────────
    const transportToggle = document.getElementById('transportationEnabled');
    transportToggle?.addEventListener('change', () => {
        const section = document.getElementById('transportationSection');
        if (section) section.classList.toggle('hidden', !transportToggle.checked);
    });

    // ── RSVP Enable Toggle ───────────────────────────────
    const rsvpToggle = document.getElementById('rsvpEnabled');
    rsvpToggle?.addEventListener('change', () => {
        const settings = document.getElementById('rsvpSettingsGroup');
        if (settings) settings.classList.toggle('hidden', !rsvpToggle.checked);
        // Clear gated details when RSVP is off (they depend on RSVP)
        if (!rsvpToggle.checked) {
            ['gateTime', 'gateLocation', 'gateNotes'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.checked = false;
            });
            const notes = document.getElementById('eventGatedNotes');
            if (notes) notes.value = '';
        }
    });

    // ── QR Check-In Enable Toggle ────────────────────────
    const checkinToggle = document.getElementById('checkinEnabled');
    checkinToggle?.addEventListener('change', () => {
        const section = document.getElementById('checkinModeSection');
        if (section) section.classList.toggle('hidden', !checkinToggle.checked);
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
window.evtDeleteEvent = evtDeleteEvent;
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
// Navigation exports
window.evtNavigateToEvent = evtNavigateToEvent;
window.evtNavigateToList = evtNavigateToList;
