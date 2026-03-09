// ═══════════════════════════════════════════════════════════
// Profile – Shared State
// ═══════════════════════════════════════════════════════════

window.ProfileApp = window.ProfileApp || {};

window.ProfileApp.state = {
    profileUser: null,      // logged-in user
    viewingUserId: null,    // profile being viewed
    isOwnProfile: false,

    // Badge / cosmetics state
    earnedBadgeKeys: [],
    currentDisplayedBadge: null,
    currentBannerGradient: null,
    currentBannerPhotoUrl: null,
};
