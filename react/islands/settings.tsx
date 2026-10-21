import { mountIsland } from '../lib/mount';
import { BillingSection } from '../features/billing/BillingSection';
import { ProfileSection } from '../features/profile/ProfileSection';

// One bundle per page so React loads once
mountIsland('react-settings-profile', <ProfileSection />);
mountIsland('react-settings-billing', <BillingSection />);
