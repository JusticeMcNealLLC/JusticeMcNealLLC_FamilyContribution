// Portal Events — Manage plane ticket handoff helper

'use strict';

/**
 * @param {{ goingRsvps?: Array, documents?: Array }} input
 * @returns {{ uploaded: number, total: number, missingUserIds: string[], missingCount: number, ticketPct: number }}
 */
function computePlaneTicketHandoff({ goingRsvps, documents, event }) {
    const going = (goingRsvps || []).filter((r) => {
        if (window.EventsHelpers?.rsvpIsCommittedGoing && event) {
            return window.EventsHelpers.rsvpIsCommittedGoing(event, r);
        }
        return r.status === 'going' && (event?.pricing_mode !== 'paid' || r.paid === true);
    });
    const total = going.length;
    const ticketDocs = (documents || []).filter(
        (d) => d.doc_type === 'plane_ticket' && d.target_user_id,
    );
    const uploadedUserIds = new Set(ticketDocs.map((d) => d.target_user_id));
    const missingUserIds = going
        .map((r) => r.user_id)
        .filter((uid) => uid && !uploadedUserIds.has(uid));
    const uploaded = Math.max(0, total - missingUserIds.length);
    const ticketPct = total ? Math.round((uploaded / total) * 100) : 0;
    return {
        uploaded,
        total,
        missingUserIds,
        missingCount: missingUserIds.length,
        ticketPct,
    };
}

function memberHasPlaneTicket(userId, documents) {
    if (!userId) return false;
    return (documents || []).some(
        (d) => d.doc_type === 'plane_ticket' && d.target_user_id === userId,
    );
}

export const ticketHandoffApi = {
    computePlaneTicketHandoff,
    memberHasPlaneTicket,
};

globalThis.EventsManageTicketHandoff = ticketHandoffApi;
