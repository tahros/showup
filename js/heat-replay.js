/* Attendance: Today pulse → reverse chronological reveal → whole-history view.
   Presentation only. No saved-data, Rest-card or header changes. UTC day indices
   avoid DST gaps; training dates are deduplicated before counting. The on-screen
   replay and animated exports share one deterministic camera and renderer.
   Oldest-first layouts adapt to 1–10 years; longer records use balanced cards.
   Still-image sharing uses the same composition as the final replay frame,
   with no shimmer in the static export. Blue labels
   always count the highlighted days; a filtered lifetime total stays neutral.
   Share branding uses the approved 2026-10-01 Lifted P Trio + Pip lockup. */
(()=>{
'use strict';
const DAY=86400000, END=14000, PULSE=2660, MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),mix=(a,b,p)=>a+(b-a)*p,ease=p=>{p=clamp(p);return p*p*p*(p*(p*6-15)+10);};
const iso=n=>new Date(n*DAY).toISOString().slice(0,10),stamp=s=>Math.floor(Date.parse(s+'T00:00:00Z')/DAY);
const valid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(stamp(s))&&iso(stamp(s))===s;
const weekday=n=>new Date(n*DAY).getUTCDay(),year=n=>new Date(Math.round(n)*DAY).getUTCFullYear();
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const choices=['All workouts','Chest','Back','Shoulder','Legs','Biceps','Triceps','Sixpack','Run'];
const dayCount=n=>n+' '+(n===1?'day':'days');
let focus='All workouts',motion='Full journey',live=null,historyPage=0;
function model(){
 const end=stamp(todayISO),records=allDays(),dates=[...workoutDates()].filter(d=>valid(d)&&stamp(d)<=end).sort();
 const trained=new Set(dates.map(stamp)),start=dates.length?stamp(dates[0]):end,dow=weekStartDow();
 const firstWeek=start-(weekday(start)-dow+7)%7,parts=new Map();
 for(const d of dates){const set=new Set();for(const r of records[d]||[]){if(r.part==='Run'){if(r.ex==='Run')set.add('Run');}else if(r.part)set.add(r.part);}parts.set(stamp(d),set);}
 const years=[];for(let y=year(start);y<=year(end);y++)years.push(y);
 const days=[];for(let n=start;n<=end;n++)days.push({n,on:trained.has(n),parts:parts.get(n)||new Set(),col:(weekday(n)-dow+7)%7,row:Math.floor((n-firstWeek)/7)});
 return {start,end,firstWeek,dow,years,days,trained,total:trained.size,parts,dates,name:String(DB.settings?.name||'').trim()};
}
const matches=(d,part)=>part==='All workouts'||d.parts.has(part);
// At most ten years on a card. Balance the groups: 11 -> 6+5, 21 -> 7+7+7.
// These are views over real dates, never new saved records or generated data.
function pages(M){
 const count=Math.ceil(M.years.length/10),size=Math.floor(M.years.length/count),extra=M.years.length%count,out=[];let offset=0;
 for(let i=0;i<count;i++){const years=M.years.slice(offset,offset+size+(i<extra?1:0));offset+=years.length;let days=M.days.filter(d=>year(d.n)>=years[0]&&year(d.n)<=years.at(-1));const start=days[0].n,end=days.at(-1).n,firstWeek=start-(weekday(start)-M.dow+7)%7,trained=new Set(days.filter(d=>d.on).map(d=>d.n));days=days.map(d=>({...d,row:Math.floor((d.n-firstWeek)/7)}));out.push({...M,start,end,firstWeek,years,days,trained,total:trained.size,dates:M.dates.filter(d=>stamp(d)>=start&&stamp(d)<=end),page:i,pageCount:count,lifetime:M.total,actualToday:M.end});}
 return out;
}
const currentModel=()=>{const all=pages(model());historyPage=clamp(historyPage,0,all.length-1);return all[historyPage];};
function phase(M,time,mode='Full journey'){
 const t=clamp(time,0,END),pulseOnly=mode==='Today pulse',off=mode==='Off';
 // Fractional dates drive the camera; only the visible date label is rounded.
 const cursor=off?M.start:pulseOnly?M.end:mix(M.end,M.start,ease((t/END-.19)/.43));
 const overview=off?1:pulseOnly?0:ease((t/END-.63)/.37),pull=off?1:pulseOnly?0:ease((t/END-.61)/.24);
 // A gentle inhale/exhale at a fixed anchor: no sideways trip or size snap.
 const pulse=off?0:Math.sin(Math.PI*ease(t/PULSE))**2,zoom=1+.65*pulse;
 const revealed=d=>off||pulseOnly||d.n>=cursor;
 return {t,cursor,overview,pull,pulse,zoom,mode,count:M.days.filter(d=>d.on&&revealed(d)).length,focused:part=>M.days.filter(d=>d.on&&revealed(d)&&matches(d,part)).length,revealed};
}
function palette(){const c=getComputedStyle(document.documentElement),get=(k,f)=>c.getPropertyValue(k).trim()||f;return {surface:get('--surface','#fff'),ink:get('--chalk','#222'),muted:get('--muted','#777'),empty:get('--surface2','#f3f3f3'),blue:document.documentElement.dataset.theme==='dark'?'#7188ff':'#3049dc',line:get('--line','#ddd')};}
const layouts=new WeakMap();
function atlas(M){
 if(layouts.has(M))return layouts.get(M);
 const n=M.years.length,points=new Map(),labels=[],background=[],rules=[],names=['Calendar','Diptych','Seasons','Quadrants','Ledger','Gallery','Spotlight','Facing pages','Atlas','Decade'];
 const byYear=new Map(M.years.map(y=>[y,M.days.filter(d=>year(d.n)===y)])),yearOf=d=>year(d.n),monthOf=d=>new Date(d.n*DAY).getUTCMonth();
 const label=(text,x,y,size=20,kind='month')=>labels.push({text:String(text),x,y,size,kind});
 const put=(d,x,y,s,group,number=false)=>points.set(d.n,{x,y,w:s,h:s,group,number});
 const head=(y,x,y0)=>label(y,x,y0,32,'year');
 function month(y,m,x,y0,w,h,number=false,weekdays=false){const top=weekdays?44:26,step=Math.min(w/7,(h-top)/6),s=step*.80;label(MONTHS[m],x,y0,19);if(weekdays)for(let i=0;i<7;i++)label(['S','M','T','W','T','F','S'][(i+M.dow)%7],x+i*step,y0+24,12,'weekday');const first=stamp(y+'-'+String(m+1).padStart(2,'0')+'-01'),offset=(weekday(first)-M.dow+7)%7,days=new Date(Date.UTC(y,m+1,0)).getUTCDate();for(let i=0;i<days;i++){const k=offset+i;if(first+i<M.start||first+i>M.end)background.push({x:x+k%7*step,y:y0+top+Math.floor(k/7)*step,w:s,h:s,number:number?i+1:0});}for(const d of byYear.get(y)||[]){if(monthOf(d)!==m)continue;const k=offset+new Date(d.n*DAY).getUTCDate()-1;put(d,x+k%7*step,y0+top+Math.floor(k/7)*step,s,y+'-'+(n===1?m:n<=3?Math.floor(m/3):'year'),number);}}
 function monthly(y,x,y0,w,h,cols,number=false,weekdays=false){const gap=20,cw=(w-(cols-1)*gap)/cols,ch=h/(12/cols);for(let m=0;m<12;m++)month(y,m,x+m%cols*(cw+gap),y0+Math.floor(m/cols)*ch,cw,ch-14,number,weekdays);}
 function ribbon(y,x,y0,w,initials=false,showLabels=true){const start=stamp(y+'-01-01'),offset=(weekday(start)-M.dow+7)%7,len=stamp((y+1)+'-01-01')-start,step=w/Math.ceil((len+offset)/7);if(showLabels)for(let m=0;m<12;m++){const first=stamp(y+'-'+String(m+1).padStart(2,'0')+'-01'),col=Math.floor((first-start+offset)/7);if(initials||m%2===0)label(initials?MONTHS[m][0]:MONTHS[m],x+col*step,y0-26,16);}for(const d of byYear.get(y)||[]){const col=Math.floor((d.n-start+offset)/7);put(d,x+col*step,y0+d.col*step,step*.79,y);}}
 function matrix(y,x,y0,w,h,small=false){const left=small?25:28,step=(w-left)/31,sy=h/12,s=Math.min(step,sy)*.8;for(let m=0;m<12;m++)label(MONTHS[m][0],x,y0+m*sy,small?14:17);for(const d of byYear.get(y)||[])put(d,x+left+(new Date(d.n*DAY).getUTCDate()-1)*step,y0+monthOf(d)*sy,s,y);}
 if(n===1)monthly(M.years[0],0,0,948,790,4,true,true);
 if(n===2)M.years.forEach((y,i)=>{const x=i*502;head(y,x,0);monthly(y,x,60,446,730,3,false,true);});
 if(n===3)M.years.forEach((y,i)=>{const x=i*326;head(y,x,0);for(let q=0;q<4;q++){const yy=60+q*181;label('Q'+(q+1),x,yy,15);for(let m=0;m<3;m++)month(y,q*3+m,x+m*101,yy+28,90,136);}});
 if(n===4)M.years.forEach((y,i)=>{const x=i%2*502,yy=Math.floor(i/2)*405;head(y,x,yy);matrix(y,x,yy+58,446,310);});
 if(n===5)M.years.forEach((y,i)=>{const yy=i*158;head(y,0,yy+52);ribbon(y,162,yy+34,786,true);});
 if(n===6)M.years.forEach((y,i)=>{const x=i%3*326,yy=Math.floor(i/3)*405;head(y,x,yy);for(let half=0;half<2;half++){const xx=x+half*100,start=stamp(y+(half?'-07-01':'-01-01')),offset=(weekday(start)-M.dow+7)%7;label(half?'Jul–Dec':'Jan–Jun',xx,yy+43,17);for(const d of byYear.get(y)||[])if(Math.floor(monthOf(d)/6)===half)put(d,xx+d.col*10.2,yy+75+Math.floor((d.n-start+offset)/7)*10.2,8.3,y+'-'+half);}});
 if(n===7){const latest=M.years.at(-1);head(latest,0,0);monthly(latest,0,54,948,360,6,false,true);M.years.slice(0,-1).forEach((y,i)=>{const x=i%2*502,yy=449+Math.floor(i/2)*113;head(y,x,yy);ribbon(y,x,yy+43,446,false,false);});}
 if(n===8)for(let chapter=0;chapter<2;chapter++)M.years.slice(chapter*4,chapter*4+4).forEach((y,i)=>{const x=chapter*502,yy=i*198;head(y,x,yy);ribbon(y,x,yy+69,446);});
 if(n===9)M.years.forEach((y,i)=>{const x=i%3*326,yy=Math.floor(i/3)*267;head(y,x,yy);matrix(y,x,yy+56,296,188,true);});
 if(n===10)M.years.forEach((y,i)=>{const x=i%5*194,yy=Math.floor(i/5)*405;head(y,x,yy);for(let m=0;m<12;m++)label(MONTHS[m][0],x+m*12.2,yy+45,11);for(const d of byYear.get(y)||[])put(d,x+monthOf(d)*12.2,yy+70+(new Date(d.n*DAY).getUTCDate()-1)*9.1,7.5,y);});
 // A full-model diagnostic can exceed ten years. The UI/export use pages();
 // preserve every date here as vertically stacked, balanced page compositions.
 if(n>10){const groups=pages(M);groups.forEach((part,i)=>{const A=atlas(part),sy=1/groups.length;for(const [key,r]of A.points)points.set(key,{...r,y:(i*790+r.y)*sy,h:r.h*sy,group:i+':'+r.group});for(const l of A.labels)labels.push({...l,y:(i*790+l.y)*sy,size:l.size*sy});});}
 const groups=[];for(const d of M.days){const r=points.get(d.n);let g=groups.at(-1);if(!g||g.key!==r.group){g={key:r.group,start:d.n,end:d.n,x:r.x,y:r.y,right:r.x+r.w,bottom:r.y+r.h};groups.push(g);}g.end=d.n;g.x=Math.min(g.x,r.x);g.y=Math.min(g.y,r.y);g.right=Math.max(g.right,r.x+r.w);g.bottom=Math.max(g.bottom,r.y+r.h);}
 const A={points,labels,background,rules,groups,name:n<=10?names[n-1]:'Paged atlas'};layouts.set(M,A);return A;
}
function geometry(M,w,h,exported=false){
 const scale=exported?w/340:1,reserve=exported?0:84,A=atlas(M),sx=w/948,sy=(h-reserve)/790,cols=M.years.length===6?3:Math.min(M.years.length,5),bands=Math.ceil(M.years.length/cols),gap=10*scale,cw=(w-gap*(cols-1))/cols,bh=(h-reserve)/bands,step=sy*12,unit=Math.min(sx,sy)*10;
 const tw=Math.min(164*scale,w*.57),left=w-tw,pitch=16*scale,cell=Math.min(12*scale,(tw-30*scale)/7-3*scale),tx=left+28*scale;
 function timeline(d,cursor){const cr=(cursor-M.firstWeek)/7,max=Math.max(0,(Math.floor((M.end-M.firstWeek)/7)+1)*pitch-h*.72),scroll=clamp(cr*pitch-h*.68,0,max);return {x:tx+d.col*(tw-28*scale)/7,y:d.row*pitch-scroll+4*scale,w:cell,h:cell};}
 function overview(d){const r=A.points.get(d.n),s=Math.min(r.w*sx,r.h*sy);return {x:r.x*sx,y:reserve+r.y*sy,w:s,h:s};}
 let lastPhase,lastCamera;
 function camera(P){
  if(lastPhase===P)return lastCamera;
  const result=computeCamera(P);lastPhase=P;lastCamera=result;return result;
 }
 function computeCamera(P){
  if(P.overview===1||P.mode==='Off')return {z:1,x:0,y:0};
  const today=overview(M.days.at(-1)),center={x:w/2,y:reserve+(h-reserve)/2};
  const shot=g=>{const bw=(g.right-g.x)*sx,bh=(g.bottom-g.y)*sy;return {x:(g.x+g.right)/2*sx,y:reserve+(g.y+g.bottom)/2*sy,z:clamp(Math.min(w*.82/Math.max(bw,1),(h-reserve)*.76/Math.max(bh,1)),1,7)};};
  let gi=A.groups.findIndex(g=>P.cursor<=g.end+.999&&P.cursor>=g.start);if(gi<0)gi=0;const group=A.groups[gi],a=shot(group),b=shot(A.groups[Math.max(0,gi-1)]),blend=gi?ease(1-(P.cursor-group.start)/((group.end-group.start+1)*.45)):0;
  const z=mix(a.z,b.z,blend),cx=mix(a.x,b.x,blend),cy=mix(a.y,b.y,blend),intro=P.mode==='Today pulse'?0:ease((P.t-PULSE)/700),close=Math.min(12,22*scale/Math.max(1,today.w));
  const zoom=mix(close,z,intro),anchorX=mix(today.x+today.w/2,cx,intro),anchorY=mix(today.y+today.h/2,cy,intro),final=P.overview;
  return {z:mix(zoom,1,final),x:mix(center.x-anchorX*zoom,0,final),y:mix(center.y-anchorY*zoom,0,final)};
 }
 function position(d,P){
  const b=overview(d),cam=camera(P),r={x:b.x*cam.z+cam.x,y:b.y*cam.z+cam.y,w:b.w*cam.z,h:b.h*cam.z};
  if(d.n===M.end&&P.pulse){const extra=r.w*(P.zoom-1);r.x-=extra/2;r.y-=extra/2;r.w+=extra;r.h+=extra;}
  return r;
 }
 return {timeline,overview,position,camera,atlas:A,sx,sy,cols,bands,cw,bh,step,left,tw,tx,reserve,scale,gap,unit};
}
function round(x,b,r){x.beginPath();x.roundRect(b.x,b.y,b.w,b.h,Math.min(r,b.w/2,b.h/2));}
// One broad, feathered light field for the entire calendar. Base/mask bitmaps
// are reused during the final hold: no per-day animation or per-day sine math.
const frames=new WeakMap();
const sweepAt=ms=>((ms%6000)+6000)%6000/6000;
const corner=r=>Math.min(r.w,r.h)*.3;
function drawBase(M,x,mask,w,h,P,G,part,mode,col){
 const today=G.position(M.days[M.days.length-1],P),cx=today.x+today.w/2,cy=today.y+today.h/2,animated=mode!=='Off';
 x.save();x.beginPath();x.rect(0,G.reserve,w,h-G.reserve);x.clip();
 mask.save();mask.beginPath();mask.rect(0,G.reserve,w,h-G.reserve);mask.clip();
 // Calendar scaffolding before the first log / after today is unfilled. It
 // never enters the attendance model, counter, body-part mask or saved data.
 const camera=G.camera(P);
 for(const b of G.atlas.background){const size=Math.min(b.w*G.sx,b.h*G.sy)*camera.z,r={x:b.x*G.sx*camera.z+camera.x,y:(G.reserve+b.y*G.sy)*camera.z+camera.y,w:size,h:size};if(r.y+r.h<G.reserve||r.y>h||r.x+r.w<0||r.x>w)continue;x.globalAlpha=.45;x.fillStyle=col.empty;round(x,r,corner(r));x.fill();if(G.reserve===0&&b.number&&r.w>=13){x.fillStyle=col.muted;x.font=(r.w*.58)+'px "IBM Plex Mono",monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(String(b.number),r.x+r.w/2,r.y+r.h/2);}x.globalAlpha=1;}
 for(const d of M.days){const r=G.position(d,P),p=P.overview;
  if(r.y+r.h<G.reserve||r.y>h||r.x+r.w<0||r.x>w)continue;
  const filled=d.on&&P.revealed(d),alpha=(filled&&!matches(d,part)?.24:1)*clamp(Math.min((r.y+r.h)/(9*G.scale),(h-r.y)/(9*G.scale)));x.globalAlpha=alpha;x.fillStyle=filled?col.blue:col.empty;round(x,r,corner(r));x.fill();
  if(filled&&matches(d,part)){mask.globalAlpha=alpha;round(mask,r,corner(r));mask.fill();}x.globalAlpha=1;
  if(G.reserve===0&&G.atlas.points.get(d.n).number&&r.w>=13){x.fillStyle=filled?'#fff':col.muted;x.font=(r.w*.58)+'px "IBM Plex Mono",monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(String(new Date(d.n*DAY).getUTCDate()),r.x+r.w/2,r.y+r.h/2);}
  if(d.n===M.end){x.strokeStyle=col.blue;x.lineWidth=mix(1.4,1,p);round(x,{x:r.x-2,y:r.y-2,w:r.w+4,h:r.h+4},corner(r)+2);x.stroke();}
 }
 // A soft bloom and two low-contrast rings share the square's fixed centre.
 // The available edge distance limits the rings; the bloom has no hard edge.
 if(P.t<PULSE&&animated){const p=P.t/PULSE,s=G.scale;
  x.save();const radius=(18+28*P.pulse)*s,halo=x.createRadialGradient(cx,cy,0,cx,cy,radius);halo.addColorStop(0,col.blue+'30');halo.addColorStop(.35,col.blue+'18');halo.addColorStop(1,col.blue+'00');x.fillStyle=halo;x.globalAlpha=P.pulse;x.fillRect(cx-radius,cy-radius,2*radius,2*radius);
  const limit=Math.max(today.w*.6,Math.min(42*s,cx-2*s,w-cx-2*s,cy-2*s,h-cy-2*s));
  for(let i=0;i<2;i++){const q=clamp((p-i*.16)/(.9-i*.16)),radius=mix(today.w*.55,limit,ease(q));x.globalAlpha=Math.sin(Math.PI*q)**2*(.22-i*.05);x.strokeStyle=col.blue;x.lineWidth=1.1*s;x.beginPath();x.arc(cx,cy,radius,0,Math.PI*2);x.stroke();}x.restore();
 }
 const cam=G.camera(P);x.textBaseline='top';x.textAlign='left';x.fillStyle=col.muted;
 for(const l of G.atlas.labels){const X=l.x*G.sx*cam.z+cam.x,Y=(G.reserve+l.y*G.sy)*cam.z+cam.y,base=G.reserve?Math.max(l.kind==='year'?11:6,l.size*G.sx):l.size*G.sx,size=base*cam.z;if(Y<G.reserve||Y+size>h||X<0||X>w)continue;x.font=size+'px "IBM Plex Mono",monospace';x.fillText(l.text,X,Y);}
 mask.restore();x.restore();
}
function draw(M,x,w,h,time,part,mode,col,clear=true,exported=false,ambient=time){
 const t=clamp(time,0,END),ratio=Math.min(2,x.getTransform?.().a||1),key=[w,h,t,part,mode,col.blue,col.empty,col.muted,exported,ratio].join('|');
 let F=frames.get(x);
 if(!F||F.M!==M||F.key!==key){
  const builds=(F?.builds||0)+1;
  if(!F||F.w!==w||F.h!==h||F.ratio!==ratio){const layer=()=>{const c=document.createElement('canvas');c.width=Math.ceil(w*ratio);c.height=Math.ceil(h*ratio);const ctx=c.getContext('2d',{willReadFrequently:exported});ctx.setTransform(ratio,0,0,ratio,0,0);return {c,x:ctx};};F={base:layer(),mask:layer(),light:layer()};}
  Object.assign(F,{M,key,w,h,ratio,builds,P:phase(M,t,mode)});F.base.x.clearRect(0,0,w,h);F.mask.x.clearRect(0,0,w,h);F.mask.x.fillStyle='#fff';
  drawBase(M,F.base.x,F.mask.x,w,h,F.P,geometry(M,w,h,exported),part,mode,col);frames.set(x,F);
 }
 if(clear)x.clearRect(0,0,w,h);x.drawImage(F.base.c,0,0,w,h);
 if(mode!=='Off'){
  const lx=F.light.x,period=w*1.6,left=-period+sweepAt(ambient)*period,g=lx.createLinearGradient(left,0,left+3*period,0);
  // Repeating broad lobes join with identical endpoints, so the sheet never
  // goes dark or snaps back at the loop boundary.
  for(let i=0;i<=12;i++)g.addColorStop(i/12,i%4===2?'#ffffff50':i%2?'#ffffff22':'#ffffff0e');
  lx.clearRect(0,0,w,h);lx.globalCompositeOperation='source-over';lx.fillStyle=g;lx.fillRect(0,0,w,h);lx.globalCompositeOperation='destination-in';lx.drawImage(F.mask.c,0,0,w,h);lx.globalCompositeOperation='source-over';x.drawImage(F.light.c,0,0,w,h);
 }
 return F.P;
}
const sourceSection=currentRhythmSection;
currentRhythmSection=function(inverse){
 if(inverse)return sourceSection(inverse);
 const M=currentModel(),part=choices.includes(focus)?focus:'All workouts';
 return `<h2 id="secDays">You keep showing up${hActs('rhythm','One square per day. Blue means you trained. Scroll through the years, or replay your history from today. Body-part focus dims other training days without removing them.','About your attendance')}</h2>
 <div class="card crcard attendance-card" data-overview="false" data-focused="${part!=='All workouts'}">
  <div class="at-owner">${hesc(M.name)}</div>${M.pageCount>1?`<div class="at-pages" aria-label="History cards"><button type="button" data-at-page="${M.page-1}"${M.page===0?' disabled':''} aria-label="Previous history card">‹</button><span>Card ${M.page+1} of ${M.pageCount} · ${M.years[0]}–${M.years.at(-1)}</span><button type="button" data-at-page="${M.page+1}"${M.page===M.pageCount-1?' disabled':''} aria-label="Next history card">›</button></div>`:''}
  <div class="at-parts" role="group" aria-label="Highlight body part">${choices.map(p=>`<button type="button" data-attendance-part="${p}" aria-pressed="${p===part}">${p==='All workouts'?'All':p}</button>`).join('')}</div>
  <div class="at-composition"><div class="at-story"><div class="at-total">${fmt(M.total)}</div><div class="at-unit">days in</div><div class="at-focus"${part==='All workouts'?' hidden':''}><b><span class="at-focus-count"></span><span class="at-focus-days"></span></b><span class="at-focus-part">${hesc(part)}</span></div><div class="at-streak">streak ${dayCount(currentStreak())}<br>best ${dayCount(longestStreak())}</div></div>
   <div class="at-timeline"><label class="at-year-label"><span class="sr-only">Calendar year</span><select class="at-year">${M.years.map(y=>`<option value="${y}">${y}</option>`).join('')}</select></label><div class="at-weekdays" aria-hidden="true">${Array.from({length:7},(_,i)=>'<span>'+['S','M','T','W','T','F','S'][(i+M.dow)%7]+'</span>').join('')}</div><div class="at-scroll" tabindex="0" aria-label="Training calendar. Scroll vertically through your history."><div class="at-calendar"></div></div></div>
   <div class="at-overview" role="img"></div>
  </div>
  <div class="at-date"><strong>${year(M.end)}</strong><span></span></div><div class="at-range" hidden><span></span><button type="button" class="at-return">Timeline ↗</button></div>
  <div class="at-actions"><button type="button" class="heat-replay">↻ <span>Replay</span></button><button type="button" class="heat-share">${ICO_SHARE}<span>Share</span></button></div>
  <div class="at-options"><label>Animation<select class="at-motion">${['Full journey','Today pulse','Off'].map(p=>`<option value="${p}"${p===motion?' selected':''}>${p==='Today pulse'&&M.end!==M.actualToday?'Latest day pulse':p}</option>`).join('')}</select></label></div><div class="at-status sr-only" role="status" aria-live="polite"></div>
 </div>`;
};
const renderBefore=renderStats;
renderStats=function(){document.querySelectorAll('.attendance-card').forEach(c=>c._attendance?.cleanup?.());renderBefore();document.querySelectorAll('.attendance-card').forEach(bind);};
function bind(card){
 const M=currentModel(),cal=card.querySelector('.at-calendar'),scroller=card.querySelector('.at-scroll'),picker=card.querySelector('.at-year'),overview=card.querySelector('.at-overview');
 const state={M,part:focus,mode:motion,card,scroller,overview,cols:[],mini:[],scroll:0};card._attendance=state;
 card.dataset.animation=state.mode;
 const visibility=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{card.dataset.visible=String(entries[0].isIntersecting);if(!card.isConnected)state.cleanup();}):null;
 visibility?.observe(card);
 const weeks=Math.floor((M.end-M.firstWeek)/7)+1;cal.style.height=(weeks*16+8)+'px';
 const frag=document.createDocumentFragment();let prev=-1;
 for(const d of M.days){const el=document.createElement('span');el.className='at-cell'+(d.on?' on':'')+(d.n===M.end?' today':'');el.dataset.date=iso(d.n);el.title=iso(d.n)+(d.on?' · trained':' · no workout logged');el.setAttribute('aria-label',el.title);el.style.cssText=`left:calc(28px + ${d.col} * (100% - 28px) / 7);top:${d.row*16+4}px`;frag.append(el);state.cols.push([el,d]);const month=new Date(d.n*DAY).getUTCMonth();if((d.col===0||d.n===M.start)&&month!==prev){const label=document.createElement('small');label.className='at-month';label.style.top=(d.row*16+4)+'px';label.textContent=MONTHS[month];frag.append(label);prev=month;}}
 cal.append(frag);
 for(const b of atlas(M).background){const el=document.createElement('span');el.className='at-blank';el.setAttribute('aria-hidden','true');overview.append(el);}
 for(const l of atlas(M).labels){const el=document.createElement('span');el.className='at-atlas-label';el.dataset.kind=l.kind;el.textContent=l.text;overview.append(el);}
 for(const d of M.days){const el=document.createElement('span');el.className='at-mini'+(d.on?' on':'')+(d.n===M.end?' today':'');el.title=iso(d.n)+(d.on?' · trained':' · no workout logged');el.setAttribute('aria-label',el.title);overview.append(el);state.mini.push([el,d]);}
 overview.setAttribute('aria-label',`${M.total} training days, ${iso(M.start)} to ${iso(M.end)}. ${atlas(M).name}, oldest year first. One square per day.`);
 card.querySelector('.at-range span').textContent=range(M);
 card.querySelectorAll('[data-at-page]').forEach(button=>button.onclick=()=>{state.cleanup();historyPage=+button.dataset.atPage;const template=document.createElement('template');template.innerHTML=currentRhythmSection(false);const next=template.content.querySelector('.attendance-card');card.replaceWith(next);bind(next);finishView(next._attendance);});
 function readDate(n,animate=false){const el=card.querySelector('.at-date strong'),y=String(year(n));if(el.textContent!==y){el.textContent=y;if(animate&&!reduced()&&el.animate)el.animate([{opacity:.3,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:450});}card.querySelector('.at-date span').textContent=dateLabel(n);picker.value=y;card.dataset.currentDate=iso(n);}
 state.readDate=readDate;
 const comp=card.querySelector('.at-composition'),sheen=document.createElement('div');sheen.className='at-group-sheen';sheen.setAttribute('aria-hidden','true');sheen.append(document.createElement('i'));comp.append(sheen);
 let maskFrame=0;
 state.refreshMask=()=>{if(maskFrame)return;maskFrame=requestAnimationFrame(()=>{maskFrame=0;if(!card.isConnected)return;const w=comp.clientWidth,h=comp.clientHeight;if(!w||!h)return;const G=geometry(M,w,h),over=card.dataset.overview==='true',cw=cal.clientWidth;
  const rects=[];for(const d of M.days){if(!d.on||!matches(d,state.part))continue;const r=over?G.overview(d):{x:card.querySelector('.at-timeline').offsetLeft+28+d.col*(cw-28)/7,y:62+d.row*16+4-scroller.scrollTop,w:Math.min(12,(cw-28)/7-3),h:12};if(r.y<(over?0:66)||r.y+r.h>h-5)continue;rects.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${corner(r)}"/>`);}
  const url=`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><g fill="white">${rects.join('')}</g></svg>`)}")`;sheen.style.maskImage=url;sheen.style.webkitMaskImage=url;
 });};
 const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>{layoutOverview(state);state.refreshMask();}):null;resizeObserver?.observe(comp);
 state.cleanup=()=>{state.scene?.dispose();visibility?.disconnect();resizeObserver?.disconnect();cancelAnimationFrame(maskFrame);};
 const focusCount=card.querySelector('.at-focus-count'),focusDays=card.querySelector('.at-focus-days');
 state.paintCount=n=>{focusCount.textContent=fmt(n);focusDays.textContent=n===1?' day':' days';};
 state.paintFocus=()=>{for(const [el,d]of [...state.cols,...state.mini])el.classList.toggle('dim',d.on&&!matches(d,state.part));card.dataset.focused=String(state.part!=='All workouts');card.querySelectorAll('.at-parts button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.attendancePart===state.part)));card.querySelector('.at-focus').hidden=state.part==='All workouts';card.querySelector('.at-focus-part').textContent=state.part;state.paintCount(M.days.filter(d=>d.on&&matches(d,state.part)).length);state.refreshMask();};state.paintFocus();
 const sync=()=>{if(live?.state===state)return;const atEnd=scroller.scrollHeight-scroller.clientHeight-scroller.scrollTop<8;readDate(state.jumpDate??(atEnd?M.end:clamp(M.firstWeek+Math.floor(scroller.scrollTop/16)*7,M.start,M.end)),true);};
 scroller.addEventListener('scroll',()=>{sync();state.refreshMask();},{passive:true});
 const stop=()=>{state.jumpDate=null;if(state.scene)state.scene.finish();};card.addEventListener('wheel',e=>{if(!e.target.closest('.at-parts'))stop();},{passive:true});card.addEventListener('pointerdown',e=>{if(!e.target.closest('.heat-replay,.at-parts'))stop();});scroller.addEventListener('touchstart',stop,{passive:true});scroller.addEventListener('keydown',stop);
 picker.onchange=()=>{const y=+picker.value;stop();timeline(state);const n=Math.max(M.start,stamp(y+'-01-01'));state.jumpDate=n;readDate(n,true);scroller.scrollTo({top:Math.floor((n-M.firstWeek)/7)*16,behavior:reduced()?'auto':'smooth'});};
 card.querySelector('.at-return').onclick=()=>{stop();timeline(state);scroller.scrollTop=scroller.scrollHeight;readDate(M.end);};
 const rail=card.querySelector('.at-parts');rail.onclick=e=>{const b=e.target.closest('button[data-attendance-part]');if(!b)return;focus=state.part=b.dataset.attendancePart;state.paintFocus();state.scene?.refresh();const left=b.offsetLeft-(rail.clientWidth-b.offsetWidth)/2;rail.scrollTo({left,behavior:reduced()?'auto':'smooth'});};
 rail.onkeydown=e=>{const buttons=[...rail.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(i<0||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?buttons.length-1:clamp(i+(e.key==='ArrowRight'?1:-1),0,buttons.length-1);buttons[n].focus({preventScroll:true});buttons[n].click();};
 card.querySelector('.at-motion').onchange=e=>{stop();motion=state.mode=e.target.value;card.dataset.animation=motion;card.querySelector('.heat-replay').disabled=motion==='Off'||!M.total;if(motion==='Off')finishView(state);};
 card.querySelector('.heat-replay').disabled=motion==='Off'||!M.total;
 state.readDate(M.end);requestAnimationFrame(()=>{if(card.isConnected)scroller.scrollTop=scroller.scrollHeight;});
 if(reduced()||motion==='Off')finishView(state);
}
function dateLabel(n){return new Date(Math.round(n)*DAY).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'});}
function range(M){const f=n=>new Date(n*DAY).toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});return f(M.start)+' — '+f(M.end);}
function timeline(S){S.card.dataset.overview='false';S.card.querySelector('.at-range').hidden=true;S.card.querySelector('.at-date').hidden=false;S.refreshMask?.();}
function layoutOverview(S){
 const comp=S.card.querySelector('.at-composition'),G=geometry(S.M,comp.clientWidth||320,comp.clientHeight||414);
 [...S.overview.querySelectorAll('.at-atlas-label')].forEach((el,i)=>{const l=G.atlas.labels[i];el.style.cssText=`position:absolute;left:${l.x*G.sx}px;top:${l.y*G.sy}px;font-size:${Math.max(l.kind==='year'?11:6,l.size*G.sx)}px`;});
 [...S.overview.querySelectorAll('.at-blank')].forEach((el,i)=>{const b=G.atlas.background[i],size=Math.min(b.w*G.sx,b.h*G.sy);el.style.cssText=`position:absolute;left:${b.x*G.sx}px;top:${b.y*G.sy}px;width:${size}px;height:${size}px`;});
 for(const [el,d]of S.mini){const p=G.overview(d);el.style.cssText=`position:absolute;left:${p.x}px;top:${p.y-G.reserve}px;width:${p.w}px;height:${p.h}px`;}
}
function finishView(S){S.card.dataset.overview='true';S.card.querySelector('.at-range').hidden=false;S.card.querySelector('.at-date').hidden=true;S.card.querySelector('.at-total').textContent=fmt(S.M.total);S.paintFocus();layoutOverview(S);}
function play(card){
 if(!card?._attendance)return false;if(live){const same=live.state.card===card;live.finish();if(same)return true;}
 const S=card._attendance,M=S.M;S.scene?.dispose();if(!M.total||S.mode==='Off'||reduced()){finishView(S);return false;}
 timeline(S);const comp=card.querySelector('.at-composition'),cv=document.createElement('canvas');cv.className='at-replay-canvas';cv.setAttribute('aria-hidden','true');
 let w=comp.clientWidth,h=comp.clientHeight,col=palette();const x=cv.getContext('2d');if(!x)return false;comp.append(cv);card.classList.add('at-playing');
 const label=card.querySelector('.heat-replay span'),status=card.querySelector('.at-status');label.textContent='Stop';status.textContent=M.end===M.actualToday?'Replaying training history from today.':'Replaying training history from the latest date in this card.';
 let raf=0,paused=false,visible=true,disposed=false,complete=false,elapsed=0,ambient=0,last=0,painted=-1;
 const duration=S.mode==='Today pulse'?PULSE:END;
 function paint(){
  const P=draw(M,x,w,h,elapsed,S.part,S.mode,col,true,false,ambient);
  if(painted!==elapsed){painted=elapsed;card.querySelector('.at-total').textContent=fmt(P.count);S.paintCount(P.focused(S.part));S.readDate(Math.round(P.cursor),true);card.dataset.phase=P.overview>0?'overview':elapsed<PULSE?'pulse':'rewind';card.dataset.revealed=String(P.count);card.style.setProperty('--at-story-opacity',String(1-P.overview));}
  if(complete)card.dataset.phase='complete';
 }
 // Natural completion keeps the exact same canvas and geometry alive. Only
 // the light clock continues; there is no canvas-to-DOM layout handoff.
 function settle(){complete=true;label.textContent='Replay';if(live?.state===S)live=null;card.dataset.phase='complete';if(S.mode!=='Today pulse'){card.querySelector('.at-range').hidden=false;card.querySelector('.at-date').hidden=true;}status.textContent=`${M.total} training days. ${S.mode==='Today pulse'?(M.end===M.actualToday?'Today.':'Latest date in this card.'):'Entire card shown.'}`;}
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);cv.remove();card.classList.remove('at-playing');card.style.removeProperty('--at-story-opacity');label.textContent='Replay';io?.disconnect();ro?.disconnect();themeObserver.disconnect();document.removeEventListener('visibilitychange',wake);if(live?.state===S)live=null;if(S.scene===scene)S.scene=null;}
 function finish(){dispose();if(S.mode==='Today pulse'){timeline(S);card.querySelector('.at-total').textContent=fmt(M.total);S.paintFocus();S.scroller.scrollTop=S.scroller.scrollHeight;S.readDate(M.end);}else finishView(S);card.dataset.phase='complete';}
 function tick(now){raf=0;if(!card.isConnected){dispose();return;}if(!visible||document.hidden)return;const dt=last?Math.min(50,now-last):0;last=now;ambient+=dt;if(!paused&&!complete)elapsed=Math.min(duration,elapsed+dt);paint();if(elapsed>=duration&&!complete)settle();raf=requestAnimationFrame(tick);}
 function wake(){last=0;if(!disposed&&visible&&!document.hidden&&!raf)raf=requestAnimationFrame(tick);}
 function resize(){w=comp.clientWidth;h=comp.clientHeight;const ratio=Math.min(devicePixelRatio||1,2);cv.width=Math.max(1,Math.round(w*ratio));cv.height=Math.max(1,Math.round(h*ratio));x.setTransform(ratio,0,0,ratio,0,0);paint();}
 const io=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!card.isConnected)dispose();else wake();}):null;
 const ro=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
 const themeObserver=new MutationObserver(()=>{col=palette();paint();});themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 const scene={state:S,finish,dispose,refresh(){painted=-1;paint();},seek(t){paused=true;elapsed=clamp(t,0,duration);paint();if(elapsed>=duration&&!complete)settle();wake();},get ambient(){return ambient;},get elapsed(){return elapsed;},get baseBuilds(){return frames.get(x)?.builds||0;}};
 live=S.scene=scene;document.addEventListener('visibilitychange',wake);io?.observe(comp);ro?.observe(comp);resize();wake();return true;
}
async function share(card){
 if(!card?._attendance)return;if(live)live.finish();const S=card._attendance,M=S.M,col=palette(),dark=document.documentElement.dataset.theme==='dark';
 const [gifModule,videoModule]=await Promise.all([import('./plate-gif.js'),import('./plate-video.js')]);await Promise.all([gifModule.loadExportFonts(),document.fonts.load('500 29px "IBM Plex Mono"'),document.fonts.load('400 24px "IBM Plex Mono"')]);
 const load=async src=>{const i=new Image();i.src=src;await i.decode();return i;};
 // Exact PNG companions from the approved brand kit's 02-lockups/{theme}/
 // showuppp-horizontal-1024.png. Pip and lettering stay one inseparable asset;
 // no re-typesetting, independent transforms, or canvas-filter recolouring.
 const brand=await load('assets/showuppp-lifted-lockup-'+(dark?'dark':'light')+'.png');
 const data={...col,dark,name:M.name},part=S.part,mode=reduced()?'Off':S.mode;
 const renderFor=M=>(time,canvas)=>{
  // GIF encoding repeatedly reads pixels. Start exports on the readback path
  // so the browser cannot switch rasterizers halfway through an export session.
  const cv=canvas||document.createElement('canvas');cv.width=1080;cv.height=1280;const x=cv.getContext('2d',{willReadFrequently:true}),t=Number.isFinite(time)?Math.max(0,time):END,actualMode=Number.isFinite(time)?mode:'Off',P=phase(M,t,actualMode);
  x.fillStyle=col.surface;x.fillRect(0,0,1080,1280);
  // Trim only transparent artboard padding (identical in both themes), and
  // scale uniformly. Preserve the master's proportions and visible centre.
  // This same lockup is used by still, MP4 and GIF frames.
  const brandHeight=226*260/910;
  x.drawImage(brand,52,66,910,260,70,109.5-brandHeight/2,226,brandHeight);
  const text=(s,X,Y,size,color,align='left',weight=400)=>{x.fillStyle=color;x.font=weight+' '+size+'px "ShowUp Export Plex", "IBM Plex Sans",sans-serif';x.textAlign=align;x.textBaseline='alphabetic';x.fillText(s,X,Y,align==='right'?570:940);};
  text(M.name,1010,116,27,col.muted,'right');x.fillStyle=col.line;x.fillRect(70,177,940,1);
  text(fmt(P.count),70,318,112,part==='All workouts'?col.blue:col.ink,'left',500);x.font='500 112px "ShowUp Export Plex"';const nw=x.measureText(fmt(P.count)).width;text('days in',88+nw,318,31,col.muted);
  text(M.years.length===1?String(M.years[0]):M.years[0]+' – '+M.years.at(-1),1010,292,M.years.length===1?61:32,col.muted,'right');
  if(part!=='All workouts'){
   const prefix=part+' · ',n=P.focused(part),amount=fmt(n);
   x.font='500 112px "ShowUp Export Plex"';const bottom=318+(x.measureText(fmt(P.count)).actualBoundingBoxDescent||0);x.font='500 40px "ShowUp Export Plex"';const measure=x.measureText(prefix+amount+' days'),baseline=(bottom+419)/2+((measure.actualBoundingBoxAscent||30)-(measure.actualBoundingBoxDescent||0))/2;
   text(prefix,70,baseline,40,col.ink,'left',500);const numberX=70+x.measureText(prefix).width;
   text(amount,numberX,baseline,40,col.blue,'left',500);const unitX=numberX+x.measureText(amount).width;
   text(n===1?' day':' days',unitX,baseline,40,col.ink,'left',500);
  }
  x.save();x.translate(70,419);draw(M,x,940,685,t,part,actualMode,col,false,true);x.restore();
  x.fillStyle=col.line;x.fillRect(70,1145,940,1);text(P.overview>=1?range(M):String(year(P.cursor)),70,1205,27,col.muted);text(P.overview>=1?(M.pageCount>1?`Card ${M.page+1} of ${M.pageCount} · One square. One day.`:'One square. One day.'):dateLabel(P.cursor),1010,1205,M.pageCount>1?22:27,col.muted,'right');
  return cv;
 };
 // No timestamp means the complete, still vertical overview, even when the
 // selected animation is Today pulse. Image/MP4/GIF retain one composition.
 const cards=pages(model());
 async function showPage(index){
  const M=cards[index],render=renderFor(M);
  await showCard(()=>render(),'showuppp-attendance-'+todayISO+(cards.length>1?'-'+(index+1):''),false);
  bindPlateExport(data,null,gifModule,videoModule,{render,label:'Your training history · ShowUppp and Pip',animateHold:mode!=='Off',duration:mode==='Today pulse'?PULSE:mode==='Off'?500:END});
  if(cards.length>1){const row=document.createElement('div');row.className='at-pages at-share-pages';row.innerHTML=`<button type="button"${index===0?' disabled':''} aria-label="Previous share card">‹</button><span>Card ${index+1} of ${cards.length} · ${M.years[0]}–${M.years.at(-1)}</span><button type="button"${index===cards.length-1?' disabled':''} aria-label="Next share card">›</button><button type="button" class="at-share-all">Share all images</button>`;const ov=repOvEl();ov.insertBefore(row,ov.querySelector('#repImg'));const buttons=row.querySelectorAll('button');buttons[0].onclick=()=>showPage(index-1);buttons[1].onclick=()=>showPage(index+1);buttons[2].onclick=async()=>{buttons[2].disabled=true;try{const files=[];for(const page of cards){const blob=await new Promise(resolve=>renderFor(page)().toBlob(resolve,'image/png'));if(!blob)throw Error('Empty image');files.push(new File([blob],`showuppp-attendance-${todayISO}-${page.page+1}.png`,{type:'image/png'}));}if(!await shareImageFiles(files)){for(const file of files){const a=document.createElement('a'),url=URL.createObjectURL(file);a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),4000);await new Promise(r=>setTimeout(r,300));}}}catch(e){if(e?.name!=='AbortError')toast('Could not share these images. Please try again.');}finally{buttons[2].disabled=false;}};const cleanup=plateExportCleanup;plateExportCleanup=()=>{row.remove();cleanup();};}
 }
 await showPage(clamp(S.M.page||0,0,cards.length-1));
}
async function seeAll(){document.querySelector('nav button[data-v="stats"]')?.click();let card;for(let i=0;i<30&&!card;i++){await new Promise(r=>setTimeout(r,50));card=document.querySelector('.attendance-card');}if(!card)return false;card.scrollIntoView({block:'center',behavior:reduced()?'auto':'smooth'});await new Promise(r=>setTimeout(r,reduced()?0:650));return card.isConnected&&play(card);}
document.addEventListener('click',e=>{const b=e.target.closest?.('.heat-replay,.heat-share'),card=b?.closest('.attendance-card');if(!card)return;if(b.classList.contains('heat-share')){b.disabled=true;share(card).catch(()=>toast('Could not prepare the export. Please try again.')).finally(()=>{b.disabled=false;});}else play(card);});
const mq=matchMedia('(prefers-reduced-motion: reduce)');mq.addEventListener?.('change',()=>{document.querySelectorAll('.attendance-card').forEach(c=>{c._attendance?.scene?.finish();if(mq.matches&&c._attendance)finishView(c._attendance);});});
window.addEventListener('resize',()=>{document.querySelectorAll('.attendance-card').forEach(c=>{if(c._attendance)layoutOverview(c._attendance);});});
window.heatReplay={play,share,seeAll,get live(){return live;},finish(){live?.finish();},duration:()=>END,exportEnd:END};
// Pure data/camera contract for regression checks; no saved state is exposed.
window.attendanceView={model,pages,atlas,phase,geometry,sweepAt};
})();
