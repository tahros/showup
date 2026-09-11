/* ShowUp — the planning workspace. Drafts never write the workout ledger.
   Classic script, loaded after writer.js. Previous UI remains a local switch.
   Saved plans use the existing cloud document; only unfinished drafts are local. */
const PW_MODE_KEY='showup:planning-interface';
const pwCopy=x=>JSON.parse(JSON.stringify(x));
let pwState=null, pwOwner=null, pwRequest=0, pwPaintedStep=null;
function planningWorkspace(){ try{return localStorage.getItem(PW_MODE_KEY)!=='previous';}catch(_){return true;} }
function pwKey(){return 'showup:planning-draft:v1:'+(session?.user?.id||'local');}
function pwDate(iso,long=false){return new Date(iso+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',...(long?{year:'numeric'}:{})});}
function pwISO(d){return d.toLocaleDateString('en-CA');}
function pwSaved(d){return (DB.plan?.d===d?DB.plan:DB.week?.days?.[d])||null;}
function pwFingerprint(d){return JSON.stringify(pwSaved(d));}
function pwRead(text){return parsePlan(text).map(r=>r.kind==='ex'&&!r.ex?{kind:'note',raw:planTextFromRows([r]).trim()}:{...r,...(r.lines?{lines:r.lines.flatMap(l=>Array.from({length:Math.ceil(l.reps.length/12)},(_,i)=>({...l,unit:l.unit||U(),reps:l.reps.slice(i*12,i*12+12)})))}:{})});}
function pwText(rows){
  // Numeric rows are the truth after checks/adjustment. Old raw text can still
  // describe a pre-clamp weight or the old number of sets.
  return (rows||[]).map(r=>{
    if(r.kind!=='ex'||!r.ex)return r.raw||'';
    return r.ex+'\n'+r.lines.map(l=>{
      const unit=l.unit||U(),weight=+Number(l.w||0).toFixed(4);
      const load=l.nw?'by feel':l.bw?(weight?`BW +${weight} ${unit}`:'BW'):`${l.est?'≈':''}${weight} ${unit}`;
      const reps=isHold(l.su)?`${l.reps[0]} sec × ${l.reps.length}`:l.reps.join(' ');
      return `  ${l.tag?l.tag+': ':''}${load} × ${reps}${l.qual?' ('+l.qual+')':''}`;
    }).join('\n');
  }).join('\n\n')+'\n';
}
function pwCounts(rows){let total=0,warm=0;for(const r of rows||[])for(const l of r.lines||[]){total+=l.reps.length;if(/warm/i.test((l.qual||'')+(l.tag||'')))warm+=l.reps.length;}return {total,warm,work:total-warm};}
function pwExercises(rows){return (rows||[]).filter(r=>r.kind==='ex'&&r.ex);}
function pwParts(rows){return [...new Set(pwExercises(rows).map(r=>homePartOf(r.ex)).filter(Boolean))];}
function pw(){
  const key=pwKey();
  if(pwOwner!==key){
    pwOwner=key;pwState=null;pwRequest++;
    try{const x=JSON.parse(localStorage.getItem(key));if(x?.v===1&&Array.isArray(x.dates)&&x.book&&typeof x.book==='object')pwState=x;}catch(_){}
    if(!pwState)pwState={v:1,step:'dates',dates:[],active:null,book:{},objective:['grow','lose','strength'].includes(DB.settings.objective)?DB.settings.objective:'grow',note:''};
    pwState.busy=false;pwState.error='';pwState.candidate=null;
    if(['busy','candidate','dates','focus','review'].includes(pwState.step))pwState.step='edit';
  }
  return pwState;
}
function pwPersist(){const s=pw();try{localStorage.setItem(pwKey(),JSON.stringify({...s,busy:false,candidate:null,error:''}));return true;}catch(_){s.error='This device cannot keep a draft between visits. Keep this screen open until you save.';return false;}}
function pwDay(d){
  const s=pw();if(!s.book[d]){const saved=pwSaved(d),rows=saved?pwRead(planText(saved)):[];
    s.book[d]={rows,parts:pwParts(rows),title:saved?.title||'',base:pwFingerprint(d),source:saved?'Saved plan':'Your draft',notes:[],locks:[],target:null};
  }return s.book[d];
}
function pwOpen(d,step){
  const s=pw();s.error='';s.candidate=null;
  const resume=!d&&!step&&['paste','editrow','adjust'].includes(s.step);
  if(s.busy){pwRequest++;lift.writeAbort?.abort();s.busy=false;}
  if(d){s.dates=[d];s.active=d;s.month=d.slice(0,7)+'-01';pwDay(d);}
  else if(!s.dates.length){s.active=dayClosed()?tomorrowISO():writeDateISO();s.dates=[s.active];pwDay(s.active);}
  s.step=resume?s.step:'edit';s.datesOpen=step==='dates';
  pwPaintedStep=null;lift.plan='workspace';view='today';pwPersist();render({soft:true});
}
function pwGo(step){const s=pw();s.step=step;s.error='';pwPersist();render({inplace:true});}
function pwButton(action,label,cls='',extra=''){return `<button type="button" class="pw-btn ${cls}" data-pw="${action}" ${extra}>${label}</button>`;}
function pwFields(){const s=pw(),goals=[['lose','Lose weight'],['strength','Strength'],['grow','Grow']];return `<div class="pw-goal"><label for="pw-goal">Training goal</label><input id="pw-goal" type="range" min="0" max="2" step="1" data-pw-field="goal" value="${Math.max(0,goals.findIndex(g=>g[0]===s.objective))}" aria-valuetext="${goals.find(g=>g[0]===s.objective)?.[1]||'Grow'}"><div class="pw-goal-labels">${goals.map(([v,t])=>pwButton('goal',t,s.objective===v?'pw-goal-on':'pw-text',`data-goal="${v}" aria-pressed="${s.objective===v}"`)).join('')}</div></div>`;}
function pwCalendarIcon(){const svg=document.querySelector('#nav [data-v="history"] svg')?.cloneNode(true);if(!svg)return '';svg.setAttribute('class','pw-calendar-icon');svg.setAttribute('aria-hidden','true');return svg.outerHTML;}
function pwAction(action,label,glyph,cls='',extra=''){return pwButton(action,icon(glyph,ICON_SZ.sm)+label,cls,extra);}
function pwDatesButton(action='open'){return pwButton(action,pwCalendarIcon()+'Dates '+icon('chevron',ICON_SZ.sm),'pw-text','aria-label="Choose dates"');}
function pwTabs(){const s=pw();return `<div class="pw-days" aria-label="Days being planned">${s.dates.map(d=>pwButton('day',hesc(pwDate(d)),s.active===d?'selected':'',`data-date="${d}" aria-pressed="${s.active===d}"`)).join('')}</div>`;}
function pwRowsHTML(rows,editable=false){
  const s=pw(),day=s.active?pwDay(s.active):null;
  return `<div class="pw-exercises">${(rows||[]).map((r,i)=>{
    if(r.kind!=='ex'||!r.ex)return `<div class="pw-unread" data-pw-row="${i}"><span class="pw-eyebrow">Kept as a note · check this line</span><pre>${hesc(r.raw||r.name||'')}</pre>${editable?pwButton('editrow','Edit text','pw-text',`data-index="${i}"`):''}</div>`;
    return `<article class="pw-exercise ${editable?'pw-editable':''}" data-pw-row="${i}"><div class="pw-ex-title"><strong>${hesc(r.ex)}</strong>${editable?`<div class="pw-row-actions">${pwButton('editrow',icon('edit',ICON_SZ.md),'pw-icon',`data-index="${i}" aria-label="Edit ${hesc(r.ex)}" title="Edit exercise"`)}${pwButton('remove',icon('clear',ICON_SZ.md),'pw-icon',`data-index="${i}" aria-label="Remove ${hesc(r.ex)}" title="Remove exercise"`)}</div>`:''}</div><div class="pw-ex-body"><pre class="pw-prescription">${hesc(pwText([r]).split('\n').slice(1).map(line=>line.trim()).join('\n'))}</pre>${editable?`<div class="pw-ex-tools">${pwButton('lock',day.locks.includes(i)?'Kept fixed':'Keep fixed',day.locks.includes(i)?'pw-fixed':'pw-text',`data-index="${i}" aria-pressed="${day.locks.includes(i)}"`)}</div>`:''}</div>${editable?`<button type="button" class="pw-btn pw-grip" data-pw-grip="${i}" aria-label="Reorder ${hesc(r.ex)}" aria-describedby="pw-reorder-help" title="Hold and drag · arrow keys to move">${icon('grip',ICON_SZ.md)}</button>`:''}</article>`;
  }).join('')}</div>`;
}
function pwTodayHTML(){
  const s=pw(),closed=dayClosed(),now=planNow();
  const future=[...new Set([...(DB.plan?.d>todayISO?[DB.plan.d]:[]),...Object.keys(DB.week?.days||{}).filter(d=>d>todayISO)])].sort();
  const next=future[0]||tomorrowISO(),upcoming=pwSaved(next);
  let html=`<section class="pw-home"><div class="pw-home-heading"><h2>${closed?'Plan ahead':'Your plan'}</h2>${pwDatesButton()}</div>`;
  if(now&&!closed)html+=`<details class="pw-saved"><summary><span>Today</span><span>${now.items.length} exercises</span></summary>${planCardHTML(now,true)}${pwAction('open-date','Edit','edit','pw-text',`data-date="${todayISO}"`)}</details>`;
  if(closed||!now)html+=`<div class="card pw-home-card"><span class="pw-eyebrow">${closed?(next===tomorrowISO()?'Tomorrow':hesc(pwDate(next))):'Next workout'}</span><h3>${upcoming&&closed?hesc(pwParts(pwRead(planText(upcoming))).join(' + ')||'Your plan'):'Plan your next workout'}</h3>${upcoming&&closed?'<p class="pw-small">Ready to go.</p>':''}<div class="pw-actions">${pwAction('open-date',upcoming&&closed?'Edit':'Plan',upcoming&&closed?'edit':'sparkle','primary',`data-date="${closed?next:writeDateISO()}"`)}${pwAction('paste-open','Paste','paste','',`data-date="${closed?next:writeDateISO()}"`)}</div></div>`;
  if(future.length)html+=`<div class="pw-saved pw-coming ${s.upcomingOpen?'is-open':''}"><button type="button" class="pw-disclosure" data-pw="upcoming" aria-expanded="${!!s.upcomingOpen}" aria-controls="pw-coming-days"><span>Coming up</span><span>${future.length} planned ${future.length===1?'day':'days'}</span>${icon('chevron',ICON_SZ.sm)}</button><div id="pw-coming-days" class="pw-fold" ${s.upcomingOpen?'':'inert'}><div>${future.map(d=>`<div class="pw-upcoming"><div><strong>${hesc(pwDate(d))}</strong><span class="pw-small">${hesc(pwParts(pwRead(planText(pwSaved(d)))).join(' · '))}</span></div>${pwAction('open-date','Edit','edit','',`data-date="${d}"`)}</div>`).join('')}</div></div></div>`;
  const drafts=s.dates.filter(d=>d>=todayISO&&s.book[d]&&s.book[d].source!=='Saved plan'&&(s.book[d].rows.length||s.book[d].parts.length));
  if(drafts.length)html+=pwAction('resume','Resume draft','edit','pw-resume');
  return html+'</section>';
}
function pwCalendarHTML(){
  const s=pw(),base=new Date((s.month||(s.active||todayISO).slice(0,7)+'-01')+'T12:00');base.setDate(1);
  const start=new Date(base);start.setDate(1-base.getDay());
  const count=Math.ceil((base.getDay()+new Date(base.getFullYear(),base.getMonth()+1,0).getDate())/7)*7;
  return `<div class="card pw-calendar-panel"><div class="pw-month">${pwButton('month',icon('chevron',ICON_SZ.sm,180),'pw-icon','data-delta="-1" aria-label="Previous month"')}<strong>${base.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong>${pwButton('month',icon('chevron',ICON_SZ.sm),'pw-icon','data-delta="1" aria-label="Next month"')}</div><div class="pw-calendar">${['S','M','T','W','T','F','S'].map(x=>`<span class="pw-weekday">${x}</span>`).join('')}${Array.from({length:count},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);const iso=pwISO(d);return pwButton('date',String(d.getDate()),`${s.dates.includes(iso)?'selected':''} ${d.getMonth()!==base.getMonth()?'pw-outside':''}`,`data-date="${iso}" aria-label="${hesc(pwDate(iso,true))}" aria-pressed="${s.dates.includes(iso)}" ${iso<todayISO?'disabled':''}`);}).join('')}</div><p class="pw-small">Up to 7 days · ${s.dates.length} selected</p></div>`;
}
function pwRender(){
  const s=pw();
  if(['dates','focus','review'].includes(s.step)){s.datesOpen=s.step==='dates';s.setupOpen=s.step==='focus';s.step='edit';}
  if(!s.active&&s.dates.length)s.active=s.dates[0];
  const day=s.active?pwDay(s.active):null,entering=pwPaintedStep===null;pwPaintedStep=s.step;
  const panel=['paste','editrow','adjust','candidate','busy'].includes(s.step),hasRows=!!day?.rows.length;
  let html=`<section class="pw-workspace pw-step-edit pw-single ${entering?'pw-enter':''}" aria-label="Planning workspace"><div class="pw-editor-head"><button type="button" class="icobtn pw-back" data-pw="back" aria-label="Back">←</button><h1>${hasRows?'Edit your plan':'Build your plan'}</h1><span class="pw-small">Draft</span></div>`;
  if(s.error)html+=`<div class="pw-message" role="alert">${hesc(s.error)}</div>`;
  if(s.conflict){const d=s.conflict;html+=`<div class="card pw-card"><strong>Newer plan · ${hesc(pwDate(d))}</strong>${pwRowsHTML(pwRead(planText(pwSaved(d))))}<div class="pw-actions">${pwButton('load-newer','Use newer plan')}${pwButton('replace-newer','Keep my draft')}</div></div>`;}
  html+=`<fieldset class="pw-context" ${panel||s.conflict?'disabled':''}><div class="pw-datebar">${pwTabs()}${pwDatesButton('dates-toggle')}</div>`;
  if(s.datesOpen)html+=pwCalendarHTML();
  if(day&&!s.datesOpen){
    const open=!panel&&(s.setupOpen??!hasRows);
    html+=`<details class="pw-setup" data-pw-setup ${open?'open':''}><summary><span>${hesc((day.parts.length?day.parts:pwParts(day.rows)).join(' + ')||'Body parts & goal')}</span>${icon('chevron',ICON_SZ.sm)}</summary><div class="pw-setup-body"><h3>Select each day's body parts.</h3><p class="pw-small">Leave it and the app will auto-select for you.</p><div class="pw-parts">${Object.keys(SEED.catalog).filter(x=>x==='Run'||myPartsSet().has(x)).map(x=>pwButton('part',hesc(x),day.parts.includes(x)?'selected':'',`data-date="${s.active}" data-part="${hesc(x)}" aria-pressed="${day.parts.includes(x)}"`)).join('')}</div>${pwFields()}</div></details>`;
    if(hasRows&&day.parts.length&&day.parts.slice().sort().join()!==pwParts(day.rows).sort().join())html+='<p class="pw-small">Use Plan to rebuild for these body parts.</p>';
  }
  html+='</fieldset>';
  let footer='';
  if(s.datesOpen&&!panel){
    footer=pwButton('dates-done','Done','primary',s.dates.length?'':'disabled');
  }else if(s.step==='busy'){
    html+=writerWaitHTML().replace('data-writecancel','data-pw="cancel"').replace('data-what="the week"',`data-what="${s.task==='adjust'?'the set adjustment':'your plan'}"`);
  }else if(s.step==='paste'||s.step==='editrow'){
    const editing=s.step==='editrow';
    html+=`<div class="card pw-card pw-input-panel"><h3>${editing?(s.editIndex===day.rows.length?'Add exercise':'Edit exercise'):'Paste routine'}</h3><div class="pw-text-tools">${pwButton('text-select','Select All','pw-text')}${pwAction('text-copy','Copy','copy','pw-text')}${pwAction('text-paste','Paste','paste','pw-text')}</div>${editing?`<label class="pw-sr-only" for="pw-exercise">Exercise name</label><select id="pw-exercise" data-pw-field="exercise">${['<Keep typed name>',...Object.values(SEED.catalog).flat()].map(x=>`<option value="${hesc(x)}" ${s.exercise===x?'selected':''}>${hesc(x)}</option>`).join('')}</select>`:''}<label class="pw-sr-only" for="pw-routine">Routine text</label><textarea id="pw-routine" class="pw-routine" data-pw-field="pasteText" rows="7" spellcheck="false" placeholder="Squat&#10;135 lb × 8&#10;225 lb × 6 6 6">${hesc(s.pasteText||'')}</textarea></div>`;
    footer=pwButton('edit','Cancel')+pwButton('readpaste','Preview','primary');
  }else if(s.step==='adjust'){
    html+=`<div class="card pw-card pw-adjust"><label>Total sets<input type="number" min="1" max="100" step="1" data-pw-field="target" value="${day.target||pwCounts(day.rows).total}"></label><p class="pw-small">Warm-ups and fixed exercises stay.</p></div>`;
    footer=pwButton('edit','Cancel')+pwButton('adjustgo','Preview','primary');
  }else if(s.step==='candidate'&&s.candidate){
    const c=s.candidate;
    html+='<h2 class="pw-preview-label">Preview changes</h2>';
    for(const [d,b]of Object.entries(c.days))html+=`<div class="card pw-card"><div class="pw-card-heading"><strong>${hesc(pwDate(d))}</strong></div>${pwRowsHTML(b.rows)}${(b.notes||[]).map(n=>`<p class="pw-small">${hesc(n)}</p>`).join('')}</div>`;
    footer=pwButton(c.type==='paste'?'paste-back':'edit','Back')+(c.type==='paste'&&c.index===undefined?pwButton('apply-add','Add'):'')+pwButton('apply',c.type==='paste'?(c.index!==undefined?'Keep edit':'Replace'):'Use draft','primary');
  }else if(day){
    if(hasRows)html+=`<div class="pw-actions pw-edit-actions">${pwAction('rewrite','Plan','sparkle')}${pwAction('paste','Paste','paste')}${pwButton('adjust','Adjust sets')}${day.undo?pwButton('undo','Undo','pw-text'):''}</div>`;
    if(hasRows)html+=`<div class="card pw-card">${pwRowsHTML(day.rows,true)}</div>`;
    html+=`<div class="pw-actions">${pwButton('add','+ Exercise','pw-text')}${!hasRows&&day.undo?pwButton('undo','Undo','pw-text'):''}</div>`;
    if(day.notes?.length)html+=`<details class="pw-preferences"><summary>Checks · ${day.notes.length}</summary>${day.notes.map(n=>`<p class="pw-small">${hesc(n)}</p>`).join('')}</details>`;
    const empty=s.dates.filter(d=>!pwDay(d).rows.length).length;
    footer=hasRows?`<span class="pw-save-scope">${empty?`${empty} ${empty===1?'day needs':'days need'} a routine`:s.dates.map(d=>new Date(d+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})).join(' · ')}</span>`+pwButton('save',s.dates.length>1?`Save ${s.dates.length} days`:'Save plan','primary',empty||s.conflict?'disabled':''):pwAction('paste','Paste','paste')+pwAction('generate','Plan','sparkle','primary');
  }
  html+=`<span id="pw-reorder-help" class="pw-sr-only">Hold and drag to reorder. Or use the up and down arrow keys.</span><span id="pw-reorder-status" class="pw-sr-only" role="status"></span>${footer?`<div class="pw-save-dock">${footer}</div>`:''}</section>`;
  $('#view').innerHTML=html;if(entering)window.scrollTo(0,0);requestAnimationFrame(pwPositionDock);
}
function pwPositionDock(){const dock=document.querySelector('.pw-save-dock'),nav=document.getElementById('nav');if(dock&&nav)dock.style.bottom=Math.max(78,innerHeight-nav.getBoundingClientRect().top+8)+'px';}
window.addEventListener('resize',pwPositionDock,{passive:true});



/* Full history payload, plus explicit workspace intent. Fixed neighboring
   drafts are included alongside saved plans, on both sides of each date. */
function pwPayload(dates,action='generate'){
  const s=pw(),p=writerPayload({scope:'week',days:new Set(dates),rewrite:true,focus:[],objective:s.objective,note:s.note,part:'auto'});
  const context=new Map();
  for(const d of dates){for(const w of writerWeekContext([d],dates))context.set(w.date,w);
    for(let k=-WRITER_RECOVERY_DAYS;k<=WRITER_RECOVERY_DAYS;k++){const t=new Date(d+'T12:00');t.setDate(t.getDate()+k);const date=pwISO(t);if(!context.has(date))context.set(date,{date,requested:dates.includes(date),planned:dates.includes(date)?null:writerPlanSummary(date)});}}
  for(const w of context.values()){
    const b=s.book[w.date];if(!dates.includes(w.date)&&s.dates.includes(w.date)&&b?.rows.length)w.planned={text:pwText(b.rows),parts:pwParts(b.rows),exercises:pwExercises(b.rows).map(r=>r.ex)};
    w.parts=w.planned?.parts||[];
  }
  p.week_context=[...context.values()].sort((a,b)=>a.date.localeCompare(b.date));
  p.skeleton=dates.map(date=>({date,weekday:WEEKDAYS[new Date(date+'T12:00').getDay()],resting:writerPartsResting(date,p.recent_sessions,p.week_context),due:pwDay(date).parts.length?pwDay(date).parts:p.rotation.ranking.map(x=>x.part).slice(0,4)}));
  p.workspace={version:1,action,today:todayISO,schedule:s.dates.map(date=>({date,parts:pwDay(date).parts})),drafts:dates.map(date=>({date,text:pwText(pwDay(date).rows),target_total_sets:action==='adjust'?pwDay(date).target:null,locked_exercises:pwDay(date).locks.map(i=>pwText([pwDay(date).rows[i]]))}))};
  return p;
}
function pwUndoPoint(b){const {undo,...before}=b;b.undo=pwCopy(before);}
function pwApply(add=false){
  const s=pw(),c=s.candidate;if(!c)return;
  for(const [d,b] of Object.entries(c.days)){const dst=pwDay(d);pwUndoPoint(dst);
    if(c.index!==undefined){dst.rows.splice(c.index,1,...pwCopy(b.rows));dst.locks=dst.locks.filter(i=>i!==c.index).map(i=>i>c.index?i+b.rows.length-1:i);b.rows.forEach((r,i)=>{if(r.kind==='ex')dst.locks.push(c.index+i);});}
    else if(add)dst.rows.push(...pwCopy(b.rows));
    else{dst.rows=pwCopy(b.rows);dst.locks=c.type==='paste'?[]:dst.locks;}
    dst.parts=pwParts(dst.rows);dst.source=c.type==='paste'?'Your routine · not rewritten':c.type==='adjust'?'Writer-adjusted set count':'Written from your training';dst.notes=b.notes||[];
  }s.candidate=null;s.setupOpen=false;pwGo('edit');
}
function pwValidateAdjustment(rows,day){
  const before=day.rows;
  if(rows.length!==before.length)throw Error('The writer changed the exercise list. Your draft is unchanged.');
  for(let i=0;i<rows.length;i++){
    const a=before[i],b=rows[i];
    if(a.kind!=='ex'||day.locks.includes(i)){if(pwText([a])!==pwText([b]))throw Error('A fixed exercise or note changed. Your draft is unchanged.');continue;}
    if(a.ex!==b.ex||a.lines.length!==b.lines.length)throw Error('The writer changed an exercise or weight line. Your draft is unchanged.');
    for(let k=0;k<a.lines.length;k++){
      const x=a.lines[k],y=b.lines[k],warm=/warm/i.test((x.qual||'')+(x.tag||''));
      const kg=l=>l.unit==='lb'?l.w/LB:l.unit==='kg'?l.w:toKg(l.w);
      if(Math.abs(kg(x)-kg(y))>.01||!!x.bw!==!!y.bw||!!x.nw!==!!y.nw||x.su!==y.su||!y.reps.length||y.reps.length>12||y.reps.some((r,j)=>r!==x.reps[Math.min(j,x.reps.length-1)])||warm&&x.reps.length!==y.reps.length)throw Error('The writer changed a load, rep target or warm-up. Your draft is unchanged.');
      // Preserve exact input metadata and values; only the requested count changes.
      b.lines[k]={...pwCopy(x),reps:Array.from({length:y.reps.length},(_,j)=>x.reps[Math.min(j,x.reps.length-1)])};
    }
  }
  if(pwCounts(rows).total!==day.target)throw Error(`The writer did not reach ${day.target} total sets. Your draft is unchanged.`);
  return rows;
}
async function pwGenerate(adjust=false,rewrite=false){
  const s=pw();if(s.busy)return;
  const dates=adjust||rewrite?[s.active]:s.dates.filter(d=>!pwDay(d).rows.length);
  if(!dates.length)dates.push(s.active);
  if(dates.some(d=>d<todayISO)){s.error='Choose today or a future date before writing.';return pwRender();}
  const b=pwDay(s.active);if(adjust){b.target=Number(b.target||pwCounts(b.rows).total);if(!Number.isInteger(b.target)||b.target<1||b.target>100){s.error='Choose a whole number from 1 to 100.';return pwRender();}}
  const payload=pwPayload(dates,adjust?'adjust':'generate'),token=++pwRequest,owner=pwKey();
  s.task=adjust?'adjust':'generate';s.busy=true;s.step='busy';s.error='';pwPersist();pwRender();writerWaitStart();
  const cancelled=()=>token!==pwRequest||owner!==pwKey();
  try{
    let candidate;
    if(adjust){
      let rows,err;
      for(let attempt=0;attempt<2;attempt++){
        const resp=await writeSession({...payload,...(attempt?{note:`${payload.note}\nRepair the previous answer: ${err}. Return only the corrected full draft.`}:{})});if(cancelled())return;
        try{if(resp.days?.length!==1||resp.days[0].date!==s.active)throw Error('The adjustment returned the wrong date');rows=pwValidateAdjustment(pwRead(resp.days[0].text),b);break;}catch(e){err=e.message;}
      }
      if(!rows)throw Error(err);
      candidate={type:'adjust',days:{[s.active]:{rows,notes:[]}}};
    }else{
      const chk=await writerGenerateChecked(payload,cancelled);if(!chk||cancelled())return;
      const days={};let date=null;
      for(const r of chk.rows){if(r.kind==='day'){date=r.iso;days[date]={rows:[],notes:chk.notes};}else if(date)days[date].rows.push(r);}
      if(!Object.keys(days).length)throw Error('No readable days came back. Your draft is unchanged.');
      for(const [d,doc] of Object.entries(days))for(const i of pwDay(d).locks)if(pwText([pwDay(d).rows[i]])!==pwText([doc.rows[i]||{}]))throw Error('The writer changed an exercise you kept fixed. Your draft is unchanged.');
      candidate={type:'generate',days,reason:chk.reason};
    }
    if(cancelled())return;s.candidate=candidate;s.step='candidate';s.busy=false;pwPersist();if(view==='today'&&lift.plan==='workspace')pwRender();
  }catch(e){if(cancelled())return;s.busy=false;s.step=adjust?'adjust':'edit';s.error=e.refused?`Could not use that answer: ${e.refused}. Nothing saved.`:e.message||'Could not write. Your draft is unchanged.';pwPersist();if(view==='today'&&lift.plan==='workspace')pwRender();}
}
function pwSave(){
  const s=pw();
  for(const d of s.dates){if(d<todayISO)throw Error('A draft date has passed. Choose a current or future date.');const b=pwDay(d);if(!b.rows.length)throw Error(`${pwDate(d)} is still empty. Add a routine or remove that date.`);if(b.base!==pwFingerprint(d)){s.conflict=d;throw Error(`${pwDate(d)} changed since you opened it, possibly on another device. Compare the newer plan below before saving. Your draft is safe.`);}}
  // Merge ONLY reviewed dates; unlike weekSave, preserve all other blocks and
  // a separately saved today/tomorrow plan. Existing timestamps drive cloud sync.
  const days=pwCopy(DB.week?.days||{}),at=Date.now();
  for(const d of s.dates){const b=pwDay(d),doc={...planItemsFrom(b.rows),raw:pwText(b.rows),title:pwParts(b.rows).join(' + ')};days[d]=doc;if(DB.plan?.d===d){DB.plan={d,...doc};DB.planAt=at;}}
  const all=Object.keys(days).sort();DB.week={from:all[0],to:all[all.length-1],days,raw:'',at};DB.weekAt=at;planRailRefresh();save(true);
  for(const d of s.dates){const b=pwDay(d);b.base=pwFingerprint(d);b.source='Saved plan';delete b.undo;}
  s.step='edit';pwPersist();lift.plan=null;view='today';toast('Plan saved');render({soft:true});
}
function pwHandle(e){
  const el=e.target.closest('[data-pw]');if(!el)return false;
  const a=el.dataset.pw,s=pw(),d=el.dataset.date,i=Number(el.dataset.index),b=s.active?pwDay(s.active):null;
  try{
    if(a==='back'){if(s.step!=='edit'||s.datesOpen){pwRequest++;lift.writeAbort?.abort();writerWaitStop();s.busy=false;s.candidate=null;s.datesOpen=false;pwGo('edit');}else{pwPersist();lift.plan=null;view='today';render({soft:true});}return true;}
    if(a.startsWith('text-')){pwTextTool(a);return true;}
    if(a==='upcoming'){s.upcomingOpen=!s.upcomingOpen;const box=el.closest('.pw-coming');el.setAttribute('aria-expanded',String(s.upcomingOpen));box.classList.toggle('is-open',s.upcomingOpen);box.querySelector('.pw-fold').toggleAttribute('inert',!s.upcomingOpen);pwPersist();return true;}
    if(a==='mode'){pwRequest++;if(s.busy)lift.writeAbort?.abort();s.busy=false;localStorage.setItem(PW_MODE_KEY,el.dataset.mode);lift.plan=null;render({inplace:true});return true;}
    if(a==='open'||a==='resume'){pwOpen(null,a==='open'?'dates':undefined);return true;}
    if(a==='open-date'||a==='paste-open'){pwOpen(d);if(a==='paste-open'){s.pasteText='';s.editIndex=undefined;pwGo('paste');}return true;}
    if(a==='close'){pwRequest++;if(s.busy)lift.writeAbort?.abort();s.busy=false;if(s.step==='busy')s.step='edit';pwPersist();lift.plan=null;view='today';render({soft:true});return true;}
    if(a==='dates-toggle'){s.datesOpen=!s.datesOpen;s.step='edit';}
    else if(a==='dates-done'){s.datesOpen=false;s.step='edit';}
    else if(a==='goal'){s.objective=el.dataset.goal;}
    else if(a==='month'){const m=new Date((s.month||todayISO.slice(0,7)+'-01')+'T12:00');m.setMonth(m.getMonth()+Number(el.dataset.delta));s.month=pwISO(m);}
    else if(a==='date'){if(s.dates.includes(d))s.dates=s.dates.filter(x=>x!==d);else if(s.dates.length<7){s.dates.push(d);s.dates.sort();pwDay(d);}else throw Error('Choose up to seven days in one draft.');if(!s.dates.includes(s.active))s.active=s.dates[0]||null;}
    else if(a==='part'){const x=pwDay(d),p=el.dataset.part;x.parts=x.parts.includes(p)?x.parts.filter(v=>v!==p):[...x.parts,p];}
    else if(a==='day'){s.active=d;s.step='edit';}
    else if(a==='workspace')s.step='edit';
    else if(['dates','focus','edit','review','adjust'].includes(a)){s.step=a;s.error='';if(a==='adjust')b.target=pwCounts(b.rows).total;}
    else if(a==='paste'){s.pasteText='';s.editIndex=undefined;s.step='paste';}
    else if(a==='editrow'||a==='add'){s.editIndex=a==='add'?b.rows.length:i;s.pasteText=a==='add'?'':pwText([b.rows[i]]);s.exercise='<Keep typed name>';s.step='editrow';}
    else if(a==='readpaste'){
      const rows=pwRead(s.pasteText||'');if(!rows.length)throw Error('Paste a routine first.');if(s.step==='editrow'&&pwExercises(rows).length>1)throw Error('Edit one exercise here. Use Paste routine to add several.');
      s.candidate={type:'paste',index:s.step==='editrow'?s.editIndex:undefined,days:{[s.active]:{rows,notes:[]}}};s.step='candidate';
    }else if(a==='paste-back')s.step=s.candidate?.index!==undefined?'editrow':'paste';
    else if(a==='apply'||a==='apply-add'){pwApply(a==='apply-add');return true;}
    else if(a==='lock'){b.locks=b.locks.includes(i)?b.locks.filter(x=>x!==i):[...b.locks,i];}
    else if(a==='remove'){pwUndoPoint(b);b.rows.splice(i,1);b.locks=b.locks.filter(x=>x!==i).map(x=>x>i?x-1:x);b.source='Your draft';}
    else if(a==='up'||a==='down'){const j=i+(a==='up'?-1:1);if(j>=0&&j<b.rows.length){pwUndoPoint(b);[b.rows[i],b.rows[j]]=[b.rows[j],b.rows[i]];b.locks=b.locks.map(x=>x===i?j:x===j?i:x);}}
    else if(a==='undo'&&b.undo){s.book[s.active]=b.undo;}
    else if(a==='generate'||a==='adjustgo'||a==='rewrite'){pwGenerate(a==='adjustgo',a==='rewrite');return true;}
    else if(a==='cancel'){pwRequest++;lift.writeAbort?.abort();writerWaitStop();s.busy=false;s.step='edit';}
    else if(a==='load-newer'||a==='replace-newer'){const d=s.conflict;if(d){const x=pwDay(d);pwUndoPoint(x);if(a==='load-newer'){x.rows=pwRead(planText(pwSaved(d)));x.parts=pwParts(x.rows);x.locks=[];}x.base=pwFingerprint(d);s.conflict=null;s.error='';s.step='review';}}
    else if(a==='save'){pwSave();return true;}
    pwPersist();pwRender();
  }catch(err){s.error=err.message||String(err);pwRender();}
  return true;
}
document.addEventListener('input',e=>{
  const f=e.target.dataset.pwField;if(!f)return;const s=pw();
  if(f==='goal'){s.objective=['lose','strength','grow'][Number(e.target.value)]||'grow';e.target.setAttribute('aria-valuetext',['Lose weight','Strength','Grow'][Number(e.target.value)]);document.querySelectorAll('[data-pw="goal"]').forEach(b=>{const on=b.dataset.goal===s.objective;b.classList.toggle('pw-goal-on',on);b.classList.toggle('pw-text',!on);b.setAttribute('aria-pressed',String(on));});}
  else if(f==='target')pwDay(s.active).target=e.target.value;else s[f]=e.target.value;
  pwPersist();
});
document.addEventListener('toggle',e=>{if(e.target.isConnected&&e.target.matches?.('[data-pw-setup]')){pw().setupOpen=e.target.open;pwPersist();}},{capture:true});
async function pwTextTool(action){
  const ta=document.getElementById('pw-routine');if(!ta)return;
  if(action==='text-select'){ta.focus();ta.select();return;}
  if(action==='text-copy'){try{await navigator.clipboard.writeText(ta.value);toast('Copied');}catch(_){ta.focus();ta.select();toast('Select and copy the text');}return;}
  const owner=pwKey(),date=pw().active;
  try{const text=await navigator.clipboard.readText();if(!ta.isConnected||owner!==pwKey()||date!==pw().active)return;if(!text){toast('Clipboard is empty');return;}ta.value=text;pw().pasteText=text;pwPersist();ta.focus();ta.setSelectionRange(text.length,text.length);}
  catch(_){if(ta.isConnected){ta.focus();toast('Hold the box and tap Paste');}}
}
document.addEventListener('change',e=>{
  const f=e.target.dataset.pwField;if(!f)return;const s=pw();
  if(f==='exercise'&&e.target.value!=='<Keep typed name>'){
    const lines=(s.pasteText||'').split('\n');lines[0]=e.target.value;s.pasteText=lines.join('\n');const ta=document.querySelector('[data-pw-field="pasteText"]');if(ta)ta.value=s.pasteText;
  }else if(f==='objective')s.objective=e.target.value;
  pwPersist();
});

/* Reorder the local draft only. Indices identify duplicate exercises too;
   notes and fixed flags travel with their rows. One gesture = one undo point. */
function pwApplyOrder(order){
  const s=pw(),b=pwDay(s.active);
  if(order.length!==b.rows.length||new Set(order).size!==order.length||order.some(i=>!Number.isInteger(i)||i<0||i>=b.rows.length))return false;
  if(order.every((i,j)=>i===j))return false;
  pwUndoPoint(b);const rows=b.rows,locks=new Set(b.locks);
  b.rows=order.map(i=>rows[i]);b.locks=order.flatMap((i,j)=>locks.has(i)?[j]:[]);
  b.source='Your draft';pwPersist();return true;
}
function pwReorderFocus(index,message){
  pwRender();document.querySelector(`[data-pw-grip="${index}"]`)?.focus({preventScroll:true});
  const status=document.getElementById('pw-reorder-status');if(status)status.textContent=message;
}
(()=>{
  let drag=null;
  // Own touch gestures on the handle, not the prescription or the page.
  for(const type of ['touchstart','touchmove','touchend','touchcancel'])document.addEventListener(type,e=>{
    if(e.target.closest?.('[data-pw-grip]'))e.stopPropagation();
  },{capture:true,passive:true});
  function finish(cancel=false){
    if(!drag)return;const d=drag;drag=null;clearTimeout(d.hold);cancelAnimationFrame(d.frame);
    d.row.classList.remove('pw-lifting');try{d.list.releasePointerCapture(d.id);}catch(_){}
    if(!d.row.isConnected||pwKey()!==d.owner||pw().active!==d.date||pw().step!=='edit')return;
    const order=[...d.list.children].map(r=>Number(r.dataset.pwRow));
    if(!cancel&&pwApplyOrder(order))pwReorderFocus(order.indexOf(d.index),`${d.name} moved to position ${order.indexOf(d.index)+1}.`);
    else if(d.active)pwReorderFocus(d.index,cancel?'Reorder cancelled.':'Order unchanged.');
  }
  function frame(){
    const d=drag;if(!d?.active)return;
    if(!d.row.isConnected){finish(true);return;}
    const edge=80,delta=d.y<edge?-8:d.y>innerHeight-edge?8:0;
    if(delta)window.scrollBy(0,delta);
    const other=[...d.list.children].filter(r=>r!==d.row);
    // Layout coordinates ignore the FLIP animation, so neighbors cannot
    // oscillate back across the pointer while they ease into their new slot.
    const top=r=>d.list.getBoundingClientRect().top+r.offsetTop;
    const target=other.find(r=>d.y<top(r)+r.offsetHeight/2)||null;
    if(d.row.nextElementSibling!==target){
      const before=new Map(other.map(r=>[r,top(r)]));d.list.insertBefore(d.row,target);
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(const r of other){const dy=before.get(r)-top(r);if(dy){r.getAnimations?.().forEach(a=>a.cancel());r.animate?.([{transform:`translateY(${dy}px)`},{transform:'none'}],{duration:160,easing:'ease-out'});}}
    }
    d.frame=requestAnimationFrame(frame);
  }
  document.addEventListener('pointerdown',e=>{
    const grip=e.target.closest?.('[data-pw-grip]');if(!grip||e.button!==0||drag)return;
    const row=grip.closest('[data-pw-row]'),index=Number(grip.dataset.pwGrip);
    drag={grip,row,list:row.parentNode,index,name:pwDay(pw().active).rows[index].ex,id:e.pointerId,y:e.clientY,date:pw().active,owner:pwKey(),active:false};
    // Capture on the stable list: moving the grip's row can release capture.
    try{drag.list.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();
    const d=drag;d.hold=setTimeout(()=>{if(drag!==d)return;d.active=true;d.row.classList.add('pw-lifting');d.frame=requestAnimationFrame(frame);},e.pointerType==='touch'?180:0);
  });
  document.addEventListener('pointermove',e=>{if(drag&&e.pointerId===drag.id){drag.y=e.clientY;e.preventDefault();}});
  document.addEventListener('pointerup',e=>{if(drag&&e.pointerId===drag.id)finish();});
  document.addEventListener('pointercancel',e=>{if(drag&&e.pointerId===drag.id)finish(true);});
  document.addEventListener('lostpointercapture',e=>{if(drag&&e.pointerId===drag.id)finish(true);});
  window.addEventListener('blur',()=>finish(true));
  document.addEventListener('keydown',e=>{
    if(drag&&e.key==='Escape'){e.preventDefault();finish(true);return;}
    const grip=e.target.closest?.('[data-pw-grip]'),dir=e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0;if(!grip||!dir||drag)return;
    e.preventDefault();const i=Number(grip.dataset.pwGrip),b=pwDay(pw().active),j=i+dir;if(j<0||j>=b.rows.length)return;
    const name=b.rows[i].ex,order=b.rows.map((_,k)=>k);[order[i],order[j]]=[order[j],order[i]];
    if(pwApplyOrder(order))pwReorderFocus(j,`${name} moved to position ${j+1}.`);
  });
})();
