// Additive woven Stats view: real records, calendar navigation, units, no writes.
const {JSDOM}=require('jsdom');
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});
w.scrollTo=()=>{};w.navigator.vibrate=()=>{};w.PointerEvent=w.MouseEvent;w.Element.prototype.setPointerCapture=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({}),set:()=>true});
w.HTMLCanvasElement.prototype.toDataURL=()=>'';
for(const [,f]of html.matchAll(/src="(js\/[^?"]+)\?v=/g)){
 let src=fs.readFileSync(path.join(dir,f),'utf8');
 if(f==='js/stats.js'&&process.env.WOVEN_MUTATION==='count')src=src.replace('by[p]=(by[p]||0)+r.reps.length','by[p]=(by[p]||0)+1');
 if(f==='js/stats.js'&&process.env.WOVEN_MUTATION==='unit')src=src.replace('su:s[7]','su:undefined');
 vm.runInContext(src,ctx,{filename:f});
}
const run=s=>vm.runInContext(s,ctx),check=(label,s)=>{assert.ok(run(s),label);console.log('PASS',label)};
try{
run(`(()=>{DB.days={};DB.settings.unit='kg';const wd=todayISO,wy=wovenShift(wd,-1);DB.days[wd]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8,8,6]},{part:'Sixpack',ex:'Plank',w:0,reps:[60,90],su:'s'},{part:'Run',ex:'Run',w:5,reps:[1],mins:30}]};DB.days[wy]={w:[]};SEED=deriveAll();SEED.sessions[wy]=[['Legs','Squat',60,[8]]];SEED.sessions[wovenShift(wd,-2)]=[['Sixpack','Plank',0,[60,90],null,null,null,'s']];WOVEN={mode:'month',end:null,selected:wd,hidden:false};})()`);
check('count sets, not rows or runs',`wovenDay(todayISO).total===5&&wovenDay(todayISO).by.Legs===3&&!wovenDay(todayISO).by.Run`);
check('explicitly emptied local record beats stale seed',`wovenDay(wovenShift(todayISO,-1)).total===0`);
check('legacy timed holds retain seconds',`wovenDay(wovenShift(todayISO,-2)).exercises[0].sets[0][4]==='s'`);
check('28 contiguous days, no future',`wovenWindow().length===28&&wovenWindow().at(-1).d===todayISO&&wovenWindow()[0].d===wovenShift(todayISO,-27)`);
check('calendar arithmetic crosses DST and leap day',`wovenShift('2024-03-09',2)==='2024-03-11'&&wovenShift('2024-03-01',-1)==='2024-02-29'`);
run(`document.getElementById('view').innerHTML=wovenSection();const beforeWoven=JSON.stringify(DB);bindWoven();`);
check('visible pounds/kg and timed hold receipt',`document.getElementById('wovenExercises').textContent.includes('60 kg')&&document.getElementById('wovenExercises').textContent.includes('1′30″')`);
check('view and receipt do not mutate the log',`JSON.stringify(DB)===beforeWoven`);
check('all selected knots display count',`[...document.querySelectorAll('.woven-day.selected .woven-number')].map(t=>t.textContent).join(',')==='3,2'`);
run(`DB.settings.unit='lb';wovenPaint(false);`);
check('receipt follows current display unit',`document.getElementById('wovenExercises').textContent.includes('lb')&&!document.getElementById('wovenExercises').textContent.includes('kg')`);
run(`document.querySelector('[data-woven-mode="week"]').click();`);
check('week mode seven days with all counts',`wovenWindow().length===7&&[...document.querySelectorAll('.woven-number')].every(t=>t.getAttribute('opacity')==='1')`);
run(`document.getElementById('wovenScrub').value=5;document.getElementById('wovenScrub').dispatchEvent(new Event('input',{bubbles:true}));`);
check('scrub selects correct blank day, not assumed rest',`WOVEN.selected===wovenShift(todayISO,-1)&&document.getElementById('wovenExercises').textContent.includes('Nothing recorded')`);
run(`document.querySelector('[data-woven-daystep="1"]').click();`);
check('next day stops at today',`WOVEN.selected===todayISO&&document.querySelector('[data-woven-daystep="1"]').disabled`);
run(`document.querySelector('[data-woven-toggle]').click();`);
check('trial can be hidden',`document.getElementById('wovenBody').hidden`);
run(`document.querySelector('[data-woven-toggle]').click();DB.days[todayISO].w.push({part:'<b>custom</b>',ex:'<img src=x onerror=alert(1)>',w:1,reps:[5]});wovenPaint();`);
check('custom names remain text',`!document.querySelector('#wovenExercises img')&&document.getElementById('wovenExercises').textContent.includes('<img')`);
run(`WOVEN.end='2026-01-02';WOVEN.selected=null;wovenPaint();`);
check('cross-year caption names both years',`document.getElementById('wovenPeriod').textContent.includes('2025')&&document.getElementById('wovenPeriod').textContent.includes('2026')`);
const stats=fs.readFileSync(path.join(dir,'js/stats.js'),'utf8');
assert.ok(stats.includes('_S.pmix + wovenSection() + _S.mc + _S.rz + _S.kpis + _S.mpace + _S.consrace'),'existing sections preserved in original order');
console.log('PASS existing Stats sections preserved');
}catch(e){console.error(e);process.exitCode=1;}finally{w.close();process.exit(process.exitCode||0)}
