// ═══════════════════════════════════════════════════════════
// Lottie Effects Engine — Animated Banners & Badge Effects
// ═══════════════════════════════════════════════════════════
// Self-loads lottie-web from CDN, then exposes helpers for
// rendering Lottie overlay animations on banners + badges.
//
// Supports both hosted URLs and local JSON files.
// For .lottie (dotLottie) files, extract the JSON and host
// it locally under assets/lottie/ for best compatibility.
// ═══════════════════════════════════════════════════════════

(function () {
    'use strict';

    const CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
    let lottieReady = null;

    // ─── Resolve asset paths relative to site root ──────────
    function assetPath(relPath) {
        // Works from any page depth (portal/, admin/, etc.)
        const base = document.querySelector('base')?.href || window.location.origin + '/';
        return new URL(relPath, base).href;
    }

    // ─── Load lottie-web on demand ──────────────────────────
    function ensureLottie() {
        if (lottieReady) return lottieReady;
        if (window.lottie) {
            lottieReady = Promise.resolve();
            return lottieReady;
        }
        lottieReady = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = CDN_URL;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load lottie-web'));
            document.head.appendChild(script);
        });
        return lottieReady;
    }

    // ═══════════════════════════════════════════════════════════
    // BANNER EFFECTS — Lottie overlays on profile cover banners
    // ═══════════════════════════════════════════════════════════

    /**
     * Banner effect definitions.
     * lottieUrl can be an absolute URL or a path relative to site root.
     * Local JSON files (assets/lottie/) are preferred for reliability.
     */
    const BANNER_EFFECTS = {
        sparkle: {
            name: 'Founders Sparkle',
            lottieUrl: 'assets/lottie/founders.json',   // extracted from LottieFiles .lottie
            speed: 0.8,
            local: true,
        },
        'cat-playing': {
            name: 'Cat Playing',
            lottieUrl: 'assets/lottie/cat-playing.json',
            speed: 1,
            local: true,
        },
        lightning: {
            name: 'Lightning',
            lottieUrl: 'https://lottie.host/bf02cf8c-8147-4248-87e4-daa5c41b9e72/x0IedfbpVx.json',
            speed: 1,
        },
        confetti: {
            name: 'Confetti',
            lottieUrl: 'https://lottie.host/2a6e08f3-ab71-45ad-b85d-aa1c61b2a6ab/0bVPAHNVAB.json',
            speed: 0.7,
        },
        fire: {
            name: 'Fire',
            lottieUrl: 'https://lottie.host/95e3a3c6-4be3-43de-b6e4-82bc4e1f4173/p7ahVNQOjB.json',
            speed: 1,
        },
        smoke: {
            name: 'Mystic Smoke',
            lottieUrl: 'https://lottie.host/c30d78b1-2d7a-4f16-b5a9-3e7d2b6a4c5f/KJnbV7fZxH.json',
            speed: 0.6,
        },
        stars: {
            name: 'Stars',
            lottieUrl: 'https://lottie.host/2b8c3dff-2a85-4a4d-b648-79e0209842db/p3qWxUHmvJ.json',
            speed: 0.5,
        },
    };

    /**
     * Resolve the final URL for a Lottie effect.
     * Local paths get resolved relative to site root.
     */
    function resolveUrl(effect) {
        if (!effect) return '';
        if (effect.local) return assetPath(effect.lottieUrl);
        return effect.lottieUrl;
    }

    /**
     * Render a Lottie overlay on a container element (e.g. profile banner).
     * @param {HTMLElement} container — the parent element to overlay onto
     * @param {string} effectKey — key from BANNER_EFFECTS
     * @param {object} [options] — { loop: true, opacity: 0.6 }
     * @returns {Promise<object|null>} lottie animation instance, or null on fail
     */
    async function renderBannerEffect(container, effectKey, options = {}) {
        const effect = BANNER_EFFECTS[effectKey];
        if (!effect || !container) return null;

        try {
            await ensureLottie();
        } catch { return null; }

        const { loop = true, opacity = 0.55 } = options;

        // Remove any existing effect overlay
        const existing = container.querySelector('.lottie-banner-overlay');
        if (existing) existing.remove();

        // Create overlay div
        const overlay = document.createElement('div');
        overlay.className = 'lottie-banner-overlay';
        overlay.style.cssText = `
            position: absolute; inset: 0; z-index: 1;
            pointer-events: none; overflow: hidden;
            opacity: ${opacity}; mix-blend-mode: screen;
        `;
        container.style.position = 'relative';
        container.appendChild(overlay);

        // Load animation
        const url = resolveUrl(effect);
        const anim = window.lottie.loadAnimation({
            container: overlay,
            renderer: 'svg',
            loop: loop,
            autoplay: true,
            path: url,
            rendererSettings: {
                preserveAspectRatio: 'xMidYMid slice',
            },
        });
        anim.setSpeed(effect.speed || 1);
        overlay._lottieAnim = anim;
        return anim;
    }

    /**
     * Remove Lottie overlay from a container.
     * @param {HTMLElement} container
     */
    function removeBannerEffect(container) {
        if (!container) return;
        const overlay = container.querySelector('.lottie-banner-overlay');
        if (overlay) {
            if (overlay._lottieAnim) overlay._lottieAnim.destroy();
            overlay.remove();
        }
    }

    // ═══════════════════════════════════════════════════════════
    // BADGE EFFECTS — Lottie micro-animations on badge chips
    // ═══════════════════════════════════════════════════════════

    /**
     * Badge rarity Lottie effects — play behind/around badge chips.
     * legendary uses the Founders animation; epic uses a subtler version.
     */
    const BADGE_EFFECTS = {
        legendary: {
            lottieUrl: 'assets/lottie/founders.json',
            local: true,
            speed: 0.6,
            opacity: 1,       // full opacity — Lottie IS the badge
            scale: 1.8,
            zIndex: 1,        // render on top (no emoji behind)
        },
        epic: {
            lottieUrl: 'assets/lottie/founders.json',
            local: true,
            speed: 0.4,
            opacity: 0.45,
            scale: 1.5,
            zIndex: -1,       // behind the emoji
        },
        // rare and common get CSS only — no Lottie
    };

    /**
     * Add a Lottie glow/sparkle behind a badge chip element.
     * @param {HTMLElement} chipEl — the .badge-chip element
     * @param {string} rarity — 'legendary', 'epic', etc.
     * @returns {Promise<object|null>} lottie animation instance
     */
    async function renderBadgeEffect(chipEl, rarity) {
        const effect = BADGE_EFFECTS[rarity];
        if (!effect || !chipEl) return null;

        try {
            await ensureLottie();
        } catch { return null; }

        // Skip if already has a lottie effect
        if (chipEl.querySelector('.lottie-badge-effect')) return null;

        // Wrap chip in relative container if needed
        if (getComputedStyle(chipEl).position === 'static') {
            chipEl.style.position = 'relative';
        }

        const effectEl = document.createElement('div');
        effectEl.className = 'lottie-badge-effect';
        const s = effect.scale || 1.5;
        const zi = effect.zIndex !== undefined ? effect.zIndex : -1;
        effectEl.style.cssText = `
            position: absolute;
            top: 50%; left: 50%;
            width: ${s * 100}%; height: ${s * 100}%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            opacity: ${effect.opacity || 0.5};
            z-index: ${zi};
        `;
        chipEl.style.overflow = 'visible';
        chipEl.appendChild(effectEl);

        const url = resolveUrl(effect);
        const anim = window.lottie.loadAnimation({
            container: effectEl,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: url,
            rendererSettings: {
                preserveAspectRatio: 'xMidYMid slice',
            },
        });
        anim.setSpeed(effect.speed || 0.5);
        effectEl._lottieAnim = anim;
        return anim;
    }

    /**
     * Scan the page for badge chips with epic/legendary rarity
     * and automatically add Lottie effects to them.
     * Call this after rendering badges.
     */
    function applyBadgeEffects() {
        document.querySelectorAll('.badge-chip, .badge-chip-overlay').forEach(chip => {
            if (chip.classList.contains('badge-rarity-legendary')) {
                renderBadgeEffect(chip, 'legendary');
            } else if (chip.classList.contains('badge-rarity-epic')) {
                renderBadgeEffect(chip, 'epic');
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════

    window.LottieEffects = {
        ensureLottie,
        // Banners
        BANNER_EFFECTS,
        renderBannerEffect,
        removeBannerEffect,
        // Badges
        BADGE_EFFECTS,
        renderBadgeEffect,
        applyBadgeEffects,
    };

})();
