// v4.6.328: MORE SETS MEANS ANOTHER EXERCISE. Sungjee's leg day had 13 sets; raising the count only
// stretched Squats from 4 to 8. Now + fills each exercise to its usual sets, then brings in whole
// exercises (your own first, then the app's pick for the part, by feel if new), and only stretches
// a line when there is nothing left to add.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);let checks=0;
function test(name,code){assert(run(code),name+' -> '+run('JSON.stringify(sets())'));console.log('PASS '+name);checks++;}
run(`todayISO='2026-10-15';checkDate=()=>false;localStorage.setItem('showup:planner-flow','flow');
DB={days:{},settings:{unit:'lb',onboarded:true,planningWorkspace:true}};
var mk=(d,ex,lb,reps)=>{(DB.days[d]=DB.days[d]||{w:[]}).w.push({part:'Legs',ex,w:lb/2.20462,reps,at:Date.parse(d+'T18:00')+DB.days[d].w.length});};
for(const d of ['2026-09-20','2026-09-27','2026-10-04','2026-10-11']){mk(d,'Squat',225,[5,5,5,5]);mk(d,'Leg Press',360,[10,10,10]);mk(d,'Lying Leg Curl',90,[12,12,12]);mk(d,'Standing Calf Raise',180,[15,15,15]);}
migrateCanon();SEED=deriveAll();
pwOpen('2026-10-16');var S=pw();S.dates=['2026-10-16'];S.active='2026-10-16';
Object.assign(pwDay('2026-10-16'),{rows:pwRead('Squat\\n  225 lb × 5 5 5 5\\nLeg Press\\n  360 lb × 10 10 10\\nLying Leg Curl\\n  90 lb × 12 12 12\\nStanding Calf Raise\\n  180 lb × 15 15 15'),parts:['Legs'],partsPick:true,locks:[],target:null,source:'Your draft'});
var B=pwDay('2026-10-16');pfState().stepBase={};
var sets=()=>pwExercises(B.rows).map(r=>r.ex+':'+r.lines.reduce((a,l)=>a+l.reps.length,0));
var setsOf=ex=>{const r=pwExercises(B.rows).find(r=>r.ex===ex);return r?r.lines.reduce((a,l)=>a+l.reps.length,0):0;};`);
test('the day starts at 13 sets',`pwSetCount(B.rows)===13`);
run(`for(let k=0;k<3;k++)pfHandle('pf-plus',{dataset:{}});`);
test('+3: a new leg exercise comes in; Squats stay at 4',`pwSetCount(B.rows)===16&&setsOf('Squat')===4&&pwExercises(B.rows).length===5`);
run(`for(let k=0;k<3;k++)pfHandle('pf-plus',{dataset:{}});`);
test('+6: another exercise rather than longer ones',`pwSetCount(B.rows)===19&&setsOf('Squat')===4&&pwExercises(B.rows).length===6`);
run(`for(let k=0;k<6;k++)pfHandle('pf-minus',{dataset:{}});`);
test('back to 13: the added exercises leave first, the original four as they were',`pwSetCount(B.rows)===13&&pwExercises(B.rows).length===4&&setsOf('Squat')===4`);
run(`for(let k=0;k<4;k++)pfHandle('pf-plus',{dataset:{}});`);
test('Regenerate writes to the count you set, not back to Auto',`B.setsMine===true&&pwPayload(['2026-10-16'],'generate').workspace.drafts[0].target_total_sets===17`);
console.log('added: '+run('JSON.stringify(sets())'));
console.log(checks+' checks');process.exit(0);
