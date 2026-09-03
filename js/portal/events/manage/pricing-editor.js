// Portal Events — Manage overview: Pricing & capacity editor (hard-lock after RSVPs)

'use strict';

import { validateFundDeadline } from '../create/pricing-helpers.js';

function api() {
    return window.EventsManageOverviewApi || {};
}

function getState() {
    return api().getState?.() || {};
}

function esc(s) {
    const el = document.createElement('span');
    el.textContent = s == null ? '' : String(s);
    return el.innerHTML;
}

function centsToDollars(cents) {
    if (cents == null || cents === '') return '';
    const n = Number(cents);
    if (!Number.isFinite(n)) return '';
    return (n / 100).toFixed(2);
}

function toDatetimeLocalValue(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function pricingLocked(STATE) {
    const members = Array.isArray(STATE?.rsvps) ? STATE.rsvps.length : 0;
    const guests = Array.isArray(STATE?.guestRsvps) ? STATE.guestRsvps.length : 0;
    return members + guests > 0;
}

function adultCentsFromEvent(e) {
    if (e?.adult_price_cents != null && Number.isFinite(Number(e.adult_price_cents))) {
        return Number(e.adult_price_cents);
    }
    return Number(e?.rsvp_cost_cents || 0);
}

function readFormValues() {
    const modePaid = document.querySelector('input[name="emPriceMode"]:checked')?.value === 'paid';
    const pricingMode = modePaid ? 'paid' : 'free';
    const adultDollars = document.getElementById('emAdultPrice')?.value ?? '';
    const kidsFree = !!document.getElementById('emKidsFree')?.checked;
    const kidDollars = document.getElementById('emKidPrice')?.value ?? '';
    const fundDeadline = document.getElementById('emFundDeadline')?.value ?? '';
    const capacityMode = document.querySelector('input[name="emCapacityMode"]:checked')?.value || 'none';
    const capacityCounts = document.querySelector('input[name="emCapacityCounts"]:checked')?.value || 'adults';
    const maxParticipants = document.getElementById('emCapacityMax')?.value ?? '';
    return {
        pricing_mode: pricingMode,
        adult_price_dollars: adultDollars,
        kids_free: pricingMode === 'paid' ? kidsFree : true,
        kid_price_dollars: kidDollars,
        fund_deadline: fundDeadline,
        capacity_mode: capacityMode,
        capacity_counts: capacityCounts,
        max_participants: maxParticipants,
        start_date: getState().event?.start_date || '',
    };
}

function validatePricingForm(f, existingMode) {
    if (existingMode !== 'free_paid_raffle' && f.pricing_mode === 'paid') {
        if (!f.adult_price_dollars || Number(f.adult_price_dollars) <= 0) {
            return 'Paid events need an adult price greater than zero.';
        }
        if (!f.kids_free) {
            if (f.kid_price_dollars === '' || Number.isNaN(Number(f.kid_price_dollars))) {
                return 'Kid price is required when kids are not free.';
            }
            if (Number(f.kid_price_dollars) < 0) return 'Kid price cannot be negative.';
        }
        const fundErr = validateFundDeadline(f);
        if (fundErr) return fundErr;
    }
    if (f.capacity_mode === 'soft' || f.capacity_mode === 'hard') {
        if (!f.max_participants || Number(f.max_participants) <= 0) {
            return 'Seat limit is required when using a capacity cap.';
        }
    }
    return null;
}

function buildUpdatePayload(f, existingMode) {
    const capacityMode = f.capacity_mode || 'none';
    const capacityCounts = f.capacity_counts || 'adults';
    const maxParticipants = capacityMode === 'none'
        ? null
        : (f.max_participants ? Number(f.max_participants) : null);

    if (existingMode === 'free_paid_raffle') {
        return {
            capacity_mode: capacityMode,
            capacity_counts: capacityCounts,
            max_participants: maxParticipants,
        };
    }

    const adultCents = f.pricing_mode === 'paid' ? Math.round(Number(f.adult_price_dollars || 0) * 100) : 0;
    const kidsFree = f.pricing_mode === 'paid' ? !!f.kids_free : true;
    const kidCents = (f.pricing_mode === 'paid' && !kidsFree)
        ? Math.round(Number(f.kid_price_dollars || 0) * 100) : null;
    const fundDeadlineISO = (f.pricing_mode === 'paid' && f.fund_deadline)
        ? new Date(f.fund_deadline).toISOString() : null;

    return {
        pricing_mode: f.pricing_mode === 'paid' ? 'paid' : 'free',
        adult_price_cents: adultCents,
        rsvp_cost_cents: adultCents,
        kids_free: kidsFree,
        kid_price_cents: kidCents,
        fund_deadline: fundDeadlineISO,
        capacity_mode: capacityMode,
        capacity_counts: capacityCounts,
        max_participants: maxParticipants,
    };
}

async function countEventRsvps(eventId) {
    const [memberRes, guestRes] = await Promise.all([
        supabaseClient.from('event_rsvps').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
        supabaseClient.from('event_guest_rsvps').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    ]);
    if (memberRes.error) throw memberRes.error;
    if (guestRes.error) throw guestRes.error;
    return (memberRes.count || 0) + (guestRes.count || 0);
}

export function pricingEditorHtml(STATE) {
    const e = STATE.event;
    if (!e) return '';
    const locked = pricingLocked(STATE);
    const isRaffleMode = e.pricing_mode === 'free_paid_raffle';
    const pricingMode = e.pricing_mode === 'paid' ? 'paid' : (isRaffleMode ? 'free_paid_raffle' : 'free');
    const showPaid = pricingMode === 'paid';
    const kidsFree = e.kids_free !== false;
    const capacityMode = e.capacity_mode || 'none';
    const showCapacityLimit = capacityMode === 'soft' || capacityMode === 'hard';
    const adultDollars = centsToDollars(adultCentsFromEvent(e));
    const kidDollars = centsToDollars(e.kid_price_cents);
    const fundLocal = toDatetimeLocalValue(e.fund_deadline);
    const disabledAttr = locked ? 'disabled' : '';
    const lockBanner = locked
        ? `<div class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Pricing and capacity are locked after RSVPs. Changes aren’t applied retroactively, and refunds aren’t available in the event system.</div>`
        : `<p class="em-section-sub mb-3">Edit before anyone RSVPs. After the first RSVP, these settings lock permanently.</p>`;

    const modeRadios = isRaffleMode
        ? `<div class="text-sm text-gray-700 font-medium">Free + paid raffle <span class="text-xs text-gray-400 font-normal">(mode not editable here)</span></div>`
        : `
        <div class="flex flex-col gap-2">
            <label class="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="emPriceMode" value="free" ${pricingMode !== 'paid' ? 'checked' : ''} ${disabledAttr}>
                <span class="text-sm text-gray-800 font-medium">Free</span>
            </label>
            <label class="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="emPriceMode" value="paid" ${pricingMode === 'paid' ? 'checked' : ''} ${disabledAttr}>
                <span class="text-sm text-gray-800 font-medium">Paid</span>
            </label>
        </div>`;

    return `
        <div class="em-card mb-3" id="emPricingEditorCard">
            <div class="em-section-head" style="margin-bottom:12px">
                <div>
                    <h3 class="em-section-title">Pricing &amp; capacity</h3>
                    ${lockBanner}
                </div>
            </div>
            <form id="emPricingForm" class="space-y-3">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Pricing mode</label>
                    ${modeRadios}
                </div>

                <div id="emPaidFields" class="${showPaid ? '' : 'hidden'} space-y-3">
                    <div>
                        <label for="emAdultPrice" class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Adult price (USD)</label>
                        <input id="emAdultPrice" class="em-input" type="number" min="0" step="0.01" placeholder="0.00" value="${esc(adultDollars)}" ${disabledAttr}>
                    </div>
                    <label class="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" id="emKidsFree" ${kidsFree ? 'checked' : ''} ${disabledAttr}>
                        <span>
                            <span class="block text-sm font-medium text-gray-800">Kids attend free</span>
                            <span class="block text-xs text-gray-500">Children are not billed for this event.</span>
                        </span>
                    </label>
                    <div id="emKidPriceRow" class="${!kidsFree && showPaid ? '' : 'hidden'}">
                        <label for="emKidPrice" class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Kid price (USD)</label>
                        <input id="emKidPrice" class="em-input" type="number" min="0" step="0.01" placeholder="0.00" value="${esc(kidDollars)}" ${disabledAttr}>
                    </div>
                    <div>
                        <label for="emFundDeadline" class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Fund deadline</label>
                        <input id="emFundDeadline" class="em-input" type="datetime-local" value="${esc(fundLocal)}" ${disabledAttr}>
                        <p class="text-xs text-gray-400 mt-1">Optional. Last date attendees must finish paying.</p>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Capacity</label>
                    <div class="flex flex-col gap-2">
                        <label class="flex items-start gap-2 cursor-pointer">
                            <input type="radio" name="emCapacityMode" value="none" ${capacityMode === 'none' ? 'checked' : ''} ${disabledAttr}>
                            <span class="text-sm text-gray-800 font-medium">No limit</span>
                        </label>
                        <label class="flex items-start gap-2 cursor-pointer">
                            <input type="radio" name="emCapacityMode" value="soft" ${capacityMode === 'soft' ? 'checked' : ''} ${disabledAttr}>
                            <span class="text-sm text-gray-800 font-medium">Soft cap + waitlist</span>
                        </label>
                        <label class="flex items-start gap-2 cursor-pointer">
                            <input type="radio" name="emCapacityMode" value="hard" ${capacityMode === 'hard' ? 'checked' : ''} ${disabledAttr}>
                            <span class="text-sm text-gray-800 font-medium">Hard cap</span>
                        </label>
                    </div>
                </div>

                <div id="emCapacityLimitFields" class="${showCapacityLimit ? '' : 'hidden'} space-y-3">
                    <div>
                        <label for="emCapacityMax" class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Seat limit</label>
                        <input id="emCapacityMax" class="em-input" type="number" min="1" placeholder="e.g. 50" value="${esc(e.max_participants || '')}" ${disabledAttr}>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Counts toward limit</label>
                        <div class="flex flex-col gap-2">
                            <label class="flex items-start gap-2 cursor-pointer">
                                <input type="radio" name="emCapacityCounts" value="adults" ${(e.capacity_counts || 'adults') === 'adults' ? 'checked' : ''} ${disabledAttr}>
                                <span class="text-sm text-gray-800 font-medium">Adults only</span>
                            </label>
                            <label class="flex items-start gap-2 cursor-pointer">
                                <input type="radio" name="emCapacityCounts" value="all" ${e.capacity_counts === 'all' ? 'checked' : ''} ${disabledAttr}>
                                <span class="text-sm text-gray-800 font-medium">Adults and kids</span>
                            </label>
                        </div>
                    </div>
                </div>

                ${locked ? '' : `
                <div class="flex flex-wrap items-center gap-2 pt-1">
                    <button type="submit" id="emPricingSave" class="em-btn-primary">Save pricing</button>
                    <button type="button" id="emPricingCancel" class="em-btn-ghost">Cancel</button>
                    <span id="emPricingStatus" class="text-xs text-gray-400"></span>
                </div>`}
                ${locked ? '<span id="emPricingStatus" class="hidden"></span>' : ''}
            </form>
        </div>
    `;
}

function syncPaidVisibility() {
    const paid = document.querySelector('input[name="emPriceMode"]:checked')?.value === 'paid';
    const paidFields = document.getElementById('emPaidFields');
    if (paidFields) paidFields.classList.toggle('hidden', !paid);
    syncKidPriceVisibility();
}

function syncKidPriceVisibility() {
    const paid = document.querySelector('input[name="emPriceMode"]:checked')?.value === 'paid';
    const kidsFree = !!document.getElementById('emKidsFree')?.checked;
    const row = document.getElementById('emKidPriceRow');
    if (row) row.classList.toggle('hidden', !(paid && !kidsFree));
}

function syncCapacityVisibility() {
    const mode = document.querySelector('input[name="emCapacityMode"]:checked')?.value || 'none';
    const fields = document.getElementById('emCapacityLimitFields');
    if (fields) fields.classList.toggle('hidden', mode === 'none');
    if (mode === 'none') {
        const max = document.getElementById('emCapacityMax');
        if (max) max.value = '';
    }
}

export function wirePricingEditor() {
    const STATE = getState();
    if (!STATE.event) return;
    const locked = pricingLocked(STATE);
    const form = document.getElementById('emPricingForm');
    if (!form) return;

    if (!locked) {
        document.querySelectorAll('input[name="emPriceMode"]').forEach((el) => {
            el.addEventListener('change', syncPaidVisibility);
        });
        document.getElementById('emKidsFree')?.addEventListener('change', syncKidPriceVisibility);
        document.querySelectorAll('input[name="emCapacityMode"]').forEach((el) => {
            el.addEventListener('change', syncCapacityVisibility);
        });
        form.addEventListener('submit', (ev) => {
            ev.preventDefault();
            saveEventPricing();
        });
        document.getElementById('emPricingCancel')?.addEventListener('click', () => {
            api().renderTab?.('overview');
            setTimeout(() => {
                const status = document.getElementById('emPricingStatus');
                if (status) {
                    status.className = 'text-xs text-gray-400';
                    status.textContent = 'Changes discarded';
                    setTimeout(() => { status.textContent = ''; }, 1800);
                }
            }, 0);
        });
    }
}

export async function saveEventPricing() {
    const STATE = getState();
    const e = STATE.event;
    const saveBtn = document.getElementById('emPricingSave');
    const status = document.getElementById('emPricingStatus');

    function setStatus(message, isError) {
        if (!status) return;
        status.className = isError ? 'text-xs text-red-600' : 'text-xs text-gray-400';
        status.textContent = message;
    }

    if (!e) return;
    if (pricingLocked(STATE)) {
        setStatus('Pricing is locked after RSVPs.', true);
        return;
    }

    const formValues = readFormValues();
    const validationError = validatePricingForm(formValues, e.pricing_mode);
    if (validationError) {
        setStatus(validationError, true);
        return;
    }

    const payload = buildUpdatePayload(formValues, e.pricing_mode);
    if (saveBtn) saveBtn.disabled = true;
    setStatus('Saving…', false);

    try {
        const rsvpCount = await countEventRsvps(e.id);
        if (rsvpCount > 0) {
            throw new Error('Pricing is locked after RSVPs. Refresh manage to see the lock.');
        }

        const { data, error } = await supabaseClient
            .from('events')
            .update(payload)
            .eq('id', e.id)
            .select('pricing_mode, adult_price_cents, rsvp_cost_cents, kids_free, kid_price_cents, fund_deadline, capacity_mode, capacity_counts, max_participants')
            .single();
        if (error) throw error;

        Object.assign(STATE.event, data || payload);
        api().renderHeader?.();
        api().renderTab?.('overview');
        setTimeout(() => {
            const refreshedStatus = document.getElementById('emPricingStatus');
            if (refreshedStatus) {
                refreshedStatus.className = 'text-xs text-emerald-600';
                refreshedStatus.textContent = 'Saved pricing.';
                setTimeout(() => { refreshedStatus.textContent = ''; }, 2500);
            }
        }, 0);
        api().notifyParent?.('updated', e.id);
    } catch (err) {
        setStatus('Update failed: ' + (err.message || 'unknown error'), true);
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

export const managePricingEditorApi = {
    pricingLocked,
    pricingEditorHtml,
    wirePricingEditor,
    saveEventPricing,
};

globalThis.EventsManagePricingEditor = managePricingEditorApi;
