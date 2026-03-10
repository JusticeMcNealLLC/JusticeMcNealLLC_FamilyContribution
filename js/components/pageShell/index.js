// ─── Page Shell: Index ──────────────────────────────────
// This module is the entry point for the pageShell component.
//
// Load order (script tags in HTML):
//   1. icons.js        — SVG path constants
//   2. helpers.js      — p(), dLink(), mTab(), centerTab(), profileTab(), logoBlock()
//   3. nav.js          — Builds nav, footer, tabs, drawer HTML, notification panel
//   4. dropdowns.js    — Desktop "More" + profile dropdown click handlers
//   5. drawer.js       — Swipe gestures, dock edit mode, fly animation
//   6. profile-loader.js — loadNavProfile() (called by auth/shared.js)
//   7. index.js        — (this file) Final init
//
// All modules share state via window.PageShell namespace.
// ─────────────────────────────────────────────────────────

// Minimal bootstrap: show admin pending queue badge in desktop nav
(function(){
	document.addEventListener('DOMContentLoaded', async function(){
		try {
			var PS = window.PageShell || {};
			if (!PS._isAdmin) return;
			if (typeof supabaseClient === 'undefined') return;

			const { count, error } = await supabaseClient
				.from('family_relations')
				.select('id', { count: 'exact', head: true })
				.eq('status','pending');

			if (error) return;
			if (!count || count <= 0) return;

			// Find the admin hub link in the nav and append a badge
			var anchors = document.querySelectorAll('nav a[href="index.html"]');
			var target = null;
			anchors.forEach(a => { if (a.textContent && a.textContent.trim().includes('Admin Hub')) target = a; });
			if (!target) target = anchors[0];
			if (!target) return;

			var badge = document.createElement('span');
			badge.className = 'ml-2 inline-flex items-center justify-center bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full';
			badge.textContent = count;
			target.appendChild(badge);
		} catch (e) {
			// silent
		}
		try {
			// show unread notifications for this admin
			const session = await supabaseClient.auth.getSession();
			const userId = session?.data?.session?.user?.id;
			if (userId) {
				const { count: notifCount } = await supabaseClient
					.from('notifications')
					.select('id', { count: 'exact', head: true })
					.eq('user_id', userId)
					.is('read_at', null);

				if (notifCount && notifCount > 0) {
					// attach to navProfileSection if present
					var profileWrap = document.getElementById('navProfileSection') || document.querySelector('#nav-placeholder');
					var nBadge = document.createElement('span');
					nBadge.className = 'ml-2 inline-flex items-center justify-center bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full';
					nBadge.textContent = notifCount;
					if (profileWrap && profileWrap.parentNode) profileWrap.parentNode.appendChild(nBadge);
				}
			}
		} catch (e) { /* ignore */ }
	});
})();

// ─── PWA Re-Entry Splash ─────────────────────────────────
// Shows a brief welcome-back animation when the user returns
// to the app after being away for 3+ minutes (PWA foreground
// resume). Uses Page Visibility API + sessionStorage.
// ─────────────────────────────────────────────────────────
;(function () {
	var THRESHOLD = 3 * 60 * 1000; // 3 minutes in ms
	var KEY = 'jmllc_last_hidden';
	var _shown = false;

	// Skip entirely if user prefers reduced motion
	if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	function _injectStyles() {
		if (document.getElementById('rs-styles')) return;
		var s = document.createElement('style');
		s.id = 'rs-styles';
		s.textContent = [
			'@keyframes rsOrbAppear{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}',
			'@keyframes rsLogoIn{to{opacity:1;transform:scale(1) translateY(0)}}',
			'@keyframes rsGlow{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.6;transform:scale(1.08)}}',
			'@keyframes rsText{to{opacity:1;transform:translateY(0)}}',
			'@keyframes rsExit{to{opacity:0;transform:scale(1.05);filter:blur(7px)}}',
			'.rs-orb{position:absolute;border-radius:50%;filter:blur(70px);opacity:0;animation:rsOrbAppear .8s ease-out forwards;}'
		].join('');
		document.head.appendChild(s);
	}

	function _show() {
		if (_shown) return;
		_shown = true;
		_injectStyles();

		var ov = document.createElement('div');
		ov.id = 'rs-overlay';
		ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;background:linear-gradient(135deg,#f8fafc 0%,#eef2ff 50%,#e0e7ff 100%);pointer-events:none;overflow:hidden;';

		// Resolve logo path relative to root regardless of page depth
		var depth = (window.location.pathname.match(/\//g) || []).length - 1;
		var prefix = depth > 1 ? '../'.repeat(depth - 1) : '../';
		var logoSrc = prefix + 'assets/icons/icon-192.png';

		ov.innerHTML =
			'<div class="rs-orb" style="width:300px;height:300px;background:radial-gradient(circle,rgba(99,102,241,.32),transparent 70%);top:-70px;right:-70px;animation-delay:.05s;"></div>' +
			'<div class="rs-orb" style="width:240px;height:240px;background:radial-gradient(circle,rgba(129,140,248,.22),transparent 70%);bottom:-55px;left:-55px;animation-delay:.2s;"></div>' +
			'<div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center;">' +
				// Logo wrapper — spring entrance
				'<div style="position:relative;margin-bottom:18px;opacity:0;transform:scale(.5) translateY(18px);animation:rsLogoIn .7s cubic-bezier(.34,1.56,.64,1) .1s forwards;">' +
					// Glow ring behind logo
					'<div style="position:absolute;inset:-18px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,.3) 0%,transparent 70%);opacity:0;animation:rsGlow 2s ease-in-out .7s infinite;"></div>' +
					'<img src="' + logoSrc + '" alt="" style="width:76px;height:76px;border-radius:1.25rem;display:block;position:relative;z-index:1;">' +
				'</div>' +
				// Brand name
				'<div style="font-family:Inter,system-ui,sans-serif;font-size:1.1rem;font-weight:800;letter-spacing:-.02em;color:#1e1b4b;opacity:0;transform:translateY(13px);animation:rsText .5s ease-out .55s forwards;">' +
					'Justice McNeal LLC' +
				'</div>' +
				// Welcome back subtitle
				'<div style="font-family:Inter,system-ui,sans-serif;font-size:.72rem;font-weight:600;color:#6366f1;letter-spacing:.1em;text-transform:uppercase;opacity:0;transform:translateY(10px);animation:rsText .5s ease-out .8s forwards;margin-top:5px;">' +
					'Welcome Back' +
				'</div>' +
			'</div>';

		document.body.appendChild(ov);

		// Hold for 1.7s then fade + blur out
		setTimeout(function () {
			ov.style.animation = 'rsExit .45s cubic-bezier(.4,0,1,1) forwards';
			setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 460);
		}, 1700);
	}

	document.addEventListener('visibilitychange', function () {
		if (document.visibilityState === 'hidden') {
			sessionStorage.setItem(KEY, String(Date.now()));
		} else if (document.visibilityState === 'visible') {
			var ts = sessionStorage.getItem(KEY);
			if (ts && (Date.now() - parseInt(ts, 10)) >= THRESHOLD) {
				_show();
			}
		}
	});
})();
