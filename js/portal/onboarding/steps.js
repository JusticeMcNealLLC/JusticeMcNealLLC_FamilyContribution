// ══════════════════════════════════════════
// Onboarding – Step Navigation & Progress Bar
// Depends on: state.js (activeSteps, currentStep, profileData, goToStep)
// ══════════════════════════════════════════

// ── Dynamic Progress Bar ──
function buildProgressBar() {
    const bar = document.getElementById('progressBar');
    bar.innerHTML = '';

    // Show dots for all active steps except Done (step 8)
    const dotSteps = activeSteps.filter(s => s !== 8);

    dotSteps.forEach((step, i) => {
        const wrapper = document.createElement('div');
        // All wrappers except the last grow to fill space; last is shrink-only (just the dot)
        const isLast = (i === dotSteps.length - 1);
        wrapper.className = isLast ? 'flex items-center flex-shrink-0' : 'flex items-center flex-1 min-w-0';

        const dot = document.createElement('div');
        dot.className = 'step-dot w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0';
        dot.setAttribute('data-step', step);
            dot.innerHTML = `
            <svg class="w-3 h-3 text-white hidden" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
            <span class="text-[10px] font-bold text-gray-400 step-number">${i + 1}</span>
        `;

        wrapper.appendChild(dot);

        // Connector between dots (not after the last)
        if (i < dotSteps.length - 1) {
            const connector = document.createElement('div');
            connector.className = 'step-connector flex-1 h-0.5 bg-gray-200 min-w-2';
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
        if (next === 8) {
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
    const dotSteps = activeSteps.filter(s => s !== 7);
    // When on Done step (8), treat index as past all dots so they all show completed
    const currentIdx = currentStep === 8 ? dotSteps.length : dotSteps.indexOf(currentStep);

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
                number.className = 'text-[10px] font-bold text-brand-600 step-number';
            }
        } else {
            if (number) {
                number.classList.remove('hidden');
                number.className = 'text-[10px] font-bold text-gray-400 step-number';
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
    document.getElementById('contributionSkipBtn')?.addEventListener('click', () => nextStep());

    // Step 5: Bank Link
    document.getElementById('bankLinkBackBtn')?.addEventListener('click', () => prevStep());
    document.getElementById('startBankLinkBtn')?.addEventListener('click', () => handleBankLinkOnboarding());
    document.getElementById('bankLinkSkipBtn')?.addEventListener('click', () => nextStep());

    // Step 6: Push Notifications
    document.getElementById('pushBackBtn')?.addEventListener('click', () => prevStep());
    document.getElementById('pushAllowBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('pushAllowBtn');
        btn.disabled = true;
        btn.innerHTML = '<svg class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Enabling...';

        try {
            if (window.JMPush && window.JMPush.isSupported()) {
                const result = await window.JMPush.subscribe();
                if (result.success) {
                    document.getElementById('pushStepStatus').classList.remove('hidden');
                    document.getElementById('pushStepButtons').classList.add('hidden');
                    document.getElementById('pushSkipBtn').classList.add('hidden');
                    setTimeout(() => nextStep(), 1200);
                    return;
                } else if (result.reason === 'denied') {
                    document.getElementById('pushStepBlocked').classList.remove('hidden');
                }
            }
        } catch (e) {
            console.error('Push subscribe error during onboarding:', e);
        }

        btn.disabled = false;
        btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"></path></svg> Allow Notifications';
    });
    document.getElementById('pushSkipBtn')?.addEventListener('click', () => nextStep());

    // Step 7: Add to Home Screen
    document.getElementById('a2hsBackBtn')?.addEventListener('click', () => prevStep());
    document.getElementById('a2hsDoneBtn')?.addEventListener('click', () => nextStep());
    document.getElementById('a2hsSkipBtn')?.addEventListener('click', () => nextStep());

    // Detect platform and show appropriate A2HS instructions
    setupA2HSStep();

    // Step 8: Done
    document.getElementById('goToDashboardBtn').addEventListener('click', () => {
        window.location.href = APP_CONFIG.PORTAL_URL;
    });
}

// ── Add to Home Screen — platform detection & install prompt ──
let deferredInstallPrompt = null;

// Capture Android's beforeinstallprompt early (fires once before user is asked)
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;

    // If we're already on the A2HS step, show the install button
    const btn = document.getElementById('a2hsInstallBtn');
    if (btn) {
        btn.classList.remove('hidden');
        btn.classList.add('flex');
    }
});

function setupA2HSStep() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua) && !window.MSStream;
    const isAndroid = /Android/i.test(ua);

    const iosEl = document.getElementById('a2hsIos');
    const androidEl = document.getElementById('a2hsAndroid');
    const desktopEl = document.getElementById('a2hsDesktop');

    if (isIOS) {
        if (iosEl) iosEl.classList.remove('hidden');
    } else if (isAndroid) {
        if (androidEl) androidEl.classList.remove('hidden');

        // If we captured the install prompt, show the native install button
        if (deferredInstallPrompt) {
            const installBtn = document.getElementById('a2hsInstallBtn');
            if (installBtn) {
                installBtn.classList.remove('hidden');
                installBtn.classList.add('flex');
            }
        }
    } else {
        if (desktopEl) desktopEl.classList.remove('hidden');
    }

    // Android native install button click
    document.getElementById('a2hsInstallBtn')?.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;

        const btn = document.getElementById('a2hsInstallBtn');
        if (outcome === 'accepted') {
            if (btn) {
                btn.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> Installed!';
                btn.classList.remove('bg-sky-600', 'hover:bg-sky-700');
                btn.classList.add('bg-emerald-600', 'cursor-default');
            }
            setTimeout(() => nextStep(), 1200);
        } else {
            if (btn) btn.classList.add('hidden');
        }
    });
}
