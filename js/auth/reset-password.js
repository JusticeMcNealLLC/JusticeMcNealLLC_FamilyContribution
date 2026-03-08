// Reset password page logic
// Only loaded on auth/reset-password.html

document.addEventListener('DOMContentLoaded', async function() {
    const passwordForm = document.getElementById('passwordForm');
    const errorState = document.getElementById('errorState');
    const formError = document.getElementById('formError');
    const formSuccess = document.getElementById('formSuccess');
    const submitBtn = document.getElementById('submitBtn');

    // Check for access_token in URL hash (Supabase redirects with hash)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    // Also check query params (some flows use these)
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get('token');
    const tokenType = queryParams.get('type');

    // If we have an access_token in hash, Supabase has already processed the link
    // and we have a valid session
    if (accessToken) {
        // Session should be automatically set by Supabase
        console.log('Access token found, session should be active');
    } else if (!token && !accessToken) {
        // Check if there's an existing session from the recovery flow
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            // No valid token or session
            passwordForm.classList.add('hidden');
            errorState.classList.remove('hidden');
            return;
        }
    }

    // Handle form submit
    passwordForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Hide previous messages
        formError.classList.add('hidden');
        formSuccess.classList.add('hidden');

        // Validate passwords match
        if (password !== confirmPassword) {
            formError.textContent = 'Passwords do not match';
            formError.classList.remove('hidden');
            return;
        }

        // Validate password length
        if (password.length < 6) {
            formError.textContent = 'Password must be at least 6 characters';
            formError.classList.remove('hidden');
            return;
        }

        // Disable button
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        `;

        try {
            // Update the user's password
            const { error } = await supabaseClient.auth.updateUser({
                password: password
            });

            if (error) throw error;

            // Mark setup as completed
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                await supabaseClient
                    .from('profiles')
                    .update({ setup_completed: true })
                    .eq('id', session.user.id);
            }

            // Success!
            formSuccess.textContent = 'Password set successfully! Redirecting...';
            formSuccess.classList.remove('hidden');
            passwordForm.querySelector('button').textContent = 'Success!';

            // Redirect to portal after a moment
            setTimeout(async () => {
                // Check if user is admin or needs onboarding
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session) {
                    const { data: profile } = await supabaseClient
                        .from('profiles')
                        .select('role, setup_completed')
                        .eq('id', session.user.id)
                        .single();

                    if (profile?.role === 'admin') {
                        window.location.href = '../admin/index.html';
                    } else if (!profile?.setup_completed) {
                        window.location.href = '../portal/onboarding.html';
                    } else {
                        window.location.href = '../portal/index.html';
                    }
                } else {
                    window.location.href = 'login.html';
                }
            }, 1500);

        } catch (error) {
            console.error('Error:', error);
            formError.textContent = error.message || 'Failed to set password';
            formError.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Set Password';
        }
    });
});
