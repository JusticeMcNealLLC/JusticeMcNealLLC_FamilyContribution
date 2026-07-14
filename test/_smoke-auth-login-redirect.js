const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const loginRedirectJs = fs.readFileSync(path.join(root, 'js/pages/login/utils/redirect.js'), 'utf8');
const loginDeactivatedJs = fs.readFileSync(path.join(root, 'js/pages/login/utils/deactivated.js'), 'utf8');
const loginBindJs = fs.readFileSync(path.join(root, 'js/pages/login/ui/bindForms.js'), 'utf8');
const loginJs = [loginRedirectJs, loginDeactivatedJs, loginBindJs].join('\n');
const publicEventJs = fs.readFileSync(path.join(root, 'js/events/index.js'), 'utf8');

assert(/function getSafeLoginRedirect\(/.test(loginJs), 'login should define a safe redirect resolver');
assert(/new URLSearchParams\(window\.location\.search\)\.get\('redirect'\)/.test(loginJs), 'login should read redirect query param');
assert(/https:\/\/justicemcneal\.com/.test(loginJs), 'login should allow production root redirects');
assert(/https:\/\/www\.justicemcneal\.com/.test(loginJs), 'login should allow production www redirects');
assert(/target\.pathname\.startsWith\('\/pages\/login'\)/.test(loginJs) || /isAuthEntryPath/.test(loginJs), 'login should block redirect loops back into auth pages');
assert(/allowedOrigins\.has\(target\.origin\)/.test(loginJs), 'login should block off-site redirects');
assert(/profile\?\.role === 'admin'/.test(loginJs), 'login should preserve admin-aware redirects');
assert(/redirect \|\| APP_CONFIG\.ADMIN_URL/.test(loginJs), 'login should keep admin default when no redirect exists');
assert(/redirect \|\| APP_CONFIG\.PORTAL_URL/.test(loginJs), 'login should keep portal default when no redirect exists');
assert(/!profile \|\| !profile\.setup_completed/.test(loginJs), 'login should still send incomplete profiles to onboarding');
assert(/window\.location\.href = getPostLoginUrl\(profile\)/g.test(loginJs), 'login should use post-login resolver for redirect');
assert(/\/pages\/login\/\?redirect=/.test(publicEventJs), 'public event page should link sign-in with redirect');

console.log('auth login redirect smoke: all pass');