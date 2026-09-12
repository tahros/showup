/* test-lowerchest.js — v4.3.10, the app can see lower chest.
 * The maker asked why it never recommends what he wants to train. It had two
 * chest heads and filed every lower-chest movement under plain chest, so a gap
 * there was invisible by construction. And the writer's gap rule fired only at
 * zero, so ten sets beside fifty-five read as covered.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));
w.matchMedia=()=>({matches:true,addEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))
  vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};

ok('lower chest is a head the app knows', run(`exMuscle('Dip','Chest')`)==='lower-chest', run(`exMuscle('Dip','Chest')`));
ok('...and so are the decline presses',
   run(`exMuscle('Decline Barbell Bench Press','Chest')`)==='lower-chest' &&
   run(`exMuscle('Decline Dumbbell Bench Press','Chest')`)==='lower-chest');
ok('...and the high-to-low cable fly', run(`exMuscle('Cable Fly Down','Chest')`)==='lower-chest');
ok('while incline work is still upper chest', run(`exMuscle('Incline Barbell Bench Press','Chest')`)==='upper-chest');
ok('...and a flat bench is still mid chest', run(`exMuscle('Barbell Bench Press','Chest')`)==='chest');
ok('...and the low-to-high fly stays upper — it rises to the upper fibres',
   run(`exMuscle('Low Cable Fly','Chest')`)==='upper-chest');

/* the writer receives it */
run(`DB.days={};DB.settings.unit='lb';DB.settings.onboarded=true;DB.settings.myParts=['Chest'];
  todayISO='2026-09-11';checkDate=()=>false;
  DB.days['2026-09-05']={w:[{part:'Chest',ex:'Dip',w:toKg(45),reps:[8],at:1},{part:'Chest',ex:'Incline Barbell Bench Press',w:toKg(155),reps:[10],at:1}],upd:1};
  SEED=deriveAll();dayMeta();`);
const p=JSON.parse(run(`JSON.stringify(writerPayload({scope:'day',days:[todayISO],parts:{}}))`));
ok('the coverage the writer receives has a lower-chest column',
   p.coverage&&p.coverage.Chest&&('lower-chest' in p.coverage.Chest),
   JSON.stringify(p.coverage&&p.coverage.Chest));
ok('...with the dip counted there, not under plain chest',
   p.coverage.Chest['lower-chest']>=1 && !(p.coverage.Chest['chest']>=1),
   JSON.stringify(p.coverage.Chest));
ok('...and the head map tells the writer which movements are lower chest',
   (p.heads.Chest['lower-chest']||[]).includes('Dip'), JSON.stringify(p.heads.Chest['lower-chest']));

/* the rule is graded now */
const srv=fs.readFileSync(path.join(dir,'supabase/functions/write-session/index.ts'),'utf8');
ok('a head is a gap at under a third of the part\'s best head, not only at zero',
   /under a third of the sets of that part's best-covered head/.test(srv));
ok('...and the prompt says so in the maker\'s own example',
   /ten lower-chest sets beside fifty-five upper-chest sets is a gap/.test(srv));
process.exit(fails?1:0);
