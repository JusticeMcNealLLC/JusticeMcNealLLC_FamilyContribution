import { guardDeactivatedRecoverySession } from './recovery.js';
import { redirectAfterPasswordSet } from '../utils/postResetRedirect.js';

const SUBMIT_SPINNER = `
    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
`;

export function bindPasswordForm() {
    const passwordForm = document.getElementById('passwordForm');
    const formError = document.getElementById('formError');
    const formSuccess = document.getElementById('formSuccess');
    const submitBtn = document.getElementById('submitBtn');
    if (!passwordForm || !formError || !formSuccess || !submitBtn) return;

    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        formError.classList.add('hidden');
        formSuccess.classList.add('hidden');

        if (password !== confirmPassword) {
            formError.textContent = 'Passwords do not match';
            formError.classList.remove('hidden');
            return;
        }

        if (password.length < 6) {
            formError.textContent = 'Password must be at least 6 characters';
            formError.classList.remove('hidden');
            return;
        }

        if (!await guardDeactivatedRecoverySession()) {
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = SUBMIT_SPINNER;

        try {
            const { error } = await supabaseClient.auth.updateUser({ password });
            if (error) throw error;

            if (!await guardDeactivatedRecoverySession()) {
                return;
            }

            formSuccess.textContent = 'Password set successfully! Redirecting...';
            formSuccess.classList.remove('hidden');
            passwordForm.querySelector('button').textContent = 'Success!';

            setTimeout(() => {
                redirectAfterPasswordSet();
            }, 1500);
        } catch (error) {
            console.error('Error:', error);
            formError.textContent = error.message || 'Failed to set password';
            formError.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Set Password';
        }
    });
}
