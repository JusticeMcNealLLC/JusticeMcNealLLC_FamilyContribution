# 🏛️ Justice McNeal LLC — Generational Wealth Plan Roadmap

> **Mission:** Build and preserve generational wealth for the McNeal family through collective investment, shared benefits, and community.

> **Vision:** A family-owned ecosystem — part investment fund, part bank, part social hub — that empowers every member financially and strengthens family bonds for generations to come.

---

## 📍 Where We Are Today

### Current Infrastructure
- **Legal Entity:** Justice McNeal LLC (future plan: owned by a Family Trust)
- **Website:** [justicemcnealllc.com](https://justicemcnealllc.com) — Family Contribution Portal
- **Members:** Justin + siblings, all actively contributing
- **Tech Stack:** Supabase (auth + database), Stripe (subscriptions), GitHub Pages (hosting)

### Current Money Flow
```
Members (Monthly Subscription via Stripe)
    ↓
BlueVine Business Bank Account
    ↓
Fidelity LLC Brokerage Account
    ↓
Invested into:
    • VTI  — Vanguard Total Stock Market ETF
    • VXUS — Vanguard Total International Stock ETF
    • VIG  — Vanguard Dividend Appreciation ETF
    • SPAXX — Fidelity Government Money Market Fund
```

### Current Portal Features (Live ✅)
- [x] Member authentication (login / password reset)
- [x] Monthly subscription management via Stripe
- [x] Contribution page with current plan details
- [x] Payment history with invoices
- [x] Account settings (name, password)
- [x] Admin dashboard (member management, invite system)
- [x] Member activation / deactivation
- [x] Mobile-friendly design with bottom tab navigation

---

## 🗺️ The Roadmap

### Phase 1: Investment Visibility & Manual Deposits
**Status:** � In Progress
**Priority:** High
**Goal:** Members should be able to see where the money is and how it's growing.

#### 1A. Investment Dashboard
- [x] Dashboard showing total portfolio value
- [x] Breakdown by fund (VTI, VXUS, VIG, SPAXX) with percentages and dollar amounts
- [x] Growth over time chart (line graph via Chart.js)
- [x] Individual member contribution total (private, shown only to that member)
- [x] Family-wide contribution total (sum of all payments)
- [ ] Monthly/quarterly performance summary
- [x] Admin hub page with grid navigation
- [x] Admin investment management (Fidelity CSV upload + manual entry)
- [x] Snapshot history with change tracking
- [x] Allocation bar chart
- [x] Portfolio history table (desktop + mobile)
- [x] All portal pages updated with Investments nav link
- [x] Database: `investment_snapshots` + `investment_holdings` tables with RLS

##### Fidelity Data Integration Options
| Option | Pros | Cons | Feasibility |
|--------|------|------|-------------|
| **Plaid API** | Read-only connection to Fidelity, automated balance/holdings sync | Monthly cost, requires Plaid subscription, Fidelity connection can be finicky | ⭐⭐⭐ Medium |
| **Fidelity CSV Export + Manual Upload** | Free, accurate, no API dependency | Manual process (monthly), admin has to upload | ⭐⭐⭐⭐ High |
| **Manual Entry by Admin** | Simplest to build, no integrations | Tedious, prone to errors | ⭐⭐⭐⭐⭐ Highest |
| **Yodlee / MX (aggregators)** | Enterprise-grade data aggregation | Expensive, overkill for current scale | ⭐ Low |

> **Recommended Approach:** Start with **manual admin entry** (simple form to update balances/allocations monthly). Explore **Plaid** integration later as the fund grows. Plaid connects to Fidelity and can pull holdings, balances, and transactions programmatically.

#### 1B. One-Time / Manual Deposits
- [ ] "Extra Deposit" feature — members can make a one-time contribution outside of their subscription
- [ ] Admin-initiated manual deposit recording (for transfers like moving personal investments into the LLC account)
- [ ] Transaction log showing both Stripe subscription payments AND manual deposits
- [ ] Proper attribution — each manual deposit is tagged to the correct member with date and notes
- [ ] Running total per member (Stripe payments + manual deposits combined)

---

### Phase 2: Family Lending Program
**Status:** 🔲 Not Started
**Priority:** High
**Goal:** Become the family's own bank — low-interest loans that keep money in the family.

#### How It Works
- **30% of total LLC funds** are available in the lending pool at any given time
- Each member can borrow **up to 30% of their own total contribution amount**
- Interest rate is set **below market rate** for personal loans (e.g., if banks charge 10-15%, family rate could be 4-6%)
- Repayment terms are flexible but structured (monthly payments back to the LLC)
- Interest earned goes back into the investment fund — **the family profits from its own lending**

#### Features to Build
- [ ] Loan eligibility calculator (based on member's total contributions)
- [ ] Loan application form (amount, reason, preferred repayment term)
- [ ] Admin loan approval/denial workflow
- [ ] Loan agreement generation (digital signature)
- [ ] Repayment tracking dashboard (borrower view)
- [ ] Admin lending dashboard (all active loans, repayment status, pool availability)
- [ ] Automated payment reminders
- [ ] Late payment handling & policy
- [ ] Loan history per member

#### Legal Considerations (To Research)
- [ ] State lending regulations for LLC-to-member loans
- [ ] Required disclosures and documentation
- [ ] Interest rate compliance (usury laws)
- [ ] Tax implications of intra-family lending
- [ ] Promissory note templates
- [ ] Whether a lending license is needed (varies by state)

---

### Phase 3: Family Social Hub
**Status:** 🔲 Not Started
**Priority:** Medium
**Goal:** Make the portal more than finances — make it the family's digital home.

#### 3A. Social Feed & Announcements
- [ ] Admin announcements section (pinned to top of feed)
- [ ] Milestone celebrations (auto-generated: "The family just hit $10,000 in total investments! 🎉")
- [ ] Social feed — members can post text, images, and videos
- [ ] Like, comment, and bookmark posts
- [ ] Feed filtering (All / Announcements / Milestones / Member Posts)

#### 3B. Member Profiles
- [ ] Profile pictures (upload + crop)
- [ ] Bio / about section
- [ ] Member's post history on their profile page
- [ ] Member since date, contribution streak, badges
- [ ] Profile privacy settings

#### 3C. Private Messaging (DMs)
- [ ] One-on-one direct messages between members
- [ ] Real-time messaging (Supabase Realtime or similar)
- [ ] Message notifications
- [ ] Read receipts
- [ ] Optional: Group chats

#### 3D. Push & Text Notifications
- [ ] Push notifications (web push via service workers)
- [ ] SMS/text notifications via **Twilio** (or similar)
- [ ] Notification preferences per member (what they want to be notified about)
- [ ] Notification types:
  - New announcements
  - Event invites & RSVPs
  - DM received
  - Milestone reached
  - Loan status updates
  - Subscription reminders

---

### Phase 4: Events & Family Activities
**Status:** 🔲 Not Started
**Priority:** Medium
**Goal:** Bring the family together IRL with organized events and shared experiences.

#### 4A. Events System
- [ ] Create event (title, description, date/time, location, cover image)
- [ ] Event types: **Gathering**, **Birthday**, **Holiday**, **Vacation**, **Meeting**, **Custom**
- [ ] RSVP system (Going / Maybe / Not Going)
- [ ] See who's attending with profile pics
- [ ] Event reminders (push + SMS)
- [ ] Event comments / discussion thread
- [ ] Past events archive with photos

#### 4B. Vacation / Trip Events (Special Type)
- [ ] Trip-style events with a **deposit requirement**
- [ ] Members RSVP by submitting a deposit (goes into a trip pot)
- [ ] Pot covers shared expenses (Airbnb, rental cars, activities, etc.)
- [ ] The LLC pays from the pot on behalf of the group
- [ ] **No refunds for last-minute cancellations** (policy clearly stated at RSVP)
- [ ] Trip expense breakdown visible to all attendees
- [ ] Trip budget tracker (target vs. collected)

#### Example Flow
```
Jennifer creates "Jennifer's 54th Birthday Bash"
    📍 Location: The Venue, Atlanta GA
    📅 Saturday, July 18th at 6:00 PM
    
    → Push notification sent to all members:
      "🎂 Jennifer created an event! Jennifer's 54th Birthday
       at The Venue — Click here to RSVP"
    
    → Members tap notification → See event details → RSVP
    → Jennifer sees RSVP list with profile pics
    → Event page shows countdown, attendee list, and comments
```

---

### Phase 5: Family Gallery
**Status:** 🔲 Not Started
**Priority:** Medium
**Goal:** One place for all family memories — organized, searchable, and preserved forever.

#### Features
- [ ] Photo & video uploads (drag and drop, mobile camera support)
- [ ] Album creation (by event, year, person, custom)
- [ ] Metadata per photo:
  - Date taken
  - Location / address
  - People tagged (linked to member profiles)
  - Caption / description
  - Who uploaded it
- [ ] Search by person, date, location, or keyword
- [ ] Slideshow view
- [ ] Download originals
- [ ] Storage solution: Supabase Storage or S3-compatible bucket
- [ ] Auto-organize by date (timeline view)
- [ ] "On This Day" — resurface old memories

---

### Phase 6: Member Benefits Program
**Status:** 🔲 Not Started  
**Priority:** Medium-Low (requires significant legal research)
**Goal:** Make membership tangibly valuable beyond investment returns.

#### 6A. Family Vehicle Program 🚗
**Concept:** LLC-owned vehicle(s) available for members who need transportation — whether they're in a pinch, young and need a ride to work/school, or between cars.

- [ ] LLC purchases and owns the vehicle(s)
- [ ] Reservation / scheduling system on the portal
- [ ] Vehicle availability calendar
- [ ] Pickup/return process and condition logging
- [ ] Mileage tracking

##### Legal / Insurance Research Needed
- [ ] Commercial auto insurance for LLC-owned vehicles
- [ ] Liability structure — who's responsible in an accident?
- [ ] Study how Turo / Uber / Zipcar handle insurance & liability
- [ ] Per-use insurance model vs. blanket policy
- [ ] Member agreement / waiver for vehicle use
- [ ] Whether members pay for their own insurance while using the vehicle
- [ ] State-specific regulations for vehicle sharing within an LLC
- [ ] Maintenance responsibility and cost allocation
- [ ] Potential revenue model (small usage fee to cover insurance + maintenance)

#### 6B. Life Insurance Benefit 🛡️
**Concept:** A whole life insurance policy for every member, paid for by the LLC/Trust, with the Trust as primary beneficiary.

- [ ] Whole life policy issued for each active member
- [ ] LLC/Trust pays premiums from operating funds
- [ ] Trust is the primary beneficiary
- [ ] Percentage of payout goes to the member's children (if applicable)
- [ ] Policy details visible on member's portal profile
- [ ] Annual policy review process

##### Legal / Insurance Research Needed
- [ ] Group life insurance vs. individual policies for LLC members
- [ ] Tax implications of LLC-funded life insurance
- [ ] Insurable interest requirements
- [ ] Trust as beneficiary — proper documentation
- [ ] Member consent and medical underwriting process
- [ ] Cost projections per member per year
- [ ] Vesting schedule (minimum membership duration before policy is issued?)

#### 6C. Future Benefits (Ideas)
- [ ] Emergency fund access (separate from lending program)
- [ ] Education assistance / scholarship fund for members' children
- [ ] Financial literacy resources and workshops
- [ ] Tax preparation assistance
- [ ] Group discount programs (insurance, travel, etc.)
- [ ] Credit building assistance

---

### Phase 7: Family Compound / Real Estate
**Status:** 🔲 Not Started (Long-Term Vision)
**Priority:** Low (future phase — requires significant capital)
**Goal:** Family-owned land with affordable housing for members.

#### Vision
- LLC/Trust purchases land
- Build or place housing: house, duplex, multi-unit, or multiple small homes
- Members can live there at **below-market rent**
- Rent covers property maintenance, taxes, insurance, and contributes to LLC fund
- Builds equity for the family collectively

#### Considerations
- [ ] Real estate market research (target locations)
- [ ] Financing options (commercial loan, DSCR loan, fund from investment returns)
- [ ] Property management structure
- [ ] Tenant/member agreements (different from standard leases)
- [ ] Property maintenance plan and budget
- [ ] Insurance (property + liability)
- [ ] Tax implications of LLC-owned rental property
- [ ] Zoning laws for multi-unit on single property
- [ ] Timeline: Begin when investment fund reaches $______ (TBD)

---

### Phase 8: Trust Formation & Legal Structure
**Status:** 🔲 Not Started (Planned)
**Priority:** Medium (should happen before major asset acquisition)
**Goal:** Transition the LLC to be owned by a Family Trust for maximum asset protection and generational transfer.

- [ ] Research revocable vs. irrevocable trust structures
- [ ] Consult with estate planning attorney
- [ ] Draft trust agreement
- [ ] Transfer LLC ownership to the Trust
- [ ] Update all accounts and policies to reflect new structure
- [ ] Establish succession plan (who manages the Trust if current trustees can't)
- [ ] Annual trust review process
- [ ] Member education on how the trust works and protects them

---

### Phase 9: Milestone & Progress Tracker (Website Feature)
**Status:** 🔲 Not Started
**Priority:** Medium
**Goal:** A public-facing (to members) page that shows the progress of every feature and milestone.

#### Features
- [ ] Visual roadmap page on the portal (this document, but interactive)
- [ ] Progress bars for each phase
- [ ] Milestone timeline (auto-populated + admin-created)
- [ ] Celebration animations when milestones are hit
- [ ] Examples of milestones:
  - "First $1,000 invested"
  - "First $10,000 invested"
  - "5 active members"
  - "10 active members"
  - "First loan issued"
  - "Family car acquired"
  - "Trust established"
  - "Family compound purchased"

---

## 📊 Priority Matrix

| Phase | Name | Priority | Complexity | Dependencies |
|-------|------|----------|------------|--------------|
| 1A | Investment Dashboard | 🔴 High | Medium | Fidelity data (manual or Plaid) |
| 1B | Manual Deposits | 🔴 High | Low-Medium | Database schema update |
| 2 | Family Lending | 🔴 High | High | Legal research, loan tracking system |
| 3A | Social Feed | 🟡 Medium | Medium | Supabase storage for media |
| 3B | Member Profiles | 🟡 Medium | Medium | Profile pics storage |
| 3C | Private Messaging | 🟡 Medium | Medium-High | Supabase Realtime |
| 3D | Notifications | 🟡 Medium | Medium | Twilio account, service workers |
| 4A | Events System | 🟡 Medium | Medium | Notification system (Phase 3D) |
| 4B | Vacation Events | 🟡 Medium | High | Events system, payment processing |
| 5 | Family Gallery | 🟡 Medium | Medium | Storage solution |
| 6A | Family Vehicle | 🟠 Medium-Low | Low (portal) / High (legal) | Legal research, vehicle purchase |
| 6B | Life Insurance | 🟠 Medium-Low | Low (portal) / High (legal) | Legal research, insurance broker |
| 7 | Family Compound | 🔵 Low | Very High | Significant capital, legal, real estate |
| 8 | Trust Formation | 🟡 Medium | High (legal) | Estate planning attorney |
| 9 | Milestone Tracker | 🟡 Medium | Low-Medium | Data from all other phases |

---

## 🛠️ Technical Notes

### Potential Tech Additions
| Need | Technology | Notes |
|------|-----------|-------|
| Investment data | **Plaid API** | Connects to Fidelity for holdings/balances |
| SMS notifications | **Twilio** | Text message notifications for events, reminders |
| Push notifications | **Web Push API** + service workers | Free, browser-native |
| File storage | **Supabase Storage** | Already using Supabase — natural fit for photos/videos |
| Real-time messaging | **Supabase Realtime** | WebSocket-based, already in our stack |
| Document signing | **DocuSign API** or **HelloSign** | For loan agreements, vehicle waivers |
| Payment processing | **Stripe** (existing) | One-time deposits, trip deposits, rent payments |

### Database Expansion Needed
- `investments` table (fund, shares, value, date, updated_by)
- `manual_deposits` table (member_id, amount, date, notes, recorded_by)
- `loans` table (member_id, amount, interest_rate, term, status, payments)
- `loan_payments` table (loan_id, amount, date, remaining_balance)
- `posts` table (author_id, content, media_urls, created_at)
- `comments` table (post_id, author_id, content, created_at)
- `likes` table (post_id, user_id)
- `bookmarks` table (post_id, user_id)
- `messages` table (sender_id, receiver_id, content, read_at)
- `events` table (creator_id, title, description, date, location, type, deposit_amount)
- `rsvps` table (event_id, user_id, status, deposit_paid)
- `gallery_photos` table (uploader_id, url, caption, date_taken, location)
- `photo_tags` table (photo_id, user_id)
- `notifications` table (user_id, type, content, read, created_at)
- `vehicles` table (name, make, model, year, status, insurance_info)
- `vehicle_reservations` table (vehicle_id, user_id, start_date, end_date)
- `milestones` table (title, description, achieved_at, type)

---

## 💡 Revenue & Sustainability

The LLC sustains itself through:
1. **Member subscriptions** → Primary income, goes to investments
2. **Loan interest** → Interest payments flow back into the investment fund
3. **Vehicle usage fees** (if implemented) → Cover insurance + maintenance
4. **Rental income** (future compound) → Cover property costs + contribute to fund
5. **Investment returns** → Dividends and capital appreciation compound over time

---

## 📅 Suggested Implementation Order

### Now → Next 3 Months
1. ✅ Core portal (subscriptions, payments, admin) — **DONE**
2. Investment dashboard (manual entry to start)
3. One-time deposit feature
4. Milestone tracker page

### 3–6 Months
5. Member profiles with profile pictures
6. Social feed + admin announcements
7. Notifications (push first, then Twilio SMS)

### 6–12 Months
8. Events system with RSVPs
9. Private messaging
10. Family gallery
11. Plaid integration for Fidelity data (if fund size warrants the cost)

### 12–24 Months
12. Family lending program (after legal consultation)
13. Vacation-style events with deposit system
14. Trust formation (consult attorney)

### 24+ Months (As Capital Allows)
15. Life insurance benefit
16. Family vehicle program
17. Family compound research and acquisition

---

## 📝 Living Document

This roadmap is a **living document**. It will be updated as:
- Features are completed
- New ideas emerge
- Legal research provides clarity
- The fund grows and new possibilities open up
- Members provide feedback and suggestions

**Last Updated:** March 6, 2026
**Maintained By:** Justin McNeal (Admin)

---

*"The best time to plant a tree was 20 years ago. The second best time is now." — Chinese Proverb*

*We're planting our tree today. 🌳*
