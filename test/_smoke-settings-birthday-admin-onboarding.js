const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const settingsHtml = fs.readFileSync(path.join(root, 'portal/settings.html'), 'utf8');
const settingsJs = fs.readFileSync(path.join(root, 'js/portal/settings.js'), 'utf8');
const memberModal = fs.readFileSync(path.join(root, 'js/admin/members/members-modal.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert(/id="settingsBirthday"/.test(settingsHtml), 'settings page should render a birthday input');
assert(/\.select\('first_name, last_name, birthday, profile_picture_url'\)/.test(settingsJs), 'settings profile load should fetch birthday');
assert(/birthday: birthday \|\| null/.test(settingsJs), 'settings save should persist birthday');
assert(/Birthday must be in the past/.test(settingsJs), 'settings save should validate future birthdays');

assert(/data-action="reset-onboarding"/.test(memberModal), 'member sheet settings should include reset onboarding action');
assert(/function _onResetOnboarding\(/.test(memberModal), 'member sheet should implement reset onboarding handler');
assert(/setup_completed: false/.test(memberModal), 'reset onboarding should set setup_completed false');
assert(/updated_at: new Date\(\)\.toISOString\(\)/.test(memberModal), 'reset onboarding should touch updated_at');
assert(/Birthday'/.test(memberModal), 'member overview should show birthday state');

assert(/jm-portal-v113/.test(sw), 'service worker cache should be bumped for changed static assets');

console.log('settings/admin onboarding smoke: all pass');
