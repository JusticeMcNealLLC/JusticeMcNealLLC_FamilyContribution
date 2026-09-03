// Portal Events — Create sheet: Competition step (§13.6.394)

'use strict';

import { toDatetimeLocalValue } from './pricing-helpers.js';

function _esc(s) {
    return window.EventsCreateSteps.esc(s);
}

function _tierTotal(form) {
    return (Number(form.comp_tier1_pct) || 0)
        + (Number(form.comp_tier2_pct) || 0)
        + (Number(form.comp_tier3_pct) || 0);
}

export function buildCompetitionConfig(form) {
    return {
        entry_type: form.comp_entry_type || 'any',
        entry_fee_cents: Math.round(Number(form.comp_entry_fee_dollars || 0) * 100),
        house_pct: Number(form.comp_house_pct) || 0,
        min_entries: Number(form.comp_min_entries) || 2,
        extension_days: Number(form.comp_extension_days) || 3,
        entries_visible_before_voting: form.comp_entries_visible !== false,
        voter_eligibility: form.comp_voter_eligibility || 'all_members',
        vote_tally_visible: !!form.comp_vote_tally_visible,
        max_file_size_mb: Number(form.comp_max_file_size_mb) > 0 ? Number(form.comp_max_file_size_mb) : 10,
    };
}

export function buildWinnerTierConfig(form) {
    const tiers = [];
    const t1 = Number(form.comp_tier1_pct) || 0;
    const t2 = Number(form.comp_tier2_pct) || 0;
    const t3 = Number(form.comp_tier3_pct) || 0;
    if (t1 > 0) tiers.push({ place: 1, pct: t1 });
    if (t2 > 0) tiers.push({ place: 2, pct: t2 });
    if (t3 > 0) tiers.push({ place: 3, pct: t3 });
    return tiers.length ? tiers : [{ place: 1, pct: 100 }];
}

export function buildInitialPhases(form, startISO, endISO) {
    const start = startISO ? new Date(startISO) : null;
    const p1End = form.comp_phase1_end ? new Date(form.comp_phase1_end) : null;
    const p2End = form.comp_phase2_end ? new Date(form.comp_phase2_end) : null;
    const p3End = form.comp_phase3_end ? new Date(form.comp_phase3_end) : null;
    const eventEnd = endISO ? new Date(endISO) : p3End;
    return [
        {
            phase_num: 1,
            name: 'Registration',
            description: 'Competitors register during this phase.',
            starts_at: start?.toISOString() || null,
            ends_at: p1End?.toISOString() || null,
            status: 'pending',
        },
        {
            phase_num: 2,
            name: 'Submission',
            description: 'Submit GFX entries during this window.',
            starts_at: p1End?.toISOString() || null,
            ends_at: p2End?.toISOString() || null,
            status: 'pending',
        },
        {
            phase_num: 3,
            name: 'Voting',
            description: 'Members vote on submitted entries.',
            starts_at: p2End?.toISOString() || null,
            ends_at: p3End?.toISOString() || null,
            status: 'pending',
        },
        {
            phase_num: 4,
            name: 'Results',
            description: 'Winners announced and payouts processed.',
            starts_at: p3End?.toISOString() || null,
            ends_at: eventEnd?.toISOString() || p3End?.toISOString() || null,
            status: 'pending',
        },
    ];
}

export function hydrateCompetitionFormFields(event, phases) {
    const cfg = event.competition_config || {};
    const tiers = Array.isArray(event.winner_tier_config) ? event.winner_tier_config : [];
    const t1 = tiers.find((t) => Number(t.place) === 1)?.pct ?? 100;
    const t2 = tiers.find((t) => Number(t.place) === 2)?.pct ?? 0;
    const t3 = tiers.find((t) => Number(t.place) === 3)?.pct ?? 0;
    const list = Array.isArray(phases) ? phases : [];
    const p1 = list.find((p) => Number(p.phase_num) === 1);
    const p2 = list.find((p) => Number(p.phase_num) === 2);
    const p3 = list.find((p) => Number(p.phase_num) === 3);
    return {
        comp_entry_fee_dollars: cfg.entry_fee_cents ? String(cfg.entry_fee_cents / 100) : '',
        comp_house_pct: String(cfg.house_pct ?? 0),
        comp_min_entries: String(cfg.min_entries ?? 2),
        comp_extension_days: String(cfg.extension_days ?? 3),
        comp_entry_type: cfg.entry_type || 'any',
        comp_entries_visible: cfg.entries_visible_before_voting !== false,
        comp_voter_eligibility: cfg.voter_eligibility || 'all_members',
        comp_vote_tally_visible: !!cfg.vote_tally_visible,
        comp_max_file_size_mb: String(cfg.max_file_size_mb ?? 10),
        comp_tier1_pct: String(t1),
        comp_tier2_pct: String(t2),
        comp_tier3_pct: String(t3),
        comp_phase1_end: toDatetimeLocalValue(p1?.ends_at),
        comp_phase2_end: toDatetimeLocalValue(p2?.ends_at),
        comp_phase3_end: toDatetimeLocalValue(p3?.ends_at),
    };
}

export function validateCompetition(form, opts) {
    const publish = !opts || opts.publish !== false;
    const fee = Number(form.comp_entry_fee_dollars);
    if (form.comp_entry_fee_dollars !== '' && (Number.isNaN(fee) || fee < 0 || fee > 500)) {
        return 'Entry fee must be between $0 and $500.';
    }
    const house = Number(form.comp_house_pct);
    if (Number.isNaN(house) || house < 0 || house > 25) {
        return 'House % must be between 0 and 25.';
    }
    const minEntries = Number(form.comp_min_entries);
    if (Number.isNaN(minEntries) || minEntries < 2 || minEntries > 100) {
        return 'Minimum entries must be between 2 and 100.';
    }
    const extDays = Number(form.comp_extension_days);
    if (Number.isNaN(extDays) || extDays < 1 || extDays > 14) {
        return 'Extension days must be between 1 and 14.';
    }
    const maxMb = Number(form.comp_max_file_size_mb);
    if (Number.isNaN(maxMb) || maxMb < 1 || maxMb > 100) {
        return 'Max file size must be between 1 and 100 MB.';
    }
    const total = _tierTotal(form);
    if (total !== 100) {
        return `Winner tiers must total 100% (currently ${total}%).`;
    }
    if (Number(form.comp_tier1_pct) <= 0) {
        return '1st place tier must be at least 1%.';
    }
    if (!publish) return null;
    if (!form.start_date) return 'Event start date is required before setting competition phases.';
    if (!form.comp_phase1_end) return 'Registration end date is required.';
    if (!form.comp_phase2_end) return 'Submission end date is required.';
    if (!form.comp_phase3_end) return 'Voting end date is required.';
    const start = new Date(form.start_date);
    const p1 = new Date(form.comp_phase1_end);
    const p2 = new Date(form.comp_phase2_end);
    const p3 = new Date(form.comp_phase3_end);
    if (p1 <= start) return 'Registration must end after the event start.';
    if (p2 <= p1) return 'Submission must end after registration ends.';
    if (p3 <= p2) return 'Voting must end after submission ends.';
    if (form.end_date && p3 > new Date(form.end_date)) {
        return 'Voting should end before or at the event end date.';
    }
    return null;
}

function _recalcTierTotal() {
    const totalEl = document.getElementById('ecCompTierTotal');
    if (!totalEl) return;
    const STATE = window.EventsCreateSteps.getState();
    const total = _tierTotal(STATE.form);
    totalEl.textContent = `Total: ${total}%`;
    totalEl.classList.toggle('ec-error-text', total !== 100);
}

function html() {
    const STATE = window.EventsCreateSteps.getState();
    const f = STATE.form;
    const locked = !!STATE.competitionLocked;
    const disabledAttr = locked ? 'disabled' : '';
    const tierTotal = _tierTotal(f);
    const lockBanner = locked
        ? '<div class="ec-lock-banner">Competition settings are locked after competitors register. Phase dates for active phases cannot be changed here.</div>'
        : '';
    return `
        ${lockBanner}
        <div class="ec-row">
            <p class="ec-help" style="margin-bottom:12px">Configure prize pool economics, competition rules, and initial phase schedule. Entry fee goes to the prize pool — not trip RSVP pricing.</p>
        </div>

        <div class="ec-review-card" style="margin-bottom:12px">
            <h3 class="font-bold text-gray-800 text-sm mb-2">Prizes</h3>
            <div class="ec-row">
                <label class="ec-label">Entry fee (USD)</label>
                <input id="ecCompEntryFee" class="ec-input" type="number" min="0" max="500" step="1" placeholder="0 = free" value="${_esc(f.comp_entry_fee_dollars)}" ${disabledAttr}>
                <p class="ec-help">Optional — collected at registration and added to the prize pool.</p>
            </div>
            <div class="ec-row">
                <label class="ec-label">House %</label>
                <input id="ecCompHousePct" class="ec-input" type="number" min="0" max="25" step="0.5" value="${_esc(f.comp_house_pct)}" ${disabledAttr}>
                <p class="ec-help">Taken from the prize pool before winner payouts (0–25%).</p>
            </div>
            <div class="ec-row">
                <label class="ec-label">Winner tiers</label>
                <div class="space-y-2">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-amber-600 w-10">1st</span>
                        <input id="ecCompTier1" type="number" min="1" max="100" class="ec-input" style="width:5rem" value="${_esc(f.comp_tier1_pct)}" ${disabledAttr}>
                        <span class="text-xs text-gray-400">%</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-gray-400 w-10">2nd</span>
                        <input id="ecCompTier2" type="number" min="0" max="50" class="ec-input" style="width:5rem" value="${_esc(f.comp_tier2_pct)}" ${disabledAttr}>
                        <span class="text-xs text-gray-400">%</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-orange-300 w-10">3rd</span>
                        <input id="ecCompTier3" type="number" min="0" max="30" class="ec-input" style="width:5rem" value="${_esc(f.comp_tier3_pct)}" ${disabledAttr}>
                        <span class="text-xs text-gray-400">%</span>
                    </div>
                </div>
                <p id="ecCompTierTotal" class="ec-help ${tierTotal !== 100 ? 'ec-error-text' : ''}">Total: ${tierTotal}%</p>
            </div>
        </div>

        <div class="ec-review-card" style="margin-bottom:12px">
            <h3 class="font-bold text-gray-800 text-sm mb-2">Rules</h3>
            <div class="ec-row">
                <label class="ec-label">Entry type</label>
                <select id="ecCompEntryType" class="ec-input" ${disabledAttr}>
                    <option value="any" ${f.comp_entry_type === 'any' ? 'selected' : ''}>Any (file, link, or text)</option>
                    <option value="file" ${f.comp_entry_type === 'file' ? 'selected' : ''}>File upload only (GFX)</option>
                    <option value="link" ${f.comp_entry_type === 'link' ? 'selected' : ''}>External link only</option>
                    <option value="text" ${f.comp_entry_type === 'text' ? 'selected' : ''}>Text description only</option>
                </select>
            </div>
            <div class="ec-row">
                <label class="ec-label">Minimum entries</label>
                <input id="ecCompMinEntries" class="ec-input" type="number" min="2" max="100" value="${_esc(f.comp_min_entries)}" ${disabledAttr}>
            </div>
            <div class="ec-row">
                <label class="ec-label">Extension days</label>
                <input id="ecCompExtensionDays" class="ec-input" type="number" min="1" max="14" value="${_esc(f.comp_extension_days)}" ${disabledAttr}>
                <p class="ec-help">If minimum entries aren't met, the host may extend registration.</p>
            </div>
            <div class="ec-row">
                <label class="ec-label">Max file size (MB)</label>
                <input id="ecCompMaxFileMb" class="ec-input" type="number" min="1" max="100" value="${_esc(f.comp_max_file_size_mb)}" ${disabledAttr}>
            </div>
            <label class="ec-checkbox-row">
                <input type="checkbox" id="ecCompEntriesVisible" ${f.comp_entries_visible ? 'checked' : ''} ${disabledAttr}>
                <div><div class="text-sm font-bold text-gray-800">Show entries before voting</div></div>
            </label>
            <div class="ec-row">
                <label class="ec-label">Who can vote</label>
                <select id="ecCompVoterEligibility" class="ec-input" ${disabledAttr}>
                    <option value="all_members" ${f.comp_voter_eligibility === 'all_members' ? 'selected' : ''}>All active members</option>
                    <option value="rsvped_only" ${f.comp_voter_eligibility === 'rsvped_only' ? 'selected' : ''}>RSVPed members only</option>
                    <option value="competitors_only" ${f.comp_voter_eligibility === 'competitors_only' ? 'selected' : ''}>Competitors only</option>
                </select>
            </div>
            <label class="ec-checkbox-row">
                <input type="checkbox" id="ecCompVoteTally" ${f.comp_vote_tally_visible ? 'checked' : ''} ${disabledAttr}>
                <div><div class="text-sm font-bold text-gray-800">Show live vote tally</div></div>
            </label>
        </div>

        <div class="ec-review-card">
            <h3 class="font-bold text-gray-800 text-sm mb-2">Phase schedule</h3>
            <p class="ec-help" style="margin-bottom:10px">Phase 1 starts at the event start date. Refine the submission window later in Manage → Comp if needed.</p>
            <div class="ec-row">
                <label class="ec-label">Registration ends</label>
                <input id="ecCompPhase1End" class="ec-input" type="datetime-local" value="${_esc(f.comp_phase1_end)}" ${disabledAttr}>
            </div>
            <div class="ec-row">
                <label class="ec-label">Submission ends</label>
                <input id="ecCompPhase2End" class="ec-input" type="datetime-local" value="${_esc(f.comp_phase2_end)}" ${disabledAttr}>
            </div>
            <div class="ec-row">
                <label class="ec-label">Voting ends</label>
                <input id="ecCompPhase3End" class="ec-input" type="datetime-local" value="${_esc(f.comp_phase3_end)}" ${disabledAttr}>
            </div>
        </div>
    `;
}

function wire() {
    const STATE = window.EventsCreateSteps.getState();
    if (STATE.competitionLocked) return;
    const f = STATE.form;
    const bind = (id, key, parser) => {
        document.getElementById(id)?.addEventListener('input', (e) => {
            f[key] = parser ? parser(e.target) : e.target.value;
            if (id.startsWith('ecCompTier')) _recalcTierTotal();
        });
        document.getElementById(id)?.addEventListener('change', (e) => {
            f[key] = parser ? parser(e.target) : e.target.value;
            if (id.startsWith('ecCompTier')) _recalcTierTotal();
        });
    };
    bind('ecCompEntryFee', 'comp_entry_fee_dollars');
    bind('ecCompHousePct', 'comp_house_pct');
    bind('ecCompTier1', 'comp_tier1_pct');
    bind('ecCompTier2', 'comp_tier2_pct');
    bind('ecCompTier3', 'comp_tier3_pct');
    bind('ecCompMinEntries', 'comp_min_entries');
    bind('ecCompExtensionDays', 'comp_extension_days');
    bind('ecCompMaxFileMb', 'comp_max_file_size_mb');
    bind('ecCompPhase1End', 'comp_phase1_end');
    bind('ecCompPhase2End', 'comp_phase2_end');
    bind('ecCompPhase3End', 'comp_phase3_end');
    document.getElementById('ecCompEntryType')?.addEventListener('change', (e) => { f.comp_entry_type = e.target.value; });
    document.getElementById('ecCompVoterEligibility')?.addEventListener('change', (e) => { f.comp_voter_eligibility = e.target.value; });
    document.getElementById('ecCompEntriesVisible')?.addEventListener('change', (e) => { f.comp_entries_visible = e.target.checked; });
    document.getElementById('ecCompVoteTally')?.addEventListener('change', (e) => { f.comp_vote_tally_visible = e.target.checked; });
}

export const createStepCompetitionApi = {
    html,
    wire,
    validateCompetition,
    buildCompetitionConfig,
    buildWinnerTierConfig,
    buildInitialPhases,
    hydrateCompetitionFormFields,
};

globalThis.EventsCreateSteps = globalThis.EventsCreateSteps || {};
globalThis.EventsCreateSteps.competition = createStepCompetitionApi;
