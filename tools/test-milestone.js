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

// ---- v4.6.394: no milestone card on Today --------------------------------------
// "DAY 500 · Half the mountain" sat on top of Today, and an import crossed five rungs at once.
// The card is gone: crossing a rung live, crossing several at once, the thousand, an import
// or a restore -- Today shows none of them. The ladder, the lines and the share card stay
// (the day's close and History still use them).
seedN(97);
run(`(function(){ const t=new Date(todayISO+'T00:00');
  for(const off of [100,101]){ const d=new Date(t); d.setDate(d.getDate()-off);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Back',ex:'Row',w:40,reps:[10]}],upd:1}; }
  day(todayISO).w.push({part:'Chest',ex:'Chest Press',w:40,reps:[10],at:Date.now()});
  SEED=deriveAll(); view='today'; render(); })()`);
ok("crossing 100 live shows no card on Today", !/msmoment/.test(run(`$('#view').innerHTML`)));
run(`(function(){ const t=new Date(todayISO+'T00:00');
  let need=1000-msLiveTotal();
  for(let off=200; need>0; off++){ const d=new Date(t); d.setDate(d.getDate()-off);
    const iso=d.toLocaleDateString('en-CA');
    if(!DB.days[iso]){ DB.days[iso]={w:[{part:'Back',ex:'Row',w:40,reps:[10],imp:'imp-x'}],upd:1}; need--; }
  }
  SEED=deriveAll(); view='today'; render(); })()`);
ok("...nor an import that carries the record past 200, 300, 500 and 1000", !/msmoment/.test(run(`$('#view').innerHTML`)));
ok("the share card still draws at 1080", run(`(function(){const c=drawMilestone(1000); return c.width===1080&&c.height===1080;})()`));

// ---- the History line: derived, retroactive, factual ------------------------
run(`view='history'; render();`);
// find day #500's date and check the marker renders when its details are open
ok("msMarkFor names the ordinal of a milestone day",
   run(`(function(){ const d=[...SEED.dates].sort()[499]; return msMarkFor(d); })()`) === 500);
ok("...and a non-rung day gets nothing",
   run(`(function(){ const d=[...SEED.dates].sort()[498]; return msMarkFor(d); })()`) === 0);

// ---- v3.3.526: the greeting counts down to nothing ---------------------------
/* This guarded the countdown's SCOPE -- thousands only, no "3 to 10" bait --
   on the reasoning that anticipation-farming is the mechanism. That reasoning
   finished the job: it is the mechanism at 1,000 as well, and a number ticking
   down every morning for 75 mornings is the most frequent ceremony in an app
   whose rule is that ceremony is inversely proportional to occasion.
   The milestone MOMENT is untouched and asserted above -- a moment on the day
   is not a countdown to it. What is gone is the tail on the greeting. */
ok("the greeting counts down to nothing, at any distance from a rung",
   run(`helloSub(7)`) === "7 days in." &&
   run(`helloSub(940)`) === "940 days in." &&
   run(`helloSub(999)`) === "999 days in.");

// ---- reduced-motion kill exists for the cascade -----------------------------
const cssSrc = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
ok("the cascade has a reduced-motion kill",
   /prefers-reduced-motion:reduce\)\{\.msgrid i\{animation:none/.test(cssSrc));

process.exit(fail ? 1 : 0);
