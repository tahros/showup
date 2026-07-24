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

// fixture: this month, alternating Shoulder / Legs days, plus runs.
// Shoulder volume climbs over time so "growth" has something real to find.
run(`
  const mk=(iso,rows)=>{ DB.days[iso]={w:rows,upd:Date.now()}; };
  const M=todayISO.slice(0,7);
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
  hist={y:+thisYear,m:+todayISO.slice(5,7),part:null};
  view='history'; render();
`);

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

process.exit(fail ? 1 : 0);
