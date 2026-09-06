// test-exitpair.js DIR — asserts the open-part view offers BOTH exits,
// that each is wired to its own handler, and that sealing collapses the pair.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage33";

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

run(`
  const t=dayMeta();
  t.w.push({part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[35]});
  lastSetAt=Date.now();                 // session is live
  view='lift'; lift={part:'Shoulder',ex:null,weight:0}; render();
`);

let fail = 0;
const check = (name, expr, want) => {
  const got = run(expr), ok = String(got) === String(want);
  console.log((ok?"PASS":"FAIL"), name, "→", got);
  if (!ok) fail++;
};

check("exit row renders",       `!!document.querySelector('.btnrow')`, true);
/* v3.3.457 RESTATES: the row holds Continue alone. "Done with <part>" is
   gone -- with a plan, the exercise and the day are the two units that mean
   something, and the part sat between them doing neither job. The day's close
   now renders further down the same screen. */
check("Continue stands alone in the row", `document.querySelectorAll('.btnrow .btn').length`, 1);
check("Continue carries data-go",
      `document.querySelector('.btnrow .btn[data-go]').dataset.go`, "Shoulder");
check("Continue is red while live",
      `document.querySelector('.btnrow .btn[data-go]').classList.contains('livego')`, true);
check("no part-level Complete anywhere", `!!document.getElementById('donePartBtn')`, false);
check("...but the day's close is on this screen, quiet while the plan is not done",
      `(function(){const b=document.getElementById('doneAllBtn'); return !!b && b.classList.contains('ghost');})()`, true);

// a part sealed by an earlier build still offers Reopen
run(`dayMeta().donePart.push('Shoulder'); render();`);
check("sealed (legacy) → row gone",       `!!document.querySelector('.btnrow')`, false);
check("sealed (legacy) → reopen offered", `!!document.getElementById('reopenPartBtn')`, true);

// not-live but still open: Continue must drop the red
/* v3.3.431: sealing a part no longer closes the day, so this fixture says
   plainly which state it wants rather than relying on a side effect that has
   been removed. doneAll is set by the Complete button and cleared by logging
   or reopening -- one door, and the test uses it. */
run(`
  dayMeta().donePart.length=0; dayMeta().doneAll=true; lastSetAt=0; render();
`);
check("not live → Continue not red",
      `document.querySelector('.btnrow .btn[data-go]').classList.contains('livego')`, false);
check("not live → row still offers Continue (v3.3.457: alone)",
      `document.querySelectorAll('.btnrow .btn').length`, 1);

process.exit(fail ? 1 : 0);
