// Login page logic
// Only loaded on auth/login.html

const DEACTIVATED_LOGIN_MESSAGE = 'This account has been deactivated. Please contact support.';

function isProfileDeactivated(profile) {
    return profile != null && profile.is_active === false;
}

async function signOutDeactivatedUser() {
    try {
        await supabaseClient.auth.signOut({ scope: 'global' });
    } catch (_) { /* ignore */ }
}

function getSafeLoginRedirect() {
    const raw = new URLSearchParams(window.location.search).get('redirect');
    if (!raw) return '';

    try {
        const target = new URL(raw, window.location.origin);
        const allowedOrigins = new Set([
            window.location.origin,
            'https://justicemcneal.com',
            'https://www.justicemcneal.com',
        ]);

        if (!allowedOrigins.has(target.origin)) return '';
        if (target.pathname.startsWith('/auth/')) return '';

        // Portal event detail (?event=slug)
        if (/\/portal\/events\.html$/i.test(target.pathname)) {
            const portalSlug = target.searchParams.get('event');
            if (portalSlug) {
                return `${target.origin}/portal/events.html?event=${encodeURIComponent(portalSlug)}`;
            }
        }

        // Public share page (/events/?e=slug) → portal detail
        if (/^\/events\/?$/i.test(target.pathname)) {
            const publicSlug = target.searchParams.get('e');
            if (publicSlug) {
                return `${target.origin}/portal/events.html?event=${encodeURIComponent(publicSlug)}`;
            }
        }

        return target.href;
    } catch (_) {
        return '';
    }
}

function getPostLoginUrl(profile) {
    const redirect = getSafeLoginRedirect();

    if (profile?.role === 'admin') {
        return redirect || APP_CONFIG.ADMIN_URL;
    }

    if (!profile || !profile.setup_completed) {
        return APP_CONFIG.ONBOARDING_URL;
    }

    return redirect || APP_CONFIG.PORTAL_URL;
}

// Check if already logged in (for login page)
async function checkAlreadyLoggedIn() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        // Check role + onboarding status
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
    return false;
}

document.addEventListener('DOMContentLoaded', async function() {
    const loginForm = document.getElementById('loginForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const backToLoginLink = document.getElementById('backToLoginLink');

    const loginErrorParam = new URLSearchParams(window.location.search).get('error');
    if (loginErrorParam === 'account_deactivated') {
        showError('loginError', DEACTIVATED_LOGIN_MESSAGE);
    }

    // Check if already logged in (only on login page)
    if (loginForm) {
        checkAlreadyLoggedIn();
    }

    // Login form submit
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('loginBtn');
            
            hideError('loginError');
            setButtonLoading(loginBtn, true, 'Sign In');

            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) throw error;

                // Check user role + onboarding status and redirect
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

    // Toggle to forgot password form
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginForm.classList.add('hidden');
            forgotPasswordForm.classList.remove('hidden');
        });
    }

    // Toggle back to login form
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            forgotPasswordForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    }

    // Forgot password form submit
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('resetEmail').value;
            const resetBtn = document.getElementById('resetBtn');
            
            hideError('resetError');
            setButtonLoading(resetBtn, true, 'Send Reset Link');

            try {
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/auth/reset-password.html`,
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
});
