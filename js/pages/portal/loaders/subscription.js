import { formatBillingDate, daysUntilBillingDate } from '../utils/billingDate.js';
import { getStatusText } from '../utils/subscriptionStatus.js';
import { openBillingPortal } from '../utils/billingPortal.js';

async function refreshSubscriptionFromStripe() {
    try {
        return await callEdgeFunction('refresh-my-subscription');
    } catch (err) {
        console.warn('Could not refresh subscription from Stripe:', err.message);
        return null;
    }
}

function updateDaysLeftBadge(periodEnd) {
    const badge = document.getElementById('daysLeftBadge');
    const textEl = document.getElementById('daysLeftText');
    if (!badge) return;

    const days = daysUntilBillingDate(periodEnd);
    if (days == null) {
        badge.classList.add('hidden');
        return;
    }

    if (days < 0) {
        badge.classList.add('hidden');
        return;
    }

    let text;
    if (days === 0) text = 'Due today';
    else if (days === 1) text = '1 day left';
    else text = `${days} days left`;

    if (textEl) textEl.textContent = text;
    else badge.textContent = text;

    badge.classList.remove('hidden');
}

function applySubscriptionToDom(subscription) {
    if (!subscription) return;

    const currentAmountEl = document.getElementById('currentAmount');
    const currentAmountDisplayEl = document.getElementById('currentAmountDisplay');
    const currentContributionEl = document.getElementById('currentContribution');

    if (currentAmountEl) {
        currentAmountEl.textContent = formatCurrency(subscription.current_amount_cents);
    }
    if (currentAmountDisplayEl) {
        currentAmountDisplayEl.textContent = `${formatCurrency(subscription.current_amount_cents)}/month`;
    }
    if (currentContributionEl) {
        currentContributionEl.textContent = `${formatCurrency(subscription.current_amount_cents)}/month`;
    }

    const nextBillDateEl = document.getElementById('nextBillDate');
    const nextBillDateDisplayEl = document.getElementById('nextBillDateDisplay');
    const renewalDateEl = document.getElementById('renewalDate');
    const formattedDate = formatBillingDate(subscription.current_period_end);

    if (formattedDate) {
        if (nextBillDateEl) nextBillDateEl.textContent = formattedDate;
        if (nextBillDateDisplayEl) nextBillDateDisplayEl.textContent = formattedDate;
        if (renewalDateEl) renewalDateEl.textContent = formattedDate;
        updateDaysLeftBadge(subscription.current_period_end);
    } else {
        if (nextBillDateEl) nextBillDateEl.textContent = '--';
        if (renewalDateEl) renewalDateEl.textContent = '--';
        updateDaysLeftBadge(null);
    }

    const subscriptionStatusEl = document.getElementById('subscriptionStatus');
    const subscriptionStatusTextEl = document.getElementById('subscriptionStatusText');
    const statusDotEl = document.getElementById('statusDot');
    const statusText = getStatusText(subscription.status, subscription.cancel_at_period_end);

    if (subscriptionStatusEl) subscriptionStatusEl.textContent = statusText;
    if (subscriptionStatusTextEl) subscriptionStatusTextEl.textContent = statusText;

    if (statusDotEl && (subscription.status === 'active' || subscription.status === 'trialing')) {
        statusDotEl.classList.remove('hidden');
    }

    if (subscription.status === 'past_due') {
        const pastDueBanner = document.getElementById('pastDueBanner');
        if (pastDueBanner) {
            pastDueBanner.classList.remove('hidden');

            const updatePaymentLink = document.getElementById('updatePaymentLink');
            if (updatePaymentLink && !updatePaymentLink.dataset.bound) {
                updatePaymentLink.dataset.bound = '1';
                updatePaymentLink.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await openBillingPortal();
                });
            }
        }
    }
}

export async function loadSubscription(userId) {
    try {
        const { data: initial, error } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error loading subscription:', error);
            return null;
        }

        if (!initial) return null;

        let subscription = initial;

        if (!subscription.current_period_end && subscription.stripe_subscription_id) {
            const refreshed = await refreshSubscriptionFromStripe();
            if (refreshed?.current_period_end) {
                subscription = { ...subscription, ...refreshed };
            }
        }

        applySubscriptionToDom(subscription);
        return subscription;
    } catch (error) {
        console.error('Error loading subscription:', error);
        return null;
    }
}
