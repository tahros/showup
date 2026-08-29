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

process.exit(fail?1:0);
})();
