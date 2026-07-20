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
  if(e.target.closest('#themeBtn')){
    DB.settings.theme=DB.settings.theme==='light'?'dark':'light';
    applyTheme();save(true);
    if(view==='sync') render();
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
  if(e.target.id==='editSave'&&lift.editSet!=null){
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
  if(e.target.id==='editCancel'){ lift.editSet=null; return renderLift(); }
  if(e.target.id==='doneExBtn'&&lift.ex){
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
  if(e.target.id==='reopenPartBtn'&&lift.part){
    const m=dayMeta(); m.upd=Date.now();
    m.donePart=m.donePart.filter(p=>p!==lift.part);
    m.doneAll=false;                       // a reopened part reopens the workout
    save();renderHeader();toast(`${lift.part} reopened — back at it`);
    return render();
  }
  if(e.target.id==='donePartBtn'&&lift.part){
    const m=dayMeta(); m.upd=Date.now();
    m.w.filter(s=>s.part===lift.part).forEach(s=>{ if(!m.doneEx.includes(s.ex)) m.doneEx.push(s.ex); });
    if(!m.donePart.includes(lift.part)) m.donePart.push(lift.part);
    if([...new Set(m.w.map(s=>s.part))].every(p=>m.donePart.includes(p))) m.doneAll=true;
    save();renderHeader();
    toast(m.doneAll?`Workout complete — ${m.w.length} sets. Cool down 🔥`:`${lift.part} complete ✓`);return render();
  }
  if(e.target.id==='doneAllBtn'){
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
  const jump=e.target.closest('[data-jump]');
  if(jump){const el=document.getElementById(jump.dataset.jump);
    if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); return;}
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
    view='lift';lift={part:go.dataset.go,ex:null,weight:0};
    document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v==='lift'));
    return render();
  }
  const pt=e.target.closest('[data-part]:not([data-ex])');
  if(pt){lift.part=pt.dataset.part;lift.ex=null;lift.weight=0;return render();}
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
    lift.justSaved=true;save();renderHeader();return renderLift();
  }
  if(e.target.id==='addrep'){
    const r=Math.round(+($('#rc').value||0));
    if(!r||r<1) return toast('Enter a rep count');
    lift.weight=toKg(+($('#wv').value||0));
    saveExW(lift.ex,lift.weight);
    t.w.push({part:lift.part,ex:lift.ex,w:lift.weight,reps:[r],at:Date.now()});
    reopen(lift.ex,lift.part);
    lift.justSaved=true;save();renderHeader();return renderLift();
  }
  const rs=e.target.closest('[data-rep-w]');
  if(rs){
    const w=+rs.dataset.repW, r=+rs.dataset.repR;
    t.w.push({part:lift.part,ex:lift.ex,w,reps:[r],at:Date.now()});
    reopen(lift.ex,lift.part);
    lift.weight=w;
    saveExW(lift.ex,w);
    lift.justSaved=true;save();renderHeader();toast(`${wDisp(w)}${U()} × ${r} logged`);return renderLift();
  }
  if(e.target.id==='addEx'){ lift.adding=true; return renderLift(); }
  if(e.target.id==='cancelEx'){ lift.adding=false; return renderLift(); }
  const ne=e.target.closest('[data-newequip]');
  if(ne){ lift.newEquip=ne.dataset.newequip; return renderLift(); }
  if(e.target.id==='saveEx'){
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
  if(e.target.id==='infoBtn'){ lift.info=!lift.info; return renderLift(); }
  if(e.target.closest('#toggleSuggest')){
    const cur = lift.suggestOpen==null ? day(todayISO).w.some(s=>s.ex===lift.ex)===false : lift.suggestOpen;
    lift.suggestOpen=!cur; return renderLift();
  }
  if(e.target.id==='copySets'){
    const ls2=suggestedFor(lift.ex);
    lift.copy={mode:'suggestion', sets:ls2?[...ls2.sets]:[], d:ls2?.d||null};
    return renderLift();
  }
  if(e.target.id==='moveToday'){
    touchToday();
    lift.copy={mode:'today',
      sets:t.w.filter(s=>s.ex===lift.ex).flatMap(s=>s.reps.map(r=>({w:s.w,r}))), d:null};
    return renderLift();
  }
  if(e.target.closest('[data-cancelcopy]')){ lift.copy=false; return renderLift(); }
  if(e.target.id==='undoBtn') return undo();
  const dx=e.target.closest('[data-dropex]');
  if(dx){
    const ex2=dx.dataset.dropex;
    const n=t.w.filter(s=>s.ex===ex2).length;
    snapshot(`removed ${n} ${ex2} set${n>1?'s':''}`);
    DB.days[todayISO].w=t.w.filter(s=>s.ex!==ex2);
    reanchorRest();
    save();renderHeader();toast(`${ex2} removed from today`);return renderLift();
  }
  if(e.target.id==='clearToday'){
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
    if(!t.w.length){ t.doneAll=false; t.doneEx=[]; t.donePart=[]; }
    else if(!t.w.some(s2=>!((t.doneEx||[]).includes(s2.ex)||(t.donePart||[]).includes(s2.part)))) t.doneAll=true;
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
  if(e.target.id==='repeatAll'){
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
  if(e.target.id==='addrun'){
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
    if(!t.w.length){ t.doneAll=false; t.doneEx=[]; t.donePart=[]; }
    else if(!t.w.some(s2=>!((t.doneEx||[]).includes(s2.ex)||(t.donePart||[]).includes(s2.part)))) t.doneAll=true;
    reanchorRest();
    save();renderHeader();return renderLift();
  }
  if(e.target.id==='googleBtn') return signInGoogle();
  if(e.target.id==='signOutBtn') return signOut();
  if(e.target.id==='cloudPullBtn') return cloudPull();
  if(e.target.id==='cloudTest'){
    DB.settings.cloud={url:$('#cloudUrl').value, anon:$('#cloudAnon').value};
    save(true);
    return cloudTest();
  }
  if(e.target.id==='cloudSave'){
    DB.settings.cloud={url:$('#cloudUrl').value, anon:$('#cloudAnon').value};
    save(true);
    toast(cloudReady()?'Using '+cloudCfg().url:'Both fields are needed');
    return renderSync();
  }
  if(e.target.id==='barSave'){
    DB.settings.barKg=toKg(+($('#barW').value||0))||20;
    DB.settings.smithKg=toKg(+($('#smithW').value||0));
    const bw=+($('#bodyW').value||0);
    DB.settings.bodyKg=bw>0?toKg(bw):null;
    save(true);return toast('Weights saved');
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
  const ll=$('#ll'); if(!ll||!lift.ex) return;
  const kg=toKg(+($('#wv').value||0));
  ll.innerHTML = usesPlates(lift.ex)
    ? loadInner(lift.ex,kg)
    : `<span class="ll-text">${loadLine(lift.ex,kg)}</span>`;
}

/* ---------- pinch / wheel zoom for charts ---------- */
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

  const pts=new Map(); let d0=0,w0=0,mid=[0,0],last=null,tap=0;
  box.addEventListener('pointerdown',e=>{
    box.setPointerCapture(e.pointerId); pts.set(e.pointerId,rel(e));
    if(pts.size===2){const [a,b]=[...pts.values()];
      d0=Math.hypot(a[0]-b[0],a[1]-b[1]); w0=vb[2]; mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];}
    else{ last=rel(e);
      const now=Date.now();
      if(now-tap<300){ vb=[...vb0]; apply(); }
      tap=now; }
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
    }
  });
  const up=e=>{pts.delete(e.pointerId); if(pts.size<2)d0=0; if(!pts.size)last=null;};
  box.addEventListener('pointerup',up);
  box.addEventListener('pointercancel',up);
}

/* ---------- boot ---------- */
const MOTION_OK=typeof matchMedia==='function' ? matchMedia('(prefers-reduced-motion:no-preference)').matches : true;
function paint(){
  ({today:renderToday,lift:renderLift,stats:renderStats,history:renderHistory,sync:renderSync})[view]();
  document.querySelectorAll('[data-zoom]').forEach(bindZoom);
  if(MOTION_OK){ try{ motionPass(); }catch(_e){ /* motion is decoration — it never gets to break the app */ } }
  window.scrollTo(0,0);
}
let lastView=null;
function render(){
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
  if(mig||mi||un){ save(true); }
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
