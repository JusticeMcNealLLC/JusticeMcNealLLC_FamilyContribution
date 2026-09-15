/* ════════════════════════════════════════════════════════════
   Sample a banner’s top-weighted color and fade the hero into it.
   Surface: window.EventsHeroTint
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const FALLBACK = '#13366E';
    const cache = new Map();
    let applyGen = 0;
    let themePrev = null;

    function rgbCss(r, g, b) {
        return 'rgb(' + r + ', ' + g + ', ' + b + ')';
    }

    function rgbTriplet(css) {
        const m = String(css || '').match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (m) return m[1] + ', ' + m[2] + ', ' + m[3];
        const hex = String(css || '').match(/^#([0-9a-f]{6})$/i);
        if (hex) {
            const n = parseInt(hex[1], 16);
            return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
        }
        return '19, 54, 110';
    }

    function sampleUrl(url) {
        if (cache.has(url)) return Promise.resolve(cache.get(url));
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () {
                try {
                    const w = 48;
                    const h = 32;
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (!ctx) {
                        cache.set(url, FALLBACK);
                        resolve(FALLBACK);
                        return;
                    }
                    ctx.drawImage(img, 0, 0, w, h);
                    const data = ctx.getImageData(0, 0, w, h).data;
                    let r = 0;
                    let g = 0;
                    let b = 0;
                    let n = 0;
                    for (let y = 0; y < h; y++) {
                        const weight = (h - y) / h;
                        for (let x = 0; x < w; x++) {
                            const i = (y * w + x) * 4;
                            if (data[i + 3] < 16) continue;
                            r += data[i] * weight;
                            g += data[i + 1] * weight;
                            b += data[i + 2] * weight;
                            n += weight;
                        }
                    }
                    const color = n ? rgbCss(Math.round(r / n), Math.round(g / n), Math.round(b / n)) : FALLBACK;
                    cache.set(url, color);
                    resolve(color);
                } catch (_) {
                    cache.set(url, FALLBACK);
                    resolve(FALLBACK);
                }
            };
            img.onerror = function () {
                cache.set(url, FALLBACK);
                resolve(FALLBACK);
            };
            img.src = url;
        });
    }

    function paint(hero, css) {
        const rgb = rgbTriplet(css);
        hero.style.setProperty('--ed-hero-tint', css);
        hero.style.setProperty('--ed-hero-tint-rgb', rgb);
        const view = hero.closest('#eventsDetailView') || hero.closest('#eventContent') || hero.parentElement;
        if (view && view !== hero) {
            view.style.setProperty('--ed-hero-tint', css);
            view.style.setProperty('--ed-hero-tint-rgb', rgb);
        }
        document.documentElement.style.setProperty('--ed-hero-tint', css);
        document.documentElement.style.setProperty('--ed-hero-tint-rgb', rgb);
        document.body.classList.add('evt-hero-tinted');
    }

    function setThemeColor(css) {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) return;
        if (themePrev == null) themePrev = meta.getAttribute('content') || '#13366E';
        meta.setAttribute('content', css);
    }

    function restoreThemeColor() {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (!meta || themePrev == null) return;
        meta.setAttribute('content', themePrev);
        themePrev = null;
    }

    function apply(opts) {
        const hero = opts && opts.hero;
        const url = opts && opts.url;
        const gen = ++applyGen;
        if (!hero || !url) return;
        paint(hero, FALLBACK);
        if (opts.theme) setThemeColor(FALLBACK);
        sampleUrl(url).then((color) => {
            if (gen !== applyGen) return;
            paint(hero, color);
            if (opts.theme) setThemeColor(color);
        });
    }

    function clear() {
        applyGen += 1;
        restoreThemeColor();
        document.documentElement.style.removeProperty('--ed-hero-tint');
        document.documentElement.style.removeProperty('--ed-hero-tint-rgb');
        document.body.classList.remove('evt-hero-tinted');
    }

    window.EventsHeroTint = { apply: apply, clear: clear };
})();
