import { applyCachedBrandLogos, refreshBrandLogos } from '../login/render/brandLogo.js';
import { initRecoveryFlow } from './ui/recovery.js';
import { bindPasswordForm } from './ui/bindPasswordForm.js';
import { bindPasswordToggle } from '../login/ui/passwordToggle.js';

applyCachedBrandLogos();

async function init() {
    refreshBrandLogos();

    const canContinue = await initRecoveryFlow();
    if (canContinue) {
        bindPasswordForm();
        bindPasswordToggle('password', 'togglePassword');
        bindPasswordToggle('confirmPassword', 'toggleConfirmPassword');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
