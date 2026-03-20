-- ════════════════════════════════════════════════════════════
-- 074 · Custom Categorization Rules (per-member)
-- ════════════════════════════════════════════════════════════
-- Members can create personal rules so recurring transfers,
-- Zelle payments, loan payments, etc. are auto-categorized
-- correctly on future uploads.  Rules are substring-match
-- (case-insensitive) and run BEFORE the default merchant rules.
-- ════════════════════════════════════════════════════════════

create table if not exists public.member_category_rules (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    match_text  text not null,            -- substring to match in memo/description (case-insensitive)
    category    text not null,            -- target category key (housing, dining, etc.)
    label       text,                     -- user's friendly label, e.g. "Car Note", "Rent to Mom"
    priority    int  not null default 0,  -- higher = checked first (for overlapping rules)
    created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists idx_category_rules_user
    on public.member_category_rules(user_id);

-- Unique: one rule per user per match_text (prevent duplicates)
alter table public.member_category_rules
    add constraint uq_category_rules_user_match
    unique (user_id, match_text);

-- RLS
alter table public.member_category_rules enable row level security;

create policy "Users can read own rules"
    on public.member_category_rules for select
    using (auth.uid() = user_id);

create policy "Users can create own rules"
    on public.member_category_rules for insert
    with check (auth.uid() = user_id);

create policy "Users can update own rules"
    on public.member_category_rules for update
    using (auth.uid() = user_id);

create policy "Users can delete own rules"
    on public.member_category_rules for delete
    using (auth.uid() = user_id);
