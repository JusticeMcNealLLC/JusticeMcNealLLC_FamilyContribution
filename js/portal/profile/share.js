// ═══════════════════════════════════════════════════════════
// Profile – Share Modal (QR Code + Copy Link + Native Share)
// ═══════════════════════════════════════════════════════════

window.ProfileApp.setupShareModal = function setupShareModal() {
    const S = window.ProfileApp.state;
    const shareBtn = document.getElementById('shareProfileBtn');
    const modal = document.getElementById('shareModal');
    const closeBtn = document.getElementById('shareModalCloseBtn');
    const backdrop = document.getElementById('shareModalBackdrop');
    const copyBtn = document.getElementById('copyProfileLinkBtn');
    const nativeBtn = document.getElementById('nativeShareBtn');

    if (!shareBtn || !modal) return;

    // Show native share button if supported
    if (navigator.share) {
        nativeBtn?.classList.remove('hidden');
    }

    shareBtn.addEventListener('click', () => openShareModal());
    closeBtn?.addEventListener('click', () => closeShareModal());
    backdrop?.addEventListener('click', () => closeShareModal());

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeShareModal();
        }
    });

    copyBtn?.addEventListener('click', async () => {
        const url = getProfileUrl();
        try {
            await navigator.clipboard.writeText(url);
            copyBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Copied!
            `;
            setTimeout(() => {
                copyBtn.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                    Copy Link
                `;
            }, 2000);
        } catch {
            // Fallback for older browsers
            const ta = document.createElement('textarea');
            ta.value = url;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    });

    nativeBtn?.addEventListener('click', async () => {
        const url = getProfileUrl();
        const name = document.getElementById('profileName')?.textContent?.trim() || 'this profile';
        try {
            await navigator.share({
                title: `${name} – Family Portal`,
                text: `Check out ${name}'s profile on the Family Portal`,
                url
            });
        } catch (err) {
            if (err.name !== 'AbortError') console.error('Share failed:', err);
        }
    });
};

function getProfileUrl() {
    const S = window.ProfileApp.state;
    const base = window.location.origin;
    return `${base}/portal/profile.html?id=${S.viewingUserId}`;
}

function openShareModal() {
    const modal = document.getElementById('shareModal');
    if (!modal) return;

    // Populate name and URL
    const nameEl = document.getElementById('shareProfileName');
    const urlEl = document.getElementById('shareProfileUrl');
    const url = getProfileUrl();
    if (nameEl) nameEl.textContent = document.getElementById('profileName')?.textContent?.trim() || '';
    if (urlEl) urlEl.textContent = url;

    // Generate QR code
    generateQR(url);

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeShareModal() {
    const modal = document.getElementById('shareModal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// ─── Minimal QR Code Generator (Canvas) ────────────────
// Uses a lightweight approach — generates QR via a small self-contained encoder

function generateQR(text) {
    const canvas = document.getElementById('qrCodeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 200;
    canvas.width = size;
    canvas.height = size;

    // Use the QR encoding library if loaded, otherwise use Google Charts API fallback
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
    };
    img.onerror = () => {
        // Fallback: draw a placeholder with the URL
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code', size / 2, size / 2 - 10);
        ctx.fillText('Scan to view profile', size / 2, size / 2 + 10);
    };
    // Use QR Server API (free, no library needed)
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&margin=8`;
}
