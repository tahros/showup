/* test-revenuecat.js DIR — v4.6.385: the membership's server side.
 * 1. supabase/functions/revenuecat-webhook, imported and driven with a fake
 *    network: the Authorization check, what each RevenueCat event writes,
 *    sandbox kept out of the counts, anonymous buyers, the device join.
 * 2. The v4.6.385 SQL in a real Postgres (PGlite): entitlements' row-level
 *    security, and owner_members() -- owner only, members now, MRR, new and
 *    cancelled in range, trial-to-member conversion.
 * The SQL half skips without @electric-sql/pglite, like test-metrics-sql. */
const fs=require('fs'),path=require('path');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
(async()=>{
 const {handle,read,same}=await import(require('url').pathToFileURL(path.join(dir,'supabase/functions/revenuecat-webhook/index.ts')).href);
 const SECRET='rc-test-secret-123';
 const env=k=>({REVENUECAT_WEBHOOK_AUTH:SECRET,SUPABASE_URL:'https://x.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'svc'})[k];
 const U='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', DEV='11111111-2222-4333-8444-555555555555';
 const fake=(status=201)=>{const f={calls:[]};f.net=async(url,o)=>{f.calls.push({url,body:o?.body?JSON.parse(o.body):null,headers:o?.headers});return {ok:status<300,status,json:async()=>({})};};return f;};
 const ev=(type,extra={})=>({api_version:'1.0',event:{type,id:'evt1',app_user_id:U,original_app_user_id:U,aliases:[U],
   product_id:'co.yooooooooo.showup.member.yearly',environment:'PRODUCTION',expiration_at_ms:Date.UTC(2027,9,22),
   event_timestamp_ms:Date.UTC(2026,9,22,15),transaction_id:'t1',original_transaction_id:'o1',
   subscriber_attributes:{showup_device:{value:DEV},showup_version:{value:'4.6.385'}},...extra}});
 const req=(body,auth=SECRET,method='POST')=>new Request('https://x/functions/v1/revenuecat-webhook',{method,headers:{authorization:auth,'content-type':'application/json'},body:method==='POST'?JSON.stringify(body):undefined});

 ok('same(): equal strings only', same('abc','abc')&&!same('abc','abd')&&!same('ab','abc')&&!same('','')&&!same('x',undefined));
 { const f=fake();const r=await handle(req(ev('INITIAL_PURCHASE'),'wrong'),env,f.net);
   ok('a wrong Authorization header: 401, nothing written', r.status===401&&!f.calls.length); }
 { const f=fake();const r=await handle(req(ev('INITIAL_PURCHASE')),k=>k==='REVENUECAT_WEBHOOK_AUTH'?undefined:env(k),f.net);
   ok('no secret configured: 503, nothing written (fails closed)', r.status===503&&!f.calls.length); }
 { const f=fake();const r=await handle(req(ev('INITIAL_PURCHASE'),'Bearer '+SECRET),env,f.net);
   ok('"Bearer <secret>" is accepted too', r.status===200); }
 { const f=fake();const r=await handle(req(ev('INITIAL_PURCHASE')),env,f.net);const j=await r.json();
   const ent=f.calls.find(c=>/entitlements/.test(c.url)), e=f.calls.find(c=>/\/events/.test(c.url));
   ok('first purchase: an active yearly entitlement for the account', ent&&ent.body.user_id===U&&ent.body.status==='active'&&ent.body.plan==='yearly'&&ent.body.source==='apple'&&ent.body.sandbox===false&&/2027-10-22/.test(ent.body.current_period_end), JSON.stringify(ent?.body));
   ok('first purchase: upserted on user_id', ent&&/on_conflict=user_id/.test(ent.url)&&/merge-duplicates/.test(ent.headers.Prefer));
   ok('first purchase: a "subscribed" event on the device that bought', e&&e.body.name==='subscribed'&&e.body.device_id===DEV&&e.body.platform==='ios'&&e.body.app_version==='4.6.385'&&e.body.user_id===U, JSON.stringify(e?.body));
   ok('reply names what was done', r.status===200&&j.did.join()==='entitlement,subscribed', JSON.stringify(j)); }
 { const f=fake();await handle(req(ev('RENEWAL',{product_id:'co.yooooooooo.showup.member.monthly'})),env,f.net);
   ok('renewal: entitlement only, no event', f.calls.length===1&&f.calls[0].body.status==='active'&&f.calls[0].body.plan==='monthly'); }
 { const f=fake();await handle(req(ev('CANCELLATION')),env,f.net);
   ok('cancellation: status cancelled + a "cancelled" event', f.calls.some(c=>c.body.status==='cancelled')&&f.calls.some(c=>c.body.name==='cancelled')); }
 { const f=fake();await handle(req(ev('BILLING_ISSUE')),env,f.net);
   ok('billing issue: grace', f.calls[0].body.status==='grace'&&f.calls.length===1); }
 { const f=fake();await handle(req(ev('EXPIRATION')),env,f.net);
   ok('expiration: expired', f.calls[0].body.status==='expired'&&f.calls.length===1); }
 { const f=fake();const r=await handle(req(ev('INITIAL_PURCHASE',{environment:'SANDBOX'})),env,f.net);
   ok('sandbox (TestFlight): entitlement marked sandbox, NO event (test buys are not members)', r.status===200&&f.calls.length===1&&f.calls[0].body.sandbox===true); }
 { const f=fake();await handle(req(ev('INITIAL_PURCHASE',{app_user_id:'$RCAnonymousID:abc',original_app_user_id:'$RCAnonymousID:abc',aliases:['$RCAnonymousID:abc']})),env,f.net);
   ok('anonymous buyer: no entitlement row (no account), the event still counts', f.calls.length===1&&f.calls[0].body.name==='subscribed'&&f.calls[0].body.user_id===null); }
 { const f=fake();await handle(req(ev('INITIAL_PURCHASE',{subscriber_attributes:{}})),env,f.net);const e=f.calls.find(c=>/\/events/.test(c.url));
   ok('no device id: a stable stand-in uuid, version 0.0.0', e&&/^[0-9a-f-]{36}$/.test(e.body.device_id)&&e.body.device_id!==DEV&&e.body.app_version==='0.0.0', JSON.stringify(e?.body)); }
 { const f=fake();const r=await handle(req(ev('TEST')),env,f.net);
   ok('RevenueCat\'s test event: 200, nothing written', r.status===200&&!f.calls.length); }
 { const f=fake(500);const r=await handle(req(ev('INITIAL_PURCHASE')),env,f.net);
   ok('database down: 5xx so RevenueCat retries', r.status>=500); }
 { const f=fake();const r=await handle(req({nope:1}),env,f.net);
   ok('not an event: 400', r.status===400&&!f.calls.length); }
 ok('read(): weights, notes or emails cannot ride along (named fields only)', !('email' in read(ev('INITIAL_PURCHASE',{email:'a@b.c'}))));

 /* the SQL */
 let PGlite; try{ ({PGlite}=require('@electric-sql/pglite')); }catch(e){ console.log('SKIP SQL half: @electric-sql/pglite not installed'); }
 if(PGlite){
  const sql=fs.readFileSync(path.join(dir,'supabase-setup.sql'),'utf8');
  const db=new PGlite();
  await db.exec(`create role anon; create role authenticated;
   create schema auth; create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb->>'sub','')::uuid $$;
   create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;`);
  await db.exec(sql.slice(sql.indexOf('-- v4.6.142 — usage metrics')));
  await db.exec(sql.slice(sql.indexOf('-- v4.6.385 — membership')));
  ok('the v4.6.385 section runs twice without error', true);
  const as=claims=>db.exec(`select set_config('request.jwt.claims', '${JSON.stringify(claims)}', false)`);
  const A=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  for(let i=1;i<=6;i++) await db.query('insert into auth.users(id) values($1)',[A(i)]);
  const future="now() + interval '20 days'", past="now() - interval '2 days'";
  await db.exec(`insert into public.entitlements(user_id,status,source,plan,current_period_end,sandbox) values
    ('${A(1)}','active','apple','yearly',${future},false),
    ('${A(2)}','active','apple','monthly',${future},false),
    ('${A(3)}','cancelled','apple','monthly',${future},false),
    ('${A(4)}','expired','apple','monthly',${past},false),
    ('${A(5)}','active','apple','yearly',${future},true),
    ('${A(6)}','grace','apple','yearly',${future},false)`);
  let err=null;
  const ins=(dev,name,at,day_n=null)=>db.query(`insert into public.events(device_id,name,day_n,platform,app_version,at) values($1,$2,$3,'ios','4.6.385',$4)`,[dev,name,day_n,at]);
  const D=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  await ins(D(1),'day_logged','2026-10-20T15:00:00Z',20); await ins(D(1),'subscribed','2026-10-22T15:00:00Z');
  await ins(D(2),'day_logged','2026-10-20T16:00:00Z',20);                       // reached 20, did not buy
  await ins(D(3),'day_logged','2026-10-01T16:00:00Z',20); await ins(D(3),'subscribed','2026-10-21T15:00:00Z');   // bought, but day 20 was before the range
  await ins(D(4),'cancelled','2026-10-23T15:00:00Z');
  await as({}); err=null;
  try{ await db.query(`select public.owner_members('2026-10-15','2026-10-25')`); }catch(e){ err=e.message; }
  ok('owner_members: no token, refused', /not owner/.test(err||''), err);
  await as({role:'authenticated',email:'someone@x.co'}); err=null;
  try{ await db.query(`select public.owner_members('2026-10-15','2026-10-25')`); }catch(e){ err=e.message; }
  ok('owner_members: another account, refused', /not owner/.test(err||''), err);
  await as({role:'authenticated',email:'sungjee.u@gmail.com'});
  const m=(await db.query(`select public.owner_members('2026-10-15','2026-10-25') as m`)).rows[0].m;
  ok('members now: active + grace + cancelled-but-paid-through, not expired, not sandbox', m.yearly===2&&m.monthly===2, JSON.stringify(m));
  ok('MRR at list price: 2 x 29.99/12 + 2 x 4.99', Math.abs(+m.mrr-(2*29.99/12+2*4.99))<0.011, m.mrr);
  ok('grace counted on its own', m.grace===1);
  ok('new and cancelled in range (events)', m.new===2&&m.cancelled===1, JSON.stringify([m.new,m.cancelled]));
  ok('by week', Array.isArray(m.weeks)&&m.weeks.reduce((a,w)=>a+w.new,0)===2);
  ok('trial to member: 1 of the 2 devices that reached day 20 in range bought within 14 days', m.reached20===2&&m.converted===1, JSON.stringify([m.reached20,m.converted]));
  const pol=(await db.query(`select polname from pg_policy where polrelid='public.entitlements'::regclass`)).rows.map(r=>r.polname);
  ok('entitlements: row-level security, one read-own policy', pol.join()==='read own' && (await db.query(`select relrowsecurity from pg_class where oid='public.entitlements'::regclass`)).rows[0].relrowsecurity===true);
  err=null; try{ await db.query(`insert into public.entitlements(user_id,status,source) values('${A(1)}','lifetime','apple')`); }catch(e){ err=e.message; }
  ok('entitlements: unknown status refused', /check/i.test(err||''), err);
 }
 console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
