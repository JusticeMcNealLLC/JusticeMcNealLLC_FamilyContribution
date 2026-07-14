export function bindActivityCarousel() {
    const track = document.getElementById('activityTrack');
    const dots = document.getElementById('activityDots');
    if (!track || !dots) return;

    const allDots = dots.querySelectorAll('span');
    let idx = 0;
    let startX = 0;

    function go(i) {
        idx = Math.max(0, Math.min(i, track.children.length - 1));
        track.style.transform = `translateX(-${idx * 100}%)`;
        allDots.forEach((dot, j) => {
            dot.className = 'dashboard-carousel-dot' + (j === idx ? ' dashboard-carousel-dot--active' : '');
        });
    }

    track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
    });

    allDots.forEach((dot, j) => {
        dot.addEventListener('click', () => go(j));
    });
}
