// Contribution page functionality

document.addEventListener('DOMContentLoaded', async function() {
    const user = await checkAuth();
    if (!user) return;

    const subscription = await loadSubscription(user.id);
    setupContributionForms(subscription);
});

async function loadSubscription(userId) {
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

        if (!initial) {
            updateContributionUi(null);
            return null;
        }

        let subscription = initial;

        if (!subscription.current_period_end && subscription.stripe_subscription_id) {
            try {
                const refreshed = await callEdgeFunction('refresh-my-subscription');
                if (refreshed?.current_period_end) {
                    subscription = { ...subscription, ...refreshed };
                }
            } catch (err) {
                console.warn('Could not refresh subscription from Stripe:', err.message);
            }
        }

        const currentAmountDisplayEl = document.getElementById('currentAmountDisplay');
        const nextBillDateDisplayEl = document.getElementById('nextBillDateDisplay');

        if (currentAmountDisplayEl) {
            currentAmountDisplayEl.textContent = `${formatCurrency(subscription.current_amount_cents)}/month`;
        }
        if (nextBillDateDisplayEl) {
            nextBillDateDisplayEl.textContent = subscription.current_period_end
                ? formatDate(subscription.current_period_end)
                : '--';
        }

        updateContributionUi(subscription);
        return subscription;
    } catch (error) {
        console.error('Error loading subscription:', error);
        return null;
    }
}

function updateContributionUi(subscription) {
    const currentInfoEl = document.getElementById('currentInfo');
    const contributionFormEl = document.getElementById('contributionForm');
    const firstTimeSetupEl = document.getElementById('firstTimeSetup');

    if (!subscription || subscription.status === 'canceled') {
        if (currentInfoEl) currentInfoEl.classList.add('hidden');
        if (contributionFormEl) contributionFormEl.classList.add('hidden');
        if (firstTimeSetupEl) firstTimeSetupEl.classList.remove('hidden');
        return;
    }

    if (currentInfoEl) currentInfoEl.classList.remove('hidden');
    if (contributionFormEl) contributionFormEl.classList.remove('hidden');
    if (firstTimeSetupEl) firstTimeSetupEl.classList.add('hidden');
}

function setupContributionForms(subscription) {
    const contributionForm = document.getElementById('contributionForm');
    const setupForm = document.getElementById('setupForm');
    const newAmountInput = document.getElementById('newAmount');

    // Handle amount change (existing subscription)
    if (contributionForm) {
        contributionForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleAmountChange();
        });
    }

    // Handle first-time setup
    if (setupForm) {
        setupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleFirstTimeSetup();
        });
    }

    // Show preview when amount changes
    if (newAmountInput) {
        newAmountInput.addEventListener('input', function() {
            updatePreview(this.value, subscription);
        });
    }
}

function updatePreview(amount, subscription) {
    const previewEl = document.getElementById('confirmationPreview');
    const previewAmountEl = document.getElementById('previewAmount');
    const previewDateEl = document.getElementById('previewDate');

    const amountNum = parseInt(amount, 10);

    if (amountNum >= APP_CONFIG.MIN_AMOUNT && amountNum <= APP_CONFIG.MAX_AMOUNT) {
        if (previewAmountEl) previewAmountEl.textContent = `$${amountNum}`;
        
        if (previewDateEl && subscription?.current_period_end) {
            previewDateEl.textContent = formatDate(subscription.current_period_end);
        }
        
        if (previewEl) previewEl.classList.remove('hidden');
    } else {
        if (previewEl) previewEl.classList.add('hidden');
    }
}

async function handleAmountChange() {
    const newAmountInput = document.getElementById('newAmount');
    const saveBtn = document.getElementById('saveBtn');
    const amount = parseInt(newAmountInput.value, 10);

    // Validate
    hideError('formError');

    if (isNaN(amount) || amount < APP_CONFIG.MIN_AMOUNT || amount > APP_CONFIG.MAX_AMOUNT) {
        showError('formError', `Amount must be between $${APP_CONFIG.MIN_AMOUNT} and $${APP_CONFIG.MAX_AMOUNT}`);
        return;
    }

    if (amount !== Math.floor(amount)) {
        showError('formError', 'Please enter a whole dollar amount (no cents)');
        return;
    }

    setButtonLoading(saveBtn, true, 'Save Changes');

    try {
        await callEdgeFunction('update-subscription', {
            amount_dollars: amount,
        });

        // Show success and redirect
        alert('Your contribution has been updated! The new amount will take effect on your next billing date.');
        window.location.href = 'index.html';

    } catch (error) {
        // If the stored subscription is incomplete_expired/canceled, route to a fresh checkout
        if (error.code === 'subscription_needs_new_checkout') {
            try {
                const result = await callEdgeFunction('create-checkout-session', { amount_dollars: amount });
                if (result.url) { window.location.href = result.url; return; }
            } catch (checkoutErr) {
                showError('formError', checkoutErr.message || 'Failed to start a new checkout');
                setButtonLoading(saveBtn, false, 'Save Changes');
                return;
            }
        }
        showError('formError', error.message || 'Failed to update contribution');
        setButtonLoading(saveBtn, false, 'Save Changes');
    }
}

async function handleFirstTimeSetup() {
    const setupAmountInput = document.getElementById('setupAmount');
    const setupBtn = document.getElementById('setupBtn');
    const amount = parseInt(setupAmountInput.value, 10);

    // Validate
    hideError('setupError');

    if (isNaN(amount) || amount < APP_CONFIG.MIN_AMOUNT || amount > APP_CONFIG.MAX_AMOUNT) {
        showError('setupError', `Amount must be between $${APP_CONFIG.MIN_AMOUNT} and $${APP_CONFIG.MAX_AMOUNT}`);
        return;
    }

    if (amount !== Math.floor(amount)) {
        showError('setupError', 'Please enter a whole dollar amount (no cents)');
        return;
    }

    setButtonLoading(setupBtn, true, 'Start Subscription');

    try {
        const result = await callEdgeFunction('create-checkout-session', {
            amount_dollars: amount,
        });

        if (result.url) {
            // Redirect to Stripe Checkout
            window.location.href = result.url;
        } else {
            throw new Error('No checkout URL received');
        }

    } catch (error) {
        showError('setupError', error.message || 'Failed to start subscription');
        setButtonLoading(setupBtn, false, 'Start Subscription');
    }
}
