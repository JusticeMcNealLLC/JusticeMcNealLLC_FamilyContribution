-- Migration 040: tree_settings key/value table for shared tree layout positions
-- Everyone authenticated can read; only admins can write.

create table if not exists public.tree_settings (
    key   text primary key,
    value jsonb not null default '{}',
    updated_at timestamptz not null default now()
);

alter table public.tree_settings enable row level security;

-- All authenticated members can read settings (so they see saved positions)
create policy "authenticated users read tree_settings"
    on public.tree_settings
    for select
    to authenticated
    using (true);

-- Only admins can insert or update settings
create policy "admins write tree_settings"
    on public.tree_settings
    for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    )
    with check (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );
