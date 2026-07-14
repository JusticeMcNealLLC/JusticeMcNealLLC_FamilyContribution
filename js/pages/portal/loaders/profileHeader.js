export function formatContributionStreakText(months) {
    const count = Number(months) || 0;
    if (count <= 0) return 'Start your streak';
    if (count === 1) return '1 month strong';
    return `${count} months strong`;
}

export async function loadProfileHeader(userId) {
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('first_name, last_name, profile_picture_url, role, contribution_streak')
            .eq('id', userId)
            .single();

        if (error || !profile) return profile;

        const nameEl = document.getElementById('userDisplayName');
        if (nameEl) {
            const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
            if (fullName) nameEl.textContent = fullName;
        }

        const headerAvatar = document.getElementById('headerAvatar');
        if (headerAvatar && profile.profile_picture_url) {
            const img = document.createElement('img');
            img.src = profile.profile_picture_url;
            img.alt = 'Profile';
            img.className = 'w-full h-full object-cover';
            img.onload = () => {
                headerAvatar.innerHTML = '';
                headerAvatar.appendChild(img);
            };
        }

        const roleBadge = document.getElementById('userRoleBadge');
        if (roleBadge && profile.role) {
            roleBadge.textContent = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
        }

        const streakEl = document.getElementById('contributionStreakText');
        if (streakEl) {
            streakEl.textContent = formatContributionStreakText(profile.contribution_streak);
        }

        return profile;
    } catch (err) {
        console.error('Error loading profile header:', err);
        return null;
    }
}
