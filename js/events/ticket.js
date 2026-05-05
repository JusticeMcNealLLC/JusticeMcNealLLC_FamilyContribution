/* ──────────────────────────────────────────
   Public Event — Ticket QR, venue check-in, guest lookup
   ────────────────────────────────────────── */

async function pubShowTicketQR(qrToken) {
    const ticketSection = document.getElementById('ticketSection');
    ticketSection.classList.remove('hidden');
    const canvas = document.getElementById('ticketQR');
    const ticketUrl = `${window.location.origin}/events/?e=${pubCurrentEvent.slug}&ticket=${qrToken}`;
    QRCode.toCanvas(canvas, ticketUrl, { width: 200, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' } });

    // Check if already checked in
    if (pubCurrentUser) {
        const { data: ci } = await supabaseClient
            .from('event_checkins')
            .select('checked_in_at')
            .eq('event_id', pubCurrentEvent.id)
            .eq('user_id', pubCurrentUser.id)
            .maybeSingle();
        if (ci) pubShowCheckedInOverlay('ticketSection', 'ticketQR', ci.checked_in_at);
    }
}

/* ── Checked-In Overlay (shared helper) ──── */

function pubShowCheckedInOverlay(sectionId, canvasId, checkedInAt) {
    const section = document.getElementById(sectionId);
    const canvas = document.getElementById(canvasId);
    if (!section || !canvas) return;

    // Dim the QR code
    canvas.style.opacity = '0.3';

    // Add check overlay on top of QR
    const wrapper = canvas.parentElement;
    if (wrapper) {
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center';
        overlay.innerHTML = `
            <div style="width:64px;height:64px;border-radius:50%;background:#059669;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(5,150,105,.3)">
                <svg style="width:36px;height:36px;color:#fff" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>`;
        wrapper.appendChild(overlay);
    }

    // Update section header + text
    const header = section.querySelector('h3');
    if (header) {
        header.textContent = '✅ Checked In';
        header.style.color = '#059669';
    }

    // Format the timestamp
    const dt = new Date(checkedInAt);
    const timeStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Replace or add timestamp under the QR
    const existingHint = section.querySelector('.evt-qr-sub');
    if (existingHint) {
        existingHint.style.cssText = 'font-size:13px;color:#059669;font-weight:600;margin-top:10px';
        existingHint.textContent = `Scanned at ${timeStr} · ${dateStr}`;
    } else {
        const ts = document.createElement('p');
        ts.style.cssText = 'font-size:13px;color:#059669;font-weight:600;margin-top:10px';
        ts.textContent = `Scanned at ${timeStr} · ${dateStr}`;
        section.appendChild(ts);
    }

    // Vibrate the phone once (subtle confirmation)
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

/* ── Venue Check-In ──────────────────────── */

function pubRenderVenueCheckin(event) {
    const el = document.getElementById('venueCheckin');
    el.classList.remove('hidden');

    // Guest check-in via token
    if (pubGuestRsvp) {
        el.innerHTML = `
            <div class="evt-qr-card">
                <h3 class="evt-qr-title">📍 Venue Check-In</h3>
                <p class="evt-qr-sub" style="margin-bottom:16px">Tap below to check into this event</p>
                <button onclick="pubDoGuestVenueCheckin('${event.id}','${pubGuestRsvp.guest_token}')" id="guestCheckinBtn" class="evt-action-btn" style="background:#059669">
                    ✅ Check In Now
                </button>
                <div id="guestCheckinResult" style="margin-top:12px"></div>
            </div>`;
        return;
    }

    if (!pubCurrentUser) {
        el.innerHTML = `<div class="evt-notice-card">
            <span class="evt-notice-icon">📍</span>
            <div>
                <p class="evt-notice-title">Sign in to check in</p>
                <a href="/auth/login.html?redirect=${encodeURIComponent(window.location.href)}" class="evt-action-btn" style="display:inline-flex;width:auto;padding:10px 24px;margin-top:10px;text-decoration:none">Sign In</a>
            </div>
        </div>`;
        return;
    }

    el.innerHTML = `
        <div class="evt-qr-card">
            <h3 class="evt-qr-title">📍 Venue Check-In</h3>
            <p class="evt-qr-sub" style="margin-bottom:16px">Tap below to check into this event</p>
            <button onclick="pubDoVenueCheckin('${event.id}')" id="checkinBtn" class="evt-action-btn" style="background:#059669">
                ✅ Check In Now
            </button>
            <div id="checkinResult" style="margin-top:12px"></div>
        </div>`;
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
                result.innerHTML = '<p style="font-size:14px;color:#dc2626;font-weight:600">📍 Location sharing is required for this event. Please allow location access and try again.</p>';
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
            result.innerHTML = '<p style="font-size:14px;color:#dc2626;font-weight:600">❌ You must RSVP "Going" before checking in.</p>';
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
            result.innerHTML = '<p style="font-size:14px;color:#f59e0b;font-weight:600">⚠️ You are already checked in!</p>';
            btn.remove();
            return;
        }

        await supabaseClient.from('event_checkins').insert({
            event_id: eventId,
            user_id: pubCurrentUser.id,
            rsvp_id: rsvp.id,
            checkin_mode: 'venue_scan'
        });

        result.innerHTML = '<p style="font-size:14px;color:#059669;font-weight:700">🎉 Successfully checked in!</p>';
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        btn.remove();
    } catch (err) {
        console.error('Check-in error:', err);
        result.innerHTML = '<p style="font-size:14px;color:#dc2626">Check-in failed. Please try again.</p>';
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
            result.innerHTML = '<p style="font-size:14px;color:#f59e0b;font-weight:600">⚠️ You are already checked in!</p>';
            btn.remove();
            return;
        }

        await supabaseClient.from('event_checkins').insert({
            event_id: eventId,
            guest_token: guestToken,
            checkin_mode: 'venue_scan'
        });

        result.innerHTML = '<p style="font-size:14px;color:#059669;font-weight:700">🎉 Successfully checked in!</p>';
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        btn.remove();
    } catch (err) {
        console.error('Guest check-in error:', err);
        result.innerHTML = '<p style="font-size:14px;color:#dc2626">Check-in failed. Please try again.</p>';
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
            <div class="evt-qr-card">
                <h3 class="evt-qr-title">🎟️ Scanning Attendee Ticket…</h3>
                <div id="ticketScanResult" style="margin-top:12px">
                    <span style="font-size:14px;color:#717171">Processing check-in…</span>
                </div>
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
                    resultEl.innerHTML = `<p style="font-size:14px;color:#f59e0b;font-weight:600">✅ Already checked in — ${pubEscapeHtml(name)}</p>`;
                    return;
                }

                await supabaseClient.from('event_checkins').insert({
                    event_id: event.id,
                    user_id: rsvp.user_id,
                    checked_in_by: pubCurrentUser.id,
                    checkin_mode: 'attendee_ticket'
                });

                resultEl.innerHTML = `<p style="font-size:16px;color:#059669;font-weight:700">✅ Checked in — ${pubEscapeHtml(name)}</p>`;
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                return;
            }

            // Try guest RSVP
            const { data: guestRsvp } = await supabaseClient
                .from('event_guest_rsvps')
                .select('id, guest_name, guest_token, paid')
                .eq('event_id', event.id)
                .eq('guest_token', ticketToken)
                .maybeSingle();

            const isFreeEvent = !(event.pricing_mode === 'paid' && event.rsvp_cost_cents > 0);
            if (guestRsvp && (guestRsvp.paid || isFreeEvent)) {
                const { data: gExisting } = await supabaseClient
                    .from('event_checkins')
                    .select('id')
                    .eq('event_id', event.id)
                    .eq('guest_token', guestRsvp.guest_token)
                    .maybeSingle();

                if (gExisting) {
                    resultEl.innerHTML = `<p style="font-size:14px;color:#f59e0b;font-weight:600">✅ Already checked in — ${pubEscapeHtml(guestRsvp.guest_name)} (Guest)</p>`;
                    return;
                }

                await supabaseClient.from('event_checkins').insert({
                    event_id: event.id,
                    guest_token: guestRsvp.guest_token,
                    checked_in_by: pubCurrentUser.id,
                    checkin_mode: 'attendee_ticket'
                });

                resultEl.innerHTML = `<p style="font-size:16px;color:#059669;font-weight:700">✅ Checked in — ${pubEscapeHtml(guestRsvp.guest_name)} (Guest)</p>`;
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                return;
            }

            resultEl.innerHTML = '<p style="font-size:14px;color:#dc2626;font-weight:600">❌ Invalid ticket — no matching RSVP found.</p>';
        } catch (err) {
            console.error('Ticket scan check-in error:', err);
            resultEl.innerHTML = `<p style="font-size:14px;color:#dc2626">Check-in failed: ${err.message}</p>`;
        }
    } else {
        // Attendee scanning their own ticket
        container.innerHTML = `
            <div class="evt-qr-card">
                <div style="width:64px;height:64px;background:#f7f7f7;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
                    <span style="font-size:32px">🎟️</span>
                </div>
                <h3 class="evt-qr-title">Event Ticket</h3>
                <p style="font-size:14px;color:#717171;margin-bottom:16px">Show this QR code to the event coordinator to check in.</p>
                <p style="font-size:13px;color:#b0b0b0">The event host uses the in-app scanner to verify your ticket.</p>
                ${!pubCurrentUser ? '<p style="font-size:13px;color:#717171;margin-top:14px"><a href="/auth/login.html?redirect=' + encodeURIComponent(window.location.href) + '" style="color:#222;font-weight:600">Sign in</a> if you\'re the event host.</p>' : ''}
            </div>`;
    }
}

/* ── Guest RSVP Section Renderer ─────────── */

async function pubShowGuestTicket(guestRsvp) {
    const section = document.getElementById('guestTicketSection');
    if (!section) return;

    section.classList.remove('hidden');
    if (window.matchMedia('(max-width: 1023px)').matches && section.parentElement !== document.body) {
        document.body.appendChild(section);
    }
    document.getElementById('guestTicketName').textContent = guestRsvp.guest_name || 'Guest';

    const canvas = document.getElementById('guestTicketQR');
    const guestTicketUrl = `${window.location.origin}/events/?e=${pubCurrentEvent.slug}&ticket=${guestRsvp.guest_token}`;
    QRCode.toCanvas(canvas, guestTicketUrl, {
        width: 200, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' }
    });

    // Hide the guest RSVP form since they already have a ticket
    const formSection = document.getElementById('guestRsvpSection');
    if (formSection) formSection.classList.add('hidden');

    // Check-in status can load after the ticket is shown; don't block sheet opening.
    supabaseClient
        .from('event_checkins')
        .select('checked_in_at')
        .eq('event_id', pubCurrentEvent.id)
        .eq('guest_token', guestRsvp.guest_token)
        .maybeSingle()
        .then(({ data: ci }) => {
            if (ci) pubShowCheckedInOverlay('guestTicketSection', 'guestTicketQR', ci.checked_in_at);
        })
        .catch(err => console.warn('Guest check-in status unavailable:', err));
}

/* ── Guest Lookup ────────────────────────── */

function pubToggleLookup() {
    // Legacy — lookup is now a tab in the unified RSVP card. No-op.
}


async function pubLookupGuestTicket() {
    if (!pubCurrentEvent) return;

    const email = document.getElementById('lookupEmailInput').value.trim();
    const resultEl = document.getElementById('lookupResult');
    const btn = document.getElementById('lookupBtn');

    if (!email) {
        resultEl.innerHTML = '<p style="font-size:13px;color:#dc2626">Please enter your email.</p>';
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
            resultEl.innerHTML = '<p style="font-size:13px;color:#dc2626">No RSVP found for this email.</p>';
        } else {
            pubGuestRsvp = gRsvp;
            pubGuestToken = gRsvp.guest_token;
            pubShowGuestTicket(gRsvp);
            pubInitBottomNav(pubCurrentEvent);

            // Show gated notes if applicable
            if (pubCurrentEvent.gated_notes) {
                document.getElementById('gatedSection').classList.remove('hidden');
                document.getElementById('gatedNotes').textContent = pubCurrentEvent.gated_notes;
            }

            resultEl.innerHTML = '<p style="font-size:13px;color:#059669;font-weight:600">✅ Ticket found! Scroll up to see your QR code.</p>';
        }
    } catch (err) {
        console.error('Lookup error:', err);
        resultEl.innerHTML = '<p style="font-size:13px;color:#dc2626">Lookup failed. Please try again.</p>';
    }

    btn.disabled = false;
    btn.textContent = 'Find My Ticket';
}

/* ── Utilities ───────────────────────────── */
