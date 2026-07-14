import { isProfileDeactivated, signOutDeactivatedUser } from '../../login/utils/deactivated.js';
import { loginUrlForDeactivated } from './loginRedirect.js';

export async function redirectAfterPasswordSet() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = APP_CONFIG.LOGIN_URL;
        return;
    }

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role, setup_completed, is_active')
        .eq('id', session.user.id)
        .maybeSingle();

    if (isProfileDeactivated(profile)) {
        await signOutDeactivatedUser();
        window.location.href = loginUrlForDeactivated();
        return;
    }

    if (profile?.role === 'admin') {
        window.location.href = APP_CONFIG.ADMIN_URL;
    } else if (!profile?.setup_completed) {
        window.location.href = APP_CONFIG.ONBOARDING_URL;
    } else {
        window.location.href = APP_CONFIG.PORTAL_URL;
    }
}
