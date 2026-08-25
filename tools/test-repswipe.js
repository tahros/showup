// test-repswipe.js DIR — v3.3.139: swipe the carousel, swipe the overlay,
// save the set.
//
// Gesture code is the least verifiable thing in this app: jsdom has no
// layout and no real pointer stack, so the thresholds themselves can only be
// proven on a phone. What CAN be proven here is the decision logic — that a
// horizontal drag commits, a vertical one does not, a short one does not —
// and the integration facts that would silently break things: the card being
// in the tab-swipe blocklist, and _repCv following what is on screen so
// Share sends the card you are looking at.
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
w.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,AA";
w.HTMLCanvasElement.prototype.toBlob = function(cb){ cb(new w.Blob(["x"], { type: "image/png" })); };
w.Element.prototype.setPointerCapture = function(){};
w.Element.prototype.releasePointerCapture = function(){};
// jsdom has no PointerEvent; MouseEvent carries the fields the binder reads
if (!w.PointerEvent) w.PointerEvent = class extends w.MouseEvent {
  constructor(t, o = {}) { super(t, o); this.pointerId = o.pointerId || 1; this.pointerType = o.pointerType || "touch"; }
};

for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? "PASS" : "FAIL"), name, extra === undefined ? "" : "\u2192 " + extra);
  if (!cond) fail++;
};

run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  for(let i=0;i<400;i++){
    const d=new Date(t); d.setDate(d.getDate()-i);
    const iso=d.toLocaleDateString('en-CA');
    if(i%4===0) continue;
    DB.days[iso]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:1},
                     {part:'Run',ex:'Run',w:4,reps:[],mins:26,secs:0,at:2}],upd:1};
  }
  SEED=deriveAll(); view='history'; render(); document.getElementById('secReport').open=true; paintRepCard();})()`);

// drag helper: down at (x0,y0), up at (x0+dx, y0+dy)
const drag = (sel, dx, dy) => run(`(function(){
  const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false;
  el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:200,clientY:300,bubbles:true,button:0}));
  el.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,clientX:${200}+(${dx}),clientY:${300}+(${dy}),bubbles:true,button:0}));
  return true;})()`);
const idx = () => run(`_repIdx`);
const title = () => run(`document.getElementById('repTtl').textContent`);

// ---- 1. the carousel exists and swipe is bound ---------------------------
ok("the report card renders", run(`!!document.getElementById('repCard')`));
ok("swipe is bound to the card", run(`!!document.getElementById('repCard')._swipeBound`));

// ---- 2. horizontal drag rotates, in the natural direction ---------------
run(`_repIdx=0; paintRepCard();`);
const n = run(`shareCards().length`);
drag("#repCard", -120, 4);
ok("dragging LEFT advances to the next card", idx() === 1, "idx " + idx());
drag("#repCard", 120, -4);
ok("dragging RIGHT goes back", idx() === 0, "idx " + idx());

// ---- 3. the decisions that stop it firing by accident -------------------
run(`_repIdx=0;`);
drag("#repCard", -20, 0);
ok("a short drag is a twitch, not a swipe", idx() === 0, "idx " + idx());
drag("#repCard", -60, 200);
ok("a mostly-vertical drag is a scroll, not a swipe", idx() === 0, "idx " + idx());
drag("#repCard", -300, 10);
ok("a decisive horizontal drag still fires", idx() === 1, "idx " + idx());

// ---- 4. wrapping still holds through the gesture ------------------------
run(`_repIdx=${'0'};`);
drag("#repCard", 120, 0);
ok("swiping back from the first card wraps to the last", idx() === n - 1, idx() + "/" + n);
run(`_repIdx=0;`);

// ---- 5. the arrows still work, and are centred --------------------------
run(`document.getElementById('repNext').click();`);
ok("the next arrow still rotates", idx() === 1, "idx " + idx());
run(`document.getElementById('repPrev').click();`);
ok("the prev arrow still rotates", idx() === 0, "idx " + idx());
const css = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
const repar = (css.match(/\.repar\{[^}]*\}/) || [""])[0];
ok("the arrows are absolutely positioned", /position:absolute/.test(repar), repar.slice(0, 50));
ok("...at the vertical midline", /top:50%/.test(repar) && /translateY\(-50%\)/.test(repar));
ok("...with the card as their positioning context",
   /\.repcard\{[^}]*position:relative/.test(css));
ok("...one on each edge", /#repPrev\{left:/.test(css) && /#repNext\{right:/.test(css));

// ---- 6. THE INTEGRATION FACT: the card owns its own horizontal axis -----
/* without this the tab-swipe gesture fires too and every card swipe also
   changes tab — the single most likely way this feature breaks */
ok("the card is in the tab-swipe blocklist",
   /closest\('#repCard'\)/.test(fs.readFileSync(path.join(dir, "js/util.js"), "utf8")));

/* ---- 6a. v3.3.140: and the OVERLAY does too -----------------------------
   The v3.3.139 check above passed while the popup was broken, because it
   asserted a selector existed in the source rather than that the page stayed
   put. Worse, the drag helper dispatches PointerEvents and the tab gesture
   listens for TouchEvents — so the tab-swipe never even ran in this suite.
   These fire real touch events and assert the view does not move. */
const touchSwipe = sel => run(`(function(){
  const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return 'no el';
  const mk=(t,x)=>{ const ev=new Event(t,{bubbles:true,cancelable:true});
    ev.touches=t==='touchend'?[]:[{clientX:x,clientY:300}];
    ev.changedTouches=[{clientX:x,clientY:300}];
    return ev; };
  el.dispatchEvent(mk('touchstart',300));
  el.dispatchEvent(mk('touchmove',120));
  el.dispatchEvent(mk('touchend',120));
  return view;})()`);

run(`view='history'; render(); document.getElementById('secReport').open=true; paintRepCard(); _repIdx=0;`);
run(`document.getElementById('repShare').click();`);
const viewAfterOv = touchSwipe("#repImg");
ok("a touch-swipe on the share image does NOT change tab",
   viewAfterOv === "history", "view = " + viewAfterOv);
const viewAfterBackdrop = touchSwipe("#repOv");
ok("...nor does one on the overlay backdrop",
   viewAfterBackdrop === "history", "view = " + viewAfterBackdrop);
run(`document.getElementById('repOv').style.display='none';`);

ok("every full-screen modal is inert to the tab-swipe", (() => {
  const u = fs.readFileSync(path.join(dir, "js/util.js"), "utf8");
  return ["#repOv", "#onb", "#msOv"].every(id => u.includes(id));
})());
ok("...and to pull-to-refresh", (() => {
  const u = fs.readFileSync(path.join(dir, "js/util.js"), "utf8");
  return (u.match(/#repOv/g) || []).length >= 2;
})());

/* ---- 6b. v3.3.288: the REP RULER owns its own horizontal axis ------------
   The ruler scrubs sideways, and inside an exercise a horizontal swipe means
   BACK (popMode) — so before this, scrubbing the reps threw you out of the
   lift mid-set. Asserted the v3.3.140 way: fire real touch events and check
   the app did not move, not that a selector appears in the source. */
/* keep the suite's 400-day ledger — section 7 needs it for the report card.
   Only the VIEW changes here. */
run(`(function(){DB.settings.unit='lb';
  view='lift'; lift={part:'Shoulder',ex:'Dumbbell Shoulder Press',weight:toKg(55)};
  render();})()`);
ok("the ruler is on screen to swipe", run(`!!document.querySelector('.repwrap .rr')`));
const exBefore = run(`lift.ex`);
const viewAfterRuler = touchSwipe(".repwrap .rr");
ok("a touch-swipe on the ruler does NOT change tab",
   viewAfterRuler === "lift", "view = " + viewAfterRuler);
ok("...and does NOT pop you out of the exercise",
   run(`lift.ex`) === exBefore, "lift.ex = " + run(`lift.ex`));
const viewAfterBand = touchSwipe(".repwrap");
ok("...nor does one starting on the ruler's own band",
   viewAfterBand === "lift" && run(`lift.ex`) === exBefore);
/* the surrounding card must still swipe back — the block is the ruler only,
   not the whole exercise page */
const viewAfterCard = run(`(function(){
  const el=document.querySelector('.zone')||document.getElementById('view');
  const mk=(t,x)=>{ const ev=new Event(t,{bubbles:true,cancelable:true});
    ev.touches=t==='touchend'?[]:[{clientX:x,clientY:300}];
    ev.changedTouches=[{clientX:x,clientY:300}]; return ev; };
  el.dispatchEvent(mk('touchstart',300));
  el.dispatchEvent(mk('touchmove',120));
  el.dispatchEvent(mk('touchend',120));
  return lift.ex;})()`);
ok("...while a swipe elsewhere on the page still pops back",
   viewAfterCard === null, "lift.ex = " + String(viewAfterCard));

/* ---- 6c. v3.3.309: the nav stays pinned during a page gesture -----------
   A transformed element becomes the containing block for its fixed-position
   descendants. While the rubber band and pull-to-refresh translated <body>,
   the nav — position:fixed — stopped resolving against the viewport and rode
   the page down. Nothing covered this, so the whole class was unguarded.
   Both gestures now move #view, which is a SIBLING of nav. */
run(`(function(){view='today'; render();})()`);
ok("body carries no transform at rest",
   run(`!document.body.style.transform`));
/* drag up at the bottom — the rubber band */
run(`(function(){
  const mk=(t,y)=>{ const ev=new Event(t,{bubbles:true,cancelable:true});
    ev.touches=t==='touchend'?[]:[{clientX:100,clientY:y}];
    ev.changedTouches=[{clientX:100,clientY:y}]; return ev; };
  window.dispatchEvent(mk('touchstart',600));
  window.dispatchEvent(mk('touchmove',420));
})()`);
ok("...and still none mid rubber-band — only the view moves",
   run(`!document.body.style.transform`),
   "body=" + JSON.stringify(run(`document.body.style.transform`)));
ok("...so the nav is never inside a transformed ancestor",
   run(`(function(){let el=document.getElementById('nav').parentElement;
     while(el){ if(el.style && el.style.transform) return false; el=el.parentElement; }
     return true;})()`));
run(`(function(){const ev=new Event('touchend',{bubbles:true,cancelable:true});
  ev.touches=[]; ev.changedTouches=[{clientX:100,clientY:420}];
  window.dispatchEvent(ev);})()`);
ok("...and the view is released afterwards",
   run(`!document.getElementById('view').style.transform`));
{
  const cssN = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  ok("the gesture transitions target the element that actually moves",
     /body\.bandback #view\{[^}]*transition:transform/.test(cssN)
       && /body\.settling #view\{[^}]*transition:transform/.test(cssN));
  ok("...and nav is still fixed, so nothing else can pin it",
     /(^|\})nav\{[^}]*position:fixed/.test(cssN));
}

// ---- 7. overlay swipe, and the card it would SHARE ----------------------
/* the ruler block above left the app inside the Train tab; put History's
   report card back on screen before section 7 (v3.3.288). */
run(`view='history'; render(); document.getElementById('secReport').open=true; paintRepCard();`);
run(`_repIdx=0; document.getElementById('repShare').click();`);
const label0 = run(`_repCv&&_repCv.label`);
ok("opening the overlay records the card on screen", !!label0, String(label0));
ok("...and marks it as carousel-opened", run(`_repFromCarousel`) === true);
ok("swipe is bound to the overlay image", run(`!!document.getElementById('repImg')._swipeBound`));

run(`ovRotate(1)`);
// ovRotate is async; settle the microtask queue
run(`Promise.resolve()`);
setTimeout(() => {
  const label1 = run(`_repCv&&_repCv.label`);
  ok("swiping the overlay changes the card it would share", label1 !== label0,
     label0 + " \u2192 " + label1);
  ok("...and the label matches the index now shown",
     label1 === run(`shareCards()[_repIdx].file()`), String(label1));
  ok("...and the carousel underneath followed", run(`_repIdx`) === 1,
     "idx " + run(`_repIdx`));

  // ---- 8. the milestone overlay must NOT swipe -------------------------
  run(`_repFromCarousel=false; _repIdx=0;`);
  const before = run(`_repIdx`);
  run(`ovRotate(1)`);
  ok("a milestone overlay ignores swipes", run(`_repIdx`) === before,
     "idx stayed " + run(`_repIdx`));

  // ---- 9. save all ----------------------------------------------------
  ok("the save-all button renders", run(`!!document.getElementById('repAll')`));
  ok("...and counts the registry, not a hardcoded 8",
     /Save all \d+/.test(run(`document.getElementById('repAll').textContent`)) &&
     +run(`document.getElementById('repAll').textContent`).replace(/\D/g, "") === n,
     run(`document.getElementById('repAll').textContent`) + " vs " + n + " cards");

  run(`globalThis.__shared=null;
       navigator.canShare=()=>true;
       navigator.share=o=>{ globalThis.__shared=o.files.map(f=>f.name); return Promise.resolve(); };`);
  run(`saveAllCards()`);
  setTimeout(() => {
    const shared = run(`globalThis.__shared`);
    ok("save-all hands every card to the share sheet at once",
       Array.isArray(shared) && shared.length === n, (shared || []).length + "/" + n);
    if (Array.isArray(shared)) {
      ok("...each with its own filename", new Set(shared).size === shared.length, shared.join(" "));
      ok("...all named for ShowUp", shared.every(s => /^showup-.+\.png$/.test(s)), shared[0]);
    }
    console.log(fail ? "\n" + fail + " FAILED" : "\nALL PASS");
    process.exit(fail ? 1 : 0);
  }, 120);
}, 60);
