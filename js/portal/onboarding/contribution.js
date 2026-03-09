// ══════════════════════════════════════════
// Onboarding – Contribution Step & Stripe Checkout
// Depends on: state.js (selectedAmount, profileData, currentUser, showError, hideError)
//             config.js (APP_CONFIG, callEdgeFunction, supabaseClient)
// ══════════════════════════════════════════

function setupContributionStep() {
    // If member already has an active subscription (e.g. after onboarding reset),
    // replace the amount picker with a "current plan" summary
    if (existingSubscription) {
        const contentEl = document.getElementById('contributionStepContent');
        if (!contentEl) return;

        const amountDisplay = existingSubscription.current_amount_cents
            ? '$' + (existingSubscription.current_amount_cents / 100).toFixed(0)
            : '';
        contentEl.innerHTML = `
                <div class="text-center mb-6">
                    <div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h2 class="text-xl font-extrabold text-gray-900 tracking-tight">Subscription active</h2>
                    <p class="text-gray-500 text-sm mt-1">You already have an active contribution</p>
                </div>
                <div class="bg-emerald-50 rounded-xl p-5 mb-5 border border-emerald-200 text-center">
                    <p class="text-sm text-emerald-700 font-medium">Current plan</p>
                    <p class="text-3xl font-extrabold text-emerald-800 mt-1">${amountDisplay}<span class="text-base font-semibold text-emerald-600">/mo</span></p>
                </div>
                <p class="text-xs text-gray-400 text-center mb-5">You can change your amount anytime from the portal settings.</p>
                <div class="flex gap-3">
                    <button type="button" id="contributionBackBtn" class="flex-1 bg-surface-100 hover:bg-surface-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition text-sm">
                        Back
                    </button>
                    <button type="button" id="keepPlanBtn" class="flex-[2] bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold py-3 px-4 rounded-xl transition text-sm shadow-sm shadow-brand-200">
                        Continue
                    </button>
                </div>
            `;
            // Wire up the new buttons
            contentEl.querySelector('#contributionBackBtn').addEventListener('click', () => prevStep());
            contentEl.querySelector('#keepPlanBtn').addEventListener('click', () => finishOnboarding());
        return;
    }

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

// ── Bank Link (Stripe Connect onboarding) ──
async function handleBankLinkOnboarding() {
    const btn = document.getElementById('startBankLinkBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-white mx-auto" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        `;
    }

    try {
        // Save profile first so data is persisted before redirect
        await saveProfile();

        const result = await callEdgeFunction('create-connect-onboarding', {});

        if (result.url) {
            window.location.href = result.url;
        } else {
            throw new Error('No onboarding URL received');
        }
    } catch (error) {
        console.error('Bank link error:', error);
        showError('bankLinkError', error.message || 'Failed to start bank setup. You can do this later from Settings.');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Link Bank Account';
        }
    }
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

        goToStep(6);

    } catch (error) {
        console.error('Onboarding save error:', error);
        showError('contributionError', 'Failed to save profile: ' + (error.message || 'Please try again'));
        if (finishBtn) {
            finishBtn.disabled = false;
            finishBtn.textContent = 'Finish Setup';
        }
    }
}
