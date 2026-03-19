# 🏛️ Justice McNeal LLC — Roadmap Index

> **Mission:** Build and preserve generational wealth for the McNeal family through collective investment, shared benefits, and community.

> **Vision:** A family-owned ecosystem — part investment fund, part bank, part social hub — that empowers every member financially and strengthens family bonds for generations to come.

---

## 📍 Infrastructure Overview

- **Holding Company:** Justice McNeal LLC (future plan: owned by a Family Trust)
- **Website LLC:** TBD — JM Family Contribution LLC or JM Media LLC (single-member, owned by holding company)
- **Website:** [justicemcnealllc.com](https://justicemcnealllc.com) — Family Contribution Portal
- **Tech Stack:** Supabase (auth + database + realtime), Stripe (subscriptions + Connect), GitHub Pages (hosting), Tailwind CSS, Chart.js, Cytoscape.js, Leaflet.js

### Money Flow
```
Members (Monthly Subscription via Stripe)
    ↓
[Website LLC] Bank Account
    ↓
├── Operating Expenses + Tax Reserve
└── Distribution → Justice McNeal LLC (Holding)
                        ↓
                  BlueVine Business Bank Account
                        ↓
                  Fidelity LLC Brokerage Account
                        ↓
                  Invested into VTI · VXUS · VIG · SPAXX
```

---

## 📂 Phase Files

| File | Phase | Status |
|------|-------|--------|
| [phase1-investment-onboarding.md](phase1-investment-onboarding.md) | Phase 1 — Investment Visibility, Manual Deposits & Onboarding | ✅ Complete |
| [phase2-milestones-quests-payouts.md](phase2-milestones-quests-payouts.md) | Phase 2 — Milestones, Perks, Quests & Payouts | ✅ Complete |
| [phase3-identity-education.md](phase3-identity-education.md) | Phase 3 — Family Structure, Identity & Financial Education | ⚡ In Progress |
| [phase4-social-hub.md](phase4-social-hub.md) | Phase 4 — Family Social Hub | ⚡ In Progress |
| [phase5-events.md](phase5-events.md) | Phase 5 — Events & Family Activities | 🔲 Not Started |
| [phase6-gallery.md](phase6-gallery.md) | Phase 6 — Family Gallery | 🔲 Not Started |
| [phase7-trust-legal.md](phase7-trust-legal.md) | Phase 7 — Trust Formation & Legal Structure | 🔲 Not Started |
| [phase8-lending.md](phase8-lending.md) | Phase 8 — Family Lending Program | 🔲 Not Started |
| [phase9-member-benefits.md](phase9-member-benefits.md) | Phase 9 — Member Benefits Program | 🔲 Not Started |
| [phase10-compound.md](phase10-compound.md) | Phase 10 — Family Compound / Real Estate | 🔲 Not Started |
| — | **LLC & Financial Operations** | — |
| [../llc/overview.md](../llc/overview.md) | LLC Restructuring — Separate Website LLC | ⚡ Planning |
| [../llc/expenses.md](../llc/expenses.md) | Admin: Expense Tracking | 🔲 Not Started |
| [../llc/profits.md](../llc/profits.md) | Admin: Profit Tracking | 🔲 Not Started |
| [../llc/tax-prep.md](../llc/tax-prep.md) | Admin: Tax Prep (Schedule C) | 🔲 Not Started |
| [../llc/documents.md](../llc/documents.md) | Admin: Documents Vault | 🔲 Not Started |

---

## 📊 Priority Matrix

| Phase | Name | Priority | Status |
|-------|------|----------|--------|
| 1A | Investment Dashboard | ✅ Done | — |
| 1B | Manual Deposits | ✅ Done | — |
| 1C | Member Onboarding | ✅ Done | — |
| 2A | Milestones & Perks | ✅ Done | — |
| 2B | Quest & Task System | ✅ Done | — |
| 2C | Member Payouts (Stripe Connect) | ✅ Done | — |
| 3A | Meet the Team / Leadership | ✅ Done | — |
| 3B | Family Tree | ✅ Done | — |
| 3C | Credit 101 Education Hub | 🔴 High | Not Started |
| 3D | Budget Tracker + AI Coach | 🔴 High | Not Started |
| 4A | Social Feed | ✅ Done | — |
| 4B | Member Profiles | ✅ Done | — |
| 4C | Private Messaging + Snaps | 🟡 Medium | Not Started |
| 4D | Push & SMS Notifications | 🟡 Medium | Not Started |
| 4E | Family Location Map | 🟡 Medium | Not Started |
| 4F | Family Business Directory | 🟡 Medium | Not Started |
| 5A | Events System (full spec) | 🟡 Medium | Not Started |
| 5B | Vacation / Trip Events | 🟡 Medium | Not Started |
| 6 | Family Gallery | 🟡 Medium | Not Started |
| 7 | Trust Formation | 🟡 Medium | Not Started |
| 8 | Family Lending | 🟡 Medium | Requires $50k milestone |
| 9A | Family Vehicle | 🟠 Medium-Low | Requires $250k milestone |
| 9B | Life Insurance | 🟠 Medium-Low | Requires legal research |
| 10 | Family Compound | 🔵 Low | Requires $500k milestone |
| **LLC** | **LLC Restructuring** | 🔴 **High** | **Finalize by $5k/year revenue** |
| LLC-A | Expense Tracking (Admin) | 🔴 High | Build before $5k/year |
| LLC-B | Profit Tracking (Admin) | 🔴 High | Build before $5k/year |
| LLC-C | Tax Prep Dashboard (Admin) | 🔴 High | Build before $5k/year |
| LLC-D | Documents Vault (Admin) | 🔴 High | Build alongside LLC formation |

---

## 📅 Implementation Order

### ✅ Complete
1. Core portal — subscriptions, payments, admin dashboard
2. Phase 1A — Investment dashboard
3. Phase 1B — One-time & manual deposits
4. Phase 1C — Member onboarding wizard
5. Nav/footer component extraction (pageShell.js)
6. Mobile nav redesign (5-tab bar)
7. Phase 2A — Milestones page
8. Phase 2B — Quest & Task System
9. Brand Splash Screen & Logo Management
10. Phase 2C — Member Payouts (Stripe Connect)
11. Phase 4A — Social Feed & Announcements
12. Phase 4B — Member Profiles (Instagram-style)
13. Profile Enhancements (badge equip, banners, Founders banner)
14. Nav Restructure — dashboard quick links, events page stub, 5-tab bar
15. Mobile Nav Swipe-Up Drawer & Dock Customization
16. PWA (manifest, service worker, iOS meta tags)
17. Phase 3A — Meet the Team / Leadership page
18. Phase 3B — Family Tree (Cytoscape.js)

### 🔧 Up Next
19. **LLC Restructuring — Planning & Name Selection** *(Target: Q2 2026)*
20. **Phase 3C — Credit 101 Education Hub**
21. **Phase 3D — Budget Tracker + AI Coach**
22. **Admin: Expenses + Profits + Tax Prep pages** *(Target: before $5k/year)*
23. **Phase 4C — Private Messaging + Snaps**
23. **Phase 4D — Push & SMS Notifications**
24. **Phase 4E — Family Location Map**
25. **Phase 4F — Family Business Directory**
26. **Phase 5A — Events System**
27. **Phase 5B — Vacation / Trip Events**
28. **Phase 6 — Family Gallery**

### Future
29. Phase 7 — Trust Formation
30. Phase 8 — Family Lending ($50k milestone)
31. Phase 9 — Member Benefits ($250k milestone)
32. Phase 10 — Family Compound ($500k milestone)
33. Phase 11 — Native Mobile App (iOS + Android)

---

## 💡 Revenue & Sustainability

1. **Member subscriptions** → Primary income, goes to investments
2. **Loan interest** → Interest payments flow back into the fund *(Phase 8)*
3. **Vehicle usage fees** → Cover insurance + maintenance *(Phase 9A)*
4. **Rental income** → Property costs + fund contributions *(Phase 10)*
5. **Investment returns** → Dividends and capital appreciation

### 📊 Current Revenue & Growth Targets

| Metric | Value |
|--------|-------|
| Current Monthly Revenue | $120/month |
| Current Annual (projected) | $1,440/year |
| Target | $5,000/year |
| Timeline | End of 2026 — Early 2027 |
| Trigger for LLC Finalization | $5,000/year milestone |

> See `md/llc/profits.md` for detailed revenue tracking and growth milestones.

---

*Last Updated: March 13, 2026 | Maintained By: Justin McNeal (Admin)*
