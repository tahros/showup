// v4.0.5 — a disclosure that has been expanded stays expanded.
// The maker opened Today's plan, tapped an exercise, came back, and found it
// shut. Driven through the real summary click and a real trip out and back,
// because the claim is about what survives a render, and a test that sets the
// flag directly would never see a render throw it away.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));
w.matchMedia=()=>({matches:true,addEventListener(){}});   // reduced motion: the fold finishes at once
w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))
  vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);let fails=0;
const ok=(n,e,g)=>{let good;try{good=typeof e==='string'?run(e):e;}catch(err){good=false;console.log(err.message);}
  console.log(`${good?'PASS':'FAIL'} ${n}`+(g!==undefined?` → ${typeof g==='string'?run(g):g}`:''));if(!good)fails++;};

run(String.raw`DB.days={};DB.settings.onboarded=true;DB.settings.unit='lb';
  DB.settings.myParts=['Legs','Chest','Sixpack'];todayISO='2026-09-11';checkDate=()=>false;
  DB.days['2026-09-09']={w:[{part:'Legs',ex:'Squat',w:90,reps:[8,8,8],at:1}],upd:1};
  DB.plan={d:'2026-09-11',items:[
    {ex:'Squat',lines:[{w:102,reps:[6,6,6,6],note:''}]},
    {ex:'Standing Calf Raise',lines:[{w:0,reps:[12,12,12],note:''}]}]};
  DB.week=null;SEED=deriveAll();view='today';lift.plan=null;
  try{localStorage.clear();}catch(_){}
  dayMeta();render();`);

const today = `document.querySelector('details[data-pw-fold="today"]')`;
ok("Today's plan is a disclosure that names itself", `!!${today}`);
ok("...shut to begin with", `!${today}.open`);

/* the real gesture: click the summary */
run(`${today}.querySelector('summary').dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}))`);
ok('tapping it opens it', `${today}.open`);
ok('...and the state is written down, not only in the DOM',
   `pw().folds && pw().folds.today===true`, `JSON.stringify(pw().folds||{})`);

/* a plain re-render used to shut it — that is the bug, before any navigation */
run(`render()`);
ok('a re-render does not shut it', `${today} && ${today}.open`);

/* the trip the maker actually made: into an exercise and back */
run(`view='lift';lift.part='Legs';lift.ex='Standing Calf Raise';lift.weight=0;render();`);
ok('(fixture) the exercise screen is up', `view==='lift' && !document.querySelector('details[data-pw-fold="today"]')`);
run(`view='today';lift.part=null;lift.ex=null;render();`);
ok('coming back from the exercise, Today is still open',
   `${today} && ${today}.open`, `${today}?String(${today}.open):'(absent)'`);

/* and it must still be able to close */
run(`${today}.querySelector('summary').dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}))`);
ok('tapping again closes it', `!${today}.open`);
run(`render()`);
ok('...and it stays closed across a render too', `!${today}.open`);
ok('...with the state written down as closed', `pw().folds.today===false`, `JSON.stringify(pw().folds)`);

/* the memory is generic, not a second special case */
const src=fs.readFileSync(path.join(dir,'js/planner.js'),'utf8');
ok('any disclosure carrying data-pw-fold is remembered, not just this one',
   /const key=d\.getAttribute\('data-pw-fold'\);/.test(src) &&
   /\(st\.folds=st\.folds\|\|\{\}\)\[key\]=open/.test(src));
process.exit(fails?1:0);
