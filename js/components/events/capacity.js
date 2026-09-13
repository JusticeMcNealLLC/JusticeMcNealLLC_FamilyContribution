/**
 * Event capacity helpers — honor capacity_mode / capacity_counts (§13.12 line 459)
 * Surface: window.EventsCapacity
 */
(function () {
    'use strict';

    function eventCapacityMode(event) {
        const mode = String(event?.capacity_mode || 'none').trim().toLowerCase();
        if (mode === 'soft' || mode === 'hard') return mode;
        return 'none';
    }

    /** Soft/hard with positive max. Mode `none` ignores stale max_participants. */
    function eventHasCapacityLimit(event) {
        if (!event) return false;
        const mode = eventCapacityMode(event);
        if (mode !== 'soft' && mode !== 'hard') return false;
        const max = Number(event.max_participants);
        return Number.isFinite(max) && max > 0;
    }

    function eventMaxParticipants(event) {
        if (!eventHasCapacityLimit(event)) return 0;
        return Math.max(0, Number(event.max_participants) || 0);
    }

    function seatCountsTowardCapacity(event, role) {
        if (String(role || '').toLowerCase() === 'adult' || !role) return true;
        return String(event?.capacity_counts || 'adults').trim() === 'all';
    }

    /**
     * Occupied count for UI.
     * Prefer seats on active/pending parties; else going RSVP/guest rows.
     */
    function countOccupiedCapacity(event, opts) {
        if (!eventHasCapacityLimit(event)) return 0;
        const seats = Array.isArray(opts?.seats) ? opts.seats : [];
        const parties = Array.isArray(opts?.parties) ? opts.parties : [];
        const goingList = Array.isArray(opts?.goingList) ? opts.goingList : [];

        const activePartyIds = new Set(
            parties
                .filter((p) => p && (p.status === 'active' || p.status === 'pending_payment'))
                .map((p) => p.id),
        );

        if (seats.length) {
            let count = 0;
            let any = 0;
            for (const seat of seats) {
                if (parties.length && activePartyIds.size && !activePartyIds.has(seat.party_id)) continue;
                any += 1;
                if (seatCountsTowardCapacity(event, seat.role)) count += 1;
            }
            if (any > 0) return count;
        }

        return goingList.length;
    }

    function eventIsAtCapacity(event, occupiedCount) {
        if (!eventHasCapacityLimit(event)) return false;
        const occ = Number(occupiedCount);
        const occupied = Number.isFinite(occ) ? occ : 0;
        return occupied >= eventMaxParticipants(event);
    }

    function spotsRemaining(event, occupiedCount) {
        if (!eventHasCapacityLimit(event)) return null;
        return Math.max(0, eventMaxParticipants(event) - (Number(occupiedCount) || 0));
    }

    const EventsCapacity = {
        eventCapacityMode,
        eventHasCapacityLimit,
        eventMaxParticipants,
        seatCountsTowardCapacity,
        countOccupiedCapacity,
        eventIsAtCapacity,
        spotsRemaining,
    };

    window.EventsCapacity = EventsCapacity;
})();
