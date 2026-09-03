// Portal Events — Manage RSVPs tab (Phase 5M.3B + §13.9 party links)

'use strict';

function api() {
    return window.EventsManageRsvpsApi || {};
}

function esc(s) {
    const el = document.createElement('span');
    el.textContent = s == null ? '' : String(s);
    return el.innerHTML;
}
function money(cents) {
    return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
}

/** Build party/seat indexes for roster enrichment (§13.9). */
function buildPartyIndexes(STATE) {
    const parties = Array.isArray(STATE.parties) ? STATE.parties : [];
    const seats = Array.isArray(STATE.seats) ? STATE.seats : [];
    const rsvps = Array.isArray(STATE.rsvps) ? STATE.rsvps : [];
    const guests = Array.isArray(STATE.guestRsvps) ? STATE.guestRsvps : [];

    const partyById = new Map(parties.map((p) => [p.id, p]));
    const seatsByParty = new Map();
    for (const seat of seats) {
        const pid = seat.party_id;
        if (!pid) continue;
        if (!seatsByParty.has(pid)) seatsByParty.set(pid, []);
        seatsByParty.get(pid).push(seat);
    }
    for (const list of seatsByParty.values()) {
        list.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
    }

    function memberName(userId) {
        const row = rsvps.find((r) => r.user_id === userId);
        const p = row?.profiles || {};
        return `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
    }
    function guestName(guestRsvpId) {
        const g = guests.find((row) => row.id === guestRsvpId);
        return (g?.guest_name || '').trim() || 'Guest';
    }

    function payerLabel(party) {
        if (!party) return null;
        if (party.payer_kind === 'member' && party.payer_user_id) {
            return memberName(party.payer_user_id);
        }
        if (party.payer_kind === 'guest' && party.payer_guest_rsvp_id) {
            return guestName(party.payer_guest_rsvp_id);
        }
        return 'Payer';
    }

    function partyForMember(r) {
        if (r.party_id && partyById.has(r.party_id)) return partyById.get(r.party_id);
        return parties.find((p) => p.payer_kind === 'member' && p.payer_user_id === r.user_id) || null;
    }

    function partyForGuest(g) {
        if (g.party_id && partyById.has(g.party_id)) return partyById.get(g.party_id);
        return parties.find((p) => p.payer_kind === 'guest' && p.payer_guest_rsvp_id === g.id) || null;
    }

    function seatsForParty(party) {
        if (!party?.id) return [];
        return seatsByParty.get(party.id) || [];
    }

    function isPayerMember(party, r) {
        return !!(party && party.payer_kind === 'member' && party.payer_user_id === r.user_id);
    }
    function isPayerGuest(party, g) {
        return !!(party && party.payer_kind === 'guest' && party.payer_guest_rsvp_id === g.id);
    }

    return {
        partyForMember,
        partyForGuest,
        seatsForParty,
        payerLabel,
        isPayerMember,
        isPayerGuest,
    };
}

function partyMetaHtml(opts) {
    const {
        party,
        seats,
        isPayer,
        payerName,
        awaitingAttach,
    } = opts || {};

    if (!party) return { pills: [], subExtra: '', seatsBlock: '' };

    const pills = [];
    let subExtra = '';
    const incomplete = seats.filter((s) => !s.options_complete);
    const inviteTokens = incomplete
        .filter((s) => s.info_invite_token)
        .map((s) => ({
            seat_id: s.id,
            display_name: s.display_name,
            info_invite_token: s.info_invite_token,
            options_complete: !!s.options_complete,
            role: s.role,
        }));

    if (awaitingAttach || party.status === 'awaiting_attach') {
        pills.push('<span class="em-pill em-pill-maybe">Waiting for payer</span>');
    } else if (isPayer) {
        const extras = seats.filter((s) => {
            if (party.payer_kind === 'member') return s.linked_user_id !== party.payer_user_id;
            if (party.payer_kind === 'guest') return s.linked_guest_rsvp_id !== party.payer_guest_rsvp_id;
            return true;
        });
        if (seats.length > 1 || extras.length) {
            pills.push('<span class="em-pill em-pill-going">Pays for party</span>');
            const adults = seats.filter((s) => s.role !== 'kid').length;
            const kids = seats.filter((s) => s.role === 'kid').length;
            const bits = [];
            if (adults) bits.push(`${adults} adult${adults === 1 ? '' : 's'}`);
            if (kids) bits.push(`${kids} kid${kids === 1 ? '' : 's'}`);
            if (bits.length) subExtra = ` · ${bits.join(' · ')}`;
        } else {
            pills.push('<span class="em-pill em-pill-going">Paid by: Self</span>');
        }
    } else if (payerName) {
        pills.push(`<span class="em-pill em-pill-going">Paid by: ${esc(payerName)}</span>`);
    }

    if (incomplete.length && !(awaitingAttach || party.status === 'awaiting_attach')) {
        pills.push('<span class="em-pill em-pill-not">Sizes pending</span>');
    }

    let seatsBlock = '';
    const showSeatList = isPayer
        && !(awaitingAttach || party.status === 'awaiting_attach')
        && seats.length > 0
        && (seats.length > 1 || incomplete.length);
    if (showSeatList) {
        const rows = seats.map((s) => {
            const role = s.role === 'kid' ? 'Kid' : 'Adult';
            const status = s.options_complete ? 'Options complete' : 'Sizes pending';
            return `<li style="font-size:12px;color:#4b5563;margin:2px 0">${esc(s.display_name || 'Guest')} · ${role} · ${status}</li>`;
        }).join('');
        let invitesHtml = '';
        if (inviteTokens.length && window.EventsHelpers?.seatInfoInvitesHtml) {
            invitesHtml = window.EventsHelpers.seatInfoInvitesHtml(inviteTokens, {
                title: 'Seat invite links',
                sub: 'Copy and send so guests can finish sizes. Payer still covers payment.',
            });
        }
        seatsBlock = `
            <div class="em-party-seats" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--color-border,#d5dfec)">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.04em">Party seats</p>
                <ul style="margin:0;padding-left:16px">${rows}</ul>
                ${invitesHtml}
            </div>`;
    }

    return { pills, subExtra, seatsBlock };
}

// ─── RSVPs tab ──────────────────────────────────────────────────
function rsvpsHtml() {
    const STATE = api().getState?.() || {};
    const e = STATE.event;
    const going = STATE.rsvps.filter(r => r.status === 'going');
    const maybe = STATE.rsvps.filter(r => r.status === 'maybe');
    const not   = STATE.rsvps.filter(r => r.status === 'not_going');
    const guestGoing = STATE.guestRsvps.filter(r => r.status === 'going');
    const checkedSet = new Set(STATE.checkins.map(c => c.user_id));
    const guestCheckedSet = new Set(STATE.checkins.map(c => c.guest_token).filter(Boolean));
    const totalGoing = going.length + guestGoing.length;
    const checkedTotal = STATE.checkins.length;
    const capacity = e.max_participants || 0;
    const capacityLeft = capacity ? Math.max(0, capacity - totalGoing) : null;
    const minNeeded = Number(e.min_participants || 0);
    const thresholdLeft = minNeeded ? Math.max(0, minNeeded - totalGoing) : 0;
    const checkedPct = totalGoing ? Math.round((checkedTotal / totalGoing) * 100) : 0;
    const isLlcPlane = e.event_type === 'llc'
        && e.transportation_mode === 'llc_provides'
        && e.transportation_method === 'plane';
    const ticketHelper = window.EventsManageTicketHandoff;
    const documents = STATE.eventDocuments || STATE.tabData?.docs?.docs || [];
    const planeHandoff = isLlcPlane && ticketHelper
        ? ticketHelper.computePlaneTicketHandoff({ goingRsvps: going, documents })
        : null;

    const idx = buildPartyIndexes(STATE);

    function memberRow(r) {
        const p = r.profiles || {};
        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
        const initials = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || '?';
        const avatar = p.profile_picture_url
            ? `<img src="${esc(p.profile_picture_url)}" alt="">`
            : `<span>${initials}</span>`;
        const pills = [];
        if (r.status === 'going') pills.push('<span class="em-pill em-pill-going">Going</span>');
        else if (r.status === 'maybe') pills.push('<span class="em-pill em-pill-maybe">Maybe</span>');
        else pills.push('<span class="em-pill em-pill-not">Not going</span>');
        if (r.paid) pills.push('<span class="em-pill em-pill-paid">Paid</span>');
        if (checkedSet.has(r.user_id)) pills.push('<span class="em-pill em-pill-checked">Checked in</span>');
        if (e.invest_eligible && r.status === 'going' && r.paid) {
            pills.push(r.invest_eligible_acknowledged
                ? '<span class="em-pill em-pill-checked">Invest ack ✓</span>'
                : '<span class="em-pill em-pill-not">No invest ack</span>');
        }
        if (isLlcPlane && r.status === 'going' && ticketHelper) {
            const hasTicket = ticketHelper.memberHasPlaneTicket(r.user_id, documents);
            pills.push(hasTicket
                ? '<span class="em-pill em-pill-checked">Ticket uploaded</span>'
                : '<span class="em-pill em-pill-not">Needs ticket</span>');
        }

        let subExtra = '';
        let seatsBlock = '';
        if (r.status === 'going') {
            const party = idx.partyForMember(r);
            const seats = idx.seatsForParty(party);
            const isPayer = idx.isPayerMember(party, r);
            const meta = partyMetaHtml({
                party,
                seats,
                isPayer,
                payerName: idx.payerLabel(party),
                awaitingAttach: false,
            });
            pills.push(...meta.pills);
            subExtra = meta.subExtra || '';
            seatsBlock = meta.seatsBlock || '';
        }

        return `<div class="em-attendee-card"><div class="em-avatar">${avatar}</div><div class="em-attendee-main"><p class="em-attendee-name">${esc(name)}</p><p class="em-attendee-sub">Member RSVP${r.qr_token ? ' · ticket ready' : ''}${subExtra}</p><div class="flex flex-wrap gap-1 mt-2">${pills.join('')}</div>${seatsBlock}</div><button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-remove-rsvp="member" data-rsvp-id="${esc(r.id)}" data-user-id="${esc(r.user_id)}" data-paid="${r.paid ? '1' : '0'}" data-name="${esc(name)}">Remove</button></div>`;
    }

    function guestRow(g) {
        const initials = (g.guest_name || 'G').slice(0, 1).toUpperCase();
        const pills = ['<span class="em-pill em-pill-going">Guest</span>'];
        if (g.paid) pills.push('<span class="em-pill em-pill-paid">Paid</span>');
        if (guestCheckedSet.has(g.guest_token)) pills.push('<span class="em-pill em-pill-checked">Checked in</span>');
        const name = g.guest_name || 'Guest';

        const party = idx.partyForGuest(g);
        const seats = idx.seatsForParty(party);
        const isPayer = idx.isPayerGuest(party, g);
        const awaitingAttach = !!(g.attach_requested || party?.status === 'awaiting_attach');
        const meta = partyMetaHtml({
            party,
            seats,
            isPayer,
            payerName: idx.payerLabel(party),
            awaitingAttach,
        });
        pills.push(...meta.pills);

        return `<div class="em-attendee-card"><div class="em-avatar" style="background:#fef3c7;color:#92400e"><span>${esc(initials)}</span></div><div class="em-attendee-main"><p class="em-attendee-name">${esc(name)}</p><p class="em-attendee-sub">${esc(g.guest_email || 'Public guest')}${meta.subExtra || ''}</p><div class="flex flex-wrap gap-1 mt-2">${pills.join('')}</div>${meta.seatsBlock || ''}</div><button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-remove-rsvp="guest" data-rsvp-id="${esc(g.id)}" data-guest-token="${esc(g.guest_token)}" data-paid="${g.paid ? '1' : '0'}" data-name="${esc(name)}">Remove</button></div>`;
    }

    function section(title, list, emptyText) {
        return `
            <div class="em-card mb-3">
                <div class="em-section-head"><div><h3 class="em-section-title">${title} <span class="text-gray-400 font-normal">· ${list.length}</span></h3></div></div>
                ${list.length ? list.map(memberRow).join('') : `<p class="text-xs text-gray-400 italic py-2">${emptyText}</p>`}
            </div>
        `;
    }

    return `
        <div class="em-card em-command-card mb-4">
            <p class="em-command-eyebrow">Attendance command</p>
            <h3 class="em-command-title">${totalGoing ? `${totalGoing} attending` : 'No confirmed attendees yet'}</h3>
            <p class="em-command-copy">${thresholdLeft ? `${thresholdLeft} more RSVP${thresholdLeft === 1 ? '' : 's'} needed to meet the minimum.` : 'Minimum and attendance signals are in good shape.'} ${capacityLeft !== null ? `${capacityLeft} spot${capacityLeft === 1 ? '' : 's'} still available.` : 'Capacity is open-ended.'}</p>
        </div>

        <div class="em-metric-grid mb-4">
            <div class="em-metric"><span>Total going</span><strong>${totalGoing}</strong><small>${going.length} member · ${guestGoing.length} guest</small></div>
            <div class="em-metric"><span>Checked in</span><strong>${checkedTotal}</strong><small>${checkedPct}% of going</small></div>
            <div class="em-metric"><span>Interested</span><strong>${maybe.length}</strong><small>Member maybes</small></div>
            <div class="em-metric"><span>Capacity</span><strong>${capacityLeft === null ? 'Open' : capacityLeft}</strong><small>${capacity ? `${totalGoing}/${capacity} filled` : 'No max set'}</small></div>
        </div>

        ${section('Going members', going, 'No members are going yet.')}
        <div class="em-card mb-3">
            <div class="em-section-head"><div><h3 class="em-section-title">Public guests <span class="text-gray-400 font-normal">· ${guestGoing.length}</span></h3><p class="em-section-sub">Guests from the public event link and ticket flow.</p></div></div>
            ${guestGoing.length ? guestGoing.map(guestRow).join('') : '<p class="text-xs text-gray-400 italic py-2">No public guests yet.</p>'}
        </div>
        ${section('Interested', maybe, 'No interested members.')}
        ${not.length ? section('Not going', not, '') : ''}
    `;
}

function wireRsvps() {
    const panel = document.getElementById('emSheetContent');
    panel?.querySelectorAll('[data-remove-rsvp]').forEach(btn => {
        btn.addEventListener('click', () => api().removeParticipationPerson?.(btn));
    });
    if (panel && window.EventsHelpers && typeof window.EventsHelpers.wireSeatInfoInviteCopy === 'function') {
        window.EventsHelpers.wireSeatInfoInviteCopy(panel);
    }
}

export const manageRsvpsApi = {
    rsvpsHtml,
    wireRsvps
};

globalThis.EventsManageRsvps = manageRsvpsApi;
