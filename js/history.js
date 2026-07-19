/* ShowUp — history.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- History ---------- */
function renderHistory(){
  if(SEED.totals.sessions===0 && !hasAnyDays()){ $('#view').innerHTML=emptyHero('history'); return; }
  const dates=workoutDates();
  const detail=allDays();
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
  let h=`<div class="chips" style="margin-bottom:8px">`;
  years.forEach(y=>{
    const n=[...dates].filter(d=>+d.slice(0,4)===y).length;
    h+=`<button class="chip ${y===hist.y?'on':''}" data-histy="${y}">${y}<span class="n">${n}d</span></button>`;
  });
  h+=`</div><div class="mchips">`;
  for(let m=1;m<=12;m++){
    const key=`${hist.y}-${String(m).padStart(2,'0')}`;
    const n=(monthly[key]||{}).days||0;
    const future=key>todayISO.slice(0,7);
    h+=`<button class="mchip ${m===hist.m?'on':''} ${(!n||future)?'dim':''}" data-histm="${m}" ${future?'disabled':''}>
          <span>${new Date(hist.y,m-1,1).toLocaleDateString('en-US',{month:'short'})}</span><b>${future?'·':n}</b></button>`;
  }
  h+=`</div>`;

  // month calendar
  const key=`${hist.y}-${String(hist.m).padStart(2,'0')}`;
  const dim=new Date(hist.y,hist.m,0).getDate();
  const off=new Date(hist.y,hist.m-1,1).getDay();
  const mm=monthly[key]||{days:0,vol:0,km:0,sets:0};
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
    h+=`<span class="cd ${on?'on':''} ${today?'now':''} ${fut?'fut':''}">${d}</span>`;
  }
  h+=`</div>
      <div class="tot" style="margin-top:12px">
        <span>${mm.sets?fmt(mm.sets)+' sets':''}${mm.sets&&mm.km?' · ':''}${mm.km?dDisp(mm.km)+' '+DU():''}</span>
        <span>${mm.vol?vDisp(mm.vol)+' '+U()+' lifted':''}</span></div></div>`;

  // day cards for that month, where detail exists
  const monthDays=Object.keys(detail).filter(d=>d.startsWith(key)).sort().reverse();
  if(monthDays.length){
    h+=`<h2 class="quiet">Sessions</h2>`;
    monthDays.forEach(d=>{
      const list=detail[d];
      const vol=list.reduce((a,s)=>a+volOf(s),0);
      const km=list.filter(s=>s.ex==='Run').reduce((a,s)=>a+s.w,0);
      const parts=[...new Set(list.map(s=>s.part).filter(Boolean))].join(' · ');
      const bits=[];
      if(vol)bits.push(vDisp(vol)+' '+U());
      if(km)bits.push(dDisp(km)+DU());
      h+=`<details class="day"><summary>
          <span><span class="d">${pretty(d)}</span><div class="s">${parts||'—'}</div></span>
          <span class="s">${bits.join(' · ')}</span></summary><div class="body">`;
      list.forEach(s=>{
        h+=s.ex==='Run'
          ?`<div><b>Run</b> — ${dDisp(s.w)} ${DU()} · ${s.mins||0}'${String(s.secs||0).padStart(2,'0')}"</div>`
          :`<div><b>${s.ex}</b> — ${wDisp(s.w)} ${U()} × ${s.reps.join(', ')}</div>`;
      });
      h+=`</div></details>`;
    });
  }else if(mm.days){
    h+=`<div class="note" style="margin-top:12px">Set-level detail for this month lives in the sheet —
        the app carries full sessions for roughly the last four months, plus anything logged here.</div>`;
  }else{
    h+=`<div class="note" style="margin-top:12px">No training logged this month.</div>`;
  }
  $('#view').innerHTML=h;
}
