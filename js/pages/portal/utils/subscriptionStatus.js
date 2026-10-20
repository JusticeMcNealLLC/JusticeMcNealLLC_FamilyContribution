export function getStatusText(status, cancelAtPeriodEnd) {
    if (cancelAtPeriodEnd) {
        return 'Canceling at period end';
    }

    switch (status) {
        case 'active':
            return 'Active';
        case 'past_due':
            return 'Past Due';
        case 'canceled':
            return 'Canceled';
        // trialing is only used to shift a member's billing date, not as a real trial
        case 'trialing':
            return 'Active';
        default:
            return status || '--';
    }
}
