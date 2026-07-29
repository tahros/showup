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
  /* v3.3.140: modals mounted on <body>, OUTSIDE #app. This gesture listens
     globally, so a swipe inside an open overlay was tracked here in parallel
     with the overlay's own handler — the share image rotated AND the page
     changed tab underneath it. Each is position:fixed;inset:0, so while one
     is open every touch lands inside it and closest() catches the lot,
     including drags starting on its buttons. Nothing inside a modal should
     ever move the page beneath it. */
  const MODALS='#repOv,#onb,#msOv,#portraitveil';
  const blocked=t=>t.closest('[data-zoom]')||t.closest('.zone.mini .lastsets')||
                   t.closest('.heat')||t.closest('.heatcols')||   // the rail scrolls too
                   t.closest('input')||t.closest('.settile')||
                   t.closest('.ychips')||      // v3.3.39: History's year strip scrolls sideways
                   t.closest('.pmixwrap')||   // v3.3.116: part mix scrolls sideways
                   t.closest('#repCard')||    // v3.3.139: the card carousel owns its own left/right
                   t.closest(MODALS)||        // v3.3.140: and nothing under a modal moves
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
  /* v3.3.19: the resting hide offset must clear the Dynamic Island. The old
     flat -58px predates notched safe-areas: with ~59px of inset, "hidden"
     landed ~7px from the top edge — a white circle parked behind the island,
     Sungjee's mystery blob. Hide by the element's own height + inset. */
  const satEl=getComputedStyle(document.documentElement).getPropertyValue('--sat');
  const SAT=parseFloat(satEl)||0;
  const HIDE=-(58+SAT);
  let y0=null, pulling=false, dist=0, fired=false;
  addEventListener('touchstart',e=>{
    if(fired) return;
    if(scrollY>0){y0=null;return;}
    // v3.3.140: same hole as the tab-swipe had — dragging DOWN on an open
    // overlay would pull-to-refresh the page behind it
    if(e.target.closest('[data-zoom]')||e.target.closest('#repOv,#onb,#msOv,#portraitveil')){y0=null;return;}
    y0=e.touches[0].clientY; pulling=false; dist=0;
  },{passive:true});
  addEventListener('touchmove',e=>{
    if(y0===null||fired) return;
    const dy=e.touches[0].clientY-y0;
    if(!pulling){ if(dy>8&&scrollY<=0) pulling=true; else if(dy<0){y0=null;return;} else return; }
    e.preventDefault();
    dist=Math.max(0,dy)*DRAG;
    el.style.transition='none';
    el.style.transform=`translateY(${Math.min(dist,110)+HIDE}px)`;
    el.classList.toggle('arm',dist>=THRESH);
    // the page itself follows the finger — that's the feedback a tiny arrow can't give
    document.body.classList.add('pulling');
    document.body.classList.remove('settling');
    document.body.style.transform=`translateY(${Math.min(dist,110).toFixed(1)}px)`;
  },{passive:false});
  const settle=()=>{
    el.style.transition='transform .25s cubic-bezier(.2,.8,.25,1)';
    el.style.transform=`translateY(${HIDE}px)`;
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

/* ---------- bodyweight as a dated series (v3.3.66) ----------
   A weigh-in is an EVENT on a day, not a setting. Entering a weight means "it
   changed today"; entering nothing means "unchanged". So the series is sparse
   and read by carry-forward. Days already sync per-day (newest wins), already
   back up and already restore — bodyweight rides along for free, and there is
   no second structure to drift out of step with the first.

   Why this replaces a scalar: DB.settings.bodyKg had no history, so a Pull Up
   logged in 2024 was valued at TODAY's bodyweight. bwAt() values it at the
   weight in force on the day it happened.

   bodyKg SURVIVES as the derived CURRENT value so every existing consumer
   (lift.js:326, loadLine) keeps working untouched.

   A weigh-in day carrying no sets stays invisible to deriveAll(), which skips
   days with no rows — recording weight can never inflate the day count. */
function bwDays(){ return Object.keys(DB.days).filter(d=>DB.days[d].bw>0).sort(); }
function bwAt(iso){
  const ds=bwDays();
  if(!ds.length) return DB.settings.bodyKg||0;      // no series yet: fall back to the setting
  let hit=null;
  for(const d of ds){ if(d<=iso) hit=d; else break; }
  return DB.days[hit||ds[0]].bw;                    // before the first entry: the earliest known
}
const bwNow=()=>bwAt(todayISO);
const bwLast=()=>{ const ds=bwDays(); return ds.length?ds[ds.length-1]:null; };
/* record a change. kg<=0 clears the entry for that day. */
function setBw(iso,kg){
  const t=day(iso);
  if(kg>0) t.bw=+(+kg).toFixed(1); else delete t.bw;
  t.upd=Date.now();
  const cur=bwNow();
  DB.settings.bodyKg=cur>0?cur:null;                // keep the derived current value in step
}
/* user-entered text lands in innerHTML — escape it once, here. */
function hesc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const firstName=()=>hesc((DB.settings.name||'').trim().split(/\s+/)[0]||'');

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
/* v3.3.104: every log path says the same sentence. Confirmation belongs at
   the point of ACTION — a toast is visible wherever you are scrolled, which
   the Logged Today grid is not once a session runs long. One of the three
   log paths already toasted; the other two didn't, and none handled BW. */
function setToast(ex,w,r){
  toast(`${isBody(ex)&&w<=0.01?'BW':wDisp(w)+U()} × ${r} logged`);
}
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
/* v3.3.96: three preferences — 'system', 'light', 'dark' — resolving to two
   themes. Anything unrecognised still resolves dark, so a settings blob from
   an older build behaves exactly as it did.

   Two things must stay true and are easy to break:
   • localStorage 'showup-theme' holds the RESOLVED theme, never 'system'.
     index.html reads it before any script runs to paint the right background
     on the first frame; storing 'system' there would reintroduce the flash.
   • On 'system' the app follows the OS while OPEN. Resolving once at boot
     would leave the app in yesterday's theme when the phone flips at sunset,
     so a media-query listener is attached (once) and re-applies. */
function systemTheme(){
  try{ return matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'; }
  catch(e){ return 'dark'; }
}
let _themeWatched=false;
function applyTheme(){
  const pref=DB.settings.theme;
  const t = pref==='system' ? systemTheme() : (pref==='light'?'light':'dark');
  document.documentElement.dataset.theme=t;
  try{localStorage.setItem('showup-theme',t);}catch(e){}
  const m=document.querySelector('meta[name="theme-color"]');
  if(m) m.setAttribute('content', t==='light'?'#F2F3F6':'#0C0E13');
  if(!_themeWatched){
    _themeWatched=true;
    try{
      const mq=matchMedia('(prefers-color-scheme: light)');
      const on=()=>{ if(DB.settings.theme==='system') applyTheme(); };
      if(mq.addEventListener) mq.addEventListener('change',on); else mq.addListener(on);
    }catch(e){}
  }
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
/* v3.3.39: the day's completion state, recomputed from scratch after ANY
   removal. This predicate has now been got wrong twice — v3.3.19 tested
   doneEx only (runs seal at part level), and v3.3.20 fixed two of the three
   removal paths but not data-dropex, so removing a whole exercise left the
   header red. One function, every caller, no fourth drift. */
function resealDay(t){
  if(!t.w.length){ t.doneAll=false; t.doneEx=[]; t.donePart=[]; return; }
  const live=new Set(t.w.map(s=>s.ex));
  t.doneEx=(t.doneEx||[]).filter(x=>live.has(x));          // drop seals for exercises that are gone
  const liveP=new Set(t.w.map(s=>s.part));
  t.donePart=(t.donePart||[]).filter(x=>liveP.has(x));
  t.doneAll=!t.w.some(s=>!(t.doneEx.includes(s.ex)||t.donePart.includes(s.part)));
}
/* v3.3.43: one formatter for "a session, grouped by weight". Lift's LAST TIME
   card and History's session detail now render through the same two functions,
   so the two can't drift the way the re-seal predicate did.
   Folding is CONSECUTIVE, not global: returning to a weight later in the
   session stays its own line, which keeps the session's narrative. */
function foldSets(sets,ex){
  /* v3.3.63: a LIFT with no reps carries nothing, whatever its weight. The
     old test also demanded w<=0.01, so a legacy "12 kg, reps:[]" marker
     survived and printed a bare weight row with no chips. Reps ARE the
     content of a lift; only a run is described by its distance and time, so
     Run is the sole exemption. */
  const isRunEx = ex==='Run';
  const folded=[];
  for(const [w2,reps,mins,secs] of sets){
    if(!isRunEx && (!reps||!reps.length) && mins==null) continue;   // bare marker rows carry nothing
    const prev=folded[folded.length-1];
    if(prev&&prev[0]===w2&&prev[2]==null&&mins==null) prev[1]=prev[1].concat(reps||[]);
    else folded.push([w2,(reps||[]).slice(),mins,secs]);
  }
  return folded;
}
function setRows(ex,folded,tappable){
  return folded.map(([w2,reps,mins,secs])=>{
    const chips=(reps&&reps.length)
      ? reps.map(r2=>`<i class="repchip">${r2}</i>`).join('')
      : (mins!=null?`<i class="repchip">${mins}${secs?`'${String(secs).padStart(2,'0')}`:'′'}</i>`:'');
    const wtxt = ex==='Run'
      ? `${dDisp(w2)} <span class="u">${DU()}</span>`
      : (isBody(ex)&&w2<=0.01 ? 'BW' : `${wDisp(w2)} <span class="u">${U()}</span>`);
    return `<div class="lastrow"${tappable?` data-lw="${w2}" role="button"`:''}>`
      +`<span class="lastw mono">${wtxt}</span><span class="lastreps">${chips}</span></div>`;
  }).join('');
}
/* v3.3.65: one floating "up" control for the whole app. It appears whenever
   you're deep enough in a view for the top to be a trek, and its LABEL always
   names where it will actually take you — "top" normally, or "calendar" while
   History has armed a jump-back after a date tap. One element, no ambiguity. */
let _backTo=null, _topRaf=0;
function topBtn(){
  let b=document.getElementById('calReturn');
  if(!b){
    b=document.createElement('button');
    b.id='calReturn'; b.className='calreturn'; b.hidden=true;
    b.addEventListener('click',()=>{
      const t=_backTo; clearBackTarget();
      const el=t&&t.getEl&&t.getEl();
      if(el&&el.scrollIntoView) el.scrollIntoView({block:'start',behavior:'smooth'});
      else window.scrollTo({top:0,behavior:'smooth'});
    });
    document.body.appendChild(b);
  }
  return b;
}
function syncTopBtn(){
  const b=topBtn();
  const deep=(window.scrollY||0)>520;
  b.hidden=!(deep||_backTo);         // an armed jump-back shows regardless of depth
  b.textContent=_backTo?`↑ ${_backTo.label}`:'↑ top';
}
function setBackTarget(label,getEl){ _backTo={label,getEl}; syncTopBtn(); }
function clearBackTarget(){ _backTo=null; syncTopBtn(); }
addEventListener('scroll',()=>{
  if(_topRaf) return;
  _topRaf=requestAnimationFrame(()=>{ _topRaf=0; syncTopBtn(); });
},{passive:true});
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
/* v3.3.8: ONE source of truth for what weights physically exist.
   Returns display-unit {s: step, a: anchor}. Barbell/smith: plate pairs
   anchored at the bar. Everything else: the plain step from zero. */
function wLaw(ex){
  const eq=equipOf(ex);
  if(eq==='barbell'||eq==='smith') return {s:isLb()?10:5, a:toU(barKg(ex))};
  return {s:STEP(), a:0};
}
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
    if(e==='body')     return totalKg>0&&Math.abs(totalKg-(bwNow()||-1))<0.01 ? `your bodyweight · ${wDisp(totalKg)} ${U()}`
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
/* v3.3.97: comebacks — the longevity twin of the streak. A streak measures
   never stopping; a practice that lasts years is made of RETURNING. Five
   agreed lines, each an assertion in test-comeback.js:
   (1) a comeback = training again after 7+ days away — fixed threshold,
       explainable in one tip; adaptive thresholds were rejected as
       unexplainable in 120 chars. A normal 5–6 day cadence yields ZERO.
   (2) declared rest days are invisible — a 🍃 interrupting a gap would be
       comeback insurance, the corruption the rest doctrine forbids.
       workoutDates() already contains only trained days, so this holds by
       construction; the test proves it anyway.
   (3) only CLOSED gaps count — the open gap you're in is not a comeback in
       progress, and rendering it would be a nudge in a costume.
   (4) every return counts, sticky or not — requiring returns to "last"
       would turn a count into a grade.
   (5) zero renders as nothing — handled at the render site. */
/* v3.3.98: the milestone ladder — celebrated TOTALS, never streaks. A total
   is irreversible, so celebrating it threatens nothing; streak milestones
   are where engagement bait lives (a celebrated thing that can die). Dense
   where a practice is fragile, then every 100 — roughly two a year at a
   most-days cadence (Sungjee: "500 is too big, man"). Thousands are a
   bigger tier: same ritual, taller volume.

   Anti-bait rules, each an assertion in test-milestone.js:
   • high-water floor at first run — no retroactive fireworks, and a
     restored/imported archive initialises its floor to its own total, so
     migration is honoured, never celebrated;
   • fires once per rung, acknowledgement synced in settings;
   • if several rungs are crossed at once (bulk past-edits), ONE moment for
     the largest — a queue of celebrations is a slot machine;
   • dismissal is one tap and permanent; ignoring a celebration costs
     nothing — that is the line between a gift and a hook. */
function msLadder(n){
  return n>=1000 ? n%100===0 : [10,20,30,50,100,200,300,500].includes(n);
}
function msTier(n){ return n>=1000 && n%1000===0 ? 'thousand' : 'regular'; }
function msPrevRung(n){
  let p=0;
  for(let k=10;k<n;k++) if(msLadder(k)) p=k;
  return p;
}
function msLiveTotal(){
  return SEED.totals.sessions + ((((DB.days[todayISO]||{}).w)||[]).length && !SEED.sessions[todayISO] ? 1 : 0);
}
function msFloorInit(){
  if(DB.settings.msFloor==null){ DB.settings.msFloor=msLiveTotal(); save(true); }
}
function msPending(){
  if(DB.settings.msFloor==null) return 0;
  const total=msLiveTotal(), ack=Math.max(DB.settings.msAck||0, DB.settings.msFloor);
  let best=0;
  for(let k=ack+1;k<=total;k++) if(msLadder(k)) best=k;   // largest crossed, one moment
  return best;
}
/* one dry line per neighbourhood — deterministic, never random, and bold by
   type not punctuation: the app's voice does not use exclamation marks even
   at full volume. */
function msLine(n){
  if(n>=1000&&n%1000===0) return fmt(n)+' days. The long game, kept.';
  if(n>=1000) return fmt(n)+' days of showing up.';
  return ({10:'Ten days. It\u2019s a thing now.',
           20:'Twenty days. The habit is winning.',
           30:'A month of days. Most quit here \u2014 you didn\u2019t.',
           50:'Fifty days. This is who you are now.',
           100:'A hundred days of showing up.',
           200:'Two hundred. The couch lost.',
           300:'Three hundred days. Quietly relentless.',
           500:'Five hundred days. Half the mountain.'})[n]||fmt(n)+' days of showing up.';
}
/* v3.3.114: each chart's data becomes a function so the on-screen SVG and
   the share card read the SAME numbers. Previously these were computed
   inline inside the render functions, which meant a card could only be
   added by duplicating the arithmetic — the drift this codebase keeps
   paying down (resealDay, foldSets, gridData, elapsedDays, runYearCurves). */
/* v3.3.117: VOLUME per part per training day, newest last — the maker's
   original intent, and what the spreadsheet this came from plotted.
   Run is excluded from the stack: its `w` field holds kilometres, and
   kilometres do not sum with kilograms. The spreadsheet drew Run as a
   separate LINE for exactly that reason. */
const PART_COLORS={Chest:'var(--p-chest)',Back:'var(--p-back)',Shoulder:'var(--p-shoulder)',
  Legs:'var(--p-legs)',Biceps:'var(--p-biceps)',Triceps:'var(--p-triceps)',
  Sixpack:'var(--p-sixpack)',Run:'var(--p-run)'};
function partMix(days){
  const out=[], iso=[...workoutDates()].sort();
  const take=iso.slice(-Math.max(1,days));
  for(const d of take){
    const w=(DB.days[d]||{}).w||(SEED.sessions[d]||[]);
    const by={};
    for(const s of w){
      const p=s.part||'—';
      if(p==='Run'||s.ex==='Run') continue;            // km don't sum with kg
      /* v3.3.124: volOf(), not a private formula. A stored entry may hold a
         REPS ARRAY — Pull Up 70kg [12,10,10,8] is one entry worth four sets —
         and the old `reps[0]` counted only the first, reporting 840 where
         the day was 2,800. Every other surface in the app already called
         volOf(); this one reimplemented it and got it wrong. */
      const vol=volOf(s);
      if(vol>0) by[p]=(by[p]||0)+vol;
    }
    out.push({d, by, total:Object.values(by).reduce((a,b)=>a+b,0)});
  }
  return out;
}
function wdDist(){
  const dates=workoutDates(), c=[0,0,0,0,0,0,0], t=[0,0,0,0,0,0,0];
  for(let i=0;i<365;i++){
    const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-i);
    const w=d.getDay(); t[w]++;
    if(dates.has(d.toLocaleDateString('en-CA'))) c[w]++;
  }
  const pct=c.map((n,i)=>t[i]?n/t[i]:0);
  return {pct, best:pct.indexOf(Math.max(...pct)), today:new Date(todayISO+'T00:00').getDay()};
}
function weekSeries(){
  const days=runDays(), by={};
  for(const r of days) by[weekOf(r.d)]=(by[weekOf(r.d)]||0)+toD(r.km);
  const thisWk=weekOf(todayISO);
  const wks=Object.keys(by).sort().slice(-16);
  if(!wks.includes(thisWk)) wks.push(thisWk);
  const avg=wks.filter(w=>w!==thisWk).reduce((a,w)=>a+(by[w]||0),0)/Math.max(1,wks.length-1);
  return {wks, by, avg, thisWk};
}
function paceSeries(){
  const days=runDays(), pm={};
  for(const r of days){ if(r.timed<=0) continue;
    const k=r.d.slice(0,7); const e=pm[k]||(pm[k]={sec:0,d:0}); e.sec+=r.sec; e.d+=toD(r.timed); }
  return Object.entries(pm).sort().slice(-12).map(([k,v])=>[k, v.d? v.sec/v.d : 0]);
}
function heatSeries(){
  const dates=workoutDates(), out=[];
  const end=new Date(todayISO+'T00:00');
  end.setDate(end.getDate()-end.getDay()+6);          // through the current week's Saturday
  for(let w=25;w>=0;w--){
    const col=[];
    for(let d=0;d<7;d++){
      const c=new Date(end); c.setDate(c.getDate()-(w*7)+(d-6));
      const iso=c.toLocaleDateString('en-CA');
      col.push({iso, on:dates.has(iso), fut:iso>todayISO});
    }
    out.push(col);
  }
  return out;
}
function comebacks(){
  const arr=[...workoutDates()].sort();
  let n=0, longest=0;
  for(let i=1;i<arr.length;i++){
    const gap=daysBetween(arr[i-1],arr[i])-1;   // days AWAY between two trained days
    if(gap>=7){ n++; if(gap>longest) longest=gap; }
  }
  return {n, longest};
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

/* v3.3.89: cumulative distance by day of year, in DISPLAY units — the same
   shape yearCurves() returns, so one canvas renderer serves both charts.
   Shared by the SVG in runStatsHTML() and the share card. */
function runYearCurves(){
  const days=runDays(), per={};
  for(const r of days){ const y=r.d.slice(0,4); (per[y]=per[y]||[]).push([doy(r.d),toD(r.km)]); }
  const out={};
  for(const [y,list] of Object.entries(per)){
    list.sort((a,b)=>a[0]-b[0]);
    const end = y===thisYear ? doy(todayISO) : ((+y%4===0)?366:365);
    const curve=new Float32Array(end); let c=0,i=0;
    for(let d=1;d<=end;d++){
      while(i<list.length&&list[i][0]<=d){ c+=list[i][1]; i++; }
      curve[d-1]=c;
    }
    out[y]={curve,end,total:c};
  }
  return out;
}

/* year-over-year cumulative consistency: workout days so far / days elapsed  (the Dashboard bottom chart) */
/* v3.3.95: how much of this year has counted so far. An unwritten today does
   not count against you — you have not missed it until midnight. That rule
   lived in header.js and stats.js and yearCurves() had never heard of it, so
   the KPI divided by 206 while the chart divided by 207 and the same fact
   rendered as 62% and 61% on one screen. Now there is one function and the
   two numbers are the SAME arithmetic, not merely agreeing arithmetic. */
function elapsedDays(){
  return Math.max(1, doy(todayISO) - (((DB.days[todayISO]||{}).w||[]).length ? 0 : 1));
}
function yearCurves(){
  const dates=workoutDates();
  const perYear={};
  for(const iso of dates){const y=iso.slice(0,4);(perYear[y]=perYear[y]||[]).push(doy(iso));}
  const out={};
  for(const [y,list] of Object.entries(perYear)){
    list.sort((a,b)=>a-b);
    const end = y===thisYear ? elapsedDays() : ((+y%4===0)?366:365);
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
