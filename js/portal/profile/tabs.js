// ═══════════════════════════════════════════════════════════
// Profile – Tabs (Posts / Feed / Milestones)
// ═══════════════════════════════════════════════════════════

window.ProfileApp = window.ProfileApp || {};

window.ProfileApp.setupTabs = function setupTabs() {
    const tabs = document.querySelectorAll('.profile-tab');
    const tabContents = {
        posts: document.getElementById('tabPosts'),
        feed: document.getElementById('tabFeed'),
        milestones: document.getElementById('tabMilestones'),
    };

    let loadedTabs = { posts: true };

    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            // Deactivate all
            tabs.forEach(t => {
                t.classList.remove('active');
                t.classList.remove('text-gray-900', 'border-gray-900');
                t.classList.add('text-gray-400', 'border-transparent');
            });
            // Activate clicked
            tab.classList.add('active');
            tab.classList.remove('text-gray-400', 'border-transparent');
            tab.classList.add('text-gray-900', 'border-gray-900');

            // Show content
            Object.values(tabContents).forEach(c => c?.classList.add('hidden'));
            const target = tab.dataset.tab;
            tabContents[target]?.classList.remove('hidden');

            // Lazy load
            if (!loadedTabs[target]) {
                loadedTabs[target] = true;
                if (target === 'feed') await window.ProfileApp.loadProfileFeed();
                if (target === 'milestones') await window.ProfileApp.loadMilestonesTab();
            }
        });
    });

    // Style initial active tab
    const firstTab = tabs[0];
    if (firstTab) {
        firstTab.classList.add('text-gray-900', 'border-gray-900');
    }
    tabs.forEach(t => {
        if (!t.classList.contains('active')) {
            t.classList.add('text-gray-400', 'border-transparent');
        }
    });
};
