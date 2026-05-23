/* ════════════════════════════════════════════════════════════
   Portal Events — Detail section HTML builders (Phase 5H.2–5H.3)
   Classic IIFE; loads after detail/data.js, before detail.js.
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.detail = window.PortalEvents.detail || {};

    const _edPill = window.evtEdPill;
    const _edNotice = window.evtEdNotice;
    const _edSectionHead = window.evtEdSectionHead;

    function evtBuildDetailRsvpSectionHtml(ctx) {
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

        let rsvpButtons = '';
        if (!rsvpEnabled) {
            rsvpButtons = _edNotice('ℹ️', 'Informational Event', 'RSVP is not required for this event');
        } else if (isHost) {
            const teamBtnHtml = canAccessTeamHub
                ? `<button type="button" onclick="evtOpenTeamToolsPanel('${eventId}')" class="ed-outline-btn" aria-label="Open event team tools">Team</button>`
                : '';
            rsvpButtons = `
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
            if (rsvp?.paid) {
                rsvpButtons = `
                <div class="ed-rsvp-confirmed">
                    <div class="ed-rsvp-confirmed-row">
                        <div class="ed-rsvp-confirmed-check"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>
                        <div><span class="ed-rsvp-confirmed-title">You're going!</span><span class="ed-rsvp-confirmed-sub">Non-refundable · Contact admin for changes</span></div>
                    </div>
                </div>`;
            } else {
                rsvpButtons = `
                <button onclick="evtHandleRsvp('${eventId}','going')" class="ed-primary-btn">RSVP — ${formatCurrency(event.rsvp_cost_cents)}</button>
                <button onclick="evtMessageHost('${eventId}')" class="ed-outline-btn">Message Host</button>
                <p class="ed-hint">Non-refundable unless cancelled by staff${event.raffle_enabled ? ' · Includes raffle entry' : ''}</p>`;
            }
        } else if (canRsvp && !eventIsFull) {
            if (rsvp?.status === 'going') {
                rsvpButtons = `
                <div class="ed-rsvp-confirmed">
                    <div class="ed-rsvp-confirmed-row">
                        <div class="ed-rsvp-confirmed-check"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>
                        <div><span class="ed-rsvp-confirmed-title">You're going!</span><span class="ed-rsvp-confirmed-sub">We'll see you there.</span></div>
                    </div>
                </div>
                <button onclick="evtHandleRsvp('${eventId}','going')" class="ed-outline-btn">Update RSVP</button>`;
            } else {
                const interestedActive = rsvp?.status === 'maybe' ? ' active' : '';
                rsvpButtons = `
                <button onclick="evtHandleRsvp('${eventId}','going')" class="ed-primary-btn">RSVP</button>
                <button onclick="evtMessageHost('${eventId}')" class="ed-outline-btn">Message Host</button>
                <div class="ed-rsvp-secondary">
                    <button onclick="evtHandleRsvp('${eventId}','maybe')" class="ed-rsvp-sm${interestedActive ? ' active' : ''}">❤️ Interested</button>
                </div>`;
            }
        }
        if (rsvpEnabled && !isHost && entriesClosed && !rsvpButtons) {
            let closedReason = '';
            if (isClosed) closedReason = event.status === 'cancelled' ? 'Event cancelled' : 'Event ended';
            else if (isPast) closedReason = 'Event has already started';
            else if (deadlinePassed) closedReason = 'RSVP deadline passed';
            if (rsvp) {
                const statusEmoji = rsvp.status === 'going' ? '✅' : rsvp.status === 'maybe' ? '❤️' : '❌';
                const statusLabel = rsvp.status === 'going' ? 'Going' : rsvp.status === 'maybe' ? 'Interested' : 'Not Going';
                rsvpButtons = _edNotice(statusEmoji, `Your RSVP: ${statusLabel}`, closedReason);
            } else {
                rsvpButtons = _edNotice('🔒', 'RSVP Closed', closedReason);
            }
        }
        return rsvpButtons;
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
        const raffleBundled = typeof window.evtIsRaffleBundledWithPaidRsvp === 'function'
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
            entryStatusHtml = `<div class="ed-raffle-desktop-action"><button onclick="evtHandleRaffleEntry('${eventId}')" class="ed-raffle-btn">🎟️ Buy Raffle Entry — ${formatCurrency(event.raffle_entry_cost_cents)}</button><p class="ed-hint">Non-refundable raffle ticket</p></div><p class="ed-hint ed-raffle-mobile-hint" style="font-style:italic">Use the sticky CTA below to enter the raffle.</p>`;
        } else if ((!event.raffle_entry_cost_cents || event.raffle_entry_cost_cents === 0) && !entriesClosed) {
            entryStatusHtml = `<div class="ed-raffle-desktop-action"><button onclick="evtHandleFreeRaffleEntry('${eventId}')" class="ed-raffle-btn">🎟️ Enter Raffle — Free</button></div><p class="ed-hint ed-raffle-mobile-hint" style="font-style:italic">Use the sticky CTA below to enter the raffle.</p>`;
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
        if (event.status === 'draft') primaryBtn = `<button onclick="evtUpdateStatus('${eventId}','open')" class="evt-host-btn primary">Publish Event</button>`;
        if (['open', 'confirmed', 'active'].includes(event.status)) {
            if (!primaryBtn) primaryBtn = `<button onclick="evtUpdateStatus('${eventId}','completed')" class="evt-host-btn primary">Mark Completed</button>`;
            else dropdownItems += `<button onclick="evtUpdateStatus('${eventId}','completed')">✓ Mark Completed</button>`;
            dropdownItems += `<button onclick="evtCancelEvent('${eventId}')" class="danger">✕ Cancel Event</button>`;
            if (isLlc) dropdownItems += `<button onclick="evtRescheduleEvent('${eventId}')">📅 Reschedule</button>`;
        }
        dropdownItems += `<button onclick="evtDuplicateEvent('${eventId}')">📋 Duplicate Event</button>`;
        if (typeof canManageEvents === 'function' && canManageEvents()) dropdownItems += `<button onclick="evtDeleteEvent('${eventId}')" class="danger">🗑 Delete Event</button>`;
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
            isLlc,
            goingList,
            waitlist,
            myWaitlistEntry,
        } = ctx;

        if (!isLlc || !event.max_participants) return '';

        const isFull = goingList.length >= event.max_participants;
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
                            <button onclick="evtClaimWaitlistSpot('${eventId}')" class="ed-primary-btn" style="margin-top:10px">Claim Spot — ${formatCurrency(event.rsvp_cost_cents)}</button>
                        </div>
                    </div>`;
        } else if (isWaiting) {
            const pos = activeWaitlist.findIndex(w => w.user_id === evtCurrentUser.id) + 1;
            waitlistAction = `
                    <div class="ed-notice" style="justify-content:space-between">
                        <div><p class="ed-notice-title">You're #${pos} on the waitlist</p><p class="ed-notice-sub">We'll notify you if a spot opens</p></div>
                        <button onclick="evtLeaveWaitlist('${eventId}')" class="ed-link-btn danger">Leave</button>
                    </div>`;
        } else if (!rsvp?.paid) {
            waitlistAction = `<button onclick="evtJoinWaitlist('${eventId}')" class="ed-action-btn">Join Waitlist</button>
                    <p class="ed-hint">No payment required to join the waitlist</p>`;
        }
        return `${_edSectionHead('Waitlist')}<p class="ed-sub-count">${activeWaitlist.length} waiting</p>${waitlistAction}`;
    }

    function evtBuildDetailGraceNoticeHtml(ctx) {
        const { eventId, event, rsvp } = ctx;
        if (!event.rescheduled_at || !event.grace_window_end || new Date(event.grace_window_end) <= new Date()) {
            return '';
        }
        const graceEnd = new Date(event.grace_window_end).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        return `<div class="ed-notice ed-notice-warn">
            <span class="ed-notice-emoji">📅</span>
            <div>
                <p class="ed-notice-title">This event was rescheduled</p>
                <p class="ed-notice-sub">Request a full refund until <strong>${graceEnd}</strong> if the new date doesn't work.</p>
                ${rsvp?.paid ? `<button onclick="evtRequestGraceRefund('${eventId}')" class="ed-link-btn danger" style="margin-top:8px">Request Full Refund</button>` : ''}
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

    function evtBuildDetailAttendeeBreakdownHtml(ctx) {
        const { isHost, goingList, maybeList, checkins, checkinCount } = ctx;
        if (!isHost) return '';

        function buildPersonRow(p) {
            const initials = ((p?.first_name?.[0] || '') + (p?.last_name?.[0] || '')).toUpperCase() || '?';
            const avatar = p?.profile_picture_url
                ? `<img src="${p.profile_picture_url}" class="w-7 h-7 rounded-full object-cover" alt="">`
                : `<div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">${initials}</div>`;
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

    window.evtBuildDetailRsvpSectionHtml = evtBuildDetailRsvpSectionHtml;
    window.evtBuildDetailRaffleSectionHtml = evtBuildDetailRaffleSectionHtml;
    window.evtBuildDetailHostControlsHtml = evtBuildDetailHostControlsHtml;
    window.evtBuildDetailWaitlistHtml = evtBuildDetailWaitlistHtml;
    window.evtBuildDetailGraceNoticeHtml = evtBuildDetailGraceNoticeHtml;
    window.evtBuildDetailCostBreakdownHtml = evtBuildDetailCostBreakdownHtml;
    window.evtBuildDetailAttendeeBreakdownHtml = evtBuildDetailAttendeeBreakdownHtml;

    window.PortalEvents.detail.sections = {
        buildRsvpSectionHtml: evtBuildDetailRsvpSectionHtml,
        buildRaffleSectionHtml: evtBuildDetailRaffleSectionHtml,
        buildHostControlsHtml: evtBuildDetailHostControlsHtml,
        buildWaitlistHtml: evtBuildDetailWaitlistHtml,
        buildGraceNoticeHtml: evtBuildDetailGraceNoticeHtml,
        buildCostBreakdownHtml: evtBuildDetailCostBreakdownHtml,
        buildAttendeeBreakdownHtml: evtBuildDetailAttendeeBreakdownHtml,
    };
})();
