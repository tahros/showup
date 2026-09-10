/* Run with node tools/test-progression.js DIR. No network or real user data. */
const {JSDOM}=require('jsdom');
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const dir=process.argv[2]||'.';
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(new Error('offline'));w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})});};
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g)){
  let source=fs.readFileSync(path.join(dir,m[1]),'utf8');
  // Deliberate mutations must be killed by these assertions.
  if(m[1]==='js/progression.js'&&process.env.PG_MUTATE==='precedence')source=source.replace('Array.isArray(local[d]?.w)','false');
  if(m[1]==='js/progression.js'&&process.env.PG_MUTATE==='unit')source=source.replace("r.kind==='run'?toD(r.load)","r.kind==='run'?r.load");
  if(m[1]==='js/progression.js'&&process.env.PG_MUTATE==='count')source=source.replace('vals.forEach(raw=>','vals.slice(0,1).forEach(raw=>');
  vm.runInContext(source,ctx,{filename:m[1]});
}
const run=c=>vm.runInContext(c,ctx);
const check=(name,c)=>{assert.ok(run(c),name);console.log('PASS '+name);};
run(`todayISO='2026-09-10';DB.days={};DB.settings.unit='lb';DB.settings.onboarded=true;
  SEED.sessions={
    '2026-01-01':[['Legs','Squat',50,[20,10],null,null,null]],
    '2026-01-02':[['Legs','Squat',100,[3,2]]],
    '2026-01-03':[['Legs','Squat',999,[99]]]
  };
  DB.days['2026-01-03']={w:[]};
  DB.days['2026-01-02']={w:[{part:'Legs',ex:'Squat',w:90,reps:[8,7,6]}]};
  DB.days['2026-09-11']={w:[{part:'Legs',ex:'Squat',w:999,reps:[99]}]};
  DB.days['invalid']={w:[{ex:'Squat',w:100,reps:[8]}]};
  DB.days['2026-02-30']={w:[{ex:'Squat',w:100,reps:[8]}]};
  DB.days['2026-09-10']={w:[],plan:{ex:'Squat',w:999,reps:[99]}};`);
check('local rows override seed, including explicit deletion',`progressionData('Squat').records.length===5`);
check('every real set keeps its own weight and reps',`progressionData('Squat').records.filter(r=>r.load===90).map(r=>r.count).join(',')==='8,7,6'`);
check('no invented high-load/high-rep pair',`!progressionData('Squat').records.some(r=>r.load===90&&r.count===20)`);
check('read-only extraction leaves DB byte-identical',`(()=>{const before=JSON.stringify(DB);progressionData('Squat');return before===JSON.stringify(DB);})()`);
run(`DB.days['2026-09-08']={w:[
  {ex:'Hanging Leg Raise',w:0,reps:[12,10,10]},
  {ex:'Dip',w:toKg(45),reps:[10,8]},
  {ex:'Pull Up',w:-20,reps:[8,6]},
  {ex:'Plank',w:0,reps:[60,90],su:'s'},
  {ex:'Cable Crunch',w:null,reps:[12,10]},
  {ex:'Push Up',w:0,reps:['failure',null,8]},
  {ex:'Run',w:5,reps:[1],mins:28,secs:30}
]};DB.days['2026-09-09']={w:[{ex:'Run',w:2,reps:[1]},{ex:'Dip',w:0,reps:[12]}]};`);
check('bodyweight is reps, not zero-weight progress',`progressionData('Hanging Leg Raise').records.every(r=>r.kind==='body')`);
check('added load and bodyweight remain separate modes',`progressionData('Dip').records.map(r=>r.kind).join(',')==='added,added,body'`);
check('assistance is labelled, never negative bodyweight',`progressionData('Pull Up').records.every(r=>r.kind==='assisted'&&progressionRead(r).includes('assistance'))`);
check('holds preserve seconds and do not become reps',`progressionData('Plank').records[1].kind==='time'&&progressionRead(progressionData('Plank').records[1]).includes('1:30')`);
check('unknown load remains unknown',`progressionData('Cable Crunch').records.every(r=>r.kind==='unknown')`);
check('failure and missing reps unplotted; ordinal preserved',`progressionData('Push Up').omitted.length===2&&progressionData('Push Up').records[0].ordinal===3`);
check('mile positions and readout use the same conversion',`Math.abs(progressionValue(progressionData('Run').records[0])-toD(5))<.0001&&progressionRead(progressionData('Run').records[0]).includes(toD(5).toFixed(2)+' mi')`);
check('missing run time stays missing, with no fake pace',`progressionRead(progressionData('Run').records[1]).includes('time not recorded')`);
run(`DB.settings.unit='kg'`);
check('kilometre positions and readouts agree',`progressionValue(progressionData('Run').records[0])===5&&progressionRead(progressionData('Run').records[0]).includes('5.00 km')`);
run(`DB.settings.unit='lb';for(let i=1;i<=22;i++){const d='2026-08-'+String(i).padStart(2,'0');DB.days[d]={w:[{ex:'Incline Barbell Bench Press',part:'Chest',w:toKg(155),reps:[10,9,8]},{ex:'Incline Barbell Bench Press',part:'Chest',w:toKg(175),reps:[5,4]}]};}
  DB.days['2025-12-01']={w:[{ex:'Incline Barbell Bench Press',part:'Chest',w:toKg(135),reps:[10]}]};
  Object.defineProperty(window,'innerWidth',{value:393,configurable:true});
  document.getElementById('view').innerHTML=progressionSection('Incline Barbell Bench Press','train');bindProgression();`);
check('three dates fit on mobile',`document.querySelectorAll('.pg-detail .pg-date').length===3`);
check('every set drawn, not just best sets',`document.querySelectorAll('.pg-detail .pg-set').length===15`);
check('winning reps compared at same load; no global rep maximum',`document.querySelectorAll('.pg-detail .pg-best').length===6`);
check('neutral numeric circles with no connecting best-set line',`document.querySelectorAll('.pg-detail .pg-set circle').length===15&&!document.querySelector('.progression-card polyline')`);
run(`document.querySelector('[data-pg-action="year"]').click()`);
check('annual includes all 110 sets, not last fourteen sessions',`document.querySelectorAll('.pg-year .pg-set').length===110`);
check('annual retains full twelve-month context',`document.querySelectorAll('.pg-year .pg-axis').length>=12&&document.querySelector('.pg-year').textContent.includes('JFMAMJJASOND')`);
check('future shaded, no fabricated points',`!!document.querySelector('.pg-future')&&[...document.querySelectorAll('.pg-year .pg-set')].every(g=>g.dataset.pgRecord.startsWith('2026-08'))`);
run(`(()=>{const s=document.querySelector('[data-pg-action="date"]');s.value='2026-08-06';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
check('annual date picker reveals exact session detail',`document.querySelector('.pg-detail').textContent.includes('8/6')&&progressionUI.train.focus==='2026-08-06'`);
run(`(()=>{const s=document.querySelector('[data-pg-action="year-select"]');s.value='2025';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
check('year selector changes data, not just a caption',`document.querySelectorAll('.pg-year .pg-set').length===1&&document.querySelector('.pg-detail').textContent.includes('12/1')`);
run(`document.querySelector('[data-pg-action="recent"]').click()`);

// The touch protocol is exercised, including the 2D choice between loads.
w.SVGElement.prototype.getBoundingClientRect=function(){const v=this.getAttribute('viewBox')?.split(' ').map(Number)||[0,0,329,254];return {left:0,top:0,width:v[2],height:v[3]};};
const touch=(type,x,y)=>run(`(()=>{const e=new Event('${type}',{bubbles:true,cancelable:true});e.touches=[{clientX:${x},clientY:${y}}];document.querySelector('[data-pg-surface="detail"]').dispatchEvent(e);})()`);
const xy=run(`(()=>{const g=document.querySelector('.pg-detail .pg-set');return [+g.dataset.x,+g.dataset.y]})()`);
touch('touchstart',xy[0],xy[1]);touch('touchmove',xy[0],xy[1]+30);
run(`document.querySelector('[data-pg-surface="detail"]')._pgArm()`);
check('scroll before hold cancels scrubbing',`!document.querySelector('.pg-detail .pick')`);
touch('touchend',xy[0],xy[1]+30);touch('touchstart',xy[0],xy[1]);
run(`document.querySelector('[data-pg-surface="detail"]')._pgArm()`);
check('hold reads a real set and marks it',`document.querySelectorAll('.pg-detail .pick').length===1&&document.querySelector('.pg-read').textContent.includes('155 lb × 10')`);
touch('touchend',xy[0],xy[1]);
run(`(()=>{const g=[...document.querySelectorAll('.pg-detail .pg-set')].find(g=>g.textContent.includes('175 lb'));g.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));})()`);
check('keyboard opens exact other load/rep pair',`document.querySelector('.pg-read').textContent.includes('175 lb × 5')`);
run(`DB.days[todayISO]={w:[{ex:'Dip',part:'Chest',w:0,reps:[8]}]};liftWhere={ex:'Dip',part:'Chest',d:todayISO};`);
check('live card appears for current exercise',`progressionLiveSection().includes('data-pg-ex="Dip"')`);
run(`DB.days[todayISO].doneAll=true`);
check('completion removes live duplicate but preserves permanent Stats',`progressionLiveSection()===''&&progressionStatsSection().includes('data-pg-picker="1"')`);
run(`document.getElementById('view').innerHTML=progressionSection('<img src=x onerror=1>','train');bindProgression()`);
check('unknown/empty exercises safe and honest',`!document.querySelector('.progression-card img')&&document.querySelector('.pg-empty')`);
console.log('PROGRESSION PASS');process.exit(0);
