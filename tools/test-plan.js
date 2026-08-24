// test-plan.js DIR — v3.3.278. Today's plan: a pasted session read into the
// rails the app already has. Two halves: the parser (a pure function, so
// asserted on values) and the promise (today-only, never logged, never
// scored — asserted on effects, through real clicks).
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only" });
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

// the maker's own paste, verbatim in shape: warm-up line, working line, a
// coach note after an arrow, an exercise not in the catalog, a timed hold.
const PASTE = [
  "Dumbbell Shoulder Press               6 sets",
  "  35 lb    10    8            \u2190 warm-up",
  "  55 lb     8    8    8    8   \u2190 6s acceptable",
  "",
  "Lateral Raise                          4 sets",
  "  35 lb    12   12   10   10",
  "",
  "Rear Delt Fly                          4 sets",
  "  25 lb    12   12   10   10",
  "",
  "Hanging Leg Raise                      3 sets",
  "  BW       10    8    8",
  "",
  "Plank                                  2 sets",
  "  60 sec each"
].join("\n");

run(`(function(){DB.days={}; DB.settings.unit='lb'; const t=new Date(todayISO+'T00:00');
  const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
  for(const n of [10,4]) DB.days[D(n)]={w:[{part:'Shoulder',ex:'Lateral Raise',w:13,reps:[12,12,10]}],upd:1};
  SEED=deriveAll(); DB.plan=null; DB.suggest=null;
  view='lift'; lift.ex=null; lift.part='Shoulder'; lift.plan=null; render();})()`);

// ---- 1. the parser reads what it can, and only what it can ----------------
run(`window.__rows=parsePlan(${JSON.stringify(PASTE)});`);
ok("the WORKING set wins over the warm-up above it",
   run(`(function(){const r=__rows.find(x=>x.ex==='Dumbbell Shoulder Press');
     const l=r.lines[r.lines.length-1];
     return r.lines.length===2 && l.w===55 && l.reps.join()==='8,8,8,8';})()`) === true);
ok("a coach note after an arrow is not read as data",
   run(`(function(){const r=__rows.find(x=>x.ex==='Dumbbell Shoulder Press');
     return r.lines.every(l=>l.reps.every(n=>n>0&&n<100));})()`) === true);
ok("BW is a weight of zero, not a missing line",
   run(`(function(){const r=__rows.find(x=>x.ex==='Hanging Leg Raise');
     const l=r.lines[0]; return l.bw===true && l.w===0 && l.reps.join()==='10,8,8';})()`) === true);
ok("a name not in the catalog is NOT guessed — it offers candidates",
   run(`(function(){const r=__rows.find(x=>x.name==='Rear Delt Fly');
     return r.ex===null && r.cands.length>0 && r.cands.includes('Rear Deltoids');})()`) === true,
   run(`JSON.stringify(__rows.find(x=>x.name==='Rear Delt Fly').cands)`));
ok("a heading with no readable sets survives as a note, not dropped",
   run(`__rows.some(r=>r.kind==='exnote'&&/Plank/.test(r.raw))`) &&
   run(`/Plank/.test(planItemsFrom(__rows).note)`));
ok("'5x5' means five sets of five",
   run(`(function(){const r=parsePlan('Squat\\n  100 kg 5x5');
     return r[0].lines[0].reps.join()==='5,5,5,5,5';})()`) === true);
ok("a bare number is not a set line",
   run(`planReadSets('  42  ')`) === null);

// ---- 2. the flow, through the real buttons --------------------------------
run(`document.querySelector('[data-planpaste]').click()`);
ok("paste screen opens with a textarea", run(`!!document.getElementById('planText')`));
run(`document.getElementById('planText').value=${JSON.stringify(PASTE)};
     document.querySelector('[data-planread]').click();`);
ok("the preview shows every line, resolved or not",
   run(`document.querySelectorAll('.planpv').length`) >= 5,
   run(`document.querySelectorAll('.planpv').length`) + " rows");
ok("...and nothing is saved just by previewing", run(`!planNow()`));
ok("the ambiguous row asks rather than deciding",
   run(`document.querySelectorAll('.planpv.ask').length`) === 1 &&
   run(`document.querySelectorAll('[data-planpick]').length`) > 0);
run(`(function(){[...document.querySelectorAll('[data-planpick]')]
  .find(x=>x.dataset.planex2==='Rear Deltoids').click();})()`);
ok("choosing a candidate resolves that row",
   run(`document.querySelectorAll('.planpv.ask').length`) === 0);
run(`document.querySelector('[data-planaccept]').click()`);
ok("accepting writes a plan for TODAY",
   run(`(function(){const p=planNow(); return !!p && p.d===todayISO && p.items.length===4;})()`) === true,
   run(`(planNow()||{items:[]}).items.length`) + " items");
ok("...weights are stored in kg like every other weight",
   run(`(function(){const i=planFor('Dumbbell Shoulder Press');
     return Math.abs(toU(i.w)-55)<0.01;})()`) === true);
ok("...and the unreadable lines are kept verbatim",
   run(`/Plank/.test(planNow().note)`));

// ---- 3. the three promises ------------------------------------------------
ok("PROMISE 1 — nothing was written to the ledger",
   run(`JSON.stringify((DB.days[todayISO]||{w:[]}).w)`) === "[]");
ok("...and the day is still untrained as far as the record is concerned",
   run(`SEED.dates.includes(todayISO)`) === false);
ok("PROMISE 2 — the plan feeds the SUGGESTED rail, naming its origin",
   run(`(sugOv()['Lateral Raise']||{}).from`) === "plan");
run(`(function(){lift.ex='Lateral Raise'; lift.part='Shoulder'; lift.weight=0; render();})()`);
ok("...so the exercise page says the chips came from the plan",
   run(`/plan/i.test([...document.querySelectorAll('.zone.mini .lasthead span')][0].textContent)`));
ok("...and the chips carry the plan's numbers",
   run(`/35/.test(document.querySelector('.lastsets').textContent)`));
ok("PROMISE 3 — no count of what is done or left, anywhere on screen",
   run(`!/adheren|remaining|\\d+\\s*(of|\\/)\\s*\\d+\\s*(done|complete)/i.test(document.getElementById('view').textContent)`));

// ---- 4. it evaporates ------------------------------------------------------
run(`(function(){DB.plan.d='2020-01-01'; view='lift'; lift.ex=null; lift.plan=null; render();})()`);
ok("a plan from another day is not today's plan", run(`!planNow()`));
ok("...and the tab offers to take a new one",
   run(`!!document.querySelector('[data-planpaste]')`));
run(`(function(){DB.plan={d:todayISO,items:[{ex:'Squat',w:60,reps:[5,5]}],note:''};
  sugOv()['Squat']={sets:[{w:60,r:5}],d:todayISO,from:'plan'};
  view='lift'; lift.ex=null; render(); planClear();})()`);
ok("clearing a plan also withdraws the suggestions it planted",
   run(`!planNow() && !sugOv()['Squat']`));

process.exit(fail ? 1 : 0);
