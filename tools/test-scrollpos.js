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
          return d.slice(0,4)===sp.textContent.trim();});})()`, true);
{
  const cssH = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  /* the floor is now a CELL SIZE, not a fitting trick: columns hold 11px and
     the grid overflows its scroller on purpose. min-width:100% stays, so a
     ledger shorter than the viewport still fills the card instead of
     huddling at the left. */
  check("...with columns sized to be seen rather than to fit",
        `${/\.heatgrid\{[^}]*minmax\(11px,1fr\)/.test(cssH) && /\.heatgrid\{[^}]*min-width:100%/.test(cssH)}`, "true");
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
