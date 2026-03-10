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
