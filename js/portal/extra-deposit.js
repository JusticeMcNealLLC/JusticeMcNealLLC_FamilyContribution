// Extra Deposit page functionality

document.addEventListener('DOMContentLoaded', async function() {
    // Check for canceled parameter
    checkForCanceled();

    // Check authentication
    const user = await checkAuth();
    if (!user) return;

    // Set up form and quick-select buttons
    setupExtraDepositForm();
});

function checkForCanceled() {
    const urlParams = new URLSearchParams(window.location.search);
    const canceledBanner = document.getElementById('canceledBanner');

    if (urlParams.get('canceled') === 'true' && canceledBanner) {
        canceledBanner.classList.remove('hidden');

        // Clean URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
}

function setupExtraDepositForm() {
    const form = document.getElementById('extraDepositForm');
    const amountInput = document.getElementById('depositAmount');
    const quickBtns = document.querySelectorAll('.quick-amount-btn');

    // Quick amount buttons
    quickBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = this.getAttribute('data-amount');
            amountInput.value = amount;

            // Update active state
            quickBtns.forEach(b => {
                b.classList.remove('border-teal-500', 'bg-teal-50', 'text-teal-700');
                b.classList.add('border-gray-200', 'text-gray-700');
            });
            this.classList.remove('border-gray-200', 'text-gray-700');
            this.classList.add('border-teal-500', 'bg-teal-50', 'text-teal-700');

            hideError('depositError');
        });
    });

    // Clear quick-select highlight when typing custom amount
    if (amountInput) {
        amountInput.addEventListener('input', function() {
            const val = parseInt(this.value, 10);
            quickBtns.forEach(b => {
                const btnVal = parseInt(b.getAttribute('data-amount'), 10);
                if (btnVal === val) {
                    b.classList.remove('border-gray-200', 'text-gray-700');
                    b.classList.add('border-teal-500', 'bg-teal-50', 'text-teal-700');
                } else {
                    b.classList.remove('border-teal-500', 'bg-teal-50', 'text-teal-700');
                    b.classList.add('border-gray-200', 'text-gray-700');
                }
            });
        });
    }

    // Form submit
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleExtraDeposit();
        });
    }
}

async function handleExtraDeposit() {
    const amountInput = document.getElementById('depositAmount');
    const depositBtn = document.getElementById('depositBtn');
    const amount = parseInt(amountInput.value, 10);

    // Validate
    hideError('depositError');

    if (isNaN(amount) || amount < 5 || amount > 500) {
        showError('depositError', 'Amount must be between $5 and $500');
        return;
    }

    if (amount !== Math.floor(amount)) {
        showError('depositError', 'Please enter a whole dollar amount (no cents)');
        return;
    }

    setButtonLoading(depositBtn, true, 'Continue to Payment');

    try {
        const result = await callEdgeFunction('create-extra-deposit', {
            amount_dollars: amount,
        });

        if (result.url) {
            // Redirect to Stripe Checkout
            window.location.href = result.url;
        } else {
            throw new Error('No checkout URL received');
        }

    } catch (error) {
        showError('depositError', error.message || 'Failed to create payment session');
        setButtonLoading(depositBtn, false, 'Continue to Payment');
    }
}
