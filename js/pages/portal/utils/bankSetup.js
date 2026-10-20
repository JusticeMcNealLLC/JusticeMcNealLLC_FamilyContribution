export async function openBankSetup({ manual = false } = {}) {
    try {
        const result = await callEdgeFunction('create-bank-setup-session', { manual });

        if (result.url) {
            window.location.href = result.url;
        }
    } catch (error) {
        console.error('Error opening bank setup:', error);
        alert(error.message || 'Failed to open bank setup. Please try again.');
    }
}

export function showBankSetupReturnNotice(noticeEl) {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('bank');
    if (!status || !noticeEl) return;

    if (status === 'submitted') {
        noticeEl.textContent = 'Bank account submitted. If you entered it manually, watch for a small deposit from Stripe in 1–2 business days and confirm it from Stripe\'s email. Your contribution switches to the bank once it\'s verified.';
        noticeEl.classList.remove('hidden');
    }

    params.delete('bank');
    const query = params.toString();
    history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : ''));
}
