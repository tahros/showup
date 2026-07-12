-- ShowUp v2.0 — run this once in Supabase: SQL Editor → New query → paste → Run.

-- One row per signed-in user, holding the whole app state as a document.
create table if not exists public.app_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  doc        jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Each user can only see and write their own row.
create policy "own row select" on public.app_state
  for select using (auth.uid() = user_id);
create policy "own row insert" on public.app_state
  for insert with check (auth.uid() = user_id);
create policy "own row update" on public.app_state
  for update using (auth.uid() = user_id);

-- Ready for the paid tier later (unused by the app until you wire billing):
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan    text not null default 'free',      -- 'free' | 'pro'
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles
  for select using (auth.uid() = user_id);
