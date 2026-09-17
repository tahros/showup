// test-stats-repzone.js — v4.4.0 retirement guard for Are you growing.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(new Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({}),set:()=>true});};
for(const s of order)vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));const run=c=>vm.runInContext(c,ctx);let fail=0;
function ok(name,value){console.log(value?'PASS':'FAIL',name);if(!value)fail++;}
run(`DB.days[todayISO]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[8,8],at:1}],upd:1};SEED=deriveAll();view='stats';render();`);
ok('Are you growing is absent',run(`![...document.querySelectorAll('#view h2')].some(h=>/growing/i.test(h.textContent))`));
ok('its card is absent',run(`!document.querySelector('.gacard')`));
/* v4.6.59: Stats now carries ONE progression section (check-single-live-stats), and
   it is titled "Training now" while a workout is live -- "Your strength progress" is
   the idle title. The claim was never the wording: it is that the old decision layer
   is gone and a progress section stands in its place. Both titles satisfy that, and
   the fixture here logs today, so it is the live one. */
ok('a progress section replaces the decision layer',run(`[...document.querySelectorAll('#view h2')].some(h=>/Your strength progress|Training now/.test(h.textContent))`));
ok('the set-level progression chart remains',run(`!!document.querySelector('.progression-card')`));
ok('the retired computation remains data-only and does not rename body parts',run(`typeof growthAuditData==='function'&&typeof gaPR==='function'`));
process.exit(fail?1:0);
