/* ShowUp — util.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- rubber-band at the bottom ----------
   iOS gives a native bounce; disabling it for pull-to-refresh killed it everywhere.
   This restores the feel at the bottom edge: drag past the end and the content
   stretches with diminishing returns (÷2.6), then springs back with a slight
   overshoot. Purely visual — no scroll state is touched. */
(()=>{
  let y0=null, band=0, active=false;
  const atBottom=()=>innerHeight+scrollY>=document.body.scrollHeight-1;
  addEventListener('touchstart',e=>{
    if(e.touches.length!==1){y0=null;return;}
    y0=e.touches[0].clientY; band=0; active=false;
  },{passive:true});
  addEventListener('touchmove',e=>{
    if(y0===null) return;
    const dy=e.touches[0].clientY-y0;
    if(dy<0 && atBottom()){                    // dragging up, already at the end
      active=true; band=Math.min(80,(-dy)/2.6);
      document.body.classList.add('banding');
      document.body.classList.remove('bandback');
      document.body.style.transform=`translateY(${(-band).toFixed(1)}px)`;
    }else if(active){
      release();
    }
  },{passive:true});
  const release=()=>{
    if(!active) return;
    active=false; band=0;
    document.body.classList.remove('banding');
    document.body.classList.add('bandback');
    document.body.style.transform='';
    setTimeout(()=>document.body.classList.remove('bandback'),450);
  };
  ['touchend','touchcancel'].forEach(ev=>addEventListener(ev,()=>{release();y0=null;},{passive:true}));
})();

/* ---------- swipe between tabs ----------
   Horizontal swipe moves along the nav: Today ↔ Lift ↔ Stats ↔ History.
   Deliberately inert inside an exercise/part drill-down (the back button owns
   that axis) and over any horizontally scrollable strip (suggested chips,
   heatmap) or zoomable chart, so it never steals a legitimate gesture. */
(()=>{
  const TABS=['today','lift','stats','history'];
  let sx=0, sy=0, tracking=false, decided=false, horiz=false, popMode=false;
  const blocked=t=>t.closest('[data-zoom]')||t.closest('.zone.mini .lastsets')||
                   t.closest('.heat')||t.closest('input')||t.closest('.settile')||
                   t.closest('.compscroll');   // sideways-scrolling chart owns its axis
  addEventListener('touchstart',e=>{
    if(e.touches.length!==1||view==='sync') return;
    if(blocked(e.target)) return;
    // v3.1.3 (Sungjee): inside a drill-down, a horizontal swipe means BACK —
    // either direction. Tabs are one pop away; you can't tab-hop out of a lift.
    popMode=(view==='lift'&&!!lift.ex);
    sx=e.touches[0].clientX; sy=e.touches[0].clientY;
    tracking=true; decided=false; horiz=false;
  },{passive:true});
  const hint=()=>document.getElementById('swipehint');
  const showHint=dx=>{
    const el=hint(); if(!el) return;
    if(popMode){                                           // back-pop: ‹ on the left edge, both directions
      el.className='l on';
      el.firstElementChild.textContent='‹';
      el.title=lift.part||'Lift';
      el.style.setProperty('--p',Math.min(1,Math.abs(dx)/90));
      el.firstElementChild.style.opacity=(0.35+0.65*Math.min(1,Math.abs(dx)/90)).toFixed(2);
      return;
    }
    const goingNext=dx<0;                                  // swipe left → next tab
    const i=TABS.indexOf(view);
    const j=(i+(goingNext?1:-1)+TABS.length)%TABS.length;
    // the arrow points the way you're dragging; it lives on the edge you're heading toward
    el.className=(goingNext?'r':'l')+' on';
    el.firstElementChild.textContent=goingNext?'›':'‹';
    el.title=TABS[j];
    el.style.setProperty('--p',Math.min(1,Math.abs(dx)/90));
    el.firstElementChild.style.opacity=(0.35+0.65*Math.min(1,Math.abs(dx)/90)).toFixed(2);
  };
  const hideHint=()=>{const el=hint(); if(el) el.className='';};
  addEventListener('touchmove',e=>{
    if(!tracking) return;
    const dx=e.touches[0].clientX-sx, dy=e.touches[0].clientY-sy;
    if(!decided){
      if(Math.abs(dx)<10&&Math.abs(dy)<10) return;
      decided=true; horiz=Math.abs(dx)>Math.abs(dy)*1.5;   // clearly sideways, not a scroll
      if(!horiz){ tracking=false; return; }
    }
    if(horiz) showHint(dx);
  },{passive:true});
  addEventListener('touchend',e=>{
    hideHint();
    if(!tracking||!horiz){ tracking=false; return; }
    tracking=false;
    const dx=(e.changedTouches[0].clientX)-sx;
    if(Math.abs(dx)<60) return;                            // a real swipe, not a twitch
    if(popMode){ popMode=false; lift.ex=null; render(); return; }   // drill-down: swipe = back
    const i=TABS.indexOf(view);
    if(i<0) return;
    const j=(i+(dx<0?1:-1)+TABS.length)%TABS.length;       // wraps: History ⇄ Today
    view=TABS[j];
    if(view==='lift') lift={part:null,ex:null,weight:0};
    if(session) cloudPush();
    document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===view));
    render();
  },{passive:true});
})();

/* ---------- pull to refresh ----------
   Hold the page down from the very top and let go: pending saves flush, the
   service worker checks for a newer app version, then the app reloads (and the
   boot sequence cloud-pulls). Pulls that start inside a zoomable chart are
   ignored so the gesture never fights pinch-zoom. */
(()=>{
  const el=document.getElementById('ptr'); if(!el) return;
  const THRESH=72, DRAG=0.5;
  let y0=null, pulling=false, dist=0, fired=false;
  addEventListener('touchstart',e=>{
    if(fired) return;
    if(scrollY>0){y0=null;return;}
    if(e.target.closest('[data-zoom]')){y0=null;return;}
    y0=e.touches[0].clientY; pulling=false; dist=0;
  },{passive:true});
  addEventListener('touchmove',e=>{
    if(y0===null||fired) return;
    const dy=e.touches[0].clientY-y0;
    if(!pulling){ if(dy>8&&scrollY<=0) pulling=true; else if(dy<0){y0=null;return;} else return; }
    e.preventDefault();
    dist=Math.max(0,dy)*DRAG;
    el.style.transition='none';
    el.style.transform=`translateY(${Math.min(dist,110)-58}px)`;
    el.classList.toggle('arm',dist>=THRESH);
    // the page itself follows the finger — that's the feedback a tiny arrow can't give
    document.body.classList.add('pulling');
    document.body.classList.remove('settling');
    document.body.style.transform=`translateY(${Math.min(dist,110).toFixed(1)}px)`;
  },{passive:false});
  const settle=()=>{
    el.style.transition='transform .25s cubic-bezier(.2,.8,.25,1)';
    el.style.transform='translateY(-58px)';
    el.classList.remove('arm');
    document.body.classList.remove('pulling');
    document.body.classList.add('settling');
    document.body.style.transform='';
    setTimeout(()=>document.body.classList.remove('settling'),300);
  };
  addEventListener('touchend',async()=>{
    if(y0===null||fired) return;
    const go=pulling&&dist>=THRESH;
    y0=null; pulling=false;
    if(!go){ settle(); return; }
    fired=true;
    el.classList.remove('arm'); el.classList.add('spin');
    el.style.transition='transform .2s'; el.style.transform='translateY(0px)';
    document.body.classList.remove('pulling');
    document.body.classList.add('settling');
    document.body.style.transform='translateY(52px)';   // hold, briefly, while it works
    try{ stashWhere(); flushSave(); }catch(e){}
    try{ if(session) await cloudPushNow(); }catch(e){}    // phone → cloud, synchronously
    try{ const reg=await navigator.serviceWorker.getRegistration(); if(reg) await reg.update(); }catch(e){}
    setTimeout(()=>location.reload(),150);
  },{passive:true});
})();

document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState==='hidden') flushSave();
  else if(session && Date.now()-lastPullAt>120000) cloudPull();   // catch up after 2+ min away
});
function day(d){ if(!DB.days[d]) DB.days[d]={w:[]}; return DB.days[d]; }

/* suggestion overrides: "use THESE sets as the plan for exercise X, today" */
function sugOv(){
  if(!DB.suggest || DB.suggest.date!==todayISO) DB.suggest={date:todayISO, byEx:{}};
  return DB.suggest.byEx;
}
/* what the Suggested panel shows: an override you copied over, else real history */
function suggestedFor(ex){
  const o=sugOv()[ex];
  if(o) return {d:o.d, sets:o.sets, from:o.from};
  return lastSession(ex);
}

/* exercises you add yourself, stored alongside the built-in catalog */
const customs=()=>DB.settings.custom||{};                       // {name:{part,equip}}
const catFor=part=>[...SEED.catalog[part],
  ...Object.entries(customs()).filter(([,c])=>c.part===part).map(([n])=>n)];
const equipOf=ex=>customs()[ex]?.equip || SEED.equip[ex] || 'machine';
const EQUIP_LABEL={barbell:'Barbell (bar + plates)',smith:'Smith machine',dumbbell:'Dumbbell (per hand)',
  cable:'Cable',machine:'Machine',body:'Bodyweight'};

/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2000);}
function fmt(n){return n.toLocaleString('en-US');}
function pretty(d){const [y,m,dd]=d.split('-').map(Number);return new Date(y,m-1,dd).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});}
function md(d){const [y,m,dd]=d.split('-').map(Number);return `${m}/${dd}/${y}`;}            // 4/26/2024
function wd(d){const [y,m,dd]=d.split('-').map(Number);
  return new Date(y,m-1,dd).toLocaleDateString('en-US',{weekday:'short'})+`, ${m}/${dd}`;}   // Tue, 7/7
function daysAgo(d){return Math.round((new Date(todayISO+'T00:00')-new Date(d+'T00:00'))/864e5);}
function doy(iso){const [y,m,d]=iso.split('-').map(Number);return Math.round((Date.UTC(y,m-1,d)-Date.UTC(y,0,1))/864e5)+1;}
function volOf(s){return s.ex==='Run'?0:s.w*s.reps.reduce((a,b)=>a+b,0);}
/* average per-session load for a part, across ALL history (seed + app days,
   excluding today — today is the thing being measured). Runs measure km. */
let _avgVol=null;
function avgSessionVol(part){
  if(!_avgVol){
    _avgVol={};
    const acc={};
    const feed=per=>{ for(const [p,v] of Object.entries(per)){ const a=acc[p]=acc[p]||{s:0,n:0}; a.s+=v; a.n++; } };
    for(const rows of Object.values(SEED.sessions)){
      const per={};
      for(const r of rows){
        const v=r[1]==='Run'? r[2] : r[2]*(r[3]||[]).reduce((a,b)=>a+b,0);
        per[r[0]]=(per[r[0]]||0)+v;
      }
      feed(per);
    }
    for(const [d,day] of Object.entries(DB.days)){
      if(d<=SEED.totals.last||d===todayISO) continue;
      const per={};
      for(const s of day.w){ const v=s.ex==='Run'?s.w:volOf(s); per[s.part]=(per[s.part]||0)+v; }
      feed(per);
    }
    for(const [p,a] of Object.entries(acc)) _avgVol[p]=a.s/a.n;
  }
  return _avgVol[part]||0;
}
function applyTheme(){
  const t=DB.settings.theme==='light'?'light':'dark';
  document.documentElement.dataset.theme=t;
  try{localStorage.setItem('showup-theme',t);}catch(e){}
}
/* weights are always STORED in kg; the unit setting only changes what you see and type */
const LB=2.20462, MI=0.621371;
const isLb=()=>DB.settings.unit==='lb';       // 'lb' == imperial, 'kg' == metric
const U=()=>isLb()?'lb':'kg';
const DU=()=>isLb()?'mi':'km';                 // distance unit
const toD=km=>isLb()?km*MI:km;                 // stored km -> display
const fromD=v=>isLb()?v/MI:v;                  // display -> stored km
const dDisp=km=>(Math.round(toD(km)*100)/100).toFixed(2);
const toU=kg=>isLb()?kg*LB:kg;                       // kg -> display
const toKg=v=>isLb()?v/LB:v;                         // display -> kg
const wDisp=kg=>{const v=toU(kg);return (Math.round(v*10)/10).toString().replace(/\.0$/,'');};
const vDisp=kg=>fmt(Math.round(toU(kg)));            // volume
const STEP=()=>isLb()?5:2.5;

/* --- bar + plate math ---------------------------------------------------
   Weights are stored as the TOTAL on the movement (bar included), matching
   how the sheet was kept. Bar weights are editable in Settings.          */
const barKg=ex=>{
  const per=(DB.settings.barByEx||{})[ex];      // per-exercise override, once you set it
  if(per!=null) return per;
  const e=equipOf(ex);
  if(e==='barbell') return DB.settings.barKg ?? 20;
  if(e==='smith')   return DB.settings.smithKg ?? 20;
  return 0;
};
const usesPlates=ex=>['barbell','smith'].includes(equipOf(ex));
const agoStr=d=>{const n=daysAgo(d);return n<=0?'today':n===1?'yesterday':`${n} days ago`;};

/* ---- session flow (v2.09): a workout has a beginning and an end ----------
   Three levels, each with open/complete state for TODAY:
     level 0  workout   — open from the first set until "Complete workout"
     level 1  body part — open while any of its exercises are open
     level 2  exercise  — open from its first set until "Complete <exercise>"
   Logging a new set to anything completed reopens it (and its parents). */
function dayMeta(){const t=day(todayISO);t.doneEx=t.doneEx||[];t.donePart=t.donePart||[];t.sugX=t.sugX||{};return t;}
const isLive =()=>{const t=day(todayISO);return t.w.length>0&&!t.doneAll;};
/* v3.2.3: evening + unwritten today + living streak = at risk. One warm tone,
   five words, no guilt copy, and it never calls today rest. */
let RISK_HOUR=18;
const streakAtRisk=()=>{
  if(((DB.days[todayISO]||{}).w||[]).length) return false;
  if(new Date().getHours()<RISK_HOUR) return false;
  return currentStreak()>0;
};
const exOpen =ex=>{const t=dayMeta();return t.w.some(s=>s.ex===ex)&&!t.doneEx.includes(ex);};
const partOpen=p =>{const t=dayMeta();return t.w.some(s=>s.part===p)&&!t.donePart.includes(p);};
let lastSetAt=null;
function reanchorRest(){
  const t=day(todayISO); t.upd=Date.now();
  const times=t.w.map(s=>s.at||0).filter(Boolean);
  lastSetAt=times.length?Math.max(...times):null;
  t.lastAt=lastSetAt;
  tickRest();
}
const touchToday=()=>{ const t=day(todayISO); t.upd=Date.now(); };
function reopen(ex,part){
  const t=dayMeta(); t.upd=Date.now();
  t.doneEx=t.doneEx.filter(x=>x!==ex);
  t.donePart=t.donePart.filter(x=>x!==part);
  t.doneAll=false;
  lastSetAt=Date.now(); t.lastAt=lastSetAt;
}
const isBody=ex=>equipOf(ex)==='body';
const snapW=kg=>{const s=STEP();const u=toU(kg);return toKg(Math.round(u/s)*s);}   // clean stepper multiples
function saveExW(ex,kg){ if(!ex) return; DB.settings.exW=DB.settings.exW||{}; DB.settings.exW[ex]=kg; }
const wLabel=(ex,kg)=>isBody(ex)&&kg<=0.01?'BW':`${wDisp(kg)}`;   // free-weight moves read as bodyweight
const PLATES_KG=[25,20,15,10,5,2.5,1.25];
const PLATES_LB=[45,35,25,10,5,2.5];
/* greedy plate breakdown for ONE side */
function plates(perSideKg){
  const unit=isLb()?PLATES_LB:PLATES_KG;
  let left=isLb()?perSideKg*LB:perSideKg;
  const out=[];
  for(const p of unit){
    while(left>=p-0.01){ out.push(p); left-=p; if(out.length>8) return out; }
  }
  return out;
}
/* one human-readable line: what's actually on the bar */
function loadLine(ex,totalKg){
  if(!usesPlates(ex)) {
    const e=equipOf(ex);
    if(e==='dumbbell') return `${wDisp(totalKg)} ${U()} per hand`;
    if(e==='body')     return totalKg>0&&Math.abs(totalKg-(DB.settings.bodyKg||-1))<0.01 ? `your bodyweight · ${wDisp(totalKg)} ${U()}`
                       : totalKg>0 ? `bodyweight + ${wDisp(totalKg)} ${U()}` : 'bodyweight — set yours in ⚙ Settings';
    return '';
  }
  const bar=barKg(ex);
  const perSide=(totalKg-bar)/2;
  if(perSide<=0.01) return `empty bar · ${wDisp(bar)} ${U()}`;
  return `${wDisp(bar)} ${U()} bar<br>${wDisp(perSide)} ${U()} per side`;
}

/* every workout DATE ever: seed history + anything logged in the app */
function workoutDates(){
  const s=new Set(SEED.dates);
  for(const [d,v] of Object.entries(DB.days)) if(v.w&&v.w.length) s.add(d);
  return s;
}
/* recent sessions with full detail (seed last 120d + user) */
function allDays(){
  // v3.0.3: SEED.sessions is DERIVED FROM DB.days since v3.0 — concatenating the
  // two rendered every historical set twice in History. DB.days is the source of
  // truth: it REPLACES. (SEED.sessions still fills any derived-only edge, and
  // today comes from DB.days as always.)
  const out={};
  for(const [d,list] of Object.entries(SEED.sessions))
    out[d]=list.map(([part,ex,w,reps,mins,secs])=>({part,ex,w,reps,mins,secs}));
  for(const [d,v] of Object.entries(DB.days))
    if(v.w&&v.w.length) out[d]=v.w;
  return out;
}
function lastFor(ex){
  const mine=Object.entries(DB.days).filter(([d,v])=>v.w.some(s=>s.ex===ex)).sort((a,b)=>a[0]<b[0]?1:-1)[0];
  const seed=SEED.last[ex];
  if(mine&&(!seed||mine[0]>seed.d))
    return {d:mine[0],sets:mine[1].w.filter(s=>s.ex===ex).map(s=>[s.w,s.reps,s.mins,s.secs])};
  return seed||null;
}
function prFor(ex){
  const p=SEED.pr[ex]?{...SEED.pr[ex]}:{mw:0,mwr:0,mwd:'',bv:0,bvr:0,bvw:0,bvd:''};
  for(const [d,v] of Object.entries(DB.days))
    for(const s of v.w){
      if(s.ex!==ex||!s.reps.length) continue;
      const mr=Math.max(...s.reps);
      if(s.w>p.mw||(s.w===p.mw&&mr>p.mwr)){p.mw=s.w;p.mwr=mr;p.mwd=d;}
      for(const r of s.reps)                       // best single set: weight × reps, one set
        if(s.w*r>p.bv){p.bv=s.w*r;p.bvr=r;p.bvw=s.w;p.bvd=d;}
    }
  return p;
}
function partLastSeen(){
  const seen={...SEED.partLast};
  for(const [d,v] of Object.entries(DB.days))
    for(const s of v.w)
      if(s.part&&(!seen[s.part]||d>seen[s.part])) seen[s.part]=d;
  return seen;
}
/* day -> Set(parts), last 365d, seed + logged */
function dayParts(){
  const m={};
  for(const [p,list] of Object.entries(SEED.partDays||{}))
    for(const d of list) (m[d]=m[d]||new Set()).add(p);
  for(const [d,v] of Object.entries(DB.days))
    for(const s of v.w) if(s.part) (m[d]=m[d]||new Set()).add(s.part);
  return m;
}
function median(a){ if(!a.length) return 0; const s=[...a].sort((x,y)=>x-y); const i=s.length>>1;
  return s.length%2 ? s[i] : (s[i-1]+s[i])/2; }

/* What to train next, learned from history:
   - a part counts as "live" only if trained >=8 times in the last year
   - readiness = days since / your own median gap for that part
   - a part you almost always train alone is a MAIN day; one you only ever
     tack on to another part (Biceps) is an ADD-ON
   - Run is its own thing (near-daily), never the headline pick            */
function trainingPlan(){
  const dp=dayParts();
  const byPart={};
  for(const [d,set] of Object.entries(dp))
    for(const p of set) (byPart[p]=byPart[p]||[]).push(d);

  const info={};
  for(const [p,days] of Object.entries(byPart)){
    days.sort();
    const gaps=[];
    for(let i=1;i<days.length;i++) gaps.push(daysBetween(days[i-1],days[i]));
    const lifts = days.filter(d=>{
      const others=[...dp[d]].filter(x=>x!=='Run'&&x!==p);
      return others.length===0;
    }).length;
    const liftDays = days.filter(d=>p!=='Run').length || days.length;
    info[p]={
      days:days.length,
      last:days[days.length-1],
      since:daysAgo(days[days.length-1]),
      gap:Math.max(1,median(gaps)||7),
      soloRate: p==='Run' ? 1 : lifts/liftDays,
      live: days.length>=8
    };
  }
  const myp=DB.settings.myParts;
  const allow=p=>!myp||myp.includes(p)||!!(byPart[p]&&byPart[p].length);   // onboarding pick; history always wins
  for(const p of Object.keys(SEED.catalog))
    if(allow(p)&&!info[p]) info[p]={days:0,last:SEED.partLast[p]||null,since:SEED.partLast[p]?daysAgo(SEED.partLast[p]):999,gap:7,soloRate:0,live:false};

  const score=p=>info[p].since/info[p].gap;
  const live=Object.keys(info).filter(p=>info[p].live&&p!=='Run');
  const mains=live.filter(p=>info[p].soloRate>=0.4).sort((a,b)=>score(b)-score(a));
  const addons=live.filter(p=>info[p].soloRate<0.4).sort((a,b)=>score(b)-score(a));
  const dormant=Object.keys(SEED.catalog).filter(p=>p!=='Run'&&info[p]&&!info[p].live);

  const pick=mains[0]||null;
  // an add-on is worth suggesting only if it's overdue on its own cycle
  const addon=addons.find(p=>score(p)>=1)||null;
  const run=info['Run']||null;
  return {info,score,mains,addons,dormant,pick,addon,run};
}
function streakFrom(dates, endISO){
  let n=0, d=new Date(endISO+'T00:00');
  while(dates.has(d.toLocaleDateString('en-CA'))){n++;d.setDate(d.getDate()-1);}
  return n;
}
function currentStreak(){
  const dates=workoutDates();
  const t=streakFrom(dates,todayISO);
  if(t) return t;
  const y=new Date(todayISO+'T00:00');y.setDate(y.getDate()-1);
  return streakFrom(dates,y.toLocaleDateString('en-CA'));   // today just hasn't happened yet
}
function longestStreak(){
  const arr=[...workoutDates()].sort();
  let best=0,run=0,prev=null;
  for(const d of arr){
    run=(prev&&daysBetween(prev,d)===1)?run+1:1;
    if(run>best)best=run; prev=d;
  }
  return best;
}
function wd2(iso){ return new Date(iso+'T00:00').toLocaleDateString('en-US',{weekday:'short'}); }
function daysBetween(a,b){return Math.round((new Date(b+'T00:00')-new Date(a+'T00:00'))/864e5);}

/* year-over-year cumulative consistency: workout days so far / days elapsed  (the Dashboard bottom chart) */
function yearCurves(){
  const dates=workoutDates();
  const perYear={};
  for(const iso of dates){const y=iso.slice(0,4);(perYear[y]=perYear[y]||[]).push(doy(iso));}
  const out={};
  for(const [y,list] of Object.entries(perYear)){
    list.sort((a,b)=>a-b);
    const end = y===thisYear ? doy(todayISO) : ((+y%4===0)?366:365);
    const curve=new Float32Array(end); let c=0,i=0;
    for(let d=1;d<=end;d++){
      while(i<list.length&&list[i]<=d){c++;i++;}
      curve[d-1]=c/d;
    }
    out[y]={curve,days:list.length,end};
  }
  return out;
}

/* v3.1.12: the red header IS the session — tapping it jumps to the active
   exercise (the most recent set today whose part is still open). Taps on
   buttons inside the header (back, gear, demo bar) are left alone. */
function activeFocus(){
  const t=day(todayISO);
  if(!t.w.length) return null;
  const open=[...t.w].sort((a,b)=>(b.at||0)-(a.at||0))
    .find(s=>s.part!=='Run'&&s.part&&!(t.donePart||[]).includes(s.part));
  return open?{ex:open.ex,part:open.part}:null;
}
document.addEventListener('click',e=>{
  const hd=e.target.closest('header');
  if(!hd||!hd.classList.contains('live')) return;
  if(e.target.closest('button,a,#demoBar,input')) return;
  const f=activeFocus();
  if(!f) return;
  if(view==='lift'&&lift.ex===f.ex) return;      // already there
  view='lift'; lift.part=f.part; lift.ex=f.ex; lift.copy=null;
  render();
});
