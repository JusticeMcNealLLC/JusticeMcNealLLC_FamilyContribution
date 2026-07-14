import { prefersReducedMotion } from '../../shared/handoff.js';

function clearHandoffStyles(el) {
    if (!el) return;
    el.style.opacity = '';
    el.style.transform = '';
    el.style.visibility = '';
}

export function runHandoffEntrance() {
    const root = document.documentElement;
    if (!root.classList.contains('login-handoff-pending')) {
        return;
    }

    const reduced = prefersReducedMotion();
    const panel = document.querySelector('.login-panel');
    const footer = document.querySelector('.login-footer');
    const animations = [];

    if (panel) {
        panel.style.visibility = 'visible';
        animations.push(panel.animate(
            [
                { opacity: 0, transform: 'scale(1.06) translateY(-10px)' },
                { opacity: 1, transform: 'scale(1) translateY(0px)' },
            ],
            {
                duration: reduced ? 1 : 520,
                easing: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
                fill: 'forwards',
            }
        ));
    }

    if (footer) {
        footer.style.visibility = 'visible';
        animations.push(footer.animate(
            [
                { opacity: 0, transform: 'translateY(8px)' },
                { opacity: 1, transform: 'translateY(0px)' },
            ],
            {
                duration: reduced ? 1 : 380,
                delay: reduced ? 0 : 220,
                easing: 'ease-out',
                fill: 'forwards',
            }
        ));
    }

    // Start animations before dropping the guard class so nothing flashes visible.
    root.classList.remove('login-handoff-pending');

    Promise.all(animations.map((anim) => anim.finished.catch(() => {}))).then(() => {
        clearHandoffStyles(panel);
        clearHandoffStyles(footer);
    });
}
