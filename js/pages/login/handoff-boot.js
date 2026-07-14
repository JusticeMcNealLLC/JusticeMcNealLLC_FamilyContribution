/**
 * Splash → login handoff guard. Blocking script in <head> (before CSS) so
 * login-handoff-pending is on <html> before first paint. Key must match
 * js/pages/shared/handoff.js SPLASH_HANDOFF_KEY.
 */
(function () {
    try {
        if (sessionStorage.getItem('jmSplashHandoff')) {
            sessionStorage.removeItem('jmSplashHandoff');
            document.documentElement.classList.add('login-handoff-pending');
        }
    } catch (_) { /* ignore */ }
})();
