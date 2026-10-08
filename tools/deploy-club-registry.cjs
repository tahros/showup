// No credentials, user IDs, emails or individual membership records in logs.
const fs=require('node:fs');
const endpoint='https://api.supabase.com/v1/projects/anmmqhgnsuutufladfik/database/query';
async function query(sql){
  const token=process.env.SUPABASE_ACCESS_TOKEN;
  if(!token)throw Error('Missing backend deployment credential');
  const r=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql}),signal:AbortSignal.timeout(45000)});
  if(!r.ok)throw Error(`Registry request failed (HTTP ${r.status}); inspect securely in Supabase SQL editor`);
  return r.json();
}
(async()=>{
  await query(fs.readFileSync('supabase/migrations/202610070001_club_registry.sql','utf8'));
  const rows=await query(`select
    (select count(*)=1 from public.club_members m join auth.users u on u.id=m.user_id where m.member_no=0 and lower(u.email)='sungjee.u@gmail.com' and u.email_confirmed_at is not null) as founder_ok,
    not exists(select 1 from auth.users u where not exists(select 1 from public.club_members m where m.user_id=u.id)) as accounts_covered,
    not has_table_privilege('authenticated','public.club_members','INSERT') as client_write_blocked,
    not has_table_privilege('anon','public.club_members','SELECT') as public_read_blocked,
    has_function_privilege('authenticated','public.club_membership()','EXECUTE') as member_read_enabled,
    not has_function_privilege('anon','public.club_membership()','EXECUTE') as anonymous_rpc_blocked`);
  if(!rows[0]||Object.values(rows[0]).some(v=>v!==true))throw Error('Registry invariant check failed');
  console.log('PASS registry provisioned: founder #0, account coverage, private access and client write protection');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
