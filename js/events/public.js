/* ──────────────────────────────────────────
   Public Event Page  –  /events/?e={slug}
   No auth required — shows public info tier.
   Signed-in members can RSVP & get QR ticket.
   ────────────────────────────────────────── */

const PUB_CATEGORY_EMOJI = {
    party: '🎉', birthday: '🎂', hangout: '🤝', game_night: '🎮',
    cookout: '🍖', trip: '🏔️', retreat: '🏖️', dinner: '🍽️',
    holiday: '🎄', other: '📌'
};

const PUB_TYPE_COLORS = {
    llc:         { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'LLC Event' },
    member:      { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Member Event' },
    competition: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Competition' }
};

let pubCurrentEvent = null;
let pubCurrentUser  = null;
let pubCurrentRsvp  = null;
let pubGuestToken   = null;  // from URL after guest RSVP payment
let pubGuestRsvp    = null;  // loaded from DB for guest lookup

/* ── Bootstrap ───────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const slug   = params.get('e');
    const isCheckin   = params.get('checkin') === '1';
    const ticketToken  = params.get('ticket') || null;
    pubGuestToken     = params.get('guest_token') || null;

    if (!slug) return pubShowNotFound();

    // Check if user is logged in (optional — don't redirect)
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) pubCurrentUser = session.user;
    } catch (_) { /* not logged in */ }

    await pubLoadEvent(slug, isCheckin, ticketToken);
});

/* ── Load Event ──────────────────────────── */
async function pubLoadEvent(slug, isCheckin, ticketToken) {
    const { data: event, error } = await supabaseClient
        .from('events')
        .select('*')
        .eq('slug', slug)
        .not('status', 'eq', 'draft')
        .single();

    if (error || !event) return pubShowNotFound();

    pubCurrentEvent = event;

    // Load RSVP counts (members + guests)
    const { count: memberGoingCount } = await supabaseClient
        .from('event_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('status', 'going');

    const { count: guestGoingCount } = await supabaseClient
        .from('event_guest_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('paid', true);

    const goingCount = (memberGoingCount || 0) + (guestGoingCount || 0);

    // If user is signed in, load their RSVP
    if (pubCurrentUser) {
        const { data: rsvp } = await supabaseClient
            .from('event_rsvps')
            .select('*')
            .eq('event_id', event.id)
            .eq('user_id', pubCurrentUser.id)
            .maybeSingle();
        pubCurrentRsvp = rsvp;
    }

    // If guest token in URL, load guest RSVP
    if (pubGuestToken) {
        const { data: gRsvp } = await supabaseClient
            .from('event_guest_rsvps')
            .select('*')
            .eq('event_id', event.id)
            .eq('guest_token', pubGuestToken)
            .maybeSingle();
        pubGuestRsvp = gRsvp;
    }

    pubRenderEvent(event, goingCount, isCheckin, ticketToken);
}

/* ── Render ──────────────────────────────── */
function pubRenderEvent(event, goingCount, isCheckin, ticketToken) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('eventContent').classList.remove('hidden');

    // Title
    document.title = `${event.title} | Justice McNeal LLC`;
    document.getElementById('eventTitle').textContent = event.title;

    // Banner
    const bannerEl = document.getElementById('eventBanner');
    if (event.banner_url) {
        bannerEl.style.backgroundImage = `url(${event.banner_url})`;
    } else {
        bannerEl.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
    }

    // Tags
    const tagsEl = document.getElementById('eventTags');
    const tc = PUB_TYPE_COLORS[event.event_type] || PUB_TYPE_COLORS.llc;
    tagsEl.innerHTML = `<span class="type-tag ${tc.bg} ${tc.text}">${tc.label}</span>`;
    if (event.category) {
        tagsEl.innerHTML += `<span class="type-tag bg-white/90 text-gray-700">${PUB_CATEGORY_EMOJI[event.category] || '📌'} ${event.category}</span>`;
    }

    // Meta (date, time, location — respect gating)
    const metaEl = document.getElementById('eventMeta');
    const start = new Date(event.start_date);
    const end   = event.end_date ? new Date(event.end_date) : null;
    const isGatedDate = event.gate_time && !pubCurrentRsvp;
    const isGatedLoc  = event.gate_location && !pubCurrentRsvp;

    let metaHtml = '';

    // Date (large, bold, separated from time)
    if (isGatedDate) {
        metaHtml += `<div class="flex items-center gap-2"><svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><span class="text-gray-400 italic">Date & time visible after RSVP</span></div>`;
    } else {
        const dateStr = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const endStr  = end ? ` – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '';
        metaHtml += `
            <div class="flex items-center gap-2.5">
                <svg class="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <span class="text-lg font-bold text-gray-900">${dateStr}</span>
            </div>
            <div class="flex items-center gap-2.5 ml-[30px]">
                <span class="text-base font-semibold text-gray-700">${timeStr}${endStr}</span>
            </div>`;
    }

    // Location (larger text, below date/time)
    if (event.location_text) {
        if (isGatedLoc) {
            metaHtml += `<div class="flex items-center gap-2.5 mt-1"><svg class="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span class="text-gray-400 italic">Location visible after RSVP</span></div>`;
        } else {
            metaHtml += `<div class="flex items-center gap-2.5 mt-1"><svg class="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span class="text-base font-semibold text-gray-700">${pubEscapeHtml(event.location_text)}</span></div>`;
        }
    }

    // Timezone
    if (event.timezone) {
        metaHtml += `<div class="flex items-center gap-2.5"><svg class="w-4 h-4 text-gray-400 ml-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span class="text-gray-500">${event.timezone}</span></div>`;
    }

    metaEl.innerHTML = metaHtml;

    // Map (show if location + lat/lng available and not gated)
    if (event.location_lat && event.location_lng && !isGatedLoc) {
        pubShowMap(event.location_lat, event.location_lng, event.location_text);
    }

    // Description
    document.getElementById('eventDesc').textContent = event.description || '';

    // Gated Notes
    if (event.gated_notes && (pubCurrentRsvp || pubGuestRsvp)) {
        document.getElementById('gatedSection').classList.remove('hidden');
        document.getElementById('gatedNotes').textContent = event.gated_notes;
    }

    // Stats hidden — attendee counts are internal only
    // (goingCount and spotsLeft no longer shown to public)

    // Member-only notice
    if (event.member_only && !pubCurrentUser) {
        document.getElementById('memberOnlyNotice').classList.remove('hidden');
    }

    // RSVP section (member + guest)
    pubRenderRsvpSection(event);

    // Guest RSVP section (for non-members on non-member-only events)
    pubRenderGuestRsvpSection(event);

    // Raffle section
    pubRenderRaffleSection(event);

    // QR Ticket — member
    if (pubCurrentRsvp && pubCurrentRsvp.status === 'going' && event.checkin_mode === 'attendee_ticket') {
        pubShowTicketQR(pubCurrentRsvp.qr_token);
    }

    // QR Ticket — guest (from URL token or lookup)
    if (pubGuestRsvp) {
        pubShowGuestTicket(pubGuestRsvp);
    }

    // Guest lookup section (show for public events when not signed in and no guest ticket showing)
    if (!pubCurrentUser && !pubGuestRsvp && !event.member_only) {
        document.getElementById('guestLookupSection').classList.remove('hidden');
    }

    // Venue Check-In mode
    if (isCheckin && event.checkin_mode === 'venue_scan') {
        pubRenderVenueCheckin(event);
    }

    // Attendee Ticket scanned with phone camera (ticket=TOKEN in URL)
    if (ticketToken && event.checkin_mode === 'attendee_ticket') {
        pubHandleTicketScan(event, ticketToken);
    }

    // Share URL
    document.getElementById('shareUrl').value = window.location.href.split('?')[0] + '?e=' + event.slug;

    // Update sign-in link to redirect back after login
    const loginLinks = document.querySelectorAll('a[href="/auth/login.html"]');
    const returnUrl = encodeURIComponent(window.location.href);
    loginLinks.forEach(link => {
        link.href = `/auth/login.html?redirect=${returnUrl}`;
    });
}

/* ── RSVP Section ────────────────────────── */
function pubRenderRsvpSection(event) {
    const section = document.getElementById('rsvpSection');
    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast   = new Date(event.start_date) < new Date() && event.status !== 'active';
    const deadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();

    if (isClosed || isPast || deadlinePassed) {
        section.innerHTML = `<div class="bg-gray-50 rounded-xl border border-gray-200 p-4 text-center">
            <p class="text-sm text-gray-500 font-medium">${isClosed ? 'This event has ' + event.status : deadlinePassed ? 'RSVP deadline has passed' : 'This event has already started'}</p>
        </div>`;
        return;
    }

    if (!pubCurrentUser) {
        // If guest already has an RSVP (paid or free), show confirmed state
        if (pubGuestRsvp) {
            const isPaidGuest = pubGuestRsvp.paid;
            section.innerHTML = `
                <div class="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span class="text-2xl">✅</span>
                    <div>
                        <p class="text-sm font-bold text-emerald-700">Guest RSVP Confirmed</p>
                        <p class="text-xs text-emerald-600">${pubEscapeHtml(pubGuestRsvp.guest_name)}${isPaidGuest ? ' · Non-refundable' : ''}</p>
                    </div>
                </div>`;
            return;
        }

        // For member-only events, show sign-in prompt
        if (event.member_only) {
            section.innerHTML = `<div class="bg-white rounded-xl border border-gray-200/80 p-5 text-center">
                <p class="text-sm text-gray-600 mb-3">Sign in to RSVP for this members-only event</p>
                <a href="/auth/login.html?redirect=${encodeURIComponent(window.location.href)}" class="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
                    Sign In to RSVP
                </a>
            </div>`;
            return;
        }

        // For public (non-member-only) events — guest RSVP form is shown separately
        // Just show the sign-in option for members
        const costHint = event.pricing_mode === 'paid' && event.rsvp_cost_cents
            ? ` (${pubFormatCurrency(event.rsvp_cost_cents)})`
            : '';
        section.innerHTML = `<div class="bg-white rounded-xl border border-gray-200/80 p-5 text-center">
            <p class="text-sm text-gray-600 mb-3">Have an account?</p>
            <a href="/auth/login.html?redirect=${encodeURIComponent(window.location.href)}" class="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
                Sign In to RSVP${costHint}
            </a>
        </div>`;
        return;
    }

    // ── Paid RSVP ───────────────────────────────────────
    if (event.pricing_mode === 'paid' && event.rsvp_cost_cents > 0) {
        if (pubCurrentRsvp?.paid) {
            section.innerHTML = `
                <div class="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span class="text-2xl">✅</span>
                    <div>
                        <p class="text-sm font-bold text-emerald-700">RSVP Confirmed &amp; Paid</p>
                        <p class="text-xs text-emerald-600">Non-refundable • Contact admin for changes</p>
                    </div>
                </div>`;
        } else {
            section.innerHTML = `
                <div class="text-center">
                    <button onclick="pubHandlePaidRsvp()" class="w-full bg-brand-600 hover:bg-brand-700 text-white px-5 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                        RSVP — ${pubFormatCurrency(event.rsvp_cost_cents)}
                    </button>
                    <p class="text-xs text-gray-400 mt-2">Non-refundable unless cancelled by staff${event.raffle_enabled ? ' • Includes raffle entry' : ''}</p>
                </div>`;
        }
        return;
    }

    // ── Free RSVP (including free_paid_raffle) ──────────
    const goingActive = pubCurrentRsvp?.status === 'going' ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'bg-white hover:bg-emerald-50';
    const maybeActive = pubCurrentRsvp?.status === 'maybe' ? 'ring-2 ring-amber-500 bg-amber-50' : 'bg-white hover:bg-amber-50';
    const cantActive  = pubCurrentRsvp?.status === 'not_going' ? 'ring-2 ring-red-400 bg-red-50' : 'bg-white hover:bg-red-50';

    section.innerHTML = `
        <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Your RSVP</p>
        <div class="grid grid-cols-3 gap-2">
            <button onclick="pubHandleRsvp('going')" class="p-3 rounded-xl border border-gray-200 text-center transition ${goingActive}">
                <span class="text-lg">✅</span>
                <div class="text-xs font-semibold mt-1 text-gray-700">Going</div>
            </button>
            <button onclick="pubHandleRsvp('maybe')" class="p-3 rounded-xl border border-gray-200 text-center transition ${maybeActive}">
                <span class="text-lg">🤔</span>
                <div class="text-xs font-semibold mt-1 text-gray-700">Maybe</div>
            </button>
            <button onclick="pubHandleRsvp('not_going')" class="p-3 rounded-xl border border-gray-200 text-center transition ${cantActive}">
                <span class="text-lg">❌</span>
                <div class="text-xs font-semibold mt-1 text-gray-700">Can't Go</div>
            </button>
        </div>
        ${pubCurrentRsvp ? '<p class="text-xs text-gray-400 text-center mt-2">Click your current response to cancel</p>' : ''}
    `;
}

/* ── Raffle Section (Public Page) ────────── */
async function pubRenderRaffleSection(event) {
    if (!event.raffle_enabled) return;

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
    const prizesHtml = prizes.map((p, i) => `
        <div class="flex items-center gap-2 text-sm">
            <span class="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">${i + 1}</span>
            <span class="text-gray-700">${pubEscapeHtml(p.label || p)}</span>
        </div>`).join('');

    // Check if current user has raffle entry
    let myEntryHtml = '';
    if (pubCurrentUser && event.pricing_mode === 'free_paid_raffle' && event.raffle_entry_cost_cents > 0) {
        const { data: myEntry } = await supabaseClient
            .from('event_raffle_entries')
            .select('id, paid')
            .eq('event_id', event.id)
            .eq('user_id', pubCurrentUser.id)
            .maybeSingle();

        if (myEntry?.paid) {
            myEntryHtml = `<div class="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg mt-3"><span>🎟️</span><span class="text-sm font-semibold text-emerald-700">You're entered!</span></div>`;
        } else {
            myEntryHtml = `
                <button onclick="pubHandlePaidRaffle()" class="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                    🎟️ Buy Raffle Entry — ${pubFormatCurrency(event.raffle_entry_cost_cents)}
                </button>
                <p class="text-xs text-gray-400 text-center mt-1">Non-refundable raffle ticket</p>`;
        }
    } else if (event.pricing_mode === 'paid') {
        myEntryHtml = `<p class="text-xs text-gray-500 italic mt-2">Raffle entry included with paid RSVP</p>`;
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
        <div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <h5 class="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">🏆 Winners</h5>
            ${winners.map(w => {
                const name = w.profiles ? `${w.profiles.first_name || ''} ${w.profiles.last_name || ''}`.trim() : 'Guest';
                return `<div class="flex items-center gap-2 text-sm py-1">
                    <span class="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold">${w.place}</span>
                    <span class="font-semibold text-gray-800">${pubEscapeHtml(name)}</span>
                    ${w.prize_description ? `<span class="text-gray-500">— ${pubEscapeHtml(w.prize_description)}</span>` : ''}
                </div>`;
            }).join('')}
        </div>`;
    }

    el.innerHTML = `
        <div class="mt-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
            <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">🎲</span>
                <h4 class="text-sm font-bold text-gray-800">Raffle</h4>
            </div>
            ${prizesHtml ? `<div class="space-y-1.5 mb-2">${prizesHtml}</div>` : ''}
            ${myEntryHtml}
            ${winnersHtml}
        </div>`;
}

/* ── Paid RSVP Handler (Public Page) ─────── */
async function pubHandlePaidRsvp() {
    if (!pubCurrentUser || !pubCurrentEvent) return;

    const confirmPay = confirm(
        `RSVP costs ${pubFormatCurrency(pubCurrentEvent.rsvp_cost_cents)}.\n\n` +
        'By completing your RSVP, you agree that your payment is non-refundable ' +
        'unless this event is cancelled or rescheduled by LLC staff.\n\n' +
        'Proceed to checkout?'
    );
    if (!confirmPay) return;

    try {
        const { url } = await callEdgeFunction('create-event-checkout', {
            event_id: pubCurrentEvent.id,
            type: 'rsvp',
        });
        if (url) window.location.href = url;
    } catch (err) {
        console.error('Paid RSVP error:', err);
        alert('Failed to start checkout. Please try again.');
    }
}

/* ── Paid Raffle Handler (Public Page) ───── */
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

/* ── Currency Formatter ──────────────────── */
function pubFormatCurrency(cents) {
    return '$' + (cents / 100).toFixed(2);
}

/* ── RSVP Handler ────────────────────────── */
async function pubHandleRsvp(status) {
    if (!pubCurrentUser || !pubCurrentEvent) return;

    try {
        if (pubCurrentRsvp && pubCurrentRsvp.status === status) {
            // Block toggle-off for paid RSVPs
            if (pubCurrentRsvp.paid) {
                alert('Paid RSVPs cannot be cancelled. Contact an admin for assistance.');
                return;
            }
            await supabaseClient.from('event_rsvps').delete().eq('id', pubCurrentRsvp.id);
            pubCurrentRsvp = null;
        } else if (pubCurrentRsvp) {
            if (pubCurrentRsvp.paid) {
                alert('Paid RSVPs cannot be changed. Contact an admin for assistance.');
                return;
            }
            const { data } = await supabaseClient
                .from('event_rsvps')
                .update({ status })
                .eq('id', pubCurrentRsvp.id)
                .select()
                .single();
            pubCurrentRsvp = data;
        } else {
            const { data } = await supabaseClient
                .from('event_rsvps')
                .insert({ event_id: pubCurrentEvent.id, user_id: pubCurrentUser.id, status })
                .select()
                .single();
            pubCurrentRsvp = data;
        }

        await pubLoadEvent(pubCurrentEvent.slug, false);
    } catch (err) {
        console.error('RSVP error:', err);
        alert('Failed to update RSVP. Please try again.');
    }
}

/* ── QR Ticket ───────────────────────────── */
function pubShowTicketQR(qrToken) {
    const ticketSection = document.getElementById('ticketSection');
    ticketSection.classList.remove('hidden');
    const canvas = document.getElementById('ticketQR');
    const ticketUrl = `${window.location.origin}/events/?e=${pubCurrentEvent.slug}&ticket=${qrToken}`;
    QRCode.toCanvas(canvas, ticketUrl, { width: 200, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' } });
}

/* ── Venue Check-In ──────────────────────── */
function pubRenderVenueCheckin(event) {
    const el = document.getElementById('venueCheckin');
    el.classList.remove('hidden');

    // Guest check-in via token
    if (pubGuestRsvp) {
        el.innerHTML = `
            <h3 class="text-sm font-bold text-emerald-700 mb-2">📍 Venue Check-In</h3>
            <p class="text-xs text-emerald-600 mb-3">Tap below to check into this event</p>
            <button onclick="pubDoGuestVenueCheckin('${event.id}','${pubGuestRsvp.guest_token}')" id="guestCheckinBtn" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition">
                ✅ Check In Now
            </button>
            <div id="guestCheckinResult" class="mt-3"></div>`;
        return;
    }

    if (!pubCurrentUser) {
        el.innerHTML = `<p class="text-sm text-emerald-700">Sign in to check in to this event.</p>
            <a href="/auth/login.html?redirect=${encodeURIComponent(window.location.href)}" class="inline-block mt-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Sign In</a>`;
        return;
    }

    el.innerHTML = `
        <h3 class="text-sm font-bold text-emerald-700 mb-2">📍 Venue Check-In</h3>
        <p class="text-xs text-emerald-600 mb-3">Tap below to check into this event</p>
        <button onclick="pubDoVenueCheckin('${event.id}')" id="checkinBtn" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition">
            ✅ Check In Now
        </button>
        <div id="checkinResult" class="mt-3"></div>`;
}

async function pubDoVenueCheckin(eventId) {
    const btn = document.getElementById('checkinBtn');
    const result = document.getElementById('checkinResult');
    btn.disabled = true;
    btn.textContent = 'Checking in...';

    try {
        // Check if event requires location sharing
        const { data: evtData } = await supabaseClient
            .from('events')
            .select('location_required')
            .eq('id', eventId)
            .single();

        if (evtData?.location_required) {
            // Prompt for location before allowing check-in
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
                    });
                });
                // Save location to event_locations
                await supabaseClient.from('event_locations').upsert({
                    event_id: eventId,
                    user_id: pubCurrentUser.id,
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    sharing_active: true,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'event_id,user_id' });
            } catch (locErr) {
                result.innerHTML = '<p class="text-sm text-red-600 font-semibold">📍 Location sharing is required for this event. Please allow location access and try again.</p>';
                btn.disabled = false;
                btn.textContent = '✅ Check In Now';
                return;
            }
        }

        const { data: rsvp } = await supabaseClient
            .from('event_rsvps')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', pubCurrentUser.id)
            .eq('status', 'going')
            .maybeSingle();

        if (!rsvp) {
            result.innerHTML = '<p class="text-sm text-red-600 font-semibold">❌ You must RSVP "Going" before checking in.</p>';
            btn.disabled = false;
            btn.textContent = '✅ Check In Now';
            return;
        }

        const { data: existing } = await supabaseClient
            .from('event_checkins')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', pubCurrentUser.id)
            .maybeSingle();

        if (existing) {
            result.innerHTML = '<p class="text-sm text-amber-600 font-semibold">⚠️ You are already checked in!</p>';
            btn.remove();
            return;
        }

        await supabaseClient.from('event_checkins').insert({
            event_id: eventId,
            user_id: pubCurrentUser.id,
            rsvp_id: rsvp.id,
            checkin_mode: 'venue_scan'
        });

        result.innerHTML = '<p class="text-sm text-emerald-700 font-bold">🎉 Successfully checked in!</p>';
        btn.remove();
    } catch (err) {
        console.error('Check-in error:', err);
        result.innerHTML = '<p class="text-sm text-red-600">Check-in failed. Please try again.</p>';
        btn.disabled = false;
        btn.textContent = '✅ Check In Now';
    }
}

/* ── Guest Venue Check-In ────────────────── */
async function pubDoGuestVenueCheckin(eventId, guestToken) {
    const btn = document.getElementById('guestCheckinBtn');
    const result = document.getElementById('guestCheckinResult');
    btn.disabled = true;
    btn.textContent = 'Checking in...';

    try {
        const { data: existing } = await supabaseClient
            .from('event_checkins')
            .select('id')
            .eq('event_id', eventId)
            .eq('guest_token', guestToken)
            .maybeSingle();

        if (existing) {
            result.innerHTML = '<p class="text-sm text-amber-600 font-semibold">⚠️ You are already checked in!</p>';
            btn.remove();
            return;
        }

        await supabaseClient.from('event_checkins').insert({
            event_id: eventId,
            guest_token: guestToken,
            checkin_mode: 'venue_scan'
        });

        result.innerHTML = '<p class="text-sm text-emerald-700 font-bold">🎉 Successfully checked in!</p>';
        btn.remove();
    } catch (err) {
        console.error('Guest check-in error:', err);
        result.innerHTML = '<p class="text-sm text-red-600">Check-in failed. Please try again.</p>';
        btn.disabled = false;
        btn.textContent = '✅ Check In Now';
    }
}

/* ── Attendee Ticket Scan (phone camera) ─── */
async function pubHandleTicketScan(event, ticketToken) {
    // Someone scanned an attendee ticket QR with their phone camera.
    // Determine who is scanning and act accordingly.

    const container = document.getElementById('venueCheckin');
    container.classList.remove('hidden');

    // Check if the current user is the event creator or a host/admin
    let isHost = false;
    if (pubCurrentUser) {
        if (event.created_by === pubCurrentUser.id) {
            isHost = true;
        } else {
            const { data: hostRec } = await supabaseClient
                .from('event_hosts')
                .select('id')
                .eq('event_id', event.id)
                .eq('user_id', pubCurrentUser.id)
                .maybeSingle();
            if (hostRec) isHost = true;

            // Also check for admin role
            if (!isHost) {
                const { data: prof } = await supabaseClient
                    .from('profiles')
                    .select('role')
                    .eq('id', pubCurrentUser.id)
                    .single();
                if (prof?.role === 'admin') isHost = true;
            }
        }
    }

    if (isHost) {
        // Host/creator scanned an attendee's ticket → process check-in
        container.innerHTML = `
            <h3 class="text-sm font-bold text-brand-700 mb-2">🎟️ Scanning Attendee Ticket…</h3>
            <div id="ticketScanResult" class="mt-3">
                <span class="text-gray-500">Processing check-in…</span>
            </div>`;

        const resultEl = document.getElementById('ticketScanResult');

        try {
            // Try member RSVP first
            const { data: rsvp } = await supabaseClient
                .from('event_rsvps')
                .select('id, user_id, status, profiles!event_rsvps_user_id_fkey(first_name, last_name)')
                .eq('event_id', event.id)
                .eq('qr_token', ticketToken)
                .maybeSingle();

            if (rsvp) {
                const name = `${rsvp.profiles?.first_name || ''} ${rsvp.profiles?.last_name || ''}`.trim() || 'Member';

                // Check if already checked in
                const { data: existing } = await supabaseClient
                    .from('event_checkins')
                    .select('id')
                    .eq('event_id', event.id)
                    .eq('user_id', rsvp.user_id)
                    .maybeSingle();

                if (existing) {
                    resultEl.innerHTML = `<p class="text-sm text-amber-600 font-semibold">✅ Already checked in — ${pubEscapeHtml(name)}</p>`;
                    return;
                }

                await supabaseClient.from('event_checkins').insert({
                    event_id: event.id,
                    user_id: rsvp.user_id,
                    checked_in_by: pubCurrentUser.id,
                    checkin_mode: 'attendee_ticket'
                });

                resultEl.innerHTML = `<p class="text-base text-emerald-700 font-bold">✅ Checked in — ${pubEscapeHtml(name)}</p>`;
                return;
            }

            // Try guest RSVP
            const { data: guestRsvp } = await supabaseClient
                .from('event_guest_rsvps')
                .select('id, guest_name, guest_token, paid')
                .eq('event_id', event.id)
                .eq('guest_token', ticketToken)
                .maybeSingle();

            if (guestRsvp && guestRsvp.paid) {
                const { data: gExisting } = await supabaseClient
                    .from('event_checkins')
                    .select('id')
                    .eq('event_id', event.id)
                    .eq('guest_token', guestRsvp.guest_token)
                    .maybeSingle();

                if (gExisting) {
                    resultEl.innerHTML = `<p class="text-sm text-amber-600 font-semibold">✅ Already checked in — ${pubEscapeHtml(guestRsvp.guest_name)} (Guest)</p>`;
                    return;
                }

                await supabaseClient.from('event_checkins').insert({
                    event_id: event.id,
                    guest_token: guestRsvp.guest_token,
                    checked_in_by: pubCurrentUser.id,
                    checkin_mode: 'attendee_ticket'
                });

                resultEl.innerHTML = `<p class="text-base text-emerald-700 font-bold">✅ Checked in — ${pubEscapeHtml(guestRsvp.guest_name)} (Guest)</p>`;
                return;
            }

            resultEl.innerHTML = '<p class="text-sm text-red-600 font-semibold">❌ Invalid ticket — no matching RSVP found.</p>';
        } catch (err) {
            console.error('Ticket scan check-in error:', err);
            resultEl.innerHTML = `<p class="text-sm text-red-600">Check-in failed: ${err.message}</p>`;
        }
    } else {
        // Attendee scanning their own ticket, or someone else scanning it
        // Show a friendly message to present the ticket to the event host
        container.innerHTML = `
            <div class="text-center py-4">
                <div class="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <span class="text-3xl">🎟️</span>
                </div>
                <h3 class="text-base font-bold text-gray-900 mb-1">Event Ticket</h3>
                <p class="text-sm text-gray-600 mb-4">Show this QR code to the event coordinator to check in.</p>
                <p class="text-xs text-gray-400">The event host uses the in-app scanner to verify your ticket.</p>
                ${!pubCurrentUser ? '<p class="text-xs text-gray-500 mt-3"><a href="/auth/login.html?redirect=' + encodeURIComponent(window.location.href) + '" class="text-brand-600 font-semibold hover:underline">Sign in</a> if you\'re the event host.</p>' : ''}
            </div>`;
    }
}

/* ── Guest RSVP Section Renderer ─────────── */
function pubRenderGuestRsvpSection(event) {
    const section = document.getElementById('guestRsvpSection');
    if (!section) return;

    // Only show for non-signed-in visitors on non-member-only events
    if (pubCurrentUser || event.member_only || pubGuestRsvp) {
        section.classList.add('hidden');
        return;
    }

    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast   = new Date(event.start_date) < new Date() && event.status !== 'active';
    const deadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();
    if (isClosed || isPast || deadlinePassed) return;

    section.classList.remove('hidden');

    // Update button label with price (if paid)
    const btn = document.getElementById('guestRsvpBtn');
    if (btn) {
        const cost = event.rsvp_cost_cents || 0;
        if (event.pricing_mode === 'paid' && cost > 0) {
            btn.textContent = `RSVP as Guest — ${pubFormatCurrency(cost)}`;
        } else {
            btn.textContent = 'RSVP as Guest';
        }
    }

    // Show/hide no-refund checkbox (only for paid events)
    const noRefundCheck = document.getElementById('guestNoRefundCheck');
    if (noRefundCheck) {
        const isPaid = event.pricing_mode === 'paid' && event.rsvp_cost_cents > 0;
        noRefundCheck.closest('label').classList.toggle('hidden', !isPaid);
    }
}

/* ── Guest RSVP Handler ──────────────────── */
async function pubHandleGuestRsvp() {
    if (!pubCurrentEvent) return;

    const name  = document.getElementById('guestNameInput').value.trim();
    const email = document.getElementById('guestEmailInput').value.trim();
    const noRefund = document.getElementById('guestNoRefundCheck');
    const btn   = document.getElementById('guestRsvpBtn');

    if (!name || !email) {
        alert('Please enter your name and email.');
        return;
    }

    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    // Check no-refund policy checkbox (paid events only)
    const isPaid = pubCurrentEvent.pricing_mode === 'paid' && pubCurrentEvent.rsvp_cost_cents > 0;
    if (isPaid && noRefund && !noRefund.closest('label').classList.contains('hidden') && !noRefund.checked) {
        alert('Please accept the no-refund policy to continue.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
        if (isPaid) {
            // Paid event → Stripe checkout
            const { url } = await callEdgeFunctionPublic('create-event-checkout', {
                event_id: pubCurrentEvent.id,
                type: 'rsvp',
                guest_name: name,
                guest_email: email,
            });
            if (url) window.location.href = url;
        } else {
            // Free event → direct RSVP via edge function
            const result = await callEdgeFunctionPublic('rsvp-guest-free', {
                event_id: pubCurrentEvent.id,
                guest_name: name,
                guest_email: email,
            });

            if (result.guest_token) {
                pubGuestToken = result.guest_token;
                pubGuestRsvp = {
                    guest_name: name,
                    guest_email: email,
                    guest_token: result.guest_token,
                    status: result.status,
                    paid: false,
                };

                // Show success + QR ticket
                const section = document.getElementById('guestRsvpSection');
                section.innerHTML = `
                    <div class="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <span class="text-2xl">✅</span>
                        <div>
                            <p class="text-sm font-bold text-emerald-700">You're RSVP'd!</p>
                            <p class="text-xs text-emerald-600">${pubEscapeHtml(name)} · ${pubEscapeHtml(email)}</p>
                        </div>
                    </div>`;

                // Show gated notes if applicable
                if (pubCurrentEvent.gated_notes) {
                    document.getElementById('gatedSection').classList.remove('hidden');
                    document.getElementById('gatedNotes').textContent = pubCurrentEvent.gated_notes;
                }

                // Show QR ticket if attendee_ticket mode
                if (pubCurrentEvent.checkin_mode === 'attendee_ticket') {
                    pubShowGuestTicket(pubGuestRsvp);
                }

                // Hide guest lookup since they just RSVP'd
                const lookupSection = document.getElementById('guestLookupSection');
                if (lookupSection) lookupSection.classList.add('hidden');
            }
        }
    } catch (err) {
        console.error('Guest RSVP error:', err);
        alert(err.message || 'Failed to complete RSVP. Please try again.');
        btn.disabled = false;
        btn.textContent = isPaid
            ? `RSVP as Guest — ${pubFormatCurrency(pubCurrentEvent.rsvp_cost_cents)}`
            : 'RSVP as Guest';
    }
}

/* ── Guest Ticket Display ────────────────── */
function pubShowGuestTicket(guestRsvp) {
    const section = document.getElementById('guestTicketSection');
    if (!section) return;

    section.classList.remove('hidden');
    document.getElementById('guestTicketName').textContent = guestRsvp.guest_name || 'Guest';

    const canvas = document.getElementById('guestTicketQR');
    const guestTicketUrl = `${window.location.origin}/events/?e=${pubCurrentEvent.slug}&ticket=${guestRsvp.guest_token}`;
    QRCode.toCanvas(canvas, guestTicketUrl, {
        width: 200, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' }
    });

    // Hide the guest RSVP form since they already have a ticket
    const formSection = document.getElementById('guestRsvpSection');
    if (formSection) formSection.classList.add('hidden');
}

/* ── Guest Lookup ────────────────────────── */
function pubToggleLookup() {
    const form = document.getElementById('guestLookupForm');
    if (form) form.classList.toggle('hidden');
}

async function pubLookupGuestTicket() {
    if (!pubCurrentEvent) return;

    const email = document.getElementById('lookupEmailInput').value.trim();
    const resultEl = document.getElementById('lookupResult');
    const btn = document.getElementById('lookupBtn');

    if (!email) {
        resultEl.innerHTML = '<p class="text-xs text-red-600">Please enter your email.</p>';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Searching...';

    try {
        const { data: gRsvp } = await supabaseClient
            .from('event_guest_rsvps')
            .select('*')
            .eq('event_id', pubCurrentEvent.id)
            .eq('guest_email', email)
            .maybeSingle();

        if (!gRsvp) {
            resultEl.innerHTML = '<p class="text-xs text-red-600">No RSVP found for this email.</p>';
        } else {
            pubGuestRsvp = gRsvp;
            pubGuestToken = gRsvp.guest_token;
            pubShowGuestTicket(gRsvp);

            // Show gated notes if applicable
            if (pubCurrentEvent.gated_notes) {
                document.getElementById('gatedSection').classList.remove('hidden');
                document.getElementById('gatedNotes').textContent = pubCurrentEvent.gated_notes;
            }

            resultEl.innerHTML = '<p class="text-xs text-emerald-600 font-semibold">✅ Ticket found! Scroll up to see your QR code.</p>';
        }
    } catch (err) {
        console.error('Lookup error:', err);
        resultEl.innerHTML = '<p class="text-xs text-red-600">Lookup failed. Please try again.</p>';
    }

    btn.disabled = false;
    btn.textContent = 'Find';
}

/* ── Utilities ───────────────────────────── */
function pubShowNotFound() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('notFound').classList.remove('hidden');
}

function pubEscapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function pubCopyUrl() {
    const input = document.getElementById('shareUrl');
    navigator.clipboard.writeText(input.value).then(() => {
        const btn = document.getElementById('copyBtn');
        // Swap icon to checkmark briefly
        btn.innerHTML = '<svg class="w-4.5 h-4.5 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
        setTimeout(() => {
            btn.innerHTML = '<svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>';
        }, 2000);
    });
}

/* ── Map ─────────────────────────────────── */
function pubShowMap(lat, lng, label) {
    const wrap = document.getElementById('eventMapWrap');
    if (!wrap || typeof L === 'undefined') return;
    wrap.classList.remove('hidden');

    const map = L.map('eventMap', { zoomControl: false, attributionControl: false, dragging: true, scrollWheelZoom: false }).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.marker([lat, lng]).addTo(map).bindPopup(pubEscapeHtml(label || 'Event Location'));

    // Directions button → opens preferred maps app
    const dirBtn = document.getElementById('eventDirectionsBtn');
    if (dirBtn) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const addr = encodeURIComponent(label || `${lat},${lng}`);
        const mapsUrl = isIOS
            ? `https://maps.apple.com/?daddr=${addr}`
            : `https://www.google.com/maps/dir/?api=1&destination=${addr}`;
        dirBtn.href = mapsUrl;
    }

    // Fix tile rendering after hidden element becomes visible
    setTimeout(() => map.invalidateSize(), 200);
}

// Expose for onclick handlers
window.pubHandleRsvp = pubHandleRsvp;
window.pubHandlePaidRsvp = pubHandlePaidRsvp;
window.pubHandlePaidRaffle = pubHandlePaidRaffle;
window.pubHandleGuestRsvp = pubHandleGuestRsvp;
window.pubDoVenueCheckin = pubDoVenueCheckin;
window.pubDoGuestVenueCheckin = pubDoGuestVenueCheckin;
window.pubToggleLookup = pubToggleLookup;
window.pubLookupGuestTicket = pubLookupGuestTicket;
window.pubCopyUrl = pubCopyUrl;
