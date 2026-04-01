// Shared authentication utilities
// Loaded on every portal and admin page

// ── Permissions Cache ─────────────────────────────────────
// Populated by checkAuth(), consumed by hasPermission() helpers.
window.__userRoles = null;       // Array of { id, name, color, icon, position }
window.__userPermissions = null; // Set<string> of permission keys

async function loadUserPermissions(userId) {
    if (window.__userPermissions) return;

    const { data: memberRoles, error } = await supabaseClient
        .from('member_roles')
        .select(`
            roles (
                id, name, color, icon, position,
                role_permissions ( permission )
            )
        `)
        .eq('user_id', userId);

    if (error || !memberRoles) {
        window.__userRoles = [];
        window.__userPermissions = new Set();
        return;
    }

    window.__userRoles = memberRoles
        .map(mr => mr.roles)
        .filter(Boolean)
        .sort((a, b) => a.position - b.position);

    const perms = new Set();
    for (const role of window.__userRoles) {
        for (const rp of (role.role_permissions || [])) {
            perms.add(rp.permission);
        }
    }
    window.__userPermissions = perms;
}

/** Check a single permission key, e.g. hasPermission('finance.expenses') */
function hasPermission(key) {
    return window.__userPermissions?.has(key) ?? false;
}

/** TRUE if user has at least one of the listed permissions */
function hasAnyPermission(keys) {
    if (!window.__userPermissions) return false;
    return keys.some(k => window.__userPermissions.has(k));
}

/** TRUE if user has every one of the listed permissions */
function hasAllPermissions(keys) {
    if (!window.__userPermissions) return false;
    return keys.every(k => window.__userPermissions.has(k));
}

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

    // Load roles + permissions into global cache
    await loadUserPermissions(session.user.id);

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

    // ── Mobile swipe-up drawer: inject "Admin Hub" as the first item ──
    const drawerGrid = document.querySelector('#navDrawer .nav-drawer-grid');
    if (drawerGrid) {
        const adminItem = document.createElement('button');
        adminItem.type = 'button';
        adminItem.className = 'nav-drawer-item';
        adminItem.setAttribute('data-drawer-page', 'admin-hub');
        adminItem.setAttribute('data-drawer-href', '/admin/index.html');
        adminItem.setAttribute('data-drawer-label', 'Admin Hub');
        adminItem.innerHTML =
            '<div class="drawer-icon" style="background:#fffbeb;color:#d97706;">' +
                '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>' +
            '</div>' +
            '<span>Admin Hub</span>';
        adminItem.addEventListener('click', function () {
            window.location.href = '/admin/index.html';
        });
        drawerGrid.insertBefore(adminItem, drawerGrid.firstChild);
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

// ── Wire up logout buttons + profile dropdown + admin link on page load ──
document.addEventListener('DOMContentLoaded', async function() {
    // ── Profile dropdown toggle (desktop nav) ──
    const dropdownBtn   = document.getElementById('profileDropdownBtn');
    const dropdown      = document.getElementById('profileDropdown');
    const chevron       = document.getElementById('profileChevron');

    function openDropdown() {
        if (!dropdown) return;
        dropdown.classList.remove('hidden');
        requestAnimationFrame(() => {
            dropdown.style.opacity = '1';
            dropdown.style.transform = 'translateY(0)';
        });
        if (chevron) chevron.style.transform = 'rotate(180deg)';
        if (dropdownBtn) dropdownBtn.setAttribute('aria-expanded', 'true');
    }

    function closeDropdown() {
        if (!dropdown) return;
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(4px)';
        setTimeout(() => dropdown.classList.add('hidden'), 150);
        if (chevron) chevron.style.transform = '';
        if (dropdownBtn) dropdownBtn.setAttribute('aria-expanded', 'false');
    }

    if (dropdownBtn && dropdown) {
        dropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var isOpen = !dropdown.classList.contains('hidden');
            isOpen ? closeDropdown() : openDropdown();
        });

        // Close on outside click
        document.addEventListener('click', function(e) {
            if (!dropdown.classList.contains('hidden')) {
                var wrap = document.getElementById('profileDropdownWrap');
                if (wrap && !wrap.contains(e.target)) closeDropdown();
            }
        });

        // Close on Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !dropdown.classList.contains('hidden')) closeDropdown();
        });
    }

    // Logout button (now inside profile dropdown)
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

    // Load brand logo into nav (and any other [data-brand-logo] containers)
    if (typeof loadBrandLogos === 'function') {
        loadBrandLogos();
    }

    // Start inactivity auto-logout timer (skip on login, reset-password, onboarding, and splash pages)
    const path = window.location.pathname;
    const skipInactivity = path === '/' || path === '/index.html'
        || path.includes('/auth/')
        || path.includes('/onboarding');
    if (!skipInactivity) {
        startInactivityTimer();
    }
});

// ── Inactivity Auto-Logout ──────────────────────────────
// Logs user out after INACTIVITY_TIMEOUT_MS of no interaction
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
let _inactivityTimer = null;

function startInactivityTimer() {
    resetInactivityTimer();

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(evt => {
        document.addEventListener(evt, resetInactivityTimer, { passive: true });
    });
}

function resetInactivityTimer() {
    if (_inactivityTimer) clearTimeout(_inactivityTimer);
    _inactivityTimer = setTimeout(async () => {
        console.log('Inactivity timeout — logging out');
        await handleLogout();
    }, INACTIVITY_TIMEOUT_MS);
}
