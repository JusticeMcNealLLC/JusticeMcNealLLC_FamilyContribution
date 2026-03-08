// ══════════════════════════════════════════
// Milestones – Celebration (Confetti + Toast)
// Load order: config.js → renders.js → celebration.js → history.js → init.js
// ══════════════════════════════════════════

const CELEBRATION_STORAGE_KEY = 'jm_milestone_last_seen_idx';

/**
 * Check if the user has reached a NEW milestone since last visit.
 * If so, fire confetti and show a congratulation toast.
 */
function checkForNewMilestones(currentTierIdx) {
    const lastSeen = parseInt(localStorage.getItem(CELEBRATION_STORAGE_KEY) ?? '-1', 10);

    // Always update stored index
    localStorage.setItem(CELEBRATION_STORAGE_KEY, String(currentTierIdx));

    // First visit ever — don't celebrate retroactively, just record
    if (isNaN(lastSeen) || lastSeen === -1 && currentTierIdx <= 0) return;

    // No new milestone
    if (currentTierIdx <= lastSeen) return;

    // New milestone(s) achieved! Celebrate the latest one
    const tier = MILESTONE_TIERS[currentTierIdx];
    if (!tier) return;

    // Short delay so the page finishes rendering first
    setTimeout(() => {
        fireConfetti();
        showCelebrationToast(tier);
    }, 600);
}

/**
 * Fire a multi-burst confetti animation using canvas-confetti.
 */
function fireConfetti() {
    if (typeof confetti !== 'function') return;

    const defaults = { startVelocity: 30, spread: 360, ticks: 80, zIndex: 9999 };

    // Burst 1 — center
    confetti({ ...defaults, particleCount: 80, origin: { x: 0.5, y: 0.35 } });

    // Burst 2 — left side (delayed)
    setTimeout(() => {
        confetti({ ...defaults, particleCount: 50, origin: { x: 0.2, y: 0.5 } });
    }, 250);

    // Burst 3 — right side (delayed)
    setTimeout(() => {
        confetti({ ...defaults, particleCount: 50, origin: { x: 0.8, y: 0.5 } });
    }, 400);

    // Burst 4 — stars from top
    setTimeout(() => {
        confetti({
            particleCount: 30,
            spread: 100,
            startVelocity: 45,
            origin: { x: 0.5, y: 0 },
            shapes: ['star'],
            colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
            zIndex: 9999,
        });
    }, 600);
}

/**
 * Show a celebration toast at the top of the screen.
 */
function showCelebrationToast(tier) {
    // Remove any existing toast
    document.getElementById('milestoneToast')?.remove();

    const toast = document.createElement('div');
    toast.id = 'milestoneToast';
    toast.className = 'milestone-toast';
    toast.innerHTML = `
        <div class="milestone-toast-inner">
            <div class="flex items-center gap-3">
                <span class="text-3xl">${tier.emoji}</span>
                <div class="min-w-0">
                    <div class="font-bold text-gray-900 text-sm sm:text-base">Milestone Unlocked!</div>
                    <div class="text-gray-600 text-xs sm:text-sm truncate">${tier.name} — ${formatCurrency(tier.threshold)}</div>
                </div>
            </div>
            <button onclick="dismissCelebrationToast()" class="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
    });

    // Auto-dismiss after 6 seconds
    setTimeout(() => dismissCelebrationToast(), 6000);
}

/**
 * Dismiss the celebration toast with animation.
 */
function dismissCelebrationToast() {
    const toast = document.getElementById('milestoneToast');
    if (!toast) return;
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 400);
}
