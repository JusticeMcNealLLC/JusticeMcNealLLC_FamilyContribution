// ═══════════════════════════════════════════════════════════
// Profile – Edit Profile (Bio, Photo, Badge Picker, Banner)
// ═══════════════════════════════════════════════════════════

window.ProfileApp = window.ProfileApp || {};

// ─── Profile Pic Quick Upload (tap avatar) ──────────────
window.ProfileApp.setupProfilePicUpload = function setupProfilePicUpload() {
    const wrap = document.getElementById('profilePicWrap');
    const input = document.getElementById('profilePicInput');
    if (!wrap || !input) return;

    wrap.addEventListener('click', () => input.click());
    wrap.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.click(); });

    input.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await window.ProfileApp.uploadProfilePic(file);
        input.value = '';
    });
};

window.ProfileApp.uploadProfilePic = async function uploadProfilePic(file) {
    const S = window.ProfileApp.state;
    if (file.size > 2 * 1024 * 1024) {
        alert('Image must be under 2 MB');
        return;
    }

    try {
        const ext = file.name.split('.').pop();
        const path = `${S.profileUser.id}/avatar.${ext}`;

        const { error: upErr } = await supabaseClient.storage
            .from('profile-pictures')
            .upload(path, file, { contentType: file.type, upsert: true });

        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabaseClient.storage
            .from('profile-pictures')
            .getPublicUrl(path);

        const url = publicUrl + '?t=' + Date.now();

        await supabaseClient
            .from('profiles')
            .update({ profile_picture_url: publicUrl })
            .eq('id', S.profileUser.id);

        // Update main avatar
        const pic = document.getElementById('profilePic');
        pic.src = url;
        pic.classList.remove('hidden');
        document.getElementById('profileInitials').classList.add('hidden');

        // Also update the edit modal avatar if it exists
        const modalPic = document.getElementById('editModalPic');
        if (modalPic) {
            modalPic.src = url;
            modalPic.classList.remove('hidden');
            document.getElementById('editModalInitials')?.classList.add('hidden');
        }
    } catch (err) {
        console.error('Profile pic upload error:', err);
        alert('Failed to upload profile picture');
    }
};

// ─── Edit Profile Modal ─────────────────────────────────
window.ProfileApp.setupEditProfile = function setupEditProfile() {
    const S = window.ProfileApp.state;

    const editBtn = document.getElementById('editProfileBtn');
    const modal = document.getElementById('editBioModal');
    const backdrop = document.getElementById('editBioBackdrop');
    const cancelBtn = document.getElementById('editBioCancelBtn');
    const saveBtn = document.getElementById('editBioSaveBtn');
    const input = document.getElementById('editBioInput');
    const charCount = document.getElementById('bioCharCount');

    if (!editBtn || !modal) return;

    // Photo change inside modal
    const modalAvatar = document.getElementById('editModalAvatar');
    const modalPicInput = document.getElementById('editModalPicInput');
    const changePhotoBtn = document.getElementById('editModalChangePhotoBtn');

    if (modalAvatar && modalPicInput) {
        modalAvatar.addEventListener('click', () => modalPicInput.click());
        changePhotoBtn?.addEventListener('click', () => modalPicInput.click());
        modalPicInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await window.ProfileApp.uploadProfilePic(file);
            modalPicInput.value = '';
        });
    }

    editBtn.addEventListener('click', () => {
        // Populate bio
        input.value = document.getElementById('profileBio').textContent || '';
        charCount.textContent = `${input.value.length} / 200`;

        // Populate modal avatar
        const mainPic = document.getElementById('profilePic');
        const modalPic = document.getElementById('editModalPic');
        const modalInitials = document.getElementById('editModalInitials');
        if (mainPic && !mainPic.classList.contains('hidden')) {
            modalPic.src = mainPic.src;
            modalPic.classList.remove('hidden');
            modalInitials?.classList.add('hidden');
        } else {
            modalPic.classList.add('hidden');
            modalInitials.textContent = document.getElementById('profileInitials')?.textContent || '?';
            modalInitials?.classList.remove('hidden');
        }

        // Populate badge picker
        window.ProfileApp.populateEditModalBadgePicker();

        // Populate banner section
        window.ProfileApp.populateEditModalBanner();

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        input.focus();
    });

    input.addEventListener('input', () => {
        charCount.textContent = `${input.value.length} / 200`;
    });

    function close() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    backdrop.addEventListener('click', close);
    cancelBtn.addEventListener('click', close);

    saveBtn.addEventListener('click', async () => {
        const bio = input.value.trim();
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        // Get selected badge from modal picker
        const selectedBadge = modal.querySelector('.edit-badge-option.ring-brand-500')?.dataset.badge ?? S.currentDisplayedBadge;

        const updates = { bio };
        if (selectedBadge !== undefined) {
            updates.displayed_badge = selectedBadge || null;
        }

        const { error } = await supabaseClient
            .from('profiles')
            .update(updates)
            .eq('id', S.profileUser.id);

        if (!error) {
            document.getElementById('profileBio').textContent = bio;

            // If badge changed, update overlay
            if (updates.displayed_badge !== undefined && updates.displayed_badge !== S.currentDisplayedBadge) {
                S.currentDisplayedBadge = updates.displayed_badge;
                const overlay = document.getElementById('profileBadgeOverlay');
                if (S.currentDisplayedBadge && typeof buildNavBadgeOverlay === 'function') {
                    overlay.innerHTML = buildNavBadgeOverlay(S.currentDisplayedBadge);
                    const chip = overlay.querySelector('.badge-chip-overlay');
                    if (chip) { chip.style.width = '28px'; chip.style.height = '28px'; chip.style.fontSize = '14px'; }
                } else {
                    overlay.innerHTML = '';
                }
                window.ProfileApp.refreshBadgeRings();
                window.ProfileApp.refreshCollectionRings();
            }
            close();
        } else {
            alert('Failed to save profile');
        }
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    });
};

// ─── Edit Modal Badge Picker ────────────────────────────
window.ProfileApp.populateEditModalBadgePicker = function populateEditModalBadgePicker() {
    const S = window.ProfileApp.state;
    const picker = document.getElementById('editModalBadgePicker');
    if (!picker) return;

    // Keep the "None" button, add earned badges
    const noneBtnHtml = `<button data-badge="" class="edit-badge-option w-10 h-10 rounded-full border-2 ${!S.currentDisplayedBadge ? 'border-brand-500 ring-2 ring-brand-500' : 'border-gray-200'} flex items-center justify-center text-xs text-gray-400 hover:border-gray-400 transition" title="No badge">✕</button>`;

    const badgeBtns = S.earnedBadgeKeys.map(key => {
        const badge = (typeof BADGE_CATALOG !== 'undefined' && BADGE_CATALOG[key]) || { emoji: '🏅', name: key, rarity: 'common' };
        const isEq = S.currentDisplayedBadge === key;
        return `<button data-badge="${key}" class="edit-badge-option badge-chip badge-rarity-${badge.rarity || 'common'} w-10 h-10 text-lg ${isEq ? 'ring-2 ring-brand-500 ring-offset-2' : ''}" title="${badge.name}">${badge.emoji}</button>`;
    }).join('');

    picker.innerHTML = noneBtnHtml + badgeBtns;

    // Wire clicks
    picker.querySelectorAll('.edit-badge-option').forEach(btn => {
        btn.addEventListener('click', () => {
            picker.querySelectorAll('.edit-badge-option').forEach(b => {
                b.classList.remove('ring-2', 'ring-brand-500', 'ring-offset-2', 'border-brand-500');
                if (b.dataset.badge === '') b.classList.add('border-gray-200');
            });
            btn.classList.add('ring-2', 'ring-brand-500');
            if (btn.dataset.badge === '') {
                btn.classList.remove('border-gray-200');
                btn.classList.add('border-brand-500');
            } else {
                btn.classList.add('ring-offset-2');
            }
        });
    });
};

window.ProfileApp.refreshEditModalBadgePicker = function refreshEditModalBadgePicker() {
    const S = window.ProfileApp.state;
    const picker = document.getElementById('editModalBadgePicker');
    if (!picker) return;
    picker.querySelectorAll('.edit-badge-option').forEach(btn => {
        const isEq = (btn.dataset.badge || null) === (S.currentDisplayedBadge || null);
        btn.classList.toggle('ring-2', isEq);
        btn.classList.toggle('ring-brand-500', isEq);
        if (btn.dataset.badge === '') {
            btn.classList.toggle('border-brand-500', isEq);
            btn.classList.toggle('border-gray-200', !isEq);
        } else {
            btn.classList.toggle('ring-offset-2', isEq);
        }
    });
};

// ─── Cover Photo / Banner — Reward-Only ─────────────────
window.ProfileApp.setupCoverPhoto = function setupCoverPhoto() {
    // No user-facing edit UI — banners are reward-only
    return;
};

window.ProfileApp.populateEditModalBanner = function populateEditModalBanner() {
    const S = window.ProfileApp.state;

    const section = document.getElementById('editBannerSection');
    const preview = document.getElementById('editBannerPreview');
    const previewImg = document.getElementById('editBannerPreviewImg');

    if (!section || !preview) return;

    const hasCustomPhoto = !!S.currentBannerPhotoUrl;
    const hasGradient = !!S.currentBannerGradient;

    if (!hasCustomPhoto && !hasGradient) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');

    // Show the current banner preview
    if (hasCustomPhoto) {
        previewImg.src = S.currentBannerPhotoUrl;
        previewImg.classList.remove('hidden');
        preview.className = 'w-full h-20 rounded-xl mb-2 overflow-hidden';
    } else if (S.currentBannerGradient === 'founders-animated') {
        previewImg.classList.add('hidden');
        preview.className = 'w-full h-20 rounded-xl mb-2 overflow-hidden relative';
        preview.innerHTML = '<div class="founders-banner-preview w-full h-full"></div><img id="editBannerPreviewImg" class="w-full h-full object-cover hidden" alt="">';
    } else if (S.currentBannerGradient) {
        previewImg.classList.add('hidden');
        preview.className = `w-full h-20 rounded-xl mb-2 overflow-hidden bg-gradient-to-r ${S.currentBannerGradient}`;
    }

    // Show banner name if known
    const bannerInfo = window.ProfileApp.BANNER_CATALOG[S.currentBannerGradient];
    const picker = document.getElementById('editModalBannerPicker');
    if (picker) {
        picker.innerHTML = `<p class="col-span-3 text-xs text-gray-500 text-center py-1">${bannerInfo ? '🎨 ' + bannerInfo.name : '🎨 Custom Banner'} <span class="text-gray-400">(reward-only)</span></p>`;
    }
};
