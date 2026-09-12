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
/* the visible stack: the canvas draws the CURRENT stack of ten */
const topTen=L.slice(-10), backTop=topTen.filter(x=>x==='Back').length;
ok('THE VISIBLE STACK IS MOSTLY BACK, not the part that happened to be last',
   backTop>=5, topTen.join(','));
ok('...and it still shows the arms that were trained',
   new Set(topTen).size>=2, [...new Set(topTen)].join(', '));
/* every ten-plate window is a fair sample, not just the top one */
let worst=1;
for(let i=0;i+10<=L.length;i++){const f=L.slice(i,i+10).filter(x=>x==='Back').length/10;if(f<worst)worst=f;}
ok('every ten-plate window is a fair sample of the session', worst>=0.5, 'worst window is '+(worst*100)+'% Back');

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
process.exit(fails?1:0);
