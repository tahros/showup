/* ShowUp plate rewards. Ledger-derived volume; local viewing state only.
   500 lb or 250 kg per plate, 10 plates per stack. Scale follows display units. */
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
/* v4.5.4: GROUPED BANDS, HEAVIEST PART AT THE BOTTOM.
   v4.5.3 interleaved the parts so any ten-plate window sampled the session.
   That fixed the Aug 20 complaint -- a Back day showing Triceps -- and created
   a worse one: every stack became a stripe of mixed colour, which says nothing
   at a glance. The maker wants what a real stack looks like: the part you did
   most on the floor, the least on top.
   So parts are grouped as they always were, and ORDERED BY VOLUME rather than
   by whatever order the sets were logged in. The heaviest band is the widest
   and sits lowest, which is both the honest picture and the readable one. */
function plateLedger(record,unit=isLb()?500/LB:250){
  const parts=new Map();
  for(const s of record?.w||[]){const kg=plateMetrics({w:[s]}).kg;if(kg>0)parts.set(s.part,(parts.get(s.part)||0)+kg);}
  const ordered=[...parts.entries()].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0])));
  const plates=[];let end=0;
  for(const [part,kg] of ordered){let left=kg;while(left>1e-8){const amount=Math.min(unit,left);end+=amount;plates.push({part,kg:amount,end});left-=amount;}}
  return plates;
}
// Bottom-up physical thickness, shared by the live canvas and all exports.
// A fractional plate rests on the previous top instead of occupying a full slot.
function plateStackTop(ledger,i,bank,unit,thickness,bottom){
  const first=bank+Math.floor((i-bank)/10)*10;
  let y=bottom;
  for(let j=first;j<=i;j++)y-=thickness*Math.min(1,ledger[j].kg/unit);
  // A subtle lip between plates: halfway between flush and the old spacing.
  y-=(i-first)*thickness*.25;
  return y;
}
// Keep a full replay near 3.5 seconds regardless of visible plate count.
function plateStagger(count){return count>1?2720/(count-1):0;}
function plateNumber(kg){return Math.round(toU(kg)).toLocaleString();}
function plateKey(date=todayISO){return 'showup.plates.v2.'+(session?.user?.id||'local')+'.'+date;}
function plateSeen(date=todayISO){try{return Math.max(0,Number(localStorage.getItem(plateKey(date)))||0);}catch(e){return 0;}}
function plateRemember(kg,date=todayISO){try{localStorage.setItem(plateKey(date),String(kg));}catch(e){}}
// A finished image, never a screenshot of the animation's current frame.
// Snapshot the date, ledger, theme and units before awaiting image/font loading.
/* v4.5.18: ONE FOOTER, ONE PLACE. The rule, the first name and the mark were
   written out twice -- here and in the comparison share -- with the same four
   magic numbers in both. The maker asked for the bottom margin to match the
   sides; had this stayed duplicated, the fix would have landed in one card and
   not the other, which is the failure this repo keeps paying for.
   SHARE_EDGE is the one margin: 70px on the left, the right, above the title,
   and now below the mark. The old bottom margin was 30 -- the mark sat 1201..1250
   in a 1280 canvas -- so everything in the footer moves up 40px. The internal
   spacing (mark to name, name to rule) is unchanged; only the block's foot moves
   to where the side margins say it belongs. */
const SHARE_EDGE=70, SHARE_CARD_H=1280, SHARE_MARK_H=49;
const SHARE_MARK_Y=SHARE_CARD_H-SHARE_EDGE-SHARE_MARK_H;   /* 1161 */
const SHARE_NAME_Y=SHARE_MARK_Y+29;                        /* 1190 — as before, relative to the mark */
const SHARE_RULE_Y=SHARE_NAME_Y-50;                        /* 1140 — as before, relative to the name */
function drawShareFooter(x,data,sans){
  x.strokeStyle=data.line;x.lineWidth=1;x.beginPath();x.moveTo(SHARE_EDGE,SHARE_RULE_Y);x.lineTo(1080-SHARE_EDGE,SHARE_RULE_Y);x.stroke();
  x.fillStyle=data.muted;x.font='400 28px '+sans;x.textAlign='right';x.fillText(data.name,1080-SHARE_EDGE,SHARE_NAME_Y,680);
  if(data.logo)x.drawImage(data.logo,14,85,485,292,SHARE_EDGE,SHARE_MARK_Y,82,SHARE_MARK_H);
}
async function sharePlateCard(){
  const date=todayISO,record=JSON.parse(JSON.stringify(DB.days?.[date]||{}));
  const css=getComputedStyle(document.documentElement),read=(k,f)=>css.getPropertyValue(k).trim()||f;
  const data={date,record,name:firstName()||'',unit:U(),total:plateNumber(plateMetrics(record).kg),
    surface:read('--surface','#fff'),ink:read('--chalk','#1c1c1c'),muted:read('--muted','#686868'),line:read('--line','#ededed'),
    dark:document.documentElement.dataset.theme==='dark',colors:Object.fromEntries(Object.entries(PART_COLORS).map(([p,v])=>[p,read(v.slice(4,-1),'#888888')]))};
  try{
    const mascot=new Image();mascot.src='assets/mascot-blue.png';
    const logo=new Image();logo.src='assets/mascot-mark-'+(data.dark?'white':'charcoal')+'.png';
    const module=await import('./plate-gif.js');
    await Promise.all([mascot.decode(),logo.decode(),module.loadExportFonts()]);data.logo=logo;
    await showCard(()=>drawPlateShare(data,mascot),'showup-stacked-'+date,false);
    bindPlateExport(data,mascot,module,await import('./plate-video.js'));
  }catch(e){toast('Could not prepare the stacked image. Please try again.');}
}
function drawPlateShare(data,mascot,frame={}){
  const cv=frame.canvas||document.createElement('canvas');
  // Do not resize a live captureStream canvas on every frame.
  if(cv.width!==1080)cv.width=1080;if(cv.height!==1280)cv.height=1280;
  const x=cv.getContext('2d');if(!x)return null;
  const unit=data.unit==='lb'?500/LB:250,m=plateMetrics(data.record),plates=plateLedger(data.record,unit),bank=0;
  const sans='"ShowUp Export Plex", "IBM Plex Sans",sans-serif',mono=sans;
  const animated=Number.isFinite(frame.time);let total=0;
  x.fillStyle=data.surface;x.fillRect(0,0,1080,1280);
  const text=(s,y,font,color=data.ink)=>{x.font=font;x.fillStyle=color;x.textAlign='center';x.fillText(s,540,y,944);};
  text(data.record.doneAll?'WORKOUT COMPLETE':'YOUR WORKOUT',98,'500 25px '+mono,data.muted);
  const date=new Date(data.date+'T00:00');
  text(date.toLocaleDateString('en-US',{weekday:'long'})+' · '+date.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}),148,'500 30px '+mono);
  function shadow(cx,cy,rx,ry){x.save();x.translate(cx,cy);x.scale(rx,ry);const g=x.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,'rgba(90,90,90,.20)');g.addColorStop(1,'rgba(90,90,90,0)');x.fillStyle=g;x.beginPath();x.arc(0,0,1,0,Math.PI*2);x.fill();x.restore();}
  const shade=(c,f)=>{const hex=c.replace('#','');return /^[\da-f]{6}$/i.test(hex)?'#'+[0,2,4].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*f).toString(16).padStart(2,'0')).join(''):c;};
  const stackCount=Math.ceil((plates.length-bank)/10),stacks=Math.max(1,stackCount),stackGap=stacks<=3?195:600/(stacks-1),stackX=c=>stacks<=3?210+c*195:120+c*stackGap,plateRX=stacks<=3?88:Math.min(76,stackGap*.42);
  for(let c=0;c<stackCount;c++)shadow(stackX(c),774,Math.max(plateRX*1.35,45),22);
  x.save();x.beginPath();x.rect(60,190,960,610);x.clip();
  for(let i=bank;i<plates.length;i++){
    const p=plates[i],n=i-bank,c=data.colors[p.part]||'#888888',cx=stackX(Math.floor(n/10)),end=plateStackTop(plates,i,bank,unit,19,760),h=19*Math.min(1,p.kg/unit);
    const age=animated?frame.time-n*plateStagger(plates.length-bank):1e6;if(age<0)continue;
    let cy=end,angle=0;
    if(age<340){const v=age/340;cy=155+(end-155)*v*v;angle=(i%2?-1:1)*.28*(1-v*.6);}
    else{total=p.end;const v=Math.min(1,(age-340)/110);cy=end-7*Math.sin(v*Math.PI)*(1-v);angle=(i%2?-1:1)*.035*Math.sin(v*Math.PI*2)*(1-v);}
    x.save();x.translate(cx,cy);x.rotate(angle);x.translate(-cx,-cy);
    x.fillStyle=shade(c,.7);x.beginPath();x.ellipse(cx,cy+h,plateRX,20,0,0,Math.PI*2);x.fill();x.fillRect(cx-plateRX,cy,plateRX*2,h);
    x.fillStyle=c;x.beginPath();x.ellipse(cx,cy,plateRX,20,0,0,Math.PI*2);x.fill();
    x.fillStyle=shade(c,.42);x.beginPath();x.ellipse(cx,cy,Math.min(13,plateRX*.15),6,0,0,Math.PI*2);x.fill();
    x.restore();
    if(frame.dust!==false&&age>=340&&age<680){const v=(age-340)/340;for(const d of [-1,1])shadow(cx+d*(plateRX*.74+v*36),end+4-v*15,15+v*35,6+v*12);}
  }
  x.restore();
  if(!frame.mascot)shadow(891,778,80,13);x.drawImage(frame.mascot||mascot,783,659,216,132);
  const shown=animated?Math.round(data.unit==='lb'?total*LB:total).toLocaleString():data.total;
  x.font='700 112px '+sans;const numberWidth=x.measureText(shown).width;
  x.font='400 34px '+mono;const unitText=data.unit+' moved',unitWidth=x.measureText(unitText).width;
  const left=(1080-numberWidth-unitWidth-23)/2;
  x.textAlign='left';x.fillStyle=data.ink;x.font='700 112px '+sans;x.fillText(shown,left,915);
  x.font='400 34px '+mono;x.fillStyle=data.muted;x.fillText(unitText,left+numberWidth+23,915);
  text(`${m.sets} set${m.sets===1?'':'s'} · ${m.exercises} exercise${m.exercises===1?'':'s'}`,982,'500 30px '+mono,data.muted);
  // Wrap the legend rather than shrinking names when more parts are present.
  const parts=[...new Set(plates.map(p=>p.part||'Other'))],rows=[[]];let width=0;x.font='400 25px '+mono;
  for(const p of parts){const w=x.measureText(p).width+48;if(width+w>900){rows.push([]);width=0;}rows.at(-1).push({p,w});width+=w;}
  /* v4.5.18: the legend is lifted so its LAST row clears the footer rule, which
     moved up 40px. Four rows of parts used to fit under a 1180 rule and would now
     sit on top of a 1140 one; anchoring the block to the rule instead of to a
     fixed 1030 keeps any number of rows clear of it. */
  const legendBase=Math.min(1030,SHARE_RULE_Y-18-(rows.length-1)*37);
  rows.forEach((row,r)=>{let left=(1080-row.reduce((s,p)=>s+p.w,0))/2;for(const {p,w} of row){x.fillStyle=data.colors[p]||data.muted;x.beginPath();x.arc(left+7,legendBase+r*37,7,0,Math.PI*2);x.fill();x.fillStyle=data.muted;x.textAlign='left';x.fillText(p,left+24,legendBase+8+r*37);left+=w;}});
  drawShareFooter(x,data,sans);
  return cv;
}
let plateExportCleanup=()=>{};
function bindPlateExport(data,mascot,module,videoModule){
  const current=_repCv,ov=repOvEl(),img=ov.querySelector('#repImg'),share=ov.querySelector('#repDo');
  const row=document.createElement('div');row.className='plate-export-options';
  row.innerHTML='<button type="button" class="btn ghost" data-format="image">Image</button><button type="button" class="btn ghost" data-format="mp4">Video · MP4</button><button type="button" class="btn ghost" data-format="gif">GIF</button><span role="status" aria-live="polite"></span>';
  const video=document.createElement('video');video.className='plate-export-video';video.controls=true;video.muted=true;video.loop=true;video.playsInline=true;video.hidden=true;video.setAttribute('aria-label','Workout video preview');
  ov.insertBefore(row,img);img.after(video);let controller=null,closed=false;const blobs={},urls={};
  const buttons=[...row.querySelectorAll('button')],status=row.querySelector('[role="status"]'),supported=!!videoModule.mp4Type();
  row.querySelector('[data-format="mp4"]').disabled=!supported;
  function select(format){buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.format===format)));}
  function reset(){controller?.abort();controller=null;current.gifBlob=null;current.videoBlob=null;share.disabled=false;video.pause();video.hidden=true;img.hidden=false;}
  function image(){reset();img.src=current.cv.toDataURL();share.textContent='Share image';select('image');status.textContent='';}
  function preview(format){
    const blob=blobs[format];urls[format] ||= URL.createObjectURL(blob);share.disabled=false;select(format);status.textContent='';
    if(format==='mp4'){current.videoBlob=blob;img.hidden=true;video.hidden=false;video.src=urls[format];video.play().catch(()=>{});share.textContent='Share video';}
    else{current.gifBlob=blob;img.src=urls[format];share.textContent='Share GIF';}
  }
  async function generate(format,opts){
    reset();select(format);if(blobs[format]){preview(format);return;}
    const task=new AbortController();controller=task;share.disabled=true;share.textContent='Preparing…';status.textContent=format==='mp4'?'Keep this screen open · preparing video…':'Preparing GIF…';
    try{
      const create=format==='mp4'?videoModule.createPlateVideo:module.createPlateGif;
      const result=await create({signal:task.signal,dark:data.dark,onProgress:n=>{if(controller===task)status.textContent=(format==='mp4'?'Preparing video · ':'Preparing GIF · ')+n+'%';},render:(time,canvas,motion)=>drawPlateShare(data,mascot,{time,canvas,mascot:motion,dust:format!=='mp4'})});
      if(closed||task.signal.aborted||_repCv!==current)return;blobs[format]=result;if(opts&&opts.keepSelection){status.textContent='';}else preview(format);
    }catch(e){if(!task.signal.aborted){image();status.textContent=format==='mp4'?'Video unavailable. Try again with this screen open, or choose GIF.':'GIF unavailable. You can still share the image.';}}
    finally{if(controller===task)controller=null;}
  }
  buttons.forEach(b=>b.onclick=()=>b.dataset.format==='image'?image():generate(b.dataset.format));
  plateExportCleanup=()=>{closed=true;reset();Object.values(urls).forEach(u=>URL.revokeObjectURL(u));video.removeAttribute('src');video.load();video.remove();row.remove();share.textContent='Share';};
  /* v4.5.3: THE IMAGE STAYS SELECTED. It opened on the image and then started
     the MP4, and generate() calls preview() when it finishes -- which selects
     the format it just built. So the sheet always ended up on Video, and the
     44% progress the maker saw was the thing stealing his selection.
     The MP4 is still prepared in the background, so choosing it is instant;
     it just no longer takes the selection it was never given. */
  image();
  if(supported) generate('mp4',{keepSelection:true});
  else status.textContent='MP4 is unavailable in this browser. Image and GIF are available.';
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
