/* test-cardio-goal.js DIR -- v4.6.369: the day's cardio goal is set by tapping.
 * The plan line stays one line of text ("Run — 3 mi · 30 min"); the pencil
 * opens an editor (activity, goal kind, steppers, picks from your history).
 * Also: the default line reads your last real cardio entry (it never could). */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined&&!c?' → '+JSON.stringify(g):''));if(!c)fails++;};
const tick=()=>new Promise(r=>setTimeout(r,0));const settle=async(n=40)=>{for(let i=0;i<n;i++)await tick();};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
(async()=>{
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext();
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('offline');};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
  await settle();
  const run=c=>vm.runInContext(c,ctx),q=s=>w.document.querySelector(s),click=async s=>{q(s).click();await settle(10);};
  run(`const days={};for(let i=1;i<=10;i++){const d=new Date(Date.UTC(2026,9,21-i)).toISOString().slice(0,10);days[d]={w:[{part:'Run',ex:'Run',w:4.828032,mins:30,secs:0,reps:[],at:1}],doneAll:1,upd:1};}
   DB={days,settings:{onboarded:true,unit:'lb',mascotMotion:'still'},plan:null,week:null,planTracking:null};todayISO='2026-10-21';checkDate=()=>false;save=()=>{};SEED=deriveAll();`);
  ok('the default cardio line is your last run, not "by feel"', run(`pfCardioLine()`)==='Run — 3 mi · 30 min', run(`pfCardioLine()`));
  ok('parse and write are one format', run(`pfCardioRaw(pfCardioParse('Run — 3.5 mi · 31 min'))`)==='Run — 3.5 mi · 31 min');
  ok('by feel round-trips', run(`pfCardioRaw(pfCardioParse('Run — by feel'))`)==='Run — by feel');
  ok('pace from distance and time', run(`pfCgPace({ex:'Run',d:3,m:30})`)==="10'00\" /mi");
  ok('a ride gives speed, not pace', run(`pfCgPace({ex:'Cycling',d:10,m:30})`)==='20 mi/h');
  ok('a row gives a 500 m split', run(`pfCgPace({ex:'Rowing',d:2000,m:8})`)==="2'00\" /500 m");
  const text="Deadlift\\n  155 lb x 4";
  run(`const {items}=planItemsFrom(parsePlan("${text}"));planSave(items,'',"${text}",todayISO);SEED=deriveAll();if(typeof pwState!=='undefined'&&pwState){pw().book={};delete pw().journey;}
   view='today';pwOpen(todayISO);pfNavigate('edit');`);await settle(20);
  run(`pwDay(pw().active).rows.unshift({kind:'note',raw:'Run — by feel',cardio:true});pwRender();`);await settle(10);
  await click('[data-pw="pf-cg-open"]');
  ok('the pencil opens the goal editor', !!q('.pf-cg'));
  ok('it opens on By feel for a by-feel line', q('.pf-cg-mode.on')?.dataset.mode==='feel');
  await click('[data-pw="pf-cg-mode"][data-mode="both"]');
  ok('Both shows a distance and a time stepper, starting from your last run', w.document.querySelectorAll('.pf-cg-stepper').length===2 && /3\s*mi/.test(q('.pf-cg-nums').textContent), q('.pf-cg-nums')?.textContent);
  ok('picks come from your history: Last, Usual, Step up', [...w.document.querySelectorAll('.pf-cg-pick span')].map(e=>e.textContent).join(',')==='Last,Usual,Step up');
  await click('[data-pw="pf-cg-step"][data-k="d"][data-dir="1"]');
  await click('[data-pw="pf-cg-step"][data-k="m"][data-dir="1"]');
  ok('steppers move a quarter mile and five minutes', /3\.25/.test(q('.pf-cg-nums').textContent)&&/35/.test(q('.pf-cg-nums').textContent), q('.pf-cg-nums').textContent);
  await click('[data-pw="pf-cg-done"]');
  ok('Done writes the one plan line', run(`pwDay(pw().active).rows[0].raw`)==='Run — 3.25 mi · 35 min', run(`pwDay(pw().active).rows[0].raw`));
  ok('the row shows the goal with its pace', /3\.25 mi · 35 min/.test(q('.pf-cardio-line').textContent)&&/\/mi/.test(q('.pf-cardio-line').textContent), q('.pf-cardio-line').textContent);
  ok('the day becomes your draft', run(`pwDay(pw().active).source`)==='Your draft');
  await click('[data-pw="pf-cg-open"]');await click('[data-pw="pf-cg-ex"][data-ex="Elliptical"]');
  ok('an activity with no distance offers no distance goal', !q('[data-pw="pf-cg-mode"][data-mode="dist"]') && q('.pf-cg-mode.on').dataset.mode==='time');
  await click('[data-pw="pf-cg-close"]');
  ok('cancel changes nothing', run(`pwDay(pw().active).rows[0].raw`)==='Run — 3.25 mi · 35 min');
  console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
