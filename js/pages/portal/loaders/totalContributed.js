export async function loadTotalContributed(userId) {
    try {
        const { data: total, error } = await supabaseClient
            .rpc('get_member_total_contributions', { target_member_id: userId });

        if (error) {
            console.error('Error loading total contributions:', error);
            return;
        }

        const totalContributedEl = document.getElementById('totalContributed');
        const historyTotalEl = document.getElementById('historyTotal');

        if (totalContributedEl) totalContributedEl.textContent = formatCurrency(total || 0);
        if (historyTotalEl) historyTotalEl.textContent = formatCurrency(total || 0);
    } catch (error) {
        console.error('Error calculating total:', error);
    }
}
