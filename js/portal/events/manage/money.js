// Portal Events — Manage money tab (Phase 5M.3B + §13.12 payment plans)

'use strict';

function api() {
    return window.EventsManageMoneyApi || {};
}

function esc(s) {
    const el = document.createElement('span');
    el.textContent = s == null ? '' : String(s);
    return el.innerHTML;
}
function money(cents) {
    return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
}

function formatDebitAt(iso, planStatus) {
    if (String(planStatus || '') === 'completed') return 'None';
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function planStatusPill(status) {
    const s = String(status || '');
    if (s === 'past_due') return '<span class="em-pill em-pill-not">Past due</span>';
    if (s === 'active') return '<span class="em-pill em-pill-going">Active</span>';
    if (s === 'completed') return '<span class="em-pill em-pill-checked">Completed</span>';
    if (s === 'setup') return '<span class="em-pill em-pill-maybe">Setup</span>';
    if (s === 'cancelled') return '<span class="em-pill em-pill-not">Cancelled</span>';
    return s ? `<span class="em-pill em-pill-maybe">${esc(s)}</span>` : '';
}

function methodLabel(method) {
    const m = String(method || '').toLowerCase();
    if (m === 'ach') return 'Bank (ACH)';
    if (m === 'card') return 'Card';
    return method || '—';
}

function planKindLabel(kind) {
    const k = String(kind || '').toLowerCase();
    if (k === 'full') return 'Full pay';
    if (k === 'monthly') return 'Monthly';
    return kind || '—';
}

// ═══════════════════════════════════════════════════════════════
async function loadMoney() {
    const STATE = api().getState?.() || {};
    const eventId = STATE.eventId;
    const isLlc = STATE.event?.event_type === 'llc';
    const queries = [
        supabaseClient
            .from('event_rsvps')
            .select('id, user_id, status, amount_paid_cents, paid, refunded, refund_amount_cents, stripe_payment_intent_id, profiles!event_rsvps_user_id_fkey(first_name, last_name, profile_picture_url)')
            .eq('event_id', eventId),
        supabaseClient
            .from('event_guest_rsvps')
            .select('id, guest_name, guest_email, status, paid, amount_paid_cents, stripe_payment_intent_id')
            .eq('event_id', eventId),
        supabaseClient
            .from('event_raffle_entries')
            .select('id, paid, amount_paid_cents')
            .eq('event_id', eventId),
        supabaseClient
            .from('prize_pool_contributions')
            .select('id, amount_cents')
            .eq('event_id', eventId),
        supabaseClient
            .from('event_payment_plans')
            .select('id, party_id, plan_kind, method, status, amount_paid_cents, remaining_cents, total_due_cents, next_debit_at')
            .eq('event_id', eventId),
        supabaseClient
            .from('event_parties')
            .select('id, payer_kind, payer_user_id, payer_guest_rsvp_id, invite_token, status')
            .eq('event_id', eventId),
        supabaseClient
            .from('event_payment_installments')
            .select('id, plan_id')
            .eq('event_id', eventId)
            .eq('status', 'failed'),
    ];
    if (isLlc) {
        queries.push(
            supabaseClient
                .from('event_cost_items')
                .select('*')
                .eq('event_id', eventId)
                .order('sort_order', { ascending: true }),
        );
    }
    const results = await Promise.all(queries);
    const [rsvpsRes, guestRes, raffleRes, poolRes, plansRes, partiesRes, failedInstRes, costRes] = results;
    const failedPlanIds = [...new Set((failedInstRes?.data || []).map((r) => r.plan_id).filter(Boolean))];
    return {
        rsvps:    rsvpsRes.data    || [],
        guests:   guestRes.data    || [],
        raffle:   raffleRes.data   || [],
        poolPays: poolRes.data     || [],
        plans:    plansRes?.data   || [],
        parties:  partiesRes?.data || [],
        failedPlanIds,
        costItems: isLlc ? (costRes?.data || []) : [],
        costBreakdown: isLlc ? (STATE.event?.cost_breakdown || null) : null,
    };
}

function payerNameFromParty(party, rsvps, guests) {
    if (!party) return 'Payer';
    if (party.payer_kind === 'member' && party.payer_user_id) {
        const row = (rsvps || []).find((r) => r.user_id === party.payer_user_id);
        const p = row?.profiles || {};
        return `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
    }
    if (party.payer_kind === 'guest' && party.payer_guest_rsvp_id) {
        const g = (guests || []).find((row) => row.id === party.payer_guest_rsvp_id);
        return (g?.guest_name || '').trim() || 'Guest';
    }
    return 'Payer';
}

function moneyHtml() {
    const STATE = api().getState?.() || {};
    const d = STATE.tabData.money || {};
    const adultCents = Number(STATE.event?.adult_price_cents);
    const isPaidEvent = STATE.event?.pricing_mode === 'paid'
        || (Number.isFinite(adultCents) && adultCents > 0)
        || Number(STATE.event?.rsvp_cost_cents || 0) > 0;
    const paidRsvps = (d.rsvps || []).filter(r => r.paid);
    const paidGuests = (d.guests || []).filter(g => g.paid);
    const refundedRsvps = (d.rsvps || []).filter(r => r.refunded);
    const unpaidGoing = isPaidEvent
        ? STATE.rsvps.filter(r => r.status === 'going' && !r.paid).length
            + STATE.guestRsvps.filter(g => g.status === 'going' && !g.paid).length
        : 0;

    const rsvpRevenue   = paidRsvps.reduce((s, r) => s + (r.amount_paid_cents || 0), 0);
    const guestRevenue  = paidGuests.reduce((s, g) => s + (g.amount_paid_cents || 0), 0);
    const raffleRevenue = (d.raffle || []).filter(e => e.paid).reduce((s, e) => s + (e.amount_paid_cents || 0), 0);
    const poolRevenue   = (d.poolPays || []).reduce((s, p) => s + (p.amount_cents || 0), 0);
    const refunded      = refundedRsvps.reduce((s, r) => s + (r.refund_amount_cents || 0), 0);
    const grossRevenue  = rsvpRevenue + guestRevenue + raffleRevenue + poolRevenue;
    const netRevenue    = grossRevenue - refunded;

    const plans = Array.isArray(d.plans) ? d.plans : [];
    const parties = Array.isArray(d.parties) ? d.parties : [];
    const partyById = new Map(parties.map((p) => [p.id, p]));
    const failedPlanSet = new Set(d.failedPlanIds || []);
    const openPlans = plans.filter((p) => {
        const st = String(p.status || '');
        return st === 'active' || st === 'past_due';
    });
    const pastDueCount = plans.filter((p) => String(p.status) === 'past_due' || failedPlanSet.has(p.id)).length;
    const remainingDue = openPlans.reduce((s, p) => s + (Number(p.remaining_cents) || 0), 0);

    const fmt = window.formatCurrency || money;

    function paymentRow({ name, sub, amount, refundedAmount, stripeId, avatarHtml, isGuest }) {
        const refundPill = refundedAmount
            ? `<span class="em-pill em-pill-not">Refunded ${fmt(refundedAmount)}</span>`
            : `<span class="em-pill em-pill-paid">${amount > 0 ? `Paid ${fmt(amount)}` : 'Ticketed'}</span>`;
        return `
            <div class="em-attendee-card">
                <div class="em-avatar"${isGuest ? ' style="background:#fef3c7;color:#92400e"' : ''}>${avatarHtml}</div>
                <div class="em-attendee-main">
                    <p class="em-attendee-name">${esc(name)}</p>
                    <p class="em-attendee-sub">${esc(sub)}</p>
                    <div class="flex flex-wrap gap-1 mt-2">${refundPill}${isGuest ? '<span class="em-pill em-pill-going">Guest</span>' : ''}</div>
                </div>
                ${stripeId ? `<a href="https://dashboard.stripe.com/payments/${encodeURIComponent(stripeId)}" target="_blank" rel="noopener" class="text-xs text-brand-600 font-semibold hover:underline whitespace-nowrap">Stripe ↗</a>` : ''}
            </div>`;
    }

    const memberRows = paidRsvps.map(r => {
        const p = r.profiles || {};
        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
        const initials = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || '?';
        const avatar = p.profile_picture_url ? `<img src="${esc(p.profile_picture_url)}" alt="">` : `<span>${initials}</span>`;
        return paymentRow({ name, sub: 'Member RSVP payment', amount: r.amount_paid_cents || 0, refundedAmount: r.refund_amount_cents || 0, stripeId: r.stripe_payment_intent_id, avatarHtml: avatar });
    });
    const guestRows = paidGuests.map(g => paymentRow({
        name: g.guest_name || 'Guest',
        sub: g.guest_email || 'Public guest payment',
        amount: g.amount_paid_cents || 0,
        refundedAmount: 0,
        stripeId: g.stripe_payment_intent_id,
        avatarHtml: `<span>${esc((g.guest_name || 'G').slice(0, 1).toUpperCase())}</span>`,
        isGuest: true,
    }));
    const paymentRows = [...memberRows, ...guestRows].join('') || `<p class="text-xs text-gray-400 italic py-2">No paid RSVPs yet.</p>`;

    const planRows = plans.length
        ? plans.map((plan) => {
            const party = partyById.get(plan.party_id);
            const name = payerNameFromParty(party, d.rsvps, d.guests);
            const isGuest = party?.payer_kind === 'guest';
            const initials = (name || 'P').slice(0, 1).toUpperCase();
            const failed = String(plan.status) === 'past_due' || failedPlanSet.has(plan.id);
            const pills = [
                planStatusPill(plan.status),
                failed ? '<span class="em-pill em-pill-not">Failed charge</span>' : '',
                `<span class="em-pill em-pill-going">${esc(planKindLabel(plan.plan_kind))}</span>`,
                `<span class="em-pill em-pill-maybe">${esc(methodLabel(plan.method))}</span>`,
                isGuest ? '<span class="em-pill em-pill-going">Guest</span>' : '',
            ].filter(Boolean).join('');
            const inviteTok = party?.invite_token ? esc(party.invite_token) : '';
            const copyBtn = inviteTok
                ? `<button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-money-copy-pay-link="${inviteTok}">Copy payment link</button>`
                : '';
            return `
                <div class="em-attendee-card">
                    <div class="em-avatar"${isGuest ? ' style="background:#fef3c7;color:#92400e"' : ''}><span>${esc(initials)}</span></div>
                    <div class="em-attendee-main">
                        <p class="em-attendee-name">${esc(name)}</p>
                        <p class="em-attendee-sub">Paid ${fmt(plan.amount_paid_cents || 0)} · Remaining ${fmt(plan.remaining_cents || 0)} · Next debit ${esc(formatDebitAt(plan.next_debit_at, plan.status))}</p>
                        <div class="flex flex-wrap gap-1 mt-2">${pills}</div>
                        ${copyBtn ? `<div style="margin-top:8px">${copyBtn}</div>` : ''}
                    </div>
                </div>`;
        }).join('')
        : `<p class="text-xs text-gray-400 italic py-2">No payment plans yet.</p>`;

    const isLlc = STATE.event?.event_type === 'llc';
    const costItems = d.costItems || [];
    const costBreakdown = d.costBreakdown || {};
    const goingCount = (STATE.rsvps || []).filter((r) => (
        window.EventsHelpers?.rsvpIsCommittedGoing
            ? window.EventsHelpers.rsvpIsCommittedGoing(STATE.event, r)
            : (STATE.event?.pricing_mode === 'paid' ? r.paid === true : r.status === 'going')
    )).length
        + (STATE.guestRsvps || []).filter((g) => (
            window.EventsHelpers?.rsvpIsCommittedGoing
                ? window.EventsHelpers.rsvpIsCommittedGoing(STATE.event, g)
                : (STATE.event?.pricing_mode === 'paid' ? g.paid === true : g.status === 'going')
        )).length;
    const buyInCents = Number(STATE.event?.adult_price_cents ?? STATE.event?.rsvp_cost_cents ?? 0);
    const budgetIncluded = Number(costBreakdown.total_included_cents)
        || costItems
            .filter((i) => i.included_in_buyin !== false)
            .reduce((s, i) => s + (Number(i.total_cost_cents) || 0), 0);
    const projectedAtGoing = goingCount * buyInCents;
    const budgetDelta = projectedAtGoing - budgetIncluded;
    const budgetDeltaLabel = budgetDelta >= 0
        ? `${fmt(budgetDelta)} over budget at current RSVPs`
        : `${fmt(Math.abs(budgetDelta))} under budget at current RSVPs`;

    function llcBudgetHtml() {
        if (!isLlc) return '';
        const itemRows = costItems.length
            ? costItems.map((item) => {
                const included = item.included_in_buyin !== false;
                const amt = included
                    ? (Number(item.total_cost_cents) || 0)
                    : (Number(item.avg_per_person_cents) || 0);
                const amtLabel = included ? fmt(amt) : `~${fmt(amt)}/person`;
                return `<div class="em-money-row"><span>${esc(item.name || 'Item')}${included ? '' : ' (OOP)'}</span><strong>${amtLabel}</strong></div>`;
            }).join('')
            : `<p class="text-xs text-gray-400 italic py-2">No cost items on file. Budget totals use saved breakdown if available.</p>`;
        return `
            <div class="em-card">
                <div class="em-section-head"><div><h3 class="em-section-title">Trip budget</h3><p class="em-section-sub">Planned costs vs RSVP revenue collected.</p></div></div>
                ${itemRows}
                <div class="em-money-row" style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb"><span>Included budget total</span><strong>${fmt(budgetIncluded)}</strong></div>
                ${costBreakdown.final_buyin_cents ? `<div class="em-money-row"><span>Suggested buy-in</span><strong>${fmt(costBreakdown.final_buyin_cents)}/person</strong></div>` : ''}
                ${costBreakdown.llc_cut_cents ? `<div class="em-money-row"><span>LLC cut (per person)</span><strong>+${fmt(costBreakdown.llc_cut_cents)}</strong></div>` : ''}
                <div class="em-money-row"><span>Collected (net RSVP)</span><strong>${fmt(netRevenue)}</strong></div>
                <div class="em-money-row"><span>Projected at ${goingCount} going</span><strong>${fmt(projectedAtGoing)}</strong></div>
                ${budgetIncluded > 0 ? `<p class="text-xs text-gray-500 mt-2">${budgetDeltaLabel}.</p>` : ''}
            </div>`;
    }

    const plansSection = isPaidEvent || plans.length ? `
            <div class="em-card mb-4" style="grid-column:1/-1">
                <div class="em-section-head"><div><h3 class="em-section-title">Payment plans <span class="text-gray-400 font-normal">· ${plans.length}</span></h3><p class="em-section-sub">Per-payer paid, remaining, next debit, and failed charges (Stripe-backed schedule).</p></div></div>
                ${planRows}
            </div>` : '';

    return `
        <div class="em-card em-command-card mb-4">
            <p class="em-command-eyebrow">Money command</p>
            <h3 class="em-command-title">${fmt(netRevenue)} net collected</h3>
            <p class="em-command-copy">${grossRevenue ? `${fmt(grossRevenue)} gross across RSVP, guest, raffle, and prize-pool activity.` : (isPaidEvent ? 'No paid activity has landed yet.' : 'This free event has no RSVP revenue to collect.')} ${unpaidGoing ? `${unpaidGoing} going attendee${unpaidGoing === 1 ? '' : 's'} still show unpaid.` : (isPaidEvent ? 'No unpaid going attendees are currently flagged.' : 'Ticketed attendees are tracked for access and check-in.')}${pastDueCount ? ` ${pastDueCount} plan${pastDueCount === 1 ? '' : 's'} past due.` : ''}</p>
        </div>

        <div class="em-metric-grid mb-4">
            <div class="em-metric"><span>Gross</span><strong>${fmt(grossRevenue)}</strong><small>All sources</small></div>
            <div class="em-metric"><span>Net</span><strong>${fmt(netRevenue)}</strong><small>After refunds</small></div>
            <div class="em-metric"><span>Past due</span><strong>${pastDueCount}</strong><small>Plans / failed</small></div>
            <div class="em-metric"><span>Remaining due</span><strong>${fmt(remainingDue)}</strong><small>Open plans</small></div>
        </div>

        ${plansSection}

        <div class="em-money-layout">
            <div class="em-card">
                <div class="em-section-head"><div><h3 class="em-section-title">${isPaidEvent ? 'One-shot / ticketed' : 'Ticketed attendees'} <span class="text-gray-400 font-normal">· ${paidRsvps.length + paidGuests.length}</span></h3><p class="em-section-sub">${isPaidEvent ? 'Legacy RSVP payment rows (audit). Prefer Payment plans above for schedules.' : 'Members and public guests with issued event tickets.'}</p></div></div>
                ${paymentRows}
            </div>

            <div class="em-card">
                <div class="em-section-head"><div><h3 class="em-section-title">Revenue sources</h3><p class="em-section-sub">Quick audit of how money entered this event.</p></div></div>
                <div class="em-money-row"><span>Member RSVP payments</span><strong>${fmt(rsvpRevenue)}</strong></div>
                <div class="em-money-row"><span>Guest RSVP payments</span><strong>${fmt(guestRevenue)}</strong></div>
                <div class="em-money-row"><span>Raffle entries</span><strong>${fmt(raffleRevenue)}</strong></div>
                <div class="em-money-row"><span>Prize-pool contributions</span><strong>${fmt(poolRevenue)}</strong></div>
                <div class="em-money-row"><span>Refunds recorded</span><strong>${fmt(refunded)}</strong></div>
                <p class="text-xs text-gray-400 mt-3">Refunds are still handled through Stripe/dashboard tooling. This panel keeps the host-facing audit trail together.</p>
            </div>

            ${llcBudgetHtml()}
        </div>
    `;
}

function wireMoney() {
    const panel = document.getElementById('emSheetContent');
    panel?.querySelectorAll('[data-money-copy-pay-link]').forEach((btn) => {
        if (btn.dataset.copyWired) return;
        btn.dataset.copyWired = '1';
        btn.addEventListener('click', async () => {
            const token = btn.getAttribute('data-money-copy-pay-link') || '';
            const url = window.EventsHelpers?.paymentMagicLinkUrl
                ? window.EventsHelpers.paymentMagicLinkUrl(token)
                : `${window.location.origin}/events/payments/?t=${encodeURIComponent(token)}`;
            if (!url) return;
            try {
                if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
                else {
                    const ta = document.createElement('textarea');
                    ta.value = url;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    ta.remove();
                }
                const prev = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = prev || 'Copy payment link'; }, 1500);
            } catch (_) {
                prompt('Copy this payment link:', url);
            }
        });
    });
}

export const manageMoneyApi = {
    loadMoney,
    moneyHtml,
    wireMoney
};

globalThis.EventsManageMoney = manageMoneyApi;
