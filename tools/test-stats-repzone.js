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
check("two comparable sessions are Learning",`gaExerciseState(gaExerciseSessions()['chest-press']).label`,"Learning");
check("...and state exactly two of three recent sessions",`gaExerciseState(gaExerciseSessions()['chest-press']).detail`,"2 of 3 recent sessions");

// ---- exercise-local observable progress ---------------------------------
run(`_reset();
  _mk(5,[{part:'Chest',ex:'Chest Press',w:40,reps:[8],at:1}]);
  _mk(3,[{part:'Chest',ex:'Chest Press',w:40,reps:[9],at:2}]);
  _mk(1,[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:3}]);
  _finish();ga.grp='Chest';render();`);
check("more reps at the same weight is Progressing",`gaExerciseState(gaExerciseSessions()['chest-press']).label`,"Progressing");
check("the exercise subtitle is completely removed",`!document.querySelector('.garow small')`,true);
check("Going Up is an image-backed class",`document.querySelector('.gabadge').classList.contains('ga-up')`,true);
check("the icon keeps an accessible label",`document.querySelector('.gabadge').getAttribute('aria-label')`,"Going up");

run(`_reset();
  _mk(5,[{part:'Chest',ex:'Chest Press',w:40,reps:[8],at:1}]);
  _mk(3,[{part:'Chest',ex:'Chest Press',w:42,reps:[8],at:2}]);
  _mk(1,[{part:'Chest',ex:'Chest Press',w:44,reps:[8],at:3}]);
  _finish();`);
check("more weight at the same reps is also comparable progress",`gaExerciseState(gaExerciseSessions()['chest-press']).label`,"Progressing");

// ---- Review requires four unchanged exposures ---------------------------
run(`_reset();for(const n of [7,5,3,1])_mk(n,[{part:'Back',ex:'Seated Cable Row',w:50,reps:[10],at:n}]);
  _finish();ga.grp='Back';render();`);
check("four unchanged sessions earn Review",`gaExerciseState(gaExerciseSessions()['seated-cable-row']).label`,"Review");
check("Review collapses to the one visible Flat state",`document.querySelector('.gabadge').getAttribute('aria-label')`,"Flat");
check("no review explanation survives below the exercise",`document.querySelector('.garow').textContent.trim()`,"Seated Cable Row");

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
check("old sessions outside six weeks do not manufacture current confidence",
  `gaExerciseState(gaExerciseSessions()['squat']).label`,"Learning");
check("the old archive still prevents the exercise being called brand-new",
  `gaExerciseState(gaExerciseSessions()['squat']).detail`,"1 of 3 recent sessions");

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
  `${statsSrc.includes('Dot: no completed sets in 7 days')&&statsSrc.includes('line: trained, no confirmed gain')&&
    statsSrc.includes('trend: comparable best moved')&&!statsSrc.slice(statsSrc.indexOf('function growthAuditSection'),statsSrc.indexOf('function sessionBuild')).includes('Noun Project')}`,"true");
check("icon credits live beneath the version in Settings",
  `${/ShowUp \$\{APP_VERSION\}<\/div>\s*<div class="note assetcredits"/.test(fs.readFileSync(path.join(dir,'js','settings.js'),'utf8'))&&
    ['minus-8363736','trend-2344331','ARIPATUT DASUKI','Travis Avery','Noun Project'].every(x=>fs.readFileSync(path.join(dir,'js','settings.js'),'utf8').includes(x))}`,"true");
check("Growth Audit has no hidden universal set target",
  `${!(/(?:target|ideal)\s*(?:sets?|volume)/i.test(statsSrc.slice(statsSrc.indexOf('v3.3.211 — Growth Audit'),statsSrc.indexOf('v3.3.192 — intent gaps'))))}`,"true");

process.exit(fail?1:0);
