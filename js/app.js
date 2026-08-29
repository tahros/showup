/* ShowUp — app.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- events ---------- */
document.addEventListener('click',e=>{
  if(checkDate()) return;   // v3.3.158: the day rolled mid-tap — re-render, next tap lands right
  const t=day(todayISO);
  if(e.target.closest('#unitBtn')){
    DB.settings.unit=isLb()?'kg':'lb';
    save(true);toast(isLb()?'Imperial — lb & miles':'Metric — kg & km');return render();
  }
  if(e.target.closest('[data-thm]')){
    DB.settings.theme=e.target.closest('[data-thm]').dataset.thm;   // v3.3.96
    applyTheme();save(true);render();
    return;
  }
  if(e.target.closest('[data-skn]')){
    DB.settings.skin=e.target.closest('[data-skn]').dataset.skn;    // v3.3.168: 'minimal' | 'classic'
    applyTheme();save(true);render();
    return;
  }
  const gs=e.target.closest('#goalSet')||e.target.closest('#goalEdit');
  if(gs){
    const cur=(DB.settings.kmGoal||{})[thisYear]||+(gs.dataset.suggest||0);
    const v=prompt(`${thisYear} goal — how many ${DU()}?`, cur||'');
    if(v!=null){
      const n=Math.round(+v);
      DB.settings.kmGoal=DB.settings.kmGoal||{};
      if(n>0) DB.settings.kmGoal[thisYear]=n; else delete DB.settings.kmGoal[thisYear];
      save(true); toast(n>0?`${thisYear} goal: ${fmt(n)} ${DU()}`:'Goal cleared');
      return render();
    }
    return;
  }
  const ng=e.target.closest('#nudgeGo');
  if(ng&&lift.ex){
    if(ng.dataset.nr){
      /* v3.3.286: the nudge used to type into the #rc field. That field is
         gone, so it moves the RULER instead — the target rep slides under
         the centre band, ready to log. */
      repRulerTo(+ng.dataset.nr,true); repTick();
      toast(`Target: ${ng.dataset.nr} reps — go get it`);
      return;
    }
    lift.weight=+ng.dataset.nw;
    saveExW(lift.ex,lift.weight);save(true);
    toast(`Weight set to ${wDisp(lift.weight)} ${U()} — go get it`);
    return renderLift();
  }
  const nx=e.target.closest('[data-nudgex]');
  if(nx&&lift.ex){
    const v=nx.dataset.nudgex;
    DB.settings.nudgeX=DB.settings.nudgeX||{};
    DB.settings.nudgeX[lift.ex]=isNaN(+v)?v:+v;   // 'r12' for reps-mode, number for weight
    save(true);return renderLift();
  }
  if(e.target.closest('#editSave')&&lift.editSet!=null){
    const es=t.w[lift.editSet];
    if(es){
      snapshot(`edited ${es.ex} set`);
      if(es.ex==='Run'){
        const dist=+($('#edW').value||0);
        if(!dist) return toast('Distance needed');
        es.w=fromD(dist); es.mins=+($('#edM').value||0); es.secs=+($('#edS').value||0);
      }else{
        const wv=toKg(+($('#edW').value||0));
        const reps=$('#edR').value.split(',').map(x=>Math.round(+x)).filter(x=>x>0);
        if(!reps.length) return toast('Enter reps');
        es.w=wv; es.reps=reps;
        saveExW(es.ex,wv);
      }
      touchToday();
      save();renderHeader();toast('Set updated');
    }
    lift.editSet=null;return renderLift();
  }
  if(e.target.closest('#editCancel')){ lift.editSet=null; return renderLift(); }
  if(e.target.closest('#doneExBtn')&&lift.ex){
    const m=dayMeta(); m.upd=Date.now();
    if(!m.doneEx.includes(lift.ex)) m.doneEx.push(lift.ex);
    // Cascade only when this part has ONE exercise today (the "Complete Run" flow).
    // Multi-exercise parts stay open — and undimmed — until the explicit Complete <part>.
    const exsInPart=new Set(m.w.filter(s=>s.part===lift.part).map(s=>s.ex));
    if(exsInPart.size===1){
      if(!m.donePart.includes(lift.part)) m.donePart.push(lift.part);
      if(!m.w.some(s=>!m.doneEx.includes(s.ex))) m.doneAll=true;
    }
    /* v3.1.15: multi-exercise parts stay open for MORE exercises — but when
       the ✕ just closed the LAST open exercise of the whole day, there is
       nothing left to stay open FOR. Close everything; red ends now. */
    if(!m.doneAll && !m.w.some(s=>!m.doneEx.includes(s.ex))){
      for(const p of new Set(m.w.map(s=>s.part)))
        if(p&&!m.donePart.includes(p)) m.donePart.push(p);
      m.doneAll=true;
    }
    save();renderHeader();doneToast(m,`${lift.ex} complete ✓`);
    lift.ex=null;return render();
  }
  if(e.target.closest('#reopenPartBtn')&&lift.part){
    const m=dayMeta(); m.upd=Date.now();
    m.donePart=m.donePart.filter(p=>p!==lift.part);
    m.doneAll=false;                       // a reopened part reopens the workout
    save();renderHeader();toast(`${lift.part} reopened — back at it`);
    return render();
  }
  if(e.target.closest('#donePartBtn')&&lift.part){
    const m=dayMeta(); m.upd=Date.now();
    m.w.filter(s=>s.part===lift.part).forEach(s=>{ if(!m.doneEx.includes(s.ex)) m.doneEx.push(s.ex); });
    if(!m.donePart.includes(lift.part)) m.donePart.push(lift.part);
    if([...new Set(m.w.map(s=>s.part))].every(p=>m.donePart.includes(p))) m.doneAll=true;
    save();renderHeader();doneToast(m,`${lift.part} complete ✓`);return render();
  }
  if(e.target.closest('#doneAllBtn')){
    const m=dayMeta(); m.upd=Date.now();
    m.w.forEach(s=>{ if(!m.doneEx.includes(s.ex)) m.doneEx.push(s.ex);
                     if(!m.donePart.includes(s.part)) m.donePart.push(s.part); });
    m.doneAll=true;
    save();renderHeader();doneToast(m,'');
    return render();
  }
  const sx=e.target.closest('[data-sugx]');
  if(sx&&lift.ex){   // v3.3.144: back with the strip
    const m=dayMeta();
    m.sugX[lift.ex]=[...(m.sugX[lift.ex]||[]),sx.dataset.sugx];
    save();return renderLift();
  }
  if(e.target.closest('#settingsBtn')||e.target.closest('#gearBtn')){
    if(view==='sync'){ view=prevView||'today'; }
    else { prevView=view; view='sync'; }
    return render();
  }
  const nav=e.target.closest('nav button');
  if(nav){
    if(session) cloudPush();
    view=nav.dataset.v;
    /* v3.3.347: the tab remembers, live or not */
    if(view==='lift'){const b=liftBack(); lift=b?{part:b.part,ex:b.ex,weight:0}:{part:null,ex:null,weight:0};}
    return render();
  }
  const pf=e.target.closest('[data-plfold]');
  if(pf){ DB.settings.plFold=!DB.settings.plFold; DB.settingsAt=Date.now(); save(true); return render(); }
  const ld=e.target.closest('.linkdate[data-histd]');
  if(ld){
    const iso=ld.dataset.histd;
    hist.y=+iso.slice(0,4); hist.m=+iso.slice(5,7);
    window._histTarget=iso;
    view='history';
    return render();
  }
  const go=e.target.closest('[data-go]');
  if(go){
    // v3.3.31: Continue means continue — an OPEN part jumps straight into its
    // last-logged exercise (you're between sets of it; back is one tap if not).
    // Start / add-on / Run keep landing on the part: nothing logged yet, or the
    // Run view owns itself. Fresh lift object, so no stale editor state rides in.
    const goP=go.dataset.go;
    /* v3.3.344: if you have BEEN on Train for this part during this session,
       go back to the screen you left. The rule below it -- land on the last
       exercise you logged -- is a guess for someone arriving cold, and it was
       overriding a fact: the maker steps to Today to read the plan and taps
       back, and got dropped into an exercise instead of the list he left. */
    const _b=liftBack();
    const goEx=(_b&&_b.part===goP)
      ? _b.ex
      : (goP!=='Run'&&partOpen(goP))
        ? (([...day(todayISO).w].reverse().find(s=>s.part===goP&&s.ex)||{}).ex||null)
        : null;
    view='lift';lift={part:goP,ex:goEx,weight:0};
    return render();
  }
  const pt=e.target.closest('[data-part]:not([data-ex])');
  if(pt){lift.part=pt.dataset.part;lift.ex=null;lift.weight=0;lift.enterAnim=true;return render();}   // v3.3.57: the arriving list gets its one entrance
  const ex=e.target.closest('[data-ex]');
  if(ex){
    lift.part=ex.dataset.part||lift.part; lift.ex=ex.dataset.ex;
    lift.weight=0; lift.editBar=false; lift.copy=false; lift.suggestOpen=null; lift.info=false; lift.editSet=null; lift.editToday=false;
    view='lift';                                   // <- was missing: Today stayed on Today
    return render();
  }
  if(e.target.closest('.back')){
    if(lift.copy){ lift.copy=false; return renderLift(); }
    if(view==='sync'){view=prevView||'today';return render();}
    if(lift.ex)lift.ex=null;else lift.part=null;
    return render();
  }
  /* v3.3.232: tapping either race scoreboard swaps totals for shares, on
     both cards at once — one preference, so the Stats tab never shows two
     units side by side. A full render() is right here: the gap chip, the
     unit captions and the aria label all change together, and the cards are
     above the fold on their own screens so there is no scroll to lose. */
  if(e.target.closest&&e.target.closest('[data-raceswap]')){
    DB.settings.raceShare=!DB.settings.raceShare;
    DB.settingsAt=Date.now(); save(true);
    /* v3.3.233: rewrite ONLY the two scoreboards. render() rebuilt the whole
       tab and sent the page back to the top — on a card that lives halfway
       down Stats, that threw the reader out of their place on every tap. The
       cards carry their own raw numbers, so nothing has to be re-derived. */
    raceApplyAll();
    return;
  }
  const wb=e.target.closest('[data-w]');
  if(wb){
    /* v3.3.7: plates load in PAIRS — barbell/smith move in 5 kg (10 lb)
       totals anchored at the bar. Non-conforming values snap to the next
       buildable total in the pressed direction (72.5 + -> 75, - -> 70).
       Other equipment keeps its old step exactly. */
    const dir=+wb.dataset.w;
    const {s,a:anchor}=wLaw(lift.ex);
    const cur=(+($('#wv').value||0));
    const k=(cur-anchor)/s;
    /* v3.3.255: the box holds the DISPLAY value, rounded to 0.1 — but the
       anchor is the exact bar conversion (20 kg = 44.0925 lb). In lb mode
       every barbell value therefore reads ~0.0075 above its own grid point,
       and ceil-minus landed straight back on it: a dead − button that moved
       0.0075 lb per press. The 1e-9 epsilon guarded float noise; the real
       error is display rounding, four orders of magnitude larger. So: any
       value within half a display unit (0.05) of a face IS that face and
       steps a whole step; only genuinely off-grid values snap directionally
       to the next face (72.5 + -> 75, - -> 70; typed 213 - -> 204.1). */
    const kR=Math.round(k);
    const on=Math.abs(cur-(anchor+kR*s))<0.051;
    const k2=on?kR+dir:(dir>0?Math.floor(k)+1:Math.ceil(k)-1);
    const shown=Math.max(anchor,anchor+k2*s);
    lift.weight=toKg(shown);
    saveExW(lift.ex,lift.weight);save(true);
    const wvEl=$('#wv');
    wvEl.value=Math.round(shown*10)/10;
    wvEl.classList.remove('wflash'); void wvEl.offsetWidth; wvEl.classList.add('wflash');
    refreshLoad();return;
  }
  /* v3.3.286: on the ruler, a tap on the CENTRED notch logs; a tap on any
     other notch centres it. A thumb landing mid-scroll can never write a set
     you did not do, and the arrival state is already the suggestion, so the
     common case is still one tap. */
  const rr=e.target.closest('.repruler .rr');
  if(rr){
    const want=+rr.dataset.rep;
    if(want!==repRulerValue()){ repRulerTo(want,true); repTick(); return; }
  }
  const rb=e.target.closest('[data-rep]');
  if(rb){
    lift.weight=toKg(+($('#wv').value||0));
    saveExW(lift.ex,lift.weight);
    t.w.push({part:lift.part,ex:lift.ex,w:lift.weight,reps:[+rb.dataset.rep],at:Date.now()});
    undoInvalidate();   // v3.3.143: new work makes an older snapshot unsafe to restore
    reopen(lift.ex,lift.part);
    lift.justSaved=true;save();renderHeader();setToast(lift.ex,lift.weight,+rb.dataset.rep);return renderLift();
  }
  if(e.target.closest('#addrep')){
    const r=repRulerValue();   // v3.3.286: the ruler is the field now
    const su=unitOf(lift.ex);
    if(!r||r<1) return toast(isHold(su)?'Set a hold':'Enter a rep count');
    lift.weight=toKg(+($('#wv').value||0));
    saveExW(lift.ex,lift.weight);
    /* SLICE 2: su rides on the SET, not only on the exercise. Change the unit
       later and everything already logged keeps meaning what it meant -- the
       same promise the equipment editor makes. */
    t.w.push({part:lift.part,ex:lift.ex,w:lift.weight,reps:[r],...(su?{su}:{}),at:Date.now()});
    undoInvalidate();   // v3.3.143
    reopen(lift.ex,lift.part);
    lift.justSaved=true;save();renderHeader();setToast(lift.ex,lift.weight,r);return renderLift();
  }
  const _su=e.target.closest&&e.target.closest('[data-setunit]');
  if(_su){
    const ex2=_su.dataset.setunitex, to=_su.dataset.setunit;
    if(to===SET_SEC) unitOv()[ex2]=SET_SEC; else delete unitOv()[ex2];
    DB.settingsAt=Date.now(); save(true);
    lift._tiles=null;                 // the cached emphasis belongs to the other unit
    lift.rep=null;
    toast(`${ex2} counts ${to===SET_SEC?'seconds':'reps'} now`);
    return renderLift();
  }
  const rs=e.target.closest('[data-rep-w]');
  if(rs){
    /* v3.3.144: restored with the strip (removed as an orphan in v3.3.143
       after the chips went in v3.3.141). One tap logs the complete pair. */
    const w=+rs.dataset.repW, r=+rs.dataset.repR;
    /* SLICE 3: the strip is suppressed for held exercises, so this should
       never fire for one -- but a writer that can silently omit the unit is
       exactly the drift the suppression is guarding against, so it carries
       the unit regardless. */
    const su2=unitOf(lift.ex);
    t.w.push({part:lift.part,ex:lift.ex,w,reps:[r],...(su2?{su:su2}:{}),at:Date.now()});
    undoInvalidate();   // v3.3.143: new work makes an older snapshot unsafe
    reopen(lift.ex,lift.part);
    lift.weight=w;
    saveExW(lift.ex,w);
    lift.justSaved=true;save();renderHeader();setToast(lift.ex,w,r);return renderLift();
  }
  /* ---- v3.3.278: today's plan. Every step is explicit; nothing auto-applies. */
  if(e.target.closest&&e.target.closest('[data-planpaste],[data-planedit]')){
    lift.plan='paste'; return render();
  }
  if(e.target.closest&&e.target.closest('[data-planback]')){
    lift.plan=null; lift.planRows=null; return render();
  }
  if(e.target.closest&&e.target.closest('[data-planread]')){
    const ta=document.getElementById('planText');
    const txt=ta?ta.value:'';
    if(!txt.trim()){ toast('Paste a session first'); return; }
    lift.planText=txt; lift.planRows=parsePlan(txt); lift.plan='preview'; return render();
  }
  const _pdrop=e.target.closest&&e.target.closest('[data-plandrop]');
  if(_pdrop){
    const r=(lift.planRows||[])[+_pdrop.dataset.plandrop];
    if(r){ r.kind='note'; r.raw=r.raw; }
    return render();
  }
  const _ppick=e.target.closest&&e.target.closest('[data-planpick]');
  if(_ppick){
    const r=(lift.planRows||[])[+_ppick.dataset.planpick];
    if(r){ r.ex=_ppick.dataset.planex2; r.cands=[]; }
    return render();
  }
  if(e.target.closest&&e.target.closest('[data-planaccept]')){
    const {items,note}=planItemsFrom(lift.planRows||[]);
    if(!items.length&&!note.trim()){ toast('Nothing to keep'); return; }
    planSave(items,note,lift.planText||'');
    lift.plan=null; lift.planRows=null;
    toast(items.length?`Plan set — ${items.length} exercise${items.length>1?'s':''}`:'Kept as a note');
    return render();
  }
  if(e.target.closest&&e.target.closest('[data-planfold]')){
    DB.settings.planFold=!DB.settings.planFold; DB.settingsAt=Date.now(); save(true);
    /* v3.3.319: render(), not renderLift(). The plan moved to Today, and a
       handler that re-renders a specific TAB rather than the current one
       wipes the section it was invoked from. Every other plan action already
       used render(); this one was the outlier. */
    return render();
  }
  if(e.target.closest&&e.target.closest('[data-planclear]')){
    planClear(); toast('Plan cleared'); return render();
  }
  const _prow=e.target.closest&&e.target.closest('[data-planex]');
  if(_prow){
    const ex=_prow.dataset.planex;
    lift.part=homePartOf(ex)||lift.part; lift.ex=ex; lift.weight=0;
    /* v3.3.321: go to the TRAIN tab. This set the exercise and re-rendered
       whatever tab you were on — which was Train, back when the plan lived
       there, so it worked by accident. The plan moved to Today in v3.3.319
       and the tap started re-rendering Today with an exercise selected that
       Today does not show. A row that names an exercise should open it. */
    view='lift';
    return render();
  }
  /* v3.3.284: per-exercise equipment override */
  const _ee=e.target.closest&&e.target.closest('[data-editequip]');
  if(_ee){ lift.editEquip=_ee.dataset.editequip; return renderLift(); }
  if(e.target.closest&&e.target.closest('[data-eqcancel]')){ lift.editEquip=null; return renderLift(); }
  const _se=e.target.closest&&e.target.closest('[data-seteq]');
  if(_se){
    const ex2=_se.dataset.seteqex, to=_se.dataset.seteq;
    equipOv()[ex2]=to;
    /* back to the catalog's own answer? then there is nothing to override */
    if((customs()[ex2]?.equip||SEED.equip[ex2]||'machine')===to) delete DB.settings.equipOv[ex2];
    DB.settingsAt=Date.now(); save(true);
    lift.editEquip=null;
    lift.weight=snapW(lift.weight,ex2);   // (kg, ex) — the old weight may be off the new grid
    toast(`${ex2} steps ${fmt(wStep(ex2))} ${U()} now`);
    return renderLift();
  }
  if(e.target.closest&&e.target.closest('[data-pmixmode]')){ pmixSetMode(); return; }
  const _pl=e.target.closest('.pmixlgd [data-pt]');
  if(_pl){ pmixSetFocus(_pl.dataset.pt); return; }   // v3.3.121
  if(e.target.closest('#dualMove')){
    const b=e.target.closest('#dualMove'), ex2=b.dataset.dex, to=b.dataset.dto;   // not data-ex: the exercise router would hijack the tap
    if(!confirm(`Move ${ex2} to ${to}?\n\nFrom now on it lists and logs under ${to}. Everything already logged stays exactly as trained.`)) return;
    partOv()[ex2]=to;
    if(homePartOf(ex2)===SEED0.ex2part[ex2]) delete DB.settings.partOv[ex2];   // moved back home: no override needed
    lift.part=to; save();
    return renderLift();
  }
  if(e.target.closest('#moGoalSet')){
    const v=Math.round(+(document.getElementById('moGoalIn').value||0));
    const pTxt=(document.getElementById('moPaceIn').value||'').trim();
    /* v3.3.161: the numeric keypad has no apostrophe — bare digits parse:
       730 -> 7'30, 1015 -> 10'15. Separators still accepted if pasted. */
    const m=pTxt.match(/^(\d{1,2})[':.](\d{1,2})$/)||pTxt.match(/^(\d{1,2})(\d{2})$/);
    if(m) DB.settings.tgtPace=(+m[1])*60+(+m[2]);
    else if(!pTxt) DB.settings.tgtPace=0;
    if(v>0) DB.settings.moGoal=v;
    delete DB.settings._moEdit; save();
    return render();   // v3.3.161: the card lives on Stats now — render the CURRENT view
  }
  if(e.target.closest('#moGoalEdit')){ DB.settings._moEdit=1; return render(); }  // v3.3.159: edit prefills, never wipes
  if(e.target.closest('#sessEdit')){ lift.editToday=!lift.editToday; lift.editSet=null; return renderLift(); }
  // v3.3.144: #allSets removed with the CAP — edit mode shows every set
  if(e.target.closest('#addEx')){ lift.adding=true; return renderLift(); }
  if(e.target.closest('#cancelEx')){ lift.adding=false; return renderLift(); }
  const ne=e.target.closest('[data-newequip]');
  if(ne){ lift.newEquip=ne.dataset.newequip; return renderLift(); }
  if(e.target.closest('#saveEx')){
    const name=($('#newExName').value||'').trim();
    if(!name) return toast('Name it first');
    if(SEED.equip[name]||customs()[name]) return toast('That exercise already exists');
    DB.settings.custom={...customs(), [name]:{part:lift.part, equip:lift.newEquip||'barbell'}};
    lift.adding=false;
    save(true); toast(`${name} added to ${lift.part}`);
    lift.ex=name; lift.weight=0;
    return renderLift();
  }
  const de=e.target.closest('[data-delex]');
  if(de){
    const n=de.dataset.delex;
    const c={...customs()}; delete c[n];
    DB.settings.custom=c;
    save(); toast(`${n} deleted`); return renderLift();
  }
  const tm=e.target.closest('[data-tier-ex]');
  if(tm){
    DB.settings.tierOv={...(DB.settings.tierOv||{}), [tm.dataset.tierEx]: tm.dataset.tierTo};
    save(true); toast(`${tm.dataset.tierEx} → ${tm.dataset.tierTo==='core'?'Core':'Other'}`);
    return renderStats();
  }
  const hy=e.target.closest('[data-histy]');
  if(hy){ hist.y=+hy.dataset.histy;
    const mk2=`${hist.y}-${String(hist.m).padStart(2,'0')}`;
    if(mk2>todayISO.slice(0,7)) hist.m=+todayISO.slice(5,7);
    return renderHistory(); }
  const hm=e.target.closest('[data-histm]');
  if(hm){ hist.m=+hm.dataset.histm; return renderHistory(); }
  const hp=e.target.closest('[data-histp]');
  if(hp){ const v=hp.dataset.histp; hist.part=(v&&v!==hist.part)?v:null; return renderHistory(); }
  // v3.3.141: #infoBtn, #toggleSuggest and #copySets all belonged to the
  // Suggested zone and went with it. (#toggleSuggest had been dead markup
  // for some time — no element carried that id.)
  if(e.target.closest('#moveToday')){
    touchToday();
    lift.copy={mode:'today',
      sets:t.w.filter(s=>s.ex===lift.ex).flatMap(s=>s.reps.map(r=>({w:s.w,r}))), d:null};
    return renderLift();
  }
  if(e.target.closest('[data-cancelcopy]')){ lift.copy=false; return renderLift(); }
  if(e.target.closest('#undoBtn')) return undo();
  const dx=e.target.closest('[data-dropex]');
  if(dx){
    const ex2=dx.dataset.dropex;
    const n=t.w.filter(s=>s.ex===ex2).length;
    snapshot(`removed ${n} ${ex2} set${n>1?'s':''}`);
    DB.days[todayISO].w=t.w.filter(s=>s.ex!==ex2);
    resealDay(dayMeta());                 // v3.3.39: the path v3.3.20 missed
    reanchorRest();
    save();renderHeader();toast(`${ex2} removed from today`);return renderLift();
  }
  if(e.target.closest('#clearToday')){
    const n=t.w.filter(s=>s.ex===lift.ex).length;
    if(!n) return;
    snapshot(`cleared ${n} ${lift.ex} sets`);
    t.w=t.w.filter(s=>s.ex!==lift.ex);
    DB.days[todayISO].w=t.w;
    /* v3.3.20: removing a set must also walk the day's state BACK.
       A remaining set counts as completed if its EXERCISE is done OR its
       PART is done — runs are sealed at the part level, which the v3.3.19
       exercise-only test missed (Sungjee's red bar stayed up because his
       Run was in donePart, not doneEx). */
    resealDay(t);
    reanchorRest();
    save();renderHeader();toast(`Cleared ${n} sets — undo below`);return renderLift();
  }
  const ct=e.target.closest('[data-copyto]');
  if(ct){
    const target=ct.dataset.copyto, tpart=ct.dataset.copypart;
    const moving=lift.copy.mode==='today';
    const sets=lift.copy.sets;
    if(!sets.length){ lift.copy=false; return renderLift(); }
    if(moving){
      snapshot(`moved ${sets.length} sets to ${target}`);
      t.w=t.w.filter(s=>s.ex!==lift.ex);
      DB.days[todayISO].w=t.w;
      sets.forEach(s=>DB.days[todayISO].w.push({part:tpart,ex:target,w:s.w,reps:[s.r]}));
      toast(`${sets.length} sets moved to ${target}`);
    }else{
      sugOv()[target]={sets:[...sets], d:lift.copy.d||todayISO, from:lift.ex};
      toast(`Suggested for ${target} — nothing logged`);
    }
    save();
    lift.copy=false; lift.part=tpart; lift.ex=target; lift.weight=0; lift.suggestOpen=true;
    renderHeader();
    return renderLift();
  }
  // v3.3.141: #repeatAll ("Log all N") was the Suggested zone's bulk action
  //           and went with it.
  if(e.target.closest('[data-editbar]')){ lift.editBar=true; return renderLift(); }
  if(e.target.closest('[data-cancelbar]')){ lift.editBar=false; return renderLift(); }
  const sba=e.target.closest('[data-savebarall]');
  if(sba){
    const ex2=sba.dataset.savebarall;
    const kg=toKg(parseFloat($('#barIn').value));
    if(isNaN(kg)||kg<0) return toast('Enter a number');
    if(equipOf(ex2)==='smith') DB.settings.smithKg=kg; else DB.settings.barKg=kg;
    if(DB.settings.barByEx) delete DB.settings.barByEx[ex2];   // global now applies here too
    lift.editBar=false;
    save(true);toast(`${equipOf(ex2)==='smith'?'Smith':'Barbell'} bar set to ${wDisp(kg)}${U()} everywhere`);
    return renderLift();
  }
  const sb=e.target.closest('[data-savebar]');
  if(sb){
    const ex2=sb.dataset.savebar;
    const kg=toKg(parseFloat($('#barIn').value));
    if(isNaN(kg)||kg<0) return toast('Enter a number');
    DB.settings.barByEx=DB.settings.barByEx||{};
    DB.settings.barByEx[ex2]=kg;
    lift.editBar=false;
    save(true);toast(`Bar set to ${wDisp(kg)}${U()} for ${ex2}`);return renderLift();
  }
  if(e.target.closest('#addrun')){
    const dist=+($('#rk').value||0);
    if(!dist)return toast('Distance needed');
    const km=fromD(dist);
    /* v3.3.143: no snapshot. Logging a run is additive and the run can just
       be deleted; this was the only additive action pushing an Undo button. */
    t.w.push({part:'Run',ex:'Run',w:km,reps:[],mins:+($('#rm').value||0),secs:+($('#rs').value||0),at:Date.now()});
    undoInvalidate();
    reopen('Run','Run');
    save();renderHeader();return renderLift();
  }
  const del=e.target.closest('[data-del]');
  if(del){
    if(lpFired){ lpFired=false; return; }
    const s=t.w[+del.dataset.del];
    snapshot(`deleted ${wTxt(lift.ex,s.w)}×${s.reps[0]||''}`);
    t.w.splice(+del.dataset.del,1);
    /* v3.3.20: removing a set must also walk the day's state BACK.
       A remaining set counts as completed if its EXERCISE is done OR its
       PART is done — runs are sealed at the part level, which the v3.3.19
       exercise-only test missed (Sungjee's red bar stayed up because his
       Run was in donePart, not doneEx). */
    resealDay(t);
    reanchorRest();
    save();renderHeader();return renderLift();
  }
  if(e.target.closest('#googleBtn')) return signInGoogle();
  if(e.target.closest('#signOutBtn')) return signOut();
  if(e.target.closest('#cloudPullBtn')) return cloudPull();
  if(e.target.closest('#cloudTest')){
    DB.settings.cloud={url:$('#cloudUrl').value, anon:$('#cloudAnon').value};
    save(true);
    return cloudTest();
  }
  if(e.target.closest('#cloudSave')){
    DB.settings.cloud={url:$('#cloudUrl').value, anon:$('#cloudAnon').value};
    save(true);
    toast(cloudReady()?'Using '+cloudCfg().url:'Both fields are needed');
    return renderSync();
  }
  if(e.target.closest('#goLift')){
    view='lift'; lift={part:null,ex:null,weight:0};   // the tab's own entry state
    return render();
  }
  if(e.target.closest('#msDismiss')){
    const el=e.target.closest('.msmoment');
    DB.settings.msAck=Math.max(DB.settings.msAck||0, +(el&&el.dataset.ms||0));
    save(true); render(); return;   // permanent; no "remind me later" exists
  }
  if(e.target.closest('#msShare')){
    const el=e.target.closest('.msmoment');
    makeMilestoneImage(+(el&&el.dataset.ms||0));
    return;   // sharing does NOT dismiss — the moment outlives the share tap
  }
  if(e.target.closest('#restBtn')){
    if(checkDate()) return;   // v3.3.158: same guard, second entry point
    const t=day(todayISO);
    if(t.rest) delete t.rest; else t.rest=true;   // toggle; no confirm, no prompt
    t.upd=Date.now();
    save(true); render(); return;
  }
  if(e.target.closest('#bwEditBtn')){ bwEdit=true; renderStats();
    setTimeout(()=>{const i=$('#bwIn'); if(i){i.focus();i.select();}},0); return; }
  if(e.target.closest('#bwCancel')){ bwEdit=false; renderStats(); return; }
  if(e.target.closest('#bwSave')){
    const raw=+($('#bwIn').value||0);
    const kg=raw>0?+toKg(raw).toFixed(1):0;
    const cur=bwNow();
    bwEdit=false;
    if(kg>0 && Math.abs(kg-cur)>0.05){
      setBw(todayISO, kg); save(true); renderStats();
      return toast(`Weight ${wDisp(kg)} ${U()} — recorded today`);
    }
    renderStats();
    return toast(kg>0?'Unchanged — nothing recorded':'No weight entered');
  }
  if(e.target.closest('#barSave')){
    DB.settings.barKg=toKg(+($('#barW').value||0))||20;
    DB.settings.smithKg=toKg(+($('#smithW').value||0));
    save(true);return toast('Bar weights saved');
  }
  /* v3.3.249: edit the onboarding answer. renderSync() so the chips, the
     hidden-parts line, Train's tile grid and Today's suggestion all move
     together — they read one set. */
  if(e.target.closest('[data-myp]')){
    const p=e.target.closest('[data-myp]').dataset.myp;
    if(!toggleMyPart(p)) return toast('Keep at least one body part');
    return renderSync();
  }
  if(e.target.closest('[data-sex]')){
    const v=e.target.closest('[data-sex]').dataset.sex;
    DB.settings.sex = DB.settings.sex===v ? null : v;
    save(true); return renderSync();
  }
  /* v3.3.66 — one Save for "you". The weight field is a WEIGH-IN: a number that
     differs from the current one records a change on today; an unchanged number
     records nothing, which is exactly the "silence means the same" rule. */
  if(e.target.closest('#youSave')){
    const nm=($('#youName').value||'').trim().slice(0,40);
    DB.settings.name = nm || null;
    const raw=+($('#youBw').value||0);
    const kg = raw>0 ? +toKg(raw).toFixed(1) : 0;
    const cur = bwNow();
    let moved=false;
    if(kg>0 && Math.abs(kg-cur)>0.05){ setBw(todayISO, kg); moved=true; }
    else if(kg<=0 && cur>0 && $('#youBw').value.trim()===''){ /* blank left alone */ }
    save(true);
    renderSync();
    return toast(moved?`Weight ${wDisp(kg)} ${U()} — recorded today`:'Saved');
  }
});

/* a tiny picture of the loaded bar: plates, bar, plates */
function barViz(ex,totalKg){
  if(!usesPlates(ex)) return '';
  const bar=barKg(ex), perSide=(totalKg-bar)/2;
  if(perSide<=0.01) return `<span class="barviz"><span class="bar"></span></span>`;
  const p=plates(perSide);
  const big=Math.max(...p,1);
  const pl=p.map(x=>`<span class="pl" style="height:${(8+18*(x/big)).toFixed(0)}px"></span>`).join('');
  return `<span class="barviz">${[...p].reverse().map(x=>`<span class="pl" style="height:${(8+18*(x/big)).toFixed(0)}px"></span>`).join('')}<span class="bar"></span>${pl}</span>`;
}
/* v3.1.10: typing a weight updates the plate diagram INSTANTLY — the +/− and
   chip paths already called refreshLoad(); the manual-entry path never did. */
/* ---- v3.3.286: the notch tick -------------------------------------------
   Two channels, because neither covers every phone:
     · navigator.vibrate — real haptics, but Android/Chrome only. iOS Safari
       has never implemented it, and a PWA on iOS gets nothing, so on the
       maker's own phone this line is a no-op. Said plainly rather than
       shipped as a promise.
     · a 9ms square blip through WebAudio — this DOES work on iOS, and is
       what actually carries the feedback there. Quiet (gain .035), far below
       whatever music is playing, and only ever fired by a finger.
   The AudioContext is created lazily inside a real gesture, because iOS
   refuses to start one otherwise, and is reused after that. */
let _tickCtx=null, _tickOn=true;
function repTickInit(){
  if(_tickCtx) return;
  try{ const C=window.AudioContext||window.webkitAudioContext; if(C) _tickCtx=new C(); }catch(_e){}
  if(_tickCtx&&_tickCtx.state==='suspended') _tickCtx.resume().catch(()=>{});
}
/* v3.3.291: REAL haptics on iPhone, via the one door iOS leaves open.
   Safari has never implemented navigator.vibrate, so every previous attempt
   here was a no-op on the maker's own phone. But since iOS 17.4 the native
   <input type="checkbox" switch> control plays a Taptic tap when it toggles,
   and toggling it from script counts. So: a hidden switch, clicked once per
   notch, is a genuine haptic — not a sound standing in for one.
   Feature-detected on the property, not the browser, so it costs nothing
   where it does not exist. */
let _hapEl=null, _hapAt=0;
const HAP_SWITCH = (()=>{ try{ return 'switch' in HTMLInputElement.prototype; }catch(_e){ return false; } })();
function repHapticEl(){
  if(_hapEl||!HAP_SWITCH) return _hapEl;
  try{
    const l=document.createElement('label');
    l.className='haptswitch'; l.setAttribute('aria-hidden','true');
    const i=document.createElement('input');
    i.type='checkbox'; i.setAttribute('switch',''); i.tabIndex=-1;
    l.appendChild(i); document.body.appendChild(l); _hapEl=i;
  }catch(_e){}
  return _hapEl;
}
function repTick(){
  if(!_tickOn) return;
  /* a flick can cross notches faster than a taptic engine can answer;
     without this the queue backs up and the feel smears */
  const now=Date.now();
  if(now-_hapAt < 28) return;
  _hapAt=now;
  let felt=false;
  try{ if(navigator.vibrate){ navigator.vibrate(8); felt=true; } }catch(_e){}   // Android
  if(!felt){
    const el=repHapticEl();                                                     // iOS 17.4+
    if(el){ try{ el.click(); felt=true; }catch(_e){} }
  }
  if(felt) return;            // a real tap beats a sound standing in for one
  if(!_tickCtx||_tickCtx.state!=='running') return;
  try{
    const t=_tickCtx.currentTime, o=_tickCtx.createOscillator(), g=_tickCtx.createGain();
    o.type='square'; o.frequency.setValueAtTime(2100,t);
    g.gain.setValueAtTime(0.035,t);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.009);
    o.connect(g); g.connect(_tickCtx.destination);
    o.start(t); o.stop(t+0.012);
  }catch(_e){}
}
document.addEventListener('pointerdown',repTickInit,{passive:true});
document.addEventListener('touchstart',repTickInit,{passive:true});
/* v3.3.289: the scroll handler does the CHEAP thing per notch and the
   expensive thing once you stop.

   The first version called repRulerMark() on every scroll event, and that
   rewrote the Add-set button's innerHTML and ran a percentile ranking over
   the whole volume distribution — per notch, during a flick. Forty notches a
   second of layout thrash is what "not smooth enough" felt like.

   Now: scroll events are coalesced into one rAF; crossing a notch only swaps
   a class and fires the tick; the button label is rebuilt 110ms after the
   scrolling settles. */
/* v3.3.318: the tick is VELOCITY-GATED, and that is what unsticks the spin.
   On iOS the haptic is a real DOM click on a hidden switch (v3.3.291) — the
   only way a web app can reach the taptic engine. Firing one per notch is
   right when you are easing to a number, but during a flick the ruler can
   cross two or three notches per frame, and asking the taptic engine for
   thirty-odd taps a second both jams it and drags on the scroll. That drag
   is the "뻑뻑한" feeling: a fling that should coast is being braked by its
   own feedback.
   So: while the ruler is moving faster than ~1.6 notches per frame, the
   band and the label still track every notch — those are free — but the tap
   is skipped. Slow down and every notch taps again, which is exactly when
   you can feel them individually anyway. */
let _rrLast=null, _rrRaf=0, _rrPrevX=null, _rrPrevT=0;
const RR_FLING=REP_W*1.6;         // px per frame above which taps are skipped
function _rrOnScroll(el){
  const x=el.scrollLeft, t=Date.now();
  /* a gap since the last frame means a NEW gesture, not a fast one — without
     this the first frame of every flick compares against wherever the last
     one ended and silently swallows a tap */
  const fresh=t-_rrPrevT>120;
  const fast=!fresh && _rrPrevX!==null && Math.abs(x-_rrPrevX)>RR_FLING;
  _rrPrevX=x; _rrPrevT=t;
  const v=Math.max(1,Math.round(x/REP_W)+1);
  if(v!==_rrLast){
    _rrLast=v; lift.rep=v;
    if(!fast) repTick();
    repRulerBand(v);          // v3.3.290: class swap + one text node, nothing else
  }
}
document.addEventListener('scroll',e=>{
  const el=e.target;
  if(!el||!el.classList||!el.classList.contains('repruler')) return;
  if(_rrRaf) return;
  _rrRaf=requestAnimationFrame(()=>{ _rrRaf=0; _rrOnScroll(el); });
},{capture:true,passive:true});

document.addEventListener('input',e=>{
  if(e.target&&e.target.id==='wv') refreshLoad();
});
function refreshLoad(){
  const ll=$('#ll');
  if(ll&&lift.ex){
    const kg=toKg(+($('#wv').value||0));
    /* v3.3.283: the container's layout depends on the state its contents are
       in, so the modifier must be re-applied here too — refreshing on a
       weight tap while editing would otherwise put the form back into the
       one-row flex it just escaped. */
    ll.classList.toggle('editing', !!lift.editBar);
    ll.innerHTML = usesPlates(lift.ex)
      ? loadInner(lift.ex,kg)
      : `<span class="ll-text">${loadLine(lift.ex,kg)}</span>`;
  }
  refreshReps();   // v3.3.56: the rep tiles follow the weight, same funnel
  refreshSug();    // v3.3.144: the strip follows the weight again (v3.3.137 rule)
}

/* ---------- pinch / wheel zoom for charts ---------- */
/* v3.3.108: the scrubber — press the chart and a thin guide follows your
   finger, reading every curve at that day. The interaction finance apps use
   (Robinhood, Apple Stocks); without it these curves are only legible at
   their endpoints.

   It costs no new gesture. bindZoom already owns pointers here, and a
   single finger currently does NOTHING at default zoom — panning is gated
   on being zoomed in. So: 1 finger + not zoomed = scrub, 1 finger + zoomed
   = pan (unchanged), 2 fingers = pinch (unchanged), double-tap = reset
   (unchanged). `[data-zoom]` is already first in the tab-swipe blocklist,
   so a horizontal drag can't change tabs, and `.zoom` is already
   touch-action:none, so it can't scroll the page either.

   It is driven entirely by data-attributes on the <svg>, so it works for
   any line chart that declares its geometry — no per-chart wiring, one
   implementation for the consistency and distance charts both.

   Readout reuses what's on screen: the legend's values swap to the
   scrubbed day and the zoom hint becomes the date. Nothing new appears
   except the guide and its dots. */
function bindScrub(box, svg, getVb){
  if(!svg.hasAttribute('data-scrub')) return null;
  const A=n=>+svg.getAttribute(n);
  const sx0=A('data-sx0'), sxw=A('data-sxw'), sy0=A('data-sy0'), syh=A('data-syh'), smax=A('data-smax');
  const mode=svg.getAttribute('data-scrub'),pct=mode==='pct',race=mode==='race',raceUnit=svg.getAttribute('data-race-unit')||'';
  const lines=[...svg.querySelectorAll('polyline[data-yr]')].map(pl=>({
    yr:pl.getAttribute('data-yr'), color:pl.getAttribute('stroke'),
    values:(pl.getAttribute('data-values')||'').split(',').filter(v=>v!=='').map(Number),
    pts:(pl.getAttribute('points')||'').trim().split(/\s+/).filter(Boolean)
        .map(p=>p.split(',').map(Number)).filter(p=>p.length===2&&!isNaN(p[0]))
  })).filter(L=>L.pts.length>1);
  if(!lines.length) return null;

  const NS='http://www.w3.org/2000/svg';
  const g=document.createElementNS(NS,'g');
  g.setAttribute('class','scrubg'); g.style.display='none'; g.style.pointerEvents='none';
  const vline=document.createElementNS(NS,'line');
  vline.setAttribute('y1',String(sy0-syh)); vline.setAttribute('y2',String(sy0));
  vline.setAttribute('stroke','var(--chalk)'); vline.setAttribute('stroke-width','0.7'); vline.setAttribute('opacity','.45');
  g.appendChild(vline);
  const dots=lines.map(L=>{
    const c=document.createElementNS(NS,'circle');
    c.setAttribute('r','2.4'); c.setAttribute('fill',L.color);
    c.setAttribute('stroke','var(--surface)'); c.setAttribute('stroke-width','0.8');
    g.appendChild(c); return c;
  });
  svg.appendChild(g);

  const legend=box.parentElement?box.parentElement.querySelector('.legend1'):null;
  // v3.3.129: the hint is a sibling of .zoom now, not a child
  const hint=box.parentElement?box.parentElement.querySelector('.zoomhint'):null;
  const hint0=hint?hint.textContent:'';
  const val0=new Map();
  if(legend) legend.querySelectorAll('[data-yr]').forEach(s=>{
    const b=s.querySelector('b'); if(b) val0.set(s.getAttribute('data-yr'), b.textContent);
  });
  /* v3.3.214: the redesigned Consistency card has no legend; its scoreboard
     is the readout. Preserve it exactly so release behaves like the old
     scrubber: explore while the finger is down, return to today on lift. */
  const raceCard=race?box.closest('.conrace'):null;
  const raceDate=raceCard?raceCard.querySelector('[data-con-date]'):null;
  const raceGap=raceCard?raceCard.querySelector('[data-con-gap]'):null;
  const race0=raceCard?{
    date:raceDate?raceDate.textContent:'',gap:raceGap?raceGap.innerHTML:'',gapClass:raceGap?raceGap.className:'',
    values:new Map([...raceCard.querySelectorAll('[data-con-count]')].map(b=>[b.getAttribute('data-con-count'),b.textContent]))
  }:null;

  const yAt=(pts,x)=>{
    if(x<pts[0][0]-0.01||x>pts[pts.length-1][0]+0.01) return null;   // year hasn't reached this day
    for(let i=1;i<pts.length;i++){
      if(pts[i][0]>=x){
        const [x0,y0]=pts[i-1], [x1,y1]=pts[i];
        return x1===x0 ? y1 : y0+(y1-y0)*((x-x0)/(x1-x0));
      }
    }
    return pts[pts.length-1][1];
  };
  const show=clientX=>{
    const r=box.getBoundingClientRect(), vb=getVb();
    const ux=vb[0]+((clientX-r.left)/r.width)*vb[2];
    let x=Math.max(sx0,Math.min(sx0+sxw,ux)),dayIndex=null;
    if(race){
      const n=Math.max(2,...lines.map(L=>L.values.length||L.pts.length));
      dayIndex=Math.max(0,Math.min(n-1,Math.round((x-sx0)/sxw*(n-1))));
      x=sx0+dayIndex/Math.max(1,n-1)*sxw;       // an exact day, never a fractional count
    }
    vline.setAttribute('x1',x.toFixed(1)); vline.setAttribute('x2',x.toFixed(1));
    const raceValues=new Map();
    lines.forEach((L,i)=>{
      const exact=race&&L.values.length ? L.values[Math.min(dayIndex,L.values.length-1)] : null;
      const y=exact==null?yAt(L.pts,x):sy0-exact/smax*syh;
      if(y==null){ dots[i].style.display='none'; }
      else { dots[i].style.display=''; dots[i].setAttribute('cx',x.toFixed(1)); dots[i].setAttribute('cy',y.toFixed(1)); }
      if(legend){
        const b=legend.querySelector(`[data-yr="${L.yr}"] b`);
        if(b) b.textContent = y==null ? '\u2013'
          : (pct ? Math.round(smax*(sy0-y)/syh*100)+'%' : String(Math.round(smax*(sy0-y)/syh)));
      }
      if(raceCard&&y!=null){
        const value=exact==null?Math.round(smax*(sy0-y)/syh):exact;
        raceValues.set(L.yr,value);
        const b=raceCard.querySelector(`[data-con-count="${L.yr}"]`); if(b) b.textContent=raceNum(raceCard,value);
      }
    });
    if(raceCard&&dayIndex!=null){
      const current=raceCard.getAttribute('data-current-year'),previous=raceCard.getAttribute('data-previous-year');
      const gap=(raceValues.get(current)||0)-(raceValues.get(previous)||0);
      const d=new Date(+(svg.getAttribute('data-scrub-year')||current),0,dayIndex+1);
      if(raceDate) raceDate.textContent='YOU VS YOU · '+d.toLocaleDateString('en-US',{month:'short',day:'numeric'}).toUpperCase();
      if(raceGap){
        /* v3.3.233: one formatter with the toggle, so a drag cannot silently
           switch the card back to raw counts while shares are showing. */
        raceGap.classList.toggle('up',gap>=0);
        raceGap.innerHTML=raceGapHTML(raceCard,raceValues.get(current)||0,raceValues.get(previous)||0);
      }
      raceCard.classList.add('scrubbing');
    }
    if(hint){
      const doyN=Math.max(1,Math.min(366,Math.round((x-sx0)/sxw*366)));
      hint.textContent=new Date(2025,0,Math.min(365,doyN))
        .toLocaleDateString('en-US',{month:'short',day:'numeric'});
    }
    g.style.display='';
  };
  const hide=()=>{
    g.style.display='none';
    if(hint) hint.textContent=hint0;
    if(legend) val0.forEach((t,yr)=>{
      const b=legend.querySelector(`[data-yr="${yr}"] b`); if(b) b.textContent=t;
    });
    if(raceCard&&race0){
      raceCard.classList.remove('scrubbing');
      if(raceDate) raceDate.textContent=race0.date;
      if(raceGap){raceGap.innerHTML=race0.gap;raceGap.className=race0.gapClass;}
      race0.values.forEach((t,yr)=>{const b=raceCard.querySelector(`[data-con-count="${yr}"]`);if(b)b.textContent=t;});
    }
  };
  return {show,hide};
}

/* v3.3.116: the part-mix chart opens at TODAY (its right edge) and loads
   older weeks when you reach the left. Scroll position is restored by the
   exact width added, so the view does not jump under the finger — the
   whole point of loading backwards. */
/* v3.3.333: the attendance calendar opens on TODAY. The grid is 35 weeks
   wide and a phone holds maybe twenty, so it always overflowed -- and it
   opened at scrollLeft 0, which is eight months ago. The focused date is
   today; the streak, the "days in" count and the month you are actually
   training all live at the right edge, and the maker had to drag the thing
   every time to see the days he had just logged.
   Same shape as bindPmix below: a dataset flag so a re-render during a
   session does not yank a scroll the user has set by hand. Guarded on
   scrollWidth because a narrow enough window may not overflow at all. */
function bindHeat(){
  const box=document.querySelector('.heatwrap');
  if(!box||box.dataset.bound) return;
  box.dataset.bound='1';
  if(box.scrollWidth>box.clientWidth) box.scrollLeft=box.scrollWidth;   // today, not eight months ago
}
function bindPmix(){
  const box=document.getElementById('pmixWrap');
  if(!box||box.dataset.bound) return;
  box.dataset.bound='1';
  box.scrollLeft=box.scrollWidth;              // today, not January
  const now=document.getElementById('pmixNow');
  /* v3.3.120: the way back. Appears only once you have actually travelled,
     and rides the wrapper's scroll-behavior:smooth rather than animating
     by hand. */
  const syncNow=()=>{ if(!now) return;
    const far=box.scrollWidth-box.clientWidth-box.scrollLeft;
    now.classList.toggle('on', far>40); };
  if(now) now.addEventListener('click',()=>{ box.scrollLeft=box.scrollWidth; syncNow(); });
  box.addEventListener('scroll',syncNow,{passive:true});
  /* v3.3.117: the first version read box.scrollWidth to work out how much
     had been prepended. After innerHTML that value has not reflowed yet, so
     the delta came back 0, scrollLeft stayed at 0, the next scroll event
     saw scrollLeft<60 and loaded again — and the chart ran all the way to
     the first day in one flick. The width added is knowable from the DATA
     (columns x column width), so it is computed, not measured, and a real
     lock stops re-entry until the next frame. */
  /* v3.3.122: the whole archive is rendered up front, so there is no
     prepending and nothing to correct — which is what removes the lurch.
     What lives here now is the scrubber: press or drag across the plot and
     the line above reads that day out. */
  /* v3.3.125: no scrubber. One interaction: tap a column, follow that body
     part; tap again to release. Tapping a stacked segment picks that
     segment; tapping anywhere else in a single-part column picks its part,
     so you never have to hit a thin bar exactly. A drag still scrolls and
     must never select, so movement past 6px cancels the tap. */
  let downX=0, downY=0, moved=false, downAct=null;
  /* v3.3.126: what a tap MEANS depends on whether you are already following
     something. Landing on a segment always picks that part. Landing on empty
     space picks the column's part only when nothing is being followed — once
     you ARE following one, empty space means release, not "switch me to
     whatever bar happens to be under here". */
  const actionAt=(target,clientX)=>{
    const direct=target && target.getAttribute ? target.getAttribute('data-pt') : null;
    if(direct) return {focus:direct};
    if(PMIX_FOCUS) return {clear:true};
    const r=box.getBoundingClientRect();
    const i=Math.floor((clientX-r.left+box.scrollLeft-8)/PMIX_COLW);
    const rows=partMix(PMIX_DAYS);
    if(i<0||!rows[i]) return null;
    const names=Object.keys(rows[i].by);
    return names.length===1 ? {focus:names[0]} : null;   // ambiguous stacks need the segment
  };
  box.addEventListener('pointerdown',e=>{
    downX=e.clientX; downY=e.clientY; moved=false;
    downAct=actionAt(e.target,e.clientX);
  },{passive:true});
  box.addEventListener('pointermove',e=>{
    if(Math.abs(e.clientX-downX)>6||Math.abs(e.clientY-downY)>6) moved=true;
  },{passive:true});
  box.addEventListener('pointerup',()=>{
    if(!moved && downAct){
      if(downAct.clear) pmixSetFocus(PMIX_FOCUS);   // toggling the current one releases it
      else pmixSetFocus(downAct.focus);
    }
    downAct=null;
  },{passive:true});
  box.addEventListener('pointercancel',()=>{ downAct=null; },{passive:true});

  // the year label follows the left edge of what you are looking at
  const yr=document.getElementById('pmixYr');
  const syncYr=()=>{ if(!yr||!PMIX_YEARS.length) return;
    const i=Math.max(0,Math.min(PMIX_YEARS.length-1,
      Math.round((box.scrollLeft-8)/PMIX_COLW)));
    const y=PMIX_YEARS[i];
    if(yr.textContent!==y) yr.textContent=y;
  };
  box.addEventListener('scroll',syncYr,{passive:true});
  syncYr();
}
function bindZoom(box){
  if(box.dataset.bound) return;
  box.dataset.bound='1';
  const svg=box.querySelector('svg');
  const vb0=svg.getAttribute('viewBox').split(/\s+/).map(Number);   // [x,y,w,h]
  let vb=[...vb0];
  const apply=()=>{
    svg.setAttribute('viewBox',vb.join(' '));                       // vector-crisp at any zoom
    const hint=box.parentElement?box.parentElement.querySelector('.zoomhint'):null;   // v3.3.129: sibling, not child
    if(hint) hint.style.opacity = (vb[2] < vb0[2]-0.5) ? 0 : .75;
  };
  const clamp=()=>{
    vb[2]=Math.min(vb0[2],Math.max(vb0[2]/12,vb[2]));
    vb[3]=vb[2]*vb0[3]/vb0[2];
    vb[0]=Math.min(vb0[0]+vb0[2]-vb[2],Math.max(vb0[0],vb[0]));
    vb[1]=Math.min(vb0[1]+vb0[3]-vb[3],Math.max(vb0[1],vb[1]));
  };
  const pt=(px,py)=>{                                               // screen px -> svg units
    const r=box.getBoundingClientRect();
    return [vb[0]+(px/r.width)*vb[2], vb[1]+(py/r.height)*vb[3]];
  };
  const zoomAt=(px,py,f)=>{
    const [ux,uy]=pt(px,py);
    const w=vb[2]/f, hgt=vb[3]/f;
    vb=[ux-(ux-vb[0])/f, uy-(uy-vb[1])/f, w, hgt];
    clamp(); apply();
  };
  const rel=e=>{const r=box.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};

  box.addEventListener('wheel',e=>{e.preventDefault();const [x,y]=rel(e);zoomAt(x,y,e.deltaY<0?1.15:1/1.15);},{passive:false});

  const scrub=bindScrub(box,svg,()=>vb);
  const zoomed=()=>vb[2]<vb0[2]-0.5;

  const pts=new Map(); let d0=0,w0=0,mid=[0,0],last=null,tap=0;
  box.addEventListener('pointerdown',e=>{
    box.setPointerCapture(e.pointerId); pts.set(e.pointerId,rel(e));
    if(pts.size===2){const [a,b]=[...pts.values()];
      d0=Math.hypot(a[0]-b[0],a[1]-b[1]); w0=vb[2]; mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
      if(scrub) scrub.hide();}                     // a second finger means zoom, not read
    else{ last=rel(e);
      const now=Date.now();
      if(now-tap<300){ vb=[...vb0]; apply(); }
      tap=now;
      if(scrub&&!zoomed()) scrub.show(e.clientX); }
  });
  box.addEventListener('pointermove',e=>{
    if(!pts.has(e.pointerId)) return;
    pts.set(e.pointerId,rel(e));
    if(pts.size===2){
      const [a,b]=[...pts.values()];
      const d=Math.hypot(a[0]-b[0],a[1]-b[1]);
      if(d0){ const target=w0*(d0/d), f=vb[2]/target; zoomAt(mid[0],mid[1],f); }
      e.preventDefault();
    }else if(pts.size===1 && vb[2]<vb0[2]-0.5 && last){
      const p=rel(e), r=box.getBoundingClientRect();
      vb[0]-=(p[0]-last[0])/r.width*vb[2];
      vb[1]-=(p[1]-last[1])/r.height*vb[3];
      last=p; clamp(); apply(); e.preventDefault();
    }else if(pts.size===1 && scrub){
      scrub.show(e.clientX); e.preventDefault();   // reading, not panning
    }
  });
  const up=e=>{pts.delete(e.pointerId); if(pts.size<2)d0=0; if(!pts.size)last=null;
    if(!pts.size&&scrub) scrub.hide();};
  box.addEventListener('pointerup',up);
  box.addEventListener('pointercancel',up);
}

/* ---------- boot ---------- */
const MOTION_OK=typeof matchMedia==='function' ? matchMedia('(prefers-reduced-motion:no-preference)').matches : true;
function paint(){
  ({today:renderToday,lift:renderLift,stats:renderStats,history:renderHistory,sync:renderSync})[view]();
  document.querySelectorAll('[data-zoom]').forEach(bindZoom);
  bindPmix();
  bindHeat();
  if(MOTION_OK){ try{ motionPass(); }catch(_e){ /* motion is decoration — it never gets to break the app */ } }
  window.scrollTo(0,0);
}
let lastView=null;
/* v3.3.366: the nav is DERIVED from view, here, once. It used to be set by
   hand at every navigation site -- seven of them across app.js and core.js,
   each a copy of the same toggle -- and any path that changed `view` without
   remembering to add an eighth left the old tab lit. That is what the maker
   hit: tapping a plan row on Today opens the exercise, which lives in Train,
   and the bar still said TODAY. The screen and the bar disagreed because two
   different pieces of code owned them.
   A tab that must be kept in sync by hand at every call site is a tab that
   will be wrong eventually; the only question was which route found it first.
   render() runs on every view change by definition, so putting it here makes
   the bar a READING of the app's state rather than a second copy of it. */
/* v3.3.369: THE DAY IS PLACED. Completing the workout used to get a toast --
   the biggest moment in the app, delivered in the furniture of a sync error.
   This is the maker's pick A: a quiet surface, today's square drawing itself
   in, one ring (the breathing halo's gesture, spent once instead of looping),
   and the day count landing beneath it in the hero stat's own words.
   ONE OWNER. The four doneAll flip sites used to each build their own toast
   line; they funnel through doneToast now, so the celebration cannot drift
   between routes -- the nav-bar lesson of v3.3.366, applied before the bug
   this time instead of after.
   ONCE A DAY, EVER: a date stamp in settings, so reopening a part and
   completing again is not a second ceremony. The stamp survives sync.
   NO PLAN WORDS. doneAll is the maker's own declaration, not a plan score --
   the overlay never says "plan", never counts N of M, and its number is the
   same "days in" the attendance hero shows, computed the way report.js
   already computes it: derived days plus today if today has work.
   Tap anywhere to leave early; it leaves by itself in ~2.3s; with
   prefers-reduced-motion it is a still frame. */
function celebrateDayDone(){
  if(DB.settings.dayDone===todayISO) return;
  DB.settings.dayDone=todayISO; save();
  const n=SEED.totals.sessions+((((DB.days[todayISO]||{}).w)||[]).length?1:0);
  const o=document.createElement('div');
  o.id='dayDone';
  o.innerHTML=`<i class="ddsq" aria-hidden="true"></i>`+
    `<b class="ddn">${fmt(n)}</b><span class="ddu">days in</span>`+
    `<span class="ddt">show up \u2014 that's the whole game</span>`;
  document.body.appendChild(o);
  const bye=()=>{ o.classList.add('out'); setTimeout(()=>o.remove(),320); };
  o.addEventListener('click',bye,{once:true});
  setTimeout(()=>{ if(o.isConnected) bye(); },2300);
}
const doneToast=(m,alt)=>{
  if(m.doneAll){ celebrateDayDone(); toast(`Workout complete \u2014 ${m.w.length} sets. Cool down \ud83d\udd25`); }
  else toast(alt);
};
function syncNav(){
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===view));
}
function render(){
  syncNav();
  if(typeof killCalReturn==='function') killCalReturn();   // v3.3.59: the contextual target dies with any view change
  if(typeof syncTopBtn==='function') syncTopBtn();        // v3.3.65: the general up button re-evaluates for the new view
  if(view!=='history'&&typeof hist!=='undefined'){ hist.edit=null; hist.editSet=null; }   // v3.3.61: leaving History closes edit mode
  renderHeader();
  // tab switches cross-fade via the View Transitions API; in-view re-renders
  // (logging a set, toggling a setting) must NOT flash, so they paint directly
  if(MOTION_OK && document.startViewTransition && lastView!==null && lastView!==view){
    lastView=view; document.startViewTransition(paint);
  } else { lastView=view; paint(); }
}
let floatIO=null;
function motionPass(){
  const v=document.getElementById('view');
  // 5. stagger the big blocks, capped so deep pages don't feel slow
  [...v.children].forEach((el,i)=>el.style.setProperty('--i',Math.min(i,9)));
  // 5b. anything below the fold floats up on scroll instead
  if('IntersectionObserver' in window){
    if(floatIO) floatIO.disconnect();
    floatIO=new IntersectionObserver(es=>{
      for(const en of es) if(en.isIntersecting){
        en.target.classList.add('float-in');
        en.target.classList.remove('float-pre');
        floatIO.unobserve(en.target);
      }
    },{rootMargin:'0px 0px -6% 0px'});
    v.querySelectorAll('.card,.zone,.kpis,table,.item').forEach(el=>{
      if(el.closest('.float-pre')&&el.classList.contains('item')) return;   // don't double-float nested items
      if(el.getBoundingClientRect().top>innerHeight){
        el.classList.add('float-pre');
        floatIO.observe(el);
      }
    });
  }
  // 6a. every chart line sweeps in once
  v.querySelectorAll('svg polyline').forEach((pl,i)=>{
    const len=Math.ceil(pl.getTotalLength());
    pl.style.setProperty('--len',len); pl.style.setProperty('--i',i%6);
    pl.classList.add('draw');
  });
  // 6b. bars grow from their baseline (single-series bars are tagged gbar)
  v.querySelectorAll('svg rect.gbar').forEach((r,i)=>r.style.setProperty('--i',i%20));
  // 4. KPI numbers count up — only plain numbers; paces and dates stay put
  if(typeof requestAnimationFrame!=='function') return;
  v.querySelectorAll('.kpi .v').forEach(el=>{
    const raw=el.textContent.trim(), m=raw.match(/^([\d,]+)$/);
    if(!m) return;
    const target=+m[1].replace(/,/g,''); if(!target) return;
    const t0=performance.now(), dur=450;
    const step=now=>{
      const p=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-p,3);
      el.textContent=fmt(Math.round(target*e));
      if(p<1) requestAnimationFrame(step); else el.textContent=raw;
    };
    requestAnimationFrame(step);
  });
}
(async()=>{
  try{ if(screen.orientation&&screen.orientation.lock) screen.orientation.lock('portrait').catch(()=>{}); }catch(e){}
  await load();
  restoreWhere();
  dailyBackup();                     // snapshot PRE-migration state first
  const mig=migrateV3();
  SEED=deriveAll(); _fireDist=null;                  // miles fix needs runDays() → derive first
  const mi=migrateMiles();
  const un=migrateUnits();
  const bwm=migrateBw();
  if(mig||mi||un||bwm){ save(true); }
  if(mi||un) SEED=deriveAll(); _fireDist=null;           // re-derive on converted history
  if(mi||un) setTimeout(()=>toast(`Units corrected — true totals: ${fmt(Math.round(SEED.totals.km))} km · ${fmt(SEED.totals.vol)} kg lifted`),900);
  stampLegacyDays();
  const fixed=repairDupes();
  if(fixed){ save(); toast(`Repaired ${fixed} duplicated set${fixed>1?'s':''}`); }
  /* v3.3.224: the bodyweight repair edits the ledger, so it says so — the
     same courtesy repairDupes has paid since v2.19. Silence would be the
     wrong default for a migration that changes recorded numbers. */
  if(_bwFix&&_bwFix.sets) toast(`${_bwFix.sets} bodyweight set${_bwFix.sets>1?'s':''} restored to bodyweight`);
  checkMilestone();
  demoBarSync(); maybeOnboard();
  lastSetAt=(DB.days[todayISO]&&DB.days[todayISO].lastAt)||null;
  await loadSession();
  render();
  if(cloudReady()){
    await captureOAuth();                       // fresh sign-in pulls (initial sync) inside
    if(session) cloudPull();                    // every device syncs on open (per-day newest-wins)
  }
})();
