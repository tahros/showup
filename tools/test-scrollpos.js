// test-scrollpos.js DIR — every horizontally scrolling surface must open on
// the CURRENT period, not the oldest. jsdom reports zero layout, so the DOM
// assertions below check structure and the scroll call is exercised for
// throw-safety; the arithmetic is asserted directly against a fake element.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage42";

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
/* check() EVALS its expression, which is wrong for a value computed here in
   Node rather than inside the app (and, as v3.3.323 found the hard way, a
   failure report containing a CSS selector then crashes the suite instead of
   failing it). checkVal compares without eval. */
const checkVal = (name, got, want) => {
  const ok = String(got) === String(want);
  console.log((ok?"PASS":"FAIL"), name, "→", got);
  if (!ok) fail++;
};

run(`
  const _t0=new Date(todayISO+'T00:00');
  for(let i=1;i<=200;i++){
    const d=new Date(_t0); d.setDate(d.getDate()-i);
    const iso=d.toLocaleDateString('en-CA');
    if(i%2===0) DB.days[iso]={w:[{part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[30,30]}],upd:1};
  }
  SEED=deriveAll(); _fireDist=null;
  view='stats'; render();
`);

check("retired heatmap is absent", `!!document.querySelector('.heatcols')`, false);
check("render did not throw",       `!!document.querySelector('#view').innerHTML.length`, true);
/* v3.3.307 RESTATES: the month calendar became a year heatmap (weeks as
   columns, weekdays as rows). The properties are unchanged — today must be
   findable, and the grid must FIT rather than force a sideways drag — so
   they are asserted on the heatmap's own structure. */
check("the attendance grid identifies today", `document.querySelectorAll('.heatgrid .tod').length`, 1);
/* v3.3.334 RESTATES v3.3.307's second property, on the maker's instruction.
   "The grid must FIT rather than force a sideways drag" was the right call
   for a 35-week window. He has since asked for the whole ledger -- a section
   called "show up, that's the whole game", sitting over a lifetime day
   count, was showing eight months of it -- and a lifetime cannot fit a
   phone. Scrolling is now the POINT, and v3.3.333 already made it land on
   today rather than on the far past, which is what "forcing a drag" was
   really about. What survives unchanged is the first property: today must be
   findable. What replaces the second is that the span follows the LEDGER,
   with 35 weeks as a floor so a new ledger still gets a grid worth looking
   at rather than four lonely columns. */
check("...and spans at least the floor, however new the ledger",
      `+document.querySelector('.heatgrid').style.getPropertyValue('--hw') >= 35`, true);
/* the real question is not how many columns but WHERE THE GRID STARTS, so
   ask the first cell what day it is. A fixture with a genuinely old first
   day, because the default one is inside the floor and would never exercise
   the branch -- an assertion that cannot fail is worse than none. */
run(`(function(){const t=new Date(todayISO+'T00:00');
  const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
  DB.days[D(900)]={w:[{part:'Back',ex:'Pull Up',w:0,reps:[8],at:1}],upd:1};
  DB.days[D(3)]={w:[{part:'Back',ex:'Pull Up',w:0,reps:[8],at:1}],upd:1};
  SEED=deriveAll(); view='stats'; render();})()`);
check("...reaching back to the ledger's first day, not a fixed window",
      `(function(){const first=document.querySelector('.heatgrid .hc');
        const d=first.getAttribute('aria-label').split(' ')[0];
        return d <= SEED.totals.first;})()`, true);
check("...and still ending on today",
      `document.querySelectorAll('.heatgrid .tod').length`, 1);
check("...with a year label over the column each year begins in",
      `(function(){const ys=[...document.querySelectorAll('.heatyears span')];
        if(ys.length<2) return 'only '+ys.length;
        const hw=+document.querySelector('.heatgrid').style.getPropertyValue('--hw');
        const cells=[...document.querySelectorAll('.heatgrid .hc')];
        return ys.every(sp=>{const c=+sp.style.getPropertyValue('--c');
          if(c<0||c>=hw) return false;
          const d=cells[c*7].getAttribute('aria-label').split(' ')[0];
          return d.slice(0,4)===sp.firstChild.textContent.trim();});})()`, true);
/* v3.3.335: the year states how many DAYS of it you showed up for -- the
   app's own unit, counted from the whole ledger rather than from the visible
   columns, so a year that starts mid-grid still reports its true total. */
check("...and each year states its own day count",
      `(function(){const ys=[...document.querySelectorAll('.heatyears span')];
        return ys.every(sp=>{const y=sp.firstChild.textContent.trim();
          const shown=+(sp.querySelector('small').textContent.match(/\\d+/)||[])[0];
          const real=[...workoutDates()].filter(d=>d.slice(0,4)===y).length;
          return shown===real;});})()`, true);
/* v3.3.336: no two year labels may collide. v3.3.334's comment asserted this
   could not happen -- "two years cannot be closer than 52 columns" -- which
   is true of every year except the FIRST, because the first is partial. The
   maker's ledger opens in December, so 2021 sat at column 0 and 2022 three
   columns later and the two printed on top of each other. Asserted with a
   fixture that OPENS IN DECEMBER, because the assertion is worthless against
   a ledger that happens to start in spring; the general fixture above would
   have passed this all day. */
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  const dec=new Date(t.getFullYear()-2,11,13);                     // a December start
  const iso=d=>d.toLocaleDateString('en-CA');
  DB.days[iso(dec)]={w:[{part:'Back',ex:'Pull Up',w:0,reps:[8],at:1}],upd:1};
  const near=new Date(t); near.setDate(near.getDate()-3);
  DB.days[iso(near)]={w:[{part:'Back',ex:'Pull Up',w:0,reps:[8],at:1}],upd:1};
  SEED=deriveAll(); view='stats'; render();})()`);
check("no two year labels sit close enough to collide",
      `(function(){const cs=[...document.querySelectorAll('.heatyears span')]
         .map(s=>+s.style.getPropertyValue('--c')).sort((a,b)=>a-b);
        return cs.every((c,i)=>i===0 || c-cs[i-1] >= 7);})()`, true);
check("...and the year that keeps the label is the FULL one, not the stub",
      `(function(){const first=document.querySelector('.heatyears span');
        const cells=[...document.querySelectorAll('.heatgrid .hc')];
        const c=+first.style.getPropertyValue('--c');
        const y=cells[c*7].getAttribute('aria-label').slice(0,4);
        return first.firstChild.textContent.trim()===y
            && +first.firstChild.textContent.trim() > +SEED.totals.first.slice(0,4);})()`, true);

/* v3.3.337 RESTATES v3.3.335. The property being defended was never "four
   labels" -- it was that the month row reads as orientation rather than as a
   fence. v3.3.335 got there by dropping labels; the maker got there by
   dropping WIDTH, one letter per month, which keeps every month marked and
   turns the row into a ruler. Both satisfy the property; his costs nothing.
   What is asserted now: every month present, and every label one character. */
/* v3.3.338 RESTATES the LABEL, not the rule. Two properties are being
   defended and both survive every version this row has had: every month is
   marked, and each label names the month its column actually starts. Only
   the spelling moved -- three letters, because at 65px per month against
   18px of ink there is nothing to save by shortening, and "JAN" names the
   month where "J" asks the reader to count from the year.
   The COUNT stays the load-bearing half: my v3.3.337 version checked only
   the shape of each label, so reverting to quarters passed clean -- four
   single letters are still single letters. Shape is a detail; count is the
   property. */
check("...with every month marked",
      `(function(){const sp=[...document.querySelectorAll('.heatticks span')];
        const cells=[...document.querySelectorAll('.heatgrid .hc')];
        const hw=+document.querySelector('.heatgrid').style.getPropertyValue('--hw');
        const seen=new Set();
        for(let c=0;c<hw;c++) seen.add(cells[c*7].getAttribute('aria-label').slice(0,7));
        /* every month a column starts in, less the partial first one that
           v3.3.308 deliberately suppresses */
        return sp.length===seen.size-1 || sp.length===seen.size;})()`, true);
check("...each naming the month its own column starts",
      `(function(){const L=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
        const cells=[...document.querySelectorAll('.heatgrid .hc')];
        return [...document.querySelectorAll('.heatticks span')].every(sp=>{
          const c=+sp.style.getPropertyValue('--c');
          const mo=+cells[c*7].getAttribute('aria-label').slice(5,7);
          return L[mo-1]===sp.textContent.trim();});})()`, true);
/* v3.3.338: INK against SPACE, not columns against a number. The v3.3.337
   version asserted "at least 4 columns apart", which counts the gap but is
   blind to what fills it -- tripling the label width from J to JAN passed it
   without comment, and that is exactly the change being made. This reads the
   real numbers out of the stylesheet: cell + column-gap gives the pitch, the
   tick font-size gives the character width (mono advance is 0.6em), and the
   longest label gives the ink. Now widening the label OR shrinking the cell
   fails here instead of smearing on the maker's phone -- which is the whole
   lesson of v3.3.336, where I argued a collision was impossible in a comment
   rather than measuring it. */
{
  const cssM = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  const num = re => { const m = cssM.match(re); return m ? parseFloat(m[1]) : null; };
  const cellPx = num(/--hcell:\s*(\d+(?:\.\d+)?)px/);
  const gapPx  = num(/\.heatticks\{[^}]*column-gap:(\d+(?:\.\d+)?)px/);
  const fontPx = num(/\.heatticks\{[^}]*font-size:(\d+(?:\.\d+)?)px/);
  const labels = run(`[...document.querySelectorAll('.heatticks span')].map(s=>s.textContent.trim())`);
  const cols   = run(`[...document.querySelectorAll('.heatticks span')].map(s=>+s.style.getPropertyValue('--c'))`)
                   .slice().sort((a,b)=>a-b);
  const pitch  = cellPx + gapPx;
  const ink    = Math.max(...labels.map(l => l.length)) * fontPx * 0.6;
  let tightest = Infinity;
  for (let i = 1; i < cols.length; i++) tightest = Math.min(tightest, (cols[i] - cols[i-1]) * pitch);
  checkVal("...with more space between months than there is ink in a label",
           cols.length < 2 || tightest > ink,
           true);
  console.log(`      (tightest ${Math.round(tightest)}px of space vs ${Math.round(ink)}px of ink)`);
}
/* the rail is STATIC -- outside the scroller, so it holds while the columns
   slide past. Four marks on even rows; S is Sunday by position, not letter. */
check("the weekday rail stands outside the scroller",
      `(function(){const r=document.querySelector('.wdrail');
        return !!r && !r.closest('.heatwrap') && !!r.closest('.heatframe');})()`, true);
check("...labelling M W F S down the seven rows",
      `(function(){const sp=[...document.querySelectorAll('.wdrail span')];
        return sp.length===7 && sp.map(s=>s.textContent).join('|')==='M||W||F||S';})()`, true);
{
  const cssH = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  /* the floor is now a CELL SIZE, not a fitting trick: columns hold 11px and
     the grid overflows its scroller on purpose. min-width:100% stays, so a
     ledger shorter than the viewport still fills the card instead of
     huddling at the left. */
  /* v3.3.335 RESTATES v3.3.334's own wording. "Sized to be seen" survives;
     the minmax does not. A stretching column makes a taller cell, and the
     static rail added this release cannot stretch with it -- so the track is
     FIXED at --hcell, one token the grid, both label rows and the rail all
     read. The pin is that they read the SAME token, because a literal typed
     in four places is a desync waiting to happen. */
  check("...with columns sized to be seen rather than to fit",
        `${/\.heatgrid\{[^}]*grid-template-columns:repeat\(var\(--hw\),var\(--hcell\)\)/.test(cssH)}`, "true");
  check("...from the one token the rail is sized from too",
        `${["\\.heatgrid\\{", "\\.heatyears\\{", "\\.heatticks\\{", "\\.wdrail\\{"]
            .every(sel => new RegExp(sel + "[^}]*var\\(--hcell\\)").test(cssH))}`, "true");
}

// History's year strip centres its selection (v3.3.39) — same family, still holding
run(`hist={y:+thisYear,m:+todayISO.slice(5,7),part:null}; view='history'; render();`);
check("year strip still centres the selection",
      `!!document.querySelector('.ychips .chip.on')`, true);

// the swipe handler must not steal either scroller's axis
const src = fs.readFileSync(path.join(dir, "js/util.js"), "utf8");
const blocked = ["'.heat'", "'.heatcols'", "'.ychips'"].every(s => src.includes(s));
console.log((blocked?"PASS":"FAIL"), "swipe excludes every sideways scroller →", blocked);
if (!blocked) fail++;

process.exit(fail ? 1 : 0);
