/* ShowUp â€” util.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- rubber-band at the bottom ----------
   iOS gives a native bounce; disabling it for pull-to-refresh killed it everywhere.
   This restores the feel at the bottom edge: drag past the end and the content
   stretches with diminishing returns (Ã·2.6), then springs back with a slight
   overshoot. Purely visual â€” no scroll state is touched. */
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
   Horizontal swipe moves along the nav: Today â†” Lift â†” Stats â†” History.
   Deliberately inert inside an exercise/part drill-down (the back button owns
   that axis) and over any horizontally scrollable strip (suggested chips,
   heatmap) or zoomable chart, so it never steals a legitimate gesture. */
(()=>{
  const TABS=['today','lift','stats','history'];
  let sx=0, sy=0, tracking=false, decided=false, horiz=false, popMode=false;
  /* v3.3.140: modals mounted on <body>, OUTSIDE #app. This gesture listens
     globally, so a swipe inside an open overlay was tracked here in parallel
     with the overlay's own handler â€” the share image rotated AND the page
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
                   t.closest('.lbwrap')||     // v3.3.164: scrubbing the live bars is not a tab swipe
                   t.closest(MODALS)||        // v3.3.140: and nothing under a modal moves
                   t.closest('.compscroll')||  // sideways-scrolling chart owns its axis
                   t.closest('.rzlifts')||     // v3.3.189: the rep-zone lift rail scrolls sideways too
                   t.closest('.rzscat');       // v3.3.206: dragging the scatter reads it, never changes tab
  addEventListener('touchstart',e=>{
    if(e.touches.length!==1||view==='sync') return;
    if(blocked(e.target)) return;
    // v3.1.3 (Sungjee): inside a drill-down, a horizontal swipe means BACK â€”
    // either direction. Tabs are one pop away; you can't tab-hop out of a lift.
    popMode=(view==='lift'&&!!lift.ex);
    sx=e.touches[0].clientX; sy=e.touches[0].clientY;
    tracking=true; decided=false; horiz=false;
  },{passive:true});
  const hint=()=>document.getElementById('swipehint');
  const showHint=dx=>{
    const el=hint(); if(!el) return;
    if(popMode){                                           // back-pop: â€¹ on the left edge, both directions
      el.className='l on';
      el.firstElementChild.textContent='â€¹';
      el.title=lift.part||'Train';
      el.style.setProperty('--p',Math.min(1,Math.abs(dx)/90));
      el.firstElementChild.style.opacity=(0.35+0.65*Math.min(1,Math.abs(dx)/90)).toFixed(2);
      return;
    }
    const goingNext=dx<0;                                  // swipe left â†’ next tab
    const i=TABS.indexOf(view);
    const j=(i+(goingNext?1:-1)+TABS.length)%TABS.length;
    // the arrow points the way you're dragging; it lives on the edge you're heading toward
    el.className=(goingNext?'r':'l')+' on';
    el.firstElementChild.textContent=goingNext?'â€º':'â€¹';
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
    const j=(i+(dx<0?1:-1)+TABS.length)%TABS.length;       // wraps: History â‡„ Today
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
     landed ~7px from the top edge â€” a white circle parked behind the island,
     Sungjee's mystery blob. Hide by the element's own height + inset. */
  const satEl=getComputedStyle(document.documentElement).getPropertyValue('--sat');
  const SAT=parseFloat(satEl)||0;
  const HIDE=-(58+SAT);
  let y0=null, pulling=false, dist=0, fired=false;
  addEventListener('touchstart',e=>{
    if(fired) return;
    if(scrollY>0){y0=null;return;}
    // v3.3.140: same hole as the tab-swipe had â€” dragging DOWN on an open
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
    // the page itself follows the finger â€” that's the feedback a tiny arrow can't give
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
    try{ if(session) await cloudPushNow(); }catch(e){}    // phone â†’ cloud, synchronously
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
   back up and already restore â€” bodyweight rides along for free, and there is
   no second structure to drift out of step with the first.

   Why this replaces a scalar: DB.settings.bodyKg had no history, so a Pull Up
   logged in 2024 was valued at TODAY's bodyweight. bwAt() values it at the
   weight in force on the day it happened.

   bodyKg SURVIVES as the derived CURRENT value so every existing consumer
   (lift.js:326, loadLine) keeps working untouched.

   A weigh-in day carrying no sets stays invisible to deriveAll(), which skips
   days with no rows â€” recording weight can never inflate the day count. */
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
/* user-entered text lands in innerHTML â€” escape it once, here. */
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
   it â€” so Deadlift-on-Legs appears under Legs and only Legs. */
const catFor=part=>[
  ...SEED.catalog[part].filter(ex=>!(DB.settings.partOv&&DB.settings.partOv[ex]&&DB.settings.partOv[ex]!==part)),
  ...Object.entries(customs()).filter(([,c])=>c.part===part).map(([n])=>n),
  ...Object.entries(DB.settings.partOv||{}).filter(([ex,p])=>p===part&&SEED0.ex2part[ex]!==part).map(([ex])=>ex)];
const equipOf=ex=>customs()[ex]?.equip || SEED.equip[ex] || 'machine';
const EQUIP_LABEL={barbell:'Barbell (bar + plates)',smith:'Smith machine',dumbbell:'Dumbbell (per hand)',
  cable:'Cable',machine:'Machine',body:'Bodyweight'};

/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
/* v3.3.104: every log path says the same sentence. Confirmation belongs at
   the point of ACTION â€” a toast is visible wherever you are scrolled, which
   the Logged Today grid is not once a session runs long. One of the three
   log paths already toasted; the other two didn't, and none handled BW. */
function setToast(ex,w,r){
  toast(`${isBody(ex)&&w<=0.01?'BW':wDisp(w)+U()} Ã— ${r} logged`);
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
   excluding today â€” today is the thing being measured). Runs measure km. */
let _avgVol=null;
function avgSessionVol(part){
  if(!_avgVol){
    _avgVol={};
    const acc={};
    const feed=per=>{ for(const [p,v] of Object.entries(per)){ const a=acc[p]=acc[p]||{s:0,n:0}; a.ãMû¶‰žËkºwµçx!¥ÍÑ½Éä¸¹‘…åÌ¥ÌÑ¡”Í½ÕÉ”½˜(€€¼¼ÑÉÕÑ è¥ÐIA1L¸€¡M¹Í•ÍÍ¥½¹ÌÍÑ¥±°™¥±±Ì…¹ä‘•É¥Ù•µ½¹±ä•‘”°…¹(€€¼¼Ñ½‘…ä½µ•Ì™É½´¹‘…åÌ…Ì…±Ý…åÌ¸¤(€½¹ÍÐ½ÕÐõíôì(€™½È¡½¹ÍÐm±±¥ÍÑt½˜=‰©•Ð¹•¹ÑÉ¥•Ì¡M¹Í•ÍÍ¥½¹Ì¤¤(€€€½ÕÑm‘tõ±¥ÍÐ¹µ…À ¡mÁ…ÉÐ±•à±Ü±É•ÁÌ±µ¥¹Ì±Í•Ít¤ôø¡íÁ…ÉÐ±•à±Ü±É•ÁÌ±µ¥¹Ì±Í•Íô¤¤ì(€™½È¡½¹ÍÐm±Ùt½˜=‰©•Ð¹•¹ÑÉ¥•Ì¡¹‘…åÌ¤¤(€€€¥˜¡Ø¹Ü˜™Ø¹Ü¹±•¹Ñ ¤½ÕÑm‘tõØ¹Üì(€É•ÑÕÉ¸½ÕÐì)ô)™Õ¹Ñ¥½¸±…ÍÑ½È¡•à¥ì(€½¹ÍÐµ¥¹”õ=‰©•Ð¹•¹ÑÉ¥•Ì¡¹‘…åÌ¤¹™¥±Ñ•È ¡m±Ùt¤ôùØ¹Ü¹Í½µ”¡ÌôùÌ¹•àôôõ•à¤¤¹Í½ÉÐ ¡„±ˆ¤ôù…lÁtñ‰lÁtüÄè´Ä¥lÁtì(€½¹ÍÐÍ••õM¹±…ÍÑm•átì(€¥˜¡µ¥¹”˜˜ …Í••‘ññµ¥¹•lÁtùÍ••¹¤¤(€€€É•ÑÕÉ¸íéµ¥¹•lÁt±Í•ÑÌéµ¥¹•lÅt¹Ü¹™¥±Ñ•È¡ÌôùÌ¹•àôôõ•à¤¹µ…À¡ÌôùmÌ¹Ü±Ì¹É•ÁÌ±Ì¹µ¥¹Ì±Ì¹Í•Ít¥ôì(€É•ÑÕÉ¸Í••‘ññ¹Õ±°ì)ô)™Õ¹Ñ¥½¸ÁÉ½È¡•à¥ì(€½¹ÍÐÀõM¹ÁÉm•átýì¸¸¹M¹ÁÉm•áuôéíµÜèÀ±µÝÈèÀ±µÝèœœ±‰ØèÀ±‰ÙÈèÀ±‰ÙÜèÀ±‰Ùèœôì(€™½È¡½¹ÍÐm±Ùt½˜=‰©•Ð¹•¹ÑÉ¥•Ì¡¹‘…åÌ¤¤(€€€™½È¡½¹ÍÐÌ½˜Ø¹Ü¥ì(€€€€€¥˜¡Ì¹•à„ôõ•áñð…Ì¹É•ÁÌ¹±•¹Ñ ¤½¹Ñ¥¹Õ”ì(€€€€€½¹ÍÐµÈõ5…Ñ ¹µ…à ¸¸¹Ì¹É•ÁÌ¤ì(€€€€€¥˜¡Ì¹ÜùÀ¹µÝñð¡Ì¹ÜôôõÀ¹µÜ˜™µÈùÀ¹µÝÈ¤¥íÀ¹µÜõÌ¹ÜíÀ¹µÝÈõµÈíÀ¹µÝõíô(€€€€€™½È¡½¹ÍÐÈ½˜Ì¹É•ÁÌ¤€€€€€€€€€€€€€€€€€€€€€€€¼¼‰•ÍÐÍ¥¹±”Í•ÐèÝ•¥¡Ðƒ\É•ÁÌ°½¹”Í•Ð(€€€€€€€¥˜¡Ì¹Ü©ÈùÀ¹‰Ø¥íÀ¹‰ØõÌ¹Ü©ÈíÀ¹‰ÙÈõÈíÀ¹‰ÙÜõÌ¹ÜíÀ¹‰Ùõíô(€€€ô(€É•ÑÕÉ¸Àì)ô)™Õ¹Ñ¥½¸Á…ÉÑ1…ÍÑM••¸ ¥ì(€½¹ÍÐÍ••¸õì¸¸¹M¹Á…ÉÑ1…ÍÑôì(€™½È¡½¹ÍÐm±Ùt½˜=‰©•Ð¹•¹ÑÉ¥•Ì¡¹‘…åÌ¤¤(€€€™½È¡½¹ÍÐÌ½˜Ø¹Ü¤(€€€€€¥˜¡Ì¹Á…ÉÐ˜˜ …Í••¹mÌ¹Á…ÉÑuññùÍ••¹mÌ¹Á…ÉÑt¤¤Í••¹mÌ¹Á…ÉÑtõì(€É•ÑÕÉ¸Í••¸ì)ô(¼¨‘…ä€´øM•Ð¡Á…ÉÑÌ¤°±…ÍÐ€ÌØÕ°Í••€¬±½•€¨¼)™Õ¹Ñ¥½¸‘…åA…ÉÑÌ ¥ì(€½¹ÍÐ´õíôì(€™½È¡½¹ÍÐmÀ±±¥ÍÑt½˜=‰©•Ð¹•¹ÑÉ¥•Ì¡M¹Á…ÉÑ…åÍññíô¤¤(€€€™½È¡½¹ÍÐ½˜±¥ÍÐ¤€¡µm‘tõµm‘uññ¹•ÜM•Ð ¤¤¹…‘¡À¤ì(€™½È¡½¹ÍÐm±Ùt½˜=‰©•Ð¹•¹ÑÉ¥•Ì¡¹‘…åÌ¤¤(€€€™½È¡½¹ÍÐÌ½˜Ø¹Ü¤¥˜¡Ì¹Á…ÉÐ¤€¡µm‘tõµm‘uññ¹•ÜM•Ð ¤¤¹…‘¡Ì¹Á…ÉÐ¤ì(€É•ÑÕÉ¸´ì)ô)™Õ¹Ñ¥½¸µ•‘¥…¸¡„¥ì¥˜ …„¹±•¹Ñ ¤É•ÑÕÉ¸€Àì½¹ÍÐÌõl¸¸¹…t¹Í½ÉÐ ¡à±ä¤ôùàµä¤ì½¹ÍÐ¤õÌ¹±•¹Ñ øøÄì(€É•ÑÕÉ¸Ì¹±•¹Ñ ”È€üÍm¥t€è€¡Ím¤´Åt­Ím¥t¤¼Èìô((¼¨]¡…ÐÑ¼ÑÉ…¥¸¹•áÐ°±•…É¹•™É½´¡¥ÍÑ½Éäè(€€€´„Á…ÉÐ½Õ¹ÑÌ…Ì€‰±¥Ù”ˆ½¹±ä¥˜ÑÉ…¥¹•€øôàÑ¥µ•Ì¥¸Ñ¡”±…ÍÐå•…È(€€€´É•…‘¥¹•ÍÌ€ô‘…åÌÍ¥¹”€¼å½ÕÈ½Ý¸µ•‘¥…¸…À™½ÈÑ¡…ÐÁ…ÉÐ(€€€´„Á…ÉÐå½Ô…±µ½ÍÐ…±Ý…åÌÑÉ…¥¸…±½¹”¥Ì„5%8‘…äì½¹”å½Ô½¹±ä•Ù•È(€€€€Ñ…¬½¸Ñ¼…¹½Ñ¡•ÈÁ…ÉÐ€¡	¥•ÁÌ¤¥Ì…¸µ=8(€€€´IÕ¸¥Ì¥ÑÌ½Ý¸Ñ¡¥¹œ€¡¹•…Èµ‘…¥±ä¤°¹•Ù•ÈÑ¡”¡•…‘±¥¹”Á¥¬€€€€€€€€€€€€¨¼)™Õ¹Ñ¥½¸ÑÉ…¥¹¥¹A±…¸ ¥ì(€½¹ÍÐ‘Àõ‘…åA…ÉÑÌ ¤ì(€½¹ÍÐ‰åA…ÉÐõíôì(€™½È¡½¹ÍÐm±Í•Ñt½˜=‰©•Ð¹•¹ÑÉ¥•Ì¡‘À¤¤(€€€™½È¡½¹ÍÐÀ½˜Í•Ð¤€¡‰åA…ÉÑmÁtõ‰åA…ÉÑmÁuññmt¤¹ÁÕÍ ¡¤ì((€½¹ÍÐ¥¹™¼õíôì(€™½È¡½¹ÍÐmÀ±‘…åÍt½˜=‰©•Ð¹•¹ÑÉ¥•Ì¡‰åA…ÉÐ¤¥ì(€€€‘…åÌ¹Í½ÉÐ ¤ì(€€€½¹ÍÐ…ÁÌõmtì(€€€™½È¡±•Ð¤ôÄí¤ñ‘…åÌ¹±•¹Ñ í¤¬¬¤…ÁÌ¹ÁÕÍ ¡‘…åÍ	•ÑÝ••¸¡‘…åÍm¤´Åt±‘…åÍm¥t¤¤ì(€€€½¹ÍÐ±¥™ÑÌ€ô‘…åÌ¹™¥±Ñ•È¡ôùì(€€€€€½¹ÍÐ½Ñ¡•ÉÌõl¸¸¹‘Ám‘ut¹™¥±Ñ•È¡àôùà„ôôIÕ¸œ˜™à„ôõÀ¤ì(€€€€€É•ÑÕÉ¸½Ñ¡•ÉÌ¹±•¹Ñ ôôôÀì(€€€ô¤¹±•¹Ñ ì(€€€½¹ÍÐ±¥™Ñ…åÌ€ô‘…åÌ¹™¥±Ñ•È¡ôùÀ„ôôIÕ¸œ¤¹±•¹Ñ ñð‘…åÌ¹±•¹Ñ ì(€€€¥¹™½mÁtõì(€€€€€‘…åÌé‘…åÌ¹±•¹Ñ °(€€€€€±…ÍÐé‘…åÍm‘…åÌ¹±•¹Ñ ´Åt°(€€€€€Í¥¹”é‘…åÍ¼¡‘…åÍm‘…åÌ¹±•¹Ñ ´Åt¤°(€€€€€…Àé5…Ñ ¹µ…à Ä±µ•‘¥…¸¡…ÁÌ¥ñðÜ¤°(€€€€€Í½±½I…Ñ”èÀôôôIÕ¸œ€ü€Ä€è±¥™ÑÌ½±¥™Ñ…åÌ°(€€€€€±¥Ù”è‘…åÌ¹±•¹Ñ øôà(€€€ôì(€ô(€½¹ÍÐµåÀõ¹Í•ÑÑ¥¹Ì¹µåA…ÉÑÌì(€½¹ÍÐ…±±½ÜõÀôø…µåÁññµåÀ¹¥¹±Õ‘•Ì¡À¥ñð„„¡‰åA…ÉÑmÁt˜™‰åA…ÉÑmÁt¹±•¹Ñ ¤ì€€€¼¼½¹‰½…É‘¥¹œÁ¥¬ì¡¥ÍÑ½Éä…±Ý…åÌÝ¥¹Ì(€™½È¡½¹ÍÐÀ½˜=‰©•Ð¹­•åÌ¡M¹…Ñ…±½œ¤¤(€€€¥˜¡…±±½Ü¡À¤˜˜…¥¹™½mÁt¤¥¹™½mÁtõí‘…åÌèÀ±±…ÍÐéM¹Á…ÉÑ1…ÍÑmÁuññ¹Õ±°±Í¥¹”éM¹Á…ÉÑ1…ÍÑmÁtý‘…åÍ¼¡M¹Á…ÉÑ1…ÍÑmÁt¤èäää±…ÀèÜ±Í½±½I…Ñ”èÀ±±¥Ù”é™…±Í•ôì((€½¹ÍÐÍ½É”õÀôù¥¹™½mÁt¹Í¥¹”½¥¹™½mÁt¹…Àì(€½¹ÍÐ±¥Ù”õ=‰©•Ð¹­•åÌ¡¥¹™¼¤¹™¥±Ñ•È¡Àôù¥¹™½mÁt¹±¥Ù”˜™À„ôôIÕ¸œ¤ì(€½¹ÍÐµ…¥¹Ìõ±¥Ù”¹™¥±Ñ•È¡Àôù¥¹™½mÁt¹Í½±½I…Ñ”øôÀ¸Ð¤¹Í½ÉÐ ¡„±ˆ¤ôùÍ½É”¡ˆ¤µÍ½É”¡„¤¤ì(€½¹ÍÐ…‘‘½¹Ìõ±¥Ù”¹™¥±Ñ•È¡Àôù¥¹™½mÁt¹Í½±½I…Ñ”ðÀ¸Ð¤¹Í½ÉÐ ¡„±ˆ¤ôùÍ½É”¡ˆ¤µÍ½É”¡„¤¤ì(€½¹ÍÐ‘½Éµ…¹Ðõ=‰©•Ð¹­•åÌ¡M¹…Ñ…±½œ¤¹™¥±Ñ•È¡ÀôùÀ„ôôIÕ¸œ˜™¥¹™½mÁt˜˜…¥¹™½mÁt¹±¥Ù”¤ì((€½¹ÍÐÁ¥¬õµ…¥¹ÍlÁuññ¹Õ±°ì(€€¼¼…¸…‘µ½¸¥ÌÝ½ÉÑ ÍÕ•ÍÑ¥¹œ½¹±ä¥˜¥ÐÌ½Ù•É‘Õ”½¸¥ÑÌ½Ý¸å±”(€½¹ÍÐ…‘‘½¸õ…‘‘½¹Ì¹™¥¹¡ÀôùÍ½É”¡À¤øôÄ¥ññ¹Õ±°ì(€½¹ÍÐÉÕ¸õ¥¹™½lIÕ¸uññ¹Õ±°ì(€É•ÑÕÉ¸í¥¹™¼±Í½É”±µ…¥¹Ì±…‘‘½¹Ì±‘½Éµ…¹Ð±Á¥¬±…‘‘½¸±ÉÕ¹ôì)ô)™Õ¹Ñ¥½¸ÍÑÉ•…­É½´¡‘…Ñ•Ì°•¹‘%M<¥ì(€±•Ð¸ôÀ°õ¹•Ü…Ñ”¡•¹‘%M<¬PÀÀèÀÀœ¤ì(€Ý¡¥±”¡‘…Ñ•Ì¹¡…Ì¡¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¤¤¥í¸¬¬í¹Í•Ñ…Ñ”¡¹•Ñ…Ñ” ¤´Ä¤íô(€É•ÑÕÉ¸¸ì)ô)™Õ¹Ñ¥½¸ÕÉÉ•¹ÑMÑÉ•…¬ ¥ì(€½¹ÍÐ‘…Ñ•ÌõÝ½É­½ÕÑ…Ñ•Ì ¤ì(€½¹ÍÐÐõÍÑÉ•…­É½´¡‘…Ñ•Ì±Ñ½‘…å%M<¤ì(€¥˜¡Ð¤É•ÑÕÉ¸Ðì(€½¹ÍÐäõ¹•Ü…Ñ”¡Ñ½‘…å%M<¬PÀÀèÀÀœ¤íä¹Í•Ñ…Ñ”¡ä¹•Ñ…Ñ” ¤´Ä¤ì(€É•ÑÕÉ¸ÍÑÉ•…­É½´¡‘…Ñ•Ì±ä¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¤¤ì€€€¼¼Ñ½‘…ä©ÕÍÐ¡…Í¸Ð¡…ÁÁ•¹•å•Ð)ô(¼¨ØÌ¸Ì¸äÜè½µ•‰…­ÌƒŠPÑ¡”±½¹•Ù¥ÑäÑÝ¥¸½˜Ñ¡”ÍÑÉ•…¬¸ÍÑÉ•…¬µ•…ÍÕÉ•Ì(€€¹•Ù•ÈÍÑ½ÁÁ¥¹œì„ÁÉ…Ñ¥”Ñ¡…Ð±…ÍÑÌå•…ÉÌ¥Ìµ…‘”½˜IQUI9%9¸¥Ù”(€€…É••±¥¹•Ì°•… …¸…ÍÍ•ÉÑ¥½¸¥¸Ñ•ÍÐµ½µ•‰…¬¹©Ìè(€€€ Ä¤„½µ•‰…¬€ôÑÉ…¥¹¥¹œ……¥¸…™Ñ•È€Ü¬‘…åÌ…Ý…äƒŠP™¥á•Ñ¡É•Í¡½±°(€€€€€€•áÁ±…¥¹…‰±”¥¸½¹”Ñ¥Àì…‘…ÁÑ¥Ù”Ñ¡É•Í¡½±‘ÌÝ•É”É•©•Ñ•…Ì(€€€€€€Õ¹•áÁ±…¥¹…‰±”¥¸€ÄÈÀ¡…ÉÌ¸¹½Éµ…°€×ŠLØ‘…ä…‘•¹”å¥•±‘ÌiI<¸(€€€ È¤‘•±…É•É•ÍÐ‘…åÌ…É”¥¹Ù¥Í¥‰±”ƒŠP„ƒÂ~6¥¹Ñ•ÉÉÕÁÑ¥¹œ„…ÀÝ½Õ±‰”(€€€€€€½µ•‰…¬¥¹ÍÕÉ…¹”°Ñ¡”½ÉÉÕÁÑ¥½¸Ñ¡”É•ÍÐ‘½ÑÉ¥¹”™½É‰¥‘Ì¸(€€€€€€Ý½É­½ÕÑ…Ñ•Ì ¤…±É•…‘ä½¹Ñ…¥¹Ì½¹±äÑÉ…¥¹•‘…åÌ°Í¼Ñ¡¥Ì¡½±‘Ì‰ä(€€€€€€½¹ÍÑÉÕÑ¥½¸ìÑ¡”Ñ•ÍÐÁÉ½Ù•Ì¥Ð…¹åÝ…ä¸(€€€ Ì¤½¹±ä1=M…ÁÌ½Õ¹ÐƒŠPÑ¡”½Á•¸…Àå½ÔÉ”¥¸¥Ì¹½Ð„½µ•‰…¬¥¸(€€€€€€ÁÉ½É•ÍÌ°…¹É•¹‘•É¥¹œ¥ÐÝ½Õ±‰”„¹Õ‘”¥¸„½ÍÑÕµ”¸(€€€ Ð¤•Ù•ÉäÉ•ÑÕÉ¸½Õ¹ÑÌ°ÍÑ¥­ä½È¹½ÐƒŠPÉ•ÅÕ¥É¥¹œÉ•ÑÕÉ¹ÌÑ¼€‰±…ÍÐˆ(€€€€€€Ý½Õ±ÑÕÉ¸„½Õ¹Ð¥¹Ñ¼„É…‘”¸(€€€ Ô¤é•É¼É•¹‘•ÉÌ…Ì¹½Ñ¡¥¹œƒŠP¡…¹‘±•…ÐÑ¡”É•¹‘•ÈÍ¥Ñ”¸€¨¼(¼¨ØÌ¸Ì¸äàèÑ¡”µ¥±•ÍÑ½¹”±…‘‘•ÈƒŠP•±•‰É…Ñ•Q=Q1L°¹•Ù•ÈÍÑÉ•…­Ì¸Ñ½Ñ…°(€€¥Ì¥ÉÉ•Ù•ÉÍ¥‰±”°Í¼•±•‰É…Ñ¥¹œ¥ÐÑ¡É•…Ñ•¹Ì¹½Ñ¡¥¹œìÍÑÉ•…¬µ¥±•ÍÑ½¹•Ì(€€…É”Ý¡•É”•¹…•µ•¹Ð‰…¥Ð±¥Ù•Ì€¡„•±•‰É…Ñ•Ñ¡¥¹œÑ¡…Ð…¸‘¥”¤¸•¹Í”(€€Ý¡•É”„ÁÉ…Ñ¥”¥Ì™É…¥±”°Ñ¡•¸•Ù•Éä€ÄÀÀƒŠPÉ½Õ¡±äÑÝ¼„å•…È…Ð„(€€µ½ÍÐµ‘…åÌ…‘•¹”€¡MÕ¹©•”è€ˆÔÀÀ¥ÌÑ½¼‰¥œ°µ…¸ˆ¤¸Q¡½ÕÍ…¹‘Ì…É”„(€€‰¥•ÈÑ¥•ÈèÍ…µ”É¥ÑÕ…°°Ñ…±±•ÈÙ½±Õµ”¸((€€¹Ñ¤µ‰…¥ÐÉÕ±•Ì°•… …¸…ÍÍ•ÉÑ¥½¸¥¸Ñ•ÍÐµµ¥±•ÍÑ½¹”¹©Ìè(€€ƒŠˆ¡¥ µÝ…Ñ•È™±½½È…Ð™¥ÉÍÐÉÕ¸ƒŠP¹¼É•ÑÉ½…Ñ¥Ù”™¥É•Ý½É­Ì°…¹„(€€€€É•ÍÑ½É•½¥µÁ½ÉÑ•…É¡¥Ù”¥¹¥Ñ¥…±¥Í•Ì¥ÑÌ™±½½ÈÑ¼¥ÑÌ½Ý¸Ñ½Ñ…°°Í¼(€€€€µ¥É…Ñ¥½¸¥Ì¡½¹½ÕÉ•°¹•Ù•È•±•‰É…Ñ•ì(€€ƒŠˆ™¥É•Ì½¹”Á•ÈÉÕ¹œ°…­¹½Ý±•‘•µ•¹ÐÍå¹•¥¸Í•ÑÑ¥¹Ìì(€€ƒŠˆ¥˜Í•Ù•É…°ÉÕ¹Ì…É”É½ÍÍ•…Ð½¹”€¡‰Õ±¬Á…ÍÐµ•‘¥ÑÌ¤°=9µ½µ•¹Ð™½È(€€€€Ñ¡”±…É•ÍÐƒŠP„ÅÕ•Õ”½˜•±•‰É…Ñ¥½¹Ì¥Ì„Í±½Ðµ…¡¥¹”ì(€€ƒŠˆ‘¥Íµ¥ÍÍ…°¥Ì½¹”Ñ…À…¹Á•Éµ…¹•¹Ðì¥¹½É¥¹œ„•±•‰É…Ñ¥½¸½ÍÑÌ(€€€€¹½Ñ¡¥¹œƒŠPÑ¡…Ð¥ÌÑ¡”±¥¹”‰•ÑÝ••¸„¥™Ð…¹„¡½½¬¸€¨¼)™Õ¹Ñ¥½¸µÍ1…‘‘•È¡¸¥ì(€É•ÑÕÉ¸¸øôÄÀÀÀ€ü¸”ÄÀÀôôôÀ€èlÄÀ°ÈÀ°ÌÀ°ÔÀ°ÄÀÀ°ÈÀÀ°ÌÀÀ°ÔÀÁt¹¥¹±Õ‘•Ì¡¸¤ì)ô)™Õ¹Ñ¥½¸µÍQ¥•È¡¸¥ìÉ•ÑÕÉ¸¸øôÄÀÀÀ€˜˜¸”ÄÀÀÀôôôÀ€ü€Ñ¡½ÕÍ…¹œ€è€É•Õ±…Èœìô)™Õ¹Ñ¥½¸µÍAÉ•ÙIÕ¹œ¡¸¥ì(€±•ÐÀôÀì(€™½È¡±•Ð¬ôÄÀí¬ñ¸í¬¬¬¤¥˜¡µÍ1…‘‘•È¡¬¤¤Àõ¬ì(€É•ÑÕÉ¸Àì)ô)™Õ¹Ñ¥½¸µÍ1¥Ù•Q½Ñ…° ¥ì(€É•ÑÕÉ¸M¹Ñ½Ñ…±Ì¹Í•ÍÍ¥½¹Ì€¬€   ¡¹‘…åÍmÑ½‘…å%M=uññíô¤¹Ü¥ññmt¤¹±•¹Ñ €˜˜€…M¹Í•ÍÍ¥½¹ÍmÑ½‘…å%M=t€ü€Ä€è€À¤ì)ô)™Õ¹Ñ¥½¸µÍ±½½É%¹¥Ð ¥ì(€¥˜¡¹Í•ÑÑ¥¹Ì¹µÍ±½½Èôõ¹Õ±°¥ì¹Í•ÑÑ¥¹Ì¹µÍ±½½ÈõµÍ1¥Ù•Q½Ñ…° ¤ìÍ…Ù”¡ÑÉÕ”¤ìô)ô)™Õ¹Ñ¥½¸µÍA•¹‘¥¹œ ¥ì(€¥˜¡¹Í•ÑÑ¥¹Ì¹µÍ±½½Èôõ¹Õ±°¤É•ÑÕÉ¸€Àì(€½¹ÍÐÑ½Ñ…°õµÍ1¥Ù•Q½Ñ…° ¤°…¬õ5…Ñ ¹µ…à¡¹Í•ÑÑ¥¹Ì¹µÍ­ñðÀ°¹Í•ÑÑ¥¹Ì¹µÍ±½½È¤ì(€±•Ð‰•ÍÐôÀì(€™½È¡±•Ð¬õ…¬¬Äí¬ðõÑ½Ñ…°í¬¬¬¤¥˜¡µÍ1…‘‘•È¡¬¤¤‰•ÍÐõ¬ì€€€¼¼±…É•ÍÐÉ½ÍÍ•°½¹”µ½µ•¹Ð(€É•ÑÕÉ¸‰•ÍÐì)ô(¼¨½¹”‘Éä±¥¹”Á•È¹•¥¡‰½ÕÉ¡½½ƒŠP‘•Ñ•Éµ¥¹¥ÍÑ¥Œ°¹•Ù•ÈÉ…¹‘½´°…¹‰½±‰ä(€€ÑåÁ”¹½ÐÁÕ¹ÑÕ…Ñ¥½¸èÑ¡”…ÁÀÌÙ½¥”‘½•Ì¹½ÐÕÍ”•á±…µ…Ñ¥½¸µ…É­Ì•Ù•¸(€€…Ð™Õ±°Ù½±Õµ”¸€¨¼)™Õ¹Ñ¥½¸µÍ1¥¹”¡¸¥ì(€¥˜¡¸øôÄÀÀÀ˜™¸”ÄÀÀÀôôôÀ¤É•ÑÕÉ¸™µÐ¡¸¤¬œ‘…åÌ¸Q¡”±½¹œ…µ”°­•ÁÐ¸œì(€¥˜¡¸øôÄÀÀÀ¤É•ÑÕÉ¸™µÐ¡¸¤¬œ‘…åÌ½˜Í¡½Ý¥¹œÕÀ¸œì(€É•ÑÕÉ¸€¡ìÄÀèQ•¸‘…åÌ¸%ÑqÔÈÀÄåÌ„Ñ¡¥¹œ¹½Ü¸œ°(€€€€€€€€€€€ÈÀèQÝ•¹Ñä‘…åÌ¸Q¡”¡…‰¥Ð¥ÌÝ¥¹¹¥¹œ¸œ°(€€€€€€€€€€€ÌÀèµ½¹Ñ ½˜‘…åÌ¸5½ÍÐÅÕ¥Ð¡•É”qÔÈÀÄÐå½Ô‘¥‘¹qÔÈÀÄåÐ¸œ°(€€€€€€€€€€€ÔÀè¥™Ñä‘…åÌ¸Q¡¥Ì¥ÌÝ¡¼å½Ô…É”¹½Ü¸œ°(€€€€€€€€€€€ÄÀÀè¡Õ¹‘É•‘…åÌ½˜Í¡½Ý¥¹œÕÀ¸œ°(€€€€€€€€€€€ÈÀÀèQÝ¼¡Õ¹‘É•¸Q¡”½Õ ±½ÍÐ¸œ°(€€€€€€€€€€€ÌÀÀèQ¡É•”¡Õ¹‘É•‘…åÌ¸EÕ¥•Ñ±äÉ•±•¹Ñ±•ÍÌ¸œ°(€€€€€€€€€€€ÔÀÀè¥Ù”¡Õ¹‘É•‘…åÌ¸!…±˜Ñ¡”µ½Õ¹Ñ…¥¸¸ô¥m¹uññ™µÐ¡¸¤¬œ‘…åÌ½˜Í¡½Ý¥¹œÕÀ¸œì)ô(¼¨ØÌ¸Ì¸ÄÄÐè•… ¡…ÉÐÌ‘…Ñ„‰•½µ•Ì„™Õ¹Ñ¥½¸Í¼Ñ¡”½¸µÍÉ••¸MY…¹(€€Ñ¡”Í¡…É”…ÉÉ•…Ñ¡”M5¹Õµ‰•ÉÌ¸AÉ•Ù¥½ÕÍ±äÑ¡•Í”Ý•É”½µÁÕÑ•(€€¥¹±¥¹”¥¹Í¥‘”Ñ¡”É•¹‘•È™Õ¹Ñ¥½¹Ì°Ý¡¥ µ•…¹Ð„…É½Õ±½¹±ä‰”(€€…‘‘•‰ä‘ÕÁ±¥…Ñ¥¹œÑ¡”…É¥Ñ¡µ•Ñ¥ŒƒŠPÑ¡”‘É¥™ÐÑ¡¥Ì½‘•‰…Í”­••ÁÌ(€€Á…å¥¹œ‘½Ý¸€¡É•Í•…±…ä°™½±‘M•ÑÌ°É¥‘…Ñ„°•±…ÁÍ•‘…åÌ°ÉÕ¹e•…ÉÕÉÙ•Ì¤¸€¨¼(¼¨ØÌ¸Ì¸ÈÀàè=5A1QMQLÁ•ÈÁ…ÉÐÁ•ÈÑÉ…¥¹¥¹œ‘…ä°¹•Ý•ÍÐ±…ÍÐ¸Q¡”½±(€€¡…ÉÐÍÕµµ•Ý•¥¡Ðƒ\É•ÁÌ…É½ÍÌMµ¥Ñ µ…¡¥¹•Ì°™É•”Ý•¥¡ÑÌ°‘Õµ‰‰•±±Ì°(€€‰…É‰•±±Ì…¹Í•±•Ñ½É¥Í•µ…¡¥¹•Ì¸Q¡”…É¥Ñ¡µ•Ñ¥ŒÝ…Ì½¹Í¥ÍÑ•¹Ð°‰ÕÐÑ¡”(€€Ñ½Ñ…°Ý…Ì¹½Ð„½µÁ…É…‰±”Á¡åÍ¥…°ÅÕ…¹Ñ¥Ñä¸=¹”‰±½¬¹½Üµ•…¹Ì•á…Ñ±ä(€€½¹”±½•Í•Ð°É•…É‘±•ÍÌ½˜•ÅÕ¥Áµ•¹Ð¸IÕ¸É•µ…¥¹ÌÍ•Á…É…Ñ”è‘¥ÍÑ…¹”¥Ì(€€…±É•…‘äÑ½±¡½¹•ÍÑ±ä•±Í•Ý¡•É”…¹¡…Ì¹¼µ•…¹¥¹™Õ°Í•Ð•ÅÕ¥Ù…±•¹Ð¸€¨¼)½¹ÍÐAIQ}=1=ILõí¡•ÍÐèÙ…È ´µÀµ¡•ÍÐ¤œ±	…¬èÙ…È ´µÀµ‰…¬¤œ±M¡½Õ±‘•ÈèÙ…È ´µÀµÍ¡½Õ±‘•È¤œ°(€1•ÌèÙ…È ´µÀµ±•Ì¤œ±	¥•ÁÌèÙ…È ´µÀµ‰¥•ÁÌ¤œ±QÉ¥•ÁÌèÙ…È ´µÀµÑÉ¥•ÁÌ¤œ°(€M¥áÁ…¬èÙ…È ´µÀµÍ¥áÁ…¬¤œ±IÕ¸èÙ…È ´µÀµÉÕ¸¤ôì)™Õ¹Ñ¥½¸Á…ÉÑ5¥à¡‘…åÌ¥ì(€½¹ÍÐ½ÕÐõmt°¥Í¼õl¸¸¹Ý½É­½ÕÑ…Ñ•Ì ¥t¹Í½ÉÐ ¤ì(€½¹ÍÐÑ…­”õ¥Í¼¹Í±¥” µ5…Ñ ¹µ…à Ä±‘…åÌ¤¤ì(€™½È¡½¹ÍÐ½˜Ñ…­”¥ì(€€€½¹ÍÐÜô¡¹‘…åÍm‘uññíô¤¹Ýñð¡M¹Í•ÍÍ¥½¹Ím‘uññmt¤ì(€€€½¹ÍÐ‰äõíôì(€€€™½È¡½¹ÍÐÌ½˜Ü¥ì(€€€€€½¹ÍÐÀõÌ¹Á…ÉÑñðŸŠPœì(€€€€€¥˜¡ÀôôôIÕ¸ññÌ¹•àôôôIÕ¸œ¤½¹Ñ¥¹Õ”ì(€€€€€€¼¨½±‘•¡¥ÍÑ½É¥…°É½ÝÌÍÑ½É”Í•Ù•É…°Í•ÑÌ¥¸½¹”É•ÁÌ…ÉÉ…äìÕÉÉ•¹Ð(€€€€€€€€±½ÌÕÍÕ…±±äÍÑ½É”½¹”¸1•¹Ñ ¥ÌÑ¡”½¹”É•ÁÉ•Í•¹Ñ…Ñ¥½¸µ¥¹‘•Á•¹‘•¹Ð(€€€€€€€€½Õ¹Ð°Í¼lÄÈ°ÄÀ°ÄÀ°át…¹™½ÕÈ½¹”µÉ•Àµ…ÉÉ…äÉ½ÝÌ‰½Ñ …‘™½ÕÈ¸€¨¼(€€€€€½¹ÍÐÍ•ÑÌô¡Ì¹É•ÁÍññmt¤¹±•¹Ñ ì(€€€€€¥˜¡Í•ÑÌøÀ¤‰åmÁtô¡‰åmÁuñðÀ¤­Í•ÑÌì(€€€ô(€€€½ÕÐ¹ÁÕÍ ¡í°‰ä°Ñ½Ñ…°é=‰©•Ð¹Ù…±Õ•Ì¡‰ä¤¹É•‘Õ” ¡„±ˆ¤ôù„­ˆ°À¥ô¤ì(€ô(€É•ÑÕÉ¸½ÕÐì)ô)™Õ¹Ñ¥½¸Ý‘¥ÍÐ ¥ì(€½¹ÍÐ‘…Ñ•ÌõÝ½É­½ÕÑ…Ñ•Ì ¤°ŒõlÀ°À°À°À°À°À°Át°ÐõlÀ°À°À°À°À°À°Átì(€™½È¡±•Ð¤ôÀí¤ðÌØÔí¤¬¬¥ì(€€€½¹ÍÐõ¹•Ü…Ñ”¡Ñ½‘…å%M<¬PÀÀèÀÀœ¤ì¹Í•Ñ…Ñ”¡¹•Ñ…Ñ” ¤µ¤¤ì(€€€½¹ÍÐÜõ¹•Ñ…ä ¤ìÑmÝt¬¬ì(€€€¥˜¡‘…Ñ•Ì¹¡…Ì¡¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¤¤¤mÝt¬¬ì(€ô(€½¹ÍÐÁÐõŒ¹µ…À ¡¸±¤¤ôùÑm¥tý¸½Ñm¥tèÀ¤ì(€É•ÑÕÉ¸íÁÐ°‰•ÍÐéÁÐ¹¥¹‘•á=˜¡5…Ñ ¹µ…à ¸¸¹ÁÐ¤¤°Ñ½‘…äé¹•Ü…Ñ”¡Ñ½‘…å%M<¬PÀÀèÀÀœ¤¹•Ñ…ä ¥ôì)ô)™Õ¹Ñ¥½¸Ý••­M•É¥•Ì ¥ì(€½¹ÍÐ‘…åÌõÉÕ¹…åÌ ¤°‰äõíôì(€™½È¡½¹ÍÐÈ½˜‘…åÌ¤‰åmÝ••­=˜¡È¹¥tô¡‰åmÝ••­=˜¡È¹¥uñðÀ¤­Ñ½¡È¹­´¤ì(€½¹ÍÐÑ¡¥Í]¬õÝ••­=˜¡Ñ½‘…å%M<¤ì(€½¹ÍÐÝ­Ìõ=‰©•Ð¹­•åÌ¡‰ä¤¹Í½ÉÐ ¤¹Í±¥” ´ÄØ¤ì(€¥˜ …Ý­Ì¹¥¹±Õ‘•Ì¡Ñ¡¥Í]¬¤¤Ý­Ì¹ÁÕÍ ¡Ñ¡¥Í]¬¤ì(€½¹ÍÐ…ÙœõÝ­Ì¹™¥±Ñ•È¡ÜôùÜ„ôõÑ¡¥Í]¬¤¹É•‘Õ” ¡„±Ü¤ôù„¬¡‰åmÝuñðÀ¤°À¤½5…Ñ ¹µ…à Ä±Ý­Ì¹±•¹Ñ ´Ä¤ì(€É•ÑÕÉ¸íÝ­Ì°‰ä°…Ùœ°Ñ¡¥Í]­ôì)ô)™Õ¹Ñ¥½¸Á…•M•É¥•Ì ¥ì(€½¹ÍÐ‘…åÌõÉÕ¹…åÌ ¤°Á´õíôì(€™½È¡½¹ÍÐÈ½˜‘…åÌ¥ì¥˜¡È¹Ñ¥µ•ðôÀ¤½¹Ñ¥¹Õ”ì(€€€½¹ÍÐ¬õÈ¹¹Í±¥” À°Ü¤ì½¹ÍÐ”õÁµm­uñð¡Áµm­tõíÍ•ŒèÀ±èÁô¤ì”¹Í•Œ¬õÈ¹Í•Œì”¹¬õÑ½¡È¹Ñ¥µ•¤ìô(€É•ÑÕÉ¸=‰©•Ð¹•¹ÑÉ¥•Ì¡Á´¤¹Í½ÉÐ ¤¹Í±¥” ´ÄÈ¤¹µ…À ¡m¬±Ùt¤ôùm¬°Ø¹üØ¹Í•Œ½Ø¹€è€Át¤ì)ô)™Õ¹Ñ¥½¸¡•…ÑM•É¥•Ì ¥ì(€½¹ÍÐ‘…Ñ•ÌõÝ½É­½ÕÑ…Ñ•Ì ¤°½ÕÐõmtì(€½¹ÍÐ•¹õ¹•Ü…Ñ”¡Ñ½‘…å%M<¬PÀÀèÀÀœ¤ì(€•¹¹Í•Ñ…Ñ”¡•¹¹•Ñ…Ñ” ¤µ•¹¹•Ñ…ä ¤¬Ø¤ì€€€€€€€€€€¼¼Ñ¡É½Õ Ñ¡”ÕÉÉ•¹ÐÝ••¬ÌM…ÑÕÉ‘…ä(€™½È¡±•ÐÜôÈÔíÜøôÀíÜ´´¥ì(€€€½¹ÍÐ½°õmtì(€€€™½È¡±•ÐôÀíðÜí¬¬¥ì(€€€€€½¹ÍÐŒõ¹•Ü…Ñ”¡•¹¤ìŒ¹Í•Ñ…Ñ”¡Œ¹•Ñ…Ñ” ¤´¡Ü¨Ü¤¬¡´Ø¤¤ì(€€€€€½¹ÍÐ¥Í¼õŒ¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¤ì(€€€€€½°¹ÁÕÍ ¡í¥Í¼°½¸é‘…Ñ•Ì¹¡…Ì¡¥Í¼¤°™ÕÐé¥Í¼ùÑ½‘…å%M=ô¤ì(€€€ô(€€€½ÕÐ¹ÁÕÍ ¡½°¤ì(€ô(€É•ÑÕÉ¸½ÕÐì)ô)™Õ¹Ñ¥½¸½µ•‰…­Ì ¥ì(€½¹ÍÐ…ÉÈõl¸¸¹Ý½É­½ÕÑ…Ñ•Ì ¥t¹Í½ÉÐ ¤ì(€±•Ð¸ôÀ°±½¹•ÍÐôÀì(€™½È¡±•Ð¤ôÄí¤ñ…ÉÈ¹±•¹Ñ í¤¬¬¥ì(€€€½¹ÍÐ…Àõ‘…åÍ	•ÑÝ••¸¡…ÉÉm¤´Åt±…ÉÉm¥t¤´Äì€€€¼¼‘…åÌ]d‰•ÑÝ••¸ÑÝ¼ÑÉ…¥¹•‘…åÌ(€€€¥˜¡…ÀøôÜ¥ì¸¬¬ì¥˜¡…Àù±½¹•ÍÐ¤±½¹•ÍÐõ…Àìô(€ô(€É•ÑÕÉ¸í¸°±½¹•ÍÑôì)ô)™Õ¹Ñ¥½¸±½¹•ÍÑMÑÉ•…¬ ¥ì(€½¹ÍÐ…ÉÈõl¸¸¹Ý½É­½ÕÑ…Ñ•Ì ¥t¹Í½ÉÐ ¤ì(€±•Ð‰•ÍÐôÀ±ÉÕ¸ôÀ±ÁÉ•Øõ¹Õ±°ì(€™½È¡½¹ÍÐ½˜…ÉÈ¥ì(€€€ÉÕ¸ô¡ÁÉ•Ø˜™‘…åÍ	•ÑÝ••¸¡ÁÉ•Ø±¤ôôôÄ¤ýÉÕ¸¬ÄèÄì(€€€¥˜¡ÉÕ¸ù‰•ÍÐ¥‰•ÍÐõÉÕ¸ìÁÉ•Øõì(€ô(€É•ÑÕÉ¸‰•ÍÐì)ô)™Õ¹Ñ¥½¸ÝÈ¡¥Í¼¥ìÉ•ÑÕÉ¸¹•Ü…Ñ”¡¥Í¼¬PÀÀèÀÀœ¤¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µULœ±íÝ••­‘…äèÍ¡½ÉÐô¤ìô)™Õ¹Ñ¥½¸‘…åÍ	•ÑÝ••¸¡„±ˆ¥íÉ•ÑÕÉ¸5…Ñ ¹É½Õ¹ ¡¹•Ü…Ñ”¡ˆ¬PÀÀèÀÀœ¤µ¹•Ü…Ñ”¡„¬PÀÀèÀÀœ¤¤¼àØÑ”Ô¤íô((¼¨ØÌ¸Ì¸àäèÕµÕ±…Ñ¥Ù”‘¥ÍÑ…¹”‰ä‘…ä½˜å•…È°¥¸%MA1dÕ¹¥ÑÌƒŠPÑ¡”Í…µ”(€€Í¡…Á”å•…ÉÕÉÙ•Ì ¤É•ÑÕÉ¹Ì°Í¼½¹”…¹Ù…ÌÉ•¹‘•É•ÈÍ•ÉÙ•Ì‰½Ñ ¡…ÉÑÌ¸(€€M¡…É•‰äÑ¡”MY¥¸ÉÕ¹MÑ…ÑÍ!Q50 ¤…¹Ñ¡”Í¡…É”…É¸€¨¼)™Õ¹Ñ¥½¸ÉÕ¹e•…ÉÕÉÙ•Ì ¥ì(€½¹ÍÐ‘…åÌõÉÕ¹…åÌ ¤°Á•Èõíôì(€™½È¡½¹ÍÐÈ½˜‘…åÌ¥ì½¹ÍÐäõÈ¹¹Í±¥” À°Ð¤ì€¡Á•ÉmåtõÁ•Émåuññmt¤¹ÁÕÍ ¡m‘½ä¡È¹¤±Ñ½¡È¹­´¥t¤ìô(€½¹ÍÐ½ÕÐõíôì(€™½È¡½¹ÍÐmä±±¥ÍÑt½˜=‰©•Ð¹•¹ÑÉ¥•Ì¡Á•È¤¥ì(€€€±¥ÍÐ¹Í½ÉÐ ¡„±ˆ¤ôù…lÁtµ‰lÁt¤ì(€€€½¹ÍÐ•¹€ôäôôõÑ¡¥Íe•…È€ü‘½ä¡Ñ½‘…å%M<¤€è€  ­ä”ÐôôôÀ¤üÌØØèÌØÔ¤ì(€€€½¹ÍÐÕÉÙ”õ¹•Ü±½…ÐÌÉÉÉ…ä¡•¹¤ì±•ÐŒôÀ±¤ôÀì(€€€™½È¡±•ÐôÄíðõ•¹í¬¬¥ì(€€€€€Ý¡¥±”¡¤ñ±¥ÍÐ¹±•¹Ñ ˜™±¥ÍÑm¥ulÁtðõ¥ìŒ¬õ±¥ÍÑm¥ulÅtì¤¬¬ìô(€€€€€ÕÉÙ•m´ÅtõŒì(€€€ô(€€€½ÕÑmåtõíÕÉÙ”±•¹±Ñ½Ñ…°éôì(€ô(€É•ÑÕÉ¸½ÕÐì)ô((¼¨å•…Èµ½Ù•Èµå•…ÈÕµÕ±…Ñ¥Ù”½¹Í¥ÍÑ•¹äèÝ½É­½ÕÐ‘…åÌÍ¼™…È€¼‘…åÌ•±…ÁÍ•€€¡Ñ¡”…Í¡‰½…É‰½ÑÑ½´¡…ÉÐ¤€¨¼(¼¨ØÌ¸Ì¸äÔè¡½ÜµÕ ½˜Ñ¡¥Ìå•…È¡…Ì½Õ¹Ñ•Í¼™…È¸¸Õ¹ÝÉ¥ÑÑ•¸Ñ½‘…ä‘½•Ì(€€¹½Ð½Õ¹Ð……¥¹ÍÐå½ÔƒŠPå½Ô¡…Ù”¹½Ðµ¥ÍÍ•¥ÐÕ¹Ñ¥°µ¥‘¹¥¡Ð¸Q¡…ÐÉÕ±”(€€±¥Ù•¥¸¡•…‘•È¹©Ì…¹ÍÑ…ÑÌ¹©Ì…¹å•…ÉÕÉÙ•Ì ¤¡…¹•Ù•È¡•…É½˜¥Ð°Í¼(€€Ñ¡”-A$‘¥Ù¥‘•‰ä€ÈÀØÝ¡¥±”Ñ¡”¡…ÉÐ‘¥Ù¥‘•‰ä€ÈÀÜ…¹Ñ¡”Í…µ”™…Ð(€€É•¹‘•É•…Ì€ØÈ”…¹€ØÄ”½¸½¹”ÍÉ••¸¸9½ÜÑ¡•É”¥Ì½¹”™Õ¹Ñ¥½¸…¹Ñ¡”(€€ÑÝ¼¹Õµ‰•ÉÌ…É”Ñ¡”M5…É¥Ñ¡µ•Ñ¥Œ°¹½Ðµ•É•±ä…É••¥¹œ…É¥Ñ¡µ•Ñ¥Œ¸€¨¼)™Õ¹Ñ¥½¸•±…ÁÍ•‘…åÌ ¥ì(€É•ÑÕÉ¸5…Ñ ¹µ…à Ä°‘½ä¡Ñ½‘…å%M<¤€´€  ¡¹‘…åÍmÑ½‘…å%M=uññíô¤¹Ýññmt¤¹±•¹Ñ €ü€À€è€Ä¤¤ì)ô)™Õ¹Ñ¥½¸å•…ÉÕÉÙ•Ì ¥ì(€½¹ÍÐ‘…Ñ•ÌõÝ½É­½ÕÑ…Ñ•Ì ¤ì(€½¹ÍÐÁ•Ée•…Èõíôì(€™½È¡½¹ÍÐ¥Í¼½˜‘…Ñ•Ì¥í½¹ÍÐäõ¥Í¼¹Í±¥” À°Ð¤ì¡Á•Ée•…ÉmåtõÁ•Ée•…Émåuññmt¤¹ÁÕÍ ¡‘½ä¡¥Í¼¤¤íô(€½¹ÍÐ½ÕÐõíôì(€™½È¡½¹ÍÐmä±±¥ÍÑt½˜=‰©•Ð¹•¹ÑÉ¥•Ì¡Á•Ée•…È¤¥ì(€€€±¥ÍÐ¹Í½ÉÐ ¡„±ˆ¤ôù„µˆ¤ì(€€€½¹ÍÐ•¹€ôäôôõÑ¡¥Íe•…È€ü•±…ÁÍ•‘…åÌ ¤€è€  ­ä”ÐôôôÀ¤üÌØØèÌØÔ¤ì(€€€½¹ÍÐÕÉÙ”õ¹•Ü±½…ÐÌÉÉÉ…ä¡•¹¤ì±•ÐŒôÀ±¤ôÀì(€€€™½È¡±•ÐôÄíðõ•¹í¬¬¥ì(€€€€€Ý¡¥±”¡¤ñ±¥ÍÐ¹±•¹Ñ ˜™±¥ÍÑm¥tðõ¥íŒ¬¬í¤¬¬íô(€€€€€ÕÉÙ•m´ÅtõŒ½ì(€€€ô(€€€½ÕÑmåtõíÕÉÙ”±‘…åÌé±¥ÍÐ¹±•¹Ñ ±•¹‘ôì(€ô(€É•ÑÕÉ¸½ÕÐì)ô((¼¨ØÌ¸Ä¸ÄÈèÑ¡”É•¡•…‘•È%LÑ¡”Í•ÍÍ¥½¸ƒŠPÑ…ÁÁ¥¹œ¥Ð©ÕµÁÌÑ¼Ñ¡”…Ñ¥Ù”(€€•á•É¥Í”€¡Ñ¡”µ½ÍÐÉ••¹ÐÍ•ÐÑ½‘…äÝ¡½Í”Á…ÉÐ¥ÌÍÑ¥±°½Á•¸¤¸Q…ÁÌ½¸(€€‰ÕÑÑ½¹Ì¥¹Í¥‘”Ñ¡”¡•…‘•È€¡‰…¬°•…È°‘•µ¼‰…È¤…É”±•™Ð…±½¹”¸€¨¼)™Õ¹Ñ¥½¸…Ñ¥Ù•½ÕÌ ¥ì(€½¹ÍÐÐõ‘…ä¡Ñ½‘…å%M<¤ì(€¥˜ …Ð¹Ü¹±•¹Ñ ¤É•ÑÕÉ¸¹Õ±°ì(€½¹ÍÐ½Á•¸õl¸¸¹Ð¹Ýt¹Í½ÉÐ ¡„±ˆ¤ôø¡ˆ¹…ÑñðÀ¤´¡„¹…ÑñðÀ¤¤(€€€€¹™¥¹¡ÌôùÌ¹Á…ÉÐ„ôôIÕ¸œ˜™Ì¹Á…ÉÐ˜˜„¡Ð¹‘½¹•A…ÉÑññmt¤¹¥¹±Õ‘•Ì¡Ì¹Á…ÉÐ¤¤ì(€É•ÑÕÉ¸½Á•¸ýí•àé½Á•¸¹•à±Á…ÉÐé½Á•¸¹Á…ÉÑôé¹Õ±°ì)ô)‘½Õµ•¹Ð¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ±”ôùì(€½¹ÍÐ¡õ”¹Ñ…É•Ð¹±½Í•ÍÐ ¡•…‘•Èœ¤ì(€¥˜ …¡‘ñð…¡¹±…ÍÍ1¥ÍÐ¹½¹Ñ…¥¹Ì ±¥Ù”œ¤¤É•ÑÕÉ¸ì(€¥˜¡”¹Ñ…É•Ð¹±½Í•ÍÐ ‰ÕÑÑ½¸±„°‘•µ½	…È±¥¹ÁÕÐœ¤¤É•ÑÕÉ¸ì(€½¹ÍÐ˜õ…Ñ¥Ù•½ÕÌ ¤ì(€¥˜ …˜¤É•ÑÕÉ¸ì(€¥˜¡Ù¥•Üôôô±¥™Ðœ˜™±¥™Ð¹•àôôõ˜¹•à¤É•ÑÕÉ¸ì€€€€€€¼¼…±É•…‘äÑ¡•É”(€Ù¥•Üô±¥™Ðœì±¥™Ð¹Á…ÉÐõ˜¹Á…ÉÐì±¥™Ð¹•àõ˜¹•àì±¥™Ð¹½Áäõ¹Õ±°ì(€É•¹‘•È ¤ì)ô¤ì(