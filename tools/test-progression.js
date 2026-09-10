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
  if(m[1]==='js/progression.js'&&process.env.PG_MUTATE==='scope')source=source.replace("?12:4","?13:4");
  if(m[1]==='js/progression.js'&&process.env.PG_MUTATE==='frame')source=source.replace('frame:progressionFrame(typed','frame:progressionFrame(scope');
  if(m[1]==='js/progression.js'&&process.env.PG_MUTATE==='paging')source=source.replace("state.page+=(action==='prev-range'?1:-1)","state.page+=0");
  if(m[1]==='js/progression.js'&&process.env.PG_MUTATE==='compact')source=source.replace('plotHeight=Math.max(plotHeight,levels.reduce((sum,l)=>sum+l.h+5,0)+10);','plotHeight=900;');
  if(m[1]==='js/progression.js'&&process.env.PG_MUTATE==='collision')source=source.replace('centers.get(key)+(row-(g.nRows-1)/2)*15','trueY+(row-(g.nRows-1)/2)*15');
  if(m[1]==='js/progression.js'&&process.env.PG_MUTATE==='scrub')source=source.replace('card._pg.scope[+e.target.value]','card._pg.scope[0]');
  if(m[1]==='js/progression.js'&&process.env.PG_MUTATE==='share')source=source.replace('()=>drawProgressionCard(snapshot)','()=>null');
  if(m[1]==='js/progression.js'&&process.env.PG_MUTATE==='round')source=source.replace('String(Math.round(n))','String(n)');
  if(m[1]==='js/progression.js'&&process.env.PG_MUTATE==='labels')source=source.replace('showLabel:ticks.length%2===0','showLabel:true');
  if(m[1]==='js/progression.js'&&process.env.PG_MUTATE==='readout')source=source.replace("read.querySelector('.pg-read-date').textContent=parts.date","read.querySelector('.pg-read-date').textContent='stale'");
  if(m[1]==='js/progression.js'&&process.env.PG_MUTATE==='period')source=source.replace("first.slice(0,4)+' → '+last.slice(0,4)","first.slice(0,4)");
  if(m[1]==='js/progression.js'&&process.env.PG_MUTATE==='axis-label')source=source.replace("if(state.kind!=='load')h+=",'if(true)h+=');
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
check('four sessions are the default on mobile',`document.querySelectorAll('.pg-detail .pg-date').length===4&&progressionUI.train.mode==='numbers'`);
check('all 20 sets have numbers; none become dots',`document.querySelectorAll('.pg-detail .pg-set text').length===20&&document.querySelectorAll('.pg-detail .pg-set').length===20`);
check('best is compared at each load',`document.querySelectorAll('.pg-detail .pg-best').length===8`);
check('no best-set connecting line',`!document.querySelector('.progression-card polyline')`);
check('one readout above plot, value then date/set, no footer below controls',`(()=>{const c=document.querySelector('.progression-card'),r=c.querySelector('.pg-read');return c.querySelectorAll('.pg-read').length===1&&r.firstElementChild.className==='pg-read-value'&&r.lastElementChild.className==='pg-read-date'&&r.compareDocumentPosition(c.querySelector('.pg-scroll'))&Node.DOCUMENT_POSITION_FOLLOWING&&c.lastElementChild.className==='pg-pages'&&!r.querySelector('br');})()`);
check('all gridlines retained with half as many axis labels',`(()=>{const c=document.querySelector('.progression-card');return c.querySelectorAll('.pg-grid').length===c._pg.layout.ticks.length&&c.querySelectorAll('.pg-axis').length===Math.ceil(c._pg.layout.ticks.length/2);})()`);
check('weight label removed while readout and accessible plot retain units',`!document.querySelector('.pg-axis-unit')&&document.querySelector('.pg-read-value').textContent.includes('lb')&&document.querySelector('.pg-plot').getAttribute('aria-label').includes('Weight · lb')`);
check('period handles same day, same month, month changes and year changes',`(()=>{const cases=[[['2026-01-02'],'Jan 2','2026'],[['2026-01-02','2026-01-21'],'Jan 2 – 21','2026'],[['2026-08-21','2026-09-10'],'Aug 21 – Sep 10','2026'],[['2025-10-25','2026-01-21'],'Oct 25 – Jan 21','2025 → 2026']];return cases.every(([ds,label,years])=>{const p=progressionPeriod(ds);return p.label===label&&p.years===years;});})()`);
check('range shows centered date and year on separate fixed lines',`document.querySelector('.pg-period-main').textContent==='Aug 19 – 22'&&document.querySelector('.pg-period-year').textContent==='2026'`);
check('weights round only in presentation in both units and every load kind',`(()=>{const before=JSON.stringify(DB);for(const unit of ['lb','kg']){DB.settings.unit=unit;for(const kind of ['load','added','assisted','time']){const r={d:'2026-09-10',ordinal:2,load:kind==='assisted'?-70:70,count:kind==='time'?60:8,kind};const text=progressionRead(r);if(!text.includes(Math.round(toU(70))+' '+U())||/\\d+\\.\\d+ (?:lb|kg)/.test(text)||Math.abs(r.load)!==70)return false;}}DB.settings.unit='lb';return before===JSON.stringify(DB);})()`);
const css=fs.readFileSync(path.join(dir,'css/app.css'),'utf8');
assert.match(css,/\.pg-set text\{font:400 11px/,'rep glyphs use regular weight');
assert.match(css,/\.pg-set\.pg-best text\{font-weight:400/,'best stays blue, not bold');
assert.ok(!/\.pg-read\{[^}]*border-top/.test(css),'no orphan receipt divider');
const navCSS=process.env.PG_MUTATE==='anchors'?css.replace('grid-template-columns:44px minmax(0,1fr) 44px','grid-template-columns:auto auto auto'):css;
assert.match(navCSS,/\.pg-range-nav\{[^}]*grid-template-columns:44px minmax\(0,1fr\) 44px/,'arrow columns fixed independently of date length');
assert.match(navCSS,/\.pg-range-nav button\{[^}]*width:44px;height:44px[^}]*border-radius:50%[^}]*border:1px solid[^}]*background:var\(--surface2\)/,'visible circular 44px buttons');
check('share reuses the existing icon',`(()=>{const t=document.createElement('template');t.innerHTML=ICO_SHARE;return document.querySelector('.pg-share svg').isEqualNode(t.content.firstChild);})()`);
run(`document.querySelector('[data-pg-action="dots"]').click()`);
check('dot mode includes the latest 12 sessions and all their sets',`document.querySelectorAll('.pg-dots .pg-set').length===60&&document.querySelector('.progression-card')._pg.dates.length===12&&document.querySelector('.progression-card')._pg.dates[0]==='2026-08-11'`);
check('dot mode is all dots, with no numeric set glyphs',`document.querySelectorAll('.pg-dots .pg-set text').length===0`);
check('latest range disables forward navigation only',`document.querySelector('[data-pg-action="next-range"]').disabled&&!document.querySelector('[data-pg-action="prev-range"]').disabled`);
run(`window.pgFrame=JSON.stringify(document.querySelector('.progression-card')._pg.layout.ticks);window.pgHeight=document.querySelector('.progression-card')._pg.layout.height;document.querySelector('[data-pg-action="prev-range"]').click();`);
check('previous range crosses year without skipping or overlapping sessions',`document.querySelector('.progression-card')._pg.dates.length===11&&document.querySelector('.progression-card')._pg.dates[0]==='2025-12-01'&&document.querySelector('.progression-card')._pg.dates.at(-1)==='2026-08-10'&&document.querySelectorAll('.pg-dots .pg-set').length===51`);
check('oldest partial range retains the frame and reverses arrow availability',`document.querySelector('.progression-card')._pg.layout.height===pgHeight&&JSON.stringify(document.querySelector('.progression-card')._pg.layout.ticks)===pgFrame&&document.querySelector('[data-pg-action="prev-range"]').disabled&&!document.querySelector('[data-pg-action="next-range"]').disabled&&document.querySelector('.pg-available').textContent.includes('11 sessions')`);
check('no calendar or date dropdown remains',`!document.querySelector('[data-pg-action="year-select"],[data-pg-action="date"],.pg-year')&&document.querySelector('.pg-period-year').textContent==='2025 → 2026'`);
run(`(()=>{const r=document.querySelector('.pg-scrubber');r.value='0';r.dispatchEvent(new Event('input',{bubbles:true}));})()`);
check('scrubber selects first set without moving chart extent',`document.querySelectorAll('.pg-dots .pg-set').length===51&&document.querySelector('.pg-read').textContent.includes('135 lb × 10')&&progressionUI.train.pick==='2025-12-01:1'`);
check('dot readout date and ordinal update with exact selected set',`document.querySelector('.pg-read-date').textContent==='Mon, Dec 1 · Set 1'&&document.querySelector('.pg-read-value').textContent==='135 lb × 10'`);
run(`document.querySelector('[data-pg-action="next-range"]').click();`);
check('forward arrow restores latest range',`document.querySelector('.progression-card')._pg.dates[0]==='2026-08-11'&&document.querySelector('[data-pg-action="next-range"]').disabled`);
run(`for(let i=1;i<=30;i++)DB.days['2026-06-'+String(i).padStart(2,'0')]={w:[{ex:'Incline Barbell Bench Press',part:'Chest',w:toKg(135),reps:[10,9]}]};renderProgression(document.querySelector('.progression-card'));`);
check('dot scope truly caps at 12 sessions, retaining every set',`document.querySelector('.progression-card')._pg.dates.length===12&&document.querySelector('.progression-card')._pg.dates[0]==='2026-08-11'&&document.querySelectorAll('.pg-dots .pg-set').length===60`);
check('paging visits all 53 dates exactly once at a fixed height and scale',`(()=>{const c=document.querySelector('.progression-card'),frame=JSON.stringify(c._pg.layout.ticks),height=c._pg.layout.height,dates=[];let sets=0;do{dates.push(...c._pg.dates);sets+=c._pg.scope.length;if(JSON.stringify(c._pg.layout.ticks)!==frame||c._pg.layout.height!==height)return false;if(c.querySelector('[data-pg-action="prev-range"]').disabled)break;c.querySelector('[data-pg-action="prev-range"]').click();}while(true);return dates.length===53&&new Set(dates).size===53&&sets===171;})()`);
run(`document.querySelector('[data-pg-action="numbers"]').click()`);
check('number mode restores exactly four latest dates',`document.querySelectorAll('.pg-detail .pg-date').length===4&&document.querySelector('.progression-card')._pg.dates[0]==='2026-08-19'`);
check('all numeric pages retain one height, scale and four-column spacing',`(()=>{const c=document.querySelector('.progression-card'),signature=()=>JSON.stringify([c._pg.layout.height,c._pg.layout.col,c._pg.layout.ticks]),frame=signature(),dates=[];do{dates.push(...c._pg.dates);if(signature()!==frame||c.querySelectorAll('.pg-set text').length!==c._pg.scope.length)return false;if(c.querySelector('[data-pg-action="prev-range"]').disabled)break;c.querySelector('[data-pg-action="prev-range"]').click();}while(true);c.querySelector('[data-pg-action="numbers"]').click();return dates.length===53&&new Set(dates).size===53&&signature()===frame;})()`);
run(`(()=>{const r=document.querySelector('.pg-scrubber');r.value='5';r.dispatchEvent(new Event('input',{bubbles:true}));})()`);
check('scrubber moves to the requested set and updates numeric selection',`progressionUI.train.pick==='2026-08-20:1'&&document.querySelector('.pg-scrubber').value==='5'&&document.querySelectorAll('.pg-detail .pick').length===1`);
check('dense session wraps numbers instead of hiding sets or widening plot',`(()=>{const records=Array.from({length:13},(_,i)=>({d:'2026-09-01',id:'x'+i,load:70,count:10,kind:'load'}));const m=progressionLayout(records,'load',{dates:['2026-09-01','2026-09-02','2026-09-03','2026-09-04'],width:240});return m.width===240&&m.points.length===13&&m.points.every(p=>p.x>=m.left&&p.x<=m.width-m.right);})()`);
check('nearby historic weights cannot elongate the plot in either unit',`(()=>{for(const unit of ['lb','kg']){DB.settings.unit=unit;const records=[20,60,60.01,60.5,100,130].flatMap((load,j)=>Array.from({length:4},(_,i)=>({d:'2026-09-01',id:j+':'+i,load,count:8,kind:'load'})));for(const width of [240,329,680]){const f=progressionFrame(records,'load',width,4);if(f.plotHeight>220)return false;const m=progressionLayout(records,'load',{dates:['2026-09-01'],width,columns:4,frame:f});if(m.points.length!==24||!m.points.every(p=>p.y>=m.top+7&&p.y<=m.bottom-7))return false;}}DB.settings.unit='lb';return true;})()`);
check('close numeric labels stay separate with truthful load anchors',`(()=>{const records=[60,60.01,60.5].flatMap((load,j)=>Array.from({length:4},(_,i)=>({d:'2026-09-01',id:j+':'+i,load,count:8,kind:'load'})));const frame=progressionFrame(records,'load',240,4),m=progressionLayout(records,'load',{dates:['2026-09-01'],width:240,columns:4,frame});return m.points.some(p=>p.leader)&&m.points.every((p,i)=>Math.abs(p.trueY-(m.bottom-(progressionValue(p.r)-frame.lo)/(frame.hi-frame.lo)*(m.bottom-m.top)))<.001&&m.points.slice(i+1).every(q=>Math.abs(p.y-q.y)>=14||Math.abs(p.x-q.x)>=(p.labelWidth+q.labelWidth)/2));})()`);
check('long elapsed-time labels do not overlap within a session',`(()=>{const records=Array.from({length:4},(_,i)=>({d:'2026-09-01',id:'run'+i,load:5,count:1,seconds:1800,kind:'run'}));const m=progressionLayout(records,'run',{dates:['2026-09-01','2026-09-02','2026-09-03','2026-09-04'],width:800});return m.points.every((p,i)=>m.points.slice(i+1).every(q=>Math.abs(p.y-q.y)>=14||Math.abs(p.x-q.x)>=(p.labelWidth+q.labelWidth)/2));})()`);
run(`window.pgShareCalls=[];window.pgOriginalContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:s=>({width:String(s).length*6})},{get:(o,k)=>k in o?o[k]:(...args)=>pgShareCalls.push([k,...args])});};window.pgSavedShow=showCard;showCard=(fn,label)=>{window.pgShared={cv:fn(),label};};document.querySelector('.pg-share').click();`);
check('share generates a real high-resolution card using selected range',`pgShared.cv.width===1080&&pgShared.cv.height>500&&pgShared.label.endsWith('4-sessions-2026-08-19-2026-08-22')&&pgShareCalls.some(c=>c[0]==='fillText'&&c[1]==='4 Sessions')`);
check('export draws every actual rep number, no invented pair',`pgShareCalls.filter(c=>c[0]==='fillText'&&['10','9','8','5','4'].includes(c[1])).length===20`);
check('weight label absent from exported image too',`!pgShareCalls.some(c=>c[0]==='fillText'&&c[1]==='Weight · lb')`);
check('export has a single value/date readout above first plot gridline',`(()=>{const value=pgShareCalls.filter(c=>c[0]==='fillText'&&c[1]==='155 lb × 10'),date=pgShareCalls.filter(c=>c[0]==='fillText'&&c[1]==='Thu, Aug 20 · Set 1');return value.length===1&&date.length===1&&value[0][3]<date[0][3]&&date[0][3]<pgShareCalls.find(c=>c[0]==='translate')[2];})()`);
run(`document.querySelector('[data-pg-action="prev-range"]').click();pgShareCalls=[];document.querySelector('.pg-share').click();`);
check('share exports the older displayed period, never labels it Last',`pgShared.label.endsWith('4-sessions-2026-08-15-2026-08-18')&&pgShareCalls.some(c=>c[0]==='fillText'&&c[1]==='showup · 2026-08-15 — 2026-08-18')&&!pgShareCalls.some(c=>c[0]==='fillText'&&String(c[1]).startsWith('Last '))`);
run(`document.querySelector('[data-pg-action="next-range"]').click();`);
run(`showCard=pgSavedShow;HTMLCanvasElement.prototype.getContext=pgOriginalContext;window.pgBeforeHold=progressionUI.train.pick;`);

// The touch protocol is exercised, including the 2D choice between loads.
w.SVGElement.prototype.getBoundingClientRect=function(){const v=this.getAttribute('viewBox')?.split(' ').map(Number)||[0,0,329,254];return {left:0,top:0,width:v[2],height:v[3]};};
const touch=(type,x,y)=>run(`(()=>{const e=new Event('${type}',{bubbles:true,cancelable:true});e.touches=[{clientX:${x},clientY:${y}}];document.querySelector('[data-pg-surface="detail"]').dispatchEvent(e);})()`);
const xy=run(`(()=>{const g=document.querySelector('.pg-detail .pg-set');return [+g.dataset.x,+g.dataset.y]})()`);
touch('touchstart',xy[0],xy[1]);touch('touchmove',xy[0],xy[1]+30);
run(`document.querySelector('[data-pg-surface="detail"]')._pgArm()`);
check('scroll before hold cancels scrubbing',`progressionUI.train.pick===pgBeforeHold`);
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
