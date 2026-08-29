// test-daydone.js DIR — every horizontally scrolling surface must open on
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

let fail=0;
const ok=(name,cond,note)=>{console.log((cond?"PASS":"FAIL"),name,note!==undefined?"→ "+note:"");if(!cond)fail++;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
/* v3.3.369: the day-done ceremony. The moment is the maker's own tap flipping
   the last part done; the ceremony is A from his three options: surface,
   square, one ring, the count. These assert the moment's CONTRACT, since
   jsdom renders no motion: it appears exactly once a day, says the right
   number in the hero's own words, never mentions the plan, leaves on a tap,
   and holds still under reduced motion. */

run(`(function(){DB.days={}; DB.settings.unit='lb'; delete DB.settings.dayDone;
  const t=new Date(todayISO+'T00:00');
  const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
  DB.days[D(2)]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8]}],upd:1};
  DB.days[D(1)]={w:[{part:'Back',ex:'Pull Up',w:0,reps:[8]}],upd:1};
  DB.days[todayISO]={w:[{part:'Chest',ex:'Dip',w:0,reps:[10]}],upd:1,doneEx:[],donePart:[]};
  SEED=deriveAll(); view='lift'; lift.part='Chest'; render();})()`);

const tapDoneAll=()=>run(`(function(){const b=document.createElement('button');
  b.id='doneAllBtn'; document.getElementById('view').appendChild(b);
  b.dispatchEvent(new window.Event('click',{bubbles:true})); b.remove();})()`);

tapDoneAll();
ok("completing the day places the ceremony", run(`!!document.getElementById('dayDone')`), run(`!!document.getElementById('dayDone')`));
ok("...whose count is the hero stat, today included",
   run(`(document.querySelector('#dayDone .ddn')||{}).textContent`)==="3",
   run(`(document.querySelector('#dayDone .ddn')||{}).textContent`));
ok("...spoken in the hero's own words",
   run(`/days in/.test((document.getElementById('dayDone')||{}).textContent||'')`));
ok("...with no plan vocabulary and no score shape",
   run(`(function(){const t=(document.getElementById('dayDone')||{}).textContent||'';
     return !/plan/i.test(t) && !/\\d+\\s*(of|\\/)\\s*\\d+/.test(t);})()`));
ok("...and the day is stamped", run(`DB.settings.dayDone===todayISO`));

/* a tap ends it early */
run(`document.getElementById('dayDone').dispatchEvent(new window.Event('click',{bubbles:true}))`);
await sleep(400);
ok("a tap dismisses it", run(`!document.getElementById('dayDone')`));

/* reopening and completing again is not a second ceremony */
run(`(function(){const m=DB.days[todayISO]; m.doneAll=false; m.donePart=[];})()`);
tapDoneAll();
ok("completing twice in a day celebrates once", run(`!document.getElementById('dayDone')`));

/* the contract with the stylesheet, where jsdom cannot look: it must hold
   still when motion is unwelcome, and its ring must be a single spent beat,
   not a loop */
const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
ok("reduced motion gets the finished frame, not nothing",
   /prefers-reduced-motion:reduce\)\{#dayDone,[^}]*\{animation:none\}/.test(css));
ok("...and nothing in the ceremony loops",
   !/#dayDone[^}]*infinite/.test(css) && /@keyframes ddring/.test(css));


/* v3.3.371: THE MOMENT NEEDS A DOOR. The ceremony added in v3.3.369 has
   exactly one route into it -- the button that ends the day -- and that button
   looked like every other one and sat wherever Today happened to end, usually
   below the fold. A person could finish a workout and never find the thing the
   app was built to give them.
   jsdom computes no layout, so "reachable" is asserted as the CSS rule that
   makes it so, and the rest is asserted as content. */
run(`(function(){DB.days={}; delete DB.settings.dayDone;
  DB.days[todayISO]={w:[{part:'Chest',ex:'Dip',w:0,reps:[10]},
                        {part:'Chest',ex:'Dip',w:0,reps:[9]}],upd:1,doneEx:[],donePart:[]};
  SEED=deriveAll(); view='today'; render();})()`);
const endBtn = () => run(`(function(){const b=document.getElementById('doneAllBtn');
  return b?b.textContent.trim():'(absent)';})()`);
ok("a live day offers the button that ends it", endBtn()!=='(absent)', endBtn());
ok("...naming what it is about to put in the book", /2 sets/.test(endBtn()), endBtn());

const css2=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
/* v3.3.375 RESTATES. These pinned position:sticky, which was the MECHANISM I
   reached for, not the property. Sticky with a `bottom` offset pins upwards
   when the natural position is lower than the pin line, so on a short page the
   button lifted off the end of the document and painted over the part chips
   above it. What the check is really defending is that the end of the day is
   not something you have to hunt for: it sits directly under the work it
   closes, ABOVE the offer to add more, which is checkable as document order
   and cannot be satisfied by a floating element that covers its neighbours. */
ok("...and it sits above the offer to add another part",
   run(`(function(){const v=document.getElementById('view');
     const b=document.getElementById('doneAllBtn');
     const h=[...v.querySelectorAll('h2')].find(x=>/Add another part/i.test(x.textContent));
     if(!b||!h) return 'missing';
     return (b.compareDocumentPosition(h) & 4) === 4;})()`) === true);
ok("...and it does not float over its neighbours",
   !/\.btn\.done\.dayend\{[^}]*position:(sticky|fixed)/.test(css2));

/* one voice for the end of the day: the step-level buttons stopped borrowing
   its word, so "Complete workout" means one thing in one place */
const liftSrc=fs.readFileSync(path.join(dir,"js/lift.js"),"utf8");
ok("only the day's end says \"Complete\"",
   !/>\u2713 Complete /.test(liftSrc) && /Done with \$\{lift\.part\}/.test(liftSrc)
   && /Done with \$\{ex\}/.test(liftSrc));

/* and the door still opens the room */
run(`document.getElementById('doneAllBtn').dispatchEvent(new window.Event('click',{bubbles:true}))`);
ok("pressing it places the day", run(`!!document.getElementById('dayDone')`));

/* v3.3.376: THE FINISHED DAY. What stood here was two lines of grey mono --
   "Workout complete . 23 sets - logging another set reopens it" -- the end
   state of the thing this app is about, written as a footnote about database
   behaviour. It is a card now, in the same place the button was so the page
   does not change shape when you finish, and it replays the ceremony ON
   REQUEST. The once-a-day stamp exists so the ceremony does not INTERRUPT
   twice; a deliberate tap is not an interruption. */
{
  run(`(function(){DB.days={}; DB.settings.unit='lb'; DB.settings.dayDone=todayISO;
    const t=new Date(todayISO+'T00:00');
    const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
    DB.days[D(1)]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8]}],upd:1};
    DB.days[todayISO]={w:[{part:'Chest',ex:'Dip',w:0,reps:[10]},
                          {part:'Chest',ex:'Dip',w:0,reps:[9]}],upd:1,
                       doneEx:['Dip'],donePart:['Chest'],doneAll:true};
    SEED=deriveAll(); view='today'; render();})()`);
  /* \s inside a JS TEMPLATE LITERAL collapses to a bare s -- documented in
     v3.3.350, hit again in v3.3.355, and hit a third time writing this. The
     helper was collapsing runs of the letter "s" instead of whitespace and
     the card read as truncated. Double the backslash. */
  run(`(function(){const o=document.getElementById('dayDone'); if(o) o.remove();})()`);
  const closed = () => run(`(function(){const c=document.querySelector('.dayclosed');
    return c?c.textContent.replace(/\\s+/g,' ').trim():'(absent)';})()`);
  ok("a finished day gets a card, not a footnote", closed()!=='(absent)', closed());
  ok("...naming the day in the ceremony's own words",
     /in the book/.test(closed()) && /2 sets/.test(closed()), closed());
  ok("...with the real day number, not day one",
     /Day 2 /.test(closed()), closed());
  ok("...and the reopen sentence kept, but no longer the headline",
     /reopens it/.test(closed()));
  /* it stands where the button stood, so the page keeps its shape */
  ok("...sitting above the offer to add another part",
     run(`(function(){const c=document.querySelector('.dayclosed');
       const h=[...document.querySelectorAll('#view h2')].find(x=>/Add another part/i.test(x.textContent));
       if(!c||!h) return 'missing';
       return (c.compareDocumentPosition(h) & 4) === 4;})()`) === true);

  /* NOT on arrival: a finished day that re-runs its own ceremony every time
     you open Today is a full-screen takeover, not a celebration */
  ok("re-opening a finished day stays quiet", run(`!document.getElementById('dayDone')`));

  /* ...but on request, and showing the real day */
  run(`document.querySelector('.dayclosed').dispatchEvent(new window.Event('click',{bubbles:true}))`);
  ok("tapping it plays the day again", run(`!!document.getElementById('dayDone')`));
  ok("...reading the real day number", run(`(document.querySelector('#dayDone .ddn')||{}).textContent`)==="2",
     run(`(document.querySelector('#dayDone .ddn')||{}).textContent`));
  ok("...and a replay writes nothing", run(`DB.settings.dayDone===todayISO`));
}

/* v3.3.377: THE CEREMONY HANDS OVER TO THE DAY'S OWN CARD -- the same image
   History's share button produces, revealed rather than re-drawn. */
{
  run(`(function(){DB.days={}; DB.settings.unit='lb'; delete DB.settings.dayDone;
    const t=new Date(todayISO+'T00:00');
    const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
    DB.days[D(1)]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8]}],upd:1};
    /* a LONG day on purpose: the maker's own 22-set shape. A ceremony that
       celebrated a cropped record would be worse than none. */
    const w=[];
    [['Biceps','EZ Bar Curl',20],['Biceps','Dumbbell Curl',11],['Biceps','Hammer Curl',11],
     ['Triceps','Triceps Pushdown',18],['Triceps','Skull Crusher',18],
     ['Shoulder','Rear Deltoids',11],['Sixpack','Hanging Leg Raise',0],
     ['Chest','Dip',0]].forEach(([p,e,kg],i)=>{
       for(let k=0;k<3;k++) w.push({part:p,ex:e,w:kg,reps:[10],at:i*10+k});
     });
    DB.days[todayISO]={w,upd:1,doneEx:[],donePart:[]};
    SEED=deriveAll(); view='today'; render();})()`);

  /* NOTHING IS TRUNCATED -- asserted at the SOURCE, because it cannot be
     asserted as an effect here: jsdom's canvas is a stub whose height is not
     settable (cx.canvas.height=1500 reads back 1080), so every day would
     measure 1080 whatever the code did. The same blind spot as layout.
     What prevents cropping is that drawDayCard derives its height from the
     CONTENT -- the parts, their exercises, the run -- and grows the canvas to
     match, rather than fitting the work into a fixed square. A 22-set day is
     drawn whole because the canvas moves, not because the rows are dropped. */
  const rep=fs.readFileSync(path.join(dir,"js/report.js"),"utf8");
  ok("the day card's height is computed from its content",
     /const H=Math\.max\(640,HEAD\+[^;]*groups\.reduce/.test(rep));
  ok("...and the canvas grows to that height rather than cropping",
     /cv2\.height!==H\) cv2\.height=H/.test(rep));
  ok("...with no row limit anywhere in the drawing",
     !/rows\.slice\(0,|groups\.slice\(0,|subs\.slice\(0,/.test(rep));

  /* the reveal uncovers the finished image; it does not paint its own */
  const css3=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
  /* the first version matched "#repImg.revealing{clip-path:inset" -- which the
     REDUCED-MOTION rule also satisfies, since it names the same selector to
     switch the reveal off. The check passed with the reveal deleted. It names
     the covered state specifically now. */
  ok("the reveal is a clip on the image the overlay already holds",
     /#repImg\.revealing\{clip-path:inset\(0 0 100% 0\)\}/.test(css3) && /#repImg\{clip-path:inset\(0 0 0 0\);transition:clip-path/.test(css3));
  ok("...and reduced motion is shown the whole card, not an unrevealed one",
     /prefers-reduced-motion:reduce\)\{#repImg\{transition:none\}#repImg\.revealing\{clip-path:inset\(0 0 0 0\)\}/.test(css3));

  /* the handover itself, and that Share is fed the SAME canvas */
  const appSrc=fs.readFileSync(path.join(dir,"js/app.js"),"utf8");
  ok("the ceremony hands over to the day's card",
     /showCard\(\(\)=>\{[\s\S]{0,200}drawDayCard\(cx,1080,todayISO\)/.test(appSrc));
  ok("...and does not draw a second picture of its own",
     (appSrc.match(/drawDayCard\(/g)||[]).length === 1);
}

process.exit(fail?1:0);
})();
