/* ShowUp — heat-replay.js (v4.6.128): REPLAY on "You keep showing up".
   Classic script, loaded after stats-story.js.

   One camera pull-back from today's square out to the whole ledger, then back
   down onto the strip you actually scroll. The same motion as 13–21s of the
   "One Square" teaser, drawn with the card's own vocabulary and nothing else:
   the square is a day, trained is --accent, missed is --surface2, ahead is the
   .fut outline, today wears its breathing ring. No new colours, no confetti,
   no sound, no score; a grey day stays grey and nothing is hidden.

   THE GEOMETRY. The card's heatmap is a single strip, one column per week,
   opening on today. The replay lays that same ledger out as CALENDAR-YEAR ROWS
   (the oldest year at the top, this year at the bottom), each column still a
   week. This year's row holds today's week at the same horizontal pitch the
   strip uses, so the last beat -- the camera diving back into this year's row
   -- lands on the strip's opening view square for square, and the handover to
   the real DOM is invisible. Early in a year, when the strip's window reaches
   back past January, the previous year's tail slides in beside this year as
   the camera lands, so the last frame still matches.

   THE BEATS (ms): hold on today 400 · to the week 1000 (past days 90ms apart)
   · to the year 1200 (cells by sqrt of age) · to every year 1300 (cells by
   age^0.75, newest first, speeding up) · hold 200 · land on the strip 600.
   One transform, scale interpolated in log space, easeInOutCubic.

   RULES. Plays only on a tap of Replay; never on render. prefers-reduced-motion
   hides the button, so the card is always in its end state. A tap anywhere
   while it runs jumps to the end. Cell positions are READ from the DOM the
   builder made (never recomputed), so the last frame cannot disagree with it. */
(function(){
const HR_T={hold:400,week:1000,year:1200,all:1300,rest:200,land:600};
const HR_ARRIVE=350, HR_FLASH=180, HR_GAP=90;
const easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const easeOut=t=>1-Math.pow(1-t,3);
const clamp=(x,a=0,b=1)=>x<a?a:x>b?b:x;
const lerp=(a,b,t)=>a+(b-a)*t;
/* --settle, cubic-bezier(.22,1,.36,1): the ring's own curve, so the canvas ring
   breathes in step with the DOM one it hands over to */
function bez(x1,y1,x2,y2){
  const cx=3*x1,bx=3*(x2-x1)-cx,ax=1-cx-bx,cy=3*y1,by=3*(y2-y1)-cy,ay=1-cy-by;
  const X=t=>((ax*t+bx)*t+cx)*t,Y=t=>((ay*t+by)*t+cy)*t,dX=t=>(3*ax*t+2*bx)*t+cx;
  return x=>{let t=x;for(let i=0;i<8;i++){const d=dX(t);if(Math.abs(d)<1e-6)break;t-=(X(t)-x)/d;}return Y(clamp(t));};
}
const settle=bez(.22,1,.36,1);
function ringAt(ms){  /* todbreath: 0% .85/1.5/4 · 60% .30/3.5/6 · 100% .85/1.5/4 */
  const p=((ms%3200)+3200)%3200/3200;
  const A={o:.85,i:1.5,r:4},B={o:.30,i:3.5,r:6};
  const [f,t,u]=p<.6?[A,B,settle(p/.6)]:[B,A,settle((p-.6)/.4)];
  return {o:lerp(f.o,t.o,u),i:lerp(f.i,t.i,u),r:lerp(f.r,t.r,u)};
}
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let live=null;

function mix(c,w){  /* rgb(a) string toward white by w */
  const m=c.match(/[\d.]+/g);if(!m)return c;const [r,g,b]=m.map(Number),a=m[3]!=null?+m[3]:1;
  return `rgba(${Math.round(r+(255-r)*w)},${Math.round(g+(255-g)*w)},${Math.round(b+(255-b)*w)},${a})`;
}
function rr(p,x,y,w,h,r){ if(w<2.2||!p.roundRect){p.rect(x,y,w,h);return;} p.roundRect(x,y,w,h,Math.min(r,w/2,h/2)); }

function build(card){
  const frame=card.querySelector('.heatframe'),wrap=frame?.querySelector('.heatwrap'),grid=frame?.querySelector('.heatgrid');
  if(!grid) return null;
  const els=[...grid.querySelectorAll('.hc')];if(els.length<7)return null;
  const tIdx=els.findIndex(e=>e.classList.contains('tod'));if(tIdx<0)return null;
  const r0=els[0].getBoundingClientRect(),r1=els[1].getBoundingClientRect(),r7=els[7]?.getBoundingClientRect();
  const cs=r0.width,py=r1.top-r0.top,px=r7?r7.left-r0.left:cs+4;
  const bandH=6*py+cs;
  const cst=getComputedStyle(els[tIdx]),rad=parseFloat(cst.borderTopLeftRadius)/(cst.borderTopLeftRadius.endsWith('%')?100/cs:1);
  const pick=sel=>els.find(e=>e.matches(sel));
  const onEl=pick('.on:not(.tod)')||pick('.on'),offEl=pick(':not(.on):not(.fut):not(.tod)'),futEl=pick('.fut');
  const col={on:onEl?getComputedStyle(onEl).backgroundColor:'#888',off:offEl?getComputedStyle(offEl).backgroundColor:'#eee'};
  if(futEl){const f=getComputedStyle(futEl);col.fut=(f.boxShadow.match(/rgba?\([^)]*\)/)||['#ccc'])[0];col.futA=+f.opacity;}
  else{col.fut=getComputedStyle(card).getPropertyValue('--line').trim()||'#ccc';col.futA=.5;}
  const ra=getComputedStyle(els[tIdx],'::after');col.ring=ra.borderTopColor;const ringW=parseFloat(ra.borderTopWidth)||1.4;
  const ringAnim=()=>(document.getAnimations?.()||[]).find(a=>a.animationName==='todbreath'&&a.effect?.target===els[tIdx]);
  /* the canvas covers the since-line and the frame; the camera frames that */
  const since=card.querySelector('.crsince');
  const cr=card.getBoundingClientRect(),fr=frame.getBoundingClientRect(),wr=wrap.getBoundingClientRect();
  const top=(since||frame).getBoundingClientRect().top;
  const box={x:fr.left-cr.left,y:top-cr.top,w:fr.width,h:fr.bottom-top};
  const rel=r=>({x:r.left-cr.left-box.x,y:r.top-cr.top-box.y});
  const clipEnd={x:wr.left-cr.left-box.x,y:0,w:wr.width,h:box.h};
  const todayISO_=els[tIdx].getAttribute('aria-label').slice(0,10);
  const todayCol=Math.floor(tIdx/7),todayRow=tIdx%7;
  const year0=+todayISO_.slice(0,4);
  /* each year's row starts at the column holding its Jan 1 */
  const yStart={};els.forEach((e,k)=>{const y=+e.getAttribute('aria-label').slice(0,4);const c=Math.floor(k/7);if(yStart[y]==null||c<yStart[y])yStart[y]=c;});
  const years=Object.keys(yStart).map(Number).sort((a,b)=>a-b);
  const nb=years.length,G=Math.max(8,py*.7);
  const rowY=y=>(years.indexOf(y)-(nb-1))*(bandH+G);
  const T=(()=>{let t=0;const o={};for(const k of ['hold','week','year','all','rest','land']){o[k]=t;t+=HR_T[k];}o.end=t;return o;})();
  /* the strip's window as it stands (scrolled to today) */
  const todR=rel(els[tIdx].getBoundingClientRect());
  const cells=els.map((e,k)=>{
    const iso=e.getAttribute('aria-label').slice(0,10),y=+iso.slice(0,4),c=Math.floor(k/7),r=k%7;
    const kind=e.classList.contains('fut')?'fut':e.classList.contains('on')?'on':'off';
    /* world: this year's row is laid in STRIP coordinates, so the landing is exact */
    const wx=(c-yStart[y])*px, wy=rowY(y)+r*py;
    /* where the cell sits in the strip, relative to today, for the landing */
    const sx=(c-todayCol)*px, sy=(r-todayRow)*py;
    const age=(Date.parse(todayISO_)-Date.parse(iso))/864e5;
    return {k,iso,y,c,r,kind,wx,wy,sx,sy,age,tod:k===tIdx,t0:0};
  });
  const tod=cells[tIdx];
  /* arrival times */
  const weekCells=cells.filter(c=>c.c===todayCol&&c.y===year0);
  const yearCells=cells.filter(c=>c.y===year0&&c.c!==todayCol);
  const older=cells.filter(c=>c.y!==year0);
  weekCells.forEach(c=>{ if(c.tod)c.t0=-1e9; else if(c.age>0)c.t0=T.week+HR_GAP*(c.age-1)+260; else c.t0=T.week+60; });
  const yMax=Math.max(1,...yearCells.map(c=>Math.abs(c.age)));
  yearCells.forEach(c=>{c.t0=T.year+80+(HR_T.year-420)*Math.sqrt(Math.abs(c.age)/yMax);});
  const oMin=Math.min(...older.map(c=>c.age),1e9),oMax=Math.max(...older.map(c=>c.age),1);
  older.forEach(c=>{c.t0=T.all+60+(HR_T.all-400)*Math.pow((c.age-oMin)/Math.max(1,oMax-oMin),.75);});
  const onTotal=cells.filter(c=>c.kind==='on').length;
  const M={card,frame,wrap,grid,els,since,box,clipEnd,cells,tod,T,cs,px,py,rad,ringW,col,ringAnim,years,rowY,bandH,year0,onTotal,todR};
  M.K=frames(M,box,34);
  M.K.land={c:[tod.wx,tod.wy],s:1,a:[todR.x,todR.y]};
  return M;
}
/* camera keyframes for a box: {c:[x,y] world focus, s, a:[x,y] screen anchor}.
   labelW is the room kept on the left for the year labels. */
function frames(M,box,labelW){
  const {cells,cs,tod,rowY,bandH,year0,years}=M,mid=[box.w/2,box.h/2];
  const yearW=Math.max(...cells.filter(c=>c.y===year0).map(c=>c.wx))+cs;
  const allW=Math.max(...cells.map(c=>c.wx))+cs, allTop=rowY(years[0]), allH=bandH-allTop;
  return {
    day:{c:[tod.wx+cs/2,tod.wy+cs/2],s:box.h*.5/cs,a:mid},
    week:{c:[tod.wx+cs/2,rowY(year0)+bandH/2],s:Math.min(box.h*.78/bandH,box.w*.5/cs),a:mid},
    year:{c:[yearW/2,rowY(year0)+bandH/2],s:Math.min((box.w*.96-labelW)/yearW,box.h*.8/bandH),a:[mid[0]+labelW/2,mid[1]]},
    all:{c:[allW/2,allTop+allH/2],s:Math.min((box.w*.96-labelW)/allW,box.h*.94/allH),a:[mid[0]+labelW/2,mid[1]]},
  };
}

function camAt(M,t){
  const {K,T}=M;
  const seg=t<T.week?['day','day',0]:t<T.year?['day','week',(t-T.week)/HR_T.week]:t<T.all?['week','year',(t-T.year)/HR_T.year]
    :t<T.rest?['year','all',(t-T.all)/HR_T.all]:t<T.land?['all','all',0]:['all','land',(t-T.land)/HR_T.land];
  if(!K.land&&seg[1]==='land')seg[0]=seg[1]='all';
  const A=K[seg[0]],B=K[seg[1]],e=easeIO(clamp(seg[2]));
  return {s:Math.exp(lerp(Math.log(A.s),Math.log(B.s),e)),c:[lerp(A.c[0],B.c[0],e),lerp(A.c[1],B.c[1],e)],a:[lerp(A.a[0],B.a[0],e),lerp(A.a[1],B.a[1],e)],
          land:seg[1]==='land'?e:0};
}

function snap(M,x,y,w,h,k){
  /* Chrome snaps the scroller's layer to the grid, then each square within it:
     round(origin) + round(offset), which is not always round(origin+offset) */
  const d=M.org.d,wx=M.org.wx,wy=M.org.wy;
  const X=v=>(Math.round(wx*d)+Math.round((v+M.org.x-wx)*d))/d-M.org.x,Y=v=>(Math.round(wy*d)+Math.round((v+M.org.y-wy)*d))/d-M.org.y;
  const x0=X(x),x1=X(x+w),y0=Y(y),y1=Y(y+h);
  return [lerp(x,x0,k),lerp(y,y0,k),lerp(w,x1-x0,k),lerp(h,y1-y0,k)];
}
function draw(M,ctx,t){
  const {box,cells,cs,rad,col,T}=M,cam=camAt(M,t),L=cam.land;
  ctx.clearRect(0,0,box.w,box.h);
  /* the clip narrows onto the strip's scroller as the camera lands */
  const cx=L?lerp(0,M.clipEnd.x,L):0,cw=L?lerp(box.w,M.clipEnd.w,L):box.w;
  ctx.save();ctx.beginPath();ctx.rect(cx,0,cw,box.h);ctx.clip();
  const groups=new Map(),add=(key,style,alpha,stroke)=>{let g=groups.get(key);if(!g){g={p:new Path2D(),style,alpha,stroke};groups.set(key,g);}return g.p;};
  let landedOn=0;
  /* the DOM paints each square on the device-pixel grid; so does the landing */
  const K=L>=1?1:L>.85?Math.pow((L-.85)/.15,3):0;
  for(const c of cells){
    const a=clamp((t-c.t0)/HR_ARRIVE);if(a<=0)continue;
    const ea=easeOut(a);
    if(c.kind==='on'&&a>=1)landedOn++;
    else if(c.kind==='on')landedOn+=ea;
    /* other years, and this year's months outside the strip's window, fade as it lands */
    let fade=1,wx=c.wx,wy=c.wy;
    if(L>0){
      if(c.y!==M.year0){
        /* the previous year's tail that the strip shows in its window slides in beside this year */
        const inWin=c.sx+cs>M.clipEnd.x-M.todR.x&&c.sx<=0;
        if(inWin){const tx=M.tod.wx+c.sx,ty=M.tod.wy+c.sy;wx=lerp(wx,tx,L);wy=lerp(wy,ty,L);}
        else fade=1-L;
      }
    }
    if(fade<=0)continue;
    const s=cam.s*(.6+.4*ea),w=cs*s;
    let x=(wx+cs/2-cam.c[0])*cam.s+cam.a[0]-w/2,y=(wy+cs/2-cam.c[1])*cam.s+cam.a[1]-w/2,ww=w,hh=w;
    if(x>cx+cw||x+w<cx||y>box.h||y+w<0)continue;
    const al=Math.round(ea*fade*10);if(!al)continue;
    if(K>0)[x,y,ww,hh]=snap(M,x,y,w,w,K);
    const r=rad*s;
    if(c.kind==='fut'){ const lw=Math.max(.5,cam.s*(.6+.4*ea));const p=add('f'+al,col.fut,col.futA*al/10,lw);
      const h=lw/2;rr(p,x+h,y+h,ww-lw,hh-lw,Math.max(0,r-h)); }
    else{
      const fl=c.kind==='on'?Math.round(clamp(1-(t-c.t0)/HR_FLASH)*4):0;
      rr(add(c.kind+al+'_'+fl,fl?mix(col.on,fl*.07):col[c.kind],al/10),x,y,ww,hh,r);
    }
  }
  for(const g of groups.values()){ctx.globalAlpha=g.alpha;
    if(g.stroke){ctx.strokeStyle=g.style;ctx.lineWidth=g.stroke;ctx.stroke(g.p);}else{ctx.fillStyle=g.style;ctx.fill(g.p);}}
  ctx.globalAlpha=1;
  /* today's ring: the DOM animation's own clock, so the handover does not skip a breath */
  const an=M.ringAnim(),ring=ringAt(an&&an.currentTime!=null?+an.currentTime:t),tc=M.tod;
  {const x=(tc.wx-cam.c[0])*cam.s+cam.a[0],y=(tc.wy-cam.c[1])*cam.s+cam.a[1],i=ring.i*cam.s,lw=M.ringW*cam.s;
   let [rx,ry,rw,rh]=[x-i,y-i,cs*cam.s+2*i,cs*cam.s+2*i];if(K>0)[rx,ry,rw,rh]=snap(M,rx,ry,rw,rh,K);
   ctx.globalAlpha=ring.o;ctx.strokeStyle=col.ring;ctx.lineWidth=lw;const p=new Path2D();
   rr(p,rx+lw/2,ry+lw/2,rw-lw,rh-lw,Math.max(0,ring.r*cam.s-lw/2));ctx.stroke(p);ctx.globalAlpha=1;}
  ctx.restore();
  /* year labels: fade in once the year (this one) and all (the rest) views arrive */
  const lblA=y=>{const since=y===M.year0?T.all-150:T.rest-150;return clamp((t-since)/300)*(1-L);};
  ctx.font=M.font;
  ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillStyle=M.col.label;
  for(const y of M.years){const a=lblA(y);if(a<=0)continue;
    const x=(-cam.c[0])*cam.s+cam.a[0]-(M.labelGap||6),yy=(M.rowY(y)+M.bandH/2-cam.c[1])*cam.s+cam.a[1];
    ctx.globalAlpha=a;ctx.fillText(String(y),x,yy);}
  ctx.globalAlpha=1;
  return landedOn;
}

function play(card){
  if(live||reduced())return false;
  const wrap=card.querySelector('.heatwrap');if(!wrap)return false;
  wrap.scrollLeft=wrap.scrollWidth;                    /* the strip opens on today; so does the landing */
  wrap.dispatchEvent(new Event('scroll'));
  const M=build(card);if(!M)return false;
  M.col.label=getComputedStyle(card).getPropertyValue('--muted').trim()||'#888';
  M.font='600 9px '+(getComputedStyle(card).getPropertyValue('--mono').trim()||'monospace');
  const cv=document.createElement('canvas');cv.className='heat-replay-canvas';cv.setAttribute('aria-hidden','true');
  const dpr=window.devicePixelRatio||1;cv.width=Math.round(M.box.w*dpr);cv.height=Math.round(M.box.h*dpr);
  cv.style.cssText=`left:${M.box.x-card.clientLeft}px;top:${M.box.y-card.clientTop}px;width:${M.box.w}px;height:${M.box.h}px`;
  const ctx=cv.getContext('2d');if(!ctx)return false;
  const num=card.querySelector('.crtotal b'),numHTML=num?.innerHTML,total=num?+num.textContent.replace(/\D/g,''):0;
  card.classList.add('heat-replaying');card.append(cv);
  /* the canvas's backing store must sit on the device-pixel grid, or the whole
     image is resampled by a fraction of a pixel and every edge goes soft. Nudge
     the element onto the grid and draw back by the same amount, so the squares
     land at the DOM's own (fractional) positions and anti-alias the same way. */
  {const r=cv.getBoundingClientRect(),fx=(Math.round(r.left*dpr)-r.left*dpr)/dpr,fy=(Math.round(r.top*dpr)-r.top*dpr)/dpr;
   cv.style.left=(M.box.x-card.clientLeft+fx)+'px';cv.style.top=(M.box.y-card.clientTop+fy)+'px';
   ctx.setTransform(dpr,0,0,dpr,-fx*dpr,-fy*dpr);
   const r2=cv.getBoundingClientRect();const w2=M.wrap.getBoundingClientRect();M.org={x:r2.left-fx,y:r2.top-fy,d:dpr,wx:w2.left,wy:w2.top};}
  const t0=performance.now();let raf=0,paused=null;
  const frame=(now)=>{
    if(!cv.isConnected){cleanup(false);return;}
    const t=paused!=null?paused:now-t0;
    if(t>=M.T.end){finish();return;}
    const landed=draw(M,ctx,t);
    if(num)num.textContent=fmt(Math.min(total,Math.round(total*landed/Math.max(1,M.onTotal))));
    raf=requestAnimationFrame(frame);
  };
  const onTap=e=>{if(e.target.closest?.('.heat-replay'))return;finish();};
  const onHide=()=>{if(document.hidden)finish();};
  function cleanup(reveal){
    cancelAnimationFrame(raf);document.removeEventListener('pointerdown',onTap,true);document.removeEventListener('visibilitychange',onHide);
    if(num&&numHTML!=null)num.innerHTML=numHTML;
    cv.remove();card.classList.remove('heat-replaying');
    if(reveal){card.classList.add('heat-replayed');setTimeout(()=>card.classList.remove('heat-replayed'),400);}
    live=null;
  }
  function finish(){cleanup(true);}
  setTimeout(()=>document.addEventListener('pointerdown',onTap,true),0);
  document.addEventListener('visibilitychange',onHide);
  live={finish,M,
    /* for the checks: stop the clock at t ms and draw that frame */
    seek(t){paused=t;cancelAnimationFrame(raf);const landed=draw(M,ctx,Math.min(t,M.T.end-0.001));if(num)num.textContent=fmt(Math.min(total,Math.round(total*landed/Math.max(1,M.onTotal))));},
    resume(){paused=null;raf=requestAnimationFrame(frame);}};
  raf=requestAnimationFrame(frame);
  return true;
}
/* v4.6.128: SHARE IT. The same replay, drawn into the plate share's 1080x1280
   frame with the plate share's footer, through the same sheet and the same
   Image / Video / GIF exporters. It does NOT land back on the strip: the strip
   is a place to scroll, and a video cannot be scrolled. It ends on every year
   at once, which is the picture worth sending -- and the still image is that
   last frame. Nothing is recomputed: the model is read from the card's cells. */
const HR_EXPORT_END=HR_T.hold+HR_T.week+HR_T.year+HR_T.all+HR_T.rest+300;
async function share(card){
  if(live)live.finish();
  const M0=build(card);if(!M0)return;
  const css=getComputedStyle(document.documentElement),read=(k,f)=>css.getPropertyValue(k).trim()||f;
  const dark=document.documentElement.dataset.theme==='dark';
  const data={surface:read('--surface','#fff'),ink:read('--chalk','#1c1c1c'),muted:read('--muted','#686868'),line:read('--line','#ededed'),
    accent:read('--accent','#2F4BD8'),name:(typeof firstName==='function'&&firstName())||'',logo:null,dark};
  let gifModule,videoModule;
  try{[gifModule,videoModule]=await Promise.all([import('./plate-gif.js'),import('./plate-video.js')]);await gifModule.loadExportFonts();}catch(_e){}
  try{const logo=new Image();logo.src='assets/mascot-mark-'+(dark?'white':'chrome')+'.png';await logo.decode();data.logo=logo;}catch(_e){}
  const sans='"ShowUp Export Plex", "IBM Plex Sans",sans-serif';
  const box={x:0,y:0,w:940,h:720},BX=70,BY=380;
  const M=Object.assign({},M0,{box,labelGap:18,font:'600 24px '+sans,ringAnim:()=>null});
  M.col={...M0.col,label:data.muted};
  M.K=frames(M,box,96);
  const total=+(card.querySelector('.crtotal b')?.textContent||'0').replace(/\D/g,'');
  const since=(card.querySelector('.crsince>span')?.textContent||'').trim();
  const sub=document.createElement('canvas');sub.width=box.w;sub.height=box.h;const sx=sub.getContext('2d');
  const render=(time,canvas)=>{
    const cv=canvas||document.createElement('canvas');cv.width=1080;cv.height=1280;const x=cv.getContext('2d');if(!x)return null;
    const t=Number.isFinite(time)?clamp(time,0,HR_EXPORT_END):HR_EXPORT_END;
    x.fillStyle=data.surface;x.fillRect(0,0,1080,1280);
    const text=(s,X,Y,font,c,align='center')=>{x.font=font;x.fillStyle=c;x.textAlign=align;x.textBaseline='alphabetic';x.fillText(s,X,Y);};
    text('YOU KEEP SHOWING UP',540,98,'500 25px '+sans,data.muted);
    const landed=draw(M,sx,t),n=fmt(Math.min(total,Math.round(total*landed/Math.max(1,M.onTotal))));
    x.font='700 132px '+sans;const nw=x.measureText(n).width;x.font='400 34px '+sans;const uw=x.measureText(' days in').width;
    const left=540-(nw+uw)/2;text(n,left,262,'700 132px '+sans,data.accent,'left');text(' days in',left+nw,262,'400 34px '+sans,data.muted,'left');
    if(since)text(since,540,318,'400 26px '+sans,data.muted);
    x.drawImage(sub,BX,BY);
    if(typeof drawShareFooter==='function')drawShareFooter(x,data,sans);
    return cv;
  };
  await showCard(()=>render(),'showup-every-day-'+todayISO,false);
  if(gifModule&&videoModule&&typeof bindPlateExport==='function')bindPlateExport(data,null,gifModule,videoModule,{render,label:'Replay video preview',duration:HR_EXPORT_END});
}
/* v4.6.128: FROM THE FINISH SCREEN. "See it all" leaves the ceremony, opens
   Stats on this card, and plays the replay from the square you just filled.
   Reduced motion: it opens the card and stops there -- the end state. */
async function seeAll(){
  document.querySelector('nav button[data-v="stats"]')?.click();
  let card=null;for(let i=0;i<30&&!card;i++){await new Promise(r=>setTimeout(r,50));card=document.querySelector('#view .crcard:not(.resting)');}
  if(!card)return false;
  card.scrollIntoView({block:'center',behavior:reduced()?'auto':'smooth'});
  if(reduced())return true;
  await new Promise(r=>setTimeout(r,650));
  return card.isConnected&&play(card);
}
document.addEventListener('click',e=>{
  const b=e.target.closest?.('.heat-replay,.heat-share');if(!b)return;
  const card=b.closest('.crcard');if(!card)return;
  if(b.classList.contains('heat-share')){b.disabled=true;share(card).catch(()=>toast('Could not prepare the export. Please try again.')).finally(()=>{b.disabled=false;});}
  else play(card);
});
window.heatReplay={play,share,seeAll,get live(){return live;},finish(){live?.finish();},duration:()=>Object.values(HR_T).reduce((a,b)=>a+b,0),exportEnd:HR_EXPORT_END};
})();
