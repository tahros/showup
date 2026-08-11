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
/* v3.3.185: Rep zones moved to the top of Stats. v3.3.188: it broke out into
   ONE SECTION PER BODY PART, so Session Build's index is no longer fixed â€”
   the invariant that survives is ORDER: every Rep-zone section precedes
   Session Build, and Session Build follows the last of them immediately. */
ok("Session Build follows the Rep-zone sections", run(`(function(){
  const hs=[...document.querySelectorAll('#view h2')];
  const t=h=>(h.childNodes[0]&&h.childNodes[0].nodeType===3?h.childNodes[0].textContent:h.textContent).trim();
  const names=hs.map(t);
  const rzIdx=names.map((n,i)=>/^Rep zones/.test(n)?i:-1).filter(i=>i>-1);
  const pmIdx=names.indexOf('Session build');
  return rzIdx.length>0 && pmIdx===rzIdx[rzIdx.length-1]+1 && rzIdx[0]===1;})()`) === true);

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
  mk(1,[{part:'Legs',ex:'Squat',w:100,reps:[10ßn5¶‰žËkºwµçL¡Á…Ñ ¹©½¥¸¡‘¥È°€‰Ñ½½±Ì½‰Õ¥±‘¡•¬¹Áäˆ¤°€‰ÕÑ˜àˆ¤¤¤ì((¼¼Ñ…ÀµÑ¼µ¥Í½±…Ñ”èÑ¡”…¹ÍÝ•ÈÑ¼€‰Ý¡¥ ½±½ÕÈ¥ÌÝ¡¥ Á…ÉÐˆ)ÉÕ¸¡Ù¥•ÜôÍÑ…ÑÌœìÉ•¹‘•È ¤ìA5%a}=ULõ¹Õ±°ìÁµ¥áÁÁ±å½ÕÌ ¤í€¤ì)½¬ ‰¹½Ñ¡¥¹œ¥Ì‘¥µµ•‰•™½É”å½ÔÑ…Àˆ°(€€ÉÕ¸¡l¸¸¹‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½É±° œÁµ¥á]É…ÀÉ•Ñm‘…Ñ„µÁÑtœ¥t¹•Ù•Éä¡Èôø…È¹ÍÑå±”¹½Á…¥Ñä¥€¤¤ì)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ 	…¬œ¤í€¤ì)½¬ ‰Ñ…ÁÁ¥¹œ„Á…ÉÐ‘¥µÌ•Ù•Éä½Ñ¡•ÈÁ…ÉÐˆ°(€€ÉÕ¸¡l¸¸¹‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½É±° œÁµ¥á]É…ÀÉ•Ñm‘…Ñ„µÁÑtœ¥t(€€€€€€€€¹•Ù•Éä¡ÈôùÈ¹‘…Ñ…Í•Ð¹ÁÐôôô	…¬œ€ü€…È¹ÍÑå±”¹½Á…¥Ñä€èÈ¹ÍÑå±”¹½Á…¥ÑäôôôœÀ¸ÄÈœ¥€¤¤ì)½¬ ˆ¸¸¹…¹µ…É­ÌÑ¡”±••¹Í¼Ñ¡”Á…¥É¥¹œ¥ÌÕ¹…µ‰¥Õ½ÕÌˆ°(€€ÉÕ¸¡‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œ¹Áµ¥á±m‘…Ñ„µÁÐô‰	…¬‰tœ¤¹±…ÍÍ1¥ÍÐ¹½¹Ñ…¥¹Ì ½¸œ¥€¤€˜˜(€€ÉÕ¸¡‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œ¹Áµ¥á±m‘…Ñ„µÁÐô‰¡•ÍÐ‰tœ¤¹±…ÍÍ1¥ÍÐ¹½¹Ñ…¥¹Ì ½™˜œ¥€¤¤ì)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ 	…¬œ¤í€¤ì)½¬ ‰Ñ…ÁÁ¥¹œÑ¡”Í…µ”Á…ÉÐ……¥¸±•…ÉÌÑ¡”™½ÕÌˆ°(€€ÉÕ¸¡A5%a}=UM€¤€ôôô¹Õ±°€˜˜(€€ÉÕ¸¡l¸¸¹‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½É±° œÁµ¥á]É…ÀÉ•Ñm‘…Ñ„µÁÑtœ¥t¹•Ù•Éä¡Èôø…È¹ÍÑå±”¹½Á…¥Ñä¥€¤¤ì((¼¼™½ÕÌµÕÍÐÍÕÉÙ¥Ù”„‰…­Ý…É‘Ì±½…°Ý¡¥ É•Á±…•Ì•Ù•ÉäÉ•Ð)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ 1•Ìœ¤í€¤ì)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í½¹ÍÐˆõ‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ìˆ¹ÍÉ½±±1•™ÐôÀì(€ˆ¹‘¥ÍÁ…Ñ¡Ù•¹Ð¡¹•ÜÙ•¹Ð ÍÉ½±°œ¤¤íô¤ ¥€¤ì)½¬ ‰™½ÕÌÍÕÉÙ¥Ù•Ì±½…‘¥¹œ½±‘•ÈÝ••­Ì€¡Ñ¡”¹•ÜÉ•ÑÌ•Ð¥ÐÑ½¼¤ˆ°(€€ÉÕ¸¡A5%a}=UM€¤€ôôô€‰1•Ìˆ€˜˜(€€ÉÕ¸¡l¸¸¹‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½É±° œÁµ¥á]É…ÀÉ•Ñm‘…Ñ„µÁÑtœ¥t(€€€€€€€€¹™¥±Ñ•È¡ÈôùÈ¹‘…Ñ…Í•Ð¹ÁÐ„ôô1•Ìœ¤¹•Ù•Éä¡ÈôùÈ¹ÍÑå±”¹½Á…¥ÑäôôôœÀ¸ÄÈœ¥€¤¤ì)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ 1•Ìœ¤í€¤ì((¼¼€´´´´ØÌ¸Ì¸ÄÈÌèÑ¡”É•…‘½ÕÐ¹¼±½¹•ÈÍ…åÌÑ¡”Ñ½Ñ…°ÑÝ¥”€´´´´´´´´´´´´´´´(¼¼=¸„½¹”µÁ…ÉÐ‘…äÑ¡”Á…ÉÐÑ½Ñ…°%LÑ¡”‘…äÑ½Ñ…°ìÁÉ¥¹Ñ¥¹œ‰½Ñ É•……Ì(¼¼€‰1•Ì€Ù¬€Ù¬­œˆ¸)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í¹‘…åÌõíôì½¹ÍÐÐõ¹•Ü…Ñ”¡Ñ½‘…å%M<¬PÀÀèÀÀœ¤ì(€½¹ÍÐõ¹•Ü…Ñ”¡Ð¤ì¹Í•Ñ…Ñ”¡¹•Ñ…Ñ” ¤´Ä¤ì(€¹‘…åÍm¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¥tõíÜémíÁ…ÉÐè1•Ìœ±•àèMÅÕ…Ðœ±ÜèÄÀÀ±É•ÁÌélÄÁt±…ÐèÅõt±ÕÁèÅôì(€½¹ÍÐ”õ¹•Ü…Ñ”¡Ð¤ì”¹Í•Ñ…Ñ”¡”¹•Ñ…Ñ” ¤´È¤ì(€¹‘…åÍm”¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¥tõíÜémíÁ…ÉÐè1•Ìœ±•àèMÅÕ…Ðœ±ÜèÄÀÀ±É•ÁÌélÄÁt±…ÐèÅô°(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€íÁ…ÉÐè	…¬œ±•àèI½Üœ±ÜèÔÀ±É•ÁÌélÄÁt±…ÐèÅõt±ÕÁèÅôì(€Mõ‘•É¥Ù•±° ¤ìÙ¥•ÜôÍÑ…ÑÌœìÉ•¹‘•È ¤íô¤ ¥€¤ì(¼¨ØÌ¸Ì¸ÄÈÔèÑ¡”Á•Èµ‘…äÉ•…‘½ÕÐ¥Ì½¹”Ý¥Ñ Ñ¡”ÍÉÕ‰‰•È°Í¼Ñ¡”€ˆÙ¬€Ù¬­œˆ(€€‘ÕÁ±¥…Ñ¥½¸¥Ð™¥á•…¸¹¼±½¹•È½ÕÈqÔÈÀÄÐÑ¡•É”¥Ì¹½Ñ¡¥¹œÑ¡…ÐÁÉ¥¹ÑÌ„(€€Á…ÉÐÑ½Ñ…°…¹„‘…äÑ½Ñ…°Í¥‘”‰äÍ¥‘”¸Q¡”ÍÕµµ…Éä±¥¹”‰•±½ÜÑ¡”¡…ÉÐ(€€¥ÌÑ¡”ÍÕÉÙ¥Ù¥¹œ™¥ÕÉ”°…¹¥Ð¥Ì…ÍÍ•ÉÑ•Í•Á…É…Ñ•±ä¸€¨¼)½¬ ‰¹¼Á•Èµ‘…äÉ•…‘½ÕÐÍÕÉÙ¥Ù•ÌÑ¼‘ÕÁ±¥…Ñ”„Ñ½Ñ…°ˆ°(€€€„½Áµ¥áI•…‘½ÕÐ¼¹Ñ•ÍÐ¡™Ì¹É•…‘¥±•Må¹Œ¡Á…Ñ ¹©½¥¸¡‘¥È°€‰©Ì½ÍÑ…ÑÌ¹©Ìˆ¤°€‰ÕÑ˜àˆ¤¤¤ì((¼¼€´´´´Ñ…ÁÁ¥¹œ„‰…È¥ÌÑ…ÁÁ¥¹œ¥ÑÌ±••¹€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´)ÉÕ¸¡Ù¥•ÜôÍÑ…ÑÌœìÉ•¹‘•È ¤ìA5%a}=ULõ¹Õ±°ìÁµ¥áÁÁ±å½ÕÌ ¤í€¤ì)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í½¹ÍÐˆõ‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ì(€ˆ¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ðô ¤ôø¡í±•™ÐèÀ±Ñ½ÀèÀ±Ý¥‘Ñ èÌÐÀ±¡•¥¡ÐèÈÌÈ±É¥¡ÐèÌÐÀ±‰½ÑÑ½´èÈÌÉô¤ì(€ˆ¹ÍÉ½±±1•™ÐôÀì(€½¹ÍÐÍ•œõˆ¹ÅÕ•ÉåM•±•Ñ½È É•Ñm‘…Ñ„µÁÐô‰	…¬‰tœ¤ì(€Í•œ¹‘¥ÍÁ…Ñ¡Ù•¹Ð¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ð Á½¥¹Ñ•É‘½Ý¸œ±íÁ½¥¹Ñ•É%èÄ±±¥•¹Ñ`èÈÀ±±¥•¹ÑdèØÀ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤ì(€ˆ¹‘¥ÍÁ…Ñ¡Ù•¹Ð¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ð Á½¥¹Ñ•ÉÕÀœ±íÁ½¥¹Ñ•É%èÄ±±¥•¹Ñ`èÈÀ±±¥•¹ÑdèØÀ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤íô¤ ¥€¤ì)½¬ ‰Ñ…ÁÁ¥¹œ„Í•µ•¹Ð¥Í½±…Ñ•ÌÑ¡…ÐÁ…ÉÐ°•á…Ñ±ä±¥­”¥ÑÌ±••¹¡¥Àˆ°(€€ÉÕ¸¡A5%a}=UM€¤€ôôô€‰	…¬ˆ°ÉÕ¸¡A5%a}=UM€¤¤ì)½¬ ˆ¸¸¹…¹Ñ¡”±••¹Í¡½ÝÌ¥ÐÍ•±•Ñ•ˆ°(€€ÉÕ¸¡‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œ¹Áµ¥á±m‘…Ñ„µÁÐô‰	…¬‰tœ¤¹±…ÍÍ1¥ÍÐ¹½¹Ñ…¥¹Ì ½¸œ¥€¤¤ì(¼¼„IµÕÍÐÍÉÕˆ°¹½ÐÍ•±•Ð)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ 	…¬œ¤í€¤ì€€€¼¼±•…È)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í½¹ÍÐˆõ‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ì(€½¹ÍÐÍ•œõˆ¹ÅÕ•ÉåM•±•Ñ½È É•Ñm‘…Ñ„µÁÐô‰	…¬‰tœ¤ì(€Í•œ¹‘¥ÍÁ…Ñ¡Ù•¹Ð¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ð Á½¥¹Ñ•É‘½Ý¸œ±íÁ½¥¹Ñ•É%èÈ±±¥•¹Ñ`èÈÀ±±¥•¹ÑdèØÀ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤ì(€ˆ¹‘¥ÍÁ…Ñ¡Ù•¹Ð¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ð Á½¥¹Ñ•Éµ½Ù”œ±íÁ½¥¹Ñ•É%èÈ±±¥•¹Ñ`èÄÈÀ±±¥•¹ÑdèØÀ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤ì(€ˆ¹‘¥ÍÁ…Ñ¡Ù•¹Ð¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ð Á½¥¹Ñ•ÉÕÀœ±íÁ½¥¹Ñ•É%èÈ±±¥•¹Ñ`èÄÈÀ±±¥•¹ÑdèØÀ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤íô¤ ¥€¤ì)½¬ ‰‘É…¥¹œ…É½ÍÌÑ¡”¡…ÉÐÍÉÕ‰ÌÝ¥Ñ¡½ÕÐÍ•±•Ñ¥¹œ…¹åÑ¡¥¹œˆ°(€€ÉÕ¸¡A5%a}=UM€¤€ôôô¹Õ±°°MÑÉ¥¹œ¡ÉÕ¸¡A5%a}=UM€¤¤¤ì((¼¼€´´´´Ñ¡”ÍÕµµ…Éä±¥¹”€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´)½¹ÍÐÍÕ´€ô€ ¤€ôøÉÕ¸¡‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥áMÕ´œ¤¹Ñ•áÑ½¹Ñ•¹Ð¹É•Á±…” ½qqÌ¬½œ°œ€œ¤¹ÑÉ¥´ ¥€¤ì)½¬ ‰„ÍÕµµ…ÉäÍ¥ÑÌ‰•±½ÜÑ¡”¡…ÉÐˆ°ÉÕ¸¡€„…‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥áMÕ´œ¥€¤¤ì)½¬ ˆ¸¸¹ÍÁ•…­¥¹œ…‰½ÕÐ…±°ÍÑÉ•¹Ñ Ý½É¬Ý¡•¸¹½Ñ¡¥¹œ¥ÌÍ•±•Ñ•ˆ°€½±°ÍÑÉ•¹Ñ ¼¹Ñ•ÍÐ¡ÍÕ´ ¤¤°ÍÕ´ ¤¤ì)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ 1•Ìœ¤í€¤ì)½¬ ˆ¸¸¹…¹…‰½ÕÐÑ¡”Í•±•Ñ•Á…ÉÐÝ¡•¸½¹”¥Ìˆ°€½1•Ì¼¹Ñ•ÍÐ¡ÍÕ´ ¤¤€˜˜€„½±°ÍÑÉ•¹Ñ ¼¹Ñ•ÍÐ¡ÍÕ´ ¤¤°ÍÕ´ ¤¤ì)½¬ ˆ¸¸¹É•Á½ÉÑ¥¹œ½µÁ±•Ñ•Í•ÑÌ°„Í•ÍÍ¥½¸½Õ¹Ð…¹…¸…Ù•É…”ˆ°(€€€½q¼¹Ñ•ÍÐ¡ÍÕ´ ¤¤€˜˜€½½µÁ±•Ñ•Í•Ð¼¹Ñ•ÍÐ¡ÍÕ´ ¤¤€˜˜€½Í•ÍÍ¥½¸¼¹Ñ•ÍÐ¡ÍÕ´ ¤¤€˜˜€½…Ùœ¼¹Ñ•ÍÐ¡ÍÕ´ ¤¤°ÍÕ´ ¤¤ì)½¬ ˆ¸¸¹Ý¥Ñ¡½ÕÐÑÕÉ¹¥¹œÍ•Ð½Õ¹Ð¥¹Ñ¼„Á•É™½Éµ…¹”ÑÉ•¹ˆ°(€€€„¼•ñÙÌ•…É±¥•Éñq‰ÕÁq‰ñq‰‘½Ý¹qˆ½¤¹Ñ•ÍÐ¡ÍÕ´ ¤¤°ÍÕ´ ¤¤ì)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ 1•Ìœ¤í€¤ì((¼¼€´´´´Ñ¡”ÍÑ¥­äå•…È€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´)½¬ ‰„å•…È±…‰•°Í¥ÑÌ½ÕÑÍ¥‘”Ñ¡”Á±½Ðˆ°ÉÕ¸¡€„…‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥áeÈœ¥€¤¤ì)½¬ ˆ¸¸¹…¹¹…µ•ÌÑ¡”å•…È…ÐÑ¡”ÕÉÉ•¹ÐÍÉ½±°Á½Í¥Ñ¥½¸ˆ°(€€€½yq‘ìÑô¼¹Ñ•ÍÐ¡ÉÕ¸¡‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥áeÈœ¤¹Ñ•áÑ½¹Ñ•¹Ñ€¤¤°(€€ÉÕ¸¡‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥áeÈœ¤¹Ñ•áÑ½¹Ñ•¹Ñ€¤¤ì(¼¼ÍÉ½±±¥¹œÑ¼„½±Õµ¸¥¸„‘¥™™•É•¹Ðå•…ÈµÕÍÐÍÝ…À¥Ð)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í¹‘…åÌõíôì½¹ÍÐµ¬ô¡¥Í¼±À¤ôù¹‘…åÍm¥Í½tõíÜémíÁ…ÉÐéÀ±•àè`œ±ÜèÐÀ±É•ÁÌélÄÁt±…ÐèÅõt±ÕÁèÅôì(€™½È¡±•Ð¤ôÄí¤ðôÐÀí¤¬¬¥í½¹ÍÐõ¹•Ü…Ñ” œÈÀÈÔ´ÀØ´ÀÅPÀÀèÀÀœ¤ì¹Í•Ñ…Ñ”¡¹•Ñ…Ñ” ¤­¤¤ì(€€€µ¬¡¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¤°¡•ÍÐœ¤íô(€™½È¡±•Ð¤ôÄí¤ðôÐÀí¤¬¬¥í½¹ÍÐõ¹•Ü…Ñ” œÈÀÈØ´ÀØ´ÀÅPÀÀèÀÀœ¤ì¹Í•Ñ…Ñ”¡¹•Ñ…Ñ” ¤­¤¤ì(€€€µ¬¡¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¤°	…¬œ¤íô(€Mõ‘•É¥Ù•±° ¤ìÙ¥•ÜôÍÑ…ÑÌœìÉ•¹‘•È ¤ì(€½¹ÍÐˆõ‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ì(€ˆ¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ðô ¤ôø¡í±•™ÐèÀ±Ñ½ÀèÀ±Ý¥‘Ñ èÌÐÀ±¡•¥¡ÐèÈÌÈ±É¥¡ÐèÌÐÀ±‰½ÑÑ½´èÈÌÉô¤ì(€ˆ¹ÍÉ½±±1•™ÐôÀìˆ¹‘¥ÍÁ…Ñ¡Ù•¹Ð¡¹•ÜÙ•¹Ð ÍÉ½±°œ¤¤íô¤ ¥€¤ì)½¹ÍÐå…É±ä€ôÉÕ¸¡‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥áeÈœ¤¹Ñ•áÑ½¹Ñ•¹Ñ€¤ì)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í½¹ÍÐˆõ‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ì(€ˆ¹ÍÉ½±±1•™ÐôØÀ©A5%a}=1\ìˆ¹‘¥ÍÁ…Ñ¡Ù•¹Ð¡¹•ÜÙ•¹Ð ÍÉ½±°œ¤¤íô¤ ¥€¤ì)½¹ÍÐå1…Ñ”€ôÉÕ¸¡‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥áeÈœ¤¹Ñ•áÑ½¹Ñ•¹Ñ€¤ì)½¬ ‰Ñ¡”å•…ÈÍÝ…ÁÌ…Ìå½ÔÍÉ½±°…É½ÍÌ„å•…È‰½Õ¹‘…Éäˆ°(€€å…É±ä€ôôô€ˆÈÀÈÔˆ€˜˜å1…Ñ”€ôôô€ˆÈÀÈØˆ°å…É±ä€¬€ˆqÔÈÄäÈ€ˆ€¬å1…Ñ”¤ì((¼¨€´´´´ØÌ¸Ì¸ÈÀàè½¹”½µÁ…É…‰±”Õ¹¥Ð€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´(€€5¥á•µ•ÅÕ¥Áµ•¹ÐÑ½¹¹…”¥Ì¥¹Ñ•É¹…±±ä½µÁÕÑ…‰±”‰ÕÐ¹½Ð„µ•…¹¥¹™Õ°(€€É½ÍÌµÍ•ÍÍ¥½¸½µÁ…É¥Í½¸¸M•ÍÍ¥½¸	Õ¥±Ñ¡•É•™½É”½Õ¹ÑÌ½µÁ±•Ñ•Í•ÑÌè(€€½¹”É•ÁÌµ…ÉÉ…ä•±•µ•¹Ð¥Ì½¹”‰±½¬°É•…É‘±•ÍÌ½˜Ý•¥¡Ð½È•ÅÕ¥Áµ•¹Ð¸(€€½±‘•Í¡••Ðµ•É„É½ÝÌ…¹ÕÉÉ•¹Ð½¹”µÉ½ÜµÁ•ÈµÍ•ÐÍÑ½É…”µÕÍÐ…É•”¸€¨¼)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í¹‘…åÌõíôì(€½¹ÍÐÐõ¹•Ü…Ñ”¡Ñ½‘…å%M<¬PÀÀèÀÀœ¤ì(€½¹ÍÐµ¬ô¡½™˜±Ü¤ôùí½¹ÍÐõ¹•Ü…Ñ”¡Ð¤ì¹Í•Ñ…Ñ”¡¹•Ñ…Ñ” ¤µ½™˜¤ì(€€€¹‘…åÍm¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¥tõíÜ±ÕÁèÅôíôì(€€¼¼„Í¡••Ðµ•É„‘…äÍÑ½É•™½±‘•èÑ¡É•”•á•É¥Í•Ì°™½ÕÈÍ•ÑÌ…Á¥•”(€µ¬ Ì±míÁ…ÉÐè	…¬œ±•àèAÕ±°UÀœ±ÜèÜÀ±É•ÁÌélÄÈ°ÄÀ°ÄÀ°át±…ÐèÅô°(€€€€€€€íÁ…ÉÐè	…¬œ±•àè	•¹Ðµ=Ù•ÈI½Üœ±ÜèØÄ¸È±É•ÁÌélÈÀ°ÈÀ°ÄÔ°ÈÁt±…ÐèÅô°(€€€€€€€íÁ…ÉÐè	…¬œ±•àè1…ÐAÕ±°½Ý¸œ±ÜèÐÔ±É•ÁÌélÄÀ°ÄÀ°ÄÀ°ÄÁt±…ÐèÅõt¤ì(€€¼¼…¹„‘…äÍÑ½É•Õ¹™½±‘•°½¹”•¹ÑÉäÁ•ÈÍ•Ð(€µ¬ Ô±míÁ…ÉÐè¡•ÍÐœ±•àèAÉ•ÍÌœ±ÜèÐÀ±É•ÁÌélÄÁt±…ÐèÅô°(€€€€€€€íÁ…ÉÐè¡•ÍÐœ±•àèAÉ•ÍÌœ±ÜèÐÀ±É•ÁÌélÄÁt±…ÐèÅô°(€€€€€€€íÁ…ÉÐè1•Ìœ±•àèMÅÕ…Ðœ±ÜèàÀ±É•ÁÌélát±…ÐèÅõt¤ì(€µ¬ Ü±míÁ…ÉÐè	…¬œ±•àèI½Üœ±ÜèÌÀ±É•ÁÌélÄÀ°ÄÔ°ÄÀ°ÄÕt±…ÐèÅô°(€€€€€€€íÁ…ÉÐèIÕ¸œ±•àèIÕ¸œ±ÜèÔ±É•ÁÌémt±µ¥¹ÌèÌÀ±Í•ÌèÀ±…ÐèÅõt¤ì(€Mõ‘•É¥Ù•±° ¤ìÙ¥•ÜôÍÑ…ÑÌœìÉ•¹‘•È ¤íô¤ ¥€¤ì()½¹ÍÐµ¥Í´€ôÉÕ¸¡)M=8¹ÍÑÉ¥¹¥™ä ¡™Õ¹Ñ¥½¸ ¥ì(€½¹ÍÐ‰…õmtì(€™½È¡½¹ÍÐÈ½˜Á…ÉÑ5¥à äää¤¥ì(€€€½¹ÍÐÜô¡¹‘…åÍmÈ¹‘uññíô¤¹Ýñð¡M¹Í•ÍÍ¥½¹ÍmÈ¹‘uññmt¤ì(€€€½¹ÍÐÑÉÕÑ õÜ¹™¥±Ñ•È¡ÌôùÌ¹Á…ÉÐ„ôôIÕ¸œ˜™Ì¹•à„ôôIÕ¸œ¤(€€€€€€¹É•‘Õ” ¡„±Ì¤ôù„¬ ¡Ì¹É•ÁÍññmt¤¹±•¹Ñ ¤°À¤ì(€€€¥˜¡ÑÉÕÑ „ôõÈ¹Ñ½Ñ…°¤‰…¹ÁÕÍ ¡íéÈ¹±¡…ÉÐéÈ¹Ñ½Ñ…°±Í•ÑÌéÑÉÕÑ¡ô¤ì(€ô(€É•ÑÕÉ¸‰…íô¤ ¤¥€¤ì)½¬ ‰Á…ÉÑ5¥à…É••ÌÝ¥Ñ ½µÁ±•Ñ•µÍ•ÐÑÉÕÑ ½¸•Ù•Éä‘…äˆ°(€€)M=8¹Á…ÉÍ”¡µ¥Í´¤¹±•¹Ñ €ôôô€À°µ¥Í´¤ì()½¬ ‰Ñ¡”™½±‘•Ñ¡É•”µ•á•É¥Í”‘…äÉ•…‘Ì…ÌÑÝ•±Ù”½µÁ±•Ñ•Í•ÑÌˆ°(€€ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í½¹ÍÐÐõ¹•Ü…Ñ”¡Ñ½‘…å%M<¬PÀÀèÀÀœ¤ì½¹ÍÐõ¹•Ü…Ñ”¡Ð¤ì¹Í•Ñ…Ñ”¡¹•Ñ…Ñ” ¤´Ì¤ì(€€€€½¹ÍÐ¥Í¼õ¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¤ì(€€€€É•ÑÕÉ¸€¡Á…ÉÑ5¥à äää¤¹™¥¹¡ÈôùÈ¹ôôõ¥Í¼¥ññíô¤¹Ñ½Ñ…°íô¤ ¥€¤€ôôô€ÄÈ¤ì((¼¼™½±‘•…¹Õ¹™½±‘•ÍÑ½É…”µÕÍÐ¥Ù”Ñ¡”Í…µ”…¹ÍÝ•È™½ÈÑ¡”Í…µ”Ý½É¬)½¬ ‰„™½±‘••¹ÑÉä…¹™½ÕÈÍ•Á…É…Ñ”Í•ÑÌÑ½Ñ…°Ñ¡”Í…µ”ˆ°(€€ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥ì(€€€€½¹ÍÐ™½±‘•õmíÁ…ÉÐè	…¬œ±•àèI½Üœ±ÜèÌÀ±É•ÁÌélÄÀ°ÄÔ°ÄÀ°ÄÕt±…ÐèÅõtì(€€€€½¹ÍÐÍÁ±¥ÐõlÄÀ°ÄÔ°ÄÀ°ÄÕt¹µ…À¡Èôø¡íÁ…ÉÐè	…¬œ±•àèI½Üœ±ÜèÌÀ±É•ÁÌémÉt±…ÐèÅô¤¤ì(€€€€½¹ÍÐÍ•ÑÌõ„ôù„¹É•‘Õ” ¡Ì±à¤ôùÌ¬¡à¹É•ÁÍññmt¤¹±•¹Ñ °À¤ì(€€€€É•ÑÕÉ¸Í•ÑÌ¡™½±‘•¤ôôõÍ•ÑÌ¡ÍÁ±¥Ð¤€˜˜Í•ÑÌ¡™½±‘•¤ôôôÐíô¤ ¥€¤¤ì((¼¼Á…ÉÑ5¥àµÕÍÐ¹•Ù•È‘É¥™Ð‰…¬Ñ¼µ¥á•µ•ÅÕ¥Áµ•¹ÐÑ½¹¹…”)½¹ÍÐÕÑ¥±MÉŒÄÈÐ€ô™Ì¹É•…‘¥±•Må¹Œ¡Á…Ñ ¹©½¥¸¡‘¥È°€‰©Ì½ÕÑ¥°¹©Ìˆ¤°€‰ÕÑ˜àˆ¤ì(¼¼Í±¥”Ñ¼Ñ¡”9aP™Õ¹Ñ¥½¸‘•±…É…Ñ¥½¸qÔÈÀÄÐ„‰É…”µµ…Ñ¡¥¹œÉ••àÑÉ¥ÁÌ½¸(¼¼Ñ¡”¹•ÍÑ•™½Èµ±½½ÁÌ¥¹Í¥‘”Á…ÉÑ5¥à)½¹ÍÐÁµMÑ…ÉÐ€ôÕÑ¥±MÉŒÄÈÐ¹¥¹‘•á=˜ ‰™Õ¹Ñ¥½¸Á…ÉÑ5¥à¡‘…åÌ¥ìˆ¤ì)½¹ÍÐÁµ	½‘ä€ôÕÑ¥±MÉŒÄÈÐ¹Í±¥”¡ÁµMÑ…ÉÐ°ÕÑ¥±MÉŒÄÈÐ¹¥¹‘•á=˜ ‰q¹™Õ¹Ñ¥½¸€ˆ°ÁµMÑ…ÉÐ€¬€ÄÀ¤¤ì(¼¨ÍÑÉ¥À½µµ•¹ÑÌ‰•™½É”É•ÁÁ¥¹œÑ¡”‰½‘äqÔÈÀÄÐÑ¡”™¥àÌ½Ý¸½µµ•¹Ð•áÁ±…¥¹Ì(€€Ý¡…ÐÉ•ÁÍlÁu€ÕÍ•Ñ¼‘¼°…¹…¸Õ¸µÍÑÉ¥ÁÁ•É•À™±…ÌÑ¡”•áÁ±…¹…Ñ¥½¸(€€…Ì¥˜¥ÐÝ•É”Ñ¡”‰Õœ¸á…Ñ±äÑ¡”ØÌ¸Ì¸ÄÀØ™…¥±ÕÉ”°¥¸„¹•ÜÁ±…”¸€¨¼)½¹ÍÐÁµ½‘”€ôÁµ	½‘ä¹É•Á±…” ½p½p©mqÍqMt¨ýp©p¼½œ°€ˆˆ¤¹É•Á±…” ¼¡yñmxét¥p½p½myq¹t¨½œ°€ˆÄˆ¤ì)½¬ ‰Á…ÉÑ5¥à½Õ¹ÑÌÉ•ÁÌµ…ÉÉ…ä•¹ÑÉ¥•Ì…¹¹•Ù•È½µÁÕÑ•ÌÑ½¹¹…”ˆ°(€€€½p¡Íp¹É•ÁÍqñqñqmqup¥p¹±•¹Ñ ¼¹Ñ•ÍÐ¡Áµ½‘”¤€˜˜(€€€„½Ù½±=™p¡Íp¥ñÍp¹ÝqÌ©p¨¼¹Ñ•ÍÐ¡Áµ½‘”¤°(€€€½Ù½±=™p¡Íp¤¼¹Ñ•ÍÐ¡Áµ½‘”¤€ü€‰ÍÑ¥±°…±±ÌÙ½±=˜ˆ€è€‰Í•Ð½Õ¹Ð½¹±äˆ¤ì((¼¼€´´´´ØÌ¸Ì¸ÄÈØèÝ¡…Ð…¸•µÁÑäµÍÁ…”Ñ…Àµ•…¹Ì‘•Á•¹‘Ì½¸Ñ¡”ÍÑ…Ñ”€´´´´´´´´)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í¹‘…åÌõíôì½¹ÍÐÐõ¹•Ü…Ñ”¡Ñ½‘…å%M<¬PÀÀèÀÀœ¤ì(€½¹ÍÐµ¬ô¡½™˜±Á…ÉÑÌ¤ôùí½¹ÍÐõ¹•Ü…Ñ”¡Ð¤ì¹Í•Ñ…Ñ”¡¹•Ñ…Ñ” ¤µ½™˜¤ì(€€€¹‘…åÍm¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¥tõì(€€€€€ÜéÁ…ÉÑÌ¹µ…À¡Àôø¡íÁ…ÉÐéÀ±•àè`œ±ÜèÐÀ±É•ÁÌélÄÁt±…ÐèÅô¤¤±ÕÁèÅôíôì(€µ¬ Ä±l1•Ìt¤ìµ¬ È±l¡•ÍÐt¤ìµ¬ Ì±l	…¬t¤ì(€™½È¡±•Ð¤ôÐí¤ðÄÐí¤¬¬¤µ¬¡¤±l¡•ÍÐt¤ì(€Mõ‘•É¥Ù•±° ¤ìÙ¥•ÜôÍÑ…ÑÌœìÉ•¹‘•È ¤ì(€½¹ÍÐˆõ‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ì(€ˆ¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ðô ¤ôø¡í±•™ÐèÀ±Ñ½ÀèÀ±Ý¥‘Ñ èÌÐÀ±¡•¥¡ÐèÄàØ±É¥¡ÐèÌÐÀ±‰½ÑÑ½´èÄàÙô¤ì(€ˆ¹ÍÉ½±±1•™ÐôÀìA5%a}=ULõ¹Õ±°ìÁµ¥áÁÁ±å½ÕÌ ¤íô¤ ¥€¤ì()½¹ÍÐ8€ôÉÕ¸¡Á…ÉÑ5¥à äää¤¹±•¹Ñ¡€¤ì)½¹ÍÐÑ…ÁµÁÑä€ô€¡½°¤€ôøÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í½¹ÍÐˆõ‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ì(€½¹ÍÐàôà¬‘í½±ô©A5%a}=1\¬Ìì(€½¹ÍÐ‰œõˆ¹ÅÕ•ÉåM•±•Ñ½È É•Ñm‘…Ñ„µ½°ôˆ‘í½±ô‰tœ¤ì(€‰œ¹‘¥ÍÁ…Ñ¡Ù•¹Ð¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ð Á½¥¹Ñ•É‘½Ý¸œ±íÁ½¥¹Ñ•É%èä±±¥•¹Ñ`éà±±¥•¹ÑdèÄÈ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤ì(€ˆ¹‘¥ÍÁ…Ñ¡Ù•¹Ð¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ð Á½¥¹Ñ•ÉÕÀœ±íÁ½¥¹Ñ•É%èä±±¥•¹Ñ`éà±±¥•¹ÑdèÄÈ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤íô¤ ¥€¤ì((¼¼¹½Ñ¡¥¹œ™½±±½Ý•å•Ðè•µÁÑäÍÁ…”ÍÑ¥±°Á¥­Ì„Í¥¹±”µÁ…ÉÐ½±Õµ¸)Ñ…ÁµÁÑä¡8€´€Ä¤ì)½¬ ‰Ý¥Ñ ¹½Ñ¡¥¹œ™½±±½Ý•°•µÁÑäÍÁ…”ÍÑ¥±°Í•±•ÑÌÑ¡…Ð½±Õµ¸ÌÁ…ÉÐˆ°(€€ÉÕ¸¡A5%a}=UM€¤€ôôô€‰1•Ìˆ°MÑÉ¥¹œ¡ÉÕ¸¡A5%a}=UM€¤¤¤ì((¼¼¹½Ü™½±±½Ý¥¹œ1•Ìè•µÁÑäÍÁ…”½Ù•È„%I9P½±Õµ¸µÕÍÐI1M°(¼¼¹½ÐÍ¥±•¹Ñ±äÍÝ¥Ñ Ñ¼Ý¡…Ñ•Ù•È¥ÌÕ¹‘•ÈÑ¡”™¥¹•È)Ñ…ÁµÁÑä¡8€´€Ì¤ì)½¬ ‰Ý¡¥±”™½±±½Ý¥¹œ½¹”°•µÁÑäÍÁ…”½Ù•È…¹½Ñ¡•È½±Õµ¸É•±•…Í•Ì¥¹ÍÑ•…½˜ÍÝ¥Ñ¡¥¹œˆ°(€€ÉÕ¸¡A5%a}=UM€¤€ôôô¹Õ±°°MÑÉ¥¹œ¡ÉÕ¸¡A5%a}=UM€¤¤¤ì((¼¼‰ÕÐ±…¹‘¥¹œ½¸…¸…ÑÕ…°Í•µ•¹ÐÍÑ¥±°ÍÝ¥Ñ¡•Ì)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ ¡•ÍÐœ¤í€¤ì)ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í½¹ÍÐˆõ‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% Áµ¥á]É…Àœ¤ì(€½¹ÍÐÍ•œõˆ¹ÅÕ•ÉåM•±•Ñ½È É•Ñm‘…Ñ„µÁÐô‰	…¬‰tœ¤ì(€Í•œ¹‘¥ÍÁ…Ñ¡Ù•¹Ð¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ð Á½¥¹Ñ•É‘½Ý¸œ±íÁ½¥¹Ñ•É%èÄÀ±±¥•¹Ñ`èÌÀ±±¥•¹ÑdèÄÀÀ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤ì(€ˆ¹‘¥ÍÁ…Ñ¡Ù•¹Ð¡¹•ÜA½¥¹Ñ•ÉÙ•¹Ð Á½¥¹Ñ•ÉÕÀœ±íÁ½¥¹Ñ•É%èÄÀ±±¥•¹Ñ`èÌÀ±±¥•¹ÑdèÄÀÀ±‰Õ‰‰±•ÌéÑÉÕ•ô¤¤íô¤ ¥€¤ì)½¬ ˆ¸¸¹Ý¡¥±”±…¹‘¥¹œ½¸„É•…°Í•µ•¹ÐÍÝ¥Ñ¡•ÌÑ¼¥Ðˆ°(€€ÉÕ¸¡A5%a}=UM€¤€ôôô€‰	…¬ˆ°MÑÉ¥¹œ¡ÉÕ¸¡A5%a}=UM€¤¤¤ì)ÉÕ¸¡Áµ¥áM•Ñ½ÕÌ 	…¬œ¤í€¤ì((¼¼€´´´´Ñ¡”¹•Ý•ÍÐ½±Õµ¸¥Ìµ…É­•€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´)½¬ ‰•á…Ñ±ä½¹”½±Õµ¸¥Ìµ…É­•±…Ñ•ÍÐˆ°(€€ÉÕ¸¡‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½É±° œÁµ¥á]É…À€¹Áµ¥á½°¹±…Ñ•ÍÐœ¤¹±•¹Ñ¡€¤€ôôô€Ä¤ì)½¬ ˆ¸¸¹…¹¥Ð¥ÌÑ¡”±…ÍÐ½¹”ˆ°(€€ÉÕ¸¡€­‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œÁµ¥á]É…À€¹Áµ¥á½°¹±…Ñ•ÍÐœ¤¹‘…Ñ…Í•Ð¹½±€¤€ôôô8€´€Ä°(€€ÉÕ¸¡‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œÁµ¥á]É…À€¹Áµ¥á½°¹±…Ñ•ÍÐœ¤¹‘…Ñ…Í•Ð¹½±€¤€¬€ˆ½˜€ˆ€¬€¡8´Ä¤¤ì)½¹ÍÐÍÌÄÈØ€ô™Ì¹É•…‘¥±•Må¹Œ¡Á…Ñ ¹©½¥¸¡‘¥È°€‰ÍÌ½…ÁÀ¹ÍÌˆ¤°€‰ÕÑ˜àˆ¤¹É•Á±…” ½q¸½œ°€ˆˆ¤ì)½¬ ˆ¸¸¹¥ÐÁÕ±Í•Ìˆ°(€€€½p¹Áµ¥á½±p¹±…Ñ•ÍÑqímyõt©…¹¥µ…Ñ¥½¸éÁµ¥á±…Ñ•ÍÐ¼¹Ñ•ÍÐ¡ÍÌÄÈØ¤¤ì)½¬ ˆ¸¸¹…¹¡½±‘ÌÍÑ¥±°Õ¹‘•ÈÉ•‘Õ•µ½Ñ¥½¸ˆ°(€€€½ÁÉ•™•ÉÌµÉ•‘Õ•µµ½Ñ¥½¸éÉ•‘Õ•p¥qímyõt©p¹Áµ¥á½±p¹±…Ñ•ÍÐ üè±p¹Áµ¥áÍ•p¹±…Ñ•ÍÐ¤ýqí…¹¥µ…Ñ¥½¸é¹½¹”¼¹Ñ•ÍÐ¡ÍÌÄÈØ¤¤ì(¼¨Ñ¡”ÁÕ±Í”µÕÍÐÍ¥Ð½¸Ñ¡”=1U58°¹•Ù•ÈÑ¡”‰…ÉÌè„ML…¹¥µ…Ñ¥½¸‰•…ÑÌ(€€¥¹±¥¹”ÍÑå±”°Í¼…¹¥µ…Ñ¥¹œÑ¡”‰…ÉÌÝ½Õ±½Ù•ÉÉ¥‘”Ñ¡”½Á…¥ÑäÑ¡…Ð(€€™½ÕÌµ‘¥µµ¥¹œÍ•ÑÌ…¹Ñ¡”ÑÝ¼Ý½Õ±™¥¡Ð¸€¨¼)½¬ ‰Ñ¡”ÁÕ±Í”¹•Ù•ÈÑ½Õ¡•ÌÑ¡”‰…ÉÌÑ¡•µÍ•±Ù•Ìˆ°(€€€„½É•Ñqm‘…Ñ„µÁÑqumyít©qímyõt©…¹¥µ…Ñ¥½¸éÁµ¥á±…Ñ•ÍÐ¼¹Ñ•ÍÐ¡ÍÌÄÈØ¤¤ì((¼¼€´´´´ØÌ¸Ì¸ÈÀàè•Ù•ÉäÙ¥Í¥‰±”Õ¹¥Ð¥Ì½¹”½µÁ±•Ñ•Í•Ð€´´´´´´´´´´´´´´´´´´)½¬ ‰Ñ¡”¡…ÉÐ‘•™¥¹•Ì½¹”É•ÕÍ…‰±”Í•Ðµ‰±½¬Á…ÑÑ•É¸ˆ°(€€ÉÕ¸¡€„…‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œÁµ¥á]É…ÀÁ…ÑÑ•É¸Áµ¥á	É¥¬œ¥€¤€ôôôÑÉÕ”¤ì)½¬ ‰•Ù•ÉäÍÑ…­•‘…äÉ••¥Ù•Ì„Í•Ðµ‰±½¬½Ù•É±…äˆ°(€€ÉÕ¸¡‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½É±° œÁµ¥á]É…ÀÉ•Ñm‘…Ñ„µ‰É¥­Ítœ¤¹±•¹Ñ¡€¤€ôôô(€€ÉÕ¸¡Á…ÉÑ5¥à äää¤¹™¥±Ñ•È¡ÈôùÈ¹Ñ½Ñ…°øÀ¤¹±•¹Ñ¡€¤¤ì)½¬ ‰Ñ¡”½Ù•É±…äÉ•½É‘ÌÑ¡”‘…äÌ•á…Ð½µÁ±•Ñ•µÍ•Ð½Õ¹Ðˆ°(€€ÉÕ¸¡€­‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œÁµ¥á]É…ÀÉ•Ñm‘…Ñ„µ‰É¥­Ít¹±…Ñ•ÍÐœ¤¹‘…Ñ…Í•Ð¹‰É¥­Í€¤€ôôô(€€ÉÕ¸¡Á…ÉÑ5¥à äää¤¹…Ð ´Ä¤¹Ñ½Ñ…±€¤¤ì)½¬ ‰Ñ¡”±…Ñ•ÍÐÍ•µ•¹ÑÌÉ¥Í”Ý¡•¸Ñ¡”¡…ÉÐÉ”µÉ•¹‘•ÉÌˆ°(€€€½p¹Áµ¥áÍ•p¹±…Ñ•ÍÑqímyõt©…¹¥µ…Ñ¥½¸éÁµ¥áÉ¥Í”¼¹Ñ•ÍÐ¡ÍÌÄÈØ¤¤ì)½¬ ˆ¸¸¹…¹Ñ¡”É¥Í”…±Í¼ÍÑ½ÁÌÕ¹‘•ÈÉ•‘Õ•µ½Ñ¥½¸ˆ°(€€€½ÁÉ•™•ÉÌµÉ•‘Õ•µµ½Ñ¥½¸éÉ•‘Õ•p¥qímyõt©p¹Áµ¥á½±p¹±…Ñ•ÍÐ±p¹Áµ¥áÍ•p¹±…Ñ•ÍÑqí…¹¥µ…Ñ¥½¸é¹½¹”¼¹Ñ•ÍÐ¡ÍÌÄÈØ¤¤ì()ÉÕ¸¡€¡™Õ¹Ñ¥½¸ ¥í¹‘…åÌõíôì(€¹‘…åÍmÑ½‘…å%M=tõíÜémíÁ…ÉÐè¡•ÍÐœ±•àèAÉ•ÍÌœ±ÜèÐÀ±É•ÁÌélÄÁt±…Ðé…Ñ”¹¹½Ü ¥õt±ÕÁé…Ñ”¹¹½Ü ¥ôì(€Mõ‘•É¥Ù•±° ¤ìÙ¥•ÜôÍÑ…ÑÌœìÉ•¹‘•È ¤íô¤ ¥€¤ì)½¬ ‰…¸…Ñ¥Ù”Ñ½‘…äÌ¹•Ý•ÍÐ½±Õµ¸ÕÍ•ÌÑ¡”±¥Ù”ÍÑ…Ñ”ˆ°(€€ÉÕ¸¡‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œÁµ¥á]É…À€¹Áµ¥á½°¹±…Ñ•ÍÐœ¤¹±…ÍÍ1¥ÍÐ¹½¹Ñ…¥¹Ì ±¥Ù”œ¥€¤€ôôôÑÉÕ”€˜˜(€€€½p¹Áµ¥á½±p¹±…Ñ•ÍÑp¹±¥Ù•qí™¥±°éÙ…Ép ´µ±¥Ù•p¤¼¹Ñ•ÍÐ¡ÍÌÄÈØ¤¤ì((¼¼€´´´´ÍÁ…¥¹œ€´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´)½¬ ‰Ñ¡”±••¹…¹Ñ¡”¡¥¹Ð¡…Ù”É½½´‰•™½É”Ñ¡”¡…ÉÐˆ°(€€€½p¹Áµ¥á±‘qímyõt©µ…É¥¸èÀ€À€ÄÑÁà¼¹Ñ•ÍÐ¡ÍÌÄÈØ¤€˜˜(€€€½p¹Áµ¥áÉ•…‘qímyõt©µ…É¥¸èÀ€À€ÄÑÁà¼¹Ñ•ÍÐ¡ÍÌÄÈØ¤¤ì)½¬ ‰Ñ¡”±•™ÐÕÑÑ•È¥Ì¹…ÉÉ½Ý•Èˆ°ÉÕ¸¡A5%a}a]€¤€ôôô€ÈÔ°€‰…á¥ÌÝ¥‘Ñ €ˆ€¬ÉÕ¸¡A5%a}a]€¤¤ì((¼¼€´´´´ØÌ¸Ì¸ÈÀàèÍ•Ðµ½Õ¹ÐÑ¥­Ì…É”Ý¡½±”¹Õµ‰•ÉÌ€´´´´´´´´´´´´´´´´´´´´´´´´)½¬ ‰…á¥ÌÑ¥­ÌÍÁ•…¬¥¸Ý¡½±”½µÁ±•Ñ•Í•ÑÌˆ°(€€ÉÕ¸¡Áµ¥áQ¥¬ ÄÈ¸Ð¥€¤€ôôô€ˆÄÈˆ€˜˜ÉÕ¸¡Áµ¥áQ¥¬ ÄÔ¸Ø¥€¤€ôôô€ˆÄØˆ°(€€mÉÕ¸¡Áµ¥áQ¥¬ ÄÈ¸Ð¥€¤°ÉÕ¸¡Áµ¥áQ¥¬ ÄÔ¸Ø¥€¥t¹©½¥¸ ˆ€ˆ¤¤ì)½¬ ˆ¸¸¹Ñ¡É½Õ Ñ¡”…ÁÀÌ½Ý¸™½Éµ…ÑÑ•Èˆ°(€€€½½¹ÍÐÁµ¥áQ¥¬õØôù™µÑp¡5…Ñ¡p¹É½Õ¹‘p¡Ùp¥p¤¼¹Ñ•ÍÐ¡™Ì¹É•…‘¥±•Må¹Œ¡Á…Ñ ¹©½¥¸¡‘¥È°€‰©Ì½ÍÑ…ÑÌ¹©Ìˆ¤°€‰ÕÑ˜àˆ¤¤¤ì()ÁÉ½•ÍÌ¹•á¥Ð¡™…¥°€ü€Ä€è€À¤ì