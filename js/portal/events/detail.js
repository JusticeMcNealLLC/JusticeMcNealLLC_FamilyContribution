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

    // Load creator profile for member-created events
    let creatorProfile = null;
    if (event.created_by) {
        const { data: cp } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name, profile_picture_url, displayed_badge, title, bio')
            .eq('id', event.created_by)
            .single();
        creatorProfile = cp;
    }
    // Pre-compute creator display vars for banner
    const cpName = creatorProfile ? ([creatorProfile.first_name, creatorProfile.last_name].filter(Boolean).join(' ') || 'Member') : '';
    const cpInitials = creatorProfile ? ((creatorProfile.first_name || '?')[0] + (creatorProfile.last_name || '')[0]).toUpperCase() : '';
    const cpBadge = creatorProfile ? evtBadgeChip(creatorProfile.displayed_badge) : '';
    const cpTitle = creatorProfile ? (creatorProfile.title || 'Member') : '';

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
    if (isLlc && event.transportation_enabled !== false && event.transportation_mode) {
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

    // QR Code for attendee ticket mode — check if already checked in
    let qrHtml = '';
    let myCheckin = null;
    const checkinEnabled = event.checkin_enabled !== false; // default true for backward compat
    if (checkinEnabled && rsvp && rsvp.status === 'going' && event.checkin_mode === 'attendee_ticket') {
        const { data: ci } = await supabaseClient
            .from('event_checkins')
            .select('checked_in_at')
            .eq('event_id', eventId)
            .eq('user_id', evtCurrentUser.id)
            .maybeSingle();
        myCheckin = ci;

        const checkedInTime = myCheckin
            ? new Date(myCheckin.checked_in_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            : null;
        const checkedInDate = myCheckin
            ? new Date(myCheckin.checked_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : null;

        qrHtml = `
            <div class="mt-6 text-center">
                <h4 class="text-sm font-bold text-gray-700 mb-2">${myCheckin ? '✅ Checked In' : 'Your Event Ticket'}</h4>
                <div class="relative inline-block">
                    <canvas id="myTicketQR" class="mx-auto ${myCheckin ? 'opacity-30' : ''}"></canvas>
                    ${myCheckin ? `
                    <div class="absolute inset-0 flex items-center justify-center">
                        <div class="bg-emerald-500 rounded-full w-16 h-16 flex items-center justify-center shadow-lg">
                            <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                        </div>
                    </div>` : ''}
                </div>
                ${myCheckin
                    ? `<p class="text-xs text-emerald-600 font-semibold mt-2">Scanned at ${checkedInTime} · ${checkedInDate}</p>`
                    : `<p class="text-xs text-gray-400 mt-2">Show this QR code at check-in</p>`}
            </div>`;
    }

    // Venue QR (if host and venue_scan mode)
    let venueQrHtml = '';
    if (checkinEnabled && isHost && event.checkin_mode === 'venue_scan' && event.venue_qr_token) {
        venueQrHtml = `
            <div class="mt-6 p-4 bg-amber-50 rounded-xl text-center">
                <h4 class="text-sm font-bold text-amber-700 mb-2">Venue QR Code</h4>
                <canvas id="venueQR" class="mx-auto"></canvas>
                <p class="text-xs text-amber-600 mt-2">Display this at the entrance for attendees to scan</p>
            </div>`;
    }

    // Scanner button (for hosts in attendee_ticket mode)
    let scannerBtn = '';
    if (checkinEnabled && isHost && event.checkin_mode === 'attendee_ticket' && ['open', 'confirmed', 'active'].includes(event.status)) {
        scannerBtn = `
            <button onclick="evtOpenScanner('${eventId}')" class="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition mt-3">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                Scan Attendee QR
            </button>`;
    }

    // ── Cost Breakdown Display (LLC only — respects show_cost_breakdown toggle) ────────────────
    let costBreakdownHtml = '';
    const showBreakdownToAttendees = event.show_cost_breakdown !== false; // default true for backwards compat
    if (isLlc && costItems.length > 0 && (showBreakdownToAttendees || isHost)) {
        const CATEGORY_ICONS = { lodging: '🏠', transportation: '🚗', food: '🍕', gear: '🎿', entertainment: '🎭', other: '📦' };
        const included = costItems.filter(i => i.included_in_buyin);
        const oop = costItems.filter(i => !i.included_in_buyin);
        const totalIncluded = included.reduce((s, i) => s + (i.total_cost_cents || 0), 0);
        const totalOop = oop.reduce((s, i) => s + (i.avg_per_person_cents || 0), 0);
        // Use min_participants as divisor (financially safe — event funded at minimum attendance)
        const minP = event.min_participants || event.max_participants || 0;
        const baseBuyIn = minP > 0 ? Math.ceil(totalIncluded / minP) : 0;
        const llcCut = Math.round(baseBuyIn * (event.llc_cut_pct || 0) / 100);
        const finalBuyIn = baseBuyIn + llcCut;
        const lockedLabel = event.cost_breakdown_locked ? ' <span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">🔒 Locked</span>' : '';
        const hostOnlyLabel = !showBreakdownToAttendees ? ' <span class="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Host Only</span>' : '';

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
                    <h4 class="text-sm font-bold text-gray-800">📊 Cost Breakdown${lockedLabel}${hostOnlyLabel}</h4>
                </div>
                <div class="divide-y divide-amber-100">${itemRows}</div>
                <div class="border-t border-amber-300 mt-3 pt-3 space-y-1.5">
                    <div class="flex justify-between text-sm"><span class="text-gray-600">Total Included:</span><span class="font-bold">${formatCurrency(totalIncluded)}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-gray-600">Min Participants:</span><span class="font-bold">${minP}</span></div>
                    <div class="border-t border-amber-200 my-1.5"></div>
                    <div class="flex justify-between text-sm"><span class="text-gray-700 font-semibold">💡 Suggested Buy-In:</span><span class="font-extrabold text-brand-700">${formatCurrency(finalBuyIn)}/person</span></div>
                    <div class="flex justify-between text-sm"><span class="text-gray-700 font-semibold">💳 Actual RSVP Price:</span><span class="font-extrabold text-brand-700">${formatCurrency(event.rsvp_cost_cents)}/person</span></div>
                    ${event.llc_cut_pct > 0 ? `<div class="flex justify-between text-xs text-gray-500"><span>Includes ${event.llc_cut_pct}% LLC contribution</span><span>+${formatCurrency(llcCut)}</span></div>` : ''}
                    <div class="flex justify-between text-sm"><span class="text-gray-600">✈ Est. Out-of-Pocket:</span><span class="font-bold">~${formatCurrency(totalOop)}/person</span></div>
                    <div class="border-t border-amber-200 my-1.5"></div>
                    <div class="flex justify-between text-sm"><span class="font-semibold text-gray-700">💰 Est. Total/Person:</span><span class="font-extrabold">~${formatCurrency((event.rsvp_cost_cents || finalBuyIn) + totalOop)}</span></div>
                </div>
            </div>`;
    }

    // ── Minimum Threshold / Social Proof (LLC only) ──────
    // Hosts always see full progress bar.
    // Non-hosts see encouraging text with smart social proof:
    //   - Before 50% of min: "Spots available — be one of the first to RSVP!"
    //   - After 50% of min: "X going · spots left"
    //   - Minimum met: "✅ Event confirmed! X going"
    let thresholdHtml = '';
    if (isLlc && event.min_participants) {
        const currentGoing = goingList.length;
        const minNeeded = event.min_participants;
        const pct = Math.min(100, Math.round((currentGoing / minNeeded) * 100));
        const isMet = currentGoing >= minNeeded;
        const deadlineStr = event.rsvp_deadline ? new Date(event.rsvp_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';
        const socialThreshold = Math.min(Math.floor(minNeeded * 0.5), 3); // 50% of min or 3, whichever is lower
        const showExactCount = currentGoing >= socialThreshold;

        if (isHost) {
            // Host sees full progress bar with exact numbers
            const barColor = isMet ? 'bg-emerald-500' : 'bg-amber-500';
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
        } else {
            // Non-host sees social-proof-friendly text (no progress bar)
            let socialText = '';
            let socialBg = '';
            if (isMet) {
                socialText = `<span class="text-sm font-semibold text-emerald-700">✅ Event confirmed!</span><span class="text-sm text-gray-600 ml-1">${currentGoing} going${event.max_participants ? ' · ' + (event.max_participants - currentGoing) + ' spots left' : ''}</span>`;
                socialBg = 'bg-emerald-50 border-emerald-200';
            } else if (showExactCount) {
                socialText = `<span class="text-sm font-semibold text-gray-700">${currentGoing} going</span><span class="text-sm text-gray-500 ml-1">· spots remaining</span>`;
                socialBg = 'bg-surface-50 border-gray-200';
            } else {
                socialText = `<div class="flex items-center gap-2"><svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span class="text-sm font-semibold text-gray-700">Spots available — be one of the first to RSVP!</span></div>`;
                socialBg = 'bg-brand-50 border-brand-200';
            }
            thresholdHtml = `
            <div class="mt-4 p-3 ${socialBg} border rounded-xl flex items-center justify-between">
                <div>${socialText}</div>
                ${event.rsvp_deadline ? `<span class="text-xs text-gray-400">RSVP by ${deadlineStr}</span>` : ''}
            </div>`;
        }
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

    // RSVP buttons (Airbnb-inspired)
    let rsvpButtons = '';
    const rsvpEnabled = event.rsvp_enabled !== false;
    const canRsvp = rsvpEnabled && ['open', 'confirmed', 'active'].includes(event.status);
    const eventIsFull = isLlc && event.max_participants && goingList.length >= event.max_participants;

    if (!rsvpEnabled) {
        rsvpButtons = `
            <div class="evt-info-card">
                <span class="evt-info-card-icon">ℹ️</span>
                <div>
                    <p class="evt-info-card-title">Informational Event</p>
                    <p class="evt-info-card-sub">RSVP is not required for this event</p>
                </div>
            </div>`;
    } else if (isHost) {
        rsvpButtons = `
            <div class="evt-info-card">
                <span class="evt-info-card-icon">🎯</span>
                <div>
                    <p class="evt-info-card-title">You're Hosting This Event</p>
                    <p class="evt-info-card-sub">You're automatically counted as attending</p>
                </div>
            </div>`;

    } else if (canRsvp && !eventIsFull && event.pricing_mode === 'free') {
        const goingActive = rsvp?.status === 'going' ? ' active-going' : '';
        const maybeActive = rsvp?.status === 'maybe' ? ' active-maybe' : '';
        const notActive = rsvp?.status === 'not_going' ? ' active-not' : '';
        rsvpButtons = `
            <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#717171;margin-bottom:12px">RSVP</p>
            <div class="evt-rsvp-grid">
                <button onclick="evtHandleRsvp('${eventId}','going')" class="evt-rsvp-btn${goingActive}">Going</button>
                <button onclick="evtHandleRsvp('${eventId}','maybe')" class="evt-rsvp-btn${maybeActive}">Maybe</button>
                <button onclick="evtHandleRsvp('${eventId}','not_going')" class="evt-rsvp-btn${notActive}">Can't Go</button>
            </div>`;

    } else if (canRsvp && !eventIsFull && (event.pricing_mode === 'paid' || event.pricing_mode === 'free_paid_raffle')) {
        const isPaid = event.pricing_mode === 'paid';
        const costCents = isPaid ? event.rsvp_cost_cents : 0;

        if (rsvp?.paid) {
            rsvpButtons = `
            <div class="evt-info-card">
                <span class="evt-info-card-icon">✅</span>
                <div>
                    <p class="evt-info-card-title">RSVP Confirmed &amp; Paid</p>
                    <p class="evt-info-card-sub">Non-refundable · Contact admin for changes</p>
                </div>
            </div>`;
        } else if (isPaid) {
            rsvpButtons = `
            <button onclick="evtHandleRsvp('${eventId}','going')" class="evt-rsvp-pay">
                RSVP — ${formatCurrency(costCents)}
            </button>
            <p style="font-size:12px;color:#717171;text-align:center;margin-top:8px">Non-refundable unless cancelled by staff${event.raffle_enabled ? ' · Includes raffle entry' : ''}</p>`;
        } else {
            const goingActive = rsvp?.status === 'going' ? ' active-going' : '';
            const maybeActive = rsvp?.status === 'maybe' ? ' active-maybe' : '';
            const notActive = rsvp?.status === 'not_going' ? ' active-not' : '';
            rsvpButtons = `
            <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#717171;margin-bottom:12px">RSVP (Free)</p>
            <div class="evt-rsvp-grid">
                <button onclick="evtHandleRsvp('${eventId}','going')" class="evt-rsvp-btn${goingActive}">Going</button>
                <button onclick="evtHandleRsvp('${eventId}','maybe')" class="evt-rsvp-btn${maybeActive}">Maybe</button>
                <button onclick="evtHandleRsvp('${eventId}','not_going')" class="evt-rsvp-btn${notActive}">Can't Go</button>
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

    // ── Host Controls ────────────────────────────────────
    let hostControlsHtml = '';
    if (isHost) {
        let buttons = '';
        if (event.status === 'draft') {
            buttons += `<button onclick="evtUpdateStatus('${eventId}','open')" class="evt-host-btn primary">Publish Event</button>`;
        }
        if (['open', 'confirmed', 'active'].includes(event.status)) {
            buttons += `<button onclick="evtUpdateStatus('${eventId}','completed')" class="evt-host-btn">Mark Completed</button>`;
            buttons += `<button onclick="evtCancelEvent('${eventId}')" class="evt-host-btn danger">Cancel Event</button>`;
            if (isLlc) {
                buttons += `<button onclick="evtRescheduleEvent('${eventId}')" class="evt-host-btn">Reschedule</button>`;
            }
        }
        buttons += `<button onclick="evtDuplicateEvent('${eventId}')" class="evt-host-btn">Duplicate Event</button>`;
        if (evtCurrentUserRole === 'admin') {
            buttons += `<button onclick="evtDeleteEvent('${eventId}')" class="evt-host-btn danger">Delete Event</button>`;
        }

        hostControlsHtml = `
            <h3 class="evt-section-title">Host Controls</h3>
            <div class="evt-host-controls">${buttons}</div>`;
    }

    // ── Attendee Preview (visible to all) ────────────────
    let attendeePreviewHtml = '';
    if (goingList.length > 0 || maybeList.length > 0) {
        const displayList = goingList.slice(0, 6);
        const avatarHtml = displayList.map(r => {
            const p = r.profiles;
            if (p?.profile_picture_url) {
                return `<div class="evt-avatar-item"><img src="${p.profile_picture_url}" alt=""></div>`;
            }
            const ini = ((p?.first_name?.[0] || '') + (p?.last_name?.[0] || '')).toUpperCase() || '?';
            return `<div class="evt-avatar-item"><span>${ini}</span></div>`;
        }).join('');
        const moreCount = goingList.length - displayList.length;
        const moreHtml = moreCount > 0 ? `<div class="evt-avatar-more">+${moreCount}</div>` : '';
        const parts = [];
        if (goingList.length) parts.push(`${goingList.length} going`);
        if (maybeList.length) parts.push(`${maybeList.length} maybe`);
        attendeePreviewHtml = `
            <div style="display:flex;align-items:center;gap:14px">
                <div class="evt-avatar-stack">${avatarHtml}${moreHtml}</div>
                <span style="font-size:14px;color:#717171">${parts.join(' · ')}</span>
            </div>`;
    }
    document.getElementById('detailContent').innerHTML = `
        <!-- Hero Banner -->
        <div class="evt-hero" style="${bannerBg} min-height:300px;">
            <div class="evt-hero-scrim"></div>
            <div class="evt-hero-actions">
                <button onclick="evtCopyShareUrl('${event.slug}')" class="evt-hero-btn" title="Share">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                </button>
                <button onclick="evtToggleModal('detailModal',false)" class="evt-hero-btn">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="evt-hero-content">
                <div class="flex gap-2 mb-2.5">
                    <span class="evt-tag ${tc.bg} ${tc.text}">${tc.label}</span>
                    <span class="evt-tag ${STATUS_COLORS[event.status] || ''}">${event.status.toUpperCase()}</span>
                </div>
                <h1 class="evt-hero-title">${evtEscapeHtml(event.title)}</h1>
            </div>
        </div>

        <div class="evt-body">

            <!-- Host -->
            ${creatorProfile ? `
            <div class="evt-section">
                <a href="profile.html?id=${creatorProfile.id}" class="evt-host-link">
                    <div class="evt-host-avatar">
                        ${creatorProfile.profile_picture_url
                            ? `<img src="${creatorProfile.profile_picture_url}" alt="">`
                            : `<span>${cpInitials}</span>`}
                    </div>
                    <div>
                        <p class="evt-host-name">Hosted by ${evtEscapeHtml(cpName)}</p>
                        <div class="evt-host-meta">${evtEscapeHtml(cpTitle)} ${cpBadge}</div>
                    </div>
                </a>
            </div>
            <hr class="evt-divider">` : ''}

            <!-- Event Details -->
            <div class="evt-section">
                <div class="evt-info-row">
                    <div class="evt-info-icon">
                        <svg viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>
                    </div>
                    <div>
                        <p class="evt-info-primary">${dateStr}</p>
                        ${showTime
                            ? `<p class="evt-info-secondary">${timeStr}</p>`
                            : `<p class="evt-info-gated"><svg style="width:14px;height:14px;flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg> Time revealed after RSVP</p>`}
                    </div>
                </div>
                ${event.location_text ? `
                <div class="evt-info-row">
                    <div class="evt-info-icon">
                        <svg viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z"/></svg>
                    </div>
                    <div>
                        ${showLocation
                            ? `<p class="evt-info-primary">${evtEscapeHtml(event.location_text)}</p>`
                            : `<p class="evt-info-gated"><svg style="width:14px;height:14px;flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg> Location revealed after RSVP</p>`}
                    </div>
                </div>` : ''}
                ${event.max_participants ? `
                <div class="evt-info-row">
                    <div class="evt-info-icon">
                        <svg viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>
                    </div>
                    <div>
                        <p class="evt-info-primary">${goingList.length} / ${event.max_participants} spots filled</p>
                    </div>
                </div>` : ''}
            </div>

            <hr class="evt-divider">

            <!-- About -->
            <div class="evt-section">
                <h3 class="evt-section-title">About this event</h3>
                <p style="font-size:15px;line-height:1.7;color:#484848" class="whitespace-pre-line">${evtEscapeHtml(event.description || 'No description provided.')}</p>
            </div>

            ${showNotes && event.gated_notes ? `
            <hr class="evt-divider">
            <div class="evt-section">
                <h3 class="evt-section-title">Attendee Details</h3>
                <p style="font-size:15px;line-height:1.7;color:#484848" class="whitespace-pre-line">${evtEscapeHtml(event.gated_notes)}</p>
            </div>` : ''}

            <!-- Where you'll be -->
            ${showLocation && event.location_lat && event.location_lng ? `
            <hr class="evt-divider">
            <div class="evt-section">
                <h3 class="evt-section-title">Where you'll be</h3>
                <div id="detailEventMap" class="evt-map" onclick="evtOpenFullscreenMap(${event.location_lat}, ${event.location_lng}, '${evtEscapeHtml(event.location_text || '').replace(/'/g, "\\'")}')">
                    <div class="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-600 shadow-sm z-[5] flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
                        Expand
                    </div>
                </div>
                <a href="${/iPad|iPhone|iPod/.test(navigator.userAgent) ? 'https://maps.apple.com/?daddr=' : 'https://www.google.com/maps/dir/?api=1&destination='}${encodeURIComponent(event.location_text)}" target="_blank" rel="noopener" class="evt-directions-btn">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Get Directions
                </a>
            </div>` : ''}

            <!-- Who's Going -->
            ${attendeePreviewHtml ? `
            <hr class="evt-divider">
            <div class="evt-section">
                <h3 class="evt-section-title">Who's going</h3>
                ${attendeePreviewHtml}
            </div>` : ''}

            <!-- RSVP -->
            <hr class="evt-divider">
            <div class="evt-section">
                ${rsvpButtons}
            </div>

            <!-- Dynamic sections -->
            ${[waitlistHtml, qrHtml, venueQrHtml, scannerBtn, thresholdHtml, costBreakdownHtml, transportHtml, locationReqHtml, graceHtml, raffleHtml, documentsHtml, mapHtml, competitionHtml, scrapbookHtml].filter(Boolean).map(s => '<hr class="evt-divider"><div class="evt-section">' + s + '</div>').join('')}

            <!-- Stats (Host) -->
            ${isHost ? `
            <hr class="evt-divider">
            <div class="evt-section">
                <h3 class="evt-section-title">Event Stats</h3>
                <div class="evt-stats-grid">
                    <div class="evt-stat">
                        <div class="evt-stat-value">${goingList.length}${event.max_participants ? `<span style="font-size:12px;font-weight:400;color:#717171">/${event.max_participants}</span>` : ''}</div>
                        <div class="evt-stat-label">Going</div>
                    </div>
                    <div class="evt-stat">
                        <div class="evt-stat-value">${maybeList.length}</div>
                        <div class="evt-stat-label">Maybe</div>
                    </div>
                    <div class="evt-stat">
                        <div class="evt-stat-value" style="color:#059669">${checkinCount || 0}</div>
                        <div class="evt-stat-label">Checked In</div>
                    </div>
                    <div class="evt-stat">
                        <div class="evt-stat-value" style="color:#dc2626">${notGoingList.length}</div>
                        <div class="evt-stat-label">Not Going</div>
                    </div>
                </div>
            </div>` : ''}

            <!-- Attendee Breakdown (Host) -->
            ${attendeeBreakdownHtml ? `<hr class="evt-divider"><div class="evt-section">${attendeeBreakdownHtml}</div>` : ''}

            <!-- Host Controls -->
            ${hostControlsHtml ? `<hr class="evt-divider"><div class="evt-section">${hostControlsHtml}</div>` : ''}

            ${event.cancellation_note ? `
            <hr class="evt-divider">
            <div class="evt-section">
                <div style="padding:20px;border-radius:12px;background:#fef2f2;border:1px solid #fecaca">
                    <p style="font-size:15px;font-weight:600;color:#b91c1c">Cancellation Note</p>
                    <p style="font-size:14px;color:#dc2626;margin-top:6px">${evtEscapeHtml(event.cancellation_note)}</p>
                </div>
            </div>` : ''}

            <div style="height:80px" class="sm:hidden"></div>
            <div style="height:32px" class="hidden sm:block"></div>
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

// ═══════════════════════════════════════════════════════════
// Fullscreen Map (mobile)
// ═══════════════════════════════════════════════════════════
let _fullscreenMap = null;

function evtOpenFullscreenMap(lat, lng, label) {
    const overlay = document.getElementById('fullscreenMapOverlay');
    if (!overlay || typeof L === 'undefined') return;

    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Directions link
    const dirBtn = document.getElementById('fullscreenMapDirections');
    if (dirBtn) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const addr = encodeURIComponent(label || `${lat},${lng}`);
        dirBtn.href = isIOS
            ? `https://maps.apple.com/?daddr=${addr}`
            : `https://www.google.com/maps/dir/?api=1&destination=${addr}`;
    }

    // Init map after overlay is visible
    setTimeout(() => {
        if (_fullscreenMap) { _fullscreenMap.remove(); _fullscreenMap = null; }
        _fullscreenMap = L.map('fullscreenMapContainer', {
            zoomControl: true,
            attributionControl: false,
            dragging: true,
            scrollWheelZoom: true
        }).setView([lat, lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(_fullscreenMap);
        L.marker([lat, lng]).addTo(_fullscreenMap).bindPopup(evtEscapeHtml(label || 'Event Location')).openPopup();
        setTimeout(() => _fullscreenMap.invalidateSize(), 50);
    }, 50);
}

function evtCloseFullscreenMap() {
    const overlay = document.getElementById('fullscreenMapOverlay');
    if (overlay) overlay.classList.add('hidden');
    if (_fullscreenMap) { _fullscreenMap.remove(); _fullscreenMap = null; }
    // Restore scroll only if detail modal is closed
    const detailModal = document.getElementById('detailModal');
    if (!detailModal || detailModal.classList.contains('hidden')) {
        document.body.style.overflow = '';
    }
}

window.evtOpenFullscreenMap = evtOpenFullscreenMap;
window.evtCloseFullscreenMap = evtCloseFullscreenMap;
