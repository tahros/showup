// test-ledgerrule.js DIR — v3.3.397. THE LEDGER DECIDES WHAT "TODAY" MEANS.
// A plan pasted (or, from v3.3.4xx, written) after today's sets are in the
// record is a plan for TOMORROW: stamped with tomorrow's date, invisible to
// planNow() and the rails tonight, one quiet line on Today, and simply there
// at 00:00 through the expiry mechanism v3.3.278 already had. Asserted on
// effects: the stamp, the rails, the rendered line, and a simulated midnight.
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

const PASTE = "Deadlift\n  135 lb x 5\n  215 lb x 5 5 5 5\n\nBent-Over Row\n  175 lb x 10 10 8 8\n\nPull Up\n  BW +10 x 8 8 6 6";
const fresh = () => run(`(function(){DB.days={}; DB.plan=null; DB.suggest=null; delete DB.settings.dayDone;
  DB.settings.unit='lb'; DB.settings.onboarded=true; SEED=deriveAll(); view='today'; render();})()`);
const paste = () => run(`(function(){lift.planText=${JSON.stringify(PASTE)}; lift.planRows=parsePlan(lift.planText);
  lift.plan='preview'; render(); document.querySelector('[data-planaccept]').click(); return DB.plan&&DB.plan.d;})()`);
const tomorrow = run(`tomorrowISO()`);

/* ---- the rule itself ---- */
fresh();
ok("nothing logged: the plan is for today", run(`writeDateISO()===todayISO`), run(`writeDateISO()`));
run(`(function(){day(todayISO).w.push({part:'Chest',ex:'Barbell Bench Press',w:60,reps:[8,8,6],at:1}); save(true);})()`);
ok("one set in the record: the plan is for tomorrow", run(`writeDateISO()`)===tomorrow, run(`writeDateISO()`));
fresh();
run(`(function(){DB.settings.dayDone=todayISO;})()`);
ok("a closed day with no sets is also over: tomorrow", run(`writeDateISO()`)===tomorrow, run(`writeDateISO()`));
ok("...and tomorrow is one calendar day on, not 24 hours", (()=>{ const a=run(`tomorrowISO()`), b=run(`todayISO`);
  return new Date(a+'T00:00')-new Date(b+'T00:00')===86400000; })(), tomorrow);

/* ---- a paste after training lands on tomorrow ---- */
fresh();
run(`(function(){day(todayISO).w.push({part:'Chest',ex:'Barbell Bench Press',w:60,reps:[8,8,6],at:1}); save(true); render();})()`);
ok("the paste screen names the day it is for",
   /Paste a plan for [A-Z][a-z]{2} \d{1,2}/.test(run(`(function(){lift.plan='paste'; render(); return document.querySelector('#view h2').textContent;})()`)),
   run(`document.querySelector('#view h2').textContent`));
const stamped = paste();
ok("accepting stamps the plan with tomorrow's date", stamped===tomorrow, stamped);
ok("...so planNow() does not see it tonight", run(`planNow()===null`));
ok("...and planPending() does, with every exercise", run(`(planPending()||{items:[]}).items.length`)===3);
ok("...and the Suggested rail is NOT fed tonight",
   run(`Object.values(sugOv()).filter(o=>o&&o.from==='plan').length`)===0);
/* v3.3.414 RESTATES: the row names the DAY and the COUNT. "written, opens at
   midnight" was a sentence about the mechanism; with the plan readable beneath
   the row (v3.3.413) the mechanism no longer needs announcing, and the maker
   struck it. Dormancy is asserted where it lives -- planNow() is null and the
   rail is not fed -- not in a caption. */
ok("Today shows the dormant line, naming the day and the count",
   /\w{3} \d{1,2}/.test(run(`(document.querySelector('.planpending .pp-day')||{}).textContent||''`)) &&
   /3 exercises/.test(run(`document.querySelector('.planpending').textContent`)) &&
   !/midnight/.test(run(`document.querySelector('.planpending').textContent`)),
   run(`JSON.stringify((document.querySelector('.planpending')||{}).textContent)`));
/* v3.3.414: ONE LINE. The row is a flex line that does not wrap -- day left,
   count and chevron right -- because the old sentence wrapped and pushed the
   chevron under the count. jsdom lays nothing out, so the rule is asserted. */
{
  const css=require("fs").readFileSync(require("path").join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
  ok("the pending row is one flex line that cannot wrap",
     /\.planfoldrow\{display:flex;[^}]*white-space:nowrap/.test(css));
  ok("...with the count and chevron centred together on the right",
     /\.planfoldrow \.pp-right\{display:inline-flex;align-items:center/.test(css));
}
ok("...and the line never says how much of anything is done",
   !/\b\d+\s*(of|\/)\s*\d+\b/.test(run(`document.querySelector('.planpending').textContent`)));
ok("...while Today itself is still mid-session, not planning",
   run(`!document.querySelector('.tnextplan')`));
ok("the record has exactly the one set that was there", run(`DB.days[todayISO].w.length`)===1);

/* ---- midnight: the same mechanism that expires a plan wakes this one ---- */
run(`(function(){todayISO=tomorrowISO(); lift.copy=false; SEED=deriveAll(); render();})()`);
ok("at 00:00 the plan is today's", run(`!!planNow()&&planNow().items.length===3`));
ok("...the dormant line is gone", run(`!document.querySelector('.planpending')`));
ok("...the card is up", run(`!!document.querySelector('.plancard')`));
ok("...and the rail is fed on first render, from the plan",
   run(`Object.values(sugOv()).filter(o=>o&&o.from==='plan').length`)===3,
   run(`JSON.stringify(Object.keys(sugOv()))`));
ok("...feeding it again changes nothing", run(`planWake()===false`));
ok("Train next reads the woken plan", /Deadlift/.test(run(`(document.querySelector('.tnextplan')||{}).textContent||''`)));

/* ---- and with nothing logged, a paste is still today's, unchanged ---- */
run(`todayISO=new Date().toLocaleDateString('en-CA')`);   // back from the simulated midnight, or checkDate() swallows the tap
fresh();
ok("with an empty day the paste is today's, as it always was", paste()===run(`todayISO`));
ok("...fed to the rail at once", run(`Object.values(sugOv()).filter(o=>o&&o.from==='plan').length`)===3);

process.exit(fail ? 1 : 0);
