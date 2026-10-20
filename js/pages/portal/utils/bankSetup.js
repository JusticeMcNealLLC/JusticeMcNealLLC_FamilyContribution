export async function openBankSetup() {
    try {
        const result = await callEdgeFunction('create-bank-setup-session');

        if (result.url) {
            window.location.href = result.url;
        }
    } catch (error) {
        console.error('Error opening bank setup:', error);
        alert(error.message || 'Failed to open bank setup. Please try again.');
    }
}

export function setupManualBankForm() {
    const toggleBtn = document.getElementById('linkBankManualBtn');
    const form = document.getElementById('manualBankForm');
    const submitBtn = document.getElementById('manualBankSubmit');
    const noticeEl = document.getElementById('bankSetupNotice');
    const errorEl = document.getElementById('bankSetupError');
    if (!toggleBtn || !form) return;

    toggleBtn.addEventListener('click', () => form.classList.toggle('hidden'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';

        try {
            const result = await callEdgeFunction('create-bank-setup-session', {
                manual: true,
                account_holder_name: document.getElementById('bankHolderName').value,
                routing_number: document.getElementById('bankRouting').value,
                account_number: document.getElementById('bankAccount').value,
                account_type: document.getElementById('bankAccountType').value,
            });

            form.reset();
            form.classList.add('hidden');
            noticeEl.textContent = '';
            noticeEl.append('Bank account submitted. Stripe will send a small deposit in 1–2 business days. Your contribution switches to this bank once you confirm it. ');
            if (result.verification_url) {
                const link = document.createElement('a');
                link.href = result.verification_url;
                link.target = '_blank';
                link.rel = 'noopener';
                link.className = 'underline font-semibold';
                link.textContent = 'Save this verification link';
                noticeEl.append(link);
            }
            noticeEl.classList.remove('hidden');
        } catch (error) {
            console.error('Manual bank setup failed:', error);
            errorEl.textContent = error.message || 'Could not submit bank account. Please try again.';
            errorEl.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Bank Account';
        }
    });
}

export function showBankSetupReturnNotice(noticeEl) {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('bank');
    if (!status || !noticeEl) return;

    if (status === 'submitted') {
        noticeEl.textContent = 'Bank account linked. Your contribution will use it starting with your next payment.';
        noticeEl.classList.remove('hidden');
    }

    params.delete('bank');
    const query = params.toString();
    history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : ''));
}
