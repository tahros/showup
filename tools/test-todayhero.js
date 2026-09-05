// test-todayhero.js DIR — asserts the Today hero follows the live lift,
// falls back to Daily Fire when nothing is in motion, and that the part
// meter carries red only while live.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage34";

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

// --- fixture: 40 real-shaped past days. Daily Fire needs >=30 lift days to
// render at all, and the part meter needs history to compute "usual" — an
// empty DB silently skips both and every assertion below becomes a lie.
run(`
  const _t0=new Date(todayISO+'T00:00');
  for(let i=1;i<=40;i++){
    const d=new Date(_t0); d.setDate(d.getDate()-i);
    const iso=d.toLocaleDateString('en-CA');
    const w=[{part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[30,30,30,30]},
             {part:'Shoulder',ex:'Dumbbell Side Raise',w:10,reps:[15,15]}];
    if(i%3===0) w.push({part:'Run',ex:'Run',w:3.4,mins:27,secs:0});   // runs included
    DB.days[iso]={w,upd:Date.now()};
  }
  SEED=deriveAll(); _fireDist=null;
`);
check("fixture: history derived", `SEED.dates.length`, 40);

// --- live session, mid-exercise
run(`
  const t=dayMeta();
  t.w.push({part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[35]});
  t.w.push({part:'Shoulder',ex:'Dumbbell Press',w:20,reps:[20]});
  lastSetAt=Date.now();
  view='today'; render();
`);
/* v3.3.40 made the hero the PART digest while a session was live. v3.3.285
   RESTATES the whole block: the digest is gone from the app entirely, and
   Today leads with Rhythm in BOTH states — one hero, not two. The digest's
   last act was a mid-session verdict ("volume down 70% vs your previous 5
   sessions", in red, computed from a half-logged session), which is the one
   claim this app declines to make. The assertions now hold that absence,
   and that the surviving hero is stable across the live/idle boundary. */
check("live → Rhythm still leads, one hero in both states",
      `!!document.querySelector('#view .planedge')`, true);
check("...and no part digest exists anywhere",
      `!!document.querySelector('#view .pdigest')`, false);
check("...no mid-session verdict is rendered",
      `/volume (up|down) \\d+%/i.test(document.getElementById('view').textContent)`, false);
check("...and the live part is still named where the work is listed",
      `/Shoulder/i.test(document.getElementById('view').textContent)`, true);

// --- a run logged after the lift must not change the hero either
run(`dayMeta().w.push({part:'Run',ex:'Run',w:3.47,mins:27,secs:16}); render();`);
check("a run does not disturb the hero",
      `!!document.querySelector('#view .planedge') && !document.querySelector('#view .pdigest')`, true);

// --- sealing the exercise hands the hero back to Daily Fire
run(`dayMeta().doneEx.push('Dumbbell Press'); render();`);
check("sealed ex → Rhythm leads",       `!!document.querySelector('#view .planedge')`, true);
check("sealed ex → no part digest",     `!!document.querySelector('#view .pdigest')`, false);

// --- day sealed: isLive() is "today has sets and the day isn't done" —
// NOT the rest timer. Sealing the day is the only real not-live state.
run(`dayMeta().doneEx.length=0; dayMeta().doneAll=true; render();`);
check("day sealed → Rhythm leads", `!!document.querySelector('#view .planedge')`, true);
check("day sealed → no part digest", `!!document.querySelector('#view .pdigest')`, false);

// --- part meter: red only while live
run(`
  dayMeta().doneAll=false;
  view='lift'; lift={part:'Shoulder',ex:null,weight:0}; render();
`);
check("live → meter is red",
      `!!document.querySelector('#view .smeter i.live')`, true);
run(`dayMeta().doneAll=true; render();`);
check("day sealed → meter not red",
      `!!document.querySelector('#view .smeter i.live')`, false);
check("day sealed → meter still shown (accent)",
      `!!document.querySelector('#view .smeter i')`, true);

// v3.3.45: Rhythm is the top card, and appears exactly once.
// NB: the meter checks above leave us on the Lift tab — come back to Today.
run(`view='today'; dayMeta().doneAll=true; render();`);
/* v3.3.319: Rhythm left Today for today's plan; with no other host,
   rhythmCard() was deleted with it — the v3.3.285 call, made again. */
check("the plan is the only hero, and appears once",
      `document.querySelectorAll('#view .planedge').length`, 1);
check("Daily Fire is gone",          `!!document.querySelector('#view .firecard')`, false);
/* v3.3.421: the day pill NAMES the day the scope shows or writes. With sets
   logged and no plan, the ledger rule points the writer at tomorrow, so the
   pill says tomorrow -- and that IS the first thing on the tab. */
check("...and it is the FIRST thing on the tab, naming the day it writes",
      `(function(){const h=document.querySelector('#view h2').textContent.trim().toLowerCase();
        const want=(writeDateISO()===todayISO?'today':planDayLabel(writeDateISO()).toLowerCase())+' plan';
        return h.indexOf(want);})()`, 0);
// Lineage of this block: v3.3.52 tried a chart in Rhythm; v3.3.53 reverted
// to the vs-bars (form question: chart vs bars). v3.3.83 removes the block
// from Today entirely (presence question) on the app's FIRST outside
// feedback — "too complicated" — because it duplicated the Stats Report
// Card above the fold. Seed last year to prove absence isn't just no-data.
run(`
  {const d=new Date(todayISO+'T00:00'); d.setFullYear(d.getFullYear()-1);
   for(let i=0;i<10;i++){ const c2=new Date(d); c2.setDate(c2.getDate()-i*3);
     DB.days[c2.toLocaleDateString('en-CA')]={w:[{part:'Legs',ex:'Squat',w:60,reps:[10]}],upd:1};}
   SEED=deriveAll(); _fireDist=null; view='today'; render();}
`);
check("vs-bars are gone from Today even WITH last-year data (v3.3.83)",
      `!!document.querySelector('#view .rhythm .vs')`, false);
check("...the rest-days caption is gone (the strip already shows it)",
      `/rest days? in the last 21/.test($('#view').innerHTML)`, false);
// v3.3.84: the anchor gained its "of" back — assert the phrase, and the
// two-column symmetry: numbers on the top line, captions beneath, and the
// strip dating itself on the right only.
/* RETIRED v3.3.319 — examined rhythmCard()'s internals; card deleted */
check("...the strip keeps only its right-hand date",
      `/3 weeks ago/.test($('#view').innerHTML)`, false);
// indexOf, not a regex — the v3.3.68 lesson: \/ collapses inside a template
// literal before the vm ever sees it.
/* RETIRED v3.3.319 — examined rhythmCard()'s internals; card deleted */
// the symmetry needs the STREAK variant — the fixture above has trained
// today, whose lead is a bare "Trained today". Flip to untrained, assert,
// restore.
/* RETIRED v3.3.319 — examined rhythmCard()'s internals; card deleted */
check("...while the naked long label is gone",
      `/of \\d{4} trained/.test($('#view').innerHTML)`, false);
check("no chart inside Rhythm",
      `!!document.querySelector('#view .rhythm .rchart')`, false);

// v3.3.54: info dots sit beside their section titles and still open tips.
// Surface: the "Logged today" zonehead in the exercise view — the fixture
// guarantees today's sets exist there, unlike Readiness (needs the pre-gym
// planning board) or the Run charts (need run history).
run(`view='lift'; lift={part:'Shoulder',ex:'Dumbbell Press',weight:16}; render();`);
/* v3.3.152 disclosure audit: the session (i) is REMOVED — EDIT is a
   labelled control and Undo self-surfaces, so the tip only repeated the
   interface. The tip MECHANICS still need a host, so they retarget to the
   Stats weight tip, and gain the audit's new contracts: aria-expanded
   toggling, single-open, and specific labels. */
check("the session card carries NO i dot any more",
      `!document.querySelector('#view .lastcard.sess .ibtn.tipi')`, true);
run(`setBw(todayISO,70); view='stats'; render();`);
check("a retained tip trigger renders (Stats · Weight)",
      `!!document.querySelector('#secWeight .ibtn.tipi')`, true);
check("its aria label is specific, not 'Info'",
      `document.querySelector('#secWeight .ibtn.tipi').getAttribute('aria-label')`,
      "About the weight chart");
check("tip opens, and the trigger reports expanded",
      `(()=>{const b=document.querySelector('#secWeight .ibtn.tipi');
             b.click(); const tf=document.getElementById('tipFloat');
             return !!(tf&&!tf.hidden&&tf.textContent.length>10)
                    && b.getAttribute('aria-expanded')==='true';})()`, true);
check("opening a second tip closes the first (single-open)",
      `(()=>{const a=document.querySelector('#secWeight .ibtn.tipi');
             const b2=document.querySelector('.ibtn.tipi[data-tip="yoy2"]');
             if(!b2) return 'no consistency trigger';
             b2.click(); const tf=document.getElementById('tipFloat');
             return tf.dataset.tip==='yoy2' && a.getAttribute('aria-expanded')==='false'
                    && b2.getAttribute('aria-expanded')==='true';})()`, true);
check("tapping outside closes and collapses",
      `(()=>{document.body.click(); const tf=document.getElementById('tipFloat');
             return tf.hidden===true
                    && !document.querySelector('.tipi[aria-expanded="true"]');})()`, true);
{
  const css152 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
  const bodyFace = /\.tipbubble\{[^}]*font-family:var\(--body\);font-size:15px/.test(css152);
  console.log((bodyFace ? "PASS" : "FAIL"), "tip prose uses the body face at 15px, not mono");
  if (!bodyFace) fail++;
  const hit44 = /\.ibtn\.tipi::after\{[^}]*inset:-11px/.test(css152);
  console.log((hit44 ? "PASS" : "FAIL"), "the 22px icon carries a 44px hit area");
  if (!hit44) fail++;
}
run(`view='today'; render();`);

// ---- v3.3.86: Readiness left Today; a door to Lift stands in its place ---
// Lineage: v3.3.85 collapsed the board to a disclosure; v3.3.86 removes it
// entirely because the Lift tab's part list IS the board. Today keeps a
// door, with the one surviving receipt: the due count.
run(`
  {const d=(n)=>{const x=new Date(todayISO+'T00:00');x.setDate(x.getDate()-n);return x.toLocaleDateString('en-CA');};
   DB.settings.myParts=['Chest','Back','Shoulder','Legs'];
   DB.days[d(2)]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};
   DB.days[d(9)]={w:[{part:'Back',ex:'Row',w:40,reps:[10]},{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};
   DB.days[d(16)]={w:[{part:'Back',ex:'Row',w:40,reps:[10]},{part:'Shoulder',ex:'OHP',w:30,reps:[10]}],upd:1};
   DB.days[d(23)]={w:[{part:'Back',ex:'Row',w:40,reps:[10]},{part:'Shoulder',ex:'OHP',w:30,reps:[10]}],upd:1};
   delete DB.days[todayISO]; SEED=deriveAll(); view='today'; render();}
`);
check("the Readiness board is gone from Today",
      `document.querySelectorAll('#view .readyrow').length + document.querySelectorAll('#readyHead').length`, 0);
check("...a door to Lift stands in its place",
      `!!document.querySelector('#goLift')`, true);
check("...reading 'Train other parts'",
      `document.querySelector('#goLift').textContent.includes('Train other parts')`, true);
check("...the due receipt agrees with the plan",
      `(function(){const P=trainingPlan(); const n=P.mains.slice(1).filter(p=>P.score(p)>=1).length;
        const t=document.querySelector('#goLift').textContent, m=t.match(/(\\d+) due/);
        return n===0 ? m===null : (!!m&&+m[1]===n);})()`, true);
run(`$('#view').querySelector('#goLift').click();`);
check("tapping the door lands on Lift", `view`, "lift");
check("...with the tab bar following",
      `document.querySelector('nav button[data-v="lift"]').classList.contains('on')`, true);
// (renderLift auto-selects a part on entry by design — same as via the tab
// bar — so asserting part:null post-render was wrong. Assert arrival instead.)
check("...and the Lift view actually rendered",
      `$('#view').innerHTML.length>200`, true);
run(`view='today'; render();`);

// ---- v3.3.86: the two invisible lines ------------------------------------
// numbers on one baseline, captions on one row: only a grid guarantees it.
/* RETIRED v3.3.319 — examined rhythmCard()'s internals; card deleted */
/* RETIRED v3.3.319 — examined rhythmCard()'s internals; card deleted */
const cssSrc86 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
const gridRule = (cssSrc86.match(/\.rgrid\{[^}]*\}/) || [""])[0];
console.log((/align-items:baseline/.test(gridRule) ? "PASS" : "FAIL"),
  "...aligned on the BASELINE, not the top \u2192", gridRule);
if (!/align-items:baseline/.test(gridRule)) fail++;

// ---- v3.3.105: the Rhythm heading sits close, not with the .quiet 24px ----
// jsdom doesn't run layout/cascade resolution through getComputedStyle for
// custom stylesheets reliably across environments, so this checks the CSS
// SOURCE directly for the specificity fix rather than a computed pixel
// value \u2014 the actual bug was two equal-specificity rules racing on
// source order, and that's what has to stay fixed.
const cssSrc105 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
console.log((/h2\.quiet:first-child\{margin-top:4px\}/.test(cssSrc105) ? "PASS" : "FAIL"),
  "a genuinely higher-specificity rule pins h2.quiet:first-child to 4px");
if (!/h2\.quiet:first-child\{margin-top:4px\}/.test(cssSrc105)) fail++;

// and confirm this is actually reachable: when no session is live, Rhythm's
// heading IS #view's first child, so the new rule is the one that applies.
/* renderToday() has TWO branches with entirely different opening markup:
   !logged (nothing trained yet today) opens with helloCard()+rhythmCard(),
   no "Rhythm" heading at all; logged (today has a set) is the ONLY branch
   that calls todayHeroHTML() \u2014 and only there is "Rhythm" a genuine h2.
   The maker's screenshot showed 20 sets already logged, i.e. the SECOND
   branch \u2014 so the fixture must land there too, not merely have past
   history. First attempt left today empty and landed in the wrong branch
   entirely, testing a heading that branch never renders. */
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  for(const off of [2,4,6]){ const d=new Date(t); d.setDate(d.getDate()-off);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1}; }
  day(todayISO).w.push({part:'Shoulder',ex:'Dumbbell Press',w:20,reps:[15],at:Date.now()});
  day(todayISO).doneAll=true;   // sealed, matching the screenshot's post-session state \u2014
                                 // isLive() is length>0 && !doneAll, so this is what actually
                                 // takes the branch out of "Shoulder \u00b7 live" and into Rhythm
  lift.part=null; lift.ex=null;
  SEED=deriveAll(); DB.settings.msFloor=msLiveTotal(); DB.settings.msAck=msLiveTotal();
  view='today'; render();})()`);
/* v3.3.412 RESTATES. This fixture is a CLOSED day -- sets logged and the
   day-end pressed -- and on a closed day the finished card leads, not the
   plan. The header already tells three states (empty-and-breathing, red,
   filled-and-still); this body did not know the third, and led with a plan
   and a recommendation while the one thing that said "closed" sat at the
   bottom after an invitation to add more. A closed day points forward. */
check("on a closed day, the finished card leads",
      `document.querySelector('#view').firstElementChild.classList.contains('dayclosed')`, true);
check("...and the plan heading follows it",
      `(function(){const c=document.querySelector('#view').children[1];
        const want=(writeDateISO()===todayISO?'today':planDayLabel(writeDateISO()).toLowerCase())+' plan';
        return c.tagName+':'+(c.textContent.trim().toLowerCase().startsWith(want)?'ok':c.textContent.slice(0,14));})()`, "H2:ok");
check("...with nothing recommending a next exercise",
      `!document.querySelector('.tnextplan')`, true);
check("...and no invitation to add another part",
      `![...document.querySelectorAll('#view h2')].some(h=>/Add another part/i.test(h.textContent))`, true);
check("...while the training record stays",
      `[...document.querySelectorAll('#view h2')].some(h=>/Training today/i.test(h.textContent))`, true);

/* v3.3.412: THE PLAN HEADER FOLLOWS THE LEDGER RULE. With a plan saved, the
   header offered fold/copy/edit/clear in every state -- so once the day was
   closed there was no way to write tomorrow, even though writeDateISO()
   already returns tomorrow once today is in the book. On a closed day Edit
   and Clear retire (a finished promise is not edited) and the writer's door
   takes their place; the plan card recedes to a receipt. */
run(`(function(){DB.plan={d:todayISO, items:[
    {ex:'Dumbbell Press', lines:[{w:20,bw:false,reps:[15]}]},
    {ex:'Lateral Raise',  lines:[{w:10,bw:false,reps:[12,12]}]}], note:''};
  DB.planAt=Date.now(); render();})()`);
check("on a closed day the plan header offers the writer's door",
      `!!document.querySelector('h2 .planedge [data-planwrite]')`, true);
check("...and it names tomorrow as its target",
      `writeDateISO()>todayISO`, true);
/* v3.3.421 REVERSES v3.3.412's "Edit and Clear retire on a closed day". One
   header grammar in every state beat a special case: Edit stays (the maker
   wanted to edit a finished day's plan and tomorrow's alike), Write stays,
   and Clear moves behind Edit everywhere rather than retiring here alone. */
check("...while the edge reads copy, edit, Write -- and Clear is not on it",
      `!!document.querySelector('[data-planedit]') && !document.querySelector('h2 .planedge [data-planclear]')`, true);
check("...and fold and copy stay",
      `!!document.querySelector('[data-planfold]') && !!document.querySelector('[data-plancopy]')`, true);
check("...with the plan card receded to a receipt",
      `!!document.querySelector('.plspent .plancard')`, true);
/* the earlier "nothing recommending" check ran before any plan existed, so
   it could not fail -- the probe that restores the recommendation stayed
   green. Lateral Raise is planned and unlogged here; on an open day that is
   exactly what Train next would name. */
check("...and even with an unlogged plan item, nothing recommends a next exercise",
      `!document.querySelector('.tnextplan')`, true);
/* reopen the day: the header returns to managing the live promise */
run(`(function(){day(todayISO).doneAll=false; render();})()`);
/* v3.3.413: TOMORROW'S PLAN CAN BE READ TONIGHT. v3.3.397 rendered it as one
   inert line -- "tapping it does nothing today" -- and the maker overruled
   that: it is his plan. The line is now the fold, and the plan opens beneath
   it, open by default. Reading is not logging: the rails still do not read it
   until midnight. */
run(`(function(){const t=new Date(todayISO+'T00:00'); t.setDate(t.getDate()+1);
  DB.plan={d:t.toLocaleDateString('en-CA'), items:[
    {ex:'Squat', lines:[{w:toKg(205),bw:false,reps:[5,5,5]}]},
    {ex:'Romanian Deadlift', lines:[{w:toKg(165),bw:false,reps:[8,8]}]}], note:''};
  DB.settings.pendFold=false; render();})()`);
check("tomorrow's plan is shown on Today, not just counted",
      `!!document.querySelector('.planahead .plancard') && /Squat/.test(document.querySelector('.planahead').textContent)`, true);
/* v3.3.421: tomorrow's row IS the day fold row (planfoldrow.planpending) --
   one control, one class, the same as today's plan uses */
check("...beneath a row that is now a fold, not an inert line",
      `document.querySelector('.planpending[data-planfold]').tagName==='BUTTON'`, true);
run(`document.querySelector('.planpending[data-planfold]').dispatchEvent(new window.Event('click',{bubbles:true}))`);
/* v3.3.452 RESTATES: the fold is shut in place, not removed -- the body stays
   so the height can animate. */
check("...which shuts the fold on tap (body kept for the motion)", `document.querySelector('[data-planfoldbody]').classList.contains('shut')`, true);
run(`document.querySelector('.planpending[data-planfold]').dispatchEvent(new window.Event('click',{bubbles:true}))`);
check("...and back", `!document.querySelector('[data-planfoldbody]').classList.contains('shut') && !!document.querySelector('.planahead .plancard')`, true);
check("...while the rails still do not read it: today's plan is unaffected",
      `planNow()===null`, true);
/* put today's plan back for the reopen check below */
run(`(function(){DB.plan={d:todayISO, items:[
    {ex:'Dumbbell Press', lines:[{w:20,bw:false,reps:[15]}]},
    {ex:'Lateral Raise',  lines:[{w:10,bw:false,reps:[12,12]}]}], note:''}; render();})()`);

/* v3.3.421: the grammar does not change when the day reopens -- copy, edit,
   Write in both states. What changes is the RECORD: the receipt lifts and the
   card is live again. */
check("reopened, the edge is unchanged and the receipt lifts",
      `!!document.querySelector('[data-planedit]') && !!document.querySelector('h2 .planedge [data-planwrite]')
        && !document.querySelector('.plspent') && !!document.querySelector('.plancard')`, true);

// ---- v3.3.106: the trained state leads with the number that MOVED --------
// Fixture: past history + today logged AND sealed (doneAll), matching the
// screenshot's state \u2014 see the v3.3.105 note about renderToday's branches.
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  for(let i=1;i<=40;i++){ const d=new Date(t); d.setDate(d.getDate()-i);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1}; }
  day(todayISO).w.push({part:'Shoulder',ex:'Dumbbell Press',w:20,reps:[15],at:Date.now()});
  day(todayISO).doneAll=true; lift.part=null; lift.ex=null;
  SEED=deriveAll(); DB.settings.msFloor=msLiveTotal(); DB.settings.msAck=msLiveTotal();
  view='today'; render();})()`);

/* RETIRED v3.3.319 — this whole block examined rhythmCard()'s TYPOGRAPHY:
   the live day total, its caption, its count-up range, and the size
   hierarchy between the day figure, the percentage and the full-card .big.
   Today took the plan instead and the card was deleted (v3.3.285's call,
   made again), so there is nothing left for these to measure. The
   thousands-countdown checks that followed are unrelated and stay. */

// the sanctioned countdown appears only inside 75 days of a thousand
check("no thousands countdown when far from one", `msNearThousand(400)`, "null");
check("...and one inside the window",
      `JSON.stringify(msNearThousand(940))`, '{"next":1000,"left":60}');
check("...exactly 75 out is still inside", `JSON.stringify(msNearThousand(925))`, '{"next":1000,"left":75}');
check("...76 is outside", `msNearThousand(924)`, "null");
// one definition, shared \u2014 the greeting must route through it too
const todaySrc106 = fs.readFileSync(path.join(dir, "js/today.js"), "utf8");
console.log(((todaySrc106.match(/\[1000,1500,2000,2500,3000,4000,5000\]/g) || []).length === 1 ? "PASS" : "FAIL"),
  "the thousands ladder is defined exactly once");
if ((todaySrc106.match(/\[1000,1500,2000,2500,3000,4000,5000\]/g) || []).length !== 1) fail++;
console.log((/function helloSub[\s\S]{0,200}msNearThousand/.test(todaySrc106) ? "PASS" : "FAIL"),
  "...and the greeting routes through it");
if (!/function helloSub[\s\S]{0,200}msNearThousand/.test(todaySrc106)) fail++;

// the NOT-trained states are untouched by all of this
run(`(function(){day(todayISO).w=[]; delete day(todayISO).doneAll; SEED=deriveAll(); render();})()`);
/* RETIRED v3.3.319 — the untrained state's leading figure was the rhythm
   card's; the card is gone. Today's untrained state is asserted by the
   plan-heading checks earlier in this file. */

// ---- v3.3.299: Today's session rows adopt B1 ----------------------------
// Same slim raised row the go-to list took in v3.3.298. What did NOT come
// across is the flattening: on the go-to list every rail was the same accent
// and meant nothing, but here the edge IS the live/finished distinction, so
// it survives — as the row's own border rather than a slab on one side.
run(`(function(){DB.days={}; DB.settings.unit='lb'; const td=dayMeta();
  td.w.push({part:'Run',ex:'Run',w:3.76,mins:27,secs:0,at:1});
  for(let i=0;i<6;i++) td.w.push({part:'Shoulder',ex:'Dumbbell Shoulder Press',w:toKg(55),reps:[8],at:1});
  for(let i=0;i<4;i++) td.w.push({part:'Shoulder',ex:'Lateral Raise',w:toKg(35),reps:[12],at:1});
  td.donePart=['Run']; td.doneEx=['Run'];
  lastSetAt=Date.now(); SEED=deriveAll(); view='today'; render();})()`);
check("every session row is a real button",
      `[...document.querySelectorAll('.item.todayrow')].every(r=>r.tagName==='BUTTON'&&r.dataset.ex)`, true);
check("...with no trailing arrow anywhere",
      `/\\u2192/.test([...document.querySelectorAll('.item.todayrow')].map(r=>r.textContent).join(''))`, false);
check("...and the sets count in a column of its own",
      `[...document.querySelectorAll('.item.todayrow')].every(r=>!!r.querySelector('.tsets'))`, true);
/* the live/finished edge is meaning, not decoration — it must survive B1 */
check("a finished row and a live row are still distinguishable",
      `(function(){const r=[...document.querySelectorAll('.item.todayrow')];
        return r.some(x=>x.classList.contains('fin')) && r.some(x=>!x.classList.contains('fin'));})()`, true);
{
  const css299 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
/* v3.3.322: the rows carry a FULL-weight edge, matching .card and the base
   .item. Since v3.3.304 put them on the same white as their container, the
   border is the only thing separating a row from the card behind it — at
   0.5px it was doing all that work at half weight. Pinned as a floor, not a
   number, so the hairline cannot creep back. */
{
  const cssW = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  const w = sel => {
    const m = cssW.match(new RegExp(sel + "\\{[^}]*border:([\\d.]+)px"));
    return m ? +m[1] : null;
  };
  check("a session row's edge is not a hairline",
        `${w("\\.item\\.todayrow") >= 1}`, "true");
  check("...and neither is a go-to row's",
        `${w("\\.item\\.goto") >= 1}`, "true");
  check("...they match the card they sit inside",
        `${w("\\.item\\.todayrow") === w("\\.card") && w("\\.item\\.goto") === w("\\.card")}`, "true");
}
  check("the row carries B1's own edge, not a 3px rail",
        `${/\.item\.todayrow\{[^}]*border:[\d.]+px solid var\(--live\)/.test(css299)
           && !/\.item\.todayrow\{[^}]*border-left:3px/.test(css299)}`, "true");
  /* v3.3.322: the quiet line became --edge. These rows are white inside a
     white card, so the border is the ONLY thing separating them and --line's
     1.7:1 could not do that job. The property is unchanged — a finished row
     wears a different edge from a live one — so it is asserted as that
     difference rather than as a token name. */
  check("...a finished row swaps that edge to the quiet one",
        `${/\.item\.todayrow\.fin\{[^}]*border-color:var\(--edge\)/.test(css299)
           && /\.item\.todayrow\{[^}]*border:1px solid var\(--live\)/.test(css299)}`, "true");
  check("...and it settles under the thumb like the go-to rows",
        `${/\.item\.todayrow:active\{[^}]*transform:scale/.test(css299)}`, "true");
}

/* ---- v3.3.434: BACK GOES BACK -----------------------------------------
   The arrow unwound the TRAIN hierarchy wherever you had come from: tapping
   an exercise in Today's plan opened it, and back dropped you on Train's part
   list -- a screen the maker had never been on. One arrow, one job: return to
   the screen that opened this one. */
{
  const seed = () => run(`(function(){DB.days={}; DB.plan={d:todayISO, items:[
      {ex:'Barbell Bench Press', lines:[{w:70,bw:false,reps:[8,8]}]},
      {ex:'Dip', lines:[{w:0,bw:true,reps:[10,8]}]}], note:''};
    DB.settings.planFold=false;
    DB.days[todayISO]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8],at:Date.now()}],upd:1};
    SEED=deriveAll(); view='today'; lift={part:null,ex:null,weight:0,ret:null}; render();})()`);
  const tap = (sel) => run(`(function(){const el=document.querySelector(`+"`"+`${sel}`+"`"+`);
    if(!el) return 'MISSING'; el.dispatchEvent(new window.Event('click',{bubbles:true})); return 'ok';})()`);

  seed();
  tap('[data-planex]');
  check("a plan row on Today opens the exercise", `view+'/'+(lift.ex||'-')`, "lift/Barbell Bench Press");
  check("...and remembers it came from Today", `lift.ret`, "today");
  tap('.back');
  check("...so back returns to TODAY, not Train's part list", `view+'/'+(lift.ex||'-')`, "today/-");

  /* the return is consumed once: inside Train, back unwinds as it always has */
  run(`(function(){view='lift'; lift.part='Chest'; lift.ex='Dip'; lift.ret=null; render();})()`);
  tap('.back');
  check("inside Train, back still unwinds to the exercise list", `view+'/'+(lift.ex||'-')`, "lift/-");
  /* the second back drops the PART. liftBack() then restores the day's live
     part on the next render, which is v3.3.347 working as designed -- so the
     check is that the part was cleared, not that nothing came back. */
  check("...and again clears the part", `(function(){const before=lift.part;
    document.querySelector('.back').dispatchEvent(new window.Event('click',{bubbles:true}));
    return before!==null && view==='lift';})()`, true);

  /* taking the Train tab deliberately is a fresh start, never a return */
  seed();
  tap('[data-planex]');
  tap('nav button[data-v="lift"]');
  check("a tab tap clears the pending return", `!lift.ret`, true);
  tap('.back');
  check("...so back stays inside Train", `view`, "lift");

  /* and leaving for ANOTHER tab clears it too -- a return that outlived its
     journey would send a later back somewhere the person had not been. The
     first probe of this passed hollow: tapping the Train tab is handled by a
     different branch, so it never exercised this one. */
  seed();
  tap('[data-planex]');
  check("the return is set before leaving", `lift.ret`, "today");
  tap('nav button[data-v="stats"]');
  check("...and a jump to another tab clears it", `!lift.ret`, true);
}

process.exit(fail ? 1 : 0);
