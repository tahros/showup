// test-pmix.js DIR â€” v3.3.208: the Session Build chart.
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
/* v3.3.209: Growth Audit replaces Rep Zones at the top of Stats. Session
   Build follows it immediately. */
ok("Session Build follows Growth Audit", run(`(function(){
  const hs=[...document.querySelectorAll('#view h2')];
  const t=h=>(h.childNodes[0]&&h.childNodes[0].nodeType===3?h.childNodes[0].textContent:h.textContent).trim();
  const names=hs.map(t);
  const gaIdx=names.indexOf('Growth audit');
  const pmIdx=names.indexOf('Session build');
  return gaIdx>=0 && pmIdx===gaIdx+1;})()`) === true);

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
for (const [label, set] of [["dark", dParts], ["light", lParts]])
  ok(`all ${label} part colours are distinct`,new Set(set.map(x=>x.toLowerCase())).size===set.length,set.join(' '));
// the separator is what lets the ramp work at all
const statsSrc120 = fs.readFileSync(path.join(dir, "js/stats.js"), "utf8");
ok("stacked segments are separated by a hairline, so touching blues still read",
   /stroke="var\(--ground\)" stroke-width="0\.5"/.test(statsSrc120));
// v3.3.217: the filters return to categorical colour so they can be found
// under a thumb without decoding seven nearly adjacent blues.
const hues = dParts.map(p => hueSat(p)[0]);
ok("the palette spans several hue families, not only blue",
   Math.max(...hues)-Math.min(...hues)>150,
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
const hint = () => run(`document.getElementById('pmixRead').textContent.replace(/\\s+/g,' ').trim()`);
ok("the line explains the unit and what tapping does",
   /One block = one completed set/.test(hint()) && /tap to follow/.test(hint()), hint());
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
  b.getBoundingClientRect=()=>({left:0,top:0,width:340,height:186,right:340,bottßmô¶‰ËkºwµçMÑ½É±° œÁµ¥á]É…ÀÉ•Ñm‘…Ñ„µÁÑtœ¥t¹•Ù•Éä¡Èôø…È¹ÍÑå±”¹½Á…¥Ñä¥€¤¤ì4)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ 	…¬œ¤í€¤ì4)½¬ ‰Ñ…ÁÁ¥¹œ„Á…ÉĞ‘¥µÌ•Ù•Éä½Ñ¡•ÈÁ…ÉĞˆ°4(€€ÉÕ¸¡l¸¸¹‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° œÁµ¥á]É…ÀÉ•Ñm‘…Ñ„µÁÑtœ¥t4(€€€€€€€€¹•Ù•Éä¡ÈôùÈ¹‘…Ñ…Í•Ğ¹ÁĞôôô	…¬œ€ü€…È¹ÍÑå±”¹½Á…¥Ñä€èÈ¹ÍÑå±”¹½Á…¥ÑäôôôœÀ¸ÄÈœ¥€¤¤ì4)½¬ ˆ¸¸¹…¹µ…É­ÌÑ¡”±••¹Í¼Ñ¡”Á…¥É¥¹œ¥ÌÕ¹…µ‰¥Õ½ÕÌˆ°4(€€ÉÕ¸¡‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½È œ¹Áµ¥á±m‘…Ñ„µÁĞô‰	…¬‰tœ¤¹±…ÍÍ1¥ÍĞ¹½¹Ñ…¥¹Ì ½¸œ¥€¤€˜˜4(€€ÉÕ¸¡‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½È œ¹Áµ¥á±m‘…Ñ„µÁĞô‰¡•ÍĞ‰tœ¤¹±…ÍÍ1¥ÍĞ¹½¹Ñ…¥¹Ì ½™˜œ¥€¤¤ì4)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ 	…¬œ¤í€¤ì4)½¬ ‰Ñ…ÁÁ¥¹œÑ¡”Í…µ”Á…ÉĞ……¥¸±•…ÉÌÑ¡”™½ÕÌˆ°4(€€ÉÕ¸¡A5%a}=UM€¤€ôôô¹Õ±°€˜˜4(€€ÉÕ¸¡l¸¸¹‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° œÁµ¥á]É…ÀÉ•Ñm‘…Ñ„µÁÑtœ¥t¹•Ù•Éä¡Èôø…È¹ÍÑå±”¹½Á…¥Ñä¥€¤¤ì4(4(¼¼™½ÕÌµÕÍĞÍÕÉÙ¥Ù”„‰…­İ…É‘Ì±½…°İ¡¥ É•Á±…•Ì•Ù•ÉäÉ•Ğ4)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ 1•Ìœ¤í€¤ì4)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í½¹ÍĞˆõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ìˆ¹ÍÉ½±±1•™ĞôÀì4(€ˆ¹‘¥ÍÁ…Ñ¡Ù•¹Ğ¡¹•ÜÙ•¹Ğ ÍÉ½±°œ¤¤íô¤ ¥€¤ì4)½¬ ‰™½ÕÌÍÕÉÙ¥Ù•Ì±½…‘¥¹œ½±‘•Èİ••­Ì€¡Ñ¡”¹•ÜÉ•ÑÌ•Ğ¥ĞÑ½¼¤ˆ°4(€€ÉÕ¸¡A5%a}=UM€¤€ôôô€‰1•Ìˆ€˜˜4(€€ÉÕ¸¡l¸¸¹‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° œÁµ¥á]É…ÀÉ•Ñm‘…Ñ„µÁÑtœ¥t4(€€€€€€€€¹™¥±Ñ•È¡ÈôùÈ¹‘…Ñ…Í•Ğ¹ÁĞ„ôô1•Ìœ¤¹•Ù•Éä¡ÈôùÈ¹ÍÑå±”¹½Á…¥ÑäôôôœÀ¸ÄÈœ¥€¤¤ì4)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ 1•Ìœ¤í€¤ì4(4(¼¼€´´´´ØÌ¸Ì¸ÄÈÌèÑ¡”É•…‘½ÕĞ¹¼±½¹•ÈÍ…åÌÑ¡”Ñ½Ñ…°Ñİ¥”€´´´´´´´´´´´´´´´4(¼¼=¸„½¹”µÁ…ÉĞ‘…äÑ¡”Á…ÉĞÑ½Ñ…°%LÑ¡”‘…äÑ½Ñ…°ìÁÉ¥¹Ñ¥¹œ‰½Ñ É•……Ì4(¼¼€‰1•Ì€Ù¬€Ù¬­œˆ¸4)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í¹‘…åÌõíôì½¹ÍĞĞõ¹•Ü…Ñ”¡Ñ½‘…å%M<¬PÀÀèÀÀœ¤ì4(€½¹ÍĞõ¹•Ü…Ñ”¡Ğ¤ì¹Í•Ñ…Ñ”¡¹•Ñ…Ñ” ¤´Ä¤ì4(€¹‘…åÍm¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¥tõíÜémíÁ…ÉĞè1•Ìœ±•àèMÅÕ…Ğœ±ÜèÄÀÀ±É•ÁÌélÄÁt±…ĞèÅõt±ÕÁèÅôì4(€½¹ÍĞ”õ¹•Ü…Ñ”¡Ğ¤ì”¹Í•Ñ…Ñ”¡”¹•Ñ…Ñ” ¤´È¤ì4(€¹‘…åÍm”¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¥tõíÜémíÁ…ÉĞè1•Ìœ±•àèMÅÕ…Ğœ±ÜèÄÀÀ±É•ÁÌélÄÁt±…ĞèÅô°4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€íÁ…ÉĞè	…¬œ±•àèI½Üœ±ÜèÔÀ±É•ÁÌélÄÁt±…ĞèÅõt±ÕÁèÅôì4(€Mõ‘•É¥Ù•±° ¤ìÙ¥•ÜôÍÑ…ÑÌœìÉ•¹‘•È ¤íô¤ ¥€¤ì4(¼¨ØÌ¸Ì¸ÄÈÔèÑ¡”Á•Èµ‘…äÉ•…‘½ÕĞ¥Ì½¹”İ¥Ñ Ñ¡”ÍÉÕ‰‰•È°Í¼Ñ¡”€ˆÙ¬€Ù¬­œˆ4(€€‘ÕÁ±¥…Ñ¥½¸¥Ğ™¥á•…¸¹¼±½¹•È½ÕÈqÔÈÀÄĞÑ¡•É”¥Ì¹½Ñ¡¥¹œÑ¡…ĞÁÉ¥¹ÑÌ„4(€€Á…ÉĞÑ½Ñ…°…¹„‘…äÑ½Ñ…°Í¥‘”‰äÍ¥‘”¸Q¡”ÍÕµµ…Éä±¥¹”‰•±½ÜÑ¡”¡…ÉĞ4(€€¥ÌÑ¡”ÍÕÉÙ¥Ù¥¹œ™¥ÕÉ”°…¹¥Ğ¥Ì…ÍÍ•ÉÑ•Í•Á…É…Ñ•±ä¸€¨¼4)½¬ ‰¹¼Á•Èµ‘…äÉ•…‘½ÕĞÍÕÉÙ¥Ù•ÌÑ¼‘ÕÁ±¥…Ñ”„Ñ½Ñ…°ˆ°4(€€€„½Áµ¥áI•…‘½ÕĞ¼¹Ñ•ÍĞ¡™Ì¹É•…‘¥±•Må¹Œ¡Á…Ñ ¹©½¥¸¡‘¥È°€‰©Ì½ÍÑ…ÑÌ¹©Ìˆ¤°€‰ÕÑ˜àˆ¤¤¤ì4(4(¼¼€´´´´Ñ…ÁÁ¥¹œ„‰…È¥ÌÑ…ÁÁ¥¹œ¥ÑÌ±••¹€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´4)ÉÕ¸¡Ù¥•ÜôÍÑ…ÑÌœìÉ•¹‘•È ¤ìA5%a}=ULõ¹Õ±°ìÁµ¥áÁÁ±å½ÕÌ ¤í€¤ì4)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í½¹ÍĞˆõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ì4(€ˆ¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ğô ¤ôø¡í±•™ĞèÀ±Ñ½ÀèÀ±İ¥‘Ñ èÌĞÀ±¡•¥¡ĞèÈÌÈ±É¥¡ĞèÌĞÀ±‰½ÑÑ½´èÈÌÉô¤ì4(€ˆ¹ÍÉ½±±1•™ĞôÀì4(€½¹ÍĞÍ•œõˆ¹ÅÕ•ÉåM•±•Ñ½È É•Ñm‘…Ñ„µÁĞô‰	…¬‰tœ¤ì4(€Í•œ¹‘¥ÍÁ…Ñ¡Ù•¹Ğ¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ğ Á½¥¹Ñ•É‘½İ¸œ±íÁ½¥¹Ñ•É%èÄ±±¥•¹Ñ`èÈÀ±±¥•¹ÑdèØÀ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤ì4(€ˆ¹‘¥ÍÁ…Ñ¡Ù•¹Ğ¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ğ Á½¥¹Ñ•ÉÕÀœ±íÁ½¥¹Ñ•É%èÄ±±¥•¹Ñ`èÈÀ±±¥•¹ÑdèØÀ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤íô¤ ¥€¤ì4)½¬ ‰Ñ…ÁÁ¥¹œ„Í•µ•¹Ğ¥Í½±…Ñ•ÌÑ¡…ĞÁ…ÉĞ°•á…Ñ±ä±¥­”¥ÑÌ±••¹¡¥Àˆ°4(€€ÉÕ¸¡A5%a}=UM€¤€ôôô€‰	…¬ˆ°ÉÕ¸¡A5%a}=UM€¤¤ì4)½¬ ˆ¸¸¹…¹Ñ¡”±••¹Í¡½İÌ¥ĞÍ•±•Ñ•ˆ°4(€€ÉÕ¸¡‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½È œ¹Áµ¥á±m‘…Ñ„µÁĞô‰	…¬‰tœ¤¹±…ÍÍ1¥ÍĞ¹½¹Ñ…¥¹Ì ½¸œ¥€¤¤ì4(¼¼„IµÕÍĞÍÉÕˆ°¹½ĞÍ•±•Ğ4)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ 	…¬œ¤í€¤ì€€€¼¼±•…È4)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í½¹ÍĞˆõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ì4(€½¹ÍĞÍ•œõˆ¹ÅÕ•ÉåM•±•Ñ½È É•Ñm‘…Ñ„µÁĞô‰	…¬‰tœ¤ì4(€Í•œ¹‘¥ÍÁ…Ñ¡Ù•¹Ğ¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ğ Á½¥¹Ñ•É‘½İ¸œ±íÁ½¥¹Ñ•É%èÈ±±¥•¹Ñ`èÈÀ±±¥•¹ÑdèØÀ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤ì4(€ˆ¹‘¥ÍÁ…Ñ¡Ù•¹Ğ¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ğ Á½¥¹Ñ•Éµ½Ù”œ±íÁ½¥¹Ñ•É%èÈ±±¥•¹Ñ`èÄÈÀ±±¥•¹ÑdèØÀ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤ì4(€ˆ¹‘¥ÍÁ…Ñ¡Ù•¹Ğ¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ğ Á½¥¹Ñ•ÉÕÀœ±íÁ½¥¹Ñ•É%èÈ±±¥•¹Ñ`èÄÈÀ±±¥•¹ÑdèØÀ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤íô¤ ¥€¤ì4)½¬ ‰‘É…¥¹œ…É½ÍÌÑ¡”¡…ÉĞÍÉÕ‰Ìİ¥Ñ¡½ÕĞÍ•±•Ñ¥¹œ…¹åÑ¡¥¹œˆ°4(€€ÉÕ¸¡A5%a}=UM€¤€ôôô¹Õ±°°MÑÉ¥¹œ¡ÉÕ¸¡A5%a}=UM€¤¤¤ì4(4(¼¼€´´´´Ñ¡”ÍÕµµ…Éä±¥¹”€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´4)½¹ÍĞÍÕ´€ô€ ¤€ôøÉÕ¸¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Áµ¥áMÕ´œ¤¹Ñ•áÑ½¹Ñ•¹Ğ¹É•Á±…” ½qqÌ¬½œ°œ€œ¤¹ÑÉ¥´ ¥€¤ì4)½¬ ‰„ÍÕµµ…ÉäÍ¥ÑÌ‰•±½ÜÑ¡”¡…ÉĞˆ°ÉÕ¸¡€„…‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Áµ¥áMÕ´œ¥€¤¤ì4)½¬ ˆ¸¸¹ÍÁ•…­¥¹œ…‰½ÕĞ…±°ÍÑÉ•¹Ñ İ½É¬İ¡•¸¹½Ñ¡¥¹œ¥ÌÍ•±•Ñ•ˆ°€½±°ÍÑÉ•¹Ñ ¼¹Ñ•ÍĞ¡ÍÕ´ ¤¤°ÍÕ´ ¤¤ì4)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ 1•Ìœ¤í€¤ì4)½¬ ˆ¸¸¹…¹…‰½ÕĞÑ¡”Í•±•Ñ•Á…ÉĞİ¡•¸½¹”¥Ìˆ°€½1•Ì¼¹Ñ•ÍĞ¡ÍÕ´ ¤¤€˜˜€„½±°ÍÑÉ•¹Ñ ¼¹Ñ•ÍĞ¡ÍÕ´ ¤¤°ÍÕ´ ¤¤ì4)½¬ ˆ¸¸¹É•Á½ÉÑ¥¹œ½µÁ±•Ñ•Í•ÑÌ°„Í•ÍÍ¥½¸½Õ¹Ğ…¹…¸…Ù•É…”ˆ°4(€€€½q¼¹Ñ•ÍĞ¡ÍÕ´ ¤¤€˜˜€½½µÁ±•Ñ•Í•Ğ¼¹Ñ•ÍĞ¡ÍÕ´ ¤¤€˜˜€½Í•ÍÍ¥½¸¼¹Ñ•ÍĞ¡ÍÕ´ ¤¤€˜˜€½…Ùœ¼¹Ñ•ÍĞ¡ÍÕ´ ¤¤°ÍÕ´ ¤¤ì4)½¬ ˆ¸¸¹İ¥Ñ¡½ÕĞÑÕÉ¹¥¹œÍ•Ğ½Õ¹Ğ¥¹Ñ¼„Á•É™½Éµ…¹”ÑÉ•¹ˆ°4(€€€„¼•ñÙÌ•…É±¥•Éñq‰ÕÁq‰ñq‰‘½İ¹qˆ½¤¹Ñ•ÍĞ¡ÍÕ´ ¤¤°ÍÕ´ ¤¤ì4)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ 1•Ìœ¤í€¤ì4(4(¼¼€´´´´Ñ¡”ÍÑ¥­äå•…È€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´4)½¬ ‰„å•…È±…‰•°Í¥ÑÌ½ÕÑÍ¥‘”Ñ¡”Á±½Ğˆ°ÉÕ¸¡€„…‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Áµ¥áeÈœ¥€¤¤ì4)½¬ ˆ¸¸¹…¹¹…µ•ÌÑ¡”å•…È…ĞÑ¡”ÕÉÉ•¹ĞÍÉ½±°Á½Í¥Ñ¥½¸ˆ°4(€€€½yq‘ìÑô¼¹Ñ•ÍĞ¡ÉÕ¸¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Áµ¥áeÈœ¤¹Ñ•áÑ½¹Ñ•¹Ñ€¤¤°4(€€ÉÕ¸¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Áµ¥áeÈœ¤¹Ñ•áÑ½¹Ñ•¹Ñ€¤¤ì4(¼¼ÍÉ½±±¥¹œÑ¼„½±Õµ¸¥¸„‘¥™™•É•¹Ğå•…ÈµÕÍĞÍİ…À¥Ğ4)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í¹‘…åÌõíôì½¹ÍĞµ¬ô¡¥Í¼±À¤ôù¹‘…åÍm¥Í½tõíÜémíÁ…ÉĞéÀ±•àè`œ±ÜèĞÀ±É•ÁÌélÄÁt±…ĞèÅõt±ÕÁèÅôì4(€™½È¡±•Ğ¤ôÄí¤ğôĞÀí¤¬¬¥í½¹ÍĞõ¹•Ü…Ñ” œÈÀÈÔ´ÀØ´ÀÅPÀÀèÀÀœ¤ì¹Í•Ñ…Ñ”¡¹•Ñ…Ñ” ¤­¤¤ì4(€€€µ¬¡¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¤°¡•ÍĞœ¤íô4(€™½È¡±•Ğ¤ôÄí¤ğôĞÀí¤¬¬¥í½¹ÍĞõ¹•Ü…Ñ” œÈÀÈØ´ÀØ´ÀÅPÀÀèÀÀœ¤ì¹Í•Ñ…Ñ”¡¹•Ñ…Ñ” ¤­¤¤ì4(€€€µ¬¡¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¤°	…¬œ¤íô4(€Mõ‘•É¥Ù•±° ¤ìÙ¥•ÜôÍÑ…ÑÌœìÉ•¹‘•È ¤ì4(€½¹ÍĞˆõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ì4(€ˆ¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ğô ¤ôø¡í±•™ĞèÀ±Ñ½ÀèÀ±İ¥‘Ñ èÌĞÀ±¡•¥¡ĞèÈÌÈ±É¥¡ĞèÌĞÀ±‰½ÑÑ½´èÈÌÉô¤ì4(€ˆ¹ÍÉ½±±1•™ĞôÀìˆ¹‘¥ÍÁ…Ñ¡Ù•¹Ğ¡¹•ÜÙ•¹Ğ ÍÉ½±°œ¤¤íô¤ ¥€¤ì4)½¹ÍĞå…É±ä€ôÉÕ¸¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Áµ¥áeÈœ¤¹Ñ•áÑ½¹Ñ•¹Ñ€¤ì4)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í½¹ÍĞˆõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ì4(€ˆ¹ÍÉ½±±1•™ĞôØÀ©A5%a}=1\ìˆ¹‘¥ÍÁ…Ñ¡Ù•¹Ğ¡¹•ÜÙ•¹Ğ ÍÉ½±°œ¤¤íô¤ ¥€¤ì4)½¹ÍĞå1…Ñ”€ôÉÕ¸¡‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Áµ¥áeÈœ¤¹Ñ•áÑ½¹Ñ•¹Ñ€¤ì4)½¬ ‰Ñ¡”å•…ÈÍİ…ÁÌ…Ìå½ÔÍÉ½±°…É½ÍÌ„å•…È‰½Õ¹‘…Éäˆ°4(€€å…É±ä€ôôô€ˆÈÀÈÔˆ€˜˜å1…Ñ”€ôôô€ˆÈÀÈØˆ°å…É±ä€¬€ˆqÔÈÄäÈ€ˆ€¬å1…Ñ”¤ì4(4(¼¨€´´´´ØÌ¸Ì¸ÈÀàè½¹”½µÁ…É…‰±”Õ¹¥Ğ€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´4(€€5¥á•µ•ÅÕ¥Áµ•¹ĞÑ½¹¹…”¥Ì¥¹Ñ•É¹…±±ä½µÁÕÑ…‰±”‰ÕĞ¹½Ğ„µ•…¹¥¹™Õ°4(€€É½ÍÌµÍ•ÍÍ¥½¸½µÁ…É¥Í½¸¸M•ÍÍ¥½¸	Õ¥±Ñ¡•É•™½É”½Õ¹ÑÌ½µÁ±•Ñ•Í•ÑÌè4(€€½¹”É•ÁÌµ…ÉÉ…ä•±•µ•¹Ğ¥Ì½¹”‰±½¬°É•…É‘±•ÍÌ½˜İ•¥¡Ğ½È•ÅÕ¥Áµ•¹Ğ¸4(€€½±‘•Í¡••Ğµ•É„É½İÌ…¹ÕÉÉ•¹Ğ½¹”µÉ½ÜµÁ•ÈµÍ•ĞÍÑ½É…”µÕÍĞ…É•”¸€¨¼4)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í¹‘…åÌõíôì4(€½¹ÍĞĞõ¹•Ü…Ñ”¡Ñ½‘…å%M<¬PÀÀèÀÀœ¤ì4(€½¹ÍĞµ¬ô¡½™˜±Ü¤ôùí½¹ÍĞõ¹•Ü…Ñ”¡Ğ¤ì¹Í•Ñ…Ñ”¡¹•Ñ…Ñ” ¤µ½™˜¤ì4(€€€¹‘…åÍm¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¥tõíÜ±ÕÁèÅôíôì4(€€¼¼„Í¡••Ğµ•É„‘…äÍÑ½É•™½±‘•èÑ¡É•”•á•É¥Í•Ì°™½ÕÈÍ•ÑÌ…Á¥•”4(€µ¬ Ì±míÁ…ÉĞè	…¬œ±•àèAÕ±°UÀœ±ÜèÜÀ±É•ÁÌélÄÈ°ÄÀ°ÄÀ°át±…ĞèÅô°4(€€€€€€€íÁ…ÉĞè	…¬œ±•àè	•¹Ğµ=Ù•ÈI½Üœ±ÜèØÄ¸È±É•ÁÌélÈÀ°ÈÀ°ÄÔ°ÈÁt±…ĞèÅô°4(€€€€€€€íÁ…ÉĞè	…¬œ±•àè1…ĞAÕ±°½İ¸œ±ÜèĞÔ±É•ÁÌélÄÀ°ÄÀ°ÄÀ°ÄÁt±…ĞèÅõt¤ì4(€€¼¼…¹„‘…äÍÑ½É•Õ¹™½±‘•°½¹”•¹ÑÉäÁ•ÈÍ•Ğ4(€µ¬ Ô±míÁ…ÉĞè¡•ÍĞœ±•àèAÉ•ÍÌœ±ÜèĞÀ±É•ÁÌélÄÁt±…ĞèÅô°4(€€€€€€€íÁ…ÉĞè¡•ÍĞœ±•àèAÉ•ÍÌœ±ÜèĞÀ±É•ÁÌélÄÁt±…ĞèÅô°4(€€€€€€€íÁ…ÉĞè1•Ìœ±•àèMÅÕ…Ğœ±ÜèàÀ±É•ÁÌélát±…ĞèÅõt¤ì4(€µ¬ Ü±míÁ…ÉĞè	…¬œ±•àèI½Üœ±ÜèÌÀ±É•ÁÌélÄÀ°ÄÔ°ÄÀ°ÄÕt±…ĞèÅô°4(€€€€€€€íÁ…ÉĞèIÕ¸œ±•àèIÕ¸œ±ÜèÔ±É•ÁÌémt±µ¥¹ÌèÌÀ±Í•ÌèÀ±…ĞèÅõt¤ì4(€Mõ‘•É¥Ù•±° ¤ìÙ¥•ÜôÍÑ…ÑÌœìÉ•¹‘•È ¤íô¤ ¥€¤ì4(4)½¹ÍĞµ¥Í´€ôÉÕ¸¡)M=8¹ÍÑÉ¥¹¥™ä ¡™Õ¹Ñ¥½¸ ¥ì4(€½¹ÍĞ‰…õmtì4(€™½È¡½¹ÍĞÈ½˜Á…ÉÑ5¥à äää¤¥ì4(€€€½¹ÍĞÜô¡¹‘…åÍmÈ¹‘uññíô¤¹İñğ¡M¹Í•ÍÍ¥½¹ÍmÈ¹‘uññmt¤ì4(€€€½¹ÍĞÑÉÕÑ õÜ¹™¥±Ñ•È¡ÌôùÌ¹Á…ÉĞ„ôôIÕ¸œ˜™Ì¹•à„ôôIÕ¸œ¤4(€€€€€€¹É•‘Õ” ¡„±Ì¤ôù„¬ ¡Ì¹É•ÁÍññmt¤¹±•¹Ñ ¤°À¤ì4(€€€¥˜¡ÑÉÕÑ „ôõÈ¹Ñ½Ñ…°¤‰…¹ÁÕÍ ¡íéÈ¹±¡…ÉĞéÈ¹Ñ½Ñ…°±Í•ÑÌéÑÉÕÑ¡ô¤ì4(€ô4(€É•ÑÕÉ¸‰…íô¤ ¤¥€¤ì4)½¬ ‰Á…ÉÑ5¥à…É••Ìİ¥Ñ ½µÁ±•Ñ•µÍ•ĞÑÉÕÑ ½¸•Ù•Éä‘…äˆ°4(€€)M=8¹Á…ÉÍ”¡µ¥Í´¤¹±•¹Ñ €ôôô€À°µ¥Í´¤ì4(4)½¬ ‰Ñ¡”™½±‘•Ñ¡É•”µ•á•É¥Í”‘…äÉ•…‘Ì…ÌÑİ•±Ù”½µÁ±•Ñ•Í•ÑÌˆ°4(€€ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í½¹ÍĞĞõ¹•Ü…Ñ”¡Ñ½‘…å%M<¬PÀÀèÀÀœ¤ì½¹ÍĞõ¹•Ü…Ñ”¡Ğ¤ì¹Í•Ñ…Ñ”¡¹•Ñ…Ñ” ¤´Ì¤ì4(€€€€½¹ÍĞ¥Í¼õ¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¤ì4(€€€€É•ÑÕÉ¸€¡Á…ÉÑ5¥à äää¤¹™¥¹¡ÈôùÈ¹ôôõ¥Í¼¥ññíô¤¹Ñ½Ñ…°íô¤ ¥€¤€ôôô€ÄÈ¤ì4(4(¼¼™½±‘•…¹Õ¹™½±‘•ÍÑ½É…”µÕÍĞ¥Ù”Ñ¡”Í…µ”…¹Íİ•È™½ÈÑ¡”Í…µ”İ½É¬4)½¬ ‰„™½±‘••¹ÑÉä…¹™½ÕÈÍ•Á…É…Ñ”Í•ÑÌÑ½Ñ…°Ñ¡”Í…µ”ˆ°4(€€ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥ì4(€€€€½¹ÍĞ™½±‘•õmíÁ…ÉĞè	…¬œ±•àèI½Üœ±ÜèÌÀ±É•ÁÌélÄÀ°ÄÔ°ÄÀ°ÄÕt±…ĞèÅõtì4(€€€€½¹ÍĞÍÁ±¥ĞõlÄÀ°ÄÔ°ÄÀ°ÄÕt¹µ…À¡Èôø¡íÁ…ÉĞè	…¬œ±•àèI½Üœ±ÜèÌÀ±É•ÁÌémÉt±…ĞèÅô¤¤ì4(€€€€½¹ÍĞÍ•ÑÌõ„ôù„¹É•‘Õ” ¡Ì±à¤ôùÌ¬¡à¹É•ÁÍññmt¤¹±•¹Ñ °À¤ì4(€€€€É•ÑÕÉ¸Í•ÑÌ¡™½±‘•¤ôôõÍ•ÑÌ¡ÍÁ±¥Ğ¤€˜˜Í•ÑÌ¡™½±‘•¤ôôôĞíô¤ ¥€¤¤ì4(4(¼¼Á…ÉÑ5¥àµÕÍĞ¹•Ù•È‘É¥™Ğ‰…¬Ñ¼µ¥á•µ•ÅÕ¥Áµ•¹ĞÑ½¹¹…”4)½¹ÍĞÕÑ¥±MÉŒÄÈĞ€ô™Ì¹É•…‘¥±•Må¹Œ¡Á…Ñ ¹©½¥¸¡‘¥È°€‰©Ì½ÕÑ¥°¹©Ìˆ¤°€‰ÕÑ˜àˆ¤ì4(¼¼Í±¥”Ñ¼Ñ¡”9aP™Õ¹Ñ¥½¸‘•±…É…Ñ¥½¸qÔÈÀÄĞ„‰É…”µµ…Ñ¡¥¹œÉ••àÑÉ¥ÁÌ½¸4(¼¼Ñ¡”¹•ÍÑ•™½Èµ±½½ÁÌ¥¹Í¥‘”Á…ÉÑ5¥à4)½¹ÍĞÁµMÑ…ÉĞ€ôÕÑ¥±MÉŒÄÈĞ¹¥¹‘•á=˜ ‰™Õ¹Ñ¥½¸Á…ÉÑ5¥à¡‘…åÌ¥ìˆ¤ì4)½¹ÍĞÁµ	½‘ä€ôÕÑ¥±MÉŒÄÈĞ¹Í±¥”¡ÁµMÑ…ÉĞ°ÕÑ¥±MÉŒÄÈĞ¹¥¹‘•á=˜ ‰q¹™Õ¹Ñ¥½¸€ˆ°ÁµMÑ…ÉĞ€¬€ÄÀ¤¤ì4(¼¨ÍÑÉ¥À½µµ•¹ÑÌ‰•™½É”É•ÁÁ¥¹œÑ¡”‰½‘äqÔÈÀÄĞÑ¡”™¥àÌ½İ¸½µµ•¹Ğ•áÁ±…¥¹Ì4(€€İ¡…ĞÉ•ÁÍlÁu€ÕÍ•Ñ¼‘¼°…¹…¸Õ¸µÍÑÉ¥ÁÁ•É•À™±…ÌÑ¡”•áÁ±…¹…Ñ¥½¸4(€€…Ì¥˜¥Ğİ•É”Ñ¡”‰Õœ¸á…Ñ±äÑ¡”ØÌ¸Ì¸ÄÀØ™…¥±ÕÉ”°¥¸„¹•ÜÁ±…”¸€¨¼4)½¹ÍĞÁµ½‘”€ôÁµ	½‘ä¹É•Á±…” ½p½p©mqÍqMt¨ıp©p¼½œ°€ˆˆ¤¹É•Á±…” ¼¡yñmxét¥p½p½myq¹t¨½œ°€ˆÄˆ¤ì4)½¬ ‰Á…ÉÑ5¥à½Õ¹ÑÌÉ•ÁÌµ…ÉÉ…ä•¹ÑÉ¥•Ì…¹¹•Ù•È½µÁÕÑ•ÌÑ½¹¹…”ˆ°4(€€€½p¡Íp¹É•ÁÍqñqñqmqup¥p¹±•¹Ñ ¼¹Ñ•ÍĞ¡Áµ½‘”¤€˜˜4(€€€„½Ù½±=™p¡Íp¥ñÍp¹İqÌ©p¨¼¹Ñ•ÍĞ¡Áµ½‘”¤°4(€€€½Ù½±=™p¡Íp¤¼¹Ñ•ÍĞ¡Áµ½‘”¤€ü€‰ÍÑ¥±°…±±ÌÙ½±=˜ˆ€è€‰Í•Ğ½Õ¹Ğ½¹±äˆ¤ì4(4(¼¼€´´´´ØÌ¸Ì¸ÄÈØèİ¡…Ğ…¸•µÁÑäµÍÁ…”Ñ…Àµ•…¹Ì‘•Á•¹‘Ì½¸Ñ¡”ÍÑ…Ñ”€´´´´´´´´4)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í¹‘…åÌõíôì½¹ÍĞĞõ¹•Ü…Ñ”¡Ñ½‘…å%M<¬PÀÀèÀÀœ¤ì4(€½¹ÍĞµ¬ô¡½™˜±Á…ÉÑÌ¤ôùí½¹ÍĞõ¹•Ü…Ñ”¡Ğ¤ì¹Í•Ñ…Ñ”¡¹•Ñ…Ñ” ¤µ½™˜¤ì4(€€€¹‘…åÍm¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¥tõì4(€€€€€ÜéÁ…ÉÑÌ¹µ…À¡Àôø¡íÁ…ÉĞéÀ±•àè`œ±ÜèĞÀ±É•ÁÌélÄÁt±…ĞèÅô¤¤±ÕÁèÅôíôì4(€µ¬ Ä±l1•Ìt¤ìµ¬ È±l¡•ÍĞt¤ìµ¬ Ì±l	…¬t¤ì4(€™½È¡±•Ğ¤ôĞí¤ğÄĞí¤¬¬¤µ¬¡¤±l¡•ÍĞt¤ì4(€Mõ‘•É¥Ù•±° ¤ìÙ¥•ÜôÍÑ…ÑÌœìÉ•¹‘•È ¤ì4(€½¹ÍĞˆõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ì4(€ˆ¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ğô ¤ôø¡í±•™ĞèÀ±Ñ½ÀèÀ±İ¥‘Ñ èÌĞÀ±¡•¥¡ĞèÄàØ±É¥¡ĞèÌĞÀ±‰½ÑÑ½´èÄàÙô¤ì4(€ˆ¹ÍÉ½±±1•™ĞôÀìA5%a}=ULõ¹Õ±°ìÁµ¥áÁÁ±å½ÕÌ ¤íô¤ ¥€¤ì4(4)½¹ÍĞ8€ôÉÕ¸¡Á…ÉÑ5¥à äää¤¹±•¹Ñ¡€¤ì4)½¹ÍĞÑ…ÁµÁÑä€ô€¡½°¤€ôøÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í½¹ÍĞˆõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ì4(€½¹ÍĞàôà¬‘í½±ô©A5%a}=1\¬Ìì4(€½¹ÍĞ‰œõˆ¹ÅÕ•ÉåM•±•Ñ½È É•Ñm‘…Ñ„µ½°ôˆ‘í½±ô‰tœ¤ì4(€‰œ¹‘¥ÍÁ…Ñ¡Ù•¹Ğ¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ğ Á½¥¹Ñ•É‘½İ¸œ±íÁ½¥¹Ñ•É%èä±±¥•¹Ñ`éà±±¥•¹ÑdèÄÈ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤ì4(€ˆ¹‘¥ÍÁ…Ñ¡Ù•¹Ğ¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ğ Á½¥¹Ñ•ÉÕÀœ±íÁ½¥¹Ñ•É%èä±±¥•¹Ñ`éà±±¥•¹ÑdèÄÈ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤íô¤ ¥€¤ì4(4(¼¼¹½Ñ¡¥¹œ™½±±½İ•å•Ğè•µÁÑäÍÁ…”ÍÑ¥±°Á¥­Ì„Í¥¹±”µÁ…ÉĞ½±Õµ¸4)Ñ…ÁµÁÑä¡8€´€Ä¤ì4)½¬ ‰İ¥Ñ ¹½Ñ¡¥¹œ™½±±½İ•°•µÁÑäÍÁ…”ÍÑ¥±°Í•±•ÑÌÑ¡…Ğ½±Õµ¸ÌÁ…ÉĞˆ°4(€€ÉÕ¸¡A5%a}=UM€¤€ôôô€‰1•Ìˆ°MÑÉ¥¹œ¡ÉÕ¸¡A5%a}=UM€¤¤¤ì4(4(¼¼¹½Ü™½±±½İ¥¹œ1•Ìè•µÁÑäÍÁ…”½Ù•È„%I9P½±Õµ¸µÕÍĞI1M°4(¼¼¹½ĞÍ¥±•¹Ñ±äÍİ¥Ñ Ñ¼İ¡…Ñ•Ù•È¥ÌÕ¹‘•ÈÑ¡”™¥¹•È4)Ñ…ÁµÁÑä¡8€´€Ì¤ì4)½¬ ‰İ¡¥±”™½±±½İ¥¹œ½¹”°•µÁÑäÍÁ…”½Ù•È…¹½Ñ¡•È½±Õµ¸É•±•…Í•Ì¥¹ÍÑ•…½˜Íİ¥Ñ¡¥¹œˆ°4(€€ÉÕ¸¡A5%a}=UM€¤€ôôô¹Õ±°°MÑÉ¥¹œ¡ÉÕ¸¡A5%a}=UM€¤¤¤ì4(4(¼¼‰ÕĞ±…¹‘¥¹œ½¸…¸…ÑÕ…°Í•µ•¹ĞÍÑ¥±°Íİ¥Ñ¡•Ì4)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ ¡•ÍĞœ¤í€¤ì4)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í½¹ÍĞˆõ‘½Õµ•¹Ğ¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ì4(€½¹ÍĞÍ•œõˆ¹ÅÕ•ÉåM•±•Ñ½È É•Ñm‘…Ñ„µÁĞô‰	…¬‰tœ¤ì4(€Í•œ¹‘¥ÍÁ…Ñ¡Ù•¹Ğ¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ğ Á½¥¹Ñ•É‘½İ¸œ±íÁ½¥¹Ñ•É%èÄÀ±±¥•¹Ñ`èÌÀ±±¥•¹ÑdèÄÀÀ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤ì4(€ˆ¹‘¥ÍÁ…Ñ¡Ù•¹Ğ¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ğ Á½¥¹Ñ•ÉÕÀœ±íÁ½¥¹Ñ•É%èÄÀ±±¥•¹Ñ`èÌÀ±±¥•¹ÑdèÄÀÀ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤íô¤ ¥€¤ì4)½¬ ˆ¸¸¹İ¡¥±”±…¹‘¥¹œ½¸„É•…°Í•µ•¹ĞÍİ¥Ñ¡•ÌÑ¼¥Ğˆ°4(€€ÉÕ¸¡A5%a}=UM€¤€ôôô€‰	…¬ˆ°MÑÉ¥¹œ¡ÉÕ¸¡A5%a}=UM€¤¤¤ì4)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ 	…¬œ¤í€¤ì4(4(¼¼€´´´´Ñ¡”¹•İ•ÍĞ½±Õµ¸¥Ìµ…É­•€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´4)½¬ ‰•á…Ñ±ä½¹”½±Õµ¸¥Ìµ…É­•±…Ñ•ÍĞˆ°4(€€ÉÕ¸¡‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° œÁµ¥á]É…À€¹Áµ¥á½°¹±…Ñ•ÍĞœ¤¹±•¹Ñ¡€¤€ôôô€Ä¤ì4)½¬ ˆ¸¸¹…¹¥Ğ¥ÌÑ¡”±…ÍĞ½¹”ˆ°4(€€ÉÕ¸¡€­‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½È œÁµ¥á]É…À€¹Áµ¥á½°¹±…Ñ•ÍĞœ¤¹‘…Ñ…Í•Ğ¹½±€¤€ôôô8€´€Ä°4(€€ÉÕ¸¡‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½È œÁµ¥á]É…À€¹Áµ¥á½°¹±…Ñ•ÍĞœ¤¹‘…Ñ…Í•Ğ¹½±€¤€¬€ˆ½˜€ˆ€¬€¡8´Ä¤¤ì4)½¹ÍĞÍÌÄÈØ€ô™Ì¹É•…‘¥±•Må¹Œ¡Á…Ñ ¹©½¥¸¡‘¥È°€‰ÍÌ½…ÁÀ¹ÍÌˆ¤°€‰ÕÑ˜àˆ¤¹É•Á±…” ½q¸½œ°€ˆˆ¤ì4)½¬ ˆ¸¸¹¥ĞÁÕ±Í•Ìˆ°4(€€€½p¹Áµ¥á½±p¹±…Ñ•ÍÑqímyõt©…¹¥µ…Ñ¥½¸éÁµ¥á±…Ñ•ÍĞ¼¹Ñ•ÍĞ¡ÍÌÄÈØ¤¤ì4)½¬ ˆ¸¸¹…¹¡½±‘ÌÍÑ¥±°Õ¹‘•ÈÉ•‘Õ•µ½Ñ¥½¸ˆ°4(€€€½ÁÉ•™•ÉÌµÉ•‘Õ•µµ½Ñ¥½¸éÉ•‘Õ•p¥qímyõt©p¹Áµ¥á½±p¹±…Ñ•ÍĞ üè±p¹Áµ¥áÍ•p¹±…Ñ•ÍĞ¤ıqí…¹¥µ…Ñ¥½¸é¹½¹”¼¹Ñ•ÍĞ¡ÍÌÄÈØ¤¤ì4(¼¨Ñ¡”ÁÕ±Í”µÕÍĞÍ¥Ğ½¸Ñ¡”=1U58°¹•Ù•ÈÑ¡”‰…ÉÌè„ML…¹¥µ…Ñ¥½¸‰•…ÑÌ4(€€¥¹±¥¹”ÍÑå±”°Í¼…¹¥µ…Ñ¥¹œÑ¡”‰…ÉÌİ½Õ±½Ù•ÉÉ¥‘”Ñ¡”½Á…¥ÑäÑ¡…Ğ4(€€™½ÕÌµ‘¥µµ¥¹œÍ•ÑÌ…¹Ñ¡”Ñİ¼İ½Õ±™¥¡Ğ¸€¨¼4)½¬ ‰Ñ¡”ÁÕ±Í”¹•Ù•ÈÑ½Õ¡•ÌÑ¡”‰…ÉÌÑ¡•µÍ•±Ù•Ìˆ°4(€€€„½É•Ñqm‘…Ñ„µÁÑqumyít©qímyõt©…¹¥µ…Ñ¥½¸éÁµ¥á±…Ñ•ÍĞ¼¹Ñ•ÍĞ¡ÍÌÄÈØ¤¤ì4(4(¼¼€´´´´ØÌ¸Ì¸ÈÀàè•Ù•ÉäÙ¥Í¥‰±”Õ¹¥Ğ¥Ì½¹”½µÁ±•Ñ•Í•Ğ€´´´´´´´´´´´´´´´´´´4)½¬ ‰Ñ¡”¡…ÉĞ‘•™¥¹•Ì½¹”É•ÕÍ…‰±”Í•Ğµ‰±½¬Á…ÑÑ•É¸ˆ°4(€€ÉÕ¸¡€„…‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½È œÁµ¥á]É…ÀÁ…ÑÑ•É¸Áµ¥á	É¥¬œ¥€¤€ôôôÑÉÕ”¤ì4)½¬ ‰•Ù•ÉäÍÑ…­•‘…äÉ••¥Ù•Ì„Í•Ğµ‰±½¬½Ù•É±…äˆ°4(€€ÉÕ¸¡‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° œÁµ¥á]É…ÀÉ•Ñm‘…Ñ„µ‰É¥­Ítœ¤¹±•¹Ñ¡€¤€ôôô4(€€ÉÕ¸¡Á…ÉÑ5¥à äää¤¹™¥±Ñ•È¡ÈôùÈ¹Ñ½Ñ…°øÀ¤¹±•¹Ñ¡€¤¤ì4)½¬ ‰Ñ¡”½Ù•É±…äÉ•½É‘ÌÑ¡”‘…äÌ•á…Ğ½µÁ±•Ñ•µÍ•Ğ½Õ¹Ğˆ°4(€€ÉÕ¸¡€­‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½È œÁµ¥á]É…ÀÉ•Ñm‘…Ñ„µ‰É¥­Ít¹±…Ñ•ÍĞœ¤¹‘…Ñ…Í•Ğ¹‰É¥­Í€¤€ôôô4(€€ÉÕ¸¡Á…ÉÑ5¥à äää¤¹…Ğ ´Ä¤¹Ñ½Ñ…±€¤¤ì4)½¬ ‰Ñ¡”±…Ñ•ÍĞÍ•µ•¹ÑÌÉ¥Í”İ¡•¸Ñ¡”¡…ÉĞÉ”µÉ•¹‘•ÉÌˆ°4(€€€½p¹Áµ¥áÍ•p¹±…Ñ•ÍÑqímyõt©…¹¥µ…Ñ¥½¸éÁµ¥áÉ¥Í”¼¹Ñ•ÍĞ¡ÍÌÄÈØ¤¤ì4)½¬ ˆ¸¸¹…¹Ñ¡”É¥Í”…±Í¼ÍÑ½ÁÌÕ¹‘•ÈÉ•‘Õ•µ½Ñ¥½¸ˆ°4(€€€½ÁÉ•™•ÉÌµÉ•‘Õ•µµ½Ñ¥½¸éÉ•‘Õ•p¥qímyõt©p¹Áµ¥á½±p¹±…Ñ•ÍĞ±p¹Áµ¥áÍ•p¹±…Ñ•ÍÑqí…¹¥µ…Ñ¥½¸é¹½¹”¼¹Ñ•ÍĞ¡ÍÌÄÈØ¤¤ì4(4)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í¹‘…åÌõíôì4(€¹‘…åÍmÑ½‘…å%M=tõíÜémíÁ…ÉĞè¡•ÍĞœ±•àèAÉ•ÍÌœ±ÜèĞÀ±É•ÁÌélÄÁt±…Ğé…Ñ”¹¹½Ü ¥õt±ÕÁé…Ñ”¹¹½Ü ¥ôì4(€Mõ‘•É¥Ù•±° ¤ìÙ¥•ÜôÍÑ…ÑÌœìÉ•¹‘•È ¤íô¤ ¥€¤ì4)½¬ ‰…¸…Ñ¥Ù”Ñ½‘…äÌ¹•İ•ÍĞ½±Õµ¸ÕÍ•ÌÑ¡”±¥Ù”ÍÑ…Ñ”ˆ°4(€€ÉÕ¸¡‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½È œÁµ¥á]É…À€¹Áµ¥á½°¹±…Ñ•ÍĞœ¤¹±…ÍÍ1¥ÍĞ¹½¹Ñ…¥¹Ì ±¥Ù”œ¥€¤€ôôôÑÉÕ”€˜˜4(€€€½p¹Áµ¥á½±p¹±…Ñ•ÍÑp¹±¥Ù•qí™¥±°éÙ…Ép ´µ±¥Ù•p¤¼¹Ñ•ÍĞ¡ÍÌÄÈØ¤¤ì4(4(¼¼€´´´´ÍÁ…¥¹œ€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´4)½¬ ‰Ñ¡”±••¹…¹Ñ¡”¡¥¹Ğ¡…Ù”É½½´‰•™½É”Ñ¡”¡…ÉĞˆ°4(€€€½p¹Áµ¥á±‘qímyõt©µ…É¥¸èÀ€À€ÄÑÁà¼¹Ñ•ÍĞ¡ÍÌÄÈØ¤€˜˜4(€€€½p¹Áµ¥áÉ•…‘qímyõt©µ…É¥¸èÀ€À€ÄÑÁà¼¹Ñ•ÍĞ¡ÍÌÄÈØ¤¤ì4)½¬ ‰Ñ¡”±•™ĞÕÑÑ•È¥Ì¹…ÉÉ½İ•Èˆ°ÉÕ¸¡A5%a}a]€¤€ôôô€ÈÔ°€‰…á¥Ìİ¥‘Ñ €ˆ€¬ÉÕ¸¡A5%a}a]€¤¤ì4(4(¼¼€´´´´ØÌ¸Ì¸ÈÀàèÍ•Ğµ½Õ¹ĞÑ¥­Ì…É”İ¡½±”¹Õµ‰•ÉÌ€´´´´´´´´´´´´´´´´´´´´´´´´4)½¬ ‰…á¥ÌÑ¥­ÌÍÁ•…¬¥¸İ¡½±”½µÁ±•Ñ•Í•ÑÌˆ°4(€€ÉÕ¸¡Áµ¥áQ¥¬ ÄÈ¸Ğ¥€¤€ôôô€ˆÄÈˆ€˜˜ÉÕ¸¡Áµ¥áQ¥¬ ÄÔ¸Ø¥€¤€ôôô€ˆÄØˆ°4(€€mÉÕ¸¡Áµ¥áQ¥¬ ÄÈ¸Ğ¥€¤°ÉÕ¸¡Áµ¥áQ¥¬ ÄÔ¸Ø¥€¥t¹©½¥¸ ˆ€ˆ¤¤ì4)½¬ ˆ¸¸¹Ñ¡É½Õ Ñ¡”…ÁÀÌ½İ¸™½Éµ…ÑÑ•Èˆ°4(€€€½½¹ÍĞÁµ¥áQ¥¬õØôù™µÑp¡5…Ñ¡p¹É½Õ¹‘p¡Ùp¥p¤¼¹Ñ•ÍĞ¡™Ì¹É•…‘¥±•Må¹Œ¡Á…Ñ ¹©½¥¸¡‘¥È°€‰©Ì½ÍÑ…ÑÌ¹©Ìˆ¤°€‰ÕÑ˜àˆ¤¤¤ì4(4)ÁÉ½•ÍÌ¹•á¥Ğ¡™…¥°€ü€Ä€è€À¤ì4(