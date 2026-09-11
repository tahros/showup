/* ShowUp plate rewards. Ledger-derived volume; local viewing state only.
   500 lb per plate, 10 plates per stack. Never change scale during a day. */
function plateMetrics(record){
  let kg=0,sets=0; const exercises=new Set();
  for(const s of record?.w||[]){
    const reps=(s.reps||[]).map(Number).filter(r=>Number.isFinite(r)&&r>0);
    const count=s.ex==='Run'?1:reps.length;
    sets+=count;if(count)exercises.add(s.ex);
    if(s.ex!=='Run'&&!isHold(s.su)&&Number.isFinite(+s.w)&&+s.w>0)kg+=+s.w*reps.reduce((a,b)=>a+b,0);
  }
  return {kg,sets,exercises:exercises.size};
}
function plateCurrent(){return plateMetrics(DB.days?.[todayISO]);}
// Each body part owns its volume, including its fractional last plate.
// No rounding of the ledger and no borrowing another part's colour.
function plateLedger(record){
  const parts=new Map();
  for(const s of record?.w||[]){const kg=plateMetrics({w:[s]}).kg;if(kg>0)parts.set(s.part,(parts.get(s.part)||0)+kg);}
  const plates=[];let end=0;const unit=500/LB;
  for(const [part,kg] of parts){let left=kg;while(left>1e-8){const amount=Math.min(unit,left);end+=amount;plates.push({part,kg:amount,end});left-=amount;}}
  return plates;
}
function plateNumber(kg){return Math.round(toU(kg)).toLocaleString();}
function plateKey(){return 'showup.plates.v2.'+(session?.user?.id||'local')+'.'+todayISO;}
function plateSeen(){try{return Math.max(0,Number(localStorage.getItem(plateKey()))||0);}catch(e){return 0;}}
function plateRemember(kg){try{localStorage.setItem(plateKey(),String(kg));}catch(e){}}
function plateMark(x,y,w,h){return `<path d="M${x} ${y-h}a${w/2} 7 0 0 1 ${w} 0v${h}a${w/2} 7 0 0 1 -${w} 0z" fill="var(--plate-side)"/><ellipse cx="${x+w/2}" cy="${y-h}" rx="${w/2}" ry="7" fill="var(--plate-top)"/><ellipse cx="${x+w/2}" cy="${y-h}" rx="5" ry="2" fill="var(--plate-hole)"/>`;}
function plateMiniHTML(){const m=plateCurrent();return `<div class="plate-mini" aria-live="polite"><svg viewBox="0 0 48 42" aria-hidden="true">${[0,1,2].map(i=>`<g>${plateMark(6,32-i*8,34,5)}</g>`).join('')}</svg><span>${plateNumber(m.kg)} ${U()} moved today</span></div>`;}
let plateTrainingLast=null;
function bindPlateMini(saved){
  const m=plateCurrent(),el=document.querySelector('.plate-mini');
  const before=plateTrainingLast?.day===todayISO?plateTrainingLast.kg:m.kg;
  plateTrainingLast={day:todayISO,kg:m.kg};
  if(!el||!saved)return;
  el.querySelector('span').textContent=(m.kg>before?'+'+plateNumber(m.kg-before)+' '+U():'Set saved')+' · '+plateNumber(m.kg)+' today';
  const p=el.querySelector('g:last-child');
  if(p?.animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)p.animate([{transform:'translateY(-28px)'},{transform:'translateY(2px)',offset:.7},{transform:'translateY(0)'}],{duration:650,easing:'ease-out'});
  setTimeout(()=>{if(el.isConnected)el.querySelector('span').textContent=plateNumber(plateCurrent().kg)+' '+U()+' moved today';},3500);
}
