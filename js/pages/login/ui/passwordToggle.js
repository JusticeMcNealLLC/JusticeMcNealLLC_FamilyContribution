export function bindPasswordToggle(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(buttonId);
    if (!input || !btn) return;

    const showIcon = btn.querySelector('[data-eye-show]');
    const hideIcon = btn.querySelector('[data-eye-hide]');
    const showLabel = btn.getAttribute('aria-label') || 'Show password';
    const hideLabel = showLabel.replace(/^Show /i, 'Hide ');

    btn.addEventListener('click', () => {
        const revealing = input.type === 'password';
        input.type = revealing ? 'text' : 'password';
        btn.setAttribute('aria-label', revealing ? hideLabel : showLabel);
        btn.setAttribute('aria-pressed', revealing ? 'true' : 'false');
        showIcon?.classList.toggle('hidden', revealing);
        hideIcon?.classList.toggle('hidden', !revealing);
    });
}
