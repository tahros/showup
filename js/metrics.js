/* ShowUp — metrics.js (v4.6.142): anonymous usage counts, and the owner's dashboard.
   Classic script, loaded last. Runbook 9.5 / 9.6; spec: claude/paywall-and-metrics-spec.md.

   WHAT IS SENT. A random device id made on first launch, the event name, the
   first-touch source tag (?ref=hn, or "as" in the iOS app), the platform, the
   app version, the time and -- for day_logged only -- which logged day it was.
   NEVER a weight, a rep, an exercise, a plan, a note, a name or an email:
   mBody() builds the request from those fields and no others, and the server
   (supabase/functions/track) drops anything it does not name.

   THE EVENTS. open (once a day), day_logged (the first time today has a set;
   day_n = how many days this record has logged), first_set (day_n is 1),
   export, plan_written (the writer answered), paywall_seen (the paywall, when
   it exists). subscribed / cancelled come from the payment webhook, not here.

   HOW. Events queue in localStorage and go in batches of up to 50 to the track
   function, when online, at most every 30 seconds and when the app is hidden.
   A failed send keeps the queue; a refused one (400, 429) drops it, because
   resending the same batch cannot succeed. Nothing is sent from localhost, a
   file, or an automated browser, so tests and development never count.

   Stats never writes the record: nothing here reads beyond DB.days' dates
   and set counts, and nothing here writes DB.

   THE DASHBOARD. #owner, only for the account signed in as sungjee.u@gmail.com.
   Everyone else gets nothing: no entry point, no render, and the server's
   owner_metrics() refuses them regardless (supabase-setup.sql). */
const M_KEYS={dev:'showup:device',ref:'showup:ref',q:'showup:events',open:'showup:ev-open',day:'showup:ev-day',first:'showup:ev-first'};
const M_REFS=['hn','gn','dq','li','ig','tt','yt','ph','rd','th','as'];
const M_PATH='/functions/v1/track', M_BATCH=50, M_QMAX=200, M_OWNER='sungjee.u@gmail.com';
const mGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const mSet=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
function mUuid(){
  try{ if(crypto.randomUUID) return crypto.randomUUID(); }catch(e){}
  const b=new Uint8Array(16);try{crypto.getRandomValues(b);}catch(e){for(let i=0;i<16;i++)b[i]=Math.random()*256|0;}
  b[6]=b[6]&15|64;b[8]=b[8]&63|128;const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
/* first launch makes the device id and fixes the source tag, once: a later
   visit with a different ?ref= does not change where this device came from */
function mBoot(){
  if(mGet(M_KEYS.dev)) return;
  let ref='';
  try{ const r=new URLSearchParams(location.search).get('ref'); if(M_REFS.includes(r)) ref=r; }catch(e){}
  if(!ref&&typeof NATIVE_SHELL!=='undefined'&&NATIVE_SHELL) ref='as';
  mSet(M_KEYS.ref,ref); mSet(M_KEYS.dev,mUuid());
}
function mEnabled(){
  try{
    if(navigator.webdriver) return false;
    if(location.protocol==='capacitor:') return true;
    if(location.protocol!=='https:') return false;
    return !/^(localhost|127\.|\[::1\])/.test(location.hostname);
  }catch(e){ return false; }
}
function mQueue(){ try{ const q=JSON.parse(mGet(M_KEYS.q)||'[]'); return Array.isArray(q)?q:[]; }catch(e){ return []; } }
function mTrack(name,extra){
  mBoot();
  const e={name,at:Date.now()};
  if(name==='day_logged'&&extra&&Number.isInteger(extra.day_n)) e.day_n=extra.day_n;
  const q=mQueue(); q.push(e); mSet(M_KEYS.q,JSON.stringify(q.slice(-M_QMAX)));
  mSoon();
}
/* the request body: these fields and no others */
function mBody(events){
  return {device_id:mGet(M_KEYS.dev),platform:(typeof NATIVE_SHELL!=='undefined'&&NATIVE_SHELL)?'ios':'web',
    app_version:String(typeof APP_VERSION!=='undefined'?APP_VERSION:'0.0.0').replace(/^v/,''),
    ref:mGet(M_KEYS.ref)||null,
    events:events.map(e=>e.name==='day_logged'?{name:e.name,at:e.at,day_n:e.day_n}:{name:e.name,at:e.at})};
}
let _mBusy=false,_mTimer=null;
function mSoon(){ if(!_mTimer) _mTimer=setTimeout(()=>{_mTimer=null;mFlush();},30000); }
async function mFlush(){
  if(_mBusy||!mEnabled()) return 'off';
  if(navigator.onLine===false) return 'offline';
  const q=mQueue(); if(!q.length) return 'empty';
  const batch=q.slice(0,M_BATCH);
  _mBusy=true;
  try{
    const {url,anon}=cloudCfg();
    const tok=(typeof session!=='undefined'&&session&&Date.now()<session.expires_at-60000)?session.access_token:anon;
    const r=await fetch(url+M_PATH,{method:'POST',keepalive:true,
      headers:{apikey:anon,Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify(mBody(batch))});
    if(r.ok||r.status===400||r.status===429){
      const now=mQueue(); mSet(M_KEYS.q,JSON.stringify(now.slice(batch.length)));   // sent, or refused for good
      return r.ok?'sent':'refused';
    }
    return 'kept';
  }catch(e){ return 'kept'; }
  finally{ _mBusy=false; }
}
/* what today has become: an open, and the first logged set of the day */
function mObserve(){
  if(typeof DB==='undefined'||!DB||!DB.days||typeof todayISO==='undefined') return;
  if(mGet(M_KEYS.open)!==todayISO){ mSet(M_KEYS.open,todayISO); mTrack('open'); }
  const t=DB.days[todayISO];
  if(t&&(t.w||[]).length&&mGet(M_KEYS.day)!==todayISO){
    mSet(M_KEYS.day,todayISO);
    const n=Object.values(DB.days).filter(d=>d&&(d.w||[]).length).length;
    if(n===1&&!mGet(M_KEYS.first)){ mSet(M_KEYS.first,todayISO); mTrack('first_set'); }
    mTrack('day_logged',{day_n:n});
  }
}
document.addEventListener('click',e=>{
  if(e.target.closest&&e.target.closest('#expCsv,#expSheet,#expJson')) mTrack('export');
},true);
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden'){ mObserve(); mFlush(); } });
setTimeout(()=>{ mBoot(); mObserve(); mFlush(); ownerRoute(); },2500);
setInterval(mObserve,15000);
setInterval(mFlush,60000);

/* ================= the owner's dashboard (#owner) ================= */
const O_RANGES=[['today','Today'],['7','7 days'],['30','30 days'],['all','All']];
const O_LAUNCH=null;   // set to 'YYYY-MM-DD' on launch day to add a "Launch day" range
let _o={range:'7',ref:'',data:null,err:''};
function ownerIs(){ return typeof session!=='undefined'&&!!session&&String(session.user?.email||'').toLowerCase()===M_OWNER; }
function ownerRoute(){
  if(location.hash==='#owner'&&ownerIs()) ownerOpen();
  else document.getElementById('ownerDash')?.remove();
}
window.addEventListener('hashchange',ownerRoute);
function oDays(){
  const to=todayISO, d=new Date(to+'T12:00');
  if(_o.range==='today') return [to,to];
  if(_o.range==='launch'&&O_LAUNCH) return [O_LAUNCH,O_LAUNCH];
  if(_o.range==='all') return ['2026-01-01',to];
  d.setDate(d.getDate()-(+_o.range-1)); return [d.toLocaleDateString('en-CA'),to];
}
async function ownerLoad(){
  const [from,to]=oDays();
  _o.err='';
  try{
    const tok=typeof freshToken==='function'?await freshToken():null;
    if(!tok){ _o.err='Sign in again to load the numbers.'; return; }
    const {url,anon}=cloudCfg();
    const r=await fetch(url+'/rest/v1/rpc/owner_metrics',{method:'POST',
      headers:{apikey:anon,Authorization:'Bearer '+tok,'Content-Type':'application/json'},
      body:JSON.stringify({p_from:from,p_to:to,p_ref:_o.ref||null})});
    if(!r.ok){ _o.err=r.status===404?'The metrics SQL is not in the database yet (supabase-setup.sql, v4.6.142 section).':'Could not load ('+r.status+').'; _o.data=null; return; }
    _o.data=await r.json();
  }catch(e){ _o.err='Offline. The numbers load when you are back online.'; }
}
async function ownerOpen(){
  let el=document.getElementById('ownerDash');
  if(!el){
    el=document.createElement('div');el.id='ownerDash';el.setAttribute('role','dialog');el.setAttribute('aria-label','Owner dashboard');
    document.body.appendChild(el);
    el.addEventListener('click',e=>{
      const b=e.target.closest('button'); if(!b) return;
      if(b.dataset.oClose!==undefined){ history.replaceState(null,'',location.pathname+location.search); el.remove(); return; }
      if(b.dataset.oRange){ _o.range=b.dataset.oRange; ownerRefresh(); }
    });
    el.addEventListener('change',e=>{ if(e.target.id==='oRef'){ _o.ref=e.target.value; ownerRefresh(); } });
  }
  ownerRefresh();
}
async function ownerRefresh(){
  const el=document.getElementById('ownerDash'); if(!el) return;
  el.innerHTML=ownerHTML(true);
  await ownerLoad();
  if(document.getElementById('ownerDash')) el.innerHTML=ownerHTML(false);
}
const oN=n=>Number(n||0).toLocaleString('en-US');
function ownerHTML(loading){
  const d=_o.data, days=d?.daily||[], [from,to]=oDays();
  const sum=k=>days.reduce((a,x)=>a+(+x[k]||0),0);
  const ranges=(O_LAUNCH?[['launch','Launch day'],...O_RANGES]:O_RANGES)
    .map(([k,l])=>`<button type="button" data-o-range="${k}" aria-pressed="${_o.range===k}">${l}</button>`).join('');
  const srcs=['',...(d?.sources||[])].map(s=>`<option value="${hesc(s)}" ${s===_o.ref?'selected':''}>${s?hesc(s):'All sources'}</option>`).join('');
  const head=`<div class="o-top"><h2>Owner</h2><button type="button" class="o-x" data-o-close aria-label="Close">✕</button></div>
    <div class="o-filters"><div class="o-ranges" role="group" aria-label="Range">${ranges}</div><select id="oRef" aria-label="Source">${srcs}</select></div>
    <p class="o-span">${from===to?from:from+' – '+to} · New York days</p>`;
  if(loading&&!d) return head+'<p class="o-note">Loading…</p>';
  if(_o.err) return head+`<p class="o-note">${hesc(_o.err)}</p>`;
  const tiles=[['Active devices',d?.totals?.active],['Loggers',d?.totals?.loggers],['First sets',sum('first_sets')],['Day 2s',sum('day2')],
    ['Paywall views',sum('paywall')],['New members',sum('subscribed')]];
  const tileHTML=tiles.map(([l,v])=>`<div class="o-tile"><b>${oN(v)}</b><span>${l}</span></div>`).join('');
  // funnel, summed over sources
  const F=['devices','opened','logged','day2','day7','day20','subscribed'].reduce((a,k)=>(a[k]=(d?.funnel||[]).reduce((s,f)=>s+(+f[k]||0),0),a),{});
  const steps=[['Opened','opened'],['Logged a day','logged'],['Day 2','day2'],['Day 7','day7'],['Day 20','day20'],['Subscribed','subscribed']];
  const top=Math.max(1,F.opened);
  const funnel=steps.map(([l,k],i)=>{const v=F[k],prev=i?F[steps[i-1][1]]:null;
    return `<div class="o-step"><span class="o-l">${l}</span><span class="o-bar"><i style="width:${Math.round(v/top*100)}%"></i></span><b>${oN(v)}</b><span class="o-pct">${prev==null?'':prev?Math.round(v/prev*100)+'%':'–'}</span></div>`;}).join('');
  return head+`<div class="o-tiles">${tileHTML}</div>
    <h3>Funnel <small>devices first seen in this range</small></h3><div class="o-funnel">${funnel}</div>
    <h3>Daily loggers <small>devices that logged a day</small></h3>${ownerChart(days,from,to)}
    <p class="o-note">Writer calls: ${oN(sum('writer'))} · Exports: ${oN(sum('exports'))}</p>
    <details class="o-table"><summary>Table</summary><table><thead><tr><th>Day</th><th>Opens</th><th>Loggers</th><th>First sets</th><th>Day 2s</th><th>Paywall</th><th>Members</th><th>Writer</th></tr></thead><tbody>${
      days.map(x=>`<tr><td>${x.d}</td><td>${oN(x.opens)}</td><td>${oN(x.loggers)}</td><td>${oN(x.first_sets)}</td><td>${oN(x.day2)}</td><td>${oN(x.paywall)}</td><td>${oN(x.subscribed)}</td><td>${oN(x.writer)}</td></tr>`).join('')||'<tr><td colspan="8">No events yet</td></tr>'}</tbody></table></details>
    <h3>Members</h3><p class="o-note">Appears with in-app purchase (runbook 9.8). Revenue truth stays in App Store Connect and RevenueCat.</p>`;
}
/* one series, one hue: loggers per day, every day in the range drawn (a gap is a zero) */
function ownerChart(days,from,to){
  const by=Object.fromEntries(days.map(x=>[x.d,+x.loggers||0])),list=[];
  const start=days.length&&from<days[0].d&&_o.range==='all'?days[0].d:from;
  for(let d=new Date(start+'T12:00');d.toLocaleDateString('en-CA')<=to;d.setDate(d.getDate()+1)){const k=d.toLocaleDateString('en-CA');list.push([k,by[k]||0]);}
  if(!list.length) return '<p class="o-note">No days in range.</p>';
  const W=320,H=120,max=Math.max(1,...list.map(x=>x[1])),bw=W/list.length,gap=list.length>60?0:2;
  const bars=list.map(([k,v],i)=>{const h=v?Math.max(2,v/max*(H-18)):0;
    return `<g><rect x="${(i*bw).toFixed(2)}" y="0" width="${bw.toFixed(2)}" height="${H}" fill="transparent"><title>${k}: ${v} logger${v===1?'':'s'}</title></rect>`+
      (h?`<rect x="${(i*bw+gap/2).toFixed(2)}" y="${(H-h).toFixed(2)}" width="${Math.max(1,bw-gap).toFixed(2)}" height="${h.toFixed(2)}" rx="${Math.min(2,bw/3).toFixed(1)}" fill="var(--accent)" pointer-events="none"/>`:'')+'</g>';}).join('');
  const last=list[list.length-1];
  return `<figure class="o-chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Daily loggers, ${list[0][0]} to ${last[0]}, peak ${max}">${bars}</svg>
    <figcaption><span>${list[0][0]}</span><span>peak ${max} · last ${last[1]}</span><span>${last[0]}</span></figcaption></figure>`;
}
(function(){
  const s=document.createElement('style');s.id='ownerStyle';
  s.textContent=`#ownerDash{position:fixed;inset:0;z-index:9000;overflow:auto;background:var(--ground);color:var(--chalk);font:400 14px/1.45 var(--body);padding:calc(env(safe-area-inset-top) + 18px) 18px calc(env(safe-area-inset-bottom) + 28px)}
#ownerDash .o-top{display:flex;justify-content:space-between;align-items:center}#ownerDash h2{font:600 24px var(--body);margin:0}
#ownerDash .o-x{border:0;background:var(--surface);color:var(--chalk);width:40px;height:40px;border-radius:12px;font-size:16px;cursor:pointer}
#ownerDash .o-filters{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:16px 0 4px}
#ownerDash .o-ranges{display:flex;gap:6px;flex-wrap:wrap}
#ownerDash .o-ranges button{border:1px solid var(--line);background:var(--surface);color:var(--chalk);border-radius:999px;padding:7px 12px;font:500 13px var(--body);cursor:pointer;min-height:36px}
#ownerDash .o-ranges button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#fff}
#ownerDash select{border:1px solid var(--line);background:var(--surface);color:var(--chalk);border-radius:10px;padding:7px 10px;font:400 13px var(--body);min-height:36px}
#ownerDash .o-span,#ownerDash .o-note{color:var(--muted);font:400 12px var(--mono);margin:6px 0 14px}
#ownerDash .o-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
#ownerDash .o-tile{background:var(--surface);border-radius:14px;padding:12px}
#ownerDash .o-tile b{display:block;font:600 24px var(--body);font-variant-numeric:tabular-nums}#ownerDash .o-tile span{color:var(--muted);font-size:12px}
#ownerDash h3{font:600 16px var(--body);margin:24px 0 10px}#ownerDash h3 small{font:400 12px var(--body);color:var(--muted);margin-left:6px}
#ownerDash .o-funnel{background:var(--surface);border-radius:14px;padding:6px 12px}
#ownerDash .o-step{display:grid;grid-template-columns:96px 1fr 52px 40px;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--whisper)}
#ownerDash .o-step:last-child{border-bottom:0}#ownerDash .o-l{color:var(--muted);font-size:13px}
#ownerDash .o-bar{height:8px;background:var(--surface2);border-radius:4px;overflow:hidden}#ownerDash .o-bar i{display:block;height:100%;background:var(--accent);border-radius:4px}
#ownerDash .o-step b{text-align:right;font-variant-numeric:tabular-nums}#ownerDash .o-pct{color:var(--muted);font:400 12px var(--mono);text-align:right}
#ownerDash .o-chart{margin:0;background:var(--surface);border-radius:14px;padding:14px 12px 10px}#ownerDash .o-chart svg{width:100%;height:120px;display:block}
#ownerDash figcaption{display:flex;justify-content:space-between;color:var(--muted);font:400 11px var(--mono);margin-top:8px}
#ownerDash .o-table{margin-top:10px}#ownerDash .o-table summary{color:var(--accent-ink);cursor:pointer;font-size:13px}
#ownerDash table{width:100%;border-collapse:collapse;font:400 12px var(--mono);margin-top:8px;display:block;overflow-x:auto}#ownerDash th,#ownerDash td{padding:5px 6px;text-align:right;white-space:nowrap}#ownerDash th:first-child,#ownerDash td:first-child{text-align:left}`;
  document.head.appendChild(s);
})();
