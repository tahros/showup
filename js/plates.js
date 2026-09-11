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
function plateStatsHTML(){
  const m=plateCurrent();if(!m.sets)return '';
  const done=!!DB.days?.[todayISO]?.doneAll;
  return `<h2>${done?'Today completed':'Your work, stacking up'}</h2><div class="card plate-card"><button type="button" class="plate-replay" aria-label="Replay today's plate stack"><div class="plate-scene"><svg viewBox="0 0 300 190" role="img" aria-label="Today's volume, one plate per 500 pounds of work"><ellipse cx="126" cy="178" rx="111" ry="8" fill="currentColor" opacity=".07"/><g id="plate-stack"></g></svg>${mascotHTML(done?'cool':'hello')}</div><div class="plate-total"><b>${plateNumber(m.kg)}</b> ${U()} moved</div><div class="plate-caption">${m.sets} set${m.sets===1?'':'s'} · ${m.exercises} exercise${m.exercises===1?'':'s'}</div><div class="plate-caption">1 plate = ${isLb()?'500 lb':'≈227 kg'} of work</div><div class="plate-bank"></div><div class="plate-caption">Tap to replay</div></button></div>`;
}
let plateCancel=()=>{};
function bindPlateStats(){
  plateCancel();const host=document.querySelector('.plate-card'),stack=document.getElementById('plate-stack');if(!host||!stack)return;
  const m=plateCurrent(),unit=500/LB,count=Math.ceil(m.kg/unit),bank=Math.max(0,Math.floor((count-1)/30))*30;
  host.querySelector('.plate-bank').textContent=bank?`${bank/10} completed stacks + current stacks`:'';
  // Three stacks plus the mascot at a fixed scale. Completed groups bank.
  for(let i=bank;i<count;i++){
    const n=i-bank,g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.dataset.index=i;g.innerHTML=plateMark(7+Math.floor(n/10)*67,167-(n%10)*13,57,9*Math.min(1,(m.kg-i*unit)/unit));stack.append(g);
  }
  let animations=[],layer=null,ended=false,startY=window.scrollY,playRequest=0;
  const cancel=()=>{animations.forEach(a=>a.cancel());animations=[];layer?.remove();layer=null;stack.querySelectorAll('g').forEach(g=>g.style.visibility='');};
  // Stats' own horizontal charts scroll during setup (and smooth-scroll later).
  // Their events are not movement of the viewport or of our landing targets.
  const onScroll=e=>{if((e.target===document||e.target===window)&&Math.abs(window.scrollY-startY)>2)cancel();};
  window.addEventListener('scroll',onScroll,{passive:true,capture:true});
  const observer=new MutationObserver(()=>{if(!host.isConnected){ended=true;cancel();window.removeEventListener('scroll',onScroll,true);observer.disconnect();}});
  observer.observe(document.getElementById('view'),{childList:true});
  plateCancel=()=>{ended=true;cancel();window.removeEventListener('scroll',onScroll,true);observer.disconnect();};
  const play=async(replay=false)=>{
    cancel();startY=window.scrollY;const seen=replay?0:Math.min(m.kg,plateSeen());
    const candidates=[...stack.children].filter(g=>replay||Number(g.dataset.index)>=Math.floor(seen/unit)&&m.kg>seen);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced||!Element.prototype.animate){plateRemember(m.kg);return;}
    if(!candidates.length){animations.push(stack.animate([{translate:'0 0'},{translate:'0 2px',offset:.5},{translate:'0 0'}],{duration:400}));plateRemember(m.kg);return;}
    // A viewport overlay makes the entry edge the SCREEN top, not the card top.
    layer=document.createElementNS('http://www.w3.org/2000/svg','svg');layer.classList.add('plate-fall-layer');layer.setAttribute('aria-hidden','true');layer.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);document.body.append(layer);
    const promises=[];
    candidates.forEach((g,i)=>{
      const rect=g.getBoundingClientRect(),box=g.getBBox(),copy=document.createElementNS('http://www.w3.org/2000/svg','svg');
      copy.setAttribute('x',rect.left);copy.setAttribute('y',rect.top);copy.setAttribute('width',rect.width);copy.setAttribute('height',rect.height);copy.setAttribute('viewBox',`${box.x} ${box.y} ${box.width} ${box.height}`);copy.style.overflow='visible';copy.innerHTML=g.innerHTML;layer.append(copy);g.style.visibility='hidden';
      const dir=i%2?1:-1,delay=i*160;
      const a=copy.animate([{transform:`translate(${dir*12}px,${-rect.bottom-40}px) rotate(${dir*7}deg)`,easing:'cubic-bezier(.42,0,.78,.55)'},{transform:'translate(0,2px) rotate(-1deg)',offset:.7},{transform:'translate(0,-5px) rotate(1deg)',offset:.83},{transform:'translate(0,0)',offset:1}],{duration:850,delay,fill:'both'});
      animations.push(a);promises.push(a.finished.then(()=>{g.style.visibility='';copy.remove();},()=>{}));
    });
    const activeLayer=layer;await Promise.all(promises);
    if(ended||layer!==activeLayer)return;layer.remove();layer=null;plateRemember(m.kg);
    const mascot=host.querySelector('.su-mascot');if(mascot)animations.push(mascot.animate([{transform:'translateY(0)'},{transform:'translateY(-10px)',offset:.5},{transform:'translateY(0)'}],{duration:600}));
  };
  const settledPlay=async(replay=false)=>{
    const request=++playRequest;
    // paint() positions chart scrollers and the viewport after renderStats().
    // Measure only once that work and the card's entrance have completed.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(ended||!host.isConnected||request!==playRequest)return;
    const entry=(host.getAnimations?.()||[]).filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime));
    await Promise.allSettled(entry.map(a=>a.finished));
    if(!ended&&host.isConnected&&request===playRequest)play(replay);
  };
  host.querySelector('.plate-replay').onclick=()=>settledPlay(true);
  settledPlay();
}
