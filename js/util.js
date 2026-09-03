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
      pageShift(`translateY(${(-band).toFixed(1)}px)`);
    }else if(active){
      release();
    }
  },{passive:true});
  const release=()=>{
    if(!active) return;
    active=false; band=0;
    document.body.classList.remove('banding');
    document.body.classList.add('bandback');
    pageShift('');
    setTimeout(()=>document.body.classList.remove('bandback'),450);
  };
  ['touchend','touchcancel'].forEach(ev=>addEventListener(ev,()=>{release();y0=null;},{passive:true}));
})();

/* ---------- swipe between tabs: REMOVED in v3.3.356 ----------
   The gesture moved along the nav, and it carried FOURTEEN opt-outs -- every
   one added after it had already broken something, stamped from v3.3.39
   through v3.3.307: the year strip, the part mix and its legend, the card
   carousel, the live bars, the pace scrubber, the compare chart, the heatmap
   and its rail, modals, inputs, set tiles, zoomable charts, and the rep
   ruler.
   The failure mode is what condemned it. A new horizontally scrolling
   control works perfectly until someone swipes it, and then it steals the
   tab -- silently, and only found by feel. The rep ruler shipped in
   v3.3.286 and did not get its opt-out until v3.3.288, so for two releases
   scrubbing reps mid-set could throw you off the Train tab one-handed.
   That is a permanent tax on every horizontal control this app will ever
   add, and it bought nothing: the nav bar reaches all four destinations in
   one tap, is always visible, and sits under the thumb. A second path to
   the same four places is not a feature.
   The blocklist is DELETED rather than left dormant, because a dead rule
   gets quoted back as a live one (v3.3.252). Nothing else rode on this
   handler; it also removes one of the three consumers of liftBack(), so the
   tab-memory rule now has two paths to stay consistent across instead of
   three. */

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
    if(e.target.closest('[data-zoom]')||e.target.closest('#repOv,#onb,#msOv,#portraitveil,#dayDone')){y0=null;return;}
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
    pageShift(`translateY(${Math.min(dist,110).toFixed(1)}px)`);
  },{passive:false});
  const settle=()=>{
    el.style.transition='transform .25s cubic-bezier(.2,.8,.25,1)';
    el.style.transform=`translateY(${HIDE}px)`;
    el.classList.remove('arm');
    document.body.classList.remove('pulling');
    document.body.classList.add('settling');
    pageShift('');
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
    pageShift('translateY(52px)');   // hold, briefly, while it works
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
/* v3.3.165: listings respect the per-user home. An exercise overridden AWAY
   from its catalog part leaves that list; one overridden INTO a part joins
   it — so Deadlift-on-Legs appears under Legs and only Legs. */
const catFor=part=>[
  ...SEED.catalog[part].filter(ex=>!(DB.settings.partOv&&DB.settings.partOv[ex]&&DB.settings.partOv[ex]!==part)),
  ...Object.entries(customs()).filter(([,c])=>c.part===part).map(([n])=>n),
  ...Object.entries(DB.settings.partOv||{}).filter(([ex,p])=>p===part&&SEED0.ex2part[ex]!==part).map(([ex])=>ex)];
/* v3.3.284: your gym outranks the catalog. Four equipment reports in a week
   (dumbbell lb, cable lb, calf raises, this) all had the same shape: a
   built-in exercise whose real-world hardware differs from the shipped
   guess, and each needed a release to fix. equipOv is the same mechanism
   partOv already provides for body part — a per-exercise override stored in
   settings, checked ahead of the catalog. The W_TABLE still owns the LAW
   (what each class steps); this only decides which class an exercise is. */
const equipOv=()=>DB.settings.equipOv||(DB.settings.equipOv={});
const equipOf=ex=>equipOv()[ex] || customs()[ex]?.equip || SEED.equip[ex] || 'machine';
const EQUIP_LABEL={barbell:'Barbell (bar + plates)',smith:'Smith machine',dumbbell:'Dumbbell (per hand)',
  cable:'Cable',machine:'Machine (stack)',plate:'Machine (plate-loaded)',body:'Bodyweight'};

/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
/* v3.3.104: every log path says the same sentence. Confirmation belongs at
   the point of ACTION — a toast is visible wherever you are scrolled, which
   the Logged Today grid is not once a session runs long. One of the three
   log paths already toasted; the other two didn't, and none handled BW. */
/* v3.3.372: THE FIRST SET EVER IS THE MOMENT. On every other day the
   ceremony belongs to "I am finished" -- the day-end button (v3.3.369,
   v3.3.371). On day one there is nothing to finish yet, and the first set IS
   the achievement: it is the instant an empty grid becomes a streak of one,
   and for a stranger arriving from a link it is the only place the product
   explains itself without words.
   Hooked HERE because all three set-add paths already funnel through this
   tail -- the same one-owner rule the day-end button got, applied before the
   drift rather than after it. celebrateDayDone() stamps the day, so
   completing the workout later stays quiet: one ceremony per day, always. */
function setToast(ex,w,r){
  const first=SEED.totals.sessions===0 && ((DB.days[todayISO]||{}).w||[]).length===1;
  if(first && typeof celebrateDayDone==='function'){ celebrateDayDone(); return; }
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
  /* Design-review links may pin a theme without mutating the user's saved
     preference. The override is URL-only and disappears with the preview. */
  let previewTheme='';
  try{ previewTheme=new URLSearchParams(location.search).get('theme')||''; }catch(e){}
  const t = /^(light|dark)$/.test(previewTheme)
    ? previewTheme
    : (pref==='system' ? systemTheme() : (pref==='light'?'light':'dark'));
  document.documentElement.dataset.theme=t;
  /* v3.3.168: the SKIN rides the same rail as the theme — one applier, one
     pre-paint read, one storage slot each. Two values: 'minimal' (default)
     and 'classic'. Absence and anything unrecognised resolve MINIMAL, so
     every existing device wakes up in Minimal and Classic is the opt-out —
     the same resolution shape as the theme's unrecognised→dark. Stored
     RESOLVED for the same reason as the theme: index.html paints both
     attributes before any script runs, and a value that needs resolving
     would reintroduce the first-frame flash. */
  const sk = DB.settings.skin==='classic' ? 'classic' : 'minimal';
  document.documentElement.dataset.skin=sk;
  try{localStorage.setItem('showup-theme',t);localStorage.setItem('showup-skin',sk);}catch(e){}
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
/* v3.3.355: dDisp CONVERTS. Its argument is stored km, never a display value.
   runStatsHTML217 had already applied toD() to build its month figures and
   then passed the results through dDisp, converting a second time -- so the
   hero read 27.93 mi while the goal bar beneath it, computed from the same
   variable WITHOUT the second conversion, read 90% of 50 and "5.0 mi to go".
   One card, two answers, from one variable. dNum is the formatter for a
   number that is already in display units, so the two cases stop sharing a
   name. */
const dNum=v=>(Math.round(v*100)/100).toFixed(2);
const toU=kg=>isLb()?kg*LB:kg;                       // kg -> display
const toKg=v=>isLb()?v/LB:v;                         // display -> kg
const wDisp=kg=>{const v=toU(kg);return (Math.round(v*10)/10).toString().replace(/\.0$/,'');};
const vDisp=kg=>fmt(Math.round(toU(kg)));            // volume
/* v3.3.219: EVEN steps in both units (maker's call). Dumbbells and machines
   move 2 at a time — 12, 14, 16 — and a fractional value left by a unit
   conversion (23.5 kg from lb) snaps to the next even number in the pressed
   direction rather than marching on at x.5 forever; the wLaw click handler's
   floor/ceil arithmetic does that snapping already, it just needed an even
   step to snap TO. Barbell and smith are deliberately NOT even-stepped: their
   law is plate PAIRS on a bar (5 kg / 10 lb totals), the loadline renders
   that exact breakdown, and a 22 kg barbell would demand 1 kg plates the
   plate model does not carry. */
/* v3.3.256: the global unit-free step constant is gone (buildcheck bans it
   by name). It was a bare number in a domain where every number is a
   physical fact of ONE unit system — it caused the lb dumbbell bug (bells
   rack in 5 lb, not 2) the same way unit-free thinking caused the dead lb
   minus button. All steps now live in W_TABLE below. */

/* --- bar + plate math ---------------------------------------------------
   Weights are stored as the TOTAL on the movement (bar included), matching
   how the sheet was kept. Bar weights are editable in Settings.          */
/* v3.3.413: the FACTORY bar. core.js seeds every account with barKg:20 and
   smithKg:20, so a stored 20 is not a choice, it is the constant every user
   carries from day one -- and in lb it means 44.09, which put every barbell
   grid point 0.91 lb off every real plate combination. In lb the factory
   value reads as 45 (a bar you have SET yourself is any other number; the
   settings screen writes in display units, so an lb user who typed 45 has
   20.41 stored, not 20). In kg, 20 is simply the bar. */
const barDefaultKg=()=>isLb()?45/LB:20;
const barSetting=key=>{
  const v=DB.settings[key];
  if(v==null||(isLb()&&Math.abs(v-20)<0.01)) return barDefaultKg();
  return v;
};
const barKg=ex=>{
  const per=(DB.settings.barByEx||{})[ex];      // per-exercise override, once you set it
  if(per!=null) return per;
  const e=equipOf(ex);
  /* v3.3.413: THE DEFAULT BAR FOLLOWS THE UNIT. It was 20 kg in both, which
     is 44.09 lb -- so in lb every barbell grid point sat 0.91 lb off every
     real plate combination (45+5n), and snapW turned 210 into 214.09. A gym
     that weighs in pounds racks a 45 lb bar; one that weighs in kilos racks a
     20 kg bar. A bar you have SET yourself still wins. */
  if(e==='barbell') return barSetting('barKg');
  if(e==='smith')   return barSetting('smithKg');
  return 0;
};
const usesPlates=ex=>['barbell','smith'].includes(equipOf(ex));
const agoStr=d=>{const n=daysAgo(d);return n<=0?'today':n===1?'yesterday':`${n} days ago`;};
/* v3.3.329: how long since, in ONE grammar. Days stop being useful somewhere
   around a month -- "1464d ago" is a number you have to divide before it
   means anything -- so the unit coarsens as the gap grows: days under 30,
   months under a year, years beyond. Floor, never round: the label may
   understate the gap but must never overstate it, which is the same law
   daysAgo already follows.
   The space is the app's unit-faint grammar, the one v3.3.302 put into
   "165.3 lb": the eye parses "20" and "d" as a number and its unit. Without
   it "20d" reads as a single token and the digits stop aligning down a
   column of mono.
   ONE function because the Train tab shows both spellings at once -- the
   body-part chips above and the exercise rows below. Two formatters meant
   "4d ago" on a chip and "4 d ago" on the row six pixels beneath it. */
function agoLabel(n){
  if(n<=0)   return 'today';
  if(n===1)  return 'yesterday';
  if(n<30)   return `${n} d ago`;
  if(n<365)  return `${Math.floor(n/30)} mo ago`;
  return `${Math.floor(n/365)} y ago`;
}

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
/* v3.3.341 SLICE 1 of the timed-set work: the UNIT EXISTS AND RENDERS.
   Nothing writes it yet -- that is deliberate. This release adds the field,
   the formatter and every read path, so the writer that follows changes one
   place instead of hunting fifteen.

   THE SHAPE. A set record may carry su:'s'. The number itself stays in
   `reps`, which is the whole reason this is affordable: reps.length remains
   the set count, so the FIFTY places that count sets -- the header's "19
   sets", Stats, muscle coverage, the part rollups -- need no change at all
   and cannot be broken by this. A hold is two sets the way a press is two
   sets; the 60 seconds is the load, exactly as 145 lb is. That is
   "days > volume" deciding the storage question, not convenience.
   Absent su means reps, so every record ever written stays valid and there
   is no migration.

   WHAT THIS RELEASE DOES NOT DO. Nothing reads the VALUE as a rep count yet
   -- repFreq, the rep ruler's ceiling, rep-range analysis and PR's
   reps-at-max-weight would all read 60 as sixty reps. Those exclusions are
   slice 3 and they are listed here so the gap is a known one rather than a
   discovered one. Until a writer exists, no record can carry su, so the gap
   is unreachable in practice today. */
const SET_SEC='s';
const isHold=su=>su===SET_SEC;
/* 45 -> 45", 60 -> 1', 90 -> 1'30". Minutes only once there are whole ones,
   so a plank reads in the unit it was held in. */
function secLabel(n){
  const v=Math.max(0,Math.round(+n||0));
  if(v<60) return `${v}\u2033`;
  const m=Math.floor(v/60), s=v%60;
  return s ? `${m}\u2032${String(s).padStart(2,'0')}\u2033` : `${m}\u2032`;
}
/* the one place that turns a stored number into a set's label */
const setNum=(n,su)=>isHold(su)?secLabel(n):String(n);
/* SLICE 2: the unit is a PER-EXERCISE property, stored beside equipOv rather
   than on each set. A set records what it was, but the choice of unit belongs
   to the exercise -- a plank is held, every time, and asking again per set
   would be asking a question that has already been answered. Same shape as
   the equipment override, so rename carries it (core.js) for free. */
const unitOv=()=>(DB.settings.unitOv=DB.settings.unitOv||{});
const unitOf=ex=>unitOv()[ex]===SET_SEC?SET_SEC:undefined;
/* only bodyweight lifts may be timed. A hold under load is a real thing but
   it is not what this control is for, and putting a rep/sec switch on Bench
   Press would be noise on every screen that has never needed it. */
const canHold=ex=>ex!=='Run'&&isBody(ex);
function foldSets(sets,ex){
  /* v3.3.63: a LIFT with no reps carries nothing, whatever its weight. The
     old test also demanded w<=0.01, so a legacy "12 kg, reps:[]" marker
     survived and printed a bare weight row with no chips. Reps ARE the
     content of a lift; only a run is described by its distance and time, so
     Run is the sole exemption. */
  const isRunEx = ex==='Run';
  const folded=[];
  for(const [w2,reps,mins,secs,su] of sets){
    if(!isRunEx && (!reps||!reps.length) && mins==null) continue;   // bare marker rows carry nothing
    const prev=folded[folded.length-1];
    /* v3.3.341: folding also requires the same UNIT. Two sets at the same
       weight are one line only if they mean the same thing -- 10 reps and a
       10-second hold are not two of anything. */
    if(prev&&prev[0]===w2&&prev[2]==null&&mins==null&&prev[4]===su) prev[1]=prev[1].concat(reps||[]);
    else folded.push([w2,(reps||[]).slice(),mins,secs,su]);
  }
  return folded;
}
function setRows(ex,folded,tappable){
  return folded.map(([w2,reps,mins,secs,su])=>{
    const chips=(reps&&reps.length)
      ? reps.map(r2=>`<i class="repchip${isHold(su)?' hold':''}">${setNum(r2,su)}</i>`).join('')
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
/* v3.3.412: the day is CLOSED -- work logged and the day-end pressed. Named
   once so Today's body and the plan header ask the same question; the third
   header state (filled, still) already answers it visually. */
const dayClosed=()=>{const t=day(todayISO);return t.w.length>0&&!!t.doneAll;};
/* v3.3.347: the Train screen worth returning to, or null. One predicate, so
   the nav tab, the swipe and Today's live card cannot drift apart on when a
   memory counts -- a rule that holds on two paths out of three is worse than
   no rule. */
const liftBack =()=>(liftWhere&&liftWhere.d===todayISO)?liftWhere:null;
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
/* v3.3.256: THE WEIGHT TABLE — every equipment class states its physics in
   BOTH unit systems, because increments are facts about iron in a room, and
   the rooms differ by unit culture. A kg rack runs 8, 10, 12; a lb rack runs
   35, 40, 45. Neither number converts into the other — 2 kg is 4.4 lb, a
   bell no lb gym stocks — so every cell below is declared, never derived.

   One row per class, one reason per row:
     barbell/smith  plate PAIRS on a bar. 2.5 kg / 5 lb per side -> 5 kg or
                    10 lb totals, ANCHORED AT THE BAR (bar:1): you cannot
                    load one side only, and 0 does not exist on a barbell.
     cable          stack FACES. 5 kg — and 5 lb, not 10 (v3.3.262): lb
                    cable stacks come faced in 5s AND 10s, and 5 lands on
                    every face of both, while 10 skipped half the faces of
                    a 5-stack. The finer step can never name a weight that
                    does not exist on either. Selectorised MACHINES stay at
                    10 lb below — their stacks run 10s and 15s, where 5
                    would miss as often as it hits.
     machine        a selectorised stack, same faces as a cable.
     plate          a plate-loaded sled: pegs both ends, plates go on in
                    pairs — 5 kg / 10 lb — anchored at zero because the
                    sled's own weight is unknown and uncounted.
     dumbbell       RACK SPACING. kg racks step 2; lb racks step 5 (2.5 lb
                    in-between bells exist in some light ranges — a typed
                    value is always accepted; the stepper walks the rack).
     body           belt plates. 2 kg / 5 lb per added plate.

   Cable, machine and plate share numbers for three different physical
   reasons and stay separate rows anyway: a law that happens to agree today
   is not the same as one rule.

   THE GUARANTEE: every consumer — both steppers, both number inputs, the
   inferred-weight snapper, Today's suggestions — reads this table through
   wLaw/wStep/snapW, and buildcheck fails if any class in EQUIP_LABEL lacks
   a row here. Adding an equipment class without declaring its physics is a
   build error, not a latent bug. */
/* v3.3.414: the barbell step in lb is 10 -- a 5 on each side -- REVERSING
   v3.3.413's 5, on the maker's word. The 5 was reasoned from his ledger
   (200, 160 are not on a 10 grid from 45); he answered that the stepper
   should move in 10s regardless, and that a typed 200 is a typed 200. With
   the bar at 45 the faces are 195, 205, 215 -- so 205 is loadable and 200 is
   between faces, which is exactly what the writer's push needs to know. */
const W_TABLE={
  barbell:  {kg:{s:5,  bar:1}, lb:{s:10, bar:1}},
  smith:    {kg:{s:5,  bar:1}, lb:{s:10, bar:1}},
  cable:    {kg:{s:5},         lb:{s:5}},
  machine:  {kg:{s:5},         lb:{s:10}},
  plate:    {kg:{s:5},         lb:{s:10}},
  dumbbell: {kg:{s:2},         lb:{s:5}},
  body:     {kg:{s:2},         lb:{s:5}},
};
function wLaw(ex){
  const row=W_TABLE[equipOf(ex)]||W_TABLE.machine;   // unknown classes read as a stack, the safest guess
  const c=isLb()?row.lb:row.kg;
  return {s:c.s, a:c.bar?toU(barKg(ex)):0};
}
/* snap to the LAW (v3.3.250). Given an exercise it lands on a weight that
   exercise can actually make — a rack bell, a stack face, a buildable bar
   total. Without one it uses the stack row, matching wLaw's fallback. */
const snapW=(kg,ex)=>{
  const {s,a}=ex?wLaw(ex):{s:(isLb()?W_TABLE.machine.lb:W_TABLE.machine.kg).s,a:0};
  const u=toU(kg);
  return toKg(Math.max(a, a+Math.round((u-a)/s)*s));
};
/* the step for ONE exercise, in display units. Every stepper, every number
   input, the inferred-weight snapper and Today's next-weight suggestion read
   the law through here, so no two of them can disagree about what is
   loadable. */
const wStep=ex=>wLaw(ex).s;
/* v3.3.414: THE NEXT FACE ABOVE a weight, on the exercise's own grid. Not
   "plus one step": a load that sits BETWEEN faces (200 on a 45-bar 10-grid)
   steps to the face just above it (205), while a load already on a face
   (205) steps a whole face (215). One rule that is right for every equipment
   class, and the one the writer's push reads. */
const nextFaceAbove=(kg,ex)=>{
  const {s,a}=wLaw(ex); const u=toU(kg);
  return toKg(a+(Math.floor((u-a)/s+1e-6)+1)*s);
};
function saveExW(ex,kg){ if(!ex) return; DB.settings.exW=DB.settings.exW||{}; DB.settings.exW[ex]=kg; }
/* v3.3.222: on a bodyweight exercise the stored weight IS the added load —
   a `w` on a pull-up never meant anything else — so the display finally says
   what the number means. BW at zero, BW+10 with a belt. One convention for
   every isBody exercise (a plate on a dip belt and a plate on your back are
   the same physics), so nothing needs a per-exercise list. Records, PRs and
   deltas all keep working unchanged: they compare added kilos, which order
   exactly as total kilos do. */
const wLabel=(ex,kg)=>!isBody(ex)?`${wDisp(kg)}`:kg<=0.01?'BW':`BW+${wDisp(kg)}`;
/* inline text form, unit included — the one way to print a set's weight */
const wTxt=(ex,kg)=>!isBody(ex)?`${wDisp(kg)}${U()}`:kg<=0.01?'BW':`BW+${wDisp(kg)}${U()}`;
/* v3.3.396: the plan's own weight text, one function for the card, the
   preview and the column-width probe. Reads a plan LINE, not an exercise:
   nw -> "by feel" (no load named, v3.3.394); bw -> "BW" or "BW+10 lb" (the
   belt, v3.3.393, in wLabel's grammar with the card's unit space); else the
   load in the display unit. */
const planWtx=l=>(l.est?'\u2248':'')+(l.nw?'by feel':l.bw?(l.w>0.01?`BW+${wDisp(l.w)} ${U()}`:'BW'):l.w<=0?'BW':`${wDisp(l.w)} ${U()}`);
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
    /* v3.3.251: a plate-loaded sled carries its own weight and never tells
       you what it is. The number logged is the plates, so the line says the
       plates — and says which it is, rather than implying a total. */
    if(e==='plate')    return totalKg>0.01 ? `${wDisp(totalKg/2)} ${U()} per side · plates only`
                                           : 'plates only — the sled is not counted';
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
    return {d:mine[0],sets:mine[1].w.filter(s=>s.ex===ex).map(s=>[s.w,s.reps,s.mins,s.secs,s.su])};
  return seed||null;
}
/* v3.3.364: THE WEIGHT A TAP WILL GIVE YOU. The go-to rows printed prFor().mw
   -- the heaviest that exercise has EVER been, all-time -- next to a subtitle
   that reads "4 d ago". Two screens up, the Train tab promises "tap an
   exercise to use its previous weight", and the logger delivers on that from
   a different number entirely: your saved default, or last session's top set
   snapped to the exercise's step. So the number shown and the number you got
   were computed from unrelated things, and the shown one was usually older.
   It also printed raw: 35.3, 60.6, 30.9 lb. Those are 16.0, 27.5 and 14.0 kg
   -- the maker's kg-era records surfacing as ragged pounds years later. The
   decimals were the tell, and they vanish here for free, because snapping to
   a step is what turns a converted kilo into a weight a gym actually has.
   Reads the SAME three sources as the prefill, in the same order, so the row
   cannot drift from the tap: change one and this follows. The all-time best
   is not lost -- it is on the exercise's own screen, in Records and as the
   dashed line on Progression. */
function nextWFor(ex){
  if(ex==='Run') return prFor(ex).mw;
  const saved=(DB.settings.exW||{})[ex];
  if(saved!=null) return saved;
  const l=lastFor(ex);
  const top=l&&l.sets.length?Math.max(...l.sets.map(s=>Array.isArray(s)?s[0]:s.w)):0;
  /* NOT SNAPPED, and that is the opposite of what I first wrote. snapW looked
     like the way to kill the ragged decimals -- until it turned 135 lb into
     134.1. The barbell law's lb anchor is 44.0924, a 20kg bar converted, so
     the pound grid runs 44.1 / 54.1 / 64.1 and a real 135 is not on it. The
     snap would have INTRODUCED the decimals it was meant to remove.
     Unsnapped is also the truer answer: this number came out of the ledger,
     so it is a weight that exists by construction -- you lifted it.
     NO bodyweight fallback either, though the prefill has one. The prefill
     needs something to put in the field; this column asks what is LOADED, and
     a pull-up loads nothing. The first version returned bwNow() and printed
     the maker's bodyweight beside Pull Up, where a rule belongs. Added weight
     still shows, arriving through the same last-set path as everything else. */
  return top>0?top:0;
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
/* v3.3.249 — the onboarding answer becomes editable.
   "What do you train?" was asked once, at minute zero, stored in
   settings.myParts, and never asked again — the onboarding card even promised
   "it's all in Settings anyway", which was not true. Worse, the choice was
   self-sealing: a part with no tile cannot be trained, so it can never earn
   the history that would bring its tile back. A beginner who said "no arms"
   in week one had no door to arms in month two.
   The set is derived here so Settings, Train and Today read one authority.
   An absent myParts means "everything" — the state every pre-onboarding
   ledger is already in, and the state trainingPlan()'s allow() has always
   assumed. */
const myPartsSet=()=>{
  const m=DB.settings.myParts;
  const all=Object.keys(SEED.catalog).filter(p=>p!=='Run');
  return new Set(Array.isArray(m)&&m.length?m.filter(p=>p!=='Run'):all);
};
/* Toggling never deletes a set. A part switched off is hidden from the part
   list; its days stay in the ledger and reappear intact when switched on. At
   least one part must remain, the same floor onboarding enforces. */
function toggleMyPart(p){
  const set=myPartsSet();
  if(set.has(p)){ if(set.size<=1) return false; set.delete(p); }
  else set.add(p);
  DB.settings.myParts=[...set];
  DB.settingsAt=Date.now(); save(true);
  return true;
}
/* v3.3.269: how long away makes a body part look cold on a chip. Three weeks
   — three missed exposures at this app's roughly weekly cadence per part, and
   long enough that a normal holiday or a tweaked shoulder does not grey out a
   part you still train. It governs APPEARANCE only: the planner's own `live`
   flag (days>=8) still decides what the app is willing to claim about a
   part's rhythm, which is a different question and deliberately unchanged. */
/* v3.3.276: ONE authority for session-vs-cameo, shared by the planner and
   the Train tab's Last time card so they can never disagree about what a
   part's "last session" was. The rule is v3.3.275's: a day is a full session
   of a part when its sets reach half the part's median daily dose, floor 2. */
function partDoseOn(d,p){
  const rows = SEED.sessions[d] || ((DB.days[d]||{}).w||[]).map(x=>[x.part,x.ex,x.w,x.reps||[]]);
  let n=0; for(const r of rows) if(r[0]===p&&r[1]!=='Run') n+=(r[3]||[]).length;
  return n;
}
function fullDoseFloor(p,days){
  const doses=days.map(d=>partDoseOn(d,p)).filter(x=>x>0);
  return Math.max(2,(median(doses)||0)*0.5);
}
/* ============ v3.3.278: TODAY'S PLAN — a note, never a contract ============
   You paste a session (from a coach, a forum, an AI conversation) and the app
   reads what it can. Three commitments make this safe to add to a ledger app:

   1. A plan is TODAY-ONLY. It is stamped with a date and ignored the moment
      that date is not today, so it can never become a backlog or a debt.
   2. A plan is NEVER written to the record. It feeds the same rails your
      history already feeds — a prefilled weight, a suggested rep count — and
      the ledger still only ever says what you actually did.
   3. Nothing is ever counted AGAINST it. There is deliberately no adherence
      number, no "3 of 7 done", no completion state anywhere in this file or
      its consumers. The moment a plan can be failed, ShowUp has a failure
      state, and this app does not have one.

   The parser is deliberately timid: it proposes, shows its reading, and waits.
   Every line it could not resolve survives as text rather than being dropped,
   because a silently swallowed line is worse than an unparsed one. */
/* v3.3.280: read-boundary normalisation. v3.3.278/279 stored one weight per
   item as {w,reps}; this build stores every line as {lines:[{w,bw,reps}]}. A
   plan saved this morning on the old build is still in storage this
   afternoon, so upgrade must not crash the Train tab — one shape is repaired
   on read rather than migrated in place. */
/* v3.3.321: a note line shaped "label   <gap>   value" is laid out as two
   columns instead of relying on the spaces it arrived with. The text is NOT
   changed — every character survives — only where the run of spaces puts the
   value. A paste is aligned to the width of whatever it was written in; a
   phone card is narrower, so preserved spacing lands wherever it lands.
   Honouring the INTENT of that gap (a value belonging at the right edge) is
   truer to the line than honouring the literal space count. A line without
   such a gap is untouched, pre-wrap and all. */
const NOTE_COLS=/^(\S.*?)[ \t]{2,}(\S.*)$/;
function planNoteHTML(note){
  const rows=String(note).split('\n').map(ln=>{
    const m=ln.match(NOTE_COLS);
    return m ? `<div class="pnrow"><span>${hesc(m[1])}</span><span class="pnval">${hesc(m[2])}</span></div>`
             : `<div class="pnline">${hesc(ln)}</div>`;
  }).join('');
  return `<div class="plannote mono">${rows}</div>`;
}
function planItemShape(i){
  if(i&&!i.lines) return {ex:i.ex, lines:[{w:i.w||0, bw:!(i.w>0), reps:i.reps||[]}]};
  return i;
}
const planNow=()=>{
  let p=DB.plan;
  /* v3.3.398: no plan of its own today -> the week's block for today, if a
     week names it. Same shape, same life. */
  if(!p||p.d!==todayISO){ const wk=DB.week; const b=wk&&wk.days&&wk.days[todayISO]; p=b?{d:todayISO, items:b.items, note:b.note||'', raw:b.raw||'', fromWeek:true}:null; }
  if(!p) return null;
  const items=(p.items||[]).map(planItemShape);
  if(!items.length&&!p.note) return null;
  return {...p, items};
};
const planFor=ex=>{ const p=planNow(); return p?(p.items||[]).find(i=>i.ex===ex)||null:null; };
/* ============ v3.3.398: THE PLAN'S GLYPHS ============
   Four are the maker's picks from the Noun Project (royalty-free, credited on
   the Settings footer beside the icons the app already credits): Sparkle by
   Eliricon (7262146) on the writer's door, Chevron by Barracuda (1342814) on
   every day heading, Expand (7584001) and Collapse (7584005) by LAFS on the
   week's edge. Paths were traced from the PNGs at 700px and normalised into a
   100-box.
   v3.3.404: copy and edit are the maker's picks too -- Copy by maria icon and
   Pencil by Alvida Black -- replacing the two I had drawn by hand. Both are
   OUTLINE shapes, so their paths carry holes and are filled evenodd; the
   hand-drawn stand-ins were solid strokes and the edge read as two families.
   Only clear and grip are still drawn here (stroke 12 on 100, round caps),
   and both are single strokes, which is what that measure is for.
   All inline: a PWA on gym signal does not fetch icons. */
const ICON_PATH={
  sparkle:"M41.4 16.2 L40.0 17.3 L37.6 24.5 L33.7 33.0 L28.7 40.5 L24.7 44.4 L19.5 48.4 L11.4 52.5 L1.1 56.2 L0.2 57.1 L0.0 58.4 L1.3 60.0 L6.8 61.7 L15.8 65.6 L21.2 68.9 L25.6 72.4 L31.9 80.1 L37.0 89.9 L40.3 99.1 L41.4 100.0 L42.5 100.0 L43.8 98.9 L47.0 89.5 L50.5 82.3 L54.9 75.9 L59.7 71.1 L63.9 68.1 L72.2 63.7 L82.9 59.7 L83.8 58.6 L83.8 57.3 L82.3 56.0 L76.1 54.0 L68.3 50.5 L62.1 46.8 L58.6 44.0 L53.8 38.7 L50.5 33.7 L47.0 26.5 L43.5 16.8 L42.7 16.2Z M78.8 0.0 L74.6 9.2 L72.4 12.3 L67.8 16.2 L58.6 20.1 L58.2 21.4 L64.3 23.9 L69.8 27.1 L74.4 32.4 L78.3 41.6 L79.4 41.8 L80.1 41.1 L82.9 33.7 L85.6 29.8 L90.8 25.4 L99.3 21.9 L100.0 20.8 L99.1 19.9 L92.1 17.3 L88.4 14.9 L85.3 11.8 L83.4 9.0 L79.9 0.4Z",
  expand:"M41.6 56.0 L39.6 55.1 L36.9 55.8 L10.5 82.2 L10.1 59.6 L8.9 58.1 L7.6 57.4 L2.7 57.4 L0.9 58.5 L0.0 60.3 L0.0 97.0 L1.3 99.2 L2.7 99.9 L40.0 99.9 L42.1 98.5 L42.7 97.0 L42.7 93.0 L42.1 91.2 L40.3 89.8 L17.9 89.6 L44.3 63.0 L44.7 59.8Z M58.4 1.0 L57.5 2.3 L57.3 6.6 L58.2 9.1 L60.0 10.2 L81.9 10.2 L82.1 10.6 L55.9 36.8 L55.3 38.1 L55.7 41.1 L59.5 44.6 L61.7 44.9 L62.9 44.4 L89.5 17.8 L89.9 40.4 L90.8 41.7 L92.6 42.6 L97.1 42.6 L98.7 41.9 L100.0 39.7 L100.0 3.0 L99.3 1.5 L97.5 0.1 L59.7 0.1Z",
  collapse:"M3.8 57.2 L2.3 59.2 L2.1 63.1 L2.9 65.5 L4.5 66.6 L26.1 66.6 L26.3 67.0 L1.4 91.9 L0.5 93.7 L1.2 96.5 L4.9 99.8 L6.7 100.0 L8.0 99.6 L33.5 74.0 L34.0 96.1 L35.0 97.6 L36.4 98.3 L41.2 98.3 L42.2 97.8 L43.8 95.6 L43.8 59.6 L43.1 58.1 L41.2 56.8 L4.7 56.8Z M96.0 0.7 L94.4 0.0 L91.8 0.7 L66.5 26.0 L66.0 3.9 L65.2 2.6 L63.6 1.7 L58.8 1.7 L57.1 2.8 L56.2 4.6 L56.2 40.4 L57.5 42.6 L58.8 43.2 L95.3 43.2 L97.3 41.9 L97.9 40.4 L97.9 36.5 L97.1 34.5 L95.5 33.4 L73.7 33.2 L98.8 7.9 L99.5 6.6 L99.2 4.1Z",
  edit:"M94.9 4.8 L91.9 2.5 L89.4 1.2 L84.6 0.0 L80.9 0.0 L77.9 0.5 L76.3 1.1 L72.2 3.4 L7.8 67.6 L0.0 96.1 L0.0 97.5 L1.1 99.3 L2.5 100.0 L4.1 100.0 L32.4 92.2 L95.8 28.8 L98.1 25.5 L99.5 21.9 L100.0 19.1 L100.0 15.6 L98.8 10.6 L97.5 8.1Z M63.9 20.5 L79.5 36.1 L29.0 86.5 L8.0 92.2 L7.8 91.7 L13.5 71.0Z M81.2 6.4 L85.3 6.5 L88.8 8.1 L92.0 11.5 L93.1 13.6 L93.6 15.8 L93.6 18.9 L92.2 22.8 L90.8 24.8 L84.1 31.5 L68.7 16.1 L75.9 8.7 L78.2 7.3Z",
  copy:"M24.1 0.8 L20.5 3.4 L19.1 5.4 L18.2 7.6 L17.8 9.8 L17.8 21.2 L9.4 21.4 L6.9 22.0 L5.0 22.9 L1.7 26.0 L0.8 27.7 L0.0 30.2 L0.0 91.4 L0.6 93.3 L1.9 95.8 L4.8 98.5 L8.6 100.0 L69.8 100.0 L71.9 99.4 L74.0 98.3 L77.1 95.0 L78.0 93.1 L78.6 90.8 L78.8 85.7 L91.4 85.7 L93.3 85.1 L95.8 83.7 L98.5 80.9 L100.0 77.1 L100.0 8.6 L99.4 6.7 L98.1 4.2 L95.2 1.5 L91.4 0.0 L26.6 0.0Z M8.4 29.1 L10.7 28.3 L67.9 28.3 L69.8 28.9 L71.1 30.2 L71.7 32.1 L71.7 89.3 L71.3 91.0 L70.0 92.5 L68.6 93.1 L9.8 93.1 L7.8 92.0 L6.9 90.2 L6.9 31.4 L7.5 30.0Z M26.2 7.6 L27.7 6.9 L90.2 6.9 L91.2 7.3 L92.7 8.8 L93.1 9.8 L93.1 75.9 L92.7 76.9 L91.2 78.4 L90.2 78.8 L78.6 78.6 L78.6 30.8 L77.8 27.9 L76.5 25.6 L73.2 22.8 L69.2 21.4 L25.0 21.4 L24.9 9.8Z"
};
const ICON_STROKE={
  clear:'M30 30l40 40M70 30 30 70',
  grip:'M22 34h56M22 50h56M22 66h56',
  /* v3.3.411: the chevron was the only DIRECTIONAL glyph drawn as a filled
     wedge, in a set whose other simple marks -- the cross and the grip -- are
     strokes. Measured, it carried 15% ink inside the live area where copy
     carries 33% and clear 28%: the lightest thing in every row it appeared
     in. Drawn as two lines it inherits the system's weight BY CONSTRUCTION
     rather than by tuning, and every future chevron is right for free. */
  chevron:'M38 24 L64 50 L38 76'
};
/* v3.3.411: THE LIVE AREA. Every icon shared one viewBox, but the ink inside
   filled anywhere from 52% (clear) to 100% (edit, copy) of it -- so a toolbar
   asking for three icons at one size got three different sizes, and the cross
   rendered barely half the pencil beside it.
   Measured ink bounds, per icon. Each is scaled so its longest side meets ONE
   live area, and a stroked icon's width is divided by its own scale so
   normalising cannot also thicken it. Nothing is redrawn to achieve this.
   If a path is edited, its numbers here must be re-measured -- buildcheck
   fails if a name is missing from this table. */
const ICON_INK={
  sparkle:[0,0,100,100], expand:[0,0.1,100,99.9], collapse:[0.5,0,99.5,100],
  edit:[0,0,100,100],    copy:[0,0,100,100],
  clear:[24,24,76,76],   grip:[16,28,84,72],      chevron:[33.5,19.5,68.5,80.5]
};
const ICON_LIVE=0.76;      // share of the box the ink meets
const ICON_STROKE_W=9;     // rendered stroke, in box units, for every stroked icon
/* the sizes icons are allowed to be. A raw number at a call site is how the
   11/12/14/16/17 spread happened; buildcheck rejects one now. */
const ICON_SZ={ sm:15, md:18, lg:22, hero:44 };
function icon(name,sz,rot){
  sz=sz||ICON_SZ.md;
  const tf=rot?` style="transform:rotate(${rot}deg)"`:'';
  /* v3.3.411: scale the ink to the live area and centre it. The transform is
     applied to a group so the path itself is untouched and can still be
     copied out of the file and pasted anywhere. */
  const b=ICON_INK[name]||[0,0,100,100];
  const w=b[2]-b[0], h=b[3]-b[1];
  const k=(100*ICON_LIVE)/Math.max(w,h);
  const tx=50-k*(b[0]+b[2])/2, ty=50-k*(b[1]+b[3])/2;
  const g=`transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})"`;
  /* evenodd, because an outline icon is one path with holes in it: a pencil
     has a body and a copy has two open squares, and nonzero would fill them */
  if(ICON_PATH[name]) return `<svg class="ic ic-${name}" viewBox="0 0 100 100" width="${sz}" height="${sz}"${tf} aria-hidden="true"><g ${g}><path d="${ICON_PATH[name]}" fill="currentColor" fill-rule="evenodd"/></g></svg>`;
  /* the stroke is divided by the icon's own scale: normalising the ink must
     not also thicken the line. Without this, clear and grip arrive fat. */
  const sw=(ICON_STROKE_W/k).toFixed(2);
  return `<svg class="ic ic-${name}" viewBox="0 0 100 100" width="${sz}" height="${sz}"${tf} fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g ${g}><path d="${ICON_STROKE[name]}"/></g></svg>`;
}
/* v3.3.399: NEW is a fact about the record, not a verdict from a model: an
   exercise with no set in the last eight weeks. The writer tags what it adds;
   this is what the tag means, and it is computed here, from the ledger. */
const NEW_DAYS=56;
function exIsNew(ex){ const d=SEED.exLast&&SEED.exLast[ex]; return !d || daysAgo(d)>NEW_DAYS; }
/* the preview's rows, written back out in their current order -- the third
   place the order lives (rows, text, items), so Copy and Edit agree with the
   card after a drag */
function planTextFromRows(rows){
  const out=[];
  for(const r of rows){
    if(r.kind==='day'){ out.push(''); out.push(r.raw||''); out.push(''); continue; }
    if(r.kind==='ex'||r.kind==='exnote'){ const head=(r.raw||r.name||'').trim(); out.push(head);
      for(const l of (r.lines||[])){ const lr=(l.raw||'').trim(); if(lr&&lr!==head) out.push('  '+lr.replace(/^\s+/,'')); }   // an inline exercise already holds its set
      out.push(''); continue; }
    out.push((r.raw||'').trim()); out.push('');
  }
  return out.join('\n').replace(/\n{3,}/g,'\n\n').trim()+'\n';
}
/* v3.3.399: ONE ORDER, THREE PLACES. The read-back's rows can be moved -- a
   grip per row, drag or arrow keys. Only resolved exercise rows move; notes
   and day headings keep their slots, and a row dragged past a day heading
   simply lands in that day. After any move the rows, the raw text and (on
   accept) the items agree, so Copy and Edit never disagree with the card. */
function planApplyOrder(order){
  const rows=lift.planRows||[]; const slots=rows.map((r,i)=>r.kind==='ex'&&r.ex?i:-1).filter(i=>i>=0);
  if(order.length!==slots.length||new Set(order).size!==slots.length||order.some(i=>!slots.includes(i))) return false;   // a permutation, or nothing
  const moved=order.map(i=>rows[i]);
  slots.forEach((slot,k)=>{ rows[slot]=moved[k]; });
  lift.planRows=rows; lift.planText=planTextFromRows(rows);
  return true;
}
function planMoveRow(i,dir){
  const rows=lift.planRows||[]; const slots=rows.map((r,k)=>r.kind==='ex'&&r.ex?k:-1).filter(k=>k>=0);
  const at=slots.indexOf(i); const to=at+dir; if(at<0||to<0||to>=slots.length) return false;
  const order=slots.slice(); [order[at],order[to]]=[order[to],order[at]];
  return planApplyOrder(order) ? slots[to] : false;   // the row's NEW index, for focus to follow
}
/* ============ v3.3.397: THE LEDGER DECIDES WHAT "TODAY" MEANS ============
   At 10 PM with Chest already in the record, "today's plan" is a plan for a
   day that is over. The clock cannot tell; the ledger can, and it already
   drives the greeting (v3.3.66: it leaves the moment the first set lands) and
   the whole shape of Today (logged / not logged). One rule, no timer, no
   "night mode":  nothing logged today -> the plan is for today; sets in the
   record, or the day closed -> the plan is for TOMORROW.
   A tomorrow plan is the same object with tomorrow's stamp. planNow() already
   ignores any stamp that is not today, so it lies dormant tonight and is
   simply there at 00:00 -- the mechanism v3.3.278 built for expiry does the
   waking too. Nothing new is stored, and nothing is counted: a plan for a
   day that has not come is still a note, never a debt. */
const tomorrowISO=()=>{ const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()+1); return d.toLocaleDateString('en-CA'); };
function writeDateISO(){
  const logged=(((DB.days[todayISO]||{}).w)||[]).length>0;
  const closed=DB.settings.dayDone===todayISO;
  return (logged||closed)?tomorrowISO():todayISO;
}
/* a plan stamped for a day after today: shown as one quiet line, never read
   by the rails, never scored. null unless there is one. */
/* v3.3.421: the plan the DAY SCOPE SHOWS -- today's while today is open,
   tomorrow's once today is in the book. Copy, edit and the pill's label all
   read this so they agree about which day they mean. */
const planShown=()=>planNow()||planPending();
function planPending(){
  const p=DB.plan;
  if(!p||!(p.d>todayISO)) return null;
  const items=(p.items||[]).map(planItemShape);
  if(!items.length&&!p.note) return null;
  return {...p, items};
}
/* Suggested sets are a VIEW of today's plan, not separately authored state.
   Reconcile rather than append: this matters when a newer cloud plan replaces
   one from another device, because exercises removed there must disappear
   here too. The comparison keeps Today renders idempotent -- no save loop. */
function planRailRefresh(){
  const rail=sugOv(), desired={};
  const p=planNow();
  if(p) for(const i of (p.items||[])){
    const sets=planSets(i); if(sets.length) desired[i.ex]={sets,d:todayISO,from:'plan'};
  }
  let changed=false;
  for(const [ex,o] of Object.entries(rail)) if(o&&o.from==='plan'){
    if(!desired[ex]||JSON.stringify(o)!==JSON.stringify(desired[ex])){ delete rail[ex]; changed=true; }
  }
  for(const [ex,o] of Object.entries(desired)) if(JSON.stringify(rail[ex])!==JSON.stringify(o)){
    rail[ex]=o; changed=true;
  }
  return changed;
}
/* the Suggested rail is fed for TODAY's plan only. A tomorrow plan feeds it
   when tomorrow comes: this is idempotent and cheap, so Today calls it on
   every render rather than trusting a midnight hook to have fired. */
function planWake(){ const fed=planRailRefresh(); if(fed) save(true); return fed; }
function planSave(items,note,raw,d){
  d=d||todayISO;
  DB.plan={d, items:items||[], note:note||'', raw:raw||''};
  /* v3.3.398: a day written on its own replaces ONLY its block of the week,
     so the week card and the day agree and the other days are untouched */
  const wk=DB.week; if(wk&&wk.days&&wk.days[d]){ wk.days[d]={title:wk.days[d].title, items:items||[], note:note||'', raw:raw||''}; DB.weekAt=Date.now(); }
  /* feed the rail that already exists. sugOv() is "use THESE sets for this
     exercise, today" — same today-only life as a plan, already wired to the
     Suggested chips, already tappable to log. A plan does not need a second
     mechanism; it needs to be a second SOURCE for this one. `from:'plan'` is
     what lets the panel name its origin instead of pretending it is your
     history.
     v3.3.397: only when the plan IS today's. A plan for tomorrow must not
     put tomorrow's sets on today's chips; planWake() feeds them at 00:00. */
  planRailRefresh();
  DB.planAt=Date.now(); save(true);
}
function planClear(){
  for(const [ex,o] of Object.entries(sugOv())) if(o&&o.from==='plan') delete sugOv()[ex];
  DB.plan=null; DB.planAt=Date.now();
  /* v3.3.398: if today's plan was the week's block for today, Clear clears
     that block too -- otherwise the card would come straight back. The other
     days of the week are untouched; Clear on the week scope is weekClear. */
  const wk=DB.week; if(wk&&wk.days&&wk.days[todayISO]){ delete wk.days[todayISO]; DB.weekAt=Date.now(); }
  save(true);
}
/* ============ v3.3.398: THE WEEK -- A DOCUMENT, NOT A SCHEDULE ============
   Six blocks of the maker's own paste format, one per day, each under a
   heading like "Tue, Sep 1 — Back + Biceps". Three commitments carry over
   from v3.3.278 and one is new:
   1. Today's plan IS the week's block for today. planNow() reads DB.plan when
      it is today's, else the week's block -- the same today-only stamp, the
      same rails, the same expiry. A day written on its own replaces only its
      block.
   2. Nothing is counted against a week. A past day folds and dims; it is
      never marked missed, never tallied. buildcheck extends the plan's ban
      on adherence vocabulary to this word too.
   3. The record never learns about weeks (weekSave cannot touch DB.days).
   4. NEW: a week ENDS ON SUNDAY, whatever day it was written, and does not
      roll over. When its last day has passed weekNow() is null and the pill
      is gone; there is nothing to be behind on. */
const WEEK_HEAD=/^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:\s*(?:[\u2014\u2013:\-]|--)\s*(.+?))?\s*$/i;
const MONTHS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
/* "Sep 1" -> the ISO date nearest today with that month and day */
function weekDateISO(mon,dd,anchor){
  const m=MONTHS.indexOf(mon.slice(0,3).toLowerCase()); if(m<0) return null;
  const y0=+(anchor||todayISO).slice(0,4), a=new Date((anchor||todayISO)+'T00:00');
  let best=null, bd=Infinity;
  for(const y of [y0-1,y0,y0+1]){
    const d=new Date(y,m,+dd); if(d.getMonth()!==m) continue;
    const dist=Math.abs(d-a); if(dist<bd){ bd=dist; best=d; }
  }
  return best?best.toLocaleDateString('en-CA'):null;
}
function parseWeek(text){
  const lines=String(text||'').split(/\r?\n/);
  const days={}; let cur=null, buf=[], order=[];
  const flush=()=>{ if(!cur) return; const raw=buf.join('\n').trim();
    const {items,note}=planItemsFrom(parsePlan(raw));
    days[cur.iso]={title:cur.title, items, note, raw}; order.push(cur.iso); cur=null; buf=[]; };
  for(const ln of lines){
    const m=ln.match(WEEK_HEAD);
    if(m&&!/\d\s*(x|\u00d7)\s*\d/i.test(ln)){ flush(); const iso=weekDateISO(m[2],m[3]); if(iso){ cur={iso,title:(m[4]||'').trim()}; continue; } }
    if(cur) buf.push(ln);
  }
  flush();
  if(!order.length) return null;
  const isos=Object.keys(days).sort();
  return {from:isos[0], to:isos[isos.length-1], days, raw:String(text||''), at:Date.now()};
}
/* the preview reads a week as one flat list: a day row, then that day's
   exercise rows, exactly as a single paste would show them */
function weekRows(wk){
  const rows=[];
  for(const iso of Object.keys(wk.days).sort()){
    const d=wk.days[iso];
    rows.push({kind:'day', iso, title:d.title||'', raw:weekDayHead(iso,d.title), dayRaw:d.raw||''});
    for(const r of parsePlan(d.raw||'')) rows.push(r);
  }
  return rows;
}
function weekFromRows(rows, raw){
  const days={}; let cur=null, seg=[];
  const flush=()=>{ if(!cur) return; const {items,note}=planItemsFrom(seg);
    days[cur.iso]={title:cur.title, items, note, raw:cur.dayRaw||''}; cur=null; seg=[]; };
  for(const r of rows){ if(r.kind==='day'){ flush(); cur=r; } else if(cur) seg.push(r); }
  flush();
  const isos=Object.keys(days).sort(); if(!isos.length) return null;
  return {from:isos[0], to:isos[isos.length-1], days, raw:raw||''};
}
function weekNow(){
  const w=DB.week; if(!w||!w.days) return null;
  const isos=Object.keys(w.days).sort(); if(!isos.length) return null;
  if(isos[isos.length-1]<todayISO) return null;          // the week is over; it does not roll
  return w;
}
function weekSave(doc){
  if(!doc) return false;
  const at=Date.now();
  DB.week={from:doc.from, to:doc.to, days:doc.days, raw:doc.raw||'', at};
  DB.weekAt=at;
  /* a week that names today feeds today exactly as a paste would */
  if(DB.plan&&DB.plan.d===todayISO){ DB.plan=null; DB.planAt=at; }
  for(const [ex,o] of Object.entries(sugOv())) if(o&&o.from==='plan') delete sugOv()[ex];
  save(true); planWake();
  return true;
}
function weekClear(){
  for(const [ex,o] of Object.entries(sugOv())) if(o&&o.from==='plan') delete sugOv()[ex];
  DB.week=null; DB.weekAt=Date.now(); save(true);
}
/* the maker's format, written back out -- what Copy hands you and what Edit
   opens when a plan arrived without its own text */
function planLineText(l){
  const w=(l.est?'\u2248':'')+(l.nw?'by feel':l.bw?(l.w>0.01?`BW +${wDisp(l.w)}`:'BW'):`${wDisp(l.w)} ${U()}`);
  return isHold(l.su)?`  ${w} \u00d7 ${secLabel(l.reps[0])} \u00d7 ${l.reps.length}`:`  ${w} \u00d7 ${l.reps.join(' ')}`;
}
function planToText(p){
  if(!p) return '';
  const out=[];
  for(const i of (p.items||[])){ out.push(i.ex); for(const l of (i.lines||[])) out.push(planLineText(l)); out.push(''); }
  if(p.note) out.push(p.note);
  return out.join('\n').trim()+'\n';
}
function weekDayHead(iso,title){ return `${pretty(iso)}${title?' \u2014 '+title:''}`; }
function weekToText(w){
  if(!w) return '';
  return Object.keys(w.days).sort().map(iso=>{ const d=w.days[iso];
    return weekDayHead(iso,d.title)+'\n\n'+(d.raw&&d.raw.trim()?d.raw.trim():planToText(d).trim()); }).join('\n\n')+'\n';
}

/* name matching: normalise hard (case, punctuation, plurals) then score by
   token overlap. An exact normalised hit is a match; anything else is only
   ever a CANDIDATE the user confirms. */
const planNorm=t=>String(t).toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
/* v3.3.339: gym shorthand, expanded for SCORING ONLY. planNorm is untouched,
   so an abbreviation can never become an exact match and auto-resolve — it
   can only raise a name far enough to appear as a "did you mean…" the user
   confirms. That asymmetry is the whole safety argument: "Incline BB" is a
   guess about which of several incline presses was meant, and a guess belongs
   in front of the user, not in the ledger. */
const PLAN_ABBR={bb:'barbell', db:'dumbbell', kb:'kettlebell', sm:'smith machine',
  ohp:'overhead press', rdl:'romanian deadlift', sldl:'stiff leg deadlift',
  bor:'bent over row', bp:'bench press', pu:'pull up', ez:'ez bar'};
const planToks=t=>planNorm(t).split(' ').filter(Boolean)
  .flatMap(w=>(PLAN_ABBR[w]||w).split(' '))
  .map(w=>w.replace(/s$/,''));
function planCandidates(name){
  const all=[...new Set([...Object.values(SEED.catalog).flat(), ...Object.keys(customs())])];
  const n=planNorm(name);
  const exact=all.find(e=>planNorm(e)===n);
  if(exact) return {match:exact, cands:[]};
  const q=planToks(name);
  if(!q.length) return {match:null, cands:[]};
  const scored=all.map(e=>{
    const c=planToks(e);
    let hit=0;
    for(const t of q) if(c.some(x=>x===t||x.startsWith(t)||t.startsWith(x))) hit++;
    return {e, score: hit/Math.max(q.length,c.length)};
  }).filter(x=>x.score>=0.5).sort((a,b)=>b.score-a.score);
  return {match:null, cands:scored.slice(0,3).map(x=>x.e)};
}

/* one line of sets: "55 lb  8 8 8 8", "35lb x 12", "BW 10 8 8", "60 kg 5x5" */
/* v3.3.393: WEIGHTED BODYWEIGHT WORK. "BW +10 x 8 8 6 6" is how a belt is
   written, and the old pattern allowed nothing between "bw" and the reps --
   so a weighted pull-up fell through to "kept as a note", the whole line
   discarded. The added load is optional and may carry its own unit; without
   one it inherits the paste's, exactly as a plain number does. Split into two
   patterns rather than one alternation: the BW form has a term the numeric
   form does not, and one regex for both made the group numbering unreadable. */
/* v3.3.394: A SET WITH NO LOAD. "by feel x 12 12 10 10" is how the maker
   writes a movement he does not track a number on -- machines with unmarked
   stacks, bands, assisted work. It became a note, so the exercise vanished
   from the plan and the reps went with it.
   This is PLAN-ONLY and safe there for a specific reason: the plan is a
   promise, never a record. It is never scored, never written to the ledger,
   and cleared at midnight. A promise may say "these reps, whatever the weight
   turns out to be"; the ledger may not, and does not have to -- you set the
   weight when you actually log the set.
   Deliberately narrow: only these three phrasings, and reps are REQUIRED. A
   line of prose with no numbers must keep falling through to a note. */
const PLAN_SET_NW=/^\s*(?:by\s*feel|no\s*weight|unweighted)\s*[x×·,:]?\s*([\d\s,x×·]*\d)\s*$/i;
const PLAN_SET_BW=/^\s*(?:bw|bodyweight)\s*(?:\+\s*([\d.]+)\s*(lb|lbs|kg|kgs)?)?\s*[x×·,:]?\s*([\d\s,x×·]*\d)?\s*$/i;
const PLAN_SET=/^\s*([\d.]+)\s*(lb|lbs|kg|kgs)?\s*[x×·,:]?\s*([\d\s,x×·]*\d)?\s*$/i;
/* v3.3.311: a trailing per-limb qualifier is prose, not data. "45 lb 10 10
   10 per arm" failed the whole line, and the damage compounded: with no set
   line the exercise heading above it became a note, and the orphaned set
   line — having letters in it — was then read as a heading of its own and
   became a SECOND note. One unrecognised phrase turned one exercise into two
   pieces of text. Stripping it loses nothing: for a dumbbell this app
   already states weight per hand, so "per arm" is restating the convention. */
const PLAN_SIDE=/\s*(?:\/\s*)?(?:per|each|ea\.?|e\/)\s*(?:arm|side|leg|hand|limb)?s?\.?\s*$/i;
function planReadSets(line){
  const src=String(line).replace(PLAN_SIDE,'');
  const nwm=src.match(PLAN_SET_NW);
  if(nwm){
    const reps=nwm[1].split(/[\s,]+/).filter(Boolean)
      .map(x=>+String(x).replace(/[x×·]/g,'')).filter(n=>n>0&&n<1000);
    return reps.length?{w:0,unit:'',reps,bw:false,nw:true}:null;
  }
  const bwm=src.match(PLAN_SET_BW);
  const m=bwm||src.match(PLAN_SET); if(!m) return null;
  const bw=!!bwm;
  /* for a BW line the number is the ADDED load, which is what this app
     stores for bodyweight exercises (wLabel: 0 reads "BW", 10 reads
     "BW+10"). Bare "BW" is zero added, as before. */
  const w=bw?(m[1]?parseFloat(m[1]):0):parseFloat(m[1]);
  if(!(w>=0)) return null;
  const unit=(m[2]||'').toLowerCase().replace(/s$/,'');
  let reps=[];
  if(m[3]){
    const parts=m[3].split(/[\s,]+/).filter(Boolean);
    /* "5x5" means five sets of five, not one set of 5 then 5 */
    if(parts.length===1&&/[x×·]/.test(parts[0])){
      const [a,b]=parts[0].split(/[x×·]/).map(Number);
      if(a>0&&b>0&&a<=20) reps=Array(a).fill(b);
    }else reps=parts.map(x=>+String(x).replace(/[x×·]/g,'')).filter(n=>n>0&&n<1000);
  }
  if(!bw&&!reps.length&&!unit) return null;      // a bare number is not a set line
  return {w, unit, reps, bw};
}
/* Real training notes often put the relationship before the load
     3 x 10 @ 220 lb
   or write all three numbers after the load
     225 lb x 3 x 5
   Both have one unambiguous reading. Keep them separate from PLAN_SET: that
   older reader deliberately treats `5x5` as sets x reps only after a load. */
/* v3.3.399: AN ESTIMATED LOAD. "\u224815 lb \u00d7 12 12" (or "~15 lb") is a number
   for an exercise you have never lifted here -- the session writer's guess
   from a related lift, or your own. It reads as a guess everywhere: \u2248 on
   the card, on the preview, in the copied text, on the Suggested chip. It is
   never a fact about you, and it never enters the record: you type what you
   lift, as always. The parser strips the mark and carries it as `est`. */
function planReadPrescription(line){
  const t=String(line); const est=/^\s*[\u2248~]\s*\d/.test(t);
  const r=planReadPrescription0(est?t.replace(/^\s*[\u2248~]\s*/,''):line);
  return (r&&est)?{...r,est:true}:r;
}
function planReadPrescription0(line){
  const peeled=planPeelQualifier(line), s=peeled.body;
  let m=s.match(/^\s*(\d+)\s*[x×]\s*(\d+)\s*@\s*([\d.]+)\s*(lb|lbs|kg|kgs)\s*$/i);
  if(m){
    const sets=+m[1], reps=+m[2], w=+m[3], unit=m[4].toLowerCase().replace(/s$/,'');
    if(sets>0&&sets<=20&&reps>0&&reps<1000&&w>=0)
      return {w,unit,bw:false,reps:Array(sets).fill(reps),qual:peeled.qual};
  }
  m=s.match(/^\s*([\d.]+)\s*(lb|lbs|kg|kgs)\s*[x×]\s*(\d+)\s*[x×]\s*(\d+)\s*$/i);
  if(m){
    const w=+m[1], unit=m[2].toLowerCase().replace(/s$/,''), sets=+m[3], reps=+m[4];
    if(sets>0&&sets<=20&&reps>0&&reps<1000&&w>=0)
      return {w,unit,bw:false,reps:Array(sets).fill(reps),qual:peeled.qual};
  }
  const ordinary=planReadSets(s);
  return ordinary ? {...ordinary,qual:peeled.qual} : null;
}

/* Modifiers may be useful instructions, but they are not weights or reps.
   Peel only familiar, explicit suffixes and carry their exact text into the
   read-back preview. The accepted plan stays numerical and the original raw
   paste remains stored, so no modifier is silently reinterpreted. */
function planPeelQualifier(line){
  let body=String(line).trim(), qual='';
  /* v3.3.373: PEEL A TRAILING COMMENT FIRST. Every set pattern below anchors
     with $, so any text after the reps killed the match outright -- and the
     maker's own paste annotates every single line:
       "45 lb x 10 10 10 8        (up from 40 - you hit 15s on it)"
     "25 lb x 12 10 10" parsed; the same line with a note did not, so all eight
     exercises fell through to "kept as a note" and the paste read as nothing.
     A person writing down why they went up is the normal case, not an edge
     one. The comment is KEPT rather than discarded -- it rides along as the
     line's qualifier, so the preview can still show what you wrote. */
  const par=body.match(/\s*\(([^()]*)\)\s*$/);
  if(par){ qual=par[1].trim(); body=body.slice(0,par.index).trim(); }
  const forms=[
    /\s*@?\s*((?:RPE\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*RPE|RIR\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*RIR))\s*$/i,
    /\s*@?\s*((?:\d+(?:-\d+){2,3}\s*tempo|tempo\s*\d+(?:-\d+){2,3}|paused?|\d+(?:\.\d+)?\s*(?:s|sec|seconds?)\s*pause))\s*$/i
  ];
  for(const rx of forms){
    const m=body.match(rx);
    if(m){ qual=m[1].trim(); body=body.slice(0,m.index).trim(); break; }
  }
  return {body,qual};
}

/* Labels describe a set's role, not its arithmetic. Strip them only for the
   numeric read, and keep the label on the row so the preview can say exactly
   what it recognised. */
function planSetLabel(line){
  const s=String(line);
  const m=s.match(/^\s*((?:set\s*#?\d+|warm[ -]?ups?|work(?:ing)?(?:\s+sets?)?|top\s+sets?|back[ -]?offs?(?:\s+sets?)?))\s*[:.-]\s*(.+)$/i);
  return m ? {body:m[2].trim(),tag:m[1].trim()} : {body:s.trim(),tag:''};
}
/* v3.3.339: ONE LINE, NAME AND SETS. The parser assumed a heading with its
   sets indented beneath — the shape the app's own paste help describes. The
   maker writes his sessions the way a notebook does, everything for an
   exercise on one line:
       Incline BB 95x10 · 115x8 · 145 x 12 12 12 12 · 165x5
   Every one of those became a note: the line starts with letters so it is
   not a set line, and as a heading the name is the whole string, numbers and
   all, which matches nothing.
   The split REQUIRES an explicit x or ×. That is the conservative choice and
   it matters: "Bench Press 3 sets" and "Squat 5" must keep falling through
   to the heading path they use today, and a multiplication sign is the one
   unambiguous signal that what follows is data rather than prose. Groups are
   separated by · or ; only — never by comma, because a comma already
   separates reps inside a group.
   ALL OR NOTHING: if any group fails to parse, the whole line falls back to
   being a heading exactly as before. A half-read line would put some of a
   session in the plan and silently drop the rest, which is the failure mode
   v3.3.280 already called worse than not parsing at all. */
const PLAN_INLINE=/^\s*(.*?[a-z].*?)\s+((?:bw|bodyweight|[\d.]+)\s*(?:lb|lbs|kg|kgs)?\s*[x×]\s*[\d\s,]*\d.*)$/i;
function planReadInline(body){
  const peeled=planPeelQualifier(body), clean=peeled.body;
  /* sets x reps @ load */
  let m=clean.match(/^\s*(.*?[a-z].*?)\s+(\d+)\s*[x×]\s*(\d+)\s*@\s*([\d.]+)\s*(lb|lbs|kg|kgs)\s*$/i);
  if(m){
    const name=planHeadClean(m[1]), sets=+m[2], reps=+m[3], w=+m[4];
    if(name&&sets>0&&sets<=20&&reps>0&&reps<1000&&w>=0)
      return {name,lines:[{w,unit:m[5].toLowerCase().replace(/s$/,''),bw:false,
        reps:Array(sets).fill(reps),qual:peeled.qual,raw:body}]};
  }
  /* load x sets x reps */
  m=clean.match(/^\s*(.*?[a-z].*?)\s+([\d.]+)\s*(lb|lbs|kg|kgs)\s*[x×]\s*(\d+)\s*[x×]\s*(\d+)\s*$/i);
  if(m){
    const name=planHeadClean(m[1]), w=+m[2], sets=+m[4], reps=+m[5];
    if(name&&sets>0&&sets<=20&&reps>0&&reps<1000&&w>=0)
      return {name,lines:[{w,unit:m[3].toLowerCase().replace(/s$/,''),bw:false,
        reps:Array(sets).fill(reps),qual:peeled.qual,raw:body}]};
  }
  m=clean.match(PLAN_INLINE); if(!m) return null;
  const name=planHeadClean(m[1]);
  if(!name||!/[a-z]/i.test(name)) return null;
  const groups=m[2].split(/[·•;]/).map(g=>g.trim()).filter(Boolean);
  if(!groups.length) return null;
  const lines=[];
  for(let gi=0;gi<groups.length;gi++){
    const g=groups[gi];
    const set=planReadPrescription(g);
    if(!set||!set.reps.length) return null;    // one bad group, no inline read
    /* a suffix at the end of a multi-load line belongs to the last group,
       not retroactively to every warm-up written before it */
    lines.push({...set, qual:set.qual||(gi===groups.length-1?peeled.qual:''), raw:g});
  }
  return {name, lines};
}
/* v3.3.340: a HOLD is recognised, and kept with the exercise it belongs to.
   "Plank / 60 sec x 2" is not something this app can prefill -- a set is a
   weight and a count of reps, and every set total in the app gates on
   reps.length, so a duration-only set would be invisible to "19 sets", to
   Stats and to coverage. That is a MODEL question, not a parser one, and it
   is not answered here.
   What IS fixed is the compounding. Written on two lines, the duration line
   failed to parse, so it was read as a HEADING of its own -- and the exercise
   above it, now with no set line, became a second note. One unreadable phrase
   turned one exercise into two pieces of text, which is precisely the damage
   v3.3.311 documented for "per arm". Recognising the shape lets it stay
   attached: one note, reading "Plank - 60 sec x 2", instead of two fragments.
   Deliberately NOT a plan item. The app can hold it verbatim and hand it back
   without pretending it understood it. */
const PLAN_TIME=/^\s*(?:(\d+)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes)\b\s*(?:[x×]\s*(\d+))?\s*$/i;
function planReadTime(line){
  const m=String(line).replace(PLAN_SIDE,'').match(PLAN_TIME); if(!m) return null;
  const n=parseFloat(m[2]); if(!(n>0)) return null;
  const sets=+(m[1]||m[4]||1);
  if(!(sets>0&&sets<=50)) return null;
  return {secs: Math.round(/^m/i.test(m[3])?n*60:n), sets};
}
/* The same hold, written notebook-style on one line. Requiring a complete
   exercise name before the duration prevents `60 sec rest` from becoming a
   lift. The caller still applies canHold(), so Squat is never turned into a
   hold merely because the sentence resembles one. */
function planReadInlineTime(line){
  const m=String(line).match(/^\s*(.*?[a-z][a-z0-9 '\/-]*?)\s*(?:\/|:|—|-)?\s+((?:(?:\d+)\s*[x×]\s*)?\d+(?:\.\d+)?\s*(?:s|sec|secs|second|seconds|m|min|mins|minute|minutes)\b(?:\s*(?:each|[x×]\s*\d+))?)\s*$/i);
  if(!m) return null;
  const time=planReadTime(m[2]);
  return time ? {name:planHeadClean(m[1]),time} : null;
}

/* These shapes need a richer model than a flat list of weight x reps. The
   safe behaviour is explicit preservation, not a plausible-looking partial
   plan. A later conditioning or set-technique model can promote them without
   changing what today's parser promised. */
const PLAN_BLOCK=/^\s*(?:super\s*set|superset|tri[- ]?set|giant\s+set|circuit|\d+\s+rounds?|e?mom|amrap|for\s+time)\b/i;
const PLAN_COMPLEX=/(?:\b(?:drop\s*set|rest[- ]?pause|amrap)\b|[x×]\s*\d+\s*[-–]\s*\d+|\b\d+\s*\+|\+\s*\d+(?:\.\d+)?\s*(?:lb|kg)\b|(?:→|->).*(?:lb|kg)|^\s*\d+\s*[x×]\s*\d+\s*(?:m|meter|metre)s?\b)/i;
/* strip a trailing "6 sets" and any "← coach note" tail from a heading */
const planHeadClean=t=>String(t).split(/[←<]-?|\/\/|\s{3,}#/)[0]
  .replace(/\b\d+\s*sets?\b/ig,'').replace(/[·|—–-]\s*$/,'').trim();

function parsePlan(text){
  const rows=[];
  let cur=null;
  const source=String(text||'').split(/\r?\n/);
  for(let at=0;at<source.length;at++){
    const raw=source[at];
    const line=raw.replace(/\t/g,' ').trimEnd();
    if(!line.trim()){ cur=null; continue; }
    const body=line.split(/←|<-/)[0].trim();
    if(PLAN_BLOCK.test(body)){
      const block=[raw];
      while(at+1<source.length&&source[at+1].trim()) block.push(source[++at]);
      rows.push({kind:'note',raw:block.join('\n')}); cur=null; continue;
    }
    const labeled=planSetLabel(body);
    const sets=planReadPrescription(labeled.body);
    if(sets&&cur){ cur.lines.push({...sets,tag:labeled.tag,raw:line}); continue; }
    if(sets&&!cur) { rows.push({kind:'note', raw:line}); continue; }
    /* v3.3.339: a whole exercise on one line. cur stays open afterwards, so a
       paste that puts the first set inline and the rest beneath still gathers
       them all into the one exercise. */
    /* a hold clings to the exercise above it rather than becoming a heading.
       Only while that exercise has no weight lines yet: if it has real sets,
       the duration is something else and stays a note of its own. */
    const _t=(cur && !cur.lines.length) ? planReadTime(body) : null;
    if(_t){
      /* v3.3.346 SLICE 4: now that a set can BE seconds (v3.3.343), a hold
         is a plan item rather than a consolation note -- but only for an
         exercise that may be held. "Squat 60 sec x 2" is still text: the
         parser proposes, it does not reinterpret what you train.
         sets x secs becomes one line of `sets` entries, each `secs` long,
         which is the same shape a weight line has: one number per set. */
      if(cur.ex && canHold(cur.ex)){
        cur.lines.push({w:0, bw:true, su:SET_SEC, unit:'',
                        reps:Array(_t.sets).fill(_t.secs), raw:body.trim()});
      }else{
        (cur.times=cur.times||[]).push(body.trim());
      }
      continue;
    }
    const inlineTime=planReadInlineTime(body);
    if(inlineTime){
      const hit=planCandidates(inlineTime.name);
      if(hit.match&&canHold(hit.match)){
        const t=inlineTime.time;
        cur={kind:'ex',raw:line,name:inlineTime.name,ex:hit.match,cands:[],lines:[{
          w:0,bw:true,su:SET_SEC,unit:'',reps:Array(t.sets).fill(t.secs),raw:line}]};
        rows.push(cur);
      }else rows.push({kind:'note',raw:line});
      continue;
    }
    if(PLAN_COMPLEX.test(body)){
      rows.push({kind:'note',raw:line}); cur=null; continue;
    }
    const inline=planReadInline(body);
    if(inline){
      const hit=planCandidates(inline.name);
      cur={kind:'ex', raw:line, name:inline.name, ex:hit.match, cands:hit.cands, lines:inline.lines};
      rows.push(cur); continue;
    }
    const name=planHeadClean(body);
    if(!name||!/[a-z]/i.test(name)){ rows.push({kind:'note', raw:line}); continue; }
    const {match,cands}=planCandidates(name);
    cur={kind:'ex', raw:line, name, ex:match, cands, lines:[]};
    rows.push(cur);
  }
  /* an exercise heading that never got a set line is a note, not a plan item —
     "Plank / 60 sec each" has nothing this app can prefill */
  const out=[];
  for(const r of rows){
    if(r.kind==='ex'&&!r.lines.length){
      r.kind='exnote';
      if(r.times&&r.times.length) r.raw=`${r.raw} \u2014 ${r.times.join(' \u00b7 ')}`;
      out.push(r);
    }else{
      out.push(r);
      /* it turned out to have real sets after all, so the hold is something
         else — hand it back untouched rather than swallowing it */
      if(r.kind==='ex'&&r.times) for(const t of r.times) out.push({kind:'note', raw:t});
    }
  }
  return out;
}
/* the accepted shape: one item per resolved exercise, weights stored in KG
   like every other weight in the app, unresolved text preserved verbatim */
function planItemsFrom(rows){
  /* v3.3.280: EVERY weight line is kept. The first version took only the last
     line — "the working set, not the warm-up" — which meant a paste saying
     "6 sets" produced a plan showing 4, and the two warm-up sets the user
     typed were read and then thrown away. Silently discarding input the
     parser understood is worse than failing to parse it: the preview says
     it read the line, and then it is gone. A plan holds the session as
     written; warm-ups are part of the session. */
  const items=[], notes=[];
  for(const r of rows){
    if(r.kind==='ex'&&r.ex){
      const lines=r.lines.map(l=>({
        /* v3.3.393: a BW line's weight is the ADDED load and must convert
           like any other. Zeroing it here threw away the belt: "BW +10"
           parsed correctly and still arrived as a plain bodyweight set. */
        w: (l.unit==='kg'?l.w:l.unit==='lb'?l.w/LB:toKg(l.w)),
        bw: !!l.bw,
        ...(l.nw?{nw:true}:{}),          // v3.3.394: no load named, plan only
        ...(l.est?{est:true}:{}),        // v3.3.399: a guessed load, marked \u2248
        ...(isHold(l.su)?{su:SET_SEC}:{}),
        reps: l.reps.slice(0,12)
      })).filter(l=>l.reps.length);
      if(lines.length) items.push({ex:r.ex, lines});
    }else notes.push(r.raw);
  }
  return {items, note:notes.join('\n')};
}
/* one flat list of {w,r} across an item's weight lines — the shape the
   Suggested chips consume, in the order they were written */
/* v3.3.281: does TODAY'S LEDGER contain this exercise? The plan row shows a
   tick when it does. Note the direction of the question — it reads the
   record and reports a fact, it does not measure the record against the
   plan. There is deliberately no count, no fraction and no percentage built
   on top of this: one row, one fact, exactly like the Last time card's tick. */
const planLoggedToday=ex=>((DB.days[todayISO]||{}).w||[])
  .some(x=>x.ex===ex&&(x.reps||[]).length);
/* v3.3.346: holds are skipped. These chips log a complete weight x reps pair
   in one tap, and a hold is neither -- the same reason v3.3.343 suppressed
   the Suggested strip for a held exercise. */
const planSets=i=>(i.lines||[]).filter(l=>!isHold(l.su)).flatMap(l=>l.reps.map(r=>({w:l.w, r, ...(l.est?{est:true}:{})})));
/* v3.3.349: how many sets of THIS line are already in today's record. A fact
   read out of the ledger, exactly like the per-row tick v3.3.281 permitted:
   "this exercise is logged" is a fact; a fraction of the plan is a verdict.
   The number is used ONE LINE AT A TIME to decide which numerals have been
   spent, and is never summed across a plan, shown as a total, or compared to
   anything. Nothing is ever written back -- the plan reads the record and the
   record does not know the plan exists (buildcheck enforces both).
   Matched on weight, within a tolerance smaller than the smallest plate the
   app knows about, because the ledger stores kg and a plan may have arrived
   in lb. A held line matches held sets and a weighted line matches weighted
   ones, so 60 seconds never cancels a set of 8. */
/* v3.3.367: A HEAVIER SET SATISFIES A LIGHTER PLAN. v3.3.349 matched on an
   EXACT weight, so a plan of 30 lb dimmed nothing when the maker did 35 --
   he had plainly done the work and the card said otherwise. The rule is now
   "at that weight OR HEAVIER", which is what he meant by planning it.
   Reps are still ignored, deliberately. Requiring reps too would turn the
   card into a pass/fail test of the session, which is the thing v3.3.278 and
   v3.3.281 built guards against. Weight alone keeps it a fact: you have
   lifted at least this, this many times.
   ALLOCATED, NOT COUNTED PER LINE, which is why this replaces a per-line
   function. Under a plain >=, one set at 35 would satisfy a 20 line AND a 35
   line -- two dimmed sets from one set of work. Each logged set is spent
   once: planned entries are taken HEAVIEST FIRST and given the lightest
   logged set that covers them, so a 35 lands on the 35 line rather than
   being eaten by the 20 beneath it, and the count can never exceed the work.
   Holds and weighted sets are allocated in separate pools -- 60 seconds is
   not "heavier than" 30 lb, and the two must never satisfy each other. */
function planSpentMap(item){
  const lines=item.lines||[];
  const out=lines.map(()=>0);
  const want=[];
  lines.forEach((l,i)=>(l.reps||[]).forEach(()=>
    want.push({i, hold:isHold(l.su), w:+l.w||0})));
  const have=[];
  for(const s of ((DB.days[todayISO]||{}).w||[]))
    if(s.ex===item.ex) (s.reps||[]).forEach(()=>
      have.push({hold:isHold(s.su), w:+s.w||0, used:false}));
  for(const kind of [false,true]){
    const need=want.filter(x=>x.hold===kind).sort((a,b)=>b.w-a.w);   // heaviest first
    const pool=have.filter(x=>x.hold===kind).sort((a,b)=>a.w-b.w);   // lightest sufficient
    for(const nd of need){
      const hit=pool.find(h=>!h.used && h.w+0.06>=nd.w);
      if(!hit) continue;
      hit.used=true; out[nd.i]++;
    }
  }
  return out;
}
/* v3.3.309: rubber-band and pull-to-refresh move the SCROLLING VIEW, never
   <body>. A transformed element becomes the containing block for its
   fixed-position descendants — so while body carried a translate, the nav
   stopped being pinned to the viewport and rode the page down (the maker's
   "menu bar follows the content"). #view is a sibling of nav, header and
   toast, so shifting it gives the identical gesture and leaves every fixed
   thing fixed. */
function pageShift(v){ const m=document.getElementById('view'); if(m) m.style.transform=v; }
const PART_COLD_DAYS=21;
function trainingPlan(){
  const dp=dayParts();
  const byPart={};
  for(const [d,set] of Object.entries(dp))
    for(const p of set) (byPart[p]=byPart[p]||[]).push(d);

  /* v3.3.275: a SESSION is not a CAMEO. The planner's clocks used day-level
     membership with no notion of dose, so three Lateral Raise sets riding on
     a Chest day reset Shoulder's rotation clock exactly like a 21-set
     Shoulder session, and the cameo days compressed its median gap. The
     maker hit it precisely: emphasising shoulders as a SECONDARY made the
     app recommend them LESS — the harder the emphasis, the deeper the skip.
     Rule: a day counts as a full session of a part only when its dose that
     day reaches half the part's own median daily sets (floor 2). Self-
     calibrating — a 14-set-median Shoulder ignores 3-set cameos; a 3-set-
     median Sixpack keeps every day, because small IS its full dose. The
     LEDGER is untouched: chips, Stats and coverage still count every set
     (since/last stay ledger truth); only sinceF/gapF — what the rotation
     scores by — learn the difference. A part with no full days on record
     keeps its old clock rather than vanishing. */
  const info={};
  for(const [p,days] of Object.entries(byPart)){
    days.sort();
    const gaps=[];
    for(let i=1;i<days.length;i++) gaps.push(daysBetween(days[i-1],days[i]));
    const doses=days.map(d=>partDoseOn(d,p));
    const doseFloor=fullDoseFloor(p,days);
    const fdaysRaw=days.filter((d,i)=>doses[i]>=doseFloor);
    const fdays=(p!=='Run'&&fdaysRaw.length)?fdaysRaw:days;
    const fgaps=[];
    for(let i=1;i<fdays.length;i++) fgaps.push(daysBetween(fdays[i-1],fdays[i]));
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
      sinceF:daysAgo(fdays[fdays.length-1]),
      gapF:Math.max(1,median(fgaps)||7),
      soloRate: p==='Run' ? 1 : lifts/liftDays,
      live: days.length>=8
    };
  }
  /* v3.3.249: one authority for the rotation — myPartsSet() — so Settings,
     Train and Today cannot disagree. History still wins: a part you trained
     before switching it off keeps its entry, which is what makes the switch
     non-destructive. */
  const myp=myPartsSet();
  const allow=p=>p==='Run'||myp.has(p);
  for(const p of Object.keys(SEED.catalog))
    if(allow(p)&&!info[p]){const s0=SEED.partLast[p]?daysAgo(SEED.partLast[p]):999;
      info[p]={days:0,last:SEED.partLast[p]||null,since:s0,gap:7,sinceF:s0,gapF:7,soloRate:0,live:false};}

  /* v3.3.249: a part switched OFF leaves the rotation even if it has history —
     that is the whole point of the switch, and the ledger is untouched (Stats
     and History still show every set). Two exceptions keep it from ever
     trapping anyone: Run is never hidden, and a part trained TODAY stays
     visible so a switch flipped mid-session cannot strand an open set. */
  const todayParts=new Set(((DB.days[todayISO]||{}).w||[]).map(s=>s.part));
  for(const p of Object.keys(info))
    if(p!=='Run'&&!myp.has(p)&&!todayParts.has(p)) delete info[p];

  const score=p=>info[p].sinceF/info[p].gapF;   // full sessions drive the rotation
  const live=Object.keys(info).filter(p=>info[p].live&&p!=='Run');
  const mains=live.filter(p=>info[p].soloRate>=0.4).sort((a,b)=>score(b)-score(a));
  const addons=live.filter(p=>info[p].soloRate<0.4).sort((a,b)=>score(b)-score(a));
  const dormant=Object.keys(SEED.catalog).filter(p=>p!=='Run'&&info[p]&&!info[p].live);

  /* v3.3.248 — COLD START. `live` needs eight logged days of a part before
     the app will speak about it, which is the right bar for a CADENCE claim
     ("usually every 6d") and the wrong bar for recommending anything at all.
     Below it, mains was empty, pick was null, and Today simply showed no
     suggestion — so a user six sessions in, the exact moment "what do I train
     today?" matters most, got nothing. Invisible to anyone with history:
     every part passed the bar years ago.
     The fallback ranks the non-live parts by the SAME since/gap score that is
     already computed for them. A part never trained carries since=999, so it
     sorts first, which is also the honest answer for a new lifter: train the
     thing you have not touched. Onboarding's myParts still bounds the set,
     and Run is never a lifting pick. */
  const catOrder=Object.keys(SEED.catalog);
  const coldMains=Object.keys(info)
    .filter(p=>p!=='Run'&&!info[p].live&&allow(p))
    /* never-trained parts all score 999/7 and would otherwise tie on object
       key order; catalog order is the same order the Train tab lists them in,
       so the two screens agree on what comes first. */
    .sort((a,b)=>score(b)-score(a)||catOrder.indexOf(a)-catOrder.indexOf(b));
  const pick=mains[0]||coldMains[0]||null;
  // an add-on is worth suggesting only if it's overdue on its own cycle
  const addon=addons.find(p=>score(p)>=1)||null;
  const run=info['Run']||null;
  return {info,score,mains,addons,dormant,coldMains,pick,addon,run};
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
/* v3.3.208: COMPLETED SETS per part per training day, newest last. The old
   chart summed weight × reps across Smith machines, free weights, dumbbells,
   barbells and selectorised machines. The arithmetic was consistent, but the
   total was not a comparable physical quantity. One block now means exactly
   one logged set, regardless of equipment. Run remains separate: distance is
   already told honestly elsewhere and has no meaningful set equivalent. */
const PART_COLORS={Chest:'var(--p-chest)',Back:'var(--p-back)',Shoulder:'var(--p-shoulder)',
  Legs:'var(--p-legs)',Biceps:'var(--p-biceps)',Triceps:'var(--p-triceps)',
  Sixpack:'var(--p-sixpack)',Run:'var(--p-run)'};
function partMix(days, mode){
  /* v3.3.277: a second READING of the same days — mode 'weight' stacks
     weight x reps per part, in the display unit. The v3.3.208 decision
     stands: mixed tonnage "was not a comparable physical quantity", so one-
     block-one-set remains the chart's default identity; weight is an opt-in
     view behind the toggle, never the headline. Both modes come from this
     one builder so the days, the parts and the colours can never diverge.
     Bodyweight rows contribute added-weight only (w x reps), the same
     arithmetic every other volume figure in the app uses. Rows can be plain
     objects (DB.days) or seed arrays [part,ex,w,reps]; read both shapes. */
  const out=[], iso=[...workoutDates()].sort();
  const take=iso.slice(-Math.max(1,days));
  const kg=mode==='weight';
  for(const d of take){
    const w=(DB.days[d]||{}).w||(SEED.sessions[d]||[]);
    const by={};
    for(const s of w){
      const row=Array.isArray(s)?{part:s[0],ex:s[1],w:s[2],reps:s[3]}:s;
      const p=row.part||'—';
      if(p==='Run'||row.ex==='Run') continue;
      /* Folded historical rows store several sets in one reps array; current
         logs usually store one. Length is the one representation-independent
         count, so [12,10,10,8] and four one-rep-array rows both add four. */
      const reps=row.reps||[];
      const v=kg ? toU((row.w||0)*reps.reduce((a,b)=>a+b,0))
                 : reps.length;
      if(v>0) by[p]=(by[p]||0)+v;
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
/* v3.3.213: the three time horizons on Stats share honest calendar data.
   Monthly pace compares every month through the same ordinal day; the
   year race compares this year and last year only, both ending on today's
   month/day. Neither projects an unfinished period. */
function monthlyPaceData(n=12){
  const dates=workoutDates(),dom=+todayISO.slice(8),base=new Date(todayISO+'T00:00');
  base.setDate(1);
  const months=[];
  for(let off=n-1;off>=0;off--){
    const d=new Date(base); d.setMonth(d.getMonth()-off);
    const key=d.toLocaleDateString('en-CA').slice(0,7);
    const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
    const cutoff=Math.min(dom,last);
    let days=0,total=0;
    for(const iso of dates) if(iso.startsWith(key)){
      total++; if(+iso.slice(8)<=cutoff) days++;
    }
    months.push({key,days,total,cutoff,current:key===todayISO.slice(0,7)});
  }
  return {months,day:dom};
}
/* v3.3.232 — the race cards can speak in shares as well as totals.
   A total answers "how much"; a share answers "how far through". They are
   different questions and the maker wanted both, so the numbers toggle on tap
   rather than the app choosing one. The denominator differs by card because
   the honest denominator differs:
     Consistency — days elapsed in the year so far. 140 of 226 days is 62%,
       the same figure the retired KPI cards used to print.
     Distance — LAST YEAR'S FINISHED TOTAL. 476 km against a 520 km 2025 is
       92%: "nearly a whole previous year, and it is only August." A share of
       days elapsed would be meaningless for kilometres, and a share of the
       current year cannot be computed without predicting the rest of it.
   The preference is one setting, so the whole Stats tab speaks in one unit. */
/* v3.3.265 — reading the Pace chart by touch.
   All nine monthly points print their values directly; dragging adds the full
   month and year and rings the exact point. Nearest point by SCREEN x — pace is a one-per-month
   series, so horizontal distance is the whole question and vertical distance
   would only add noise. Same gesture grammar as the other charts:
   touch-action:none, and the reading STAYS after release so a finger is not
   covering what it found. (Until v3.3.356 this surface also had to sit on the
   tab-swipe blocklist; that gesture is gone and so is the list.) */
function paceNear(svg,clientX){
  const pts=[...svg.querySelectorAll('.pacepoint')];
  if(!pts.length) return null;
  const box=svg.getBoundingClientRect();
  const vb=(svg.getAttribute('viewBox')||'0 0 1 1').split(/\s+/).map(Number);
  const sx=box.width/(vb[2]||1);
  let best=null,bd=Infinity;
  for(const p of pts){
    const px=box.left+(+p.getAttribute('cx'))*sx, d=Math.abs(px-clientX);
    if(d<bd){bd=d;best=p;}
  }
  return best;
}
function paceShow(svg,pt){
  if(!svg||!pt) return;
  const halo=svg.querySelector('.pacehalo'), v=svg.querySelector('.pacevline');
  const cx=pt.getAttribute('cx'), cy=pt.getAttribute('cy');
  if(halo){ halo.setAttribute('cx',cx); halo.setAttribute('cy',cy); halo.setAttribute('opacity','1'); }
  if(v){ v.setAttribute('x1',cx); v.setAttribute('x2',cx); v.setAttribute('opacity','.9'); }
  const cap=svg.parentNode&&svg.parentNode.querySelector('[data-pacecap]');
  if(!cap) return;
  const m=pt.dataset.pm, sec=+pt.dataset.pp;
  const d=new Date(+m.slice(0,4),+m.slice(5,7)-1,1);
  cap.innerHTML=`${d.toLocaleDateString('en-US',{month:'short',year:'numeric'})} \u00b7 <b>${paceStr(sec)}</b> / ${DU()}`;
}
function paceClear(svg){
  if(!svg) return;
  const halo=svg.querySelector('.pacehalo'), v=svg.querySelector('.pacevline');
  if(halo) halo.setAttribute('opacity','0');
  if(v) v.setAttribute('opacity','0');
  const cap=svg.parentNode&&svg.parentNode.querySelector('[data-pacecap]');
  if(cap) cap.innerHTML='&nbsp;';
}
function bindPaceScrub(svg){
  if(!svg||svg._paceBound) return; svg._paceBound=1;
  let down=false;
  const at=e=>paceNear(svg,e.clientX);
  svg.addEventListener('pointerdown',e=>{
    if(e.isPrimary===false) return;
    down=true;
    if(svg.setPointerCapture&&e.pointerId!=null){ try{svg.setPointerCapture(e.pointerId);}catch(_){} }
    const p=at(e);
    if(p&&svg.querySelector('.pacehalo')&&svg.querySelector('.pacehalo').getAttribute('opacity')==='1'
       &&svg.querySelector('.pacehalo').getAttribute('cx')===p.getAttribute('cx')){
      paceClear(svg); down=false; return;      // press the shown point to dismiss
    }
    paceShow(svg,p);
  });
  svg.addEventListener('pointermove',e=>{ if(!down) return; e.preventDefault(); paceShow(svg,at(e)); });
  svg.addEventListener('pointerup',()=>{ down=false; });
  svg.addEventListener('pointercancel',()=>{ down=false; });
}
function bindPaceAll(){ document.querySelectorAll('.pacescrub').forEach(bindPaceScrub); }
/* v3.3.243: the header is position:fixed (it must be — see css/app.css), so
   it no longer occupies flow space and #app reserves its height through
   --hdr-h. Measured rather than hard-coded, because the bar grows and shrinks:
   the safe-area inset varies by device, exercise mode enlarges the title, and
   a long name wraps nothing but still changes nothing. Kept in sync by a
   ResizeObserver so a state change cannot leave a gap or a covered first row. */
/* v3.3.247: iOS 26 fades the top ~100pt of a standalone web app's content.
   Safari does not — verified by screenshotting the same page both ways. The
   fade cannot be turned off, so the header grows enough padding to start its
   content below it, but ONLY where the problem exists:
     - standalone (Safari is unaffected, and desktop has no status bar), and
     - the page still sits under the status bar (a non-zero safe-area inset).
   The second condition matters: v3.3.246 set the status-bar style to default,
   which insets the web view instead — but iOS captures that meta when the
   icon is ADDED to the home screen, so an already-installed app keeps the old
   behaviour until it is re-added. This guard covers that installed app today,
   and switches itself off the moment the inset reports zero. */
function edgeFadeGuard(){
  const de=document.documentElement;
  const standalone=(matchMedia&&matchMedia('(display-mode: standalone)').matches)
    || navigator.standalone===true;
  const sat=parseFloat(getComputedStyle(de).getPropertyValue('--sat'))||0;
  if(standalone&&sat>0) de.dataset.edgefade='1'; else delete de.dataset.edgefade;
}
addEventListener('orientationchange',()=>setTimeout(edgeFadeGuard,120));
function syncHeaderHeight(){
  const h=document.querySelector('header');
  if(!h) return;
  const px=Math.round(h.getBoundingClientRect().height);
  if(px>0) document.documentElement.style.setProperty('--hdr-h',px+'px');
}
let _hdrRO=null;
function watchHeaderHeight(){
  const h=document.querySelector('header');
  if(!h||_hdrRO||typeof ResizeObserver==='undefined') return;
  _hdrRO=new ResizeObserver(()=>syncHeaderHeight());
  _hdrRO.observe(h);
}
addEventListener('resize',()=>syncHeaderHeight());
addEventListener('orientationchange',()=>setTimeout(syncHeaderHeight,120));
const raceShares=()=>!!DB.settings.raceShare;
/* v3.3.233: ONE formatter for the race scoreboard, used by the unit toggle
   AND by the scrubber. Both write the same <b> nodes, so if they disagreed
   the numbers would silently change unit mid-drag. Everything it needs is
   parked on the card as data attributes at build time — raw totals and the
   denominator — which is also what lets the toggle rewrite the scoreboard in
   place instead of re-rendering the tab and throwing away the scroll. */
const raceCanShare=card=>raceShares()&&+card.dataset.denom>0;
const raceNum=(card,v)=>raceCanShare(card)
  ? Math.round(v/+card.dataset.denom*100)+'%'
  : String(Math.round(v));
function raceGapHTML(card,curV,prevV){
  if(raceCanShare(card)){
    const den=+card.dataset.denom;
    const g=Math.round(curV/den*100)-Math.round(prevV/den*100);
    return g>0?`+${g} pts<small>ahead</small>`
         :g<0?`${Math.abs(g)} pts<small>behind</small>`
             :`Even<small>same date</small>`;
  }
  const g=curV-prevV, u=card.dataset.gapUnit||'days';
  const n=Math.round(Math.abs(g));
  const unit=u==='days'?` day${n===1?'':'s'}`:` ${u}`;
  return g>0?`+${n}${unit}<small>ahead</small>`
       :g<0?`${n}${unit}<small>behind</small>`
           :`Even<small>same date</small>`;
}
/* rewrite one card's scoreboard from its own stored numbers */
function raceApplyUnit(card){
  const cur=+card.dataset.cur||0, prev=+card.dataset.prev||0;
  const share=raceCanShare(card);
  const cy=card.dataset.currentYear, py=card.dataset.previousYear;
  const set=(yr,v)=>{const b=card.querySelector(`[data-con-count="${yr}"]`); if(b) b.textContent=raceNum(card,v);};
  set(cy,cur); set(py,prev);
  card.querySelectorAll('[data-con-unit]').forEach(u=>{
    u.textContent=share?card.dataset.unitShare:card.dataset.unitTotal;
  });
  const gap=card.querySelector('[data-con-gap]');
  if(gap){ gap.innerHTML=raceGapHTML(card,cur,prev); gap.classList.toggle('up',cur-prev>=0); }
  const sw=card.querySelector('[data-raceswap]');
  if(sw) sw.setAttribute('aria-label',`Show ${share?'totals':'share'} instead`);
}
function raceApplyAll(){ document.querySelectorAll('.conrace').forEach(raceApplyUnit); }
function daysElapsedThisYear(){
  const y=+todayISO.slice(0,4);
  return Math.max(1,daysBetween(new Date(y,0,1).toLocaleDateString('en-CA'),todayISO)+1);
}
/* every workout day of a finished year — the Distance denominator's sibling,
   kept here so both cards derive their share the same way */
function yearTotalKm(y){
  /* ONE row set per date. A logged day appears in BOTH DB.days and (after
     deriveAll) SEED.sessions, so summing the two sources counted every run
     twice and halved every share. DB.days wins per date, exactly as every
     other reader in the app resolves it. */
  const pre=String(y);
  const dates=new Set([...Object.keys(SEED.sessions||{}),...Object.keys(DB.days)]
    .filter(iso=>iso.slice(0,4)===pre));
  let km=0;
  for(const iso of dates){
    const rows=(DB.days[iso]||{}).w;
    if(rows) { for(const s of rows) if(s.ex==='Run') km+=+s.w||0; }
    else for(const r of (SEED.sessions[iso]||[])) if(r[1]==='Run') km+=+r[2]||0;
  }
  return km;
}
function consistencyRaceData(){
  const dates=workoutDates(),year=+todayISO.slice(0,4),month=+todayISO.slice(5,7)-1,day=+todayISO.slice(8);
  /* v3.3.214: both curves share one calendar-day timeline. Besides making
     the race an honest same-date comparison, this gives the scrubber one
     exact index for both years (including when only one year is a leap
     year). A missing Feb 29 carries Feb 28 forward; it is never counted
     twice. */
  const timeline=[],stop=new Date(year,month,day),cursor=new Date(year,0,1);
  while(cursor<=stop){ timeline.push([cursor.getMonth(),cursor.getDate()]); cursor.setDate(cursor.getDate()+1); }
  const make=y=>{
    const curve=[]; let total=0,lastISO='';
    for(const [m,d] of timeline){
      const last=new Date(y,m+1,0).getDate();
      const iso=new Date(y,m,Math.min(d,last)).toLocaleDateString('en-CA');
      if(iso!==lastISO&&dates.has(iso)) total++;
      curve.push(total); lastISO=iso;
    }
    return {year:String(y),curve,total};
  };
  const current=make(year),previous=make(year-1);
  const hasPrevious=[...dates].some(iso=>iso.startsWith(previous.year+'-'));
  const label=new Date(year,month,day).toLocaleDateString('en-US',{month:'short',day:'numeric'});
  return {current,previous,hasPrevious,label,gap:current.total-previous.total,days:timeline.length};
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
