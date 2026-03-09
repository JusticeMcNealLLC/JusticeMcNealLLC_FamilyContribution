// ─── Page Shell: Desktop Dropdowns ──────────────────────
// "More" dropdown and profile dropdown logic.
// ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    // ─── Desktop More Dropdown ──────────────────────────
    var moreBtn  = document.getElementById('desktopMoreBtn');
    var moreDD   = document.getElementById('desktopMoreDD');
    var moreChev = document.getElementById('desktopMoreChev');

    if (moreBtn && moreDD) {
        moreBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var isOpen = moreDD.classList.contains('open');
            moreDD.classList.toggle('open', !isOpen);
            if (moreChev) moreChev.style.transform = isOpen ? '' : 'rotate(180deg)';
        });
        document.addEventListener('click', function(e) {
            if (!document.getElementById('desktopMoreWrap')?.contains(e.target)) {
                moreDD.classList.remove('open');
                if (moreChev) moreChev.style.transform = '';
            }
        });
    }

    // ─── Profile Dropdown ───────────────────────────────
    var profileBtn     = document.getElementById('profileDropdownBtn');
    var profileDD      = document.getElementById('profileDropdown');
    var profileChev    = document.getElementById('profileChevron');
    var profileWrap    = document.getElementById('profileDropdownWrap');

    if (profileBtn && profileDD) {
        var profileOpen = false;

        function showProfileDD() {
            profileOpen = true;
            profileDD.classList.remove('hidden');
            requestAnimationFrame(function() {
                profileDD.style.opacity = '1';
                profileDD.style.transform = 'translateY(0)';
            });
            if (profileChev) profileChev.style.transform = 'rotate(180deg)';
            profileBtn.setAttribute('aria-expanded', 'true');
        }

        function hideProfileDD() {
            profileOpen = false;
            profileDD.style.opacity = '0';
            profileDD.style.transform = 'translateY(4px)';
            if (profileChev) profileChev.style.transform = '';
            profileBtn.setAttribute('aria-expanded', 'false');
            setTimeout(function() {
                if (!profileOpen) profileDD.classList.add('hidden');
            }, 150);
        }

        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (profileOpen) hideProfileDD(); else showProfileDD();
        });

        document.addEventListener('click', function(e) {
            if (profileOpen && profileWrap && !profileWrap.contains(e.target)) {
                hideProfileDD();
            }
        });
    }
});
