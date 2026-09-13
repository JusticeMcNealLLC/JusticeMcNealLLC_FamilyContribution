/* ════════════════════════════════════════════════════════════
   Portal Events — Detail section HTML builders (Phase 5H.2–5H.5)
   Classic IIFE; loads after detail/data.js, before detail.js.
   ════════════════════════════════════════════════════════════ */

'use strict';

import { evtDataAction } from '../core/actions.js';


const _edPill = window.evtEdPill;
const _edNotice = window.evtEdNotice;
const _edSectionHead = window.evtEdSectionHead;

function evtDetailAdultPriceCents(event) {
    if (event?.adult_price_cents != null && Number.isFinite(Number(event.adult_price_cents))) {
        return Number(event.adult_price_cents);
    }
    return Number(event?.rsvp_cost_cents || 0);
}

function evtBuildDetailPriceSummaryHtml(ctx) {
    const { event, deadlinePassed } = ctx;
    if (!event || event.event_type === 'competition' || event.rsvp_enabled === false) {
        return '';
    }

    const rows = [];
    const pricingMode = event.pricing_mode || 'free';

    if (pricingMode === 'paid') {
        rows.push({
            label: 'Adult',
            main: formatCurrency(evtDetailAdultPriceCents(event)),
            sub: 'Per adult seat',
        });
        if (event.kids_free !== false) {
            rows.push({ label: 'Kids', main: 'Free', sub: 'Children included' });
        } else {
            rows.push({
                label: 'Kids',
                main: formatCurrency(event.kid_price_cents || 0),
                sub: 'Per child seat',
            });
        }
    } else if (pricingMode === 'free_paid_raffle') {
        rows.push({ label: 'RSVP', main: 'Free', sub: 'Paid raffle optional' });
    } else {
        rows.push({ label: 'RSVP', main: 'Free', sub: 'No payment required' });
    }

    if (event.rsvp_deadline) {
        const dl = new Date(event.rsvp_deadline);
        const dlStr = dl.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
        rows.push({
            label: 'RSVP by',
            main: dlStr,
            sub: deadlinePassed ? 'Deadline passed' : 'Reserve your spot',
            passed: !!deadlinePassed,
        });
    }

    if (!rows.length) return '';

    const rowHtml = rows.map((row) => `
        <div class="ed-summary-row ed-price-summary-row">
            <div class="ed-summary-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
            <div>
                <span class="ed-summary-main${row.passed ? ' ed-deadline-passed' : ''}">${evtEscapeHtml(row.main)}</span>
                <span class="ed-summary-sub2">${evtEscapeHtml(row.label)}${row.sub ? ` · ${evtEscapeHtml(row.sub)}` : ''}</span>
            </div>
        </div>`).join('');

    return `<div class="ed-price-summary">${rowHtml}</div>`;
}

function evtBuildDetailIncludedCatalogHtml(ctx) {
    const { event } = ctx;
    if (!event || !window.EventsIncludedItems) return '';
    const list = (typeof window.EventsIncludedItems.normalizeIncludedItems === 'function')
        ? window.EventsIncludedItems.normalizeIncludedItems(event.included_items)
        : [];
    if (!list.length) return '';

    const names = list.map((item) => String(item.name || '').trim()).filter(Boolean);
    if (!names.length) return '';

    let label;
    if (names.length === 1) label = names[0];
    else if (names.length === 2) label = `${names[0]} and ${names[1]}`;
    else label = `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;

    const safe = (typeof evtEscapeHtml === 'function')
        ? evtEscapeHtml(label)
        : String(label).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return `
        <div class="ed-included-catalog ed-included-teaser">
            <p class="ed-hint" style="margin-top:14px;margin-bottom:0">You&apos;ll choose ${safe} when you RSVP.</p>
        </div>`;
}

function evtBuildDetailAmenityResultsHtml(ctx) {
    const { event, isComp, isHost, canManageEvent, amenityVoteConfig, amenityVoteTallies } = ctx;
    if (isComp || !window.EventsAmenityVoting) return '';
    const cfg = amenityVoteConfig || window.EventsAmenityVoting.normalizeConfig(event && event.amenity_voting);
    if (!cfg.enabled) return '';
    const hostLike = !!(isHost || canManageEvent);
    const showCtx = { isHost: hostLike, canManageEvent: hostLike, now: new Date() };
    const canShow = window.EventsAmenityVoting.canShowResults(cfg, showCtx);
    const tallies = amenityVoteTallies || {};

    // Pending “Voting open” teaser removed — vote happens in RSVP; only show real results
    if (!canShow) return '';

    const inner = window.EventsAmenityVoting.resultsHtml(cfg, tallies, { isHost: hostLike });
    if (!inner) return '';
    const votingClosed = window.EventsAmenityVoting.isVotingClosed(cfg);
    const total = window.EventsAmenityVoting.totalVotes(tallies);
    const hint = (!hostLike && !votingClosed && total > 0)
        ? '<p class="ed-hint ed-amenity-rsvp-hint">Cast your vote when you RSVP.</p>'
        : '';
    return `<div class="ed-amenity-results">${inner}${hint}</div>`;
}

function evtReadSeatRoleForDetail(eventId) {
    const root = document.getElementById('eventsDetailView') || document;
    if (window.EventsPartySeats && typeof window.EventsPartySeats.readPayerRoleFromRoot === 'function') {
        return window.EventsPartySeats.readPayerRoleFromRoot(root);
    }
    if (window.EventsSeatPicker && typeof window.EventsSeatPicker.readRoleFromRoot === 'function') {
        return window.EventsSeatPicker.readRoleFromRoot(root);
    }
    return 'adult';
}

function evtReadPartySeatsFromDetail(event) {
    const root = document.getElementById('eventsDetailView') || document;
    if (window.EventsPartySeats && typeof window.EventsPartySeats.readSeatsFromRoot === 'function') {
        return window.EventsPartySeats.readSeatsFromRoot(root, event);
    }
    const role = evtReadSeatRoleForDetail();
    const catalog = (window.EventsIncludedItems && typeof window.EventsIncludedItems.normalizeIncludedItems === 'function')
        ? window.EventsIncludedItems.normalizeIncludedItems(event?.included_items)
        : [];
    let seat_options = {};
    if (window.EventsIncludedItems && catalog.length) {
        seat_options = window.EventsIncludedItems.readAnswersFromRoot(root, catalog, role);
    }
    return [{
        role,
        display_name: evtMemberDisplayName(),
        is_payer: true,
        ...(Object.keys(seat_options).length ? { options: seat_options } : {}),
    }];
}

function evtMemberDisplayName() {
    const u = globalThis.evtCurrentUser;
    if (u) {
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
        if (name) return name;
        if (u.email) return String(u.email).split('@')[0];
    }
    return window.evtCurrentUserName || 'Member';
}

function evtPartyTotalCents(event, root) {
    const scope = root || document.getElementById('eventsDetailView') || document;
    if (window.EventsPartySeats && typeof window.EventsPartySeats.partyBaseTotalCents === 'function') {
        const seats = window.EventsPartySeats.readSeatsFromRoot(scope, event);
        return window.EventsPartySeats.partyBaseTotalCents(event, seats);
    }
    const role = evtReadSeatRoleForDetail();
    return (window.EventsHelpers && typeof window.EventsHelpers.seatPriceCents === 'function')
        ? window.EventsHelpers.seatPriceCents(event, role)
        : Number(event?.rsvp_cost_cents || 0);
}

function evtMemberNoRefundCheckVisible(event, seatRole, hasRequiredDisclaimers) {
    if (!event || event.pricing_mode !== 'paid' || hasRequiredDisclaimers) return false;
    const root = document.getElementById('eventsDetailView') || document;
    const partyTotal = evtPartyTotalCents(event, root);
    return partyTotal > 0;
}

function evtFeeAwarePartyTotal(event, root, partyTotal) {
    const base = Math.max(0, Number(partyTotal) || 0);
    if (!window.EventsPaymentChoice || typeof window.EventsPaymentChoice.displayTotalCents !== 'function') {
        return base;
    }
    if (!window.EventsPaymentChoice.needsChoice(event, base)) return base;
    const choice = window.EventsPaymentChoice.readFromRoot(root || document);
    return window.EventsPaymentChoice.displayTotalCents(event, choice, base);
}

function evtMemberRsvpStackBtnHtml(eventId, cents, opts) {
    const options = opts && typeof opts === 'object' ? opts : {};
    const amount = Math.max(0, Number(cents) || 0);
    const primary = options.label || (options.complete ? 'Continue RSVP' : 'RSVP');
    const priceHtml = amount > 0
        ? `<span class="ed-rsvp-stack-price">${formatCurrency(amount)}</span>`
        : (options.subLabel
            ? `<span class="ed-rsvp-stack-price">${options.subLabel}</span>`
            : '');
    return `<button type="button" id="evtMemberRsvpPayBtn-${eventId}" ${evtDataAction('evtHandleRsvp', eventId, 'going')} class="ed-primary-btn ed-rsvp-stack-btn">
            <span class="ed-rsvp-stack-label">${primary}</span>
            ${priceHtml}
        </button>`;
}

function evtMemberRsvpCancelBtnHtml(eventId, cancelMode) {
    if (!cancelMode) return '';
    const label = cancelMode === 'remove' ? 'Remove RSVP' : 'Cancel';
    return `<button type="button" id="evtMemberRsvpCancelBtn-${eventId}" class="ed-rsvp-cancel-btn" ${evtDataAction('evtCancelMyParticipation', eventId)} aria-label="${label}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        <span>${label}</span>
    </button>`;
}

function evtResolveRsvpCtaState(eventId, event, rsvp, extra) {
    const x = extra && typeof extra === 'object' ? extra : {};
    const plan = x.plan || (globalThis.evtMyPaymentPlans || {})[eventId] || null;
    const hasDraft = !!(window.EventsRsvpWizard && typeof window.EventsRsvpWizard.hasDraft === 'function'
        && window.EventsRsvpWizard.hasDraft(eventId, 'member'));
    if (window.EventsHelpers && typeof window.EventsHelpers.rsvpCtaState === 'function') {
        return window.EventsHelpers.rsvpCtaState(event, {
            rsvp,
            plan,
            hasDraft,
            installmentsPaid: x.installmentsPaid,
            installmentsTotal: x.installmentsTotal,
        });
    }
    if (rsvp?.paid) return { kind: 'going', label: 'Going', subLabel: 'Paid in full', showCancel: true, cancelMode: 'remove', cancelLabel: 'Remove RSVP' };
    if (rsvp?.status === 'going' && event?.pricing_mode === 'paid') {
        return { kind: 'continue', label: 'Continue RSVP', subLabel: '', showCancel: false, cancelMode: null, cancelLabel: null };
    }
    if (hasDraft) return { kind: 'continue', label: 'Continue RSVP', subLabel: '', showCancel: false, cancelMode: null, cancelLabel: null };
    return { kind: 'rsvp', label: 'RSVP', subLabel: '', showCancel: false, cancelMode: null, cancelLabel: null };
}

function evtUpdateMemberRsvpBtnLabels(eventId, event, opts) {
    if (!eventId || !event) return;
    const options = opts && typeof opts === 'object' ? opts : {};
    const role = options.role || evtReadSeatRoleForDetail(eventId);
    const root = document.getElementById('eventsDetailView') || document;
    const partyTotal = evtPartyTotalCents(event, root);
    const displayTotal = evtFeeAwarePartyTotal(event, root, partyTotal);
    const rsvp = options.rsvp || (globalThis.evtAllRsvps || {})[eventId];
    const cta = evtResolveRsvpCtaState(eventId, event, rsvp, {
        plan: options.plan,
        installmentsPaid: options.installmentsPaid,
        installmentsTotal: options.installmentsTotal,
    });

    const payBtn = document.getElementById(`evtMemberRsvpPayBtn-${eventId}`);
    if (payBtn) {
        const labelEl = payBtn.querySelector('.ed-rsvp-stack-label');
        let priceEl = payBtn.querySelector('.ed-rsvp-stack-price');
        if (labelEl) {
            labelEl.textContent = cta.label;
            const sub = cta.kind === 'going'
                ? (cta.subLabel || '')
                : (displayTotal > 0 ? formatCurrency(displayTotal) : '');
            if (sub) {
                if (!priceEl) {
                    priceEl = document.createElement('span');
                    priceEl.className = 'ed-rsvp-stack-price';
                    payBtn.appendChild(priceEl);
                }
                priceEl.textContent = sub;
            } else if (priceEl) {
                priceEl.remove();
            }
        } else {
            payBtn.textContent = cta.subLabel ? `${cta.label} · ${cta.subLabel}` : cta.label;
        }
    }

    const claimBtn = document.getElementById(`evtWaitlistClaimBtn-${eventId}`);
    if (claimBtn) {
        claimBtn.textContent = displayTotal > 0
            ? `Claim Spot — ${formatCurrency(displayTotal)}`
            : 'Claim Spot — Free';
    }

    const noRefundCheck = root.querySelector('#evtMemberNoRefundCheck');
    if (noRefundCheck) {
        const discCatalog = (window.EventsDisclaimers && typeof window.EventsDisclaimers.effectiveDisclaimers === 'function')
            ? window.EventsDisclaimers.effectiveDisclaimers(event)
            : [];
        const hasRequiredDisclaimers = (window.EventsDisclaimers && typeof window.EventsDisclaimers.hasRequiredDisclaimers === 'function')
            ? window.EventsDisclaimers.hasRequiredDisclaimers(discCatalog)
            : discCatalog.some((d) => d.required);
        const visible = evtMemberNoRefundCheckVisible(event, role, hasRequiredDisclaimers);
        noRefundCheck.closest('label')?.classList.toggle('hidden', !visible);
    }
}

function evtWireMemberPrepPhoneSms() {
    const phoneEl = document.getElementById('evtMemberPhoneInput');
    const smsCheck = document.getElementById('evtSmsOptInCheck');
    if (!phoneEl || !smsCheck || phoneEl.dataset.smsWired) return;
    phoneEl.dataset.smsWired = '1';
    phoneEl.addEventListener('input', () => {
        if (String(phoneEl.value || '').trim()) smsCheck.checked = true;
    });
}
function evtBuildDetailSmsOptInHtml(ctx) {
    const { eventId, isHost, memberPhone, memberGoing, canRsvp, rsvpEnabled, eventSmsRecipient } = ctx;
    if (isHost || !memberPhone) return '';
    if (!rsvpEnabled || (!memberGoing && !canRsvp)) return '';

    const checked = !!(eventSmsRecipient?.opted_in && !eventSmsRecipient?.opted_out_at);
    return `
        <label class="ed-checkbox-label" style="display:flex;gap:10px;align-items:flex-start;margin-top:12px">
            <input type="checkbox" id="evtSmsOptInCheck" ${checked ? 'checked' : ''}
                onchange="evtHandleEventSmsOptIn('${eventId}', this.checked)">
            <span class="ed-hint" style="margin:0">Text me event updates for this event. Message/data rates may apply. Reply STOP to opt out.</span>
        </label>`;
}

function evtBuildDetailRsvpCtaHtml(ctx) {
    const {
        eventId,
        event,
        rsvp,
        isHost,
        canAccessTeamHub,
        rsvpEnabled,
        canRsvp,
        eventIsFull,
        entriesClosed,
        isClosed,
        isPast,
        deadlinePassed,
    } = ctx;

    let ctaHtml = '';
    if (!rsvpEnabled) {
        ctaHtml = _edNotice('ℹ️', 'Informational Event', 'RSVP is not required for this event');
    } else if (isHost) {
        const teamBtnHtml = canAccessTeamHub
            ? `<button type="button" ${evtDataAction('evtOpenTeamToolsPanel', eventId)} class="ed-outline-btn" aria-label="Open event team tools">Team</button>`
            : '';
        ctaHtml = `
        <div class="ed-rsvp-confirmed">
            <div class="ed-rsvp-confirmed-row">
                <div class="ed-rsvp-confirmed-check"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>
                <div><span class="ed-rsvp-confirmed-title">You're hosting!</span><span class="ed-rsvp-confirmed-sub">You're automatically counted as attending.</span></div>
            </div>
        </div>
        <div class="ed-rsvp-host-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
            ${teamBtnHtml}
            <button type="button" onclick="window.EventsManage ? window.EventsManage.open('${eventId}',{source:'portal'}) : (window.location='../admin/events.html?id=${eventId}')" class="ed-outline-btn">Manage Event</button>
        </div>
        ${canAccessTeamHub ? '<p class="ed-hint">Use <strong>Team</strong> for RSVP as yourself, raffle entry, and your ticket.</p>' : ''}`;
    } else if (canRsvp && !eventIsFull && event.pricing_mode === 'paid') {
        const cta = evtResolveRsvpCtaState(eventId, event, rsvp, {
            plan: ctx.myPaymentPlan,
            installmentsPaid: ctx.myInstallmentsPaid,
            installmentsTotal: ctx.myInstallmentsTotal,
        });
        if (cta.kind === 'going') {
            const payTok = (window.EventsHelpers && typeof window.EventsHelpers.readPaymentInviteToken === 'function')
                ? window.EventsHelpers.readPaymentInviteToken(eventId)
                : (new URLSearchParams(window.location.search).get('t') || '').trim();
            const paymentLinkHtml = (payTok && window.EventsHelpers?.paymentMagicLinkHtml)
                ? window.EventsHelpers.paymentMagicLinkHtml(payTok)
                : '';
            const cancelHtml = evtMemberRsvpCancelBtnHtml(eventId, cta.cancelMode);
            ctaHtml = `
            <div class="ed-rsvp-confirmed">
                <div class="ed-rsvp-confirmed-row">
                    <div class="ed-rsvp-confirmed-check"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>
                    <div>
                        <span class="ed-rsvp-confirmed-title">${cta.label}</span>
                        ${cta.subLabel ? `<span class="ed-rsvp-confirmed-sub">${cta.subLabel}</span>` : '<span class="ed-rsvp-confirmed-sub">Non-refundable</span>'}
                    </div>
                </div>
            </div>
            <div class="ed-rsvp-going-actions">
                <button type="button" class="ed-primary-btn ed-rsvp-stack-btn" ${evtDataAction('evtOpenCtaPanel', 'ticket', eventId)}>
                    <span class="ed-rsvp-stack-label">View ticket</span>
                </button>
                ${cancelHtml}
            </div>
            ${paymentLinkHtml}`;
        } else {
            const payCents = evtDetailAdultPriceCents(event);
            ctaHtml = `
            ${evtMemberRsvpStackBtnHtml(eventId, payCents, { label: cta.label, complete: cta.kind === 'continue' })}
            <p class="ed-hint">Non-refundable unless cancelled by staff${event.raffle_enabled ? ' · Includes raffle entry' : ''}</p>`;
        }
    } else if (canRsvp && !eventIsFull) {
        const freeCta = evtResolveRsvpCtaState(eventId, event, rsvp, {});
        if (rsvp?.status === 'going') {
            ctaHtml = `
            <div class="ed-rsvp-confirmed">
                <div class="ed-rsvp-confirmed-row">
                    <div class="ed-rsvp-confirmed-check"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>
                    <div><span class="ed-rsvp-confirmed-title">Going</span><span class="ed-rsvp-confirmed-sub">We'll see you there.</span></div>
                </div>
            </div>
            <button ${evtDataAction('evtHandleRsvp', eventId, 'going')} class="ed-outline-btn">Update RSVP</button>`;
        } else {
            const interestedActive = rsvp?.status === 'maybe' ? ' active' : '';
            ctaHtml = `
            ${evtMemberRsvpStackBtnHtml(eventId, 0, { label: freeCta.label })}
            <div class="ed-rsvp-secondary">
                <button ${evtDataAction('evtHandleRsvp', eventId, 'maybe')} class="ed-rsvp-sm${interestedActive ? ' active' : ''}">❤️ Interested</button>
            </div>`;
        }
    }
    if (rsvpEnabled && !isHost && entriesClosed && !ctaHtml) {
        let closedReason = '';
        if (isClosed) closedReason = event.status === 'cancelled' ? 'Event cancelled' : 'Event ended';
        else if (isPast) closedReason = 'Event has already started';
        else if (deadlinePassed) closedReason = 'RSVP deadline passed';
        if (rsvp) {
            const statusEmoji = rsvp.status === 'going' ? '✅' : rsvp.status === 'maybe' ? '❤️' : '❌';
            const statusLabel = rsvp.status === 'going' ? 'Going' : rsvp.status === 'maybe' ? 'Interested' : 'Not Going';
            ctaHtml = _edNotice(statusEmoji, `Your RSVP: ${statusLabel}`, closedReason);
        } else {
            ctaHtml = _edNotice('🔒', 'RSVP Closed', closedReason);
        }
    }
    return ctaHtml ? `<div class="ed-rsvp-cta-block">${ctaHtml}</div>` : '';
}

function evtBuildDetailRsvpPrepHtml(ctx) {
    const {
        eventId,
        event,
        rsvp,
        isHost,
        canRsvp,
        eventIsFull,
        memberPhone,
    } = ctx;

    const showPrep = !isHost && canRsvp && !eventIsFull
        && !(event.pricing_mode === 'paid' && rsvp?.paid);

    if (!showPrep) return '';

    // Prep-heavy RSVPs open via the single CTA → EventsRsvpWizard (no duplicate Continue block)
    if (window.EventsRsvpWizard
        && window.EventsRsvpWizard.needsPrep(event, {
            mode: 'member',
            memberPhoneMissing: !memberPhone,
        })) {
        return '';
    }

    const showPartySeats = showPrep
        && window.EventsPartySeats
        && typeof window.EventsPartySeats.shouldShow === 'function'
        && window.EventsPartySeats.shouldShow(event, { isHost });

    const seatRole = (window.EventsIncludedItems && typeof window.EventsIncludedItems.defaultSeatRoleForCatalog === 'function')
        ? window.EventsIncludedItems.defaultSeatRoleForCatalog(event.included_items)
        : 'adult';
    let partySeatsHtml = '';
    if (showPartySeats && typeof window.EventsPartySeats.formFieldsHtml === 'function') {
        partySeatsHtml = window.EventsPartySeats.formFieldsHtml(event, {
            idPrefix: `portalParty-${eventId}`,
            defaultRole: seatRole,
            payerName: evtMemberDisplayName(),
        });
    }

    const hasIncludedCatalog = window.EventsIncludedItems
        && typeof window.EventsIncludedItems.hasCatalog === 'function'
        && window.EventsIncludedItems.hasCatalog(event.included_items);
    let includedOptsHtml = '';

    const discCatalog = (window.EventsDisclaimers && typeof window.EventsDisclaimers.effectiveDisclaimers === 'function')
        ? window.EventsDisclaimers.effectiveDisclaimers(event)
        : ((window.EventsDisclaimers && typeof window.EventsDisclaimers.normalizeDisclaimers === 'function')
            ? window.EventsDisclaimers.normalizeDisclaimers(event.disclaimers)
            : []);
    const hasDisclaimers = (window.EventsDisclaimers && typeof window.EventsDisclaimers.hasDisclaimers === 'function')
        ? window.EventsDisclaimers.hasDisclaimers(discCatalog)
        : discCatalog.length > 0;
    const showDiscAcks = hasDisclaimers && showPrep;
    let discAcksHtml = '';
    if (showDiscAcks && typeof window.EventsDisclaimers.formFieldsHtml === 'function') {
        discAcksHtml = window.EventsDisclaimers.formFieldsHtml(discCatalog, {
            idPrefix: `portalDisc-${eventId}`,
        });
    }

    const showInvestAck = event.invest_eligible && showPrep;
    let investAckHtml = '';

    const needsAmenityVote = window.EventsAmenityVoting
        && typeof window.EventsAmenityVoting.needsVote === 'function'
        && window.EventsAmenityVoting.needsVote(event);
    let amenityVoteHtml = '';
    if (needsAmenityVote && showPrep && typeof window.EventsAmenityVoting.formFieldsHtml === 'function') {
        const cfg = window.EventsAmenityVoting.normalizeConfig(event.amenity_voting);
        amenityVoteHtml = `<div id="portalAmenityWrap-${eventId}">${window.EventsAmenityVoting.formFieldsHtml(cfg, {
            idPrefix: `portalAmenity-${eventId}`,
        })}</div>`;
    }

    const prepSeatPrice = evtPartyTotalCents(event);
    let paymentChoiceHtml = '';
    if (showPrep && window.EventsPaymentChoice
        && typeof window.EventsPaymentChoice.needsChoice === 'function'
        && window.EventsPaymentChoice.needsChoice(event, prepSeatPrice)
        && typeof window.EventsPaymentChoice.formFieldsHtml === 'function') {
        paymentChoiceHtml = `<div id="portalPaymentWrap-${eventId}">${window.EventsPaymentChoice.formFieldsHtml(event, {
            seatPriceCents: prepSeatPrice,
            idPrefix: `portalPayment-${eventId}`,
        })}</div>`;
    }

    const hasRequiredDisclaimers = (window.EventsDisclaimers && typeof window.EventsDisclaimers.hasRequiredDisclaimers === 'function')
        ? window.EventsDisclaimers.hasRequiredDisclaimers(discCatalog)
        : discCatalog.some((d) => d.required);
    const showNoRefundCheck = showPrep
        && evtMemberNoRefundCheckVisible(event, seatRole, hasRequiredDisclaimers);
    let noRefundHtml = '';
    if (showNoRefundCheck) {
        noRefundHtml = `
            <label class="ed-checkbox-label evt-member-no-refund" style="display:flex;gap:10px;align-items:flex-start;margin-top:12px">
                <input type="checkbox" id="evtMemberNoRefundCheck">
                <span class="ed-hint" style="margin:0">I understand this payment is non-refundable unless cancelled by staff.</span>
            </label>`;
    }

    const showMemberPhone = showPrep && !memberPhone;
    let memberPhoneHtml = '';
    let memberSmsPrepHtml = '';
    if (showMemberPhone) {
        memberPhoneHtml = `
            <div class="ed-rsvp-phone-field">
                <label class="ec-label" for="evtMemberPhoneInput">Mobile phone</label>
                <input type="tel" id="evtMemberPhoneInput" class="ec-input" placeholder="Phone number" required aria-label="Mobile phone">
                <p class="ed-hint" style="margin-top:6px">Required for RSVP. Saved to your profile.</p>
            </div>`;
        memberSmsPrepHtml = `
            <label class="ed-checkbox-label" style="display:flex;gap:10px;align-items:flex-start;margin-top:12px">
                <input type="checkbox" id="evtSmsOptInCheck">
                <span class="ed-hint" style="margin:0">Text me event updates for this event. Message/data rates may apply. Reply STOP to opt out.</span>
            </label>`;
    }

    if (showInvestAck && window.EventsInvestAck && typeof window.EventsInvestAck.formFieldHtml === 'function') {
        investAckHtml = window.EventsInvestAck.formFieldHtml(event, {
            idPrefix: `portalInvest-${eventId}`,
        });
    }

    const attachGuestsHtml = showPrep
        ? `<div id="portalAttachGuests-${eventId}" class="ed-attach-guests" data-attach-guests-root="1"></div>`
        : '';

    const inner = partySeatsHtml + attachGuestsHtml + memberPhoneHtml + memberSmsPrepHtml + includedOptsHtml + discAcksHtml
        + amenityVoteHtml + paymentChoiceHtml + investAckHtml + noRefundHtml;
    if (!inner) return '';
    if (inner === partySeatsHtml && !attachGuestsHtml && !memberPhoneHtml && !memberSmsPrepHtml && !includedOptsHtml && !discAcksHtml && !amenityVoteHtml && !paymentChoiceHtml && !investAckHtml && !noRefundHtml) {
        return `<div class="ed-rsvp-prep">${partySeatsHtml}</div>`;
    }
    if (memberPhoneHtml && !partySeatsHtml && !attachGuestsHtml && !includedOptsHtml && !discAcksHtml && !amenityVoteHtml && !paymentChoiceHtml && !investAckHtml && !noRefundHtml) {
        return `<div class="ed-rsvp-prep">${memberPhoneHtml}${memberSmsPrepHtml}</div>`;
    }
    return `<div class="ed-rsvp-prep"><p class="ed-rsvp-prep-label">Before you RSVP</p>${inner}</div>`;
}

function evtWireSeatPickerPrep(eventId, event) {
    if (!eventId || !event) return;
    const root = document.getElementById('eventsDetailView') || document;

    const refreshPaymentAndLabels = () => {
        const payWrap = document.getElementById(`portalPaymentWrap-${eventId}`);
        const partyTotal = evtPartyTotalCents(event, root);
        if (payWrap && window.EventsPaymentChoice && window.EventsHelpers) {
            if (window.EventsPaymentChoice.needsChoice(event, partyTotal)) {
                payWrap.innerHTML = window.EventsPaymentChoice.formFieldsHtml(event, {
                    seatPriceCents: partyTotal,
                    idPrefix: `portalPayment-${eventId}`,
                });
                window.EventsPaymentChoice.wireForm(
                    root,
                    event,
                    () => evtPartyTotalCents(event, root),
                    () => {
                        const role = evtReadSeatRoleForDetail(eventId);
                        evtUpdateMemberRsvpBtnLabels(eventId, event, { role });
                    },
                );
            } else {
                payWrap.innerHTML = '';
            }
        }
        const role = evtReadSeatRoleForDetail(eventId);
        evtUpdateMemberRsvpBtnLabels(eventId, event, { role });
    };

    if (window.EventsPartySeats && typeof window.EventsPartySeats.wireForm === 'function') {
        window.EventsPartySeats.wireForm(root, event, () => refreshPaymentAndLabels());
    }

    refreshPaymentAndLabels();
    evtWireMemberPrepPhoneSms();
    evtLoadSeatInfoInvites(eventId);
    evtLoadAttachGuests(eventId, event);
}

async function evtLoadAttachGuests(eventId, event) {
    if (!eventId || !window.EventsAttachGuests || typeof window.EventsAttachGuests.loadAndWire !== 'function') return;
    const slot = document.getElementById(`portalAttachGuests-${eventId}`);
    if (!slot) return;
    const rsvp = (window.evtAllRsvps || globalThis.evtAllRsvps || {})[eventId];
    const unpaid = !(rsvp && rsvp.paid);
    await window.EventsAttachGuests.loadAndWire(slot, {
        eventId,
        payerUnpaid: unpaid,
        callEdge: (name, body) => callEdgeFunction(name, body),
        onAttached: async () => {
            if (typeof globalThis.evtOpenDetail === 'function') {
                await globalThis.evtOpenDetail(eventId);
            } else {
                await window.EventsAttachGuests.loadAndWire(slot, {
                    eventId,
                    payerUnpaid: unpaid,
                    callEdge: (name, body) => callEdgeFunction(name, body),
                });
            }
        },
    });
}

async function evtLoadSeatInfoInvites(eventId) {
    const slot = document.getElementById(`portalSeatInfoInvites-${eventId}`);
    if (!slot || !eventId) return;
    if (typeof callEdgeFunction !== 'function') return;
    try {
        const result = await callEdgeFunction('event-seat-info', {
            action: 'list',
            event_id: eventId,
        });
        const tokens = result?.seat_info_tokens || [];
        if (!tokens.length) {
            slot.innerHTML = '';
            return;
        }
        if (window.EventsHelpers && typeof window.EventsHelpers.seatInfoInvitesHtml === 'function') {
            slot.innerHTML = window.EventsHelpers.seatInfoInvitesHtml(tokens);
            window.EventsHelpers.wireSeatInfoInviteCopy(slot);
        }
    } catch (_) {
        slot.innerHTML = '';
    }
}

function evtDetailPublicInviteUrl(slug) {
    if (!slug) return '';
    if (typeof globalThis.evtPublicEventInviteUrl === 'function') {
        return globalThis.evtPublicEventInviteUrl(slug);
    }
    return `https://justicemcneal.com/events/?e=${encodeURIComponent(slug)}`;
}

function evtBuildDetailGuestRsvpHintHtml() {
    // Guest public-link hint removed from Your RSVP card; share lives elsewhere on detail.
    return '';
}

function evtBuildDetailRsvpSectionHtml(ctx) {
    const ctaHtml = evtBuildDetailRsvpCtaHtml(ctx);
    const prepHtml = evtBuildDetailRsvpPrepHtml(ctx);
    const smsOptInHtml = evtBuildDetailSmsOptInHtml(ctx);
    const seatInvitesPlaceholder = (!ctx.isHost && ctx.rsvp?.status === 'going')
        ? `<div id="portalSeatInfoInvites-${ctx.eventId}" class="ed-seat-info-invites-slot"></div>`
        : '';
    return ctaHtml + prepHtml + seatInvitesPlaceholder + smsOptInHtml;
}

function evtBuildDetailRaffleSectionHtml(ctx) {
    const {
        eventId,
        event,
        rsvp,
        myRaffleEntry,
        raffleEntryCount,
        raffleWinners,
        memberGoing,
        isHost,
        canAccessTeamHub,
        rsvpEnabled,
        entriesClosed,
        isClosed,
        isPast,
        deadlinePassed,
    } = ctx;

    if (!event.raffle_enabled) return '';

    const raffleConfig = window.evtDetailRaffleConfig(event);
    const prizeCount = window.evtDetailRaffleWinnerCount(raffleConfig, event);
    const prizesHtml = window.evtDetailRafflePrizesHtml(event);

    let entryStatusHtml = '';
    const hasRaffleRsvp = memberGoing;
    const raffleBundled = typeof globalThis.evtIsRaffleBundledWithPaidRsvp === 'function'
        ? window.evtIsRaffleBundledWithPaidRsvp(event)
        : (event.pricing_mode === 'paid' && rsvpEnabled);
    if (myRaffleEntry) {
        entryStatusHtml = `<div class="ed-raffle-entry-chip">🎟️ Entered</div>`;
    } else if (entriesClosed && !myRaffleEntry) {
        let lockedReason = '';
        if (isClosed) lockedReason = event.status === 'cancelled' ? 'Event cancelled' : 'Event ended';
        else if (isPast) lockedReason = 'Event in progress';
        else if (deadlinePassed) lockedReason = 'RSVP deadline passed';
        entryStatusHtml = `<div class="ed-notice"><span class="ed-notice-emoji">🔒</span><div><p class="ed-notice-title">Entries Closed</p><p class="ed-notice-sub">${lockedReason}</p></div></div>`;
    } else if (raffleBundled && !rsvp?.paid) {
        entryStatusHtml = `<p class="ed-hint" style="font-style:italic">Raffle entry included with paid RSVP</p>`;
    } else if (!hasRaffleRsvp) {
        entryStatusHtml = window.evtRaffleLockedDesktopHtml(eventId, isHost && canAccessTeamHub);
    } else if (event.raffle_entry_cost_cents > 0 && !entriesClosed) {
        entryStatusHtml = `<div class="ed-raffle-desktop-action"><button ${evtDataAction('evtHandleRaffleEntry', eventId)} class="ed-raffle-btn">🎟️ Buy Raffle Entry — ${formatCurrency(event.raffle_entry_cost_cents)}</button><p class="ed-hint">Non-refundable raffle ticket</p></div><p class="ed-hint ed-raffle-mobile-hint" style="font-style:italic">Use the sticky CTA below to enter the raffle.</p>`;
    } else if ((!event.raffle_entry_cost_cents || event.raffle_entry_cost_cents === 0) && !entriesClosed) {
        entryStatusHtml = `<div class="ed-raffle-desktop-action"><button ${evtDataAction('evtHandleFreeRaffleEntry', eventId)} class="ed-raffle-btn">🎟️ Enter Raffle — Free</button></div><p class="ed-hint ed-raffle-mobile-hint" style="font-style:italic">Use the sticky CTA below to enter the raffle.</p>`;
    }

    let winnersHtml = '';
    if (raffleWinners.length > 0) {
        winnersHtml = window.evtDetailRaffleWinnersHtml(raffleWinners);
    }

    const rafflePills = [
        event.pricing_mode !== 'paid' && event.raffle_entry_cost_cents > 0 ? _edPill(`🎟️ Entry: ${formatCurrency(event.raffle_entry_cost_cents)}`) : '',
        event.pricing_mode === 'paid' ? _edPill('✅ Included with RSVP') : '',
        !event.raffle_entry_cost_cents && event.pricing_mode !== 'paid' ? _edPill('🎟️ Free entry') : '',
    ].filter(Boolean).join('');

    return `
        <div class="ed-raffle-compact">
            <div class="ed-raffle-compact-head">
                <div>${_edSectionHead('Raffle')}<div class="ed-raffle-compact-info-row"><p>${raffleEntryCount} ${raffleEntryCount === 1 ? 'entry' : 'entries'}${prizeCount ? ` · ${prizeCount} ${prizeCount === 1 ? 'winner' : 'winners'}` : ''}</p>${rafflePills}</div></div>
            </div>
            <div class="ed-raffle-content-grid">
                ${prizesHtml ? `<div class="ed-raffle-panel">${_edSectionHead('Prizes')}${prizesHtml}</div>` : `<p class="ed-hint" style="font-style:italic">Prizes to be announced</p>`}
                ${winnersHtml ? `<div class="ed-raffle-panel">${winnersHtml}</div>` : ''}
            </div>
            ${entryStatusHtml ? `<div class="ed-raffle-entry-status">${entryStatusHtml}</div>` : ''}
        </div>`;
}

function evtBuildDetailHostControlsHtml(ctx) {
    const { eventId, event, isHost, isLlc } = ctx;
    if (!isHost) return '';

    let primaryBtn = '';
    let dropdownItems = '';
    if (event.status === 'draft') primaryBtn = `<button ${evtDataAction('evtUpdateStatus', eventId, 'open')} class="evt-host-btn primary">Publish Event</button>`;
    if (['open', 'confirmed', 'active'].includes(event.status)) {
        if (!primaryBtn) primaryBtn = `<button ${evtDataAction('evtUpdateStatus', eventId, 'completed')} class="evt-host-btn primary">Mark Completed</button>`;
        else dropdownItems += `<button ${evtDataAction('evtUpdateStatus', eventId, 'completed')}>✓ Mark Completed</button>`;
        dropdownItems += `<button ${evtDataAction('evtCancelEvent', eventId)} class="danger">✕ Cancel Event</button>`;
        if (isLlc) dropdownItems += `<button ${evtDataAction('evtRescheduleEvent', eventId)}>📅 Reschedule</button>`;
    }
    dropdownItems += `<button ${evtDataAction('evtDuplicateEvent', eventId)}>📋 Duplicate Event</button>`;
    if (typeof canManageEvents === 'function' && canManageEvents()) dropdownItems += `<button ${evtDataAction('evtDeleteEvent', eventId)} class="danger">🗑 Delete Event</button>`;
    const manageOnClick = `if(window.EventsManage){window.EventsManage.open('${eventId}',{source:'portal'})}else{this.nextElementSibling.classList.toggle('open')}`;
    return `
        ${_edSectionHead('Host Controls')}
        <div class="evt-host-primary">${primaryBtn}<div class="evt-host-more-wrap"><button class="evt-host-more-btn" onclick="${manageOnClick}" aria-label="Manage event"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;display:inline-block;vertical-align:-3px;margin-right:6px"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>Manage event</button><div class="evt-host-dropdown">${dropdownItems}</div></div></div>`;
}

function evtBuildDetailWaitlistHtml(ctx) {
    const {
        eventId,
        event,
        rsvp,
        goingList,
        waitlist,
        myWaitlistEntry,
    } = ctx;

    const Cap = window.EventsCapacity;
    const mode = Cap?.eventCapacityMode?.(event) || 'none';
    if (mode !== 'soft' || !Cap?.eventHasCapacityLimit?.(event)) return '';

    const occupied = Cap.countOccupiedCapacity(event, { goingList });
    const isFull = Cap.eventIsAtCapacity(event, occupied);
    const canRsvpWl = ['open', 'confirmed', 'active'].includes(event.status);
    const activeWaitlist = waitlist.filter(w => ['waiting', 'offered'].includes(w.status));
    if (!isFull || !canRsvpWl) return '';

    const hasOffer = myWaitlistEntry?.status === 'offered' && myWaitlistEntry.offer_expires_at && new Date(myWaitlistEntry.offer_expires_at) > new Date();
    const isWaiting = myWaitlistEntry?.status === 'waiting';
    let waitlistAction = '';
    if (hasOffer) {
        const expiresStr = new Date(myWaitlistEntry.offer_expires_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        waitlistAction = `
                <div class="ed-notice ed-notice-highlight">
                    <span class="ed-notice-emoji">🎉</span>
                    <div style="flex:1">
                        <p class="ed-notice-title">A spot opened up for you!</p>
                        <p class="ed-notice-sub">Complete your RSVP by ${expiresStr}</p>
                        <button id="evtWaitlistClaimBtn-${eventId}" ${evtDataAction('evtClaimWaitlistSpot', eventId)} class="ed-primary-btn" style="margin-top:10px">Claim Spot — ${formatCurrency(
                            (window.EventsHelpers && typeof window.EventsHelpers.seatPriceCents === 'function')
                                ? window.EventsHelpers.seatPriceCents(event, 'adult')
                                : (event.rsvp_cost_cents || 0),
                        )}</button>
                    </div>
                </div>`;
    } else if (isWaiting) {
        const pos = activeWaitlist.findIndex(w => w.user_id === globalThis.evtCurrentUser.id) + 1;
        waitlistAction = `
                <div class="ed-notice" style="justify-content:space-between">
                    <div><p class="ed-notice-title">You're #${pos} on the waitlist</p><p class="ed-notice-sub">We'll notify you if a spot opens</p></div>
                    <button ${evtDataAction('evtLeaveWaitlist', eventId)} class="ed-link-btn danger">Leave</button>
                </div>`;
    } else if (!rsvp?.paid) {
        waitlistAction = `<button ${evtDataAction('evtJoinWaitlist', eventId)} class="ed-action-btn">Join Waitlist</button>
                <p class="ed-hint">No payment required to join the waitlist</p>`;
    }
    return `${_edSectionHead('Waitlist')}<p class="ed-sub-count">${activeWaitlist.length} waiting</p>${waitlistAction}`;
}

function evtBuildDetailGraceNoticeHtml(ctx) {
    const { event } = ctx;
    if (!event.rescheduled_at) return '';
    // In-app grace refunds disabled (§13.10 line 442) — informational only
    return `<div class="ed-notice ed-notice-warn">
        <span class="ed-notice-emoji">📅</span>
        <div>
            <p class="ed-notice-title">This event was rescheduled</p>
            <p class="ed-notice-sub">Payments are non-refundable in-app. Contact a host if you cannot attend the new date.</p>
        </div>
    </div>`;
}

function evtBuildDetailCostBreakdownHtml(ctx) {
    const { event, isLlc, isHost, costItems } = ctx;
    const showBreakdownToAttendees = event.show_cost_breakdown !== false;
    if (!isLlc || costItems.length === 0 || !(showBreakdownToAttendees || isHost)) {
        return '';
    }

    const CATEGORY_ICONS = { lodging: '🏠', transportation: '🚗', food: '🍕', gear: '🎿', entertainment: '🎭', other: '📦' };
    const included = costItems.filter(i => i.included_in_buyin);
    const oop = costItems.filter(i => !i.included_in_buyin);
    const totalIncluded = included.reduce((s, i) => s + (i.total_cost_cents || 0), 0);
    const totalOop = oop.reduce((s, i) => s + (i.avg_per_person_cents || 0), 0);
    const minP = event.min_participants || event.max_participants || 0;
    const baseBuyIn = minP > 0 ? Math.ceil(totalIncluded / minP) : 0;
    const llcCut = Math.round(baseBuyIn * (event.llc_cut_pct || 0) / 100);
    const finalBuyIn = baseBuyIn + llcCut;
    const lockedLabel = event.cost_breakdown_locked ? ` ${_edPill('🔒 Locked', 'ed-pill-muted')}` : '';
    const hostOnlyLabel = !showBreakdownToAttendees ? ` ${_edPill('Host Only', 'ed-pill-muted')}` : '';

    const itemRows = costItems.map(i => `
        <div class="ed-cost-item">
            <div class="ed-cost-item-left"><span class="ed-cost-item-icon">${CATEGORY_ICONS[i.category] || '📦'}</span><span>${evtEscapeHtml(i.name)}</span></div>
            <div class="ed-cost-item-right">
                ${i.included_in_buyin
                    ? `<span class="ed-cost-item-amount">${formatCurrency(i.total_cost_cents)}</span>${_edPill('INCLUDED', 'ed-pill-green')}`
                    : `<span class="ed-cost-item-amount" style="color:#8b8b8b">~${formatCurrency(i.avg_per_person_cents)}/pp</span>${_edPill('OOP', 'ed-pill-muted')}`}
            </div>
        </div>`).join('');

    return `
        ${_edSectionHead(`Cost Breakdown${lockedLabel}${hostOnlyLabel}`)}
        <div class="ed-cost-list">${itemRows}</div>
        <div class="ed-cost-summary">
            <div class="ed-cost-line"><span>Total Included</span><span>${formatCurrency(totalIncluded)}</span></div>
            <div class="ed-cost-line"><span>Min Participants</span><span>${minP}</span></div>
            <div class="ed-cost-divider"></div>
            <div class="ed-cost-line ed-cost-line-bold"><span>💡 Suggested Buy-In</span><span>${formatCurrency(finalBuyIn)}/person</span></div>
            <div class="ed-cost-line ed-cost-line-bold"><span>💳 Actual RSVP</span><span>${formatCurrency(event.rsvp_cost_cents)}/person</span></div>
            ${event.llc_cut_pct > 0 ? `<div class="ed-cost-line ed-cost-line-muted"><span>Includes ${event.llc_cut_pct}% LLC contribution</span><span>+${formatCurrency(llcCut)}</span></div>` : ''}
            <div class="ed-cost-line"><span>✈ Est. Out-of-Pocket</span><span>~${formatCurrency(totalOop)}/person</span></div>
            <div class="ed-cost-divider thick"></div>
            <div class="ed-cost-line ed-cost-total"><span>💰 Est. Total/Person</span><span>~${formatCurrency((event.rsvp_cost_cents || finalBuyIn) + totalOop)}</span></div>
        </div>`;
}

function evtBuildDetailHeroStatusBadgeHtml(ctx) {
    const { event, isPast } = ctx;
    let badgeLabel = '';
    let badgeCls = '';
    let dotPulse = false;
    if (event.status === 'cancelled') { badgeLabel = 'Cancelled'; badgeCls = 'evt-status-cancelled'; }
    else if (event.status === 'completed' || isPast) { badgeLabel = 'Ended'; badgeCls = 'evt-status-ended'; }
    else if (event.status === 'active') { badgeLabel = 'Live'; badgeCls = 'evt-status-live'; dotPulse = true; }
    else {
        const msUntil = new Date(event.start_date) - new Date();
        const d = Math.floor(msUntil / 86400000);
        const h = Math.floor((msUntil % 86400000) / 3600000);
        const m = Math.floor((msUntil % 3600000) / 60000);
        if (d > 0) badgeLabel = `${d}d ${h}h`;
        else if (h > 0) badgeLabel = `${h}h ${m}m`;
        else badgeLabel = `${m}m`;
        badgeCls = 'evt-status-soon';
        dotPulse = d === 0;
    }
    return `<span class="evt-status-badge ${badgeCls}"><span class="evt-status-dot${dotPulse ? ' pulse' : ''}"></span>${badgeLabel}</span>`;
}

function evtBuildDetailTransportNoticeHtml(ctx) {
    const { event, isLlc } = ctx;
    if (!isLlc || event.transportation_enabled === false || !event.transportation_mode) {
        return '';
    }
    const isProvided = event.transportation_mode === 'llc_provides';
    if (!isProvided) {
        return `<div class="ed-context-row"><span>🧳</span><div><strong>Self-arranged transportation</strong><p>Members book their own travel${event.transportation_estimate_cents ? ` — est. ~${formatCurrency(event.transportation_estimate_cents)}` : ''}.</p></div></div>`;
    }
    const method = event.transportation_method;
    if (method === 'plane') {
        return `<div class="ed-context-row"><span>✈️</span><div><strong>LLC provides flights</strong><p>Tickets will appear in documents when available.</p></div></div>`;
    }
    if (method === 'car') {
        return `<div class="ed-context-row"><span>🚗</span><div><strong>LLC provides ground transport</strong><p>Travel is by car — no flight tickets required.</p></div></div>`;
    }
    return `<div class="ed-context-row"><span>🚐</span><div><strong>LLC provides transportation</strong><p>The LLC is arranging travel for this trip.</p></div></div>`;
}

function evtBuildDetailLocationNoticeHtml(ctx) {
    const { event, isLlc } = ctx;
    if (!isLlc || !event.location_required) {
        return '';
    }
    return _edNotice('📍', 'Location sharing required', "You'll need to enable location sharing at check-in");
}

function evtBuildDetailThresholdHtml(ctx) {
    const { event, isLlc, isHost, goingList } = ctx;
    if (!isLlc || !event.min_participants || isHost) {
        return '';
    }
    const currentGoing = goingList.length;
    const minNeeded = event.min_participants;
    const isMet = currentGoing >= minNeeded;
    const deadlineStr = event.rsvp_deadline ? new Date(event.rsvp_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';
    const socialThreshold = Math.min(Math.floor(minNeeded * 0.5), 3);
    const showExactCount = currentGoing >= socialThreshold;
    let socialText = '';
    if (isMet) socialText = `Event confirmed · ${currentGoing} going${(window.EventsCapacity?.eventHasCapacityLimit?.(event)) ? ' · ' + (window.EventsCapacity.spotsRemaining(event, currentGoing) ?? 0) + ' spots left' : ''}`;
    else if (showExactCount) socialText = `${currentGoing} going toward ${minNeeded} needed`;
    else socialText = `Minimum of ${minNeeded} needed to confirm`;
    return `<div class="ed-context-row"><span>${isMet ? '✅' : '⚠️'}</span><div><strong>${isMet ? 'Minimum met' : 'Minimum threshold'}</strong><p>${socialText}${event.rsvp_deadline ? ` · RSVP by ${deadlineStr}` : ''}</p></div></div>`;
}

function evtBuildDetailAttendeePreviewHtml(ctx) {
    const { eventId, goingList, guestGoingList, maybeList } = ctx;
    const totalGoing = goingList.length + guestGoingList.length;
    if (totalGoing <= 0 && maybeList.length <= 0) {
        return '';
    }
    const _allAvatars = [
        ...goingList.map(r => {
            const p = r.profiles;
            return { type: 'member', id: p?.id, name: evtEscapeHtml((p?.first_name || '') + ' ' + (p?.last_name || '')).trim(), img: p?.profile_picture_url || null };
        }),
        ...guestGoingList.map(g => ({ type: 'guest', name: evtEscapeHtml(g.guest_name || 'Guest'), img: null }))
    ];
    window._edAvatarData = window._edAvatarData || {};
    window._edAvatarData[eventId] = { avatars: _allAvatars, totalGoing, maybeCount: maybeList.length };
    const countParts = [];
    if (totalGoing > 0) countParts.push(`${totalGoing} going`);
    if (maybeList.length > 0) countParts.push(`${maybeList.length} interested`);
    return `
        <div class="ed-attendee-row" id="edAttendeeRow-${eventId}">
            <div class="ed-avatar-stack" id="edAvatarStack-${eventId}"></div>
            <span class="ed-attendee-count">${countParts.join(' · ')}</span>
        </div>`;
}

function evtBuildDetailShareCardHtml(ctx) {
    const { event, rsvpEnabled } = ctx;
    const inviteUrl = evtDetailPublicInviteUrl(event.slug);
    const guestSubcopy = !event.member_only && rsvpEnabled !== false
        ? '<p class="ed-share-subcopy">Public link for guest RSVPs</p>'
        : '';
    return `
                    <p class="ed-summary-heading">Share This Event</p>
                    ${guestSubcopy}
                    <div class="ed-share-row">
                        <button type="button" class="ed-share-btn" title="Copy public link" ${event.slug ? evtDataAction('evtCopyShareUrl', event.slug) : ''}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                        </button>
                        <a class="ed-share-btn" title="Share on Facebook" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}" target="_blank" rel="noopener">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </a>
                        <a class="ed-share-btn" title="Share on X" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(event.title)}" target="_blank" rel="noopener">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </a>
                        <a class="ed-share-btn" title="Share on Instagram" href="https://instagram.com" target="_blank" rel="noopener">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </a>
                    </div>`;
}

function evtBuildDetailOrganizerHtml(ctx) {
    const { event, isLlc, creatorProfile, cpName, cpInitials, cpBadge } = ctx;
    if (!isLlc && event.created_by) {
        const avatarImg = creatorProfile.profile_picture_url
            ? `<img src="${creatorProfile.profile_picture_url}" class="ed-org-avatar" alt="${evtEscapeHtml(cpName)}">`
            : `<div class="ed-org-avatar ed-org-avatar-fallback">${cpInitials}</div>`;
        const avatarEl = cpBadge
            ? `<div style="position:relative;flex-shrink:0">${avatarImg}<div style="position:absolute;bottom:-2px;right:-2px;transform:scale(.65);transform-origin:bottom right">${cpBadge}</div></div>`
            : avatarImg;
        return `
        <a href="profile.html?id=${creatorProfile.id}" class="ed-org-block">
            <div class="ed-org-block-row">
                ${avatarEl}
                <div>
                    <span class="ed-org-block-label">Hosted By</span>
                    <span class="ed-org-name-row"><span class="ed-org-name">${evtEscapeHtml(cpName)}</span><svg class="ed-org-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg></span>
                </div>
            </div>
        </a>
    `;
    }
    if (isLlc) {
        return `
        <div class="ed-org-block ed-org-block-llc">
            <div class="ed-org-block-row">
                <div class="ed-org-avatar ed-org-avatar-llc">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                </div>
                <div>
                    <span class="ed-org-block-label">Hosted By</span>
                    <span class="ed-org-name">LLC</span>
                </div>
            </div>
        </div>
    `;
    }
    return '';
}

function evtBuildDetailTeamHubHtml(ctx) {
    const { eventId, canAccessTeamHub, isHost } = ctx;
    if (!canAccessTeamHub || isHost) return '';
    return `
        <div class="ed-card ed-card-rsvp event-detail-card-tight portal-action-card">
            <p class="ed-summary-heading">Event Team</p>
            <p class="ed-hint">Staff tools for coordination and your own attendance.</p>
            <button type="button" ${evtDataAction('evtOpenTeamToolsPanel', eventId)} class="ed-outline-btn" aria-label="Open event team tools">Team</button>
        </div>`;
}

function evtBuildDetailRelatedEventsHtml(ctx) {
    const { eventId } = ctx;
    if (typeof globalThis.evtAllEvents === 'undefined' || globalThis.evtAllEvents.length <= 1) return '';
    const upcoming = globalThis.evtAllEvents.filter(e => e.id !== eventId && e.status !== 'cancelled').slice(0, 4);
    if (!upcoming.length) return '';
    const cards = upcoming.map(e => {
        const d = new Date(e.start_date);
        const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const imgHtml = e.banner_url ? `<img src="${e.banner_url}" alt="" loading="lazy">` : `<div style="height:120px;background:linear-gradient(135deg,#0B2545,#13366E)"></div>`;
        const onclickHandler = e.slug ? `globalThis.evtNavigateToEvent('${e.slug}')` : `globalThis.evtOpenDetail('${e.id}')`;
        return `<div class="evt-related-card" onclick="${onclickHandler}">${imgHtml}<div class="evt-related-card-body"><p class="evt-related-card-title">${evtEscapeHtml(e.title)}</p><p class="evt-related-card-meta">${dateLabel}${e.location_nickname ? ' · ' + evtEscapeHtml(e.location_nickname) : ''}</p></div></div>`;
    }).join('');
    return `${_edSectionHead('More Events')}<div class="evt-related-scroll">${cards}</div>`;
}

function evtBuildDetailMobileAttendeesHtml(ctx) {
    const { eventId, goingList, guestGoingList, maybeList } = ctx;
    const totalGoing = goingList.length + guestGoingList.length;
    if (totalGoing <= 0 && maybeList.length <= 0) return '';
    return `
                <div class="ed-mobile-attendees-card">
                    <div class="ed-avatar-stack ed-avatar-stack-sm" id="edAvatarStackMobile-${eventId}"></div>
                    <span class="ed-mobile-att-count">${totalGoing > 0 ? `${totalGoing} going` : ''}${totalGoing > 0 && maybeList.length > 0 ? ' · ' : ''}${maybeList.length > 0 ? `${maybeList.length} interested` : ''}</span>
                </div>`;
}

function evtBuildDetailMobileHostedHtml(ctx) {
    const { isLlc, creatorProfile, cpName, cpInitials, cpBadge } = ctx;
    if (!creatorProfile && !isLlc) return '';
    return `
                <div class="ed-mobile-hosted-card" ${creatorProfile ? `onclick="window.location.href='profile.html?id=${creatorProfile.id}'" style="cursor:pointer"` : ''}>
                    <div class="ed-mh-avatar-wrap" style="position:relative;flex-shrink:0">
                        ${creatorProfile?.profile_picture_url
                            ? `<img src="${creatorProfile.profile_picture_url}" class="ed-mh-avatar" alt="${evtEscapeHtml(cpName)}">`
                            : `<div class="ed-mh-avatar ed-mh-avatar-fallback">${isLlc ? `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>` : cpInitials}</div>`
                        }
                        ${cpBadge ? cpBadge : ''}
                    </div>
                    <div class="ed-mh-body">
                        <span class="ed-mh-label">Host</span>
                        <span class="ed-mh-name">${isLlc ? 'Justice McNeal LLC' : evtEscapeHtml(cpName)}</span>
                    </div>
                    ${creatorProfile ? `<svg class="ed-mh-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>` : ''}
                </div>`;
}

function evtBuildDetailPageHeaderActionsHtml(ctx) {
    const { eventId, event } = ctx;
    return `
                <button type="button" ${evtDataAction('evtCopyShareUrl', event.slug)} class="ed-page-header-btn" aria-label="Share event">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                    <span class="ed-page-header-btn-label">Share</span>
                </button>
                <button onclick="event.stopPropagation();globalThis.evtDownloadIcs('${eventId}')" class="ed-page-header-btn ed-page-header-btn-cal" aria-label="Add to calendar">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <span class="ed-page-header-btn-label">Add to Calendar</span>
                </button>
                <button onclick="event.stopPropagation();globalThis.evtDownloadIcs('${eventId}')" class="ed-page-header-btn ed-page-header-btn-bookmark" aria-label="Save event">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                </button>`;
}

function evtBuildDetailAttendeeBreakdownHtml(ctx) {
    const { isHost, goingList, maybeList, checkins, checkinCount } = ctx;
    if (!isHost) return '';

    function buildPersonRow(p) {
        const initials = ((p?.first_name?.[0] || '') + (p?.last_name?.[0] || '')).toUpperCase() || '?';
        const avatar = p?.profile_picture_url
            ? `<img src="${p.profile_picture_url}" class="w-7 h-7 rounded-full object-cover" alt="">`
            : `<div class="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary text-xs font-bold">${initials}</div>`;
        return `<div class="flex items-center gap-2">${avatar}<span class="text-sm text-gray-700">${evtEscapeHtml(p?.first_name || '')} ${evtEscapeHtml(p?.last_name || '')}</span></div>`;
    }

    const checkinRows = (checkins || []).map(c => buildPersonRow(c.profiles)).join('') || `<p class="text-xs text-gray-400 italic ml-6">None</p>`;

    return `
        <div>
            ${_edSectionHead('Attendee Breakdown')}
            <div class="mb-3">
                <div class="flex items-center gap-2 mb-1.5"><span class="text-sm">✅</span><span class="text-xs font-bold text-emerald-700 uppercase tracking-wide">Going (${goingList.length})</span></div>
                <div class="space-y-1.5 ml-6">${goingList.length ? goingList.map(r => buildPersonRow(r.profiles)).join('') : '<p class="text-xs text-gray-400 italic">None</p>'}</div>
            </div>
            <div class="mb-3">
                <div class="flex items-center gap-2 mb-1.5"><span class="text-sm">❤️</span><span class="text-xs font-bold text-pink-700 uppercase tracking-wide">Interested (${maybeList.length})</span></div>
                <div class="space-y-1.5 ml-6">${maybeList.length ? maybeList.map(r => buildPersonRow(r.profiles)).join('') : '<p class="text-xs text-gray-400 italic">None</p>'}</div>
            </div>
            <div>
                <div class="flex items-center gap-2 mb-1.5"><span class="text-sm">📍</span><span class="text-xs font-bold text-violet-700 uppercase tracking-wide">Checked In (${checkinCount || 0})</span></div>
                <div class="space-y-1.5 ml-6">${checkinRows}</div>
            </div>
        </div>`;
}

globalThis.evtBuildDetailRsvpSectionHtml = evtBuildDetailRsvpSectionHtml;
globalThis.evtBuildDetailRsvpCtaHtml = evtBuildDetailRsvpCtaHtml;
globalThis.evtBuildDetailRsvpPrepHtml = evtBuildDetailRsvpPrepHtml;
globalThis.evtMemberDisplayName = evtMemberDisplayName;
globalThis.evtWireSeatPickerPrep = evtWireSeatPickerPrep;
globalThis.evtLoadSeatInfoInvites = evtLoadSeatInfoInvites;
globalThis.evtUpdateMemberRsvpBtnLabels = evtUpdateMemberRsvpBtnLabels;
globalThis.evtWireMemberPrepPhoneSms = evtWireMemberPrepPhoneSms;
globalThis.evtBuildDetailGuestRsvpHintHtml = evtBuildDetailGuestRsvpHintHtml;
globalThis.evtBuildDetailPriceSummaryHtml = evtBuildDetailPriceSummaryHtml;
globalThis.evtBuildDetailIncludedCatalogHtml = evtBuildDetailIncludedCatalogHtml;
globalThis.evtBuildDetailAmenityResultsHtml = evtBuildDetailAmenityResultsHtml;
globalThis.evtDetailAdultPriceCents = evtDetailAdultPriceCents;
globalThis.evtBuildDetailRaffleSectionHtml = evtBuildDetailRaffleSectionHtml;
globalThis.evtBuildDetailHostControlsHtml = evtBuildDetailHostControlsHtml;
globalThis.evtBuildDetailWaitlistHtml = evtBuildDetailWaitlistHtml;
globalThis.evtBuildDetailGraceNoticeHtml = evtBuildDetailGraceNoticeHtml;
globalThis.evtBuildDetailCostBreakdownHtml = evtBuildDetailCostBreakdownHtml;
globalThis.evtBuildDetailAttendeeBreakdownHtml = evtBuildDetailAttendeeBreakdownHtml;
globalThis.evtBuildDetailHeroStatusBadgeHtml = evtBuildDetailHeroStatusBadgeHtml;
globalThis.evtBuildDetailTransportNoticeHtml = evtBuildDetailTransportNoticeHtml;
globalThis.evtBuildDetailLocationNoticeHtml = evtBuildDetailLocationNoticeHtml;
globalThis.evtBuildDetailThresholdHtml = evtBuildDetailThresholdHtml;
globalThis.evtBuildDetailAttendeePreviewHtml = evtBuildDetailAttendeePreviewHtml;
globalThis.evtBuildDetailShareCardHtml = evtBuildDetailShareCardHtml;
globalThis.evtBuildDetailOrganizerHtml = evtBuildDetailOrganizerHtml;
globalThis.evtBuildDetailTeamHubHtml = evtBuildDetailTeamHubHtml;
globalThis.evtBuildDetailRelatedEventsHtml = evtBuildDetailRelatedEventsHtml;
globalThis.evtBuildDetailMobileAttendeesHtml = evtBuildDetailMobileAttendeesHtml;
globalThis.evtBuildDetailMobileHostedHtml = evtBuildDetailMobileHostedHtml;
globalThis.evtBuildDetailPageHeaderActionsHtml = evtBuildDetailPageHeaderActionsHtml;

export const detailSectionsApi = {
    buildRsvpSectionHtml: evtBuildDetailRsvpSectionHtml,
    buildRsvpCtaHtml: evtBuildDetailRsvpCtaHtml,
    buildRsvpPrepHtml: evtBuildDetailRsvpPrepHtml,
    wireSeatPickerPrep: evtWireSeatPickerPrep,
    buildGuestRsvpHintHtml: evtBuildDetailGuestRsvpHintHtml,
    buildPriceSummaryHtml: evtBuildDetailPriceSummaryHtml,
    buildIncludedCatalogHtml: evtBuildDetailIncludedCatalogHtml,
    buildAmenityResultsHtml: evtBuildDetailAmenityResultsHtml,
    buildRaffleSectionHtml: evtBuildDetailRaffleSectionHtml,
    buildHostControlsHtml: evtBuildDetailHostControlsHtml,
    buildWaitlistHtml: evtBuildDetailWaitlistHtml,
    buildGraceNoticeHtml: evtBuildDetailGraceNoticeHtml,
    buildCostBreakdownHtml: evtBuildDetailCostBreakdownHtml,
    buildAttendeeBreakdownHtml: evtBuildDetailAttendeeBreakdownHtml,
    buildHeroStatusBadgeHtml: evtBuildDetailHeroStatusBadgeHtml,
    buildTransportNoticeHtml: evtBuildDetailTransportNoticeHtml,
    buildLocationNoticeHtml: evtBuildDetailLocationNoticeHtml,
    buildThresholdHtml: evtBuildDetailThresholdHtml,
    buildAttendeePreviewHtml: evtBuildDetailAttendeePreviewHtml,
    buildShareCardHtml: evtBuildDetailShareCardHtml,
    buildOrganizerHtml: evtBuildDetailOrganizerHtml,
    buildTeamHubHtml: evtBuildDetailTeamHubHtml,
    buildRelatedEventsHtml: evtBuildDetailRelatedEventsHtml,
    buildMobileAttendeesHtml: evtBuildDetailMobileAttendeesHtml,
    buildMobileHostedHtml: evtBuildDetailMobileHostedHtml,
    buildPageHeaderActionsHtml: evtBuildDetailPageHeaderActionsHtml,
};

const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
PortalEvents.detail = PortalEvents.detail || {};
PortalEvents.detail.sections = detailSectionsApi;
