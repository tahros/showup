/* test-metrics.js DIR — v4.6.142: anonymous usage counts and the owner dashboard.
 * Two halves, both real code:
 *  - the app: every script in index.html order, with fetch faked; js/metrics.js
 *    decides what is counted and what the request carries;
 *  - the server: supabase/functions/track/index.ts, imported and driven with a
 *    fake Supabase behind its injected fetch.
 * The rules: no workout content ever leaves (the body has exactly the named
 * fields); open once a day; day_logged once a day with the record's day count;
 * first_set only on a record's first day; first-touch source fixed at the first
 * launch; nothing sent from automation or localhost; a refused batch is dropped,
 * a failed one kept; the dashboard exists only for the owner. The server drops
 * unknown and server-only names, rejects malformed batches, takes the account
 * id from the caller's token only, and caps a device at 60 events an hour. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
const settle=async(n=30)=>{for(let i=0;i<n;i++)await new Promise(r=>setTimeout(r,0));};
const TODAY='2026-10-15';

async function boot({url='https://tahros.github.io/showup/',store={},shell=false,webdriver=false,respond=()=>({status:200,body:{accepted:1}}),days={}}={}){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url,runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext(),sent=[];
  w.localStorage.setItem('showup:planning-interface','previous');
  w.localStorage.setItem('tracker-v1',JSON.stringify({days,settings:{onboarded:true,unit:'lb'}}));
  for(const [k,v] of Object.entries(store)) w.localStorage.setItem(k,v);
  if(shell) w.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins:{Filesystem:{}},isPluginAvailable:()=>false};
  Object.defineProperty(w.navigator,'webdriver',{configurable:true,get:()=>webdriver});
  w.fetch=async(u,o={})=>{
    if(String(u).includes('/functions/v1/track')||String(u).includes('/rest/v1/rpc/owner_metrics')){
      sent.push({u:String(u),o,body:o.body?JSON.parse(o.body):null});
      const r=respond(String(u),o); if(r==='throw') throw new Error('offline');
      return {ok:r.status>=200&&r.status<300,status:r.status,json:async()=>r.body};
    }
    throw new Error('offline');
  };
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(srcs[s],ctx,{filename:s});
  await settle(60);
  const run=c=>vm.runInContext(c,ctx);
  run(`todayISO='${TODAY}';checkDate=()=>false;`);
  return {w,run,sent,q:()=>JSON.parse(w.localStorage.getItem('showup:events')||'[]'),ls:k=>w.localStorage.getItem(k)};
}
const set=(ex,lb)=>({part:'Chest',ex,w:lb/2.2046,reps:[8],at:Date.now()});

async function client(){
  /* first launch: device id and the first-touch source */
  { const b=await boot({url:'https://tahros.github.io/showup/?ref=hn'});
    b.run('mBoot()');
    ok('first launch: a random device id', /^[0-9a-f-]{36}$/.test(b.ls('showup:device')||''), b.ls('showup:device'));
    ok('first launch: ?ref=hn is the source', b.ls('showup:ref')==='hn');
  }
  { const b=await boot({url:'https://tahros.github.io/showup/?ref=li',store:{'showup:device':'11111111-1111-4111-8111-111111111111','showup:ref':'hn'}});
    b.run('mBoot()');
    ok('a later visit with another ?ref= does not change where the device came from', b.ls('showup:ref')==='hn');
  }
  { const b=await boot({url:'https://tahros.github.io/showup/?ref=evil<script>'});b.run('mBoot()');
    ok('an unknown ?ref= is ignored (direct)', b.ls('showup:ref')==='');
  }
  { const b=await boot({shell:true});b.run('mBoot()');
    ok('the iOS app with no ?ref=: source "as" (App Store), platform ios', b.ls('showup:ref')==='as' && b.run('mBody([]).platform')==='ios');
  }
  /* what gets counted */
  { const b=await boot({days:{'2026-10-01':{w:[set('Dip',0)]},'2026-10-03':{w:[set('Dip',0)]}}});
    b.run('mObserve();mObserve();');
    ok('open: once a day, however often the app looks', b.q().filter(e=>e.name==='open').length===1, JSON.stringify(b.q()));
    ok('nothing logged today: no day_logged', !b.q().some(e=>e.name==='day_logged'));
    b.run(`DB.days[todayISO]={w:[${JSON.stringify(set('Barbell Bench Press',225))}]};mObserve();`);
    b.run(`DB.days[todayISO].w.push(${JSON.stringify(set('Barbell Bench Press',225))});mObserve();`);
    const dl=b.q().filter(e=>e.name==='day_logged');
    ok("today's first set: one day_logged, day_n = the record's logged days (3)", dl.length===1 && dl[0].day_n===3, JSON.stringify(dl));
    ok('not the record\'s first day: no first_set', !b.q().some(e=>e.name==='first_set'));
    const body=JSON.stringify(b.run('JSON.stringify(mBody(mQueue()))'));
    ok('the request never carries workout content', !/Bench|Chest|225|"w"|"reps"|"ex"|"part"/.test(body), body);
    const bo=JSON.parse(b.run('JSON.stringify(mBody(mQueue()))'));
    ok('the request has exactly the named fields', Object.keys(bo).sort().join()==='app_version,device_id,events,platform,ref' &&
      bo.events.every(e=>Object.keys(e).every(k=>['name','at','day_n'].includes(k))), JSON.stringify(Object.keys(bo)));
  }
  { const b=await boot();
    b.run(`DB.days[todayISO]={w:[${JSON.stringify(set('Squat',135))}]};mObserve();`);
    ok("a record's very first day: first_set, and day_logged day_n 1", b.q().some(e=>e.name==='first_set') && b.q().find(e=>e.name==='day_logged')?.day_n===1);
  }
  { const b=await boot();
    b.w.document.body.insertAdjacentHTML('beforeend','<button id="expCsv">CSV</button>');
    b.w.document.getElementById('expCsv').dispatchEvent(new b.w.MouseEvent('click',{bubbles:true}));
    ok('an export is counted', b.q().some(e=>e.name==='export'));
  }
  /* sending */
  { const b=await boot();b.run(`mTrack('open')`);
    ok('sent in a batch to the track function', (await b.run('mFlush()'))==='sent' && b.sent.length===1 && b.q().length===0, b.sent.length);
    ok('with the anon key when signed out', b.sent[0].o.headers.Authorization==='Bearer '+b.run('cloudCfg().anon'));
  }
  { const b=await boot({respond:()=>'throw'});b.run(`mTrack('open')`);
    ok('network failure: the events stay queued for later', (await b.run('mFlush()'))==='kept' && b.q().length===1);
  }
  for(const st of [400,429]){ const b=await boot({respond:()=>({status:st,body:{}})});b.run(`mTrack('open')`);
    ok(`server refuses (${st}): the batch is dropped, not retried forever`, (await b.run('mFlush()'))==='refused' && b.q().length===0); }
  { const b=await boot({respond:()=>({status:502,body:{}})});b.run(`mTrack('open')`);
    ok('server error (502): kept', (await b.run('mFlush()'))==='kept' && b.q().length===1); }
  { const b=await boot();b.run(`for(let i=0;i<120;i++)mTrack('open')`);await b.run('mFlush()');
    ok('at most 50 per request', b.sent[0].body.events.length===50 && b.q().length===70, b.sent[0].body.events.length); }
  { const b=await boot();b.run(`for(let i=0;i<260;i++)mTrack('export')`);
    ok('the queue is capped (200), so a long offline spell cannot grow storage without end', b.q().length===200); }
  { const b=await boot({webdriver:true});b.run(`mTrack('open')`);
    ok('an automated browser (tests, screenshots) never sends', (await b.run('mFlush()'))==='off' && !b.sent.length); }
  { const b=await boot({url:'http://localhost:8784/'});b.run(`mTrack('open')`);
    ok('localhost never sends', (await b.run('mFlush()'))==='off' && !b.sent.length); }
  /* the owner dashboard */
  const DATA={from:'2026-10-09',to:TODAY,ref:null,sources:['direct','hn'],totals:{active:12,loggers:7},
    funnel:[{src:'hn',devices:10,opened:10,logged:6,day2:3,day7:1,day20:0,subscribed:0},{src:'direct',devices:2,opened:2,logged:1,day2:1,day7:0,day20:0,subscribed:0}],
    daily:[{d:'2026-10-14',opens:5,loggers:3,first_sets:2,day2:1,paywall:0,subscribed:0,writer:2,exports:0},{d:TODAY,opens:9,loggers:6,first_sets:4,day2:3,paywall:0,subscribed:0,writer:1,exports:1}]};
  const signIn=(b,email)=>b.run(`session={access_token:'tok',refresh_token:'r',expires_at:Date.now()+36e5,user:{id:'u',email:'${email}'}}`);
  { const b=await boot({respond:()=>({status:200,body:DATA})});signIn(b,'someone@x.co');
    b.run(`location.hash='#owner';ownerRoute();view='sync';render();`);await settle();
    ok('another account: #owner renders nothing, and Settings has no entry', !b.w.document.getElementById('ownerDash') && !b.w.document.getElementById('ownerLink') && !b.sent.length);
  }
  { const b=await boot({respond:()=>({status:200,body:DATA})});
    b.run(`location.hash='#owner';ownerRoute();`);await settle();
    ok('signed out: nothing', !b.w.document.getElementById('ownerDash'));
  }
  { const b=await boot({respond:()=>({status:200,body:DATA})});signIn(b,'Sungjee.U@gmail.com');
    b.run(`view='sync';render();`);
    ok('the owner: Settings has the Owner dashboard entry', !!b.w.document.getElementById('ownerLink'));
    b.run(`location.hash='#owner';ownerRoute();`);await settle();
    const el=b.w.document.getElementById('ownerDash'),t=el?.textContent||'';
    ok('the owner: the dashboard opens', !!el);
    ok('it asks owner_metrics with the owner\'s own token, for the last 7 days', b.sent[0]?.u.endsWith('/rest/v1/rpc/owner_metrics') && b.sent[0].o.headers.Authorization==='Bearer tok' && b.sent[0].body.p_from==='2026-10-09' && b.sent[0].body.p_to===TODAY, JSON.stringify(b.sent[0]?.body));
    const steps=[...el.querySelectorAll('.o-step')].map(s=>s.querySelector('b').textContent);
    ok('funnel steps: 12 → 7 → 4 → 1 → 0 → 0', steps.join()==='12,7,4,1,0,0', steps.join());
    ok('tiles: active devices and loggers are the range totals, not daily sums', /12\s*Active devices/.test(t) && /7\s*Loggers/.test(t), t.slice(0,300));
    ok('the chart draws every day in range, with a text label per bar', el.querySelectorAll('.o-chart title').length===7);
    ok('a table view exists', !!el.querySelector('details.o-table table'));
    el.querySelector('[data-o-range="30"]').dispatchEvent(new b.w.MouseEvent('click',{bubbles:true}));await settle();
    ok('30 days: asks again from Sep 16', b.sent.at(-1).body.p_from==='2026-09-16', b.sent.at(-1).body.p_from);
    const sel=el.querySelector('#oRef');sel.value='hn';sel.dispatchEvent(new b.w.Event('change',{bubbles:true}));await settle();
    ok('source filter: asks for hn only', b.sent.at(-1).body.p_ref==='hn');
    el.querySelector('[data-o-close]').dispatchEvent(new b.w.MouseEvent('click',{bubbles:true}));
    ok('close: gone, and the hash is cleared', !b.w.document.getElementById('ownerDash') && b.w.location.hash==='');
  }
  { const b=await boot({respond:()=>({status:404,body:{}})});signIn(b,'sungjee.u@gmail.com');
    b.run(`location.hash='#owner';ownerRoute();`);await settle();
    ok('before the SQL is run: says so plainly', /metrics SQL is not in the database yet/.test(b.w.document.getElementById('ownerDash')?.textContent||''));
  }
}

/* ---------------- server ---------------- */
const SB='https://proj.supabase.co',ANON='anon-key-123',SERVICE='service-role-xyz',UID='11111111-2222-3333-4444-555555555555';
const DEV='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const env=k=>({SUPABASE_URL:SB,SUPABASE_ANON_KEY:ANON,SUPABASE_SERVICE_ROLE_KEY:SERVICE})[k];
function fake({used=0,tokens={'user-token':UID}}={}){
  const calls=[],rows=[];
  const net=async(u,o={})=>{
    const h=o.headers||{};calls.push((o.method||'GET')+' '+u.replace(SB,''));
    const res=(status,body,headers={})=>({ok:status<300,status,json:async()=>body,headers:{get:k=>headers[k.toLowerCase()]||null}});
    if(u===SB+'/auth/v1/user'){const t=(h.Authorization||'').slice(7);return tokens[t]?res(200,{id:tokens[t]}):res(401,{id:'99999999-9999-4999-8999-999999999999'});}
    if(u.startsWith(SB+'/rest/v1/events?')){ if(h.Authorization!=='Bearer '+SERVICE) return res(401,{}); return res(206,[],{'content-range':`0-0/${used}`}); }
    if(u===SB+'/rest/v1/events'&&o.method==='POST'){ if(h.Authorization!=='Bearer '+SERVICE) return res(401,{}); rows.push(...JSON.parse(o.body)); return res(201,null); }
    return res(404,{});
  };
  return {net,calls,rows};
}
const req=(body,token=ANON)=>new Request(SB+'/functions/v1/track',{method:'POST',headers:{'content-type':'application/json',origin:'capacitor://localhost',authorization:'Bearer '+token},body:JSON.stringify(body)});
const good=(events,extra={})=>({device_id:DEV,platform:'ios',app_version:'4.6.142',ref:'hn',events,...extra});
async function server(){
  const {handle,clean}=await import(require('url').pathToFileURL(path.join(dir,'supabase/functions/track/index.ts')).href);
  const now=Date.now();
  { const f=fake();const r=await handle(req(good([{name:'open',at:now},{name:'day_logged',at:now,day_n:4}])),env,f.net,now);const j=await r.json();
    ok('server: a good batch is stored', r.status===200&&j.accepted===2&&f.rows.length===2, JSON.stringify(j));
    ok('server: signed out, the anon key is not asked about and no account is stored', !f.calls.includes('GET /auth/v1/user') && f.rows.every(x=>x.user_id===null));
    ok('server: rows hold only the named columns', f.rows.every(x=>Object.keys(x).sort().join()==='app_version,at,day_n,device_id,name,platform,ref,user_id'), Object.keys(f.rows[0]).join());
    ok('server: the CORS origin is the iOS app', r.headers.get('access-control-allow-origin')==='capacitor://localhost'); }
  { const f=fake();await handle(req(good([{name:'open',at:now,ex:'Bench',w:100,reps:[5],email:'a@b.c'}])),env,f.net,now);
    ok('server: extra fields a client sends are never written', !JSON.stringify(f.rows).match(/Bench|email|reps/), JSON.stringify(f.rows)); }
  { const f=fake();const r=await handle(req(good([{name:'open',at:now},{name:'subscribed',at:now},{name:'weights',at:now},{name:'day_logged',at:now}])),env,f.net,now);const j=await r.json();
    ok('server: unknown names, server-only names and a day_logged without day_n are dropped', j.accepted===1&&j.dropped===3&&f.rows.map(x=>x.name).join()==='open', JSON.stringify(j)); }
  for(const [n,b] of [['device id',good([{name:'open'}],{device_id:'me@x.co'})],['platform',good([{name:'open'}],{platform:'android'})],['version',good([{name:'open'}],{app_version:'Bench 225'})],['body','nope']]){
    const f=fake();const r=await handle(req(b),env,f.net,now);
    ok(`server: a malformed ${n} rejects the batch (400), nothing written`, r.status===400&&!f.rows.length, r.status); }
  { const f=fake();await handle(req(good([{name:'open'}],{ref:'<script>'})),env,f.net,now);
    ok('server: an unknown ref is stored as none', f.rows[0].ref===null); }
  { const f=fake();await handle(req(good([{name:'open'}],{app_version:'v4.6.142'})),env,f.net,now);
    ok('server: "v4.6.142" is stored as 4.6.142', f.rows[0].app_version==='4.6.142'); }
  { const f=fake();await handle(req(good([{name:'open',at:now+864e5},{name:'open',at:0}])),env,f.net,now);
    ok('server: a wrong clock (future, or 1970) is stored as now', f.rows.every(x=>x.at===new Date(now).toISOString())); }
  { const f=fake();await handle(req(good([{name:'open',at:now}]),'user-token'),env,f.net,now);
    ok('server: signed in, the account id comes from the caller\'s own token', f.rows[0].user_id===UID&&f.calls[0]==='GET /auth/v1/user'); }
  { const f=fake();await handle(req(good([{name:'open',at:now}],{user_id:'99999999-9999-4999-8999-999999999999'}),'forged'),env,f.net,now);
    ok('server: a body user_id and a bad token store no account', f.rows[0].user_id===null); }
  { const f=fake({used:58});const r=await handle(req(good(Array(5).fill({name:'export',at:now}))),env,f.net,now);const j=await r.json();
    ok('server: near the hourly limit, only the room left is stored (2 of 5)', r.status===200&&f.rows.length===2&&j.dropped===3, JSON.stringify(j)); }
  { const f=fake({used:60});const r=await handle(req(good([{name:'open',at:now}])),env,f.net,now);
    ok('server: at the limit, 429 and nothing stored', r.status===429&&!f.rows.length); }
  { const f=fake();const r=await handle(req(good(Array(80).fill({name:'export',at:now}))),env,f.net,now);const j=await r.json();
    ok('server: a batch is cut at 50', f.rows.length===50&&j.dropped===30, JSON.stringify(j)); }
  { const r=await handle(new Request(SB+'/functions/v1/track',{method:'OPTIONS',headers:{origin:'capacitor://localhost'}}),env,fake().net,now);
    ok('server: CORS preflight answers', r.status===200); }
  ok('server: clean() is the whole trust boundary and is pure', typeof clean==='function' && clean(null).error==='body');
}
(async()=>{ await client(); await server();
  console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
