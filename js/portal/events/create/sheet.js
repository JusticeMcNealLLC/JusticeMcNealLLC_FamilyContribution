// -----------------------------------------------------------
// Event Create Sheet  (M4a ? multi-step, Member + thin LLC)
//
// DEFAULT for all create-event entry points (Member + LLC via sheet).
//
// Steps: Basics ? About ? Included ? When & Where ? Pricing
//        ? [LLC when type=llc] ? [Competition when type=competition] ? Disclaimers ? Review
//
// Public surface:
//   window.EventsCreate.open()
//   window.EventsCreate.open({ eventId })  ? edit member, LLC, or competition event
//   window.EventsCreate.close()
//   window.EventsCreate.isFlagOn()  ? kept for compatibility, always true
// -----------------------------------------------------------

'use strict';

import { validateFundDeadline, toDatetimeLocalValue, centsToDollars } from './pricing-helpers.js';
import { validateAboutTabs } from './step-about.js';
import { validateIncludedItems } from './step-included.js';
import { validateDisclaimers, seedDefaultDisclaimers, ensureDefaultDisclaimers } from './step-disclaimers.js';
import { validateVoting } from './step-voting.js';

// --- Feature flag -- always on (sheet is now the default) -----
function isFlagOn() { return true; }

function getSteps() {
    const steps = [
        { key: 'basics',      label: 'Basics' },
        { key: 'about',       label: 'About' },
        { key: 'included',    label: 'Included' },
        { key: 'when',        label: 'When & Where' },
    ];
    if (STATE.form.event_type === 'competition') {
        steps.push({ key: 'competition', label: 'Competition' });
    } else {
        steps.push({ key: 'pricing', label: 'Pricing' });
        if (STATE.form.event_type === 'llc') {
            steps.push({ key: 'llc', label: 'LLC' });
        }
    }
    steps.push({ key: 'disclaimers', label: 'Disclaimers' });
    if (STATE.form.event_type !== 'competition') {
        steps.push({ key: 'voting', label: 'Voting' });
    }
    steps.push({ key: 'review', label: 'Review' });
    return steps;
}

function _competitionFormDefaults() {
    return {
        comp_entry_fee_dollars: '',
        comp_house_pct: '0',
        comp_min_entries: '2',
        comp_extension_days: '3',
        comp_entry_type: 'any',
        comp_entries_visible: true,
        comp_voter_eligibility: 'all_members',
        comp_vote_tally_visible: false,
        comp_max_file_size_mb: '10',
        comp_tier1_pct: '100',
        comp_tier2_pct: '0',
        comp_tier3_pct: '0',
        comp_phase1_end: '',
        comp_phase2_end: '',
        comp_phase3_end: '',
    };
}

const STATE = {
    step: 0,
    editEventId: null,
    editSlug: null,
    editStatus: null,
    pricingLocked: false,
    disclaimersLocked: false,
    votingLocked: false,
    competitionLocked: false,
    bannerFile: null,
    bannerPreviewUrl: null,
    existingBannerUrl: null,
    embedImageFile: null,
    embedImagePreviewUrl: null,
    existingEmbedUrl: null,
    geocode: null, // { lat, lng, display } or null
    prizeImageFiles: {},    // item.id ? File
    prizeImagePreviews: {}, // item.id ? data-URL
    includedImageFiles: {},
    includedImagePreviews: {},
    form: {
        event_type: 'member',
        title: '',
        category: 'other',
        description: '',
        about_tabs: [],
        included_items: [],
        start_date: '',
        end_date: '',
        timezone: 'America/New_York',
        location_text: '',
        location_nickname: '',
        max_participants: '',
        capacity_mode: 'none',
        capacity_counts: 'adults',
        rsvp_deadline: '',
        pricing_mode: 'free',
        adult_price_dollars: '',
        kids_free: true,
        kid_price_dollars: '',
        fund_deadline: '',
        raffle_enabled: false,
        raffle_entry_cost_dollars: '',
        raffle_config: null,
        member_only: false,
        disclaimers: seedDefaultDisclaimers(),
        amenity_voting: { enabled: false, options: [], closes_at: null, results_visible: 'after_close' },
        // LLC thin fields
        min_participants: '',
        llc_cut_pct: '0',
        show_cost_breakdown: true,
        transportation_enabled: false,
        transportation_mode: 'self_arranged',
        transportation_method: '',
        transportation_estimate_dollars: '',
        location_required: false,
        cost_items: [],
        llc_buyin_override_dollars: '',
        invest_eligible: false,
        ..._competitionFormDefaults(),
    },
};

const CATEGORIES = [
    { key:'party',         label:'Party' },
    { key:'birthday',      label:'Birthday' },
    { key:'trip',          label:'Trip' },
    { key:'cookout',       label:'Cookout' },
    { key:'game_night',    label:'Game Night' },
    { key:'meeting',       label:'Meeting' },
    { key:'fundraiser',    label:'Fundraiser' },
    { key:'volunteer',     label:'Volunteer' },
    { key:'celebration',   label:'Celebration' },
    { key:'other',         label:'Other' },
];

const TIMEZONES = [
    'America/New_York', 'America/Chicago', 'America/Denver',
    'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
];

function _blankForm() {
    return {
        event_type: 'member', title: '', category: 'other', description: '',
        about_tabs: [],
        included_items: [],
        start_date: '', end_date: '', timezone: 'America/New_York',
        location_text: '', location_nickname: '',
        max_participants: '', rsvp_deadline: '',
        capacity_mode: 'none', capacity_counts: 'adults',
        pricing_mode: 'free', adult_price_dollars: '',
        kids_free: true, kid_price_dollars: '',
        fund_deadline: '',
        raffle_enabled: false, raffle_entry_cost_dollars: '',
        raffle_config: null,
        member_only: false,
        disclaimers: seedDefaultDisclaimers(),
        amenity_voting: { enabled: false, options: [], closes_at: null, results_visible: 'after_close' },
        min_participants: '',
        llc_cut_pct: '0',
        show_cost_breakdown: true,
        transportation_enabled: false,
        transportation_mode: 'self_arranged',
        transportation_method: '',
        transportation_estimate_dollars: '',
        location_required: false,
        cost_items: [],
        llc_buyin_override_dollars: '',
        invest_eligible: false,
        ..._competitionFormDefaults(),
    };
}

function _resetTransientState() {
    STATE.step = 0;
    STATE.editEventId = null;
    STATE.editSlug = null;
    STATE.editStatus = null;
    STATE.pricingLocked = false;
    STATE.disclaimersLocked = false;
    STATE.votingLocked = false;
    STATE.competitionLocked = false;
    STATE.bannerFile = null;
    STATE.bannerPreviewUrl = null;
    STATE.existingBannerUrl = null;
    STATE.embedImageFile = null;
    STATE.embedImagePreviewUrl = null;
    STATE.existingEmbedUrl = null;
    STATE.geocode = null;
    STATE.prizeImageFiles = {};
    STATE.prizeImagePreviews = {};
    STATE.includedImageFiles = {};
    STATE.includedImagePreviews = {};
    STATE._competitionPhases = null;
    Object.assign(STATE.form, _blankForm());
}

async function _countCompetitionEntries(eventId) {
    const { count, error } = await supabaseClient
        .from('competition_entries')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId);
    if (error) throw error;
    return count || 0;
}

async function _loadPhasesForEdit(eventId) {
    const { data, error } = await supabaseClient
        .from('competition_phases')
        .select('*')
        .eq('event_id', eventId)
        .order('phase_num', { ascending: true });
    if (error) throw error;
    return data || [];
}

async function _countEventRsvps(eventId) {
    const [memberRes, guestRes] = await Promise.all([
        supabaseClient.from('event_rsvps').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
        supabaseClient.from('event_guest_rsvps').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    ]);
    if (memberRes.error) throw memberRes.error;
    if (guestRes.error) throw guestRes.error;
    return (memberRes.count || 0) + (guestRes.count || 0);
}

async function _loadEventForEdit(eventId) {
    const cached = (window.evtAllEvents || globalThis.evtAllEvents || []).find((e) => e.id === eventId);
    if (cached) return cached;
    const { data, error } = await supabaseClient.from('events').select('*').eq('id', eventId).single();
    if (error || !data) throw new Error(error?.message || 'Event not found.');
    return data;
}

function _hydrateFromEvent(event) {
    const adultCents = (event.adult_price_cents != null && Number.isFinite(Number(event.adult_price_cents)))
        ? Number(event.adult_price_cents)
        : Number(event.rsvp_cost_cents || 0);
    const aboutTabs = Array.isArray(event.about_tabs)
        ? event.about_tabs.map((t) => ({ ...t }))
        : [];
    const includedItems = Array.isArray(event.included_items)
        ? event.included_items.map((i) => ({ ...i, choices: Array.isArray(i.choices) ? [...i.choices] : [] }))
        : [];
    const discRaw = (window.EventsDisclaimers && typeof window.EventsDisclaimers.normalizeDisclaimers === 'function')
        ? window.EventsDisclaimers.normalizeDisclaimers(event.disclaimers)
        : (Array.isArray(event.disclaimers) ? event.disclaimers : []);
    const disclaimers = ensureDefaultDisclaimers(discRaw.length ? discRaw : seedDefaultDisclaimers())
        .map((d) => ({ ...d }));
    const amenityVoting = (window.EventsAmenityVoting && typeof window.EventsAmenityVoting.normalizeConfig === 'function')
        ? window.EventsAmenityVoting.normalizeConfig(event.amenity_voting)
        : { enabled: false, options: [], closes_at: null, results_visible: 'after_close' };

    let raffleConfig = null;
    if (event.raffle_enabled && event.raffle_prizes) {
        const rb = _raffleApi();
        if (rb?.raffleModel?.()?.normalizeConfig) {
            raffleConfig = rb.raffleModel().normalizeConfig(event.raffle_prizes);
        } else {
            raffleConfig = typeof event.raffle_prizes === 'object' ? event.raffle_prizes : null;
        }
    }

    const eventType = (event.event_type === 'llc')
        ? 'llc'
        : (event.event_type === 'competition' ? 'competition' : 'member');
    const pricingMode = eventType === 'llc' ? 'paid' : (event.pricing_mode || 'free');

    Object.assign(STATE.form, {
        event_type: eventType,
        title: event.title || '',
        category: event.category || 'other',
        description: event.description || '',
        about_tabs: aboutTabs,
        included_items: includedItems,
        start_date: toDatetimeLocalValue(event.start_date),
        end_date: toDatetimeLocalValue(event.end_date),
        timezone: event.timezone || 'America/New_York',
        location_text: event.location_text || '',
        location_nickname: event.location_nickname || '',
        max_participants: event.max_participants != null ? String(event.max_participants) : '',
        capacity_mode: event.capacity_mode || 'none',
        capacity_counts: event.capacity_counts || 'adults',
        rsvp_deadline: toDatetimeLocalValue(event.rsvp_deadline),
        pricing_mode: pricingMode,
        adult_price_dollars: centsToDollars(adultCents),
        kids_free: event.kids_free !== false,
        kid_price_dollars: centsToDollars(event.kid_price_cents),
        fund_deadline: toDatetimeLocalValue(event.fund_deadline),
        raffle_enabled: !!event.raffle_enabled,
        raffle_entry_cost_dollars: centsToDollars(event.raffle_entry_cost_cents),
        raffle_config: raffleConfig,
        member_only: !!event.member_only,
        disclaimers,
        amenity_voting: amenityVoting,
        min_participants: event.min_participants != null ? String(event.min_participants) : '',
        llc_cut_pct: event.llc_cut_pct != null ? String(event.llc_cut_pct) : '0',
        show_cost_breakdown: event.show_cost_breakdown !== false,
        transportation_enabled: !!event.transportation_enabled,
        transportation_mode: event.transportation_mode || 'self_arranged',
        transportation_method: (event.transportation_method === 'car' || event.transportation_method === 'plane')
            ? event.transportation_method
            : '',
        transportation_estimate_dollars: centsToDollars(event.transportation_estimate_cents),
        location_required: !!event.location_required,
        cost_items: [],
        llc_buyin_override_dollars: eventType === 'llc' && adultCents > 0 ? centsToDollars(adultCents) : '',
        invest_eligible: eventType === 'llc' ? !!event.invest_eligible : false,
        ...(eventType === 'competition'
            ? (window.EventsCreateSteps?.competition?.hydrateCompetitionFormFields
                ? window.EventsCreateSteps.competition.hydrateCompetitionFormFields(event, STATE._competitionPhases || [])
                : _competitionFormDefaults())
            : _competitionFormDefaults()),
    });

    STATE.editEventId = event.id;
    STATE.editSlug = event.slug || null;
    STATE.editStatus = event.status || null;
    STATE.existingBannerUrl = event.banner_url || null;
    STATE.bannerPreviewUrl = event.banner_url || null;
    STATE.existingEmbedUrl = event.embed_image_url || null;
    STATE.embedImagePreviewUrl = event.embed_image_url || null;
    if (event.location_lat != null && event.location_lng != null) {
        STATE.geocode = {
            lat: Number(event.location_lat),
            lng: Number(event.location_lng),
            display: event.location_text || '',
        };
    } else {
        STATE.geocode = null;
    }
}

async function _loadCostItemsForEdit(eventId) {
    const { data, error } = await supabaseClient
        .from('event_cost_items')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });
    if (error) throw error;
    STATE.form.cost_items = (data || []).map((row) => ({
        id: row.id || `cost-${row.sort_order}-${Date.now()}`,
        name: row.name || '',
        category: row.category || 'other',
        total_cost_cents: Number(row.total_cost_cents) || 0,
        included_in_buyin: row.included_in_buyin !== false,
        avg_per_person_cents: Number(row.avg_per_person_cents) || 0,
        notes: row.notes || '',
    }));
}

// --- DOM injection ----------------------------------------------
function _ensureMounted() {
    if (document.getElementById('ecSheetRoot')) return;
    const root = document.createElement('div');
    root.id = 'ecSheetRoot';
    root.innerHTML = `
        <div id="ecSheetBackdrop" class="fixed inset-0 bg-black/40 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-200 z-[60]"></div>
        <div id="ecSheet" class="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none z-[61]">
            <div id="ecSheetPanel" class="ec-sheet-panel bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto translate-y-full sm:translate-y-4 sm:opacity-0 transition-all duration-300 flex flex-col">
                <header class="px-5 sm:px-6 pb-3 border-b border-gray-100 flex items-start gap-3 flex-shrink-0" style="padding-top:max(1rem, env(safe-area-inset-top, 0px))">
                    <div class="flex-1 min-w-0">
                        <p id="ecSheetKicker" class="text-[11px] uppercase tracking-wide font-bold" style="color:var(--color-primary, #13366E)">Create Event <span class="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px]">BETA</span></p>
                        <h2 id="ecSheetTitle" class="text-lg sm:text-xl font-extrabold text-gray-900 truncate">New event</h2>
                        <p id="ecSheetSub" class="text-xs text-gray-400 mt-0.5"></p>
                    </div>
                    <button id="ecSheetClose" class="rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0" style="min-width:44px;min-height:44px" aria-label="Close">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </header>
                <div id="ecSheetSteps" class="flex items-center justify-center gap-2 px-5 py-2 border-b border-gray-100 flex-shrink-0"></div>
                <div id="ecSheetContent" class="ec-sheet-content flex-1 overflow-y-auto overflow-x-hidden px-5 sm:px-6 py-5"></div>
                <footer id="ecSheetFooter" class="px-5 sm:px-6 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
                    <button id="ecBackBtn" class="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3" style="min-height:44px">Back</button>
                    <div class="flex flex-wrap items-center gap-2">
                        <button id="ecDraftBtn" class="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3" style="min-height:44px">Save draft</button>
                        <button id="ecNextBtn" class="text-white px-5 rounded-xl text-sm font-bold transition" style="min-height:44px;background:var(--color-primary, #13366E)">Next</button>
                    </div>
                </footer>
            </div>
        </div>
        <style>
            .ec-step-dot { width:8px; height:8px; border-radius:50%; background:#e5e7eb; transition:background .15s,width .15s; }
            .ec-step-dot.active { background:var(--color-primary, #13366E); width:24px; border-radius:4px; }
            .ec-step-dot.done { background:var(--color-border, #D5DFEC); }
            .ec-label { display:block; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px; }
            .ec-sheet-content { min-width:0; }
            .ec-input { width:100%; max-width:100%; min-width:0; box-sizing:border-box; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; font-size:16px; color:#111827; background:#fff; }
            input[type="datetime-local"].ec-input { font-size:15px; }
            .ec-input:focus { outline:none; border-color:var(--color-primary, #13366E); box-shadow:0 0 0 3px var(--color-focus-ring, rgba(19, 54, 110, 0.35)); }
            .ec-input:disabled, .ec-textarea:disabled { background:#f3f4f6; color:#6b7280; cursor:not-allowed; }
            .ec-textarea { min-height:90px; resize:vertical; font-family:inherit; }
            .ec-help { font-size:11px; color:#9ca3af; margin-top:4px; }
            .ec-row { margin-bottom:14px; }
            .ec-sheet-panel {
                height: 92dvh;
                height: 92vh;
                max-height: 92dvh;
                max-height: 92vh;
            }
            @media (min-width: 640px) {
                .ec-sheet-panel {
                    height: min(760px, 92vh);
                    max-height: min(760px, 92vh);
                }
            }
            .ec-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
            .ec-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
            .ec-grid-keep { grid-template-columns: 1fr 1fr !important; }
            .ec-grid-2 > *, .ec-grid-3 > *, .ec-media-grid > * { min-width:0; }
            .ec-seat-row { display:grid; grid-template-columns:minmax(0,0.9fr) minmax(0,1.4fr); gap:12px; align-items:start; }
            .ec-review-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
            .ec-review-grid .ec-review-card { margin-bottom:0; }
            .ec-review-span { grid-column:1 / -1; }
            .ec-actions-row { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
            @media(max-width:639px) {
                .ec-grid-2 { grid-template-columns:1fr; }
                .ec-type-card { padding:8px 6px; }
                .ec-choice-card .ec-choice-sub { display:none; }
                .ec-seat-row, .ec-review-grid { grid-template-columns:1fr; }
                .ec-grid-keep.ec-datetime-row { grid-template-columns:1fr !important; }
            }
            .ec-type-card { padding:10px 8px; border:2px solid #e5e7eb; border-radius:12px; cursor:pointer; transition:border-color .15s,background .15s; min-height:44px; text-align:center; }
            .ec-type-card.active { border-color:var(--color-primary, #13366E); background:var(--color-surface, #EEF2F6); }
            .ec-type-card.disabled { opacity:.45; cursor:not-allowed; }
            .ec-type-emoji, .ec-pill-emoji { font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; font-size:22px; line-height:1; }
            .ec-type-card .ec-type-label { font-size:12px; font-weight:700; color:#111827; margin-top:4px; line-height:1.2; }
            .ec-type-card .ec-type-sub { font-size:10px; color:#6b7280; line-height:1.25; margin-top:2px; }
            .ec-media-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
            .ec-banner-drop { border:2px dashed #d1d5db; border-radius:12px; padding:16px 10px; text-align:center; cursor:pointer; transition:border-color .15s,background .15s; }
            .ec-banner-drop:hover { border-color:var(--color-border, #D5DFEC); background:#fafafa; }
            .ec-banner-drop--over { border-color:var(--color-primary, #13366E); background:var(--color-surface, #EEF2F6); }
            .ec-banner-preview { width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:12px; }
            .ec-embed-preview { width:100%; aspect-ratio:4/5; object-fit:cover; border-radius:12px; display:block; }
            .ec-pill { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; background:#f3f4f6; color:#374151; cursor:pointer; border:1px solid transparent; }
            .ec-pill .ec-pill-emoji { font-size:13px; text-transform:none; letter-spacing:0; }
            .ec-pill.active { background:var(--color-primary, #13366E); color:#fff; }
            .ec-checkbox-row { display:flex; gap:10px; align-items:flex-start; padding:10px; border:1px solid #e5e7eb; border-radius:10px; cursor:pointer; }
            .ec-choice-card { margin:0; min-width:0; flex-direction:column; align-items:flex-start; gap:6px; padding:8px; }
            .ec-choice-title { font-size:13px; font-weight:700; color:#111827; line-height:1.2; }
            .ec-choice-sub { font-size:11px; color:#6b7280; line-height:1.3; margin-top:2px; }
            .ec-checkbox-row input { margin-top:3px; }
            .ec-lock-banner { margin-bottom:12px; border-radius:10px; border:1px solid #fde68a; background:#fffbeb; color:#92400e; padding:10px 12px; font-size:12px; }
            .ec-review-card { background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:14px; margin-bottom:10px; }
            .ec-review-row { display:flex; justify-content:space-between; gap:10px; padding:6px 0; font-size:13px; border-bottom:1px solid #f1f5f9; }
            .ec-review-row:last-child { border-bottom:none; }
            .ec-review-row span:first-child { color:#6b7280; }
            .ec-review-row span:last-child { color:#111827; font-weight:600; text-align:right; }
            .ec-error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:10px 12px; border-radius:10px; font-size:13px; margin-bottom:10px; }
            .ec-loc-status { font-size:11px; margin-top:4px; }
            .ec-raffle-box { border:1px solid #e5e7eb; border-radius:14px; padding:12px; background:#fafafa; }
            .ec-raffle-section { border:1px solid #e5e7eb; border-radius:12px; padding:10px; background:#fff; margin-top:10px; }
            .ec-raffle-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
            .ec-raffle-grid { display:grid; grid-template-columns:1.2fr .8fr .65fr auto; gap:8px; align-items:end; }
            .ec-raffle-item-grid { display:grid; grid-template-columns:.45fr 1.1fr .9fr .55fr auto; gap:8px; align-items:end; margin-top:8px; }
            .ec-icon-btn { width:34px; height:34px; border-radius:9px; border:1px solid #e5e7eb; background:#fff; color:#4b5563; font-weight:800; display:inline-flex; align-items:center; justify-content:center; }
            .ec-icon-btn:hover { border-color:var(--color-border, #D5DFEC); color:var(--color-primary, #13366E); background:var(--color-surface, #EEF2F6); }
            .ec-icon-btn:disabled { opacity:.4; cursor:not-allowed; }
            .ec-mini-btn { border:1px solid #e5e7eb; background:#fff; color:#374151; border-radius:9px; padding:7px 10px; font-size:12px; font-weight:700; }
            .ec-mini-btn:hover { border-color:var(--color-border, #D5DFEC); color:var(--color-primary, #13366E); background:var(--color-surface, #EEF2F6); }
            .ec-mini-btn:disabled { opacity:.4; cursor:not-allowed; }
            .ec-check { display:flex; align-items:center; gap:8px; font-size:14px; color:#0b2545; font-weight:600; cursor:pointer; }
            .ec-check input { width:18px; height:18px; accent-color:#13366e; }
            .ec-choice-list { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; min-height:8px; }
            .ec-choice-chip {
                display:inline-flex; align-items:center; gap:4px;
                padding:5px 8px 5px 10px; border-radius:999px;
                background:#eef2f6; border:1px solid #d5dfec; color:#0b2545;
                font-size:12px; font-weight:600;
            }
            .ec-choice-chip-x {
                border:none; background:transparent; color:#13366e; cursor:pointer;
                font-size:16px; line-height:1; padding:0 2px; font-weight:700;
            }
            .ec-choice-add-row { display:flex; gap:8px; align-items:center; }
            .ec-choice-add-row .ec-input { flex:1; min-width:0; }
            .ec-md-toolbar { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
            .ec-md-btn {
                min-width:40px; min-height:40px; padding:6px 10px;
                border:1px solid #d5dfec; background:#fff; color:#13366e;
                border-radius:9px; font-size:13px; font-weight:700; font-family:inherit;
                cursor:pointer; display:inline-flex; align-items:center; justify-content:center;
            }
            .ec-md-btn:hover { background:#eef2f6; border-color:#13366e; }
            .ec-md-btn em { font-style:italic; font-weight:600; }
            .ec-raffle-summary { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
            .ec-raffle-chip { display:inline-flex; align-items:center; gap:4px; padding:4px 8px; border-radius:999px; background:var(--color-surface, #EEF2F6); color:var(--color-primary, #13366E); font-size:11px; font-weight:700; }
            .ec-raffle-item-wrap { border:1px solid #e5e7eb; border-radius:12px; padding:10px; background:#fff; margin-top:8px; }
            .ec-prize-img-row { margin-top:8px; display:flex; align-items:center; gap:8px; }
            .ec-prize-img-drop { flex:0 0 auto; width:72px; height:72px; border:2px dashed #d1d5db; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-direction:column; cursor:pointer; transition:border-color .15s,background .15s; font-size:11px; color:#9ca3af; text-align:center; overflow:hidden; }
            .ec-prize-img-drop:hover, .ec-prize-img-drop--over { border-color:var(--color-primary, #13366E); background:var(--color-surface, #EEF2F6); color:var(--color-primary, #13366E); }
            .ec-prize-img-drop img { width:100%; height:100%; object-fit:cover; border-radius:8px; display:block; }
            .ec-prize-img-label { flex:1; min-width:0; font-size:11px; color:#6b7280; }
            .ec-prize-img-label strong { display:block; color:#374151; font-size:12px; margin-bottom:1px; }
            .ec-prize-img-clear { border:1px solid #fecaca; background:#fef2f2; color:#dc2626; border-radius:7px; padding:4px 8px; font-size:11px; font-weight:700; white-space:nowrap; }
            .ec-prize-img-clear:hover { background:#fee2e2; }
            @media(max-width:560px) { .ec-raffle-grid, .ec-raffle-item-grid { grid-template-columns:1fr; } .ec-icon-btn { width:100%; } }
            @media(max-width:639px){
                #ecSheetPanel, .ec-sheet-panel { height: 94dvh; height: 94vh; max-height: 94dvh; max-height: 94vh; }
            }
        </style>
    `;
    document.body.appendChild(root);

    document.getElementById('ecSheetClose').addEventListener('click', _confirmClose);
    document.getElementById('ecSheetBackdrop').addEventListener('click', _confirmClose);
    document.getElementById('ecBackBtn').addEventListener('click', _back);
    document.getElementById('ecNextBtn').addEventListener('click', _next);
    document.getElementById('ecDraftBtn').addEventListener('click', () => _submit('draft'));
}

function _showSheet() {
    const sheet = document.getElementById('ecSheet');
    const panel = document.getElementById('ecSheetPanel');
    const backdrop = document.getElementById('ecSheetBackdrop');
    sheet.classList.add('ec-open');
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    backdrop.classList.add('opacity-100');
    requestAnimationFrame(() => {
        panel.classList.remove('translate-y-full', 'sm:translate-y-4', 'sm:opacity-0');
        panel.classList.add('translate-y-0', 'sm:opacity-100');
    });
    document.body.style.overflow = 'hidden';
}

// --- Open / Close -----------------------------------------------
async function open(opts) {
    _ensureMounted();
    _resetTransientState();

    const eventId = opts && opts.eventId ? opts.eventId : null;
    if (eventId) {
        try {
            const event = await _loadEventForEdit(eventId);
            const type = event.event_type || 'member';
            if (type !== 'member' && type !== 'llc' && type !== 'competition') {
                _alert('This event type cannot be edited in this sheet.');
                return;
            }
            if (type === 'competition') {
                STATE._competitionPhases = await _loadPhasesForEdit(eventId);
            }
            _hydrateFromEvent(event);
            if (type === 'llc') {
                await _loadCostItemsForEdit(eventId);
            }
            const rsvpCount = await _countEventRsvps(eventId);
            STATE.pricingLocked = rsvpCount > 0;
            STATE.disclaimersLocked = rsvpCount > 0;
            STATE.votingLocked = rsvpCount > 0;
            if (type === 'competition') {
                const entryCount = await _countCompetitionEntries(eventId);
                STATE.competitionLocked = entryCount > 0;
            }
        } catch (err) {
            _alert(err.message || 'Could not load event for editing.', 'Could not load event');
            return;
        }
    }

    _render();
    _showSheet();
}

function close() {
    const sheet = document.getElementById('ecSheet');
    if (!sheet || !sheet.classList.contains('ec-open')) return;
    const panel = document.getElementById('ecSheetPanel');
    const backdrop = document.getElementById('ecSheetBackdrop');
    panel.classList.add('translate-y-full', 'sm:translate-y-4', 'sm:opacity-0');
    panel.classList.remove('translate-y-0', 'sm:opacity-100');
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    backdrop.classList.remove('opacity-100');
    document.body.style.overflow = '';
    setTimeout(() => sheet.classList.remove('ec-open'), 250);
}

async function _confirmClose() {
    const dirty = STATE.form.title || STATE.bannerFile || STATE.embedImageFile || STATE.editEventId;
    if (dirty) {
        const msg = STATE.editEventId
            ? 'Discard changes to this event?'
            : 'Discard this event? Your draft will not be saved.';
        const ok = window.EventsHelpers?.confirmDialog
            ? await window.EventsHelpers.confirmDialog({
                title: STATE.editEventId ? 'Discard changes?' : 'Discard this event?',
                message: msg,
                confirmLabel: 'Discard',
                cancelLabel: 'Keep editing',
            })
            : window.confirm(msg);
        if (!ok) return;
    }
    close();
}

// --- Render -----------------------------------------------------
function _render() {
    const steps = getSteps();
    if (STATE.step >= steps.length) STATE.step = Math.max(0, steps.length - 1);

    const editing = !!STATE.editEventId;
    const kicker = document.getElementById('ecSheetKicker');
    const titleEl = document.getElementById('ecSheetTitle');
    if (kicker) {
        kicker.innerHTML = editing
            ? 'Edit Event <span class="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px]">BETA</span>'
            : 'Create Event <span class="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px]">BETA</span>';
    }
    if (titleEl) titleEl.textContent = editing ? (STATE.form.title || 'Edit event') : 'New event';

    const dots = document.getElementById('ecSheetSteps');
    dots.innerHTML = steps.map((s, i) =>
        `<div class="ec-step-dot ${i === STATE.step ? 'active' : (i < STATE.step ? 'done' : '')}" title="${s.label}"></div>`
    ).join('');
    document.getElementById('ecSheetSub').textContent = 'Step ' + (STATE.step + 1) + ' of ' + steps.length + ' \u00B7 ' + steps[STATE.step].label;

    document.getElementById('ecBackBtn').style.visibility = STATE.step === 0 ? 'hidden' : 'visible';
    const draftBtn = document.getElementById('ecDraftBtn');
    if (draftBtn) draftBtn.textContent = editing ? 'Save as draft' : 'Save draft';
    const nextBtn = document.getElementById('ecNextBtn');
    if (STATE.step === steps.length - 1) {
        nextBtn.textContent = editing ? 'Save changes' : 'Publish';
    } else {
        nextBtn.textContent = 'Next';
    }

    const key = steps[STATE.step].key;
    const c = document.getElementById('ecSheetContent');
    const stepApis = window.EventsCreateSteps || {};
    if (key === 'basics' && stepApis.basics)  { c.innerHTML = stepApis.basics.html();  stepApis.basics.wire(); }
    if (key === 'about' && stepApis.about)    { c.innerHTML = stepApis.about.html();   stepApis.about.wire(); }
    if (key === 'included' && stepApis.included) { c.innerHTML = stepApis.included.html(); stepApis.included.wire(); }
    if (key === 'when' && stepApis.when)      { c.innerHTML = stepApis.when.html();    stepApis.when.wire(); }
    if (key === 'pricing' && stepApis.pricing){ c.innerHTML = stepApis.pricing.html(); stepApis.pricing.wire(); }
    if (key === 'llc' && stepApis.llc)        { c.innerHTML = stepApis.llc.html();     stepApis.llc.wire(); }
    if (key === 'competition' && stepApis.competition) { c.innerHTML = stepApis.competition.html(); stepApis.competition.wire(); }
    if (key === 'disclaimers' && stepApis.disclaimers) { c.innerHTML = stepApis.disclaimers.html(); stepApis.disclaimers.wire(); }
    if (key === 'voting' && stepApis.voting) { c.innerHTML = stepApis.voting.html(); stepApis.voting.wire(); }
    if (key === 'review' && stepApis.review)  { c.innerHTML = stepApis.review.html();  stepApis.review.wire(); }
}

function _raffleApi() {
    return window.EventsCreateRaffleBuilder;
}

function _validateStep() {
    const f = STATE.form;
    const steps = getSteps();
    const key = steps[STATE.step].key;
    if (key === 'basics') {
        if (!f.title.trim()) return 'Title is required.';
        if (f.title.trim().length < 3) return 'Title must be at least 3 characters.';
        if (f.event_type !== 'member' && f.event_type !== 'llc' && f.event_type !== 'competition') {
            return 'Choose Member, LLC, or Competition event type.';
        }
    }
    if (key === 'about') {
        const aboutErr = validateAboutTabs(f);
        if (aboutErr) return aboutErr;
    }
    if (key === 'included') {
        const incErr = validateIncludedItems(f);
        if (incErr) return incErr;
    }
    if (key === 'when') {
        if (!f.start_date) return 'Start date is required.';
        if (f.end_date && f.end_date < f.start_date) return 'End date must be after start date.';
        if (f.event_type !== 'competition' && f.rsvp_deadline && f.rsvp_deadline > f.start_date) {
            return 'RSVP deadline must be before the event starts.';
        }
        if (f.capacity_mode === 'soft' || f.capacity_mode === 'hard') {
            if (!f.max_participants || Number(f.max_participants) <= 0) return 'Seat limit is required when using a capacity cap.';
        }
    }
    if (key === 'pricing') {
        if (STATE.pricingLocked) return null;
        if (f.event_type === 'llc') f.pricing_mode = 'paid';
        if (f.pricing_mode === 'paid' && f.event_type !== 'llc' && (!f.adult_price_dollars || Number(f.adult_price_dollars) <= 0)) {
            return 'Paid events need an adult price greater than zero.';
        }
        if (f.pricing_mode === 'paid' && f.event_type === 'llc' && f.adult_price_dollars !== '' && Number(f.adult_price_dollars) < 0) {
            return 'Adult price cannot be negative.';
        }
        if (f.pricing_mode === 'paid' && !f.kids_free) {
            if (f.kid_price_dollars === '' || Number.isNaN(Number(f.kid_price_dollars))) return 'Kid price is required when kids are not free.';
            if (Number(f.kid_price_dollars) < 0) return 'Kid price cannot be negative.';
        }
        if (f.pricing_mode === 'paid') {
            const fundErr = validateFundDeadline(f);
            if (fundErr) return fundErr;
        }
        if (f.raffle_enabled && Number(f.raffle_entry_cost_dollars || 0) < 0) return 'Raffle entry price cannot be negative.';
        if (f.raffle_enabled) {
            const rb = _raffleApi();
            const result = rb.raffleModel().validateConfig(rb.ensureRaffleConfig());
            if (!result.valid) return result.errors[0];
        }
    }
    if (key === 'llc') {
        const llcApi = window.EventsCreateSteps?.llc;
        if (llcApi && typeof llcApi.validateLlc === 'function') {
            const llcErr = llcApi.validateLlc(f);
            if (llcErr) return llcErr;
        }
    }
    if (key === 'competition') {
        if (STATE.competitionLocked) return null;
        const compApi = window.EventsCreateSteps?.competition;
        if (compApi && typeof compApi.validateCompetition === 'function') {
            const compErr = compApi.validateCompetition(f, { publish: true });
            if (compErr) return compErr;
        }
    }
    if (key === 'disclaimers') {
        if (STATE.disclaimersLocked) return null;
        const discErr = validateDisclaimers(f);
        if (discErr) return discErr;
    }
    if (key === 'voting') {
        if (STATE.votingLocked) return null;
        const voteErr = validateVoting(f);
        if (voteErr) return voteErr;
    }
    return null;
}

function _back() {
    if (STATE.step === 0) return;
    STATE.step--;
    _render();
}

function _next() {
    const err = _validateStep();
    if (err) {
        _alert(err);
        return;
    }
    const steps = getSteps();
    if (STATE.step < steps.length - 1) {
        STATE.step++;
        _render();
    } else {
        _submit('open');
    }
}

function _submit(status) {
    window.EventsCreateSubmit.submit(status);
}

// --- Helpers ----------------------------------------------------
function _alert(message, title) {
    if (window.EventsHelpers?.alertDialog) {
        return window.EventsHelpers.alertDialog({
            title: title || 'Please check this step',
            message: String(message || ''),
        });
    }
    window.alert(String(message || ''));
    return Promise.resolve();
}

function _esc(s) {
    const el = document.createElement('span');
    el.textContent = s == null ? '' : String(s);
    return el.innerHTML;
}

function _bindCreateStepsApi() {
    window.EventsCreateSteps = window.EventsCreateSteps || {};
    window.EventsCreateSteps.getState = () => STATE;
    window.EventsCreateSteps.render = _render;
    window.EventsCreateSteps.validateStep = _validateStep;
    window.EventsCreateSteps.close = close;
    window.EventsCreateSteps.esc = _esc;
    window.EventsCreateSteps.alert = _alert;
    window.EventsCreateSteps.CATEGORIES = CATEGORIES;
    window.EventsCreateSteps.TIMEZONES = TIMEZONES;
    window.EventsCreateSteps.isEditMode = () => !!STATE.editEventId;
    const rb = _raffleApi();
    window.EventsCreateSteps.raffleBuilderHtml = rb.builderHtml;
    window.EventsCreateSteps.raffleReviewHtml = rb.reviewHtml;
    window.EventsCreateSteps.ensureRaffleConfig = rb.ensureRaffleConfig;
    window.EventsCreateSteps.wireRaffleBuilder = rb.wire;
}

_bindCreateStepsApi();

// --- Public surface ---------------------------------------------
export const eventsCreateApi = { open, close, isFlagOn };

globalThis.EventsCreate = eventsCreateApi;
const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
PortalEvents.create = PortalEvents.create || {};
PortalEvents.create.open = eventsCreateApi.open;
PortalEvents.create.close = eventsCreateApi.close;
PortalEvents.create.isFlagOn = eventsCreateApi.isFlagOn;
