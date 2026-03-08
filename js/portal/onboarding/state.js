// ══════════════════════════════════════════
// Onboarding – Shared State
// ══════════════════════════════════════════

const ALL_STEPS = [0, 1, 2, 3, 4, 5];
let activeSteps = [...ALL_STEPS]; // filtered at init based on existing data
let currentStep = 0;
let currentUser = null;
let selectedAmount = null;

// Collected profile data
const profileData = {
    first_name: '',
    last_name: '',
    birthday: null,
    profile_picture_url: null,
};

// ── Helpers ──
function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function hideError(id) {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
}
