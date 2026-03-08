// ══════════════════════════════════════════
// Onboarding – Photo Upload
// Depends on: state.js (currentUser, profileData, showError, hideError)
// ══════════════════════════════════════════

function setupPhotoUpload() {
    const zone = document.getElementById('photoUploadZone');
    const input = document.getElementById('photoInput');
    const changeBtn = document.getElementById('changePhotoBtn');

    // Click to upload
    zone.addEventListener('click', (e) => {
        if (e.target.id !== 'changePhotoBtn') {
            input.click();
        }
    });

    changeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        input.click();
    });

    // File selected
    input.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) handlePhotoFile(file);
    });

    // Drag & drop
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files?.[0];
        if (file) handlePhotoFile(file);
    });
}

async function handlePhotoFile(file) {
    hideError('photoError');

    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
        showError('photoError', 'Please upload a JPG, PNG, WebP, or GIF file');
        return;
    }

    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
        showError('photoError', 'Photo must be under 2MB');
        return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('photoPreview').src = e.target.result;
        document.getElementById('photoPlaceholder').classList.add('hidden');
        document.getElementById('photoPreviewContainer').classList.remove('hidden');
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    const progress = document.getElementById('uploadProgress');
    progress.classList.remove('hidden');

    try {
        const ext = file.name.split('.').pop();
        const filePath = `${currentUser.id}/avatar.${ext}`;

        const { error: uploadError } = await supabaseClient.storage
            .from('profile-pictures')
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabaseClient.storage
            .from('profile-pictures')
            .getPublicUrl(filePath);

        profileData.profile_picture_url = urlData.publicUrl;
        progress.classList.add('hidden');

    } catch (error) {
        console.error('Upload error:', error);
        progress.classList.add('hidden');
        showError('photoError', 'Upload failed: ' + (error.message || 'Please try again'));
    }
}
