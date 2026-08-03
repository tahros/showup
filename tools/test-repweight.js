// test-repweight.js DIR — v3.3.56: rep tiles follow the chosen weight.
// Evidence at the weight fills first; the Epley curve predicts for weights
// never lifted; heavier weights must yield fewer reps.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage56";

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
const median = a => { const s=[...a].sort((x,y)=>x-y); return s[Math.floor(s.length/2)]; };

// history shaped like the screenshot: benches at 50 (high reps), some 35s,
// a few heavy 60×4s. 75 is never lifted.
run(`
  {const t0=new Date(todayISO+'T00:00');
   for(let i=1;i<=12;i++){
     const d=new Date(t0); d.setDate(d.getDate()-i*5);
     const iso=d.toLocaleDateString('en-CA');
     DB.days[iso]={w:[
       {part:'Chest',ex:'Incline Barbell Bench Press',w:50,reps:[20,23,16,18][i%4]?[[20,23,16,18][i%4]]:[20]},
       {part:'Chest',ex:'Incline Barbell Bench Press',w:35,reps:[25]},
       {part:'Chest',ex:'Incline Barbell Bench Press',w:60,reps:[4]},
       {part:'Chest',ex:'Pull Up',w:0,reps:[10]},
     ],upd:1,doneEx:[],donePart:[],doneAll:true};}
   SEED=deriveAll(); _fireDist=null;}
`);

const t50 = run(`JSON.stringify(repChoices('Incline Barbell Bench Press',50))`);
const t60 = run(`JSON.stringify(repChoices('Incline Barbell Bench Press',60))`);
const t75 = run(`JSON.stringify(repChoices('Incline Barbell Bench Press',75))`);
const t35 = run(`JSON.stringify(repChoices('Incline Barbell Bench Press',35))`);
console.log("     35kg:", t35, "\n     50kg:", t50, "\n     60kg:", t60, "\n     75kg:", t75);
const a35=JSON.parse(t35), a50=JSON.parse(t50), a60=JSON.parse(t60), a75=JSON.parse(t75);

check("evidence: 50kg tiles include the 20s you do", `${a50.includes(20)}`, true);
check("evidence: 35kg tiles include the 25s",        `${a35.includes(25)}`, true);
check("evidence: 60kg tiles include the 4s",         `${a60.includes(4)}`, true);
check("75kg (never lifted) still offers tiles",      `${a75.length>=4}`, true);
console.log((median(a75)<median(a50)?"PASS":"FAIL"), "heavier → fewer: median(75) < median(50) →", median(a75), "<", median(a50));
if (!(median(a75)<median(a50))) fail++;
console.log((median(a50)<=median(a35)?"PASS":"FAIL"), "lighter → more: median(50) <= median(35) →", median(a50), "<=", median(a35));
if (!(median(a50)<=median(a35))) fail++;
check("75kg predictions are honest singles-to-tens", `${Math.max(...JSON.parse(t75))<=12}`, true);

// bodyweight: weight-independent, whatever number is passed
check("bodyweight tiles ignore the weight",
      `JSON.stringify(repChoices('Pull Up',999))===JSON.stringify(repChoices('Pull Up',0))`, true);

// DOM: the grid re-tiles when the weight input changes
run(`
  lift={part:'Chest',ex:'Incline Barbell Bench Press',weight:50};
  view='lift'; render();
`);
const before = run(`[...document.querySelectorAll('.repgrid [data-rep]')].map(b=>b.textContent).join(',')`);
run(`
  const wv=document.getElementById('wv');
  wv.value='75';
  wv.dispatchEvent(new Event('input',{bubbles:true}));
`);
const after = run(`[...document.querySelectorAll('.repgrid [data-rep]')].map(b=>b.textContent).join(',')`);
console.log("     grid @50:", before, "\n     grid @75:", after);
check("grid re-tiles on manual weight input", `${JSON.stringify(before)!==JSON.stringify(after)}`, true);
check("re-tiled grid still has 8 buttons", `document.querySelectorAll('.repgrid [data-rep]').length`, 8);

// ---- v3.3.103: the dismiss badge sits flush at the corner, never negative -
// buildcheck's own v3.3.49 guard forbids a negative offset here (#app's
// overflow-x:clip forces overflow-y to compute 'auto' too, so anything
// hanging past .lschip's own box risks being shaved at the page edge). The
// fix is a FLUSH inset instead \u2014 checked here in plain Node against the
// CSS source, not through the vm bridge (pure string matching, no DOM
// needed \u2014 nesting this inside another template string is exactly the
// escaping mistake this harness has made twice already this session).
const cssSrc103 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
const lsxRule = (cssSrc103.match(/\.lschip \.lsx\{([^}]*)\}/) || [, ""])[1];
console.log((/top:0(?:px)?[;}]/.test(lsxRule) && /right:0(?:px)?[;}]/.test(lsxRule) ? "PASS" : "FAIL"),
  "the dismiss badge sits flush at the true corner (0,0)", "\u2192", lsxRule);
if (!(/top:0(?:px)?[;}]/.test(lsxRule) && /right:0(?:px)?[;}]/.test(lsxRule))) fail++;
console.log((!/(?:top|right):\s*-\d/.test(lsxRule) ? "PASS" : "FAIL"),
  "...and never with a negative offset (the v3.3.49 clip trap)");
if (/(?:top|right):\s*-\d/.test(lsxRule)) fail++;

// ---- v3.3.103: Logged Today's number and unit are one visual word --------
run(`(function(){DB.days={}; day(todayISO).w.push({part:'Chest',ex:'Chest Press',w:16,reps:[35],at:Date.now()});
  SEED=deriveAll(); lift.ex='Chest Press'; lift.part='Chest'; view='lift'; render();})()`);
// house lesson, repeated: a regex containing HTML closing tags collapses its
// own \/ escaping across this template-literal boundary before it ever
// reaches vm, so the regex terminates early on the first real "/" and the
// engine reads what's left as invalid flags. .includes() sidesteps it \u2014
// this exact failure mode is already in the harness's own notes.
check("the unit nests INSIDE the weight span, no separate flex item for it",
      `document.querySelector('.settile').innerHTML.includes('class="w">16<small>kg</small></span>')`, true);
check("...and the separator span carries ONLY the \u00d7, no duplicated unit text",
      `document.querySelector('.settile .x').textContent`, "×");
// the nested unit must read visually distinct (muted, smaller) like the
// Suggested chip's own <small>, not inherit the bold number style
const flatCss = cssSrc103.replace(/\n/g, "");
console.log((/\.settile \.w small\{[^}]*font-size:10px[^}]*color:var\(--muted\)/.test(flatCss) ? "PASS" : "FAIL"),
  "the nested unit has its own muted, smaller style rule");
if (!/\.settile \.w small\{[^}]*font-size:10px[^}]*color:var\(--muted\)/.test(flatCss)) fail++;
// a bodyweight set has no unit to nest \u2014 must not render an empty <small>
run(`(function(){DB.days={}; day(todayISO).w.push({part:'Chest',ex:'Push Up',w:0,reps:[20],at:Date.now()});
  SEED=deriveAll(); lift.ex='Push Up'; lift.part='Chest'; view='lift'; render();})()`);
check("a bodyweight set renders no unit at all (not even an empty <small>)",
      `document.querySelector('.settile').innerHTML.includes('<small>')`, false);

// ---- v3.3.104: the newest set leads, and the list stays short ------------
// Seed 11 sets so the cap (6) is exercised, newest = 11 reps.
run(`(function(){DB.days={};
  for(let i=1;i<=11;i++) day(todayISO).w.push({part:'Chest',ex:'Chest Press',w:16,reps:[i],at:Date.now()+i});
  SEED=deriveAll(); lift.ex='Chest Press'; lift.part='Chest'; lift.allSets=false;
  view='lift'; render();})()`);
check("a long session shows only the recent handful, not all 11",
      `document.querySelectorAll('.settile').length`, 6);
check("...and the NEWEST set is the first tile, where it cannot be missed",
      `document.querySelector('.settile').textContent.includes('11')`, true);
check("...with the oldest of the visible six last",
      `[...document.querySelectorAll('.settile')].pop().textContent.includes('6')`, true);
check("an expand control appears, naming the full count",
      `document.querySelector('#allSets').textContent`, "Show all 11");

// expanding shows everything, still newest-first
run(`document.querySelector('#allSets').click();`);
check("expanding reveals all 11", `document.querySelectorAll('.settile').length`, 11);
check("...still newest-first", `document.querySelector('.settile').textContent.includes('11')`, true);
check("...and the control offers the way back", `document.querySelector('#allSets').textContent`, "Show recent only");
run(`lift.allSets=false; render();`);

// a short session needs no control at all — absence shown by absence
run(`(function(){DB.days={};
  for(let i=1;i<=3;i++) day(todayISO).w.push({part:'Chest',ex:'Chest Press',w:16,reps:[i],at:Date.now()+i});
  SEED=deriveAll(); view='lift'; render();})()`);
check("a short session shows every set and no expand control",
      `document.querySelectorAll('.settile').length===3 && !document.querySelector('#allSets')`, true);

// deletion still targets the right set despite the reversed render order
check("the first tile's data-del points at the LAST array entry (reversal is display-only)",
      `+document.querySelector('.settile').dataset.del === day(todayISO).w.length-1`, true);

// the save flash follows the set, not a position
run(`(function(){lift.justSaved=true; render();})()`);
check("the fresh-save animation lands on the newest tile, now at the front",
      `document.querySelector('.settile').className.includes('saved')`, true);

// ---- v3.3.104: every log path confirms, at the point of action -----------
const appSrc104 = fs.readFileSync(path.join(dir, "js/app.js"), "utf8");
const logPaths = (appSrc104.match(/lift\.justSaved=true;save\(\);renderHeader\(\);/g) || []).length;
const toasted = (appSrc104.match(/lift\.justSaved=true;save\(\);renderHeader\(\);setToast\(/g) || []).length;
/* v3.3.143: floor 3 -> 2. It counted the log paths that existed at v3.3.104
   — rep tile, custom entry, and the Suggested chip — and the chip path was
   deleted with the chips. The invariant under test is logPaths === toasted,
   that every path which logs also confirms; the floor is only a guard
   against the regex matching nothing at all. */
console.log((logPaths === toasted && toasted >= 2 ? "PASS" : "FAIL"),
  "every log path calls setToast \u2014", `${toasted}/${logPaths}`);
if (!(logPaths === toasted && toasted >= 3)) fail++;
// and it reads correctly for a bodyweight lift
check("the confirmation says BW for a bodyweight set, not '0kg'",
      `(function(){let m=''; const o=toast; toast=t=>m=t;
        setToast('Push Up',0,20); toast=o; return m;})()`, "BW \u00d7 20 logged");

process.exit(fail ? 1 : 0);
