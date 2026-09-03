// ═══════════════════════════════════════════════════════════
// Portal Events — RSVP + Status Updates
// Supports free RSVP (direct DB) and paid RSVP (Stripe).
// ═══════════════════════════════════════════════════════════

/** Member RSVP counts as "going" for raffle/ticket (parity with public pubHasRaffleEligibleRsvp). */
function evtIsGoingRsvp(rsvp) {
    return !!(rsvp && (rsvp.status === 'going' || rsvp.paid === true));
}

function evtIsRaffleEntriesOpen(event) {
    if (!event) return false;
    const now = new Date();
    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast = new Date(event.start_date) < now && event.status !== 'active';
    const deadlined = event.rsvp_deadline && new Date(event.rsvp_deadline) < now;
    return !isClosed && !isPast && !deadlined;
}

/** Paid events bundle raffle with RSVP checkout (no separate raffle CTA on public page). */
function evtIsRaffleBundledWithPaidRsvp(event) {
    return event.pricing_mode === 'paid' && event.rsvp_enabled !== false;
}

function evtCanEnterMemberRaffle(event, rsvp, myRaffleEntry) {
    if (!event?.raffle_enabled || !evtIsRaffleEntriesOpen(event) || myRaffleEntry) return false;
    if (evtIsRaffleBundledWithPaidRsvp(event)) return !!(rsvp && rsvp.paid === true);
    return evtIsGoingRsvp(rsvp);
}

window.evtIsGoingRsvp = evtIsGoingRsvp;
window.evtIsRaffleEntriesOpen = evtIsRaffleEntriesOpen;
window.evtIsRaffleBundledWithPaidRsvp = evtIsRaffleBundledWithPaidRsvp;
window.evtCanEnterMemberRaffle = evtCanEnterMemberRaffle;

function evtMaskPhoneLast4(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 4) return 'your phone';
    return `***-***-${digits.slice(-4)}`;
}

function evtValidateMemberNoRefund(event, seatRole, hasRequiredDisclaimers) {
    const root = document.getElementById('eventsDetailView') || document;
    const noRefund = root.querySelector('#evtMemberNoRefundCheck');
    if (!noRefund) return true;
    const label = noRefund.closest('label');
    if (label && label.classList.contains('hidden')) return true;
    const seatPrice = evtSeatPriceCents(event, seatRole);
    if (event.pricing_mode === 'paid' && seatPrice > 0 && !hasRequiredDisclaimers && !noRefund.checked) {
        alert('Please accept the no-refund policy to continue.');
        return false;
    }
    return true;
}

async function evtEnsureMemberPhoneForRsvp() {
    if (!globalThis.evtCurrentUser?.id) return null;
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('phone')
        .eq('id', globalThis.evtCurrentUser.id)
        .maybeSingle();
    const existing = (profile?.phone || '').trim();
    if (existing) return existing;

    const inputEl = document.getElementById('evtMemberPhoneInput');
    const raw = (inputEl?.value || '').trim();
    const validated = (window.EventsHelpers && typeof window.EventsHelpers.validatePhone === 'function')
        ? window.EventsHelpers.validatePhone(raw)
        : (raw ? { value: raw } : { error: 'Phone number is required.' });
    if (validated.error) {
        alert(validated.error);
        return null;
    }
    const { error } = await supabaseClient
        .from('profiles')
        .update({ phone: validated.value })
        .eq('id', globalThis.evtCurrentUser.id);
    if (error) {
        alert(error.message || 'Could not save phone number.');
        return null;
    }
    return validated.value;
}

/** Team/mobile RSVP has no SMS checkbox — confirm opt-in when profile has a phone. */
async function evtConfirmMemberSmsOptIn() {
    if (!globalThis.evtCurrentUser?.id) return false;
    const phone = await evtEnsureMemberPhoneForRsvp();
    if (!phone) return false;
    return confirm(
        `Text you event updates at ${evtMaskPhoneLast4(phone)}? Message/data rates may apply. Reply STOP to opt out.`
    );
}

function evtReadSeatRoleFromDetail() {
    const root = document.getElementById('eventsDetailView') || document;
    if (window.EventsPartySeats && typeof window.EventsPartySeats.readPayerRoleFromRoot === 'function') {
        return window.EventsPartySeats.readPayerRoleFromRoot(root);
    }
    if (window.EventsSeatPicker && typeof window.EventsSeatPicker.readRoleFromRoot === 'function') {
        return window.EventsSeatPicker.readRoleFromRoot(root);
    }
    return (window.EventsHelpers && window.EventsHelpers.normalizeSeatRole)
        ? window.EventsHelpers.normalizeSeatRole('adult')
        : 'adult';
}

function evtReadPartySeatsForSubmit(event) {
    const root = document.getElementById('eventsDetailView') || document;
    if (window.EventsPartySeats && typeof window.EventsPartySeats.readSeatsFromRoot === 'function') {
        return window.EventsPartySeats.readSeatsFromRoot(root, event);
    }
    const seatRole = evtReadSeatRoleFromDetail();
    const catalog = (window.EventsIncludedItems && typeof window.EventsIncludedItems.normalizeIncludedItems === 'function')
        ? window.EventsIncludedItems.normalizeIncludedItems(event.included_items)
        : [];
    let seat_options = {};
    if (window.EventsIncludedItems && catalog.length) {
        seat_options = window.EventsIncludedItems.readAnswersFromRoot(root, catalog, seatRole);
    }
    const displayName = (typeof globalThis.evtMemberDisplayName === 'function')
        ? globalThis.evtMemberDisplayName()
        : 'Member';
    return [{
        role: seatRole,
        display_name: displayName,
        is_payer: true,
        ...(Object.keys(seat_options).length ? { options: seat_options } : {}),
    }];
}

function evtValidatePartySeatsForSubmit(event, seats) {
    const catalog = (window.EventsIncludedItems && typeof window.EventsIncludedItems.normalizeIncludedItems === 'function')
        ? window.EventsIncludedItems.normalizeIncludedItems(event.included_items)
        : [];
    if (window.EventsPartySeats && typeof window.EventsPartySeats.validatePartySeats === 'function') {
        return window.EventsPartySeats.validatePartySeats(event, seats, catalog, {
            allowIncompleteGuests: true,
        });
    }
    return null;
}

function evtPartyTotalForSubmit(event) {
    const root = document.getElementById('eventsDetailView') || document;
    if (window.EventsPartySeats && typeof window.EventsPartySeats.partyBaseTotalCents === 'function') {
        const seats = window.EventsPartySeats.readSeatsFromRoot(root, event);
        return window.EventsPartySeats.partyBaseTotalCents(event, seats);
    }
    return evtSeatPriceCents(event, evtReadSeatRoleFromDetail());
}

function evtSeatPriceCents(event, role) {
    if (window.EventsHelpers && typeof window.EventsHelpers.seatPriceCents === 'function') {
        return window.EventsHelpers.seatPriceCents(event, role);
    }
    return Number(event?.rsvp_cost_cents || 0);
}

async function evtHandleRsvp(eventId, status) {
    try {
        // Look up event to check pricing mode
        const event = (window.evtAllEvents || globalThis.evtAllEvents).find(e => e.id === eventId);
        if (!event) return;

        // ── Time-based guard (defense-in-depth) ─────────────
        const now = new Date();
        const isClosed  = event.status === 'completed' || event.status === 'cancelled';
        const isPast    = new Date(event.start_date) < now && event.status !== 'active';
        const deadlined = event.rsvp_deadline && new Date(event.rsvp_deadline) < now;
        if (isClosed || isPast || deadlined) {
            alert('RSVPs are closed for this event.');
            return;
        }

        const isPaidEvent = event.pricing_mode === 'paid';
        const rsvpMap = window.evtAllRsvps || globalThis.evtAllRsvps;
        const existing = rsvpMap[eventId];
        const catalog = (window.EventsIncludedItems && typeof window.EventsIncludedItems.normalizeIncludedItems === 'function')
            ? window.EventsIncludedItems.normalizeIncludedItems(event.included_items)
            : [];
        const seatRole = status === 'going' ? evtReadSeatRoleFromDetail() : 'adult';
        const discCatalog = (window.EventsDisclaimers && typeof window.EventsDisclaimers.effectiveDisclaimers === 'function')
            ? window.EventsDisclaimers.effectiveDisclaimers(event)
            : ((window.EventsDisclaimers && typeof window.EventsDisclaimers.normalizeDisclaimers === 'function')
                ? window.EventsDisclaimers.normalizeDisclaimers(event.disclaimers)
                : []);
        const hasRequiredDisclaimers = (window.EventsDisclaimers && typeof window.EventsDisclaimers.hasRequiredDisclaimers === 'function')
            ? window.EventsDisclaimers.hasRequiredDisclaimers(discCatalog)
            : discCatalog.some((d) => d.required);
        const needsAmenityVote = (window.EventsAmenityVoting && typeof window.EventsAmenityVoting.needsVote === 'function')
            ? window.EventsAmenityVoting.needsVote(event)
            : false;
        const hasIncludedCatalog = window.EventsIncludedItems
            && typeof window.EventsIncludedItems.hasCatalog === 'function'
            && window.EventsIncludedItems.hasCatalog(event.included_items);
        const root = document.getElementById('eventsDetailView') || document;
        let seats = [];
        if (status === 'going') {
            seats = evtReadPartySeatsForSubmit(event);
            const seatsErr = evtValidatePartySeatsForSubmit(event, seats);
            if (seatsErr) {
                alert(seatsErr);
                return;
            }
        }
        let disclaimer_acks = [];
        if (status === 'going' && hasRequiredDisclaimers) {
            disclaimer_acks = window.EventsDisclaimers.readAckIdsFromRoot(root, discCatalog);
            const ackErr = window.EventsDisclaimers.validateAcks(discCatalog, disclaimer_acks);
            if (ackErr) {
                if (typeof window.EventsDisclaimers.scrollToAckField === 'function') {
                    window.EventsDisclaimers.scrollToAckField(root);
                }
                alert(ackErr);
                return;
            }
        }
        let amenity_vote_option_id = null;
        if (status === 'going' && needsAmenityVote) {
            const amenityCfg = window.EventsAmenityVoting.normalizeConfig(event.amenity_voting);
            amenity_vote_option_id = window.EventsAmenityVoting.readVoteFromRoot(root) || '';
            const voteErr = window.EventsAmenityVoting.validateVote(amenityCfg, amenity_vote_option_id);
            if (voteErr) {
                if (typeof window.EventsAmenityVoting.scrollToVoteField === 'function') {
                    window.EventsAmenityVoting.scrollToVoteField(root);
                }
                alert(voteErr);
                return;
            }
        }
        if (status === 'going' && window.EventsInvestAck) {
            const investErr = window.EventsInvestAck.validateAck(event, root);
            if (investErr) {
                alert(investErr);
                return;
            }
        }
        const investAcknowledged = window.EventsInvestAck
            && window.EventsInvestAck.isRequired(event)
            && window.EventsInvestAck.readAcknowledgedFromRoot(root);
        const showPartySeats = !!(window.EventsPartySeats
            && typeof window.EventsPartySeats.shouldShow === 'function'
            && window.EventsPartySeats.shouldShow(event, { isHost: false }));
        const needsPartyEdge = status === 'going'
            && (hasIncludedCatalog || hasRequiredDisclaimers || showPartySeats || needsAmenityVote);
        const partyTotal = status === 'going' ? evtPartyTotalForSubmit(event) : 0;
        const needsPaidCheckout = isPaidEvent && status === 'going' && partyTotal > 0;
        const needsPaymentChoice = window.EventsPaymentChoice
            && typeof window.EventsPaymentChoice.needsChoice === 'function'
            && window.EventsPaymentChoice.needsChoice(event, partyTotal);
        let paymentChoice = null;
        if (needsPaidCheckout && needsPaymentChoice) {
            paymentChoice = window.EventsPaymentChoice.readFromRoot(root);
            const payErr = window.EventsPaymentChoice.validateChoice(event, paymentChoice, partyTotal);
            if (payErr) {
                if (typeof window.EventsPaymentChoice.scrollToField === 'function') {
                    window.EventsPaymentChoice.scrollToField(root);
                }
                alert(payErr);
                return;
            }
        }

        let memberPhonePayload = {};
        if (status === 'going') {
            const phone = await evtEnsureMemberPhoneForRsvp();
            if (!phone) return;
            memberPhonePayload = { phone };
        }

        // ── Paid RSVP path (seat price > 0) ─────────────────
        if (needsPaidCheckout) {
            // If already paid, don't re-charge
            if (existing?.paid) {
                alert('You have already paid for this RSVP.');
                return;
            }

            if (!evtValidateMemberNoRefund(event, seatRole, hasRequiredDisclaimers)) return;

            const confirmMsg = (needsPaymentChoice && paymentChoice && window.EventsPaymentChoice.confirmMessage)
                ? window.EventsPaymentChoice.confirmMessage(event, paymentChoice, partyTotal)
                : (hasRequiredDisclaimers
                    ? `RSVP costs ${formatCurrency(partyTotal)}.\n\nProceed to checkout?`
                    : null);
            if (confirmMsg && !confirm(confirmMsg)) return;

            const { url } = await callEdgeFunction('create-event-checkout', {
                event_id: eventId,
                type: 'rsvp',
                seats,
                seat_role: seatRole,
                ...memberPhonePayload,
                ...(hasRequiredDisclaimers ? { disclaimer_acks } : {}),
                ...(needsAmenityVote ? { amenity_vote_option_id } : {}),
                ...(needsPaymentChoice && paymentChoice ? {
                    plan_kind: paymentChoice.plan_kind,
                    method: paymentChoice.method,
                } : {}),
                ...(investAcknowledged ? { invest_eligible_acknowledged: true } : {}),
            });

            if (url) {
                window.location.href = url;
            }
            return;
        }

        // ── Going with party/seat (free kid on paid event, options, disclaimers, seat role) ─
        if (status === 'going' && needsPartyEdge && !needsPaidCheckout) {
            if (existing?.paid) {
                alert('Paid RSVPs cannot be changed. Contact an admin for assistance.');
                return;
            }
            if (existing?.status === 'going') {
                const result = await callEdgeFunction('rsvp-member-party', {
                    event_id: eventId,
                    seats,
                    seat_role: seatRole,
                    ...memberPhonePayload,
                    ...(hasRequiredDisclaimers ? { disclaimer_acks } : {}),
                    ...(needsAmenityVote ? { amenity_vote_option_id } : {}),
                });
                if (result?.rsvp) {
                    globalThis.evtAllRsvps[eventId] = result.rsvp;
                    window.evtAllRsvps = window.evtAllRsvps || {};
                    window.evtAllRsvps[eventId] = result.rsvp;
                }
                evtRenderEvents();
                await globalThis.evtOpenDetail(eventId);
                return;
            }
            const result = await callEdgeFunction('rsvp-member-party', {
                event_id: eventId,
                seats,
                seat_role: seatRole,
                ...memberPhonePayload,
                ...(hasRequiredDisclaimers ? { disclaimer_acks } : {}),
                ...(needsAmenityVote ? { amenity_vote_option_id } : {}),
            });
            if (result?.rsvp) {
                globalThis.evtAllRsvps[eventId] = result.rsvp;
                window.evtAllRsvps = window.evtAllRsvps || {};
                window.evtAllRsvps[eventId] = result.rsvp;
            }

            let wantSmsOptIn = false;
            const smsCheck = document.getElementById('evtSmsOptInCheck');
            if (smsCheck?.checked) {
                wantSmsOptIn = true;
            } else if (!smsCheck) {
                wantSmsOptIn = await evtConfirmMemberSmsOptIn();
            }

            evtRenderEvents();
            await globalThis.evtOpenDetail(eventId);
            if (wantSmsOptIn) {
                await evtHandleEventSmsOptIn(eventId, true);
            }
            if (window.evtCtaRaffleIntent === eventId) {
                window.evtCtaRaffleIntent = null;
                evtOpenCtaPanel('raffle', eventId);
            }
            return;
        }

        // ── Free RSVP path (original logic) ─────────────────
        if (status === 'going' && hasRequiredDisclaimers) {
            if (existing?.paid) {
                alert('Paid RSVPs cannot be changed. Contact an admin for assistance.');
                return;
            }
            const result = await callEdgeFunction('rsvp-member-party', {
                event_id: eventId,
                seats,
                seat_role: seatRole,
                ...memberPhonePayload,
                disclaimer_acks,
                ...(needsAmenityVote ? { amenity_vote_option_id } : {}),
            });
            if (result?.rsvp) {
                globalThis.evtAllRsvps[eventId] = result.rsvp;
                window.evtAllRsvps = window.evtAllRsvps || {};
                window.evtAllRsvps[eventId] = result.rsvp;
            }
            evtRenderEvents();
            await globalThis.evtOpenDetail(eventId);
            return;
        }

        if (status === 'going' && needsAmenityVote) {
            if (existing?.paid) {
                alert('Paid RSVPs cannot be changed. Contact an admin for assistance.');
                return;
            }
            const result = await callEdgeFunction('rsvp-member-party', {
                event_id: eventId,
                seats,
                seat_role: seatRole,
                ...memberPhonePayload,
                amenity_vote_option_id,
            });
            if (result?.rsvp) {
                globalThis.evtAllRsvps[eventId] = result.rsvp;
                window.evtAllRsvps = window.evtAllRsvps || {};
                window.evtAllRsvps[eventId] = result.rsvp;
            }
            evtRenderEvents();
            await globalThis.evtOpenDetail(eventId);
            return;
        }

        if (existing) {
            // Block toggle-off for paid RSVPs (no self-refund)
            if (existing.paid) {
                alert('Paid RSVPs cannot be cancelled. Contact an admin for assistance.');
                return;
            }

            // If clicking same status, remove RSVP (toggle off)
            if (existing.status === status) {
                const { error } = await supabaseClient
                    .from('event_rsvps')
                    .delete()
                    .eq('id', existing.id);
                if (error) throw error;
                delete globalThis.evtAllRsvps[eventId];
                if (window.evtAllRsvps) delete window.evtAllRsvps[eventId];
            } else {
                // Update status
                const { error } = await supabaseClient
                    .from('event_rsvps')
                    .update({ status })
                    .eq('id', existing.id);
                if (error) throw error;
                if (globalThis.evtAllRsvps[eventId]) globalThis.evtAllRsvps[eventId].status = status;
                if (window.evtAllRsvps?.[eventId]) window.evtAllRsvps[eventId].status = status;
            }
        } else {
            // Create or restore free RSVP. Local state can be stale after login,
            // so upsert protects the unique (event_id, user_id) row.
            const { data, error } = await supabaseClient
                .from('event_rsvps')
                .upsert({ event_id: eventId, user_id: globalThis.evtCurrentUser.id, status }, { onConflict: 'event_id,user_id' })
                .select()
                .single();
            if (error) throw error;
            globalThis.evtAllRsvps[eventId] = data;
            window.evtAllRsvps = window.evtAllRsvps || {};
            window.evtAllRsvps[eventId] = data;
        }

        let wantSmsOptIn = false;
        if (status === 'going') {
            const smsCheck = document.getElementById('evtSmsOptInCheck');
            if (smsCheck?.checked) {
                wantSmsOptIn = true;
            } else if (!smsCheck) {
                wantSmsOptIn = await evtConfirmMemberSmsOptIn();
            }
        }

        // Refresh detail and card list
        evtRenderEvents();
        await globalThis.evtOpenDetail(eventId);

        if (wantSmsOptIn) {
            await evtHandleEventSmsOptIn(eventId, true);
        }

        if (status === 'going' && window.evtCtaRaffleIntent === eventId) {
            window.evtCtaRaffleIntent = null;
            evtOpenCtaPanel('raffle', eventId);
        }
    } catch (err) {
        console.error('RSVP error:', err);
        alert('Failed to update RSVP. Please try again.');
    }
}

async function evtHandleEventSmsOptIn(eventId, optIn) {
    try {
        await callEdgeFunction('upsert-event-sms-recipient', {
            event_id: eventId,
            sms_opt_in: !!optIn,
            sms_consent_text_version: 'event_sms_v1',
        });
    } catch (err) {
        console.error('Event SMS preference error:', err);
        alert(err.message || 'Failed to save SMS preference. Please try again.');
        const checkbox = document.getElementById('evtSmsOptInCheck');
        if (checkbox) checkbox.checked = !optIn;
    }
}

// ─── Paid Raffle Entry (Free Event + Paid Raffle mode) ──

async function evtHandleRaffleEntry(eventId) {
    try {
        const event = globalThis.evtAllEvents.find(e => e.id === eventId);
        if (!event || !event.raffle_enabled) return;

        // ── Time-based guard (defense-in-depth) ─────────────
        const now = new Date();
        const isClosed  = event.status === 'completed' || event.status === 'cancelled';
        const isPast    = new Date(event.start_date) < now && event.status !== 'active';
        const deadlined = event.rsvp_deadline && new Date(event.rsvp_deadline) < now;
        if (isClosed || isPast || deadlined) {
            alert('Raffle entries are closed for this event.');
            return;
        }

        if (!event.raffle_entry_cost_cents) {
            alert('Use Enter Raffle — Free for no-cost raffle entries.');
            return;
        }

        const rsvp = (window.evtAllRsvps || globalThis.evtAllRsvps)[eventId];
        if (evtIsRaffleBundledWithPaidRsvp(event)) {
            alert('Raffle entry is included with your paid RSVP for this event.');
            return;
        }
        if (!evtIsGoingRsvp(rsvp)) {
            alert('Please RSVP before entering the raffle.');
            return;
        }

        const confirmPay = confirm(
            `Raffle entry costs ${formatCurrency(event.raffle_entry_cost_cents)}.\n\n` +
            'Raffle entry is non-refundable. Proceed to checkout?'
        );
        if (!confirmPay) return;

        const { url } = await callEdgeFunction('create-event-checkout', {
            event_id: eventId,
            type: 'raffle_entry',
        });

        if (url) {
            window.location.href = url;
        }
    } catch (err) {
        console.error('Raffle entry error:', err);
        alert('Failed to start raffle entry checkout. Please try again.');
    }
}

// ─── Free Raffle Entry (Signed-in Member) ───────────────

async function evtHandleFreeRaffleEntry(eventId) {
    try {
        const event = globalThis.evtAllEvents.find(e => e.id === eventId);
        if (!event || !event.raffle_enabled) return;

        const now = new Date();
        const isClosed  = event.status === 'completed' || event.status === 'cancelled';
        const isPast    = new Date(event.start_date) < now && event.status !== 'active';
        const deadlined = event.rsvp_deadline && new Date(event.rsvp_deadline) < now;
        if (isClosed || isPast || deadlined) {
            alert('Raffle entries are closed for this event.');
            return;
        }

        const { data: session } = await supabaseClient.auth.getSession();
        if (!session?.session?.user) { alert('Please sign in to enter.'); return; }

        const rsvp = (window.evtAllRsvps || globalThis.evtAllRsvps)[eventId];
        if (evtIsRaffleBundledWithPaidRsvp(event)) {
            alert('Raffle entry is included with your paid RSVP for this event.');
            return;
        }
        if (!evtIsGoingRsvp(rsvp)) {
            alert('Please RSVP before entering the raffle.');
            return;
        }

        const { error } = await supabaseClient
            .from('event_raffle_entries')
            .upsert({ event_id: eventId, user_id: session.session.user.id, paid: true }, { onConflict: 'event_id,user_id' });

        if (error) throw error;

        alert('You\'re entered into the raffle! Good luck! 🎟️');
        globalThis.evtOpenDetail(eventId);
    } catch (err) {
        console.error('Free raffle entry error:', err);
        alert(err.message || 'Failed to enter raffle. Please try again.');
    }
}

// ─── Event Status Updates ───────────────────────────────

async function evtUpdateStatus(eventId, newStatus) {
    if (newStatus === 'cancelled' && !confirm('Are you sure you want to cancel this event?')) return;
    if (newStatus === 'completed' && !confirm('Mark this event as completed?')) return;

    try {
        const { error } = await supabaseClient
            .from('events')
            .update({ status: newStatus })
            .eq('id', eventId);
        if (error) throw error;

        await globalThis.evtLoadEvents();
        globalThis.evtNavigateToList();
    } catch (err) {
        console.error('Status update error:', err);
        alert('Failed to update event status.');
    }
}

// ═══════════════════════════════════════════════════════════
// LLC Event Actions — Waitlist, Cancel, Reschedule, Duplicate
// ═══════════════════════════════════════════════════════════

// ─── Join Waitlist ──────────────────────────────────────

async function evtJoinWaitlist(eventId) {
    try {
        // Get the next position
        const { data: maxPos } = await supabaseClient
            .from('event_waitlist')
            .select('position')
            .eq('event_id', eventId)
            .order('position', { ascending: false })
            .limit(1)
            .maybeSingle();

        const nextPos = (maxPos?.position || 0) + 1;

        const { error } = await supabaseClient
            .from('event_waitlist')
            .insert({
                event_id: eventId,
                user_id: globalThis.evtCurrentUser.id,
                position: nextPos,
                status: 'waiting',
            });
        if (error) throw error;

        alert(`You're #${nextPos} on the waitlist! We'll notify you if a spot opens.`);
        await globalThis.evtOpenDetail(eventId);
    } catch (err) {
        console.error('Join waitlist error:', err);
        alert(err.message?.includes('duplicate') ? 'You are already on the waitlist.' : 'Failed to join waitlist.');
    }
}

// ─── Leave Waitlist ─────────────────────────────────────

async function evtLeaveWaitlist(eventId) {
    if (!confirm('Leave the waitlist for this event?')) return;
    try {
        const { error } = await supabaseClient
            .from('event_waitlist')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', globalThis.evtCurrentUser.id);
        if (error) throw error;

        await globalThis.evtOpenDetail(eventId);
    } catch (err) {
        console.error('Leave waitlist error:', err);
        alert('Failed to leave waitlist.');
    }
}

// ─── Claim Waitlist Spot (triggers paid RSVP) ──────────

async function evtClaimWaitlistSpot(eventId) {
    try {
        const event = globalThis.evtAllEvents.find(e => e.id === eventId);
        if (!event) return;

        const root = document.getElementById('eventsDetailView') || document;
        const discCatalog = (window.EventsDisclaimers && typeof window.EventsDisclaimers.effectiveDisclaimers === 'function')
            ? window.EventsDisclaimers.effectiveDisclaimers(event)
            : [];
        const hasRequiredDisclaimers = (window.EventsDisclaimers && typeof window.EventsDisclaimers.hasRequiredDisclaimers === 'function')
            ? window.EventsDisclaimers.hasRequiredDisclaimers(discCatalog)
            : discCatalog.some((d) => d.required);
        const needsAmenityVote = (window.EventsAmenityVoting && typeof window.EventsAmenityVoting.needsVote === 'function')
            ? window.EventsAmenityVoting.needsVote(event)
            : false;
        const seatRole = evtReadSeatRoleFromDetail();
        const seats = evtReadPartySeatsForSubmit(event);
        const seatsErr = evtValidatePartySeatsForSubmit(event, seats);
        if (seatsErr) {
            alert(seatsErr);
            return;
        }
        let disclaimer_acks = [];
        if (hasRequiredDisclaimers) {
            disclaimer_acks = window.EventsDisclaimers.readAckIdsFromRoot(root, discCatalog);
            const ackErr = window.EventsDisclaimers.validateAcks(discCatalog, disclaimer_acks);
            if (ackErr) {
                if (typeof window.EventsDisclaimers.scrollToAckField === 'function') {
                    window.EventsDisclaimers.scrollToAckField(root);
                }
                alert(ackErr);
                return;
            }
        }
        let amenity_vote_option_id = null;
        if (needsAmenityVote) {
            const amenityCfg = window.EventsAmenityVoting.normalizeConfig(event.amenity_voting);
            amenity_vote_option_id = window.EventsAmenityVoting.readVoteFromRoot(root) || '';
            const voteErr = window.EventsAmenityVoting.validateVote(amenityCfg, amenity_vote_option_id);
            if (voteErr) {
                if (typeof window.EventsAmenityVoting.scrollToVoteField === 'function') {
                    window.EventsAmenityVoting.scrollToVoteField(root);
                }
                alert(voteErr);
                return;
            }
        }

        const partyTotal = evtPartyTotalForSubmit(event);
        const needsPaymentChoice = window.EventsPaymentChoice
            && typeof window.EventsPaymentChoice.needsChoice === 'function'
            && window.EventsPaymentChoice.needsChoice(event, partyTotal);
        let paymentChoice = null;
        if (needsPaymentChoice) {
            paymentChoice = window.EventsPaymentChoice.readFromRoot(root);
            const payErr = window.EventsPaymentChoice.validateChoice(event, paymentChoice, partyTotal);
            if (payErr) {
                if (typeof window.EventsPaymentChoice.scrollToField === 'function') {
                    window.EventsPaymentChoice.scrollToField(root);
                }
                alert(payErr);
                return;
            }
        }

        const waitlistConfirm = (needsPaymentChoice && paymentChoice && window.EventsPaymentChoice.confirmMessage)
            ? `A spot has opened up!\n\n${window.EventsPaymentChoice.confirmMessage(event, paymentChoice, partyTotal)}`
            : (hasRequiredDisclaimers
                ? `A spot has opened up!\n\nRSVP costs ${formatCurrency(partyTotal)}.\n\nProceed to checkout?`
                : null);
        if (waitlistConfirm && !confirm(waitlistConfirm)) return;

        if (!evtValidateMemberNoRefund(event, seatRole, hasRequiredDisclaimers)) return;

        if (window.EventsInvestAck) {
            const investErr = window.EventsInvestAck.validateAck(event, root);
            if (investErr) {
                alert(investErr);
                return;
            }
        }
        const investAcknowledged = window.EventsInvestAck
            && window.EventsInvestAck.isRequired(event)
            && window.EventsInvestAck.readAcknowledgedFromRoot(root);

        const phone = await evtEnsureMemberPhoneForRsvp();
        if (!phone) return;

        // Update waitlist status to 'claimed' so the spot is held
        await supabaseClient
            .from('event_waitlist')
            .update({ status: 'claimed' })
            .eq('event_id', eventId)
            .eq('user_id', globalThis.evtCurrentUser.id);

        // Redirect to Stripe checkout
        const { url } = await callEdgeFunction('create-event-checkout', {
            event_id: eventId,
            type: 'rsvp',
            from_waitlist: true,
            seats,
            seat_role: seatRole,
            phone,
            ...(hasRequiredDisclaimers ? { disclaimer_acks } : {}),
            ...(needsAmenityVote ? { amenity_vote_option_id } : {}),
            ...(needsPaymentChoice && paymentChoice ? {
                plan_kind: paymentChoice.plan_kind,
                method: paymentChoice.method,
            } : {}),
            ...(investAcknowledged ? { invest_eligible_acknowledged: true } : {}),
        });

        if (url) {
            window.location.href = url;
        }
    } catch (err) {
        console.error('Claim waitlist error:', err);
        alert('Failed to claim waitlist spot. Please try again.');
    }
}

// ─── Cancel Event (status only — no in-app refunds) ─────

async function evtCancelEvent(eventId) {
    const event = globalThis.evtAllEvents.find(e => e.id === eventId);
    if (!event) return;

    const isLlc = event.event_type === 'llc';
    let cancellationNote = '';

    if (isLlc) {
        cancellationNote = prompt('Cancellation reason (visible to attendees):');
        if (cancellationNote === null) return;
    }

    if (!confirm(
        'Cancel this event?\n\nPaid attendees will NOT be auto-refunded. Rare exceptions are manager-approved out-of-band via Stripe Dashboard.',
    )) return;

    try {
        const result = await callEdgeFunction('process-event-cancellation', {
            event_id: eventId,
            reason: 'event_cancelled',
            cancellation_note: cancellationNote || 'Event cancelled by host',
        });

        alert(result.message || 'Event cancelled. Payments were not refunded in-app.');
        await globalThis.evtLoadEvents();
        globalThis.evtNavigateToList();
    } catch (err) {
        console.error('Cancel event error:', err);
        alert('Failed to cancel event: ' + (err.message || 'Unknown error'));
    }
}

// ─── Reschedule Event (no grace refund window) ──────────

async function evtRescheduleEvent(eventId) {
    const event = globalThis.evtAllEvents.find(e => e.id === eventId);
    if (!event) return;

    const newDate = prompt('Enter new start date & time (YYYY-MM-DD HH:MM):', '');
    if (!newDate) return;

    const parsed = new Date(newDate.replace(' ', 'T'));
    if (isNaN(parsed.getTime())) {
        alert('Invalid date format. Use YYYY-MM-DD HH:MM');
        return;
    }
    if (parsed <= new Date()) {
        alert('New date must be in the future.');
        return;
    }

    const confirmMsg = `Reschedule this event to ${parsed.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })} at ${parsed.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}?\n\nPayments remain non-refundable in-app.`;
    if (!confirm(confirmMsg)) return;

    try {
        const now = new Date();

        const { error } = await supabaseClient
            .from('events')
            .update({
                original_start_date: event.original_start_date || event.start_date,
                start_date: parsed.toISOString(),
                rescheduled_at: now.toISOString(),
                grace_window_end: null,
            })
            .eq('id', eventId);
        if (error) throw error;

        await supabaseClient
            .from('event_rsvps')
            .update({ grace_refund_eligible: false })
            .eq('event_id', eventId)
            .eq('grace_refund_eligible', true);

        alert('Event rescheduled. Payments are not refunded in-app.');
        await globalThis.evtLoadEvents();
        await globalThis.evtOpenDetail(eventId);
    } catch (err) {
        console.error('Reschedule error:', err);
        alert('Failed to reschedule event.');
    }
}

// ─── Grace refund disabled (§13.10 line 442) ────────────

async function evtRequestGraceRefund(_eventId) {
    alert('In-app refunds are disabled. Contact a host — rare exceptions are processed out-of-band in Stripe Dashboard.');
}

// ─── Duplicate Event ────────────────────────────────────

async function evtDeleteEvent(eventId) {
    const event = globalThis.evtAllEvents.find(e => e.id === eventId);
    if (!event) return;

    // Only allow admins to delete
    if (typeof canManageEvents !== 'function' || !canManageEvents()) {
        alert('Only users with event management permission can delete events.');
        return;
    }

    // Require typing the event title to confirm
    const typed = prompt(`This will permanently delete "${event.title}" and all associated RSVPs, check-ins, raffle entries, documents, and photos.\n\nType the event title to confirm:`);
    if (!typed || typed.trim() !== event.title.trim()) {
        if (typed !== null) alert('Event title did not match. Deletion cancelled.');
        return;
    }

    try {
        // CASCADE on FK handles child records (rsvps, checkins, guest_rsvps, raffle_entries, raffle_winners, cost_items, documents, photos, waitlist, hosts, checkins, locations, competition tables)
        const { error } = await supabaseClient
            .from('events')
            .delete()
            .eq('id', eventId);
        if (error) throw error;

        alert('Event deleted successfully.');
        globalThis.evtNavigateToList();
        await globalThis.evtLoadEvents();
    } catch (err) {
        console.error('Delete event error:', err);
        alert('Failed to delete event: ' + (err.message || 'Unknown error'));
    }
}

async function evtDuplicateEvent(eventId) {
    const event = globalThis.evtAllEvents.find(e => e.id === eventId);
    if (!event) return;

    if (!confirm('Create a duplicate of this event? It will open in draft mode for editing.')) return;

    try {
        // Build new record without system-generated fields
        const newSlug = evtGenerateSlug(event.title + ' copy');
        const record = {
            title: event.title + ' (Copy)',
            slug: newSlug,
            description: event.description,
            event_type: event.event_type,
            category: event.category,
            member_only: event.member_only,
            banner_url: event.banner_url,
            location_text: event.location_text,
            location_url: event.location_url,
            gate_time: event.gate_time,
            gate_location: event.gate_location,
            gate_notes: event.gate_notes,
            gated_notes: event.gated_notes,
            max_participants: event.max_participants,
            pricing_mode: event.pricing_mode,
            rsvp_cost_cents: event.rsvp_cost_cents,
            raffle_enabled: event.raffle_enabled,
            raffle_prizes: event.raffle_prizes,
            raffle_entry_cost_cents: event.raffle_entry_cost_cents,
            checkin_mode: event.checkin_mode,
            created_by: globalThis.evtCurrentUser.id,
            status: 'draft',
            // LLC fields
            llc_cut_pct: event.llc_cut_pct,
            invest_eligible: event.invest_eligible,
            min_participants: event.min_participants,
            cost_breakdown: event.cost_breakdown,
            transportation_mode: event.transportation_mode,
            transportation_estimate_cents: event.transportation_estimate_cents,
            location_required: event.location_required,
        };

        // Remove null/undefined values
        Object.keys(record).forEach(k => { if (record[k] == null) delete record[k]; });

        const { data: newEvent, error } = await supabaseClient
            .from('events')
            .insert(record)
            .select()
            .single();
        if (error) throw error;

        // Duplicate cost items if LLC
        if (event.event_type === 'llc') {
            const { data: origItems } = await supabaseClient
                .from('event_cost_items')
                .select('*')
                .eq('event_id', eventId)
                .order('sort_order');

            if (origItems && origItems.length > 0) {
                const newItems = origItems.map(item => ({
                    event_id: newEvent.id,
                    name: item.name,
                    category: item.category,
                    total_cost_cents: item.total_cost_cents,
                    included_in_buyin: item.included_in_buyin,
                    avg_per_person_cents: item.avg_per_person_cents,
                    notes: item.notes,
                    sort_order: item.sort_order,
                }));

                await supabaseClient.from('event_cost_items').insert(newItems);
            }
        }

        alert('Event duplicated! Opening the copy in draft mode.');
        await globalThis.evtLoadEvents();
        const dupEvent = globalThis.evtAllEvents.find(e => e.id === newEvent.id);
        if (dupEvent && dupEvent.slug) {
            globalThis.evtNavigateToEvent(dupEvent.slug);
        } else {
            await globalThis.evtOpenDetail(newEvent.id);
        }
    } catch (err) {
        console.error('Duplicate event error:', err);
        alert('Failed to duplicate event: ' + (err.message || 'Unknown error'));
    }
}

// ESM surface (Phase 7); window.* kept for onclick / classic callers until full import migration.
export {
    evtIsGoingRsvp,
    evtIsRaffleEntriesOpen,
    evtIsRaffleBundledWithPaidRsvp,
    evtCanEnterMemberRaffle,
    evtHandleRsvp,
    evtHandleEventSmsOptIn,
    evtHandleRaffleEntry,
    evtHandleFreeRaffleEntry,
    evtUpdateStatus,
    evtJoinWaitlist,
    evtLeaveWaitlist,
    evtClaimWaitlistSpot,
    evtCancelEvent,
    evtRescheduleEvent,
    evtRequestGraceRefund,
    evtDeleteEvent,
    evtDuplicateEvent,
};

import { publishGlobals } from '../compat/publish-globals.js';
publishGlobals({
    evtIsGoingRsvp,
    evtIsRaffleEntriesOpen,
    evtIsRaffleBundledWithPaidRsvp,
    evtCanEnterMemberRaffle,
    evtHandleRsvp,
    evtHandleEventSmsOptIn,
    evtHandleRaffleEntry,
    evtHandleFreeRaffleEntry,
    evtUpdateStatus,
    evtJoinWaitlist,
    evtLeaveWaitlist,
    evtClaimWaitlistSpot,
    evtCancelEvent,
    evtRescheduleEvent,
    evtRequestGraceRefund,
    evtDeleteEvent,
    evtDuplicateEvent,
});
