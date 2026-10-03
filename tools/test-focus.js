// v4.6.183: a day's muscle focus and the auto set target.
// The maker planned a Saturday chest day, got three incline movements, could
// not ask for lower chest, and could not tell whether "15 sets" was right.
// Covers: your usual sets per body part (median of the days that trained it,
// eight weeks, three days before it is a habit, today left out, warm-ups
// counted because the Set target counts them); the auto target as their sum,
// kept inside the sets-range preference; Auto / Yours; the focus leaving with
// its body part; the planner's picks and the search leading with the focus;
// the writer check keeping a focus exercise that is new to you; the labels;
// and the server prompt saying all of it.
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
var mk=(d,part,ex,lb,reps)=>{(DB.days[d]=DB.days[d]||{w:[]}).w.push({part,ex,w:lb/2.20462,bw:lb===0,reps,at:Date.parse(d+'T18:00')+(DB.days[d]?DB.days[d].w.length:0)});};
var bkD=(base,k)=>{const t=new Date(base+'T12:00');t.setDate(t.getDate()-7*k);return t.toLocaleDateString('en-CA');};
for(let k=0;k<8;k++)for(const base of ['2026-09-28','2026-09-24']){const d=bkD(base,k);
  mk(d,'Chest','Incline Barbell Bench Press',95,[10]);mk(d,'Chest','Incline Barbell Bench Press',115,[10]);mk(d,'Chest','Incline Barbell Bench Press',175,[8,8,8,8]);
  mk(d,'Chest','Incline Dumbbell Bench Press',65,[8,8,8]);mk(d,'Chest','Cable Fly Up',30,[12,12,12]);mk(d,'Sixpack','Hanging Leg Raise',0,[12,12,12]);}
mk('2026-09-10','Chest','Cable Fly Down',35,[12,12]);mk('2026-09-10','Chest','Barbell Bench Press',185,[8,8,8,8]);
mk('2026-09-29','Biceps','Dumbbell Curl',30,[10,10,10]);mk('2026-09-22','Biceps','Dumbbell Curl',30,[10,10,10]);
mk('2026-07-01','Legs','Squat',225,[5,5,5]);mk('2026-07-03','Legs','Squat',225,[5,5,5]);mk('2026-07-05','Legs','Squat',225,[5,5,5]);
mk('2026-10-01','Chest','Incline Barbell Bench Press',175,[8]);
migrateCanon();SEED=deriveAll();`);

test('your usual for a part is the median of the days that trained it, warm-ups counted',`pwUsualSets('Chest')===12&&pwUsualSets('Sixpack')===3`);
test('today (a session in progress) is not one of those days',`(()=>{pwUsualSets('Chest');return pwUsualMemo.v.Chest.days===16;})()`);
test('fewer than three days is not a habit',`pwUsualSets('Biceps')===null`);
test('older than eight weeks does not count',`pwUsualSets('Legs')===null`);
test('the auto target is the sum over the day’s parts',`(()=>{const a=pwAutoTarget(['Chest','Sixpack']);return a.total===15&&JSON.stringify(a.per)==='[["Chest",12],["Sixpack",3]]'&&!a.missing.length;})()`);
test('a part with no usual leaves no total, and is named',`(()=>{const a=pwAutoTarget(['Chest','Biceps']);return a.total===null&&a.missing.join()==='Biceps';})()`);
test('cardio is not counted in a set target',`pwAutoTarget(['Run'])===null&&pwAutoTarget(['Chest','Run']).total===12`);

run(`var mkDay=t=>({rows:pwRead(t),parts:['Chest','Sixpack'],locks:[],target:null,source:'Saved plan'});
var D15=mkDay('Incline Barbell Bench Press\\n  95 lb × 10\\n  115 lb × 10\\n  175 lb × 8 8 8 8\\nIncline Dumbbell Bench Press\\n  65 lb × 8 8 8\\nCable Fly Up\\n  30 lb × 12 12 12\\nHanging Leg Raise\\n  BW × 12 12 12');
var D13=mkDay('Incline Barbell Bench Press\\n  175 lb × 8 8 8 8\\nIncline Dumbbell Bench Press\\n  65 lb × 8 8 8\\nCable Fly Up\\n  30 lb × 12 12 12\\nHanging Leg Raise\\n  BW × 12 12 12');`);
test('a day at your usual is Auto',`(()=>{const a=pfAuto(D15);return a.total===15&&!a.mine&&a.target===15;})()`);
test('a day away from it is yours, and Regenerate keeps your number',`(()=>{const a=pfAuto(D13);return a.mine&&a.target===13;})()`);
test('changed body parts: the target is the new parts’ usual',`(()=>{const a=pfAuto({...D13,parts:['Sixpack'],partsPick:true});return !a.mine&&a.target===3;})()`);
test('the sets-range preference bounds the auto number, and says so',`(()=>{DB.settings.plannerPreferences={frequency:5,mode:'sets',minutes:45,minSets:20,maxSets:25,emphasis:{},avoid:[],split:'auto'};const a=pfAuto(D15);DB.settings.plannerPreferences.mode='time';return a.total===20&&a.range==='20–25'&&/kept inside your 20–25 range/.test(pfAutoHTML(D15,a));})()`);
test('the line under the stepper names each part’s usual',`/Chest 12<\\/b> \\+ <b>Sixpack 3<\\/b> · what you usually do on these days/.test(pfAutoHTML(D15,pfAuto(D15)))`);
test('...and offers Back to auto once the count is yours',`/Your usual is <b>15<\\/b>/.test(pfAutoHTML(D13,pfAuto(D13)))&&/data-pw="pf-auto"/.test(pfAutoHTML(D13,pfAuto(D13)))`);

test('a focus row for each selected part with more than one muscle, none for Biceps',`(()=>{const h=pfFocusHTML({...D15,parts:['Chest','Biceps','Sixpack']});return (h.match(/pf-focus-row/g)||[]).length===2&&/data-muscle="lower-chest"/.test(h)&&/data-muscle="obliques"/.test(h)&&!/data-muscle="biceps"/.test(h);})()`);
test('no focus box at all for parts with one muscle',`pfFocusHTML({...D15,parts:['Biceps','Triceps']})===''`);
test('a focus belongs to its body part: off the day, it is not a focus',`pfFocus({...D15,focus:['lower-chest','abs'],parts:['Sixpack'],partsPick:true}).join()==='abs'&&pwFocus({rows:[],parts:['Sixpack'],focus:['lower-chest','abs']}).join()==='abs'`);
test('a tapped focus waits on Regenerate; the same focus the day was built with does not',`pfFocusPending({...D15,focus:['lower-chest'],focusPick:true})&&!pfFocusPending({...D15,focus:['lower-chest'],focusPick:true,focusGen:['lower-chest']})`);
test('the hint names the focus beside its part',`pfPartsText({...D15,focus:['lower-chest']})==='Chest · lower chest first + Sixpack'`);
test('every exercise of a multi-muscle part carries its muscle; the focus is lit',`/pf-mtag">Upper</.test(pfMuscleTag(D15,'Incline Barbell Bench Press'))&&/pf-mtag on">Lower</.test(pfMuscleTag({...D15,focus:['lower-chest']},'Dip'))&&pfMuscleTag(D15,'Dumbbell Curl')===''`);
test('the planner’s own picks lead with the focus muscle',`pwAddCandidates({rows:[],parts:['Chest'],focus:['lower-chest']})[0]==='Cable Fly Down'&&pwAddCandidates({rows:[],parts:['Chest']})[0]!=='Cable Fly Down'`);
test('the search leads with it too, done and not tried',`pwAddSearch('fly',{rows:[],parts:['Chest'],focus:['lower-chest']}).mine[0]==='Cable Fly Down'&&/^Decline/.test(pwAddSearch('press',{rows:[],parts:['Chest'],focus:['lower-chest']}).fresh[0])`);
test('the middle chest is "mid chest" now, and lower chest has its own name',`MUSCLE_LABEL.chest==='mid chest'&&MUSCLE_LABEL['lower-chest']==='lower chest'`);

/* the writer check */
run(`pwOpen('2026-10-03');var S=pw();S.dates=['2026-10-03'];S.active='2026-10-03';Object.assign(pwDay('2026-10-03'),D15,{focus:['lower-chest'],focusPick:true});
var PL=pwPayload(['2026-10-03'],'generate');
var ans=t=>writerCheck({days:[{date:'2026-10-03',part:'Chest',title:'Chest',text:t}],reason:null},{payload:PL});`);
test('the focus goes to the writer as a field of its own, per date',`JSON.stringify(PL.workspace.schedule.find(x=>x.date==='2026-10-03').focus)==='[{"part":"Chest","muscle":"lower-chest"}]'`);
test('...with the set target and every part’s usual',`PL.workspace.drafts[0].target_total_sets===15&&PL.workspace.usual_sets.Chest===12&&PL.workspace.usual_sets.Sixpack===3&&!('Biceps' in PL.workspace.usual_sets)`);
test('the note does not name the part (a named part would excuse the recovery rule)',`!/Chest/.test(PL.note.replace(/Confirmed planning preferences:.*/,''))`);
run(`var good=ans('Decline Barbell Bench Press\\n  by feel × 10 10 10 10\\n\\nDecline Dumbbell Bench Press\\n  by feel × 10 10 10\\n\\nDip\\n  BW × 10 10\\n\\nIncline Barbell Bench Press\\n  175 lb × 8 8 8\\n\\nHanging Leg Raise\\n  BW × 12 12 12');`);
test('focus exercises new to you are kept: three of them, past the new-movement allowance',`['Decline Barbell Bench Press','Decline Dumbbell Bench Press','Dip'].every(ex=>good.rows.some(r=>r.kind==='ex'&&r.ex===ex))&&!good.violations.length`);
test('too little of the focus is sent back, with the count',`ans('Incline Barbell Bench Press\\n  175 lb × 8 8 8 8\\n\\nIncline Dumbbell Bench Press\\n  65 lb × 8 8 8\\n\\nCable Fly Up\\n  30 lb × 12 12 12\\n\\nCable Fly Down\\n  35 lb × 12 12\\n\\nHanging Leg Raise\\n  BW × 12 12 12').violations[0].why.some(x=>/lower chest is this day's focus and holds 2 of 12 Chest sets/.test(x))`);
test('none of the focus is sent back',`ans('Incline Barbell Bench Press\\n  175 lb × 8 8 8 8\\n\\nIncline Dumbbell Bench Press\\n  65 lb × 8 8 8\\n\\nCable Fly Up\\n  30 lb × 12 12 12\\n\\nHanging Leg Raise\\n  BW × 12 12 12').violations[0].why.some(x=>/lower chest is this day's focus and has no exercise/.test(x))`);
test('a focus whose every exercise you avoid is not held against the day',`(()=>{for(const ex of PL.heads.Chest['lower-chest'])setExPref(ex,'avoid');const P2=pwPayload(['2026-10-03'],'generate');const r=writerCheck({days:[{date:'2026-10-03',part:'Chest',title:'Chest',text:'Incline Barbell Bench Press\\n  175 lb × 8 8 8 8\\n\\nIncline Dumbbell Bench Press\\n  65 lb × 8 8 8\\n\\nCable Fly Up\\n  30 lb × 12 12 12\\n\\nHanging Leg Raise\\n  BW × 12 12 12'}],reason:null},{payload:P2});for(const ex of PL.heads.Chest['lower-chest'])setExPref(ex,null);return !r.violations.some(v=>v.why.some(x=>/focus/.test(x)));})()`);

/* the device: focus first inside its part, then the count */
run(`var cand={type:'generate',days:{'2026-10-03':{rows:pwRead('Incline Barbell Bench Press\\n  175 lb × 8 8 8\\nDecline Barbell Bench Press\\n  by feel × 10 10 10 10\\nCable Fly Down\\n  35 lb × 12 12 12\\nDip\\n  BW × 10 10\\nHanging Leg Raise\\n  BW × 12 12 12 12'),notes:[]}}};pfValidateCandidate(cand,['2026-10-03']);var outD=cand.days['2026-10-03'];`);
test('an exercise off the focus is swapped for its closest counterpart on it',`pwExercises(outD.rows).map(r=>r.ex).join()==='Decline Barbell Bench Press,Decline Dumbbell Bench Press,Dip,Cable Fly Down,Hanging Leg Raise'&&outD.notes.some(n=>/^Decline Dumbbell Bench Press: in for Incline Barbell Bench Press — lower chest is this day’s focus, new to you, so it starts by feel\\.$/.test(n))`);
test('...one new to you starts by feel, at the reps of the exercise it replaced',`/by feel × 8 8/.test(pwText([outD.rows[1]]).toLowerCase().replace(/\\s+/g,' '))`);
test('...and fitted to the target, with a note saying so',`pwSetCount(outD.rows)===15&&outD.notes.some(n=>/^Hanging Leg Raise: 4 working sets written, kept to 3 — your usual\\.$/.test(n))   /* v4.6.198: the extra set comes off at the exercise's own usual, before the count is looked at */`);
test('applying it records the focus the day was built with',`(()=>{S.candidate=cand;pwApply();const b=pwDay('2026-10-03');return b.focus.join()==='lower-chest'&&b.focusGen.join()==='lower-chest'&&!b.focusPick&&!pfFocusPending(b)&&/ (\\d+) of \\1 Chest sets on lower chest/.test(pfFocusStat(b));})()`);

/* the maker's Saturday: Mid + Lower chest and Obliques, answered with Dip and three incline movements */
run(`Object.assign(pwDay('2026-10-03'),{focus:['chest','lower-chest','obliques'],focusPick:true,locks:[]});
var c2={type:'generate',days:{'2026-10-03':{rows:pwRead('Dip\\n  BW +50 lb × 8 8 8\\nIncline Barbell Bench Press\\n  95 lb × 10\\n  115 lb × 10\\n  175 lb × 8 8 8\\nIncline Dumbbell Bench Press\\n  65 lb × 8 8 8\\nCable Fly Up\\n  40 lb × 12 12 12\\nRussian Twist\\n  by feel × 15 15 15'),notes:[]}}};pfValidateCandidate(c2,['2026-10-03']);var o2=c2.days['2026-10-03'];`);
test('Mid + Lower: every chest exercise ends on a focus muscle, mid filled first by the nearest lift',`(()=>{const ex=pwExercises(o2.rows).map(r=>r.ex);return ex.join()==='Barbell Bench Press,Dip,Decline Dumbbell Bench Press,Cable Fly Down,Russian Twist'&&ex.filter(x=>homePartOf(x)==='Chest').every(x=>['chest','lower-chest'].includes(exMuscle(x,'Chest')));})()`);
test('...an exercise you have done arrives with your last working sets',`/185 lb × 8 8 8 8/.test(pwText([o2.rows[0]]))`);
test('...the count still lands on the target, and Checks names each swap',`pwSetCount(o2.rows)===15&&o2.notes.filter(n=>/ in for /.test(n)).length===3`);
test('an exercise you fixed is not swapped',`(()=>{const b=pwDay('2026-10-03'),keep=b.rows,kl=b.locks;b.rows=pwRead('Incline Barbell Bench Press\\n  175 lb × 8 8 8');b.locks=[0];const c={type:'generate',days:{'2026-10-03':{rows:pwRead('Incline Barbell Bench Press\\n  175 lb × 8 8 8\\nCable Fly Up\\n  40 lb × 12 12 12'),notes:[]}}};pfValidateCandidate(c,['2026-10-03']);const ex=pwExercises(c.days['2026-10-03'].rows).map(r=>r.ex);b.rows=keep;b.locks=kl;return ex.includes('Incline Barbell Bench Press')&&!ex.includes('Cable Fly Up');})()`);
test('an avoided exercise is not brought in',`(()=>{setExPref('Cable Fly Down','avoid');const c={type:'generate',days:{'2026-10-03':{rows:pwRead('Cable Fly Up\\n  40 lb × 12 12 12'),notes:[]}}};pfValidateCandidate(c,['2026-10-03']);setExPref('Cable Fly Down',null);const ex=pwExercises(c.days['2026-10-03'].rows).map(r=>r.ex);return ex.length>=1&&!ex.includes('Cable Fly Down')&&!ex.includes('Cable Fly Up');})()`);
test('the server prompt carries the focus rule and the set-target rule',`/MUSCLE FOCUS: a workspace\\.schedule entry may carry focus/.test(SRV)&&/Every exercise you write for that part comes from payload\\.heads\\[part\\]\\[muscle\\]/.test(SRV)&&/SET TARGETS: for action=generate, a draft with target_total_sets must total exactly/.test(SRV)&&/usual_sets/.test(SRV)`);
console.log(checks+' checks');
process.exit(0);
