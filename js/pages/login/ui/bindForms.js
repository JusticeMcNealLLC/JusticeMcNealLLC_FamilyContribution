import { DEACTIVATED_LOGIN_MESSAGE } from '../state/messages.js';
import { isProfileDeactivated, signOutDeactivatedUser } from '../utils/deactivated.js';
import { getPostLoginUrl } from '../utils/redirect.js';

function bindFormToggle(loginForm, forgotPasswordForm, forgotPasswordLink, backToLoginLink) {
    if (forgotPasswordLink && loginForm && forgotPasswordForm) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            forgotPasswordForm.classList.remove('hidden');
        });
    }

    if (backToLoginLink && loginForm && forgotPasswordForm) {
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            forgotPasswordForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    }
}

function bindLoginForm(loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');

        hideError('loginError');
        setButtonLoading(loginBtn, true, 'Sign In');

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('role, setup_completed, is_active')
                .eq('id', data.user.id)
                .single();

            if (isProfileDeactivated(profile)) {
                await signOutDeactivatedUser();
                showError('loginError', DEACTIVATED_LOGIN_MESSAGE);
                setButtonLoading(loginBtn, false, 'Sign In');
                return;
            }

            window.location.href = getPostLoginUrl(profile);
        } catch (error) {
            showError('loginError', error.message || 'Failed to sign in');
            setButtonLoading(loginBtn, false, 'Sign In');
        }
    });
}

function bindForgotPasswordForm(forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('resetEmail').value;
        const resetBtn = document.getElementById('resetBtn');

        hideError('resetError');
        setButtonLoading(resetBtn, true, 'Send Reset Link');

        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}${APP_CONFIG.RESET_PASSWORD_URL || '/pages/reset-password/'}`,
            });

            if (error) throw error;

            showSuccess('resetSuccess', 'Check your email for the reset link!');
            setButtonLoading(resetBtn, false, 'Send Reset Link');
        } catch (error) {
            showError('resetError', error.message || 'Failed to send reset email');
            setButtonLoading(resetBtn, false, 'Send Reset Link');
        }
    });
}

export function bindForms() {
    const loginForm = document.getElementById('loginForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const backToLoginLink = document.getElementById('backToLoginLink');

    bindFormToggle(loginForm, forgotPasswordForm, forgotPasswordLink, backToLoginLink);

    if (loginForm) bindLoginForm(loginForm);
    if (forgotPasswordForm) bindForgotPasswordForm(forgotPasswordForm);
}
