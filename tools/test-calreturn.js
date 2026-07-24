// test-calreturn.js DIR — v3.3.59: the "↑ calendar" pill exists only after a
// calendar-date tap, glides back on tap, and dies on any re-render or view
// change so it can never go stale.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage59";

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

let fail = 0;
const check = (name, expr, want) => {
  const got = run(expr), ok = String(got) === String(want);
  console.log((ok?"PASS":"FAIL"), name, "→", got);
  if (!ok) fail++;
};

run(`
  {const t0=new Date(todayISO+'T00:00');
   for(let i=1;i<=6;i++){
     const d=new Date(t0); d.setDate(d.getDate()-i);
     if(d.toLocaleDateString('en-CA').slice(0,7)!==todayISO.slice(0,7)) continue;
     DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Back',ex:'Pull Up',w:70,reps:[8]}],upd:1,doneEx:[],donePart:[],doneAll:true};}
   SEED=deriveAll(); _fireDist=null;
   hist={y:+thisYear,m:+todayISO.slice(5,7),part:null};
   view='history'; render();}
`);

check("hidden at the top of the page before any tap", `(()=>{const b=document.getElementById('calReturn'); return !!b&&!b.hidden;})()`, false);

// tap a trained date on the calendar
run(`document.querySelector('.cd[data-hd]').click();`);
check("appears after a date tap", `(()=>{const b=document.getElementById('calReturn'); return !!b&&!b.hidden;})()`, true);
check("label says calendar", `/calendar/.test(document.getElementById('calReturn').textContent)`, true);

// tapping the pill removes it (and scrolls back)
run(`document.getElementById('calReturn').click();`);
check("tapping it clears the calendar target", `(()=>{const b=document.getElementById('calReturn'); return !!b&&!b.hidden;})()`, false);

// re-tap, then a re-render must clear it
run(`document.querySelector('.cd[data-hd]').click();`);
check("target re-arms on a second tap", `(()=>{const b=document.getElementById('calReturn'); return !!b&&!b.hidden;})()`, true);
run(`renderHistory();`);
check("re-render clears the calendar target", `(()=>{const b=document.getElementById('calReturn'); return !!b&&!b.hidden;})()`, false);

// re-tap, then a tab switch must clear it — the pill lives on <body>
run(`document.querySelector('.cd[data-hd]').click();`);
run(`view='today'; render();`);
check("tab switch clears the calendar target", `(()=>{const b=document.getElementById('calReturn'); return !!b&&!b.hidden;})()`, false);

// only one pill ever, even on rapid taps
run(`view='history'; render();
     document.querySelector('.cd[data-hd]').click();
     document.querySelector('.cd[data-hd]').click();`);
check("only ever one up control",
      `document.querySelectorAll('.calreturn').length`, 1);

// v3.3.60: the IO's mandatory BIRTH report (calendar still on screen at tap
// time) must not kill the pill; only a genuine re-entry does. Shim IO and
// drive the callback by hand.
run(`
  {window._ioCbs=[];
   window.IntersectionObserver=function(cb){ window._ioCbs.push(cb);
     this.observe=()=>{}; this.disconnect=()=>{}; };
   view='history'; render();
   document.querySelector('.cd[data-hd]').click();}
`);
check("target armed with IO shimmed", `(()=>{const b=document.getElementById('calReturn'); return !!b&&!b.hidden;})()`, true);
run(`window._ioCbs[window._ioCbs.length-1]([{isIntersecting:true}]);`);
check("birth report does NOT clear the target",
      `(()=>{const b=document.getElementById('calReturn'); return !!b&&!b.hidden;})()`, true);
run(`window._ioCbs[window._ioCbs.length-1]([{isIntersecting:true}]);`);
check("genuine re-entry kills it",
      `(()=>{const b=document.getElementById('calReturn'); return !!b&&!b.hidden;})()`, false);

// v3.3.60: sticky-header clearance — scroll targets must reserve the header
const css = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
const sm = /\.day,\.cal\{scroll-margin-top:calc\(env\(safe-area-inset-top,0px\) \+ \d+px\)\}/.test(css);
console.log((sm?"PASS":"FAIL"), "day + cal reserve the sticky header via scroll-margin →", sm);
if (!sm) fail++;

// v3.3.65: the control is app-wide — scrolling deep shows it with an
// honest "top" label, on any tab, with no calendar jump involved.
run(`view='history'; render(); clearBackTarget();`);
check("hidden when not scrolled and nothing armed",
      `document.getElementById('calReturn').hidden`, true);
run(`Object.defineProperty(window,'scrollY',{value:900,configurable:true}); syncTopBtn();`);
check("appears once scrolled deep", `document.getElementById('calReturn').hidden`, false);
check("and it honestly says 'top'",
      `document.getElementById('calReturn').textContent`, "↑ top");
run(`view='stats'; render(); syncTopBtn();`);
check("works on other tabs too", `document.getElementById('calReturn').hidden`, false);
run(`Object.defineProperty(window,'scrollY',{value:0,configurable:true}); syncTopBtn();`);
check("hides again back at the top", `document.getElementById('calReturn').hidden`, true);

process.exit(fail ? 1 : 0);
