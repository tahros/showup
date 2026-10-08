-- Permanent display numbers, not authentication or subscription entitlements.
-- Run only this migration. Never reset the sequence or delete retired rows.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
select pg_advisory_xact_lock(7406246);
-- Serialize initial backfill against signups; the trigger covers later inserts.
lock table auth.users in share row exclusive mode;
create sequence if not exists public.club_member_number_seq start 1;
create table if not exists public.club_members (
  member_no bigint primary key default nextval('public.club_member_number_seq'),
  user_id uuid unique references auth.users(id) on delete set null,
  constraint club_member_nonnegative check (member_no >= 0)
);
alter table public.club_members enable row level security;
revoke all on public.club_members from public, anon, authenticated;
revoke all on sequence public.club_member_number_seq from public, anon, authenticated;
do $$
declare founder uuid; u record;
begin
  if not exists(select 1 from public.club_members where member_no=0) then
    select id into strict founder from auth.users
      where lower(email)='sungjee.u@gmail.com' and email_confirmed_at is not null;
    insert into public.club_members(member_no,user_id)
      values(0,founder);
  end if;
  -- A retired founder row is deliberately NOT reassigned to a new account.
  for u in select id,created_at from auth.users
    where not exists(select 1 from public.club_members m where m.user_id=auth.users.id)
    order by created_at,id
  loop
    insert into public.club_members(user_id) values(u.id);
  end loop;
end $$;
create or replace function public.club_assign_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.club_members(user_id) values(new.id);
  return new;
end $$;
revoke all on function public.club_assign_member() from public, anon, authenticated;
drop trigger if exists club_assign_member on auth.users;
create trigger club_assign_member after insert on auth.users
  for each row execute function public.club_assign_member();
create or replace function public.club_membership()
returns table(member_no text,joined_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.member_no::text,u.created_at from public.club_members m
  join auth.users u on u.id=m.user_id
  where m.user_id=auth.uid();
$$;
revoke all on function public.club_membership() from public, anon;
grant execute on function public.club_membership() to authenticated;
notify pgrst, 'reload schema';
commit;
