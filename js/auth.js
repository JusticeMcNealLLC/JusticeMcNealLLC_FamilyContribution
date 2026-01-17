// Authentication handling

// Check if user is logged in
async function checkAuth(requireAdmin = false) {
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
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            // Not an admin, redirect to portal
            window.location.href = APP_CONFIG.PORTAL_URL;
            return null;
        }
    }

    return session.user;
}

// Check if already logged in (for login page)
async function checkAlreadyLoggedIn() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        // Check if admin
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (profile?.role === 'admin') {
            window.location.href = APP_CONFIG.ADMIN_URL;
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

                // Check user role and redirect
                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .single();

                if (profile?.role === 'admin') {
                    window.location.href = APP_CONFIG.ADMIN_URL;
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
                    redirectTo: `${window.location.origin}/reset-password.html`,
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

// Add Admin Dashboard link to portal navigation for admin users
async function addAdminDashboardLink() {
    // Only run on portal pages (not admin pages)
    if (window.location.pathname.includes('/admin/')) {
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

    if (profile?.role === 'admin') {
        // Add to desktop nav
        const desktopNav = document.querySelector('nav .hidden.md\\:flex.items-center.gap-6');
        if (desktopNav) {
            const adminLink = document.createElement('a');
            adminLink.href = '../admin/index.html';
            adminLink.className = 'text-gray-600 hover:text-gray-900';
            adminLink.textContent = 'Admin';
            desktopNav.insertBefore(adminLink, desktopNav.firstChild);
        }

        // Add to mobile nav
        const mobileNav = document.querySelector('#mobileMenu .flex.flex-col.gap-2');
        if (mobileNav) {
            const adminLinkMobile = document.createElement('a');
            adminLinkMobile.href = '../admin/index.html';
            adminLinkMobile.className = 'text-gray-600 hover:text-gray-900 py-2';
            adminLinkMobile.textContent = 'Admin';
            mobileNav.insertBefore(adminLinkMobile, mobileNav.firstChild);
        }
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
