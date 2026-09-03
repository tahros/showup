/* ShowUp — today.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- Daily Fire: today vs every day you've ever trained ---------- */
let _fireDist=null;
function fireDist(kind){
  if(_fireDist&&_fireDist.kind===kind) return _fireDist.v;
  const v=[];
  for(const rows of Object.values(SEED.sessions)){
    let x=0;
    for(const r of rows){
      if(kind==='km'){ if(r[1]==='Run') x+=r[2]; }
      else { if(r[1]!=='Run') x+=r[2]*(r[3]||[]).reduce((a,b)=>a+b,0); }
    }
    if(x>0) v.push(x);
  }
  v.sort((a,b)=>a-b);
  _fireDist={kind,v};
  return v;
}
/* v3.3.34: while a session is live, the Today hero follows the lift you're
   actually doing — the same chart the exercise view shows (v3.3.18), because
   "beats 14 of your last 15" is fuel mid-set and "bigger than 11% of 921 days"
   is not: the day's total starts every session at the bottom of its own
   distribution. Daily Fire returns the moment the day is sealed, when the
   whole-day percentile is the honest summary. */
function liveExNow(){
  if(!isLive()) return null;
  const t=dayMeta();
  for(let i=t.w.length-1;i>=0;i--){
    const s=t.w[i];
    if(s.ex&&s.ex!=='Run'&&!t.doneEx.includes(s.ex)) return s.ex;
  }
  return null;
}
function livePartNow(){
  const ex=liveExNow();
  if(!ex) return null;
  const t=dayMeta();
  for(let i=t.w.length-1;i>=0;i--) if(t.w[i].ex===ex) return t.w[i].part||null;
  return null;
}
/* v3.3.40: the Today hero shows the PART's progression, not the exercise's.
   The exercise chart already sits at the bottom of the exercise view — the
   same chart twice taught nothing new. Part level answers a question that
   screen can't: how does today's whole Shoulder session compare to the last
   fourteen. Today's bar is red while the session is live. */
/* v3.3.45: Daily Fire is gone and Rhythm takes the top slot.
   v3.3.285: the live part digest is gone too, so Today leads with Rhythm in
   BOTH states — one hero, not two. The digest was the last place in the app
   that delivered a mid-session verdict: "volume down 70% vs your previous 5
   sessions", in red, while you are still lifting. Nothing else here grades a
   session in progress, and a warm-up set legitimately reads as 70% down. The
   number was accurate and useless, which is exactly the kind of claim this
   app declines to make. */
function todayHeroHTML(){
  /* v3.3.319: today's PLAN leads this tab, not Rhythm. Rhythm restated the
     streak and the day count that the header already carries and that Stats
     tells properly; the plan is the one thing you open Today to read. */
  return planSectionHTML();
}
/* ============ v3.1 Clean Slate: onboarding · demo · honest empty states ============ */
function hasAnyDays(){ return Object.values(DB.days).some(v=>v.w&&v.w.length); }
let onbStep=1, onbSel=null, onbUnit='kg';
function onbEl(){ let el=document.getElementById('onb'); if(!el){ el=document.createElement('div'); el.id='onb'; document.body.appendChild(el);} return el; }
function demoEl(){
  let el=document.getElementById('demoBar');
  if(!el){
    el=document.createElement('div'); el.id='demoBar'; el.hidden=true;
    const hd=document.querySelector('header');
    if(hd) hd.insertBefore(el, hd.firstChild); else document.body.appendChild(el);
  }
  return el;
}
function maybeOnboard(){
  if(DB.settings.onboarded||DB.settings.demo) return;
  if(hasAnyDays()||SEED.totals.sessions>0){ DB.settings.onboarded='auto'; save(); return; }
  const signedIn=!!localStorage.getItem(SKEY);
  if(signedIn&&!pulledOK) return;                  // cloud may still hold their history — wait for the verdict
  onbStep=signedIn?2:1; onbRender();
}
function onbRender(){
  const el=onbEl(); el.hidden=false;
  if(!onbSel) onbSel=new Set(Object.keys(SEED0.catalog));
  let b='';
  if(onbStep===1){
    b=`<div class="onbcard">
      <div class="onblogo">ShowUp</div>
      <p class="onbtag">Show up. The rest is bookkeeping.<br><span class="muted">A training log that celebrates days, not numbers.</span></p>
      <button class="onbbtn pri" data-onbact="signin">Sign in with Google</button>
      <button class="onbbtn" data-onbact="local">Continue on this device</button>
      <button class="onbbtn ghost" data-onbact="demo">Explore with sample data</button>
      <div class="onbnote">Sign in or not — your training stays on your device and stays yours. Export everything from Settings, anytime. The demo never syncs and clears with one tap.</div>
      <p class="onbnote">Sign-in syncs across devices. Local works fully offline — you can sign in later.</p></div>`;
  }else if(onbStep===2){
    b=`<div class="onbcard">
      <h3>What do you train?</h3>
      <p class="onbnote">Tap to toggle. Everything stays available — this just shapes your suggestions, and you can change it any time in Settings.</p>
      <div class="onbchips">${Object.keys(SEED0.catalog).map(p=>
        `<button class="onbchip ${onbSel.has(p)?'sel':''}" data-onbp="${p}">${p}</button>`).join('')}</div>
      <button class="onbbtn pri" data-onbact="toStep3">Continue</button>
      <button class="onbbtn ghost" data-onbact="skip">Skip — it's all in Settings anyway</button></div>`;
  }else if(onbStep===3){
    const lb=onbUnit==='lb';
    b=`<div class="onbcard">
      <h3>About you</h3>
      <div class="onbrow"><span>Name <span class="muted">(so the app can say hello)</span></span>
        <input id="onbName" type="text" autocapitalize="words" maxlength="40" placeholder="—"></div>
      <div class="onbrow"><span>Units</span>
        <span class="onbseg"><button class="${lb?'':'sel'}" data-onbu="kg">kg</button><button class="${lb?'sel':''}" data-onbu="lb">lb</button></span></div>
      <div class="onbrow"><span>Bodyweight <span class="muted">(for pull-ups, dips)</span></span>
        <input id="onbBw" type="number" inputmode="decimal" placeholder="${lb?'154':'70'}"></div>
      <div class="onbrow"><span>Barbell bar</span>
        <input id="onbBar" type="number" inputmode="decimal" value="${lb?'45':'20'}"></div>
      <button class="onbbtn pri" data-onbact="toStep4">Continue</button>
      <button class="onbbtn ghost" data-onbact="skip">Skip</button></div>`;
  }else if(onbStep===4){
    b=`<div class="onbcard">
      <h3>How to ShowUp</h3>
      <div class="onbges"><span class="gi">‹</span><span><b>Swipe right</b> inside an exercise<span class="muted">back to the part list</span></span></div>
      <div class="onbges"><span class="gi">⊙</span><span><b>Hold a logged set</b><span class="muted">edit it — tap once to delete</span></span></div>
      <div class="onbges"><span class="gi">▮</span><span><b>Tap the header when it's red</b><span class="muted">jump straight to your active exercise</span></span></div>
      <button class="onbbtn pri" data-onbact="finish">Start showing up</button></div>`;
  }
  el.innerHTML=`<div class="onbwrap">${b}</div>`;
}
function onbFinish(skip){
  if(!skip){
    DB.settings.myParts=[...onbSel];
    DB.settings.unit=onbUnit;
    const nm=(document.getElementById('onbName')?.value||'').trim().slice(0,40);
    if(nm) DB.settings.name=nm;
    const bw=parseFloat(document.getElementById('onbBw')?.value);
    if(bw>0) DB.settings.bodyKg=onbUnit==='lb'?+(bw*0.45359237).toFixed(1):bw;
    const bar=parseFloat(document.getElementById('onbBar')?.value);
    if(bar>0) DB.settings.barKg=onbUnit==='lb'?+(bar*0.45359237).toFixed(1):bar;
  }
  DB.settings.onboarded=APP_VERSION; DB.settingsAt=Date.now();
  save(true); onbEl().hidden=true; render();
}
/* ---- demo: 70 days of clearly-borrowed life ---- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function demoLoad(){
  const rnd=mulberry32(918); DB.days={};
  const rot=['Chest','Back','Legs','Shoulder']; let pi=0;
  for(let i=70;i>=1;i--){
    const c=new Date(todayISO+'T00:00'); c.setDate(c.getDate()-i);
    const d=c.toLocaleDateString('en-CA');
    if(rnd()<0.2&&i>1) continue;
    const w=[]; let at=1;
    if(rnd()<0.85){
      const p=rot[pi++%rot.length];
      for(const ex of SEED0.catalog[p].slice(0,3)){
        const e=SEED0.equip[ex]||'machine';
        const base=e==='barbell'?40:e==='smith'?30:e==='dumbbell'?10:25;
        const wt=base+Math.floor((70-i)/18)*(e==='dumbbell'?2:5);
        for(let k=0;k<3;k++) w.push({part:p,ex,w:wt,reps:[10+Math.floor(rnd()*5)],at:at++});
      }
    }
    if(rnd()<0.55) w.push({part:'Run',ex:'Run',w:+(2.5+rnd()*1.7).toFixed(2),reps:[],mins:Math.round(20+rnd()*14),at:at++});
    if(w.length) DB.days[d]={w,lastAt:at-1,upd:Date.now()};
  }
  DB.settings.demo=true; save();
  SEED=deriveAll(); _fireDist=null;
  onbEl().hidden=true; demoBarSync(); render();
  toast('Demo data loaded — nothing here syncs anywhere');
}
function demoClear(){
  DB.days={}; delete DB.settings.demo; delete DB.settings.onboarded; delete DB.settings.myParts;
  save(); SEED=deriveAll(); _fireDist=null;
  demoBarSync(); render(); maybeOnboard();
}
function demoBarSync(){
  const el=demoEl();
  el.hidden=!DB.settings.demo;
  document.body.style.paddingTop='';                 // clear any offset from older builds
  if(DB.settings.demo)
    el.innerHTML=`<span>DEMO DATA — explore freely</span><button data-onbact="democlear">Use for real</button>`;
}
/* ============ v3.3.372 — DAY ONE ============================================
   What a new user met before: a card saying "Log your first set", whose button
   dropped them into the FULL Train tab -- body-part grid, go-to lists, plan
   section, the same dense screen a 953-day user sees with every number blank.
   The first five minutes were the least designed part of the product.
   Day one now asks ONE QUESTION AT A TIME: what did you train, then which
   lift, then the real logger. Steps two and three exist ONLY on day one; from
   day two the normal Train tab returns, because by then its numbers mean
   something and the shortcuts would be in the way.
   The logger itself is untouched on purpose. The first set is logged in the
   real app, not a tutorial copy of it, so nothing has to be relearned
   tomorrow.
   PREVIEW: d1.preview renders the whole flow over live data and writes
   NOTHING -- the maker can look at it on his own device without logging out.
   Every action below checks it. */
let d1={step:0, part:null, preview:false};
const d1Parts=()=>Object.keys(SEED.catalog||{});
function dayOneHTML(){
  const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const bar=d1.preview
    ? `<div class="d1bar mono">Preview \u00b7 day one<button class="chip" data-d1="exit">Exit</button></div>` : '';
  if(d1.step===1) return `${bar}<div class="card d1card">
      <button class="d1back" data-d1="back" aria-label="Back">\u2190</button>
      <h3 class="d1q">What did you train?</h3>
      <div class="d1grid">${d1Parts().map(p=>
        `<button class="d1tile" data-d1part="${esc(p)}">${esc(p)}</button>`).join('')}</div>
    </div>`;
  if(d1.step===2){
    const list=(SEED.catalog[d1.part]||[]).slice(0,8);
    return `${bar}<div class="card d1card">
      <button class="d1back" data-d1="back" aria-label="Back">\u2190</button>
      <h3 class="d1q">${esc(d1.part)}</h3>
      <div class="d1list">${list.map(x=>
        `<button class="d1row" data-d1ex="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    </div>`;
  }
  /* step 0 -- the square you are about to fill, stated before it is explained */
  return `${bar}<div class="card d1card d1hero">
      <i class="d1sq" aria-hidden="true"></i>
      <h3 class="d1h">One set is day one.</h3>
      <p class="muted d1p">ShowUp counts days, not perfection.</p>
      <button class="onbbtn pri" data-d1="start">Log your first set</button>
      <button class="onbbtn d1soon" data-d1="soon" aria-disabled="true">Bring my logs over \u00b7 soon</button>
      ${d1.preview?`<button class="d1link" data-d1="moment">See the moment</button>`
                  :`<button class="d1link" data-onbact="demo">Explore with sample data</button>`}
    </div>`;
}
function emptyHero(which){
  const cta=`<div class="onbctas"><button class="onbbtn pri" data-onbact="golift">Log your first set</button>
    <button class="onbbtn ghost" data-onbact="demo">Explore with sample data</button></div>`;
  if(which==='stats') return `<div class="card emptyhero"><h3>Nothing to count yet</h3>
    <p class="muted">This tab will hold your streaks, year consistency, records, and lifetime volume — all derived from days you log. It starts working at one set.</p>${cta}</div>`;
  if(which==='history') return `<div class="card emptyhero"><h3>No history yet</h3>
    <p class="muted">Every day you train lands here, forever. That can start today.</p>${cta}</div>`;
  return `<div class="card emptyhero"><h3>Your first day starts with one set</h3>
    <p class="muted">ShowUp counts days, not perfection. Log one set and today turns blue — the streak takes care of itself.</p>${cta}</div>`;
}
document.addEventListener('click',e=>{
  const chip=e.target.closest('[data-onbp]');
  if(chip){ const p=chip.dataset.onbp; onbSel.has(p)&&onbSel.size>1?onbSel.delete(p):onbSel.add(p); onbRender(); return; }
  const u=e.target.closest('[data-onbu]');
  if(u){ onbUnit=u.dataset.onbu; onbRender(); return; }
  /* v3.3.372: day one's own actions. In PREVIEW none of these may write:
     picking a lift shows the logger for real on day one, but in preview it
     stops at the ceremony instead, because entering the logger over live data
     is one tap away from adding a set to a 953-day ledger. */
  const dp=e.target.closest('[data-d1part]');
  if(dp){ d1.part=dp.dataset.d1part; d1.step=2; render(); return; }
  const dx=e.target.closest('[data-d1ex]');
  if(dx){
    if(d1.preview){ celebrateDayDone(true,1); return; }
    lift.part=d1.part; lift.ex=dx.dataset.d1ex; lift.weight=0;
    view='lift'; d1.step=0; render(); return;
  }
  /* v3.3.376: replay the day's own ceremony, on request only. preview=true
     so it never re-stamps or writes -- the day is already stamped, and asking
     to see it again is not a second completion. */
  /* v3.3.377: one shareable artifact, reachable two ways -- the replay runs
     the same ceremony and lands on the same card. */
  if(e.target.closest('[data-replayday]')){ celebrateDayDone(true); return; }
  const d=e.target.closest('[data-d1]');
  if(d){
    const act=d.dataset.d1;
    if(act==='start'){ d1.step=1; render(); }
    else if(act==='back'){ d1.step=d1.step>1?d1.step-1:0; render(); }
    else if(act==='moment'){ celebrateDayDone(true,1); }
    else if(act==='exit'){ d1.preview=false; d1.step=0; d1.part=null; render(); }
    else if(act==='soon') toast('Importing your old logs is coming');
    return;
  }
  const a=e.target.closest('[data-onbact]');
  if(!a) return;
  const act=a.dataset.onbact;
  if(act==='signin') signInGoogle();
  else if(act==='local'){ onbStep=2; onbRender(); }
  else if(act==='toStep3'){ onbStep=3; onbRender(); }
  else if(act==='toStep4'){ onbStep=4; onbRender(); }
  else if(act==='skip') onbFinish(true);
  else if(act==='finish') onbFinish(false);
  else if(act==='demo') demoLoad();
  else if(act==='democlear') demoClear();
  else if(act==='golift'){ view='lift'; render(); }
});
/* v3.3.66 — the greeting is a STATE, not decoration. It belongs to "hasn't
   trained yet today" and it leaves the moment the first set lands, like every
   other live state in this app. A permanent name banner is wallpaper in three
   days; this one is only ever seen on arrival. */
/* v3.3.76 — variation without cringe. The word tracks the clock through five
   bands, one word each, so 4am and 11pm get their own dry nod instead of a
   wrong 'Morning'/'Evening'. Pure function so the clock can be tested.
   The subline stays a receipt — the day count — and inside the last 75 days
   before a round thousand it counts down to it, because that is a fact, not
   a compliment. No exclamation marks anywhere in this card, ever. */
function helloPart(hr){
  return hr<5?'Early':hr<12?'Morning':hr<18?'Afternoon':hr<22?'Evening':'Late';
}
/* v3.3.106: the ONE anticipation the milestone doctrine sanctions —
   thousands only, and only inside 75 days (v3.3.98: no countdowns to small
   rungs, because anticipation-farming is the mechanism, not the size).
   Extracted so the greeting and the Rhythm card can't drift apart. */
function msNearThousand(d){
  const next=[1000,1500,2000,2500,3000,4000,5000].find(m=>m>d);
  return next&&next-d<=75 ? {next, left:next-d} : null;
}
function helloSub(d){
  if(!d) return '';
  const n=msNearThousand(d);
  return n ? `${fmt(d)} days in · ${n.left} to ${fmt(n.next)}.` : `${fmt(d)} days in.`;
}
function helloCard(){
  const n=firstName();
  const part=helloPart(new Date().getHours());
  const sub=helloSub(SEED.totals.sessions);
  return `<div class="hello"><span class="hi">${part}${n?', '+n:''}.</span>${
    sub?`<span class="hisub">${sub}</span>`:''}</div>`;
}
/* count-up: the number climbs from the previous rung, ~1.6s ease-out, once
   per render of a pending moment. Reduced motion → static, guarded by the
   media query at call time. Inline animation, no fill-mode, no stacking. */
function countUpEl(el,dur){
  if(!el) return;
  try{ if(matchMedia('(prefers-reduced-motion: reduce)').matches) return; }catch(e){}
  const from=+el.dataset.from||0, to=+el.dataset.to||0; if(to<=from) return;
  const t0=performance.now();
  const step=(t)=>{
    const p=Math.min(1,(t-t0)/dur), e2=1-Math.pow(1-p,3);
    el.textContent=fmt(Math.round(from+(to-from)*e2));
    if(p<1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function msCountUp(){ countUpEl(document.querySelector('.msmoment .msnum'),1600); }
/* the day number ticks over ONCE per app open, not on every tab switch —
   an earned response to a real event, not a decoration that repeats. */
let _dayUpPlayed=false;
function dayCountUp(){
  if(_dayUpPlayed) return;
  const el=document.querySelector('.rhythm .big.dayn'); if(!el) return;
  _dayUpPlayed=true; countUpEl(el,900);
}
function renderToday(){
  /* v3.3.319: the paste/preview screen is a full-tab takeover that renderLift
     has owned since v3.3.278. Now that Paste lives on Today, this tab has to
     open it too — otherwise the button the maker taps does nothing. Same
     shape as renderLift's: commit and stop. */
  if(lift.plan==='paste'||lift.plan==='preview'){ $('#view').innerHTML=planScreenHTML(); return; }
  if(lift.plan==='write'){ $('#view').innerHTML=writerScreenHTML(); return; }   // v3.3.400: the writer's ask screen
  if(lift.plan==='writing'){ $('#view').innerHTML=writerWaitHTML(); return; }   // v3.3.406: the wait, as a receipt
  if(d1.preview || (SEED.totals.sessions===0 && !((DB.days[todayISO]||{}).w||[]).length)){
    $('#view').innerHTML=dayOneHTML(); return; }
  planWake();   // v3.3.397: a plan written last night for today feeds the rail now
  const P=trainingPlan();
  const t=day(todayISO);
  const logged=t.w.length>0;
  msFloorInit();
  const msN=msPending();
  const donePartsRaw=[...new Set(t.w.map(s=>s.part))];
  const doneLift=donePartsRaw.filter(p=>p!=='Run');
  const ranRaw=t.w.some(s=>s.ex==='Run');
  const cur=yearCurves()[thisYear];
  const pct=cur?Math.round(cur.curve[cur.end-1]*100):0;

  let h='';
  if(msN){
    const tier=msTier(msN);
    /* thousand tier: the record itself is the spectacle — the month grid
       cascades in square by square and the number lands on top. No
       confetti; the fireworks are the receipts. */
    let cascade='';
    if(tier==='thousand'){
      const gd=gridData(); const keys=Object.keys(gd.mDays).sort();
      cascade='<div class="msgrid">'+keys.map((k,i)=>
        `<i style="opacity:${(0.25+0.75*gd.mDays[k]/gd.max).toFixed(2)};animation-delay:${Math.min(i*28,1600)}ms"></i>`).join('')+'</div>';
    }
    h+=`<div class="card msmoment ${tier}" data-ms="${msN}">
      ${cascade}
      <div class="mskick">DAY</div>
      <div class="msnum" data-from="${msPrevRung(msN)}" data-to="${msN}">${fmt(msN)}</div>
      <div class="msline">${msLine(msN)}</div>
      <div class="row" style="gap:8px;margin-top:14px">
        <button class="btn ghost" id="msShare" style="flex:1;margin:0">Share as image</button>
        <button class="btn ghost" id="msDismiss" style="flex:1;margin:0">Carry on</button>
      </div>
    </div>`;
  }

  if(!logged){
    // ---- before the gym: what should I train
    h+=helloCard();
    /* v3.3.319: before the gym, the plan is what you came to read — the same
       section the mid-session branch leads with, so Today shows one thing in
       both states. Rhythm left with it; it restated the streak and the day
       count that the header already carries and that Stats tells properly. */
    h+=planSectionHTML();
    /* v3.3.79: annotation, never homework. The button sits here; it never
       prompts, never nags, and an undeclared rest day is not a lesser rest
       day. Tap again to undo — every state walks out. Gone the moment a
       set lands (the whole !logged branch is). */
    /* v3.3.374: a plan for today is an answer, so the screen stops asking.
       The plan card, the rest button and the recommendation were making three
       different claims about the same day at once: eight exercises listed,
       "Rest day" offered beneath them, and a part the plan never mentions
       recommended below that. Rest stays available on any day you have NOT
       declared a plan for -- declaring one is itself a statement that today
       is not a rest day, and the button returns the moment the plan is
       cleared. Nothing is disabled or greyed: it is simply not asked. */
    const _pl0=planNow();
    const _rest=!!(DB.days[todayISO]&&DB.days[todayISO].rest);
    if(!_pl0) h+=`<button class="btn ghost restbtn ${_rest?'on':''}" id="restBtn">${
      _rest?'🍃 Resting today · tap to undo':'🍃 Rest day'}</button>`;
    /* v3.3.374: WITH A PLAN, "Train next" IS THE PLAN. The planner answers
       "what should I train?" from the rotation; the moment you save a plan you
       have answered it yourself, and a card arguing with your own decision is
       noise. It names the first item you have NOT logged, not the first item:
       "first" is right until you finish it and wrong for the rest of the
       session. planLoggedToday() already drives the tick marks on the plan
       rows, so this advances with them.
       When every item is logged the card goes quiet rather than falling back
       to the rotation -- the honest next action then is the day-end button. */
    const _next=_pl0?(_pl0.items||[]).find(i=>!planLoggedToday(i.ex)):null;
    if(_pl0){
      h+=`<h2>Train next</h2>`;
      if(_next){
        h+=`<div class="card tnextplan"><div class="row spread">
              <div><div style="font-family:var(--disp);font-weight:700;font-size:20px">${_next.ex}</div>
              <div class="mono muted" style="font-size:12px;margin-top:2px">next in your plan</div></div>
              <button class="chip on" data-planex="${_next.ex}">Start →</button>
            </div></div>`;
      }else{
        h+=`<div class="card"><div class="mono muted" style="text-align:center;padding:4px 0">
              Every exercise in your plan is logged.</div></div>`;
      }
    }
    else{
    h+=`<h2>Train next</h2>`;
    if(P.pick){
      const i0=P.info[P.pick];
      /* v3.3.276: the card makes ONE claim (maker's call — the two-clause
         line squeezed the Start button into a two-line wrap). The claim is
         the last real session, the fact the pick rests on; cadence and the
         overdue percentage stay in the numbers behind the pick, not on the
         card. */
      const sub = i0.live
        ? (i0.sinceF!==i0.since?`full session ${i0.sinceF}d ago`:`${i0.since}d since`)
        : (i0.days===0 ? `not trained yet` : `${i0.since}d since · ${i0.days} day${i0.days===1?'':'s'} logged`);
      h+=`<div class="card"><div class="row spread">
            <div><div style="font-family:var(--disp);font-weight:700;font-size:20px">${P.pick}</div>
            <div class="mono muted" style="font-size:12px;margin-top:2px">
              ${sub}</div></div>
            <button class="chip on" data-go="${P.pick}">Start →</button>
          </div></div>`;
      if(P.addon){
        const ai=P.info[P.addon];
        h+=`<div class="row spread card" style="margin-top:8px;padding:11px 14px">
              <span class="mono muted" style="font-size:12px">Add on: <b style="color:var(--chalk)">${P.addon}</b> · ${ai.since}d since</span>
              <button class="chip" data-go="${P.addon}">+</button></div>`;
      }
    }
    }   /* end: no plan for today -- the rotation answers instead */
    /* the run nudge and the door to other parts survive either branch: an
       add-on is not a claim about what to train, and the door is navigation. */
    if(P.run){
      h+=`<div class="row spread card" style="margin-top:8px;padding:11px 14px">
            <span class="mono muted" style="font-size:12px">Run · ${P.run.since}d since (you run most days)</span>
            <button class="chip" data-go="Run">Go</button></div>`;
    }
    /* v3.3.248: the door counts everything below the pick, cold parts
       included — before, a new user had no mains, so the way through to the
       rest of the body was missing entirely. */
    const rest=(P.mains.length?P.mains:P.coldMains).slice(1);
    if(rest.length){
      /* v3.3.86: the Readiness board is gone from Today — the Lift tab's
         part list IS that board, and Today keeps a door instead of a copy.
         One receipt survives on the door: the due count. */
      const nDue=rest.filter(p=>P.score(p)>=1).length;
      h+=`<button class="btn ghost" id="goLift" style="margin-top:14px">Train other parts${nDue?` · ${nDue} due`:''} →</button>`;
    }
    $('#view').innerHTML=h; msCountUp(); dayCountUp(); return;
  }

  // ---- mid-session: what am I doing right now
  /* v3.3.412: A CLOSED DAY POINTS FORWARD. The header already knows three
     states -- empty and breathing, red, filled and still -- but this body
     did not: after the day-end was pressed it still led with the plan,
     offered a recommendation, invited another part, and buried the one thing
     that said "closed" at the very bottom. The screen's order said KEEP GOING
     while the header said DONE.
     Order and weight fix it, not a new element. On a closed day the finished
     card LEADS; Train next and Add another part leave, because a closed day
     has no next; the plan header points to tomorrow (lift.js, the ledger
     rule); the plan card recedes to a receipt. Training Today stays: it is
     the record. No check mark, no colour, no banner -- closed is a quiet
     state, and its cue is that the screen stops asking things of you. */
  const _closed=dayClosed();
  const _closedCard=()=>{
    const _n=SEED.totals.sessions+(t.w.length?1:0);
    const _st=currentStreak();
    return `<button class="card dayclosed" data-replayday="1" aria-label="Today is complete. Tap to see it again.">
          <i class="dcsq" aria-hidden="true"></i>
          <b class="dcn">Day ${fmt(_n)} — in the book.</b>
          <span class="dcm mono">${t.w.length} set${t.w.length===1?'':'s'}${_st>1?` \u00b7 ${_st}-day streak`:''}</span>
          <span class="dcr mono">logging another set reopens it</span>
        </button>`;
  };
  if(_closed) h+=_closedCard();
  h+=todayHeroHTML();
  /* v3.3.374: MID-SESSION IS WHEN "what's next" ACTUALLY MATTERS, and until
     now Today answered it only BEFORE the first set -- the moment the first
     set landed, this branch took over and Train next disappeared entirely.
     That made "the first UNLOGGED item" indistinguishable from "the first
     item": by the time one was logged, the card was already gone. The rule
     was unobservable, which is another way of saying it was not a rule.
     Here it is real. The card advances as each exercise is logged, and goes
     quiet when the plan is done rather than sending you back to the rotation
     -- the next action then is the day-end button. */
  {
    const _plm=planNow();
    /* v3.3.412: no recommendation on a closed day -- the question "what
       should I train?" was answered when the day-end was pressed. */
    const _nx=(_plm&&!_closed)?(_plm.items||[]).find(i=>!planLoggedToday(i.ex)):null;
    if(_nx) h+=`<h2>Train next</h2>
      <div class="card tnextplan"><div class="row spread">
        <div><div style="font-family:var(--disp);font-weight:700;font-size:20px">${_nx.ex}</div>
        <div class="mono muted" style="font-size:12px;margin-top:2px">next in your plan</div></div>
        <button class="chip on" data-planex="${_nx.ex}">Start →</button>
      </div></div>`;
  }
  /* v3.3.285: the parts trained today move off the heading onto their own
     quiet line. Inline, four parts wrapped into the title and collided with
     it; the heading is a label and should stay one short thing. */
  h+=`<h2>Training today</h2>`;
  if(doneLift.length) h+=`<div class="todaypartsline mono">${doneLift.join(' · ')}</div>`;
  const byPart={};
  t.w.forEach(s=>{(byPart[s.part]=byPart[s.part]||[]).push(s);});
  for(const [part,sets] of Object.entries(byPart)){
    const byEx={};
    sets.forEach(s=>{(byEx[s.ex]=byEx[s.ex]||[]).push(s);});
    const vol=sets.reduce((a,s)=>a+volOf(s),0);
    const km=sets.filter(s=>s.ex==='Run').reduce((a,s)=>a+s.w,0);
    h+=`<div class="card" style="margin-bottom:8px">
          <div class="row spread" style="margin-bottom:8px">
            <b style="font-size:16px">${part}</b>
            <span class="mono muted" style="font-size:12px">${vol?vDisp(vol)+' '+U():''}${km?dDisp(km)+' '+DU():''}</span>
          </div>`;
    for(const [ex,list] of Object.entries(byEx)){
      const detail = ex==='Run'
        ? list.map(s=>`${dDisp(s.w)}${DU()} · ${s.mins||0}'${String(s.secs||0).padStart(2,'0')}"`).join('  ')
        : list.map(s=>`${wLabel(ex,s.w)}×${s.reps[0]}`).join('  ');
      const open=exOpen(ex);
      /* v3.3.299: no trailing arrow — the row is the button, and the arrow
         was the middle-child-of-space-between problem in a third place. The
         sets count moves into a fixed column so it lines up down the card. */
      h+=`<button class="item todayrow ${open?'':'fin'}" data-ex="${ex}" data-part="${part}">
            <span style="flex:1;min-width:0"><b>${ex}</b><div class="sub">${detail}</div></span>
            <span class="tsets">${list.length} set${list.length>1?'s':''}</span>
          </button>`;
    }
    if(partOpen(part)) h+=`<button class="chip on ${isLive()?'livego':''}" data-go="${part}" style="margin-top:2px">Continue ${part} →</button>`;
    h+=`</div>`;
  }

  // still worth a nudge if the run isn't in yet
  if(!ranRaw && P.run){
    h+=`<div class="row spread card" style="margin-top:8px;padding:11px 14px">
          <span class="mono muted" style="font-size:12px">Run not logged yet · ${P.run.since}d since</span>
          <button class="chip" data-go="Run">Go</button></div>`;
  }

  /* v3.3.371: the ORDER here was already right and I said otherwise -- the
     chips come first, the button that ends the day comes last, which is the
     correct sequence for the last thing you do. The real fault was that the
     one action closing the session looked like every other button and sat
     wherever the page happened to end, often below the fold. It is the only
     route to the day-done ceremony (v3.3.369), so a person could finish a
     workout and never find the moment the app was built to give them.
     It STICKS to the bottom of the screen while a session is live, and it
     names the count -- so it states what you are about to put in the book
     rather than asking for a decision. */
  /* v3.3.375: the button sits DIRECTLY UNDER THE WORK IT CLOSES, above the
     offer to add more. v3.3.371 made it position:sticky so it could not fall
     below the fold -- and sticky with a `bottom` offset pins an element
     UPWARDS when its natural place is lower than the pin line, so on a short
     page it lifted off the end of the document and painted straight over the
     part chips that precede it. It was reachable and in the way.
     In flow, immediately after the session cards, it is reachable for the
     same reason without overlapping anything: you meet it the moment you
     finish reading what you did, and "Add another part" reads as the
     alternative to it rather than as something to scroll past first. */
  if(isLive()) h+=`<button class="btn done dayend" id="doneAllBtn">\u2713 Complete workout \u00b7 ${t.w.length} set${t.w.length===1?'':'s'}</button>`;
  /* v3.3.376: THE FINISHED DAY IS WORTH LOOKING AT. What stood here was two
     lines of grey mono -- "Workout complete . 23 sets - logging another set
     reopens it" -- which is the end state of the thing this whole app is
     about, written as a footnote about database behaviour. The day you closed
     out had less visual weight than a part chip.
     It is a card now, in the SAME PLACE the button was, so the page does not
     change shape when you finish: today's square filled, the day count, and
     the same words the ceremony uses. One voice for the moment and its
     aftermath.
     TAP TO SEE IT AGAIN. The once-a-day stamp exists so the ceremony does not
     INTERRUPT you twice; a deliberate tap is not an interruption, so it
     replays on request and never on arrival. Re-opening Today on a finished
     day stays quiet.
     The reopen sentence survives, small and underneath: it is a mechanic, and
     true, but it is not the point. */
  /* v3.3.412: the finished card moved to the TOP of a closed day (above).
     Down here it was the last thing on the page, after an invitation to add
     more -- the order said keep going. And a closed day offers no other
     parts: the chips are for an open session. */
  if(_closed){ $('#view').innerHTML=h; msCountUp(); dayCountUp(); return; }
  h+=`<h2 class="quiet">Add another part</h2><div class="chips">`;
  P.mains.filter(p=>!doneLift.includes(p)).forEach(p=>{
    const i1=P.info[p];
    h+=`<button class="chip" data-go="${p}">${p}<span class="n">${i1.since===0?'today':i1.since+'d ago'}</span></button>`;
  });
  P.addons.filter(p=>!doneLift.includes(p)).forEach(p=>{
    h+=`<button class="chip" data-go="${p}">${p}<span class="n">${P.info[p].since}d ago</span></button>`;
  });
  h+=`</div>`;
  /* the count is the whole argument for pressing it: it names what you are
     about to put in the book, so the button states a fact rather than asking
     for a decision. */
  $('#view').innerHTML=h; msCountUp(); dayCountUp();
}

/* ---------- Lift ---------- */
function exLastFor(ex){
  let last=SEED.exLast[ex]||null;
  for(const [d,v] of Object.entries(DB.days))
    if(v.w.some(s=>s.ex===ex) && (!last||d>last)) last=d;
  return last;
}
/* sessions in the last 365 days — how much of a staple this lift is */
function exFreq(ex){
  const cut=new Date(); cut.setDate(cut.getDate()-365);
  const cISO=cut.toLocaleDateString('en-CA');
  let n=SEED.exFreq[ex]||0;                       // true count from the imported history
  for(const [d,v] of Object.entries(DB.days))     // plus anything logged in the app since
    if(d>=cISO && d>SEED.totals.last && v.w.some(s=>s.ex===ex)) n++;
  return n;
}
/* Go-to = a lift you're actually running right now: done in the last 60 days,
   and more than a one-off. Everything else with history is Occasional.        */
function exTier(ex){
  const ov=(DB.settings.tierOv||{})[ex];
  const last=exLastFor(ex);
  if(!last) return 'new';
  const ago=daysAgo(last);
  if(ov==='core') return ago<=365 ? 'goto' : 'sometimes';   // pins expire after a year away
  if(ov==='other') return 'sometimes';
  /* v3.3.146: what you did TODAY is today's staple, whatever the lifetime
     count says — a deadlift after 1,162 days away sat in "Sometimes" while
     its sets were on the board, which read as the app disagreeing with the
     day. Self-correcting by construction: tomorrow ago=1 and the habit
     heuristics below take over, so one visit does not fake a staple — it
     only counts as one while it IS one. The explicit 'other' pin above
     still wins: a lift you demoted by hand stays demoted. */
  if(ago===0) return 'goto';
  // A repeated RECENT habit is a go-to, whatever the lifetime count says —
  // switching staples (Smith → Barbell incline) shows up here within weeks.
  const recent60=histFor(ex).filter(p=>daysAgo(p.d)<=60).length;
  if(recent60>=2) return 'goto';
  return (ago<=60 && exFreq(ex)>=3) ? 'goto' : 'sometimes';
}

/* progression chart: seed's last 14 sessions + everything app-logged since.
   Red dots are TRUE PRs — top set that tied or beat the all-time max at the time. */
function progChart(ex){
  const pts=histFor(ex);
  if(pts.length<3) return '';
  const body=isBody(ex)&&pts.every(p=>p.w<=0.01);
  const vals=pts.map(p=>body?p.r:p.w);
  const lo=Math.min(...vals), hi=Math.max(...vals);
  const span=Math.max(hi-lo, body?2:toKg(wStep(ex)*2));   // v3.3.250: two steps of THIS lift's law
  const top=hi+span*0.18, base=Math.max(0,lo-span*0.18);
  const X=i=>16+i*(298/Math.max(1,pts.length-1));
  const Y=v=>104-(v-base)/(top-base)*84;
  let runMax=0, poly='', dots='';
  const allMax=body?Math.max(...vals):prFor(ex).mw;
  pts.forEach((p,i)=>{
    const v=vals[i], x=X(i), y=Y(v);
    poly+=`${x.toFixed(1)},${y.toFixed(1)} `;
    const pr=v>=allMax&&v>runMax;                    // first time hitting the all-time top
    if(v>runMax) runMax=v;
    const last=i===pts.length-1;
    dots+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${pr?3.4:last?3:2}" fill="${pr?'var(--record)':'var(--accent)'}" ${last&&!pr?'class="beacon"':''}></circle>`;
    if(pr||last||i===0)
      dots+=`<text x="${x.toFixed(1)}" y="${(y-7).toFixed(1)}" text-anchor="middle" font-family="var(--mono)" font-size="5.5" fill="${pr?'var(--record)':'var(--muted)'}">${body?v+'r':wDisp(v)}</text>`;
  });
  const d0=pts[0].d, d1=pts[pts.length-1].d;
  return `<h2>Progression</h2><div class="card">
    <svg viewBox="0 0 330 122" style="width:100%;height:auto">
      <polyline points="${poly.trim()}" fill="none" stroke="var(--accent)" stroke-width="1.4" stroke-linejoin="round" opacity=".8"></polyline>
      ${dots}
      <text x="16" y="118" font-family="var(--mono)" font-size="5.5" fill="var(--muted)">${md(d0)}</text>
      <text x="314" y="118" text-anchor="end" font-family="var(--mono)" font-size="5.5" fill="var(--muted)">${md(d1)}</text>
    </svg>
    <div class="tot"><span>Top ${body?'reps':'set'} per session · last ${pts.length}</span>
      <span><b style="color:var(--record)">●</b> all-time best${body?'':` ${wDisp(allMax)} ${U()}`}</span></div>
  </div>`;
}
/* last ~14 sessions of top-set weight, as a tiny sparkline */
/* Stuck at the same top weight for 3+ sessions? Say so, once, quietly.
   Bodyweight-only moves are excluded (their progression is reps, not load), and a
   dismissal sticks for that exercise until the weight actually moves. */
function overloadNudge(ex){
  const pts=histFor(ex);
  if(pts.length<3) return null;
  const dis0=DB.settings.nudgeX||{};
  // BODYWEIGHT: you can't "add 2.5 kg to yourself" — progression is REPS.
  if(isBody(ex)){
    const rT=pts[pts.length-1].r;
    if(!rT) return null;
    let nr=0;
    for(let i=pts.length-1;i>=0;i--){ if(pts[i].r===rT) nr++; else break; }
    if(nr<3) return null;
    if(dis0[ex]==='r'+rT) return null;
    return {mode:'reps', n:nr, topR:rT, nextR:rT+1};
  }
  const top=pts[pts.length-1].w;
  if(!top) return null;
  let n=0;
  for(let i=pts.length-1;i>=0;i--){ if(Math.abs(pts[i].w-top)<0.01) n++; else break; }
  if(n<3) return null;
  const dis=DB.settings.nudgeX||{};
  if(dis[ex]===top) return null;                 // dismissed at this exact weight
  // Next weight = the smallest step UP you've ever actually used on this exercise
  // (your history is the gym's inventory). Only if nothing above exists, fall back
  // to an equipment-honest increment — dumbbells rack in 2s, not 2.5s.
  const used=[...new Set([
    ...Object.values(SEED.sessions).flat().filter(r=>r[1]===ex).map(r=>r[2]),
    ...Object.values(DB.days).flatMap(v=>v.w.filter(s=>s.ex===ex).map(s=>s.w))
  ])].filter(w=>w>top+0.01).sort((a,b)=>a-b);
  // Suggestions are IRON, not arithmetic (Sungjee's rule: never decimals):
  // every candidate — history included — snaps to buildable, integer loads.
  // kg: barbell/smith = bar + 5 kg total steps; dumbbells = whole-kg bells;
  // stacks = 5s. lb: 10 lb barbell steps; 5 lb bells/stacks. Must beat the top.
  /* v3.3.251: everything that is not a bar snaps through wLaw — the same
     authority the +/- buttons obey. These two had drifted: this snapper has
     always put stacks on 5s ("stacks = 5s", below the line above) while the
     stepper moved them by 2, so Today could name 45 kg on a Chest Press and
     the stepper could not land there — 44 went to 46. A suggestion you
     cannot reach is worse than none.
     The bar keeps its own lb branch on purpose: a 20 kg bar is 44.1 lb, so
     the honest law would print decimals, and suggestions are IRON. */
  const eq=equipOf(ex), bb=(eq==='barbell'||eq==='smith');
  const {s:lawS,a:lawA}=wLaw(ex);
  const snapSug=v=>{
    if(bb){
      if(isLb()) return toKg(Math.round(toU(v)/10)*10);
      const bar=barKg(ex);
      return bar+Math.round((v-bar)/5)*5;
    }
    return toKg(Math.max(lawA, lawA+Math.round((toU(v)-lawA)/lawS)*lawS));
  };
  const step=bb?(isLb()?toKg(10):5):toKg(lawS);
  let next=snapSug(used.length?used[0]:top+step);
  while(next<=top+0.01) next+=step;
  return {mode:'w', n, top, next};
}
function histFor(ex){
  const pts=(SEED.hist[ex]||[]).map(([d,w,r])=>({d,w,r}));
  for(const [d,v] of Object.entries(DB.days)){
    const sets=v.w.filter(s=>s.ex===ex);
    if(!sets.length) continue;
    const w=Math.max(...sets.map(s=>s.w));
    /* SLICE 3: a hold's number is seconds; it is not a rep count and cannot
       be the day's best one. */
    const r=Math.max(0,...sets.filter(s=>!isHold(s.su)).flatMap(s=>s.reps));
    const i=pts.findIndex(p=>p.d===d);
    if(i>=0) pts[i]={d,w,r}; else pts.push({d,w,r});
  }
  return pts.sort((a,b)=>a.d.localeCompare(b.d)).slice(-14);
}


/* D2: the marker GLIDES to its new rank — one motion, ≤400ms, honest events only */


/* ---------- D2 close: the milestone moment ----------
   One earned full-screen beat when a lifetime hundred falls. Iron-themed:
   the number, the unit, the day count. No confetti. Tap anywhere to return.
   One entrance motion, 380ms, none under reduced-motion. */
function msMoment(hit){
  let ov=document.getElementById('msOv');
  if(!ov){
    ov=document.createElement('div'); ov.id='msOv';
    document.body.appendChild(ov);
    ov.addEventListener('click',()=>{ ov.style.display='none'; });
  }
  const totalDays=SEED.totals.sessions+((((DB.days[todayISO]||{}).w)||[]).length?1:0);
  ov.innerHTML=`<div class="msIn">
    <div class="msNum mono">${fmt(hit)}</div>
    <div class="msUnit mono">LIFETIME ${DU()==='km'?'KILOMETERS':'MILES'}</div>
    <hr class="msRule">
    <div class="msSub mono">crossed ${wd(todayISO)} · day ${fmt(totalDays)} of showing up</div>
    <div class="msTap">tap to continue</div>
  </div>`;
  ov.style.display='flex';
}
