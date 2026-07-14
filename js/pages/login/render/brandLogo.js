export function applyCachedBrandLogos() {
    try {
        const cached = localStorage.getItem('brandLogoCache');
        if (!cached) return;

        const info = JSON.parse(cached);
        if (!info?.url) return;

        document.querySelectorAll('[data-brand-logo]').forEach((container) => {
            const fallback = container.querySelector('[data-brand-fallback]');
            const img = container.querySelector('[data-brand-img]');
            if (!img || img.src) return;

            img.src = info.url;
            img.classList.remove('hidden');
            if (fallback) fallback.classList.add('hidden');

            if (info.isTransparent) {
                container.classList.add('login-logo--transparent');
                img.style.filter = '';
            }
        });
    } catch (_) { /* ignore */ }
}

export function refreshBrandLogos() {
    if (typeof loadBrandLogos === 'function') {
        loadBrandLogos();
    }
}
