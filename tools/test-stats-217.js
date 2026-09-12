// test-stats-217.js — v4.4.0 page-story and historical-comparison contract.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(new Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({}),set:()=>true});};
for(const s of order)vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));const run=c=>vm.runInContext(c,ctx);let fail=0;
function ok(name,value,detail=''){console.log(value?'PASS':'FAIL',name,detail);if(!value)fail++;}
run(`(function(){DB.days={};const md=todayISO.slice(5);for(const y of [2024,2025,2026]){const d=y+'-'+md;DB.days[d]={w:[{part:'Legs',ex:'Squat',w:80,reps:[8,8],at:1},{part:'Run',ex:'Run',w:3,mins:27,secs:0,at:2}],upd:1,doneAll:y===2026};}SEED=deriveAll();view='stats';render();})()`);
const titles=run(`[...document.querySelectorAll('#view h2')].map(h=>h.firstChild.textContent.trim())`);
const ordered=['Workout complete','Your work adds up','This week','Your strength progress','You keep showing up','Year over year','Your running story','Run by run','Distance over time','Pace over time','Your data'];
ok('Stats tells the approved story in order',ordered.every((t,i)=>titles.indexOf(t)>(i?titles.indexOf(ordered[i-1]):-1)),titles.join(' / '));
ok('retired summaries stay absent',!titles.some(t=>/Woven|growing|Monthly pace|Every week|^Weight$/i.test(t)));
ok('Workout complete retains Share',run(`!!document.querySelector('.plate-card .stats-share')`));
ok('Progression retains Share',run(`!!document.querySelector('.progression-card .stats-share')`));
ok('year and distance comparisons each expose years',run(`document.querySelectorAll('.v4-years').length===2`));
ok('recorded prior years are selectable',run(`[...document.querySelectorAll('.v4-years input[value="2024"]')].length===2&&[...document.querySelectorAll('.v4-years input[value="2024"]')].every(x=>!x.disabled)`));
ok('both historical comparisons retain scrubbers',run(`document.querySelectorAll('.conrace>input[type="range"]').length===2`));
ok('current comparison lines use signature blue',run(`[...document.querySelectorAll('.v4-line[data-yr="2026"]')].every(x=>x.getAttribute('stroke')==='var(--accent)')`));
ok('running distance and pace use signature blue',run(`document.querySelector('.drcard .drline').getAttribute('stroke')==='var(--accent)'&&document.querySelector('.pacecard polyline').getAttribute('stroke')==='var(--accent)'`));
ok('pace labels stay restrained',run(`[...document.querySelectorAll('.paceval')].every(x=>x.getAttribute('font-size')==='6.5')`));
ok('personal Weight is absent from Stats',run(`!document.getElementById('secWeight')`));
run(`view='sync';render();`);
ok('personal Weight and its history live in Settings',run(`!!document.getElementById('secWeight')`));
process.exit(fail?1:0);
