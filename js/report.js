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
  x.fillStyle=V('--muted'); x.font='500 40px '+MONO;
  x.fillText('days',P+tw+20,P+126);
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
  x.fillText(`${gd.first} \u2192 ${todayISO}`,P,S-P+8);
  x.textAlign='right';
  x.fillText('tahros.github.io/showup',S-P,S-P+8);
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

  // right margin reserved for the year labels that replace the legend
  const L=P+70, R=S-P-118, T=P+212, B=S-P-96, W=R-L, H=B-T;
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
  x.fillText('tahros.github.io/showup',S-P,S-P+8);
  return cv;
}

let _repCv=null;
function repOvEl(){
  let ov=document.getElementById('repOv');
  if(ov) return ov;
  ov=document.createElement('div'); ov.id='repOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(20,22,26,.78);z-index:90;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;font-family:var(--body)';   // v3.3.46: overlay lives on <body>, outside #app — set the family or the buttons fall back to the OS font
  ov.innerHTML=`<img id="repImg" style="max-width:min(88vw,420px);border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.45)">
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
  x.fillStyle=V('--muted'); x.font='500 30px '+MONO;
  x.textAlign='left';
  x.fillText('tahros.github.io/showup', 64, S-64);
  return cv;
}
function makeMilestoneImage(n){ return showCard(()=>drawMilestone(n),'day-'+n); }
function makeDbmImage(){
  const ms=Object.entries(gridData().mDays).sort().slice(-12);
  return showCard(()=>drawSeries({kind:'bars',
    big:String(ms.length?ms[ms.length-1][1]:0), sub:'days this month',
    kicker:'DAYS BY MONTH', footer:'days trained each month',
    vals:ms.map(m=>m[1]), hi:ms.length-1, ref:20, floor:20,
    labels:ms.map(m=>m[0].slice(5))}),'days-by-month');
}
function makeWdImage(){
  const d=wdDist(), N=['S','M','T','W','T','F','S'];
  const FULL=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return showCard(()=>drawSeries({kind:'bars',
    big:FULL[d.best], sub:'is your strongest day',   // 'S' would not say which one
    kicker:'WEEKDAYS', footer:'% of each weekday trained, last 365 days',
    vals:d.pct, hi:d.best, labels:N}),'weekdays');
}
function makeWeekImage(){
  const w=weekSeries();
  return showCard(()=>drawSeries({kind:'bars',
    big:String(Math.round(w.avg||0)), sub:DU()+' in a typical week',
    kicker:'EVERY WEEK', footer:'distance per week \u00b7 dashed line is your average',
    vals:w.wks.map(k=>w.by[k]||0), hi:w.wks.length-1, ref:w.avg,
    labels:w.wks.map(k=>k.slice(5).replace('-','/'))}),'every-week');
}
function makePaceImage(){
  const ps=paceSeries();
  const fmtP=s=>Math.floor(s/60)+"'"+String(Math.round(s%60)).padStart(2,'0')+'"';
  const best=ps.reduce((b,p,i)=>(p[1]&&(!ps[b]||!ps[b][1]||p[1]<ps[b][1]))?i:b,0);
  return showCard(()=>drawSeries({kind:'line',
    big:ps.length?fmtP(ps[ps.length-1][1]):'\u2014', sub:'per '+DU()+' this month',
    kicker:'PACE', footer:'minutes per '+DU()+', timed runs only',
    vals:ps.map(p=>p[1]), hi:best,
    labels:ps.map(p=>p[0].slice(5))}),'pace');
}
function makeHeatImage(){
  const cols=heatSeries();
  const n=cols.reduce((a,c)=>a+c.filter(d=>d.on).length,0);
  return showCard(()=>drawHeat({cols,
    big:String(n), sub:'days in 26 weeks',
    kicker:'LAST 6 MONTHS', footer:'one column per week'}),'last-6-months');
}
/* v3.3.114: one frame, one plot, five cards. The four older cards each
   hand-drew their own frame; these share it, because they differ only in
   data and wording. kind:'bars' | 'line' | 'heat'. */
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
  x.font='500 30px '+MONO; x.fillStyle=V('--muted');
  x.fillText(o.footer||'',P,S-116);
  x.fillText('tahros.github.io/showup',P,S-64);
  return {V,SANS,MONO,P,L:P,R:S-P,T:250,B:S-200};
}
function drawSeries(o){
  const S=1080, cv=document.createElement('canvas'); cv.width=S; cv.height=S;
  const x=cv.getContext('2d');
  const F=cardFrame(x,S,o), V=F.V, MONO=F.MONO;
  const L=F.L, R=F.R, T=F.T, B=F.B, W=R-L, H=B-T;
  const vals=o.vals, n=vals.length||1;
  const max=Math.max(...vals.filter(v=>typeof v==='number'&&isFinite(v)), o.floor||0, 1e-9);
  const Y=v=>B-(v/max)*H;
  // reference line
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
    vals.forEach((v,i)=>{ const px=L+(n===1?W/2:(i/(n-1))*W);
      x.fillStyle=(i===o.hi)?V('--record'):V('--accent');
      x.beginPath(); x.arc(px,Y(v),9,0,7); x.fill(); });
  }else{
    const gap=W/n, bw=Math.min(gap*0.62,70);
    vals.forEach((v,i)=>{
      const px=L+i*gap+(gap-bw)/2, py=Y(v), hh=Math.max(4,B-py);
      x.fillStyle=(i===o.hi)?V('--accent'):V('--accent-dim');
      x.globalAlpha=(i===o.hi)?1:0.65;
      const r=Math.min(10,bw/2);
      x.beginPath(); x.moveTo(px+r,py); x.arcTo(px+bw,py,px+bw,py+hh,r);
      x.arcTo(px+bw,py+hh,px,py+hh,r); x.lineTo(px,py+hh);
      x.arcTo(px,py+hh,px,py,r); x.arcTo(px,py,px+bw,py,r); x.fill();
      x.globalAlpha=1;
    });
  }
  // x labels, thinned so they never collide
  x.textAlign='center'; x.fillStyle=V('--muted'); x.font='500 26px '+MONO;
  const step=Math.ceil(n/12);
  (o.labels||[]).forEach((t,i)=>{
    if(i%step && i!==n-1) return;
    const px=o.kind==='line' ? L+(n===1?W/2:(i/(n-1))*W) : L+i*(W/n)+(W/n)/2;
    x.fillText(t,px,B+46);
  });
  x.textAlign='left';
  return cv;
}
function drawHeat(o){
  const S=1080, cv=document.createElement('canvas'); cv.width=S; cv.height=S;
  const x=cv.getContext('2d');
  const F=cardFrame(x,S,o), V=F.V;
  const cols=o.cols, L=F.L, T=F.T+40;
  const cw=Math.floor((S-F.P*2)/cols.length), cell=Math.min(cw-4,28), gap=4;
  cols.forEach((col,ci)=>{
    col.forEach((d,ri)=>{
      const px=L+ci*(cell+gap), py=T+ri*(cell+gap);
      if(d.fut){ x.strokeStyle=V('--line'); x.lineWidth=2; x.strokeRect(px,py,cell,cell); return; }
      x.fillStyle=d.on?V('--accent'):V('--surface2');
      x.beginPath(); const r=6;
      x.moveTo(px+r,py); x.arcTo(px+cell,py,px+cell,py+cell,r);
      x.arcTo(px+cell,py+cell,px,py+cell,r); x.arcTo(px,py+cell,px,py,r);
      x.arcTo(px,py,px+cell,py,r); x.fill();
    });
  });
  return cv;
}
async function showCard(drawFn,label){
  try{
    if(document.fonts&&document.fonts.ready) await document.fonts.ready;
    const cv=drawFn();
    if(!cv){ toast('Canvas unavailable on this device'); return; }
    _repCv={cv,label};
    repOvEl().style.display='flex';
    document.getElementById('repImg').src=cv.toDataURL('image/png');
  }catch(e){ toast('Could not draw the image'); }
}
function makeGridImage(){ const gd=gridData(); return showCard(()=>drawGrid(gd),`${gd.total}-days`); }
function makeYoyImage(){ const cs=yearCurves(); return showCard(()=>drawYoy(cs),'consistency-'+todayISO.slice(0,4)); }
function makeRunYoyImage(){
  const cs=runYearCurves();
  const tot=Math.max(...Object.values(cs).map(c=>c.total),1);
  const step=Math.max(10,Math.round(tot/4/10)*10);
  return showCard(()=>drawYoy(cs,{
    yMax:Math.max(tot,step*4), ticks:[0,step,step*2,step*3,step*4],
    fmtAxis:v=>String(Math.round(v)), fmtBig:v=>String(Math.round(v)),
    kicker:'DISTANCE, YEAR OVER YEAR', sub:DU()+' in '+thisYear,
    footer:'cumulative '+DU()+' by day of year'
  }),'distance-'+todayISO.slice(0,4));
}
document.addEventListener('click',e=>{
  /* v3.3.72: closest(), not e.target.id — a button that gains a child at
     runtime silently stops responding (the v3.3.58 lesson, in the gym). */
  const hit=id=>!!(e.target.closest&&e.target.closest('#'+id));
  if(hit('gridShare')){ makeGridImage(); return; }
  if(hit('yoyShare')){ makeYoyImage(); return; }
  if(hit('runShare')){ makeRunYoyImage(); return; }
  if(hit('dbmShare')){ makeDbmImage(); return; }
  if(hit('wdShare')){ makeWdImage(); return; }
  if(hit('weekShare')){ makeWeekImage(); return; }
  if(hit('paceShare')){ makePaceImage(); return; }
  if(hit('heatShare')){ makeHeatImage(); return; }
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
