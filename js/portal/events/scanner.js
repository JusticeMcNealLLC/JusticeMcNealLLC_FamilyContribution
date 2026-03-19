// ═══════════════════════════════════════════════════════════
// Portal Events — QR Scanner (Attendee Ticket Mode)
// Camera-based scanning using jsQR, processes check-ins.
// ═══════════════════════════════════════════════════════════

// Parse QR data from either URL format or legacy JSON format
function evtParseQrData(raw) {
    // URL format: https://…/events/?e={slug}&ticket={token}
    try {
        const url = new URL(raw);
        const ticket = url.searchParams.get('ticket');
        const slug = url.searchParams.get('e');
        if (ticket && slug) {
            // Resolve event_id from slug using the loaded events list
            const evt = evtAllEvents.find(ev => ev.slug === slug);
            if (evt) return { e: evt.id, t: ticket };
            // If event not in cache, return slug so caller can handle
            return { slug, t: ticket };
        }
    } catch (_) { /* not a URL */ }
    // Legacy JSON format: {"e":"uuid","t":"token"}
    try {
        const obj = JSON.parse(raw);
        if (obj.e && obj.t) return obj;
    } catch (_) { /* not JSON */ }
    return null;
}

async function evtOpenScanner(eventId) {
    evtToggleModal('scannerModal', true);
    const video = document.getElementById('scannerVideo');
    const canvas = document.getElementById('scannerCanvas');
    const result = document.getElementById('scanResult');
    result.innerHTML = '<span class="text-gray-400">Point camera at attendee\'s QR code…</span>';

    try {
        evtScannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = evtScannerStream;
        video.play();

        const ctx = canvas.getContext('2d');

        function tick() {
            if (!evtScannerStream) return;
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                if (typeof jsQR !== 'undefined') {
                    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
                    if (code) {
                        const qrData = evtParseQrData(code.data);
                        if (qrData && qrData.t) {
                            evtProcessCheckin(qrData.e || eventId, qrData.t, result);
                            return; // stop scanning
                        }
                    }
                }
            }
            evtScannerAnimFrame = requestAnimationFrame(tick);
        }

        evtScannerAnimFrame = requestAnimationFrame(tick);
    } catch (err) {
        console.error('Camera error:', err);
        result.innerHTML = '<span class="text-red-500">Camera access denied or unavailable.</span>';
    }
}

// ─── Process Check-In ───────────────────────────────────

async function evtProcessCheckin(eventId, qrToken, resultEl) {
    // Pause scanning
    if (evtScannerAnimFrame) cancelAnimationFrame(evtScannerAnimFrame);

    resultEl.innerHTML = '<span class="text-gray-500">Checking in…</span>';

    try {
        // Check if event requires location sharing
        const event = evtAllEvents.find(e => e.id === eventId);
        if (event?.location_required) {
            // Verify the member has location sharing active
            const { data: locRecord } = await supabaseClient
                .from('event_locations')
                .select('sharing_active')
                .eq('event_id', eventId)
                .eq('user_id', evtCurrentUser.id)
                .maybeSingle();

            // For the HOST scanning tickets: we check the ATTENDEE's location status
            // But since the host is the one scanning, we skip this check for the host themselves
        }

        // 1) Try member RSVP by qr_token
        const { data: rsvp, error: findErr } = await supabaseClient
            .from('event_rsvps')
            .select('id, user_id, status, profiles!event_rsvps_user_id_fkey(first_name, last_name)')
            .eq('event_id', eventId)
            .eq('qr_token', qrToken)
            .maybeSingle();

        if (findErr) throw findErr;

        if (rsvp) {
            // ── Member check-in ──
            const { data: existing } = await supabaseClient
                .from('event_checkins')
                .select('id')
                .eq('event_id', eventId)
                .eq('user_id', rsvp.user_id)
                .maybeSingle();

            if (existing) {
                const name = `${rsvp.profiles?.first_name || ''} ${rsvp.profiles?.last_name || ''}`.trim();
                resultEl.innerHTML = `<span class="text-amber-600">✅ Already checked in — ${evtEscapeHtml(name)}</span>`;
                evtResumeScanner(3000);
                return;
            }

            const { error: ciErr } = await supabaseClient
                .from('event_checkins')
                .insert({
                    event_id: eventId,
                    user_id: rsvp.user_id,
                    checked_in_by: evtCurrentUser.id,
                    checkin_mode: 'attendee_ticket'
                });

            if (ciErr) throw ciErr;

            const name = `${rsvp.profiles?.first_name || ''} ${rsvp.profiles?.last_name || ''}`.trim();
            resultEl.innerHTML = `<span class="text-emerald-600 text-base">✅ Checked in — ${evtEscapeHtml(name)}</span>`;
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            evtResumeScanner(3000);
            return;
        }

        // 2) Try guest RSVP by guest_token
        const { data: guestRsvp, error: gErr } = await supabaseClient
            .from('event_guest_rsvps')
            .select('id, guest_name, guest_email, guest_token, paid')
            .eq('event_id', eventId)
            .eq('guest_token', qrToken)
            .maybeSingle();

        if (gErr) throw gErr;

        if (!guestRsvp || !guestRsvp.paid) {
            resultEl.innerHTML = '<span class="text-red-500">❌ Invalid ticket — no matching RSVP found.</span>';
            evtResumeScanner(3000);
            return;
        }

        // Check if guest already checked in
        const { data: gExisting } = await supabaseClient
            .from('event_checkins')
            .select('id')
            .eq('event_id', eventId)
            .eq('guest_token', guestRsvp.guest_token)
            .maybeSingle();

        if (gExisting) {
            resultEl.innerHTML = `<span class="text-amber-600">✅ Already checked in — ${evtEscapeHtml(guestRsvp.guest_name)} (Guest)</span>`;
            evtResumeScanner(3000);
            return;
        }

        // Create guest check-in
        const { error: gciErr } = await supabaseClient
            .from('event_checkins')
            .insert({
                event_id: eventId,
                guest_token: guestRsvp.guest_token,
                checked_in_by: evtCurrentUser.id,
                checkin_mode: 'attendee_ticket'
            });

        if (gciErr) throw gciErr;

        resultEl.innerHTML = `<span class="text-emerald-600 text-base">✅ Checked in — ${evtEscapeHtml(guestRsvp.guest_name)} (Guest)</span>`;
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        evtResumeScanner(3000);
    } catch (err) {
        console.error('Check-in error:', err);
        resultEl.innerHTML = `<span class="text-red-500">Check-in failed: ${err.message}</span>`;
        evtResumeScanner(3000);
    }
}

// ─── Resume Scanner After Delay ─────────────────────────

function evtResumeScanner(delay) {
    setTimeout(() => {
        if (evtScannerStream) {
            const video = document.getElementById('scannerVideo');
            const canvas = document.getElementById('scannerCanvas');
            const ctx = canvas.getContext('2d');
            const result = document.getElementById('scanResult');
            result.innerHTML = '<span class="text-gray-400">Point camera at next QR code…</span>';

            function tick() {
                if (!evtScannerStream) return;
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    if (typeof jsQR !== 'undefined') {
                        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
                        if (code) {
                            const qrData = evtParseQrData(code.data);
                            if (qrData && qrData.t) {
                                evtProcessCheckin(qrData.e || eventId, qrData.t, result);
                                return;
                            }
                        }
                    }
                }
                evtScannerAnimFrame = requestAnimationFrame(tick);
            }
            evtScannerAnimFrame = requestAnimationFrame(tick);
        }
    }, delay);
}

// ─── Close Scanner ──────────────────────────────────────

function evtCloseScanner() {
    if (evtScannerStream) {
        evtScannerStream.getTracks().forEach(t => t.stop());
        evtScannerStream = null;
    }
    if (evtScannerAnimFrame) {
        cancelAnimationFrame(evtScannerAnimFrame);
        evtScannerAnimFrame = null;
    }
    evtToggleModal('scannerModal', false);
}
