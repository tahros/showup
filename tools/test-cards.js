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

// ---- the icons are present and wired ---------------------------------------
const WANT = ["dbmShare", "heatShare", "wdShare", "paceShare", "weekShare"];
for (const id of WANT)
  ok(`${id} icon renders in a section header`,
     run(`!!document.querySelector('h2 .shareb#${id}')`));

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
const paints = (maker) => {
  calls = [];
  run(`__o=showCard; showCard=(fn)=>{ fn(); return null; }; ${maker}(); showCard=__o;`);
  const shapes = calls.filter(c => ["fill", "stroke", "fillRect", "strokeRect"].includes(c[0])).length;
  const texts = calls.filter(c => c[0] === "fillText").map(c => String(c[1]));
  return { shapes, texts };
};
for (const [maker, kicker] of [
  ["makeDbmImage", "DAYS BY MONTH"], ["makeWdImage", "WEEKDAYS"],
  ["makeWeekImage", "EVERY WEEK"], ["makePaceImage", "PACE"],
  ["makeHeatImage", "LAST 6 MONTHS"],
]) {
  const r = paints(maker);
  ok(`${maker} draws real geometry`, r.shapes >= 8, r.shapes + " shape ops");
  ok(`...labelled ${kicker}`, r.texts.includes(kicker), r.texts.slice(0, 3).join(" | "));
  ok(`...and carries the URL footer`, r.texts.some(t => /tahros\.github\.io/.test(t)));
}

// ---- the frame is shared, not copy-pasted ---------------------------------
const rep = fs.readFileSync(path.join(dir, "js/report.js"), "utf8");
ok("one cardFrame() serves them all", (rep.match(/function cardFrame/g) || []).length === 1);
ok("...and one drawSeries() covers bars and line",
   (rep.match(/function drawSeries/g) || []).length === 1 &&
   /kind==='line'/.test(rep));

// ---- every share id in the DOM has a handler ------------------------------
const wired = run(`JSON.stringify([...document.querySelectorAll('.shareb')].map(b=>b.id))`);
const handlers = rep;
const unwired = JSON.parse(wired).filter(id => !handlers.includes(`hit('${id}')`));
ok("every share icon on screen has a router handler", unwired.length === 0,
   unwired.length ? unwired.join(",") : JSON.parse(wired).length + " wired");

process.exit(fail ? 1 : 0);
