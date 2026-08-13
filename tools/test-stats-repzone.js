// test-stats-repzone.js DIR — v3.3.212 three-signal Growth Audit.
// The filename stays so the all-suite runner keeps the historical gate.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url:"https://tahros.github.io/showup/", runScripts:"outside-only", pretendToBeVisual:true });
const w=dom.window, ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(new Error("offline"));
w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},removeEventListener(){}}));
w.navigator.vibrate=()=>{}; w.scrollTo=()=>{};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:()=>({width:10})},
  {get:(o,k)=>k in o?o[k]:()=>({}),set:()=>true});};
w.HTMLCanvasElement.prototype.toDataURL=function(){return "data:image/png;base64,";};
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),"utf8"),ctx,{filename:s});
w.document.dispatchEvent(new w.Event("DOMContentLoaded",{bubbles:true}));
const run=c=>vm.runInContext(c,ctx);

let fail=0;
const check=(name,expr,want)=>{
  const got=run(expr),ok=String(got)===String(want);
  console.log(ok?"PASS":"FAIL",name,"→",got); if(!ok) fail++;
};
const statsSrc=fs.readFileSync(path.join(dir,"js/stats.js"),"utf8");
const cssSrc=fs.readFileSync(path.join(dir,"css/app.css"),"utf8");

run(`window._D=n=>{const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
window._mk=(n,rows)=>DB.days[_D(n)]={w:rows,upd:1};
window._reset=()=>{DB.days={};DB.settings.canon={};ga.grp=null;};
window._finish=()=>{migrateCanon();SEED=deriveAll();view='stats';render();};`);

// ---- cold start: facts, never a premature verdict -----------------------
run(`_reset();_mk(1,[{part:'Chest',ex:'Chest Press',w:40,reps:[8,8],at:1}]);_finish();ga.grp='Chest';render();`);
check("Growth Audit replaces the Rep-zone heading",
  `[...document.querySelectorAll('#view h2')].some(h=>h.textContent.startsWith('Growth audit'))`,true);
check("the retired heading is absent",`!/Rep zones/i.test(document.querySelector('#view').textContent)`,true);
check("a first workout is active but not confirmed upward",`document.querySelector('.gastate').getAttribute('aria-label')`,"Flat");
check("the status contains no font glyph",`document.querySelector('.gastate').textContent.trim()`,"");
check("the cold-start icon uses the flat image class",`document.querySelector('.gastate').classList.contains('ga-flat')`,true);

run(`_reset();_mk(3,[{part:'Chest',ex:'Chest Press',w:40,reps:[8],at:1}]);
  _mk(1,[{part:'Chest',ex:'Chest Press',w:40,reps:[8],at:2}]);_finish();ga.grp='Chest';render();`);
check("two identical sessions hold no PR, so the row stays dark",`gaPR(gaExerciseSessions()['chest-press']).live`,false);
check("...and carry no badge",`!gaPR(gaExerciseSessions()['chest-press']).change`,true);

// ---- exercise-local observable progress ---------------------------------
run(`_reset();
  _mk(5,[{part:'Chest',ex:'Chest Press',w:40,reps:[8],at:1}]);
  _mk(3,[{part:'Chest',ex:'Chest Press',w:40,reps:[9],at:2}]);
  _mk(1,[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:3}]);
  _finish();ga.grp='Chest';render();`);
check("more reps at the same weight is a live PR",`gaPR(gaExerciseSessions()['chest-press']).live`,true);
check("the exercise subtitle is completely removed",`!document.querySelector('.garow small')`,true);
check("Going Up is an image-backed class",`document.querySelector('.gabadge').classList.contains('ga-up')`,true);
check("the icon keeps an accessible label",`document.querySelector('.gabadge').getAttribute('aria-label')`,"Going up");

run(`_reset();
  _mk(5,[{part:'Chest',ex:'Chest Press',w:40,reps:[8],at:1}]);
  _mk(3,[{part:'Chest',ex:'Chest Press',w:42,reps:[8],at:2}]);
  _mk(1,[{part:'Chest',ex:'Chest Press',w:44,reps:[8],at:3}]);
  _finish();`);
check("more weight at the same reps is also a live PR",`gaPR(gaExerciseSessions()['chest-press']).live`,true);

// ---- Review requires four unchanged exposures ---------------------------
run(`_reset();for(const n of [7,5,3,1])_mk(n,[{part:'Back',ex:'Seated Cable Row',w:50,reps:[10],at:n}]);
  _finish();ga.grp='Back';render();`);
check("four unchanged sessions hold no PR",`gaPR(gaExerciseSessions()['seated-cable-row']).live`,false);
check("Review collapses to the one visible Flat state",`document.querySelector('.gabadge').getAttribute('aria-label')`,"Flat");
check("the row adds only the record receipt, never review prose",`!!document.querySelector('.garow .garecord')&&!document.querySelector('.garow .note')`,true);

// ---- coverage is personal and rolling, not a universal target -----------
run(`_reset();
  _mk(15,[{part:'Shoulder',ex:'Lateral Raise',w:10,reps:[12,12,12,12,12,12,12,12],at:1}]);
  _mk(8,[{part:'Shoulder',ex:'Lateral Raise',w:10,reps:[12,12,12,12,12,12,12,12],at:2}]);
  _mk(1,[{part:'Shoulder',ex:'Lateral Raise',w:10,reps:[12,12],at:3}]);
  _finish();ga.grp='Shoulders';render();`);
check("active without confirmed progress is Flat",`document.querySelector('.gastate').getAttribute('aria-label')`,"Flat");
check("there is no fourth below-pattern state",`!document.querySelector('.ga-below')`,true);
check("the recent-pattern prose block stays gone",`!document.querySelector('.gabase')&&!/pattern|four earlier 7-day blocks/i.test(document.querySelector('.gacard').textContent)`,true);

// ---- no recent work is a fact, not a prescription -----------------------
run(`_reset();
  _mk(15,[{part:'Back',ex:'Lat Pulldown',w:45,reps:[10,10],at:1}]);
  _mk(8,[{part:'Back',ex:'Lat Pulldown',w:45,reps:[10,10],at:2}]);
  _mk(1,[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:3}]);
  _finish();ga.grp='Back';render();`);
check("no current work is Empty",`document.querySelector('.gastate').getAttribute('aria-label')`,"Empty");
check("Empty uses the quiet dot class",`document.querySelector('.gastate').classList.contains('ga-empty')`,true);
check("no recency subtitle remains",`!document.querySelector('.garow small')`,true);

// ---- a long archive does not overrule a changed current baseline --------
run(`_reset();
  for(const n of [80,70,60])_mk(n,[{part:'Legs',ex:'Squat',w:80,reps:[8],at:n}]);
  _mk(1,[{part:'Legs',ex:'Squat',w:60,reps:[10],at:1}]);
  _finish();`);
check("a lighter set with more reps remains Flat",
  `gaPR(gaExerciseSessions()['squat']).live`,false);
check("...and carries no progress claim",
  `gaPR(gaExerciseSessions()['squat']).change===null`,true);

// ---- one compact control, no information cloud --------------------------
run(`_reset();
  _mk(2,[{part:'Chest',ex:'Chest Press',w:40,reps:[8],at:1}]);
  _mk(1,[{part:'Back',ex:'Lat Pulldown',w:45,reps:[10],at:2}]);
  _mk(0,[{part:'Shoulder',ex:'Lateral Raise',w:10,reps:[12],at:3}]);
  _finish();ga.grp=null;render();`);
check("the most recently trained group opens by default",`ga.grp`,"Shoulders");
check("the selector uses the six visible groups",`document.querySelectorAll('#gaGrp option').length`,6);
check("Glutes is internal, not a top-level choice",`[...document.querySelectorAll('#gaGrp option')].some(o=>o.value==='Glutes')`,false);
check("body parts run most-recent to least-recent",
  `[...document.querySelectorAll('#gaGrp option')].map(o=>o.value).join('|')`,"Shoulders|Back|Chest|Arms|Core|Legs");
check("the card shows at most four exercise receipts",`document.querySelectorAll('.gacard .garow').length<=4`,true);
check("there is no scatterplot, axis, zone bar, or exercise chip rail",
  `!document.querySelector('.rzscat,.rzbar,.rzlifts,.gahead svg')`,true);
check("the UI never asks for RIR or reps left",`!/RIR|reps? (?:left|remaining)|clean reps/i.test(document.querySelector('.gacard').textContent)`,true);
check("status readouts are images, not text symbols",`[...document.querySelectorAll('.gastate,.gabadge')].every(i=>
  !i.textContent.trim()&&['Empty','Flat','Going up'].includes(i.getAttribute('aria-label')))`,true);
check("exercise rows contain names only",`document.querySelectorAll('.garow small').length`,0);
check("What the record says is removed",`!document.querySelector('.ganext')&&!/What the record says/i.test(document.querySelector('.gacard').textContent)`,true);

run(`_reset();
  _mk(4,[{part:'Chest',ex:'Chest Press',w:40,reps:[8],at:1}]);
  _mk(1,[{part:'Chest',ex:'Chest Fly',w:20,reps:[12],at:2}]);
  _finish();ga.grp='Chest';render();`);
check("exercises also run most-recent to least-recent",
  `[...document.querySelectorAll('.garow b')].map(x=>x.textContent).join('|')`,"Chest Fly|Chest Press");

run(`(function(){const s=document.querySelector('#gaGrp');s.value='Back';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
check("changing the group replaces the card in place",`document.querySelector('.gacard').dataset.gacard`,"Back");
check("...without losing the selected value",`document.querySelector('#gaGrp').value`,"Back");

// ---- structural retirement and ordering ---------------------------------
check("Growth Audit is immediately before Session Build",`(function(){
  const hs=[...document.querySelectorAll('#view h2')].map(h=>h.childNodes[0].textContent.trim());
  return hs.indexOf('Session build')===hs.indexOf('Growth audit')+1;})()`,true);
check("Rep-zone functions and constants are deleted",
  `${!(/\brepZone(?:Data|Sets|ScatterSvg)?\s*\(|REPZONE_MAX_|REPZONE_LABELS/.test(statsSrc))}`,"true");
check("there are exactly three public status labels",
  `${/const GA_SIGNAL_LABELS=\{empty:'Empty',flat:'Flat',up:'Going up'\}/.test(statsSrc)}`,"true");
check("the UI uses two Noun Project assets plus a CSS dot, not a glyph map",
  `${!statsSrc.includes('GA_ICONS')&&['status-flat.png','status-up.png'].every(x=>cssSrc.includes(x))&&
    !cssSrc.includes('status-empty.png')&&/\.ga-empty\{[^}]*radial-gradient/.test(cssSrc)}`,"true");
check("only the Flat and Going Up status assets exist",
  `${['status-flat.png','status-up.png'].every(x=>fs.existsSync(path.join(dir,'assets',x)))&&
    !fs.existsSync(path.join(dir,'assets','status-empty.png'))}`,"true");
check("the status hierarchy is muted gray dot and line, then ShowUp blue trend",
  `${/\.ga-empty\{[^}]*faint[^}]*opacity:\.55/.test(cssSrc)&&
    /\.ga-flat\{[^}]*faint[^}]*opacity:\.55/.test(cssSrc)&&
    /\.ga-up\{[^}]*accent-ink/.test(cssSrc)&&/--ga-size:11px 11px/.test(cssSrc)&&
    /--ga-size:30px 30px/.test(cssSrc)}`,"true");
check("Growth Audit help explains its signals without icon credits",
  `${statsSrc.includes('Dot: no sets in 7 days')&&statsSrc.includes('line: no clear gain')&&
    statsSrc.includes('trend: more reps at the same weight, or more weight without fewer reps')&&!statsSrc.slice(statsSrc.indexOf('function growthAuditSection'),statsSrc.indexOf('function sessionBuild')).includes('Noun Project')}`,"true");
check("icon credits live beneath the version in Settings",
  `${/ShowUp \$\{APP_VERSION\}<\/div>\s*<div class="note assetcredits"/.test(fs.readFileSync(path.join(dir,'js','settings.js'),'utf8'))&&
    ['minus-8363736','trend-2344331','ARIPATUT DASUKI','Travis Avery','Noun Project'].every(x=>fs.readFileSync(path.join(dir,'js','settings.js'),'utf8').includes(x))}`,"true");
check("Growth Audit has no hidden universal set target",
  `${!(/(?:target|ideal)\s*(?:sets?|volume)/i.test(statsSrc.slice(statsSrc.indexOf('v3.3.211 — Growth Audit'),statsSrc.indexOf('v3.3.192 — intent gaps'))))}`,"true");


// ---- v3.3.220: ONE standard. A row is lit if and only if it carries a
// badge, and both come from gaPR(). These cases are the ones that used to
// disagree on screen.
const gaSeed = (js) => run(`(function(){
  DB.days={}; DB.settings.canon={}; DB.settings.unit='kg'; ga.open=null;
  ${js}
  migrateCanon(); SEED=deriveAll(); view='stats'; ga.grp='Chest'; render();})()`);
const prOf = (name) => run(`(function(){
  const ex=Object.values(gaExerciseSessions()).find(e=>e.name==='${name}');
  const r=gaPR(ex); return (r.live?'LIT ':'dark ')+(r.change?r.change.text:'no badge');})()`);

// 1. heavier at FEWER reps is a tradeoff, not an unambiguous gain.
gaSeed(`for(const n of [16,12,8]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[15,15],at:1}],upd:1};
        DB.days[_D(3)]={w:[{part:'Chest',ex:'Chest Fly',w:50,reps:[10],at:2}],upd:1};`);
check("heavier at fewer reps remains Flat", `"${prOf('Chest Fly')}"`, "dark no badge");

// 2. more reps at the SAME weight
gaSeed(`for(const n of [16,12]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[10]}],upd:1};
        DB.days[_D(4)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[12]}],upd:1};`);
check("more reps at the same weight is a PR", `"${prOf('Chest Fly')}"`, "LIT +2 reps");

// 3. THE LOOPHOLE: a lighter load never becomes progress merely by adding
//    reps. It only counts after a prior set exists at that exact load.
gaSeed(`for(const n of [20,16]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[30]}],upd:1};
        DB.days[_D(3)]={w:[{part:'Chest',ex:'Chest Fly',w:20,reps:[30]}],upd:1};`);
check("a light deload rep-out is NOT a PR", `"${prOf('Chest Fly')}"`, "dark no badge");
gaSeed(`for(const n of [20,16]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[10]}],upd:1};
        DB.days[_D(3)]={w:[{part:'Chest',ex:'Chest Fly',w:20,reps:[30]}],upd:1};`);
check("a new lighter load is still not comparable", `"${prOf('Chest Fly')}"`, "dark no badge");
gaSeed(`DB.days[_D(20)]={w:[{part:'Chest',ex:'Chest Fly',w:20,reps:[10]}],upd:1};
        DB.days[_D(16)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[10]}],upd:1};
        DB.days[_D(3)]={w:[{part:'Chest',ex:'Chest Fly',w:20,reps:[30]}],upd:1};`);
check("more reps at the exact lighter load is comparable", `"${prOf('Chest Fly')}"`, "LIT +20 reps");

// The maker's screenshot: 10x12 must never claim to improve on 27.5x10.
gaSeed(`DB.days[_D(20)]={w:[{part:'Shoulder',ex:'Rear Deltoids',w:27.5,reps:[10]}],upd:1};
        DB.days[_D(3)]={w:[{part:'Shoulder',ex:'Rear Deltoids',w:10,reps:[12]}],upd:1};`);
check("10x12 does not improve on 27.5x10", `"${prOf('Rear Deltoids')}"`, "dark no badge");

// 4. the window: a PR ages out at GA_PR_DAYS, badge and mark together
gaSeed(`DB.days[_D(80)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[10]}],upd:1};
        DB.days[_D(40)]={w:[{part:'Chest',ex:'Chest Fly',w:50,reps:[10]}],upd:1};
        DB.days[_D(3)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[8]}],upd:1};`);
check("a PR older than the window goes dark AND loses its badge", `"${prOf('Chest Fly')}"`, "dark no badge");
check("the window is 28 days", `GA_PR_DAYS`, 28);
check("...and the record itself still comes from the WHOLE ledger",
      `(function(){const ex=Object.values(gaExerciseSessions()).find(e=>e.name==='Chest Fly');
        return gaPR(ex).best.w;})()`, 50);

// 5. the rendered row: badge present <=> mark lit. This is the contradiction
//    the maker saw, asserted on the DOM rather than the model.
gaSeed(`for(const n of [16,12]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[10]}],upd:1};
        DB.days[_D(2)]={w:[{part:'Chest',ex:'Chest Fly',w:50,reps:[10]}],upd:1};
        DB.days[_D(2)].w.push({part:'Chest',ex:'Chest Press',w:40,reps:[8]});
        for(const n of [90,86]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};`);
check("every badged row is lit, and every lit row is badged",
      `[...document.querySelectorAll('.garow')].every(r=>
        !!r.querySelector('.gadelta') === !!r.querySelector('.gabadge.ga-up'))`, true);
check("...and the PR row is the one that is lit",
      `(function(){const r=[...document.querySelectorAll('.garow')].find(x=>/Chest Fly/.test(x.textContent));
        return !!r.querySelector('.gabadge.ga-up') && !!r.querySelector('.gadelta');})()`, true);
check("a lift with no recent PR shows neither",
      `(function(){const r=[...document.querySelectorAll('.garow')].find(x=>/Chest Press/.test(x.textContent));
        return !r.querySelector('.gadelta') && !r.querySelector('.gabadge.ga-up');})()`, true);

// 6. the group mark follows the same authority
check("the group is 'going up' when a recent lift holds a live PR",
      `document.querySelector('.gastate').classList.contains('ga-up')`, true);

// 7. the old second standard is gone for good
check("no second growth machine survives",
      `${/gaExerciseState|gaDominates|state\.key/.test(statsSrc)}`, "false");



// ---- v3.3.221: tapping a row names the actual PR set --------------------
gaSeed(`for(const n of [16,12]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[10]}],upd:1};
        DB.days[_D(3)]={w:[{part:'Chest',ex:'Chest Fly',w:50,reps:[10]}],upd:1};`);
check("no receipt until a row is tapped", `!document.querySelector('.garcpt')`, true);
run(`(function(){const v=document.querySelector('#view'); v._k=1;
  document.querySelector('.garow[data-gaex]').click();})()`);
check("tapping opens a receipt in place, without rebuilding the page",
      `!!document.querySelector('.garcpt') && document.querySelector('#view')._k===1`, true);
check("...naming the exact set that earned the badge",
      `(function(){const b=[...document.querySelectorAll('.garcrow')][0];
        return b.querySelector('.garck').textContent+'|'+b.querySelector('b').textContent;})()`,
      "Improved to|50kg × 10");
check("...and the day it was done",
      `/^\\d{1,2}\\/\\d{1,2}\\/\\d{2}$/.test(document.querySelector('.garcrow .garcw').textContent)`, true);
check("...and the set it beat",
      `(function(){const r=[...document.querySelectorAll('.garcrow')][1];
        return r.querySelector('.garck').textContent+'|'+r.querySelector('b').textContent;})()`,
      "Previous best|45kg × 10");
check("the receipt agrees with the badge on the row above it",
      `(function(){const row=document.querySelector('.garow.open');
        const badge=row.querySelector('.gadelta').textContent.trim();
        const pr=gaPR(Object.values(gaExerciseSessions()).find(e=>e.name==='Chest Fly'));
        return badge===pr.change.text;})()`, true);
run(`document.querySelector('.garow[data-gaex]').click();`);
check("tapping again closes it", `!document.querySelector('.garcpt')`, true);

// a lift with no record at all explains itself rather than showing nothing
gaSeed(`for(const n of [16,12,3]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[10]}],upd:1};`);
run(`document.querySelector('.garow[data-gaex]').click();`);
check("a lift with no PR says so plainly",
      `document.querySelector('.garcnote').textContent`, "No improvement yet.");

// an aged-out improvement stays available with the same compact date
gaSeed(`DB.days[_D(80)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[10]}],upd:1};
        DB.days[_D(40)]={w:[{part:'Chest',ex:'Chest Fly',w:50,reps:[10]}],upd:1};
        DB.days[_D(3)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[8]}],upd:1};`);
run(`document.querySelector('.garow[data-gaex]').click();`);
check("an aged-out improvement still uses the compact date",
      `/^\\d{1,2}\\/\\d{1,2}\\/\\d{2}$/.test(document.querySelector('.garcrow .garcw').textContent)`, true);
check("...while the row itself stays dark and unbadged",
      `(function(){const r=document.querySelector('.garow.open');
        return !r.querySelector('.gadelta') && !r.querySelector('.gabadge.ga-up');})()`, true);

process.exit(fail?1:0);
