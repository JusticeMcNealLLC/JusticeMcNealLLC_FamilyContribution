import { setGreeting } from './ui/greeting.js';
import { bindActivityCarousel } from './ui/activityCarousel.js';
import { bindSuccessBanner } from './ui/successBanner.js';
import { loadDashboard } from './loaders/dashboard.js';

async function init() {
    setGreeting();
    bindSuccessBanner();
    bindActivityCarousel();

    const user = await checkAuth();
    if (!user) return;

    await loadDashboard(user);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
