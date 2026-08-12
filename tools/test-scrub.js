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
/* v3.3.217: the percentage consistency chart was retired in v3.3.213 and the
   year-over-year RACE chart took its place as the scrub surface (v3.3.214).
   This suite kept asserting the retired chart's geometry and legend, so it
   went red the moment the replacement shipped. Re-pointed at the live chart;
   the behaviours under test are unchanged — reveal, track, restore, and
   coexist with pinch. */
ok("the race chart opts in with its geometry",
   run(`${SVG}.getAttribute('data-scrub')`) === "race" &&
   run(`+${SVG}.getAttribute('data-sx0')`) > 0 &&
   run(`+${SVG}.getAttribute('data-sxw')`) > 0);

// ---- hidden until touched ---------------------------------------------------
ok("no guide before you touch the chart",
   run(`(function(){const g=${SVG}.querySelector('.scrubg'); return !g || g.style.display==='none';})()`));

// capture the legend's REAL values before anything is scrubbed \u2014 these are
// the year-end totals the release must restore. (First draft captured this
// after the first press, so "restored" was compared against an already
// scrubbed value and proved nothing.)
const legendAt = () => run(`[...document.querySelectorAll('.conrace [data-con-count]')].map(b=>b.textContent).join('|')`);
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
ok("pressing already changes the counts away from their same-date totals",
   early !== ORIGINAL, `${ORIGINAL} \u2192 ${early}`);
pm(60);
const mid = legendAt();
pm(290);
const late = legendAt();
ok("both years' counts track the scrubbed day (they differ across the chart)",
   !(early === mid && mid === late), `${early} \u2192 ${mid} \u2192 ${late}`);
ok("...and read as whole workout days, never a fraction or a percent",
   /^\d+(\|\d+)*$/.test(mid), mid);
// the scrubbed date leads the card, and the gap is recomputed from the two counts
ok("the kicker becomes the date under your finger",
   /YOU VS YOU · [A-Z]{3} \d{1,2}/.test(run(`document.querySelector('[data-con-date]').textContent`)),
   run(`document.querySelector('[data-con-date]').textContent`));
ok("...and the gap agrees with the two counts it sits between",
   run(`(function(){const c=document.querySelector('.conrace');
     const cur=+c.querySelector('[data-con-count="'+c.getAttribute('data-current-year')+'"]').textContent;
     const prev=+c.querySelector('[data-con-count="'+c.getAttribute('data-previous-year')+'"]').textContent;
     const t=c.querySelector('[data-con-gap]').textContent, d=cur-prev;
     return d>0 ? t.indexOf('+'+d)===0 : d<0 ? t.indexOf(String(Math.abs(d)))===0 : /Even/.test(t);})()`));

// ---- the hint slot becomes the date ----------------------------------------


// ---- release restores everything -------------------------------------------
pu();
ok("releasing hides the guide", run(`${SVG}.querySelector('.scrubg').style.display`) === "none");
ok("...restores both same-date totals exactly",
   legendAt() === ORIGINAL, `${legendAt()} vs original ${ORIGINAL}`);
ok("...and drops the scrubbing state",
   run(`!document.querySelector('.conrace').classList.contains('scrubbing')`));

// ---- GESTURE COEXISTENCE: the actual risk ----------------------------------
// a second finger means zoom, so the guide must get out of the way
pd(120, 1); pd(220, 2);
ok("a second finger dismisses the guide (pinch wins)",
   run(`${SVG}.querySelector('.scrubg').style.display`) === "none");
pu(1); pu(2);

// double-tap still resets the viewBox
// v3.3.129: the expected value is READ from the chart before we disturb it.
// It used to be the literal "0 0 340 170", so making the plot taller failed
// a test of the reset gesture, which had not changed at all.
const VB0 = run(`${SVG}.getAttribute('viewBox')`);
run(`${BOX}.querySelector('svg').setAttribute('viewBox','60 20 100 50');`);
pd(150); pu(); pd(150); pu();
ok("double-tap still resets the zoom",
   run(`${SVG}.getAttribute('viewBox')`) === VB0,
   run(`${SVG}.getAttribute('viewBox')`) + " vs " + VB0);

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

// ---- v3.3.109, re-pointed v3.3.217: the readout sits above the chart -----
// Both original problems still matter: the readout must not sit under the
// scrubbing hand, and every plotted year must be visible. The retired pct
// chart expressed this as .legend1; the race card expresses it as .conscore.
// (.legend1 now exists only inside the unassembled cut('cons') builder, so
// asserting on it tested code no one can see.)
ok("the readout precedes the chart in the DOM",
   run(`(function(){
     const card=document.querySelector('.conrace'); if(!card) return false;
     const kids=[...card.children];
     return kids.indexOf(card.querySelector('.conscore')) < kids.indexOf(card.querySelector('[data-zoom]'));})()`),
   "readout before chart");

ok("every plotted year has a readout entry",
   run(`(function(){
     const plotted=[...document.querySelectorAll('[data-scrub="race"] polyline[data-yr]')]
       .map(p=>p.getAttribute('data-yr')).sort().join(',');
     const listed=[...document.querySelectorAll('.conrace [data-con-count]')]
       .map(s=>s.getAttribute('data-con-count')).sort().join(',');
     return plotted===listed && plotted.length>0;})()`),
   run(`[...document.querySelectorAll('.conrace [data-con-count]')].map(s=>s.getAttribute('data-con-count')).join(',')`));

ok("...including the CURRENT year, which the old legend scrolled off",
   run(`!!document.querySelector('.conrace [data-con-count="'+thisYear+'"]')`));

// the readout is a fixed three-column grid, so a live scrub cannot reflow it
const cssSrc109 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\n/g, "");
const score = (cssSrc109.match(/\.conscore\{[^}]*\}/) || [""])[0];
ok("the readout holds its columns (no jitter while scrubbing)",
   /grid-template-columns/.test(score) && !/overflow-x/.test(score), score);

// ---- v3.3.110: selection is off by default, restored deliberately --------
// The scrubber's own failure mode: iOS pops Copy/Look Up/Translate over the
// chart mid-drag, because a long press is BOTH "scrub" and "select text"
// and iOS picks selection.
const css110 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\n/g, "");
const appRule = (css110.match(/#app\{[^}]*user-select[^}]*\}/) || [""])[0];
ok("the app shell disables text selection by default",
   /user-select:none/.test(appRule) && /-webkit-user-select:none/.test(appRule), appRule);
ok("...and suppresses the long-press callout that blocks the gesture",
   /-webkit-touch-callout:none/.test(appRule));

// the exceptions must exist, or typing and the clipboard fallback break
const okRule = (css110.match(/input,textarea,select,\.selectable\{[^}]*\}/) || [""])[0];
ok("inputs, textareas and .selectable keep selection",
   /user-select:text/.test(okRule), okRule);
ok("...which matters because code calls .select() programmatically",
   /\.select\(\)/.test(fs.readFileSync(path.join(dir, "js/app.js"), "utf8")) ||
   /\.select\(\)/.test(fs.readFileSync(path.join(dir, "js/settings.js"), "utf8")));

// the account email is a real identifier \u2014 it stays copyable
run(`session={user:{email:'t@example.com'}}; view='sync'; renderSync();`);
ok("the account email is still selectable",
   run(`!!document.querySelector('.selectable')`) &&
   /t@example\.com/.test(run(`document.querySelector('.selectable').textContent`)));
run(`session=null;`);

// the reactive spot-fixes are gone, subsumed by the base rule
ok("the per-element spot-fixes are gone (no whack-a-mole left behind)",
   !/\.settile\{-webkit-user-select:none/.test(css110) && !/\.readyhead\{/.test(css110));

// ---- v3.3.128: the consistency plot is wider -----------------------------
// re-render: earlier blocks leave the view on other fixtures
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  for(let i=1;i<=400;i+=2){const d=new Date(t); d.setDate(d.getDate()-i);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Press',w:40,reps:[10],at:1}],upd:1};}
  SEED=deriveAll(); view='stats'; render();})()`);
/* v3.3.217: was '[data-scrub="pct"]'. Same geometry contract, live chart. */
const svgEl = `document.querySelector('[data-scrub="race"]')`;
ok("the plot spans most of its viewBox",
   run(`(function(){const s=${svgEl};
     const vb=(s.getAttribute('viewBox')||'').split(/\\s+/).map(Number);
     const x0=+s.getAttribute('data-sx0'), xw=+s.getAttribute('data-sxw');
     return x0>0 && xw>0 && (x0+xw)<=vb[2] && xw/vb[2]>0.8;})()`),
   run(`${svgEl}.getAttribute('data-sx0')`) + ".." +
   (run(`+${svgEl}.getAttribute('data-sx0')`) + run(`+${svgEl}.getAttribute('data-sxw')`)));
// widening must not push anything past the right edge, nor clip the y labels
const bounds = JSON.parse(run(`JSON.stringify((function(){
  const s=${svgEl}, vb=(s.getAttribute('viewBox')||'').split(/\\s+/).map(Number);
  let minX=1e9, maxX=-1e9;
  s.querySelectorAll('text,line,circle,polyline').forEach(e=>{
    ['x','x1','x2','cx'].forEach(a=>{const v=parseFloat(e.getAttribute(a));
      if(!isNaN(v)){ minX=Math.min(minX,v); maxX=Math.max(maxX,v); }});
    const pts=e.getAttribute('points');
    if(pts) pts.trim().split(/\\s+/).forEach(pt=>{const x=parseFloat(pt.split(',')[0]);
      if(!isNaN(x)){ minX=Math.min(minX,x); maxX=Math.max(maxX,x); }});
  });
  return {w:vb[2], minX:+minX.toFixed(1), maxX:+maxX.toFixed(1)};})())`));
ok("nothing is drawn past the right edge", bounds.maxX <= bounds.w,
   `max x ${bounds.maxX} of ${bounds.w}`);
ok("...and the y-axis labels still have room on the left", bounds.minX >= 0,
   `min x ${bounds.minX}`);
// the end labels sit right of the plot, inside the box
ok("the year end-labels fit between the plot edge and the box edge",
   bounds.maxX <= bounds.w && bounds.maxX > bounds.w*0.8, "rightmost " + bounds.maxX + " of " + bounds.w);

// ---- v3.3.128: selection is off on the share overlay too ----------------
const css128 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\n/g, "");
/* match against the SELECTOR LIST of every no-select rule, since these are
   grouped (`#repOv,.calreturn{...}`) and a per-selector regex misses them. */
// strip comments first, or their text lands in the "selector list"
const cssNoCmt = css128.replace(/\/\*[\s\S]*?\*\//g, "");
const noSelectSelectors = (cssNoCmt.match(/[^{}]+\{[^}]*user-select:none[^}]*\}/g) || [])
  .map(r => r.split("{")[0]).join(",");
ok("the share overlay disables selection", /#repOv/.test(noSelectSelectors),
   noSelectSelectors.slice(0, 80));
ok("...but the card image keeps its long-press to save",
   /#repOv img\{[^}]*-webkit-touch-callout:default/.test(css128));
/* Everything mounted outside #app needs covering, not just the overlay.
   This audit found the floating "top" button too \u2014 real visible text, same
   gap. The assertion checks coverage rather than counting known elements,
   so the next thing mounted on <body> fails until it is handled. */
/* collect BOTH id and class for each element. The top button is id
   "calReturn" but class ".calreturn" \u2014 comparing only the id against a
   class selector said uncovered when it is covered, differing by case. */
const outside = JSON.parse(run(`JSON.stringify(
  [...document.body.children]
    .filter(el=>el.id!=='app'&&el.tagName!=='SCRIPT'&&el.tagName!=='STYLE')
    .map(el=>({id:el.id||'', cls:(el.className||'').toString()})))`));
const covered = outside.filter(el =>
  [el.id, ...el.cls.split(/\s+/)].filter(Boolean)
    .some(k => new RegExp(`[#.]${k}\\b`).test(noSelectSelectors)));
ok("every element mounted outside #app has selection disabled",
   covered.length === outside.length,
   outside.length
     ? `${covered.length}/${outside.length}: ${outside.map(e=>e.id||e.cls).join(",")}`
     : "none mounted");

process.exit(fail ? 1 : 0);
