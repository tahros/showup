/* test-onboarding-paths.js DIR -- v4.6.372: two ways in.
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
  const toFork=async()=>{await tap('[data-onbact="local"]');await tap('[data-onbact="toCrew"]');await tap('[data-onbact="skip"]');};
  return {w,run,q,tap,toFork};
}
(async()=>{
  { const a=await app();
    await a.tap('[data-onbact="local"]');
    ok('after the door: What should we call you?', a.run('onbStep')==='you'&&!!a.q('#onbName')&&!!a.q('[data-onbu="kg"]'));
    a.run(`onbBw='80';`);await a.tap('[data-onbu="lb"]');
    ok('bodyweight follows the unit (80 kg is 176.4 lb)', a.run('onbBw')==='176.4');
    await a.tap('[data-onbact="toCrew"]');
    ok('then: someone wants to come along', a.run('onbStep')==='crew'&&!!a.q('.ad-grid'));
    await a.tap('[data-onbact="skip"]');
    ok('then You\'re in, asking how you are starting', a.run('onbStep')==='fork'&&/You're in/.test(a.q('.ob-in').textContent)&&!!a.q('.ob-jump'));
        ok('two ways in, plus Just looking around', /How are you starting/.test(a.q('.ob-q').textContent)&&!!a.q('[data-onbact="path"][data-v="have"]')&&!!a.q('[data-onbact="path"][data-v="fresh"]')&&!!a.q('[data-onbact="look"]'));
    await a.tap('[data-onbact="path"][data-v="fresh"]');
    ok('Basics: the goal and the days', a.run('onbStep')==='basics'&&!!a.q('.pf-segb[data-v="grow"].on')&&a.w.document.querySelectorAll('#onb .pf-dowb.on').length===3&&!a.q('#onbName'));
    ok('one bar for the whole setup: 04 / 05', /04 \/ 05/.test(a.q('.ob-stepn').textContent));
    a.run(`window.__seg=document.querySelector('#onb .pf-seg')`);
    await a.tap('[data-onbact="fgoal"][data-v="strength"]');
    ok('a goal tap changes Basics in place: the same control, its thumb moved (so it slides)', a.run(`document.querySelector('#onb .pf-seg')===window.__seg&&window.__seg.style.getPropertyValue('--i')==='1'`));
    ok('the goal caption is the planner\'s own', /3 to 6 reps/.test(a.q('.pf-pref-cap').textContent));
    await a.tap('[data-onbact="fday"][data-v="1"]');await a.tap('[data-onbact="fday"][data-v="3"]');await a.tap('[data-onbact="fday"][data-v="5"]');
    ok('no days: See my routine is off', a.q('[data-onbact="frt"]').disabled);
    await a.tap('[data-onbact="fday"][data-v="1"]');await a.tap('[data-onbact="fday"][data-v="3"]');await a.tap('[data-onbact="fday"][data-v="5"]');
    await a.tap('[data-onbact="frt"]');
    ok('03 Routine: a usable arrangement at once, Full body for three days', a.run('onbStep')==='routine'&&a.run('onbF.template')==='full'&&a.w.document.querySelectorAll('#onb .ob-rt-ses').length===3&&/Mon/.test(a.q('.ob-rt-day').textContent));
    ok('collapsed sessions show three chips and +N', /\+2/.test(a.q('.ob-rt-ses').textContent));
    await a.tap('[data-onbact="fchange"]');
    ok('Change opens the sheet with five templates, Full body suggested', a.w.document.querySelectorAll('#onb .ob-tpl').length===5&&/Suggested/.test(a.q('.ob-tpl[data-v="full"]').textContent));
    a.run(`window.__sh=document.querySelector('#onb .ob-sheet')`);
    await a.tap('[data-onbact="ftpl"][data-v="ppl"]');
    ok('picking a template keeps the same sheet (no slide-in again)', a.run(`document.querySelector('#onb .ob-sheet')===window.__sh&&/Use Push/.test(window.__sh.textContent)`));
    ok('picking previews it on your days; nothing changes yet', /Push/.test(a.q('.ob-tpl-week').textContent)&&a.run('onbF.template')==='full');
    await a.tap('[data-onbact="fapply"]');
    ok('Use applies it', a.run('onbF.template')==='ppl'&&/Push/.test(a.q('.ob-rt-ses').textContent)&&!a.q('.ob-sheet'));
    await a.tap('[data-onbact="fundo"]');
    ok('Undo puts the last arrangement back', a.run('onbF.template')==='full');
    await a.tap('[data-onbact="fchange"]');await a.tap('[data-onbact="ftpl"][data-v="ppl"]');await a.tap('[data-onbact="fapply"]');
    await a.tap('[data-onbact="fcustom"]');
    ok('Customize shows the body-part tray', !!a.q('.ob-rt-tray')&&a.w.document.querySelectorAll('#onb .ob-rt-pool').length===8);
    await a.tap('[data-onbact="fpool"][data-v="Run"]');
    ok('tap a chip: each session without it offers Add', a.w.document.querySelectorAll('#onb [data-onbact="fplace"]').length===3);
    await a.tap('[data-onbact="fplace"][data-v="0"]');
    ok('...and Cardio goes first in Push', a.run('onbF.cards[0].parts[0]')==='Run'&&/Cardio added to Push/.test(a.q('.ob-rt-feed').textContent));
    ok('the title follows: Cardio + Push', a.run('onbF.cards[0].name')==='Cardio + Push');
    a.run(`onbPut('Back',0,null)`);a.run(`onbPut('Back',0,null)`);
    ok('no duplicate chips in a session', a.run(`onbF.cards[0].parts.filter(p=>p==='Back').length`)===1&&/already in/.test(a.q('.ob-rt-feed').textContent));
    a.run(`onbPut('Biceps',0,1)`);
    ok('a session title follows its body parts: a set that is no split reads its parts', a.run('onbF.cards[0].name')==='Cardio + Upper'&&a.run('onbF.cards[1].name')==='Back');
    ok('a chip moves between sessions', a.run(`onbF.cards[0].parts.includes('Biceps')&&!onbF.cards[1].parts.includes('Biceps')`));
    await a.tap('[data-onbact="fmenu"][data-v="2"]');await a.tap('[data-onbact="fmove"][data-v="2"][data-dir="-1"]');
    ok('a session moves up from its handle', a.run('onbF.cards[1].name')==='Legs'&&/Legs moved to Wed/.test(a.q('.ob-rt-feed').textContent));
    await a.tap('[data-onbact="faddses"]');
    await a.tap('[data-onbact="fsave"]');
    ok('an empty session holds Looks good', a.run('onbStep')==='routine'&&/empty session/.test(a.q('.ob-rt-feed').textContent));
    await a.tap('[data-onbact="fundo"]');
    await a.tap('[data-onbact="back"]');await a.tap('[data-onbact="fday"][data-v="6"]');await a.tap('[data-onbact="frt"]');
    ok('Back to Basics and a new day keeps your edits', a.run('onbF.cards[0].parts[0]')==='Run'&&a.run('onbF.cards.length')===3);
    ok('nothing is saved before Looks good', !a.run('DB.plan'));
    await a.tap('[data-onbact="fsave"]');
    ok('Looks good lands on Today, onboarded, units saved', a.run('view')==='today'&&!!a.run('DB.settings.onboarded')&&a.run('DB.settings.unit')==='lb');
    ok('your routine is the planner\'s order, names kept', a.run(`(p=>p.orderMode==='own'&&p.rotation.preset==='own'&&p.rotation.sessions[0].name==='Upper'&&p.rotation.sessions[1].name==='Legs'&&p.rotation.sessions[0].parts[0]==='Run'&&p.trainDays.length===4)(DB.settings.plannerPreferences)`)&&a.run('DB.settings.objective')==='strength');
    ok('session 1 is planned today from the starters, 5 reps on the first lift', a.run(`DB.plan.d===todayISO&&DB.plan.title==='Upper'&&/^Run/.test(DB.plan.raw)`)&&/× 5/.test(a.run('DB.plan.raw')));
    ok('04 Today: session 1 opens with its run', /Upper/.test(a.w.document.querySelector('.today-focus-title')?.textContent||'')&&a.w.document.querySelector('.today-focus-next .btn')?.dataset.ex==='Run');
    ok('04 Today: the week ahead from your routine, with Routine to edit it (v4.6.376)', /This week/.test(a.w.document.querySelector('.tw')?.textContent||'')&&!!a.w.document.querySelector('.tw [data-onbact="rotedit"]'));
    ok('no workout logged and no timer started', a.run(`!(DB.days[todayISO]?.w||[]).length&&!isLive()`));
    ok('no crew prompt before a finished workout', a.run('adoptDue()')===false);
  }
  { const a=await app(); await a.toFork();await a.tap('[data-onbact="path"][data-v="fresh"]');await a.tap('[data-onbact="fday"][data-v="2"]');await a.tap('[data-onbact="fday"][data-v="3"]');await a.tap('[data-onbact="fday"][data-v="4"]');await a.tap('[data-onbact="frt"]');
    ok('four days suggest Upper / Lower, alternating on Mon Tue Thu Fri', a.run('onbF.template')==='ul'&&a.run(`onbF.cards.map(c=>c.name).join()`)==='Upper,Lower,Upper,Lower');
    await a.tap('[data-onbact="fsave"]');
    ok('an untouched Upper / Lower saves as two sessions, not four', a.run(`DB.settings.plannerPreferences.rotation.sessions.map(x=>x.name).join()`)==='Upper,Lower'&&a.run(`DB.settings.plannerPreferences.rotation.preset`)==='ul');
    ok('Today starts on a lift, not a run', a.w.document.querySelector('.today-focus-next .btn')?.dataset.ex!=='Run');
    const miss=a.run(`Object.entries(TRAIN_STARTERS).flatMap(([p,l])=>l.filter(e=>!catFor(p).includes(e)))`);
    ok('every starter is in the catalog', miss.length===0, miss);
  }
  { const a=await app(); await a.toFork();await a.tap('[data-onbact="path"][data-v="have"]');
    ok('a routine: where is it now?', !!a.q('[data-onbact="have"][data-v="import"]')&&!!a.q('[data-onbact="have"][data-v="paste"]')&&!!a.q('[data-onbact="have"][data-v="log"]'));
    await a.tap('[data-onbact="have"][data-v="log"]');
    ok('log as I go lands on Train, every body part on', a.run('view')==='lift'&&a.run('DB.settings.myParts.length')>=7);
  }
  { const a=await app(); await a.toFork();await a.tap('[data-onbact="look"]');
    ok('Just looking around lands on Today with sample data on offer', a.run('view')==='today'&&a.run('DB.settings.lookAround')===1);
  }
  console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
