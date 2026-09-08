// The approved completion design, driven through the real event router.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext(),run=c=>vm.runInContext(c,ctx);
w.fetch=()=>Promise.reject(new Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})});
for(const s of order)vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
run(`var shareCalls=0;showCard=()=>{shareCalls++};`);
let failures=0;
function check(name,fn){try{fn();console.log('PASS',name);}catch(e){failures++;console.error('FAIL',name,e.message);}}
function seed(unit,hasRun=true){run(`document.getElementById('dayDone')?.remove();DB.days={};DB.plan=null;DB.week=null;
 DB.settings.unit='${unit}';delete DB.settings.dayDone;delete DB.settings.century;
 DB.days[todayISO]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8]}${hasRun?",{part:'Run',ex:'Run',w:5,mins:30,secs:0}":''}],upd:1,doneEx:[],donePart:[]};
 SEED=deriveAll();view='today';render();`);}
function click(sel){run(`document.querySelector('${sel}').click()`);}
(async()=>{
for(const unit of ['kg','lb']){
 seed(unit);click('#doneAllBtn');
 check(`${unit}: completion is a real declaration, accurate units, real day count`,()=>{
  assert(run(`dayMeta().doneAll`));assert.equal(run(`document.querySelector('.ddn').textContent`),'1');
  assert(run(`document.querySelector('.ddsummary').textContent`).includes(unit==='kg'?'5.00 km':'3.11 mi'));
  assert(run(`document.querySelector('.ddsummary').textContent`).includes('2 sets'));
  assert.equal(run(`document.querySelectorAll('.ddtrail').length`),0);
 });
 check('dialog focus and keyboard stay inside',()=>{
  assert.equal(run(`document.activeElement.dataset.dd`),'done');
  run(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}))`);
  assert.equal(run(`document.activeElement.dataset.dd`),'share');
  assert.equal(run(`document.querySelector('#dayDone').getAttribute('aria-modal')`),'true');
 });
 click('#dayDone');await new Promise(r=>setTimeout(r,1700));
 check('no timer, background click, or duplicate call can dismiss/share the moment',()=>{
  run(`celebrateDayDone(true)`);assert.equal(run(`document.querySelectorAll('#dayDone').length`),1);
  assert.equal(run('shareCalls'),0);
 });
 click('[data-dd="done"]');
 check('Done returns to the completed Today record, not Share',()=>{
  assert(!run(`!!document.getElementById('dayDone')`));assert.equal(run('view'),'today');
  assert(!run(`!!document.getElementById('doneAllBtn')`));assert.equal(run('shareCalls'),0);
  // v3.3.500: the card is the square, the count and the date. The word "Day"
  // went with the "Workout complete" tail and the reopen line -- the square
  // above the number has meant a day since the app began. The claim here is
  // unchanged: Done lands back on the completed record, showing the real count
  // and the date. Bound to the count element so the wording can move again.
  assert.equal(run(`document.querySelector('.card.dayclosed .dcn').textContent.trim()`),'1');
  assert(!run(`document.querySelector('.card.dayclosed').textContent.includes('In the book')`));
  assert(!run(`document.querySelector('.card.dayclosed').textContent.includes('Workout complete')`));
  assert(run(`document.querySelector('.card.dayclosed').textContent.includes(pretty(todayISO))`));
  // the state and the reopen rule are not lost, they move to the button's label
  assert(/complete/i.test(run(`document.querySelector('.card.dayclosed').getAttribute('aria-label')`)));
 });
}
const before=run('JSON.stringify(DB)');click('[data-replayday]');
check('replay is read-only',()=>assert.equal(run('JSON.stringify(DB)'),before));
click('[data-dd="share"]');
check('only explicit Share opens the existing day-card path once',()=>assert.equal(run('shareCalls'),1));
seed('kg',false);click('#doneAllBtn');
check('strength-only days do not invent a run',()=>{
 const s=run(`document.querySelector('.ddsummary').textContent`);
 assert(s.includes('1 set'));assert(!/km|mi|1 sets/.test(s));
});
run(`document.querySelector('[data-dd="done"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
check('Escape closes accessibly',()=>assert(!run(`!!document.getElementById('dayDone')`)));
run(`reopen('Squat','Legs');render()`);
check('another set/reopen restores the completion action',()=>assert(run(`!!document.getElementById('doneAllBtn')`)));
click('#doneAllBtn');
check('an explicit completion always opens the moment even after today was stamped',()=>{
 assert(run(`!!document.getElementById('dayDone')`));
 assert.equal(run(`DB.settings.dayDone`),run(`todayISO`));
});
click('[data-dd="done"]');
const previewBefore=run('JSON.stringify(DB)');run(`celebrateDayDone(true,1000,1000)`);
check('milestone preview fits four digits and never changes the ledger',()=>{
 assert.equal(run('JSON.stringify(DB)'),previewBefore);
 assert.equal(run(`document.querySelector('.ddn.ddlarge').textContent`),'1,000');
});
const css=fs.readFileSync(path.join(dir,'css/app.css'),'utf8');
check('completed card cannot stack nav; motion and safe-area guards present',()=>{
 assert(!/^\s*\.dayclosed\s*\{/m.test(css));assert(css.includes('.card.dayclosed{'));
 assert(!css.includes('#dayDone .ddtrail'));
 assert(css.includes('#dayDone .ddn{font-family:var(--disp);font-size:84px'));
 assert(css.includes('env(safe-area-inset-bottom,0px)'));
});
dom.window.close();process.exit(failures?1:0);
})();
