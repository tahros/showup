/* ShowUp — report.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- v3.2.4 report card engine ---------- */
function repData(off){
  const base=new Date(todayISO+'T00:00'); base.setDate(1); base.setMonth(base.getMonth()-off);
  const y=base.getFullYear(), m=base.getMonth();
  const mk=`${y}-${String(m+1).padStart(2,'0')}`;
  const nIn=new Date(y,m+1,0).getDate();
  const days=[]; let nD=0,vol=0,km=0,st=0,mx=0;
  for(let i=1;i<=nIn;i++){
    const iso=`${mk}-${String(i).padStart(2,'0')}`;
    let tr=false;
    if(iso!==todayISO) for(const r of (SEED.sessions[iso]||[])){   // canon: fireDist math
      tr=true;
      if(r[1]==='Run') km+=r[2]||0;
      else vol+=(r[2]||0)*(r[3]||[]).reduce((a,b)=>a+b,0);
    }
    if(iso===todayISO){                       // today lives in DB.days, not the derived maps
      for(const s of ((DB.days[todayISO]||{}).w||[])){
        tr=true;
        if(s.ex==='Run') km+=s.w||0;
        else vol+=(s.w||0)*(s.reps||[]).reduce((a,b)=>a+b,0);
      }
    }
    if(tr) nD++;
    st=tr?st+1:0; if(st>mx) mx=st;
    days.push({d:i,tr,fut:iso>todayISO});
  }
  const totalAll=SEED.totals.sessions+((((DB.days[todayISO]||{}).w)||[]).length?1:0);
  return {label:base.toLocaleString('en-US',{month:'long'})+' '+y, days, nD, vol, km, mx, totalAll};
}
/* v3.3.111: drawRep() removed with the Report card section. repData() stays
   in this file — the month grid's expand still uses it. */
function drawGrid(gd){
  const S=1080;
  const cv=document.createElement('canvas'); cv.width=S; cv.height=S;
  const x=cv.getContext('2d'); if(!x) return null;
  const V=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
  const SANS='"IBM Plex Sans",system-ui,sans-serif', MONO='"IBM Plex Mono",ui-monospace,monospace';
  /* canvas normalises whatever colour it is handed, so use it to resolve the
     theme var to #rrggbb — the cells need an alpha tint, which is what
     color-mix(... N%, transparent) does in the CSS grid. */
  x.fillStyle=V('--accent');
  const AC=x.fillStyle;
  const hx=(typeof AC==='string'&&/^#[0-9a-f]{6}$/i.test(AC))?AC:'#5B7BFF';
  const rgb=[1,3,5].map(i=>parseInt(hx.slice(i,i+2),16));
  const tint=a=>`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  const rr=(px,py,w,h,r)=>{ x.beginPath(); x.moveTo(px+r,py);
    x.arcTo(px+w,py,px+w,py+h,r); x.arcTo(px+w,py+h,px,py+h,r);
    x.arcTo(px,py+h,px,py,r); x.arcTo(px,py,px+w,py,r); x.closePath(); };

  x.fillStyle=V('--ground'); x.fillRect(0,0,S,S);

  const P=76;
  // the streak number is the authority — it leads
  x.textBaseline='alphabetic'; x.textAlign='left';
  x.fillStyle=V('--chalk'); x.font='700 132px '+SANS;
  x.fillText(String(gd.total),P,P+126);
  const tw=(x.measureText(String(gd.total))||{}).width||0;
  /* v3.3.135: "931 days" never said out of what. The span was already printed
     along the bottom, so the denominator was on the card but never as a
     fraction. Elapsed days since the first entry, inclusive of both ends —
     the same window the footer states, now countable. */
  const spanDays=Math.round(
    (new Date(todayISO+'T00:00') - new Date((gd.first||todayISO)+'T00:00'))/86400000)+1;
  x.fillStyle=V('--muted'); x.font='500 40px '+MONO;
  x.fillText('of '+spanDays.toLocaleString()+' days',P+tw+20,P+126);
  x.textAlign='right'; x.font='500 34px '+MONO;
  x.fillText('ShowUp',S-P,P+54);
  x.textAlign='left'; x.fillStyle=V('--faint'); x.font='500 28px '+MONO;
  x.fillText('SHOWING UP, EVERY MONTH',P,P+188);

  const years=[]; for(let y=gd.y0;y<=gd.y1;y++) years.push(y);
  const cols=13, cw=(S-P*2)/cols, top=P+248;
  const rh=Math.min(cw,(S-top-P-80)/(years.length+1));

  x.textAlign='center'; x.textBaseline='middle';
  x.fillStyle=V('--faint'); x.font='500 26px '+MONO;
  'JFMAMJJASOND'.split('').forEach((c,i)=>x.fillText(c,P+cw*(i+1)+cw/2,top+rh/2));

  years.forEach((y,r)=>{
    const py=top+rh*(r+1);
    x.textAlign='right'; x.fillStyle=V('--muted'); x.font='500 26px '+MONO;
    x.fillText("'"+String(y).slice(2),P+cw*0.9,py+rh/2);
    x.textAlign='center';
    for(let m=1;m<=12;m++){
      const k=`${y}-${String(m).padStart(2,'0')}`;
      const n=gd.mDays[k]||0;
      if(k<gd.m0||k>gd.mNow) continue;                 // outside the log: nothing, not a zero
      const cx=P+cw*m+3, cy=py+3, w=cw-6, hh=rh-6;
      if(n){ x.fillStyle=tint(+mgAlpha(n,gd.max,k===gd.mNow).toFixed(3)); rr(cx,cy,w,hh,9); x.fill(); }
      if(k===gd.mNow){                                  // this month is still being written
        x.strokeStyle=V('--accent'); x.lineWidth=2.5; x.setLineDash([6,5]);
        rr(cx,cy,w,hh,9); x.stroke(); x.setLineDash([]);
      }
      x.fillStyle=n?V('--chalk'):V('--faint'); x.font='500 26px '+MONO;
      x.fillText(n?String(n):'\u00b7',cx+w/2,cy+hh/2);
    }
  });

  x.textBaseline='alphabetic'; x.textAlign='left';
  x.fillStyle=V('--faint'); x.font='500 26px '+MONO;
  x.fillText(`${gd.first} \u2192 ${todayISO}`,P,S-P+8);   // v3.3.133: URL dropped; the span IS the receipt
  /* v3.3.136: the rate, quietly, in the corner the URL left empty. It sits
     opposite the span deliberately — read together the footer is one
     sentence: over THIS window, THIS share of days. Kept at the footer's
     own size and faint colour so it stays metadata; a second big number up
     top would compete with the count instead of qualifying it. */
  if(spanDays>0){
    x.textAlign='right';
    x.fillText(Math.round(gd.total/spanDays*100)+'% of days',S-P,S-P+8);
    x.textAlign='left';
  }
  return cv;
}

/* The consistency chart as a 1:1 card. Same doctrine as drawGrid: the current
   year is the only saturated line (red stays LIVE-only; accent is the year
   being written), past years step back in the same greys/soft blues the SVG
   uses. YEAR_COLORS holds CSS vars, so each is resolved through the canvas
   colour parser at draw time. */
/* v3.3.89: parameterised so the consistency chart and the distance chart
   share one painter. The two differ only in scale and wording; duplicating
   250 lines of canvas for that is exactly the drift this codebase keeps
   paying down. */
function drawYoy(curves,o){
  o=o||{};
  const fmtAxis = o.fmtAxis || (v=>Math.round(v*100)+'%');
  const fmtBig  = o.fmtBig  || (v=>Math.round(v*100)+'%');
  const kicker  = o.kicker  || 'CONSISTENCY, YEAR OVER YEAR';
  const footer  = o.footer  || '% of days trained, cumulative';
  const S=1080;
  const cv=document.createElement('canvas'); cv.width=S; cv.height=S;
  const x=cv.getContext('2d'); if(!x) return null;
  const V=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
  const CV=spec=>{ x.fillStyle='#000';
    x.fillStyle=/^var\((--[^)]+)\)$/.test(spec)?V(spec.match(/^var\((--[^)]+)\)$/)[1]):spec;
    return x.fillStyle; };
  const SANS='"IBM Plex Sans",system-ui,sans-serif', MONO='"IBM Plex Mono",ui-monospace,monospace';
  const thisYear=todayISO.slice(0,4);
  const years=Object.keys(curves).filter(y=>y>='2022').sort();
  if(!years.length) return null;

  x.fillStyle=V('--ground'); x.fillRect(0,0,S,S);
  const P=76;

  // this year's number is the headline — 96px: dominant but not shouting,
  // a clear step above the 28px kicker without crowding the top margin
  const cNow=curves[thisYear];
  const pctNow=cNow?cNow.curve[cNow.end-1]:null;
  x.textBaseline='alphabetic'; x.textAlign='left';
  if(pctNow!=null){
    const big=fmtBig(pctNow);
    x.fillStyle=V('--chalk'); x.font='700 96px '+SANS;
    x.fillText(big,P,P+96);
    const tw=(x.measureText(big)||{}).width||0;
    x.fillStyle=V('--muted'); x.font='500 36px '+MONO;
    x.fillText(o.sub||('of '+thisYear+', trained'),P+tw+18,P+96);
  }
  x.textAlign='right'; x.fillStyle=V('--muted'); x.font='500 34px '+MONO;
  x.fillText('ShowUp',S-P,P+50);
  x.textAlign='left'; x.fillStyle=V('--faint'); x.font='500 28px '+MONO;
  x.fillText(kicker,P,P+152);

  /* v3.3.133: plot is 25% shorter and CENTRED between the kicker and the
     caption, instead of hanging off the header with dead space beneath.
     The band is computed the same way cardFrame does it, so the two card
     families sit their art in the same place. drawYoy paints its own frame
     (it predates cardFrame), which is why the arithmetic is repeated here
     rather than shared — worth folding together the next time this file is
     opened for structural work. */
  const AT=P+180, AB=S-P-120;
  const H=(AB-AT)*0.75, T=AT+((AB-AT)-H)/2, B=T+H;
  // right margin reserved for the year labels that replace the legend
  const L=P+70, R=S-P-118, W=R-L;
  // y grid
  x.textAlign='right'; x.textBaseline='middle'; x.font='500 26px '+MONO;
  const yMax=o.yMax||1;
  for(const g of (o.ticks||[0,0.25,0.5,0.75,1])){
    const gy=B-(g/yMax)*H;
    x.strokeStyle=V('--line'); x.lineWidth=1.5;
    if(g) x.setLineDash([6,7]);
    x.beginPath(); x.moveTo(L,gy); x.lineTo(R,gy); x.stroke(); x.setLineDash([]);
    x.fillStyle=V('--muted'); x.fillText(fmtAxis(g),L-14,gy);
  }
  // x months
  x.textAlign='center'; x.fillStyle=V('--muted');
  'JFMAMJJASOND'.split('').forEach((m,i)=>{
    const mx=L+((i*30.4+15)/366)*W;
    x.fillText(m,mx,B+34);
  });
  // past years first, this year last so it sits on top
  const ends=[];
  for(const y of years.filter(y=>y!==thisYear).concat(years.includes(thisYear)?[thisYear]:[])){
    const {curve,end}=curves[y], cur=y===thisYear;
    x.strokeStyle=CV(YEAR_COLORS[y]||'var(--muted)');
    x.lineWidth=cur?7:3.5;
    x.lineJoin='round'; x.lineCap='round';
    x.beginPath();
    for(let d=0;d<end;d+=2){
      const px=L+(d/366)*W, py=B-(curve[d]/yMax)*H;
      d===0?x.moveTo(px,py):x.lineTo(px,py);
    }
    x.stroke();
    ends.push({y, cur, ex:L+((end-1)/366)*W, ey:B-(curve[end-1]/yMax)*H,
               pct:fmtBig(curve[end-1])});
    if(cur){
      const e=ends[ends.length-1];
      x.fillStyle=V('--accent');
      x.beginPath(); x.arc(e.ex,e.ey,10,0,Math.PI*2); x.fill();
    }
  }
  /* the labels ARE the legend — each year sits at its own line's end, which
     is where the eye already is when it follows the line. Past years: year
     only, muted, on the right margin, nudged apart when endpoints collide.
     This year: '2026 · 62%' in accent bold above its beacon. */
  const past=ends.filter(e=>!e.cur).sort((a,b)=>a.ey-b.ey);
  const LH=34;
  for(let i=1;i<past.length;i++)
    if(past[i].ey-past[i-1].ey<LH) past[i].ey=past[i-1].ey+LH;
  x.textBaseline='middle'; x.textAlign='left'; x.font='500 28px '+MONO;
  for(const e of past){
    x.fillStyle=CV(YEAR_COLORS[e.y]||'var(--muted)');
    x.fillText("'"+String(e.y).slice(2),R+16,e.ey);
  }
  const eNow=ends.find(e=>e.cur);
  if(eNow){
    x.textBaseline='alphabetic'; x.textAlign='center';
    x.fillStyle=V('--accent'); x.font='700 40px '+MONO;
    const label=eNow.y+' · '+eNow.pct;
    const cx2=Math.max(P+((x.measureText(label)||{}).width||0)/2,
                       Math.min(eNow.ex, R-((x.measureText(label)||{}).width||0)/2));
    x.fillText(label,cx2,eNow.ey-30);
  }
  x.textBaseline='alphabetic'; x.textAlign='left';
  x.fillStyle=V('--faint'); x.font='500 26px '+MONO;
  x.fillText(footer,P,S-P+8);
  x.textAlign='right';
  x.fillText(todayISO,S-P,S-P+8);   // v3.3.133: the date the receipt was taken
  return cv;
}

let _repCv=null;
function repOvEl(){
  let ov=document.getElementById('repOv');
  if(ov) return ov;
  ov=document.createElement('div'); ov.id='repOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(20,22,26,.78);z-index:90;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;font-family:var(--body)';   // v3.3.46: overlay lives on <body>, outside #app — set the family or the buttons fall back to the OS font
  ov.innerHTML=`<img id="repImg" draggable="false" style="max-width:min(88vw,420px);border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.45);touch-action:pan-y;user-select:none;-webkit-user-drag:none">
    <div style="display:flex;gap:10px">
      <button class="btn" id="repDo" style="margin:0">Share</button>
      <button class="btn ghost" id="repClose" style="margin:0">Close</button>
    </div>`;
  document.body.appendChild(ov);
  return ov;
}
/* v3.3.72: one overlay, one share path, any card. Fonts are awaited BEFORE
   the draw — canvas never inherits CSS faces (v3.3.13). */
/* v3.3.98: milestone card — the day count huge over a faded all-time month
   grid. Receipts as celebration; same 1080 family as the others. */
function drawMilestone(n){
  const S=1080, cv=document.createElement('canvas'); cv.width=S; cv.height=S;
  const x=cv.getContext('2d');
  // per-drawer helpers, matching the file's idiom (V is function-local in
  // every drawer here — drawMilestone borrowed one that didn't exist)
  const V=nm=>getComputedStyle(document.documentElement).getPropertyValue(nm).trim()||'#888';
  const SANS='"IBM Plex Sans",system-ui,sans-serif', MONO='"IBM Plex Mono",ui-monospace,monospace';
  x.fillStyle=V('--ground'); x.fillRect(0,0,S,S);
  // faded grid of every month ever, oldest first
  const gd=gridData(); const keys=Object.keys(gd.mDays).sort();
  const cols=12, cell=Math.min(64,Math.floor((S-160)/cols)), gap=10;
  const rows=Math.ceil(keys.length/cols);
  const gx=(S-cols*cell-(cols-1)*gap)/2, gy=Math.max(150,(S-rows*cell-(rows-1)*gap)/2);
  x.globalAlpha=0.5;
  keys.forEach((k,i)=>{
    const r=Math.floor(i/cols), c0=i%cols;
    x.fillStyle=V('--accent');
    x.globalAlpha=0.10+0.38*gd.mDays[k]/gd.max;
    x.fillRect(gx+c0*(cell+gap), gy+r*(cell+gap), cell, cell);
  });
  x.globalAlpha=1;
  const tier=msTier(n);
  x.textAlign='center'; x.textBaseline='alphabetic';
  x.fillStyle=V('--muted'); x.font='600 44px '+MONO;
  x.fillText('DAY', S/2, S/2-150);
  x.fillStyle=tier==='thousand'?V('--accent'):V('--chalk');
  x.font='700 '+(tier==='thousand'?300:240)+'px '+SANS;
  x.fillText(fmt(n), S/2, S/2+90);
  x.fillStyle=V('--chalk'); x.font='500 40px '+MONO;
  x.fillText(msLine(n).replace(/\u2019/g,"'"), S/2, S/2+200);
  return cv;   // v3.3.133: URL dropped here too — no card in the family carries it
}
function makeMilestoneImage(n){ return showCard(()=>drawMilestone(n),'day-'+n); }
/* v3.3.130: ONE list, one share surface. Each row is a card: what to call it,
   what to name the file, and the draw that returns its canvas. Adding a card
   is adding a row — there is no second place to register it, which is the
   whole reason the per-section buttons went away. `draw` returns a canvas and
   nothing else; showing it is the caller's business, so the same row feeds
   both the small preview and the full-size share. */
function shareCards(){
  const FULL=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const fmtP=s=>Math.floor(s/60)+"'"+String(Math.round(s%60)).padStart(2,'0')+'"';
  const L=[
    {id:'grid', label:'Every month', file:()=>`${gridData().total}-days`,
     draw:()=>drawGrid(gridData())},
    {id:'yoy', label:'Consistency', file:()=>'consistency-'+todayISO.slice(0,4),
     draw:()=>drawYoy(yearCurves())},
    {id:'dbm', label:'Days by month', file:()=>'days-by-month', draw:()=>{
      const gd=gridData(), mk=todayISO.slice(0,7), dom=+todayISO.slice(8);
      return drawDbm({ms:Object.entries(gd.mDays).sort().slice(-12), monthKey:mk, dayOfMonth:dom,
        big:String(gd.mDays[mk]||0), sub:'trained of '+dom+' days',
        kicker:'DAYS BY MONTH', footer:'days trained each month \u00b7 dashes mark 20'});
    }},
    {id:'wd', label:'Weekdays', file:()=>'weekdays', draw:()=>{
      const d=wdDist();
      return drawWd({pct:d.pct, best:d.best, today:d.today,
        big:FULL[d.best], sub:'is your strongest day',   // 'S' would not say which one
        kicker:'WEEKDAYS', footer:'% of each weekday trained, last 365 days'});
    }},
    {id:'heat', label:'Last 6 months', file:()=>'last-6-months', draw:()=>{
      const cols=heatSeries();
      const span=cols.length*7;      // v3.3.133: the denominator, so 116 has something to be 116 OF
      return drawHeat({cols, big:String(cols.reduce((a,c)=>a+c.filter(d=>d.on).length,0)),
        sub:`days in ${cols.length} weeks (${span} days)`,
        kicker:'LAST 6 MONTHS', footer:'one column per week'});
    }}
  ];
  /* the run cards only exist if you have run. An empty Pace card is not a
     card, it is a bug with a title. */
  const runs=(typeof runDays==='function')?runDays():[];
  if(runs.length){
    L.push({id:'week', label:'Every week', file:()=>'every-week', draw:()=>{
      const w=weekSeries();
      return drawSeries({kind:'bars',
        big:String(Math.round(w.avg||0)), sub:DU()+' in a typical week',
        kicker:'EVERY WEEK', footer:'distance per week \u00b7 dashed line is your average',
        vals:w.wks.map(k=>w.by[k]||0), hi:w.wks.length-1, ref:w.avg,
        labels:w.wks.map(k=>k.slice(5).replace('-','/'))});
    }});
    L.push({id:'dist', label:'Distance', file:()=>'distance-'+todayISO.slice(0,4), draw:()=>{
      const cs=runYearCurves();
      const tot=Math.max(...Object.values(cs).map(c=>c.total),1);
      const step=Math.max(10,Math.round(tot/4/10)*10);
      return drawYoy(cs,{yMax:Math.max(tot,step*4), ticks:[0,step,step*2,step*3,step*4],
        fmtAxis:v=>String(Math.round(v)), fmtBig:v=>String(Math.round(v)),
        kicker:'DISTANCE, YEAR OVER YEAR', sub:DU()+' in '+thisYear,
        footer:'cumulative '+DU()+' by day of year'});
    }});
    if(runs.some(r=>r.timed>0)) L.push({id:'pace', label:'Pace', file:()=>'pace', draw:()=>{
      const ps=paceSeries();
      const best=ps.reduce((b,p,i)=>(p[1]&&(!ps[b]||!ps[b][1]||p[1]<ps[b][1]))?i:b,0);
      /* v3.3.134: same scale guard as the live chart (lift.js) — pad the
         range 25% each side and never let a near-identical year collapse
         into a flat line. Duplicated deliberately: the card and the chart
         are different coordinate systems, and the ONE thing that must match
         is the rule, which is why the 30-second floor is spelled out here
         rather than inferred. */
      const pv=ps.map(p=>p[1]);
      const lo=Math.min(...pv), hi=Math.max(...pv);
      const span=Math.max(hi-lo,30);
      return drawSeries({kind:'line',
        big:ps.length?fmtP(ps[ps.length-1][1]):'\u2014', sub:'per '+DU()+' this month',
        kicker:'PACE', footer:'minutes per '+DU()+', timed runs only',
        vals:pv, hi:best, labels:ps.map(p=>p[0].slice(5)),
        yLo:lo-span*0.25, yHi:hi+span*0.25,
        fmtPt:fmtP});      // v3.3.133: point labels read as pace, not seconds
    }});
  }
  return L;
}
/* v3.3.114: one frame, one plot, five cards. The four older cards each
   hand-drew their own frame; these share it, because they differ only in
   data and wording. kind:'bars' | 'line' | 'heat'. */
/* v3.3.166: a single DAY as a shareable receipt — the session card from
   History, in the share-card language: date big, volume beside it, one mono
   line per exercise. Reuses the whole existing pipeline (showCard overlay,
   its Share button, navigator.share with download fallback). */
/* v3.3.167: the day receipt IS the History session card, redrawn at share
   size — same anatomy the maker circled: header row (date + parts left,
   volume · km right), then per exercise a solid rule, name / "N sets" on a
   dashed rule, and the weight beside rounded rep chips in accent-on-tint.
   Height is computed from content (1080 wide, capped at 1350), so a
   two-lift day shares as a short card, a six-lift day as a tall one. */
function drawDayCard(x,S,d){
  const V=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
  const SANS='"IBM Plex Sans",system-ui,sans-serif', MONO='"IBM Plex Mono",ui-monospace,monospace';
  const AC=V('--accent');
  const tint=(hex,a)=>{const m=hex.replace('#','');const n=m.length===3?m.split('').map(c=>c+c).join(''):m;
    return `rgba(${parseInt(n.slice(0,2),16)},${parseInt(n.slice(2,4),16)},${parseInt(n.slice(4,6),16)},${a})`;};
  const rr=(x0,y0,w,h,r2)=>{x.beginPath();
    x.moveTo(x0+r2,y0);x.arcTo(x0+w,y0,x0+w,y0+h,r2);x.arcTo(x0+w,y0+h,x0,y0+h,r2);
    x.arcTo(x0,y0+h,x0,y0,r2);x.arcTo(x0,y0,x0+w,y0,r2);x.closePath();};
  const dash=(y,on)=>{x.save();x.setLineDash(on?[5,7]:[]);x.strokeStyle=V('--line');x.lineWidth=2;
    x.beginPath();x.moveTo(104,y);x.lineTo(S-104,y);x.stroke();x.restore();};

  const rows=(d===todayISO?(DB.days[d]?.w||[]).map(s2=>[s2.part,s2.ex,s2.w,s2.reps||[],s2.mins,s2.secs]):(SEED.sessions[d]||[]));
  let vol=0,km=0,sets=0,tmin=null,tsec=0; const by=[],seen={},parts=[];
  for(const r2 of rows){
    if(!parts.includes(r2[0])) parts.push(r2[0]);
    if(r2[1]==='Run'){ km+=r2[2]; if(r2[4]!=null){tmin=(tmin||0)+r2[4];tsec+=r2[5]||0;} sets++; continue; }
    vol+=r2[2]*(r2[3]||[]).reduce((a,b)=>a+b,0); sets+=(r2[3]||[]).length;
    const k2=r2[1]+'@'+r2[2];
    if(!(k2 in seen)){ seen[k2]=by.length; by.push({ex:r2[1],w:r2[2],reps:[]}); }
    by[seen[k2]].reps.push(...(r2[3]||[]));
  }
  const groups=by.slice(0,10);
  const BLK=178, HEAD=210, FOOT=96;
  const H=Math.min(1350,Math.max(640,HEAD+(km?BLK:0)+groups.length*BLK+FOOT));
  const cv2=x.canvas; if(cv2&&cv2.height!==H) cv2.height=H;

  x.fillStyle=V('--ground'); x.fillRect(0,0,S,H);
  x.fillStyle=V('--surface'); rr(40,40,S-80,H-80,40); x.fill();
  x.textBaseline='alphabetic';

  const dt=new Date(d+'T00:00');
  x.textAlign='left'; x.fillStyle=V('--chalk'); x.font='700 58px '+SANS;
  x.fillText(dt.toLocaleDateString('en-US',{weekday:'short'})+', '+dt.toLocaleDateString('en-US',{month:'short',day:'numeric'}),104,146);
  x.fillStyle=V('--muted'); x.font='500 30px '+MONO;
  x.fillText(parts.join(' · '),104,196);
  x.textAlign='right';
  x.fillText((vol?fmt(Math.round(toU(vol)))+' '+U():'')+(km?(vol?' · ':'')+dDisp(km)+' '+DU():''),S-104,146);
  x.textAlign='left';

  let y=HEAD+70;
  const block=(name,nSets,draw)=>{
    x.save();x.strokeStyle=V('--line');x.lineWidth=2;x.beginPath();x.moveTo(104,y-64);x.lineTo(S-104,y-64);x.stroke();x.restore();
    x.fillStyle=V('--muted'); x.font='500 30px '+MONO; x.fillText(name,104,y);
    x.textAlign='right'; x.fillText(nSets,S-104,y); x.textAlign='left';
    dash(y+18,true);
    draw(y+86); y+=BLK;
  };
  const chips=(vals,x0,yv)=>{
    x.font='700 34px '+MONO;
    let cx=x0;
    for(const v of vals){
      const t=String(v), tw=x.measureText(t).width, cw=tw+40;
      x.fillStyle=tint(AC.startsWith('#')?AC:'#4f46e5',0.13); rr(cx,yv-40,cw,58,16); x.fill();
      x.fillStyle=AC; x.fillText(t,cx+20,yv);
      cx+=cw+18; if(cx>S-180) break;
    }
  };
  if(km){
    const t=(tmin!=null)?`${tmin+Math.floor(tsec/60)}'${String(tsec%60).padStart(2,'0')}`:null;
    block('Run',(rows.filter(r2=>r2[1]==='Run').length)+' set'+(rows.filter(r2=>r2[1]==='Run').length>1?'s':''),yv=>{
      x.fillStyle=V('--chalk'); x.font='700 48px '+SANS; x.fillText(dDisp(km),104,yv);
      x.fillStyle=V('--muted'); x.font='500 28px '+MONO;
      x.fillText(DU(),104+x.measureText(' ').width+ (x.font='700 48px '+SANS, x.measureText(dDisp(km)).width)+14,(x.font='500 28px '+MONO,yv));
      if(t) chips([t],104+((x.font='700 48px '+SANS),x.measureText(dDisp(km)).width)+110,yv);
    });
  }
  for(const g of groups){
    block(g.ex,g.reps.length+' set'+(g.reps.length>1?'s':''),yv=>{
      x.fillStyle=V('--chalk'); x.font='700 48px '+SANS; x.fillText(wDisp(g.w),104,yv);
      const ww=x.measureText(wDisp(g.w)).width;
      x.fillStyle=V('--muted'); x.font='500 28px '+MONO; x.fillText(U(),104+ww+12,yv);
      chips(g.reps,104+ww+110,yv);
    });
    if(y>H-60) break;
  }
  x.fillStyle=V('--muted'); x.font='600 26px '+MONO;
  x.fillText('SHOWUP',104,H-64);
  x.textAlign='right'; x.fillText(sets+' sets',S-104,H-64); x.textAlign='left';
}
function cardFrame(x,S,o){
  const V=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
  const SANS='"IBM Plex Sans",system-ui,sans-serif', MONO='"IBM Plex Mono",ui-monospace,monospace';
  const P=64;
  x.fillStyle=V('--ground'); x.fillRect(0,0,S,S);
  x.textAlign='left'; x.textBaseline='alphabetic';
  x.fillStyle=V('--chalk'); x.font='700 96px '+SANS;
  x.fillText(o.big,P,P+96);
  const tw=(x.measureText(o.big)||{width:0}).width||0;
  x.fillStyle=V('--muted'); x.font='500 36px '+MONO;
  x.fillText(o.sub||'',P+tw+18,P+96);
  x.font='600 30px '+MONO; x.fillStyle=V('--muted');
  x.fillText(o.kicker,P,P+152);
  /* v3.3.133: the URL stamp is gone from every card. The "ShowUp" wordmark
     already says where a receipt came from, and the URL was buying a second
     mention at the cost of a whole line. The caption moves down into the
     space it vacated. */
  x.font='500 30px '+MONO; x.fillStyle=V('--muted');
  x.fillText(o.footer||'',P,S-90);
  if(o.stamp){                     // bottom-right: today's date, opposite the caption
    x.textAlign='right'; x.fillStyle=V('--faint');
    x.fillText(o.stamp,S-P,S-90); x.textAlign='left';
  }
  /* v3.3.133: AT/AB describe the band a plot may occupy — below the kicker,
     above the caption. Painters centre themselves inside it rather than
     hardcoding a top, which is what left the dead strip under every chart.
     T/B stay for callers that still want the old full-bleed rect. */
  const AT=P+192, AB=S-136;
  return {V,SANS,MONO,P,L:P,R:S-P,T:250,B:S-200,AT,AB,
          /* centre a plot of height h in the band */
          mid:h=>AT+Math.max(0,((AB-AT)-h)/2)};
}
/* v3.3.115: these three cards now reproduce the on-screen chart rather than
   approximating it. Each SVG is authored in a 330x118 viewBox, so the card
   maps that coordinate system straight onto the canvas: one scale factor,
   the same drawing loop, the same labels and opacities. Fidelity by
   construction \u2014 if the chart changes, porting the loop is a copy, not a
   redesign. The generic drawSeries() stays for Pace and Every week, whose
   on-screen shapes it already matches. */
function vbMap(S,vbW,top){
  const P=64, W=S-P*2, k=W/vbW;
  return {k,P,W, X:x=>P+x*k, Y:y=>top+y*k, F:px=>Math.round(px*k)};
}
/* v3.3.133: same map, but the top is derived so the viewBox sits centred in
   the frame's plot band instead of hanging off the header. vbH is the used
   height of the viewBox, not its declared one — Days by month declares 118
   but only paints down to ~109, and centring on the declared box would push
   the art high by the difference. */
function vbMapCentered(S,vbW,vbH,F){
  const P=64, k=(S-P*2)/vbW;
  return vbMap(S,vbW,F.mid(vbH*k));
}
function rrect(x,px,py,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  x.beginPath();
  x.moveTo(px+rr,py); x.arcTo(px+w,py,px+w,py+h,rr);
  x.arcTo(px+w,py+h,px,py+h,rr); x.arcTo(px,py+h,px,py,rr);
  x.arcTo(px,py,px+w,py,rr); x.fill();
}
function drawSeries(o){
  const S=1080, cv=document.createElement('canvas'); cv.width=S; cv.height=S;
  const x=cv.getContext('2d');
  const F=cardFrame(x,S,o), V=F.V, MONO=F.MONO;
  /* v3.3.133: both series cards centre in the frame's band. Every week (bars)
     additionally loses 25% of its height — it was a wall of tall columns that
     said less than a shorter one would. Pace (line) keeps its full height:
     it is a nearly flat series, and squashing it further would flatten the
     only variation it has to show. */
  const bars=o.kind!=='line';
  /* v3.3.134: a line may declare its own y-range. Pace values sit within a
     few percent of each other, so scaling 0->max pinned every point into the
     top sliver and left the rest of the plot structurally empty — the
     whitespace read as a centring bug but was a SCALE bug. The live chart has
     always scaled lo->hi (lift.js, "never flatten a near-identical year");
     the card simply never got that logic.
     Bars deliberately CANNOT do this: a bar cut off at a non-zero baseline
     overstates the differences between bars. Zero-based on principle. */
  const ranged = !bars && o.yLo!=null && o.yHi!=null && isFinite(o.yLo) && isFinite(o.yHi) && o.yHi>o.yLo;
  /* the line block is shorter than the bars block and centres WITH its
     labels, so the x-axis follows the art instead of sitting at the foot of
     an empty box */
  const LBL=70;
  const H=(F.AB-F.AT-LBL)*(bars?0.75:0.55);
  const T=F.mid(H+LBL), B=T+H;
  const L=F.L, R=F.R, W=R-L;
  const vals=o.vals, n=vals.length||1;
  const max=Math.max(...vals.filter(v=>typeof v==='number'&&isFinite(v)), o.floor||0, 1e-9);
  const Y = ranged ? (v=>B-((v-o.yLo)/(o.yHi-o.yLo))*H)
                   : (v=>B-(v/max)*H);
  /* v3.3.133: bars get a y-axis and dotted rules. Without them a shorter bar
     was only "shorter than the others" — you could not read how far a past
     run actually went, which is the question the card exists to answer. */
  if(bars){
    x.textAlign='right'; x.textBaseline='middle'; x.font='500 26px '+MONO;
    for(const g of [0,0.5,1]){
      const gy=B-g*H;
      if(g){ x.strokeStyle=V('--line'); x.lineWidth=1.5; x.setLineDash([6,7]);
        x.beginPath(); x.moveTo(L,gy); x.lineTo(R,gy); x.stroke(); x.setLineDash([]); }
      x.fillStyle=V('--faint'); x.fillText(String(Math.round(max*g)),L-14,gy);
    }
    x.textBaseline='alphabetic';
  }
  if(o.ref!=null&&isFinite(o.ref)&&o.ref>0){
    x.strokeStyle=V('--line'); x.lineWidth=2; x.setLineDash([6,8]);
    x.beginPath(); x.moveTo(L,Y(o.ref)); x.lineTo(R,Y(o.ref)); x.stroke(); x.setLineDash([]);
  }
  if(o.kind==='line'){
    x.strokeStyle=V('--accent'); x.lineWidth=6; x.lineJoin='round'; x.lineCap='round';
    x.beginPath();
    vals.forEach((v,i)=>{ const px=L+(n===1?W/2:(i/(n-1))*W); const py=Y(v);
      i?x.lineTo(px,py):x.moveTo(px,py); });
    x.stroke();
    /* v3.3.133: every point is labelled, and the LATEST point stays accent
       (it used to inherit the record colour when it happened to be fastest)
       but draws larger. "Where am I now" should be found by size, not by a
       colour that means something else. */
    const last=n-1;
    vals.forEach((v,i)=>{ const px=L+(n===1?W/2:(i/(n-1))*W);
      x.fillStyle=(i===o.hi&&i!==last)?V('--record'):V('--accent');
      x.beginPath(); x.arc(px,Y(v),i===last?16:9,0,7); x.fill(); });
    x.textAlign='center'; x.font='500 24px '+MONO;
    const fmt=o.fmtPt||(v=>String(Math.round(v)));
    vals.forEach((v,i)=>{
      const px=L+(n===1?W/2:(i/(n-1))*W);
      // alternate above/below so 12 labels on a flat line never touch
      const above=i%2===0;
      x.fillStyle=(i===last)?V('--accent'):V('--faint');
      x.font=(i===last?'700 26px ':'500 24px ')+MONO;
      x.fillText(fmt(v),px,Y(v)+(above?-30:44));
    });
  }else{
    const gap=W/n, bw=Math.min(gap*0.62,70);
    vals.forEach((v,i)=>{
      const px=L+i*gap+(gap-bw)/2, py=Y(v), hh=Math.max(4,B-py);
      x.fillStyle=(i===o.hi)?V('--accent'):V('--accent-dim');
      x.globalAlpha=(i===o.hi)?1:0.65;
      rrect(x,px,py,bw,hh,10); x.globalAlpha=1;
    });
    // v3.3.133: the most recent bar carries its value — the one number here
    const li=n-1, lpx=L+li*gap+gap/2;
    x.textAlign='center'; x.fillStyle=V('--accent'); x.font='700 30px '+MONO;
    x.fillText(String(Math.round(vals[li])),lpx,Y(vals[li])-18);
  }
  x.textAlign='center'; x.fillStyle=V('--muted'); x.font='500 26px '+MONO;
  /* v3.3.133: bars label the OLDEST and NEWEST week only. Nine dates across
     the foot was a ruler nobody read; the span is the useful fact. */
  const lab=o.labels||[];
  if(bars){
    [0,n-1].forEach(i=>{ if(lab[i]==null) return;
      x.fillText(lab[i],L+i*(W/n)+(W/n)/2,B+46); });
  }else{
    const step=Math.ceil(n/12);
    lab.forEach((t,i)=>{
      if(i%step && i!==n-1) return;
      x.fillText(t,L+(n===1?W/2:(i/(n-1))*W),B+46);
    });
  }
  x.textAlign='left';
  return cv;
}

/* --- Days by month: ports the svg loop at stats.js verbatim ------------- */
function drawDbm(o){
  const S=1080, cv=document.createElement('canvas'); cv.width=S; cv.height=S;
  const x=cv.getContext('2d');
  const F=cardFrame(x,S,o), V=F.V, MONO=F.MONO;
  const M=vbMapCentered(S,330,109,F);   // v3.3.133: painted height is ~109 of the 118 box
  const refY=94-20/31*80;
  x.strokeStyle=V('--line'); x.lineWidth=Math.max(1,M.F(0.6)); x.setLineDash([M.F(2),M.F(3)]);
  x.beginPath(); x.moveTo(M.X(8),M.Y(refY)); x.lineTo(M.X(316),M.Y(refY)); x.stroke(); x.setLineDash([]);
  x.fillStyle=V('--muted'); x.font='500 '+M.F(7)+'px '+MONO; x.textAlign='left';
  x.fillText('20',M.X(319),M.Y(96-20/31*80));
  o.ms.forEach(([m,n],i)=>{
    const cur=m===o.monthKey;
    const bh=Math.max(2,n/31*80), px=8+i*25.5;
    if(cur){
      const gh=o.dayOfMonth/31*80;
      x.strokeStyle=V('--accent'); x.lineWidth=Math.max(1,M.F(0.8)); x.setLineDash([M.F(2),M.F(2)]);
      x.strokeRect(M.X(px),M.Y(94-gh),M.F(17),M.F(gh)); x.setLineDash([]);
    }
    x.fillStyle=V('--accent'); x.globalAlpha=cur?1:0.55;
    rrect(x,M.X(px),M.Y(94-bh),M.F(17),M.F(bh),M.F(3)); x.globalAlpha=1;
    x.textAlign='center'; x.font='500 '+M.F(7)+'px '+MONO;
    if(cur){
      const gh=o.dayOfMonth/31*80;
      x.fillStyle=V('--muted'); x.fillText(String(o.dayOfMonth),M.X(px+8.5),M.Y(94-gh-3));
      x.fillStyle='#fff'; x.font='700 '+M.F(7)+'px '+MONO;
      x.fillText(String(n),M.X(px+8.5),M.Y(Math.min(91,94-bh+9)));
    }else{
      x.fillStyle=V('--muted'); x.fillText(String(n),M.X(px+8.5),M.Y(94-bh-3));
    }
    x.fillStyle=cur?V('--accent'):V('--muted'); x.font='500 '+M.F(7)+'px '+MONO;
    x.fillText(m.slice(5),M.X(px+8.5),M.Y(107));
  });
  x.textAlign='left';
  return cv;
}

/* --- Weekdays: ports the svg loop verbatim, gridlines and all ----------- */
function drawWd(o){
  const S=1080, cv=document.createElement('canvas'); cv.width=S; cv.height=S;
  const x=cv.getContext('2d');
  const F=cardFrame(x,S,o), V=F.V, MONO=F.MONO;
  const M=vbMapCentered(S,330,112,F);   // v3.3.133
  for(const g of [0,25,50,75,100]){
    const y=94-g/100*81;
    x.strokeStyle=V('--line'); x.lineWidth=Math.max(1,M.F(0.6));
    if(g) x.setLineDash([M.F(2),M.F(3)]);
    x.beginPath(); x.moveTo(M.X(24),M.Y(y)); x.lineTo(M.X(316),M.Y(y)); x.stroke(); x.setLineDash([]);
    x.fillStyle=V('--muted'); x.font='500 '+M.F(7)+'px '+MONO; x.textAlign='right';
    x.fillText(String(g),M.X(21),M.Y(y+3));
  }
  const N=['S','M','T','W','T','F','S'];
  N.forEach((lab,i)=>{
    const p=o.pct[i], today=i===o.today, best=i===o.best;
    const bh=Math.max(2,p*81), px=32+i*41;
    x.fillStyle=today?V('--accent'):V('--accent-dim');
    x.globalAlpha=today?1:0.6;
    rrect(x,M.X(px),M.Y(94-bh),M.F(26),M.F(bh),M.F(4)); x.globalAlpha=1;
    x.textAlign='center';
    /* v3.3.133: the SAME collision the live chart had at v3.3.129 — the %
       label's y branched on today/best while the caret sat at a fixed
       offset, so a day that was BOTH drew them on top of each other. The
       card carried the bug because it ports the loop verbatim. Same fix:
       one unconditional stack, bar -> % (4 up) -> caret (11 above the %). */
    const pctY=90-bh;
    x.fillStyle=V('--muted'); x.font='500 '+M.F(8)+'px '+MONO;
    x.fillText(Math.round(p*100)+'%',M.X(px+13),M.Y(pctY));
    if(best){ x.fillStyle=V('--muted'); x.font='500 '+M.F(9)+'px '+MONO;
      x.fillText('\u25b2',M.X(px+13),M.Y(pctY-11)); }
    x.fillStyle=today?V('--chalk'):V('--muted'); x.font='500 '+M.F(9)+'px '+MONO;
    x.fillText(lab,M.X(px+13),M.Y(109));
  });
  x.textAlign='left';
  return cv;
}

/* --- Last 6 months: the heatmap, with its weekday rail and month row --- */
function drawHeat(o){
  const S=1080, cv=document.createElement('canvas'); cv.width=S; cv.height=S;
  const x=cv.getContext('2d');
  const F=cardFrame(x,S,o), V=F.V, MONO=F.MONO;
  const P=64, cols=o.cols;
  const rail=46, gap=5;
  const cell=Math.floor((S-P*2-rail-gap*(cols.length-1))/cols.length);
  /* v3.3.133: centre the grid in the band. The month row sits 16px above the
     first cell, so the block being centred is 7 rows PLUS that label strip —
     centring the cells alone would ride high by the label's height. */
  const gridH=7*cell+6*gap, labelStrip=38;
  const gridL=P+rail, top=F.mid(gridH+labelStrip)+labelStrip;
  // weekday rail, matching the on-screen .wdrail
  x.fillStyle=V('--faint'); x.font='500 22px '+MONO; x.textAlign='right'; x.textBaseline='middle';
  ['S','M','T','W','T','F','S'].forEach((d,r)=>
    x.fillText(d,P+rail-14,top+r*(cell+gap)+cell/2));
  // month labels across the top, only where the month turns over
  x.textAlign='left'; x.textBaseline='alphabetic';
  x.fillStyle=V('--muted'); x.font='500 22px '+MONO;
  let lastM=-1;
  cols.forEach((col,ci)=>{
    const m=new Date(col[0].iso+'T00:00').getMonth();
    if(m!==lastM){
      x.fillText(new Date(col[0].iso+'T00:00').toLocaleDateString('en-US',{month:'short'}),
                 gridL+ci*(cell+gap), top-16);
      lastM=m;
    }
  });
  cols.forEach((col,ci)=>col.forEach((d,ri)=>{
    const px=gridL+ci*(cell+gap), py=top+ri*(cell+gap);
    x.globalAlpha=d.fut?0.35:1;
    x.fillStyle=d.on?V('--accent'):V('--surface2');
    rrect(x,px,py,cell,cell,4);
    x.globalAlpha=1;
    if(d.iso===todayISO){
      x.strokeStyle=V('--chalk'); x.lineWidth=3;
      x.strokeRect(px-2,py-2,cell+4,cell+4);
    }
  }));
  return cv;
}
async function showCard(drawFn,label,fromCarousel){
  try{
    if(document.fonts&&document.fonts.ready) await document.fonts.ready;
    const cv=drawFn();
    if(!cv){ toast('Canvas unavailable on this device'); return; }
    _repCv={cv,label};
    /* v3.3.139: swiping the overlay only makes sense when it was opened FROM
       the carousel. The milestone card is drawn outside the registry, so a
       swipe there would teleport you from "day 900" to an unrelated chart. */
    _repFromCarousel=!!fromCarousel;
    repOvEl().style.display='flex';
    document.getElementById('repImg').src=cv.toDataURL('image/png');
    bindOvSwipe();
  }catch(e){ toast('Could not draw the image'); }
}
let _repFromCarousel=false;
/* redraw the overlay in place, and keep the carousel underneath in step so
   closing lands you where you left off */
async function ovRotate(step){
  if(!_repFromCarousel) return;
  const L=shareCards();
  if(!L.length) return;
  _repIdx=((_repIdx+step)%L.length+L.length)%L.length;
  const card=L[_repIdx];
  try{
    if(document.fonts&&document.fonts.ready) await document.fonts.ready;
    const cv=card.draw();
    if(!cv) return;
    /* _repCv MUST follow what is on screen. If it does not, Share sends the
       card you were looking at BEFORE the swipe — which looks like nothing
       is wrong until the image lands in someone's chat. */
    _repCv={cv,label:card.file()};
    const img=document.getElementById('repImg');
    if(img) img.src=cv.toDataURL('image/png');
    paintRepCard();
  }catch(e){ /* leave the overlay on the card it already has */ }
}
/* v3.3.139: every card, one gesture. A PWA cannot write to the Camera Roll
   directly — there is no API for it — so the honest best is to hand iOS all
   the images in a single share sheet, where "Save Images" writes the set in
   one tap. Desktop has no share sheet for files, so it falls back to
   sequential downloads, spaced so the browser does not treat the burst as a
   popup storm. */
async function saveAllCards(){
  const btn=document.getElementById('repAll');
  const L=shareCards();
  if(!L.length) return;
  const was=btn?btn.textContent:'';
  if(btn){ btn.disabled=true; btn.textContent='Drawing '+L.length+'\u2026'; }
  try{
    if(document.fonts&&document.fonts.ready) await document.fonts.ready;
    const files=[];
    for(const c of L){
      const cv=c.draw();
      if(!cv) continue;
      const blob=await new Promise(res=>cv.toBlob(res,'image/png'));
      if(!blob) continue;
      files.push(new File([blob],'showup-'+String(c.file()).toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.png',{type:'image/png'}));
    }
    if(!files.length){ toast('Could not draw the cards'); return; }
    if(navigator.canShare&&navigator.canShare({files})){
      await navigator.share({files});
    }else{
      // one at a time, or the browser blocks the burst
      for(const f of files){
        const a=document.createElement('a');
        a.href=URL.createObjectURL(f); a.download=f.name; a.click();
        setTimeout(()=>URL.revokeObjectURL(a.href),4000);
        await new Promise(r=>setTimeout(r,300));
      }
      toast(files.length+' cards saved');
    }
  }catch(e){
    if(!e||e.name!=='AbortError') toast('Could not save the cards');   // AbortError = you closed the sheet
  }finally{
    if(btn){ btn.disabled=false; btn.textContent=was; }
  }
}
function bindOvSwipe(){
  /* bound to the IMAGE, not the overlay: a drag that starts on Share or
     Close should press that button, not rotate the card behind it */
  const img=document.getElementById('repImg');
  if(img) bindSwipe(img,step=>ovRotate(step));
}
/* v3.3.130: makeGridImage/makeYoyImage/makeRunYoyImage deleted — their
   draws are rows in shareCards() now. makeMilestoneImage stays: the
   milestone toast fires it directly, outside the carousel. */
/* v3.3.130: the Report card carousel. Index lives at module scope so the
   card you rotated to survives a Stats re-render (logging a set re-renders
   the tab, and snapping back to card 1 every time would make rotation
   feel broken rather than stateful). */
/* v3.3.139: one gesture reader, used by the carousel and by the overlay.
   Commits only on horizontal INTENT — a long enough drag that is also
   decisively more sideways than vertical — because both surfaces sit inside
   a page you scroll vertically, and a carousel that rotates while you are
   trying to scroll past it is worse than one with no swipe at all.
   Pointer events, not touch: the same code then works with a trackpad drag
   and a mouse, and pointer capture keeps the gesture alive if the finger
   leaves the element mid-drag. */
const SWIPE_MIN=44, SWIPE_RATIO=1.5;
function bindSwipe(el,onSwipe){
  if(!el||el._swipeBound) return;
  el._swipeBound=true;
  let x0=0,y0=0,id=null;
  el.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0) return;
    id=e.pointerId; x0=e.clientX; y0=e.clientY;
  });
  const end=e=>{
    if(id===null||e.pointerId!==id) return;
    id=null;
    const dx=e.clientX-x0, dy=e.clientY-y0;
    if(Math.abs(dx)<SWIPE_MIN) return;             // a twitch, not a swipe
    if(Math.abs(dx)<Math.abs(dy)*SWIPE_RATIO) return;   // that was a scroll
    onSwipe(dx<0?1:-1);                            // drag left = next card
  };
  el.addEventListener('pointerup',end);
  el.addEventListener('pointercancel',()=>{id=null;});
}
function bindRepSwipe(){
  bindSwipe(document.getElementById('repCard'),step=>repRotate(step));
}
let _repIdx=0;
function repCardAt(){
  const L=shareCards();
  if(!L.length) return null;
  _repIdx=((_repIdx%L.length)+L.length)%L.length;   // wrap both ways
  return {card:L[_repIdx], n:L.length};
}
async function paintRepCard(){
  const box=document.getElementById('repCard');
  if(!box) return;
  bindRepSwipe();   // v3.3.139: idempotent — the card is rebuilt on every Stats render
  const at=repCardAt();
  if(!at) return;
  const ttl=document.getElementById('repTtl');
  const img=document.getElementById('repThumb');
  if(ttl) ttl.textContent=at.card.label;
  const dots=document.getElementById('repDots');
  if(dots) dots.textContent=at.n>1?`${_repIdx+1} / ${at.n}`:'';
  if(!img) return;
  /* draw lazily, one card at a time. Painting all eight up front would
     burn eight 1080px canvases to show one. */
  try{
    if(document.fonts&&document.fonts.ready) await document.fonts.ready;
    const cv=at.card.draw();
    if(cv) img.src=cv.toDataURL('image/png');
  }catch(e){ /* preview is a nicety; the share button still works */ }
}
function repRotate(step){
  const L=shareCards();
  if(!L.length) return;
  _repIdx=((_repIdx+step)%L.length+L.length)%L.length;
  paintRepCard();
}
document.addEventListener('click',e=>{
  /* v3.3.72: closest(), not e.target.id — a button that gains a child at
     runtime silently stops responding (the v3.3.58 lesson, in the gym). */
  const hit=id=>!!(e.target.closest&&e.target.closest('#'+id));
  if(hit('repAll')){ saveAllCards(); return; }
  if(hit('repPrev')){ repRotate(-1); return; }
  if(hit('repNext')){ repRotate(1); return; }
  if(hit('repShare')){
    const at=repCardAt();
    if(at) showCard(at.card.draw, at.card.file(), true);   // v3.3.139: swipeable
    return;
  }
  if(hit('repClose')){ repOvEl().style.display='none'; return; }
  if(hit('repDo')&&_repCv){
    const name='showup-'+String(_repCv.label).toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.png';
    _repCv.cv.toBlob(b=>{
      const f=new File([b],name,{type:'image/png'});
      if(navigator.canShare&&navigator.canShare({files:[f]})) navigator.share({files:[f]}).catch(()=>{});
      else{ const a=document.createElement('a'); a.href=_repCv.cv.toDataURL('image/png'); a.download=name; a.click(); }
    },'image/png');
    return;
  }
});
