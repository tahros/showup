/* Attendance: Today pulse → reverse chronological reveal → whole-history view.
   Presentation only. No saved-data, Rest-card or header changes. UTC day indices
   avoid DST gaps; training dates are deduplicated before counting. The on-screen
   replay and animated exports share one deterministic camera and renderer.
   Still-image sharing has its own horizontal year ledger; never feed that
   taller canvas to the fixed-size video/GIF encoder. */
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
let focus='All workouts',motion='Full journey',live=null;
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
function phase(M,time,mode='Full journey'){
 const t=clamp(time,0,END),pulseOnly=mode==='Today pulse',off=mode==='Off';
 // Fractional dates drive the camera; only the visible date label is rounded.
 const cursor=off?M.start:pulseOnly?M.end:mix(M.end,M.start,ease((t/END-.19)/.43));
 const overview=off?1:pulseOnly?0:ease((t/END-.63)/.37),pull=off?1:pulseOnly?0:ease((t/END-.61)/.24);
 // A gentle inhale/exhale at a fixed anchor: no sideways trip or size snap.
 const pulse=off?0:Math.sin(Math.PI*ease(t/PULSE))**2,zoom=1+.65*pulse;
 const revealed=d=>off||pulseOnly||d.n>=cursor;
 return {t,cursor,overview,pull,pulse,zoom,count:M.days.filter(d=>d.on&&revealed(d)).length,focused:part=>M.days.filter(d=>d.on&&revealed(d)&&matches(d,part)).length,revealed};
}
function palette(){const c=getComputedStyle(document.documentElement),get=(k,f)=>c.getPropertyValue(k).trim()||f;return {surface:get('--surface','#fff'),ink:get('--chalk','#222'),muted:get('--muted','#777'),empty:get('--surface2','#f3f3f3'),blue:document.documentElement.dataset.theme==='dark'?'#7188ff':'#3049dc',line:get('--line','#ddd')};}
function geometry(M,w,h,exported=false){
 const scale=exported?w/340:1,reserve=exported?0:100,cols=Math.min(6,M.years.length),bands=Math.ceil(M.years.length/cols),gap=10*scale,cw=(w-gap*(cols-1))/cols,bh=(h-reserve)/bands,step=(bh-28*scale)/54,unit=Math.min((cw-3)/7,step);
 const tw=Math.min(164*scale,w*.57),left=w-tw,pitch=16*scale,cell=Math.min(12*scale,(tw-30*scale)/7-3*scale),tx=left+28*scale;
 function timeline(d,cursor){const cr=(cursor-M.firstWeek)/7,max=Math.max(0,(Math.floor((M.end-M.firstWeek)/7)+1)*pitch-h*.72),scroll=clamp(cr*pitch-h*.68,0,max);return {x:tx+d.col*(tw-28*scale)/7,y:d.row*pitch-scroll+4*scale,w:cell,h:cell};}
 function overview(d){const yi=year(d.n)-M.years[0],first=Math.max(M.start,stamp(year(d.n)+'-01-01')),row=Math.floor((d.n-first+(weekday(first)-M.dow+7)%7)/7);return {x:(yi%cols)*(cw+gap)+(cw-unit*7)/2+d.col*unit,y:reserve+Math.floor(yi/cols)*bh+27*scale+row*step,w:Math.max(1,unit-1.5*scale),h:Math.max(1,Math.min(unit,step)-1.5*scale)};}
 function position(d,P){
  const a=timeline(d,P.cursor),b=overview(d),rows=Math.floor((M.end-M.firstWeek)/7)+1,fit=Math.min(1,(h-reserve-35*scale)/(rows*pitch)),center=left+tw/2;
  const x=mix(a.x,center+(a.x-center)*fit,P.pull),y=mix(a.y,reserve+(h-reserve)/2+(d.row-(rows-1)/2)*pitch*fit,P.pull),size=mix(cell,cell*fit,P.pull);
  const r={x:mix(x,b.x,P.overview),y:mix(y,b.y,P.overview),w:mix(size,b.w,P.overview),h:mix(size,b.h,P.overview)};
  if(d.n===M.end&&P.pulse){const extra=cell*(P.zoom-1);r.x-=extra/2;r.y-=extra/2;r.w+=extra;r.h+=extra;}
  return r;
 }
 return {timeline,overview,position,cols,bands,cw,bh,step,left,tw,tx,reserve,scale,gap,unit};
}
function round(x,b,r){x.beginPath();x.roundRect(b.x,b.y,b.w,b.h,Math.min(r,b.w/2,b.h/2));}
// One broad, feathered light field for the entire calendar. Base/mask bitmaps
// are reused during the final hold: no per-day animation or per-day sine math.
const frames=new WeakMap();
const sweepAt=ms=>((ms%6000)+6000)%6000/6000;
const corner=r=>Math.min(r.w,r.h)*.3;
function drawBase(M,x,mask,w,h,P,G,part,mode,col){
 const today=G.position(M.days[M.days.length-1],P),cx=today.x+today.w/2,cy=today.y+today.h/2,animated=mode!=='Off';
 x.save();x.beginPath();x.rect(0,0,w,h);x.clip();
 for(const d of M.days){const r=G.position(d,P),p=P.overview;
  if(r.y+r.h<0||r.y>h)continue;
  const filled=d.on&&P.revealed(d),alpha=(filled&&!matches(d,part)?.24:1)*clamp(Math.min((r.y+r.h)/(9*G.scale),(h-r.y)/(9*G.scale)));x.globalAlpha=alpha;x.fillStyle=filled?col.blue:col.empty;round(x,r,corner(r));x.fill();
  if(filled&&matches(d,part)){mask.globalAlpha=alpha;round(mask,r,corner(r));mask.fill();}x.globalAlpha=1;
  if(d.n===M.end){x.strokeStyle=col.blue;x.lineWidth=mix(1.4,1,p);round(x,{x:r.x-2,y:r.y-2,w:r.w+4,h:r.h+4},corner(r)+2);x.stroke();}
 }
 // A soft bloom and two low-contrast rings share the square's fixed centre.
 // The available edge distance limits the rings; the bloom has no hard edge.
 if(P.t<PULSE&&animated){const p=P.t/PULSE,s=G.scale;
  x.save();const radius=(18+28*P.pulse)*s,halo=x.createRadialGradient(cx,cy,0,cx,cy,radius);halo.addColorStop(0,col.blue+'30');halo.addColorStop(.35,col.blue+'18');halo.addColorStop(1,col.blue+'00');x.fillStyle=halo;x.globalAlpha=P.pulse;x.fillRect(cx-radius,cy-radius,2*radius,2*radius);
  const limit=Math.max(today.w*.6,Math.min(42*s,cx-2*s,w-cx-2*s,cy-2*s,h-cy-2*s));
  for(let i=0;i<2;i++){const q=clamp((p-i*.16)/(.9-i*.16)),radius=mix(today.w*.55,limit,ease(q));x.globalAlpha=Math.sin(Math.PI*q)**2*(.22-i*.05);x.strokeStyle=col.blue;x.lineWidth=1.1*s;x.beginPath();x.arc(cx,cy,radius,0,Math.PI*2);x.stroke();}x.restore();
 }
 x.font=(11*G.scale)+'px "IBM Plex Mono",monospace';x.textBaseline='top';x.textAlign='left';x.fillStyle=col.muted;
 if(P.overview>.8){x.globalAlpha=ease((P.overview-.8)/.2);M.years.forEach((y,i)=>x.fillText(String(y),(i%G.cols)*(G.cw+G.gap)+(G.cw-G.unit*7)/2,G.reserve+Math.floor(i/G.cols)*G.bh));}
 else if(P.zoom<1.1&&P.pull<.1){let previous=-1;for(const d of M.days){if(d.col!==0&&d.n!==M.start)continue;const dt=new Date(d.n*DAY),m=dt.getUTCMonth(),r=G.timeline(d,P.cursor);if(m!==previous&&r.y>10&&r.y<h-16)x.fillText(MONTHS[m],G.left,r.y);previous=m;}}
 x.restore();
}
function draw(M,x,w,h,time,part,mode,col,clear=true,exported=false,ambient=time){
 const t=clamp(time,0,END),ratio=Math.min(2,x.getTransform?.().a||1),key=[w,h,t,part,mode,col.blue,col.empty,col.muted,exported,ratio].join('|');
 let F=frames.get(x);
 if(!F||F.M!==M||F.key!==key){
  const builds=(F?.builds||0)+1;
  if(!F||F.w!==w||F.h!==h||F.ratio!==ratio){const layer=()=>{const c=document.createElement('canvas');c.width=Math.ceil(w*ratio);c.height=Math.ceil(h*ratio);const ctx=c.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);return {c,x:ctx};};F={base:layer(),mask:layer(),light:layer()};}
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
 const M=model(),part=choices.includes(focus)?focus:'All workouts';
 return `<h2 id="secDays">You keep showing up${hActs('rhythm','One square per day. Blue means you trained. Scroll through the years, or replay your history from today. Body-part focus dims other training days without removing them.','About your attendance')}</h2>
 <div class="card crcard attendance-card" data-overview="false">
  <div class="at-owner">${hesc(M.name)}</div>
  <div class="at-parts" role="group" aria-label="Highlight body part">${choices.map(p=>`<button type="button" data-attendance-part="${p}" aria-pressed="${p===part}">${p==='All workouts'?'All':p}</button>`).join('')}</div>
  <div class="at-composition"><div class="at-story"><div class="at-total">${fmt(M.total)}</div><div class="at-unit">days in</div><div class="at-focus"${part==='All workouts'?' hidden':''}><b></b><span>${hesc(part)}</span></div><div class="at-streak">streak ${dayCount(currentStreak())}<br>best ${dayCount(longestStreak())}</div></div>
   <div class="at-timeline"><label class="at-year-label"><span class="sr-only">Calendar year</span><select class="at-year">${M.years.map(y=>`<option value="${y}">${y}</option>`).join('')}</select></label><div class="at-weekdays" aria-hidden="true">${Array.from({length:7},(_,i)=>'<span>'+['S','M','T','W','T','F','S'][(i+M.dow)%7]+'</span>').join('')}</div><div class="at-scroll" tabindex="0" aria-label="Training calendar. Scroll vertically through your history."><div class="at-calendar"></div></div></div>
   <div class="at-overview" role="img"></div>
  </div>
  <div class="at-date"><strong>${year(M.end)}</strong><span></span></div><div class="at-range" hidden><span></span><button type="button" class="at-return">Timeline ↗</button></div>
  <div class="at-actions"><button type="button" class="heat-replay">↻ <span>Replay</span></button><button type="button" class="heat-share">${ICO_SHARE}<span>Share</span></button></div>
  <div class="at-options"><label>Animation<select class="at-motion">${['Full journey','Today pulse','Off'].map(p=>`<option${p===motion?' selected':''}>${p}</option>`).join('')}</select></label></div><div class="at-status sr-only" role="status" aria-live="polite"></div>
 </div>`;
};
const renderBefore=renderStats;
renderStats=function(){document.querySelectorAll('.attendance-card').forEach(c=>c._attendance?.cleanup?.());renderBefore();document.querySelectorAll('.attendance-card').forEach(bind);};
function bind(card){
 const M=model(),cal=card.querySelector('.at-calendar'),scroller=card.querySelector('.at-scroll'),picker=card.querySelector('.at-year'),overview=card.querySelector('.at-overview');
 const state={M,part:focus,mode:motion,card,scroller,overview,cols:[],mini:[],scroll:0};card._attendance=state;
 card.dataset.animation=state.mode;
 const visibility=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{card.dataset.visible=String(entries[0].isIntersecting);if(!card.isConnected)state.cleanup();}):null;
 visibility?.observe(card);
 const weeks=Math.floor((M.end-M.firstWeek)/7)+1;cal.style.height=(weeks*16+8)+'px';
 const frag=document.createDocumentFragment();let prev=-1;
 for(const d of M.days){const el=document.createElement('span');el.className='at-cell'+(d.on?' on':'')+(d.n===M.end?' today':'');el.dataset.date=iso(d.n);el.title=iso(d.n)+(d.on?' · trained':' · no workout logged');el.setAttribute('aria-label',el.title);el.style.cssText=`left:calc(28px + ${d.col} * (100% - 28px) / 7);top:${d.row*16+4}px`;frag.append(el);state.cols.push([el,d]);const month=new Date(d.n*DAY).getUTCMonth();if((d.col===0||d.n===M.start)&&month!==prev){const label=document.createElement('small');label.className='at-month';label.style.top=(d.row*16+4)+'px';label.textContent=MONTHS[month];frag.append(label);prev=month;}}
 cal.append(frag);
 const ncols=Math.min(6,M.years.length);overview.style.setProperty('--at-columns',ncols);
 for(const y of M.years){const section=document.createElement('div');section.className='at-mini-year';const label=document.createElement('span');label.textContent=String(y);section.append(label);const grid=document.createElement('div');grid.className='at-mini-grid';section.append(grid);const first=M.days.find(d=>year(d.n)===y);for(const d of M.days.filter(d=>year(d.n)===y)){const el=document.createElement('span');el.className='at-mini'+(d.on?' on':'')+(d.n===M.end?' today':'');el.title=iso(d.n)+(d.on?' · trained':' · no workout logged');if(d===first)el.style.gridColumn=String(d.col+1);grid.append(el);state.mini.push([el,d]);}overview.append(section);}
 overview.setAttribute('aria-label',`${M.total} training days, ${iso(M.start)} to ${iso(M.end)}. Each column is one year.`);
 card.querySelector('.at-range span').textContent=range(M);
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
 state.paintFocus=()=>{for(const [el,d]of [...state.cols,...state.mini])el.classList.toggle('dim',d.on&&!matches(d,state.part));card.querySelectorAll('.at-parts button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.attendancePart===state.part)));card.querySelector('.at-focus').hidden=state.part==='All workouts';card.querySelector('.at-focus span').textContent=state.part;card.querySelector('.at-focus b').textContent=dayCount(M.days.filter(d=>d.on&&matches(d,state.part)).length);state.refreshMask();};state.paintFocus();
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
 const comp=S.card.querySelector('.at-composition'),G=geometry(S.M,comp.clientWidth||320,comp.clientHeight||430);
 [...S.overview.children].forEach((el,i)=>{el.style.cssText=`position:absolute;left:${(i%G.cols)*(G.cw+G.gap)}px;top:${Math.floor(i/G.cols)*G.bh}px;width:${G.cw}px;height:${G.bh}px`;el.firstElementChild.style.marginLeft=(G.cw-G.unit*7)/2+'px';});
 for(const [el,d]of S.mini){const p=G.overview(d),i=year(d.n)-S.M.years[0];el.style.cssText=`position:absolute;left:${p.x-(i%G.cols)*(G.cw+G.gap)}px;top:${p.y-G.reserve-Math.floor(i/G.cols)*G.bh-27}px;width:${p.w}px;height:${p.h}px`;}
}
function finishView(S){S.card.dataset.overview='true';S.card.querySelector('.at-range').hidden=false;S.card.querySelector('.at-date').hidden=true;S.card.querySelector('.at-total').textContent=fmt(S.M.total);S.paintFocus();layoutOverview(S);}
function play(card){
 if(!card?._attendance)return false;if(live){const same=live.state.card===card;live.finish();if(same)return true;}
 const S=card._attendance,M=S.M;S.scene?.dispose();if(!M.total||S.mode==='Off'||reduced()){finishView(S);return false;}
 timeline(S);const comp=card.querySelector('.at-composition'),cv=document.createElement('canvas');cv.className='at-replay-canvas';cv.setAttribute('aria-hidden','true');
 let w=comp.clientWidth,h=comp.clientHeight,col=palette();const x=cv.getContext('2d');if(!x)return false;comp.append(cv);card.classList.add('at-playing');
 const label=card.querySelector('.heat-replay span'),status=card.querySelector('.at-status');label.textContent='Stop';status.textContent='Replaying training history from today.';
 let raf=0,paused=false,visible=true,disposed=false,complete=false,elapsed=0,ambient=0,last=0,painted=-1;
 const duration=S.mode==='Today pulse'?PULSE:END;
 function paint(){
  const P=draw(M,x,w,h,elapsed,S.part,S.mode,col,true,false,ambient);
  if(painted!==elapsed){painted=elapsed;card.querySelector('.at-total').textContent=fmt(P.count);card.querySelector('.at-focus b').textContent=dayCount(P.focused(S.part));S.readDate(Math.round(P.cursor),true);card.dataset.phase=P.overview>0?'overview':elapsed<PULSE?'pulse':'rewind';card.dataset.revealed=String(P.count);card.style.setProperty('--at-story-opacity',String(1-P.overview));}
  if(complete)card.dataset.phase='complete';
 }
 // Natural completion keeps the exact same canvas and geometry alive. Only
 // the light clock continues; there is no canvas-to-DOM layout handoff.
 function settle(){complete=true;label.textContent='Replay';if(live?.state===S)live=null;card.dataset.phase='complete';if(S.mode!=='Today pulse'){card.querySelector('.at-range').hidden=false;card.querySelector('.at-date').hidden=true;}status.textContent=`${M.total} training days. ${S.mode==='Today pulse'?'Today.':'Entire history shown.'}`;}
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
// Share-only calendar geometry. Keep weeks across and weekdays down, with the
// same January origin for every year (including partial first/last years).
// A leap year with six leading days can occupy 54 weeks, not always 53.
function ledgerGeometry(M){
 const width=1080,pad=70,top=430,rowHeight=205;
 const rows=M.years.map(y=>{const jan=stamp(y+'-01-01'),next=stamp((y+1)+'-01-01'),offset=(weekday(jan)-M.dow+7)%7;return {year:y,jan,offset,weeks:Math.ceil((next-jan+offset)/7),first:Math.max(jan,M.start),last:Math.min(next-1,M.end)};});
 const pitch=(width-2*pad)/Math.max(...rows.map(r=>r.weeks)),size=pitch-4,height=Math.max(1080,top+rows.length*rowHeight+120);
 const cell=d=>{const i=year(d.n)-M.years[0],r=rows[i],index=d.n-r.jan+r.offset;return {x:pad+Math.floor(index/7)*pitch+2,y:top+i*rowHeight+43+(index%7)*pitch,w:size,h:size};};
 return {width,height,pad,top,rowHeight,rows,pitch,size,cell};
}
function exportWordmark(image,dark){
 if(!dark)return image;
 // iOS canvas implementations may ignore filter. Recolour only the decoded
 // lettering's alpha mask; source-in is supported without altering its paths.
 const cv=document.createElement('canvas');cv.width=image.naturalWidth;cv.height=image.naturalHeight;const x=cv.getContext('2d');
 if(!x)throw Error('Wordmark canvas unavailable');
 x.drawImage(image,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#fff';x.fillRect(0,0,cv.width,cv.height);x.globalCompositeOperation='source-over';return cv;
}
function drawLedger(M,part,col,pip,word){
 const G=ledgerGeometry(M),cv=document.createElement('canvas');cv.width=G.width;cv.height=G.height;const x=cv.getContext('2d');if(!x)return null;
 x.fillStyle=col.surface;x.fillRect(0,0,cv.width,cv.height);
 x.drawImage(pip,14,85,485,292,70,82,103,62);x.drawImage(word,187,71,109,73);
 const text=(s,X,Y,size,color,align='left',weight=400,mono=false,max=940)=>{x.fillStyle=color;x.font=weight+' '+size+'px '+(mono?'"IBM Plex Mono",monospace':'"ShowUp Export Plex","IBM Plex Sans",sans-serif');x.textAlign=align;x.textBaseline='alphabetic';x.fillText(s,X,Y,max);};
 text(M.name,1010,116,27,col.muted,'right',400,false,570);
 const value=fmt(M.total);let size=184;x.font='500 '+size+'px "ShowUp Export Plex"';while(x.measureText(value).width>720&&size>80){size-=2;x.font='500 '+size+'px "ShowUp Export Plex"';}const nw=x.measureText(value).width;
 text(value,70,344,size,col.blue,'left',500);text('days in',94+nw,344,35,col.ink);
 if(part!=='All workouts')text(part+' · '+dayCount(M.days.filter(d=>d.on&&matches(d,part)).length),70,393,26,col.muted);
 G.rows.forEach((r,i)=>{const y=G.top+i*G.rowHeight;const f=n=>new Date(n*DAY).toLocaleDateString('en-US',{month:'short',...(n===M.end?{day:'numeric'}:{}),timeZone:'UTC'});const a=f(r.first),b=f(r.last);text(String(r.year),70,y+17,29,col.ink,'left',500,true);text(a===b?a:a+' — '+b,1010,y+17,24,col.muted,'right',400,true);});
 for(const d of M.days){const r=G.cell(d);x.fillStyle=d.on?col.blue:col.empty;x.globalAlpha=d.on&&!matches(d,part)?.24:1;round(x,r,corner(r));x.fill();x.globalAlpha=1;if(d.n===M.end){x.strokeStyle=col.blue;x.lineWidth=1.5;round(x,{x:r.x-2,y:r.y-2,w:r.w+4,h:r.h+4},corner(r)+2);x.stroke();}}
 const line=G.height-112;x.fillStyle=col.line;x.fillRect(70,line,940,1);text(range(M),70,line+61,25,col.muted);text('One square. One day.',1010,line+61,25,col.muted,'right');
 return cv;
}
async function share(card){
 if(!card?._attendance)return;if(live)live.finish();const S=card._attendance,M=S.M,col=palette(),dark=document.documentElement.dataset.theme==='dark';
 const [gifModule,videoModule]=await Promise.all([import('./plate-gif.js'),import('./plate-video.js')]);await Promise.all([gifModule.loadExportFonts(),document.fonts.load('500 29px "IBM Plex Mono"'),document.fonts.load('400 24px "IBM Plex Mono"')]);
 const load=async src=>{const i=new Image();i.src=src;await i.decode();return i;};
 // Fail visibly if either half of the approved lockup is unavailable: never
 // silently export a wordmark without Pip, or substitute a typeface for it.
 const [pip,lettering]=await Promise.all([load('assets/mascot-mark-'+(dark?'white':'chrome')+'.png'),load('assets/showuppp-a.svg')]);
 const word=exportWordmark(lettering,dark);
 const data={...col,dark,name:M.name},part=S.part,mode=reduced()?'Off':S.mode;
 const render=(time,canvas)=>{
  const cv=canvas||document.createElement('canvas');cv.width=1080;cv.height=1280;const x=cv.getContext('2d'),t=Number.isFinite(time)?Math.max(0,time):END,actualMode=Number.isFinite(time)?mode:'Off',P=phase(M,t,actualMode);
  x.fillStyle=col.surface;x.fillRect(0,0,1080,1280);
  x.drawImage(pip,14,85,485,292,70,82,103,62);x.drawImage(word,187,71,109,73);
  const text=(s,X,Y,size,color,align='left',weight=400)=>{x.fillStyle=color;x.font=weight+' '+size+'px "ShowUp Export Plex", "IBM Plex Sans",sans-serif';x.textAlign=align;x.textBaseline='alphabetic';x.fillText(s,X,Y,align==='right'?570:940);};
  text(M.name,1010,116,27,col.muted,'right');x.fillStyle=col.line;x.fillRect(70,177,940,1);
  text(fmt(P.count),70,318,112,col.blue,'left',500);x.font='500 112px "ShowUp Export Plex"';const nw=x.measureText(fmt(P.count)).width;text('days in',88+nw,318,31,col.muted);
  if(part!=='All workouts')text(part+' · '+P.focused(part)+' days',70,375,26,col.muted);
  x.save();x.translate(70,419);draw(M,x,940,685,t,part,actualMode,col,false,true);x.restore();
  x.fillStyle=col.line;x.fillRect(70,1145,940,1);text(P.overview>=1?range(M):String(year(P.cursor)),70,1205,27,col.muted);text(P.overview>=1?'One square. One day.':dateLabel(P.cursor),1010,1205,27,col.muted,'right');
  return cv;
 };
 await showCard(()=>drawLedger(M,part,col,pip,word),'showuppp-attendance-'+todayISO,false);
 bindPlateExport(data,null,gifModule,videoModule,{render,label:'Your training history · ShowUppp and Pip',animateHold:mode!=='Off',duration:mode==='Today pulse'?PULSE:mode==='Off'?500:END});
}
async function seeAll(){document.querySelector('nav button[data-v="stats"]')?.click();let card;for(let i=0;i<30&&!card;i++){await new Promise(r=>setTimeout(r,50));card=document.querySelector('.attendance-card');}if(!card)return false;card.scrollIntoView({block:'center',behavior:reduced()?'auto':'smooth'});await new Promise(r=>setTimeout(r,reduced()?0:650));return card.isConnected&&play(card);}
document.addEventListener('click',e=>{const b=e.target.closest?.('.heat-replay,.heat-share'),card=b?.closest('.attendance-card');if(!card)return;if(b.classList.contains('heat-share')){b.disabled=true;share(card).catch(()=>toast('Could not prepare the export. Please try again.')).finally(()=>{b.disabled=false;});}else play(card);});
const mq=matchMedia('(prefers-reduced-motion: reduce)');mq.addEventListener?.('change',()=>{document.querySelectorAll('.attendance-card').forEach(c=>{c._attendance?.scene?.finish();if(mq.matches&&c._attendance)finishView(c._attendance);});});
window.addEventListener('resize',()=>{document.querySelectorAll('.attendance-card').forEach(c=>{if(c._attendance)layoutOverview(c._attendance);});});
window.heatReplay={play,share,seeAll,get live(){return live;},finish(){live?.finish();},duration:()=>END,exportEnd:END};
// Pure data/camera contract for regression checks; no saved state is exposed.
window.attendanceView={model,phase,geometry,ledgerGeometry,sweepAt};
})();
