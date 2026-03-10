// Authentication handling

// Check if user is logged in
// skipOnboardingCheck: set true on the onboarding page itself to avoid redirect loops
async function checkAuth(requireAdmin = false, skipOnboardingCheck = false) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        // Not logged in, redirect to login
        window.location.href = APP_CONFIG.LOGIN_URL;
        return null;
    }

    // If admin required, check role
    if (requireAdmin) {
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role, setup_completed')
            .eq('id', session.user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            // Not an admin, redirect to portal
            window.location.href = APP_CONFIG.PORTAL_URL;
            return null;
        }
    }

    // Check onboarding status for non-admin portal pages
    if (!requireAdmin && !skipOnboardingCheck) {
        const isOnboardingPage = window.location.pathname.includes('/onboarding');
        if (!isOnboardingPage) {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('setup_completed, role')
                .eq('id', session.user.id)
                .single();

            // Admins skip onboarding check — they manage, not onboard
            if (profile && !profile.setup_completed && profile.role !== 'admin') {
                window.location.href = APP_CONFIG.ONBOARDING_URL;
                return null;
            }
        }
    }

    return session.user;
}

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

// Login form handling
document.addEventListener('DOMContentLoaded', async function() {
    const loginForm = document.getElementById('loginForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const backToLoginLink = document.getElementById('backToLoginLink');
    const logoutBtn = document.getElementById('logoutBtn');

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

                // Route through the splash screen so the welcome animation plays on every sign-in.
                // splash.js already handles admin → ADMIN_URL, onboarding → ONBOARDING_URL,
                // and regular members → PORTAL_URL, so we never land on the wrong page.
                if (!profile?.setup_completed) {
                    // Onboarding must be direct — profile isn't set up enough for splash routing yet
                    window.location.href = APP_CONFIG.ONBOARDING_URL;
                } else {
                    window.location.href = '/';
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

    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            await handleLogout();
        });
    }

    // Mobile logout button
    const logoutBtnMobile = document.getElementById('logoutBtnMobile');
    if (logoutBtnMobile) {
        logoutBtnMobile.addEventListener('click', async function(e) {
            e.preventDefault();
            await handleLogout();
        });
    }

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Add admin dashboard link for admin users on portal pages
    await addAdminDashboardLink();
});

// Add Admin Hub link to portal navigation for admin users
async function addAdminDashboardLink() {
    // Only run on portal pages (not admin pages or login)
    if (window.location.pathname.includes('/admin/') || window.location.pathname.includes('/auth/')) {
        return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    // Check if user is admin
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (profile?.role !== 'admin') return;

    // ── Desktop nav: insert "Admin Hub" before the divider ──
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        const divider = logoutBtn.previousElementSibling; // the w-px separator
        if (divider && divider.parentNode) {
            const adminLink = document.createElement('a');
            adminLink.href = '/admin/index.html';
            adminLink.className = 'px-4 py-2 text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition inline-flex items-center gap-1.5';
            adminLink.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>Admin Hub';
            divider.parentNode.insertBefore(adminLink, divider);
        }
    }

    // ── Mobile bottom tab bar: inject "Admin" as the first tab ──
    const tabBarGrid = document.querySelector('.bottom-tab-bar .grid');
    if (tabBarGrid) {
        // Bump the grid column count by 1
        const colMatch = tabBarGrid.className.match(/grid-cols-(\d)/);
        if (colMatch) {
            tabBarGrid.className = tabBarGrid.className.replace(
                /grid-cols-\d/,
                'grid-cols-' + (parseInt(colMatch[1]) + 1)
            );
        }

        const adminTab = document.createElement('a');
        adminTab.href = '/admin/index.html';
        adminTab.className = 'tab-inactive !text-amber-600';
        adminTab.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg><span>Admin</span>';
        tabBarGrid.insertBefore(adminTab, tabBarGrid.firstChild);
    }
}

// Handle logout - thorough cleanup for mobile browsers
async function handleLogout() {
    try {
        // Sign out from Supabase (scope: global signs out from all tabs/devices)
        await supabaseClient.auth.signOut({ scope: 'global' });
    } catch (e) {
        console.error('Signout error:', e);
    }
    
    // Clear any cached storage (helps with mobile browser issues)
    try {
        localStorage.clear();
        sessionStorage.clear();
    } catch (e) {
        console.error('Storage clear error:', e);
    }
    
    // Redirect to login with cache-busting
    window.location.href = APP_CONFIG.LOGIN_URL + '?logout=' + Date.now();
}
