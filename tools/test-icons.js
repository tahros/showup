// test-icons.js DIR — v3.3.278. Today's plan: a pasted session read into the
// rails the app already has. Two halves: the parser (a pure function, so
// asserted on values) and the promise (today-only, never logged, never
// scored — asserted on effects, through real clicks).
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
/* v3.3.319: pretendToBeVisual, because this suite now renders the TODAY tab
   (the plan moved there) and Today's count-up calls requestAnimationFrame,
   which jsdom does not provide otherwise. Same limitation recorded in
   v3.3.285. */
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only",
  pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){
  return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})}); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const ok = (name, cond, note) => {
  console.log((cond ? "PASS" : "FAIL"), name, note ? "→ " + note : "");
  if (!cond) fail++;
};

/* NOTE ON THE ESCAPES BELOW: these regexes live inside run(`...`) template
   literals, so every backslash must be doubled -- a single \d collapses to a
   bare d before the code is ever evaluated, and every match returns NaN. This
   file's first draft did exactly that. It is the fourth time this project has
   paid for it (v3.3.350, .355, .376). */
/* v3.3.411: ONE ICON SYSTEM.
   Every icon shared one viewBox while the ink inside filled 52% (clear) to
   100% (edit, copy) of it -- so a toolbar asking for three icons at one size
   got three different sizes, and the maker's eye caught it. icon() scales each
   path's measured ink to a shared live area, and divides a stroked icon's
   width by its own scale so normalising cannot also thicken it. */
const ALL=["chevron","copy","edit","clear","grip","expand","sparkle","collapse"];

/* 1. EVERY ICON MEETS THE LIVE AREA. The ink's longest side, times the scale,
      must equal the live area -- that is the whole point of the exercise. */
for(const n of ALL){
  const got=run(`(function(){const b=ICON_INK[${JSON.stringify(n)}];
    const k=+(icon(${JSON.stringify(n)},ICON_SZ.md).match(/scale\\(([\\d.]+)\\)/)||[])[1];
    return +(Math.max(b[2]-b[0],b[3]-b[1])*k).toFixed(2);})()`);
  ok(`${n}: its ink meets the live area`, Math.abs(got-76)<0.5, String(got));
}

/* 2. ONE STROKE WEIGHT, after scaling. Without the division a normalised
      clear arrives at 17.5 units where the pencil reads 9 -- fatter, not
      merely bigger. This is the assertion that catches that. */
for(const n of ["chevron","clear","grip"]){
  const got=run(`(function(){const h=icon(${JSON.stringify(n)},ICON_SZ.md);
    const k=+(h.match(/scale\\(([\\d.]+)\\)/)||[])[1];
    const w=+(h.match(/stroke-width="([\\d.]+)"/)||[])[1];
    return +(k*w).toFixed(2);})()`);
  ok(`${n}: renders the system's one stroke weight`, Math.abs(got-9)<0.1, String(got));
}

/* 3. THE CHEVRON IS A STROKE. It was the only DIRECTIONAL glyph drawn as a
      filled wedge among simple marks that are strokes, and measured it carried
      15% ink where copy carries 33% -- the lightest thing in every row it
      appeared in. As a stroke it inherits the weight by construction, so there
      is nothing to keep tuning. */
ok("the chevron is drawn as a stroke, not a filled wedge",
   run(`!!ICON_STROKE.chevron && !ICON_PATH.chevron`));
ok("...so it carries the same weight as the cross beside it",
   run(`(function(){const g=n=>{const h=icon(n,ICON_SZ.md);
     return +(h.match(/scale\\(([\\d.]+)\\)/)||[])[1]*+(h.match(/stroke-width="([\\d.]+)"/)||[])[1];};
     return Math.abs(g('chevron')-g('clear'))<0.1;})()`));

/* 4. THE PATHS THEMSELVES ARE UNTOUCHED -- normalising is a transform on a
      group, so any path can still be lifted out of the file and pasted
      elsewhere unchanged. */
ok("the artwork is scaled by a transform, not rewritten",
   run(`/<g transform="translate\\([-\\d. ]+\\) scale\\([\\d.]+\\)">/.test(icon('edit',ICON_SZ.md))`));

/* 5. SIZES ARE NAMED. The 11/12/14/16/17/44 spread is how this started. */
ok("the size tokens exist and are ordered",
   run(`ICON_SZ.sm<ICON_SZ.md && ICON_SZ.md<ICON_SZ.lg && ICON_SZ.lg<ICON_SZ.hero`));

process.exit(fail?1:0);
