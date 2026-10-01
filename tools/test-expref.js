// v4.6.173: your verdict on an exercise (DB.settings.exPref), keyed by id.
// The maker hates Romanian Deadlift and Calf Raises and had no way to say so.
// Covers: the store (by id, alias-safe, neutral = no entry), the one-time move
// of the planner's avoid list, the planner's own picks (avoided skipped, liked
// first), the writer's menu (avoided off it, the muscle still covered), the
// legacy list still honoured, and the log left untouched.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);
let checks=0;
function test(name,code){assert(run(code),name);console.log('PASS '+name);checks++;}

/* a Legs history: the maker's lifts, including the two he hates */
run(`todayISO='2026-10-01';checkDate=()=>false;
DB={days:{},settings:{unit:'lb',onboarded:true,plannerPreferences:{frequency:5,mode:'time',minutes:45,minSets:20,maxSets:25,emphasis:{},avoid:['Standing Calf Raise'],split:'auto'}}};
var mk=(d,ex,lb,reps)=>{(DB.days[d]=DB.days[d]||{w:[]}).w.push({part:'Legs',ex,w:lb/2.20462,reps,at:Date.parse(d+'T18:00')});};
mk('2026-09-20','Romanian Deadlift',185,[8,8,8]);mk('2026-09-22','Lying Leg Curl',90,[12,12,12]);
mk('2026-09-24','Standing Calf Raise',45,[12,12,12]);mk('2026-09-26','Leg Extension',110,[12,12,12]);
mk('2026-09-28','Squat',245,[6,6,6,6]);
var logBefore=JSON.stringify(DB.days);
migrateCanon();migrateAvoidToPrefs();SEED=deriveAll();`);

test('the planner avoid list moves into verdicts, by id',`exPref('Standing Calf Raise')==='avoid'&&DB.settings.exPref['standing-calf-raise'].v==='avoid'&&DB.settings.exPrefFrom===1`);
test('...once: removing it later is not undone by the migration',`(()=>{setExPref('Standing Calf Raise',null);migrateAvoidToPrefs();const ok=exPref('Standing Calf Raise')===null;setExPref('Standing Calf Raise','avoid');return ok;})()`);
run(`setExPref('Romanian Deadlift','avoid');setExPref('Leg Extension','like');`);
test('a verdict is stored by id with its time',`DB.settings.exPref['romanian-deadlift'].v==='avoid'&&DB.settings.exPref['romanian-deadlift'].at>0`);
test('neutral is the absence of an entry',`exPref('Squat')===null&&!('squat' in DB.settings.exPref)`);
test('a rename keeps the verdict (same id)',`(()=>{const c=DB.settings.canon['romanian-deadlift'];const old=c.name;c.name='RDL';c.al=[old];const ok=exPref('RDL')==='avoid'&&exPref('Romanian Deadlift')==='avoid';c.name=old;c.al=[];return ok;})()`);
test('a verdict does not touch the log',`JSON.stringify(Object.fromEntries(Object.entries(DB.days).map(([d,v])=>[d,{...v,w:v.w.map(s=>{const {cid,...r}=s;return r;})}])))===logBefore`);

/* the planner's own picks: Set target + and Add candidates */
run(`var day={rows:pwRead('Squat\\n  245 lb × 6 6 6 6'),parts:['Legs']};var cands=pwAddCandidates(day);`);
test('what the app adds on its own skips what you avoid',`!cands.includes('Romanian Deadlift')&&!cands.includes('Standing Calf Raise')`);
test('...and what you like comes first',`cands[0]==='Leg Extension'&&cands.includes('Lying Leg Curl')`);

/* the writer's menu */
run(`var pay;try{pay=writerPayload({});}catch(e){pay={err:e.message};}`);
test('the writer payload builds',`!pay.err&&!!pay.catalog`);
test('avoided exercises are off the writer menu',`!pay.catalog.Legs.includes('Romanian Deadlift')&&!pay.catalog.Legs.includes('Standing Calf Raise')`);
test('...the muscle map still offers the hamstrings a lift (leg curls)',`(pay.heads.Legs.hamstrings||[]).includes('Lying Leg Curl')&&!(pay.heads.Legs.hamstrings||[]).includes('Romanian Deadlift')`);
test('...and calves have nothing left, so the writer is not handed one',`!(pay.heads.Legs.calves||[]).some(e=>e==='Standing Calf Raise')`);
test('your past Romanian Deadlift sets still count toward hamstring coverage',`pay.coverage.Legs.hamstrings>=6`);

/* planning preferences read and write the same verdicts */
test('Planning preferences list the avoided exercises',`(()=>{const p=pfPrefs();return p.avoid.includes('Romanian Deadlift')&&p.avoid.includes('Standing Calf Raise')&&p.like.includes('Leg Extension');})()`);
test('...a device on an older version writing the legacy list still counts',`(()=>{DB.settings.plannerPreferences.avoid=['Leg Press'];const p=pfPrefs();return p.avoid.includes('Leg Press')&&p.avoid.includes('Romanian Deadlift');})()`);
run(`DB.settings.plannerPreferences.avoid=[];`);
test('a plan row you avoid comes out of a generated day; the rest stays',`(()=>{const c={type:'generate',days:{'2026-10-02':{rows:pwRead('Romanian Deadlift\\n185 lb × 8 8 8\\nLying Leg Curl\\n90 lb × 12 12 12'),notes:[]}}};try{pfValidateCandidate(c,['2026-10-02']);}catch(e){}const rows=c.days['2026-10-02'].rows.map(r=>r.ex);return !rows.includes('Romanian Deadlift')&&rows.includes('Lying Leg Curl');})()`);
console.log(checks+' exercise-preference checks passed');dom.window.close();process.exit(0);
