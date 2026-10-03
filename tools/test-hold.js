// v4.6.194: hold a weight. The maker has pain on the flat bench and wants its
// weight left where it is, while the incline bench keeps climbing.
// Covers: the store (by id, a rename keeps it, Progress = no entry); the held
// weight (set at switch-on, follows the record down, not up; bodyweight;
// nothing on record); the writer payload (verdict hold, load, payload.hold,
// the other lift still steps); the device check (a heavier line is brought
// down, warm-ups left, no step-up correction, the other lift untouched); the
// next-set prefill; the tags and the Settings list; the server prompt, whose
// verdict lines now carry values instead of literal placeholders.
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
run(`todayISO='2026-10-03';checkDate=()=>false;localStorage.setItem('showup:planner-flow','flow');
DB={days:{},settings:{unit:'lb',onboarded:true,planningWorkspace:true}};
var LBv=2.20462,mkH=(d,part,ex,lb,reps,bw)=>{(DB.days[d]=DB.days[d]||{w:[]}).w.push({part,ex,w:lb/LBv,bw:!!bw,reps,at:Date.parse(d+'T18:00')+(DB.days[d]?DB.days[d].w.length:0)});};
for(const d of ['2026-09-08','2026-09-15','2026-09-22','2026-09-29']){mkH(d,'Chest','Barbell Bench Press',135,[8,8,8,8]);mkH(d,'Chest','Incline Barbell Bench Press',175,[8,8,8,8]);mkH(d,'Chest','Dip',45,[8,8,8],true);mkH(d,'Sixpack','Hanging Leg Raise',0,[12,12,12],true);}
migrateCanon();SEED=deriveAll();
var near=(a,b)=>Math.abs(a-b)<0.06;`);
test('nothing is held to begin with',`!isHeld('Barbell Bench Press')&&heldW('Barbell Bench Press')===null&&exHoldNames().length===0`);
run(`setExHold('Barbell Bench Press',true);`);
test('Hold is stored by id, with the last working weight and the time',`(()=>{const e=DB.settings.exHold['barbell-bench-press'];return !!e&&near(e.w*LBv,135)&&e.at>0&&isHeld('Barbell Bench Press');})()`);
test('the held weight is that weight',`near(heldW('Barbell Bench Press')*LBv,135)`);
test('a rename keeps the hold (same id)',`(()=>{const c=DB.settings.canon['barbell-bench-press'],old=c.name;c.name='Flat Bench';c.al=[old];const ok=isHeld('Flat Bench')&&isHeld('Barbell Bench Press');c.name=old;c.al=[];return ok;})()`);
test('the incline bench is not held',`!isHeld('Incline Barbell Bench Press')`);

/* the writer payload */
run(`var P=writerPayload({scope:'day',days:new Set(['2026-10-05']),rewrite:true,focus:[],objective:'grow',note:'',part:'Chest'});`);
test('the payload names the held exercise and its weight',`JSON.stringify(P.hold)===JSON.stringify([{exercise:'Barbell Bench Press',weight:135,unit:'lb',bodyweight:false}])`);
test('its verdict is hold, at the held weight, with the reason',`P.verdict['Barbell Bench Press']==='hold'&&near(P.load['Barbell Bench Press'],135)&&/held at your request/.test(P.because['Barbell Bench Press'])`);
test('the incline bench still earns its step up',`/^step up/.test(P.verdict['Incline Barbell Bench Press'])&&!P.hold.some(h=>h.exercise==='Incline Barbell Bench Press')`);

/* the device check */
run(`var ans=t=>writerCheck({days:[{date:'2026-10-05',part:'Chest',title:'Chest',text:t}],reason:null},{payload:{...P,days:['2026-10-05'],date:'2026-10-05'}});
var A=ans('Incline Barbell Bench Press\\n  95 lb × 10 (warm-up)\\n  185 lb × 8 8 8 8\\n\\nBarbell Bench Press\\n  95 lb × 10 (warm-up)\\n  145 lb × 8 8 8 8\\n\\nDip\\n  BW +45 lb × 8 8 8\\n\\nHanging Leg Raise\\n  BW × 12 12 12');
var rowOf=(a,ex)=>a.rows.find(r=>r.ex===ex);`);
test('a heavier line on the held exercise is brought down to the held weight',`near(Math.max(...rowOf(A,'Barbell Bench Press').lines.map(l=>l.w)),135)`);
test('...its warm-up is left alone',`rowOf(A,'Barbell Bench Press').lines.some(l=>near(l.w,95))`);
test('...and the read-back says whose decision it is',`A.notes.some(n=>/^Barbell Bench Press: held at 135 lb — you set it to Hold \\(the writer asked for more\\)$/.test(n))`);
test('the incline bench keeps the heavier weight it was written at',`near(Math.max(...rowOf(A,'Incline Barbell Bench Press').lines.map(l=>l.w)),185)`);
run(`var B2=ans('Incline Barbell Bench Press\\n  185 lb × 8 8 8 8\\n\\nBarbell Bench Press\\n  135 lb × 8 8 8 8\\n\\nDip\\n  BW +45 lb × 8 8 8\\n\\nHanging Leg Raise\\n  BW × 12 12 12');`);
test('an exact repeat of a held exercise is NOT stepped up',`near(Math.max(...rowOf(B2,'Barbell Bench Press').lines.map(l=>l.w)),135)&&B2.notes.some(n=>/^Barbell Bench Press: held at 135 lb — you set it to Hold$/.test(n))&&!B2.notes.some(n=>/^Barbell Bench Press:.*stepped up/.test(n))`);
run(`setExHold('Barbell Bench Press',false);var B3=ans('Incline Barbell Bench Press\\n  185 lb × 8 8 8 8\\n\\nBarbell Bench Press\\n  135 lb × 8 8 8 8\\n\\nDip\\n  BW +45 lb × 8 8 8\\n\\nHanging Leg Raise\\n  BW × 12 12 12');setExHold('Barbell Bench Press',true);`);
test('...whereas without Hold the same repeat is',`Math.max(...rowOf(B3,'Barbell Bench Press').lines.map(l=>l.w))>136`);

/* the held weight and the record */
run(`mkH('2026-10-01','Chest','Barbell Bench Press',125,[8,8,8]);SEED=deriveAll();`);
test('log lighter and the hold follows it down',`near(heldW('Barbell Bench Press')*LBv,125)`);
run(`mkH('2026-10-02','Chest','Barbell Bench Press',155,[5,5]);SEED=deriveAll();`);
test('log heavier and the hold does not follow it up',`near(heldW('Barbell Bench Press')*LBv,135)`);
test('the next-set prefill is the held weight, not the heavier last one',`near(nextWFor('Barbell Bench Press')*LBv,135)&&near(nextWFor('Incline Barbell Bench Press')*LBv,175)`);
run(`setExHold('Dip',true);setExHold('Chest Fly',true);`);
test('a bodyweight exercise holds its added weight',`near(heldW('Dip')*LBv,45)&&writerPayload({scope:'day',days:new Set(['2026-10-05']),rewrite:true,focus:[],objective:'grow',note:'',part:'Chest'}).hold.find(h=>h.exercise==='Dip').bodyweight===true`);
test('an exercise with nothing on record is held with no weight yet',`isHeld('Chest Fly')&&heldW('Chest Fly')===null`);

/* what you see */
test('the tag is on a held exercise and not on the others',`/xh-tag/.test(xhTag('Barbell Bench Press'))&&xhTag('Incline Barbell Bench Press')===''`);
test('the line under the switch states the weight',`/Holding at <b>135 lb<\\/b>/.test(xhNoteHTML('Barbell Bench Press'))&&/Holding at <b>BW\\+45 lb<\\/b>/.test(xhNoteHTML('Dip'))&&xhNoteHTML('Incline Barbell Bench Press')===''`);
run(`var HC=holdingCardHTML();`);
test('Settings lists what is held, with the weight, and a way to release it',`/<h2>Holding weight<\\/h2>/.test(HC)&&/Barbell Bench Press/.test(HC)&&/at 135 lb/.test(HC)&&/data-xh-progress="Barbell Bench Press"/.test(HC)&&/at BW\\+45 lb/.test(HC)`);
run(`setExHold('Barbell Bench Press',false);setExHold('Dip',false);setExHold('Chest Fly',false);`);
test('Progress removes the entry; nothing held, no card',`!('barbell-bench-press' in DB.settings.exHold)&&!isHeld('Barbell Bench Press')&&holdingCardHTML()===''`);

/* the server */
test('the server prompt has the Hold rule and is sent the list',`/HELD EXERCISES: payload\\.hold lists/.test(SRV)&&/HOLD \\(keep at exactly this weight; never raise\\): \\$\\{JSON\\.stringify\\(payload\\.hold \\|\\| \\[\\]\\)\\}/.test(SRV)`);
test('no prompt line is a literal placeholder any more (the verdict lines reach the model)',`!/\\\\\\$\\{/.test(SRV)&&/BINDING: \\$\\{JSON\\.stringify\\(payload\\.verdict/.test(SRV)`);
console.log(checks+' checks');process.exit(0);
