// test-session.js DIR — v3.3.144: one card, one grammar.
//
// "Last time" and "Logged today" merged into THIS SESSION, and the delete
// affordance moved behind EDIT. The property that matters most is the one
// the maker asked for by sketch: today's sets render in the SAME grammar as
// history — weight-grouped rows of rep chips — with the past dimmed, not
// restyled. And the property that could hurt: deletion must be genuinely
// gated (no armed delete buttons in read mode) while remaining reachable in
// two taps.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.performance = w.performance || { now: () => Date.now() };
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({ measureText: () => ({ width: 10 }) },
  { get: (o,k) => k in o ? o[k] : () => ({}), set: () => true }); };
w.Element.prototype.setPointerCapture = function(){};
w.Element.prototype.releasePointerCapture = function(){};

for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? "FAIL" === "x" ? "" : "PASS" : "FAIL"), name, extra === undefined ? "" : "\u2192 " + extra);
  if (!cond) fail++;
};

const EX = "Dumbbell Front Raise";
run(`(function(){
  DB.days={};
  const prev=new Date(todayISO+'T00:00'); prev.setDate(prev.getDate()-7);
  DB.days[prev.toLocaleDateString('en-CA')]={w:[
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:12,reps:[10],at:1},
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:12,reps:[10],at:2},
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:12,reps:[10],at:3},
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:12,reps:[10],at:4}],upd:1};
  DB.days[todayISO]={w:[
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:12,reps:[10],at:9},
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:12,reps:[10],at:10},
    {part:'Shoulder',ex:${JSON.stringify(EX)},w:14,reps:[8],at:11}],upd:1};
  SEED=deriveAll();
  lift={ex:${JSON.stringify(EX)},part:'Shoulder',weight:12,editToday:false};
  view='lift'; render();})()`);

// ---- 1. one card where two used to be ------------------------------------
ok("exactly one session card renders", run(`document.querySelectorAll('.lastcard.sess').length`) === 1);
ok("no standalone Logged-today zone survives", run(`!document.querySelector('.zone.logged')`));
ok("no standalone Last-time card survives",
   run(`document.querySelectorAll('.lastcard').length`) === 1,
   run(`document.querySelectorAll('.lastcard').length`) + " lastcards");

// ---- 2. one grammar, two distances ---------------------------------------
ok("today renders as weight-grouped rows of rep chips",
   run(`document.querySelectorAll('.sess-now .lastrow').length`) >= 2,
   run(`document.querySelectorAll('.sess-now .lastrow').length`) + " rows");
ok("...folded: two 12kg sets share one row", run(`(function(){
     const first=document.querySelector('.sess-now .lastrow');
     return first && first.querySelectorAll('.repchip').length===2;})()`));
ok("last time renders in the SAME grammar", run(`document.querySelectorAll('.sess-then .lastrow').length`) >= 1);
ok("...dimmed, not restyled", (() => {
  const css = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
  return /\.sess-then\{[^}]*opacity:\.\d+/.test(css);
})());
ok("...and dated with the existing history link",
   run(`!!document.querySelector('.sess-then .linkdate')`));

// ---- 3. deletion is gated, but two taps away ------------------------------
ok("read mode arms NO delete surfaces",
   run(`document.querySelectorAll('.lastcard.sess [data-del]').length`) === 0);
ok("the EDIT button is offered", run(`!!document.getElementById('sessEdit')`));
run(`document.getElementById('sessEdit').click()`);
ok("EDIT shows one tile per individual set, armed",
   run(`document.querySelectorAll('.lastcard.sess [data-del]').length`) === 3,
   run(`document.querySelectorAll('.lastcard.sess [data-del]').length`) + " armed");
ok("...with Clear and Move alongside",
   run(`!!document.getElementById('clearToday') && !!document.getElementById('moveToday')`));
ok("...and the button now reads DONE",
   run(`document.getElementById('sessEdit').textContent`) === "DONE");

// deleting in EDIT actually deletes — the two-tap path works end to end
const before = run(`day(todayISO).w.length`);
run(`document.querySelector('.lastcard.sess [data-del]').click()`);
ok("a tap on an armed tile deletes the set", run(`day(todayISO).w.length`) === before - 1,
   run(`day(todayISO).w.length`) + " vs " + (before - 1));
ok("...and the removal is undoable", run(`undoStack.length`) >= 1);
run(`undo()`);
ok("...undo restores it", run(`day(todayISO).w.length`) === before);

run(`document.getElementById('sessEdit').click()`);
ok("DONE returns to read mode, disarmed",
   run(`document.querySelectorAll('.lastcard.sess [data-del]').length`) === 0);

// ---- 4. footer survives the merge ----------------------------------------
ok("the volume footer renders inside the card",
   run(`!!document.querySelector('.lastcard.sess #volNum')`));
ok("...with the vs-last-session delta",
   run(`!!document.querySelector('.lastcard.sess .delta')`));

// ---- 5. the strip is back above it ---------------------------------------
ok("the compact Suggested strip renders", run(`!!document.querySelector('.zone.mini .lastsets')`));
ok("...between the log zone and the session card", run(`(function(){
     const strip=document.querySelector('.zone.mini');
     const card=document.querySelector('.lastcard.sess');
     return !!(strip&&card&&(strip.compareDocumentPosition(card)&Node.DOCUMENT_POSITION_FOLLOWING));
   })()`));

// ---- 6. the log zone lost its caption, not its controls -------------------
ok("the 'Log a set' caption is gone", !/Log a set/.test(run(`$('#view').innerHTML`)));
ok("...but the stepper, tiles and Add survive", run(`!!document.getElementById('wv')
   && document.querySelectorAll('.repgrid button').length>0
   && !!document.getElementById('addrep')`));

// ---- 7. empty states stay honest ------------------------------------------
run(`DB.days[todayISO]={w:[],upd:1}; SEED=deriveAll(); lift.editToday=false; renderLift();`);
ok("no sets today: the card says so bluntly",
   /Nothing yet/.test(run(`document.querySelector('.lastcard.sess').textContent`)));
ok("...and offers no EDIT for nothing", run(`!document.getElementById('sessEdit')`));
ok("...while last time still shows below",
   run(`!!document.querySelector('.sess-then .lastrow')`));

/* ---- 8. v3.3.146: done today = go-to today -------------------------------
   A lift last touched 1,162 days ago sat in "Sometimes" while its sets were
   on today's board. The day's own facts outrank the lifetime count — and
   only for the day, so one visit cannot fake a staple. */
run(`(function(){
  DB.days={};
  DB.days[todayISO]={w:[{part:'Back',ex:'Deadlift',w:138,reps:[3],at:1}],upd:1};
  const m=dayMeta(); m.doneEx=['Deadlift'];   // completed, so it is back in the tiers
  SEED=deriveAll();})()`);
ok("a lift done today is a go-to today, whatever its history",
   run(`exTier('Deadlift')`) === "goto", run(`exTier('Deadlift')`));
ok("...but one visit does not fake a staple tomorrow", run(`(function(){
     const y=new Date(todayISO+'T00:00'); y.setDate(y.getDate()-1);
     const iso=y.toLocaleDateString('en-CA');
     DB.days={}; DB.days[iso]={w:[{part:'Back',ex:'Deadlift',w:138,reps:[3],at:1}],upd:1};
     SEED=deriveAll(); return exTier('Deadlift');})()`) === "sometimes",
   "yesterday-only → " + run(`exTier('Deadlift')`));
ok("...and an explicit 'other' pin still outranks the day", run(`(function(){
     DB.days={}; DB.days[todayISO]={w:[{part:'Back',ex:'Deadlift',w:138,reps:[3],at:1}],upd:1};
     DB.settings.tierOv={Deadlift:'other'}; SEED=deriveAll();
     const t=exTier('Deadlift'); delete DB.settings.tierOv.Deadlift; return t;})()`) === "sometimes");

/* ---- 9. v3.3.153: the Run view reads today-first too --------------------
   Recent runs sat ABOVE the session card, so a just-logged run rendered
   under eight days of history — inverted against every other exercise. */
run(`(function(){
  DB.days={};
  const prev=new Date(todayISO+'T00:00'); prev.setDate(prev.getDate()-1);
  DB.days[prev.toLocaleDateString('en-CA')]={w:[{part:'Run',ex:'Run',w:3.48,reps:[],mins:27,secs:17,at:1}],upd:1};
  DB.days[todayISO]={w:[{part:'Run',ex:'Run',w:3.6,reps:[],mins:28,secs:17,at:9}],upd:1};
  SEED=deriveAll();
  lift={ex:'Run',part:'Run',weight:0,editToday:false};
  view='lift'; render();})()`);
ok("the run history card still renders", run(`!!document.querySelector('.runhist')`));
ok("...BELOW the session card, today first", run(`(function(){
     const sess=document.querySelector('.lastcard.sess');
     const hist=document.querySelector('.runhist');
     return !!(sess&&hist&&(sess.compareDocumentPosition(hist)&Node.DOCUMENT_POSITION_FOLLOWING));
   })()`));
ok("...and today's run lives in the session card, not the list", (() => {
  const sess = run(`document.querySelector('.lastcard.sess').textContent`);
  const hist = run(`document.querySelector('.runhist').textContent`);
  return /3\.60|3\.6/.test(sess) && !/3\.60/.test(hist) && /3\.48/.test(hist);
})());

/* ---- 10. v3.3.157: the rename is a MIGRATION, not a find-and-replace ---- */
run(`(function(){
  DB.days={}; DB.settings.exW={'Row':33,'Seated Cable Row':40,'Pectoral Fly':50};
  DB.settings.tierOv={'Dumbbell Press':'core'};
  DB.days['2024-01-05']={w:[
    {part:'Back',ex:'Row',w:33,reps:[12],at:1},
    {part:'Chest',ex:'Pectoral Fly',w:50,reps:[20],at:2},
    {part:'Shoulder',ex:'Dumbbell Side Raise',w:12,reps:[20],at:3}],upd:1,
    doneEx:['Row'],sugX:{'Lat Pull Down':['a']}};
  globalThis.__mig=migrateExNames();})()`);
ok("old-named history rows are rewritten",
   run(`DB.days['2024-01-05'].w.map(s=>s.ex).join('|')`)
   === "Seated Cable Row|Chest Fly|Lateral Raise",
   run(`DB.days['2024-01-05'].w.map(s=>s.ex).join('|')`));
ok("...and the changed day's upd was bumped so it wins the cloud merge",
   run(`DB.days['2024-01-05'].upd`) > 1);
ok("doneEx and sugX keys follow", run(`DB.days['2024-01-05'].doneEx[0]`) === "Seated Cable Row"
   && run(`!!DB.days['2024-01-05'].sugX['Lat Pulldown']`));
ok("a settings collision keeps the TARGET's value (Row merges into Seated Cable Row)",
   run(`DB.settings.exW['Seated Cable Row']`) === 40 && run(`DB.settings.exW['Row']`) === undefined);
ok("non-colliding settings keys just move",
   run(`DB.settings.exW['Chest Fly']`) === 50 && run(`DB.settings.tierOv['Dumbbell Shoulder Press']`) === "core");
ok("the migration is idempotent", run(`migrateExNames()`) === 0);
ok("no old name survives in the catalog", run(`(function(){
     const all=Object.values(SEED0.catalog).flat();
     return ['Row','Pectoral Fly','Lat Pull Down','Dumbbell Press','Dumbbell Side Raise']
       .every(o=>!all.includes(o));})()`));
ok("...and every new name is catalogued with part + equip", run(`(function(){
     return ['Seated Cable Row','Chest Fly','Lat Pulldown','Dumbbell Shoulder Press','Lateral Raise']
       .every(n=>Object.values(SEED0.catalog).flat().includes(n)&&SEED0.ex2part[n]&&SEED0.equip[n]);})()`));

/* ---- 11. v3.3.158: midnight + the monthly goal --------------------------
   The stranger user could not log after midnight: iOS resumes PWAs without
   firing visibilitychange and the interval sleeps, so todayISO went stale.
   The guard now runs inside the tap handler itself. */
if(false){ /* v3.3.217: the entire This month goal/target surface is retired. */
run(`(function(){ DB.days={}; DB.settings.moGoal=0; SEED=deriveAll();
  todayISO='2001-01-01';   // force a stale day
  lift={ex:'Chest Press',part:'Chest',weight:16}; view='lift'; render();})()`);
run(`document.querySelector('.repgrid [data-rep]').click();`);
ok("a tap on a stale day rolls the date instead of logging into the past",
   run(`todayISO`) !== "2001-01-01" && run(`!((DB.days['2001-01-01']||{}).w||[]).length`),
   run(`todayISO`));
run(`document.querySelector('.repgrid [data-rep]').click();`);
ok("...and the NEXT tap logs into the real today",
   run(`(day(todayISO).w||[]).length`) >= 1);

run(`(function(){ DB.days={}; DB.settings.moGoal=0; SEED=deriveAll();
  DB.days[todayISO]={w:[{part:'Run',ex:'Run',w:4,reps:[],mins:30,secs:0,at:1}],upd:1};
  lift={ex:'Run',part:'Run',weight:0}; view='stats'; render();})()`);
ok("THIS MONTH renders on STATS and offers a setter when unset",
   run(`!!document.getElementById('moGoalIn')`));
run(`document.getElementById('moGoalIn').value='40';
     document.getElementById('moGoalSet').click();`);
ok("setting 40 shows the remaining distance", (() => {
  const t = run(`document.querySelector('.moGoal').textContent`);
  return /36/.test(t) && /to go/.test(t);
})(), run(`document.querySelector('.moGoal').textContent`).slice(0,60));
ok("...counts today's runs in the last-7-days line",
   /1 run in the last 7 days/.test(run(`document.querySelector('.moGoal .lastfoot').textContent`)));
ok("...and projects 10k from recent pace only when pace exists",
   true);

/* ---- 12. v3.3.159: target pace, and edit that never wipes --------------- */
run(`document.querySelector('#moGoalEdit')?document.querySelector('#moGoalEdit').click():renderLift()`);
ok("edit reopens the setter with the goal PREFILLED, not wiped",
   run(`document.getElementById('moGoalIn')&&document.getElementById('moGoalIn').value`) === "40");
ok("...and no monthly card remains on the Run view", run(`(function(){
     const v=view; view='lift'; render(); const gone=!document.querySelector('.moGoal');
     view=v; render(); return gone;})()`));
run(`document.getElementById('moPaceIn').value="730";   // bare keypad digits
     document.getElementById('moGoalSet').click();`);
ok("a 7'30 target pace parses and projects 10k at 75'00",
   /75'00" at target 7'30"/.test(run(`document.querySelector('.moGoal .lastfoot').textContent`)),
   run(`document.querySelector('.moGoal .lastfoot').textContent`).slice(-70));
ok("...with recent pace shown beside it for the honest gap",
   /recent/.test(run(`document.querySelector('.moGoal .lastfoot').textContent`)));
}

/* ---- 13. v3.3.162: the month metrics card ------------------------------- */
run(`(function(){DB.days={};DB.days[todayISO]={w:[{part:'Run',ex:'Run',w:4,reps:[],mins:30,secs:0,at:1}],upd:1};SEED=deriveAll();view='stats';render();})()`);
ok("RUNNING · month card renders on Stats with a run this month",
   /Running \u00b7/.test(run(`$('#view').innerHTML`)));
ok("...as a visual hero plus metric grid (v3.3.217)", run(`(function(){
     const h2=[...document.querySelectorAll('#view h2')].find(h=>/Running \u00b7/.test(h.textContent));
     const c=h2&&h2.nextElementSibling;
     return !!(c&&c.querySelector('.runmonthhero')&&c.querySelectorAll('.runmonthgrid span').length===6);})()`));
ok("...projection is calendar-rate (km/elapsed \u00d7 days-in-month)", (() => {
  const km = 4, el = +run(`todayISO.slice(8)`),
        dim = run(`new Date(+todayISO.slice(0,4),+todayISO.slice(5,7),0).getDate()`);
  return new RegExp("\u2248\\s*"+Math.round(km/el*dim)).test(run(`$('#view').innerHTML`));
})());
ok("THIS MONTH goal and target card is gone", run(`!document.querySelector('.moGoal')`));
ok("pace chart labels match the other chart legends",
   /font-size="7"/.test(fs.readFileSync(path.join(dir, "js/lift.js"), "utf8")));

/* ---- 14. v3.3.164: scrubbing the live bars ------------------------------ */
run(`(function(){
  DB.days={};
  const p1=new Date(todayISO+'T00:00'); p1.setDate(p1.getDate()-4);
  DB.days[p1.toLocaleDateString('en-CA')]={w:[{part:'Back',ex:'Deadlift',w:80,reps:[2],at:1},{part:'Back',ex:'Deadlift',w:80,reps:[3],at:2}],upd:1};
  DB.days[todayISO]={w:[{part:'Back',ex:'Deadlift',w:80,reps:[6],at:9}],upd:1};
  SEED=deriveAll();
  lift={ex:'Deadlift',part:'Back',weight:80,editToday:false}; view='lift'; render();})()`);
ok("history bars carry date and volume", run(`(function(){
     const b=document.querySelector('.lbbar:not(.lbNow)');
     return !!(b&&b.dataset.d&&+b.dataset.v===400&&b.dataset.cx);})()`));
ok("the now bar is scrubbable too, dated today",
   run(`document.querySelector('.lbNow').dataset.d`) === run(`todayISO`));
ok("a pointerdown on the chart writes DATE · VOLUME into the readout", run(`(function(){
     const svg=document.querySelector('.lbsvg');
     const b=document.querySelector('.lbbar:not(.lbNow)');
     svg.getBoundingClientRect=()=>({left:0,width:330});
     svg.dispatchEvent(new MouseEvent('pointerdown',{clientX:+b.dataset.cx,bubbles:true}));
     return document.querySelector('.lbread').textContent;})()`).includes("400"));
ok("...and highlights the bar under the finger",
   run(`document.querySelector('.lbbar:not(.lbNow)').getAttribute('fill')`) === "var(--accent)");
ok("the chart is inert to the tab-swipe",
   /closest\('\.lbwrap'\)/.test(fs.readFileSync(path.join(dir, "js/util.js"), "utf8")));
ok("...and vertical page scroll stays alive (touch-action:pan-y)",
   /touch-action:pan-y/.test(run(`document.querySelector('.lbsvg').getAttribute('style')`)));

/* ---- 15. v3.3.165: dual-home exercises — confirmed, forward-only -------- */
run(`(function(){
  DB.days={}; DB.settings.partOv={};
  const p1=new Date(todayISO+'T00:00'); p1.setDate(p1.getDate()-4);
  window.PD=p1.toLocaleDateString('en-CA');
  DB.days[PD]={w:[{part:'Back',ex:'Deadlift',w:80,reps:[5],at:1}],upd:1};
  SEED=deriveAll();
  lift={ex:'Deadlift',part:'Back',weight:80,editToday:false}; view='lift'; render();})()`);
ok("Deadlift offers its other home", run(`(function(){
     const b=document.getElementById('dualMove');
     return !!(b&&/Legs/.test(b.textContent));})()`));
run(`window.confirm=()=>false; document.getElementById('dualMove').click();`);
ok("declining the confirm moves NOTHING",
   run(`!DB.settings.partOv['Deadlift'] && catFor('Back').includes('Deadlift')`));
run(`window.confirm=()=>true; document.getElementById('dualMove').click();`);
ok("confirming moves the listing: under Legs, gone from Back",
   run(`catFor('Legs').includes('Deadlift') && !catFor('Back').includes('Deadlift')`));
ok("...and the view followed to Legs", run(`lift.part`) === "Legs");
run(`document.querySelector('.repgrid [data-rep]').click();`);
ok("forward logging stores the NEW part",
   run(`[...day(todayISO).w].pop().part`) === "Legs");
ok("...while history stays exactly as trained",
   run(`DB.days[PD].w[0].part`) === "Back");
ok("moving back home removes the override entirely", (() => {
  run(`document.getElementById('dualMove').click();`);   // confirm still ()=>true
  return run(`!DB.settings.partOv['Deadlift'] && catFor('Back').includes('Deadlift')`);
})());

console.log(fail ? "\n" + fail + " FAILED" : "\nALL PASS");
process.exit(fail ? 1 : 0);
