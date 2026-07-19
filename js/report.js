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
let _repCv=null;
function repOvEl(){
  let ov=document.getElementById('repOv');
  if(ov) return ov;
  ov=document.createElement('div'); ov.id='repOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(20,22,26,.78);z-index:90;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px';
  ov.innerHTML=`<img id="repImg" style="max-width:min(88vw,420px);border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.45)">
    <div style="display:flex;gap:10px">
      <button class="btn" id="repDo" style="margin:0">Share</button>
      <button class="btn ghost" id="repClose" style="margin:0">Close</button>
    </div>`;
  document.body.appendChild(ov);
  return ov;
}
async function makeRepImage(){
  try{
    if(document.fonts&&document.fonts.ready) await document.fonts.ready;
    const rd=repData(repOff);
    const cv=drawRep(rd);
    if(!cv){ toast('Canvas unavailable on this device'); return; }
    _repCv={cv,label:rd.label};
    repOvEl().style.display='flex';
    document.getElementById('repImg').src=cv.toDataURL('image/png');
  }catch(e){ toast('Could not draw the image'); }
}
document.addEventListener('click',e=>{
  if(e.target.id==='repPrev'){ repOff++; if(view==='stats') render(); return; }
  if(e.target.id==='repNext'&&repOff>0){ repOff--; if(view==='stats') render(); return; }
  if(e.target.id==='repShare'){ makeRepImage(); return; }
  if(e.target.id==='repClose'){ repOvEl().style.display='none'; return; }
  if(e.target.id==='repDo'&&_repCv){
    const name='showup-'+_repCv.label.toLowerCase().replace(/ /g,'-')+'.png';
    _repCv.cv.toBlob(b=>{
      const f=new File([b],name,{type:'image/png'});
      if(navigator.canShare&&navigator.canShare({files:[f]})) navigator.share({files:[f]}).catch(()=>{});
      else{ const a=document.createElement('a'); a.href=_repCv.cv.toDataURL('image/png'); a.download=name; a.click(); }
    },'image/png');
    return;
  }
});
