-- Household profiles: location, members, pets, vehicles, contacts, supplies.
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run more than once.

create table if not exists public.household_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row level security: each signed-in user can only see and change their own household.
alter table public.household_profiles enable row level security;

drop policy if exists "Users can read their own household" on public.household_profiles;
create policy "Users can read their own household"
  on public.household_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own household" on public.household_profiles;
create policy "Users can insert their own household"
  on public.household_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own household" on public.household_profiles;
create policy "Users can update their own household"
  on public.household_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
