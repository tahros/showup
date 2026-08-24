// test-sugorder.js DIR — v3.3.141: the suggestion DOT follows the weight.
//
// v3.3.137 built a weight-following reorder for the Suggested chips. v3.3.141
// deleted that whole section: it sat above "Logged today" showing chips that
// looked identical to the records below, one a command and the other a
// receipt. The guidance moved onto the rep tiles as a dot. The PROPERTIES
// under test are the same ones the chips had — follows the weight, exact
// match only, nothing marked when nothing matches — so the suite was
// rewritten rather than deleted.
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

/* v3.3.286: the tile row became the rep ruler. The two properties this suite
   defends are unchanged — the suggestion mark tracks last session's reps at
   the CURRENT weight, and it moves when the weight moves — so the selectors
   move to the ruler's notches. `tiles()` is now the emphasised notches: the
   same list repChoices() always produced, just rendered as weight along a
   number line instead of eight buttons. */
const dotted = () => JSON.parse(run(
  `JSON.stringify([...document.querySelectorAll('.repruler .rr.sug')].map(b=>+b.dataset.rep))`));
const tiles = () => JSON.parse(run(
  `JSON.stringify([...document.querySelectorAll('.repruler .rr.maj')].map(b=>+b.dataset.rep))`));
const setWv = v => run(`(function(){const el=document.getElementById('wv'); el.value=${v};
  el.dispatchEvent(new Event('input',{bubbles:true}));})()`);

/* ---- 1. v3.3.144: the strip is BACK — compact form only ----------------
   Cut in v3.3.141, recalled two releases later: the one-tap complete w×r
   log was the part that mattered. The tall variant stays gone. */
ok("the compact Suggested strip renders", run(`!!document.querySelector('.zone.mini .lastsets')`));
/* v3.3.145: it renders WITH its name — v3.3.144 shipped the chips as an
   anonymous row, and the maker's first field note was the missing label */
ok("...labelled 'SUGGESTED'", /SUGGESTED/.test(run(`document.querySelector('.zone.mini').textContent`)));
/* v3.3.147: and labelled in the SAME class as its peers — the header font
   mismatch was two classes doing one job, fixed by unification, so this
   asserts the class, not a size that could drift again */
ok("...as a .lasthead, the same class THIS SESSION uses",
   run(`!!document.querySelector('.zone.mini .lasthead')`)
   && run(`!document.querySelector('.zone.mini .zonehead')`));
ok("...with a working (i)", run(`(function(){
     const b=document.querySelector('.zone.mini .ibtn.tipi'); if(!b) return false;
     b.click(); const tf=document.getElementById('tipFloat');
     const ok=!!(tf&&!tf.hidden&&tf.textContent.length>10); if(tf) tf.hidden=true; return ok;})()`));
ok("...but the tall variant's bulk actions stay gone",
   run(`!document.getElementById('repeatAll') && !document.getElementById('copySets')`));
ok("a chip tap logs the complete pair", (() => {
  const before = run(`day(todayISO).w.length`);
  run(`document.querySelector('[data-rep-w]').click()`);
  return run(`day(todayISO).w.length`) === before + 1;
})());
ok("...and clears any stale undo snapshot (the v3.3.143 rule)",
   run(`undoStack.length`) === 0, String(run(`undoStack.length`)));
// the v3.3.137 weight-follow property, back with the strip
ok("chips matching the stepper weight lead", (() => {
  run(`(function(){const el=document.getElementById('wv'); el.value='50';
       el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const ws = JSON.parse(run(`JSON.stringify([...document.querySelectorAll('.zone.mini [data-rep-w]')].map(b=>+b.dataset.repW))`));
  const hasMatch = ws.some(w => Math.abs(w - 50) < 0.05);
  return !hasMatch || Math.abs(ws[0] - 50) < 0.05;
})());

// ---- 2. Last time took its place ----------------------------------------
const viewHTML = run(`$('#view').innerHTML`);
ok("Last time renders", /LAST TIME/i.test(viewHTML));
ok("...and the old standalone zone is gone", !/Logged today/.test(viewHTML));
/* v3.3.144: "Logged today" no longer exists — LAST TIME is the dimmed
   lower group of the This-session card, so it must render INSIDE it and
   AFTER today's rows. */
ok("...as the dimmed group inside the session card",
   run(`!!document.querySelector('.lastcard.sess .sess-then')`));
/* asserted on the DOM, not on indexOf — the (i) tip text also contains the
   words "last time", which a string search happily matched first */
ok("...after today's rows, not before", run(`(function(){
     const card=document.querySelector('.lastcard.sess'); if(!card) return false;
     const now=card.querySelector('.sess-now'), then=card.querySelector('.sess-then');
     return !!(now&&then&&(now.compareDocumentPosition(then)&Node.DOCUMENT_POSITION_FOLLOWING));
   })()`));

// ---- 3. the dot marks last session's reps at the current weight ---------
setWv(50);
const at50 = dotted();
ok("the ruler marks your usual reps", tiles().length > 0, tiles().join(","));
ok("...and every rep in between is still reachable",
   run(`document.querySelectorAll('.repruler .rr').length`) >= 30);
ok("at 50, last session's reps at 50 are dotted", at50.length > 0, at50.join(",") || "none");
ok("...and every dotted rep was actually done at 50 last session",
   at50.every(r => run(`suggestedFor(${JSON.stringify(EX)}).sets.some(s=>Math.abs(s.w-50)<0.05&&s.r===${'' + r})`)),
   at50.join(","));
ok("...and every such rep that is emphasised is marked", (() => {
  const want = JSON.parse(run(`JSON.stringify([...new Set(
    suggestedFor(${JSON.stringify(EX)}).sets.filter(s=>Math.abs(s.w-50)<0.05).map(s=>s.r))])`));
  const shown = tiles();
  return want.filter(r => shown.includes(r)).every(r => at50.includes(r));
})(), at50.join(","));

// ---- 4. the marks move with the weight ----------------------------------
setWv(75);
const at75 = dotted();
ok("stepping to 75 changes which reps are dotted", at75.join() !== at50.join(),
   "50:[" + at50.join(",") + "] 75:[" + at75.join(",") + "]");
ok("...and nothing from the 50kg session is still marked",
   !at75.some(r => at50.includes(r) && !run(
     `suggestedFor(${JSON.stringify(EX)}).sets.some(s=>Math.abs(s.w-75)<0.05&&s.r===${'' + r})`)),
   at75.join(","));

// ---- 5. a weight with no history marks nothing --------------------------
setWv(65);
ok("an unmatched weight dots nothing at all", dotted().length === 0, dotted().join(","));

// ---- 6. the stepper button drives it too --------------------------------
setWv(50);
const before = dotted().join();
run(`(function(){const b=[...document.querySelectorAll('[data-w]')].find(b=>b.dataset.w==='1'); b.click();})()`);
ok("the plus button re-marks the tiles", dotted().join() !== before || dotted().length === 0,
   "was [" + before + "] now [" + dotted().join(",") + "]");

// ---- 7. the dot is a footnote, not a second button ----------------------
const css = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
ok("the mark is a dot, not an outline",
   /\.repgrid button\.sug::after\{[^}]*border-radius:50%/.test(css));
ok("...and does not change the tile's own border",
   !/\.repgrid button\.sug\{[^}]*border(?!-radius)/.test(css));
ok("...and stays out of the layout, so the grid never reflows",
   /\.repgrid button\.sug::after\{[^}]*position:absolute/.test(css));

console.log(fail ? "\n" + fail + " FAILED" : "\nALL PASS");
process.exit(fail ? 1 : 0);
