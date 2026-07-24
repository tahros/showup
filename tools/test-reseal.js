// test-reseal.js DIR — the red header bug, third occurrence. Asserts that
// EVERY removal path leaves the day's completion state consistent, and that
// isLive() (which drives the red header) follows.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage39";

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

// Sungjee's actual shape: a sealed Shoulder, a Run sealed at PART level
// (never in doneEx), and one open exercise that is about to be removed.
const reset = `
  {const t=dayMeta();
  t.w.length=0; t.doneEx.length=0; t.donePart.length=0; t.doneAll=false;
  t.w.push({part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[30]});
  t.w.push({part:'Run',ex:'Run',w:3.47,mins:27,secs:16});
  t.w.push({part:'Back',ex:'Pull Up',w:70,reps:[8]});
  t.doneEx.push('Dumbbell Press');
  t.donePart.push('Run');}
`;

run(reset);
check("open exercise → day is live", `isLive()`, true);

// --- the path that was broken: remove the whole exercise via its ✕
run(`${reset}
{  DB.days[todayISO].w=dayMeta().w.filter(s=>s.ex!=='Pull Up');
  resealDay(dayMeta());}
`);
check("dropex → day seals",            `dayMeta().doneAll`, true);
check("dropex → header stops being live", `isLive()`, false);
check("dropex → run still sealed by part", `dayMeta().donePart.includes('Run')`, true);

// --- a run sealed at part level must never be treated as unfinished
run(`${reset}
{  DB.days[todayISO].w=dayMeta().w.filter(s=>s.part!=='Back');
  resealDay(dayMeta());}
`);
check("part-level seal counts as done", `dayMeta().doneAll`, true);

// --- removing everything resets, not seals
run(`${reset}
{  DB.days[todayISO].w=[];
  resealDay(dayMeta());}
`);
check("empty day → not complete",  `dayMeta().doneAll`, false);
check("empty day → not live",      `isLive()`, false);
check("empty day → seals cleared", `dayMeta().doneEx.length+dayMeta().donePart.length`, 0);

// --- stale seals for removed exercises must not keep the day 'complete'
run(`${reset}
{  DB.days[todayISO].w=dayMeta().w.filter(s=>s.ex!=='Dumbbell Press');
  resealDay(dayMeta());}
`);
check("seal for a removed exercise is dropped",
      `dayMeta().doneEx.includes('Dumbbell Press')`, false);
check("still live — Pull Up is open", `isLive()`, true);

// --- removing the last OPEN thing while others stay open keeps it live
run(`${reset}
{  dayMeta().w.push({part:'Chest',ex:'Dip',w:70,reps:[10]});
  DB.days[todayISO].w=dayMeta().w.filter(s=>s.ex!=='Pull Up');
  resealDay(dayMeta());}
`);
check("another open exercise keeps the day live", `isLive()`, true);

process.exit(fail ? 1 : 0);
