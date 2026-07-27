// test-scrub.js DIR — v3.3.108: the chart scrubber.
// Drives REAL pointer events through bindZoom's handlers. The risk in this
// feature is not the arithmetic, it's the gesture interaction: scrubbing
// must not eat panning, pinching, or the double-tap reset.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage108";

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
// jsdom has no pointer capture and no layout; supply both minimally
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

/* A DELIBERATELY uneven year. The first draft trained every 2 days flat,
   which makes the cumulative consistency curve ~50% at every point of the
   year \u2014 so scrubbing anywhere returned the endpoint value and the test
   could not tell a working scrubber from a broken one. Here each year runs
   hot for its first 100 days and cools off after, so the curve genuinely
   falls across the x-axis and a scrubbed value must differ from the total. */
run(`(function(){DB.days={}; const y=+todayISO.slice(0,4);
  for(const yr of [y-2,y-1,y]){
    const last = yr===y ? doy(todayISO)-1 : 365;
    for(let d=1; d<=last; d++){
      const hot = d<=100;                       // near-daily early, sparse later
      if(!(hot || d%4===0)) continue;
      const dt=new Date(yr,0,d);
      DB.days[dt.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};
    }
  }
  SEED=deriveAll(); view='stats'; render();})()`);

// the zoom box needs a non-zero rect; jsdom gives zeros
run(`(function(){
  const box=document.querySelector('[data-zoom]');
  box.getBoundingClientRect=()=>({left:0,top:0,width:340,height:170,right:340,bottom:170});
})()`);

const BOX = `document.querySelector('[data-zoom]')`;
const SVG = `${BOX}.querySelector('svg')`;
const pd = (x, id=1) => run(`(function(){const b=${BOX};
  const e=new PointerEvent('pointerdown',{pointerId:${id},clientX:${x},clientY:80,bubbles:true});
  b.dispatchEvent(e);})()`);
const pm = (x, id=1) => run(`(function(){const b=${BOX};
  const e=new PointerEvent('pointermove',{pointerId:${id},clientX:${x},clientY:80,bubbles:true});
  b.dispatchEvent(e);})()`);
const pu = (id=1) => run(`(function(){const b=${BOX};
  const e=new PointerEvent('pointerup',{pointerId:${id},clientX:0,clientY:0,bubbles:true});
  b.dispatchEvent(e);})()`);

// ---- the chart declares its geometry --------------------------------------
ok("the consistency chart opts in with its geometry",
   run(`${SVG}.getAttribute('data-scrub')`) === "pct" &&
   run(`+${SVG}.getAttribute('data-sx0')`) === 26 &&
   run(`+${SVG}.getAttribute('data-sxw')`) === 274);

// ---- hidden until touched ---------------------------------------------------
ok("no guide before you touch the chart",
   run(`(function(){const g=${SVG}.querySelector('.scrubg'); return !g || g.style.display==='none';})()`));

// capture the legend's REAL values before anything is scrubbed \u2014 these are
// the year-end totals the release must restore. (First draft captured this
// after the first press, so "restored" was compared against an already
// scrubbed value and proved nothing.)
const legendAt = () => run(`[...document.querySelectorAll('.legend1 [data-yr] b')].map(b=>b.textContent).join('|')`);
const ORIGINAL = legendAt();

// ---- press reveals it -------------------------------------------------------
pd(170);
ok("pressing the chart shows the guide",
   run(`${SVG}.querySelector('.scrubg').style.display`) !== "none");
ok("...with a vertical line placed at the press",
   run(`(function(){const l=${SVG}.querySelector('.scrubg line'); return !!l.getAttribute('x1');})()`));
ok("...and a dot per year curve",
   run(`${SVG}.querySelectorAll('.scrubg circle').length`) === run(`${SVG}.querySelectorAll('polyline[data-yr]').length`),
   run(`${SVG}.querySelectorAll('.scrubg circle').length`) + " dots");

// ---- the readout reuses the legend, and it CHANGES -------------------------
const early = legendAt();
ok("pressing already changes the legend away from its year-end totals",
   early !== ORIGINAL, `${ORIGINAL} \u2192 ${early}`);
pm(60);
const mid = legendAt();
pm(290);
const late = legendAt();
ok("legend values track the scrubbed day (they differ across the chart)",
   !(early === mid && mid === late), `${early} \u2192 ${mid} \u2192 ${late}`);
ok("...and read as percentages on the consistency chart", /%/.test(mid), mid);

// ---- the hint slot becomes the date ----------------------------------------
ok("the zoom hint becomes the date under your finger",
   /^[A-Z][a-z]{2} \d{1,2}$/.test(run(`document.querySelector('.zoomhint').textContent`)),
   run(`document.querySelector('.zoomhint').textContent`));

// ---- release restores everything -------------------------------------------
pu();
ok("releasing hides the guide", run(`${SVG}.querySelector('.scrubg').style.display`) === "none");
ok("...restores the legend's own year-end totals exactly",
   legendAt() === ORIGINAL, `${legendAt()} vs original ${ORIGINAL}`);
ok("...and restores the hint",
   /pinch/.test(run(`document.querySelector('.zoomhint').textContent`)),
   run(`document.querySelector('.zoomhint').textContent`));

// ---- GESTURE COEXISTENCE: the actual risk ----------------------------------
// a second finger means zoom, so the guide must get out of the way
pd(120, 1); pd(220, 2);
ok("a second finger dismisses the guide (pinch wins)",
   run(`${SVG}.querySelector('.scrubg').style.display`) === "none");
pu(1); pu(2);

// double-tap still resets the viewBox
run(`${BOX}.querySelector('svg').setAttribute('viewBox','60 20 100 50');`);
pd(150); pu(); pd(150); pu();
ok("double-tap still resets the zoom",
   run(`${SVG}.getAttribute('viewBox')`) === "0 0 340 170",
   run(`${SVG}.getAttribute('viewBox')`));

// when zoomed IN, one finger must still PAN, not scrub
run(`(function(){const b=${BOX}; const s=b.querySelector('svg');
  s.setAttribute('viewBox','60 20 100 50');})()`);
// re-bind is not possible (dataset.bound), so drive the live closure: the
// pan branch is gated on vb, which lives in the closure and is only changed
// via its own handlers. Assert the SOURCE ordering instead, which is what
// guarantees the branch order.
const appSrc = fs.readFileSync(path.join(dir, "js/app.js"), "utf8");
const panAt = appSrc.indexOf("vb[2]<vb0[2]-0.5 && last");
const scrubAt = appSrc.indexOf("scrub.show(e.clientX); e.preventDefault()");
ok("panning is checked BEFORE scrubbing, so zoomed-in drags still pan",
   panAt > -1 && scrubAt > -1 && panAt < scrubAt, `pan@${panAt} scrub@${scrubAt}`);
ok("...and scrubbing only runs on a single pointer",
   /pts\.size===1 && scrub/.test(appSrc));

// ---- the distance chart gets it for free -----------------------------------
const liftSrc = fs.readFileSync(path.join(dir, "js/lift.js"), "utf8");
ok("the distance chart opts in too", /data-scrub=\\?"dist\\?"/.test(liftSrc));
ok("...and its legend exposes <b> so the scrubber can swap it",
   /data-yr="\$\{y\}"[^`]*<b>\$\{Math\.round\(yTot\[y\]\)\}<\/b>/.test(liftSrc));
// one implementation, not two
ok("there is exactly one bindScrub", (appSrc.match(/function bindScrub/g) || []).length === 1);

// ---- charts that don't opt in are untouched --------------------------------
// Stats has other [data-zoom] charts (the heatmap) with no data-scrub; none
// of them may grow a scrub layer.
ok("charts without data-scrub get no scrub layer",
   run(`[...document.querySelectorAll('[data-zoom] svg')]
        .filter(s=>!s.hasAttribute('data-scrub'))
        .every(s=>!s.querySelector('.scrubg'))`),
   run(`[...document.querySelectorAll('[data-zoom] svg')].filter(s=>!s.hasAttribute('data-scrub')).length`) + " opted out");

process.exit(fail ? 1 : 0);
