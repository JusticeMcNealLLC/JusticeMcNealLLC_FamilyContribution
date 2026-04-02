// ═══════════════════════════════════════════════════════════
// Portal Events — Detail Page View
// Renders the full event detail into the page (not a modal)
// with attendee list, QR codes, host controls, cost breakdown, etc.
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
            <div class="evt-notice-card">
                <span class="evt-notice-icon">${isProvided ? '✈️' : '🧳'}</span>
                <div>
                    <p class="evt-notice-title">${isProvided ? 'LLC Provides Transportation' : 'Self-Arranged Transportation'}</p>
                    <p class="evt-notice-sub">${isProvided ? 'Tickets will be uploaded to your documents' : `Members book their own travel${event.transportation_estimate_cents ? ` — est. ~${formatCurrency(event.transportation_estimate_cents)}` : ''}`}</p>
                </div>
            </div>`;
    }

    // Location-required badge
    let locationReqHtml = '';
    if (isLlc && event.location_required) {
        locationReqHtml = `
            <div class="evt-notice-card">
                <span class="evt-notice-icon">📍</span>
                <div>
                    <p class="evt-notice-title">Location sharing required</p>
                    <p class="evt-notice-sub">You'll need to enable location sharing at check-in</p>
                </div>
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
            <div class="evt-qr-card">
                <h4 class="evt-qr-title">${myCheckin ? '✅ Checked In' : '🎫 Your Event Ticket'}</h4>
                <div style="position:relative;display:inline-block">
                    <canvas id="myTicketQR" style="display:block;margin:0 auto;${myCheckin ? 'opacity:.3' : ''}"></canvas>
                    ${myCheckin ? `
                    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
                        <div style="width:56px;height:56px;border-radius:50%;background:#222;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.15)">
                            <svg style="width:28px;height:28px;color:#fff" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                        </div>
                    </div>` : ''}
                </div>
                ${myCheckin
                    ? `<p class="evt-qr-sub" style="color:#222;font-weight:600">Scanned at ${checkedInTime} · ${checkedInDate}</p>`
                    : `<p class="evt-qr-sub">Show this QR code at check-in</p>`}
            </div>`;
    }

    // Venue QR (if host and venue_scan mode)
    let venueQrHtml = '';
    if (checkinEnabled && isHost && event.checkin_mode === 'venue_scan' && event.venue_qr_token) {
        venueQrHtml = `
            <div class="evt-qr-card">
                <h4 class="evt-qr-title">📍 Venue QR Code</h4>
                <canvas id="venueQR" style="display:block;margin:0 auto"></canvas>
                <p class="evt-qr-sub">Display this at the entrance for attendees to scan</p>
            </div>`;
    }

    // Scanner button (for hosts in attendee_ticket mode)
    let scannerBtn = '';
    if (checkinEnabled && isHost && event.checkin_mode === 'attendee_ticket' && ['open', 'confirmed', 'active'].includes(event.status)) {
        scannerBtn = `
            <button onclick="evtOpenScanner('${eventId}')" class="evt-action-btn">
                <svg style="width:18px;height:18px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
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
        const lockedLabel = event.cost_breakdown_locked ? ' <span style="font-size:11px;background:#f7f7f7;color:#717171;padding:2px 8px;border-radius:6px;font-weight:600">🔒 Locked</span>' : '';
        const hostOnlyLabel = !showBreakdownToAttendees ? ' <span style="font-size:11px;background:#f7f7f7;color:#717171;padding:2px 8px;border-radius:6px;font-weight:600">Host Only</span>' : '';

        const itemRows = costItems.map(i => `
            <div class="evt-cost-row" style="padding:10px 0">
                <div style="display:flex;align-items:center;gap:10px">
                    <span style="font-size:16px">${CATEGORY_ICONS[i.category] || '📦'}</span>
                    <span style="font-size:15px;color:#222">${evtEscapeHtml(i.name)}</span>
                </div>
                <div style="text-align:right">
                    ${i.included_in_buyin
                        ? `<span style="font-weight:600;color:#222">${formatCurrency(i.total_cost_cents)}</span><span style="font-size:11px;font-weight:700;color:#222;margin-left:8px;background:#f7f7f7;padding:2px 8px;border-radius:6px">INCLUDED</span>`
                        : `<span style="color:#717171">~${formatCurrency(i.avg_per_person_cents)}/person</span><span style="font-size:11px;font-weight:700;color:#717171;margin-left:8px;background:#f7f7f7;padding:2px 8px;border-radius:6px">OOP</span>`}
                </div>
            </div>`).join('');

        costBreakdownHtml = `
            <h3 class="evt-section-title">📊 Cost Breakdown${lockedLabel}${hostOnlyLabel}</h3>
            <div style="border-top:1px solid #ebebeb">${itemRows}</div>
            <div style="border-top:2px solid #222;margin-top:16px;padding-top:16px">
                <div class="evt-cost-row"><span>Total Included</span><span class="evt-cost-val">${formatCurrency(totalIncluded)}</span></div>
                <div class="evt-cost-row"><span>Min Participants</span><span class="evt-cost-val">${minP}</span></div>
                <div style="border-top:1px solid #ebebeb;margin:10px 0"></div>
                <div class="evt-cost-row"><span>💡 Suggested Buy-In</span><span class="evt-cost-val evt-cost-highlight">${formatCurrency(finalBuyIn)}/person</span></div>
                <div class="evt-cost-row"><span>💳 Actual RSVP Price</span><span class="evt-cost-val evt-cost-highlight">${formatCurrency(event.rsvp_cost_cents)}/person</span></div>
                ${event.llc_cut_pct > 0 ? `<div class="evt-cost-row" style="font-size:13px;color:#717171"><span>Includes ${event.llc_cut_pct}% LLC contribution</span><span>+${formatCurrency(llcCut)}</span></div>` : ''}
                <div class="evt-cost-row"><span>✈ Est. Out-of-Pocket</span><span class="evt-cost-val">~${formatCurrency(totalOop)}/person</span></div>
                <div style="border-top:2px solid #222;margin:12px 0"></div>
                <div class="evt-cost-row" style="font-size:16px"><span style="font-weight:700">💰 Est. Total/Person</span><span style="font-weight:800">~${formatCurrency((event.rsvp_cost_cents || finalBuyIn) + totalOop)}</span></div>
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
            thresholdHtml = `
            <div class="evt-notice-card">
                <div style="width:100%">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                        <span style="font-size:14px;font-weight:600;color:#222">${isMet ? '✅ Minimum Met!' : '⚠️ Minimum Threshold'}</span>
                        <span style="font-size:13px;color:#717171">${currentGoing} / ${minNeeded} by ${deadlineStr}</span>
                    </div>
                    <div class="evt-progress-track">
                        <div class="evt-progress-fill${isMet ? ' met' : ''}" style="width:${pct}%"></div>
                    </div>
                    ${!isMet ? `<p style="font-size:13px;color:#717171;margin-top:8px">If ${minNeeded - currentGoing} more spot${minNeeded - currentGoing > 1 ? 's aren\'t' : ' isn\'t'} filled by the deadline, the event auto-cancels and all RSVPs are refunded.</p>` : ''}
                </div>
            </div>`;
        } else {
            // Non-host sees social-proof-friendly text (no progress bar)
            let socialText = '';
            let socialBg = '';
            if (isMet) {
                socialText = `<span style="font-size:14px;font-weight:600;color:#222">✅ Event confirmed!</span><span style="font-size:14px;color:#717171;margin-left:6px">${currentGoing} going${event.max_participants ? ' · ' + (event.max_participants - currentGoing) + ' spots left' : ''}</span>`;
            } else if (showExactCount) {
                socialText = `<span style="font-size:14px;font-weight:600;color:#222">${currentGoing} going</span><span style="font-size:14px;color:#717171;margin-left:6px">· spots remaining</span>`;
            } else {
                socialText = `<span style="font-size:14px;font-weight:600;color:#222">Spots available — be one of the first to RSVP!</span>`;
            }
            thresholdHtml = `
            <div class="evt-notice-card">
                <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
                    <div>${socialText}</div>
                    ${event.rsvp_deadline ? `<span style="font-size:12px;color:#b0b0b0">RSVP by ${deadlineStr}</span>` : ''}
                </div>
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
                    <div class="evt-info-card">
                        <span class="evt-info-card-icon">🎉</span>
                        <div style="flex:1">
                            <p class="evt-info-card-title">A spot opened up for you!</p>
                            <p class="evt-info-card-sub">Complete your RSVP by ${expiresStr}</p>
                            <button onclick="evtClaimWaitlistSpot('${eventId}')" class="evt-rsvp-pay" style="margin-top:10px">Claim Spot — ${formatCurrency(event.rsvp_cost_cents)}</button>
                        </div>
                    </div>`;
            } else if (isWaiting) {
                const pos = activeWaitlist.findIndex(w => w.user_id === evtCurrentUser.id) + 1;
                waitlistAction = `
                    <div class="evt-info-card" style="justify-content:space-between">
                        <div>
                            <p class="evt-info-card-title">You're #${pos} on the waitlist</p>
                            <p class="evt-info-card-sub">We'll notify you if a spot opens</p>
                        </div>
                        <button onclick="evtLeaveWaitlist('${eventId}')" style="font-size:13px;color:#dc2626;font-weight:600;background:none;border:none;cursor:pointer">Leave</button>
                    </div>`;
            } else if (!rsvp?.paid) {
                waitlistAction = `
                    <button onclick="evtJoinWaitlist('${eventId}')" class="evt-action-btn">
                        Join Waitlist
                    </button>
                    <p style="font-size:12px;color:#717171;text-align:center;margin-top:8px">No payment required to join the waitlist</p>`;
            }

            waitlistHtml = `
                <h3 class="evt-section-title">⏳ Waitlist</h3>
                <p style="font-size:14px;color:#717171;margin-bottom:14px">${activeWaitlist.length} waiting</p>
                ${waitlistAction}`;
        }
    }

    // ── Reschedule Grace Window Notice ───────────────────
    let graceHtml = '';
    if (event.rescheduled_at && event.grace_window_end && new Date(event.grace_window_end) > new Date()) {
        const graceEnd = new Date(event.grace_window_end).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        graceHtml = `
            <div class="evt-notice-card">
                <span class="evt-notice-icon">📅</span>
                <div>
                    <p class="evt-notice-title">This event was rescheduled</p>
                    <p class="evt-notice-sub">Request a full refund until <strong>${graceEnd}</strong> if the new date doesn't work.</p>
                    ${rsvp?.paid ? `<button onclick="evtRequestGraceRefund('${eventId}')" style="margin-top:8px;font-size:14px;color:#dc2626;font-weight:600;text-decoration:underline;background:none;border:none;cursor:pointer">Request Full Refund</button>` : ''}
                </div>
            </div>`;
    }

    // ── Time-based locks (matches public page logic) ──────
    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast   = new Date(event.start_date) < new Date() && event.status !== 'active';
    const deadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();
    const entriesClosed = isClosed || isPast || deadlinePassed;

    // ── Hero Status Badge (countdown / Live / Ended) ─────
    // ── Hero Date Card + Status Badge ─────
    const heroMonthStr = start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const heroDayStr = start.getDate();
    const heroTimeShort = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    let heroBadgeHtml = '';
    {
        let badgeLabel = '', badgeCls = '', dotPulse = false;
        if (event.status === 'cancelled') {
            badgeLabel = 'Cancelled'; badgeCls = 'evt-status-cancelled';
        } else if (event.status === 'completed' || isPast) {
            badgeLabel = 'Ended'; badgeCls = 'evt-status-ended';
        } else if (event.status === 'active') {
            badgeLabel = 'Live'; badgeCls = 'evt-status-live'; dotPulse = true;
        } else {
            const msUntil = new Date(event.start_date) - new Date();
            const d = Math.floor(msUntil / 86400000);
            const h = Math.floor((msUntil % 86400000) / 3600000);
            const m = Math.floor((msUntil % 3600000) / 60000);
            if (d > 0) { badgeLabel = `${d}d ${h}h`; } else if (h > 0) { badgeLabel = `${h}h ${m}m`; } else { badgeLabel = `${m}m`; }
            badgeCls = 'evt-status-soon'; dotPulse = d === 0;
        }
        heroBadgeHtml = `<div class="evt-date-card-wrap">
            <span class="evt-status-badge ${badgeCls}"><span class="evt-status-dot${dotPulse ? ' pulse' : ''}"></span>${badgeLabel}</span>
            <div class="evt-date-card">
                <span class="evt-date-card-month">${heroMonthStr}</span>
                <span class="evt-date-card-day">${heroDayStr}</span>
                <span class="evt-date-card-time">${heroTimeShort}</span>
            </div>
        </div>`;
    }

    // ── RSVP buttons (Airbnb-inspired) — now respects time-based locks ──
    let rsvpButtons = '';
    const rsvpEnabled = event.rsvp_enabled !== false;
    const canRsvp = rsvpEnabled && ['open', 'confirmed', 'active'].includes(event.status) && !entriesClosed;
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

    } else if (canRsvp && !eventIsFull && event.pricing_mode === 'paid') {
        if (rsvp?.paid) {
            rsvpButtons = `
            <div class="evt-info-card">
                <span class="evt-info-card-icon">✅</span>
                <div>
                    <p class="evt-info-card-title">RSVP Confirmed &amp; Paid</p>
                    <p class="evt-info-card-sub">Non-refundable · Contact admin for changes</p>
                </div>
            </div>`;
        } else {
            rsvpButtons = `
            <button onclick="evtHandleRsvp('${eventId}','going')" class="evt-rsvp-pay">
                RSVP — ${formatCurrency(event.rsvp_cost_cents)}
            </button>
            <p style="font-size:12px;color:#717171;text-align:center;margin-top:8px">Non-refundable unless cancelled by staff${event.raffle_enabled ? ' · Includes raffle entry' : ''}</p>`;
        }

    } else if (canRsvp && !eventIsFull) {
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
    }

    // ── RSVP closed state (event started / deadline passed) ──
    if (rsvpEnabled && !isHost && entriesClosed && !rsvpButtons) {
        let closedReason = '';
        if (isClosed) closedReason = event.status === 'cancelled' ? 'Event cancelled' : 'Event ended';
        else if (isPast) closedReason = 'Event has already started';
        else if (deadlinePassed) closedReason = 'RSVP deadline passed';

        if (rsvp) {
            // Show existing RSVP status
            const statusEmoji = rsvp.status === 'going' ? '✅' : rsvp.status === 'maybe' ? '🤔' : '❌';
            const statusLabel = rsvp.status === 'going' ? 'Going' : rsvp.status === 'maybe' ? 'Maybe' : 'Not Going';
            rsvpButtons = `
            <div class="evt-info-card">
                <span class="evt-info-card-icon">${statusEmoji}</span>
                <div>
                    <p class="evt-info-card-title">Your RSVP: ${statusLabel}</p>
                    <p class="evt-info-card-sub">${closedReason}</p>
                </div>
            </div>`;
        } else {
            rsvpButtons = `
            <div class="evt-info-card">
                <span class="evt-info-card-icon">🔒</span>
                <div>
                    <p class="evt-info-card-title">RSVP Closed</p>
                    <p class="evt-info-card-sub">${closedReason}</p>
                </div>
            </div>`;
        }
    }

    // ── Raffle Section ──────────────────────────────────
    let raffleHtml = '';
    if (event.raffle_enabled) {
        const prizes = event.raffle_prizes || [];
        const ordinal = n => n===1?'1st':n===2?'2nd':n===3?'3rd':`${n}th`;
        const prizesHtml = prizes.map((p, i) => {
            const place = p.place || i + 1;
            return `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#f9f9f4;border-radius:12px;margin-bottom:6px">
                <div class="evt-raffle-rank">${place}</div>
                <div>
                    <p style="font-size:13px;color:#717171;font-weight:600;margin:0">${ordinal(place)} Place</p>
                    <p style="font-size:15px;color:#222;font-weight:600;margin:2px 0 0">${evtEscapeHtml(p.label || p.description || p)}</p>
                </div>
            </div>`;
        }).join('');

        // Raffle entry status
        let entryStatusHtml = '';
        if (myRaffleEntry) {
            entryStatusHtml = `
                <div class="evt-info-card">
                    <span class="evt-info-card-icon">🎟️</span>
                    <div>
                        <p class="evt-info-card-title">You're entered!</p>
                        <p class="evt-info-card-sub">Good luck in the drawing</p>
                    </div>
                </div>`;
        } else if (entriesClosed && !myRaffleEntry) {
            // Locked reason
            let lockedReason = '';
            if (isClosed) lockedReason = event.status === 'cancelled' ? 'Event cancelled' : 'Event ended';
            else if (isPast) lockedReason = 'Event in progress';
            else if (deadlinePassed) lockedReason = 'RSVP deadline passed';
            entryStatusHtml = `
                <button class="evt-raffle-locked" disabled>
                    <svg fill="none" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
                    Entries Closed — ${lockedReason}
                </button>`;
        } else if (event.pricing_mode !== 'paid' && event.raffle_entry_cost_cents > 0 && !entriesClosed) {
            entryStatusHtml = `
                <button onclick="evtHandleRaffleEntry('${eventId}')" class="evt-raffle-buy">
                    🎟️ Buy Raffle Entry — ${formatCurrency(event.raffle_entry_cost_cents)}
                </button>
                <p style="font-size:12px;color:#717171;text-align:center;margin-top:8px">Non-refundable raffle ticket</p>`;
        } else if (event.pricing_mode !== 'paid' && (!event.raffle_entry_cost_cents || event.raffle_entry_cost_cents === 0) && !entriesClosed) {
            entryStatusHtml = `
                <button onclick="evtHandleFreeRaffleEntry('${eventId}')" class="evt-raffle-buy">
                    🎟️ Enter Raffle — Free
                </button>`;
        } else if (event.pricing_mode === 'paid' && !rsvp?.paid) {
            entryStatusHtml = `<p style="font-size:13px;color:#717171;font-style:italic">Raffle entry included with paid RSVP</p>`;
        }

        // Winners display
        let winnersHtml = '';
        if (raffleWinners.length > 0) {
            winnersHtml = `
            <div style="margin-top:16px">
                <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#717171;margin-bottom:10px">🏆 Winners</p>
                ${raffleWinners.map(w => {
                    const name = w.profiles ? `${w.profiles.first_name || ''} ${w.profiles.last_name || ''}`.trim() : (w.guest_token ? 'Guest' : 'Unknown');
                    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0">
                        <div class="evt-raffle-rank">${w.place}</div>
                        <span style="font-size:15px;font-weight:600;color:#222">${evtEscapeHtml(name)}</span>
                        ${w.prize_description ? `<span style="font-size:14px;color:#717171">— ${evtEscapeHtml(w.prize_description)}</span>` : ''}
                    </div>`;
                }).join('')}
            </div>`;
        }

        // Host draw button
        let drawBtnHtml = '';
        if (isHost && !entriesClosed && raffleWinners.length === 0) {
            drawBtnHtml = `
                <button onclick="evtOpenRaffleDraw('${eventId}')" class="evt-action-btn" style="margin-top:12px">
                    🎰 Draw Raffle Winners
                </button>`;
        }

        raffleHtml = `
            <h3 class="evt-section-title">🎲 Raffle</h3>
            <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">
                ${event.raffle_type ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;background:#f7f7f7;font-size:13px;font-weight:600;color:#222">${event.raffle_type === 'digital' ? '💻' : '🎁'} ${event.raffle_type === 'digital' ? 'Digital Prize' : 'Physical Prize'}</span>` : ''}
                ${event.raffle_draw_trigger ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;background:#f7f7f7;font-size:13px;font-weight:600;color:#222">${event.raffle_draw_trigger === 'auto' ? '⚡ Auto Draw' : '🎰 Manual Draw'}</span>` : ''}
                ${event.pricing_mode !== 'paid' && event.raffle_entry_cost_cents > 0 ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;background:#f7f7f7;font-size:13px;font-weight:600;color:#222">🎟️ Entry: ${formatCurrency(event.raffle_entry_cost_cents)}</span>` : ''}
                ${event.pricing_mode === 'paid' ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;background:#f7f7f7;font-size:13px;font-weight:600;color:#222">✅ Included with RSVP</span>` : ''}
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                <span style="font-size:14px;color:#717171">${raffleEntryCount} ${raffleEntryCount === 1 ? 'entry' : 'entries'}</span>
            </div>
            ${prizes.length > 0 ? `
                <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#717171;margin:12px 0 10px">🏆 Prizes</p>
                <div>${prizesHtml}</div>
            ` : `
                <p style="font-size:13px;color:#999;font-style:italic;margin:12px 0">🏆 Prizes to be announced</p>
            `}
            <div style="margin-top:16px">${entryStatusHtml}</div>
            ${winnersHtml}
            ${drawBtnHtml}`;
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
            <div>
                <h3 class="evt-section-title">📋 Attendee Breakdown</h3>

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
    document.getElementById('eventsDetailView').innerHTML = `
        <!-- Hero Banner -->
        <div class="evt-hero" style="${bannerBg} min-height:300px;">
            <div class="evt-hero-scrim"></div>
            <div class="evt-hero-actions">
                <button onclick="evtNavigateToList()" class="evt-hero-btn evt-hero-back-btn" title="Back" aria-label="Back to events">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                </button>
                <button onclick="evtCopyShareUrl('${event.slug}')" class="evt-hero-btn" title="Share" aria-label="Share event">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                </button>
            </div>
            <div class="evt-hero-content">
                <div class="flex gap-2 mb-1">
                    ${event.category ? `<span class="evt-tag" style="background:rgba(255,255,255,.2);color:#fff;backdrop-filter:blur(4px)">${CATEGORY_EMOJI[event.category] || '📌'} ${(event.category || '').replace(/_/g,' ')}</span>` : ''}
                    <span class="evt-tag ${tc.bg} ${tc.text}">${tc.label}</span>
                </div>
                ${event.location_nickname ? `<span class="evt-location-pill"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z"/></svg> ${evtEscapeHtml(event.location_nickname)}</span>` : ''}
            </div>
        </div>

        <div class="evt-body max-w-5xl mx-auto">
            ${heroBadgeHtml}

            <!-- Status banner for deadline-passed -->
            ${deadlinePassed && !isClosed && !isPast ? '<div style="padding:16px 0 0"><span class="evt-status-banner evt-status-past-body">🔒 RSVP deadline passed</span></div>' : ''}

            <!-- Event Title -->
            <h1 class="evt-content-title">${evtEscapeHtml(event.title)}</h1>

            <!-- Add to Calendar (when date is visible) -->
            ${showTime ? (() => {
                const calStart = start.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
                const calEndDate = event.end_date ? new Date(event.end_date) : new Date(start.getTime() + 7200000);
                const calEnd = calEndDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
                const gcalUrl = 'https://calendar.google.com/calendar/r/eventedit?text=' + encodeURIComponent(event.title) + '&dates=' + calStart + '/' + calEnd + '&details=' + encodeURIComponent(event.description || '') + '&location=' + encodeURIComponent(event.location_text || '');
                return '<div style="display:flex;gap:10px;padding:0 0 20px">' +
                    '<button onclick="evtDownloadIcs(\'' + eventId + '\')" class="evt-action-btn" style="flex:1;background:#f7f7f7;color:#222">' +
                        '<svg style="width:18px;height:18px;stroke:#222" fill="none" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' +
                        'Add to Calendar' +
                    '</button>' +
                    '<a href="' + gcalUrl + '" target="_blank" rel="noopener" class="evt-action-btn" style="flex:1;background:#f7f7f7;color:#222;text-decoration:none">' +
                        '<svg style="width:18px;height:18px" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#fff"/><path d="M8 16.5v-9h2v9H8zm3-9h2v9h-2v-9zm3 0h2v9h-2v-9z" fill="#4285F4"/></svg>' +
                        'Google Calendar' +
                    '</a>' +
                '</div>';
            })() : ''}

            <hr class="evt-divider">

            <!-- About this event (title → organizer → description) -->
            <div class="evt-section">
                <h3 class="evt-section-title">About this event</h3>
                ${(() => {
                if (isLlc) {
                    return '';
                }
                if (creatorProfile) {
                    const avatarImg = creatorProfile.profile_picture_url
                        ? `<img src="${creatorProfile.profile_picture_url}" style="width:48px;height:48px;border-radius:12px;object-fit:cover" alt="${evtEscapeHtml(cpName)}">`
                        : `<div style="width:48px;height:48px;border-radius:12px;background:#222;color:#fff;font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center">${cpInitials}</div>`;
                    const avatarHtml = cpBadge
                        ? `<div style="position:relative;flex-shrink:0">${avatarImg}<div style="position:absolute;bottom:-2px;right:-2px;transform:scale(.65);transform-origin:bottom right">${cpBadge}</div></div>`
                        : avatarImg;
                    const titleLabel = cpTitle || 'Member';
                    return `<a href="profile.html?id=${creatorProfile.id}" style="text-decoration:none"><div class="evt-info-row" style="margin-bottom:12px">${avatarHtml}<div><p class="evt-info-primary">${evtEscapeHtml(cpName)}</p><p class="evt-info-secondary">${evtEscapeHtml(titleLabel)} · Organizer</p></div></div></a>`;
                }
                return '';
            })()}
                <p style="font-size:15px;line-height:1.7;color:#484848" class="whitespace-pre-line">${evtEscapeHtml(event.description || 'No description provided.')}</p>
            </div>

            <hr class="evt-divider">

            <!-- Map -->
            ${showLocation && event.location_lat && event.location_lng ? `
            <div class="evt-section">
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
            </div>
            <hr class="evt-divider">` : ''}

            ${showNotes && event.gated_notes ? `
            <div class="evt-section">
                <h3 class="evt-section-title">Attendee Details</h3>
                <p style="font-size:15px;line-height:1.7;color:#484848" class="whitespace-pre-line">${evtEscapeHtml(event.gated_notes)}</p>
            </div>
            <hr class="evt-divider">` : ''}

            <!-- Who's Going -->
            ${attendeePreviewHtml ? `
            <div class="evt-section">
                <h3 class="evt-section-title">Who's going</h3>
                ${attendeePreviewHtml}
            </div>
            <hr class="evt-divider">` : ''}

            <!-- RSVP -->
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

            <!-- Comments / Discussion -->
            <hr class="evt-divider">
            <div class="evt-section" id="portalCommentsSection" role="region" aria-label="Discussion">
                <h3 class="evt-section-title">Discussion</h3>
                <div id="portalCommentsList" style="display:flex;flex-direction:column;gap:16px;margin-bottom:16px"></div>
                <div style="display:flex;gap:10px">
                    <input type="text" id="portalCommentInput" placeholder="Write a comment..." class="w-full text-sm p-3 border border-gray-200 rounded-xl outline-none focus:border-gray-900 transition" aria-label="Write a comment">
                    <button onclick="evtPostComment('${eventId}')" class="evt-action-btn" style="width:auto;padding:12px 20px;font-size:14px">Post</button>
                </div>
            </div>

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

    // Update page title
    document.title = `${event.title} | Events | Justice McNeal LLC`;
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Load comments
    evtLoadComments(eventId);

    // Generate QR codes after DOM render
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
    document.body.style.overflow = '';
}

// ═══════════════════════════════════════════════════════════
// Download ICS
// ═══════════════════════════════════════════════════════════
function evtDownloadIcs(eventId) {
    const e = (evtAllEvents || []).find(ev => ev.id === eventId);
    if (!e) return;
    const start = new Date(e.start_date);
    const end   = e.end_date ? new Date(e.end_date) : new Date(start.getTime() + 7200000);
    const fmt   = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const uid   = `${e.id}@justicemcnealllc.com`;

    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//JusticeMcNealLLC//Events//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${e.title.replace(/[,;\\]/g, '')}`,
        `DESCRIPTION:${(e.description || '').replace(/\n/g, '\\n').slice(0, 500)}`,
        `LOCATION:${(e.location_text || '').replace(/[,;\\]/g, '')}`,
        `URL:${window.location.origin}/events/?e=${e.slug}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${e.slug || 'event'}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════
// Comments / Discussion
// ═══════════════════════════════════════════════════════════
function evtTimeAgo(dateStr) {
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function evtLoadComments(eventId) {
    const list = document.getElementById('portalCommentsList');
    if (!list) return;

    let comments = null;
    try {
        const { data, error } = await supabaseClient
            .from('event_comments')
            .select('*, profile:profiles!event_comments_user_id_fkey(first_name, last_name, profile_picture_url)')
            .eq('event_id', eventId)
            .order('created_at', { ascending: true })
            .limit(100);
        if (error) throw error;
        comments = data;
    } catch (err) {
        // Table may not exist yet — hide section silently
        console.warn('Comments unavailable:', err.message || err);
        const section = document.getElementById('portalCommentsSection');
        if (section) section.style.display = 'none';
        return;
    }

    if (!comments || comments.length === 0) {
        list.innerHTML = '<p style="font-size:14px;color:#b0b0b0;text-align:center">No comments yet — be the first!</p>';
        return;
    }

    list.innerHTML = comments.map(c => {
        const name = evtEscapeHtml(`${c.profile?.first_name || ''} ${c.profile?.last_name || ''}`.trim() || 'Member');
        const avatarUrl = c.profile?.profile_picture_url;
        const initials  = ((c.profile?.first_name?.[0] || '') + (c.profile?.last_name?.[0] || '')).toUpperCase() || '?';
        const timeAgo   = evtTimeAgo(c.created_at);

        return `<div class="evt-comment">
            <div class="evt-comment-avatar">${avatarUrl ? `<img src="${avatarUrl}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : initials}</div>
            <div class="evt-comment-body">
                <span class="evt-comment-name">${name}</span><span class="evt-comment-time">${timeAgo}</span>
                <p class="evt-comment-text">${evtEscapeHtml(c.body)}</p>
            </div>
        </div>`;
    }).join('');
}

async function evtPostComment(eventId) {
    const input = document.getElementById('portalCommentInput');
    const body  = (input?.value || '').trim();
    if (!body || !eventId || !evtCurrentUser) return;

    const { error } = await supabaseClient
        .from('event_comments')
        .insert({ event_id: eventId, user_id: evtCurrentUser.id, body });

    if (error) {
        console.error('Comment error:', error);
        return;
    }
    input.value = '';
    await evtLoadComments(eventId);
}

window.evtDownloadIcs = evtDownloadIcs;
window.evtPostComment = evtPostComment;
window.evtOpenFullscreenMap = evtOpenFullscreenMap;
window.evtCloseFullscreenMap = evtCloseFullscreenMap;
