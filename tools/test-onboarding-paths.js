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
    ok('fresh: experience first', a.run('onbStep')==='exp');
    await a.tap('[data-onbact="fexp"][data-v="new"]');await a.tap('[data-onbact="fdays"][data-v="3"]');await a.tap('[data-onbact="fgoal"][data-v="grow"]');await a.tap('[data-onbact="fmin"][data-v="45"]');
    ok('four taps reach Your plan', a.run('onbStep')==='plan');
    ok('3 days is Full body on Mon, Wed, Fri', /Full body/.test(a.q('.ob-sub').textContent)&&a.w.document.querySelectorAll('#onb .ob-wk.on').length===3);
    ok('45 min is 5 exercises of 3 × 10, machines and dumbbells for a beginner', a.w.document.querySelectorAll('#onb .ob-ex').length===5&&/Leg Press/.test(a.q('.ob-today').textContent)&&!/Squat|Barbell/.test(a.q('.ob-today').textContent)&&/3 × 10/.test(a.q('.ob-ex').textContent));
    ok('nothing is saved before Looks good', !a.run('DB.plan'));
    await a.tap('[data-onbact="back"]');
    ok('Back returns one screen', a.run('onbStep')==='time');
    await a.tap('[data-onbact="fmin"][data-v="45"]');await a.tap('[data-onbact="planOK"]');
    ok('name and units come last', a.run('onbStep')==='you'&&!!a.q('#onbName'));
    await a.tap('[data-onbact="finishPath"]');
    ok('fresh lands on Today, onboarded', a.run('view')==='today'&&!!a.run('DB.settings.onboarded'));
    ok('session 1 is planned for today, named', a.run(`DB.plan.d===todayISO&&DB.plan.title==='Full body'&&DB.plan.items.length===5`));
    ok('the split is the rotation, with the days and minutes', a.run(`(p=>p.rotation.preset==='full'&&p.trainDays.join()==='1,3,5'&&p.minutes===45&&p.frequency===3)(DB.settings.plannerPreferences)`));
    ok('Today names the session and starts on its first exercise, not a run', /Full body/.test(a.w.document.querySelector('.today-focus-title')?.textContent||'')&&a.w.document.querySelector('.today-focus-next .btn')?.dataset.ex==='Leg Press', a.w.document.querySelector('.today-focus-next')?.textContent);
    ok('no crew prompt before a finished workout', a.run('adoptDue()')===false);
  }
  { const a=await app(); await a.tap('[data-onbact="local"]');await a.tap('[data-onbact="path"][data-v="fresh"]');
    await a.tap('[data-onbact="fexp"][data-v="exp"]');await a.tap('[data-onbact="fdays"][data-v="5"]');await a.tap('[data-onbact="fgoal"][data-v="strength"]');await a.tap('[data-onbact="fmin"][data-v="60"]');
    ok('5 days, experienced, strength: Push / Pull / Legs, barbell first at 5 reps', /Push \/ Pull \/ Legs/.test(a.q('.ob-sub').textContent)&&/Barbell Bench Press/.test(a.q('.ob-ex').textContent)&&/3 × 5/.test(a.q('.ob-ex').textContent)&&a.w.document.querySelectorAll('#onb .ob-ex').length===6);
    const miss=a.run(`Object.values(ONB_TPL).flatMap(t=>[...t.easy,...t.hard]).filter(e=>!Object.values(SEED0.catalog).flat().includes(e))`);
    ok('every template exercise is in the catalog', miss.length===0, miss);
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
