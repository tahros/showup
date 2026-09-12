/* Canvas uses card-local coordinates: no SVG/CSS transform disagreement on iOS.
   Queued plates are not drawn. Positive y always travels down from the card sky. */
/* v4.2.5: the card says WHICH DAY, in the completion moment's own words.
   The number, the sets and the exercises were all here; the date was not, so
   the card read as "some day's work" on a screen you reach any time. Same
   format and same mono caps as the ceremony -- one voice for one fact. */
function plateDateLabel(){
  const d=new Date(todayISO+'T00:00');
  return d.toLocaleDateString('en-US',{weekday:'long'})+' \u00b7 '+
         d.toLocaleDateString('en-US',{month:'long',day:'numeric'});
}
function plateStatsHTML(){
  const m=plateCurrent();if(!m.sets)return '';
  const done=!!DB.days?.[todayISO]?.doneAll;
  return `<h2>${done?'Today completed':'Your work, stacking up'}</h2><div class="card plate-card"><div class="plate-heading"><span></span><div class="plate-date">${plateDateLabel()}</div><button type="button" class="plate-share ico" aria-label="Share this workout">${ICO_SHARE}</button></div><div class="plate-scene"><canvas class="plate-canvas" role="img" aria-label="Today's lifted volume as stacked plates"></canvas>${mascotMode()==='off'?'':'<span class="plate-mascot-shadow" aria-hidden="true"></span>'+'<button type="button" class="plate-mascot-button" aria-label="Make the mascot jump">'+mascotHTML(done?'cool':'jump')+'</button>'}</div><div class="plate-total"><b>${plateNumber(m.kg)}</b> ${U()} moved</div><div class="plate-caption">${m.sets} set${m.sets===1?'':'s'} · ${m.exercises} exercise${m.exercises===1?'':'s'}</div><div class="plate-legend">${[...new Set(plateLedger(DB.days?.[todayISO]).map(p=>p.part))].map(p=>`<span><i style="background:${PART_COLORS[p]||'var(--muted)'}"></i>${pgEscape(p||'Other')}</span>`).join('')}</div><div class="plate-bank"></div><button type="button" class="plate-replay" aria-label="Replay today's plate stack">↻ <span>Tap to replay</span></button><span class="plate-announcement" aria-live="polite"></span></div>`;
}
// Pure position calculation shared with browser regression tests.
function platePose(age,landingY,direction){
  if(age<0)return null;
  if(age<340){const p=age/340;return {y:-38+(landingY+38)*p*p,angle:direction*Math.PI*.1*(1-.55*p),landed:false};}
  const s=Math.min(1,(age-340)/110);
  return {y:landingY-3*Math.sin(s*Math.PI)*(1-s),angle:direction*.035*Math.sin(s*Math.PI*2)*(1-s),landed:true};
}
let plateCancel=()=>{};
function bindPlateStats(){
  plateCancel();const host=document.querySelector('.plate-card');if(!host)return;
  const canvas=host.querySelector('.plate-canvas'),ctx=canvas.getContext('2d');if(!ctx){host.querySelector('.plate-replay').hidden=true;return;}
  const m=plateCurrent(),unit=500/LB,ledger=plateLedger(DB.days?.[todayISO]),count=ledger.length,bank=Math.max(0,Math.floor((count-1)/30))*30;
  host.querySelector('.plate-bank').textContent=bank?`${bank/10} completed stacks + current stacks`:'';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),number=host.querySelector('.plate-total b'),announcement=host.querySelector('.plate-announcement');
  const bankKg=bank?ledger[bank-1].end:0;
  let raf=0,start=0,playing=false,ended=false,request=0,width=0,height=255,from=m.kg,first=count,tone;
  function colors(){const probe=document.createElement('span');host.append(probe);const read=k=>{probe.style.color=`var(${k})`;return getComputedStyle(probe).color;};tone={top:read('--plate-top'),side:read('--plate-side'),hole:read('--plate-hole')};probe.remove();}
  function mist(x,y,rx,ry,alpha){ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(130,130,130,${alpha})`);g.addColorStop(.45,`rgba(150,150,150,${alpha*.5})`);g.addColorStop(1,'rgba(160,160,160,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();}
  function plate(x,y,w,h,angle,part){const token=PART_COLORS[part];const top=token?getComputedStyle(document.documentElement).getPropertyValue(token.slice(4,-1)).trim():null;const shade=f=>{const hex=top?.replace('#','');return hex?.length===6?'#'+[0,2,4].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*f).toString(16).padStart(2,'0')).join(''):tone.side;};ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=top?shade(.70):tone.side;ctx.beginPath();ctx.ellipse(0,h,w/2,7,0,0,Math.PI*2);ctx.fill();ctx.fillRect(-w/2,0,w,h);ctx.fillStyle=top||tone.top;ctx.beginPath();ctx.ellipse(0,0,w/2,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=top?shade(.42):tone.hole;ctx.beginPath();ctx.ellipse(0,0,4.5,2,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  function geom(i){const n=i-bank;return {x:width*(.2+Math.floor(n/10)*.19),y:height-29-(n%10)*12,w:width*.166,h:8*Math.min(1,ledger[i].kg/unit)};}
  function draw(t){
    if(!width)return;ctx.clearRect(0,0,width,height);let landed=from;
    for(let c=0;c<Math.min(3,Math.ceil((count-bank)/10));c++)mist(width*(.2+c*.19),height-17,width*.115,8,.19);
    // Draw the grounded stack first, falling plates second, then impact dust.
    for(let pass=0;pass<2;pass++)for(let i=bank;i<count;i++){
      const age=i<first?1e6:t-(i-first)*70,g=geom(i),pose=platePose(age,g.y,i%2?-1:1);
      if(!pose)continue;
      if(pose.landed){landed=Math.max(landed,Math.min(m.kg,ledger[i].end));if(pass===0)plate(g.x,pose.y,g.w,g.h,pose.angle,ledger[i].part);}
      else if(pass===1){for(let k=1;k<4;k++)mist(g.x,pose.y-10-k*7,5+k,3+k,.013*(1-k/5));plate(g.x,pose.y,g.w,g.h,pose.angle,ledger[i].part);}
      if(pass===1){const a=age-340;if(a>=0&&a<440){const p=a/440;for(const side of [-1,1])mist(g.x+side*(g.w*.38+p*17),g.y+3-p*8,7+p*13,3+p*7,.09*Math.sin(Math.PI*p));}}
    }
    const label=plateNumber(landed);if(number.textContent!==label)number.textContent=label;
  }
  function rest(){host.classList.remove('plate-running');canvas.dataset.playing='false';}
  function stop(){cancelAnimationFrame(raf);raf=0;playing=false;rest();from=m.kg;first=count;draw(1e6);}
  function tick(now){if(ended||!host.isConnected)return;const t=now-start;draw(t);if(t<(count-first-1)*70+780)raf=requestAnimationFrame(tick);else{playing=false;rest();plateRemember(m.kg);announcement.textContent=`${plateNumber(m.kg)} ${U()} moved`;}}
  function play(replay=false){
    stop();colors();from=replay?bankKg:Math.max(bankKg,Math.min(m.kg,plateSeen()));first=Math.max(bank,ledger.findIndex(p=>p.end>from+1e-8));if(first<bank)first=count;
    if(reduced.matches||from>=m.kg||!count){from=m.kg;first=count;draw(1e6);plateRemember(m.kg);return;}
    playing=true;canvas.dataset.playing='true';announcement.textContent='';start=performance.now();
    if(mascotMode()==='animated'){host.classList.add('plate-running');host.querySelector('.su-mascot')?.dispatchEvent(new Event('mascotreplay'));}
    draw(0);raf=requestAnimationFrame(tick);
  }
  function resizeCanvas(){width=canvas.clientWidth;const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=height*dpr;if(typeof ctx.setTransform==='function')ctx.setTransform(dpr,0,0,dpr,0,0);draw(playing?performance.now()-start:1e6);}
  const resize=typeof ResizeObserver==='undefined'?{observe(){resizeCanvas();window.addEventListener('resize',resizeCanvas);},disconnect(){window.removeEventListener('resize',resizeCanvas);}}:new ResizeObserver(resizeCanvas);
  const observer=new MutationObserver(()=>{if(!host.isConnected)dispose();});
  function visibility(){if(document.hidden){request++;stop();}}
  function motionChange(){if(reduced.matches){request++;stop();}}
  const themeObserver=new MutationObserver(()=>{colors();draw(playing?performance.now()-start:1e6);});
  function dispose(){if(ended)return;ended=true;request++;cancelAnimationFrame(raf);resize.disconnect();observer.disconnect();themeObserver.disconnect();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',motionChange);}
  async function settledPlay(replay=false){const ticket=++request;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));if(ended||ticket!==request)return;await Promise.allSettled((host.getAnimations?.()||[]).filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished));if(!ended&&!document.hidden&&ticket===request)play(replay);}
  colors();resize.observe(canvas);observer.observe(document.getElementById('view'),{childList:true});themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',motionChange);
  host.querySelector('.plate-share').onclick=()=>{if(DB.days?.[todayISO]?.doneAll)return sharePlateCard();return showCard(()=>{const cv=document.createElement('canvas');cv.width=cv.height=1080;const x=cv.getContext('2d');if(!x)return null;drawDayCard(x,1080,todayISO);return cv;},'showup-'+todayISO,false);};
  host.querySelector('.plate-mascot-button')?.addEventListener('click',()=>{
    if(reduced.matches||mascotMode()!=='animated')return;
    const el=host.querySelector('.su-mascot');el?.dispatchEvent(new Event('mascotreplay'));
    if(!el?.classList.contains('su-ready'))el?.animate?.([{transform:'translateY(0)'},{transform:'translateY(-20px)',offset:.4},{transform:'translateY(0)'}],{duration:700,easing:'ease-in-out'});
    host.querySelector('.plate-mascot-shadow')?.animate?.([{transform:'scaleX(1)',opacity:1},{transform:'scaleX(.65)',opacity:.4,offset:.4},{transform:'scaleX(1)',opacity:1}],{duration:700});
  });
  plateCancel=dispose;host.querySelector('.plate-replay').onclick=()=>settledPlay(true);settledPlay();
}
