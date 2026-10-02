/* check-muscle-pick.cjs -- v4.6.188: an exercise's muscle is yours to set. An
   exercise you created took its body part's default muscle, so tags, focus,
   filters and swaps were wrong for it; and nothing let you overrule the app's
   own mapping.
   Covers the three places: Train's "Add your own exercise" form (a Muscle row;
   it starts on Train's filter or the part's first; choosing keeps the typed
   name), the exercise page (a Muscle card; a tap saves at once, in place, and
   edits no logged set; works for a built-in exercise too), and the Add sheet's
   new-exercise card (Muscle under Body part; starts on the day's focus;
   follows the body part; none for a one-muscle part). 320 and 402px, both
   themes. Serve the repo on 127.0.0.1:8784 first. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
  const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+(typeof g==='string'?g:JSON.stringify(g))));if(!c)bad++;};
  try{
  for(const theme of ['dark','light'])for(const width of [320,402]){
    const tag=`${theme} ${width}:`,shots=width===402;
    const p=await b.newPage({viewport:{width,height:874},deviceScaleFactor:shots?2:1,serviceWorkers:'block'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
    await p.goto(`http://127.0.0.1:${PORT}/?theme=${theme}`);await p.waitForLoadState('networkidle');await p.waitForTimeout(1200);
    await p.evaluate(async theme=>{
      const LB=2.20462,days={},add=(d,part,ex,lb,reps)=>{(days[d]=days[d]||{w:[]}).w.push({part,ex,w:lb/LB,bw:lb===0,reps,at:Date.parse(d+'T18:00')+(days[d]?.w.length||0)});};
      add('2026-09-30','Chest','Incline Barbell Bench Press',175,[6,6,6,4]);add('2026-09-05','Chest','Dip',45,[8,10,6]);add('2026-09-05','Chest','Barbell Bench Press',135,[7,6,5,8,8]);add('2026-09-29','Biceps','Dumbbell Curl',30,[10,10,10]);
      DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still'}};todayISO='2026-10-01';checkDate=()=>false;document.querySelector('#onb')?.remove();migrateCanon();SEED=deriveAll();applyTheme();
      save=()=>{};window.__sets=()=>JSON.stringify(Object.entries(DB.days).filter(([,v])=>(v.w||[]).length).map(([d,v])=>[d,v.w]));window.__log=window.__sets();
      view='lift';lift={part:'Chest',ex:null};render();await new Promise(r=>setTimeout(r,700));},theme);
    const tap=async sel=>{await p.evaluate(sel=>document.querySelector(sel).click(),sel);await wait(350);};
    const fits=()=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('[data-newmuscle],[data-exmuscle],[data-add-newmuscle],.xm-card')].every(e=>{const r=e.getBoundingClientRect();return r.right<=innerWidth+.5&&r.left>=-.5;}));
    /* A. Train's form */
    await tap('.mf-chip[data-mf="lower-chest"]');await tap('#addEx');
    let r=await p.evaluate(()=>[...document.querySelectorAll('[data-newmuscle]')].map(c=>c.textContent+(c.classList.contains('on')?'*':'')).join(' '));
    ok(`${tag} Train form: a Muscle row, starting on the filter's muscle`,r==='Upper Mid Lower*',r);
    await p.fill('#newExName','High Cable Press');await tap('[data-newmuscle="chest"]');
    r=await p.evaluate(()=>({name:document.getElementById('newExName').value,chips:[...document.querySelectorAll('[data-newmuscle]')].map(c=>c.textContent+(c.classList.contains('on')?'*':'')).join(' ')}));
    ok(`${tag} ...choosing a muscle keeps the typed name`,r.name==='High Cable Press'&&r.chips==='Upper Mid* Lower',r);
    ok(`${tag} ...fits`,await fits());
    if(shots){await p.evaluate(()=>{const h=[...document.querySelectorAll('#view h2')].find(x=>/Add an exercise/.test(x.textContent));scrollTo(0,h.getBoundingClientRect().top+scrollY-190);});await wait(200);await p.screenshot({path:`../muscle-pick-train-${theme}.png`});}
    await tap('#saveEx');await wait(400);
    r=await p.evaluate(()=>({m:exMuscle('High Cable Press','Chest'),ex:lift.ex,now:document.getElementById('xmNow')?.textContent,chips:[...document.querySelectorAll('[data-exmuscle]')].map(c=>c.textContent+(c.classList.contains('on')?'*':'')).join(' ')}));
    ok(`${tag} ...saved with that muscle, and its page says so`,r.m==='chest'&&r.ex==='High Cable Press'&&r.now==='Chest · Mid'&&r.chips==='Upper Mid* Lower',r);
    /* B. the exercise page */
    await p.evaluate(()=>{const c=document.querySelector('.xm-card');scrollTo(0,c.getBoundingClientRect().top+scrollY-330);window.__node=c;});await wait(200);
    const y0=await p.evaluate(()=>Math.round(document.querySelector('.xm-card').getBoundingClientRect().top));
    await tap('[data-exmuscle="lower-chest"]');
    r=await p.evaluate(()=>({m:exMuscle('High Cable Press','Chest'),now:document.getElementById('xmNow').textContent,on:document.querySelector('[data-exmuscle].on').textContent,pressed:document.querySelector('[data-exmuscle="lower-chest"]').getAttribute('aria-pressed'),same:document.querySelector('.xm-card')===window.__node,y:Math.round(document.querySelector('.xm-card').getBoundingClientRect().top)}));
    ok(`${tag} page: a tap saves the muscle at once`,r.m==='lower-chest'&&r.now==='Chest · Lower'&&r.on==='Lower'&&r.pressed==='true',r);
    ok(`${tag} ...in place: nothing re-renders, nothing moves`,r.same&&r.y===y0,[y0,r]);
    ok(`${tag} ...fits`,await fits());
    if(shots)await p.screenshot({path:`../muscle-pick-page-${theme}.png`});
    await p.evaluate(async()=>{lift={part:'Chest',ex:'Dip'};render();await new Promise(r=>setTimeout(r,600));});
    r=await p.evaluate(()=>document.getElementById('xmNow')?.textContent);
    await tap('[data-exmuscle="chest"]');
    ok(`${tag} a built-in exercise can be overruled (Dip: Lower → Mid), and no logged set is edited`,r==='Chest · Lower'&&await p.evaluate(()=>exMuscle('Dip','Chest')==='chest'&&window.__sets()===window.__log),r);
    await p.evaluate(async()=>{lift={part:'Chest',ex:null};render();await new Promise(r=>setTimeout(r,600));});
    r=await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('.logmain')].map(x=>[x.dataset.ex,x.querySelector('.mtag')?.textContent])));
    ok(`${tag} Train's tags follow`,r['High Cable Press']==='Lower'&&r['Dip']==='Mid',r);
    await p.evaluate(async()=>{setExMuscle('Dip','lower-chest');lift={part:'Biceps',ex:null,adding:true};render();await new Promise(r=>setTimeout(r,500));});
    ok(`${tag} a one-muscle body part: no Muscle row in the form`,await p.evaluate(()=>!!document.getElementById('newExName')&&!document.querySelector('[data-newmuscle]')));
    await p.evaluate(async()=>{lift={part:'Biceps',ex:'Dumbbell Curl'};render();await new Promise(r=>setTimeout(r,500));});
    ok(`${tag} ...and no Muscle card on its exercise pages`,await p.evaluate(()=>!document.querySelector('.xm-card')&&!!document.querySelector('.xp-row')));
    /* C. the Add sheet's new-exercise card */
    await p.evaluate(async()=>{lift={part:null,ex:null};view='today';render();await new Promise(r=>setTimeout(r,300));const d='2026-10-03';pwOpen(d);const s=pw();s.dates=[d];const x=pwDay(d);
      x.rows=pwRead('Dip\n  BW +50 lb × 10 10 10 10');x.parts=['Chest'];x.focus=['lower-chest'];x.focusGen=['lower-chest'];x.locks=[];x.source='Your draft';s.active=d;s.step='edit';pfState().page='edit';pwRender();await new Promise(r=>setTimeout(r,400));
      document.querySelector('[data-pw="add-open"]').click();await new Promise(r=>setTimeout(r,400));
      const i=document.getElementById('pw-add-q');i.focus();i.value='Standing Cable Squeeze';i.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,300));
      const o=document.querySelector('[data-add-newopen]');if(o){o.click();await new Promise(r=>setTimeout(r,300));}});
    const card=()=>p.evaluate(()=>({labs:[...document.querySelectorAll('.pw-add-new .pw-add-newlab')].map(e=>e.textContent).join(','),part:document.querySelector('[data-add-newpart].on')?.textContent,ms:[...document.querySelectorAll('[data-add-newmuscle]')].map(c=>c.textContent+(c.classList.contains('on')?'*':'')).join(' ')}));
    r=await card();
    ok(`${tag} Add sheet: Muscle under Body part, starting on the day's focus`,r.labs==='Body part,Muscle'&&r.part==='Chest'&&r.ms==='Upper Mid Lower*',r);
    ok(`${tag} ...fits`,await fits());
    if(shots)await p.screenshot({path:`../muscle-pick-add-${theme}.png`});
    await tap('[data-add-newpart="Legs"]');r=await card();
    ok(`${tag} ...the muscles follow the body part`,r.ms==='Quads* Hamstrings Glutes Calves',r);
    await tap('[data-add-newpart="Biceps"]');r=await card();
    ok(`${tag} ...and a one-muscle part has no Muscle row`,r.ms===''&&r.labs==='Body part',r);
    await tap('[data-add-newpart="Chest"]');await tap('[data-add-newmuscle="chest"]');
    await tap('.pw-add-new [data-pw="add-new"]');await wait(300);
    r=await p.evaluate(()=>({m:exMuscle('Standing Cable Squeeze','Chest'),part:(customs()['Standing Cable Squeeze']||{}).part,rows:pwExercises(pwDay(pw().active).rows).map(x=>x.ex).join(),tag:[...document.querySelectorAll('.pw-exercise')].map(a=>a.querySelector('strong').textContent+'|'+(a.querySelector('.pf-mtag')?.textContent||'')).join()}));
    ok(`${tag} ...Add creates it on that muscle, and the plan row wears it`,r.m==='chest'&&r.part==='Chest'&&r.rows==='Dip,Standing Cable Squeeze'&&/Standing Cable Squeeze\|Mid/.test(r.tag),r);
    ok(`${tag} no page errors`,!errors.length,errors);
    await p.close();
  }
  }finally{await b.close();}
  console.log(bad?`FAIL muscle pick (${bad})`:'PASS muscle pick');process.exit(bad?1:0);
})();
