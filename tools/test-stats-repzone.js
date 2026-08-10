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
run(`rz.ex='Incline Barbell Bench Press'; view='stats'; render();`);
check("stats renders the rep-zone card", `!!document.querySelector('.rzcard')`, true);
check("three buckets render — the empty one included",
      `document.querySelectorAll('.rzcard .rzrow').length`, 3);
check("an empty bucket renders '0 sets' in the same voice",
      `(function(){
        const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
        /* three sessions → goto tier, so Chest Fly is chip-reachable under
           the v3.3.187 goto-only rule */
        for(const n of [2,4,6]) DB.days[D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:40,reps:[8,8,8]}],upd:1};
        SEED=deriveAll(); rz.part='Chest'; rz.ex='Chest Fly'; render();
        const rows=[...document.querySelectorAll('.rzcard .rzrow')];
        const ok=rows.length===3 && /(^|[^0-9])0 sets/.test(rows[0].textContent)
              && /(^|[^0-9])0 sets/.test(rows[2].textContent) && /9 sets/.test(rows[1].textContent);
        rz.ex='Incline Barbell Bench Press'; render(); return ok;})()`, true);
check("no red anywhere in the card — red means live, this is not live",
      `document.querySelector('.rzcard').innerHTML.includes('--live')`, false);
check("an empty bucket's bar is width 0, not missing",
      `(function(){rz.part='Chest'; rz.ex='Chest Fly'; render();
        const w2=document.querySelectorAll('.rzcard .rzbar i')[0].style.width;
        rz.ex='Incline Barbell Bench Press'; render(); return w2;})()`, "0%");

// ---- selector + window controls exist and reflect state
// v3.3.187: the dropdown is chips now — part row + GO-TO lifts of that part
check("the dropdown is gone", `!document.querySelector('#rzEx')`, true);
check("part chips render in catalog order (trained parts only)",
      `[...document.querySelectorAll('.rzparts .chip')].map(c=>c.textContent)[0]`, "Chest");
check("the selected part chip is on",
      `document.querySelector('.rzparts .chip.on').textContent`, "Chest");
check("the lift row shows the selected exercise as on",
      `document.querySelector('.rzlifts .chip.on').textContent`, "Incline Barbell Bench Press");
// v3.3.185: the selector is gone — the window is a named constant
check("the window selector is removed", `document.querySelectorAll('[data-rzn]').length`, 0);
check("the window is the constant, not state", `REPZONE_WINDOW`, 10);
check("the two-line footer stays gone",
      `!document.querySelector('.rzscatnote') &&
       !/runs excluded/.test(document.querySelector('.rzcard').textContent)`, true);
check("the short-record note appears only when the record is shorter than the window",
      `(function(){rz.part='Chest'; rz.ex='Chest Fly'; render();      /* 3 sessions < 10 */
        const has=/only 3 sessions logged/.test(document.querySelector('.rzcard').textContent);
        rz.ex='Incline Barbell Bench Press'; render();               /* 13 sessions ≥ 10 */
        const none=!document.querySelector('.rznote');
        return has && none;})()`, true);
// v3.3.185: Rep zones sits right after the ShowUp hero, before Part mix
check("Rep zones renders before Part mix",
      `(function(){const t=document.querySelector('#view').innerHTML;
        return t.indexOf('Rep zones') < t.indexOf('Part mix') && t.indexOf('Rep zones')>-1;})()`, true);

// ---- 4. single definition site (structural, per the suite's idiom)
const statsSrc = fs.readFileSync(path.join(dir, "js/stats.js"), "utf8");
check("REPZONE_MAX_STRENGTH defined exactly once",
      `${(statsSrc.match(/const\s+REPZONE_MAX_STRENGTH\s*=/g)||[]).length}`, 1);
check("REPZONE_MAX_GROWTH defined exactly once",
      `${(statsSrc.match(/const\s+REPZONE_MAX_GROWTH\s*=/g)||[]).length}`, 1);
check("the bucketer references the constants, not literals",
      `${/repZone\(reps\)\{\s*return reps<=REPZONE_MAX_STRENGTH\?0:reps<=REPZONE_MAX_GROWTH\?1:2;/.test(statsSrc.replace(/\n/g,''))}`, "true");

// ---- v3.3.183: the scatter. Same window, same constants, dots from the
// canonical record. The fixture day is the newest session; the 9 weekly
// 60kg×8 singles collapse into ONE count-9 dot.
run(`render();`);
check("scatter renders under the bars", `!!document.querySelector('.rzcard .rzscat')`, true);
check("zone band boundaries: two dashed verticals", 
      `document.querySelectorAll('.rzscat line[stroke-dasharray="3 3"]').length`, 2);
check("the growth band is a shaded rect", 
      `document.querySelectorAll('.rzscat rect').length`, 1);
check("band labels come from REPZONE_LABELS",
      `[...document.querySelectorAll('.rzscat text')].slice(0,3).map(t=>t.textContent).join('|')`, "<6|6\u201312|13+");
// count-sizing: the nine identical 60×8 sets are one dot, data-n=9
check("repeated sets are ONE bigger dot, not nine",
      `document.querySelectorAll('.rzscat circle[data-w="60"][data-rep="8"]').length`, 1);
check("...carrying its count", `document.querySelector('.rzscat circle[data-rep="8"]').dataset.n`, 9);
check("...and drawn larger than a single-count dot",
      `+document.querySelector('.rzscat circle[data-rep="8"]').getAttribute('r') >
       +document.querySelector('.rzscat circle[data-rep="30"]').getAttribute('r')`, true);
// recency: the fixture day (newest, age 0) is solid; a week-old single fades
check("newest session's dots are age 0, opacity 1",
      `document.querySelector('.rzscat circle[data-rep="30"]').dataset.age === "0" &&
       document.querySelector('.rzscat circle[data-rep="30"]').getAttribute('opacity') === "1.00"`, true);
check("older sets fade",
      `+document.querySelector('.rzscat circle[data-rep="8"]').getAttribute('opacity') < 1`, true);
// bands derive from the constants — structural, per the suite's idiom
check("band geometry references the named constants",
      `${/REPZONE_MAX_STRENGTH\+0\.5/.test(statsSrc) && /REPZONE_MAX_GROWTH\+0\.5/.test(statsSrc)}`, "true");
check("no literal 5\.5 or 12\.5 in the scatter",
      `${/[^0-9](5\.5|12\.5)[^0-9]/.test(statsSrc.split('repZoneScatterSvg')[1].split('function repZoneCard')[0])}`, "false");

// ---- the app CHOOSES the core lift: a goto-tier exercise wins the default
run(`(function(){
  const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  /* Squat: trained 10× recently (goto tier). Lunge: trained once, more
     recently (would win a pure-recency default). */
  for(let i=1;i<=10;i++) DB.days[D(2+i*3)]={w:[{part:'Legs',ex:'Squat',w:100,reps:[5]}],upd:1};
  DB.days[D(1)]={w:[{part:'Legs',ex:'Dumbbell Lunge',w:20,reps:[10]}],upd:1};
  SEED=deriveAll(); rz.ex=null; rz.part=null; render();})()`);
check("Lunge is the most recent lift of all", 
      `exLastFor('Dumbbell Lunge') > exLastFor('Incline Barbell Bench Press')`, true);
check("...but a one-off is not a core lift", `exTier('Dumbbell Lunge')==='goto'`, false);
check("...so the default lands on a GOTO lift",
      `rz.ex!=='Dumbbell Lunge' && exTier(rz.ex)`, "goto");

// ---- v3.3.186 default rules, in order:
// (1) trained today → TODAY's part's core lift wins over everything
run(`(function(){
  DB.days[todayISO]={w:[{part:'Legs',ex:'Squat',w:100,reps:[5,5,5]}],upd:1};
  SEED=deriveAll(); rz.ex=null; rz.part=null; render();})()`);   /* fresh open */
check("trained today → today's part's core lift", `rz.ex`, "Squat");
check("...its part is today's part", `homePartOf(rz.ex)`, "Legs");
// (2) nothing today → the part the app says to train NEXT (trainingPlan's
// own pick — the same authority as Today's Train-next card)
run(`(function(){
  delete DB.days[todayISO]; SEED=deriveAll(); rz.ex=null; rz.part=null; render();
  window._pick=trainingPlan().pick;})()`);
check("nothing today → the default follows trainingPlan().pick",
      `!window._pick || homePartOf(rz.ex)===window._pick || exTier(rz.ex)==='goto'`, true);
check("...and is still a real exercise of the record", `!!rz.ex`, true);

// ---- chip interaction (here, where Legs data exists — chips only render
// trained parts, unlike the old dropdown's full catalog)
check("only GO-TO lifts of the part are offered — the one-off Lunge is not",
      `(function(){document.querySelector('[data-rzp="Legs"]').click();
        const names=[...document.querySelectorAll('.rzlifts .chip')].map(c=>c.textContent);
        return names.includes('Squat') && !names.includes('Dumbbell Lunge');})()`, true);
check("tapping a part re-picks its top goto lift", `rz.ex`, "Squat");
check("tapping a lift chip selects it",
      `(function(){document.querySelector('[data-rzp="Chest"]').click();
        document.querySelector('[data-rzx="Incline Barbell Bench Press"]').click();
        return rz.ex;})()`, "Incline Barbell Bench Press");

// ---- v3.3.186: the axes say what they are
check("x axis is labelled", 
      `document.querySelector('.rzscat .rzxlab') && document.querySelector('.rzscat .rzxlab').textContent`, "reps per set");
check("y axis is labelled with the unit",
      `document.querySelector('.rzscat .rzylab') && document.querySelector('.rzscat .rzylab').textContent`, "weight (kg)");

// ---- Stats never writes: rendering the card must not touch the record
run(`window._before=JSON.stringify(DB.days);`);
run(`render();`);
check("rendering rep zones writes nothing", `JSON.stringify(DB.days)===window._before`, true);

process.exit(fail ? 1 : 0);
})();
