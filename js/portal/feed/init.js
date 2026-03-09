// ═══════════════════════════════════════════════════════════
// Feed — Initialization (loads last)
// ═══════════════════════════════════════════════════════════

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

    // Set composer avatars
    setComposerAvatars(profile);

    // Show admin-only buttons
    if (isAdmin) {
        const announcementBtn = document.getElementById('announcementQuickBtn');
        if (announcementBtn) announcementBtn.style.display = '';
        const adminToggle = document.getElementById('composerAdminToggle');
        if (adminToggle) adminToggle.classList.remove('hidden');
    }

    // Wire up event listeners
    setupComposer();
    setupFilters();
    setupPostDetail();
    setupInfiniteScroll();

    // Load initial feed
    await loadFeed();
});
