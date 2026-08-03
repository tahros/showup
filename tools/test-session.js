// test-session.js DIR — v3.3.144: one card, one grammar.
//
// "Last time" and "Logged today" merged into THIS SESSION, and the delete
// affordance moved behind EDIT. The property that matters most is the one
// the maker asked for by sketch: today's sets render in the SAME grammar as
// history — weight-grouped rows of rep chips — with the past dimmed, not
// restyled. And the property that could hurt: deletion must be genuinely
// gated (no armed delete buttons in read mode) while remaining reachable in
// two taps.
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
  console.log((cond ? "FAIL" === "x" ? "" : "PASS" : "FAIL"), name, extra === undefined ? "" : "\u2192 " + extra);
  if (!cond) fail++;
};

const EX = "Dumbbell Front Raise";
run(`(function(){
  DB.days={};
  const prev=new Date(todayISO+'T00:00'); prev.setDate(prev.getDate()-7);
  DB.days[prev.toLocaleDateString('en-CA')]={w:[
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:12,reps:[10],at:1},
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:12,reps:[10],at:2},
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:12,reps:[10],at:3},
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:12,reps:[10],at:4}],upd:1};
  DB.days[todayISO]={w:[
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:12,reps:[10],at:9},
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:12,reps:[10],at:10},
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:14,reps:[8],at:11}],upd:1};
  SEED=deriveAll();
  lift={ex:${JSON.stringify(EX)},part:'Shoulder',weight:12,editToday:false};
  view='lift'; render();})()`);

// ---- 1. one card where two used to be ------------------------------------
ok("exactly one session card renders", run(`document.querySelectorAll('.lastcard.sess').length`) === 1);
ok("no standalone Logged-today zone survives", run(`!document.querySelector('.zone.logged')`));
ok("no standalone Last-time card survives",
   run(`document.querySelectorAll('.lastcard').length`) === 1,
   run(`document.querySelectorAll('.lastcard').length`) + " lastcards");

// ---- 2. one grammar, two distances ---------------------------------------
ok("today renders as weight-grouped rows of rep chips",
   run(`document.querySelectorAll('.sess-now .lastrow').length`) >= 2,
   run(`document.querySelectorAll('.sess-now .lastrow').length`) + " rows");
ok("...folded: two 12kg sets share one row", run(`(function(){
     const first=document.querySelector('.sess-now .lastrow');
     return first && first.querySelectorAll('.repchip').length===2;})()`));
ok("last time renders in the SAME grammar", run(`document.querySelectorAll('.sess-then .lastrow').length`) >= 1);
ok("...dimmed, not restyled", (() => {
  const css = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
  return /\.sess-then\{[^}]*opacity:\.\d+/.test(css);
})());
ok("...and dated with the existing history link",
   run(`!!document.querySelector('.sess-then .linkdate')`));

// ---- 3. deletion is gated, but two taps away ------------------------------
ok("read mode arms NO delete surfaces",
   run(`document.querySelectorAll('.lastcard.sess [data-del]').length`) === 0);
ok("the EDIT button is offered", run(`!!document.getElementById('sessEdit')`));
run(`document.getElementById('sessEdit').click()`);
ok("EDIT shows one tile per individual set, armed",
   run(`document.querySelectorAll('.lastcard.sess [data-del]').length`) === 3,
   run(`document.querySelectorAll('.lastcard.sess [data-del]').length`) + " armed");
ok("...with Clear and Move alongside",
   run(`!!document.getElementById('clearToday') && !!document.getElementById('moveToday')`));
ok("...and the button now reads DONE",
   run(`document.getElementById('sessEdit').textContent`) === "DONE");

// deleting in EDIT actually deletes — the two-tap path works end to end
const before = run(`day(todayISO).w.length`);
run(`document.querySelector('.lastcard.sess [data-del]').click()`);
ok("a tap on an armed tile deletes the set", run(`day(todayISO).w.length`) === before - 1,
   run(`day(todayISO).w.length`) + " vs " + (before - 1));
ok("...and the removal is undoable", run(`undoStack.length`) >= 1);
run(`undo()`);
ok("...undo restores it", run(`day(todayISO).w.length`) === before);

run(`document.getElementById('sessEdit').click()`);
ok("DONE returns to read mode, disarmed",
   run(`document.querySelectorAll('.lastcard.sess [data-del]').length`) === 0);

// ---- 4. footer survives the merge ----------------------------------------
ok("the volume footer renders inside the card",
   run(`!!document.querySelector('.lastcard.sess #volNum')`));
ok("...with the vs-last-session delta",
   run(`!!document.querySelector('.lastcard.sess .delta')`));

// ---- 5. the strip is back above it ---------------------------------------
ok("the compact Suggested strip renders", run(`!!document.querySelector('.zone.mini .lastsets')`));
ok("...between the log zone and the session card", run(`(function(){
     const strip=document.querySelector('.zone.mini');
     const card=document.querySelector('.lastcard.sess');
     return !!(strip&&card&&(strip.compareDocumentPosition(card)&Node.DOCUMENT_POSITION_FOLLOWING));
   })()`));

// ---- 6. the log zone lost its caption, not its controls -------------------
ok("the 'Log a set' caption is gone", !/Log a set/.test(run(`$('#view').innerHTML`)));
ok("...but the stepper, tiles and Add survive", run(`!!document.getElementById('wv')
   && document.querySelectorAll('.repgrid button').length>0
   && !!document.getElementById('addrep')`));

// ---- 7. empty states stay honest ------------------------------------------
run(`DB.days[todayISO]={w:[],upd:1}; SEED=deriveAll(); lift.editToday=false; renderLift();`);
ok("no sets today: the card says so bluntly",
   /Nothing yet/.test(run(`document.querySelector('.lastcard.sess').textContent`)));
ok("...and offers no EDIT for nothing", run(`!document.getElementById('sessEdit')`));
ok("...while last time still shows below",
   run(`!!document.querySelector('.sess-then .lastrow')`));

console.log(fail ? "\n" + fail + " FAILED" : "\nALL PASS");
process.exit(fail ? 1 : 0);
