// v4.6.193: a sound exercise order. A suggested day came out as Dip, Barbell
// Bench Press, Cable Fly Down, Russian Twist, Chest Fly: bodyweight ahead of the
// heavy bar, and a chest fly after the core, because what the app added was
// pushed onto the end.
// Covers: the tiers; ordering a generated day (the maker's exact day; legs;
// back and arms); the writer's order kept inside a tier; fixed exercises
// keeping their places; Set target + and Back to auto placing what they bring
// in; the Add sheet placing a pick; fixed rows following their exercises; and
// the server prompt saying it.
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
run(`todayISO='2026-10-01';checkDate=()=>false;localStorage.setItem('showup:planner-flow','flow');
DB={days:{},settings:{unit:'lb',onboarded:true,planningWorkspace:true}};
var mkO=(d,part,ex,lb,reps)=>{(DB.days[d]=DB.days[d]||{w:[]}).w.push({part,ex,w:lb/2.20462,bw:lb===0,reps,at:Date.parse(d+'T18:00')+(DB.days[d]?DB.days[d].w.length:0)});};
mkO('2026-09-05','Chest','Dip',45,[8,10,6]);mkO('2026-09-05','Chest','Barbell Bench Press',135,[7,6,5,8,8]);mkO('2026-08-05','Chest','Chest Fly',110,[10,10,10,10]);mkO('2026-08-01','Chest','Cable Fly Down',11,[12,10,10,12]);mkO('2026-09-20','Sixpack','Russian Twist',0,[15,15,15]);
migrateCanon();SEED=deriveAll();
var names=t=>pwExercises(pwOrderRows(pwRead(t))).map(r=>r.ex).join(' > ');
var mkPlan=l=>l.map(x=>x+'\\n  by feel × 10 10 10').join('\\n\\n');`);
test('the tiers: free bar, other compound, isolation, core, cardio',`pwTier('Barbell Bench Press')===0&&pwTier('Squat')===0&&pwTier('Incline Smith Machine Bench Press')===0&&pwTier('Dip')===1&&pwTier('Dumbbell Bench Press')===1&&pwTier('Lat Pulldown')===1&&pwTier('Cable Fly Down')===2&&pwTier('Chest Fly')===2&&pwTier('Barbell Curl')===2&&pwTier('Leg Extension')===2&&pwTier('Triceps Pushdown')===2&&pwTier('Russian Twist')===3&&pwTier('Hanging Leg Raise')===3&&pwTier('Run')===4`);
test('the maker’s day: the bar, then Dip, then the flies, core last',`names(mkPlan(['Dip','Barbell Bench Press','Cable Fly Down','Russian Twist','Chest Fly']))==='Barbell Bench Press > Dip > Cable Fly Down > Chest Fly > Russian Twist'`);
test('a leg day: squat and the hinge, then the other compound lifts, then the machines, core last',`names(mkPlan(['Leg Extension','Hanging Leg Raise','Dumbbell Lunge','Squat','Lying Leg Curl','Leg Press']))==='Squat > Dumbbell Lunge > Leg Press > Leg Extension > Lying Leg Curl > Hanging Leg Raise'`);
test('back and arms: rows and pulls before curls',`names(mkPlan(['Dumbbell Curl','Lat Pulldown','Bent-Over Row','Hammer Curl','Pull Up']))==='Bent-Over Row > Lat Pulldown > Pull Up > Dumbbell Curl > Hammer Curl'`);
test('inside a tier the given order stands',`names(mkPlan(['Chest Fly','Cable Fly Down']))==='Chest Fly > Cable Fly Down'&&names(mkPlan(['Cable Fly Down','Chest Fly']))==='Cable Fly Down > Chest Fly'`);
test('an already sound day is not touched',`(()=>{const t=mkPlan(['Barbell Bench Press','Dip','Chest Fly','Russian Twist']);return pwText(pwOrderRows(pwRead(t)))===pwText(pwRead(t));})()`);
test('a fixed exercise keeps its place; the others order around it',`pwExercises(pwOrderRows(pwRead(mkPlan(['Russian Twist','Chest Fly','Barbell Bench Press','Dip'])),new Set([0]))).map(r=>r.ex).join(' > ')==='Russian Twist > Barbell Bench Press > Dip > Chest Fly'`);
test('a focus muscle’s lifts lead their tier',`pwExercises(pwOrderRows(pwRead(mkPlan(['Incline Dumbbell Bench Press','Dip','Dumbbell Bench Press'])),new Set(),r=>exMuscle(r.ex,'Chest')==='lower-chest')).map(r=>r.ex).join(' > ')==='Dip > Incline Dumbbell Bench Press > Dumbbell Bench Press'`);

/* the generated day, end to end */
run(`pwOpen('2026-10-03');var S=pw();S.dates=['2026-10-03'];S.active='2026-10-03';Object.assign(pwDay('2026-10-03'),{rows:[],parts:['Chest','Sixpack'],partsPick:true,locks:[],target:null,source:'Your draft'});
var c={type:'generate',days:{'2026-10-03':{rows:pwRead('Dip\\n  BW +50 lb × 10 10 10 10\\nBarbell Bench Press\\n  135 lb × 7 6 5 5\\nCable Fly Down\\n  11 lb × 12 10 10\\nRussian Twist\\n  by feel × 15 15 15'),notes:[]}}};pfValidateCandidate(c,['2026-10-03']);S.candidate=c;pwApply();var B=pwDay('2026-10-03');pfState().page='edit';S.step='edit';
var order=()=>pwExercises(B.rows).map(r=>r.ex).join(' > ');`);
test('the writer’s answer is put in order when it arrives',`order()==='Barbell Bench Press > Dip > Cable Fly Down > Russian Twist'`);
/* + first fills the day's own exercises; it is pressed until it brings one in */
run(`var T0=pwSetCount(B.rows),NP=0;while(pwExercises(B.rows).length===4&&NP<15){pfHandle('pf-plus',{dataset:{}});NP++;}`);
test('Set target +: the exercise it brings in goes with its own work, ahead of the core',`order()==='Barbell Bench Press > Dip > Cable Fly Down > Chest Fly > Russian Twist'&&pwSetCount(B.rows)===T0+NP`);
run(`for(let k=0;k<NP;k++)pfHandle('pf-minus',{dataset:{}});`);
test('...and − takes it away again, leaving the day as it was',`order()==='Barbell Bench Press > Dip > Cable Fly Down > Russian Twist'&&pwSetCount(B.rows)===T0`);
run(`B.locks=[3];pfState().stepBase={};for(let k=0;k<NP;k++)pfHandle('pf-plus',{dataset:{}});`);
test('a fixed row follows its exercise when something is placed ahead of it',`order()==='Barbell Bench Press > Dip > Cable Fly Down > Chest Fly > Russian Twist'&&B.locks.join()==='4'&&B.rows[B.locks[0]].ex==='Russian Twist'`);
run(`for(let k=0;k<NP;k++)pfHandle('pf-minus',{dataset:{}});`);
test('...and comes back with it',`B.locks.join()==='3'&&B.rows[3].ex==='Russian Twist'`);
run(`B.locks=[];S.addOpen=true;S.addCtx='edit';pwHandle({target:{closest:s=>s==='[data-pw]'?{dataset:{pw:'add-pick',ex:'Chest Fly'}}:null}});`);
test('the Add sheet places a pick the same way',`order()==='Barbell Bench Press > Dip > Cable Fly Down > Chest Fly > Russian Twist'`);
test('the server prompt asks for the same order',`/ORDER WITHIN A DAY:/.test(SRV)&&/Free-bar compound lifts first/.test(SRV)&&/core last/.test(SRV)`);
console.log(checks+' checks');process.exit(0);
