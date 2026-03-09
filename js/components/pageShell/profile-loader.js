// ─── Page Shell: Nav Profile Loader ──────────────────────
// Loads profile data into nav & tab bar avatars + badge overlays.
// Called by auth/shared.js on DOMContentLoaded.
// ─────────────────────────────────────────────────────────

async function loadNavProfile() {
    try {
        var sess = await supabaseClient.auth.getSession();
        if (!sess.data.session) return;

        var uid = sess.data.session.user.id;
        var res = await supabaseClient
            .from('profiles')
            .select('first_name, last_name, profile_picture_url, displayed_badge')
            .eq('id', uid)
            .single();

        if (!res.data) return;

        var firstName   = res.data.first_name || '';
        var lastName    = res.data.last_name  || '';
        var initials    = ((firstName.charAt(0) || '') + (lastName.charAt(0) || '')).toUpperCase() || '?';
        var photoUrl    = res.data.profile_picture_url;
        var badgeKey    = res.data.displayed_badge || '';

        // Desktop nav — profile area
        var btn        = document.getElementById('profileDropdownBtn');
        var profileLink = document.getElementById('navProfileLink');
        var section    = document.getElementById('navProfileSection');
        var nameEl     = document.getElementById('navProfileName');
        var initialsEl = document.getElementById('navProfileInitials');
        var imgEl      = document.getElementById('navProfileImg');

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

        // Tab bar profile avatar
        var tInitialsEl = document.getElementById('tabProfileInitials');
        var tImgEl      = document.getElementById('tabProfileImg');

        if (tInitialsEl) tInitialsEl.textContent = initials;
        if (photoUrl && tImgEl) {
            tImgEl.src = photoUrl;
            tImgEl.onload = function () {
                tImgEl.classList.remove('hidden');
                if (tInitialsEl) tInitialsEl.classList.add('hidden');
            };
        }

        // Render badge overlays
        _renderBadgeOverlays(badgeKey);

    } catch (e) {
        console.error('loadNavProfile error:', e);
    }
}

/**
 * Render the active badge chip overlay into all avatar badge slots.
 */
function _renderBadgeOverlays(badgeKey) {
    var overlayIds = ['navBadgeOverlay'];
    for (var i = 0; i < overlayIds.length; i++) {
        var el = document.getElementById(overlayIds[i]);
        if (!el) continue;
        if (!badgeKey) { el.innerHTML = ''; continue; }

        if (typeof buildNavBadgeOverlay === 'function') {
            el.innerHTML = buildNavBadgeOverlay(badgeKey);
        } else {
            var badge = _badgeFallback(badgeKey);
            el.innerHTML = '<div class="badge-chip-overlay" title="' + badge.name + '">' + badge.emoji + '</div>';
        }
    }
}

/** Minimal badge lookup for pages without quests/config.js */
function _badgeFallback(key) {
    var catalog = {
        founding_member: { emoji: '🏅', name: 'Founding Member' },
        shutterbug:      { emoji: '📸', name: 'Shutterbug' },
        streak_master:   { emoji: '🔥', name: 'Streak Master' },
        streak_legend:   { emoji: '⚡', name: 'Streak Legend' },
        first_seed:      { emoji: '🌱', name: 'First Seed Witness' },
        four_figures:    { emoji: '💵', name: 'Four Figure Club' },
        quest_champion:  { emoji: '🎯', name: 'Quest Champion' },
        fidelity_linked: { emoji: '🏦', name: 'Fidelity Linked' },
        birthday_vip:    { emoji: '🎂', name: 'Birthday VIP' },
    };
    return catalog[key] || { emoji: '❓', name: key };
}
