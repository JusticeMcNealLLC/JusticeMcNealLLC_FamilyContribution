export function bindSuccessBanner() {
    const urlParams = new URLSearchParams(window.location.search);
    const successBanner = document.getElementById('successBanner');
    const closeBtn = document.getElementById('closeSuccessBanner');
    const successMessage = document.getElementById('successMessage');
    const successSubtext = document.getElementById('successSubtext');

    const isSuccess = urlParams.get('success') === 'true';
    const isExtraDeposit = urlParams.get('extra_deposit') === 'true';

    if ((isSuccess || isExtraDeposit) && successBanner) {
        successBanner.classList.remove('hidden');

        if (isExtraDeposit) {
            if (successMessage) successMessage.textContent = 'Extra deposit received!';
            if (successSubtext) {
                successSubtext.textContent = 'Your one-time contribution has been processed. Thank you!';
            }
        }

        window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (closeBtn && successBanner) {
        closeBtn.addEventListener('click', () => {
            successBanner.classList.add('hidden');
        });
    }
}
