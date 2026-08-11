// test-stats-repzone.js DIR — v3.3.209 Growth Audit replaces Rep Zones.
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

run(`window._D=n=>{const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
window._mk=(n,rows)=>DB.days[_D(n)]={w:rows,upd:1};
window._reset=()=>{DB.days={};DB.settings.canon={};ga.grp=null;};
window._finish=()=>{migrateCanon();SEED=deriveAll();view='stats';render();};`);

// ---- cold start: facts, never a premature verdict -----------------------
run(`_reset();_mk(1,[{part:'Chest',ex:'Chest Press',w:40,reps:[8,8],at:1}]);_finish();ga.grp='Chest';render();`);
check("Growth Audit replaces the Rep-zone heading",
  `[...document.querySelectorAll('#view h2')].some(h=>h.textContent.startsWith('Growth audit'))`,true);
check("the retired heading is absent",`!/Rep zones/i.test(document.querySelector('#view').textContent)`,true);
check("a first workout stays in Building baseline",`document.querySelector('.gastate').textContent.trim()`,"Building baseline");
check("the cold-start receipt says one of three workouts",`/1 of 3 workouts logged/.test(document.querySelector('.gabase').textContent)`,true);
check("cold start makes no Progressing or Review judgment",
  `!/Progressing|Review/.test(document.querySelector('.gacard').textContent)`,true);

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
check("the reason is printed, not hidden in a score",`document.querySelector('.garow small').textContent`,"+1 rep at 40 kg");
check("the group conclusion names what moved",`/Keep Chest Press/.test(document.querySelector('.ganext').textContent)`,true);

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
check("the card states the evidence",`/4 sessions without a new comparable best/.test(document.querySelector('.garow').textContent)`,true);
check("Review never becomes a claim that work was wasted",`!/waste/i.test(document.querySelector('.gacard').textContent)`,true);

// ---- coverage is personal and rolling, not a universal target -----------
run(`_reset();
  _mk(15,[{part:'Shoulder',ex:'Lateral Raise',w:10,reps:[12,12,12,12,12,12,12,12],at:1}]);
  _mk(8,[{part:'Shoulder',ex:'Lateral Raise',w:10,reps:[12,12,12,12,12,12,12,12],at:2}]);
  _mk(1,[{part:'Shoulder',ex:'Lateral Raise',w:10,reps:[12,12],at:3}]);
  _finish();ga.grp='Shoulders';render();`);
check("a sparse current week reads Below your pattern",`document.querySelector('.gastate').textContent.trim()`,"Below your pattern");
check("the conclusion explicitly says it is the user's own pattern",`/your own recent pattern/.test(document.querySelector('.ganext').textContent)`,true);
check("the baseline compares four earlier rolling blocks",`/four earlier 7-day blocks/.test(document.querySelector('.gabase').textContent)`,true);

// ---- no recent work is a fact, not a prescription -----------------------
run(`_reset();
  _mk(15,[{part:'Back',ex:'Lat Pulldown',w:45,reps:[10,10],at:1}]);
  _mk(8,[{part:'Back',ex:'Lat Pulldown',w:45,reps:[10,10],at:2}]);
  _mk(1,[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:3}]);
  _finish();ga.grp='Back';render();`);
check("a mature record can say No recent work",`document.querySelector('.gastate').textContent.trim()`,"No recent work");
check("it reports when the exercise was last trained",`/last trained 8 days ago/i.test(document.querySelector('.ganext').textContent)`,true);

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
check("today's trained group opens by default",`ga.grp`,"Shoulders");
check("the selector uses the seven visible groups",`document.querySelectorAll('#gaGrp option').length`,7);
check("the card shows at most four exercise receipts",`document.querySelectorAll('.gacard .garow').length<=4`,true);
check("there is no scatterplot, axis, zone bar, or exercise chip rail",
  `!document.querySelector('.rzscat,.rzbar,.rzlifts,.gahead svg')`,true);
check("the UI never asks for RIR or reps left",`!/RIR|reps? (?:left|remaining)|clean reps/i.test(document.querySelector('.gacard').textContent)`,true);

run(`(function(){const s=document.querySelector('#gaGrp');s.value='Back';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
check("changing the group replaces the card in place",`document.querySelector('.gacard').dataset.gacard`,"Back");
check("...without losing the selected value",`document.querySelector('#gaGrp').value`,"Back");

// ---- structural retirement and ordering ---------------------------------
check("Growth Audit is immediately before Session Build",`(function(){
  const hs=[...document.querySelectorAll('#view h2')].map(h=>h.childNodes[0].textContent.trim());
  return hs.indexOf('Session build')===hs.indexOf('Growth audit')+1;})()`,true);
check("Rep-zone functions and constants are deleted",
  `${!(/\brepZone(?:Data|Sets|ScatterSvg)?\s*\(|REPZONE_MAX_|REPZONE_LABELS/.test(statsSrc))}`,"true");
check("Growth Audit has no hidden universal set target",
  `${!(/(?:target|ideal)\s*(?:sets?|volume)/i.test(statsSrc.slice(statsSrc.indexOf('v3.3.209 — Growth Audit'),statsSrc.indexOf('v3.3.192 — intent gaps'))))}`,"true");

process.exit(fail?1:0);
