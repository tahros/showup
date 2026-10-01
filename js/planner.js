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
/* v4.6.101: A PLANNED WEEK CAN MOVE. "I can't train Tuesday" is the most
   common thing that happens to a planned week, and until now the answer was
   delete-and-regenerate. This is one operation -- shift these planned days by
   N -- that two doors call: Push on Today, Move in the Dates step.
   What it keeps, in order of what would hurt most to break:
     LOGGED WORKOUTS STAY UNTOUCHED. A day with sets logged never moves, and
       nothing may land on one -- the plan under a logged day is the frozen
       basis those sets link to.
     NOTHING LANDS IN THE PAST.
     A saved plan that is NOT part of the move is reported, not overwritten:
       the door asks before it lands on one. Landing on a free day just lands.
     Drafts travel with their day, and so does the selection.
   planShiftable answers "what would happen"; planShift does it and hands back
   the inverse, so a toast can undo it as one move. */
function pwShiftISO(d,delta){const x=new Date(d+'T12:00');x.setDate(x.getDate()+delta);return pwISO(x);}
function planShiftable(dates,delta){
  const days=DB.week?.days||{};
  const moves=[...new Set(dates)].filter(d=>pwSaved(d)?.items?.length).sort().map(from=>({from,to:pwShiftISO(from,delta)}));
  if(!moves.length)return {ok:false,reason:'nothing',moves:[]};
  if(!delta)return {ok:false,reason:'still',moves};
  for(const {from,to} of moves){
    if((DB.days[from]?.w||[]).length)return {ok:false,reason:'logged',date:from,moves};
    if(to<todayISO)return {ok:false,reason:'past',date:to,moves};
    if((DB.days[to]?.w||[]).length)return {ok:false,reason:'landsOnLogged',date:to,moves};
  }
  const leaving=new Set(moves.map(m=>m.from));
  const replaces=moves.map(m=>m.to).filter(t=>!leaving.has(t)&&pwSaved(t)?.items?.length);
  return {ok:true,moves,replaces};
}
function planShift(dates,delta){
  const plan=planShiftable(dates,delta);if(!plan.ok)return plan;
  const s=pw();
  /* UNDO IS A SNAPSHOT, NOT AN INVERSE. Shifting back by -delta looks like the
     opposite of shifting forward and is not: a move that replaced a saved plan
     destroyed it, and no amount of shifting brings it back. Everything this
     touches is small, so undo puts back exactly what was there. */
  const before={week:pwCopy(DB.week),plan:pwCopy(DB.plan),book:pwCopy(s.book||{}),dates:[...s.dates],active:s.active};
  const days={...(DB.week?.days||{})},carried={};
  /* sources leave in one pass and land in the next, so a day that is both a
     source and a destination -- every middle day of a week being pushed -- is
     never read after it has been written */
  for(const {from} of plan.moves){carried[from]=days[from];delete days[from];}
  for(const {from,to} of plan.moves){days[to]={...carried[from],d:to};}
  const all=Object.keys(days).sort();
  DB.week=all.length?{...(DB.week||{}),from:all[0],to:all.at(-1),days,raw:'',at:Date.now()}:null;DB.weekAt=Date.now();
  /* DB.plan is a second copy of ONE day's plan, and pwSaved reads it first, so
     it has to agree with the week after the move -- whether its day travelled
     (it follows) or something landed on it (it takes what landed). */
  if(DB.plan){
    const moved=plan.moves.find(m=>m.from===DB.plan.d),at=moved?moved.to:DB.plan.d;
    if(moved||plan.moves.some(m=>m.to===at))DB.plan=days[at]?{...days[at],d:at}:null;
  }
  /* drafts travel with their day, in the same two passes and for the same
     reason; the selection follows the plans it was pointing at */
  const book={...(s.book||{})},held={};
  for(const {from} of plan.moves){if(from in book){held[from]=book[from];delete book[from];}}
  for(const {from,to} of plan.moves){if(from in held)book[to]=held[from];else delete book[to];}
  s.book=book;s.dates=s.dates.map(d=>plan.moves.find(x=>x.from===d)?.to||d);
  if(s.active&&!s.dates.includes(s.active))s.active=s.dates[0]||null;
  pwPersist();planRailRefresh();DB.planAt=Date.now();save(true);
  return {...plan,undo(){const st=pw();DB.week=before.week;DB.plan=before.plan;DB.weekAt=DB.planAt=Date.now();
    st.book=before.book;st.dates=before.dates;st.active=before.active;
    pwPersist();planRailRefresh();save(true);}};
}
/* the run Push moves: today and every planned day after it, up to the first
   free day. A plan for next Monday, with a gap before it, stays put. */
function planRunFrom(d){const run=[];for(let x=d;pwSaved(x)?.items?.length;x=pwShiftISO(x,1))run.push(x);return run;}

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
/* v4.5.27: a day's set count for the preview heading. One rep entry is one set, and
   WARM-UPS COUNT -- v3.3.280 settled that a plan holds the session as written and a
   paste saying "6 sets" must not display 4. Rows the parser could not read carry no
   lines and contribute nothing rather than guessing. */
function pwSetCount(rows){
  let n=0;
  for(const r of pwExercises(rows)) for(const line of (r.lines||[])) n+=(line.reps||[]).length;
  return n;
}
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
/* v4.0.5: a fold's remembered state, defaulting to shut so nothing that used
   to open closed now opens by surprise on first run. */
function pwFoldOpen(key,fallback=false){const f=pw().folds;return f&&key in f?!!f[key]:fallback;}
function pwPersist(){const s=pw();try{localStorage.setItem(pwKey(),JSON.stringify({...s,busy:false,candidate:null,error:''}));return true;}catch(_){s.error='This device cannot keep a draft between visits. Keep this screen open until you save.';return false;}}
function pwDay(d){
  const s=pw();if(!s.book[d]){const saved=pwSaved(d),rows=saved?pwRead(planText(saved)):[];
    s.book[d]={rows,parts:pwParts(rows),title:saved?.title||'',base:pwFingerprint(d),source:saved?'Saved plan':'Your draft',notes:[],locks:[],target:null};
  }return s.book[d];
}
/* v4.6.61: A SELECTED DATE THAT HAS PASSED IS STALE. The planner's state persists
   in localStorage under a key carrying no date, so a day picked on Wednesday was
   still picked on Friday: the calendar opened with Sep 16 shaded, "1 day selected"
   named a day already gone, and Plan would have written into the past -- pfSave
   already refuses that ("A draft date has passed"), which is the app agreeing the
   selection was invalid, just two screens too late.
   The old default only ran when the selection was EMPTY, and it is never empty
   again once the planner has been used once.
   Future picks are left alone: a week planned ahead is still a week planned ahead,
   and only days that have actually gone are dropped.
   ONE helper, called by BOTH pwOpen implementations -- planner-flow.js overrides
   pwOpen, and the same line was wrong in each. Two copies of a rule is one rule
   and one lie. */
function pwFreshenDates(){
  const s=pw();
  const fresh=s.dates.filter(x=>x>=todayISO), stale=fresh.length!==s.dates.length;
  if(stale){s.dates=fresh;if(!fresh.includes(s.active))s.active=fresh[0]||null;}
  if(!s.dates.length){s.active=dayClosed()?tomorrowISO():writeDateISO();s.dates=[s.active];}
  if(stale||!s.month)s.month=(s.active||todayISO).slice(0,7)+'-01';
  if(s.active)pwDay(s.active);
  return stale;
}
function pwOpen(d,step){
  const s=pw();s.error='';s.candidate=null;
  const resume=!d&&!step&&['paste','editrow','adjust'].includes(s.step);
  if(s.busy){pwRequest++;lift.writeAbort?.abort();s.busy=false;}
  if(d){s.dates=[d];s.active=d;s.month=d.slice(0,7)+'-01';pwDay(d);}
  else pwFreshenDates();
  s.step=resume?s.step:'edit';s.datesOpen=step==='dates';
  pwPaintedStep=null;lift.plan='workspace';view='today';pwPersist();render({soft:true});
}
function pwGo(step){const s=pw();s.step=step;s.error='';pwPersist();render({inplace:true});}
function pwButton(action,label,cls='',extra=''){return `<button type="button" class="pw-btn ${cls}" data-pw="${action}" ${extra}>${label}</button>`;}
function pwFields(){const s=pw(),goals=[['lose','Lose weight'],['strength','Strength'],['grow','Grow']];return `<div class="pw-goal"><label for="pw-goal">Training goal</label><input id="pw-goal" type="range" min="0" max="2" step="1" data-pw-field="goal" value="${Math.max(0,goals.findIndex(g=>g[0]===s.objective))}" aria-valuetext="${goals.find(g=>g[0]===s.objective)?.[1]||'Grow'}"><div class="pw-goal-labels">${goals.map(([v,t])=>pwButton('goal',t,s.objective===v?'pw-goal-on':'pw-text',`data-goal="${v}" aria-pressed="${s.objective===v}"`)).join('')}</div></div>`;}
// Same calendar glyph, independent of the former History navigation button.
function pwCalendarIcon(){return '<svg class="pw-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><rect class="frame" x="3" y="4.5" width="18" height="17" rx="3.2"/><rect x="3" y="4.5" width="18" height="4.6" rx="2.2"/><rect x="7" y="2" width="2.4" height="5" rx="1.2"/><rect x="14.6" y="2" width="2.4" height="5" rx="1.2"/><rect x="6.5" y="12" width="3" height="3" rx="1"/><rect x="10.5" y="12" width="3" height="3" rx="1"/><rect x="14.5" y="12" width="3" height="3" rx="1"/><rect x="6.5" y="16" width="3" height="3" rx="1"/><rect x="10.5" y="16" width="3" height="3" rx="1"/></svg>';}
function pwAction(action,label,glyph,cls='',extra=''){return pwButton(action,icon(glyph,ICON_SZ.sm)+label,cls,extra);}
function pwDatesButton(action='open'){return pwButton(action,pwCalendarIcon()+'Dates '+icon('chevron',ICON_SZ.sm),'pw-text','aria-label="Choose dates"');}
function pwTabs(){const s=pw();return `<div class="pw-days" aria-label="Days being planned">${s.dates.map(d=>pwButton('day',hesc(new Date(d+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'numeric',day:'numeric'})),s.active===d?'selected':'',`data-date="${d}" aria-pressed="${s.active===d}"`)).join('')}</div>`;}
function pwRowsHTML(rows,editable=false,marks=false){
  const s=pw(),day=s.active?pwDay(s.active):null;
  return `<div class="pw-exercises">${(rows||[]).map((r,i)=>{
    if(r.kind!=='ex'||!r.ex)return `<div class="pw-unread" data-pw-row="${i}"><span class="pw-eyebrow">Kept as a note · check this line</span><pre>${hesc(r.raw||r.name||'')}</pre>${editable?pwButton('editrow','Edit text','pw-text',`data-index="${i}"`):''}</div>`;
    return `<article class="pw-exercise ${editable?'pw-editable':''}" data-pw-row="${i}"><div class="pw-ex-title"><strong>${hesc(r.ex)}</strong>${marks&&r.added?`<span class="pw-added">${r.added==='new'?'new':'added'}</span>${pwButton('add-remove','×','pw-added-x',`data-index="${i}" aria-label="Remove ${hesc(r.ex)}"`)}`:''}${editable?`<div class="pw-row-actions">${pwButton('editrow',icon('edit',ICON_SZ.md),'pw-icon',`data-index="${i}" aria-label="Edit ${hesc(r.ex)}" title="Edit exercise"`)}${pwButton('remove',icon('trash',ICON_SZ.md),'pw-icon',`data-index="${i}" aria-label="Remove ${hesc(r.ex)}" title="Remove exercise"`)}</div>`:''}</div><div class="pw-ex-body"><pre class="pw-prescription">${hesc(pwText([r]).split('\n').slice(1).map(line=>line.trim()).join('\n'))}</pre>${editable?`<div class="pw-ex-tools">${pwButton('lock',day.locks.includes(i)?'Kept fixed':'Keep fixed',day.locks.includes(i)?'pw-fixed':'pw-text',`data-index="${i}" aria-pressed="${day.locks.includes(i)}"`)}</div>`:''}</div>${editable?`<button type="button" class="pw-btn pw-grip" data-pw-grip="${i}" aria-label="Reorder ${hesc(r.ex)}" aria-describedby="pw-reorder-help" title="Hold and drag · arrow keys to move">${icon('grip',ICON_SZ.md)}</button>`:''}</article>`;
  }).join('')}</div>`;
}
function pwPlanTotals(plan){
  const items=(plan.items||[]).map(planItemShape),sets=items.reduce((n,item)=>n+(item.lines||[]).reduce((s,line)=>s+(line.reps||[]).length,0),0);
  return `<span class="pw-plan-totals"><strong>${sets} ${sets===1?'set':'sets'}</strong><small>${items.length} ${items.length===1?'exercise':'exercises'}</small></span>`;
}
function pwPlanHeading(label,plan){
  return `<span class="pw-future-label"><span>${hesc(label)}</span><strong>${hesc(pwParts(pwRead(planText(plan))).join(' + ')||'Your workout')}</strong></span>${pwPlanTotals(plan)}`;
}
/* v4.6.95: THE NEXT WORKOUT IS PINNED; EVERYTHING BEHIND IT FOLDS. v4.6.94
   pinned tomorrow as well, which double-pinned it: when today is unplanned or
   already done, tomorrow is ALREADY the headline card, and a second copy of
   the rule kept a day on screen that the card above it was about. The list
   this builds never contains the headline day, so the whole list is the
   fold -- one lid, on exactly the days you are not about to train.
   It starts open, so nothing vanishes from a screen that had it yesterday;
   shut it once and it stays shut. */
function pwLaterDayHTML(d){
  return `<details class="pw-later-day" data-pw-fold="later:${d}" ${pwFoldOpen('later:'+d)?'open':''}><summary>${pwPlanHeading((d===tomorrowISO()?'Tomorrow · ':'')+pwDate(d),pwSaved(d))}</summary>${planCardHTML(pwSaved(d),false)}<div class="pw-actions pw-future-actions pw-later-actions" role="group" aria-label="Actions for ${hesc(pwDate(d))} plan">${pwAction('open-date','Edit','edit','',`data-date="${d}"`)}${pwAction('paste-open','Paste','paste','',`data-date="${d}"`)}</div></details>`;
}
function pwWeekdays(dates){return dates.map(d=>new Date(d+'T12:00').toLocaleDateString('en-US',{weekday:'short'})).join(' · ');}
function pwLaterPlans(html,dates){
  if(!dates.length)return html;
  const t=document.createElement('template');t.innerHTML=html;
  const card=t.content.querySelector('.pw-saved,.pw-home-card');if(!card)return html;
  const group=document.createElement('div');group.className='pw-plan-group';card.before(group);group.append(card);
  group.insertAdjacentHTML('beforeend',`<details class="pw-later pw-later-visible" data-pw-fold="later" ${pwFoldOpen('later',true)?'open':''}><summary class="pw-later-heading"><span>${dates.length} more ${dates.length===1?'plan':'plans'}</span><small>${hesc(pwWeekdays(dates))}</small></summary><div class="pw-later-list">${dates.map(pwLaterDayHTML).join('')}</div></details>`);
  return t.innerHTML;
}
function pwTodayHTML(){
  const s=pw(),closed=dayClosed(),now=planNow();
  const future=[...new Set([...(DB.plan?.d>todayISO?[DB.plan.d]:[]),...Object.keys(DB.week?.days||{}).filter(d=>d>todayISO)])].filter(d=>pwSaved(d)?.items?.length).sort();
  // Display selection is independent of whether today's workout is closed.
  // Every saved future date is rendered exactly once, including tomorrow.
  const hasToday=!!now&&!closed,next=future[0],upcoming=next?pwSaved(next):null;
  const started=hasToday&&!!(DB.days[todayISO]?.w||[]).length;
  const pushing=hasToday&&!started&&planShiftable(planRunFrom(todayISO),1).ok,showNext=!!upcoming&&!pushing&&!started;
  const count=future.length+(hasToday?1:0),target=next||writeDateISO();
  let html=`<section class="pw-home"><div class="pw-home-heading"><h2>${closed?'Plan ahead':'Your plan'}</h2>${pwDatesButton()}</div><div class="pw-home-tools" role="group" aria-label="Plan actions">${pwAction('open','Plan','sparkle')}${pwAction('paste-open','Paste','paste','',`data-date="${target}"`)}${count?`<span>${count} planned ${count===1?'day':'days'}</span>`:''}</div>`;
  if(hasToday)html+=`<details class="pw-saved" data-pw-fold="today" ${pwFoldOpen('today')?'open':''}><summary>${pwPlanHeading('Today · '+pwDate(todayISO),now)}</summary>${planCardHTML(now,true)}<div class="pw-actions pw-future-actions">${pwAction('open-date','Edit','edit','',`data-date="${todayISO}"`)}${pwAction('paste-open','Paste','paste','',`data-date="${todayISO}"`)}</div></details>`;
  /* v4.6.101: the day you can't do, on the day you can't do it. One line
     under today's plan, only while nothing has been logged -- once a set is
     down the day is not movable, and the line would be a lie. */
  if(pushing)html+=`<button type="button" class="pw-push" data-pw="plan-push-ask"><span>Can’t train today?</span><b>Push the week ${icon('chevron',ICON_SZ.sm)}</b></button>`;
  /* v4.6.137: ONCE TODAY HAS STARTED, TOMORROW FOLDS. With today's plan on
     screen and a set already logged, the day being trained is the headline and
     the next plan is only "what's after" -- it lives in the "N more plans" fold
     with the rest, not as a second card under today's (it used to appear in
     both). Before the first set nothing changes. Every future plan is still
     shown exactly once: in this card, or in the fold, never both. */
  else if(showNext){const key='future:'+next;html+=`<details class="pw-saved pw-future" data-pw-fold="${key}" ${pwFoldOpen(key)?'open':''}><summary>${pwPlanHeading((next===tomorrowISO()?'Tomorrow · ':'')+pwDate(next),upcoming)}</summary>${planCardHTML(upcoming,false)}<div class="pw-actions pw-future-actions">${pwAction('open-date','Edit','edit','',`data-date="${next}"`)}${pwAction('paste-open','Paste','paste','',`data-date="${next}"`)}</div></details>`;}
  else if(!upcoming)html+='<div class="card pw-home-card pw-home-empty"><h3>Plan your next workout</h3><p class="pw-small">Choose dates or paste a routine to get started.</p></div>';
  const drafts=s.dates.filter(d=>d>=todayISO&&s.book[d]&&s.book[d].source!=='Saved plan'&&(s.book[d].rows.length||s.book[d].parts.length));
  if(drafts.length)html+=pwAction('resume','Resume draft','edit','pw-resume');
  html=pwLaterPlans(html+'</section>',showNext?future.filter(d=>d!==next):future);
  if(restingToday()){
    const t=document.createElement('template');t.innerHTML=html;
    const home=t.content.querySelector('.pw-home'),tools=home.querySelector('.pw-home-tools');
    const heading=home.querySelector('.pw-home-heading');
    heading.querySelector('h2').textContent=hasToday?'Your saved plan':upcoming?'Looking ahead':'Your plan';
    tools.querySelector(':scope > span')?.remove();
    tools.insertAdjacentHTML('beforeend',pwDatesButton());home.append(tools);
    heading.querySelector('button')?.remove();
    const later=home.querySelector('.pw-later');
    if(later){
      const fold=document.createElement('details');fold.className='pw-rest-later';
      fold.dataset.pwFold='rest-later';fold.open=pwFoldOpen('rest-later');
      const summary=document.createElement('summary');
      summary.innerHTML=later.querySelector('.pw-later-heading').innerHTML;
      fold.append(summary,later.querySelector('.pw-later-list'));later.replaceWith(fold);
    }
    html=t.innerHTML;
  }
  return pwFoldMarkup(html);
}
function pwCalendarHTML(){
  const s=pw(),base=new Date((s.month||(s.active||todayISO).slice(0,7)+'-01')+'T12:00');base.setDate(1);
  const start=new Date(base);start.setDate(1-base.getDay());
  const count=Math.ceil((base.getDay()+new Date(base.getFullYear(),base.getMonth()+1,0).getDate())/7)*7;
  return `<div class="card pw-calendar-panel"><div class="pw-month">${pwButton('month',icon('chevron',ICON_SZ.sm,180),'pw-icon','data-delta="-1" aria-label="Previous month"')}<strong>${base.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong>${pwButton('month',icon('chevron',ICON_SZ.sm),'pw-icon','data-delta="1" aria-label="Next month"')}</div><div class="pw-calendar">${['S','M','T','W','T','F','S'].map(x=>`<span class="pw-weekday">${x}</span>`).join('')}${Array.from({length:count},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);const iso=pwISO(d);
    /* v4.0.3: A DATE THAT ALREADY HAS A PLAN SAYS SO. The calendar showed only
       which dates were selected, so the one thing you open it to find out --
       where have I already planned? -- was the one thing it would not tell
       you. A saved plan gets a solid mark; a draft you have not saved yet gets
       a hollow one, because those are different promises. The mark carries in
       the aria-label too: a dot is not readable to a screen reader. */
    const sv=pwSaved(iso);
    const saved=!!sv&&(sv.items||[]).length>0;
    /* a draft is a book entry the maker has worked on -- one seeded FROM a
       saved plan is not a draft, it is that plan, and source says which */
    const bk=s.book[iso];
    const draft=!saved&&!!bk&&bk.source!=='Saved plan'&&(bk.rows||[]).length>0;
    /* v4.0.4: THE MARK IS A RING, NOT A DOT. v4.0.3 hung a 5px dot under the
       number, five pixels off the cell's floor -- crowding the baseline and
       reading as a speck rather than a state. A ring adds NOTHING to the cell:
       the selected day is already a filled rounded square, so a hollow one is
       the obvious "planned, not chosen" of the same shape, and selected-and-
       planned collapses into one mark instead of stacking two.
       It is a class on the button, not an element inside it, so nothing sits
       beside the number competing for the 40px. */
    const what=saved?', has a plan':draft?', has an unsaved draft':'';
    return pwButton('date',String(d.getDate()),`${s.dates.includes(iso)?'selected':''} ${d.getMonth()!==base.getMonth()?'pw-outside':''} ${saved?'pw-planned':draft?'pw-drafted':''}`,`data-date="${iso}" aria-label="${hesc(pwDate(iso,true))}${what}" aria-pressed="${s.dates.includes(iso)}" ${iso<todayISO?'disabled':''}`);}).join('')}</div><p class="pw-small">Up to 7 days · ${s.dates.length} selected</p></div>`;
}
function pwRender(){
  const s=pw();
  if(['dates','focus','review'].includes(s.step)){s.datesOpen=s.step==='dates';s.setupOpen=s.step==='focus';s.step='edit';}
  if(!s.active&&s.dates.length)s.active=s.dates[0];
  const day=s.active?pwDay(s.active):null,entering=pwPaintedStep===null;pwPaintedStep=s.step;
  const panel=['paste','editrow','adjust','candidate','busy'].includes(s.step),hasRows=!!day?.rows.length;
  let html=`<section class="pw-workspace pw-step-edit pw-single ${entering?'pw-enter':''}" aria-label="Planning workspace"><div class="pw-editor-head"><button type="button" class="icobtn pw-back" data-pw="back" aria-label="Back">←</button><h1>${hasRows?'Edit your plan':'Build your plan'}</h1>${hasRows&&!panel?pwAction('clear-day','Clear','clear','pw-text pw-clear'):'<span class="pw-small">Draft</span>'}</div>`;
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
    footer=pwButton('dates-cancel','Cancel')+pwButton('dates-edit','Edit','primary',s.dates.length?'':'disabled');
  }else if(s.step==='busy'){
    html+=writerWaitHTML().replace('data-writecancel','data-pw="cancel"').replace('data-what="the week"',`data-what="${s.task==='adjust'?'the set adjustment':'your plan'}"`);
  }else if(s.step==='paste'||s.step==='editrow'){
    const editing=s.step==='editrow';
    html+=`<div class="card pw-card pw-input-panel"><h3>${editing?(s.editIndex===day.rows.length?'Add exercise':'Edit exercise'):(s.editAll?'Edit routine':'Paste routine')}</h3><div class="pw-text-tools">${pwAction('text-select','Select All','selectall','pw-text')}${pwAction('text-copy','Copy','copy','pw-text')}${pwAction('text-paste','Paste','paste','pw-text')}</div>${editing?`<label class="pw-sr-only" for="pw-exercise">Exercise name</label><select id="pw-exercise" data-pw-field="exercise">${['<Keep typed name>',...Object.values(SEED.catalog).flat()].map(x=>`<option value="${hesc(x)}" ${s.exercise===x?'selected':''}>${hesc(x)}</option>`).join('')}</select>`:''}<label class="pw-sr-only" for="pw-routine">Routine text</label><textarea id="pw-routine" class="pw-routine" data-pw-field="pasteText" rows="7" spellcheck="false" placeholder="Squat&#10;135 lb × 8&#10;225 lb × 6 6 6">${hesc(s.pasteText||'')}</textarea></div>`;
    footer=pwButton('edit','Cancel')+pwButton('readpaste','Preview','primary');
  }else if(s.step==='adjust'){
    if(!s.adjustBase||s.adjustDate!==s.active)pwBeginAdjust();
    const skip=s.adjustSkip||[],limits=pwSetLimits(s.adjustBase,skip),total=pwCounts(s.adjustRows).total;
    html+=`<div class="card pw-card pw-adjust"><span class="pw-small">Total sets</span><div class="pw-stepper">${pwButton('set-minus','−','','aria-label="Remove one set"'+(total<=limits.min?' disabled':''))}<output aria-live="polite">${total}</output>${pwButton('set-plus','+','','aria-label="Add one set"'+(total>=limits.max?' disabled':''))}</div><p class="pw-small">More sets add an exercise once each is full.</p></div><div class="card pw-card pw-live-routine"><div class="pw-card-heading"><strong>Your routine</strong><span class="pw-small">Updates live</span></div><div id="pw-live-rows">${pwRowsHTML(s.adjustRows,false,true)}</div>${pwButton('add-open','<b aria-hidden="true">+</b>Add exercise','pw-add-ex')}</div>${s.addOpen?pwAddSheetHTML(s):''}`;
    footer=`<span class="pw-save-scope" id="pw-live-total" role="status">${total} sets · ${pwDate(s.active)}</span>`+pwButton('adjust-cancel','Cancel')+pwButton('adjust-keep','Keep changes','primary');
  }else if(s.step==='candidate'&&s.candidate){
    const c=s.candidate;
    html+='<h2 class="pw-preview-label">Preview changes</h2>';
    /* v4.5.26: the preview shows the PLAN, not the writer's reasoning. Every note for
       the whole week was printed under every day -- twenty-odd lines of "held at X,
       reps up Y - a push" repeated per card, burying the four exercises they were
       meant to explain. The notes are still kept, and still reachable under Checks
       on the day itself, where they belong to one day and can be read on purpose. */
    for(const [d,b]of Object.entries(c.days)){
      const n=pwSetCount(b.rows);
      html+=`<div class="card pw-card"><div class="pw-card-heading"><strong>${hesc(pwDate(d))}</strong>${n?`<span class="pw-setcount">${n} ${n===1?'set':'sets'}</span>`:''}</div>${pwRowsHTML(b.rows)}</div>`;
    }
    footer=pwButton(c.type==='paste'?'paste-back':'edit','Back')+(c.type==='paste'&&c.index===undefined?pwButton('apply-add','Add'):'')+pwButton('apply',c.type==='paste'?(c.index!==undefined?'Keep edit':'Replace'):'Use draft','primary');
  }else if(day){
/* v4.1.1: EDIT THE WHOLE DAY, NOT ONE ROW AT A TIME. The pencil on a row
   opens that row; there was no way to open the day. Paste was the nearest
   thing and it clears the box, so using it to change one weight meant retyping
   the routine. Edit opens the same box with the day already in it.
   Only when there are rows: an empty day has nothing to edit, and Paste is
   already the way in. */
if(hasRows||day.cleared)html+=`<div class="pw-actions pw-edit-actions">${pwAction('rewrite','Plan','sparkle')}${pwAction('paste','Paste','paste')}${hasRows?pwAction('edit-all','Edit','edit'):''}${hasRows?pwButton('adjust','Adjust sets'):''}${hasRows&&day.undo?pwButton('undo','Undo','pw-text'):''}</div>`;
    if(hasRows)html+=`<div class="card pw-card">${pwRowsHTML(day.rows,true)}</div>`;
    html+=`<div class="pw-actions">${pwButton('add','+ Exercise','pw-text')}${!hasRows&&day.undo?pwButton('undo','Undo','pw-text'):''}</div>`;
    if(day.cleared&&!hasRows)html+='<p class="pw-small">Routine cleared. Save to apply, or Undo to restore.</p>';
    if(day.notes?.length)html+=`<details class="pw-preferences"><summary>Checks · ${day.notes.length}</summary>${day.notes.map(n=>`<p class="pw-small">${hesc(n)}</p>`).join('')}</details>`;
    const empty=s.dates.filter(d=>!pwDay(d).rows.length&&!pwDay(d).cleared).length;
    footer=hasRows||day.cleared?`<span class="pw-save-scope">${empty?`${empty} ${empty===1?'day needs':'days need'} a routine`:s.dates.map(d=>(pwDay(d).cleared&&!pwDay(d).rows.length?'Clear ':'')+new Date(d+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})).join(' · ')}</span>`+pwButton('save',s.dates.length>1?`Save ${s.dates.length} days`:'Save plan','primary',empty||s.conflict?'disabled':''):pwAction('paste','Paste','paste')+pwAction('generate','Plan','sparkle','primary');
  }
  html+=`<span id="pw-reorder-help" class="pw-sr-only">Hold and drag to reorder. Or use the up and down arrow keys.</span><span id="pw-reorder-status" class="pw-sr-only" role="status"></span>${footer?`<div class="pw-save-dock">${footer}</div>`:''}</section>`;
  $('#view').innerHTML=pwFoldMarkup(html);if(entering)window.scrollTo(0,0);requestAnimationFrame(pwPositionDock);
}

/* Instant count editing: proportional to the original prescription, not a
   new AI workout. Never changes loads/reps, warm-ups, locked rows or cardio. */
/* v4.6.156: MORE SETS BECOME ANOTHER EXERCISE. Each exercise is "full" at the
   number of working sets you actually do for it (pwTypicalSets); + fills the
   plan's exercises up to that point, then adds the next exercise for the day's
   body parts -- the one you did most recently that is not already in the plan
   (pwAddCandidates) -- with your last weight and reps, marked "added". The
   added rows are computed from the plan and the target, never stored in it, so
   - takes them away again before it trims anything you planned. Rows you pick
   yourself (Add exercise) join the plan as ordinary rows marked "new". */
const PW_SETS_FALLBACK=3;   /* no history: ACSM 2026 puts strength work at 2-3 sets an exercise */
function pwTypicalSets(ex){
  const h=SEED.exSets?.[ex];if(!h||!h.length)return PW_SETS_FALLBACK;
  const c={};h.forEach(n=>c[n]=(c[n]||0)+1);
  return +Object.keys(c).sort((a,b)=>c[b]-c[a]||b-a)[0];   /* most common; a tie goes to the larger */
}
function pwDayParts(day){return (day.parts&&day.parts.length?day.parts:pwParts(day.rows)).filter(p=>p!=='Run');}
/* your last session of an exercise as a plan line: the working sets at their top load */
function pwLastLine(ex,n){
  const ls=SEED.lastSess?.[ex];if(!ls)return null;
  const sets=ls.rows.filter(r=>(r[1]||[]).length);if(!sets.length)return null;
  const top=Math.max(0,...sets.map(r=>r[0]||0)),work=sets.filter(r=>(r[0]||0)>=top*0.8),reps=work.flatMap(r=>r[1]);
  const w=Math.max(0,...work.map(r=>r[0]||0)),body=typeof isBody==='function'&&isBody(ex);
  const load=body?(w>0?`BW +${trainListWeight(w)} ${U()}`:'BW'):`${trainListWeight(w)} ${U()}`;
  const count=n||reps.length;
  return {load,reps:Array.from({length:count},(_,i)=>reps[Math.min(i,reps.length-1)])};
}
function pwExerciseRow(ex,n,mark){
  const l=pwLastLine(ex,n);if(!l)return null;
  const r=pwRead(`${ex}\n  ${l.load} × ${l.reps.join(' ')}`)[0];
  if(!r||r.kind!=='ex')return null;r.added=mark;return r;
}
/* the exercises you have done for these parts, most recent first */
function pwDoneFor(parts){
  return Object.keys(SEED.exLast||{}).filter(ex=>parts.includes(homePartOf(ex))&&homePartOf(ex)!=='Run'&&SEED.lastSess?.[ex])
    .sort((a,b)=>SEED.exLast[b].localeCompare(SEED.exLast[a])||a.localeCompare(b));
}
function pwAddCandidates(day,skip=[]){
  const have=new Set((day.rows||[]).map(r=>r.ex));
  /* v4.6.173: what the app adds on its own skips what you avoid */
  return pwDoneFor(pwDayParts(day)).filter(ex=>!have.has(ex)&&!skip.includes(ex)&&pwLastLine(ex)&&!(typeof isAvoided==='function'&&isAvoided(ex)));
}
function pwSetLimits(day,skip=[]){
  const slots=[],rowN={};
  day.rows.forEach((r,i)=>{if(r.kind!=='ex'||day.locks.includes(i)||homePartOf(r.ex)==='Run')return;
    (r.lines||[]).forEach((l,k)=>{if(l.reps?.length&&!/warm/i.test((l.qual||'')+(l.tag||''))){slots.push({i,k,n:l.reps.length});rowN[i]=(rowN[i]||0)+l.reps.length;}});});
  const caps={};for(const i of Object.keys(rowN))caps[i]=Math.max(pwTypicalSets(day.rows[i].ex),rowN[i]);
  const total=pwCounts(day.rows).total,fixed=total-slots.reduce((a,x)=>a+x.n,0);
  const full=fixed+Object.values(caps).reduce((a,n)=>a+n,0);
  const extra=pwAddCandidates(day,skip).reduce((a,ex)=>a+pwTypicalSets(ex),0);
  /* nothing left to add (no history, or every past exercise is in): the plan's
     own exercises take the rest, as before v4.6.156, up to 12 a line -- the
     app fits the ask rather than refusing it */
  const over=slots.reduce((a,x)=>a+Math.max(12,x.n),0)-(full-fixed);
  return {slots,caps,full,extra,min:fixed+slots.length,max:Math.max(total,Math.min(100,full+extra+Math.max(0,over)))};
}
function pwAllocateSets(base,target,skip=[]){
  const {slots,caps,full,extra,min,max}=pwSetLimits(base,skip),rows=pwCopy(base.rows),total=pwCounts(rows).total;
  target=Math.max(min,Math.min(max,target));
  const counts=slots.map(x=>x.n),rowCount=i=>slots.reduce((a,x,j)=>a+(x.i===i?counts[j]:0),0);
  if(target<total){
    for(let left=total-target;left>0;left--){
      const choices=slots.map((x,j)=>({x,j})).filter(({j})=>counts[j]>1);
      choices.sort((a,b)=>(counts[b.j]/b.x.n-counts[a.j]/a.x.n)||(b.j-a.j));
      if(!choices.length)break;counts[choices[0].j]--;
    }
  }else{
    /* fill each exercise toward its own full point, the emptiest first */
    for(let left=Math.min(target,full)-total;left>0;left--){
      const choices=slots.map((x,j)=>({x,j})).filter(({x})=>rowCount(x.i)<caps[x.i]);
      choices.sort((a,b)=>(rowCount(a.x.i)/caps[a.x.i]-rowCount(b.x.i)/caps[b.x.i])||(a.j-b.j));
      if(!choices.length)break;counts[choices[0].j]++;
    }
    /* past every exercise AND every candidate: the old spread, 12 a line at most */
    for(let left=target-Math.max(total,full)-extra;left>0;left--){
      const choices=slots.map((x,j)=>({x,j})).filter(({x,j})=>counts[j]<Math.max(12,x.n));
      choices.sort((a,b)=>(counts[a.j]/a.x.n-counts[b.j]/b.x.n)||(a.j-b.j));
      if(!choices.length)break;counts[choices[0].j]++;
    }
  }
  slots.forEach((x,j)=>{const original=base.rows[x.i].lines[x.k].reps;rows[x.i].lines[x.k].reps=Array.from({length:counts[j]},(_,i)=>original[Math.min(i,original.length-1)]);});
  /* past full: whole exercises, most recent first, each up to its own full point */
  let left=target-Math.max(total,full);
  for(const ex of pwAddCandidates(base,skip)){
    if(left<=0)break;const n=Math.min(left,pwTypicalSets(ex)),r=pwExerciseRow(ex,n,'added');
    if(r){rows.push(r);left-=pwCounts([r]).total;}
  }
  return rows;
}
const PW_MAG='<svg class="pw-add-mag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>';
const PW_ADD_MAX=8;
/* every strength exercise the app knows: the catalog and your own */
function pwAllExercises(){
  const seen=new Set(),out=[];
  for(const [p,list] of Object.entries(SEED.catalog||{}))if(p!=='Run')for(const ex of list)if(!seen.has(ex)&&!(typeof isCardioEx==='function'&&isCardioEx(ex))){seen.add(ex);out.push(ex);}
  for(const ex of Object.keys(customs()))if(!seen.has(ex)&&!(typeof isCardioEx==='function'&&isCardioEx(ex))){seen.add(ex);out.push(ex);}
  for(const ex of Object.keys(SEED.exLast||{}))if(!seen.has(ex)&&homePartOf(ex)&&homePartOf(ex)!=='Run'&&!(typeof isCardioEx==='function'&&isCardioEx(ex))){seen.add(ex);out.push(ex);}
  return out;
}
/* The order a person expects: what you have done before what you have not;
   within each, the day's own body parts first, then a name that STARTS with
   what you typed, then the most recent (yours) or the alphabet (not tried).
   Avoided exercises sink to the end of their group. */
function pwAddSearch(q,day,inPlan=new Set()){
  const toks=canonKey(q).split(' ').filter(Boolean),own=new Set(pwDayParts(day));
  const hit=ex=>{const n=canonKey(ex);return toks.every(t=>n.includes(t));};
  const starts=ex=>{const n=canonKey(ex),t=toks[0]||'';return n.startsWith(t)?0:n.split(' ').some(w=>w.startsWith(t))?1:2;};
  const av=ex=>typeof isAvoided==='function'&&isAvoided(ex)?1:0,done=ex=>!!(SEED.lastSess?.[ex]&&pwLastLine(ex));
  /* ...and within the day's parts, what you can still add before what is already in the plan */
  const all=pwAllExercises().filter(hit),key=ex=>[av(ex),own.has(homePartOf(ex))?0:1,inPlan.has(ex)?1:0,starts(ex)];
  const cmp=(a,b,tie)=>{const x=key(a),y=key(b);for(let i=0;i<4;i++)if(x[i]!==y[i])return x[i]-y[i];return tie(a,b);};
  const mine=all.filter(done).sort((a,b)=>cmp(a,b,(a,b)=>(SEED.exLast[b]||'').localeCompare(SEED.exLast[a]||'')||a.localeCompare(b)));
  const fresh=all.filter(ex=>!done(ex)).sort((a,b)=>cmp(a,b,(a,b)=>a.localeCompare(b)));
  return {mine,fresh,exact:all.some(ex=>canonKey(ex)===canonKey(q))};
}
const pwTitleCase=str=>String(str).trim().replace(/\s+/g,' ').replace(/(^|[\s-])([a-z])/g,(m,a,c)=>a+c.toUpperCase());
function pwAddResultsHTML(s,q,day,inPlan){
  const {mine,fresh,exact}=pwAddSearch(q,day,inPlan),toks=canonKey(q).split(' ').filter(Boolean);
  const mark=name=>{let h=hesc(name);for(const t of toks)if(t)h=h.replace(new RegExp('('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')(?![^<]*>)','i'),'<mark>$1</mark>');return h;};
  const short=d=>new Date(d+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const pill=ex=>`<span class="pw-add-part">${hesc(partLabel(homePartOf(ex)||''))}</span>`;
  const tag=ex=>typeof isAvoided==='function'&&isAvoided(ex)?`<span class="xp-tag">${XP_ICON}avoided</span>`:'';
  const dim=ex=>typeof isAvoided==='function'&&isAvoided(ex)?' xp-dim':'';
  const nMine=Math.min(mine.length,Math.max(PW_ADD_MAX-Math.min(fresh.length,2),PW_ADD_MAX-fresh.length)),nFresh=Math.min(fresh.length,PW_ADD_MAX-nMine);
  const day0=new Date(s.active+'T12:00').toLocaleDateString('en-US',{weekday:'long'});
  let h='';
  if(nMine){h+=`<div class="pw-add-h">Yours · ${hesc(day0)}’s body parts first</div>`+mine.slice(0,nMine).map(ex=>{const l=pwLastLine(ex),on=inPlan.has(ex);
    return `<button type="button" class="pw-add-pick${dim(ex)}" data-pw="add-pick" data-ex="${hesc(ex)}" ${on?'disabled':''}><span><strong>${mark(ex)}</strong><small>${pill(ex)}${on?'In this plan':hesc(l.load+' × '+l.reps.join(' '))}${tag(ex)}</small></span><i>${on?'':short(SEED.exLast[ex])}</i></button>`;}).join('');}
  if(nFresh){h+=`<div class="pw-add-h">Not tried yet</div>`+fresh.slice(0,nFresh).map(ex=>{const on=inPlan.has(ex);
    return `<button type="button" class="pw-add-pick${dim(ex)}" data-pw="add-new" data-ex="${hesc(ex)}" data-part="${hesc(homePartOf(ex)||'')}" ${on?'disabled':''}><span><strong>${mark(ex)}</strong><small>${pill(ex)}${on?'In this plan':'starts by feel'}${tag(ex)}</small></span><i></i></button>`;}).join('');}
  const more=mine.length+fresh.length-nMine-nFresh;
  if(more>0)h+=`<p class="pw-small pw-add-more">${more} more · keep typing to narrow</p>`;
  /* a name the app does not know: yours to add, with its body part */
  const name=pwTitleCase(q),none=!mine.length&&!fresh.length;
  if(!exact&&name.length>=2&&(none||s.addNewOpen)){
    const parts=Object.keys(SEED.catalog||{}).filter(p=>p!=='Run'),pick=parts.includes(s.addNewPart)?s.addNewPart:(pwDayParts(day)[0]||parts[0]);
    h+=`${none?'<div class="pw-add-h">No match</div>':''}<div class="pw-add-new"><strong>Add “${hesc(name)}”</strong><small>A new exercise of yours. Starts by feel × 10 10 10; set the weight in the plan.</small><div class="pw-add-newparts" role="group" aria-label="Body part">${parts.map(p=>`<button type="button" data-add-newpart="${hesc(p)}" aria-pressed="${p===pick}" class="${p===pick?'on':''}">${hesc(partLabel(p))}</button>`).join('')}</div>${pwButton('add-new','Add to '+hesc(day0),'primary pw-add-go',`data-ex="${hesc(name)}" data-part="${hesc(pick)}" data-new="1"`)}</div>`;
  }else if(!exact&&name.length>=4&&!none){
    h+=`<button type="button" class="pw-add-pick pw-add-asnew" data-add-newopen><span><strong>Add “${hesc(name)}” as a new exercise</strong><small>if none of these is it</small></span><i></i></button>`;
  }
  return `<div class="pw-add-list pw-add-results">${h}</div>`;
}
/* v4.6.156: Add exercise. One body part at a time, the day's own first; within
   it every exercise you have done, most recent first, with its last working
   sets and the day you did them. Already in the plan: shown, not pickable. */
function pwAddSheetHTML(s,bodyOnly){
  /* v4.6.157: one sheet for both screens -- Total sets ('adjust') and the Edit
     page ('edit', which also offers typing an exercise you have not logged) */
  const edit=s.addCtx==='edit',day=edit?pwDay(s.active):s.adjustBase,now=edit?day.rows:s.adjustRows;
  const q=String(s.addQ||'').trim();
  const own=pwDayParts(day),done=p=>pwDoneFor([p]).length>0;
  const parts=[...own,...Object.keys(SEED.catalog).filter(p=>p!=='Run'&&!own.includes(p)&&done(p))];
  const part=parts.includes(s.addPart)?s.addPart:parts[0];
  const inPlan=new Set(now.map(r=>r.ex)),short=d=>new Date(d+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  /* v4.6.174: an avoided exercise is still yours to pick here -- you asked --
     but it sinks to the bottom and says so */
  const av=ex=>typeof isAvoided==='function'&&isAvoided(ex),ordered=part?[...pwDoneFor([part]).filter(ex=>!av(ex)),...pwDoneFor([part]).filter(av)]:[];
  const list=ordered.map(ex=>{const l=pwLastLine(ex),on=inPlan.has(ex),a=av(ex);
    return `<button type="button" class="pw-add-pick${a?' xp-dim':''}" data-pw="add-pick" data-ex="${hesc(ex)}" ${on?'disabled':''}><span><strong>${hesc(ex)}</strong><small>${on?'In this plan':hesc(l.load+' × '+l.reps.join(' '))}${a?`<span class="xp-tag">${XP_ICON}avoided</span>`:''}</small></span><i>${on?'':short(SEED.exLast[ex])}</i></button>`;}).join('');
  const browse=`<p class="pw-small">Or browse by body part · most recent first</p><div class="pw-add-parts" role="tablist">${parts.map(p=>`<button type="button" role="tab" data-pw="add-part" data-part="${hesc(p)}" aria-selected="${p===part}" class="${p===part?'on':''}">${hesc(typeof partLabel==='function'?partLabel(p):p)}</button>`).join('')}</div><div class="pw-add-list">${list||'<p class="pw-small">Nothing logged for this body part yet.</p>'}</div>`;
  if(bodyOnly) return q?pwAddResultsHTML(s,q,day,inPlan):browse;
  /* v4.6.181: SEARCH, IN THE SHEET. Typing an exercise used to leave for the
     paste-a-routine screen: a native menu of the whole catalog in catalog
     order, a text box expecting the paste format, then a Preview. The name is
     typed here now, results are yours-first, and one tap adds. */
  return `<div class="pw-add-scrim" data-pw="add-close"></div><div class="pw-add-sheet${q?' pw-add-tall':''}" role="dialog" aria-modal="true" aria-labelledby="pw-add-title"><div class="pw-add-grab" aria-hidden="true"></div><div class="pw-add-head"><h3 id="pw-add-title">Add to ${hesc(new Date(s.active+'T12:00').toLocaleDateString('en-US',{weekday:'long'}))}</h3>${pwButton('add-close','×','pw-add-close','aria-label="Close without adding"')}</div><label class="pw-add-search">${PW_MAG}<input id="pw-add-q" type="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" placeholder="Search or type an exercise" aria-label="Search or type an exercise" value="${hesc(s.addQ||'')}"><button type="button" class="pw-add-clear" data-add-clear aria-label="Clear the search"${q?'':' hidden'}>×</button></label><div class="pw-add-body">${q?pwAddResultsHTML(s,q,day,inPlan):browse}</div></div>`;
}
/* v4.6.158: Escape closes the sheet, like its × and the scrim */
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const s=typeof pw==='function'?pw():null;if(!s||!s.addOpen)return;s.addOpen=false;pwPersist();pwRender();});
/* v4.6.159: an exercise you add is a change you made, not a request to the
   writer. Its body part joins the day's parts (a Sixpack exercise on a Back
   day made the parts read as changed, "Regenerate to rebuild this day"), and
   no set target is left pending -- a stale one kept Save disabled. */
function pwAddedToDay(b){
  b.target=null;
  if(b.partsPick&&b.parts){const have=pwParts(b.rows).filter(p=>p!=='Run'||b.parts.includes('Run'));b.parts=[...new Set([...b.parts,...have])];}
}
function pwBeginAdjust(){const s=pw();s.adjustSkip=[];s.addOpen=false;s.adjustDate=s.active;s.adjustBase=pwCopy(pwDay(s.active));s.adjustRows=pwCopy(s.adjustBase.rows);}
function pwAdjustLive(delta){
  const s=pw();if(s.step!=='adjust'||s.adjustDate!==s.active)return;
  const skip=s.adjustSkip||[],total=pwCounts(s.adjustRows).total,limits=pwSetLimits(s.adjustBase,skip);
  s.adjustRows=pwAllocateSets(s.adjustBase,total+delta,skip);const n=pwCounts(s.adjustRows).total;
  document.querySelector('.pw-stepper output').textContent=n;
  document.querySelector('[data-pw="set-minus"]').disabled=n<=limits.min;
  document.querySelector('[data-pw="set-plus"]').disabled=n>=limits.max;
  document.getElementById('pw-live-rows').innerHTML=pwRowsHTML(s.adjustRows,false,true);
  document.getElementById('pw-live-total').textContent=n+' sets · '+pwDate(s.active);
  pwPersist();
}
/* Native details semantics plus interruptible height animation in both directions.
   All planning disclosures use the same icon, including nested saved routines. */
function pwFoldMarkup(html){
  const t=document.createElement('template');t.innerHTML=html;
  t.content.querySelectorAll('details').forEach(d=>{
    const summary=d.querySelector(':scope > summary');if(!summary)return;
    summary.classList.add('pw-fold-summary');summary.setAttribute('aria-expanded',String(d.open));
    if(!summary.querySelector(':scope > .ic'))summary.insertAdjacentHTML('beforeend',icon('chevron',ICON_SZ.sm));
  });return t.innerHTML;
}
document.addEventListener('click',e=>{
  const summary=e.target.closest('summary.pw-fold-summary');if(!summary||!summary.closest('.pw-home,.pw-workspace,.today-focus'))return;
  e.preventDefault();if(summary.closest('fieldset:disabled'))return;
  const d=summary.parentElement,open=d._pwTarget===undefined?!d.open:!d._pwTarget;
  const start=d.getBoundingClientRect().height;d._pwAnimation?.cancel();d._pwTarget=open;
  d.open=true;summary.setAttribute('aria-expanded',String(open));
  const full=d.getBoundingClientRect().height;
  d.open=false;const shut=d.getBoundingClientRect().height;d.open=true;
  [...d.children].filter(x=>x!==summary).forEach(x=>x.inert=!open);
  /* v4.0.5: ANY DISCLOSURE THAT NAMES ITSELF IS REMEMBERED. This hook already
     persisted one fold -- the editor's body-parts panel, by a hard-coded check
     for data-pw-setup -- so every other disclosure reopened shut on the next
     render. Today's plan was the one the maker met: expand it, tap an exercise,
     come back, and it had forgotten. A fold now keeps its state whenever it
     carries data-pw-fold, so the next one added inherits the memory instead of
     needing a third branch here. */
  const finish=()=>{if(!d.isConnected)return;d.open=open;d.style.overflow='';delete d._pwTarget;d._pwAnimation=null;
    const key=d.getAttribute('data-pw-fold');
    if(key){const st=pw();(st.folds=st.folds||{})[key]=open;pwPersist();}
    if(d.hasAttribute('data-pw-setup')){pw().setupOpen=open;pwPersist();}};
  if(!d.animate||matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
  d.style.overflow='hidden';d._pwAnimation=d.animate([{height:start+'px'},{height:(open?full:shut)+'px'}],{duration:280,easing:'cubic-bezier(.22,.68,0,1)'});
  d._pwAnimation.onfinish=finish;
},true);

function pwPositionDock(){const dock=document.querySelector('.pw-save-dock'),nav=document.getElementById('nav'),live=document.getElementById('liveWorkoutBar');const anchor=live&&!live.hidden?live:nav;if(dock&&anchor)dock.style.bottom=Math.max(78,innerHeight-anchor.getBoundingClientRect().top+8)+'px';const rail=document.querySelector('.pw-days'),selected=rail?.querySelector('.selected');if(selected){const r=rail.getBoundingClientRect(),b=selected.getBoundingClientRect();if(b.left<r.left)rail.scrollLeft-=r.left-b.left;else if(b.right>r.right)rail.scrollLeft+=b.right-r.right;}if(typeof syncTopBtn==='function')syncTopBtn();}
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
    dst.cleared=false;dst.parts=pwParts(dst.rows);delete dst.partsPick;dst.source=c.type==='paste'?'Your routine · not rewritten':c.type==='adjust'?'Writer-adjusted set count':'Written from your training';dst.notes=b.notes||[];
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
  const dates=adjust||rewrite?[s.active]:(typeof pfOn==='function'&&pfOn()?s.dates.slice():s.dates.filter(d=>!pwDay(d).rows.length));
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
      /* v4.5.26: notes belong to the day whose exercise they describe. Handing every
         day the whole week's list meant the Checks disclosure on Tuesday listed
         Saturday's squats, and "Use draft" then saved that copy to all seven days.
         Each note names its exercise before the colon, which is what assigns it. */
      for(const r of chk.rows){if(r.kind==='day'){date=r.iso;days[date]={rows:[],notes:[]};}else if(date)days[date].rows.push(r);}
      for(const doc of Object.values(days)){
        const mine=new Set(doc.rows.map(r=>r.ex).filter(Boolean));
        doc.notes=(chk.notes||[]).filter(n=>mine.has(String(n).split(':')[0].trim()));
      }
      if(!Object.keys(days).length)throw Error('No readable days came back. Your draft is unchanged.');
      /* v4.6.147: an exercise you kept fixed that the writer changed is put back as you had it; the rest of its answer stands */
      for(const [d,doc] of Object.entries(days))for(const i of pwDay(d).locks)if(pwText([pwDay(d).rows[i]])!==pwText([doc.rows[i]||{}])){doc.rows[i]=pwCopy(pwDay(d).rows[i]);(doc.notes=doc.notes||[]).push(pwDay(d).rows[i].ex+': kept as you fixed it.');}
      candidate={type:'generate',days,reason:chk.reason};
    }
    if(cancelled())return;if(typeof pfValidateCandidate==='function'&&pfOn())pfValidateCandidate(candidate,dates);s.candidate=candidate;s.step='candidate';s.busy=false;pwPersist();if(typeof pfOn==='function'&&pfOn()){const miss=candidate.missing||[];pwApply();if(miss.length)toast(miss.map(d=>pfShort(d)).join(', ')+(miss.length===1?' did':' did')+' not come back from the writer. Tap Plan again for '+(miss.length===1?'it.':'them.'));return;}if(view==='today'&&lift.plan==='workspace')pwRender();
  }catch(e){if(cancelled())return;s.busy=false;s.step=adjust?'adjust':'edit';s.error=e.refused?`Could not use that answer: ${e.refused}. Nothing saved.`:e.message||'Could not write. Your draft is unchanged.';pwPersist();if(view==='today'&&lift.plan==='workspace')pwRender();}
}
function pwSave(){
  const s=pw();
  for(const d of s.dates){if(d<todayISO)throw Error('A draft date has passed. Choose a current or future date.');const b=pwDay(d);if(!b.rows.length&&!b.cleared)throw Error(`${pwDate(d)} is still empty. Add a routine or remove that date.`);if(b.base!==pwFingerprint(d)){s.conflict=d;throw Error(`${pwDate(d)} changed since you opened it, possibly on another device. Compare the newer plan below before saving. Your draft is safe.`);}}
  // Merge ONLY reviewed dates; unlike weekSave, preserve all other blocks and
  // a separately saved today/tomorrow plan. Existing timestamps drive cloud sync.
  const days=pwCopy(DB.week?.days||{}),at=Date.now();
  for(const d of s.dates){const b=pwDay(d);if(b.cleared&&!b.rows.length){delete days[d];if(DB.plan?.d===d){DB.plan=null;DB.planAt=at;}continue;}const doc={...planItemsFrom(b.rows),raw:pwText(b.rows),title:pwParts(b.rows).join(' + ')};days[d]=doc;if(DB.plan?.d===d){DB.plan={d,...doc};DB.planAt=at;}}
  const all=Object.keys(days).sort();DB.week=all.length?{from:all[0],to:all[all.length-1],days,raw:'',at}:null;DB.weekAt=at;planRailRefresh();save(true);
  for(const d of s.dates){const b=pwDay(d);b.base=pwFingerprint(d);b.source='Saved plan';delete b.undo;}
  s.step='edit';pwPersist();lift.plan=null;view='today';toast('Plan saved');render({soft:true});
}

/* v4.6.101: the Push sheet. The same bottom sheet the day's finish uses, with
   the one thing you need before saying yes: where each day lands, and what
   was there. Nothing is regenerated; the plans keep their contents. */
function planPushSheet(){
  if(document.getElementById('planMoveDialog'))return;
  const run=planRunFrom(todayISO),plan=planShiftable(run,1);if(!plan.ok)return;
  const label=d=>{const p=pwSaved(d);return p?hesc(pwParts(pwRead(planText(p))).join(' + ')||'Plan'):'';};
  const short=d=>{const x=new Date(d+'T12:00');return x.toLocaleDateString('en-US',{weekday:'short'})+' '+x.getDate();};
  const leaving=new Set(plan.moves.map(m=>m.from));
  const rows=plan.moves.map(({from,to})=>{const was=leaving.has(to)?'was '+label(to):pwSaved(to)?.items?.length?'replaces '+label(to):'free';
    return `<li><span class="pm-from">${short(from)} \u00b7 ${label(from)}</span><span class="pm-to"><span class="pm-arrow" aria-hidden="true">\u2192</span> ${short(to)}<small class="${was==='free'?'pm-free':was.startsWith('replaces')?'pm-warn':''}">${was}</small></span></li>`;}).join('');
  const n=plan.moves.length;
  const d=document.createElement('dialog');d.id='planMoveDialog';d.setAttribute('aria-labelledby','planMoveTitle');
  d.innerHTML=`<div class="workout-finish-handle" aria-hidden="true"></div><h2 id="planMoveTitle">Push the week by a day</h2><p>${n} planned ${n===1?'day moves':'days move'}. Nothing is regenerated.</p><ul class="pm-map">${rows}</ul>${plan.replaces.length?'<p class="pm-note">'+plan.replaces.map(short).join(', ')+' already '+(plan.replaces.length===1?'has a plan; it will be replaced.':'have plans; they will be replaced.')+'</p>':''}<div class="pw-actions pm-actions">${pwButton('plan-push-close','Not now')}${pwButton('plan-push-go','Push '+n+(n===1?' day':' days'),'primary')}</div>`;
  const leave=()=>d.remove();
  d.addEventListener('cancel',e=>{e.preventDefault();leave();});
  d.addEventListener('click',e=>{if(e.target===d)leave();});
  document.body.appendChild(d);d.showModal();d.querySelector('[data-pw="plan-push-go"]').focus({preventScroll:true});
}
function pwHandle(e){
  const el=e.target.closest('[data-pw]');if(!el)return false;
  const a=el.dataset.pw,s=pw(),d=el.dataset.date,i=Number(el.dataset.index),b=s.active?pwDay(s.active):null;
  try{
    if(a==='set-minus'||a==='set-plus'){pwAdjustLive(a==='set-plus'?1:-1);return true;}
    if(a==='back'){
      /* v4.0.3: from the calendar, Back goes where the calendar was opened
         from. It used to close the panel and leave you in the editor -- a
         screen the maker had not asked to see. */
      if(s.datesOpen&&s.datesFrom!=='edit'){s.datesOpen=false;s.step='edit';pwPersist();lift.plan=null;view='today';render({soft:true});return true;}
      if(s.step!=='edit'||s.datesOpen){pwRequest++;lift.writeAbort?.abort();writerWaitStop();s.busy=false;s.candidate=null;s.datesOpen=false;pwGo('edit');}else{pwPersist();lift.plan=null;view='today';render({soft:true});}return true;}
    if(a.startsWith('text-')){pwTextTool(a);return true;}
    if(a==='upcoming'){s.upcomingOpen=!s.upcomingOpen;const box=el.closest('.pw-coming');el.setAttribute('aria-expanded',String(s.upcomingOpen));box.classList.toggle('is-open',s.upcomingOpen);box.querySelector('.pw-fold').toggleAttribute('inert',!s.upcomingOpen);pwPersist();return true;}
    if(a==='mode'){pwRequest++;if(s.busy)lift.writeAbort?.abort();s.busy=false;localStorage.setItem(PW_MODE_KEY,el.dataset.mode);lift.plan=null;render({inplace:true});return true;}
    /* v4.0.3: the calendar remembers where it was opened FROM, so Back and
       Cancel return there rather than always landing in the editor. From
       Today's "Dates >" that is Today; from the editor's datebar it is the
       editor. "Where we came from" is the rule, not a fixed destination. */
    if(a==='plan-push-ask'){planPushSheet();return true;}
    if(a==='plan-push-go'){const r=planShift(planRunFrom(todayISO),1);document.getElementById('planMoveDialog')?.remove();if(r.ok){render({soft:true});toastUndo('Moved '+r.moves.length+(r.moves.length===1?' day':' days'),()=>{r.undo();render({soft:true});});}return true;}
    if(a==='plan-push-close'){document.getElementById('planMoveDialog')?.remove();return true;}
    if(a==='open'||a==='resume'){if(a==='open')pw().datesFrom='today';pwOpen(null,a==='open'?'dates':undefined);return true;}
    if(a==='open-date'||a==='paste-open'){
      /* v4.1.5: A CLEAR THAT WAS NEVER SAVED IS NOT THE RECORD.
         Reproduced: clear a day in the editor, leave without saving, and the
         book keeps {rows:[], cleared:true} for that date. Today goes on
         showing the routine because it reads DB.plan; the editor shows nothing
         because pwDay() seeds from the saved plan ONLY when there is no book
         entry at all. So tapping Edit under a visible routine opened an empty
         day -- two surfaces answering the same question from two sources.
         Entering the editor from a date therefore drops an abandoned clear and
         lets the day re-seed from what is actually saved. Only when it is
         EMPTY: a cleared draft with no rows has nothing in it to lose, so
         this cannot discard work. A draft with rows is left alone and is still
         reached by Resume draft, which is what that button is for.
         Deliberately not inside pwDay(): re-seeding there would undo Clear
         while the maker is still looking at "Save to apply, or Undo". */
      const stale=s.book[d];
      if(stale&&stale.cleared&&!stale.rows.length&&pwSaved(d)) delete s.book[d];
      pwOpen(d);if(a==='paste-open'){s.pasteText='';s.editIndex=undefined;s.editAll=false;pwGo('paste');}return true;}
    if(a==='close'){pwRequest++;if(s.busy)lift.writeAbort?.abort();s.busy=false;if(s.step==='busy')s.step='edit';pwPersist();lift.plan=null;view='today';render({soft:true});return true;}
    if(a==='dates-toggle'){s.datesOpen=!s.datesOpen;if(s.datesOpen)s.datesFrom='edit';s.step='edit';}
    /* v4.0.3: Done became Cancel + Edit. "Done" read as "I have finished
       choosing" and then dropped you into the day's routine, which is a
       different screen from the one you asked for -- Edit says that plainly,
       and Cancel is the way out that did not exist. */
    else if(a==='dates-edit'){s.datesOpen=false;s.step='edit';}
    else if(a==='dates-cancel'){s.datesOpen=false;s.step='edit';
      if(s.datesFrom!=='edit'){pwPersist();lift.plan=null;view='today';render({soft:true});return true;}}
    else if(a==='goal'){s.objective=el.dataset.goal;}
    else if(a==='month'){const m=new Date((s.month||todayISO.slice(0,7)+'-01')+'T12:00');m.setMonth(m.getMonth()+Number(el.dataset.delta));s.month=pwISO(m);}
    else if(a==='date'){if(s.dates.includes(d))s.dates=s.dates.filter(x=>x!==d);else if(s.dates.length<7){s.dates.push(d);s.dates.sort();pwDay(d);}else throw Error('Choose up to seven days in one draft.');if(!s.dates.includes(s.active))s.active=s.dates[0]||null;}
    else if(a==='part'){const x=pwDay(d),p=el.dataset.part;x.parts=x.parts.includes(p)?x.parts.filter(v=>v!==p):[...x.parts,p];}
    else if(a==='day'){s.active=d;s.step='edit';}
    else if(a==='workspace')s.step='edit';
    else if(['dates','focus','edit','review','adjust'].includes(a)){s.step=a;s.error='';if(a==='adjust')pwBeginAdjust();}
    else if(a==='adjust-cancel'){s.adjustBase=null;s.adjustRows=null;s.addOpen=false;s.step='edit';}
    /* v4.6.156: Add exercise -- a pick joins the plan being adjusted (base and
       live rows), so +/- treat it like any planned exercise */
    else if(a==='add-open'){s.addOpen=true;s.addPart=null;s.addQ='';s.addNewOpen=false;s.addNewPart=null;s.addCtx=el.dataset.ctx==='edit'?'edit':'adjust';}
    else if(a==='add-close'){s.addOpen=false;s.addQ='';s.addNewOpen=false;}
    /* v4.6.181: an exercise with no history of yours -- from the catalog, or a
       name you just typed (which becomes one of your own, under the body part
       you chose). It starts by feel; the weight is set in the plan row. */
    else if(a==='add-new'){
      const ex=el.dataset.ex,part=el.dataset.part||pwDayParts(s.addCtx==='edit'?b:s.adjustBase)[0]||'Chest';
      if(el.dataset.new&&!pwAllExercises().some(x=>canonKey(x)===canonKey(ex))){DB.settings.custom={...customs(),[ex]:{part,equip:'barbell'}};DB.settingsAt=Date.now();save(true);}
      const r=pwRead(`${ex}\n  by feel × 10 10 10`)[0];
      if(r&&r.kind==='ex'&&r.ex){
        if(s.addCtx==='edit'&&b){pwUndoPoint(b);b.rows.push(r);b.source='Your draft';pwAddedToDay(b);}
        else if(s.adjustBase){r.added='new';s.adjustBase.rows.push(pwCopy(r));s.adjustRows.push(r);s.adjustSkip=(s.adjustSkip||[]).filter(x=>x!==r.ex);}
      }
      s.addOpen=false;s.addQ='';s.addNewOpen=false;
    }
    else if(a==='add-part'){s.addPart=el.dataset.part;}
    else if(a==='add-pick'&&s.addCtx==='edit'){const r=pwExerciseRow(el.dataset.ex,pwTypicalSets(el.dataset.ex));if(r&&b){delete r.added;pwUndoPoint(b);b.rows.push(r);b.source='Your draft';pwAddedToDay(b);}s.addOpen=false;s.addQ='';}
    else if(a==='add-pick'){const r=pwExerciseRow(el.dataset.ex,pwTypicalSets(el.dataset.ex),'new');if(r){s.adjustBase.rows.push(pwCopy(r));s.adjustRows.push(r);s.adjustSkip=(s.adjustSkip||[]).filter(x=>x!==r.ex);}s.addOpen=false;s.addQ='';}
    else if(a==='add-remove'){const r=s.adjustRows[i];if(r){
      if(r.added==='new'){const k=s.adjustBase.rows.findIndex(x=>x.added==='new'&&x.ex===r.ex);if(k>=0)s.adjustBase.rows.splice(k,1);s.adjustRows.splice(i,1);}
      else{s.adjustSkip=[...(s.adjustSkip||[]),r.ex];s.adjustRows=pwAllocateSets(s.adjustBase,pwCounts(s.adjustRows).total-pwCounts([r]).total,s.adjustSkip);}}}
    else if(a==='adjust-keep'){if(s.adjustDate!==s.active)throw Error('Open Adjust sets for this day again.');pwUndoPoint(b);b.rows=pwCopy(s.adjustRows).map(r=>{delete r.added;return r;});b.source='Adjusted set count';pwAddedToDay(b);s.adjustBase=null;s.adjustRows=null;s.addOpen=false;s.step='edit';}
    else if(a==='clear-day'){pwUndoPoint(b);b.rows=[];b.locks=[];b.notes=[];b.target=null;b.cleared=true;b.source='Your draft';s.setupOpen=false;}
    else if(a==='paste'){s.pasteText='';s.editIndex=undefined;s.editAll=false;s.step='paste';}
    /* the day's own text, in the box that already knows how to parse it --
       editIndex stays undefined so Replace swaps the whole routine, which is
       what editing a day means */
    else if(a==='edit-all'){s.pasteText=pwText(b.rows);s.editIndex=undefined;s.editAll=true;s.step='paste';}
    else if(a==='editrow'||a==='add'){s.addOpen=false;s.editIndex=a==='add'?b.rows.length:i;s.pasteText=a==='add'?'':pwText([b.rows[i]]);s.exercise='<Keep typed name>';s.step='editrow';}
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

/* v4.6.181: the Add sheet's search updates IN PLACE. A full pwRender() on each
   keystroke would rebuild the input under the cursor (focus and the keyboard
   gone). Only the results under the box are replaced; the sheet stands tall
   while you search so the box and the first results clear the keyboard. */
function pwAddRefresh(){
  const s=pw(),sh=document.querySelector('.pw-add-sheet'),body=sh&&sh.querySelector('.pw-add-body');if(!body)return;
  const q=String(s.addQ||'').trim(),inp=sh.querySelector('#pw-add-q');
  body.innerHTML=pwAddSheetHTML(s,true);
  sh.classList.toggle('pw-add-tall',!!q||document.activeElement===inp);
  const clr=sh.querySelector('.pw-add-clear');if(clr)clr.hidden=!q;
}
document.addEventListener('input',e=>{if(e.target.id!=='pw-add-q')return;const s=pw();s.addQ=e.target.value;s.addNewOpen=false;pwAddRefresh();const sh=e.target.closest('.pw-add-sheet');if(sh)sh.scrollTop=0;});
document.addEventListener('focusin',e=>{if(e.target.id==='pw-add-q')e.target.closest('.pw-add-sheet')?.classList.add('pw-add-tall');});
document.addEventListener('focusout',e=>{if(e.target.id==='pw-add-q'&&!String(pw().addQ||'').trim())setTimeout(()=>{const sh=document.querySelector('.pw-add-sheet');if(sh&&document.activeElement?.id!=='pw-add-q'&&!String(pw().addQ||'').trim())sh.classList.remove('pw-add-tall');},120);});
document.addEventListener('click',e=>{
  const t=e.target.closest&&e.target.closest('[data-add-clear],[data-add-newpart],[data-add-newopen]');if(!t)return;
  const s=pw();
  if(t.hasAttribute('data-add-clear')){s.addQ='';s.addNewOpen=false;const i=document.getElementById('pw-add-q');if(i){i.value='';i.focus();}}
  else if(t.hasAttribute('data-add-newpart'))s.addNewPart=t.dataset.addNewpart;
  else s.addNewOpen=true;
  pwAddRefresh();
});
document.addEventListener('keydown',e=>{if(e.key!=='Enter'||e.target.id!=='pw-add-q')return;e.preventDefault();const first=document.querySelector('.pw-add-results .pw-add-pick:not([disabled]):not(.pw-add-asnew), .pw-add-results .pw-add-go');if(first)first.click();});
/* the keyboard's height, so the tall sheet ends where the keyboard begins */
if(window.visualViewport){const kb=()=>document.documentElement.style.setProperty('--kb',Math.max(0,Math.round(innerHeight-visualViewport.height-visualViewport.offsetTop))+'px');visualViewport.addEventListener('resize',kb);visualViewport.addEventListener('scroll',kb);}
