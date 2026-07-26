// test-comeback.js DIR — v3.3.97: comebacks, the longevity twin of the streak.
// The five agreed lines, each enforced. A streak measures never stopping;
// this counts returning — and its definition must not drift after shipping.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage97";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({}, { get: () => () => ({}) }); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? "PASS" : "FAIL"), name, extra === undefined ? "" : "\u2192 " + extra);
  if (!cond) fail++;
};

// seed helper: days-ago list -> archive (rest flags optionally injected after)
const seed = (agos) => run(`(function(){
  DB.days={};
  const t=new Date(todayISO+'T00:00');
  for(const a of ${"[AGOS]"}){
    const d=new Date(t); d.setDate(d.getDate()-a);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};
  }
  SEED=deriveAll(); return JSON.stringify(comebacks());
})()`.replace("[AGOS]", JSON.stringify(agos)));

// ---- ground states ---------------------------------------------------------
ok("empty archive: zero comebacks", seed([]) === '{"n":0,"longest":0}', seed([]));
ok("a single day: zero", seed([3]) === '{"n":0,"longest":0}');
ok("daily training: zero", seed([1,2,3,4,5,6,7,8,9,10]) === '{"n":0,"longest":0}');

// ---- LINE 1: the 7-day threshold, and the cadence test ---------------------
// a normal 6-day part cadence (5 days away between sessions) must yield ZERO —
// scheduling is not returning.
ok("a 6-day cadence yields zero (scheduling is not returning)",
   seed([1,7,13,19,25,31]) === '{"n":0,"longest":0}', seed([1,7,13,19,25,31]));
// 6 days away: below threshold. 7 days away: a comeback. Exact boundary.
ok("6 days away is not a comeback", seed([1,8]) === '{"n":0,"longest":0}', seed([1,8]));
ok("7 days away IS a comeback (boundary)", seed([1,9]) === '{"n":1,"longest":7}', seed([1,9]));

// ---- LINE 2: declared rest days are invisible to the gap -------------------
seed([1, 12]);  // an 10-day gap -> one comeback
run(`(function(){ const t=new Date(todayISO+'T00:00'); const d=new Date(t);
  d.setDate(d.getDate()-6);   // a declared rest INSIDE the gap
  DB.days[d.toLocaleDateString('en-CA')]={w:[],rest:true,upd:1};
  SEED=deriveAll(); })()`);
ok("a \u{1F343} inside a gap does not interrupt it (no comeback insurance)",
   run(`JSON.stringify(comebacks())`) === '{"n":1,"longest":10}',
   run(`JSON.stringify(comebacks())`));

// ---- LINE 3: only closed gaps count ----------------------------------------
ok("a trailing open gap is not a comeback in progress",
   seed([30,31,32]) === '{"n":0,"longest":0}', seed([30,31,32]));
ok("...and closing it later counts exactly once",
   seed([1,30,31,32]) === '{"n":1,"longest":28}', seed([1,30,31,32]));

// ---- LINE 4: every return counts, sticky or not ----------------------------
ok("two relapses, two comebacks \u2014 the count is a count, not a grade",
   seed([1,10,11,25]) === '{"n":2,"longest":13}', seed([1,10,11,25]));

// ---- longest tracks the maximum, not the last ------------------------------
ok("longest break is the max across all comebacks",
   seed([1,9,50]) === '{"n":2,"longest":40}', seed([1,9,50]));

// ---- LINE 5 + render: the card, and zero as silence ------------------------
seed([1,10,11,25]);
run(`view='stats'; render();`);
const sv = () => run(`$('#view').innerHTML`);
ok("the streak KPI carries the comeback line",
   /2 comebacks \u00b7 longest break: 13d/.test(sv()), (sv().match(/comeback[^<]*/)||[])[0]);
ok("...singular reads 'comeback'", (seed([1,9]), run(`view='stats'; render(); /1 comeback \u00b7/.test($('#view').innerHTML)`)));
ok("zero renders as NOTHING \u2014 absence is shown by absence",
   (seed([1,2,3]), run(`view='stats'; render(); !/comeback/.test($('#view').innerHTML)`)));
// no colour, no urgency: the line must not carry live/record/rest classes
seed([1,10,11,25]); run(`view='stats'; render();`);
ok("the comeback line wears no state colour",
   !/class="[^"]*(atrisk|livego|restchip)[^"]*"[^>]*>[^<]*comeback/.test(sv()));

// ---- past-day edits update it (derived, not stored) ------------------------
seed([1,9]);
run(`(function(){ const t=new Date(todayISO+'T00:00'); const d=new Date(t);
  d.setDate(d.getDate()-5);   // fill the gap via a "past edit"
  DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Back',ex:'Row',w:40,reps:[10]}],upd:1};
  SEED=deriveAll(); })()`);
ok("filling a gap by past-day edit dissolves the comeback (derived, never stored)",
   run(`JSON.stringify(comebacks())`) === '{"n":0,"longest":0}',
   run(`JSON.stringify(comebacks())`));

process.exit(fail ? 1 : 0);
