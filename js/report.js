/* ShowUp — report.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- v3.2.4 report card engine ---------- */
let repOff=0;
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
function drawRep(rd){
  const cv=document.createElement('canvas'); cv.width=1080; cv.height=1350;
  const x=cv.getContext('2d'); if(!x) return null;
  const V=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
  const SANS='"IBM Plex Sans",system-ui,sans-serif', MONO='"IBM Plex Mono",ui-monospace,monospace';
  /* v3.3.13: canvas never inherits CSS fonts — if Plex isn't loaded yet the
     browser silently substitutes system faces. Draw now with whatever exists,
     and redraw once the real fonts land. */
  if(document.fonts&&document.fonts.status!=='loaded'&&!drawRep._rearm){
    drawRep._rearm=true;
    document.fonts.ready.then(()=>{
      drawRep._rearm=false;
      const ov=document.getElementById('repOv');
      if(ov&&ov.style.display!=='none'&&typeof repOff!=='undefined'){
        const img=ov.querySelector('img');
        if(img) img.src=drawRep(repData(repOff)).toDataURL('image/png');
      }
    });
  }
  x.fillStyle=V('--ground'); x.fillRect(0,0,1080,1350);
  x.fillStyle=V('--chalk'); x.font='700 84px '+SANS; x.textBaseline='alphabetic';
  x.fillText(rd.label,72,180);
  x.fillStyle=V('--muted'); x.font='500 30px '+MONO; x.textAlign='right';
  x.fillText('ShowUp',1008,176); x.textAlign='left';
  // heat strip
  const n=rd.days.length, W=936, cw=W/n, y0=260, ch=96;
  const rr=(px,py,w2,h2,r)=>{ x.beginPath();
    x.moveTo(px+r,py); x.arcTo(px+w2,py,px+w2,py+h2,r); x.arcTo(px+w2,py+h2,px,py+h2,r);
    x.arcTo(px,py+h2,px,py,r); x.arcTo(px,py,px+w2,py,r); x.closePath(); };
  for(let i=0;i<n;i++){
    const d=rd.days[i], px=72+i*cw;
    if(d.fut){ x.strokeStyle=V('--line'); x.setLineDash([4,5]); rr(px+2,y0,cw-5,ch,9); x.stroke(); x.setLineDash([]); }
    else if(d.tr){ x.fillStyle=V('--accent'); rr(px+2,y0,cw-5,ch,9); x.fill(); }
    else { x.strokeStyle=V('--line'); rr(px+2,y0,cw-5,ch,9); x.stroke(); }
    x.fillStyle=d.tr?V('--accent'):V('--faint'); x.font='500 19px '+MONO; x.textAlign='center';
    x.fillText(String(d.d),px+cw/2,y0+ch+34);
  }
  x.textAlign='left';
  // four numbers
  const stat=(px,py,big,lab,warm)=>{
    x.fillStyle=warm?V('--record'):V('--chalk'); x.font='700 96px '+SANS; x.fillText(big,px,py);
    x.fillStyle=V('--muted'); x.font='500 27px '+MONO; x.fillText(lab.toUpperCase(),px,py+46);
  };
  stat(72,610,String(rd.nD),'days trained',true);
  stat(560,610,fmt(Math.round(rd.vol)),'kg lifted',false);
  stat(72,850,rd.km?rd.km.toFixed(1):'0',(DU()==='km'?'km':'mi')+' run',false);
  stat(560,850,rd.mx+'d','best streak',false);
  // footer
  x.strokeStyle=V('--line'); x.beginPath(); x.moveTo(72,1230); x.lineTo(1008,1230); x.stroke();
  x.fillStyle=V('--muted'); x.font='500 30px '+MONO;
  x.fillText(fmt(rd.totalAll)+' days of showing up',72,1290);
  x.fillStyle=V('--faint'); x.font='500 24px '+MONO; x.textAlign='right';
  x.fillText('tahros.github.io/showup',1008,1290); x.textAlign='left';
  return cv;
}
/* ---------- v3.3.72 share cards ---------- */
/* The year grid as a 1:1 card. Square because it is the one ratio every
   platform accepts uncropped; the report card stays 4:5, which reads better
   in a feed. Both go out through the same overlay and the same share path. */
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
function drawYoy(curves){
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
  const pctNow=cNow?Math.round(cNow.curve[cNow.end-1]*100):null;
  x.textBaseline='alphabetic'; x.textAlign='left';
  if(pctNow!=null){
    x.fillStyle=V('--chalk'); x.font='700 96px '+SANS;
    x.fillText(pctNow+'%',P,P+96);
    const tw=(x.measureText(pctNow+'%')||{}).width||0;
    x.fillStyle=V('--muted'); x.font='500 36px '+MONO;
    x.fillText('of '+thisYear+', trained',P+tw+18,P+96);
  }
  x.textAlign='right'; x.fillStyle=V('--muted'); x.font='500 34px '+MONO;
  x.fillText('ShowUp',S-P,P+50);
  x.textAlign='left'; x.fillStyle=V('--faint'); x.font='500 28px '+MONO;
  x.fillText('CONSISTENCY, YEAR OVER YEAR',P,P+152);

  // right margin reserved for the year labels that replace the legend
  const L=P+70, R=S-P-118, T=P+212, B=S-P-96, W=R-L, H=B-T;
  // y grid
  x.textAlign='right'; x.textBaseline='middle'; x.font='500 26px '+MONO;
  for(const g of [0,0.25,0.5,0.75,1]){
    const gy=B-g*H;
    x.strokeStyle=V('--line'); x.lineWidth=1.5;
    if(g) x.setLineDash([6,7]);
    x.beginPath(); x.moveTo(L,gy); x.lineTo(R,gy); x.stroke(); x.setLineDash([]);
    x.fillStyle=V('--muted'); x.fillText(g*100+'%',L-14,gy);
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
      const px=L+(d/366)*W, py=B-curve[d]*H;
      d===0?x.moveTo(px,py):x.lineTo(px,py);
    }
    x.stroke();
    ends.push({y, cur, ex:L+((end-1)/366)*W, ey:B-curve[end-1]*H,
               pct:Math.round(curve[end-1]*100)});
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
    const label=eNow.y+' · '+eNow.pct+'%';
    const cx2=Math.max(P+((x.measureText(label)||{}).width||0)/2,
                       Math.min(eNow.ex, R-((x.measureText(label)||{}).width||0)/2));
    x.fillText(label,cx2,eNow.ey-30);
  }
  x.textBaseline='alphabetic'; x.textAlign='left';
  x.fillStyle=V('--faint'); x.font='500 26px '+MONO;
  x.fillText('% of days trained, cumulative',P,S-P+8);
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
function makeRepImage(){ const rd=repData(repOff); return showCard(()=>drawRep(rd),rd.label); }
function makeGridImage(){ const gd=gridData(); return showCard(()=>drawGrid(gd),`${gd.total}-days`); }
function makeYoyImage(){ const cs=yearCurves(); return showCard(()=>drawYoy(cs),'consistency-'+todayISO.slice(0,4)); }
document.addEventListener('click',e=>{
  /* v3.3.72: closest(), not e.target.id — a button that gains a child at
     runtime silently stops responding (the v3.3.58 lesson, in the gym). */
  const hit=id=>!!(e.target.closest&&e.target.closest('#'+id));
  if(hit('repPrev')){ repOff++; if(view==='stats') render(); return; }
  if(hit('repNext')&&repOff>0){ repOff--; if(view==='stats') render(); return; }
  if(hit('repShare')){ makeRepImage(); return; }
  if(hit('gridShare')){ makeGridImage(); return; }
  if(hit('yoyShare')){ makeYoyImage(); return; }
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
