// test-readback.js DIR — v3.3.399. The read-back's four additions, for the
// session writer and for any paste: a grip that moves a row (one order in
// three places: rows, text, items); NEW, a fact from the ledger; ≈, a guessed
// load that reads as a guess everywhere and never enters the record; and the
// reason header, shown only when a reason is given.
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

let fail = 0;
const ok = (name, cond, note) => {
  console.log((cond ? "PASS" : "FAIL"), name, note ? "→ " + note : "");
  if (!cond) fail++;
};

/* a ledger: Deadlift and Bent-Over Row this month; Rear Deltoids never; Face Pull 70 days ago */
run(`(function(){DB.days={}; DB.plan=null; DB.week=null; DB.suggest=null; delete DB.settings.dayDone;
  const at=(n,part,ex)=>{const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-n);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part,ex,w:60,reps:[8,8],at:1}],upd:1};};
  at(3,'Back','Deadlift'); at(6,'Back','Bent-Over Row'); at(9,'Back','Pull Up'); at(70,'Shoulder','Face Pull');
  DB.settings.unit='lb'; DB.settings.onboarded=true; SEED=deriveAll(); view='today'; render();})()`);

const PASTE = "Deadlift\n  215 lb x 5 5 5\n\nBent-Over Row\n  175 lb x 10 10\n\nPull Up\n  BW +10 x 8 8\n\nRear Deltoids\n  \u224815 lb x 15 15 12\n\nFace Pull\n  by feel x 15 15";
const preview = () => run(`(function(){lift.planText=${JSON.stringify(PASTE)}; lift.planRows=parsePlan(lift.planText); lift.planMode='day';
  lift.plan='preview'; lift.planReason=null; lift.planSource=null; render(); return document.querySelectorAll('.planpv.ok').length;})()`);
ok("the paste reads five exercises", preview()===5);

/* ---- NEW is a ledger fact ---- */
ok("an exercise with no set in eight weeks is NEW", run(`exIsNew('Rear Deltoids') && exIsNew('Face Pull')`));
ok("...and one lifted this month is not", run(`!exIsNew('Deadlift') && !exIsNew('Pull Up')`));
const names = run(`JSON.stringify([...document.querySelectorAll('.planpv.ok')].map(r=>({ex:r.querySelector('b').textContent.replace(/NEW$/,'').trim(), tag:!!r.querySelector('.ptag')})))`);
ok("the read-back tags exactly those two", (()=>{ const n=JSON.parse(names); return n.filter(x=>x.tag).map(x=>x.ex).join()==='Rear Deltoids,Face Pull'; })(), names);
ok("...and says what NEW means, once per tagged row", run(`document.querySelectorAll('.planpv.ok .pest')`).length>=2 &&
   /nothing on record in 8 weeks/.test(run(`document.querySelector('.planpv.ok[data-planrow="3"]').textContent`)));

/* ---- ≈ is a guess, marked everywhere, never a record ---- */
ok("\u224815 lb parses as a load with est set", run(`(function(){const r=parsePlan("Rear Deltoids\\n  \\u224815 lb x 15 15"); return r[0].lines[0].est===true && r[0].lines[0].w===15;})()`));
ok("~15 lb reads the same", run(`parsePlan("Rear Deltoids\\n  ~15 lb x 15 15")[0].lines[0].est===true`));
ok("a plain 15 lb does not", run(`!parsePlan("Rear Deltoids\\n  15 lb x 15 15")[0].lines[0].est`));
ok("the preview shows the \u2248 in accent", run(`!!document.querySelector('.planpv.ok[data-planrow="3"] .pest')`) &&
   /\u224815lb/.test(run(`document.querySelector('.planpv.ok[data-planrow="3"]').textContent`)));
run(`document.querySelector('[data-planaccept]').click()`);
ok("accepted, the card prints \u2248 before the load", /\u224815 lb/.test(run(`document.querySelector('.plancard').textContent`)),
   run(`JSON.stringify([...document.querySelectorAll('.plancard .pw')].map(e=>e.textContent))`));
ok("...the Copy text carries it", /\u224815 lb/.test(run(`planToText(planNow())`)));
ok("...the Suggested chip carries it", run(`(function(){lift.part='Shoulder'; lift.ex='Rear Deltoids'; view='lift'; render();
   const c=[...document.querySelectorAll('.ls-w')].find(e=>/15/.test(e.textContent)); return !!c && /\\u2248/.test(c.textContent);})()`));
ok("...and the record has nothing new in it", run(`Object.keys(DB.days).filter(d=>d>=todayISO&&(DB.days[d].w||[]).length).length`)===0);
ok("the card tags NEW until the exercise is logged", run(`(function(){view='today'; render(); return [...document.querySelectorAll('.planrow .ptag')].length;})()`)===2);
run(`(function(){day(todayISO).w.push({part:'Shoulder',ex:'Rear Deltoids',w:7,reps:[15,15,12],at:1}); save(true); render();})()`);
ok("...and the tick replaces it once it is", run(`(function(){const r=[...document.querySelectorAll('.planrow')].find(r=>/Rear Deltoids/.test(r.textContent));
   return r.classList.contains('pdone') && !r.querySelector('.ptag') && /\\u2713/.test(r.textContent);})()`));
run(`(function(){DB.days[todayISO].w=[]; planClear(); render();})()`);

/* ---- one order, three places ---- */
preview();
const exOrder = () => run(`JSON.stringify((lift.planRows||[]).filter(r=>r.kind==='ex'&&r.ex).map(r=>r.ex))`);
const textOrder = () => run(`JSON.stringify(lift.planText.split('\\n').filter(l=>/^[A-Z]/.test(l)))`);
ok("every resolved row has a grip", run(`document.querySelectorAll('.planpv.ok .pgrip').length`)===5 &&
   run(`document.querySelectorAll('.planpv:not(.ok) .pgrip').length`)===0);
ok("...named for the screen reader", run(`[...document.querySelectorAll('.pgrip')].every(g=>/^Move /.test(g.getAttribute('aria-label')))`));
run(`planMoveRow(${run(`(lift.planRows||[]).findIndex(r=>r.ex==='Pull Up')`)}, -1); render();`);
ok("moving Pull Up up puts it before Bent-Over Row in the rows", exOrder()==='["Deadlift","Pull Up","Bent-Over Row","Rear Deltoids","Face Pull"]', exOrder());
ok("...and in the raw text", textOrder()==='["Deadlift","Pull Up","Bent-Over Row","Rear Deltoids","Face Pull"]', textOrder());
ok("...and the set lines travelled with their exercise",
   /Pull Up\n  BW \+10 x 8 8\n\nBent-Over Row\n  175 lb x 10 10/.test(run(`lift.planText`)), JSON.stringify(run(`lift.planText`).slice(0,80)));
ok("...and on screen", /Pull Up[\s\S]*Bent-Over Row/.test(run(`document.querySelector('#view').textContent`)));
run(`document.querySelector('[data-planaccept]').click()`);
ok("...and in the saved items", run(`JSON.stringify(planNow().items.map(i=>i.ex))`)==='["Deadlift","Pull Up","Bent-Over Row","Rear Deltoids","Face Pull"]');
ok("...so Train next walks the new order", /Deadlift/.test(run(`document.querySelector('.tnextplan').textContent`)));
run(`planClear()`);
preview();
ok("the first row cannot move up", run(`planMoveRow(0,-1)===false`) && exOrder().startsWith('["Deadlift"'));
run(`(function(){const g=document.querySelector('[data-plangrip="0"]'); g.focus();
  g.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));})()`);
ok("ArrowDown on a grip moves its row down", exOrder()==='["Bent-Over Row","Deadlift","Pull Up","Rear Deltoids","Face Pull"]', exOrder());
ok("...and focus follows the row", run(`document.activeElement && document.activeElement.getAttribute('aria-label')`)==='Move Deadlift');
ok("a DOM order read back after a drag applies the same way",
   run(`(function(){const slots=(lift.planRows||[]).map((r,i)=>r.kind==='ex'&&r.ex?i:-1).filter(i=>i>=0); return planApplyOrder(slots.slice().reverse());})()`) &&
   exOrder()==='["Face Pull","Rear Deltoids","Pull Up","Deadlift","Bent-Over Row"]', exOrder());
ok("...and a bad order is refused whole", run(`planApplyOrder([0,0,0,0,0])===false`) && exOrder()==='["Face Pull","Rear Deltoids","Pull Up","Deadlift","Bent-Over Row"]');
/* a week paste: a row moves within its day, and a note keeps its slot */
const WK = run(`pretty(todayISO)`)+" \u2014 Back\n\nDeadlift\n  215 lb x 5\n\neasy day\n\nBent-Over Row\n  175 lb x 10\n\n"+run(`pretty(tomorrowISO())`)+" \u2014 Legs\n\nSquat\n  205 lb x 8\n";
run(`(function(){lift.planText=${JSON.stringify(WK)}; lift.planMode='week'; lift.planWeek=parseWeek(lift.planText); lift.planRows=weekRows(lift.planWeek); lift.plan='preview'; render();})()`);
run(`planMoveRow(${run(`(lift.planRows||[]).findIndex(r=>r.ex==='Bent-Over Row')`)}, -1); render();`);
ok("in a week, the note keeps its slot and the day headings stay put",
   run(`JSON.stringify((lift.planRows||[]).map(r=>r.kind==='day'?'#'+r.title:r.kind==='ex'?r.ex:'note'))`)==='["#Back","Bent-Over Row","note","Deadlift","#Legs","Squat"]',
   run(`JSON.stringify((lift.planRows||[]).map(r=>r.kind==='day'?'#'+r.title:r.kind==='ex'?r.ex:'note'))`));
run(`planMoveRow(${run(`(lift.planRows||[]).findIndex(r=>r.ex==='Deadlift')`)}, 1); render();`);
ok("...and a row moved past a heading lands in that day",
   run(`JSON.stringify((lift.planRows||[]).map(r=>r.kind==='day'?'#'+r.title:r.kind==='ex'?r.ex:'note'))`)==='["#Back","Bent-Over Row","note","Squat","#Legs","Deadlift"]');
run(`(function(){lift.plan=null; lift.planRows=null; lift.planWeek=null; lift.planMode='day'; render();})()`);

/* ---- the reason header ---- */
preview();
ok("a paste has no reason header", run(`!document.querySelector('.planreason')`) && /Read from your paste/.test(run(`document.querySelector('#view h2').textContent`)));
run(`(function(){lift.planSource='writer'; lift.planReason={head:'Shoulder, not Back', text:'Back was 5 days ago on a 6-day cadence; Shoulder is your focus and 8 days out.'}; render();})()`);
ok("a writer's reason shows once, above what the app read",
   /Shoulder, not Back/.test(run(`document.querySelector('.planreason').textContent`)) && /writer\u2019s call/.test(run(`document.querySelector('.planreason').textContent`))
   && /Read from the writer/.test(run(`document.querySelector('#view h2').textContent`)));
run(`document.querySelector('[data-planaccept]').click()`);
ok("...and never on the card", run(`!document.querySelector('.planreason')`) && !/Shoulder, not Back/.test(run(`document.querySelector('#view').textContent`)));
run(`(function(){lift.planReason=null; lift.planSource=null; planClear();})()`);

process.exit(fail ? 1 : 0);
