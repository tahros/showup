/* Whole-day review: frozen plan OR previous exercise session.
   Rendering is read-only. Explicit location consent saves city/weather only;
   no guessed history, retroactive plan links or scores.
   The DOM and share canvas consume the same formatted model. Today emerges
   from blank space; references stay still. All encoding stays on-device. */
// equipOf() creates an override bag on legacy profiles; this view must not.
const dayReviewBody=ex=>(DB.settings.equipOv?.[ex]||DB.settings.custom?.[ex]?.equip||(EZ_NAME.test(ex||'')?'ezbar':null)||SEED.equip[ex]||'machine')==='body';
// Browsing a receipt never changes the logger's date or persists account data.
let drSelection=null,drSelectionDB=null,drSelectionUser=null,drCalendarMonth=null;
function dayReviewDate(){
  if(drSelectionDB!==DB||drSelectionUser!==session?.user?.id){drSelection=null;drCalendarMonth=null;drSelectionDB=DB;drSelectionUser=session?.user?.id;}
  return drSelection&&drSelection<=todayISO?drSelection:todayISO;
}
function dayReviewValidDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&s>='1900-01-01'&&s<=todayISO&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
function dayReviewShift(date,n){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function dayReviewCalendar(date){
  if(!drCalendarMonth)return '';
  const d=new Date(drCalendarMonth+'T12:00:00Z'),year=d.getUTCFullYear(),month=d.getUTCMonth(),days=new Date(Date.UTC(year,month+1,0)).getUTCDate();
  return `<div class="dr-calendar" id="drCalendar" aria-label="Choose review date"><div class="dr-month"><button type="button" data-dr-month="-1" aria-label="Previous month"${drCalendarMonth<='1900-01-01'?' disabled':''}>${icon('chevron',16)}</button><span>${d.toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'})}</span><button type="button" data-dr-month="1" aria-label="Next month"${drCalendarMonth>=todayISO.slice(0,8)+'01'?' disabled':''}>${icon('chevron',16)}</button></div><div class="dr-calendar-grid">${['S','M','T','W','T','F','S'].map(s=>`<span aria-hidden="true">${s}</span>`).join('')}${'<span></span>'.repeat(d.getUTCDay())}${Array.from({length:days},(_,i)=>{const s=drCalendarMonth.slice(0,8)+String(i+1).padStart(2,'0');return `<button type="button" data-dr-date="${s}" aria-label="${hesc(pretty(s))}" aria-pressed="${s===date}"${s===todayISO?' aria-current="date"':''}${s>todayISO?' disabled':''}>${i+1}</button>`;}).join('')}</div></div>`;
}
function dayReviewNavigate(card,date,focus='[data-dr-calendar]'){
  dayReviewDate();if(!dayReviewValidDate(date))return;
  drSelection=date===todayISO?null:date;drCalendarMonth=null;dayReviewReplace(card,focus);
}
function dayReviewReplace(card,focus){
  if(!card?.isConnected)return;
  dayReviewObserver?.disconnect();dayReviewObserver=null;
  const top=card.getBoundingClientRect().top,t=document.createElement('template');t.innerHTML=dayReviewSection();const next=t.content.firstElementChild;card.replaceWith(next);
  window.scrollBy?.(0,next.getBoundingClientRect().top-top);
  const target=next.querySelector(focus);(target&&!target.disabled?target:next.querySelector('[data-dr-calendar]'))?.focus({preventScroll:true});
}
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
    const note=planned?(!inPlan&&actual.length?(date===todayISO?'Added today':'Added that day'):!ref.length&&inPlan?'No set targets':''):(lastDate?new Date(lastDate+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric',...(lastDate.slice(0,4)!==date.slice(0,4)?{year:'numeric'}:{})}):'First session');
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
  const temperature=valid?`${Math.round(isLb()?w.c*9/5+32:w.c)}°${isLb()?'F':'C'}`:'';
  const night=valid&&w.symbol.endsWith('_night');
  const icon=condition==='Thunder'?'thunder':condition==='Snow'?'snow':condition==='Sleet'?'sleet':condition==='Rain'?'rain':condition==='Clear'?(night?'moon':'sun'):condition==='Mostly clear'||condition==='Partly cloudy'?(night?'moon-cloud':'sun-cloud'):condition==='Cloudy'?'cloud':condition==='Fog'?'fog':null;
  return {location,weather:temperature+(condition?' · '+condition:''),temperature,condition,icon,capturedAt:Number(v.capturedAt)||0};
}
// Original filled geometry, shared by inline SVG and canvas exports. No font
// glyphs, external image requests or third-party icon assets are required.
function dayReviewWeatherPaths(kind){
  const sun='M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z M11 0h2v4h-2Z M11 20h2v4h-2Z M0 11h4v2H0Z M20 11h4v2h-4Z M3 1.6 5.8 4.4 4.4 5.8 1.6 3Z M18.2 19.6 19.6 18.2 22.4 21 21 22.4Z M18.2 4.4 21 1.6 22.4 3 19.6 5.8Z M1.6 21 4.4 18.2 5.8 19.6 3 22.4Z';
  const moon='M17 1A11 11 0 1 0 23 17 10 10 0 0 1 17 1Z';
  const cloud='M6 18a5 5 0 0 1-.5-10 6.5 6.5 0 0 1 12.4-.7A5.4 5.4 0 0 1 19 18Z';
  const rain='M7 19h2l-2 5H5Z M13 19h2l-2 5h-2Z M19 19h2l-2 5h-2Z';
  const snow='M7 19h2v1h1v2H9v1H7v-1H6v-2h1Z M16 19h2v1h1v2h-1v1h-2v-1h-1v-2h1Z';
  if(kind==='sun'||kind==='moon')return [kind==='sun'?sun:moon];
  if(kind==='sun-cloud'||kind==='moon-cloud')return [kind==='sun-cloud'?'M9 0a7 7 0 1 0 0 14A7 7 0 0 0 9 0Z':'M11 0A7 7 0 1 0 16 10 7 7 0 0 1 11 0Z','M8 23a5 5 0 0 1-.5-10 6.5 6.5 0 0 1 12.4-.7A5.4 5.4 0 0 1 19 23Z'];
  if(kind==='cloud')return [cloud];
  if(kind==='rain')return [cloud,rain];
  if(kind==='snow')return [cloud,snow];
  if(kind==='sleet')return [cloud,'M7 19h2l-2 5H5Z M16 19h2v1h1v2h-1v1h-2v-1h-1v-2h1Z'];
  if(kind==='thunder')return [cloud,'M12 15h5l-4 5h3l-7 4 2-6H8Z'];
  if(kind==='fog')return [cloud,'M2 20h20v1.5H2Z M5 23h14v1H5Z'];
  return [];
}
function dayReviewWeatherHTML(context){
  const paths=dayReviewWeatherPaths(context.icon);
  return `<span class="dr-weather" role="img" aria-label="${hesc(context.weather)}" title="${hesc(context.weather)}"><span aria-hidden="true">${hesc(context.temperature)}</span>${paths.length?`<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">${paths.map(d=>`<path d="${d}"/>`).join('')}</svg>`:''}</span>`;
}
function dayReviewContextControls(m){
 const added=m.context&&(m.context.location||m.context.weather);
 if(m.date!==todayISO)return `<div class="dr-context">${added?'<small>Location: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> via Photon · Weather: <a href="https://www.met.no/en/free-meteorological-data/Licensing-and-crediting" target="_blank" rel="noopener">MET Norway / CC BY 4.0</a></small>':''}</div>`;
 return `<div class="dr-context"><button type="button" data-dr-location>${added?'Update location & weather':'Allow location'}</button>${added?'<button type="button" data-dr-context-remove>Remove</button>':''}<p class="dr-context-status" role="status">${added?'':'Optional: add your current city and weather to this day and its share card.'}</p>${added?'<small>Location: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> via Photon · Weather: <a href="https://www.met.no/en/free-meteorological-data/Licensing-and-crediting" target="_blank" rel="noopener">MET Norway / CC BY 4.0</a></small>':''}</div>`;
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
 if(dayReviewDate()!==todayISO)return;
 if(dayReviewLocating)return;dayReviewLocating=true;
 const card=button.closest('.day-review'),account=DB,user=session?.user?.id,date=todayISO,contextAt=DB.days[date]?.dayContext?.updatedAt;
 const same=()=>DB===account&&session?.user?.id===user&&todayISO===date&&dayReviewDate()===date&&card.isConnected&&DB.days[date]?.dayContext?.updatedAt===contextAt;
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
  const date=dayReviewDate(),m=dayReviewModel(date),current=date===todayISO;
  const cell=(g,actual)=>{
    if(!g)return '<span class="dr-empty"'+(actual?' data-dr-reveal':'')+'>—</span>';
    return `<div class="dr-value"><span class="dr-weight${g.gain?' dr-gain':''}"${actual?' data-dr-reveal':''}>${hesc(g.load)}</span><span class="dr-reps">${g.chips.map(c=>`<span class="dr-rep${c.gain?' dr-gain':''}"${actual?' data-dr-reveal':''}>${hesc(c.label)}</span>`).join('')}</span>${g.qualifier?`<small>${hesc(g.qualifier)}</small>`:''}</div>`;
  };
  return `<section class="card day-review" data-dr-selected="${date}" aria-label="Whole-day workout comparison">
    <div class="dr-heading"><h3><button type="button" data-dr-calendar aria-label="Choose date, ${hesc(m.title)}" aria-expanded="${!!drCalendarMonth}" aria-controls="drCalendar">${hesc(m.title)}<span class="dr-down">${icon('chevron',14)}</span></button></h3><div class="dr-date-arrows"><button type="button" data-dr-step="-1" aria-label="Previous day"${date==='1900-01-01'?' disabled':''}>${icon('chevron',16)}</button><button type="button" data-dr-step="1" aria-label="Next day"${current?' disabled':''}>${icon('chevron',16)}</button></div></div>
    <div class="dr-parts"><span>${[m.context?.location,...m.parts].filter(Boolean).map(hesc).join(' · ')||'Your day, one set at a time.'}</span>${m.context?.weather?dayReviewWeatherHTML(m.context):''}<button type="button" data-dr-today${current?' disabled':''}>Today</button></div>
    ${dayReviewCalendar(date)}
    <table aria-label="${m.planned?'Plan':'Last session'} compared with ${current?'today':hesc(m.title)}"><colgroup><col><col><col></colgroup><thead><tr><th scope="col">${m.unit} · reps</th><th scope="col">${m.planned?'Plan':'Last'}</th><th scope="col"><span data-dr-reveal>${current?'Today':'Logged'}</span></th></tr></thead><tbody>
    ${m.rows.map(r=>{const lanes=dayReviewLanes(r,m.planned);return lanes.map((l,i)=>`<tr class="${i?'dr-continuation':'dr-exercise'}${i===lanes.length-1?' dr-last-lane':''}">${!i?`<th scope="rowgroup" rowspan="${lanes.length}"><div class="dr-exercise-label">${hesc(r.ex)}${r.note?`<small class="dr-note">${hesc(r.note)}</small>`:''}${r.delta.length?`<span class="dr-delta" data-dr-reveal>${r.delta.map(hesc).join(' · ')}</span>`:''}</div></th>`:''}<td${!l.ref?' class="dr-missing"':''}>${cell(l.ref,false)}</td><td class="dr-actual${!l.actual?' dr-missing':''}">${cell(l.actual,true)}</td></tr>`).join('');}).join('')}
    </tbody></table>${!m.rows.length?`<p class="dr-empty-day">${current?'Your logged sets will appear here.':'No workout logged on this day.'}</p>`:''}
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
  const nav=e.target.closest('[data-dr-calendar],[data-dr-step],[data-dr-date],[data-dr-month],[data-dr-today]');
  if(nav&&!nav.disabled){const card=nav.closest('.day-review'),date=dayReviewDate();
    if(nav.hasAttribute('data-dr-calendar')){drCalendarMonth=drCalendarMonth?null:date.slice(0,8)+'01';dayReviewReplace(card,drCalendarMonth?'[data-dr-date="'+date+'"]':'[data-dr-calendar]');}
    else if(nav.dataset.drMonth&&drCalendarMonth){const d=new Date(drCalendarMonth+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+Number(nav.dataset.drMonth));const month=d.toISOString().slice(0,10);if(month>='1900-01-01'&&month<=todayISO){drCalendarMonth=month;dayReviewReplace(card,'[data-dr-month="'+nav.dataset.drMonth+'"]');}}
    else dayReviewNavigate(card,nav.hasAttribute('data-dr-today')?todayISO:nav.dataset.drDate||dayReviewShift(date,Number(nav.dataset.drStep)));
    return;
  }
  const replay=e.target.closest('[data-dr-replay]'),share=e.target.closest('[data-dr-share]');
  if(replay)dayReviewReplay(replay.closest('.day-review'));
  if(share&&!share.disabled)shareDayReview(share);
  const locate=e.target.closest('[data-dr-location]'),remove=e.target.closest('[data-dr-context-remove]');
  if(locate)dayReviewAddLocation(locate);
  if(remove&&dayReviewDate()===todayISO&&!checkDate()){const record=DB.days[todayISO];if(record){record.dayContext={removed:true,updatedAt:Date.now()};record.upd=Date.now();save();dayReviewRefreshContext(remove.closest('.day-review'));}}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drCalendarMonth&&e.target.closest('.day-review')){drCalendarMonth=null;dayReviewReplace(e.target.closest('.day-review'),'[data-dr-calendar]');}});

/* The export uses the same formatted values as the DOM, but lays text out
   explicitly so it stays sharp and never depends on screenshot libraries. */
function dayReviewExportModel(){
  const m=dayReviewModel(dayReviewDate()),css=getComputedStyle(document.documentElement),read=(key,fallback)=>css.getPropertyValue(key).trim()||fallback;
  return {...m,actualLabel:m.date===todayISO?'Today':'Logged',firstName:m.name.trim().split(/\s+/)[0]||'',dayCount:m.date===todayISO?msLiveTotal():[...workoutDates()].filter(d=>d<=m.date).length,rows:m.rows.map(r=>({...r,lanes:dayReviewLanes(r,m.planned)})),dark:document.documentElement.dataset.theme==='dark',
    colors:{paper:read('--surface','#fff'),ink:read('--chalk','#202124'),muted:read('--muted','#727272'),line:read('--line','#ededed'),chip:read('--surface2','#f5f5f5'),blue:read('--accent','#3546d8'),blueText:read('--accent-ink','#3546d8'),soft:'color-mix(in srgb, '+read('--accent','#3546d8')+' 11%, '+read('--surface','#fff')+')'}};
}
function drawDayReview(data,time,canvas){
  const cv=canvas||document.createElement('canvas'),scale=1080/560;
  if(cv.width!==1080)cv.width=1080;
  const ctx=cv.getContext('2d'),sans='"ShowUp Export Plex", "IBM Plex Sans", sans-serif',mono='"IBM Plex Mono", monospace';
  const C=data.dark?{paper:'#1b1b1b',ink:'#f4f3f0',muted:'#a1a3a7',quiet:'#77797e',line:'#303033',blue:'#526fe0',accent:'#99adff'}:
    {paper:'#fff',ink:'#202124',muted:'#62656b',quiet:'#77797e',line:'#e5e5e8',blue:'#3546d8',accent:'#3546d8'};
  const T={title:33,context:14,heading:14,small:13,exercise:20,load:19,rep:17,qualifier:12};
  // One 560-unit layout drives stills and every video frame. No data rewriting.
  const wrap=(s,width,size=T.exercise,weight=600,font=sans)=>{
    ctx.font=weight+' '+size+'px '+font;const lines=[];let line='';
    for(const word of String(s||'').split(/\s+/)){
      if(!word)continue;
      if(line&&ctx.measureText(line+' '+word).width>width){lines.push(line);line='';}
      for(const ch of word){if(line&&ctx.measureText(line+ch).width>width){lines.push(line);line='';}line+=ch;}
      line+=' ';
    }
    if(line.trim())lines.push(line.trim());return lines.map(s=>s.trim());
  };
  const chips=g=>{const lines=[[]];let used=0;ctx.font='400 '+T.rep+'px '+sans;
    for(const chip of g.chips){const w=Math.max(17,ctx.measureText(chip.label).width+8);
      if(used+w>128&&lines.at(-1).length){lines.push([]);used=0;}lines.at(-1).push({...chip,w});used+=w+3;}return lines;};
  const loadLines=g=>wrap(g.load,126,T.load,600,mono);
  const loadRows=l=>Math.max(l.ref?loadLines(l.ref).length:0,l.actual?loadLines(l.actual).length:0);
  const groupHeight=(g,n)=>!g?25:n*26+(g.chips.length?1+chips(g).length*25:0)+(g.qualifier?4+wrap(g.qualifier,126,T.qualifier,400).length*17:0);
  const laneHeight=l=>Math.max(groupHeight(l.ref,loadRows(l)),groupHeight(l.actual,loadRows(l)));
  const labelHeight=r=>wrap(r.ex,196).length*26+(r.note?wrap(r.note,196,T.small,400).length*18+4:0);
  const rowHeight=r=>22+Math.max(labelHeight(r),r.lanes.reduce((s,l)=>s+laneHeight(l),0)+9*Math.max(0,r.lanes.length-1));
  const dates=wrap(data.title,298,T.title),focus=wrap(data.parts.join(' · '),298,20);
  const location=wrap(data.context?.location,186,T.context,400),hasWeather=!!data.context?.weather;
  const leftHeight=dates.length*38+(focus.length?5+focus.length*26:0),rightHeight=location.length*20+(hasWeather?23:0);
  const contextY=107,contextHeight=Math.max(leftHeight,rightHeight),top=contextY+contextHeight+29+30;
  const heights=data.rows.map(rowHeight),bottom=top+heights.reduce((a,b)=>a+b,0),footerY=bottom+93;
  const hasContext=!!(data.context?.location||data.context?.weather);
  const credits=hasContext?['Location: © OpenStreetMap / Photon','Weather: MET Norway / CC BY 4.0']:[];
  const names=wrap(data.firstName,175,14,400);
  const pipHeight=data.pipBounds?38*data.pipBounds.h/data.pipBounds.w:24;
  const footerHeight=Math.max(pipHeight,names.length*18,credits.length*12),h=footerY+20+footerHeight+30;
  const height=Math.ceil(h*scale/2)*2;if(cv.height!==height)cv.height=height;
  ctx.setTransform(scale,0,0,scale,0,0);ctx.fillStyle=C.paper;ctx.fillRect(0,0,560,h+1);
  const text=(s,x,y,size=T.small,color=C.ink,align='left',font=sans,weight=400)=>{ctx.font=weight+' '+size+'px '+font;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(s,x,y);};
  const ink=(s,x,cy,size,color,align='left',font=sans,weight=400)=>{
    ctx.font=weight+' '+size+'px '+font;const m=ctx.measureText(s);
    text(s,x,cy+((m.actualBoundingBoxAscent||size*.75)-(m.actualBoundingBoxDescent||0))/2,size,color,align,font,weight);
  };
  const rule=y=>{ctx.strokeStyle=C.line;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(28,y);ctx.lineTo(532,y);ctx.stroke();};
  const reveal=(delay,paint)=>{const p=Number.isFinite(time)?Math.max(0,Math.min(1,(time-delay)/540)):1;ctx.save();ctx.globalAlpha=p;ctx.translate(0,8*Math.pow(1-p,3));paint();ctx.restore();};
  if(data.wordmark){const w=57,wh=w*data.wordmark.height/data.wordmark.width;ctx.save();ctx.filter='brightness(0) saturate(100%) invert(63%)';ctx.drawImage(data.wordmark,28,30,w,wh);ctx.restore();}
  ctx.font='600 24px '+mono;const dayWidth=ctx.measureText(String(data.dayCount)).width;
  text('DAY',532-dayWidth-10,58,13,C.muted,'right',mono);text(String(data.dayCount),532,58,24,C.muted,'right',mono,600);
  let yy=contextY+(contextHeight-leftHeight)/2;
  dates.forEach(s=>{ink(s,28,yy+19,T.title,C.ink,'left',sans,600);yy+=38;});
  if(focus.length)yy+=5;focus.forEach(s=>{ink(s,28,yy+13,20,C.ink,'left',sans,600);yy+=26;});
  yy=contextY+(contextHeight-rightHeight)/2;
  location.forEach(s=>{ink(s,532,yy+10,14,C.muted,'right');yy+=20;});
  if(hasWeather){const paths=dayReviewWeatherPaths(data.context.icon);ink(data.context.temperature,paths.length?508:532,yy+11.5,14,C.muted,'right');
    if(paths.length){ctx.save();ctx.translate(515,yy+2);ctx.scale(18/24,18/24);ctx.fillStyle=C.muted;paths.forEach(d=>ctx.fill(new Path2D(d)));ctx.restore();}}
  const refX=307.72,actualX=453.88;
  text(data.unit+' · reps',28,top-13,14,C.muted);text(data.planned?'Plan':'Last',refX,top-13,14,C.muted,'center');
  reveal(180,()=>text(data.actualLabel||'Today',actualX,top-13,14,C.accent,'center'));
  const group=(g,cx,actual,delay,gy,height,nLoads)=>{
    if(!g){const paint=()=>ink('—',cx,gy+height/2,18,C.quiet,'center');actual?reveal(delay,paint):paint();return;}
    let j=0;const start=gy;
    loadLines(g).forEach(line=>{const cy=gy+13,paint=()=>{
      if(actual&&g.gain){ctx.font='600 19px '+mono;const w=ctx.measureText(line).width+10;ctx.fillStyle=C.blue;ctx.beginPath();ctx.roundRect(cx-w/2,cy-12,w,25,4);ctx.fill();}
      ink(line,cx,cy,19,actual?(g.gain?'#fff':C.ink):C.quiet,'center',mono,600);
    };actual?reveal(delay+Math.min(j++*35,180),paint):paint();gy+=26;});
    gy=start+nLoads*26;
    if(g.chips.length){gy+=1;chips(g).forEach(line=>{let x=cx-(line.reduce((s,c)=>s+c.w,0)+3*(line.length-1))/2;const cy=gy+12.5;
      line.forEach(c=>{const left=x,isTime=!!g.sets?.[0]?.cardio,highlight=actual&&c.gain&&!isTime,paint=()=>{if(highlight){ctx.fillStyle=C.blue;ctx.beginPath();ctx.roundRect(left,cy-12.5,c.w,25,4);ctx.fill();}
        ink(c.label,left+c.w/2,cy,17,actual?(highlight?'#fff':C.ink):C.quiet,'center',isTime?mono:sans,400);
      };actual?reveal(delay+Math.min(j++*35,180),paint):paint();x+=c.w+3;});gy+=25;});}
    if(g.qualifier){gy+=4;wrap(g.qualifier,126,12,400).forEach(line=>{const cy=gy+8.5,paint=()=>ink(line,cx,cy,12,actual?C.muted:C.quiet,'center');actual?reveal(delay+Math.min(j++*35,180),paint):paint();gy+=17;});}
  };
  let y=top,rowIndex=0;
  data.rows.forEach((r,i)=>{rule(y);let ly=y+(heights[i]-labelHeight(r))/2;
    wrap(r.ex,196).forEach(line=>{ink(line,28,ly+13,20,r.actual.length?C.ink:C.quiet,'left',sans,600);ly+=26;});
    if(r.note){ly+=4;wrap(r.note,196,13,400).forEach(line=>{ink(line,28,ly+9,13,C.muted);ly+=18;});}
    ly=y+11;r.lanes.forEach(l=>{const lh=laneHeight(l),n=loadRows(l);group(l.ref,refX,false,0,ly,lh,n);group(l.actual,actualX,true,420+rowIndex++*260,ly,lh,n);ly+=lh+9;});y+=heights[i];
  });
  rule(bottom);data.values.forEach((v,i)=>reveal(540+rowIndex*260+i*70,()=>{const x=28+(i+.5)*126;ink(v,x,bottom+39,30,C.ink,'center',sans,600);ink(data.labels[i],x,bottom+69,11,C.muted,'center',mono);}));
  rule(footerY);const mid=footerY+20+footerHeight/2;
  credits.forEach((s,i)=>ink(s,28,mid+(i-(credits.length-1)/2)*12,8,C.muted));
  names.forEach((s,i)=>ink(s,485,mid+(i-(names.length-1)/2)*18,14,C.muted,'right'));
  if(data.pip&&data.pipBounds){const b=data.pipBounds;ctx.save();ctx.filter='grayscale(1) brightness(.72)';ctx.drawImage(data.pip,b.x,b.y,b.w,b.h,494,mid-pipHeight/2,38,pipHeight);ctx.restore();}
  return cv;
}
async function shareDayReview(button){
  button.disabled=true;
  // Freeze data/units/theme before asynchronous font loading.
  const data=dayReviewExportModel();
  try{
    const module=await import('./plate-gif.js'),video=await import('./plate-video.js');
    const wordmark=new Image(),pip=new Image();wordmark.src='assets/showuppp-wordmark-'+(data.dark?'dark':'light')+'.svg';pip.src='assets/mascot-'+(data.dark?'white':'blue')+'.png';
    await Promise.all([wordmark.decode(),pip.decode(),module.loadExportFonts(),document.fonts.load('600 14px "IBM Plex Mono"')]);data.wordmark=wordmark;data.pip=pip;
    const trim=document.createElement('canvas');trim.width=pip.width;trim.height=pip.height;const tx=trim.getContext('2d');tx.drawImage(pip,0,0);const pixels=tx.getImageData(0,0,pip.width,pip.height).data;let x0=pip.width,y0=pip.height,x1=0,y1=0;
    for(let y=0;y<pip.height;y++)for(let x=0;x<pip.width;x++)if(pixels[(y*pip.width+x)*4+3]>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    data.pipBounds={x:x0,y:y0,w:Math.max(1,x1-x0+1),h:Math.max(1,y1-y0+1)};
    if(!button.isConnected)return; // Do not reopen a share after leaving this day/account.
    await showCard(()=>drawDayReview(data),'showuppp-your-day-'+data.date,false);
    bindPlateExport(data,null,module,video,{gif:false,render:(t,c)=>drawDayReview(data,matchMedia('(prefers-reduced-motion: reduce)').matches?undefined:t,c),duration:Math.max(3500,1800+data.rows.reduce((n,r)=>n+r.lanes.length,0)*260),label:'Your day, set by set'});
  }catch(e){toast('Could not prepare your day. Please try again.');}
  finally{if(button.isConnected)button.disabled=false;}
}
