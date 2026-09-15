/* Approved planner journey. Reuses planner.js parsing, checked generation,
   local owner-scoped drafts and saved plan schema. No mock routines or dates. */
const pfLegacy={open:pwOpen,render:pwRender,handle:pwHandle,apply:pwApply,payload:pwPayload,save:pwSave};
function pfOn(){return (pwState?.journey?.prefOrigin==='settings'||planningWorkspace())&&localStorage.getItem('showup:planner-flow')!=='legacy';}
function pfState(){const s=pw();s.journey=s.journey||{page:'dates',furthest:1,anchor:[],removed:[],saved:[]};return s.journey;}
function pfDates(){return [...pw().dates].sort();}
function pfSavedSelection(){const dates=pfDates();return dates.length>0&&dates.every(d=>d>=todayISO&&!!pwSaved(d)?.items?.length);}
function pfTrackScreen(){
 const s=pw(),j=pfState(),screen={page:j.page,step:s.step,active:s.active,dates:j.page==='dates'?[...s.dates]:undefined,clear:!!j.clear,emptyConfirm:!!j.emptyConfirm,group:j.group?pwCopy(j.group):null};
 const key=x=>JSON.stringify([x.page,x.step,x.active,x.clear,x.emptyConfirm,!!x.group]);
 j.history=j.history||[];
 if(!j.returning&&j.lastScreen&&key(screen)!==key(j.lastScreen))j.history.push({...j.lastScreen,scroll:window.scrollY});
 j.returning=false;j.lastScreen=screen;
}
function pfBack(){
 const s=pw(),j=pfState();pwRequest++;lift.writeAbort?.abort();writerWaitStop();s.busy=false;
 let previous;
 while(j.history?.length){
  const candidate=j.history.pop();
  if(['busy','candidate'].includes(candidate.step))continue;
  if(['days','edit','done'].includes(candidate.page)&&!pfMatch())continue;
  if(candidate.page==='edit'&&!s.dates.includes(candidate.active))continue;
  previous=candidate;break;
 }
 if(!previous){const destination=j.prefOrigin==='settings'?'sync':j.returnView||'today';j.prefOrigin=null;j.lastScreen=null;s.step='edit';s.candidate=null;pwPersist();lift.plan=null;view=destination;render({soft:true});return;}
 Object.assign(j,{page:previous.page,clear:previous.clear,emptyConfirm:previous.emptyConfirm,group:previous.group,returning:true});
 if(previous.dates)s.dates=[...previous.dates];s.step=previous.step;s.active=previous.active;s.error='';s.candidate=null;pwPersist();pwRender();window.scrollTo(0,previous.scroll||0);
}
function pfMatch(){return JSON.stringify(pfDates())===JSON.stringify([...pfState().anchor].sort());}
function pfPrefs(){return pwCopy(DB.settings.plannerPreferences||{frequency:5,mode:'time',minutes:45,minSets:20,maxSets:25,emphasis:{},avoid:[],split:'auto'});}
function pfSummary(p=pfPrefs()){const more=Object.keys(p.emphasis).filter(k=>p.emphasis[k]>0);return `${p.frequency==='varies'?'Flexible':p.frequency+' days'} · ${p.mode==='time'?p.minutes+' min':p.minSets+'–'+p.maxSets+' sets'}${more.length?' · More '+more.join(', '):''} · ${p.avoid.length} exercises avoided`;}
function pfShort(d){return new Date(d+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'numeric',day:'numeric'});}
function pfCompactPrefs(){const p=pfPrefs(),more=Object.keys(p.emphasis).filter(k=>p.emphasis[k]>0);return `<div class="pf-compact-prefs"><div><strong>${hesc(p.frequency==='varies'?'Flexible':p.frequency+' days')} · ${hesc(p.mode==='time'?p.minutes+' min':p.minSets+'–'+p.maxSets+' sets')}</strong>${pwAction('pf-prefs','Edit','edit','pf-pref-edit')}</div><p>${more.length?'More '+hesc(more.join(' + '))+' · ':''}${p.avoid.length} exercises avoided</p></div>`;}
function pfDateRange(){const ds=pfDates(),short=d=>new Date(d+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});return ds.length?hesc(short(ds[0])+(ds.length>1?' – '+short(ds.at(-1)):'')):'';}
function pfDateKinds(){const dates=pfDates(),saved=dates.filter(d=>d>=todayISO&&!!pwSaved(d)?.items?.length);return {dates,saved,fresh:dates.filter(d=>!saved.includes(d))};}
function pfSelectSubset(dates){if(!dates.length)return false;pw().dates=[...dates];if(!dates.includes(pw().active))pw().active=dates[0];dates.forEach(d=>pwDay(d));return true;}
function pfDateFooter(){
 const s=pw(),{dates,saved,fresh}=pfDateKinds(),n=dates.length;
 const action=(a,label,glyph,primary=false,extra='')=>pwAction(a,label,glyph,(primary?'primary':'')+(s.busy&&a==='pf-generate'?' pf-generating':''),s.busy?'disabled':extra);
 let main='',secondary='';
 if(s.busy)main=action('pf-generate','Creating your draft','sparkle',true);
 else if(!n)main=action('pf-generate','Plan dates','sparkle',true,'disabled')+action('pf-edit-selected','Edit plans','edit',false,'disabled');
 else if(saved.length&&fresh.length)main=action('pf-generate','Plan '+fresh.length+' '+(fresh.length===1?'day':'days'),'sparkle',true,'data-subset="fresh"')+action('pf-edit-selected','Edit '+saved.length+' '+(saved.length===1?'plan':'plans'),'edit');
 else if(saved.length)main=action('pf-edit-selected','Edit '+saved.length+' '+(saved.length===1?'plan':'plans'),'edit',true);
 else main=action('pf-generate','Plan '+n+' '+(n===1?'day':'days'),'sparkle',true)+action('pf-paste-dates','Paste','paste');
 if(saved.length&&!s.busy)secondary='<div class="pf-date-secondary">'+action('pf-generate','Generate instead','sparkle')+action('pf-paste-dates','Paste','paste')+'</div>';
 return '<div class="pf-selection" aria-live="polite"><strong>'+(n?'<span class="pf-count">'+n+'</span> '+(n===1?'day':'days')+' selected':'Choose dates above')+'</strong><span>'+pfDateRange()+'</span></div><div class="pf-date-actions">'+main+'</div>'+secondary+'<p class="pf-date-help">Logged workouts stay untouched.</p>'+(s.busy?pwButton('pf-back','Cancel','pw-text'):'');
}
let pfMotion=null;
function pfPlayMotion(){const m=pfMotion;pfMotion=null;if(!m)return;const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const animate=(el,frames,duration=260)=>{if(el?.animate)el.animate(reduced?[{opacity:.6},{opacity:1}]:frames,{duration:reduced?100:duration,easing:'cubic-bezier(.22,.7,.25,1)'});};
 if(m.kind==='date'){const button=document.querySelector(`.pf-calendar [data-date="${m.date}"]`);animate(button,[{transform:'scale(.92)'},{transform:'scale(1.035)',offset:.6},{transform:'scale(1)'}]);if(button?.classList.contains('selected'))animate(button,[{backgroundColor:'var(--surface)'},{backgroundColor:'var(--accent)'}],180);if(m.before!==pw().dates.length)animate(document.querySelector('.pf-count'),[{transform:`translateY(${pw().dates.length>m.before?'-100%':'100%'})`,opacity:0},{transform:'translateY(0)',opacity:1}]);}
 if(m.kind==='date'){animate(document.querySelector('.pf-selection>span'),[{opacity:.35},{opacity:1}],180);const dot=document.querySelector(`.pf-calendar .selected[data-date="${m.date}"] .pf-plan-dot`);animate(dot,[{color:'var(--accent)'},{color:'#fff'}],180);}
 if(m.kind==='month')for(const el of document.querySelectorAll('.pf-calendar,.pf-date-sheet .pw-month'))animate(el,[{transform:`translateX(${m.dir*16}px)`,opacity:0},{transform:'translateX(0)',opacity:1}]);
 if(m.kind==='arrive')animate(document.querySelector('.pf-workspace'),[{transform:'translateY(12px)',opacity:0},{transform:'translateY(0)',opacity:1}],360);
}
function pfAnchor(){const j=pfState();if(!pfMatch()){j.furthest=2;j.saved=[];}j.anchor=pfDates();j.furthest=Math.max(j.furthest,2);}
function pfNavigate(page){const s=pw(),j=pfState();if(['days','edit','done'].includes(page)&&!pfMatch())page='dates';j.page=page;s.step='edit';s.datesOpen=false;s.error='';j.clear=false;j.emptyConfirm=false;j.group=null;pwPersist();pwRender();window.scrollTo(0,0);}
function pfStepbar(){const j=pfState(),current={prefs:0,dates:1,days:2,edit:2,done:3}[j.page]??2;return `<div role="navigation" class="pf-steps" aria-label="Planning steps">${['Preferences','Dates','Edit','Done'].map((label,i)=>{const allowed=(i===2&&pfSavedSelection())||(i<=j.furthest&&(i<2||pfMatch()));return pwButton('pf-stage',`<b>${i}</b><span>${label}</span>`,`${i===current?'pf-current':''} ${i<current?'pf-passed':''}`,`data-stage="${i}" ${allowed?'':'disabled'} ${i===current?'aria-current="step"':''}`);}).join('')}</div>`;}
function pfPrefHTML(){const j=pfState(),p=j.prefs||(j.prefs=pfPrefs()),parts=Object.keys(SEED.catalog).filter(x=>x!=='Run');return `<div class="card"><h3>How many days a week?</h3><div class="pf-options">${[1,2,3,4,5,6,7,'varies'].map(n=>pwButton('pf-frequency',n==='varies'?'Varies':n,p.frequency===n?'selected':'',`data-value="${n}" aria-pressed="${p.frequency===n}"`)).join('')}</div><h3>How much per workout?</h3><div class="pw-actions">${['time','sets'].map(m=>pwButton('pf-size',m==='time'?'Time':'Total sets',p.mode===m?'selected':'',`data-value="${m}"`)).join('')}</div><div class="pf-fields">${(p.mode==='time'?[['minutes','Minutes',10,180]]:[['minSets','Minimum sets',1,100],['maxSets','Maximum sets',1,100]]).map(([key,label,min,max])=>`<label>${label}<input type="number" min="${min}" max="${max}" data-pf-pref="${key}" value="${p[key]}"></label>`).join('')}</div></div><div class="card"><h3>Where should we focus?</h3>${parts.map(part=>`<label class="pf-slider"><strong>${hesc(part)}</strong><input type="range" min="-1" max="1" step="1" data-pf-emphasis="${hesc(part)}" value="${p.emphasis[part]||0}" aria-label="${hesc(part)} emphasis" aria-valuetext="${['Less','Balanced','More'][(p.emphasis[part]||0)+1]}"><span><span>Less</span><span>Balanced</span><span>More</span></span></label>`).join('')}<label class="pf-select">Your split<select data-pf-pref="split">${[['auto','Let ShowUp decide'],['full','Full body'],['upper-lower','Upper / Lower · 2-way'],['ppl','Push / Pull / Legs · 3-way'],['body','Body-part split']].map(([v,t])=>`<option value="${v}" ${p.split===v?'selected':''}>${t}</option>`).join('')}</select></label></div><div class="card"><h3>Anything to avoid?</h3><p class="pw-small">Exercises you dislike</p><div class="pw-actions">${p.avoid.map((ex,i)=>pwButton('pf-unavoid',hesc(ex)+' '+icon('clear',ICON_SZ.sm),'',`data-index="${i}" aria-label="Stop avoiding ${hesc(ex)}"`)).join('')}</div><label class="pf-select">Add an exercise<select data-pf-avoid><option value="">Choose exercise</option>${Object.values(SEED.catalog).flat().filter(ex=>!p.avoid.includes(ex)).map(ex=>`<option>${hesc(ex)}</option>`).join('')}</select></label></div>`;}
function pfCalendar(){const s=pw(),j=pfState(),base=new Date((s.month||todayISO.slice(0,7)+'-01')+'T12:00'),first=weekStartDow(),offset=(base.getDay()-first+7)%7,n=new Date(base.getFullYear(),base.getMonth()+1,0).getDate();return `<div class="card pf-date-sheet">${pfCompactPrefs()}<div class="pf-date-prompt">Select dates to plan or edit</div><div class="pw-month">${pwButton('month',icon('chevron',ICON_SZ.sm,180),'pw-icon','data-delta="-1" aria-label="Previous month"')}<strong>${base.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong>${pwButton('month',icon('chevron',ICON_SZ.sm),'pw-icon','data-delta="1" aria-label="Next month"')}</div><div class="pw-calendar pf-calendar">${Array.from({length:7},(_,i)=>`<span>${['S','M','T','W','T','F','S'][(first+i)%7]}</span>`).join('')}${'<span></span>'.repeat(offset)}${Array.from({length:n},(_,i)=>{const date=new Date(base);date.setDate(i+1);const d=pwISO(date),selected=s.dates.includes(d),editing=j.anchor.includes(d),saved=d>=todayISO&&!!pwSaved(d)?.items?.length;return pwButton('date',`<span>${i+1}</span><small class="${saved?'pf-plan-dot':''}" aria-hidden="true">${d<todayISO?'':saved?'●':''}</small>`,`${selected?'selected':''} ${editing?'pf-editing':''}`,`data-date="${d}" aria-pressed="${selected}" aria-label="${hesc(pwDate(d,true))}, ${d<todayISO?'past date':saved?'plan saved':'no plan'}${editing?', editing draft':''}" ${d<todayISO?'disabled':''}`);}).join('')}</div><div class="pf-calendar-key"><span><i class="pf-plan-dot">●</i> Saved plan</span><span>Up to 7 days</span></div></div>`;}
function pfRoutine(rows){return pwRowsHTML(rows).replace(/<pre class="pw-prescription">([\s\S]*?)<\/pre>/g,(_,text)=>`<pre class="pw-prescription">${text.split('\n').map(x=>x.trim()).join('\n')}</pre>`);}
function pfDaysHTML(){const s=pw(),j=pfState(),days=pfDates(),all=days.length&&days.every(d=>j.open?.[d]);return `<div class="pf-right">${pwButton('pf-expand',icon(all?'collapse':'expand',ICON_SZ.sm)+(all?' Collapse All':' Expand All'),'pw-text')}</div>${days.map(d=>{const b=pwDay(d);return `<section class="pf-day" data-pf-day="${d}"><div class="pf-day-date">${hesc(pfShort(d))}</div><div class="card"><button class="pw-btn pf-day-grip" data-pf-day-grip="${d}" aria-label="Reorder workout for ${hesc(pfShort(d))}; drag or use arrow keys">${icon('grip',ICON_SZ.sm)}</button><details data-pf-fold="${d}" ${j.open?.[d]?'open':''}><summary><strong>${hesc((b.parts.length?b.parts:pwParts(b.rows)).join(' + ')||'Choose body parts')}</strong></summary>${pfRoutine(b.rows)}</details><div class="pw-card-heading"><span class="pw-small">${pwSetCount(b.rows)} sets · ${pwExercises(b.rows).length} exercises</span>${pwAction('pf-edit-day','Edit','edit','pw-text',`data-date="${d}"`)}</div></div></section>`;}).join('')}`;}
function pfGroups(r){const groups=[];for(const [index,line]of(r.lines||[]).entries()){const key=JSON.stringify({...line,reps:undefined,raw:undefined});const g=groups.at(-1);if(g?.key===key){g.indices.push(index);g.line.reps.push(...line.reps);}else groups.push({key,indices:[index],line:{...pwCopy(line)}});}return groups;}
function pfHistoryLines(rows){
 const groups=[];
 for(const r of rows){
  const key=JSON.stringify([r.ex,r.w,r.su||'',r.qual||'',r.bw||false,r.tag||'']);
  const last=groups.at(-1);
  if(r.ex!=='Run'&&last?.key===key)last.reps.push(...(r.reps||[]));
  else groups.push({key,row:r,reps:[...(r.reps||[])]});
 }
 return groups.map(({row:r,reps})=>hesc(r.ex==='Run'?dDisp(r.w)+' '+DU():Math.round(toU(r.w))+' '+U()+' × '+reps.join(' ')+(isHold(r.su)?' sec':'')+(r.qual?' ('+r.qual+')':''))).join('<br>');
}
function pfLineText(ex,line){return pwText([{kind:'ex',ex,lines:[line]}]).split('\n').slice(1).map(x=>x.trim()).join('\n');}
function pfEditRows(){const b=pwDay(pw().active);return `<div class="pw-exercises">${b.rows.map((r,i)=>r.kind!=='ex'||!r.ex?`<div data-pw-row="${i}" class="pw-unread"><pre>${hesc(r.raw||'')}</pre>${pwButton('editrow','Edit text','',`data-index="${i}"`)}</div>`:`<article class="pw-exercise pw-editable" data-pw-row="${i}"><button class="pw-btn pw-grip" data-pw-grip="${i}" aria-label="Reorder ${hesc(r.ex)}; drag or use arrow keys">${icon('grip',ICON_SZ.sm)}</button><div class="pw-ex-title"><strong>${hesc(r.ex)}</strong>${pwButton('pf-add-line',icon('clear',12,45)+' Add set','pf-row-button',`data-index="${i}"`)}</div>${pfGroups(r).map((g,k)=>`<div class="pf-set-row"><span class="mono">${hesc(pfLineText(r.ex,g.line))}</span><div>${pwAction('pf-edit-line','Edit','edit','pf-row-button',`data-index="${i}" data-line="${k}"`)}${pwAction('pf-remove-line','Remove','clear','pf-row-button',`data-index="${i}" data-line="${k}"`)}</div></div>`).join('')}</article>`).join('')}</div>`;}
function pfHistoryHTML(compact=false){const s=pw(),parts=s.active?(pwDay(s.active).parts.length?pwDay(s.active).parts:pwParts(pwDay(s.active).rows)):[],date=Object.keys(DB.days).filter(d=>d<(s.active||todayISO)&&(DB.days[d].w||[]).length&&(!parts.length||(DB.days[d].w||[]).some(r=>r.part===parts[0]))).sort().at(-1);if(!date)return '';const rows=DB.days[date].w,exercises=[...new Set(rows.map(r=>r.ex))],sets=rows.reduce((n,r)=>n+(r.ex==='Run'?1:(r.reps||[]).length),0);return `<details class="card pf-history" ${compact?'':'open'}><summary><strong>Last workout day</strong><span>${hesc(pfShort(date))}</span></summary><p class="pw-small">${sets} sets · ${exercises.length} exercises · Entire day</p>${exercises.map(ex=>`<div class="pf-history-row"><strong>${hesc(ex)}</strong><p class="mono">${pfHistoryLines(rows.filter(r=>r.ex===ex))}</p></div>`).join('')}</details>`;}
function pfDayHTML(){const s=pw(),b=pwDay(s.active),j=pfState(),total=pwSetCount(b.rows),changed=b.target!=null&&b.target!==total;return `<div class="pw-datebar">${pwTabs()}</div><div class="pf-routine-heading"><div class="h-date pf-routine-date" role="heading" aria-level="2">${hesc(pfShort(s.active))}</div><span>${total} sets · ${pwExercises(b.rows).length} exercises</span></div><div class="pw-actions">${pwAction('pf-regenerate','Regenerate','sparkle',changed?'primary pf-beam':'')}${pwAction('paste','Paste','paste')}${pwAction('pf-clear','Clear','clear')}</div><div class="pf-total"><span>Total sets</span><div class="pw-stepper">${pwButton('pf-minus','−','','aria-label="Decrease total sets"'+(!b.rows.length?' disabled':''))}<output class="${changed?'pf-changed':''}">${b.target??total}</output>${pwButton('pf-plus','+','','aria-label="Increase total sets"'+(!b.rows.length?' disabled':''))}</div></div>${changed?'<p class="pf-balloon" role="status">Hit Regenerate to factor in the changed Total sets amount</p>':''}${j.group?pfGroupForm():''}<div class="card">${b.rows.length?pfEditRows():'<p>No exercises yet.</p>'}</div><div class="pf-add-summary">${pwButton('add',icon('clear',14,45)+' Add exercise','pf-add-button')}</div>${b.undo?pwButton('undo','Undo','pw-text'):''}${pfHistoryHTML()}`;}
function pfGroupForm(){const g=pfState().group;return `<div class="card pf-group-form"><h3>${g.add?'Add set':'Edit sets'}</h3><div class="pf-fields"><label>Weight (${hesc(g.line.unit||U())})<input id="pf-weight" type="number" min="0" step="any" value="${g.line.w||0}"></label><label>${isHold(g.line.su)?'Seconds per set':'Reps per set'}<input id="pf-reps" value="${g.line.reps.join(' ')}" aria-describedby="pf-reps-help"></label></div><p id="pf-reps-help" class="pw-small">Separate each set with a space.</p><div class="pw-actions">${pwButton('pf-group-save','Keep changes','primary')}${pwButton('pf-group-cancel','Cancel')}</div></div>`;}
function pfPending(){return pw().dates.some(d=>{const b=pwDay(d);return b.target!=null&&b.target!==pwSetCount(b.rows);});}
function pfValidateCandidate(candidate,dates){
 const p=pfPrefs(),expected=[...dates].sort(),received=Object.keys(candidate.days).sort();
 if(JSON.stringify(expected)!==JSON.stringify(received))throw Error('The writer returned different dates. Your draft is unchanged.');
 for(const [date,day] of Object.entries(candidate.days)){
  const avoided=day.rows.filter(r=>p.avoid.some(ex=>ex.trim().toLowerCase()===String(r.ex||'').trim().toLowerCase()));
  if(avoided.length)throw Error('The writer included an avoided exercise: '+avoided.map(r=>r.ex).join(', ')+'. Your draft is unchanged.');
  const total=pwSetCount(day.rows);
  if(!total)throw Error(pfShort(date)+' has no planned sets. Your draft is unchanged.');
  if(candidate.type!=='adjust'&&p.mode==='sets'&&(total<p.minSets||total>p.maxSets))throw Error(pfShort(date)+' is outside your '+p.minSets+'–'+p.maxSets+' set range. Your draft is unchanged.');
 }
}
function pfSaveButton(){return pwButton('pf-save',pw().dates.length?`Save ${pw().dates.length} ${pw().dates.length===1?'day':'days'}`:'Save changes','primary',(!pw().dates.length&&!pfState().removed.length)||pfPending()?'disabled':'');}
function pfDoneHTML(){
 const j=pfState(),saved=j.saved||[],planned=saved.filter(x=>x.sets),all=planned.length&&planned.every(x=>j.doneOpen?.[x.date]);
 return `<div class="pf-done"><div class="pf-done-tools"><span>${planned.length} ${planned.length===1?'day':'days'} saved</span>${planned.length?pwButton('pf-done-expand',icon(all?'collapse':'expand',ICON_SZ.sm)+(all?' Collapse All':' Expand All'),'pw-text'):''}</div>${saved.map(x=>{
  const rows=x.rows||pwRead(planText(pwSaved(x.date))),count=pwExercises(rows).length;
  return `<section class="pf-day pf-done-day"><div class="pf-day-date">${hesc(pfShort(x.date))}</div><div class="card">${x.sets?`<details data-pf-saved-fold="${x.date}" ${j.doneOpen?.[x.date]?'open':''}><summary><span class="pf-done-label"><strong>${hesc(x.parts.join(' + ')||'Workout')}</strong><span>${x.sets} sets · ${count} exercises</span></span></summary>${pfRoutine(rows)}</details>`:'<div class="pf-no-plan">No plan</div>'}</div></section>`;
 }).join('')}</div>`;
}
function pfRender(){pfTrackScreen();renderHeader();const s=pw(),j=pfState(),panel=['paste','editrow','adjust','candidate','busy'].includes(s.step)&&!(s.step==='busy'&&j.page==='dates');if(panel){pfLegacy.render();const box=document.querySelector('.pw-workspace');if(box){box.classList.add('pf-workspace');box.querySelector('.pw-editor-head')?.remove();box.insertAdjacentHTML('afterbegin',pfStepbar());if(s.step==='paste'&&!s.editAll)box.querySelector('.pw-input-panel')?.insertAdjacentHTML('beforeend',`<label class="pw-small"><input type="checkbox" data-pf-paste-all ${j.pasteAll?'checked':''}> Use this routine for all selected days</label>`);}return;}let body='',footer='',heading={dates:'Choose your dates',prefs:'Your preferences',days:'Edit your plan',edit:'Edit your routine',done:'Your dates are updated'}[j.page];
 if(j.page==='prefs'){body=pfPrefHTML();footer=pwButton('pf-prefs-save','Save preferences','primary');}
 else if(j.page==='dates'){body=pfCalendar();footer=pfDateFooter();}
 else if(j.page==='days'){body=pfDaysHTML();footer='<div class="pf-primary-row">'+pwButton('pf-edit-first','Edit first day →','primary',s.dates.length?'':'disabled')+pfSaveButton()+'</div><p class="pw-small">Saves every routine above to its date.</p>';}
 else if(j.page==='edit'&&s.active){body=pfDayHTML();const ds=pfDates(),i=ds.indexOf(s.active),prev=ds[i-1],next=ds[i+1],short=d=>new Date(d+'T12:00').toLocaleDateString('en-US',{month:'numeric',day:'numeric'});footer=`<div class="pf-neighbors">${pwButton('pf-edit-day',prev?'← Edit '+short(prev):'Previous day','',prev?`data-date="${prev}"`:'disabled')}${pwButton('pf-edit-day',next?'Edit '+short(next)+' →':'Next day','',next?`data-date="${next}"`:'disabled')}</div>`+pfSaveButton();}
 else if(j.page==='done'){body=pfDoneHTML();footer=pwButton('close','Plans saved · Done','primary');}
 if(j.clear){body=`<div class="card" role="alert"><h3>Clear ${hesc(pfShort(s.active))}?</h3>${pwButton('pf-remove-day','Remove this day')}<p class="pw-small">Remove its plan when you save.</p>${pwButton('pf-empty-day','Keep day, empty routine')}<p class="pw-small">Add exercises manually. No logged workouts change.</p>${pwButton('pf-clear-cancel','Cancel')}</div>`;footer='';}
 if(j.emptyConfirm){const empty=pfDates().filter(d=>!pwSetCount(pwDay(d).rows)),valid=s.dates.length-empty.length;body=`<div class="card" role="alert"><h3>Empty days won’t be saved</h3>${empty.map(d=>`<p><strong>${hesc(pwDate(d))}</strong><br>0 planned sets · No plan</p>`).join('')}<p class="pw-small">These dates will become No plan. Any existing saved plan on these dates will be removed. Logged workouts stay untouched.</p>${pwButton('pf-confirm-save',valid?'Save '+valid+' days & clear empty days':'Set dates to No plan','primary')}${pwButton('pf-clear-cancel','Back to editing')}</div>`;footer='';}
 if(s.conflict){body=`<div class="card" role="alert"><h3>Newer plan · ${hesc(pwDate(s.conflict))}</h3>${pfRoutine(pwRead(planText(pwSaved(s.conflict))))}${pwButton('load-newer','Use newer plan')}${pwButton('replace-newer','Keep my draft')}</div>`;footer='';}
 $('#view').innerHTML=pwFoldMarkup(`<section class="pw-workspace pf-workspace${j.page==='dates'?' pf-dates-page':''}" aria-label="Planning workspace">${j.prefOrigin==='settings'&&j.page==='prefs'?'':pfStepbar()}${s.error?`<p class="pw-message" role="alert">${hesc(s.error)}</p>`:''}${body}<span id="pw-reorder-help" class="pw-sr-only">Drag or use arrow keys to reorder.</span><span id="pw-reorder-status" role="status" class="pw-sr-only"></span>${footer?`<div class="pw-save-dock pf-dock">${footer}</div>`:''}</section>`);if(s.busy)document.querySelectorAll('.pf-date-sheet button,.pf-steps button').forEach(b=>b.disabled=true);pfPlayMotion();requestAnimationFrame(pwPositionDock);
}
pwRender=function(){return pfOn()?pfRender():pfLegacy.render();};
pwOpen=function(d,step){if(!pfOn())return pfLegacy.open(d,step);const s=pw(),j=pfState();j.history=[];j.lastScreen=null;j.returnView=view==='sync'?'sync':'today';if(s.busy){pwRequest++;lift.writeAbort?.abort();s.busy=false;}if(d){s.dates=[d];s.active=d;s.month=d.slice(0,7)+'-01';pwDay(d);}else if(!s.dates.length){s.active=dayClosed()?tomorrowISO():writeDateISO();s.dates=[s.active];pwDay(s.active);}j.page=step==='dates'?'dates':d&&pwSaved(d)?'edit':d?'dates':j.page;j.prefOrigin=null;if(d&&pwSaved(d))pfAnchor();lift.plan='workspace';view='today';s.step='edit';pwPersist();render({soft:true});};
pwApply=function(add=false){if(!pfOn())return pfLegacy.apply(add);const c=pw().candidate;if(!c)return;const generated=c.type==='generate',adjust=c.type==='adjust';if(c.type==='paste'&&c.index===undefined&&pfState().pasteAll){const one=Object.values(c.days)[0];c.days=Object.fromEntries(pfDates().map(d=>[d,pwCopy(one)]));}pfLegacy.apply(add);for(const d of Object.keys(c.days)){pwDay(d).target=null;}pfAnchor();pfMotion={kind:'arrive'};pfNavigate(generated?'days':'edit');};
pwPayload=function(dates,action){const p=pfLegacy.payload(dates,action);if(!pfOn())return p;const prefs=pfPrefs();p.workspace.preferences=prefs;p.note=[p.note,'Confirmed planning preferences: '+JSON.stringify(prefs),"Respect avoided exercises. Frequency describes the usual week; only generate the explicitly selected dates. Time is an approximate budget, not a promise."].filter(Boolean).join('\n');return p;};
function pfMoveDay(from,to){const ds=pfDates(),a=ds.indexOf(from),b=ds.indexOf(to);if(a<0||b<0||a===b)return;const bundles=ds.map(d=>pwCopy(pwDay(d))),[moved]=bundles.splice(a,1);bundles.splice(b,0,moved);ds.forEach((d,i)=>{const old=pwDay(d);pw().book[d]={...bundles[i],base:old.base,source:'Your draft'};});pwPersist();pwRender();}
function pfSave(confirm=false){const s=pw(),j=pfState();if(!pfMatch())throw Error('Restore the editing dates, or generate a new draft first.');if(pfPending())throw Error('Regenerate the changed total sets before saving.');const empty=s.dates.filter(d=>!pwSetCount(pwDay(d).rows));if(empty.length&&!confirm){j.emptyConfirm=true;pwRender();return;}
 const dates=[...new Set([...s.dates,...j.removed.map(x=>x.date)])];if(!dates.length)throw Error('Choose at least one date.');
 for(const d of dates){if(d<todayISO)throw Error('A draft date has passed. Choose today or a future date.');const base=j.removed.find(x=>x.date===d)?.base??pwDay(d).base;if(base!==pwFingerprint(d)){s.conflict=d;throw Error(`${pwDate(d)} changed on another device. Review it before saving.`);}}
 const days=pwCopy(DB.week?.days||{}),at=Date.now();j.saved=dates.map(d=>({date:d,sets:j.removed.some(x=>x.date===d)?0:pwSetCount(pwDay(d).rows),parts:pwParts(pwDay(d).rows),rows:pwCopy(pwDay(d).rows)}));
 for(const d of dates){const remove=empty.includes(d)||j.removed.some(x=>x.date===d);if(remove){delete days[d];if(DB.plan?.d===d){DB.plan=null;DB.planAt=at;}}else{const b=pwDay(d),doc={...planItemsFrom(b.rows),raw:pwText(b.rows),title:pwParts(b.rows).join(' + ')};days[d]=doc;if(DB.plan?.d===d){DB.plan={d,...doc};DB.planAt=at;}}}
 const all=Object.keys(days).sort();DB.week=all.length?{from:all[0],to:all.at(-1),days,raw:'',at}:null;DB.weekAt=at;planRailRefresh();save(true);for(const d of s.dates){const b=pwDay(d);b.base=pwFingerprint(d);b.source='Saved plan';delete b.undo;}j.removed=[];j.furthest=3;j.emptyConfirm=false;pfNavigate('done');
}
pwSave=function(){return pfOn()?pfSave():pfLegacy.save();};
function pfHandle(a,el){const s=pw(),j=pfState(),d=el.dataset.date,i=+el.dataset.index,b=s.active?pwDay(s.active):null;
 if(a==='pf-settings'){j.history=[];j.lastScreen=null;j.returnView='sync';j.prefOrigin='settings';j.prefs=pfPrefs();lift.plan='workspace';view='today';pfNavigate('prefs');return;}
 if(a==='pf-prefs'){j.prefOrigin=j.page;j.prefs=pfPrefs();pfNavigate('prefs');return;}
 if(a==='pf-back'){pfBack();return;}
 if(a==='pf-stage'){j.prefOrigin=null;const n=+el.dataset.stage;if(n===2&&pfSavedSelection()){s.dates.forEach(d=>pwDay(d));if(!s.dates.includes(s.active))s.active=pfDates()[0];pfAnchor();}else if(n>j.furthest||n>=2&&!pfMatch())return;pfNavigate(['prefs','dates','days','done'][n]);return;}
 if(a==='pf-frequency'){j.prefs.frequency=el.dataset.value==='varies'?'varies':+el.dataset.value;}
 else if(a==='pf-size')j.prefs.mode=el.dataset.value;
 else if(a==='pf-unavoid')j.prefs.avoid.splice(i,1);
 else if(a==='pf-prefs-save'){const p=j.prefs;if(!p||!Number.isInteger(p.minutes)||p.minutes<10||p.minutes>180||!Number.isInteger(p.minSets)||!Number.isInteger(p.maxSets)||p.minSets<1||p.maxSets>100||p.minSets>p.maxSets)throw Error('Use valid whole numbers. Minimum sets cannot exceed maximum.');DB.settings.plannerPreferences=pwCopy(p);DB.settingsAt=Date.now();save(true);if(j.prefOrigin==='settings'){j.prefOrigin=null;lift.plan=null;view='sync';render();return;}pfNavigate(j.prefOrigin||'dates');return;}
 else if(a==='pf-dates'){pfNavigate('dates');return;}
 else if(a==='pf-edit-selected'){if(!pfSelectSubset(pfDateKinds().saved))return;pfAnchor();pfMotion={kind:'arrive'};pfNavigate('days');return;}
 else if(a==='pf-generate'){if(!s.dates.length)return;if(el.dataset.subset==='fresh'&&!pfSelectSubset(pfDateKinds().fresh))return;j.anchorBefore=pwCopy(j.anchor);pwGenerate();return;}
 else if(a==='pf-paste-dates'){if(!s.dates.length)return;s.active=s.dates[0];s.editIndex=undefined;s.pasteText='';s.step='paste';}
 else if(a==='pf-expand'){j.open=j.open||{};const open=!s.dates.every(x=>j.open[x]);s.dates.forEach(x=>j.open[x]=open);}
 else if(a==='pf-done-expand'){j.doneOpen=j.doneOpen||{};const dates=(j.saved||[]).filter(x=>x.sets).map(x=>x.date),open=!dates.every(d=>j.doneOpen[d]);dates.forEach(d=>j.doneOpen[d]=open);}
 else if(a==='pf-edit-day'||a==='pf-edit-first'){s.active=d||pfDates()[0];pfNavigate('edit');return;}
 else if(a==='pf-clear'){j.clear=true;}
 else if(a==='pf-clear-cancel'){j.clear=false;j.emptyConfirm=false;}
 else if(a==='pf-empty-day'){pwUndoPoint(b);b.rows=[];b.parts=[];b.locks=[];b.target=null;b.cleared=true;b.source='Your draft';j.clear=false;}
 else if(a==='pf-remove-day'){j.removed.push({date:s.active,base:b.base});s.dates=s.dates.filter(x=>x!==s.active);j.anchor=j.anchor.filter(x=>x!==s.active);s.active=s.dates[0]||null;pfNavigate('days');return;}
 else if(a==='pf-plus'||a==='pf-minus'){const total=pwSetCount(b.rows),limit=pwSetLimits(b);b.target=Math.max(limit.min,Math.min(limit.max,(b.target??total)+(a==='pf-plus'?1:-1)));if(b.target===total)b.target=null;}
 else if(a==='pf-regenerate'){pwGenerate(b.target!=null&&b.target!==pwSetCount(b.rows),true);return;}
 else if(a==='pf-edit-line'||a==='pf-add-line'){const r=b.rows[i],g=a==='pf-add-line'?null:pfGroups(r)[+el.dataset.line];j.group={index:i,indices:g?.indices||[],line:pwCopy(g?.line||r.lines.at(-1)||{w:0,unit:U(),reps:[8]}),add:!g};if(!g){j.group.line.reps=[j.group.line.reps.at(-1)||8];delete j.group.line.qual;delete j.group.line.tag;}}
 else if(a==='pf-remove-line'){const g=pfGroups(b.rows[i])[+el.dataset.line];pwUndoPoint(b);b.rows[i].lines=b.rows[i].lines.filter((_,k)=>!g.indices.includes(k));b.source='Your draft';b.target=null;}
 else if(a==='pf-group-cancel')j.group=null;
 else if(a==='pf-group-save'){const g=j.group,w=Number(document.getElementById('pf-weight').value),text=document.getElementById('pf-reps').value.trim(),reps=text.split(/\s+/).map(Number);if(!Number.isFinite(w)||w<0||w>10000||!text||reps.length>100||reps.some(n=>!Number.isInteger(n)||n<1||n>10000))throw Error('Enter a valid weight and positive whole-number reps separated by spaces.');pwUndoPoint(b);const line={...g.line,w,reps};delete line.raw;const lines=Array.from({length:Math.ceil(reps.length/12)},(_,k)=>({...line,reps:reps.slice(k*12,k*12+12)}));if(g.add)b.rows[g.index].lines.push(...lines);else b.rows[g.index].lines.splice(g.indices[0],g.indices.length,...lines);b.source='Your draft';b.target=null;if(!b.locks.includes(g.index))b.locks.push(g.index);j.group=null;}
 else if(a==='pf-save'||a==='pf-confirm-save'){pfSave(a==='pf-confirm-save');return;}
 pwPersist();pwRender();
}
pwHandle=function(e){if(e.target.closest('[data-pw="pf-settings"]')){pfHandle('pf-settings',e.target.closest('[data-pw]'));return true;}if(!pfOn())return pfLegacy.handle(e);const el=e.target.closest('[data-pw]');if(!el)return false;const a=el.dataset.pw,s=pw(),j=pfState();try{if(s.busy&&a!=='pf-back')return true;if(a==='date'||a==='month')pfMotion={kind:a,date:el.dataset.date,dir:+el.dataset.delta||1,before:s.dates.length};if(a.startsWith('pf-')){pfHandle(a,el);return true;}if(a==='date'){const result=pfLegacy.handle(e);j.removed=j.removed.filter(x=>!s.dates.includes(x.date));pwPersist();return result;}if(a==='load-newer'||a==='replace-newer'){const d=s.conflict,result=pfLegacy.handle(e);if(d){if(a==='load-newer')j.removed=j.removed.filter(x=>x.date!==d);else j.removed.forEach(x=>{if(x.date===d)x.base=pwFingerprint(d);});s.step='edit';pwPersist();pwRender();}return result;}if(a==='save'){pfSave();return true;}if(a==='dates-toggle'){pfNavigate('dates');return true;}if(a==='day'){s.active=el.dataset.date;pfNavigate('edit');return true;}if(a==='back'&&['paste','editrow','candidate'].includes(s.step)){s.candidate=null;pfNavigate(pfMatch()?'edit':'dates');return true;}if(a==='edit'){s.candidate=null;pfNavigate(pfMatch()?'edit':'dates');return true;}return pfLegacy.handle(e);}catch(err){s.error=err.message;pwRender();return true;}};
document.addEventListener('input',e=>{if(!pfOn())return;const key=e.target.dataset.pfPref,part=e.target.dataset.pfEmphasis;if(!key&&!part)return;const p=pfState().prefs;if(!p)return;if(part){p.emphasis[part]=+e.target.value;e.target.setAttribute('aria-valuetext',['Less','Balanced','More'][+e.target.value+1]);}else p[key]=key==='split'?e.target.value:+e.target.value;pwPersist();});
document.addEventListener('change',e=>{if(!pfOn())return;if(e.target.matches('[data-pf-paste-all]')){pfState().pasteAll=e.target.checked;pwPersist();return;}if(!e.target.matches('[data-pf-avoid]'))return;const p=pfState().prefs,ex=e.target.value;if(ex&&!p.avoid.includes(ex)){p.avoid.push(ex);pwPersist();pwRender();}});
document.addEventListener('toggle',e=>{if(!pfOn()||!e.target.isConnected)return;const j=pfState();if(e.target.matches?.('[data-pf-saved-fold]')){j.doneOpen=j.doneOpen||{};j.doneOpen[e.target.dataset.pfSavedFold]=e.target.open;pwPersist();return;}if(!e.target.matches?.('[data-pf-fold]'))return;j.open=j.open||{};j.open[e.target.dataset.pfFold]=e.target.open;pwPersist();},true);
(()=>{
 let drag=null;
 function target(e){
  document.querySelectorAll('.pf-drop-target').forEach(el=>el.classList.remove('pf-drop-target'));
  const row=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-pf-day]');
  if(row&&row!==drag?.row)row.classList.add('pf-drop-target');
  return row?.dataset.pfDay;
 }
 function finish(e,cancel=false){
  if(!drag||(e?.pointerId!=null&&e.pointerId!==drag.id))return;
  const from=drag,to=!cancel&&e?target(e):null;drag=null;
  from.row.classList.remove('pf-dragging');
  document.querySelectorAll('.pf-drop-target').forEach(el=>el.classList.remove('pf-drop-target'));
  try{from.grip.releasePointerCapture(from.id);}catch(_){}
  if(to&&from.row.isConnected&&from.owner===pwKey())pfMoveDay(from.date,to);
 }
 document.addEventListener('pointerdown',e=>{
  const g=e.target.closest('[data-pf-day-grip]');if(!g||e.button!==0||drag)return;
  drag={date:g.dataset.pfDayGrip,owner:pwKey(),id:e.pointerId,grip:g,row:g.closest('[data-pf-day]')};
  drag.row.classList.add('pf-dragging');try{g.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();
 });
 document.addEventListener('pointermove',e=>{if(drag&&e.pointerId===drag.id){target(e);e.preventDefault();}});
 document.addEventListener('pointerup',e=>finish(e));
 document.addEventListener('pointercancel',e=>finish(e,true));
 document.addEventListener('lostpointercapture',e=>finish(e,true));
 window.addEventListener('blur',()=>finish(null,true));
 document.addEventListener('keydown',e=>{
  if(drag&&e.key==='Escape'){e.preventDefault();finish(null,true);return;}
  const g=e.target.closest('[data-pf-day-grip]');if(!g||drag||!['ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();const ds=pfDates(),i=ds.indexOf(g.dataset.pfDayGrip),d=ds[i+(e.key==='ArrowUp'?-1:1)];
  if(d){pfMoveDay(g.dataset.pfDayGrip,d);document.querySelector(`[data-pf-day-grip="${d}"]`)?.focus();}
 });
})();
