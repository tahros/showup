// test-scrollpos.js DIR — every horizontally scrolling surface must open on
// the CURRENT period, not the oldest. jsdom reports zero layout, so the DOM
// assertions below check structure and the scroll call is exercised for
// throw-safety; the arithmetic is asserted directly against a fake element.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage42";

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
/* check() EVALS its expression, which is wrong for a value computed here in
   Node rather than inside the app (and, as v3.3.323 found the hard way, a
   failure report containing a CSS selector then crashes the suite instead of
   failing it). checkVal compares without eval. */
const checkVal = (name, got, want) => {
  const ok = String(got) === String(want);
  console.log((ok?"PASS":"FAIL"), name, "→", got);
  if (!ok) fail++;
};

run(`
  const _t0=new Date(todayISO+'T00:00');
  for(let i=1;i<=200;i++){
    const d=new Date(_t0); d.setDate(d.getDate()-i);
    const iso=d.toLocaleDateString('en-CA');
    if(i%2===0) DB.days[iso]={w:[{part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[30,30]}],upd:1};
  }
  SEED=deriveAll(); _fireDist=null;
  view='stats'; render();
`);

check("retired heatmap is absent", `!!document.querySelector('.heatcols')`, false);
check("render did not throw",       `!!document.querySelector('#view').innerHTML.length`, true);
/* v4.6.220: attendance is now vertical; the original invariants remain:
   today is identifiable, the entire ledger exists, and the year stays visible. */
check("the timeline identifies today", `document.querySelectorAll('.at-calendar .today').length`, 1);
check("weekday headings stay outside the scroller", `!!document.querySelector('.at-weekdays')&&!document.querySelector('.at-weekdays').closest('.at-scroll')`, true);
check("the calendar includes the complete ledger", `document.querySelectorAll('.at-cell').length===attendanceView.model().end-attendanceView.model().start+1`, true);
check("the year picker offers every recorded year", `document.querySelectorAll('.at-year option').length===attendanceView.model().years.length`, true);
check("each training date appears once in each representation", `document.querySelectorAll('.at-cell.on').length===attendanceView.model().total&&document.querySelectorAll('.at-mini.on').length===attendanceView.model().total`, true);
check("today starts selected", `document.querySelector('.at-year').value===todayISO.slice(0,4)`, true);

// History's year strip centres its selection (v3.3.39) — same family, still holding
run(`hist={y:+thisYear,m:+todayISO.slice(5,7),part:null}; view='history'; render();`);
check("year strip still centres the selection",
      `!!document.querySelector('.ychips .chip.on')`, true);

/* v3.3.356: there is no swipe handler to steal an axis. This listed the three
   scrollers that had to be excluded from it; the gesture is gone, and it went
   partly because that list had grown to fourteen and every new horizontal
   control had to remember to join it. The check now asserts the absence of
   the thing rather than the completeness of its exceptions. */
const src = fs.readFileSync(path.join(dir, "js/util.js"), "utf8");
const noSwipe = !/TABS=\['today'/.test(src);
console.log((noSwipe?"PASS":"FAIL"), "no gesture competes for a sideways scroller's axis →", noSwipe);
if (!noSwipe) fail++;

/* v3.3.344: the Train tab REMEMBERS, while a session is live.
   The maker steps to Today mid-workout to read the plan, taps back, and was
   dropped into an exercise instead of the part list he left. Cause: the live
   card on Today carries [data-go], and for an OPEN part that handler drilled
   straight to the last exercise you logged. That rule is a good guess for
   someone arriving cold -- and it was overriding a fact, which is the whole
   error. Where you actually were beats where you probably are.
   Scoped to a live session on purpose: outside one, arriving at Train is
   STARTING something, and the tab's fresh entry state is right. */
{
  const liveDay = `DB.days[todayISO]={w:[
    {part:'Chest',ex:'Incline Barbell Bench Press',w:43,reps:[10],at:1},
    {part:'Chest',ex:'Cable Fly Up',w:6.8,reps:[10],at:2}],upd:1};`;
  const where = () => run(`lift.ex ? 'ex:'+lift.ex : 'list:'+lift.part`);
  const tapNav = v => run(`document.querySelector('nav button[data-v="${v}"]')
    .dispatchEvent(new window.Event('click',{bubbles:true}))`);
  const tapGo = () => run(`(function(){const g=document.querySelector('[data-go]');
    return g ? (g.dispatchEvent(new window.Event('click',{bubbles:true})),true) : false;})()`);
  const start = (js) => run(`(function(){DB.days={}; ${liveDay} SEED=deriveAll();
    liftWhere=null; ${js} render();})()`);

  start(`view='lift'; lift={part:'Chest',ex:null,weight:0};`);
  tapNav('today'); tapNav('lift');
  checkVal("the part list you left is the part list you return to", where(), "list:Chest");

  /* v4.6.27: REVERSED AT THE MAKER'S WORD, and recorded as a reversal rather than
     an edit. v3.3.344 made the live card restore the list you left -- his words then:
     "the maker steps to Today to read the plan and taps back, and got dropped into an
     exercise instead of the list he left." Today, the opposite complaint: Continue did
     not go into the active workout. Both are true reports; they disagree because the
     button means different things at different moments. The split now: the TAB still
     restores the list you left (asserted above, unchanged) -- that is navigation.
     CONTINUE goes to the set you are between -- that is what the word promises. */
  start(`view='lift'; lift={part:'Chest',ex:null,weight:0};`);
  tapNav('today'); tapGo();
  checkVal("Continue enters the open part's last exercise, not the list", where(), "ex:Cable Fly Up");

  /* the memory is not a cage: leave from inside an exercise and you return
     to it, which is the same rule and not a special case */
  start(`view='lift'; lift={part:'Chest',ex:'Cable Fly Up',weight:0};`);
  tapNav('today'); tapNav('lift');
  checkVal("...and an exercise you left is the exercise you return to", where(), "ex:Cable Fly Up");

  /* someone arriving COLD has no memory to honour, so the old guess stands */
  start(`view='today'; lift={part:null,ex:null,weight:0};`);
  tapGo();
  checkVal("arriving cold still lands on the set you were mid-way through",
           where(), "ex:Cable Fly Up");

  /* v3.3.347 REVERSES this, on the maker's instruction and his own use.
     v3.3.344 remembered only while a session was LIVE, reasoning that
     otherwise arriving at Train means STARTING something. His day was
     already complete, he was standing in Dumbbell Lunge deciding a weight,
     stepped to Today for a second, and came back to a part list -- and not
     even the part he had been in. "Where you actually were beats where you
     probably are" was v3.3.344's own sentence, applied to half the cases.
     A session's liveness is not the question; whether you were there is.
     What replaces the live gate is a DAY STAMP, which is the real staleness
     boundary: memory is held in RAM so a cold launch starts fresh, and the
     stamp covers the one case RAM does not -- an app left open across
     midnight, where yesterday's position would survive into a day it has
     nothing to do with. */
  /* the memory is EARNED by rendering, not planted by the test. Planting it
     tests only the restore half -- and a probe reverting the RECORDER to
     live-only passed clean, because nothing here made the app record
     anything. The maker's whole sequence runs below instead. */
  run(`(function(){DB.days={}; DB.days[todayISO]={w:[
      {part:'Chest',ex:'Cable Fly Up',w:6.8,reps:[10],at:1}],upd:1,doneAll:1};
    SEED=deriveAll(); liftWhere=null;
    view='lift'; lift={part:'Legs',ex:'Dumbbell Lunge',weight:0}; render();})()`);
  checkVal("...on a day that is finished, not live", run(`isLive()`), false);
  tapNav('today');
  tapNav('lift');
  checkVal("a finished day still returns you to the screen you left",
           where(), "ex:Dumbbell Lunge");

  /* and backing out to the list updates the memory, so the list is what
     comes back -- the recorder follows the screen, not the intent */
  run(`(function(){DB.days={}; DB.days[todayISO]={w:[
      {part:'Chest',ex:'Cable Fly Up',w:6.8,reps:[10],at:1}],upd:1,doneAll:1};
    SEED=deriveAll(); liftWhere=null;
    view='lift'; lift={part:'Legs',ex:'Dumbbell Lunge',weight:0}; render();
    lift.ex=null; render();})()`);
  tapNav('today'); tapNav('lift');
  checkVal("...and backing out to the list makes the LIST what returns",
           where(), "list:Legs");

  run(`(function(){DB.days={}; DB.days[todayISO]={w:[],upd:1}; SEED=deriveAll();
    liftWhere={part:'Legs',ex:'Dumbbell Lunge',d:'2020-01-01'}; view='today';
    lift={part:null,ex:null,weight:0}; render();})()`);
  tapNav('lift');
  checkVal("...but a position from another day is not memory, it is staleness",
           where().indexOf('ex:') === 0 ? 'stale exercise' : 'fresh', "fresh");

  run(`(function(){DB.days={}; DB.days[todayISO]={w:[],upd:1}; SEED=deriveAll();
    liftWhere=null; view='today'; lift={part:null,ex:null,weight:0}; render();})()`);
  tapNav('lift');
  checkVal("...and a cold launch opens the tab fresh",
           where().indexOf('ex:') === 0 ? 'stale exercise' : 'fresh', "fresh");

  /* all three entries read ONE predicate, so they cannot drift apart on when
     a memory counts -- the v3.3.344 lesson, kept */
  checkVal("nav, swipe and the live card share one rule",
           run(`typeof liftBack`), "function");
}

/* v3.3.366: THE TAB BAR IS DERIVED FROM `view`, not maintained beside it.
   The maker tapped a plan row on Today, landed on the exercise screen -- which
   lives in Train -- and the bar still said TODAY. Cause: the 'on' class was
   set by hand at SEVEN call sites across app.js and core.js, each a copy of
   the same toggle, and any path that changed `view` without remembering to
   add an eighth left the old tab lit. The plan row was that path.
   A bar kept in sync by hand at every call site will be wrong eventually; the
   only question was which route found it first. render() runs on every view
   change by definition, so the toggle lives there once and the bar became a
   READING of the state rather than a second copy of it.
   The specific bug and the general rule are both asserted, because fixing
   this one route would have left the other six free to rot. */
{
  const lit = () => run(`(function(){const b=[...document.querySelectorAll('nav button')]
    .find(x=>x.classList.contains('on')); return b?b.dataset.v:'(none)';})()`);
  const tapPlanRow = ex => run(`(function(){const b=document.createElement('button');
    b.setAttribute('data-planex','${ex}');
    document.getElementById('view').appendChild(b);
    b.dispatchEvent(new window.Event('click',{bubbles:true}));})()`);

  run(`(function(){DB.days={}; DB.settings.unit='lb'; SEED=deriveAll();
    view='today'; render();})()`);
  checkVal("the bar starts on Today", lit(), "today");
  tapPlanRow('Barbell Bench Press');
  checkVal("...and a plan row opens the exercise", run(`String(lift.ex)`), "Barbell Bench Press");
  checkVal("...on the Train tab, with the bar following", lit(), "lift");

  /* the general rule: every view the bar can show agrees with `view` after a
     render, whatever route set it */
  for (const v of ['today','lift','stats','history']) {
    run(`view='${v}'; render();`);
    checkVal(`the bar reads ${v} when view is ${v}`, lit(), v==='history'?'stats':v);
  }
  /* and it is derived ONCE -- a second hand-written toggle is the bug coming
     back, since that is exactly how six of them accumulated */
  /* String(array).length measures the JOINED STRING, not the count -- my first
     version of this reported 47 for a single match. */
  checkVal("the toggle lives in one place",
           ((fs.readFileSync(path.join(dir,"js/app.js"),"utf8")
             + fs.readFileSync(path.join(dir,"js/core.js"),"utf8"))
            .match(/nav button'\)\.forEach\(b=>\{/g) || []).length,
           1);
}

process.exit(fail ? 1 : 0);
