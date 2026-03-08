// Onboarding wizard logic
// Handles the multi-step welcome flow for new members

const TOTAL_STEPS = 5; // 0: Welcome, 1: Name, 2: Birthday, 3: Photo, 4: Done
let currentStep = 0;
let currentUser = null;

// Collected profile data
const profileData = {
    first_name: '',
    last_name: '',
    birthday: null,
    profile_picture_url: null,
};

// ── Initialization ──
document.addEventListener('DOMContentLoaded', async function () {
    // Verify user is authenticated (but do NOT check onboarding — we're on it!)
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = APP_CONFIG.LOGIN_URL;
        return;
    }

    currentUser = session.user;

    // Check if already onboarded — if so, go straight to portal
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('setup_completed, first_name, last_name')
        .eq('id', currentUser.id)
        .single();

    if (profile?.setup_completed) {
        window.location.href = APP_CONFIG.PORTAL_URL;
        return;
    }

    // Pre-fill existing data if the user is re-doing onboarding
    if (profile?.first_name) {
        document.getElementById('firstName').value = profile.first_name;
        profileData.first_name = profile.first_name;
    }
    if (profile?.last_name) {
        document.getElementById('lastName').value = profile.last_name;
        profileData.last_name = profile.last_name;
    }

    // Wire up all buttons
    setupNavigation();
    setupPhotoUpload();
});

// ── Step Navigation ──
function setupNavigation() {
    // Step 0 → 1 (Welcome → Name)
    document.getElementById('welcomeNextBtn').addEventListener('click', () => goToStep(1));

    // Step 1: Name form
    document.getElementById('nameForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const first = document.getElementById('firstName').value.trim();
        const last = document.getElementById('lastName').value.trim();

        if (!first || !last) {
            showError('nameError', 'Please enter your full name');
            return;
        }

        hideError('nameError');
        profileData.first_name = first;
        profileData.last_name = last;
        goToStep(2);
    });
    document.getElementById('nameBackBtn').addEventListener('click', () => goToStep(0));

    // Step 2: Birthday form
    document.getElementById('birthdayForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const bday = document.getElementById('birthday').value;

        if (!bday) {
            showError('birthdayError', 'Please enter your birthday');
            return;
        }

        // Basic validation: must be a real past date
        const birthDate = new Date(bday);
        const today = new Date();
        if (birthDate >= today) {
            showError('birthdayError', 'Birthday must be in the past');
            return;
        }

        hideError('birthdayError');
        profileData.birthday = bday;
        goToStep(3);
    });
    document.getElementById('birthdayBackBtn').addEventListener('click', () => goToStep(1));
    document.getElementById('birthdaySkipBtn').addEventListener('click', () => {
        profileData.birthday = null;
        goToStep(3);
    });

    // Step 3: Photo
    document.getElementById('photoBackBtn').addEventListener('click', () => goToStep(2));
    document.getElementById('finishBtn').addEventListener('click', () => finishOnboarding());
    document.getElementById('photoSkipBtn').addEventListener('click', () => {
        profileData.profile_picture_url = null;
        finishOnboarding();
    });

    // Step 4: Done
    document.getElementById('goToDashboardBtn').addEventListener('click', () => {
        window.location.href = APP_CONFIG.PORTAL_URL;
    });
}

// ── Step Transition ──
function goToStep(step) {
    // Hide current step
    const currentEl = document.querySelector(`.step[data-step="${currentStep}"]`);
    if (currentEl) currentEl.classList.remove('active');

    // Show new step
    currentStep = step;
    const nextEl = document.querySelector(`.step[data-step="${currentStep}"]`);
    if (nextEl) {
        nextEl.classList.add('active');
        // Re-trigger fade animation
        nextEl.classList.remove('fade-in');
        void nextEl.offsetWidth; // force reflow
        nextEl.classList.add('fade-in');
    }

    // Update progress dots
    updateProgressBar();
}

function updateProgressBar() {
    for (let i = 0; i < TOTAL_STEPS - 1; i++) {
        const dot = document.querySelector(`.step-dot[data-step="${i}"]`);
        const number = dot?.querySelector('.step-number');
        const connector = document.querySelector(`.step-connector[data-connector="${i}"]`);

        if (!dot) continue;

        dot.classList.remove('completed', 'current');

        if (i < currentStep) {
            // Completed
            dot.classList.add('completed');
            if (number) number.classList.add('hidden');
        } else if (i === currentStep) {
            // Current
            dot.classList.add('current');
            if (number) {
                number.classList.remove('hidden');
                number.className = 'text-xs font-bold text-brand-600 step-number';
            }
        } else {
            // Upcoming
            if (number) {
                number.classList.remove('hidden');
                number.className = 'text-xs font-bold text-gray-400 step-number';
            }
        }

        if (connector) {
            connector.classList.toggle('completed', i < currentStep);
        }
    }
}

// ── Photo Upload ──
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

// ── Finish Onboarding ──
async function finishOnboarding() {
    const finishBtn = document.getElementById('finishBtn');
    finishBtn.disabled = true;
    finishBtn.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-white mx-auto" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    `;

    try {
        // Build update payload
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

        // Show completion step
        const completionName = document.getElementById('completionName');
        if (completionName && profileData.first_name) {
            completionName.textContent = `Welcome to the family, ${profileData.first_name}!`;
        }

        goToStep(4);

    } catch (error) {
        console.error('Onboarding save error:', error);
        showError('photoError', 'Failed to save profile: ' + (error.message || 'Please try again'));
        finishBtn.disabled = false;
        finishBtn.textContent = 'Finish Setup';
    }
}

// ── Helpers (minimal — config.js has showError/hideError but auth.js may not be loaded) ──
function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}
function hideError(id) {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
}
