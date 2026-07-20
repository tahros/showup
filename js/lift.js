/* ShowUp — lift.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
function renderLift(){
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

    let h=`<h2>Body part</h2><div class="partgrid">`;
    [...order,...dormant].forEach(p=>{
      const i0=P.info[p]||{since:999};
      const virgin=SEED.totals.sessions===0&&!hasAnyDays();   // day zero: no verdicts yet
      const dead=!virgin&&dormant.includes(p);
      const sel=p===lift.part;
      const hasToday=(day(todayISO).w||[]).some(s=>s.part===p);
      const open=hasToday&&partOpen(p);                    // being worked RIGHT NOW
      const finished=hasToday&&!open;                      // trained today, completed
      const sub = open ? '🔥 today'
                : finished ? '✅ today'
                : dead ? 'dormant'
                : p==='Run' ? 'each time'
                : virgin ? 'new'
                : `${i0.since}d ago`;
      const cls = [dead?'dead':'', p==='Run'&&!hasToday?'run':'',
                   (p===P.pick&&!hasToday&&!isLive())?'hot':'',   // no suggestions mid-workout
                   open?'liveP':'', finished?'finP':''].filter(Boolean).join(' ');
      h+=`<button class="partcard ${sel?'sel':''} ${cls}" data-part="${p}">
            <b>${p}</b><span class="ps">${sub}</span></button>`;
    });
    h+=`</div>`;

    // today's sets, filtered to the selected part
    const mine=t.w.filter(s=>s.part===lift.part);
    h+=`<h2>${lift.part} · today</h2>`;
    if(!mine.length){
      h+=`<div class="card muted" style="font-size:13px">Nothing logged for ${lift.part} today. Pick an exercise below.</div>`;
    }else{
      const byEx={};
      mine.forEach(s=>{(byEx[s.ex]=byEx[s.ex]||[]).push(s);});
      for(const [ex,list] of Object.entries(byEx)){
        const isRun=ex==='Run';
        const sub=isRun
          ?list.map(s=>`${dDisp(s.w)} ${DU()} · ${s.mins||0}'${String(s.secs||0).padStart(2,'0')}"`).join('  ')
          :list.map(s=>`${wDisp(s.w)}${U()} × ${s.reps.join(',')}`).join('   ');
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
              <div class="smeter"><i style="width:${Math.min(100,pct)}%" class="${pct>=100?'over':''}"></i></div>
              <div class="tot"><span><b>${disp(cur)}</b> today</span><span>usual ≈ ${disp(usual)}</span></div>
            </div>`;
      }
      if(partOpen(lift.part)) h+=`<button class="btn done" id="donePartBtn">✓ Complete ${lift.part}</button>`;
      else if(dayMeta().donePart.includes(lift.part))
        h+=`<button class="btn ghost" id="reopenPartBtn" style="margin-top:12px">${lift.part} completed ✓ — Reopen</button>`;
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
      return `<div class="item logrow ${big?'goto':''}" style="${big?'':'padding:10px 10px 10px 14px'}">
            <button class="logmain" data-ex="${ex}">
              <b>${ex}</b><div class="sub">${meta}${mine?` · yours · ${eq.toLowerCase()}`:''}</div>
            </button>
            <span class="pr-cell">
              <span class="pr-top">${p.mw?wDisp(p.mw)+U():''}</span>
              ${side?`<span class="pr-side">${side}</span>`:''}
            </span>
            ${(mine&&!last)?`<button class="xbtn" data-delex="${ex}" aria-label="Delete ${ex}">✕</button>`:''}
          </div>`;
    };
    const goto=list.filter(x=>x.tier==='goto').sort((a,b)=>b.freq-a.freq||(b.last||'').localeCompare(a.last||''));
    const some=list.filter(x=>x.tier==='sometimes').sort((a,b)=>(b.last||'').localeCompare(a.last||''));
    const fresh=list.filter(x=>x.tier==='new').sort((a,b)=>a.ex.localeCompare(b.ex));
    if(goto.length){
      h+=`<h2>${lift.part} · go-to</h2>`;
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
            <div class="note">Barbell and Smith get the bar + per-side plate math. Dumbbell shows "per hand". Bodyweight logs added weight only.</div>
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
             ${sets.map(s=>`${wDisp(s.w)}${U()}×${s.r}`).join('  ')}<br>
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
  let prFoot='';
  if(!isRun){
    if(lastPrev){
      /* v3.1.4: one row per weight, however the sets were stored. Sheet-era
         rows arrive pre-grouped; app-era logging writes one row per set —
         fold CONSECUTIVE same-weight sets so both eras read identically.
         (Consecutive, not global: returning to a weight later stays its own
         line — the card keeps the session's narrative order.)
         Bare marker rows (0 kg, no reps, no time) carry nothing: dropped. */
      const folded=[];
      for(const [w2,reps,mins,secs] of lastPrev.sets){
        if((!reps||!reps.length)&&mins==null&&w2<=0.01) continue;
        const prev=folded[folded.length-1];
        if(prev&&prev[0]===w2&&prev[2]==null&&mins==null) prev[1]=prev[1].concat(reps||[]);
        else folded.push([w2,(reps||[]).slice(),mins,secs]);
      }
      const rows=folded.map(([w2,reps,mins,secs])=>{
        const chips=(reps&&reps.length)
          ? reps.map(r2=>`<i class="repchip">${r2}</i>`).join('')
          : (mins!=null?`<i class="repchip">${mins}${secs?`'${String(secs).padStart(2,'0')}`:'′'}</i>`:'');
        const wtxt=isBody(ex)&&w2<=0.01?'BW':`${wDisp(w2)} <span class="u">${U()}</span>`;
        return `<div class="lastrow" data-lw="${w2}" role="button"><span class="lastw mono">${wtxt}</span><span class="lastreps">${chips}</span></div>`;
      }).join('');
      const vol=folded.reduce((a,[w2,reps])=>a+w2*(reps||[]).reduce((x,y)=>x+y,0),0);
      const nsets=folded.reduce((a,[,reps])=>a+Math.max(1,(reps||[]).length),0);
      prFoot=`<div class="lastcard">
        <div class="lasthead"><span>LAST TIME</span><button class="ago linkdate" data-histd="${lastPrev.d}">${wd2(lastPrev.d)} · ${agoStr(lastPrev.d)}</button></div>
        ${rows}
        <div class="lastfoot mono">${nsets} set${nsets>1?'s':''}${vol>0?` · ${vDisp(vol)} ${U()} total`:''}</div>
      </div>`;
    }else{
      prFoot=`<div class="lastcard first"><div class="lasthead"><span>LAST TIME</span></div>
        <div class="muted" style="font-size:13px">Never logged — today writes the first line.</div></div>`;
    }
  }

  // ---- suggested sets: shortcut keys, not a to-do list. Tap = log that w×r
  //      (again and again, if you like). ✕ dismisses one for today. Max 6 shown.
  //      Your LATEST logged set always leads — one tap duplicates it.
  //      Rendered BELOW "Log a set" (v2.10); built here because the log zone
  //      needs `ls` for its default weight.
  const ls=suggestedFor(ex);
  let sugHTML='';
  {
    const when=ls?(daysAgo(ls.d)===1?'yesterday':`${daysAgo(ls.d)}d ago`):'';
    const dis=new Set(dayMeta().sugX[ex]||[]);
    const lastToday=(!isRun&&todaySets.length)?todaySets[todaySets.length-1]:null;
    let pool=[];
    if(lastToday&&lastToday.reps.length)
      pool.push({w:lastToday.w,r:lastToday.reps[0],key:`now|${lastToday.w}|${lastToday.reps[0]}`,now:true});
    (ls?ls.sets:[]).forEach((s,i)=>pool.push({w:s.w,r:s.r,key:`${s.w}|${s.r}|${i}`}));
    const seenWR=new Set();
    pool=pool.filter(c=>{const k=`${c.w}x${c.r}`;if(seenWR.has(k))return false;seenWR.add(k);return true;});
    const chips=pool.filter(c=>!dis.has(c.key)).slice(0,6);
    if(chips.length){
      const mini=todaySets.length>0;
      const lastLine=ls?`Last session — ${wd(ls.d)}: ${ls.sets.map(s=>`${isBody(ex)&&s.w<=0.01?'BW':wDisp(s.w)}×${s.r}`).join(' · ')}`:'';
      sugHTML+=`<div class="zone ${mini?'mini':''}">
          <div class="zonehead">
            <span style="position:relative">Suggested
              <button class="ibtn" id="infoBtn" aria-label="What is this?">i</button>
              ${lift.info?`<span class="tipbubble">${ls
                ?(ls.from?`Carried over from ${ls.from} (${wd(ls.d)}).`:`From your last ${ex} session — ${when}.`)
                :`Your latest set, ready to repeat.`}
                Shortcuts — tap to log that set, ✕ to dismiss.
                ${lastLine?`<span class="tipline">${lastLine}</span>`:''}</span>`:''}
            </span>
          </div>
          <div class="lastsets">`;
      chips.forEach(c=>{
        sugHTML+=`<span class="lschip">
              <button class="lastset ${c.now?'now':''}" data-rep-w="${c.w}" data-rep-r="${c.r}">
                <span class="ls-w">${isBody(ex)&&c.w<=0.01?'BW':`${wDisp(c.w)}<small>${U()}</small>`}</span>
                <span class="ls-x">×</span>
                <span class="ls-r">${c.r}</span></button>
              <button class="lsx" data-sugx="${c.key}" aria-label="Dismiss">✕</button>
            </span>`;
      });
      sugHTML+=`</div>`;
      if(!mini) sugHTML+=`<div class="row" style="gap:8px;margin-top:10px">
            <button class="btn ghost" id="repeatAll" style="margin:0">Log all ${chips.length}</button>
            <button class="btn ghost" id="copySets" style="margin:0">Copy suggestion →</button>
          </div>`;
      sugHTML+=`</div>`;
    }
  }

  if(isRun){
    h+=`<div class="zone prime"><div class="zonehead"><span>Log a run</span></div>
        <div class="runrow" style="margin:10px 0">
          <div class="fld"><label>Distance ${DU()}</label><input id="rk" type="number" inputmode="decimal" step="0.01" placeholder="0.00"></div>
          <div class="fld"><label>Min</label><input id="rm" type="number" inputmode="numeric" placeholder="0"></div>
          <div class="fld"><label>Sec</label><input id="rs" type="number" inputmode="numeric" placeholder="0"></div>
        </div><button class="btn" id="addrun">Add run</button></div>`;
    /* v3.1.9: the Run view finally shows its history — recent runs with
       date · distance · time · pace, same visual language as Last Time. */
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
      h+=`<div class="lastcard runhist">
        <div class="lasthead"><span>RECENT RUNS</span><span class="ago">last ${shown.length} of ${fmt(runs.length)}</span></div>
        ${rows2}
        <div class="lastfoot mono">${dDisp(moKm)} ${DU()} this month · ${fmt(Math.round(SEED.totals.km))} ${DU()} lifetime</div>
      </div>`;
    }
  }else{
    if(lift.weight===0||lift.weight==null){
      const savedW=(DB.settings.exW||{})[ex];
      if(savedW!=null) lift.weight=savedW;                     // your default, exactly as you set it
      else if(isBody(ex)) lift.weight=DB.settings.bodyKg||0;   // your bodyweight (Settings), else BW=0
      else{
        const top=ls&&ls.sets.length?Math.max(...ls.sets.map(s=>s.w)):null;
        lift.weight=top!=null?snapW(top):toKg(isLb()?45:20);   // inferred weights snap to clean steps
      }
    }
    h+=`<div class="zone prime"><div class="zonehead"><span>Log a set</span></div>
        <div class="wsel" style="margin-top:10px"><button data-w="-1">−</button>
        <div class="val"><input id="wv" type="number" inputmode="decimal" step="${STEP()}" value="${wDisp(lift.weight)}"><span class="unit">${U()}</span></div>
        <button data-w="1">+</button></div>`;
    if(usesPlates(ex)){
      h+=`<div class="loadline" id="ll">${loadInner(ex,lift.weight)}</div>`;
    }else if(loadLine(ex,lift.weight)){
      h+=`<div class="loadline" id="ll"><span class="ll-text">${loadLine(ex,lift.weight)}</span></div>`;
    }
    // rep buttons drawn from what you actually do for THIS exercise
    const reps=repChoices(ex);
    h+=`<div class="repgrid">${reps.map(r=>`<button data-rep="${r}">${r}</button>`).join('')}</div>
        <div class="repcustom">
          <input id="rc" type="number" inputmode="numeric" placeholder="reps">
          <button class="btn" id="addrep" style="margin:0;flex:0 0 142px">Add set</button>
        </div></div>`;
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

  h+=sugHTML;

  if(todaySets.length){
    h+=`<div class="zone"><div class="zonehead"><span>Logged today · <b class="hi">${todaySets.length}</b> sets</span></div>`;
  }
  h+=`<div class="sets">`;
  todaySets.forEach((s,ti)=>{
    const idx=t.w.indexOf(s);
    const isPR=!isRun&&s.reps.length&&s.w>=p.mw;
    const fresh=lift.justSaved&&ti===todaySets.length-1;
    const anim=fresh?(isPR?' savedpr':' saved'):'';
    h+=isRun
      ?`<div class="settile${anim}${lift.editSet===idx?' editing':''}" data-del="${idx}"><span class="w">${dDisp(s.w)} ${DU()}</span><span class="x">${s.mins||0}'${String(s.secs||0).padStart(2,'0')}"</span></div>`
      :`<div class="settile ${isPR?'pr':''}${anim}${lift.editSet===idx?' editing':''}" data-del="${idx}"><span class="w">${wLabel(ex,s.w)}</span><span class="x">${isBody(ex)&&s.w<=0.01?'×':U()+' ×'}</span><span class="w">${s.reps[0]}</span></div>`;
  });
  /* v3.3.18: capture FROM values off the still-mounted previous render.
     The animations run AFTER the innerHTML swap (end of this branch) —
     running them here animated nodes that were about to be discarded,
     which is why the v3.3.6 count-up always jumped instead of counting. */
  {
    const ve=document.getElementById('volNum');
    if(ve) _lastVol={ex:lift.ex,v:parseFloat(ve.dataset.kg||'0')};
    const lb=document.querySelector('.lbNow');
    _lbPrev = lb ? {ex:lift.ex,v:parseFloat(lb.dataset.v||'0')} : {ex:null,v:0};
  }
  lift._animSave=lift.justSaved;
  lift.justSaved=false;
  h+=`</div>`;
  if(todaySets.length){
    h+=`<div class="row" style="gap:8px;margin-top:10px">
          <button class="btn ghost" id="clearToday" style="margin:0;flex:1;white-space:nowrap;padding:12px 6px">Clear today's ${todaySets.length}</button>
          <button class="btn ghost" id="moveToday" style="margin:0;flex:1;white-space:nowrap;padding:12px 6px">Move to another lift →</button>
        </div>
        ${undoStack.length?`<button class="btn ghost" id="undoBtn" style="margin-top:8px">↺ Undo — ${undoStack[undoStack.length-1].label}</button>`:''}`;
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
              <div class="fld"><label>Weight ${U()}</label><input id="edW" type="number" inputmode="decimal" step="${STEP()}" value="${wDisp(es.w)}"></div>
              <div class="fld"><label>Reps</label><input id="edR" type="text" inputmode="numeric" value="${es.reps.join(',')}"></div>
            </div>
            <div class="row" style="gap:8px;margin-top:10px">
              <button class="btn" id="editSave" style="margin:0">Save</button>
              <button class="btn ghost" id="editCancel" style="margin:0;flex:0 0 96px">Cancel</button>
            </div></div>`;
    }
    h+=`${iBtn('sets','Tap a set to delete it — hold to edit. Undo is one tap away.')}</div>`;
  }else if(undoStack.length){
    h+=`<button class="btn ghost" id="undoBtn" style="margin-top:12px">↺ Undo — ${undoStack[undoStack.length-1].label}</button>`;
  }
  if(!isRun) h+=(isLive()&&todaySets.length?liveBars(ex,todaySets):progChart(ex));
  if(exOpen(ex)) h+=`<button class="btn done" id="doneExBtn">✓ Complete ${ex}</button>`;
  h+=prFoot;
  $('#view').innerHTML=h;
  if(lift._animSave){ lift._animSave=false; volCountUp(); lbGrow(); }
}

/* The session this exercise was last done in — strictly BEFORE today.
   Today's logging never rewrites it, so it stays a stable template you can
   copy from, repeat, or compare against. */
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
function repChoices(ex){
  const c={};
  (SEED.repFreq[ex]||[]).forEach((r,i)=>c[r]=(c[r]||0)+(8-i));
  for(const [,v] of Object.entries(DB.days))
    for(const s of v.w) if(s.ex===ex) s.reps.forEach(r=>c[r]=(c[r]||0)+3);
  let list=Object.keys(c).map(Number).sort((a,b)=>c[b]-c[a]).slice(0,12);
  if(list.length<6) list=[...new Set([...list,5,6,8,10,12,15])].slice(0,12);
  return list.sort((a,b)=>a-b);
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
const weekNum=sunISO=>Math.ceil(doy(sunISO)/7);                        // the sheet's Week Num

function runStatsHTML(){
  const days=runDays();
  if(!days.length) return '';
  const totalKm=days.reduce((a,r)=>a+r.km,0);
  const total=toD(totalKm);
  const ytd=days.filter(r=>r.d.startsWith(thisYear)).reduce((a,r)=>a+toD(r.km),0);
  const streak=runStreak(days);

  let h=`<h2 id="secRun">Run</h2>
    <div class="kpis">
      <div class="kpi accent"><div class="v">${fmt(Math.round(total))}</div><div class="l">${DU()}, all time</div>
        <div class="d mono">${days.length} runs since ${md(days[0].d)}</div></div>
      <div class="kpi accent"><div class="v">${streak}</div><div class="l">day run streak</div></div>
      <div class="kpi"><div class="v">${Math.round(ytd)}</div><div class="l">${DU()} in ${thisYear}</div></div>
    </div>`;

  /* --- next milestone: every 100 km (or 100 mi), with an honest ETA --- */
  const STEP_M=100;
  const next=(Math.floor(total/STEP_M)+1)*STEP_M, prev=next-STEP_M, left=next-total;
  const recent=days.filter(r=>daysAgo(r.d)<=28);
  const recSum=recent.reduce((a,r)=>a+toD(r.km),0);
  const rate=recSum/28;                                       // per calendar day, last 4 weeks
  const avgRun=recent.length?recSum/recent.length:total/days.length;
  const etaDays=rate>0?Math.ceil(left/rate):null;
  const eta=etaDays!=null?(()=>{const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()+etaDays);
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});})():null;
  h+=`<h2>Next milestone</h2><div class="card">
      <div class="mstone"><span class="big">${left.toFixed(1)} ${DU()}</span>
        <span class="goal">to ${fmt(next)}</span></div>
      <div class="mbar"><i style="width:${Math.max(2,Math.min(100,(total-prev)/STEP_M*100)).toFixed(1)}%"></i></div>
      <div class="tot"><span><b>${Math.ceil(left/avgRun)}</b> runs at your recent ${avgRun.toFixed(2)} ${DU()}</span>
        ${eta?`<span>on this pace · <b>${eta}</b></span>`:''}</div>
      <div class="note">Last 4 weeks: ${recSum.toFixed(1)} ${DU()} over ${recent.length} runs.</div></div>`;

  /* ---- this year: declared goal, honest pace ---- */
  {
    const doyNow=doy(todayISO), yLen=(+thisYear%4===0)?366:365;
    const projected=ytd/doyNow*yLen;
    const goal=(DB.settings.kmGoal||{})[thisYear];
    if(goal){
      const shouldBe=goal*doyNow/yLen;
      const ahead=ytd-shouldBe;
      const pct=Math.min(100,ytd/goal*100);
      h+=`<h2>${thisYear} goal</h2><div class="card">
        <div class="mstone"><span class="big">${Math.round(ytd)}</span>
          <span class="goal">of ${fmt(goal)} ${DU()}</span></div>
        <div class="mbar"><i style="width:${Math.max(2,pct).toFixed(1)}%"></i>
          <b class="pacemark" style="left:${(doyNow/yLen*100).toFixed(1)}%"></b></div>
        <div class="tot">
          <span class="${ahead>=0?'up':'down'}"><b>${ahead>=0?'+':''}${Math.round(ahead)} ${DU()}</b> ${ahead>=0?'ahead of':'behind'} pace</span>
          <span>projecting <b>${Math.round(projected)}</b></span></div>
        <div class="note" style="display:flex;align-items:center;gap:8px"><button class="linky" id="goalEdit">Change goal</button>${iBtn('goal','The tick marks where you should be today.')}</div>
      </div>`;
    }else{
      const lastYr=days.filter(r=>r.d.startsWith(String(+thisYear-1)))
                       .reduce((a,r)=>a+toD(r.km),0);          // yTot isn't built yet here
      const suggest=Math.round((lastYr||projected||300)/50)*50+50;
      h+=`<h2>${thisYear} goal</h2><div class="card">
        <div class="note" style="margin:0 0 10px">No goal set. You're projecting <b>${Math.round(projected)} ${DU()}</b> this year at your current rate.</div>
        <button class="btn ghost" id="goalSet" data-suggest="${suggest}" style="margin:0">Set a ${thisYear} goal →</button>
      </div>`;
    }
  }

  /* --- weekly distance, last 16 weeks --- */
  const wkBy={};
  for(const r of days) wkBy[weekOf(r.d)]=(wkBy[weekOf(r.d)]||0)+toD(r.km);
  const thisWk=weekOf(todayISO);
  const wks=Object.keys(wkBy).sort().slice(-16);
  if(!wks.includes(thisWk)) wks.push(thisWk);
  const wkMax=Math.max(...wks.map(w=>wkBy[w]||0),1);
  const wkAvg=wks.filter(w=>w!==thisWk).reduce((a,w)=>a+(wkBy[w]||0),0)/Math.max(1,wks.length-1);
  h+=`<h2>Every week</h2><div class="card">
      <div class="zoom" data-zoom><svg viewBox="0 0 330 118" style="width:100%;height:auto">`;
  if(wkAvg){
    const ay=94-wkAvg/wkMax*80;
    h+=`<line x1="8" y1="${ay.toFixed(1)}" x2="316" y2="${ay.toFixed(1)}" stroke="var(--line)" stroke-width="0.6" stroke-dasharray="2 3"></line>
        <text x="319" y="${(ay+2.5).toFixed(1)}" font-family="var(--mono)" font-size="7" fill="var(--muted)">${Math.round(wkAvg)}</text>`;
  }
  const bw=Math.min(17,(300/wks.length)-2), gap=300/wks.length;
  wks.forEach((w,i)=>{
    const cur=w===thisWk, v=wkBy[w]||0;
    const bh=Math.max(2,v/wkMax*80), x=8+i*gap;
    h+=`<rect class="gbar" x="${x.toFixed(1)}" y="${(94-bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="var(--accent)" opacity="${cur?1:.55}"></rect>
        <text x="${(x+bw/2).toFixed(1)}" y="${(91-bh).toFixed(1)}" text-anchor="middle" font-family="var(--mono)" font-size="6.5" fill="var(--muted)">${Math.round(v)}</text>
        <text x="${(x+bw/2).toFixed(1)}" y="107" text-anchor="middle" font-family="var(--mono)" font-size="6.5" fill="${cur?'var(--accent)':'var(--muted)'}">${weekNum(w)}</text>`;
  });
  h+=`</svg></div><div class="tot"><span><b>${(wkBy[thisWk]||0).toFixed(1)} ${DU()}</b> this week (wk ${weekNum(thisWk)})</span>
      <span>16-week avg ${wkAvg.toFixed(1)} ${DU()}</span></div></div>`;

  /* --- year over year, cumulative distance --- */
  const yc={};
  for(const r of days){const y=r.d.slice(0,4); (yc[y]=yc[y]||[]).push([doy(r.d),toD(r.km)]);}
  const years=Object.keys(yc).filter(y=>y>='2022').sort();
  const yTot={}; for(const y of years) yTot[y]=yc[y].reduce((a,p)=>a+p[1],0);
  const dataMax=Math.max(...Object.values(yTot),1);
  const step=Math.max(10,Math.round(dataMax/4/10)*10);        // 361 -> 90, 180, 270, 360
  const yMax=Math.max(dataMax,step*4);
  h+=`<h2>Year over year</h2><div class="card">
      <div class="zoom" data-zoom><div class="zoomhint">pinch / scroll to zoom · double-tap to reset</div>
      <svg viewBox="0 0 340 170" style="width:100%;height:auto">`;
  for(let g=0;g<=4;g++){
    const y=140-(g*step)/yMax*120;
    h+=`<line x1="30" y1="${y.toFixed(1)}" x2="300" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width="0.6" ${g?'stroke-dasharray="2 3"':''}></line>
        <text x="26" y="${(y+3).toFixed(1)}" text-anchor="end" font-family="var(--mono)" font-size="7" fill="var(--muted)">${g===4?`${g*step}${DU()}`:g*step}</text>`;
  }
  ['J','F','M','A','M','J','J','A','S','O','N','D'].forEach((m,i)=>{
    const x=30+((i*30.4+15)/366)*270;
    h+=`<text x="${x.toFixed(1)}" y="152" text-anchor="middle" font-family="var(--mono)" font-size="7" fill="var(--muted)">${m}</text>`;
  });
  const labels=[];
  for(const y of years){
    const pts=yc[y].sort((a,b)=>a[0]-b[0]);
    let c=0, path='';
    const end = y===thisYear ? doy(todayISO) : ((+y%4===0)?366:365);
    let i=0;
    for(let d=1;d<=end;d++){
      while(i<pts.length&&pts[i][0]<=d){c+=pts[i][1];i++;}
      if(d===1||d===end||d%3===0) path+=`${(30+(d/366)*270).toFixed(1)},${(140-c/yMax*120).toFixed(1)} `;
    }
    const cur=y===thisYear;
    const lx=30+(end/366)*270, ly=140-c/yMax*120;
    h+=`<polyline data-yr="${y}" points="${path.trim()}" fill="none" stroke="${YEAR_COLORS[y]||'var(--muted)'}" stroke-width="${cur?2:1.2}" stroke-linejoin="round"></polyline>`;
    if(cur) h+=`<circle class="beacon" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3.2" fill="var(--accent)"></circle>`;
    labels.push({y,lx,ly,cur});
  }
  // year tags sit at their line's end; nudge apart if two totals nearly tie (303 vs 305)
  labels.sort((a,b)=>a.ly-b.ly);
  for(let i=1;i<labels.length;i++)
    if(labels[i].ly-labels[i-1].ly<8) labels[i].ly=labels[i-1].ly+8;
  for(const L of labels)
    h+=`<text data-yr="${L.y}" x="${Math.min(L.lx+(L.cur?6:4),316).toFixed(1)}" y="${(L.ly+2.5).toFixed(1)}" font-family="var(--mono)" font-size="7.5"
         fill="${YEAR_COLORS[L.y]||'var(--muted)'}" font-weight="${L.cur?700:400}">${L.y.slice(2)}</text>`;
  h+=`</svg></div><div class="legend1">`;
  for(const y of years) h+=`<span data-yr="${y}" role="button">${''}<i style="background:${YEAR_COLORS[y]||'var(--muted)'}"></i>${y} · ${Math.round(yTot[y])}</span>`;
  h+=`</div>${iBtn('cumkm',`Cumulative ${DU()} by day of year. ${thisYear} is still running.`)}</div>`;

  /* --- pace, by month (timed runs only; lower is faster) --- */
  const pm={};
  for(const r of days){ if(r.timed<=0) continue;
    const k=r.d.slice(0,7); const e=pm[k]||(pm[k]={sec:0,d:0}); e.sec+=r.sec; e.d+=toD(r.timed); }
  const pms=Object.entries(pm).sort().slice(-12);
  if(pms.length){
    const paces=pms.map(([m,e])=>[m,e.sec/e.d]);
    const lo=Math.min(...paces.map(p=>p[1])), hi=Math.max(...paces.map(p=>p[1]));
    const span=Math.max(hi-lo,30);                     // never flatten a near-identical year
    const base=lo-span*0.25, top=hi+span*0.25;
    h+=`<h2>Pace, by month</h2><div class="card">
        <div class="zoom" data-zoom><svg viewBox="0 0 330 118" style="width:100%;height:auto">`;
    let poly='';
    paces.forEach(([m,p],i)=>{
      const x=14+i*(302/Math.max(1,paces.length-1||1)), y=14+(top-p)/(top-base)*80;
      const latest=i===paces.length-1, fastest=p===lo&&!latest;
      const col=latest?'var(--accent)':fastest?'var(--record)':'var(--accent)';
      poly+=`${x.toFixed(1)},${y.toFixed(1)} `;
      h+=`<circle ${latest?'class="beacon"':''} cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${latest?3.2:fastest?3:2}" fill="${col}"></circle>
          <text x="${x.toFixed(1)}" y="${(y-6).toFixed(1)}" text-anchor="middle" font-family="var(--mono)" font-size="6.5" font-weight="${latest?700:400}" fill="${latest?'var(--accent)':fastest?'var(--record)':'var(--muted)'}">${paceStr(p)}</text>
          <text x="${x.toFixed(1)}" y="107" text-anchor="middle" font-family="var(--mono)" font-size="6.5" fill="${latest?'var(--accent)':'var(--muted)'}">${m.slice(5)}</text>`;
    });
    h+=`<polyline points="${poly.trim()}" fill="none" stroke="var(--accent)" stroke-width="1.2" stroke-linejoin="round"></polyline>
        </svg></div>${iBtn('pace',`Minutes per ${DU()}, timed runs only — faster months sit lower. Fastest in red, this month in blue.`)}</div>`;
  }

  /* --- records --- */
  const long=days.reduce((a,r)=>toD(r.km)>toD(a.km)?r:a);
  const fast=days.filter(r=>r.timed>=1).sort((a,b)=>paceOf(a)-paceOf(b))[0];
  const mo={}; for(const r of days) mo[r.d.slice(0,7)]=(mo[r.d.slice(0,7)]||0)+toD(r.km);
  const bestMo=Object.entries(mo).sort((a,b)=>b[1]-a[1])[0];
  const bestWk=Object.entries(wkBy).sort((a,b)=>b[1]-a[1])[0];
  h+=`<h2>Records</h2><table class="rec-core">
      <tr><th>Longest run</th><td class="n"><b>${dDisp(long.km)} ${DU()}</b><span class="recdate">${md(long.d)}</span></td></tr>
      ${fast?`<tr><th>Fastest pace</th><td class="n"><b>${paceStr(paceOf(fast))} /${DU()}</b><span class="recdate">${md(fast.d)}</span></td></tr>`:''}
      <tr><th>Biggest week</th><td class="n"><b>${bestWk[1].toFixed(1)} ${DU()}</b><span class="recdate">week of ${md(bestWk[0])}</span></td></tr>
      <tr><th>Biggest month</th><td class="n"><b>${Math.round(bestMo[1])} ${DU()}</b><span class="recdate">${bestMo[0]}</span></td></tr>
      </table>`;
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
function liveBars(ex,sets){
  const hist=exSessionVols(ex);
  const now=sets.reduce((a,s)=>a+volOf(s),0);
  const shown=hist.slice(-15);
  const best=Math.max(...hist.map(h=>h.v),1);
  const beaten=now>best;
  const mx=Math.max(best,now,...shown.map(h=>h.v))*1.1;
  const W=330,H=138,base=106;
  const n=shown.length+1, gap=Math.min(24,(W-70)/n), bw=Math.max(6,Math.min(16,gap-4));
  let h=`<h2>Today · live</h2><div class="card">
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">`;
  const by=base-(best/mx)*88;
  h+=`<line x1="8" y1="${by.toFixed(1)}" x2="${W-8}" y2="${by.toFixed(1)}" stroke="var(--record)" stroke-width="0.8" stroke-dasharray="3 3" opacity=".75"></line>
      <text x="${W-10}" y="${(by-4).toFixed(1)}" text-anchor="end" font-family="var(--mono)" font-size="7.5" fill="var(--record)">${beaten?'best — beaten ✓':`best ${fmt(Math.round(toU(best)))}`}</text>`;
  shown.forEach((s2,i2)=>{
    const bh=Math.max(2.5,(s2.v/mx)*88), x=10+i2*gap;
    h+=`<rect x="${x.toFixed(1)}" y="${(base-bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="var(--line)"></rect>`;
  });
  const nh=Math.max(3,(now/mx)*88), nx=10+shown.length*gap;
  h+=`<rect class="lbNow" data-v="${now}" x="${nx.toFixed(1)}" y="${(base-nh).toFixed(1)}" width="${Math.max(bw,12).toFixed(1)}" height="${nh.toFixed(1)}" rx="2.5" fill="var(--live)"></rect>
      <text x="${(nx+Math.max(bw,12)/2).toFixed(1)}" y="${(base-nh-5).toFixed(1)}" text-anchor="middle" font-family="var(--mono)" font-size="8.5" font-weight="700" fill="${beaten?'var(--record)':'var(--live)'}">${vDisp(now)}</text>
      <text x="${(nx+Math.max(bw,12)/2).toFixed(1)}" y="${base+11}" text-anchor="middle" font-family="var(--mono)" font-size="7.5" font-weight="700" fill="var(--live)">now</text>`;
  const beats=shown.filter(s2=>now>s2.v).length;
  h+=`<text x="10" y="${H-4}" font-family="var(--mono)" font-size="7.5" fill="var(--muted)">${sets.length} set${sets.length>1?'s':''} · beats ${beats} of your last ${shown.length} ${ex} sessions</text>`;
  h+=`</svg></div>`;
  return h;
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
