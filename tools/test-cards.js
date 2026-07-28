// test-cards.js DIR — v3.3.114: the five new share cards.
// A wired button and a working card are different claims. These drive the
// real painters and count what actually reaches the 2D context.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage114";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.performance = w.performance || { now: () => Date.now() };
w.Element.prototype.setPointerCapture = function(){};

// a recording 2D context: we care that shapes and text are actually emitted
let calls = [];
w.HTMLCanvasElement.prototype.getContext = function(){
  const t = { measureText: () => ({ width: 40 }) };
  return new Proxy(t, {
    get: (o, k) => (k in o ? o[k] : (...a) => { calls.push([String(k), ...a]); return {}; }),
    set: () => true });
};

for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? "PASS" : "FAIL"), name, extra === undefined ? "" : "\u2192 " + extra);
  if (!cond) fail++;
};

// a year of training with runs, so every series has real data
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  for(let i=1;i<=400;i++){
    const d=new Date(t); d.setDate(d.getDate()-i);
    const iso=d.toLocaleDateString('en-CA');
    if(i%7===0) continue;                        // a real weekday skew
    DB.days[iso]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:1}],upd:1};
    if(i%3===0) DB.days[iso].w.push({part:'Run',ex:'Run',w:5,reps:[],mins:28,secs:0,at:1});
  }
  SEED=deriveAll(); view='stats'; render();})()`);

/* ---- v3.3.130: the registry replaced the icons ----------------------------
   There is no longer a share control per section, so "does the icon render"
   is not a question any more. The equivalent question is whether the card is
   REGISTERED \u2014 a card missing from shareCards() is unreachable exactly the
   way a missing icon used to be. */
ok("no per-section share icon survives", run(`document.querySelectorAll('.shareb').length`) === 0,
   run(`document.querySelectorAll('.shareb').length`) + " left");
const REG = JSON.parse(run(`JSON.stringify(shareCards().map(c=>c.id))`));
for (const id of ["dbm", "heat", "wd", "pace", "week", "grid", "yoy", "dist"])
  ok(`${id} is registered as a shareable card`, REG.includes(id), REG.join(","));
ok("every registered card has a label and a file name",
   run(`shareCards().every(c=>c.label&&typeof c.file==='function'&&c.file().length>0)`));

// ---- the data functions agree with what the screen shows -------------------
ok("wdDist() is the single source the weekday chart also reads",
   run(`JSON.stringify(wdDist().pct.length)`) === "7" &&
   /wdDist\(\)/.test(fs.readFileSync(path.join(dir, "js/stats.js"), "utf8")));
ok("weekSeries() returns weeks with an average",
   run(`(function(){const s=weekSeries(); return s.wks.length>0 && isFinite(s.avg);})()`));
ok("paceSeries() returns [month, secPerUnit] pairs",
   run(`(function(){const p=paceSeries(); return p.length>0 && p.every(r=>r.length===2 && isFinite(r[1]));})()`),
   run(`paceSeries().length`) + " months");
ok("heatSeries() is 26 weeks of 7 days",
   run(`(function(){const c=heatSeries(); return c.length===26 && c.every(x=>x.length===7);})()`));

// ---- each painter actually paints -----------------------------------------
const paints = (id) => {
  calls = [];
  // v3.3.130: draw straight off the registry row \u2014 no showCard stub needed,
  // because draw() returns a canvas and shows nothing by itself.
  run(`shareCards().find(c=>c.id===${JSON.stringify(id)}).draw();`);
  const shapes = calls.filter(c => ["fill", "stroke", "fillRect", "strokeRect"].includes(c[0])).length;
  const texts = calls.filter(c => c[0] === "fillText").map(c => String(c[1]));
  return { shapes, texts };
};
for (const [maker, kicker] of [
  ["dbm", "DAYS BY MONTH"], ["wd", "WEEKDAYS"],
  ["week", "EVERY WEEK"], ["pace", "PACE"],
  ["heat", "LAST 6 MONTHS"],
]) {
  const r = paints(maker);
  ok(`the ${maker} card draws real geometry`, r.shapes >= 8, r.shapes + " shape ops");
  ok(`...labelled ${kicker}`, r.texts.includes(kicker), r.texts.slice(0, 3).join(" | "));
  // v3.3.133: the URL stamp was removed from every card — the wordmark carries
  // provenance now. Inverted rather than deleted: a card must NOT grow one back.
  ok(`...and carries no URL stamp`, !r.texts.some(t => /tahros\.github\.io/.test(t)),
     r.texts.filter(t => /tahros/.test(t)).join(",") || "none");
}

// ---- the frame is shared, not copy-pasted ---------------------------------
const rep = fs.readFileSync(path.join(dir, "js/report.js"), "utf8");
ok("one cardFrame() serves them all", (rep.match(/function cardFrame/g) || []).length === 1);
ok("...and one drawSeries() covers bars and line",
   (rep.match(/function drawSeries/g) || []).length === 1 &&
   /kind==='line'/.test(rep));

/* ---- v3.3.130: one surface, so wiring is three ids, not eight -------------
   The old assertion existed because eight icons each needed their own router
   line and one could silently go missing. That failure mode is gone by
   construction; what replaces it is that every REGISTERED card must actually
   draw, which the loop above covers, plus the carousel controls being wired. */
for (const id of ["repPrev", "repNext", "repShare"])
  ok(`${id} has a router handler`, rep.includes(`hit('${id}')`));
ok("rotating past the end wraps instead of dead-ending", run(`(function(){
     const n=shareCards().length; _repIdx=0; repRotate(-1);
     const back=_repIdx; _repIdx=n-1; repRotate(1);
     const fwd=_repIdx; _repIdx=0;
     return back===n-1 && fwd===0;})()`));
ok("...and every card in the registry is reachable by rotating", run(`(function(){
     const n=shareCards().length; const seen=new Set(); _repIdx=0;
     for(let i=0;i<n;i++){ seen.add(shareCards()[_repIdx].id); repRotate(1); }
     _repIdx=0; return seen.size===n;})()`));

// ---- v3.3.115: the three cards must MIRROR the on-screen chart -----------
// Not "does it draw something" \u2014 does it draw the same thing. Each card is
// compared against the labels its own SVG renders.
const svgTexts = (sel) => run(`(function(){
  const el=[...document.querySelectorAll('#view h2')].find(h=>h.textContent.indexOf(${JSON.stringify(sel)})===0);
  if(!el) return '[]';
  let n=el.nextElementSibling, svg=n?n.querySelector('svg'):null;
  if(!svg) return '[]';
  return JSON.stringify([...svg.querySelectorAll('text')].map(t=>t.textContent.trim()));})()`);

// --- Days by month ---------------------------------------------------------
const dbmSvg = JSON.parse(svgTexts("Days by month"));
const dbmCard = paints("makeDbmImage").texts;
ok("the Days-by-month card carries the same 20-day reference label as the chart",
   dbmSvg.includes("20") && dbmCard.includes("20"));
/* cardFrame() always emits exactly five texts first \u2014 big, sub, kicker,
   footer, url \u2014 which the SVG has no equivalent of. Compare only the plot
   labels after them, or the card's own headline ("23" trained) gets counted
   as a month label and the sets never line up. */
const FRAME_TEXTS = 5;
const dbmMonths = dbmSvg.filter(t => /^\d{2}$/.test(t));
const cardMonths = dbmCard.slice(FRAME_TEXTS).filter(t => /^\d{2}$/.test(t));
ok("...and the same month labels, in the same count",
   dbmMonths.length > 0 && dbmMonths.join(",") === cardMonths.join(","),
   `svg ${dbmMonths.join("")} vs card ${cardMonths.join("")}`);

// --- Weekdays --------------------------------------------------------------
const wdSvg = JSON.parse(svgTexts("Weekdays"));
const wdCard = paints("makeWdImage").texts;
ok("the Weekdays card draws the same 0/25/50/75/100 gridline labels",
   ["0","25","50","75","100"].every(g => wdCard.includes(g)),
   wdCard.filter(t => /^\d+$/.test(t)).join(","));
const wdPctSvg = wdSvg.filter(t => /%$/.test(t)).join(",");
const wdPctCard = wdCard.slice(FRAME_TEXTS).filter(t => /%$/.test(t)).join(",");
ok("...and the same seven percentages as the chart",
   wdPctSvg.length > 0 && wdPctSvg === wdPctCard,
   `svg ${wdPctSvg} vs card ${wdPctCard}`);
ok("...including the caret over the strongest day", wdCard.includes("\u25b2"));
ok("...and the SMTWTFS letters", wdCard.filter(t => /^[SMTWF]$/.test(t)).length === 7,
   wdCard.filter(t => /^[SMTWF]$/.test(t)).join(""));

// --- Last 6 months ---------------------------------------------------------
const heatCard = paints("makeHeatImage");
ok("the heat card draws 26x7 cells plus the rail",
   heatCard.shapes >= 182, heatCard.shapes + " shape ops");
ok("...with the weekday rail letters",
   heatCard.texts.filter(t => /^[SMTWF]$/.test(t)).length === 7,
   heatCard.texts.filter(t => /^[SMTWF]$/.test(t)).join(""));
ok("...and month labels across the top",
   heatCard.texts.some(t => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/.test(t)),
   heatCard.texts.filter(t => /^[A-Z][a-z]{2}$/.test(t)).join(","));

// the shared coordinate mapper is what makes fidelity structural
const rep115 = fs.readFileSync(path.join(dir, "js/report.js"), "utf8");
ok("one vbMap() maps the svg coordinate system for all three",
   (rep115.match(/function vbMap/g) || []).length === 1 &&
   ["drawDbm", "drawWd"].every(f => new RegExp(f + "[\\s\\S]{0,900}vbMap\\(").test(rep115)));

// ---- v3.3.115: icons are larger and beside the title --------------------
const css115 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\n/g, "");
const ib = (css115.match(/\.ibtn\{[^}]*\}/) || [""])[0];
const sz = +((ib.match(/width:(\d+)px/) || [])[1] || 0);
ok("the (i) grew", sz >= 20, sz + "px");
const hacts = (css115.match(/h2 \.hacts\{[^}]*\}/) || [""])[0];
ok("...and the group sits beside the title, not pushed right",
   !/margin-left:auto/.test(hacts), hacts);

process.exit(fail ? 1 : 0);
