// ═══════════════════════════════════════════════════════════
// Portal Events — RSVP + Status Updates
// Supports free RSVP (direct DB) and paid RSVP (Stripe).
// ═══════════════════════════════════════════════════════════

async function evtHandleRsvp(eventId, status) {
    try {
        // Look up event to check pricing mode
        const event = evtAllEvents.find(e => e.id === eventId);
        const isPaid = event && event.pricing_mode === 'paid' && event.rsvp_cost_cents > 0;
        const existing = evtAllRsvps[eventId];

        // ── Paid RSVP path ──────────────────────────────────
        if (isPaid && status === 'going') {
            // If already paid, don't re-charge
            if (existing?.paid) {
                alert('You have already paid for this RSVP.');
                return;
            }

            // Show no-refund disclaimer before checkout
            const confirmPay = confirm(
                `RSVP costs ${formatCurrency(event.rsvp_cost_cents)}.\n\n` +
                'By completing your RSVP, you agree that your payment is non-refundable ' +
                'unless this event is cancelled or rescheduled by LLC staff.\n\n' +
                'Proceed to checkout?'
            );
            if (!confirmPay) return;

            // Call edge function → Stripe checkout
            const { url } = await callEdgeFunction('create-event-checkout', {
                event_id: eventId,
                type: 'rsvp',
            });

            if (url) {
                window.location.href = url;
            }
            return;
        }

        // ── Free RSVP path (original logic) ─────────────────
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
                delete evtAllRsvps[eventId];
            } else {
                // Update status
                const { error } = await supabaseClient
                    .from('event_rsvps')
                    .update({ status })
                    .eq('id', existing.id);
                if (error) throw error;
                evtAllRsvps[eventId].status = status;
            }
        } else {
            // Create new free RSVP
            const { data, error } = await supabaseClient
                .from('event_rsvps')
                .insert({ event_id: eventId, user_id: evtCurrentUser.id, status })
                .select()
                .single();
            if (error) throw error;
            evtAllRsvps[eventId] = data;
        }

        // Refresh detail and card list
        evtRenderEvents();
        await evtOpenDetail(eventId);
    } catch (err) {
        console.error('RSVP error:', err);
        alert('Failed to update RSVP. Please try again.');
    }
}

// ─── Paid Raffle Entry (Free Event + Paid Raffle mode) ──

async function evtHandleRaffleEntry(eventId) {
    try {
        const event = evtAllEvents.find(e => e.id === eventId);
        if (!event || !event.raffle_enabled) return;

        if (event.pricing_mode !== 'free_paid_raffle' || !event.raffle_entry_cost_cents) {
            alert('Raffle entry is included with your RSVP for this event.');
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

        await evtLoadEvents();
        evtToggleModal('detailModal', false);
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
                user_id: evtCurrentUser.id,
                position: nextPos,
                status: 'waiting',
            });
        if (error) throw error;

        alert(`You're #${nextPos} on the waitlist! We'll notify you if a spot opens.`);
        await evtOpenDetail(eventId);
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
            .eq('user_id', evtCurrentUser.id);
        if (error) throw error;

        await evtOpenDetail(eventId);
    } catch (err) {
        console.error('Leave waitlist error:', err);
        alert('Failed to leave waitlist.');
    }
}

// ─── Claim Waitlist Spot (triggers paid RSVP) ──────────

async function evtClaimWaitlistSpot(eventId) {
    try {
        const event = evtAllEvents.find(e => e.id === eventId);
        if (!event) return;

        const confirmPay = confirm(
            `A spot has opened up!\n\n` +
            `RSVP costs ${formatCurrency(event.rsvp_cost_cents)}.\n\n` +
            'By completing your RSVP, you agree that your payment is non-refundable ' +
            'unless this event is cancelled or rescheduled by LLC staff.\n\n' +
            'Proceed to checkout?'
        );
        if (!confirmPay) return;

        // Update waitlist status to 'claimed' so the spot is held
        await supabaseClient
            .from('event_waitlist')
            .update({ status: 'claimed' })
            .eq('event_id', eventId)
            .eq('user_id', evtCurrentUser.id);

        // Redirect to Stripe checkout
        const { url } = await callEdgeFunction('create-event-checkout', {
            event_id: eventId,
            type: 'rsvp',
            from_waitlist: true,
        });

        if (url) {
            window.location.href = url;
        }
    } catch (err) {
        console.error('Claim waitlist error:', err);
        alert('Failed to claim waitlist spot. Please try again.');
    }
}

// ─── Cancel Event (with refund processing) ──────────────

async function evtCancelEvent(eventId) {
    const event = evtAllEvents.find(e => e.id === eventId);
    if (!event) return;

    const isLlc = event.event_type === 'llc';
    let nonRefundableCents = 0;
    let cancellationNote = '';

    if (isLlc) {
        cancellationNote = prompt('Cancellation reason (visible to attendees):');
        if (cancellationNote === null) return; // user pressed Cancel

        const nonRefundableStr = prompt(
            'Enter the total non-refundable expenses already incurred (in dollars).\n' +
            'This amount will be deducted from each refund proportionally.\n' +
            'Enter 0 if fully refundable.',
            '0'
        );
        if (nonRefundableStr === null) return;
        nonRefundableCents = Math.round(parseFloat(nonRefundableStr || '0') * 100);
        if (isNaN(nonRefundableCents) || nonRefundableCents < 0) nonRefundableCents = 0;

        const msg = nonRefundableCents > 0
            ? `Cancel this event?\n\nNon-refundable expenses: ${formatCurrency(nonRefundableCents)}\nThis will be deducted proportionally from each attendee's refund.`
            : 'Cancel this event? All paid attendees will receive a full refund.';
        if (!confirm(msg)) return;
    } else {
        if (!confirm('Are you sure you want to cancel this event?')) return;
    }

    try {
        // Call edge function to process cancellation + refunds
        const result = await callEdgeFunction('process-event-cancellation', {
            event_id: eventId,
            reason: 'event_cancelled',
            cancellation_note: cancellationNote || 'Event cancelled by host',
            non_refundable_expenses_cents: nonRefundableCents,
        });

        alert(result.message || 'Event cancelled successfully.');
        await evtLoadEvents();
        evtToggleModal('detailModal', false);
    } catch (err) {
        console.error('Cancel event error:', err);
        alert('Failed to cancel event: ' + (err.message || 'Unknown error'));
    }
}

// ─── Reschedule Event (with 72h grace window) ───────────

async function evtRescheduleEvent(eventId) {
    const event = evtAllEvents.find(e => e.id === eventId);
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

    const confirmMsg = `Reschedule this event to ${parsed.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })} at ${parsed.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}?\n\nAll attendees will receive a 72-hour grace window to request a full refund if the new date doesn't work for them.`;
    if (!confirm(confirmMsg)) return;

    try {
        const now = new Date();
        const graceEnd = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72h from now

        const { error } = await supabaseClient
            .from('events')
            .update({
                original_start_date: event.original_start_date || event.start_date,
                start_date: parsed.toISOString(),
                rescheduled_at: now.toISOString(),
                grace_window_end: graceEnd.toISOString(),
            })
            .eq('id', eventId);
        if (error) throw error;

        // Mark all paid RSVPs as grace-refund eligible
        await supabaseClient
            .from('event_rsvps')
            .update({ grace_refund_eligible: true })
            .eq('event_id', eventId)
            .eq('paid', true);

        alert('Event rescheduled! Attendees have been notified and have 72 hours to request a refund.');
        await evtLoadEvents();
        await evtOpenDetail(eventId);
    } catch (err) {
        console.error('Reschedule error:', err);
        alert('Failed to reschedule event.');
    }
}

// ─── Request Grace Window Refund ────────────────────────

async function evtRequestGraceRefund(eventId) {
    if (!confirm('Request a full refund because the rescheduled date doesn\'t work for you?\n\nThis action cannot be undone.')) return;

    try {
        const result = await callEdgeFunction('process-event-cancellation', {
            event_id: eventId,
            reason: 'reschedule_grace',
            user_id: evtCurrentUser.id,
            single_user_refund: true,
        });

        alert(result.message || 'Refund processed. You will receive it within 5-10 business days.');
        await evtLoadEvents();
        await evtOpenDetail(eventId);
    } catch (err) {
        console.error('Grace refund error:', err);
        alert('Failed to process refund: ' + (err.message || 'Unknown error'));
    }
}

// ─── Duplicate Event ────────────────────────────────────

async function evtDeleteEvent(eventId) {
    const event = evtAllEvents.find(e => e.id === eventId);
    if (!event) return;

    // Only allow admins to delete
    if (evtCurrentUserRole !== 'admin') {
        alert('Only admins can delete events.');
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
        evtToggleModal('detailModal', false);
        await evtLoadEvents();
    } catch (err) {
        console.error('Delete event error:', err);
        alert('Failed to delete event: ' + (err.message || 'Unknown error'));
    }
}

async function evtDuplicateEvent(eventId) {
    const event = evtAllEvents.find(e => e.id === eventId);
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
            created_by: evtCurrentUser.id,
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
        await evtLoadEvents();
        await evtOpenDetail(newEvent.id);
    } catch (err) {
        console.error('Duplicate event error:', err);
        alert('Failed to duplicate event: ' + (err.message || 'Unknown error'));
    }
}
