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
check("two buttons in the row", `document.querySelectorAll('.btnrow .btn').length`, 2);
check("Continue carries data-go",
      `document.querySelector('.btnrow .btn[data-go]').dataset.go`, "Shoulder");
check("Continue is red while live",
      `document.querySelector('.btnrow .btn[data-go]').classList.contains('livego')`, true);
check("Complete keeps its handler id",
      `!!document.querySelector('.btnrow #donePartBtn')`, true);
check("Complete is sheen-exempt (.ghost)",
      `document.querySelector('.btnrow #donePartBtn').classList.contains('ghost')`, true);

// seal the part: the pair must collapse back to the single Reopen control
run(`document.getElementById('donePartBtn').click();`);
check("sealed → row gone",       `!!document.querySelector('.btnrow')`, false);
check("sealed → reopen offered", `!!document.getElementById('reopenPartBtn')`, true);

// not-live but still open: Continue must drop the red
run(`
  dayMeta().donePart.length=0; lastSetAt=0; render();
`);
check("not live → Continue not red",
      `document.querySelector('.btnrow .btn[data-go]').classList.contains('livego')`, false);
check("not live → row still offers both",
      `document.querySelectorAll('.btnrow .btn').length`, 2);

process.exit(fail ? 1 : 0);
