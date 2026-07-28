// test-sugorder.js DIR — v3.3.137: the suggested chips follow the weight.
//
// Driven through the real stepper, because the property that matters is not
// "sugChips() sorts an array" but "tapping + reorders what is on screen
// without rebuilding the card". The most important assertion here is the
// NEGATIVE one: in the default state, where the weight already matches the
// last logged set, nothing may move. A reorder feature that quietly changes
// the opening screen would be a regression dressed as a feature.
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

const EX = "Incline Barbell Bench Press";
/* a previous session at 50kg and today's set at 75kg — the exact shape of the
   screenshot that prompted this: the 75 leads because it was just logged, and
   the 50s trail behind it. */
run(`(function(){
  DB.days={}; DB.settings=DB.settings||{}; DB.settings.exW={};
  const y=new Date(todayISO+'T00:00'); y.setDate(y.getDate()-7);
  DB.days[y.toLocaleDateString('en-CA')]={w:[
    {part:'Chest',ex:${JSON.stringify(EX)},w:50,reps:[20],at:1},
    {part:'Chest',ex:${JSON.stringify(EX)},w:50,reps:[23],at:2},
    {part:'Chest',ex:${JSON.stringify(EX)},w:50,reps:[25],at:3}],upd:1};
  DB.days[todayISO]={w:[{part:'Chest',ex:${JSON.stringify(EX)},w:75,reps:[3],at:9}],upd:1};
  SEED=deriveAll();
  lift={ex:${JSON.stringify(EX)},part:'Chest',weight:75};
  view='lift'; render();})()`);

const chipWs = () => JSON.parse(run(
  `JSON.stringify([...document.querySelectorAll('.lastsets .lastset')].map(b=>+b.dataset.repW))`));
const chipPairs = () => JSON.parse(run(
  `JSON.stringify([...document.querySelectorAll('.lastsets .lastset')].map(b=>b.dataset.repW+'x'+b.dataset.repR))`));
const setWv = v => run(`(function(){const el=document.getElementById('wv'); el.value=${v};
  el.dispatchEvent(new Event('input',{bubbles:true}));})()`);

// ---- 1. the opening state matches the screenshot --------------------------
const opening = chipPairs();
ok("the chips render", opening.length > 0, opening.join(" "));
ok("the just-logged 75x3 leads on open", opening[0] === "75x3", opening.join(" "));
ok("...with the 50s behind it", opening.slice(1).every(p => p.startsWith("50")), opening.join(" "));

// ---- 2. THE INVISIBILITY PROPERTY ----------------------------------------
/* weight already equals the leading chip, so a refresh must change nothing */
setWv(75);
ok("stepping to the weight already shown changes nothing",
   chipPairs().join(" ") === opening.join(" "),
   chipPairs().join(" "));

// ---- 3. changing the weight floats the matching chips up -----------------
setWv(50);
const at50 = chipPairs();
ok("at 50, the 50s lead", at50[0].startsWith("50"), at50.join(" "));
ok("...all of them, before any other weight",
   at50.filter(p => p.startsWith("50")).length ===
   at50.findIndex(p => !p.startsWith("50")) || !at50.some(p => !p.startsWith("50")),
   at50.join(" "));
ok("...and the 75 is still present, not filtered away",
   at50.some(p => p === "75x3"), at50.join(" "));
ok("...and no chip was lost or duplicated",
   at50.slice().sort().join() === opening.slice().sort().join(),
   at50.join(" "));

// relative order within the matching group is preserved
const fiftiesOpen = opening.filter(p => p.startsWith("50"));
const fiftiesAt50 = at50.filter(p => p.startsWith("50"));
ok("...and the 50s keep their own relative order",
   fiftiesAt50.join() === fiftiesOpen.join(),
   fiftiesAt50.join(" ") + "  vs  " + fiftiesOpen.join(" "));

// ---- 4. back to 75 restores the original order ---------------------------
setWv(75);
ok("stepping back restores the opening order",
   chipPairs().join(" ") === opening.join(" "), chipPairs().join(" "));

// ---- 5. a weight with NO match leaves the order alone --------------------
setWv(65);
ok("an unmatched weight does not shuffle anything",
   chipPairs().join(" ") === opening.join(" "), chipPairs().join(" "));

// ---- 6. the real stepper button drives it, not just typed input ----------
run(`(function(){document.getElementById('wv').value=75;
  const b=[...document.querySelectorAll('[data-w]')].find(b=>b.dataset.w==='-1');
  b.click();})()`);
const afterStep = +run(`document.getElementById('wv').value`);
ok("the minus button moved the weight", afterStep < 75, String(afterStep));
ok("...and the chip row reflects the new weight", (() => {
  const ws = chipWs();
  const match = ws.filter(v => Math.abs(v - run(`toKg(${afterStep})`)) < 0.05);
  return !match.length || Math.abs(ws[0] - run(`toKg(${afterStep})`)) < 0.05;
})(), afterStep + " \u2192 " + chipPairs().join(" "));

// ---- 7. dismissals survive a reorder -------------------------------------
run(`(function(){
  const el=document.getElementById('wv'); el.value=75;
  el.dispatchEvent(new Event('input',{bubbles:true}));
  const x=document.querySelector('.lastsets .lsx');
  if(x) x.click();})()`);
const afterDismiss = chipPairs();
ok("dismissing removes a chip", afterDismiss.length === opening.length - 1,
   afterDismiss.length + " vs " + opening.length);
setWv(50);
ok("...and it stays dismissed after a reorder",
   chipPairs().length === afterDismiss.length,
   chipPairs().join(" "));

// ---- 8. the refresh is targeted, not a full re-render --------------------
ok("refreshLoad drives the chips through one funnel",
   /refreshSug\(\);/.test(fs.readFileSync(path.join(dir, "js/app.js"), "utf8")));
ok("...and refreshSug rewrites only the chip row", (() => {
  const src = fs.readFileSync(path.join(dir, "js/lift.js"), "utf8");
  const fn = (src.match(/function refreshSug\(\)\{[\s\S]*?\n\}/) || [""])[0];
  return /\.lastsets/.test(fn) && !/renderLift\(\)/.test(fn);
})());
ok("the weight is resolved before the chips are built", (() => {
  const src = fs.readFileSync(path.join(dir, "js/lift.js"), "utf8");
  return src.indexOf("lift.weight===0") < src.indexOf("sugChips(ex,ls");
})(), "resolver precedes the chip build");

console.log(fail ? "\n" + fail + " FAILED" : "\nALL PASS");
process.exit(fail ? 1 : 0);
