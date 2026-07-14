export async function getRedirectUrl() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session) {
            return APP_CONFIG.LOGIN_URL;
        }

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role, setup_completed')
            .eq('id', session.user.id)
            .single();

        if (profile?.role === 'admin') {
            return APP_CONFIG.ADMIN_URL;
        }

        if (profile && !profile.setup_completed) {
            return APP_CONFIG.ONBOARDING_URL;
        }

        return APP_CONFIG.PORTAL_URL;
    } catch (err) {
        console.error('Auth check failed:', err);
        return APP_CONFIG.LOGIN_URL;
    }
}
