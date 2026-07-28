// test-chartsize.js DIR — v3.3.129: taller plots, hints outside the plot,
// and label stacks that cannot collide.
//
// The bug this locks down: on Weekdays the % label's y depended on whether
// the bar was today AND whether it was the strongest, while the caret sat at
// a fixed offset. A day that was BOTH (Tuesday, in the field report) drew the
// two 4 units apart — on top of each other. So the interesting case here is
// not "does it render", it's "force today == strongest and measure the gap".
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

/* Seed several years so the consistency chart actually has four lines whose
   end-labels can crowd each other, and so every weekday has a rate. */
/* today's weekday is trained EVERY time, so today is also the strongest —
   the exact collision case from the field report. */
run(`(function(){DB.days={}; const y=+todayISO.slice(0,4);
  const todayDow=new Date(todayISO+'T00:00').getDay();
  for(let yr=y-4; yr<=y; yr++){
    for(let d=1; d<=366; d++){
      const dt=new Date(yr,0,d); const iso=dt.toLocaleDateString('en-CA');
      if(dt.getFullYear()!==yr || iso>todayISO) break;
      const train = dt.getDay()===todayDow ? true : (d%3!==0);
      if(train) DB.days[iso]={w:[{part:'Back',ex:'Pull Up',w:70,reps:[8]},
                                 {part:'Run',ex:'Run',w:3.4,mins:28,secs:0}],upd:1};
    }
  }
})()`);

run(`renderStats()`);
const $ = sel => run(`document.querySelector(${JSON.stringify(sel)})`);
const cards = () => run(`[...document.querySelectorAll('#view .card')].length`);

// ---- 1. the plots are taller -----------------------------------------------
const vbs = run(`[...document.querySelectorAll('#view svg')].map(s=>s.getAttribute('viewBox'))`);
ok("the consistency plot is 220 tall", vbs.includes("0 0 340 220"), vbs.find(v=>/340/.test(v)));
const tall = vbs.filter(v => v === "0 0 330 150").length;
ok("days-by-month and weekdays are both 150 tall", tall >= 2, tall + " at 330x150");
/* v3.3.129 was scoped to FOUR charts: consistency, days-by-month, weekdays,
   distance. Weight and Pace were deliberately left at 118 — they were not in
   the request, and a chart is not made better by being taller on principle.
   So this asserts the scope held, not that 118 was eradicated. */
ok("the out-of-scope charts were left alone", vbs.filter(v=>v==="0 0 330 118").length === 2,
   vbs.filter(v=>v==="0 0 330 118").length + " still at 118 (expected 2: weight, pace)");

// ---- 2. the hint sits OUTSIDE the plot -------------------------------------
const hintsInside = run(`document.querySelectorAll('.zoom .zoomhint').length`);
const hintsTotal  = run(`document.querySelectorAll('.zoomhint').length`);
ok("no hint is rendered inside a .zoom box", hintsInside === 0, hintsInside + " inside");
ok("...but the hints still exist", hintsTotal > 0, hintsTotal + " hints");
ok("the hint precedes its chart in the DOM", run(`(function(){
    const hs=[...document.querySelectorAll('.zoomhint')];
    return hs.every(h=>{ const z=h.parentElement.querySelector('.zoom');
      return z && (h.compareDocumentPosition(z) & Node.DOCUMENT_POSITION_FOLLOWING); });
  })()`));
ok("the hint is reachable from the box the way app.js looks for it", run(`(function(){
    const z=document.querySelector('.zoom[data-zoom]');
    return !!(z.parentElement && z.parentElement.querySelector('.zoomhint'));
  })()`));
ok("the hint is no longer absolutely positioned over the plot",
   !/\.zoomhint\{[^}]*position:absolute/.test(run(`document.querySelector('style')?document.querySelector('style').textContent:''`) ||
     fs.readFileSync(path.join(dir,"css/app.css"),"utf8")),
   "position:absolute gone");

// ---- 3. Weekdays: caret and % can never collide ----------------------------
/* Drive the real painter with today == strongest, which is the exact
   combination that broke. Then measure every pair of text y values in the
   weekday chart column by column. */
const gap = run(`(function(){
  const svgs=[...document.querySelectorAll('#view svg')];
  const wd=svgs.find(s=>s.querySelector('.wd-col'));
  if(!wd) return null;
  const cols={};
  for(const t of wd.querySelectorAll('text')){
    const x=Math.round(+t.getAttribute('x'));
    (cols[x]=cols[x]||[]).push({y:+t.getAttribute('y'), s:t.textContent});
  }
  let worst=Infinity, where='', bars=0;
  for(const x in cols){
    // a BAR column is one carrying a % readout; x=21 is the y-axis rail
    if(!cols[x].some(o=>/%$/.test(o.s))) continue;
    bars++;
    const ys=cols[x].filter(o=>!/^[SMTWF]$/.test(o.s));  // ignore the day rail
    ys.sort((a,b)=>a.y-b.y);
    for(let i=1;i<ys.length;i++){
      const d=ys[i].y-ys[i-1].y;
      if(d<worst){ worst=d; where=ys[i-1].s+'/'+ys[i].s+' @x'+x; }
    }
  }
  return {worst, where, cols:bars};
})()`);
ok("the weekday chart rendered its 7 bar columns", gap && gap.cols === 7, gap && gap.cols);
ok("the caret and the % label never overlap", gap && gap.worst >= 10,
   gap && ("min gap " + gap.worst + "  " + gap.where));

const hasBoth = run(`(function(){
  const wd=[...document.querySelectorAll('#view svg')].find(s=>s.querySelector('.wd-col'));
  return !!wd.querySelector('text') && [...wd.querySelectorAll('text')].some(t=>t.textContent==='\\u25b2');
})()`);
ok("the strongest-day caret is still drawn at all", hasBoth);

// ---- 4. Consistency: end-of-line labels are nudged apart -------------------
const endGap = run(`(function(){
  const svg=[...document.querySelectorAll('#view svg')].find(s=>s.getAttribute('viewBox')==='0 0 340 220');
  if(!svg) return null;
  const ys=[...svg.querySelectorAll('text[data-yr]')].map(t=>+t.getAttribute('y')).sort((a,b)=>a-b);
  let worst=Infinity;
  for(let i=1;i<ys.length;i++) worst=Math.min(worst, ys[i]-ys[i-1]);
  return {n:ys.length, worst};
})()`);
ok("the consistency chart labels several years", endGap && endGap.n >= 3, endGap && endGap.n);
ok("...and no two year labels sit on top of each other",
   endGap && (endGap.n < 2 || endGap.worst >= 7.9), endGap && ("min gap " + endGap.worst));

// ---- 5. nothing escapes the taller viewBox --------------------------------
ok("nothing is drawn below the bottom of any stats plot", run(`(function(){
    const bad=[];
    for(const s of document.querySelectorAll('#view svg')){
      const h=+s.getAttribute('viewBox').split(/\\s+/)[3];
      for(const t of s.querySelectorAll('text')) if(+t.getAttribute('y')>h) bad.push(t.textContent);
      for(const r of s.querySelectorAll('rect')){
        const y=+r.getAttribute('y')||0, rh=+r.getAttribute('height')||0;
        if(y+rh>h+0.5) bad.push('rect');
      }
    }
    return bad.length===0;
  })()`));

// ---- 6. the scrub anchors match the geometry they describe -----------------
/* If sy0/syh drift from the drawn baseline the legend silently reports wrong
   numbers while scrubbing — no crash, just lies. */
ok("scrub anchors track the new baselines", run(`(function(){
    return [...document.querySelectorAll('[data-scrub]')].every(s=>
      s.getAttribute('data-sy0')==='190' && s.getAttribute('data-syh')==='170');
  })()`), run(`[...document.querySelectorAll('[data-scrub]')].map(s=>s.getAttribute('data-sy0')+'/'+s.getAttribute('data-syh')).join(' ')`));

// the distance chart comes in via runStatsHTML(), appended by renderStats
const distVb = run(`(function(){
  const s=document.querySelector('[data-scrub="dist"]');
  return s?s.getAttribute('viewBox'):'none';
})()`);
ok("the distance plot is 220 tall too", distVb === "0 0 340 220", distVb);
ok("the distance chart's hint is outside its plot too", run(`(function(){
    const s=document.querySelector('[data-scrub="dist"]');
    if(!s) return false;
    const z=s.closest('.zoom');
    return !z.querySelector('.zoomhint') && !!z.parentElement.querySelector('.zoomhint');
  })()`));

console.log(fail ? "\n" + fail + " FAILED" : "\nALL PASS");
process.exit(fail ? 1 : 0);
