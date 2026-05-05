/* ──────────────────────────────────────────
   Public Event — Body widgets (lightbox, map,
   ICS download, invite banner, comments)
   ────────────────────────────────────────── */

/* ── RSVP Bottom Sheet (mobile) ─────────── */
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

    // Create backdrop once
    let backdrop = document.getElementById('rsvpSheetBackdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'rsvpSheetBackdrop';
        backdrop.className = 'rsvp-sheet-backdrop';
        backdrop.addEventListener('click', pubCloseRsvpSheet);
        document.body.appendChild(backdrop);
    }

    requestAnimationFrame(() => {
        backdrop.classList.add('visible');
        section.classList.add('rsvp-sheet-open');
    });
    document.body.style.overflow = 'hidden';
}

function pubCloseRsvpSheet() {
    const section = document.getElementById('guestRsvpSection');
    const backdrop = document.getElementById('rsvpSheetBackdrop');
    if (section) section.classList.remove('rsvp-sheet-open');
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
                    <span class="evt-comment-name">${name}</span><span class="evt-comment-time">${timeAgo}</span>
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
