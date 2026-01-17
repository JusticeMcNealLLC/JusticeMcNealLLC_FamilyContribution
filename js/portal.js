// Portal dashboard functionality

document.addEventListener('DOMContentLoaded', async function() {
    // Check for success parameter
    checkForSuccess();
    
    // Check authentication
    const user = await checkAuth();
    if (!user) return;

    // Load dashboard data
    await loadDashboard(user);
});

function checkForSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const successBanner = document.getElementById('successBanner');
    const closeBtn = document.getElementById('closeSuccessBanner');
    
    if (urlParams.get('success') === 'true' && successBanner) {
        successBanner.classList.remove('hidden');
        
        // Remove the parameter from URL without refresh
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            successBanner.classList.add('hidden');
        });
    }
}

async function loadDashboard(user) {
    // Display user email
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) {
        userEmailEl.textContent = user.email;
    }

    // Load subscription data
    const subscription = await loadSubscription(user.id);
    
    // Load total contributed
    await loadTotalContributed(user.id);

    // Show/hide elements based on subscription status
    updateDashboardUI(subscription);
}

async function loadSubscription(userId) {
    try {
        const { data: subscription, error } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle(); // Use maybeSingle() to handle no rows gracefully

        if (error) {
            console.error('Error loading subscription:', error);
            return null;
        }

        if (subscription) {
            // Update current amount
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

            // Update next bill date
            const nextBillDateEl = document.getElementById('nextBillDate');
            const nextBillDateDisplayEl = document.getElementById('nextBillDateDisplay');
            
            if (subscription.current_period_end) {
                const formattedDate = formatDate(subscription.current_period_end);
                if (nextBillDateEl) nextBillDateEl.textContent = formattedDate;
                if (nextBillDateDisplayEl) nextBillDateDisplayEl.textContent = formattedDate;
            }

            // Update status
            const subscriptionStatusEl = document.getElementById('subscriptionStatus');
            const subscriptionStatusTextEl = document.getElementById('subscriptionStatusText');
            const statusText = getStatusText(subscription.status, subscription.cancel_at_period_end);
            
            if (subscriptionStatusEl) subscriptionStatusEl.textContent = statusText;
            if (subscriptionStatusTextEl) subscriptionStatusTextEl.textContent = statusText;

            // Show past due banner if needed
            if (subscription.status === 'past_due') {
                const pastDueBanner = document.getElementById('pastDueBanner');
                if (pastDueBanner) {
                    pastDueBanner.classList.remove('hidden');
                    
                    // Set up update payment link
                    const updatePaymentLink = document.getElementById('updatePaymentLink');
                    if (updatePaymentLink) {
                        updatePaymentLink.addEventListener('click', async (e) => {
                            e.preventDefault();
                            await openBillingPortal();
                        });
                    }
                }
            }
        }

        return subscription;

    } catch (error) {
        console.error('Error loading subscription:', error);
        return null;
    }
}

async function loadTotalContributed(userId) {
    try {
        const { data: invoices, error } = await supabaseClient
            .from('invoices')
            .select('amount_paid_cents')
            .eq('user_id', userId)
            .eq('status', 'paid');

        if (error) {
            console.error('Error loading invoices:', error);
            return;
        }

        const total = invoices.reduce((sum, inv) => sum + (inv.amount_paid_cents || 0), 0);
        
        const totalContributedEl = document.getElementById('totalContributed');
        const historyTotalEl = document.getElementById('historyTotal');
        
        if (totalContributedEl) totalContributedEl.textContent = formatCurrency(total);
        if (historyTotalEl) historyTotalEl.textContent = formatCurrency(total);

    } catch (error) {
        console.error('Error calculating total:', error);
    }
}

function updateDashboardUI(subscription) {
    const noSubscriptionEl = document.getElementById('noSubscription');
    const currentInfoEl = document.getElementById('currentInfo');
    const contributionFormEl = document.getElementById('contributionForm');
    const firstTimeSetupEl = document.getElementById('firstTimeSetup');

    if (!subscription || subscription.status === 'canceled') {
        // No active subscription
        if (noSubscriptionEl) noSubscriptionEl.classList.remove('hidden');
        if (currentInfoEl) currentInfoEl.classList.add('hidden');
        if (contributionFormEl) contributionFormEl.classList.add('hidden');
        if (firstTimeSetupEl) firstTimeSetupEl.classList.remove('hidden');
    } else {
        // Has subscription
        if (noSubscriptionEl) noSubscriptionEl.classList.add('hidden');
        if (currentInfoEl) currentInfoEl.classList.remove('hidden');
        if (contributionFormEl) contributionFormEl.classList.remove('hidden');
        if (firstTimeSetupEl) firstTimeSetupEl.classList.add('hidden');
    }
}

function getStatusText(status, cancelAtPeriodEnd) {
    if (cancelAtPeriodEnd) {
        return 'Canceling at period end';
    }
    
    switch (status) {
        case 'active':
            return 'Active';
        case 'past_due':
            return 'Past Due';
        case 'canceled':
            return 'Canceled';
        case 'trialing':
            return 'Trial';
        default:
            return status || '--';
    }
}

async function openBillingPortal() {
    try {
        const result = await callEdgeFunction('create-billing-portal');
        
        if (result.url) {
            window.location.href = result.url;
        }
    } catch (error) {
        console.error('Error opening billing portal:', error);
        alert('Failed to open billing portal. Please try again.');
    }
}
