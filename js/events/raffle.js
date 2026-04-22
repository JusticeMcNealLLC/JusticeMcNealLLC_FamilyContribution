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

    const prizes = event.raffle_prizes || [];
    const ordinal = n => n===1?'1st':n===2?'2nd':n===3?'3rd':`${n}th`;
    const prizesHtml = prizes.map((p, i) => {
        const place = p.place || i + 1;
        return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#f9f9f4;border-radius:12px;margin-bottom:6px">
            <div class="evt-raffle-rank">${place}</div>
            <div>
                <p style="font-size:13px;color:#717171;font-weight:600;margin:0">${ordinal(place)} Place</p>
                <p style="font-size:15px;color:#222;font-weight:600;margin:2px 0 0">${pubEscapeHtml(p.label || p.description || p)}</p>
            </div>
        </div>`;
    }).join('');

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
    const { data: winners } = await supabaseClient
        .from('event_raffle_winners')
        .select('place, prize_description, profiles:user_id(first_name, last_name)')
        .eq('event_id', event.id)
        .order('place', { ascending: true });

    let winnersHtml = '';
    if (winners && winners.length > 0) {
        winnersHtml = `
        <div style="margin-top:16px">
            <h5 style="font-size:14px;font-weight:700;color:#222;margin-bottom:10px">🏆 Winners</h5>
            ${winners.map(w => {
                const name = w.profiles ? `${w.profiles.first_name || ''} ${w.profiles.last_name || ''}`.trim() : 'Guest';
                return `<div style="display:flex;align-items:center;gap:12px;padding:6px 0">
                    <div class="evt-raffle-rank">${w.place}</div>
                    <span style="font-size:14px;font-weight:600;color:#222">${pubEscapeHtml(name)}</span>
                    ${w.prize_description ? `<span style="font-size:13px;color:#717171">— ${pubEscapeHtml(w.prize_description)}</span>` : ''}
                </div>`;
            }).join('')}
        </div>`;
    }

    el.innerHTML = `
        <div class="evt-section">
            <h4 class="evt-section-title" style="font-size:18px">🎲 Raffle</h4>

            <!-- Details -->
            <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">
                ${event.raffle_type ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;background:#f7f7f7;font-size:13px;font-weight:600;color:#222">${event.raffle_type === 'digital' ? '💻' : '🎁'} ${event.raffle_type === 'digital' ? 'Digital Prize' : 'Physical Prize'}</span>` : ''}
                ${event.raffle_draw_trigger ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;background:#f7f7f7;font-size:13px;font-weight:600;color:#222">${event.raffle_draw_trigger === 'auto' ? '⚡ Auto Draw' : '🎰 Manual Draw'}</span>` : ''}
                ${event.pricing_mode !== 'paid' && event.raffle_entry_cost_cents > 0 ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;background:#f7f7f7;font-size:13px;font-weight:600;color:#222">🎟️ Entry: ${pubFormatCurrency(event.raffle_entry_cost_cents)}</span>` : ''}
                ${event.pricing_mode === 'paid' ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;background:#f7f7f7;font-size:13px;font-weight:600;color:#222">✅ Included with RSVP</span>` : ''}
            </div>

            <!-- Prizes -->
            ${prizes.length > 0 ? `
                <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#717171;margin-bottom:10px">🏆 Prizes</p>
                <div style="margin-bottom:12px">${prizesHtml}</div>
            ` : `
                <p style="font-size:13px;color:#999;font-style:italic;margin-bottom:12px">🏆 Prizes to be announced</p>
            `}

            <!-- Entry status / Locked button -->
            ${myEntryHtml}
            ${lockedBtnHtml}

            <!-- Winners -->
            ${winnersHtml}
        </div>
        <hr class="evt-divider">`;
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
