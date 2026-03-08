// ══════════════════════════════════════════
// Onboarding – Contribution Step & Stripe Checkout
// Depends on: state.js (selectedAmount, profileData, currentUser, showError, hideError)
//             config.js (APP_CONFIG, callEdgeFunction, supabaseClient)
// ══════════════════════════════════════════

function setupContributionStep() {
    const presetBtns = document.querySelectorAll('.amount-preset-btn');
    const customWrapper = document.getElementById('customAmountWrapper');
    const customInput = document.getElementById('contributionCustomAmount');

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active state from all
            presetBtns.forEach(b => {
                b.classList.remove('border-brand-500', 'bg-brand-50', 'text-brand-700');
                b.classList.add('border-gray-200', 'text-gray-700');
            });

            // Add active state
            btn.classList.remove('border-gray-200', 'text-gray-700');
            btn.classList.add('border-brand-500', 'bg-brand-50', 'text-brand-700');

            const val = btn.dataset.amount;
            if (val === 'custom') {
                customWrapper.classList.remove('hidden');
                customInput.focus();
                selectedAmount = null;
            } else {
                customWrapper.classList.add('hidden');
                selectedAmount = parseInt(val, 10);
            }
            hideError('contributionError');
        });
    });

    customInput?.addEventListener('input', () => {
        const v = parseInt(customInput.value, 10);
        selectedAmount = isNaN(v) ? null : v;
        hideError('contributionError');
    });
}

async function handleStartContribution() {
    hideError('contributionError');

    // If custom is showing, read from input
    const customWrapper = document.getElementById('customAmountWrapper');
    if (!customWrapper.classList.contains('hidden')) {
        const customInput = document.getElementById('contributionCustomAmount');
        selectedAmount = parseInt(customInput.value, 10);
    }

    if (!selectedAmount || isNaN(selectedAmount)) {
        showError('contributionError', 'Please select a contribution amount');
        return;
    }

    if (selectedAmount < APP_CONFIG.MIN_AMOUNT || selectedAmount > APP_CONFIG.MAX_AMOUNT) {
        showError('contributionError', `Amount must be between $${APP_CONFIG.MIN_AMOUNT} and $${APP_CONFIG.MAX_AMOUNT}`);
        return;
    }

    if (selectedAmount !== Math.floor(selectedAmount)) {
        showError('contributionError', 'Please enter a whole dollar amount (no cents)');
        return;
    }

    const btn = document.getElementById('startContributionBtn');
    btn.disabled = true;
    btn.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-white mx-auto" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    `;

    try {
        // Save profile first so setup_completed is true before Stripe redirect
        await saveProfile();

        const result = await callEdgeFunction('create-checkout-session', {
            amount_dollars: selectedAmount,
        });

        if (result.url) {
            window.location.href = result.url;
        } else {
            throw new Error('No checkout URL received');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showError('contributionError', error.message || 'Failed to start subscription');
        btn.disabled = false;
        btn.textContent = 'Start Subscription';
    }
}

// ── Save Profile (reusable) ──
async function saveProfile() {
    const updatePayload = {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        setup_completed: true,
        updated_at: new Date().toISOString(),
    };

    if (profileData.birthday) {
        updatePayload.birthday = profileData.birthday;
    }

    if (profileData.profile_picture_url) {
        updatePayload.profile_picture_url = profileData.profile_picture_url;
    }

    const { error } = await supabaseClient
        .from('profiles')
        .update(updatePayload)
        .eq('id', currentUser.id);

    if (error) throw error;
}

// ── Finish Onboarding ──
async function finishOnboarding() {
    const finishBtn = document.getElementById('finishBtn');
    if (finishBtn) {
        finishBtn.disabled = true;
        finishBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-white mx-auto" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        `;
    }

    try {
        await saveProfile();

        // Show completion step
        const completionName = document.getElementById('completionName');
        if (completionName && profileData.first_name) {
            completionName.textContent = `Welcome to the family, ${profileData.first_name}!`;
        }

        goToStep(5);

    } catch (error) {
        console.error('Onboarding save error:', error);
        showError('contributionError', 'Failed to save profile: ' + (error.message || 'Please try again'));
        if (finishBtn) {
            finishBtn.disabled = false;
            finishBtn.textContent = 'Finish Setup';
        }
    }
}
