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

function adultKidSubExtra(seats) {
    const list = Array.isArray(seats) ? seats : [];
    if (!list.length) return '';
    const adults = list.filter((s) => s.role !== 'kid').length;
    const kids = list.filter((s) => s.role === 'kid').length;
    const bits = [];
    if (adults) bits.push(`${adults} adult${adults === 1 ? '' : 's'}`);
    if (kids) bits.push(`${kids} kid${kids === 1 ? '' : 's'}`);
    return bits.length ? ` · ${bits.join(' · ')}` : '';
}

function humanizeOptionKey(key) {
    return String(key || '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim() || 'Option';
}

function seatOptionsSummary(seat, catalog) {
    const opts = seat && seat.options && typeof seat.options === 'object' ? seat.options : null;
    if (!opts) return '';
    const entries = Object.entries(opts).filter(([, v]) => v != null && String(v).trim() !== '');
    if (!entries.length) return '';

    let nameById = null;
    if (window.EventsIncludedItems && typeof window.EventsIncludedItems.normalizeIncludedItems === 'function') {
        const list = window.EventsIncludedItems.normalizeIncludedItems(catalog);
        nameById = new Map(list.map((item) => [String(item.id), item.name || item.id]));
    }

    return entries.map(([k, v]) => {
        const label = (nameById && nameById.get(String(k))) || humanizeOptionKey(k);
        return `${label}: ${String(v).trim()}`;
    }).join(' · ');
}

function tsvCell(value) {
    return String(value == null ? '' : value)
        .replace(/\t/g, ' ')
        .replace(/\r?\n/g, ' ')
        .trim();
}

/** Clipboard TSV roster — one row per seat (fallback: going RSVPs/guests). §13.12 line 458 */
function buildRosterTsv(STATE) {
    const idx = buildPartyIndexes(STATE);
    const parties = Array.isArray(STATE.parties) ? STATE.parties : [];
    const seats = Array.isArray(STATE.seats) ? STATE.seats : [];
    const rsvps = Array.isArray(STATE.rsvps) ? STATE.rsvps : [];
    const guests = Array.isArray(STATE.guestRsvps) ? STATE.guestRsvps : [];
    const catalog = STATE.event?.included_items;
    const partyById = new Map(parties.map((p) => [p.id, p]));

    const header = ['Name', 'Role', 'Kind', 'Payer', 'Status', 'Paid', 'Phone', 'Options'];
    const rows = [];

    function memberByUserId(userId) {
        return rsvps.find((r) => r.user_id === userId) || null;
    }
    function guestById(guestId) {
        return guests.find((g) => g.id === guestId) || null;
    }

    function pushSeatRow(seat, party) {
        if (!party || party.status === 'cancelled') return;
        const role = seat.role === 'kid' ? 'kid' : 'adult';
        let kind = 'guest';
        let name = (seat.display_name || '').trim() || 'Guest';
        let status = party.status === 'pending_payment' ? 'pending_payment' : 'going';
        let paid = false;
        let phone = '';

        if (seat.linked_user_id) {
            kind = 'member';
            const r = memberByUserId(seat.linked_user_id);
            if (r) {
                const p = r.profiles || {};
                name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || name;
                status = r.status || status;
                paid = !!r.paid;
                phone = (p.phone || '').trim();
            }
        } else if (seat.linked_guest_rsvp_id) {
            kind = 'guest';
            const g = guestById(seat.linked_guest_rsvp_id);
            if (g) {
                name = (g.guest_name || '').trim() || name;
                status = g.status || status;
                paid = !!g.paid;
                phone = (g.guest_phone || '').trim();
            }
        } else if (party.payer_kind === 'member') {
            kind = 'member';
        }

        const optSum = seatOptionsSummary(seat, catalog);
        const options = optSum || (seat.options_complete ? 'complete' : 'pending');
        rows.push([
            name,
            role,
            kind,
            idx.payerLabel(party) || '',
            status,
            paid ? 'yes' : 'no',
            phone,
            options,
        ].map(tsvCell));
    }

    const activeSeats = seats.filter((s) => {
        const party = partyById.get(s.party_id);
        return party && party.status !== 'cancelled';
    });

    if (activeSeats.length) {
        const sorted = [...activeSeats].sort((a, b) => {
            if (a.party_id !== b.party_id) return String(a.party_id).localeCompare(String(b.party_id));
            return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
        });
        for (const seat of sorted) {
            pushSeatRow(seat, partyById.get(seat.party_id));
        }
    } else {
        const event = STATE.event;
        for (const r of rsvps.filter((row) => isCommittedGoingRow(event, row))) {
            const p = r.profiles || {};
            const party = idx.partyForMember(r);
            rows.push([
                `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member',
                'adult',
                'member',
                idx.payerLabel(party) || '',
                r.status,
                r.paid ? 'yes' : 'no',
                (p.phone || '').trim(),
                '',
            ].map(tsvCell));
        }
        for (const g of guests.filter((row) => isCommittedGoingRow(event, row))) {
            const party = idx.partyForGuest(g);
            rows.push([
                (g.guest_name || '').trim() || 'Guest',
                'adult',
                'guest',
                idx.payerLabel(party) || '',
                g.status,
                g.paid ? 'yes' : 'no',
                (g.guest_phone || '').trim(),
                '',
            ].map(tsvCell));
        }
    }

    return [header, ...rows].map((cols) => cols.join('\t')).join('\n');
}

function latestAckedAt(acks) {
    if (!Array.isArray(acks) || !acks.length) return null;
    let best = null;
    for (const row of acks) {
        const raw = row && row.acked_at;
        if (!raw) continue;
        const t = new Date(raw).getTime();
        if (Number.isNaN(t)) continue;
        if (best == null || t > best) best = t;
    }
    return best == null ? null : new Date(best);
}

function partyMetaHtml(opts) {
    const {
        party,
        seats,
        isPayer,
        payerName,
        awaitingAttach,
        event: eventRow,
    } = opts || {};

    if (!party) return { pills: [], subExtra: '', seatsBlock: '' };

    const pills = [];
    let subExtra = adultKidSubExtra(seats);
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
        } else {
            pills.push('<span class="em-pill em-pill-going">Paid by: Self</span>');
        }
    } else if (payerName) {
        pills.push(`<span class="em-pill em-pill-going">Paid by: ${esc(payerName)}</span>`);
    }

    if (incomplete.length && !(awaitingAttach || party.status === 'awaiting_attach')) {
        pills.push('<span class="em-pill em-pill-not">Sizes pending</span>');
    }

    // Disclaimer ack (once per party) when event has required clauses
    const Disc = window.EventsDisclaimers;
    if (Disc && typeof Disc.hasRequiredDisclaimers === 'function'
        && Disc.hasRequiredDisclaimers(eventRow?.disclaimers)
        && !(awaitingAttach || party.status === 'awaiting_attach')) {
        const acks = Array.isArray(party.disclaimer_acks) ? party.disclaimer_acks : [];
        const ackIds = acks.map((a) => (a && a.id != null ? String(a.id) : '')).filter(Boolean);
        const missing = typeof Disc.validateAcks === 'function'
            ? Disc.validateAcks(eventRow.disclaimers, ackIds)
            : null;
        if (!missing) {
            const when = latestAckedAt(acks);
            const whenTxt = when
                ? ` · ${when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : '';
            pills.push(`<span class="em-pill em-pill-checked">Disclaimers acked${esc(whenTxt)}</span>`);
        } else {
            pills.push('<span class="em-pill em-pill-not">No disclaimer ack</span>');
        }
    }

    // Amenity vote status when voting enabled
    const Vote = window.EventsAmenityVoting;
    if (Vote && typeof Vote.normalizeConfig === 'function') {
        const cfg = Vote.normalizeConfig(eventRow?.amenity_voting);
        if (cfg.enabled && !(awaitingAttach || party.status === 'awaiting_attach')) {
            const status = String(party.amenity_vote_status || 'none');
            const optId = party.amenity_vote_option_id ? String(party.amenity_vote_option_id) : '';
            const opt = (cfg.options || []).find((o) => String(o.id) === optId);
            const optLabel = opt?.label ? ` · ${opt.label}` : '';
            if (status === 'counted') {
                pills.push(`<span class="em-pill em-pill-checked">Vote: counted${esc(optLabel)}</span>`);
            } else if (status === 'provisional') {
                pills.push(`<span class="em-pill em-pill-maybe">Vote: provisional${esc(optLabel)}</span>`);
            } else if (status === 'removed') {
                pills.push('<span class="em-pill em-pill-not">Vote: removed</span>');
            } else {
                pills.push('<span class="em-pill em-pill-not">No vote</span>');
            }
        }
    }

    let paymentLinkBlock = '';
    if (isPayer && party?.invite_token && !(awaitingAttach || party.status === 'awaiting_attach')) {
        const tok = esc(party.invite_token);
        paymentLinkBlock = `
            <div class="em-party-pay-link" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
                <button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-copy-pay-link="${tok}">Copy payment link</button>
                <button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-resend-pay-sms="${esc(party.id)}">Resend SMS</button>
            </div>`;
    }

    let seatsBlock = '';
    const showSeatList = isPayer
        && !(awaitingAttach || party.status === 'awaiting_attach')
        && seats.length > 0;
    if (showSeatList) {
        const catalog = eventRow?.included_items;
        const rows = seats.map((s) => {
            const role = s.role === 'kid' ? 'Kid' : 'Adult';
            const status = s.options_complete ? 'Options complete' : 'Sizes pending';
            const optSum = seatOptionsSummary(s, catalog);
            const optPart = optSum ? ` · ${esc(optSum)}` : '';
            return `<li style="font-size:12px;color:#4b5563;margin:2px 0">${esc(s.display_name || 'Guest')} · ${role} · ${status}${optPart}</li>`;
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

    return { pills, subExtra, seatsBlock: `${paymentLinkBlock}${seatsBlock}` };
}

function isCommittedGoingRow(event, row) {
    if (window.EventsHelpers?.rsvpIsCommittedGoing) {
        return window.EventsHelpers.rsvpIsCommittedGoing(event, row);
    }
    if (event?.pricing_mode === 'paid') return row?.paid === true;
    return !!(row && (row.status === 'going' || row.paid === true));
}

// ─── RSVPs tab ──────────────────────────────────────────────────
function rsvpsHtml() {
    const STATE = api().getState?.() || {};
    const e = STATE.event;
    const going = STATE.rsvps.filter((r) => isCommittedGoingRow(e, r));
    const paymentPending = STATE.rsvps.filter((r) => r.status === 'going' && !isCommittedGoingRow(e, r));
    const maybe = STATE.rsvps.filter(r => r.status === 'maybe');
    const not   = STATE.rsvps.filter(r => r.status === 'not_going');
    const guestGoing = STATE.guestRsvps.filter((r) => isCommittedGoingRow(e, r));
    const guestPaymentPending = STATE.guestRsvps.filter((r) => r.status === 'going' && !isCommittedGoingRow(e, r));
    const checkedSet = new Set(STATE.checkins.map(c => c.user_id));
    const guestCheckedSet = new Set(STATE.checkins.map(c => c.guest_token).filter(Boolean));
    const totalGoing = going.length + guestGoing.length;
    const totalPending = paymentPending.length + guestPaymentPending.length;
    const checkedTotal = STATE.checkins.length;
    const capacity = (window.EventsCapacity?.eventHasCapacityLimit?.(e))
        ? (window.EventsCapacity.eventMaxParticipants(e) || 0)
        : 0;
    const occupiedCap = capacity
        ? (window.EventsCapacity.countOccupiedCapacity(e, {
            seats: STATE.seats,
            parties: STATE.parties,
            goingList: [...going, ...guestGoing],
        }))
        : 0;
    const capacityLeft = capacity ? Math.max(0, capacity - occupiedCap) : null;
    const minNeeded = Number(e.min_participants || 0);
    const thresholdLeft = minNeeded ? Math.max(0, minNeeded - totalGoing) : 0;
    const checkedPct = totalGoing ? Math.round((checkedTotal / totalGoing) * 100) : 0;
    const isLlcPlane = e.event_type === 'llc'
        && e.transportation_mode === 'llc_provides'
        && e.transportation_method === 'plane';
    const ticketHelper = window.EventsManageTicketHandoff;
    const documents = STATE.eventDocuments || STATE.tabData?.docs?.docs || [];
    const planeHandoff = isLlcPlane && ticketHelper
        ? ticketHelper.computePlaneTicketHandoff({ goingRsvps: going, documents, event: e })
        : null;

    const idx = buildPartyIndexes(STATE);

    function memberRow(r) {
        const p = r.profiles || {};
        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
        const initials = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || '?';
        const avatar = p.profile_picture_url
            ? `<img src="${esc(p.profile_picture_url)}" alt="">`
            : `<span>${initials}</span>`;
        const committed = isCommittedGoingRow(e, r);
        const pills = [];
        if (committed) pills.push('<span class="em-pill em-pill-going">Going</span>');
        else if (r.status === 'going') pills.push('<span class="em-pill em-pill-maybe">Payment pending</span>');
        else if (r.status === 'maybe') pills.push('<span class="em-pill em-pill-maybe">Maybe</span>');
        else pills.push('<span class="em-pill em-pill-not">Not going</span>');
        if (r.paid) pills.push('<span class="em-pill em-pill-paid">Paid</span>');
        if (checkedSet.has(r.user_id)) pills.push('<span class="em-pill em-pill-checked">Checked in</span>');
        if (e.invest_eligible && committed && r.paid) {
            pills.push(r.invest_eligible_acknowledged
                ? '<span class="em-pill em-pill-checked">Invest ack ✓</span>'
                : '<span class="em-pill em-pill-not">No invest ack</span>');
        }
        if (isLlcPlane && committed && ticketHelper) {
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
                event: e,
            });
            pills.push(...meta.pills);
            subExtra = meta.subExtra || '';
            seatsBlock = meta.seatsBlock || '';
        }

        const hasParty = !!(r.party_id || (r.status === 'going' && idx.partyForMember(r)?.id));
        const removeLabel = (r.paid || hasParty) ? 'Cancel participation' : 'Remove';
        return `<div class="em-attendee-card"><div class="em-avatar">${avatar}</div><div class="em-attendee-main"><p class="em-attendee-name">${esc(name)}</p><p class="em-attendee-sub">Member RSVP${r.qr_token ? ' · ticket ready' : ''}${subExtra}</p><div class="flex flex-wrap gap-1 mt-2">${pills.join('')}</div>${seatsBlock}</div><button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-remove-rsvp="member" data-rsvp-id="${esc(r.id)}" data-user-id="${esc(r.user_id)}" data-paid="${r.paid ? '1' : '0'}" data-has-party="${hasParty ? '1' : '0'}" data-name="${esc(name)}">${removeLabel}</button></div>`;
    }

    function guestRow(g) {
        const initials = (g.guest_name || 'G').slice(0, 1).toUpperCase();
        const guestCommitted = isCommittedGoingRow(e, g);
        const pills = ['<span class="em-pill em-pill-going">Guest</span>'];
        if (g.status === 'going' && !guestCommitted) {
            pills.push('<span class="em-pill em-pill-maybe">Payment pending</span>');
        }
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
            event: e,
        });
        pills.push(...meta.pills);

        const hasParty = !!(g.party_id || party?.id);
        const removeLabel = (g.paid || hasParty) ? 'Cancel participation' : 'Remove';
        return `<div class="em-attendee-card"><div class="em-avatar" style="background:#fef3c7;color:#92400e"><span>${esc(initials)}</span></div><div class="em-attendee-main"><p class="em-attendee-name">${esc(name)}</p><p class="em-attendee-sub">${esc(g.guest_email || 'Public guest')}${meta.subExtra || ''}</p><div class="flex flex-wrap gap-1 mt-2">${pills.join('')}</div>${meta.seatsBlock || ''}</div><button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-remove-rsvp="guest" data-rsvp-id="${esc(g.id)}" data-guest-token="${esc(g.guest_token)}" data-paid="${g.paid ? '1' : '0'}" data-has-party="${hasParty ? '1' : '0'}" data-name="${esc(name)}">${removeLabel}</button></div>`;
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
            <div class="em-op-meta" style="margin-top:12px">
                <button type="button" class="em-btn-ghost" data-copy-roster>Copy roster</button>
            </div>
        </div>

        <div class="em-metric-grid mb-4">
            <div class="em-metric"><span>Total going</span><strong>${totalGoing}</strong><small>${going.length} member · ${guestGoing.length} guest</small></div>
            <div class="em-metric"><span>Checked in</span><strong>${checkedTotal}</strong><small>${checkedPct}% of going</small></div>
            <div class="em-metric"><span>Interested</span><strong>${maybe.length}</strong><small>Member maybes</small></div>
            <div class="em-metric"><span>Capacity</span><strong>${capacityLeft === null ? 'Open' : capacityLeft}</strong><small>${capacity ? `${occupiedCap}/${capacity} filled` : 'No max set'}</small></div>
            ${totalPending ? `<div class="em-metric"><span>Payment pending</span><strong>${totalPending}</strong><small>${paymentPending.length} member · ${guestPaymentPending.length} guest</small></div>` : ''}
        </div>

        ${section('Going members', going, 'No members are going yet.')}
        <div class="em-card mb-3">
            <div class="em-section-head"><div><h3 class="em-section-title">Public guests <span class="text-gray-400 font-normal">· ${guestGoing.length}</span></h3><p class="em-section-sub">Guests from the public event link and ticket flow.</p></div></div>
            ${guestGoing.length ? guestGoing.map(guestRow).join('') : '<p class="text-xs text-gray-400 italic py-2">No public guests yet.</p>'}
        </div>
        ${totalPending ? `
        <div class="em-card mb-3">
            <div class="em-section-head"><div><h3 class="em-section-title">Payment pending <span class="text-gray-400 font-normal">· ${totalPending}</span></h3><p class="em-section-sub">Started checkout but not yet paid — not counted in Going.</p></div></div>
            ${paymentPending.map(memberRow).join('')}
            ${guestPaymentPending.map(guestRow).join('')}
        </div>` : ''}
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
    panel?.querySelectorAll('[data-copy-roster]').forEach((btn) => {
        if (btn.dataset.copyRosterWired) return;
        btn.dataset.copyRosterWired = '1';
        btn.addEventListener('click', async () => {
            const STATE = api().getState?.() || {};
            const text = buildRosterTsv(STATE);
            try {
                if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
                else {
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    ta.remove();
                }
                const prev = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = prev || 'Copy roster'; }, 1500);
            } catch (_) {
                prompt('Copy this roster (TSV):', text);
            }
        });
    });
    panel?.querySelectorAll('[data-copy-pay-link]').forEach((btn) => {
        if (btn.dataset.copyWired) return;
        btn.dataset.copyWired = '1';
        btn.addEventListener('click', async () => {
            const token = btn.getAttribute('data-copy-pay-link') || '';
            const url = window.EventsHelpers?.paymentMagicLinkUrl
                ? window.EventsHelpers.paymentMagicLinkUrl(token)
                : `${window.location.origin}/events/payments/?t=${encodeURIComponent(token)}`;
            if (!url) return;
            try {
                if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
                else {
                    const ta = document.createElement('textarea');
                    ta.value = url;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    ta.remove();
                }
                const prev = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = prev || 'Copy payment link'; }, 1500);
            } catch (_) {
                prompt('Copy this payment link:', url);
            }
        });
    });
    panel?.querySelectorAll('[data-resend-pay-sms]').forEach((btn) => {
        if (btn.dataset.resendWired) return;
        btn.dataset.resendWired = '1';
        btn.addEventListener('click', async () => {
            const partyId = btn.getAttribute('data-resend-pay-sms') || '';
            if (!partyId) return;
            btn.disabled = true;
            const prev = btn.textContent;
            btn.textContent = 'Sending…';
            try {
                const result = await callEdgeFunction('resend-event-party-payment-link', { party_id: partyId });
                if (result?.error) throw new Error(result.error);
                btn.textContent = result?.skipped ? 'Skipped' : 'Sent';
                setTimeout(() => {
                    btn.disabled = false;
                    btn.textContent = prev || 'Resend SMS';
                }, 1800);
            } catch (err) {
                alert(err.message || 'Could not resend SMS.');
                btn.disabled = false;
                btn.textContent = prev || 'Resend SMS';
            }
        });
    });
}

export const manageRsvpsApi = {
    rsvpsHtml,
    wireRsvps,
    buildRosterTsv,
};

globalThis.EventsManageRsvps = manageRsvpsApi;
