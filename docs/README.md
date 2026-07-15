# Docs

Project documentation for **Justice McNeal LLC** — product (website), business, and legal/official.

## Current layout

| Path | Role |
|------|------|
| `docs/todo.md` | Active product backlog (priority + difficulty) |
| `docs/ROADMAP.md` | Product / platform roadmap |
| `docs/audit/` | Page-by-page code audits (esp. events phases) |
| `docs/improvements/` | Feature plans + rollout QA (SMS, team chat, moderation) |
| `docs/general/` | Mix of **business** strategy *and* member-system design (contribution, credits, Fidelity, property, LLC overview) |
| `docs/officialDocs/` | Legal / governance drafts (charter, contribution policy, operating notes, trust concept) |
| `docs/business/` | **Company** brainstorms & money ideas (not website tickets) |

## Where to put new writing

| If it’s about… | Put it in… |
|----------------|------------|
| A website bug/feature | `todo.md` (and optionally a plan under `improvements/`) |
| How a portal system works | `general/` for now → later `product/systems/` |
| Code/refactor audit | `audit/` |
| Making the LLC more money / new ventures | **`business/`** ← start here |
| Legal / trust / foundation policy | `officialDocs/` |

**Your revenue brainstorm:** [`business/revenue-ideas.md`](./business/revenue-ideas.md)

---

## Proposed makeover (not executed yet)

Goal: separate **product**, **business**, and **legal** so nothing important lives in a vague `general/` bucket.

```
docs/
  README.md                 ← this file
  product/
    todo.md                 ← from docs/todo.md
    ROADMAP.md
    audits/                 ← from audit/
    improvements/           ← from improvements/
    systems/                ← member contribution, credits, quests (from general/)
  business/
    strategy/               ← LLC structure, property, profits (from general/)
    ventures/               ← Karry Kraze, AI content, etc.
    ideas/
      revenue-ideas.md      ← already started at business/revenue-ideas.md
  legal/
    official/               ← from officialDocs/
```

### Migration notes

1. Create folders above; move files with `git mv` so history is kept.
2. Update any links in README / audits that point at old paths.
3. Keep `officialDocs/` public-facing HTML (`index.html`) wiring in mind if members will read those docs on the site.
4. Prefer short names: `legal/foundation-charter.md` over spaces when practical.

When you’re ready to run the full restructure, use the product todo item: **Organize md files**.
