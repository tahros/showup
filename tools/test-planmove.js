// A planned week can move. Real storage and real plan shapes; no mock routines.
// v4.6.101: planShift is the one operation behind both doors (Push on Today,
// Move in the Dates step). What it must never do is worth more than what it
// does: a day with logged sets is frozen, nothing lands in the past or on a
// logged day, and undo puts back exactly what was there -- including a saved
// plan the move replaced, which no inverse shift could ever recover.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);let fails=0,checks=0;
const ok=(name,expr,note)=>{checks++;let good;try{good=typeof expr==='string'?run(expr):expr;}catch(e){good=false;console.log(e.stack);}
  console.log(`${good?'PASS':'FAIL'} ${name}`+(good||note===undefined?'':' → '+run(note)));if(!good)fails++;};

/* Tue-Fri planned, the maker's actual shape: four saved days in a row. */
const fixture=()=>run(String.raw`(function(){
  todayISO='2026-09-22';checkDate=()=>false;
  DB={days:{},settings:{unit:'lb',onboarded:true},week:null,plan:null};
  const P={'2026-09-22':'Bent-Over Row\n  185 lb x 8 8 8 8','2026-09-23':'Barbell Bench Press\n  185 lb x 8 8 8',
           '2026-09-24':'Squat\n  225 lb x 5 5 5','2026-09-25':'Barbell Curl\n  65 lb x 10 10'};
  const days={};for(const [d,t] of Object.entries(P))days[d]={...planItemsFrom(pwRead(t)),raw:t,title:''};
  DB.week={from:'2026-09-22',to:'2026-09-25',days,raw:'',at:1};
  SEED=deriveAll();pwState=null;pwOwner=null;localStorage.removeItem(pwKey());
  pw().dates=Object.keys(P);pw().active='2026-09-22';return Object.keys(DB.week.days).sort().join(',');})()`);
const week=()=>run(`Object.keys(DB.week?.days||{}).sort().join(',')`);
const first=()=>run(`pwSaved(Object.keys(DB.week.days).sort()[0]).items[0].ex`);

fixture();
ok('(fixture) four planned days, Tue to Fri',week()==='2026-09-22,2026-09-23,2026-09-24,2026-09-25',`Object.keys(DB.week.days).sort().join(',')`);

/* ---- the refusals, which matter more than the move ---- */
run(`DB.days['2026-09-22']={w:[{ex:'Bent-Over Row',part:'Back',w:84,reps:[8],at:1}],upd:1};SEED=deriveAll();`);
ok('a day with logged sets does not move',`planShiftable(pfDates?pw().dates:pw().dates,1).reason==='logged'`);
ok('...and planShift refuses it too, changing nothing',
   run(`(function(){const b=Object.keys(DB.week.days).sort().join(',');planShift(pw().dates,1);return Object.keys(DB.week.days).sort().join(',')===b;})()`));
run(`DB.days={};SEED=deriveAll();`);
run(`DB.days['2026-09-26']={w:[{ex:'Run',part:'Run',w:5,reps:[],at:1}],upd:1};SEED=deriveAll();`);
ok('nothing lands on a day with logged sets',`planShiftable(pw().dates,1).reason==='landsOnLogged'`);
run(`DB.days={};SEED=deriveAll();`);
ok('nothing lands in the past',`planShiftable(pw().dates,-1).reason==='past'`);
ok('a move of zero days is not a move',`planShiftable(pw().dates,0).reason==='still'`);
ok('days with no plan are not moved',`planShiftable(['2026-09-29'],1).reason==='nothing'`);

/* ---- the move itself ---- */
ok('pushing the week by a day lands Tue on Wed and Fri on Sat',
   run(String.raw`(function(){const r=planShift(pw().dates,1);
     return r.ok&&Object.keys(DB.week.days).sort().join(',')==='2026-09-23,2026-09-24,2026-09-25,2026-09-26';})()`),
   `Object.keys(DB.week.days).sort().join(',')`);
ok('...and every plan keeps its own contents through the overlap',
   `pwSaved('2026-09-23').items[0].ex==='Bent-Over Row'&&pwSaved('2026-09-26').items[0].ex==='Barbell Curl'`,
   `pwSaved('2026-09-23').items[0].ex+' / '+pwSaved('2026-09-26').items[0].ex`);
ok('...and the selection follows the plans',`pw().dates.join(',')==='2026-09-23,2026-09-24,2026-09-25,2026-09-26'`);

/* ---- undo ---- */
fixture();
ok('undo puts the week back exactly',
   run(String.raw`(function(){const before=JSON.stringify(DB.week.days);const r=planShift(pw().dates,3);
     r.undo();return JSON.stringify(DB.week.days)===before;})()`));

/* ---- the thing an inverse shift could never undo ---- */
fixture();
run(`DB.week.days['2026-09-26']={...planItemsFrom(pwRead('Deadlift\\n  315 lb x 5 5 5')),raw:'',title:''};SEED=deriveAll();`);
ok('a saved plan in the way is reported before it is replaced',
   `planShiftable(['2026-09-25'],1).replaces.join(',')==='2026-09-26'`);
ok('...and undo brings that replaced plan back',
   run(String.raw`(function(){const r=planShift(['2026-09-25'],1);
     const gone=pwSaved('2026-09-26').items[0].ex==='Barbell Curl';r.undo();
     return gone&&pwSaved('2026-09-26').items[0].ex==='Deadlift';})()`),
   `pwSaved('2026-09-26').items[0].ex`);

/* ---- DB.plan is a second copy of one day and must not go stale ---- */
fixture();
run(`planSave(pwSaved('2026-09-22').items,'','','2026-09-22');`);
ok("today's own plan travels with its day",
   run(String.raw`(function(){planShift(['2026-09-22'],1);return DB.plan&&DB.plan.d==='2026-09-23'&&pwSaved('2026-09-23').items[0].ex==='Bent-Over Row';})()`),
   `JSON.stringify(DB.plan&&DB.plan.d)`);
fixture();
run(`planSave(pwSaved('2026-09-23').items,'','','2026-09-23');`);
ok('...and a plan that gets landed on takes what landed, never its old self',
   run(String.raw`(function(){planShift(['2026-09-22'],1);return DB.plan.d==='2026-09-23'&&pwSaved('2026-09-23').items[0].ex==='Bent-Over Row';})()`),
   `pwSaved('2026-09-23').items[0].ex`);

/* ---- drafts ride with their day ---- */
fixture();
run(`pwDay('2026-09-24').rows=pwRead('Front Squat\\n  135 lb x 5');pwDay('2026-09-24').source='Your draft';`);
ok('an unsaved draft moves with the day it belongs to',
   run(String.raw`(function(){planShift(['2026-09-24'],2);const b=pw().book['2026-09-26'];
     return !!b&&b.rows[0].ex==='Front Squat'&&!pw().book['2026-09-24'];})()`));
/* the case the single pass gets wrong: a draft sits on the day being landed
   ON as well as the day moving. Written in one pass, the arriving draft is
   overwritten by the one already there and the maker's edits vanish. */
fixture();
run(`pwDay('2026-09-24').rows=pwRead('Front Squat\\n  135 lb x 5');pwDay('2026-09-24').source='Your draft';
     pwDay('2026-09-26').rows=pwRead('Deadlift\\n  315 lb x 3');pwDay('2026-09-26').source='Your draft';`);
ok('...and it displaces a draft already sitting where it lands',
   run(String.raw`(function(){planShift(['2026-09-24'],2);const b=pw().book['2026-09-26'];
     return !!b&&b.rows[0].ex==='Front Squat';})()`),
   `pw().book['2026-09-26'].rows[0].ex`);
fixture();
run(`pwDay('2026-09-26').rows=pwRead('Deadlift\\n  315 lb x 3');pwDay('2026-09-26').source='Your draft';`);
ok('...while a day landed on with nothing to bring loses its stale draft',
   run(String.raw`(function(){planShift(['2026-09-25'],1);return !pw().book['2026-09-26'];})()`));

/* ---- the run Push moves ---- */
fixture();
run(`DB.week.days['2026-09-29']={...planItemsFrom(pwRead('Lat Pulldown\\n  120 lb x 10')),raw:'',title:''};SEED=deriveAll();`);
ok('Push moves the unbroken run from today, not everything ahead of it',
   `planRunFrom(todayISO).join(',')==='2026-09-22,2026-09-23,2026-09-24,2026-09-25'`,
   `planRunFrom(todayISO).join(',')`);
ok('...so a plan beyond the gap stays where it is',
   run(String.raw`(function(){planShift(planRunFrom(todayISO),1);return !!pwSaved('2026-09-29');})()`));

console.log(`${checks-fails}/${checks} plan-move assertions passed`);
process.exit(fails?1:0);
