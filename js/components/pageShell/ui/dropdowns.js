/** Sidebar accordion logic (More + Profile toggle). */
export function bindDropdowns() {
    const moreBtn = document.getElementById('navMoreBtn');
    const moreContent = document.getElementById('navMoreContent');
    const moreChev = document.getElementById('navMoreChev');

    const profileBtn = document.getElementById('navProfileBtn');
    const profileDropEl = document.getElementById('navProfileDrop');
    const profileChev = document.getElementById('navProfileChev');

    if (moreBtn && moreContent) {
        moreBtn.addEventListener('click', function () {
            const opening = moreContent.classList.contains('hidden');
            moreContent.classList.toggle('hidden', !opening);
            if (moreChev) moreChev.classList.toggle('rotate-180', opening);
            moreBtn.setAttribute('aria-expanded', String(opening));
            if (opening && profileDropEl && profileDropEl.classList.contains('nav-profile-open')) {
                profileDropEl.classList.remove('nav-profile-open');
                if (profileChev) profileChev.classList.remove('rotate-180');
                if (profileBtn) profileBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    if (profileBtn && profileDropEl) {
        profileBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const opening = !profileDropEl.classList.contains('nav-profile-open');
            profileDropEl.classList.toggle('nav-profile-open', opening);
            if (profileChev) profileChev.classList.toggle('rotate-180', opening);
            profileBtn.setAttribute('aria-expanded', String(opening));
            if (opening && moreContent && !moreContent.classList.contains('hidden')) {
                moreContent.classList.add('hidden');
                if (moreChev) moreChev.classList.remove('rotate-180');
                if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    const desktopMoreBtn = document.getElementById('desktopMoreBtn');
    const desktopMoreDD = document.getElementById('desktopMoreDD');
    const desktopMoreChev = document.getElementById('desktopMoreChev');

    if (desktopMoreBtn && desktopMoreDD) {
        desktopMoreBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const isOpen = desktopMoreDD.classList.contains('open');
            desktopMoreDD.classList.toggle('open', !isOpen);
            if (desktopMoreChev) desktopMoreChev.style.transform = isOpen ? '' : 'rotate(180deg)';
        });
        document.addEventListener('click', function (e) {
            if (!document.getElementById('desktopMoreWrap')?.contains(e.target)) {
                desktopMoreDD.classList.remove('open');
                if (desktopMoreChev) desktopMoreChev.style.transform = '';
            }
        });
    }
}
