// test-stats-repzone.js DIR — v3.3.181 Rep zones in Stats.
// The view exists because of one real day: 12 incline press sets, none in
// 6–12. The fixture IS that day, and the empty middle bucket is the point.
// Suite asserts effects against the canonical record — actual logged reps
// per set — never against a reconstruction. Exit codes, no FAIL-grep.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

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

(async () => {
await new Promise(r => setTimeout(r, 80));

// ---- 1. bucketing: all four boundary values, asserted explicitly
check("5 reps → strength (<6)",   `repZone(5)`, 0);
check("6 reps → growth (6–12)",   `repZone(6)`, 1);
check("12 reps → growth (6–12)",  `repZone(12)`, 1);
check("13 reps → endurance (13+)",`repZone(13)`, 2);

// ---- fixture: the Aug 5 incline session, verbatim, plus a run (exclusion)
// 50×{25,30,27,23} 75×{4,3,3,2} 45×{25,23,15,18} → buckets 4 / 0 / 8
run(`(function(){
  const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  DB.days={};
  DB.days[D(3)]={w:[
    {part:'Run',ex:'Run',w:3.48,reps:[],mins:27,secs:17},
    {part:'Chest',ex:'Incline Barbell Bench Press',w:50,reps:[25,30,27,23]},
    {part:'Chest',ex:'Incline Barbell Bench Press',w:75,reps:[4,3,3,2]},
    {part:'Chest',ex:'Incline Barbell Bench Press',w:45,reps:[25,23,15,18]}],upd:1};
  /* 12 older sessions of the same exercise, one per week, all growth-zone —
     the window test needs an 11th-oldest to exclude */
  for(let i=1;i<=12;i++)
    DB.days[D(3+i*7)]={w:[{part:'Chest',ex:'Incline Barbell Bench Press',w:60,reps:[8]}],upd:1};
  SEED=deriveAll();
})()`);

// ---- 2 & 3. exclusion + the blunt empty bucket, from the canonical record
check("Aug-5 fixture buckets 4 / 0 / 8 over its own session",
      `JSON.stringify(repZoneData('Incline Barbell Bench Press',1).counts)`, "[4,0,8]");
check("the run contributed to no bucket (4+0+8 = every weighted set)",
      `repZoneData('Incline Barbell Bench Press',1).counts.reduce((a,b)=>a+b,0)`, 12);

// ---- 5. window: N=10 spans the fixture day + 9 weekly sessions = 21 sets;
// the 10 older growth singles are excluded — including the 11th-oldest
check("N=10 window: 12 fixture sets + 9 growth singles",
      `JSON.stringify(repZoneData('Incline Barbell Bench Press',10).counts)`, "[4,9,8]");
check("N=20 widens to all 12 singles (proves 10 was the window, not the data)",
      `JSON.stringify(repZoneData('Incline Barbell Bench Press',20).counts)`, "[4,12,8]");
check("N=5: fixture + 4 singles", 
      `JSON.stringify(repZoneData('Incline Barbell Bench Press',5).counts)`, "[4,4,8]");

// ---- 3b. the empty bucket RENDERS — present, count 0, no red
run(`rz.ex='Incline Barbell Bench Press'; rz.n=1; view='stats'; render();`);
check("stats renders the rep-zone card", `!!document.querySelector('.rzcard')`, true);
check("three buckets render — the empty one included",
      `document.querySelectorAll('.rzcard .rzrow').length`, 3);
check("the 6–12 bucket states '0 sets' plainly",
      `(function(){const r=[...document.querySelectorAll('.rzcard .rzrow')][1];
        return r.textContent.includes('6\\u201312') && /(^|[^0-9])0 sets/.test(r.textContent);})()`, true);
check("no red anywhere in the card — red means live, this is not live",
      `document.querySelector('.rzcard').innerHTML.includes('--live')`, false);
check("the empty bucket's bar is width 0, not missing",
      `document.querySelectorAll('.rzcard .rzbar i')[1].style.width`, "0%");

// ---- selector + window controls exist and reflect state
check("exercise selector renders with the exercise chosen",
      `document.querySelector('#rzEx').value`, "Incline Barbell Bench Press");
check("window seg renders 5/10/20",
      `[...document.querySelectorAll('[data-rzn]')].map(b=>b.dataset.rzn).join(',')`, "5,10,20");

// ---- 4. single definition site (structural, per the suite's idiom)
const statsSrc = fs.readFileSync(path.join(dir, "js/stats.js"), "utf8");
check("REPZONE_MAX_STRENGTH defined exactly once",
      `${(statsSrc.match(/const\s+REPZONE_MAX_STRENGTH\s*=/g)||[]).length}`, 1);
check("REPZONE_MAX_GROWTH defined exactly once",
      `${(statsSrc.match(/const\s+REPZONE_MAX_GROWTH\s*=/g)||[]).length}`, 1);
check("the bucketer references the constants, not literals",
      `${/repZone\(reps\)\{\s*return reps<=REPZONE_MAX_STRENGTH\?0:reps<=REPZONE_MAX_GROWTH\?1:2;/.test(statsSrc.replace(/\n/g,''))}`, "true");

// ---- Stats never writes: rendering the card must not touch the record
run(`window._before=JSON.stringify(DB.days);`);
run(`render();`);
check("rendering rep zones writes nothing", `JSON.stringify(DB.days)===window._before`, true);

process.exit(fail ? 1 : 0);
})();
