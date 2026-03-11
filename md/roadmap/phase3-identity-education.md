# Phase 3 — Family Structure, Identity & Financial Education

**Status:** ⚡ In Progress (3A ✅ · 3B ✅ · 3C 🔲 · 3D 🔲)  
**Priority:** High  
**Goal:** Show who we are, how we're connected, who's responsible for what, and equip every member with financial literacy.

---

## 3A. Meet the Team / Leadership Page ✅

**Goal:** A dedicated page showing LLC leadership — who holds what role and what they're responsible for.

### Features Built
- [x] Leadership cards (profile picture, name, title/role, short bio)
- [x] Role definitions with responsibilities section
- [x] Page accessible from portal nav
- [x] Responsive layout (mobile and desktop)

### Pending
- [ ] Org chart / hierarchy layout (tree or hierarchy diagram)
- [ ] Role assignment by admin (from admin dashboard)
- [ ] Role badges displayed on profiles, feed, and leadership page
- [ ] "How It Works" section — LLC structure, money flow, governance
- [ ] Database: `title` column on profiles (President, VP, Treasurer, etc.)

---

## 3B. Family Tree Page ✅

**Goal:** Interactive visualization of the family structure — members and non-members shown together.

### Features Built
- [x] Interactive family tree (Cytoscape.js canvas)
- [x] Each node: profile picture, name, relationship, member status
- [x] Non-member family shown as distinct/grayed nodes
- [x] Tap a person → their profile or member page
- [x] Mobile touch navigation (pinch to zoom, drag to pan, fullscreen canvas)
- [x] Swipe-up members panel on mobile
- [x] Database: `family_relationships` table (person_a, person_b, relationship_type)

### Pending
- [ ] Admin can add/edit family connections (parent, child, sibling, spouse)
- [ ] Expandable/collapsible branches
- [ ] "Invite to Join" button on non-member nodes
- [ ] Multi-generational depth support (grandparents, grandchildren)

---

## 3C. Credit 101 — Credit Education Hub 🔲

**Status:** Not Started  
**Priority:** 🔴 High  
**Access:** Active members only (gated behind auth + active subscription check)  
**Spec:** See [md/pages/credit-101.md](../pages/credit-101.md) if created

### Learning Modules
| # | Module | Topics |
|---|--------|--------|
| 1 | Understanding Your Credit Score | FICO vs VantageScore, 5 factors (payment history, utilization, length, mix, inquiries) |
| 2 | Checking Your Credit | AnnualCreditReport.com, reading a report, disputing errors |
| 3 | Building Credit from Scratch | Secured cards, authorized user strategy, credit builder loans |
| 4 | Improving Your Score | Lowering utilization, on-time payments, strategic pay-downs, debt snowball vs avalanche |
| 5 | Credit Card Strategy | Choosing cards, cashback optimization, balance transfer tactics, traps to avoid |
| 6 | Advanced Moves | CLI requests, age of accounts, removing collections, goodwill letters, rapid rescoring |
| 7 | Protecting Your Credit | Credit freezes, fraud alerts, identity theft recovery, monitoring tools |

### Features to Build
- [ ] Dedicated Credit 101 page (members-only)
- [ ] Card-based module layout (mobile-friendly)
- [ ] Progress tracking per member (which modules completed, quiz scores)
- [ ] Short quiz at the end of each module
- [ ] Completion badge + CP reward (ties into Phase 2B — "Complete Credit 101" quest)
- [ ] Credit score log — members periodically log their score
- [ ] Score trend chart (line graph of score history)
- [ ] Resource links (Credit Karma, Experian, Discover Scorecard, etc.)
- [ ] Admin can add/edit module content
- [ ] Database: `credit_modules`, `member_module_progress`, `credit_score_log`

---

## 3D. Personal Finance & Budget Tracker 🔲

**Status:** Not Started  
**Priority:** 🔴 High  
**Access:** Active members only  
**Full Spec:** See [md/pages/financial-planning.md](../pages/financial-planning.md)

### Core Budget Features
- [ ] Budget Dashboard — income, expenses, savings rate, trends
- [ ] Bank Statement Import — upload CSV (PDF later) to auto-import transactions
- [ ] Auto-Categorization — keyword-based then AI fallback
- [ ] Manual Transaction Entry — cash transactions, category adjustments
- [ ] Spending Breakdown — pie/donut chart by category
- [ ] Monthly Budget Goals — target per category with progress bars
- [ ] Budget vs. Actual comparison per month
- [ ] Recurring Expense Detection — auto-detect subscriptions
- [ ] Savings Goal Tracker — targets with progress visualization
- [ ] Income Tracking — log paychecks and other sources
- [ ] Net Worth Snapshot — assets minus debts over time
- [ ] Spending Alerts — notification when approaching budget limits
- [ ] Monthly Summary Report — auto-generated at month end
- [ ] Export to CSV

### Savings Intelligence Panel
- [ ] Subscription audit (surface recurring charges members may have forgotten)
- [ ] Dining vs. grocery ratio flag
- [ ] Cashback opportunity estimator — calculates 2% on eligible spend, shows LLC impact
- [ ] "What if" projections — "If you cut $X/month from dining, you'd save $Y/year"

### AI Financial Coach (Chat)
- [ ] AI analyzes member's budget data and spending patterns
- [ ] Conversational Q&A: "Where am I spending most?", "How do I save $200/mo?"
- [ ] Proactive insights without being asked
- [ ] Chat history preserved per member
- [ ] Powered by OpenAI GPT-4 (proxied via edge function)
- [ ] Privacy: member data never shared with other members; admins cannot access

### Privacy Model
- RLS enforces strict per-member isolation
- Admin sees no individual budget data — ever
- Statement files stored in private Supabase Storage bucket

### Technical Stack
| Component | Technology |
|-----------|-----------|
| Statement parsing | Custom CSV parser (OFX later) |
| Categorization | Rule-based + AI fallback |
| AI Chat | OpenAI API (edge function proxy) |
| Data storage | Supabase + RLS |
| Charts | Chart.js (already in stack) |

### Database
- `member_accounts` — account labels per member (Chase, BofA, etc.)
- `member_statements` — uploaded statement files with date range and account
- `member_transactions` — individual line items (date, description, amount, category)
- `member_cashback_estimates` — monthly cashback opportunity calculations
- `budget_goals` — savings targets per member
- `ai_chat_history` — per-member conversation log

### Implementation Phases
1. CSV upload + parser, categorization, per-statement summary, category drill-down
2. Savings Intelligence Panel + cashback opportunity estimator
3. Budget goals + budget vs. actual comparison
4. AI Chat integration
5. PDF parsing, OFX import, multi-bank normalization
