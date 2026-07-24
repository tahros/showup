/* ShowUp — stats.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- Stats: days first ---------- */
const YEAR_COLORS={ '2022':'var(--faint)','2023':'var(--muted)','2024':'var(--accent-dim)','2025':'var(--accent-soft)','2026':'var(--accent)' };
/* v3.3.67 — your weight, drawn as the sparse series it actually is.
   A STEP line, not a curve: between two weigh-ins the app knows nothing, and
   carry-forward is literally a step function. A smooth line would draw days
   you never measured, which is a lie the chart has no business telling.
   No goal line, no trend verdict, no red/green. This app scores attendance,
   not your body — the number is context for load maths and a quiet record. */
let bwEdit=false;
function bwCard(){
  const ds=bwDays(), cur=bwNow();
  let body;

  if(bwEdit){
    body=`<div class="fld"><label>Weight today (${U()})</label>
        <input id="bwIn" type="number" inputmode="decimal" step="0.1"
               value="${cur>0?wDisp(cur):''}" placeholder="—"></div>
      <div class="btnrow">
        <button class="btn ghost" id="bwCancel">Cancel</button>
        <button class="btn" id="bwSave">Save</button>
      </div>
      <div class="note">Recorded against today. Enter it only when it has changed — silence means unchanged.</div>`;
  }else if(!ds.length){
    body=`<div class="row spread">
        <span class="mono muted" style="font-size:12px">No weight recorded yet.</span>
        <button class="chip" id="bwEditBtn">Add</button></div>`;
  }else{
    const first=ds[0], last=ds[ds.length-1];
    const since=daysAgo(last);
    const head=`<div class="row spread" style="align-items:flex-end">
        <div><div class="bwnow">${wDisp(cur)} <span style="font-size:13px;font-weight:500">${U()}</span></div>
          <div class="bwsub">${ds.length>1
            ? `last change ${pretty(last)} · ${since===0?'today':since+'d ago'}`
            : `unchanged since ${pretty(first)}`}</div></div>
        <button class="chip" id="bwEditBtn">Update</button></div>`;

    let chart='';
    {
      const pts=ds.map(d=>({t:Date.parse(d+'T00:00'), v:toU(DB.days[d].bw)}));
      const t0=pts[0].t, t1=Math.max(Date.parse(todayISO+'T00:00')+864e5, pts[pts.length-1].t);
      const span=Math.max(1,t1-t0);
      const vals=pts.map(p=>p.v);
      const minV=Math.min(...vals), maxV=Math.max(...vals);
      let lo=minV, hi=maxV;
      if(hi-lo<2){ const m=(hi+lo)/2; lo=m-1; hi=m+1; }         // a near-flat series must not amplify into noise
      const pad=(hi-lo)*0.22; lo-=pad; hi+=pad;
      const X=t=>32+(t-t0)/span*268;
      const Y=v=>84-(v-lo)/(hi-lo)*66;
      const n1=v=>String(Math.round(v*10)/10);
      let grid='';
      for(const gv of (minV===maxV?[minV]:[maxV,minV])){
        const gy=Y(gv);
        grid+=`<line x1="32" y1="${gy.toFixed(1)}" x2="300" y2="${gy.toFixed(1)}" stroke="var(--line)" stroke-width="0.6" stroke-dasharray="2 3"></line>
               <text x="28" y="${(gy+2.5).toFixed(1)}" text-anchor="end" font-family="var(--mono)" font-size="7" fill="var(--muted)">${n1(gv)}</text>`;
      }
      let d='', prevY=0, dots='';
      pts.forEach((p,i)=>{
        const x=X(p.t), y=Y(p.v);
        d += i===0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}`
                   : ` L ${x.toFixed(1)} ${prevY.toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)}`;
        prevY=y;
        dots+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" fill="var(--accent)"></circle>`;
      });
      d+=` L ${X(t1).toFixed(1)} ${prevY.toFixed(1)}`;           // carry the last weight forward to today
      const delta=+(toU(DB.days[last].bw)-toU(DB.days[first].bw)).toFixed(1);
      chart=`<div class="zoom" data-zoom><svg viewBox="0 0 330 104" style="width:100%;height:auto">
          ${grid}
          <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="1.6"
                stroke-linejoin="round" stroke-linecap="round"></path>
          ${dots}
          <text x="${X(t1).toFixed(1)}" y="${(prevY-5).toFixed(1)}" text-anchor="end" font-family="var(--mono)"
                font-size="8" font-weight="700" fill="var(--accent)">${n1(toU(cur))}</text>
          <text x="32" y="99" font-family="var(--mono)" font-size="7" fill="var(--muted)">${md(first)}</text>
          <text x="300" y="99" text-anchor="end" font-family="var(--mono)" font-size="7" fill="var(--muted)">today</text>
        </svg></div>
        <div class="note">${ds.length===1
          ? `One weigh-in, so the line holds flat at ${wDisp(cur)} ${U()} all the way to today — that IS the record. It bends the day you enter a different number.`
          : `${ds.length} weigh-ins · ${delta===0?'no net change':`${delta>0?'+':''}${delta} ${U()} net`} since ${md(first)}. Flat stretches are days you didn't measure, not days you didn't change.`}</div>`;
    }
    body=head+chart;
  }
  return `<h2 id="secWeight">Your weight</h2><div class="card">${body}</div>`;
}
function renderStats(){
  if(SEED.totals.sessions===0 && !hasAnyDays()){ $('#view').innerHTML=emptyHero('stats'); return; }
  const dates=workoutDates();
  const curves=yearCurves();
  const monthKey=todayISO.slice(0,7);

  // monthly workout-day counts (seed monthly + user days)
  const mdays={};
  for(const [m,v] of Object.entries(SEED.monthly)) mdays[m]=new Set();
  for(const d of dates){const m=d.slice(0,7);(mdays[m]=mdays[m]||new Set()).add(d);}
  const monthCounts=Object.fromEntries(Object.entries(mdays).map(([m,s])=>[m,s.size||((SEED.monthly[m]||{}).days||0)]));
  // seed monthly.days already correct pre-app; the dates set covers everything, so:
  for(const [m,v] of Object.entries(SEED.monthly)) monthCounts[m]=Math.max(monthCounts[m]||0,v.days);

  const thisYearDays=[...dates].filter(d=>d.startsWith(thisYear)).length;
  const trainedToday=dates.has(todayISO);
  const elapsed=Math.max(1,doy(todayISO)-(trainedToday?0:1));   // unwritten today doesn't count against you
  const consNow=thisYearDays/elapsed;
  const lastYear=String(+thisYear-1);
  const lyCurve=curves[lastYear];
  const lyAtSamePoint=lyCurve?lyCurve.curve[Math.min(elapsed,lyCurve.end)-1]:null;
  const diff=lyAtSamePoint!=null?Math.round((consNow-lyAtSamePoint)*100):null;

  let h=`<div class="jumps">
      <button data-jump="secDays">Days</button>
      <button data-jump="secParts">Parts</button>
      <button data-jump="secRun">Run</button>
      <button data-jump="secRecords">Records</button>
    </div>
    <h2 id="secDays">Show up — that's the whole game</h2>
    <div class="kpis">
      <div class="kpi accent"><div class="v">${Math.round(consNow*100)}%</div><div class="l">of ${thisYear}, trained</div>
        ${diff!=null?`<div class="d ${diff>=0?'delta up':'delta down'}">${diff>=0?'+':''}${diff} pts vs ${lastYear} today</div>`:''}</div>
      <div class="kpi accent"><div class="v">${currentStreak()}</div><div class="l">day streak · best ${longestStreak()}</div></div>
      ${(()=>{
        const dNow=+todayISO.slice(8);
        const cur=(monthCounts[monthKey]||0)/dNow;
        const pv=new Date(+thisYear,+monthKey.slice(5)-1,0);            // last day of prev month
        const pKey=pv.toLocaleDateString('en-CA').slice(0,7);
        const pN=Math.min(dNow,pv.getDate());
        let pDays=0;
        for(let d2=1;d2<=pN;d2++) if(dates.has(`${pKey}-${String(d2).padStart(2,'0')}`)) pDays++;
        const diff=Math.round((cur-pDays/pN)*100);
        const pName=pv.toLocaleDateString('en-US',{month:'short'});
        return `<div class="kpi"><div class="v">${Math.round(cur*100)}%</div>
          <div class="l">of ${new Date(+thisYear,+monthKey.slice(5)-1,1).toLocaleDateString('en-US',{month:'long'})}, trained</div>
          <div class="d mono" style="color:${diff>=0?'var(--accent)':'var(--record)'}">${diff>=0?'+':''}${diff} pts vs ${pName} (day ${pN})</div></div>`;
      })()}
    </div>`;

  // consistency chart — the Dashboard bottom graph
  h+=`<h2>Consistency, year over year</h2><div class="card">
      <div class="zoom" data-zoom><div class="zoomhint">pinch / scroll to zoom · double-tap to reset</div>
      <svg viewBox="0 0 340 170" style="width:100%;height:auto">`;
  // y grid + labels
  for(const g of [0,0.25,0.5,0.75,1]){
    const y=140-g*120;
    h+=`<line x1="26" y1="${y}" x2="300" y2="${y}" stroke="var(--line)" stroke-width="0.6" ${g?'stroke-dasharray="2 3"':''}></line>
        <text x="22" y="${y+3}" text-anchor="end" font-family="var(--mono)" font-size="7" fill="var(--muted)">${g*100}%</text>`;
  }
  // x months
  ['J','F','M','A','M','J','J','A','S','O','N','D'].forEach((m,i)=>{
    const x=26+((i*30.4+15)/366)*274;
    h+=`<line x1="${x}" y1="140" x2="${x}" y2="143" stroke="var(--line)" stroke-width="0.6"></line>
        <text x="${x}" y="152" text-anchor="middle" font-family="var(--mono)" font-size="7" fill="var(--muted)">${m}</text>`;
  });
  const years=Object.keys(curves).filter(y=>y>='2022').sort();
  for(const y of years){
    const {curve,end}=curves[y];
    let pts='';
    for(let d=0;d<end;d+=2){
      const x=26+(d/366)*274, yy=140-curve[d]*120;
      pts+=`${x.toFixed(1)},${yy.toFixed(1)} `;
    }
    const cur=y===thisYear;
    h+=`<polyline data-yr="${y}" points="${pts}" fill="none" stroke="${YEAR_COLORS[y]||'var(--muted)'}"
         stroke-width="${cur?2.2:1.1}" opacity="${cur?1:.7}" stroke-linejoin="round"></polyline>`;
    // end-of-line % label
    const lx=26+((end-1)/366)*274, ly2=140-curve[end-1]*120;
    h+=`<text data-yr="${y}" x="${Math.min(lx+4,312)}" y="${ly2+2.5}" font-family="var(--mono)" font-size="7"
          fill="${YEAR_COLORS[y]||'var(--muted)'}" font-weight="${cur?700:400}">${Math.round(curve[end-1]*100)}%</text>`;
    if(cur) h+=`<circle class="beacon" cx="${lx}" cy="${ly2}" r="3.2" fill="var(--accent)"></circle>`;
  }
  h+=`</svg></div><div class="legend1">`;
  for(const y of years){
    const c=curves[y], cur=y===thisYear;
    h+=`<span class="${cur?'cur':''}" data-yr="${y}" role="button"><i style="background:${YEAR_COLORS[y]}"></i>${y}<b>${Math.round(c.curve[c.end-1]*100)}%</b></span>`;
  }
  h+=`</div><div class="note">% of days trained, cumulative through each year</div></div>`;

  // heatmap: 26 weeks, weekday rail on the left, months across the top
  const detail=allDays();
  h+=`<h2>Last 6 months</h2><div class="card"><div class="heatwrap">
        <div class="wdrail">${['S','M','T','W','T','F','S'].map(d=>`<span>${d}</span>`).join('')}</div>
        <div class="heatcols"><div class="heatscroll">`;
  const start2=new Date(todayISO+'T00:00');
  start2.setDate(start2.getDate()-start2.getDay()-25*7);
  let mrow='', grid='', lastM=-1;
  for(let w=0;w<26;w++){
    const first=new Date(start2); first.setDate(start2.getDate()+w*7);
    const m=first.getMonth();
    mrow+=`<span class="mlab">${m!==lastM?first.toLocaleDateString('en-US',{month:'short'}):''}</span>`;
    lastM=m;
    grid+=`<div class="wk">`;
    for(let dd=0;dd<7;dd++){
      const c=new Date(start2); c.setDate(start2.getDate()+w*7+dd);
      const iso=c.toLocaleDateString('en-CA');
      const future=iso>todayISO;
      grid+=`<i data-l="${dates.has(iso)?2:0}" class="${iso===todayISO?'today':''} ${future?'fut':''}" title="${iso}"></i>`;
    }
    grid+=`</div>`;
  }
  h+=`<div class="mrow">${mrow}</div><div class="heat">${grid}</div></div>`;
  h+=`</div></div></div>`;

  // days per month bars
  const ms=Object.entries(monthCounts).sort().slice(-12);
  const dayOfMonth=+todayISO.slice(8);
  const daysInMonth=new Date(+thisYear,+monthKey.slice(5),0).getDate();
  const trainedThis=monthCounts[monthKey]||0;
  h+=`<h2>Days trained, by month</h2><div class="card">
      <div class="zoom" data-zoom><div class="zoomhint">pinch to zoom</div>
      <svg viewBox="0 0 330 118" style="width:100%;height:auto">
      <line x1="8" y1="${94-20/31*80}" x2="316" y2="${94-20/31*80}" stroke="var(--line)" stroke-width="0.6" stroke-dasharray="2 3"></line>
      <text x="319" y="${96-20/31*80}" font-family="var(--mono)" font-size="7" fill="var(--muted)">20</text>`;
  ms.forEach(([m,n],i)=>{
    const cur=m===monthKey;
    const bh=Math.max(2,n/31*80), x=8+i*25.5;
    if(cur){                                  // dashed outline = days elapsed, so a short bar isn't misread
      const gh=dayOfMonth/31*80;
      h+=`<rect x="${x}" y="${94-gh}" width="17" height="${gh}" rx="3" fill="none"
            stroke="var(--accent)" stroke-width="0.8" stroke-dasharray="2 2"></rect>`;
    }
    h+=`<rect class="gbar" x="${x}" y="${94-bh}" width="17" height="${bh}" rx="3" fill="var(--accent)" opacity="${cur?1:.55}"></rect>`;
    if(cur){
      // trained count sits INSIDE the fill; the number above the dashes is days elapsed
      const gh=dayOfMonth/31*80;
      h+=`<text x="${x+8.5}" y="${94-gh-3}" text-anchor="middle" font-family="var(--mono)" font-size="7" fill="var(--muted)">${dayOfMonth}</text>
          <text x="${x+8.5}" y="${Math.min(91,94-bh+9)}" text-anchor="middle" font-family="var(--mono)" font-size="7" font-weight="700" fill="#fff">${n}</text>`;
    }else{
      h+=`<text x="${x+8.5}" y="${94-bh-3}" text-anchor="middle" font-family="var(--mono)" font-size="7" fill="var(--muted)">${n}</text>`;
    }
    h+=`<text x="${x+8.5}" y="107" text-anchor="middle" font-family="var(--mono)" font-size="7" fill="${cur?'var(--accent)':'var(--muted)'}">${m.slice(5)}</text>`;
  });
  h+=`</svg></div>
      <div class="tot"><span><b>${trainedThis}</b> trained · ${dayOfMonth-trainedThis} rested</span><span>${dayOfMonth} days into ${monthKey.slice(5)}</span></div></div>`;

  // monthly km — the Run tab owns the charts now; this map still feeds the
  // composition overlay further down.
  const kmBy={};
  for(const [m,v] of Object.entries(SEED.monthly)) kmBy[m]=v.km||0;
  for(const [d,v] of Object.entries(DB.days)){
    if(d<=SEED.totals.last) continue;
    for(const s of v.w) if(s.ex==='Run') kmBy[d.slice(0,7)]=(kmBy[d.slice(0,7)]||0)+s.w;
  }

  // which weekdays you show up — last 365 days, on an absolute 0–100% scale
  const wdC=[0,0,0,0,0,0,0], wdT=[0,0,0,0,0,0,0];
  for(let i=0;i<365;i++){
    const c=new Date(todayISO+'T00:00'); c.setDate(c.getDate()-i);
    const w=c.getDay(); wdT[w]++;
    if(dates.has(c.toLocaleDateString('en-CA'))) wdC[w]++;
  }
  const wdPct=wdC.map((n,i)=>n/wdT[i]);
  const wdBest=Math.max(...wdPct);
  /* v3.3.46: the accent marks TODAY's weekday — the row you're standing in —
     not the statistically strongest one. The strongest still gets a quiet
     caret above its bar so the pattern stays visible without competing with
     today for the one loud colour. (Ties: first match wins the caret; today
     always wins the accent even if today is also the strongest.) */
  const wdToday=new Date(todayISO+'T00:00').getDay();
  const bestI=wdPct.indexOf(wdBest);
  h+=`<h2>Which days you show up</h2><div class="card">
      <svg viewBox="0 0 330 140" style="width:100%;height:auto">`;
  for(const g of [0,25,50,75,100]){
    const y=112-g/100*96;
    h+=`<line x1="24" y1="${y}" x2="316" y2="${y}" stroke="var(--line)" stroke-width="0.6" ${g?'stroke-dasharray="2 3"':''}></line>
        <text x="21" y="${y+3}" text-anchor="end" font-family="var(--mono)" font-size="7" fill="var(--muted)">${g}</text>`;
  }
  ['S','M','T','W','T','F','S'].forEach((lab,i)=>{
    const p=wdPct[i], today=i===wdToday, best=i===bestI;
    const bh=Math.max(2,p*96), x=32+i*41;
    h+=`<rect class="gbar wd-col" x="${x}" y="${112-bh}" width="26" height="${bh}" rx="4"
          fill="${today?'var(--accent)':'var(--accent-dim)'}" opacity="${today?1:.6}"></rect>`;
    if(best) h+=`<text x="${x+13}" y="${104-bh}" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="var(--muted)">▲</text>`;
    h+=`<text x="${x+13}" y="${today?108-bh:(best?96-bh:108-bh)}" text-anchor="middle" font-family="var(--mono)" font-size="8" fill="${today?'var(--accent)':'var(--muted)'}" font-weight="${today?700:400}">${Math.round(p*100)}%</text>
        <text x="${x+13}" y="127" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="${today?'var(--chalk)':'var(--muted)'}" font-weight="${today?700:400}">${lab}</text>`;
  });
  h+=`</svg><div class="note">% of each weekday trained, last 365 days · ▲ your strongest</div></div>`;

  // month-by-month composition — the sheet's "Which part am I missing out?" chart
  /* v3.1.13: the stacked-months chart and the radar are gone (Sungjee's
     verdict: one needed scrolling, the other prompted nothing). Replaced by
     two scroll-free views that each answer ONE question. */

  /* --- "Have I kept showing up?" — every month ever, one screen --- */
  const mDays={};
  for(const d of Object.keys(SEED.sessions)) mDays[d.slice(0,7)]=(mDays[d.slice(0,7)]||0)+1;
  if((DB.days[todayISO]&&DB.days[todayISO].w||[]).length){
    const mk=todayISO.slice(0,7); mDays[mk]=(mDays[mk]||0)+1;
  }
  const gy0=+((SEED.totals.first||todayISO).slice(0,4)), gy1=+todayISO.slice(0,4);
  const gMax=Math.max(...Object.values(mDays),1);
  const m0=(SEED.totals.first||todayISO).slice(0,7), mNow=todayISO.slice(0,7);
  h+=`<h2 id="secParts">Showing up, every month</h2><div class="card">
      <div class="mgrid"><span></span>${'JFMAMJJASOND'.split('').map(c=>`<span class="mg-h">${c}</span>`).join('')}`;
  for(let y=gy0;y<=gy1;y++){
    h+=`<span class="mg-y mono">'${String(y).slice(2)}</span>`;
    for(let m=1;m<=12;m++){
      const k=`${y}-${String(m).padStart(2,'0')}`;
      const n=mDays[k]||0;
      const out=k<m0||k>mNow;
      const a=n?Math.round(14+74*n/gMax):0;
      h+=`<span class="mg-c mono ${k===mNow?'cur':''}" ${out?'':`data-mk="${k}"`} style="${n?`background:color-mix(in srgb, var(--accent) ${a}%, transparent)`:''}">${out?'':(n||'·')}</span>`;
    }
  }
  h+=`</div><div id="mexp"></div><div class="note">Days trained each month — the whole history on one screen. Darker = more days. Dashed = this month, still being written. Tap a month to open it.</div></div>`;

  /* --- "What's quietly slipping?" — last 30 days vs YOUR 12-month rhythm --- */
  const isoAgo=n=>{const c=new Date(todayISO+'T00:00');c.setDate(c.getDate()-n);return c.toLocaleDateString('en-CA');};
  const cut30=isoAgo(30), last30={};
  for(const [d,rows] of Object.entries(SEED.sessions)) if(d>=cut30){
    for(const p of new Set(rows.map(r=>r[0]).filter(p=>p&&p!=='Run'&&p!=='Rest')))
      last30[p]=(last30[p]||0)+1;
  }
  const tw=(DB.days[todayISO]&&DB.days[todayISO].w)||[];
  for(const p of new Set(tw.map(s=>s.part).filter(p=>p&&p!=='Run')))
    last30[p]=(last30[p]||0)+1;
  const drift=[];
  for(const p of Object.keys(SEED.catalog)){
    if(p==='Run') continue;
    const usual=((SEED.partDays[p]||[]).length)/365*30, now=(last30[p]||0);
    if(usual<0.5&&!now) continue;
    drift.push({p,now,usual,ratio:usual>0?now/usual:2});
  }
  drift.sort((a,b)=>a.ratio-b.ratio);
  if(drift.length){
    h+=`<h2>Last 30 days, vs your usual</h2><div class="card">`;
    for(const dd of drift){
      const flag=dd.ratio<0.6?'down':(dd.ratio>1.4?'up':'ok');
      const span=Math.max(dd.usual*1.6,1);
      const w2=Math.min(100,Math.round(100*dd.now/span));
      const tick=Math.min(96,Math.round(100*dd.usual/span));
      const usualTxt=dd.usual>=0.75?String(Math.round(dd.usual)):'<1';
      h+=`<div class="driftrow">
        <span class="dr-p">${dd.p}</span>
        <span class="dr-bar"><i class="${flag}" style="width:${w2}%"></i><em style="left:${tick}%"></em></span>
        <span class="dr-n mono ${flag}">${dd.now} <span class="muted">· usually ${usualTxt}</span>${flag==='down'?' ↓':flag==='up'?' ↑':''}</span>
      </div>`;
    }
    h+=`<div class="note">Sessions per part against your own 12-month rhythm — the tick is your usual. ↓ = quietly slipping.</div></div>`;
  }

  /* --- v3.2.4: monthly report card — the month as one shareable image --- */
  {
    const rd=repData(repOff);
    h+=`<h2>Report card</h2><div class="card">
      <div class="rephead">
        <button class="chip" id="repPrev">‹</button>
        <b>${rd.label}</b>
        <button class="chip" id="repNext" ${repOff?'':'disabled'}>›</button>
      </div>
      <div class="repline mono">${rd.nD} day${rd.nD===1?'':'s'} · ${fmt(Math.round(rd.vol))} kg · ${rd.km.toFixed(1)} ${DU()} · best streak ${rd.mx}d</div>
      <button class="btn" id="repShare" ${rd.nD?'':'disabled'}>Share as image</button>
    </div>`;
  }

  // the whole Run story lives here now (was its own tab in v2.04 — reverted)
  h+=runStatsHTML();

  // records — kept, but demoted below the days story
  h+=bwCard();
  h+=`<h2 id="secRecords">Records</h2>`;
  for(const part of Object.keys(SEED.catalog)){
    if(part==='Run') continue;
    const rows=catFor(part).map(e=>[e,prFor(e),exTier(e)]).filter(([,p])=>p.mw>0).sort((a,b)=>b[1].mw-a[1].mw);
    if(!rows.length) continue;
    const core=rows.filter(r=>r[2]==='goto'), other=rows.filter(r=>r[2]!=='goto');
    h+=`<h2 class="quiet" style="margin-top:16px">${part}</h2>`;
    if(core.length){
      h+=`<table class="rec-core"><tr><th>Core exercises</th><th style="text-align:right">Top (${U()})</th></tr>`;
      core.forEach(([e,p])=>{h+=`<tr><td><b>${e}</b></td><td class="n"><b>${wDisp(p.mw)}</b> × ${p.mwr}
        <button class="tmove" data-tier-ex="${e}" data-tier-to="other" title="Move to Other">↓</button></td></tr>`;});
      h+=`</table>`;
    }
    if(other.length){
      h+=`<table class="rec-other"><tr><th>Other</th><th></th></tr>`;
      other.forEach(([e,p])=>{h+=`<tr><td>${e}</td><td class="n">${wDisp(p.mw)} × ${p.mwr}
        <button class="tmove" data-tier-ex="${e}" data-tier-to="core" title="Move to Core">↑</button></td></tr>`;});
      h+=`</table>`;
    }
  }

  h+=`<h2>Settings</h2>
      <button class="btn ghost" id="settingsBtn">⚙︎ Settings, account &amp; sync</button>
      <div class="note" style="text-align:center">${session?`Signed in as ${session.user.email||'—'}`:'Not signed in — data is on this device only'} · ${APP_VERSION}</div>`;
  $('#view').innerHTML=h;
  /* v3.3.42: the 6-month heatmap runs oldest → newest, so its default
     scroll position showed January and hid today. Park it at the right
     edge — the current week is the whole point of the strip. scrollLeft on
     the scroller itself, never scrollIntoView, which would drag the page. */
  document.querySelectorAll('.heatcols,.heat').forEach(el=>{
    if(el.scrollWidth>el.clientWidth) el.scrollLeft=el.scrollWidth;
  });
}


/* ---------- D3: tap a grid month, it opens in place ---------- */
let _mexpK=null;
document.addEventListener('click',e=>{
  const c=e.target.closest('.mg-c[data-mk]'); if(!c) return;
  const box=document.getElementById('mexp'); if(!box) return;
  const k=c.dataset.mk;
  if(_mexpK===k){ _mexpK=null; box.innerHTML=''; return; }
  _mexpK=k;
  const base=new Date(todayISO+'T00:00'); base.setDate(1);
  const tgt=new Date(k+'-01T00:00');
  const off=(base.getFullYear()-tgt.getFullYear())*12+(base.getMonth()-tgt.getMonth());
  const rd=repData(off);
  box.innerHTML=`<div class="mexpIn">
    <div class="repline mono">${rd.label} — ${rd.nD} day${rd.nD===1?'':'s'} · ${fmt(Math.round(rd.vol))} kg · ${rd.km.toFixed(1)} ${DU()}${rd.mx>1?` · best streak ${rd.mx}d`:''}</div>
    <div class="mexpDots">${rd.days.map(d=>`<i class="${d.fut?'f':(d.tr?'t':'')}" title="${d.d}"></i>`).join('')}</div>
  </div>`;
});


/* ---------- v3.3.13: tap a year in any YoY legend — isolate its line ---------- */
document.addEventListener('click',e=>{
  const yb=e.target.closest('.legend1 [data-yr]'); if(!yb) return;
  const card=yb.closest('.card'); if(!card) return;
  const yr=yb.dataset.yr;
  const marks=card.querySelectorAll('svg [data-yr], .legend1 [data-yr]');
  if(card.dataset.ysel===yr){
    delete card.dataset.ysel;
    marks.forEach(m=>m.classList.remove('selY'));
  }else{
    card.dataset.ysel=yr;
    marks.forEach(m=>m.classList.toggle('selY',m.dataset.yr===yr));
  }
});
