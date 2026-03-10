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
