// test-milestone.js DIR — v3.3.98: the milestone ladder and the moment.
// Celebrated TOTALS, never streaks. The anti-bait rules are the feature;
// each is an assertion so the meaning cannot drift toward engagement.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage98";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.performance = w.performance || { now: () => Date.now() };
w.HTMLCanvasElement.prototype.getContext = function(){
  const t = { measureText: () => ({ width: 10 }) };
  return new Proxy(t, { get: (o,k) => k in o ? o[k] : (typeof k === "string" ? () => ({}) : undefined),
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

// ---- the ladder itself ------------------------------------------------------
ok("early rungs are 10,20,30,50,100,200,300,500",
   run(`[10,20,30,50,100,200,300,500].every(msLadder)`) &&
   run(`[40,60,70,90,150,250,400,600,750,900].some(msLadder)`) === false);
ok("after 1000: every 100 (Sungjee: '500 is too big, man')",
   run(`[1000,1100,1200,1900,2000,2300].every(msLadder)`) &&
   run(`[1050,1550,999].some(msLadder)`) === false);
ok("thousands are their own tier",
   run(`msTier(1000)`) === "thousand" && run(`msTier(2000)`) === "thousand" &&
   run(`msTier(1100)`) === "regular" && run(`msTier(500)`) === "regular");
ok("msPrevRung walks the ladder", run(`msPrevRung(100)`) === 50 && run(`msPrevRung(1100)`) === 1000 && run(`msPrevRung(10)`) === 0);
ok("no exclamation mark in any milestone line \u2014 bold by type, not punctuation",
   run(`[10,20,30,50,100,200,300,500,1000,1100,2000].every(n=>!msLine(n).includes('!'))`));

// seed helper: N trained days ending yesterday (plain concatenation — the
// first draft's template-escape cleverness produced invalid JS; the lesson
// keeps being the same lesson)
const seedN = (n) => run("(function(){" +
  "DB.days={}; delete DB.settings.msFloor; delete DB.settings.msAck;" +
  "const t=new Date(todayISO+'T00:00');" +
  "for(let i=1;i<=" + n + ";i++){ const d=new Date(t); d.setDate(d.getDate()-i);" +
  "  DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1}; }" +
  "SEED=deriveAll(); return SEED.totals.sessions;" +
  "})()");

// ---- rule: high-water floor \u2014 no retroactive fireworks ----------------------
seedN(97);
run(`view='today'; render();`);
ok("first run initialises the floor to the current total \u2014 nothing fires",
   run(`DB.settings.msFloor`) === 97 && run(`msPending()`) === 0 &&
   !/msmoment/.test(run(`$('#view').innerHTML`)));

// ---- crossing live fires \u2014 once, largest only -------------------------------
run(`(function(){ // log 3 more days by past-edit + today \u2014 crosses 100
  const t=new Date(todayISO+'T00:00');
  for(const off of [100,101]){ const d=new Date(t); d.setDate(d.getDate()-off);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Back',ex:'Row',w:40,reps:[10]}],upd:1}; }
  day(todayISO).w.push({part:'Chest',ex:'Chest Press',w:40,reps:[10],at:Date.now()});
  SEED=deriveAll(); view='today'; render(); })()`);
ok("crossing 100 live shows the moment", /msmoment/.test(run(`$('#view').innerHTML`)) &&
   /data-ms="100"/.test(run(`$('#view').innerHTML`)));
ok("...regular tier at 100", /msmoment regular/.test(run(`$('#view').innerHTML`)));
ok("...the number counts up FROM the previous rung", /data-from="50"/.test(run(`$('#view').innerHTML`)));
ok("...and the dry line is present", /A hundred days of showing up\./.test(run(`$('#view').innerHTML`)));

// the moment must not block or alter Lift
run(`view='lift'; lift={part:null,ex:null,weight:0}; render();`);
ok("Lift renders with no moment in it \u2014 the gym is for the gym",
   !/msmoment/.test(run(`$('#view').innerHTML`)));
run(`view='today'; render();`);

// ---- dismissal: one tap, permanent, synced ---------------------------------
run(`$('#view').querySelector('#msDismiss').click();`);
ok("dismiss acknowledges the rung", run(`DB.settings.msAck`) === 100);
ok("...and the moment is gone", !/msmoment/.test(run(`$('#view').innerHTML`)));
run(`render();`);
ok("...permanently \u2014 re-render does not resurrect it", !/msmoment/.test(run(`$('#view').innerHTML`)));

// ---- several rungs at once: ONE moment, the largest --------------------------
// (first draft seeded 106 days — crossing 200 but never reaching 300, so the
// assertion failed against its own fixture, not the app. 210 days crosses both.)
run(`(function(){ const t=new Date(todayISO+'T00:00');
  for(let off=200; off<410; off++){ const d=new Date(t); d.setDate(d.getDate()-off);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Legs',ex:'Squat',w:60,reps:[10]}],upd:1}; }
  SEED=deriveAll(); view='today'; render(); })()`);
ok("bulk past-edits crossing 200 AND 300 produce ONE moment for 300",
   /data-ms="300"/.test(run(`$('#view').innerHTML`)) &&
   !/data-ms="200"/.test(run(`$('#view').innerHTML`)));
run(`$('#view').querySelector('#msDismiss').click();`);

// ---- the thousand tier -------------------------------------------------------
run(`(function(){ const t=new Date(todayISO+'T00:00');
  let need=1000-msLiveTotal();
  for(let off=400; need>0; off++){ const d=new Date(t); d.setDate(d.getDate()-off);
    const iso=d.toLocaleDateString('en-CA');
    if(!DB.days[iso]){ DB.days[iso]={w:[{part:'Back',ex:'Row',w:40,reps:[10]}],upd:1}; need--; }
  }
  SEED=deriveAll(); view='today'; render(); })()`);
ok("day 1000 wears the thousand tier", /msmoment thousand/.test(run(`$('#view').innerHTML`)) &&
   /data-ms="1000"/.test(run(`$('#view').innerHTML`)));
ok("...with the record cascading in (msgrid cells)",
   run(`document.querySelectorAll('.msmoment .msgrid i').length`) > 12);
ok("...and its own line", /The long game, kept\./.test(run(`$('#view').innerHTML`)));
ok("the share card draws at 1080", run(`(function(){const c=drawMilestone(1000); return c.width===1080&&c.height===1080;})()`));
run(`$('#view').querySelector('#msDismiss').click();`);

// ---- restore/import is honoured, never celebrated ---------------------------
run(`(function(){ // simulate Restore's adoption of a foreign 500-day archive
  const doc={days:{},settings:{unit:'kg'}};
  const t=new Date(todayISO+'T00:00');
  for(let i=1;i<=500;i++){ const d=new Date(t); d.setDate(d.getDate()-i);
    doc.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:Date.now()}; }
  DB=doc; SEED=deriveAll(); view='today'; render(); })()`);
ok("a restored 500-day archive fires NOTHING (floor re-initialises to its total)",
   !/msmoment/.test(run(`$('#view').innerHTML`)) && run(`DB.settings.msFloor`) === 500);

// ---- the History line: derived, retroactive, factual ------------------------
run(`view='history'; render();`);
// find day #500's date and check the marker renders when its details are open
ok("msMarkFor names the ordinal of a milestone day",
   run(`(function(){ const d=[...SEED.dates].sort()[499]; return msMarkFor(d); })()`) === 500);
ok("...and a non-rung day gets nothing",
   run(`(function(){ const d=[...SEED.dates].sort()[498]; return msMarkFor(d); })()`) === 0);

// ---- greeting countdown unchanged: thousands only ---------------------------
ok("the greeting still counts down to thousands only (no '3 to 10' bait)",
   run(`helloSub(7)`) === "7 days in." && /to 1,000/.test(run(`helloSub(940)`)));

// ---- reduced-motion kill exists for the cascade -----------------------------
const cssSrc = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
ok("the cascade has a reduced-motion kill",
   /prefers-reduced-motion:reduce\)\{\.msgrid i\{animation:none/.test(cssSrc));

process.exit(fail ? 1 : 0);
