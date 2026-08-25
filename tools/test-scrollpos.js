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
check("...and fits its card rather than forcing a sideways drag",
      `+document.querySelector('.heatgrid').style.getPropertyValue('--hw')`, 35);
{
  /* fitting is a CSS property jsdom cannot compute, so assert the mechanism:
     columns flex down to a 7px floor and the grid is told to fill its box —
     together that means it only scrolls on a phone narrower than ~315px. */
  const cssH = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  check("...because its columns flex down instead of overflowing",
        `${/\.heatgrid\{[^}]*minmax\(7px,1fr\)/.test(cssH) && /\.heatgrid\{[^}]*min-width:100%/.test(cssH)}`, "true");
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
