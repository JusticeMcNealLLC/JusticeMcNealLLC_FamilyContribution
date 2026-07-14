import { applyCachedBrandLogos, refreshBrandLogos } from './render/brandLogo.js';
import { showDeactivatedQueryError, checkAlreadyLoggedIn } from './ui/session.js';
import { bindForms } from './ui/bindForms.js';
import { bindPasswordToggle } from './ui/passwordToggle.js';
import { runHandoffEntrance } from './ui/handoffEntrance.js';

runHandoffEntrance();
applyCachedBrandLogos();

function init() {
    showDeactivatedQueryError();
    refreshBrandLogos();

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        checkAlreadyLoggedIn();
    }

    bindForms();
    bindPasswordToggle('password', 'togglePassword');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
