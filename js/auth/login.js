// Login page logic
// Only loaded on auth/login.html

// Check if already logged in (for login page)
async function checkAlreadyLoggedIn() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        // Check role + onboarding status
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role, setup_completed')
            .eq('id', session.user.id)
            .single();

        if (profile?.role === 'admin') {
            window.location.href = APP_CONFIG.ADMIN_URL;
        } else if (!profile?.setup_completed) {
            window.location.href = APP_CONFIG.ONBOARDING_URL;
        } else {
            window.location.href = APP_CONFIG.PORTAL_URL;
        }
        return true;
    }
    return false;
}

document.addEventListener('DOMContentLoaded', async function() {
    const loginForm = document.getElementById('loginForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const backToLoginLink = document.getElementById('backToLoginLink');

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
                    .select('role, setup_completed')
                    .eq('id', data.user.id)
                    .single();

                if (profile?.role === 'admin') {
                    window.location.href = APP_CONFIG.ADMIN_URL;
                } else if (!profile?.setup_completed) {
                    window.location.href = APP_CONFIG.ONBOARDING_URL;
                } else {
                    window.location.href = APP_CONFIG.PORTAL_URL;
                }

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
