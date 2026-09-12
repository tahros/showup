// test-everyweek.js — v4.4.0: the rolling chart is retired; This week is fixed.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(new Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({}),set:()=>true});};
for(const s of order)vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
const run=c=>vm.runInContext(c,ctx);let fail=0;
function ok(name,value){console.log(value?'PASS':'FAIL',name);if(!value)fail++;}
run(`DB.days[todayISO]={w:[{part:'Back',ex:'Row',w:40,reps:[8],at:1}],upd:1};SEED=deriveAll();view='stats';render();`);
ok('Every week is absent',run(`![...document.querySelectorAll('#view h2')].some(h=>h.textContent.includes('Every week'))`));
ok('This week is present',run(`[...document.querySelectorAll('#view h2')].some(h=>h.textContent.includes('This week'))`));
for(const start of ['sunday','monday']){
  run(`DB.settings.weekStart='${start}';renderStats();`);
  ok(`${start} setting owns the first day`,run(`new Date(weekDays()[0]+'T00:00').getDay()===weekStartDow()`));
  ok(`${start} setting owns all seven dates`,run(`weekDays().length===7&&(new Date(weekDays()[6]+'T00:00')-new Date(weekDays()[0]+'T00:00'))/864e5===6`));
  ok(`${start} period is printed`,run(`!!document.querySelector('.mccard .v4-note')&&document.querySelector('.mccard .v4-note').textContent.length>8`));
}
process.exit(fail?1:0);
