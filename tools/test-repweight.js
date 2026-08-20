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
/* v3.3.148: settiles are EDIT-mode-only since v3.3.144 — read mode renders
   the History grammar. The tile-anatomy checks below still matter (the tile
   is the edit surface), so enter EDIT before inspecting. The old render
   crashed here silently from that release on. */
run(`(function(){DB.days={}; day(todayISO).w.push({part:'Chest',ex:'Chest Press',w:16,reps:[35],at:Date.now()});
  SEED=deriveAll(); lift.ex='Chest Press'; lift.part='Chest'; lift.editToday=true; view='lift'; render();})()`);
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
// Seed 11 sets. v3.3.148: the CAP and #allSets died in the v3.3.144 merge —
// EDIT mode shows every set, read mode folds them into rows. This block
// asserted the cap for four releases after it was removed, crashing the
// suite silently at the #allSets deref. It now asserts the REPLACEMENT
// behaviour on both surfaces.
run(`(function(){DB.days={};
  for(let i=1;i<=11;i++) day(todayISO).w.push({part:'Chest',ex:'Chest Press',w:16,reps:[i],at:Date.now()+i});
  SEED=deriveAll(); lift.ex='Chest Press'; lift.part='Chest'; lift.editToday=true;
  view='lift'; render();})()`);
check("EDIT shows every one of the 11 sets — no cap, no expand control",
      `document.querySelectorAll('.settile').length===11 && !document.querySelector('#allSets')`, true);
check("...and the NEWEST set is the first tile, where it cannot be missed",
      `document.querySelector('.settile').textContent.includes('11')`, true);
// deletion still targets the right set despite the reversed render order
check("the first tile's data-del points at the LAST array entry (reversal is display-only)",
      `+document.querySelector('.settile').dataset.del === day(todayISO).w.length-1`, true);
// read mode: rows, not tiles — the fold is the cap now
run(`lift.editToday=false; render();`);
check("read mode folds 11 same-weight sets into ONE row",
      `document.querySelectorAll('.sess-now .lastrow').length`, 1);
check("...carrying all 11 chips", `document.querySelectorAll('.sess-now .repchip').length`, 11);

// the save flash follows the set — on the newest CHIP now, the tile's
// successor since v3.3.144 (the tile only exists in EDIT mode)
run(`(function(){lift.justSaved=true; render();})()`);
check("the fresh-save flash lands on the newest chip",
      `!!document.querySelector('.sess-now .repchip.fresh')`, true);
check("...which is the LAST chip, the set just logged",
      `[...document.querySelectorAll('.sess-now .repchip')].pop().className.includes('fresh')`, true);


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

/* ---- v3.3.148: the preview cannot resize the button --------------------
   jsdom has no layout, so the constant-height property is asserted where it
   is decided: the stylesheet pins #addrep to an explicit height with flex
   centring, and the sub-line carries no margin to push past it. Stated
   plainly: the true fix is judged on the phone; this stops the RULE from
   silently disappearing. */
{
  const css148 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
  const btnRule = (css148.match(/#addrep\{[^}]*\}/) || [""])[0];
  check("the Add set button has a pinned height", `${/height:\d+px/.test(btnRule)}`, true);
  check("...and centres its content instead of growing around it",
        `${/flex-direction:column/.test(btnRule) && /justify-content:center/.test(btnRule)}`, true);
  const subRule = (css148.match(/#addrep \.addsub\{[^}]*\}/) || [""])[0];
  check("...and the preview line adds no margin of its own", `${!/margin-top/.test(subRule)}`, true);
  run(`lift.weight=16; document.getElementById('rc')?(document.getElementById('rc').value='12'):0; updAddPreview();`);
  check("typing reps still writes the preview",
        `/addsub/.test((document.getElementById('addrep')||{innerHTML:''}).innerHTML)`, true);
  run(`document.getElementById('rc')?(document.getElementById('rc').value=''):0; updAddPreview();`);
  check("clearing reps restores the plain label",
        `(document.getElementById('addrep')||{textContent:''}).textContent`, "Add set");
}

/* ---- v3.3.154: the stranger-user fixes -------------------------------- */
{
  run(`(function(){DB.days={}; SEED=deriveAll();
    lift={ex:'Chest Press',part:'Chest',weight:16}; view='lift'; render();})()`);
  const before = run(`JSON.stringify([...document.querySelectorAll('.repgrid [data-rep]')].map(b=>b.dataset.rep))`);
  run(`document.querySelector('.repgrid [data-rep]').click();
       document.querySelector('.repgrid [data-rep]').click();
       document.querySelector('.repgrid [data-rep]').click();`);
  const after = run(`JSON.stringify([...document.querySelectorAll('.repgrid [data-rep]')].map(b=>b.dataset.rep))`);
  check("logging three sets does not move the rep tiles", `${before===after}`, true);
  run(`(function(){const el=document.getElementById('wv'); el.value=String(+el.value+10);
       el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const stepped = run(`JSON.stringify([...document.querySelectorAll('.repgrid [data-rep]')].map(b=>b.dataset.rep))`);
  check("...but stepping the weight still rebuilds them", `${stepped!==before}`, true);
  check("tiles read as reps: \u00d7 before every number",
        `document.querySelectorAll('.repgrid button .rx').length===document.querySelectorAll('.repgrid [data-rep]').length`, true);
  run(`setBw(todayISO,70); view='stats'; render(); document.querySelector('#secWeight .ibtn.tipi').click();`);
  check("scrolling closes an open tip",
        `(()=>{document.dispatchEvent(new Event('scroll'));
              return document.getElementById('tipFloat').hidden===true
                     && !document.querySelector('.tipi[aria-expanded="true"]');})()`, true);
}

// ---- v3.3.219: EVEN weight stepping, both units --------------------------
// The stepper moves in 2s, and a fractional value (a 23.5 kg leftover from a
// unit conversion) snaps to the next even number in the pressed direction
// instead of marching at x.5 forever. Driven through the REAL button.
run(`(function(){DB.settings.unit='kg'; view='lift';
  lift.part='Shoulder'; lift.ex='Lateral Raise'; lift.weight=14; render();})()`);
const wplus  = () => run(`document.querySelector('[data-w="1"]').click()`);
const wminus = () => run(`document.querySelector('[data-w="-1"]').click()`);
const wval   = () => run(`+document.getElementById('wv').value`);
wplus();
check("14 kg steps up to 16 — even, not 16.5", `${wval()}`, 16);
wminus(); wminus();
check("...and down to 12 the same way", `${wval()}`, 12);
run(`(function(){const el=document.getElementById('wv'); el.value='23.5';
     el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
wplus();
check("23.5 kg (a conversion leftover) snaps UP to 24, not 26", `${wval()}`, 24);
run(`(function(){const el=document.getElementById('wv'); el.value='23.5';
     el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
wminus();
check("...and DOWN to 22, not 21", `${wval()}`, 22);
check("the browser spinner agrees with the buttons (step attr is 2)",
      `document.getElementById('wv').getAttribute('step')`, 2);

// lb mode: v3.3.256 RESTATES the v3.3.219 "even in both units" law — that
// was a kg fact leaking across the unit boundary. lb racks run in FIVES
// (35, 40, 45...); 2 kg is 4.4 lb, a bell no lb gym stocks. Each unit
// system declares its own rack in W_TABLE.
run(`(function(){DB.settings.unit='lb'; render();})()`);
run(`(function(){const el=document.getElementById('wv'); el.value='31';
     el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
wplus();
check("31 lb steps to 35 — lb racks run in fives", `${wval()}`, 35);
wplus();
check("...then walks the rack: 35 to 40", `${wval()}`, 40);
check("...and the spinner agrees (step attr is 5)",
      `document.getElementById('wv').getAttribute('step')`, 5);
run(`DB.settings.unit='kg'; render();`);

// barbell stays on the plate-pair law — its loadline renders the exact
// breakdown, and even-stepping would demand 1 kg plates the model lacks
run(`(function(){view='lift'; lift.part='Legs'; lift.ex='Squat'; lift.weight=60; render();})()`);
wplus();
check("a barbell still moves by a plate pair: 60 kg \u2192 65", `${wval()}`, 65);

// the inferred-weight snapper without an exercise reads the stack row —
// the same fallback wLaw uses for an unknown class (v3.3.256; was a bare 2)
check("bare snapW falls back to the stack row", `${run(`wDisp(snapW(23.4))`)}`, 25);

// ---- v3.3.256: THE WHOLE TABLE, pinned cell by cell ----------------------
// One assertion per equipment class per unit system. If a future change
// moves any cell, this names exactly which room and which rack it broke.
{
  const CELLS=[  // [class, exemplar, kg step, lb step]
    ['barbell', 'Squat',          5, 10],
    ['smith',   'Incline Smith Machine Bench Press', 5, 10],
    ['cable',   'Cable Fly Up',   5, 10],
    ['machine', 'Chest Press',    5, 10],
    ['plate',   'Leg Press',      5, 10],
    ['dumbbell','Lateral Raise',  2,  5],
    ['body',    'Pull Up',        2,  5],
  ];
  for(const [cls,ex,kgS,lbS] of CELLS){
    const has=run(`equipOf(${JSON.stringify(ex)})`)===cls;
    if(!has){ console.log("FAIL table exemplar", ex, "is not", cls); fail++; continue; }
    run(`DB.settings.unit='kg';`);
    check(`W_TABLE ${cls}.kg steps ${kgS} (${ex})`, `wStep(${JSON.stringify(ex)})`, kgS);
    run(`DB.settings.unit='lb';`);
    check(`W_TABLE ${cls}.lb steps ${lbS}`, `wStep(${JSON.stringify(ex)})`, lbS);
  }
  run(`DB.settings.unit='kg'; render();`);
  // an unknown class reads as a stack in both units — the declared fallback
  check("an undeclared class falls back to the stack row (kg)", `(function(){
    DB.settings.custom={'Mystery Pull':{part:'Back',equip:'contraption'}};
    const v=wStep('Mystery Pull'); delete DB.settings.custom['Mystery Pull']; return v;})()`, 5);
}

// the maker's exact report: lb dumbbells walk the rack through real clicks
run(`(function(){DB.settings.unit='lb'; view='lift'; lift.part='Back';
  lift.ex='Lateral Raise'; lift.part='Shoulder'; lift.weight=toKg(55); lift._tiles=null; render();})()`);
run(`(function(){const el=document.getElementById('wv'); el.value='55';
     el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
wplus();
check("a 55 lb bell steps to the 60 on the rack, not to 57", `${wval()}`, 60);
wminus(); wminus();
check("...and back down the rack to 50", `${wval()}`, 50);
run(`DB.settings.unit='kg'; render();`);
check("kg dumbbells are untouched: still 2 (8, 10, 12 racks)", `wStep('Lateral Raise')`, 2);

// ---- v3.3.250: a CABLE is a stack, and stacks move in whole plates -------
// 5 kg / 10 lb faces. There is no 14 on the pin, so the even step was
// offering a weight the machine cannot make. Driven through the REAL buttons.
run(`(function(){DB.settings.unit='kg'; view='lift';
  lift.part='Chest'; lift.ex='Cable Fly Up'; lift.weight=15; lift._tiles=null; render();})()`);
check("the exercise under test really is a cable", `equipOf('Cable Fly Up')`, "cable");
wplus();
check("15 kg steps up a whole plate to 20, not 17", `${wval()}`, 20);
wminus(); wminus();
check("...and down to 10 the same way", `${wval()}`, 10);
run(`(function(){const el=document.getElementById('wv'); el.value='13';
     el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
wplus();
check("an off-stack 13 snaps UP to the next face, 15", `${wval()}`, 15);
run(`(function(){const el=document.getElementById('wv'); el.value='13';
     el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
wminus();
check("...and DOWN to 10, never to 11", `${wval()}`, 10);
check("the browser spinner agrees with the buttons (step attr is 5)",
      `document.getElementById('wv').getAttribute('step')`, 5);
check("snapW puts an inferred cable weight on a stack face",
      `${run(`wDisp(snapW(13,'Cable Fly Up'))`)}`, 15);

// lb mode: whole faces in pounds
run(`(function(){DB.settings.unit='lb'; lift._tiles=null; render();})()`);
run(`(function(){const el=document.getElementById('wv'); el.value='34';
     el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
wplus();
check("34 lb steps to 40 — a whole face in POUNDS too", `${wval()}`, 40);
check("...and the spinner says 10", `document.getElementById('wv').getAttribute('step')`, 10);
run(`DB.settings.unit='kg'; render();`);

// ---- v3.3.255: the dead − button on lb barbells --------------------------
// The box shows values rounded to 0.1 lb, but the grid is anchored at the
// EXACT bar (20 kg = 44.0925 lb), so every displayed value sat ~0.0075 above
// its own grid point and ceil-minus landed back on it. Reproduced through the
// real input + real clicks, in the maker's exact configuration.
run(`(function(){DB.settings.unit='lb'; view='lift'; lift.part='Legs';
  lift.ex='Deadlift'; lift.weight=toKg(214.1); lift._tiles=null; render();})()`);
run(`(function(){const el=document.getElementById('wv'); el.value='214.1';
     el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
wminus();
check("− from a displayed 214.1 lb moves a WHOLE step to 204.1", `${wval()}`, 204.1);
wminus();
check("...and keeps stepping: 204.1 to 194.1", `${wval()}`, 194.1);
wplus();
check("+ still steps one face back up to 204.1", `${wval()}`, 204.1);
// genuinely off-grid values still snap directionally to the next face
run(`(function(){const el=document.getElementById('wv'); el.value='213';
     el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
wminus();
check("a typed off-grid 213 still snaps DOWN to the 204.1 face", `${wval()}`, 204.1);
run(`(function(){const el=document.getElementById('wv'); el.value='213';
     el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
wplus();
check("...and UP to 214.1", `${wval()}`, 214.1);
run(`DB.settings.unit='kg'; render();`);

// v3.3.251 RESTATES the v3.3.250 scope note: `machine` was a mixed bucket and
// is now split, so it no longer keeps the even step — it IS a stack.
run(`(function(){view='lift'; lift.part='Chest'; lift.ex='Chest Press';
  lift.weight=15; lift._tiles=null; render();})()`);
check("a stack machine steps a whole face: 15 kg to 20", `(function(){
  document.querySelector('[data-w="1"]').click();
  return +document.getElementById('wv').value;})()`, 20);
// and a barbell's inferred weight now lands on a total the bar can BUILD
check("snapW puts an inferred barbell weight on a buildable total",
      `${run(`wDisp(snapW(72.5,'Squat'))`)}`, 75);

// ---- v3.3.251: `machine` splits into stack-fed and plate-loaded ----------
check("Leg Press is plate-loaded", `equipOf('Leg Press')`, "plate");
check("Hack Squat is plate-loaded", `equipOf('Hack Squat')`, "plate");
check("Leg Extension stayed a stack", `equipOf('Leg Extension')`, "machine");
check("...and an unknown exercise still falls back to a stack",
      `equipOf('No Such Exercise At All')`, "machine");
// both classes step 5 — for two different physical reasons, so both are asserted
run(`(function(){view='lift'; lift.part='Legs'; lift.ex='Leg Press';
  lift.weight=100; lift._tiles=null; render();})()`);
check("a plate-loaded sled steps a pair: 100 kg to 105", `(function(){
  document.querySelector('[data-w="1"]').click();
  return +document.getElementById('wv').value;})()`, 105);
// the load line states the plates and refuses to imply a total
check("the sled's load line names the per-side plates",
      `loadLine('Leg Press',100)`, "50 kg per side \u00b7 plates only");
check("...and at zero it says which number it is showing",
      `loadLine('Leg Press',0)`, "plates only \u2014 the sled is not counted");
check("...while a stack machine still shows no load line", `loadLine('Chest Press',60)`, "");
check("the plate class is offerable when you add your own exercise",
      `EQUIP_LABEL.plate`, "Machine (plate-loaded)");

// dumbbells and belts are the only classes left on the plain even step
check("a dumbbell still steps 2", `wStep('Lateral Raise')`, 2);
check("a belt still steps 2", `wStep('Pull Up')`, 2);

// ---- v3.3.251: every suggested weight is one the stepper can LAND on -----
// The drift this closes: overloadNudge has always snapped stacks to 5s while the
// stepper moved them by 2, so Today could name a weight +/- could not reach.
run(`(function(){DB.settings.unit='kg'; DB.days={}; DB.settings.nudgeX={};
  const D=n=>{const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-n);
    return d.toLocaleDateString('en-CA')};
  for(const n of [21,14,7]) DB.days[D(n)]={w:[
    {part:'Chest',ex:'Chest Press',w:42,reps:[10,10]},
    {part:'Legs', ex:'Leg Press', w:102,reps:[10,10]},
    {part:'Shoulder',ex:'Lateral Raise',w:9,reps:[10,10]}],upd:1,doneEx:[],donePart:[],doneAll:true};
  SEED=deriveAll();})()`);
/* these assert a value already computed in the VM, not an expression to run */
const checkVal = (name, got, want) => {
  const ok = String(got) === String(want);
  console.log((ok?"PASS":"FAIL"), name, "\u2192", got);
  if (!ok) fail++;
};
const reachable = ex => run(`(function(){
  const s=overloadNudge('${ex}'); if(!s||s.mode!=='w') return 'no suggestion';
  const {s:st,a}=wLaw('${ex}');
  const k=(toU(s.next)-a)/st;
  return Math.abs(k-Math.round(k))<1e-9 ? 'reachable' : 'UNREACHABLE '+toU(s.next);})()`);
checkVal("a stack machine's suggestion sits on a face the stepper can hit",
         reachable('Chest Press'), "reachable");
checkVal("a sled's suggestion sits on a loadable pair", reachable('Leg Press'), "reachable");
checkVal("a dumbbell's suggestion sits on a bell the stepper can hit",
         reachable('Lateral Raise'), "reachable");
check("...and the suggestion is still iron, never a decimal", `(function(){
  const s=overloadNudge('Chest Press'); return Number.isInteger(+wDisp(s.next));})()`, true);
run(`DB.days={}; SEED=deriveAll();`);


// ---- v3.3.222: BW+n — the added-weight convention on bodyweight lifts ----
run(`(function(){DB.settings.unit='kg'; view='lift';
  lift.part='Back'; lift.ex='Pull Up'; lift.weight=0; render();})()`);
check("a bodyweight lift's stepper is labelled in full words",
      `document.querySelector('.wsel .bwtag').textContent`, "Bodyweight +");
check("...as a caption above the number, not inline beside it",
      `(function(){const v=document.querySelector('.wsel .val');
        return v.classList.contains('bwval')
          && v.firstElementChild.classList.contains('bwtag');})()`, true);
check("...and it never says just BW",
      `/^BW\\b/.test(document.querySelector('.wsel .bwtag').textContent)`, false);
check("...and a barbell lift's is not",
      `(function(){lift.part='Legs'; lift.ex='Squat'; lift.weight=60; render();
        return !document.querySelector('.wsel .bwtag');})()`, true);
run(`(function(){lift.part='Back'; lift.ex='Pull Up'; lift.weight=0; render();})()`);
check("the label authority: 0 reads BW", `wLabel('Pull Up',0)`, "BW");
check("...10 added kilos read BW+10", `wLabel('Pull Up',10)`, "BW+10");
check("...and text form carries the unit", `wTxt('Pull Up',10)`, "BW+10kg");
check("...while a loaded lift is untouched", `wTxt('Squat',60)`, "60kg");
// stepping the belt follows the same even law as everything else
run(`(function(){const el=document.getElementById('wv'); el.value='0';
     el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
run(`document.querySelector('[data-w="1"]').click()`);
check("the belt steps up by 2 from BW", `+document.getElementById('wv').value`, 2);
// a weighted pull-up PR against a bodyweight history, end to end
run(`(function(){const D=n=>{const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
  DB.days={}; DB.settings.canon={};
  for(const n of [16,12]) DB.days[D(n)]={w:[{part:'Back',ex:'Pull Up',w:0,reps:[10]}],upd:1};
  DB.days[D(3)]={w:[{part:'Back',ex:'Pull Up',w:10,reps:[10]}],upd:1};
  migrateCanon(); SEED=deriveAll(); view='stats'; ga.grp='Back'; ga.open=null; render();})()`);
check("a first belt-loaded set is a PR over bodyweight history",
      `gaPR(Object.values(gaExerciseSessions()).find(e=>e.name==='Pull Up')).live`, true);
check("...badged as the added kilos", 
      `gaPR(Object.values(gaExerciseSessions()).find(e=>e.name==='Pull Up')).change.text`, "+10 kg");
check("...and the compact audit row omits the competing load record",
      `!document.querySelector('.garecord')`, true);
run(`document.querySelector('.garow[data-gaex]').click();`);
check("...and in the receipt, which names the BW set it beat",
      `(function(){const rows=[...document.querySelectorAll('.garcrow')];
        return /BW\\+10/.test(rows[0].textContent)
          && rows[1].querySelector('b').textContent==='BW \u00d7 10';})()`, true);

process.exit(fail ? 1 : 0);
