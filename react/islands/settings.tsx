import { mountIsland } from '../lib/mount';
import { AccountSection } from '../features/account/AccountSection';
import { SignOutButton } from '../features/account/SignOutButton';
import { BillingSection } from '../features/billing/BillingSection';
import { CancelSubscriptionSection } from '../features/billing/CancelSubscriptionSection';
import { NotificationsSection } from '../features/notifications/NotificationsSection';
import { PayoutsSection } from '../features/payouts/PayoutsSection';
import { ProfileSection } from '../features/profile/ProfileSection';

mountIsland(
    'react-settings',
    <>
        <ProfileSection />
        <AccountSection />
        <BillingSection />
        <PayoutsSection />
        <NotificationsSection />
        <CancelSubscriptionSection />
        <SignOutButton />
    </>,
);
