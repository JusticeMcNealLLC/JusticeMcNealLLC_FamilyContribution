/* ════════════════════════════════════════════════════════════
   Events — RSVP stepped sheet (conditional wizard)
   Surface: window.EventsRsvpWizard
   Open when needsPrep(event, ctx); simple Going stays one-tap on detail.
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const ROOT_ID = 'erSheetRoot';
    const DRAFT_PREFIX = 'jm:er-rsvp-draft:v1:';

    const STATE = {
        step: 0,
        event: null,
        mode: 'guest', // guest | member
        memberName: '',
        memberPhoneMissing: false,
        submitting: false,
        onComplete: null,
        form: blankForm(),
        _draftTimer: null,
        _draftCleared: false,
    };

    function blankForm() {
        return {
            guest_name: '',
            guest_email: '',
            guest_phone: '',
            sms_opt_in: false,
            member_phone: '',
            member_sms_opt_in: false,
            seats: null,
            disclaimer_acks: [],
            amenity_vote_option_id: '',
            invest_acknowledged: false,
            no_refund_accepted: false,
            payment_choice: null,
            attach_intent: null,
        };
    }

    function draftUserKey() {
        if (STATE.mode === 'member') {
            return String(globalThis.evtCurrentUser?.id || window.pubCurrentUser?.id || 'member').trim() || 'member';
        }
        const email = String(STATE.form?.guest_email || '').trim().toLowerCase();
        return email || 'anon';
    }

    function draftStorageKey(eventId, mode, userKey) {
        return `${DRAFT_PREFIX}${eventId}:${mode}:${userKey}`;
    }

    function saveDraft() {
        try {
            if (STATE._draftCleared) return;
            const eventId = STATE.event?.id;
            if (!eventId || typeof localStorage === 'undefined') return;
            const key = draftStorageKey(eventId, STATE.mode, draftUserKey());
            const payload = {
                v: 1,
                eventId,
                mode: STATE.mode,
                step: STATE.step,
                form: STATE.form,
                savedAt: Date.now(),
            };
            localStorage.setItem(key, JSON.stringify(payload));
        } catch (_) { /* ignore quota / private mode */ }
    }

    function scheduleSaveDraft() {
        if (STATE._draftTimer) clearTimeout(STATE._draftTimer);
        STATE._draftTimer = setTimeout(() => {
            STATE._draftTimer = null;
            saveDraft();
        }, 300);
    }

    function loadDraft(eventId, mode, userKey) {
        try {
            if (!eventId || typeof localStorage === 'undefined') return null;
            const key = draftStorageKey(eventId, mode, userKey);
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || data.v !== 1 || data.eventId !== eventId || data.mode !== mode) return null;
            return data;
        } catch (_) {
            return null;
        }
    }

    function clearDraft(eventId, mode, userKey) {
        try {
            if (typeof localStorage === 'undefined') return;
            const id = eventId || STATE.event?.id;
            const m = mode || STATE.mode;
            if (!id) return;
            localStorage.removeItem(draftStorageKey(id, m, userKey || draftUserKey()));
            // Also clear anon guest key if we later got an email
            if (m === 'guest' && userKey && userKey !== 'anon') {
                localStorage.removeItem(draftStorageKey(id, m, 'anon'));
            }
            STATE._draftCleared = true;
            if (STATE._draftTimer) {
                clearTimeout(STATE._draftTimer);
                STATE._draftTimer = null;
            }
        } catch (_) { /* ignore */ }
    }

    function flushCurrentStep() {
        const steps = getSteps();
        const cur = steps[STATE.step];
        if (!cur || !STATE.event) return;

        if (cur.key === 'contact') {
            if (STATE.mode === 'member') {
                STATE.form.member_phone = document.getElementById('erMemberPhone')?.value || STATE.form.member_phone || '';
                STATE.form.member_sms_opt_in = !!document.getElementById('erMemberSms')?.checked;
            } else {
                STATE.form.guest_name = document.getElementById('erGuestName')?.value || STATE.form.guest_name || '';
                STATE.form.guest_email = document.getElementById('erGuestEmail')?.value || STATE.form.guest_email || '';
                STATE.form.guest_phone = document.getElementById('erGuestPhone')?.value || STATE.form.guest_phone || '';
                STATE.form.sms_opt_in = !!document.getElementById('erGuestSms')?.checked;
            }
        } else if (cur.key === 'party') {
            const root = document.getElementById('erPartyRoot') || document.getElementById('erSheetContent');
            if (window.EventsPartySeats?.readSeatsFromRoot && root) {
                const seats = window.EventsPartySeats.readSeatsFromRoot(root, STATE.event);
                if (seats && seats.length) STATE.form.seats = seats;
            }
        } else if (cur.key === 'legal') {
            const root = document.getElementById('erLegalRoot') || document.getElementById('erSheetContent');
            const catalog = discCatalog(STATE.event);
            if (window.EventsDisclaimers?.readAckIdsFromRoot) {
                STATE.form.disclaimer_acks = window.EventsDisclaimers.readAckIdsFromRoot(root, catalog);
            }
            if (window.EventsAmenityVoting?.readVoteFromRoot) {
                STATE.form.amenity_vote_option_id = window.EventsAmenityVoting.readVoteFromRoot(root) || STATE.form.amenity_vote_option_id || '';
            }
            if (window.EventsInvestAck?.readAcknowledgedFromRoot) {
                STATE.form.invest_acknowledged = !!window.EventsInvestAck.readAcknowledgedFromRoot(root);
            }
            const nr = document.getElementById('erNoRefund');
            if (nr) STATE.form.no_refund_accepted = !!nr.checked;
        } else if (cur.key === 'pay') {
            const root = document.getElementById('erPayRoot') || document.getElementById('erSheetContent');
            if (window.EventsPaymentChoice?.readFromRoot) {
                const choice = window.EventsPaymentChoice.readFromRoot(root);
                if (choice) STATE.form.payment_choice = choice;
            }
        }
        saveDraft();
    }

    function esc(str) {
        if (window.EventsHelpers && typeof window.EventsHelpers.escapeHtml === 'function') {
            return window.EventsHelpers.escapeHtml(str);
        }
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function formatMoney(cents) {
        if (window.EventsHelpers && typeof window.EventsHelpers.formatMoney === 'function') {
            return window.EventsHelpers.formatMoney(cents);
        }
        return `$${((Number(cents) || 0) / 100).toFixed(2)}`;
    }

    function discCatalog(event) {
        if (!window.EventsDisclaimers) return [];
        if (typeof window.EventsDisclaimers.effectiveDisclaimers === 'function') {
            return window.EventsDisclaimers.effectiveDisclaimers(event);
        }
        if (typeof window.EventsDisclaimers.normalizeDisclaimers === 'function') {
            return window.EventsDisclaimers.normalizeDisclaimers(event.disclaimers);
        }
        return [];
    }

    function hasRequiredDisclaimers(event) {
        const catalog = discCatalog(event);
        if (window.EventsDisclaimers && typeof window.EventsDisclaimers.hasRequiredDisclaimers === 'function') {
            return window.EventsDisclaimers.hasRequiredDisclaimers(catalog);
        }
        return catalog.some((d) => d && d.required);
    }

    function hasIncludedCatalog(event) {
        return !!(window.EventsIncludedItems
            && typeof window.EventsIncludedItems.hasCatalog === 'function'
            && window.EventsIncludedItems.hasCatalog(event?.included_items));
    }

    function needsAmenityVote(event) {
        return !!(window.EventsAmenityVoting
            && typeof window.EventsAmenityVoting.needsVote === 'function'
            && window.EventsAmenityVoting.needsVote(event));
    }

    function adultPriceCents(event) {
        if (window.EventsHelpers && typeof window.EventsHelpers.seatPriceCents === 'function') {
            return window.EventsHelpers.seatPriceCents(event, 'adult');
        }
        if (event?.adult_price_cents != null) return Number(event.adult_price_cents) || 0;
        return Number(event?.rsvp_cost_cents || 0);
    }

    function estimatedPartyTotal(event) {
        const seats = STATE.form.seats;
        if (seats && seats.length && window.EventsPartySeats?.partyBaseTotalCents) {
            return window.EventsPartySeats.partyBaseTotalCents(event, seats);
        }
        return adultPriceCents(event);
    }

    function needsPaymentChoice(event, totalCents) {
        return !!(window.EventsPaymentChoice
            && typeof window.EventsPaymentChoice.needsChoice === 'function'
            && window.EventsPaymentChoice.needsChoice(event, totalCents));
    }

    function needsInvestAck(event) {
        return !!(window.EventsInvestAck
            && typeof window.EventsInvestAck.isRequired === 'function'
            && window.EventsInvestAck.isRequired(event));
    }

    function showPartySeats(event) {
        return !!(window.EventsPartySeats
            && typeof window.EventsPartySeats.shouldShow === 'function'
            && window.EventsPartySeats.shouldShow(event, { isHost: false }));
    }

    /**
     * True when RSVP needs a stepped sheet (not one-tap Going).
     * @param {object} event
     * @param {{ mode?: string, memberPhoneMissing?: boolean }} ctx
     */
    function needsPrep(event, ctx) {
        if (!event || event.rsvp_enabled === false) return false;
        if (event.event_type === 'competition') return false;

        const mode = (ctx && ctx.mode) || 'guest';
        const total = adultPriceCents(event);
        const paidWithAmount = event.pricing_mode === 'paid' && total > 0;

        if (paidWithAmount) return true;
        if (hasRequiredDisclaimers(event)) return true;
        if (needsAmenityVote(event)) return true;
        if (hasIncludedCatalog(event)) return true;
        if (needsInvestAck(event)) return true;
        if (mode === 'member' && ctx && ctx.memberPhoneMissing) return true;
        if (mode === 'guest') {
            // Guests always need contact — but free no-prep guests still use a short sheet?
            // Plan: simple Going is member one-tap. Guests always need name/email/phone → wizard
            // when ANY other gate, OR always for guests if we want contact in sheet.
            // Free guest with no options: historically inline form. Plan says simple press RSVP
            // is fine — for guests that still means name/email. Keep free no-gate guests on
            // lightweight CTA/inline; only open wizard when gates above fire.
            // Guest + paid or options → wizard (already returned). Guest free simple → false.
        }
        return false;
    }

    function getSteps() {
        const event = STATE.event;
        if (!event) return [{ key: 'review', label: 'Review' }];
        const steps = [];
        const total = estimatedPartyTotal(event);

        if (STATE.mode === 'guest') {
            steps.push({ key: 'contact', label: 'Contact' });
        } else if (STATE.memberPhoneMissing || !(STATE.form.member_phone || '').trim()) {
            // Keep Phone step for the open session (memberPhoneMissing) so typing
            // a number does not drop contact and shift step 0 onto Party.
            steps.push({ key: 'contact', label: 'Phone' });
        }

        if (showPartySeats(event) || hasIncludedCatalog(event)) {
            steps.push({ key: 'party', label: 'Party' });
        }

        const needLegal = hasRequiredDisclaimers(event)
            || needsAmenityVote(event)
            || needsInvestAck(event)
            || (event.pricing_mode === 'paid' && total > 0 && !hasRequiredDisclaimers(event));
        if (needLegal) {
            steps.push({ key: 'legal', label: 'Agree' });
        }

        if (needsPaymentChoice(event, total)) {
            steps.push({ key: 'pay', label: 'Pay' });
        }

        steps.push({ key: 'review', label: 'Review' });
        return steps;
    }

    // ── Steps ──────────────────────────────────────────────

    function stepContactHtml() {
        if (STATE.mode === 'member') {
            return `
                <div class="er-step">
                    <p class="er-lead">Add a mobile number so we can text event updates.</p>
                    <div class="er-row">
                        <label class="er-label" for="erMemberPhone">Mobile phone</label>
                        <input id="erMemberPhone" class="er-input" type="tel" inputmode="tel"
                            value="${esc(STATE.form.member_phone)}" placeholder="Phone number" required>
                    </div>
                    <label class="er-check">
                        <input type="checkbox" id="erMemberSms" ${STATE.form.member_sms_opt_in ? 'checked' : ''}>
                        <span>Text me event updates. Message/data rates may apply. Reply STOP to opt out.</span>
                    </label>
                </div>`;
        }
        return `
            <div class="er-step">
                <p class="er-lead">Your contact info for this RSVP.</p>
                <div class="er-row">
                    <label class="er-label" for="erGuestName">Full name</label>
                    <input id="erGuestName" class="er-input" type="text" autocomplete="name"
                        value="${esc(STATE.form.guest_name)}" placeholder="Your full name" required>
                </div>
                <div class="er-row">
                    <label class="er-label" for="erGuestEmail">Email</label>
                    <input id="erGuestEmail" class="er-input" type="email" autocomplete="email"
                        value="${esc(STATE.form.guest_email)}" placeholder="Email address" required>
                </div>
                <div class="er-row">
                    <label class="er-label" for="erGuestPhone">Phone</label>
                    <input id="erGuestPhone" class="er-input" type="tel" inputmode="tel" autocomplete="tel"
                        value="${esc(STATE.form.guest_phone)}" placeholder="Phone number" required>
                </div>
                <label class="er-check">
                    <input type="checkbox" id="erGuestSms" ${STATE.form.sms_opt_in ? 'checked' : ''}>
                    <span>Text me event updates at this number. Message/data rates may apply. Reply STOP to opt out.</span>
                </label>
            </div>`;
    }

    function stepContactWire() {
        const sync = () => {
            if (STATE.mode === 'member') {
                STATE.form.member_phone = document.getElementById('erMemberPhone')?.value || '';
                STATE.form.member_sms_opt_in = !!document.getElementById('erMemberSms')?.checked;
            } else {
                STATE.form.guest_name = document.getElementById('erGuestName')?.value || '';
                STATE.form.guest_email = document.getElementById('erGuestEmail')?.value || '';
                STATE.form.guest_phone = document.getElementById('erGuestPhone')?.value || '';
                STATE.form.sms_opt_in = !!document.getElementById('erGuestSms')?.checked;
                if (window.EventsPartySeats?.syncPayerNameFromContact) {
                    window.EventsPartySeats.syncPayerNameFromContact(
                        document.getElementById('erSheetContent'),
                        STATE.form.guest_name,
                    );
                }
            }
            scheduleSaveDraft();
        };
        ['erGuestName', 'erGuestEmail', 'erGuestPhone', 'erGuestSms', 'erMemberPhone', 'erMemberSms']
            .forEach((id) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('input', sync);
                el.addEventListener('change', sync);
            });
    }

    function stepContactValidate() {
        if (STATE.mode === 'member') {
            const raw = (STATE.form.member_phone || '').trim();
            const validated = window.EventsHelpers?.validatePhone
                ? window.EventsHelpers.validatePhone(raw)
                : (raw ? { value: raw } : { error: 'Phone number is required.' });
            if (validated.error) return validated.error;
            STATE.form.member_phone = validated.value;
            return null;
        }
        const name = (STATE.form.guest_name || '').trim();
        const email = (STATE.form.guest_email || '').trim().toLowerCase();
        if (!name) return 'Please enter your name.';
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email.';
        const phoneRaw = (STATE.form.guest_phone || '').trim();
        const phoneOk = window.EventsHelpers?.validatePhone
            ? window.EventsHelpers.validatePhone(phoneRaw)
            : (phoneRaw ? { value: phoneRaw } : { error: 'Phone number is required.' });
        if (phoneOk.error) return phoneOk.error;
        STATE.form.guest_name = name;
        STATE.form.guest_email = email;
        STATE.form.guest_phone = phoneOk.value;
        return null;
    }

    function stepPartyHtml() {
        const event = STATE.event;
        const payerName = STATE.mode === 'guest'
            ? STATE.form.guest_name
            : (STATE.memberName || '');
        if (!window.EventsPartySeats?.formFieldsHtml) {
            return '<p class="er-lead">Party seats unavailable.</p>';
        }
        const initialSeats = Array.isArray(STATE.form.seats) && STATE.form.seats.length
            ? STATE.form.seats
            : undefined;
        return `
            <div class="er-step" id="erPartyRoot">
                ${window.EventsPartySeats.formFieldsHtml(event, {
                    idPrefix: 'erParty',
                    payerName,
                    hidePayerName: STATE.mode === 'guest',
                    hideLabel: true,
                    defaultRole: window.EventsIncludedItems?.defaultSeatRoleForCatalog?.(event.included_items) || 'adult',
                    initialSeats,
                })}
            </div>`;
    }

    function stepPartyWire() {
        const root = document.getElementById('erPartyRoot') || document.getElementById('erSheetContent');
        if (!root || !STATE.event) return;
        if (!STATE.form.seats || !STATE.form.seats.length) {
            STATE.form.seats = defaultSeats();
        }
        const syncSeats = () => {
            if (window.EventsPartySeats?.readSeatsFromRoot) {
                const seats = window.EventsPartySeats.readSeatsFromRoot(root, STATE.event);
                if (seats && seats.length) STATE.form.seats = seats;
            }
            // Rebuild steps if pay step appears/disappears due to total
            _refreshFooterLabels();
            scheduleSaveDraft();
        };
        if (window.EventsPartySeats?.wireForm) {
            window.EventsPartySeats.wireForm(root, STATE.event, syncSeats);
        }
        if (window.EventsIncludedItems?.wireChoiceControls) {
            window.EventsIncludedItems.wireChoiceControls(root);
        }
        if (STATE.mode === 'guest' && window.EventsPartySeats?.syncPayerNameFromContact) {
            window.EventsPartySeats.syncPayerNameFromContact(root, STATE.form.guest_name);
        }
        // Hydrated HTML already has seats — only sync from DOM, do not wipe to default
        if (window.EventsPartySeats?.readSeatsFromRoot) {
            const seats = window.EventsPartySeats.readSeatsFromRoot(root, STATE.event);
            if (seats && seats.length) STATE.form.seats = seats;
        }
        if (!STATE.form.seats || !STATE.form.seats.length) {
            STATE.form.seats = defaultSeats();
        }
        _refreshFooterLabels();
    }

    function stepPartyValidate() {
        const event = STATE.event;
        const root = document.getElementById('erPartyRoot') || document.getElementById('erSheetContent');
        if (STATE.mode === 'guest' && window.EventsPartySeats?.syncPayerNameFromContact) {
            window.EventsPartySeats.syncPayerNameFromContact(root, STATE.form.guest_name);
        }
        const seats = window.EventsPartySeats?.readSeatsFromRoot
            ? window.EventsPartySeats.readSeatsFromRoot(root, event)
            : [];
        if (STATE.mode === 'guest' && seats.length && seats[0]?.is_payer) {
            seats[0].display_name = STATE.form.guest_name || seats[0].display_name;
        }
        STATE.form.seats = seats;
        const catalog = window.EventsIncludedItems?.normalizeIncludedItems?.(event.included_items) || [];
        if (window.EventsPartySeats?.validatePartySeats) {
            return window.EventsPartySeats.validatePartySeats(event, seats, catalog, {
                allowIncompleteGuests: true,
            });
        }
        return null;
    }

    function stepLegalHtml() {
        const event = STATE.event;
        const catalog = discCatalog(event);
        const total = estimatedPartyTotal(event);
        const ackedIds = Array.isArray(STATE.form.disclaimer_acks) ? STATE.form.disclaimer_acks : [];
        const hasDisc = !!(window.EventsDisclaimers?.formFieldsHtml && catalog.length);
        const hasAmenity = !!(needsAmenityVote(event) && window.EventsAmenityVoting?.formFieldsHtml);
        const hasInvest = !!(needsInvestAck(event) && window.EventsInvestAck?.formFieldHtml);
        let html = '<div class="er-step" id="erLegalRoot">';
        // Nested blocks already have section titles — only add a lead when none are present
        if (!hasDisc && !hasAmenity && !hasInvest) {
            html += '<p class="er-lead">Please review and acknowledge.</p>';
        }
        if (hasDisc) {
            html += window.EventsDisclaimers.formFieldsHtml(catalog, { idPrefix: 'erDisc', ackedIds });
        }
        if (hasAmenity) {
            const cfg = window.EventsAmenityVoting.normalizeConfig(event.amenity_voting);
            html += window.EventsAmenityVoting.formFieldsHtml(cfg, {
                idPrefix: 'erAmenity',
                selectedOptionId: STATE.form.amenity_vote_option_id || '',
            });
        }
        if (hasInvest) {
            html += window.EventsInvestAck.formFieldHtml(event, {
                idPrefix: 'erInvest',
                acknowledged: !!STATE.form.invest_acknowledged,
            });
        }
        if (event.pricing_mode === 'paid' && total > 0 && !hasRequiredDisclaimers(event)) {
            html += `
                <label class="er-check" style="margin-top:12px">
                    <input type="checkbox" id="erNoRefund" ${STATE.form.no_refund_accepted ? 'checked' : ''}>
                    <span>I understand this payment is non-refundable unless cancelled by staff.</span>
                </label>`;
        }
        html += '</div>';
        return html;
    }

    function stepLegalWire() {
        const root = document.getElementById('erLegalRoot') || document.getElementById('erSheetContent');
        const sync = () => {
            const catalog = discCatalog(STATE.event);
            if (window.EventsDisclaimers?.readAckIdsFromRoot) {
                STATE.form.disclaimer_acks = window.EventsDisclaimers.readAckIdsFromRoot(root, catalog);
            }
            if (window.EventsAmenityVoting?.readVoteFromRoot) {
                STATE.form.amenity_vote_option_id = window.EventsAmenityVoting.readVoteFromRoot(root) || '';
            }
            if (window.EventsInvestAck?.readAcknowledgedFromRoot) {
                STATE.form.invest_acknowledged = !!window.EventsInvestAck.readAcknowledgedFromRoot(root);
            }
            STATE.form.no_refund_accepted = !!document.getElementById('erNoRefund')?.checked;
            scheduleSaveDraft();
        };
        root?.addEventListener('change', sync);
        sync();
    }

    function stepLegalValidate() {
        const event = STATE.event;
        const root = document.getElementById('erLegalRoot') || document.getElementById('erSheetContent');
        const catalog = discCatalog(event);
        if (hasRequiredDisclaimers(event) && window.EventsDisclaimers) {
            const acks = window.EventsDisclaimers.readAckIdsFromRoot(root, catalog);
            STATE.form.disclaimer_acks = acks;
            const err = window.EventsDisclaimers.validateAcks(catalog, acks);
            if (err) return err;
        }
        if (needsAmenityVote(event) && window.EventsAmenityVoting) {
            const cfg = window.EventsAmenityVoting.normalizeConfig(event.amenity_voting);
            const vote = window.EventsAmenityVoting.readVoteFromRoot(root) || '';
            STATE.form.amenity_vote_option_id = vote;
            const err = window.EventsAmenityVoting.validateVote(cfg, vote);
            if (err) return err;
        }
        if (needsInvestAck(event) && window.EventsInvestAck) {
            const err = window.EventsInvestAck.validateAck(event, root);
            if (err) return err;
            STATE.form.invest_acknowledged = !!window.EventsInvestAck.readAcknowledgedFromRoot(root);
        }
        const total = estimatedPartyTotal(event);
        if (event.pricing_mode === 'paid' && total > 0 && !hasRequiredDisclaimers(event)) {
            STATE.form.no_refund_accepted = !!document.getElementById('erNoRefund')?.checked;
            if (!STATE.form.no_refund_accepted) {
                return 'Please accept the no-refund policy to continue.';
            }
        }
        return null;
    }

    function stepPayHtml() {
        const event = STATE.event;
        const total = estimatedPartyTotal(event);
        if (!window.EventsPaymentChoice?.formFieldsHtml) {
            return '<p class="er-lead">Payment options unavailable.</p>';
        }
        return `
            <div class="er-step" id="erPayRoot">
                ${window.EventsPaymentChoice.formFieldsHtml(event, {
                    seatPriceCents: total,
                    idPrefix: 'erPay',
                    choice: STATE.form.payment_choice || undefined,
                })}
            </div>`;
    }

    function stepPayWire() {
        const root = document.getElementById('erPayRoot') || document.getElementById('erSheetContent');
        const event = STATE.event;
        const total = estimatedPartyTotal(event);
        if (window.EventsPaymentChoice?.wireForm) {
            window.EventsPaymentChoice.wireForm(root, event, () => total, () => {
                if (window.EventsPaymentChoice.readFromRoot) {
                    STATE.form.payment_choice = window.EventsPaymentChoice.readFromRoot(root);
                }
                scheduleSaveDraft();
            });
        }
        if (window.EventsPaymentChoice?.readFromRoot) {
            STATE.form.payment_choice = window.EventsPaymentChoice.readFromRoot(root);
        }
    }

    function stepPayValidate() {
        const event = STATE.event;
        const root = document.getElementById('erPayRoot') || document.getElementById('erSheetContent');
        const total = estimatedPartyTotal(event);
        if (!needsPaymentChoice(event, total)) return null;
        const choice = window.EventsPaymentChoice?.readFromRoot?.(root);
        STATE.form.payment_choice = choice;
        return window.EventsPaymentChoice?.validateChoice?.(event, choice, total) || null;
    }

    function stepReviewHtml() {
        const event = STATE.event;
        const seats = STATE.form.seats || [];
        const total = estimatedPartyTotal(event);
        const seatLines = seats.map((s) => {
            const role = s.role === 'kid' ? 'Child' : 'Adult';
            const opts = s.options && Object.keys(s.options).length
                ? ` · ${Object.values(s.options).join(', ')}`
                : '';
            return `<div class="er-review-row"><span>${esc(s.display_name || 'Guest')}</span><span>${role}${esc(opts)}</span></div>`;
        }).join('') || '<div class="er-review-row"><span>Party</span><span>1 adult</span></div>';

        const contact = STATE.mode === 'guest'
            ? `<div class="er-review-row"><span>Name</span><span>${esc(STATE.form.guest_name)}</span></div>
               <div class="er-review-row"><span>Email</span><span>${esc(STATE.form.guest_email)}</span></div>
               <div class="er-review-row"><span>Phone</span><span>${esc(STATE.form.guest_phone)}</span></div>`
            : (STATE.form.member_phone
                ? `<div class="er-review-row"><span>Phone</span><span>${esc(STATE.form.member_phone)}</span></div>`
                : '');

        const pay = STATE.form.payment_choice
            ? `<div class="er-review-row"><span>Plan</span><span>${esc(STATE.form.payment_choice.plan_kind || '')}</span></div>
               <div class="er-review-row"><span>Method</span><span>${esc(STATE.form.payment_choice.method || '')}</span></div>`
            : '';

        const totalRow = total > 0
            ? `<div class="er-review-row"><span>Total</span><span>${esc(formatMoney(total))}</span></div>`
            : '';

        return `
            <div class="er-step">
                <p class="er-lead">Confirm your RSVP for <strong>${esc(event.title || 'this event')}</strong>.</p>
                <div class="er-review-card">${contact}${seatLines}${pay}${totalRow}</div>
            </div>`;
    }

    function stepReviewWire() { /* static */ }
    function stepReviewValidate() { return null; }

    const STEPS = {
        contact: { html: stepContactHtml, wire: stepContactWire, validate: stepContactValidate },
        party: { html: stepPartyHtml, wire: stepPartyWire, validate: stepPartyValidate },
        legal: { html: stepLegalHtml, wire: stepLegalWire, validate: stepLegalValidate },
        pay: { html: stepPayHtml, wire: stepPayWire, validate: stepPayValidate },
        review: { html: stepReviewHtml, wire: stepReviewWire, validate: stepReviewValidate },
    };

    // ── Shell ──────────────────────────────────────────────

    function _ensureMounted() {
        if (document.getElementById(ROOT_ID)) return;
        const root = document.createElement('div');
        root.id = ROOT_ID;
        root.innerHTML = `
            <div id="erSheetBackdrop" class="er-backdrop"></div>
            <div id="erSheet" class="er-sheet" aria-hidden="true">
                <div id="erSheetPanel" class="er-panel" role="dialog" aria-modal="true" aria-labelledby="erSheetTitle">
                    <header class="er-header">
                        <div class="er-header-text">
                            <p class="er-kicker" id="erSheetKicker">RSVP</p>
                            <h2 class="er-title" id="erSheetTitle">RSVP</h2>
                            <p class="er-sub" id="erSheetSub"></p>
                        </div>
                        <button type="button" id="erSheetClose" class="er-icon-btn" aria-label="Close">
                            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </header>
                    <div id="erSheetSteps" class="er-dots"></div>
                    <div id="erSheetContent" class="er-content"></div>
                    <div id="erSheetError" class="er-error hidden"></div>
                    <footer class="er-footer">
                        <button type="button" id="erBackBtn" class="er-btn-secondary">Back</button>
                        <button type="button" id="erNextBtn" class="er-btn-primary">Next</button>
                    </footer>
                </div>
            </div>`;
        document.body.appendChild(root);
        document.getElementById('erSheetClose').addEventListener('click', close);
        document.getElementById('erSheetBackdrop').addEventListener('click', close);
        document.getElementById('erBackBtn').addEventListener('click', _back);
        document.getElementById('erNextBtn').addEventListener('click', _next);
    }

    function _showError(msg) {
        const el = document.getElementById('erSheetError');
        if (!el) return;
        if (!msg) {
            el.classList.add('hidden');
            el.textContent = '';
            return;
        }
        el.textContent = msg;
        el.classList.remove('hidden');
    }

    function _refreshFooterLabels() {
        const steps = getSteps();
        const nextBtn = document.getElementById('erNextBtn');
        if (!nextBtn) return;
        const last = STATE.step >= steps.length - 1;
        const total = estimatedPartyTotal(STATE.event);
        if (last) {
            nextBtn.textContent = total > 0 ? `Pay ${formatMoney(total)}` : 'Confirm RSVP';
        } else {
            nextBtn.textContent = 'Next';
        }
    }

    function _render() {
        const steps = getSteps();
        if (STATE.step >= steps.length) STATE.step = Math.max(0, steps.length - 1);
        const cur = steps[STATE.step];

        const titleEl = document.getElementById('erSheetTitle');
        const subEl = document.getElementById('erSheetSub');
        const kicker = document.getElementById('erSheetKicker');
        if (titleEl) titleEl.textContent = STATE.event?.title || 'RSVP';
        if (kicker) kicker.textContent = 'RSVP';
        if (subEl) subEl.textContent = `Step ${STATE.step + 1} of ${steps.length} — ${cur.label}`;

        const dots = document.getElementById('erSheetSteps');
        if (dots) {
            dots.innerHTML = steps.map((s, i) =>
                `<div class="er-dot${i === STATE.step ? ' is-active' : ''}${i < STATE.step ? ' is-done' : ''}" title="${esc(s.label)}"></div>`
            ).join('');
        }

        const backBtn = document.getElementById('erBackBtn');
        if (backBtn) backBtn.style.visibility = STATE.step === 0 ? 'hidden' : 'visible';

        _showError('');
        const content = document.getElementById('erSheetContent');
        const api = STEPS[cur.key];
        if (content && api) {
            content.innerHTML = api.html();
            api.wire();
        }
        _refreshFooterLabels();
        if (content) content.scrollTop = 0;
    }

    function _back() {
        const steps = getSteps();
        const cur = steps[STATE.step];
        if (!cur || STATE.step <= 0) return;
        flushCurrentStep();
        const prevKey = steps[STATE.step - 1]?.key;
        const refreshed = getSteps();
        const idx = prevKey ? refreshed.findIndex((s) => s.key === prevKey) : STATE.step - 1;
        STATE.step = idx >= 0 ? idx : Math.max(0, STATE.step - 1);
        saveDraft();
        _render();
    }

    async function _next() {
        const steps = getSteps();
        const cur = steps[STATE.step];
        if (!cur) return;
        const curKey = cur.key;
        const api = STEPS[curKey];
        flushCurrentStep();
        if (api?.validate) {
            const err = api.validate();
            if (err) {
                _showError(err);
                return;
            }
        }
        _showError('');
        saveDraft();

        // Re-resolve by key so dropping/adding steps mid-flight does not skip/shift
        const afterValidate = getSteps();
        const curIdx = afterValidate.findIndex((s) => s.key === curKey);
        const atLast = curIdx < 0 || curIdx >= afterValidate.length - 1;
        if (atLast) {
            await _submit();
            return;
        }
        const nextKey = afterValidate[curIdx + 1].key;
        const nextSteps = getSteps();
        const nextIdx = nextSteps.findIndex((s) => s.key === nextKey);
        STATE.step = nextIdx >= 0 ? nextIdx : Math.min(curIdx + 1, nextSteps.length - 1);
        saveDraft();
        _render();
    }

    function defaultSeats() {
        const name = STATE.mode === 'guest' ? STATE.form.guest_name : (STATE.memberName || 'Member');
        return [{
            role: 'adult',
            display_name: name,
            is_payer: true,
        }];
    }

    async function _submit() {
        if (STATE.submitting) return;
        STATE.submitting = true;
        const nextBtn = document.getElementById('erNextBtn');
        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.textContent = 'Processing…';
        }
        try {
            if (STATE.mode === 'guest') {
                await _submitGuest();
            } else {
                await _submitMember();
            }
            close();
            if (typeof STATE.onComplete === 'function') {
                await STATE.onComplete();
            }
        } catch (err) {
            _showError(err?.message || 'Something went wrong. Please try again.');
            _refreshFooterLabels();
            if (nextBtn) nextBtn.disabled = false;
        } finally {
            STATE.submitting = false;
        }
    }

    async function _submitGuest() {
        const event = STATE.event;
        const seats = (STATE.form.seats && STATE.form.seats.length)
            ? STATE.form.seats
            : defaultSeats();
        if (seats[0]) seats[0].display_name = STATE.form.guest_name || seats[0].display_name;
        const partyTotal = window.EventsPartySeats?.partyBaseTotalCents
            ? window.EventsPartySeats.partyBaseTotalCents(event, seats)
            : adultPriceCents(event);
        const needsPaid = event.pricing_mode === 'paid' && partyTotal > 0;
        const seatRole = seats.find((s) => s.is_payer)?.role || 'adult';
        const sms = {
            guest_phone: STATE.form.guest_phone,
            sms_opt_in: !!(STATE.form.guest_phone && STATE.form.sms_opt_in),
            sms_consent_text_version: 'event_sms_v1',
        };
        const hasDisc = hasRequiredDisclaimers(event);
        const amenity = needsAmenityVote(event);
        const payChoice = STATE.form.payment_choice;

        if (needsPaid) {
            if (typeof callEdgeFunctionPublic !== 'function') {
                throw new Error('Checkout is unavailable right now.');
            }
            const checkout = await callEdgeFunctionPublic('create-event-checkout', {
                event_id: event.id,
                type: 'rsvp',
                guest_name: STATE.form.guest_name,
                guest_email: STATE.form.guest_email,
                seats,
                seat_role: seatRole,
                ...sms,
                ...(hasDisc ? { disclaimer_acks: STATE.form.disclaimer_acks } : {}),
                ...(amenity ? { amenity_vote_option_id: STATE.form.amenity_vote_option_id } : {}),
                ...(payChoice ? { plan_kind: payChoice.plan_kind, method: payChoice.method } : {}),
            });
            if (checkout?.invite_token && window.EventsHelpers?.stashPaymentInviteToken) {
                window.EventsHelpers.stashPaymentInviteToken(event.id, checkout.invite_token);
            }
            if (checkout?.fully_credited || checkout?.paid) {
                clearDraft(event.id, 'guest', draftUserKey());
                return;
            }
            if (checkout?.url) {
                clearDraft(event.id, 'guest', draftUserKey());
                window.location.href = checkout.url;
                return;
            }
            throw new Error('Checkout did not return a payment link.');
        }

        if (typeof callEdgeFunctionPublic !== 'function') {
            throw new Error('RSVP is unavailable right now.');
        }
        await callEdgeFunctionPublic('rsvp-guest-free', {
            event_id: event.id,
            guest_name: STATE.form.guest_name,
            guest_email: STATE.form.guest_email,
            seats,
            seat_role: seatRole,
            ...sms,
            ...(hasDisc ? { disclaimer_acks: STATE.form.disclaimer_acks } : {}),
            ...(amenity ? { amenity_vote_option_id: STATE.form.amenity_vote_option_id } : {}),
        });
        clearDraft(event.id, 'guest', draftUserKey());
    }

    async function _submitMember() {
        const event = STATE.event;
        const userId = window.pubCurrentUser?.id || globalThis.evtCurrentUser?.id;
        if (!userId) throw new Error('Please sign in to RSVP.');

        // Ensure phone was collected before checkout / edge calls
        const phoneCheck = stepContactValidate();
        if (STATE.mode === 'member' && (!(STATE.form.member_phone || '').trim() || phoneCheck)) {
            const steps = getSteps();
            const contactIdx = steps.findIndex((s) => s.key === 'contact');
            if (contactIdx >= 0) STATE.step = contactIdx;
            else {
                STATE.memberPhoneMissing = true;
                STATE.step = 0;
            }
            _render();
            throw new Error(phoneCheck || 'Phone number is required. Add a mobile number to continue.');
        }

        if (STATE.form.member_phone && window.supabaseClient) {
            await supabaseClient.from('profiles').update({ phone: STATE.form.member_phone }).eq('id', userId);
        }

        const seats = (STATE.form.seats && STATE.form.seats.length)
            ? STATE.form.seats
            : defaultSeats();
        const partyTotal = window.EventsPartySeats?.partyBaseTotalCents
            ? window.EventsPartySeats.partyBaseTotalCents(event, seats)
            : adultPriceCents(event);
        const needsPaid = event.pricing_mode === 'paid' && partyTotal > 0;
        const seatRole = seats.find((s) => s.is_payer)?.role || 'adult';
        const hasDisc = hasRequiredDisclaimers(event);
        const amenity = needsAmenityVote(event);
        const payChoice = STATE.form.payment_choice;
        const callEdge = typeof callEdgeFunction === 'function' ? callEdgeFunction : null;
        if (!callEdge) throw new Error('RSVP is unavailable right now.');

        const phonePayload = { phone: STATE.form.member_phone };

        if (needsPaid) {
            if (payChoice && window.EventsPaymentChoice?.confirmMessage) {
                const msg = window.EventsPaymentChoice.confirmMessage(event, payChoice, partyTotal);
                if (msg) {
                    const ok = window.EventsHelpers?.confirmDialog
                        ? await window.EventsHelpers.confirmDialog({ message: msg })
                        : confirm(msg);
                    if (!ok) throw new Error('Checkout cancelled.');
                }
            }
            const checkout = await callEdge('create-event-checkout', {
                event_id: event.id,
                type: 'rsvp',
                seats,
                seat_role: seatRole,
                ...phonePayload,
                ...(hasDisc ? { disclaimer_acks: STATE.form.disclaimer_acks } : {}),
                ...(amenity ? { amenity_vote_option_id: STATE.form.amenity_vote_option_id } : {}),
                ...(payChoice ? { plan_kind: payChoice.plan_kind, method: payChoice.method } : {}),
                ...(STATE.form.invest_acknowledged ? { invest_eligible_acknowledged: true } : {}),
            });
            if (checkout?.invite_token && window.EventsHelpers?.stashPaymentInviteToken) {
                window.EventsHelpers.stashPaymentInviteToken(event.id, checkout.invite_token);
            }
            if (checkout?.fully_credited || checkout?.paid) {
                clearDraft(event.id, 'member', draftUserKey());
                return;
            }
            if (checkout?.url) {
                clearDraft(event.id, 'member', draftUserKey());
                window.location.href = checkout.url;
                return;
            }
            throw new Error('Checkout did not return a payment link.');
        }

        await callEdge('rsvp-member-party', {
            event_id: event.id,
            status: 'going',
            seats,
            seat_role: seatRole,
            ...phonePayload,
            ...(hasDisc ? { disclaimer_acks: STATE.form.disclaimer_acks } : {}),
            ...(amenity ? { amenity_vote_option_id: STATE.form.amenity_vote_option_id } : {}),
            ...(STATE.form.invest_acknowledged ? { invest_eligible_acknowledged: true } : {}),
        });
        clearDraft(event.id, 'member', draftUserKey());
    }

    function open(opts) {
        const event = opts?.event;
        if (!event) return;
        _ensureMounted();
        STATE.event = event;
        STATE.mode = opts.mode === 'member' ? 'member' : 'guest';
        STATE.memberName = opts.memberName || '';
        const openedPhone = String(opts.memberPhone || '').trim();
        STATE.memberPhoneMissing = STATE.mode === 'member'
            ? (!openedPhone || !!opts.memberPhoneMissing)
            : !!opts.memberPhoneMissing;
        STATE.onComplete = opts.onComplete || null;
        STATE.submitting = false;
        STATE._draftCleared = false;

        const memberUserKey = String(globalThis.evtCurrentUser?.id || window.pubCurrentUser?.id || 'member').trim() || 'member';
        const guestEmailKey = String(opts.guestEmail || '').trim().toLowerCase();
        let userKey = STATE.mode === 'member' ? memberUserKey : (guestEmailKey || 'anon');
        let draft = loadDraft(event.id, STATE.mode, userKey);
        if (!draft && STATE.mode === 'guest' && userKey !== 'anon') {
            draft = loadDraft(event.id, STATE.mode, 'anon');
        }

        Object.assign(STATE.form, blankForm());
        if (draft?.form && typeof draft.form === 'object') {
            Object.assign(STATE.form, draft.form);
        }
        // Merge open opts without wiping restored fields unnecessarily
        if (opts.guestName && !STATE.form.guest_name) STATE.form.guest_name = opts.guestName;
        if (opts.guestEmail && !STATE.form.guest_email) STATE.form.guest_email = opts.guestEmail;
        if (opts.guestPhone && !STATE.form.guest_phone) STATE.form.guest_phone = opts.guestPhone;
        if (openedPhone) STATE.form.member_phone = openedPhone;

        // If profile still has no phone, keep contact step available
        if (STATE.mode === 'member' && !(STATE.form.member_phone || '').trim()) {
            STATE.memberPhoneMissing = true;
        }

        const steps = getSteps();
        let step = typeof draft?.step === 'number' ? draft.step : 0;
        if (step < 0) step = 0;
        if (step >= steps.length) step = Math.max(0, steps.length - 1);
        STATE.step = step;

        const sheet = document.getElementById('erSheet');
        const panel = document.getElementById('erSheetPanel');
        const backdrop = document.getElementById('erSheetBackdrop');
        sheet.classList.add('is-open');
        sheet.setAttribute('aria-hidden', 'false');
        backdrop.classList.add('is-open');
        requestAnimationFrame(() => panel.classList.add('is-open'));
        document.body.style.overflow = 'hidden';
        _render();
    }

    function close() {
        const sheet = document.getElementById('erSheet');
        if (!sheet || !sheet.classList.contains('is-open')) return;
        if (!STATE._draftCleared) {
            try {
                flushCurrentStep();
            } catch (_) { /* ignore */ }
            saveDraft();
        }
        const panel = document.getElementById('erSheetPanel');
        const backdrop = document.getElementById('erSheetBackdrop');
        panel.classList.remove('is-open');
        backdrop.classList.remove('is-open');
        document.body.style.overflow = '';
        setTimeout(() => {
            sheet.classList.remove('is-open');
            sheet.setAttribute('aria-hidden', 'true');
        }, 250);
    }

    function isOpen() {
        return !!document.getElementById('erSheet')?.classList.contains('is-open');
    }

    function hasDraft(eventId, mode, userKey) {
        try {
            const id = String(eventId || '').trim();
            if (!id || typeof localStorage === 'undefined') return false;
            const m = mode === 'member' ? 'member' : 'guest';
            let key = userKey;
            if (!key) {
                if (m === 'member') {
                    key = String(globalThis.evtCurrentUser?.id || window.pubCurrentUser?.id || 'member').trim() || 'member';
                } else {
                    key = 'anon';
                }
            }
            if (loadDraft(id, m, key)) return true;
            if (m === 'guest' && key !== 'anon' && loadDraft(id, m, 'anon')) return true;
            return false;
        } catch (_) {
            return false;
        }
    }

    /**
     * Open wizard if needsPrep; otherwise return false so caller can one-tap.
     */
    function openIfNeeded(opts) {
        if (!needsPrep(opts?.event, opts)) return false;
        open(opts);
        return true;
    }

    globalThis.EventsRsvpWizard = {
        needsPrep,
        getSteps,
        open,
        openIfNeeded,
        close,
        isOpen,
        hasDraft,
        clearDraft,
        getState: () => STATE,
    };
})();
