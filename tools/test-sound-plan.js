// v4.6.196: a generated plan is sound. The maker's Saturday came back as: six
// sets of Barbell Bench Press, Dip at 6 6 6 6 6, "Cable Fly Down" as a line of
// text with an Edit button, and five sets of Hanging Leg Raise -- 17 sets from
// three exercises.
// What went wrong, in order: Cable Fly Down (logged, but not in eight weeks)
// was treated as a NEW movement and cut because lower chest already had Dip;
// its heading was handed back as a note row; the day's 17 sets were then padded
// onto what was left; and nothing stopped a Grow plan asking for 6 reps.
// This runs the whole path (the writer's answer, stubbed, through the device
// check, the planner's fitting and the apply) and checks the plan that lands.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);
ctx.SRV=fs.readFileSync(path.join(dir,'supabase/functions/write-session/index.ts'),'utf8');
let checks=0;
function test(name,code){assert(run(code),name);console.log('PASS '+name);checks++;}
(async()=>{
run(`todayISO='2026-10-04';checkDate=()=>false;localStorage.setItem('showup:planner-flow','flow');
DB={days:{},settings:{unit:'lb',onboarded:true,planningWorkspace:true}};
var LBs=2.20462,mkP=(d,part,ex,lb,reps,bw)=>{(DB.days[d]=DB.days[d]||{w:[]}).w.push({part,ex,w:lb/LBs,bw:!!bw,reps,at:Date.parse(d+'T18:00')+(DB.days[d]?DB.days[d].w.length:0)});};
/* chest twice a week for eight weeks: 14 chest sets and 3 core, the maker's usual */
for(let k=1;k<8;k++)for(const base of ['2026-09-30','2026-09-25']){const t=new Date(base+'T12:00');t.setDate(t.getDate()-7*k);const d=t.toLocaleDateString('en-CA');
  mkP(d,'Chest','Incline Barbell Bench Press',175,[8,8,8,8,8]);mkP(d,'Chest','Incline Dumbbell Bench Press',65,[8,8,8,8]);mkP(d,'Chest','Cable Fly Up',35,[12,12,12,12,12]);mkP(d,'Sixpack','Hanging Leg Raise',0,[15,15,15],true);}
mkP('2026-09-05','Chest','Barbell Bench Press',135,[7,6,5,8,8]);mkP('2026-09-05','Chest','Dip',45,[8,10,6],true);
mkP('2025-12-21','Chest','Cable Fly Down',11,[12,10,10,12]);
mkP('2026-10-03','Chest','Barbell Bench Press',135,[6,6,6,6,6]);mkP('2026-10-03','Chest','Dip',50,[4,6,6],true);mkP('2026-10-02','Sixpack','Hanging Leg Raise',0,[15,15],true);
migrateCanon();SEED=deriveAll();
var D='2026-10-10';pwOpen(D);var S=pw();S.dates=[D];S.active=D;S.objective='grow';Object.assign(pwDay(D),{rows:[],parts:['Chest','Sixpack'],partsPick:true,focus:['chest','lower-chest'],focusPick:true,locks:[],target:null,source:'Your draft'});
pfState().page='edit';S.step='edit';writerWaitStart=()=>{};
var ANSWER='Barbell Bench Press\\n  95 lb × 10 (warm-up)\\n  135 lb × 8 8 8 8 8\\n\\nDip\\n  BW +50 lb × 6 6 6\\n\\nCable Fly Down\\n  11 lb × 12 12 12\\n\\nHanging Leg Raise\\n  BW × 15 15 15';
writeSession=async p=>({days:[{date:D,part:'Chest',title:'Chest + Sixpack',text:ANSWER}],reason:null});`);
test('the fixture is the maker’s: Cable Fly Down is logged, but not within eight weeks',`exIsNew('Cable Fly Down')&&!!SEED.exLast['Cable Fly Down']&&pwAutoTarget(['Chest','Sixpack']).total===17`);
await run(`pwGenerate(false,true)`);
run(`var B=pwDay(D),exs=pwExercises(B.rows).map(r=>r.ex),work=r=>r.lines.filter(l=>!/warm/i.test((l.qual||'')+(l.tag||''))),nSets=r=>work(r).reduce((a,l)=>a+l.reps.length,0),rowOf=ex=>B.rows.find(r=>r.ex===ex);`);
test('the answer was applied without an error',`!S.error&&B.rows.length>0`);
test('Cable Fly Down is an exercise in the plan, with its sets',`exs.includes('Cable Fly Down')&&nSets(rowOf('Cable Fly Down'))>=3&&/11 lb/.test(pwText([rowOf('Cable Fly Down')]))`);
test('nothing in the plan is a line of text',`B.rows.every(r=>r.kind==='ex'&&r.ex&&r.lines.length)`);
test('...and the page shows no "Edit text" button',`(()=>{pwRender();return !/Edit text/.test(document.getElementById('view').textContent);})()`);
test('no working set is under 8 reps: Dip 6 6 6 became 8s at the same weight',`B.rows.every(r=>homePartOf(r.ex)==='Run'||work(r).every(l=>l.reps.every(n=>n>=8)))&&/BW \\+50 lb × 8 8 8/.test(pwText([rowOf('Dip')]))`);
test('...and the Checks say so',`B.notes.some(n=>/^Dip: sets written under 8 reps raised to 8 — the floor for Grow$/.test(n))`);
test('no exercise carries more than five working sets',`B.rows.every(r=>nSets(r)<=5)`);
test('four exercises carry the day at the maker’s usual sets each; it stops at 16 rather than stack a 17th, and says so',`exs.length>=4&&pwSetCount(B.rows)===16&&B.notes.some(n=>/^The day holds 16 sets at your usual sets per exercise; the target is 17\\./.test(n))`);
test('...what was added is on a focus muscle, and in a sound order',`(()=>{const chest=exs.filter(x=>homePartOf(x)==='Chest');return chest.every(x=>['chest','lower-chest'].includes(exMuscle(x,'Chest')))&&exs.map(pwTier).every((t,i,a)=>!i||a[i-1]<=t);})()`);
test('the weights are not above what was last lifted (bench 135, dip +50)',`Math.max(...rowOf('Barbell Bench Press').lines.map(l=>l.w))<=135.5&&Math.max(...rowOf('Dip').lines.map(l=>l.w))<=50.5`);

/* a movement with NO record is still held to the old rules, but leaves no text behind */
run(`ANSWER='Barbell Bench Press\\n  135 lb × 8 8 8 8\\n\\nDip\\n  BW +50 lb × 8 8 8\\n\\nSvend Press\\n  ≈25 lb × 12 12 12\\n\\nHanging Leg Raise\\n  BW × 15 15 15';Object.assign(pwDay(D),{rows:[],focus:[],focusGen:[],focusPick:false,partsPick:true,parts:['Chest','Sixpack'],locks:[]});`);
await run(`pwGenerate(false,true)`);
run(`B=pwDay(D);exs=pwExercises(B.rows).map(r=>r.ex);`);
test('a never-logged movement for a muscle that already has work is left out...',`!exs.includes('Svend Press')&&B.notes.some(n=>/^Svend Press: new, and/.test(n))`);
test('no exercise is brought in for a single leftover set',`B.rows.every(r=>r.lines.reduce((a,l)=>a+l.reps.length,0)>=3)`);
test('...and leaves no text row behind',`B.rows.every(r=>r.kind==='ex'&&r.ex&&r.lines.length)`);

/* the floor is Grow's; strength keeps its low reps */
run(`var PL=pwPayload([D],'generate');var chk=o=>writerCheck({days:[{date:D,part:'Chest',title:'Chest',text:'Barbell Bench Press\\n  135 lb × 5 5 5 5\\n\\nDip\\n  BW +50 lb × 6 6 6\\n\\nIncline Barbell Bench Press\\n  175 lb × 8 8 8 8\\n\\nIncline Dumbbell Bench Press\\n  65 lb × 8 8 8\\n\\nHanging Leg Raise\\n  BW × 15 15 15'}],reason:null},{payload:{...PL,objective:o}});
var reps=(c,ex)=>c.rows.find(r=>r.ex===ex).lines.flatMap(l=>l.reps);`);
test('Grow raises 5s and 6s to 8',`reps(chk('grow'),'Barbell Bench Press').every(n=>n===8)&&reps(chk('grow'),'Dip').every(n=>n===8)`);
test('Strength leaves them as written',`reps(chk('strength'),'Barbell Bench Press').every(n=>n===5)&&reps(chk('strength'),'Dip').every(n=>n===6)`);
test('a warm-up line is not a working set and is left alone',`(()=>{const c=writerCheck({days:[{date:D,part:'Chest',title:'Chest',text:'Barbell Bench Press\\n  95 lb × 5 (warm-up)\\n  135 lb × 8 8 8 8\\n\\nDip\\n  BW +50 lb × 8 8 8\\n\\nIncline Barbell Bench Press\\n  175 lb × 8 8 8 8\\n\\nIncline Dumbbell Bench Press\\n  65 lb × 8 8 8'}],reason:null},{payload:{...PL,objective:'grow'}});return c.rows.find(r=>r.ex==='Barbell Bench Press').lines[0].reps.join()==='5';})()`);
test('the server prompt asks for the same: 8 or more for grow, logged means not new, no stacking',`/NEVER write a working set under 8 reps for grow/.test(SRV)&&/NEW MEANS NEVER LOGGED/.test(SRV)&&/never more than 5 on one exercise/.test(SRV)`);
console.log(checks+' checks');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
