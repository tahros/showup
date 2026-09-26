/* test-metrics-sql.js DIR — v4.6.142: the metrics SQL in supabase-setup.sql, run
 * in a real Postgres (PGlite, in-process). Real: the metrics section exactly as
 * the owner pastes it. Faked: Supabase's auth schema (auth.users, auth.jwt()).
 * Rules: only the owner's token reads owner_metrics; the table refuses anything
 * outside the allowlists; the funnel follows devices first seen in the range by
 * their first-touch source; days are New York days. */
const fs=require('fs'),path=require('path');
let PGlite;
try{ ({PGlite}=require('@electric-sql/pglite')); }catch(e){ console.log('SKIP @electric-sql/pglite not installed (npm i @electric-sql/pglite)'); process.exit(0); }
(async()=>{
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const sql=fs.readFileSync(path.join(dir,'supabase-setup.sql'),'utf8');
const section=sql.slice(sql.indexOf('-- v4.6.142 — usage metrics'));
const db=new PGlite();
await db.exec(`create role anon; create role authenticated;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;`);
await db.exec(section);
const as=async(claims)=>db.exec(`select set_config('request.jwt.claims', '${JSON.stringify(claims)}', false)`);
const OWNER={role:'authenticated',email:'Sungjee.U@gmail.com'}, OTHER={role:'authenticated',email:'someone@x.co'};
const ins=(dev,name,at,extra={})=>db.query(`insert into public.events(device_id,name,day_n,ref,platform,app_version,at) values($1,$2,$3,$4,'ios','4.6.142',$5)`,[dev,name,extra.day_n??null,extra.ref??null,at]);
const D=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
// device 1: from HN, opens Oct 15, logs days 1..3 (day 2 on Oct 16)
await ins(D(1),'open','2026-10-15T14:00:00Z',{ref:'hn'});
await ins(D(1),'first_set','2026-10-15T14:05:00Z',{ref:'hn'});
await ins(D(1),'day_logged','2026-10-15T14:05:00Z',{ref:'hn',day_n:1});
await ins(D(1),'day_logged','2026-10-16T14:05:00Z',{ref:'hn',day_n:2});
await ins(D(1),'day_logged','2026-10-18T14:05:00Z',{ref:'hn',day_n:3});
// device 2: from HN, opens only
await ins(D(2),'open','2026-10-15T20:00:00Z',{ref:'hn'});
// device 3: direct, opened 00:30 UTC Oct 16 = 20:30 Oct 15 in New York; logs day 1
await ins(D(3),'open','2026-10-16T00:30:00Z');
await ins(D(3),'day_logged','2026-10-16T00:40:00Z',{day_n:1});
await ins(D(3),'plan_written','2026-10-16T00:50:00Z');
// device 4: an existing user from before the range, logging in range
await ins(D(4),'open','2026-10-01T12:00:00Z',{ref:'li'});
await ins(D(4),'day_logged','2026-10-15T12:00:00Z',{ref:'li',day_n:480});

await as({});
let err=null;try{await db.query(`select public.owner_metrics('2026-10-15','2026-10-21')`);}catch(e){err=e.message;}
ok('no token: refused', /not owner/.test(err||''), err);
await as(OTHER);err=null;try{await db.query(`select public.owner_metrics('2026-10-15','2026-10-21')`);}catch(e){err=e.message;}
ok('another signed-in account: refused', /not owner/.test(err||''), err);
await as({...OWNER,role:'anon'});err=null;try{await db.query(`select public.owner_metrics('2026-10-15','2026-10-21')`);}catch(e){err=e.message;}
ok('owner email on a non-authenticated role: refused', /not owner/.test(err||''), err);

await as(OWNER);
const m=(await db.query(`select public.owner_metrics('2026-10-15','2026-10-21') as m`)).rows[0].m;
const F=Object.fromEntries(m.funnel.map(f=>[f.src,f]));
ok('owner (email in any case): allowed, funnel by first-touch source', !!F.hn && !!F.direct, JSON.stringify(Object.keys(F)));
ok('HN: 2 devices opened, 1 logged, 1 reached day 2, none day 7', F.hn.devices===2&&F.hn.opened===2&&F.hn.logged===1&&F.hn.day2===1&&F.hn.day7===0, JSON.stringify(F.hn));
ok('a device first seen before the range is not in the funnel', !F.li, JSON.stringify(m.funnel));
const day=Object.fromEntries(m.daily.map(d=>[d.d,d]));
ok('00:30 UTC on Oct 16 is Oct 15 in New York', day['2026-10-15']?.opens===3 && !day['2026-10-16']?.opens, JSON.stringify(m.daily));
ok('daily loggers count devices, including an existing user', day['2026-10-15'].loggers===3, JSON.stringify(day['2026-10-15']));
ok('writer calls counted per day', day['2026-10-15'].writer===1);
ok('range totals count each device once: 3 opened, 3 logged over the week', m.totals.active===3 && m.totals.loggers===3, JSON.stringify(m.totals));
ok('sources listed for the filter', JSON.stringify(m.sources)===JSON.stringify(['direct','hn','li']), JSON.stringify(m.sources));
const h=(await db.query(`select public.owner_metrics('2026-10-15','2026-10-21','hn') as m`)).rows[0].m;
ok('source filter: only HN devices, in the funnel and the daily counts', h.funnel.length===1 && h.daily.find(d=>d.d==='2026-10-15').opens===2, JSON.stringify(h.daily));

let bad=0;
for(const q of [`insert into public.events(device_id,name,platform,app_version) values('${D(9)}','weights','ios','4.6.142')`,
                `insert into public.events(device_id,name,ref,platform,app_version) values('${D(9)}','open','spam','ios','4.6.142')`,
                `insert into public.events(device_id,name,platform,app_version) values('${D(9)}','open','android','4.6.142')`,
                `insert into public.events(device_id,name,platform,app_version) values('${D(9)}','open','ios','Bench 225')`]){
  try{await db.query(q);}catch(e){bad++;}
}
ok('the table refuses unknown names, refs, platforms and free text in app_version', bad===4, bad);
const cols=(await db.query(`select column_name from information_schema.columns where table_schema='public' and table_name='events' order by ordinal_position`)).rows.map(r=>r.column_name);
ok('no column can hold workout content', cols.join()==='id,device_id,user_id,name,day_n,ref,platform,app_version,at', cols.join());
const pol=(await db.query(`select count(*)::int n from pg_policies where tablename='events'`)).rows[0].n;
const rls=(await db.query(`select relrowsecurity from pg_class where relname='events'`)).rows[0].relrowsecurity;
ok('row-level security on, no policies: the app cannot read or write it directly', rls===true && pol===0);
const anonExec=(await db.query(`select has_function_privilege('anon','public.owner_metrics(date,date,text)','execute') as a`)).rows[0].a;
ok('anon cannot even call owner_metrics', anonExec===false);
const at=(await db.query(`select relrowsecurity r from pg_class where relname='apple_tokens'`)).rows[0];
const atp=(await db.query(`select count(*)::int n from pg_policies where tablename='apple_tokens'`)).rows[0].n;
ok('v4.6.145 apple_tokens: row-level security on, no policies (service role only)', at?.r===true && atp===0);
await db.exec(section);
ok('the section runs twice without error (safe to paste again)', true);
console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
