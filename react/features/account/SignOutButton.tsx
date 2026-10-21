import { useState } from 'react';

export function SignOutButton() {
    const [signingOut, setSigningOut] = useState(false);

    async function signOut() {
        setSigningOut(true);
        await handleLogout();
    }

    return (
        <button
            type="button" onClick={signOut} disabled={signingOut}
            className="fade-in w-full min-h-[52px] flex items-center justify-center gap-2 rounded-2xl border border-jm-border bg-white font-jm-body text-[15px] font-bold text-jm-muted transition hover:text-red-700 hover:border-red-200 hover:bg-red-50 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jm-primary"
            style={{ animationDelay: '340ms' }}
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {signingOut ? 'Signing out…' : 'Sign Out'}
        </button>
    );
}
