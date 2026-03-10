// ═══════════════════════════════════════════════════════════
// Profile – Index (Orchestrator)
// Loads after: state.js, utils.js, loader.js, badges.js,
//              posts.js, milestones.js, tabs.js, edit.js
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    const S = window.ProfileApp.state;

    S.profileUser = await checkAuth();
    if (!S.profileUser) return;

    // Determine which profile to show
    const params = new URLSearchParams(window.location.search);
    S.viewingUserId = params.get('id') || S.profileUser.id;
    S.isOwnProfile = S.viewingUserId === S.profileUser.id;

    // Load the profile
    await window.ProfileApp.loadProfile();

    // Set up tabs
    window.ProfileApp.setupTabs();

    // Set up About modal (mobile "Member since" button)
    window.ProfileApp.setupAboutModal();

    // Set up edit profile modal (bio + photo + badge)
    if (S.isOwnProfile) window.ProfileApp.setupEditProfile();

    // Set up cover photo
    if (S.isOwnProfile) window.ProfileApp.setupCoverPhoto();

    // Set up profile pic quick-upload
    if (S.isOwnProfile) window.ProfileApp.setupProfilePicUpload();
});
