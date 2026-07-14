export function setGreeting() {
    const greetEl = document.getElementById('greeting');
    if (!greetEl) return;

    const hour = new Date().getHours();
    const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    greetEl.textContent = `Good ${period},`;
}
