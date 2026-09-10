/* Set history. A point is a stored set, never independently chosen maxima.
   UI-only state: no DB writes, plan reads, migrations, or exercise-name merges. */
const progressionUI = Object.create(null);
const pgEscape = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pgNumber = v => (typeof v==='number'||typeof v==='string'&&v.trim()!=='' && /^[-+]?\d*\.?\d+$/.test(v)) && Number.isFinite(+v) ? +v : null;
const pgDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d+'T00:00:00Z')) && new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const pgShortDate = d => `${+d.slice(5,7)}/${+d.slice(8,10)}`;
const pgDuration = s => `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`;
const pgDecimal = n => String(Math.round(n*100)/100);

function progressionRows(){
  const source=SEED.sessions||{}, local=DB.days||{};
  return [...new Set([...Object.keys(source),...Object.keys(local)])].filter(d=>pgDate(d)&&d<=todayISO).sort().map(d=>({d,
    rows:(Array.isArray(local[d]?.w)?local[d].w:source[d]||[]).map(s=>Array.isArray(s)?
      {part:s[0],ex:s[1],w:s[2],reps:s[3],mins:s[4],secs:s[5],su:s[7]}:s).filter(s=>s&&typeof s.ex==='string'&&s.completed!==false)
  }));
}
function progressionData(ex){
  const records=[], omitted=[];
  const body=isBody(ex);
  for(const {d,rows} of progressionRows()){
    let ordinal=0;
    rows.filter(s=>s.ex===ex).forEach(s=>{
      const load=pgNumber(s.w), vals=ex==='Run'?[1]:Array.isArray(s.reps)&&s.reps.length?s.reps:[null];
      vals.forEach(raw=>{
        ordinal++;
        const count=pgNumber(raw), seconds=(pgNumber(s.mins)||0)*60+(pgNumber(s.secs)||0);
        const kind=ex==='Run'?'run':s.su==='s'?'time':load===null?'unknown':load<0?'assisted':body?(load===0?'body':'added'):load>0?'load':'unknown';
        const r={d,ordinal,load,count,seconds:seconds>0?seconds:null,kind,id:`${d}:${ordinal}`};
        if(kind==='run'?load!==null&&load>0:count!==null&&count>0){ records.push(r); }
        else omitted.push({...r,reason:kind==='run'?'distance not recorded':raw===null?'reps not recorded':String(raw)});
      });
    });
  }
  return {records,omitted};
}
function progressionValue(r){
  return r.kind==='run'?toD(r.load):['time','body','unknown'].includes(r.kind)?r.count:toU(Math.abs(r.load));
}
function progressionRead(r){
  const d=new Date(r.d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
  let value;
  if(r.kind==='run') value=`${toD(r.load).toFixed(2)} ${DU()} · ${r.seconds?pgDuration(r.seconds):'time not recorded'}`;
  else if(r.kind==='time') value=`${r.load===0?'BW':r.load===null?'load not recorded':pgDecimal(toU(r.load))+' '+U()} · ${pgDuration(r.count)}`;
  else value=`${r.kind==='body'?'BW':r.kind==='unknown'?'load not recorded':r.kind==='assisted'?pgDecimal(toU(-r.load))+' '+U()+' assistance':(r.kind==='added'?'BW + ':'')+pgDecimal(toU(r.load))+' '+U()} × ${r.count}`;
  return `${d} · ${r.kind==='run'?'Run':'Set'} ${r.ordinal} · ${value}`;
}
const pgKinds={load:'Weight',body:'Reps',added:'Added weight',assisted:'Assistance',time:'Time',run:'Distance',unknown:'Reps · load not recorded'};
function progressionAxis(kind){return pgKinds[kind]+(['load','added','assisted'].includes(kind)?' · '+U():kind==='run'?' · '+DU():kind==='time'?' · seconds':'');}
function progressionBest(records){
  const best=new Map();
  for(const r of records){
    if(['run','unknown'].includes(r.kind)) continue;
    const key=r.kind+':'+(r.load===null?'?':r.load.toFixed(3));
    best.set(key,Math.max(best.get(key)||0,r.count));
  }
  return r=>!['run','unknown'].includes(r.kind)&&r.count===best.get(r.kind+':'+(r.load===null?'?':r.load.toFixed(3)));
}
function progressionSection(ex,role='train',picker=false){
  const state=progressionUI[role]||(progressionUI[role]={mode:'recent'});
  if(state.ex!==ex){state.ex=ex;state.focus=null;state.kind=null;state.year=null;state.pick=null;}
  return `<section class="progression-section" data-pg-role="${role}"><h2>${role==='live'?'Training now':'Progression'}${hActs('pg-'+role,'Numbers are completed sets. Tap or hold-drag to read. Year opens the full calendar with session detail.','About exercise progression')}</h2><div class="card progression-card" data-pg-ex="${pgEscape(ex)}" data-pg-picker="${picker?'1':''}"></div></section>`;
}
function progressionStatsSection(){
  const names=[...new Set(progressionRows().flatMap(d=>d.rows.map(s=>s.ex)))].sort((a,b)=>a.localeCompare(b));
  if(!names.length) return '';
  const previous=progressionUI.stats?.ex;
  const ex=names.includes(previous)?previous:names.includes('Incline Barbell Bench Press')?'Incline Barbell Bench Press':names[0];
  return progressionSection(ex,'stats',true);
}
function progressionLiveSection(){
  const t=DB.days[todayISO];
  if(!t||!Array.isArray(t.w)||!t.w.length||t.doneAll) return '';
  const ex=liftBack()?.ex||t.w[t.w.length-1].ex;
  return ex?progressionSection(ex,'live'):'';
}

/* Calendar space is reserved even when nothing was logged. Never project
   future training or collapse a year into a last-N-session sparkline. */
function progressionPlot(records,kind,{year=null,dates=[],width=330,best,focus,pick}={}){
  const annual=year!==null, left=38, right=8, top=28, bottom=222, h=254;
  let stepX=kind==='run'?42:20;
  const labelFor=r=>kind==='run'?(r.seconds?pgDuration(r.seconds):'—'):String(r.count);
  const minSpacing=Math.max(kind==='run'?42:16,...records.map(r=>labelFor(r).length*6.7+2));
  let column=0;
  if(!annual){
    for(const d of dates){const groups=new Map(); records.filter(r=>r.d===d).forEach(r=>{const v=progressionValue(r).toFixed(5);groups.set(v,(groups.get(v)||0)+1);});column=Math.max(column,...groups.values());}
    stepX=Math.max(minSpacing,Math.min(20,((width-left-right)/Math.max(1,dates.length)-4)/Math.max(1,column)));
    width=Math.max(width,left+right+dates.length*Math.max(62,column*stepX+4));
  }
  const values=records.map(progressionValue), low=values.length?Math.min(...values):0, high=values.length?Math.max(...values):1;
  const minStep=kind==='run'?.25:['time'].includes(kind)?15:['body','unknown'].includes(kind)?1:isLb()?5:2.5;
  const raw=(high-low||minStep*3)/12;
  const step=Math.max(minStep,Math.ceil(raw/minStep)*minStep);
  const lo=Math.max(0,Math.floor(low/step)*step-step), hi=Math.ceil(high/step)*step+step;
  const Y=v=>kind==='assisted'?top+(v-lo)/(hi-lo)*(bottom-top):bottom-(v-lo)/(hi-lo)*(bottom-top);
  let svg=`<svg class="pg-plot ${annual?'pg-year':'pg-detail'}" viewBox="0 0 ${width} ${h}" style="width:${width}px" role="group" aria-label="${annual?year+' annual overview':'Set history'}: ${pgEscape(progressionAxis(kind))}">`;
  if(annual&&+year===+todayISO.slice(0,4)){
    const end=Date.UTC(+year+1,0,1),start=Date.UTC(+year,0,1),next=Date.parse(todayISO+'T00:00:00Z')+86400000;
    const x=left+Math.min(1,(next-start)/(end-start))*(width-left-right);
    svg+=`<rect class="pg-future" x="${x}" y="${top}" width="${Math.max(0,width-right-x)}" height="${bottom-top}"/>`;
  }
  for(let v=lo;v<=hi+step*.001;v+=step){
    const y=Y(v),label=kind==='added'&&v===0?'BW':pgDecimal(v);
    svg+=`<line class="pg-grid" x1="${left}" x2="${width-right}" y1="${y}" y2="${y}"/><text class="pg-axis" x="${left-8}" y="${y+3}" text-anchor="end">${label}</text>`;
  }
  const byKey=new Map();records.forEach(r=>{const k=r.d+':'+progressionValue(r).toFixed(5);if(!byKey.has(k))byKey.set(k,[]);byKey.get(k).push(r);});
  const xDate=d=>annual?left+(Date.parse(d+'T00:00:00Z')-Date.UTC(+year,0,1))/(Date.UTC(+year+1,0,1)-Date.UTC(+year,0,1))*(width-left-right):left+(dates.indexOf(d)+.5)*(width-left-right)/Math.max(1,dates.length);
  if(focus&&annual){const x=xDate(focus);svg+=`<line class="pg-focusline" x1="${x}" x2="${x}" y1="${top}" y2="${bottom}"/>`;}
  for(const r of records){
    const same=byKey.get(r.d+':'+progressionValue(r).toFixed(5));
    const offset=(same.indexOf(r)-(same.length-1)/2)*(annual?1.3:stepX);
    const x=Math.max(left,Math.min(width-right,xDate(r.d)+offset)),y=Y(progressionValue(r));
    const winning=best(r),text=kind==='run'?(r.seconds?pgDuration(r.seconds):'—'):kind==='time'?pgDecimal(r.count):String(r.count);
    svg+=`<g class="pg-set${winning?' pg-best':''}${pick===r.id?' pick':''}" data-pg-record="${r.id}" data-x="${x}" data-y="${y}" ${annual?'':`tabindex="0" role="button" aria-label="${pgEscape(progressionRead(r)+(winning?' · best at this load':''))}"`} transform="translate(${x} ${y})"><title>${pgEscape(progressionRead(r))}</title>`;
    const markWidth=Math.max(18,text.length*6.7+2);
    svg+=annual?`<circle r="2.1"/>`:kind==='run'?`<rect x="${-(stepX-4)/2}" y="-10" width="${stepX-4}" height="20" rx="10"/><text text-anchor="middle" dy="3.5">${text}</text>`:`<circle r="${text.length>2?markWidth/2:Math.min(9,stepX*.45)}"/><text text-anchor="middle" dy="3.5">${text}</text>`;
    svg+='</g>';
  }
  if(annual){
    const months='JFMAMJJASOND';for(let m=0;m<12;m++){const d=`${year}-${String(m+1).padStart(2,'0')}-15`;svg+=`<text class="pg-axis" x="${xDate(d)}" y="246" text-anchor="middle">${months[m]}</text>`;}
  }else dates.forEach(d=>{svg+=`<text class="pg-date" x="${xDate(d)}" y="246" text-anchor="middle">${pgShortDate(d)}</text>`;});
  return svg+'</svg>';
}
function renderProgression(card){
  const role=card.closest('[data-pg-role]').dataset.pgRole, state=progressionUI[role], ex=state.ex;
  const data=progressionData(ex), all=data.records;
  const kinds=[...new Set(all.map(r=>r.kind))];
  if(!kinds.includes(state.kind)) state.kind=kinds[kinds.length-1]||'load';
  const typed=all.filter(r=>r.kind===state.kind);
  const years=[...new Set([...typed,...data.omitted].map(r=>r.d.slice(0,4)))].sort();
  if(!years.includes(state.year))state.year=years[years.length-1]||todayISO.slice(0,4);
  const scope=state.mode==='year'?typed.filter(r=>r.d.startsWith(state.year)):typed;
  const dates=[...new Set(scope.map(r=>r.d))];
  if(!dates.includes(state.focus))state.focus=dates[dates.length-1];
  const width=Math.max(240,Math.round(card.clientWidth?card.clientWidth-32:Math.min(window.innerWidth-64,680)));
  const count=width>=440?4:3;
  const end=Math.min(dates.length,Math.max(count,dates.indexOf(state.focus)+1));
  const recent=dates.slice(Math.max(0,end-count),end), visible=scope.filter(r=>recent.includes(r.d));
  const best=progressionBest(scope);
  const tip=card.closest('section').querySelector('.tipbubble');
  if(tip)tip.textContent=state.kind==='run'?'Distance by date; numbers are elapsed times, not pace. Tap or hold-drag a set. Year opens session detail.':state.kind==='unknown'?'Load was not recorded; only reps are plotted. Tap or hold-drag a set. Year opens session detail.':`Blue: most ${state.kind==='time'?'seconds':'reps'} at the same load in this range. Tap or hold-drag a set. Year opens session detail.`;
  const shown=state.mode==='year'?scope:visible;
  if(!shown.some(r=>r.id===state.pick))state.pick=null;
  card._pg={role,state,data,scope,dates,recent,visible,count,end};
  const names=card.dataset.pgPicker?[...new Set(progressionRows().flatMap(d=>d.rows.map(s=>s.ex)))].sort((a,b)=>a.localeCompare(b)):[];
  const options=names.map(n=>`<option${ex===n?' selected':''}>${pgEscape(n)}</option>`).join('');
  const picker=names.length?`<select class="pg-ex" data-pg-action="exercise" aria-label="Exercise history">${options}</select>`:`<h3 class="pg-title">${pgEscape(ex)}</h3>`;
  let h=`${picker}<div class="pg-toolbar"><div class="pg-modes" role="group" aria-label="History range"><button data-pg-action="recent" aria-pressed="${state.mode==='recent'}">Recent</button><button data-pg-action="year" aria-pressed="${state.mode==='year'}">Year</button></div>${state.mode==='year'?`<select data-pg-action="year-select" aria-label="History year">${(years.length?years:[state.year]).map(y=>`<option${state.year===y?' selected':''}>${y}</option>`).join('')}</select>`:''}</div>`;
  if(kinds.length>1)h+=`<select class="pg-kind" data-pg-action="kind" aria-label="Measurement type">${kinds.map(k=>`<option value="${k}"${k===state.kind?' selected':''}>${pgEscape(pgKinds[k])}</option>`).join('')}</select>`;
  h+=`<div class="pg-axis-title">${pgEscape(progressionAxis(state.kind))}</div>`;
  if(!scope.length) h+=`<p class="pg-empty">No measured sets yet. Your completed sets will appear here.</p>`;
  else{
    if(state.mode==='year')h+=`<div class="pg-scroll" data-pg-surface="year">${progressionPlot(scope,state.kind,{year:state.year,width,best,focus:state.focus,pick:state.pick})}</div><div class="pg-detail-head"><span>Session detail</span><select data-pg-action="date" aria-label="Session date">${dates.map(d=>`<option value="${d}"${state.focus===d?' selected':''}>${pgShortDate(d)} · ${d.slice(0,4)}</option>`).join('')}</select></div>`;
    h+=`<div class="pg-scroll" data-pg-surface="detail">${progressionPlot(visible,state.kind,{dates:recent,width,best,pick:state.pick})}</div><div class="pg-pages"><button data-pg-action="prev" aria-label="Earlier sessions"${end<=count?' disabled':''}>‹</button><span>${recent[0]?.slice(0,4)||''}${recent.at(-1)?.slice(0,4)!==recent[0]?.slice(0,4)?' / '+recent.at(-1).slice(0,4):''}</span><button data-pg-action="next" aria-label="Later sessions"${end>=dates.length?' disabled':''}>›</button></div>`;
    const chosen=shown.find(r=>r.id===state.pick);
    h+=`<div class="pg-read" aria-live="polite">${chosen?pgEscape(progressionRead(chosen)):'Tap a set to read'}</div>`;
  }
  const omitted=data.omitted.filter(r=>state.mode!=='year'||r.d.startsWith(state.year));
  if(omitted.length)h+=`<details class="pg-unmeasured"><summary>Unplotted entries · ${omitted.length}</summary>${omitted.map(r=>`<div>${pgShortDate(r.d)} · Set ${r.ordinal} · ${pgEscape(r.reason)}</div>`).join('')}</details>`;
  card.innerHTML=h;
  card.querySelectorAll('[data-pg-surface]').forEach(bindProgressionSurface);
}
function progressionPick(card,id,annual=false){
  const {state,scope}=card._pg, r=scope.find(s=>s.id===id);if(!r)return;
  state.pick=id;
  if(annual){state.focus=r.d;renderProgression(card);return;}
  card.querySelectorAll('.pg-set').forEach(g=>g.classList.toggle('pick',g.dataset.pgRecord===id));
  const read=card.querySelector('.pg-read');if(read)read.textContent=progressionRead(r);
}
function bindProgressionSurface(surface){
  const card=surface.closest('.progression-card'),annual=surface.dataset.pgSurface==='year';
  let down=false,armed=false,moved=false,startX=0,startY=0,timer,point;
  const nearest=(x,y)=>{
    const svg=surface.querySelector('svg'),rect=svg.getBoundingClientRect(), vb=svg.getAttribute('viewBox').split(' ').map(Number);
    if(!rect.width||!rect.height)return null;
    const sx=(x-rect.left)*vb[2]/rect.width,sy=(y-rect.top)*vb[3]/rect.height;
    let pick=null,dist=Infinity;surface.querySelectorAll('.pg-set').forEach(g=>{const d=(+g.dataset.x-sx)**2+(+g.dataset.y-sy)**2;if(d<dist){dist=d;pick=g;}});return pick;
  };
  const read=p=>{const g=nearest(p.x,p.y);if(g)progressionPick(card,g.dataset.pgRecord,false);};
  surface._pgArm=()=>{if(down&&!moved){armed=true;read(point);}};
  const stop=()=>{clearTimeout(timer);down=false;armed=false;};
  surface.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch'||e.button>0)return;down=true;armed=false;moved=false;point={x:e.clientX,y:e.clientY};startX=point.x;startY=point.y;
    if(e.pointerType==='mouse')surface._pgArm();else timer=setTimeout(surface._pgArm,250);
  });
  surface.addEventListener('pointermove',e=>{if(!down)return;point={x:e.clientX,y:e.clientY};if(armed){e.preventDefault();read(point);}else if(Math.hypot(point.x-startX,point.y-startY)>8){moved=true;clearTimeout(timer);}});
  surface.addEventListener('pointerup',e=>{
    if(down&&(armed||!moved)){const g=nearest(e.clientX,e.clientY);if(g)progressionPick(card,g.dataset.pgRecord,annual);}
    stop();
  });
  surface.addEventListener('pointercancel',stop);surface.addEventListener('pointerleave',stop);
  // Native touch events preserve vertical scroll until the hold arms. Pointer
  // events alone get cancelled by iOS as soon as the browser begins panning.
  surface.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;const p=e.touches[0];down=true;armed=false;moved=false;point={x:p.clientX,y:p.clientY};startX=point.x;startY=point.y;timer=setTimeout(surface._pgArm,250);},{passive:true});
  surface.addEventListener('touchmove',e=>{if(!down)return;const p=e.touches[0];point={x:p.clientX,y:p.clientY};if(armed){e.preventDefault();read(point);}else if(Math.hypot(point.x-startX,point.y-startY)>8){moved=true;clearTimeout(timer);}},{passive:false});
  surface.addEventListener('touchend',()=>{if(down&&(armed||!moved)){const g=nearest(point.x,point.y);if(g)progressionPick(card,g.dataset.pgRecord,annual);}stop();});
  surface.addEventListener('touchcancel',stop);
  surface.addEventListener('keydown',e=>{const g=e.target.closest('.pg-set');if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();progressionPick(card,g.dataset.pgRecord,annual);}});
}
function bindProgression(){
  document.querySelectorAll('.progression-card').forEach(card=>{
    if(card._pgBound)return;card._pgBound=true;renderProgression(card);
    const act=e=>{
      const el=e.target.closest('[data-pg-action]');if(!el)return;
      const action=el.dataset.pgAction,select=el.tagName==='SELECT';
      if(select!==(e.type==='change'))return;
      const {state,dates,end,count}=card._pg;
      if(action==='exercise'){state.ex=el.value;state.kind=null;state.year=null;state.focus=null;state.pick=null;card.dataset.pgEx=state.ex;}
      if(action==='recent'||action==='year'){state.mode=action;state.focus=null;state.pick=null;}
      if(action==='kind'){state.kind=el.value;state.focus=null;state.pick=null;}
      if(action==='year-select'){state.year=el.value;state.focus=null;state.pick=null;}
      if(action==='date'){state.focus=el.value;state.pick=null;}
      if(action==='prev')state.focus=dates[Math.max(count-1,end-count-1)];
      if(action==='next')state.focus=dates[Math.min(dates.length-1,end+count-1)];
      renderProgression(card);
      card.querySelector(`[data-pg-action="${action}"]`)?.focus({preventScroll:true});
    };
    card.addEventListener('click',act);card.addEventListener('change',act);
  });
}
