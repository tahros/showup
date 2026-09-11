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
// A finished image, never a screenshot of the animation's current frame.
// Snapshot the date, ledger, theme and units before awaiting image/font loading.
async function sharePlateCard(){
  const date=todayISO,record=JSON.parse(JSON.stringify(DB.days?.[date]||{}));
  const css=getComputedStyle(document.documentElement),read=(k,f)=>css.getPropertyValue(k).trim()||f;
  const data={date,record,name:firstName()||'',unit:U(),total:plateNumber(plateMetrics(record).kg),
    surface:read('--surface','#fff'),ink:read('--chalk','#1c1c1c'),muted:read('--muted','#686868'),line:read('--line','#ededed'),
    colors:Object.fromEntries(Object.entries(PART_COLORS).map(([p,v])=>[p,read(v.slice(4,-1),'#888888')]))};
  try{
    const mascot=new Image();mascot.src='assets/mascot-blue.png';await mascot.decode();
    return showCard(()=>drawPlateShare(data,mascot),'showup-stacked-'+date,false);
  }catch(e){toast('Could not prepare the stacked image. Please try again.');}
}
function drawPlateShare(data,mascot){
  const cv=document.createElement('canvas');cv.width=1080;cv.height=1280;
  const x=cv.getContext('2d');if(!x)return null;
  const m=plateMetrics(data.record),plates=plateLedger(data.record),bank=Math.max(0,Math.floor((plates.length-1)/30))*30;
  const sans='"IBM Plex Sans",sans-serif',mono='"IBM Plex Mono",monospace';
  x.fillStyle=data.surface;x.fillRect(0,0,1080,1280);
  const text=(s,y,font,color=data.ink)=>{x.font=font;x.fillStyle=color;x.textAlign='center';x.fillText(s,540,y,944);};
  text('WORKOUT COMPLETE',98,'500 25px '+mono,data.muted);
  const date=new Date(data.date+'T00:00');
  text(date.toLocaleDateString('en-US',{weekday:'long'})+' · '+date.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}),148,'500 30px '+mono);
  function shadow(cx,cy,rx,ry){x.save();x.translate(cx,cy);x.scale(rx,ry);const g=x.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,'rgba(90,90,90,.20)');g.addColorStop(1,'rgba(90,90,90,0)');x.fillStyle=g;x.beginPath();x.arc(0,0,1,0,Math.PI*2);x.fill();x.restore();}
  const shade=(c,f)=>{const hex=c.replace('#','');return /^[\da-f]{6}$/i.test(hex)?'#'+[0,2,4].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*f).toString(16).padStart(2,'0')).join(''):c;};
  for(let c=0;c<Math.min(3,Math.ceil((plates.length-bank)/10));c++)shadow(210+c*195,774,130,22);
  for(let i=bank;i<plates.length;i++){
    const p=plates[i],n=i-bank,c=data.colors[p.part]||'#888888',cx=210+Math.floor(n/10)*195,cy=741-(n%10)*29,h=19*Math.min(1,p.kg/(500/LB));
    x.fillStyle=shade(c,.7);x.beginPath();x.ellipse(cx,cy+h,88,20,0,0,Math.PI*2);x.fill();x.fillRect(cx-88,cy,176,h);
    x.fillStyle=c;x.beginPath();x.ellipse(cx,cy,88,20,0,0,Math.PI*2);x.fill();
    x.fillStyle=shade(c,.42);x.beginPath();x.ellipse(cx,cy,13,6,0,0,Math.PI*2);x.fill();
  }
  shadow(891,778,80,13);x.drawImage(mascot,783,659,216,132);
  x.font='700 112px '+sans;const numberWidth=x.measureText(data.total).width;
  x.font='400 34px '+mono;const unitText=data.unit+' moved',unitWidth=x.measureText(unitText).width;
  const left=(1080-numberWidth-unitWidth-23)/2;
  x.textAlign='left';x.fillStyle=data.ink;x.font='700 112px '+sans;x.fillText(data.total,left,915);
  x.font='400 34px '+mono;x.fillStyle=data.muted;x.fillText(unitText,left+numberWidth+23,915);
  text(`${m.sets} set${m.sets===1?'':'s'} · ${m.exercises} exercise${m.exercises===1?'':'s'}`,982,'500 30px '+mono,data.muted);
  // Wrap the legend rather than shrinking names when more parts are present.
  const parts=[...new Set(plates.map(p=>p.part||'Other'))],rows=[[]];let width=0;x.font='400 25px '+mono;
  for(const p of parts){const w=x.measureText(p).width+48;if(width+w>900){rows.push([]);width=0;}rows.at(-1).push({p,w});width+=w;}
  rows.forEach((row,r)=>{let left=(1080-row.reduce((s,p)=>s+p.w,0))/2;for(const {p,w} of row){x.fillStyle=data.colors[p]||data.muted;x.beginPath();x.arc(left+7,1030+r*37,7,0,Math.PI*2);x.fill();x.fillStyle=data.muted;x.textAlign='left';x.fillText(p,left+24,1038+r*37);left+=w;}});
  if(bank)text(`${bank/10} completed stacks + current stacks`,1140,'400 24px '+mono,data.muted);
  x.strokeStyle=data.line;x.lineWidth=1;x.beginPath();x.moveTo(70,1180);x.lineTo(1010,1180);x.stroke();
  x.fillStyle=data.muted;x.font='400 28px '+sans;x.textAlign='left';x.fillText(data.name,70,1230,680);
  x.fillStyle=data.ink;x.font='600 30px '+sans;x.textAlign='right';x.fillText('Show Up',1010,1230);
  return cv;
}
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
