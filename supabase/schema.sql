-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists public.readiness_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  score integer not null default 72,
  completed_tasks text[] not null default '{}',
  household text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- Row level security: each signed-in user can only see and change their own row.
alter table public.readiness_progress enable row level security;

create policy "Users can read their own progress"
  on public.readiness_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own progress"
  on public.readiness_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own progress"
  on public.readiness_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
