/**
 * Static smoke: deactivated users blocked at login, reset-password, and checkAuth.
 * Run: node test/_smoke-deactivated-user-auth-block.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');

const sharedJs = fs.readFileSync(path.join(root, 'js/auth/shared.js'), 'utf8');
const loginMessagesJs = fs.readFileSync(path.join(root, 'js/pages/login/state/messages.js'), 'utf8');
const loginDeactivatedJs = fs.readFileSync(path.join(root, 'js/pages/login/utils/deactivated.js'), 'utf8');
const loginBindJs = fs.readFileSync(path.join(root, 'js/pages/login/ui/bindForms.js'), 'utf8');
const loginJs = [loginMessagesJs, loginDeactivatedJs, loginBindJs].join('\n');
const resetMessagesJs = fs.readFileSync(path.join(root, 'js/pages/reset-password/state/messages.js'), 'utf8');
const resetRecoveryJs = fs.readFileSync(path.join(root, 'js/pages/reset-password/ui/recovery.js'), 'utf8');
const resetBindJs = fs.readFileSync(path.join(root, 'js/pages/reset-password/ui/bindPasswordForm.js'), 'utf8');
const resetJs = [resetMessagesJs, loginDeactivatedJs, resetRecoveryJs, resetBindJs].join('\n');

// shared.js — checkAuth hard block
assert(/function isProfileDeactivated/.test(sharedJs), 'shared.js defines isProfileDeactivated');
assert(/profile\.is_active === false/.test(sharedJs), 'shared.js checks explicit is_active false');
assert(/async function rejectDeactivatedAccount/.test(sharedJs), 'shared.js defines rejectDeactivatedAccount');
assert(/auth\.signOut/.test(sharedJs), 'checkAuth path signs out blocked users');
assert(/error=account_deactivated/.test(sharedJs), 'shared.js redirects with account_deactivated error');
assert(/isProfileDeactivated\(profile\)/.test(sharedJs), 'checkAuth uses isProfileDeactivated on profile');
assert(/select\('role, setup_completed, is_active'\)/.test(sharedJs), 'checkAuth loads is_active on profile');

// login page modules
assert(/function isProfileDeactivated/.test(loginJs), 'login page defines isProfileDeactivated');
assert(/profile\.is_active === false/.test(loginJs), 'login page checks is_active false');
assert(/signOut/.test(loginJs), 'login page signs out deactivated users');
assert(/deactivated\. Please contact support/i.test(loginJs), 'login page shows deactivated message');
assert(!/subscription/.test(loginJs), 'login page must not use subscription as hard block');

const loginSubmitBlock = loginJs.match(
    /signInWithPassword[\s\S]{0,500}isProfileDeactivated[\s\S]{0,200}signOut/
);
assert(loginSubmitBlock, 'login submit flow checks deactivation and signs out');

// reset-password page modules
assert(/function isProfileDeactivated/.test(resetJs), 'reset-password page uses isProfileDeactivated');
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
