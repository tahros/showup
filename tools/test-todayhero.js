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
// v3.3.40: the hero is the PART digest, not the exercise chart — the
// exercise chart already lives at the bottom of the exercise view.
check("live → hero is the part digest", `!!document.querySelector('#view .pdigest')`, true);
check("live → Rhythm stands down",     `!!document.querySelector('#view .rhythm')`, false);
check("hero names the live part",
      `[...document.querySelectorAll('#view h2')].some(x=>/Shoulder . live/i.test(x.textContent))`, true);
check("newest bar is red while live",
      `document.querySelector('#view .pdigest rect.lbNow').getAttribute('fill')`, "var(--live)");

// --- a run logged after the lift must not hijack the hero
run(`dayMeta().w.push({part:'Run',ex:'Run',w:3.47,mins:27,secs:16}); render();`);
check("Run doesn't steal the hero",
      `[...document.querySelectorAll('#view h2')].some(x=>/Shoulder . live/i.test(x.textContent))`, true);

// --- sealing the exercise hands the hero back to Daily Fire
run(`dayMeta().doneEx.push('Dumbbell Press'); render();`);
check("sealed ex → Rhythm leads",       `!!document.querySelector('#view .rhythm')`, true);
check("sealed ex → no part digest",     `!!document.querySelector('#view .pdigest')`, false);

// --- day sealed: isLive() is "today has sets and the day isn't done" —
// NOT the rest timer. Sealing the day is the only real not-live state.
run(`dayMeta().doneEx.length=0; dayMeta().doneAll=true; render();`);
check("day sealed → Rhythm leads", `!!document.querySelector('#view .rhythm')`, true);
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
check("Rhythm appears exactly once", `document.querySelectorAll('#view .rhythm').length`, 1);
check("Daily Fire is gone",          `!!document.querySelector('#view .firecard')`, false);
check("Rhythm is the FIRST card",
      `document.querySelector('#view h2').textContent.trim().toLowerCase()`, "rhythm");
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
check("...and the % anchor reads 'of <year>'",
      `!!(document.querySelector('#view .rhythm')&&document.querySelector('#view .rhythm').innerHTML.includes('of '+todayISO.slice(0,4)))`, true);
check("...the strip keeps only its right-hand date",
      `/3 weeks ago/.test($('#view').innerHTML)`, false);
// indexOf, not a regex — the v3.3.68 lesson: \/ collapses inside a template
// literal before the vm ever sees it.
check("......while 'today' stays", `(function(){const m=document.querySelector('#view .rhythm');
      return !!m&&m.innerHTML.indexOf('today</div>')>-1;})()`, true);
// the symmetry needs the STREAK variant — the fixture above has trained
// today, whose lead is a bare "Trained today". Flip to untrained, assert,
// restore.
check("...and the streak caption sits UNDER the number, not beside it",
      `(function(){const kept=DB.days[todayISO]; delete DB.days[todayISO];
        SEED=deriveAll(); render();
        const m=document.querySelector('#view .rhythm .big');
        const ok=!!(m&&m.nextElementSibling&&m.nextElementSibling.tagName==='DIV');
        DB.days[todayISO]=kept; SEED=deriveAll(); render();
        return ok;})()`, true);
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
run(`view='stats'; render();`);
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
check("the rhythm head is a 2x2 grid",
      `!!document.querySelector('#view .rhythm .rgrid')`, true);
check("...number, number, caption, caption \u2014 in that order",
      `(function(){const g=document.querySelector('#view .rhythm .rgrid');
        if(!g) return 'nogrid';
        const k=[...g.children].map(el=>el.classList.contains('rcap')?'cap':'num');
        return k.join(',');})()`, "num,num,cap,cap");
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
check("with no live session, the Rhythm heading is #view's first child",
      `document.querySelector('#view').firstElementChild.textContent`, "Rhythm");
check("...and it carries the quiet class this fix targets",
      `document.querySelector('#view').firstElementChild.classList.contains('quiet')`, true);

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

check("the trained card leads with the live day total, not a label",
      `document.querySelector('.rhythm .big.dayn').textContent`, "41");
check("...the old 'Trained today' label is gone",
      `document.querySelector('#view').innerHTML.includes('Trained today')`, false);
check("...and its caption is no longer empty",
      `document.querySelector('.rhythm .rcap').textContent.trim().length > 0`, true);
check("...the caption names what the number counts",
      `document.querySelector('.rhythm .rcap').textContent.includes('days in')`, true);
// the number the count-up will animate FROM is yesterday's total, not zero
check("the day figure carries a one-step count-up range",
      `(function(){const e=document.querySelector('.rhythm .big.dayn');
        return (+e.dataset.to - +e.dataset.from)===1;})()`, true);
// v3.3.107: pin the HIERARCHY, not a magic number \u2014 the day figure must
// outrank the secondary percentage and stay under the 38px .big used by the
// gap variant, which owns the card alone when it appears.
const cssSrc107 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
const px = (sel) => {
  const m = cssSrc107.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\{[^}]*font-size:(\\d+)px"));
  return m ? +m[1] : null;
};
const dayPx = px(".rhythm .big.dayn"), bigPx = px(".rhythm .big"), pctPx = px(".rgrid .rpct");
console.log((dayPx > pctPx && dayPx < bigPx ? "PASS" : "FAIL"),
  "the day figure outranks the percentage and sits under the full-card .big",
  `\u2192 ${pctPx} < ${dayPx} < ${bigPx}`);
if (!(dayPx > pctPx && dayPx < bigPx)) fail++;

// the year % survives as the secondary stat \u2014 this replaced the LABEL, not it
check("the year percentage is still there as the secondary figure",
      `/of \\d{4}/.test(document.querySelector('.rhythm').textContent)`, true);

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
check("an untrained day still leads with the streak, not the day count",
      `!!document.querySelector('.rhythm .big.dayn')`, false);

process.exit(fail ? 1 : 0);
