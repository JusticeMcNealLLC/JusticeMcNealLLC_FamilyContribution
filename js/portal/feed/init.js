// ═══════════════════════════════════════════════════════════
// Feed — Initialization (loads last)
// ═══════════════════════════════════════════════════════════

// ─── Open / close the contributor gate modal ────────────
function openFeedGate(message) {
    const gate = document.getElementById('feedContributorGate');
    const body = document.getElementById('feedGateBody');
    if (!gate) return;
    if (body && message) body.textContent = message;
    gate.classList.remove('hidden');
    gate.classList.add('flex');
}

function closeFeedGate() {
    const gate = document.getElementById('feedContributorGate');
    if (gate) { gate.classList.add('hidden'); gate.classList.remove('flex'); }
}

function setupPullToRefresh() {
    const THRESHOLD = 80; // px of drag needed to trigger a refresh
    const ptr     = document.getElementById('pullToRefresh');
    const arrow   = document.getElementById('pullArrowIcon');
    const spinner = document.getElementById('pullSpinnerIcon');
    const label   = document.getElementById('pullLabel');
    if (!ptr) return;

    let startY    = 0;
    let pulling   = false;
    let triggered = false;

    document.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0 && !feedLoading) {
            startY  = e.touches[0].clientY;
            pulling = true;
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!pulling) return;
        const dy = e.touches[0].clientY - startY;
        if (dy <= 0) { pulling = false; ptr.style.height = '0px'; return; }
        // Rubber-band: compress drag distance so it feels natural
        const pull = Math.min(dy, THRESHOLD + 32);
        ptr.style.height = Math.round(pull * 0.6) + 'px';
        triggered = dy >= THRESHOLD;
        arrow.style.transform = triggered ? 'rotate(180deg)' : '';
        label.textContent = triggered ? 'Release to refresh' : 'Pull to refresh';
    }, { passive: true });

    document.addEventListener('touchend', async () => {
        if (!pulling) return;
        pulling = false;
        if (triggered) {
            triggered = false;
            arrow.classList.add('hidden');
            spinner.classList.remove('hidden');
            label.textContent = 'Refreshing...';
            ptr.style.height = '54px';
            await loadFeed();
            ptr.style.height = '0px';
            arrow.classList.remove('hidden');
            spinner.classList.add('hidden');
            label.textContent = 'Pull to refresh';
        } else {
            triggered = false;
            ptr.style.height = '0px';
        }
        arrow.style.transform = '';
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    feedUser = await checkAuth();
    if (!feedUser) return;

    // Load profile for composer avatar
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('first_name, last_name, profile_picture_url, role')
        .eq('id', feedUser.id)
        .single();

    feedProfile = profile;
    isAdmin = profile?.role === 'admin';

    // Check active contribution status (admin always counts as contributor)
    if (isAdmin) {
        isContributor = true;
    } else {
        const { data: sub } = await supabaseClient
            .from('subscriptions')
            .select('status')
            .eq('user_id', feedUser.id)
            .in('status', ['active', 'trialing'])
            .maybeSingle();
        isContributor = !!sub;
    }

    // Set composer avatars
    setComposerAvatars(profile);

    // Show admin-only buttons
    if (isAdmin) {
        const announcementBtn = document.getElementById('announcementQuickBtn');
        if (announcementBtn) announcementBtn.style.display = '';
        const adminToggle = document.getElementById('composerAdminToggle');
        if (adminToggle) adminToggle.classList.remove('hidden');
    }

    // Wire feed contributor gate close buttons
    const feedGateClose = document.getElementById('feedGateClose');
    const feedGateBackdrop = document.getElementById('feedGateBackdrop');
    if (feedGateClose) feedGateClose.addEventListener('click', closeFeedGate);
    if (feedGateBackdrop) feedGateBackdrop.addEventListener('click', closeFeedGate);

    // Wire up event listeners
    setupComposer();
    setupFilters();
    setupPostDetail();
    setupInfiniteScroll();
    setupPullToRefresh();

    // Load initial feed
    await loadFeed();

    // Auto-open composer if ?compose=1 (from profile + button)
    const params = new URLSearchParams(window.location.search);
    if (params.get('compose') === '1') {
        if (!isContributor) {
            openFeedGate('Post creation is only available to active contributing members. Start or renew your contribution to post.');
        } else {
            const modal = document.getElementById('composerModal');
            if (modal) {
                modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
                const postContent = document.getElementById('postContent');
                setTimeout(() => postContent?.focus(), 300);
            }
        }
        // Clean URL without reload
        window.history.replaceState({}, '', window.location.pathname);
    }
});
