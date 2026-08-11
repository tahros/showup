// test-cardframe.js DIR — v3.3.133: the share cards, reworked.
//
// Canvas draws leave no DOM to inspect, so this records every ctx call and
// reasons about the geometry from the call log. The failures worth catching
// are silent ones: a plot that centres by accident on one card and not
// another, a caret drawn on top of its own percentage, a URL stamp creeping
// back in. Positions are checked as RELATIONSHIPS (is the gap above roughly
// the gap below) rather than as magic numbers, so the test survives a
// re-tune of the frame without lying about what it covers.
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

// record every canvas call, with enough state to know what was being drawn
let calls = [];
w.HTMLCanvasElement.prototype.getContext = function(){
  const state = { fillStyle:"#000", font:"", textAlign:"left", textBaseline:"alphabetic" };
  return new Proxy({ measureText: t => ({ width: String(t).length * 14 }) }, {
    get(o, k){
      if (k in o) return o[k];
      if (k in state) return state[k];
      return (...a) => { calls.push([k, ...a]); return {}; };
    },
    set(o, k, v){ state[k] = v; calls.push(["SET:" + k, v]); return true; }
  });
};
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

// a year of lifting and running, with today forced to be the strongest
// weekday — the today-AND-best case that collided on the card
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  const todayDow=t.getDay();
  for(let i=0;i<400;i++){
    const d=new Date(t); d.setDate(d.getDate()-i);
    const iso=d.toLocaleDateString('en-CA');
    const train = d.getDay()===todayDow ? true : (i%3!==0);
    if(!train) continue;
    DB.days[iso]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:1}],upd:1};
    if(i%2===0) DB.days[iso].w.push({part:'Run',ex:'Run',w:4+(i%5),reps:[],mins:26,secs:0,at:1});
  }
  SEED=deriveAll(); view='stats'; render();})()`);

const S = 1080;
const drawCard = id => { calls = []; run(`shareCards().find(c=>c.id===${JSON.stringify(id)}).draw();`); return calls; };
const textsOf = c => c.filter(r => r[0] === "fillText").map(r => String(r[1]));
// fillText rows are [op, text, x, y]
const textAt = c => c.filter(r => r[0] === "fillText").map(r => ({ t: String(r[1]), x: +r[2], y: +r[3] }));

const IDS = ["grid", "yoy", "dbm", "week", "dist", "pace"];

// ---- 1. no card carries the URL any more -----------------------------------
for (const id of IDS) {
  const t = textsOf(drawCard(id));
  if (!t.length) { ok(`${id} draws text`, false, "no fillText"); continue; }
  ok(`${id}: no URL stamp`, !t.some(s => /tahros\.github\.io/.test(s)),
     t.filter(s => /tahros/.test(s)).join(",") || "none");
}
ok("the URL string is gone from the source entirely",
   !/tahros\.github\.io\/showup/.test(fs.readFileSync(path.join(dir, "js/report.js"), "utf8")));

// ---- 2. the consistency card stamps today's date bottom-right --------------
const yoy = textAt(drawCard("yoy"));
ok("consistency stamps today's date", yoy.some(r => r.t === run(`todayISO`)), run(`todayISO`));
const stamp = yoy.find(r => r.t === run(`todayISO`));
ok("...on the bottom edge", stamp && stamp.y > S * 0.9, stamp && Math.round(stamp.y));
ok("...at the right", stamp && stamp.x > S * 0.7, stamp && Math.round(stamp.x));

// ---- 3. retired cards stay retired ----------------------------------------
ok("Weekdays and Last 6 months are absent from the registry",
   run(`!shareCards().some(c=>c.id==='wd'||c.id==='heat')`));

// ---- 4. plots are vertically centred in their band ------------------------
/* Measure the drawn art's extent and compare the space above it to the space
   below. "Centred" here means those two are within a reasonable tolerance of
   each other — which is the property the eye actually checks. */
const bandOf = c => {
  const ys = [];
  for (const r of c) {
    if (r[0] === "fillText") ys.push(+r[3]);
    else if (r[0] === "strokeRect" || r[0] === "fillRect") { ys.push(+r[2]); ys.push(+r[2] + (+r[4] || 0)); }
    else if (r[0] === "moveTo" || r[0] === "lineTo" || r[0] === "arcTo") ys.push(+r[2]);
    else if (r[0] === "arc") ys.push(+r[2]);
  }
  return ys.filter(v => isFinite(v));
};
for (const id of ["dbm", "pace"]) {
  const c = drawCard(id);
  // art = everything between the kicker (~216) and the caption (~990)
  const ys = bandOf(c).filter(v => v > 240 && v < 940);
  if (!ys.length) { ok(`${id}: art found for centring check`, false); continue; }
  const top = Math.min(...ys), bot = Math.max(...ys);
  const above = top - 256, below = 940 - bot;
  ok(`${id}: plot is vertically centred`, Math.abs(above - below) < 130,
     `above ${Math.round(above)} / below ${Math.round(below)}`);
}

// ---- 5. Every week: shorter, two x-labels, a value, and a y-axis ----------
const week = drawCard("week");
const wt = textAt(week);
const wkLabels = wt.filter(r => /^\d{2}\/\d{2}$/.test(r.t));
ok("Every week keeps only the oldest and newest week labels", wkLabels.length === 2,
   wkLabels.map(r => r.t).join(" \u2026 ") || "none");
if (wkLabels.length === 2)
  ok("...one at each end", wkLabels[0].x < S / 2 && wkLabels[1].x > S / 2,
     Math.round(wkLabels[0].x) + " / " + Math.round(wkLabels[1].x));
const dashed = week.filter(r => r[0] === "setLineDash" && Array.isArray(r[1]) && r[1].length);
ok("...and draws dotted horizontal rules", dashed.length >= 2, dashed.length + " dash runs");
/* v3.3.134: this used to assert "bars are shorter than the full-height line".
   That encoded a design that is now gone — the line block is 55% and centres
   with its labels, so bars are the taller of the two. Comparing them said
   nothing anyone cares about. What matters is that BOTH stay inside the
   band the frame gave them, and that the bars kept their 25% cut. */
const barYs = bandOf(week).filter(v => v > 240 && v < 940);
const paceYs = bandOf(drawCard("pace")).filter(v => v > 240 && v < 940);
const inBand = ys => ys.length && Math.min(...ys) > 250 && Math.max(...ys) < 950;
ok("the bars plot stays inside its band", inBand(barYs),
   Math.round(Math.min(...barYs)) + ".." + Math.round(Math.max(...barYs)));
ok("the line plot stays inside its band", inBand(paceYs),
   Math.round(Math.min(...paceYs)) + ".." + Math.round(Math.max(...paceYs)));
ok("bars keep their 25% cut and the line takes 55% of the band",
   /\(bars\?0\.75:0\.55\)/.test(fs.readFileSync(path.join(dir, "js/report.js"), "utf8")));

// ---- 6. Pace: every point labelled, latest bigger and still accent --------
const pace = drawCard("pace");
// the headline (o.big) is also a pace string — count only labels inside the plot
const paceLabels = textAt(pace).filter(r => /^\d+'\d{2}"$/.test(r.t) && r.y > 200);   // headline sits at y=160; every plot label is below 200
const nPts = run(`paceSeries().length`);
ok("every pace point carries a label", paceLabels.length === nPts,
   paceLabels.length + "/" + nPts);
const arcs = pace.filter(r => r[0] === "arc").map(r => +r[3]);   // [op,cx,cy,r,...]
ok("the latest pace point is the largest", arcs.length > 1 && arcs[arcs.length - 1] > Math.max(...arcs.slice(0, -1)),
   "radii " + arcs.join(","));
/* ---- 6a. the pace line USES its plot, it does not hug the top ------------
   The v3.3.133 centring assertion passed on a visibly broken card: the line
   sat in the top sliver, the x-labels sat at the foot of an empty box, and
   the bounding box of "art at top + labels at bottom" is perfectly centred.
   Measuring the frame was not enough. These two measure the DENSITY. */
const paceArcs = pace.filter(r => r[0] === "arc").map(r => ({ y: +r[2], r: +r[3] }));
ok("the pace card plots its points", paceArcs.length >= 3, paceArcs.length + " points");
const pTop = Math.min(...paceArcs.map(a => a.y)), pBot = Math.max(...paceArcs.map(a => a.y));
const paceSpread = pBot - pTop;
ok("the points spread across the plot, not pinned to the top",
   paceSpread > 90, "spread " + Math.round(paceSpread) + "px");
/* and the x-labels must follow the art rather than stranding at the foot of
   an empty box */
const paceXLabels = textAt(pace).filter(r => /^\d{2}$/.test(r.t));
ok("the pace card labels its months", paceXLabels.length >= 3, paceXLabels.length + " labels");
if (paceXLabels.length) {
  const lblY = Math.max(...paceXLabels.map(r => r.y));
  ok("...directly beneath the line, not stranded below empty space",
     lblY - pBot < 260, "gap " + Math.round(lblY - pBot) + "px below lowest point");
}
/* the scale rule itself: a near-flat series must not be flattened further,
   and bars must never adopt a non-zero baseline */
const rsrc = fs.readFileSync(path.join(dir, "js/report.js"), "utf8");
ok("the pace card pads its range like the live chart does",
   /Math\.max\(hi-lo,30\)/.test(rsrc), "30s span floor present");
ok("...and only LINES may declare a range — bars stay zero-based",
   /const ranged = !bars &&/.test(rsrc));
const lastArcIdx = pace.map(r => r[0]).lastIndexOf("arc");
let lastFill = null;
for (let i = lastArcIdx; i >= 0; i--) if (pace[i][0] === "SET:fillStyle") { lastFill = pace[i][1]; break; }
/* jsdom does not compute CSS custom properties, so --accent and --record both
   resolve to the same fallback and comparing the recorded fillStyle would be a
   vacuous pass. Assert the RULE in the source instead: the last point must be
   excluded from the record-colour branch. */
const src = fs.readFileSync(path.join(dir, "js/report.js"), "utf8");
ok("...and the last point is excluded from the record-colour branch",
   /i===o\.hi&&i!==last/.test(src),
   "colour rule checked in source (jsdom cannot resolve CSS vars)");

// ---- 7. Monthly pace names its fair cutoff -------------------------------
const paceFooter = run(`(function(){
  const c=shareCards().find(c=>c.id==='dbm');
  let footer=null; const orig=drawDbm;
  drawDbm=o=>{ footer=o.footer; return null; };
  try{ c.draw(); } finally { drawDbm=orig; }
  return footer;})()`);
ok("Monthly pace names the shared day cutoff", /^every month through day \d+$/.test(String(paceFooter)), String(paceFooter));

console.log(fail ? "\n" + fail + " FAILED" : "\nALL PASS");
process.exit(fail ? 1 : 0);
