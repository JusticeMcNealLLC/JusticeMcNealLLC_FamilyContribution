export function updateSubscriptionUi(subscription) {
    const noSubscriptionEl = document.getElementById('noSubscription');
    const currentInfoEl = document.getElementById('currentInfo');
    const contributionFormEl = document.getElementById('contributionForm');
    const firstTimeSetupEl = document.getElementById('firstTimeSetup');

    if (!subscription || subscription.status === 'canceled') {
        if (noSubscriptionEl) noSubscriptionEl.classList.remove('hidden');
        if (currentInfoEl) currentInfoEl.classList.add('hidden');
        if (contributionFormEl) contributionFormEl.classList.add('hidden');
        if (firstTimeSetupEl) firstTimeSetupEl.classList.remove('hidden');
        return;
    }

    if (noSubscriptionEl) noSubscriptionEl.classList.add('hidden');
    if (currentInfoEl) currentInfoEl.classList.remove('hidden');
    if (contributionFormEl) contributionFormEl.classList.remove('hidden');
    if (firstTimeSetupEl) firstTimeSetupEl.classList.add('hidden');
}
