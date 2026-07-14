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
        case 'trialing':
            return 'Trial';
        default:
            return status || '--';
    }
}
