/* Stage 1: accepted-plan provenance, not an adherence score.
   No retroactive matching. Saving plans never creates workout records.
   Revisions are append-only; each new log carries its original set target.
   Stored in the existing account document, with no external AI calls. */
const plCopy=x=>JSON.parse(JSON.stringify(x));
const plId=()=>globalThis.crypto?.randomUUID?.()||('pl-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
function plExerciseId(ex){
  const key=canonKey(ex);
  for(const [id,e] of Object.entries(DB.settings.canon||{}))
    if(canonKey(e.name)===key||(e.al||[]).some(a=>canonKey(a)===key))return id;
  return canonSlug(ex);
}
function plStable(x){
  if(Array.isArray(x))return '['+x.map(plStable).join(',')+']';
  if(x&&typeof x==='object')return '{'+Object.keys(x).sort().filter(k=>x[k]!==undefined).map(k=>JSON.stringify(k)+':'+plStable(x[k])).join(',')+'}';
  return JSON.stringify(x);
}
function plDocument(d){
  return (DB.plan?.d===d?DB.plan:DB.week?.days?.[d])||null;
}
function plContent(doc){
  if(!doc)return null;
  return {items:plCopy((doc.items||[]).map(planItemShape)),note:doc.note||'',raw:doc.raw||'',title:doc.title||''};
}
function plTargets(content,id){
  const targets=[];
  for(const [ei,item] of (content?.items||[]).entries()){
    if(item.ex==='Run')continue; // distance/time is not a strength-set prescription
    for(const [li,line] of (item.lines||[]).entries())for(const [ri,reps] of (line.reps||[]).entries()){
      targets.push({id:id+':'+ei+':'+li+':'+ri,ex:item.ex,exerciseId:plExerciseId(item.ex),
        w:+line.w||0,reps:+reps,su:line.su||'',bw:!!line.bw,nw:!!line.nw,est:!!line.est,
        qualifier:line.qual||line.tag||line.note||'',ordinal:targets.filter(t=>t.ex===item.ex).length+1});
    }
  }
  return targets;
}
function plCapture(){
  const docs={...(DB.week?.days||{})};
  if(DB.plan?.d)docs[DB.plan.d]=DB.plan;
  if(!Object.keys(docs).length&&!DB.planTracking)return;
  const state=DB.planTracking||(DB.planTracking={v:1,revisions:{},heads:{}});
  state.revisions=state.revisions||{};state.heads=state.heads||{};
  for(const d of new Set([...Object.keys(docs),...Object.keys(state.heads)])){
    const content=plContent(docs[d]),fingerprint=plStable(content),prev=state.heads[d];
    if(prev?.fingerprint===fingerprint)continue;
    const at=Math.max(Date.now(),(prev?.at||0)+1);
    let id=null;
    if(content){
      id=plId();
      state.revisions[id]={id,date:d,parentId:prev?.revisionId||null,acceptedAt:at,
        source:'saved-plan',content,targets:plTargets(content,id)};
    }
    state.heads[d]={revisionId:id,at,fingerprint};
  }
}
function plMerge(remote){
  if(!remote?.planTracking)return;
  const local=DB.planTracking||(DB.planTracking={v:1,revisions:{},heads:{}});
  // Immutable records union by ID, independent of which current plan wins.
  local.revisions={...(remote.planTracking.revisions||{}),...(local.revisions||{})};
  local.heads=local.heads||{};
  for(const [d,h] of Object.entries(remote.planTracking.heads||{})){
    const l=local.heads[d];
    if(!l||h.at>l.at||(h.at===l.at&&String(h.revisionId)>String(l.revisionId)))local.heads[d]=plCopy(h);
  }
}
function plMergeDayMetadata(target,other){
  // A legacy device may return the same rows without additive metadata.
  // Restore it only for identical facts, never guess links for edited rows.
  if(!target||!other)return;
  if(!Object.prototype.hasOwnProperty.call(target,'planBasis')&&other.planBasis)
    target.planBasis=plCopy(other.planBasis);
  const rows=new Map((other.w||[]).filter(s=>s.at!=null).map(s=>[sig(s),s]));
  for(const row of target.w||[]){
    const old=row.at!=null?rows.get(sig(row)):null;
    if(!old)continue;
    for(const key of ['setId','planRef','previousPlanRef','planLinkStatus'])if(row[key]===undefined&&old[key]!==undefined)row[key]=plCopy(old[key]);
  }
}
function plCurrent(d){
  const content=plContent(plDocument(d));
  if(!content)return null;
  const state=DB.planTracking,head=state?.heads?.[d];
  if(head?.fingerprint===plStable(content)&&state.revisions?.[head.revisionId])return state.revisions[head.revisionId];
  // Read-only preview for pre-upgrade plans; real IDs are minted at save/log.
  return {id:null,date:d,content,targets:plTargets(content,'preview')};
}
function plBasis(d){
  const day=DB.days?.[d];
  return day&&Object.prototype.hasOwnProperty.call(day,'planBasis')?day.planBasis.revision:plCurrent(d);
}
function plSameExercise(target,ex){
  return target.ex===ex||target.exerciseId===plExerciseId(ex);
}
function plActual(d,targetId){
  return (DB.days?.[d]?.w||[]).filter(s=>s.planRef?.setId===targetId);
}
function plChoice(ex,su=''){
  const basis=plBasis(todayISO),targets=(basis?.targets||[]).filter(t=>plSameExercise(t,ex)&&isHold(t.su)===isHold(su));
  const key=todayISO+'|'+ex+'|'+plStable(basis?.content||null),choice=lift.linkChoice;
  const available=targets.filter(t=>!plActual(todayISO,t.id).length);
  if(choice?.key===key){
    if(choice.slot===-1)return {target:null,key,targets};
    const chosen=available.find(t=>t.ordinal===choice.slot);
    if(chosen)return {target:chosen,key,targets,method:'explicit'};
  }
  return {target:available[0]||null,key,targets,method:'next-in-order'};
}
function plLog(set){
  plCapture();
  const day=DB.days[todayISO]||(DB.days[todayISO]={w:[]});
  // Pin even a null plan: a plan saved later must not rewrite this workout.
  if(!Object.prototype.hasOwnProperty.call(day,'planBasis'))
    day.planBasis={startedAt:set.at||Date.now(),revision:plCopy(plCurrent(todayISO))};
  const choice=set.ex==='Run'?null:plChoice(set.ex,set.su),target=choice?.target;
  set.setId=plId();
  if(target)set.planRef={revisionId:day.planBasis.revision.id,setId:target.id,target:plCopy(target),method:choice.method};
  else set.planLinkStatus=set.ex==='Run'?'unlinked-run':'unplanned';
  /* v4.6.10: LOGGING TODAY MOVES THE REVIEW TO TODAY. The review card keeps the
     day you last looked at (reviewSelected), and that choice beat everything --
     including today gaining its very first set. So the card sat on Friday while
     you were mid-workout on Monday, and the volume chart kept Friday's column
     highlighted. Cleared only when this set is the day's FIRST: browsing back to
     an older day mid-session must still stick, and a second set must not yank
     the view away from a day you deliberately opened. */
  /* v4.6.10: the day's FIRST set is a fact worth announcing. stats-story keeps the
     review selection inside its own IIFE, so this cannot reach in and move it --
     and should not: logging records, the review layer decides what to show. */
  const first=!day.w.length;
  day.w.push(set);
  if(first)try{document.dispatchEvent(new CustomEvent('showup:first-set',{detail:{date:todayISO}}));}catch(_e){}
  delete lift.linkChoice;
  return set;
}
function plTargetText(t){
  const weight=Math.round(toU(t.w)).toLocaleString('en-US');
  const load=t.nw?'By feel':t.bw?(t.w?'BW + '+weight+' '+U():'BW'):(t.est?'≈':'')+weight+' '+U();
  return load+' × '+t.reps+(isHold(t.su)?' sec':'');
}
function plSplitEditedSet(day,row){
  // New linked logs are one set per row. Adding comma-separated entries in
  // the existing editor creates extras, never multiple actuals for one ID.
  if(!row.setId||(row.reps||[]).length<2)return;
  const extra=row.reps.slice(1),index=day.w.indexOf(row),at=Date.now();
  row.reps=row.reps.slice(0,1);
  day.w.splice(index+1,0,...extra.map((reps,i)=>({part:row.part,ex:row.ex,w:row.w,
    reps:[reps],...(row.su?{su:row.su}:{}),at:at+i,setId:plId(),planLinkStatus:'unplanned'})));
}
function plMovedSet(row,ex,part){
  const moved={...plCopy(row),ex,part};
  if(moved.planRef&&!plSameExercise(moved.planRef.target,ex)){
    moved.previousPlanRef=moved.planRef;delete moved.planRef;
    moved.planLinkStatus='moved-exercise';
  }
  return moved;
}
function plActualText(s){
  const weight=Math.round(toU(s.w)).toLocaleString('en-US');
  const bw=s.planRef?.target?.bw,load=bw?(s.w?'BW + '+weight+' '+U():'BW'):weight+' '+U();
  return load+' × '+(s.reps||[]).join(', ')+(isHold(s.su)?' sec':'');
}
function plHTML(ex){
  const basis=plBasis(todayISO),targets=(basis?.targets||[]).filter(t=>plSameExercise(t,ex));
  if(!targets.length)return '';
  const choice=plChoice(ex,DB.settings.unitOv?.[ex]||''),selected=choice.target;
  const frozen=Object.prototype.hasOwnProperty.call(DB.days?.[todayISO]||{},'planBasis');
  const changed=frozen&&plStable(basis.content)!==plStable(plCurrent(todayISO)?.content||null);
  const old=(DB.days?.[todayISO]?.w||[]).filter(s=>s.ex===ex&&!s.planRef).length;
  return `<section class="zone mini plan-link" aria-label="Planned and logged sets">
    <div class="lasthead"><span>Planned · Logged</span><span class="ago">${frozen?'Started plan':'Saved plan'}</span></div>
    ${changed?'<p class="pl-context">Plan edited since you started. These targets stay with this workout.</p>':''}
    <div class="pl-next">${selected
      ? /* v4.6.11: the Next line IS the target, so it is tappable. Selecting a set
           loaded its weight and reps all along -- but only from inside the collapsed
           "View targets & results". The one planned set you can actually see was the
           one you could not tap, so the obvious gesture did nothing and the values
           had to be dialled by hand. Same handler, same data-link-slot; it just
           stops being a span. */
        `<button type="button" class="pl-next-target" data-link-slot="${selected.ordinal}" aria-pressed="${true}">Next: set ${selected.ordinal} · ${hesc(plTargetText(selected))}</button>`
      : `<span>Next: extra set</span>`}
      <button type="button" class="pl-extra" data-link-slot="-1" aria-pressed="${!selected}">Extra set</button></div>
    <details class="pl-details"><summary><span>View targets &amp; results</span>${icon('chevron',ICON_SZ.sm)}</summary>
    <div class="pl-columns" aria-hidden="true"><span>Set</span><span>Planned</span><span>Logged</span></div>
    ${targets.map(t=>{const actual=plActual(todayISO,t.id);return `<button type="button" class="pl-result" data-link-slot="${t.ordinal}" ${actual.length?'disabled':''} aria-pressed="${selected?.id===t.id}">
      <span>${t.ordinal}</span><span>${hesc(plTargetText(t))}${t.qualifier?'<small>'+hesc(t.qualifier)+'</small>':''}</span>
      <span>${actual.length?actual.map(s=>hesc(plActualText(s))).join(' / '):'—'}</span></button>`;}).join('')}
    ${old?'<p class="pl-context">'+old+' logged '+(old===1?'entry':'entries')+' without a plan link.</p>':''}
    <p class="pl-context">Tap an unlogged target to choose it. Extra sets stay separate.</p></details></section>`;
}
function plHandle(e){
  const button=e.target.closest('[data-link-slot]');
  if(!button)return false;
  const choice=plChoice(lift.ex,unitOf(lift.ex));
  lift.linkChoice={key:choice.key,slot:+button.dataset.linkSlot};
  const target=choice.targets.find(t=>t.ordinal===+button.dataset.linkSlot);
  if(target){
    if(!target.nw){lift.weight=target.w;saveExW(lift.ex,target.w);}
    lift.rep=target.reps;
  }
  renderLift();
  if(target&&typeof repRulerBand==='function')repRulerBand(target.reps);
  return true;
}

// Presentation only: immutable plan IDs, never weight-matching or retroactive links.
function plDisplayPlan(ex){
  const current=plBasis(todayISO);
  if(current?.targets?.some(t=>plSameExercise(t,ex)))return current;
  const dates=[...new Set([DB.plan?.d,...Object.keys(DB.week?.days||{})])].filter(d=>d>=todayISO).sort();
  for(const d of dates){const plan=plCurrent(d);if(plan?.targets?.some(t=>plSameExercise(t,ex)))return plan;}
  return null;
}
function plSessionRows(ex,last,today){
  const displayPlan=plDisplayPlan(ex),preview=!!displayPlan&&!(plBasis(todayISO)?.targets||[]).some(t=>plSameExercise(t,ex));
  const targets=(displayPlan?.targets||[]).filter(t=>plSameExercise(t,ex)).map(t=>preview?{...t,preview:true}:t);
  const history=(last?.sets||[]).flatMap(s=>(s[1]||[]).map(r=>({w:s[0],r,su:s[4]||''})));
  const actual=today.flatMap((s,index)=>(s.reps||[]).map((r,ri)=>({w:s.w,r,su:s.su||'',source:s,index,ri})));
  const used=new Set(),rows=targets.map((t,i)=>{
    const matches=t.preview?[]:actual.filter(a=>a.source.planRef?.setId===t.id);
    matches.forEach(a=>used.add(a));
    return {label:String(t.ordinal),target:t,last:history[i]||null,actual:matches};
  });
  if(!targets.length){
    for(let i=0;i<Math.max(history.length,actual.length);i++)rows.push({label:String(i+1),last:history[i]||null,actual:actual[i]?[actual[i]]:[]});
  }else actual.filter(a=>!used.has(a)).forEach(a=>rows.push({label:'+',last:null,actual:[a],unlinked:true}));
  // Older sessions can contain more sets than today's plan. Keep them visible.
  if(targets.length)history.slice(targets.length).forEach((s,i)=>rows.push({label:String(targets.length+i+1),last:s,actual:[]}));
  return {targets,history,actual,rows,displayPlan,preview};
}
function plSetOutcome(ex,a,last,target){
  // More load with fewer reps is not a win. BW/assistance, holds, estimates,
  // by-feel and warm-ups do not have a reliable like-for-like benchmark here.
  const ordinary=!isBody(ex)&&!isHold(a.su)&&a.w>0&&a.r>0;
  const comparable=b=>ordinary&&b&&b.w>0&&!isHold(b.su)&&!b.bw&&!b.nw&&!b.est&&!/warm|prep/i.test(b.qualifier||'');
  const beats=b=>comparable(b)&&a.w>=b.w&&a.r>=(b.r??b.reps)&&(a.w>b.w||a.r>(b.r??b.reps));
  const bl=beats(last)&&!target?.qualifier, bp=beats(target);
  const met=comparable(target)&&Math.abs(a.w-target.w)<.00001&&a.r===target.reps;
  return {label:bl&&bp?'Beat both':bl?'Beat last':bp?'Above plan':met?'On target':'Set done',win:!!(bl||bp)};
}
const plWarm=t=>/warm[ -]?up|^prep$/i.test(t?.qualifier||'');
const plWarmMark=t=>plWarm(t)?'<span class="sc-warm-mark" aria-label="Planned warm-up">W</span>':'';
function plSessionGroups(rows){
  const shape=s=>s?[s.w,s.su||'',!!s.bw,!!s.nw,!!s.est,s.qualifier||'']:null,groups=[];
  for(const row of rows){
    const key=JSON.stringify([shape(row.last),shape(row.target),row.actual.map(shape),!!row.unlinked]);
    const prev=groups.at(-1);
    // Consecutive only: returning to a weight later remains a separate group.
    if(prev&&prev.key===key&&row.actual.length<=1)prev.rows.push(row);
    else groups.push({key,rows:[row]});
  }
  return groups;
}
function plCompactBody(ex,groups,hasLast,hasPlan,choice,latest,fresh){
  const cell=(sets,kind,attrs)=>{
    if(!sets.length)return '<span class="sc-empty">—</span>';
    if(sets[0].preview)attrs='disabled aria-label="Future plan target"';
    const s=sets[0],load=s.nw?'By feel':s.bw?(s.w?'BW + '+wDisp(s.w):'BW'):wLabel(ex,s.w);
    return `<button type="button" class="sc-value sc-group-value ${kind}" ${attrs}><span class="sc-weight">${hesc((s.est?'≈':'')+load)}<span class="sc-times"> ×</span></span><span class="sc-reps">${sets.map(s=>`<span class="sc-rep${isHold(s.su)?' hold':''}${fresh&&s===latest?' sc-chip-fresh':''}">${hesc(String(setNum(s.r??s.reps,s.su)))}</span>`).join('')}</span></button>`;
  };
  return groups.map(({rows})=>{
    const first=rows[0],last=rows.at(-1),past=rows.map(r=>r.last).filter(Boolean),targets=rows.map(r=>r.target).filter(Boolean),actual=rows.flatMap(r=>r.actual);
    const available=rows.find(r=>r.target&&!r.actual.length)?.target;
    const label=rows.length>1&&first.label!=='+'?first.label+'–'+last.label:first.label;
    const selected=targets.some(t=>t.id===choice.target?.id);
    const latestRow=rows.find(r=>r.actual.includes(latest)),outcome=latestRow?plSetOutcome(ex,latest,latestRow.last,latestRow.target):null;
    return `<tr><th scope="row">${label}${plWarmMark(first.target)}</th>${hasLast?`<td>${cell(past,'sc-history',past.length?`data-sc-load="${past[0].w}" aria-label="Load last-session weight for sets ${label}"`:'')}</td>`:''}${hasPlan?`<td>${targets.length?cell(targets,'sc-plan',`data-link-slot="${(selected?choice.target:available||targets[0]).ordinal}" ${available?'':'disabled'} aria-pressed="${selected}" aria-label="Select next unlogged target in sets ${label}; use Details to choose an individual set"`):'<span class="sc-empty">'+(first.unlinked?'Unlinked':'—')+'</span>'}${first.target?.qualifier&&!plWarm(first.target)?'<small class="sc-qual">'+hesc(first.target.qualifier)+'</small>':''}</td>`:''}<td>${cell(actual,'sc-now',actual.length?`data-sc-load="${actual[0].w}" aria-label="Load logged weight for sets ${label}"`:'')}${outcome?`<span class="sc-compact-result">${outcome.win?icon('sparkle',ICON_SZ.sm):'✓'} ${outcome.label}</span>`:''}</td></tr>`;
  }).join('');
}
function plSessionHTML(ex,last,today){
  const data=plSessionRows(ex,last,today),{targets,history,actual,rows,displayPlan,preview}=data;
  const hasLast=history.length>0,hasPlan=targets.length>0,choice=plChoice(ex,unitOf(ex));
  const basis=plBasis(todayISO),frozen=Object.prototype.hasOwnProperty.call(DB.days?.[todayISO]||{},'planBasis');
  const changed=frozen&&basis&&plStable(basis.content)!==plStable(plCurrent(todayISO)?.content||null);
  const latest=actual.at(-1),fresh=!!lift.justSaved&&!!latest;
  const text=(s,target=false)=>target?plTargetText(s):wLabel(ex,s.w)+' × '+setNum(s.r,s.su);
  const value=(s,kind,attrs='')=>{
    if(s.preview)attrs='disabled aria-label="Future plan target"';
    const r=s.r??s.reps,load=s.nw?'By feel':s.bw?(s.w?'BW + '+wDisp(s.w):'BW'):wLabel(ex,s.w);
    return `<button type="button" class="sc-value ${kind}" ${attrs}><span class="sc-weight">${hesc((s.est?'≈':'')+load)}</span><span class="sc-times">×</span><span class="sc-rep${isHold(s.su)?' hold':''}">${hesc(String(setNum(r,s.su)))}</span></button>`;
  };
  let latestOutcome=null;
  const body=rows.map(row=>{
    const t=row.target,pending=t&&!t.preview&&!row.actual.length;
    const past=row.last?value(row.last,'sc-history',`data-sc-load="${row.last.w}" aria-label="Load last session weight ${hesc(text(row.last))}"`):'<span class="sc-empty">—</span>';
    const target=t?value(t,'sc-plan',`data-link-slot="${t.ordinal}" ${pending?'':'disabled'} aria-pressed="${choice.target?.id===t.id}" aria-label="${pending?'Select':'Planned'} set ${t.ordinal}: ${hesc(plTargetText(t))}"`)+(t.qualifier&&!plWarm(t)?`<small class="sc-qual">${hesc(t.qualifier)}</small>`:''):`<span class="sc-empty">${row.unlinked?'Unlinked':'—'}</span>`;
    const logged=row.actual.map(a=>{
      const outcome=plSetOutcome(ex,a,row.last,t),isLatest=a===latest;if(isLatest)latestOutcome=outcome;
      return `<div class="sc-actual${fresh&&isLatest?' sc-fresh':''}${outcome.win?' sc-win':''}">${value(a,'sc-now',`data-sc-load="${a.w}" aria-label="Load logged weight ${hesc(text(a))}"`)}${isLatest||outcome.win?`<details class="sc-result"><summary aria-label="${hesc(outcome.label)}. Show comparison">${outcome.win?icon('sparkle',ICON_SZ.sm):'<span aria-hidden="true">✓</span>'}<span>${outcome.label}</span></summary><p>Set recorded: ${hesc(text(a))}.${row.last?' Last: '+hesc(text(row.last))+'.':''}${t?' Plan: '+hesc(plTargetText(t))+'.':''}</p></details>`:''}</div>`;
    }).join('')||`<span class="sc-empty">${pending?(choice.target?.id===t.id?'Next':'Not yet'):'—'}</span>`;
    return `<tr><th scope="row">${row.label}${plWarmMark(t)}</th>${hasLast?'<td>'+past+'</td>':''}${hasPlan?'<td>'+target+'</td>':''}<td>${logged}</td></tr>`;
  }).join('');
  const done=targets.filter(t=>plActual(todayISO,t.id).length).length,groups=plSessionGroups(rows),canCompact=rows.length>4&&groups.length<rows.length,compact=canCompact&&lift.scDetails!==ex;
  return `<section class="lastcard sc-session plan-link${compact?' sc-compact':''}${compact&&groups.length>6?' sc-dense':''}" aria-label="Your sets comparison"><div class="sc-head"><strong>Your sets</strong><span>${actual.length} sets logged</span>${today.length?'<button class="ago sessedit" id="sessEdit">EDIT</button>':''}</div><div class="sc-toolbar"><span>${U()} · ${isHold(unitOf(ex))?'seconds':'reps'}</span><div class="sc-tools">${hasPlan?`<button type="button" data-sc-edit-plan="${displayPlan.date}">${icon('edit',ICON_SZ.sm)} Edit Plan</button>`:''}${canCompact?`<button type="button" data-sc-details aria-expanded="${!compact}">${icon(compact?'expand':'collapse',ICON_SZ.sm)} ${compact?'Expand':'Collapse'}</button>`:''}</div></div>
    ${changed&&!preview?'<p class="pl-context">Plan edited since you started. These targets stay with this workout.</p>':''}
    ${body?`<table class="sc-table"><thead><tr><th scope="col">Set</th>${hasLast?`<th scope="col">Last<button class="sc-date linkdate" data-histd="${last.d}">${hesc(wd(last.d))}</button></th>`:''}${hasPlan?'<th scope="col">Plan<small>'+hesc(wd(displayPlan.date))+'</small></th>':''}<th scope="col">Logged<small>Today</small></th></tr></thead><tbody>${compact?plCompactBody(ex,groups,hasLast,hasPlan,choice,latest,fresh):body}</tbody></table>`:'<p class="sc-intro">Your first set starts here. Log your weight and reps above.</p>'}
    ${targets.some(plWarm)?'<p class="sc-warm-key"><span aria-hidden="true">W</span> Planned warm-up</p>':''}
    ${!hasLast&&hasPlan&&!preview?'<p class="pl-context">Today becomes your reference next time.</p>':''}
    ${fresh?`<div class="sc-celebrate" role="status"><span class="sc-seal" aria-hidden="true">✓</span><div><strong>That set counts.</strong><small>${latestOutcome?.win?'Set saved. A little extra to celebrate.':latestOutcome?.label==='On target'?'Set saved. Right on target.':'Set saved. Another one in the books.'}</small></div></div>`:''}
    ${actual.length?`<div class="sc-volume"><span>${isHold(unitOf(ex))?'Sets logged':'Volume so far'}</span><strong>${isHold(unitOf(ex))?actual.length:`<span id="volNum" data-kg="${today.reduce((sum,s)=>sum+volOf(s),0)}">${vDisp(today.reduce((sum,s)=>sum+volOf(s),0))}</span> ${U()}`}</strong></div>`:''}
    ${preview?'<p class="pl-context">Upcoming plan · today’s sets are logged separately.</p>':hasPlan?`<div class="pl-next">${choice.target?`<button type="button" class="pl-next-target" data-link-slot="${choice.target.ordinal}">Next: set ${choice.target.ordinal} · ${hesc(plTargetText(choice.target))}</button>`:`<span>${done===targets.length?'All targets logged · extra sets welcome':'Next: extra set · targets remain above'}</span>`}<button type="button" class="pl-extra" data-link-slot="-1" aria-pressed="${!choice.target}">Extra set</button></div>`:'<p class="pl-context">No set target · go at your own pace.</p>'}
    ${hasPlan&&!preview&&rows.some(r=>r.unlinked)?'<p class="pl-context">Unlinked sets count too. They are not assigned to a plan target.</p>':''}</section>`;
}
document.addEventListener('click',e=>{
  const editPlan=e.target.closest('[data-sc-edit-plan]');
  if(editPlan){pwOpen(editPlan.dataset.scEditPlan);if(typeof pfState==='function'){pfState().returnView='lift';pwPersist();}return;}
  if(e.target.closest('[data-sc-details]')){lift.scDetails=lift.scDetails===lift.ex?null:lift.ex;renderLift();return;}
  const b=e.target.closest('[data-sc-load]');if(!b)return;
  const w=+b.dataset.scLoad;if(!Number.isFinite(w))return;
  lift.weight=w;saveExW(lift.ex,w);renderLift();
});
