// v4.6.274: Bring your workouts -- Strong and Hevy CSVs, matching, duplicates, the batch and its undo.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({})});for(const s of order)vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});const run=s=>vm.runInContext(s,ctx);
const strong=fs.readFileSync(path.join(dir,'tools/fixtures/strong-sample.csv'),'utf8'),hevy=fs.readFileSync(path.join(dir,'tools/fixtures/hevy-sample.csv'),'utf8');
let n=0;const ok=(name,c)=>{assert(c,name);n++;};
w.__strong=strong;w.__hevy=hevy;
run(`DB={days:{'2026-09-28':{w:[{part:'Shoulder',ex:'Lateral Raise',w:9,reps:[12],at:1}],upd:1}},settings:{unit:'lb',onboarded:true}};loadedOK=true;storedDays=1;todayISO='2026-10-11';SEED=deriveAll();save=()=>{};render=()=>{};`);
const before=run(`JSON.stringify(DB.days['2026-09-28'])`);
/* parsing */
let p=JSON.parse(run(`JSON.stringify(impParse(__strong))`));
ok('Strong is recognised',p.src==='Strong'&&!p.unitKnown);
ok('rest timers and empty rows are skipped',!p.sets.some(s=>/rest timer/i.test(s.name))&&p.sets.length===10);
ok('Strong dates read as local days',p.sets[0].iso==='2026-03-02'&&p.sets.at(-1).iso==='2026-09-28');
p=JSON.parse(run(`JSON.stringify(impParse(__hevy))`));
ok('Hevy is recognised, with its unit',p.src==='Hevy'&&p.unitKnown&&p.sets[0].unit==='kg'&&p.sets[0].iso==='2026-03-02');
ok('a semicolon file parses too',JSON.parse(run(`JSON.stringify(impParse(__strong.replace(/","/g,'";"')))`)).sets.length===10);
ok('anything else is refused, kindly',/Strong or Hevy/.test(run(`impParse('a,b\\n1,2').error`)));
/* matching */
const m=x=>JSON.parse(run(`JSON.stringify(impMatch(${JSON.stringify(x)},impKnown()))`));
for(const [ext,ex] of [['Bench Press (Barbell)','Barbell Bench Press'],['Squat (Barbell)','Squat'],['Lat Pulldown (Cable)','Lat Pulldown'],['Lateral Raise (Dumbbell)','Lateral Raise'],['Bicep Curl (Dumbbell)','Dumbbell Curl'],['Overhead Press (Barbell)','Overhead Barbell Press'],['Running (Treadmill)','Run'],['Pull Up','Pull Up'],['Leg Press','Leg Press'],['Plank','Plank'],['Cycling','Cycling'],['Incline Bench Press (Dumbbell)','Incline Dumbbell Bench Press'],['Triceps Pushdown (Cable - Straight Bar)','Triceps Pushdown']])
  ok(`${ext} → ${ex}`,(r=>r.state==='sure'&&r.ex===ex)(m(ext)));
ok('DB press is a guess to confirm: Dumbbell Shoulder Press first',(r=>r.state==='ask'&&r.ex==='Dumbbell Shoulder Press')(m('DB press')));
ok('an unknown lift is kept as new, with its likely part',(r=>r.state==='new')(m('Zercher Carry')));
ok('a new curl variant is guessed as Biceps',m('Bayesian Curl').part==='Biceps'||m('Bayesian Curl').state==='ask');
/* the review state */
run(`imp={step:'source',from:'test'};document.body.innerHTML+='';impLoadText(__strong,'strong.csv')`);
ok('review opens with the duplicate asked',run(`imp.step`)==='review'&&run(`imp.dups['2026-09-28']`)==='ask');
ok('pending items block Continue',run('impPending()')>0&&!!w.document.querySelector('#imp [data-imp="toconfirm"][disabled]'));
run(`imp.unit='lb';imp.dups['2026-09-28']='keep';for(const [k,v] of Object.entries(imp.names))if(!v.done){if(v.state==='ask'){v.choice=v.ex;v.part=homePartOf(v.ex);}else{v.part=v.part||'Back';v.choice=null;}v.done=true;}`);
ok('all resolved: nothing pending',run('impPending()')===0);
ok('nothing saved before Import',run(`Object.keys(DB.days).length`)===1);
run(`imp.step='confirm';impCommit()`);
ok('imported days written',run(`!!DB.days['2026-03-02']&&!!DB.days['2026-03-04']`));
ok('the kept duplicate is untouched, byte for byte',run(`JSON.stringify(DB.days['2026-09-28'])`)===before);
ok('lb converted to kg',Math.abs(run(`DB.days['2026-03-02'].w.find(e=>e.ex==='Barbell Bench Press').w`)-135/2.20462)<0.01);
ok('one set per row, reps kept',run(`DB.days['2026-03-02'].w.filter(e=>e.ex==='Barbell Bench Press').map(e=>e.reps[0]).join()`)==='8,8');
ok('a timed hold becomes seconds, and the exercise counts seconds',run(`DB.days['2026-03-02'].w.find(e=>e.ex==='Plank').reps[0]`)===60&&run(`unitOf('Plank')`)==='s');
ok('a treadmill run becomes cardio: miles to km, time kept',(r=>r.part==='Run'&&Math.abs(r.w-3.1/0.621371)<0.01&&r.mins===25&&r.secs===0)(JSON.parse(run(`JSON.stringify(DB.days['2026-03-04'].w.find(e=>e.ex==='Run'))`))));
ok('an unknown lift joins your exercises',!!run(`DB.settings.custom['Zercher Carry']`));
ok('every imported set carries the batch',run(`Object.values(DB.days).flatMap(d=>d.w).filter(e=>e.imp).length`)===9);
ok('the batch is recorded',run(`DB.settings.imports.length`)===1&&run(`DB.settings.imports[0].src`)==='Strong');
const id=run(`DB.settings.imports[0].id`);
ok('undo removes exactly the batch',run(`impUndo('${id}')`)===9&&run(`Object.values(DB.days).flatMap(d=>d.w||[]).filter(e=>e.imp).length`)===0&&run(`JSON.stringify(DB.days['2026-09-28'])`)===before&&run(`(DB.settings.imports||[]).length`)===0);
/* Hevy end to end, with import-another on a duplicate */
run(`DB.days['2026-03-02']={w:[{part:'Chest',ex:'Dip',w:0,reps:[10],at:5}],upd:1};imp={step:'source',from:'test'};impLoadText(__hevy,'hevy.csv');imp.dups['2026-03-02']='both';for(const v of Object.values(imp.names))if(!v.done){v.choice=v.ex;v.part=homePartOf(v.ex)||'Back';v.done=true;}impCommit()`);
ok('Hevy: kg stays kg, both workouts kept on the shared day',run(`DB.days['2026-03-02'].w.length`)===5&&run(`DB.days['2026-03-02'].w.find(e=>e.ex==='Lat Pulldown').w`)===60&&run(`DB.days['2026-03-02'].w.some(e=>e.ex==='Dip'&&!e.imp)`));
ok('Hevy: a ride in km with its time',(r=>r.ex==='Cycling'&&r.w===15.2&&r.mins===40)(JSON.parse(run(`JSON.stringify(DB.days['2026-03-05'].w[0])`))));
/* the real-world sample exports kept in tools/fixtures since v4.5.4 */
w.__rs=fs.readFileSync(path.join(dir,'tools/fixtures/strong_sample.csv'),'utf8');w.__rh=fs.readFileSync(path.join(dir,'tools/fixtures/hevy_sample.csv'),'utf8');
let r=JSON.parse(run(`JSON.stringify(impParse(__rs))`));
ok('a real Strong export (semicolons, "Weight (kg)") reads with its unit known',r.src==='Strong'&&r.unitKnown&&r.sets.length>0&&r.sets[0].unit==='kg'&&r.sets[0].w===60&&r.sets[0].reps===8);
r=JSON.parse(run(`JSON.stringify(impParse(__rh))`));
ok('a real Hevy export reads, assisted pull-ups and warm-ups included',r.src==='Hevy'&&r.sets.length>0&&r.sets[0].name==='Pull Up (Assisted)'&&r.sets[0].iso==='2025-12-22');
run(`DB={days:{},settings:{unit:'kg',onboarded:true}};imp={step:'source'};impLoadText(__rh,'h.csv');for(const v of Object.values(imp.names))if(!v.done){v.choice=v.ex||null;v.part=v.part||'Back';v.done=true;}impCommit()`);
ok('an assisted pull-up imports as bodyweight, never as added load',run(`Object.values(DB.days).flatMap(d=>d.w).filter(e=>e.ex==='Pull Up').every(e=>e.w===0)`));
console.log(`PASS import: ${n} checks`);process.exit(0);
