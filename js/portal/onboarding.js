// Onboarding wizard logic
// Smart onboarding: auto-skips steps where data already exists
// Steps: 0=Welcome, 1=Name, 2=Birthday, 3=Photo, 4=Contribution, 5=Done

const ALL_STEPS = [0, 1, 2, 3, 4, 5];
let activeSteps = [...ALL_STEPS]; // filtered at init based on existing data
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
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = APP_CONFIG.LOGIN_URL;
        return;
    }

    currentUser = session.user;

    // Fetch full profile data
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('setup_completed, first_name, last_name, birthday, profile_picture_url')
        .eq('id', currentUser.id)
        .single();

    if (profile?.setup_completed) {
        window.location.href = APP_CONFIG.PORTAL_URL;
        return;
    }

    // Check for active subscription
    const { data: subs } = await supabaseClient
        .from('subscriptions')
        .select('id')
        .eq('user_id', currentUser.id)
        .in('status', ['active', 'trialing'])
        .limit(1);

    const hasActiveSub = subs && subs.length > 0;

    // ── Determine which content steps (1-4) can be skipped ──
    const skippable = [];

    if (profile?.first_name && profile?.last_name) {
        skippable.push(1); // Name already set
        profileData.first_name = profile.first_name;
        profileData.last_name = profile.last_name;
    }
    if (profile?.birthday) {
        skippable.push(2); // Birthday already set
        profileData.birthday = profile.birthday;
    }
    if (profile?.profile_picture_url) {
        skippable.push(3); // Photo already uploaded
        profileData.profile_picture_url = profile.profile_picture_url;
    }
    if (hasActiveSub) {
        skippable.push(4); // Already has subscription
    }

    // Build active steps (Welcome=0 and Done=5 always included)
    activeSteps = ALL_STEPS.filter(s => !skippable.includes(s));

    // If only Welcome + Done remain, everything is filled → save & redirect
    if (activeSteps.length <= 2) {
        try { await saveProfile(); } catch (e) { /* best-effort */ }
        window.location.href = APP_CONFIG.PORTAL_URL;
        return;
    }

    // Pre-fill form inputs with existing data (even for non-skipped steps)
    if (profile?.first_name) {
        document.getElementById('firstName').value = profile.first_name;
        if (!profileData.first_name) profileData.first_name = profile.first_name;
    }
    if (profile?.last_name) {
        document.getElementById('lastName').value = profile.last_name;
        if (!profileData.last_name) profileData.last_name = profile.last_name;
    }
    if (profile?.birthday) {
        document.getElementById('birthday').value = profile.birthday;
        if (!profileData.birthday) profileData.birthday = profile.birthday;
    }
    if (profile?.profile_picture_url) {
        if (!profileData.profile_picture_url) profileData.profile_picture_url = profile.profile_picture_url;
        // Show existing photo in preview
        document.getElementById('photoPreview').src = profile.profile_picture_url;
        document.getElementById('photoPlaceholder').classList.add('hidden');
        document.getElementById('photoPreviewContainer').classList.remove('hidden');
    }

    // Build dynamic progress bar & wire up buttons
    buildProgressBar();
    setupNavigation();
    setupPhotoUpload();
});

// ── Dynamic Progress Bar ──
function buildProgressBar() {
    const bar = document.getElementById('progressBar');
    bar.innerHTML = '';

    // Show dots for all active steps except Done (step 5)
    const dotSteps = activeSteps.filter(s => s !== 5);

    dotSteps.forEach((step, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center';

        const dot = document.createElement('div');
        dot.className = 'step-dot w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center';
        dot.setAttribute('data-step', step);
        dot.innerHTML = `
            <svg class="w-4 h-4 text-white hidden" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
            <span class="text-xs font-bold text-gray-400 step-number">${i + 1}</span>
        `;

        wrapper.appendChild(dot);

        // Connector between dots (not after the last)
        if (i < dotSteps.length - 1) {
            const connector = document.createElement('div');
            connector.className = 'step-connector w-8 sm:w-12 h-0.5 bg-gray-200';
            connector.setAttribute('data-connector', i);
            wrapper.appendChild(connector);
        }

        bar.appendChild(wrapper);
    });

    updateProgressBar();
}

// ── Smart Navigation Helpers ──
function nextStep() {
    const idx = activeSteps.indexOf(currentStep);
    if (idx < activeSteps.length - 1) {
        const next = activeSteps[idx + 1];
        if (next === 5) {
            finishOnboarding(); // save + show Done
        } else {
            goToStep(next);
        }
    }
}

function prevStep() {
    const idx = activeSteps.indexOf(currentStep);
    if (idx > 0) {
        goToStep(activeSteps[idx - 1]);
    }
}

// ── Step Navigation Wiring ──
function setupNavigation() {
    // Step 0 → next active step
    document.getElementById('welcomeNextBtn').addEventListener('click', () => nextStep());

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
        nextStep();
    });
    document.getElementById('nameBackBtn').addEventListener('click', () => prevStep());

    // Step 2: Birthday form
    document.getElementById('birthdayForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const bday = document.getElementById('birthday').value;

        if (!bday) {
            showError('birthdayError', 'Please enter your birthday');
            return;
        }

        const birthDate = new Date(bday);
        const today = new Date();
        if (birthDate >= today) {
            showError('birthdayError', 'Birthday must be in the past');
            return;
        }

        hideError('birthdayError');
        profileData.birthday = bday;
        nextStep();
    });
    document.getElementById('birthdayBackBtn').addEventListener('click', () => prevStep());
    document.getElementById('birthdaySkipBtn').addEventListener('click', () => {
        profileData.birthday = null;
        nextStep();
    });

    // Step 3: Photo
    document.getElementById('photoBackBtn').addEventListener('click', () => prevStep());
    document.getElementById('finishBtn').addEventListener('click', () => nextStep());
    document.getElementById('photoSkipBtn').addEventListener('click', () => {
        profileData.profile_picture_url = null;
        nextStep();
    });

    // Step 4: Contribution
    setupContributionStep();
    document.getElementById('contributionBackBtn').addEventListener('click', () => prevStep());
    document.getElementById('startContributionBtn').addEventListener('click', () => handleStartContribution());
    document.getElementById('contributionSkipBtn').addEventListener('click', () => finishOnboarding());

    // Step 5: Done
    document.getElementById('goToDashboardBtn').addEventListener('click', () => {
        window.location.href = APP_CONFIG.PORTAL_URL;
    });
}

// ── Step Transition ──
function goToStep(step) {
    const currentEl = document.querySelector(`.step[data-step="${currentStep}"]`);
    if (currentEl) currentEl.classList.remove('active');

    currentStep = step;
    const nextEl = document.querySelector(`.step[data-step="${currentStep}"]`);
    if (nextEl) {
        nextEl.classList.add('active');
        nextEl.classList.remove('fade-in');
        void nextEl.offsetWidth; // force reflow
        nextEl.classList.add('fade-in');
    }

    updateProgressBar();
}

function updateProgressBar() {
    const dotSteps = activeSteps.filter(s => s !== 5);
    // When on Done step (5), treat index as past all dots so they all show completed
    const currentIdx = currentStep === 5 ? dotSteps.length : dotSteps.indexOf(currentStep);

    dotSteps.forEach((step, i) => {
        const dot = document.querySelector(`.step-dot[data-step="${step}"]`);
        const number = dot?.querySelector('.step-number');
        const connector = document.querySelector(`.step-connector[data-connector="${i}"]`);

        if (!dot) return;

        dot.classList.remove('completed', 'current');

        if (i < currentIdx) {
            dot.classList.add('completed');
            if (number) number.classList.add('hidden');
        } else if (i === currentIdx) {
            dot.classList.add('current');
            if (number) {
                number.classList.remove('hidden');
                number.className = 'text-xs font-bold text-brand-600 step-number';
            }
        } else {
            if (number) {
                number.classList.remove('hidden');
                number.className = 'text-xs font-bold text-gray-400 step-number';
            }
        }

        if (connector) {
            connector.classList.toggle('completed', i < currentIdx);
        }
    });
}

// ── Contribution Step ──
let selectedAmount = null;

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

// ── Helpers (minimal — config.js has showError/hideError but auth.js may not be loaded) ──
function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}
function hideError(id) {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
}
