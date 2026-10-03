// v4.6.198: the Regenerate the maker ran on v4.6.197, with the record the page printed
// under it. Cable Fly Down came back at ≈16.5 lb x 14 under a 35 lb session done that
// day; Dip got four sets; the day stayed at four exercises.
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
run(`todayISO='2026-10-03';checkDate=()=>false;localStorage.setItem('showup:planner-flow','flow');
DB={days:{},settings:{unit:'lb',onboarded:true,planningWorkspace:true,bodyKg:70}};
var LBs=2.20462,mkP=(d,part,ex,lb,reps,bw)=>{(DB.days[d]=DB.days[d]||{w:[]}).w.push({part,ex,w:lb/LBs,bw:!!bw,reps,at:Date.parse(d+'T18:00')+(DB.days[d]?DB.days[d].w.length:0)});};
for(let k=1;k<8;k++)for(const base of ['2026-09-30','2026-09-25']){const t=new Date(base+'T12:00');t.setDate(t.getDate()-7*k);const d=t.toLocaleDateString('en-CA');
  mkP(d,'Chest','Incline Barbell Bench Press',175,[8,8,8,8,8]);mkP(d,'Chest','Incline Dumbbell Bench Press',65,[8,8,8,8]);mkP(d,'Chest','Cable Fly Up',35,[12,12,12,12,12]);mkP(d,'Sixpack','Hanging Leg Raise',0,[15,15,15],true);}
/* flat-bench Fridays: 8s at 135 on record, a lighter Cable Fly Down, a machine fly */
for(const d of ['2026-09-11','2026-09-18']){mkP(d,'Chest','Barbell Bench Press',135,[8,8,7,6,6]);mkP(d,'Chest','Dip',45,[8,8,6],true);mkP(d,'Chest','Cable Fly Down',15,[12,12,12,12]);mkP(d,'Chest','Chest Fly',100,[12,12,12]);}
/* TODAY, exactly as the page printed it under the plan */
mkP('2026-10-03','Chest','Barbell Bench Press',135,[6,6,6,6,6]);mkP('2026-10-03','Chest','Dip',50,[4,6,6],true);mkP('2026-10-03','Chest','Cable Fly Down',35,[12,12,12,12]);mkP('2026-10-02','Sixpack','Hanging Leg Raise',0,[15,15],true);
migrateCanon();SEED=deriveAll();
var D='2026-10-09';pwOpen(D);var S=pw();S.dates=[D];S.active=D;S.objective='grow';Object.assign(pwDay(D),{rows:[],parts:['Chest','Sixpack'],partsPick:true,focus:['chest','lower-chest'],focusPick:true,locks:[],target:null,source:'Your draft'});
pfState().page='edit';S.step='edit';writerWaitStart=()=>{};
var ANSWER='Barbell Bench Press\\n  95 lb × 10 (warm-up)\\n  135 lb × 8 8 8 8 8\\n\\nDip\\n  BW +50 lb × 6 6 6 6\\n\\nCable Fly Down\\n  35 lb × 14 14 14 14\\n\\nHanging Leg Raise\\n  BW × 15 15 15';
writeSession=async p=>({days:[{date:D,part:'Chest',title:'Chest + Sixpack',text:ANSWER}],reason:null});`);
test('the fixture: Cable Fly Down was 35 lb today and 15 lb before; the target is 17',`Math.round(DB.days['2026-10-03'].w.find(x=>x.ex==='Cable Fly Down').w*LBs)===35&&pwAutoTarget(['Chest','Sixpack']).total===17`);
await run(`pwGenerate(false,true)`);
run(`var B=pwDay(D),exs=pwExercises(B.rows).map(r=>r.ex),work=r=>r.lines.filter(l=>!/warm/i.test((l.qual||'')+(l.tag||''))),nSets=r=>work(r).reduce((a,l)=>a+l.reps.length,0),rowOf=ex=>B.rows.find(r=>r.ex===ex),txt=ex=>pwText([rowOf(ex)]);`);
test('applied without an error',`!S.error&&B.rows.length>0`);
test('Cable Fly Down keeps the 35 lb done today: not cut to ≈16.5, not marked a guess',`/\\n\\s*35 lb × /.test(txt('Cable Fly Down'))&&!/≈/.test(pwText(B.rows))&&!rowOf('Cable Fly Down').lines.some(l=>l.est)`);
test('...and no Check claims a 15 lb best',`!B.notes.some(n=>/more than a step over/.test(n))`);
test('today counts toward the best (writerBest reads through today)',`Math.round(writerBest('Cable Fly Down')*LBs)===35`);
test('Dip: BW+35 for 8s, and three sets -- the usual -- not four',`/BW \\+35 lb × 8 8 8(?! 8)/.test(txt('Dip'))&&B.notes.some(n=>/^Dip: 4 working sets written, kept to 3 — your usual\\.$/.test(n))`);
test('five exercises, 17 sets: the fifth is recommended from the record',`exs.length===5&&pwSetCount(B.rows)===17&&exs.includes('Chest Fly')&&/100 lb × 12 12 12/.test(txt('Chest Fly'))`);
test('...and Checks names it',`B.notes.some(n=>/^Chest Fly: recommended for mid chest to reach your 17 sets\\.$/.test(n))`);
test('Bench: 135 stays, four working sets after the warm-up',`/95 lb × 10/.test(txt('Barbell Bench Press'))&&/135 lb × 8 8 8 8(?! 8)/.test(txt('Barbell Bench Press'))`);
test('every exercise has three to five working sets, none under 8 reps',`B.rows.every(r=>nSets(r)>=3&&nSets(r)<=5&&work(r).every(l=>l.reps.every(n=>n>=8)))`);
test('order: bar, dip, the flies, core last',`exs.join()==='Barbell Bench Press,Dip,Cable Fly Down,Chest Fly,Hanging Leg Raise'||exs.join()==='Barbell Bench Press,Dip,Chest Fly,Cable Fly Down,Hanging Leg Raise'`);
run(`console.log(pwText(B.rows));console.log(JSON.stringify(B.notes,null,1))`);
console.log(checks+' checks');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
