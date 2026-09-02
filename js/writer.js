/* ============ v3.3.400: THE SESSION WRITER ============
   One button on the plan line -- Sparkle, "Write" -- and one screen: scope
   (today / tomorrow / this week), the days, the part, the objective, a note,
   the privacy line. One call per tap of Write, to an Edge Function that holds
   the key and forwards to the model. Back comes a page of text in the maker's
   own paste format, plus one optional reason line; the app reads it exactly
   as it reads a paste (v3.3.278) -- preview, confirm, planSave -- so every
   commitment the plan already keeps (today-only, never scored, never written
   to the record) is inherited, not re-argued.

   The rotation still computes. The weekday habit still computes. The last
   sessions, the PRs and the coverage table still compute. As of rev 5 of the
   spec they are INPUTS THE WRITER WEIGHS, not verdicts it obeys: the model
   may choose a different part for a reason it must state, may nudge a load,
   may add an exercise for a muscle head with nothing on record. What the
   app does not hand over is the last word. writerCheck() runs on the device
   between the response and the read-back and bounds every claim (the twelve
   guardrails in the spec): unknown names become notes; a silent part change
   is refused whole; a load for a lifted exercise stays within 10% of the
   eight-week best or is clamped and marked ≈; a load for a never-lifted
   exercise is always ≈; at most two NEW movements a session; one session
   per date; the stamp follows the ledger (v3.3.397). Offline, or eight
   seconds without an answer, the ask screen says "needs signal" and the
   rotation card stands exactly as it did. */

const WRITER_PATH='/functions/v1/write-session';
const WRITER_TIMEOUT_MS=8000;
const WRITER_HISTORY_DAYS=56;
const WRITER_LOAD_BAND=0.10;     // ±10% of the eight-week best working weight
const WRITER_NEW_MAX=2;
const OBJECTIVES=[['grow','Grow'],['lose','Lose weight'],['strength','Strength'],['keep','Keep going']];
const WEEKDAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* ---- state: lift.write ---- */
function writerState(){
  if(lift.write) return lift.write;
  const d0=writeDateISO();
  const o={scope:d0===todayISO?'today':'tomorrow', part:'auto', objective:DB.settings.objective||'grow', note:'', days:null, nextWeek:false, busy:false, err:''};
  lift.write=o; return o;
}
/* the days a week can hold: from its first day through Sunday (and, if
   asked, through the following Sunday) */
function writerWeekSpan(from, nextWeek){
  const out=[]; const d=new Date(from+'T00:00'); let sundays=0;
  while(out.length<15){
    out.push(d.toLocaleDateString('en-CA'));
    if(d.getDay()===0){ sundays++; if(sundays>=(nextWeek?2:1)) break; }
    d.setDate(d.getDate()+1);
  }
  return out;
}
/* which weekdays you usually train: trained on that weekday in at least half
   the last eight weeks. A ledger fact, offered as the prefill, never imposed. */
function writerHabitDays(){
  const dates=workoutDates(); const cnt=[0,0,0,0,0,0,0];
  const d=new Date(todayISO+'T00:00');
  for(let i=1;i<=WRITER_HISTORY_DAYS;i++){ d.setDate(d.getDate()-1); const iso=d.toLocaleDateString('en-CA'); if(dates.has(iso)) cnt[new Date(iso+'T00:00').getDay()]++; }
  const weeks=WRITER_HISTORY_DAYS/7;
  return new Set(cnt.map((c,i)=>c>=weeks/2?i:-1).filter(i=>i>=0));
}
function writerDays(o){
  const from=writeDateISO();
  const span=writerWeekSpan(from,o.nextWeek);
  if(!o.days){ const habit=writerHabitDays(); o.days=new Set(span.filter(iso=>habit.size?habit.has(new Date(iso+'T00:00').getDay()):new Date(iso+'T00:00').getDay()!==0)); if(!o.days.size) o.days=new Set(span.slice(0,1)); }
  return span;
}

/* ---- what leaves the device ---- */
function writerPayload(o){
  const from=writeDateISO();
  const P=trainingPlan();
  const ranking=Object.keys(P.info).filter(p=>p!=='Run').map(p=>({part:p, since:P.info[p].sinceF, gap:+P.info[p].gapF.toFixed(1), live:!!P.info[p].live}))
    .sort((a,b)=>(b.since/b.gap)-(a.since/a.gap));
  const myp=myPartsSet(); const catalog={};
  for(const p of Object.keys(SEED.catalog)) if(p!=='Run'&&myp.has(p)) catalog[p]=[...SEED.catalog[p], ...Object.keys(customs()).filter(x=>(customs()[x]||{}).part===p)];
  const cut=new Date(todayISO+'T00:00'); cut.setDate(cut.getDate()-WRITER_HISTORY_DAYS); const cutISO=cut.toLocaleDateString('en-CA');
  const history=[];
  for(const d of Object.keys(DB.days).sort()) if(d>=cutISO) for(const s of (DB.days[d].w||[])){
    if(s.ex==='Run'||!(s.reps||[]).length) continue;
    history.push([d, s.part, s.ex, +(s.w||0).toFixed(2), s.reps, s.su==='s'?'s':'']);
  }
  for(const d of Object.keys(SEED.sessions||{})) if(d>=cutISO&&!DB.days[d]) for(const r of SEED.sessions[d]){ if(r[1]==='Run'||!(r[3]||[]).length) continue; history.push([d,r[0],r[1],+(r[2]||0).toFixed(2),r[3],r[7]==='s'?'s':'']); }
  history.sort((a,b)=>a[0]<b[0]?-1:1);
  const coverage={};
  for(const h of history){ const m=exMuscle(h[2],h[1]); (coverage[h[1]]=coverage[h[1]]||{})[m]=((coverage[h[1]]||{})[m]||0)+h[4].length; }
  for(const p of Object.keys(catalog)){ coverage[p]=coverage[p]||{}; for(const ex of catalog[p]){ const m=exMuscle(ex,p); if(!(m in coverage[p])) coverage[p][m]=0; } }
  const days=o.scope==='week'?[...o.days].sort():[o.scope==='tomorrow'?tomorrowISO():from];
  return {
    v:1, unit:U(), date:days[0], scope:o.scope==='week'?'week':'day', days,
    part:o.scope==='week'?null:(o.part==='auto'?null:o.part),
    focus:o.scope==='week'?(o.focus?[...o.focus]:[]):[],
    rotation:{pick:P.pick, addon:P.addon, ranking},
    objective:o.objective, note:(o.note||'').trim().slice(0,400),
    catalog, history, coverage, new_days:WRITER_HISTORY_DAYS
  };
}

/* ---- the call ---- */
async function writeSession(payload){
  if(typeof WRITER_STUB==='function') return WRITER_STUB(payload);        // tests
  if(typeof navigator!=='undefined'&&navigator.onLine===false) throw new Error('offline');
  const ctl=new AbortController(); const t=setTimeout(()=>ctl.abort(),WRITER_TIMEOUT_MS);
  try{
    const tok=(typeof freshToken==='function'?await freshToken():null)||cloudCfg().anon;
    const r=await fetch(cloudCfg().url+WRITER_PATH,{method:'POST',signal:ctl.signal,
      headers:{'Content-Type':'application/json',apikey:cloudCfg().anon,Authorization:'Bearer '+tok},
      body:JSON.stringify(payload)});
    if(!r.ok) throw new Error('http '+r.status);
    return await r.json();
  }finally{ clearTimeout(t); }
}

/* ---- the guardrails, on the device, before the read-back ----
   in: the response {days:[{date,part,title,text}], reason:{head,text}|null}
   ctx: {payload}
   out: {rows, week, reason, notes:[...what was changed and why]}  or throws {refused} */
function writerBest(ex){
  const cut=new Date(todayISO+'T00:00'); cut.setDate(cut.getDate()-WRITER_HISTORY_DAYS); const cutISO=cut.toLocaleDateString('en-CA');
  let best=0;
  for(const [d,v] of Object.entries(DB.days)) if(d>=cutISO&&d<todayISO) for(const s of (v.w||[])) if(s.ex===ex&&(s.reps||[]).length&&s.su!=='s') best=Math.max(best,s.w||0);
  for(const [d,rows] of Object.entries(SEED.sessions||{})) if(d>=cutISO&&!DB.days[d]) for(const r of rows) if(r[1]===ex&&(r[3]||[]).length) best=Math.max(best,r[2]||0);
  return best;
}
function writerCheck(resp, ctx){
  const notes=[];
  const payload=ctx.payload;
  const days=Array.isArray(resp.days)?resp.days:(resp.text?[{date:payload.date,part:resp.part||payload.part,title:resp.title||'',text:resp.text}]:[]);
  if(!days.length) throw {refused:'empty'};
  const want=new Set(payload.days);
  const seen=new Set();
  const myp=myPartsSet();
  const out=[];
  for(const d of days){
    if(!d||!d.date) continue;
    if(!want.has(d.date)){ notes.push(`dropped ${d.date}: not a day you picked`); continue; }   // guardrail 6: the days you confirmed
    if(seen.has(d.date)) throw {refused:'two sessions for one date'};                           // guardrail 5
    seen.add(d.date);
    /* guardrail 2: the part is one of yours, and a change from the rotation is reasoned */
    const part=d.part||payload.part||payload.rotation.pick;
    if(part&&!myp.has(part)) throw {refused:`part ${part} is not one you train`};
    if(payload.scope==='day'&&!payload.part&&part&&part!==payload.rotation.pick&&!(resp.reason&&resp.reason.text)) throw {refused:'the part changed without a reason'};
    /* the text, read exactly as a paste */
    let rows=parsePlan(String(d.text||''));
    let newCount=0;
    rows=rows.map(r=>{
      if(r.kind!=='ex') return r;
      if(!r.ex){ notes.push(`${r.name}: not in your exercises, kept as a note`); return {kind:'note', raw:r.raw}; }   // guardrail 1
      if(exIsNew(r.ex)){ newCount++; if(newCount>WRITER_NEW_MAX){ notes.push(`${r.ex}: a third new movement, kept as a note`); return {kind:'note', raw:r.raw}; } }   // guardrail 7
      const best=writerBest(r.ex);
      r.lines=(r.lines||[]).map(l=>{
        if(l.nw||l.bw||isHold(l.su)||!(l.w>0)) return l;
        const kg=l.unit==='kg'?l.w:l.unit==='lb'?l.w/LB:toKg(l.w);
        if(best<=0){ if(!l.est){ notes.push(`${r.ex}: never lifted here, load marked ≈`); } return {...l, est:true}; }     // guardrail 4
        const lo=best*(1-WRITER_LOAD_BAND), hi=best*(1+WRITER_LOAD_BAND);
        if(kg<lo||kg>hi){                                                                                                   // guardrail 3
          const clampKg=Math.min(hi,Math.max(lo,kg)); const shown=l.unit==='kg'?clampKg:l.unit==='lb'?clampKg*LB:(isLb()?clampKg*LB:clampKg);
          notes.push(`${r.ex}: ${l.w}${l.unit||''} is outside 10% of your ${wDisp(best)} ${U()} best, clamped and marked ≈`);
          return {...l, w:+shown.toFixed(1), est:true};
        }
        return l;
      });
      return r;
    });
    out.push({date:d.date, part, title:String(d.title||'').slice(0,60), rows, text:planTextFromRows(rows)});
  }
  if(!out.length) throw {refused:'no day matched the days you picked'};
  const reason=(resp.reason&&resp.reason.text)?{head:String(resp.reason.head||'').slice(0,60), text:String(resp.reason.text).slice(0,300)}:null;
  if(payload.scope==='day') return {rows:out[0].rows, text:out[0].text, date:out[0].date, part:out[0].part, reason, notes, week:null};
  /* a week: the rows the preview shows, and the document it will save */
  const rows=[]; const wdays={};
  for(const d of out.sort((a,b)=>a.date<b.date?-1:1)){
    rows.push({kind:'day', iso:d.date, title:d.title, raw:weekDayHead(d.date,d.title), dayRaw:d.text});
    for(const r of d.rows) rows.push(r);
    wdays[d.date]={title:d.title, items:[], note:'', raw:d.text};
  }
  return {rows, week:{from:out[0].date, to:out[out.length-1].date, days:wdays, raw:rows.length?planTextFromRows(rows):''}, reason, notes, date:out[0].date, part:null, text:planTextFromRows(rows)};
}

/* ---- the ask screen ---- */
function writerScreenHTML(){
  const o=writerState();
  const d0=writeDateISO(), d1=tomorrowISO();
  const P=trainingPlan();
  const chips=(list,on,attr)=>list.map(([k,label])=>`<button class="chip${on(k)?' on':''}" ${attr}="${k}">${label}</button>`).join('');
  /* the seg names the date under each word: the ledger rule has to be visible */
  const seg=`<span class="seg" style="display:flex">
    <button data-writescope="today" class="${o.scope==='today'?'sel':''}">Today<small>${planDayLabel(todayISO)}</small></button>
    <button data-writescope="tomorrow" class="${o.scope==='tomorrow'?'sel':''}">Tomorrow<small>${planDayLabel(d1)}</small></button>
    <button data-writescope="week" class="${o.scope==='week'?'sel':''}">This week<small>to Sunday</small></button></span>`;
  let body='';
  if(o.scope==='week'){
    const span=writerDays(o); const last=span[span.length-1];
    const left=span.filter(x=>x>=d0).length;
    body+=`<div class="lasthead" style="margin-top:16px"><span>DAYS</span><span class="ago mono">${planDayLabel(d0)} → ${planDayLabel(last)} · you usually train these</span></div>
      <div class="chips">${span.map(iso=>`<button class="chip${o.days.has(iso)?' on':''}" data-writeday="${iso}">${WEEKDAYS[new Date(iso+'T00:00').getDay()]}${span.length>7?' '+iso.slice(8).replace(/^0/,''):''}</button>`).join('')}</div>`;
    if(left<=2&&!o.nextWeek) body+=`<div class="row spread card writenext"><span class="mono muted" style="font-size:12px">Show following days?<br><span style="color:var(--faint);font-size:11px">the week ends Sunday</span></span><button class="chip" data-writenext="1">Next week</button></div>`;
    if(o.nextWeek) body+=`<div class="mono muted" style="font-size:11px;padding:8px 2px 0">Through ${planDayLabel(last)}. <button class="pedge" data-writenext="0" style="text-transform:none;letter-spacing:0">This week only</button></div>`;
    const focus=o.focus||new Set();
    body+=`<div class="lasthead" style="margin-top:16px"><span>FOCUS</span><span class="ago mono">the rest still gets its turn</span></div>
      <div class="chips">${[...myPartsSet()].map(p=>`<button class="chip${focus.has(p)?' on':''}" data-writefocus="${p}">${p}</button>`).join('')}</div>`;
  }else{
    const parts=[['auto','Writer’s call'],...[...myPartsSet()].map(p=>[p,p])];
    const d=o.scope==='tomorrow'?d1:todayISO;
    if(o.scope==='today'&&d0!==todayISO) body+=`<div class="mono muted" style="font-size:11px;line-height:1.5;padding:8px 2px 0">Today is in the record already; the ledger would write ${planDayLabel(d1)}. Your call.</div>`;
    if(o.scope==='tomorrow'&&d0===todayISO) body+=`<div class="mono muted" style="font-size:11px;line-height:1.5;padding:8px 2px 0">Nothing logged today yet. This writes ${planDayLabel(d1)} and opens it at midnight.</div>`;
    body+=`<div class="lasthead" style="margin-top:16px"><span>FOR</span><span class="ago mono">${P.pick?`rotation says ${P.pick}`:'no rotation yet'}</span></div>
      <div class="chips">${chips(parts,k=>o.part===k,'data-writefor')}</div>`;
    const thin=o.part!=='auto'&&((P.info[o.part]||{}).days||0)<4;
    if(thin) body+=`<div class="mono muted" style="font-size:11px;line-height:1.5;padding:10px 2px 0">${(P.info[o.part]||{}).days||0} ${o.part} day${((P.info[o.part]||{}).days||0)===1?'':'s'} on record. Loads will read <b style="color:var(--chalk)">by feel</b> or ≈ until there is more to read — the writer never states a weight you have not lifted.</div>`;
  }
  body+=`<div class="lasthead" style="margin-top:16px"><span>OBJECTIVE</span><span class="ago mono">remembered</span></div>
    <div class="chips">${chips(OBJECTIVES,k=>o.objective===k,'data-writeobj')}</div>
    <textarea class="planta" id="writeNote" rows="2" style="margin-top:14px" placeholder="Anything else. A sore knee, 45 minutes, no barbell today.">${hesc(o.note)}</textarea>
    <div class="mono muted" style="font-size:11px;line-height:1.5;padding:10px 2px 0">Eight weeks of your sets, every part, and this note go out to write it. Nothing comes back into your record; you read it first, like a paste.</div>`;
  const label=o.busy?'Writing…':o.scope==='week'?`Write ${o.days?o.days.size:''} session${o.days&&o.days.size===1?'':'s'}`:`Write ${planDayLabel(o.scope==='tomorrow'?d1:todayISO)}`;
  const err=o.err?`<div class="mono writeerr" style="font-size:12px;color:var(--record);padding:10px 2px 0">${hesc(o.err)}</div>`:'';
  return `<h2>Write a session</h2><div class="card writecard">${seg}${body}${err}
    <div class="planacts" style="padding-left:0;padding-right:0">
      <button class="btn wide" data-writego ${o.busy||(o.scope==='week'&&!(o.days&&o.days.size))?'disabled':''} style="margin:0">${label}</button>
      <button class="btn ghost wide" data-writepaste style="margin:0">Paste one instead</button>
    </div>
    <button class="btn ghost" data-writeback style="margin-top:8px">Cancel</button></div>`;
}

/* tap Write: build, call, check, hand to the preview */
async function writerGo(){
  const o=writerState(); if(o.busy) return;
  const ta=document.getElementById('writeNote'); if(ta) o.note=ta.value;
  if(o.scope==='week') writerDays(o);
  o.busy=true; o.err=''; render();
  const payload=writerPayload(o);
  try{
    const resp=await writeSession(payload);
    const chk=writerCheck(resp,{payload});
    lift.planSource='writer'; lift.planReason=chk.reason; lift.planNotes=chk.notes;
    lift.planText=chk.text; lift.planRows=chk.rows; lift.planDate=chk.date;
    if(chk.week){ lift.planMode='week'; lift.planWeek=chk.week; } else { lift.planMode='day'; lift.planWeek=null; }
    lift.plan='preview'; o.busy=false;
    render();
  }catch(e){
    o.busy=false;
    const msg=(e&&e.refused)?`The writer’s answer was refused: ${e.refused}. Nothing was saved.`
      :(e&&(e.name==='AbortError'||/offline|Failed to fetch|NetworkError/i.test(String(e&&e.message))))?'Needs signal. The rotation still has an answer.'
      :`Could not write (${String(e&&e.message||e).slice(0,60)}).`;
    o.err=msg; render();
  }
}
