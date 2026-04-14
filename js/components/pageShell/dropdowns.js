// ─── Page Shell: Desktop Dropdowns ──────────────────────
// Sidebar accordion logic (More + Profile toggle).
// Profile dropdown is handled by auth/shared.js (also wires logout button).
// ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    // ─── Sidebar More Accordion ─────────────────────────
    var moreBtn     = document.getElementById('navMoreBtn');
    var moreContent = document.getElementById('navMoreContent');
    var moreChev    = document.getElementById('navMoreChev');

    if (moreBtn && moreContent) {
        moreBtn.addEventListener('click', function () {
            var opening = moreContent.classList.contains('hidden');
            moreContent.classList.toggle('hidden', !opening);
            if (moreChev) moreChev.classList.toggle('rotate-180', opening);
            moreBtn.setAttribute('aria-expanded', String(opening));
            // Collapse profile if opening More
            if (opening && profileDropEl && profileDropEl.classList.contains('nav-profile-open')) {
                profileDropEl.classList.remove('nav-profile-open');
                if (profileChev) profileChev.classList.remove('rotate-180');
                if (profileBtn) profileBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // ─── Sidebar Profile Accordion ──────────────────────
    var profileBtn    = document.getElementById('navProfileBtn');
    var profileDropEl = document.getElementById('navProfileDrop');
    var profileChev   = document.getElementById('navProfileChev');

    if (profileBtn && profileDropEl) {
        profileBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var opening = !profileDropEl.classList.contains('nav-profile-open');
            profileDropEl.classList.toggle('nav-profile-open', opening);
            if (profileChev) profileChev.classList.toggle('rotate-180', opening);
            profileBtn.setAttribute('aria-expanded', String(opening));
            // Collapse More if opening Profile
            if (opening && moreContent && !moreContent.classList.contains('hidden')) {
                moreContent.classList.add('hidden');
                if (moreChev) moreChev.classList.remove('rotate-180');
                if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // ─── Legacy: Desktop More Dropdown (fallback, IDs may not exist) ──
    var desktopMoreBtn  = document.getElementById('desktopMoreBtn');
    var desktopMoreDD   = document.getElementById('desktopMoreDD');
    var desktopMoreChev = document.getElementById('desktopMoreChev');

    if (desktopMoreBtn && desktopMoreDD) {
        desktopMoreBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var isOpen = desktopMoreDD.classList.contains('open');
            desktopMoreDD.classList.toggle('open', !isOpen);
            if (desktopMoreChev) desktopMoreChev.style.transform = isOpen ? '' : 'rotate(180deg)';
        });
        document.addEventListener('click', function(e) {
            if (!document.getElementById('desktopMoreWrap')?.contains(e.target)) {
                desktopMoreDD.classList.remove('open');
                if (desktopMoreChev) desktopMoreChev.style.transform = '';
            }
        });
    }
});
