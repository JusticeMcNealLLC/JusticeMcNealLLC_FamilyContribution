// ══════════════════════════════════════════
// Onboarding – Step Navigation & Progress Bar
// Depends on: state.js (activeSteps, currentStep, profileData, goToStep)
// ══════════════════════════════════════════

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

// ── Button Wiring ──
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
    document.getElementById('contributionBackBtn')?.addEventListener('click', () => prevStep());
    document.getElementById('startContributionBtn')?.addEventListener('click', () => handleStartContribution());
    document.getElementById('contributionSkipBtn')?.addEventListener('click', () => finishOnboarding());

    // Step 5: Done
    document.getElementById('goToDashboardBtn').addEventListener('click', () => {
        window.location.href = APP_CONFIG.PORTAL_URL;
    });
}
