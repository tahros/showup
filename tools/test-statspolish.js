// test-statspolish.js DIR — v3.3.46. The weekday chart must highlight
// TODAY's weekday (accent) and mark the STRONGEST with a caret, and the
// report overlay must carry the app font family since it lives on <body>.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage46";

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

// Build 365 days where the STRONGEST weekday is deliberately NOT today, so
// "accent = today" and "caret = strongest" are distinguishable. todayISO is
// a Wednesday in the app's world (2026-07-22). Make Monday the strongest by
// training every Monday and only a few Wednesdays.
run(`
  const base=new Date(todayISO+'T00:00');
  for(let i=0;i<365;i++){
    const c=new Date(base); c.setDate(c.getDate()-i);
    const dow=c.getDay();               // 0 Sun .. 6 Sat
    const iso=c.toLocaleDateString('en-CA');
    // Mondays always; Wednesdays only 1 in 5 — Monday must win 'strongest'
    if(dow===1 || (dow===3 && i%5===0)) DB.days[iso]={w:[{part:'Back',ex:'Pull Up',w:70,reps:[8]}],upd:1};
  }
  SEED=deriveAll(); _fireDist=null;
  view='stats'; render();
`);

const todayDow = run(`new Date(todayISO+'T00:00').getDay()`);
console.log("     (today's weekday index:", todayDow + ", 3 = Wed)");

// the accent bar is today's column. Bars are drawn left→right S,M,T,W,T,F,S.
check("exactly one accent (today) bar",
      `[...document.querySelectorAll('.wd-col')].filter(r=>r.getAttribute('fill')==='var(--accent)').length`, 1);
check("the accent bar is at today's index",
      `[...document.querySelectorAll('.wd-col')].findIndex(r=>r.getAttribute('fill')==='var(--accent)')`, todayDow);

// the caret marks the strongest (Monday, index 1) — and NOT today
check("exactly one caret",
      `[...document.querySelectorAll('svg text')].filter(t=>t.textContent==='▲').length`, 1);
check("caret is NOT over today's bar", `(()=>{
    const carets=[...document.querySelectorAll('svg text')].filter(t=>t.textContent==='▲');
    const cx=parseFloat(carets[0].getAttribute('x'));
    const todayBar=[...document.querySelectorAll('.wd-col')][${todayDow}];
    const bx=parseFloat(todayBar.getAttribute('x'))+13;
    return Math.abs(cx-bx)>1;})()`, true);
check("legend explains the caret",
      `/your strongest/.test([...document.querySelectorAll('.note')].map(n=>n.textContent).join(' '))`, true);

// FIX 3: the report overlay carries the app font (it's mounted on <body>)
run(`repOvEl();`);   // build the overlay directly
check("report overlay uses the app font",
      `(()=>{const ov=document.getElementById('repOv'); return ov?/var\\(--body\\)/.test(ov.style.fontFamily)||ov.style.fontFamily.includes('Plex')||/--body/.test(ov.getAttribute('style')):'no-overlay';})()`, true);

process.exit(fail ? 1 : 0);
