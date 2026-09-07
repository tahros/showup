const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext(),run=c=>vm.runInContext(c,ctx);
w.fetch=()=>Promise.reject(new Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})});
w.HTMLCanvasElement.prototype.toDataURL=()=>"data:image/png;base64,";
for(const s of order)vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
// Known physical distances/times. No conversion helpers in expected values.
run(`runDays=()=>[
 {d:'2025-12-30',km:5,sec:1800,timed:5},
 {d:'2025-12-31',km:3,sec:0,timed:0},
 {d:'2026-01-01',km:6,sec:1800,timed:5},
 {d:'2026-01-02',km:5,sec:1799,timed:5}
];`);
function mount(unit){run(`DB.settings.unit='${unit}';DB.settings.runMode='dist';document.getElementById('view').innerHTML=dailyRunsSection();bindDrun();`);geometry();}
function geometry(){run(`(function(){const box=document.getElementById('drWrap'),svg=box.querySelector('svg');
 Object.defineProperty(box,'clientWidth',{value:150,configurable:true});Object.defineProperty(box,'scrollWidth',{value:320,configurable:true});
 svg.getBoundingClientRect=()=>({left:40-box.scrollLeft/2,top:0,width:160,height:93});})();`);}
function at(i){return run(`(40-document.getElementById('drWrap').scrollLeft/2)+ +document.querySelectorAll('.drdot')[${i}].getAttribute('cx')/2`);}
function mouse(type,i){run(`document.getElementById('drWrap').dispatchEvent(new MouseEvent('${type}',{bubbles:true,clientX:${at(i)}}));`);}
function read(){return run(`document.querySelector('[data-drread]').textContent`);}
let failures=0;
function check(name,fn){try{fn();console.log('PASS',name);}catch(e){failures++;console.error('FAIL',name,e.message);}}
for(const unit of ['kg','lb']){
 const u=unit==='kg'?'km':'mi',distance=u==='km'?'5.00':'3.11',pace=u==='km'?`6'00"`:`9'39"`;
 mount(unit);
 check(`${u}: scaled/scrolled mouse selection, date, distance and pace`,()=>{
  run(`document.getElementById('drWrap').scrollLeft=12;`);mouse('mousedown',0);
  assert(read().includes(`${distance} ${u}`),read());assert(read().includes(`${pace} /${u}`),read());
  assert(read().includes('2025'),read());mouse('mouseup',0);
 });
 check(`${u}: scrubbing works immediately after each real mode toggle`,()=>{
  for(const mode of ['pace','dist','pace']){
   run(`document.querySelector('[data-drunmode]').click();`);geometry();
   assert.strictEqual(run(`drunMode()`),mode);assert.strictEqual(run(`document.getElementById('drWrap').scrollLeft`),12);
   mouse('mousedown',0);assert(read().includes(`${distance} ${u}`),read());assert(read().includes(`${pace} /${u}`),read());mouse('mouseup',0);
  }
 });
 mount(unit);
 check(`${u}: untimed run has no invented pace; mixed day uses timed distance`,()=>{
  mouse('mousedown',1);assert(!/NaN|Infinity|0'00"/.test(read()),read());assert(read().includes('pace not recorded'),read());mouse('mouseup',1);
  mouse('mousedown',2);assert(read().includes(u==='km'?'6.00 km':'3.73 mi'),read());assert(read().includes(`${pace} /${u}`),read());mouse('mouseup',2);
 });
 check(`${u}: touch hold and drag updates to a different run; release retains it`,()=>{
  run(`drunScrubShow(document.getElementById('drWrap'),null);`);
  for(const [type,i] of [['touchstart',0],['touchmove',2],['touchend',2]]){
   run(`(function(){const e=new Event('${type}',{bubbles:true,cancelable:true});e.touches=${type==='touchend'?'[]':`[{clientX:${at(i)},clientY:60}]`};document.getElementById('drWrap').dispatchEvent(e);})();`);
   if(type==='touchstart')run(`document.getElementById('drWrap')._drunArm();`);
  }
  assert(read().includes('2026'),read());assert(read().includes(u==='km'?'6.00 km':'3.73 mi'),read());assert(read().includes(`${pace} /${u}`),read());
 });
}
check('pace rounds once and carries 60 seconds into the next minute',()=>{
 assert.strictEqual(run(`paceStr(359.8)`),`6'00"`);assert.strictEqual(run(`paceStr(599.9)`),`10'00"`);assert.strictEqual(run(`paceStr(0)`),'—');
});
check('an outlier at the chart rim reads its actual pace, not the axis limit',()=>{
 run(`const normalRunDays=runDays;runDays=()=>normalRunDays().concat({d:'2026-01-03',km:5,sec:12300,timed:5});`);
 mount('kg');run(`document.querySelector('[data-drunmode]').click();`);geometry();
 assert(run(`document.querySelector('.drdot[data-d="2026-01-03"]').classList.contains('out')`));
 mouse('mousedown',3);assert(read().includes(`41'00" /km`),read());mouse('mouseup',3);
});
check('without any timed runs the mode switch keeps a usable distance chart',()=>{
 run(`runDays=()=>[{d:'2026-01-01',km:3,sec:0,timed:0}];`);mount('lb');
 run(`document.querySelector('[data-drunmode]').click();`);
 assert.strictEqual(run(`drunMode()`),'dist');mouse('mousedown',0);
 assert(read().includes('1.86 mi'),read());assert(read().includes('pace not recorded'),read());
});
dom.window.close();process.exit(failures?1:0);
