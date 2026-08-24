/* ShowUp — lift.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
let _lastLiftPart='\u0000';   // v3.3.64: sentinel — first render always counts as a change
function renderLift(){
  /* v3.3.64: the entrance fires when the LIST YOU'RE LOOKING AT CHANGES —
     not only on a part tap. Opening the app in the morning restores the part
     from saved state with no tap at all, which is exactly the moment the
     invitation matters and exactly the moment v3.3.57 stayed still.
     Comparing against the last rendered part covers tap, boot, and back-
     navigation, while logging a set (same part) still never re-bounces. */
  const _enter = lift.enterAnim || _lastLiftPart!==lift.part;
  lift.enterAnim=false; _lastLiftPart=lift.part;
  let _ei=0;
  const P=trainingPlan();
  const t=day(todayISO);

  if(!lift.ex){
    // parts in the same order as Today: recommended pick, rotation by readiness, Run, add-ons, then dormant
    const order=[...P.mains];
    if(P.info['Run']) order.push('Run');
    order.push(...P.addons);
    const dormant=P.dormant.filter(p=>!order.includes(p));
    if(!lift.part && isLive()){
      // red mode: focus follows the work — land on the part of your latest OPEN set
      const lastOpen=[...t.w].reverse().find(s=>partOpen(s.part));
      if(lastOpen) lift.part=lastOpen.part;
    }
    if(!lift.part||!SEED.catalog[lift.part]) lift.part=P.pick||order[0];

    /* v3.3.278: today's plan, if there is one, leads the tab — it is the
       thing you came to read. It is a NOTE: no completion state, no count of
       what is left, nothing that could be failed. Just what you brought. */
    let h='';
    /* renderLift COMMITS its own html rather than returning it — an early
       `return planScreenHTML()` silently rendered nothing. Write and stop. */
    if(lift.plan==='paste'||lift.plan==='preview'){ $('#view').innerHTML=planScreenHTML(); return; }
    const _pl=planNow();
    if(_pl){
      h+=`<h2><b class="scopepill">today</b> plan${hActs('plan',"Paste a session and the app reads what it can. It fills weights and reps for today only, is never written to your record, and clears at midnight. Nothing is counted against it.",'About today\u2019s plan')}</h2>
        <div class="card plancard">
          ${(_pl.items||[]).map(i=>`<button class="planrow" data-planex="${i.ex}">
              <span class="pn">${i.ex}</span>
              <span class="pv mono">${i.w>0?wDisp(i.w)+' '+U():'BW'}${i.reps.length?' \u00d7 '+i.reps.join(' '):''}</span>
            </button>`).join('')}
          ${_pl.note?`<div class="plannote mono">${hesc(_pl.note)}</div>`:''}
          <div class="planacts">
            <button class="btn ghost" data-planedit>Edit</button>
            <button class="btn ghost" data-planclear>Clear</button>
          </div>
        </div>`;
    }else{
      h+=`<button class="btn ghost planpaste" data-planpaste>Paste today\u2019s plan</button>`;
    }
    h+=`<h2>Body part</h2><div class="partgrid">`;
    [...order,...dormant].forEach(p=>{
      const i0=P.info[p]||{since:999};
      const virgin=SEED.totals.sessions===0&&!hasAnyDays();   // day zero: no verdicts yet
      /* v3.3.269: a chip says how long it has been, because that is what the
         ledger knows. It used to read `dormant` for any part in P.dormant —
         but that list is !live, and live is days>=8: a DATA-SUFFICIENCY test
         ("do I know this part's rhythm well enough to name a cadence"), never
         a recency test. So a part trained two days ago but only three times
         read "dormant" while a part last touched forty days ago read "40d
         ago". The labels were inverted against the words. The planner keeps
         that flag — it is the right bar for a cadence claim and for ranking
         suggestions — and the chip now speaks from the dates instead. */
      const never=!i0.last;
      /* Run is never cold and never grey — it rides along with every session
         rather than waiting its turn in the rotation, which is why the
         planner excludes it from `dormant` too. */
      const dead=!virgin&&p!=='Run'&&(never||i0.since>=PART_COLD_DAYS);
      const sel=p===lift.part;
      const hasToday=(day(todayISO).w||[]).some(s=>s.part===p);
      const open=hasToday&&partOpen(p);                    // being worked RIGHT NOW
      const finished=hasToday&&!open;                      // trained today, completed
      const sub = open ? '🔥 today'
                : finished ? '✅ today'
                : virgin ? 'new'
                : p==='Run' ? 'each time'
                : never ? 'never trained'
                : i0.since===1 ? 'yesterday'
                : `${i0.since}d ago`;
      const cls = [dead?'dead':'', p==='Run'&&!hasToday?'run':'',
                   (p===P.pick&&!hasToday&&!isLive())?'hot':'',   // no suggestions mid-workout
                   open?'liveP':'', finished?'finP':''].filter(Boolean).join(' ');
      h+=`<button class="partcard ${sel?'sel':''} ${cls}" data-part="${p}">
            <b>${p}</b><span class="ps">${sub}</span></button>`;
    });
    h+=`</div>`;

    // today's sets, filtered to the selected part. The whole section —
    // header included — appears with the first set and not before (v3.3.87).
    const mine=t.w.filter(s=>s.part===lift.part);
    if(mine.length){
      h+=`<h2>${lift.part} · today</h2>`;
      const byEx={};
      mine.forEach(s=>{(byEx[s.ex]=byEx[s.ex]||[]).push(s);});
      for(const [ex,list] of Object.entries(byEx)){
        const isRun=ex==='Run';
        const sub=isRun
          ?list.map(s=>`${dDisp(s.w)} ${DU()} · ${s.mins||0}'${String(s.secs||0).padStart(2,'0')}"`).join('  ')
          :list.map(s=>`${wTxt(ex,s.w)} × ${s.reps.join(',')}`).join('   ');
        const v=list.reduce((a,s)=>a+volOf(s),0);
        const exDone=!exOpen(ex);
        h+=`<div class="item logrow todayrow ${exDone?'fin':''}">
              <button class="logmain" data-ex="${ex}" data-part="${lift.part}">
                <b>${ex}</b><div class="sub">${sub}</div>
              </button>
              <span class="mono muted" style="font-size:12px">${v?vDisp(v)+' '+U():''}</span>
              <button class="xbtn" data-dropex="${ex}" aria-label="Remove ${ex} from today">✕</button>
            </div>`;
      }
      h+=`${undoStack.length?`<button class="btn ghost" id="undoBtn">↺ Undo — ${undoStack[undoStack.length-1].label}</button>`:''}
`;
      const usual=avgSessionVol(lift.part);
      if(usual>0){
        const isRunPart=lift.part==='Run';
        const cur=mine.reduce((a,s)=>a+(s.ex==='Run'?s.w:volOf(s)),0);
        const pct=Math.round(cur/usual*100);
        const disp=v=>isRunPart?`${dDisp(v)} ${DU()}`:`${vDisp(v)} ${U()}`;
        h+=`<div class="card notecard" style="margin-top:10px;padding:12px 14px">
              <div class="row spread" style="margin-bottom:8px">
                <span class="mono muted" style="font-size:11px;letter-spacing:.05em;text-transform:uppercase">Today vs your usual ${lift.part} session</span>
                <span class="mono" style="font-weight:700;color:${pct>=100?'var(--accent)':'var(--chalk)'}">${pct}%</span>
              </div>
              <div class="smeter"><i style="width:${Math.min(100,pct)}%" class="${pct>=100?'over ':''}${isLive()?'live':''}"></i></div>
              <div class="tot"><span><b>${disp(cur)}</b> today</span><span>usual ≈ ${disp(usual)}</span></div>
            </div>`;
      }
      /* v3.3.33: an open part offers BOTH exits. Continue reuses the data-go
         router, so it lands on the exercise you're mid-way through (v3.3.31);
         Complete seals. Continue leads — you tap it many times a session and
         Complete once. */
      if(partOpen(lift.part)) h+=`<div class="btnrow">
            <button class="btn ${isLive()?'livego':''}" data-go="${lift.part}">Continue →</button>
            <button class="btn ghost done" id="donePartBtn">✓ Complete</button></div>`;
      else if(dayMeta().donePart.includes(lift.part))
        h+=`<button class="btn ghost" id="reopenPartBtn" style="margin-top:12px">${lift.part} completed ✓ — Reopen</button>`;
    }

    /* v3.3.151: LAST TIME at the part level — the session's SHAPE. The
       exercise page got this in v3.3.144; the part page answered "what do I
       usually pick" but never "what did last time look like, in order".
       Same grammar, one level up: exgrp blocks in the order they were done,
       each row tappable into its lift, done-today rows checked off — a
       playbook you never had to author, read from the record. */
    if(lift.part!=='Run'){
      const lp=lastPartSession(lift.part);
      if(lp){
        /* v3.3.273: the SCOPE PILL. The maker could not tell that the sections
           below the part grid belong to the selected chip — the dependency was
           real but invisible. The pill is the selected chip restated in
           miniature (same white-on-accent, same word), leading every scoped
           surface, so the eye threads chip -> last time -> go-to without a
           single new colour or shape entering the vocabulary. Heading order
           unifies part-first at the same stroke ("LAST TIME · BACK" and
           "BACK · GO-TO" disagreed about which comes first). */
        /* v3.3.274: the card folds. Some days the playbook is wanted; some
           days it is scroll between you and the exercise list. The head row
           stays either way — the pill, the date link, and a disclosure
           chevron — so a folded card is a one-line fact, not a hole. The
           choice persists in settings until changed; a preference is not a
           per-render whim. */
        const plFolded=!!DB.settings.plFold;
        h+=`<div class="lastcard partlast${plFolded?' plfolded':''}"><div class="lasthead"><span><b class="scopepill">${lift.part}</b> last time</span><span class="lastacts"><button class="ago linkdate" data-histd="${lp.d}">${wd2(lp.d)} · ${agoStr(lp.d)}</button><button class="plfold" data-plfold aria-expanded="${!plFolded}" aria-label="${plFolded?'Show':'Hide'} last time">${plFolded?'▸':'▾'}</button></span></div>`;
        if(!plFolded){
          h+=`<div class="inlinehelp">Tap an exercise to use its previous weight. A checkmark means you completed it today.</div>`;
          for(const g of lp.groups){
            const doneNow=t.w.some(x=>x.ex===g.ex&&(x.reps||[]).length);
            const n=g.sets.reduce((a,st)=>a+((st[1]||[]).length||0),0);
            h+=`<div class="exgrp plrow${doneNow?' pldone':''}" data-ex="${g.ex}" role="button" tabindex="0">
                  <div class="lasthead"><span>${doneNow?'<span aria-label="completed today">✓</span> ':''}${g.ex}</span><span class="ago">${n} set${n>1?'s':''}</span></div>
                  ${setRows(g.ex,foldSets(g.sets,g.ex),false)}</div>`;
          }
        }
        h+=`</div>`;
      }
    }

    // exercises, split by how much of a staple they are for you.
    // Anything currently OPEN today already sits in the "· today" list above —
    // it only returns to its tier once you complete it.
    const openSet=new Set(t.w.filter(s=>s.part===lift.part&&!dayMeta().doneEx.includes(s.ex)).map(s=>s.ex));
    const list=catFor(lift.part).map(ex=>({ex,last:exLastFor(ex),tier:exTier(ex),freq:exFreq(ex)}))
      .filter(x=>!openSet.has(x.ex));
    const row=({ex,last,freq},big)=>{
      const p=prFor(ex);
      const when=last?(daysAgo(last)===0?'✓ done today':daysAgo(last)+'d ago'):'never logged';
      const meta=big?`${when} · ${freq}× this year`:when;
      const side=(p.mw&&usesPlates(ex))?`${wDisp((p.mw-barKg(ex))/2)}${U()} / side`:'';
      const mine=!!customs()[ex];
      const eq=EQUIP_LABEL[equipOf(ex)]||'';
      return `<div class="item logrow ${big?'goto':''}${_enter?' enter':''}" style="--i:${Math.min(_ei++,10)};${big?'':'padding:10px 10px 10px 14px'}">
            <button class="logmain" data-ex="${ex}">
              <b>${ex}</b><div class="sub">${meta}${mine?` · yours · ${eq.toLowerCase()}`:''}</div>
              ${big?'<span class="gochev" aria-hidden="true">→</span>':''}
            </button>
            <span class="pr-cell">
              <span class="pr-top">${p.mw?wDisp(p.mw)+U():''}</span>
              ${side?`<span class="pr-side">${side}</span>`:''}
            </span>
            ${(mine&&!last)?`<button class="xbtn" data-delex="${ex}" aria-label="Delete ${ex}">✕</button>`:''}
          </div>`;
    };
    /* v3.3.240: Go-to orders by RECENCY, frequency only breaks ties — the
       same law Sometimes has always used, so the whole screen sorts one way.
       Frequency's job is tier MEMBERSHIP (a one-off cannot become a go-to);
       ranking by a 365-day count kept a habit you left weeks ago on top of
       the staple you switched to, purely on accumulated history. The maker
       hit exactly this: Smith incline, 49 sessions but 39 days cold, sat
       above the barbell incline he actually runs now. */
    const goto=list.filter(x=>x.tier==='goto').sort((a,b)=>(b.last||'').localeCompare(a.last||'')||b.freq-a.freq);
    const some=list.filter(x=>x.tier==='sometimes').sort((a,b)=>(b.last||'').localeCompare(a.last||''));
    const fresh=list.filter(x=>x.tier==='new').sort((a,b)=>a.ex.localeCompare(b.ex));
    if(goto.length){
      h+=`<h2><b class="scopepill">${lift.part}</b> go-to</h2>`;
      goto.forEach(x=>h+=row(x,true));
    }
    if(some.length){
      h+=`<h2 class="quiet">Sometimes</h2>`;
      some.forEach(x=>h+=row(x,false));
    }
    if(fresh.length){
      h+=`<h2 class="quiet">Never tried</h2>`;
      fresh.forEach(x=>h+=row(x,false));
    }
    if(lift.adding){
      h+=`<h2>Add an exercise to ${lift.part}</h2>
          <div class="card">
            <div class="fld text" style="margin-bottom:10px"><label>Name</label>
              <input id="newExName" type="text" placeholder="e.g. Incline Machine Press"></div>
            <label class="mono muted" style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;display:block;margin-bottom:6px">Equipment</label>
            <div class="chips">${Object.entries(EQUIP_LABEL).map(([k,v])=>
              `<button class="chip ${(lift.newEquip||'barbell')===k?'on':''}" data-newequip="${k}">${v}</button>`).join('')}</div>
            <div class="note">Barbell and Smith get the bar + per-side plate math. Machine (stack) and Cable move a whole plate face at a time; Machine (plate-loaded) shows the plates per side and never counts the sled. Dumbbell shows "per hand". Bodyweight logs added weight only.</div>
            <div class="row" style="gap:8px;margin-top:10px">
              <button class="btn" id="saveEx" style="margin:0">Add to ${lift.part}</button>
              <button class="btn ghost" id="cancelEx" style="margin:0;flex:0 0 96px">Cancel</button>
            </div>
          </div>`;
    }else{
      h+=`<button class="btn ghost" id="addEx" style="margin-top:14px">+ Add your own exercise</button>`;
    }
    $('#view').innerHTML=h; return;
  }

  const ex=lift.ex,isRun=ex==='Run';

  // ---- Copy Picker: two modes — copy the SUGGESTION, or move TODAY's sets
  if(lift.copy){
    const moving = lift.copy.mode==='today';
    const sets = lift.copy.sets;                 // frozen when the picker opened — what you see is what copies
    const srcDate = lift.copy.d;
    let h=`<button class="back" data-cancelcopy="1">← ${ex}</button>
           <div class="exhead">${moving?`Move today's ${sets.length} sets to…`:`Suggest these ${sets.length} sets for…`}</div>
           <div class="note" style="margin-bottom:12px">
             ${sets.map(s=>`${wTxt(ex,s.w)}×${s.r}`).join('  ')}<br>
             ${moving
               ? `These are logged under ${ex} today. Picking a lift moves them there and removes them from ${ex}.`
               : `Nothing gets logged. The lift you pick will show these as its suggested session — tap or Log-all there when you actually do them.`}
           </div>`;
    const parts=[lift.part,...Object.keys(SEED.catalog).filter(p=>p!==lift.part&&p!=='Run')];
    parts.forEach(p=>{
      const opts=catFor(p).filter(e=>e!==ex&&e!=='Run');
      if(!opts.length) return;
      h+=`<h2>${p}</h2>`;
      opts.forEach(e2=>{
        const last=exLastFor(e2);
        h+=`<button class="item ${last?'':'dim'}" data-copyto="${e2}" data-copypart="${p}">
              <span><b>${e2}</b><div class="sub">${last?(daysAgo(last)===0?'today':daysAgo(last)+'d ago'):'never logged'}</div></span>
              <span class="mono muted" style="font-size:12px">copy →</span>
            </button>`;
      });
    });
    $('#view').innerHTML=h; return;
  }

  const todaySets=t.w.filter(s=>s.ex===ex);
  const l=lastFor(ex),p=prFor(ex);
  let h=``;   // the sticky header already shows the exercise + part

  /* v3.1.2: the footer answers ONE question — "what did I do last time?" —
     the full previous session, so today has a target. (PRs live in Records.)
     lastFor() would include today mid-workout; this variant excludes it. */
  const lastPrev=(()=>{
    const mine=Object.entries(DB.days)
      .filter(([d,v])=>d<todayISO&&v.w.some(s=>s.ex===ex))
      .sort((a,b)=>a[0]<b[0]?1:-1)[0];
    const seed=SEED.last[ex];
    if(mine&&(!seed||mine[0]>seed.d))
      return {d:mine[0],sets:mine[1].w.filter(s=>s.ex===ex).map(s=>[s.w,s.reps,s.mins,s.secs])};
    return seed||null;
  })();
  /* v3.3.144: LAST TIME is no longer its own card. It becomes the dimmed
     lower group of the "This session" card — same grammar as today's rows,
     stepped back the way past years step back on the Consistency chart. The
     fragment is built here (it needs lastPrev) and composed below. */
  let lastGroup='';
  if(!isRun){
    if(lastPrev){
      const folded=foldSets(lastPrev.sets,ex);         // v3.3.43: shared with History
      lastGroup=`<div class="sess-then">
        <div class="lasthead"><span>LAST TIME</span><button class="ago linkdate" data-histd="${lastPrev.d}">${wd2(lastPrev.d)} · ${agoStr(lastPrev.d)}</button></div>
        ${setRows(ex,folded,true)}
      </div>`;
    }else{
      lastGroup=`<div class="sess-then"><div class="lasthead"><span>LAST TIME</span></div>
        <div class="muted" style="font-size:13px">Never logged — today writes the first line.</div></div>`;
    }
  }

  // ---- suggested sets: shortcut keys, not a to-do list. Tap = log that w×r
  //      (again and again, if you like). ✕ dismisses one for today. Max 6 shown.
  //      Your LATEST logged set always leads — one tap duplicates it.
  //      Rendered BELOW "Log a set" (v2.10); built here because the log zone
  //      needs `ls` for its default weight.
  const ls=suggestedFor(ex);
  let runHist='';   // v3.3.153: built in the run branch, emitted below the session card
  /* v3.3.137: the weight is resolved HERE, before the suggested chips are
     built. It used to be settled inside the log zone further down — which is
     rendered below but built after — so the chips were partitioned against
     whatever weight the PREVIOUS exercise left behind. Nothing depended on
     the old position; the resolver only needs `ls`, which is on the line
     above. */
  if(!isRun&&(lift.weight===0||lift.weight==null)){
    const savedW=(DB.settings.exW||{})[ex];
    if(savedW!=null) lift.weight=savedW;                     // your default, exactly as you set it
    else if(isBody(ex)) lift.weight=bwNow()||0;              // v3.3.67: what you weigh NOW, per the series
    else{
      const top=ls&&ls.sets.length?Math.max(...ls.sets.map(s=>s.w)):null;
      lift.weight=top!=null?snapW(top,ex):toKg(isLb()?45:20);   // inferred weights snap to weights THIS lift can make
    }
  }
  /* v3.3.141: the Suggested zone is GONE. It sat directly above "Logged
     today" showing chips that looked identical to the records below it —
     same shape, same type, one a command and the other a receipt. Its
     guidance rides on the rep tiles as a dot now, in the control you were
     already using, and Last time takes its place in the column. */

  if(isRun){
    h+=`<div class="zone prime"><div class="zonehead"><span>Log a run</span></div>
        <div class="runrow" style="margin:10px 0">
          <div class="fld"><label>Distance ${DU()}</label><input id="rk" type="number" inputmode="decimal" step="0.01" placeholder="0.00"></div>
          <div class="fld"><label>Min</label><input id="rm" type="number" inputmode="numeric" placeholder="0"></div>
          <div class="fld"><label>Sec</label><input id="rs" type="number" inputmode="numeric" placeholder="0"></div>
        </div><button class="btn" id="addrun">Add run</button></div>`;
    /* v3.1.9: the Run view finally shows its history — recent runs with
       date · distance · time · pace, same visual language as Last Time. */
    // v3.3.153: deferred — see the emit point after the session card
    const runs=[];
    for(const [d,rows] of Object.entries(SEED.sessions))
      for(const r of rows) if(r[1]==='Run'&&r[2]>0) runs.push({d,km:r[2],mins:r[4],secs:r[5]});
    runs.sort((a,b)=>a.d<b.d?1:-1);
    if(runs.length){
      const fmtPace=r=>{
        if(r.mins==null||!r.km) return '';
        const t=r.mins+(r.secs||0)/60, p=t/r.km, pm=Math.floor(p), ps=Math.round((p-pm)*60);
        return `${pm}'${String(ps).padStart(2,'0')}"/${DU()}`;
      };
      const fmtTime=r=>r.mins==null?'':`${r.mins}'${r.secs!=null?String(r.secs).padStart(2,'0')+'"':''}`;
      const shown=runs.slice(0,8);
      const rows2=shown.map(r=>`<div class="lastrow">
          <span class="runD mono">${wd2(r.d)} ${+r.d.slice(5,7)}/${+r.d.slice(8,10)}</span>
          <span class="lastw mono">${dDisp(r.km)} <span class="u">${DU()}</span></span>
          <span class="runT mono">${fmtTime(r)}</span>
          <span class="runP mono">${fmtPace(r)}</span>
        </div>`).join('');
      const mo=todayISO.slice(0,7);
      const moKm=(SEED.monthly[mo]&&SEED.monthly[mo].km)||0;
      /* v3.3.153: BUILT here (it needs `runs`), EMITTED after the session
         card. Recent runs sat above THIS SESSION, so the run you just
         logged rendered underneath eight days of history — inverted
         against every other exercise, where today has led since v3.3.144.
         Today's run is deliberately absent from this list (deriveAll seals
         days at midnight; today is live), which made the inversion read
         even worse: your run seemed missing from the top and buried at
         the bottom at the same time. */
      runHist=`<div class="lastcard runhist">
        <div class="lasthead"><span>RECENT RUNS</span><span class="ago">last ${shown.length} of ${fmt(runs.length)}</span></div>
        ${rows2}
        <div class="lastfoot mono">${dDisp(moKm)} ${DU()} this month · ${fmt(Math.round(SEED.totals.km))} ${DU()} lifetime</div>
      </div>`;
    }
  }else{
    /* v3.3.144: the "Log a set" caption is gone — a stepper, tiles and an
       Add button do not need naming, and the zone border already groups
       them (the v3.3.130 argument, applied to a header instead of an icon).
       .tight trims the padding the caption used to justify. */
    h+=`<div class="zone prime tight">
        <div class="wsel"><button data-w="-1">−</button>
        <div class="val${isBody(ex)?' bwval':''}">${isBody(ex)?`<span class="bwtag">Bodyweight +</span>`:''}<input id="wv" type="number" inputmode="decimal" step="${wStep(ex)}" value="${wDisp(lift.weight)}"><span class="unit">${U()}</span></div>
        <button data-w="1">+</button></div>`;
    if(usesPlates(ex)){
      h+=`<div class="loadline" id="ll">${loadInner(ex,lift.weight)}</div>`;
    }else if(loadLine(ex,lift.weight)){
      h+=`<div class="loadline" id="ll"><span class="ll-text">${loadLine(ex,lift.weight)}</span></div>`;
    }
    // rep buttons drawn from what you actually do for THIS exercise
    // v3.3.56: tiles follow the weight · v3.3.141: and carry the suggestion dot
    h+=`<div class="repgrid">${repTilesHTML(ex,lift.weight)}</div>
        <div class="repcustom">
          <input id="rc" type="number" inputmode="numeric" placeholder="reps">
          <button class="btn" id="addrep" style="margin:0;flex:0 0 142px">Add set</button>
        </div></div>`;
    /* v3.3.144: the Suggested strip, back — compact form only. One tap logs
       the complete w×r pair, which is the thing the dot could not do. */
    {
      const dis=new Set(dayMeta().sugX[ex]||[]);
      const lastToday=todaySets.length?todaySets[todaySets.length-1]:null;
      const chips=sugChips(ex,ls,lastToday,dis,lift.weight);
      if(chips.length)
        /* v3.3.145: the head came back with the strip this time. v3.3.144
           restored the chips but not the label above them, so the strip
           rendered as an anonymous row of buttons. The (i) uses the modern
           iBtn -> tipFloat path, not the old #infoBtn toggle that went in
           v3.3.141. */
        /* v3.3.147: SUGGESTED is a peer label to THIS SESSION and LAST TIME,
           so it uses the SAME class — .lasthead — not a second header style
           tuned to look similar. It rendered 12px chalk in the display face
           against their 11px muted, and the mismatch read as a mistake
           because it was one. Caps are literal in lasthead labels. */
        /* v3.3.278: name the origin. Chips built from today's pasted plan say so,
           because "suggested" from your own history and "suggested" from a plan
           you brought are different claims and the user must be able to tell. */
        h+=`<div class="zone mini"><div class="lasthead"><span>${((sugOv()[ex]||{}).from==='plan')?'<b class="scopepill">plan</b> today':'SUGGESTED'} ${iBtn('sug',((sugOv()[ex]||{}).from==='plan')?'From the plan you pasted today. Tap a set to log it.':'Tap a set to log it again.','About suggested sets')}</span></div>
           <div class="lastsets">${sugChipsHTML(ex,chips)}</div></div>`;
    }
  }

  // the nudge sits directly under the stepper it's about to change
  if(!isRun){
    const nud=overloadNudge(ex);
    if(nud&&nud.mode==='reps') h+=`<div class="nudge">
        <span>Same <b>${nud.topR} reps</b> for <b>${nud.n}</b> sessions — one more?</span>
        <button class="btn ghost nudgego" id="nudgeGo" data-nr="${nud.nextR}">${nud.nextR} reps →</button>
        <button class="lsx nudgex" data-nudgex="r${nud.topR}" aria-label="Dismiss">✕</button>
      </div>`;
    else if(nud) h+=`<div class="nudge">
        <span>Same <b>${wDisp(nud.top)} ${U()}</b> for <b>${nud.n}</b> sessions — try ${wDisp(nud.next)}?</span>
        <button class="btn ghost nudgego" id="nudgeGo" data-nw="${nud.next}">${wDisp(nud.next)} ${U()} →</button>
        <button class="lsx nudgex" data-nudgex="${nud.top}" aria-label="Dismiss">✕</button>
      </div>`;
  }

  /* ======== v3.3.144: THIS SESSION — one card, one grammar =============
     "Last time" and "Logged today" were two cards saying the same kind of
     thing in two grammars, and today's sets only looked different because
     they doubled as delete buttons. The destructive affordances moved
     behind EDIT, so today can render in the History grammar — weight-
     grouped rows of rep chips — and the two cards collapse into one.
     Today reads full-strength on top; last time reads dimmed below, the
     same way past years step back on the Consistency chart. */
  {
    const editing=!!lift.editToday;
    /* the (i) explains what EDIT hides — with deletion now behind a mode,
       this tip is where its discoverability lives */
    h+=`<div class="lastcard sess"><div class="lasthead"><span>THIS SESSION</span>${
        todaySets.length?`<button class="ago sessedit" id="sessEdit">${editing?'DONE':'EDIT'}</button>`:''}</div>`;

    if(!todaySets.length){
      h+=`<div class="muted" style="font-size:13px">Nothing yet — log the first set.</div>`;
    }else if(!editing){
      /* read mode: fold today exactly the way History folds a day */
      const folded=foldSets(todaySets.map(s=>[s.w,s.reps,s.mins,s.secs]),ex);
      /* the newest chip carries the save flash — the settile that used to
         host it only exists in edit mode now */
      let rows=setRows(ex,folded,false);
      if(lift.justSaved){
        const k=rows.lastIndexOf('<i class="repchip">');
        if(k>=0) rows=rows.slice(0,k)+'<i class="repchip fresh">'+rows.slice(k+'<i class="repchip">'.length);
      }
      h+=`<div class="sess-now">${rows}</div>`;
    }else{
      /* EDIT: each individual set is a tile with its ✕ — the pre-v3.3.144
         "Logged today" surface, now opt-in instead of always armed */
      const ordered=todaySets.slice().reverse();
      h+=`<div class="sets">`;
      ordered.forEach(s=>{
        const idx=t.w.indexOf(s);
        const isPR=!isRun&&s.reps.length&&s.w>=p.mw;
        h+=isRun
          ?`<div class="settile${lift.editSet===idx?' editing':''}" data-del="${idx}"><span class="w">${dDisp(s.w)}<small>${DU()}</small></span><span class="x">${s.mins||0}'${String(s.secs||0).padStart(2,'0')}"</span></div>`
          :`<div class="settile ${isPR?'pr':''}${lift.editSet===idx?' editing':''}" data-del="${idx}"><span class="w">${wLabel(ex,s.w)}${isBody(ex)?'':`<small>${U()}</small>`}</span><span class="x">×</span><span class="w">${s.reps[0]}</span></div>`;
      });
      h+=`</div>
        <div class="row" style="gap:8px;margin-top:10px">
          <button class="btn ghost" id="clearToday" style="margin:0;flex:1;white-space:nowrap;padding:12px 6px">Clear today's ${todaySets.length}</button>
          <button class="btn ghost" id="moveToday" style="margin:0;flex:1;white-space:nowrap;padding:12px 6px">Move to another lift →</button>
        </div>
        ${undoStack.length?`<button class="btn ghost" id="undoBtn" style="margin-top:8px">↺ Undo — ${undoStack[undoStack.length-1].label}</button>`:''}`;
      const es=(lift.editSet!=null)?t.w[lift.editSet]:null;
      if(es&&es.ex===ex){
        h+=isRun
          ?`<div class="card editcard" style="margin-top:10px">
              <div class="mono muted" style="font-size:11px;margin-bottom:8px">EDIT RUN</div>
              <div class="row" style="gap:8px">
                <div class="fld"><label>Distance ${DU()}</label><input id="edW" type="number" inputmode="decimal" step="0.01" value="${dDisp(es.w)}"></div>
                <div class="fld"><label>Min</label><input id="edM" type="number" inputmode="numeric" value="${es.mins||0}"></div>
                <div class="fld"><label>Sec</label><input id="edS" type="number" inputmode="numeric" value="${es.secs||0}"></div>
              </div>
              <div class="row" style="gap:8px;margin-top:10px">
                <button class="btn" id="editSave" style="margin:0">Save</button>
                <button class="btn ghost" id="editCancel" style="margin:0;flex:0 0 96px">Cancel</button>
              </div></div>`
          :`<div class="card editcard" style="margin-top:10px">
              <div class="mono muted" style="font-size:11px;margin-bottom:8px">EDIT SET</div>
              <div class="row" style="gap:8px">
                <div class="fld"><label>Weight ${U()}</label><input id="edW" type="number" inputmode="decimal" step="${wStep(ex)}" value="${wDisp(es.w)}"></div>
                <div class="fld"><label>Reps</label><input id="edR" type="text" inputmode="numeric" value="${es.reps.join(',')}"></div>
              </div>
              <div class="row" style="gap:8px;margin-top:10px">
                <button class="btn" id="editSave" style="margin:0">Save</button>
                <button class="btn ghost" id="editCancel" style="margin:0;flex:0 0 96px">Cancel</button>
              </div></div>`;
      }
    }

    /* footer: today's volume against last session — unchanged math */
    if(todaySets.length){
      if(isRun){
        const km=todaySets.reduce((a,s)=>a+s.w,0);
        const sec=todaySets.reduce((a,s)=>a+(s.mins||0)*60+(s.secs||0),0);
        const pace=km?sec/toD(km):0;
        h+=`<div class="tot"><span>Today <b>${dDisp(km)} ${DU()}</b></span>
            <span>pace <b>${Math.floor(pace/60)}'${String(Math.round(pace%60)).padStart(2,'0')}"</b>/${DU()}</span></div>`;
      }else{
        const v=todaySets.reduce((a,s)=>a+volOf(s),0);
        const lastVol=ls?ls.sets.reduce((a,s)=>a+s.w*s.r,0):0;
        const d=lastVol?Math.round((v/lastVol-1)*100):0;
        h+=`<div class="tot"><span>Volume <b><span id="volNum" data-kg="${v}">${vDisp(v)}</span> ${U()}</b> · ${todaySets.length} sets</span>
            ${lastVol?`<button class="delta linkdate ${d>=0?'up':'down'}" data-histd="${ls.d}">${d>=0?'+':''}${d}% vs ${wd(ls.d)}</button>`:''}</div>`;
      }
    }

    h+=lastGroup;      // the dimmed then-group closes the card
    h+=`</div>`;
    /* v3.3.150: Undo shows WHEREVER there is something to undo, not only
       behind EDIT. Since v3.3.143 the stack clears on any log, so a
       non-empty stack means "you just destroyed something and have logged
       nothing since" — precisely the moment the way back must be in plain
       sight. The button self-expires on the next set, so it cannot become
       permanent chrome. EDIT keeps its own copy inside; skip the outer one
       there or the same action renders twice. */
    if(!editing&&undoStack.length)
      h+=`<button class="btn ghost" id="undoBtn" style="margin-top:12px">↺ Undo — ${undoStack[undoStack.length-1].label}</button>`;
    h+=runHist;   // v3.3.153: today first, then the history it joins at midnight
    /* v3.3.165: dual-home exercises offer their other home — quiet, at the
       bottom, confirmed before anything moves, forward-only by nature
       (rows already carry the part they were trained under). */
    if(DUAL[ex]){
      const home=homePartOf(ex), other=DUAL[ex].find(p=>p!==home)||DUAL[ex][0];
      h+=`<div class="tot dualrow" style="margin-top:12px"><span class="mono muted" style="font-size:11px">Counts as ${home.toUpperCase()}</span>
          <button class="ago" id="dualMove" data-dex="${ex}" data-dto="${other}">move to ${other}</button></div>`;
    }
    /* v3.3.158 (C9-12, the first runner user's cluster): a MONTHLY goal —
       "no one plans a year, people plan a month" — with the distance left
       to it, how often you ran in the last 7 days, and what your recent
       pace means at 10 km. The yearly bar below survives untouched: it
       tracks the maker's 2,500 km arc; this card tracks a month. One
       stored number (settings.moGoal) reused every month — a goal is a
       standard, not a calendar entry. */
    // v3.3.161: THIS MONTH moved to the Stats tab — moGoalCardHTML()
  }
  {
    const ve=document.getElementById('volNum');
    if(ve) _lastVol={ex:lift.ex,v:parseFloat(ve.dataset.kg||'0')};
  }
  lift._animSave=lift.justSaved;
  lift.justSaved=false;

  /* v3.3.40: Last Time leads. It is the thing you act on between sets — the
     numbers you're about to match — while Progression is context you read
     once. The terminal action stays last. */
  if(!isRun) h+=(isLive()&&todaySets.length?liveBars(ex,todaySets):progChart(ex));
  if(exOpen(ex)) h+=`<button class="btn done" id="doneExBtn">✓ Complete ${ex}</button>`;
  $('#view').innerHTML=h;
  bindLbScrub();   // v3.3.164: idempotent, every render of the live chart
  if(lift._animSave){ lift._animSave=false; volCountUp(); lbGrow(); }
}

/* The session this exercise was last done in — strictly BEFORE today.
   Today's logging never rewrites it, so it stays a stable template you can
   copy from, repeat, or compare against. */
/* v3.3.151: lastSession's sibling, one level up. The most recent day this
   PART was trained, with its exercises in the order they were done —
   a session's shape, not a frequency ranking. Groups key on first
   occurrence, so alternating supersets fold into one group per exercise,
   exactly as History's day view reads them. Two eras, same rule as
   lastSession: the app day wins only if it is newer than the sheet's. */
/* v3.3.161: THIS MONTH lives on Stats now — a goal is a statistic about the
   month, and the maker moved it off the logging path. Same card, one home. */
function moGoalCardHTML(){
  let h='';

      const mo=todayISO.slice(0,7);
      const moPast=(SEED.monthly[mo]&&SEED.monthly[mo].km)||0;
      const moToday=day(todayISO).w.filter(x=>x.ex==='Run').reduce((a,x)=>a+x.w,0);
      const moAll=moPast+moToday;
      const wk=(()=>{let n=0;for(let i=0;i<7;i++){const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-i);
        const iso=d.toLocaleDateString('en-CA');
        if((DB.days[iso]&&(DB.days[iso].w||[]).some(x=>x.ex==='Run'))) n++;}return n;})();
      const paces=[];
      for(const d of Object.keys(SEED.sessions).sort().slice(-30))
        for(const r of SEED.sessions[d]) if(r[1]==='Run'&&r[4]) paces.push(((r[4]*60)+(r[5]||0))/toD(r[2]));
      const recent=paces.slice(-5).sort((x,y)=>x-y);
      const med=recent.length?recent[Math.floor(recent.length/2)]:0;
      const tenK=med?med*10:0;
      const G=+(DB.settings.moGoal||0);
      /* v3.3.159: target pace — what the first runner user actually meant.
         Stored as seconds per km; the 10k line projects the TARGET when set,
         with recent shown beside it for the honest gap. */
      const TP=+(DB.settings.tgtPace||0);
      const fmtP=x=>`${Math.floor(x/60)}'${String(Math.round(x%60)).padStart(2,'0')}"`;
      const editingGoal=!!DB.settings._moEdit;
      h+=`<div class="lastcard moGoal"><div class="lasthead"><span>THIS MONTH</span></div>`;
      if(G>0&&!editingGoal){
        const left=Math.max(0,G-moAll), pct=Math.min(100,Math.round(moAll/G*100));
        h+=`<div class="mgbar"><i style="width:${pct}%"></i></div>
            <div class="tot"><span>${left>0?`<b>${dDisp(left)} ${DU()}</b> to go · goal ${G} ${DU()}`:`goal ${G} ${DU()} — <b>done</b>`}</span>
            <button class="ago" id="moGoalEdit">edit</button></div>`;
      }else{
        h+=`<div class="row" style="gap:8px">
            <div class="fld"><label>Goal ${DU()} / month</label><input id="moGoalIn" type="number" inputmode="numeric" placeholder="40" value="${G||''}"></div>
            <div class="fld"><label>Target pace /${DU()}</label><input id="moPaceIn" type="text" inputmode="numeric" placeholder="730" value="${TP?fmtP(TP):''}"></div>
            <button class="btn" id="moGoalSet" style="margin:0;flex:0 0 72px;align-self:flex-end">Set</button></div>`;
      }
      h+=`<div class="lastfoot mono">${wk} run${wk===1?'':'s'} in the last 7 days${TP?` · 10${DU()} ≈ ${fmtP(TP*10)} at target ${fmtP(TP)} (recent ${med?fmtP(med):'—'})`:(tenK?` · 10${DU()} ≈ ${fmtP(tenK)} at your recent pace`:'')}</div></div>`;
  return h;
}
/* v3.3.278: paste, then READ BACK before anything is accepted. The preview
   is the whole safety argument — a parser that resolves silently is worse
   than no parser, because you find out mid-set. Ambiguous names offer their
   candidates; unreadable lines are kept verbatim as a note rather than
   dropped. */
function planScreenHTML(){
  if(lift.plan==='paste'){
    const cur=(planNow()||{}).raw||lift.planText||'';
    return `<h2>Paste today\u2019s plan</h2>
      <div class="card">
        <textarea id="planText" class="planta" rows="12" placeholder="Paste a session — from a coach, a forum, anywhere.">${hesc(cur)}</textarea>
        <div class="planacts">
          <button class="btn" data-planread>Read it</button>
          <button class="btn ghost" data-planback>Cancel</button>
        </div>
      </div>`;
  }
  const rows=lift.planRows||[];
  const ok=rows.filter(r=>r.kind==='ex'&&r.ex).length;
  const tot=rows.filter(r=>r.kind==='ex').length;
  let h=`<h2>Read from your paste</h2><div class="card">
    <div class="lasthead"><span>WHAT THE APP READ</span><span class="ago">${ok} of ${tot}</span></div>`;
  rows.forEach((r,i)=>{
    if(r.kind==='ex'&&r.ex){
      const l=r.lines[r.lines.length-1];
      h+=`<div class="planpv ok"><span class="pi">\u2713</span>
        <span class="pb"><b>${hesc(r.ex)}</b>
          <i class="mono">${l.bw?'BW':l.w+(l.unit||'')} \u00d7 ${l.reps.join(', ')}</i></span>
        <button class="lsx" data-plandrop="${i}" aria-label="Skip ${hesc(r.ex)}">\u2715</button></div>`;
    }else if(r.kind==='ex'){
      h+=`<div class="planpv ask"><span class="pi">?</span>
        <span class="pb"><b>${hesc(r.name)}</b>
          <i class="mono">${r.cands.length?'did you mean\u2026':'not in your exercises \u2014 kept as a note'}</i></span>
        <span class="pc">${r.cands.map(c=>`<button class="btn ghost tiny" data-planpick="${i}" data-planex2="${hesc(c)}">${hesc(c)}</button>`).join('')}</span></div>`;
    }else{
      h+=`<div class="planpv note"><span class="pi">\u00b7</span>
        <span class="pb"><i class="mono">${hesc(r.raw.trim())}</i>
          <i class="mono dim">kept as a note</i></span></div>`;
    }
  });
  h+=`<div class="planacts">
      <button class="btn" data-planaccept>Use as today\u2019s plan</button>
      <button class="btn ghost" data-planedit>Edit</button>
      <button class="btn ghost" data-planback>Cancel</button>
    </div></div>`;
  return h;
}
function lastPartSession(part){
  /* v3.3.276: "last time" means the last FULL SESSION of the part, judged by
     the same session-vs-cameo authority the planner uses (partDoseOn /
     fullDoseFloor). The maker hit the gap: after v3.3.275 taught the planner
     to skip cameos, this card still showed one — three Lateral Raise sets
     from a Chest day presented as "the Shoulder playbook". A cameo is not a
     playbook. If a part has no full session on record, its most recent day
     still shows, whatever its size — the card degrades to the ledger, never
     to nothing. */
  const dayset=new Set();
  for(const [d,v] of Object.entries(DB.days))
    if(d<todayISO && (v.w||[]).some(x=>x.part===part&&(x.reps||[]).length)) dayset.add(d);
  for(const d of Object.keys(SEED.sessions))
    if(d<todayISO && SEED.sessions[d].some(r=>r[0]===part&&r[1]!=='Run')) dayset.add(d);
  const days=[...dayset].sort();
  if(!days.length) return null;
  const floor=fullDoseFloor(part,days);
  const full=days.filter(x=>partDoseOn(x,part)>=floor);
  const d=(full.length?full:days)[ (full.length?full:days).length-1 ];
  const groups=[], byEx={};
  const add=(ex,set)=>{ let g=byEx[ex]; if(!g){ g={ex,sets:[]}; byEx[ex]=g; groups.push(g); } g.sets.push(set); };
  const dv=DB.days[d];
  if(dv&&(dv.w||[]).some(x=>x.part===part&&(x.reps||[]).length)){
    for(const x of dv.w) if(x.part===part&&(x.reps||[]).length) add(x.ex,[x.w,x.reps,x.mins,x.secs]);
  }else if(SEED.sessions[d]){
    for(const r of SEED.sessions[d]) if(r[0]===part&&r[1]!=='Run') add(r[1],[r[2],r[3],r[4],r[5]]);
  }
  return groups.length?{d,groups}:null;
}
function lastSession(ex){
  const mine=Object.entries(DB.days)
    .filter(([d,v])=>d<todayISO && v.w.some(s=>s.ex===ex))
    .sort((a,b)=>b[0].localeCompare(a[0]))[0];
  const seed=SEED.lastSess[ex];
  const useMine = mine && (!seed || mine[0]>seed.d);
  if(useMine){
    const sets=[];
    mine[1].w.filter(s=>s.ex===ex).forEach(s=>s.reps.forEach(r=>sets.push({w:s.w,r})));
    return {d:mine[0], sets};
  }
  if(!seed || seed.d>=todayISO) return null;
  const sets=[];
  seed.rows.forEach(([w,rs])=>rs.forEach(r=>sets.push({w,r})));
  return {d:seed.d, sets};
}
/* rep buttons: the rep counts you actually use for this lift, plus today's */
/* v3.3.56: rep tiles follow the WEIGHT. Two layers:
   1) EVIDENCE — reps actually done within 3% of the chosen weight,
      recency-weighted. Truth outranks any model, so these fill first.
   2) MODEL — a per-exercise strength curve from the last 90 days' sets via
      Epley (1RM ≈ w·(1+r/30)); the estimate is the median of the top five,
      so one grinder set can't skew it. Inverted at the chosen weight
      (r = 30·(1RM/w − 1)) it predicts reps for weights NEVER lifted — a
      heavier bar naturally yields fewer reps, fitted to this lifter rather
      than a generic table. A spread around the prediction fills what
      evidence didn't.
   Bodyweight moves and no-weight calls keep the old frequency tiles — a
   weight-independent movement shouldn't pretend otherwise. */
function repChoices(ex,wKg){
  const c={};
  (SEED.repFreq[ex]||[]).forEach((r,i)=>c[r]=(c[r]||0)+(8-i));
  for(const [,v] of Object.entries(DB.days))
    for(const s of v.w) if(s.ex===ex) (s.reps||[]).forEach(r=>c[r]=(c[r]||0)+3);
  const freq=Object.keys(c).map(Number).sort((a,b)=>c[b]-c[a]);
  if(wKg==null||wKg<=0.01||isBody(ex)){
    let list=freq.slice(0,8);
    if(list.length<6) list=[...new Set([...list,5,6,8,10,12,15,20,25])].slice(0,8);
    return list.sort((a,b)=>a-b);
  }
  // layer 1: evidence at this weight (±3%), last year counts double-and-a-half
  const yr=new Date(todayISO+'T00:00'); yr.setDate(yr.getDate()-365);
  const yrISO=yr.toLocaleDateString('en-CA');
  const ev={};
  for(const [d,v] of Object.entries(DB.days))
    for(const s of v.w)
      if(s.ex===ex&&s.w>0&&Math.abs(s.w-wKg)<=wKg*0.03)
        (s.reps||[]).forEach(r=>ev[r]=(ev[r]||0)+(d>=yrISO?5:2));
  let list=Object.keys(ev).map(Number).sort((a,b)=>ev[b]-ev[a]).slice(0,8);
  // layer 2: the strength curve fills the rest
  const d90=new Date(todayISO+'T00:00'); d90.setDate(d90.getDate()-90);
  const d90ISO=d90.toLocaleDateString('en-CA');
  const es=[];
  for(const [d,v] of Object.entries(DB.days)){
    if(d<d90ISO) continue;
    for(const s of v.w) if(s.ex===ex&&s.w>0)
      (s.reps||[]).forEach(r=>{ if(r>=1&&r<=35) es.push(s.w*(1+r/30)); });
  }
  if(list.length<8&&es.length>=3){
    es.sort((a,b)=>b-a);
    const top=es.slice(0,5), rm=top[Math.floor(top.length/2)];
    const base=Math.min(35,Math.max(1,Math.round(30*(rm/wKg-1))));
    for(const d of [0,-2,2,-4,4,-3,3,-6,6,-8,8]){
      const r=base+d;
      if(r>=1&&r<=35&&!list.includes(r)) list.push(r);
      if(list.length>=8) break;
    }
  }
  for(const r of freq){ if(list.length>=8) break; if(!list.includes(r)) list.push(r); }
  if(list.length<6) list=[...new Set([...list,5,6,8,10,12,15,20,25])].slice(0,8);
  return list.slice(0,8).sort((a,b)=>a-b);
}
/* the grid refresh every weight-change path funnels into (via refreshLoad) */
/* v3.3.137: the suggested chips follow the weight, the same way the rep
   tiles have since v3.3.56. Pool building lives here so renderLift and
   refreshSug cannot disagree about what the chips are.

   The reorder is a STABLE PARTITION, not a sort: chips matching the current
   weight move to the front keeping their relative order, everything else
   follows keeping its own. Two properties fall out of that, and both are
   the point —
     · when the weight matches the last logged set (the default the screen
       opens in) NOTHING moves, so the feature is invisible until you
       actually steer the weight somewhere;
     · "your latest logged set leads" therefore still holds in that default,
       and only yields once you have deliberately changed the weight, which
       is itself a stated intent.
   Nearest-weight matching was considered and rejected: near-misses would
   reshuffle on every tap of +, turning a stable list into a moving target
   under your thumb. Exact match only — and a weight with no match at all
   leaves the order alone rather than shuffling for the sake of it. */
/* v3.3.144: the Suggested strip RETURNS — the maker recalled it two releases
   after cutting it: the one-tap complete w×r log turned out to be the part
   that mattered mid-set. It comes back in the COMPACT strip form only; the
   tall variant's "Log all N" / "Copy suggestion" buttons stay gone, and the
   v3.3.137 weight-follow partition comes back with it. The dot stays too —
   different surface, zero height. */
function sugChips(ex,ls,lastToday,dis,curKg){
  let pool=[];
  if(lastToday&&lastToday.reps.length)
    pool.push({w:lastToday.w,r:lastToday.reps[0],key:`now|${lastToday.w}|${lastToday.reps[0]}`,now:true});
  (ls?ls.sets:[]).forEach((s,i)=>pool.push({w:s.w,r:s.r,key:`${s.w}|${s.r}|${i}`}));
  const seenWR=new Set();
  pool=pool.filter(c=>{const k=`${c.w}x${c.r}`;if(seenWR.has(k))return false;seenWR.add(k);return true;});
  pool=pool.filter(c=>!dis.has(c.key));
  if(curKg!=null&&isFinite(curKg)){
    const hit=c=>Math.abs(c.w-curKg)<0.05;   // float-safe: kg can carry lb-conversion dust
    if(pool.some(hit)) pool=[...pool.filter(hit),...pool.filter(c=>!hit(c))];
  }
  return pool.slice(0,6);
}
function sugChipsHTML(ex,chips){
  return chips.map(c=>`<span class="lschip">
              <button class="lastset ${c.now?'now':''}" data-rep-w="${c.w}" data-rep-r="${c.r}">
                <span class="ls-w">${isBody(ex)&&c.w<=0.01?'BW':`${wDisp(c.w)}<small>${U()}</small>`}</span>
                <span class="ls-x">×</span>
                <span class="ls-r">${c.r}</span></button>
              <button class="lsx" data-sugx="${c.key}" aria-label="Dismiss">✕</button>
            </span>`).join('');
}
function refreshSug(){
  const row=document.querySelector('.zone.mini .lastsets');
  if(!row||!lift.ex||lift.ex==='Run') return;
  const kg=toKg(+(document.getElementById('wv')?.value||0));
  const ls=suggestedFor(lift.ex);
  const t=DB.days[todayISO]||{w:[]};
  const todaySets=(t.w||[]).filter(x=>x.ex===lift.ex&&x.reps&&x.reps.length);
  const lastToday=todaySets.length?todaySets[todaySets.length-1]:null;
  const dis=new Set(dayMeta().sugX[lift.ex]||[]);
  row.innerHTML=sugChipsHTML(lift.ex,sugChips(lift.ex,ls,lastToday,dis,kg));
}
/* v3.3.141: the dot. Reps you did last session at the weight now showing —
   a footnote on the tiles, not a second list competing with them. Last
   session only: today's sets are already visible in "Logged today", and
   marking them here would say the same thing twice. Exact weight match, the
   same rule the chips used, so the marks move as you step the weight. */
function sugReps(ex,kg){
  const out=new Set();
  if(kg==null||!isFinite(kg)) return out;
  const ls=suggestedFor(ex);
  if(!ls||!ls.sets) return out;
  for(const s of ls.sets) if(Math.abs(s.w-kg)<0.05) out.add(s.r);
  return out;
}
function repTilesHTML(ex,kg){
  /* v3.3.154: STABLE for the visit. The first stranger user tapped the same
     rep tile three sets running and on the third the row had reordered under
     his thumb — logging re-derived the choices. Same law as the v3.3.137
     chip decision: no moving targets under thumbs. The tile list is cached
     per (exercise, weight); logging cannot move it, only leaving the
     exercise or stepping the weight rebuilds it. The suggestion dots still
     refresh — marks may change, positions may not. */
  if(!lift._tiles||lift._tiles.ex!==ex||Math.abs(lift._tiles.kg-kg)>=0.05)
    lift._tiles={ex,kg,list:repChoices(ex,kg)};
  const mark=sugReps(ex,kg);
  /* v3.3.154: ×12, not 12 — bare numbers under a weight stepper read as
     weight presets (the same stranger's other trip). × is the app's own
     rep grammar: every record already says "50kg × 10". */
  return lift._tiles.list.map(r=>
    `<button data-rep="${r}"${mark.has(r)?' class="sug" aria-label="'+r+' reps, done last time"':''}><span class="rx">×</span>${r}</button>`
  ).join('');
}
function refreshReps(){
  const g=document.querySelector('.repgrid'); if(!g||!lift.ex) return;
  const kg=toKg(+(document.getElementById('wv')?.value||0));
  g.innerHTML=repTilesHTML(lift.ex,kg);
}
/* load line inner: fixed-width bar picture so the text never shifts */
function loadInner(ex,kg){
  if(lift.editBar){
    return `<span class="ll-text" style="flex:1">
              <label class="mono" style="font-size:10px;color:var(--muted);display:block;margin-bottom:4px">Bar weight for ${ex} (${U()})</label>
              <input id="barIn" type="number" inputmode="decimal" step="0.5" value="${wDisp(barKg(ex))}" class="barinput">
            </span>
            <button class="ll-bar save" data-savebar="${ex}">This lift</button>
            <button class="ll-bar save" data-savebarall="${ex}">All ${equipOf(ex)==='smith'?'Smith':'barbell'}</button>
            <button class="ll-bar" data-cancelbar="1">Cancel</button>`;
  }
  return `<span class="ll-viz">${barViz(ex,kg)}</span><span class="ll-text">${loadLine(ex,kg)}</span>
          <button class="ll-bar" data-editbar="${ex}">bar<br><b>${wDisp(barKg(ex))}${U()}</b> ✎</button>`;
}


/* ---------- Run ----------------------------------------------------------
   Distance is stored in km (the sheet's "KM Ran" column); mins/secs are the
   clock. Only ~825 of the runs ever got a time written down, so pace is
   computed from the timed distance alone — an untimed run adds km but never
   drags the pace. */
function runDays(){
  const m={};
  const add=(d,km,mins,secs)=>{
    const e=m[d]||(m[d]={km:0,sec:0,timed:0});
    const s=(mins||0)*60+(secs||0);
    e.km+=km||0;
    if(s>0){ e.sec+=s; e.timed+=km||0; }
  };
  for(const [d,list] of Object.entries(SEED.sessions))
    for(const r of list) if(r[1]==='Run') add(d,r[2],r[4],r[5]);
  for(const [d,v] of Object.entries(DB.days)){
    if(d<=SEED.totals.last) continue;                 // seed already has it
    for(const s of v.w) if(s.ex==='Run') add(d,s.w,s.mins,s.secs);
  }
  return Object.entries(m).filter(([,e])=>e.km>0)
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([d,e])=>({d,km:e.km,sec:e.sec,timed:e.timed}));
}
/* v3.3.236: nine months of pace, hoisted to module scope with the other
   tuning constants so it has one definition site and the suite can read it. */
const PACE_MONTHS=9;
const paceStr=s=>s>0?`${Math.floor(s/60)}'${String(Math.round(s%60)).padStart(2,'0')}"`:'—';
const paceOf=r=>r.timed>0?r.sec/toD(r.timed):0;      // seconds per displayed unit
function runStreak(days){
  const s=new Set(days.map(r=>r.d));
  let n=0, d=new Date(todayISO+'T00:00');
  if(!s.has(todayISO)) d.setDate(d.getDate()-1);      // today may simply not have happened
  while(s.has(d.toLocaleDateString('en-CA'))){n++;d.setDate(d.getDate()-1);}
  return n;
}
const weekOf=iso=>{const [y,m,dd]=iso.split('-').map(Number);
  const dt=new Date(y,m-1,dd); dt.setDate(dt.getDate()-dt.getDay());   // Sunday start, like the sheet
  return dt.toLocaleDateString('en-CA');};
// v3.3.132: weekNum removed — Every week labels by month boundary now, and
// nothing else read the sheet's week number.

/* v3.3.271: runStatsHTML() DELETED — defined, never called, and carrying
   the pre-v3.3.265 Pace chart whose tip still promised "Red marks your
   fastest month", a mark that no longer exists anywhere in the app. Dead
   code that documents retired behaviour is how stale rules get quoted back
   as current (the v3.3.252 lesson). runStatsHTML217() below is the live
   run story. */
function runStatsHTML217(){
  const days=runDays(); if(!days.length) return '';
  const total=days.reduce((a,r)=>a+toD(r.km),0), ytdRows=days.filter(r=>r.d.startsWith(thisYear));
  const ytd=ytdRows.reduce((a,r)=>a+toD(r.km),0), recent=days.filter(r=>daysAgo(r.d)>=0&&daysAgo(r.d)<28);
  const recentAvg=recent.length?recent.reduce((a,r)=>a+toD(r.km),0)/recent.length:total/days.length;
  const timed=days.filter(r=>r.timed>0), avgPace=timed.length?timed.reduce((a,r)=>a+r.sec,0)/timed.reduce((a,r)=>a+toD(r.timed),0):0;
  const mo=todayISO.slice(0,7), monthName=new Date(todayISO+'T00:00').toLocaleDateString('en-US',{month:'long'});
  const monthRows=days.filter(r=>r.d.startsWith(mo)), monthKm=monthRows.reduce((a,r)=>a+toD(r.km),0);
  const STEP=25,next=Math.max(STEP,(Math.floor(monthKm/STEP)+1)*STEP),left=Math.max(0,next-monthKm),monthRate=monthKm/Math.max(1,+todayISO.slice(8));
  const etaDays=monthRate?Math.ceil(left/monthRate):null;
  const monthSec=monthRows.reduce((a,r)=>a+r.sec,0),monthTimedKm=monthRows.reduce((a,r)=>a+toD(r.timed),0);
  const monthPace=monthTimedKm?monthSec/monthTimedKm:0,monthLongest=monthRows.length?Math.max(...monthRows.map(r=>toD(r.km))):0;
  const dim=new Date(+mo.slice(0,4),+mo.slice(5),0).getDate(),projection=monthKm/+todayISO.slice(8)*dim;
  const monthHrs=Math.floor(monthSec/3600),monthMins=Math.round(monthSec%3600/60);
  /* v3.3.230: one current running card. The month, its next milestone, and
     the useful summary metrics are one decision surface; the year race,
     pace history, and fair weekly comparison remain below unchanged. */
  let h=`<h2 id="secRun">Running · ${monthName}${hActs('runmonth',`This month, its projected finish, and the next ${STEP} ${DU()} milestone.`,'About Running this month')}</h2>
    <div class="card runmonth"><div class="runmonthhero"><strong>${dDisp(monthKm)} <small>${DU()}</small></strong><span>PROJECTED<b>≈ ${Math.round(projection)} ${DU()}</b></span></div>
      <div class="runmonthgoal"><div class="mstone"><span class="big">${left.toFixed(1)} ${DU()}</span><span class="goal">to ${next} this month</span></div>
        <div class="mbar"><i style="width:${Math.max(2,Math.min(100,monthKm/next*100)).toFixed(1)}%"></i></div>
        <div class="tot"><span><b>${dDisp(monthKm)} ${DU()}</b> logged</span><span>${etaDays?`about ${etaDays} day${etaDays===1?'':'s'} at this pace`:'log a run to start'}</span></div></div>
      <div class="runmonthgrid"><span><b>${monthRows.length}</b>runs</span><span><b>${monthRows.length?dDisp(monthKm/monthRows.length):'—'} ${DU()}</b>average</span><span><b>${monthPace?paceStr(monthPace):'—'}</b>pace / ${DU()}</span><span><b>${monthRows.length?dDisp(monthLongest):'—'} ${DU()}</b>longest</span><span><b>${monthHrs}:${String(monthMins).padStart(2,'0')}</b>on feet</span><span><b>${Math.round(monthKm/next*100)}%</b>to ${next} ${DU()}</span></div>
      <div class="runmonthfoot"><span>${Math.round(ytd)} ${DU()} in ${thisYear}</span><span>${fmt(Math.round(total))} ${DU()} · ${days.length} runs since ${md(days[0].d)}</span><span>${dDisp(recentAvg)} ${DU()} avg · 28 days</span><span>${paceStr(avgPace)} avg pace</span></div></div>`;

  /* Same-date distance race. The existing race scrubber now reads distance
     when data-race-unit is present, so its scoreboard moves under a thumb. */
  const RC=runYearCurves(), current=RC[thisYear], previous=RC[String(+thisYear-1)];
  if(current){
    const prevYear=String(+thisYear-1), n=current.end, cv=Array.from(current.curve), pv=previous?Array.from(previous.curve.slice(0,n)):Array(n).fill(0);
    while(pv.length<n) pv.push(pv.at(-1)||0);
    const ct=cv.at(-1)||0,pt=pv.at(-1)||0,gap=ct-pt,max=Math.max(10,ct,pt),yMax=Math.ceil(max/25)*25;
    const x0=30,xw=276,y0=180,yh=145,X=i=>x0+i/Math.max(1,n-1)*xw,Y=v=>y0-v/yMax*yh;
    const cp=cv.map((v,i)=>`${X(i).toFixed(1)},${Y(v).toFixed(1)}`),pp=pv.map((v,i)=>`${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
    const area=cp.join(' ')+' '+pp.slice().reverse().join(' ');
    /* v3.3.232: the share view measures each year against LAST YEAR'S FINISH.
       "476 km — 92% of all 2025" says something a total cannot: how close a
       part-year already is to a whole one. Falls back to totals when the
       previous year has no distance to measure against, because a share of
       zero is not a number worth printing. */
    const shares=raceShares(), prevFull=yearTotalKm(+prevYear);
    const canShare=shares&&prevFull>0;
    const pctOf=v=>Math.round(v/prevFull*100);
    const showN=v=>canShare?pctOf(v)+'%':Math.round(v);
    const unit=canShare?`of all ${prevYear}`:DU();
    const gapCopy=canShare
      ?(()=>{const g=pctOf(ct)-pctOf(pt);
        return g>0?`+${g} pts<small>ahead</small>`:g<0?`${Math.abs(g)} pts<small>behind</small>`:`Even<small>same date</small>`;})()
      :(gap>0?`+${Math.round(gap)} ${DU()}<small>ahead</small>`:gap<0?`${Math.abs(Math.round(gap))} ${DU()}<small>behind</small>`:`Even<small>same date</small>`);
    h+=`<h2>Distance${hActs('cumkm',`Cumulative ${DU()} through the same calendar date in both years. Drag to compare earlier dates.`,'About Distance')}</h2>
      <div class="card conrace runrace" data-current-year="${thisYear}" data-previous-year="${prevYear}"
      data-cur="${ct}" data-prev="${pt}" data-denom="${prevFull}"
      data-unit-total="${DU()}" data-unit-share="of all ${prevYear}" data-gap-unit="${DU()}">
      <div class="conkick" data-con-date>YOU VS YOU · ${new Date(todayISO+'T00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}).toUpperCase()}</div>
      <div class="conscore runscore" data-raceswap role="button" tabindex="0"
        aria-label="Show ${canShare?'totals':'share of last year'} instead"><span><small>${prevYear} you</small><b data-con-count="${prevYear}">${showN(pt)}</b><small data-con-unit>${unit}</small></span>
        <strong class="congap ${gap>=0?'up':''}" data-con-gap>${gapCopy}</strong>
        <span><small>${thisYear} you</small><b data-con-count="${thisYear}">${showN(ct)}</b><small data-con-unit>${unit}</small></span></div>
      <div class="zoom conzoom" data-zoom><svg viewBox="0 0 340 205" role="img" data-scrub="race" data-race-unit="${DU()}"
        data-scrub-year="${thisYear}" data-sx0="${x0}" data-sxw="${xw}" data-sy0="${y0}" data-syh="${yh}" data-smax="${yMax}">`;
    for(let g=0;g<=4;g++){const v=yMax*g/4,y=Y(v);h+=`<line x1="${x0}" y1="${y}" x2="${x0+xw}" y2="${y}" stroke="var(--line)" stroke-width=".6" ${g?'stroke-dasharray="2 3"':''}></line><text x="26" y="${y+3}" text-anchor="end" font-family="var(--mono)" font-size="7" fill="var(--muted)">${Math.round(v)}</text>`;}
    /* v3.3.236: slice(5) yields "08-14", and +"08-14" is NaN — so `m<=NaN`
       was false on the first test and the month row never drew a single
       letter. slice(5,7) is the month alone. */
    for(let m=0;m<=+todayISO.slice(5,7)-1;m++){const di=Math.min(n-1,doy(`${thisYear}-${String(m+1).padStart(2,'0')}-15`)-1);h+=`<text x="${X(di)}" y="195" text-anchor="middle" font-family="var(--mono)" font-size="7" fill="var(--muted)">${'JFMAMJJASOND'[m]}</text>`;}
    h+=`<polygon points="${area}" fill="var(--accent-soft)" opacity=".65"></polygon>
      <polyline data-yr="${prevYear}" data-values="${pv.join(',')}" points="${pp.join(' ')}" fill="none" stroke="var(--faint)" stroke-width="1.5"></polyline>
      <polyline data-yr="${thisYear}" data-values="${cv.join(',')}" points="${cp.join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.5"></polyline>
      <circle class="beacon conend" cx="${X(n-1)}" cy="${Y(ct)}" r="3.2" fill="var(--accent)"></circle></svg></div></div>`;
  }

  /* v3.3.234: readable time furniture. Grid ticks land on clock values a
     runner can predict (15 or 30 seconds), every point names its value, and
     colour belongs to the MARKS rather than changing the label ink. */
  const pm={}; for(const r of days){if(r.timed<=0)continue;const k=r.d.slice(0,7),e=pm[k]||(pm[k]={sec:0,d:0});e.sec+=r.sec;e.d+=toD(r.timed);}
  /* v3.3.265: nine months, with one centered value directly above every
     point. The 34.75-unit point spacing clears a six-character pace label at
     this type size. Scrubbing remains for the full month/year identity.
     v3.3.268: the newest month's label is accent blue and bold. This is not
     the red exception v3.3.265 removed — that coloured a VERDICT (fastest),
     which is a claim about performance. This colours RECENCY, which is a
     fact about the calendar, and it is the same grammar the Session build
     totals row already speaks: newest at full voice, the archive quiet. */
  const paces=Object.entries(pm).sort().slice(-PACE_MONTHS).map(([m,e])=>[m,e.sec/e.d]);
  if(paces.length){
    const lo=Math.min(...paces.map(v=>v[1])),hi=Math.max(...paces.map(v=>v[1])),span=Math.max(hi-lo,15),tick=span<=45?15:30;
    const base=Math.floor((lo-tick*.6)/tick)*tick,top=Math.max(base+tick*2,Math.ceil((hi+tick*.6)/tick)*tick);
    const x0=34,xw=278,y0=108,yh=72,Y=p=>30+(top-p)/(top-base)*yh;
    const fmtAxis=s=>`${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`;
    const monthLab=m=>'JFMAMJJASOND'[+m.slice(5)-1];
    let marks='',poly='';
    for(let p=base;p<=top+.1;p+=tick){const y=Y(p);marks+=`<line x1="${x0}" y1="${y}" x2="${x0+xw}" y2="${y}" stroke="var(--line)" stroke-width=".6" stroke-dasharray="2 3"></line><text x="29" y="${y+2.5}" text-anchor="end" font-family="var(--mono)" font-size="6.5" fill="var(--muted)">${fmtAxis(p)}</text>`;}
    paces.forEach(([m,p],i)=>{const x=x0+i*xw/Math.max(1,paces.length-1),y=Y(p),latest=i===paces.length-1;poly+=`${x},${y} `;marks+=`${latest?`<circle class="beacon" cx="${x}" cy="${y}" r="4.8" fill="var(--accent-soft)" opacity=".8"></circle>`:''}<circle class="pacepoint${latest?' latest':''}" cx="${x}" cy="${y}" r="${latest?2.8:2.4}" fill="var(--accent)" data-pm="${m}" data-pp="${Math.round(p)}"></circle><text class="paceval${latest?' latest':''}" x="${x}" y="${y-7}" text-anchor="middle" font-family="var(--mono)" font-size="8" font-weight="${latest?700:600}" fill="${latest?'var(--accent)':'var(--muted)'}">${paceStr(p)}</text><text class="pacemonth" x="${x}" y="123" text-anchor="middle" font-family="var(--mono)" font-size="6.5" fill="var(--muted)">${monthLab(m)}</text>`;});
    const yrs=[...new Set(paces.map(v=>v[0].slice(0,4)))];
    h+=`<h2 class="charthead">Pace${hActs('pace',`Average minutes per ${DU()} by month. Lower is faster. Tap or drag to read the full month and year.`,'About Pace')}</h2><div class="card pacecard"><svg class="pacescrub" viewBox="0 0 330 142" style="width:100%;height:auto"><text x="8" y="13" font-family="var(--mono)" font-size="7" fill="var(--faint)">${yrs.join(' / ')}</text><line x1="${x0}" y1="${y0}" x2="${x0+xw}" y2="${y0}" stroke="var(--line)" stroke-width=".8"></line><polyline points="${poly}" fill="none" stroke="var(--accent)" stroke-width="1.3"></polyline>${marks}<line class="pacevline" x1="0" y1="26" x2="0" y2="${y0}" stroke="var(--line)" stroke-width="1" opacity="0"></line>
      <circle class="pacehalo" r="6" cx="0" cy="0" fill="none" stroke="var(--chalk)" stroke-width="1.4" opacity="0" pointer-events="none"></circle>
      <rect class="pacepad" x="${x0}" y="26" width="${xw}" height="${y0-26}" fill="transparent"></rect></svg>
      <div class="pacecap" data-pacecap>&nbsp;</div></div>`;
  }

  /* Fair weekly pace: every bar ends on today's weekday, so an unfinished
     week never competes with seven completed days. */
  const cutoff=new Date(todayISO+'T00:00').getDay(),starts=[],curStart=new Date(weekOf(todayISO)+'T00:00');
  for(let i=11;i>=0;i--){const d=new Date(curStart);d.setDate(d.getDate()-i*7);starts.push(d.toLocaleDateString('en-CA'));}
  const vals=starts.map(s=>days.reduce((sum,r)=>{const dd=daysBetween(s,r.d);return sum+(dd>=0&&dd<=cutoff?toD(r.km):0);},0)),max=Math.max(1,...vals);
  const shortMD=s=>{const d=new Date(s+'T00:00');return `${d.getMonth()+1}/${d.getDate()}`;};
  /* v3.3.236: the baseline drops 104 -> 114 (viewBox 126 -> 136) so the
     tallest bar's value label clears the card's year caption instead of
     sitting 5px under it. Bar heights are unchanged; only the plot moved. */
  let bars=''; vals.forEach((v,i)=>{const x=9+i*25.5,bh=Math.max(2,v/max*84),cur=i===vals.length-1;bars+=`<rect class="gbar" x="${x}" y="${114-bh}" width="17" height="${bh}" rx="3" fill="${cur?'var(--accent)':'var(--accent-dim)'}" opacity="${cur?1:.58}"></rect><text x="${x+8.5}" y="${114-bh-4}" text-anchor="middle" font-family="var(--mono)" font-size="7" fill="var(--muted)" font-weight="${cur?'700':'500'}">${Math.round(v)}</text><text x="${x+8.5}" y="128" text-anchor="middle" font-family="var(--mono)" font-size="6" fill="var(--muted)">${shortMD(starts[i])}</text>`;});
  const dayName=new Date(todayISO+'T00:00').toLocaleDateString('en-US',{weekday:'long'});
  h+=`<h2 class="charthead">Every week${hActs('eweek',`Each week is compared through ${dayName}, so the current week is not penalized for days that have not happened.`,'About Every week')}</h2><div class="card weekcard"><svg viewBox="0 0 330 136" style="width:100%;height:auto"><text x="9" y="11" font-family="var(--mono)" font-size="7" fill="var(--faint)">${thisYear} · THROUGH ${dayName.toUpperCase()}</text><line x1="9" y1="114" x2="313" y2="114" stroke="var(--line)" stroke-width=".6"></line>${bars}</svg><div class="tot"><span><b>${vals.at(-1).toFixed(1)} ${DU()}</b> this week</span><span>all bars through ${dayName.slice(0,3)}</span></div></div>`;
  return h;
}


/* ---------- D2: live consequence on the Add set button ---------- */
function updAddPreview(){
  const rc=document.getElementById('rc'), btn=document.getElementById('addrep');
  if(!rc||!btn) return;
  const r=parseInt(rc.value,10);
  if(!(r>0)||!lift.weight){ btn.textContent='Add set'; return; }
  const t=day(todayISO);
  let cur=0; for(const s of t.w) if(s.ex!=='Run') cur+=s.w*(s.reps||[]).reduce((a,b)=>a+b,0);
  const nv=cur+lift.weight*r;
  const dist=fireDist('vol');
  let gain=0;
  if(dist.length>=30){
    const rank=x=>{let lo=0,hi=dist.length;while(lo<hi){const m=(lo+hi)>>1;if(dist[m]<=x)lo=m+1;else hi=m;}return lo;};
    gain=rank(nv)-rank(cur);
  }
  btn.innerHTML=`Add set<span class="addsub">→ <b>${fmt(Math.round(nv))}</b> ${U()}${gain>0?` ▲${gain}`:''}</span>`;
}
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='rc') updAddPreview(); });


/* D2: the day's volume COUNTS UP to its new total after a save */
let _lastVol={ex:null,v:0};
function volCountUp(){
  const el=document.getElementById('volNum'); if(!el) return;
  const nv=parseFloat(el.dataset.kg||'0');
  const from=(_lastVol.ex===lift.ex)?_lastVol.v:null;
  _lastVol={ex:lift.ex,v:nv};
  if(from===null||from>=nv) return;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const t0=performance.now(), D=350;
  const step=now=>{
    const p=Math.min(1,(now-t0)/D), e=1-Math.pow(1-p,3);
    el.textContent=vDisp(from+(nv-from)*e);
    if(p<1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}


/* D3: tap a Last Time row — that weight loads into the logger */
document.addEventListener('click',e=>{
  const row=e.target.closest('.lastrow[data-lw]'); if(!row) return;
  const wv=document.getElementById('wv'); if(!wv) return;
  lift.weight=+row.dataset.lw;
  saveExW(lift.ex,lift.weight); save(true);
  wv.value=wDisp(lift.weight);
  wv.classList.remove('wflash'); void wv.offsetWidth; wv.classList.add('wflash');
  refreshLoad();
  if(typeof updAddPreview==='function') updAddPreview();
});

/* ---------- v3.3.18: the live chart speaks the Daily Fire's language ----------
   Sungjee's spec, from his own Sheet dashboard: mid-workout he wants to see
   TODAY RISING against this exercise's history — not six identical bars.
   Grammar is the fire card's: gray bars are your past sessions, the red bar
   is you, right now. It GROWS with every set (380ms rise), breathes gently
   while the session is live, and hunts the dashed all-time-best line. Cross
   the line and the label concedes: "best — beaten". */
function exSessionVols(ex){
  const by={};
  for(const [d,rows] of Object.entries(SEED.sessions))
    for(const r of rows) if(r[1]===ex&&(r[3]||[]).length)
      by[d]=(by[d]||0)+r[2]*r[3].reduce((a,b)=>a+b,0);
  for(const [d,v] of Object.entries(DB.days)){
    if(d<=SEED.totals.last||d===todayISO) continue;
    for(const s of v.w) if(s.ex===ex&&(s.reps||[]).length)
      by[d]=(by[d]||0)+volOf(s);
  }
  delete by[todayISO];
  return Object.entries(by).sort((a,b)=>a[0].localeCompare(b[0])).map(([d,v])=>({d,v}));
}
function liveBars(ex,sets,head){
  const hist=exSessionVols(ex);
  const now=sets.reduce((a,s)=>a+volOf(s),0);
  const shown=hist.slice(-15);
  const best=Math.max(...hist.map(h=>h.v),1);
  const beaten=now>best;
  const mx=Math.max(best,now,...shown.map(h=>h.v))*1.1;
  const W=330,H=138,base=106;
  const n=shown.length+1, gap=Math.min(24,(W-70)/n), bw=Math.max(6,Math.min(16,gap-4));
  /* v3.3.164: the chart is scrubbable — drag across the bars and the line
     above reads DATE · VOLUME for whichever bar is under your finger. The
     readout sits ABOVE the chart (the v3.3.109 lesson: below it, it hides
     under the hand doing the scrubbing). */
  let h=`<h2>${head||'Today · live'}</h2><div class="card lbwrap">
    <div class="lbread mono">&nbsp;</div>
    <svg class="lbsvg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;touch-action:pan-y">`;
  const by=base-(best/mx)*88;
  h+=`<line x1="8" y1="${by.toFixed(1)}" x2="${W-8}" y2="${by.toFixed(1)}" stroke="var(--record)" stroke-width="0.8" stroke-dasharray="3 3" opacity=".75"></line>
      <text x="${W-10}" y="${(by-4).toFixed(1)}" text-anchor="end" font-family="var(--mono)" font-size="7.5" fill="var(--record)">${beaten?'best — beaten ✓':`best ${fmt(Math.round(toU(best)))}`}</text>`;
  shown.forEach((s2,i2)=>{
    const bh=Math.max(2.5,(s2.v/mx)*88), x=10+i2*gap;
    h+=`<rect class="lbbar" data-d="${s2.d}" data-v="${s2.v}" data-cx="${(x+bw/2).toFixed(1)}" x="${x.toFixed(1)}" y="${(base-bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="var(--line)"></rect>`;
  });
  const nh=Math.max(3,(now/mx)*88), nx=10+shown.length*gap;
  h+=`<rect class="lbNow lbbar" data-d="${todayISO}" data-v="${now}" data-cx="${(nx+Math.max(bw,12)/2).toFixed(1)}" x="${nx.toFixed(1)}" y="${(base-nh).toFixed(1)}" width="${Math.max(bw,12).toFixed(1)}" height="${nh.toFixed(1)}" rx="2.5" fill="var(--live)"></rect>
      <text x="${(nx+Math.max(bw,12)/2).toFixed(1)}" y="${(base-nh-5).toFixed(1)}" text-anchor="middle" font-family="var(--mono)" font-size="8.5" font-weight="700" fill="${beaten?'var(--record)':'var(--live)'}">${vDisp(now)}</text>
      <text x="${(nx+Math.max(bw,12)/2).toFixed(1)}" y="${base+11}" text-anchor="middle" font-family="var(--mono)" font-size="7.5" font-weight="700" fill="var(--live)">now</text>`;
  const beats=shown.filter(s2=>now>s2.v).length;
  h+=`<text x="10" y="${H-4}" font-family="var(--mono)" font-size="7.5" fill="var(--muted)">${sets.length} set${sets.length>1?'s':''} · beats ${beats} of your last ${shown.length} ${ex} sessions</text>`;
  h+=`</svg></div>`;
  return h;
}
/* v3.3.164: scrub — pointer x → nearest bar → readout + highlight. Bound
   per-render (idempotent flag), pointer events so trackpads work too. */
function bindLbScrub(){
  const svg=document.querySelector('.lbsvg');
  if(!svg||svg._scrub) return; svg._scrub=true;
  const read=svg.parentElement.querySelector('.lbread');
  const pick=e=>{
    const r=svg.getBoundingClientRect();
    const vx=(e.clientX-r.left)/r.width*330;
    let best=null,bd=1e9;
    svg.querySelectorAll('.lbbar').forEach(b=>{
      const d=Math.abs(+b.dataset.cx-vx);
      if(d<bd){bd=d;best=b;}
    });
    if(!best) return;
    svg.querySelectorAll('.lbbar').forEach(b=>{
      if(b.classList.contains('lbNow')) return;
      b.setAttribute('fill',b===best?'var(--accent)':'var(--line)');
    });
    const d=best.dataset.d, v=+best.dataset.v;
    read.textContent=(d===todayISO?'today':`${wd2(d)} ${d.slice(5).replace('-','/')}`)+` · ${vDisp(v)} ${U()}`;
  };
  svg.addEventListener('pointerdown',e=>{svg._on=true;pick(e);});
  svg.addEventListener('pointermove',e=>{if(svg._on)pick(e);});
  const off=()=>{svg._on=false;};   // readout persists — the answer stays readable
  svg.addEventListener('pointerup',off); svg.addEventListener('pointercancel',off);
}
/* the red bar RISES: scaleY from the previous total to the new one */
let _lbPrev={ex:null,v:0};
function lbGrow(){
  const r=document.querySelector('.lbNow'); if(!r){ _lbPrev={ex:null,v:0}; return; }
  const nv=parseFloat(r.dataset.v||'0');
  const from=(_lbPrev.ex===lift.ex)?_lbPrev.v:null;
  _lbPrev={ex:lift.ex,v:nv};
  if(from===null||from<=0||from>=nv) return;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  r.style.transition='none';
  r.style.transform=`scaleY(${(from/nv).toFixed(3)})`;
  requestAnimationFrame(()=>{requestAnimationFrame(()=>{
    r.style.transition='transform .38s cubic-bezier(.2,.8,.3,1)';
    r.style.transform='scaleY(1)';
  });});
}
