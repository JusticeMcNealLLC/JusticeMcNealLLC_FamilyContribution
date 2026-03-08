// Settings page functionality

let settingsUser = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    const user = await checkAuth();
    if (!user) return;
    settingsUser = user;

    // Display email
    const accountEmailEl = document.getElementById('accountEmail');
    if (accountEmailEl) {
        accountEmailEl.textContent = user.email;
    }

    // Load profile data for editing
    await loadProfile(user.id);

    // Load subscription for billing info
    await loadSubscription(user.id);

    // Set up profile editing (photo + name)
    setupProfileEditing();

    // Set up password change
    setupPasswordChange();

    // Set up billing buttons
    setupBillingButtons();
});

// ─── Profile Loading & Editing ──────────────────────────
async function loadProfile(userId) {
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('first_name, last_name, profile_picture_url')
            .eq('id', userId)
            .single();

        if (error) throw error;

        const firstNameInput = document.getElementById('settingsFirstName');
        const lastNameInput = document.getElementById('settingsLastName');
        const avatarImage = document.getElementById('avatarImage');
        const avatarInitials = document.getElementById('avatarInitials');

        if (profile.first_name) firstNameInput.value = profile.first_name;
        if (profile.last_name) lastNameInput.value = profile.last_name;

        if (profile.profile_picture_url) {
            // Add cache-buster so updated photos show immediately
            avatarImage.src = profile.profile_picture_url + '?t=' + Date.now();
            avatarImage.classList.remove('hidden');
            avatarInitials.classList.add('hidden');
        } else {
            // Show initials fallback
            const fi = (profile.first_name || '')[0] || '';
            const li = (profile.last_name || '')[0] || '';
            avatarInitials.textContent = (fi + li).toUpperCase() || '?';
        }
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

function setupProfileEditing() {
    const photoWrapper = document.getElementById('profilePhotoWrapper');
    const photoInput = document.getElementById('profilePhotoInput');
    const saveBtn = document.getElementById('saveProfileBtn');
    const avatarDisplay = document.getElementById('avatarDisplay');

    // Click avatar to trigger file picker
    if (photoWrapper) {
        photoWrapper.addEventListener('click', () => photoInput.click());
    }

    // Handle file selection
    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) handleProfilePhoto(file);
        });
    }

    // Drag & drop on entire profile section
    const profileSection = photoWrapper?.closest('section') || photoWrapper?.closest('.bg-white');
    if (profileSection) {
        profileSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            avatarDisplay?.classList.add('ring-4', 'ring-brand-300', 'ring-offset-2');
        });
        profileSection.addEventListener('dragleave', (e) => {
            if (!profileSection.contains(e.relatedTarget)) {
                avatarDisplay?.classList.remove('ring-4', 'ring-brand-300', 'ring-offset-2');
            }
        });
        profileSection.addEventListener('drop', (e) => {
            e.preventDefault();
            avatarDisplay?.classList.remove('ring-4', 'ring-brand-300', 'ring-offset-2');
            const file = e.dataTransfer.files?.[0];
            if (file && file.type.startsWith('image/')) handleProfilePhoto(file);
        });
    }

    // Save profile button
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSaveProfile);
    }
}

async function handleProfilePhoto(file) {
    hideError('profileError');
    hideError('profileSuccess');

    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
        showError('profileError', 'Please upload a JPG, PNG, WebP, or GIF file');
        return;
    }

    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
        showError('profileError', 'Photo must be under 2MB');
        return;
    }

    const progress = document.getElementById('photoUploadProgress');
    const avatarImage = document.getElementById('avatarImage');
    const avatarInitials = document.getElementById('avatarInitials');
    progress.classList.remove('hidden');

    try {
        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (e) => {
            avatarImage.src = e.target.result;
            avatarImage.classList.remove('hidden');
            avatarInitials.classList.add('hidden');
        };
        reader.readAsDataURL(file);

        // Upload to Supabase Storage
        const ext = file.name.split('.').pop();
        const filePath = `${settingsUser.id}/avatar.${ext}`;

        const { error: uploadError } = await supabaseClient.storage
            .from('profile-pictures')
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL and save to profile
        const { data: urlData } = supabaseClient.storage
            .from('profile-pictures')
            .getPublicUrl(filePath);

        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({
                profile_picture_url: urlData.publicUrl,
                updated_at: new Date().toISOString(),
            })
            .eq('id', settingsUser.id);

        if (updateError) throw updateError;

        progress.classList.add('hidden');
        showSuccess('profileSuccess', 'Photo updated!');
        setTimeout(() => hideError('profileSuccess'), 2500);

    } catch (error) {
        console.error('Photo upload error:', error);
        progress.classList.add('hidden');
        showError('profileError', 'Upload failed: ' + (error.message || 'Please try again'));
    }
}

async function handleSaveProfile() {
    hideError('profileError');
    hideError('profileSuccess');

    const firstName = document.getElementById('settingsFirstName').value.trim();
    const lastName = document.getElementById('settingsLastName').value.trim();
    const saveBtn = document.getElementById('saveProfileBtn');

    if (!firstName) {
        showError('profileError', 'First name is required');
        return;
    }
    if (!lastName) {
        showError('profileError', 'Last name is required');
        return;
    }

    setButtonLoading(saveBtn, true, 'Save Profile');

    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({
                first_name: firstName,
                last_name: lastName,
                updated_at: new Date().toISOString(),
            })
            .eq('id', settingsUser.id);

        if (error) throw error;

        // Update avatar initials in case name changed and no photo
        const avatarImage = document.getElementById('avatarImage');
        if (avatarImage.classList.contains('hidden')) {
            const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase();
            document.getElementById('avatarInitials').textContent = initials;
        }

        showSuccess('profileSuccess', 'Profile saved!');
        setTimeout(() => hideError('profileSuccess'), 2500);

    } catch (error) {
        showError('profileError', error.message || 'Failed to save profile');
    } finally {
        setButtonLoading(saveBtn, false, 'Save Profile');
    }
}

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
