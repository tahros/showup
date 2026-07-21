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
/* v3.3.45: Daily Fire is gone and Rhythm takes the top slot. The pre-gym
   branch already opened with Rhythm, so Today now leads with the same card
   in both states. A live session still leads with the part digest — that's
   the one thing more urgent than rhythm while you're mid-set. */
function todayHeroHTML(){
  const part=livePartNow();
  if(part){
    const detail=allDays();
    const sess=partSessions(part,detail);
    if(sess.length) return partDigest(part,sess,{head:`${part} · live`,live:true});
  }
  return `<h2 class="quiet">Rhythm</h2>`+rhythmCard();
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
      <p class="onbnote">Tap to toggle. Everything stays available — this just shapes your suggestions.</p>
      <div class="onbchips">${Object.keys(SEED0.catalog).map(p=>
        `<button class="onbchip ${onbSel.has(p)?'sel':''}" data-onbp="${p}">${p}</button>`).join('')}</div>
      <button class="onbbtn pri" data-onbact="toStep3">Continue</button>
      <button class="onbbtn ghost" data-onbact="skip">Skip — it's all in Settings anyway</button></div>`;
  }else if(onbStep===3){
    const lb=onbUnit==='lb';
    b=`<div class="onbcard">
      <h3>Your numbers</h3>
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
function renderToday(){
  if(SEED.totals.sessions===0 && !((DB.days[todayISO]||{}).w||[]).length){
    $('#view').innerHTML=emptyHero('today'); return; }
  const P=trainingPlan();
  const t=day(todayISO);
  const logged=t.w.length>0;
  const donePartsRaw=[...new Set(t.w.map(s=>s.part))];
  const doneLift=donePartsRaw.filter(p=>p!=='Run');
  const ranRaw=t.w.some(s=>s.ex==='Run');
  const cur=yearCurves()[thisYear];
  const pct=cur?Math.round(cur.curve[cur.end-1]*100):0;

  let h='';

  if(!logged){
    // ---- before the gym: what should I train
    h+=rhythmCard();
    h+=`<h2>Train next</h2>`;
    if(P.pick){
      const i0=P.info[P.pick];
      const over=Math.round((i0.since/i0.gap-1)*100);
      h+=`<div class="card"><div class="row spread">
            <div><div style="font-family:var(--disp);font-weight:700;font-size:20px">${P.pick}</div>
            <div class="mono muted" style="font-size:12px;margin-top:2px">
              ${i0.since}d since · usually every ${Math.round(i0.gap)}d${over>0?` · <span style="color:var(--accent)">${over}% overdue</span>`:''}</div></div>
            <button class="chip on" data-go="${P.pick}">Start →</button>
          </div></div>`;
      if(P.addon){
        const ai=P.info[P.addon];
        h+=`<div class="row spread card" style="margin-top:8px;padding:11px 14px">
              <span class="mono muted" style="font-size:12px">Add on: <b style="color:var(--chalk)">${P.addon}</b> · ${ai.since}d since</span>
              <button class="chip" data-go="${P.addon}">+</button></div>`;
      }
    }
    if(P.run){
      h+=`<div class="row spread card" style="margin-top:8px;padding:11px 14px">
            <span class="mono muted" style="font-size:12px">Run · ${P.run.since}d since (you run most days)</span>
            <button class="chip" data-go="Run">Go</button></div>`;
    }
    const rest=P.mains.slice(1);
    if(rest.length){
      // readiness board: each part fills toward its usual interval. Full bar = due.
      h+=`<h2 class="quiet">Readiness</h2><div class="card" style="padding:8px 10px">`;
      rest.slice().sort((a,b)=>P.score(b)-P.score(a)).forEach(p=>{
        const i1=P.info[p];
        const pct=Math.min(100,Math.round(i1.since/Math.max(1,i1.gap)*100));
        const due=P.score(p)>=1;
        h+=`<button class="readyrow" data-go="${p}">
              <span class="rname">${p}</span>
              <span class="rbar"><i class="${due?'due':''}" style="width:${pct}%"></i></span>
              <span class="rmeta">${i1.since===0?'today':i1.since+'d'} <em>/ ${Math.round(i1.gap)}d</em></span>
            </button>`;
      });
      h+=`${iBtn('ready','Each bar fills toward how often you usually train that part. Full = due — tap to start.')}</div>`;
    }
    $('#view').innerHTML=h; return;
  }

  // ---- mid-session: what am I doing right now
  h+=todayHeroHTML();
  h+=`<h2>Training today${doneLift.length?` · <b class="hi">${doneLift.join(' · ')}</b>`:''}</h2>`;
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
        : list.map(s=>`${wDisp(s.w)}×${s.reps[0]}`).join('  ');
      const open=exOpen(ex);
      h+=`<button class="item todayrow ${open?'':'fin'}" data-ex="${ex}" data-part="${part}" style="margin-bottom:6px">
            <span><b>${ex}</b><div class="sub">${detail}</div></span>
            <span class="mono muted" style="font-size:11px">${list.length} set${list.length>1?'s':''} →</span>
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

  h+=`<h2 class="quiet">Add another part</h2><div class="chips">`;
  P.mains.filter(p=>!doneLift.includes(p)).forEach(p=>{
    const i1=P.info[p];
    h+=`<button class="chip" data-go="${p}">${p}<span class="n">${i1.since===0?'today':i1.since+'d ago'}</span></button>`;
  });
  P.addons.filter(p=>!doneLift.includes(p)).forEach(p=>{
    h+=`<button class="chip" data-go="${p}">${p}<span class="n">${P.info[p].since}d ago</span></button>`;
  });
  h+=`</div>`;
  if(isLive()) h+=`<button class="btn done" id="doneAllBtn">✓ Complete workout</button>`;
  else if(t.w.length&&t.doneAll)
    h+=`<div class="note mono" style="text-align:center;margin:14px 0 4px">✓ Workout complete · ${t.w.length} sets — logging another set reopens it</div>`;
  $('#view').innerHTML=h;
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
  const span=Math.max(hi-lo, body?2:toKg(STEP()*2));
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
  const eq=equipOf(ex);
  const snapSug=v=>{
    if(isLb()){
      const lb=toU(v), g=(eq==='barbell'||eq==='smith')?10:5;
      return toKg(Math.round(lb/g)*g);
    }
    if(eq==='barbell'||eq==='smith'){
      const bar=barKg(ex);
      return bar+Math.round((v-bar)/5)*5;
    }
    if(eq==='dumbbell') return Math.round(v);
    return Math.round(v/5)*5;
  };
  const step=isLb()?toKg((eq==='barbell'||eq==='smith')?10:5):(eq==='dumbbell'?1:5);
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
    const r=Math.max(0,...sets.flatMap(s=>s.reps));
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
