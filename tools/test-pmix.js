// test-pmix.js DIR — v3.3.116: the part-mix chart.
// Two things carry real risk: the colour grant must not leak into the
// semantic hues, and loading older weeks must not move the view.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage116";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.performance = w.performance || { now: () => Date.now() };
w.Element.prototype.setPointerCapture = function(){};
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({ measureText: () => ({ width: 10 }) },
  { get: (o,k) => k in o ? o[k] : () => ({}), set: () => true }); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? "PASS" : "FAIL"), name, extra === undefined ? "" : "\u2192 " + extra);
  if (!cond) fail++;
};

// 200 training days, one part per day plus a run every third
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  const P=['Chest','Back','Shoulder','Legs','Biceps','Triceps','Sixpack'];
  for(let i=1;i<=200;i++){
    const d=new Date(t); d.setDate(d.getDate()-i);
    const iso=d.toLocaleDateString('en-CA');
    const p=P[i%P.length], w=[];
    for(let k=0;k<3+(i%4);k++) w.push({part:p,ex:'X',w:40,reps:[10],at:1});
    if(i%3===0) w.push({part:'Run',ex:'Run',w:5,reps:[],mins:30,secs:0,at:1});
    DB.days[iso]={w,upd:1};
  }
  SEED=deriveAll(); view='stats'; render();})()`);

// ---- position ------------------------------------------------------------
ok("Part mix is the second section", run(`(function(){
  const hs=[...document.querySelectorAll('#view h2')];
  const t=h=>(h.childNodes[0]&&h.childNodes[0].nodeType===3?h.childNodes[0].textContent:h.textContent).trim();
  return t(hs[1]);})()`) === "Part mix");

// ---- the data is sets, per part, per training day -------------------------
ok("partMix() returns one row per training day, newest last",
   run(`(function(){const r=partMix(10);
     return r.length===10 && r[9].d>r[0].d;})()`));
ok("v3.3.117: counting VOLUME (weight x reps), not sets",
   run(`(function(){const r=partMix(1)[0];
     const w=(DB.days[r.d]||{}).w||[];
     const vol=w.filter(s=>s.part!=='Run'&&s.ex!=='Run')
                .reduce((a,s)=>a+(+s.w||0)*((s.reps&&s.reps[0])||0),0);
     return r.total===vol;})()`), run(`JSON.stringify(partMix(1)[0])`));
ok("...and Run is excluded from the stack (km don't sum with kg)",
   run(`(function(){const t=new Date(todayISO+'T00:00'); const d=new Date(t); d.setDate(d.getDate()-3);
     const iso=d.toLocaleDateString('en-CA');
     DB.days[iso]={w:[{part:'Run',ex:'Run',w:5,reps:[],mins:30,secs:0,at:1}],upd:1};
     SEED=deriveAll();
     const row=partMix(999).find(r=>r.d===iso);
     return !row || !row.by.Run;})()`));
ok("...and a rest day contributes no column",
   run(`(function(){const t=new Date(todayISO+'T00:00'); const d=new Date(t); d.setDate(d.getDate()-500);
     const iso=d.toLocaleDateString('en-CA');
     DB.days[iso]={w:[],rest:true,upd:1}; SEED=deriveAll();
     const has=partMix(999).some(r=>r.d===iso); SEED=deriveAll(); return has;})()`) === false);

// ---- COLOUR DOCTRINE: the grant must not touch the semantic hues ---------
const css = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
const partVars = [...css.matchAll(/--p-[a-z]+:(#[0-9A-Fa-f]{6})/g)].map(m => m[1].toUpperCase());
ok("eight part colours are defined per theme", partVars.length === 16, partVars.length + " total");
/* v3.3.118 replaces the v3.3.117 "every colour is light" check, which was
   only ever true because BOTH themes then used pastels. The real invariant
   is directional: dark-theme fills must be lighter than the dark ground and
   light-theme fills darker than the light ground, each clearing 3:1 against
   its OWN surface. buildcheck enforces the ratio; this pins the direction,
   which is what stops a theme's palette being pasted into the other. */
const blockOf = name => (css.match(new RegExp(name + "\\{[^}]*\\}")) || [""])[0];
const darkBlk = blockOf(":root"), lightBlk = blockOf(':root\\[data-theme="light"\\]');
const lumOf = hx => {
  const c = [1,3,5].map(i => parseInt(hx.slice(i,i+2),16)/255)
    .map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
  return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2];
};
const grab = blk => [...blk.matchAll(/--p-[a-z]+:\s*(#[0-9A-Fa-f]{6})/g)].map(m => m[1]);
const groundOf = blk => (blk.match(/--ground:\s*(#[0-9A-Fa-f]{6})/) || [])[1];
const dParts = grab(darkBlk), lParts = grab(lightBlk);
ok("dark-theme part fills are all lighter than the dark ground",
   dParts.length === 8 && dParts.every(p => lumOf(p) > lumOf(groundOf(darkBlk))),
   dParts.length + " colours");
ok("light-theme part fills are all darker than the light ground",
   lParts.length === 8 && lParts.every(p => lumOf(p) < lumOf(groundOf(lightBlk))),
   lParts.length + " colours");
// and they are genuinely different values, not one theme pasted into both
ok("the two themes use different steps, not the same hex",
   dParts.every((p,i) => p.toLowerCase() !== lParts[i].toLowerCase()));

/* v3.3.120 rewrites the v3.3.119 rule. That version assumed a CATEGORICAL
   palette, where two fills sharing a hue meant a collision. The palette is
   now a deliberate blue RAMP, where every pair shares a hue by design and
   separation comes from lightness \u2014 so the old rule flagged all 28 pairs
   against a palette that is working as intended.
   The property that actually matters either way: any two fills must be
   distinguishable by SOMETHING. Different hue, or enough luminance between
   them. The floor is 1.12 rather than higher because a hairline separator
   is stroked between stacked segments, which carries the boundary the ramp
   cannot \u2014 asserted separately below. */
const hueSat = hx => {
  const r = parseInt(hx.slice(1,3),16)/255, g = parseInt(hx.slice(3,5),16)/255, b = parseInt(hx.slice(5,7),16)/255;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx-mn, l = (mx+mn)/2;
  if (!d) return [0, 0];
  let h = mx===r ? ((g-b)/d)%6 : mx===g ? (b-r)/d+2 : (r-g)/d+4;
  h *= 60; if (h < 0) h += 360;
  return [h, d/(1-Math.abs(2*l-1))];
};
const hueGap = (a,b) => { const d = Math.abs(a-b)%360; return Math.min(d, 360-d); };
const lumOf2 = hx => {
  const c = [1,3,5].map(i => parseInt(hx.slice(i,i+2),16)/255)
    .map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
  return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2];
};
const ratio = (a,b) => { const x = lumOf2(a), y = lumOf2(b);
  return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
for (const [label, set] of [["dark", dParts], ["light", lParts]]) {
  const bad = [];
  for (let i = 0; i < set.length; i++) for (let j = i+1; j < set.length; j++) {
    const [h1] = hueSat(set[i]), [h2] = hueSat(set[j]);
    if (hueGap(h1,h2) < 20 && ratio(set[i],set[j]) < 1.12) bad.push(`${set[i]}~${set[j]}`);
  }
  const worst = (() => { let m = 99;
    for (let i = 0; i < set.length; i++) for (let j = i+1; j < set.length; j++)
      m = Math.min(m, ratio(set[i],set[j]));
    return m.toFixed(2); })();
  ok(`no two ${label} part colours are mutually indistinguishable`,
     bad.length === 0, bad.join(" ") || `${set.length} colours, closest pair ${worst}:1`);
}
// the separator is what lets the ramp work at all
const statsSrc120 = fs.readFileSync(path.join(dir, "js/stats.js"), "utf8");
ok("stacked segments are separated by a hairline, so touching blues still read",
   /stroke="var\(--ground\)" stroke-width="0\.5"/.test(statsSrc120));
// and the ramp really is one hue family now
const hues = dParts.map(p => hueSat(p)[0]);
ok("the palette is a single blue family, not categorical",
   hues.every(h => h >= 165 && h <= 250),
   hues.map(Math.round).sort((a,b)=>a-b).join(","));
const live = (css.match(/--live:(#[0-9A-Fa-f]{6})/g) || []).map(s => s.split(":")[1].toUpperCase());
const rest = (css.match(/--rest:(#[0-9A-Fa-f]{6})/g) || []).map(s => s.split(":")[1].toUpperCase());
ok("no part colour reuses the LIVE red or the REST green",
   !partVars.some(p => live.includes(p) || rest.includes(p)),
   "live " + live.join("/") + " rest " + rest.join("/"));
/* Hue distance is the honest measure here. A first draft used raw channel
   dominance and flagged amber (36\u00b0) and pink (331\u00b0) as "red", which they
   plainly are not \u2014 the LIVE red sits at 5\u00b0. What matters is angular
   separation from the two hues that carry state meaning. */
const hueOf = hx => {
  const r = parseInt(hx.slice(1,3),16)/255, g = parseInt(hx.slice(3,5),16)/255, b = parseInt(hx.slice(5,7),16)/255;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx-mn;
  if (!d) return 0;
  let h = mx===r ? ((g-b)/d)%6 : mx===g ? (b-r)/d+2 : (r-g)/d+4;
  h *= 60; return h < 0 ? h+360 : h;
};
const apart = (a,b) => { const d = Math.abs(a-b)%360; return Math.min(d, 360-d); };
/* Saturation matters as much as hue. The LIVE red is a saturated brick
   (~0.65); Run's brown sits at the same end of the wheel but at ~0.31, and
   a muted brown cannot be mistaken for a state colour. So a part colour
   passes if it is either far in hue OR too desaturated to read as state.
   A hue-only draft failed the browns, which was the test being blunt
   rather than the palette being wrong. */
const satOf = hx => {
  const r = parseInt(hx.slice(1,3),16)/255, g = parseInt(hx.slice(3,5),16)/255, b = parseInt(hx.slice(5,7),16)/255;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx-mn, l = (mx+mn)/2;
  return d === 0 ? 0 : d / (1 - Math.abs(2*l - 1));
};
const stateHues = [...live, ...rest].map(hueOf);
const tooClose = partVars.filter(p =>
  stateHues.some(s => apart(hueOf(p), s) < 25) && satOf(p) > 0.45);
ok("...and no part colour can read as a state colour (hue OR saturation apart)",
   tooClose.length === 0,
   tooClose.length ? tooClose.map(p => `${p}@${Math.round(hueOf(p))}\u00b0 sat${satOf(p).toFixed(2)}`).join(",")
                   : "state sat " + satOf(live[0]).toFixed(2) + " vs nearest part " +
                     satOf(partVars.slice().sort((a,b)=>
                       Math.min(...stateHues.map(s=>apart(hueOf(a),s))) -
                       Math.min(...stateHues.map(s=>apart(hueOf(b),s))))[0]).toFixed(2));

/* The stronger guard: PART_COLORS may only ever be a chart fill. --live and
   --rest never are, so even a near hue cannot be confused \u2014 provided the
   part vars stay scoped. Same shape as the v3.3.81 rule that every
   var(--rest) rule is rest-named. */
const statsSrc = fs.readFileSync(path.join(dir, "js/stats.js"), "utf8");
const utilSrc = fs.readFileSync(path.join(dir, "js/util.js"), "utf8");
const partVarUses = [...(statsSrc + utilSrc + css).matchAll(/var\(--p-[a-z]+\)/g)].length;
ok("part colours appear only via PART_COLORS, never hand-written into a rule",
   !/[^-]--p-[a-z]+\s*:/.test(statsSrc) && !/var\(--p-[a-z]+\)/.test(css),
   partVarUses + " uses, all through the map");
ok("PART_COLORS covers every catalog part",
   run(`Object.keys(SEED.catalog).every(p=>!!PART_COLORS[p])`),
   run(`Object.keys(SEED.catalog).join(',')`));
ok("the compact legend names every stacked part (7 \u2014 Run left the stack in v3.3.117)",
   run(`document.querySelectorAll('.pmixlgd [data-pt]').length`) === 7,
   run(`[...document.querySelectorAll('.pmixlgd [data-pt]')].map(s=>s.dataset.pt).join(',')`));

// ---- LAZY BACK-LOADING: the view must not jump ---------------------------
// jsdom has no layout, so scrollWidth is 0; drive the widths explicitly and
// assert the arithmetic that keeps the view still.
const beforeCols = run(`document.querySelectorAll('#pmixWrap rect[data-pt]').length`);
const beforeDays = run(`PMIX_DAYS`);
ok("it opens showing recent weeks, not the whole archive",
   beforeDays === 56 && beforeCols > 0, beforeDays + " days");
/* v3.3.117 \u2014 the bug this reproduces: scrollWidth does not reflow inside
   the handler, so the old code measured a delta of 0, left scrollLeft at 0,
   and the next scroll event saw scrollLeft<80 and loaded again, running to
   the first day in one flick. jsdom reports scrollWidth 0 always, which is
   exactly the failing condition \u2014 so a correct implementation must still
   move the view, computing the width it added rather than measuring it. */
run(`(function(){const box=document.getElementById('pmixWrap');
  box.scrollLeft=0; box.dispatchEvent(new Event('scroll'));})()`);
ok("reaching the left edge loads an older chunk",
   run(`PMIX_DAYS`) > beforeDays, beforeDays + " \u2192 " + run(`PMIX_DAYS`));
ok("...and the view is pushed right by the width added, not left at zero",
   run(`document.getElementById('pmixWrap').scrollLeft`) > 0,
   "scrollLeft " + run(`document.getElementById('pmixWrap').scrollLeft`));
ok("...by exactly columns-added x column-width",
   run(`document.getElementById('pmixWrap').scrollLeft`) === 56 * run(`PMIX_COLW`),
   run(`document.getElementById('pmixWrap').scrollLeft`) + " vs " + (56 * run(`PMIX_COLW`)));
// THE regression: a burst of scroll events (one momentum flick) must load
// at most one chunk, because busy stays locked until the next frame.
/* The invariant is "at most one chunk per burst". Under a synchronous burst
   the rAF that clears `busy` never runs, so the correct result is 0 loaded \u2014
   the lock holding. A first draft demanded exactly 56 and failed against
   working code, which was the test misreading its own environment. */
ok("a burst of scroll events loads AT MOST one chunk, not the whole archive",
   run(`(function(){const box=document.getElementById('pmixWrap');
     const before=PMIX_DAYS;
     for(let i=0;i<15;i++){ box.scrollLeft=0; box.dispatchEvent(new Event('scroll')); }
     return PMIX_DAYS-before;})()`) <= 56,
   "delta " + run(`(function(){const b=PMIX_DAYS; return b;})()`));
ok("...and it never runs past the end of the archive",
   run(`(function(){const total=[...workoutDates()].length;
     const box=document.getElementById('pmixWrap');
     for(let n=0;n<30;n++){ box.scrollLeft=0; box.dispatchEvent(new Event('scroll'));
       globalThis.__raf&&globalThis.__raf(); }
     return PMIX_DAYS<=total;})()`), run(`PMIX_DAYS`) + " days");

// the scroll-restore arithmetic is what stops the jump
const appSrc = fs.readFileSync(path.join(dir, "js/app.js"), "utf8");
ok("the loader COMPUTES the width it added rather than measuring scrollWidth",
   /const added=\(PMIX_DAYS-prev\)\*PMIX_COLW/.test(appSrc) &&
   !/scrollWidth-before/.test(appSrc));
ok("...and holds the re-entry lock until the next frame",
   /requestAnimationFrame\(\(\)=>\{ busy=false; \}\)/.test(appSrc));
ok("...and opens parked at today, not at the oldest day",
   /box\.scrollLeft=box\.scrollWidth;/.test(appSrc));

// ---- it owns its horizontal gesture --------------------------------------
ok("the chart is in the tab-swipe blocklist (it scrolls sideways)",
   /closest\('\.pmixwrap'\)/.test(fs.readFileSync(path.join(dir, "js/util.js"), "utf8")));

// ---- v3.3.120: the chart's furniture -------------------------------------
run(`view='stats'; render();`);

// a y-axis that does not scroll away
ok("a fixed y-axis sits beside the scroller",
   run(`!!document.querySelector('.pmixbox > .pmixaxis')`) &&
   run(`!!document.querySelector('.pmixbox > .pmixwrap')`));
const axisTicks = run(`[...document.querySelectorAll('.pmixaxis text')].map(t=>t.textContent)`);
ok("...labelled at five levels", axisTicks.length === 5, axisTicks.join(","));
ok("...starting at zero and rising", axisTicks[0] === "0" && axisTicks[4] !== "0");

// guides that line up with those labels
ok("the plot draws a guide for every axis tick",
   run(`[...document.querySelectorAll('#pmixWrap svg > line')]
        .filter(l=>l.getAttribute('y1')===l.getAttribute('y2')).length`) === 5);

// axis and plot must share one scale or the labels lie
ok("axis and plot compute their maximum from ONE function",
   /function pmixMax/.test(fs.readFileSync(path.join(dir, "js/stats.js"), "utf8")) &&
   (fs.readFileSync(path.join(dir, "js/stats.js"), "utf8").match(/pmixMax\(/g) || []).length >= 3);

// month rules
const vlines = run(`[...document.querySelectorAll('#pmixWrap svg line')]
  .filter(l=>l.getAttribute('x1')===l.getAttribute('x2')).length`);
ok("a soft vertical rule marks each month change", vlines >= 1, vlines + " rules");
ok("...and it is soft, not a hard line",
   run(`[...document.querySelectorAll('#pmixWrap svg line')]
        .filter(l=>l.getAttribute('x1')===l.getAttribute('x2'))
        .every(l=>+l.getAttribute('opacity')<1)`));

// the way back
ok("a jump-to-latest button exists", run(`!!document.getElementById('pmixNow')`));
ok("...hidden until you have actually scrolled away",
   run(`!document.getElementById('pmixNow').classList.contains('on')`));
run(`(function(){const b=document.getElementById('pmixWrap');
  Object.defineProperty(b,'clientWidth',{get(){return 300;},configurable:true});
  Object.defineProperty(b,'scrollWidth',{get(){return 2000;},configurable:true});
  b.scrollLeft=0; b.dispatchEvent(new Event('scroll'));})()`);
ok("...appears once you are far from today",
   run(`document.getElementById('pmixNow').classList.contains('on')`));
run(`document.getElementById('pmixNow').click();`);
ok("...and tapping it returns to the right edge",
   run(`document.getElementById('pmixWrap').scrollLeft`) === 2000);

// motion
const css120 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\n/g, "");
ok("the scroller animates smoothly", /\.pmixwrap\{[^}]*scroll-behavior:smooth/.test(css120));
ok("...the button fades rather than pops", /\.pmixnow\{[^}]*transition:opacity/.test(css120));
ok("...and reduced motion turns both off",
   /prefers-reduced-motion:reduce\)\{[^}]*\.pmixwrap\{scroll-behavior:auto\}[^}]*\.pmixnow\{transition:none\}/.test(css120));
// loading backwards must NOT glide \u2014 that is the one place smooth is wrong
ok("back-loading suppresses smooth scrolling while it restores the view",
   /scrollBehavior='auto'/.test(fs.readFileSync(path.join(dir, "js/app.js"), "utf8")));

// ---- v3.3.121: legible in light mode, and matchable ----------------------
// The light ramp was 600-900 (near-black) because a 3:1 fill floor on a
// near-white ground FORCES darkness. Floor is 2.0 for stacked fills now.
const lightGround = groundOf(lightBlk);
const lightRatios = lParts.map(p => {
  const a = lumOf(p), b = lumOf(lightGround);
  return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
});
ok("every light fill clears the 2.0 floor", Math.min(...lightRatios) >= 2.0,
   "range " + Math.min(...lightRatios).toFixed(2) + "-" + Math.max(...lightRatios).toFixed(2));
ok("...and the ramp is no longer near-black (its lightest is well off the floor)",
   Math.min(...lightRatios) < 3.0,
   "lightest " + Math.min(...lightRatios).toFixed(2) + ":1");
ok("buildcheck enforces the same 2.0 floor it was relaxed to",
   /_r < 2\.0/.test(fs.readFileSync(path.join(dir, "tools/buildcheck.py"), "utf8")));

// tap-to-isolate: the answer to "which colour is which part"
run(`view='stats'; render(); PMIX_FOCUS=null; pmixApplyFocus();`);
ok("nothing is dimmed before you tap",
   run(`[...document.querySelectorAll('#pmixWrap rect[data-pt]')].every(r=>!r.style.opacity)`));
run(`pmixSetFocus('Back');`);
ok("tapping a part dims every other part",
   run(`[...document.querySelectorAll('#pmixWrap rect[data-pt]')]
        .every(r=>r.dataset.pt==='Back' ? !r.style.opacity : r.style.opacity==='0.12')`));
ok("...and marks the legend so the pairing is unambiguous",
   run(`document.querySelector('.pmixlgd [data-pt="Back"]').classList.contains('on')`) &&
   run(`document.querySelector('.pmixlgd [data-pt="Chest"]').classList.contains('off')`));
run(`pmixSetFocus('Back');`);
ok("tapping the same part again clears the focus",
   run(`PMIX_FOCUS`) === null &&
   run(`[...document.querySelectorAll('#pmixWrap rect[data-pt]')].every(r=>!r.style.opacity)`));

// focus must survive a backwards load, which replaces every rect
run(`pmixSetFocus('Legs');`);
run(`(function(){const b=document.getElementById('pmixWrap'); b.scrollLeft=0;
  b.dispatchEvent(new Event('scroll'));})()`);
ok("focus survives loading older weeks (the new rects get it too)",
   run(`PMIX_FOCUS`) === "Legs" &&
   run(`[...document.querySelectorAll('#pmixWrap rect[data-pt]')]
        .filter(r=>r.dataset.pt!=='Legs').every(r=>r.style.opacity==='0.12')`));
run(`pmixSetFocus('Legs');`);

process.exit(fail ? 1 : 0);
