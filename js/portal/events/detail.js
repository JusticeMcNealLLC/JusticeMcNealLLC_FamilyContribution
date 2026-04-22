// ═══════════════════════════════════════════════════════════
// Portal Events — Detail Page View  (M2 refactor)
// Renders the full event detail into #eventsDetailView
// Dark-themed immersive hero → light content cards below
//
// M2 changes:
//   • Wrapped in IIFE; registers PortalEvents.detail namespace + sub-registry.
//   • Dead hero-collapse scroll code removed — page scrolls naturally.
//   • Sticky title row via CSS (no JS scroll listener).
//   • Host "⋯ More" → "Manage event" trigger (M3 will swap the dropdown for a sheet).
//   • All legacy evt* globals preserved on window for unmodified consumers.
// ═══════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── PortalEvents.detail namespace + lightweight registry ──
    window.PortalEvents = window.PortalEvents || {};
    const detail = window.PortalEvents.detail = window.PortalEvents.detail || {};
    detail._registry = detail._registry || {};
    detail.register = function (name, fn) { detail._registry[name] = fn; };
    detail.get = function (name) { return detail._registry[name]; };

// ── Lightweight inline markdown (bold, italic, links) ────
function evtMiniMarkdown(text) {
    if (!text) return '';
    let html = evtEscapeHtml(text);
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return html;
}

// ── Banner lightbox ──────────────────────────────────────
function evtOpenLightbox(imgUrl) {
    if (!imgUrl) return;
    const lb = document.createElement('div');
    lb.className = 'evt-lightbox';
    lb.innerHTML = `<button class="evt-lightbox-close" aria-label="Close"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button><img src="${imgUrl}" alt="Event banner">`;
    lb.onclick = e => { if (e.target === lb || e.target.closest('.evt-lightbox-close')) { lb.classList.remove('active'); setTimeout(() => lb.remove(), 250); } };
    document.body.appendChild(lb);
    requestAnimationFrame(() => lb.classList.add('active'));
}

// ── Section fade-in observer ─────────────────────────────
function evtInitSectionAnimations() {
    const sections = document.querySelectorAll('#eventsDetailView .ed-card');
    if (!sections.length) return;
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('ed-visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.08 });
    sections.forEach((s, i) => { s.style.animationDelay = `${i * 0.06}s`; obs.observe(s); });
}

// ── Live countdown (ticks every second when < 1 hour) ────
var _evtCountdownInterval = null;
function evtStartLiveCountdown(startDate) {
    if (_evtCountdownInterval) clearInterval(_evtCountdownInterval);
    const badgeEl = document.querySelector('#eventsDetailView .evt-status-badge');
    if (!badgeEl) return;

    function tick() {
        const ms = new Date(startDate) - new Date();
        if (ms <= 0) {
            badgeEl.className = 'evt-status-badge evt-status-live';
            badgeEl.innerHTML = '<span class="evt-status-dot pulse"></span>Live';
            clearInterval(_evtCountdownInterval);
            return;
        }
        const d = Math.floor(ms / 86400000);
        const h = Math.floor((ms % 86400000) / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        let lbl;
        if (d > 0) lbl = `${d}d ${h}h`;
        else if (h > 0) lbl = `${h}h ${m}m`;
        else lbl = `${m}m ${s}s`;
        badgeEl.innerHTML = `<span class="evt-status-dot${d === 0 ? ' pulse' : ''}"></span>${lbl}`;
    }
    const msUntil = new Date(startDate) - new Date();
    const interval = msUntil < 3600000 ? 1000 : 60000;
    _evtCountdownInterval = setInterval(tick, interval);
    if (interval === 60000) {
        const upgradeIn = msUntil - 3600000;
        if (upgradeIn > 0) {
            setTimeout(() => { clearInterval(_evtCountdownInterval); _evtCountdownInterval = setInterval(tick, 1000); }, upgradeIn);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// Render helpers — small composable blocks
// ═══════════════════════════════════════════════════════════

function _edMetaRow(icon, label, value, extra) {
    return `<div class="ed-meta-row">
        <div class="ed-meta-icon">${icon}</div>
        <div class="ed-meta-text">
            <span class="ed-meta-label">${label}</span>
            <span class="ed-meta-value">${value}</span>
            ${extra || ''}
        </div>
    </div>`;
}

function _edPill(text, cls) {
    return `<span class="ed-pill ${cls || ''}">${text}</span>`;
}

function _edCard(content, extraCls) {
    return `<div class="ed-card ${extraCls || ''}">${content}</div>`;
}

function _edNotice(emoji, title, sub) {
    return `<div class="ed-notice">
        <span class="ed-notice-emoji">${emoji}</span>
        <div><p class="ed-notice-title">${title}</p><p class="ed-notice-sub">${sub}</p></div>
    </div>`;
}

function _edSectionHead(title) {
    return `<div class="ed-section-head"><h3>${title}</h3></div>`;
}

// ═══════════════════════════════════════════════════════════
// Main render — evtOpenDetail
// ═══════════════════════════════════════════════════════════

async function evtOpenDetail(eventId) {
    const event = evtAllEvents.find(e => e.id === eventId);
    if (!event) return;

    const rsvp = evtAllRsvps[eventId];
    const start = new Date(event.start_date);
    const end = event.end_date ? new Date(event.end_date) : null;
    const dateStr = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const endTimeStr = end ? end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
    const tc = TYPE_COLORS[event.event_type] || TYPE_COLORS.member;
    const isLlc = event.event_type === 'llc';
    const isComp = event.event_type === 'competition';

    // ── Data fetching (unchanged business logic) ────────
    const { data: rsvps } = await supabaseClient
        .from('event_rsvps')
        .select('user_id, status, profiles!event_rsvps_user_id_fkey(id, first_name, last_name, profile_picture_url)')
        .eq('event_id', eventId);
    const goingList = (rsvps || []).filter(r => r.status === 'going');
    const maybeList = (rsvps || []).filter(r => r.status === 'maybe');
    const notGoingList = (rsvps || []).filter(r => r.status === 'not_going');

    const { data: checkins, count: checkinCount } = await supabaseClient
        .from('event_checkins')
        .select('user_id, profiles!event_checkins_user_id_fkey(first_name, last_name, profile_picture_url)', { count: 'exact' })
        .eq('event_id', eventId);

    let costItems = [];
    if (isLlc) {
        const { data: ci } = await supabaseClient
            .from('event_cost_items')
            .select('*')
            .eq('event_id', eventId)
            .order('sort_order', { ascending: true });
        costItems = ci || [];
    }

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

    const isCreator = event.created_by === evtCurrentUser.id;
    const { data: hostRecord } = await supabaseClient
        .from('event_hosts')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', evtCurrentUser.id)
        .maybeSingle();
    const isHost = isCreator || !!hostRecord || evtCurrentUserRole === 'admin';

    let creatorProfile = null;
    if (event.created_by) {
        const { data: cp } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name, profile_picture_url, displayed_badge, title, bio')
            .eq('id', event.created_by)
            .single();
        creatorProfile = cp;
    }
    const cpName = creatorProfile ? ([creatorProfile.first_name, creatorProfile.last_name].filter(Boolean).join(' ') || 'Member') : '';
    const cpInitials = creatorProfile ? ((creatorProfile.first_name || '?')[0] + (creatorProfile.last_name || '')[0]).toUpperCase() : '';
    const cpBadge = creatorProfile ? evtBadgeChip(creatorProfile.displayed_badge) : '';
    const cpTitle = creatorProfile ? (creatorProfile.title || 'Member') : '';

    const hasRsvp = rsvp && (rsvp.status === 'going' || rsvp.status === 'maybe');
    const documentsHtml = await evtBuildDocumentsHtml(event, isHost, hasRsvp);
    const mapHtml = evtBuildMapHtml(event, hasRsvp, isHost);
    const competitionHtml = isComp ? await evtBuildCompetitionHtml(event, isHost) : '';
    const scrapbookHtml = await evtBuildScrapbookHtml(event, !!hasRsvp);

    const showTime = !event.gate_time || hasRsvp || isHost;
    const showLocation = !event.gate_location || hasRsvp || isHost;
    const showNotes = !event.gate_notes || hasRsvp || isHost;

    // ── Time-based locks ────────────────────────────────
    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast   = new Date(event.start_date) < new Date() && event.status !== 'active';
    const deadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();
    const entriesClosed = isClosed || isPast || deadlinePassed;
    const rsvpEnabled = event.rsvp_enabled !== false;
    const canRsvp = rsvpEnabled && ['open', 'confirmed', 'active'].includes(event.status) && !entriesClosed;
    const eventIsFull = isLlc && event.max_participants && goingList.length >= event.max_participants;

    // ═══════════════════════════════════════════════════════
    // Build visual sections
    // ═══════════════════════════════════════════════════════

    // ── Hero status badge ────────────────────────────────
    let badgeLabel = '', badgeCls = '', dotPulse = false;
    if (event.status === 'cancelled') { badgeLabel = 'Cancelled'; badgeCls = 'evt-status-cancelled'; }
    else if (event.status === 'completed' || isPast) { badgeLabel = 'Ended'; badgeCls = 'evt-status-ended'; }
    else if (event.status === 'active') { badgeLabel = 'Live'; badgeCls = 'evt-status-live'; dotPulse = true; }
    else {
        const msUntil = new Date(event.start_date) - new Date();
        const d = Math.floor(msUntil / 86400000);
        const h = Math.floor((msUntil % 86400000) / 3600000);
        const m = Math.floor((msUntil % 3600000) / 60000);
        if (d > 0) badgeLabel = `${d}d ${h}h`; else if (h > 0) badgeLabel = `${h}h ${m}m`; else badgeLabel = `${m}m`;
        badgeCls = 'evt-status-soon'; dotPulse = d === 0;
    }

    // ── Banner bg ────────────────────────────────────────
    const bannerBg = event.banner_url
        ? `background-image:url('${event.banner_url}');background-size:cover;background-position:center;`
        : `background:linear-gradient(135deg, #312e81 0%, #6d28d9 50%, #a855f7 100%);`;

    // ── Transportation notice ────────────────────────────
    let transportHtml = '';
    if (isLlc && event.transportation_enabled !== false && event.transportation_mode) {
        const isProvided = event.transportation_mode === 'llc_provides';
        transportHtml = _edNotice(
            isProvided ? '✈️' : '🧳',
            isProvided ? 'LLC Provides Transportation' : 'Self-Arranged Transportation',
            isProvided ? 'Tickets will be uploaded to your documents' : `Members book their own travel${event.transportation_estimate_cents ? ` — est. ~${formatCurrency(event.transportation_estimate_cents)}` : ''}`
        );
    }

    // ── Location-required badge ──────────────────────────
    let locationReqHtml = '';
    if (isLlc && event.location_required) {
        locationReqHtml = _edNotice('📍', 'Location sharing required', "You'll need to enable location sharing at check-in");
    }

    // ── QR Code for attendee ticket ──────────────────────
    let qrHtml = '';
    let myCheckin = null;
    const checkinEnabled = event.checkin_enabled !== false;
    if (checkinEnabled && rsvp && rsvp.status === 'going' && event.checkin_mode === 'attendee_ticket') {
        const { data: ci } = await supabaseClient
            .from('event_checkins')
            .select('checked_in_at')
            .eq('event_id', eventId)
            .eq('user_id', evtCurrentUser.id)
            .maybeSingle();
        myCheckin = ci;
        const checkedInTime = myCheckin ? new Date(myCheckin.checked_in_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
        const checkedInDate = myCheckin ? new Date(myCheckin.checked_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

        qrHtml = `
            <div class="ed-qr-wrap">
                <div class="ed-qr-header">${myCheckin ? '✅ Checked In' : '🎫 Your Event Ticket'}</div>
                <div style="position:relative;display:inline-block">
                    <canvas id="myTicketQR" style="display:block;margin:0 auto;border-radius:12px;${myCheckin ? 'opacity:.25' : ''}"></canvas>
                    ${myCheckin ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
                        <div style="width:56px;height:56px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(16,185,129,.4)">
                            <svg style="width:28px;height:28px;color:#fff" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                        </div>
                    </div>` : ''}
                </div>
                <p class="ed-qr-hint">${myCheckin ? `Scanned at ${checkedInTime} · ${checkedInDate}` : 'Show this QR code at check-in'}</p>
            </div>`;
    }

    // ── Venue QR (host) ──────────────────────────────────
    let venueQrHtml = '';
    if (checkinEnabled && isHost && event.checkin_mode === 'venue_scan' && event.venue_qr_token) {
        venueQrHtml = `
            <div class="ed-qr-wrap">
                <div class="ed-qr-header">📍 Venue QR Code</div>
                <canvas id="venueQR" style="display:block;margin:0 auto;border-radius:12px"></canvas>
                <p class="ed-qr-hint">Display this at the entrance for attendees to scan</p>
            </div>`;
    }

    // ── Scanner button ───────────────────────────────────
    let scannerBtn = '';
    if (checkinEnabled && isHost && event.checkin_mode === 'attendee_ticket' && ['open', 'confirmed', 'active'].includes(event.status)) {
        scannerBtn = `<button onclick="evtOpenScanner('${eventId}')" class="ed-action-btn"><svg style="width:18px;height:18px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>Scan Attendee QR</button>`;
    }

    // ── Cost Breakdown (LLC) ─────────────────────────────
    let costBreakdownHtml = '';
    const showBreakdownToAttendees = event.show_cost_breakdown !== false;
    if (isLlc && costItems.length > 0 && (showBreakdownToAttendees || isHost)) {
        const CATEGORY_ICONS = { lodging: '🏠', transportation: '🚗', food: '🍕', gear: '🎿', entertainment: '🎭', other: '📦' };
        const included = costItems.filter(i => i.included_in_buyin);
        const oop = costItems.filter(i => !i.included_in_buyin);
        const totalIncluded = included.reduce((s, i) => s + (i.total_cost_cents || 0), 0);
        const totalOop = oop.reduce((s, i) => s + (i.avg_per_person_cents || 0), 0);
        const minP = event.min_participants || event.max_participants || 0;
        const baseBuyIn = minP > 0 ? Math.ceil(totalIncluded / minP) : 0;
        const llcCut = Math.round(baseBuyIn * (event.llc_cut_pct || 0) / 100);
        const finalBuyIn = baseBuyIn + llcCut;
        const lockedLabel = event.cost_breakdown_locked ? ` ${_edPill('🔒 Locked', 'ed-pill-muted')}` : '';
        const hostOnlyLabel = !showBreakdownToAttendees ? ` ${_edPill('Host Only', 'ed-pill-muted')}` : '';

        const itemRows = costItems.map(i => `
            <div class="ed-cost-item">
                <div class="ed-cost-item-left"><span class="ed-cost-item-icon">${CATEGORY_ICONS[i.category] || '📦'}</span><span>${evtEscapeHtml(i.name)}</span></div>
                <div class="ed-cost-item-right">
                    ${i.included_in_buyin
                        ? `<span class="ed-cost-item-amount">${formatCurrency(i.total_cost_cents)}</span>${_edPill('INCLUDED', 'ed-pill-green')}`
                        : `<span class="ed-cost-item-amount" style="color:#8b8b8b">~${formatCurrency(i.avg_per_person_cents)}/pp</span>${_edPill('OOP', 'ed-pill-muted')}`}
                </div>
            </div>`).join('');

        costBreakdownHtml = `
            ${_edSectionHead(`Cost Breakdown${lockedLabel}${hostOnlyLabel}`)}
            <div class="ed-cost-list">${itemRows}</div>
            <div class="ed-cost-summary">
                <div class="ed-cost-line"><span>Total Included</span><span>${formatCurrency(totalIncluded)}</span></div>
                <div class="ed-cost-line"><span>Min Participants</span><span>${minP}</span></div>
                <div class="ed-cost-divider"></div>
                <div class="ed-cost-line ed-cost-line-bold"><span>💡 Suggested Buy-In</span><span>${formatCurrency(finalBuyIn)}/person</span></div>
                <div class="ed-cost-line ed-cost-line-bold"><span>💳 Actual RSVP</span><span>${formatCurrency(event.rsvp_cost_cents)}/person</span></div>
                ${event.llc_cut_pct > 0 ? `<div class="ed-cost-line ed-cost-line-muted"><span>Includes ${event.llc_cut_pct}% LLC contribution</span><span>+${formatCurrency(llcCut)}</span></div>` : ''}
                <div class="ed-cost-line"><span>✈ Est. Out-of-Pocket</span><span>~${formatCurrency(totalOop)}/person</span></div>
                <div class="ed-cost-divider thick"></div>
                <div class="ed-cost-line ed-cost-total"><span>💰 Est. Total/Person</span><span>~${formatCurrency((event.rsvp_cost_cents || finalBuyIn) + totalOop)}</span></div>
            </div>`;
    }

    // ── Threshold / Social Proof (LLC) ───────────────────
    let thresholdHtml = '';
    if (isLlc && event.min_participants) {
        const currentGoing = goingList.length;
        const minNeeded = event.min_participants;
        const pct = Math.min(100, Math.round((currentGoing / minNeeded) * 100));
        const isMet = currentGoing >= minNeeded;
        const deadlineStr = event.rsvp_deadline ? new Date(event.rsvp_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';
        const socialThreshold = Math.min(Math.floor(minNeeded * 0.5), 3);
        const showExactCount = currentGoing >= socialThreshold;

        if (isHost) {
            thresholdHtml = `
            <div class="ed-threshold">
                <div class="ed-threshold-header">
                    <span class="ed-threshold-label">${isMet ? '✅ Minimum Met!' : '⚠️ Minimum Threshold'}</span>
                    <span class="ed-threshold-count">${currentGoing} / ${minNeeded} by ${deadlineStr}</span>
                </div>
                <div class="ed-progress"><div class="ed-progress-fill${isMet ? ' met' : ''}" style="width:${pct}%"></div></div>
                ${!isMet ? `<p class="ed-threshold-note">If ${minNeeded - currentGoing} more spot${minNeeded - currentGoing > 1 ? 's aren\'t' : ' isn\'t'} filled by the deadline, the event auto-cancels and all RSVPs are refunded.</p>` : ''}
            </div>`;
        } else {
            let socialText = '';
            if (isMet) socialText = `<span class="ed-social-confirmed">✅ Event confirmed!</span> <span class="ed-social-count">${currentGoing} going${event.max_participants ? ' · ' + (event.max_participants - currentGoing) + ' spots left' : ''}</span>`;
            else if (showExactCount) socialText = `<span class="ed-social-confirmed">${currentGoing} going</span> <span class="ed-social-count">· spots remaining</span>`;
            else socialText = `<span class="ed-social-confirmed">Spots available — be one of the first to RSVP!</span>`;
            thresholdHtml = `
            <div class="ed-threshold">
                <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
                    <div>${socialText}</div>
                    ${event.rsvp_deadline ? `<span class="ed-threshold-deadline">RSVP by ${deadlineStr}</span>` : ''}
                </div>
            </div>`;
        }
    }

    // ── Waitlist (LLC) ───────────────────────────────────
    let waitlistHtml = '';
    if (isLlc && event.max_participants) {
        const isFull = goingList.length >= event.max_participants;
        const canRsvpWl = ['open', 'confirmed', 'active'].includes(event.status);
        const activeWaitlist = waitlist.filter(w => ['waiting', 'offered'].includes(w.status));
        if (isFull && canRsvpWl) {
            const hasOffer = myWaitlistEntry?.status === 'offered' && myWaitlistEntry.offer_expires_at && new Date(myWaitlistEntry.offer_expires_at) > new Date();
            const isWaiting = myWaitlistEntry?.status === 'waiting';
            let waitlistAction = '';
            if (hasOffer) {
                const expiresStr = new Date(myWaitlistEntry.offer_expires_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                waitlistAction = `
                    <div class="ed-notice ed-notice-highlight">
                        <span class="ed-notice-emoji">🎉</span>
                        <div style="flex:1">
                            <p class="ed-notice-title">A spot opened up for you!</p>
                            <p class="ed-notice-sub">Complete your RSVP by ${expiresStr}</p>
                            <button onclick="evtClaimWaitlistSpot('${eventId}')" class="ed-primary-btn" style="margin-top:10px">Claim Spot — ${formatCurrency(event.rsvp_cost_cents)}</button>
                        </div>
                    </div>`;
            } else if (isWaiting) {
                const pos = activeWaitlist.findIndex(w => w.user_id === evtCurrentUser.id) + 1;
                waitlistAction = `
                    <div class="ed-notice" style="justify-content:space-between">
                        <div><p class="ed-notice-title">You're #${pos} on the waitlist</p><p class="ed-notice-sub">We'll notify you if a spot opens</p></div>
                        <button onclick="evtLeaveWaitlist('${eventId}')" class="ed-link-btn danger">Leave</button>
                    </div>`;
            } else if (!rsvp?.paid) {
                waitlistAction = `<button onclick="evtJoinWaitlist('${eventId}')" class="ed-action-btn">Join Waitlist</button>
                    <p class="ed-hint">No payment required to join the waitlist</p>`;
            }
            waitlistHtml = `${_edSectionHead('Waitlist')}<p class="ed-sub-count">${activeWaitlist.length} waiting</p>${waitlistAction}`;
        }
    }

    // ── Grace Window ─────────────────────────────────────
    let graceHtml = '';
    if (event.rescheduled_at && event.grace_window_end && new Date(event.grace_window_end) > new Date()) {
        const graceEnd = new Date(event.grace_window_end).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        graceHtml = `<div class="ed-notice ed-notice-warn">
            <span class="ed-notice-emoji">📅</span>
            <div>
                <p class="ed-notice-title">This event was rescheduled</p>
                <p class="ed-notice-sub">Request a full refund until <strong>${graceEnd}</strong> if the new date doesn't work.</p>
                ${rsvp?.paid ? `<button onclick="evtRequestGraceRefund('${eventId}')" class="ed-link-btn danger" style="margin-top:8px">Request Full Refund</button>` : ''}
            </div>
        </div>`;
    }

    // ── RSVP Buttons ─────────────────────────────────────
    let rsvpButtons = '';
    if (!rsvpEnabled) {
        rsvpButtons = _edNotice('ℹ️', 'Informational Event', 'RSVP is not required for this event');
    } else if (isHost) {
        rsvpButtons = _edNotice('🎯', "You're Hosting This Event", "You're automatically counted as attending");
    } else if (canRsvp && !eventIsFull && event.pricing_mode === 'paid') {
        if (rsvp?.paid) {
            rsvpButtons = _edNotice('✅', 'RSVP Confirmed &amp; Paid', 'Non-refundable · Contact admin for changes');
        } else {
            rsvpButtons = `<button onclick="evtHandleRsvp('${eventId}','going')" class="ed-primary-btn">RSVP — ${formatCurrency(event.rsvp_cost_cents)}</button>
                <p class="ed-hint">Non-refundable unless cancelled by staff${event.raffle_enabled ? ' · Includes raffle entry' : ''}</p>`;
        }
    } else if (canRsvp && !eventIsFull) {
        const goingActive = rsvp?.status === 'going' ? ' active' : '';
        const interestedActive = rsvp?.status === 'maybe' ? ' active' : '';
        rsvpButtons = `<div class="ed-rsvp-grid">
            <button onclick="evtHandleRsvp('${eventId}','going')" class="ed-rsvp-opt${goingActive}"><span class="ed-rsvp-emoji">✅</span>Going</button>
            <button onclick="evtHandleRsvp('${eventId}','maybe')" class="ed-rsvp-opt ed-rsvp-interested${interestedActive}"><span class="ed-rsvp-emoji">❤️</span>Interested</button>
        </div>`;
    }
    // RSVP closed state
    if (rsvpEnabled && !isHost && entriesClosed && !rsvpButtons) {
        let closedReason = '';
        if (isClosed) closedReason = event.status === 'cancelled' ? 'Event cancelled' : 'Event ended';
        else if (isPast) closedReason = 'Event has already started';
        else if (deadlinePassed) closedReason = 'RSVP deadline passed';
        if (rsvp) {
            const statusEmoji = rsvp.status === 'going' ? '✅' : rsvp.status === 'maybe' ? '❤️' : '❌';
            const statusLabel = rsvp.status === 'going' ? 'Going' : rsvp.status === 'maybe' ? 'Interested' : 'Not Going';
            rsvpButtons = _edNotice(statusEmoji, `Your RSVP: ${statusLabel}`, closedReason);
        } else {
            rsvpButtons = _edNotice('🔒', 'RSVP Closed', closedReason);
        }
    }

    // ── Raffle Section ───────────────────────────────────
    let raffleHtml = '';
    if (event.raffle_enabled) {
        const prizes = event.raffle_prizes || [];
        const ordinal = n => n===1?'1st':n===2?'2nd':n===3?'3rd':`${n}th`;
        const prizesHtml = prizes.map((p, i) => {
            const place = p.place || i + 1;
            return `<div class="ed-prize-row"><div class="ed-prize-rank">${place}</div><div><span class="ed-prize-place">${ordinal(place)} Place</span><span class="ed-prize-label">${evtEscapeHtml(p.label || p.description || p)}</span></div></div>`;
        }).join('');

        let entryStatusHtml = '';
        if (myRaffleEntry) {
            entryStatusHtml = _edNotice('🎟️', "You're entered!", 'Good luck in the drawing');
        } else if (entriesClosed && !myRaffleEntry) {
            let lockedReason = '';
            if (isClosed) lockedReason = event.status === 'cancelled' ? 'Event cancelled' : 'Event ended';
            else if (isPast) lockedReason = 'Event in progress';
            else if (deadlinePassed) lockedReason = 'RSVP deadline passed';
            entryStatusHtml = `<div class="ed-notice"><span class="ed-notice-emoji">🔒</span><div><p class="ed-notice-title">Entries Closed</p><p class="ed-notice-sub">${lockedReason}</p></div></div>`;
        } else if (event.pricing_mode !== 'paid' && event.raffle_entry_cost_cents > 0 && !entriesClosed) {
            entryStatusHtml = `<button onclick="evtHandleRaffleEntry('${eventId}')" class="ed-raffle-btn">🎟️ Buy Raffle Entry — ${formatCurrency(event.raffle_entry_cost_cents)}</button><p class="ed-hint">Non-refundable raffle ticket</p>`;
        } else if (event.pricing_mode !== 'paid' && (!event.raffle_entry_cost_cents || event.raffle_entry_cost_cents === 0) && !entriesClosed) {
            entryStatusHtml = `<button onclick="evtHandleFreeRaffleEntry('${eventId}')" class="ed-raffle-btn">🎟️ Enter Raffle — Free</button>`;
        } else if (event.pricing_mode === 'paid' && !rsvp?.paid) {
            entryStatusHtml = `<p class="ed-hint" style="font-style:italic">Raffle entry included with paid RSVP</p>`;
        }

        let winnersHtml = '';
        if (raffleWinners.length > 0) {
            winnersHtml = `<div class="ed-winners">${_edSectionHead('Winners')}${raffleWinners.map(w => {
                const name = w.profiles ? `${w.profiles.first_name || ''} ${w.profiles.last_name || ''}`.trim() : (w.guest_token ? 'Guest' : 'Unknown');
                return `<div class="ed-winner-row"><div class="ed-prize-rank">${w.place}</div><span class="ed-winner-name">${evtEscapeHtml(name)}</span>${w.prize_description ? `<span class="ed-winner-prize">— ${evtEscapeHtml(w.prize_description)}</span>` : ''}</div>`;
            }).join('')}</div>`;
        }

        let drawBtnHtml = '';
        if (isHost && !entriesClosed && raffleWinners.length === 0) {
            drawBtnHtml = `<button onclick="evtOpenRaffleDraw('${eventId}')" class="ed-action-btn" style="margin-top:12px">🎰 Draw Raffle Winners</button>`;
        }

        const rafflePills = [
            event.raffle_type ? _edPill(`${event.raffle_type === 'digital' ? '💻 Digital' : '🎁 Physical'} Prize`) : '',
            event.raffle_draw_trigger ? _edPill(`${event.raffle_draw_trigger === 'auto' ? '⚡ Auto' : '🎰 Manual'} Draw`) : '',
            event.pricing_mode !== 'paid' && event.raffle_entry_cost_cents > 0 ? _edPill(`🎟️ Entry: ${formatCurrency(event.raffle_entry_cost_cents)}`) : '',
            event.pricing_mode === 'paid' ? _edPill('✅ Included with RSVP') : '',
        ].filter(Boolean).join('');

        raffleHtml = `
            ${_edSectionHead('Raffle')}
            <div class="ed-pill-row">${rafflePills}</div>
            <p class="ed-sub-count">${raffleEntryCount} ${raffleEntryCount === 1 ? 'entry' : 'entries'}</p>
            ${prizes.length > 0 ? `<div class="ed-prizes">${_edSectionHead('Prizes')}${prizesHtml}</div>` : `<p class="ed-hint" style="font-style:italic">Prizes to be announced</p>`}
            <div style="margin-top:16px">${entryStatusHtml}</div>
            ${winnersHtml}${drawBtnHtml}`;
    }

    // ── Helper: avatar + name row ────────────────────────
    function buildPersonRow(p) {
        const initials = ((p?.first_name?.[0] || '') + (p?.last_name?.[0] || '')).toUpperCase() || '?';
        const avatar = p?.profile_picture_url
            ? `<img src="${p.profile_picture_url}" class="w-7 h-7 rounded-full object-cover" alt="">`
            : `<div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">${initials}</div>`;
        return `<div class="flex items-center gap-2">${avatar}<span class="text-sm text-gray-700">${evtEscapeHtml(p?.first_name || '')} ${evtEscapeHtml(p?.last_name || '')}</span></div>`;
    }

    // ── Attendee Breakdown (host) ────────────────────────
    let attendeeBreakdownHtml = '';
    if (isHost) {
        const checkinUserIds = new Set((checkins || []).map(c => c.user_id));

        function buildSection(emoji, label, list, color) {
            if (!list.length) return `<p class="text-xs text-gray-400 italic ml-6">None</p>`;
            return list.map(r => buildPersonRow(r.profiles)).join('');
        }

        const checkinRows = (checkins || []).map(c => buildPersonRow(c.profiles)).join('') || `<p class="text-xs text-gray-400 italic ml-6">None</p>`;

        attendeeBreakdownHtml = `
            <div>
                ${_edSectionHead('Attendee Breakdown')}
                <div class="mb-3">
                    <div class="flex items-center gap-2 mb-1.5"><span class="text-sm">✅</span><span class="text-xs font-bold text-emerald-700 uppercase tracking-wide">Going (${goingList.length})</span></div>
                    <div class="space-y-1.5 ml-6">${goingList.length ? goingList.map(r => buildPersonRow(r.profiles)).join('') : '<p class="text-xs text-gray-400 italic">None</p>'}</div>
                </div>
                <div class="mb-3">
                    <div class="flex items-center gap-2 mb-1.5"><span class="text-sm">❤️</span><span class="text-xs font-bold text-pink-700 uppercase tracking-wide">Interested (${maybeList.length})</span></div>
                    <div class="space-y-1.5 ml-6">${maybeList.length ? maybeList.map(r => buildPersonRow(r.profiles)).join('') : '<p class="text-xs text-gray-400 italic">None</p>'}</div>
                </div>
                <div>
                    <div class="flex items-center gap-2 mb-1.5"><span class="text-sm">📍</span><span class="text-xs font-bold text-violet-700 uppercase tracking-wide">Checked In (${checkinCount || 0})</span></div>
                    <div class="space-y-1.5 ml-6">${checkinRows}</div>
                </div>
            </div>`;
    }

    // ── Host Controls ────────────────────────────────────
    let hostControlsHtml = '';
    if (isHost) {
        let primaryBtn = '';
        let dropdownItems = '';
        if (event.status === 'draft') primaryBtn = `<button onclick="evtUpdateStatus('${eventId}','open')" class="evt-host-btn primary">Publish Event</button>`;
        if (['open', 'confirmed', 'active'].includes(event.status)) {
            if (!primaryBtn) primaryBtn = `<button onclick="evtUpdateStatus('${eventId}','completed')" class="evt-host-btn primary">Mark Completed</button>`;
            else dropdownItems += `<button onclick="evtUpdateStatus('${eventId}','completed')">✓ Mark Completed</button>`;
            dropdownItems += `<button onclick="evtCancelEvent('${eventId}')" class="danger">✕ Cancel Event</button>`;
            if (isLlc) dropdownItems += `<button onclick="evtRescheduleEvent('${eventId}')">📅 Reschedule</button>`;
        }
        dropdownItems += `<button onclick="evtDuplicateEvent('${eventId}')">📋 Duplicate Event</button>`;
        if (evtCurrentUserRole === 'admin') dropdownItems += `<button onclick="evtDeleteEvent('${eventId}')" class="danger">🗑 Delete Event</button>`;
        // M2: "⋯ More" relabeled to "Manage event" — placeholder entry point. M3 swaps the dropdown
        // for the full Event Management Sheet (Overview / RSVPs / Money / Docs / Raffle / Comp / Danger).
        hostControlsHtml = `
            ${_edSectionHead('Host Controls')}
            <div class="evt-host-primary">${primaryBtn}<div class="evt-host-more-wrap"><button class="evt-host-more-btn" onclick="this.nextElementSibling.classList.toggle('open')" aria-label="Manage event"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;display:inline-block;vertical-align:-3px;margin-right:6px"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>Manage event</button><div class="evt-host-dropdown">${dropdownItems}</div></div></div>`;
    }

    // ── Attendee Preview (visible to all) ────────────────
    let attendeePreviewHtml = '';
    if (goingList.length > 0 || maybeList.length > 0) {
        const displayList = goingList.slice(0, 6);
        const avatarHtml = displayList.map(r => {
            const p = r.profiles;
            const link = p?.id ? `onclick="window.location.href='profile.html?id=${p.id}'"` : '';
            const cursor = p?.id ? 'cursor:pointer' : '';
            if (p?.profile_picture_url) return `<div class="ed-avatar" ${link} style="${cursor}" title="${evtEscapeHtml((p?.first_name || '') + ' ' + (p?.last_name || ''))}" role="button" aria-label="View profile"><img src="${p.profile_picture_url}" alt=""></div>`;
            const ini = ((p?.first_name?.[0] || '') + (p?.last_name?.[0] || '')).toUpperCase() || '?';
            return `<div class="ed-avatar" ${link} style="${cursor}" title="${evtEscapeHtml((p?.first_name || '') + ' ' + (p?.last_name || ''))}" role="button" aria-label="View profile"><span>${ini}</span></div>`;
        }).join('');
        const moreCount = goingList.length - displayList.length;
        const moreHtml = moreCount > 0 ? `<div class="ed-avatar-overflow">+${moreCount}</div>` : '';
        const countText = `${goingList.length} going${maybeList.length ? ` · ${maybeList.length} interested` : ''}`;
        attendeePreviewHtml = `<div class="ed-attendee-row"><div class="ed-avatar-stack">${avatarHtml}${moreHtml}</div><span class="ed-attendee-count">${countText}</span></div>`;
    }

    // ── Description ──────────────────────────────────────
    const rawDesc = event.description || '';
    const descHtml = rawDesc ? evtMiniMarkdown(rawDesc) : '<span class="ed-no-desc">No details yet — check back closer to the event.</span>';
    const descIsLong = rawDesc.length > 500;

    // ── Organizer row ────────────────────────────────────
    let organizerHtml = '';
    if (!isLlc && creatorProfile) {
        const avatarImg = creatorProfile.profile_picture_url
            ? `<img src="${creatorProfile.profile_picture_url}" class="ed-org-avatar" alt="${evtEscapeHtml(cpName)}">`
            : `<div class="ed-org-avatar ed-org-avatar-fallback">${cpInitials}</div>`;
        const avatarEl = cpBadge
            ? `<div style="position:relative;flex-shrink:0">${avatarImg}<div style="position:absolute;bottom:-2px;right:-2px;transform:scale(.65);transform-origin:bottom right">${cpBadge}</div></div>`
            : avatarImg;
        organizerHtml = `<a href="profile.html?id=${creatorProfile.id}" class="ed-org-link">${avatarEl}<div><span class="ed-org-name">${evtEscapeHtml(cpName)}</span><span class="ed-org-title">${evtEscapeHtml(cpTitle || 'Member')} · Organizer</span></div></a>`;
    }

    // ── Related Events ───────────────────────────────────
    let relatedHtml = '';
    if (typeof evtAllEvents !== 'undefined' && evtAllEvents.length > 1) {
        const now = new Date();
        const upcoming = evtAllEvents.filter(e => e.id !== eventId && new Date(e.start_date) > now && ['open','confirmed'].includes(e.status)).sort((a, b) => new Date(a.start_date) - new Date(b.start_date)).slice(0, 4);
        if (upcoming.length > 0) {
            const cards = upcoming.map(e => {
                const d = new Date(e.start_date);
                const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const imgHtml = e.banner_url ? `<img src="${e.banner_url}" alt="" loading="lazy">` : `<div style="height:120px;background:linear-gradient(135deg,#6366f1,#8b5cf6)"></div>`;
                const onclickHandler = e.slug ? `evtNavigateToEvent('${e.slug}')` : `evtOpenDetail('${e.id}')`;
                return `<div class="evt-related-card" onclick="${onclickHandler}">${imgHtml}<div class="evt-related-card-body"><p class="evt-related-card-title">${evtEscapeHtml(e.title)}</p><p class="evt-related-card-meta">${dateLabel}${e.location_nickname ? ' · ' + evtEscapeHtml(e.location_nickname) : ''}</p></div></div>`;
            }).join('');
            relatedHtml = `${_edSectionHead('More Events')}<div class="evt-related-scroll">${cards}</div>`;
        }
    }

    // ── Collapsible cost wrapper ─────────────────────────
    if (costBreakdownHtml && event.rsvp_cost_cents) {
        costBreakdownHtml = `
            <div class="evt-cost-toggle" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('open')" role="button" aria-expanded="false" aria-label="Toggle cost breakdown">
                <div><span class="evt-cost-toggle-label">Cost Breakdown</span></div>
                <div style="display:flex;align-items:center;gap:8px"><span class="evt-cost-toggle-price">${formatCurrency(event.rsvp_cost_cents)}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg></div>
            </div>
            <div class="evt-cost-details">${costBreakdownHtml}</div>`;
    }

    // ═══════════════════════════════════════════════════════
    // Final HTML assembly — new card-based layout
    // ═══════════════════════════════════════════════════════

    document.getElementById('eventsDetailView').innerHTML = `
        <!-- ─── Immersive Hero ─── -->
        <div class="ed-hero" style="${bannerBg}" ${event.banner_url ? `onclick="evtOpenLightbox('${event.banner_url}')"` : ''} role="img" aria-label="Event banner">
            <div class="ed-hero-scrim"></div>
            <div class="ed-hero-nav">
                <button onclick="event.stopPropagation();evtNavigateToList()" class="ed-hero-pill evt-hero-back-btn" title="Back" aria-label="Back to events">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <div class="ed-hero-pill-row">
                    <span class="evt-status-badge ${badgeCls}"><span class="evt-status-dot${dotPulse ? ' pulse' : ''}"></span>${badgeLabel}</span>
                    <button onclick="event.stopPropagation();evtCopyShareUrl('${event.slug}')" class="ed-hero-pill" title="Share" aria-label="Share event">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                    </button>
                </div>
            </div>
            <div class="ed-hero-bottom-content">
                <div class="ed-hero-pills">
                    ${event.category ? `<span class="ed-hero-tag">${CATEGORY_EMOJI[event.category] || '📌'} ${(event.category || '').replace(/_/g,' ')}</span>` : ''}
                    <span class="ed-hero-tag ed-hero-tag-type" style="background:${tc.bg.includes('bg-') ? 'rgba(255,255,255,.2)' : tc.bg};color:${tc.text.includes('text-') ? '#fff' : tc.text}">${tc.label}</span>
                </div>
            </div>
        </div>

        <!-- ─── Content Area ─── -->
        <div class="ed-content">
            <!-- Title + Meta Card -->
            <div class="ed-card ed-card-title">
                <h1 class="ed-title">${evtEscapeHtml(event.title)}</h1>

                <div class="ed-meta-grid">
                    ${_edMetaRow(`<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>`,
                        dateStr,
                        showTime ? timeStr + (endTimeStr ? ` — ${endTimeStr}` : '') : '<span class="ed-gated">🔒 RSVP to see time</span>',
                        `<span class="ed-ics-link" onclick="event.stopPropagation();evtDownloadIcs('${eventId}')">+ Add to calendar</span>`
                    )}
                    ${event.location_nickname || event.location_text ? _edMetaRow(`<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z"/></svg>`,
                        showLocation ? evtEscapeHtml(event.location_nickname || '') : '<span class="ed-gated">🔒 RSVP to see location</span>',
                        showLocation && event.location_text ? evtEscapeHtml(event.location_text) : ''
                    ) : ''}
                </div>

                ${deadlinePassed && !isClosed && !isPast ? '<div class="ed-deadline-banner">🔒 RSVP deadline passed</div>' : ''}

                ${organizerHtml ? `<hr class="ed-divider" style="margin:20px 0 16px">` : ''}
                ${organizerHtml}
                <div class="ed-desc${descIsLong ? ' ed-desc-collapsed' : ''}" style="margin-top:14px" id="evtDescWrap">${descHtml}</div>
                ${descIsLong ? '<button class="ed-read-more" onclick="document.getElementById(\'evtDescWrap\').classList.remove(\'ed-desc-collapsed\');this.remove()">Read more</button>' : ''}
            </div>

            <!-- Map Card -->
            ${showLocation && event.location_lat && event.location_lng ? `
            <div class="ed-card ed-card-map">
                <div class="ed-map-wrap">
                    <div id="detailEventMap" class="ed-map" onclick="evtOpenFullscreenMap(${event.location_lat}, ${event.location_lng}, '${evtEscapeHtml(event.location_text || '').replace(/'/g, "\\'")}')"></div>
                    ${event.location_nickname ? `<div class="ed-map-label">${evtEscapeHtml(event.location_nickname)}</div>` : ''}
                </div>
                <a href="${/iPad|iPhone|iPod/.test(navigator.userAgent) ? 'https://maps.apple.com/?daddr=' : 'https://www.google.com/maps/dir/?api=1&destination='}${encodeURIComponent(event.location_text)}" target="_blank" rel="noopener" class="ed-directions-link">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Get Directions
                </a>
            </div>` : ''}

            <!-- Gated Notes Card -->
            ${showNotes && event.gated_notes ? `<div class="ed-card">${_edSectionHead('Attendee Details')}<p class="ed-body-text whitespace-pre-line">${evtEscapeHtml(event.gated_notes)}</p></div>` : ''}

            <!-- Interested / Attendees Card -->
            ${attendeePreviewHtml ? `<div class="ed-card">${_edSectionHead("Who's Going")}${attendeePreviewHtml}</div>` : ''}

            <!-- RSVP Card -->
            ${rsvpButtons && rsvpEnabled ? `<div class="ed-card ed-card-rsvp">${rsvpButtons}</div>` : ''}

            <!-- Dynamic sections (notices, QR, cost, raffle…) -->
            ${[waitlistHtml, qrHtml, venueQrHtml, scannerBtn, thresholdHtml, costBreakdownHtml, transportHtml, locationReqHtml, graceHtml, raffleHtml, documentsHtml, mapHtml, competitionHtml, scrapbookHtml].filter(Boolean).map(s => _edCard(s)).join('')}

            <!-- Stats (Host) -->
            ${isHost ? _edCard(`
                ${_edSectionHead('Event Stats')}
                <div class="ed-stats-row">
                    <div class="ed-stat-block"><span class="ed-stat-num">${goingList.length}${event.max_participants ? `<small>/${event.max_participants}</small>` : ''}</span><span class="ed-stat-lbl">Going</span></div>
                    <div class="ed-stat-block ed-stat-pink"><span class="ed-stat-num">${maybeList.length}</span><span class="ed-stat-lbl">Interested</span></div>
                    <div class="ed-stat-block ed-stat-green"><span class="ed-stat-num">${checkinCount || 0}</span><span class="ed-stat-lbl">Checked In</span></div>
                </div>
            `) : ''}

            <!-- Attendee Breakdown (Host) -->
            ${attendeeBreakdownHtml ? _edCard(attendeeBreakdownHtml) : ''}

            <!-- Comments -->
            <div class="ed-card" id="portalCommentsSection" role="region" aria-label="Discussion">
                ${_edSectionHead('Discussion')}
                <div id="portalCommentsList" class="ed-comments-list"></div>
                <div class="ed-comment-input-row">
                    <input type="text" id="portalCommentInput" placeholder="Write a comment…" class="ed-comment-input" aria-label="Write a comment">
                    <button onclick="evtPostComment('${eventId}')" class="ed-comment-post" aria-label="Post comment">Post</button>
                </div>
            </div>

            <!-- Related Events -->
            ${relatedHtml ? _edCard(relatedHtml) : ''}

            <!-- Host Controls -->
            ${hostControlsHtml ? _edCard(hostControlsHtml, 'ed-card-host') : ''}

            ${event.cancellation_note ? _edCard(`<div class="ed-cancel-banner"><p class="ed-cancel-title">Cancellation Note</p><p class="ed-cancel-text">${evtEscapeHtml(event.cancellation_note)}</p></div>`) : ''}

            <div style="height:80px" class="sm:hidden"></div>
            <div style="height:32px" class="hidden sm:block"></div>
        </div>
    `;

    // ── Post-render setup ────────────────────────────────
    document.title = `${event.title} | Events | Justice McNeal LLC`;
    window.scrollTo({ top: 0, behavior: 'instant' });
    evtInitSectionAnimations();

    if (!isClosed && !isPast && event.status !== 'active' && event.status !== 'cancelled') {
        evtStartLiveCountdown(event.start_date);
    }

    evtInitBottomNav(event, eventId, rsvp, myRaffleEntry, entriesClosed, eventIsFull, isHost);
    evtInitHeroCollapse();
    evtLoadComments(eventId);

    document.addEventListener('click', (e) => {
        const dd = document.querySelector('.evt-host-dropdown.open');
        if (dd && !dd.parentElement.contains(e.target)) dd.classList.remove('open');
    }, { once: false });

    // QR codes + map after DOM render
    setTimeout(() => {
        if (rsvp && rsvp.status === 'going' && event.checkin_mode === 'attendee_ticket') {
            const canvas = document.getElementById('myTicketQR');
            if (canvas && typeof QRCode !== 'undefined') {
                QRCode.toCanvas(canvas, `${window.location.origin}/events/?e=${event.slug}&ticket=${rsvp.qr_token}`, { width: 180, margin: 2 });
            }
        }
        if (isHost && event.checkin_mode === 'venue_scan' && event.venue_qr_token) {
            const canvas = document.getElementById('venueQR');
            if (canvas && typeof QRCode !== 'undefined') {
                QRCode.toCanvas(canvas, `${window.location.origin}/events/?e=${event.slug}&checkin=1`, { width: 220, margin: 2 });
            }
        }
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
// Hero collapse — DEPRECATED (M2)
// Hero scrolls naturally; sticky title row handled in CSS via position:sticky.
// Functions kept as no-ops so external callers (rsvp/utils) don't crash.
// ═══════════════════════════════════════════════════════════
function evtInitHeroCollapse() { /* no-op since M2 — hero scrolls naturally */ }
function evtCleanupHeroCollapse() { /* no-op since M2 */ }

// ═══════════════════════════════════════════════════════════
// Sticky CTA Bar — sits above the untouched bottom-tab-bar
// ═══════════════════════════════════════════════════════════
const EVT_CTA_ICONS = {
    check: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>',
    ticket: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>',
};

function evtInitBottomNav(event, eventId, rsvp, myRaffleEntry, entriesClosed, eventIsFull, isHost) {
    evtCleanupBottomNav();

    const rsvpEnabled = event.rsvp_enabled !== false;
    const raffleEnabled = !!event.raffle_enabled;
    if (!rsvpEnabled && !raffleEnabled) return;

    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast = new Date(event.start_date) < new Date() && event.status !== 'active';
    const canRsvp = rsvpEnabled && ['open','confirmed','active'].includes(event.status) && !entriesClosed;

    let rsvpBtn = '';
    if (rsvpEnabled) {
        if (isHost) {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-host" disabled>⭐ Hosting</button>`;
        } else if (rsvp?.paid) {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-rsvp-done" disabled>${EVT_CTA_ICONS.check} RSVP'd</button>`;
        } else if (rsvp?.status === 'going') {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-rsvp-done" disabled>${EVT_CTA_ICONS.check} Going</button>`;
        } else if (canRsvp && !eventIsFull && event.pricing_mode === 'paid') {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-rsvp" onclick="evtHandleRsvp('${eventId}','going')">RSVP — ${formatCurrency(event.rsvp_cost_cents)}</button>`;
        } else if (canRsvp && !eventIsFull) {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-rsvp" onclick="evtHandleRsvp('${eventId}','going')">RSVP</button>`;
        } else if (eventIsFull) {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-disabled" disabled>${EVT_CTA_ICONS.lock} Full</button>`;
        } else {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-disabled" disabled>${EVT_CTA_ICONS.lock} ${isClosed ? 'Closed' : 'RSVP Closed'}</button>`;
        }
    }

    let raffleBtn = '';
    if (raffleEnabled && !isHost) {
        if (myRaffleEntry) {
            raffleBtn = `<button class="evt-cta-btn evt-cta-raffle-done" disabled>${EVT_CTA_ICONS.check} Entered</button>`;
        } else if (entriesClosed) {
            raffleBtn = `<button class="evt-cta-btn evt-cta-disabled" disabled>${EVT_CTA_ICONS.lock} Closed</button>`;
        } else if (event.pricing_mode === 'paid') {
            // raffle included with RSVP — no separate button
        } else if (event.raffle_entry_cost_cents > 0) {
            raffleBtn = `<button class="evt-cta-btn evt-cta-raffle" onclick="evtHandleRaffleEntry('${eventId}')">${EVT_CTA_ICONS.ticket} Raffle — ${formatCurrency(event.raffle_entry_cost_cents)}</button>`;
        } else {
            raffleBtn = `<button class="evt-cta-btn evt-cta-raffle" onclick="evtHandleFreeRaffleEntry('${eventId}')">${EVT_CTA_ICONS.ticket} Enter Raffle</button>`;
        }
    }

    if (!rsvpBtn && !raffleBtn) return;

    const bar = document.createElement('div');
    bar.id = 'evtCtaBar';
    bar.className = 'evt-cta-bar';
    bar.innerHTML = rsvpBtn + raffleBtn;
    document.body.appendChild(bar);
    document.body.classList.add('evt-cta-active');

    // Hide swipe-hint so it doesn't overlap the CTA bar
    const hint = document.querySelector('.bottom-tab-bar .swipe-hint');
    if (hint) hint.style.display = 'none';
}

function evtCleanupBottomNav() {
    const el = document.getElementById('evtCtaBar');
    if (el) el.remove();
    // Restore swipe-hint
    const hint = document.querySelector('.bottom-tab-bar .swipe-hint');
    if (hint) hint.style.display = '';
    document.body.classList.remove('evt-cta-active');
    // Clean up hero collapse / sticky header
    evtCleanupHeroCollapse();
}

// ═══════════════════════════════════════════════════════════
// Public surface — preserve legacy evt* globals + register PortalEvents.detail namespace
// ═══════════════════════════════════════════════════════════
window.evtOpenDetail            = evtOpenDetail;
window.evtOpenLightbox          = evtOpenLightbox;
window.evtOpenFullscreenMap     = evtOpenFullscreenMap;
window.evtCloseFullscreenMap    = evtCloseFullscreenMap;
window.evtMiniMarkdown          = evtMiniMarkdown;
window.evtInitSectionAnimations = evtInitSectionAnimations;
window.evtStartLiveCountdown    = evtStartLiveCountdown;
window.evtInitHeroCollapse      = evtInitHeroCollapse;
window.evtCleanupHeroCollapse   = evtCleanupHeroCollapse;
window.evtInitBottomNav         = evtInitBottomNav;
window.evtCleanupBottomNav      = evtCleanupBottomNav;

detail.open                = evtOpenDetail;
detail.openLightbox        = evtOpenLightbox;
detail.openFullscreenMap   = evtOpenFullscreenMap;
detail.closeFullscreenMap  = evtCloseFullscreenMap;
detail.initBottomNav       = evtInitBottomNav;
detail.cleanupBottomNav    = evtCleanupBottomNav;
detail.startLiveCountdown  = evtStartLiveCountdown;
detail.initSectionAnimations = evtInitSectionAnimations;

// Pre-register known sub-modules (M3 management sheet will register itself here)
detail.register('rsvp',        { handle: () => window.evtHandleRsvp });
detail.register('raffle',      { handle: () => window.evtHandleRaffleEntry });
detail.register('competition', { build:  () => window.evtBuildCompetitionHtml });
detail.register('comments',    { load:   () => window.evtLoadComments,  post: () => window.evtPostComment });
detail.register('documents',   { build:  () => window.evtBuildDocumentsHtml });
detail.register('scrapbook',   { build:  () => window.evtBuildScrapbookHtml });
detail.register('map',         { build:  () => window.evtBuildMapHtml });
detail.register('scanner',     { open:   () => window.evtOpenScanner });

})(); // ── end IIFE ──
