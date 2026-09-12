/* test-repairparts.js — v4.4.2, the repair honours a selected part.
 * Twice the maker selected Biceps and twice the day came back without it. The
 * server is stubbed here: first answer omits Biceps, and what the client does
 * next is the thing under test.
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

run(`DB.days={};DB.settings.unit='lb';DB.settings.onboarded=true;DB.settings.bodyweight=70;
  DB.settings.myParts=['Chest','Biceps','Triceps','Sixpack'];todayISO='2026-09-11';checkDate=()=>false;
  for(const [d,ex,part] of [['2026-09-02','Incline Barbell Bench Press','Chest'],['2026-09-05','Dip','Chest'],['2026-09-08','EZ Bar Curl','Biceps']])
    DB.days[d]={w:[{part,ex,w:toKg(100),reps:[8,8,8],at:1}],upd:1};
  SEED=deriveAll();dayMeta();`);

const D='2026-09-12';
const without='Barbell Bench Press\n  145 lb x 8 8 8 8\n\nDip\n  50 lb x 8 8 8\n\nOverhead Triceps Extension\n  40 lb x 10 10 10\n\nHanging Leg Raise\n  0 lb x 12 12 12';
const withB=without+'\n\nEZ Bar Curl\n  55 lb x 10 10 10';
/* the stub: first call omits Biceps; every later call includes it */
/* the stub answers with the rotation's own pick, as the real server does --
   guardrail 2 refuses a changed part with no reason, and that is not what is
   under test here */
run(`globalThis.__calls=[]; globalThis.writeSession=async p=>{__calls.push(p);
  const text=__calls.length===1?${JSON.stringify(without)}:${JSON.stringify(withB)};
  return {days:[{date:'${D}',part:p.rotation.pick,title:p.rotation.pick,text}],reason:null};};`);
const payload=JSON.parse(run(`JSON.stringify((function(){const o={scope:'tomorrow',days:['${D}'],parts:{}};
  const p=writerPayload(o); p.workspace={version:1,schedule:[{date:'${D}',parts:['Chest','Sixpack','Triceps','Biceps']}]}; return p;})())`));

const res=run(`(async()=>{const p=${JSON.stringify(payload)}; const r=await writerGenerateChecked(p); return JSON.stringify({v:r.violations,n:__calls.length,notes:__calls.map(c=>c.note||'')});})()`);
res.then(json=>{
  const r=JSON.parse(json);
  ok('the first answer left Biceps out — the case that keeps recurring', /Biceps/.test(r.notes[1]||''), (r.notes[1]||'').slice(0,80));
  ok('THE DAY COMES BACK WITH BICEPS', !(r.v||[]).some(v=>/Biceps was selected/.test(v.why.join(' '))), JSON.stringify(r.v));
  ok('...after a repair was asked for', r.n>=2, r.n+' server calls');
  ok('...whose brief names the selected parts FIRST, before any usual-before-new rule',
     (()=>{const n=r.notes[1]||'';return n.indexOf('include an exercise for EACH of')<n.indexOf('Respect payload.skeleton');})(),
     (r.notes[1]||'').split('\\n')[0].slice(0,90));
  ok('...and tells it a selected part outranks usual', /A selected part outranks payload.usual/.test(r.notes[1]||''));
  ok('...and no usual-before-new instruction is left to argue the other way',
     !/before any new one/.test(r.notes[1]||''));
  process.exit(fails?1:0);
}).catch(e=>{console.log('CRASH',JSON.stringify(e),e&&e.message);process.exit(1);});
