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

// ---- v3.3.95: one fraction, one denominator ------------------------------
// The KPI card and the consistency chart render the same fact. They used
// different denominators on an unwritten day, so 62% and 61% appeared on one
// screen. These assert they are now the SAME arithmetic, not merely close.
const kpiExpr = `(function(){const dates=workoutDates();
  const el=elapsedDays();
  return [...dates].filter(d=>d.startsWith(thisYear)).length/el;})()`;
const curveExpr = `(function(){const c=yearCurves()[thisYear]; return c.curve[c.end-1];})()`;

// the exact reported case: day 207 of the year, 127 trained, today unwritten
check("elapsedDays() drops an unwritten today from the denominator",
      `(function(){delete DB.days[todayISO]; SEED=deriveAll();
        return elapsedDays()===doy(todayISO)-1;})()`, true);
check("...and counts it once it is written",
      `(function(){DB.days[todayISO]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};
        SEED=deriveAll(); const r=elapsedDays()===doy(todayISO);
        delete DB.days[todayISO]; SEED=deriveAll(); return r;})()`, true);

/* property: across many shapes of year the two are the SAME arithmetic.
   The curve is stored in a Float32Array, so it is compared through
   Math.fround() — demanding bit-identical float64 of a float32 store was
   the first draft's error, and it failed 11/12 on a 4e-9 difference while
   the code was already correct. Match the storage, not the ideal. */
check("KPI and chart endpoint are the same arithmetic across 12 year shapes",
      `(function(){
        const kept=JSON.parse(JSON.stringify(DB.days));
        let bad=0;
        for(const step of [2,3,4,5,6,7,8,9,10,11,13,17]){
          DB.days={}; const y=+todayISO.slice(0,4), D=doy(todayISO);
          for(let d=1; d<D; d+=step){
            const dt=new Date(y,0,d);
            DB.days[dt.toLocaleDateString('en-CA')]=
              {w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};
          }
          delete DB.days[todayISO]; SEED=deriveAll();
          const a=${kpiExpr}, b=${curveExpr};
          if(Math.fround(a)!==b) bad++;
        }
        DB.days=kept; SEED=deriveAll();
        return bad;})()`, 0);

// and identical AFTER rounding, which is what the screen actually shows
check("...and render as the same integer percent",
      `(function(){
        const kept=JSON.parse(JSON.stringify(DB.days));
        let bad=0;
        for(const step of [2,3,5,7,11]){
          DB.days={}; const y=+todayISO.slice(0,4), D=doy(todayISO);
          for(let d=1; d<D; d+=step){
            const dt=new Date(y,0,d);
            DB.days[dt.toLocaleDateString('en-CA')]=
              {w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};
          }
          delete DB.days[todayISO]; SEED=deriveAll();
          if(Math.round(${kpiExpr}*100)!==Math.round(${curveExpr}*100)) bad++;
        }
        DB.days=kept; SEED=deriveAll();
        return bad;})()`, 0);

// the rule cannot drift back into a second copy
const utilSrc95  = fs.readFileSync(path.join(dir, "js/util.js"), "utf8");
const headSrc95  = fs.readFileSync(path.join(dir, "js/header.js"), "utf8");
const statsSrc95 = fs.readFileSync(path.join(dir, "js/stats.js"), "utf8");
console.log((/function elapsedDays\(\)/.test(utilSrc95) ? "PASS" : "FAIL"),
  "elapsedDays() is defined once, in util.js");
if (!/function elapsedDays\(\)/.test(utilSrc95)) fail++;
const openCoded = [headSrc95, statsSrc95, utilSrc95]
  .filter(s => /doy\(todayISO\)\s*-\s*\(\s*trainedToday/.test(s)).length;
console.log((openCoded === 0 ? "PASS" : "FAIL"),
  "no file open-codes the elapsed rule any more \u2192", openCoded);
if (openCoded !== 0) fail++;
console.log((/elapsedDays\(\)/.test(headSrc95) && /elapsedDays\(\)/.test(statsSrc95) ? "PASS" : "FAIL"),
  "header.js and stats.js both call it");
if (!(/elapsedDays\(\)/.test(headSrc95) && /elapsedDays\(\)/.test(statsSrc95))) fail++;

// ---- v3.3.99: the game itself leads the KPIs -------------------------------
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  for(let i=1;i<=40;i++){const d=new Date(t); d.setDate(d.getDate()-i);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};}
  SEED=deriveAll(); view='stats'; render();})()`);
check("the Days card is the FIRST kpi",
      `/days of showing up/.test(document.querySelector('.kpis .kpi:first-child').innerHTML)`, true);
check("...showing the live total", `document.querySelector('.kpis .kpi:first-child .v').textContent`, "40");
check("...with the lifetime-pace caption",
      `/% of all days since/.test(document.querySelector('.kpis .kpi:first-child').innerHTML)`, true);
check("...and the section's ONE accent lives there",
      `document.querySelectorAll('.kpis .kpi.accent').length===1 && document.querySelector('.kpis .kpi.accent')===document.querySelector('.kpis .kpi:first-child')`, true);
// logging today moves the number — the card is live, like the grid total
check("logging today increments it to 41",
      `(function(){day(todayISO).w.push({part:'Back',ex:'Row',w:40,reps:[10],at:Date.now()});
        SEED=deriveAll(); render();
        const v=document.querySelector('.kpis .kpi:first-child .v').textContent;
        day(todayISO).w.pop(); SEED=deriveAll(); return v;})()`, "41");
// and it agrees with the month grid's total — one live-total rule everywhere
check("kpi total and grid total are the same arithmetic",
      `(function(){render(); // the previous check left the DOM one derive behind
        return document.querySelector('.kpis .kpi:first-child .v').textContent===String(gridData().total);})()`, true);

// ---- v3.3.100: hero row + one 3-up row --------------------------------------
run(`view='stats'; render();`);
check("the Days card is the hero, spanning its own row",
      `document.querySelector('.kpis .kpi:first-child').classList.contains('hero')`, true);
const cssSrc100 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
console.log((/\.kpi\.hero\{grid-column:1\/-1/.test(cssSrc100) ? "PASS" : "FAIL"),
  "hero spans the full grid width");
if (!/\.kpi\.hero\{grid-column:1\/-1/.test(cssSrc100)) fail++;
console.log((/\.kpis\{display:grid;grid-template-columns:repeat\(3,1fr\)/.test(cssSrc100) ? "PASS" : "FAIL"),
  "the row beneath is 3-up");
if (!/\.kpis\{display:grid;grid-template-columns:repeat\(3,1fr\)/.test(cssSrc100)) fail++;
check("four cards total: hero + three",
      `document.querySelectorAll('.kpis .kpi').length`, 4);
check("...and the three compact cards never say 'trained' \u2014 the heading says the game",
      `[...document.querySelectorAll('.kpis .kpi:not(.hero) .l')].some(l=>/trained/.test(l.textContent))`, false);
check("the streak card sits last with its comebacks beneath",
      `/streak/.test(document.querySelector('.kpis .kpi:last-child .l').textContent)`, true);

process.exit(fail ? 1 : 0);
