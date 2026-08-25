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
/* v3.3.286 RESTATES: the tile row became a ruler. The property being
   defended is unchanged — the rep EMPHASIS follows the weight (v3.3.56) —
   so it is now read off which notches are marked, not which tiles exist. */
const before = run(`[...document.querySelectorAll('.repruler .rr.maj')].map(b=>b.dataset.rep).join(',')`);
run(`
  const wv=document.getElementById('wv');
  wv.value='75';
  wv.dispatchEvent(new Event('input',{bubbles:true}));
`);
const after = run(`[...document.querySelectorAll('.repruler .rr.maj')].map(b=>b.dataset.rep).join(',')`);
console.log("     emphasis @50:", before, "\n     emphasis @75:", after);
check("the ruler re-marks on manual weight input", `${JSON.stringify(before)!==JSON.stringify(after)}`, true);
check("...and every rep is still reachable, not just the marked ones",
      `document.querySelectorAll('.repruler .rr').length >= 30`, true);
/* the notch you are parked on must not move under your thumb when the
   emphasis is rebuilt — the v3.3.154 no-moving-targets law, kept */
check("...and the notch you were on survives the rebuild",
      `(function(){repRulerTo(9,false); const wv=document.getElementById('wv');
        wv.value='80'; wv.dispatchEvent(new Event('input',{bubbles:true}));
        return repRulerValue();})()`, 9);

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
  /* v3.3.290: the preview line is gone, so its no-margin rule went with it.
     The pinned box survives and now defends a smaller thing — the label
     changing width from "8 reps" to "12 reps" must not move the button. */
  check("...and no preview rule survives to describe a deleted line",
        `${!/#addrep \.addsub/.test(css148)}`, true);
  /* v3.3.290 RESTATES: the volume preview is gone — it was the last heavy
     thing in the slide, and the only place the app commented on a set you had
     not done yet. The button now says only what it will do. */
  run(`lift.weight=16; repRulerTo(12,false);`);
  check("the button names the reps it will log",
        `/^Add set . 12 reps$/.test((document.getElementById('addrep')||{textContent:''}).textContent.trim())`, true);
  check("...and carries no volume preview at all",
        `/addsub|\u25b2/.test((document.getElementById('addrep')||{innerHTML:''}).innerHTML)`, false);
  /* with no weight yet the button cannot promise a volume — it falls back to
     naming the reps alone rather than a stale number */
  run(`lift.weight=0; updAddPreview();`);
  check("with no weight, the label drops the volume and keeps the reps",
        `(document.getElementById('addrep')||{textContent:''}).textContent`, "Add set \u00b7 12 reps");
  /* the "no reps at all" branch is deliberately NOT asserted: the ruler
     always holds a value, so that state is unreachable in the app. A test
     for a state the product cannot enter proves nothing. */
}

/* ---- v3.3.154: the stranger-user fixes -------------------------------- */
{
  run(`(function(){DB.days={}; SEED=deriveAll();
    lift={ex:'Chest Press',part:'Chest',weight:16}; view='lift'; render();})()`);
  /* v3.3.286 RESTATES the v3.3.154 stranger-user law for the ruler. The law
     is "no moving targets under thumbs": logging must not rearrange the
     choices, while stepping the weight still may. On the ruler the notches
     are a fixed number line that CANNOT reorder — so the law now bites on
     the two things that could still move: the emphasis, and the notch you
     are parked on. */
  const before = run(`JSON.stringify([...document.querySelectorAll('.repruler .rr.maj')].map(b=>b.dataset.rep))`);
  run(`repRulerTo(10,false);
       document.querySelector('.repruler .rr.on').click();
       document.querySelector('.repruler .rr.on').click();
       document.querySelector('.repruler .rr.on').click();`);
  const after = run(`JSON.stringify([...document.querySelectorAll('.repruler .rr.maj')].map(b=>b.dataset.rep))`);
  check("logging three sets does not move the emphasis", `${before===after}`, true);
  check("...and leaves you parked on the same notch", `repRulerValue()`, 10);
  check("...having actually logged them", `day(todayISO).w.filter(s=>s.ex==='Chest Press').length`, 3);
  run(`(function(){const el=document.getElementById('wv'); el.value=String(+el.value+10);
       el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const stepped = run(`JSON.stringify([...document.querySelectorAll('.repruler .rr.maj')].map(b=>b.dataset.rep))`);
  check("...but stepping the weight still re-marks them", `${stepped!==before}`, true);
  check("the number line itself never reorders",
        `(function(){const r=[...document.querySelectorAll('.repruler .rr')].map(b=>+b.dataset.rep);
          return r.every((v,i)=>i===0||v===r[i-1]+1) && r[0]===1;})()`, true);
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
    ['cable',   'Cable Fly Up',   5,  5],   // v3.3.262: lb stacks face in 5s and 10s; 5 lands on every face of both
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
/* v3.3.262 RESTATES: lb cables step 5, not 10 — the maker's stack is faced
   in 5s and a 10-step could not select half of it. 34 snaps up to 35. */
check("34 lb steps to 35 — the next face on a 5-lb stack", `${wval()}`, 35);
wplus();
check("...then 40 — which is also a face on a 10-lb stack", `${wval()}`, 40);
check("...and the spinner says 5", `document.getElementById('wv').getAttribute('step')`, 5);
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

// ---- v3.3.283: editing the bar weight is a FORM, not a load line ---------
// Four children in the one-row flex built for three meant the label
// collapsed to a narrow column and wrapped down six lines. The edit state
// now stacks, and the container carries a modifier that must survive an
// in-place refresh — refreshLoad() runs on every weight tap.
run(`(function(){DB.days={}; DB.settings.unit='lb'; SEED=deriveAll();
  view='lift'; lift.part='Biceps'; lift.ex='EZ Bar Curl';
  lift.weight=toKg(40); lift.editBar=false; render();})()`);
check("the resting load line keeps its three-part row",
      `(function(){const c=[...document.getElementById('ll').children].map(x=>x.className.split(' ')[0]);
        return c.join(',')==='ll-viz,ll-text,ll-bar'
          && !document.getElementById('ll').classList.contains('editing');})()`, true);
run(`document.querySelector('[data-editbar]').click()`);
check("editing stacks question, answer, choices",
      `(function(){const c=[...document.getElementById('ll').children].map(x=>x.className.split(' ')[0]);
        return c.join(',')==='ll-q,barinput,ll-choices';})()`, true);
check("...the container says it is a form",
      `document.getElementById('ll').classList.contains('editing')`, true);
check("...the label owns a full row of its own, not a squeezed column",
      `(function(){const l=document.querySelector('.ll-q');
        return l.tagName==='LABEL' && l.parentElement.id==='ll'
          && l.getAttribute('for')==='barIn';})()`, true);
check("...and all three choices sit in one group",
      `[...document.querySelectorAll('.ll-choices .ll-bar')].length`, 3);
/* the trap: refreshLoad() rewrites #ll on every weight tap and would drop
   the modifier, snapping the form back into the row it just left */
run(`(function(){const wv=document.getElementById('wv'); if(wv){wv.value='45'; refreshLoad();}})()`);
check("a weight tap while editing does not collapse the form",
      `(function(){return document.getElementById('ll').classList.contains('editing')
        && !!document.querySelector('.ll-choices') && !!document.querySelector('.ll-q');})()`, true);
run(`document.querySelector('[data-cancelbar]').click()`);
check("cancelling returns the resting row",
      `(function(){const ll=document.getElementById('ll');
        return !ll.classList.contains('editing') && !!ll.querySelector('.ll-viz');})()`, true);

// ---- v3.3.284: your gym outranks the catalog -----------------------------
// A per-exercise equipment override, checked ahead of SEED.equip. The
// W_TABLE still owns the LAW; this only decides which class an exercise is.
// Driven through the real chips, asserted on the stepper that results.
run(`(function(){DB.days={}; DB.settings.unit='lb'; DB.settings.equipOv=null;
  SEED=deriveAll(); view='lift'; lift.part='Triceps';
  lift.ex='Overhead Triceps Extension'; lift.weight=toKg(40);
  lift.editEquip=null; lift.editBar=false; render();})()`);
check("the catalog's answer is what you get by default",
      `equipOf('Overhead Triceps Extension')`, "machine");
check("...and the line states the step AND the equipment behind it",
      `/steps 10 lb . Machine \\(stack\\)/.test(document.querySelector('.eqline').textContent)`, true);
run(`document.querySelector('[data-editequip]').click()`);
check("the picker offers every class, with the current one marked",
      `(function(){const on=document.querySelectorAll('[data-seteq].on');
        return document.querySelectorAll('[data-seteq]').length===7
          && on.length===1 && on[0].dataset.seteq==='machine';})()`, true);
run(`[...document.querySelectorAll('[data-seteq]')].find(b=>b.dataset.seteq==='dumbbell').click()`);
check("choosing dumbbell changes the class", `equipOf('Overhead Triceps Extension')`, "dumbbell");
check("...and the STEP follows, because W_TABLE still owns the law",
      `wStep('Overhead Triceps Extension')`, 5);
check("...the spinner attribute agrees", `document.getElementById('wv').getAttribute('step')`, 5);
/* the trap: snapW is (kg, ex). Called (ex, kg) it returns NaN, and the next
   + tap computed from NaN — 40 became 5. Assert the weight SURVIVES. */
check("the weight you were on survives the change", `+document.getElementById('wv').value`, 40);
run(`document.querySelector('[data-w="1"]').click()`);
check("...and one tap up is now 5, not 10", `+document.getElementById('wv').value`, 45);
run(`document.querySelector('[data-w="-1"]').click(); document.querySelector('[data-w="-1"]').click();`);
check("...and down the same", `+document.getElementById('wv').value`, 35);
check("the override is stored, not just in view state",
      `DB.settings.equipOv['Overhead Triceps Extension']`, "dumbbell");
run(`(function(){document.querySelector('[data-editequip]').click();
  [...document.querySelectorAll('[data-seteq]')].find(b=>b.dataset.seteq==='machine').click();})()`);
check("choosing the catalog's own answer again removes the override",
      `!('Overhead Triceps Extension' in (DB.settings.equipOv||{}))`, true);
check("...and the step returns with it", `wStep('Overhead Triceps Extension')`, 10);
/* a rename must CARRY the override rather than orphan it — asserted by
   actually running the merge, not by grepping the source for the bag name */
check("a rename carries the override to the new name",
      `(function(){
        DB.settings.equipOv={'Old Tricep Move':'dumbbell'};
        canonMerge(canonId('Old Tricep Move',true), canonId('Overhead Triceps Extension',true));
        return DB.settings.equipOv['Overhead Triceps Extension']==='dumbbell'
          && !('Old Tricep Move' in DB.settings.equipOv);})()`, true);

// ---- v3.3.286: the rep ruler ---------------------------------------------
// One continuous scrubber where the tile row was. Two laws it must keep:
// the fast path (arrive on the suggestion, one tap logs it) and no writing
// a set the thumb did not mean (a tap off-centre only moves the ruler).
run(`(function(){DB.days={}; DB.settings.unit='lb'; const t0=new Date(todayISO+'T00:00');
  const D=n=>{const d=new Date(t0);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
  for(let i=1;i<=12;i++) DB.days[D(i*3)]={w:[{part:'Shoulder',ex:'Dumbbell Shoulder Press',
    w:toKg(55),reps:[8,8,8]}],upd:1};
  SEED=deriveAll(); view='lift'; lift={part:'Shoulder',ex:'Dumbbell Shoulder Press',weight:toKg(55)};
  render();})()`);
check("the ruler opens centred on the suggested rep", `repRulerValue()`, 8);
check("...and that notch is the one marked", `document.querySelector('.repruler .rr.on').dataset.rep`, "8");
check("...with the suggestion tick on it", `!!document.querySelector('.repruler .rr[data-rep="8"].sug')`, true);
check("...and the button names what it will log",
      `/Add set . 8 reps/.test(document.getElementById('addrep').textContent)`, true);
// a tap off the centre band moves the ruler and writes NOTHING
const n0 = run(`day(todayISO).w.length`);
run(`document.querySelector('.repruler .rr[data-rep="12"]').click()`);
check("a tap off-centre logs nothing", `day(todayISO).w.length`, n0);
check("...it centres that notch instead", `repRulerValue()`, 12);
check("...and the button follows it",
      `/Add set . 12 reps/.test(document.getElementById('addrep').textContent)`, true);
// a tap ON the centred notch is the fast path: one tap, one set
run(`document.querySelector('.repruler .rr.on').click()`);
check("a tap on the centred notch logs it", `day(todayISO).w.length`, n0+1);
check("...with the reps it showed", `JSON.stringify(day(todayISO).w[day(todayISO).w.length-1].reps)`, "[12]");
check("...and the ruler stays where you left it", `repRulerValue()`, 12);
// Add set is the same value by another route
run(`document.getElementById('addrep').click()`);
check("Add set logs the centred value too",
      `JSON.stringify(day(todayISO).w[day(todayISO).w.length-1].reps)`, "[12]");
// the selection lives in STATE, not in a scroll offset that a rebuild resets
check("the selection survives a full re-render",
      `(function(){renderLift(); return repRulerValue();})()`, 12);
// the nudge used to type into the removed field; it must drive the ruler
run(`(function(){lift.rep=8; renderLift();})()`);
/* v3.3.289: the far end must be reachable, and the range must clear anything
   you have ever done. Both were the same bug — the ruler stopped with the
   last notch pinned at the screen edge because WebKit drops a flex
   scroller's trailing padding, so the highest number was also unselectable. */
check("the ruler runs well past your best rep", `repRulerRange('Dumbbell Shoulder Press') >= 60`, true);
check("...and the last notch is that number",
      `+[...document.querySelectorAll('.repruler .rr')].pop().dataset.rep`,
      run(`repRulerRange('Dumbbell Shoulder Press')`));
check("...which is selectable, not stranded at the edge",
      `(function(){const hi=repRulerRange(lift.ex); repRulerTo(hi,false); return repRulerValue();})()`,
      run(`repRulerRange('Dumbbell Shoulder Press')`));
check("both ends carry a spacer so either can reach the centre",
      `document.querySelectorAll('.rrtrack > .rrpad').length`, 2);
check("...one lead, one tail, wrapping the notches",
      `(function(){const k=[...document.querySelector('.rrtrack').children];
        return k[0].classList.contains('rrpad') && k[k.length-1].classList.contains('rrpad');})()`, true);
/* the per-notch path must stay cheap: it moves a class and nothing else */
/* v3.3.290: with the preview gone the label is a single text node, so it
   updates ON the cheap path rather than waiting for the scroll to settle.
   What must stay true is that crossing a notch does no STRUCTURAL work —
   no element is created or destroyed, only a class and a string move. */
check("crossing a notch moves the band and the label",
      `(function(){repRulerTo(12,false);
        const kids=document.getElementById('addrep').children.length;
        repRulerBand(13);
        return document.querySelector('.rr.on').dataset.rep==='13'
          && /Add set . 13 reps/.test(document.getElementById('addrep').textContent)
          && document.getElementById('addrep').children.length===kids;})()`, true);
check("...and builds no child elements while doing it",
      `document.getElementById('addrep').children.length`, 0);

/* v3.3.291: the ruler owns its axis, and the tick is a real haptic where one
   is available. Both are properties of the shipped code, not of jsdom, so
   what is asserted is the declaration and the branching — the FEEL can only
   be judged on a phone. */
/* the CSS axis lock and the feature-detect are DECLARATIONS, so they live in
   buildcheck with the other structural ruler guards. What is behavioural —
   and therefore asserted here — is what the tick actually does. */
check("a tick creates at most one hidden switch and reuses it",
      `(function(){_hapAt=0; repTick(); _hapAt=0; repTick();
        return document.querySelectorAll('.haptswitch').length<=1;})()`, true);
check("...and a burst inside the throttle window is dropped",
      `(function(){const before=Date.now(); _hapAt=before;
        let n=0; const i=document.querySelector('.haptswitch input');
        if(i) i.addEventListener('click',()=>n++);
        repTick(); repTick(); repTick(); return n;})()`, 0);

check("a rep nudge moves the ruler rather than a dead field",
      `(function(){const b=document.createElement('button');
        b.id='nudgeGo'; b.dataset.nr='15'; document.getElementById('view').appendChild(b);
        b.click(); return repRulerValue();})()`, 15);

// ---- v3.3.302: the weight reads, it does not shout ----------------------
// The number was 600-weight at 12px with the unit jammed against the digits
// ("165.3lb"), so it competed with the exercise name for the row. Now
// regular weight, a shade larger, and a space before the unit.
run(`(function(){DB.days={}; DB.settings.unit='lb'; const t=new Date(todayISO+'T00:00');
  const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
  for(const n of [4,11,18]) DB.days[D(n)]={w:[
    {part:'Back',ex:'Bent-Over Row',w:toKg(165),reps:[10],at:1}],upd:1};
  SEED=deriveAll(); view='lift'; lift.ex=null; lift.part='Back'; render();})()`);
check("the unit is a separate word, not glued to the digits",
      `(function(){const e=[...document.querySelectorAll('.pr-top')].find(x=>x.textContent.trim());
        return /^[\\d.,]+ (lb|kg)$/.test(e.textContent.trim());})()`, true);
check("...and the per-side line reads the same way",
      `(function(){const e=document.querySelector('.pr-side');
        return e ? /^[\\d.,]+ (lb|kg) \\/ side$/.test(e.textContent.trim()) : 'no side';})()`, true);
/* v3.3.305: the hairline must read as well in light as it does in dark.
   Light was #DDDDDD (1.36:1 on its own card) against dark's #424242 (1.71),
   so the same rows looked like pills at night and like nothing by day. The
   pin is the PARITY, not either literal: whatever the two themes use, the
   light hairline may not be far weaker than the dark one. */
{
  const cssL = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
  /* the theme blocks open with long comments, so the window has to reach past
     them — 1600 chars stopped short of --line and returned null */
  const grab = (block, tok) => {
    const i = cssL.indexOf(block); if (i < 0) return null;
    const m = cssL.slice(i, i + 9000).match(new RegExp("--" + tok + ":\\s*(#[0-9A-Fa-f]{6})"));
    return m ? m[1] : null;
  };
  const srgb = c => (c/=255, c<=0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4);
  const lum = h => { const [r,g,b]=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
    return .2126*srgb(r)+.7152*srgb(g)+.0722*srgb(b); };
  const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p); return (x+.05)/(y+.05); };
  const L = { line: grab('[data-theme="light"]','line'), surface: grab('[data-theme="light"]','surface') };
  const D = { line: grab(':root{','line'), surface: grab(':root{','surface') };
  const lv = ratio(L.line, L.surface), dv = ratio(D.line, D.surface);
  check("the light hairline is visible on its own card",
        `${lv >= 1.5}`, "true");
  check("...and not markedly weaker than the dark one",
        `${lv >= dv * 0.85}`, "true");
  check("every pill family declares a hairline",
        `${["\\.item\\.goto\\{", "\\.item\\.logrow:not\\(\\.goto\\):not\\(\\.todayrow\\)\\{", "\\.item\\.todayrow\\{"]
            .every(sel => { const m = cssL.replace(/\r?\n\s*/g,"").match(new RegExp(sel + "[^}]*")); 
                            return m && /border:0\.5px solid var\(--(line|live)\)/.test(m[0]); })}`, "true");
}

/* v3.3.304: rows use the same white every other card uses, and the press
   goes to --surface2. That token is one step toward the page in light and
   one step away from it in dark, so the SAME declaration darkens on light
   and lightens on dark — which is the correct press direction in each. */
{
  const css304 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  check("go-to rows sit on the card surface, not the recessed one",
        `${/\.item\.goto\{[^}]*background:var\(--surface\)/.test(css304)
           && !/\.item\.goto\{[^}]*background:var\(--surface2\)/.test(css304)}`, "true");
  check("...and so do the ranked rows",
        `${/\.item\.logrow:not\(\.goto\):not\(\.todayrow\)\{[^}]*background:var\(--surface\)/.test(css304)}`, "true");
  check("...and Today's session rows, live and finished alike",
        `${/\.item\.todayrow\{[^}]*background:var\(--surface\)/.test(css304)
           && /\.item\.todayrow\.fin\{[^}]*background:var\(--surface\)/.test(css304)}`, "true");
  check("the press moves to a DIFFERENT surface than the resting one",
        `${/\.item\.logrow:active\{[^}]*background:var\(--surface2\)/.test(css304)
           && /\.item\.todayrow:active\{[^}]*background:var\(--surface2\)/.test(css304)}`, "true");
}

/* v3.3.317 REVERSES v3.3.316. That release put the live state on the log
   card and pinned, deliberately, that the Add-set button must NEVER be red —
   my argument, not the maker's. He used it and rejected it, so the guard
   reverses with the decision: a guard defending an argument the product has
   settled is worse than no guard.
   The button now carries .livego, the same red-plus-pulse the Continue
   button has used since v3.2 — one live treatment in the app, not two. */
run(`(function(){DB.days={}; DB.settings.unit='lb'; SEED=deriveAll();
  view='lift'; lift={part:'Back',ex:'Deadlift',weight:toKg(205)}; render();})()`);
check("before a session starts, Add set is the ordinary accent button",
      `document.getElementById('addrep').className`, "btn");
run(`(function(){day(todayISO).w.push({part:'Back',ex:'Deadlift',w:toKg(205),reps:[6],at:Date.now()});
  SEED=deriveAll(); render();})()`);
check("a set open turns Add set live",
      `document.getElementById('addrep').classList.contains('livego')`, true);
check("...and the log card is NOT separately reddened — one signal, not two",
      `!!document.querySelector('.zone.prime.liveZone')||!!document.querySelector('.livetag')`, false);
run(`(function(){day(todayISO).doneAll=true; SEED=deriveAll(); render();})()`);
check("closing the session returns it to accent",
      `document.getElementById('addrep').className`, "btn");
{
  const cssL = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  check("live reuses the app's existing red treatment, not a second one",
        `${/\.chip\.on\.livego,\.btn\.livego\{[^}]*background:var\(--live\)/.test(cssL)}`, "true");
  check("...and it pulses",
        `${/\.chip\.on\.livego,\.btn\.livego\{[^}]*animation:livepulse/.test(cssL)}`, "true");
  check("...but stops entirely under reduced-motion",
        `${/prefers-reduced-motion:reduce\)\{\.chip\.on\.livego,\.btn\.livego\{animation:none\}/.test(cssL)}`, "true");
}

/* v3.3.315: Run stores DISTANCE in the field lifts use for weight, so the
   go-to row was passing kilometres through the weight formatter and printing
   "4.3 lb" for a 1.95 km run. It now reads as a distance, in the same unit
   and to the same precision the header uses for the very same run. */
run(`(function(){DB.days={}; DB.settings.unit='lb'; const t=new Date(todayISO+'T00:00');
  for(let i=1;i<=40;i++){ const d=new Date(t); d.setDate(d.getDate()-i);
    DB.days[d.toLocaleDateString('en-CA')]={w:[
      {part:'Run',ex:'Run',w:3.76,reps:[],mins:27,secs:0,at:1},
      {part:'Back',ex:'Bent-Over Row',w:toKg(165),reps:[10],at:2}],upd:1};}
  SEED=deriveAll(); SEED.pr['Run']={mw:3.76,mwr:0,mwd:todayISO,bv:0,bvr:0,bvw:0,bvd:''};
  view='lift'; lift.ex=null; lift.part='Run'; render();})()`);
const _runCell = () => run(`(function(){const r=[...document.querySelectorAll('.item.logrow')]
  .find(x=>x.querySelector('b').textContent.indexOf('Run')===0);
  return r?r.querySelector('.pr-top').textContent:'(none)';})()`);
check("Run reads as a distance, never as a weight", `${!/\b(lb|kg)\b/.test(_runCell())}`, "true");
check("...in the app's distance unit", `${/^[\d.]+ (mi|km)$/.test(_runCell())}`, "true");
check("...and agrees with the header for the same run",
      `${_runCell() === run(`dDisp(3.76)+' '+DU()`)}`, "true");
run(`(function(){DB.settings.unit='kg'; lift.part='Run'; render();})()`);
check("...in metric too", `${_runCell() === '3.76 km'}`, "true");
/* a lift must not be caught by the same branch */
run(`(function(){DB.settings.unit='lb'; lift.part='Back'; render();})()`);
check("a lift still reads as a weight",
      `${/^[\d.,]+ lb$/.test(run(`(function(){const r=[...document.querySelectorAll('.item.logrow')]
        .find(x=>x.querySelector('b').textContent.indexOf('Bent-Over Row')===0);
        return r?r.querySelector('.pr-top').textContent:'';})()`))}`, "true");

/* v3.3.303: a weight is ONE token. The cell was pinned to 58px and a 14px
   go-to weight with the new unit space needs 58.8px, so "88.2 lb" broke onto
   two lines — while rows with a longer "/ side" line escaped, because that
   line forced the cell wider. Both halves are pinned: the cell may not be a
   fixed width, and neither line may wrap. */
{
  const css303 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  check("neither weight line may wrap",
        `${/\.pr-top,\.pr-side\{[^}]*white-space:nowrap/.test(css303)}`, "true");
  check("...and the cell sizes to its content rather than a fixed width",
        `${/\.item\.logrow \.pr-cell\{[^}]*flex:0 0 auto/.test(css303)
           && !/\.item\.logrow \.pr-cell\{[^}]*flex:0 0 \d+px/.test(css303)}`, "true");
  check("...with a floor so short weights still hold the column",
        `${/\.item\.logrow \.pr-cell\{[^}]*min-width:\d+px/.test(css303)}`, "true");
}
{
  const css302 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  check("the weight is set at regular, not bold",
        `${/\.pr-top\{[^}]*font-weight:400/.test(css302) && !/\.pr-top\{[^}]*font-weight:600/.test(css302)}`, "true");
  check("...and no row variant puts the bold back",
        `${!/\.pr-top\{[^}]*font-weight:[56]00/.test(css302)}`, "true");
  check("...still mono, so the digits align down the column",
        `${/\.pr-cell\{[^}]*font-family:var\(--mono\)/.test(css302)}`, "true");
}

process.exit(fail ? 1 : 0);
