/** Loads profile data into nav and tab bar avatars. Called by auth/shared.js on DOMContentLoaded. */
export async function loadNavProfile() {
    try {
        const sess = await supabaseClient.auth.getSession();
        if (!sess.data.session) return;

        const uid = sess.data.session.user.id;
        const res = await supabaseClient
            .from('profiles')
            .select('first_name, last_name, profile_picture_url, displayed_badge')
            .eq('id', uid)
            .single();

        if (!res.data) return;

        const firstName = res.data.first_name || '';
        const lastName = res.data.last_name || '';
        const initials = ((firstName.charAt(0) || '') + (lastName.charAt(0) || '')).toUpperCase() || '?';
        const photoUrl = res.data.profile_picture_url;
        const badgeKey = res.data.displayed_badge || '';

        const btn = document.getElementById('profileDropdownBtn');
        const profileLink = document.getElementById('navProfileLink');
        const section = document.getElementById('navProfileSection');
        const nameEl = document.getElementById('navProfileName');
        const initialsEl = document.getElementById('navProfileInitials');
        const imgEl = document.getElementById('navProfileImg');

        if (profileLink) {
            if (nameEl) nameEl.textContent = firstName || 'Member';
            if (initialsEl) initialsEl.textContent = initials;
            if (photoUrl && imgEl) {
                imgEl.src = photoUrl;
                imgEl.onload = function () {
                    imgEl.classList.remove('hidden');
                    if (initialsEl) initialsEl.classList.add('hidden');
                };
            }
            profileLink.classList.remove('hidden');
            if (btn) btn.classList.remove('hidden');
        } else if (section) {
            if (nameEl) nameEl.textContent = firstName || 'Member';
            if (initialsEl) initialsEl.textContent = initials;
            if (photoUrl && imgEl) {
                imgEl.src = photoUrl;
                imgEl.onload = function () {
                    imgEl.classList.remove('hidden');
                    if (initialsEl) initialsEl.classList.add('hidden');
                };
            }
            section.classList.remove('hidden');
        }

        const tInitialsEl = document.getElementById('tabProfileInitials');
        const tImgEl = document.getElementById('tabProfileImg');

        if (tInitialsEl) tInitialsEl.textContent = initials;
        if (photoUrl && tImgEl) {
            tImgEl.src = photoUrl;
            tImgEl.onload = function () {
                tImgEl.classList.remove('hidden');
                if (tInitialsEl) tInitialsEl.classList.add('hidden');
            };
        }

        renderBadgeOverlays(badgeKey);
    } catch (e) {
        console.error('loadNavProfile error:', e);
    }
}

function renderBadgeOverlays(badgeKey) {
    const overlayIds = ['navBadgeOverlay'];
    for (let i = 0; i < overlayIds.length; i++) {
        const el = document.getElementById(overlayIds[i]);
        if (!el) continue;
        if (!badgeKey) { el.innerHTML = ''; continue; }

        if (typeof buildNavBadgeOverlay === 'function') {
            el.innerHTML = buildNavBadgeOverlay(badgeKey);
        } else {
            const badge = badgeFallback(badgeKey);
            el.innerHTML = '<div class="badge-chip-overlay" title="' + badge.name + '">' + badge.emoji + '</div>';
        }

        if (typeof LottieEffects !== 'undefined') {
            setTimeout(function () { LottieEffects.applyBadgeEffects(); }, 150);
        }
    }
}

function badgeFallback(key) {
    const catalog = {
        founding_member: { emoji: '🏅', name: 'Founding Member' },
        shutterbug: { emoji: '📸', name: 'Shutterbug' },
        streak_master: { emoji: '🔥', name: 'Streak Master' },
        streak_legend: { emoji: '⚡', name: 'Streak Legend' },
        first_seed: { emoji: '🌱', name: 'First Seed Witness' },
        four_figures: { emoji: '💵', name: 'Four Figure Club' },
        quest_champion: { emoji: '🎯', name: 'Quest Champion' },
        fidelity_linked: { emoji: '🏦', name: 'Fidelity Linked' },
        birthday_vip: { emoji: '🎂', name: 'Birthday VIP' },
    };
    return catalog[key] || { emoji: '❓', name: key };
}
