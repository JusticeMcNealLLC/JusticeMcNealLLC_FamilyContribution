/* ──────────────────────────────────────────
   Public Event — RSVP (member + guest)
   ────────────────────────────────────────── */

var pubMemberProfilePhone = null; // null = not loaded; '' = loaded empty
var pubMemberProfileName = '';

async function pubLoadMemberProfileContact() {
    if (!pubCurrentUser?.id) {
        pubMemberProfilePhone = '';
        pubMemberProfileName = '';
        return;
    }
    if (pubMemberProfilePhone != null && pubMemberProfileName) return;
    try {
        const { data } = await supabaseClient
            .from('profiles')
            .select('phone, first_name, last_name')
            .eq('id', pubCurrentUser.id)
            .maybeSingle();
        pubMemberProfilePhone = (data?.phone || '').trim();
        pubMemberProfileName = [data?.first_name, data?.last_name].filter(Boolean).join(' ').trim()
            || (pubCurrentUser.email || '').split('@')[0]
            || 'Member';
    } catch (_) {
        pubMemberProfilePhone = pubMemberProfilePhone || '';
        pubMemberProfileName = pubMemberProfileName || 'Member';
    }
}

function pubMemberPartySeatsHtml(event) {
    if (!window.EventsPartySeats || typeof window.EventsPartySeats.formFieldsHtml !== 'function') {
        if (window.EventsSeatPicker && window.EventsSeatPicker.shouldShow(event, {})) {
            return window.EventsSeatPicker.formFieldsHtml(event, { idPrefix: 'pubMemberSeat' });
        }
        return '';
    }
    if (!window.EventsPartySeats.shouldShow(event, {})) return '';
    return window.EventsPartySeats.formFieldsHtml(event, {
        idPrefix: 'pubMemberParty',
        payerName: pubMemberProfileName || '',
    });
}

function pubMemberPhonePrepHtml() {
    if (pubMemberProfilePhone) return '';
    return `
        <div class="ed-rsvp-phone-field" style="margin:12px 0">
            <label class="ec-label" for="pubMemberPhoneInput">Mobile phone</label>
            <input type="tel" id="pubMemberPhoneInput" class="ec-input evt-input" placeholder="Phone number" required aria-label="Mobile phone">
            <p class="ed-hint" style="margin-top:6px;font-size:12px;color:#6b7280">Required for RSVP. Saved to your profile.</p>
            <label class="ed-checkbox-label evt-checkbox-label" style="display:flex;gap:10px;align-items:flex-start;margin-top:12px">
                <input type="checkbox" id="pubMemberSmsOptInCheck">
                <span style="font-size:12px;color:#6b7280">Text me event updates for this event. Message/data rates may apply. Reply STOP to opt out.</span>
            </label>
        </div>`;
}

function pubMemberInvestAckHtml(event) {
    if (!window.EventsInvestAck || typeof window.EventsInvestAck.formFieldHtml !== 'function') return '';
    return window.EventsInvestAck.formFieldHtml(event, { idPrefix: 'pubMemberInvest' });
}

function pubMemberNoRefundHtml(event, partyTotal, hasRequiredDisclaimers) {
    if (event.pricing_mode !== 'paid' || partyTotal <= 0 || hasRequiredDisclaimers) return '';
    return `
        <label class="ed-checkbox-label evt-checkbox-label" style="display:flex;gap:10px;align-items:flex-start;margin-top:12px">
            <input type="checkbox" id="pubMemberNoRefundCheck">
            <span style="font-size:12px;color:#6b7280">I understand this payment is non-refundable unless cancelled by staff.</span>
        </label>`;
}

function pubPaymentChoiceHtmlForCents(event, partyTotal, idPrefix) {
    if (!window.EventsPaymentChoice || typeof window.EventsPaymentChoice.formFieldsHtml !== 'function') return '';
    if (!window.EventsPaymentChoice.needsChoice(event, partyTotal)) return '';
    return window.EventsPaymentChoice.formFieldsHtml(event, {
        seatPriceCents: partyTotal,
        idPrefix: idPrefix || 'pubMemberPayment',
    });
}

function pubFeeAwarePartyTotal(event, root, partyTotal) {
    const base = Math.max(0, Number(partyTotal) || 0);
    if (!window.EventsPaymentChoice || typeof window.EventsPaymentChoice.displayTotalCents !== 'function') {
        return base;
    }
    if (!window.EventsPaymentChoice.needsChoice(event, base)) return base;
    const choice = window.EventsPaymentChoice.readFromRoot(root || document);
    return window.EventsPaymentChoice.displayTotalCents(event, choice, base);
}

function pubMemberPayButtonLabel(event, partyTotal, root) {
    const unpaidGoing = !!(pubCurrentRsvp?.status === 'going' && !pubCurrentRsvp?.paid && event.pricing_mode === 'paid');
    const displayTotal = pubFeeAwarePartyTotal(event, root, partyTotal);
    if (window.EventsHelpers && typeof window.EventsHelpers.rsvpPayButtonLabel === 'function') {
        return window.EventsHelpers.rsvpPayButtonLabel(event, 'adult', {
            mode: unpaidGoing ? 'complete' : 'rsvp',
            audience: 'member',
            partyTotalCents: displayTotal,
        });
    }
    if (event.pricing_mode === 'paid' && displayTotal > 0) {
        return unpaidGoing
            ? `Complete Payment — ${pubFormatCurrency(displayTotal)}`
            : `RSVP — ${pubFormatCurrency(displayTotal)}`;
    }
    return unpaidGoing ? 'Complete Payment' : 'RSVP as Member';
}

function pubWirePublicMemberPartyPrep(event) {
    const root = document.getElementById('memberRsvpCard') || document.getElementById('rsvpSection') || document;

    function refreshLabels() {
        const partyTotal = pubPartyTotalCents(event, root);
        const btn = document.getElementById('pubMemberRsvpPayBtn');
        if (btn) btn.textContent = pubMemberPayButtonLabel(event, partyTotal, root);
    }

    function refresh() {
        const partyTotal = pubPartyTotalCents(event, root);
        const payWrap = document.getElementById('pubMemberPaymentWrap');
        if (payWrap && window.EventsPaymentChoice) {
            if (window.EventsPaymentChoice.needsChoice(event, partyTotal)) {
                payWrap.innerHTML = pubPaymentChoiceHtmlForCents(event, partyTotal, 'pubMemberPayment');
                window.EventsPaymentChoice.wireForm(
                    root,
                    event,
                    () => pubPartyTotalCents(event, root),
                    () => refreshLabels(),
                );
            } else {
                payWrap.innerHTML = '';
            }
        }
        refreshLabels();

        const noRefund = document.getElementById('pubMemberNoRefundCheck');
        if (noRefund) {
            const hasDisc = pubHasRequiredDisclaimers(event);
            noRefund.closest('label')?.classList.toggle(
                'hidden',
                !(event.pricing_mode === 'paid' && partyTotal > 0) || hasDisc,
            );
        }
    }

    if (window.EventsPartySeats && typeof window.EventsPartySeats.wireForm === 'function') {
        window.EventsPartySeats.wireForm(root, event, refresh);
    }
    refresh();
}

async function pubEnsureMemberPhoneForPublicRsvp() {
    await pubLoadMemberProfileContact();
    if (pubMemberProfilePhone) return pubMemberProfilePhone;
    const inputEl = document.getElementById('pubMemberPhoneInput');
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
        .eq('id', pubCurrentUser.id);
    if (error) {
        alert(error.message || 'Could not save phone number.');
        return null;
    }
    pubMemberProfilePhone = validated.value;
    return validated.value;
}

function pubValidateMemberNoRefundPublic(event, partyTotal, hasRequiredDisclaimers) {
    const noRefund = document.getElementById('pubMemberNoRefundCheck');
    if (!noRefund) return true;
    const label = noRefund.closest('label');
    if (label && label.classList.contains('hidden')) return true;
    if (event.pricing_mode === 'paid' && partyTotal > 0 && !hasRequiredDisclaimers && !noRefund.checked) {
        alert('Please accept the no-refund policy to continue.');
        return false;
    }
    return true;
}

function pubRenderSeatInfoInvitesInto(slot, tokens) {
    if (!slot || !window.EventsHelpers || typeof window.EventsHelpers.seatInfoInvitesHtml !== 'function') return;
    const list = Array.isArray(tokens) ? tokens : [];
    if (!list.length) {
        slot.innerHTML = '';
        return;
    }
    slot.innerHTML = window.EventsHelpers.seatInfoInvitesHtml(list);
    if (typeof window.EventsHelpers.wireSeatInfoInviteCopy === 'function') {
        window.EventsHelpers.wireSeatInfoInviteCopy(slot);
    }
}

async function pubLoadMemberSeatInfoInvites(eventId, root) {
    const slot = (root || document).querySelector('#pubMemberSeatInfoInvites')
        || document.getElementById('pubMemberSeatInfoInvites');
    if (!slot) return;
    if (Array.isArray(window.pubMemberSeatInfoTokens) && window.pubMemberSeatInfoTokens.length) {
        pubRenderSeatInfoInvitesInto(slot, window.pubMemberSeatInfoTokens);
    }
    if (!eventId || typeof callEdgeFunction !== 'function') return;
    try {
        const result = await callEdgeFunction('event-seat-info', {
            action: 'list',
            event_id: eventId,
        });
        const tokens = result?.seat_info_tokens || [];
        if (tokens.length) window.pubMemberSeatInfoTokens = tokens;
        pubRenderSeatInfoInvitesInto(slot, tokens.length ? tokens : window.pubMemberSeatInfoTokens);
    } catch (_) {
        if (!window.pubMemberSeatInfoTokens?.length) slot.innerHTML = '';
    }
}

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

    // Async profile then render prep (paid or free)
    pubLoadMemberProfileContact().then(() => {
        pubRenderMemberRsvpPrep(event, section);
    });
}

function pubRenderMemberRsvpPrep(event, section) {
    if (!section) section = document.getElementById('rsvpSection');
    if (!section) return;

    // ── Paid RSVP ───────────────────────────────────────
    if (event.pricing_mode === 'paid') {
        if (pubCurrentRsvp?.paid) {
            section.innerHTML = `
                <div class="evt-info-card">
                    <span class="evt-info-card-icon">✅</span>
                    <div>
                        <p class="evt-info-card-title">RSVP Confirmed &amp; Paid</p>
                        <p class="evt-info-card-sub">Non-refundable • Contact admin for changes</p>
                    </div>
                </div>
                <div id="pubMemberSeatInfoInvites"></div>`;
            pubLoadMemberSeatInfoInvites(event.id, section);
            return;
        }

        const partyHtml = pubMemberPartySeatsHtml(event);
        const discHtml = pubDisclaimerAcksHtml(event, 'pubMemberDisc');
        const amenityHtml = pubAmenityVoteHtml(event, 'pubMemberAmenity');
        const partyTotal = 0; // refreshed after wire
        const hasDisc = pubHasRequiredDisclaimers(event);
        const paymentHtml = pubPaymentChoiceHtmlForCents(event, pubSeatPriceCents(event, 'adult'), 'pubMemberPayment');
        const investHtml = pubMemberInvestAckHtml(event);
        const phoneHtml = pubMemberPhonePrepHtml();
        const noRefundHtml = pubMemberNoRefundHtml(event, pubSeatPriceCents(event, 'adult'), hasDisc);
        const btnLabel = pubMemberPayButtonLabel(event, pubSeatPriceCents(event, 'adult'));

        section.innerHTML = `
            <div id="pubMemberPartyWrap">${partyHtml}</div>
            <div id="pubMemberAttachGuests"></div>
            ${phoneHtml}
            ${discHtml}
            <div id="pubMemberAmenityWrap">${amenityHtml}</div>
            <div id="pubMemberPaymentWrap">${paymentHtml}</div>
            ${investHtml}
            ${noRefundHtml}
            <div id="pubMemberSeatInfoInvites"></div>
            <div style="text-align:center;margin-top:12px">
                <button type="button" onclick="pubHandlePaidRsvp()" class="evt-rsvp-pay" id="pubMemberRsvpPayBtn">
                    ${btnLabel}
                </button>
                <p style="font-size:13px;color:#b0b0b0;margin-top:10px">${discHtml ? 'Acknowledge clauses above' : 'Non-refundable unless cancelled by staff'}${event.raffle_enabled ? ' • Includes raffle entry' : ''}</p>
            </div>`;
        pubWirePublicMemberPartyPrep(event);
        pubLoadPublicMemberAttachGuests(event, section);
        if (pubCurrentRsvp?.status === 'going') {
            pubLoadMemberSeatInfoInvites(event.id, section);
        }
        return;
    }

    // ── Free RSVP (any non-paid event) ──────────────────
    const goingCls = pubCurrentRsvp?.status === 'going' ? ' active-going' : '';
    const notGoingCls = pubCurrentRsvp?.status === 'not_going' ? ' active-not' : '';
    const partyHtml = pubMemberPartySeatsHtml(event);
    const discHtml = pubDisclaimerAcksHtml(event, 'pubMemberDisc');
    const amenityHtml = pubAmenityVoteHtml(event, 'pubMemberAmenity');
    const phoneHtml = pubMemberPhonePrepHtml();
    const investHtml = pubMemberInvestAckHtml(event);

    section.innerHTML = `
        <div id="pubMemberPartyWrap">${partyHtml}</div>
        <div id="pubMemberAttachGuests"></div>
        ${phoneHtml}
        ${discHtml}
        <div id="pubMemberAmenityWrap">${amenityHtml}</div>
        ${investHtml}
        <div id="pubMemberSeatInfoInvites"></div>
        <p style="font-size:12px;font-weight:700;color:#717171;text-transform:uppercase;letter-spacing:.06em;margin:14px 0 10px">Your RSVP</p>
        <div class="evt-rsvp-pair" role="group" aria-label="RSVP options">
            <button type="button" onclick="pubHandleRsvp('going')" class="evt-rsvp-btn${goingCls}" aria-pressed="${pubCurrentRsvp?.status === 'going'}">
                <span class="evt-rsvp-icon">✅</span> Going
            </button>
            <button type="button" onclick="pubHandleRsvp('not_going')" class="evt-rsvp-btn${notGoingCls}" aria-pressed="${pubCurrentRsvp?.status === 'not_going'}">
                <span class="evt-rsvp-icon">✕</span> Not going
            </button>
        </div>
        ${pubCurrentRsvp ? '<p style="font-size:13px;color:#b0b0b0;text-align:center;margin-top:10px">Tap your current response to cancel</p>' : ''}
    `;
    pubWirePublicMemberPartyPrep(event);
    pubLoadPublicMemberAttachGuests(event, section);
    if (pubCurrentRsvp?.status === 'going') {
        pubLoadMemberSeatInfoInvites(event.id, section);
    }
}

function pubAmenityVoteHtml(event, idPrefix) {
    if (!window.EventsAmenityVoting || typeof window.EventsAmenityVoting.formFieldsHtml !== 'function') return '';
    if (!window.EventsAmenityVoting.needsVote(event)) return '';
    const cfg = window.EventsAmenityVoting.normalizeConfig(event?.amenity_voting);
    return window.EventsAmenityVoting.formFieldsHtml(cfg, { idPrefix });
}

function pubReadAmenityVote(event, root) {
    if (!window.EventsAmenityVoting || !window.EventsAmenityVoting.needsVote(event)) return null;
    return window.EventsAmenityVoting.readVoteFromRoot(root || document) || null;
}

function pubValidateAmenityVote(event, optionId) {
    if (!window.EventsAmenityVoting || !window.EventsAmenityVoting.needsVote(event)) return null;
    const cfg = window.EventsAmenityVoting.normalizeConfig(event?.amenity_voting);
    return window.EventsAmenityVoting.validateVote(cfg, optionId);
}

function pubNeedsAmenityVote(event) {
    return !!(window.EventsAmenityVoting
        && typeof window.EventsAmenityVoting.needsVote === 'function'
        && window.EventsAmenityVoting.needsVote(event));
}

function pubPaymentChoiceHtml(event, role) {
    const root = document.getElementById('memberRsvpCard') || document.getElementById('rsvpSection') || document;
    const partyTotal = (window.EventsPartySeats && root.querySelector('[data-party-seats-root]'))
        ? pubPartyTotalCents(event, root)
        : pubSeatPriceCents(event, role);
    return pubPaymentChoiceHtmlForCents(event, partyTotal, 'pubMemberPayment');
}

function pubReadPaymentChoice(event, root, seatPriceCents) {
    if (!window.EventsPaymentChoice || !window.EventsPaymentChoice.needsChoice(event, seatPriceCents)) {
        return null;
    }
    return window.EventsPaymentChoice.readFromRoot(root || document);
}

function pubValidatePaymentChoice(event, choice, seatPriceCents) {
    if (!window.EventsPaymentChoice || !window.EventsPaymentChoice.needsChoice(event, seatPriceCents)) return null;
    return window.EventsPaymentChoice.validateChoice(event, choice, seatPriceCents);
}

function pubNeedsPaymentChoice(event, seatPriceCents) {
    return !!(window.EventsPaymentChoice
        && typeof window.EventsPaymentChoice.needsChoice === 'function'
        && window.EventsPaymentChoice.needsChoice(event, seatPriceCents));
}

function pubHasIncludedCatalog(event) {
    return !!(window.EventsIncludedItems
        && typeof window.EventsIncludedItems.hasCatalog === 'function'
        && window.EventsIncludedItems.hasCatalog(event?.included_items));
}

function pubReadSeatRole(root) {
    if (window.EventsPartySeats && typeof window.EventsPartySeats.readPayerRoleFromRoot === 'function') {
        return window.EventsPartySeats.readPayerRoleFromRoot(root || document);
    }
    if (window.EventsSeatPicker && typeof window.EventsSeatPicker.readRoleFromRoot === 'function') {
        return window.EventsSeatPicker.readRoleFromRoot(root || document);
    }
    return (window.EventsHelpers && window.EventsHelpers.normalizeSeatRole)
        ? window.EventsHelpers.normalizeSeatRole('adult')
        : 'adult';
}

function pubSeatPriceCents(event, role) {
    if (window.EventsHelpers && typeof window.EventsHelpers.seatPriceCents === 'function') {
        return window.EventsHelpers.seatPriceCents(event, role);
    }
    return Number(event?.rsvp_cost_cents || 0);
}

function pubCatalogForRole(event, role) {
    if (!window.EventsIncludedItems) return [];
    if (typeof window.EventsIncludedItems.forRole === 'function') {
        return window.EventsIncludedItems.forRole(event?.included_items, role);
    }
    return window.EventsIncludedItems.normalizeIncludedItems(event?.included_items);
}

function pubAdultCatalog(event) {
    return pubCatalogForRole(event, 'adult');
}

function pubPartyTotalCents(event, root) {
    const scope = root || document;
    if (window.EventsPartySeats && typeof window.EventsPartySeats.partyBaseTotalCents === 'function') {
        const seats = window.EventsPartySeats.readSeatsFromRoot(scope, event);
        return window.EventsPartySeats.partyBaseTotalCents(event, seats);
    }
    const role = pubReadSeatRole(scope);
    return pubSeatPriceCents(event, role);
}

function pubReadPartySeats(event, root, guestName) {
    const scope = root || document;
    if (window.EventsPartySeats && typeof window.EventsPartySeats.readSeatsFromRoot === 'function') {
        const seats = window.EventsPartySeats.readSeatsFromRoot(scope, event);
        if (guestName && seats.length && seats[0].is_payer) {
            seats[0].display_name = guestName;
        }
        return seats;
    }
    const seat_role = pubReadSeatRole(scope);
    const seat_options = pubReadSeatOptions(event, scope, seat_role);
    return [{
        role: seat_role,
        display_name: guestName || 'Guest',
        is_payer: true,
        ...(Object.keys(seat_options).length ? { options: seat_options } : {}),
    }];
}

function pubGuestPaymentIntent() {
    if (window.EventsAttachGuests && typeof window.EventsAttachGuests.readGuestIntent === 'function') {
        return window.EventsAttachGuests.readGuestIntent(pubGuestFormRoot());
    }
    return 'self';
}

function pubApplyGuestIntentUi(event, root) {
    const scope = root || pubGuestFormRoot();
    const intent = pubGuestPaymentIntent();
    const attachLater = intent === 'attach_later';
    const partyTotal = pubPartyTotalCents(event, scope);
    const payWrap = scope.querySelector('#guestPaymentChoice')
        || scope.querySelector('#ctaGuestPaymentChoice')
        || document.getElementById('guestPaymentChoice')
        || document.getElementById('ctaGuestPaymentChoice');
    if (payWrap) {
        if (attachLater) {
            payWrap.innerHTML = '';
            payWrap.classList.add('hidden');
        } else {
            payWrap.classList.remove('hidden');
        }
    }
    const noRefund = scope.querySelector('#guestNoRefundCheck')
        || document.getElementById('guestNoRefundCheck')
        || document.getElementById('ctaGuestNoRefundCheck');
    if (noRefund) {
        const hasDisc = pubHasRequiredDisclaimers(event);
        const show = !attachLater && event.pricing_mode === 'paid' && partyTotal > 0 && !hasDisc;
        noRefund.closest('label')?.classList.toggle('hidden', !show);
    }
    const btn = scope.querySelector('#guestRsvpBtn')
        || scope.querySelector('#ctaGuestRsvpBtn')
        || document.getElementById('guestRsvpBtn')
        || document.getElementById('ctaGuestRsvpBtn');
    if (btn) {
        if (attachLater) {
            btn.textContent = 'Request to join — waiting for payer';
        } else {
            pubUpdateGuestRsvpBtnLabel(event, scope);
        }
    }
}

function pubWireGuestPaymentIntent(event, root) {
    const scope = root || document;
    if (!window.EventsAttachGuests) return;
    window.EventsAttachGuests.wireGuestIntent(scope, () => pubApplyGuestIntentUi(event, scope));
    pubApplyGuestIntentUi(event, scope);
}

function pubLoadPublicMemberAttachGuests(event, root) {
    if (!event?.id || !pubCurrentUser || !window.EventsAttachGuests) return;
    const slot = (root || document).querySelector('#pubMemberAttachGuests')
        || document.getElementById('pubMemberAttachGuests');
    if (!slot) return;
    const unpaid = !(pubCurrentRsvp?.paid);
    window.EventsAttachGuests.loadAndWire(slot, {
        eventId: event.id,
        payerUnpaid: unpaid,
        callEdge: (name, body) => callEdgeFunction(name, body),
        onAttached: async (result) => {
            if (result?.party_total_cents != null) {
                // Refresh prep so party seats / pay label update
                await pubLoadEvent(event.slug, false);
            } else {
                await pubLoadEvent(event.slug, false);
            }
        },
    });
}

function pubGuestConfirmCopy(guestRsvp, name, email, alreadyExists) {
    const waiting = !!(guestRsvp?.attach_requested || window.pubGuestAttachRequested);
    if (waiting) {
        return {
            title: alreadyExists ? 'Request already on file' : 'You’re on the list — waiting for a payer',
            sub: `${pubEscapeHtml(guestRsvp?.guest_name || name)} · A member can add you to their party`,
        };
    }
    return {
        title: alreadyExists ? 'You already RSVP\'d' : 'You\'re RSVP\'d!',
        sub: `${pubEscapeHtml(guestRsvp?.guest_name || name)} · ${pubEscapeHtml(guestRsvp?.guest_email || email || '')}`,
    };
}

function pubUpdateGuestRsvpBtnLabel(event, root) {
    const scope = root || document;
    const partyTotal = pubPartyTotalCents(event, scope);
    const displayTotal = pubFeeAwarePartyTotal(event, scope, partyTotal);
    const unpaidGoing = !!(pubGuestRsvp?.status === 'going' && !pubGuestRsvp?.paid && event.pricing_mode === 'paid');
    let label;
    if (window.EventsHelpers && typeof window.EventsHelpers.rsvpPayButtonLabel === 'function') {
        label = window.EventsHelpers.rsvpPayButtonLabel(event, 'adult', {
            mode: unpaidGoing ? 'complete' : 'rsvp',
            audience: 'guest',
            partyTotalCents: displayTotal,
        });
    } else if (unpaidGoing && displayTotal > 0) {
        label = `Complete Payment — ${pubFormatCurrency(displayTotal)}`;
    } else if (event.pricing_mode === 'paid' && displayTotal > 0) {
        label = `RSVP as Guest — ${pubFormatCurrency(displayTotal)}`;
    } else if (event.pricing_mode === 'paid') {
        label = unpaidGoing ? 'Complete Payment' : 'RSVP as Guest — Free';
    } else {
        label = 'RSVP as Guest';
    }
    const btn = scope.querySelector('#guestRsvpBtn') || scope.querySelector('#ctaGuestRsvpBtn');
    if (btn) btn.textContent = label;
    const payBtn = scope.querySelector('#pubMemberRsvpPayBtn');
    if (payBtn) {
        payBtn.textContent = pubMemberPayButtonLabel(event, partyTotal, scope);
    }
}

function pubWirePublicPartySeats(event, root, opts) {
    if (!event) return;
    const options = opts || {};
    const scope = root || document;

    function onPartyChange() {
        pubUpdateGuestRsvpBtnLabel(event, scope);
        const paymentWrapId = options.paymentWrapId;
        const paymentPrefix = options.paymentPrefix || 'pubPayment';
        const partyTotal = pubPartyTotalCents(event, scope);
        if (paymentWrapId && window.EventsPaymentChoice && window.EventsHelpers) {
            const payWrap = document.getElementById(paymentWrapId);
            if (payWrap) {
                if (window.EventsPaymentChoice.needsChoice(event, partyTotal)) {
                    payWrap.innerHTML = window.EventsPaymentChoice.formFieldsHtml(event, {
                        seatPriceCents: partyTotal,
                        idPrefix: paymentPrefix,
                    });
                    window.EventsPaymentChoice.wireForm(
                        scope,
                        event,
                        () => pubPartyTotalCents(event, scope),
                        () => pubUpdateGuestRsvpBtnLabel(event, scope),
                    );
                } else {
                    payWrap.innerHTML = '';
                }
            }
        }
        const noRefundCheck = scope.querySelector('#guestNoRefundCheck')
            || document.getElementById('guestNoRefundCheck')
            || document.getElementById('ctaGuestNoRefundCheck');
        if (noRefundCheck) {
            const hasDisc = pubHasRequiredDisclaimers(event);
            noRefundCheck.closest('label')?.classList.toggle(
                'hidden',
                !(event.pricing_mode === 'paid' && partyTotal > 0) || hasDisc,
            );
        }
    }

    if (window.EventsPartySeats && typeof window.EventsPartySeats.wireForm === 'function') {
        window.EventsPartySeats.wireForm(scope, event, onPartyChange);
    }
    onPartyChange();
}

function pubWirePublicSeatPicker(event, root, opts) {
    pubWirePublicPartySeats(event, root, opts);
}

function pubDiscCatalog(event) {
    if (!window.EventsDisclaimers) return [];
    if (typeof window.EventsDisclaimers.effectiveDisclaimers === 'function') {
        return window.EventsDisclaimers.effectiveDisclaimers(event);
    }
    if (typeof window.EventsDisclaimers.normalizeDisclaimers === 'function') {
        return window.EventsDisclaimers.normalizeDisclaimers(event?.disclaimers);
    }
    return [];
}

function pubHasRequiredDisclaimers(event) {
    const catalog = pubDiscCatalog(event);
    if (window.EventsDisclaimers && typeof window.EventsDisclaimers.hasRequiredDisclaimers === 'function') {
        return window.EventsDisclaimers.hasRequiredDisclaimers(catalog);
    }
    return catalog.some((d) => d.required);
}

function pubIncludedOptionsHtml(event, idPrefix, role) {
    if (!window.EventsIncludedItems || typeof window.EventsIncludedItems.formFieldsHtml !== 'function') return '';
    if (!pubHasIncludedCatalog(event)) return '';
    const seatRole = role || pubReadSeatRole(document);
    return window.EventsIncludedItems.formFieldsHtml(event?.included_items, { idPrefix, role: seatRole });
}

function pubDisclaimerAcksHtml(event, idPrefix) {
    if (!window.EventsDisclaimers || typeof window.EventsDisclaimers.formFieldsHtml !== 'function') return '';
    const catalog = pubDiscCatalog(event);
    if (!catalog.length) return '';
    return window.EventsDisclaimers.formFieldsHtml(catalog, { idPrefix });
}

function pubReadSeatOptions(event, root, role) {
    if (!window.EventsIncludedItems) return {};
    if (!pubHasIncludedCatalog(event)) return {};
    const seatRole = role || pubReadSeatRole(root || document);
    return window.EventsIncludedItems.readAnswersFromRoot(root || document, event?.included_items, seatRole);
}

function pubValidateSeatOptions(event, answers, role) {
    if (!window.EventsIncludedItems) return null;
    if (!pubHasIncludedCatalog(event)) return null;
    const seatRole = role || pubReadSeatRole(document);
    return window.EventsIncludedItems.validateAnswers(event?.included_items, answers, seatRole);
}

function pubReadDisclaimerAcks(event, root) {
    if (!window.EventsDisclaimers) return [];
    const catalog = pubDiscCatalog(event);
    if (!catalog.length) return [];
    return window.EventsDisclaimers.readAckIdsFromRoot(root || document, catalog);
}

function pubValidateDisclaimerAcks(event, ackIds) {
    if (!window.EventsDisclaimers) return null;
    const catalog = pubDiscCatalog(event);
    if (!window.EventsDisclaimers.hasRequiredDisclaimers(catalog)) return null;
    return window.EventsDisclaimers.validateAcks(catalog, ackIds);
}

/* ── Raffle Section (Public Page) ────────── */

async function pubHandlePaidRsvp() {
    if (!pubCurrentUser || !pubCurrentEvent) return;

    const memberRoot = document.getElementById('memberRsvpCard') || document.getElementById('rsvpSection') || document;
    const seats = pubReadPartySeats(pubCurrentEvent, memberRoot, pubMemberProfileName || 'Member');
    if (window.EventsPartySeats && typeof window.EventsPartySeats.validatePartySeats === 'function') {
        const catalog = window.EventsIncludedItems
            ? window.EventsIncludedItems.normalizeIncludedItems(pubCurrentEvent.included_items)
            : [];
        const seatsErr = window.EventsPartySeats.validatePartySeats(pubCurrentEvent, seats, catalog, {
            allowIncompleteGuests: true,
        });
        if (seatsErr) {
            alert(seatsErr);
            return;
        }
    }
    const seat_role = (seats.find((s) => s.is_payer) || seats[0] || {}).role || 'adult';
    const disclaimer_acks = pubReadDisclaimerAcks(pubCurrentEvent, memberRoot);
    const ackErr = pubValidateDisclaimerAcks(pubCurrentEvent, disclaimer_acks);
    if (ackErr) {
        if (window.EventsDisclaimers?.scrollToAckField) {
            window.EventsDisclaimers.scrollToAckField(memberRoot);
        }
        alert(ackErr);
        return;
    }
    const amenity_vote_option_id = pubReadAmenityVote(pubCurrentEvent, memberRoot);
    const voteErr = pubValidateAmenityVote(pubCurrentEvent, amenity_vote_option_id);
    if (voteErr) {
        if (window.EventsAmenityVoting?.scrollToVoteField) {
            window.EventsAmenityVoting.scrollToVoteField(memberRoot);
        }
        alert(voteErr);
        return;
    }
    if (window.EventsInvestAck) {
        const investErr = window.EventsInvestAck.validateAck(pubCurrentEvent, memberRoot);
        if (investErr) {
            alert(investErr);
            return;
        }
    }
    const investAcknowledged = window.EventsInvestAck
        && window.EventsInvestAck.isRequired(pubCurrentEvent)
        && window.EventsInvestAck.readAcknowledgedFromRoot(memberRoot);

    const partyTotal = pubPartyTotalCents(pubCurrentEvent, memberRoot);
    const hasRequiredDisclaimers = pubHasRequiredDisclaimers(pubCurrentEvent);
    const needsAmenityVote = pubNeedsAmenityVote(pubCurrentEvent);
    if (!pubValidateMemberNoRefundPublic(pubCurrentEvent, partyTotal, hasRequiredDisclaimers)) return;

    const phone = await pubEnsureMemberPhoneForPublicRsvp();
    if (!phone) return;

    const needsPaymentChoice = pubNeedsPaymentChoice(pubCurrentEvent, partyTotal);
    let paymentChoice = null;
    if (partyTotal > 0 && needsPaymentChoice) {
        paymentChoice = pubReadPaymentChoice(pubCurrentEvent, memberRoot, partyTotal);
        const payErr = pubValidatePaymentChoice(pubCurrentEvent, paymentChoice, partyTotal);
        if (payErr) {
            if (window.EventsPaymentChoice?.scrollToField) {
                window.EventsPaymentChoice.scrollToField(memberRoot);
            }
            alert(payErr);
            return;
        }
    }

    if (partyTotal <= 0) {
        try {
            const result = await callEdgeFunction('rsvp-member-party', {
                event_id: pubCurrentEvent.id,
                seats,
                seat_role,
                phone,
                ...(hasRequiredDisclaimers ? { disclaimer_acks } : {}),
                ...(needsAmenityVote ? { amenity_vote_option_id } : {}),
            });
            pubCurrentRsvp = result?.rsvp || pubCurrentRsvp;
            window.pubMemberSeatInfoTokens = result?.seat_info_tokens || [];
            await pubMaybeMemberSmsOptIn(pubCurrentEvent.id);
            await pubLoadEvent(pubCurrentEvent.slug, false);
        } catch (err) {
            console.error('Free kid RSVP error:', err);
            alert(err.message || 'Failed to complete RSVP. Please try again.');
        }
        return;
    }

    const confirmPay = confirm(
        (needsPaymentChoice && paymentChoice && window.EventsPaymentChoice?.confirmMessage)
            ? window.EventsPaymentChoice.confirmMessage(pubCurrentEvent, paymentChoice, partyTotal)
            : (hasRequiredDisclaimers
                ? `RSVP costs ${pubFormatCurrency(partyTotal)}.\n\nProceed to checkout?`
                : `RSVP costs ${pubFormatCurrency(partyTotal)}.\n\n` +
                  'By completing your RSVP, you agree that your payment is non-refundable ' +
                  'unless this event is cancelled or rescheduled by LLC staff.\n\n' +
                  'Proceed to checkout?')
    );
    if (!confirmPay) return;

    try {
        await pubMaybeMemberSmsOptIn(pubCurrentEvent.id);
        const { url } = await callEdgeFunction('create-event-checkout', {
            event_id: pubCurrentEvent.id,
            type: 'rsvp',
            seats,
            seat_role,
            phone,
            ...(hasRequiredDisclaimers ? { disclaimer_acks } : {}),
            ...(needsAmenityVote ? { amenity_vote_option_id } : {}),
            ...(needsPaymentChoice && paymentChoice ? {
                plan_kind: paymentChoice.plan_kind,
                method: paymentChoice.method,
            } : {}),
            ...(investAcknowledged ? { invest_eligible_acknowledged: true } : {}),
        });
        if (url) window.location.href = url;
    } catch (err) {
        console.error('Paid RSVP error:', err);
        alert(err.message || 'Failed to start checkout. Please try again.');
    }
}

/* ── Paid Raffle Handler (Public Page) ───── */

async function pubMaybeMemberSmsOptIn(eventId) {
    const smsCheck = document.getElementById('pubMemberSmsOptInCheck');
    if (!smsCheck?.checked || !eventId || typeof callEdgeFunction !== 'function') return;
    try {
        await callEdgeFunction('upsert-event-sms-recipient', {
            event_id: eventId,
            sms_opt_in: true,
            sms_consent_text_version: 'event_sms_v1',
        });
    } catch (_) { /* non-blocking */ }
}

async function pubHandleRsvp(status) {
    if (!pubCurrentUser || !pubCurrentEvent) return;

    try {
        const memberRoot = document.getElementById('memberRsvpCard')
            || document.getElementById('rsvpSection')
            || document;
        const hasIncludedCatalog = pubHasIncludedCatalog(pubCurrentEvent);
        const hasRequiredDisclaimers = pubHasRequiredDisclaimers(pubCurrentEvent);
        const needsAmenityVote = pubNeedsAmenityVote(pubCurrentEvent);
        const showPartySeats = !!(window.EventsPartySeats
            && window.EventsPartySeats.shouldShow(pubCurrentEvent, {}));
        const showSeatPicker = !!(window.EventsSeatPicker
            && window.EventsSeatPicker.shouldShow(pubCurrentEvent, {}));
        const needsPartyEdge = status === 'going'
            && (hasIncludedCatalog || hasRequiredDisclaimers || showPartySeats || showSeatPicker || needsAmenityVote);

        let seats = [];
        let seat_role = 'adult';
        let disclaimer_acks = [];
        let amenity_vote_option_id = null;

        if (status === 'going') {
            seats = pubReadPartySeats(pubCurrentEvent, memberRoot, pubMemberProfileName || 'Member');
            if (window.EventsPartySeats && typeof window.EventsPartySeats.validatePartySeats === 'function') {
                const catalog = window.EventsIncludedItems
                    ? window.EventsIncludedItems.normalizeIncludedItems(pubCurrentEvent.included_items)
                    : [];
                const seatsErr = window.EventsPartySeats.validatePartySeats(pubCurrentEvent, seats, catalog, {
                    allowIncompleteGuests: true,
                });
                if (seatsErr) {
                    alert(seatsErr);
                    return;
                }
            }
            seat_role = (seats.find((s) => s.is_payer) || seats[0] || {}).role || 'adult';

            if (hasRequiredDisclaimers) {
                disclaimer_acks = pubReadDisclaimerAcks(pubCurrentEvent, memberRoot);
                const ackErr = pubValidateDisclaimerAcks(pubCurrentEvent, disclaimer_acks);
                if (ackErr) {
                    if (window.EventsDisclaimers?.scrollToAckField) {
                        window.EventsDisclaimers.scrollToAckField(memberRoot);
                    }
                    alert(ackErr);
                    return;
                }
            }
            if (needsAmenityVote) {
                amenity_vote_option_id = pubReadAmenityVote(pubCurrentEvent, memberRoot);
                const voteErr = pubValidateAmenityVote(pubCurrentEvent, amenity_vote_option_id);
                if (voteErr) {
                    if (window.EventsAmenityVoting?.scrollToVoteField) {
                        window.EventsAmenityVoting.scrollToVoteField(memberRoot);
                    }
                    alert(voteErr);
                    return;
                }
            }
            if (window.EventsInvestAck) {
                const investErr = window.EventsInvestAck.validateAck(pubCurrentEvent, memberRoot);
                if (investErr) {
                    alert(investErr);
                    return;
                }
            }
        }

        const applyPartyResult = async (result) => {
            pubCurrentRsvp = result?.rsvp || pubCurrentRsvp;
            if (Array.isArray(result?.seat_info_tokens) && result.seat_info_tokens.length) {
                window.pubMemberSeatInfoTokens = result.seat_info_tokens;
            }
            await pubMaybeMemberSmsOptIn(pubCurrentEvent.id);
            await pubLoadEvent(pubCurrentEvent.slug, false);
        };

        if (status === 'going' && needsPartyEdge) {
            if (pubCurrentRsvp?.paid) {
                alert('Paid RSVPs cannot be changed. Contact an admin for assistance.');
                return;
            }
            const phone = await pubEnsureMemberPhoneForPublicRsvp();
            if (!phone) return;
            const result = await callEdgeFunction('rsvp-member-party', {
                event_id: pubCurrentEvent.id,
                seats,
                seat_role,
                phone,
                ...(hasRequiredDisclaimers ? { disclaimer_acks } : {}),
                ...(needsAmenityVote ? { amenity_vote_option_id } : {}),
            });
            await applyPartyResult(result);
            if (window.pubCtaRaffleIntent && document.getElementById('evtCtaBar')) {
                window.pubCtaRaffleIntent = false;
                pubOpenCtaPanel('raffle');
            }
            return;
        }

        if (status === 'going' && (hasRequiredDisclaimers || needsAmenityVote)) {
            const phone = await pubEnsureMemberPhoneForPublicRsvp();
            if (!phone) return;
            const result = await callEdgeFunction('rsvp-member-party', {
                event_id: pubCurrentEvent.id,
                seats,
                seat_role,
                phone,
                ...(hasRequiredDisclaimers ? { disclaimer_acks } : {}),
                ...(needsAmenityVote ? { amenity_vote_option_id } : {}),
            });
            await applyPartyResult(result);
            return;
        }

        if (pubCurrentRsvp && pubCurrentRsvp.status === status) {
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
            if (status === 'going') {
                const phone = await pubEnsureMemberPhoneForPublicRsvp();
                if (!phone) return;
                const result = await callEdgeFunction('rsvp-member-party', {
                    event_id: pubCurrentEvent.id,
                    seats,
                    seat_role,
                    phone,
                });
                await applyPartyResult(result);
                if (window.pubCtaRaffleIntent && document.getElementById('evtCtaBar')) {
                    window.pubCtaRaffleIntent = false;
                    pubOpenCtaPanel('raffle');
                }
                return;
            }
            const { data } = await supabaseClient
                .from('event_rsvps')
                .update({ status })
                .eq('id', pubCurrentRsvp.id)
                .select()
                .single();
            pubCurrentRsvp = data;
        } else if (status === 'going') {
            const phone = await pubEnsureMemberPhoneForPublicRsvp();
            if (!phone) return;
            const result = await callEdgeFunction('rsvp-member-party', {
                event_id: pubCurrentEvent.id,
                seats,
                seat_role,
                phone,
            });
            await applyPartyResult(result);
            if (window.pubCtaRaffleIntent && document.getElementById('evtCtaBar')) {
                window.pubCtaRaffleIntent = false;
                pubOpenCtaPanel('raffle');
            }
            return;
        } else {
            const { data } = await supabaseClient
                .from('event_rsvps')
                .upsert({ event_id: pubCurrentEvent.id, user_id: pubCurrentUser.id, status }, { onConflict: 'event_id,user_id' })
                .select()
                .single();
            pubCurrentRsvp = data;
        }

        await pubLoadEvent(pubCurrentEvent.slug, false);
    } catch (err) {
        console.error('RSVP error:', err);
        alert(err.message || 'Failed to update RSVP. Please try again.');
    }
}

/* ── QR Ticket ───────────────────────────── */

function pubRenderGuestRsvpSection(event) {
    const section = document.getElementById('guestRsvpSection');
    if (!section) return;

    // Move to <body> on mobile so position:fixed escapes ancestor transform
    // stacking contexts (e.g. evt-fade-in on #eventContent), while desktop
    // keeps the card in the sidebar layout.
    if (window.matchMedia('(max-width: 1023px)').matches && section.parentElement !== document.body) {
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
        const waiting = !!(pubGuestRsvp.attach_requested || window.pubGuestAttachRequested);
        section.classList.remove('hidden');
        const invitesHtml = (window.EventsHelpers && typeof window.EventsHelpers.seatInfoInvitesHtml === 'function'
            && Array.isArray(window.pubSeatInfoTokens) && window.pubSeatInfoTokens.length)
            ? window.EventsHelpers.seatInfoInvitesHtml(window.pubSeatInfoTokens)
            : '<div id="pubGuestSeatInfoInvites"></div>';
        const copy = pubGuestConfirmCopy(pubGuestRsvp, pubGuestRsvp.guest_name, pubGuestRsvp.guest_email, false);
        section.innerHTML = `
            <div class="evt-info-card">
                <span class="evt-info-card-icon">${waiting ? '⏳' : '✅'}</span>
                <div>
                    <p class="evt-info-card-title">${copy.title}</p>
                    <p class="evt-info-card-sub">${copy.sub}${isPaidGuest && !waiting ? ' · Non-refundable' : ''}</p>
                </div>
            </div>
            ${invitesHtml}`;
        if (window.EventsHelpers && typeof window.EventsHelpers.wireSeatInfoInviteCopy === 'function') {
            window.EventsHelpers.wireSeatInfoInviteCopy(section);
        }
        if (!window.pubSeatInfoTokens?.length && pubGuestToken) {
            pubLoadGuestSeatInfoInvites(event.id, pubGuestToken, section);
        }
        return;
    }

    // Default: show the unified tab card
    section.classList.remove('hidden');

    const guestRoot = section;
    const seatPickerEl = document.getElementById('guestSeatPicker');
    const guestName = document.getElementById('guestNameInput')?.value?.trim() || '';
    if (seatPickerEl && window.EventsPartySeats && window.EventsPartySeats.shouldShow(event, {})) {
        seatPickerEl.innerHTML = window.EventsPartySeats.formFieldsHtml(event, {
            idPrefix: 'pubGuestParty',
            payerName: guestName,
        });
    } else if (seatPickerEl && window.EventsSeatPicker && window.EventsSeatPicker.shouldShow(event, {})) {
        seatPickerEl.innerHTML = window.EventsSeatPicker.formFieldsHtml(event, { idPrefix: 'pubGuestSeat' });
    } else if (seatPickerEl) {
        seatPickerEl.innerHTML = '';
    }

    const intentSlot = document.getElementById('guestPayIntent');
    if (intentSlot && window.EventsAttachGuests) {
        intentSlot.innerHTML = window.EventsAttachGuests.guestIntentHtml(event, {
            idPrefix: 'pubGuestPayIntent',
            forceShow: true,
        });
    }

    pubUpdateGuestRsvpBtnLabel(event, guestRoot);

    const guestInc = document.getElementById('guestIncludedOptions');
    if (guestInc) guestInc.innerHTML = '';

    const guestDisc = document.getElementById('guestDisclaimerAcks');
    if (guestDisc) {
        guestDisc.innerHTML = pubDisclaimerAcksHtml(event, 'pubGuestDisc');
    }

    const guestAmenity = document.getElementById('guestAmenityVote');
    if (guestAmenity) {
        guestAmenity.innerHTML = pubAmenityVoteHtml(event, 'pubGuestAmenity');
    }

    const guestPayment = document.getElementById('guestPaymentChoice');
    if (guestPayment) {
        guestPayment.innerHTML = pubPaymentChoiceHtmlForCents(
            event,
            pubPartyTotalCents(event, guestRoot),
            'pubGuestPayment',
        );
    }

    pubWirePublicPartySeats(event, guestRoot, {
        paymentWrapId: 'guestPaymentChoice',
        paymentPrefix: 'pubGuestPayment',
    });

    // Show/hide no-refund checkbox
    const noRefundCheck = document.getElementById('guestNoRefundCheck');
    if (noRefundCheck) {
        const partyTotal = pubPartyTotalCents(event, guestRoot);
        const hasDisc = pubHasRequiredDisclaimers(event);
        noRefundCheck.closest('label').classList.toggle('hidden', !(event.pricing_mode === 'paid' && partyTotal > 0) || hasDisc);
    }

    pubWireGuestSmsFields();
    pubWireGuestPaymentIntent(event, guestRoot);
}

/* ── Guest SMS consent helpers ───────────── */

function pubSyncGuestSmsConsent() {
    const phone = (document.getElementById('guestPhoneInput')?.value
        || document.getElementById('ctaGuestPhoneInput')?.value || '').trim();
    if (!phone) return;
    const checks = [
        document.getElementById('guestSmsConsentCheck'),
        document.getElementById('ctaGuestSmsConsentCheck'),
    ].filter(Boolean);
    checks.forEach((el) => { el.checked = true; });
}

function pubWireGuestSmsFields() {
    ['guestPhoneInput', 'ctaGuestPhoneInput'].forEach((id) => {
        const el = document.getElementById(id);
        if (el && !el.dataset.smsWired) {
            el.dataset.smsWired = '1';
            el.addEventListener('input', pubSyncGuestSmsConsent);
        }
    });
}

function pubGetGuestPhoneRaw() {
    return (document.getElementById('guestPhoneInput')?.value
        || document.getElementById('ctaGuestPhoneInput')?.value || '').trim();
}

function pubValidateGuestPhone() {
    const raw = pubGetGuestPhoneRaw();
    if (window.EventsHelpers && typeof window.EventsHelpers.validatePhone === 'function') {
        return window.EventsHelpers.validatePhone(raw);
    }
    if (!raw) return { error: 'Phone number is required.' };
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10) return { error: 'Enter a valid phone number.' };
    return { value: raw };
}

function pubGetGuestSmsPayload() {
    const phoneResult = pubValidateGuestPhone();
    const phone = phoneResult.value || pubGetGuestPhoneRaw();
    const consentChecked = !!(
        document.getElementById('guestSmsConsentCheck')?.checked
        || document.getElementById('ctaGuestSmsConsentCheck')?.checked
    );
    return {
        guest_phone: phone,
        sms_opt_in: !!(phone && consentChecked),
        sms_consent_text_version: 'event_sms_v1',
    };
}

/* ── Guest RSVP Handler ──────────────────── */

function pubGuestFormRoot() {
    const cta = document.getElementById('evtCtaPanel');
    if (cta && cta.querySelector('[data-party-seats-root]')) return cta;
    return document.getElementById('guestRsvpSection') || document;
}

async function pubLoadGuestSeatInfoInvites(eventId, guestToken, root) {
    if (!eventId || !guestToken || typeof callEdgeFunctionPublic !== 'function') return;
    try {
        const result = await callEdgeFunctionPublic('event-seat-info', {
            action: 'list',
            event_id: eventId,
            guest_token: guestToken,
        });
        const tokens = result?.seat_info_tokens || [];
        window.pubSeatInfoTokens = tokens;
        if (!tokens.length || !window.EventsHelpers) return;
        const html = window.EventsHelpers.seatInfoInvitesHtml(tokens);
        const scope = root || document.getElementById('guestRsvpSection');
        if (!scope || !html) return;
        const existing = scope.querySelector('[data-seat-info-invites="1"]');
        if (existing) {
            existing.outerHTML = html;
        } else {
            const slot = scope.querySelector('#pubGuestSeatInfoInvites');
            if (slot) slot.outerHTML = html;
            else scope.insertAdjacentHTML('beforeend', html);
        }
        window.EventsHelpers.wireSeatInfoInviteCopy(scope);
    } catch (_) { /* ignore */ }
}

async function pubHandleGuestRsvp() {
    if (!pubCurrentEvent) return;

    const formRoot = pubGuestFormRoot();
    const name  = (document.getElementById('guestNameInput')?.value
        || document.getElementById('ctaGuestNameInput')?.value || '').trim();
    const email = pubNormalizeGuestEmail(document.getElementById('guestEmailInput')?.value
        || document.getElementById('ctaGuestEmailInput')?.value || '');
    const noRefund = document.getElementById('guestNoRefundCheck');
    const btn   = document.getElementById('guestRsvpBtn');

    if (!name || !email) {
        alert('Please enter your name and email.');
        return;
    }

    const phoneResult = pubValidateGuestPhone();
    if (phoneResult.error) {
        alert(phoneResult.error);
        return;
    }

    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    // Check no-refund policy checkbox (paid party total > 0; skipped when event disclaimers gate ack)
    const guestRoot = formRoot;
    const paymentIntent = pubGuestPaymentIntent();
    const attachLater = paymentIntent === 'attach_later';
    const seat_role = pubReadSeatRole(guestRoot);
    const partyTotal = pubPartyTotalCents(pubCurrentEvent, guestRoot);
    const needsPaidCheckout = !attachLater && pubCurrentEvent.pricing_mode === 'paid' && partyTotal > 0;
    if (needsPaidCheckout && noRefund && !noRefund.closest('label').classList.contains('hidden') && !noRefund.checked) {
        alert('Please accept the no-refund policy to continue.');
        return;
    }

    const seats = pubReadPartySeats(pubCurrentEvent, guestRoot, name);
    if (window.EventsPartySeats && typeof window.EventsPartySeats.validatePartySeats === 'function') {
        const catalog = window.EventsIncludedItems
            ? window.EventsIncludedItems.normalizeIncludedItems(pubCurrentEvent.included_items)
            : [];
        const seatsErr = window.EventsPartySeats.validatePartySeats(pubCurrentEvent, seats, catalog, {
            allowIncompleteGuests: true,
        });
        if (seatsErr) {
            alert(seatsErr);
            return;
        }
    }
    const disclaimer_acks = pubReadDisclaimerAcks(pubCurrentEvent, guestRoot);
    const ackErr = pubValidateDisclaimerAcks(pubCurrentEvent, disclaimer_acks);
    if (ackErr) {
        if (window.EventsDisclaimers?.scrollToAckField) {
            window.EventsDisclaimers.scrollToAckField(guestRoot);
        }
        alert(ackErr);
        return;
    }
    const amenity_vote_option_id = pubReadAmenityVote(pubCurrentEvent, guestRoot);
    const voteErr = pubValidateAmenityVote(pubCurrentEvent, amenity_vote_option_id);
    if (voteErr) {
        if (window.EventsAmenityVoting?.scrollToVoteField) {
            window.EventsAmenityVoting.scrollToVoteField(guestRoot);
        }
        alert(voteErr);
        return;
    }
    const hasIncludedCatalog = pubHasIncludedCatalog(pubCurrentEvent);
    const hasRequiredDisclaimers = pubHasRequiredDisclaimers(pubCurrentEvent);
    const needsAmenityVote = pubNeedsAmenityVote(pubCurrentEvent);
    const needsPaymentChoice = pubNeedsPaymentChoice(pubCurrentEvent, partyTotal);
    let paymentChoice = null;
    if (needsPaidCheckout && needsPaymentChoice) {
        paymentChoice = pubReadPaymentChoice(pubCurrentEvent, guestRoot, partyTotal);
        const payErr = pubValidatePaymentChoice(pubCurrentEvent, paymentChoice, partyTotal);
        if (payErr) {
            if (window.EventsPaymentChoice?.scrollToField) {
                window.EventsPaymentChoice.scrollToField(guestRoot);
            }
            alert(payErr);
            return;
        }
    }
    const showPartySeats = !!(window.EventsPartySeats
        && window.EventsPartySeats.shouldShow(pubCurrentEvent, {}));
    const showSeatPicker = !!(window.EventsSeatPicker
        && window.EventsSeatPicker.shouldShow(pubCurrentEvent, {}));
    const needsParty = hasIncludedCatalog || hasRequiredDisclaimers || showPartySeats || showSeatPicker || needsAmenityVote;

    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
        const existingGuest = await pubFindGuestRsvpByEmail(email);
        if (existingGuest && (!needsPaidCheckout || existingGuest.paid) && !needsParty) {
            await pubUseExistingGuestRsvp(existingGuest, 'You already RSVP\'d. Here is your ticket.');
            if (window.matchMedia('(max-width: 1023px)').matches && document.getElementById('evtCtaBar')) {
                pubOpenCtaPanel('ticket');
            }
            return;
        }

        const smsPayload = pubGetGuestSmsPayload();

        if (needsPaidCheckout) {
            const { url } = await callEdgeFunctionPublic('create-event-checkout', {
                event_id: pubCurrentEvent.id,
                type: 'rsvp',
                guest_name: name,
                guest_email: email,
                seats,
                seat_role,
                ...smsPayload,
                ...(hasRequiredDisclaimers ? { disclaimer_acks } : {}),
                ...(needsAmenityVote ? { amenity_vote_option_id } : {}),
                ...(needsPaymentChoice && paymentChoice ? {
                    plan_kind: paymentChoice.plan_kind,
                    method: paymentChoice.method,
                } : {}),
            });
            if (url) window.location.href = url;
        } else {
            const result = await callEdgeFunctionPublic('rsvp-guest-free', {
                event_id: pubCurrentEvent.id,
                guest_name: name,
                guest_email: email,
                seats,
                seat_role,
                payment_intent: paymentIntent,
                ...smsPayload,
                ...(hasRequiredDisclaimers ? { disclaimer_acks } : {}),
                ...(needsAmenityVote ? { amenity_vote_option_id } : {}),
            });

            if (result.guest_token) {
                pubGuestToken = result.guest_token;
                pubGuestRsvp = result.guest_rsvp || {
                    guest_name: name,
                    guest_email: email,
                    guest_token: result.guest_token,
                    status: result.status,
                    paid: false,
                    attach_requested: !!result.attach_requested,
                };
                window.pubGuestAttachRequested = !!(result.attach_requested || result.payment_intent === 'attach_later');
                window.pubSeatInfoTokens = result.seat_info_tokens || [];

                // Show success + QR ticket
                const section = document.getElementById('guestRsvpSection');
                const invitesHtml = (window.EventsHelpers && typeof window.EventsHelpers.seatInfoInvitesHtml === 'function')
                    ? window.EventsHelpers.seatInfoInvitesHtml(window.pubSeatInfoTokens)
                    : '';
                const copy = pubGuestConfirmCopy(pubGuestRsvp, name, email, !!result.already_exists);
                const waiting = !!(pubGuestRsvp.attach_requested || window.pubGuestAttachRequested);
                section.innerHTML = `
                    <div class="evt-info-card">
                        <span style="font-size:1.5rem">${waiting ? '⏳' : '✅'}</span>
                        <div>
                            <p style="font-size:14px;font-weight:700;color:${waiting ? '#13366e' : '#059669'}">${copy.title}</p>
                            <p style="font-size:13px;color:${waiting ? '#13366e' : '#059669'}">${copy.sub}</p>
                        </div>
                    </div>
                    ${invitesHtml}`;
                if (window.EventsHelpers && typeof window.EventsHelpers.wireSeatInfoInviteCopy === 'function') {
                    window.EventsHelpers.wireSeatInfoInviteCopy(section);
                }

                // Show gated notes if applicable
                if (pubCurrentEvent.gated_notes) {
                    document.getElementById('gatedSection').classList.remove('hidden');
                    document.getElementById('gatedNotes').textContent = pubCurrentEvent.gated_notes;
                }

                // Show QR ticket if attendee_ticket mode
                if (pubCurrentEvent.checkin_mode === 'attendee_ticket') {
                    await pubShowGuestTicket(pubGuestRsvp);
                    if (window.pubCtaRaffleIntent && document.getElementById('evtCtaBar')) {
                        window.pubCtaRaffleIntent = false;
                        pubOpenCtaPanel('raffle');
                    } else if (window.matchMedia('(max-width: 1023px)').matches) {
                        if (document.getElementById('evtCtaBar')) pubOpenCtaPanel('ticket');
                        else {
                            pubCloseRsvpSheet();
                            pubOpenGuestTicketSheet();
                        }
                    }
                }
                if (window.pubCtaRaffleIntent && document.getElementById('evtCtaBar')) {
                    window.pubCtaRaffleIntent = false;
                    pubOpenCtaPanel('raffle');
                }
                pubInitBottomNav(pubCurrentEvent);
            }
        }
    } catch (err) {
        console.error('Guest RSVP error:', err);
        alert(err.message || 'Failed to complete RSVP. Please try again.');
        btn.disabled = false;
        pubUpdateGuestRsvpBtnLabel(pubCurrentEvent, document.getElementById('guestRsvpSection') || document);
    }
}

/* ── Guest Ticket Display ────────────────── */
