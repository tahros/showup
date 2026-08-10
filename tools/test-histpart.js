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
check("growth computed, in plain words",
      `/vs your previous 5 sessions/.test(document.querySelector('.pdigest').textContent)`, true);
check("PR list gone (v3.3.41)",  `document.querySelectorAll('.pdigest .prrow').length`, 0);
/* v3.3.155: the growth label now legitimately says "5 sessions"; the
   v3.3.41 check was about a "12 sessions" COUNT stat. Exclude the label. */
check("session count gone (v3.3.41)",
      `/\\d+ sessions/.test(document.querySelector('.pdigest').textContent.replace(/previous 5 sessions/,''))`, false);
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

// ---- v3.3.180: the session head's structure, asserted where jsdom can
// actually see it. Layout itself is CSS (buildcheck guards that), but the
// invariant that MATTERS is compositional: the volume string and both
// controls must live in ONE element, so no wrap can ever separate a day's
// number from the buttons that act on it. A three-part day is the case
// that broke it in the wild.
run(`(function(){
  /* seed into whichever month the fixture left History showing, so the day
     is actually on screen rather than one month out of view */
  const iso=[...document.querySelectorAll('.day')][0].dataset.d; window._headISO=iso;
  DB.days[iso]={w:[
    {part:'Run',ex:'Run',w:3.48,reps:[],mins:27,secs:17},
    {part:'Back',ex:'Deadlift',w:80,reps:[2,3,3,2]},
    {part:'Biceps',ex:'EZ Bar Curl',w:20,reps:[10,10,10,10]}],upd:1};
  SEED=deriveAll(); hist.part=null; view='history'; render();})()`);
const HEAD = `document.querySelector('.day[data-d="'+window._headISO+'"]>summary')`;
check("the three-part day renders a session head", `!!${HEAD}`, true);
check("the head has exactly two columns", `${HEAD}.children.length`, 2);
check("all three parts land in the LEFT column",
      `(function(){const l=${HEAD}.firstElementChild.textContent;
        return ['Run','Back','Biceps'].every(p=>l.includes(p));})()`, true);
check("volume and BOTH controls share the right column",
      `(function(){const r=${HEAD}.lastElementChild;
        return r.querySelectorAll('.dayedit').length===2 && /kg/.test(r.textContent);})()`, true);
check("...so no wrap can split a control away from its day",
      `document.querySelectorAll('.day>summary [data-dshare]').length ===
       document.querySelectorAll('.day>summary>span:last-child [data-dshare]').length`, true);

// ---- v3.3.182: copy the viewed month as text. The builder is asserted as
// a pure function against the canonical record; the copier is asserted for
// its two REQUIRED effects — clipboard payload and the toast notice.
run(`(function(){
  const iso=window._headISO;                      /* the seeded 3-part day */
  hist.y=+iso.slice(0,4); hist.m=+iso.slice(5,7); /* view ITS month */
  window._mt=monthText();})()`);
check("month text opens with the ShowUp header + month name",
      `/^ShowUp \u2014 [A-Z][a-z]+ 20\\d\\d/.test(window._mt)`, true);
check("the seeded day is present, exercise-grouped",
      `window._mt.includes('Deadlift: 80kg\u00d72/3/3/2 (4 sets)')`, true);
check("the run line carries distance and time",
      `/Run: 3\.48 km in 27'17/.test(window._mt)`, true);
check("chronological: header line precedes its exercises",
      `window._mt.indexOf('Deadlift:') > window._mt.indexOf('ShowUp')`, true);
check("only the viewed month: no other month's dates leak in",
      `(function(){const m=new Date(hist.y,hist.m-1,1).toLocaleDateString('en-US',{month:'short'});
        return [...window._mt.matchAll(/^[A-Z][a-z]{2}, ([A-Z][a-z]{2}) /gm)].every(x=>x[1]===m);})()`, true);
check("the part filter does NOT filter the export",
      `(function(){hist.part='Back'; const t=monthText(); hist.part=null;
        return t.includes('EZ Bar Curl');})()`, true);
// the copier: stub the clipboard, click the button, demand both effects
run(`window._clip=null;
  Object.defineProperty(navigator,'clipboard',{value:{writeText:t=>{window._clip=t;return Promise.resolve();}},configurable:true});
  render();`);
check("the Copy month button renders in History",
      `!!document.querySelector('[data-mcopy]')`, true);
run(`window._mtAtClick=monthText(); document.querySelector('[data-mcopy]').click();`);
setTimeout(() => {
  check("clicking it puts the month text on the clipboard",
        `window._clip===window._mtAtClick && window._clip.length>0`, true);
  check("...and shows the notice", `document.querySelector('#toast').textContent`, "Month copied as text");
  check("...toast is visibly on", `document.querySelector('#toast').classList.contains('on')`, true);
  process.exit(fail ? 1 : 0);
}, 40);
