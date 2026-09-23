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
/* v4.6.72: THE ARROW IS NAVIGATION, NOT UNDO. The header arrow ran pfBack(),
   which pops the flow's own step history first -- Dates back to Preferences --
   and only leaves the workspace once that is empty. The maker's rule: the
   arrow goes to the PREVIOUS NAVIGATION POINT, the screen you entered from,
   whatever step you are on. j.returnView has always recorded that point
   (today, lift through the Edit Plan door, sync from Settings); pfLeave goes
   there directly. pfBack keeps the step-popping for the one control that
   means "undo": Cancel while a write is running. `to` lets the Today tab send
   the same leave home rather than to where you came from. */
function pfLeave(to){
 const s=pw(),j=pfState();pwRequest++;lift.writeAbort?.abort();writerWaitStop();s.busy=false;
 const destination=to||(j.prefOrigin==='settings'?'sync':j.returnView||'today');
 j.prefOrigin=null;j.lastScreen=null;j.history=[];s.step='edit';s.candidate=null;pwPersist();lift.plan=null;view=destination;render({soft:true});
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
 if(!previous){pfLeave();return;}
 Object.assign(j,{page:previous.page,clear:previous.clear,emptyConfirm:previous.emptyConfirm,group:previous.group,returning:true});
 if(previous.dates)s.dates=[...previous.dates];s.step=previous.step;s.active=previous.active;s.error='';s.candidate=null;pwPersist();pwRender();window.scrollTo(0,previous.scroll||0);
}
function pfMatch(){return JSON.stringify(pfDates())===JSON.stringify([...pfState().anchor].sort());}
function pfPrefs(){return pwCopy(DB.settings.plannerPreferences||{frequency:5,mode:'time',minutes:45,minSets:20,maxSets:25,emphasis:{},avoid:[],split:'auto'});}
function pfSummary(p=pfPrefs()){const more=Object.keys(p.emphasis).filter(k=>p.emphasis[k]>0);return `${p.frequency==='varies'?'Flexible':p.frequency+' days'} · ${p.mode==='time'?p.minutes+' min':p.minSets+'–'+p.maxSets+' sets'}${more.length?' · More '+more.join(', '):''} · ${p.avoid.length} exercises avoided`;}
function pfShort(d){return new Date(d+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'numeric',day:'numeric'});}
/* v4.6.81: pfCompactPrefs() DELETED. The dates card opened with a summary of
   the planning preferences and an Edit button, two rows above the calendar --
   and that button read as "edit these dates", which is the one thing it did
   not do: it left for Preferences, a tab already sitting at the top of this
   very screen. Two doors to the same room, one of them mislabelled. The tab
   is the door. */function pfDateRange(){const ds=pfDates(),short=d=>new Date(d+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});return ds.length?hesc(short(ds[0])+(ds.length>1?' – '+short(ds.at(-1)):'')):'';}
function pfCalendarDraft(d){
 const b=pw().book?.[d];
 return d>=todayISO&&!!b&&((b.source!=='Saved plan'&&!!(b.rows?.length||b.parts?.length||b.cleared))||b.target!=null);
}
function pfStatusIcon(kind){
 if(kind==='lands')return '<svg class="pf-status-icon" width="'+ICON_SZ.sm+'" height="'+ICON_SZ.sm+'" viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2.6 2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg>';
 const path=kind==='draft'?'<path d="m3 16 12-12 5 5-12 12-6 1 1-6Zm13-13 1-1a2 2 0 0 1 3 0l2 2a2 2 0 0 1 0 3l-1 1-5-5Z"/>':'<path fill-rule="evenodd" d="M6 2h2v3h8V2h2v3h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2V2ZM4 9v2h16V9H4Zm2 5v3h3v-3H6Zm5 0v3h3v-3h-3Z"/>';
 return '<svg class="pf-status-icon" width="'+ICON_SZ.sm+'" height="'+ICON_SZ.sm+'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'+path+'</svg>';
}
function pfDateKinds(){const dates=pfDates(),drafts=dates.filter(pfCalendarDraft),saved=dates.filter(d=>!drafts.includes(d)&&d>=todayISO&&!!pwSaved(d)?.items?.length);return {dates,drafts,saved,fresh:dates.filter(d=>!saved.includes(d)&&!drafts.includes(d))};}
function pfSelectSubset(dates){if(!dates.length)return false;pw().dates=[...dates];if(!dates.includes(pw().active))pw().active=dates[0];dates.forEach(d=>pwDay(d));return true;}
function pfDateFooter(){
 const s=pw(),{dates,saved,fresh,drafts}=pfDateKinds(),n=dates.length;
 const plural=(n,one)=>n+' '+one+(n===1?'':'s');
 const action=(a,label,glyph,primary=false,extra='')=>pwAction(a,label,glyph,(primary?'primary':'')+(s.busy&&a==='pf-generate'?' pf-generating':''),s.busy?'disabled':extra);
 /* v4.6.101: when every selected day already has a plan there is nothing to
    plan, and "Plan new days" was sitting there disabled as the primary. The
    two things you can do with saved plans take the row instead: Edit, Move. */
 const allSaved=!s.busy&&saved.length&&!fresh.length&&!drafts.length;
 let main=s.busy?action('pf-generate','Creating your draft','sparkle',true):allSaved?action('pf-edit-selected','Edit '+plural(saved.length,'plan'),'edit',true)+action('pf-move','Move '+plural(saved.length,'plan'),'move'):action('pf-generate',fresh.length?'Plan '+plural(fresh.length,'new day'):'Plan new days','sparkle',true,fresh.length?'data-subset="fresh"':'disabled')+action('pf-edit-selected',saved.length?'Edit '+plural(saved.length,'plan'):'Edit saved plans','edit',false,saved.length?'':'disabled');
 /* v4.6.101: MOVE. Saved plans among the selected days can be shifted by N
    days; the calendar shows where they land while you step. It sits with
    Generate and Paste, and takes the footer over while it is open so the
    one question on screen is "where to". */
 const j=pfState(),mv=j.move;
 if(mv&&!s.busy){
  const plan=planShiftable(saved,mv.delta),n=plan.moves.length,abs=Math.abs(mv.delta);
  const words=mv.delta===0?'No change':abs+(abs===1?' day ':' days ')+(mv.delta>0?'later':'earlier');
  const first=plan.moves[0]?.to,last=plan.moves.at(-1)?.to;
  const problem=!plan.ok&&plan.reason==='past'?'Nothing can land before today.':!plan.ok&&plan.reason==='landsOnLogged'?hesc(pwDate(plan.date))+' has a logged workout; nothing can land on it.':!plan.ok&&plan.reason==='logged'?hesc(pwDate(plan.date))+' has a logged workout and can\u2019t move.':'';
  const replaces=plan.ok&&plan.replaces.length?plan.replaces.map(d=>hesc(pwDate(d))).join(', ')+' already '+(plan.replaces.length===1?'has a plan; it will be replaced.':'have plans; they will be replaced.'):'';
  return '<div class="pf-selection" aria-live="polite"><strong>Move <span class="pf-count">'+n+'</span> '+(n===1?'plan':'plans')+'</strong><span>'+(plan.ok&&first?hesc(pwDate(first))+(n>1?' \u2013 '+hesc(pwDate(last)):''):'')+'</span></div>'
   +'<div class="pf-move" role="group" aria-label="Move by"><span class="pf-move-label">Move by<b>'+words+'</b></span><span class="pf-move-ctl">'+pwButton('pf-move-step','\u2212','pw-icon','data-delta="-1" aria-label="One day earlier"')+'<output aria-live="polite">'+(mv.delta>0?'+':'')+mv.delta+'</output>'+pwButton('pf-move-step','+','pw-icon','data-delta="1" aria-label="One day later"')+'</span></div>'
   +(problem?'<p class="pf-move-note pf-move-problem">'+problem+'</p>':replaces?'<p class="pf-move-note">'+replaces+'</p>':'<p class="pf-move-note">Logged workouts stay untouched. Drafts move with their days.</p>')
   +'<div class="pf-date-actions">'+pwButton('pf-move-cancel','Cancel')+pwButton('pf-move-go',plan.ok?'Move '+plural(n,'plan'):'Move','primary',plan.ok?'':'disabled')+'</div>';
 }
 const summary=[fresh.length?plural(fresh.length,'new day'):'',saved.length?plural(saved.length,'saved plan'):'',drafts.length?plural(drafts.length,'draft'):''].filter(Boolean).join(' · ');
 const changes=drafts.filter(d=>pwSaved(d)?.items?.length);
 const resume=drafts.length&&!s.busy?'<div class="pf-draft-resume">'+action('pf-resume-drafts','Resume '+plural(drafts.length,'draft'),'edit')+'</div>':'';
 const secondary=!s.busy?'<div class="pf-date-secondary">'+action('pf-generate','Generate instead','sparkle',false,n?'':'disabled')+action('pf-paste-dates','Paste','paste',false,n?'':'disabled')+'</div>':'';
 return '<div class="pf-selection" aria-live="polite"><strong>'+(n?'<span class="pf-count">'+n+'</span> '+(n===1?'day':'days')+' selected':'Choose dates above')+'</strong><span>'+pfDateRange()+'</span></div><p class="pf-date-breakdown">'+(summary||'Select dates to create, edit or resume.')+'</p>'+(changes.length?'<p class="pf-draft-detail">'+changes.map(d=>hesc(pwDate(d))).join(' · ')+': unsaved changes to saved '+(changes.length===1?'plan':'plans')+'</p>':'')+resume+'<div class="pf-date-actions">'+main+'</div>'+secondary+'<p class="pf-date-help">Logged workouts stay untouched.</p>'+(s.busy?pwButton('pf-back','Cancel','pw-text'):'');
}
let pfMotion=null;
function pfPlayMotion(){const m=pfMotion;pfMotion=null;if(!m)return;const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const animate=(el,frames,duration=260)=>{if(el?.animate)el.animate(reduced?[{opacity:.6},{opacity:1}]:frames,{duration:reduced?100:duration,easing:'cubic-bezier(.22,.7,.25,1)'});};
 /* v4.6.80: PICKING A DAY IS AN INK FLOOD, AND THE CELL NEVER PAINTS.
    This animated the BUTTON's background from white to accent over 180ms, from
    the days when a selected day was a filled rounded cell. Since v4.6.78 the
    fill lives on the day's ::before and the button's own corners went square to
    make room for it -- so the leftover was painting a hard-cornered square
    behind the rounded one on every tap. That is the flash the maker saw.
    What replaces it: colour floods out from the centre of the square and is
    clipped by its corner, the number turning white once the ink has passed
    under it. Nothing moves -- no scale on the cell, so forty numbers in a grid
    stay still while one of them fills. The scale went with the background. */
 if(m.kind==='date'){
  const button=document.querySelector(`.pf-calendar [data-date="${m.date}"]`);
  if(button&&!reduced){
   const cls=button.classList.contains('selected')?'pf-ink':'pf-ink-out';
   button.classList.add(cls);
   button.addEventListener('animationend',()=>button.classList.remove(cls),{once:true});
  }
  if(m.before!==pw().dates.length)animate(document.querySelector('.pf-count'),[{transform:`translateY(${pw().dates.length>m.before?'-100%':'100%'})`,opacity:0},{transform:'translateY(0)',opacity:1}]);
  animate(document.querySelector('.pf-selection>span'),[{opacity:.35},{opacity:1}],180);
 }
 if(m.kind==='month')for(const el of document.querySelectorAll('.pf-calendar,.pf-date-sheet .pw-month'))animate(el,[{transform:`translateX(${m.dir*16}px)`,opacity:0},{transform:'translateX(0)',opacity:1}]);
 if(m.kind==='arrive')animate(document.querySelector('.pf-workspace'),[{transform:'translateY(12px)',opacity:0},{transform:'translateY(0)',opacity:1}],360);
}
function pfAnchor(){const j=pfState();if(!pfMatch()){j.furthest=2;j.saved=[];}j.anchor=pfDates();j.furthest=Math.max(j.furthest,2);}
/* v4.6.75: THE WEEK IS A STRIP ON THE ROUTINE PAGE. The overview listed one
   card per day and a day was 127px of nothing; the maker chose a strip of day
   chips above the routine instead, so 'days' lands on the first day's routine.
   pfDaysHTML stays for the saved review; nothing routes to it as a page. */
function pfNavigate(page){const s=pw(),j=pfState();if(page==='days'){page=s.dates.length?'edit':'dates';if(!s.dates.includes(s.active))s.active=pfDates()[0]||null;}if(['days','edit','done'].includes(page)&&!pfMatch())page='dates';j.page=page;s.step='edit';s.datesOpen=false;s.error='';j.clear=false;j.emptyConfirm=false;j.group=null;pwPersist();pwRender();window.scrollTo(0,0);}
function pfStepbar(){const j=pfState(),current={prefs:0,dates:1,days:2,edit:2,done:3}[j.page]??2;return `<div role="navigation" class="pf-steps" aria-label="Planning steps">${['Preferences','Dates','Edit','Done'].map((label,i)=>{const allowed=(i===2&&pfSavedSelection())||(i<=j.furthest&&(i<2||pfMatch()));return pwButton('pf-stage',`<b>${i}</b><span>${label}</span>`,`${i===current?'pf-current':''} ${i<current?'pf-passed':''}`,`data-stage="${i}" ${allowed?'':'disabled'} ${i===current?'aria-current="step"':''}`);}).join('')}</div>`;}
function pfPrefHTML(){const j=pfState(),p=j.prefs||(j.prefs=pfPrefs()),parts=Object.keys(SEED.catalog).filter(x=>x!=='Run');return `<div class="card"><h3>How many days a week?</h3><div class="pf-options">${[1,2,3,4,5,6,7,'varies'].map(n=>pwButton('pf-frequency',n==='varies'?'Varies':n,p.frequency===n?'selected':'',`data-value="${n}" aria-pressed="${p.frequency===n}"`)).join('')}</div><h3>How much per workout?</h3><div class="pw-actions">${['time','sets'].map(m=>pwButton('pf-size',m==='time'?'Time':'Total sets',p.mode===m?'selected':'',`data-value="${m}"`)).join('')}</div><div class="pf-fields">${(p.mode==='time'?[['minutes','Minutes',10,180]]:[['minSets','Minimum sets',1,100],['maxSets','Maximum sets',1,100]]).map(([key,label,min,max])=>`<label>${label}<input type="number" min="${min}" max="${max}" data-pf-pref="${key}" value="${p[key]}"></label>`).join('')}</div></div><div class="card"><h3>Where should we focus?</h3>${parts.map(part=>`<label class="pf-slider"><strong>${hesc(part)}</strong><input type="range" min="-1" max="1" step="1" data-pf-emphasis="${hesc(part)}" value="${p.emphasis[part]||0}" aria-label="${hesc(part)} emphasis" aria-valuetext="${['Less','Balanced','More'][(p.emphasis[part]||0)+1]}"><span><span>Less</span><span>Balanced</span><span>More</span></span></label>`).join('')}<label class="pf-select">Your split<select data-pf-pref="split">${[['auto','Let ShowUp decide'],['full','Full body'],['upper-lower','Upper / Lower · 2-way'],['ppl','Push / Pull / Legs · 3-way'],['body','Body-part split']].map(([v,t])=>`<option value="${v}" ${p.split===v?'selected':''}>${t}</option>`).join('')}</select></label></div><div class="card"><h3>Anything to avoid?</h3><p class="pw-small">Exercises you dislike</p><div class="pw-actions">${p.avoid.map((ex,i)=>pwButton('pf-unavoid',hesc(ex)+' '+icon('clear',ICON_SZ.sm),'',`data-index="${i}" aria-label="Stop avoiding ${hesc(ex)}"`)).join('')}</div><label class="pf-select">Add an exercise<select data-pf-avoid><option value="">Choose exercise</option>${Object.values(SEED.catalog).flat().filter(ex=>!p.avoid.includes(ex)).map(ex=>`<option>${hesc(ex)}</option>`).join('')}</select></label></div>`;}
function pfCalendar(){const s=pw(),j=pfState(),landing=new Set(j.move?planShiftable(pfDateKinds().saved,j.move.delta).moves.map(m=>m.to):[]),base=new Date((s.month||todayISO.slice(0,7)+'-01')+'T12:00'),first=weekStartDow(),offset=(base.getDay()-first+7)%7,n=new Date(base.getFullYear(),base.getMonth()+1,0).getDate();return `<div class="card pf-date-sheet"><div class="pw-month">${pwButton('month',icon('chevron',ICON_SZ.sm,180),'pw-icon','data-delta="-1" aria-label="Previous month"')}<strong>${base.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong>${pwButton('month',icon('chevron',ICON_SZ.sm),'pw-icon','data-delta="1" aria-label="Next month"')}</div><div class="pw-calendar pf-calendar">${Array.from({length:7},(_,i)=>`<span>${['S','M','T','W','T','F','S'][(first+i)%7]}</span>`).join('')}${'<span></span>'.repeat(offset)}${Array.from({length:n},(_,i)=>{const date=new Date(base);date.setDate(i+1);const d=pwISO(date),selected=s.dates.includes(d),draft=pfCalendarDraft(d),saved=d>=todayISO&&!!pwSaved(d)?.items?.length;const lands=landing.has(d);return pwButton('date',`<span>${i+1}</span><small class="pf-day-status" aria-hidden="true">${d<todayISO?'':draft?pfStatusIcon('draft'):saved?pfStatusIcon('saved'):lands?pfStatusIcon('lands'):''}</small>`,`${selected?'selected':''} ${draft?'pf-has-draft':''} ${lands&&!selected?'pf-lands':''}`,`data-date="${d}" aria-pressed="${selected}" aria-label="${hesc(pwDate(d,true))}, ${d<todayISO?'past date':draft?(saved?'draft, unsaved changes to saved plan':'new unsaved draft'):saved?'plan saved':'no plan'}" ${d<todayISO?'disabled':''}`);}).join('')}</div><div class="pf-calendar-key"><span class="pf-keys"><span><i class="pf-key-selected" aria-hidden="true"></i> Selected</span><span>${pfStatusIcon('saved')} Saved plan</span>${j.move&&!pfDateKinds().drafts.length?'':`<span>${pfStatusIcon('draft')} Draft</span>`}${j.move?`<span>${pfStatusIcon('lands')} Lands here</span>`:''}</span><span>Up to 7 days</span></div></div>`;}
function pfRoutine(rows){return pwRowsHTML(rows).replace(/<pre class="pw-prescription">([\s\S]*?)<\/pre>/g,(_,text)=>`<pre class="pw-prescription">${text.split('\n').map(x=>x.trim()).join('\n')}</pre>`);}
function pfDaysHTML(){const s=pw(),j=pfState(),days=pfDates(),all=days.length&&days.every(d=>j.open?.[d]);return `<div class="pf-right">${pwButton('pf-expand',icon(all?'collapse':'expand',ICON_SZ.sm)+(all?' Collapse All':' Expand All'),'pw-text')}</div>${days.map(d=>{const b=pwDay(d);return `<section class="pf-day" data-pf-day="${d}"><div class="pf-day-date">${hesc(pfShort(d))}</div><div class="card"><button class="pw-btn pf-day-grip" data-pf-day-grip="${d}" aria-label="Reorder workout for ${hesc(pfShort(d))}; drag or use arrow keys">${icon('grip',ICON_SZ.sm)}</button><details data-pf-fold="${d}" ${j.open?.[d]?'open':''}><summary><strong>${hesc((b.parts.length?b.parts:pwParts(b.rows)).join(' + ')||'Choose body parts')}</strong></summary>${pfRoutine(b.rows)}</details><div class="pw-card-heading"><span class="pw-small">${pwSetCount(b.rows)} sets · ${pwExercises(b.rows).length} exercises</span>${pwAction('pf-edit-day','Edit','edit','pw-text',`data-date="${d}"`)}</div></div></section>`;}).join('')}`;}
function pfGroups(r){const groups=[];for(const [index,line]of(r.lines||[]).entries()){const key=JSON.stringify({...line,reps:undefined,raw:undefined});const g=groups.at(-1);if(g?.key===key){g.indices.push(index);g.line.reps.push(...line.reps);}else groups.push({key,indices:[index],line:{...pwCopy(line)}});}return groups;}
function pfHistoryLines(rows){
 const groups=[];
 for(const r of rows){
  const key=JSON.stringify([r.ex,r.w,r.su||'',r.qual||'',r.bw||false,r.tag||'']);
  const last=groups.at(-1);
  if(!isCardio(r)&&last?.key===key)last.reps.push(...(r.reps||[]));
  else groups.push({key,row:r,reps:[...(r.reps||[])]});
 }
 return groups.map(({row:r,reps})=>hesc(isCardio(r)?cardioLine(r):Math.round(toU(r.w))+' '+U()+' × '+reps.join(' ')+(isHold(r.su)?' sec':'')+(r.qual?' ('+r.qual+')':''))).join('<br>');
}
function pfLineText(ex,line){return pwText([{kind:'ex',ex,lines:[line]}]).split('\n').slice(1).map(x=>x.trim()).join('\n');}
/* v4.6.73: THE ROUTINE PAGE SHOWS LAST TIME, AND EDITS IN PLACE.
   The page listed each exercise's prescription as a line of text and sent
   every change through a form card: tap the pencil, tap Edit on a line, fill
   two fields, Keep changes. The maker's ask was to see what he did LAST TIME
   next to what he plans, without breaking the layout -- and the answer that
   survived eleven boards is a spine: weight right-aligned, the x centred to
   the pixel, reps left-aligned into invisible columns, one per set. The plan
   sits on the spine in ink; last time sits under it a step lighter, folded
   the way it was lifted (consecutive same-weight sets on one line), with the
   date as a small chip after the final line. Anything that changed since
   last time is blue, compared position by position.
   Edit opens the exercise in place: the same lines, every number a dotted
   chip; a tapped chip IS the input. A bin in the gutter deletes a line; a
   plus chip adds a set; Add a line and Remove exercise sit under the lines,
   and a removal leaves an Undo strip where the thing was. No warm-up marks
   on this page: a qualifier a plan was pasted with is kept on the line but
   not shown or asked for. */
const pfMD=d=>{const [,m,dd]=String(d).split('-').map(Number);return m+'/'+dd;};
function pfLoadText(line){const unit=line.unit||U(),w=+Number(line.w||0).toFixed(4);return line.nw?'By feel':line.bw?(w?`BW+${w} ${unit}`:'BW'):`${line.est?'≈':''}${w} ${unit}`;}
function pfLastGroups(ex){
 const last=typeof lastFor==='function'&&typeof SEED!=='undefined'?lastFor(ex):null;if(!last?.sets?.length)return null;
 const groups=[];
 for(const s of last.sets){const w=+s[0]||0,reps=(s[1]||[]).map(Number).filter(Number.isFinite);if(!reps.length)continue;const g=groups.at(-1);if(g&&Math.abs(g.w-w)<1e-6)g.reps.push(...reps);else groups.push({w,reps:[...reps]});}
 if(!groups.length)return null;
 return {d:last.d,groups:groups.map(g=>({load:isBody(ex)&&g.w<=0.01?'BW':(isBody(ex)?'BW+':'')+wDisp(g.w)+' '+U(),reps:g.reps}))};
}
function pfSpineLine(load,reps,cls,ref,tail='',compare=false){
 const wup=compare&&!ref;                       // no line at this load last time: the load is the change
 const rs=reps.map((r,i)=>`<i${ref&&(i>=ref.reps.length||ref.reps[i]!==r)?' class="pe-up"':''}>${hesc(String(r))}</i>`).join('');
 return `<div class="pe-line ${cls}"><span class="pe-w${wup?' pe-up':''}">${hesc(load)}</span><span class="pe-x" aria-hidden="true">×</span><span class="pe-r"><span class="pe-reps">${rs}</span>${tail}</span></div>`;
}
function pfChipOpen(i,k,field,rep){const c=pfState().chip;return !!c&&c.row===i&&c.line===k&&c.field===field&&(field==='w'||c.rep===rep);}
function pfChip(i,k,field,rep,text,aria,step){
 if(pfChipOpen(i,k,field,rep))return `<input id="peInput" class="pe-chip pe-in${field==='w'?' pe-cw':''}" type="number" inputmode="${field==='r'?'numeric':'decimal'}" step="${field==='r'?1:step}" min="0" value="${hesc(String(text))}" aria-label="${aria}">`;
 return `<button type="button" class="pe-chip${field==='w'?' pe-cw':''}" data-pw="pf-chip" data-index="${i}" data-line="${k}" data-field="${field}"${field==='r'?` data-rep="${rep}"`:''} aria-label="${aria}">${hesc(String(text))}</button>`;
}
function pfEditLine(ex,i,k,g){
 const c=pfState().chip,open=c&&c.row===i&&c.line===k,line=g.line,unit=line.unit||U();
 const wText=open&&c.field==='w'?(c.fresh?c.fresh.w:line.nw?'':+Number(line.w||0).toFixed(4)):pfLoadText(line);
 const reps=line.reps.map((r,ri)=>pfChip(i,k,'r',ri,r,`Set ${ri+1}: ${r}${isHold(line.su)?' seconds':' reps'}`)).join('');
 return `<div class="pe-line pe-edit"><button type="button" class="pe-del" data-pw="pf-del-line" data-index="${i}" data-line="${k}" aria-label="Delete ${hesc(pfLoadText(line))} × ${hesc(line.reps.join(' '))}">${icon('trash',ICON_SZ.sm)}</button><span class="pe-w">${pfChip(i,k,'w',0,wText,`Weight, ${unit}`,typeof wStep==='function'?wStep(ex):'any')}</span><span class="pe-x" aria-hidden="true">×</span><span class="pe-r">${reps}<button type="button" class="pe-chip pe-add" data-pw="pf-add-rep" data-index="${i}" data-line="${k}" aria-label="Add a set">+</button></span></div>`;
}
function pfStripHTML(text){return `<div class="pe-removed" role="status"><span>Removed <b>${hesc(text)}</b></span>${pwButton('undo','\u21BA Undo','pe-undo')}</div>`;}
function pfRefs(groups,last){
 const all=last?.groups||[],used=new Set();
 return groups.map(g=>{
  const key=pfLoadText(g.line).replace(/^\u2248/,'');
  let k=all.findIndex((x,ix)=>!used.has(ix)&&x.load===key);
  const fresh=k<0;
  if(fresh)k=all.findIndex(x=>x.load===key);   // a second line at a load already used: same reference, not a new load
  if(k<0)return null;
  used.add(k);
  return {...all[k],fresh:false};
 });
}
function pfExerciseHTML(r,i){
 const j=pfState(),b=pwDay(pw().active),open=!!j.routineOpen?.[pw().active]?.[i],groups=pfGroups(r),last=isCardio(r)?null:pfLastGroups(r.ex),strip=b.strip&&b.strip.row===i&&b.strip.line!=null?b.strip:null;
 /* v4.6.76: BLUE MEANS YOU CHANGED IT, AND A LOAD IS COMPARED TO ITSELF.
    Lines were matched by their position in the list, counted from the end --
    so adding a warm-up above shifted every line onto the wrong reference and
    a plan that repeated last week's 95 x 10 came out blue against last week's
    115. A plan line is compared to the LAST-TIME LINE AT THE SAME LOAD: the
    weight goes blue only when that load is new to this exercise, and the reps
    only where they differ from what that same load actually did. */
 const refs=pfRefs(groups,last);
 const lines=[];
 groups.forEach((g,k)=>{
  if(strip&&strip.line===k)lines.push(pfStripHTML(strip.text));
  const ref=refs[k],tail=isHold(g.line.su)?'<span class="pe-q">sec</span>':'';
  lines.push(open?pfEditLine(r.ex,i,k,g):pfSpineLine(pfLoadText(g.line),g.line.reps,'pe-plan',ref,tail,!!last));
 });
 if(strip&&strip.line>=groups.length)lines.push(pfStripHTML(strip.text));
 if(last)last.groups.forEach((g,k)=>lines.push(pfSpineLine(g.load,g.reps,'pe-last',null,k===last.groups.length-1?`<span class="pe-d">${hesc(pfMD(last.d))}</span>`:'')));
 const toggle=pwButton('pf-row-toggle',open?icon('check',ICON_SZ.sm)+' Done':icon('edit',ICON_SZ.sm),'pf-row-toggle pe-toggle'+(open?' primary':''),`data-index="${i}" aria-expanded="${open}" aria-label="${open?'Done editing':'Edit'} ${hesc(r.ex)}"`);
 const actions=open?`<div class="pe-actions">${pwButton('pf-add-line',icon('clear',ICON_SZ.sm,45)+' Add a line','pe-btn',`data-index="${i}"`)}${pwButton('pf-remove-ex',icon('trash',ICON_SZ.sm)+' Remove exercise','pe-btn pe-danger',`data-index="${i}"`)}</div>`:'';
 return `<article class="pw-exercise pw-editable pe-ex${open?' pe-open':''}" data-pw-row="${i}"><button class="pw-btn pw-grip" data-pw-grip="${i}" aria-label="Reorder ${hesc(r.ex)}; drag or use arrow keys">${icon('grip',ICON_SZ.sm)}</button><div class="pf-ex-summary"><div><strong>${hesc(r.ex)}</strong></div>${toggle}</div><div class="pe-lines">${lines.join('')}</div>${actions}</article>`;
}
function pfEditRows(){const b=pwDay(pw().active),strip=b.strip&&b.strip.line==null?b.strip:null;return '<div class="pw-exercises">'+b.rows.map((r,i)=>{
 const before=strip&&strip.row===i?pfStripHTML(strip.text):'';
 if(r.kind!=='ex'||!r.ex)return before+'<div data-pw-row="'+i+'" class="pw-unread"><pre>'+hesc(r.raw||'')+'</pre>'+pwButton('editrow','Edit text','',`data-index="${i}"`)+'</div>';
 return before+pfExerciseHTML(r,i);
 }).join('')+(strip&&strip.row>=b.rows.length?pfStripHTML(strip.text):'')+'</div>';}
/* one gesture = one undo point, and a strip only ever describes the LAST one */
function pfChange(b){delete b.strip;pwUndoPoint(b);b.source='Your draft';b.target=null;}
function pfSetGroup(b,i,g,line){
 pfChange(b);delete line.raw;if(line.w>0)delete line.nw;
 const reps=line.reps,lines=Array.from({length:Math.ceil(reps.length/12)},(_,k)=>({...line,reps:reps.slice(k*12,k*12+12)}));
 b.rows[i].lines.splice(g.indices[0],g.indices.length,...lines);if(!b.locks.includes(i))b.locks.push(i);
}
function pfChipCommit(){
 const j=pfState(),c=j.chip;if(!c)return false;j.chip=null;
 const inp=document.getElementById('peInput'),b=pwDay(pw().active),r=b.rows[c.row],g=r&&pfGroups(r)[c.line];
 if(!inp||!g)return false;
 const v=Number(inp.value),line=pwCopy(g.line);
 if(c.field==='w'){if(inp.value.trim()===''||!Number.isFinite(v)||v<0||v>10000)return false;if(v===+Number(line.w||0).toFixed(4))return false;line.w=+v.toFixed(4);}
 else{
  /* v4.6.76: CLEARING A REP REMOVES IT. + adds a set to a line, and nothing
     took one away: 0 was refused as an invalid rep count, which is true of a
     rep you keep and wrong for one you are deleting. Empty or 0 removes that
     set; clearing a line's last rep removes the line, with the same Undo
     strip the bin leaves, because a line of no sets is not a line. */
  const blank=inp.value.trim()==='';
  if(blank||v===0){
   if(line.reps.length<2){
    const text=pfLoadText(g.line)+' \u00d7 '+g.line.reps.join(' ');
    pfChange(b);r.lines=r.lines.filter((_,x)=>!g.indices.includes(x));
    b.strip={row:c.row,line:c.line,text};if(!b.locks.includes(c.row))b.locks.push(c.row);
    pwPersist();return true;
   }
   line.reps.splice(c.rep,1);
  }
  else if(!Number.isInteger(v)||v<1||v>10000||line.reps[c.rep]===v)return false;
  else line.reps[c.rep]=v;
 }
 pfSetGroup(b,c.row,g,line);pwPersist();return true;
}
function pfRoutineHandle(a,el,b,j){
 const i=+el.dataset.index,k=+el.dataset.line,r=b.rows[i],g=r&&pfGroups(r)[k];
 if(a==='pf-chip'){const next={row:i,line:k,field:el.dataset.field,rep:+el.dataset.rep||0};if(j.chip&&j.chip.row===next.row&&j.chip.line===next.line&&j.chip.field===next.field&&j.chip.rep===next.rep)return;pfChipClose(true);j.chip=next;}
 else if(a==='pf-add-rep'){pfChipClose(true);if(!g)return;const line=pwCopy(g.line);line.reps.push(line.reps.at(-1)||8);pfSetGroup(b,i,g,line);}
 else if(a==='pf-del-line'){pfChipClose(true);if(!g)return;const text=pfLoadText(g.line)+' × '+g.line.reps.join(' ');pfChange(b);r.lines=r.lines.filter((_,x)=>!g.indices.includes(x));b.strip={row:i,line:k,text};if(!b.locks.includes(i))b.locks.push(i);}
 else if(a==='pf-add-line'){if(!r)return;pfChipClose(true);const from=r.lines.at(-1)||{w:0,unit:U(),reps:[8]},line={w:0,unit:from.unit||U(),reps:[from.reps.at(-1)||8]};if(from.su)line.su=from.su;if(from.bw)line.bw=true;pfChange(b);r.lines.push(line);if(!b.locks.includes(i))b.locks.push(i);j.chip={row:i,line:pfGroups(r).length-1,field:'w',rep:0,fresh:{w:+Number(from.w||0).toFixed(4)}};}
 else if(a==='pf-remove-ex'){pfChipClose(false);if(!r)return;pfChange(b);b.rows.splice(i,1);b.locks=b.locks.filter(x=>x!==i).map(x=>x>i?x-1:x);b.strip={row:i,text:r.ex||'exercise'};const o=j.routineOpen?.[pw().active];if(o){const n={};for(const [key,v] of Object.entries(o)){const x=+key;if(x<i)n[x]=v;else if(x>i)n[x-1]=v;}j.routineOpen[pw().active]=n;}}
}
document.addEventListener('pointerdown',e=>{
 /* a tap on another chip while one is open: commit first, then open. The
    click that follows would land on a re-rendered element, so the chip
    opens from here and the click finds it already open. */
 if(!pfOn())return;const chip=e.target.closest('[data-pw="pf-chip"]');if(!chip||!pfState().chip)return;
 e.preventDefault();pfHandle('pf-chip',chip);
});
document.addEventListener('keydown',e=>{
 if(e.target.id!=='peInput'||!pfOn())return;
 if(e.key==='Enter'){e.preventDefault();pfChipClose(true);pwPersist();pwRender();}
 else if(e.key==='Escape'){e.preventDefault();pfChipClose(false);pwPersist();pwRender();}
});
document.addEventListener('focusout',e=>{
 if(e.target.id!=='peInput'||!pfOn()||!pfState().chip||e.target!==document.getElementById('peInput'))return;
 pfChipClose(true);pwPersist();pwRender();
});
/* close the open chip: commit (or not), then drop a fresh line nothing was typed into */
function pfChipClose(commit){
 const j=pfState(),c=j.chip;if(!c)return;
 if(commit)pfChipCommit();else j.chip=null;
 if(c.fresh){const b=pwDay(pw().active),r=b.rows[c.row],g=r&&pfGroups(r)[c.line];if(g&&!(g.line.w>0)&&!g.line.bw&&!g.line.nw)r.lines=r.lines.filter((_,x)=>!g.indices.includes(x));}
}
function pfFocusChip(){const inp=document.getElementById('peInput');if(!inp)return;inp.focus();try{inp.select();}catch(_e){}}
function pfHistoryHTML(compact=false){const s=pw(),parts=s.active?(pwDay(s.active).parts.length?pwDay(s.active).parts:pwParts(pwDay(s.active).rows)):[],date=Object.keys(DB.days).filter(d=>d<(s.active||todayISO)&&(DB.days[d].w||[]).length&&(!parts.length||(DB.days[d].w||[]).some(r=>r.part===parts[0]))).sort().at(-1);if(!date)return '';const rows=DB.days[date].w,exercises=[...new Set(rows.map(r=>r.ex))],sets=rows.reduce((n,r)=>n+(r.ex==='Run'?1:(r.reps||[]).length),0);return `<details class="card pf-history" ${compact?'':'open'}><summary><strong>Last workout day</strong><span>${hesc(pfShort(date))}</span></summary><p class="pw-small">${sets} sets · ${exercises.length} exercises · Entire day</p>${exercises.map(ex=>`<div class="pf-history-row"><strong>${hesc(ex)}</strong><p class="mono">${pfHistoryLines(rows.filter(r=>r.ex===ex))}</p></div>`).join('')}</details>`;}
/* v4.6.76: A DAY THAT IS NOT SAVED SAYS SO. Every edit lands in a draft that
   only Save writes, and once the week is a strip the edited day can be three
   taps away -- so the chip carries a dot, and the dock counts them. A day with
   no saved plan behind it counts as unsaved too: it is, until Save runs. */
function pfDirty(d){const b=pw().book?.[d];return !!b&&(b.source!=='Saved plan'||!pwSaved(d)?.items?.length);}
function pfDirtyDates(){return pfDates().filter(pfDirty);}
function pfWeekStrip(){const s=pw();return `<div class="pf-strip" role="tablist" aria-label="Planned days">${pfDates().map(d=>{const b=pwDay(d),part=(b.parts.length?b.parts:pwParts(b.rows))[0]||'\u2014',on=d===s.active,dirty=pfDirty(d);return pwButton('pf-pick-day',`<b>${hesc(new Date(d+'T12:00').toLocaleDateString('en-US',{weekday:'short'}))}</b><s>${hesc(pfMD(d))}</s><u>${hesc(part)}</u>${dirty?'<em class="pf-dot" aria-hidden="true"></em>':''}`,'pf-chip'+(on?' selected':'')+(dirty?' pf-edited':''),`data-date="${d}" role="tab" aria-selected="${on}" aria-label="${hesc(pfShort(d))}${dirty?', unsaved changes':''}"`);}).join('')}</div>`;}
function pfDayHTML(){return pfWeekStrip()+`<div class="pf-day-body">${pfDayBodyHTML()}</div>`;}
function pfDayBodyHTML(){const s=pw(),b=pwDay(s.active),j=pfState(),total=pwSetCount(b.rows),changed=b.target!=null&&b.target!==total;
 return `<div class="pf-routine-controls"><div class="pf-total"><span>Set target</span><div class="pw-stepper">${pwButton('pf-minus','\u2212','','aria-label="Decrease total sets"'+(!b.rows.length?' disabled':''))}<output class="${changed?'pf-changed':''}">${b.target??total}</output>${pwButton('pf-plus','+','','aria-label="Increase total sets"'+(!b.rows.length?' disabled':''))}</div></div><div class="pf-tools">${pwAction('pf-regenerate','Regenerate','sparkle','pf-quiet-regenerate'+(changed?' pf-beam pf-target-pending':''))}${pwButton('paste',icon('paste',ICON_SZ.sm),'pw-icon pf-tool','aria-label="Paste a routine" title="Paste"')}${pwButton('pf-clear',icon('clear',ICON_SZ.sm),'pw-icon pf-tool','aria-label="Clear this day" title="Clear"')}</div></div><p class="pf-target-hint" role="status">${changed?total+' current \u2192 '+b.target+' target \u00b7 Regenerate to apply':total+' sets \u00b7 '+pwExercises(b.rows).length+' exercises'}</p><div class="card pf-routine-card">${b.rows.length?pfEditRows():'<p>No exercises yet.</p>'}</div><div class="pf-add-summary">${pwButton('add',icon('clear',ICON_SZ.sm,45)+' Add exercise','pf-add-button')}</div>${b.undo&&!b.strip?pwButton('undo','Undo','pw-text'):''}`;
}
/* v4.6.77: PICKING A DAY IS NOT A NAVIGATION. Every chip tap ran pfNavigate,
   which rebuilt the whole workspace, played the 'arrive' motion -- the page
   translating 12px and fading, 360ms -- and then scrolled to the top. Three
   movements to swap the content under a strip that never moves. The strip is
   a tab bar: the chips flip their own selected state and only the body below
   them is rewritten, in place, with the scroll left where it was. */
function pfSwapDay(){
 const body=document.querySelector('.pf-day-body'),strip=document.querySelector('.pf-strip');
 if(!body||!strip)return pwRender();
 const active=pw().active;
 for(const chip of strip.querySelectorAll('.pf-chip')){
  const on=chip.dataset.date===active;
  chip.classList.toggle('selected',on);chip.setAttribute('aria-selected',String(on));
 }
 const y=window.scrollY;
 body.innerHTML=pfDayBodyHTML();
 /* the new day can be shorter than the scroll position the old one allowed */
 const max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
 if(y>max)window.scrollTo(0,max);
 pwPositionDock();
}
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
 else if(j.page==='edit'&&s.active){body=pfDayHTML();const dirty=pfDirtyDates().length;footer='<div class="pf-compact-save"><div><strong>'+s.dates.length+' planned '+(s.dates.length===1?'day':'days')+'</strong><p>'+(dirty?dirty+(dirty===1?' day has':' days have')+' unsaved changes.':'Everything here is saved.')+'</p></div>'+pwAction('pf-save','Save','check','primary',pfPending()?'disabled':'')+'</div>';}
 else if(j.page==='done'){body=pfDoneHTML();footer=pwButton('close','Plans saved · Done','primary');}
 if(j.clear){body=`<div class="card" role="alert"><h3>Clear ${hesc(pfShort(s.active))}?</h3>${pwButton('pf-remove-day','Remove this day')}<p class="pw-small">Remove its plan when you save.</p>${pwButton('pf-empty-day','Keep day, empty routine')}<p class="pw-small">Add exercises manually. No logged workouts change.</p>${pwButton('pf-clear-cancel','Cancel')}</div>`;footer='';}
 if(j.emptyConfirm){const empty=pfDates().filter(d=>!pwSetCount(pwDay(d).rows)),valid=s.dates.length-empty.length;body=`<div class="card" role="alert"><h3>Empty days won’t be saved</h3>${empty.map(d=>`<p><strong>${hesc(pwDate(d))}</strong><br>0 planned sets · No plan</p>`).join('')}<p class="pw-small">These dates will become No plan. Any existing saved plan on these dates will be removed. Logged workouts stay untouched.</p>${pwButton('pf-confirm-save',valid?'Save '+valid+' days & clear empty days':'Set dates to No plan','primary')}${pwButton('pf-clear-cancel','Back to editing')}</div>`;footer='';}
 if(s.conflict){body=`<div class="card" role="alert"><h3>Newer plan · ${hesc(pwDate(s.conflict))}</h3>${pfRoutine(pwRead(planText(pwSaved(s.conflict))))}${pwButton('load-newer','Use newer plan')}${pwButton('replace-newer','Keep my draft')}</div>`;footer='';}
 $('#view').innerHTML=pwFoldMarkup(`<section class="pw-workspace pf-workspace${j.page==='dates'?' pf-dates-page':j.page==='edit'?' pf-routine-page':j.page==='days'?' pf-overview-page':''}" aria-label="Planning workspace">${j.prefOrigin==='settings'&&j.page==='prefs'?'':pfStepbar()}${s.error?`<p class="pw-message" role="alert">${hesc(s.error)}</p>`:''}${body}<span id="pw-reorder-help" class="pw-sr-only">Drag or use arrow keys to reorder.</span><span id="pw-reorder-status" role="status" class="pw-sr-only"></span>${footer?`<div class="pw-save-dock pf-dock">${footer}</div>`:''}</section>`);if(s.busy)document.querySelectorAll('.pf-date-sheet button,.pf-steps button').forEach(b=>b.disabled=true);pfPlayMotion();requestAnimationFrame(pwPositionDock);pfFocusChip();
}
pwRender=function(){return pfOn()?pfRender():pfLegacy.render();};
pwOpen=function(d,step){if(!pfOn())return pfLegacy.open(d,step);const s=pw(),j=pfState();j.history=[];j.lastScreen=null;j.returnView=view==='sync'?'sync':'today';if(s.busy){pwRequest++;lift.writeAbort?.abort();s.busy=false;}if(d){s.dates=[d];s.active=d;s.month=d.slice(0,7)+'-01';pwDay(d);}else pwFreshenDates();/* v4.6.61: same rule as the legacy open, from the same helper */j.page=step==='dates'?'dates':d&&pwSaved(d)?'edit':d?'dates':j.page;j.prefOrigin=null;if(d&&pwSaved(d))pfAnchor();lift.plan='workspace';view='today';s.step='edit';pwPersist();render({soft:true});};
pwApply=function(add=false){if(!pfOn())return pfLegacy.apply(add);const c=pw().candidate;if(!c)return;const generated=c.type==='generate',adjust=c.type==='adjust';if(c.type==='paste'&&c.index===undefined&&pfState().pasteAll){const one=Object.values(c.days)[0];c.days=Object.fromEntries(pfDates().map(d=>[d,pwCopy(one)]));}pfLegacy.apply(add);for(const d of Object.keys(c.days)){pwDay(d).target=null;}pfAnchor();pfMotion={kind:'arrive'};pfNavigate(generated?'days':'edit');};
pwPayload=function(dates,action){const p=pfLegacy.payload(dates,action);if(!pfOn())return p;const prefs=pfPrefs();p.workspace.preferences=prefs;p.note=[p.note,'Confirmed planning preferences: '+JSON.stringify(prefs),"Respect avoided exercises. Frequency describes the usual week; only generate the explicitly selected dates. Time is an approximate budget, not a promise."].filter(Boolean).join('\n');return p;};
function pfMoveDay(from,to){const ds=pfDates(),a=ds.indexOf(from),b=ds.indexOf(to);if(a<0||b<0||a===b)return;const bundles=ds.map(d=>pwCopy(pwDay(d))),[moved]=bundles.splice(a,1);bundles.splice(b,0,moved);ds.forEach((d,i)=>{const old=pwDay(d);pw().book[d]={...bundles[i],base:old.base,source:'Your draft'};});pwPersist();pwRender();}
function pfSave(confirm=false){const s=pw(),j=pfState();if(!pfMatch())throw Error('Restore the editing dates, or generate a new draft first.');if(pfPending())throw Error('Regenerate the changed total sets before saving.');const empty=s.dates.filter(d=>!pwSetCount(pwDay(d).rows));if(empty.length&&!confirm){j.emptyConfirm=true;pwRender();return;}
 const dates=[...new Set([...s.dates,...j.removed.map(x=>x.date)])];if(!dates.length)throw Error('Choose at least one date.');
 for(const d of dates){if(d<todayISO)throw Error('A draft date has passed. Choose today or a future date.');const base=j.removed.find(x=>x.date===d)?.base??pwDay(d).base;if(base!==pwFingerprint(d)){s.conflict=d;throw Error(`${pwDate(d)} changed on another device. Review it before saving.`);}}
 const days=pwCopy(DB.week?.days||{}),at=Date.now();j.saved=dates.map(d=>({date:d,sets:j.removed.some(x=>x.date===d)?0:pwSetCount(pwDay(d).rows),parts:pwParts(pwDay(d).rows),rows:pwCopy(pwDay(d).rows)}));
 for(const d of dates){const remove=empty.includes(d)||j.removed.some(x=>x.date===d);if(remove){delete days[d];if(DB.plan?.d===d){DB.plan=null;DB.planAt=at;}}else{const b=pwDay(d),doc={...planItemsFrom(b.rows),raw:pwText(b.rows),title:pwParts(b.rows).join(' + ')};days[d]=doc;if(DB.plan?.d===d){DB.plan={d,...doc};DB.planAt=at;}}}
 const all=Object.keys(days).sort();DB.week=all.length?{from:all[0],to:all.at(-1),days,raw:'',at}:null;DB.weekAt=at;planRailRefresh();save(true);for(const d of s.dates){const b=pwDay(d);b.base=pwFingerprint(d);b.source='Saved plan';delete b.undo;delete b.strip;}j.removed=[];j.furthest=3;j.emptyConfirm=false;pfNavigate('done');
}
pwSave=function(){return pfOn()?pfSave():pfLegacy.save();};
function pfHandle(a,el){const s=pw(),j=pfState(),d=el.dataset.date,i=+el.dataset.index,b=s.active?pwDay(s.active):null;
 if(a==='pf-settings'){j.history=[];j.lastScreen=null;j.returnView='sync';j.prefOrigin='settings';j.prefs=pfPrefs();lift.plan='workspace';view='today';pfNavigate('prefs');return;}
 if(a==='pf-prefs'){j.prefOrigin=j.page;j.prefs=pfPrefs();pfNavigate('prefs');return;}
 if(a==='pf-move'){j.move={delta:1};pfRender();return;}
 if(a==='pf-move-step'){if(!j.move)return;j.move.delta+=+el.dataset.delta;if(j.move.delta===0)j.move.delta+=+el.dataset.delta;pfRender();return;}
 if(a==='pf-move-cancel'){j.move=null;pfRender();return;}
 if(a==='pf-move-go'){if(!j.move)return;const r=planShift(pfDateKinds().saved,j.move.delta);if(!r.ok)return;j.move=null;pfRender();toastUndo('Moved '+r.moves.length+(r.moves.length===1?' plan':' plans'),()=>{r.undo();pfRender();});return;}
 if(a==='pf-leave'){pfLeave();return;}
 if(a==='pf-back'){pfBack();return;}
 if(a==='pf-stage'){j.prefOrigin=null;const n=+el.dataset.stage;if(n===2&&pfSavedSelection()){s.dates.forEach(d=>pwDay(d));if(!s.dates.includes(s.active))s.active=pfDates()[0];pfAnchor();}else if(n>j.furthest||n>=2&&!pfMatch())return;pfNavigate(['prefs','dates','days','done'][n]);return;}
 if(a==='pf-frequency'){j.prefs.frequency=el.dataset.value==='varies'?'varies':+el.dataset.value;}
 else if(a==='pf-size')j.prefs.mode=el.dataset.value;
 else if(a==='pf-unavoid')j.prefs.avoid.splice(i,1);
 else if(a==='pf-prefs-save'){const p=j.prefs;if(!p||!Number.isInteger(p.minutes)||p.minutes<10||p.minutes>180||!Number.isInteger(p.minSets)||!Number.isInteger(p.maxSets)||p.minSets<1||p.maxSets>100||p.minSets>p.maxSets)throw Error('Use valid whole numbers. Minimum sets cannot exceed maximum.');DB.settings.plannerPreferences=pwCopy(p);DB.settingsAt=Date.now();save(true);if(j.prefOrigin==='settings'){j.prefOrigin=null;lift.plan=null;view='sync';render();return;}pfNavigate(j.prefOrigin||'dates');return;}
 else if(a==='pf-dates'){pfNavigate('dates');return;}
 else if(a==='pf-resume-drafts'){if(!pfSelectSubset(pfDateKinds().drafts))return;pfAnchor();pfMotion={kind:'arrive'};pfNavigate('days');return;}
 else if(a==='pf-edit-selected'){if(!pfSelectSubset(pfDateKinds().saved))return;pfAnchor();pfMotion={kind:'arrive'};pfNavigate('days');return;}
 else if(a==='pf-generate'){if(!s.dates.length)return;if(el.dataset.subset==='fresh'&&!pfSelectSubset(pfDateKinds().fresh))return;j.anchorBefore=pwCopy(j.anchor);pwGenerate();return;}
 else if(a==='pf-paste-dates'){if(!s.dates.length)return;s.active=s.dates[0];s.editIndex=undefined;s.pasteText='';s.step='paste';}
 else if(a==='pf-expand'){j.open=j.open||{};const open=!s.dates.every(x=>j.open[x]);s.dates.forEach(x=>j.open[x]=open);}
 else if(a==='pf-done-expand'){j.doneOpen=j.doneOpen||{};const dates=(j.saved||[]).filter(x=>x.sets).map(x=>x.date),open=!dates.every(d=>j.doneOpen[d]);dates.forEach(d=>j.doneOpen[d]=open);}
 else if(a==='pf-pick-day'){
  if(!d||d===s.active)return;                 // the day you are on: nothing moves
  pfChipClose(true);                          // an open rep chip commits before the day goes
  s.active=d;j.group=null;s.error='';pwPersist();pfSwapDay();return;
 }
 else if(a==='pf-edit-day'||a==='pf-edit-first'){s.active=d||pfDates()[0];pfMotion={kind:'arrive'};pfNavigate('edit');return;}
 else if(a==='pf-row-toggle'){pfChipClose(true);j.routineOpen=j.routineOpen||{};const open=j.routineOpen[s.active]||(j.routineOpen[s.active]={});open[i]=!open[i];}
 else if(['pf-chip','pf-add-rep','pf-del-line','pf-add-line','pf-remove-ex'].includes(a)){if(!b)return;pfRoutineHandle(a,el,b,j);}
 else if(a==='pf-clear'){j.clear=true;}
 else if(a==='pf-clear-cancel'){j.clear=false;j.emptyConfirm=false;}
 else if(a==='pf-empty-day'){pwUndoPoint(b);b.rows=[];b.parts=[];b.locks=[];b.target=null;b.cleared=true;b.source='Your draft';j.clear=false;}
 else if(a==='pf-remove-day'){j.removed.push({date:s.active,base:b.base});s.dates=s.dates.filter(x=>x!==s.active);j.anchor=j.anchor.filter(x=>x!==s.active);s.active=s.dates[0]||null;pfNavigate('days');return;}
 else if(a==='pf-plus'||a==='pf-minus'){const total=pwSetCount(b.rows),limit=pwSetLimits(b);b.target=Math.max(limit.min,Math.min(limit.max,(b.target??total)+(a==='pf-plus'?1:-1)));if(b.target===total)b.target=null;}
 else if(a==='pf-regenerate'){pwGenerate(b.target!=null&&b.target!==pwSetCount(b.rows),true);return;}
 else if(a==='pf-save'||a==='pf-confirm-save'){pfSave(a==='pf-confirm-save');return;}
 pwPersist();pwRender();
}
pwHandle=function(e){if(e.target.closest('[data-pw="pf-settings"]')){pfHandle('pf-settings',e.target.closest('[data-pw]'));return true;}if(!pfOn())return pfLegacy.handle(e);const el=e.target.closest('[data-pw]');if(!el)return false;const a=el.dataset.pw,s=pw(),j=pfState();try{if(s.busy&&a!=='pf-back'&&a!=='pf-leave')return true;if(a==='date'||a==='month')pfMotion={kind:a,date:el.dataset.date,dir:+el.dataset.delta||1,before:s.dates.length};if(a.startsWith('pf-')){pfHandle(a,el);return true;}if(a==='date'){const result=pfLegacy.handle(e);j.removed=j.removed.filter(x=>!s.dates.includes(x.date));pwPersist();return result;}if(a==='load-newer'||a==='replace-newer'){const d=s.conflict,result=pfLegacy.handle(e);if(d){if(a==='load-newer')j.removed=j.removed.filter(x=>x.date!==d);else j.removed.forEach(x=>{if(x.date===d)x.base=pwFingerprint(d);});s.step='edit';pwPersist();pwRender();}return result;}if(a==='save'){pfSave();return true;}if(a==='dates-toggle'){pfNavigate('dates');return true;}if(a==='day'){s.active=el.dataset.date;pfNavigate('edit');return true;}if(a==='back'&&['paste','editrow','candidate'].includes(s.step)){s.candidate=null;pfNavigate(pfMatch()?'edit':'dates');return true;}if(a==='edit'){s.candidate=null;pfNavigate(pfMatch()?'edit':'dates');return true;}return pfLegacy.handle(e);}catch(err){s.error=err.message;pwRender();return true;}};
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
