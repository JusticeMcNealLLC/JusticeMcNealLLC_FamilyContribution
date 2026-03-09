// ═══════════════════════════════════════════════════════════
// Feed — Composer (Create Post)
// ═══════════════════════════════════════════════════════════

// ─── Composer Avatars ───────────────────────────────────
function setComposerAvatars(profile) {
    const fi = (profile?.first_name || '')[0] || '';
    const li = (profile?.last_name || '')[0] || '';
    const initials = (fi + li).toUpperCase() || '?';
    const photoUrl = profile?.profile_picture_url;

    // Modal composer
    const mi = document.getElementById('modalComposerInitials');
    const ma = document.getElementById('modalComposerAvatar');
    const mn = document.getElementById('modalComposerName');
    if (mi) mi.textContent = initials;
    if (mn) mn.textContent = (profile?.first_name || 'You');
    if (photoUrl && ma) { ma.src = photoUrl; ma.classList.remove('hidden'); mi?.classList.add('hidden'); }

    // Inline composer (desktop)
    const ici = document.getElementById('inlineComposerInitials');
    const ica = document.getElementById('inlineComposerAvatar');
    if (ici) ici.textContent = initials;
    if (photoUrl && ica) { ica.src = photoUrl; ica.classList.remove('hidden'); ici?.classList.add('hidden'); }

    // Comment input
    const cmi = document.getElementById('commentInitials');
    const cma = document.getElementById('commentAvatar');
    if (cmi) cmi.textContent = initials;
    if (photoUrl && cma) { cma.src = photoUrl; cma.classList.remove('hidden'); cmi?.classList.add('hidden'); }
}

// ─── Composer Setup ─────────────────────────────────────
function setupComposer() {
    const newPostBtn = document.getElementById('newPostBtn');
    const emptyBtn = document.getElementById('emptyStatePostBtn');
    const modal = document.getElementById('composerModal');
    const closeBtn = document.getElementById('composerCloseBtn');
    const backdrop = document.getElementById('composerBackdrop');
    const submitBtn = document.getElementById('composerSubmitBtn');
    const content = document.getElementById('postContent');
    const charCount = document.getElementById('charCount');
    const imageInput = document.getElementById('postImageInput');
    const videoInput = document.getElementById('postVideoInput');

    function openComposerModal() {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        setTimeout(() => content?.focus(), 200);
    }

    function closeComposerModal() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        content.value = '';
        charCount.textContent = '0 / 2000';
        submitBtn.disabled = true;
        clearImagePreviews();
        selectedImages = [];
    }

    const openComposerBtn = document.getElementById('openComposerBtn');
    if (newPostBtn) newPostBtn.addEventListener('click', openComposerModal);
    if (emptyBtn) emptyBtn.addEventListener('click', openComposerModal);
    if (openComposerBtn) openComposerBtn.addEventListener('click', openComposerModal);
    if (closeBtn) closeBtn.addEventListener('click', closeComposerModal);
    if (backdrop) backdrop.addEventListener('click', closeComposerModal);

    // Quick action buttons in inline composer
    document.querySelectorAll('.composer-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openComposerModal();
            const action = btn.dataset.action;
            if (action === 'announce') {
                setTimeout(() => {
                    const typeSelect = document.getElementById('postType');
                    if (typeSelect) typeSelect.value = 'announcement';
                }, 200);
            }
        });
    });

    // Character count
    if (content) {
        content.addEventListener('input', () => {
            const len = content.value.length;
            charCount.textContent = `${len} / 2000`;
            submitBtn.disabled = len === 0 && selectedImages.length === 0;
        });
    }

    // Image upload
    let selectedImages = [];
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files).slice(0, 4 - selectedImages.length);
            selectedImages.push(...files);
            renderImagePreviews(selectedImages);
            submitBtn.disabled = content.value.length === 0 && selectedImages.length === 0;
            imageInput.value = '';
        });
    }

    function renderImagePreviews(files) {
        const area = document.getElementById('imagePreviewArea');
        const grid = document.getElementById('imagePreviewGrid');
        if (!area || !grid) return;

        if (files.length === 0) { area.classList.add('hidden'); grid.innerHTML = ''; return; }
        area.classList.remove('hidden');

        const cols = files.length === 1 ? 'grid-cols-1' : 'grid-cols-2';
        grid.className = `grid gap-2 ${cols}`;
        grid.innerHTML = files.map((f, i) => `
            <div class="relative rounded-xl overflow-hidden bg-gray-100 aspect-square">
                <img src="${URL.createObjectURL(f)}" class="w-full h-full object-cover" alt="">
                <button class="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition remove-img-btn" data-idx="${i}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        `).join('');

        grid.querySelectorAll('.remove-img-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedImages.splice(parseInt(btn.dataset.idx), 1);
                renderImagePreviews(selectedImages);
                submitBtn.disabled = content.value.length === 0 && selectedImages.length === 0;
            });
        });
    }

    function clearImagePreviews() {
        const area = document.getElementById('imagePreviewArea');
        const grid = document.getElementById('imagePreviewGrid');
        if (area) area.classList.add('hidden');
        if (grid) grid.innerHTML = '';
    }

    // Submit post
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const text = content.value.trim();
            if (!text && selectedImages.length === 0) return;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Posting...';

            try {
                // Determine post type
                let postType = 'text';
                if (selectedImages.length > 0) postType = 'photo';

                const isPinned = isAdmin && document.getElementById('isPinnedCheck')?.checked;
                const visibility = document.getElementById('postVisibility')?.value || 'family';

                // Check if announcement quick btn was the trigger
                const isAnnouncement = isAdmin && document.querySelector('.composer-quick-btn[data-type="announcement"]')?.classList.contains('selected');
                if (isAnnouncement) postType = 'announcement';

                // Insert post
                const { data: post, error } = await supabaseClient
                    .from('posts')
                    .insert({
                        author_id: feedUser.id,
                        content: text,
                        post_type: postType,
                        visibility: visibility,
                        is_pinned: isPinned || false,
                    })
                    .select()
                    .single();

                if (error) throw error;

                // Upload images
                if (selectedImages.length > 0) {
                    for (let i = 0; i < selectedImages.length; i++) {
                        const file = selectedImages[i];
                        const ext = file.name.split('.').pop();
                        const path = `${feedUser.id}/${post.id}/${i}.${ext}`;

                        const { error: uploadErr } = await supabaseClient.storage
                            .from('post-media')
                            .upload(path, file, { contentType: file.type, upsert: true });

                        if (uploadErr) { console.error('Upload error:', uploadErr); continue; }

                        const { data: { publicUrl } } = supabaseClient.storage
                            .from('post-media')
                            .getPublicUrl(path);

                        await supabaseClient.from('post_images').insert({
                            post_id: post.id,
                            image_url: publicUrl,
                            sort_order: i,
                        });
                    }
                }

                // Close modal & prepend post to feed
                closeComposerModal();
                await prependNewPost(post.id);

            } catch (err) {
                console.error('Error creating post:', err);
                alert('Failed to create post. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Post';
            }
        });
    }
}
