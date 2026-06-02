/* ──────────────────────────────────────────
   Public Event — Body widgets (lightbox, map,
   ICS download, invite banner, comments)
   ────────────────────────────────────────── */

/* ── RSVP Bottom Sheet (mobile) ─────────── */
function pubCloseAllBottomSheets() {
    pubCloseCtaPanel();
    pubCloseRsvpSheet();
    pubCloseGuestTicketSheet();
}

function pubCloseCtaPanel() {
    const panel = document.getElementById('evtCtaPanel');
    const bar = document.getElementById('evtCtaBar');
    if (panel) {
        panel.classList.add('hidden');
        panel.innerHTML = '';
    }
    if (bar) bar.classList.remove('evt-cta-bar-expanded');
}

function pubHasRaffleEligibleRsvp() {
    if (pubCurrentUser) return pubCurrentRsvp?.status === 'going' || !!pubCurrentRsvp?.paid;
    return !!pubGuestRsvp;
}

function pubOpenRsvpForRaffle() {
    window.pubCtaRaffleIntent = true;
    pubOpenCtaPanel('rsvp', { raffleIntent: true });
}

function pubOpenCtaPanel(kind, opts = {}) {
    const panel = document.getElementById('evtCtaPanel');
    const bar = document.getElementById('evtCtaBar');
    if (!panel || !bar || !pubCurrentEvent) return;

    const closeBtn = '<button type="button" class="evt-cta-panel-close" onclick="pubCloseCtaPanel()" aria-label="Close">×</button>';
    bar.classList.add('evt-cta-bar-expanded');
    panel.classList.remove('hidden');

    if (kind === 'ticket') {
        pubRenderCtaTicket(panel, closeBtn);
        return;
    }

    if (kind === 'raffle') {
        if (!pubHasRaffleEligibleRsvp()) {
            pubOpenRsvpForRaffle();
            return;
        }
        pubRenderCtaRaffle(panel, closeBtn);
        return;
    }

    const rafflePrompt = opts.raffleIntent
        ? '<div class="evt-cta-note">RSVP first, then your same name and email will be used for the raffle entry.</div>'
        : '';
    const memberPrompt = typeof pubMemberRsvpPromptHtml === 'function'
        ? pubMemberRsvpPromptHtml(pubCurrentEvent.slug)
        : '';
    panel.innerHTML = `
        ${closeBtn}
        <div class="evt-cta-panel-head"><strong>RSVP for this event</strong><span>No account needed. Your ticket appears here after RSVP.</span></div>
        ${rafflePrompt}
        <div class="evt-cta-field-stack">
            <input type="text" id="ctaGuestNameInput" placeholder="Your full name" class="evt-input" aria-label="Full name">
            <input type="email" id="ctaGuestEmailInput" placeholder="Email address" class="evt-input" aria-label="Email address">
            <input type="tel" id="ctaGuestPhoneInput" placeholder="Phone number (optional)" class="evt-input" aria-label="Phone number optional">
            <label class="evt-checkbox-label"><input type="checkbox" id="ctaGuestSmsConsentCheck"><span>Text me event updates at this number. Message/data rates may apply. Reply STOP to opt out.</span></label>
            <label class="evt-checkbox-label${pubCurrentEvent.pricing_mode === 'paid' && pubCurrentEvent.rsvp_cost_cents > 0 ? '' : ' hidden'}"><input type="checkbox" id="ctaGuestNoRefundCheck"><span>I understand this payment is non-refundable unless cancelled by staff.</span></label>
            <button type="button" onclick="pubSubmitCtaGuestRsvp()" id="ctaGuestRsvpBtn" class="evt-rsvp-pay">${pubCurrentEvent.pricing_mode === 'paid' && pubCurrentEvent.rsvp_cost_cents > 0 ? `RSVP as Guest — ${pubFormatCurrency(pubCurrentEvent.rsvp_cost_cents)}` : 'RSVP as Guest'}</button>
        </div>
        ${memberPrompt}`;
    if (typeof pubWireGuestSmsFields === 'function') pubWireGuestSmsFields();
}

function pubRenderCtaTicket(panel, closeBtn) {
    const attendeeName = pubGuestRsvp?.guest_name || (pubCurrentUser ? 'Member' : 'Guest');
    const token = pubGuestRsvp?.guest_token || pubCurrentRsvp?.qr_token || '';
    const hasQr = token && pubCurrentEvent.checkin_mode === 'attendee_ticket';
    panel.innerHTML = `
        ${closeBtn}
        <div class="evt-cta-panel-head"><strong>${pubGuestRsvp || pubCurrentRsvp ? 'You\'re going' : 'Ticket unavailable'}</strong><span>${pubEscapeHtml(attendeeName)}</span></div>
        <div class="evt-cta-ticket-card">
            ${hasQr ? '<canvas id="ctaTicketQR"></canvas><p>Show this QR code at check-in</p>' : '<div class="evt-info-card"><span class="evt-info-card-icon">✅</span><div><p class="evt-info-card-title">You are on the RSVP list</p><p class="evt-info-card-sub">No QR ticket is required for this event.</p></div></div>'}
        </div>`;
    if (hasQr && typeof QRCode !== 'undefined') {
        const canvas = document.getElementById('ctaTicketQR');
        QRCode.toCanvas(canvas, `${window.location.origin}/events/?e=${pubCurrentEvent.slug}&ticket=${token}`, { width: 172, margin: 2, color: { dark: '#111827', light: '#ffffff' } });
    }
}

function pubRenderCtaRaffle(panel, closeBtn) {
    if (!pubHasRaffleEligibleRsvp()) {
        pubOpenRsvpForRaffle();
        return;
    }

    if (pubCurrentUser) {
        const cost = pubCurrentEvent.raffle_entry_cost_cents || 0;
        panel.innerHTML = `
            ${closeBtn}
            <div class="evt-cta-panel-head"><strong>Enter the raffle</strong><span>${cost > 0 ? 'Confirm to start checkout.' : 'One tap and you are in the draw.'}</span></div>
            <button type="button" onclick="${cost > 0 ? 'pubHandlePaidRaffle()' : 'pubHandleFreeRaffle()'}" class="evt-raffle-buy">${cost > 0 ? `Buy Raffle Entry — ${pubFormatCurrency(cost)}` : 'Enter Raffle — Free'}</button>`;
        return;
    }

    if (pubCurrentEvent.member_only) {
        panel.innerHTML = `${closeBtn}<div class="evt-cta-panel-head"><strong>Members only</strong><span>Sign in with your member account to enter.</span></div><a href="${typeof pubPortalLoginHref === 'function' && pubCurrentEvent ? pubPortalLoginHref(pubCurrentEvent.slug) : '/auth/login.html'}" class="evt-raffle-buy" style="text-decoration:none">Sign In to Enter Raffle</a>`;
        return;
    }

    const cost = pubCurrentEvent.raffle_entry_cost_cents || 0;
    const guestName = pubEscapeHtml(pubGuestRsvp?.guest_name || 'Guest');
    const guestEmail = pubEscapeHtml(pubGuestRsvp?.guest_email || '');
    panel.innerHTML = `
        ${closeBtn}
        <div class="evt-cta-panel-head"><strong>Enter the raffle</strong><span>Using your RSVP info: ${guestName}${guestEmail ? ` · ${guestEmail}` : ''}</span></div>
        <div class="evt-cta-field-stack">
            <button type="button" onclick="pubSubmitCtaGuestRaffle()" id="ctaGuestRaffleBtn" class="evt-raffle-buy">${cost > 0 ? `Buy Raffle Entry — ${pubFormatCurrency(cost)}` : 'Enter Raffle — Free'}</button>
            ${cost > 0 ? '<p class="evt-cta-fineprint">Non-refundable raffle ticket</p>' : ''}
        </div>`;
}

async function pubSubmitCtaGuestRsvp() {
    const name = document.getElementById('ctaGuestNameInput')?.value.trim() || '';
    const email = document.getElementById('ctaGuestEmailInput')?.value.trim() || '';
    const phone = document.getElementById('ctaGuestPhoneInput')?.value.trim() || '';
    const smsConsent = document.getElementById('ctaGuestSmsConsentCheck');
    const noRefund = document.getElementById('ctaGuestNoRefundCheck');
    const targetName = document.getElementById('guestNameInput');
    const targetEmail = document.getElementById('guestEmailInput');
    const targetPhone = document.getElementById('guestPhoneInput');
    const targetSmsConsent = document.getElementById('guestSmsConsentCheck');
    const targetNoRefund = document.getElementById('guestNoRefundCheck');
    if (targetName) targetName.value = name;
    if (targetEmail) targetEmail.value = email;
    if (targetPhone) targetPhone.value = phone;
    if (targetSmsConsent && smsConsent) targetSmsConsent.checked = smsConsent.checked;
    if (targetNoRefund && noRefund) targetNoRefund.checked = noRefund.checked;
    await pubHandleGuestRsvp();
    if (pubGuestRsvp) pubOpenCtaPanel('ticket');
}

async function pubSubmitCtaGuestRaffle() {
    if (!pubGuestRsvp) {
        pubOpenRsvpForRaffle();
        return;
    }
    const name = pubGuestRsvp.guest_name || '';
    const email = pubGuestRsvp.guest_email || '';
    if (pubCurrentEvent?.raffle_entry_cost_cents > 0) await pubHandleGuestPaidRaffle(name, email);
    else await pubHandleGuestFreeRaffle(name, email);
}

function pubEnsureSheetBackdrop() {
    let backdrop = document.getElementById('rsvpSheetBackdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'rsvpSheetBackdrop';
        backdrop.className = 'rsvp-sheet-backdrop';
        document.body.appendChild(backdrop);
    }
    backdrop.onclick = pubCloseAllBottomSheets;
    return backdrop;
}

function pubOpenRsvpSheet() {
    const section = document.getElementById('guestRsvpSection');
    if (!section) return;
    section.classList.remove('hidden');

    // Move to <body> so position:fixed escapes any ancestor transform/animation
    // (evtFadeIn on #eventContent creates a stacking context that traps fixed children)
    if (section.parentElement !== document.body) {
        document.body.appendChild(section);
    }

    // Add close button once
    if (!section.querySelector('.rsvp-sheet-close')) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'rsvp-sheet-close';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.innerHTML = '<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
        closeBtn.addEventListener('click', pubCloseRsvpSheet);
        section.insertBefore(closeBtn, section.firstChild);
    }

    const backdrop = pubEnsureSheetBackdrop();

    requestAnimationFrame(() => {
        backdrop.classList.add('visible');
        section.classList.add('rsvp-sheet-open');
    });
    document.body.style.overflow = 'hidden';
}

function pubFocusGuestRsvpForRaffle() {
    const section = document.getElementById('guestRsvpSection');
    if (!section) return;
    section.classList.remove('hidden');
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const firstInput = section.querySelector('#guestNameInput, #guestEmailInput');
    if (firstInput) setTimeout(() => firstInput.focus(), 250);
}

function pubCloseRsvpSheet() {
    const section = document.getElementById('guestRsvpSection');
    const backdrop = document.getElementById('rsvpSheetBackdrop');
    if (section) section.classList.remove('rsvp-sheet-open');
    if (backdrop) backdrop.classList.remove('visible');
    document.body.style.overflow = '';
}

function pubOpenGuestTicketSheet() {
    const section = document.getElementById('guestTicketSection');
    if (!section) return;
    section.classList.remove('hidden');

    if (section.parentElement !== document.body) {
        document.body.appendChild(section);
    }

    if (!section.querySelector('.ticket-sheet-close')) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'rsvp-sheet-close ticket-sheet-close';
        closeBtn.setAttribute('aria-label', 'Close ticket');
        closeBtn.innerHTML = '<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
        closeBtn.addEventListener('click', pubCloseGuestTicketSheet);
        section.insertBefore(closeBtn, section.firstChild);
    }

    const backdrop = pubEnsureSheetBackdrop();
    requestAnimationFrame(() => {
        backdrop.classList.add('visible');
        section.classList.add('ticket-sheet-open');
    });
    document.body.style.overflow = 'hidden';
}

function pubCloseGuestTicketSheet() {
    const section = document.getElementById('guestTicketSection');
    const backdrop = document.getElementById('rsvpSheetBackdrop');
    if (section) section.classList.remove('ticket-sheet-open');
    if (backdrop) backdrop.classList.remove('visible');
    document.body.style.overflow = '';
}

function pubOpenLightbox(imgUrl) {
    let lb = document.querySelector('.evt-lightbox');
    if (!lb) {
        lb = document.createElement('div');
        lb.className = 'evt-lightbox';
        lb.setAttribute('role', 'dialog');
        lb.setAttribute('aria-label', 'Image preview');
        lb.innerHTML = `<button class="evt-lightbox-close" aria-label="Close preview"><svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button><img src="" alt="Event banner full size">`;
        lb.addEventListener('click', () => { lb.classList.remove('active'); document.body.style.overflow = ''; });
        lb.querySelector('.evt-lightbox-close').addEventListener('click', () => { lb.classList.remove('active'); document.body.style.overflow = ''; });
        document.body.appendChild(lb);
    }
    lb.querySelector('img').src = imgUrl;
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
}


function pubShowMap(lat, lng, label) {
    const wrap = document.getElementById('eventMapWrap');
    if (!wrap || typeof L === 'undefined') return;
    wrap.classList.remove('hidden');

    // Store for fullscreen reuse
    _pubMapCoords = { lat, lng, label };

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

    // Mobile map card (shown on ≤1023px, hidden on desktop via CSS)
    const mobileMapEl = document.getElementById('eventMapMobile');
    if (mobileMapEl) {
        const mobileMap = L.map('eventMapMobile', { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, tap: false }).setView([lat, lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mobileMap);
        L.marker([lat, lng]).addTo(mobileMap);
        setTimeout(() => mobileMap.invalidateSize(), 200);
    }

    // Fix tile rendering after hidden element becomes visible
    setTimeout(() => map.invalidateSize(), 200);
}

/* ── Fullscreen Map ──────────────────────── */
let _pubFullscreenMap = null;


function pubOpenFullscreenMap() {
    if (!_pubMapCoords) return;
    const { lat, lng, label } = _pubMapCoords;
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

    setTimeout(() => {
        if (_pubFullscreenMap) { _pubFullscreenMap.remove(); _pubFullscreenMap = null; }
        _pubFullscreenMap = L.map('fullscreenMapContainer', {
            zoomControl: true, attributionControl: false, dragging: true, scrollWheelZoom: true
        }).setView([lat, lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(_pubFullscreenMap);
        L.marker([lat, lng]).addTo(_pubFullscreenMap).bindPopup(pubEscapeHtml(label || 'Event Location')).openPopup();
        setTimeout(() => _pubFullscreenMap.invalidateSize(), 50);
    }, 50);
}


function pubRecenterFullscreenMap() {
    if (!_pubFullscreenMap || !_pubMapCoords) return;
    const { lat, lng } = _pubMapCoords;
    _pubFullscreenMap.setView([lat, lng], 16, { animate: true, duration: 0.5 });
}

function pubCloseFullscreenMap() {
    const overlay = document.getElementById('fullscreenMapOverlay');
    if (overlay) overlay.classList.add('hidden');
    if (_pubFullscreenMap) { _pubFullscreenMap.remove(); _pubFullscreenMap = null; }
    document.body.style.overflow = '';
}

/* ── ICS Calendar Download ────────────────── */

function pubDownloadIcs() {
    if (!pubCurrentEvent) return;
    const e = pubCurrentEvent;
    const start = new Date(e.start_date);
    const end   = e.end_date ? new Date(e.end_date) : new Date(start.getTime() + 7200000);
    const fmt = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const uid  = `${e.id}@justicemcnealllc.com`;

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
        `URL:${window.location.href}`,
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

/* ── Personalized Invite Banner ──────────── */

async function pubRenderInviteBanner(event) {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (!ref) return;

    const banner = document.getElementById('inviteBanner');
    if (!banner) return;

    let inviterName = null;

    if (ref.startsWith('g_')) {
        // Guest referrer — look up guest name
        const gToken = ref.slice(2);
        const { data: gRsvp } = await supabaseClient
            .from('event_guest_rsvps')
            .select('guest_name')
            .eq('event_id', event.id)
            .ilike('guest_token', gToken + '%')
            .maybeSingle();
        if (gRsvp) inviterName = gRsvp.guest_name;
    } else {
        if (!pubCurrentUser) return;

        // Member referrer — look up profile
        const { data: profiles } = await supabaseClient
            .from('profiles')
            .select('first_name, last_name')
            .ilike('id', ref + '%')
            .limit(1);
        if (profiles && profiles[0]) {
            inviterName = `${profiles[0].first_name || ''} ${profiles[0].last_name || ''}`.trim();
        }
    }

    if (inviterName) {
        const initial = (inviterName.trim()[0] || '?').toUpperCase();
        banner.innerHTML = `
            <div class="evt-invite-banner">
                <div class="evt-invite-avatar" aria-hidden="true">${pubEscapeHtml(initial)}</div>
                <div class="evt-invite-text">
                    <p>${pubEscapeHtml(inviterName)} invited you</p>
                    <span>Join them at this event</span>
                </div>
            </div>`;
        banner.classList.remove('hidden');
    }
}

/* ── Comments / Discussion ───────────────── */

async function pubRenderComments(event) {
    const section = document.getElementById('commentsSection');
    const list    = document.getElementById('commentsList');
    const form    = document.getElementById('commentForm');
    const prompt  = document.getElementById('commentLoginPrompt');

    // Load comments
    const { data: comments } = await supabaseClient
        .from('event_comments')
        .select('*, profile:profiles!event_comments_user_id_fkey(first_name, last_name, profile_picture_url)')
        .eq('event_id', event.id)
        .order('created_at', { ascending: true })
        .limit(100);

    // Show section if there are comments or user can post
    const canPost = pubCurrentRsvp || pubGuestRsvp;

    if ((!comments || comments.length === 0) && !canPost) return;

    section.classList.remove('hidden');

    // Render comments
    if (comments && comments.length > 0) {
        list.innerHTML = comments.map(c => {
            const isGuest = !c.user_id;
            const name = isGuest ? pubEscapeHtml(c.guest_name || 'Guest') : pubEscapeHtml(`${c.profile?.first_name || ''} ${c.profile?.last_name || ''}`.trim() || 'Member');
            const avatarUrl = !isGuest && c.profile?.profile_picture_url;
            const initials = isGuest ? (c.guest_name || 'G')[0].toUpperCase() : ((c.profile?.first_name?.[0] || '') + (c.profile?.last_name?.[0] || '')).toUpperCase();
            const timeAgo = pubTimeAgo(c.created_at);

            return `<div class="evt-comment">
                <div class="evt-comment-avatar">${avatarUrl ? `<img src="${avatarUrl}" alt="">` : initials}</div>
                <div class="evt-comment-body">
                    <div class="evt-comment-meta"><span class="evt-comment-name">${name}</span><span class="evt-comment-time">${timeAgo}</span></div>
                    <p class="evt-comment-text">${pubEscapeHtml(c.body)}</p>
                </div>
            </div>`;
        }).join('');
    } else {
        list.innerHTML = '<p style="font-size:14px;color:#b0b0b0;text-align:center">No comments yet — be the first!</p>';
    }

    // Show form or prompt
    if (canPost) {
        form.classList.remove('hidden');
    } else {
        prompt.classList.remove('hidden');
    }
}


async function pubPostComment() {
    const input = document.getElementById('commentInput');
    const body  = (input.value || '').trim();
    if (!body || !pubCurrentEvent) return;

    const payload = {
        event_id: pubCurrentEvent.id,
        body: body
    };

    if (pubCurrentUser) {
        payload.user_id = pubCurrentUser.id;
    } else if (pubGuestRsvp) {
        payload.guest_name  = pubGuestRsvp.guest_name;
        payload.guest_token = pubGuestRsvp.guest_token;
    } else {
        return; // Can't post without identity
    }

    const { error } = await supabaseClient.from('event_comments').insert(payload);
    if (error) {
        console.error('Comment error:', error);
        return;
    }

    input.value = '';
    // Refresh comments
    await pubRenderComments(pubCurrentEvent);
}

/* ── Time Ago Helper ─────────────────────── */
