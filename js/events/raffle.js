/* ──────────────────────────────────────────
   Public Event — Raffle (member + guest, paid + free)
   ────────────────────────────────────────── */

async function pubRenderRaffleSection(event) {
    if (!event.raffle_enabled) {
        const existing = document.getElementById('raffleSection');
        if (existing) existing.classList.add('hidden');
        return;
    }

    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast   = new Date(event.start_date) < new Date() && event.status !== 'active';
    const deadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();
    const entriesClosed = isClosed || isPast || deadlinePassed;

    // Get or create raffle container
    let el = document.getElementById('raffleSection');
    if (!el) {
        el = document.createElement('div');
        el.id = 'raffleSection';
        // Insert after rsvpSection
        const rsvpEl = document.getElementById('rsvpSection');
        if (rsvpEl) rsvpEl.insertAdjacentElement('afterend', el);
        else return;
    }
    el.classList.remove('hidden');

    const raffleConfig = pubRaffleConfig(event);
    const categories = pubRaffleCategories(raffleConfig);
    const totalWinners = pubRaffleWinnerCount(raffleConfig, event);
    const prizesHtml = pubRafflePrizesHtml(event);

    // Check if current user has raffle entry. Primary entry actions live in
    // the mobile CTA; this section now shows raffle details and status only.
    let myEntryHtml = '';
    let lockedBtnHtml = '';

    if (entriesClosed) {
        // Show greyed-out locked button
        const reason = isClosed
            ? (event.status === 'cancelled' ? 'Event cancelled' : 'Event ended')
            : isPast ? 'Event in progress' : 'RSVP deadline passed';
        lockedBtnHtml = `
            <button class="evt-raffle-locked" disabled style="margin-top:16px">
                <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
                ${reason}
            </button>`;
    } else if (event.pricing_mode === 'paid') {
        // Paid event — raffle is bundled with RSVP
        myEntryHtml = `<p style="font-size:13px;color:#717171;font-style:italic;margin-top:12px">Raffle entry included with paid RSVP</p>`;
    } else if (pubCurrentUser) {
        // ── Signed-in member on a non-paid event ──
        const { data: myEntry } = await supabaseClient
            .from('event_raffle_entries')
            .select('id, paid')
            .eq('event_id', event.id)
            .eq('user_id', pubCurrentUser.id)
            .maybeSingle();

        if (myEntry) {
            myEntryHtml = `<div class="ed-raffle-entry-chip" style="margin-top:14px">🎟️ Entered</div>`;
        } else myEntryHtml = `<p class="public-raffle-empty" style="margin-top:14px">Use the sticky CTA below to enter the raffle.</p>`;
    } else {
        myEntryHtml = pubGuestRaffleEntry
            ? `<div class="ed-raffle-entry-chip" style="margin-top:14px">🎟️ Entered</div>`
            : `<p class="public-raffle-empty" style="margin-top:14px">Use the sticky CTA below to enter the raffle.</p>`;
    }

    // Load winners
    const winners = await pubLoadRaffleWinners(event.id);
    const guestWinnerTokens = [...new Set((winners || []).map(w => w.guest_token).filter(Boolean))];
    let guestWinnerNames = new Map();
    if (guestWinnerTokens.length) {
        const { data: guestRows } = await supabaseClient
            .from('event_guest_rsvps')
            .select('guest_token, guest_name')
            .in('guest_token', guestWinnerTokens);
        guestWinnerNames = new Map((guestRows || []).map(row => [row.guest_token, row.guest_name]));
    }

    const winnersHtml = pubRaffleWinnersHtml(winners || [], guestWinnerNames);
    const entryPillsHtml = pubRafflePillsHtml(event, totalWinners);
    const hasPrizes = categories.length > 0;

    const sectionHtml = `
        <div class="public-raffle-head">
            <div>
                <p class="public-raffle-eyebrow">Raffle</p>
                <h4 class="evt-section-title public-raffle-title">Prize Drawing</h4>
            </div>
            ${totalWinners ? `<span class="public-raffle-count">${totalWinners} ${totalWinners === 1 ? 'winner' : 'winners'}</span>` : ''}
        </div>

        <div class="ed-pill-row public-raffle-pills">${entryPillsHtml}</div>

        <div class="ed-raffle-content-grid public-raffle-content-grid">
            ${hasPrizes ? `
                <div class="public-raffle-block">
                    <div class="ed-section-head"><h3>Prizes</h3></div>
                    ${prizesHtml}
                </div>
            ` : `
                <p class="public-raffle-empty">Prizes to be announced</p>
            `}
            ${winnersHtml}
        </div>

        ${myEntryHtml}
        ${lockedBtnHtml}
    `;

    const isCardMount = el.classList.contains('ed-card');
    el.innerHTML = isCardMount ? sectionHtml : `<div class="evt-section public-raffle-section">${sectionHtml}</div><hr class="evt-divider">`;
}

function pubRaffleConfig(event) {
    if (!window.EventsRaffleModel) return event?.raffle_prizes || [];
    return window.EventsRaffleModel.normalizeConfig(event?.raffle_prizes || []);
}

function pubRaffleCategories(config) {
    if (!window.EventsRaffleModel) return [];
    return window.EventsRaffleModel.getOrderedCategories(config);
}

function pubRaffleItems(config, categoryId) {
    if (!window.EventsRaffleModel) return [];
    return window.EventsRaffleModel.getItemsForCategory(config, categoryId);
}

function pubRaffleWinnerCount(config, event) {
    if (window.EventsRaffleModel) return window.EventsRaffleModel.getTotalWinnerCount(config);
    return event?.raffle_winner_count || (Array.isArray(event?.raffle_prizes) ? event.raffle_prizes.length : 0);
}

function pubRaffleDrawModeLabel(drawMode) {
    if (drawMode === 'random_item') return 'Random prize assigned';
    if (drawMode === 'winner_choice') return 'Winners choose from this tier';
    return 'Drawing specific prizes';
}

function pubRafflePrizeMedia(item) {
    if (item?.image_url) return `<img src="${pubEscapeHtml(item.image_url)}" alt="" loading="lazy">`;
    return `<span>${pubEscapeHtml(item?.emoji || window.EventsRaffleModel?.DEFAULT_EMOJI || '🎁')}</span>`;
}

function pubRafflePrizeItems(config) {
    return pubRaffleCategories(config).flatMap(category => pubRaffleItems(config, category.id));
}

function pubRafflePrizesHtml(event) {
    const config = pubRaffleConfig(event);
    const items = pubRafflePrizeItems(config);
    if (!items.length) return '';

    return `<div class="ed-raffle-prize-rail public-raffle-prize-rail">${items.map(item => `
        <article class="ed-raffle-prize-tile" title="${pubEscapeHtml(item.name)}">
            <div class="ed-raffle-prize-media">${pubRafflePrizeMedia(item)}</div>
            <p>${pubEscapeHtml(item.name)}</p>
        </article>
    `).join('')}</div>`;
}

function pubRafflePillsHtml(event, totalWinners) {
    const pills = [];
    if (event.pricing_mode === 'paid') pills.push('✅ Included with RSVP');
    else if (event.raffle_entry_cost_cents > 0) pills.push(`🎟️ Entry: ${pubFormatCurrency(event.raffle_entry_cost_cents)}`);
    else pills.push('🎟️ Free entry');
    return pills.map(text => `<span class="ed-pill">${pubEscapeHtml(text)}</span>`).join('');
}

async function pubLoadRaffleWinners(eventId) {
    const fullSelect = 'place, guest_token, prize_description, prize_id, category_id, category_label, draw_mode, prize_emoji, selection_status, profiles:user_id(first_name, last_name, profile_picture_url)';
    const full = await supabaseClient
        .from('event_raffle_winners')
        .select(fullSelect)
        .eq('event_id', eventId)
        .order('place', { ascending: true });
    if (!full.error) return full.data || [];

    const message = full.error.message || '';
    if (!/prize_id|category_id|category_label|draw_mode|prize_emoji|selection_status|schema cache|column/i.test(message)) return [];

    const legacy = await supabaseClient
        .from('event_raffle_winners')
        .select('place, guest_token, prize_description, profiles:user_id(first_name, last_name)')
        .eq('event_id', eventId)
        .order('place', { ascending: true });
    return legacy.data || [];
}

function pubRaffleWinnersHtml(winners, guestWinnerNames) {
    if (!winners.length) return '';
    const rows = winners.map(winner => {
        const initials = winner.profiles ? `${winner.profiles.first_name?.[0] || ''}${winner.profiles.last_name?.[0] || ''}`.toUpperCase() : '';
        const avatar = winner.profiles?.profile_picture_url
            ? `<img src="${pubEscapeHtml(winner.profiles.profile_picture_url)}" alt="" loading="lazy">`
            : `<span>${pubEscapeHtml(initials || (winner.guest_token ? 'G' : 'W'))}</span>`;
        const prize = winner.selection_status === 'pending_choice' ? 'Choosing later' : (winner.prize_description || 'Prize pending');
        const emoji = pubEscapeHtml(winner.prize_emoji || '🎁');
        return `<article class="ed-winner-card">
            <div class="ed-winner-avatar">${avatar}<b>${winner.place}</b></div>
            <div class="ed-winner-copy"><span>${emoji}</span><p>${pubEscapeHtml(prize)}</p></div>
        </article>`;
    }).join('');
    return `<div class="ed-winners ed-winners-compact public-raffle-winners"><div class="ed-section-head"><h3>Winners</h3></div><div class="ed-winner-rail">${rows}</div></div>`;
}

/* ── Paid RSVP Handler (Public Page) ─────── */

async function pubHandlePaidRaffle() {
    if (!pubCurrentUser || !pubCurrentEvent) return;

    const confirmPay = confirm(
        `Raffle entry costs ${pubFormatCurrency(pubCurrentEvent.raffle_entry_cost_cents)}.\n\n` +
        'Raffle entry is non-refundable. Proceed to checkout?'
    );
    if (!confirmPay) return;

    try {
        const { url } = await callEdgeFunction('create-event-checkout', {
            event_id: pubCurrentEvent.id,
            type: 'raffle_entry',
        });
        if (url) window.location.href = url;
    } catch (err) {
        console.error('Raffle entry error:', err);
        alert('Failed to start raffle entry checkout. Please try again.');
    }
}

/* ── Free Raffle Handler (Signed-in Member) ── */

async function pubHandleFreeRaffle() {
    if (!pubCurrentUser || !pubCurrentEvent) return;

    try {
        const { error } = await supabaseClient
            .from('event_raffle_entries')
            .insert({ event_id: pubCurrentEvent.id, user_id: pubCurrentUser.id, paid: true });

        if (error) throw error;

        // Refresh raffle section
        pubRenderRaffleSection(pubCurrentEvent);
    } catch (err) {
        console.error('Free raffle entry error:', err);
        alert(err.message || 'Failed to enter raffle. Please try again.');
    }
}

/* ── Guest Paid Raffle Handler ─────────────── */

async function pubHandleGuestPaidRaffle(nameOverride, emailOverride) {
    if (!pubCurrentEvent) return;

    const name  = nameOverride || document.getElementById('guestRaffleName')?.value.trim();
    const email = emailOverride || document.getElementById('guestRaffleEmail')?.value.trim();

    if (!name || !email) { alert('Please enter your name and email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Please enter a valid email.'); return; }

    const confirmPay = confirm(
        `Raffle entry costs ${pubFormatCurrency(pubCurrentEvent.raffle_entry_cost_cents)}.\n\n` +
        'Raffle entry is non-refundable. Proceed to checkout?'
    );
    if (!confirmPay) return;

    try {
        const { url } = await callEdgeFunctionPublic('create-event-checkout', {
            event_id: pubCurrentEvent.id,
            type: 'raffle_entry',
            guest_name: name,
            guest_email: email,
        });
        if (url) window.location.href = url;
    } catch (err) {
        console.error('Guest raffle entry error:', err);
        alert(err.message || 'Failed to start raffle checkout. Please try again.');
    }
}

/* ── Guest Free Raffle Handler ─────────────── */

async function pubHandleGuestFreeRaffle(nameOverride, emailOverride) {
    if (!pubCurrentEvent) return;

    const name  = nameOverride || document.getElementById('guestRaffleName')?.value.trim();
    const email = emailOverride || document.getElementById('guestRaffleEmail')?.value.trim();

    if (!name || !email) { alert('Please enter your name and email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Please enter a valid email.'); return; }

    try {
        const result = await callEdgeFunctionPublic('raffle-guest-free', {
            event_id: pubCurrentEvent.id,
            guest_name: name,
            guest_email: email,
        });

        pubGuestRaffleEntry = true;

        // Show confirmed state
        const form = document.getElementById('guestRaffleForm');
        if (form) {
            form.innerHTML = `
                <div class="evt-info-card">
                    <span class="evt-info-card-icon">🎟️</span>
                    <div>
                        <p class="evt-info-card-title">You're entered!</p>
                        <p class="evt-info-card-sub">${pubEscapeHtml(name)} — Good luck in the draw</p>
                    </div>
                </div>`;
        }
        const panel = document.getElementById('evtCtaPanel');
        if (panel) {
            panel.innerHTML = `
                <button type="button" class="evt-cta-panel-close" onclick="pubCloseCtaPanel()" aria-label="Close">×</button>
                <div class="evt-info-card">
                    <span class="evt-info-card-icon">🎟️</span>
                    <div>
                        <p class="evt-info-card-title">You're entered!</p>
                        <p class="evt-info-card-sub">${pubEscapeHtml(name)} — Good luck in the draw</p>
                    </div>
                </div>`;
        }
        pubInitBottomNav(pubCurrentEvent);
    } catch (err) {
        console.error('Guest free raffle error:', err);
        alert(err.message || 'Failed to enter raffle. Please try again.');
    }
}

/* ── Currency Formatter ──────────────────── */
