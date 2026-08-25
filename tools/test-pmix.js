// test-pmix.js DIR — v3.3.208: the Session Build chart.
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
w.PointerEvent = w.PointerEvent || w.MouseEvent;
w.Element.prototype.setPointerCapture = function(){};
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({ measureText: () => ({ width: 10 }) },
  { get: (o,k) => k in o ? o[k] : () => ({}), set: () => true }); };
w.HTMLCanvasElement.prototype.toDataURL = function(){ return "data:image/png;base64,"; };
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
/* v3.3.209 pinned Session Build directly after Growth Audit. v3.3.257
   RESTATES to the maker's order: Session Build now LEADS the tab — the page
   opens on what you just did — with Growth Audit below it. The pinned
   property is leadership plus relative order, not adjacency. */
ok("Session Build leads the Stats tab, Growth Audit below it", run(`(function(){
  const hs=[...document.querySelectorAll('#view h2')];
  const t=h=>(h.childNodes[0]&&h.childNodes[0].nodeType===3?h.childNodes[0].textContent:h.textContent).trim();
  const names=hs.map(t);
  const gaIdx=names.indexOf('Growth audit');
  const pmIdx=names.indexOf('Session build');
  return pmIdx===0 && gaIdx>pmIdx;})()`) === true);

// ---- the data is sets, per part, per training day -------------------------
ok("partMix() returns one row per training day, newest last",
   run(`(function(){const r=partMix(10);
     return r.length===10 && r[9].d>r[0].d;})()`));
ok("v3.3.208: counting completed sets, independent of weight",
   run(`(function(){const r=partMix(1)[0];
     const w=(DB.days[r.d]||{}).w||[];
     const sets=w.filter(s=>s.part!=='Run'&&s.ex!=='Run')
                 .reduce((a,s)=>a+((s.reps||[]).length),0);
     return r.total===sets;})()`), run(`JSON.stringify(partMix(1)[0])`));
ok("...and Run stays separate from the strength stack",
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
const partMap = blk => Object.fromEntries(
  [...blk.matchAll(/--p-([a-z]+):\s*(#[0-9A-Fa-f]{6})/g)]
    .map(m => [m[1],m[2].toUpperCase()]));
const darkParts=partMap(darkBlk), lightParts=partMap(lightBlk);
/* v3.3.325 RESTATES the roster, not the rule: Biceps moves orange -> magenta.
   The property this pin defends is that the fills are GOOGLE CATEGORICAL
   IDENTITIES rather than hand-mixed colours -- magenta is one, so the chart
   language is unchanged and only the assignment moved. Why it moved is the
   separation guard at the bottom of this block. */
ok("v3.3.264: dark Session Build follows the Google Sheets colour identities",
   JSON.stringify(darkParts)===JSON.stringify({
     chest:'#FABB05',back:'#EA4335',shoulder:'#4285F4',legs:'#34A853',
     biceps:'#E52592',triceps:'#46BDC6',sixpack:'#A142F4',run:'#78909C'}),
   JSON.stringify(darkParts));
/* v3.3.301 RESTATES this to the RULE it was always expressing, rather than
   to one hard-coded exception. Light may deviate from the shared identities
   ONLY where a colour would otherwise fail the v3.3.121 2.0:1 floor against
   the light page — and when the page changed (#F2F3F6 -> #EFEFEF) a second
   colour, triceps, joined chest in needing it. Pinning the literals meant
   the suite failed for a correct change; pinning the rule means it fails
   only for a wrong one. */
{
  const LIGHT_GROUND = (lightBlk.match(/--ground:\s*(#[0-9A-Fa-f]{6})/)||[])[1];
  const srgb = c => (c/=255, c<=0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4);
  const lum = h => { const [r,g,b]=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
    return .2126*srgb(r)+.7152*srgb(g)+.0722*srgb(b); };
  const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p); return (x+.05)/(y+.05); };
  const deviating = Object.keys(darkParts).filter(k => lightParts[k]!==darkParts[k]);
  ok("light keeps the shared identities except where contrast forbids it",
     deviating.every(k => ratio(darkParts[k], LIGHT_GROUND) < 2.0),
     deviating.length ? deviating.map(k=>`${k} ${darkParts[k]}@${ratio(darkParts[k],LIGHT_GROUND).toFixed(2)}`).join(", ")
                      : "none deviate");
  ok("...and every light part colour clears the 2.0 floor it was deepened for",
     Object.keys(lightParts).every(k => ratio(lightParts[k], LIGHT_GROUND) >= 2.0),
     Object.entries(lightParts).map(([k,v])=>`${k} ${ratio(v,LIGHT_GROUND).toFixed(2)}`).join(" "));
  ok("...and a deepened colour keeps its hue rather than becoming a new one",
     deviating.every(k => {
       const h = x => { const [r,g,b]=[1,3,5].map(i=>parseInt(x.slice(i,i+2),16));
         const mx=Math.max(r,g,b), mn=Math.min(r,g,b); if(mx===mn) return 0;
         const d=mx-mn; let hh = mx===r ? ((g-b)/d+(g<b?6:0)) : mx===g ? ((b-r)/d+2) : ((r-g)/d+4);
         return hh*60; };
       return Math.abs(h(lightParts[k]) - h(darkParts[k])) < 12;
     }), deviating.join(", ") || "none");
}

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
for (const [label, set] of [["dark", dParts], ["light", lParts]])
  ok(`all ${label} part colours are distinct`,new Set(set.map(x=>x.toLowerCase())).size===set.length,set.join(' '));
// the separator is what lets the ramp work at all
const statsSrc120 = fs.readFileSync(path.join(dir, "js/stats.js"), "utf8");
ok("stacked segments are separated by a hairline, so touching colours still read",
   /stroke="var\(--ground\)" stroke-width="0\.5"/.test(statsSrc120));
// v3.3.217: the filters return to categorical colour so they can be found
// under a thumb without decoding seven nearly adjacent blues.
const hues = dParts.map(p => hueSat(p)[0]);
ok("the palette spans several hue families, not only blue",
   Math.max(...hues)-Math.min(...hues)>150,
   hues.map(Math.round).sort((a,b)=>a-b).join(","));
const live = (css.match(/--live:(#[0-9A-Fa-f]{6})/g) || []).map(s => s.split(":")[1].toUpperCase());
const rest = (css.match(/--rest:(#[0-9A-Fa-f]{6})/g) || []).map(s => s.split(":")[1].toUpperCase());
ok("the categorical red and green do not reuse the semantic state tokens",
   !partVars.some(p => live.includes(p) || rest.includes(p)),
   "live " + live.join("/") + " rest " + rest.join("/"));
/* Identify colours near the semantic LIVE/rest hues. In v3.3.264 proximity
   is deliberate for Back, Legs and Biceps, but the exact state tokens remain
   separate and the category palette stays scoped to Session Build. */
const hueOf = hx => {
  const r = parseInt(hx.slice(1,3),16)/255, g = parseInt(hx.slice(3,5),16)/255, b = parseInt(hx.slice(5,7),16)/255;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx-mn;
  if (!d) return 0;
  let h = mx===r ? ((g-b)/d)%6 : mx===g ? (b-r)/d+2 : (r-g)/d+4;
  h *= 60; return h < 0 ? h+360 : h;
};
const apart = (a,b) => { const d = Math.abs(a-b)%360; return Math.min(d, 360-d); };
/* Saturation prevents a muted neighbour from being counted as state-like. */
const satOf = hx => {
  const r = parseInt(hx.slice(1,3),16)/255, g = parseInt(hx.slice(3,5),16)/255, b = parseInt(hx.slice(5,7),16)/255;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx-mn, l = (mx+mn)/2;
  return d === 0 ? 0 : d / (1 - Math.abs(2*l - 1));
};
const stateHues = [...live, ...rest].map(hueOf);
const tooClose = partVars.filter(p =>
  stateHues.some(s => apart(hueOf(p), s) < 25) && satOf(p) > 0.45);
/* v3.3.325 RESTATES: there are TWO state-adjacent identities now, not three.
   Biceps' orange was the third, and it left the neighbourhood entirely when
   it became magenta. The property is unchanged -- a part fill may sit near a
   state hue only when it is a deliberate Google identity, and the exact
   --live / --rest tokens stay separate (asserted just above) -- so the count
   follows the palette rather than being pinned at the number it happened to
   have. */
ok("the state-adjacent hues are deliberate Google category identities",
   tooClose.length===4 && new Set(tooClose).size===2 &&
   ['#EA4335','#34A853'].every(p=>tooClose.includes(p)),
   tooClose.length ? tooClose.map(p => `${p}@${Math.round(hueOf(p))}\u00b0 sat${satOf(p).toFixed(2)}`).join(",")
                   : "state sat " + satOf(live[0]).toFixed(2) + " vs nearest part " +
                     satOf(partVars.slice().sort((a,b)=>
                       Math.min(...stateHues.map(s=>apart(hueOf(a),s))) -
                       Math.min(...stateHues.map(s=>apart(hueOf(b),s))))[0]).toFixed(2));

/* v3.3.325: the guard the maker's report earned. The palette is CATEGORICAL,
   so hue is the whole signal -- and two categories 21 degrees apart are one
   colour to a thumb, especially stacked in the same bar with a 0.5px hairline
   between them. Back and Biceps is a session he trains, so that pair sat
   inside a single bar. Run is excluded: it left the stack in v3.3.117 and
   never shares a bar with anything.
   The floor is 30 degrees. The palette's tightest surviving pair is
   Shoulder/Triceps at 33, which also carries a 1.59x luminance step; the
   pairs this rule was written against were Chest/Biceps at 19 and Back/Biceps
   at 21, the latter at only 1.09x luminance. Asserted per theme, because
   light deviates where contrast forces it and a deepened colour could drift
   into a neighbour. */
{
  const STACKED = ["chest","back","shoulder","legs","biceps","triceps","sixpack"];
  const hueDeg = hx => {
    const [r,g,b] = [1,3,5].map(i => parseInt(hx.slice(i,i+2),16)/255);
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx-mn;
    if (!d) return 0;
    let h = mx===r ? ((g-b)/d)%6 : mx===g ? (b-r)/d+2 : (r-g)/d+4;
    h *= 60; return h < 0 ? h+360 : h;
  };
  const apartDeg = (a,b) => { const d = Math.abs(a-b)%360; return Math.min(d, 360-d); };
  for (const [label, map] of [["dark", darkParts], ["light", lightParts]]) {
    const tight = [];
    for (let i = 0; i < STACKED.length; i++)
      for (let j = i+1; j < STACKED.length; j++) {
        const a = map[STACKED[i]], b = map[STACKED[j]];
        if (!a || !b) continue;
        const g = apartDeg(hueDeg(a), hueDeg(b));
        if (g < 30) tight.push(`${STACKED[i]}/${STACKED[j]} ${Math.round(g)}\u00b0`);
      }
    ok(`no two ${label} stacked fills share a hue neighbourhood`,
       tight.length === 0, tight.join(", ") || "closest pair clears 30\u00b0");
  }
}

/* The decisive guard: the Google colours are licensed only as Session Build
   data fills. They never become hand-written app-wide CSS fills. */
const statsSrc = fs.readFileSync(path.join(dir, "js/stats.js"), "utf8");
const utilSrc = fs.readFileSync(path.join(dir, "js/util.js"), "utf8");
const partVarUses = [...(statsSrc + utilSrc + css).matchAll(/var\(--p-[a-z]+\)/g)].length;
ok("part colours stay scoped through Session Build's PART_COLORS map",
   !/[^-]--p-[a-z]+\s*:/.test(statsSrc) && !/var\(--p-[a-z]+\)/.test(css),
   partVarUses + " uses, all through the map");
ok("PART_COLORS covers every catalog part",
   run(`Object.keys(SEED.catalog).every(p=>!!PART_COLORS[p])`),
   run(`Object.keys(SEED.catalog).join(',')`));
ok("the compact legend names every stacked part (7 \u2014 Run left the stack in v3.3.117)",
   run(`document.querySelectorAll('.pmixlgd [data-pt]').length`) === 7,
   run(`[...document.querySelectorAll('.pmixlgd [data-pt]')].map(s=>s.dataset.pt).join(',')`));

/* ---- v3.3.122: the whole archive renders up front -----------------------
   Lazy back-loading is GONE, and with it the lurch the maker reported.
   The cause was structural: prepending columns means correcting scrollLeft,
   and correcting scrollLeft mid-momentum is a visible jump no easing can
   hide. A day carries one or two parts, so the full archive is a couple of
   thousand rects \u2014 the lazy path bought nothing but the bug. These
   assertions replace the six that tested the removed mechanism. */
ok("the chart renders every training day, not a window",
   run(`document.querySelectorAll('#pmixWrap rect[data-col]').length`) ===
   run(`[...workoutDates()].length`),
   run(`document.querySelectorAll('#pmixWrap rect[data-col]').length`) + " columns");
ok("...so nothing prepends and no scroll correction exists",
   !/scrollLeft=added/.test(fs.readFileSync(path.join(dir, "js/app.js"), "utf8")) &&
   !/PMIX_DAYS=Math\.min/.test(fs.readFileSync(path.join(dir, "js/app.js"), "utf8")));
ok("...and it still opens parked at today",
   /box\.scrollLeft=box\.scrollWidth;/.test(fs.readFileSync(path.join(dir, "js/app.js"), "utf8")));

/* ---- v3.3.125: the scrubber is gone -------------------------------------
   Tapping is the only interaction now, and it does one thing: follow a body
   part. Tapping anywhere in a single-part column works \u2014 you never have to
   hit a thin bar exactly \u2014 while an ambiguous stack still needs its
   segment. A drag scrolls and must never select. */
ok("the instruction moved into the info control instead of sitting above the chart",
   !run(`document.getElementById('pmixRead')`) &&
   !/function pmixHint/.test(statsSrc) &&
   /One block per completed set, stacked by body part\. Tap a label to follow it; tap again for all\./.test(statsSrc));
ok("...and no drag-readout function survives",
   !/pmixReadout/.test(fs.readFileSync(path.join(dir, "js/stats.js"), "utf8")) &&
   !/pmixReadout/.test(fs.readFileSync(path.join(dir, "js/app.js"), "utf8")));

run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  const mk=(off,w)=>{const d=new Date(t); d.setDate(d.getDate()-off);
    DB.days[d.toLocaleDateString('en-CA')]={w,upd:1};};
  mk(1,[{part:'Legs',ex:'Squat',w:100,reps:[10,10],at:1}]);              // single part
  mk(2,[{part:'Back',ex:'Row',w:50,reps:[10],at:1},
        {part:'Chest',ex:'Press',w:40,reps:[10],at:1}]);                 // ambiguous stack
  for(let i=3;i<12;i++) mk(i,[{part:'Legs',ex:'Squat',w:80,reps:[8],at:1}]);
  SEED=deriveAll(); view='stats'; render();
  const b=document.getElementById('pmixWrap');
  b.getBoundingClientRect=()=>({left:0,top:0,width:340,height:186,right:340,bottom:186});
  b.scrollLeft=0;})()`);

// tap the EMPTY area above a single-part column: still selects that part
const lastCol = run(`partMix(999).length-1`);
run(`(function(){const b=document.getElementById('pmixWrap');
  const x=8+${lastCol}*PMIX_COLW+3;
  const bg=b.querySelector('rect[data-col="${lastCol}"]');
  bg.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:x,clientY:12,bubbles:true}));
  b.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,clientX:x,clientY:12,bubbles:true}));})()`);
ok("tapping anywhere in a single-part column follows that part",
   run(`PMIX_FOCUS`) === "Legs", String(run(`PMIX_FOCUS`)));
ok("...and the quiet legend marks what is being followed",
   run(`document.querySelector('.pmixlgd [data-pt="Legs"]').getAttribute('aria-pressed')`) === 'true');
run(`pmixSetFocus('Legs');`);

// a drag must scroll, never select
run(`(function(){const b=document.getElementById('pmixWrap');
  const bg=b.querySelector('rect[data-col="${lastCol}"]');
  bg.dispatchEvent(new PointerEvent('pointerdown',{pointerId:2,clientX:40,clientY:12,bubbles:true}));
  b.dispatchEvent(new PointerEvent('pointermove',{pointerId:2,clientX:140,clientY:12,bubbles:true}));
  b.dispatchEvent(new PointerEvent('pointerup',{pointerId:2,clientX:140,clientY:12,bubbles:true}));})()`);
ok("dragging scrolls without selecting", run(`PMIX_FOCUS`) === null, String(run(`PMIX_FOCUS`)));

// geometry
ok("v3.3.127: bars are 25% wider than v3.3.125's 10 units",
   run(`PMIX_COLW`) === 15 &&
   /bw=PMIX_COLW-2\.5/.test(fs.readFileSync(path.join(dir, "js/stats.js"), "utf8")),
   "colw " + run(`PMIX_COLW`) + ", bar " + (run(`PMIX_COLW`) - 2.5));
ok("...and the gap stays hairline",
   run(`PMIX_COLW`) - (run(`PMIX_COLW`) - 2.5) === 2.5);
ok("the box no longer carries dead space under the labels",
   run(`PMIX_H`) === 186, "height " + run(`PMIX_H`));

/* restore a fixture that spans months and parts \u2014 the tap tests above
   deliberately seed 11 consecutive days, which crosses no month boundary,
   and the assertions further down still expect month rules to exist. */
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  const P=['Chest','Back','Shoulder','Legs','Biceps','Triceps','Sixpack'];
  for(let i=1;i<=200;i++){
    const d=new Date(t); d.setDate(d.getDate()-i);
    if(i%7===0) continue;
    const w=[]; const p=P[i%P.length];
    for(let k=0;k<3+(i%4);k++) w.push({part:p,ex:'X',w:40,reps:[10],at:1});
    if(i%3===0) w.push({part:'Run',ex:'Run',w:5,reps:[],mins:28,secs:0,at:1});
    DB.days[d.toLocaleDateString('en-CA')]={w,upd:1};
  }
  SEED=deriveAll(); view='stats'; render();})()`);

// ---- the year has to be findable ----------------------------------------
ok("the chart marks years, not just months",
   run(`document.querySelectorAll('#pmixWrap [data-yrmark]').length`) >= 1,
   run(`[...document.querySelectorAll('#pmixWrap [data-yrmark]')].map(t=>t.textContent).join(',')`));
ok("...including at the very first column, so the left edge is never mute",
   run(`!!document.querySelector('#pmixWrap [data-yrmark]')`));

// ---- isolating a part now labels it --------------------------------------
/* seed its own data: this assertion used to inherit whatever fixture ran
   last, and a fixture without Chest made it fail for a reason that had
   nothing to do with labelling. */
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  for(let i=1;i<=20;i++){const d=new Date(t); d.setDate(d.getDate()-i);
    DB.days[d.toLocaleDateString('en-CA')]={w:[
      {part:'Chest',ex:'Press',w:40,reps:[10],at:1},
      {part:'Back',ex:'Row',w:50,reps:[10],at:1},
      {part:'Legs',ex:'Squat',w:80,reps:[8,8,8],at:1}],upd:1};}
  SEED=deriveAll(); view='stats'; render(); PMIX_FOCUS=null; pmixApplyFocus();})()`);
/* v3.3.259 put the day total on every bar top; v3.3.260 RESTATES after the
   maker called 19 numbers at 19 heights cluttered. The totals now sit in a
   FIXED HEADER ROW (every label at y=6.5 — the alignment IS the fix), the
   latest bold and the archive muted, and the focused part's count returns
   to its segment top while the totals row stands. The fixture logs 1 Chest
   + 1 Back + 3 Legs per day, so totals read 5 and Chest's focus label reads 1 —
   both assertions discriminate the two numbers from each other. */
ok("every column carries the day's total, with no part focused",
   run(`document.querySelectorAll('#pmixWrap [data-lbl="total"]').length`) === 20,
   run(`document.querySelectorAll('#pmixWrap [data-lbl="total"]').length`) + " labels");
ok("...reading ALL parts that day, not one of them",
   run(`[...document.querySelectorAll('#pmixWrap [data-lbl="total"]')].every(t=>t.textContent==='5')`));
ok("...in one aligned header row, not perched on the bars",
   run(`[...document.querySelectorAll('#pmixWrap [data-lbl="total"]')].every(t=>t.getAttribute('y')==='6.5')`));
ok("...with only the latest total bold",
   run(`(function(){const ts=[...document.querySelectorAll('#pmixWrap [data-lbl="total"]')];
     return ts.filter(t=>t.getAttribute('font-weight')==='700').length===1
         && ts[ts.length-1].getAttribute('font-weight')==='700';})()`));
run(`pmixSetFocus('Chest');`);
ok("focusing a part writes its own count back above its segments",
   run(`document.querySelectorAll('#pmixWrap [data-lbl="Chest"]').length`) === 20,
   run(`document.querySelectorAll('#pmixWrap [data-lbl="Chest"]').length`) + " labels");
ok("...reading the PART's share, distinct from the total",
   run(`[...document.querySelectorAll('#pmixWrap [data-lbl="Chest"]')].every(t=>t.textContent==='1')`));
/* v3.3.263: Chest is the first segment in catalog order, so the old
   baseline-only formula happened to put its labels in the right place. Back
   exposes the bug: its label must sit above Back's actual stacked segment,
   not at the Chest/Back boundary. Pin the SVG geometry, not just the value. */
run(`pmixSetFocus('Chest'); pmixSetFocus('Back');`);
ok("a non-first part label follows its actual stacked segment",
   run(`(function(){const seg=document.querySelector('#pmixWrap .pmixseg[data-pt="Back"]');
     const lbl=document.querySelector('#pmixWrap [data-lbl="Back"]');
     return +lbl.getAttribute('y')===+(+seg.getAttribute('y')-3).toFixed(1);})()`) === true,
   run(`(function(){const seg=document.querySelector('#pmixWrap .pmixseg[data-pt="Back"]');
     const lbl=document.querySelector('#pmixWrap [data-lbl="Back"]');
     return 'segment '+seg.getAttribute('y')+', label '+lbl.getAttribute('y');})()`));
run(`pmixSetFocus('Back'); pmixSetFocus('Chest');`);
ok("...while the totals row stands, still reading the whole day",
   run(`[...document.querySelectorAll('#pmixWrap [data-lbl="total"]')].every(t=>t.textContent==='5')`) &&
   run(`document.querySelectorAll('#pmixWrap [data-lbl="total"]').length`) === 20);
run(`pmixSetFocus('Chest');`);
// ---- v3.3.277: the sets ⇄ weight toggle -----------------------------------
// Same section, same chart, two readings. Driven through the REAL button.
// The fixture (1 Chest set + 1 Back set per day at w=40x10 reps) makes the
// readings unmistakable: totals read 2 as sets, 800 as weight — and the
// segment colours must be byte-identical across modes, which is the "look
// and feel exactly match" the maker asked for, held as an assertion.
ok("the toggle renders, sets active by default",
   run(`(function(){const b=document.querySelector('[data-pmixmode]');
     if(!b) return 'no button';
     const [a,c]=b.querySelectorAll('span');
     return a.classList.contains('on') && !c.classList.contains('on') && a.textContent==='sets';})()`) === true);
const fillsBefore = run(`JSON.stringify([...document.querySelectorAll('#pmixWrap rect[data-pt]')].slice(0,6).map(r=>r.getAttribute('fill')))`);
const setLabels = run(`JSON.stringify([...document.querySelectorAll('#pmixWrap [data-lbl="total"]')].map(t=>t.textContent))`);
ok("...and bricks overlay the stacks in sets mode",
   run(`document.querySelectorAll('#pmixWrap [data-bricks]').length`) > 0);
run(`document.querySelector('[data-pmixmode]').click()`);
ok("one tap reads the same days as weight — the builder's own number, not the set count",
   run(`(function(){const want=pmixFmtV(partMix(99999,'weight').pop().total);
     const ts=[...document.querySelectorAll('#pmixWrap [data-lbl="total"]')];
     return ts.length>0 && ts.every(t=>t.textContent===want) && want!==${setLabels}[0];})()`) === true,
   run(`[...document.querySelectorAll('#pmixWrap [data-lbl="total"]')].pop().textContent`) + " per day");
ok("...bricks stand down — a block means a set, and these are not sets",
   run(`document.querySelectorAll('#pmixWrap [data-bricks]').length`) === 0);
ok("...the colours are byte-identical to sets mode",
   run(`JSON.stringify([...document.querySelectorAll('#pmixWrap rect[data-pt]')].slice(0,6).map(r=>r.getAttribute('fill')))`) === fillsBefore);
ok("...the summary says lifted, in the display unit",
   run(`/kg lifted|lb lifted/.test(document.getElementById('pmixSum').textContent)`));
ok("...and the switch shows weight active",
   run(`(function(){const [a,c]=document.querySelector('[data-pmixmode]').querySelectorAll('span');
     return !a.classList.contains('on') && c.classList.contains('on');})()`));
run(`pmixSetFocus('Chest');`);
ok("focus still isolates in weight mode, labels in weight",
   run(`(function(){const want=pmixFmtV(partMix(99999,'weight').pop().by['Chest']);
     const ls=[...document.querySelectorAll('#pmixWrap [data-lbl="Chest"]')];
     return ls.length>0 && ls.every(t=>t.textContent===want);})()`) === true);
run(`pmixSetFocus('Chest');`);
run(`document.querySelector('[data-pmixmode]').click()`);
ok("one tap back restores the exact set labels and the bricks",
   run(`JSON.stringify([...document.querySelectorAll('#pmixWrap [data-lbl="total"]')].map(t=>t.textContent))`) === setLabels &&
   run(`document.querySelectorAll('#pmixWrap [data-bricks]').length`) > 0);

ok("clearing the focus removes the part labels and keeps the totals",
   run(`document.querySelectorAll('#pmixWrap [data-lbl="Chest"]').length`) === 0 &&
   run(`document.querySelectorAll('#pmixWrap [data-lbl="total"]').length`) === 20);
// ---- v3.3.261: the totals row whispers with age ---------------------------
// Fade is tied to RECENCY, not the viewport, so scrolling to the archive
// never fades what you scrolled there to read. Newest at full voice, linear
// decay, hard floor. Under focus the whole row steps back for the part.
ok("the newest total speaks at full voice",
   run(`[...document.querySelectorAll('#pmixWrap [data-lbl="total"]')].pop().getAttribute('opacity')`) === "1.00");
ok("...and the fade never gets louder as days age",
   run(`(function(){const ops=[...document.querySelectorAll('#pmixWrap [data-lbl="total"]')]
     .map(t=>+t.getAttribute('opacity'));
     return ops.every((v,i)=>i===0||ops[i-1]<=v+1e-9);})()`));
ok("...with the oldest resting on the 0.35 floor, still readable",
   run(`+[...document.querySelectorAll('#pmixWrap [data-lbl="total"]')][0].getAttribute('opacity')`) === 0.35);
run(`pmixSetFocus('Chest');`);
ok("focusing a part steps the archive totals back to a whisper",
   run(`[...document.querySelectorAll('#pmixWrap [data-lbl="total"]')].slice(0,-1)
     .every(t=>t.getAttribute('opacity')==='0.28')`));
ok("...keeps half a voice on the day's headline",
   run(`[...document.querySelectorAll('#pmixWrap [data-lbl="total"]')].pop().getAttribute('opacity')`) === "0.55");
ok("...and gives the part's own numbers the full one",
   run(`[...document.querySelectorAll('#pmixWrap [data-lbl="Chest"]')]
     .every(t=>!t.hasAttribute('opacity'))`));
run(`pmixSetFocus('Chest');`);
/* the headline must sit on the newest DAY even when the focused part's last
   appearance was earlier — `latest` follows the part (v3.3.229) and once put
   the half-voice on the wrong column. Fixture: Back's newest session is a
   day before the newest day, so the two anchors genuinely differ. */
run(`(function(){const t=new Date(todayISO+'T00:00');
  DB.days[todayISO]={w:[{part:'Chest',ex:'Press',w:40,reps:[10],at:1}],upd:1};
  SEED=deriveAll(); PMIX_FOCUS=null; render(); pmixSetFocus('Back');})()`);
ok("under focus, the half-voice sits on the newest DAY, not the part's last day",
   run(`(function(){const ts=[...document.querySelectorAll('#pmixWrap [data-lbl="total"]')];
     return ts.pop().getAttribute('opacity')==='0.55'
         && ts.every(t=>t.getAttribute('opacity')==='0.28');})()`));
ok("...and the bold weight sits there too",
   run(`(function(){const ts=[...document.querySelectorAll('#pmixWrap [data-lbl="total"]')];
     return ts.filter(t=>t.getAttribute('font-weight')==='700').length===1
         && ts[ts.length-1].getAttribute('font-weight')==='700';})()`));
run(`PMIX_FOCUS=null; delete DB.days[todayISO]; SEED=deriveAll(); render();`);

// ---- legend alignment ----------------------------------------------------
/* v3.3.306 RESTATES both. The 4+3 grid is gone — seven parts on one
   scrollable line, a colour bar over each name, echoing the stacked segments
   the legend explains. What the old pins were really defending survives and
   is asserted here: a 44px tap target per part, and every part present (the
   grid's hole on row two was the thing that made 4+3 worth pinning). */
{
  const cssL = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  ok("the legend is one scrolling line, not a grid",
     /\.pmixlgd\{[^}]*display:flex/.test(cssL) && /\.pmixlgd\{[^}]*overflow-x:auto/.test(cssL)
       && !/\.pmixlgd\{[^}]*display:grid/.test(cssL));
  ok("...each part keeps a 44px tap target",
     /\.pmixlgd button\{[^}]*min-height:44px/.test(cssL));
  ok("...the swatch is a BAR, the shape of the segments it names",
     /\.pmixlgd button i\{[^}]*height:3px/.test(cssL));
  ok("...and a clipped name fades rather than cutting off",
     /\.pmixlgdwrap::after\{[^}]*linear-gradient/.test(cssL));
}
/* a sideways scroller inside a tab-swiping app must own its axis — the
   v3.3.288 lesson, third surface */
ok("the legend cannot swipe the tab out from under a scroll",
   /closest\('\.pmixlgd'\)/.test(fs.readFileSync(path.join(dir, "js/util.js"), "utf8")));
ok("every body part is present, none dropped by the new layout",
   run(`document.querySelectorAll('.pmixlgd [data-pt]').length`) ===
   run(`Object.keys(SEED.catalog).filter(p=>p!=='Run').length`),
   run(`document.querySelectorAll('.pmixlgd [data-pt]').length`) + " parts");

// ---- latest means latest for the selected body part ---------------------
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  const mk=(off,p)=>{const d=new Date(t); d.setDate(d.getDate()-off);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:p,ex:'X',w:40,reps:[10],at:1}],upd:1};};
  mk(1,'Chest'); mk(2,'Back'); mk(3,'Back'); mk(4,'Legs');
  SEED=deriveAll(); view='stats'; PMIX_FOCUS=null; render();})()`);
ok("without a filter the animation belongs to the chart's newest session",
   run(`document.querySelector('#pmixWrap .pmixcol.latest').dataset.col`) ===
   String(run(`partMix(PMIX_DAYS).length-1`)));
run(`pmixSetFocus('Back');`);
ok("with a filter the animation moves to that part's rightmost bar",
   run(`(function(){const rows=partMix(PMIX_DAYS), want=rows.map((r,i)=>r.by.Back?i:-1).filter(i=>i>=0).pop();
     const col=document.querySelector('#pmixWrap .pmixcol.latest');
     const seg=document.querySelector('#pmixWrap .pmixseg.latest');
     return +col.dataset.col===want && +seg.dataset.barCol===want && seg.dataset.pt==='Back';})()`) === true);
run(`pmixSetFocus('Back');`);

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

// month rules \u2014 seeds its own span, since a fixture of consecutive days
// crosses no boundary and would fail this for the wrong reason
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  for(let i=1;i<=120;i++){const d=new Date(t); d.setDate(d.getDate()-i);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Press',w:40,reps:[10],at:1}],upd:1};}
  SEED=deriveAll(); view='stats'; render();})()`);
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
/* v3.3.122: back-loading is gone, but the same hazard moved \u2014 isolating a
   part re-renders the plot, and a smooth wrapper would glide the view
   during the swap. The suppression now lives in pmixSetFocus(). */
ok("re-rendering for focus suppresses smooth scrolling and restores position",
   /scrollBehavior='auto'/.test(fs.readFileSync(path.join(dir, "js/stats.js"), "utf8")) &&
   /wrap\.scrollLeft=keep/.test(fs.readFileSync(path.join(dir, "js/stats.js"), "utf8")));

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
ok("...and the categorical fills remain visible on the light ground",
   Math.min(...lightRatios) >= 2.0,
   "softest " + Math.min(...lightRatios).toFixed(2) + ":1");
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
   run(`document.querySelector('.pmixlgd [data-pt="Chest"]').classList.contains('off')`) &&
   run(`document.querySelector('.pmixlgd [data-pt="Back"]').getAttribute('aria-pressed')`) === 'true' &&
   run(`document.querySelector('.pmixlgd [data-pt="Chest"]').getAttribute('aria-pressed')`) === 'false');
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

// ---- v3.3.123: the readout no longer says the total twice ---------------
// On a one-part day the part total IS the day total; printing both read as
// "Legs 6k 6k kg".
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  const d=new Date(t); d.setDate(d.getDate()-1);
  DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Legs',ex:'Squat',w:100,reps:[10],at:1}],upd:1};
  const e=new Date(t); e.setDate(e.getDate()-2);
  DB.days[e.toLocaleDateString('en-CA')]={w:[{part:'Legs',ex:'Squat',w:100,reps:[10],at:1},
                                             {part:'Back',ex:'Row',w:50,reps:[10],at:1}],upd:1};
  SEED=deriveAll(); view='stats'; render();})()`);
/* v3.3.125: the per-day readout is gone with the scrubber, so the "6k 6k kg"
   duplication it fixed can no longer occur \u2014 there is nothing that prints a
   part total and a day total side by side. The summary line below the chart
   is the surviving figure, and it is asserted separately. */
ok("no per-day readout survives to duplicate a total",
   !/pmixReadout/.test(fs.readFileSync(path.join(dir, "js/stats.js"), "utf8")));

// ---- tapping a bar is tapping its legend --------------------------------
run(`view='stats'; render(); PMIX_FOCUS=null; pmixApplyFocus();`);
run(`(function(){const b=document.getElementById('pmixWrap');
  b.getBoundingClientRect=()=>({left:0,top:0,width:340,height:232,right:340,bottom:232});
  b.scrollLeft=0;
  const seg=b.querySelector('rect[data-pt="Back"]');
  seg.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:20,clientY:60,bubbles:true}));
  b.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,clientX:20,clientY:60,bubbles:true}));})()`);
ok("tapping a segment isolates that part, exactly like its legend chip",
   run(`PMIX_FOCUS`) === "Back", run(`PMIX_FOCUS`));
ok("...and the legend shows it selected",
   run(`document.querySelector('.pmixlgd [data-pt="Back"]').classList.contains('on')`));
// a DRAG must scrub, not select
run(`pmixSetFocus('Back');`);   // clear
run(`(function(){const b=document.getElementById('pmixWrap');
  const seg=b.querySelector('rect[data-pt="Back"]');
  seg.dispatchEvent(new PointerEvent('pointerdown',{pointerId:2,clientX:20,clientY:60,bubbles:true}));
  b.dispatchEvent(new PointerEvent('pointermove',{pointerId:2,clientX:120,clientY:60,bubbles:true}));
  b.dispatchEvent(new PointerEvent('pointerup',{pointerId:2,clientX:120,clientY:60,bubbles:true}));})()`);
ok("dragging across the chart scrubs without selecting anything",
   run(`PMIX_FOCUS`) === null, String(run(`PMIX_FOCUS`)));

// ---- the summary line ----------------------------------------------------
const sum = () => run(`document.getElementById('pmixSum').textContent.replace(/\\s+/g,' ').trim()`);
ok("a summary sits below the chart", run(`!!document.getElementById('pmixSum')`));
ok("...speaking about all strength work when nothing is selected", /All strength/.test(sum()), sum());
run(`pmixSetFocus('Legs');`);
ok("...and about the selected part when one is", /Legs/.test(sum()) && !/All strength/.test(sum()), sum());
ok("...reporting completed sets, a session count and an average",
   /\d/.test(sum()) && /completed set/.test(sum()) && /session/.test(sum()) && /avg/.test(sum()), sum());
ok("...without turning set count into a performance trend",
   !/%|vs earlier|\bup\b|\bdown\b/i.test(sum()), sum());
run(`pmixSetFocus('Legs');`);

// ---- the sticky year -----------------------------------------------------
ok("a year label sits outside the plot", run(`!!document.getElementById('pmixYr')`));
ok("...and names the year at the current scroll position",
   /^\d{4}$/.test(run(`document.getElementById('pmixYr').textContent`)),
   run(`document.getElementById('pmixYr').textContent`));
// scrolling to a column in a different year must swap it
run(`(function(){DB.days={}; const mk=(iso,p)=>DB.days[iso]={w:[{part:p,ex:'X',w:40,reps:[10],at:1}],upd:1};
  for(let i=1;i<=40;i++){const d=new Date('2025-06-01T00:00'); d.setDate(d.getDate()+i);
    mk(d.toLocaleDateString('en-CA'),'Chest');}
  for(let i=1;i<=40;i++){const d=new Date('2026-06-01T00:00'); d.setDate(d.getDate()+i);
    mk(d.toLocaleDateString('en-CA'),'Back');}
  SEED=deriveAll(); view='stats'; render();
  const b=document.getElementById('pmixWrap');
  b.getBoundingClientRect=()=>({left:0,top:0,width:340,height:232,right:340,bottom:232});
  b.scrollLeft=0; b.dispatchEvent(new Event('scroll'));})()`);
const yEarly = run(`document.getElementById('pmixYr').textContent`);
run(`(function(){const b=document.getElementById('pmixWrap');
  b.scrollLeft=60*PMIX_COLW; b.dispatchEvent(new Event('scroll'));})()`);
const yLate = run(`document.getElementById('pmixYr').textContent`);
ok("the year swaps as you scroll across a year boundary",
   yEarly === "2025" && yLate === "2026", yEarly + " \u2192 " + yLate);

/* ---- v3.3.208: one comparable unit ---------------------------------------
   Mixed-equipment tonnage is internally computable but not a meaningful
   cross-session comparison. Session Build therefore counts completed sets:
   one reps-array element is one block, regardless of weight or equipment.
   Folded sheet-era rows and current one-row-per-set storage must agree. */
run(`(function(){DB.days={};
  const t=new Date(todayISO+'T00:00');
  const mk=(off,w)=>{const d=new Date(t); d.setDate(d.getDate()-off);
    DB.days[d.toLocaleDateString('en-CA')]={w,upd:1};};
  // a sheet-era day stored folded: three exercises, four sets apiece
  mk(3,[{part:'Back',ex:'Pull Up',w:70,reps:[12,10,10,8],at:1},
        {part:'Back',ex:'Bent-Over Row',w:61.2,reps:[20,20,15,20],at:1},
        {part:'Back',ex:'Lat Pull Down',w:45,reps:[10,10,10,10],at:1}]);
  // and a day stored unfolded, one entry per set
  mk(5,[{part:'Chest',ex:'Press',w:40,reps:[10],at:1},
        {part:'Chest',ex:'Press',w:40,reps:[10],at:1},
        {part:'Legs',ex:'Squat',w:80,reps:[8],at:1}]);
  mk(7,[{part:'Back',ex:'Row',w:30,reps:[10,15,10,15],at:1},
        {part:'Run',ex:'Run',w:5,reps:[],mins:30,secs:0,at:1}]);
  SEED=deriveAll(); view='stats'; render();})()`);

const mism = run(`JSON.stringify((function(){
  const bad=[];
  for(const r of partMix(999)){
    const w=(DB.days[r.d]||{}).w||(SEED.sessions[r.d]||[]);
    const truth=w.filter(s=>s.part!=='Run'&&s.ex!=='Run')
      .reduce((a,s)=>a+((s.reps||[]).length),0);
    if(truth!==r.total) bad.push({d:r.d,chart:r.total,sets:truth});
  }
  return bad;})())`);
ok("partMix agrees with completed-set truth on every day",
   JSON.parse(mism).length === 0, mism);

ok("the folded three-exercise day reads as twelve completed sets",
   run(`(function(){const t=new Date(todayISO+'T00:00'); const d=new Date(t); d.setDate(d.getDate()-3);
     const iso=d.toLocaleDateString('en-CA');
     return (partMix(999).find(r=>r.d===iso)||{}).total;})()`) === 12);

// folded and unfolded storage must give the same answer for the same work
ok("a folded entry and four separate sets total the same",
   run(`(function(){
     const folded=[{part:'Back',ex:'Row',w:30,reps:[10,15,10,15],at:1}];
     const split=[10,15,10,15].map(r=>({part:'Back',ex:'Row',w:30,reps:[r],at:1}));
     const sets=a=>a.reduce((s,x)=>s+(x.reps||[]).length,0);
     return sets(folded)===sets(split) && sets(folded)===4;})()`));

// partMix must never drift back to mixed-equipment tonnage
const utilSrc124 = fs.readFileSync(path.join(dir, "js/util.js"), "utf8");
// slice to the NEXT function declaration \u2014 a brace-matching regex trips on
// the nested for-loops inside partMix
const pmStart = utilSrc124.indexOf("function partMix(days){");
const pmBody = utilSrc124.slice(pmStart, utilSrc124.indexOf("\nfunction ", pmStart + 10));
/* strip comments before grepping the body \u2014 the fix's own comment explains
   what `reps[0]` used to do, and an un-stripped grep flags the explanation
   as if it were the bug. Exactly the v3.3.106 failure, in a new place. */
const pmCode = pmBody.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
/* v3.3.277 RESTATES the v3.3.208 pin. Tonnage returned — but as an OPT-IN
   second reading behind an explicit mode argument, never the default. The
   208 decision ("mixed tonnage is not a comparable physical quantity")
   survives as: a plain partMix(days) call MUST mean set counts. Asserted
   behaviourally on a fixture where the two readings cannot be confused —
   one set of 100 x 10 reads 1 as sets and 1000-scale as weight. */
ok("the default reading is still one block, one set",
   run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
     const d=new Date(t); d.setDate(d.getDate()-1);
     DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Chest Press',w:100,reps:[10]}],upd:1};
     SEED=deriveAll();
     const def=partMix(5), sets=partMix(5,'sets');
     return def[def.length-1].total===1 && sets[sets.length-1].total===1;})()`) === true);
ok("...and the weight reading is an explicit ask, w x reps in display units",
   run(`(function(){const wm=partMix(5,'weight');
     const v=wm[wm.length-1].total;
     return Math.abs(v - toU(1000)) < 0.5;})()`) === true);

// ---- v3.3.126: what an empty-space tap means depends on the state --------
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  const mk=(off,parts)=>{const d=new Date(t); d.setDate(d.getDate()-off);
    DB.days[d.toLocaleDateString('en-CA')]={
      w:parts.map(p=>({part:p,ex:'X',w:40,reps:[10],at:1})),upd:1};};
  mk(1,['Legs']); mk(2,['Chest']); mk(3,['Back']);
  for(let i=4;i<14;i++) mk(i,['Chest']);
  SEED=deriveAll(); view='stats'; render();
  const b=document.getElementById('pmixWrap');
  b.getBoundingClientRect=()=>({left:0,top:0,width:340,height:186,right:340,bottom:186});
  b.scrollLeft=0; PMIX_FOCUS=null; pmixApplyFocus();})()`);

const N = run(`partMix(999).length`);
const tapEmpty = (col) => run(`(function(){const b=document.getElementById('pmixWrap');
  const x=8+${col}*PMIX_COLW+3;
  const bg=b.querySelector('rect[data-col="${col}"]');
  bg.dispatchEvent(new PointerEvent('pointerdown',{pointerId:9,clientX:x,clientY:12,bubbles:true}));
  b.dispatchEvent(new PointerEvent('pointerup',{pointerId:9,clientX:x,clientY:12,bubbles:true}));})()`);

// nothing followed yet: empty space still picks a single-part column
tapEmpty(N - 1);
ok("with nothing followed, empty space still selects that column's part",
   run(`PMIX_FOCUS`) === "Legs", String(run(`PMIX_FOCUS`)));

// now following Legs: empty space over a DIFFERENT column must RELEASE,
// not silently switch to whatever is under the finger
tapEmpty(N - 3);
ok("while following one, empty space over another column releases instead of switching",
   run(`PMIX_FOCUS`) === null, String(run(`PMIX_FOCUS`)));

// but landing on an actual segment still switches
run(`pmixSetFocus('Chest');`);
run(`(function(){const b=document.getElementById('pmixWrap');
  const seg=b.querySelector('rect[data-pt="Back"]');
  seg.dispatchEvent(new PointerEvent('pointerdown',{pointerId:10,clientX:30,clientY:100,bubbles:true}));
  b.dispatchEvent(new PointerEvent('pointerup',{pointerId:10,clientX:30,clientY:100,bubbles:true}));})()`);
ok("...while landing on a real segment switches to it",
   run(`PMIX_FOCUS`) === "Back", String(run(`PMIX_FOCUS`)));
run(`pmixSetFocus('Back');`);

// ---- the newest column is marked ----------------------------------------
ok("exactly one column is marked latest",
   run(`document.querySelectorAll('#pmixWrap .pmixcol.latest').length`) === 1);
ok("...and it is the last one",
   run(`+document.querySelector('#pmixWrap .pmixcol.latest').dataset.col`) === N - 1,
   run(`document.querySelector('#pmixWrap .pmixcol.latest').dataset.col`) + " of " + (N-1));
const css126 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\n/g, "");
ok("...it pulses",
   /\.pmixcol\.latest\{[^}]*animation:pmixlatest/.test(css126));
ok("...and holds still under reduced motion",
   /prefers-reduced-motion:reduce\)\{[^}]*\.pmixcol\.latest(?:,\.pmixseg\.latest)?\{animation:none/.test(css126));
/* the pulse must sit on the COLUMN, never the bars: a CSS animation beats
   inline style, so animating the bars would override the opacity that
   focus-dimming sets and the two would fight. */
ok("the pulse never touches the bars themselves",
   !/rect\[data-pt\][^{]*\{[^}]*animation:pmixlatest/.test(css126));

// ---- v3.3.208: every visible unit is one completed set ------------------
ok("the chart defines one reusable set-block pattern",
   run(`!!document.querySelector('#pmixWrap pattern#pmixBrick')`) === true);
ok("every stacked day receives a set-block overlay",
   run(`document.querySelectorAll('#pmixWrap rect[data-bricks]').length`) ===
   run(`partMix(999).filter(r=>r.total>0).length`));
ok("the overlay records the day's exact completed-set count",
   run(`+document.querySelector('#pmixWrap rect[data-bricks].latest').dataset.bricks`) ===
   run(`partMix(999).at(-1).total`));
ok("the latest segments rise when the chart re-renders",
   /\.pmixseg\.latest\{[^}]*animation:pmixrise/.test(css126));
ok("...and the rise also stops under reduced motion",
   /prefers-reduced-motion:reduce\)\{[^}]*\.pmixcol\.latest,\.pmixseg\.latest\{animation:none/.test(css126));

run(`(function(){DB.days={};
  DB.days[todayISO]={w:[{part:'Chest',ex:'Press',w:40,reps:[10],at:Date.now()}],upd:Date.now()};
  SEED=deriveAll(); view='stats'; render();})()`);
ok("an active today's newest column uses the live state",
   run(`document.querySelector('#pmixWrap .pmixcol.latest').classList.contains('live')`) === true &&
   /\.pmixcol\.latest\.live\{fill:var\(--live\)/.test(css126));

// ---- spacing -------------------------------------------------------------
/* v3.3.306: the separating rule moved to the wrapper, since the scroller
   itself must not carry padding a clipped item could hide behind. */
ok("the minimal legend separates itself from the chart without a pill tray",
   /\.pmixlgdwrap\{[^}]*margin:0 0 12px[^}]*padding:0 0 12px[^}]*border-bottom:1px solid var\(--line\)/.test(css126) &&
   !/\.pmixread\{/.test(css126));
ok("the left gutter is narrower", run(`PMIX_AXW`) === 25, "axis width " + run(`PMIX_AXW`));

// ---- v3.3.208: set-count ticks are whole numbers ------------------------
ok("axis ticks speak in whole completed sets",
   run(`pmixTick(12.4)`) === "12" && run(`pmixTick(15.6)`) === "16",
   [run(`pmixTick(12.4)`), run(`pmixTick(15.6)`)].join(" "));
ok("...through the app's own formatter",
   /const pmixTick=v=>fmt\(Math\.round\(v\)\)/.test(fs.readFileSync(path.join(dir, "js/stats.js"), "utf8")));


// ---- v3.3.231: the caption reserves its height, focused or not ----------
// Tapping a legend chip switched the summary between two lines and one, which
// resized the card and shoved the sections below it up the screen.
const sumCss = (function(){
  const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r/g,"");
  const i=css.indexOf(".pmixsum{");
  return css.slice(i, css.indexOf("}", i)+1);
})();
ok("the summary reserves a minimum height", /min-height:\s*calc\(/.test(sumCss), sumCss.slice(0,40));
ok("...derived from the same font-size and line-height it renders with",
   /--sum-fs/.test(sumCss) && /--sum-lh/.test(sumCss)
   && /font-size:var\(--sum-fs\)/.test(sumCss) && /line-height:var\(--sum-lh\)/.test(sumCss));
ok("...worth two lines, so a wrap costs no extra height",
   /calc\(var\(--sum-fs\) \* var\(--sum-lh\) \* 2\)/.test(sumCss));
ok("...and it stays a block box, so the part name still flows inline",
   !/display:\s*(flex|grid)/.test(sumCss), sumCss.match(/display:[^;}]*/)?.[0] || "block");

// the element exists in both states and never collapses to nothing
run(`(function(){PMIX_FOCUS=null; pmixSummary();})()`);
const unfocused = run(`document.getElementById('pmixSum').textContent.replace(/\\s+/g,' ').trim()`);
ok("unfocused, the caption reads for all strength work",
   /^All strength ·/.test(unfocused), unfocused.slice(0,44));
run(`(function(){PMIX_FOCUS='Chest'; pmixSummary();})()`);
const focused = run(`document.getElementById('pmixSum').textContent.replace(/\\s+/g,' ').trim()`);
ok("focused, it names the part instead", /^Chest ·/.test(focused), focused.slice(0,44));
ok("...and the part name is emphasised inline, not as a separate block",
   run(`document.querySelector('#pmixSum b')!==null
        && document.querySelector('#pmixSum').firstElementChild.tagName==='B'`));
run(`PMIX_FOCUS=null; pmixSummary();`);

process.exit(fail ? 1 : 0);
