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

    // Load payout settings
    await loadPayoutSettings(user.id);

    // Load badge picker
    await loadBadgePicker(user.id);

    // Set up profile editing (photo + name)
    setupProfileEditing();

    // Set up password change
    setupPasswordChange();

    // Set up billing buttons
    setupBillingButtons();

    // Set up push notification toggle
    setupPushToggle();
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

// ─── Badge Picker ────────────────────────────────────────
let _settingsActiveBadge = null;
let _settingsEarnedBadges = [];
let _badgeFilter = 'all';     // active rarity filter
let _badgePage = 0;            // current page (0-indexed)
const BADGES_PER_PAGE = 6;    // 3 wide × 2 tall

async function loadBadgePicker(userId) {
    try {
        // Fetch profile for current badge + photo
        const [profileRes, badgesRes] = await Promise.all([
            supabaseClient
                .from('profiles')
                .select('first_name, last_name, profile_picture_url, displayed_badge')
                .eq('id', userId)
                .single(),
            supabaseClient
                .from('member_badges')
                .select('badge_key, is_displayed, created_at')
                .eq('user_id', userId),
        ]);

        const profile = profileRes.data;
        _settingsEarnedBadges = badgesRes.data || [];
        _settingsActiveBadge = profile?.displayed_badge || null;

        // Render preview avatar with current badge
        renderBadgePreview(profile);

        // Render badge selection grid
        renderBadgeGrid();

        // Wire remove button
        const removeBtn = document.getElementById('removeBadgeBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => selectSettingsBadge(null));
        }

        // Wire filter pills
        document.querySelectorAll('.badge-filter-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.badge-filter-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                _badgeFilter = pill.dataset.filter;
                _badgePage = 0;
                renderBadgeGrid();
            });
        });

        // Wire pagination buttons
        const prevBtn = document.getElementById('badgePrevBtn');
        const nextBtn = document.getElementById('badgeNextBtn');
        if (prevBtn) prevBtn.addEventListener('click', () => { _badgePage--; renderBadgeGrid(); });
        if (nextBtn) nextBtn.addEventListener('click', () => { _badgePage++; renderBadgeGrid(); });
    } catch (err) {
        console.error('Error loading badge picker:', err);
    }
}

function renderBadgePreview(profile) {
    const initialsEl = document.getElementById('badgePreviewInitials');
    const imgEl = document.getElementById('badgePreviewImg');
    const overlayEl = document.getElementById('badgePreviewOverlay');
    const nameEl = document.getElementById('activeBadgeName');
    const descEl = document.getElementById('activeBadgeDesc');
    const removeWrap = document.getElementById('removeBadgeWrap');

    if (!profile) return;

    // Avatar
    const fi = (profile.first_name || '')[0] || '';
    const li = (profile.last_name || '')[0] || '';
    if (initialsEl) initialsEl.textContent = (fi + li).toUpperCase() || '?';
    if (profile.profile_picture_url && imgEl) {
        imgEl.src = profile.profile_picture_url + '?t=' + Date.now();
        imgEl.classList.remove('hidden');
        if (initialsEl) initialsEl.classList.add('hidden');
    }

    // Badge overlay
    if (overlayEl) {
        if (_settingsActiveBadge && typeof buildNavBadgeOverlay === 'function') {
            overlayEl.innerHTML = buildNavBadgeOverlay(_settingsActiveBadge);
        } else {
            overlayEl.innerHTML = '';
        }
    }

    // Badge name / description
    if (_settingsActiveBadge) {
        const badge = typeof getBadge === 'function' ? getBadge(_settingsActiveBadge) : { emoji: '❓', name: _settingsActiveBadge, description: '', rarity: 'common' };
        const rarity = typeof getBadgeRarity === 'function' ? getBadgeRarity(_settingsActiveBadge) : { label: 'Common', color: 'gray', cssClass: '' };
        if (nameEl) nameEl.innerHTML = `${badge.emoji} ${badge.name} <span class="text-xs font-medium rarity-${badge.rarity || 'common'}">${rarity.label}</span>`;
        if (descEl) descEl.textContent = badge.description;
        if (removeWrap) removeWrap.classList.remove('hidden');
    } else {
        if (nameEl) nameEl.textContent = 'No badge selected';
        if (descEl) descEl.textContent = 'Complete quests to earn badges';
        if (removeWrap) removeWrap.classList.add('hidden');
    }
}

function renderBadgeGrid() {
    const container = document.getElementById('settingsBadgeGrid');
    if (!container) return;

    const allKeys = typeof BADGE_CATALOG !== 'undefined' ? Object.keys(BADGE_CATALOG) : [];
    const earnedKeys = _settingsEarnedBadges.map(b => b.badge_key);

    if (allKeys.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-4 text-sm text-gray-400">Badge system loading…</div>';
        return;
    }

    // Apply rarity filter
    const filtered = _badgeFilter === 'all'
        ? allKeys
        : allKeys.filter(k => (getBadge(k).rarity || 'common') === _badgeFilter);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / BADGES_PER_PAGE));
    if (_badgePage >= totalPages) _badgePage = totalPages - 1;
    if (_badgePage < 0) _badgePage = 0;
    const start = _badgePage * BADGES_PER_PAGE;
    const pageKeys = filtered.slice(start, start + BADGES_PER_PAGE);

    if (pageKeys.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-6 text-sm text-gray-400">No badges in this category yet</div>';
    } else {
        container.innerHTML = pageKeys.map(key => {
            const badge = getBadge(key);
            const rarity = getBadgeRarity(key);
            const isEarned = earnedKeys.includes(key);
            const isActive = _settingsActiveBadge === key;

            return `
                <div class="badge-picker-card ${isActive ? 'badge-active' : ''} ${!isEarned ? 'badge-locked' : ''} bg-white rounded-xl border-2 ${isActive ? 'border-brand-500' : 'border-gray-100'} p-2.5 text-center"
                     data-badge-detail="${key}" ${isEarned ? `data-badge-pick="${key}"` : ''}>
                    <div class="flex justify-center mb-1.5">
                        ${buildBadgeChip(key, 'md')}
                    </div>
                    <div class="text-[10px] font-semibold text-gray-700 leading-tight mb-0.5 truncate">${badge.name}</div>
                    <div class="text-[9px] font-medium rarity-${badge.rarity || 'common'}">${rarity.label}</div>
                    ${isActive ? '<div class="text-[9px] text-brand-600 font-semibold mt-0.5">✓ Active</div>' : ''}
                    ${!isEarned ? '<div class="text-[9px] text-gray-400 mt-0.5">🔒 Locked</div>' : ''}
                </div>
            `;
        }).join('');
    }

    // Pagination controls
    _renderBadgePagination(totalPages);

    // Wire click: earned → select badge, all → long press / detail
    container.querySelectorAll('[data-badge-pick]').forEach(el => {
        el.addEventListener('click', (e) => {
            // Only select if not clicking the detail trigger area
            const key = el.dataset.badgePick;
            selectSettingsBadge(_settingsActiveBadge === key ? null : key);
        });
    });

    // Wire detail click on locked badges
    container.querySelectorAll('.badge-locked[data-badge-detail]').forEach(el => {
        el.addEventListener('click', () => openBadgeDetail(el.dataset.badgeDetail));
    });
}

function _renderBadgePagination(totalPages) {
    const paginationWrap = document.getElementById('badgePagination');
    const dotsWrap = document.getElementById('badgePageDots');
    const prevBtn = document.getElementById('badgePrevBtn');
    const nextBtn = document.getElementById('badgeNextBtn');
    if (!paginationWrap) return;

    if (totalPages <= 1) {
        paginationWrap.classList.add('hidden');
        return;
    }

    paginationWrap.classList.remove('hidden');
    if (prevBtn) prevBtn.disabled = _badgePage <= 0;
    if (nextBtn) nextBtn.disabled = _badgePage >= totalPages - 1;

    if (dotsWrap) {
        dotsWrap.innerHTML = Array.from({ length: totalPages }, (_, i) =>
            `<div class="badge-page-dot ${i === _badgePage ? 'active' : ''}" data-badge-page="${i}"></div>`
        ).join('');
        dotsWrap.querySelectorAll('[data-badge-page]').forEach(dot => {
            dot.addEventListener('click', () => {
                _badgePage = parseInt(dot.dataset.badgePage);
                renderBadgeGrid();
            });
        });
    }
}

/** Open a badge detail modal showing how to earn it. */
function openBadgeDetail(badgeKey) {
    const badge = typeof getBadge === 'function' ? getBadge(badgeKey) : { emoji: '❓', name: badgeKey, description: '', rarity: 'common' };
    const rarity = typeof getBadgeRarity === 'function' ? getBadgeRarity(badgeKey) : { label: 'Common', color: 'gray', cssClass: '' };
    const earnedKeys = _settingsEarnedBadges.map(b => b.badge_key);
    const isEarned = earnedKeys.includes(badgeKey);
    const isActive = _settingsActiveBadge === badgeKey;

    // Remove any existing modal
    const existing = document.getElementById('badgeDetailModal');
    if (existing) existing.remove();

    const rarityBg = { common: '#f3f4f6', rare: '#eff6ff', epic: '#faf5ff', legendary: '#fffbeb' };
    const backdrop = document.createElement('div');
    backdrop.id = 'badgeDetailModal';
    backdrop.className = 'badge-detail-backdrop';
    backdrop.innerHTML = `
        <div class="badge-detail-card">
            <div class="p-6 text-center" style="background: ${rarityBg[badge.rarity] || rarityBg.common}">
                <div class="flex justify-center mb-3">${buildBadgeChip(badgeKey, 'lg')}</div>
                <div class="text-base font-bold text-gray-900">${badge.name}</div>
                <div class="text-xs font-semibold rarity-${badge.rarity || 'common'} mt-1">${rarity.label}</div>
            </div>
            <div class="p-5">
                <div class="text-sm text-gray-600 leading-relaxed mb-4">
                    ${isEarned
                        ? `<span class="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs mb-2"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg> Earned</span><br>`
                        : '<div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">How to earn</div>'}
                    ${badge.description}
                </div>
                <div class="flex gap-2">
                    ${isEarned && !isActive
                        ? `<button id="badgeDetailSelect" class="flex-1 py-2 px-4 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition">Set as Active</button>`
                        : isActive
                        ? `<button id="badgeDetailRemove" class="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition">Remove Badge</button>`
                        : ''}
                    <button id="badgeDetailClose" class="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition">${isEarned ? 'Close' : 'Got it'}</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('open'));

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeBadgeDetail();
    });
    backdrop.querySelector('#badgeDetailClose')?.addEventListener('click', closeBadgeDetail);
    backdrop.querySelector('#badgeDetailSelect')?.addEventListener('click', () => {
        selectSettingsBadge(badgeKey);
        closeBadgeDetail();
    });
    backdrop.querySelector('#badgeDetailRemove')?.addEventListener('click', () => {
        selectSettingsBadge(null);
        closeBadgeDetail();
    });
}

function closeBadgeDetail() {
    const modal = document.getElementById('badgeDetailModal');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 150);
}

async function selectSettingsBadge(badgeKey) {
    try {
        if (!settingsUser) return;

        // Update profiles.displayed_badge
        const { error: profileErr } = await supabaseClient
            .from('profiles')
            .update({ displayed_badge: badgeKey })
            .eq('id', settingsUser.id);
        if (profileErr) throw profileErr;

        // Update member_badges is_displayed flags
        await supabaseClient
            .from('member_badges')
            .update({ is_displayed: false })
            .eq('user_id', settingsUser.id);

        if (badgeKey) {
            await supabaseClient
                .from('member_badges')
                .update({ is_displayed: true })
                .eq('user_id', settingsUser.id)
                .eq('badge_key', badgeKey);
        }

        _settingsActiveBadge = badgeKey;

        // Re-render preview + grid
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('first_name, last_name, profile_picture_url, displayed_badge')
            .eq('id', settingsUser.id)
            .single();
        renderBadgePreview(profile);
        renderBadgeGrid();

        // Update nav badge overlays immediately
        if (typeof _renderBadgeOverlays === 'function') {
            _renderBadgeOverlays(badgeKey);
        }

    } catch (err) {
        console.error('Error selecting badge:', err);
        alert('Failed to update badge. Please try again.');
    }
}

// ─── Payouts & Bank Account ─────────────────────────────
const PAYOUT_TYPES = [
    { key: 'birthday', label: 'Birthday Gifts', emoji: '🎂', desc: 'Receive a gift on your birthday' },
    { key: 'competition', label: 'Competitions', emoji: '🏆', desc: 'Prizes from quest competitions' },
    { key: 'bonus', label: 'Bonuses', emoji: '💰', desc: 'Admin-sent bonuses' },
    { key: 'profit_share', label: 'Profit Share', emoji: '📈', desc: 'Share of investment profits' },
    { key: 'referral', label: 'Referrals', emoji: '🤝', desc: 'Rewards for referring new members' },
    { key: 'quest_reward', label: 'Quest Rewards', emoji: '⭐', desc: 'Prizes for quest achievements' },
];

async function loadPayoutSettings(userId) {
    const statusEl = document.getElementById('bankAccountStatus');
    const linkBtn = document.getElementById('linkBankBtn');
    const updateBtn = document.getElementById('updateBankBtn');
    const enrollmentToggles = document.getElementById('enrollmentToggles');
    const myPayoutsList = document.getElementById('myPayoutsList');

    if (!statusEl) return; // element not on page

    try {
        // Check if payouts are globally enabled
        const { data: globalSetting } = await supabaseClient
            .from('app_settings')
            .select('value')
            .eq('key', 'payouts_enabled')
            .single();

        const payoutsEnabled = globalSetting?.value === true;

        if (!payoutsEnabled) {
            statusEl.innerHTML = '<span class="text-gray-400">Payouts are not available at this time</span>';
            if (enrollmentToggles) enrollmentToggles.innerHTML = '<div class="text-xs text-gray-400">Payouts are currently disabled</div>';
            return;
        }

        // Fetch profile for Connect status
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('stripe_connect_account_id, connect_onboarding_complete, payout_enrolled')
            .eq('id', userId)
            .single();

        if (!profile?.stripe_connect_account_id) {
            // No Connect account — show Link Bank button
            statusEl.innerHTML = '<span class="text-amber-600">Not linked</span>';
            if (linkBtn) {
                linkBtn.classList.remove('hidden');
                linkBtn.addEventListener('click', handleLinkBank);
            }
            if (enrollmentToggles) enrollmentToggles.innerHTML = '<div class="text-xs text-gray-400">Link a bank account to manage enrollment</div>';
        } else if (!profile.connect_onboarding_complete) {
            // Connect account exists but onboarding not complete
            statusEl.innerHTML = '<span class="text-amber-600">Setup incomplete</span>';
            if (updateBtn) {
                updateBtn.classList.remove('hidden');
                updateBtn.textContent = 'Finish Setup';
                updateBtn.addEventListener('click', handleLinkBank);
            }
            if (enrollmentToggles) enrollmentToggles.innerHTML = '<div class="text-xs text-amber-500">Complete bank setup to manage enrollment</div>';
        } else {
            // Fully connected
            statusEl.innerHTML = '<span class="text-emerald-600 font-semibold">Connected</span>';
            if (updateBtn) {
                updateBtn.classList.remove('hidden');
                updateBtn.addEventListener('click', handleLinkBank);
            }

            // Load and show enrollment toggles
            await renderEnrollmentToggles(userId, enrollmentToggles);
        }

        // Load member's payout history
        await loadMyPayouts(userId, myPayoutsList);

    } catch (err) {
        console.error('Error loading payout settings:', err);
        statusEl.innerHTML = '<span class="text-red-500">Error loading</span>';
    }
}

async function handleLinkBank() {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin h-4 w-4 text-white mx-auto" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';

    try {
        const result = await callEdgeFunction('create-connect-onboarding', {});
        if (result.url) {
            window.location.href = result.url;
        } else {
            throw new Error('No onboarding URL received');
        }
    } catch (err) {
        alert('Failed to start bank setup: ' + (err.message || 'Please try again'));
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

async function renderEnrollmentToggles(userId, container) {
    if (!container) return;

    // Fetch current enrollments
    const { data: enrollments } = await supabaseClient
        .from('payout_enrollments')
        .select('payout_type, enrolled')
        .eq('user_id', userId);

    const enrollMap = {};
    (enrollments || []).forEach(e => { enrollMap[e.payout_type] = e.enrolled; });

    container.innerHTML = PAYOUT_TYPES.map(type => {
        const enrolled = enrollMap[type.key] !== false; // default true if no row
        return `
            <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="text-base">${type.emoji}</span>
                    <div>
                        <div class="text-sm font-medium text-gray-700">${type.label}</div>
                        <div class="text-[10px] text-gray-400">${type.desc}</div>
                    </div>
                </div>
                <label class="toggle-switch flex-shrink-0">
                    <input type="checkbox" ${enrolled ? 'checked' : ''} data-enrollment-type="${type.key}">
                    <span class="toggle-slider"></span>
                </label>
            </div>
        `;
    }).join('');

    // Wire toggle changes
    container.querySelectorAll('input[data-enrollment-type]').forEach(toggle => {
        toggle.addEventListener('change', async () => {
            const payoutType = toggle.dataset.enrollmentType;
            const enrolled = toggle.checked;
            try {
                const { error } = await supabaseClient
                    .from('payout_enrollments')
                    .upsert({
                        user_id: userId,
                        payout_type: payoutType,
                        enrolled,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id,payout_type' });
                if (error) throw error;
            } catch (err) {
                console.error('Error updating enrollment:', err);
                toggle.checked = !toggle.checked;
                alert('Failed to update enrollment');
            }
        });
    });
}

async function loadMyPayouts(userId, container) {
    if (!container) return;

    try {
        const { data: payouts } = await supabaseClient
            .from('payouts')
            .select('amount_cents, payout_type, status, reason, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (!payouts || payouts.length === 0) {
            container.innerHTML = '<div class="text-xs text-gray-400">No payouts received yet</div>';
            return;
        }

        const typeEmoji = { birthday: '🎂', competition: '🏆', bonus: '💰', profit_share: '📈', referral: '🤝', quest_reward: '⭐', custom: '✨' };
        const statusDot = { completed: 'bg-emerald-400', failed: 'bg-red-400', processing: 'bg-blue-400', pending: 'bg-gray-300', queued: 'bg-amber-400' };

        container.innerHTML = payouts.map(p => `
            <div class="flex items-center gap-3 py-1.5">
                <span class="text-base">${typeEmoji[p.payout_type] || '💵'}</span>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-700">$${(p.amount_cents / 100).toFixed(2)}</div>
                    <div class="text-[10px] text-gray-400">${p.reason || p.payout_type}</div>
                </div>
                <div class="flex items-center gap-1.5 flex-shrink-0">
                    <div class="w-1.5 h-1.5 rounded-full ${statusDot[p.status] || 'bg-gray-300'}"></div>
                    <span class="text-[10px] text-gray-400">${new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading payouts:', err);
    }
}

// ─── Push Notification Toggle ───────────────────────────
async function setupPushToggle() {
    var toggleBtn = document.getElementById('pushToggleBtn');
    var statusText = document.getElementById('pushStatusText');
    var section = document.getElementById('pushNotifSection');
    if (!toggleBtn || !statusText) return;

    // Hide section if push not supported
    if (!window.JMPush || !window.JMPush.isSupported()) {
        statusText.textContent = 'Not supported in this browser';
        toggleBtn.style.display = 'none';
        return;
    }

    var permission = window.JMPush.getPermissionState();

    // If permission permanently denied, show that
    if (permission === 'denied') {
        statusText.textContent = 'Blocked — enable in browser settings';
        toggleBtn.style.opacity = '0.5';
        toggleBtn.style.pointerEvents = 'none';
        return;
    }

    // Check current subscription state
    var subscribed = await window.JMPush.isSubscribed();
    updateToggleUI(subscribed);

    toggleBtn.addEventListener('click', async function () {
        toggleBtn.style.pointerEvents = 'none';
        if (subscribed) {
            var result = await window.JMPush.unsubscribe();
            if (result.success) subscribed = false;
        } else {
            var result = await window.JMPush.subscribe();
            if (result.success) {
                subscribed = true;
            } else if (result.reason === 'denied') {
                statusText.textContent = 'Blocked — enable in browser settings';
                toggleBtn.style.opacity = '0.5';
                return;
            }
        }
        updateToggleUI(subscribed);
        toggleBtn.style.pointerEvents = '';
    });

    function updateToggleUI(on) {
        var knob = toggleBtn.querySelector('span');
        if (on) {
            toggleBtn.classList.remove('bg-gray-200');
            toggleBtn.classList.add('bg-brand-600');
            toggleBtn.setAttribute('aria-checked', 'true');
            knob.classList.remove('translate-x-0');
            knob.classList.add('translate-x-5');
            statusText.textContent = 'Enabled — you\'ll get push alerts';
        } else {
            toggleBtn.classList.remove('bg-brand-600');
            toggleBtn.classList.add('bg-gray-200');
            toggleBtn.setAttribute('aria-checked', 'false');
            knob.classList.remove('translate-x-5');
            knob.classList.add('translate-x-0');
            statusText.textContent = permission === 'default'
                ? 'Allow push notifications to stay in the loop'
                : 'Disabled — tap to re-enable';
        }
    }
}
