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
  /* v3.3.412 RESTATES. It stood where the button stood (v3.3.376) -- but that
     was still below the session cards, after an invitation to add more, and
     the page's order said KEEP GOING while the header said DONE. On a closed
     day the finished card LEADS, and there is no offer to add another part
     at all: a closed day has no next. */
  ok("...leading the page, as the first thing on a closed day",
     run(`document.querySelector('#view').firstElementChild.classList.contains('dayclosed')`) === true);
  ok("...with no offer to add another part beneath it",
     run(`![...document.querySelectorAll('#view h2')].some(x=>/Add another part/i.test(x.textContent))`) === true);

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

/* v3.3.424: THE CENTURY. Every hundredth day the square opens and the mark
   rises out of it -- the app's two symbols becoming one. Chosen over
   1,000-only because the ceremony law is frequency: ~4 a year earns the
   biggest thing the app does, and a century is 3.65 a year. 1,000-only also
   meant a stranger installing at launch met their first milestone in 2029. */
{
  const seed = (n) => run(`(function(){DB.days={}; delete DB.settings.century; delete DB.settings.dayDone;
    const t=new Date(todayISO+'T00:00');
    const D=k=>{const d=new Date(t);d.setDate(d.getDate()-k);return d.toLocaleDateString('en-CA')};
    for(let k=1;k<=` + n + `;k++) DB.days[D(k)]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8]}],upd:1};
    DB.days[todayISO]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8]}],upd:1};
    SEED=deriveAll(); return dayCount();})()`);

  ok("day 100 is a century", seed(99)===100 && run(`centuryDue()`)===100, String(seed(99)));
  ok("...and day 99 is not", (seed(98),run(`centuryDue()`))===0);
  ok("...nor day 101", (seed(100),run(`centuryDue()`))===0);
  ok("day 1,000 is a century, and gets no more than day 100 does",
     (seed(999),run(`centuryDue()`))===1000);

  /* THE GUARD THAT MATTERS: import lands three years at once, and retro-logging
     repairs a streak. Neither may replay a ceremony. The stamp names WHICH
     century was celebrated, so a recompute cannot fire it again. */
  seed(99);
  run(`(function(){DB.settings.century=100;})()`);
  ok("a celebrated century never fires again, however often the ledger recomputes",
     run(`(function(){SEED=deriveAll(); return centuryDue();})()`)===0);
  ok("...but the NEXT century still will",
     (seed(199),run(`centuryDue()`))===200);

  /* it is the DAY COUNT, never the streak: a streak breaks, and a milestone
     that can be lost is not a milestone */
  ok("the count is days in the book, not the streak",
     run(`(function(){const src=String(centuryDue); return !/streak/i.test(src);})()`));

  /* the beat itself */
  seed(99);
  run(`(function(){const o=document.getElementById('dayDone'); if(o) o.remove();})()`);
  run(`celebrateDayDone(true,1000,1000)`);
  ok("the century overlay carries the century class",
     run(`!!document.querySelector('#dayDone.century')`));
  /* v3.3.425 RESTATES. The mark WAS inside the square, and that was the bug:
     .ddsq fades and shrinks as it hands over, opacity on a parent applies to
     its children, and the white mark rendered grey. It is a SIBLING on a
     shared stage now -- so the check is that they share the stage and that the
     mark is NOT a descendant of the fading square. */
  ok("...and the brand mark on the stage, beside the square rather than inside it",
     run(`!!document.querySelector('#dayDone.century .ddstage > .ddmk .ic-brandmark')`) &&
     run(`!document.querySelector('#dayDone .ddsq .ddmk')`));
  ok("...both on one stage, so the mark keeps its own opacity",
     run(`(function(){const st=document.querySelector('.ddstage');
       return !!st && !!st.querySelector(':scope > .ddsq') && !!st.querySelector(':scope > .ddmk');})()`));
  ok("...reading the milestone number",
     run(`(document.querySelector('#dayDone .ddn')||{}).textContent`)==="1,000");
  run(`(function(){const o=document.getElementById('dayDone'); if(o) o.remove();})()`);
  /* an ordinary day is untouched: no class, no mark */
  run(`celebrateDayDone(true,957,0)`);
  ok("an ordinary day gets no century beat",
     !run(`!!document.querySelector('#dayDone.century')`) && !run(`!!document.querySelector('.ddmk')`));
  run(`(function(){const o=document.getElementById('dayDone'); if(o) o.remove();})()`);

  /* the preview writes NOTHING -- the real century must still fire later */
  seed(99);
  const before = run(`JSON.stringify({c:DB.settings.century||null,d:DB.settings.dayDone||null})`);
  run(`celebrateDayDone(true,100,100)`);
  ok("the preview writes no stamp, so the real century still arrives",
     run(`JSON.stringify({c:DB.settings.century||null,d:DB.settings.dayDone||null})`)===before &&
     run(`centuryDue()`)===100, before);
  run(`(function(){const o=document.getElementById('dayDone'); if(o) o.remove();})()`);

  /* NO ESCALATION: 1,000 and 100 render the same markup */
  const shape = (n) => { run(`(function(){const o=document.getElementById('dayDone'); if(o) o.remove();})()`);
    run(`celebrateDayDone(true,` + n + `,` + n + `)`);
    /* compare the RENDERED SHAPE with every number blanked -- if 1,000 got
       one extra flourish over 100, this differs. className is included via
       the same node so a "century+extra" class would also show. */
    return run(`document.getElementById('dayDone').className`)+'|'+
           run(`document.getElementById('dayDone').innerHTML`).replace(/\d[\d,]*/g,'N'); };
  ok("day 1,000 is given exactly what day 100 is given", shape(100)===shape(1000));
  run(`(function(){const o=document.getElementById('dayDone'); if(o) o.remove();})()`);

  /* the mark is BRAND: a fill, never rotated, never a control */
  const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
  /* the flatten collapses newline+indent but leaves inner runs of spaces, so
     the check tolerates them rather than demanding a shape the file need not
     have. What it defends: the mark starts fully clipped INSIDE the square. */
  ok("the mark rises out of the square, clipped by it",
     /@keyframes ddrise\{\s*0%\s*\{clip-path:inset\(0 0 100% 0\)/.test(css));
  ok("...and reduced motion is simply shown the mark, lift included",
     /prefers-reduced-motion:reduce\)\{[^@]*#dayDone\.century \.ddmk,#dayDone\.century \.ddsq,#dayDone\.century \.ddmk \.ic\{animation:none\}/.test(css));
  /* v3.3.425: the mark casts a shadow onto the square as it lifts -- the one
     place this app carries depth, because the whole beat IS the chevron coming
     out of the square. It must GROW with the rise, not sit static. */
  /* the keyframes alone prove nothing -- they survive with nothing using them,
     and a probe that removed the animation left this green. The rule is that
     the MARK RUNS ddlift. */
  ok("the mark lifts off the square with a growing shadow",
     /#dayDone\.century \.ddmk \.ic\{[^}]*animation:ddlift/.test(css) &&
     /@keyframes ddlift\{\s*0%\s*\{filter:drop-shadow\(0 0 0/.test(css) &&
     /100%\s*\{filter:drop-shadow\(0 10px 14px/.test(css));
  ok("...and nothing else in the app carries one",
     (css.match(/drop-shadow\(/g)||[]).length <= 4, String((css.match(/drop-shadow\(/g)||[]).length));
}

/* v3.3.431: ONE DOOR TO A CLOSED DAY. The maker logged a single Run, marked
   the exercise done, and the app put the day in the book -- finished card
   shown, Complete button hidden, and the ceremony spent from a path he never
   initiated, which is why he reported never seeing it. Three routes could
   close a day; there is one now. */
{
  const seed = () => run(`(function(){DB.days={}; delete DB.settings.dayDone;
    const t=new Date(todayISO+'T00:00');
    const D=k=>{const d=new Date(t);d.setDate(d.getDate()-k);return d.toLocaleDateString('en-CA')};
    DB.days[D(1)]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8]}],upd:1};
    DB.days[todayISO]={w:[{part:'Run',ex:'Run',w:4,reps:[],mins:27,secs:0,at:Date.now()-60000}],
                       upd:1,doneEx:[],donePart:[],doneAll:false};
    SEED=deriveAll(); view='today'; render();})()`);

  seed();
  ok("one logged set opens the day", run(`isLive()`)===true);
  ok("...and offers the button that ends it",
     run(`!!document.getElementById('doneAllBtn')`));
  ok("...with no finished card until it is pressed",
     run(`!document.querySelector('.dayclosed')`));

  /* sealing the only exercise is NOT closing the day */
  run(`(function(){const m=dayMeta(); m.doneEx=['Run']; m.donePart=['Run']; resealDay(m); SEED=deriveAll(); render();})()`);
  ok("sealing the only exercise does not close the day",
     run(`dayMeta().doneAll`)===false && run(`isLive()`)===true, JSON.stringify(run(`dayMeta().doneAll`)));
  ok("...the button is still there",
     run(`!!document.getElementById('doneAllBtn')`));
  ok("...and the ceremony has not been spent",
     run(`DB.settings.dayDone!==todayISO`));

  /* pressing it is what closes the day -- and that is when the ceremony fires */
  run(`document.getElementById('doneAllBtn').dispatchEvent(new window.Event('click',{bubbles:true}))`);
  ok("pressing Complete closes the day", run(`dayMeta().doneAll`)===true);
  ok("...fires the ceremony", run(`!!document.getElementById('dayDone')`));
  ok("...and stamps it once", run(`DB.settings.dayDone===todayISO`));
  run(`(function(){const o=document.getElementById('dayDone'); if(o) o.remove(); render();})()`);
  ok("...now the finished card is shown instead of the button",
     run(`!!document.querySelector('.dayclosed') && !document.getElementById('doneAllBtn')`));
  /* THE TWO HANDLERS THAT USED TO CLOSE THE DAY. The checks above drive
     resealDay directly and so never touch them -- probes that restored either
     line stayed green, which is the hollow-assertion failure this project has
     named before. Asserted at source: neither handler may set doneAll. The
     only assignment to doneAll:true in a handler belongs to #doneAllBtn. */
  {
    const src=fs.readFileSync(path.join(dir,"js/app.js"),"utf8");
    const block=(id)=>{ const i=src.indexOf(id); const j=src.indexOf("return render();", i);
      return i<0?'':src.slice(i,j); };
    ok("finishing an exercise does not close the day",
       !/doneAll\s*=\s*true/.test(block("#reopenPartBtn")===''?'':src.slice(src.indexOf("const exsInPart="), src.indexOf("#reopenPartBtn"))));
    ok("finishing a part does not close the day",
       !/doneAll\s*=\s*true/.test(block("#donePartBtn")));
    ok("...and #doneAllBtn is the one place that does",
       /doneAll\s*=\s*true/.test(block("#doneAllBtn")) &&
       (src.match(/m\.doneAll\s*=\s*true/g)||[]).length===1);
  }

  ok("...reading one set in the singular",
     /\b1 set\b/.test(run(`document.querySelector('.dayclosed').textContent`)) &&
     !/1 sets/.test(run(`document.querySelector('.dayclosed').textContent`)),
     run(`document.querySelector('.dayclosed .dcm').textContent`));
}

process.exit(fail?1:0);
})();
