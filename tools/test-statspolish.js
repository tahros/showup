// test-statspolish.js — v4.4.0 unified Stats visual system.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(new Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({}),set:()=>true});};
for(const s of order)vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));const run=c=>vm.runInContext(c,ctx);let fail=0;
function ok(name,value){console.log(value?'PASS':'FAIL',name);if(!value)fail++;}
run(`DB.days[todayISO]={w:[{part:'Chest',ex:'Press',w:50,reps:[8],at:1},{part:'Run',ex:'Run',w:2,mins:18,secs:0,at:2}],upd:1,doneAll:true};SEED=deriveAll();view='stats';render();`);
ok('every Stats card receives one shared card contract',run(`[...document.querySelectorAll('#view .card')].every(c=>c.classList.contains('stats-card'))`));
ok('every title receives one shared title contract',run(`[...document.querySelectorAll('#view h2')].every(h=>h.classList.contains('stats-title'))`));
ok('dates use the shared date treatment',run(`document.querySelectorAll('.stats-date').length>=5`));
ok('units use the shared unit treatment',run(`document.querySelectorAll('.stats-unit,.stats-measure').length>=4`));
/* v4.5.17: four, and NAMED. "Exactly two" was the right guard while share was
   plate + progression; the maker added share to both comparison cards. A bare
   count of 4 would pass if a fifth crept in and a named one dropped out, so each
   approved share is listed and the total is pinned. */
ok('only the four approved Share actions remain -- plate, progression, and the two comparisons',
   run(`(function(){const all=[...document.querySelectorAll('.stats-share')];
     return all.length===4&&all.filter(b=>b.classList.contains('plate-share')).length===1
       &&all.filter(b=>b.classList.contains('pg-share')).length===1
       &&all.filter(b=>b.classList.contains('comparison-share')).length===2;})()`));
ok('chevrons use one control treatment',run(`[...document.querySelectorAll('.pg-range-nav button,.pg-pages button')].every(b=>b.classList.contains('stats-chevron'))`));
ok('the repeated What you did summary is gone',run(`!document.querySelector('.pmixsum')`));
ok('the completion total is the only oversized workout takeaway',run(`!!document.querySelector('.plate-total')&&!!document.querySelector('.crtotal')`));
const src=fs.readFileSync(path.join(dir,'js/stats-story.js'),'utf8');
ok('one width, radius, and spacing rhythm are tokenized',/--stats-radius:22px/.test(src)&&/--stats-section:30px/.test(src)&&/\.stats-card\{[^}]*width:calc/.test(src));
ok('signature blue is performance color, not a body-part category',/\.heatgrid \.hc\.on\{background-color:var\(--accent\)/.test(src)&&!/PART_COLORS[^\n]*accent/.test(src));
ok('reduced motion disables the preserved plate rise',/@media\(prefers-reduced-motion:reduce\)\{#view\.review-stats \.pmixplate\.latest\{animation:none/.test(src));
process.exit(fail?1:0);
