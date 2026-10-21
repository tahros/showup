/* test-onboarding-paths.js DIR -- v4.6.371: two ways in.
 * After the door: "How are you starting?" -- I have a routine / Start me fresh /
 * Just looking around. Fresh asks four one-tap questions and lands on Today with
 * session 1 of a fixed template planned; a routine goes to import, paste, or the
 * body-part picker. Name and units come last for both. The crew is met after the
 * first finished workout. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined&&!c?' → '+JSON.stringify(g):''));if(!c)fails++;};
const tick=()=>new Promise(r=>setTimeout(r,0));const settle=async(n=30)=>{for(let i=0;i<n;i++)await tick();};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
async function app(){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext();
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('offline');};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
  await settle();
  const run=c=>vm.runInContext(c,ctx);
  run(`DB={days:{},settings:{mascotMotion:'still'},plan:null,week:null,planTracking:null};todayISO='2026-10-21';checkDate=()=>false;save=()=>{};SEED=deriveAll();onbHist=[];onbPath=null;onbHave=null;onbStep=1;onbRender();`);
  const q=s=>w.document.querySelector('#onb '+s);
  const tap=async s=>{const e=q(s);if(!e)throw new Error('missing '+s);e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));await settle(10);};
  return {w,run,q,tap};
}
(async()=>{
  { const a=await app();
    await a.tap('[data-onbact="local"]');
    ok('after the door: How are you starting?', /How are you/.test(a.q('.ob-h')?.textContent||''));
    ok('two ways in, plus Just looking around', !!a.q('[data-onbact="path"][data-v="have"]')&&!!a.q('[data-onbact="path"][data-v="fresh"]')&&!!a.q('[data-onbact="look"]'));
    await a.tap('[data-onbact="path"][data-v="fresh"]');
    ok('fresh asks the Preferences questions: training for first', a.run('onbStep')==='goal'&&!!a.q('.pf-segb[data-v="grow"].on'));
    await a.tap('[data-onbact="fgoal"][data-v="strength"]');
    ok('the goal caption is the planner\'s own', /3 to 6 reps/.test(a.q('.pf-pref-cap').textContent));
    await a.tap('[data-onbact="fnext"][data-v="week"]');
    ok('days you train: Mon, Wed, Fri picked to start', a.w.document.querySelectorAll('#onb .pf-dowb.on').length===3);
    await a.tap('[data-onbact="fday"][data-v="2"]');await a.tap('[data-onbact="fday"][data-v="3"]');await a.tap('[data-onbact="fday"][data-v="4"]');
    ok('four days picked (Mon, Tue, Thu, Fri)', a.run('onbF.days.slice().sort().join()')==='1,2,4,5');
    await a.tap('[data-onbact="fnext"][data-v="parts2"]');
    ok('body parts you train: all on', a.w.document.querySelectorAll('#onb .pf-mypart.on').length===7);
    await a.tap('[data-onbact="fnext"][data-v="order"]');
    ok('four days start from Upper / Lower', a.run('onbF.preset')==='ul'&&a.w.document.querySelectorAll('#onb .pf-ses').length===2);
    ok('each session shows the days it lands on', /Mon · Thu/.test(a.q('.pf-ses').textContent)&&/Tue · Fri/.test(a.w.document.querySelectorAll('#onb .pf-ses')[1].textContent));
    await a.tap('[data-onbact="fsplit"][data-v="ppl"]');
    ok('tapping a split replaces the sessions', a.w.document.querySelectorAll('#onb .pf-ses').length===3);
    await a.tap('[data-onbact="fsel"][data-v="0"]');await a.tap('[data-onbact="fput"][data-v="Run"]');
    ok('select a session and tap a body part: Cardio goes first', a.run('onbF.sessions[0].parts[0]')==='Run');
    await a.tap('[data-onbact="back"]');
    ok('Back returns one screen', a.run('onbStep')==='parts2');
    await a.tap('[data-onbact="fnext"][data-v="order"]');await a.tap('[data-onbact="fnext"][data-v="you"]');
    ok('name and units come last', a.run('onbStep')==='you'&&!!a.q('#onbName'));
    ok('nothing is saved before the end', !a.run('DB.plan'));
    await a.tap('[data-onbact="finishPath"]');
    ok('fresh lands on Today, onboarded', a.run('view')==='today'&&!!a.run('DB.settings.onboarded'));
    ok('the answers are the planner preferences', a.run(`(p=>p.trainDays.slice().sort().join()==='1,2,4,5'&&p.frequency===4&&p.orderMode==='own'&&p.rotation.sessions.length===3&&p.rotation.sessions[0].parts[0]==='Run')(DB.settings.plannerPreferences)`)&&a.run('DB.settings.objective')==='strength');
    ok('session 1 is planned for today from the starters, 5 reps on the first lift', a.run(`DB.plan.d===todayISO&&DB.plan.items.some(x=>x.ex==='Barbell Bench Press')&&DB.plan.items.every(x=>!/Plank/.test(x.ex))`)&&/× 5/.test(a.run('DB.plan.raw')));
    ok('Today starts on Run when session 1 opens with Cardio... or on its first lift', !!a.w.document.querySelector('.today-focus-next .btn'));
    ok('no crew prompt before a finished workout', a.run('adoptDue()')===false);
  }
  { const a=await app(); await a.tap('[data-onbact="local"]');await a.tap('[data-onbact="path"][data-v="fresh"]');await a.tap('[data-onbact="fnext"][data-v="week"]');await a.tap('[data-onbact="fnext"][data-v="parts2"]');await a.tap('[data-onbact="fnext"][data-v="order"]');await a.tap('[data-onbact="fnext"][data-v="you"]');await a.tap('[data-onbact="finishPath"]');
    ok('all defaults: Full body Mon/Wed/Fri, Today names it and starts on a lift, not a run', /Full body/.test(a.w.document.querySelector('.today-focus-title')?.textContent||'')&&a.w.document.querySelector('.today-focus-next .btn')?.dataset.ex!=='Run');
    const miss=a.run(`Object.entries(TRAIN_STARTERS).flatMap(([p,l])=>l.filter(e=>!catFor(p).includes(e)))`);
    ok('every starter is in the catalog', miss.length===0, miss);
  }
  { const a=await app(); await a.tap('[data-onbact="local"]');await a.tap('[data-onbact="path"][data-v="have"]');
    ok('a routine: where is it now?', !!a.q('[data-onbact="have"][data-v="import"]')&&!!a.q('[data-onbact="have"][data-v="paste"]')&&!!a.q('[data-onbact="have"][data-v="log"]'));
    await a.tap('[data-onbact="have"][data-v="log"]');
    ok('log as I go picks body parts', a.run('onbStep')==='parts');
    await a.tap('[data-onbact="toYou"]');await a.tap('[data-onbact="finishPath"]');
    ok('...and lands on Train', a.run('view')==='lift');
  }
  { const a=await app(); await a.tap('[data-onbact="local"]');await a.tap('[data-onbact="look"]');
    ok('Just looking around lands on Today with sample data on offer', a.run('view')==='today'&&a.run('DB.settings.lookAround')===1);
  }
  console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
