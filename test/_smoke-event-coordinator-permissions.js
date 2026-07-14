/**
 * Static smoke: Event Coordinator Phase 2 — shared permission helpers + checkAuth gating.
 * Run: node test/_smoke-event-coordinator-permissions.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sharedJs = fs.readFileSync(path.join(root, 'js/auth/shared.js'), 'utf8');
const eventsDashboardJs = fs.readFileSync(path.join(root, 'js/admin/events-dashboard.js'), 'utf8');

function mustMatch(label, pattern) {
    assert(pattern.test(sharedJs), `${label} — expected in js/auth/shared.js`);
}

// ── Helpers exist and reference correct permission keys ──
mustMatch('canCreateEvents', /function canCreateEvents\(\)/);
mustMatch('canCreateEvents uses events.create', /hasPermission\('events\.create'\)/);
mustMatch('canCreateEvents uses events.manage_all', /function canCreateEvents[\s\S]*hasPermission\('events\.manage_all'\)/);

mustMatch('canManageEvents', /function canManageEvents\(\)/);
assert(
    /function canManageEvents\(\)\s*\{\s*return hasPermission\('events\.manage_all'\);/.test(sharedJs),
    'canManageEvents should return hasPermission(events.manage_all)'
);

mustMatch('canManageEventBanners', /function canManageEventBanners\(\)/);
mustMatch('canManageEventBanners uses events.banners', /function canManageEventBanners[\s\S]*hasPermission\('events\.banners'\)/);

mustMatch('canAccessAdminDashboard', /function canAccessAdminDashboard\(\)/);
assert(
    /function canAccessAdminDashboard\(\)\s*\{\s*return hasPermission\('admin\.dashboard'\);/.test(sharedJs),
    'canAccessAdminDashboard should return hasPermission(admin.dashboard)'
);

// ── checkAuth: permission pages must not all require profiles.role === admin ──
assert(
    /needsLegacyAdminProfile\s*=\s*\(permissionKey\s*===\s*'admin\.dashboard'\)/.test(sharedJs),
    'checkAuth should tie legacy profile.role gate to admin.dashboard only'
);

assert(
    !/else if \(requireAdmin && typeof requireAdmin === 'object' && requireAdmin\.permission\) \{\s*needsAdmin = true/.test(sharedJs),
    'checkAuth must not set needsAdmin=true for every permission object'
);

mustMatch('legacy gate uses profile.role admin', /needsLegacyAdminProfile[\s\S]*profile\.role !== 'admin'/);

mustMatch('granular permission after loadUserPermissions', /if \(permissionKey && !hasPermission\(permissionKey\)\)/);

// events.manage_all admin page still uses permission check (consumer)
assert(
    /checkAuth\(\{\s*permission:\s*'events\.manage_all'\s*\}\)/.test(eventsDashboardJs),
    'admin/events-dashboard should gate on events.manage_all'
);

// ── No event_coordinator profiles.role / schema drift in shared auth ──
assert(
    !/event_coordinator/.test(sharedJs),
    'shared.js must not introduce event_coordinator profiles.role logic'
);

// ── Scope guard: this phase does not touch forbidden paths ──
const forbidden = [
    'pages/portal/events.html',
    'supabase/migrations',
    'supabase/functions',
];
for (const rel of forbidden) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) continue;
    const stat = fs.statSync(full);
    assert(stat.isFile() || stat.isDirectory(), `${rel} exists (unchanged by this smoke)`);
}

console.log('event coordinator permissions smoke: all pass');
