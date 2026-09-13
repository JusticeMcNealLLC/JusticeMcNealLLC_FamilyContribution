/* ════════════════════════════════════════════════════════════
   Events — Payment choice helper (plan + method UI for RSVP)
   Surface: window.EventsPaymentChoice
   ACH collect: create-event-checkout uses us_bank_account + Customer (§13.10).
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const PLATFORM_CARD_FEE_BPS = 290;
    const PLAN_KINDS = ['full', 'monthly'];
    const METHODS = ['ach', 'card'];

    function escapeHtml(str) {
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
        const n = Number(cents) || 0;
        return `$${(n / 100).toFixed(2)}`;
    }

    function monthsUntilFundDeadline(deadlineStr) {
        if (!deadlineStr) return null;
        const deadline = new Date(deadlineStr);
        if (Number.isNaN(deadline.getTime())) return null;
        const now = new Date();
        if (deadline <= now) return 0;
        let months = (deadline.getFullYear() - now.getFullYear()) * 12
            + (deadline.getMonth() - now.getMonth());
        if (deadline.getDate() >= now.getDate()) months += 1;
        return Math.max(1, months);
    }

    function needsChoice(event, seatPriceCents) {
        if (!event || event.pricing_mode !== 'paid') return false;
        return (Number(seatPriceCents) || 0) > 0;
    }

    function cardFeeBps(event) {
        const raw = event?.card_fee_bps;
        if (raw != null && Number.isFinite(Number(raw)) && Number(raw) >= 0) {
            return Number(raw);
        }
        return PLATFORM_CARD_FEE_BPS;
    }

    function baseTotalCents(seatPriceCents) {
        return Math.max(0, Number(seatPriceCents) || 0);
    }

    function cardTotalCents(baseCents, feeBps) {
        const base = Math.max(0, Number(baseCents) || 0);
        const bps = Math.max(0, Number(feeBps) || 0);
        if (base <= 0) return 0;
        if (bps <= 0) return base;
        return Math.ceil((base * 10000) / (10000 - bps));
    }

    function monthlyAmountCents(totalCents, fundDeadline) {
        const total = Math.max(0, Number(totalCents) || 0);
        const months = monthsUntilFundDeadline(fundDeadline);
        if (!months || months <= 0 || total <= 0) return null;
        return Math.ceil(total / months);
    }

    function enabledPlanKinds(event) {
        const kinds = ['full'];
        const months = monthsUntilFundDeadline(event?.fund_deadline);
        if (event?.fund_deadline && months && months > 0) kinds.push('monthly');
        return kinds;
    }

    function enabledMethods(event) {
        const methods = [];
        if (event?.ach_payments_enabled !== false) methods.push('ach');
        if (event?.card_payments_enabled !== false) methods.push('card');
        if (!methods.length) methods.push('card');
        return methods;
    }

    function defaultPlanKind(event) {
        const kinds = enabledPlanKinds(event);
        if (kinds.includes('monthly')) return 'monthly';
        return 'full';
    }

    function defaultMethod(event) {
        const methods = enabledMethods(event);
        if (methods.includes('ach')) return 'ach';
        return methods[0] || 'card';
    }

    function quote(event, opts) {
        const seatPriceCents = baseTotalCents(opts?.seatPriceCents);
        const planKind = opts?.planKind || defaultPlanKind(event);
        const method = opts?.method || defaultMethod(event);
        const feeBps = cardFeeBps(event);
        const baseCents = seatPriceCents;
        const achTotal = baseCents;
        const cardTotal = cardTotalCents(baseCents, feeBps);
        const totalCents = method === 'card' ? cardTotal : achTotal;
        const feeCents = method === 'card' ? Math.max(0, cardTotal - baseCents) : 0;
        const monthlyAch = monthlyAmountCents(achTotal, event?.fund_deadline);
        const monthlyCard = monthlyAmountCents(cardTotal, event?.fund_deadline);
        const monthlyCents = planKind === 'monthly'
            ? (method === 'card' ? monthlyCard : monthlyAch)
            : null;

        let deadlineLabel = '';
        if (event?.fund_deadline) {
            const d = new Date(event.fund_deadline);
            if (!Number.isNaN(d.getTime())) {
                deadlineLabel = d.toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                });
            }
        }

        return {
            planKind,
            method,
            baseCents,
            feeCents,
            feeBps,
            achTotalCents: achTotal,
            cardTotalCents: cardTotal,
            totalCents,
            monthlyAchCents: monthlyAch,
            monthlyCardCents: monthlyCard,
            monthlyCents,
            deadlineLabel,
            achLabel: formatMoney(achTotal),
            cardLabel: formatMoney(cardTotal),
            monthlyAchLabel: monthlyAch != null ? formatMoney(monthlyAch) : '',
            monthlyCardLabel: monthlyCard != null ? formatMoney(monthlyCard) : '',
        };
    }

    function planOptionLabel(event, planKind, q) {
        if (planKind === 'monthly' && q.deadlineLabel && q.monthlyAchLabel) {
            return `Pay monthly until ${q.deadlineLabel} (~${q.monthlyAchLabel}/mo)`;
        }
        return 'Pay in full';
    }

    function methodOptionLabel(method, q, planKind) {
        if (method === 'ach') {
            if (planKind === 'monthly' && q.monthlyAchCents != null) {
                return `Bank account (ACH): ${q.monthlyAchLabel}/mo`;
            }
            return `Bank account (ACH): ${q.achLabel}`;
        }
        if (planKind === 'monthly' && q.monthlyCardCents != null) {
            return `Card: ${q.monthlyCardLabel}/mo (includes processing fee)`;
        }
        return `Card: ${q.cardLabel} (includes processing fee)`;
    }

    function formFieldsHtml(event, opts) {
        const seatPriceCents = baseTotalCents(opts?.seatPriceCents);
        if (!needsChoice(event, seatPriceCents)) return '';

        const prefix = (opts && opts.idPrefix) || 'paymentChoice';
        const planKinds = enabledPlanKinds(event);
        const methods = enabledMethods(event);
        const choice = opts?.choice || {};
        const defaultPlan = (choice.plan_kind || opts?.planKind || defaultPlanKind(event));
        const defaultMeth = (choice.method || opts?.method || defaultMethod(event));
        const selectedPlan = planKinds.includes(defaultPlan) ? defaultPlan : defaultPlanKind(event);
        const selectedMeth = methods.includes(defaultMeth) ? defaultMeth : defaultMethod(event);
        const q = quote(event, { seatPriceCents, planKind: selectedPlan, method: selectedMeth });

        const planName = `${prefix}-plan`;
        const methodName = `${prefix}-method`;

        const planFields = planKinds.map((kind) => {
            const checked = kind === selectedPlan ? ' checked' : '';
            const label = planOptionLabel(event, kind, quote(event, { seatPriceCents, planKind: kind, method: 'ach' }));
            return `
                <label class="ed-payment-opt">
                    <input type="radio" name="${escapeHtml(planName)}" value="${kind}" data-payment-plan="${kind}"${checked} required>
                    <span class="ed-payment-opt-text">${escapeHtml(label)}</span>
                </label>`;
        }).join('');

        const methodFields = methods.map((meth) => {
            const checked = meth === selectedMeth ? ' checked' : '';
            const label = methodOptionLabel(meth, q, selectedPlan);
            return `
                <label class="ed-payment-opt">
                    <input type="radio" name="${escapeHtml(methodName)}" value="${meth}" data-payment-method="${meth}"${checked} required>
                    <span class="ed-payment-opt-text ed-payment-method-label" data-method="${meth}">${escapeHtml(label)}</span>
                </label>`;
        }).join('');

        return `
            <div class="ed-payment-choice" data-payment-choice-root="${escapeHtml(prefix)}" data-seat-price="${seatPriceCents}">
                <p class="ed-payment-heading">Payment <span class="text-red-500">*</span></p>
                <p class="ed-hint ed-payment-sub">Choose how you want to pay. Bank (ACH) is preferred; card totals include processing fees.</p>
                ${planKinds.length > 1 ? `
                    <fieldset class="ed-payment-fieldset">
                        <legend class="ed-payment-legend">Payment schedule</legend>
                        ${planFields}
                    </fieldset>` : `<input type="hidden" data-payment-plan="${selectedPlan}" value="${selectedPlan}">`}
                ${methods.length > 1 ? `
                    <fieldset class="ed-payment-fieldset">
                        <legend class="ed-payment-legend">Payment method</legend>
                        ${methodFields}
                    </fieldset>` : `<input type="hidden" data-payment-method="${selectedMeth}" value="${selectedMeth}">`}
            </div>`;
    }

    function readFromRoot(root) {
        const scope = root || document;
        const planEl = scope.querySelector('[data-payment-plan]:checked')
            || scope.querySelector('[data-payment-plan][type="hidden"]');
        const methodEl = scope.querySelector('[data-payment-method]:checked')
            || scope.querySelector('[data-payment-method][type="hidden"]');
        return {
            plan_kind: planEl ? String(planEl.getAttribute('data-payment-plan') || planEl.value || '').trim() : '',
            method: methodEl ? String(methodEl.getAttribute('data-payment-method') || methodEl.value || '').trim() : '',
        };
    }

    function validateChoice(event, choice, seatPriceCents) {
        if (!needsChoice(event, seatPriceCents)) return null;
        const planKind = String(choice?.plan_kind || '').trim();
        const method = String(choice?.method || '').trim();
        const plans = enabledPlanKinds(event);
        const methods = enabledMethods(event);

        if (!planKind || !plans.includes(planKind)) {
            return 'Please choose a payment schedule (pay in full or monthly).';
        }
        if (!method || !methods.includes(method)) {
            return 'Please choose a payment method (bank or card).';
        }
        return null;
    }

    function scrollToField(root) {
        const scope = root || document;
        const wrap = scope.querySelector('.ed-payment-choice') || scope.querySelector('[data-payment-choice-root]');
        const prep = scope.querySelector('.ed-rsvp-prep');
        const target = wrap || prep;
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const first = target.querySelector('[data-payment-plan], [data-payment-method]');
            if (first && typeof first.focus === 'function') first.focus();
        }
    }

    function updateMethodLabels(root, event, seatPriceCents) {
        const scope = root || document;
        const wrap = scope.querySelector('.ed-payment-choice');
        if (!wrap) return;
        const choice = readFromRoot(scope);
        const planKind = choice.plan_kind || defaultPlanKind(event);
        const q = quote(event, { seatPriceCents, planKind, method: 'ach' });
        scope.querySelectorAll('.ed-payment-method-label').forEach((el) => {
            const meth = el.getAttribute('data-method');
            if (!meth) return;
            el.textContent = methodOptionLabel(meth, q, planKind);
        });
    }

    /** Fee-aware total for CTA / confirm: card → fee-inclusive; ACH → base; monthly → first/mo amount. */
    function displayTotalCents(event, choice, baseCents) {
        const base = baseTotalCents(baseCents);
        if (!needsChoice(event, base)) return base;
        const q = quote(event, {
            seatPriceCents: base,
            planKind: choice?.plan_kind || choice?.planKind || defaultPlanKind(event),
            method: choice?.method || defaultMethod(event),
        });
        if (q.planKind === 'monthly' && q.monthlyCents != null) return q.monthlyCents;
        return q.totalCents;
    }

    function payButtonAmountLabel(event, choice, baseCents) {
        const cents = displayTotalCents(event, choice, baseCents);
        if (cents <= 0) return '';
        const planKind = choice?.plan_kind || choice?.planKind || defaultPlanKind(event);
        const money = formatMoney(cents);
        return planKind === 'monthly' ? `~${money}/mo` : money;
    }

    function wireForm(root, event, getSeatPriceCents, onChange) {
        const scope = root || document;
        const wrap = scope.querySelector('.ed-payment-choice');
        if (!wrap || wrap.dataset.paymentWired === '1') return;
        wrap.dataset.paymentWired = '1';

        const refresh = () => {
            const price = typeof getSeatPriceCents === 'function'
                ? getSeatPriceCents()
                : Number(wrap.getAttribute('data-seat-price') || 0);
            wrap.setAttribute('data-seat-price', String(price));
            updateMethodLabels(scope, event, price);
            if (typeof onChange === 'function') onChange(readFromRoot(scope), price);
        };

        scope.querySelectorAll('[data-payment-plan], [data-payment-method]').forEach((el) => {
            el.addEventListener('change', refresh);
        });
        refresh();
    }

    function refreshWrap(wrapEl, event, seatPriceCents, idPrefix, onChange) {
        if (!wrapEl || !event) return;
        const parent = wrapEl.parentElement;
        if (!parent) return;
        const html = formFieldsHtml(event, { seatPriceCents, idPrefix });
        if (!html) {
            wrapEl.innerHTML = '';
            return;
        }
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const next = tmp.firstElementChild;
        if (next) {
            wrapEl.replaceWith(next);
            wireForm(parent, event, () => seatPriceCents, onChange);
        }
    }

    function wireSeatRoleChange(root, event, opts) {
        if (!root || !event || typeof opts?.onRoleChange !== 'function') return;
        const original = opts.onRoleChange;
        opts.onRoleChange = (role) => {
            original(role);
            const wrapId = opts.wrapId;
            const idPrefix = opts.idPrefix || 'paymentChoice';
            const wrap = wrapId ? document.getElementById(wrapId) : root.querySelector('[data-payment-choice-root]');
            if (!wrap || !window.EventsHelpers) return;
            const seatPrice = window.EventsHelpers.seatPriceCents(event, role);
            if (wrap.id) {
                const container = document.getElementById(wrapId);
                if (container && needsChoice(event, seatPrice)) {
                    container.innerHTML = formFieldsHtml(event, { seatPriceCents: seatPrice, idPrefix });
                    wireForm(root, event, () => window.EventsHelpers.seatPriceCents(event, role), opts.onPaymentChange);
                } else if (container) {
                    container.innerHTML = '';
                }
            }
        };
    }

    function confirmMessage(event, choice, seatPriceCents) {
        const q = quote(event, {
            seatPriceCents,
            planKind: choice?.plan_kind || defaultPlanKind(event),
            method: choice?.method || defaultMethod(event),
        });
        const methodLabel = q.method === 'card' ? 'card' : 'bank (ACH)';
        const amountLabel = q.planKind === 'monthly' && q.monthlyCents != null
            ? `~${formatMoney(q.monthlyCents)}/month`
            : formatMoney(q.totalCents);
        return `RSVP payment: ${amountLabel} via ${methodLabel}.\n\nProceed to checkout?`;
    }

    const api = {
        PLATFORM_CARD_FEE_BPS,
        needsChoice,
        enabledPlanKinds,
        enabledMethods,
        cardFeeBps,
        baseTotalCents,
        cardTotalCents,
        monthlyAmountCents,
        monthsUntilFundDeadline,
        quote,
        displayTotalCents,
        payButtonAmountLabel,
        formFieldsHtml,
        readFromRoot,
        validateChoice,
        scrollToField,
        wireForm,
        refreshWrap,
        wireSeatRoleChange,
        confirmMessage,
        defaultPlanKind,
        defaultMethod,
    };

    globalThis.EventsPaymentChoice = api;
})();
