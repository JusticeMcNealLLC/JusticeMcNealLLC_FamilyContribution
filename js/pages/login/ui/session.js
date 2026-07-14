import { DEACTIVATED_LOGIN_MESSAGE } from '../state/messages.js';
import { isProfileDeactivated, signOutDeactivatedUser } from '../utils/deactivated.js';
import { getPostLoginUrl } from '../utils/redirect.js';

export function showDeactivatedQueryError() {
    const loginErrorParam = new URLSearchParams(window.location.search).get('error');
    if (loginErrorParam === 'account_deactivated') {
        showError('loginError', DEACTIVATED_LOGIN_MESSAGE);
    }
}

export async function checkAlreadyLoggedIn() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return false;

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role, setup_completed, is_active')
        .eq('id', session.user.id)
        .single();

    if (isProfileDeactivated(profile)) {
        await signOutDeactivatedUser();
        showError('loginError', DEACTIVATED_LOGIN_MESSAGE);
        return true;
    }

    window.location.href = getPostLoginUrl(profile);
    return true;
}
