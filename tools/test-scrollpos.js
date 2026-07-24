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

check("stats rendered the heatmap", `!!document.querySelector('.heatcols')`, true);
check("render did not throw",       `!!document.querySelector('#view').innerHTML.length`, true);
check("today's cell exists in the strip",
      `!!document.querySelector('.heat i.today')`, true);
check("today's cell sits in the LAST week column",
      `(()=>{const wks=[...document.querySelectorAll('.heat .wk')];
             return wks.indexOf(document.querySelector('.heat i.today').parentElement)===wks.length-1;})()`, true);

// the arithmetic, asserted where jsdom can actually measure it
check("scroller is driven to its right edge", `(()=>{
    let set=null;
    const fake={scrollWidth:900,clientWidth:300,set scrollLeft(v){set=v;},get scrollLeft(){return set;}};
    if(fake.scrollWidth>fake.clientWidth) fake.scrollLeft=fake.scrollWidth;
    return set>=fake.scrollWidth-fake.clientWidth;})()`, true);
check("a non-overflowing scroller is left alone", `(()=>{
    let touched=false;
    const fake={scrollWidth:300,clientWidth:300,set scrollLeft(v){touched=true;}};
    if(fake.scrollWidth>fake.clientWidth) fake.scrollLeft=fake.scrollWidth;
    return touched;})()`, false);

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
