// test-poster.js DIR — v3.3.272. The thousand-day poster, asserted as PIXELS.
// test-sharecard pins the call shape (1000 cells, fills, words); this suite
// renders on a REAL canvas and reads the image back, because a poster is an
// effect, not a list of draw calls (lesson 7: render the real thing and read
// it). The palette is pinned inline exactly as a browser resolves it — jsdom
// cannot cascade :root custom properties from stylesheets.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: false });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const ok = (name, cond, note) => {
  console.log((cond ? "PASS" : "FAIL"), name, note ? "→ " + note : "");
  if (!cond) fail++;
};

// the dark palette, verbatim from css/app.css :root
run(`(function(){const st=document.documentElement.style;
  st.setProperty('--ground','#070A0E'); st.setProperty('--accent','#4C6BE3');
  st.setProperty('--chalk','#FAFBFD'); st.setProperty('--muted','#BEC7D5');})()`);

// a thousand-day ledger with three honest gaps deep in the span
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  for(let i=0;i<1000;i++){ if([412,413,700].includes(i)) continue;
    const d=new Date(t); d.setDate(d.getDate()-i);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:1}],upd:1};}
  SEED=deriveAll(); window.__poster=drawMilestone(1000);})()`);

const px = (X, Y) => run(`[...__poster.getContext('2d').getImageData(${X},${Y},1,1).data].slice(0,3).join(',')`);

ok("the canvas is the family's 1080 square",
   run(`__poster.width===1080 && __poster.height===1080`));
ok("the ground is the app's ground", px(10,10) === "7,10,14", px(10,10));
ok("the numeral is painted in the accent", px(540,340) === "76,107,227", px(540,340));
ok("a trained day's cell is a solid accent brick", px(50,620) === "76,107,227", px(50,620));
/* day 700 (missed) sits at wall row 5, col 49 — inside cell x 1022..1038,
   y 712..728. A gap must read as a whisper on the ground: chalk at 8% over
   #070A0E lands near (27,30,33). Anything bright means the alpha was lost. */
const gap = px(1030,720).split(",").map(Number);
ok("a missed day renders as a whisper, not a white brick",
   gap[0]>10 && gap[0]<50 && gap[1]>10 && gap[1]<55 && gap[2]>10 && gap[2]<60,
   gap.join(","));
/* one palette: every pixel on the poster is ground, accent, chalk-derived
   grey, or a blend of those — sample a spread and reject any hue that is not
   in the blue/grey family (red never appears; this is not a live state). */
const samples=[[200,200],[880,200],[540,700],[100,1000],[980,1000],[540,60]];
ok("no pixel leaves the palette's family",
   samples.every(([X,Y])=>{const [r,g,b]=px(X,Y).split(",").map(Number);
     return b>=r-6 && g>=r-8; }),   // blue-leaning or neutral, never warm
   samples.map(([X,Y])=>px(X,Y)).join(" | "));
ok("the poster exports a real image",
   run(`__poster.toDataURL('image/png').length`) > 20000,
   run(`__poster.toDataURL('image/png').length`) + " chars");

process.exit(fail ? 1 : 0);
