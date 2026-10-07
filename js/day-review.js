/* Whole-day review: frozen plan OR previous exercise session.
   Rendering is read-only. Explicit location consent saves city/weather only;
   no guessed history, retroactive plan links or scores.
   The DOM and share canvas consume the same formatted model. Today emerges
   from blank space; references stay still. All encoding stays on-device. */
// equipOf() creates an override bag on legacy profiles; this view must not.
const dayReviewBody=ex=>(DB.settings.equipOv?.[ex]||DB.settings.custom?.[ex]?.equip||(EZ_NAME.test(ex||'')?'ezbar':null)||SEED.equip[ex]||'machine')==='body';
function dayReviewTotals(record){
  const rows=record?.w||[];
  // Completion's timing rules apply to EACH recorded session, not a whole-day
  // first-to-last span (which would count a lunch break as exercise).
  let remaining=rows.slice(),minutes=0,known=!!rows.length;
  while(remaining.length){
    const stamps=remaining.map(r=>Number(r.at));
    const latest=Math.max(...stamps),next=rows.filter(r=>!remaining.includes(r)).map(r=>+r.at);
    const limit=next.length?Math.min(...next):Infinity;
    const ends=[...(record.closed||[]),record.completedAt].map(Number).filter(n=>Number.isFinite(n)&&n>=latest&&n<limit).sort((a,b)=>a-b);
    const last=sessionRows({w:remaining,closed:record.closed},ends[0]??latest+1);
    if(!last.length){known=false;break;}
    const m=workoutCompletionMetrics({w:last,completedAt:ends[0]});
    if(m.minutes==null)known=false;else minutes+=m.minutes;
    remaining=remaining.filter(r=>!last.includes(r));
  }
  // Completion's per-entry count across ALL sessions. Shape, not the Cardio
  // part name: a legacy weighted Cycling row still contains lifting sets.
  const sets=rows.reduce((n,r)=>n+(isCardio(r)?1:Math.max(1,(r.reps||[]).length)),0);
  return {minutes:known?minutes:null,sets,exercises:new Set(rows.map(r=>r.part+'\0'+r.ex)).size,
    distance:rows.filter(r=>r.ex==='Run'&&isCardio(r)).reduce((n,r)=>n+(Number(r.w)||0),0)};
}
function dayReviewModel(date=todayISO){
  const days=allDays(),record=DB.days?.[date]||{w:days[date]||[]},work=record.w||[],basis=plBasis(date);
  const planned=!!basis,items=basis?.content?.items||[],names=[];
  const key=ex=>plExerciseId(ex);
  const add=ex=>{if(ex&&!names.some(n=>key(n)===key(ex)))names.push(ex);};
  if(planned)items.forEach(i=>add(i.ex));work.forEach(r=>add(r.ex));
  const expand=rows=>rows.flatMap(source=>isCardio(source)?[{source,cardio:true,w:+source.w||0,mins:+source.mins||0,secs:+source.secs||0}]:
    (source.reps||[]).map(r=>({...source,source,r:+r,w:+source.w||0})));
  const prior=Object.keys(days).filter(d=>d<date).sort().reverse();
  const rows=names.map(ex=>{
    const actual=expand(work.filter(r=>key(r.ex)===key(ex)));
    const lastDate=planned?null:prior.find(d=>days[d].some(r=>key(r.ex)===key(ex)));
    const ref=planned?(basis.targets||[]).filter(t=>plSameExercise(t,ex)).map(t=>({...t,r:t.reps})):
      expand(lastDate?days[lastDate].filter(r=>key(r.ex)===key(ex)):[]);
    const inPlan=items.some(i=>key(i.ex)===key(ex));
    let addedSets=Math.max(0,actual.length-ref.length),repGain=0,weightGain=0;
    const comparable=(a,b)=>b&&!a.cardio&&!b.cardio&&!isHold(a.su)&&!isHold(b.su)&&!a.nw&&!b.nw&&!a.est&&!b.est&&!plWarm(b)&&!dayReviewBody(ex)&&a.w>0&&b.w>0;
    actual.forEach((a,i)=>{
      // Plan matches are ID-based only. Unlinked legacy rows remain facts,
      // never falsely attributed to a target by ordinal or weight.
      const b=planned?ref.find(t=>a.source.planRef?.setId===t.id):ref[i];
      if(comparable(a,b)){
        a.weightGain=a.w>b.w+.00001;
        a.repGain=Math.abs(a.w-b.w)<.00001&&a.r>b.r;
        if(a.weightGain)weightGain=Math.max(weightGain,a.w-b.w);
        if(a.repGain)repGain+=a.r-b.r;
      }
      a.extra=ref.length>0&&i>=ref.length;
    });
    const delta=[];
    if(weightGain)delta.push('+'+wDisp(weightGain)+' '+U());
    if(repGain)delta.push('+'+repGain+' reps');
    if(ref.length&&addedSets)delta.push('+'+addedSets+' '+(addedSets===1?'set':'sets'));
    const note=planned?(!inPlan&&actual.length?'Added today':!ref.length&&inPlan?'No set targets':''):(lastDate?new Date(lastDate+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric',...(lastDate.slice(0,4)!==date.slice(0,4)?{year:'numeric'}:{})}):'First session');
    return {ex,ref,actual,note,delta};
  });
  const totals=dayReviewTotals(record),parts=[...new Set(work.map(r=>r.part==='Run'?(r.ex==='Run'?'Run':partLabel(r.part)):r.part).filter(Boolean))];
  const values=[totals.minutes==null?'—':String(totals.minutes),String(totals.sets),String(totals.exercises),String(+toD(totals.distance).toFixed(2))];
  return {date,planned,rows,parts,context:dayReviewContext(record),totals,values,labels:['minutes','sets','exercises',isLb()?'miles run':'km run'],unit:U(),distanceUnit:DU(),
    title:new Date(date+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',...(date.slice(0,4)!==todayISO.slice(0,4)?{year:'numeric'}:{})}),name:String(DB.settings?.name||'')};
}
function dayReviewContext(record){
  const v=record?.dayContext;if(!v||v.removed)return null;
  const location=typeof v.location==='string'?v.location.slice(0,100):'',w=v.weather;
  const valid=w&&typeof w.c==='number'&&Number.isFinite(w.c)&&w.c>=-100&&w.c<=70&&typeof w.symbol==='string';
  const symbol=valid?w.symbol.replace(/_(day|night|polartwilight)$/,''):'';
  const condition=symbol.includes('thunder')?'Thunder':symbol.includes('snow')?'Snow':symbol.includes('sleet')?'Sleet':symbol.includes('rain')?'Rain':symbol==='clearsky'?'Clear':symbol==='fair'?'Mostly clear':symbol==='partlycloudy'?'Partly cloudy':symbol==='cloudy'?'Cloudy':symbol==='fog'?'Fog':'';
  return {location,weather:valid?`${Math.round(isLb()?w.c*9/5+32:w.c)}°${isLb()?'F':'C'}${condition?' · '+condition:''}`:'',capturedAt:Number(v.capturedAt)||0};
}
function dayReviewContextControls(m){
 const added=m.context&&(m.context.location||m.context.weather);
 return `<div class="dr-context"><button type="button" data-dr-location>${added?'Update location & weather':'Allow location'}</button>${added?'<button type="button" data-dr-context-remove>Remove</button>':''}<p class="dr-context-status" role="status">${added?`Captured ${hesc(new Date(m.context.capturedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}))}. Conditions estimate when added, not a past workout lookup.`:'Optional: add your current city and weather to this day and its share card.'}</p>${added?'<small>Location: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> via Photon · Weather: <a href="https://www.met.no/en/free-meteorological-data/Licensing-and-crediting" target="_blank" rel="noopener">MET Norway / CC BY 4.0</a></small>':''}</div>`;
}
function dayReviewLocationConsent(){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='dr-consent';
  dialog.innerHTML='<h3>Add location & weather?</h3><p>Use your location once to add your current city and estimated weather to today’s card. Only do this if you’re at the workout location.</p><p>Approximate coordinates go through ShowUppp’s server to Photon and MET Norway. We save only the city, conditions and capture time with this day; they sync with your account and appear in shared cards. No background tracking or saved GPS coordinates.</p><div><button type="button" data-cancel>Not now</button><button type="button" data-allow>Allow location</button></div>';
  const finish=ok=>{dialog.close();dialog.remove();resolve(ok);};
  dialog.querySelector('[data-cancel]').onclick=()=>finish(false);dialog.querySelector('[data-allow]').onclick=()=>finish(true);dialog.oncancel=e=>{e.preventDefault();finish(false);};document.body.append(dialog);dialog.showModal();
 });
}
let dayReviewLocating=false;
async function dayReviewAddLocation(button){
 if(dayReviewLocating)return;dayReviewLocating=true;
 const card=button.closest('.day-review'),account=DB,user=session?.user?.id,date=todayISO,contextAt=DB.days[date]?.dayContext?.updatedAt;
 const same=()=>DB===account&&session?.user?.id===user&&todayISO===date&&card.isConnected&&DB.days[date]?.dayContext?.updatedAt===contextAt;
 const status=message=>{if(card.isConnected)card.querySelector('.dr-context-status').textContent=message;};
 try{
  if(!await dayReviewLocationConsent()||!same())return;
  if(checkDate()||!same())return;
  if(!loadedOK)throw Error('Your history is still loading. Please try again.');
  button.disabled=true;status('Finding your city and weather…');
  let position;
  if(NATIVE_SHELL){const plugin=capPlugin('ShowUpLocation');if(!plugin?.current)throw Error('Location needs the updated iPhone app build. The web app can use it now.');position=await plugin.current();}
  else {if(!navigator.geolocation)throw Error('Location is unavailable in this browser.');const p=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:12000,maximumAge:60000}));position=p.coords;}
  if(!same())return;
  const lat=Number(position.latitude?.toFixed(2)),lon=Number(position.longitude?.toFixed(2));
  if(!Number.isFinite(lat)||!Number.isFinite(lon))throw Error('Could not determine your location.');
  const {url,anon}=cloudCfg(),r=await fetch(url+'/functions/v1/day-context',{method:'POST',headers:{apikey:anon,Authorization:'Bearer '+anon,'Content-Type':'application/json'},body:JSON.stringify({consent:true,lat,lon}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error('Location/weather lookup is unavailable. Please try again later.');
  const result=await r.json();if(!same()||checkDate()||!same())return;
  const clean=dayReviewContext({dayContext:result});
  if(!clean||(!clean.location&&!clean.weather))throw Error('Location and weather are unavailable right now. Nothing was added.');
  const value={location:clean.location,weather:clean.weather?{c:result.weather.c,symbol:result.weather.symbol,at:result.weather.at}:null,capturedAt:Date.now(),updatedAt:Date.now()};
  const record=DB.days[date];if(!record?.w?.length)throw Error('Log a workout first, then add its location.');
  record.dayContext=value;record.upd=Date.now();save();dayReviewRefreshContext(card);
 }catch(e){const denied=e?.code===1||/denied|not authorized/i.test(String(e?.message));status(denied?'Location wasn’t allowed. You can enable it in device/browser settings; your workout is unchanged.':e?.code===3?'Location timed out. Try again when a signal is available.':e?.message||'Could not add location. Please try again.');}
 finally{dayReviewLocating=false;if(button.isConnected)button.disabled=false;}
}
function dayReviewRefreshContext(card){
 const template=document.createElement('template');template.innerHTML=dayReviewSection();const next=template.content;
 for(const selector of ['.dr-heading','.dr-parts','.dr-context'])card.querySelector(selector).replaceWith(next.querySelector(selector));
}
function dayReviewGroups(sets,ex){
  const groups=[];
  for(const s of sets){
    const load=s.cardio?(cardioOf(ex).dist?String(+toD(s.w).toFixed(2))+' '+DU():'Time'):s.nw?'By feel':(s.est?'≈':'')+((s.bw||dayReviewBody(ex))?(s.w?'BW + '+wDisp(s.w):'BW'):wDisp(s.w));
    const tag=s.cardio?(s.mins||s.secs?String(s.mins)+':'+String(s.secs).padStart(2,'0'):''):String(setNum(s.r,s.su));
    const qualifier=/^warm[ -]?up$/i.test(s.qualifier||'')?'':s.qualifier||'';
    const id=JSON.stringify([load,s.su||'',!!s.weightGain,!!s.cardio,qualifier]);
    const last=groups.at(-1),chip={label:tag,gain:!!s.repGain||!!s.extra};
    if(last?.id===id&&!s.cardio){last.chips.push(chip);last.sets.push(s);}
    else groups.push({id,load,gain:!!s.weightGain,chips:tag?[chip]:[],qualifier,sets:[s]});
  }
  return groups;
}
// Shared lanes keep corresponding loads/reps aligned, even when a planned
// load was skipped. Never invent a plan association for an unlinked log.
function dayReviewLanes(row,planned){
  const used=new Set(),lanes=[];
  for(const ref of dayReviewGroups(row.ref,row.ex)){
    const actual=row.actual.filter((s,i)=>planned?ref.sets.some(t=>s.source.planRef?.setId===t.id):ref.sets.includes(row.ref[i]));
    actual.forEach(s=>used.add(s));
    const groups=dayReviewGroups(actual,row.ex);
    lanes.push({ref,actual:groups.shift()||null});
    groups.forEach(actual=>lanes.push({ref:null,actual}));
  }
  dayReviewGroups(row.actual.filter(s=>!used.has(s)),row.ex).forEach(actual=>lanes.push({ref:null,actual}));
  return lanes.length?lanes:[{ref:null,actual:null}];
}
function dayReviewSection(){
  const m=dayReviewModel();
  const cell=(g,actual)=>{
    if(!g)return '<span class="dr-empty"'+(actual?' data-dr-reveal':'')+'>—</span>';
    return `<div class="dr-value"><span class="dr-weight${g.gain?' dr-gain':''}"${actual?' data-dr-reveal':''}>${hesc(g.load)}</span><span class="dr-reps">${g.chips.map(c=>`<span class="dr-rep${c.gain?' dr-gain':''}"${actual?' data-dr-reveal':''}>${hesc(c.label)}</span>`).join('')}</span>${g.qualifier?`<small>${hesc(g.qualifier)}</small>`:''}</div>`;
  };
  return `<section class="card day-review" aria-label="Whole-day workout comparison">
    <div class="dr-heading"><h3>${hesc(m.title)}</h3>${m.context?.weather?`<span class="dr-weather">${hesc(m.context.weather)}</span>`:''}</div>
    <p class="dr-parts">${[m.context?.location,...m.parts].filter(Boolean).map(hesc).join(' · ')||'Your day, one set at a time.'}</p>
    <table aria-label="${m.planned?'Plan':'Last session'} compared with today"><colgroup><col><col><col></colgroup><thead><tr><th scope="col">${m.unit} · reps</th><th scope="col">${m.planned?'Plan':'Last'}</th><th scope="col"><span data-dr-reveal>Today</span></th></tr></thead><tbody>
    ${m.rows.map(r=>{const lanes=dayReviewLanes(r,m.planned);return lanes.map((l,i)=>`<tr class="${i?'dr-continuation':'dr-exercise'}${i===lanes.length-1?' dr-last-lane':''}">${!i?`<th scope="rowgroup" rowspan="${lanes.length}">${hesc(r.ex)}${r.note?`<small class="dr-note">${hesc(r.note)}</small>`:''}${r.delta.length?`<span class="dr-delta" data-dr-reveal>${r.delta.map(hesc).join(' · ')}</span>`:''}</th>`:''}<td${!l.ref?' class="dr-missing"':''}>${cell(l.ref,false)}</td><td class="dr-actual${!l.actual?' dr-missing':''}">${cell(l.actual,true)}</td></tr>`).join('');}).join('')}
    </tbody></table>${!m.rows.length?'<p class="dr-empty-day">Your logged sets will appear here.</p>':''}
    <div class="dr-totals">${m.values.map((n,i)=>`<div data-dr-reveal${i===0&&n==='—'?' title="Duration unavailable until a timed session is completed"':''}><b>${n}</b><span>${m.labels[i]}</span></div>`).join('')}</div>
    <div class="dr-actions"><button type="button" data-dr-replay><span aria-hidden="true">↻</span> Replay</button><button type="button" class="dr-share" data-dr-share${!m.totals.sets?' disabled':''}>${ICO_SHARE} Share</button></div>
    ${m.totals.sets?dayReviewContextControls(m):'<div class="dr-context"></div>'}
  </section>`;
}
let dayReviewObserver=null;
function dayReviewReplay(card){
  if(!card)return;
  card.getAnimations?.({subtree:true}).forEach(a=>a.cancel());card.classList.remove('dr-pending');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||!card.animate)return;
  const reveal=(el,delay)=>el.animate(el.classList.contains('dr-gain')?[{opacity:0,transform:'translateY(8px) scale(.96)'},{opacity:1,transform:'translateY(-1px) scale(1.04)',offset:.7},{opacity:1,transform:'translateY(0) scale(1)'}]:[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{delay,duration:540,fill:'backwards',easing:'cubic-bezier(.2,.75,.25,1)'});
  reveal(card.querySelector('thead [data-dr-reveal]'),180);
  card.querySelectorAll('tbody tr').forEach((row,i)=>{row.querySelectorAll('.dr-actual [data-dr-reveal]').forEach((el,j)=>reveal(el,420+i*260+j*35));const delta=row.querySelector('.dr-delta');if(delta)reveal(delta,720+i*260);});
  card.querySelectorAll('.dr-totals>div').forEach((el,i)=>reveal(el,540+card.querySelectorAll('tbody tr').length*260+i*70));
}
function bindDayReview(){
  dayReviewObserver?.disconnect();dayReviewObserver=null;
  const card=document.querySelector('.day-review');if(!card)return;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&typeof IntersectionObserver==='function'&&card.animate){
    card.classList.add('dr-pending');
    dayReviewObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){dayReviewObserver.disconnect();dayReviewReplay(card);}},{threshold:.01});
    dayReviewObserver.observe(card);
  }
}
document.addEventListener('click',e=>{
  const replay=e.target.closest('[data-dr-replay]'),share=e.target.closest('[data-dr-share]');
  if(replay)dayReviewReplay(replay.closest('.day-review'));
  if(share&&!share.disabled)shareDayReview(share);
  const locate=e.target.closest('[data-dr-location]'),remove=e.target.closest('[data-dr-context-remove]');
  if(locate)dayReviewAddLocation(locate);
  if(remove&&!checkDate()){const record=DB.days[todayISO];if(record){record.dayContext={removed:true,updatedAt:Date.now()};record.upd=Date.now();save();dayReviewRefreshContext(remove.closest('.day-review'));}}
});

/* The export uses the same formatted values as the DOM, but lays text out
   explicitly so it stays sharp and never depends on screenshot libraries. */
function dayReviewExportModel(){
  const m=dayReviewModel(),css=getComputedStyle(document.documentElement),read=(key,fallback)=>css.getPropertyValue(key).trim()||fallback;
  return {...m,rows:m.rows.map(r=>({...r,lanes:dayReviewLanes(r,m.planned)})),dark:document.documentElement.dataset.theme==='dark',
    colors:{paper:read('--surface','#fff'),ink:read('--chalk','#202124'),muted:read('--muted','#727272'),line:read('--line','#ededed'),chip:read('--surface2','#f5f5f5'),blue:read('--accent','#3546d8'),blueText:read('--accent-ink','#3546d8'),soft:'color-mix(in srgb, '+read('--accent','#3546d8')+' 11%, '+read('--surface','#fff')+')'}};
}
function drawDayReview(data,time,canvas){
  const cv=canvas||document.createElement('canvas'),scale=1080/393;
  if(cv.width!==1080)cv.width=1080;
  const ctx=cv.getContext('2d'),sans='"ShowUp Export Plex", "IBM Plex Sans", sans-serif',mono='"IBM Plex Mono", monospace',C=data.colors;
  const wrap=(s,width,size=14.5)=>{ctx.font='500 '+size+'px '+sans;const lines=[];let line='';for(const word of String(s).split(/\s+/)){if(line&&ctx.measureText(line+' '+word).width>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;};
  const chips=g=>{const lines=[[]];let used=0;ctx.font='500 12px '+sans;for(const chip of g.chips){const w=Math.max(17,ctx.measureText(chip.label).width+7);if(used+w>96&&lines.at(-1).length){lines.push([]);used=0;}lines.at(-1).push({...chip,w});used+=w+3;}return lines;};
  const groupHeight=g=>!g?18:18+(g.chips.length?5+chips(g).length*25-4:0)+(g.qualifier?4+wrap(g.qualifier,96,10).length*13:0);
  const laneHeight=l=>Math.max(groupHeight(l.ref),groupHeight(l.actual));
  const rowHeight=r=>22+Math.max(wrap(r.ex,112).length*19+(r.note?wrap(r.note,112,11).length*14+4:0)+r.delta.length*15,
    r.lanes.reduce((s,l)=>s+laneHeight(l),0)+8*(r.lanes.length-1));
  const meta=wrap([data.context?.location,...data.parts].filter(Boolean).join(' · '),345,13),top=152+meta.length*19,heights=data.rows.map(rowHeight),bottom=top+heights.reduce((a,b)=>a+b,0);
  const hasContext=data.context&&(data.context.location||data.context.weather),h=bottom+(hasContext?122:96),height=Math.ceil(h*scale/2)*2;
  if(cv.height!==height)cv.height=height;
  ctx.setTransform(scale,0,0,scale,0,0);ctx.fillStyle=C.paper;ctx.fillRect(0,0,393,h+1);
  const text=(s,x,y,size=14,color=C.ink,align='left',font=sans,weight=400)=>{ctx.font=weight+' '+size+'px '+font;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(s,x,y);};
  const rule=y=>{ctx.strokeStyle=C.line;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(24,y);ctx.lineTo(369,y);ctx.stroke();};
  const reveal=(delay,paint)=>{const p=Number.isFinite(time)?Math.max(0,Math.min(1,(time-delay)/540)):1;ctx.save();ctx.globalAlpha=p;ctx.translate(0,8*Math.pow(1-p,3));paint();ctx.restore();};
  if(data.logo)ctx.drawImage(data.logo,24,24,98,98*data.logo.height/data.logo.width);
  // Name wraps rather than colliding with the approved lockup.
  wrap(data.name,215,11).slice(0,2).forEach((s,i)=>text(s,369,42+i*14,11,C.muted,'right'));rule(76);
  text(data.title,24,113,23,C.ink,'left',sans,500);
  if(data.context?.weather){const lines=wrap(data.context.weather,118,11).slice(0,2);lines.forEach((s,i)=>text(s,369,(lines.length===1?108:100)+i*15,11,C.muted,'right'));}
  meta.forEach((line,i)=>text(line,24,135+i*19,13,C.muted));
  text(data.unit+' · reps',24,top-14,11,C.muted);text(data.planned?'Plan':'Last',204,top-14,12,C.muted,'center');
  reveal(180,()=>text('Today',318,top-14,12,C.blueText,'center',sans,500));
  let y=top;
  const group=(g,cx,actual,delay,gy,height)=>{
    if(!g){const paint=()=>{ctx.save();ctx.textBaseline='middle';text('—',cx,gy+height/2,13,C.muted,'center');ctx.restore();};actual?reveal(delay,paint):paint();return;}
    let j=0;
      const at=gy+14,load=()=>{if(actual&&g.gain){ctx.font='400 14px '+mono;const w=ctx.measureText(g.load).width+12;ctx.fillStyle=C.blue;ctx.beginPath();ctx.roundRect(cx-w/2,at-16,w,23,6);ctx.fill();}text(g.load,cx,at,14,actual?(g.gain?(data.dark?'#111529':'#fff'):C.blueText):C.muted,'center',mono);};
      actual?reveal(delay+j++*35,load):load();gy+=23;
      if(g.chips.length)chips(g).forEach(line=>{let x=cx-line.reduce((s,c)=>s+c.w+3,0)/2;const cy=gy;
        line.forEach(c=>{const left=x,paint=()=>{ctx.fillStyle=actual?(c.gain?C.blue:C.soft):C.chip;ctx.beginPath();ctx.roundRect(left,cy,c.w,21,5);ctx.fill();text(c.label,left+c.w/2,cy+15,12,actual?(c.gain?(data.dark?'#111529':'#fff'):C.blueText):C.muted,'center',sans,500);};actual?reveal(delay+j++*35,paint):paint();x+=c.w+3;});gy+=25;
      });
      if(g.qualifier)wrap(g.qualifier,96,10).forEach(line=>{text(line,cx,gy+10,10,C.muted,'center');gy+=13;});
  };
  let rowIndex=0;
  data.rows.forEach((r,i)=>{rule(y);let ty=y+25;wrap(r.ex,112).forEach(line=>{text(line,24,ty,14.5,C.ink,'left',sans,500);ty+=19;});
    if(r.note){ty+=2;wrap(r.note,112,11).forEach(line=>{text(line,24,ty,11,C.muted);ty+=14;});}
    r.delta.forEach((line,j)=>{const yy=ty+5+j*15;reveal(420+rowIndex*260+300,()=>text(line,24,yy,11,C.blueText,'left',sans,500));});
    let ly=y+11;r.lanes.forEach(l=>{const height=laneHeight(l);group(l.ref,204,false,0,ly,height);group(l.actual,318,true,420+rowIndex++*260,ly,height);ly+=height+8;});y+=heights[i];
  });
  rule(bottom);data.values.forEach((v,i)=>reveal(540+rowIndex*260+i*70,()=>{const x=24+(i+.5)*345/4;text(v,x,bottom+36,23,C.ink,'center',sans,500);text(data.labels[i],x,bottom+58,12,C.ink,'center');}));
  if(hasContext){text('Location: © OpenStreetMap / Photon · Weather: MET Norway',24,bottom+85,8,C.muted);text('CC BY 4.0 · Conditions estimate at '+new Date(data.context.capturedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}),24,bottom+98,8,C.muted);}
  return cv;
}
async function shareDayReview(button){
  button.disabled=true;
  // Freeze data/units/theme before asynchronous font loading.
  const data=dayReviewExportModel();
  try{
    const module=await import('./plate-gif.js'),video=await import('./plate-video.js');
    const logo=new Image();logo.src='assets/showuppp-lifted-lockup-'+(data.dark?'dark':'light')+'.png';
    await Promise.all([logo.decode(),module.loadExportFonts(),document.fonts.load('400 14px "IBM Plex Mono"')]);data.logo=logo;
    if(!button.isConnected)return; // Do not reopen a share after leaving this day/account.
    await showCard(()=>drawDayReview(data),'showuppp-your-day-'+data.date,false);
    bindPlateExport(data,null,module,video,{gif:false,render:(t,c)=>drawDayReview(data,matchMedia('(prefers-reduced-motion: reduce)').matches?undefined:t,c),duration:Math.max(3500,1800+data.rows.reduce((n,r)=>n+r.lanes.length,0)*260),label:'Your day, set by set'});
  }catch(e){toast('Could not prepare your day. Please try again.');}
  finally{if(button.isConnected)button.disabled=false;}
}
