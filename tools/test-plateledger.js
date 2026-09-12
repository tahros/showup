/* test-plateledger.js — v4.5.3, the visible stack is a fair sample.
 * The maker reviewed Aug 20 -- a Back session -- and the plates showed him
 * Triceps. The ledger grouped every part's plates together and only the
 * CURRENT stack is drawn, so whichever part landed last filled the screen.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));
w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))
  vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};

run(`DB.settings.unit='lb';
 const S=(part,ex,lb,reps,at)=>({part,ex,w:toKg(lb),reps,at});
 globalThis.AUG20={w:[
  S('Back','Deadlift',135,[8],1),S('Back','Deadlift',195,[6,6,5,4],2),
  S('Back','Bent-Over Row',165,[10,10,8,6],3),S('Back','Pull Up',0,[16,10,12,6],4),
  S('Back','Single-Arm Dumbbell Row',55,[6],5),S('Back','Single-Arm Dumbbell Row',45,[10,10,8],6),
  S('Biceps','EZ Bar Curl',50,[6],7),S('Biceps','EZ Bar Curl',40,[10,10],8),
  S('Triceps','Overhead Triceps Extension',40,[10,10,5],9),S('Triceps','Overhead Triceps Extension',30,[6,12],10),
  S('Biceps','Dumbbell Curl',25,[10,10],11)]};`);
const led=()=>JSON.parse(run(`JSON.stringify(plateLedger(AUG20).map(p=>p.part))`));
const kgs=()=>JSON.parse(run(`JSON.stringify(plateLedger(AUG20).map(p=>p.kg))`));
const L=led();
const count=p=>L.filter(x=>x===p).length;

ok('the Back session is mostly Back plates', count('Back')===25, JSON.stringify({Back:count('Back'),Biceps:count('Biceps'),Triceps:count('Triceps')}));
/* v4.5.4: GROUPED BANDS, heaviest part lowest. v4.5.3 interleaved them so any
   window sampled the session; that made every stack a stripe of mixed colour,
   which reads as noise. A stack should look like a stack. */
ok('the heaviest part is the band at the bottom', L[0]==='Back', L[0]);
ok('...and each part is one unbroken band, not a stripe',
   (function(){const seen=new Set();let last=null;
     for(const p of L){ if(p!==last){ if(seen.has(p)) return false; seen.add(p); last=p; } }
     return true;})(), L.join(',').slice(0,60)+'…');
ok('...ordered by how much was lifted, not by when it was logged',
   (function(){const order=[...new Set(L)];
     const vol=p=>L.filter(x=>x===p).length;
     return order.every((p,i)=>i===0||vol(order[i-1])>=vol(p));})(),
   [...new Set(L)].join(' > '));

/* nothing about the totals changed */
ok('the plate count is unchanged', L.length===33, String(L.length));
const sum=kgs().reduce((a,b)=>a+b,0);
ok('...and the total weight still matches the day', Math.abs(sum-run(`plateMetrics(AUG20).kg`))<1e-6,
   Math.round(run(`toU(${sum})`))+' lb');
ok('...and every plate is a whole unit or the last remainder',
   kgs().slice(0,-1).every(k=>Math.abs(k-run(`isLb()?500/LB:250`))<1e-6||k<=run(`isLb()?500/LB:250`)));

/* a single-part day is untouched */
run(`globalThis.ONE={w:[{part:'Legs',ex:'Squat',w:toKg(225),reps:[6,6,6,6],at:1}]};`);
ok('a single-part day is one colour, as it should be',
   new Set(JSON.parse(run(`JSON.stringify(plateLedger(ONE).map(p=>p.part))`))).size===1);
ok('an empty day has no plates', run(`plateLedger({w:[]}).length`)===0 && run(`plateLedger(null).length`)===0);

/* Aug 25: 14,465 lb Back + 700 lb Biceps = 31 plates. The retired 30-plate
   window began at plate 31 and therefore rendered only Biceps. */
run(`globalThis.AUG25={w:[
  {part:'Back',ex:'Back work',w:toKg(14465),reps:[1]},
  {part:'Biceps',ex:'Dumbbell Curl',w:toKg(25),reps:[10,10,8]}]};`);
const aug25=JSON.parse(run(`JSON.stringify(plateLedger(AUG25).map(p=>p.part))`));
ok('Aug 25 contains the expected 29 Back and 2 Biceps plates',
   aug25.length===31&&aug25.filter(p=>p==='Back').length===29&&aug25.filter(p=>p==='Biceps').length===2,
   JSON.stringify({Back:aug25.filter(p=>p==='Back').length,Biceps:aug25.filter(p=>p==='Biceps').length}));
const live=fs.readFileSync(path.join(dir,'js/plate-canvas.js'),'utf8'),share=fs.readFileSync(path.join(dir,'js/plates.js'),'utf8');
ok('the live and shared stacks both begin at plate zero',
   /count=ledger\.length,bank=0/.test(live)&&/plates=plateLedger\(data\.record,unit\),bank=0/.test(share));
process.exit(fails?1:0);
