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
    ok('Basics: the goal and how many days (v4.6.378: a number, not weekdays)', a.run('onbStep')==='basics'&&!!a.q('.pf-segb[data-v="grow"].on')&&a.w.document.querySelectorAll('#onb .pf-dowb.on').length===1&&a.q('.pf-dowb.on').dataset.v==='3'&&!a.q('#onbName'));
    ok('one bar for the whole setup: 04 / 05', /04 \/ 05/.test(a.q('.ob-stepn').textContent));
    a.run(`window.__seg=document.querySelector('#onb .pf-seg')`);
    await a.tap('[data-onbact="fgoal"][data-v="strength"]');
    ok('a goal tap changes Basics in place: the same control, its thumb moved (so it slides)', a.run(`document.querySelector('#onb .pf-seg')===window.__seg&&window.__seg.style.getPropertyValue('--i')==='1'`));
    ok('the goal caption is the planner\'s own', /3 to 6 reps/.test(a.q('.pf-pref-cap').textContent));
    a.run(`window.__dow=document.querySelector('#onb .ob-count')`);
    await a.tap('[data-onbact="fcount"][data-v="5"]');
    ok('a count tap changes Basics in place', a.run(`document.querySelector('#onb .ob-count')===window.__dow`)&&a.q('.pf-dowb.on').dataset.v==='5'&&/5 days a week/.test(a.w.document.querySelectorAll('#onb .pf-pref-cap')[1].textContent));
    await a.tap('[data-onbact="fcount"][data-v="3"]');
    await a.tap('[data-onbact="frt"]');
    ok('03 Routine: a usable arrangement at once, Full body for three days', a.run('onbStep')==='routine'&&a.run('onbF.template')==='full'&&a.w.document.querySelectorAll('#onb .ob-rt-ses').length===3&&/Day 1/.test(a.q('.ob-rt-day').textContent));
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
    ok('a session moves up from its handle', a.run('onbF.cards[1].name')==='Legs'&&/Legs moved to Day 2/.test(a.q('.ob-rt-feed').textContent));
    await a.tap('[data-onbact="faddses"]');
    await a.tap('[data-onbact="fsave"]');
    ok('an empty session holds Looks good', a.run('onbStep')==='routine'&&/empty session/.test(a.q('.ob-rt-feed').textContent));
    await a.tap('[data-onbact="fundo"]');
    await a.tap('[data-onbact="back"]');await a.tap('[data-onbact="fcount"][data-v="4"]');await a.tap('[data-onbact="frt"]');
    ok('Back to Basics and a new day keeps your edits', a.run('onbF.cards[0].parts[0]')==='Run'&&a.run('onbF.cards.length')===3);
    ok('nothing is saved before Looks good', !a.run('DB.plan'));
    await a.tap('[data-onbact="fsave"]');
    ok('Looks good lands on Today, onboarded, units saved', a.run('view')==='today'&&!!a.run('DB.settings.onboarded')&&a.run('DB.settings.unit')==='lb');
    ok('your routine is the planner\'s order, names kept', a.run(`(p=>p.orderMode==='own'&&p.rotation.preset==='own'&&p.rotation.sessions[0].name==='Upper'&&p.rotation.sessions[1].name==='Legs'&&p.rotation.sessions[0].parts[0]==='Run'&&p.trainDays.length===0&&p.frequency===3)(DB.settings.plannerPreferences)`)&&a.run('DB.settings.objective')==='strength');
    ok('session 1 is planned today from the starters, 5 reps on the first lift', a.run(`DB.plan.d===todayISO&&DB.plan.title==='Upper'&&/^Run/.test(DB.plan.raw)`)&&/× 5/.test(a.run('DB.plan.raw')));
    ok('04 Today: session 1 opens with its run', /Upper/.test(a.w.document.querySelector('.today-focus-title')?.textContent||'')&&a.w.document.querySelector('.today-focus-next .btn')?.dataset.ex==='Run');
    ok('04 Today: the coming days from your routine show as planned days -- Tomorrow, then the rest; no second card (v4.6.380)', !a.w.document.querySelector('.tw')&&!!a.w.document.querySelector('.today-focus-upcoming,.today-focus-more'));
    ok('no workout logged and no timer started', a.run(`!(DB.days[todayISO]?.w||[]).length&&!isLive()`));
    ok('no crew prompt before a finished workout', a.run('adoptDue()')===false);
  }
  { const a=await app(); await a.toFork();await a.tap('[data-onbact="path"][data-v="fresh"]');await a.tap('[data-onbact="fcount"][data-v="4"]');await a.tap('[data-onbact="frt"]');
    ok('four days suggest Upper / Lower, alternating', a.run('onbF.template')==='ul'&&a.run(`onbF.cards.map(c=>c.name).join()`)==='Upper,Lower,Upper,Lower');
    await a.tap('[data-onbact="fsave"]');
    ok('an untouched Upper / Lower saves as two sessions, not four', a.run(`DB.settings.plannerPreferences.rotation.sessions.map(x=>x.name).join()`)==='Upper,Lower'&&a.run(`DB.settings.plannerPreferences.rotation.preset`)==='ul');
    ok('Today starts on a lift, not a run', a.w.document.querySelector('.today-focus-next .btn')?.dataset.ex!=='Run');
    const miss=a.run(`Object.entries(TRAIN_STARTERS).flatMap(([p,l])=>l.filter(e=>!catFor(p).includes(e)))`);
    ok('every starter is in the catalog', miss.length===0, miss);
  }
  /* v4.6.378: days are a number you can change on the Routine screen, and an Extra day sits apart */
  { const a=await app(); await a.toFork();await a.tap('[data-onbact="path"][data-v="fresh"]');await a.tap('[data-onbact="fcount"][data-v="5"]');await a.tap('[data-onbact="frt"]');
    ok('five days: Push / Pull / Legs on Day 1 to Day 5', a.run(`onbF.cards.map(c=>c.name).join()`)==='Push,Pull,Legs,Push,Pull'&&a.w.document.querySelectorAll('#onb .ob-rt-list .ob-rt-day')[4].textContent==='Day 5'&&/5 days · any days/.test(a.q('.ob-rt-plan').textContent));
    await a.tap('[data-onbact="faddses"]');
    ok('+ Add a day grows the template: Day 6 is Legs', a.run('onbF.cards.length')===6&&a.run('onbF.cards[5].name')==='Legs'&&/6 days/.test(a.q('.ob-rt-plan').textContent));
    await a.tap('[data-onbact="fask"][data-v="5"]');await a.tap('[data-onbact="fdrop"][data-v="5"]');
    ok('Remove day takes one away', a.run('onbF.cards.length')===5&&/5 days a week/.test(a.q('.ob-rt-feed').textContent));
    await a.tap('[data-onbact="faddx"]');
    ok('+ Add an extra day: a dashed Extra card, apart from the main days', !!a.q('.ob-rt-extra')&&a.q('.ob-rt-extra .ob-rt-day').textContent==='Extra'&&!a.q('.ob-rt-list .ob-rt-extra')&&/5 days \+ extra/.test(a.q('.ob-rt-plan').textContent));
    a.run(`onbPut('Sixpack',-1,null)`);
    ok('body parts go onto the Extra too', a.run(`onbF.extra.parts.join()`)==='Biceps,Triceps,Sixpack');
    await a.tap('[data-onbact="fundo"]');await a.tap('[data-onbact="fsave"]');
    ok('saved: five a week, no set weekdays, the Extra kept apart from the order', a.run(`(p=>p.frequency===5&&p.trainDays.length===0&&p.rotation.preset==='ppl'&&p.rotation.sessions.length===3&&p.extra.parts.join()==='Biceps,Triceps')(DB.settings.plannerPreferences)`), a.run('JSON.stringify(DB.settings.plannerPreferences)'));
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
