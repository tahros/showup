// test-histpart.js DIR — asserts the History part filter composes with the
// date surfaces: chips, calendar, month counts, session list, and digest.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage37";

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

// fixture: alternating Shoulder / Legs days, plus runs.
// Shoulder volume climbs over time so "growth" has something real to find.
/* v3.3.142: the fixture used to seed days 1..24 of the CURRENT month and
   stop at today — so on the 2nd of a month it seeded exactly ONE day and no
   runs at all, and three assertions failed for want of data. It passed for
   ~26 days a month and failed for the rest, which is the worst kind of test:
   green when you look, red when you don't. It now anchors on a month that
   has actually elapsed — the current one if 24 days are in the bag, else the
   one before — and points the calendar at whatever it chose. */
run(`
  const mk=(iso,rows)=>{ DB.days[iso]={w:rows,upd:Date.now()}; };
  const dom=+todayISO.slice(8);
  let AY=+todayISO.slice(0,4), AM=+todayISO.slice(5,7);
  if(dom<=24){ AM--; if(AM===0){ AM=12; AY--; } }
  const M=AY+'-'+String(AM).padStart(2,'0');
  for(let d=1;d<=24;d++){
    const iso=M+'-'+String(d).padStart(2,'0');
    if(iso>=todayISO) break;
    const rows=[];
    if(d%2===1) rows.push({part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[20+d,20+d]});
    else        rows.push({part:'Legs',ex:'Squat',w:60,reps:[10,10]});
    if(d%3===0) rows.push({part:'Run',ex:'Run',w:3.4,mins:27,secs:0});
    mk(iso,rows);
  }
  SEED=deriveAll(); _fireDist=null;
  hist={y:AY,m:AM,part:null};
  view='history'; render();
`);
// the fixture is worthless if it did not actually seed — assert it, or a
// starved run reports failures that look like app bugs
const seeded = run(`Object.keys(DB.days).length`);
check("the fixture seeded a full month", `${seeded} >= 20`, true);

check("part chips render",       `document.querySelectorAll('[data-histp]').length > 1`, true);
check("All is selected by default", `document.querySelector('[data-histp=""]').classList.contains('on')`, true);
check("no digest unfiltered",    `!!document.querySelector('.pdigest')`, false);

const allDays = run(`document.querySelectorAll('.cal .cd.on').length`);
console.log("     (unfiltered calendar days:", allDays + ")");

// --- select Shoulder
run(`hist.part='Shoulder'; renderHistory();`);
check("digest appears",          `!!document.querySelector('.pdigest')`, true);
check("digest names the part",   `document.querySelector('.pdigest b').textContent`, "Shoulder");
check("calendar narrows to the part",
      `document.querySelectorAll('.cal .cd.on').length < ${allDays}`, true);
check("calendar days all contain Shoulder",
      `[...document.querySelectorAll('.cal .cd.on[data-hd]')].every(c=>{
         const l=allDays()[c.dataset.hd]||[]; return l.some(s=>s.part==='Shoulder'); })`, true);
check("session rows only show Shoulder sets",
      `[...document.querySelectorAll('details.day .body div b')].every(b=>b.textContent==='Dumbbell Press')`, true);
check("digest charts something", `!!document.querySelector('.pdigest svg rect')`, true);
check("growth computed",         `/vs the 5 before/.test(document.querySelector('.pdigest').textContent)`, true);
check("PR list gone (v3.3.41)",  `document.querySelectorAll('.pdigest .prrow').length`, 0);
check("session count gone (v3.3.41)",
      `/\\d+ sessions/.test(document.querySelector('.pdigest').textContent)`, false);
check("chart caption states sets",
      `/\\d+ sets/.test(document.querySelector('.pdigest svg text').textContent)`, true);
check("all-time line states sets",
      `/[\\d,]+ sets all time/.test(document.querySelector('.pdigest').textContent)`, true);
check("years hold one line",
      `document.querySelector('.ychips').classList.contains('ychips')`, true);
check("part row is the dense variant",
      `!!document.querySelector('.pchips')`, true);

// --- Run is a distance part: no PR rows, km units
run(`hist.part='Run'; renderHistory();`);
check("Run digest still charts",   `!!document.querySelector('.pdigest svg rect')`, true);
check("Run states distance, not sets",
      `/km all time/.test(document.querySelector('.pdigest').textContent)`, true);

// --- clearing restores the unfiltered view
run(`hist.part=null; renderHistory();`);
check("cleared → digest gone",   `!!document.querySelector('.pdigest')`, false);
check("cleared → calendar restored", `document.querySelectorAll('.cal .cd.on').length`, allDays);

// --- a part with no days in the shown month must not claim the month is empty
run(`hist.part='Chest'; renderHistory();`);
check("empty filter names the part",
      `/No Chest logged this month/.test(document.querySelector('#view').textContent)`, true);

// ---- v3.3.102: the digest chart is shorter, on request ---------------------
// height ~15% down (92→78 viewBox units), same proportions preserved so
// the bars still read the same shape, just on a shorter canvas.
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  for(let i=0;i<20;i++){const d=new Date(t); d.setDate(d.getDate()-i*3);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Shoulder',ex:'Dumbbell Press',w:20,reps:[10]}],upd:1};}
  SEED=deriveAll(); hist.part='Shoulder'; view='history'; render();})()`);
const svgH = run(`(document.querySelector('.pdigest svg').getAttribute('viewBox')||'').split(' ')[3]`);
check("the digest chart viewBox is shorter than before (was 92)", `${svgH}<92 && ${svgH}>0`, true);
check("...specifically 78, the ~15% target", svgH, "78");
// the bars must still reach proportionally as far up the shorter canvas —
// the shrink should not also silently flatten the chart
const bh = run(`(function(){
  const rs=[...document.querySelectorAll('.pdigest svg rect')];
  const hs=rs.map(r=>+r.getAttribute('height'));
  return Math.max(...hs);})()`);
check("the tallest bar still reaches close to its old proportional height (~48, was 58)",
      `${bh}>=44 && ${bh}<=52`, true);
// and the card must still render cleanly — no leftover references to the
// old constants anywhere nearby
const histSrc = fs.readFileSync(path.join(dir, "js/history.js"), "utf8");
check("no stray reference to the old H=92 / base=72 / *58 constants remains",
      `${!/H=92|base=72|\*58\)/.test(histSrc)}`, "true");

process.exit(fail ? 1 : 0);
