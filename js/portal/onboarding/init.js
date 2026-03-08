// ══════════════════════════════════════════
// Onboarding – Initialization (Smart Step Detection)
// Load order: config.js → state.js → steps.js → photo.js → contribution.js → init.js
// ══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async function () {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = APP_CONFIG.LOGIN_URL;
        return;
    }

    currentUser = session.user;

    // Fetch full profile data
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('setup_completed, first_name, last_name, birthday, profile_picture_url')
        .eq('id', currentUser.id)
        .single();

    if (profile?.setup_completed) {
        window.location.href = APP_CONFIG.PORTAL_URL;
        return;
    }

    // Check for active subscription
    const { data: subs } = await supabaseClient
        .from('subscriptions')
        .select('id')
        .eq('user_id', currentUser.id)
        .in('status', ['active', 'trialing'])
        .limit(1);

    const hasActiveSub = subs && subs.length > 0;

    // ── Determine which content steps (1-4) can be skipped ──
    const skippable = [];

    if (profile?.first_name && profile?.last_name) {
        skippable.push(1); // Name already set
        profileData.first_name = profile.first_name;
        profileData.last_name = profile.last_name;
    }
    if (profile?.birthday) {
        skippable.push(2); // Birthday already set
        profileData.birthday = profile.birthday;
    }
    if (profile?.profile_picture_url) {
        skippable.push(3); // Photo already uploaded
        profileData.profile_picture_url = profile.profile_picture_url;
    }
    if (hasActiveSub) {
        skippable.push(4); // Already has subscription
    }

    // Build active steps (Welcome=0 and Done=5 always included)
    activeSteps = ALL_STEPS.filter(s => !skippable.includes(s));

    // If only Welcome + Done remain, everything is filled → save & redirect
    if (activeSteps.length <= 2) {
        try { await saveProfile(); } catch (e) { /* best-effort */ }
        window.location.href = APP_CONFIG.PORTAL_URL;
        return;
    }

    // Pre-fill form inputs with existing data (even for non-skipped steps)
    if (profile?.first_name) {
        document.getElementById('firstName').value = profile.first_name;
        if (!profileData.first_name) profileData.first_name = profile.first_name;
    }
    if (profile?.last_name) {
        document.getElementById('lastName').value = profile.last_name;
        if (!profileData.last_name) profileData.last_name = profile.last_name;
    }
    if (profile?.birthday) {
        document.getElementById('birthday').value = profile.birthday;
        if (!profileData.birthday) profileData.birthday = profile.birthday;
    }
    if (profile?.profile_picture_url) {
        if (!profileData.profile_picture_url) profileData.profile_picture_url = profile.profile_picture_url;
        // Show existing photo in preview
        document.getElementById('photoPreview').src = profile.profile_picture_url;
        document.getElementById('photoPlaceholder').classList.add('hidden');
        document.getElementById('photoPreviewContainer').classList.remove('hidden');
    }

    // Build dynamic progress bar & wire up buttons
    buildProgressBar();
    setupNavigation();
    setupPhotoUpload();
});
