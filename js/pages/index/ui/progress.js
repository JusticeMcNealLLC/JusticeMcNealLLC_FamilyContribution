export function startProgress() {
    const bar = document.getElementById('progressBar');
    if (!bar) return;

    requestAnimationFrame(() => {
        bar.style.width = '100%';
    });
}
