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
