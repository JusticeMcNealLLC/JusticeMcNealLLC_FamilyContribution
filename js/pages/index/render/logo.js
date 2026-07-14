import { BUCKET } from '../state/timing.js';

const GRADIENT_CLASSES = ['bg-gradient-to-br', 'from-primary-400', 'via-primary-500', 'to-primary-700'];

export function hideSpinner() {
    const spinner = document.getElementById('logoSpinner');
    if (spinner) spinner.classList.add('spinner-hidden');
}

export function revealElement(el) {
    el.classList.remove('hidden');
    el.classList.add('logo-reveal');
}

export function showLogoFallback() {
    const fallback = document.getElementById('logoFallback');
    if (fallback) fallback.classList.remove('hidden');
}

export function applyTransparentLogoStyles(container, imgEl) {
    container.classList.remove(...GRADIENT_CLASSES);
    container.classList.add('logo-container--transparent');
    imgEl.classList.remove('p-2');
}

export function applyCachedBrandLogo() {
    try {
        const cached = localStorage.getItem('brandLogoCache');
        if (!cached) {
            showLogoFallback();
            return;
        }

        const info = JSON.parse(cached);
        if (!info?.url) {
            showLogoFallback();
            return;
        }

        const container = document.getElementById('logoContainer');
        const fallback = document.getElementById('logoFallback');
        const imgEl = document.getElementById('logoImage');
        if (!container || !imgEl) return;

        imgEl.src = info.url;
        imgEl.classList.remove('hidden');
        imgEl.classList.add('logo-reveal');
        if (fallback) fallback.classList.add('hidden');
        hideSpinner();

        if (info.isTransparent) {
            applyTransparentLogoStyles(container, imgEl);
        }
    } catch (e) {
        showLogoFallback();
    }
}

export async function tryLoadLogo() {
    try {
        const { data: files } = await supabaseClient.storage
            .from(BUCKET)
            .list('brand', { limit: 20 });

        if (!files || files.length === 0) {
            hideSpinner();
            const fb = document.getElementById('logoFallback');
            if (fb && fb.classList.contains('hidden')) revealElement(fb);
            return;
        }

        let match = files.find((f) => f.name.startsWith('logo-transparent'));
        if (!match) {
            match = files.find((f) => f.name.startsWith('logo-solid'));
        }
        if (!match) {
            hideSpinner();
            const fb = document.getElementById('logoFallback');
            if (fb && fb.classList.contains('hidden')) revealElement(fb);
            return;
        }

        const filePath = `brand/${match.name}`;
        const { data: urlData } = supabaseClient.storage
            .from(BUCKET)
            .getPublicUrl(filePath);

        if (!urlData?.publicUrl) return;

        const url = urlData.publicUrl + '?t=' + Date.now();
        const isTransparent = match.name.startsWith('logo-transparent');
        const imgEl = document.getElementById('logoImage');
        const fallback = document.getElementById('logoFallback');
        const container = document.getElementById('logoContainer');

        try {
            localStorage.setItem('brandLogoCache', JSON.stringify({ url, isTransparent }));
        } catch (e) {}

        if (imgEl && imgEl.src && !imgEl.classList.contains('hidden')) {
            hideSpinner();
            return;
        }

        const img = new Image();
        img.onload = function () {
            hideSpinner();
            imgEl.src = url;
            revealElement(imgEl);
            fallback.classList.add('hidden');

            if (isTransparent) {
                applyTransparentLogoStyles(container, imgEl);
            }
        };
        img.onerror = function () {
            hideSpinner();
            const fb = document.getElementById('logoFallback');
            if (fb && fb.classList.contains('hidden')) revealElement(fb);
        };
        img.src = url;
    } catch (err) {
        hideSpinner();
        const fb = document.getElementById('logoFallback');
        if (fb && fb.classList.contains('hidden')) revealElement(fb);
        try { localStorage.removeItem('brandLogoCache'); } catch (e) {}
        console.log('Splash: using fallback logo');
    }
}
