// Portal Events — Manage participation (Phase 5M.3C)
(function () {
    'use strict';

    function api() {
        return window.EventsManageParticipationApi || {};
    }

    function esc(s) {
        const el = document.createElement('span');
        el.textContent = s == null ? '' : String(s);
        return el.innerHTML;
    }
    function money(cents) {
        return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
    }

    async function getParticipationResetCounts() {
        const STATE = api().getState?.() || {};
        const eventId = STATE.eventId;
        const tables = [
            ['member RSVPs', 'event_rsvps'],
            ['guest RSVPs', 'event_guest_rsvps'],
            ['check-ins', 'event_checkins'],
            ['raffle entries', 'event_raffle_entries'],
            ['raffle winners', 'event_raffle_winners'],
        ];
        const results = await Promise.all(tables.map(async ([label, table]) => {
            const { count, error } = await supabaseClient
                .from(table)
                .select('id', { count: 'exact', head: true })
                .eq('event_id', eventId);
            if (error) throw error;
            return { label, table, count: count || 0 };
        }));
        return results;
    }

    async function resetParticipation() {
        const STATE = api().getState?.() || {};
        const e = STATE.event;
        if (!e) return;
        let counts = [];
        try {
            counts = await _getParticipationResetCounts();
        } catch (err) {
            alert('Could not load participation counts: ' + (err.message || 'unknown error'));
            return;
        }

        const paidTickets = STATE.rsvps.filter(r => r.paid).length + STATE.guestRsvps.filter(r => r.paid).length;
        const summary = counts.map(item => `${item.count} ${item.label}`).join('\n');
        const typed = prompt(
            `Reset participation for "${e.title}"?\n\nThis will delete:\n${summary}\n\nThe event itself, images, links, pricing, and settings stay in place. Stripe payments are NOT refunded${paidTickets ? ` (${paidTickets} paid RSVP record${paidTickets === 1 ? '' : 's'} found)` : ''}.\n\nType RESET to continue.`
        );
        if (!typed || typed.trim().toUpperCase() !== 'RESET') {
            if (typed !== null) alert('Reset cancelled.');
            return;
        }

        try {
            await callEdgeFunction('manage-event-participation', {
                action: 'reset_participation',
                event_id: e.id,
            });
            await api().refreshEventManager?.('danger');
            alert('Participation reset complete. The event is still intact.');
        } catch (err) {
            alert('Reset failed: ' + (err.message || 'unknown error'));
        }
    }

    async function removeParticipationPerson(btn) {
        const STATE = api().getState?.() || {};
        const kind = btn.dataset.removeRsvp;
        const name = btn.dataset.name || (kind === 'guest' ? 'this guest' : 'this member');
        const isPaid = btn.dataset.paid === '1';
        const warning = isPaid ? '\n\nThis was marked paid. Removing the record does not refund Stripe payments.' : '';
        if (!confirm(`Remove ${name} from this event? This also clears their check-in and raffle entry.${warning}`)) return;

        btn.disabled = true;
        btn.textContent = 'Removing...';
        try {
            if (kind === 'guest') {
                const guestToken = btn.dataset.guestToken;
                const rsvpId = btn.dataset.rsvpId;
                if (!guestToken || !rsvpId) throw new Error('Missing guest RSVP details.');
                await callEdgeFunction('manage-event-participation', {
                    action: 'remove_rsvp',
                    event_id: STATE.eventId,
                    kind: 'guest',
                    guest_token: guestToken,
                    rsvp_id: rsvpId,
                });
            } else {
                const userId = btn.dataset.userId;
                if (!userId) throw new Error('Missing member RSVP details.');
                await callEdgeFunction('manage-event-participation', {
                    action: 'remove_rsvp',
                    event_id: STATE.eventId,
                    kind: 'member',
                    user_id: userId,
                });
            }
            await api().refreshEventManager?.('rsvps');
        } catch (err) {
            alert('Remove failed: ' + (err.message || 'unknown error'));
            api().renderTab?.('rsvps');
        }
    }

    window.EventsManageParticipation = {
        getParticipationResetCounts,
        resetParticipation,
        removeParticipationPerson
    };
})();
