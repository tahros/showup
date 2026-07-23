/* ShowUp — history.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- History ---------- */
/* v3.3.61: past sessions are editable, but only deliberately. A day enters
   edit mode by its own Edit button; until then the record is inert, so a
   thumb landing mid-scroll can never rewrite three weeks ago. Every state
   walks back out: Done exits, and any re-render or tab change clears it. */
function partForEx(ex,d){
  for(const [pt,list] of Object.entries(SEED.catalog||{})) if((list||[]).includes(ex)) return pt;
  const w=((DB.days[d]||{}).w)||[];
  const hit=w.find(s=>s.ex===ex);
  return hit?hit.part:'';
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
          <input id="hsW" type="number" inputmode="decimal" step="${isRun?'0.01':STEP()}" value="${wv}"></div>
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
function partDigest(part,sess,opts){
  opts=opts||{};
  if(!sess.length) return '';
  const isRun=part==='Run';
  const val=s=>isRun?s.km:s.vol;
  const disp=v=>isRun?dDisp(v)+' '+DU():vDisp(v)+' '+U();
  const yrN=sess.filter(s=>s.d.slice(0,4)===String(thisYear)).length;
  const cutD=new Date(todayISO+'T00:00'); cutD.setDate(cutD.getDate()-365);
  const cut=cutD.toLocaleDateString('en-CA');
  const recent=sess.filter(s=>s.d>cut).map(s=>s.d);
  const gaps=[]; for(let i=1;i<recent.length;i++) gaps.push(daysBetween(recent[i-1],recent[i]));
  const cadence=gaps.length?Math.round(median(gaps)):null;
  const since=daysBetween(sess[sess.length-1].d,todayISO);

  /* growth = mean of the last 5 sessions vs the 5 before them. Five is enough
     to survive one light day and short enough to still mean "lately". */
  const vals=sess.map(val).filter(v=>v>0);
  let growth=null;
  if(vals.length>=10){
    const a=vals.slice(-5), b=vals.slice(-10,-5);
    const ma=a.reduce((x,y)=>x+y,0)/5, mb=b.reduce((x,y)=>x+y,0)/5;
    if(mb>0) growth=Math.round((ma/mb-1)*100);
  }
  const shown=sess.slice(-14), n=shown.length;
  const mx=Math.max(...shown.map(val),1);
  const W=330,H=92,base=72;
  const gap=Math.min(26,(W-20)/Math.max(n,1)), bw=Math.max(5,Math.min(18,gap-4));
  let ch=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">`;
  shown.forEach((s,i)=>{
    const bh=Math.max(2,(val(s)/mx)*58), x=10+i*gap;
    const newest=i===n-1;
    const fill=newest?(opts.live&&s.d===todayISO?'var(--live)':'var(--accent)'):'var(--line)';
    ch+=`<rect class="${newest&&opts.live?'lbNow':''}" x="${x.toFixed(1)}" y="${(base-bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${fill}"></rect>`;
  });
  const setsShown=shown.reduce((a,s)=>a+s.sets,0);
  const cap=isRun
    ? `last ${n} run${n>1?'s':''} · longest ${disp(mx)}`
    : `last ${n} · biggest ${disp(mx)} · ${fmt(setsShown)} sets`;
  ch+=`<text x="10" y="${H-4}" font-family="var(--mono)" font-size="7.5" fill="var(--muted)">${cap}</text></svg>`;

  const allTime=isRun
    ? `${dDisp(sess.reduce((a,s)=>a+s.km,0))} ${DU()} all time`
    : `${fmt(sess.reduce((a,s)=>a+s.sets,0))} sets all time`;
  const gTxt=growth===null?'':`<span class="mono ${growth>=0?'up':'down'}">${growth>=0?'+':''}${growth}% vs the 5 before</span>`;
  return `${opts.head?`<h2>${opts.head}</h2>`:''}<div class="card pdigest">
      <div class="row spread" style="margin-bottom:8px">
        <b style="font-family:var(--disp)">${part}</b>
        <span class="mono muted" style="font-size:12px"><b style="color:var(--accent)">${yrN}</b> days in ${thisYear}</span>
      </div>
      <div class="tot" style="margin-bottom:10px">
        <span>${cadence?`every ~${cadence}d`:'not enough history yet'}</span>
        <span>${since===0?'trained today':`${since}d since`}</span>
      </div>
      ${ch}
      <div class="tot" style="margin-top:2px"><span>${gTxt}</span><span>${allTime}</span></div>
    </div>`;
}
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
  let h=`<div class="chips ychips">`;
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
  if(P) h+=partDigest(P,partSessions(P,detail));

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
    h+=`<span class="cd ${on?'on':''} ${today?'now':''} ${fut?'fut':''}" ${on?`data-hd="${iso}" role="button"`:''}>${d}</span>`;
  }
  h+=`</div>
      <div class="tot" style="margin-top:12px">
        <span>${mm.sets?fmt(mm.sets)+' sets':''}${mm.sets&&mm.km?' · ':''}${mm.km?dDisp(mm.km)+' '+DU():''}</span>
        <span>${mm.vol?vDisp(mm.vol)+' '+U()+' lifted':''}</span></div></div>`;

  // day cards for that month, where detail exists
  const monthDays=Object.keys(detail).filter(d=>d.startsWith(key)&&(!P||dates.has(d))).sort().reverse();
  if(monthDays.length){
    h+=`<h2 class="quiet">Sessions</h2>`;
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
          <span><span class="d">${pretty(d)}</span><div class="s">${parts||'—'}</div></span>
          <span class="s">${bits.join(' · ')}${editable?`<button class="dayedit" data-hedit="${d}">${editing?'Done':'Edit'}</button>`:''}</span></summary><div class="body">`;
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
  const b=document.getElementById('calReturn'); if(b) b.remove();
  if(_calRetIO){ _calRetIO.disconnect(); _calRetIO=null; }
}
function showCalReturn(){
  killCalReturn();
  const cal=document.querySelector('.cal'); if(!cal) return;
  const b=document.createElement('button');
  b.id='calReturn'; b.className='calreturn';
  b.innerHTML='↑ calendar';
  b.addEventListener('click',()=>{
    killCalReturn();
    cal.scrollIntoView&&cal.scrollIntoView({block:'start',behavior:'smooth'});
  });
  document.body.appendChild(b);      // body, not #view: never clipped, dies with killCalReturn
  if(typeof IntersectionObserver!=='undefined'){
    /* v3.3.60: IO fires an INITIAL callback with the current state the moment
       observe() is called — and at tap time the calendar is still on screen,
       so that first report says "intersecting" and killed the pill at birth.
       That's why "I don't see anything after tapping". Skip report #1; only a
       genuine RE-entry of the calendar dismisses. */
    let birth=true;
    _calRetIO=new IntersectionObserver(es=>{
      if(birth){ birth=false; return; }
      if(es.some(x=>x.isIntersecting)) killCalReturn();
    },{threshold:0.15});
    _calRetIO.observe(cal);
  }
}
