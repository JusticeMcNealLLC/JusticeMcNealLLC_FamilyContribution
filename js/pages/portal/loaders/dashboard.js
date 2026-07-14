import { loadProfileHeader } from './profileHeader.js';
import { loadSubscription } from './subscription.js';
import { loadTotalContributed } from './totalContributed.js';
import { loadNextMilestone } from './nextMilestone.js';
import { loadCPStatus } from './cpStatus.js';
import { bindProfileNudge } from '../ui/profileNudge.js';
import { updateSubscriptionUi } from '../ui/subscriptionUi.js';

export async function loadDashboard(user) {
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) {
        userEmailEl.textContent = user.email;
    }

    await loadProfileHeader(user.id);
    await bindProfileNudge(user.id);

    const subscription = await loadSubscription(user.id);
    await loadTotalContributed(user.id);

    loadNextMilestone();
    loadCPStatus(user.id);

    updateSubscriptionUi(subscription);
}
