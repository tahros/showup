/* ShowUp — plan.js  (v3.3.203)
   The fourth surface. Today RECORDS, Train LOGS, Stats READS — Plan PROPOSES.

   Church and state: a plan is a statement of intent and must never touch
   DB.days. The moment a planned-but-untrained session enters the ledger,
   every derived number in the app starts lying — streak, muscle coverage,
   rep zones, intent gaps all read DB.days as the record of what HAPPENED.
   So plans live in their own store, sync as settings-grade data, and no
   derive pass ever looks at them. This is the one decision here that is
   expensive to reverse, so it is made once, at the bottom.

   The draft is assembled from authorities that already exist rather than a
   new set of opinions: trainingPlan().pick chooses the part (the same call
   behind Today's "Train next"), the rep-zone rail's set counts choose the
   exercises, the last logged working weight sets the load, and
   repZoneReading() writes the note. Everything is then editable — the
   engine drafts, the person tailors. "THE exercise for width" is a coach's
   voice, not arithmetic, and the app should never pretend otherwise. */

const PLAN_ROWS_MAX=8;              // one screen of work, not a program
const PLAN_DEFAULT_SETS=4;
const plans=()=>DB.settings.plans||(DB.settings.plans=[]);

/* ---------- draft ---------- */
/* Pure: same ledger in, same plan out. Takes an explicit part so the editor
   can redraft for any body part without reaching into module state. */
function draftPlan(part){
  const P=trainingPlan();
  const grp=part||PART_VISIBLE[P.pick]||P.pick||VISIBLE_GROUPS[0];
  const sets=rzSetsById();
  /* exercises of this visible group, most-trained first — the same order the
     rep-zone rail shows, so the draft matches what the person just read */
  const ids=rzExercises()
    .filter(id=>(PART_VISIBLE[homePartOf(canonName(id))]||homePartOf(canonName(id)))===grp)
    .sort((a,b)=>(sets[b]||0)-(sets[a]||0))
    .slice(0,PLAN_ROWS_MAX);
  const rows=ids.map(id=>{
    const w=planLastWeight(id);
    return {ex:canonName(id), cid:id, w, sets:PLAN_DEFAULT_SETS,
            reps:planTargetReps(id), note:planNote(id)};
  });
  return {id:'p'+Date.now().toString(36), title:grp+' day', madeFor:firstName()||'',
          part:grp, rows, at:Date.now(), src:'drafted'};
}
/* the heaviest weight of the most recent session that trained it — what the
   person actually last worked at, not an average */
function planLastWeight(id){
  let last=null,w=0;
  for(const [d,rows] of rzAllSessions())
    for(const r of rows){
      if(rowCid(r)!==id||!(r[3]||[]).length) continue;
      if(!last||d>last){ last=d; w=r[2]; } else if(d===last&&r[2]>w) w=r[2];
    }
  return w||0;
}
function planTargetReps(id){
  const {dots}=repZoneSets(id,REPZONE_WINDOW);
  if(!dots.length) return REPZONE_MAX_STRENGTH+3;
  /* the rep most often performed, nudged toward the growth window */
  const best=dots.reduce((a,d)=>d.n>(a?a.n:0)?d:a,null);
  return Math.max(REPZONE_MAX_STRENGTH+1,Math.min(REPZONE_MAX_GROWTH,best.rep));
}
/* the note is the reading's own sentence where one exists — no second engine */
function planNote(id){
  const r=repZoneReading(id);
  if(!r) return '';
  const growth=r.find(x=>/^Growth/.test(x[0]));
  if(growth) return growth[1].replace(/^\d+ sets?\.\s*/,'');
  const strength=r.find(x=>/^Strength/.test(x[0]));
  if(strength&&!/Not enough/.test(strength[1])) return strength[1].replace(/^Empty\.\s*/,'');
  return '';
}

/* ---------- store ---------- */
function savePlan(p){
  const all=plans();
  const i=all.findIndex(x=>x.id===p.id);
  if(i>-1) all[i]=p; else all.unshift(p);
  DB.settingsAt=Date.now(); save(true);
}
function deletePlan(id){
  DB.settings.plans=plans().filter(p=>p.id!==id);
  DB.settingsAt=Date.now(); save(true);
}

/* ---------- view ---------- */
let planDraft=null;
function renderPlan(){
  const saved=plans();
  let h=`<h2>Plan${hActs('plan','A session written ahead of time. Plans are intent \u2014 they never enter your log, and nothing here counts as trained.','About plans')}</h2>`;
  if(!planDraft){
    h+=`<div class="card">
      <div class="note" style="margin-bottom:12px">Draft a session from what you already train, then edit every line.</div>
      <button class="btn" id="plDraft">Draft next session</button>
    </div>`;
  }else{
    const p=planDraft;
    h+=`<div class="card plcard">
      <div class="plhead">
        <input id="plTitle" class="plinput pltitle" value="${(p.title||'').replace(/"/g,'&quot;')}" aria-label="Plan title">
        <input id="plFor" class="plinput plfor" value="${(p.madeFor||'').replace(/"/g,'&quot;')}" placeholder="made for\u2026" aria-label="Made for">
      </div>
      <div class="plrows">${p.rows.map((r,i)=>`
        <div class="plrow" data-pli="${i}">
          <div class="plex">${r.ex}<button class="plx" data-pldel="${i}" aria-label="Remove ${r.ex}">\u00d7</button></div>
          <div class="plnums">
            <label>${U()}<input class="plinput" type="number" inputmode="decimal" step="${STEP()}" value="${r.w?wDisp(r.w):''}" data-plw="${i}"></label>
            <label>sets<input class="plinput" type="number" inputmode="numeric" value="${r.sets}" data-pls="${i}"></label>
            <label>reps<input class="plinput" type="number" inputmode="numeric" value="${r.reps}" data-plr="${i}"></label>
          </div>
          <input class="plinput plnote" value="${(r.note||'').replace(/"/g,'&quot;')}" placeholder="note\u2026" data-pln="${i}">
        </div>`).join('')}</div>
      ${p.rows.length?'':`<div class="note">No exercises drafted \u2014 nothing logged for this part yet.</div>`}
      <div class="row" style="gap:8px;margin-top:14px">
        <button class="btn ghost" id="plCancel" style="flex:1;margin:0">Discard</button>
        <button class="btn" id="plSave" style="flex:1;margin:0">Save plan</button>
      </div>
    </div>`;
  }
  if(saved.length){
    h+=`<h2>Saved</h2>`;
    for(const p of saved) h+=`<div class="card plsaved" data-plopen="${p.id}">
      <div class="row spread"><b>${p.title}</b><span class="note">${p.rows.length} exercise${p.rows.length===1?'':'s'}</span></div>
      ${p.madeFor?`<div class="note" style="margin-top:2px">for ${p.madeFor}</div>`:''}
      <button class="plx plsx" data-pldrop="${p.id}" aria-label="Delete ${p.title}">\u00d7</button>
    </div>`;
  }
  $('#view').innerHTML=h;
}

document.addEventListener('click',e=>{
  const t=e.target;
  if(t.closest&&t.closest('#plDraft')){ planDraft=draftPlan(); render(); return; }
  if(t.closest&&t.closest('#plCancel')){ planDraft=null; render(); return; }
  if(t.closest&&t.closest('#plSave')){
    if(planDraft){ savePlan(planDraft); planDraft=null; toast('Plan saved'); render(); }
    return;
  }
  const del=t.closest&&t.closest('[data-pldel]');
  if(del&&planDraft){ planDraft.rows.splice(+del.dataset.pldel,1); render(); return; }
  const drop=t.closest&&t.closest('[data-pldrop]');
  if(drop){ deletePlan(drop.dataset.pldrop); render(); return; }
  const open=t.closest&&t.closest('[data-plopen]');
  if(open){
    const p=plans().find(x=>x.id===open.dataset.plopen);
    if(p){ planDraft=JSON.parse(JSON.stringify(p)); render(); }
  }
});
/* edits write straight to the draft — a plan is a document being written,
   not a form to submit */
document.addEventListener('input',e=>{
  if(!planDraft) return;
  const t=e.target; if(!t.dataset) return;
  if(t.id==='plTitle'){ planDraft.title=t.value; return; }
  if(t.id==='plFor'){ planDraft.madeFor=t.value; return; }
  for(const [k,f] of [['plw','w'],['pls','sets'],['plr','reps'],['pln','note']]){
    if(t.dataset[k]===undefined) continue;
    const row=planDraft.rows[+t.dataset[k]]; if(!row) return;
    row[f]= f==='note'?t.value : (f==='w'?toKg(+t.value||0):(+t.value||0));
    return;
  }
});
