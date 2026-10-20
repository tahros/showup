// test-livetoday.js DIR — v4.6.359: Today while a session is live, with a plan
// for today, is one stack with one action (approved mock "Today during a live
// run"): a plan card with its progress and a single Next button, then a plain
// list of what is logged. The plan tools and later days live inside the card's
// fold. Every other state keeps its own layout.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({}, { get: () => () => ({}) }); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const check = (name, expr, want) => {
  const got = run(expr), ok = String(got) === String(want);
  console.log((ok?"PASS":"FAIL"), name, "→", got);
  if (!ok) fail++;
};

run(`
  const _t0=new Date(todayISO+'T00:00');
  for(let i=1;i<=10;i++){
    const d=new Date(_t0); d.setDate(d.getDate()-i);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[10,10]}],upd:Date.now()};
  }
  SEED=deriveAll();
  DB.plan={d:todayISO, items:[
    {ex:'Dumbbell Press', lines:[{w:20,bw:false,reps:[10,10]}]},
    {ex:'Lateral Raise',  lines:[{w:10,bw:false,reps:[12]}]}], note:''};
  DB.planAt=Date.now();
`);
check("fixture: the workspace planner is on", `planningWorkspace()`, true);

// live: one Dumbbell Press set and a run logged
run(`(function(){const t=dayMeta();
  t.w.push({part:'Shoulder',ex:'Dumbbell Press',w:20,reps:[10],at:Date.now()});
  t.w.push({part:'Run',ex:'Run',w:5.3,mins:32,secs:0,at:Date.now()});
  lastSetAt=Date.now(); lift.part=null; lift.ex=null; view='today'; render();})()`);
check("live with a plan: Today is the one stack", `!!document.querySelector('#view .lt')`, true);
check("...with exactly one Next button", `document.querySelectorAll('#view .lt-next').length`, 1);
check("...naming the first unlogged plan item", `document.querySelector('#view .lt-next').dataset.planex`, "Lateral Raise");
check("...and progress counted in planned sets", `document.querySelector('#view .lt-count').textContent`, "1 of 3 sets");
run(`(function(){DB.plan.items.unshift({ex:'Run', lines:[{w:5,bw:false,reps:[1]}]}); DB.planAt=Date.now(); render();})()`);
check("a run in the plan is done once one is logged (cardio rows carry no reps)", `document.querySelector('#view .lt-next').dataset.planex`, "Lateral Raise");
run(`(function(){DB.plan.items.shift(); DB.planAt=Date.now(); render();})()`);
check("...no separate Train next card", `![...document.querySelectorAll('#view h2')].some(h=>/Train next/i.test(h.textContent))`, true);
check("...no You're in block", `!document.querySelector('#view .su-active-row')`, true);
check("...no Continue chip", `!document.querySelector('#view .livego')`, true);
check("...the plan tools sit inside the card's fold", `[...document.querySelectorAll('#view .pw-home-tools')].every(x=>!!x.closest('.lt-fold'))`, true);
check("...and are still there", `!!document.querySelector('#view .lt-fold [data-pw="paste-open"]')`, true);
check("logged list: one row per exercise", `[...document.querySelectorAll('#view .lt-row')].map(r=>r.dataset.ex).join(',')`, "Dumbbell Press,Run");
check("...an open exercise carries the live dot", `document.querySelector('#view .lt-row[data-ex="Dumbbell Press"]').classList.contains('on')`, true);
check("...a lift row states its set count", `document.querySelector('#view .lt-row[data-ex="Dumbbell Press"] .mono').textContent`, "1 set");

// every plan item logged: the Next button stands down
run(`(function(){const t=dayMeta();
  t.w.push({part:'Shoulder',ex:'Lateral Raise',w:10,reps:[12],at:Date.now()});
  lastSetAt=Date.now(); render();})()`);
check("plan complete: no Next button", `!document.querySelector('#view .lt-next')`, true);
check("...a plain line says so", `/Every exercise in your plan is logged/.test(document.querySelector('#view .lt-done').textContent)`, true);
check("...while progress still counts sets, not exercises", `document.querySelector('#view .lt-count').textContent`, "2 of 3 sets");
run(`(function(){const t=dayMeta();
  for(let i=0;i<3;i++) t.w.push({part:'Shoulder',ex:'Dumbbell Press',w:20,reps:[8],at:Date.now()});
  lastSetAt=Date.now(); render();})()`);
check("...and extra sets cap at the plan", `document.querySelector('#view .lt-count').textContent`, "3 of 3 sets");

// closed day: the stack is not used
run(`(function(){day(todayISO).doneAll=true; render();})()`);
check("closed day keeps its own layout (v4.6.361: the finished-day card, no Next)", `!document.querySelector('#view .lt-next') && !!document.querySelector('#view .ld')`, true);
check("finished day: what was trained is one card, a heading per part", `[...document.querySelectorAll('#view .ld-log .ld-part b')].map(b=>b.textContent).join(',')`, "Shoulder,Cardio");
check("...each exercise one plain row, no ticks", `document.querySelectorAll('#view .ld-log .lt-row').length===3 && !/\u2713/.test(document.querySelector('#view .ld-log').textContent)`, true);
check("...and no separate parts line", `!document.querySelector('#view .todaypartsline')`, true);
run(`(function(){day(todayISO).doneAll=false; render();})()`);

// no plan for today: the stack is not used
run(`(function(){DB.plan=null; if(DB.week)DB.week.days={}; DB.planAt=Date.now(); render();})()`);
check("live without a plan keeps its own layout", `!document.querySelector('#view .lt')`, true);

console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
