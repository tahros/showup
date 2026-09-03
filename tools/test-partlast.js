// test-partlast.js DIR — v3.3.151: the session's shape, one level up.
//
// The part page answered "what do I usually pick" (the tiers); the exercise
// page answered "what did I do last time" (v3.3.144). This card gives the
// part page the second answer: last session's exercises IN ORDER, each row
// a door into its lift, done-today rows checked off. The properties worth
// locking: order is the done-order (not alphabetical, not frequency),
// alternating supersets fold to one group, the card reads the newest of the
// two data eras, and Run stays out of it.
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

/* last Chest session, 7 days back: Incline first, then a Dip/Fly SUPERSET
   alternation, plus a run row that must stay out of the card. Today: the
   Incline already repeated. */
run(`(function(){
  DB.days={};
  const prev=new Date(todayISO+'T00:00'); prev.setDate(prev.getDate()-7);
  const P=prev.toLocaleDateString('en-CA');
  DB.days[P]={w:[
    {part:'Chest',ex:'Incline Barbell Bench Press',w:50,reps:[30],at:1},
    {part:'Chest',ex:'Incline Barbell Bench Press',w:50,reps:[25],at:2},
    {part:'Chest',ex:'Dip',w:70,reps:[10],at:3},
    {part:'Chest',ex:'Pectoral Fly',w:50,reps:[20],at:4},
    {part:'Chest',ex:'Dip',w:70,reps:[8],at:5},
    {part:'Run',ex:'Run',w:3.4,reps:[],mins:27,secs:0,at:6}],upd:1};
  DB.days[todayISO]={w:[
    {part:'Chest',ex:'Incline Barbell Bench Press',w:50,reps:[30],at:9}],upd:1};
  SEED=deriveAll();
  lift={ex:null,part:'Chest',weight:0};
  view='lift'; render();})()`);

const card = () => run(`document.querySelector('.partlast')`);
const rowExs = () => JSON.parse(run(
  `JSON.stringify([...document.querySelectorAll('.partlast .plrow')].map(r=>r.dataset.ex))`));

// ---- 1. the card exists, dated, in the right place -----------------------
ok("the LAST TIME · CHEST card renders", !!card());
/* v3.3.273 RESTATES: the part now leads the heading as a scope pill — the
   selected chip restated in miniature — so the section visibly belongs to
   the selection. Text reads "CHEST last time" with CHEST inside .scopepill,
   uppercased by CSS, so textContent carries the raw name. */
ok("...named for the part, as the scope pill leading the heading",
   (function(){const pill=run(`(document.querySelector('.partlast .lasthead .scopepill')||{}).textContent||''`);
     const head=run(`document.querySelector('.partlast .lasthead span').textContent`);
     return pill==='Chest' && /^Chest\s*last time/.test(head);})());
ok("...dated with the history link", run(`!!document.querySelector('.partlast .linkdate')`));
/* v3.3.152 disclosure audit: the (i) became the rulebook's inline line, and
   the ✓ names its meaning in accessibility metadata instead of standing
   alone as a symbol. */
ok("...its (i) is gone", run(`!document.querySelector('.partlast .ibtn.tipi')`));
ok("...replaced by the inline helper line",
   /Tap an exercise to use its previous weight/.test(run(`document.querySelector('.partlast .inlinehelp').textContent`)));
ok("...and the checkmark carries an aria-label", run(`(function(){
     const r=[...document.querySelectorAll('.partlast .plrow')].find(r=>r.classList.contains('pldone'));
     const c=r&&r.querySelector('[aria-label="completed today"]');
     return !!c;})()`));
/* anchored on the FIRST tier heading of any kind — in this fixture the
   go-to tier is legitimately empty (its candidates are open today or too
   rare), which the original anchor mistook for a placement failure */
ok("...above the tier list", run(`(function(){
     const pl=document.querySelector('.partlast');
     const tier=[...document.querySelectorAll('#view h2')]
       .find(h=>/go-to|Sometimes|Never tried/i.test(h.textContent));
     return !!(pl&&tier&&(pl.compareDocumentPosition(tier)&Node.DOCUMENT_POSITION_FOLLOWING));
   })()`));

// ---- 2. the shape: done-order, supersets folded, runs excluded ----------
ok("exercises appear in the order they were done",
   rowExs().join("|") === "Incline Barbell Bench Press|Dip|Pectoral Fly",
   rowExs().join(" | "));
ok("the Dip superset folds to ONE group counting both sets", run(`(function(){
     const r=[...document.querySelectorAll('.partlast .plrow')].find(r=>r.dataset.ex==='Dip');
     return r&&/2 sets/.test(r.textContent);})()`));
ok("...its rep chips in the History grammar", run(`(function(){
     const r=[...document.querySelectorAll('.partlast .plrow')].find(r=>r.dataset.ex==='Dip');
     return r&&r.querySelectorAll('.repchip').length===2;})()`));
ok("the run stays out of the card", !rowExs().includes("Run"));

// ---- 3. done today is checked off and stepped back ----------------------
ok("the repeated Incline is marked done", run(`(function(){
     const r=[...document.querySelectorAll('.partlast .plrow')].find(r=>r.dataset.ex==='Incline Barbell Bench Press');
     return r&&r.classList.contains('pldone')&&/✓/.test(r.textContent);})()`));
ok("...and the un-repeated rows are not",
   run(`[...document.querySelectorAll('.partlast .plrow')].filter(r=>r.classList.contains('pldone')).length`) === 1);

// ---- 4. every row is a door into its lift --------------------------------
run(`document.querySelector('.partlast .plrow[data-ex="Pectoral Fly"]').click()`);
ok("tapping a row opens that exercise", run(`lift.ex`) === "Pectoral Fly", run(`lift.ex`));
ok("...as a real navigation, view intact", run(`view`) === "lift");
run(`lift={ex:null,part:'Chest',weight:0}; render();`);

// ---- 5. the seed era serves when it is newer -----------------------------
run(`(function(){
  DB.days={};   // no app days at all — the sheet is the only history
  SEED=deriveAll();
  lift={ex:null,part:'Shoulder',weight:0}; view='lift'; render();})()`);
const seedHasShoulder = run(`Object.keys(SEED.sessions).some(d=>d<todayISO&&SEED.sessions[d].some(r=>r[0]==='Shoulder'))`);
ok("with only sheet history, the card still renders from it",
   seedHasShoulder ? !!card() : !card(),
   seedHasShoulder ? "seed served" : "no shoulder in seed fixture (skip)");

// ---- 6. no history, no card — absence shown by absence -------------------
run(`(function(){
  DB.days={}; SEED=deriveAll(); SEED.sessions={};
  lift={ex:null,part:'Sixpack',weight:0}; view='lift'; render();})()`);
ok("a part never trained shows no card", !card());
run(`(function(){ SEED=deriveAll(); lift={ex:null,part:'Run',weight:0}; view='lift'; render();})()`);
ok("the Run part never shows one", !card());

console.log(fail ? "\n" + fail + " FAILED" : "\nALL PASS");
// ---- v3.3.274: the card folds, and the choice persists --------------------
// Driven through the REAL button (lesson 4), asserted on effects: rows gone,
// head standing, date link alive, chevron state honest, and the preference
// surviving a full re-render because it lives in settings.
/* later sections leave the ledger in an unknown shape — reseed a known one
   so the card definitely renders before the fold is exercised */
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  const d=new Date(t); d.setDate(d.getDate()-2);
  DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Dip',w:0,reps:[10,8]}],upd:1};
  SEED=deriveAll(); view='lift'; lift.ex=null; lift.part='Chest';
  DB.settings.plFold=false; render();})()`);
/* v3.3.430 RESTATES. These pinned two TEXT GLYPHS -- U+25BE open, U+25B8
   closed -- swapped for one another. The plan's fold two inches away used the
   icon system's chevron, rotated. Two controls doing one job, drawn two ways,
   and the maker circled both and asked which was right. It is the icon: one
   shape, one weight, rotation rather than substitution. */
ok("the fold button renders, open by default",
   run(`(function(){const b=document.querySelector('.plfold');
     return !!b && b.getAttribute('aria-expanded')==='true' && !!b.querySelector('.ic-chevron');})()`));
run(`document.querySelector('.plfold').click()`);
ok("one tap folds the card to its head row",
   run(`document.querySelectorAll('.partlast .plrow').length`) === 0 &&
   run(`!!document.querySelector('.partlast .lasthead .scopepill')`) &&
   run(`!!document.querySelector('.partlast .linkdate')`));
ok("...the help line folds away with the rows",
   run(`!document.querySelector('.partlast .inlinehelp')`));
ok("...and the chevron says so, by ROTATION -- the same glyph, turned",
   run(`(function(){const b=document.querySelector('.plfold');
     const ic=b.querySelector('.ic-chevron');
     return b.getAttribute('aria-expanded')==='false' && !!ic
       && !/rotate\(90deg\)/.test(ic.getAttribute('style')||'');})()`));
/* the point of the change: this fold and the plan's are the SAME control */
ok("...and it is the same control the plan's fold uses",
   run(`(function(){
     const a=document.querySelector('.plfold .ic-chevron');
     return !!a && a.tagName.toLowerCase()==='svg' && a.getAttribute('viewBox')==='0 0 100 100';})()`));
ok("...with no text glyph left anywhere in it",
   run(`(function(){const b=document.querySelector('.plfold');
     return !/[\u25b8\u25be\u25b6\u25bc]/.test(b.textContent||'');})()`));
ok("the preference is a setting, not a render whim",
   run(`DB.settings.plFold===true`));
run(`render()`);
ok("...so it survives a full re-render", run(`document.querySelectorAll('.partlast .plrow').length`) === 0);
run(`document.querySelector('.plfold').click()`);
ok("one tap opens it back up, rows restored",
   run(`document.querySelectorAll('.partlast .plrow').length`) > 0 &&
   run(`DB.settings.plFold===false`));

// ---- v3.3.276: "last time" means the last FULL session --------------------
// The maker's exact report: Shoulder's most recent touch was a 3-set cameo
// on a Chest day, and the card presented it as the Shoulder playbook. The
// card now reads through the same session-vs-cameo authority the planner
// uses. Full Shoulder day 4d ago (3 exercises), cameo 2d ago (1 exercise) —
// the fixture makes the two days distinguishable by content and by date.
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
  /* full days at the maker's real dose (~14 sets) so half-median (7) sits
     clearly above a 3-set cameo — a 6-set "full" day would put the floor at
     3 and let the cameo qualify, which is the rule working, not failing */
  const FULL=[{part:'Shoulder',ex:'Dumbbell Shoulder Press',w:24,reps:[6,6,6,6,5]},
    {part:'Shoulder',ex:'Lateral Raise',w:14,reps:[12,12,12,10]},
    {part:'Shoulder',ex:'Reverse Pec Deck',w:30,reps:[12,12,12,12,10]}];
  for(const n of [16,10,4]) DB.days[D(n)]={w:JSON.parse(JSON.stringify(FULL)),upd:1};
  DB.days[D(2)]={w:[{part:'Chest',ex:'Chest Press',w:60,reps:[10,10,10]},
    {part:'Shoulder',ex:'Lateral Raise',w:14,reps:[12,12,10]}],upd:1};
  SEED=deriveAll(); view='lift'; lift.ex=null; lift.part='Shoulder';
  DB.settings.plFold=false; render();})()`);
const D4=run(`(function(){const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-4);
  return d.toLocaleDateString('en-CA');})()`);
ok("the card shows the last FULL session, not the fresher cameo",
   run(`document.querySelector('.partlast .linkdate').dataset.histd`) === D4,
   run(`document.querySelector('.partlast .linkdate').dataset.histd`) + " (cameo was 2d ago)");
ok("...with the full session's exercises, all three",
   run(`document.querySelectorAll('.partlast .plrow').length`) === 3);
ok("the planner and the card agree on what the last session was",
   run(`(function(){const lp=lastPartSession('Shoulder');
     return daysAgo(lp.d)===trainingPlan().info.Shoulder.sinceF;})()`));
// a part whose entire record is small days still shows its latest — the card
// degrades to the ledger, never to nothing
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
  for(const n of [9,5,2]) DB.days[D(n)]={w:[{part:'Sixpack',ex:'Crunch',w:0,reps:[15,15,15]}],upd:1};
  SEED=deriveAll(); view='lift'; lift.ex=null; lift.part='Sixpack'; render();})()`);
ok("a small-dose part still shows its most recent day",
   run(`(function(){const lp=lastPartSession('Sixpack'); return lp?daysAgo(lp.d):null;})()`) === 2);

process.exit(fail ? 1 : 0);
