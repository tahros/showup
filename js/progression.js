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
  const state=progressionUI[role]||(progressionUI[role]={mode:'numbers'});
  if(state.ex!==ex){state.ex=ex;state.focus=null;state.kind=null;state.year=null;state.pick=null;}
  return `<section class="progression-section" data-pg-role="${role}"><h2>${role==='live'?'Training now':'Progression'}${hActs('pg-'+role,'Last 4 Sessions shows every set as a number. Last 30 Sessions uses dots. Tap, hold-drag or use the slider to read a set. Share exports the current chart.','About exercise progression')}</h2><div class="card progression-card" data-pg-ex="${pgEscape(ex)}" data-pg-picker="${picker?'1':''}"></div></section>`;
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
function progressionLayout(records,kind,{dates=[],width=330,dots=false,best=()=>false,pick=null}={}){
  const left=34,right=10,top=20,usable=width-left-right,col=usable/Math.max(1,dates.length);
  const labelFor=r=>kind==='run'?(r.seconds?pgDuration(r.seconds):'—'):pgDecimal(r.count);
  const groups=new Map();
  records.forEach(r=>{const key=r.d+':'+progressionValue(r).toFixed(5);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);});
  const labels=new Map(),rows=new Map();
  for(const [key,group] of groups){
    const cell=Math.max(14,...group.map(r=>labelFor(r).length*6.7+2));
    const capacity=Math.max(1,Math.floor((col-4)/cell));
    const nRows=dots?1:Math.ceil(group.length/capacity);
    labels.set(key,{cell,capacity,nRows});rows.set(key,nRows*15);
  }
  const values=records.map(progressionValue),low=values.length?Math.min(...values):0,high=values.length?Math.max(...values):1;
  const minStep=kind==='run'?.25:kind==='time'?15:['body','unknown'].includes(kind)?1:isLb()?5:2.5;
  const step=Math.max(minStep,Math.ceil((high-low||minStep*3)/12/minStep)*minStep);
  const lo=Math.max(0,Math.floor(low/step)*step-step),hi=Math.ceil(high/step)*step+step;
  let plotHeight=176;
  // High-set-count workouts wrap numeric labels within their session column;
  // expand vertical room as needed, never substitute dots or hide real sets.
  if(!dots)for(const d of dates){
    const levels=[...groups.keys()].filter(k=>k.startsWith(d+':')).map(k=>({v:+k.slice(d.length+1),h:rows.get(k)})).sort((a,b)=>a.v-b.v);
    for(let i=1;i<levels.length;i++)plotHeight=Math.max(plotHeight,((levels[i-1].h+levels[i].h)/2+5)*(hi-lo)/(levels[i].v-levels[i-1].v));
    for(const l of levels)plotHeight=Math.max(plotHeight,l.h*2);
  }
  plotHeight=Math.ceil(plotHeight);
  const bottom=top+plotHeight,height=bottom+34;
  const Y=v=>kind==='assisted'?top+(v-lo)/(hi-lo)*plotHeight:bottom-(v-lo)/(hi-lo)*plotHeight;
  const points=records.map(r=>{
    const key=r.d+':'+progressionValue(r).toFixed(5),same=groups.get(key),at=same.indexOf(r),g=labels.get(key);
    const row=Math.floor(at/g.capacity),inRow=Math.min(g.capacity,same.length-row*g.capacity),index=at%g.capacity;
    const gap=dots?Math.min(4,(col-2)/same.length):g.cell;
    const x=left+(dates.indexOf(r.d)+.5)*col+(dots?at-(same.length-1)/2:index-(inRow-1)/2)*gap;
    const y=Y(progressionValue(r))+(dots?0:(row-(g.nRows-1)/2)*15);
    return {r,x,y,winning:best(r),label:labelFor(r),radius:dots?Math.max(.5,Math.min(1.8,gap*.38)):Math.min(7,g.cell/2),labelWidth:Math.max(14,labelFor(r).length*6.7+2)};
  });
  const ticks=[];for(let v=lo;v<=hi+step*.001;v+=step)ticks.push({y:Y(v),label:kind==='added'&&v===0?'BW':pgDecimal(v)});
  const indices=dots?[...new Set([0,Math.round((dates.length-1)/3),Math.round((dates.length-1)*2/3),dates.length-1])]:dates.map((d,i)=>i);
  const dateTicks=indices.filter(i=>i>=0&&dates[i]).map(i=>({x:left+(i+.5)*col,label:pgShortDate(dates[i]),anchor:dots&&i===0?'start':dots&&i===dates.length-1?'end':'middle'}));
  return {width,height,left,right,top,bottom,col,dates,dots,points,ticks,dateTicks,pick};
}
function progressionPlot(records,kind,options={}){
  const m=progressionLayout(records,kind,options),selected=m.points.find(p=>p.r.id===options.pick);
  let h='<svg class="pg-plot '+(m.dots?'pg-dots':'pg-detail')+'" viewBox="0 0 '+m.width+' '+m.height+'" style="width:100%" role="group" aria-label="'+pgEscape(progressionAxis(kind)+'; every logged set across '+m.dates.length+' sessions')+'">';
  h+='<rect class="pg-selection-band" x="'+(selected?m.left+m.dates.indexOf(selected.r.d)*m.col:m.left)+'" y="'+(m.top-8)+'" width="'+m.col+'" height="'+(m.bottom-m.top+8)+'" rx="4"'+(selected?'':' visibility="hidden"')+'/>';
  for(const t of m.ticks)h+='<line class="pg-grid" x1="'+m.left+'" x2="'+(m.width-m.right)+'" y1="'+t.y+'" y2="'+t.y+'"/><text class="pg-axis" x="'+(m.left-7)+'" y="'+(t.y+3.5)+'" text-anchor="end">'+t.label+'</text>';
  for(const p of m.points){
    h+='<g class="pg-set'+(p.winning?' pg-best':'')+(p.r.id===m.pick?' pick':'')+'" data-pg-record="'+p.r.id+'" data-x="'+p.x+'" data-y="'+p.y+'" tabindex="0" role="button" aria-label="'+pgEscape(progressionRead(p.r)+(p.winning?' · best at this load':''))+'" transform="translate('+p.x+' '+p.y+')"><title>'+pgEscape(progressionRead(p.r))+'</title>';
    h+=m.dots?'<circle r="'+p.radius+'"/>':p.label.length>2?'<rect x="'+(-p.labelWidth/2)+'" y="-7" width="'+p.labelWidth+'" height="14" rx="7"/>':'<circle r="'+p.radius+'"/>';
    if(!m.dots)h+='<text text-anchor="middle" dy="3.5">'+pgEscape(p.label)+'</text>';
    h+='</g>';
  }
  for(const t of m.dateTicks)h+='<text class="pg-date" x="'+t.x+'" y="'+(m.height-11)+'" text-anchor="'+t.anchor+'">'+t.label+'</text>';
  return h+'</svg>';
}
function progressionReceipt(r){
  const full=progressionRead(r),separator=' · ',parts=full.split(separator);
  return '<span class="pg-read-date">'+pgEscape(parts.slice(0,2).join(separator))+'</span><strong class="pg-read-value">'+pgEscape(parts.slice(2).join(separator))+'</strong>';
}
function renderProgression(card){
  const role=card.closest('[data-pg-role]').dataset.pgRole,state=progressionUI[role],ex=state.ex,data=progressionData(ex),all=data.records;
  if(!['numbers','dots'].includes(state.mode))state.mode='numbers';
  const kinds=[...new Set(all.map(r=>r.kind))];
  if(!kinds.includes(state.kind))state.kind=kinds.at(-1)||'load';
  const typed=all.filter(r=>r.kind===state.kind),allDates=[...new Set(typed.map(r=>r.d))],count=state.mode==='dots'?30:4,dates=allDates.slice(-count),scope=typed.filter(r=>dates.includes(r.d));
  if(!scope.some(r=>r.id===state.pick))state.pick=scope.at(-1)?.id||null;
  const width=Math.max(180,Math.round(card.clientWidth?card.clientWidth-32:Math.min(window.innerWidth-64,680))),best=progressionBest(scope);
  const options={width,dates,dots:state.mode==='dots',best,pick:state.pick};
  card._pg={role,state,data,scope,dates,count,width,options,layout:progressionLayout(scope,state.kind,options)};
  const tip=card.closest('section').querySelector('.tipbubble');
  if(tip)tip.textContent=state.kind==='run'?'Distance by session; numbers are elapsed times, not pace. Last 30 Sessions uses dots. Select any set with the slider. Share exports this view.':'Blue marks the most '+(state.kind==='time'?'seconds':'reps')+' at the same load in the displayed sessions. Every number is a set; Last 30 Sessions uses dots. Tap or scrub to read. Share exports this view.';
  const names=card.dataset.pgPicker==='1'?[...new Set(progressionRows().flatMap(d=>d.rows.map(s=>s.ex)))].sort((a,b)=>a.localeCompare(b)):[];
  const picker=names.length?'<select class="pg-ex" data-pg-action="exercise" aria-label="Exercise history">'+names.map(n=>'<option'+(ex===n?' selected':'')+'>'+pgEscape(n)+'</option>').join('')+'</select>':'<h3 class="pg-title">'+pgEscape(ex)+'</h3>';
  let h='<div class="pg-title-row">'+picker+'<button class="pg-share" data-pg-action="share" aria-label="Share this progression chart" title="Share"'+(!scope.length?' disabled':'')+'>'+ICO_SHARE+'</button></div><div class="pg-toolbar"><div class="pg-modes" role="group" aria-label="History range"><button data-pg-action="numbers" aria-pressed="'+(state.mode==='numbers')+'">Last 4 Sessions</button><button data-pg-action="dots" aria-pressed="'+(state.mode==='dots')+'">Last 30 Sessions</button></div></div>';
  if(kinds.length>1)h+='<select class="pg-kind" data-pg-action="kind" aria-label="Measurement type">'+kinds.map(k=>'<option value="'+k+'"'+(k===state.kind?' selected':'')+'>'+pgEscape(pgKinds[k])+'</option>').join('')+'</select>';
  const dateYears=dates.length?(dates[0].slice(0,4)===dates.at(-1).slice(0,4)?dates.at(-1).slice(0,4):dates[0].slice(0,4)+' / '+dates.at(-1).slice(0,4)):'';
  const dateLabel=dates.length?pgShortDate(dates[0])+' – '+pgShortDate(dates.at(-1))+' · '+dateYears:'';
  h+='<div class="pg-range-head"><span>'+dateLabel+'</span><span>'+pgEscape(progressionAxis(state.kind))+'</span></div>';
  if(allDates.length<count&&scope.length)h+='<div class="pg-available">'+allDates.length+' session'+(allDates.length===1?'':'s')+' on record</div>';
  if(!scope.length)h+='<p class="pg-empty">No measured sets yet. Your completed sets will appear here.</p>';
  else{
    h+='<div class="pg-scroll" data-pg-surface="detail">'+progressionPlot(scope,state.kind,options)+'</div>';
    const cursor=scope.findIndex(r=>r.id===state.pick);
    h+='<input class="pg-scrubber" data-pg-action="scrub" type="range" min="0" max="'+(scope.length-1)+'" step="1" value="'+cursor+'" aria-label="Browse individual sets" aria-valuetext="'+pgEscape(progressionRead(scope[cursor]))+'" style="--pg-progress:'+(100*cursor/Math.max(1,scope.length-1))+'%"><div class="pg-pages"><button data-pg-action="prev-set" aria-label="Previous set"'+(cursor===0?' disabled':'')+'>‹</button><span>Select a set</span><button data-pg-action="next-set" aria-label="Next set"'+(cursor===scope.length-1?' disabled':'')+'>›</button></div><div class="pg-read" aria-live="polite">'+progressionReceipt(scope[cursor])+'</div>';
  }
  const omitted=data.omitted.filter(r=>!dates.length||r.d>=dates[0]&&r.d<=dates.at(-1));
  if(omitted.length)h+='<details class="pg-unmeasured"><summary>Unplotted entries · '+omitted.length+'</summary>'+omitted.map(r=>'<div>'+pgShortDate(r.d)+' · Set '+r.ordinal+' · '+pgEscape(r.reason)+'</div>').join('')+'</details>';
  card.innerHTML=h;
  card.querySelectorAll('[data-pg-surface]').forEach(bindProgressionSurface);
}
function progressionPick(card,id){
  const {state,scope,layout}=card._pg,r=scope.find(s=>s.id===id);if(!r)return;
  state.pick=id;layout.pick=id;
  card.querySelectorAll('.pg-set').forEach(g=>g.classList.toggle('pick',g.dataset.pgRecord===id));
  const read=card.querySelector('.pg-read');if(read)read.innerHTML=progressionReceipt(r);
  const cursor=scope.indexOf(r),slider=card.querySelector('.pg-scrubber');
  if(slider){slider.value=cursor;slider.setAttribute('aria-valuetext',progressionRead(r));slider.style.setProperty('--pg-progress',(100*cursor/Math.max(1,scope.length-1))+'%');}
  card.querySelector('[data-pg-action="prev-set"]').disabled=cursor===0;
  card.querySelector('[data-pg-action="next-set"]').disabled=cursor===scope.length-1;
  const band=card.querySelector('.pg-selection-band');if(band){band.setAttribute('x',layout.left+layout.dates.indexOf(r.d)*layout.col);band.removeAttribute('visibility');}
}
/* Snapshot the selected measurement, period, and units before awaiting fonts.
   Existing showCard owns the preview, native sharing and download fallback. */
function progressionShare(card){
  const {state,scope,layout,count}=card._pg;if(!scope.length)return;
  const style=getComputedStyle(card),color=name=>style.getPropertyValue(name).trim();
  const snapshot={ex:state.ex,count,layout,read:progressionRead(scope.find(r=>r.id===state.pick)||scope.at(-1)),axis:progressionAxis(state.kind),picked:state.pick,
    colors:{paper:color('--surface'),ink:color('--chalk'),muted:color('--muted'),line:color('--line'),blue:color('--accent-ink'),soft:color('--surface2')},
    font:style.getPropertyValue('--body').trim()||'sans-serif',mono:style.getPropertyValue('--mono').trim()||'monospace'};
  return showCard(()=>drawProgressionCard(snapshot),'showup-'+state.ex.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'')+'-last-'+count+'-sessions');
}
function drawProgressionCard(s){
  const cv=document.createElement('canvas'),x=cv.getContext('2d');if(!x)return null;
  const m=s.layout,W=Math.max(320,m.width+40),scale=1080/W,pad=20;
  const wrap=(text,font,max)=>{x.font=font;const lines=[];let line='';for(const word of text.split(' ')){const next=line?line+' '+word:word;if(line&&x.measureText(next).width>max){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;};
  const title=wrap(s.ex,'600 18px '+s.font,W-pad*2),read=wrap(s.read,'500 11px '+s.mono,W-pad*2);
  const chartY=62+title.length*24,H=chartY+m.height+70+read.length*18;
  cv.width=1080;cv.height=Math.ceil(H*scale);x.scale(scale,scale);
  x.fillStyle=s.colors.paper;x.fillRect(0,0,W,H);x.textBaseline='alphabetic';
  x.fillStyle=s.colors.muted;x.font='500 10px '+s.mono;x.fillText('SHOWUP / PROGRESSION',pad,23);
  x.fillStyle=s.colors.ink;x.font='600 18px '+s.font;title.forEach((line,i)=>x.fillText(line,pad,51+i*24));
  x.fillStyle=s.colors.muted;x.font='500 11px '+s.mono;
  x.fillText('Last '+s.count+' Sessions'+(m.dates.length<s.count?' · '+m.dates.length+' on record':''),pad,chartY-17);
  x.textAlign='right';x.fillText(s.axis,W-pad,chartY-1);x.textAlign='left';
  x.save();x.translate((W-m.width)/2,chartY);
  for(const t of m.ticks){x.strokeStyle=s.colors.line;x.lineWidth=.7;x.setLineDash([2,4]);x.beginPath();x.moveTo(m.left,t.y);x.lineTo(m.width-m.right,t.y);x.stroke();x.setLineDash([]);x.fillStyle=s.colors.muted;x.textAlign='right';x.font='400 10px '+s.mono;x.fillText(t.label,m.left-7,t.y+3.5);}
  for(const p of m.points){
    x.fillStyle=m.dots?(p.winning?s.colors.blue:s.colors.muted):s.colors.soft;
    x.beginPath();if(!m.dots&&p.label.length>2)x.rect(p.x-p.labelWidth/2,p.y-7,p.labelWidth,14);else x.arc(p.x,p.y,p.radius,0,Math.PI*2);x.fill();
    if(p.r.id===s.picked){x.strokeStyle=s.colors.blue;x.lineWidth=1.2;x.stroke();}
    if(!m.dots){x.fillStyle=p.winning?s.colors.blue:s.colors.muted;x.font=(p.winning?'700':'500')+' 11px '+s.mono;x.textAlign='center';x.fillText(p.label,p.x,p.y+3.5);}
  }
  x.fillStyle=s.colors.muted;x.font='500 10px '+s.mono;
  for(const t of m.dateTicks){x.textAlign=t.anchor==='start'?'left':t.anchor==='end'?'right':'center';x.fillText(t.label,t.x,m.height-11);}
  x.restore();x.textAlign='left';x.strokeStyle=s.colors.line;x.beginPath();x.moveTo(pad,chartY+m.height+10);x.lineTo(W-pad,chartY+m.height+10);x.stroke();
  x.fillStyle=s.colors.ink;x.font='500 11px '+s.mono;read.forEach((line,i)=>x.fillText(line,pad,chartY+m.height+34+i*18));
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
      const {state,scope}=card._pg;
      if(action==='share'){progressionShare(card);return;}
      if(action==='prev-set'||action==='next-set'){
        const i=scope.findIndex(r=>r.id===state.pick)+(action==='prev-set'?-1:1);
        if(scope[i])progressionPick(card,scope[i].id);return;
      }
      if(action==='exercise'){state.ex=el.value;state.kind=null;state.pick=null;card.dataset.pgEx=state.ex;}
      if(action==='numbers'||action==='dots')state.mode=action;
      if(action==='kind'){state.kind=el.value;state.pick=null;}
      renderProgression(card);
      card.querySelector('[data-pg-action="'+action+'"]')?.focus({preventScroll:true});
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
