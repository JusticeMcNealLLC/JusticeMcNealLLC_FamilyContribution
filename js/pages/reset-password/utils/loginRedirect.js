export function loginUrlForDeactivated() {
    const base = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.LOGIN_URL) || '/pages/login/';
    const joiner = base.includes('?') ? '&' : '?';
    return base + joiner + 'error=account_deactivated';
}
