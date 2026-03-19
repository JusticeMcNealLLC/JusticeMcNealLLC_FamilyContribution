# Phase 9 — Member Benefits Program

**Status:** 🔲 Not Started  
**Priority:** Medium-Low  
**Goal:** Make membership tangibly valuable beyond investment returns.

---

## 9A. Family Vehicle Program 🚗

**Milestone unlock:** 🔒 $250,000 (Fleet Ready tier)

**Concept:** LLC-owned vehicle(s) available for members who need transportation — in a pinch, young and needing a ride to work/school, or between cars.

### Portal Features to Build
- [ ] LLC vehicle inventory page (vehicles + current status)
- [ ] Reservation / scheduling system
- [ ] Vehicle availability calendar
- [ ] Pickup / return process and condition logging
- [ ] Mileage tracking per trip
- [ ] Member usage history

### Legal / Insurance Research Needed
- [ ] Commercial auto insurance for LLC-owned vehicles
- [ ] Liability structure — who's responsible in an accident?
- [ ] Study how Turo / Zipcar handle insurance & liability
- [ ] Per-use insurance model vs. blanket policy
- [ ] Member waiver / usage agreement (digital signature)
- [ ] Whether members need their own insurance while using the vehicle
- [ ] State-specific vehicle sharing regulations within an LLC (Georgia)
- [ ] Maintenance responsibility and cost allocation
- [ ] Potential small usage fee to cover insurance + maintenance

### Database
```sql
vehicles (
  id UUID PK,
  make TEXT,
  model TEXT,
  year INT,
  color TEXT,
  vin TEXT,
  status TEXT CHECK (status IN ('available', 'reserved', 'maintenance', 'retired')),
  insurance_info JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
)

vehicle_reservations (
  id UUID PK,
  vehicle_id UUID → vehicles,
  user_id UUID → profiles,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  start_mileage INT,
  end_mileage INT,
  condition_notes TEXT,
  status TEXT CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
)
```

---

## 9B. Life Insurance Benefit 🛡️

**Milestone unlock:** 🔒 $500,000 (Compound Vision tier) or based on attorney advice

**Concept:** A whole life insurance policy for every member, paid for by the LLC/Trust, with the Trust as primary beneficiary.

### Structure
- Whole life policy per active member
- LLC/Trust pays premiums from operating funds
- Trust = primary beneficiary
- Percentage of payout goes to member's children (if applicable)
- Policy details visible on member's portal profile

### Portal Features to Build
- [ ] Life insurance enrollment page per member
- [ ] Policy details summary (policy number, coverage amount, beneficiary structure)
- [ ] Annual policy review reminder
- [ ] Beneficiary designation (who gets member's share of the payout)
- [ ] Admin insurance management console

### Legal / Insurance Research Needed
- [ ] Group life insurance vs. individual policies for LLC/Trust members
- [ ] Tax implications of LLC-funded life insurance (IRC §79 rules)
- [ ] Insurable interest requirements
- [ ] Trust as beneficiary — proper documentation
- [ ] Member consent and medical underwriting process
- [ ] Cost projections per member per year
- [ ] Vesting schedule (minimum membership duration before policy issued)
- [ ] What happens to policy if member leaves the LLC

---

## 9C. Future Benefits (Ideas)

- [ ] **Emergency fund access** — separate from lending program, faster / smaller amounts, no interest
- [ ] **Education assistance** — scholarship fund for members' children (college, trade school, etc.)
- [ ] **Tax preparation assistance** — LLC covers cost of a CPA for members annually
- [ ] **Group discount programs** — insurance, travel, wholesale memberships (Costco, Sam's Club)
- [ ] **Credit building assistance** — fund covers cost of credit builder products for members *(see Phase 3C for Credit 101 hub)*
- [ ] **Legal assistance fund** — LLC covers basic legal consultations (estate planning, contracts) for members
- [ ] **Mental health benefit** — LLC covers therapy sessions (BetterHelp, etc.)

---

## Notes

- 9A and 9B both require significant legal research before any portal features are built
- Legal consultation should happen at Phase 7 (Trust Formation) to get guidance on insurance structure simultaneously
- All benefits should be documented in the Trust agreement so they're automatically governed
- Admin console for benefits should be a unified "Benefits Hub" in the admin dashboard (not scattered pages)
