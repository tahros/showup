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
  if(e.target.closest('[data-barpick]')){
    /* v3.3.477: the bar's appearance, stored and resolved like the theme.
       The attribute is data-barPICK, not data-bar: <html> carries data-bar as
       the RESOLVED appearance, so closest('[data-bar]') matched every click in
       the app and swallowed it. The control and the resolved value must not
       share a selector. */
    DB.settings.barTheme=e.target.closest('[data-barpick]').dataset.barpick;
    DB.settingsAt=Date.now(); save(true); applyTheme(); return render();
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
    if(exsInPart.size===1&&!m.donePart.includes(lift.part)) m.donePart.push(lift.part);
    /* v3.3.431: ONLY THE COMPLETE BUTTON ENDS THE DAY. v3.1.15 closed the whole
       workout when a tick sealed the last open exercise -- so logging a single
       Run and marking it done put the day in the book, showed the finished
       card, and hid the button the maker had never pressed. It also fired the
       ceremony from a path he did not initiate, which is why he reported never
       seeing it: it had already been spent by the time he looked.
       Finishing an exercise now means exactly that. The day ends when you say
       it ends. */
    /* v3.3.457: when this tick completes the plan, the toast says so; the
       close itself is the card that renders beneath (dayCloseHTML). */
    save();renderHeader();doneToast(m,planComplete()?`${lift.ex} complete \u2014 that\u2019s the plan.`:`${lift.ex} complete ✓`);
    lift.ex=null;return render();
  }
  if(e.target.closest('#reopenPartBtn')&&lift.part){
    const m=dayMeta(); m.upd=Date.now();
    m.donePart=m.donePart.filter(p=>p!==lift.part);
    m.doneAll=false;                       // a reopened part reopens the workout
    save();renderHeader();toast(`${lift.part} reopened — back at it`);
    return render();
  }
  /* v3.3.457: the part-level Complete handler is gone with its button (lift.js). */
  if(e.target.closest('#doneAllBtn')){
    const m=dayMeta(); m.upd=Date.now();
    m.w.forEach(s=>{ if(!m.doneEx.includes(s.ex)) m.doneEx.push(s.ex);
                     if(!m.donePart.includes(s.part)) m.donePart.push(s.part); });
    m.doneAll=true;
    /* v3.3.490: this is an explicit request for the completion moment. The
       once-a-day stamp prevents automatic interruptions; it must not turn a
       button the person just pressed into a no-op after reopening the day. */
    save();renderHeader();doneToast(m,'',true);
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
    /* v3.3.434: a tab tap is a fresh start, never a return. Taking the Train
       tab deliberately clears any pending return, so back on that screen
       unwinds Train as it always has -- the arrow only leaves the tab when you
       actually arrived from somewhere else. */
    if(view==='lift'){const b=liftBack(); lift=b?{part:b.part,ex:b.ex,weight:0,ret:null}:{part:null,ex:null,weight:0,ret:null};}
    else if(lift) lift.ret=null;
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
    /* v3.3.434: Train Next's Start replaces lift wholesale, so the return has
       to be carried across the assignment rather than set before it. */
    const _ret=view==='lift'?null:view;
    view='lift';lift={part:goP,ex:goEx,weight:0,ret:_ret};
    return render();
  }
  const pt=e.target.closest('[data-part]:not([data-ex])');
  if(pt){lift.part=pt.dataset.part;lift.ex=null;lift.weight=0;lift.enterAnim=true;return render();}   // v3.3.57: the arriving list gets its one entrance
  const ex=e.target.closest('[data-ex]');
  if(ex){
    lift.part=ex.dataset.part||lift.part; lift.ex=ex.dataset.ex;
    lift.ret=view==='lift'?null:view;               // v3.3.434: only a jump from elsewhere returns
    lift.weight=0; lift.editBar=false; lift.copy=false; lift.suggestOpen=null; lift.info=false; lift.editSet=null; lift.editToday=false;
    view='lift';                                   // <- was missing: Today stayed on Today
    return render();
  }
  if(e.target.closest('.back')){
    if(lift.copy){ lift.copy=false; return renderLift(); }
    if(view==='sync'){view=prevView||'today';return render();}
    /* v3.3.434: BACK GOES BACK. The arrow unwound the TRAIN hierarchy -- ex,
       then part, then the tab -- wherever you had come from. Tapping an
       exercise in Today's plan opens it (v3.3.321) and then back dropped you
       on Train's part list, a screen you had never seen. It is one arrow with
       one job: return to the screen that opened this one.
       lift.ret is set by every jump that arrives from OUTSIDE Train, and is
       consumed here, once -- so a second back still unwinds Train normally. */
    if(lift.ex&&lift.ret){ const r=lift.ret; lift.ret=null; lift.ex=null; view=r; return render(); }
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
  if(e.target.closest&&e.target.closest('[data-planpaste]')){
    /* v3.3.445: a fresh open reads the saved plan (there is none: this is the
       empty state's door). */
    planGo('paste'); lift.planMode='day'; lift.planDirty=false; return render();
  }
  /* v3.3.450: the one door from the pencil's preview to the text. It pushes
     the preview on the stack, so Cancel on the box returns to the preview. */
  if(e.target.closest&&e.target.closest('[data-plantext]')){
    planGo('paste'); lift.planMode='day'; return render();   // the draft is already the plan's text (v3.3.448)
  }
  if(e.target.closest&&e.target.closest('[data-planedit]')){
    /* v3.3.448: THE PENCIL OPENS THE PLAN, NOT THE TEXT. Today already shows
       six exercises the app has read; putting the maker back in a text box to
       change one of them was asking him to re-do the app's work. Edit now opens
       the preview -- WHAT THE APP READ -- built from the plan he has, where a
       row can be dropped or moved and the result used. The text is one Cancel
       away (v3.3.447: Cancel on the preview returns to the box with this same
       draft), for the cases where a load or a rep count has to change.
       The rows come from parsing planText(p) -- the raw while it still agrees
       with the items, else text regenerated from them (v3.3.445) -- so the
       writer's reasons survive into the preview when they are still true. */
    const p=planShown();
    if(!p){ planGo('paste'); lift.planMode='day'; lift.planDirty=false; return render(); }
    const txt=planText(p);
    lift.planText=txt; lift.planDirty=true; lift.planMode='day';
    lift.planRows=parsePlan(txt); lift.planWeek=null; lift.planSource='saved'; lift.planReason=null;
    lift.planDate=p.d||writeDateISO();   // the edit writes back to the day it opened, whatever the ledger says by then
    planGo('preview'); return render();
  }
  /* ---- v3.3.400: the session writer's ask screen ---- */
  if(e.target.closest&&e.target.closest('[data-planwrite]')){
    /* v3.3.421: THE DOOR YOU CAME THROUGH SAYS WHAT YOU MEANT. Write from the
       week's header rewrites the week you are looking at: scope week, every
       day of the saved week selected, and rewrite set so the payload carries
       no locked days. Write from a day starts fresh, and widening to the week
       inside the ask screen keeps Codex's v3.3.420 behaviour -- fill only the
       empty days. Same writer, two doors, no toggle. */
    const _pw=e.target.closest('[data-planwrite]');
    if(_pw.dataset.planwrite==='week'&&weekNow()){
      const o=writerState(); o.scope='week'; o.rewrite=true;
      o.days=new Set(Object.keys(weekNow().days).filter(d=>d>=todayISO)); lift.write=o;
    }else lift.write=null;
    planGo('write'); lift.planSource=null; lift.planReason=null; lift.planDate=null; return render();
  }
  if(lift.plan==='writing'){
    if(e.target.closest&&e.target.closest('[data-writecancel]')){ writerCancel(); return; }
    return;   // nothing else on the waiting screen is a control
  }
  if(lift.plan==='write'){
    const o=writerState(); const ta=document.getElementById('writeNote'); if(ta) o.note=ta.value;
    const q=sel=>e.target.closest&&e.target.closest(sel);
    let t;
    /* v3.3.455: these change the ask screen's own state, not which screen you
       are on, so they PATCH the card rather than repainting the view --
       render() here was the flicker. writerPaint falls back to render() if
       the card is somehow not on screen. */
    if((t=q('[data-writescope]'))){ o.scope=t.dataset.writescope; o.err=''; return writerPaint(); }
    if((t=q('[data-writeday]'))){ writerDays(o); const iso=t.dataset.writeday; if(o.days.has(iso)) o.days.delete(iso); else o.days.add(iso); return writerPaint(); }
    if((t=q('[data-writenext]'))){ o.nextWeek=t.dataset.writenext==='1'; o.days=null; return writerPaint(); }
    if((t=q('[data-writefocus]'))){ o.focus=o.focus||new Set(); const p=t.dataset.writefocus; if(o.focus.has(p)) o.focus.delete(p); else o.focus.add(p); return writerPaint(); }
    if((t=q('[data-writefor]'))){ o.part=t.dataset.writefor; return writerPaint(); }
    if((t=q('[data-writeobj]'))){ o.objective=t.dataset.writeobj; DB.settings.objective=o.objective; DB.settingsAt=Date.now(); save(true); return writerPaint(); }
    if(q('[data-writego]')){ writerGo(); return; }
    if(q('[data-writepaste]')){ planGo('paste'); lift.planMode='day'; lift.planText=''; lift.planDirty=false; return render(); }
    if(q('[data-writeback]')){ planBack(); lift.write=null; return render(); }
  }
  /* ---- v3.3.398: the week scope ---- */
  const _ps=e.target.closest&&e.target.closest('[data-planscope]');
  if(_ps){ lift.planScope=_ps.dataset.planscope; return render({inplace:true}); }
  const _wd=e.target.closest&&e.target.closest('[data-weekday]');
  if(_wd){
    /* v3.3.491: NOT A RE-RENDER. This called render() from v3.3.398 until
       now, which is the flicker the maker reported: paint() replaces the
       whole view, motionPass() re-runs the entrance on every card, and
       scrollTo(0,0) jumps you to the top -- all to change one card's height.
       v3.3.452 had already learned this on the day fold; the week is the same
       control and gets the same treatment. The body is always in the DOM
       (lift.js, .planfold), so the fold is a class and the transition is CSS.
       lift.weekOpen stays the single source of truth: the next real render
       draws the same state from it, so nothing can drift. */
    const iso=_wd.dataset.weekday; lift.weekOpen=lift.weekOpen||new Set();
    const open=!lift.weekOpen.has(iso);
    if(open) lift.weekOpen.add(iso); else lift.weekOpen.delete(iso);
    const card=_wd.closest('.daycard'), chev=_wd.querySelector('.pfchev');
    const body=card&&card.querySelector('[data-weekbody]');
    if(card) card.classList.toggle('open',open);
    if(body){ body.classList.toggle('shut',!open); body.toggleAttribute('inert',!open); }
    if(chev) chev.classList.toggle('open',open);
    _wd.setAttribute('aria-expanded',String(open));
    _wd.setAttribute('aria-label',`${open?'Fold':'Open'} ${pretty(iso)}`);
    return;
  }
  /* v3.3.491: the data-weekall handler is gone. v3.3.421 took expand-all off
     the edge and test-week has asserted the control's absence ever since; the
     handler outlived its premise by seventy releases (failure pattern 4). */
  const _pc=e.target.closest&&e.target.closest('[data-plancopy]');
  if(_pc){
    /* v3.3.421: the day copy reads the plan the day scope SHOWS -- tomorrow's
       once today is closed. planNow() is null then and copied nothing. */
    const txt=_pc.dataset.plancopy==='week'?weekToText(weekNow()):planText(planShown());   // v3.3.445: the plan you have, not the raw it came from
    const done=()=>toast('Copied');
    try{ if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done,()=>toast('Could not copy')); else { lift.planText=txt; lift.planDirty=true; planGo('paste'); render(); } }
    catch(_e){ lift.planText=txt; lift.planDirty=true; planGo('paste'); render(); }
    return;
  }
  if(e.target.closest&&e.target.closest('[data-weekedit]')){
    lift.planText=weekToText(weekNow()); planGo('paste'); lift.planMode='week'; return render();
  }
  if(e.target.closest&&e.target.closest('[data-weekclear]')){
    weekClear(); planDone(); lift.planText=''; lift.planScope='today'; lift.weekOpen=null; toast('Week cleared'); return render();
  }
  /* v3.3.443: the tool row over the paste box. Paste reads the clipboard in
     one tap where the browser allows it (iOS asks once, per site); where it
     does not, the box is focused so the system Paste is one hold away, and
     the toast says so instead of failing silently. Select all readies a
     replace: the next paste or keystroke takes the whole text. */
  const _ptool=e.target.closest&&e.target.closest('[data-plantool]');
  if(_ptool){
    const ta=document.getElementById('planText'); if(!ta) return;
    if(_ptool.dataset.plantool==='selectall'){ ta.focus(); ta.select(); return; }
    ta.focus();
    if(navigator.clipboard&&navigator.clipboard.readText){
      navigator.clipboard.readText().then(t=>{
        if(!t){ toast('Clipboard is empty'); return; }
        /* replace a selection, else the whole box: a paste is a plan, not an append */
        ta.value=t; ta.setSelectionRange(t.length,t.length); lift.planText=t; lift.planDirty=true; planBoxGrow();
      },()=>toast('Hold the box and tap Paste'));
    } else toast('Hold the box and tap Paste');
    return;
  }
  if(e.target.closest&&e.target.closest('[data-planback]')){
    /* v3.3.447: CANCEL UNDOES ONE STEP. On the preview it returns to the box
       with the draft intact -- "not this reading" is not "not this text". On
       the box it closes the editor and lets the draft go; opening again reads
       the saved plan (v3.3.445). Two cancels to leave from the preview, each
       undoing exactly what the last step did. */
    /* v3.3.450: Cancel goes to the screen that opened this one -- the stack
       decides, not the button. From the preview that is Today (pencil), the
       box (Read it) or the ask screen (writer). */
    const _leaving=lift.plan;
    planBack();
    if(_leaving==='preview'&&lift.plan!=null){ lift.planRows=null; lift.planWeek=null; lift.planSource=null; lift.planReason=null; }
    return render();
  }
  if(e.target.closest&&e.target.closest('[data-planread]')){
    const ta=document.getElementById('planText');
    const txt=ta?ta.value:'';
    if(!txt.trim()){ toast('Paste a session first'); return; }
    lift.planText=txt;   // the draft is already dirty: every way text gets into the box fires input (v3.3.445)
    /* v3.3.398: a paste with day headings is a week. Read from the week
       scope, or from any paste that names two or more days. */
    const wk=parseWeek(txt);
    if(lift.planMode==='week'||(wk&&Object.keys(wk.days).length>=2)){
      if(!wk){ toast('No day headings found \u2014 e.g. "Tue, Sep 1 \u2014 Back"'); return; }
      lift.planMode='week'; lift.planWeek=wk; lift.planRows=weekRows(wk); planGo('preview'); return render();
    }
    lift.planMode='day'; lift.planRows=parsePlan(txt); planGo('preview'); return render();
  }
  /* v3.3.399: the grip moves a row with the keyboard; the pointer path is
     below, outside the click handler, because a drag is not a click */
  const _pgk=e.target.closest&&e.target.closest('[data-plangrip]');
  if(_pgk){ return; }
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
    /* v3.3.398: a week is accepted day by day from the same rows, so a
       dropped line or a picked candidate in the preview is honoured */
    if(lift.planMode==='week'){
      const wk=weekFromRows(lift.planRows||[], lift.planText||'');
      if(!wk){ toast('Nothing to keep'); return; }
      weekSave(wk); planDone(); lift.planMode='day';
      lift.planScope='week'; lift.weekOpen=null;
      const n=Object.keys(wk.days).length; toast(`Week set \u2014 ${n} day${n===1?'':'s'}`);
      return render();
    }
    const {items,note}=planItemsFrom(lift.planRows||[]);
    if(!items.length&&!note.trim()){ toast('Nothing to keep'); return; }
    /* v3.3.397: stamped with the day the ledger says it is for --
       v3.3.400: unless the writer was asked for a named day (lift.planDate) */
    const _wd=lift.planDate||writeDateISO();
    planSave(items,note,lift.planText||'',_wd);
    lift.planDate=null; lift.planSource=null; lift.planReason=null;
    planDone();
    toast(items.length?`Plan set${_wd===todayISO?'':' for '+planDayLabel(_wd)} — ${items.length} exercise${items.length>1?'s':''}`:'Kept as a note');
    return render();
  }
  if(e.target.closest&&e.target.closest('[data-planfold]')){
    DB.settings.planFold=!DB.settings.planFold; DB.settingsAt=Date.now(); save(true);
    /* v3.3.319 made this render() rather than renderLift(). v3.3.452 makes it
       NEITHER: a full repaint of the view was the flicker the maker saw, and
       it replaced the very element that was meant to be moving. The body is
       always in the DOM now (lift.js, .planfold); the fold is a class and the
       transition is CSS. Toggle the class, turn the chevron, tell the button
       its state -- the next real render draws the same state from the
       setting, so nothing can drift. */
    const shut=!!DB.settings.planFold;
    document.querySelectorAll('[data-planfoldbody]').forEach(el=>{ el.classList.toggle('shut',shut); el.toggleAttribute('inert',shut); });
    document.querySelectorAll('.pfchev').forEach(el=>el.classList.toggle('open',!shut));
    document.querySelectorAll('[data-planfold]').forEach(el=>el.setAttribute('aria-expanded',String(!shut)));
    return;
  }
  if(e.target.closest&&e.target.closest('[data-planclear]')){
    /* v3.3.421: Clear lives inside the editor; clearing also closes it --
       there is nothing left to edit.
       v3.3.472: the edge x clears from Today in one tap, so it holds the plan
       for one undo. The held plan is the whole saved object plus the week's
       block for today if that is what it was, so undo puts back exactly what
       was there. */
    const fromEdge=!!e.target.closest('[data-planclear="edge"]');
    if(fromEdge){ const p=planNow(); lift.planUndo=p?{plan:DB.plan?JSON.parse(JSON.stringify(DB.plan)):null, weekDay:(DB.week&&DB.week.days&&DB.week.days[todayISO])?JSON.parse(JSON.stringify(DB.week.days[todayISO])):null}:null; }
    planClear(); planDone(); lift.planText='';
    if(fromEdge&&lift.planUndo) toastUndo('Plan cleared', ()=>{ const u=lift.planUndo; lift.planUndo=null; if(!u) return;
      if(u.plan){ DB.plan=u.plan; DB.planAt=Date.now(); }
      if(u.weekDay){ DB.week=DB.week||{days:{}}; DB.week.days=DB.week.days||{}; DB.week.days[todayISO]=u.weekDay; }
      save(true); toast('Plan restored'); render(); });
    else toast('Plan cleared');
    return render();
  }
  const _prow=e.target.closest&&e.target.closest('[data-planex]');
  if(_prow){
    const ex=_prow.dataset.planex;
    lift.part=homePartOf(ex)||lift.part; lift.ex=ex; lift.weight=0;
    lift.ret=view;                                 // v3.3.434: back returns to the plan
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
  /* v3.3.473: the daily-runs card's own unit. A setting, so it persists and
     syncs (per-key clock); independent of the weight unit. Patches the card
     in place rather than repainting Stats -- a repaint was the flicker. */
  /* v3.3.476: two controls, one per corner of the card head -- the caption
     switches mi/km, the pill switches distance/pace. Both patch the card in
     place through the same path. */
  if(e.target.closest&&e.target.closest('[data-drunmode]')){
    /* v3.3.481: only the mode switches here now; the unit is the app's */
    if(drunMode()==='dist'&&!drunRows(runUnit(),'pace').length){ toast('No timed runs to show pace yet'); return; }
    DB.settings.runMode=drunMode()==='dist'?'pace':'dist';
    save(true);
    const cur=document.querySelector('.drcard'); const h2=cur&&cur.previousElementSibling;
    if(cur&&h2&&h2.tagName==='H2'){
      const tmp=document.createElement('div'); tmp.innerHTML=dailyRunsSection();
      const nh=tmp.querySelector('h2'),nc=tmp.querySelector('.drcard');
      if(nc){
        const sc=cur.querySelector('.drwrap'),keep=sc?sc.scrollLeft:null;
        cur.replaceWith(nc);
        const ns=nc.querySelector('.drwrap');
        if(ns) ns.scrollLeft=keep==null?ns.scrollWidth:keep;
        bindDrun(false); // v3.3.488: replacement nodes need listeners, without jumping to the newest run.
      }
      if(nh) h2.replaceWith(nh);
    }
    else render();
    return;
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
    view='lift'; lift={part:null,ex:null,weight:0,ret:null};   // the tab's own entry state; no return to inherit
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
    save(true); render({soft:true}); return;   // v3.3.440: the exhale cross-fades instead of cutting
  }
  if(e.target.closest&&e.target.closest('[data-carrytmw]')){
    /* v3.3.437: CARRY MOVES, it does not copy. Two identical plans stamped
       for two days would both wake, and the one you did not train would sit
       in the ledger's forward view as a debt. The guard that offered this
       button already proved DB.plan is today's own and tomorrow is empty;
       re-check here rather than trust the markup, because a stale screen can
       outlive its facts. */
    if(!(DB.plan&&DB.plan.d===todayISO&&(DB.plan.items||[]).length)) return;
    const tmw=tomorrowISO();
    if((DB.week&&DB.week.days&&DB.week.days[tmw])||(DB.plan.d===tmw)) return;
    DB.plan={...DB.plan, d:tmw}; DB.planAt=Date.now();
    save(true); toast('Carried to tomorrow'); render(); return;
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
    DB.settings.barKg=toKg(+($('#barW').value||0))||barDefaultKg();   // v3.3.413: the factory bar follows the unit
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
  /* v3.3.445: the paste box mirrors every keystroke into lift.planText and
     marks the session dirty, so a render between keystrokes rebuilds the
     box with what you typed, not with the saved plan. */
  if(e.target&&e.target.id==='planText'){ lift.planText=e.target.value; lift.planDirty=true; planBoxGrow(); }
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
/* v3.3.474: the daily-runs scroller opens on today, like the heatmap and the
   part-mix strip. Called from paint(), so every render re-anchors it. */
/* v3.3.486: THE SCRUB, SECOND CUT. Two problems with the first: it fought the
   scroll (a chart that scrolls sideways and scrubs sideways cannot do both on
   the same gesture), and its readout was a bubble that hid behind the finger.
   The fix for the first is the one every stock and health app uses -- A DRAG
   SCROLLS, A HOLD SCRUBS. Touch and move at once and the chart scrolls, as it
   always has. Touch and hold for ~250ms without moving and the chart arms: the
   nearest run pops, a guide drops through its column, and from then on the
   finger drives the pick while the scroll stays put (the touchmove listener is
   non-passive so it can preventDefault only while armed). Lift and it
   releases, keeping the pick; tap the same run again to clear.
   The fix for the second is This year vs last's: the numbers go IN THE HEAD.
   The caption gives way to the run's date, its distance and its pace together
   -- both facts, whatever the chart is drawing -- so the finger never covers
   what it is reading. Mouse: press and drag scrubs at once; there is no scroll
   to protect. */
const DRUN_HOLD_MS=250, DRUN_SLOP=8;
function drunScrubAt(box,clientX){
  const svg=box.querySelector('svg'); if(!svg) return null;
  const dots=[...svg.querySelectorAll('circle.drdot')]; if(!dots.length) return null;
  const rect=svg.getBoundingClientRect(); const scale=(+svg.getAttribute('width')||rect.width)/(rect.width||1);
  const x=(clientX-rect.left)*scale;
  let best=null,bd=Infinity; for(const d of dots){ const dx=Math.abs(+d.getAttribute('cx')-x); if(dx<bd){ bd=dx; best=d; } }
  return best;
}
function drunScrubShow(box,dot){
  const svg=box.querySelector('svg'); const card=box.closest('.drcard');
  const head=card&&card.querySelector('[data-drread]'); const cap=card&&card.querySelector('[data-drcap]');
  svg.querySelectorAll('circle.drdot.pick').forEach(c=>c.classList.remove('pick'));
  const g=svg.querySelector('.drguide'); if(g) g.remove();
  if(!dot){ box.classList.remove('scrubbing'); if(head){ head.hidden=true; head.textContent=''; } if(cap) cap.hidden=false; return; }
  box.classList.add('scrubbing'); dot.classList.add('pick');
  /* the guide: a hairline through the picked column, base to top, like This year vs last's cursor */
  const NS='http://www.w3.org/2000/svg'; const line=document.createElementNS(NS,'line');
  line.setAttribute('class','drguide'); line.setAttribute('x1',dot.getAttribute('cx')); line.setAttribute('x2',dot.getAttribute('cx'));
  line.setAttribute('y1',String(PMIX_TOP)); line.setAttribute('y2',String(PMIX_BASE));
  line.setAttribute('stroke','var(--chalk)'); line.setAttribute('stroke-width','0.7'); line.setAttribute('opacity','.45');
  svg.insertBefore(line, dot);
  /* the head: date, distance AND pace -- both facts, whatever the line draws */
  const d=dot.getAttribute('data-d');
  const day=new Date(d+'T00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
  /* v3.3.487: through runUnit(), the card's one source for its unit, so the
     readout can never drift from the axis and the footer beside it. */
  const r=runDays().find(x=>x.d===d); const u=runUnit();
  const dist=r?`${(Math.round(toD(r.km)*100)/100).toFixed(2)} ${u}`:'';
  const pace=(r&&r.timed>0&&r.sec>0)?`${paceStr(r.sec/toD(r.timed))} /${u}`:'';
  if(head){ head.innerHTML=`<b>${day}</b>${dist?` \u00b7 ${dist}`:''} \u00b7 ${pace||'pace not recorded'}`; head.hidden=false; }
  if(cap) cap.hidden=true;
}
function bindDrunScrub(box){
  if(box._scrub) return; box._scrub=true;
  let armed=false, down=false, hold=0, sx=0, sy=0, holdLive=false;   // holdLive: the touch has not moved past the slop
  const at=e=>{ const t=e.touches?e.touches[0]:e; return t?{x:t.clientX,y:t.clientY}:null; };
  const arm=x=>{ armed=true; box.classList.add('armed'); drunScrubShow(box,drunScrubAt(box,x)); };
  /* the hold is a named function the timer calls, so a test can run the real
     one instead of sleeping through it */
  box._drunArm=()=>{ if(down&&!armed&&holdLive) arm(sx); };
  const disarm=()=>{ armed=false; down=false; holdLive=false; clearTimeout(hold); box.classList.remove('armed'); };
  /* touch: a hold arms; movement before the hold is a scroll and cancels it */
  box.addEventListener('touchstart',e=>{ const p=at(e); if(!p) return; down=true; holdLive=true; sx=p.x; sy=p.y; clearTimeout(hold);
    const dot=drunScrubAt(box,p.x);
    if(dot&&dot.classList.contains('pick')){ drunScrubShow(box,null); down=false; return; }   // tap the pick again: clear
    hold=setTimeout(box._drunArm,DRUN_HOLD_MS); },{passive:true});
  box.addEventListener('touchmove',e=>{ const p=at(e); if(!p||!down) return;
    if(armed){ e.preventDefault(); drunScrubShow(box,drunScrubAt(box,p.x)); return; }
    if(Math.abs(p.x-sx)>DRUN_SLOP||Math.abs(p.y-sy)>DRUN_SLOP){ holdLive=false; clearTimeout(hold); }   // it is a scroll: the hold dies
  },{passive:false});
  box.addEventListener('touchend',disarm); box.addEventListener('touchcancel',disarm);
  /* mouse: no scroll to protect, so press-and-drag scrubs at once */
  box.addEventListener('mousedown',e=>{ down=true; const dot=drunScrubAt(box,e.clientX);
    if(dot&&dot.classList.contains('pick')){ drunScrubShow(box,null); down=false; return; } arm(e.clientX); });
  box.addEventListener('mousemove',e=>{ if(down&&armed) drunScrubShow(box,drunScrubAt(box,e.clientX)); });
  box.addEventListener('mouseup',disarm); box.addEventListener('mouseleave',disarm);
}
function bindDrun(resetScroll=true){
  const box=document.getElementById('drWrap'); if(!box) return;
  if(resetScroll&&box.scrollWidth>box.clientWidth) box.scrollLeft=box.scrollWidth;
  bindDrunScrub(box);   // v3.3.486: hold to scrub, drag to scroll
  /* v3.3.475: the axis year follows the LEFT EDGE of the scroller. The year
     lives outside the chart so it holds still, which means something has to
     keep it true as the days move -- the year marks inside carry their year
     in data-yrmark, so the last one scrolled past is the answer. */
  const yr=document.querySelector('.draxis [data-dryr]'); if(!yr) return;
  const svg=box.querySelector('svg'); const marks=[...box.querySelectorAll('[data-yrmark]')];
  const sync=()=>{ const w=+svg.getAttribute('width')||box.scrollWidth;
    const px=box.scrollLeft*(w/box.scrollWidth);
    /* seeded with the ledger's FIRST year, not the first year MARK: a mark
       names the day a year turns, so before the first one the correct answer
       is the year the record started in. */
    let y=yr.getAttribute('data-dryr0')||yr.textContent;
    for(const m of marks){ if(+m.getAttribute('x')<=px+2) y=m.getAttribute('data-yrmark'); else break; }
    if(yr.textContent!==y) yr.textContent=y; };
  box.addEventListener('scroll',sync,{passive:true}); sync();
}
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
/* v3.3.498: WHAT COUNTS AS ARRIVING SOMEWHERE. paint() has scrolled to the top
   and replayed the entrance since the app had one screen, on the premise that
   a render means you got somewhere new. That premise died a long time ago:
   most of the ninety render() calls in this app are the same screen with one
   thing different -- a set logged, a chart's units switched, a row opened for
   edit -- and for those, throwing the page to the top and re-running every
   card's entrance is the flicker the maker reported twice, on two different
   controls, before either of us had a name for it.
   Fixing it per-caller does not scale: ninety judgements, each of which
   somebody has to make again the next time that line moves. So the judgement
   is made ONCE, here, from the state that actually names a screen. `view` is
   the tab. `lift.plan` is the sub-screen inside it -- paste, preview, ask,
   writing -- which is why walking into the plan editor still lands at the top
   even though the tab never changed. `lift.part` and `lift.ex` are the Train
   tab's drill-down, the same reason. `lift.write` is the writer's ask screen.
   When that tuple changes you have ARRIVED: top of the page, entrance runs.
   When it does not, you are standing still and the page behaves like it.
   Deliberately NOT in the key: lift.planScope (v3.3.492 settled that the
   day/week switch happens in place), lift.editToday, hist.edit. Opening a row
   for edit is not going anywhere.
   To revert the whole behaviour, make screenKey() return a fresh value on
   every call -- everything downstream is derived from it. */
function screenKey(){
  const L=(typeof lift!=='undefined'&&lift)||{};
  return [view, L.plan||'', L.part||'', L.ex||'', L.write?'w':''].join('|');
}
let lastScreen=null;
function paint(opts){
  /* v3.3.492: an in-place repaint is the SAME screen with different content.
     Three things distinguish it from arriving somewhere: the scroll stays
     where the reader left it; the entrance rise is suppressed at the moment
     the nodes are created (adding .norise BEFORE the paint, never after --
     a cancelled animation is itself a flash); and motionPass is skipped
     entirely, so charts do not re-sweep and KPI numbers do not re-count for
     a change that happened elsewhere on the page.
     Skipping motionPass fails OPEN in every one of its jobs, which is what
     makes it safe to skip on most renders: a chart with no .draw class simply
     draws, a KPI with no count-up simply reads its number, and a block with no
     float mark is simply visible. Nothing is hidden by omission. */
  const key=screenKey(), arrived=(lastScreen===null||lastScreen!==key);
  lastScreen=key;
  const inplace=!arrived||!!(opts&&opts.inplace);
  const y=inplace?(window.scrollY||window.pageYOffset||0):0;
  const v=document.getElementById('view');
  if(v) v.classList.toggle('norise',inplace);
  ({today:renderToday,lift:renderLift,stats:renderStats,history:renderHistory,sync:renderSync})[view]();
  document.querySelectorAll('[data-zoom]').forEach(bindZoom);
  bindPmix();
  bindHeat();
  bindDrun();
  /* v3.3.496: THE SCROLL LANDS FIRST. motionPass decides which blocks start
     hidden by measuring getBoundingClientRect().top against innerHeight -- and
     it used to do that BEFORE this scrollTo, so every measurement was taken
     against the viewport the reader was about to leave. On any render that ran
     while scrolled down, the set of blocks marked hidden was computed for a
     screen position that no longer existed a line later. Measure where the
     reader will actually be. */
  window.scrollTo(0,y);
  if(MOTION_OK && !inplace){ try{ motionPass(); }catch(_e){ /* motion is decoration — it never gets to break the app */ } }
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
/* v3.3.372: `preview` runs the ceremony WITHOUT touching the ledger -- no
   stamp, no save, a fixed count of 1. It exists so the maker can look at day
   one on his own device, with 953 days behind him, without logging out or
   risking his data. A preview that wrote anything would defeat its purpose. */
/* v3.3.376: two separate things, which the first version conflated into one
   `preview` flag. NOWRITE means the ledger is not touched -- true for day
   one's preview and for replaying a day you already finished. FORCECOUNT is
   only day one's preview, which must read "1" over a 953-day ledger. A replay
   passes nowrite alone and shows the real number, because it is your real
   day. */
// v3.3.489 supersedes the timed handover described above: explicit Done/Share
// controls keep the approved moment on screen. Existing ledger rules remain.
function celebrateDayDone(nowrite, forceCount, forceMile, forceShow){
  if(document.getElementById('dayDone')) return;
  if(!nowrite){
    if(DB.settings.dayDone===todayISO&&!forceShow) return;
    if(DB.settings.dayDone!==todayISO){ DB.settings.dayDone=todayISO; save(); }
  }
  const n=forceCount!=null?forceCount
    :SEED.totals.sessions+((((DB.days[todayISO]||{}).w)||[]).length?1:0);
  /* v3.3.424: THE CENTURY BEAT. Every hundredth day the square OPENS and the
     mark rises out of it -- the app's two symbols becoming one. The square is
     what you did; the chevron is where it goes.
     It is the SAME ceremony, one beat longer. No confetti, no sound, no
     escalation: day 1,000 gets exactly what day 100 gets, because the number
     escalates itself and an app that shouts louder at 1,000 has told you the
     centuries were a warm-up.
     `mile` may be forced for the preview; otherwise the day itself decides. */
  const mile = forceMile!=null ? forceMile : (nowrite?0:centuryDue());
  if(mile&&!nowrite){ DB.settings.century=mile; save(); }
  const o=document.createElement('div');
  o.id='dayDone';
  if(mile) o.classList.add('century');
  /* v3.3.425: THE MARK IS A SIBLING OF THE SQUARE, NOT ITS CHILD. It was
     inside .ddsq, and .ddsq fades and shrinks as it hands over -- opacity on a
     parent applies to its children, so the white mark faded with it and
     rendered grey on the maker's screen. A stage holds both, each animating
     on its own: the square can recede while the mark stays pure white. */
  const closed=!!(DB.days[todayISO]||{}).doneAll;
  const rows=(DB.days[todayISO]||{}).w||[];
  const km=rows.filter(s=>s.part==='Run').reduce((sum,s)=>sum+(Number(s.w)||0),0);
  const count=mile||n;
  const date=new Date(todayISO+'T00:00');
  const dateLabel=date.toLocaleDateString('en-US',{weekday:'long'})+' · '+date.toLocaleDateString('en-US',{month:'long',day:'numeric'});
  const summary=forceCount!=null?'':`${rows.length} set${rows.length===1?'':'s'}${km>0?` · ${dDisp(km)} ${DU()}`:''} · ${closed?'Today, complete.':'You’re here.'}`;
  const previousFocus=document.activeElement;
  o.setAttribute('role','dialog');
  o.setAttribute('aria-modal','true');
  o.setAttribute('aria-labelledby','ddHeading');
  o.innerHTML=`<div class="ddinner"><div class="dddate">${dateLabel}</div><div class="ddbody">`+(mile
    ? `<span class="ddstage"><i class="ddsq" aria-hidden="true"></i><span class="ddmk" aria-hidden="true">${icon('brandmark',44)}</span></span>`
    : `<i class="ddsq" aria-hidden="true"></i>`)+
    `<b class="ddn${count>=1000?' ddlarge':''}">${fmt(count)}</b><span class="ddu">${count===1?'day':'days'} of showing up</span>`+
    `<h2 class="ddyou" id="ddHeading">You showed up.</h2>`+
    `<div class="ddsummary">${summary}</div></div>`+
    /* v3.3.502: the camera hangs off the ceremony, because this is the one
       moment the app knows the day is finished and you are still holding the
       phone. A file input with capture= opens the native camera directly --
       no getUserMedia, so no permission dance to manage, no standalone-PWA
       camera quirks, and front/rear is the OS's own picker. It is also the
       idiom settings.js already uses for import.
       The input is a sibling of the buttons rather than wrapped in a label,
       so the ceremony's focus handling and its Escape/Done path are unchanged.
       Photo sits under Share, quieter than Done: the day is already saved by
       the time you see this screen, and the picture is optional. */
    `<div class="ddactions"><button class="btn done" data-dd="done">Done</button>`+
    `<button class="ddshare" data-dd="share">Share this day</button>`+
    `<button class="ddshare" data-dd="photo">Add a photo</button>`+
    `<input type="file" accept="image/*" capture="environment" id="ddPhoto" hidden></div></div>`;
  document.body.appendChild(o);
  o.querySelector('[data-dd="done"]').focus({preventScroll:true});
  let leaving=false;
  const leave=(share=false)=>{
    if(leaving) return;
    leaving=true;
    o.remove();
    if(closed && forceCount==null){ view='today'; render(); }
    const target=previousFocus?.isConnected?previousFocus:document.querySelector('[data-replayday],nav button.on');
    if(target) target.focus({preventScroll:true});
    if(share) toCard();
  };
  /* v3.3.377: the ceremony hands over to THE DAY'S OWN CARD -- the same image
     the History share button produces, revealed rather than re-drawn.
     The square and the count keep their beat first: that is the thesis, and
     it should not lose its moment to a summary. Then the card wipes in
     beneath, and the overlay STOPS, because a card with actions has to wait
     for you. That costs one tap a day, at the end of an hour in the gym.
     WHAT YOU WATCH APPEAR IS WHAT YOU SHARE. The canvas is painted once by
     drawDayCard and handed to the existing share overlay, which already puts
     that same canvas in the <img> and sends that same canvas to
     navigator.share. An animation with a rendering of its own would be the
     shown-vs-shipped divergence this project keeps paying for.
     NOTHING IS TRUNCATED: drawDayCard computes its height from the content
     and grows the canvas to fit (cv.height=H), so a 22-set day is drawn
     whole. A ceremony that celebrated a cropped record would be worse than
     none.
     In preview or replay (nowrite) the handover still happens -- it is the
     same day, and looking at it again should show the same thing. */
  const toCard=()=>{
      if(typeof showCard!=='function'||typeof drawDayCard!=='function') return;
      showCard(()=>{
        const cv=document.createElement('canvas'); cv.width=cv.height=1080;
        const cx=cv.getContext('2d'); if(!cx) return null;
        drawDayCard(cx,1080,todayISO); return cv;
      },'showup-'+todayISO,false,true);
  };
  /* v3.3.502: the photo card. Same rule as the receipt above -- WHAT YOU
     WATCH APPEAR IS WHAT YOU SHARE: one canvas, painted by drawPhotoCard,
     handed to the same overlay that already puts a canvas in the <img> and
     the same canvas into navigator.share. The photo itself is read, drawn and
     dropped; nothing is written to the record. */
  /* v3.3.503: the card's stat columns. The first cut handed the photo card the
     same one-line summary the ceremony prints -- "24 sets · 2.54 mi · Today,
     complete." -- which reads fine as a caption under a card you are already
     looking at and vanishes on a photograph. These are the same facts as
     labelled values instead, in the app's own units, and only the ones this
     day actually has: a lifting day has no distance, a run has no volume, and
     an empty column is worse than a missing one. Three is the maximum the
     width takes honestly. */
  /* v3.3.504: THE SESSION, NOT A SUMMARY OF IT. Overlaying text on a photo has
     a hard ceiling -- about one headline and three values -- which is why every
     card of this kind looks the same. The maker's differentiator is 24 sets
     across seven exercises, and an overlay will never carry that; every attempt
     is a compromise where the photo and the record both lose.
     So the record stops competing with the photo and gets its own ground: the
     picture takes the top 65%, a real panel takes the bottom 35%, and the
     session is drawn there in the app's own type on the app's own surface. It
     is still a photo card. The bottom third is a receipt instead of a caption.
     ONE LINE PER EXERCISE is the floor and the ceiling. A 1080px card lands
     about 400px wide in a feed, so 26px type reads at ~10px on the viewer's
     phone -- legible if you look, texture if you do not. Anything more granular
     is decoration paid for in legibility.
     The reps carry it, not the weights: "8 8 5 4" says you failed down, and
     anyone who lifts reads that instantly. That shape is the thing no
     distance-and-pace card can show. */
  const photoSession=()=>{
    const order=[], byEx={};
    rows.forEach(r=>{ const k=r.ex; if(!byEx[k]){ byEx[k]={ex:k,part:r.part,g:[]}; order.push(k); } byEx[k].g.push(r); });
    const lines=order.map(k=>{
      const e=byEx[k];
      if(e.part==='Run'){
        const km=e.g.reduce((t,r)=>t+(Number(r.w)||0),0);
        const mins=e.g.reduce((t,r)=>t+(Number(r.mins)||0),0);
        return {name:e.ex, value:`${dDisp(km)} ${DU()}${mins?` · ${mins}'`:''}`,
                sets:e.g.length, top:''};
      }
      /* every weight the exercise was worked at, in logged order. If that
         string will not fit the panel the card falls back to sets + top
         weight, which is a smaller truth rather than a squeezed one. */
      const full=e.g.map(r=>`${wLabel(e.ex,Number(r.w)||0)} × ${(r.reps||[]).join(' ')}`).join('  ·  ');
      const nsets=e.g.reduce((t,r)=>t+((r.reps||[]).length||1),0);
      const heavy=e.g.reduce((a,r)=>(Number(r.w)||0)>(Number(a.w)||0)?r:a,e.g[0]);
      return {name:e.ex, value:full, sets:nsets,
              short:`${nsets} sets · ${wLabel(e.ex,Number(heavy.w)||0)} ${U()}`};
    });
    const lifts=rows.filter(r=>r.part!=='Run');
    const vol=lifts.reduce((t,r)=>t+(Number(r.w)||0)*((r.reps||[]).reduce((a,b)=>a+(Number(b)||0),0)),0);
    const sets=rows.reduce((t,r)=>t+((r.reps||[]).length||1),0);
    const parts=[...new Set(rows.map(r=>r.part))].join(' · ');
    const tot=[];
    if(vol>0) tot.push(`${fmt(Math.round(toU(vol)))} ${U()}`);
    if(km>0) tot.push(`${dDisp(km)} ${DU()}`);
    return {lines, parts, totals:tot.join(' · '), sets};
  };
  const photoCard=async(file)=>{
    let img;
    try{ img=await loadPickedImage(file); }
    catch(e){ toast('Could not read that photo'); return; }
    leave();
    if(typeof showCard!=='function'||typeof drawPhotoCard!=='function') return;
    showCard(()=>drawPhotoCard(img,count,dateLabel,photoSession()),
             'showup-'+todayISO+'-photo',false,true);
  };
  const picker=o.querySelector('#ddPhoto');
  if(picker) picker.addEventListener('change',ev=>{
    const f=ev.target.files&&ev.target.files[0];
    /* clear the input either way: without this, picking the SAME photo twice
       in a row fires no change event and the second tap does nothing */
    ev.target.value='';
    if(f) photoCard(f);      /* cancelled at the camera -> the ceremony stays */
  });
  // v3.3.489: the moment waits for an explicit choice, never an automatic share.
  o.addEventListener('click',e=>{
    const action=e.target.closest('[data-dd]');
    if(!action) return;
    /* v3.3.502: photo does NOT leave -- the camera opens over the ceremony and
       you may back out of it, in which case the moment must still be here */
    if(action.dataset.dd==='photo'){ if(picker) picker.click(); return; }
    leave(action.dataset.dd==='share');
  });
  o.addEventListener('keydown',e=>{
    if(e.key==='Escape'){ e.preventDefault(); leave(); }
    if(e.key==='Tab'){
      const buttons=[...o.querySelectorAll('button')];
      const at=buttons.indexOf(document.activeElement);
      e.preventDefault(); buttons[(at+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();
    }
  });
}
const doneToast=(m,alt,explicit)=>{
  if(m.doneAll){ celebrateDayDone(false,null,null,!!explicit); }
  else toast(alt);
};
function syncNav(){
  scheduleNavLayoutCheck();
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===view));
  /* v3.3.461: Today's square in the bar shows the day's STATE -- hollow while
     open, filled once closed (doneAll). Every render passes through here, and
     every doneAll flip renders, so the square cannot lag the ledger. */
  const nav=document.getElementById('nav');
  if(nav){ nav.classList.toggle('dayclosed', !!(DB.days&&DB.days[todayISO]&&DB.days[todayISO].doneAll));
    nav.classList.toggle('resting', restingToday()); }   // v3.3.468: Today's square is a green ring while resting
}
function render(opts){
  syncNav();
  if(typeof killCalReturn==='function') killCalReturn();   // v3.3.59: the contextual target dies with any view change
  if(typeof syncTopBtn==='function') syncTopBtn();        // v3.3.65: the general up button re-evaluates for the new view
  if(view!=='history'&&typeof hist!=='undefined'){ hist.edit=null; hist.editSet=null; }   // v3.3.61: leaving History closes edit mode
  /* tab switches cross-fade via the View Transitions API; in-view re-renders
     (logging a set, toggling a setting) must NOT flash, so they paint directly.
     v3.3.440: EXCEPT when the caller says the whole screen is changing state.
     Declaring rest rewrites the header, the greeting, the plan card and the
     rail at once; painting that directly is a hard cut the eye reads as a
     blink -- the old screen vanishes for a frame and a different one lands.
     `render({soft:true})` asks for the same cross-fade a tab switch gets, and
     brings the header INTO the transition so the wash, the square and the
     view arrive as one motion rather than header-then-body. */
  const soft=!!(opts&&opts.soft);
  /* v3.3.492: IN PLACE. Switching the plan scope (today <-> week) genuinely
     changes the content, so unlike the fold it cannot be a class toggle --
     there is new HTML either way. What it must NOT do is behave like arriving
     at a new screen. A plain render() re-ran the entrance rise on every card
     and called scrollTo(0,0), so a tap on a pill halfway down the page threw
     the screen away and rebuilt it at the top: the flicker the maker reported
     a second time, on a second control, from the same root cause.
     `render({inplace:true})` keeps the scroll position, skips the entrance
     motion, and cross-fades the swap through the View Transitions API -- so
     the content changes where it stands instead of the page re-arriving. */
  const inplace=!!(opts&&opts.inplace);
  /* v3.3.499: AND IT DOES NOT CROSS-FADE. v3.3.492 added the View Transition
     to the in-place path on the reasoning that a cross-fade would soften the
     swap. It does the opposite, and the maker can still see it after both the
     scroll fix and the screen-key sweep landed.
     A view transition snapshots the WHOLE PAGE, swaps the DOM, snapshots it
     again, and animates between the two. Identical pixels blend away under
     plus-lighter, so on a tab switch that reads as one clean motion. But the
     day scope and the week scope are different HEIGHTS -- a single day card
     against a stack of five -- so ::view-transition-group(root) animates the
     root's SIZE while its old and new images cross-fade over each other. The
     page visibly changes shape and doubles for the length of the animation.
     That is the flicker, and it is the last thing in this path that moves the
     whole page for a change to one section.
     So an in-place repaint takes the direct route: same scroll, no entrance,
     no page-level animation. The swap is a single frame. Tab switches and the
     v3.3.440 soft render keep their cross-fade, where the page really is
     becoming a different page and both snapshots are the same size.
     This touches nothing outside render(): the nav and the header are not
     read, written or measured here, and neither is anything fixed. */
  const both=()=>{ renderHeader(); paint({inplace}); };
  if(MOTION_OK && document.startViewTransition && ((lastView!==null && lastView!==view) || soft)){
    lastView=view; document.startViewTransition(both);
  } else { lastView=view; both(); }
}
let floatIO=null;
/* v3.3.496: THE GUARANTEE. Any block that is hidden-pending-reveal but is
   actually within the viewport gets revealed, whatever the observer did or
   did not do. Called after every motionPass and on every scroll tick, so a
   block cannot stay invisible on a screen the reader is looking at. Blocks
   genuinely below the fold keep their float, which is the whole point of the
   effect; only stranding is removed. */
function floatSweep(){
  const v=document.getElementById('view'); if(!v) return;
  v.querySelectorAll('.float-pre').forEach(el=>{
    if(el.getBoundingClientRect().top<=innerHeight){
      el.classList.add('float-in');
      el.classList.remove('float-pre');
      if(floatIO){ try{ floatIO.unobserve(el); }catch(_e){} }
    }
  });
}
function motionPass(){
  const v=document.getElementById('view');
  // 5. stagger the big blocks, capped so deep pages don't feel slow
  [...v.children].forEach((el,i)=>el.style.setProperty('--i',Math.min(i,9)));
  // 5b. anything below the fold floats up on scroll instead
  /* v3.3.496: FLOAT-PRE IS opacity:0, SO IT MUST NEVER BE A RESTING STATE.
     A block below the fold starts hidden and is revealed by an
     IntersectionObserver when it scrolls in. If that reveal never arrives the
     block is invisible FOREVER with its space still reserved -- which is
     exactly what the maker photographed: section headings present, their
     cards gone, the gap where the cards should be still there. h2 is not in
     the observed selector list, which is why the headings survived and told
     us where to look.
     Three ways the reveal could fail to arrive, all of them live in this
     function as it stood:
       1. Marks were computed BEFORE paint's scrollTo (fixed above), so they
          described a viewport the reader had already left.
       2. Every paint disconnects floatIO and builds a new one, then observes
          only what is below the fold NOW. Anything still carrying float-pre
          that is no longer below the fold was neither observed nor cleared.
          Nothing else in the app ever removes the class.
       3. A target with no height at observe time -- inside a collapsed fold,
          a closed <details> -- may never report isIntersecting at all.
     Rather than pick one, the mechanism is made unable to strand anything:
     stale marks are cleared before new ones are made, and floatSweep() below
     reveals anything hidden that is actually on screen. The observer is now
     an optimisation, not the only way out. */
  v.querySelectorAll('.float-pre').forEach(el=>el.classList.remove('float-pre'));
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
    floatSweep();
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

/* ============ v3.3.399: dragging a row of the read-back ============
   pointerdown on a grip lifts its row; while the pointer moves, the row is
   re-inserted before or after whichever row the pointer is over; pointerup
   reads the DOM order back into lift.planRows (planApplyOrder) and rewrites
   the raw text in that order. jsdom has no layout, so the suite drives
   planMoveRow and planApplyOrder directly and the keyboard path through
   real key events; the pointer path is exercised on a device. */
(function(){
  let drag=null;
  document.addEventListener('pointerdown',e=>{
    const g=e.target.closest&&e.target.closest('[data-plangrip]'); if(!g) return;
    const row=g.closest('.planpv'); if(!row) return;
    drag={row, id:e.pointerId}; row.classList.add('lifting');
    try{ g.setPointerCapture(e.pointerId); }catch(_e){}
    e.preventDefault();
  });
  document.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id) return;
    const rows=[...document.querySelectorAll('.planpv')].filter(r=>r!==drag.row);
    for(const r of rows){
      const b=r.getBoundingClientRect(); if(e.clientY<b.top||e.clientY>b.bottom) continue;
      const before=e.clientY<b.top+b.height/2;
      if(before&&r.previousElementSibling!==drag.row) r.parentNode.insertBefore(drag.row,r);
      else if(!before&&r.nextElementSibling!==drag.row) r.parentNode.insertBefore(drag.row,r.nextElementSibling);
      break;
    }
  });
  const end=e=>{
    if(!drag||e.pointerId!==drag.id) return;
    drag.row.classList.remove('lifting');
    const order=[...document.querySelectorAll('.planpv[data-planrow]')].map(el=>+el.dataset.planrow);
    drag=null; planApplyOrder(order); render();
  };
  document.addEventListener('pointerup',end); document.addEventListener('pointercancel',end);
  document.addEventListener('keydown',e=>{
    const g=e.target.closest&&e.target.closest('[data-plangrip]'); if(!g) return;
    const dir=e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0; if(!dir) return;
    e.preventDefault(); const i=+g.dataset.plangrip;
    const to=planMoveRow(i,dir); if(to===false) return;
    render();
    const g2=document.querySelector(`[data-plangrip="${to}"]`); if(g2) g2.focus();   // focus follows the row
  });
})();
