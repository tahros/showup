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
/* v4.6.341: ONE ICON SET (Sungjee, 2026-10-15). The traced outlines, the six
   line weights, the solid shapes and the text characters became one set on one
   grid. What has to stay true for it to read as one family: */
const ALL=run(`Object.keys(ICON_SET)`);
ok("the set covers every meaning in the app", ALL.length>=40, ALL.length+" icons");

/* 1. ONE GRID: every icon draws in the same box. */
ok("every icon shares one viewBox",
   run(`Object.keys(ICON_SET).every(n=>/viewBox="6 6 88 88"/.test(icon(n,ICON_SZ.md)))`));

/* 2. SOLID WITH CUTS: a shape's details are cut out by a mask, so they read on
      any background (a blue button included), and every mask exists. */
ok("an icon with cuts points at its own mask",
   run(`/mask="url\\(#icm-trash\\)"/.test(icon('trash',ICON_SZ.sm))`));
ok("...and every mask is defined once, in one hidden defs block",
   run(`(function(){const d=document.getElementById('icDefs');if(!d||getComputedStyle(d).display==='none')return false;
     return Object.entries(ICON_SET).filter(([,v])=>v.c).every(([n])=>document.querySelectorAll('#icm-'+n).length===1);})()`));

/* 3. TWO WEIGHTS, ON PURPOSE: lines inside solid shapes are 7.5; an icon made
      only of lines is 10, or Save and Replay read faint beside Paste. */
const sw=n=>run(`(icon(${JSON.stringify(n)},ICON_SZ.md).match(/stroke-width:([\\d.]+)/)||[])[1]`);
ok("a solid icon's outline is 7.5", sw('paste')==='7.5', sw('paste'));
ok("a line-only icon is 10", ['check','close','chevronR','replay','arrowL'].every(n=>sw(n)==='10'),
   ['check','close','chevronR','replay','arrowL'].map(sw).join(','));
ok("Lands here stays a thin dashed outline", /stroke-dasharray/.test(run(`icon('calendarLands',ICON_SZ.md)`))&&sw('calendarLands')==='5');

/* 4. THE OLD NAMES STILL WORK, so no call site drifted to a missing icon. */
ok("clear is the cross and chevron the right-pointer",
   run(`/ic-close/.test(icon('clear',ICON_SZ.sm))&&/ic-chevronR/.test(icon('chevron',ICON_SZ.sm))`));
ok("the brand mark is untouched artwork",
   run(`/ic-brandmark/.test(icon('brandmark',ICON_SZ.md))&&/fill-rule="evenodd"/.test(icon('brandmark',ICON_SZ.md))`));

/* 5. TEXT CHARACTERS IN CONTROLS BECOME ICONS -- but a times sign between
      numbers is typography and stays. */
ok("a glyph at the edge of a control becomes the set's icon",
   run(`(function(){const b=document.createElement('button');b.textContent='↻ Replay';document.body.appendChild(b);iconGlyphs(b);const r=!!b.querySelector('.ic-replay')&&b.textContent.trim()==='Replay';b.remove();return r;})()`));
ok("...a lone × is a close button",
   run(`(function(){const b=document.createElement('button');b.textContent='×';document.body.appendChild(b);iconGlyphs(b);const r=!!b.querySelector('.ic-close');b.remove();return r;})()`));
ok("...but 225 × 5 stays text",
   run(`(function(){const b=document.createElement('button');b.textContent='225 × 5';document.body.appendChild(b);iconGlyphs(b);const r=!b.querySelector('svg')&&b.textContent==='225 × 5';b.remove();return r;})()`));

/* 6. SIZES ARE NAMED, and button icons sit 10% under their box (Share 19%). */
ok("the size tokens exist and are ordered",
   run(`ICON_SZ.sm<ICON_SZ.md && ICON_SZ.md<ICON_SZ.lg && ICON_SZ.lg<ICON_SZ.hero`));
const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8");
ok("button icons are 10% smaller and Share a further 10%",
   /\.pw-btn\) \.ic:not\(\.ic-brandmark\)\{scale:\.9\}/.test(css)&&/\.ic-share\{scale:\.81\}/.test(css));

process.exit(fail?1:0);
