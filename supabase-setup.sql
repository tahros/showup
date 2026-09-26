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

-- ============================================================================
-- v4.6.142 — usage metrics (App Store runbook 9.5 / 9.6).
-- Run this section once: SQL Editor → New query → paste from here down → Run.
-- It is safe to run again.
--
-- What is stored: a random device id, the event name, which logged day it was
-- (for day_logged only), a first-touch source tag, the platform and the app
-- version. NEVER weights, reps, exercise names, plans, notes, names or emails.
-- The table has row-level security on and NO policies: the app can neither
-- read nor write it directly. The track Edge Function inserts with the
-- service role; only the owner reads it, through owner_metrics() below.
-- ============================================================================
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  device_id   uuid not null,
  user_id     uuid null references auth.users(id) on delete set null,   -- deleting an account keeps only anonymous counts
  name        text not null check (name in ('open','first_set','day_logged','paywall_seen','subscribed','cancelled','export','plan_written')),
  day_n       int  null check (day_n is null or day_n between 1 and 100000),
  ref         text null check (ref is null or ref in ('hn','gn','dq','li','ig','tt','yt','ph','rd','th','as')),
  platform    text not null check (platform in ('web','ios')),
  app_version text not null check (app_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  at          timestamptz not null default now()
);
alter table public.events enable row level security;
create index if not exists events_name_at on public.events (name, at);
create index if not exists events_device_at on public.events (device_id, at);

-- The owner is the account signed in as sungjee.u@gmail.com (Google-verified).
create or replace function public.is_owner() returns boolean
language sql stable as $$
  select coalesce(auth.jwt()->>'role','') = 'authenticated'
     and lower(coalesce(auth.jwt()->>'email','')) = 'sungjee.u@gmail.com'
$$;

-- Everything the dashboard shows, for one date range (America/New_York days)
-- and, optionally, one source. Refuses anyone but the owner.
--   funnel: devices FIRST SEEN in the range, by first-touch source, and how
--           far each got: opened -> logged a day -> day 2 -> day 7 -> day 20
--           -> subscribed.
--   daily:  per day in the range: distinct devices that opened and that
--           logged, first sets, day-2s, paywall views, subscriptions, writer
--           calls, exports.
create or replace function public.owner_metrics(p_from date, p_to date, p_ref text default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_owner() then
    raise exception 'not owner' using errcode = '42501';
  end if;
  with ev as (
    select e.device_id, e.name, e.day_n, e.ref, e.at,
           (e.at at time zone 'America/New_York')::date as d
    from public.events e
  ),
  first_ref as (      -- a device's first-touch tag: the earliest one it ever sent
    select distinct on (device_id) device_id, ref
    from ev where ref is not null order by device_id, at
  ),
  dev as (
    select ev.device_id, min(ev.d) as first_day, coalesce(max(fr.ref), 'direct') as src
    from ev left join first_ref fr using (device_id)
    group by ev.device_id
  ),
  scoped as (select * from dev where p_ref is null or src = p_ref),
  cohort as (select * from scoped where first_day between p_from and p_to),
  reach as (
    select c.device_id, c.src,
           bool_or(ev.name = 'open')       as o,
           bool_or(ev.name in ('first_set','day_logged')) as logged,
           max(ev.day_n) filter (where ev.name = 'day_logged') as dn,
           bool_or(ev.name = 'subscribed') as sub
    from cohort c join ev using (device_id)
    group by c.device_id, c.src
  ),
  daily as (
    select ev.d,
      count(distinct ev.device_id) filter (where ev.name = 'open')        as opens,
      count(distinct ev.device_id) filter (where ev.name = 'day_logged')  as loggers,
      count(*) filter (where ev.name = 'first_set')                       as first_sets,
      count(*) filter (where ev.name = 'day_logged' and ev.day_n = 2)     as day2,
      count(*) filter (where ev.name = 'paywall_seen')                    as paywall,
      count(*) filter (where ev.name = 'subscribed')                      as subscribed,
      count(*) filter (where ev.name = 'plan_written')                    as writer,
      count(*) filter (where ev.name = 'export')                          as exports
    from ev join scoped s using (device_id)
    where ev.d between p_from and p_to
    group by ev.d
  )
  select jsonb_build_object(
    'from', p_from, 'to', p_to, 'ref', p_ref,
    'funnel', coalesce((
      select jsonb_agg(f order by f->>'src') from (
        select jsonb_build_object(
          'src', src, 'devices', count(*),
          'opened',     count(*) filter (where o),
          'logged',     count(*) filter (where logged),
          'day2',       count(*) filter (where dn >= 2),
          'day7',       count(*) filter (where dn >= 7),
          'day20',      count(*) filter (where dn >= 20),
          'subscribed', count(*) filter (where sub)) as f
        from reach group by src) t), '[]'::jsonb),
    'daily',   coalesce((select jsonb_agg(to_jsonb(daily) order by d) from daily), '[]'::jsonb),
    'totals',  (select jsonb_build_object(
                  'active',  count(distinct ev.device_id) filter (where ev.name = 'open'),
                  'loggers', count(distinct ev.device_id) filter (where ev.name = 'day_logged'))
                from ev join scoped s using (device_id) where ev.d between p_from and p_to),
    'sources', coalesce((select jsonb_agg(src order by src) from (select distinct src from dev) s), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.owner_metrics(date, date, text) from public, anon;
grant execute on function public.owner_metrics(date, date, text) to authenticated;

-- ============================================================================
-- v4.6.145 — Sign in with Apple token revocation (App Store runbook 4.4).
-- Run this section once, like the one above. Safe to run again.
-- Apple's refresh token for each account that signed in with Apple, kept only
-- so that deleting the account can revoke it (Apple requires this). Row-level
-- security on and NO policies: only the service role (apple-link,
-- delete-account) can read or write it. It goes with the account.
-- ============================================================================
create table if not exists public.apple_tokens (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  updated_at    timestamptz not null default now()
);
alter table public.apple_tokens enable row level security;
