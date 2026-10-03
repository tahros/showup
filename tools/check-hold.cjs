/* check-hold.cjs -- v4.6.194: hold a weight. The exercise page gains a Weight
   switch (Progress / Hold) above Plans & suggestions; a held exercise wears a
   Hold tag in Plan and in Train, is offered at its held weight, and is listed
   in Settings with a way to release it.
   Covers: the switch (Progress on by default; a tap slides it, says the
   weight, re-renders nothing and moves nothing); it and Include / Avoid not
   disturbing each other; the tags; the prefilled weight; the Settings list
   and its Progress button; nothing overflowing. 320 and 402px, both themes.
   Serve the repo on 127.0.0.1:8784 first. */
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
      for(const d of ['2026-09-08','2026-09-15','2026-09-22','2026-09-29']){add(d,'Chest','Barbell Bench Press',135,[8,8,8,8]);add(d,'Chest','Incline Barbell Bench Press',175,[8,8,8,8]);add(d,'Chest','Cable Fly Down',11,[12,12,12]);}
      DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still'}};todayISO='2026-10-03';checkDate=()=>false;document.querySelector('#onb')?.remove();migrateCanon();SEED=deriveAll();applyTheme();save=()=>{};
      view='lift';lift={part:'Chest',ex:'Barbell Bench Press'};render();await new Promise(r=>setTimeout(r,800));
      const r=document.querySelector('.xh-seg').closest('.xp-row');scrollTo(0,r.getBoundingClientRect().top+scrollY-330);window.__row=r;},theme);
    const tap=async sel=>{await p.evaluate(sel=>document.querySelector(sel).click(),sel);await wait(350);};
    const st=()=>p.evaluate(()=>{const s=document.querySelector('.xh-seg'),n=document.getElementById('xhNote'),R=e=>e.getBoundingClientRect(),rows=[...document.querySelectorAll('#view .xp-row')];
      return {state:s.dataset.state,labels:[...s.querySelectorAll('button')].map(x=>x.textContent.trim()+(x.getAttribute('aria-pressed')==='true'?'*':'')).join(' '),note:n.hidden?'':n.textContent,
        order:rows.map(r=>r.querySelector('span').textContent.trim()).join(' / '),y:Math.round(R(s).top),same:s.closest('.xp-row')===window.__row,held:isHeld('Barbell Bench Press'),avoid:document.querySelector('.xp-seg:not(.xh-seg)').dataset.state,
        fits:document.documentElement.scrollWidth<=innerWidth&&[s,n,...s.querySelectorAll('button')].every(e=>e.hidden||(R(e).right<=innerWidth+.5&&R(e).left>=-.5))};});
    let s=await st();
    ok(`${tag} before Hold, the page suggests a heavier weight`,await p.evaluate(()=>!!document.querySelector('#view .nudge [data-nw]')));
    ok(`${tag} a Weight switch above Plans & suggestions, on Progress`,s.state==='progress'&&s.labels==='Progress* Hold'&&/Weight \/ Plans & suggestions$/.test(s.order)&&s.note===''&&!s.held,s);
    const y0=s.y;
    await tap('[data-exhold="hold"]');s=await st();
    ok(`${tag} Hold: the switch slides and the exercise is held`,s.state==='hold'&&s.labels==='Progress Hold*'&&s.held,s);
    ok(`${tag} ...the line under it states the weight`,/^Holding at 135 lb\. Plans and the next-set suggestion stay at this weight; reps can still move\.$/.test(s.note),s.note);
    ok(`${tag} ...in place: nothing re-renders, the switch does not move, nothing overflows`,s.same&&Math.abs(s.y-y0)<=1&&s.fits,[y0,s]);
    ok(`${tag} ...and the "try a heavier weight" nudge is gone, now and on the next visit`,await p.evaluate(async()=>{const a=!document.querySelector('#view .nudge [data-nw]');const y=scrollY;render();await new Promise(r=>setTimeout(r,500));scrollTo(0,y);window.__row=document.querySelector('.xh-seg').closest('.xp-row');return a&&!document.querySelector('#view .nudge [data-nw]');}));
    if(shots)await p.screenshot({path:`../hold-page-${theme}.png`});
    await tap('[data-expref="avoid"]');s=await st();
    ok(`${tag} Avoid moves its own switch and leaves Hold alone`,s.avoid==='avoid'&&s.state==='hold'&&s.held,s);
    await tap('[data-expref="include"]');
    await tap('[data-exhold="progress"]');s=await st();
    ok(`${tag} Progress releases it and the line goes`,s.state==='progress'&&!s.held&&s.note===''&&s.avoid==='include',s);
    await tap('[data-exhold="hold"]');
    /* Train: the tag, and the weight it offers */
    await p.evaluate(async()=>{DB.settings.exW={'Barbell Bench Press':155/2.20462};lift={part:'Chest',ex:null};render();await new Promise(r=>setTimeout(r,600));});
    let r=await p.evaluate(()=>({tags:Object.fromEntries([...document.querySelectorAll('.logmain')].map(x=>[x.dataset.ex,!!x.querySelector('.xh-tag')])),w:[...document.querySelectorAll('.logmain')].find(x=>x.dataset.ex==='Barbell Bench Press').querySelector('.pr-top').textContent.trim(),
      fits:document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.xh-tag')].every(e=>e.getBoundingClientRect().right<=innerWidth+.5)}));
    ok(`${tag} Train: the held exercise wears the tag, the others do not`,r.tags['Barbell Bench Press']===true&&r.tags['Incline Barbell Bench Press']===false&&r.fits,r);
    ok(`${tag} ...and is offered at its held weight, not the heavier one last dialled in`,r.w==='135 lb',r.w);
    /* Plan */
    await p.evaluate(async()=>{lift={part:null,ex:null};view='today';render();await new Promise(r=>setTimeout(r,300));const d='2026-10-05';pwOpen(d);const s=pw();s.dates=[d];const x=pwDay(d);
      x.rows=pwRead('Incline Barbell Bench Press\n  180 lb × 8 8 8 8\nBarbell Bench Press\n  135 lb × 8 8 8 8\nCable Fly Down\n  11 lb × 12 12 12');x.parts=['Chest'];x.locks=[];x.source='Your draft';s.active=d;s.step='edit';pfState().page='edit';pwRender();await new Promise(r=>setTimeout(r,500));
      scrollTo(0,document.querySelector('.pf-routine-card').getBoundingClientRect().top+scrollY-200);});
    r=await p.evaluate(()=>({rows:[...document.querySelectorAll('.pw-exercise')].map(a=>a.querySelector('strong').textContent+'|'+(a.querySelector('.pf-mtag')?.textContent||'')+'|'+(a.querySelector('.xh-tag')?.textContent.trim()||'')),
      fits:document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.xh-tag')].every(e=>e.getBoundingClientRect().right<=innerWidth+.5)}));
    ok(`${tag} Plan: Hold beside the muscle tag on the held exercise only`,r.rows.join(',')==='Incline Barbell Bench Press|Upper|,Barbell Bench Press|Mid|Hold,Cable Fly Down|Lower|'&&r.fits,r);
    if(shots)await p.screenshot({path:`../hold-plan-${theme}.png`});
    /* Settings */
    await p.evaluate(async()=>{lift.plan=null;view='sync';render();await new Promise(r=>setTimeout(r,600));const h=[...document.querySelectorAll('#view h2')].find(h=>/Holding weight/.test(h.textContent));if(h)scrollTo(0,h.getBoundingClientRect().top+scrollY-190);});await wait(300);
    r=await p.evaluate(()=>{const hs=[...document.querySelectorAll('#view h2')].map(h=>h.textContent.trim().toLowerCase()),c=[...document.querySelectorAll('#view h2')].find(h=>/Holding weight/.test(h.textContent))?.nextElementSibling;
      return {before:hs.indexOf('holding weight')>=0&&(hs.indexOf('avoided exercises')<0||hs.indexOf('holding weight')<hs.indexOf('avoided exercises')),text:c?.querySelector('.xp-item')?.textContent.replace(/\s+/g,' ')||'',btn:c?.querySelector('[data-xh-progress]')?.textContent,
        fits:document.documentElement.scrollWidth<=innerWidth&&!!c&&[...c.querySelectorAll('.xp-item,.xp-item button')].every(e=>e.getBoundingClientRect().right<=innerWidth+.5)};});
    ok(`${tag} Settings: Holding weight lists it with its weight`,r.before&&/Barbell Bench Press/.test(r.text)&&/at 135 lb/.test(r.text)&&/since Oct 3/.test(r.text)&&r.btn==='Progress'&&r.fits,r);
    if(shots)await p.screenshot({path:`../hold-settings-${theme}.png`});
    await tap('[data-xh-progress]');
    ok(`${tag} ...and Progress there releases it; the card goes when nothing is held`,await p.evaluate(()=>!isHeld('Barbell Bench Press')&&![...document.querySelectorAll('#view h2')].some(h=>/Holding weight/.test(h.textContent))));
    ok(`${tag} no page errors`,!errors.length,errors);
    await p.close();
  }
  }finally{await b.close();}
  console.log(bad?`FAIL hold (${bad})`:'PASS hold');process.exit(bad?1:0);
})();
