// Admin Brand Settings — Logo Upload & Management

const BRAND_PATHS = {
    transparent: 'brand/logo-transparent.png',
    solid: 'brand/logo-solid',
};
const BUCKET = 'profile-pictures';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

document.addEventListener('DOMContentLoaded', async function () {
    const user = await checkAuth(true);
    if (!user) return;

    // Load existing logos
    await loadExistingLogos();

    // File inputs
    document.getElementById('transparentFile').addEventListener('change', (e) => handleUpload(e, 'transparent'));
    document.getElementById('solidFile').addEventListener('change', (e) => handleUpload(e, 'solid'));

    // Remove buttons
    document.getElementById('removeTransparent').addEventListener('click', () => handleRemove('transparent'));
    document.getElementById('removeSolid').addEventListener('click', () => handleRemove('solid'));

    // Checker toggle
    document.getElementById('checkerToggle').addEventListener('change', (e) => {
        const preview = document.getElementById('transparentPreview');
        if (e.target.checked) {
            preview.classList.add('checker-bg');
        } else {
            preview.classList.remove('checker-bg');
        }
    });

    // Add checker CSS dynamically
    const style = document.createElement('style');
    style.textContent = `
        .checker-bg {
            background-image: 
                linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
                linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
                linear-gradient(-45deg, transparent 75%, #e5e7eb 75%);
            background-size: 20px 20px;
            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
            background-color: #fff;
            border-style: solid;
            border-color: #e5e7eb;
        }
    `;
    document.head.appendChild(style);
});

async function loadExistingLogos() {
    // Check transparent logo
    await loadLogoPreview('transparent');
    await loadLogoPreview('solid');
}

async function loadLogoPreview(type) {
    try {
        // List files at the brand/ prefix to find the right one
        const prefix = type === 'transparent' ? 'brand/logo-transparent' : 'brand/logo-solid';
        
        const { data: files, error } = await supabaseClient.storage
            .from(BUCKET)
            .list('brand', { limit: 20 });

        if (error || !files) return;

        const match = files.find(f => f.name.startsWith(type === 'transparent' ? 'logo-transparent' : 'logo-solid'));
        if (!match) return;

        const filePath = `brand/${match.name}`;
        const { data: urlData } = supabaseClient.storage
            .from(BUCKET)
            .getPublicUrl(filePath);

        if (!urlData?.publicUrl) return;

        // Add cache buster
        const url = urlData.publicUrl + '?t=' + Date.now();

        const imgEl = document.getElementById(type === 'transparent' ? 'transparentImg' : 'solidImg');
        const placeholder = document.getElementById(type === 'transparent' ? 'transparentPlaceholder' : 'solidPlaceholder');
        const removeBtn = document.getElementById(type === 'transparent' ? 'removeTransparent' : 'removeSolid');
        const sizeEl = document.getElementById(type === 'transparent' ? 'transparentSize' : 'solidSize');

        imgEl.src = url;
        imgEl.classList.remove('hidden');
        placeholder.classList.add('hidden');
        removeBtn.classList.remove('hidden');

        // Show file size
        if (match.metadata?.size) {
            sizeEl.textContent = formatFileSize(match.metadata.size);
        }

        // Enable checker for transparent
        if (type === 'transparent') {
            const preview = document.getElementById('transparentPreview');
            preview.classList.add('checker-bg');
        }
    } catch (err) {
        console.error(`Failed to load ${type} logo:`, err);
    }
}

async function handleUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate
    if (file.size > MAX_FILE_SIZE) {
        showToast('File too large — max 5 MB', true);
        event.target.value = '';
        return;
    }

    if (type === 'transparent' && file.type !== 'image/png') {
        showToast('Transparent logo must be a PNG file', true);
        event.target.value = '';
        return;
    }

    // Determine extension
    const ext = file.name.split('.').pop().toLowerCase();
    const storagePath = type === 'transparent'
        ? BRAND_PATHS.transparent
        : `${BRAND_PATHS.solid}.${ext}`;

    try {
        // Remove any existing file for this type first
        await removeExistingBrandFile(type);

        // Upload
        const { data, error } = await supabaseClient.storage
            .from(BUCKET)
            .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: true,
                contentType: file.type,
            });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabaseClient.storage
            .from(BUCKET)
            .getPublicUrl(storagePath);

        const url = urlData.publicUrl + '?t=' + Date.now();

        // Update preview
        const imgEl = document.getElementById(type === 'transparent' ? 'transparentImg' : 'solidImg');
        const placeholder = document.getElementById(type === 'transparent' ? 'transparentPlaceholder' : 'solidPlaceholder');
        const removeBtn = document.getElementById(type === 'transparent' ? 'removeTransparent' : 'removeSolid');
        const sizeEl = document.getElementById(type === 'transparent' ? 'transparentSize' : 'solidSize');

        imgEl.src = url;
        imgEl.classList.remove('hidden');
        placeholder.classList.add('hidden');
        removeBtn.classList.remove('hidden');
        sizeEl.textContent = formatFileSize(file.size);

        if (type === 'transparent') {
            document.getElementById('transparentPreview').classList.add('checker-bg');
        }

        showToast(`${type === 'transparent' ? 'Transparent' : 'Solid'} logo uploaded!`);
    } catch (err) {
        console.error('Upload failed:', err);
        showToast('Upload failed — ' + (err.message || 'try again'), true);
    }

    event.target.value = '';
}

async function removeExistingBrandFile(type) {
    try {
        const { data: files } = await supabaseClient.storage
            .from(BUCKET)
            .list('brand', { limit: 20 });

        if (!files) return;

        const prefix = type === 'transparent' ? 'logo-transparent' : 'logo-solid';
        const toRemove = files.filter(f => f.name.startsWith(prefix)).map(f => `brand/${f.name}`);

        if (toRemove.length > 0) {
            await supabaseClient.storage.from(BUCKET).remove(toRemove);
        }
    } catch (err) {
        console.warn('Could not clean up old files:', err);
    }
}

async function handleRemove(type) {
    if (!confirm(`Remove the ${type} logo?`)) return;

    try {
        await removeExistingBrandFile(type);

        const imgEl = document.getElementById(type === 'transparent' ? 'transparentImg' : 'solidImg');
        const placeholder = document.getElementById(type === 'transparent' ? 'transparentPlaceholder' : 'solidPlaceholder');
        const removeBtn = document.getElementById(type === 'transparent' ? 'removeTransparent' : 'removeSolid');
        const sizeEl = document.getElementById(type === 'transparent' ? 'transparentSize' : 'solidSize');

        imgEl.src = '';
        imgEl.classList.add('hidden');
        placeholder.classList.remove('hidden');
        removeBtn.classList.add('hidden');
        sizeEl.textContent = '';

        if (type === 'transparent') {
            document.getElementById('transparentPreview').classList.remove('checker-bg');
        }

        showToast(`${type === 'transparent' ? 'Transparent' : 'Solid'} logo removed`);
    } catch (err) {
        console.error('Remove failed:', err);
        showToast('Failed to remove — try again', true);
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium fade-in ${
        isError ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
    }`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}
