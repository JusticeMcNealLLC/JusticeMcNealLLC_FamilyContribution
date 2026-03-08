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
    const successMessage = document.getElementById('successMessage');
    const successSubtext = document.getElementById('successSubtext');
    
    const isSuccess = urlParams.get('success') === 'true';
    const isExtraDeposit = urlParams.get('extra_deposit') === 'true';

    if ((isSuccess || isExtraDeposit) && successBanner) {
        successBanner.classList.remove('hidden');

        // Customize message for extra deposit
        if (isExtraDeposit) {
            if (successMessage) successMessage.textContent = 'Extra deposit received!';
            if (successSubtext) successSubtext.textContent = 'Your one-time contribution has been processed. Thank you!';
        }
        
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

    // Check profile completeness & show nudge banner
    await checkProfileCompleteness(user.id);

    // Load subscription data
    const subscription = await loadSubscription(user.id);
    
    // Load total contributed
    await loadTotalContributed(user.id);

    // Load next milestone card (non-blocking)
    loadNextMilestone();

    // Show/hide elements based on subscription status
    updateDashboardUI(subscription);
}

async function checkProfileCompleteness(userId) {
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('first_name, last_name, birthday, profile_picture_url, setup_completed')
            .eq('id', userId)
            .single();

        if (error || !profile) return;

        // If fully completed, don't show banner
        if (profile.setup_completed && profile.first_name && profile.last_name && profile.birthday && profile.profile_picture_url) {
            return;
        }

        // Check if user dismissed banner this session
        if (sessionStorage.getItem('nudgeDismissed')) return;

        // Build missing items list
        const missing = [];
        if (!profile.first_name || !profile.last_name) missing.push('your name');
        if (!profile.birthday) missing.push('your birthday');
        if (!profile.profile_picture_url) missing.push('a profile photo');

        if (missing.length === 0) return;

        // Show the banner
        const banner = document.getElementById('profileNudgeBanner');
        const nudgeText = document.getElementById('nudgeMissingText');
        if (banner) {
            const missingStr = missing.length === 1
                ? missing[0]
                : missing.slice(0, -1).join(', ') + ' and ' + missing[missing.length - 1];
            if (nudgeText) nudgeText.textContent = `Still needed: ${missingStr}.`;
            banner.classList.remove('hidden');
        }

        // Dismiss handler
        const closeBtn = document.getElementById('closeNudgeBanner');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                banner.classList.add('hidden');
                sessionStorage.setItem('nudgeDismissed', '1');
            });
        }
    } catch (err) {
        console.error('Error checking profile completeness:', err);
    }
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
            } else {
                if (nextBillDateEl) nextBillDateEl.textContent = '--';
            }

            // Update status
            const subscriptionStatusEl = document.getElementById('subscriptionStatus');
            const subscriptionStatusTextEl = document.getElementById('subscriptionStatusText');
            const statusDotEl = document.getElementById('statusDot');
            const statusText = getStatusText(subscription.status, subscription.cancel_at_period_end);
            
            if (subscriptionStatusEl) subscriptionStatusEl.textContent = statusText;
            if (subscriptionStatusTextEl) subscriptionStatusTextEl.textContent = statusText;
            
            // Show pulsing dot for active subscriptions
            if (statusDotEl && (subscription.status === 'active' || subscription.status === 'trialing')) {
                statusDotEl.classList.remove('hidden');
            }

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
        // Combined total: Stripe invoices + manual deposits via SECURITY DEFINER function
        const { data: total, error } = await supabaseClient
            .rpc('get_member_total_contributions', { target_member_id: userId });

        if (error) {
            console.error('Error loading total contributions:', error);
            return;
        }

        const totalContributedEl = document.getElementById('totalContributed');
        const historyTotalEl = document.getElementById('historyTotal');
        
        if (totalContributedEl) totalContributedEl.textContent = formatCurrency(total || 0);
        if (historyTotalEl) historyTotalEl.textContent = formatCurrency(total || 0);

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

async function loadNextMilestone() {
    try {
        // Fetch net contributions + latest portfolio snapshot in parallel
        const [netRes, portfolioRes] = await Promise.all([
            supabaseClient.rpc('get_family_net_total'),
            supabaseClient
                .from('investment_snapshots')
                .select('total_value_cents')
                .order('snapshot_date', { ascending: false })
                .limit(1),
        ]);

        const netContributions = netRes.data || 0;
        const portfolioValue   = portfolioRes.data?.[0]?.total_value_cents || 0;
        const totalAssets = netContributions + portfolioValue;

        // Use functions from milestones/config.js (loaded before portal.js)
        const next = getNextTier(totalAssets);
        if (!next) return; // All tiers achieved — could show a celebration instead

        const pct = getProgressToNext(totalAssets);
        const remaining = next.threshold - totalAssets;

        const card     = document.getElementById('nextMilestoneCard');
        const emojiEl  = document.getElementById('nextMilestoneEmoji');
        const nameEl   = document.getElementById('nextMilestoneName');
        const pctEl    = document.getElementById('nextMilestonePct');
        const barEl    = document.getElementById('nextMilestoneBar');
        const remainEl = document.getElementById('nextMilestoneRemaining');

        if (!card) return;

        if (emojiEl)  emojiEl.textContent = next.emoji;
        if (nameEl)   nameEl.textContent  = `Next: ${next.name}`;
        if (pctEl)    pctEl.textContent   = Math.round(pct) + '%';
        if (remainEl) remainEl.textContent = `${formatCurrency(remaining)} to go · ${formatCurrency(next.threshold)} goal`;

        card.classList.remove('hidden');

        // Animate the bar after reveal
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (barEl) barEl.style.width = pct.toFixed(1) + '%';
            });
        });
    } catch (err) {
        console.error('Error loading next milestone:', err);
    }
}
