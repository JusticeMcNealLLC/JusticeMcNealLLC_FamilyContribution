export async function bindProfileNudge(userId) {
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('first_name, last_name, birthday, profile_picture_url, setup_completed')
            .eq('id', userId)
            .single();

        if (error || !profile) return;

        if (
            profile.setup_completed
            && profile.first_name
            && profile.last_name
            && profile.birthday
            && profile.profile_picture_url
        ) {
            return;
        }

        if (sessionStorage.getItem('nudgeDismissed')) return;

        const missing = [];
        if (!profile.first_name || !profile.last_name) missing.push('your name');
        if (!profile.birthday) missing.push('your birthday');
        if (!profile.profile_picture_url) missing.push('a profile photo');

        if (missing.length === 0) return;

        const banner = document.getElementById('profileNudgeBanner');
        const nudgeText = document.getElementById('nudgeMissingText');
        if (!banner) return;

        const missingStr = missing.length === 1
            ? missing[0]
            : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`;

        if (nudgeText) nudgeText.textContent = `Still needed: ${missingStr}.`;
        banner.classList.remove('hidden');

        const closeBtn = document.getElementById('closeNudgeBanner');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                banner.classList.add('hidden');
                sessionStorage.setItem('nudgeDismissed', '1');
            });
        }
    } catch (err) {
        console.error('Error checking profile completeness:', err);
    }
}
