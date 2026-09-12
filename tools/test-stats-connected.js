// Production script order: selected-day sharing and multi-year pinned comparisons.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(new Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({}),set:()=>true});};
w.Element.prototype.setPointerCapture=function(id){this._capture=id;};w.Element.prototype.hasPointerCapture=function(id){return this._capture===id;};w.Element.prototype.releasePointerCapture=function(){this._capture=null;};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=c=>vm.runInContext(c,ctx),check=(name,code)=>{assert.ok(run(code),name);console.log('PASS '+name);};
run(`todayISO='2026-09-11';checkDate=()=>false;DB.settings.name='Preserve Me';DB.settings.sex='F';DB.settings.unit='lb';DB.days={};for(const y of [2024,2025,2026]){for(const md of ['01-03','02-10','09-11'])DB.days[y+'-'+md]={w:[{part:'Legs',ex:'Squat',w:y-1950,reps:[8,8]},{part:'Chest',ex:'Incline Barbell Bench Press',w:60,reps:[10]},{part:'Run',ex:'Run',w:5,mins:30,reps:[1]}],doneAll:true};}SEED=deriveAll();view='stats';render();window.savedDB=JSON.stringify(DB);`);
check('one card combines the selected workout and its selectable history',`!!document.querySelector('.work-combined .plate-canvas')&&!!document.querySelector('.work-combined #pmixWrap')`);
check('history text has native compact geometry, not a squeezed SVG',`/* v4.5.3: the height was a literal and is derived now. What this guard
   protects is that the text is NATIVE size rather than scaled by a squeezed
   viewBox, so it checks viewBox height === height (no squeeze) instead of
   naming a number the geometry is free to change. */
(function(){const v=document.querySelector('#pmixWrap svg');
  return !!v && v.getAttribute('viewBox').split(/\\s+/)[3]===v.getAttribute('height');})()&&document.querySelector('#pmixWrap svg').getAttribute('preserveAspectRatio')==='xMinYMin meet'&&[...document.querySelectorAll('.work-history svg text')].every(t=>t.getAttribute('font-size')==='10'||t.hasAttribute('data-yrmark'))   /* both axes share one compact native size; year markers remain deliberately smaller */`);
run(`document.querySelector('#pmixWrap').scrollLeft=0;document.querySelector('#pmixWrap').dispatchEvent(new Event('scroll'));`);
check('sticky period header names the leftmost year and full month',`document.querySelector('.work-periods').textContent.includes('2024')&&document.querySelector('.work-periods').textContent.includes('Jan')   /* v4.5.3: months are three letters now */`);
check('two comparisons start with two selected years and visible markers',`document.querySelectorAll('.comparison-plot circle.comparison-marker').length===4`);
check('only recorded years are offered',`document.querySelectorAll('[data-add="2024"]').length===2&&!document.querySelector('[data-add="2023"]')`);
run(`const slider=document.querySelector('.comparison-scrub');slider.value=40;slider.dispatchEvent(new Event('input',{bubbles:true}));window.pinnedDate=document.querySelector('.comparison-date').textContent;window.oldSlider=slider;`);
check('scrubbing reads same-date counts for both years',`[...document.querySelectorAll('.comparison-card:not(.runrace) .comparison-values strong')].every(e=>e.textContent.trim()==='2 days')`);
run(`document.querySelector('.comparison-years [data-add="2024"]').click()`);
check('adding a year keeps date, slider and all three visible points',`document.querySelector('.comparison-scrub')===window.oldSlider&&document.querySelector('.comparison-date').textContent===window.pinnedDate&&document.querySelectorAll('.comparison-card:not(.runrace) circle.comparison-marker').length===3`);
check('coincident points use distinct rings, so no year hides another',`new Set([...document.querySelectorAll('.comparison-card:not(.runrace) circle.comparison-marker')].map(e=>e.getAttribute('r'))).size===3`);
run(`const plot=document.querySelector('.comparison-plot');plot.getBoundingClientRect=()=>({left:0,width:340});plot.dispatchEvent(new MouseEvent('pointerdown',{clientX:90,bubbles:true}));plot.dispatchEvent(new MouseEvent('pointermove',{clientX:180,bubbles:true}));window.dragDate=document.querySelector('.comparison-date').textContent;plot.dispatchEvent(new MouseEvent('pointerup',{clientX:180,bubbles:true}));`);
check('pointer release pins its date and does not erase points',`document.querySelector('.comparison-date').textContent===window.dragDate&&document.querySelectorAll('.comparison-card:not(.runrace) circle.comparison-marker').length===3`);
run(`document.querySelector('.comparison-latest').click()`);
check('Latest restores the exact cutoff',`document.querySelector('.comparison-date').textContent==='September 11'`);
check('exercise dropdown replaced with body parts and search',`!document.querySelector('.pg-ex')&&!!document.querySelector('[data-pg-part="Legs"]')&&!!document.querySelector('.pg-search-open')`);
run(`document.querySelector('.pg-search-open').click();const input=document.querySelector('.pg-search-dialog input');input.value='incline';input.dispatchEvent(new Event('input'));`);
check('search keeps only matching full exercise names',`[...document.querySelectorAll('.pg-search-results button')].filter(e=>!e.hidden).length===1`);
run(`document.querySelector('.pg-search-results button:not([hidden])').click()`);
check('choosing a result opens its real progression',`document.querySelector('.progression-card')._pg.state.ex==='Incline Barbell Bench Press'&&!document.querySelector('.pg-search-dialog[open]')`);
run(`document.querySelector('#pmixWrap [aria-label*="January 3, 2024"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));window.sharedDate=null;sharePlateCard=()=>{window.sharedDate=todayISO;};document.querySelector('.plate-share').click();`);
check('history Share snapshots selected date without changing today',`window.sharedDate==='2024-01-03'&&todayISO==='2026-09-11'&&document.querySelector('.plate-date').textContent.includes('2024')`);
check('browsing leaves profile and all workout records untouched',`JSON.stringify(DB)===window.savedDB`);
check('whole-number plate units are consistent in kilograms and pounds',`plateLedger({w:[{part:'Legs',ex:'Squat',w:100,reps:[10]}]},250).length===4&&plateLedger({w:[{part:'Legs',ex:'Squat',w:1000/LB,reps:[1]}]},500/LB).length===2`);
check('month row directly precedes attendance cells',`document.querySelector('.heatgrid').previousElementSibling.classList.contains('heatticks')`);
run(`DB.settings.weekStart=1;view='stats';render();`);
check('selection survives leaving and rendering Stats',`document.querySelector('.plate-date').textContent.includes('2024')`);
// A leap day must not count the previous year's February 28 twice.
run(`todayISO='2024-03-01';DB.days={'2023-02-28':{w:[{part:'Run',ex:'Run',w:5,mins:30}]},'2024-02-29':{w:[{part:'Run',ex:'Run',w:8,mins:40}]}};SEED=deriveAll();view='stats';render();`);
check('single February 28 is counted only once in leap comparison',`document.querySelector('.runrace .comparison-values').textContent.includes('3.1')||document.querySelector('.runrace .comparison-values').textContent.includes('5')`);
run(`DB.days={};SEED=deriveAll();view='stats';render();`);
check('empty history renders without invented comparison data',`!document.querySelector('.comparison-plot')`);
check('fractional plates retain only a subtle lip in live and export geometry',`[8,19].every(thickness=>{const a=[{kg:500},{kg:50},{kg:500}];const y=a.map((_,i)=>plateStackTop(a,i,0,500,thickness,200));return Math.abs(y[1]+thickness*.35-y[0])<1e-8&&Math.abs(y[2]+thickness*1.25-y[1])<1e-8;})`);
check('full replays finish in 3.5 seconds with different visible plate counts',`[2,8,15,30].every(n=>Math.abs((n-1)*plateStagger(n)+780-3500)<1e-8)&&plateStagger(1)===0`);
check('each column and completed bank restarts on the same ground',`(()=>{const a=Array.from({length:42},()=>({kg:250}));return plateStackTop(a,30,30,250,8,144)===136&&plateStackTop(a,40,30,250,8,144)===136;})()`);
console.log('PASS connected Stats contract');process.exit(0);
