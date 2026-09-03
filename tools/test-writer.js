// test-writer.js DIR — v3.3.400. THE SESSION WRITER, with the model stubbed.
// The contract is assertable without asserting text: what leaves the device,
// what the guardrails do to what comes back, and how the ask screen behaves.
// WRITER_STUB replaces the network; every response below is a stub, and the
// probes are the same as always: revert a guardrail, watch its line go red.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only",
  pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){
  return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})}); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);
const tick = () => new Promise(r => setTimeout(r, 20));

let fail = 0;
const ok = (name, cond, note) => {
  console.log((cond ? "PASS" : "FAIL"), name, note ? "→ " + note : "");
  if (!cond) fail++;
};

/* a ledger: eight weeks of Back / Chest / Legs, Deadlift best 100 kg, no shoulders ever */
run(`(function(){DB.days={}; DB.plan=null; DB.week=null; DB.suggest=null; delete DB.settings.dayDone; delete DB.settings.objective;
  DB.settings.myParts=['Back','Chest','Legs','Shoulder'];
  for(let i=1;i<=56;i++){ const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-i); const iso=d.toLocaleDateString('en-CA');
    const k=i%3; if(d.getDay()===0) continue;
    DB.days[iso]={w:[k===0?{part:'Back',ex:'Deadlift',w:i%9===0?100:90,reps:[5,5,5],at:1}:k===1?{part:'Chest',ex:'Barbell Bench Press',w:70,reps:[8,8],at:1}:{part:'Legs',ex:'Squat',w:95,reps:[8,8],at:1}],upd:1}; }
  DB.settings.unit='lb'; DB.settings.onboarded=true; SEED=deriveAll(); view='today'; lift.plan=null; lift.write=null; render();})()`);

/* ---- the door ---- */
ok("the plan line's door is Write, with the sparkle", run(`(function(){const b=document.querySelector('[data-planwrite]'); return !!b && !!b.querySelector('.ic-sparkle') && /Write/.test(b.textContent);})()`));
run(`document.querySelector('[data-planwrite]').click()`);
ok("tapping it opens the ask screen", run(`lift.plan==='write' && !!document.querySelector('.writecard')`));
ok("...three scopes: today, tomorrow, this week", run(`document.querySelectorAll('[data-writescope]').length`)===3);
ok("...with nothing logged, the ledger picks today", run(`writerState().scope==='today'`) && run(`document.querySelector('[data-writescope="today"]').classList.contains('sel')`));
ok("...For defaults to the writer's call and names the rotation's pick beside it",
   run(`writerState().part==='auto'`) && /rotation says/.test(run(`document.querySelector('.writecard').textContent`)));
ok("...the objective defaults to Grow and is remembered when tapped",
   run(`writerState().objective==='grow'`) && (run(`document.querySelector('[data-writeobj="strength"]').click(); DB.settings.objective`)==='strength'));
ok("...the privacy line says what leaves", /Eight weeks of your sets, every part/.test(run(`document.querySelector('.writecard').textContent`)));
ok("Paste one instead is the old door, one tap on", run(`(function(){document.querySelector('[data-writepaste]').click(); return lift.plan==='paste';})()`));
run(`(function(){lift.plan=null; render(); document.querySelector('[data-planwrite]').click();})()`);
ok("Cancel returns to Today with nothing changed", run(`(function(){document.querySelector('[data-writeback]').click(); return lift.plan===null && !DB.plan;})()`));

/* ---- the ledger rule on the seg ---- */
run(`(function(){day(todayISO).w.push({part:'Chest',ex:'Barbell Bench Press',w:70,reps:[8],at:1}); save(true); lift.write=null; lift.plan='write'; render();})()`);
ok("with a set in the record, the seg defaults to tomorrow", run(`writerState().scope==='tomorrow'`));
ok("...and says why", /in the record already|writes .* and opens it at midnight/.test(run(`(function(){document.querySelector('[data-writescope="today"]').click(); return document.querySelector('.writecard').textContent;})()`)));
run(`(function(){DB.days[todayISO].w=[]; save(true); lift.write=null; lift.plan='write'; render();})()`);

/* ---- what leaves the device ---- */
const pay = JSON.parse(run(`JSON.stringify(writerPayload(writerState()))`));
ok("the payload is a day for today with the rotation's ranking", pay.scope==='day' && pay.days.length===1 && pay.days[0]===run(`todayISO`) && !!pay.rotation.pick && pay.rotation.ranking.length>=3);
ok("...the part is null: the writer's call", pay.part===null);
ok("...eight weeks of sets, every part, nothing older", pay.history.length>40 && pay.history.every(h=>h[0]>=run(`(function(){const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-56); return d.toLocaleDateString('en-CA');})()`)));
ok("...the catalog for the parts you train, nothing else", Object.keys(pay.catalog).sort().join()==='Back,Chest,Legs,Shoulder');
ok("...a coverage table with the zero-set heads spelled out", pay.coverage.Shoulder && Object.values(pay.coverage.Shoulder).every(v=>v===0) && pay.coverage.Back && Object.values(pay.coverage.Back).some(v=>v>0));
/* v3.3.405: the app has always known which head an exercise trains; the writer
   was only ever handed the counts, never the mapping, and put a Dip in an
   incline session. The mapping goes out now. */
ok("...and which head each catalog exercise trains, grouped by head",
   !!pay.heads && !!pay.heads.Chest && Object.keys(pay.heads.Chest).length>=2, JSON.stringify(Object.keys(pay.heads||{})));
ok("...so an incline press and a Dip are visibly different movements",
   pay.heads.Chest['upper-chest'].includes('Incline Barbell Bench Press') &&
   pay.heads.Chest['chest'].includes('Dip') &&
   !pay.heads.Chest['upper-chest'].includes('Dip'), JSON.stringify(pay.heads.Chest));
ok("...and every catalog exercise is placed, none left out",
   Object.entries(pay.catalog).every(([p2,list])=>{ const flat=Object.values(pay.heads[p2]||{}).flat();
     return list.every(ex=>flat.includes(ex)); }));
ok("...and neither a name nor a day count", !JSON.stringify(pay).includes('"name"') && !('sessions' in pay) && !('totals' in pay));
ok("...under 60 KB", JSON.stringify(pay).length<60000, JSON.stringify(pay).length+' bytes');

/* v3.3.419: ONE DAY MUST SEE THE REST OF ITS WEEK. Reproduce the maker's
   exact situation: ask on Thursday with Chest + Core saved for Friday and
   Arms + Core saved for Saturday. These future blocks are context, not days
   the one-day answer is allowed to replace. */
const weekAwarePay = JSON.parse(run(`(function(){
  const realToday=todayISO, oldWeek=DB.week, oldPlan=DB.plan, oldWrite=lift.write;
  todayISO='2026-09-02'; lift.write=null;
  DB.plan=null; DB.week={from:'2026-09-04',to:'2026-09-05',days:{
    '2026-09-04':{title:'Chest B (flat) + Laterals + Core',items:[
      {ex:'Barbell Bench Press',lines:[{w:70,bw:false,reps:[8,8,6,6]}]},
      {ex:'Lateral Raise',lines:[{w:14,bw:false,reps:[15,15,12]}]},
      {ex:'Hanging Leg Raise',lines:[{w:0,bw:true,reps:[12,10,10]}]},
      {ex:'Cable Crunch',lines:[{w:0,nw:true,reps:[15,12,12]}]}]},
    '2026-09-05':{title:'Arms + Rear Delts + Core',items:[
      {ex:'EZ Bar Curl',lines:[{w:23,bw:false,reps:[10,10,10,10]}]},
      {ex:'Skull Crusher',lines:[{w:18,bw:false,reps:[12,10,10,10]}]},
      {ex:'Rear Deltoids',lines:[{w:11,bw:false,reps:[15,15,12]}]},
      {ex:'Decline Sit Up',lines:[{w:0,bw:true,reps:[12,12,10]}]}]}
  }};
  const o=writerState(); o.scope='tomorrow'; const p=writerPayload(o);
  DB.week=oldWeek; DB.plan=oldPlan; todayISO=realToday; lift.write=oldWrite; SEED=deriveAll();
  return JSON.stringify(p);
})()`));
ok("...a one-day request carries every remaining date through Sunday",
   weekAwarePay.scope==='day' && weekAwarePay.days.join()==='2026-09-03' &&
   weekAwarePay.week_context[0].date==='2026-09-03' && weekAwarePay.week_context.at(-1).date==='2026-09-06',
   JSON.stringify(weekAwarePay.week_context));
const friContext=weekAwarePay.week_context.find(x=>x.date==='2026-09-04');
const satContext=weekAwarePay.week_context.find(x=>x.date==='2026-09-05');
ok("...saved Friday and Saturday plans are fixed context, with exercises and parts",
   friContext && !friContext.requested && friContext.planned.parts.includes('Chest') && friContext.planned.parts.includes('Sixpack') &&
   satContext && !satContext.requested && satContext.planned.parts.includes('Biceps') && satContext.planned.parts.includes('Triceps') && satContext.planned.parts.includes('Sixpack'),
   JSON.stringify([friContext,satContext]));
ok("...the requested Thursday is writable rather than mistaken for a fixed plan",
   weekAwarePay.week_context[0].requested===true && weekAwarePay.week_context[0].planned===null);
ok("...recent whole sessions preserve exercise order instead of isolated rows",
   Array.isArray(pay.recent_sessions) && pay.recent_sessions.length>0 && pay.recent_sessions.every(s=>Array.isArray(s.exercises)) &&
   pay.recent_sessions.some(s=>s.exercises.some(x=>x.exercise==='Deadlift')),
   JSON.stringify(pay.recent_sessions&&pay.recent_sessions[0]));
ok("...and a leg session keeps its exact compound-to-accessory order",
   run(`writerRecentSessions([['2026-09-01','Legs','Squat'],['2026-09-01','Legs','Romanian Deadlift'],['2026-09-01','Legs','Dumbbell Lunge'],['2026-09-01','Legs','Standing Calf Raise'],['2026-09-01','Sixpack','Hanging Leg Raise']])[0].exercises.map(x=>x.exercise).join('|')`)
   ==='Squat|Romanian Deadlift|Dumbbell Lunge|Standing Calf Raise|Hanging Leg Raise');
ok("...and recent weeks expose the split in calendar order, not as a bag of parts",
   Array.isArray(pay.recent_weeks) && pay.recent_weeks.length>0 && pay.recent_weeks.every(w=>w.days.every((d,i,a)=>!i||a[i-1].date<=d.date)));

/* v3.3.420: selecting a saved day in This week no longer grants the model
   permission to replace it. Only Thursday leaves the device as writable;
   Friday and Saturday are merged back from their accepted plan items. */
const lockedWeekPay=JSON.parse(run(`(function(){
  const realToday=todayISO, oldWeek=DB.week, oldPlan=DB.plan, oldWrite=lift.write;
  todayISO='2026-09-02'; lift.write=null; DB.plan=null;
  DB.week=${JSON.stringify({from:'2026-09-04',to:'2026-09-05',days:{
    '2026-09-04':{title:'Chest B (flat) + Laterals + Core',items:[
      {ex:'Barbell Bench Press',lines:[{w:70,bw:false,reps:[8,8,6,6]}]},
      {ex:'Dip',lines:[{w:20,bw:true,reps:[10,8,8]}]},
      {ex:'Lateral Raise',lines:[{w:14,bw:false,reps:[15,15,12]}]},
      {ex:'Plank',lines:[{w:0,bw:true,su:'s',reps:[60,60,60]}]}]},
    '2026-09-05':{title:'Arms + Rear Delts + Core',items:[
      {ex:'EZ Bar Curl',lines:[{w:23,bw:false,reps:[10,10,10,10]}]},
      {ex:'Skull Crusher',lines:[{w:18,bw:false,reps:[12,10,10,10]}]},
      {ex:'Dumbbell Curl',lines:[{w:14,bw:false,reps:[10,10,10]}]},
      {ex:'Rear Deltoids',lines:[{w:11,bw:false,reps:[15,15,12]}]},
      {ex:'Decline Sit Up',lines:[{w:0,bw:true,reps:[12,12,10]}]}]}}})};
  const o=writerState(); o.scope='week'; o.days=new Set(['2026-09-03','2026-09-04','2026-09-05']);
  const p=writerPayload(o);
  DB.week=oldWeek; DB.plan=oldPlan; todayISO=realToday; lift.write=oldWrite; SEED=deriveAll();
  return JSON.stringify(p);
})()`));
ok("v3.3.420 · a selected saved Friday and Saturday are locked; only blank Thursday is writable",
   lockedWeekPay.selected_days.join()==='2026-09-03,2026-09-04,2026-09-05' &&
   lockedWeekPay.days.join()==='2026-09-03' && lockedWeekPay.locked_days.map(x=>x.date).join()==='2026-09-04,2026-09-05',
   JSON.stringify({write:lockedWeekPay.days,locked:lockedWeekPay.locked_days.map(x=>x.date)}));
const keptWeek=JSON.parse(run(`(function(){
  const p=${JSON.stringify(lockedWeekPay)};
  const model={days:[
    {date:'2026-09-03',part:'Legs',title:'Legs + Core',text:'Squat\\n  205 lb x 8 8 8 8\\n\\nRomanian Deadlift\\n  165 lb x 10 10 10\\n\\nDumbbell Lunge\\n  40 lb x 8 8 8\\n\\nStanding Calf Raise\\n  by feel x 15 15 15 15\\n\\nCable Crunch\\n  by feel x 15 12 12'},
    {date:'2026-09-04',part:'Shoulder',title:'Shoulder',text:'Dumbbell Shoulder Press\\n  60 lb x 8 8 8 8'},
    {date:'2026-09-05',part:'Chest',title:'Chest',text:'Barbell Bench Press\\n  165 lb x 6 6 6 6'}]};
  const merged=writerResponseWithLocked(model,p);
  const checked=writerCheck(merged,{payload:{...p,days:p.selected_days}});
  return JSON.stringify({text:checked.text,dates:Object.keys(checked.week.days),titles:checked.rows.filter(x=>x.kind==='day').map(x=>x.title)});
})()`));
ok("...the model cannot swap Friday to Shoulder or Saturday to Chest",
   keptWeek.dates.join()==='2026-09-03,2026-09-04,2026-09-05' &&
   keptWeek.titles.join('|')==='Legs + Core|Chest B (flat) + Laterals + Core|Arms + Rear Delts + Core' &&
   /EZ Bar Curl/.test(keptWeek.text) && /Barbell Bench Press/.test(keptWeek.text) && !/Dumbbell Shoulder Press/.test(keptWeek.text),
   JSON.stringify(keptWeek.titles));
const writerServer=fs.readFileSync(path.join(dir,'supabase','functions','write-session','index.ts'),'utf8');
ok("...the coach is explicitly ordered week first, shape second, progression third",
   /ORDER OF DECISIONS — WEEK, SHAPE, THEN PROGRESSION/.test(writerServer) &&
   /1\. WEEK FIRST[\s\S]*2\. SESSION SHAPE SECOND[\s\S]*3\. PROGRESSION THIRD/.test(writerServer));
ok("...core may run consecutively, but exact movements must rotate",
   /core is the exception to the recovery spacing rule/i.test(writerServer) &&
   /high frequency is not identical repetition/i.test(writerServer));
ok("...new movements cannot displace the established session",
   /novelty never displaces a recurring exercise/i.test(writerServer) &&
   /it may not replace a recurring movement/i.test(writerServer));
ok("...the prompt keeps weekly cadence ahead of rotation and makes calves a leg-day role",
   /WEEKLY CADENCE:[\s\S]*Continue that cadence before consulting rotation\.ranking/.test(writerServer) &&
   /LEG DAY CONTRACT:[\s\S]*one calf movement/.test(writerServer));

/* ---- guardrails on stubbed answers ---- */
const check = (resp) => run(`(function(){try{ const o=writerState(); const p=writerPayload(o); const r=writerCheck(${JSON.stringify(resp)},{payload:p});
  return JSON.stringify({ok:true, ex:r.rows.filter(x=>x.kind==='ex'&&x.ex).map(x=>x.ex), notes:r.notes, reason:r.reason, est:r.rows.filter(x=>x.kind==='ex'&&x.ex).map(x=>({ex:x.ex,est:x.lines.some(l=>l.est),w:x.lines[0]&&x.lines[0].w,ws:x.lines.map(l=>l.w)}))});
  }catch(e){ return JSON.stringify({ok:false, refused:e.refused||String(e)}); }})()`);
const today = run(`todayISO`);
let r = JSON.parse(check({days:[{date:today,part:'Back',title:'Back',text:"Deadlift\n  220 lb x 5 5 5\n\nBent-Over Row\n  175 lb x 10 10\n\nCable Pullover\n  40 lb x 12 12"}]}));
ok("1 · a name not in your catalog survives as a note, never an item", r.ok && r.ex.join()==='Deadlift,Bent-Over Row' && r.notes.some(n=>/Cable Pullover/.test(n)), JSON.stringify(r.notes));
r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Barbell Bench Press\n  155 lb x 8 8\n\nCable Fly Down"}],reason:{head:'Chest, not Back',text:'chest is due'}}));
/* v3.3.422 RESTATES 1b. It refused the WHOLE answer over one exercise -- a
   three-session week thrown away for one plank. The guardrail's purpose (the
   writer may not hand back names without prescriptions) is kept where it
   bites: a day with NOTHING readable is refused. One unreadable line among
   readable ones is kept as a note and named in the read-back. Proportion. */
ok("1b · a known exercise with no prescription is kept as a note and named, not shown as a plausible plan",
   r.ok && r.ex.join()==='Barbell Bench Press' && r.notes.some(n=>/Cable Fly Down: its line could not be read — kept as a note/.test(n)), JSON.stringify(r.notes)+' '+r.refused);
r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Cable Fly Down\n\nBarbell Bench Press"}],reason:{head:'Chest, not Back',text:'chest is due'}}));
ok("1c · a day with NOTHING readable is still refused",
   !r.ok && /has no sets, reps, or time, and nothing else/.test(r.refused), r.refused);
/* v3.3.422: THE PROMPT AND THE PARSER AGREE ON A HOLD. The prompt's own
   example for a timed hold is "BW x 60 sec x 3"; PLAN_TIME never accepted the
   leading BW, so every plank the writer wrote became an exercise with no sets
   and refused its session. This is the contract test that was missing: the
   literal example the function gives the model must parse on the client. */
{
  const fn=fs.readFileSync(path.join(dir,"supabase/functions/write-session/index.ts"),"utf8");
  const ex=(fn.match(/a timed hold is "([^"]+)"/)||[])[1];
  ok("the prompt names a hold format", !!ex, ex);
  if(ex){
    const got=run(`(function(){const r=parsePlan("Plank\\n  "+${JSON.stringify(ex)}); const e=r.find(x=>x.ex==='Plank'); return e?e.kind+':'+(e.lines&&e.lines[0]?e.lines[0].su+':'+e.lines[0].reps.join(','):''):'none';})()`);
    ok("...and the parser reads that exact format as a hold", /^ex:s:60,60,60$/.test(got), got);
  }
  /* the fixture's ledger has Chest; a plank riding along on a chest day is
     exactly how the week writer places core (v3.3.420) */
  r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Barbell Bench Press\n  155 lb x 8 8\n\nPlank\n  BW x 60 sec x 3"}],reason:{head:'Chest',text:'chest is due'}}));
  ok("...so a week with a plank is no longer refused", r.ok && r.ex.includes('Plank'), r.refused||JSON.stringify(r.ex));
}
r = JSON.parse(check({days:[{date:today,part:'Shoulder',title:'Shoulder',text:"Lateral Raise\n  by feel x 12 12"}]}));
ok("2 · a part that differs from the rotation's without a reason is refused whole", !r.ok && /without a reason/.test(r.refused), r.refused);
r = JSON.parse(check({days:[{date:today,part:'Shoulder',title:'Shoulder',text:"Lateral Raise\n  by feel x 12 12"}],reason:{head:'Shoulder, not Back',text:'Nothing on record for shoulders in eight weeks.'}}));
ok("...and with a reason it is kept, reason and all", r.ok && r.reason && r.reason.head==='Shoulder, not Back');
r = JSON.parse(check({days:[{date:today,part:'Biceps',title:'Arms',text:"Barbell Curl\n  50 lb x 10"}],reason:{head:'x',text:'y'}}));
ok("...a part you do not train is refused", !r.ok && /not one you train/.test(r.refused), r.refused);
r = JSON.parse(check({days:[{date:today,part:'Back',title:'Back',text:"Deadlift\n  315 lb x 5"}]}));
ok("3 · a load more than 10% above the eight-week best is clamped and marked ≈", r.ok && r.est[0].est===true && Math.abs(r.est[0].w-242.5)<1.5, JSON.stringify(r.est)+' '+JSON.stringify(r.notes));
r = JSON.parse(check({days:[{date:today,part:'Back',title:'Back',text:"Deadlift\n  230 lb x 5"}]}));
ok("...under the ceiling it passes untouched", r.ok && !r.est[0].est && r.est[0].w===230);
/* v3.3.407: PUSH. The live writer wrote 50 lb after a 50 lb x 10 10 9 9 session
   and 15 lb after a 20 lb one. Three causes, three fixes: the writer never saw
   last time per exercise (it does now: payload.last); a 10% band forbade the
   only step a light load has (20 lb x 10% = 2 lb, the pin is 5: one step is
   always allowed); and going backward cost nothing (it is flagged now). */
ok("payload.last is last time, per exercise, as [date, [[load, [reps per set]]...]]",
   !!pay.last && !!pay.last.Deadlift && JSON.stringify(pay.last.Deadlift[1])==='[[198.4,[5,5,5]]]' && /^\d{4}-\d\d-\d\d$/.test(pay.last.Deadlift[0]),
   JSON.stringify(pay.last && pay.last.Deadlift));
/* v3.3.409: the live writer, handed 22.68 kg under "Unit: lb", added its step
   in kg and wrote "25 lb". Every load leaves in the unit the writer writes in. */
ok("...every load leaves in your unit, best and history too: 100 kg is 220.5 lb",
   pay.unit==='lb' && pay.best.Deadlift===220.5 && pay.history.some(h=>h[2]==='Deadlift'&&h[3]===220.5) && !pay.history.some(h=>h[2]==='Deadlift'&&(h[3]===100||h[3]===90)),
   JSON.stringify([pay.best.Deadlift, pay.history.find(h=>h[2]==='Deadlift')]));
ok("...and the step is named in that unit", pay.step===5);
ok("...and each exercise carries its own real increment", pay.steps.Squat===10 && pay.steps['Romanian Deadlift']===10 && pay.steps['Cable Fly Up']===5,
   JSON.stringify({Squat:pay.steps.Squat,RDL:pay.steps['Romanian Deadlift'],Cable:pay.steps['Cable Fly Up']}));
ok("...and the next loadable barbell weight is computed, not guessed", pay.next.Squat===215,
   JSON.stringify({last:pay.last.Squat,next:pay.next.Squat}));
ok("...in kg it is 2.5", run(`(function(){DB.settings.unit='kg'; const p=writerPayload(writerState()); DB.settings.unit='lb'; return p.step===2.5 && p.best.Deadlift===100 && p.last.Deadlift[1][0][0]===90;})()`));
/* a light cable lift: 20 lb once, last week */
run(`(function(){const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-1); const iso=d.toLocaleDateString('en-CA');
  DB.days[iso].w.push({part:'Chest',ex:'Cable Fly Up',w:20/LB,reps:[10,10],at:2}); save(true); SEED=deriveAll();})()`);
const chestReason = {head:'Chest, not Back',text:'chest is furthest out'};
r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Barbell Bench Press\n  155 lb x 8\n\nCable Fly Up\n  25 lb x 12 10 10"}],reason:chestReason}));
ok("3b · one step over a light best passes, even past 10%: 20 lb may become 25", r.ok && r.est[1].ex==='Cable Fly Up' && !r.est[1].est && r.est[1].w===25 && !r.notes.some(n=>/Cable Fly Up/.test(n)), JSON.stringify(r.est)+' '+JSON.stringify(r.notes));
r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Barbell Bench Press\n  155 lb x 8\n\nCable Fly Up\n  35 lb x 12 10 10"}],reason:chestReason}));
ok("...two steps is still a leap: clamped, ≈, and the note says a step", r.ok && r.est[1].est===true && r.est[1].w<26 && r.notes.some(n=>/Cable Fly Up.*more than a step/.test(n)), JSON.stringify(r.est)+' '+JSON.stringify(r.notes));
r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Barbell Bench Press\n  155 lb x 8\n\nCable Fly Up\n  15 lb x 10 10 10"}],reason:chestReason}));
ok("14 · a session top under last time's, with no reason, is flagged in the notes", r.ok && r.est[1].w===15 && r.notes.some(n=>/Cable Fly Up: written at 15 lb, under your last 20 lb, with no reason given/.test(n)), JSON.stringify(r.notes));
r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Barbell Bench Press\n  155 lb x 8\n\nCable Fly Up\n  15 lb x 10 10 10 (deload)"}],reason:chestReason}));
ok("...a parenthesised reason on the line clears it", r.ok && !r.notes.some(n=>/no reason given/.test(n)), JSON.stringify(r.notes));
r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Barbell Bench Press\n  95 lb x 5 (warm-up)\n  155 lb x 8\n\nCable Fly Up\n  10 lb x 12 (warm-up)\n  15 lb x 10 10 10"}],reason:chestReason}));
ok("...a warm-up note is not a reason, and a warm-up line is not the top", r.ok && r.notes.some(n=>/Cable Fly Up: written at 15 lb.*no reason given/.test(n)) && !r.notes.some(n=>/Barbell Bench Press/.test(n)), JSON.stringify(r.notes));
r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Barbell Bench Press\n  155 lb x 8\n\nCable Fly Up\n  20 lb x 12 12 11"}],reason:chestReason}));
ok("...holding the load with more reps is not going backward", r.ok && !r.notes.some(n=>/no reason given/.test(n)), JSON.stringify(r.notes));
/* v3.3.408: the live writer, told to push, wrote 50 x 6 6 6 6 after 50 x 10 10 9 9:
   the reps of a step down with none of the load. Same load, fewer reps on the
   first working set is the other way backward. */
r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Barbell Bench Press\n  155 lb x 8\n\nCable Fly Up\n  20 lb x 6 6 6"}],reason:chestReason}));
/* v3.3.416: 14b compares TOTAL reps at the top load, not the first set. 6 6 6 is 18 against last time's 20. */
ok("14b · the same load for fewer reps, with no reason, is flagged too", r.ok && r.notes.some(n=>/Cable Fly Up: same 20 lb for 18 total reps, under your last 20, with no reason given/.test(n)), JSON.stringify(r.notes));
/* v3.3.413: GUARDRAIL 16 -- STANDING STILL NEEDS A REASON TOO. The live
   writer, told to push, wrote Squat 200 and RDL 160: last time's load, last
   time's reps, no note. 14 catches backward, 14b catches fewer reps, and an
   exact repeat walked through both. It is CORRECTED, not flagged: one step up
   on the exercise's own grid, named in the read-back. Cable Fly Up's last was
   20 lb x 10 10; a cable's step is 5 lb in lb. */
r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Barbell Bench Press\n  155 lb x 8\n\nCable Fly Up\n  20 lb x 10 10"}],reason:chestReason}));
ok("16 · an exact repeat of last time, with no reason, is stepped up on the grid",
   r.ok && r.est[1].ex==='Cable Fly Up' && r.est[1].w===25, JSON.stringify(r.est[1]));
ok("...and the read-back says so, naming both loads",
   r.notes.some(n=>/Cable Fly Up: the writer repeated your last 20 lb for 20 reps with no reason — stepped up to 25 lb/.test(n)), JSON.stringify(r.notes));
ok("...without marking it as a clamped guess -- it is a rule, not an estimate",
   !r.est[1].est);
r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Barbell Bench Press\n  155 lb x 8\n\nCable Fly Up\n  20 lb x 10 10 (hold — shoulder)"}],reason:chestReason}));
ok("...a stated reason lets the writer hold the load",
   r.ok && r.est[1].w===20 && !r.notes.some(n=>/stepped up/.test(n)), JSON.stringify(r.est[1])+' '+JSON.stringify(r.notes));
r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Barbell Bench Press\n  155 lb x 8\n\nCable Fly Up\n  20 lb x 12 12"}],reason:chestReason}));
ok("...and more reps at the same load is already a push -- left alone",
   r.ok && r.est[1].w===20 && !r.notes.some(n=>/stepped up/.test(n)), JSON.stringify(r.est[1]));
/* v3.3.414: the push reads the NEXT FACE ABOVE, not last plus the stepper.
   On a cable the two agree (20 -> 25). On a barbell in lb they do not: the
   stepper is 10, the bar is 45, the faces are 195 / 205 / 215, and a logged
   200 sits BETWEEN faces. Last plus the stepper says 210 -- a weight that is
   not on the rack. The face above 200 is 205. This is the maker's own Squat. */
run(`(function(){const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-1); const iso=d.toLocaleDateString('en-CA');
  DB.days[iso].w.push({part:'Legs',ex:'Squat',w:200/LB,reps:[8,8,8,8],at:3}); save(true); SEED=deriveAll();})()`);
r = JSON.parse(check({days:[{date:today,part:'Legs',title:'Legs',text:"Squat\n  200 lb x 8 8 8 8"}],reason:{head:'Legs',text:'legs are due'}}));
ok("16b · a barbell repeat steps to the next FACE above, not last plus the stepper",
   r.ok && r.est[0].ex==='Squat' && r.est[0].w===205, JSON.stringify(r.est[0]));
ok("...and the read-back names 205",
   r.notes.some(n=>/Squat: the writer repeated your last 200 lb for 32 reps with no reason — stepped up to 205 lb/.test(n)), JSON.stringify(r.notes));
/* v3.3.416: A REPEAT IS NEVER SILENT. Three screenshots of 200 and nothing on
   screen said which branch had taken it. Every matched load now gets one line. */
r = JSON.parse(check({days:[{date:today,part:'Legs',title:'Legs',text:"Squat\n  200 lb x 8 8 8 8 8"}],reason:{head:'Legs',text:'legs are due'}}));
ok("16d · more total reps at the same load is a push, and the read-back says so",
   r.ok && r.est[0].w===200 && r.notes.some(n=>/Squat: held at 200 lb, reps up 32 → 40 — a push/.test(n)), JSON.stringify(r.notes));
/* first-set coincidence must not excuse a lost set: 8 8 8 (24) after 8 8 8 8 (32) */
r = JSON.parse(check({days:[{date:today,part:'Legs',title:'Legs',text:"Squat\n  200 lb x 8 8 8"}],reason:{head:'Legs',text:'legs are due'}}));
ok("...and a lost set with the same first set is flagged, not bumped",
   r.ok && r.est[0].w===200 && r.notes.some(n=>/Squat: same 200 lb for 24 total reps, under your last 32/.test(n)), JSON.stringify(r.notes));
/* a stated reason is named as the reason for the hold */
r = JSON.parse(check({days:[{date:today,part:'Legs',title:'Legs',text:"Squat\n  200 lb x 8 8 8 8 (knee)"}],reason:{head:'Legs',text:'legs are due'}}));
ok("...and a held load with a reason says 'reason given'",
   r.ok && r.est[0].w===200 && r.notes.some(n=>/Squat: held at 200 lb — reason given/.test(n)), JSON.stringify(r.notes));

/* v3.3.415: A REASON NAMES ITS EXERCISE. The maker's Squat came back at 200
   TWICE after guardrail 16 shipped. Cause: `|| !!payload.note` -- any note
   typed in the ask screen counted as a reason for every exercise and silenced
   14, 14b and 16 wholesale. Nothing here had ever combined a note with a
   repeat, so the suite was green through both releases. */
const checkNoted = (resp, note) => run(`(function(){try{ const o=writerState(); o.note=${JSON.stringify(note)}; const p=writerPayload(o); const r=writerCheck(${JSON.stringify(resp)},{payload:p});
  return JSON.stringify({ok:true, notes:r.notes, est:r.rows.filter(x=>x.kind==='ex'&&x.ex).map(x=>({ex:x.ex,w:x.lines[0]&&x.lines[0].w}))});
  }catch(e){ return JSON.stringify({ok:false, refused:e.refused||String(e)}); }})()`);
r = JSON.parse(checkNoted({days:[{date:today,part:'Legs',title:'Legs',text:"Squat\n  200 lb x 8 8 8 8"}],reason:{head:'Legs',text:'legs are due'}}, "legs tomorrow, keep it to an hour"));
ok("16c · a note about the DAY is not a reason to hold the Squat",
   r.ok && r.est[0].w===205 && r.notes.some(n=>/Squat.*stepped up to 205/.test(n)), JSON.stringify(r.est[0])+' '+JSON.stringify(r.notes));
r = JSON.parse(checkNoted({days:[{date:today,part:'Legs',title:'Legs',text:"Squat\n  200 lb x 8 8 8 8"}],reason:{head:'Legs',text:'legs are due'}}, "hold the squat at 200, knee is sore"));
ok("...but a note that NAMES the exercise is",
   r.ok && r.est[0].w===200 && !r.notes.some(n=>/stepped up/.test(n)), JSON.stringify(r.est[0])+' '+JSON.stringify(r.notes));
/* and the same hole applied to guardrail 14: a day-note excused going backward */
r = JSON.parse(checkNoted({days:[{date:today,part:'Legs',title:'Legs',text:"Squat\n  185 lb x 8 8 8 8"}],reason:{head:'Legs',text:'legs are due'}}, "legs tomorrow"));
ok("...and a day-note no longer excuses going backward either (14)",
   r.ok && r.notes.some(n=>/Squat: written at 185 lb, under your last 200 lb, with no reason given/.test(n)), JSON.stringify(r.notes));
/* v3.3.417: the real failure was not an exact repeat. Last was 195 / 155;
   the writer added its generic 5 and returned 200 / 160. Both are progress,
   so guardrail 16 correctly ignored them, but neither is the next face on a
   45 lb bar with 10 lb jumps. Rebuild the last session exactly as reported. */
run(`(function(){const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-1); const iso=d.toLocaleDateString('en-CA');
  DB.days[iso].w=DB.days[iso].w.filter(x=>x.ex!=='Squat'&&x.ex!=='Romanian Deadlift');
  DB.days[iso].w.push({part:'Legs',ex:'Squat',w:195/LB,reps:[8,8,8,8],at:3},{part:'Legs',ex:'Romanian Deadlift',w:155/LB,reps:[8,8,8],at:4});
  save(true); SEED=deriveAll();})()`);
r = JSON.parse(check({days:[{date:today,part:'Legs',title:'Legs',text:"Squat\n  135 lb x 8 (warm-up)\n  200 lb x 8 8 8 8\n\nRomanian Deadlift\n  160 lb x 8 8 8"}],reason:{head:'Legs',text:'legs are due'}}));
ok("17 · Squat 200 after 195 is corrected to the next 10 lb barbell face, 205",
   r.ok && r.est[0].ex==='Squat' && r.est[0].ws[1]===205, JSON.stringify(r.est[0]));
ok("...Romanian Deadlift 160 after 155 is corrected to 165",
   r.ok && r.est[1].ex==='Romanian Deadlift' && r.est[1].ws[0]===165, JSON.stringify(r.est[1]));
ok("...and the read-back explains both corrections",
   r.notes.some(n=>/Squat: 200 lb.*stepped up to 205 lb/.test(n)) && r.notes.some(n=>/Romanian Deadlift: 160 lb.*stepped up to 165 lb/.test(n)), JSON.stringify(r.notes));
r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Barbell Bench Press\n  155 lb x 8\n\nCable Fly Up\n  20 lb x 6 6 6 (form)"}],reason:chestReason}));
ok("...and a reason clears that too", r.ok && !r.notes.some(n=>/no reason given/.test(n)), JSON.stringify(r.notes));
/* the flagged note reaches the read-back */
run(`(function(){const o=writerState(); const p=writerPayload(o);
  const rr=writerCheck({days:[{date:'${today}',part:'Chest',title:'Chest',text:"Barbell Bench Press\\n  155 lb x 8\\n\\nCable Fly Up\\n  15 lb x 10 10 10"}]},{payload:Object.assign(p,{part:'Chest'})});
  lift.planSource='writer'; lift.planNotes=rr.notes; lift.planReason=null; lift.planDate=todayISO; lift.planText=''; lift.planRows=rr.rows; lift.plan='preview'; lift.planScope='today'; render();})()`);
ok("...and the read-back shows the writer's notes above the buttons", /under your last 20 lb/.test(run(`(document.querySelector('.plannotes')||{}).textContent||''`)) && run(`(function(){const n=document.querySelector('.plannotes'), a=document.querySelector('.planacts'); return !!n&&!!a&&(n.compareDocumentPosition(a)&Node.DOCUMENT_POSITION_FOLLOWING)>0;})()`), run(`(document.querySelector('.plannotes')||{}).textContent||''`));
ok("...and it does not expose the internal build number", !/checked by/i.test(run(`document.getElementById('view').textContent`)) && !fs.readFileSync(path.join(dir,'js','lift.js'),'utf8').includes('planchk'));
run(`(function(){const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-1); const iso=d.toLocaleDateString('en-CA'); DB.days[iso].w=DB.days[iso].w.filter(x=>x.ex!=='Cable Fly Up'); save(true); SEED=deriveAll(); lift.plan=null; lift.planNotes=null; lift.planSource=null; lift.plan='write'; render();})()`);
/* v3.3.402: the band has ONE side. The first live answer came back with the
   maker's own warm-up ramp under his best, and a symmetric band clamped every
   warm-up UP into a working set. Lighter is free. */
r = JSON.parse(run(`(function(){try{ const o=writerState(); const p=writerPayload(o);
  const rr=writerCheck({days:[{date:'${today}',part:'Back',title:'Back',text:"Deadlift\\n  135 lb x 5            (warm-up)\\n  185 lb x 5\\n  215 lb x 5 5 5"}]},{payload:p});
  const l=rr.rows.find(x=>x.ex==='Deadlift').lines;
  return JSON.stringify({ok:true, w:l.map(x=>x.w), est:l.map(x=>!!x.est), notes:rr.notes});
  }catch(e){ return JSON.stringify({ok:false, refused:e.refused||String(e)}); }})()`));
ok("...and a warm-up ramp under the best survives, every line, unmarked",
   r.ok && JSON.stringify(r.w)==='[135,185,215]' && r.est.every(x=>!x) && !r.notes.length, JSON.stringify(r));
/* Chest: the ledger has Barbell Bench Press, so the 'chest' head has work;
   Machine Chest Press is the same head and has never been lifted. */
/* v3.3.410: NEW is for an empty head. Three live probes in a row put a Dip in
   an incline session whose heads were all covered; the prompt said not to,
   twice. A new movement whose head already has work is left out -- unless
   the note asked for it, in which case guardrail 4 marks its load ≈. */
r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Barbell Bench Press\n  150 lb x 8\n\nMachine Chest Press\n  120 lb x 10 10"}],reason:{head:'Chest, not Back',text:'chest is furthest out'}}));
ok("15 · a new movement for a head that already has work is left out, and said so", r.ok && r.ex.join()==='Barbell Bench Press' && r.notes.some(n=>/Machine Chest Press: new, and chest already has work/.test(n)), JSON.stringify(r.ex)+' '+JSON.stringify(r.notes));
run(`writerState().note='try the Machine Chest Press today'`);
r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Barbell Bench Press\n  150 lb x 8\n\nMachine Chest Press\n  120 lb x 10 10"}],reason:{head:'Chest, not Back',text:'chest is furthest out'}}));
ok("4 · asked for in the note, it stays, and a load for an exercise never lifted, in a head that HAS work, is ≈", r.ok && r.est[1] && r.est[1].ex==='Machine Chest Press' && r.est[1].est===true && !r.est[0].est, JSON.stringify(r.est)+' '+JSON.stringify(r.notes));
run(`writerState().note=''`);
/* v3.3.405: ≈ claims a guess FROM something. With the whole head empty there is
   nothing to guess from, and a number is invented. The live writer offered
   ≈135 lb for a Standing Calf Raise on a ledger with no calf work at all. */
r = JSON.parse(run(`(function(){try{ const o=writerState(); const p=writerPayload(o);
  const rr=writerCheck({days:[{date:'${today}',part:'Legs',title:'Legs',text:"Squat\\n  205 lb x 8\\n\\nStanding Calf Raise\\n  \\u2248135 lb x 12 12"}],reason:{head:'Legs, not Back',text:'legs are furthest out'}},{payload:p});
  const cr=rr.rows.find(x=>x.ex==='Standing Calf Raise').lines[0];
  return JSON.stringify({ok:true, nw:!!cr.nw, est:!!cr.est, w:cr.w, notes:rr.notes});
  }catch(e){ return JSON.stringify({ok:false, refused:e.refused||String(e)}); }})()`));
ok("13 · a head with no work at all gets no number: by feel, not ≈",
   r.ok && r.nw===true && !r.est && r.w===0 && r.notes.some(n=>/nothing on record for calves/.test(n)), JSON.stringify(r));
r = JSON.parse(check({days:[{date:today,part:'Back',title:'Back',text:"Deadlift\n  215 lb x 5"},{date:today,part:'Back',title:'Back again',text:"Pull Up\n  BW x 8"}]}));
ok("5 · two sessions for one date are refused whole", !r.ok && /two sessions/.test(r.refused));
r = JSON.parse(check({days:[{date:today,part:'Back',title:'Back',text:"Deadlift\n  215 lb x 5"},{date:run(`tomorrowISO()`),part:'Legs',title:'Legs',text:"Squat\n  205 lb x 8"}]}));
ok("6 · a day you did not pick is dropped, and said so", r.ok && r.ex.join()==='Deadlift' && r.notes.some(n=>/not a day you picked/.test(n)));
r = JSON.parse(check({days:[{date:today,part:'Back',title:'Back',text:"Deadlift\n  215 lb x 5\n\nSeated Cable Row\n  by feel x 10\n\nT-Bar Row\n  by feel x 10\n\nPendlay Row\n  by feel x 10"}]}));
ok("7 · a third NEW movement becomes a note", r.ok && r.ex.join()==='Deadlift,Seated Cable Row,T-Bar Row' && r.notes.some(n=>/third new/.test(n)), r.ex.join());
r = JSON.parse(check({days:[]}));
ok("...an empty answer is refused", !r.ok && /empty/.test(r.refused));

/* ---- the whole flow through the stub: tap Write, read back, accept ---- */
run(`WRITER_STUB=async(p)=>{ await new Promise(r=>setTimeout(r,120)); return {days:[{date:p.date,part:'Back',title:'Back + Biceps',text:"Deadlift\\n  215 lb x 5 5 5\\n\\nBent-Over Row\\n  175 lb x 10 10 8 8\\n\\nPull Up\\n  BW +10 x 8 8"}],reason:null}; };`);
run(`(function(){lift.write=null; lift.plan='write'; render(); document.querySelector('[data-writego]').click();})()`);
/* v3.3.406: the wait is a full screen and a receipt */
ok("Write it takes the screen over: the wait, not the ask", run(`lift.plan==='writing' && !!document.querySelector('.writing') && !document.querySelector('.writecard')`));
ok("...eight weeks of squares, the square that means a day", run(`document.querySelectorAll('.writing .wsq').length`)===56 &&
   run(`[...document.querySelectorAll('.writing .wsq')].every((e,i)=>e.style.getPropertyValue('--i')==String(i))`));
ok("...the sparkle, and one line that says what is happening", run(`!!document.querySelector('.writing .ic-sparkle')`) &&
   /Reading eight weeks/.test(run(`document.getElementById('writeLine').textContent`)));
ok("...no exclamation mark, nothing red", !/!/.test(run(`document.querySelector('.writing').textContent`)) &&
   !/--record|--live/.test((()=>{ const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8"); const i=css.indexOf('.writing{'); return css.slice(i, i+1400); })()));
ok("...and a Cancel that is the only control", run(`document.querySelectorAll('.writing button').length`)===1 && run(`!!document.querySelector('[data-writecancel]')`));
ok("the square keeps the one ratio, at source", /\.writing \.wsq\{[^}]*border-radius:var\(--sq\)/.test(fs.readFileSync(path.join(dir,"css/app.css"),"utf8")));
ok("...and reduced motion lights every square and stills the sparkle", /prefers-reduced-motion:reduce\)\{\.writing \.wsq\{animation:none;background:var\(--accent\)\}\.writing \.wspark\{animation:none\}/.test(fs.readFileSync(path.join(dir,"css/app.css"),"utf8")));
await_(async()=>{
  for(let i=0;i<20&&run(`lift.plan==='writing'`);i++) await tick();
  ok("the answer lands on the read-back, read from the writer", run(`lift.plan==='preview'`) && /Read from the writer/.test(run(`document.querySelector('#view h2').textContent`)));
  ok("...with every row resolved and no reason header, since the part is the rotation's", run(`document.querySelectorAll('.planpv.ok').length`)===3 && run(`!document.querySelector('.planreason')`));
  ok("...and nothing saved yet", run(`!DB.plan`));
  run(`document.querySelector('[data-planaccept]').click()`);
  ok("Use today's plan saves it for today, through planSave", run(`!!planNow() && planNow().items.length===3 && DB.plan.d===todayISO`));
  ok("...and the record is untouched", run(`(DB.days[todayISO]&&DB.days[todayISO].w||[]).length`)===0);
  ok("...and Train next walks it", /Deadlift/.test(run(`(document.querySelector('.tnextplan')||{}).textContent||''`)));
  run(`planClear()`);
  /* cancel: back to the ask screen, quietly, nothing saved */
  run(`(function(){lift.write=null; lift.plan='write'; render(); document.querySelector('[data-writego]').click();})()`);
  ok("Cancel on the wait returns to the ask screen with no error", run(`(function(){document.querySelector('[data-writecancel]').click(); return lift.plan==='write' && !writerState().err && !writerState().busy;})()`));
  for(let i=0;i<20;i++) await tick();
  ok("...and a late answer after a cancel changes nothing", run(`lift.plan==='write' && !DB.plan`));

  /* 8 · the stamp follows the ledger */
  run(`(function(){day(todayISO).w.push({part:'Chest',ex:'Barbell Bench Press',w:70,reps:[8],at:1}); save(true); lift.write=null; lift.plan='write'; render(); document.querySelector('[data-writego]').click();})()`);
  for(let i=0;i<20&&run(`lift.plan==='writing'`);i++) await tick();
  run(`document.querySelector('[data-planaccept]').click()`);
  /* v3.3.414: dormancy is planNow()===null with planPending() set -- the
     caption that used to say "opens at midnight" is gone (the plan is readable
     beneath the row now), so the check reads the state, not the sentence. */
  ok("8 · with a set logged, the written plan is stamped tomorrow and lies dormant", run(`DB.plan.d===tomorrowISO() && planNow()===null && !!planPending()`) && run(`!!document.querySelector('.planpending')`));
  run(`(function(){DB.days[todayISO].w=[]; planClear(); save(true);})()`);

  /* 9 · offline: the rotation stands */
  run(`WRITER_STUB=async(p)=>{ const e=new Error('Failed to fetch'); throw e; };`);
  run(`(function(){lift.write=null; lift.plan='write'; render(); document.querySelector('[data-writego]').click();})()`);
  await tick(); await tick();
  ok("9 · without signal the ask screen says so and nothing is saved", /Needs signal/.test(run(`(document.querySelector('.writeerr')||{}).textContent||''`)) && run(`!DB.plan && lift.plan==='write'`));
  run(`document.querySelector('[data-writeback]').click()`);
  ok("...and the rotation card stands", run(`!!document.querySelector('[data-go]')`));
  run(`WRITER_STUB=async(p)=>{ const e=new Error('aborted'); e.name='AbortError'; throw e; };`);
  run(`(function(){lift.write=null; lift.plan='write'; render(); document.querySelector('[data-writego]').click();})()`);
  await tick(); await tick();
  /* v3.3.403: a timeout is NOT "needs signal" -- the signal is usually fine
     and the function was merely cold. The two failures say different things. */
  ok("...a timeout says so in its own words, and invites a retry",
     /took too long[\s\S]*tap Write again/.test(run(`(document.querySelector('.writeerr')||{}).textContent||''`)),
     run(`(document.querySelector('.writeerr')||{}).textContent||''`));
  ok("...and the patience is long enough for a cold function",
     run(`WRITER_TIMEOUT_MS.day`)>=25000 && run(`WRITER_TIMEOUT_MS.week`)>=40000,
     run(`JSON.stringify(WRITER_TIMEOUT_MS)`));
  run(`WRITER_STUB=async(p)=>({days:[{date:p.date,part:'Shoulder',title:'Shoulder',text:"Lateral Raise\\n  by feel x 12"}]});`);
  run(`(function(){lift.write=null; lift.plan='write'; render(); document.querySelector('[data-writego]').click();})()`);
  await tick(); await tick();
  ok("...a refused answer says why, and nothing is saved", /refused/.test(run(`(document.querySelector('.writeerr')||{}).textContent||''`)) && run(`!DB.plan`));

  /* 10 · a week through the stub, on the days picked */
  run(`WRITER_STUB=async(p)=>({days:p.days.map((d,i)=>({date:d,part:['Back','Chest','Legs'][i%3],title:['Back','Chest','Legs'][i%3],text:['Deadlift\\n  215 lb x 5','Barbell Bench Press\\n  150 lb x 8','Squat\\n  205 lb x 8'][i%3]})).concat([{date:'2099-01-01',part:'Back',title:'x',text:'Deadlift\\n  215 lb x 5'}])});`);
  run(`(function(){lift.write=null; lift.plan='write'; render(); document.querySelector('[data-writescope="week"]').click();})()`);
  ok("10 · the week scope shows the days through Sunday, prefilled from your habit", run(`document.querySelectorAll('[data-writeday]').length`)>=1 &&
     run(`(function(){const span=writerDays(writerState()); return new Date(span[span.length-1]+'T00:00').getDay()===0;})()`) &&
     run(`[...writerState().days].every(iso=>new Date(iso+'T00:00').getDay()!==0)`));
  const picked = run(`writerState().days.size`);
  ok("...the button counts them", new RegExp(`Write ${picked} session`).test(run(`document.querySelector('[data-writego]').textContent`)), run(`document.querySelector('[data-writego]').textContent`));
  run(`document.querySelector('[data-writego]').click()`);
  await tick(); await tick();
  ok("...the read-back shows exactly those days, the stray one dropped", run(`document.querySelectorAll('.planpv.day').length`)===picked && run(`lift.planNotes.some(n=>/2099/.test(n))`));
  run(`document.querySelector('[data-planaccept]').click()`);
  ok("...Use this week saves the week on the week scope", run(`!!weekNow() && Object.keys(weekNow().days).length===${picked} && lift.planScope==='week'`));
  ok("...and today's plan is its first day", picked===0 || run(`(function(){const p=planNow(); const d=weekNow().days[todayISO]; return d?(!!p&&p.fromWeek):true;})()`));
  run(`weekClear()`);

  /* 11 · a Sunday write: one day, and the offer of the following days */
  /* a click would call checkDate() and undo the simulated Sunday, so this
     block drives the state directly and renders */
  run(`(function(){const d=new Date(todayISO+'T00:00'); while(d.getDay()!==0) d.setDate(d.getDate()+1); todayISO=d.toLocaleDateString('en-CA'); SEED=deriveAll(); lift.write=null; lift.plan='write'; writerState().scope='week'; render();})()`);
  ok("11 · on a Sunday the week is one day", run(`writerDays(writerState()).length`)===1 && run(`!!document.querySelector('[data-writenext="1"]')`), run(`JSON.stringify(writerDays(writerState()))`));
  run(`(function(){const o=writerState(); o.nextWeek=true; o.days=null; render();})()`);
  ok("...Next week extends it through the following Sunday", run(`writerDays(writerState()).length`)===8 && run(`!document.querySelector('[data-writenext="1"]')`));
  run(`todayISO=new Date().toLocaleDateString('en-CA'); SEED=deriveAll(); lift.plan=null; lift.write=null; render();`);

  /* 12 · never scored, never written: the writer's files are under the same wall */
  const wsrc = fs.readFileSync(path.join(dir,"js/writer.js"),"utf8").replace(/\/\*[\s\S]*?\*\//g,"");
  ok("12 · writer.js never touches the record", !/DB\.days\s*\[[^\]]*\]\s*=|\.w\.push|DB\.days\[[^\]]+\]\.w\s*=/.test(wsrc));
  ok("...and never counts a plan", !/planLoggedToday|adheren|completed|remaining|missed/i.test(wsrc));

  /* v3.3.421: THE PHONE WAITS LONGER THAN THE FUNCTION. The Edge Function
     aborted the model at a flat 20 s; a week since v3.3.419 is every session
     written in full and takes 25-40 s, so every week write came back 504 while
     the model was still writing. The function's abort now scales with scope
     (25 s / 60 s) and the client waits longer in both, so the function -- not
     the phone -- always decides it has waited long enough. */
  {
    const fn=fs.readFileSync(path.join(dir,"supabase/functions/write-session/index.ts"),"utf8");
    const m=fn.match(/abortMs = payload\.scope === "week" \? (\d+)_?(\d*) : (\d+)_?(\d*)/);
    ok("the function's abort scales with scope", !!m);
    if(m){
      const week=+(m[1]+m[2]), day=+(m[3]+m[4]);
      ok("...a week gets at least a minute", week>=60000, String(week));
      ok("...and the client outlasts the function in both scopes",
         run(`WRITER_TIMEOUT_MS.week`)>week && run(`WRITER_TIMEOUT_MS.day`)>day,
         JSON.stringify(run(`WRITER_TIMEOUT_MS`)));
    }
  }

  process.exit(fail ? 1 : 0);
});
function await_(f){ f().catch(e=>{ console.log("CRASH", e && e.stack || e); process.exit(1); }); }
