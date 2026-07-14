import { DEACTIVATED_RESET_MESSAGE } from '../state/messages.js';
import { isProfileDeactivated, signOutDeactivatedUser } from '../../login/utils/deactivated.js';
import { loginUrlForDeactivated } from '../utils/loginRedirect.js';

export async function guardDeactivatedRecoverySession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return true;

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('is_active, role, setup_completed')
        .eq('id', session.user.id)
        .maybeSingle();

    if (!isProfileDeactivated(profile)) return true;

    await signOutDeactivatedUser();
    window.location.href = loginUrlForDeactivated();
    return false;
}

export function showDeactivatedRecoveryState(passwordForm, errorState) {
    const header = document.querySelector('.login-header');
    if (header) header.classList.add('hidden');
    if (passwordForm) passwordForm.classList.add('hidden');
    if (errorState) {
        errorState.classList.remove('hidden');
        const msg = errorState.querySelector('p');
        if (msg) msg.textContent = DEACTIVATED_RESET_MESSAGE;
    }
}

function hasRecoveryToken() {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get('token');
    return Boolean(accessToken || token);
}

export async function initRecoveryFlow() {
    const passwordForm = document.getElementById('passwordForm');
    const errorState = document.getElementById('errorState');

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('access_token')) {
        await new Promise((r) => setTimeout(r, 0));
    }

    if (!await guardDeactivatedRecoverySession()) {
        showDeactivatedRecoveryState(passwordForm, errorState);
        return false;
    }

    if (!hasRecoveryToken()) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            const header = document.querySelector('.login-header');
            if (header) header.classList.add('hidden');
            passwordForm.classList.add('hidden');
            errorState.classList.remove('hidden');
            return false;
        }
    }

    return true;
}
