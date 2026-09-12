/* Set history. A point is a stored set, never independently chosen maxima.
   UI-only state: no DB writes, plan reads, migrations, or exercise-name merges. */
const progressionUI = Object.create(null);
const PG_VIEW_KEY='showup:progression-views:v1';
let progressionViews=Object.create(null);
try{
  const saved=JSON.parse(localStorage.getItem(PG_VIEW_KEY)||'null');
  if(saved&&typeof saved==='object'&&!Array.isArray(saved))progressionViews=saved;
}catch(_e){}
const pgEscape = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pgNumber = v => (typeof v==='number'||typeof v==='string'&&v.trim()!=='' && /^[-+]?\d*\.?\d+$/.test(v)) && Number.isFinite(+v) ? +v : null;
const pgDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d+'T00:00:00Z')) && new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const pgShortDate = d => `${+d.slice(5,7)}/${+d.slice(8,10)}`;
const pgDuration = s => `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`;
const pgDecimal = n => String(Math.round(n*100)/100);
// Presentation only. Keep stored loads and plot positions at full precision.
const pgWeight = n => String(Math.round(n));

/* The range is a property of an exercise + measurement, not of the screen
   that happens to render it. `anchor` is the earliest visible session. A null
   anchor means "follow latest", so a newly logged session joins that view.
   This is UI position only: it stays local and never mutates workout data. */
const progressionViewId=(ex,kind)=>kind+'\n'+ex;
function progressionHydrate(state,ex,kind){
  const id=progressionViewId(ex,kind),saved=progressionViews[id];
  state.ex=ex;state.kind=kind;state.viewId=id;
  if(saved){
    state.mode=['numbers','dots'].includes(saved.mode)?saved.mode:'numbers';
    state.anchor=pgDate(saved.anchor)?saved.anchor:null;
    state.span=Number.isInteger(saved.span)&&saved.span>0?saved.span:null;
    state.pick=typeof saved.pick==='string'?saved.pick:null;
  }else{
    state.mode=['numbers','dots'].includes(state.mode)?state.mode:'numbers';
    state.anchor=null;state.span=null;state.pick=null;
  }
}
function progressionPersist(state){
  if(!state.viewId)return;
  const next={mode:state.mode,anchor:state.anchor||null,span:state.span||null,pick:state.pick||null};
  if(JSON.stringify(progressionViews[state.viewId])===JSON.stringify(next))return;
  progressionViews[state.viewId]=next;
  try{localStorage.setItem(PG_VIEW_KEY,JSON.stringify(progressionViews));}catch(_e){}
}
function progressionWindow(allDates,count,state){
  const total=allDates.length,latestStart=Math.max(0,total-count);
  if(!total)return {start:0,end:0,latestStart,latest:true};
  if(!state.anchor||total<=count)return {start:latestStart,end:total,latestStart,latest:true};
  let start=allDates.indexOf(state.anchor);
  if(start<0){start=allDates.findIndex(d=>d>=state.anchor);if(start<0)start=total-1;}
  const span=Math.max(1,Math.min(state.span||count,count,total-start));
  return {start,end:start+span,latestStart,latest:false};
}

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
  else if(r.kind==='time') value=`${r.load===0?'BW':r.load===null?'load not recorded':pgWeight(toU(r.load))+' '+U()} · ${pgDuration(r.count)}`;
  else value=`${r.kind==='body'?'BW':r.kind==='unknown'?'load not recorded':r.kind==='assisted'?pgWeight(toU(-r.load))+' '+U()+' assistance':(r.kind==='added'?'BW + ':'')+pgWeight(toU(r.load))+' '+U()} × ${r.count}`;
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
  const state=progressionUI[role]||(progressionUI[role]={mode:'numbers'});
  if(state.ex!==ex){state.ex=ex;state.kind=null;state.anchor=null;state.span=null;state.pick=null;state.viewId=null;}
  return `<section class="progression-section" data-pg-role="${role}"><h2>${role==='live'?'Training now':'Progression'}${hActs('pg-'+role,'4 Sessions shows every set as a number. 12 Sessions uses dots. Date arrows browse ranges; the slider reads individual sets. Share exports the current chart.','About exercise progression')}</h2><div class="card progression-card" data-pg-ex="${pgEscape(ex)}" data-pg-picker="${picker?'1':''}"></div></section>`;
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


/* One geometry for screen AND image export. Session spacing is ordinal, not
   elapsed time: the date labels remain the authority. No synthetic history. */
function progressionFrame(records,kind,width=330,columns=4){
  // A single frame for the entire exercise/measurement history, not just the
  // visible page. Paging and 4/12 switching cannot move the grid or slider.
  const values=records.map(progressionValue),low=values.length?Math.min(...values):0,high=values.length?Math.max(...values):1;
  const minStep=kind==='run'?.25:kind==='time'?15:['body','unknown'].includes(kind)?1:isLb()?5:2.5;
  const step=Math.max(minStep,Math.ceil((high-low||minStep*3)/12/minStep)*minStep);
  const lo=Math.max(0,Math.floor(low/step)*step-step),hi=Math.ceil(high/step)*step+step;
  const col=(width-44)/Math.max(1,columns),days=new Map();
  for(const r of records){
    if(!days.has(r.d))days.set(r.d,new Map());
    const levels=days.get(r.d),v=+progressionValue(r).toFixed(5);
    if(!levels.has(v))levels.set(v,[]);levels.get(v).push(r);
  }
  let plotHeight=176;
  for(const groups of days.values()){
    const levels=[...groups].map(([v,rs])=>{
      const cell=Math.max(14,...rs.map(r=>(kind==='run'?(r.seconds?pgDuration(r.seconds):'—'):pgDecimal(r.count)).length*6.7+2));
      const capacity=Math.max(1,Math.floor((col-4)/cell));
      return {v,h:Math.ceil(rs.length/capacity)*15};
    }).sort((a,b)=>a.v-b.v);
    // Reserve only the space actual labels need. Dividing by the distance
    // between nearby loads made a 1 lb difference stretch the entire history.
    // Close groups are locally separated below, with leaders to their true Y.
    plotHeight=Math.max(plotHeight,levels.reduce((sum,l)=>sum+l.h+5,0)+10);
  }
  return {lo,hi,step,plotHeight:Math.ceil(plotHeight)};
}
/* Pick the most useful date labels that actually fit. Partial 12-session
   ranges intentionally keep twelve data columns so paging never changes the
   chart geometry; that can leave only a few occupied, tightly spaced columns.
   The period header already carries the full range, so axis dates may thin,
   but they may never collide. */
function progressionDateTicks(dates,left,col,dots){
  const make=indices=>indices.map(i=>{
    const label=pgShortDate(dates[i]),x=left+(i+.5)*col;
    const anchor=indices.length===1?'middle':i===0?'start':i===dates.length-1?'end':'middle';
    const width=Math.max(24,label.length*6.2);
    return {x,label,anchor,left:anchor==='start'?x:anchor==='end'?x-width:x-width/2,right:anchor==='start'?x+width:anchor==='end'?x:x+width/2};
  });
  if(!dates.length)return [];
  if(!dots)return make(dates.map((d,i)=>i));
  for(let count=Math.min(4,dates.length);count>=2;count--){
    const indices=[...new Set(Array.from({length:count},(_,i)=>Math.round(i*(dates.length-1)/(count-1))))];
    if(indices.length!==count)continue;
    const ticks=make(indices);
    if(ticks.every((t,i)=>!i||t.left-ticks[i-1].right>=6))return ticks;
  }
  return make([dates.length-1]);
}
function progressionLayout(records,kind,{dates=[],width=330,dots=false,best=()=>false,pick=null,columns=dates.length,frame=null}={}){
  const left=34,right=10,top=20,usable=width-left-right,col=usable/Math.max(1,columns);
  const labelFor=r=>kind==='run'?(r.seconds?pgDuration(r.seconds):'—'):pgDecimal(r.count);
  const groups=new Map();
  records.forEach(r=>{const key=r.d+':'+progressionValue(r).toFixed(5);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);});
  const labels=new Map();
  for(const [key,group] of groups){
    const cell=Math.max(14,...group.map(r=>labelFor(r).length*6.7+2));
    const capacity=Math.max(1,Math.floor((col-4)/cell));
    const nRows=dots?1:Math.ceil(group.length/capacity);
    labels.set(key,{cell,capacity,nRows});
  }
  const {lo,hi,step,plotHeight}=frame||progressionFrame(records,kind,width,columns);
  const bottom=top+plotHeight,height=bottom+34;
  const Y=v=>kind==='assisted'?top+(v-lo)/(hi-lo)*plotHeight:bottom-(v-lo)/(hi-lo)*plotHeight;
  const centers=new Map();
  if(!dots)for(const d of dates){
    const stack=[...groups].filter(([,rs])=>rs[0].d===d).map(([key,rs])=>({key,y:Y(progressionValue(rs[0])),h:labels.get(key).nRows*15})).sort((a,b)=>a.y-b.y);
    let edge=top;
    for(const g of stack){g.y=Math.max(g.y,edge+g.h/2);edge=g.y+g.h/2+5;}
    edge=bottom;
    for(let i=stack.length-1;i>=0;i--){const g=stack[i];g.y=Math.min(g.y,edge-g.h/2);edge=g.y-g.h/2-5;centers.set(g.key,g.y);}
  }
  const points=records.map(r=>{
    const key=r.d+':'+progressionValue(r).toFixed(5),same=groups.get(key),at=same.indexOf(r),g=labels.get(key);
    const row=Math.floor(at/g.capacity),inRow=Math.min(g.capacity,same.length-row*g.capacity),index=at%g.capacity;
    const gap=dots?Math.min(4,(col-2)/same.length):g.cell;
    const x=left+(dates.indexOf(r.d)+.5)*col+(dots?at-(same.length-1)/2:index-(inRow-1)/2)*gap;
    const trueY=Y(progressionValue(r));
    const y=dots?trueY:centers.get(key)+(row-(g.nRows-1)/2)*15;
    return {r,x,y,trueY,leader:!dots&&Math.abs(y-trueY)>1,winning:best(r),label:labelFor(r),radius:dots?Math.max(.5,Math.min(1.8,gap*.38)):Math.min(7,g.cell/2),labelWidth:Math.max(14,labelFor(r).length*6.7+2)};
  });
  const ticks=[];for(let v=lo;v<=hi+step*.001;v+=step)ticks.push({y:Y(v),showLabel:ticks.length%2===0,label:kind==='added'&&v===0?'BW':['load','added','assisted'].includes(kind)?pgWeight(v):pgDecimal(v)});
  const dateTicks=progressionDateTicks(dates,left,col,dots);
  return {width,height,left,right,top,bottom,col,dates,dots,points,ticks,dateTicks,pick};
}
function progressionPlot(records,kind,options={}){
  const m=progressionLayout(records,kind,options),selected=m.points.find(p=>p.r.id===options.pick);
  let h='<svg class="pg-plot '+(m.dots?'pg-dots':'pg-detail')+'" viewBox="0 0 '+m.width+' '+m.height+'" style="width:100%" role="group" aria-label="'+pgEscape(progressionAxis(kind)+'; every logged set across '+m.dates.length+' sessions')+'">';
  h+='<rect class="pg-selection-band" x="'+(selected?m.left+m.dates.indexOf(selected.r.d)*m.col:m.left)+'" y="'+(m.top-8)+'" width="'+m.col+'" height="'+(m.bottom-m.top+8)+'" rx="4"'+(selected?'':' visibility="hidden"')+'/>';
  for(const t of m.ticks){h+='<line class="pg-grid" x1="'+m.left+'" x2="'+(m.width-m.right)+'" y1="'+t.y+'" y2="'+t.y+'"/>';if(t.showLabel)h+='<text class="pg-axis" x="'+(m.left-7)+'" y="'+(t.y+3.5)+'" text-anchor="end">'+t.label+'</text>';}
  for(const p of m.points)if(p.leader)h+='<path class="pg-leader" d="M'+(p.x-2)+' '+p.trueY+'h4M'+p.x+' '+p.trueY+'V'+p.y+'"/>';
  for(const p of m.points){
    h+='<g class="pg-set'+(p.winning?' pg-best':'')+(p.r.id===m.pick?' pick':'')+'" data-pg-record="'+p.r.id+'" data-x="'+p.x+'" data-y="'+p.y+'" tabindex="0" role="button" aria-label="'+pgEscape(progressionRead(p.r)+(p.winning?' · best at this load':''))+'" transform="translate('+p.x+' '+p.y+')"><title>'+pgEscape(progressionRead(p.r))+'</title>';
    h+=m.dots?'<circle r="'+p.radius+'"/>':p.label.length>2?'<rect x="'+(-p.labelWidth/2)+'" y="-7" width="'+p.labelWidth+'" height="14" rx="7"/>':'<circle r="'+p.radius+'"/>';
    if(!m.dots)h+='<text text-anchor="middle" dy="3.5">'+pgEscape(p.label)+'</text>';
    h+='</g>';
  }
  for(const t of m.dateTicks)h+='<text class="pg-date" x="'+t.x+'" y="'+(m.height-11)+'" text-anchor="'+t.anchor+'">'+t.label+'</text>';
  return h+'</svg>';
}
function progressionReadoutParts(r){
  const full=progressionRead(r),separator=' · ',parts=full.split(separator);
  return {date:parts[0].replace(/, \d{4}$/, '')+separator+parts[1],value:parts.slice(2).join(separator)};
}
function progressionReceipt(r){
  const {date,value}=progressionReadoutParts(r);
  return '<span class="pg-read-value">'+pgEscape(value)+'</span><span class="pg-read-date">'+pgEscape(date)+'</span>';
}
function progressionPeriod(dates){
  if(!dates.length)return {label:'No sessions',years:''};
  const first=dates[0],last=dates.at(-1),month=d=>new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const label=first===last?month(first):month(first)+' – '+(first.slice(0,7)===last.slice(0,7)?+last.slice(8):month(last));
  const years=first.slice(0,4)===last.slice(0,4)?first.slice(0,4):first.slice(0,4)+' → '+last.slice(0,4);
  return {label,years};
}
function renderProgression(card){
  const role=card.closest('[data-pg-role]').dataset.pgRole,state=progressionUI[role],ex=state.ex,data=progressionData(ex),all=data.records;
  const kinds=[...new Set(all.map(r=>r.kind))];
  if(!kinds.includes(state.kind))state.kind=kinds.at(-1)||'load';
  progressionHydrate(state,ex,state.kind);
  /* ---- v4.1.15: A SET YOU JUST DID IS THE ONE YOU WANT TO SEE -----------
     The pick only moved when it fell OUT of scope, so logging a set left the
     reading on whatever was selected before -- often a session from a fortnight
     ago, while the set you just finished sat unread at the right-hand edge.
     When the record GROWS, the chart goes to the new set: its kind, the latest
     range, and the set itself.
     state.seen is deliberately NOT persisted. On the first paint after a
     reload there is nothing to compare against, so the remembered range
     survives (v3.3.542) and only growth within a session moves the view --
     which is the difference between "I came back to this chart" and "I just
     did a set". */
  const newest=all.at(-1);
  if(newest&&state.seen!==newest.id){
    const first=state.seen===undefined;
    state.seen=newest.id;
    if(!first){state.kind=newest.kind;state.anchor=null;state.span=null;state.pick=newest.id;}
  }
  const typed=all.filter(r=>r.kind===state.kind),allDates=[...new Set(typed.map(r=>r.d))],count=state.mode==='dots'?12:4;
  const rangeWindow=progressionWindow(allDates,count,state),{start,end,latestStart}=rangeWindow,dates=allDates.slice(start,end),dateSet=new Set(dates),scope=typed.filter(r=>dateSet.has(r.d));
  state.anchor=rangeWindow.latest?null:allDates[start];state.span=rangeWindow.latest?null:dates.length;
  if(!scope.some(r=>r.id===state.pick))state.pick=scope.at(-1)?.id||null;
  progressionPersist(state);
  const width=Math.max(180,Math.round(card.clientWidth?card.clientWidth-32:Math.min(window.innerWidth-64,680))),best=progressionBest(scope);
  const options={width,dates,dots:state.mode==='dots',best,pick:state.pick,columns:count,frame:progressionFrame(typed,state.kind,width,4)};
  card._pg={role,state,data,scope,dates,count,start,end,total:allDates.length,allDates,latestStart,latest:rangeWindow.latest,width,options,layout:progressionLayout(scope,state.kind,options)};
  const tip=card.closest('section').querySelector('.tipbubble');
  if(tip)tip.textContent=state.kind==='run'?'Distance by session; numbers are elapsed times, not pace. 12 Sessions uses dots. Date arrows browse ranges; the slider reads individual sets. Share exports this view.':'Blue marks the most '+(state.kind==='time'?'seconds':'reps')+' at the same load in the displayed sessions. Every number is a set; 12 Sessions uses dots. Date arrows browse ranges; the slider reads individual sets. Share exports this view.';
  const names=card.dataset.pgPicker==='1'?[...new Set(progressionRows().flatMap(d=>d.rows.map(s=>s.ex)))].sort((a,b)=>a.localeCompare(b)):[];
  const picker='<h3 class="pg-title">'+pgEscape(ex)+'</h3>'+(names.length?'<button class="pg-search-open" data-pg-action="search" aria-label="Search exercise history"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/></svg></button>':'');
  let h='<div class="pg-title-row">'+picker+'<button class="pg-share" data-pg-action="share" aria-label="Share this progression chart" title="Share"'+(!scope.length?' disabled':'')+'>'+ICO_SHARE+'</button></div><div class="pg-toolbar"><div class="pg-modes" role="group" aria-label="History range"><button data-pg-action="numbers" aria-pressed="'+(state.mode==='numbers')+'">4 Sessions</button><button data-pg-action="dots" aria-pressed="'+(state.mode==='dots')+'">12 Sessions</button></div></div>';
  if(kinds.length>1)h+='<select class="pg-kind" data-pg-action="kind" aria-label="Measurement type">'+kinds.map(k=>'<option value="'+k+'"'+(k===state.kind?' selected':'')+'>'+pgEscape(pgKinds[k])+'</option>').join('')+'</select>';
  const period=progressionPeriod(dates);
  h+='<div class="pg-range-head"><div class="pg-range-nav" role="group" aria-label="Browse session ranges"><button data-pg-action="prev-range" aria-label="Previous '+count+' sessions"'+(!start?' disabled':'')+'>‹</button><span class="pg-period" aria-live="polite" aria-atomic="true"><span class="pg-period-main">'+period.label+'</span><span class="pg-period-year">'+period.years+'</span></span><button data-pg-action="next-range" aria-label="Next '+count+' sessions"'+(rangeWindow.latest||end===allDates.length?' disabled':'')+'>›</button></div></div>';
  // Weight units already appear in the selected-set readout. Other measurement
  // axes still need their meaning (e.g. assistance or seconds, not reps).
  if(state.kind!=='load')h+='<div class="pg-axis-unit">'+pgEscape(progressionAxis(state.kind))+'</div>';
  const availability=dates.length+' session'+(dates.length===1?'':'s')+(allDates.length<count?' on record':' in this range');
  h+='<div class="pg-history-row"><div class="pg-available"'+(dates.length===count||!scope.length?' aria-hidden="true"':'')+'>'+availability+'</div><button class="pg-latest" data-pg-action="latest" aria-label="Return to the latest '+count+' sessions"'+(rangeWindow.latest?' hidden':'')+'>Latest <span aria-hidden="true">↗</span></button></div>';
  if(!scope.length)h+='<p class="pg-empty">No measured sets yet. Your completed sets will appear here.</p>';
  else{
    h+='<div class="pg-read-slot"><div class="pg-read" aria-live="polite" aria-atomic="true">'+progressionReceipt(scope.find(r=>r.id===state.pick))+'</div></div>';
    h+='<div class="pg-scroll" data-pg-surface="detail">'+progressionPlot(scope,state.kind,options)+'</div>';
    const cursor=scope.findIndex(r=>r.id===state.pick);
    h+='<input class="pg-scrubber" data-pg-action="scrub" type="range" min="0" max="'+(scope.length-1)+'" step="1" value="'+cursor+'" aria-label="Browse individual sets" aria-valuetext="'+pgEscape(progressionRead(scope[cursor]))+'" style="--pg-progress:'+(100*cursor/Math.max(1,scope.length-1))+'%"><div class="pg-pages"><button data-pg-action="prev-set" aria-label="Previous set"'+(cursor===0?' disabled':'')+'>‹</button><span>Select a set</span><button data-pg-action="next-set" aria-label="Next set"'+(cursor===scope.length-1?' disabled':'')+'>›</button></div>';
  }
  const omitted=data.omitted.filter(r=>!dates.length||r.d>=dates[0]&&r.d<=dates.at(-1));
  if(omitted.length)h+='<details class="pg-unmeasured"><summary>Unplotted entries · '+omitted.length+'</summary>'+omitted.map(r=>'<div>'+pgShortDate(r.d)+' · Set '+r.ordinal+' · '+pgEscape(r.reason)+'</div>').join('')+'</details>';
  card.innerHTML=h;
  if(names.length){
    const rows=progressionRows(),meta=names.map(name=>{const last=rows.filter(d=>d.rows.some(r=>r.ex===name)).at(-1);return {name,date:last?.d||'',part:last?.rows.find(r=>r.ex===name)?.part||SEED.ex2part[name]||'Other'};}).sort((a,b)=>b.date.localeCompare(a.date)||a.name.localeCompare(b.name));
    const parts=[...new Set(meta.map(m=>m.part))];
    const shelf=document.createElement('div');shelf.className='pg-library';
    const buttons=list=>list.map(m=>'<button data-pg-action="exercise" value="'+pgEscape(m.name)+'" aria-pressed="'+(m.name===ex)+'"><strong>'+pgEscape(m.name)+'</strong><small>'+pgEscape(pgShortDate(m.date))+'</small></button>').join('');
    shelf.innerHTML='<div class="pg-parts" aria-label="Filter exercise history by body part">'+['All',...parts].map(p=>'<button data-pg-part="'+pgEscape(p)+'" aria-pressed="'+((card._pgPart||'All')===p)+'">'+pgEscape(p)+'</button>').join('')+'</div><div class="pg-exercise-shelf">'+buttons(meta.filter(m=>!card._pgPart||card._pgPart==='All'||m.part===card._pgPart).slice(0,4))+'</div>';
    card.querySelector('.pg-toolbar').before(shelf);
    shelf.querySelectorAll('[data-pg-part]').forEach(b=>b.onclick=()=>{card._pgPart=b.dataset.pgPart;renderProgression(card);});
    const dialog=document.createElement('dialog');dialog.className='pg-search-dialog';dialog.innerHTML='<div class="pg-search-heading"><h3>Find an exercise</h3><button type="button" aria-label="Close exercise search">×</button></div><input type="search" placeholder="Search your exercises" aria-label="Search your exercises"><div class="pg-search-results">'+buttons(meta)+'</div>';card.append(dialog);
    dialog.querySelector('.pg-search-heading button').onclick=()=>dialog.close();dialog.querySelector('input').oninput=e=>{const query=e.target.value.trim().toLowerCase();dialog.querySelectorAll('[data-pg-action="exercise"]').forEach(b=>b.hidden=!b.value.toLowerCase().includes(query));};
  }
  card.querySelectorAll('[data-pg-surface]').forEach(bindProgressionSurface);
}
function progressionPick(card,id){
  const {state,scope,layout}=card._pg,r=scope.find(s=>s.id===id);if(!r)return;
  state.pick=id;layout.pick=id;progressionPersist(state);
  card.querySelectorAll('.pg-set').forEach(g=>g.classList.toggle('pick',g.dataset.pgRecord===id));
  const read=card.querySelector('.pg-read');if(read){
    const parts=progressionReadoutParts(r),value=read.querySelector('.pg-read-value'),changed=value.textContent!==parts.value;
    value.textContent=parts.value;read.querySelector('.pg-read-date').textContent=parts.date;
    if(changed&&value.animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){value.getAnimations().forEach(a=>a.cancel());value.animate([{transform:'translateY(2px)',opacity:.6},{transform:'translateY(0)',opacity:1}],{duration:140,easing:'ease-out'});}
  }
  const cursor=scope.indexOf(r),slider=card.querySelector('.pg-scrubber');
  if(slider){slider.value=cursor;slider.setAttribute('aria-valuetext',progressionRead(r));slider.style.setProperty('--pg-progress',(100*cursor/Math.max(1,scope.length-1))+'%');}
  card.querySelector('[data-pg-action="prev-set"]').disabled=cursor===0;
  card.querySelector('[data-pg-action="next-set"]').disabled=cursor===scope.length-1;
  const band=card.querySelector('.pg-selection-band');if(band){band.setAttribute('x',layout.left+layout.dates.indexOf(r.d)*layout.col);band.removeAttribute('visibility');}
  progressionRefreshPeers(card);
}
function progressionRefreshPeers(card){
  const current=card._pg;if(!current)return;
  document.querySelectorAll('.progression-card').forEach(peer=>{
    if(peer!==card&&peer._pg?.state.ex===current.state.ex&&peer._pg.state.kind===current.state.kind)renderProgression(peer);
  });
}
/* Snapshot the selected measurement, period, and units before awaiting fonts.
   Existing showCard owns the preview, native sharing and download fallback. */
function progressionShare(card){
  const {state,scope,layout,count}=card._pg;if(!scope.length)return;
  const style=getComputedStyle(card),color=name=>style.getPropertyValue(name).trim();
  const snapshot={ex:state.ex,count,layout,read:progressionReadoutParts(scope.find(r=>r.id===state.pick)||scope.at(-1)),axis:state.kind==='load'?'':progressionAxis(state.kind),picked:state.pick,
    colors:{paper:color('--surface'),ink:color('--chalk'),muted:color('--muted'),line:color('--line'),blue:color('--accent-ink'),soft:color('--surface2')},
    font:style.getPropertyValue('--body').trim()||'sans-serif',mono:style.getPropertyValue('--mono').trim()||'monospace'};
  return showCard(()=>drawProgressionCard(snapshot),'progression-'+state.ex.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'')+'-'+count+'-sessions-'+layout.dates[0]+'-'+layout.dates.at(-1));
}
function drawProgressionCard(s){
  const cv=document.createElement('canvas'),x=cv.getContext('2d');if(!x)return null;
  const m=s.layout,W=Math.max(320,m.width+40),scale=1080/W,pad=20;
  const wrap=(text,font,max)=>{x.font=font;const lines=[];let line='';for(const word of text.split(' ')){const next=line?line+' '+word:word;if(line&&x.measureText(next).width>max){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;};
  const title=wrap(s.ex,'600 18px '+s.font,W-pad*2),read=wrap(s.read.value,'500 16px '+s.font,W-pad*2);
  const chartY=62+title.length*24,H=chartY+52+m.height+32;
  cv.width=1080;cv.height=Math.ceil(H*scale);x.scale(scale,scale);
  x.fillStyle=s.colors.paper;x.fillRect(0,0,W,H);x.textBaseline='alphabetic';
  x.fillStyle=s.colors.muted;x.font='500 10px '+s.mono;x.fillText('SHOWUP / PROGRESSION',pad,23);
  x.fillStyle=s.colors.ink;x.font='600 18px '+s.font;title.forEach((line,i)=>x.fillText(line,pad,51+i*24));
  x.fillStyle=s.colors.muted;x.font='500 11px '+s.mono;
  x.fillText(s.count+' Sessions'+(m.dates.length<s.count?' · '+m.dates.length+' in this range':''),pad,chartY-17);
  if(s.axis){x.textAlign='right';x.fillText(s.axis,W-pad,chartY-1);x.textAlign='left';}
  x.textAlign='center';x.fillStyle=s.colors.ink;x.font='500 16px '+s.font;read.forEach((line,i)=>x.fillText(line,W/2,chartY+18+i*18));
  x.fillStyle=s.colors.muted;x.font='400 11px '+s.mono;x.fillText(s.read.date,W/2,chartY+read.length*18+17);
  x.save();x.translate((W-m.width)/2,chartY+52);
  for(const t of m.ticks){x.strokeStyle=s.colors.line;x.lineWidth=.7;x.setLineDash([2,4]);x.beginPath();x.moveTo(m.left,t.y);x.lineTo(m.width-m.right,t.y);x.stroke();x.setLineDash([]);if(t.showLabel){x.fillStyle=s.colors.muted;x.textAlign='right';x.font='400 10px '+s.mono;x.fillText(t.label,m.left-7,t.y+3.5);}}
  for(const p of m.points)if(p.leader){x.strokeStyle=s.colors.muted;x.globalAlpha=.5;x.lineWidth=.7;x.beginPath();x.moveTo(p.x-2,p.trueY);x.lineTo(p.x+2,p.trueY);x.moveTo(p.x,p.trueY);x.lineTo(p.x,p.y);x.stroke();x.globalAlpha=1;}
  for(const p of m.points){
    x.fillStyle=m.dots?(p.winning?s.colors.blue:s.colors.muted):s.colors.soft;
    x.beginPath();if(!m.dots&&p.label.length>2)x.rect(p.x-p.labelWidth/2,p.y-7,p.labelWidth,14);else x.arc(p.x,p.y,p.radius,0,Math.PI*2);x.fill();
    if(p.r.id===s.picked){x.strokeStyle=s.colors.blue;x.lineWidth=1.2;x.stroke();}
    if(!m.dots){x.fillStyle=p.winning?s.colors.blue:s.colors.muted;x.font='400 11px '+s.mono;x.textAlign='center';x.fillText(p.label,p.x,p.y+3.5);}
  }
  x.fillStyle=s.colors.muted;x.font='500 10px '+s.mono;
  for(const t of m.dateTicks){x.textAlign=t.anchor==='start'?'left':t.anchor==='end'?'right':'center';x.fillText(t.label,t.x,m.height-11);}
  x.restore();x.textAlign='left';
  x.fillStyle=s.colors.muted;x.font='400 10px '+s.mono;x.fillText('showup · '+m.dates[0]+' — '+m.dates.at(-1),pad,H-14);
  return cv;
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
      if(action==='scrub')return;
      if(select!==(e.type==='change'))return;
      if(action==='search'){const dialog=card.querySelector('.pg-search-dialog');dialog.showModal();dialog.querySelector('input').focus();return;}
      const {state,scope,start,end,total,allDates,latestStart}=card._pg;
      if(action==='share'){progressionShare(card);return;}
      if(action==='prev-set'||action==='next-set'){
        const i=scope.findIndex(r=>r.id===state.pick)+(action==='prev-set'?-1:1);
        if(scope[i])progressionPick(card,scope[i].id);return;
      }
      if(action==='prev-range'||action==='next-range'){
        if(action==='prev-range'){
          if(!start)return;
          const nextStart=Math.max(0,start-card._pg.count);
          state.anchor=allDates[nextStart];state.span=start-nextStart;
        }else{
          if(card._pg.latest||end===total)return;
          const nextStart=end;
          if(nextStart>=latestStart){state.anchor=null;state.span=null;}
          else{state.anchor=allDates[nextStart];state.span=Math.min(card._pg.count,total-nextStart);}
        }
        state.pick=null;
      }
      if(action==='latest'){state.anchor=null;state.span=null;state.pick=null;}
      if(action==='exercise'){state.ex=el.value;state.kind=null;state.anchor=null;state.span=null;state.pick=null;state.viewId=null;card.dataset.pgEx=state.ex;}
      if(action==='numbers'||action==='dots'){state.mode=action;state.span=action==='dots'?12:4;state.pick=null;}
      if(action==='kind'){state.kind=el.value;state.anchor=null;state.span=null;state.pick=null;state.viewId=null;}
      progressionPersist(state);
      renderProgression(card);
      progressionRefreshPeers(card);
      if(action==='prev-range'||action==='next-range'||action==='latest'){
        const period=card.querySelector('.pg-period');
        if(period.animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)period.animate([{transform:'translateY(3px)',opacity:.65},{transform:'translateY(0)',opacity:1}],{duration:160,easing:'ease-out'});
      }
      const focusAction=action==='latest'?'next-range':action;
      card.querySelector('[data-pg-action="'+focusAction+'"]')?.focus({preventScroll:true});
    };
    card.addEventListener('click',act);card.addEventListener('change',act);
    card.addEventListener('input',e=>{if(e.target.matches('.pg-scrubber')){const r=card._pg.scope[+e.target.value];if(r)progressionPick(card,r.id);}});
  });
}
let progressionResizeTimer;
window.addEventListener('resize',()=>{
  clearTimeout(progressionResizeTimer);
  progressionResizeTimer=setTimeout(()=>document.querySelectorAll('.progression-card').forEach(renderProgression),120);
});
