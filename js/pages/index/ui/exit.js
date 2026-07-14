import { EXIT_ANIMATION_TIME } from '../state/timing.js';
import { SPLASH_HANDOFF_KEY, prefersReducedMotion } from '../../shared/handoff.js';

function isLoginDestination(url) {
    const loginPath = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.LOGIN_URL) || '/pages/login/';
    try {
        const target = new URL(url, window.location.origin);
        const login = new URL(loginPath, window.location.origin);
        return target.pathname.replace(/\/$/, '') === login.pathname.replace(/\/$/, '');
    } catch (_) {
        return String(url).includes('/pages/login');
    }
}

function freezeSplashAnimations(root) {
    root.querySelectorAll(
        '.splash-logo-wrap, .brand-name, .brand-tagline, .splash-progress, #logoContainer, #logoImage, .logo-glow'
    ).forEach((el) => {
        el.getAnimations?.().forEach((anim) => anim.cancel());
        el.style.animation = 'none';
    });
}

function playSplashHandoffOut(content) {
    const reduced = prefersReducedMotion();
    const logoDuration = reduced ? 1 : 520;
    const copyDuration = reduced ? 1 : 360;
    const isWide = window.matchMedia('(min-width: 640px)').matches;
    const logoEnd = {
        opacity: 0,
        transform: `scale(${isWide ? 0.38 : 0.42}) translateY(${isWide ? -88 : -72}px)`,
    };

    const waits = [];

    const glow = content.querySelector('.logo-glow');
    if (glow) {
        waits.push(glow.animate(
            [{ opacity: 0.45 }, { opacity: 0 }],
            { duration: reduced ? 1 : 220, easing: 'ease', fill: 'forwards' }
        ).finished);
    }

    content.querySelectorAll('.brand-name, .brand-tagline, .splash-progress').forEach((el) => {
        waits.push(el.animate(
            [
                { opacity: 1, transform: 'translateY(0px)' },
                { opacity: 0, transform: 'translateY(-12px)' },
            ],
            { duration: copyDuration, easing: 'ease', fill: 'forwards' }
        ).finished);
    });

    const logo = content.querySelector('.splash-logo-wrap');
    if (logo) {
        waits.push(logo.animate(
            [
                { opacity: 1, transform: 'scale(1) translateY(0px)' },
                logoEnd,
            ],
            { duration: logoDuration, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
        ).finished);
    }

    return Promise.all(waits.map((p) => p.catch(() => {})));
}

async function runLoginHandoff(url) {
    try {
        sessionStorage.setItem(SPLASH_HANDOFF_KEY, '1');
    } catch (_) { /* ignore */ }

    const content = document.getElementById('splashContent');
    if (!content) {
        window.location.href = url;
        return;
    }

    freezeSplashAnimations(content);
    document.body.classList.add('splash-handoff');

    await playSplashHandoffOut(content);
    window.location.href = url;
}

export function exitSplash(url) {
    if (isLoginDestination(url)) {
        void runLoginHandoff(url);
        return;
    }

    const content = document.getElementById('splashContent');
    if (content) {
        content.classList.add('splash-exit');
    }

    document.body.style.transition = `opacity ${EXIT_ANIMATION_TIME}ms ease`;
    document.body.style.opacity = '0';

    setTimeout(() => {
        window.location.href = url;
    }, EXIT_ANIMATION_TIME);
}
