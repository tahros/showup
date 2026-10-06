/* Attendance: Today pulse → reverse chronological reveal → whole-history view.
   Presentation only. No saved-data, Rest-card or header changes. UTC day indices
   avoid DST gaps; training dates are deduplicated before counting. The on-screen
   replay and branded exports share one deterministic camera and renderer. */
(()=>{
'use strict';
const DAY=86400000, END=9550, ZOOM=7950, MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),mix=(a,b,p)=>a+(b-a)*p,ease=p=>1-Math.pow(1-clamp(p),3);
const iso=n=>new Date(n*DAY).toISOString().slice(0,10),stamp=s=>Math.floor(Date.parse(s+'T00:00:00Z')/DAY);
const valid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(stamp(s))&&iso(stamp(s))===s;
const weekday=n=>new Date(n*DAY).getUTCDay(),year=n=>new Date(n*DAY).getUTCFullYear();
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
 const recent=Math.max(M.start,M.end-140);
 const cursor=off?M.start:pulseOnly?M.end:t<1750?M.end:t<3050?Math.round(mix(M.end,recent,ease((t-1750)/1300))):Math.round(mix(recent,M.start,ease((t-3050)/4500)));
 const overview=off?1:pulseOnly?0:ease((t-ZOOM)/(END-ZOOM));
 let zoom=1;if(t<1700&&!off){const p=t/1700;zoom=p<.45?mix(1,6.5,ease(p/.45)):mix(6.5,1,ease((p-.45)/.55));}
 const revealed=d=>off||pulseOnly||d.n>=cursor;
 return {t,cursor,overview,zoom,count:M.days.filter(d=>d.on&&revealed(d)).length,focused:part=>M.days.filter(d=>d.on&&revealed(d)&&matches(d,part)).length,revealed};
}
function palette(){const c=getComputedStyle(document.documentElement),get=(k,f)=>c.getPropertyValue(k).trim()||f;return {surface:get('--surface','#fff'),ink:get('--chalk','#222'),muted:get('--muted','#777'),empty:get('--surface2','#f3f3f3'),blue:document.documentElement.dataset.theme==='dark'?'#7188ff':'#3049dc',line:get('--line','#ddd')};}
function geometry(M,w,h,exported=false){
 const scale=exported?w/340:1,reserve=exported?0:100,cols=Math.min(6,M.years.length),bands=Math.ceil(M.years.length/cols),gap=10*scale,cw=(w-gap*(cols-1))/cols,bh=(h-reserve)/bands,step=(bh-28*scale)/54,unit=Math.min((cw-3)/7,step);
 const tw=Math.min(164*scale,w*.57),left=w-tw,pitch=16*scale,cell=Math.min(12*scale,(tw-30*scale)/7-3*scale),tx=left+28*scale;
 function timeline(d,cursor){const cr=Math.floor((cursor-M.firstWeek)/7),max=Math.max(0,(Math.floor((M.end-M.firstWeek)/7)+1)*pitch-h),scroll=clamp(cr*pitch-h*.68,0,max);return {x:tx+d.col*(tw-28*scale)/7,y:d.row*pitch-scroll+4*scale,w:cell,h:cell};}
 function overview(d){const yi=year(d.n)-M.years[0],first=Math.max(M.start,stamp(year(d.n)+'-01-01')),row=Math.floor((d.n-first+(weekday(first)-M.dow+7)%7)/7);return {x:(yi%cols)*(cw+gap)+(cw-unit*7)/2+d.col*unit,y:reserve+Math.floor(yi/cols)*bh+27*scale+row*step,w:Math.max(1,unit-1.5*scale),h:Math.max(1,Math.min(unit,step)-1.5*scale)};}
 return {timeline,overview,cols,bands,cw,bh,step,left,tw,tx,reserve,scale,gap,unit};
}
function round(x,b,r){x.beginPath();x.roundRect(b.x,b.y,b.w,b.h,Math.min(r,b.w/2,b.h/2));}
function draw(M,x,w,h,time,part,mode,col,clear=true,exported=false){
 const P=phase(M,time,mode),G=geometry(M,w,h,exported),today=G.timeline(M.days[M.days.length-1],M.end),cx=today.x+today.w/2,cy=today.y+today.h/2;
 if(clear)x.clearRect(0,0,w,h);x.save();x.beginPath();const clipLeft=G.left*(1-P.overview);x.rect(clipLeft,0,w-clipLeft,h);x.clip();
 const pulse=clamp((P.zoom-1)/5.5),shiftX=(G.left+G.tw/2-cx)*pulse,shiftY=(h*.55-cy)*pulse;
 for(const d of M.days){const a=G.timeline(d,P.cursor),b=G.overview(d),p=P.overview;
  const r={x:mix(cx+(a.x-cx)*P.zoom+shiftX,b.x,p),y:mix(cy+(a.y-cy)*P.zoom+shiftY,b.y,p),w:mix(a.w*P.zoom,b.w,p),h:mix(a.h*P.zoom,b.h,p)};
  if(r.y+r.h<0||r.y>h)continue;
  const filled=d.on&&P.revealed(d);x.globalAlpha=filled&&!matches(d,part)?.24:1;x.fillStyle=filled?col.blue:col.empty;round(x,r,mix(2*P.zoom,G.scale,p));x.fill();x.globalAlpha=1;
  if(d.n===M.end){x.strokeStyle=col.blue;x.lineWidth=mix(1.4,1,p);round(x,{x:r.x-2,y:r.y-2,w:r.w+4,h:r.h+4},3);x.stroke();}
 }
 x.font=(11*G.scale)+'px "IBM Plex Mono",monospace';x.textBaseline='top';x.textAlign='left';x.fillStyle=col.muted;
 if(P.overview>0){x.globalAlpha=P.overview;M.years.forEach((y,i)=>x.fillText(String(y),(i%G.cols)*(G.cw+G.gap),G.reserve+Math.floor(i/G.cols)*G.bh));}
 else if(P.zoom<1.1){let previous=-1;for(const d of M.days){if(d.col!==0&&d.n!==M.start)continue;const dt=new Date(d.n*DAY),m=dt.getUTCMonth(),r=G.timeline(d,P.cursor);if(m!==previous&&r.y>10&&r.y<h-16)x.fillText(MONTHS[m],G.left,r.y);previous=m;}}
 x.restore();return P;
}
const sourceSection=currentRhythmSection;
currentRhythmSection=function(inverse){
 if(inverse)return sourceSection(inverse);
 const M=model(),part=choices.includes(focus)?focus:'All workouts';
 return `<h2 id="secDays">You keep showing up${hActs('rhythm','One square per day. Blue means you trained. Scroll through the years, or replay your history from today. Body-part focus dims other training days without removing them.','About your attendance')}</h2>
 <div class="card crcard attendance-card" data-overview="false">
  <div class="at-owner">${hesc(M.name)}</div>
  <div class="at-composition"><div class="at-story"><div class="at-total">${fmt(M.total)}</div><div class="at-unit">days in</div><div class="at-focus"${part==='All workouts'?' hidden':''}><b></b><span>${hesc(part)}</span></div><div class="at-streak">streak ${dayCount(currentStreak())}<br>best ${dayCount(longestStreak())}</div></div>
   <div class="at-timeline"><label class="at-year-label"><span class="sr-only">Calendar year</span><select class="at-year">${M.years.map(y=>`<option value="${y}">${y}</option>`).join('')}</select></label><div class="at-weekdays" aria-hidden="true">${Array.from({length:7},(_,i)=>'<span>'+['S','M','T','W','T','F','S'][(i+M.dow)%7]+'</span>').join('')}</div><div class="at-scroll" tabindex="0" aria-label="Training calendar. Scroll vertically through your history."><div class="at-calendar"></div></div></div>
   <div class="at-overview" role="img"></div>
  </div>
  <div class="at-date"><strong>${year(M.end)}</strong><span></span></div><div class="at-range" hidden><span></span><button type="button" class="at-return">Timeline ↗</button></div>
  <div class="at-actions"><button type="button" class="heat-replay">↻ <span>Replay</span></button><button type="button" class="heat-share">${ICO_SHARE}<span>Share</span></button></div>
  <div class="at-options"><label>Highlight<select class="at-part">${choices.map(p=>`<option${p===part?' selected':''}>${p}</option>`).join('')}</select></label><label>Animation<select class="at-motion">${['Full journey','Today pulse','Off'].map(p=>`<option${p===motion?' selected':''}>${p}</option>`).join('')}</select></label></div><div class="at-status sr-only" role="status" aria-live="polite"></div>
 </div>`;
};
const renderBefore=renderStats;
renderStats=function(){if(live)live.finish();renderBefore();document.querySelectorAll('.attendance-card').forEach(bind);};
function bind(card){
 const M=model(),cal=card.querySelector('.at-calendar'),scroller=card.querySelector('.at-scroll'),picker=card.querySelector('.at-year'),overview=card.querySelector('.at-overview');
 const state={M,part:focus,mode:motion,card,scroller,overview,cols:[],mini:[],scroll:0};card._attendance=state;
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
 state.paintFocus=()=>{for(const [el,d]of [...state.cols,...state.mini])el.classList.toggle('dim',d.on&&!matches(d,state.part));card.querySelector('.at-focus').hidden=state.part==='All workouts';card.querySelector('.at-focus span').textContent=state.part;card.querySelector('.at-focus b').textContent=dayCount(M.days.filter(d=>d.on&&matches(d,state.part)).length);};state.paintFocus();
 const sync=()=>{if(live?.state===state)return;const atEnd=scroller.scrollHeight-scroller.clientHeight-scroller.scrollTop<8;readDate(state.jumpDate??(atEnd?M.end:clamp(M.firstWeek+Math.floor(scroller.scrollTop/16)*7,M.start,M.end)),true);};
 scroller.addEventListener('scroll',sync,{passive:true});
 const stop=()=>{state.jumpDate=null;if(live?.state===state)live.finish();};card.addEventListener('wheel',stop,{passive:true});card.addEventListener('pointerdown',e=>{if(!e.target.closest('.heat-replay'))stop();});scroller.addEventListener('touchstart',stop,{passive:true});scroller.addEventListener('keydown',stop);
 picker.onchange=()=>{const y=+picker.value;stop();timeline(state);const n=Math.max(M.start,stamp(y+'-01-01'));state.jumpDate=n;readDate(n,true);scroller.scrollTo({top:Math.floor((n-M.firstWeek)/7)*16,behavior:reduced()?'auto':'smooth'});};
 card.querySelector('.at-return').onclick=()=>{stop();timeline(state);scroller.scrollTop=scroller.scrollHeight;readDate(M.end);};
 card.querySelector('.at-part').onchange=e=>{stop();focus=state.part=e.target.value;state.paintFocus();};
 card.querySelector('.at-motion').onchange=e=>{stop();motion=state.mode=e.target.value;card.querySelector('.heat-replay').disabled=motion==='Off'||!M.total;if(motion==='Off')finishView(state);};
 card.querySelector('.heat-replay').disabled=motion==='Off'||!M.total;
 state.readDate(M.end);requestAnimationFrame(()=>{if(card.isConnected)scroller.scrollTop=scroller.scrollHeight;});
 if(reduced()||motion==='Off')finishView(state);
}
function dateLabel(n){return new Date(n*DAY).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'});}
function range(M){const f=n=>new Date(n*DAY).toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});return f(M.start)+' — '+f(M.end);}
function timeline(S){S.card.dataset.overview='false';S.card.querySelector('.at-range').hidden=true;S.card.querySelector('.at-date').hidden=false;}
function layoutOverview(S){
 const comp=S.card.querySelector('.at-composition'),G=geometry(S.M,comp.clientWidth||320,430);
 [...S.overview.children].forEach((el,i)=>{el.style.cssText=`position:absolute;left:${(i%G.cols)*(G.cw+G.gap)}px;top:${Math.floor(i/G.cols)*G.bh}px;width:${G.cw}px;height:${G.bh}px`;});
 for(const [el,d]of S.mini){const p=G.overview(d),i=year(d.n)-S.M.years[0];el.style.cssText=`position:absolute;left:${p.x-(i%G.cols)*(G.cw+G.gap)}px;top:${p.y-G.reserve-Math.floor(i/G.cols)*G.bh-27}px;width:${p.w}px;height:${p.h}px`;}
}
function finishView(S){S.card.dataset.overview='true';S.card.querySelector('.at-range').hidden=false;S.card.querySelector('.at-date').hidden=true;S.card.querySelector('.at-total').textContent=fmt(S.M.total);S.paintFocus();layoutOverview(S);}
function play(card){
 if(!card?._attendance)return false;if(live){const same=live.state.card===card;live.finish();if(same)return true;}
 const S=card._attendance,M=S.M;if(!M.total||S.mode==='Off'||reduced()){finishView(S);return false;}
 timeline(S);const comp=card.querySelector('.at-composition'),cv=document.createElement('canvas');cv.className='at-replay-canvas';cv.setAttribute('aria-hidden','true');
 const w=comp.clientWidth,h=comp.clientHeight,ratio=Math.min(devicePixelRatio||1,3);cv.width=Math.round(w*ratio);cv.height=Math.round(h*ratio);const x=cv.getContext('2d');if(!x)return false;x.scale(ratio,ratio);comp.append(cv);card.classList.add('at-playing');
 const col=palette(),label=card.querySelector('.heat-replay span'),status=card.querySelector('.at-status');label.textContent='Stop';status.textContent='Replaying training history from today.';let raf=0,paused=false;
 const duration=S.mode==='Today pulse'?1700:END,began=performance.now();
 function paint(t){const P=draw(M,x,w,h,t,S.part,S.mode,col);card.querySelector('.at-total').textContent=fmt(P.count);card.querySelector('.at-focus b').textContent=dayCount(P.focused(S.part));S.readDate(P.cursor,true);card.dataset.phase=P.overview>0?'overview':t<1750?'pulse':'rewind';card.dataset.revealed=String(P.count);card.style.setProperty('--at-story-opacity',String(1-P.overview));}
 function finish(){cancelAnimationFrame(raf);cv.remove();card.classList.remove('at-playing');card.style.removeProperty('--at-story-opacity');label.textContent='Replay';if(S.mode==='Today pulse'){timeline(S);card.querySelector('.at-total').textContent=fmt(M.total);S.paintFocus();S.scroller.scrollTop=S.scroller.scrollHeight;S.readDate(M.end);}else finishView(S);card.dataset.phase='complete';status.textContent=`${M.total} training days. ${S.mode==='Today pulse'?'Today.':'Entire history shown.'}`;document.removeEventListener('visibilitychange',hide);window.removeEventListener('resize',finish);live=null;}
 function tick(now){if(!card.isConnected||now-began>=duration){finish();return;}paint(now-began);if(!paused)raf=requestAnimationFrame(tick);}
 const hide=()=>{if(document.hidden)finish();};document.addEventListener('visibilitychange',hide);window.addEventListener('resize',finish,{once:true});
 live={state:S,finish,seek(t){paused=true;cancelAnimationFrame(raf);paint(clamp(t,0,duration));}};paint(0);raf=requestAnimationFrame(tick);return true;
}
async function share(card){
 if(!card?._attendance)return;if(live)live.finish();const S=card._attendance,M=S.M,col=palette(),dark=document.documentElement.dataset.theme==='dark';
 const [gifModule,videoModule]=await Promise.all([import('./plate-gif.js'),import('./plate-video.js')]);await gifModule.loadExportFonts();
 const load=async src=>{const i=new Image();i.src=src;await i.decode();return i;};
 // Fail visibly if either half of the approved lockup is unavailable: never
 // silently export a wordmark without Pip, or substitute a typeface for it.
 const [pip,word]=await Promise.all([load('assets/mascot-mark-'+(dark?'white':'chrome')+'.png'),load('assets/showuppp-a.svg')]);
 const data={...col,dark,name:M.name},part=S.part,mode=reduced()?'Off':S.mode;
 const render=(time,canvas)=>{
  const cv=canvas||document.createElement('canvas');cv.width=1080;cv.height=1280;const x=cv.getContext('2d'),t=Number.isFinite(time)?Math.max(0,time):END,actualMode=Number.isFinite(time)?mode:'Off',P=phase(M,t,actualMode);
  x.fillStyle=col.surface;x.fillRect(0,0,1080,1280);
  x.drawImage(pip,14,85,485,292,70,82,103,62);x.save();if(dark)x.filter='brightness(0) invert(1)';x.drawImage(word,187,71,109,73);x.restore();
  const text=(s,X,Y,size,color,align='left',weight=400)=>{x.fillStyle=color;x.font=weight+' '+size+'px "ShowUp Export Plex", "IBM Plex Sans",sans-serif';x.textAlign=align;x.textBaseline='alphabetic';x.fillText(s,X,Y,align==='right'?570:940);};
  text(M.name,1010,116,27,col.muted,'right');x.fillStyle=col.line;x.fillRect(70,177,940,1);
  text(fmt(P.count),70,318,112,col.blue,'left',500);x.font='500 112px "ShowUp Export Plex"';const nw=x.measureText(fmt(P.count)).width;text('days in',88+nw,318,31,col.muted);
  if(part!=='All workouts')text(part+' · '+P.focused(part)+' days',70,375,26,col.muted);
  x.save();x.translate(70,419);draw(M,x,940,685,t,part,actualMode,col,false,true);x.restore();
  x.fillStyle=col.line;x.fillRect(70,1145,940,1);text(P.overview>=1?range(M):String(year(P.cursor)),70,1205,27,col.muted);text(P.overview>=1?'One square. One day.':dateLabel(P.cursor),1010,1205,27,col.muted,'right');
  return cv;
 };
 await showCard(()=>render(),'showuppp-attendance-'+todayISO,false);
 bindPlateExport(data,null,gifModule,videoModule,{render,label:'Your training history · ShowUppp and Pip',duration:mode==='Today pulse'?1700:mode==='Off'?500:END});
}
async function seeAll(){document.querySelector('nav button[data-v="stats"]')?.click();let card;for(let i=0;i<30&&!card;i++){await new Promise(r=>setTimeout(r,50));card=document.querySelector('.attendance-card');}if(!card)return false;card.scrollIntoView({block:'center',behavior:reduced()?'auto':'smooth'});await new Promise(r=>setTimeout(r,reduced()?0:650));return card.isConnected&&play(card);}
document.addEventListener('click',e=>{const b=e.target.closest?.('.heat-replay,.heat-share'),card=b?.closest('.attendance-card');if(!card)return;if(b.classList.contains('heat-share')){b.disabled=true;share(card).catch(()=>toast('Could not prepare the export. Please try again.')).finally(()=>{b.disabled=false;});}else play(card);});
const mq=matchMedia('(prefers-reduced-motion: reduce)');mq.addEventListener?.('change',()=>{live?.finish();if(mq.matches)document.querySelectorAll('.attendance-card').forEach(c=>{if(c._attendance)finishView(c._attendance);});});
window.addEventListener('resize',()=>{document.querySelectorAll('.attendance-card').forEach(c=>{if(c._attendance)layoutOverview(c._attendance);});});
window.heatReplay={play,share,seeAll,get live(){return live;},finish(){live?.finish();},duration:()=>END,exportEnd:END};
// Pure data/camera contract for regression checks; no saved state is exposed.
window.attendanceView={model,phase,geometry};
})();
