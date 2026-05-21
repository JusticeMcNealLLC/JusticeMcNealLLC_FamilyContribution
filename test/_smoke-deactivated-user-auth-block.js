/**
 * Static smoke: deactivated users blocked at login, reset-password, and checkAuth.
 * Run: node test/_smoke-deactivated-user-auth-block.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');

const sharedJs = fs.readFileSync(path.join(root, 'js/auth/shared.js'), 'utf8');
const loginJs = fs.readFileSync(path.join(root, 'js/auth/login.js'), 'utf8');
const resetJs = fs.readFileSync(path.join(root, 'js/auth/reset-password.js'), 'utf8');

// shared.js — checkAuth hard block
assert(/function isProfileDeactivated/.test(sharedJs), 'shared.js defines isProfileDeactivated');
assert(/profile\.is_active === false/.test(sharedJs), 'shared.js checks explicit is_active false');
assert(/async function rejectDeactivatedAccount/.test(sharedJs), 'shared.js defines rejectDeactivatedAccount');
assert(/auth\.signOut/.test(sharedJs), 'checkAuth path signs out blocked users');
assert(/error=account_deactivated/.test(sharedJs), 'shared.js redirects with account_deactivated error');
assert(/isProfileDeactivated\(profile\)/.test(sharedJs), 'checkAuth uses isProfileDeactivated on profile');
assert(/select\('role, setup_completed, is_active'\)/.test(sharedJs), 'checkAuth loads is_active on profile');

// login.js
assert(/function isProfileDeactivated/.test(loginJs), 'login.js defines isProfileDeactivated');
assert(/profile\.is_active === false/.test(loginJs), 'login.js checks is_active false');
assert(/signOut/.test(loginJs), 'login.js signs out deactivated users');
assert(/deactivated\. Please contact support/i.test(loginJs), 'login.js shows deactivated message');
assert(!/subscription/.test(loginJs), 'login.js must not use subscription as hard block');

const loginSubmitBlock = loginJs.match(
    /signInWithPassword[\s\S]{0,500}isProfileDeactivated[\s\S]{0,200}signOut/
);
assert(loginSubmitBlock, 'login submit flow checks deactivation and signs out');

// reset-password.js
assert(/function isProfileDeactivated/.test(resetJs), 'reset-password.js defines isProfileDeactivated');
assert(/guardDeactivatedRecoverySession/.test(resetJs), 'reset-password guards recovery session');
assert(/profile\.is_active === false/.test(resetJs), 'reset-password checks is_active false');
assert(/signOut/.test(resetJs), 'reset-password signs out deactivated users');
assert(/updateUser/.test(resetJs) && /guardDeactivatedRecoverySession/.test(resetJs),
    'reset-password re-checks after updateUser');
assert(!/subscription/.test(resetJs), 'reset-password must not use subscription as hard block');

// scope: Event Coordinator / schema untouched by this change set
const detailJs = path.join(root, 'js/portal/events/detail.js');
if (fs.existsSync(detailJs)) {
    assert(!/rejectDeactivatedAccount/.test(fs.readFileSync(detailJs, 'utf8')),
        'portal events must not be modified for deactivated auth block');
}
const mig092 = path.join(root, 'supabase/migrations/092_profiles_event_display_read.sql');
if (fs.existsSync(mig092)) {
    assert(!/account_deactivated/.test(fs.readFileSync(mig092, 'utf8')),
        'schema migrations must not be modified for deactivated auth block');
}

console.log('deactivated user auth block smoke: all pass');
