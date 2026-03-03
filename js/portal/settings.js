// Settings page functionality

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    const user = await checkAuth();
    if (!user) return;

    // Display email
    const accountEmailEl = document.getElementById('accountEmail');
    if (accountEmailEl) {
        accountEmailEl.textContent = user.email;
    }

    // Load subscription for billing info
    await loadSubscription(user.id);

    // Set up password change
    setupPasswordChange();

    // Set up billing buttons
    setupBillingButtons();
});

function setupPasswordChange() {
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
    const passwordForm = document.getElementById('passwordForm');

    // Show password form
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            changePasswordForm.classList.remove('hidden');
            changePasswordBtn.classList.add('hidden');
        });
    }

    // Hide password form
    if (cancelPasswordBtn) {
        cancelPasswordBtn.addEventListener('click', function() {
            changePasswordForm.classList.add('hidden');
            changePasswordBtn.classList.remove('hidden');
            passwordForm.reset();
            hideError('passwordError');
        });
    }

    // Handle password change
    if (passwordForm) {
        passwordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handlePasswordChange();
        });
    }
}

async function handlePasswordChange() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const savePasswordBtn = document.getElementById('savePasswordBtn');

    hideError('passwordError');

    // Validate
    if (newPassword.length < 8) {
        showError('passwordError', 'Password must be at least 8 characters');
        return;
    }

    if (newPassword !== confirmPassword) {
        showError('passwordError', 'Passwords do not match');
        return;
    }

    setButtonLoading(savePasswordBtn, true, 'Update Password');

    try {
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword,
        });

        if (error) throw error;

        showSuccess('passwordSuccess', 'Password updated successfully!');
        document.getElementById('passwordForm').reset();
        
        setTimeout(() => {
            document.getElementById('changePasswordForm').classList.add('hidden');
            document.getElementById('changePasswordBtn').classList.remove('hidden');
            hideError('passwordSuccess');
        }, 2000);

    } catch (error) {
        showError('passwordError', error.message || 'Failed to update password');
    } finally {
        setButtonLoading(savePasswordBtn, false, 'Update Password');
    }
}

function setupBillingButtons() {
    const updatePaymentBtn = document.getElementById('updatePaymentBtn');
    const cancelSubscriptionBtn = document.getElementById('cancelSubscriptionBtn');

    // Update payment method
    if (updatePaymentBtn) {
        updatePaymentBtn.addEventListener('click', async function() {
            await openBillingPortalWithFlow('payment_method_update');
        });
    }

    // Cancel subscription
    if (cancelSubscriptionBtn) {
        cancelSubscriptionBtn.addEventListener('click', async function() {
            const confirmed = confirm(
                'Are you sure you want to cancel your subscription? ' +
                'Your contribution will stop at the end of your current billing period.'
            );
            
            if (confirmed) {
                await openBillingPortalWithFlow('subscription_cancel');
            }
        });
    }

    // Load payment method display (placeholder for now)
    const paymentMethodEl = document.getElementById('paymentMethod');
    if (paymentMethodEl) {
        paymentMethodEl.textContent = 'Card on file';
    }
}

async function openBillingPortalWithFlow(flowType) {
    try {
        const result = await callEdgeFunction('create-billing-portal', {
            flow_type: flowType,
        });
        
        if (result.url) {
            window.location.href = result.url;
        }
    } catch (error) {
        console.error('Error opening billing portal:', error);
        alert('Failed to open billing portal. Please try again.');
    }
}
