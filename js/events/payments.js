/* ════════════════════════════════════════════════════════════
   My trip payments — magic-link auth (§13.11 line 445)
   Auth: invite_token (?t=) | guest_token (?g=) | member JWT
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    function escapeHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function queryParams() {
        return new URLSearchParams(window.location.search);
    }

    function getInviteToken() {
        const params = queryParams();
        return (params.get('t') || params.get('token') || '').trim();
    }

    function getGuestToken() {
        const params = queryParams();
        return (params.get('g') || params.get('guest_token') || '').trim();
    }

    function getPartyId() {
        return (queryParams().get('party') || '').trim();
    }

    function getEventSlug() {
        return (queryParams().get('e') || '').trim();
    }

    function formatMoney(cents) {
        if (typeof formatCurrency === 'function') return formatCurrency(cents);
        const n = Number(cents) || 0;
        return '$' + (n / 100).toFixed(n % 100 === 0 ? 0 : 2);
    }

    function methodLabel(method) {
        const m = String(method || '').toLowerCase();
        if (m === 'ach') return 'Bank (ACH)';
        if (m === 'card') return 'Card';
        return method || '—';
    }

    function formatMethodDisplay(plan) {
        const base = methodLabel(plan?.method);
        const last4 = String(plan?.method_last4 || '').replace(/\D/g, '').slice(-4);
        if (!last4) return base;
        const brand = String(plan?.method_brand || '').trim();
        if (String(plan?.method || '').toLowerCase() === 'card' && brand) {
            const nice = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
            return `${nice} ···${last4}`;
        }
        return `${base} ···${last4}`;
    }

    function planKindLabel(kind) {
        const k = String(kind || '').toLowerCase();
        if (k === 'full') return 'Full pay';
        if (k === 'monthly') return 'Monthly';
        return kind || '—';
    }

    function formatDebitAt(iso, planStatus) {
        if (String(planStatus || '') === 'completed') return 'None';
        if (!iso) return '—';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }

    function statusLabel(status) {
        const s = String(status || '');
        if (s === 'past_due') return 'Past due';
        if (s === 'active') return 'Active';
        if (s === 'completed') return 'Paid in full';
        if (s === 'setup') return 'Setting up';
        if (s === 'cancelled') return 'Cancelled';
        return s || '—';
    }

    function showError(msg, opts) {
        const root = document.getElementById('paymentsRoot');
        if (!root) return;
        const signIn = opts?.showSignIn
            ? '<p class="payments-error"><a class="payments-link" href="/pages/login/">Sign in</a> if you RSVP’d as a member.</p>'
            : '';
        root.innerHTML = `
            <div class="payments-error">
                <h1>Payments unavailable</h1>
                <p>${escapeHtml(msg || 'This link is invalid or has expired.')}</p>
                ${signIn}
            </div>`;
    }

    function flashFromQuery(opts) {
        const params = queryParams();
        const needsRetry = !!(opts && (opts.pastDue || opts.hasFailed));
        if (params.get('paid') === 'retry') {
            return { kind: 'ok', text: 'Payment submitted. Status will update shortly.' };
        }
        if (params.get('paid') === 'payoff') {
            return { kind: 'ok', text: 'Balance payoff submitted. Status will update shortly.' };
        }
        if (params.get('updated') === 'pm') {
            return {
                kind: 'ok',
                text: needsRetry
                    ? 'Payment method updated. Tap Retry payment to finish the failed charge.'
                    : 'Payment method updated. Future debits will use the new card or bank.',
            };
        }
        if (params.get('canceled')) {
            return { kind: 'info', text: 'Checkout canceled — nothing was charged.' };
        }
        return null;
    }

    function canonicalizeInviteUrl(inviteToken) {
        if (!inviteToken) return;
        const params = queryParams();
        const next = new URLSearchParams();
        next.set('t', inviteToken);
        ;['paid', 'updated', 'canceled'].forEach((k) => {
            if (params.get(k)) next.set(k, params.get(k));
        });
        const qs = next.toString();
        const url = `${window.location.pathname}?${qs}`;
        if (window.location.search !== `?${qs}`) {
            history.replaceState({}, '', url);
        }
    }

    function render(data, inviteToken) {
        const root = document.getElementById('paymentsRoot');
        if (!root) return;
        const event = data.event || {};
        const plan = data.plan || {};
        const partyId = String(data.party_id || getPartyId() || '').trim();
        const planStatus = String(plan.status || '');
        const remainingCents = Math.max(0, Number(plan.remaining_cents) || 0);
        const pastDue = !!data.past_due || planStatus === 'past_due';
        const hasFailed = !!data.has_failed_installment;
        const canRetry = hasFailed && (planStatus === 'past_due' || planStatus === 'active');
        const canPayoff = remainingCents > 0 && (planStatus === 'active' || planStatus === 'past_due');
        const canUpdatePm = planStatus !== 'completed' && planStatus !== 'cancelled';
        const payoffBtnClass = canRetry ? 'payments-btn--secondary' : 'payments-btn--primary';
        const flash = flashFromQuery({ pastDue, hasFailed });

        let banner = '';
        if (flash) {
            const cls = flash.kind === 'ok' ? 'payments-banner--ok'
                : flash.kind === 'info' ? 'payments-banner--info'
                : 'payments-banner--warn';
            banner += `<div class="payments-banner ${cls}">${escapeHtml(flash.text)}</div>`;
        }
        if (pastDue || hasFailed) {
            banner += `<div class="payments-banner payments-banner--warn">Payment failed — please retry or update your payment method.</div>`;
        }

        const eventHref = event.slug
            ? `/events/?e=${encodeURIComponent(event.slug)}`
            : '/events/';

        root.innerHTML = `
            <div class="payments-card">
                <h1>${escapeHtml(event.title || 'My trip payments')}</h1>
                <p class="payments-sub">My trip payments — manage your plan.</p>
                ${banner}
                <div class="payments-row"><span>Total</span><span>${escapeHtml(formatMoney(plan.total_due_cents))}</span></div>
                <div class="payments-row"><span>Paid</span><span>${escapeHtml(formatMoney(plan.amount_paid_cents))}</span></div>
                <div class="payments-row"><span>Remaining</span><span>${escapeHtml(formatMoney(plan.remaining_cents))}</span></div>
                <div class="payments-row"><span>Next debit</span><span>${escapeHtml(formatDebitAt(plan.next_debit_at, plan.status))}</span></div>
                <div class="payments-row"><span>Plan</span><span>${escapeHtml(planKindLabel(plan.plan_kind))}</span></div>
                <div class="payments-row"><span>Method</span><span>${escapeHtml(formatMethodDisplay(plan))}</span></div>
                <div class="payments-row"><span>Status</span><span>${escapeHtml(statusLabel(plan.status))}</span></div>
                <div class="payments-actions">
                    ${canRetry ? '<button type="button" class="payments-btn payments-btn--primary" id="paymentsRetry">Retry payment</button>' : ''}
                    ${canPayoff ? `<button type="button" class="payments-btn ${payoffBtnClass}" id="paymentsPayoff">Pay off early</button>` : ''}
                    ${canUpdatePm ? '<button type="button" class="payments-btn payments-btn--secondary" id="paymentsUpdatePm">Update payment method</button>' : ''}
                </div>
                ${canUpdatePm ? '<p class="payments-hint">Change card or bank for future debits.</p>' : ''}
                <a class="payments-link" href="${escapeHtml(eventHref)}">← Back to event</a>
            </div>`;

        const retryBtn = document.getElementById('paymentsRetry');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => startRetry(inviteToken, retryBtn));
        }
        const payoffBtn = document.getElementById('paymentsPayoff');
        if (payoffBtn) {
            payoffBtn.addEventListener('click', () => startPayoff(inviteToken, partyId, payoffBtn));
        }
        const updateBtn = document.getElementById('paymentsUpdatePm');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => startUpdatePm(inviteToken, updateBtn));
        }

        if (event.title) {
            document.title = `${event.title} — My trip payments | Justice McNeal LLC`;
        } else {
            document.title = 'My trip payments | Justice McNeal LLC';
        }
    }

    async function startRetry(inviteToken, btn) {
        btn.disabled = true;
        btn.textContent = 'Starting…';
        try {
            const body = inviteToken
                ? { invite_token: inviteToken }
                : { party_id: getPartyId() || undefined, event_slug: getEventSlug() || undefined };
            const call = inviteToken ? callEdgeFunctionPublic : callEdgeFunction;
            const result = await call('retry-event-party-payment', body);
            if (result?.error) throw new Error(result.error);
            if (result?.checkout_url) {
                window.location.href = result.checkout_url;
                return;
            }
            if (result?.status === 'succeeded' || result?.status === 'processing') {
                const t = inviteToken || '';
                window.location.search = t
                    ? `?t=${encodeURIComponent(t)}&paid=retry`
                    : '?paid=retry';
                return;
            }
            throw new Error('Could not start retry');
        } catch (err) {
            alert(err.message || 'Retry failed. Please try again.');
            btn.disabled = false;
            btn.textContent = 'Retry payment';
        }
    }

    async function startUpdatePm(inviteToken, btn) {
        btn.disabled = true;
        btn.textContent = 'Starting…';
        try {
            const body = inviteToken
                ? { invite_token: inviteToken }
                : { party_id: getPartyId() || undefined, event_slug: getEventSlug() || undefined };
            const call = inviteToken ? callEdgeFunctionPublic : callEdgeFunction;
            const result = await call('update-event-party-payment-method', body);
            if (result?.error) throw new Error(result.error);
            if (result?.checkout_url) {
                window.location.href = result.checkout_url;
                return;
            }
            throw new Error('Could not start payment method update');
        } catch (err) {
            alert(err.message || 'Update failed. Please try again.');
            btn.disabled = false;
            btn.textContent = 'Update payment method';
        }
    }

    async function startPayoff(inviteToken, partyId, btn) {
        btn.disabled = true;
        btn.textContent = 'Starting…';
        try {
            const body = inviteToken
                ? { invite_token: inviteToken }
                : { party_id: partyId || getPartyId() || undefined };
            const call = inviteToken ? callEdgeFunctionPublic : callEdgeFunction;
            const result = await call('request-event-party-payoff', body);
            if (result?.error) throw new Error(result.error);
            if (result?.checkout_url) {
                window.location.href = result.checkout_url;
                return;
            }
            if (result?.status === 'succeeded' || result?.status === 'processing') {
                const t = inviteToken || '';
                const p = partyId || getPartyId() || '';
                if (t) {
                    window.location.search = `?t=${encodeURIComponent(t)}&paid=payoff`;
                } else if (p) {
                    window.location.search = `?party=${encodeURIComponent(p)}&paid=payoff`;
                } else {
                    window.location.search = '?paid=payoff';
                }
                return;
            }
            throw new Error('Could not start payoff');
        } catch (err) {
            alert(err.message || 'Payoff failed. Please try again.');
            btn.disabled = false;
            btn.textContent = 'Pay off early';
        }
    }

    async function loadPayments() {
        const inviteToken = getInviteToken();
        const guestToken = getGuestToken();
        const partyId = getPartyId();
        const eventSlug = getEventSlug();

        if (inviteToken) {
            return callEdgeFunctionPublic('get-event-party-payments', {
                invite_token: inviteToken,
            });
        }
        if (guestToken) {
            return callEdgeFunctionPublic('get-event-party-payments', {
                guest_token: guestToken,
            });
        }

        // Member JWT path
        if (typeof callEdgeFunction !== 'function' || typeof supabaseClient === 'undefined') {
            throw new Error('MISSING_AUTH');
        }
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) throw new Error('MISSING_AUTH');

        const body = {};
        if (partyId) body.party_id = partyId;
        if (eventSlug) body.event_slug = eventSlug;
        return callEdgeFunction('get-event-party-payments', body);
    }

    async function init() {
        try {
            const data = await loadPayments();
            if (data?.error) throw new Error(data.error);
            const inviteToken = String(data.invite_token || getInviteToken() || '').trim();
            if (getGuestToken() && inviteToken) {
                canonicalizeInviteUrl(inviteToken);
            }
            render(data, inviteToken);
        } catch (err) {
            const msg = err.message || '';
            if (msg === 'MISSING_AUTH' || msg.includes('Not authenticated') || msg.includes('Not signed in')) {
                showError(
                    'Open your payment link from SMS, or sign in if you RSVP’d as a member.',
                    { showSignIn: true },
                );
                return;
            }
            if (msg.includes('party_id or event_id required')) {
                showError('You have more than one trip payment plan. Open the link from your SMS, or add ?party=… / ?e=… to the URL.');
                return;
            }
            showError(msg);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
