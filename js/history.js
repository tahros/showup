/* ShowUp — history.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- History ---------- */
/* v3.3.61: past sessions are editable, but only deliberately. A day enters
   edit mode by its own Edit button; until then the record is inert, so a
   thumb landing mid-scroll can never rewrite three weeks ago. Every state
   walks back out: Done exits, and any re-render or tab change clears it. */
/* v3.3.358: the day actions are GLYPHS. Two words in a session header were
   two words competing with the date, the parts and the totals -- the row's
   job is to say what you did, and the controls should be available without
   being read.
   Drawn here rather than imported. The maker linked two Noun Project icons;
   those are licensed assets carrying attribution terms, so these are the
   standard forms of the same two symbols, drawn as inline SVG: the three-node
   share and the pencil. Inline means they inherit currentColor, so they take
   the pill's colour in both themes and the accent fill while editing, with no
   asset to ship, cache or bust.
   EDIT BECOMES A CHECK while the day is open. The word used to flip Edit ->
   Done; a pencil that stays a pencil would lose the only cue that says how to
   get out, and the accent fill alone is a colour, not an instruction.
   Every button keeps an aria-label and gains a title, because an icon with no
   name is a button nobody can identify -- by screen reader or by hover. */
const _ico=(p)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO_SHARE=_ico('<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.7l7.4-4.4M15.7 17.7l-7.4-4.4"/>');
const ICO_EDIT=_ico('<path d="M4 20h4L19.3 8.7a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6 4 20z"/><path d="M14.8 6.4l3.4 3.4"/>');
const ICO_DONE=_ico('<path d="M5 12.8l4.2 4.2L19 7.2"/>');

function partForEx(ex,d){
  for(const [pt,list] of Object.entries(SEED.catalog||{})) if((list||[]).includes(ex)) return pt;
  const w=((DB.days[d]||{}).w)||[];
  const hit=w.find(s=>s.ex===ex);
  return hit?hit.part:'';
}
function msMarkFor(d){
  const i=[...SEED.dates].sort().indexOf(d);
  if(i<0) return 0;
  const nth=i+1;
  return msLadder(nth)?nth:0;
}
function hsetEditor(d){
  const es=hist.editSet; if(!es) return '';
  const w=((DB.days[d]||{}).w)||[];
  const s=es.wi!=null?w[es.wi]:null;
  const isRun=es.ex==='Run';
  const wv=s?(isRun?dDisp(s.w):wDisp(s.w)):'';
  const rv=s&&!isRun?((s.reps||[])[es.ri]??''):'';
  return `<div class="card editcard hsedit" style="margin-top:8px">
      <div class="mono muted" style="font-size:11px;margin-bottom:8px">${es.wi==null?'ADD':'EDIT'} — ${es.ex}</div>
      <div class="row" style="gap:8px">
        <div class="fld"><label>${isRun?'Distance '+DU():'Weight '+U()}</label>
          <input id="hsW" type="number" inputmode="decimal" step="${isRun?'0.01':wStep(es.ex)}" value="${wv}"></div>
        ${isRun
          ?`<div class="fld"><label>Min</label><input id="hsM" type="number" inputmode="numeric" value="${s?(s.mins||0):0}"></div>
            <div class="fld"><label>Sec</label><input id="hsS" type="number" inputmode="numeric" value="${s?(s.secs||0):0}"></div>`
          :`<div class="fld"><label>Reps</label><input id="hsR" type="number" inputmode="numeric" value="${rv}"></div>`}
      </div>
      <div class="row" style="gap:8px;margin-top:10px">
        <button class="btn" id="hsSave" style="margin:0">Save</button>
        <button class="btn ghost" id="hsCancel" style="margin:0;flex:0 0 96px">Cancel</button>
      </div></div>`;
}
/* one writer for every past-day mutation: stamp the day, re-derive, persist.
   deriveAll() must run or the calendar, digests and totals keep stale numbers. */
function commitPastDay(d,label){
  const t=DB.days[d]; if(!t) return;
  t.w=t.w.filter(s=>s.ex==='Run'||(s.reps||[]).length);   // drop emptied entries
  if(!t.w.length){ delete DB.days[d]; }
  else { t.upd=Date.now(); resealDay(t); }
  SEED=deriveAll(); _fireDist=null;
  save(); renderHeader(); toast(label);
}
/* v3.3.37: History gains a second axis. Dates answer "when did I train";
   body parts answer "how consistent have I been with THIS, and have I grown".
   Selecting a part filters every date surface below it — year counts, month
   counts, calendar, session list — so the two selectors compose instead of
   competing. Built off allDays() rather than SEED.partDays, which deriveAll
   caps at 365 days; History has to see all 918. */
function partDayMap(detail){
  const m={};
  for(const [d,list] of Object.entries(detail)){
    const s=new Set();
    for(const r of list) if(r.part) s.add(r.part);
    if(s.size) m[d]=s;
  }
  return m;
}
/* v3.3.266: a viewed month or year as plain text, for pasting into an LLM or
   a note. The WHOLE period, part filter deliberately ignored — the use case is
   handing over the complete ledger, and a silently filtered export would be
   a lie of omission. Chronological (a document, not a feed), grouped like
   the receipt: one line per exercise, weight sub-runs in logged order.
   Read-only: built from the same canonical merge every other reader uses. */
function periodText(y,m){
  const months=m?[m]:Array.from({length:12},(_,i)=>i+1);
  const days=[];
  for(const mm of months){
    const key=`${y}-${String(mm).padStart(2,'0')}`;
    const dim=new Date(y,mm,0).getDate();
    for(let dd=1;dd<=dim;dd++){
      const iso=`${key}-${String(dd).padStart(2,'0')}`;
      const rows=(iso===todayISO?((DB.days[iso]||{}).w||[]).map(s2=>[s2.part,s2.ex,s2.w,s2.reps||[],s2.mins,s2.secs])
                                :(SEED.sessions[iso]||[]));
      if(rows.length) days.push([iso,rows]);
    }
  }
  const periodName=m?new Date(y,m-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'}):String(y);
  let mv=0,mkm=0,msets=0;
  const lines=[];
  for(const [iso,rows] of days){
    const parts=[],byEx=[],seen={};
    let v=0,km=0,sets=0,run=null;
    for(const r of rows){
      if(!parts.includes(r[0])) parts.push(r[0]);
      if(r[1]==='Run'){ km+=r[2]; sets++; run={km:r[2],min:r[4],sec:r[5]}; continue; }
      v+=r[2]*(r[3]||[]).reduce((a,b)=>a+b,0); sets+=(r[3]||[]).length;
      if(!(r[1] in seen)){ seen[r[1]]=byEx.length; byEx.push({ex:r[1],subs:[]}); }
      byEx[seen[r[1]]].subs.push([r[2],r[3]||[]]);
    }
    mv+=v; mkm+=km; msets+=sets;
    const dt=new Date(iso+'T00:00');
    const head=[dt.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}),
      parts.join(' \u00b7 '),
      [v?fmt(Math.round(toU(v)))+' '+U():null, km?dDisp(km)+' '+DU():null].filter(Boolean).join(' \u00b7 ')]
      .filter(Boolean).join(' \u2014 ');
    lines.push(head);
    if(run){
      const t=run.min!=null?` in ${run.min+Math.floor((run.sec||0)/60)}'${String((run.sec||0)%60).padStart(2,'0')}`:'';
      lines.push(`  Run: ${dDisp(run.km)} ${DU()}${t}`);
    }
    for(const g of byEx){
      const n=g.subs.reduce((a,s2)=>a+s2[1].length,0);
      const runTxt=g.subs.map(([w2,reps])=>`${wDisp(w2)}${U()}\u00d7${reps.join('/')}`).join(' \u00b7 ');
      lines.push(`  ${g.ex}: ${runTxt} (${n} set${n===1?'':'s'})`);
    }
    lines.push('');
  }
  const head=`ShowUp \u2014 ${periodName}${firstName()?` (${firstName()})`:''}\n`
    +`${days.length} day${days.length===1?'':'s'} trained \u00b7 ${fmt(msets)} sets`
    +`${mv?` \u00b7 ${fmt(Math.round(toU(mv)))} ${U()}`:''}${mkm?` \u00b7 ${dDisp(mkm)} ${DU()}`:''}\n`;
  return head+'\n'+lines.join('\n').trimEnd()+'\n';
}
function monthText(){ return periodText(hist.y,hist.m); }
function yearText(){ return periodText(hist.y); }
async function copyPeriod(t,label){
  /* the notice is part of the feature: the person must KNOW it copied */
  try{ await navigator.clipboard.writeText(t); toast(label+' copied as text'); }
  catch(e){
    try{
      const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove();
      toast(label+' copied as text');
    }catch(e2){ toast('Copy failed'); }
  }
}
function copyMonth(){ return copyPeriod(monthText(),'Month'); }
function copyYear(){ return copyPeriod(yearText(),'Year'); }
function partSessions(part,detail){
  const out=[];
  for(const [d,list] of Object.entries(detail)){
    const rows=list.filter(s=>s.part===part);
    if(!rows.length) continue;
    let vol=0,km=0,sets=0;
    for(const s of rows){
      if(s.ex==='Run') km+=s.w;
      else { vol+=volOf(s); sets+=(s.reps||[]).length; }
    }
    out.push({d,vol,km,sets});
  }
  return out.sort((a,b)=>a.d<b.d?-1:1);
}
/* v3.3.285: partDigest() DELETED. It left History in v3.3.258 (ledger vs
   analysis) and survived as Today's live hero; with that hero gone it had no
   callers at all. Its final job was a mid-session verdict — "volume down 70%
   vs your previous 5 sessions", in red, computed while the session was still
   half-logged — which is the one thing this app does not do. partSessions()
   stays: it answers "which sessions included this part", which is a question,
   not a judgement. Git remembers the code. */
function renderHistory(){
  if(SEED.totals.sessions===0 && !hasAnyDays()){ $('#view').innerHTML=emptyHero('history'); return; }
  const detail=allDays();
  const pMap=partDayMap(detail);
  const P=hist.part||null;
  // every date surface below answers to the part filter, or to nothing
  const dates=P ? new Set(Object.keys(pMap).filter(d=>pMap[d].has(P))) : workoutDates();
  if(!hist.y){ hist.y=+thisYear; hist.m=+todayISO.slice(5,7); }

  // merged monthly summary (seed + app logs)
  const monthly=JSON.parse(JSON.stringify(SEED.monthly));
  for(const [d,v] of Object.entries(DB.days)){
    if(!v.w.length || d<=SEED.totals.last) continue;
    const m=d.slice(0,7);
    const mm=monthly[m]=monthly[m]||{days:0,vol:0,km:0,sets:0};
    mm.days++;
    v.w.forEach(s=>{ if(s.ex==='Run')mm.km+=s.w; else{mm.vol+=volOf(s);mm.sets+=s.reps.length;} });
  }

  const firstYear=SEED.totals.first?+SEED.totals.first.slice(0,4):+thisYear;
  const years=[]; for(let y=firstYear; y<=+thisYear; y++) years.push(y);
  /* v3.3.267: sharing is an action, not the final chapter of the ledger.
     Keep its collapsed launcher at the top, before History's date controls,
     and let reportCardSection own the expanded carousel in the same place. */
  let h=typeof reportCardSection==='function'?reportCardSection():'';
  h+=`<div class="chips ychips">`;
  years.forEach(y=>{
    const n=[...dates].filter(d=>+d.slice(0,4)===y).length;
    h+=`<button class="chip ${y===hist.y?'on':''}" data-histy="${y}">${y}<span class="n">${n}d</span></button>`;
  });
  h+=`</div><div class="mchips">`;
  for(let m=1;m<=12;m++){
    const key=`${hist.y}-${String(m).padStart(2,'0')}`;
    const n=P ? [...dates].filter(d=>d.startsWith(key)).length : ((monthly[key]||{}).days||0);
    const future=key>todayISO.slice(0,7);
    h+=`<button class="mchip ${m===hist.m?'on':''} ${(!n||future)?'dim':''}" data-histm="${m}" ${future?'disabled':''}>
          <span>${new Date(hist.y,m-1,1).toLocaleDateString('en-US',{month:'short'})}</span><b>${future?'·':n}</b></button>`;
  }
  h+=`</div>`;

  // body-part selector — the second way in
  const allParts=Object.keys(SEED.catalog||{}).filter(pt=>Object.values(pMap).some(s=>s.has(pt)));
  h+=`<h2 class="quiet">Body part</h2><div class="chips pchips">
        <button class="chip ${P?'':'on'}" data-histp="">All</button>`;
  allParts.forEach(pt=>{
    const n=Object.values(pMap).filter(s=>s.has(pt)).length;
    h+=`<button class="chip ${pt===P?'on':''}" data-histp="${pt}">${pt}<span class="n">${fmt(n)}d</span></button>`;
  });
  h+=`</div>`;
  /* v3.3.258: the part digest is gone from History. History is the LEDGER —
     date-addressed, a record of what happened. The digest was analysis:
     a cadence ("every ~7d"), a volume verdict ("up 9% vs your previous 5
     sessions"), an all-time tonnage. Two of those are the things this app
     deliberately refuses to lead with, and all three answer a question
     rather than a date, which is Stats' job. The chips stay — they filter
     the calendar and the sessions below, which IS date-addressed work.
     partDigest itself was deleted in v3.3.285, once the Today hero that had
     kept it alive was removed too. */

  // month calendar
  const key=`${hist.y}-${String(hist.m).padStart(2,'0')}`;
  const dim=new Date(hist.y,hist.m,0).getDate();
  const off=new Date(hist.y,hist.m-1,1).getDay();
  let mm=monthly[key]||{days:0,vol:0,km:0,sets:0};
  if(P){
    mm={days:0,vol:0,km:0,sets:0};
    for(const d of [...dates].filter(x=>x.startsWith(key))){
      mm.days++;
      for(const s of (detail[d]||[])) if(s.part===P){
        if(s.ex==='Run') mm.km+=s.w; else { mm.vol+=volOf(s); mm.sets+=(s.reps||[]).length; }
      }
    }
  }
  h+=`<div class="card" style="margin-top:12px">
        <div class="row spread" style="margin-bottom:10px">
          <b style="font-family:var(--disp)">${new Date(hist.y,hist.m-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'})}</b>
          <span class="mono muted" style="font-size:12px"><b style="color:var(--accent)">${mm.days}</b> days trained</span>
        </div>
        <div class="cal">
          ${['S','M','T','W','T','F','S'].map(d=>`<span class="cw">${d}</span>`).join('')}
          ${'<span></span>'.repeat(off)}`;
  for(let d=1;d<=dim;d++){
    const iso=`${key}-${String(d).padStart(2,'0')}`;
    const on=dates.has(iso), today=iso===todayISO, fut=iso>todayISO;
    /* v3.3.160: retro logging. An EMPTY day within the last 7 becomes a
       door — tap it and a quiet form opens for that date. The record is a
       record of training, not of logging discipline, so a backfilled day
       repairs the streak the moment deriveAll ingests it. Older than 7
       days stays sealed: available, but minimal. */
    const bf=!on&&!fut&&!today&&(()=>{const a=new Date(todayISO+'T00:00'),b=new Date(iso+'T00:00');
      const dd=(a-b)/86400000; return dd>=1&&dd<=7;})();
    h+=`<span class="cd ${on?'on':''} ${today?'now':''} ${fut?'fut':''} ${bf?'bf':''}" ${on?`data-hd="${iso}" role="button"`:(bf?`data-backfill="${iso}" role="button" aria-label="Log a workout for ${iso}"`:'')}>${d}</span>`;
  }
  h+=`</div>`;
  if(hist.bf&&hist.bf.startsWith(key)){
    const B=hist.bf, isR=hist.bfPart==='Run';
    const parts=Object.keys(SEED0.catalog);
    h+=`<div class="card bfcard" style="margin-top:12px">
      <div class="lasthead"><span>LOG A PAST DAY</span><span class="ago">${B}</span></div>
      <div class="chips" style="margin-bottom:8px">${parts.map(pt=>`<button class="chip ${hist.bfPart===pt?'on':''}" data-bfpart="${pt}">${pt}</button>`).join('')}</div>
      ${hist.bfPart?(isR
        ?`<div class="row" style="gap:8px">
            <div class="fld"><label>Distance ${DU()}</label><input id="bfKm" type="number" inputmode="decimal" step="0.01"></div>
            <div class="fld"><label>Min</label><input id="bfMin" type="number" inputmode="numeric"></div>
            <div class="fld"><label>Sec</label><input id="bfSec" type="number" inputmode="numeric"></div></div>`
        :`<div class="fld text" style="margin-bottom:8px"><label>Exercise</label>
            <input id="bfEx" type="text" list="bfExList" placeholder="e.g. Squat">
            <datalist id="bfExList">${(SEED0.catalog[hist.bfPart]||[]).map(x=>`<option value="${x}">`).join('')}</datalist></div>
          <div class="row" style="gap:8px">
            <div class="fld"><label>Weight ${U()}</label><input id="bfW" type="number" inputmode="decimal" step="0.5"></div>
            <div class="fld"><label>Reps (comma for sets)</label><input id="bfR" type="text" inputmode="numeric" placeholder="10,10,8"></div></div>`)
       :''}
      <div class="row" style="gap:8px;margin-top:10px">
        <button class="btn" id="bfAdd" style="margin:0" ${hist.bfPart?'':'disabled'}>Add to ${B.slice(5)}</button>
        <button class="btn ghost" id="bfClose" style="margin:0;flex:0 0 96px">Close</button></div></div>`;
  }
  h+=`<div class="tot" style="margin-top:12px">
        <span>${mm.sets?fmt(mm.sets)+' sets':''}${mm.sets&&mm.km?' · ':''}${mm.km?dDisp(mm.km)+' '+DU():''}</span>
        <span>${mm.vol?vDisp(mm.vol)+' '+U()+' lifted':''}</span></div></div>`;

  // day cards for that month, where detail exists
  const monthDays=Object.keys(detail).filter(d=>d.startsWith(key)&&(!P||dates.has(d))).sort().reverse();
  if(monthDays.length){
    h+=`<h2 class="quiet">Sessions<span class="hacts copyacts"><button class="dayedit" data-mcopy
        aria-label="Copy this month's sessions as text">Copy month</button><button class="dayedit" data-ycopy
        aria-label="Copy this year's sessions as text">Copy year</button></span></h2>`;
    monthDays.forEach(d=>{
      const list=P?detail[d].filter(s=>s.part===P):detail[d];
      if(!list.length) return;
      const vol=list.reduce((a,s)=>a+volOf(s),0);
      const km=list.filter(s=>s.ex==='Run').reduce((a,s)=>a+s.w,0);
      /* v3.3.62: a part whose only entry is an empty legacy marker isn't a
         part you trained — don't name it in the summary. */
      const parts=[...new Set(list.filter(s=>s.ex==='Run'||(s.reps||[]).length)
                                  .map(s=>s.part).filter(Boolean))].join(' · ');
      const bits=[];
      if(vol)bits.push(vDisp(vol)+' '+U());
      if(km)bits.push(dDisp(km)+DU());
      /* v3.3.43: open by default, and grouped the way the LAST TIME card
         groups — weight on the left, reps as chips.
         Grouping is by exercise GLOBALLY (first-appearance order), not by
         consecutive runs: supersets alternate Side Raise / Front Raise /
         Side Raise, so consecutive grouping would read WORSE than the flat
         list it replaces. Within one exercise, folding stays consecutive,
         which keeps that exercise's own narrative (16 → 20 → back to 12). */
      /* v3.3.61: editing addresses the ORIGINAL entry index in DB.days[d].w,
         so a legacy row carrying reps:[20,20,20,20] stays precisely editable
         set-by-set. Only locally stored days can be edited — older months
         live in the sheet and have no entries to point at. */
      const dayW=((DB.days[d]||{}).w)||[];
      const editable=dayW.length>0;
      const editing=editable&&hist.edit===d;
      const byEx=[], seen={};
      dayW.forEach((s,wi)=>{
        if(P&&s.part!==P) return;
        if(!(s.ex in seen)){ seen[s.ex]=byEx.length; byEx.push({ex:s.ex,sets:[],idx:[]}); }
        byEx[seen[s.ex]].sets.push([s.w,s.reps||[],s.mins,s.secs]);
        byEx[seen[s.ex]].idx.push(wi);
      });
      if(!byEx.length) for(const s of list){
        if(!(s.ex in seen)){ seen[s.ex]=byEx.length; byEx.push({ex:s.ex,sets:[],idx:[]}); }
        byEx[seen[s.ex]].sets.push([s.w,s.reps||[],s.mins,s.secs]);
      }
      h+=`<details class="day${editing?' editing':''}" open data-d="${d}"><summary>
          <span><span class="d">${pretty(d)}</span><div class="s">${(m=>m?`Day ${fmt(m)} · `:'')(msMarkFor(d))}${parts||'—'}</div></span>
          <span class="s">${bits.join(' · ')}${editable?`<button class="dayedit ico" data-dshare="${d}" aria-label="Share this day as an image" title="Share">${ICO_SHARE}</button><button class="dayedit ico" data-hedit="${d}" aria-label="${editing?'Finish editing this day':'Edit this day'}" title="${editing?'Done':'Edit'}">${editing?ICO_DONE:ICO_EDIT}</button>`:''}</span></summary><div class="body">`;
      byEx.forEach(g=>{
        /* v3.3.62: a set is a REP. Legacy sheet rows carry reps:[] as bare
           markers — they render nothing, so counting them as 1 printed
           "1 set" above an empty group. Runs are the one entry that is
           itself a set. A group with nothing real to show is skipped
           entirely, which v3.3.61 stopped doing when it replaced the old
           `if(!folded.length) return`. */
        const n=g.sets.reduce((a,s)=>a+(g.ex==='Run'?1:(s[1]||[]).length),0);
        if(!n) return;
        h+=`<div class="exgrp"><div class="lasthead"><span>${g.ex}</span>`
          +`<span class="ago">${n} set${n>1?'s':''}</span></div>`;
        if(!editing){
          const folded=foldSets(g.sets,g.ex);
          h+= folded.length?setRows(g.ex,folded,false):'';
        }else{
          h+=`<div class="hsets">`;
          g.idx.forEach(wi=>{
            const s=dayW[wi];
            if(s.ex==='Run'){
              h+=`<button class="hset" data-hs="${wi}"><span class="mono">${dDisp(s.w)} ${DU()}</span>`
                +`<span class="mono muted">${s.mins||0}'${String(s.secs||0).padStart(2,'0')}"</span>`
                +`<i class="hsx" data-hdel="${wi}:-1">✕</i></button>`;
            }else (s.reps||[]).forEach((r,ri)=>{
              h+=`<button class="hset" data-hs="${wi}:${ri}"><span class="mono">${wLabel(g.ex,s.w)}</span>`
                +`<span class="mono muted">× ${r}</span>`
                +`<i class="hsx" data-hdel="${wi}:${ri}">✕</i></button>`;
            });
          });
          h+=`</div><button class="hadd" data-hadd="${g.ex}">+ set</button>`;
          if(hist.editSet&&hist.editSet.d===d&&hist.editSet.ex===g.ex) h+=hsetEditor(d);
        }
        h+=`</div>`;
      });
      h+=`</div></details>`;
    });
  }else if(mm.days){
    h+=`<div class="note" style="margin-top:12px">Set-level detail for this month lives in the sheet —
        the app carries full sessions for roughly the last four months, plus anything logged here.</div>`;
  }else{
    h+=`<div class="note" style="margin-top:12px">${P?`No ${P} logged this month.`:'No training logged this month.'}</div>`;
  }
  if(hist.edit&&!DB.days[hist.edit]){ hist.edit=null; hist.editSet=null; }   // v3.3.61: the day may have been emptied
  killCalReturn();                  // v3.3.59: a re-render invalidates the return ticket
  $('#view').innerHTML=h;
  /* v3.3.39: centre the selected year in its strip. scrollLeft rather than
     scrollIntoView, which would also scroll the page vertically to reach it. */
  {
    const strip=document.querySelector('.ychips');
    const on=strip&&strip.querySelector('.chip.on');
    if(strip&&on) strip.scrollLeft=Math.max(0,on.offsetLeft-(strip.clientWidth-on.offsetWidth)/2);
  }
  if(window._histTarget){
    const el=document.querySelector(`details.day[data-d="${window._histTarget}"]`);
    if(el){ el.open=true; if(el.scrollIntoView) setTimeout(()=>el.scrollIntoView({block:'start',behavior:'smooth'}),60); }
    window._histTarget=null;
  }
}


/* v3.3.17: the calendar cells are the most obvious tap targets in History —
   a trained day opens its session in the list below and scrolls to it.
   Rest days stay inert: there is nothing to open, and that's the point. */
/* v3.3.61: past-day editing handlers. Delegated, and every one of them
   funnels through commitPastDay so a mutation can't skip the re-derive. */
document.addEventListener('click',e=>{
  const bfc=e.target.closest('[data-backfill]');
  if(bfc){ hist.bf=bfc.dataset.backfill; hist.bfPart=null; return render(); }
  if(e.target.closest('[data-bfpart]')){ hist.bfPart=e.target.closest('[data-bfpart]').dataset.bfpart; return render(); }
  if(e.target.closest('#bfClose')){ hist.bf=null; hist.bfPart=null; return render(); }
  if(e.target.closest('#bfAdd')&&hist.bf&&hist.bfPart){
    const B=hist.bf, d=(DB.days[B]=DB.days[B]||{w:[]}); d.w=d.w||[];
    if(hist.bfPart==='Run'){
      const km=+(document.getElementById('bfKm').value||0);
      if(!(km>0)) return toast('Enter a distance');
      d.w.push({part:'Run',ex:'Run',w:km,reps:[],mins:+(document.getElementById('bfMin').value||0),secs:+(document.getElementById('bfSec').value||0),at:Date.now()});
    }else{
      const ex=(document.getElementById('bfEx').value||'').trim();
      const wv=toKg(+(document.getElementById('bfW').value||0));
      const reps=(document.getElementById('bfR').value||'').split(',').map(x=>Math.round(+x)).filter(x=>x>0);
      if(!ex||!reps.length) return toast('Exercise and reps needed');
      for(const r of reps) d.w.push({part:hist.bfPart,ex,w:wv,reps:[r],at:Date.now()});
    }
    d.upd=Date.now();               // backfill must win the cloud merge
    save(); SEED=deriveAll(); _fireDist=null; renderHeader();   // streak repairs here
    toast('Logged for '+B.slice(5));
    return render();
  }
  if(e.target.closest('[data-mcopy]')){ copyMonth(); return; }
  if(e.target.closest('[data-ycopy]')){ copyYear(); return; }
  const sh=e.target.closest('[data-dshare]');
  if(sh){ const d=sh.dataset.dshare;
    showCard(()=>{                 // showCard wants a canvas MAKER, not a painter
      const cv=document.createElement('canvas'); cv.width=cv.height=1080;
      const x=cv.getContext('2d'); if(!x) return null;
      drawDayCard(x,1080,d); return cv;
    },'showup-'+d,false);
    return; }
  const ed=e.target.closest('[data-hedit]');
  if(ed){ const d=ed.dataset.hedit;
    hist.edit=(hist.edit===d)?null:d; hist.editSet=null; return renderHistory(); }

  const del=e.target.closest('[data-hdel]');
  if(del){
    e.stopPropagation();
    const d=hist.edit, t=DB.days[d]; if(!t) return;
    const [wi,ri]=del.dataset.hdel.split(':').map(Number);
    const s=t.w[wi]; if(!s) return;
    if(ri<0||s.ex==='Run'){ t.w.splice(wi,1); }
    else { s.reps.splice(ri,1); }
    hist.editSet=null;
    commitPastDay(d,'Set deleted'); return renderHistory();
  }

  const hs=e.target.closest('[data-hs]');
  if(hs){
    const d=hist.edit, t=DB.days[d]; if(!t) return;
    const [wi,ri]=hs.dataset.hs.split(':').map(Number);
    const s=t.w[wi]; if(!s) return;
    hist.editSet={d,ex:s.ex,wi,ri:isNaN(ri)?0:ri};
    return renderHistory();
  }

  const ad=e.target.closest('[data-hadd]');
  if(ad){
    const d=hist.edit; if(!DB.days[d]) return;
    hist.editSet={d,ex:ad.dataset.hadd,wi:null,ri:0};
    return renderHistory();
  }

  if(e.target.closest('#hsCancel')){ hist.editSet=null; return renderHistory(); }

  if(e.target.closest('#hsSave')){
    const es=hist.editSet; if(!es) return;
    const d=es.d, t=DB.days[d]; if(!t) return;
    const isRun=es.ex==='Run';
    const wIn=+((document.getElementById('hsW')||{}).value||0);
    if(!wIn&&!isRun&&!isBody(es.ex)) return toast('Weight needed');
    if(isRun){
      if(!wIn) return toast('Distance needed');
      const mins=+((document.getElementById('hsM')||{}).value||0);
      const secs=+((document.getElementById('hsS')||{}).value||0);
      if(es.wi==null) t.w.push({part:partForEx(es.ex,d)||'Run',ex:es.ex,w:fromD(wIn),mins,secs,reps:[]});
      else { const s=t.w[es.wi]; s.w=fromD(wIn); s.mins=mins; s.secs=secs; }
    }else{
      const r=Math.round(+((document.getElementById('hsR')||{}).value||0));
      if(!(r>0)) return toast('Enter reps');
      const kg=toKg(wIn);
      if(es.wi==null){
        t.w.push({part:partForEx(es.ex,d),ex:es.ex,w:kg,reps:[r]});
      }else{
        const s=t.w[es.wi];
        if((s.reps||[]).length>1&&Math.abs(s.w-kg)>0.001){
          /* one set of a multi-rep entry changed WEIGHT — split it out rather
             than silently re-weighing its siblings */
          s.reps.splice(es.ri,1);
          t.w.splice(es.wi+1,0,{part:s.part,ex:s.ex,w:kg,reps:[r]});
        }else{ s.w=kg; s.reps[es.ri]=r; }
      }
    }
    hist.editSet=null;
    commitPastDay(d,es.wi==null?'Set added':'Set updated'); return renderHistory();
  }

  const c=e.target.closest('.cd[data-hd]'); if(!c) return;
  const el=document.querySelector(`details.day[data-d="${c.dataset.hd}"]`);
  if(!el) return;
  el.open=true;                      // v3.3.43: days are open by default; nothing else closes
  if(el.scrollIntoView) el.scrollIntoView({block:'start',behavior:'smooth'});
  showCalReturn();                   // v3.3.59: a return ticket for the teleport
});

/* v3.3.59: tapping a date teleports you down the page, so the way back
   appears exactly then and nowhere else — a floating "↑ calendar" pill above
   the tab bar. It expires three ways: tap it (glide back), the calendar
   scrolls back into view on its own (IntersectionObserver, where available),
   or any re-render wipes it with the view. No permanent chrome. */
let _calRetIO=null;
function killCalReturn(){
  if(typeof clearBackTarget==='function') clearBackTarget();
  if(_calRetIO){ _calRetIO.disconnect(); _calRetIO=null; }
}
/* v3.3.65: History no longer owns a pill of its own — it tells the shared
   up-control that "up" temporarily means "back to the calendar". */
function showCalReturn(){
  killCalReturn();
  const cal=document.querySelector('.cal'); if(!cal) return;
  setBackTarget('calendar',()=>document.querySelector('.cal'));
  if(typeof IntersectionObserver!=='undefined'){
    /* v3.3.60: IO fires a mandatory INITIAL callback with the current state —
       at tap time the calendar is still on screen, so that first report would
       clear the target at birth. Skip report #1. */
    let birth=true;
    _calRetIO=new IntersectionObserver(es=>{
      if(birth){ birth=false; return; }
      if(es.some(x=>x.isIntersecting)) killCalReturn();
    },{threshold:0.15});
    _calRetIO.observe(cal);
  }
}
