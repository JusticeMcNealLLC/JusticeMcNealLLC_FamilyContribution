// Reset password page logic
// Only loaded on auth/reset-password.html

const DEACTIVATED_RESET_MESSAGE = 'This account has been deactivated. Please contact support.';

function isProfileDeactivated(profile) {
    return profile != null && profile.is_active === false;
}

function loginUrlForDeactivated() {
    const base = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.LOGIN_URL) || '/auth/login.html';
    const joiner = base.includes('?') ? '&' : '?';
    return base + joiner + 'error=account_deactivated';
}

async function signOutDeactivatedUser() {
    try {
        await supabaseClient.auth.signOut({ scope: 'global' });
    } catch (_) { /* ignore */ }
}

/** Returns false if user was signed out (deactivated). */
async function guardDeactivatedRecoverySession() {
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

function showDeactivatedRecoveryState(passwordForm, errorState) {
    if (passwordForm) passwordForm.classList.add('hidden');
    if (errorState) {
        errorState.classList.remove('hidden');
        const msg = errorState.querySelector('p');
        if (msg) msg.textContent = DEACTIVATED_RESET_MESSAGE;
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const passwordForm = document.getElementById('passwordForm');
    const errorState = document.getElementById('errorState');
    const formError = document.getElementById('formError');
    const formSuccess = document.getElementById('formSuccess');
    const submitBtn = document.getElementById('submitBtn');

    // Check for access_token in URL hash (Supabase redirects with hash)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');

    // Also check query params (some flows use these)
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get('token');

    if (accessToken) {
        // Session should be set by Supabase after hash is processed
        await new Promise(r => setTimeout(r, 0));
    }

    if (!await guardDeactivatedRecoverySession()) {
        showDeactivatedRecoveryState(passwordForm, errorState);
        return;
    }

    if (!token && !accessToken) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            passwordForm.classList.add('hidden');
            errorState.classList.remove('hidden');
            return;
        }
    }

    passwordForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        formError.classList.add('hidden');
        formSuccess.classList.add('hidden');

        if (password !== confirmPassword) {
            formError.textContent = 'Passwords do not match';
            formError.classList.remove('hidden');
            return;
        }

        if (password.length < 6) {
            formError.textContent = 'Password must be at least 6 characters';
            formError.classList.remove('hidden');
            return;
        }

        if (!await guardDeactivatedRecoverySession()) {
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        `;

        try {
            const { error } = await supabaseClient.auth.updateUser({ password: password });
            if (error) throw error;

            if (!await guardDeactivatedRecoverySession()) {
                return;
            }

            formSuccess.textContent = 'Password set successfully! Redirecting...';
            formSuccess.classList.remove('hidden');
            passwordForm.querySelector('button').textContent = 'Success!';

            setTimeout(async () => {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (!session) {
                    window.location.href = 'login.html';
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
                    window.location.href = '../admin/index.html';
                } else if (!profile?.setup_completed) {
                    window.location.href = '../portal/onboarding.html';
                } else {
                    window.location.href = '../portal/index.html';
                }
            }, 1500);

        } catch (error) {
            console.error('Error:', error);
            formError.textContent = error.message || 'Failed to set password';
            formError.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Set Password';
        }
    });
});
