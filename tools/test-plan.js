// test-plan.js DIR — v3.3.278. Today's plan: a pasted session read into the
// rails the app already has. Two halves: the parser (a pure function, so
// asserted on values) and the promise (today-only, never logged, never
// scored — asserted on effects, through real clicks).
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only" });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){
  return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})}); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const ok = (name, cond, note) => {
  console.log((cond ? "PASS" : "FAIL"), name, note ? "→ " + note : "");
  if (!cond) fail++;
};

// the maker's own paste, verbatim in shape: warm-up line, working line, a
// coach note after an arrow, an exercise not in the catalog, a timed hold.
const PASTE = [
  "Dumbbell Shoulder Press               6 sets",
  "  35 lb    10    8            \u2190 warm-up",
  "  55 lb     8    8    8    8   \u2190 6s acceptable",
  "",
  "Lateral Raise                          4 sets",
  "  35 lb    12   12   10   10",
  "",
  "Rear Delt Fly                          4 sets",
  "  25 lb    12   12   10   10",
  "",
  "Hanging Leg Raise                      3 sets",
  "  BW       10    8    8",
  "",
  "Plank                                  2 sets",
  "  60 sec each"
].join("\n");

run(`(function(){DB.days={}; DB.settings.unit='lb'; const t=new Date(todayISO+'T00:00');
  const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
  for(const n of [10,4]) DB.days[D(n)]={w:[{part:'Shoulder',ex:'Lateral Raise',w:13,reps:[12,12,10]}],upd:1};
  SEED=deriveAll(); DB.plan=null; DB.suggest=null;
  view='lift'; lift.ex=null; lift.part='Shoulder'; lift.plan=null; render();})()`);

// ---- 1. the parser reads what it can, and only what it can ----------------
run(`window.__rows=parsePlan(${JSON.stringify(PASTE)});`);
/* v3.3.280 RESTATES: the first version kept only the last weight line, so a
   paste headed "6 sets" produced a plan of 4 and the two warm-up sets were
   read and then discarded. Silently dropping input the parser UNDERSTOOD is
   worse than failing to parse it. Every line is kept, in written order. */
ok("every weight line is kept, warm-up first",
   run(`(function(){const r=__rows.find(x=>x.ex==='Dumbbell Shoulder Press');
     return r.lines.length===2 && r.lines[0].w===35 && r.lines[0].reps.join()==='10,8'
       && r.lines[1].w===55 && r.lines[1].reps.join()==='8,8,8,8';})()`) === true);
ok("...and the plan's set count matches what the paste claimed (6 sets)",
   run(`(function(){const {items}=planItemsFrom(__rows);
     const i=items.find(x=>x.ex==='Dumbbell Shoulder Press');
     return planSets(i).length===6;})()`) === true);
ok("a coach note after an arrow is not read as data",
   run(`(function(){const r=__rows.find(x=>x.ex==='Dumbbell Shoulder Press');
     return r.lines.every(l=>l.reps.every(n=>n>0&&n<100));})()`) === true);
ok("BW is a weight of zero, not a missing line",
   run(`(function(){const r=__rows.find(x=>x.ex==='Hanging Leg Raise');
     const l=r.lines[0]; return l.bw===true && l.w===0 && l.reps.join()==='10,8,8';})()`) === true);
ok("a name not in the catalog is NOT guessed — it offers candidates",
   run(`(function(){const r=__rows.find(x=>x.name==='Rear Delt Fly');
     return r.ex===null && r.cands.length>0 && r.cands.includes('Rear Deltoids');})()`) === true,
   run(`JSON.stringify(__rows.find(x=>x.name==='Rear Delt Fly').cands)`));
ok("a heading with no readable sets survives as a note, not dropped",
   run(`__rows.some(r=>r.kind==='exnote'&&/Plank/.test(r.raw))`) &&
   run(`/Plank/.test(planItemsFrom(__rows).note)`));
ok("'5x5' means five sets of five",
   run(`(function(){const r=parsePlan('Squat\\n  100 kg 5x5');
     return r[0].lines[0].reps.join()==='5,5,5,5,5';})()`) === true);
ok("a bare number is not a set line",
   run(`planReadSets('  42  ')`) === null);
/* v3.3.311: a trailing per-limb qualifier is prose. "45 lb 10 10 10 per arm"
   failed the whole line, and the damage COMPOUNDED — with no set line the
   heading above became a note, and the orphaned set line was then read as a
   heading of its own and became a second note. One phrase turned one
   exercise into two pieces of text. */
ok("a per-limb qualifier does not defeat a set line",
   run(`(function(){const forms=['45 lb 10 10 10 per arm','45 lb 10 10 10 each side',
     '45 lb 10 10 10 / per leg','45 lb 10 10 10 ea. hand','45 lb 10 10 10 each'];
     return forms.every(f=>{const r=planReadSets(f);
       return r && r.w===45 && r.reps.join()==='10,10,10';});})()`) === true);
ok("...and it survives on a bodyweight line too",
   run(`(function(){const r=planReadSets('BW 12, 10, 8 each arm');
     return r && r.bw===true && r.reps.join()==='12,10,8';})()`) === true);
/* the looser rule must not swallow a real exercise NAME or a timed hold:
   "Plank" / "60 sec each" has no weight to read and must stay a note */
ok("...without turning names or timed holds into sets",
   run(`['Plank','60 sec each','Leg Press','Single-Arm Dumbbell Row 3 sets']
     .every(l=>planReadSets(l)===null)`));
ok("...so the exercise stays ONE exercise, not two notes",
   run(`(function(){const rows=parsePlan('Single-Arm Dumbbell Row  3 sets\\n  45 lb  10 10 10 per arm  \\u2190 easy');
     const ex=rows.filter(r=>r.kind==='ex');
     return rows.length===1 && ex.length===1 && ex[0].ex==='Single-Arm Dumbbell Row'
       && ex[0].lines.length===1;})()`) === true);

// ---- 2. the flow, through the real buttons --------------------------------
run(`document.querySelector('[data-planpaste]').click()`);
ok("paste screen opens with a textarea", run(`!!document.getElementById('planText')`));
run(`document.getElementById('planText').value=${JSON.stringify(PASTE)};
     document.querySelector('[data-planread]').click();`);
ok("the preview shows every line, resolved or not",
   run(`document.querySelectorAll('.planpv').length`) >= 5,
   run(`document.querySelectorAll('.planpv').length`) + " rows");
ok("...and nothing is saved just by previewing", run(`!planNow()`));
ok("the ambiguous row asks rather than deciding",
   run(`document.querySelectorAll('.planpv.ask').length`) === 1 &&
   run(`document.querySelectorAll('[data-planpick]').length`) > 0);
run(`(function(){[...document.querySelectorAll('[data-planpick]')]
  .find(x=>x.dataset.planex2==='Rear Deltoids').click();})()`);
ok("choosing a candidate resolves that row",
   run(`document.querySelectorAll('.planpv.ask').length`) === 0);
// ---- v3.3.279: action rows are uniform ------------------------------------
// jsdom cannot cascade :root stylesheets, so computed width/white-space here
// would assert nothing (the recurring "effects not artifacts" trap has a
// twin: don't assert CSS jsdom can't resolve). What IS checkable is the
// structure the CSS acts on — the app's .btn grammar plus an explicit
// .wide span — so that is what is pinned, alongside label length, which is
// the thing that actually wrapped.
ok("the primary action spans the row; the secondaries share one",
   run(`(function(){const b=[...document.querySelectorAll('.planacts .btn')];
     return b.length===3 && b[0].classList.contains('wide')
       && !b[1].classList.contains('wide') && !b[2].classList.contains('wide');})()`) === true);
ok("...and no action label is long enough to wrap a half-width cell",
   run(`[...document.querySelectorAll('.planacts .btn')].every(b=>b.textContent.trim().length<=16)`),
   run(`JSON.stringify([...document.querySelectorAll('.planacts .btn')].map(b=>b.textContent.trim().length))`));
ok("every plan button uses the app's own .btn grammar, not a bespoke one",
   run(`[...document.querySelectorAll('.planacts button')].every(b=>b.classList.contains('btn'))`));

run(`document.querySelector('[data-planaccept]').click()`);
ok("accepting writes a plan for TODAY",
   run(`(function(){const p=planNow(); return !!p && p.d===todayISO && p.items.length===4;})()`) === true,
   run(`(planNow()||{items:[]}).items.length`) + " items");
ok("...weights are stored in kg like every other weight",
   run(`(function(){const i=planFor('Dumbbell Shoulder Press');
     return Math.abs(toU(i.lines[1].w)-55)<0.01 && Math.abs(toU(i.lines[0].w)-35)<0.01;})()`) === true);
/* v3.3.292: the names share one left edge. jsdom cannot compute layout, so
   what is asserted is the rule that produces it — the name takes the free
   space and the numbers are pushed right — rather than measured pixels. */
ok("the name column takes the free space, so every row starts at the same x",
   (function(){const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
     return /\.planrow \.pn\{[^}]*flex:1/.test(css) && /\.planrow \.pn\{[^}]*text-align:left/.test(css);})());
ok("...the numbers are pushed right rather than space-between deciding",
   (function(){const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
     return /\.planrow \.pl\{[^}]*margin-left:auto/.test(css)
         && !/\.planrow\{[^}]*justify-content:space-between/.test(css);})());
/* v3.3.312: the tick moved from the head of the row to its tail. Leading it
   reserved a column on EVERY row, so every name began indented whether or
   not there was a tick to show. The property — three parts, same order on
   every row — is unchanged; the order itself is not. */
ok("...and every row carries the same three parts in the same order",
   run(`[...document.querySelectorAll('.planrow')].every(r=>{
     const k=[...r.children].map(c=>c.className);
     return k[0]==='pn' && k[1]==='pl' && k[2]==='pk';})`));
ok("...with the name flush to the card edge, nothing before it",
   run(`[...document.querySelectorAll('.planrow')].every(r=>
     r.firstElementChild.classList.contains('pn'))`));
ok("...and the tick last, so it cannot indent an unticked row",
   run(`[...document.querySelectorAll('.planrow')].every(r=>
     r.lastElementChild.classList.contains('pk'))`));

ok("...and the card shows a row per weight, not just the top one",
   run(`(function(){const r=[...document.querySelectorAll('.planrow')]
     .find(x=>/Dumbbell Shoulder Press/.test(x.textContent));
     return r ? r.querySelectorAll('.pw').length===2 : false;})()`) === true);
/* v3.3.295: each weight line is THREE cells — weight, ×, reps — so the ×
   forms a real column instead of living inside a string. That is what lets
   the weights right-align to each other within a row and between rows. */
ok("...each weight line is three aligned cells, not one string",
   run(`[...document.querySelectorAll('.planrow')].every(r=>
     r.querySelectorAll('.pl > span').length === r.querySelectorAll('.pw').length*3)`));
ok("...in weight / × / reps order every time",
   run(`[...document.querySelectorAll('.planrow')].every(r=>{
     const c=[...r.querySelectorAll('.pl > span')].map(x=>x.className.split(' ')[0]);
     for(let i=0;i<c.length;i+=3) if(c[i]!=='pv'||c[i+1]!=='px'||c[i+2]!=='pr') return false;
     return c.length>0;})`));
ok("...and the × is decorative, never read aloud twice",
   run(`[...document.querySelectorAll('.planrow .px')].every(x=>x.getAttribute('aria-hidden')==='true')`));
/* the ink tiers are what make the weight findable mid-set: chalk, faint, muted */
ok("the three ink tiers are the app's own, not new colours",
   (function(){const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
     return /\.planrow \.pw\{[^}]*color:var\(--chalk\)/.test(css)
         && /\.planrow \.px\{[^}]*color:var\(--faint\)/.test(css)
         && /\.planrow \.pr\{[^}]*color:var\(--muted\)/.test(css);})());
ok("...and the name centres against the stack rather than pinning to line one",
   (function(){const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
     return /\.planrow\{[^}]*align-items:center/.test(css);})());
ok("...and the unreadable lines are kept verbatim",
   run(`/Plank/.test(planNow().note)`));

// ---- 3. the three promises ------------------------------------------------
ok("PROMISE 1 — nothing was written to the ledger",
   run(`JSON.stringify((DB.days[todayISO]||{w:[]}).w)`) === "[]");
ok("...and the day is still untrained as far as the record is concerned",
   run(`SEED.dates.includes(todayISO)`) === false);
ok("PROMISE 2 — the plan feeds the SUGGESTED rail, naming its origin",
   run(`(sugOv()['Lateral Raise']||{}).from`) === "plan");
ok("...with every set from every weight line, warm-ups included",
   run(`(sugOv()['Dumbbell Shoulder Press']||{sets:[]}).sets.length`) === 6);
run(`(function(){lift.ex='Lateral Raise'; lift.part='Shoulder'; lift.weight=0; render();})()`);
ok("...so the exercise page says the chips came from the plan",
   run(`/plan/i.test([...document.querySelectorAll('.zone.mini .lasthead span')][0].textContent)`));
ok("...and the chips carry the plan's numbers",
   run(`/35/.test(document.querySelector('.lastsets').textContent)`));
// ---- v3.3.282: management actions ride the heading's right edge ----------
// Edit and Clear left the card body — a full-width pair under the last
// exercise read as another row of the session. The (i) did NOT move: its
// place beside the title is v3.3.115's deliberate call.
// the block above navigated into an exercise page; come back to the tab
// where the plan card lives before asserting anything about it
run(`(function(){view='lift'; lift.ex=null; lift.plan=null; render();})()`);
/* v3.3.294: the group gained a fold chevron, so it holds three controls —
   the property being defended is that they live in the HEADING, not that
   there are exactly two of them. */
/* v3.3.297: the empty state is the SAME heading as the filled one, with
   PASTE where the controls will be. A 51px full-width slab made the section
   change shape depending on whether a plan existed, so the page jumped and
   an empty section shouted louder than a full one. */
run(`(function(){const keep=DB.plan; DB.plan=null; view='lift'; lift.ex=null; lift.plan=null; render();
  window.__emptyH=[...document.querySelectorAll('#view h2')][0].outerHTML;
  window.__slab=!!document.querySelector('.planpaste');
  DB.plan=keep; render();})()`);
ok("with no plan, the section is a heading — not a full-width slab",
   run(`__slab`) === false && run(`/scopepill/.test(__emptyH) && /data-planpaste/.test(__emptyH)`));
ok("...offering Paste exactly where the real controls sit",
   run(`/planedge/.test(__emptyH)`));
ok("...and naming the section without claiming it holds anything",
   run(`/scopepill off/.test(__emptyH)`));
ok("both states are one heading line, so the page cannot jump",
   run(`(function(){const filled=[...document.querySelectorAll('#view h2')][0];
     return filled.querySelector('.scopepill') && filled.querySelector('.planedge')
       && /scopepill/.test(__emptyH) && /planedge/.test(__emptyH);})()`));

ok("the plan's controls live in the heading, not the card body",
   run(`document.querySelectorAll('h2 .planedge .pedge').length`) === 3 &&
   run(`!document.querySelector('.plancard .planacts')`));
ok("...with the fold leading and the destructive Clear at the far edge",
   run(`(function(){const b=[...document.querySelectorAll('h2 .planedge .pedge')];
     return b[0].hasAttribute('data-planfold') && b[b.length-1].hasAttribute('data-planclear');})()`));
ok("...in the corner, after the tip, which keeps its place by the title",
   run(`(function(){const k=[...document.querySelector('h2').children].map(c=>c.className.split(' ')[0]);
     return k.indexOf('hacts')>=0 && k.indexOf('planedge')===k.length-1
       && k.indexOf('hacts')<k.indexOf('planedge');})()`) === true);
ok("...and Clear still clears from there",
   (function(){
     run(`document.querySelector('.planedge [data-planclear]').click()`);
     return run(`!planNow()`) && run(`!!document.querySelector('[data-planpaste]')`);
   })());
// put a plan back for the blocks below
run(`(function(){document.querySelector('[data-planpaste]').click();
  document.getElementById('planText').value=${JSON.stringify(PASTE)};
  document.querySelector('[data-planread]').click();
  [...document.querySelectorAll('[data-planpick]')].find(x=>x.dataset.planex2==='Rear Deltoids').click();
  document.querySelector('[data-planaccept]').click();})()`);

// ---- v3.3.281: the tick is a fact from the ledger ------------------------
// Logging an exercise ticks its plan row. The direction matters: the row
// reads the RECORD and reports it. Nothing aggregates those ticks.
run(`(function(){view='lift'; lift.ex=null; lift.plan=null; render();})()`);
ok("before logging, no plan row is ticked",
   run(`document.querySelectorAll('.planrow.pdone').length`) === 0);
run(`(function(){const t=day(todayISO);
  t.w.push({part:'Shoulder',ex:'Dumbbell Shoulder Press',w:toKg(55),reps:[8],at:Date.now()});
  t.upd=Date.now(); SEED=deriveAll(); view='lift'; lift.ex=null; render();})()`);
ok("logging an exercise ticks exactly its own plan row",
   run(`document.querySelectorAll('.planrow.pdone').length`) === 1 &&
   run(`/Dumbbell Shoulder Press/.test(document.querySelector('.planrow.pdone').textContent)`));
ok("...and the tick is drawn, not merely a class",
   run(`document.querySelector('.planrow.pdone .pk').textContent.trim()`) === "\u2713");
ok("...while every other row stays untouched",
   run(`[...document.querySelectorAll('.planrow:not(.pdone) .pk')].every(k=>!k.textContent.trim())`));
ok("...and the tick reads the LEDGER, not the plan",
   run(`planLoggedToday('Dumbbell Shoulder Press') && !planLoggedToday('Lateral Raise')`));
ok("...with still no tally of ticked rows on screen",
   run(`!/\\d+\\s*(of|\\/)\\s*\\d+|\\d+%/.test(document.querySelector('.plancard').textContent)`),
   JSON.stringify(run(`document.querySelector('.plancard').textContent.replace(/\\s+/g,' ').slice(0,70)`)));

ok("PROMISE 3 — no count of what is done or left, anywhere on screen",
   run(`!/adheren|remaining|\\d+\\s*(of|\\/)\\s*\\d+\\s*(done|complete)/i.test(document.getElementById('view').textContent)`));

// ---- 4. it evaporates ------------------------------------------------------
run(`(function(){DB.plan.d='2020-01-01'; view='lift'; lift.ex=null; lift.plan=null; render();})()`);
ok("a plan from another day is not today's plan", run(`!planNow()`));
ok("...and the tab offers to take a new one",
   run(`!!document.querySelector('[data-planpaste]')`));
/* a plan written by v3.3.278/279 (one weight per item, no `lines`) is still
   in storage after an upgrade — it must render, not crash */
run(`(function(){DB.plan={d:todayISO,items:[{ex:'Squat',w:60,reps:[5,5]}],note:''};
  view='lift'; lift.ex=null; lift.plan=null; render();})()`);
ok("a plan saved by the previous build still renders after upgrade",
   run(`document.querySelectorAll('.planrow').length`) === 1 &&
   run(`/Squat/.test(document.querySelector('.planrow').textContent)`));
ok("...its single weight is read as one line",
   run(`planNow().items[0].lines.length`) === 1);
run(`(function(){sugOv()['Squat']={sets:[{w:60,r:5}],d:todayISO,from:'plan'};
  view='lift'; lift.ex=null; render(); planClear();})()`);
ok("clearing a plan also withdraws the suggestions it planted",
   run(`!planNow() && !sugOv()['Squat']`));

// ---- v3.3.294: the whole plan folds -------------------------------------
// Same shape as the Last-time fold: driven through the real chevron, the
// heading survives as the one-line fact, and the choice is a SETTING so it
// outlives a re-render.
/* the block above CLEARS the plan, so there is nothing to fold — give this
   one its own plan rather than inheriting whatever the last block left. */
run(`(function(){planSave([{ex:'Dumbbell Shoulder Press',lines:[{w:toKg(55),bw:false,reps:[8,8]}]},
                           {ex:'Lateral Raise',lines:[{w:toKg(35),bw:false,reps:[12,12]}]}],'','');
  DB.settings.planFold=false; view='lift'; lift.ex=null; lift.plan=null; render();})()`);
ok("open by default, chevron says so",
   run(`(function(){const b=document.querySelector('[data-planfold]');
     return !!b && b.getAttribute('aria-expanded')==='true' && b.textContent==='\u25be';})()`));
const rowsOpen = run(`document.querySelectorAll('.planrow').length`);
ok("...with the plan's rows on screen", rowsOpen > 0, rowsOpen + " rows");
run(`document.querySelector('[data-planfold]').click()`);
ok("one tap folds the card away entirely",
   run(`document.querySelectorAll('.planrow').length`) === 0 &&
   run(`!document.querySelector('.plancard')`));
ok("...but the heading stays as the one-line fact",
   run(`!!document.querySelector('h2 .scopepill')`) &&
   run(`document.querySelectorAll('h2 .planedge .pedge').length`) === 3);
ok("...and the chevron flips", run(`(function(){const b=document.querySelector('[data-planfold]');
     return b.getAttribute('aria-expanded')==='false' && b.textContent==='\u25b8';})()`));
ok("the choice is a setting, not a render whim", run(`DB.settings.planFold===true`));
run(`render()`);
ok("...so it survives a full re-render", run(`!document.querySelector('.plancard')`));
run(`document.querySelector('[data-planfold]').click()`);
ok("one tap brings the whole plan back",
   run(`document.querySelectorAll('.planrow').length`) === rowsOpen &&
   run(`DB.settings.planFold===false`));
/* folding must not touch the plan itself — it is a view preference */
ok("folding changed nothing about the plan or the ledger",
   run(`!!planNow() && planNow().items.length>0`) &&
   run(`JSON.stringify((DB.days[todayISO]||{w:[]}).w.filter(s=>s.ex==='Squat'))`) === "[]");

process.exit(fail ? 1 : 0);
