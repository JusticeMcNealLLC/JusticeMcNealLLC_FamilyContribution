export async function openBillingPortal() {
    try {
        const result = await callEdgeFunction('create-billing-portal');

        if (result.url) {
            window.location.href = result.url;
        }
    } catch (error) {
        console.error('Error opening billing portal:', error);
        alert('Failed to open billing portal. Please try again.');
    }
}
