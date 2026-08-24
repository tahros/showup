// test-undo.js DIR — v3.3.143: undo is for things that were taken away.
//
// Two properties, one of them a real data-loss bug that shipped:
//   1. An Undo button must not appear after ADDITIVE actions. Logging a run
//      was the only additive action that snapshotted, so an Undo offered
//      itself after logging a run — recoverable by simply deleting the run.
//   2. More seriously: undo() replaces the whole day wholesale from a
//      snapshot taken BEFORE a removal. Log new sets after that removal and
//      the snapshot is stale — restoring it silently deletes the new work.
//      The stack is now invalidated whenever anything is logged.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.performance = w.performance || { now: () => Date.now() };
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({ measureText: () => ({ width: 10 }) },
  { get: (o,k) => k in o ? o[k] : () => ({}), set: () => true }); };
w.Element.prototype.setPointerCapture = function(){};
w.Element.prototype.releasePointerCapture = function(){};

for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? "PASS" : "FAIL"), name, extra === undefined ? "" : "\u2192 " + extra);
  if (!cond) fail++;
};

const EX = "Dumbbell Press";
const setsToday = () => run(`day(todayISO).w.length`);
const undoDepth = () => run(`undoStack.length`);
const undoShown = () => run(`!!document.getElementById('undoBtn')`);

const fresh = () => run(`(function(){
  DB.days={}; undoStack.length=0;
  DB.days[todayISO]={w:[
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:16,reps:[30],at:1},
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:16,reps:[30],at:2},
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:16,reps:[30],at:3}],upd:1};
  SEED=deriveAll();
  lift={ex:${JSON.stringify(EX)},part:'Shoulder',weight:16};
  view='lift'; render();})()`);

// ---- 1. removing things still offers an undo ----------------------------
fresh();
ok("the day starts with 3 sets", setsToday() === 3, String(setsToday()));
run(`snapshot('removed 3 ${EX} sets'); day(todayISO).w=[]; SEED=deriveAll(); renderLift();`);
ok("a removal leaves an undo on the stack", undoDepth() === 1, String(undoDepth()));
ok("...and the button is offered", undoShown());
run(`undo()`);
ok("...and undo restores what was removed", setsToday() === 3, String(setsToday()));

// ---- 2. logging a run offers NO undo ------------------------------------
/* the question that started this: why is there an Undo after logging a run?
   Because run logging was the only additive action that snapshotted. */
fresh();
run(`lift={ex:'Run',part:'Run',weight:0}; renderLift();
     document.getElementById('rk').value='3.47';
     document.getElementById('rm').value='27';
     document.getElementById('addrun').click();`);
ok("the run was logged", run(`day(todayISO).w.some(s=>s.ex==='Run')`));
ok("...and no undo was pushed for it", undoDepth() === 0, String(undoDepth()));
ok("...so no Undo button appears", !undoShown());
ok("run logging no longer snapshots in source",
   !/snapshot\(`logged \$\{dDisp/.test(fs.readFileSync(path.join(dir, "js/app.js"), "utf8")));

// ---- 3. THE DATA-LOSS BUG ----------------------------------------------
/* remove an exercise, then log new sets. The old snapshot predates the new
   work, so applying it would delete that work. Before v3.3.143 the button
   was still there, still offering it. */
fresh();
run(`snapshot('removed 3 ${EX} sets'); day(todayISO).w=[]; SEED=deriveAll(); renderLift();`);
ok("a stale snapshot exists after the removal", undoDepth() === 1);
run(`lift={ex:'Lateral Raise',part:'Shoulder',weight:10}; renderLift();
     document.getElementById('wv').value='10';
     const notch=document.querySelector('.repruler .rr.on');
     if(notch) notch.click();`);
const afterLog = setsToday();
ok("new work was logged on top", afterLog >= 1, afterLog + " sets");
ok("...and the stale snapshot was discarded", undoDepth() === 0, String(undoDepth()));
ok("...so no Undo is offered that would delete it", !undoShown());
/* the actual regression check: if an undo were still applied, the new work
   would vanish. Prove the day is intact. */
run(`undo()`);
ok("calling undo anyway cannot destroy the new work", setsToday() === afterLog,
   setsToday() + " vs " + afterLog);

// ---- 4. invalidation is wired to every additive path -------------------
const appSrc = fs.readFileSync(path.join(dir, "js/app.js"), "utf8");
const pushes = (appSrc.match(/t\.w\.push\(/g) || []).length;
const invalidations = (appSrc.match(/undoInvalidate\(\)/g) || []).length;
ok("every path that logs a set invalidates the stack",
   invalidations === pushes && pushes >= 3, invalidations + " guards / " + pushes + " pushes");

/* ---- 5. v3.3.144: the chip handler is BACK — with the invalidation rule.
   Removed in v3.3.143 as an orphan; the strip's return re-orphans the
   removal. What must hold now is that the restored path carries the guard,
   which section 4's pushes===invalidations census already enforces — this
   just states the restoration explicitly. */
ok("the [data-rep-w] handler is restored", /data-rep-w/.test(appSrc.replace(/\/\*[\s\S]*?\*\//g, "")));

/* ---- 6. v3.3.150: the way back is in plain sight ------------------------
   "Where did Undo go?" — it was hiding behind EDIT. A non-empty stack means
   a destruction with nothing logged since (the v3.3.143 rule), which is
   exactly when the button must be visible without hunting. */
fresh();
run(`lift.editToday=true; renderLift();`);
run(`document.querySelector('.lastcard.sess [data-del]').click();`);
run(`lift.editToday=false; renderLift();`);
ok("after deleting and leaving EDIT, Undo is still visible", undoShown());
ok("...and it works from there", (() => {
  const before = setsToday();
  run(`document.getElementById('undoBtn').click();`);
  return setsToday() === before + 1;
})());
ok("...and once restored (stack empty) the button is gone", !undoShown());
/* logging expires it — the property that keeps it from becoming chrome */
fresh();
run(`snapshot('deleted a set'); day(todayISO).w.pop(); SEED=deriveAll(); renderLift();`);
ok("visible right after a removal", undoShown());
/* v3.3.286: logging is now a tap on the CENTRED notch of the rep ruler —
   a tap on any other notch only moves the ruler, so the test must aim at
   the one that actually writes a set. */
run(`document.querySelector('.repruler .rr.on').click();`);
ok("logging a set makes it vanish", !undoShown());
ok("...and the tip no longer claims Undo lives behind EDIT",
   !/Undo lives there/.test(fs.readFileSync(path.join(dir, "js/lift.js"), "utf8")));

console.log(fail ? "\n" + fail + " FAILED" : "\nALL PASS");
process.exit(fail ? 1 : 0);
