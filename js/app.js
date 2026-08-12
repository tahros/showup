/* ShowUp â€” app.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- events ---------- */
document.addEventListener('click',e=>{
  if(checkDate()) return;   // v3.3.158: the day rolled mid-tap â€” re-render, next tap lands right
  const t=day(todayISO);
  if(e.target.closest('#unitBtn')){
    DB.settings.unit=isLb()?'kg':'lb';
    save(true);toast(isLb()?'Imperial â€” lb & miles':'Metric â€” kg & km');return render();
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
    const v=prompt(`${thisYear} goal â€” how many ${DU()}?`, cur||'');
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
      toast(`Target: ${ng.dataset.nr} reps â€” go get it`);
      return;
    }
    lift.weight=+ng.dataset.nw;
    saveExW(lift.ex,lift.weight);save(true);
    toast(`Weight set to ${wDisp(lift.weight)} ${U()} â€” go get it`);
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
    // Multi-exercise parts stay open â€” and undimmed â€” until the explicit Complete <part>.
    const exsInPart=new Set(m.w.filter(s=>s.part===lift.part).map(s=>s.ex));
    if(exsInPart.size===1){
      if(!m.donePart.includes(lift.part)) m.donePart.push(lift.part);
      if(!m.w.some(s=>!m.doneEx.includes(s.ex))) m.doneAll=true;
    }
    /* v3.1.15: multi-exercise parts stay open for MORE exercises â€” but when
       the âœ• just closed the LAST open exercise of the whole day, there is
       nothing left to stay open FOR. Close everything; red ends now. */
    if(!m.doneAll && !m.w.some(s=>!m.doneEx.includes(s.ex))){
      for(const p of new Set(m.w.map(s=>s.part)))
        if(p&&!m.donePart.includes(p)) m.donePart.push(p);
      m.doneAll=true;
    }
    save();renderHeader();
    toast(m.doneAll?`Workout complete â€” ${m.w.length} sets. Cool down ðŸ”¥`:`${lift.ex} complete âœ“`);
    lift.ex=null;return render();
  }
  if(e.target.closest('#reopenPartBtn')&&lift.part){
    const m=dayMeta(); m.upd=Date.now();
    m.donePart=m.donePart.filter(p=>p!==lift.part);
    m.doneAll=false;                       // a reopened part reopens the workout
    save();renderHeader();toast(`${lift.part} reopened â€” back at it`);
    return render();
  }
  if(e.target.closest('#donePartBtn')&&lift.part){
    const m=dayMeta(); m.upd=Date.now();
    m.w.filter(s=>s.part===lift.part).forEach(s=>{ if(!m.doneEx.includes(s.ex)) m.doneEx.push(s.ex); });
    if(!m.donePart.includes(lift.part)) m.donePart.push(lift.part);
    if([...new Set(m.w.map(s=>s.part))].every(p=>m.donePart.includes(p))) m.doneAll=true;
    save();renderHeader();
    toast(m.doneAll?`Workout complete â€” ${m.w.length} sets. Cool down ðŸ”¥`:`${lift.part} complete âœ“`);return render();
  }
  if(e.target.closest('#doneAllBtn')){
    const m=dayMeta(); m.upd=Date.now();
    m.w.forEach(s=>{ if(!m.doneEx.includes(s.ex)) m.doneEx.push(s.ex);
                     if(!m.donePart.includes(s.part)) m.donePart.push(s.part); });
    m.doneAll=true;
    save();renderHeader();
    toast(`Workout complete â€” ${m.w.length} sets. Cool down ðŸ”¥`);
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
    // v3.3.31: Continue means continue â€” an OPEN part jumps straight into its
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
    lift.weight=0; lift.editBar=false; lift.copy=false; lift.suggestOpen=null; lift.info=false; lift.editSet=null; lift.editToday=false;
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
    /* v3.3.7: plates load in PAIRS â€” barbell/smith move in 5 kg (10 lb)
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
    undoInvalidate();   // v3.3.143: new work makes an older snapshot unsafe to restore
    reopen(lift.ex,lift.part);
    lift.justSaved=true;save();renderHeader();setToast(lift.ex,lift.weight,+rb.dataset.rep);return renderLift();
  }
  if(e.target.closest('#addrep')){
    const r=Math.round(+($('#rc').value||0));
    if(!r||r<1) return toast('Enter a rep count');
    lift.weight=toKg(+($('#wv').value||0));
    saveExW(lift.ex,lift.weight);
    t.w.push({part:lift.part,ex:lift.ex,w:lift.weight,reps:[r],at:Date.now()});
    undoInvalidate();   // v3.3.143
    reopen(lift.ex,lift.part);
    lift.justSaved=true;save();renderHeader();setToast(lift.ex,lift.weight,r);return renderLift();
  }
  const rs=e.target.closest('[data-rep-w]');
  if(rs){
    /* v3.3.144: restored with the strip (removed as an orphan in v3.3.143
       after the chips went in v3.3.141). One tap logs the complete pair. */
    const w=+rs.dataset.repW, r=+rs.dataset.repR;
    t.w.push({part:lift.part,ex:lift.ex,w,reps:[r],at:Date.now()});
    undoInvalidate();   // v3.3.143: new work makes an older snapshot unsafe
    reopen(lift.ex,lift.part);
    lift.weight=w;
    saveExW(lift.ex,w);
    lift.justSaved=true;save();renderHeader();setToast(lift.ex,w,r);return renderLift();
  }
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
    /* v3.3.161: the numeric keypad has no apostrophe â€” bare digits parse:
       730 -> 7'30, 1015 -> 10'15. Separators still accepted if pasted. */
    const m=pTxt.match(/^(\d{1,2})[':.](\d{1,2})$/)||pTxt.match(/^(\d{1,2})(\d{2})$/);
    if(m) DB.settings.tgtPace=(+m[1])*60+(+m[2]);
    else if(!pTxt) DB.settings.tgtPace=0;
    if(v>0) DB.settings.moGoal=v;
    delete DB.settings._moEdit; save();
    return render();   // v3.3.161: the card lives on Stats now â€” render the CURRENT view
  }
  if(e.target.closest('#moGoalEdit')){ DB.settings._moEdit=1; return render(); }  // v3.3.159: edit prefills, never wipes
  if(e.target.closest('#sessEdit')){ lift.editToday=!lift.editToday; lift.editSet=null; return renderLift(); }
  // v3.3.144: #allSets removed with the CAP â€” edit mode shows every set
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
    save(true); toast(`${tm.dataset.tierEx} â†’ ${tm.dataset.tierTo==='core'?'Core':'Other'}`);
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
  // for some time â€” no element carried that id.)
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
    reanchorRã~}¶‰žËkºwµç@€€€€€É•ÑÕÉ¸àÄôôõàÀ€üäÄ€èäÀ¬¡äÄµäÀ¤¨ ¡àµàÀ¤¼¡àÄµàÀ¤¤ì4(€€€€€ô4(€€€ô4(€€€É•ÑÕÉ¸ÁÑÍmÁÑÌ¹±•¹Ñ ´ÅulÅtì4(€ôì4(€½¹ÍÐÍ¡½Üõ±¥•¹Ñ`ôùì4(€€€½¹ÍÐÈõ‰½à¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ð ¤°Ùˆõ•ÑYˆ ¤ì4(€€€½¹ÍÐÕàõÙ‰lÁt¬ ¡±¥•¹Ñ`µÈ¹±•™Ð¤½È¹Ý¥‘Ñ ¤©Ù‰lÉtì4(€€€±•Ðàõ5…Ñ ¹µ…à¡ÍàÀ±5…Ñ ¹µ¥¸¡ÍàÀ­ÍáÜ±Õà¤¤±‘…å%¹‘•àõ¹Õ±°ì4(€€€¥˜¡É…”¥ì4(€€€€€½¹ÍÐ¸õ5…Ñ ¹µ…à È°¸¸¹±¥¹•Ì¹µ…À¡0ôù0¹Ù…±Õ•Ì¹±•¹Ñ¡ññ0¹ÁÑÌ¹±•¹Ñ ¤¤ì4(€€€€€‘…å%¹‘•àõ5…Ñ ¹µ…à À±5…Ñ ¹µ¥¸¡¸´Ä±5…Ñ ¹É½Õ¹ ¡àµÍàÀ¤½ÍáÜ¨¡¸´Ä¤¤¤¤ì4(€€€€€àõÍàÀ­‘…å%¹‘•à½5…Ñ ¹µ…à Ä±¸´Ä¤©ÍáÜì€€€€€€€¼¼…¸•á…Ð‘…ä°¹•Ù•È„™É…Ñ¥½¹…°½Õ¹Ð4(€€€ô4(€€€Ù±¥¹”¹Í•ÑÑÑÉ¥‰ÕÑ” àÄœ±à¹Ñ½¥á• Ä¤¤ìÙ±¥¹”¹Í•ÑÑÑÉ¥‰ÕÑ” àÈœ±à¹Ñ½¥á• Ä¤¤ì4(€€€½¹ÍÐÉ…•Y…±Õ•Ìõ¹•Ü5…À ¤ì4(€€€±¥¹•Ì¹™½É…  ¡0±¤¤ôùì4(€€€€€½¹ÍÐ•á…ÐõÉ…”˜™0¹Ù…±Õ•Ì¹±•¹Ñ €ü0¹Ù…±Õ•Ím5…Ñ ¹µ¥¸¡‘…å%¹‘•à±0¹Ù…±Õ•Ì¹±•¹Ñ ´Ä¥t€è¹Õ±°ì4(€€€€€½¹ÍÐäõ•á…Ðôõ¹Õ±°ýåÐ¡0¹ÁÑÌ±à¤éÍäÀµ•á…Ð½Íµ…à©Íå ì4(€€€€€¥˜¡äôõ¹Õ±°¥ì‘½ÑÍm¥t¹ÍÑå±”¹‘¥ÍÁ±…äô¹½¹”œìô4(€€€€€•±Í”ì‘½ÑÍm¥t¹ÍÑå±”¹‘¥ÍÁ±…äôœœì‘½ÑÍm¥t¹Í•ÑÑÑÉ¥‰ÕÑ” àœ±à¹Ñ½¥á• Ä¤¤ì‘½ÑÍm¥t¹Í•ÑÑÑÉ¥‰ÕÑ” äœ±ä¹Ñ½¥á• Ä¤¤ìô4(€€€€€¥˜¡±••¹¥ì4(€€€€€€€½¹ÍÐˆõ±••¹¹ÅÕ•ÉåM•±•Ñ½È¡m‘…Ñ„µåÈôˆ‘í0¹åÉô‰t‰€¤ì4(€€€€€€€¥˜¡ˆ¤ˆ¹Ñ•áÑ½¹Ñ•¹Ð€ôäôõ¹Õ±°€ü€qÔÈÀÄÌœ4(€€€€€€€€€€è€¡ÁÐ€ü5…Ñ ¹É½Õ¹¡Íµ…à¨¡ÍäÀµä¤½Íå ¨ÄÀÀ¤¬œ”œ€èMÑÉ¥¹œ¡5…Ñ ¹É½Õ¹¡Íµ…à¨¡ÍäÀµä¤½Íå ¤¤¤ì4(€€€€€ô4(€€€€€¥˜¡É…•…É˜™ä„õ¹Õ±°¥ì4(€€€€€€€½¹ÍÐÙ…±Õ”õ•á…Ðôõ¹Õ±°ý5…Ñ ¹É½Õ¹¡Íµ…à¨¡ÍäÀµä¤½Íå ¤é•á…Ðì(€€€€€€€É…•Y…±Õ•Ì¹Í•Ð¡0¹åÈ±Ù…±Õ”¤ì(€€€€€€€½¹ÍÐˆõÉ…•…É¹ÅÕ•ÉåM•±•Ñ½È¡m‘…Ñ„µ½¸µ½Õ¹Ðôˆ‘í0¹åÉô‰u€¤ì¥˜¡ˆ¤ˆ¹Ñ•áÑ½¹Ñ•¹ÐõMÑÉ¥¹œ¡5…Ñ ¹É½Õ¹¡Ù…±Õ”¤¤ì(€€€€€ô4(€€€ô¤ì4(€€€¥˜¡É…•…É˜™‘…å%¹‘•à„õ¹Õ±°¥ì4(€€€€€½¹ÍÐÕÉÉ•¹ÐõÉ…•…É¹•ÑÑÑÉ¥‰ÕÑ” ‘…Ñ„µÕÉÉ•¹Ðµå•…Èœ¤±ÁÉ•Ù¥½ÕÌõÉ…•…É¹•ÑÑÑÉ¥‰ÕÑ” ‘…Ñ„µÁÉ•Ù¥½ÕÌµå•…Èœ¤ì4(€€€€€½¹ÍÐ…Àô¡É…•Y…±Õ•Ì¹•Ð¡ÕÉÉ•¹Ð¥ñðÀ¤´¡É…•Y…±Õ•Ì¹•Ð¡ÁÉ•Ù¥½ÕÌ¥ñðÀ¤ì4(€€€€€½¹ÍÐõ¹•Ü…Ñ” ¬¡ÍÙœ¹•ÑÑÑÉ¥‰ÕÑ” ‘…Ñ„µÍÉÕˆµå•…Èœ¥ññÕÉÉ•¹Ð¤°À±‘…å%¹‘•à¬Ä¤ì4(€€€€€¥˜¡É…•…Ñ”¤É…•…Ñ”¹Ñ•áÑ½¹Ñ•¹Ðôe=TYLe=Tƒ
Ü€œ­¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µULœ±íµ½¹Ñ èÍ¡½ÉÐœ±‘…äè¹Õµ•É¥Œô¤¹Ñ½UÁÁ•É…Í” ¤ì4(€€€€€¥˜¡É…•…À¥ì4(€€€€€€€É…•…À¹±…ÍÍ1¥ÍÐ¹Ñ½±” ÕÀœ±…ÀøôÀ¤ì4(€€€€€€€½¹ÍÐ¸õÉ…•U¹¥Ðý5…Ñ ¹É½Õ¹¡…À¤é…À±Õ¹¥ÐõÉ…•U¹¥Ðý€€‘íÉ…•U¹¥Ñõ€é€‘…ä‘í…ÀôôôÄüœœèÌõ€ì(€€€€€€€É…•…À¹¥¹¹•É!Q50õ…ÀøÀý€¬‘í¹ô‘íÕ¹¥ÑôñÍµ…±°ù…¡•…ð½Íµ…±°ù€(€€€€€€€€€€é…ÀðÀý€‘í5…Ñ ¹…‰Ì¡¸¥ô‘íÉ…•U¹¥ÐýÕ¹¥Ðé€‘…ä‘í…Àôôô´ÄüœœèÌõôñÍµ…±°ù‰•¡¥¹ð½Íµ…±°ù€éÙ•¸ñÍµ…±°ùÍ…µ”‘…Ñ”ð½Íµ…±°ù€ì(€€€€€ô4(€€€€€É…•…É¹±…ÍÍ1¥ÍÐ¹…‘ ÍÉÕ‰‰¥¹œœ¤ì4(€€€ô4(€€€¥˜¡¡¥¹Ð¥ì4(€€€€€½¹ÍÐ‘½å8õ5…Ñ ¹µ…à Ä±5…Ñ ¹µ¥¸ ÌØØ±5…Ñ ¹É½Õ¹ ¡àµÍàÀ¤½ÍáÜ¨ÌØØ¤¤¤ì4(€€€€€¡¥¹Ð¹Ñ•áÑ½¹Ñ•¹Ðõ¹•Ü…Ñ” ÈÀÈÔ°À±5…Ñ ¹µ¥¸ ÌØÔ±‘½å8¤¤4(€€€€€€€€¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µULœ±íµ½¹Ñ èÍ¡½ÉÐœ±‘…äè¹Õµ•É¥Œô¤ì4(€€€ô4(€€€œ¹ÍÑå±”¹‘¥ÍÁ±…äôœœì4(€ôì4(€½¹ÍÐ¡¥‘”ô ¤ôùì4(€€€œ¹ÍÑå±”¹‘¥ÍÁ±…äô¹½¹”œì4(€€€¥˜¡¡¥¹Ð¤¡¥¹Ð¹Ñ•áÑ½¹Ñ•¹Ðõ¡¥¹ÐÀì4(€€€¥˜¡±••¹¤Ù…°À¹™½É…  ¡Ð±åÈ¤ôùì4(€€€€€½¹ÍÐˆõ±••¹¹ÅÕ•ÉåM•±•Ñ½È¡m‘…Ñ„µåÈôˆ‘íåÉô‰t‰€¤ì¥˜¡ˆ¤ˆ¹Ñ•áÑ½¹Ñ•¹ÐõÐì4(€€€ô¤ì4(€€€¥˜¡É…•…É˜™É…”À¥ì4(€€€€€É…•…É¹±…ÍÍ1¥ÍÐ¹É•µ½Ù” ÍÉÕ‰‰¥¹œœ¤ì4(€€€€€¥˜¡É…•…Ñ”¤É…•…Ñ”¹Ñ•áÑ½¹Ñ•¹ÐõÉ…”À¹‘…Ñ”ì4(€€€€€¥˜¡É…•…À¥íÉ…•…À¹¥¹¹•É!Q50õÉ…”À¹…ÀíÉ…•…À¹±…ÍÍ9…µ”õÉ…”À¹…Á±…ÍÌíô4(€€€€€É…”À¹Ù…±Õ•Ì¹™½É…  ¡Ð±åÈ¤ôùí½¹ÍÐˆõÉ…•…É¹ÅÕ•ÉåM•±•Ñ½È¡m‘…Ñ„µ½¸µ½Õ¹Ðôˆ‘íåÉô‰u€¤í¥˜¡ˆ¥ˆ¹Ñ•áÑ½¹Ñ•¹ÐõÐíô¤ì4(€€€ô4(€ôì4(€É•ÑÕÉ¸íÍ¡½Ü±¡¥‘•ôì4)ô4(4(¼¨ØÌ¸Ì¸ÄÄØèÑ¡”Á…ÉÐµµ¥à¡…ÉÐ½Á•¹Ì…ÐQ=d€¡¥ÑÌÉ¥¡Ð•‘”¤…¹±½…‘Ì4(€€½±‘•ÈÝ••­ÌÝ¡•¸å½ÔÉ•… Ñ¡”±•™Ð¸MÉ½±°Á½Í¥Ñ¥½¸¥ÌÉ•ÍÑ½É•‰äÑ¡”4(€€•á…ÐÝ¥‘Ñ …‘‘•°Í¼Ñ¡”Ù¥•Ü‘½•Ì¹½Ð©ÕµÀÕ¹‘•ÈÑ¡”™¥¹•ÈƒŠPÑ¡”4(€€Ý¡½±”Á½¥¹Ð½˜±½…‘¥¹œ‰…­Ý…É‘Ì¸€¨¼4)™Õ¹Ñ¥½¸‰¥¹‘Aµ¥à ¥ì4(€½¹ÍÐ‰½àõ‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ì4(€¥˜ …‰½áññ‰½à¹‘…Ñ…Í•Ð¹‰½Õ¹¤É•ÑÕÉ¸ì4(€‰½à¹‘…Ñ…Í•Ð¹‰½Õ¹ôœÄœì4(€‰½à¹ÍÉ½±±1•™Ðõ‰½à¹ÍÉ½±±]¥‘Ñ ì€€€€€€€€€€€€€€¼¼Ñ½‘…ä°¹½Ð)…¹Õ…Éä4(€½¹ÍÐ¹½Üõ‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥á9½Üœ¤ì4(€€¼¨ØÌ¸Ì¸ÄÈÀèÑ¡”Ý…ä‰…¬¸ÁÁ•…ÉÌ½¹±ä½¹”å½Ô¡…Ù”…ÑÕ…±±äÑÉ…Ù•±±•°4(€€€€…¹É¥‘•ÌÑ¡”ÝÉ…ÁÁ•ÈÌÍÉ½±°µ‰•¡…Ù¥½ÈéÍµ½½Ñ É…Ñ¡•ÈÑ¡…¸…¹¥µ…Ñ¥¹œ4(€€€€‰ä¡…¹¸€¨¼4(€½¹ÍÐÍå¹9½Üô ¤ôùì¥˜ …¹½Ü¤É•ÑÕÉ¸ì4(€€€½¹ÍÐ™…Èõ‰½à¹ÍÉ½±±]¥‘Ñ µ‰½à¹±¥•¹Ñ]¥‘Ñ µ‰½à¹ÍÉ½±±1•™Ðì4(€€€¹½Ü¹±…ÍÍ1¥ÍÐ¹Ñ½±” ½¸œ°™…ÈøÐÀ¤ìôì4(€¥˜¡¹½Ü¤¹½Ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ° ¤ôùì‰½à¹ÍÉ½±±1•™Ðõ‰½à¹ÍÉ½±±]¥‘Ñ ìÍå¹9½Ü ¤ìô¤ì4(€‰½à¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ÍÉ½±°œ±Íå¹9½Ü±íÁ…ÍÍ¥Ù”éÑÉÕ•ô¤ì4(€€¼¨ØÌ¸Ì¸ÄÄÜèÑ¡”™¥ÉÍÐÙ•ÉÍ¥½¸É•…‰½à¹ÍÉ½±±]¥‘Ñ Ñ¼Ý½É¬½ÕÐ¡½ÜµÕ 4(€€€€¡…‰••¸ÁÉ•Á•¹‘•¸™Ñ•È¥¹¹•É!Q50Ñ¡…ÐÙ…±Õ”¡…Ì¹½ÐÉ•™±½Ý•å•Ð°Í¼4(€€€€Ñ¡”‘•±Ñ„…µ”‰…¬€À°ÍÉ½±±1•™ÐÍÑ…å•…Ð€À°Ñ¡”¹•áÐÍÉ½±°•Ù•¹Ð4(€€€€Í…ÜÍÉ½±±1•™ÐðØÀ…¹±½…‘•……¥¸ƒŠP…¹Ñ¡”¡…ÉÐÉ…¸…±°Ñ¡”Ý…äÑ¼4(€€€€Ñ¡”™¥ÉÍÐ‘…ä¥¸½¹”™±¥¬¸Q¡”Ý¥‘Ñ …‘‘•¥Ì­¹½Ý…‰±”™É½´Ñ¡”Q4(€€€€€¡½±Õµ¹Ìà½±Õµ¸Ý¥‘Ñ ¤°Í¼¥Ð¥Ì½µÁÕÑ•°¹½Ðµ•…ÍÕÉ•°…¹„É•…°4(€€€€±½¬ÍÑ½ÁÌÉ”µ•¹ÑÉäÕ¹Ñ¥°Ñ¡”¹•áÐ™É…µ”¸€¨¼4(€€¼¨ØÌ¸Ì¸ÄÈÈèÑ¡”Ý¡½±”…É¡¥Ù”¥ÌÉ•¹‘•É•ÕÀ™É½¹Ð°Í¼Ñ¡•É”¥Ì¹¼4(€€€€ÁÉ•Á•¹‘¥¹œ…¹¹½Ñ¡¥¹œÑ¼½ÉÉ•ÐƒŠPÝ¡¥ ¥ÌÝ¡…ÐÉ•µ½Ù•ÌÑ¡”±ÕÉ ¸4(€€€€]¡…Ð±¥Ù•Ì¡•É”¹½Ü¥ÌÑ¡”ÍÉÕ‰‰•ÈèÁÉ•ÍÌ½È‘É…œ…É½ÍÌÑ¡”Á±½Ð…¹4(€€€€Ñ¡”±¥¹”…‰½Ù”É•…‘ÌÑ¡…Ð‘…ä½ÕÐ¸€¨¼4(€€¼¨ØÌ¸Ì¸ÄÈÔè¹¼ÍÉÕ‰‰•È¸=¹”¥¹Ñ•É…Ñ¥½¸èÑ…À„½±Õµ¸°™½±±½ÜÑ¡…Ð‰½‘ä4(€€€€Á…ÉÐìÑ…À……¥¸Ñ¼É•±•…Í”¸Q…ÁÁ¥¹œ„ÍÑ…­•Í•µ•¹ÐÁ¥­ÌÑ¡…Ð4(€€€€Í•µ•¹ÐìÑ…ÁÁ¥¹œ…¹åÝ¡•É”•±Í”¥¸„Í¥¹±”µÁ…ÉÐ½±Õµ¸Á¥­Ì¥ÑÌÁ…ÉÐ°4(€€€€Í¼å½Ô¹•Ù•È¡…Ù”Ñ¼¡¥Ð„Ñ¡¥¸‰…È•á…Ñ±ä¸‘É…œÍÑ¥±°ÍÉ½±±Ì…¹4(€€€€µÕÍÐ¹•Ù•ÈÍ•±•Ð°Í¼µ½Ù•µ•¹ÐÁ…ÍÐ€ÙÁà…¹•±ÌÑ¡”Ñ…À¸€¨¼4(€±•Ð‘½Ý¹`ôÀ°‘½Ý¹dôÀ°µ½Ù•õ™…±Í”°‘½Ý¹Ðõ¹Õ±°ì4(€€¼¨ØÌ¸Ì¸ÄÈØèÝ¡…Ð„Ñ…À59L‘•Á•¹‘Ì½¸Ý¡•Ñ¡•Èå½Ô…É”…±É•…‘ä™½±±½Ý¥¹œ4(€€€€Í½µ•Ñ¡¥¹œ¸1…¹‘¥¹œ½¸„Í•µ•¹Ð…±Ý…åÌÁ¥­ÌÑ¡…ÐÁ…ÉÐ¸1…¹‘¥¹œ½¸•µÁÑä4(€€€€ÍÁ…”Á¥­ÌÑ¡”½±Õµ¸ÌÁ…ÉÐ½¹±äÝ¡•¸¹½Ñ¡¥¹œ¥Ì‰•¥¹œ™½±±½Ý•ƒŠP½¹”4(€€€€å½ÔI™½±±½Ý¥¹œ½¹”°•µÁÑäÍÁ…”µ•…¹ÌÉ•±•…Í”°¹½Ð€‰ÍÝ¥Ñ µ”Ñ¼4(€€€€Ý¡…Ñ•Ù•È‰…È¡…ÁÁ•¹ÌÑ¼‰”Õ¹‘•È¡•É”ˆ¸€¨¼4(€½¹ÍÐ…Ñ¥½¹Ðô¡Ñ…É•Ð±±¥•¹Ñ`¤ôùì4(€€€½¹ÍÐ‘¥É•ÐõÑ…É•Ð€˜˜Ñ…É•Ð¹•ÑÑÑÉ¥‰ÕÑ”€üÑ…É•Ð¹•ÑÑÑÉ¥‰ÕÑ” ‘…Ñ„µÁÐœ¤€è¹Õ±°ì4(€€€¥˜¡‘¥É•Ð¤É•ÑÕÉ¸í™½ÕÌé‘¥É•Ñôì4(€€€¥˜¡A5%a}=UL¤É•ÑÕÉ¸í±•…ÈéÑÉÕ•ôì4(€€€½¹ÍÐÈõ‰½à¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ð ¤ì4(€€€½¹ÍÐ¤õ5…Ñ ¹™±½½È ¡±¥•¹Ñ`µÈ¹±•™Ð­‰½à¹ÍÉ½±±1•™Ð´à¤½A5%a}=1\¤ì4(€€€½¹ÍÐÉ½ÝÌõÁ…ÉÑ5¥à¡A5%a}eL¤ì4(€€€¥˜¡¤ðÁñð…É½ÝÍm¥t¤É•ÑÕÉ¸¹Õ±°ì4(€€€½¹ÍÐ¹…µ•Ìõ=‰©•Ð¹­•åÌ¡É½ÝÍm¥t¹‰ä¤ì4(€€€É•ÑÕÉ¸¹…µ•Ì¹±•¹Ñ ôôôÄ€üí™½ÕÌé¹…µ•ÍlÁuô€è¹Õ±°ì€€€¼¼…µ‰¥Õ½ÕÌÍÑ…­Ì¹••Ñ¡”Í•µ•¹Ð4(€ôì4(€‰½à¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Á½¥¹Ñ•É‘½Ý¸œ±”ôùì4(€€€‘½Ý¹`õ”¹±¥•¹Ñ`ì‘½Ý¹dõ”¹±¥•¹Ñdìµ½Ù•õ™…±Í”ì4(€€€‘½Ý¹Ðõ…Ñ¥½¹Ð¡”¹Ñ…É•Ð±”¹±¥•¹Ñ`¤ì4(€ô±íÁ…ÍÍ¥Ù”éÑÉÕ•ô¤ì4(€‰½à¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Á½¥¹Ñ•Éµ½Ù”œ±”ôùì4(€€€¥˜¡5…Ñ ¹…‰Ì¡”¹±¥•¹Ñ`µ‘½Ý¹`¤øÙññ5…Ñ ¹…‰Ì¡”¹±¥•¹Ñdµ‘½Ý¹d¤øØ¤µ½Ù•õÑÉÕ”ì4(€ô±íÁ…ÍÍ¥Ù”éÑÉÕ•ô¤ì4(€‰½à¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Á½¥¹Ñ•ÉÕÀœ° ¤ôùì4(€€€¥˜ …µ½Ù•€˜˜‘½Ý¹Ð¥ì4(€€€€€¥˜¡‘½Ý¹Ð¹±•…È¤Áµ¥áM•Ñ½ÕÌ¡A5%a}=UL¤ì€€€¼¼Ñ½±¥¹œÑ¡”ÕÉÉ•¹Ð½¹”É•±•…Í•Ì¥Ð4(€€€€€•±Í”Áµ¥áM•Ñ½ÕÌ¡‘½Ý¹Ð¹™½ÕÌ¤ì4(€€€ô4(€€€‘½Ý¹Ðõ¹Õ±°ì4(€ô±íÁ…ÍÍ¥Ù”éÑÉÕ•ô¤ì4(€‰½à¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Á½¥¹Ñ•É…¹•°œ° ¤ôùì‘½Ý¹Ðõ¹Õ±°ìô±íÁ…ÍÍ¥Ù”éÑÉÕ•ô¤ì4(4(€€¼¼Ñ¡”å•…È±…‰•°™½±±½ÝÌÑ¡”±•™Ð•‘”½˜Ý¡…Ðå½Ô…É”±½½­¥¹œ…Ð4(€½¹ÍÐåÈõ‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥áeÈœ¤ì4(€½¹ÍÐÍå¹eÈô ¤ôùì¥˜ …åÉñð…A5%a}eIL¹±•¹Ñ ¤É•ÑÕÉ¸ì4(€€€½¹ÍÐ¤õ5…Ñ ¹µ…à À±5…Ñ ¹µ¥¸¡A5%a}eIL¹±•¹Ñ ´Ä°4(€€€€€5…Ñ ¹É½Õ¹ ¡‰½à¹ÍÉ½±±1•™Ð´à¤½A5%a}=1\¤¤¤ì4(€€€½¹ÍÐäõA5%a}eIMm¥tì4(€€€¥˜¡åÈ¹Ñ•áÑ½¹Ñ•¹Ð„ôõä¤åÈ¹Ñ•áÑ½¹Ñ•¹Ðõäì4(€ôì4(€‰½à¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ÍÉ½±°œ±Íå¹eÈ±íÁ…ÍÍ¥Ù”éÑÉÕ•ô¤ì4(€Íå¹eÈ ¤ì4)ô4)™Õ¹Ñ¥½¸‰¥¹‘i½½´¡‰½à¥ì4(€¥˜¡‰½à¹‘…Ñ…Í•Ð¹‰½Õ¹¤É•ÑÕÉ¸ì4(€‰½à¹‘…Ñ…Í•Ð¹‰½Õ¹ôœÄœì4(€½¹ÍÐÍÙœõ‰½à¹ÅÕ•ÉåM•±•Ñ½È ÍÙœœ¤ì4(€½¹ÍÐÙˆÀõÍÙœ¹•ÑÑÑÉ¥‰ÕÑ” Ù¥•Ý	½àœ¤¹ÍÁ±¥Ð ½qÌ¬¼¤¹µ…À¡9Õµ‰•È¤ì€€€¼¼mà±ä±Ü±¡t4(€±•ÐÙˆõl¸¸¹ÙˆÁtì4(€½¹ÍÐ…ÁÁ±äô ¤ôùì4(€€€ÍÙœ¹Í•ÑÑÑÉ¥‰ÕÑ” Ù¥•Ý	½àœ±Ùˆ¹©½¥¸ œ€œ¤¤ì€€€€€€€€€€€€€€€€€€€€€€€¼¼Ù•Ñ½ÈµÉ¥ÍÀ…Ð…¹äé½½´4(€€€½¹ÍÐ¡¥¹Ðõ‰½à¹Á…É•¹Ñ±•µ•¹Ðý‰½à¹Á…É•¹Ñ±•µ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œ¹é½½µ¡¥¹Ðœ¤é¹Õ±°ì€€€¼¼ØÌ¸Ì¸ÄÈäèÍ¥‰±¥¹œ°¹½Ð¡¥±4(€€€¥˜¡¡¥¹Ð¤¡¥¹Ð¹ÍÑå±”¹½Á…¥Ñä€ô€¡Ù‰lÉt€ðÙˆÁlÉt´À¸Ô¤€ü€À€è€¸ÜÔì4(€ôì4(€½¹ÍÐ±…µÀô ¤ôùì4(€€€Ù‰lÉtõ5…Ñ ¹µ¥¸¡ÙˆÁlÉt±5…Ñ ¹µ…à¡ÙˆÁlÉt¼ÄÈ±Ù‰lÉt¤¤ì4(€€€Ù‰lÍtõÙ‰lÉt©ÙˆÁlÍt½ÙˆÁlÉtì4(€€€Ù‰lÁtõ5…Ñ ¹µ¥¸¡ÙˆÁlÁt­ÙˆÁlÉtµÙ‰lÉt±5…Ñ ¹µ…à¡ÙˆÁlÁt±Ù‰lÁt¤¤ì4(€€€Ù‰lÅtõ5…Ñ ¹µ¥¸¡ÙˆÁlÅt­ÙˆÁlÍtµÙ‰lÍt±5…Ñ ¹µ…à¡ÙˆÁlÅt±Ù‰lÅt¤¤ì4(€ôì4(€½¹ÍÐÁÐô¡Áà±Áä¤ôùì€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€¼¼ÍÉ••¸Áà€´øÍÙœÕ¹¥ÑÌ4(€€€½¹ÍÐÈõ‰½à¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ð ¤ì4(€€€É•ÑÕÉ¸mÙ‰lÁt¬¡Áà½È¹Ý¥‘Ñ ¤©Ù‰lÉt°Ù‰lÅt¬¡Áä½È¹¡•¥¡Ð¤©Ù‰lÍutì4(€ôì4(€½¹ÍÐé½½µÐô¡Áà±Áä±˜¤ôùì4(€€€½¹ÍÐmÕà±ÕåtõÁÐ¡Áà±Áä¤ì4(€€€½¹ÍÐÜõÙ‰lÉt½˜°¡ÐõÙ‰lÍt½˜ì4(€€€ÙˆõmÕà´¡ÕàµÙ‰lÁt¤½˜°Õä´¡ÕäµÙ‰lÅt¤½˜°Ü°¡Ñtì4(€€€±…µÀ ¤ì…ÁÁ±ä ¤ì4(€ôì4(€½¹ÍÐÉ•°õ”ôùí½¹ÍÐÈõ‰½à¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ð ¤íÉ•ÑÕÉ¸m”¹±¥•¹Ñ`µÈ¹±•™Ð±”¹±¥•¹ÑdµÈ¹Ñ½Átíôì4(4(€‰½à¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Ý¡••°œ±”ôùí”¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤í½¹ÍÐmà±åtõÉ•°¡”¤íé½½µÐ¡à±ä±”¹‘•±Ñ…dðÀüÄ¸ÄÔèÄ¼Ä¸ÄÔ¤íô±íÁ…ÍÍ¥Ù”é™…±Í•ô¤ì4(4(€½¹ÍÐÍÉÕˆõ‰¥¹‘MÉÕˆ¡‰½à±ÍÙœ° ¤ôùÙˆ¤ì4(€½¹ÍÐé½½µ•ô ¤ôùÙ‰lÉtñÙˆÁlÉt´À¸Ôì4(4(€½¹ÍÐÁÑÌõ¹•Ü5…À ¤ì±•ÐÀôÀ±ÜÀôÀ±µ¥õlÀ°Át±±…ÍÐõ¹Õ±°±Ñ…ÀôÀì4(€‰½à¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Á½¥¹Ñ•É‘½Ý¸œ±”ôùì4(€€€‰½à¹Í•ÑA½¥¹Ñ•É…ÁÑÕÉ”¡”¹Á½¥¹Ñ•É%¤ìÁÑÌ¹Í•Ð¡”¹Á½¥¹Ñ•É%±É•°¡”¤¤ì4(€€€¥˜¡ÁÑÌ¹Í¥é”ôôôÈ¥í½¹ÍÐm„±‰tõl¸¸¹ÁÑÌ¹Ù…±Õ•Ì ¥tì4(€€€€€Àõ5…Ñ ¹¡åÁ½Ð¡…lÁtµ‰lÁt±…lÅtµ‰lÅt¤ìÜÀõÙ‰lÉtìµ¥õl¡…lÁt­‰lÁt¤¼È°¡…lÅt­‰lÅt¤¼Étì4(€€€€€¥˜¡ÍÉÕˆ¤ÍÉÕˆ¹¡¥‘” ¤íô€€€€€€€€€€€€€€€€€€€€€¼¼„Í•½¹™¥¹•Èµ•…¹Ìé½½´°¹½ÐÉ•…4(€€€•±Í•ì±…ÍÐõÉ•°¡”¤ì4(€€€€€½¹ÍÐ¹½Üõ…Ñ”¹¹½Ü ¤ì4(€€€€€¥˜¡¹½ÜµÑ…ÀðÌÀÀ¥ìÙˆõl¸¸¹ÙˆÁtì…ÁÁ±ä ¤ìô4(€€€€€Ñ…Àõ¹½Üì4(€€€€€¥˜¡ÍÉÕˆ˜˜…é½½µ• ¤¤ÍÉÕˆ¹Í¡½Ü¡”¹±¥•¹Ñ`¤ìô4(€ô¤ì4(€‰½à¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Á½¥¹Ñ•Éµ½Ù”œ±”ôùì4(€€€¥˜ …ÁÑÌ¹¡…Ì¡”¹Á½¥¹Ñ•É%¤¤É•ÑÕÉ¸ì4(€€€ÁÑÌ¹Í•Ð¡”¹Á½¥¹Ñ•É%±É•°¡”¤¤ì4(€€€¥˜¡ÁÑÌ¹Í¥é”ôôôÈ¥ì4(€€€€€½¹ÍÐm„±‰tõl¸¸¹ÁÑÌ¹Ù…±Õ•Ì ¥tì4(€€€€€½¹ÍÐõ5…Ñ ¹¡åÁ½Ð¡…lÁtµ‰lÁt±…lÅtµ‰lÅt¤ì4(€€€€€¥˜¡À¥ì½¹ÍÐÑ…É•ÐõÜÀ¨¡À½¤°˜õÙ‰lÉt½Ñ…É•Ðìé½½µÐ¡µ¥‘lÁt±µ¥‘lÅt±˜¤ìô4(€€€€€”¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤ì4(€€€õ•±Í”¥˜¡ÁÑÌ¹Í¥é”ôôôÄ€˜˜Ù‰lÉtñÙˆÁlÉt´À¸Ô€˜˜±…ÍÐ¥ì4(€€€€€½¹ÍÐÀõÉ•°¡”¤°Èõ‰½à¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ð ¤ì4(€€€€€Ù‰lÁt´ô¡ÁlÁtµ±…ÍÑlÁt¤½È¹Ý¥‘Ñ ©Ù‰lÉtì4(€€€€€Ù‰lÅt´ô¡ÁlÅtµ±…ÍÑlÅt¤½È¹¡•¥¡Ð©Ù‰lÍtì4(€€€€€±…ÍÐõÀì±…µÀ ¤ì…ÁÁ±ä ¤ì”¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤ì4(€€€õ•±Í”¥˜¡ÁÑÌ¹Í¥é”ôôôÄ€˜˜ÍÉÕˆ¥ì4(€€€€€ÍÉÕˆ¹Í¡½Ü¡”¹±¥•¹Ñ`¤ì”¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤ì€€€¼¼É•…‘¥¹œ°¹½ÐÁ…¹¹¥¹œ4(€€€ô4(€ô¤ì4(€½¹ÍÐÕÀõ”ôùíÁÑÌ¹‘•±•Ñ”¡”¹Á½¥¹Ñ•É%¤ì¥˜¡ÁÑÌ¹Í¥é”ðÈ¥ÀôÀì¥˜ …ÁÑÌ¹Í¥é”¥±…ÍÐõ¹Õ±°ì4(€€€¥˜ …ÁÑÌ¹Í¥é”˜™ÍÉÕˆ¤ÍÉÕˆ¹¡¥‘” ¤íôì4(€‰½à¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Á½¥¹Ñ•ÉÕÀœ±ÕÀ¤ì4(€‰½à¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Á½¥¹Ñ•É…¹•°œ±ÕÀ¤ì4)ô4(4(¼¨€´´´´´´´´´´‰½½Ð€´´´´´´´´´´€¨¼4)½¹ÍÐ5=Q%=9}=,õÑåÁ•½˜µ…Ñ¡5•‘¥„ôôô™Õ¹Ñ¥½¸œ€üµ…Ñ¡5•‘¥„ œ¡ÁÉ•™•ÉÌµÉ•‘Õ•µµ½Ñ¥½¸é¹¼µÁÉ•™•É•¹”¤œ¤¹µ…Ñ¡•Ì€èÑÉÕ”ì4)™Õ¹Ñ¥½¸Á…¥¹Ð ¥ì4(€€¡íÑ½‘…äéÉ•¹‘•ÉQ½‘…ä±±¥™ÐéÉ•¹‘•É1¥™Ð±ÍÑ…ÑÌéÉ•¹‘•ÉMÑ…ÑÌ±¡¥ÍÑ½ÉäéÉ•¹‘•É!¥ÍÑ½Éä±Íå¹ŒéÉ•¹‘•ÉMå¹ô¥mÙ¥•Ýt ¤ì4(€‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½É±° m‘…Ñ„µé½½µtœ¤¹™½É… ¡‰¥¹‘i½½´¤ì4(€‰¥¹‘Aµ¥à ¤ì4(€¥˜¡5=Q%=9}=,¥ìÑÉåìµ½Ñ¥½¹A…ÍÌ ¤ìõ…Ñ ¡}”¥ì€¼¨µ½Ñ¥½¸¥Ì‘•½É…Ñ¥½¸ƒŠP¥Ð¹•Ù•È•ÑÌÑ¼‰É•…¬Ñ¡”…ÁÀ€¨¼ôô4(€Ý¥¹‘½Ü¹ÍÉ½±±Q¼ À°À¤ì4)ô4)±•Ð±…ÍÑY¥•Üõ¹Õ±°ì4)™Õ¹Ñ¥½¸É•¹‘•È ¥ì4(€¥˜¡ÑåÁ•½˜­¥±±…±I•ÑÕÉ¸ôôô™Õ¹Ñ¥½¸œ¤­¥±±…±I•ÑÕÉ¸ ¤ì€€€¼¼ØÌ¸Ì¸ÔäèÑ¡”½¹Ñ•áÑÕ…°Ñ…É•Ð‘¥•ÌÝ¥Ñ …¹äÙ¥•Ü¡…¹”4(€¥˜¡ÑåÁ•½˜Íå¹Q½Á	Ñ¸ôôô™Õ¹Ñ¥½¸œ¤Íå¹Q½Á	Ñ¸ ¤ì€€€€€€€€¼¼ØÌ¸Ì¸ØÔèÑ¡”•¹•É…°ÕÀ‰ÕÑÑ½¸É”µ•Ù…±Õ…Ñ•Ì™½ÈÑ¡”¹•ÜÙ¥•Ü4(€¥˜¡Ù¥•Ü„ôô¡¥ÍÑ½Éäœ˜™ÑåÁ•½˜¡¥ÍÐ„ôôÕ¹‘•™¥¹•œ¥ì¡¥ÍÐ¹•‘¥Ðõ¹Õ±°ì¡¥ÍÐ¹•‘¥ÑM•Ðõ¹Õ±°ìô€€€¼¼ØÌ¸Ì¸ØÄè±•…Ù¥¹œ!¥ÍÑ½Éä±½Í•Ì•‘¥Ðµ½‘”4(€É•¹‘•É!•…‘•È ¤ì4(€€¼¼Ñ…ˆÍÝ¥Ñ¡•ÌÉ½ÍÌµ™…‘”Ù¥„Ñ¡”Y¥•ÜQÉ…¹Í¥Ñ¥½¹ÌA$ì¥¸µÙ¥•ÜÉ”µÉ•¹‘•ÉÌ4(€€¼¼€¡±½¥¹œ„Í•Ð°Ñ½±¥¹œ„Í•ÑÑ¥¹œ¤µÕÍÐ9=P™±…Í °Í¼Ñ¡•äÁ…¥¹Ð‘¥É•Ñ±ä4(€¥˜¡5=Q%=9}=,€˜˜‘½Õµ•¹Ð¹ÍÑ…ÉÑY¥•ÝQÉ…¹Í¥Ñ¥½¸€˜˜±…ÍÑY¥•Ü„ôõ¹Õ±°€˜˜±…ÍÑY¥•Ü„ôõÙ¥•Ü¥ì4(€€€±…ÍÑY¥•ÜõÙ¥•Üì‘½Õµ•¹Ð¹ÍÑ…ÉÑY¥•ÝQÉ…¹Í¥Ñ¥½¸¡Á…¥¹Ð¤ì4(€ô•±Í”ì±…ÍÑY¥•ÜõÙ¥•ÜìÁ…¥¹Ð ¤ìô4)ô4)±•Ð™±½…Ñ%<õ¹Õ±°ì4)™Õ¹Ñ¥½¸µ½Ñ¥½¹A…ÍÌ ¥ì4(€½¹ÍÐØõ‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Ù¥•Üœ¤ì4(€€¼¼€Ô¸ÍÑ…•ÈÑ¡”‰¥œ‰±½­Ì°…ÁÁ•Í¼‘••ÀÁ…•Ì‘½¸Ð™••°Í±½Ü4(€l¸¸¹Ø¹¡¥±‘É•¹t¹™½É…  ¡•°±¤¤ôù•°¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä œ´µ¤œ±5…Ñ ¹µ¥¸¡¤°ä¤¤¤ì4(€€¼¼€Õˆ¸…¹åÑ¡¥¹œ‰•±½ÜÑ¡”™½±™±½…ÑÌÕÀ½¸ÍÉ½±°¥¹ÍÑ•…4(€¥˜ %¹Ñ•ÉÍ•Ñ¥½¹=‰Í•ÉÙ•Èœ¥¸Ý¥¹‘½Ü¥ì4(€€€¥˜¡™±½…Ñ%<¤™±½…Ñ%<¹‘¥Í½¹¹•Ð ¤ì4(€€€™±½…Ñ%<õ¹•Ü%¹Ñ•ÉÍ•Ñ¥½¹=‰Í•ÉÙ•È¡•Ìôùì4(€€€€€™½È¡½¹ÍÐ•¸½˜•Ì¤¥˜¡•¸¹¥Í%¹Ñ•ÉÍ•Ñ¥¹œ¥ì4(€€€€€€€•¸¹Ñ…É•Ð¹±…ÍÍ1¥ÍÐ¹…‘ ™±½…Ðµ¥¸œ¤ì4(€€€€€€€•¸¹Ñ…É•Ð¹±…ÍÍ1¥ÍÐ¹É•µ½Ù” ™±½…ÐµÁÉ”œ¤ì4(€€€€€€€™±½…Ñ%<¹Õ¹½‰Í•ÉÙ”¡•¸¹Ñ…É•Ð¤ì4(€€€€€ô4(€€€ô±íÉ½½Ñ5…É¥¸èœÁÁà€ÁÁà€´Ø”€ÁÁàô¤ì4(€€€Ø¹ÅÕ•ÉåM•±•Ñ½É±° œ¹…É°¹é½¹”°¹­Á¥Ì±Ñ…‰±”°¹¥Ñ•´œ¤¹™½É… ¡•°ôùì4(€€€€€¥˜¡•°¹±½Í•ÍÐ œ¹™±½…ÐµÁÉ”œ¤˜™•°¹±…ÍÍ1¥ÍÐ¹½¹Ñ…¥¹Ì ¥Ñ•´œ¤¤É•ÑÕÉ¸ì€€€¼¼‘½¸Ð‘½Õ‰±”µ™±½…Ð¹•ÍÑ•¥Ñ•µÌ4(€€€€€¥˜¡•°¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ð ¤¹Ñ½Àù¥¹¹•É!•¥¡Ð¥ì4(€€€€€€€•°¹±…ÍÍ1¥ÍÐ¹…‘ ™±½…ÐµÁÉ”œ¤ì4(€€€€€€€™±½…Ñ%<¹½‰Í•ÉÙ”¡•°¤ì4(€€€€€ô4(€€€ô¤ì4(€ô4(€€¼¼€Ù„¸•Ù•Éä¡…ÉÐ±¥¹”ÍÝ••ÁÌ¥¸½¹”4(€Ø¹ÅÕ•ÉåM•±•Ñ½É±° ÍÙœÁ½±å±¥¹”œ¤¹™½É…  ¡Á°±¤¤ôùì4(€€€½¹ÍÐ±•¸õ5…Ñ ¹•¥°¡Á°¹•ÑQ½Ñ…±1•¹Ñ  ¤¤ì4(€€€Á°¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä œ´µ±•¸œ±±•¸¤ìÁ°¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä œ´µ¤œ±¤”Ø¤ì4(€€€Á°¹±…ÍÍ1¥ÍÐ¹…‘ ‘É…Üœ¤ì4(€ô¤ì4(€€¼¼€Ùˆ¸‰…ÉÌÉ½Ü™É½´Ñ¡•¥È‰…Í•±¥¹”€¡Í¥¹±”µÍ•É¥•Ì‰…ÉÌ…É”Ñ…•‰…È¤4(€Ø¹ÅÕ•ÉåM•±•Ñ½É±° ÍÙœÉ•Ð¹‰…Èœ¤¹™½É…  ¡È±¤¤ôùÈ¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä œ´µ¤œ±¤”ÈÀ¤¤ì4(€€¼¼€Ð¸-A$¹Õµ‰•ÉÌ½Õ¹ÐÕÀƒŠP½¹±äÁ±…¥¸¹Õµ‰•ÉÌìÁ…•Ì…¹‘…Ñ•ÌÍÑ…äÁÕÐ4(€¥˜¡ÑåÁ•½˜É•ÅÕ•ÍÑ¹¥µ…Ñ¥½¹É…µ”„ôô™Õ¹Ñ¥½¸œ¤É•ÑÕÉ¸ì4(€Ø¹ÅÕ•ÉåM•±•Ñ½É±° œ¹­Á¤€¹Øœ¤¹™½É… ¡•°ôùì4(€€€½¹ÍÐÉ…Üõ•°¹Ñ•áÑ½¹Ñ•¹Ð¹ÑÉ¥´ ¤°´õÉ…Ü¹µ…Ñ  ½x¡mq±t¬¤¼¤ì4(€€€¥˜ …´¤É•ÑÕÉ¸ì4(€€€½¹ÍÐÑ…É•Ðô­µlÅt¹É•Á±…” ¼°½œ°œœ¤ì¥˜ …Ñ…É•Ð¤É•ÑÕÉ¸ì4(€€€½¹ÍÐÐÀõÁ•É™½Éµ…¹”¹¹½Ü ¤°‘ÕÈôÐÔÀì4(€€€½¹ÍÐÍÑ•Àõ¹½Üôùì4(€€€€€½¹ÍÐÀõ5…Ñ ¹µ¥¸ Ä°¡¹½ÜµÐÀ¤½‘ÕÈ¤°”ôÄµ5…Ñ ¹Á½Ü ÄµÀ°Ì¤ì4(€€€€€•°¹Ñ•áÑ½¹Ñ•¹Ðõ™µÐ¡5…Ñ ¹É½Õ¹¡Ñ…É•Ð©”¤¤ì4(€€€€€¥˜¡ÀðÄ¤É•ÅÕ•ÍÑ¹¥µ…Ñ¥½¹É…µ”¡ÍÑ•À¤ì•±Í”•°¹Ñ•áÑ½¹Ñ•¹ÐõÉ…Üì4(€€€ôì4(€€€É•ÅÕ•ÍÑ¹¥µ…Ñ¥½¹É…µ”¡ÍÑ•À¤ì4(€ô¤ì4)ô4(¡…Íå¹Œ ¤ôùì4(€ÑÉåì¥˜¡ÍÉ••¸¹½É¥•¹Ñ…Ñ¥½¸˜™ÍÉ••¸¹½É¥•¹Ñ…Ñ¥½¸¹±½¬¤ÍÉ••¸¹½É¥•¹Ñ…Ñ¥½¸¹±½¬ Á½ÉÑÉ…¥Ðœ¤¹…Ñ   ¤ôùíô¤ìõ…Ñ ¡”¥íô4(€…Ý…¥Ð±½… ¤ì4(€É•ÍÑ½É•]¡•É” ¤ì4(€‘…¥±å	…­ÕÀ ¤ì€€€€€€€€€€€€€€€€€€€€€¼¼Í¹…ÁÍ¡½ÐAIµµ¥É…Ñ¥½¸ÍÑ…Ñ”™¥ÉÍÐ4(€½¹ÍÐµ¥œõµ¥É…Ñ•XÌ ¤ì4(€Mõ‘•É¥Ù•±° ¤ì}™¥É•¥ÍÐõ¹Õ±°ì€€€€€€€€€€€€€€€€€€¼¼µ¥±•Ì™¥à¹••‘ÌÉÕ¹…åÌ ¤ƒŠH‘•É¥Ù”™¥ÉÍÐ4(€½¹ÍÐµ¤õµ¥É…Ñ•5¥±•Ì ¤ì4(€½¹ÍÐÕ¸õµ¥É…Ñ•U¹¥ÑÌ ¤ì4(€½¹ÍÐ‰Ý´õµ¥É…Ñ•	Ü ¤ì4(€¥˜¡µ¥ññµ¥ññÕ¹ññ‰Ý´¥ìÍ…Ù”¡ÑÉÕ”¤ìô4(€¥˜¡µ¥ññÕ¸¤Mõ‘•É¥Ù•±° ¤ì}™¥É•¥ÍÐõ¹Õ±°ì€€€€€€€€€€€¼¼É”µ‘•É¥Ù”½¸½¹Ù•ÉÑ•¡¥ÍÑ½Éä4(€¥˜¡µ¥ññÕ¸¤Í•ÑQ¥µ•½ÕÐ  ¤ôùÑ½…ÍÐ¡U¹¥ÑÌ½ÉÉ•Ñ•ƒŠPÑÉÕ”Ñ½Ñ…±Ìè€‘í™µÐ¡5…Ñ ¹É½Õ¹¡M¹Ñ½Ñ…±Ì¹­´¤¥ô­´ƒ
Ü€‘í™µÐ¡M¹Ñ½Ñ…±Ì¹Ù½°¥ô­œ±¥™Ñ•‘€¤°äÀÀ¤ì4(€ÍÑ…µÁ1•…å…åÌ ¤ì4(€½¹ÍÐ™¥á•õÉ•Á…¥ÉÕÁ•Ì ¤ì4(€¥˜¡™¥á•¥ìÍ…Ù” ¤ìÑ½…ÍÐ¡I•Á…¥É•€‘í™¥á•‘ô‘ÕÁ±¥…Ñ•Í•Ð‘í™¥á•øÄüÌœèœõ€¤ìô4(€¡•­5¥±•ÍÑ½¹” ¤ì4(€‘•µ½	…ÉMå¹Œ ¤ìµ…å‰•=¹‰½…É ¤ì4(€±…ÍÑM•ÑÐô¡¹‘…åÍmÑ½‘…å%M=t˜™¹‘…åÍmÑ½‘…å%M=t¹±…ÍÑÐ¥ññ¹Õ±°ì4(€…Ý…¥Ð±½…‘M•ÍÍ¥½¸ ¤ì4(€É•¹‘•È ¤ì4(€¥˜¡±½Õ‘I•…‘ä ¤¥ì4(€€€…Ý…¥Ð…ÁÑÕÉ•=ÕÑ  ¤ì€€€€€€€€€€€€€€€€€€€€€€€¼¼™É•Í Í¥¸µ¥¸ÁÕ±±Ì€¡¥¹¥Ñ¥…°Íå¹Œ¤¥¹Í¥‘”4(€€€¥˜¡Í•ÍÍ¥½¸¤±½Õ‘AÕ±° ¤ì€€€€€€€€€€€€€€€€€€€€¼¼•Ù•Éä‘•Ù¥”Íå¹Ì½¸½Á•¸€¡Á•Èµ‘…ä¹•Ý•ÍÐµÝ¥¹Ì¤4(€ô4)ô¤ ¤ì4(