// Portal Events — Manage money tab (Phase 5M.3B)

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

// ═══════════════════════════════════════════════════════════════
// M3b — MONEY TAB
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
    const [rsvpsRes, guestRes, raffleRes, poolRes, costRes] = results;
    return {
        rsvps:    rsvpsRes.data    || [],
        guests:   guestRes.data    || [],
        raffle:   raffleRes.data   || [],
        poolPays: poolRes.data     || [],
        costItems: isLlc ? (costRes?.data || []) : [],
        costBreakdown: isLlc ? (STATE.event?.cost_breakdown || null) : null,
    };
}

function moneyHtml() {
    const STATE = api().getState?.() || {};
    const d = STATE.tabData.money;
    const adultCents = Number(STATE.event?.adult_price_cents);
    const isPaidEvent = STATE.event?.pricing_mode === 'paid'
        || (Number.isFinite(adultCents) && adultCents > 0)
        || Number(STATE.event?.rsvp_cost_cents || 0) > 0;
    const paidRsvps = d.rsvps.filter(r => r.paid);
    const paidGuests = d.guests.filter(g => g.paid);
    const refundedRsvps = d.rsvps.filter(r => r.refunded);
    const unpaidGoing = isPaidEvent ? STATE.rsvps.filter(r => r.status === 'going' && !r.paid).length + STATE.guestRsvps.filter(g => g.status === 'going' && !g.paid).length : 0;

    const rsvpRevenue   = paidRsvps.reduce((s, r) => s + (r.amount_paid_cents || 0), 0);
    const guestRevenue  = paidGuests.reduce((s, g) => s + (g.amount_paid_cents || 0), 0);
    const raffleRevenue = d.raffle.filter(e => e.paid).reduce((s, e) => s + (e.amount_paid_cents || 0), 0);
    const poolRevenue   = d.poolPays.reduce((s, p) => s + (p.amount_cents || 0), 0);
    const refunded      = refundedRsvps.reduce((s, r) => s + (r.refund_amount_cents || 0), 0);
    const grossRevenue  = rsvpRevenue + guestRevenue + raffleRevenue + poolRevenue;
    const netRevenue    = grossRevenue - refunded;

    const fmt = window.formatCurrency || money;
    const ticketLabel = isPaidEvent ? 'Paid RSVPs' : 'Ticketed RSVPs';

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

    const isLlc = STATE.event?.event_type === 'llc';
    const costItems = d.costItems || [];
    const costBreakdown = d.costBreakdown || {};
    const goingCount = STATE.rsvps.filter((r) => r.status === 'going').length
        + STATE.guestRsvps.filter((g) => g.status === 'going').length;
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

    return `
        <div class="em-card em-command-card mb-4">
            <p class="em-command-eyebrow">Money command</p>
            <h3 class="em-command-title">${fmt(netRevenue)} net collected</h3>
            <p class="em-command-copy">${grossRevenue ? `${fmt(grossRevenue)} gross across RSVP, guest, raffle, and prize-pool activity.` : (isPaidEvent ? 'No paid activity has landed yet.' : 'This free event has no RSVP revenue to collect.')} ${unpaidGoing ? `${unpaidGoing} going attendee${unpaidGoing === 1 ? '' : 's'} still show unpaid.` : (isPaidEvent ? 'No unpaid going attendees are currently flagged.' : 'Ticketed attendees are tracked for access and check-in.')}</p>
        </div>

        <div class="em-metric-grid mb-4">
            <div class="em-metric"><span>Gross</span><strong>${fmt(grossRevenue)}</strong><small>All sources</small></div>
            <div class="em-metric"><span>Net</span><strong>${fmt(netRevenue)}</strong><small>After refunds</small></div>
            <div class="em-metric"><span>Refunded</span><strong>${fmt(refunded)}</strong><small>${refundedRsvps.length} member RSVP${refundedRsvps.length === 1 ? '' : 's'}</small></div>
            <div class="em-metric"><span>${ticketLabel}</span><strong>${paidRsvps.length + paidGuests.length}</strong><small>${paidRsvps.length} member · ${paidGuests.length} guest</small></div>
        </div>

        <div class="em-money-layout">
            <div class="em-card">
                <div class="em-section-head"><div><h3 class="em-section-title">${isPaidEvent ? 'Paid attendees' : 'Ticketed attendees'} <span class="text-gray-400 font-normal">· ${paidRsvps.length + paidGuests.length}</span></h3><p class="em-section-sub">${isPaidEvent ? 'Member and public guest RSVP payments.' : 'Members and public guests with issued event tickets.'}</p></div></div>
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
    const STATE = api().getState?.() || {}; /* read-only in M3b */ }

export const manageMoneyApi = {
    loadMoney,
    moneyHtml,
    wireMoney
};

globalThis.EventsManageMoney = manageMoneyApi;
