/* ──────────────────────────────────────────
   Public Event — RSVP (member + guest)
   ────────────────────────────────────────── */

function pubRenderRsvpSection(event) {
    const section = document.getElementById('rsvpSection');
    const memberCard = document.getElementById('memberRsvpCard');
    const rsvpEnabled = event.rsvp_enabled !== false;
    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast   = new Date(event.start_date) < new Date() && event.status !== 'active';
    const deadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();

    // For guests: hide member card entirely, unified guest card handles everything
    if (!pubCurrentUser) {
        if (memberCard) memberCard.classList.add('hidden');
        return;
    }

    // Logged-in member — reveal the member RSVP card
    if (memberCard) memberCard.classList.remove('hidden');

    // RSVP disabled for this event — show informational card
    if (!rsvpEnabled) {
        section.innerHTML = `
            <div class="evt-info-card">
                <span class="evt-info-card-icon">ℹ️</span>
                <div>
                    <p class="evt-info-card-title">Informational Event</p>
                    <p class="evt-info-card-sub">RSVP is not required for this event</p>
                </div>
            </div>`;
        return;
    }

    if (isClosed || isPast || deadlinePassed) {
        // Status is already shown in the banner near the date — hide RSVP section entirely
        section.classList.add('hidden');
        // Also hide the divider above it
        const prevDivider = section.previousElementSibling;
        if (prevDivider && prevDivider.tagName === 'HR') prevDivider.classList.add('hidden');
        return;
    }

    // ── Paid RSVP ───────────────────────────────────────
    if (event.pricing_mode === 'paid' && event.rsvp_cost_cents > 0) {
        if (pubCurrentRsvp?.paid) {
            section.innerHTML = `
                <div class="evt-info-card">
                    <span class="evt-info-card-icon">✅</span>
                    <div>
                        <p class="evt-info-card-title">RSVP Confirmed &amp; Paid</p>
                        <p class="evt-info-card-sub">Non-refundable • Contact admin for changes</p>
                    </div>
                </div>`;
        } else {
            section.innerHTML = `
                <div style="text-align:center">
                    <button onclick="pubHandlePaidRsvp()" class="evt-rsvp-pay">
                        💳 RSVP — ${pubFormatCurrency(event.rsvp_cost_cents)}
                    </button>
                    <p style="font-size:13px;color:#b0b0b0;margin-top:10px">Non-refundable unless cancelled by staff${event.raffle_enabled ? ' • Includes raffle entry' : ''}</p>
                </div>`;
        }
        return;
    }

    // ── Free RSVP (any non-paid event) ──────────────────
    const goingCls = pubCurrentRsvp?.status === 'going' ? ' active-going' : '';
    const intCls   = pubCurrentRsvp?.status === 'maybe' ? ' active-interested' : '';

    section.innerHTML = `
        <p style="font-size:12px;font-weight:700;color:#717171;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Your RSVP</p>
        <div class="evt-rsvp-pair" role="group" aria-label="RSVP options">
            <button onclick="pubHandleRsvp('going')" class="evt-rsvp-btn${goingCls}" aria-pressed="${pubCurrentRsvp?.status === 'going'}">
                <span class="evt-rsvp-icon">✅</span> Going
            </button>
            <button onclick="pubHandleRsvp('maybe')" class="evt-rsvp-btn${intCls}" aria-pressed="${pubCurrentRsvp?.status === 'maybe'}">
                <span class="evt-rsvp-icon">❤️</span> Interested
            </button>
        </div>
        ${pubCurrentRsvp ? '<p style="font-size:13px;color:#b0b0b0;text-align:center;margin-top:10px">Tap your current response to cancel</p>' : ''}
    `;
}

/* ── Raffle Section (Public Page) ────────── */

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

function pubRenderGuestRsvpSection(event) {
    const section = document.getElementById('guestRsvpSection');
    if (!section) return;

    // Move to <body> at init so position:fixed always escapes ancestor transform
    // stacking contexts (e.g. evt-fade-in on #eventContent).
    if (section.parentElement !== document.body) {
        document.body.appendChild(section);
    }

    // Hide when RSVP disabled for this event
    if (event.rsvp_enabled === false) {
        section.classList.add('hidden');
        return;
    }

    // Hide for members-only events (show #memberOnlyNotice instead)
    if (event.member_only) {
        section.classList.add('hidden');
        const notice = document.getElementById('memberOnlyNotice');
        if (notice) notice.classList.remove('hidden');
        return;
    }

    // Hide when a member is signed in (they use the member RSVP card)
    if (pubCurrentUser) {
        section.classList.add('hidden');
        return;
    }

    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast   = new Date(event.start_date) < new Date() && event.status !== 'active';
    const deadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();
    if (isClosed || isPast || deadlinePassed) {
        section.classList.add('hidden');
        return;
    }

    // Guest already confirmed — replace card content with confirmation state
    if (pubGuestRsvp) {
        const isPaidGuest = pubGuestRsvp.paid;
        section.classList.remove('hidden');
        section.innerHTML = `
            <div class="evt-info-card">
                <span class="evt-info-card-icon">✅</span>
                <div>
                    <p class="evt-info-card-title">You're RSVP'd!</p>
                    <p class="evt-info-card-sub">${pubEscapeHtml(pubGuestRsvp.guest_name)}${isPaidGuest ? ' · Non-refundable' : ''}</p>
                </div>
            </div>`;
        return;
    }

    // Default: show the unified tab card
    section.classList.remove('hidden');

    // Update button label with price if paid event
    const btn = document.getElementById('guestRsvpBtn');
    if (btn) {
        const cost = event.rsvp_cost_cents || 0;
        btn.textContent = (event.pricing_mode === 'paid' && cost > 0)
            ? `RSVP as Guest — ${pubFormatCurrency(cost)}`
            : 'RSVP as Guest';
    }

    // Show/hide no-refund checkbox (paid events only)
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
                    <div class="evt-info-card">
                        <span style="font-size:1.5rem">✅</span>
                        <div>
                            <p style="font-size:14px;font-weight:700;color:#059669">You're RSVP'd!</p>
                            <p style="font-size:13px;color:#059669">${pubEscapeHtml(name)} · ${pubEscapeHtml(email)}</p>
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
