// test-resttimer.js DIR — v3.3.149: the wider rule.
//
// "Time since my last set" used to die the moment you tapped ✓ Complete —
// finish a part, prep the next exercise, and the clock was dark exactly when
// you wanted to read it. It now survives completion; only the 30-minute
// guard ends it.
//
// TWO gates had to move, and the second is the one worth locking down:
// tickRest() refused to write text unless isLive(), AND the CSS only
// displayed the span under header.live. Loosening one would have written
// text into a display:none element and looked fixed in a DOM test while
// staying invisible on the phone.
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
  console.log((cond ? "PASS" : "FAIL"), name, extra === undefined ? "" : "\u2192 " + extra);
  if (!cond) fail++;
};

/* v3.3.426: the clock has its own node. The timer also carries context for
   the landscape view (hidden in portrait), and textContent concatenates
   descendants -- so the clock is asked for by name rather than by reading the
   whole element, which briefly reported "1:30PULL UP BW+70kg". */
const shown = () => run(`(function(){const t=document.querySelector('#hTimer .rt-time');
  return t?t.textContent:document.getElementById('hTimer').textContent;})()`);
const isOn  = () => run(`document.getElementById('hTimer').classList.contains('on')`);
const isDone= () => run(`document.getElementById('hTimer').classList.contains('done')`);

/* a set logged 90 seconds ago */
const seed = (agoSec, doneAll) => run(`(function(){
  DB.days={};
  DB.days[todayISO]={w:[{part:'Back',ex:'Pull Up',w:70,reps:[10],at:Date.now()-${agoSec}*1000}],
                     upd:Date.now(), doneEx:[], donePart:[], doneAll:${!!doneAll}};
  SEED=deriveAll(); reanchorRest(); renderHeader(); tickRest();})()`);

// ---- 1. mid-workout, unchanged ------------------------------------------
seed(90, false);
ok("mid-workout the timer runs", isOn(), shown());
ok("...reading minutes:seconds since the last set", /^\d+:\d{2}$/.test(shown()), shown());
ok("...and reports 1:30 for 90 seconds", shown() === "1:30", shown());
ok("...marked live, not done", !isDone());

// ---- 2. THE FIX: it survives ✓ Complete ---------------------------------
seed(90, true);
ok("the workout is complete", run(`!isLive()`));
ok("...and the timer keeps counting anyway", isOn(), shown() || "(blank)");
ok("...still reading the same elapsed time", shown() === "1:30", shown());

// ---- 3. the SECOND gate: it must actually be visible ---------------------
/* the old CSS displayed the span only under header.live, so a completed
   workout left it display:none however much text was written into it */
const css = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
ok("visibility is the timer's own class, not the header's",
   /\.resttimer\.on\{[^}]*display:inline/.test(css));
ok("...and header.live no longer gates display",
   !/header\.live \.resttimer\{[^}]*display:inline/.test(css));
ok("the header is NOT live in this state", run(`!document.querySelector('header').classList.contains('live')`));
ok("...so the timer must not be white-on-white",
   /\.resttimer\{[^}]*color:var\(--muted\)/.test(css));
ok("...while staying white on the red live bar",
   /header\.live \.resttimer\{[^}]*color:#fff/.test(css));

// ---- 4. done is marked, so the dot stops claiming 'in progress' ---------
ok("a completed workout's timer is flagged done", isDone());
ok("...and the done dot does not pulse",
   /\.resttimer\.done::before\{[^}]*animation:none/.test(css));

// ---- 5. the 30-minute guard is now the ONLY thing that ends it ----------
seed(1799, true);
ok("just under 30 minutes still shows", isOn(), shown());
seed(1801, true);
ok("past 30 minutes the timer goes dark — you left", !isOn(), shown() || "(blank)");
ok("...and clears its text rather than freezing", shown() === "");
seed(1801, false);
ok("...the same guard applies mid-workout", !isOn(), shown() || "(blank)");

// ---- 6. nothing logged today: nothing to time ---------------------------
run(`(function(){DB.days={}; SEED=deriveAll(); reanchorRest(); renderHeader(); tickRest();})()`);
ok("an unwritten day shows no timer", !isOn(), shown() || "(blank)");

// ---- 7. the anchor is the LAST set, not the first -----------------------
run(`(function(){
  DB.days={};
  DB.days[todayISO]={w:[
    {part:'Back',ex:'Pull Up',w:70,reps:[10],at:Date.now()-600*1000},
    {part:'Back',ex:'Pull Up',w:70,reps:[10],at:Date.now()-45*1000}],
    upd:Date.now(), doneEx:[], donePart:[], doneAll:true};
  SEED=deriveAll(); reanchorRest(); renderHeader(); tickRest();})()`);
ok("it times from the most recent set, not the session start",
   shown() === "0:45", shown());

console.log(fail ? "\n" + fail + " FAILED" : "\nALL PASS");
/* v3.3.426: LANDSCAPE, LIVE ONLY. Turned sideways during a live session the
   header's timer stops being a chip and BECOMES the screen -- the same
   element, the same clock, so there is no second timer to drift. */
{
  const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");

  /* v3.3.427 RESTATES. v3.3.426 styled the timer full-screen WHERE IT STOOD --
     inside <header>, which has z-index:20 and so its own stacking context. A
     child of that context cannot paint above anything outside it whatever
     z-index it is given, so the clock stayed trapped in the header's box and
     the feature did not work on the device. The element is MOVED to <body>
     now, and these check the move rather than the styling. */
  ok("the big clock is styled where it lands: at body level, not in the header",
     /html\.bigtimer body > #hTimer\.on\{[^}]*position:fixed;inset:0/.test(css) &&
     !/header\.live #hTimer\.on\{[^}]*position:fixed/.test(css));
  /* v3.3.428: THE VEIL WAS THE WHOLE PROBLEM. #portraitveil covers landscape
     at z-index 999 -- correct for every other screen, since none are designed
     sideways -- and it simply sat on top of the timer. Two facts, and the
     second is a NUMBER so it cannot be argued with. */
  ok("the portrait veil stands down for a live session",
     /html\.bigtimer #portraitveil\{display:none\}/.test(css));
  ok("...and the timer outranks it even if it did not",
     (function(){
       const z=(re)=>{const m=css.match(re); return m?+m[1]:-1;};
       const veil=z(/#portraitveil\{[^}]*z-index:(\d+)/);
       const timer=z(/html\.bigtimer body > #hTimer\.on\{[^}]*z-index:(\d+)/);
       return veil>0 && timer>veil;
     })());

  ok("...in the header's own live red, not a new colour",
     /html\.bigtimer body > #hTimer\.on\{[^}]*background:var\(--live\)/.test(css));
  ok("...and shown in landscape",
     /html\.bigtimer body > #hTimer\.on \.rt-ctx[^{]*\{[^}]*display:block/.test(css));

  /* THE BEHAVIOUR, not the stylesheet. This is the test that was missing: the
     previous release asserted CSS that was correct and never fired. */
  const bigNow = () => run(`(function(){const el=document.getElementById('hTimer');
    return (el&&el.parentElement===document.body)+'|'+document.documentElement.classList.contains('bigtimer');})()`);
  run(`(function(){DB.days[todayISO]={w:[{part:'Back',ex:'Pull Up',w:0,reps:[8],at:Date.now()-30000}],upd:1};
    SEED=deriveAll(); lastSetAt=Date.now()-30000; tickRest();
    window.matchMedia=()=>({matches:true});   // landscape
    tickBig();})()`);
  ok("live + landscape moves the clock to body and marks the document",
     bigNow()==="true|true", bigNow());
  run(`(function(){window.matchMedia=()=>({matches:false}); tickBig();})()`);
  ok("...portrait puts it back in the header",
     bigNow()==="false|false", bigNow());
  run(`(function(){window.matchMedia=()=>({matches:true});
    day(todayISO).doneAll=true; SEED=deriveAll(); tickBig();})()`);
  ok("...and a finished workout keeps it there, however the phone is held",
     bigNow()==="false|false", bigNow());
  run(`(function(){day(todayISO).doneAll=false; SEED=deriveAll(); window.matchMedia=()=>({matches:false}); tickBig();})()`);

  /* the clock keeps its own node: textContent concatenates descendants, and
     without this the timer read "1:30PULL UP BW+70kg..." */
  /* seed a live set so the timer is actually running for this check */
  run(`(function(){DB.days[todayISO]={w:[{part:'Back',ex:'Pull Up',w:0,reps:[8],at:Date.now()-45000}],upd:1};
    SEED=deriveAll(); lastSetAt=Date.now()-45000; tickRest();})()`);
  ok("the clock has its own node, so every reader still gets the clock alone",
     run(`(function(){const t=document.querySelector('#hTimer .rt-time');
       return !!t && /^\\d+:\\d\\d$/.test(t.textContent);})()`),
     run(`(document.querySelector('#hTimer .rt-time')||{}).textContent`));

  /* rotation had to be unlocked for any of this to exist on Android */
  const man=JSON.parse(fs.readFileSync(path.join(dir,"manifest.webmanifest"),"utf8"));
  ok("the manifest allows rotation at all", man.orientation!=="portrait", String(man.orientation));

  /* the wake lock is held only while all three are true, or the phone stays
     awake in a pocket */
  const drv=fs.readFileSync(path.join(dir,"js/derive.js"),"utf8");
  ok("the screen is kept awake only while live, landscape and running",
     /classList\.contains\('on'\)\s*&&\s*isLive\(\)\s*&&\s*landscape/.test(drv));
  ok("...and released when the page is hidden",
     /visibilitychange/.test(drv) && /!document\.hidden/.test(drv));
}

process.exit(fail ? 1 : 0);
