// ─── Page Shell: Desktop Dropdowns ──────────────────────
// "More" dropdown logic.
// Profile dropdown is handled by auth/shared.js (also wires logout button).
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
});
