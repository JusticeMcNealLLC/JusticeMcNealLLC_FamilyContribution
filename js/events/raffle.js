/* ──────────────────────────────────────────
   Public Event — Raffle (member + guest, paid + free)
   ────────────────────────────────────────── */

async function pubRenderRaffleSection(event) {
    if (!event.raffle_enabled) return;

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

    const raffleConfig = pubRaffleConfig(event);
    const categories = pubRaffleCategories(raffleConfig);
    const totalWinners = pubRaffleWinnerCount(raffleConfig, event);
    const prizesHtml = pubRafflePrizesHtml(event);

    // Check if current user has raffle entry
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
            myEntryHtml = `<div class="evt-info-card" style="margin-top:16px"><span class="evt-info-card-icon">🎟️</span><div><p class="evt-info-card-title">You're entered!</p><p class="evt-info-card-sub">Good luck in the draw</p></div></div>`;
        } else if (event.raffle_entry_cost_cents > 0) {
            myEntryHtml = `
                <button onclick="pubHandlePaidRaffle()" class="evt-raffle-buy" style="margin-top:16px">
                    🎟️ Buy Raffle Entry — ${pubFormatCurrency(event.raffle_entry_cost_cents)}
                </button>
                <p style="font-size:13px;color:#b0b0b0;text-align:center;margin-top:8px">Non-refundable raffle ticket</p>`;
        } else {
            // Free raffle — one-click enter
            myEntryHtml = `
                <button onclick="pubHandleFreeRaffle()" class="evt-raffle-buy" style="margin-top:16px">
                    🎟️ Enter Raffle — Free
                </button>`;
        }
    } else {
        // ── Not signed in ──
        if (event.member_only) {
            myEntryHtml = `
                <div style="text-align:center;margin-top:16px">
                    <a href="/auth/login.html?redirect=${encodeURIComponent(window.location.href)}" class="evt-raffle-buy" style="display:inline-flex;text-decoration:none;justify-content:center">
                        🎟️ Sign In to Enter Raffle
                    </a>
                </div>`;
        } else if (event.raffle_entry_cost_cents > 0) {
            // Non-member-only event with paid raffle — show guest raffle entry form
            myEntryHtml = `
                <div style="margin-top:16px" id="guestRaffleForm">
                    <p style="font-size:13px;color:#717171;margin-bottom:10px">Enter your info to join the raffle</p>
                    <div style="display:flex;flex-direction:column;gap:8px">
                        <input type="text" id="guestRaffleName" placeholder="Your name" class="evt-guest-input" style="padding:10px 14px;border:1px solid #ddd;border-radius:10px;font-size:14px">
                        <input type="email" id="guestRaffleEmail" placeholder="Email address" class="evt-guest-input" style="padding:10px 14px;border:1px solid #ddd;border-radius:10px;font-size:14px">
                        <button onclick="pubHandleGuestPaidRaffle()" class="evt-raffle-buy">
                            🎟️ Buy Raffle Entry — ${pubFormatCurrency(event.raffle_entry_cost_cents)}
                        </button>
                        <p style="font-size:12px;color:#b0b0b0;text-align:center">Non-refundable raffle ticket</p>
                    </div>
                    <p style="font-size:13px;color:#717171;margin-top:12px;text-align:center">
                        <a href="/auth/login.html?redirect=${encodeURIComponent(window.location.href)}" style="color:#222;font-weight:600">Sign in</a> if you have an account
                    </p>
                </div>`;
        } else {
            // Free raffle — guest can enter with name+email
            myEntryHtml = `
                <div style="margin-top:16px" id="guestRaffleForm">
                    <p style="font-size:13px;color:#717171;margin-bottom:10px">Enter your info to join the raffle</p>
                    <div style="display:flex;flex-direction:column;gap:8px">
                        <input type="text" id="guestRaffleName" placeholder="Your name" class="evt-guest-input" style="padding:10px 14px;border:1px solid #ddd;border-radius:10px;font-size:14px">
                        <input type="email" id="guestRaffleEmail" placeholder="Email address" class="evt-guest-input" style="padding:10px 14px;border:1px solid #ddd;border-radius:10px;font-size:14px">
                        <button onclick="pubHandleGuestFreeRaffle()" class="evt-raffle-buy">
                            🎟️ Enter Raffle — Free
                        </button>
                    </div>
                    <p style="font-size:13px;color:#717171;margin-top:12px;text-align:center">
                        <a href="/auth/login.html?redirect=${encodeURIComponent(window.location.href)}" style="color:#222;font-weight:600">Sign in</a> if you have an account
                    </p>
                </div>`;
        }
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

        ${hasPrizes ? `
            <div class="public-raffle-block">
                <div class="ed-section-head"><h3>Prizes</h3></div>
                ${prizesHtml}
            </div>
        ` : `
            <p class="public-raffle-empty">Prizes to be announced</p>
        `}

        ${myEntryHtml}
        ${lockedBtnHtml}
        ${winnersHtml}
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

function pubRafflePrizesHtml(event) {
    const config = pubRaffleConfig(event);
    const categories = pubRaffleCategories(config);
    if (!categories.length) return '';

    return `<div class="ed-raffle-categories public-raffle-categories">${categories.map(category => {
        const items = pubRaffleItems(config, category.id);
        const itemsHtml = items.length ? items.map(item => `
            <div class="ed-raffle-item">
                <div class="ed-raffle-item-media">${pubRafflePrizeMedia(item)}</div>
                <div class="ed-raffle-item-copy">
                    <span class="ed-raffle-item-name">${pubEscapeHtml(item.name)}</span>
                    <span class="ed-raffle-item-meta">${item.quantity > 1 ? `${item.quantity} available` : '1 available'}</span>
                </div>
            </div>
        `).join('') : `<p class="public-raffle-empty">Prizes to be announced</p>`;
        const winnerCount = category.winner_count || 0;
        return `
            <section class="ed-raffle-category">
                <div class="ed-raffle-category-head">
                    <div>
                        <h4>${pubEscapeHtml(category.label || 'Prize tier')}</h4>
                        <p>${pubRaffleDrawModeLabel(category.draw_mode)}</p>
                    </div>
                    <span>${winnerCount} ${winnerCount === 1 ? 'winner' : 'winners'}</span>
                </div>
                <div class="ed-raffle-items">${itemsHtml}</div>
            </section>
        `;
    }).join('')}</div>`;
}

function pubRafflePillsHtml(event, totalWinners) {
    const pills = [];
    if (event.raffle_type) pills.push(`${event.raffle_type === 'digital' ? '💻' : '🎁'} ${event.raffle_type === 'digital' ? 'Digital prize' : 'Physical prize'}`);
    if (event.raffle_draw_trigger) pills.push(`${event.raffle_draw_trigger === 'auto' ? '⚡ Auto draw' : '🎰 Manual draw'}`);
    if (totalWinners) pills.push(`${totalWinners} ${totalWinners === 1 ? 'winner' : 'winners'}`);
    if (event.pricing_mode === 'paid') pills.push('✅ Included with RSVP');
    else if (event.raffle_entry_cost_cents > 0) pills.push(`🎟️ Entry: ${pubFormatCurrency(event.raffle_entry_cost_cents)}`);
    else pills.push('🎟️ Free entry');
    return pills.map(text => `<span class="ed-pill">${pubEscapeHtml(text)}</span>`).join('');
}

async function pubLoadRaffleWinners(eventId) {
    const fullSelect = 'place, guest_token, prize_description, prize_id, category_id, category_label, draw_mode, prize_emoji, selection_status, profiles:user_id(first_name, last_name)';
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
    const groups = winners.reduce((acc, winner) => {
        const key = winner.category_label || 'Winners';
        (acc[key] = acc[key] || []).push(winner);
        return acc;
    }, {});
    const groupHtml = Object.entries(groups).map(([label, rows]) => `
        <div class="ed-raffle-winner-group">
            <p class="ed-raffle-winner-group-title">${pubEscapeHtml(label)}</p>
            ${rows.map(winner => {
                const profileName = winner.profiles ? `${winner.profiles.first_name || ''} ${winner.profiles.last_name || ''}`.trim() : '';
                const name = profileName || guestWinnerNames.get(winner.guest_token) || (winner.guest_token ? 'Guest' : 'Winner');
                const prize = winner.selection_status === 'pending_choice' ? 'Choosing later' : (winner.prize_description || 'Prize pending');
                return `<div class="ed-winner-row"><div class="ed-prize-rank">${winner.place}</div><span class="ed-winner-name">${pubEscapeHtml(name)}</span><span class="ed-winner-prize">— ${pubEscapeHtml(prize)}</span></div>`;
            }).join('')}
        </div>
    `).join('');
    return `<div class="ed-winners public-raffle-winners"><div class="ed-section-head"><h3>Winners</h3></div>${groupHtml}</div>`;
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

async function pubHandleGuestPaidRaffle() {
    if (!pubCurrentEvent) return;

    const name  = document.getElementById('guestRaffleName')?.value.trim();
    const email = document.getElementById('guestRaffleEmail')?.value.trim();

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

async function pubHandleGuestFreeRaffle() {
    if (!pubCurrentEvent) return;

    const name  = document.getElementById('guestRaffleName')?.value.trim();
    const email = document.getElementById('guestRaffleEmail')?.value.trim();

    if (!name || !email) { alert('Please enter your name and email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Please enter a valid email.'); return; }

    try {
        const result = await callEdgeFunctionPublic('raffle-guest-free', {
            event_id: pubCurrentEvent.id,
            guest_name: name,
            guest_email: email,
        });

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
    } catch (err) {
        console.error('Guest free raffle error:', err);
        alert(err.message || 'Failed to enter raffle. Please try again.');
    }
}

/* ── Currency Formatter ──────────────────── */
