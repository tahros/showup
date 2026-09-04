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
   is refused whole; a load for a lifted exercise never exceeds the
   eight-week best by more than 10%, or is clamped and marked ≈ (lighter is
   free: a warm-up, a back-off, a deload); a load for a never-lifted
   exercise is always ≈, and a load for a head with no work at all is no
   number but "by feel"; at most two NEW movements a session; one session
   per date; the stamp follows the ledger (v3.3.397). Offline, or thirty
   seconds (a week: forty-five) without an answer, the ask screen says "needs signal" and the
   rotation card stands exactly as it did. */

const WRITER_PATH='/functions/v1/write-session';
/* v3.3.403: MEASURED AGAINST A COLD FUNCTION. Warm, a day comes back in
   5.6-5.9s and a week in about nine. But this function is invoked once a day
   by one person, so its isolate is almost always evicted -- the first call
   after a quiet spell pays ~7s of boot on top, and the first live write after
   a deploy timed out at 12s with a perfectly good answer on the way. The wait
   is the cold start, not the model, and no amount of prompt work shortens it.
   So: patience long enough for a cold start, and a message that says which
   kind of failure this was, because "needs signal" is a lie when the signal
   is fine and the server was merely asleep. */
/* v3.3.421: the phone waits LONGER than the function (25 s / 60 s), so the
   function is always the one to give up first and its 504 is the one error
   the person sees -- never a client abort racing a server that was about to
   answer. */
const WRITER_TIMEOUT_MS={day:30000, week:75000};
const WRITER_HISTORY_DAYS=56;
const WRITER_LOAD_BAND=0.10;     // the CEILING over the eight-week best; below it the writer is free (v3.3.402)
/* v3.3.407: ONE STEP IS ALWAYS ALLOWED. A percentage ceiling is right on a
   215 lb deadlift (21 lb of headroom, two plates) and wrong on a 20 lb cable
   fly, where 10% is 2 lb and the stack's smallest pin is 5. The band was
   forbidding the only progression a light accessory can make, and the writer,
   told never to leap, went 20 -> 15. The ceiling is now the larger of the
   band and one step: 2.5 kg, which is a 5 lb pin or a 2.5 on each side. */
const WRITER_STEP_KG=2.5;
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

/* v3.3.419: A DAY LIVES INSIDE A WEEK. A one-day Writer request used to send
   only that date. The model could see the past but not a Chest day already
   saved for Friday or Arms already saved for Saturday, so it composed
   tomorrow in isolation. Summarise every remaining date through Sunday and
   treat saved future blocks as fixed context. Requested dates are deliberately
   not marked fixed: the Writer is being asked to replace those. */
function writerPlanSummary(iso){
  const own=DB.plan&&DB.plan.d===iso?DB.plan:null;
  const block=!own&&DB.week&&DB.week.days?DB.week.days[iso]:null;
  const p=own||block; if(!p) return null;
  const items=(p.items||[]).map(planItemShape);
  const exercises=items.map(i=>i&&i.ex).filter(Boolean);
  if(!exercises.length&&!String(p.note||'').trim()) return null;
  const parts=[...new Set(exercises.map(homePartOf).filter(Boolean))];
  /* Rebuild from accepted items when possible. Raw text can contain an alias
     the parser resolved earlier; the fixed block must travel in its resolved,
     tappable form rather than being interpreted a second time. */
  const text=items.length?planToText({items,note:p.note||''}):String(p.raw||p.note||'').trim();
  return {
    title:String((block&&block.title)||p.title||'').slice(0,60),
    exercises, parts,
    part:parts.find(x=>x!=='Sixpack')||parts[0]||null,
    text:String(text||'').slice(0,5000)
  };
}
function writerWeekContext(selectedDays, writableDays){
  const selected=new Set(selectedDays), writable=new Set(writableDays||selectedDays), habit=writerHabitDays();
  return writerWeekSpan(selectedDays[0],false).map(iso=>({
    date:iso,
    weekday:WEEKDAYS[new Date(iso+'T00:00').getDay()],
    selected:selected.has(iso),
    requested:writable.has(iso),
    usual:habit.has(new Date(iso+'T00:00').getDay()),
    planned:writable.has(iso)?null:writerPlanSummary(iso)
  }));
}

/* Whole recent days make the person's established session shapes explicit.
   Raw history remains the source of truth for loads; this small view answers
   a different question: what travelled together, and in what order? */
function writerRecentSessions(history){
  const byDay={};
  for(const h of history){
    const day=byDay[h[0]]||(byDay[h[0]]={date:h[0],parts:[],exercises:[]});
    if(!day.parts.includes(h[1])) day.parts.push(h[1]);
    if(!day.exercises.some(x=>x.exercise===h[2])) day.exercises.push({part:h[1],exercise:h[2]});
  }
  return Object.keys(byDay).sort().reverse().slice(0,12).map(d=>byDay[d]);
}
/* ---- v3.3.432: THE TWO FACTS THAT HAD NO ENFORCER -----------------------
   The prompt has said "no major part on consecutive days" since the writer
   shipped, twice, and nothing ever checked. The model put Squat on the Friday
   after a Thursday of Deadlift 205x8888 and RDL 165x8/6/6, then justified it:
   "Friday completes your leg day contract." A sentence that cites no fact.
   Guardrails 14/14b/16 held all week because they have code behind them.
   Recovery and session size had only prose, so they broke.
   A RULE WITH NO ENFORCER IS A WISH. These two become laws. */

/* WHICH MAJOR PARTS ARE OFF LIMITS ON A GIVEN DATE, and why. Looks BACKWARD
   at the ledger and FORWARD at saved plans -- a rule that looks one way gets
   broken by the other. The maker chose TWO days: his own record has never
   trained a major part inside 48 h (Legs Aug 22 and 27, Aug 27 and Sep 3).
   Core is exempt; it rides along, as the prompt has always said. */
const WRITER_RECOVERY_DAYS=2;
const WRITER_CORE_PARTS=['Sixpack','Run'];
function writerPartsResting(date, sessions, weekCtx){
  const out={};
  const D=iso=>new Date(iso+'T00:00');
  const gap=(a,b)=>Math.round((D(a)-D(b))/86400000);
  const near=[];
  for(const s of sessions||[]) near.push({date:s.date, parts:s.parts||[]});
  for(const w of weekCtx||[]) if(w.planned&&w.parts) near.push({date:w.date, parts:w.parts});
  for(const n of near){
    if(n.date===date) continue;
    const g=Math.abs(gap(date,n.date));
    if(g<WRITER_RECOVERY_DAYS)
      for(const p of n.parts){
        if(WRITER_CORE_PARTS.includes(p)) continue;
        if(!out[p]) out[p]={part:p, on:n.date, days_apart:g};
      }
  }
  return Object.values(out);
}

/* THE PERSON'S OWN SESSION RANGE. The writer wrote three exercises for a
   Friday; the maker's last thirteen sessions run 4-7, median 5. The app knew
   his shape exactly and never told the writer the NUMBER -- the prompt said
   "preserve the established session composition" and handed over raw history
   to infer it from. It guessed low. His MINIMUM is the floor, on his call:
   it is the honest reading of the record rather than a figure derived from it.
   Core-only and Run-only days are excluded from the count: they are not
   sessions whose shape anyone is trying to preserve. */
function writerSessionShape(sessions){
  /* TODAY IS NOT A SESSION SHAPE. It is in progress: the maker may be three
     exercises in with three to go, and counting it drags his floor down to
     whatever he happens to have logged when he taps Write. Only finished days
     describe how long his sessions are. */
  const counts=(sessions||[]).filter(s=>s.date!==todayISO).map(s=>{
    const major=(s.exercises||[]).filter(x=>!WRITER_CORE_PARTS.includes(x.part));
    return major.length;
  }).filter(n=>n>0);
  /* three finished sessions is enough to know a floor; fewer is a guess, and
     a guessed floor would refuse days for no reason. No shape means rule 2
     simply does not apply -- a new user is never told his session is short. */
  if(counts.length<3) return null;
  const sorted=[...counts].sort((a,b)=>a-b);
  return {
    min: sorted[0],
    max: sorted[sorted.length-1],
    median: sorted[Math.floor(sorted.length/2)],
    from_sessions: counts.length
  };
}
function writerRecentWeeks(sessions){
  const weeks={};
  for(const s of sessions){
    const d=new Date(s.date+'T00:00'), dow=d.getDay();
    d.setDate(d.getDate()-((dow+6)%7));
    const start=d.toLocaleDateString('en-CA');
    (weeks[start]=weeks[start]||[]).push({date:s.date,weekday:WEEKDAYS[dow],parts:s.parts,exercises:s.exercises.map(x=>x.exercise)});
  }
  return Object.keys(weeks).sort().reverse().slice(0,6).map(week_of=>({week_of,days:weeks[week_of].sort((a,b)=>a.date<b.date?-1:1)}));
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
  /* Equal-date rows keep ledger order; writerRecentSessions relies on that
     order to distinguish the main lift from its accessories. */
  history.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
  /* v3.3.405: WHICH HEAD EACH EXERCISE TRAINS. The app has always known that
     Incline Bench is upper-chest and a Dip is sternal chest (EX_MUSCLE, since
     v3.3.357) -- but the writer was only ever handed the COUNTS per head, never
     the mapping, so it could not tell which movement belonged to which. It put
     a Dip in an incline session, which is a real programming error and the
     maker caught it on the first week. The mapping goes out now, grouped by
     head so the shape of a part is legible at a glance. */
  const heads={};
  for(const [p2,list] of Object.entries(catalog))
    for(const ex of list){ const m=exMuscle(ex,p2); ((heads[p2]=heads[p2]||{})[m]=(heads[p2][m]||[])).push(ex); }
  const coverage={};
  for(const h of history){ const m=exMuscle(h[2],h[1]); (coverage[h[1]]=coverage[h[1]]||{})[m]=((coverage[h[1]]||{})[m]||0)+h[4].length; }
  for(const p of Object.keys(catalog)){ coverage[p]=coverage[p]||{}; for(const ex of catalog[p]){ const m=exMuscle(ex,p); if(!(m in coverage[p])) coverage[p][m]=0; } }
  /* v3.3.407: THE LAST SESSION, PER EXERCISE. Double progression is a rule
     about last time -- did every working set reach the top of the range? --
     and the writer had to rediscover last time from raw rows every call. It
     was not doing so: it wrote 50 lb after a 50 x 10 10 9 9, and 15 lb after
     a 20 x 10 10. The app already keeps lastSess for the Suggested rail; it
     goes out as it is, load and reps, one entry per exercise you have lifted. */
  /* v3.3.409: EVERY LOAD LEAVES IN YOUR UNIT. The record is kept in kg and
     the payload said "Unit: lb" and handed over kilograms, leaving the model
     to convert every number both ways. It slipped: told to add a step to
     22.68 kg it wrote "25 lb". Nothing the model reads should need
     converting, so history, best and last go out in the unit it writes in,
     and the step is named in that unit (5 lb or 2.5 kg). */
  const inU=v=>U()==='lb'?+((+v||0)*LB).toFixed(1):+(+v||0).toFixed(2);
  const last={}, steps={}, next={};
  for(const list of Object.values(catalog)) for(const ex of list) steps[ex]=wStep(ex);
  for(const [ex,ls] of Object.entries(SEED.lastSess||{})) if(ex!=='Run'&&ls&&ls.rows&&ls.rows.length){
    last[ex]=[ls.d, ls.rows.map(r=>[inU(r[0]), r[1]])];
    const top=Math.max(...ls.rows.map(r=>+r[0]||0));
    if(top>0) next[ex]=inU(nextFaceAbove(top,ex));
  }
  /* the eight-week best per exercise, precomputed: the band the loads must
     sit in is a number the writer should not have to derive from raw rows */
  /* v3.3.435: since v3.3.401 this read `h[3]>best[h[2]]` with best[] empty,
     and `90 > undefined` is false -- so the max loop assigned NOTHING and the
     fallback below filled every exercise with its OLDEST row in the window.
     The model was told "best" and handed the lowest recent load on any lift
     that progresses; its ceiling (best + band, or one step) sat under the
     person's real top. The client clamp uses writerBest() and only clamps
     DOWN, so nothing caught it. test-writer.js was green six days in seven:
     its fixture's oldest Deadlift row happened to be a 100 kg day unless the
     56th day back was a Sunday. Seed on first sight, then take the max. */
  const best={}; for(const h of history) if(h[5]!=='s'&&(!(h[2] in best)||h[3]>best[h[2]])) best[h[2]]=h[3]; for(const h of history) if(!(h[2] in best)) best[h[2]]=h[3];
  for(const ex of Object.keys(best)) best[ex]=inU(best[ex]);
  for(const h of history) h[3]=inU(h[3]);
  const selected_days=o.scope==='week'?[...o.days].sort():[o.scope==='tomorrow'?tomorrowISO():from];
  /* v3.3.420: SELECTED IS NOT THE SAME AS WRITABLE. In a week request, a
     selected date that already has an accepted plan is a fixed block. The
     model writes only the blanks; the device merges the fixed blocks back
     into the read-back from their accepted item shapes. */
  /* v3.3.421: a REWRITE carries no locked days -- the week's header door means
     "write this week again", and the saved sessions are what is being replaced.
     Through the day door, v3.3.420 holds: saved days stay locked. */
  const locked_days=(o.scope==='week'&&!o.rewrite)?selected_days.map(date=>({date,...(writerPlanSummary(date)||{})})).filter(x=>x.text):[];
  const locked=new Set(locked_days.map(x=>x.date));
  const days=selected_days.filter(date=>!locked.has(date));
  const recent_sessions=writerRecentSessions(history);
  const recent_weeks=writerRecentWeeks(recent_sessions);
  const week_context=writerWeekContext(selected_days,days);
  /* v3.3.432: THE APP OWNS THE CALENDAR (the maker's call). Which part trains
     on which day is a scheduling problem the app already solves for Train
     Next, with rules he trusts -- and it is a FACT problem: it needs the
     ledger and the saved plans, not taste. The model's value is filling a day
     well, not choosing it. So a SKELETON goes out: for each writable date, the
     parts that are resting and may not be used, and the parts that are due in
     ranking order. The model may still propose a different part, but only with
     a reason that names a payload fact -- narrative alone no longer carries a
     day (see the doctrine, principle 3). */
  const shape=writerSessionShape(recent_sessions);
  const skeleton=days.map(date=>{
    const resting=writerPartsResting(date, recent_sessions, week_context);
    const off=new Set(resting.map(r=>r.part));
    return {
      date,
      weekday:WEEKDAYS[new Date(date+'T00:00').getDay()],
      resting,                                     // may NOT be trained: rule 1
      due:ranking.filter(r=>!off.has(r.part)).slice(0,4).map(r=>r.part)
    };
  });
  return {
    skeleton, shape, recovery_days:WRITER_RECOVERY_DAYS,
    v:1, unit:U(), date:selected_days[0], scope:o.scope==='week'?'week':'day', days, selected_days, locked_days,
    part:o.scope==='week'?null:(o.part==='auto'?null:o.part),
    focus:o.scope==='week'?(o.focus?[...o.focus]:[]):[],
    rotation:{pick:P.pick, addon:P.addon, ranking},
    objective:o.objective, note:(o.note||'').trim().slice(0,400),
    catalog, heads, history, recent_sessions, recent_weeks, week_context, best, last, steps, next, coverage,
    new_days:WRITER_HISTORY_DAYS, band:WRITER_LOAD_BAND, step:U()==='lb'?5:WRITER_STEP_KG, new_max:WRITER_NEW_MAX
  };
}

/* The model never gets authorship over a fixed day. Even if it returns one,
   discard that copy and merge the accepted local/cloud plan instead. */
function writerResponseWithLocked(resp,payload){
  const fixed=payload.locked_days||[]; if(payload.scope!=='week'||!fixed.length) return resp;
  const dates=new Set(fixed.map(x=>x.date));
  const generated=(Array.isArray(resp&&resp.days)?resp.days:[]).filter(x=>x&&!dates.has(x.date));
  const kept=fixed.map(x=>({date:x.date,part:x.part,title:x.title||'',text:x.text,_locked:true}));
  return {...(resp||{}),days:[...generated,...kept]};
}

/* ---- the call ---- */
async function writeSession(payload){
  if(typeof WRITER_STUB==='function') return WRITER_STUB(payload);        // tests
  if(typeof navigator!=='undefined'&&navigator.onLine===false) throw new Error('offline');
  const ctl=new AbortController(); lift.writeAbort=ctl;
  const t=setTimeout(()=>ctl.abort(),WRITER_TIMEOUT_MS[payload.scope==='week'?'week':'day']);
  try{
    const tok=(typeof freshToken==='function'?await freshToken():null)||cloudCfg().anon;
    const r=await fetch(cloudCfg().url+WRITER_PATH,{method:'POST',signal:ctl.signal,
      headers:{'Content-Type':'application/json',apikey:cloudCfg().anon,Authorization:'Bearer '+tok},
      body:JSON.stringify(payload)});
    if(!r.ok) throw new Error('http '+r.status);
    return await r.json();
  }finally{ clearTimeout(t); lift.writeAbort=null; }
}
function writerCancel(){
  const o=writerState(); o.cancelled=true;
  if(lift.writeAbort){ try{ lift.writeAbort.abort(); }catch(_e){} }
  /* the stub path has no controller to abort: settle it here */
  if(!lift.writeAbort){ writerWaitStop(); o.busy=false; lift.plan='write'; o.err=''; render(); }
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
    /* Fixed week blocks were already parsed, resolved and accepted by the
       person. They are merged for one coherent preview, not re-coached. */
    if(d._locked){
      const rows=parsePlan(String(d.text||''));
      out.push({date:d.date,part:d.part||null,title:String(d.title||'').slice(0,60),rows,text:planTextFromRows(rows)});
      continue;
    }
    /* guardrail 2: the part is one of yours, and a change from the rotation is reasoned */
    const part=d.part||payload.part||payload.rotation.pick;
    if(part&&!myp.has(part)) throw {refused:`part ${part} is not one you train`};
    if(payload.scope==='day'&&!payload.part&&part&&part!==payload.rotation.pick&&!(resp.reason&&resp.reason.text)) throw {refused:'the part changed without a reason'};
    /* the text, read exactly as a paste */
    let rows=parsePlan(String(d.text||''));
    /* v3.3.422: ONE UNREADABLE EXERCISE IS A NOTE, NOT A REFUSAL. This threw
       away a three-session week because one plank's line did not parse. The
       guardrail's purpose -- the writer may not hand back names without
       prescriptions -- is kept where it bites: a day with NOTHING readable is
       still refused. A day with one unreadable line keeps the line as a note
       (exnote already does exactly that), and the read-back says so, naming
       the exercise, so the person sees what was dropped and can add it by
       hand. Proportion: the fault is one line; the cost is one line. */
    const readable=rows.filter(r=>r.kind==='ex'&&r.ex);
    const unread=rows.filter(r=>r.kind==='exnote'&&r.ex);
    if(!readable.length&&unread.length) throw {refused:`${unread[0].ex||unread[0].name} has no sets, reps, or time, and nothing else in ${d.date} could be read`};
    for(const u of unread) notes.push(`${u.ex}: its line could not be read — kept as a note`);
    let newCount=0;
    rows=rows.map(r=>{
      if(r.kind!=='ex') return r;
      if(!r.ex){ notes.push(`${r.name}: not in your exercises, kept as a note`); return {kind:'note', raw:r.raw}; }   // guardrail 1
      if(exIsNew(r.ex)){
        /* v3.3.410: NEW IS FOR AN EMPTY HEAD. A movement you have not done in
           eight weeks earns its place one way: the muscle head it trains has
           nothing on record (VARIETY), or you asked for it in the note. The
           writer, told this twice in the prompt, still dropped a Dip into an
           incline session whose heads were all covered -- three live probes
           out of three. Words did not hold; the device does. */
        const head=exMuscle(r.ex, part);
        const headWork=((payload.coverage||{})[part]||{})[head]||0;
        const asked=(payload.note||'').toLowerCase().includes(r.ex.toLowerCase());
        if(headWork&&!asked){ notes.push(`${r.ex}: new, and ${head} already has work — left out (ask for it in the note if you want it)`); return {kind:'note', raw:r.raw}; }   // guardrail 15
        newCount++; if(newCount>WRITER_NEW_MAX){ notes.push(`${r.ex}: a third new movement, kept as a note`); return {kind:'note', raw:r.raw}; }   // guardrail 7
      }
      const best=writerBest(r.ex);
      r.lines=(r.lines||[]).map(l=>{
        if(l.nw||l.bw||isHold(l.su)||!(l.w>0)) return l;
        const kg=l.unit==='kg'?l.w:l.unit==='lb'?l.w/LB:toKg(l.w);
        if(best<=0){
          /* v3.3.405: NOTHING TO SCALE FROM MEANS NO NUMBER. ≈ says "a guess
             from a related lift"; when the whole muscle head is empty there is
             no related lift, and the number is invented. The writer offered
             ≈135 lb for a Standing Calf Raise on a ledger with no calf work at
             all -- a figure with nothing behind it, which the card would then
             print in the maker's own units as if it meant something. The app
             turns that into "by feel", which is the honest line and one the
             plan format already has (v3.3.394). */
          const head=exMuscle(r.ex, part);
          const headWork=((payload.coverage||{})[part]||{})[head]||0;
          if(!headWork){ notes.push(`${r.ex}: nothing on record for ${head}, so no number — by feel`);
            const {w:_w, est:_e, ...rest}=l; return {...rest, nw:true, w:0}; }              // guardrail 13
          if(!l.est){ notes.push(`${r.ex}: never lifted here, load marked ≈`); }
          return {...l, est:true};                                                          // guardrail 4
        }
        /* v3.3.402: THE BAND HAS ONE SIDE. It was symmetric, and the first
           live answer paid for it: a real Chest session came back with the
           maker's own warm-up ramp -- 95, 115, 145 under a 165 best -- and
           every warm-up line was clamped UP to 148.8 and marked as a guess.
           The card then showed four identical working sets where a ramp had
           been written. A load LIGHTER than your best is never a leap: it is
           a warm-up, a back-off, a drop set, a deload -- shapes this app
           already keeps (v3.3.280 keeps warm-up lines precisely because they
           are part of the session). Only the top needs bounding, and that is
           the side the guardrail was ever really about: never ask for weight
           nobody has lifted. Under the ceiling, the writer is trusted. */
        const hi=Math.max(best*(1+WRITER_LOAD_BAND), best+WRITER_STEP_KG);   // v3.3.407: one step is always allowed
        if(kg>hi){                                                                                                          // guardrail 3
          const shown=l.unit==='kg'?hi:l.unit==='lb'?hi*LB:(isLb()?hi*LB:hi);
          notes.push(`${r.ex}: ${l.w}${l.unit||''} is more than a step over your ${wDisp(best)} ${U()} best, clamped and marked ≈`);
          return {...l, w:+shown.toFixed(1), est:true};
        }
        return l;
      });
      /* v3.3.407: GOING BACKWARD NEEDS A REASON. The session's top working
         load, against last time's. Warm-ups are not working sets; a line
         with a parenthesised note -- (deload), (back-off), (sore shoulder) --
         has stated its reason. Anything else lighter than last time is a
         regression the writer did not explain, and the read-back says so.
         Flagged, not refused: the person may know why. */
      const ls=SEED.lastSess&&SEED.lastSess[r.ex];
      /* v3.3.416: THE READ-BACK SAYS WHAT IT DECIDED ON A REPEAT, AND WHY.
         The maker's Squat came back at 200 three times running, and nothing
         on his screen said which branch of this block had taken it -- so each
         time I guessed at a cause and fixed something adjacent. Now every
         exercise whose load matches last time's gets exactly one line in the
         notes: stepped up, held for a stated reason, held because reps rose,
         or held because reps rose. (An exercise never lifted here already says
         so through guardrail 3's note.) A repeat is never silent again, and the
         next screenshot is a diagnosis rather than a report. */
      const isWarm=l=>/warm/i.test((l.qual||'')+(l.tag||''));
      const work=(r.lines||[]).filter(l=>!l.nw&&!l.bw&&!isHold(l.su)&&l.w>0&&!isWarm(l));
      if(ls&&ls.rows&&ls.rows.length&&work.length){
        const kgOf=l=>l.unit==='kg'?l.w:l.unit==='lb'?l.w/LB:toKg(l.w);
        const top=Math.max(...work.map(kgOf)), lastTop=Math.max(...ls.rows.map(x=>+x[0]||0));
        const noteNames=(payload.note||'').toLowerCase().includes(r.ex.toLowerCase());
        const reasoned=(r.lines||[]).some(l=>l.qual&&!isWarm(l))||noteNames;   // "(warm-up)" is not a reason
        const nextTop=lastTop>0?nextFaceAbove(lastTop,r.ex):0;
        /* v3.3.417: A PARTIAL STEP IS NOT A STEP. The writer was still given
           the generic 5 lb pin/dumbbell increment and returned 200 after a
           195 Squat, and 160 after a 155 Romanian Deadlift. Those numbers are
           above the previous load, so the repeat guard below could not see
           them; but both sit between faces on this maker's 10 lb barbell
           grid. A writer-created load must be loadable: move only the top
           working line to the next face. Typed ledger weights stay untouched. */
        if(lastTop>0&&top>lastTop+0.3&&top<nextTop-0.3){
          const inUnit=l=>l.unit==='kg'?nextTop:l.unit==='lb'?nextTop*LB:(isLb()?nextTop*LB:nextTop);
          const shownOld=wDisp(top), shownNew=wDisp(nextTop);
          r.lines=(r.lines||[]).map(l=>{
            const isTop=!l.nw&&!l.bw&&!isHold(l.su)&&l.w>0&&!isWarm(l)&&Math.abs(kgOf(l)-top)<=0.3;
            return isTop?{...l,w:+inUnit(l).toFixed(1)}:l;
          });
          notes.push(`${r.ex}: ${shownOld} ${U()} falls between your last load and the next rack weight — stepped up to ${shownNew} ${U()}`);
        }else if(lastTop>0&&top<lastTop-0.3&&!reasoned)
          notes.push(`${r.ex}: written at ${wDisp(top)} ${U()}, under your last ${wDisp(lastTop)} ${U()}, with no reason given`);   // guardrail 14
        else if(lastTop>0&&Math.abs(top-lastTop)<=0.3){
          /* v3.3.416: TOTAL REPS AT THE TOP LOAD, not the first set. 14b and 16
             compared first sets, so "200 x 8 8 8 8" after "200 x 6 8 8 8" read
             as a rep-up (8 > 6) and held -- while "200 x 8 8 8 8" after "200 x
             8 8 8 8 8" read as equal first sets and bumped a session that had
             actually lost a set. The whole set at the top load is the work. */
        const sum=a=>a.reduce((x,y)=>x+y,0);
        const repsNow=sum(work.filter(l=>Math.abs(kgOf(l)-top)<=0.3).flatMap(l=>l.reps||[]));
        const repsLast=sum(ls.rows.filter(x=>Math.abs((+x[0]||0)-lastTop)<=0.3).flatMap(x=>x[1]||[]));
          if(reasoned){
            notes.push(`${r.ex}: held at ${wDisp(top)} ${U()} — reason given`);
          }else if(repsNow>repsLast){
            notes.push(`${r.ex}: held at ${wDisp(top)} ${U()}, reps up ${repsLast} → ${repsNow} — a push`);
          }else if(repsNow<repsLast){
            notes.push(`${r.ex}: same ${wDisp(top)} ${U()} for ${repsNow} total reps, under your last ${repsLast}, with no reason given`);   // guardrail 14b
          }else{
            /* GUARDRAIL 16 (v3.3.413): standing still needs a reason too. An
               exact repeat is CORRECTED, not flagged -- the next face above on
               the exercise's own grid (v3.3.414), named here. */
            const bumpedKg=nextFaceAbove(lastTop, r.ex);
            const inUnit=l=>l.unit==='kg'?bumpedKg:l.unit==='lb'?bumpedKg*LB:(isLb()?bumpedKg*LB:bumpedKg);
            const shownOld=wDisp(top), shownNew=wDisp(bumpedKg);
            r.lines=(r.lines||[]).map(l=>{
              const isTop=!l.nw&&!l.bw&&!isHold(l.su)&&l.w>0&&!isWarm(l)&&Math.abs(kgOf(l)-top)<=0.3;
              return isTop?{...l, w:+inUnit(l).toFixed(1)}:l;
            });
            notes.push(`${r.ex}: the writer repeated your last ${shownOld} ${U()} for ${repsNow} reps with no reason — stepped up to ${shownNew} ${U()}`);
          }
        }
      }
      return r;
    });
    /* ---- v3.3.432: THE TWO NEW LAWS, checked on the finished day ---------
       Both are FACTS the app can compute, so the app decides -- the model is
       never the last word on a date or a count. Neither is corrected in place:
       a wrong load has one arithmetic answer, a wrong DAY does not, so these
       mark the day for repair and the model rewrites it once (doctrine P4). */
    const dayParts=[...new Set(rows.filter(r=>r.kind==='ex'&&r.ex).map(r=>homePartOf(r.ex)).filter(Boolean))];
    const dayMajor=dayParts.filter(x=>!WRITER_CORE_PARTS.includes(x));
    const sk=(payload.skeleton||[]).find(x=>x.date===d.date);
    const violations=[];

    /* RULE 1 -- NO MAJOR PART INSIDE THE RECOVERY WINDOW. The Friday case:
       Legs on the morning after Deadlift 205x8888 and RDL 165x8/6/6. Two days
       on the maker's call -- his ledger has never repeated a major part inside
       48 h. Core exempt. A reason NAMING the part is still allowed to override:
       he may want it, and the app does not overrule a stated want. */
    for(const r of (sk&&sk.resting)||[]){
      if(!dayMajor.includes(r.part)) continue;
      const named=(payload.note||'').toLowerCase().includes(r.part.toLowerCase());
      if(named) continue;
      violations.push(`${r.part} was trained ${r.on} — ${WRITER_RECOVERY_DAYS} days' rest, and no reason names it`);
    }

    /* RULE 2 -- THE SESSION IS AT LEAST AS LONG AS YOUR SHORTEST. The writer
       wrote THREE exercises for a Friday; the maker's last thirteen sessions
       run 4-7. The floor is his MINIMUM, on his call: the honest reading of
       the record rather than a figure derived from it. Core does not count
       toward the floor -- it rides along and cannot fill a day. */
    const majorCount=rows.filter(r=>r.kind==='ex'&&r.ex&&!WRITER_CORE_PARTS.includes(homePartOf(r.ex))).length;
    if(payload.shape&&majorCount>0&&majorCount<payload.shape.min)
      violations.push(`${majorCount} exercise${majorCount===1?'':'s'}, and your shortest session is ${payload.shape.min}`);

    out.push({date:d.date, part, title:String(d.title||'').slice(0,60), rows, text:planTextFromRows(rows), violations});
  }
  if(!out.length) throw {refused:'no day matched the days you picked'};
  /* v3.3.432: the violations travel out with the result so writerGo can ask
     for ONE repair. They are also named in the read-back if the repair fails,
     so a day is never quietly wrong. */
  const violations=out.filter(x=>(x.violations||[]).length)
                      .map(x=>({date:x.date, why:x.violations}));
  /* v3.3.432: and they are named in the read-back, in the APP's voice --
     these are facts, not the writer's opinion (doctrine P7). */
  for(const v of violations)
    notes.push(`${planDayLabel(v.date)}: ${v.why.join('; ')}`);
  const reason=(resp.reason&&resp.reason.text)?{head:String(resp.reason.head||'').slice(0,60), text:String(resp.reason.text).slice(0,300)}:null;
  if(payload.scope==='day') return {rows:out[0].rows, text:out[0].text, date:out[0].date, part:out[0].part, reason, notes, violations, week:null};
  /* a week: the rows the preview shows, and the document it will save */
  const rows=[]; const wdays={};
  for(const d of out.sort((a,b)=>a.date<b.date?-1:1)){
    rows.push({kind:'day', iso:d.date, title:d.title, raw:weekDayHead(d.date,d.title), dayRaw:d.text});
    for(const r of d.rows) rows.push(r);
    wdays[d.date]={title:d.title, items:[], note:'', raw:d.text};
  }
  return {rows, week:{from:out[0].date, to:out[out.length-1].date, days:wdays, raw:rows.length?planTextFromRows(rows):''}, reason, notes, violations, date:out[0].date, part:null, text:planTextFromRows(rows)};
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
    <div class="mono muted" style="font-size:11px;line-height:1.5;padding:10px 2px 0">Eight weeks of your sets, every part, saved plans in this week, and this note go out to write it. Nothing comes back into your record; you read it first, like a paste.</div>`;
  /* v3.3.421: a rewrite says what it replaces, once, plainly. */
  if(o.scope==='week'&&o.rewrite&&o.days&&o.days.size){
    const ds=[...o.days].sort();
    body+=`<div class="mono" style="font-size:11px;line-height:1.5;padding:6px 2px 0;color:var(--record)">Replaces the saved week \u2014 ${planDayLabel(ds[0])} \u2192 ${planDayLabel(ds[ds.length-1])}.</div>`;
  }
  const label=o.busy?'Writing…':o.scope==='week'?`${o.rewrite?'Rewrite':'Write'} ${o.days?o.days.size:''} session${o.days&&o.days.size===1?'':'s'}`:`Write ${planDayLabel(o.scope==='tomorrow'?d1:todayISO)}`;
  const err=o.err?`<div class="mono writeerr" style="font-size:12px;color:var(--record);padding:10px 2px 0">${hesc(o.err)}</div>`:'';
  return `<h2>Write a session</h2><div class="card writecard">${seg}${body}${err}
    <div class="planacts" style="padding-left:0;padding-right:0">
      <button class="btn wide" data-writego ${o.busy||(o.scope==='week'&&!(o.days&&o.days.size))?'disabled':''} style="margin:0">${label}</button>
      <button class="btn ghost wide" data-writepaste style="margin:0">Paste one instead</button>
    </div>
    <button class="btn ghost" data-writeback style="margin-top:8px">Cancel</button></div>`;
}

/* ============ v3.3.406: THE WAIT IS A RECEIPT ============
   Tapping Write used to leave you on the ask screen with the button reading
   "Writing…" for six to thirteen seconds. The maker asked for a full screen
   that says so, with a touch of fun. The fun this app allows is its own
   material: the square that means a day (v3.3.378, one shape, one ratio), the
   writer's sparkle, one settle curve. So the screen is the eight weeks that
   are leaving the device, drawn as 56 squares -- seven across, one row per
   week -- lighting up one by one as they are "read", under the sparkle
   breathing. One mono line beneath says what is happening, and changes as
   the wait goes on, because a cold function takes ~13s and a spinner that
   says nothing for 13s is a lie of omission. No confetti, no exclamation
   marks, nothing red (red means live). Cancel at the bottom aborts the call
   and returns you to the ask screen with nothing changed. Reduced motion:
   every square lit, nothing moves. */
const WRITER_STAGES=[[0,'Reading eight weeks of sets'],[2500,'Weighing the rotation'],[5000,null],[9000,'First write in a while \u2014 waking the server'],[20000,'Still writing']];
function writerWaitHTML(){
  const o=writerState();
  const what=o.scope==='week'?'the week':planDayLabel(o.scope==='tomorrow'?tomorrowISO():todayISO);
  const sq=Array.from({length:56},(_,i)=>`<i class="wsq" style="--i:${i}"></i>`).join('');
  return `<div class="writing" data-what="${hesc(what)}">
    <div class="wspark">${icon('sparkle',ICON_SZ.hero)}</div>
    <div class="wgrid" aria-hidden="true">${sq}</div>
    <div class="mono wline" id="writeLine">${WRITER_STAGES[0][1]}</div>
    <button class="btn ghost" data-writecancel>Cancel</button>
  </div>`;
}
let _writeTick=null, _writeT0=0;
function writerWaitStart(){
  _writeT0=Date.now(); clearInterval(_writeTick);
  _writeTick=setInterval(()=>{
    const el=document.getElementById('writeLine'); if(!el){ clearInterval(_writeTick); return; }
    const t=Date.now()-_writeT0; const what=(el.closest('.writing')||{}).dataset.what||'';
    let line=WRITER_STAGES[0][1];
    for(const [at,txt] of WRITER_STAGES) if(t>=at) line=txt===null?`Writing ${what}`:txt;
    if(el.textContent!==line) el.textContent=line;
  },500);
}
function writerWaitStop(){ clearInterval(_writeTick); _writeTick=null; }

/* tap Write: build, call, check, hand to the preview */
async function writerGo(){
  const o=writerState(); if(o.busy) return;
  const ta=document.getElementById('writeNote'); if(ta) o.note=ta.value;
  if(o.scope==='week') writerDays(o);
  const payload=writerPayload(o);
  o.busy=true; o.err=''; o.cancelled=false; lift.plan='writing'; render(); writerWaitStart();
  try{
    /* An already-planned week needs no model call: merge and show the fixed
       blocks immediately. This keeps "Write" harmless and reviewable. */
    const resp=o.scope==='week'&&!payload.days.length?{days:[],reason:null}:await writeSession(payload);
    if(o.cancelled) return;
    const merged=writerResponseWithLocked(resp,payload);
    const checkedPayload=payload.selected_days?{...payload,days:payload.selected_days}:payload;
    let chk=writerCheck(merged,{payload:checkedPayload});
    /* v3.3.432: ONE REPAIR, NOT A NEGOTIATION. A wrong load has one arithmetic
       answer and is corrected in place. A wrong DAY -- the wrong part, or too
       few exercises -- does not: the app has no taste for choosing exercises,
       and inventing them here would be the app doing the model's job badly.
       So the violation is named back to the same writer and it rewrites those
       days only, once. If the repair still violates, the read-back says so and
       the day stands as written rather than being silently dropped -- the
       person decides, with the fault in front of him. */
    if((chk.violations||[]).length && !o.cancelled){
      const bad=new Set(chk.violations.map(v=>v.date));
      const fixNote=[
        (payload.note||'').trim(),
        'REWRITE ONLY THESE DAYS, leaving every other day exactly as written:',
        ...chk.violations.map(v=>`${v.date}: ${v.why.join('; ')}.`),
        'Respect payload.skeleton: never use a part listed as resting, and give each day at least payload.shape.min exercises outside core.'
      ].filter(Boolean).join('\n');
      const p2={...payload, note:fixNote.slice(0,900), days:payload.days.filter(d=>bad.has(d))};
      try{
        const r2=await writeSession(p2);
        if(!o.cancelled&&r2&&(r2.days||[]).length){
          const kept=(merged.days||[]).filter(d=>!bad.has(d.date));
          const fixed=(r2.days||[]).filter(d=>bad.has(d.date));
          const chk2=writerCheck({...merged, days:[...kept,...fixed]},{payload:checkedPayload});
          /* the repair is taken only if it is actually better */
          if((chk2.violations||[]).length < chk.violations.length) chk=chk2;
        }
      }catch(e){ /* a failed repair leaves the first answer, faults named */ }
    }
    lift.planSource='writer'; lift.planReason=chk.reason; lift.planNotes=chk.notes;
    lift.planText=chk.text; lift.planRows=chk.rows; lift.planDate=chk.date;
    if(chk.week){ lift.planMode='week'; lift.planWeek=chk.week; } else { lift.planMode='day'; lift.planWeek=null; }
    writerWaitStop(); lift.plan='preview'; o.busy=false;
    render();
  }catch(e){
    writerWaitStop(); o.busy=false;
    /* v3.3.406: a cancel is not a failure -- back to the ask screen, quietly */
    if(o.cancelled){ lift.plan='write'; o.err=''; return render(); }
    lift.plan='write';
    const msg=(e&&e.refused)?`The writer’s answer was refused: ${e.refused}. Nothing was saved.`
      :(e&&e.name==='AbortError')?'That took too long. The first write in a while is the slow one — tap Write again.'
      :(e&&/offline|Failed to fetch|NetworkError/i.test(String(e&&e.message)))?'Needs signal. The rotation still has an answer.'
      :`Could not write (${String(e&&e.message||e).slice(0,60)}).`;
    o.err=msg; render();
  }
}
