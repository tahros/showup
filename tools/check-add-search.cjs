/* check-add-search.cjs -- v4.6.181: search in the planner's Add sheet. The
   maker's complaint about the old "Type an exercise" screen: the name could
   not be typed, the list was the whole catalog in catalog order, it was too
   long, and it sat at the top of an empty page. Now: a search box in the
   sheet; yours first (the day's body parts, then most recent), then not tried;
   at most eight rows; one tap adds; a name the app does not know becomes one
   of yours under the body part you choose. Light and dark, 320 and 402px.
   Nothing is logged to a real record. Serve the repo on 127.0.0.1:8784 first. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
  const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+g));if(!c)bad++;};
  try{
  for(const theme of ['light','dark'])for(const width of [320,402]){
    const tag=`${theme} ${width}:`,shots=theme==='light'&&width===402;
    const p=await b.newPage({viewport:{width,height:874},deviceScaleFactor:shots?2:1,serviceWorkers:'block'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
    await p.goto(`http://127.0.0.1:${PORT}/?theme=${theme}`);await p.waitForLoadState('networkidle');await p.waitForTimeout(1200);
    await p.evaluate(async theme=>{
      const LB=2.20462,days={},add=(d,part,ex,lb,reps)=>{(days[d]=days[d]||{w:[]}).w.push({part,ex,w:lb/LB,reps,at:Date.parse(d+'T18:00')+Object.keys(days).length});};
      add('2026-09-27','Biceps','Dumbbell Curl',30,[10,10,10]);add('2026-09-27','Biceps','EZ Bar Curl',60,[10,10,10]);add('2026-09-27','Biceps','Hammer Curl',30,[12,12,12]);add('2026-07-23','Biceps','Barbell Curl',44,[20,20,20,12]);
      add('2026-09-22','Legs','Lying Leg Curl',90,[12,12,12]);add('2026-08-22','Legs','Seated Leg Curl',80,[12,12]);add('2026-09-20','Triceps','Triceps Pushdown',50,[8,8,8,8]);add('2026-09-10','Biceps','Preacher Curl',50,[10,10]);
      DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still'}};todayISO='2026-10-01';checkDate=()=>false;document.querySelector('#onb')?.remove();migrateCanon();setExPref('Preacher Curl','avoid');SEED=deriveAll();applyTheme();
      view='today';render();await new Promise(r=>setTimeout(r,300));const d='2026-10-02';pwOpen(d);const s=pw();s.dates=[d];const x=pwDay(d);
      x.rows=pwRead('Dumbbell Curl\n  30 lb × 10 10 10\nEZ Bar Curl\n  60 lb × 10 10 10\nHammer Curl\n  30 lb × 12 12 12\nTriceps Pushdown\n  50 lb × 8 8 8 8');x.parts=['Biceps','Triceps'];x.locks=[];x.source='Saved plan';s.active=d;s.step='edit';pfState().page='edit';pwRender();
      await new Promise(r=>setTimeout(r,500));},theme);
    const open=async()=>{await p.evaluate(()=>document.querySelector('[data-pw="add-open"]').click());await wait(350);};
    const res=()=>p.evaluate(()=>({focus:document.activeElement&&document.activeElement.id,tall:document.querySelector('.pw-add-sheet')?.classList.contains('pw-add-tall'),
      rows:[...document.querySelectorAll('.pw-add-results .pw-add-pick')].map(x=>x.querySelector('strong').textContent+(x.disabled?'*':'')+(x.querySelector('.xp-tag')?'!':'')),
      heads:[...document.querySelectorAll('.pw-add-results .pw-add-h')].map(x=>x.textContent),more:document.querySelector('.pw-add-more')?.textContent||'',marks:document.querySelectorAll('.pw-add-results mark').length,
      overflow:document.documentElement.scrollWidth>innerWidth,inputRow:(()=>{const l=document.querySelector('.pw-add-search'),i=l.querySelector('input'),m=l.querySelector('svg');const a=l.getBoundingClientRect(),c=i.getBoundingClientRect(),d=m.getBoundingClientRect();return c.top>=a.top&&c.bottom<=a.bottom&&d.right<=c.left+1&&parseFloat(getComputedStyle(i).fontSize)>=16;})()}));
    const planRows=()=>p.evaluate(()=>pwDay(pw().active).rows.map(r=>r.ex).join());
    await open();
    let r=await p.evaluate(()=>({q:!!document.getElementById('pw-add-q'),type:!!document.querySelector('.pw-add-type'),tabs:document.querySelectorAll('.pw-add-parts [data-pw="add-part"]').length,tall:document.querySelector('.pw-add-sheet').classList.contains('pw-add-tall')}));
    ok(`${tag} the sheet has a search box, the body-part tabs, and no "Type an exercise…" row`,r.q&&!r.type&&r.tabs>=2&&!r.tall,JSON.stringify(r));
    if(shots)await p.screenshot({path:'../add-search-1.png'});
    await p.click('#pw-add-q');await p.keyboard.type('cur',{delay:25});await wait(200);
    r=await res();
    ok(`${tag} typing keeps the cursor in the box; the sheet stands tall; the box is one row at 16px`,r.focus==='pw-add-q'&&r.tall&&r.inputRow&&!r.overflow,JSON.stringify(r));
    ok(`${tag} yours first: the day's body part and still addable (Barbell Curl), then in the plan, then other parts`,r.rows.slice(0,6).join('|')==='Barbell Curl|Dumbbell Curl*|EZ Bar Curl*|Hammer Curl*|Lying Leg Curl|Seated Leg Curl',r.rows.join('|'));
    ok(`${tag} an avoided exercise of yours stays out of the top rows (it sorts last)`,!r.rows.slice(0,6).some(x=>/Preacher/.test(x)),r.rows.join('|'));
    ok(`${tag} then "Not tried yet"; at most eight rows, with the rest counted`,r.heads.length===2&&/^Yours/.test(r.heads[0])&&r.heads[1]==='Not tried yet'&&r.rows.length<=8&&/\d+ more · keep typing/.test(r.more)&&r.marks>=r.rows.length,JSON.stringify({h:r.heads,n:r.rows.length,more:r.more}));
    if(shots)await p.screenshot({path:'../add-search-2.png'});
    await p.fill('#pw-add-q','');await p.keyboard.type('preacher');await wait(150);
    const av=await res();
    ok(`${tag} ...but searching its name finds it, tagged "avoided"`,av.rows[0]==='Preacher Curl!',av.rows.join('|'));
    await p.fill('#pw-add-q','');await p.keyboard.type('curl');await wait(150);   /* "curl" -- not an exact name */
    await p.click('.pw-add-results [data-pw="add-pick"][data-ex="Barbell Curl"]');await wait(400);
    r=await p.evaluate(()=>({rows:pwDay(pw().active).rows.map(x=>x.ex).join(),last:pwText([pwDay(pw().active).rows.at(-1)]),sheet:!!document.querySelector('.pw-add-sheet'),step:pw().step,lock:document.documentElement.classList.contains('modal-open')}));
    ok(`${tag} one tap adds it with your last sets; no Preview, no text screen`,r.rows.endsWith('Barbell Curl')&&/44 lb × 20 20 20 12/.test(r.last)&&!r.sheet&&r.step==='edit'&&!r.lock,JSON.stringify(r));
    /* a catalog exercise you have not done */
    await open();await p.click('#pw-add-q');await p.keyboard.type('cable cu',{delay:15});await wait(200);
    await p.click('.pw-add-results [data-pw="add-new"][data-ex="Cable Curl"]');await wait(400);
    r=await p.evaluate(()=>({last:pwText([pwDay(pw().active).rows.at(-1)]),custom:Object.keys(DB.settings.custom||{}).length}));
    ok(`${tag} a not-tried exercise starts by feel and is not turned into a custom one`,/Cable Curl\n\s+by feel × 10 10 10/.test(r.last)&&r.custom===0,JSON.stringify(r));
    /* a name the app does not know */
    await open();await p.click('#pw-add-q');await p.keyboard.type('zercher squat',{delay:10});await wait(200);
    r=await p.evaluate(()=>({card:document.querySelector('.pw-add-new strong')?.textContent,on:document.querySelector('.pw-add-newparts .on')?.textContent,rows:document.querySelectorAll('.pw-add-results .pw-add-pick').length,focus:document.activeElement.id,fits:(()=>{const c=document.querySelector('.pw-add-new').getBoundingClientRect();return c.right<=innerWidth&&c.left>=0;})()}));
    ok(`${tag} an unknown name offers Add “Zercher Squat”, the day's body part preselected`,r.card==='Add “Zercher Squat”'&&r.on==='Biceps'&&r.rows===0&&r.focus==='pw-add-q'&&r.fits,JSON.stringify(r));
    await p.click('[data-add-newpart="Legs"]');await wait(150);
    r=await p.evaluate(()=>({on:document.querySelector('.pw-add-newparts .on')?.textContent,q:document.getElementById('pw-add-q').value,go:document.querySelector('.pw-add-go').dataset.part}));
    ok(`${tag} choosing Legs changes only the choice (the typed name stays)`,r.on==='Legs'&&r.q==='zercher squat'&&r.go==='Legs',JSON.stringify(r));
    if(shots)await p.screenshot({path:'../add-search-3.png'});
    await p.click('.pw-add-go');await wait(400);
    r=await p.evaluate(()=>({last:pwText([pwDay(pw().active).rows.at(-1)]),c:DB.settings.custom&&DB.settings.custom['Zercher Squat'],home:homePartOf('Zercher Squat'),known:pwRead('Zercher Squat\n  100 lb × 5')[0].ex,sheet:!!document.querySelector('.pw-add-sheet')}));
    ok(`${tag} it becomes one of your exercises under Legs and joins the plan by feel`,/Zercher Squat\n\s+by feel × 10 10 10/.test(r.last)&&r.c&&r.c.part==='Legs'&&r.home==='Legs'&&r.known==='Zercher Squat'&&!r.sheet,JSON.stringify(r));
    /* found again next time, now as known; the clear button; Enter */
    await open();await p.click('#pw-add-q');await p.keyboard.type('zercher',{delay:10});await wait(200);
    r=await res();
    ok(`${tag} next time it is found by search (in this plan), not offered as new`,r.rows[0]==='Zercher Squat*'&&!(await p.$('.pw-add-new')),r.rows.join('|'));
    await p.click('.pw-add-clear');await wait(200);
    r=await p.evaluate(()=>({q:document.getElementById('pw-add-q').value,tabs:!!document.querySelector('.pw-add-parts'),focus:document.activeElement.id,clr:document.querySelector('.pw-add-clear').hidden}));
    ok(`${tag} × clears the search and brings the body-part list back, cursor still in the box`,r.q===''&&r.tabs&&r.focus==='pw-add-q'&&r.clr,JSON.stringify(r));
    const n0=(await planRows()).split(',').length;
    await p.keyboard.type('seated leg');await wait(150);await p.keyboard.press('Enter');await wait(400);
    ok(`${tag} Enter adds the first result`,(await planRows()).endsWith('Seated Leg Curl')&&(await planRows()).split(',').length===n0+1,await planRows());
    await open();await p.click('#pw-add-q');await p.keyboard.type('xyz');await p.keyboard.press('Escape');await wait(250);
    ok(`${tag} Escape closes the sheet and adds nothing`,!(await p.$('.pw-add-sheet'))&&(await planRows()).split(',').length===n0+1&&await p.evaluate(()=>!document.documentElement.classList.contains('modal-open')));
    if(errors.length){bad++;console.log('FAIL page errors: '+errors.join(' | '));}
    await p.close();
  }
  }finally{await b.close();}
  console.log(bad?`FAIL add search (${bad})`:'PASS add search');process.exit(bad?1:0);
})();
