// Portal Events — Team tools list (manage-style op cards)

'use strict';

function canUseEventScanner(event, canManageEvent) {
    const checkinEnabled = event.checkin_enabled !== false;
    return checkinEnabled && canManageEvent
        && event.checkin_mode === 'attendee_ticket'
        && ['open', 'confirmed', 'active'].includes(event.status);
}

function toolsOpCard(title, copy, onClick, disabled) {
    const copyHtml = copy ? `<p class="em-op-copy">${copy}</p>` : '';
    if (disabled) {
        return `<button type="button" class="em-op-card" disabled aria-disabled="true"><p class="em-op-title">${title}</p>${copyHtml}</button>`;
    }
    return `<button type="button" class="em-op-card" onclick="${onClick}"><p class="em-op-title">${title}</p>${copyHtml}</button>`;
}

function toolsHtml(event, eventId, rsvp, myRaffleEntry, entriesClosed, eventIsFull, opts) {
    const { canManageEvent } = opts;
    const rsvpEnabled = event.rsvp_enabled !== false;
    const raffleEnabled = !!event.raffle_enabled;
    const canRsvp = rsvpEnabled && ['open', 'confirmed', 'active'].includes(event.status) && !entriesClosed;
    const hasGoingRsvp = typeof globalThis.evtIsGoingRsvp === 'function'
        ? window.evtIsGoingRsvp(rsvp)
        : !!(rsvp && (rsvp.status === 'going' || rsvp.paid === true));
    const cards = [];

    cards.push(toolsOpCard('Team Chat', 'Private team coordination', `window.EventsTeam.open('${eventId}',{tab:'chat'})`, false));

    if (rsvpEnabled) {
        if (!canRsvp) {
            cards.push(toolsOpCard('RSVP as Myself', 'RSVP is closed for this event', '', true));
        } else if (eventIsFull && !hasGoingRsvp) {
            cards.push(toolsOpCard('RSVP as Myself', 'Event is full', '', true));
        } else if (hasGoingRsvp) {
            cards.push(toolsOpCard('RSVP as Myself', "You're RSVP'd — tap to update", `window.EventsTeam.close();evtHandleRsvp('${eventId}','going')`, false));
        } else if (event.pricing_mode === 'paid') {
            cards.push(toolsOpCard('RSVP as Myself', `Paid RSVP — ${formatCurrency(event.rsvp_cost_cents)}`, `window.EventsTeam.close();evtHandleRsvp('${eventId}','going')`, false));
        } else {
            cards.push(toolsOpCard('RSVP as Myself', 'Count yourself as going', `window.EventsTeam.close();evtHandleRsvp('${eventId}','going')`, false));
        }
    }

    if (raffleEnabled) {
        const raffleBundled = typeof globalThis.evtIsRaffleBundledWithPaidRsvp === 'function'
            ? window.evtIsRaffleBundledWithPaidRsvp(event)
            : (event.pricing_mode === 'paid' && rsvpEnabled);
        if (raffleBundled) {
            cards.push(toolsOpCard('Enter Raffle', rsvp?.paid ? 'Included with your paid RSVP' : 'Included with paid RSVP', '', true));
        } else if (myRaffleEntry) {
            cards.push(toolsOpCard('Enter Raffle', 'Already entered', '', true));
        } else if (entriesClosed) {
            cards.push(toolsOpCard('Enter Raffle', 'Entries are closed', '', true));
        } else if (!hasGoingRsvp) {
            cards.push(toolsOpCard('Enter Raffle', 'RSVP first to enter the raffle', '', true));
        } else {
            const costLabel = event.raffle_entry_cost_cents > 0 ? formatCurrency(event.raffle_entry_cost_cents) : 'Free entry';
            cards.push(toolsOpCard('Enter Raffle', costLabel, `window.EventsTeam.openToolsView('raffle')`, false));
        }
    }

    if (hasGoingRsvp) {
        cards.push(toolsOpCard('View Ticket', 'Your RSVP confirmation', `window.EventsTeam.openToolsView('ticket')`, false));
    }

    if (canUseEventScanner(event, canManageEvent)) {
        cards.push(toolsOpCard('Scanner', 'Scan attendee QR codes', `window.EventsTeam.close();evtOpenScanner('${eventId}')`, false));
    }

    if (canManageEvent) {
        const manageClick = `window.EventsTeam.close();(window.EventsManage?window.EventsManage.open('${eventId}',{source:'portal'}):(window.location='../admin/events.html?id=${eventId}'))`;
        cards.push(toolsOpCard('Manage Event', 'Hosts, RSVP, raffle, settings', manageClick, false));
    }

    return `<div class="em-op-grid">${cards.join('')}</div>`;
}

export const teamToolsListApi = { toolsHtml };

globalThis.EventsTeamToolsList = teamToolsListApi;
