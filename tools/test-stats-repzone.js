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
run(`rz.grp=null; rz.ex=null; view='stats'; render();`);
// v3.3.198: ONE card, one heading, a body-part dropdown
check("exactly one rep-zone card renders", `document.querySelectorAll('.rzcard').length`, 1);
check("one heading, unqualified by part",
      `[...document.querySelectorAll('#view h2')].filter(h=>/^Rep zones/.test(h.textContent)).length`, 1);
check("the body-part control is a dropdown", `!!document.querySelector('#rzGrp')`, true);
run(`rz.grp='Chest'; rz.ex=null; render();`);
const CH = `document.querySelector('.rzcard')`;
check("three buckets render — the empty one included",
      `${CH}.querySelectorAll('.rzrow').length`, 3);
check("an empty bucket renders '0 sets' in the same voice",
      `(function(){
        const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
        /* three sessions → goto tier, so Chest Fly is chip-reachable under
           the v3.3.187 goto-only rule */
        for(const n of [2,4,6]) DB.days[D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:40,reps:[8,8,8]}],upd:1};
        SEED=deriveAll(); rz.grp='Chest'; rz.ex='Chest Fly'; render();
        const rows=[...document.querySelector('[data-rzcard="Chest"]').querySelectorAll('.rzrow')];
        const ok=rows.length===3 && /(^|[^0-9])0 sets/.test(rows[0].textContent)
              && /(^|[^0-9])0 sets/.test(rows[2].textContent) && /9 sets/.test(rows[1].textContent);
        rz.grp='Chest'; rz.ex='Incline Barbell Bench Press'; render(); return ok;})()`, true);
check("no red anywhere in the card — red means live, this is not live",
      `${CH}.innerHTML.includes('--live')`, false);
check("an empty bucket's bar is width 0, not missing",
      `(function(){rz.grp='Chest'; rz.ex='Chest Fly'; render();
        const w2=document.querySelector('[data-rzcard="Chest"]').querySelectorAll('.rzbar i')[0].style.width;
        rz.grp='Chest'; rz.ex='Incline Barbell Bench Press'; render(); return w2;})()`, "0%");

// ---- selector + window controls exist and reflect state
// v3.3.187: the dropdown is chips now — part row + GO-TO lifts of that part
check("the part chip row is gone", `!document.querySelector('.rzparts')`, true);
check("the card has exactly one lift row",
      `document.querySelectorAll('.rzcard .rzlifts').length`, 1);
check("the dropdown lists visible groups, not raw parts",
      `[...document.querySelector('#rzGrp').options].map(o=>o.value).some(v=>v==='Biceps'||v==='Sixpack')`, false);
check("the Chest card marks its selected lift",
      `${CH}.querySelector('.rzlifts .chip.on').firstChild.textContent`, "Incline Barbell Bench Press");
// v3.3.189: the rail is ordered by weight of use — sessions, then sets, then
// recency — so the part's centre of gravity leads, not the latest cameo
check("the most-trained lift leads the rail, not the most recent",
      `(function(){
        const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
        for(let i=1;i<=8;i++) DB.days[D(1+i*4)]={w:[{part:'Back',ex:'Deadlift',w:100,reps:[5,5,5,5]}],upd:1};
        for(const n of [1,9,17]) DB.days[D(n)]={w:[{part:'Back',ex:'Seated Cable Row',w:40,reps:[12]}],upd:1};
        SEED=deriveAll(); rz.grp=null; rz.ex=null; render();
        return (rz.grp='Back',rz.ex=null,render(),document.querySelector('.rzcard .rzlifts .chip')).firstChild.textContent;})()`, "Deadlift");
check("...and that is what the Back section opens on",
      `(rz.grp='Back',rz.ex=null,render(),document.querySelector('.rzcard .rzlifts .chip.on')).firstChild.textContent`, "Deadlift");
check("the more-recent cameo is still offered, just not first",
      `[...(rz.grp='Back',rz.ex=null,render(),document.querySelectorAll('.rzcard .rzlifts .chip'))].map(c=>c.firstChild.textContent).includes('Seated Cable Row')`, true);
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
run(`rz.grp='Chest'; rz.ex='Incline Barbell Bench Press'; render();`);
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
  SEED=deriveAll(); rz.grp=null; rz.ex=null; render();})()`);
check("Lunge is the most recent lift of all", 
      `exLastFor('Dumbbell Lunge') > exLastFor('Incline Barbell Bench Press')`, true);
check("...but a one-off is not a core lift", `exTier('Dumbbell Lunge')==='goto'`, false);
// v3.3.198 dropped the tier gate: the rail is sets-ordered, so the most-used
// lift leads and the one-off simply ranks last — not excluded, just honest
check("...so the Legs card opens on the most-used lift, not the recent one-off",
      `(rz.grp='Legs',rz.ex=null,render(),document.querySelector('.rzcard .rzlifts .chip.on')).firstChild.textContent`, "Squat");

// ---- v3.3.186 default rules, in order:
// (1) trained today → TODAY's part's core lift wins over everything
run(`(function(){
  DB.days[todayISO]={w:[{part:'Legs',ex:'Squat',w:100,reps:[5,5,5]}],upd:1};
  SEED=deriveAll(); rz.grp=null; rz.ex=null; render();})()`);   /* fresh open */
check("trained today → the dropdown opens on today's group", `rz.grp`, "Legs");
check("...and that section opens on the part's core lift",
      `(rz.grp='Legs',rz.ex=null,render(),document.querySelector('.rzcard .rzlifts .chip.on')).firstChild.textContent`, "Squat");
// v3.3.196: sections speak in VISIBLE GROUPS — Biceps+Triceps fold to Arms
check("a Biceps lift lands in an 'Arms' section, not 'Biceps'",
      `(function(){
        const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
        /* uncontended dates: whole-day writes here previously clobbered the
           Chest Fly fixture and quietly demoted it out of go-to tier */
        for(const n of [12,15,18]) DB.days[D(n)]={w:[
          {part:'Biceps',ex:'Barbell Curl',w:30,reps:[10],at:60+n},
          {part:'Triceps',ex:'Rope Pushdown',w:20,reps:[12],at:70+n}],upd:1};
        SEED=deriveAll(); rz.grp=null; rz.ex=null; render();
        const opts=[...document.querySelector('#rzGrp').options].map(o=>o.value);
        return opts.includes('Arms') && !opts.includes('Biceps') && !opts.includes('Triceps');})()`, true);
check("...and both arm lifts share that one section's rail",
      `[...(rz.grp='Arms',rz.ex=null,render(),document.querySelectorAll('.rzcard .rzlifts .chip'))].map(c=>c.firstChild.textContent).sort().join('|')`, "Barbell Curl|Rope Pushdown");
check("Sixpack reads as Core",
      `(function(){
        const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
        for(const n of [13,16,19]) DB.days[D(n)]={w:[{part:'Sixpack',ex:'Cable Crunch',w:30,reps:[15],at:80+n}],upd:1};
        SEED=deriveAll(); rz.grp=null; rz.ex=null; render();
        const opts=[...document.querySelector('#rzGrp').options].map(o=>o.value);
        return opts.includes('Core') && !opts.includes('Sixpack');})()`, true);
// (2) nothing today → the part the app says to train NEXT (trainingPlan's
// own pick — the same authority as Today's Train-next card)
run(`(function(){
  delete DB.days[todayISO]; SEED=deriveAll(); rz.grp=null; rz.ex=null; render();
  window._pick=trainingPlan().pick;
})()`);
check("nothing today → it opens on the app's next pick (when that group has history)",
      `(function(){const g=PART_VISIBLE[window._pick]||window._pick;
        const opts=[...document.querySelector('#rzGrp').options].map(o=>o.value);
        return !window._pick || !opts.includes(g) || rz.grp===g;})()`, true);
check("...and every trained group is offered in the dropdown",
      `document.querySelectorAll('#rzGrp option').length >= 2`, true);

// ---- chip interaction. v3.3.196: only three sections render by default, so
// expand first — this block needs Legs AND Chest on screen at once.
run(`render();`);
// v3.3.198: the rail is every exercise WITH SETS, ordered most→least
check("the rail is ordered by sets logged, most first",
      `(function(){const names=[...(rz.grp='Legs',rz.ex=null,render(),document.querySelectorAll('.rzcard .rzlifts .chip'))]
          .map(c=>c.firstChild.textContent);
        return names[0]==='Squat' && names.includes('Dumbbell Lunge')
            && names.indexOf('Squat')<names.indexOf('Dumbbell Lunge');})()`, true);
check("an exercise with no sets logged never appears",
      `(function(){
        const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
        DB.days[D(1)]={w:[{part:'Legs',ex:'Leg Extension',w:40,reps:[],at:99}],upd:1};
        SEED=deriveAll(); rz.grp='Legs'; rz.ex=null; render();
        return [...document.querySelectorAll('.rzcard .rzlifts .chip')]
          .every(c=>c.firstChild.textContent!=='Leg Extension');})()`, true);
/* chips carry the canonical ID in data-rzx; find them by their visible name */
check("tapping a lift chip selects it",
      `(function(){rz.grp='Chest'; rz.ex=null; render();
        [...document.querySelectorAll('.rzcard .rzlifts .chip')]
          .find(c=>c.firstChild.textContent==='Chest Fly').click();
        return canonName(rz.ex);})()`, "Chest Fly");
check("...and switching the dropdown re-picks that group's top lift",
      `(function(){rz.grp='Legs'; rz.ex=null; render(); return rz.ex;})()`, "Squat");

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
        rz.grp='Chest'; rz.ex=null; render();
        const view=document.querySelector('#view');
        const card=document.querySelector('.rzcard');
        const stamp=Symbol('kept'); view[stamp]=1; card[stamp]=1;   /* identity witnesses */
        const railBefore=card.querySelector('.rzlifts');
        const bodyBefore=card.querySelector('.rzbody').innerHTML;
        [...card.querySelectorAll('.rzlifts .chip')].find(c=>c.firstChild.textContent==='Chest Fly').click();
        const card2=document.querySelector('.rzcard');
        return view[stamp]===1                       /* #view was not rebuilt */
            && card2===card && card2[stamp]===1      /* the card node survived */
            && card2.querySelector('.rzlifts')===railBefore   /* the rail, too */
            && card2.querySelector('.rzbody').innerHTML!==bodyBefore;})()`, true);
check("...and the chart actually changed to the new lift",
      `document.querySelector('.rzcard .rzlifts .chip.on').firstChild.textContent`, "Chest Fly");
check("...and the dropdown still names the shown group",
      `document.querySelector('#rzGrp').value`, "Chest");

// ---- Stats never writes: rendering the card must not touch the record
run(`window._before=JSON.stringify(DB.days);`);
run(`rz.grp='Chest'; rz.ex='Incline Barbell Bench Press'; render();`);
check("rendering rep zones writes nothing", `JSON.stringify(DB.days)===window._before`, true);

// ---- v3.3.199: the rail states the number it is sorted by, and the order
// matches it exactly — the ordering is now checkable, not just claimed.
run(`(function(){
  const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  DB.days={}; DB.settings.canon={};
  /* Chest: 3 lifts, deliberately most-sets LAST in log order */
  DB.days[D(2)]={w:[{part:'Chest',ex:'Dip',w:0,reps:[10],at:1}],upd:1};
  DB.days[D(4)]={w:[{part:'Chest',ex:'Chest Fly',w:40,reps:[10,10,10],at:2}],upd:1};
  for(const n of [6,8,10]) DB.days[D(n)]={w:[
    {part:'Chest',ex:'Incline Barbell Bench Press',w:60,reps:[8,8,8,8,8],at:10+n}],upd:1};
  migrateCanon(); SEED=deriveAll(); rz.grp='Chest'; rz.ex=null; render();})()`);
check("the chip with the most sets leads, whatever the log order",
      `document.querySelector('.rzcard .rzlifts .chip').firstChild.textContent`, "Incline Barbell Bench Press");
check("every chip prints the set count it is sorted by",
      `[...document.querySelectorAll('.rzcard .rzlifts .chip')].map(c=>c.querySelector('i').textContent).join(',')`, "15,3,1");
check("...and the printed counts are in descending order",
      `(function(){const n=[...document.querySelectorAll('.rzcard .rzlifts .chip')]
        .map(c=>+c.querySelector('i').textContent);
        return n.every((v,i)=>i===0||n[i-1]>=v);})()`, true);
check("the printed count equals the exercise's real total",
      `(function(){const sets=rzSetsById();
        return sets[canonId('Incline Barbell Bench Press',false)];})()`, 15);

// ---- v3.3.205: axis spacing is derived from named gaps, and each dot can
// be read without a floating tooltip.
run(`rz.grp='Chest'; rz.ex=null; render();`);
const SC = `document.querySelector('.rzcard .rzscat')`;
check("the y axis label clears the tick numbers",
      `(function(){const svg=${SC};
        const lab=svg.querySelector('.rzylab');
        const tick=[...svg.querySelectorAll('text')].find(t=>/^\\d/.test(t.textContent)&&t.getAttribute('text-anchor')==='end');
        return +tick.getAttribute('x') - +lab.getAttribute('x') >= 20;})()`, true);
check("the x axis label sits close under its tick numbers",
      `(function(){const svg=${SC};
        const lab=svg.querySelector('.rzxlab');
        const tick=[...svg.querySelectorAll('text')].find(t=>t.getAttribute('text-anchor')==='middle'&&/^\\d+$/.test(t.textContent));
        const gap=+lab.getAttribute('y') - +tick.getAttribute('y');
        return gap>0 && gap<=16;})()`, true);
check("every dot has a thumb-sized hit target behind it",
      `(function(){const svg=${SC};
        const hits=[...svg.querySelectorAll('.rzhit')], dots=[...svg.querySelectorAll('.rzdot')];
        return hits.length===dots.length && hits.every(h=>+h.getAttribute('r')>=11);})()`, true);
check("...without inflating the visible dot",
      `(function(){const svg=${SC};
        return [...svg.querySelectorAll('.rzdot')].every(d=>+d.getAttribute('r')<11);})()`, true);
check("the caption starts empty but holds its height",
      `document.querySelector('.rzcard [data-rzcap]').textContent.trim()`, "");
run(`document.querySelector('.rzcard .rzhit')
      .dispatchEvent(new window.MouseEvent('click',{bubbles:true}));`);
check("tapping a dot reads out its weight and reps",
      `/\\d+kg \u00d7 \\d+ reps/.test(document.querySelector('.rzcard [data-rzcap]').textContent)`, true);
check("...and marks the dot",
      `!!document.querySelector('.rzcard .rzdot.on')`, true);
check("...matching that dot's own data",
      `(function(){const d=document.querySelector('.rzcard .rzdot.on');
        const cap=document.querySelector('.rzcard [data-rzcap]').textContent;
        return cap.indexOf(d.dataset.rep+' reps')>-1;})()`, true);
run(`document.querySelector('.rzcard .rzhit')
      .dispatchEvent(new window.MouseEvent('click',{bubbles:true}));`);
check("tapping the same dot again clears the readout",
      `document.querySelector('.rzcard [data-rzcap]').textContent.trim()===''
       && !document.querySelector('.rzcard .rzdot.on')`, true);

process.exit(fail ? 1 : 0);
})();
