const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const settingsHtml = read('pages/portal/settings.html');
const profileApi = read('react/features/profile/api.ts');
const profileValidation = read('react/features/profile/validation.ts');
const profileSection = read('react/features/profile/ProfileSection.tsx');
const memberModal = read('js/admin/members/members-modal.js');
const sw = read('sw.js');

assert(/id="react-settings-profile"/.test(settingsHtml), 'settings page should mount the React profile section');
assert(/js\/react\/settings\.js/.test(settingsHtml), 'settings page should load the settings React bundle');
assert(/id="profileBirthday"/.test(profileSection), 'profile section should render a birthday input');
assert(/id="profilePhone"/.test(profileSection), 'profile section should render a phone input');
assert(/\.select\('first_name, last_name, birthday, phone, profile_picture_url'\)/.test(profileApi), 'profile load should fetch birthday and phone');
assert(/birthday: form\.birthday \|\| null/.test(profileApi), 'profile save should persist birthday');
assert(/phone: form\.phone\.trim\(\) \|\| null/.test(profileApi), 'profile save should persist phone');
assert(/Birthday must be in the past/.test(profileValidation), 'profile save should validate future birthdays');
assert(/10-digit US phone number/.test(profileValidation), 'profile save should validate phone');

assert(/data-action="reset-onboarding"/.test(memberModal), 'member sheet settings should include reset onboarding action');
assert(/function _onResetOnboarding\(/.test(memberModal), 'member sheet should implement reset onboarding handler');
assert(/setup_completed: false/.test(memberModal), 'reset onboarding should set setup_completed false');
assert(/updated_at: new Date\(\)\.toISOString\(\)/.test(memberModal), 'reset onboarding should touch updated_at');
assert(/Birthday'/.test(memberModal), 'member overview should show birthday state');

assert(/'\/js\/react\/settings\.js'/.test(sw), 'service worker should cache the settings React bundle');

console.log('settings/admin onboarding smoke: all pass');
