export function isProfileDeactivated(profile) {
    return profile != null && profile.is_active === false;
}

export async function signOutDeactivatedUser() {
    try {
        await supabaseClient.auth.signOut({ scope: 'global' });
    } catch (_) { /* ignore */ }
}
