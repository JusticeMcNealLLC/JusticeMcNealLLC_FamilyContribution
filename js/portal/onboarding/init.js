// ══════════════════════════════════════════
// Onboarding – Initialization
// Load order: config.js → state.js → steps.js → photo.js → contribution.js → init.js
// Always shows all steps; pre-fills existing data so returning members can confirm quickly.
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
        .select('setup_completed, first_name, last_name, birthday, profile_picture_url, stripe_connect_account_id, connect_onboarding_complete')
        .eq('id', currentUser.id)
        .single();

    if (profile?.setup_completed) {
        window.location.href = APP_CONFIG.PORTAL_URL;
        return;
    }

    // Start with all steps: Welcome=0, Name=1, Birthday=2, Photo=3, Contribution=4, Bank Link=5, Done=6
    activeSteps = [...ALL_STEPS];

    // Check if payouts are enabled globally — if not, skip bank link step
    const { data: payoutSetting } = await supabaseClient
        .from('app_settings')
        .select('value')
        .eq('key', 'payouts_enabled')
        .single();

    const payoutsEnabled = payoutSetting?.value === true;

    // Only skip bank link step if payouts are globally disabled
    if (!payoutsEnabled) {
        activeSteps = activeSteps.filter(s => s !== 5);
    }

    // Skip push notification step (6) if not supported or already granted
    if (typeof window.JMPush === 'undefined' || !window.JMPush.isSupported()) {
        activeSteps = activeSteps.filter(s => s !== 6);
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        // Already granted — skip the prompt
        activeSteps = activeSteps.filter(s => s !== 6);
    }

    // Skip Add to Home Screen step (7) if already running as installed PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
    if (isStandalone) {
        activeSteps = activeSteps.filter(s => s !== 7);
    }

    // Check for active subscription (used by contribution step to offer "keep current plan")
    const { data: subs } = await supabaseClient
        .from('subscriptions')
        .select('id, status, current_amount_cents')
        .eq('user_id', currentUser.id)
        .in('status', ['active', 'trialing'])
        .limit(1);

    if (subs && subs.length > 0) {
        existingSubscription = subs[0];
    }

    // Pre-fill form inputs with existing data so the member can confirm or change
    if (profile?.first_name) {
        document.getElementById('firstName').value = profile.first_name;
        profileData.first_name = profile.first_name;
    }
    if (profile?.last_name) {
        document.getElementById('lastName').value = profile.last_name;
        profileData.last_name = profile.last_name;
    }
    if (profile?.birthday) {
        document.getElementById('birthday').value = profile.birthday;
        profileData.birthday = profile.birthday;
    }
    if (profile?.profile_picture_url) {
        profileData.profile_picture_url = profile.profile_picture_url;
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
