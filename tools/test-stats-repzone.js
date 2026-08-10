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
run(`rz.sel={}; view='stats'; render();`);
check("stats renders a rep-zone card per trained part",
      `document.querySelectorAll('.rzcard').length >= 1`, true);
check("each part gets its own heading",
      `[...document.querySelectorAll('#view h2')].some(h=>/^Rep zones \u00b7 Chest/.test(h.textContent))`, true);
const CH = `document.querySelector('[data-rzcard="Chest"]')`;
check("three buckets render — the empty one included",
      `${CH}.querySelectorAll('.rzrow').length`, 3);
check("an empty bucket renders '0 sets' in the same voice",
      `(function(){
        const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
        /* three sessions → goto tier, so Chest Fly is chip-reachable under
           the v3.3.187 goto-only rule */
        for(const n of [2,4,6]) DB.days[D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:40,reps:[8,8,8]}],upd:1};
        SEED=deriveAll(); rz.sel={Chest:'Chest Fly'}; render();
        const rows=[...document.querySelector('[data-rzcard="Chest"]').querySelectorAll('.rzrow')];
        const ok=rows.length===3 && /(^|[^0-9])0 sets/.test(rows[0].textContent)
              && /(^|[^0-9])0 sets/.test(rows[2].textContent) && /9 sets/.test(rows[1].textContent);
        rz.sel={Chest:'Incline Barbell Bench Press'}; render(); return ok;})()`, true);
check("no red anywhere in the card — red means live, this is not live",
      `${CH}.innerHTML.includes('--live')`, false);
check("an empty bucket's bar is width 0, not missing",
      `(function(){rz.sel={Chest:'Chest Fly'}; render();
        const w2=document.querySelector('[data-rzcard="Chest"]').querySelectorAll('.rzbar i')[0].style.width;
        rz.sel={Chest:'Incline Barbell Bench Press'}; render(); return w2;})()`, "0%");

// ---- selector + window controls exist and reflect state
// v3.3.187: the dropdown is chips now — part row + GO-TO lifts of that part
check("the dropdown is gone", `!document.querySelector('#rzEx')`, true);
// v3.3.188: parts are SECTIONS now, not chips
check("the part chip row is gone", `!document.querySelector('.rzparts')`, true);
check("every card has exactly one lift row",
      `[...document.querySelectorAll('.rzcard')].every(c=>c.querySelectorAll('.rzlifts').length===1)`, true);
check("the Chest card marks its selected lift",
      `${CH}.querySelector('.rzlifts .chip.on').textContent`, "Incline Barbell Bench Press");
// v3.3.189: the rail is ordered by weight of use — sessions, then sets, then
// recency — so the part's centre of gravity leads, not the latest cameo
check("the most-trained lift leads the rail, not the most recent",
      `(function(){
        const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
        for(let i=1;i<=8;i++) DB.days[D(1+i*4)]={w:[{part:'Back',ex:'Deadlift',w:100,reps:[5,5,5,5]}],upd:1};
        for(const n of [1,9,17]) DB.days[D(n)]={w:[{part:'Back',ex:'Seated Cable Row',w:40,reps:[12]}],upd:1};
        SEED=deriveAll(); rz.sel={}; render();
        return document.querySelector('[data-rzcard="Back"] .rzlifts .chip').textContent;})()`, "Deadlift");
check("...and that is what the Back section opens on",
      `document.querySelector('[data-rzcard="Back"] .rzlifts .chip.on').textContent`, "Deadlift");
check("the more-recent cameo is still offered, just not first",
      `[...document.querySelectorAll('[data-rzcard="Back"] .rzlifts .chip')].map(c=>c.textContent).includes('Seated Cable Row')`, true);
check("the window selector is removed", `document.querySelectorAll('[data-rzn]').length`, 0);
check("the window is the constant, not state", `REPZONE_WINDOW`, 10);
check("the legend line stays gone",
      `!document.querySelector('.rzscatnote') && !/runs excluded/.test(${CH}.textContent)`, true);
// v3.3.189: the card ends at the chart — no footer text at all
check("no footer note under the chart", `!${CH}.querySelector('.rznote')`, true);
check("no date-range text anywhere in the card", `/Date range/.test(${CH}.textContent)`, false);
check("the old 'only N sessions' phrasing stays gone", `/only \\d+ session/.test(${CH}.textContent)`, false);

// ---- v3.3.189: the lift rail scrolls sideways, so it must be exempt from
// the tab-swipe gesture — otherwise a sideways drag changes tabs
check("the lift rail is on the tab-swipe blocklist",
      `${(fs.readFileSync(path.join(dir,"js/util.js"),"utf8").includes("closest('.rzlifts')"))}`, "true");

// ---- v3.3.189: dots never touch the plot edges
check("every dot clears the plot top and bottom by its own radius",
      `(function(){
        const svg=${CH}.querySelector('.rzscat');
        const band=svg.querySelector('rect');
        const top=+band.getAttribute('y'), h=+band.getAttribute('height');
        return [...svg.querySelectorAll('circle')].every(c=>{
          const cy=+c.getAttribute('cy'), r=+c.getAttribute('r');
          return cy-r > top && cy+r < top+h;});})()`, true);
// v3.3.185: Rep zones sits right after the ShowUp hero, before Part mix
check("Rep zones renders before Part mix",
      `(function(){const t=document.querySelector('#view').innerHTML;
        return t.indexOf('Rep zones') < t.indexOf('Part mix') && t.indexOf('Rep zones')>-1;})()`, true);
check("the part that matters today leads the sections",
      `[...document.querySelectorAll('#view h2')].filter(h=>/^Rep zones/.test(h.textContent)).length >= 1`, true);

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
run(`rz.sel={Chest:'Incline Barbell Bench Press'}; render();`);
check("scatter renders under the bars", `!!${CH}.querySelector('.rzscat')`, true);
check("zone band boundaries: two dashed verticals", 
      `${CH}.querySelectorAll('.rzscat line[stroke-dasharray="3 3"]').length`, 2);
check("the growth band is a shaded rect", 
      `${CH}.querySelectorAll('.rzscat rect').length`, 1);
check("band labels come from REPZONE_LABELS",
      `[...${CH}.querySelectorAll('.rzscat text')].slice(0,3).map(t=>t.textContent).join('|')`, "<6|6\u201312|13+");
// count-sizing: the nine identical 60×8 sets are one dot, data-n=9
check("repeated sets are ONE bigger dot, not nine",
      `${CH}.querySelectorAll('.rzscat circle[data-w="60"][data-rep="8"]').length`, 1);
check("...carrying its count", `${CH}.querySelector('.rzscat circle[data-rep="8"]').dataset.n`, 9);
check("...and drawn larger than a single-count dot",
      `+${CH}.querySelector('.rzscat circle[data-rep="8"]').getAttribute('r') >
       +${CH}.querySelector('.rzscat circle[data-rep="30"]').getAttribute('r')`, true);
// recency: the fixture day (newest, age 0) is solid; a week-old single fades
check("newest session's dots are age 0, opacity 1",
      `${CH}.querySelector('.rzscat circle[data-rep="30"]').dataset.age === "0" &&
       ${CH}.querySelector('.rzscat circle[data-rep="30"]').getAttribute('opacity') === "1.00"`, true);
check("older sets fade",
      `+${CH}.querySelector('.rzscat circle[data-rep="8"]').getAttribute('opacity') < 1`, true);
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
  SEED=deriveAll(); rz.sel={}; render();})()`);
check("Lunge is the most recent lift of all", 
      `exLastFor('Dumbbell Lunge') > exLastFor('Incline Barbell Bench Press')`, true);
check("...but a one-off is not a core lift", `exTier('Dumbbell Lunge')==='goto'`, false);
check("...so the Legs section opens on a GOTO lift, not the one-off",
      `(function(){const c=document.querySelector('[data-rzcard="Legs"] .rzlifts .chip.on').textContent;
        return c!=='Dumbbell Lunge' && exTier(c);})()`, "goto");

// ---- v3.3.186 default rules, in order:
// (1) trained today → TODAY's part's core lift wins over everything
run(`(function(){
  DB.days[todayISO]={w:[{part:'Legs',ex:'Squat',w:100,reps:[5,5,5]}],upd:1};
  SEED=deriveAll(); rz.sel={}; render();})()`);   /* fresh open */
const LEAD = `[...document.querySelectorAll('#view h2')].find(h=>/^Rep zones/.test(h.textContent)).textContent`;
check("trained today → today's part leads the sections", `/Legs/.test(${LEAD})`, true);
check("...and that section opens on the part's core lift",
      `document.querySelector('[data-rzcard="Legs"] .rzlifts .chip.on').textContent`, "Squat");
// v3.3.196: sections speak in VISIBLE GROUPS — Biceps+Triceps fold to Arms
check("a Biceps lift lands in an 'Arms' section, not 'Biceps'",
      `(function(){
        const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
        /* uncontended dates: whole-day writes here previously clobbered the
           Chest Fly fixture and quietly demoted it out of go-to tier */
        for(const n of [12,15,18]) DB.days[D(n)]={w:[
          {part:'Biceps',ex:'Barbell Curl',w:30,reps:[10],at:60+n},
          {part:'Triceps',ex:'Rope Pushdown',w:20,reps:[12],at:70+n}],upd:1};
        SEED=deriveAll(); _rzAll=true; rz.sel={}; render();
        return !!document.querySelector('[data-rzcard="Arms"]') && !document.querySelector('[data-rzcard="Biceps"]');})()`, true);
check("...and both arm lifts share that one section's rail",
      `[...document.querySelectorAll('[data-rzcard="Arms"] .rzlifts .chip')].map(c=>c.textContent).sort().join('|')`, "Barbell Curl|Rope Pushdown");
check("Sixpack reads as Core",
      `(function(){
        const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
        for(const n of [13,16,19]) DB.days[D(n)]={w:[{part:'Sixpack',ex:'Cable Crunch',w:30,reps:[15],at:80+n}],upd:1};
        SEED=deriveAll(); rz.sel={}; render();
        return !!document.querySelector('[data-rzcard="Core"]') && !document.querySelector('[data-rzcard="Sixpack"]');})()`, true);
run(`_rzAll=false;`);
// (2) nothing today → the part the app says to train NEXT (trainingPlan's
// own pick — the same authority as Today's Train-next card)
run(`(function(){
  delete DB.days[todayISO]; SEED=deriveAll(); rz.sel={}; render();
  window._pick=trainingPlan().pick;
  window._lead=[...document.querySelectorAll('#view h2')].find(h=>/^Rep zones/.test(h.textContent)).textContent;
  window._hasPickCard=!!document.querySelector('[data-rzcard="'+trainingPlan().pick+'"]');})()`);
check("nothing today → the leading section is the app's next pick (when that part has history)",
      `!window._pick || !window._hasPickCard || window._lead.indexOf(window._pick)>-1`, true);
check("...and every part still gets a section", 
      `document.querySelectorAll('.rzcard').length >= 2`, true);

// ---- chip interaction. v3.3.196: only three sections render by default, so
// expand first — this block needs Legs AND Chest on screen at once.
run(`_rzAll=true; render();`);
check("only GO-TO lifts of the part are offered — the one-off Lunge is not",
      `(function(){const names=[...document.querySelectorAll('[data-rzcard="Legs"] .rzlifts .chip')]
          .map(c=>c.textContent);
        return names.includes('Squat') && !names.includes('Dumbbell Lunge');})()`, true);
check("tapping a lift chip selects it within ITS part",
      `(function(){rz.sel={}; render();
        document.querySelector('[data-rzcard="Chest"] [data-rzx="Chest Fly"]').click();
        return rz.sel['Chest'];})()`, "Chest Fly");
check("...and leaves other parts untouched (they keep their own default)",
      `(function(){document.querySelector('[data-rzcard="Legs"] [data-rzx="Squat"]').click();
        document.querySelector('[data-rzcard="Chest"] [data-rzx="Incline Barbell Bench Press"]').click();
        return rz.sel['Legs'];})()`, "Squat");

// ---- v3.3.186: the axes say what they are
check("x axis is labelled", 
      `${CH}.querySelector('.rzscat .rzxlab') && ${CH}.querySelector('.rzscat .rzxlab').textContent`, "reps per set");
check("y axis is labelled with the unit",
      `${CH}.querySelector('.rzscat .rzylab') && ${CH}.querySelector('.rzscat .rzylab').textContent`, "weight (kg)");

// ---- v3.3.190: a chip tap must NOT re-render the page. Selecting a lift
// used to call render(), which reset scroll to the top of Stats — the
// reader lost their place every time they asked a question.
check("tapping a lift swaps only that card's body, leaving the DOM around it",
      `(function(){
        rz.sel={}; render();
        const view=document.querySelector('#view');
        const card=document.querySelector('[data-rzcard="Chest"]');
        const stamp=Symbol('kept'); view[stamp]=1; card[stamp]=1;   /* identity witnesses */
        const railBefore=card.querySelector('.rzlifts');
        const bodyBefore=card.querySelector('.rzbody').innerHTML;
        card.querySelector('[data-rzx="Chest Fly"]').click();
        const card2=document.querySelector('[data-rzcard="Chest"]');
        return view[stamp]===1                       /* #view was not rebuilt */
            && card2===card && card2[stamp]===1      /* the card node survived */
            && card2.querySelector('.rzlifts')===railBefore   /* the rail, too */
            && card2.querySelector('.rzbody').innerHTML!==bodyBefore;})()`, true);
check("...and the chart actually changed to the new lift",
      `document.querySelector('[data-rzcard="Chest"] .rzlifts .chip.on').textContent`, "Chest Fly");
check("...while other parts' cards are untouched",
      `(function(){const l=document.querySelector('[data-rzcard="Legs"] .rzlifts .chip.on');
        return !!l && l.textContent==='Squat';})()`, true);

// ---- Stats never writes: rendering the card must not touch the record
run(`window._before=JSON.stringify(DB.days);`);
run(`rz.sel={Chest:'Incline Barbell Bench Press'}; render();`);
check("rendering rep zones writes nothing", `JSON.stringify(DB.days)===window._before`, true);

// ---- v3.3.195: three parts by default, the rest behind an in-place expander
run(`(function(){
  const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  /* five trained parts so the cut is real */
  DB.days[D(2)].w.push({part:'Shoulder',ex:'Lateral Raise',w:8,reps:[15],at:30});
  DB.days[D(2)].w.push({part:'Triceps',ex:'Rope Pushdown',w:20,reps:[12],at:31});
  SEED=deriveAll(); _rzAll=false; rz.sel={}; render();})()`);
check("only three part sections render by default",
      `document.querySelectorAll('.rzcard').length`, 3);
check("the expander names how many more there are",
      `/All parts \u00b7 \\d+ more/.test(document.querySelector('[data-rzmore]').textContent)`, true);
check("today's/lead part still heads the three",
      `[...document.querySelectorAll('#view h2')].find(h=>/^Rep zones/.test(h.textContent)).textContent.length>0`, true);
check("expanding opens in place — #view is not rebuilt",
      `(function(){const v=document.querySelector('#view'); v._k2=1;
        document.querySelector('[data-rzmore]').click();
        return v._k2===1 && document.querySelectorAll('.rzcard').length>3;})()`, true);
check("...and the control now offers fewer",
      `/Fewer parts/.test(document.querySelector('[data-rzmore]').textContent)`, true);
run(`document.querySelector('[data-rzmore]').click();`);
check("collapsing returns to three", `document.querySelectorAll('.rzcard').length`, 3);

// ---- v3.3.195: rails hold at most the TOP 2 lifts
run(`(function(){
  const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  /* a third goto Back lift, least used of the three */
  for(const n of [4,11]) DB.days[D(n)]={w:[...(DB.days[D(n)]?DB.days[D(n)].w:[]),
    {part:'Back',ex:'Lat Pulldown',w:50,reps:[10],at:40+n}],upd:1};
  SEED=deriveAll(); _rzAll=true; rz.sel={}; render();})()`);
// v3.3.196: the top-2 cap is reverted — the rail carries every GO-TO lift
/* Lat Pulldown holds 2 sessions here, Seated Cable Row 1 (an earlier
   whole-day write took two of its days) — so two Back lifts clear go-to
   tier, and BOTH are offered: the cap is gone, the tier gate is not. */
check("the rail carries every go-to Back lift, not a capped two",
      `document.querySelectorAll('[data-rzcard="Back"] .rzlifts .chip').length`, 2);
check("...and the sub-tier lift is excluded by TIER, not by a cap",
      `(function(){const names=[...document.querySelectorAll('[data-rzcard="Back"] .rzlifts .chip')]
          .map(c=>c.textContent);
        return !names.includes('Seated Cable Row') && exTier('Seated Cable Row')!=='goto';})()`, true);
check("...still ordered by weight of use, Deadlift first",
      `document.querySelector('[data-rzcard="Back"] .rzlifts .chip').textContent`, "Deadlift");
run(`_rzAll=false;`);

process.exit(fail ? 1 : 0);
})();
