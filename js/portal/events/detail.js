// ═══════════════════════════════════════════════════════════
// Portal Events — Detail Modal
// Opens the full event detail view with attendee list,
// QR codes, host controls, cost breakdown, waitlist, etc.
// ═══════════════════════════════════════════════════════════

async function evtOpenDetail(eventId) {
    const event = evtAllEvents.find(e => e.id === eventId);
    if (!event) return;

    const rsvp = evtAllRsvps[eventId];
    const start = new Date(event.start_date);
    const dateStr = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
    const tc = TYPE_COLORS[event.event_type] || TYPE_COLORS.member;
    const isLlc = event.event_type === 'llc';
    const isComp = event.event_type === 'competition';

    // Load RSVPs with profile info
    const { data: rsvps } = await supabaseClient
        .from('event_rsvps')
        .select('user_id, status, profiles!event_rsvps_user_id_fkey(first_name, last_name, profile_picture_url)')
        .eq('event_id', eventId);

    const goingList = (rsvps || []).filter(r => r.status === 'going');
    const maybeList = (rsvps || []).filter(r => r.status === 'maybe');
    const notGoingList = (rsvps || []).filter(r => r.status === 'not_going');

    // Load check-ins with profile info (for host attendee breakdown)
    const { data: checkins, count: checkinCount } = await supabaseClient
        .from('event_checkins')
        .select('user_id, profiles!event_checkins_user_id_fkey(first_name, last_name, profile_picture_url)', { count: 'exact' })
        .eq('event_id', eventId);

    // Load cost items for LLC events
    let costItems = [];
    if (isLlc) {
        const { data: ci } = await supabaseClient
            .from('event_cost_items')
            .select('*')
            .eq('event_id', eventId)
            .order('sort_order', { ascending: true });
        costItems = ci || [];
    }

    // Load waitlist for LLC events
    let waitlist = [];
    let myWaitlistEntry = null;
    if (isLlc) {
        const { data: wl } = await supabaseClient
            .from('event_waitlist')
            .select('*, profiles:user_id(first_name, last_name)')
            .eq('event_id', eventId)
            .order('position', { ascending: true });
        waitlist = wl || [];
        myWaitlistEntry = waitlist.find(w => w.user_id === evtCurrentUser.id);
    }

    // Load raffle entries + winners (if raffle enabled)
    let raffleEntryCount = 0;
    let myRaffleEntry = null;
    let raffleWinners = [];
    if (event.raffle_enabled) {
        const { count: rCount } = await supabaseClient
            .from('event_raffle_entries')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', eventId);
        raffleEntryCount = rCount || 0;

        const { data: myEntry } = await supabaseClient
            .from('event_raffle_entries')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', evtCurrentUser.id)
            .maybeSingle();
        myRaffleEntry = myEntry;

        const { data: winners } = await supabaseClient
            .from('event_raffle_winners')
            .select('*, profiles:user_id(first_name, last_name)')
            .eq('event_id', eventId)
            .order('place', { ascending: true });
        raffleWinners = winners || [];
    }

    // Check if user is host/creator
    const isCreator = event.created_by === evtCurrentUser.id;
    const { data: hostRecord } = await supabaseClient
        .from('event_hosts')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', evtCurrentUser.id)
        .maybeSingle();
    const isHost = isCreator || !!hostRecord || evtCurrentUserRole === 'admin';

    // Should show gated info?
    const hasRsvp = rsvp && (rsvp.status === 'going' || rsvp.status === 'maybe');

    // Load documents HTML (async — for LLC events)
    const documentsHtml = await evtBuildDocumentsHtml(event, isHost, hasRsvp);

    // Build live map HTML (LLC events during event window)
    const mapHtml = evtBuildMapHtml(event, hasRsvp, isHost);

    // Build competition HTML (competition events)
    const competitionHtml = isComp ? await evtBuildCompetitionHtml(event, isHost) : '';

    // Build scrapbook HTML (completed events — photo gallery)
    const scrapbookHtml = await evtBuildScrapbookHtml(event, !!hasRsvp);

    // Transportation mode display (LLC)
    let transportHtml = '';
    if (isLlc && event.transportation_mode) {
        const isProvided = event.transportation_mode === 'llc_provides';
        transportHtml = `
            <div class="mt-4 flex items-center gap-2 p-3 ${isProvided ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} border rounded-xl">
                <span class="text-base">${isProvided ? '✈️' : '🧳'}</span>
                <div>
                    <p class="text-sm font-semibold ${isProvided ? 'text-emerald-700' : 'text-amber-700'}">${isProvided ? 'LLC Provides Transportation' : 'Self-Arranged Transportation'}</p>
                    <p class="text-xs ${isProvided ? 'text-emerald-600' : 'text-amber-600'}">${isProvided ? 'Tickets will be uploaded to your documents' : `Members book their own travel${event.transportation_estimate_cents ? ` — est. ~${formatCurrency(event.transportation_estimate_cents)}` : ''}`}</p>
                </div>
            </div>`;
    }

    // Location-required badge
    let locationReqHtml = '';
    if (isLlc && event.location_required) {
        locationReqHtml = `
            <div class="mt-3 flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                <span class="text-base">📍</span>
                <p class="text-xs text-blue-700"><strong>Location sharing required</strong> — you'll need to enable location sharing at check-in.</p>
            </div>`;
    }

    // Banner
    const bannerBg = event.banner_url
        ? `background-image:url('${event.banner_url}');background-size:cover;background-position:center;`
        : `background:linear-gradient(135deg,#6366f1,#8b5cf6);`;

    // Gated info visibility
    const showTime = !event.gate_time || hasRsvp || isHost;
    const showLocation = !event.gate_location || hasRsvp || isHost;
    const showNotes = !event.gate_notes || hasRsvp || isHost;

    // QR Code for attendee ticket mode
    let qrHtml = '';
    if (rsvp && rsvp.status === 'going' && event.checkin_mode === 'attendee_ticket') {
        qrHtml = `
            <div class="mt-6 text-center">
                <h4 class="text-sm font-bold text-gray-700 mb-2">Your Event Ticket</h4>
                <canvas id="myTicketQR" class="mx-auto"></canvas>
                <p class="text-xs text-gray-400 mt-2">Show this QR code at check-in</p>
            </div>`;
    }

    // Venue QR (if host and venue_scan mode)
    let venueQrHtml = '';
    if (isHost && event.checkin_mode === 'venue_scan' && event.venue_qr_token) {
        venueQrHtml = `
            <div class="mt-6 p-4 bg-amber-50 rounded-xl text-center">
                <h4 class="text-sm font-bold text-amber-700 mb-2">Venue QR Code</h4>
                <canvas id="venueQR" class="mx-auto"></canvas>
                <p class="text-xs text-amber-600 mt-2">Display this at the entrance for attendees to scan</p>
            </div>`;
    }

    // Scanner button (for hosts in attendee_ticket mode)
    let scannerBtn = '';
    if (isHost && event.checkin_mode === 'attendee_ticket' && ['open', 'confirmed', 'active'].includes(event.status)) {
        scannerBtn = `
            <button onclick="evtOpenScanner('${eventId}')" class="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition mt-3">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                Scan Attendee QR
            </button>`;
    }

    // ── Cost Breakdown Display (LLC only) ────────────────
    let costBreakdownHtml = '';
    if (isLlc && costItems.length > 0) {
        const CATEGORY_ICONS = { lodging: '🏠', transportation: '🚗', food: '🍕', gear: '🎿', entertainment: '🎭', other: '📦' };
        const included = costItems.filter(i => i.included_in_buyin);
        const oop = costItems.filter(i => !i.included_in_buyin);
        const totalIncluded = included.reduce((s, i) => s + (i.total_cost_cents || 0), 0);
        const totalOop = oop.reduce((s, i) => s + (i.avg_per_person_cents || 0), 0);
        const maxP = event.max_participants || 0;
        const baseBuyIn = maxP > 0 ? Math.ceil(totalIncluded / maxP) : 0;
        const llcCut = Math.round(baseBuyIn * (event.llc_cut_pct || 0) / 100);
        const finalBuyIn = baseBuyIn + llcCut;
        const lockedLabel = event.cost_breakdown_locked ? ' <span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">🔒 Locked</span>' : '';

        const itemRows = costItems.map(i => `
            <div class="flex items-center justify-between py-1.5 text-sm">
                <div class="flex items-center gap-2">
                    <span>${CATEGORY_ICONS[i.category] || '📦'}</span>
                    <span class="text-gray-700">${evtEscapeHtml(i.name)}</span>
                </div>
                <div class="text-right">
                    ${i.included_in_buyin
                        ? `<span class="font-semibold text-gray-900">${formatCurrency(i.total_cost_cents)}</span><span class="text-xs text-emerald-600 ml-2">INCLUDED</span>`
                        : `<span class="text-gray-500">~${formatCurrency(i.avg_per_person_cents)}/person</span><span class="text-xs text-amber-600 ml-2">OUT OF POCKET</span>`}
                </div>
            </div>`).join('');

        costBreakdownHtml = `
            <div class="mt-6 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="text-sm font-bold text-gray-800">📊 Cost Breakdown${lockedLabel}</h4>
                </div>
                <div class="divide-y divide-amber-100">${itemRows}</div>
                <div class="border-t border-amber-300 mt-3 pt-3 space-y-1.5">
                    <div class="flex justify-between text-sm"><span class="text-gray-600">Total Included:</span><span class="font-bold">${formatCurrency(totalIncluded)}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-gray-600">Max Participants:</span><span class="font-bold">${maxP}</span></div>
                    <div class="border-t border-amber-200 my-1.5"></div>
                    <div class="flex justify-between text-sm"><span class="text-gray-700 font-semibold">💳 RSVP Buy-In:</span><span class="font-extrabold text-brand-700">${formatCurrency(finalBuyIn)}/person</span></div>
                    ${event.llc_cut_pct > 0 ? `<div class="flex justify-between text-xs text-gray-500"><span>Includes ${event.llc_cut_pct}% LLC contribution</span><span>+${formatCurrency(llcCut)}</span></div>` : ''}
                    <div class="flex justify-between text-sm"><span class="text-gray-600">✈ Est. Out-of-Pocket:</span><span class="font-bold">~${formatCurrency(totalOop)}/person</span></div>
                    <div class="border-t border-amber-200 my-1.5"></div>
                    <div class="flex justify-between text-sm"><span class="font-semibold text-gray-700">💰 Est. Total/Person:</span><span class="font-extrabold">~${formatCurrency(finalBuyIn + totalOop)}</span></div>
                </div>
            </div>`;
    }

    // ── Minimum Threshold Progress (LLC only) ────────────
    let thresholdHtml = '';
    if (isLlc && event.min_participants) {
        const currentGoing = goingList.length;
        const minNeeded = event.min_participants;
        const pct = Math.min(100, Math.round((currentGoing / minNeeded) * 100));
        const isMet = currentGoing >= minNeeded;
        const barColor = isMet ? 'bg-emerald-500' : 'bg-amber-500';
        const deadlineStr = event.rsvp_deadline ? new Date(event.rsvp_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';

        thresholdHtml = `
            <div class="mt-4 p-4 ${isMet ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} border rounded-xl">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-semibold ${isMet ? 'text-emerald-700' : 'text-amber-700'}">${isMet ? '✅ Minimum Met!' : '⚠️ Minimum Threshold'}</span>
                    <span class="text-xs text-gray-500">${currentGoing} / ${minNeeded} needed by ${deadlineStr}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div class="${barColor} h-2.5 rounded-full transition-all" style="width:${pct}%"></div>
                </div>
                ${!isMet ? `<p class="text-xs text-amber-600 mt-1.5">If ${minNeeded - currentGoing} more spot${minNeeded - currentGoing > 1 ? 's aren\'t' : ' isn\'t'} filled by the deadline, the event auto-cancels and all RSVPs are refunded.</p>` : ''}
            </div>`;
    }

    // ── Waitlist Section (LLC only — when full) ──────────
    let waitlistHtml = '';
    if (isLlc && event.max_participants) {
        const isFull = goingList.length >= event.max_participants;
        const canRsvp = ['open', 'confirmed', 'active'].includes(event.status);
        const activeWaitlist = waitlist.filter(w => ['waiting', 'offered'].includes(w.status));

        if (isFull && canRsvp) {
            // Check if user has an active offer
            const hasOffer = myWaitlistEntry?.status === 'offered' && myWaitlistEntry.offer_expires_at && new Date(myWaitlistEntry.offer_expires_at) > new Date();
            const isWaiting = myWaitlistEntry?.status === 'waiting';

            let waitlistAction = '';
            if (hasOffer) {
                const expiresStr = new Date(myWaitlistEntry.offer_expires_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                waitlistAction = `
                    <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <p class="text-sm font-bold text-emerald-700">🎉 A spot opened up for you!</p>
                        <p class="text-xs text-emerald-600 mt-1">Complete your RSVP by ${expiresStr} to claim it.</p>
                        <button onclick="evtClaimWaitlistSpot('${eventId}')" class="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition">Claim Spot — ${formatCurrency(event.rsvp_cost_cents)}</button>
                    </div>`;
            } else if (isWaiting) {
                const pos = activeWaitlist.findIndex(w => w.user_id === evtCurrentUser.id) + 1;
                waitlistAction = `
                    <div class="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <div>
                            <p class="text-sm font-semibold text-blue-700">You're #${pos} on the waitlist</p>
                            <p class="text-xs text-blue-500">We'll notify you if a spot opens.</p>
                        </div>
                        <button onclick="evtLeaveWaitlist('${eventId}')" class="text-xs text-red-500 hover:text-red-700 font-medium">Leave</button>
                    </div>`;
            } else if (!rsvp?.paid) {
                waitlistAction = `
                    <button onclick="evtJoinWaitlist('${eventId}')" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                        Join Waitlist
                    </button>
                    <p class="text-xs text-gray-400 text-center mt-1">No payment required to join the waitlist</p>`;
            }

            waitlistHtml = `
                <div class="mt-4 p-4 bg-blue-50/50 border border-blue-200 rounded-xl">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-lg">⏳</span>
                        <h4 class="text-sm font-bold text-gray-800">Event Full — Waitlist</h4>
                        <span class="ml-auto text-xs text-gray-500">${activeWaitlist.length} waiting</span>
                    </div>
                    ${waitlistAction}
                </div>`;
        }
    }

    // ── Reschedule Grace Window Notice ───────────────────
    let graceHtml = '';
    if (event.rescheduled_at && event.grace_window_end && new Date(event.grace_window_end) > new Date()) {
        const graceEnd = new Date(event.grace_window_end).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        graceHtml = `
            <div class="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <p class="text-sm font-semibold text-orange-700">📅 This event was rescheduled</p>
                <p class="text-xs text-orange-600 mt-1">If the new date doesn't work for you, you can request a full refund until <strong>${graceEnd}</strong>.</p>
                ${rsvp?.paid ? `<button onclick="evtRequestGraceRefund('${eventId}')" class="mt-2 text-sm text-red-600 hover:text-red-700 font-semibold underline">Request Full Refund</button>` : ''}
            </div>`;
    }

    // RSVP buttons
    let rsvpButtons = '';
    const canRsvp = ['open', 'confirmed', 'active'].includes(event.status);
    const eventIsFull = isLlc && event.max_participants && goingList.length >= event.max_participants;

    // Hosts/creators don't need RSVP buttons — they're automatically attending
    if (isHost) {
        rsvpButtons = `
            <div class="mt-6">
                <div class="flex items-center gap-3 p-3 bg-brand-50 border border-brand-200 rounded-xl">
                    <span class="text-2xl">🎯</span>
                    <div>
                        <p class="text-sm font-bold text-brand-700">You're Hosting This Event</p>
                        <p class="text-xs text-brand-500">You're automatically counted as attending</p>
                    </div>
                </div>
            </div>`;

    } else if (canRsvp && !eventIsFull && event.pricing_mode === 'free') {
        // ── Free RSVP: 3-button grid ──
        const goingActive = rsvp?.status === 'going' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50';
        const maybeActive = rsvp?.status === 'maybe' ? 'bg-amber-500 text-white' : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50';
        const notActive = rsvp?.status === 'not_going' ? 'bg-gray-500 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50';
        rsvpButtons = `
            <div class="mt-6">
                <h4 class="text-sm font-bold text-gray-700 mb-2">RSVP</h4>
                <div class="grid grid-cols-3 gap-2">
                    <button onclick="evtHandleRsvp('${eventId}','going')" class="px-3 py-2 rounded-xl text-sm font-semibold transition ${goingActive}">Going</button>
                    <button onclick="evtHandleRsvp('${eventId}','maybe')" class="px-3 py-2 rounded-xl text-sm font-semibold transition ${maybeActive}">Maybe</button>
                    <button onclick="evtHandleRsvp('${eventId}','not_going')" class="px-3 py-2 rounded-xl text-sm font-semibold transition ${notActive}">Can't Go</button>
                </div>
            </div>`;

    } else if (canRsvp && !eventIsFull && (event.pricing_mode === 'paid' || event.pricing_mode === 'free_paid_raffle')) {
        // ── Paid RSVP or Free-event-with-paid-raffle ──
        const isPaid = event.pricing_mode === 'paid';
        const costCents = isPaid ? event.rsvp_cost_cents : 0;

        if (rsvp?.paid) {
            // Already paid — show confirmed badge
            rsvpButtons = `
            <div class="mt-6">
                <h4 class="text-sm font-bold text-gray-700 mb-2">RSVP</h4>
                <div class="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span class="text-2xl">✅</span>
                    <div>
                        <p class="text-sm font-bold text-emerald-700">RSVP Confirmed &amp; Paid</p>
                        <p class="text-xs text-emerald-600">Non-refundable • Contact admin for changes</p>
                    </div>
                </div>
            </div>`;
        } else if (isPaid) {
            // Paid event — single checkout button
            rsvpButtons = `
            <div class="mt-6">
                <h4 class="text-sm font-bold text-gray-700 mb-2">RSVP</h4>
                <button onclick="evtHandleRsvp('${eventId}','going')" class="w-full bg-brand-600 hover:bg-brand-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                    RSVP — ${formatCurrency(costCents)}
                </button>
                <p class="text-xs text-gray-400 text-center mt-1">Non-refundable unless cancelled by staff${event.raffle_enabled ? ' • Includes raffle entry' : ''}</p>
            </div>`;
        } else {
            // free_paid_raffle — free RSVP buttons (raffle is separate payment below)
            const goingActive = rsvp?.status === 'going' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50';
            const maybeActive = rsvp?.status === 'maybe' ? 'bg-amber-500 text-white' : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50';
            const notActive = rsvp?.status === 'not_going' ? 'bg-gray-500 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50';
            rsvpButtons = `
            <div class="mt-6">
                <h4 class="text-sm font-bold text-gray-700 mb-2">RSVP (Free)</h4>
                <div class="grid grid-cols-3 gap-2">
                    <button onclick="evtHandleRsvp('${eventId}','going')" class="px-3 py-2 rounded-xl text-sm font-semibold transition ${goingActive}">Going</button>
                    <button onclick="evtHandleRsvp('${eventId}','maybe')" class="px-3 py-2 rounded-xl text-sm font-semibold transition ${maybeActive}">Maybe</button>
                    <button onclick="evtHandleRsvp('${eventId}','not_going')" class="px-3 py-2 rounded-xl text-sm font-semibold transition ${notActive}">Can't Go</button>
                </div>
            </div>`;
        }
    }

    // ── Raffle Section ──────────────────────────────────
    let raffleHtml = '';
    if (event.raffle_enabled) {
        const prizes = event.raffle_prizes || [];
        const prizesHtml = prizes.map((p, i) => `
            <div class="flex items-center gap-2 text-sm">
                <span class="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">${i + 1}</span>
                <span class="text-gray-700">${evtEscapeHtml(p.label || p.description || p)}</span>
            </div>`).join('');

        // Raffle entry status
        let entryStatusHtml = '';
        if (myRaffleEntry) {
            entryStatusHtml = `<div class="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg"><span>🎟️</span><span class="text-sm font-semibold text-emerald-700">You're entered!</span></div>`;
        } else if (event.pricing_mode === 'free_paid_raffle' && event.raffle_entry_cost_cents > 0 && canRsvp) {
            entryStatusHtml = `
                <button onclick="evtHandleRaffleEntry('${eventId}')" class="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                    🎟️ Buy Raffle Entry — ${formatCurrency(event.raffle_entry_cost_cents)}
                </button>
                <p class="text-xs text-gray-400 text-center mt-1">Non-refundable raffle ticket</p>`;
        } else if (event.pricing_mode === 'paid' && !rsvp?.paid && canRsvp) {
            entryStatusHtml = `<p class="text-xs text-gray-500 italic">Raffle entry included with paid RSVP</p>`;
        }

        // Winners display
        let winnersHtml = '';
        if (raffleWinners.length > 0) {
            winnersHtml = `
            <div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <h5 class="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">🏆 Winners</h5>
                ${raffleWinners.map(w => {
                    const name = w.profiles ? `${w.profiles.first_name || ''} ${w.profiles.last_name || ''}`.trim() : (w.guest_token ? 'Guest' : 'Unknown');
                    return `<div class="flex items-center gap-2 text-sm py-1">
                        <span class="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold">${w.place}</span>
                        <span class="font-semibold text-gray-800">${evtEscapeHtml(name)}</span>
                        ${w.prize_description ? `<span class="text-gray-500">— ${evtEscapeHtml(w.prize_description)}</span>` : ''}
                    </div>`;
                }).join('')}
            </div>`;
        }

        // Host draw button
        let drawBtnHtml = '';
        if (isHost && canRsvp && raffleWinners.length === 0) {
            drawBtnHtml = `
                <button onclick="evtOpenRaffleDraw('${eventId}')" class="mt-2 w-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                    🎰 Draw Raffle Winners
                </button>`;
        }

        raffleHtml = `
            <div class="mt-6 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                <div class="flex items-center gap-2 mb-3">
                    <span class="text-lg">🎲</span>
                    <h4 class="text-sm font-bold text-gray-800">Raffle</h4>
                    <span class="ml-auto text-xs text-gray-500">${raffleEntryCount} entries</span>
                </div>
                ${prizesHtml ? `<div class="space-y-1.5 mb-3">${prizesHtml}</div>` : ''}
                ${entryStatusHtml}
                ${winnersHtml}
                ${drawBtnHtml}
            </div>`;
    }

    // Shareable link
    const publicUrl = `${window.location.origin}/events/?e=${event.slug}`;

    // Helper: build avatar + name row for a person
    function buildPersonRow(p) {
        const initials = ((p?.first_name?.[0] || '') + (p?.last_name?.[0] || '')).toUpperCase() || '?';
        const avatar = p?.profile_picture_url
            ? `<img src="${p.profile_picture_url}" class="w-7 h-7 rounded-full object-cover" alt="">`
            : `<div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">${initials}</div>`;
        return `<div class="flex items-center gap-2">${avatar}<span class="text-sm text-gray-700">${evtEscapeHtml(p?.first_name || '')} ${evtEscapeHtml(p?.last_name || '')}</span></div>`;
    }

    // Build categorized attendee breakdown (host-only)
    let attendeeBreakdownHtml = '';
    if (isHost) {
        const checkinUserIds = new Set((checkins || []).map(c => c.user_id));

        function buildSection(emoji, label, list, color) {
            if (!list.length) return `<p class="text-xs text-gray-400 italic ml-6">None</p>`;
            return list.map(r => buildPersonRow(r.profiles)).join('');
        }

        // Checked-in list from checkins data
        const checkinRows = (checkins || []).map(c => buildPersonRow(c.profiles)).join('') || `<p class="text-xs text-gray-400 italic ml-6">None</p>`;

        attendeeBreakdownHtml = `
            <div class="mt-6 p-4 bg-surface-50 rounded-xl border border-gray-100">
                <h4 class="text-sm font-bold text-gray-700 mb-4">📋 Attendee Breakdown</h4>

                <!-- Going -->
                <div class="mb-3">
                    <div class="flex items-center gap-2 mb-1.5">
                        <span class="text-sm">✅</span>
                        <span class="text-xs font-bold text-emerald-700 uppercase tracking-wide">Going (${goingList.length})</span>
                    </div>
                    <div class="space-y-1.5 ml-6">${goingList.length ? goingList.map(r => buildPersonRow(r.profiles)).join('') : '<p class="text-xs text-gray-400 italic">None</p>'}</div>
                </div>

                <!-- Maybe -->
                <div class="mb-3">
                    <div class="flex items-center gap-2 mb-1.5">
                        <span class="text-sm">🤔</span>
                        <span class="text-xs font-bold text-amber-700 uppercase tracking-wide">Maybe (${maybeList.length})</span>
                    </div>
                    <div class="space-y-1.5 ml-6">${maybeList.length ? maybeList.map(r => buildPersonRow(r.profiles)).join('') : '<p class="text-xs text-gray-400 italic">None</p>'}</div>
                </div>

                <!-- Checked In -->
                <div class="mb-3">
                    <div class="flex items-center gap-2 mb-1.5">
                        <span class="text-sm">📍</span>
                        <span class="text-xs font-bold text-violet-700 uppercase tracking-wide">Checked In (${checkinCount || 0})</span>
                    </div>
                    <div class="space-y-1.5 ml-6">${checkinRows}</div>
                </div>

                <!-- Not Going -->
                <div>
                    <div class="flex items-center gap-2 mb-1.5">
                        <span class="text-sm">❌</span>
                        <span class="text-xs font-bold text-red-600 uppercase tracking-wide">Not Going (${notGoingList.length})</span>
                    </div>
                    <div class="space-y-1.5 ml-6">${notGoingList.length ? notGoingList.map(r => buildPersonRow(r.profiles)).join('') : '<p class="text-xs text-gray-400 italic">None</p>'}</div>
                </div>
            </div>`;
    }

    // ── Host Controls (enhanced for LLC) ────────────────
    let hostControlsHtml = '';
    if (isHost) {
        let buttons = '';
        if (event.status === 'draft') {
            buttons += `<button onclick="evtUpdateStatus('${eventId}','open')" class="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition">Publish Event</button>`;
        }
        if (['open', 'confirmed', 'active'].includes(event.status)) {
            buttons += `<button onclick="evtUpdateStatus('${eventId}','completed')" class="bg-gray-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-gray-700 transition">Mark Completed</button>`;
            buttons += `<button onclick="evtCancelEvent('${eventId}')" class="bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-red-600 transition">Cancel Event</button>`;

            if (isLlc) {
                buttons += `<button onclick="evtRescheduleEvent('${eventId}')" class="bg-orange-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-orange-600 transition">Reschedule</button>`;
            }
        }
        // Duplicate tool — available for any status
        buttons += `<button onclick="evtDuplicateEvent('${eventId}')" class="bg-brand-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-brand-700 transition">Duplicate Event</button>`;

        // Delete — admin only, any status
        if (evtCurrentUserRole === 'admin') {
            buttons += `<button onclick="evtDeleteEvent('${eventId}')" class="bg-red-700 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-red-800 transition">🗑 Delete Event</button>`;
        }

        hostControlsHtml = `
            <div class="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h4 class="text-sm font-bold text-amber-700 mb-2">Host Controls</h4>
                <div class="flex flex-wrap gap-2">${buttons}</div>
            </div>`;
    }

    document.getElementById('detailContent').innerHTML = `
        <!-- Banner (sticky on mobile, taller with title overlay) -->
        <div class="relative sticky top-0 z-10" style="${bannerBg} min-height:280px;">
            <!-- Gradient scrim for text readability -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 pointer-events-none"></div>
            <!-- Top buttons — respects Dynamic Island -->
            <div class="absolute top-0 right-0 flex items-center gap-2" style="padding-top:max(1rem, env(safe-area-inset-top)); padding-right:1rem;">
                <button onclick="evtCopyShareUrl('${event.slug}')" class="w-8 h-8 bg-black/30 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/50 transition" title="Copy share link">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                </button>
                <button onclick="evtToggleModal('detailModal',false)" class="w-8 h-8 bg-black/30 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/50 transition">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <!-- Tags + Title at bottom of banner -->
            <div class="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                <div class="flex gap-1.5 mb-2">
                    <span class="type-tag ${tc.bg} ${tc.text}">${tc.label}</span>
                    <span class="type-tag ${STATUS_COLORS[event.status] || ''}">${event.status.toUpperCase()}</span>
                </div>
                <h2 class="text-xl sm:text-2xl font-extrabold text-white drop-shadow-lg">${evtEscapeHtml(event.title)}</h2>
            </div>
        </div>

        <div class="p-5 sm:p-6">

            <!-- Date & Time -->
            <div class="mt-4 space-y-2 text-gray-600">
                <div class="flex items-center gap-2.5">
                    <svg class="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <span class="text-lg font-bold text-gray-900">${dateStr}</span>
                </div>
                ${showTime ? `
                <div class="flex items-center gap-2.5 ml-[30px]">
                    <span class="text-base font-semibold text-gray-700">${timeStr}</span>
                </div>` : `
                <div class="flex items-center gap-2 text-gray-400 italic text-sm">
                    <svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    <span>Time revealed after RSVP</span>
                </div>`}
                ${showLocation && event.location_text ? `
                <div class="flex items-center gap-2.5 mt-1">
                    <svg class="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <span class="text-base font-semibold text-gray-700">${evtEscapeHtml(event.location_text)}</span>
                </div>` : !showLocation && event.location_text ? `
                <div class="flex items-center gap-2 text-gray-400 italic text-sm">
                    <svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    <span>Location revealed after RSVP</span>
                </div>` : ''}
            </div>

            <!-- Location Map -->
            ${showLocation && event.location_lat && event.location_lng ? `
            <div class="mt-3">
                <div id="detailEventMap" class="h-40 rounded-xl z-0"></div>
                <a href="${/iPad|iPhone|iPod/.test(navigator.userAgent) ? 'https://maps.apple.com/?daddr=' : 'https://www.google.com/maps/dir/?api=1&destination='}${encodeURIComponent(event.location_text)}" target="_blank" rel="noopener"
                   class="mt-2 w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Get Directions
                </a>
            </div>` : ''}

            <!-- Description -->
            <div class="mt-5">
                <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line">${evtEscapeHtml(event.description || '')}</p>
            </div>

            <!-- Gated Notes -->
            ${showNotes && event.gated_notes ? `
            <div class="mt-4 p-4 bg-brand-50 rounded-xl">
                <h4 class="text-sm font-bold text-brand-700 mb-1">Attendee Details</h4>
                <p class="text-sm text-brand-600 whitespace-pre-line">${evtEscapeHtml(event.gated_notes)}</p>
            </div>` : ''}

            ${costBreakdownHtml}
            ${thresholdHtml}
            ${transportHtml}
            ${locationReqHtml}
            ${graceHtml}
            ${documentsHtml}
            ${mapHtml}
            ${competitionHtml}
            ${scrapbookHtml}

            <!-- Stats Row (Host only) -->
            ${isHost ? `
            <div class="grid grid-cols-4 gap-2 mt-6">
                <div class="text-center p-3 bg-surface-50 rounded-xl">
                    <div class="text-lg font-extrabold text-gray-900">${goingList.length}${event.max_participants ? `<span class="text-xs font-normal text-gray-400">/${event.max_participants}</span>` : ''}</div>
                    <div class="text-xs text-gray-500">Going</div>
                </div>
                <div class="text-center p-3 bg-surface-50 rounded-xl">
                    <div class="text-lg font-extrabold text-gray-900">${maybeList.length}</div>
                    <div class="text-xs text-gray-500">Maybe</div>
                </div>
                <div class="text-center p-3 bg-surface-50 rounded-xl">
                    <div class="text-lg font-extrabold text-emerald-600">${checkinCount || 0}</div>
                    <div class="text-xs text-gray-500">Checked In</div>
                </div>
                <div class="text-center p-3 bg-surface-50 rounded-xl">
                    <div class="text-lg font-extrabold text-red-500">${notGoingList.length}</div>
                    <div class="text-xs text-gray-500">Not Going</div>
                </div>
            </div>` : ''}

            ${rsvpButtons}
            ${waitlistHtml}
            ${raffleHtml}
            ${qrHtml}
            ${venueQrHtml}
            ${scannerBtn}

            <!-- Attendee Breakdown (Host only) -->
            ${attendeeBreakdownHtml}

            ${hostControlsHtml}

            ${event.cancellation_note ? `
            <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p class="text-sm font-semibold text-red-700">Cancellation Note</p>
                <p class="text-xs text-red-600 mt-1">${evtEscapeHtml(event.cancellation_note)}</p>
            </div>` : ''}

            <!-- Bottom padding for mobile nav -->
            <div class="h-20 sm:hidden"></div>
        </div>
    `;

    evtToggleModal('detailModal', true);

    // Generate QR codes after modal is visible
    setTimeout(() => {
        if (rsvp && rsvp.status === 'going' && event.checkin_mode === 'attendee_ticket') {
            const canvas = document.getElementById('myTicketQR');
            if (canvas && typeof QRCode !== 'undefined') {
                const ticketUrl = `${window.location.origin}/events/?e=${event.slug}&ticket=${rsvp.qr_token}`;
                QRCode.toCanvas(canvas, ticketUrl, { width: 180, margin: 2 });
            }
        }
        if (isHost && event.checkin_mode === 'venue_scan' && event.venue_qr_token) {
            const canvas = document.getElementById('venueQR');
            if (canvas && typeof QRCode !== 'undefined') {
                const venueUrl = `${window.location.origin}/events/?e=${event.slug}&checkin=1`;
                QRCode.toCanvas(canvas, venueUrl, { width: 220, margin: 2 });
            }
        }
        // Detail map
        if (showLocation && event.location_lat && event.location_lng && typeof L !== 'undefined') {
            const mapEl = document.getElementById('detailEventMap');
            if (mapEl) {
                const dMap = L.map('detailEventMap', { zoomControl: false, attributionControl: false, dragging: true, scrollWheelZoom: false }).setView([event.location_lat, event.location_lng], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(dMap);
                L.marker([event.location_lat, event.location_lng]).addTo(dMap);
                setTimeout(() => dMap.invalidateSize(), 100);
            }
        }
    }, 100);
}
