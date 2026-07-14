export function spawnParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    for (let i = 0; i < 12; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = (50 + Math.random() * 40) + '%';
        p.style.animationDelay = (Math.random() * 3) + 's';
        p.style.animationDuration = (2 + Math.random() * 2) + 's';
        const size = 3 + Math.random() * 4;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        const useAccent = Math.random() > 0.65;
        const alpha = 0.15 + Math.random() * 0.25;
        p.style.background = useAccent
            ? `rgba(14, 139, 139, ${alpha})`
            : `rgba(19, 54, 110, ${alpha})`;
        container.appendChild(p);
    }
}
