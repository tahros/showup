// v4.6.213: a training day you stepped round (pushed its plan on, or marked Rest) is not picked for you when Dates opens.
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
run(`todayISO='2026-10-05';checkDate=()=>false;localStorage.setItem('showup:planner-flow','flow');save=()=>{};
DB={days:{'2026-10-03':{w:[{part:'Chest',ex:'Barbell Bench Press',w:60,reps:[8,8,8],at:1}]}},settings:{unit:'lb',onboarded:true,planningWorkspace:true,weekStart:'sunday',plannerPreferences:{avoid:[],trainDays:[1,2,3,4,5,6]}}};
migrateCanon();SEED=deriveAll();view='today';render();
var doc=()=>{const rows=pwRead('Barbell Bench Press\\n  135 lb × 8 8 8');return {...planItemsFrom(rows),raw:pwText(rows),title:'Chest'};},
 plan=ds=>{const days={};ds.forEach(d=>days[d]=doc());DB.week={from:ds[0],to:ds.at(-1),days,raw:'',at:1};DB.plan=null;},
 open=()=>{pw().dates=[];pw().active=null;pw().book={};pwOpen(null,'dates');return pw().dates.map(d=>d.slice(8)).join(' ');},
 W=['2026-10-05','2026-10-06','2026-10-07','2026-10-08','2026-10-09'];`);
test('nothing planned: Dates opens on your training days from today, Mon to Sat',`(()=>{DB.week=null;pw().skip=[];return open()==='05 06 07 08 09 10';})()`);
test('Mon to Fri planned: still Mon to Sat, today included',`(()=>{plan(W);return open()==='05 06 07 08 09 10';})()`);
run(`var res=planShift(planRunFrom('2026-10-05'),1);`);
test('push the week on a day: the plans are Tue to Sat, and Monday is noted as stepped round',`res.ok&&!pwSaved('2026-10-05')&&!!pwSaved('2026-10-10')&&pw().skip.join()==='2026-10-05'`);
test('Dates now opens on Tue to Sat: today is not picked for you',`open()==='06 07 08 09 10'`);
test('...so no day is new, and the split is not handed today',`pw().dates.every(d=>pwSaved(d)?.items?.length)&&!pw().dates.includes('2026-10-05')`);
test('Coming up on Preferences leaves it out too',`pfTrainDates([1,2,3,4,5,6])[0]==='2026-10-06'`);
test('today can still be picked by hand',`(()=>{pwRender();const c=document.querySelector('.pf-workspace [data-pw="date"][data-date="2026-10-05"]');if(!c||c.disabled)return false;c.click();return pw().dates.includes('2026-10-05');})()`);
run(`res.undo();`);
test('undo the push: Monday has its plan back, is no longer noted, and is picked again',`!!pwSaved('2026-10-05')&&!pw().skip.length&&open()==='05 06 07 08 09 10'`);
/* a push made before this version left no note: today with nothing on it and tomorrow planned reads the same */
test('no note, but today is empty and tomorrow is planned: today is left out',`(()=>{plan(['2026-10-06','2026-10-07','2026-10-08','2026-10-09','2026-10-10']);pw().skip=[];return open()==='06 07 08 09 10';})()`);
test('...but not once something is logged today',`(()=>{DB.days['2026-10-05']={w:[{part:'Chest',ex:'Dip',w:0,reps:[8],at:2}]};const r=pfSkipDay('2026-10-05');delete DB.days['2026-10-05'];return r===false&&pfSkipDay('2026-10-05')===true;})()`);
test('an empty FUTURE day before a planned one is still picked: only today is read that way',`(()=>{plan(['2026-10-05','2026-10-07']);return open()==='05 06 07 08 09 10';})()`);
/* a future day pushed on */
run(`plan(W);pw().skip=[];var r2=planShift(planRunFrom('2026-10-08'),1);`);
test('push Thursday and Friday on a day: Thursday is left out, the rest stay',`r2.ok&&pw().skip.join()==='2026-10-08'&&open()==='05 06 07 09 10'`);
test('plan Thursday yourself afterwards: it is a planned day again and is picked',`(()=>{const days={...DB.week.days,'2026-10-08':doc()};DB.week={...DB.week,days};return open()==='05 06 07 08 09 10';})()`);
/* rest */
test('a day marked Rest is left out, planned or not noted',`(()=>{DB.week=null;pw().skip=[];DB.days['2026-10-05']={w:[],rest:true};const r=open();delete DB.days['2026-10-05'];return r==='06 07 08 09 10';})()`);
test('notes for days gone by are dropped at the next push',`(()=>{plan(W);pw().skip=['2026-09-30'];planShift(planRunFrom('2026-10-09'),1);return pw().skip.join()==='2026-10-09';})()`);
console.log(checks+' checks');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
