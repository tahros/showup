/* ShowUp â€” lift.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
let _lastLiftPart='\u0000';   // v3.3.64: sentinel â€” first render always counts as a change
function renderLift(){
  /* v3.3.64: the entrance fires when the LIST YOU'RE LOOKING AT CHANGES â€”
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
      // red mode: focus follows the work â€” land on the part of your latest OPEN set
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
      const sub = open ? 'ğŸ”¥ today'
                : finished ? 'âœ… today'
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

    // today's sets, filtered to the selected part. The whole section â€”
    // header included â€” appears with the first set and not before (v3.3.87).
    const mine=t.w.filter(s=>s.part===lift.part);
    if(mine.length){
      h+=`<h2>${lift.part} Â· today</h2>`;
      const byEx={};
      mine.forEach(s=>{(byEx[s.ex]=byEx[s.ex]||[]).push(s);});
      for(const [ex,list] of Object.entries(byEx)){
        const isRun=ex==='Run';
        const sub=isRun
          ?list.map(s=>`${dDisp(s.w)} ${DU()} Â· ${s.mins||0}'${String(s.secs||0).padStart(2,'0')}"`).join('  ')
          :list.map(s=>`${wDisp(s.w)}${U()} Ã— ${s.reps.join(',')}`).join('   ');
        const v=list.reduce((a,s)=>a+volOf(s),0);
        const exDone=!exOpen(ex);
        h+=`<div class="item logrow todayrow ${exDone?'fin':''}">
              <button class="logmain" data-ex="${ex}" data-part="${lift.part}">
                <b>${ex}</b><div class="sub">${sub}</div>
              </button>
              <span class="mono muted" style="font-size:12px">${v?vDisp(v)+' '+U():''}</span>
              <button class="xbtn" data-dropex="${ex}" aria-label="Remove ${ex} from today">âœ•</button>
            </div>`;
      }
      h+=`${undoStack.length?`<button class="btn ghost" id="undoBtn">â†º Undo â€” ${undoStack[undoStack.length-1].label}</button>`:''}
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
              <div class="tot"><span><b>${disp(cur)}</b> today</span><span>usual â‰ˆ ${disp(usual)}</span></div>
            </div>`;
      }
      /* v3.3.33: an open part offers BOTH exits. Continue reuses the data-go
         router, so it lands on the exercise you're mid-way through (v3.3.31);
         Complete seals. Continue leads â€” you tap it many times a session and
         Complete once. */
      if(partOpen(lift.part)) h+=`<div class="btnrow">
            <button class="btn ${isLive()?'livego':''}" data-go="${lift.part}">Continue â†’</button>
            <button class="btn ghost done" id="donePartBtn">âœ“ Complete</button></div>`;
      else if(dayMeta().donePart.includes(lift.part))
        h+=`<button class="btn ghost" id="reopenPartBtn" style="margin-top:12px">${lift.part} completed âœ“ â€” Reopen</button>`;
    }

    /* v3.3.151: LAST TIME at the part level â€” the session's SHAPE. The
       exercise page got this in v3.3.144; the part page answered "what do I
       usually pick" but never "what did last time look like, in order".
       Same grammar, one level up: exgrp blocks in the order they were done,
       each row tappable into its lift, done-today rows checked off â€” a
       playbook you never had to author, read from the record. */
    if(lift.part!=='Run'){
      const lp=lastPartSession(lift.part);
      if(lp){
        h+=`<div class="lastcard partlast"><div class="lasthead"><span>LAST TIME Â· ${lift.part.toUpperCase()}</span><button class="ago linkdate" data-histd="${lp.d}">${wd2(lp.d)} Â· ${agoStr(lp.d)}</button></div>
          <div class="inlinehelp">Tap an exercise to use its previous weight. A checkmark means you completed it today.</div>`;
        for(const g of lp.groups){
          const doneNow=t.w.some(x=>x.ex===g.ex&&(x.reps||[]).length);
          const n=g.sets.reduce((a,st)=>a+((st[1]||[]).length||0),0);
          h+=`<div class="exgrp plrow${doneNow?' pldone':''}" data-ex="${g.ex}" role="button" tabindex="0">
                <div class="lasthead"><span>${doneNow?'<span aria-label="completed today">âœ“</span> ':''}${g.ex}</span><span class="ago">${n} set${n>1?'s':''}</span></div>
                ${setRows(g.ex,foldSets(g.sets,g.ex),false)}</div>`;
        }
        h+=`</div>`;
      }
    }

    // exercises, split by how much of a staple they are for you.
    // Anything currently OPEN today already sits in the "Â· today" list above â€”
    // it only returns to its tier once you complete it.
    const openSet=new Set(t.w.filter(s=>s.part===lift.part&&!dayMeta().doneEx.includes(s.ex)).map(s=>s.ex));
    const list=catFor(lift.part).map(ex=>({ex,last:exLastFor(ex),tier:exTier(ex),freq:exFreq(ex)}))
      .filter(x=>!openSet.has(x.ex));
    const row=({ex,last,freq},big)=>{
      const p=prFor(ex);
      const when=last?(daysAgo(last)===0?'âœ“ done today':daysAgo(last)+'d ago'):'never logged';
      const meta=big?`${when} Â· ${freq}Ã— this year`:when;
      const side=(p.mw&&usesPlates(ex))?`${wDisp((p.mw-barKg(ex))/2)}${U()} / side`:'';
      const mine=!!customs()[ex];
      const eq=EQUIP_LABEL[equipOf(ex)]||'';
      return `<div class="item logrow ${big?'goto':''}${_enter?' enter':''}" style="--i:${Math.min(_ei++,10)};${big?'':'padding:10px 10px 10px 14px'}">
            <button class="logmain" data-ex="${ex}">
              <b>${ex}</b><div class="sub">${meta}${mine?` Â· yours Â· ${eq.toLowerCase()}`:''}</div>
              ${big?'<span class="gochev" aria-hidden="true">â†’</span>':''}
            </button>
            <span class="pr-cell">
              <span class="pr-top">${p.mw?wDisp(p.mw)+U():''}</span>
              ${side?`<span class="pr-side">${side}</span>`:''}
            </span>
            ${(mine&&!last)?`<button class="xbtn" data-delex="${ex}" aria-label="Delete ${ex}">âœ•</button>`:''}
          </div>`;
    };
    const goto=list.filter(x=>x.tier==='goto').sort((a,b)=>b.freq-a.freq||(b.last||'').localeCompare(a.last||''));
    const some=list.filter(x=>x.tier==='sometimes').sort((a,b)=>(b.last||'').localeCompare(a.last||''));
    const fresh=list.filter(x=>x.tier==='new').sort((a,b)=>a.ex.localeCompare(b.ex));
    if(goto.length){
      h+=`<h2>${lift.part} Â· go-to</h2>`;
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

  // ---- Copy Picker: two modes â€” copy the SUGGESTION, or move TODAY's sets
  if(lift.copy){
    const moving = lift.copy.mode==='today';
    const sets = lift.copy.sets;                 // frozen when the picker opened â€” what you see is what copies
    const srcDate = lift.copy.d;
    let h=`<button class="back" data-cancelcopy="1">â† ${ex}</button>
           <div class="exhead">${moving?`Move today's ${sets.length} sets toâ€¦`:`Suggest these ${sets.length} sets forâ€¦`}</div>
           <div class="note" style="margin-bottom:12px">
             ${sets.map(s=>`${wDisp(s.w)}${U()}Ã—${s.r}`).join('  ')}<br>
             ${moving
               ? `These are logged under ${ex} today. Picking a lift moves them there and removes them from ${ex}.`
               : `Nothing gets logged. The lift you pick will show these as its suggested session â€” tap or Log-all there when you actually do them.`}
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
              <span class="mono muted" style="font-size:12px">copy â†’</span>
            </button>`;
      });
    });
    $('#view').innerHTML=h; return;
  }

  const todaySets=t.w.filter(s=>s.ex===ex);
  const l=lastFor(ex),p=prFor(ex);
  let h=``;   // the sticky header already shows the exercise + part

  /* v3.1.2: the footer answers ONE question â€” "what did I do last time?" â€”
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
     lower group of the "This session" card â€” same grammar as today's rows,
     stepped back the way past years step back on the Consistency chart. The
     fragment is built here (it needs lastPrev) and composed below. */
  let lastGroup='';
  if(!isRun){
    if(lastPrev){
      const folded=foldSets(lastPrev.sets,ex);         // v3.3.43: shared with History
      lastGroup=`<div class="sess-then">
        <div class="lasthead"><span>LAST TIME</span><button class="ago linkdate" data-histd="${lastPrev.d}">${wd2(lastPrev.d)} Â· ${agoStr(lastPrev.d)}</button></div>
        ${setRows(ex,folded,true)}
      </div>`;
    }else{
      lastGroup=`<div class="sess-then"><div class="lasthead"><span>LAST TIME</span></div>
        <div class="muted" style="font-size:13px">Never logged â€” today writes the first line.</div></div>`;
    }
  }

  // ---- suggested sets: shortcut keys, not a to-do list. Tap = log that wÃ—r
  //      (again and again, if you like). âœ• dismisses one for today. Max 6 shown.
  //      Your LATEST logged set always leads â€” one tap duplicates it.
  //      Rendered BELOW "Log a set" (v2.10); built here because the log zone
  //      needs `ls` for its default weight.
  const ls=suggestedFor(ex);
  let runHist='';   // v3.3.153: built in the run branch, emitted below the session card
  /* v3.3.137: the weight is resolved HERE, before the suggested chips are
     built. It used to be settled inside the log zone further down â€” which is
     rendered below but built after â€” so the chips were partitioned against
     whatever weight the PREVIOUS exercise left behind. Nothing depended ×½8öÚ$z{-®éÜj×ããÂöF—cà¢ÆF—b6Æ73Ò'¦ööÒ6öç¦ööÒ"FF×¦ööÓãÇ7frf–Wt&÷ƒÒ#3C#R"&öÆSÒ&–Ör"FF×67'V#Ò'&6R"FF×&6R×Væ—CÒ"G´ER‚—Ò ¢FF×67'V"×–V#Ò"G·F†—5–V'Ò"FF×7ƒÒ"G·ƒÒ"FF×7‡sÒ"G·‡wÒ"FF×7“Ò"G·“Ò"FF×7–ƒÒ"G·–‡Ò"FF×6ÖƒÒ"G·”Ö‡Ò#æ°¢f÷"†ÆWBsÓ¶sÃÓC¶r²²—¶6öç7Bc×”Ö‚¦róBÇ“Õ’‡b“¶‚³ÖÆÆ–æRƒÒ"G·ƒÒ"“Ò"G·—Ò"ƒ#Ò"G·ƒ·‡wÒ"“#Ò"G·—Ò"7G&ö¶SÒ'f"‚ÒÖÆ–æR’"7G&ö¶R×v–GFƒÒ"ãb"G¶sòw7G&ö¶RÖF6†'&“Ò#"2"s¢rwÓãÂöÆ–æSãÇFW‡BƒÒ##b"“Ò"G·’³7Ò"FW‡BÖæ6†÷#Ò&VæB"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#r"f–ÆÃÒ'f"‚ÒÖ×WFVB’#âG´ÖF‚ç&÷VæB‡b—ÓÂ÷FW‡Cæ·Ğ¢f÷"†ÆWBÓÓ¶ÓÃÒ·FöF”•4òç6Æ–6RƒR’Ó¶Ò²²—¶6öç7BF“ÔÖF‚æÖ–â†âÓÆF÷’†G·F†—5–V'ÒÒGµ7G&–ær†Ò³’çE7F'Bƒ"Âsr—ÒÓV’Ó“¶‚³ÖÇFW‡BƒÒ"Gµ‚†F’—Ò"“Ò#“R"FW‡BÖæ6†÷#Ò&Ö–FFÆR"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#r"f–ÆÃÒ'f"‚ÒÖ×WFVB’#âG²t¤dÔÔ¤¤4ôäBu¶Õ×ÓÂ÷FW‡Cæ·Ğ¢‚³ÖÇöÇ–vöâö–çG3Ò"G¶&VÒ"f–ÆÃÒ'f"‚ÒÖ66VçB×6ögB’"÷6—G“Ò"ãcR#ãÂ÷öÇ–vöãà¢ÇöÇ–Æ–æRFF×—#Ò"G·&We–V'Ò"FF×fÇVW3Ò"G·bæ¦ö–â‚rÂr—Ò"ö–çG3Ò"G·æ¦ö–â‚rr—Ò"f–ÆÃÒ&æöæR"7G&ö¶SÒ'f"‚ÒÖf–çB’"7G&ö¶R×v–GFƒÒ#ãR#ãÂ÷öÇ–Æ–æSà¢ÇöÇ–Æ–æRFF×—#Ò"G·F†—5–V'Ò"FF×fÇVW3Ò"G¶7bæ¦ö–â‚rÂr—Ò"ö–çG3Ò"G¶7æ¦ö–â‚rr—Ò"f–ÆÃÒ&æöæR"7G&ö¶SÒ'f"‚ÒÖ66VçB’"7G&ö¶R×v–GFƒÒ#"ãR#ãÂ÷öÇ–Æ–æSà¢Æ6—&6ÆR6Æ73Ò&&V6öâ6öæVæB"7ƒÒ"Gµ‚†âÓ—Ò"7“Ò"Gµ’†7B—Ò"#Ò#2ã""f–ÆÃÒ'f"‚ÒÖ66VçB’#ãÂö6—&6ÆSãÂ÷7fsãÂöF—cãÂöF—cæ°¢Ğ ¢6öç7B5DUÓ#RÆæW‡CÔÖF‚æÖ‚…5DUÂ„ÖF‚æfÆö÷"†ÖöçF„¶Òõ5DU’³’¥5DU’ÆÆVgCÔÖF‚æÖ‚ƒÆæW‡BÖÖöçF„¶Ò’ÆÖöçF…&FSÖÖöçF„¶ÒôÖF‚æÖ‚ƒÂ·FöF”•4òç6Æ–6Rƒ‚’“°¢6öç7BWFF—3ÖÖöçF…&FSôÖF‚æ6V–Â†ÆVgBöÖöçF…&FR“¦çVÆÃ°¢‚³ÖÆƒ#äÖöçF†Ç’Ö–ÆW7FöæRG¶„7G2‚w'Væ×2rÆF†RæW‡BGµ5DUÒG´ER‚—Ò7FW&W6WG2BF†R7F'BöbWfW'’ÖöçF‚æÂt&÷WBÖöçF†Ç’Ö–ÆW7FöæRr—ÓÂöƒ#ãÆF—b6Æ73Ò&6&B#à¢ÆF—b6Æ73Ò&×7FöæR#ãÇ7â6Æ73Ò&&–r#âG¶ÆVgBçFôf—†VBƒ—ÒG´ER‚—ÓÂ÷7ããÇ7â6Æ73Ò&vöÂ#çFòG¶æW‡GÒ–âG¶ÖöçF„æÖWÓÂ÷7ããÂöF—cà¢ÆF—b6Æ73Ò&Ö&"#ãÆ’7G–ÆSÒ'v–GFƒ¢G´ÖF‚æÖ‚ƒ"ÄÖF‚æÖ–âƒÆÖöçF„¶ÒöæW‡B£’’çFôf—†VBƒ—ÒR#ãÂö“ãÂöF—cà¢ÆF—b6Æ73Ò'F÷B#ãÇ7ããÆ#âG¶DF—7†ÖöçF„¶Ò—ÒG´ER‚—ÓÂö#âF†—2ÖöçFƒÂ÷7ããÇ7ãâG¶WFF—3ö&÷WBG¶WFF—7ÒF’G¶WFF—3ÓÓÓòrs¢w2wÒBF†—26V¢vÆör'VâFò7F'BwÓÂ÷7ããÂöF—cãÂöF—cæ° ¢ò¢ÖöçF†Ç’6RÂv—F‚V–WBÆ&VÇ2æB&VÂÆ÷GFVB6ö÷&F–æFR7—7FVÒâ¢ğ¢6öç7BÓ×·Ó²f÷"†6öç7B"öbF—2—¶–b‡"çF–ÖVCÃÓ–6öçF–çVS¶6öç7B³×"æBç6Æ–6RƒÃr’ÆS×Õ¶µ×ÇÂ‡Õ¶µÓ×·6V3£ÆC£Ò“¶Rç6V2³×"ç6V3¶RæB³×FôB‡"çF–ÖVB“·Ğ¢6öç7B6W3Ôö&¦V7BæVçG&–W2‡Ò’ç6÷'B‚’ç6Æ–6R‚Ó"’æÖ‚…¶ÒÆUÒ“Óå¶ÒÆRç6V2öRæEÒ“°¢–b‡6W2æÆVæwF‚—°¢6öç7BÆóÔÖF‚æÖ–â‚ââç6W2æÖ‡cÓçe³Ò’’Æ†“ÔÖF‚æÖ‚‚ââç6W2æÖ‡cÓçe³Ò’’Ç7ãÔÖF‚æÖ‚††’ÖÆòÃ3’Æ&6SÖÆò×7â¢ã#RÇF÷Ö†’·7â¢ã#S°¢6öç7BƒÓ3BÇ‡sÓ#s‚Ç“ÓRÇ–ƒÓs‚Å“×Óã#r²‡F÷×’ò‡F÷Ö&6R’§–‚Æf×D†—3×3ÓæG´ÖF‚æfÆö÷"‡2óc—Ó¢Gµ7G&–ær„ÖF‚ç&÷VæB‡2Sc’’çE7F'Bƒ"Âsr—Ö°¢ÆWBÖ&·3ÒrrÇöÇ“Òrs°¢¶&6RÂ†&6R·F÷’ó"ÇF÷Òæf÷$V6‚‡Óç¶6öç7B“Õ’‡“¶Ö&·2³ÖÆÆ–æRƒÒ"G·ƒÒ"“Ò"G·—Ò"ƒ#Ò"G·ƒ·‡wÒ"“#Ò"G·—Ò"7G&ö¶SÒ'f"‚ÒÖÆ–æR’"7G&ö¶R×v–GFƒÒ"ãb"7G&ö¶RÖF6†'&“Ò#"2#ãÂöÆ–æSãÇFW‡BƒÒ##’"“Ò"G·’³"ãWÒ"FW‡BÖæ6†÷#Ò&VæB"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#bãR"f–ÆÃÒ'f"‚ÒÖ×WFVB’#âG¶f×D†—2‡—ÓÂ÷FW‡Cæ·Ò“°¢6W2æf÷$V6‚‚…¶ÒÇÒÆ’“Óç¶6öç7Bƒ×ƒ¶’§‡rôÖF‚æÖ‚ƒÇ6W2æÆVæwF‚Ó’Ç“Õ’‡’ÆÆFW7CÖ“ÓÓ×6W2æÆVæwF‚ÓÆf7C×ÓÓÖÆòbbÆFW7C·öÇ’³ÖG·‡ÒÂG·—Ò¶Ö&·2³ÖÆ6—&6ÆRG¶ÆFW7Còv6Æ73Ò&&V6öâ"s¢rwÒ7ƒÒ"G·‡Ò"7“Ò"G·—Ò"#Ò"G¶ÆFW7Có2ã#¦f7Có"ãƒ£'Ò"f–ÆÃÒ"G¶f7Còwf"‚Ò×&V6÷&B’s¢wf"‚ÒÖ66VçB’wÒ#ãÂö6—&6ÆSâG¶ÆFW7GÇÆf7CöÇFW‡BƒÒ"G·‡Ò"“Ò"G·’ÓgÒ"FW‡BÖæ6†÷#Ò&Ö–FFÆR"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#r"f–ÆÃÒ"G¶f7Còwf"‚Ò×&V6÷&B’s¢wf"‚ÒÖ66VçBÖ–æ²’wÒ#âG·6U7G"‡—ÓÂ÷FW‡Cæ¢rwÓÇFW‡BƒÒ"G·‡Ò"“Ò##"FW‡BÖæ6†÷#Ò&Ö–FFÆR"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#r"f–ÆÃÒ'f"‚ÒÖ×WFVB’#âG²t¤dÔÔ¤¤4ôäBu²¶Òç6Æ–6RƒR’Ó×ÓÂ÷FW‡Cæ·Ò“°¢6öç7B—'3Õ²ââææWr6WB‡6W2æÖ‡cÓçe³Òç6Æ–6RƒÃB’’•Ó°¢‚³ÖÆƒ#å6RG¶„7G2‚w6RrÆfW&vRÖ–çWFW2W"G´ER‚—Ò'’ÖöçF‚âÆ÷vW"—2f7FW#²&VB—2F†Rf7FW7BÖöçF‚æÂt&÷WB6Rr—ÓÂöƒ#ãÆF—b6Æ73Ò&6&B#ãÇ7frf–Wt&÷ƒÒ#333‚"7G–ÆSÒ'v–GFƒ£S¶†V–v‡C¦WFò#ãÇFW‡BƒÒ#‚"“Ò#""föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#r"f–ÆÃÒ'f"‚ÒÖf–çB’#âG·—'2æ¦ö–â‚ròr—ÓÂ÷FW‡CãÆÆ–æRƒÒ"G·ƒÒ"“Ò"G·“Ò"ƒ#Ò"G·ƒ·‡wÒ"“#Ò"G·“Ò"7G&ö¶SÒ'f"‚ÒÖÆ–æR’"7G&ö¶R×v–GFƒÒ"ã‚#ãÂöÆ–æSâG¶Ö&·7ÓÇöÇ–Æ–æRö–çG3Ò"G·öÇ—Ò"f–ÆÃÒ&æöæR"7G&ö¶SÒ'f"‚ÒÖ66VçB’"7G&ö¶R×v–GFƒÒ#ã2#ãÂ÷öÇ–Æ–æSãÂ÷7fsãÂöF—cæ°¢Ğ ¢–b†ÖöçF…&÷w2æÆVæwF‚—°¢6öç7B6V3ÖÖöçF…&÷w2ç&VGV6R‚†Ç"“Óæ·"ç6V2Ã’ÇF–ÖVD¶ÓÖÖöçF…&÷w2ç&VGV6R‚†Ç"“Óæ·FôB‡"çF–ÖVB’Ã’Ç6S×F–ÖVD¶Ó÷6V2÷F–ÖVD¶Ó£°¢6öç7BÆöævW7CÔÖF‚æÖ‚‚ââæÖöçF…&÷w2æÖ‡#ÓçFôB‡"æ¶Ò’’’ÆF–ÓÖæWrFFR‚¶Öòç6Æ–6RƒÃB’Â¶Öòç6Æ–6RƒR’Ã’ævWDFFR‚’Ç&ö£ÖÖöçF„¶Òò·FöF”•4òç6Æ–6Rƒ‚’¦F–Ó°¢6öç7B‡'3ÔÖF‚æfÆö÷"‡6V2ó3c’ÆÖ–ç3ÔÖF‚ç&÷VæB‡6V2S3cóc“°¢‚³ÖÆƒ#å'Vææ–ær+rG¶ÖöçF„æÖWÓÂöƒ#ãÆF—b6Æ73Ò&6&B'VæÖöçF‚#ãÆF—b6Æ73Ò''VæÖöçF††W&ò#ãÇ7G&öæsâG¶DF—7†ÖöçF„¶Ò—ÒÇ6ÖÆÃâG´ER‚—ÓÂ÷6ÖÆÃãÂ÷7G&öæsãÇ7ãå$ô¤T5DTCÆ#î(˜‚G´ÖF‚ç&÷VæB‡&ö¢—ÒG´ER‚—ÓÂö#ãÂ÷7ããÂöF—cà¢ÆF—b6Æ73Ò''VæÖöçF†w&–B#ãÇ7ããÆ#âG¶ÖöçF…&÷w2æÆVæwF‡ÓÂö#ç'Vç3Â÷7ããÇ7ããÆ#âG¶DF—7†ÖöçF„¶ÒöÖöçF…&÷w2æÆVæwF‚—ÒG´ER‚—ÓÂö#æfW&vSÂ÷7ããÇ7ããÆ#âG·6U7G"‡6R—ÓÂö#ç6RòG´ER‚—ÓÂ÷7ããÇ7ããÆ#âG¶DF—7†ÆöævW7B—ÒG´ER‚—ÓÂö#æÆöævW7CÂ÷7ããÇ7ããÆ#âG¶‡'7Ó¢Gµ7G&–ær†Ö–ç2’çE7F'Bƒ"Âsr—ÓÂö#æöâfVWCÂ÷7ããÇ7ããÆ#âG´ÖF‚ç&÷VæB†ÖöçF„¶ÒöæW‡B£—ÒSÂö#çFòG¶æW‡GÒG´ER‚—ÓÂ÷7ããÂöF—cãÂöF—cæ°¢Ğ ¢ò¢f—"vVV¶Ç’6S¢WfW'’&"VæG2öâFöF’w2vVV¶F’Â6òâVæf–æ—6†V@¢vVV²æWfW"6ö×WFW2v—F‚6WfVâ6ö×ÆWFVBF—2â¢ğ¢6öç7B7WFöfcÖæWrFFR‡FöF”•4ò²uC£r’ævWDF’‚’Ç7F'G3ÕµÒÆ7W%7F'CÖæWrFFR‡vVV´öb‡FöF”•4ò’²uC£r“°¢f÷"†ÆWB“Ó¶“ãÓ¶’ÒÒ—¶6öç7BCÖæWrFFR†7W%7F'B“¶Bç6WDFFR†BævWDFFR‚’Ö’£r“·7F'G2çW6‚†BçFôÆö6ÆTFFU7G&–ær‚vVâÔ4r’“·Ğ¢6öç7BfÇ3×7F'G2æÖ‡3ÓæF—2ç&VGV6R‚‡7VÒÇ"“Óç¶6öç7BFCÖF—4&WGvVVâ‡2Ç"æB“·&WGW&â7VÒ²†FCãÓbfFCÃÖ7WFöfc÷FôB‡"æ¶Ò“£“·ÒÃ’’ÆÖƒÔÖF‚æÖ‚ƒÂââçfÇ2“°¢ÆWB&'3Òrs²fÇ2æf÷$V6‚‚‡bÆ’“Óç¶6öç7BƒÓ’¶’£#RãRÆ&ƒÔÖF‚æÖ‚ƒ"ÇböÖ‚£ƒB’Æ7W#Ö“ÓÓ×fÇ2æÆVæwF‚ÓÆÓÒt¤dÔÔ¤¤4ôäBu¶æWrFFR‡7F'G5¶•Ò²uC£r’ævWDÖöçF‚‚•Ó¶&'2³ÖÇ&V7B6Æ73Ò&v&""ƒÒ"G·‡Ò"“Ò"G³BÖ&‡Ò"v–GFƒÒ#r"†V–v‡CÒ"G¶&‡Ò"'ƒÒ#2"f–ÆÃÒ"G¶7W#òwf"‚ÒÖ66VçB’s¢wf"‚ÒÖ66VçBÖF–Ò’wÒ"÷6—G“Ò"G¶7W#ó¢ãS‡Ò#ãÂ÷&V7CãÇFW‡BƒÒ"G·‚³‚ãWÒ"“Ò"G³BÖ&‚ÓGÒ"FW‡BÖæ6†÷#Ò&Ö–FFÆR"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#r"f–ÆÃÒ"G¶7W#òwf"‚ÒÖ66VçBÖ–æ²’s¢wf"‚ÒÖ×WFVB’wÒ#âG´ÖF‚ç&÷VæB‡b—ÓÂ÷FW‡CãÇFW‡BƒÒ"G·‚³‚ãWÒ"“Ò#‚"FW‡BÖæ6†÷#Ò&Ö–FFÆR"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#r"f–ÆÃÒ'f"‚ÒÖ×WFVB’#âG¶×ÓÂ÷FW‡Cæ·Ò“°¢6öç7BF”æÖSÖæWrFFR‡FöF”•4ò²uC£r’çFôÆö6ÆTFFU7G&–ær‚vVâÕU2rÇ·vVV¶F“¢vÆöærwÒ“°¢‚³ÖÆƒ#äWfW'’vVV²G¶„7G2‚vWvVV²rÆV6‚vVV²—26ö×&VBF‡&÷Vv‚G¶F”æÖWÒÂ6òF†R7W'&VçBvVV²—2æ÷BVæÆ—¦VBf÷"F—2F†B†fRæ÷B†VæVBæÂt&÷WBWfW'’vVV²r—ÓÂöƒ#ãÆF—b6Æ73Ò&6&B#ãÇ7frf–Wt&÷ƒÒ#33#b"7G–ÆSÒ'v–GFƒ£S¶†V–v‡C¦WFò#ãÇFW‡BƒÒ#’"“Ò#"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#r"f–ÆÃÒ'f"‚ÒÖf–çB’#âG·F†—5–V'Ò+rD…$õTt‚G¶F”æÖRçFõWW$66R‚—ÓÂ÷FW‡CãÆÆ–æRƒÒ#’"“Ò#B"ƒ#Ò#32"“#Ò#B"7G&ö¶SÒ'f"‚ÒÖÆ–æR’"7G&ö¶R×v–GFƒÒ"ãb#ãÂöÆ–æSâG¶&'7ÓÂ÷7fsãÆF—b6Æ73Ò'F÷B#ãÇ7ããÆ#âG·fÇ2æB‚Ó’çFôf—†VBƒ—ÒG´ER‚—ÓÂö#âF†—2vVV³Â÷7ããÇ7ãæÆÂ&'2F‡&÷Vv‚G¶F”æÖRç6Æ–6RƒÃ2—ÓÂ÷7ããÂöF—cãÂöF—cæ°¢&WGW&âƒ°§Ğ Ğ Ğ¢ò¢ÒÒÒÒÒÒÒÒÒÒC#¢Æ—fR6öç6WVVæ6RöâF†RFB6WB'WGFöâÒÒÒÒÒÒÒÒÒÒ¢ğĞ¦gVæ7F–öâWDFE&Wf–Wr‚—°Ğ¢6öç7B&3ÖFö7VÖVçBævWDVÆVÖVçD'”–B‚w&2r’Â'FãÖFö7VÖVçBævWDVÆVÖVçD'”–B‚vFG&Wr“°Ğ¢–b‚&7ÇÂ'Fâ’&WGW&ã°Ğ¢6öç7B#×'6T–çB‡&2çfÇVRÃ“°Ğ¢–b‚‡#ã—ÇÂÆ–gBçvV–v‡B—²'FâçFW‡D6öçFVçCÒtFB6WBs²&WGW&ã²ĞĞ¢6öç7BCÖF’‡FöF”•4ò“°Ğ¢ÆWB7W#Ó²f÷"†6öç7B2öbBçr’–b‡2æW‚ÓÒu'Vâr’7W"³×2çr¢‡2ç&W7ÇÅµÒ’ç&VGV6R‚†Æ"“Óæ¶"Ã“°Ğ¢6öç7BçcÖ7W"¶Æ–gBçvV–v‡B§#°Ğ¢6öç7BF—7CÖf—&TF—7B‚wföÂr“°Ğ¢ÆWBv–ãÓ°Ğ¢–b†F—7BæÆVæwFƒãÓ3—°Ğ¢6öç7B&æ³×ƒÓç¶ÆWBÆóÓÆ†“ÖF—7BæÆVæwFƒ·v†–ÆR†ÆóÆ†’—¶6öç7BÓÒ†Æò¶†’“ãã¶–b†F—7E¶ÕÓÃ×‚–ÆóÖÒ³¶VÇ6R†“ÖÓ·×&WGW&âÆó·Ó°Ğ¢v–ã×&æ²†çb’×&æ²†7W"“°Ğ¢ĞĞ¢'Fâæ–ææW$…DÔÃÖFB6WCÇ7â6Æ73Ò&FG7V"#î(i"Æ#âG¶f×B„ÖF‚ç&÷VæB†çb’—ÓÂö#âGµR‚—ÒG¶v–ããö)k"G¶v–çÖ¢rwÓÂ÷7ãæ°Ğ§ĞĞ¦Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚v–çWBrÆSÓç²–b†RçF&vWBbfRçF&vWBæ–CÓÓÒw&2r’WDFE&Wf–Wr‚“²Ò“°Ğ Ğ Ğ¢ò¢C#¢F†RF’w2föÇVÖR4õTåE2UFò—G2æWrF÷FÂgFW"6fR¢ğĞ¦ÆWBöÆ7EföÃ×¶Wƒ¦çVÆÂÇc£Ó°Ğ¦gVæ7F–öâföÄ6÷VçEW‚—°Ğ¢6öç7BVÃÖFö7VÖVçBævWDVÆVÖVçD'”–B‚wföÄçVÒr“²–b‚VÂ’&WGW&ã°Ğ¢6öç7Bçc×'6TfÆöB†VÂæFF6WBæ¶wÇÂsr“°Ğ¢6öç7Bg&öÓÒ…öÆ7EföÂæWƒÓÓÖÆ–gBæW‚“õöÆ7EföÂçc¦çVÆÃ°Ğ¢öÆ7EföÃ×¶Wƒ¦Æ–gBæW‚Çc¦çgÓ°Ğ¢–b†g&öÓÓÓÖçVÆÇÇÆg&öÓãÖçb’&WGW&ã°Ğ¢–b‡v–æF÷ræÖF6„ÖVF–bfÖF6„ÖVF–‚r‡&VfW'2×&VGV6VBÖÖ÷F–öã§&VGV6R’r’æÖF6†W2’&WGW&ã°Ğ¢6öç7BC×W&f÷&Öæ6Rææ÷r‚’ÂCÓ3S°Ğ¢6öç7B7FWÖæ÷sÓç°Ğ¢6öç7BÔÖF‚æÖ–âƒÂ†æ÷r×C’ôB’ÂSÓÔÖF‚ç÷rƒ×Ã2“°Ğ¢VÂçFW‡D6öçFVçC×dF—7†g&öÒ²†çbÖg&öÒ’¦R“°Ğ¢–b‡Ã’&WVW7Dæ–ÖF–öäg&ÖR‡7FW“°Ğ¢Ó°Ğ¢&WVW7Dæ–ÖF–öäg&ÖR‡7FW“°Ğ§ĞĞ Ğ Ğ¢ò¢C3¢FÆ7BF–ÖR&÷r(	BF†BvV–v‡BÆöG2–çFòF†RÆövvW"¢ğĞ¦Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚v6Æ–6²rÆSÓç°Ğ¢6öç7B&÷sÖRçF&vWBæ6Æ÷6W7B‚ræÆ7G&÷u¶FFÖÇuÒr“²–b‚&÷r’&WGW&ã°Ğ¢6öç7BwcÖFö7VÖVçBævWDVÆVÖVçD'”–B‚wwbr“²–b‚wb’&WGW&ã°Ğ¢Æ–gBçvV–v‡CÒ·&÷ræFF6WBæÇs°Ğ¢6fTW…r†Æ–gBæW‚ÆÆ–gBçvV–v‡B“²6fR‡G'VR“°Ğ¢wbçfÇVS×tF—7†Æ–gBçvV–v‡B“°Ğ¢wbæ6Æ74Æ—7Bç&VÖ÷fR‚wvfÆ6‚r“²fö–Bwbæöfg6WEv–GFƒ²wbæ6Æ74Æ—7BæFB‚wvfÆ6‚r“°Ğ¢&Vg&W6„ÆöB‚“°Ğ¢–b‡G—VöbWDFE&Wf–WsÓÓÒvgVæ7F–öâr’WDFE&Wf–Wr‚“°Ğ§Ò“°Ğ Ğ¢ò¢ÒÒÒÒÒÒÒÒÒÒc2ã2ãƒ¢F†RÆ—fR6†'B7V·2F†RF–Ç’f—&Rw2ÆæwVvRÒÒÒÒÒÒÒÒÒĞĞ¢7Væv¦VRw27V2Âg&öÒ†—2÷vâ6†VWBF6†&ö&C¢Ö–B×v÷&¶÷WB†RvçG2Fò6VPĞ¢DôD’$•4”ärv–ç7BF†—2W†W&6—6Rw2†—7F÷'’(	Bæ÷B6—‚–FVçF–6Â&'2àĞ¢w&ÖÖ"—2F†Rf—&R6&Bw3¢w&’&'2&R–÷W"7B6W76–öç2ÂF†R&VB& Ğ¢—2–÷RÂ&–v‡Bæ÷râ—Bu$õu2v—F‚WfW'’6WBƒ3ƒ×2&—6R’Â'&VF†W2vVçFÇĞ¢v†–ÆRF†R6W76–öâ—2Æ—fRÂæB‡VçG2F†RF6†VBÆÂ×F–ÖRÖ&W7BÆ–æRâ7&÷70Ğ¢F†RÆ–æRæBF†RÆ&VÂ6öæ6VFW3¢&&W7B(	B&VFVâ"â¢ğĞ¦gVæ7F–öâW…6W76–öåföÇ2†W‚—°Ğ¢6öç7B'“×·Ó°Ğ¢f÷"†6öç7B¶BÇ&÷w5Òöbö&¦V7BæVçG&–W2…4TTBç6W76–öç2’Ğ¢f÷"†6öç7B"öb&÷w2’–b‡%³ÓÓÓÖW‚bb‡%³5×ÇÅµÒ’æÆVæwF‚Ğ¢'•¶EÓÒ†'•¶E×ÇÃ’·%³%Ò§%³5Òç&VGV6R‚†Æ"“Óæ¶"Ã“°Ğ¢f÷"†6öç7B¶BÇeÒöbö&¦V7BæVçG&–W2„D"æF—2’—°Ğ¢–b†CÃÕ4TTBçF÷FÇ2æÆ7GÇÆCÓÓ×FöF”•4ò’6öçF–çVS°Ğ¢f÷"†6öç7B2öbbçr’–b‡2æWƒÓÓÖW‚bb‡2ç&W7ÇÅµÒ’æÆVæwF‚Ğ¢'•¶EÓÒ†'•¶E×ÇÃ’·föÄöb‡2“°Ğ¢ĞĞ¢FVÆWFR'•·FöF”•4õÓ°Ğ¢&WGW&âö&¦V7BæVçG&–W2†'’’ç6÷'B‚†Æ"“Óæ³ÒæÆö6ÆT6ö×&R†%³Ò’’æÖ‚…¶BÇeÒ“Óâ‡¶BÇgÒ’“°Ğ§ĞĞ¦gVæ7F–öâÆ—fT&'2†W‚Ç6WG2Æ†VB—°Ğ¢6öç7B†—7CÖW…6W76–öåföÇ2†W‚“°Ğ¢6öç7Bæ÷s×6WG2ç&VGV6R‚†Ç2“Óæ·föÄöb‡2’Ã“°Ğ¢6öç7B6†÷vãÖ†—7Bç6Æ–6R‚ÓR“°Ğ¢6öç7B&W7CÔÖF‚æÖ‚‚ââæ†—7BæÖ†ƒÓæ‚çb’Ã“°Ğ¢6öç7B&VFVãÖæ÷sæ&W7C°Ğ¢6öç7B×ƒÔÖF‚æÖ‚†&W7BÆæ÷rÂââç6†÷vâæÖ†ƒÓæ‚çb’’£ã°Ğ¢6öç7BsÓ33ÄƒÓ3‚Æ&6SÓc°Ğ¢6öç7Bã×6†÷vâæÆVæwF‚³ÂvÔÖF‚æÖ–âƒ#BÂ…rÓs’öâ’Â'sÔÖF‚æÖ‚ƒbÄÖF‚æÖ–âƒbÆvÓB’“°Ğ¢ò¢c2ã2ãcC¢F†R6†'B—267'V&&&ÆR(	BG&r7&÷72F†R&'2æBF†RÆ–æPĞ¢&÷fR&VG2DDR+rdôÅTÔRf÷"v†–6†WfW"&"—2VæFW"–÷W"f–ævW"âF†PĞ¢&VF÷WB6—G2$õdRF†R6†'B‡F†Rc2ã2ã’ÆW76öã¢&VÆ÷r—BÂ—B†–FW0Ğ¢VæFW"F†R†æBFö–ærF†R67'V&&–ær’â¢ğĞ¢ÆWBƒÖÆƒ#âG¶†VGÇÂuFöF’+rÆ—fRwÓÂöƒ#ãÆF—b6Æ73Ò&6&BÆ'w&#àĞ¢ÆF—b6Æ73Ò&Æ'&VBÖöæò#âfæ'7³ÂöF—càĞ¢Ç7fr6Æ73Ò&Æ'7fr"f–Wt&÷ƒÒ#GµwÒG´‡Ò"7G–ÆSÒ'v–GFƒ£S¶†V–v‡C¦WFó·F÷V6‚Ö7F–öã§â×’#æ°Ğ¢6öç7B'“Ö&6RÒ†&W7Bö×‚’£ƒƒ°Ğ¢‚³ÖÆÆ–æRƒÒ#‚"“Ò"G¶'’çFôf—†VBƒ—Ò"ƒ#Ò"GµrÓ‡Ò"“#Ò"G¶'’çFôf—†VBƒ—Ò"7G&ö¶SÒ'f"‚Ò×&V6÷&B’"7G&ö¶R×v–GFƒÒ#ã‚"7G&ö¶RÖF6†'&“Ò#22"÷6—G“Ò"ãsR#ãÂöÆ–æSàĞ¢ÇFW‡BƒÒ"GµrÓÒ"“Ò"G²†'’ÓB’çFôf—†VBƒ—Ò"FW‡BÖæ6†÷#Ò&VæB"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#rãR"f–ÆÃÒ'f"‚Ò×&V6÷&B’#âG¶&VFVãòv&W7B(	B&VFVâ)É2s¦&W7BG¶f×B„ÖF‚ç&÷VæB‡FõR†&W7B’’—ÖÓÂ÷FW‡Cæ°Ğ¢6†÷vâæf÷$V6‚‚‡3"Æ“"“Óç°Ğ¢6öç7B&ƒÔÖF‚æÖ‚ƒ"ãRÂ‡3"çbö×‚’£ƒ‚’ÂƒÓ¶“"¦v°Ğ¢‚³ÖÇ&V7B6Æ73Ò&Æ&&""FFÖCÒ"G·3"æGÒ"FF×cÒ"G·3"çgÒ"FFÖ7ƒÒ"G²‡‚¶'ró"’çFôf—†VBƒ—Ò"ƒÒ"G·‚çFôf—†VBƒ—Ò"“Ò"G²†&6RÖ&‚’çFôf—†VBƒ—Ò"v–GFƒÒ"G¶'rçFôf—†VBƒ—Ò"†V–v‡CÒ"G¶&‚çFôf—†VBƒ—Ò"'ƒÒ#""f–ÆÃÒ'f"‚ÒÖÆ–æR’#ãÂ÷&V7Cæ°Ğ¢Ò“°Ğ¢6öç7BæƒÔÖF‚æÖ‚ƒ2Â†æ÷rö×‚’£ƒ‚’ÂçƒÓ·6†÷vâæÆVæwF‚¦v°Ğ¢‚³ÖÇ&V7B6Æ73Ò&Æ$æ÷rÆ&&""FFÖCÒ"G·FöF”•4÷Ò"FF×cÒ"G¶æ÷wÒ"FFÖ7ƒÒ"G²†ç‚´ÖF‚æÖ‚†'rÃ"’ó"’çFôf—†VBƒ—Ò"ƒÒ"G¶ç‚çFôf—†VBƒ—Ò"“Ò"G²†&6RÖæ‚’çFôf—†VBƒ—Ò"v–GFƒÒ"G´ÖF‚æÖ‚†'rÃ"’çFôf—†VBƒ—Ò"†V–v‡CÒ"G¶æ‚çFôf—†VBƒ—Ò"'ƒÒ#"ãR"f–ÆÃÒ'f"‚ÒÖÆ—fR’#ãÂ÷&V7CàĞ¢ÇFW‡BƒÒ"G²†ç‚´ÖF‚æÖ‚†'rÃ"’ó"’çFôf—†VBƒ—Ò"“Ò"G²†&6RÖæ‚ÓR’çFôf—†VBƒ—Ò"FW‡BÖæ6†÷#Ò&Ö–FFÆR"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#‚ãR"föçB×vV–v‡CÒ#s"f–ÆÃÒ"G¶&VFVãòwf"‚Ò×&V6÷&B’s¢wf"‚ÒÖÆ—fR’wÒ#âG·dF—7†æ÷r—ÓÂ÷FW‡CàĞ¢ÇFW‡BƒÒ"G²†ç‚´ÖF‚æÖ‚†'rÃ"’ó"’çFôf—†VBƒ—Ò"“Ò"G¶&6R³Ò"FW‡BÖæ6†÷#Ò&Ö–FFÆR"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#rãR"föçB×vV–v‡CÒ#s"f–ÆÃÒ'f"‚ÒÖÆ—fR’#ææ÷sÂ÷FW‡Cæ°Ğ¢6öç7B&VG3×6†÷vâæf–ÇFW"‡3#Óææ÷sç3"çb’æÆVæwFƒ°Ğ¢‚³ÖÇFW‡BƒÒ#"“Ò"G´‚ÓGÒ"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#rãR"f–ÆÃÒ'f"‚ÒÖ×WFVB’#âG·6WG2æÆVæwF‡Ò6WBG·6WG2æÆVæwFƒãòw2s¢rwÒ+r&VG2G¶&VG7Òöb–÷W"Æ7BG·6†÷vâæÆVæwF‡ÒG¶W‡Ò6W76–öç3Â÷FW‡Cæ°Ğ¢‚³ÖÂ÷7fsãÂöF—cæ°Ğ¢&WGW&âƒ°Ğ§ĞĞ¢ò¢c2ã2ãcC¢67'V"(	Bö–çFW"‚(i"æV&W7B&"(i"&VF÷WB²†–v†Æ–v‡Bâ&÷Væ@Ğ¢W"×&VæFW"†–FV×÷FVçBfÆr’Âö–çFW"WfVçG26òG&6·G2v÷&²Föòâ¢ğĞ¦gVæ7F–öâ&–æDÆ%67'V"‚—°Ğ¢6öç7B7fsÖFö7VÖVçBçVW'•6VÆV7F÷"‚ræÆ'7frr“°Ğ¢–b‚7fwÇÇ7frå÷67'V"’&WGW&ã²7frå÷67'V#×G'VS°Ğ¢6öç7B&VC×7frç&VçDVÆVÖVçBçVW'•6VÆV7F÷"‚ræÆ'&VBr“°Ğ¢6öç7B–6³ÖSÓç°Ğ¢6öç7B#×7frævWD&÷VæF–æt6Æ–VçE&V7B‚“°Ğ¢6öç7BgƒÒ†Ræ6Æ–VçE‚×"æÆVgB’÷"çv–GF‚£33°Ğ¢ÆWB&W7CÖçVÆÂÆ&CÓS“°Ğ¢7frçVW'•6VÆV7F÷$ÆÂ‚ræÆ&&"r’æf÷$V6‚†#Óç°Ğ¢6öç7BCÔÖF‚æ'2‚¶"æFF6WBæ7‚×g‚“°Ğ¢–b†CÆ&B—¶&CÖC¶&W7CÖ#·ĞĞ¢Ò“°Ğ¢–b‚&W7B’&WGW&ã°Ğ¢7frçVW'•6VÆV7F÷$ÆÂ‚ræÆ&&"r’æf÷$V6‚†#Óç°Ğ¢–b†"æ6Æ74Æ—7Bæ6öçF–ç2‚vÆ$æ÷rr’’&WGW&ã°Ğ¢"ç6WDGG&–'WFR‚vf–ÆÂrÆ#ÓÓÖ&W7Còwf"‚ÒÖ66VçB’s¢wf"‚ÒÖÆ–æR’r“°Ğ¢Ò“°Ğ¢6öç7BCÖ&W7BæFF6WBæBÂcÒ¶&W7BæFF6WBçc°Ğ¢&VBçFW‡D6öçFVçCÒ†CÓÓ×FöF”•4óòwFöF’s¦G·vC"†B—ÒG¶Bç6Æ–6RƒR’ç&WÆ6R‚rÒrÂròr—Ö’¶+rG·dF—7‡b—ÒGµR‚—Ö°Ğ¢Ó°Ğ¢7fræFDWfVçDÆ—7FVæW"‚wö–çFW&F÷vârÆSÓç·7fråööã×G'VS·–6²†R“·Ò“°Ğ¢7fræFDWfVçDÆ—7FVæW"‚wö–çFW&Ö÷fRrÆSÓç¶–b‡7fråööâ—–6²†R“·Ò“°Ğ¢6öç7BöfcÒ‚“Óç·7fråööãÖfÇ6S·Ó²òò&VF÷WBW'6—7G2(	BF†Rç7vW"7F—2&VF&ÆPĞ¢7fræFDWfVçDÆ—7FVæW"‚wö–çFW'WrÆöfb“²7fræFDWfVçDÆ—7FVæW"‚wö–çFW&6æ6VÂrÆöfb“°Ğ§ĞĞ¢ò¢F†R&VB&"$•4U3¢66ÆU’g&öÒF†R&Wf–÷W2F÷FÂFòF†RæWröæR¢ğĞ¦ÆWBöÆ%&Wc×¶Wƒ¦çVÆÂÇc£Ó°Ğ¦gVæ7F–öâÆ$w&÷r‚—°Ğ¢6öç7B#ÖFö7VÖVçBçVW'•6VÆV7F÷"‚ræÆ$æ÷rr“²–b‚"—²öÆ%&Wc×¶Wƒ¦çVÆÂÇc£Ó²&WGW&ã²ĞĞ¢6öç7Bçc×'6TfÆöB‡"æFF6WBçgÇÂsr“°Ğ¢6öç7Bg&öÓÒ…öÆ%&WbæWƒÓÓÖÆ–gBæW‚“õöÆ%&Wbçc¦çVÆÃ°Ğ¢öÆ%&Wc×¶Wƒ¦Æ–gBæW‚Çc¦çgÓ°Ğ¢–b†g&öÓÓÓÖçVÆÇÇÆg&öÓÃÓÇÆg&öÓãÖçb’&WGW&ã°Ğ¢–b‡v–æF÷ræÖF6„ÖVF–bfÖF6„ÖVF–‚r‡&VfW'2×&VGV6VBÖÖ÷F–öã§&VGV6R’r’æÖF6†W2’&WGW&ã°Ğ¢"ç7G–ÆRçG&ç6—F–öãÒvæöæRs°Ğ¢"ç7G–ÆRçG&ç6f÷&ÓÖ66ÆU’‚G²†g&öÒöçb’çFôf—†VBƒ2—Ò–°Ğ¢&WVW7Dæ–ÖF–öäg&ÖR‚‚“Óç·&WVW7Dæ–ÖF–öäg&ÖR‚‚“Óç°Ğ¢"ç7G–ÆRçG&ç6—F–öãÒwG&ç6f÷&Òã3‡27V&–2Ö&W¦–W"‚ã"Âã‚Âã2Ã’s°Ğ¢"ç7G–ÆRçG&ç6f÷&ÓÒw66ÆU’ƒ’s°Ğ¢Ò“·Ò“°Ğ§ĞĞ