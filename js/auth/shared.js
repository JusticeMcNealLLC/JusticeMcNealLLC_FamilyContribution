// Shared authentication utilities
// Loaded on every portal and admin page

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
        const divider = document.getElementById('navDivider');
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

// ── Wire up logout buttons + admin link on page load ──
document.addEventListener('DOMContentLoaded', async function() {
    // Logout button (desktop)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            await handleLogout();
        });
    }

    // Mobile logout button (tab bar — legacy, may not exist)
    const logoutBtnMobile = document.getElementById('logoutBtnMobile');
    if (logoutBtnMobile) {
        logoutBtnMobile.addEventListener('click', async function(e) {
            e.preventDefault();
            await handleLogout();
        });
    }

    // Settings-page logout button
    const logoutBtnSettings = document.getElementById('logoutBtnSettings');
    if (logoutBtnSettings) {
        logoutBtnSettings.addEventListener('click', async function(e) {
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

    // Load profile name + photo into the nav
    if (typeof loadNavProfile === 'function') {
        loadNavProfile();
    }
});
