/* ShowUp — app.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- events ---------- */
document.addEventListener('click',e=>{
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
      const rc=$('#rc');
      if(rc){ rc.value=ng.dataset.nr; rc.focus(); }
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
    save();renderHeader();
    toast(m.doneAll?`Workout complete — ${m.w.length} sets. Cool down 🔥`:`${lift.ex} complete ✓`);
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
    save();renderHeader();
    toast(m.doneAll?`Workout complete — ${m.w.length} sets. Cool down 🔥`:`${lift.part} complete ✓`);return render();
  }
  if(e.target.closest('#doneAllBtn')){
    const m=dayMeta(); m.upd=Date.now();
    m.w.forEach(s=>{ if(!m.doneEx.includes(s.ex)) m.doneEx.push(s.ex);
                     if(!m.donePart.includes(s.part)) m.donePart.push(s.part); });
    m.doneAll=true;
    save();renderHeader();
    toast(`Workout complete — ${m.w.length} sets. Cool down 🔥`);
    return render();
  }
  const sx=e.target.closest('[data-sugx]');
  if(sx&&lift.ex){
    const m=dayMeta();
    m.sugX[lift.ex]=[...(m.sugX[lift.ex]||[]),sx.dataset.sugx];
    save();return renderLift();
  }
  if(e.target.closest('#settingsBtn')||e.target.closest('#gearBtn')){
    if(view==='sync'){ view=prevView||'today'; }
    else { prevView=view; view='sync'; }
    document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===view));
    return render();
  }
  const nav=e.target.closest('nav button');
  if(nav){
    if(session) cloudPush();
    view=nav.dataset.v;
    if(view==='lift')lift={part:null,ex:null,weight:0};
    document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b===nav));
    return render();
  }
  const ld=e.target.closest('.linkdate[data-histd]');
  if(ld){
    const iso=ld.dataset.histd;
    hist.y=+iso.slice(0,4); hist.m=+iso.slice(5,7);
    window._histTarget=iso;
    view='history';
    document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v==='history'));
    return render();
  }
  const go=e.target.closest('[data-go]');
  if(go){
    // v3.3.31: Continue means continue — an OPEN part jumps straight into its
    // last-logged exercise (you're between sets of it; back is one tap if not).
    // Start / add-on / Run keep landing on the part: nothing logged yet, or the
    // Run view owns itself. Fresh lift object, so no stale editor state rides in.
    const goP=go.dataset.go;
    const goEx=(goP!=='Run'&&partOpen(goP))
      ? (([...day(todayISO).w].reverse().find(s=>s.part===goP&&s.ex)||{}).ex||null)
      : null;
    view='lift';lift={part:goP,ex:goEx,weight:0};
    document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v==='lift'));
    return render();
  }
  const pt=e.target.closest('[data-part]:not([data-ex])');
  if(pt){lift.part=pt.dataset.part;lift.ex=null;lift.weight=0;lift.enterAnim=true;return render();}   // v3.3.57: the arriving list gets its one entrance
  const ex=e.target.closest('[data-ex]');
  if(ex){
    lift.part=ex.dataset.part||lift.part; lift.ex=ex.dataset.ex;
    lift.weight=0; lift.editBar=false; lift.copy=false; lift.suggestOpen=null; lift.info=false; lift.editSet=null;
    view='lift';                                   // <- was missing: Today stayed on Today
    document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v==='lift'));
    return render();
  }
  if(e.target.closest('.back')){
    if(lift.copy){ lift.copy=false; return renderLift(); }
    if(view==='sync'){view=prevView||'today';document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===view));return render();}
    if(lift.ex)lift.ex=null;else lift.part=null;
    return render();
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
    const shown=Math.max(anchor,anchor+(dir>0?Math.floor(k+1e-9)+1:Math.ceil(k-1e-9)-1)*s);
    lift.weight=toKg(shown);
    saveExW(lift.ex,lift.weight);save(true);
    const wvEl=$('#wv');
    wvEl.value=Math.round(shown*10)/10;
    wvEl.classList.remove('wflash'); void wvEl.offsetWidth; wvEl.classList.add('wflash');
    refreshLoad();return;
  }
  const rb=e.target.closest('[data-rep]');
  if(rb){
    lift.weight=toKg(+($('#wv').value||0));
    saveExW(lift.ex,lift.weight);
    t.w.push({part:lift.part,ex:lift.ex,w:lift.weight,reps:[+rb.dataset.rep],at:Date.now()});
    reopen(lift.ex,lift.part);
    lift.justSaved=true;save();renderHeader();setToast(lift.ex,lift.weight,+rb.dataset.rep);return renderLift();
  }
  if(e.target.closest('#addrep')){
    const r=Math.round(+($('#rc').value||0));
    if(!r||r<1) return toast('Enter a rep count');
    lift.weight=toKg(+($('#wv').value||0));
    saveExW(lift.ex,lift.weight);
    t.w.push({part:lift.part,ex:lift.ex,w:lift.weight,reps:[r],at:Date.now()});
    reopen(lift.ex,lift.part);
    lift.justSaved=true;save();renderHeader();setToast(lift.ex,lift.weight,r);return renderLift();
  }
  const rs=e.target.closest('[data-rep-w]');
  if(rs){
    const w=+rs.dataset.repW, r=+rs.dataset.repR;
    t.w.push({part:lift.part,ex:lift.ex,w,reps:[r],at:Date.now()});
    reopen(lift.ex,lift.part);
    lift.weight=w;
    saveExW(lift.ex,w);
    lift.justSaved=true;save();renderHeader();setToast(lift.ex,w,r);return renderLift();
  }
  if(e.target.closest('#allSets')){ lift.allSets=!lift.allSets; return renderLift(); }
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
  if(e.target.closest('#infoBtn')){ lift.info=!lift.info; return renderLift(); }
  if(e.target.closest('#toggleSuggest')){
    const cur = lift.suggestOpen==null ? day(todayISO).w.some(s=>s.ex===lift.ex)===false : lift.suggestOpen;
    lift.suggestOpen=!cur; return renderLift();
  }
  if(e.target.closest('#copySets')){
    const ls2=suggestedFor(lift.ex);
    lift.copy={mode:'suggestion', sets:ls2?[...ls2.sets]:[], d:ls2?.d||null};
    return renderLift();
  }
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
  if(e.target.closest('#repeatAll')){
    const ls=suggestedFor(lift.ex);
    const dis=new Set(dayMeta().sugX[lift.ex]||[]);
    const mine=t.w.filter(s=>s.ex===lift.ex);
    const lastToday=mine.length?mine[mine.length-1]:null;
    let pool=[];
    if(lastToday&&lastToday.reps&&lastToday.reps.length)
      pool.push({w:lastToday.w,r:lastToday.reps[0],key:`now|${lastToday.w}|${lastToday.reps[0]}`});
    (ls?ls.sets:[]).forEach((s,i)=>pool.push({w:s.w,r:s.r,key:`${s.w}|${s.r}|${i}`}));
    const seenWR=new Set();
    pool=pool.filter(c=>{const k=`${c.w}x${c.r}`;if(seenWR.has(k))return false;seenWR.add(k);return true;});
    const chips=pool.filter(c=>!dis.has(c.key)).slice(0,6);
    if(!chips.length) return;
    snapshot(`logged ${chips.length} sets`);
    chips.forEach(s=>t.w.push({part:lift.part,ex:lift.ex,w:s.w,reps:[s.r],at:Date.now()}));
    reopen(lift.ex,lift.part);
    save();renderHeader();toast(`${chips.length} sets logged`);return renderLift();
  }
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
    snapshot(`logged ${dDisp(km)}${DU()} run`);
    t.w.push({part:'Run',ex:'Run',w:km,reps:[],mins:+($('#rm').value||0),secs:+($('#rs').value||0),at:Date.now()});
    reopen('Run','Run');
    save();renderHeader();return renderLift();
  }
  const del=e.target.closest('[data-del]');
  if(del){
    if(lpFired){ lpFired=false; return; }
    const s=t.w[+del.dataset.del];
    snapshot(`deleted ${wDisp(s.w)}${U()}×${s.reps[0]||''}`);
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
    document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v==='lift'));
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
document.addEventListener('input',e=>{
  if(e.target&&e.target.id==='wv') refreshLoad();
});
function refreshLoad(){
  const ll=$('#ll');
  if(ll&&lift.ex){
    const kg=toKg(+($('#wv').value||0));
    ll.innerHTML = usesPlates(lift.ex)
      ? loadInner(lift.ex,kg)
      : `<span class="ll-text">${loadLine(lift.ex,kg)}</span>`;
  }
  refreshReps();   // v3.3.56: the rep tiles follow the weight, same funnel
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
  const pct=svg.getAttribute('data-scrub')==='pct';
  const lines=[...svg.querySelectorAll('polyline[data-yr]')].map(pl=>({
    yr:pl.getAttribute('data-yr'), color:pl.getAttribute('stroke'),
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
  const hint=box.querySelector('.zoomhint');
  const hint0=hint?hint.textContent:'';
  const val0=new Map();
  if(legend) legend.querySelectorAll('[data-yr]').forEach(s=>{
    const b=s.querySelector('b'); if(b) val0.set(s.getAttribute('data-yr'), b.textContent);
  });

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
    const x=Math.max(sx0,Math.min(sx0+sxw,ux));
    vline.setAttribute('x1',x.toFixed(1)); vline.setAttribute('x2',x.toFixed(1));
    lines.forEach((L,i)=>{
      const y=yAt(L.pts,x);
      if(y==null){ dots[i].style.display='none'; }
      else { dots[i].style.display=''; dots[i].setAttribute('cx',x.toFixed(1)); dots[i].setAttribute('cy',y.toFixed(1)); }
      if(legend){
        const b=legend.querySelector(`[data-yr="${L.yr}"] b`);
        if(b) b.textContent = y==null ? '\u2013'
          : (pct ? Math.round(smax*(sy0-y)/syh*100)+'%' : String(Math.round(smax*(sy0-y)/syh)));
      }
    });
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
  };
  return {show,hide};
}

/* v3.3.116: the part-mix chart opens at TODAY (its right edge) and loads
   older weeks when you reach the left. Scroll position is restored by the
   exact width added, so the view does not jump under the finger — the
   whole point of loading backwards. */
function bindPmix(){
  const box=document.getElementById('pmixWrap');
  if(!box||box.dataset.bound) return;
  box.dataset.bound='1';
  box.scrollLeft=box.scrollWidth;              // today, not January
  /* v3.3.117: the first version read box.scrollWidth to work out how much
     had been prepended. After innerHTML that value has not reflowed yet, so
     the delta came back 0, scrollLeft stayed at 0, the next scroll event
     saw scrollLeft<60 and loaded again — and the chart ran all the way to
     the first day in one flick. The width added is knowable from the DATA
     (columns x column width), so it is computed, not measured, and a real
     lock stops re-entry until the next frame. */
  let busy=false;
  box.addEventListener('scroll',()=>{
    if(busy||box.scrollLeft>80) return;
    const total=[...workoutDates()].length;
    if(PMIX_DAYS>=total) return;
    busy=true;
    const prev=PMIX_DAYS;
    PMIX_DAYS=Math.min(total,PMIX_DAYS+56);
    const added=(PMIX_DAYS-prev)*PMIX_COLW;
    box.innerHTML=partMixSvg(PMIX_DAYS);
    box.scrollLeft=added+box.scrollLeft;       // computed, not measured
    requestAnimationFrame(()=>{ busy=false; });
  },{passive:true});
}
function bindZoom(box){
  if(box.dataset.bound) return;
  box.dataset.bound='1';
  const svg=box.querySelector('svg');
  const vb0=svg.getAttribute('viewBox').split(/\s+/).map(Number);   // [x,y,w,h]
  let vb=[...vb0];
  const apply=()=>{
    svg.setAttribute('viewBox',vb.join(' '));                       // vector-crisp at any zoom
    const hint=box.querySelector('.zoomhint');
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
  if(MOTION_OK){ try{ motionPass(); }catch(_e){ /* motion is decoration — it never gets to break the app */ } }
  window.scrollTo(0,0);
}
let lastView=null;
function render(){
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
