/* check-add-exercise.cjs -- v4.6.156: more sets become another exercise.
   Opens the real app in Chromium (402x874, iPhone safe areas), light and dark,
   on a planned Back day (Deadlift, Bent-Over Row, Pull Up; 14 sets with two
   warm-ups) over a logged history, and checks on the Total sets page:
   - the full point is what you actually do: 4 working sets each (the 135 lb
     deadlift warm-ups are under 80% of 235 and do not count), so + at 14 adds
     an exercise at once rather than a 5th set;
   - + adds the most recently done Back exercise not in the plan (Seated Cable
     Row, Sep 25), with your last load and reps, marked "added", growing to its
     own full point (4) before the next one (Lat Pulldown, Sep 21) starts;
   - - takes added exercises away before it trims anything planned;
   - x on an added exercise removes it and + skips it from then on;
   - Add exercise opens a sheet: Back first, most recent first, dates shown,
     exercises already in the plan disabled; a pick joins as "new" with its own
     sets and +/- then treat it like any planned exercise;
   - Keep changes saves the rows without the new/added marks;
   - with no history at all, + still adds sets (the pre-v4.6.156 spread).
   Nothing is logged. Serve the repo on 127.0.0.1:8784 first. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784;
const PLAN='Deadlift\n  135 lb × 8 (warm-up)\n  235 lb × 6 6 6 6\nBent-Over Row\n  135 lb × 12 (warm-up)\n  165 lb × 10 10 10 10\nPull Up\n  BW +25 lb × 6 6 6 6';
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
  const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)bad++;};
  try{
  const p=await b.newPage({viewport:{width:402,height:874},serviceWorkers:'block'});
  const cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:62,bottom:34,left:0,right:0}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
  await p.goto(`http://127.0.0.1:${PORT}/`);
  const boot=(theme,history)=>p.evaluate(({theme,history,PLAN})=>{
    const LB=2.20462,days={},set=(iso,ex,part,lb,reps,k)=>{(days[iso]=days[iso]||{w:[],lastAt:0,doneEx:[],donePart:[],doneAll:true,upd:1,sugX:{},planOpen:{}}).w.push({part,ex,w:lb/LB,reps:[reps],at:Date.parse(iso+'T18:00')+k*6e4});};
    if(history){
      const log=[['2026-09-25','Seated Cable Row','Back',130,[10,10,10,10]],['2026-09-21','Lat Pulldown','Back',120,[10,10,10]],['2026-09-10','Chest-Supported Row','Back',70,[12,12,12]],
        ['2026-09-18','Deadlift','Back',135,[8]],['2026-09-18','Deadlift','Back',235,[6,6,6,6]],['2026-09-11','Deadlift','Back',135,[8,8]],['2026-09-11','Deadlift','Back',225,[6,6,6,6]],
        ['2026-09-18','Bent-Over Row','Back',165,[10,10,10,10]],['2026-09-18','Pull Up','Back',25,[6,6,6,6]],['2026-09-20','Barbell Curl','Biceps',65,[10,10,10]]];
      let k=0;for(const [iso,ex,part,lb,reps] of log)for(const r of reps)set(iso,ex,part,lb,r,k++);
    }
    DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',flow:'refined',theme,bar:theme,mascotMotion:'still'}};
    todayISO='2026-09-28';checkDate=()=>false;document.querySelector('#onb')?.remove();SEED=deriveAll();applyTheme();view='today';render();
    pwOpen('2026-09-29');const s=pw();s.dates=['2026-09-29'];const d=pwDay('2026-09-29');d.rows=pwRead(PLAN);d.parts=['Back'];d.locks=[];
    s.active='2026-09-29';s.step='adjust';pwBeginAdjust();pwRender();
  },{theme,history,PLAN});
  const state=()=>p.evaluate(()=>{const s=pw();return {total:+document.querySelector('.pw-stepper output').textContent,
    rows:s.adjustRows.map(r=>`${r.ex}${r.added?'['+r.added+']':''}:${pwCounts([r]).total}`).join(', '),
    shown:[...document.querySelectorAll('#pw-live-rows .pw-exercise')].map(e=>e.querySelector('strong').textContent+(e.querySelector('.pw-added')?'['+e.querySelector('.pw-added').textContent+']':'')).join(', ')};});
  const click=async sel=>{await p.click(sel);await p.waitForTimeout(60);};
  for(const theme of ['dark','light']){
    await boot(theme,true);await p.waitForTimeout(200);
    let s=await state();
    ok(`${theme}: starts at 14, the note says what + does`, s.total===14&&await p.textContent('.pw-adjust p.pw-small')==='More sets add an exercise once each is full.', s.total);
    await click('[data-pw="set-plus"]');s=await state();
    ok(`${theme}: + at full adds the most recent Back exercise, not a 5th set`, s.rows==='Deadlift:5, Bent-Over Row:5, Pull Up:4, Seated Cable Row[added]:1'&&s.total===15, s.rows);
    ok(`${theme}: ...shown with its "added" mark`, /Seated Cable Row\[added\]/.test(s.shown), s.shown);
    const line=await p.evaluate(()=>pwText([pw().adjustRows.at(-1)]));
    ok(`${theme}: ...with your last load and reps`, /130 lb × 10/.test(line), line.replace(/\n/g,' | '));
    for(let i=0;i<4;i++)await click('[data-pw="set-plus"]');s=await state();
    ok(`${theme}: it grows to its own full point (4), then the next starts (Lat Pulldown)`, s.rows.endsWith('Seated Cable Row[added]:4, Lat Pulldown[added]:1')&&s.total===19, s.rows);
    for(let i=0;i<5;i++)await click('[data-pw="set-minus"]');s=await state();
    ok(`${theme}: - takes the added exercises away first`, s.rows==='Deadlift:5, Bent-Over Row:5, Pull Up:4'&&s.total===14, s.rows);
    await click('[data-pw="set-plus"]');await click('.pw-added-x');s=await state();
    ok(`${theme}: x removes an added exercise`, !/Seated Cable Row/.test(s.rows)&&s.total===14, s.rows);
    await click('[data-pw="set-plus"]');s=await state();
    ok(`${theme}: ...and + skips it from then on (Lat Pulldown next)`, /Lat Pulldown\[added\]:1$/.test(s.rows)&&!/Seated/.test(s.rows), s.rows);
    await click('[data-pw="set-minus"]');
    await click('[data-pw="add-open"]');
    const sheet=await p.evaluate(()=>({title:document.querySelector('#pw-add-title')?.textContent,
      parts:[...document.querySelectorAll('.pw-add-parts button')].map(b=>b.textContent+(b.classList.contains('on')?'*':'')).join(' '),
      list:[...document.querySelectorAll('.pw-add-pick')].map(b=>b.querySelector('strong').textContent+(b.disabled?'(in plan)':'')+' '+b.querySelector('i').textContent).join(' / ')}));
    ok(`${theme}: Add exercise opens "Add to Tuesday", Back first`, sheet.title==='Add to Tuesday'&&/^Back\*/.test(sheet.parts), sheet.title+' · '+sheet.parts);
    ok(`${theme}: ...every Back exercise you have done, most recent first, in-plan ones disabled`,
      sheet.list==='Seated Cable Row Sep 25 / Lat Pulldown Sep 21 / Bent-Over Row(in plan)  / Deadlift(in plan)  / Pull Up(in plan)  / Chest-Supported Row Sep 10', sheet.list);
    const fit=await p.evaluate(()=>{const r=document.querySelector('.pw-add-sheet').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth;});
    ok(`${theme}: ...the sheet fits the screen`, fit);
    await click('[data-pw="add-part"][data-part="Biceps"]');
    const bi=await p.evaluate(()=>[...document.querySelectorAll('.pw-add-pick strong')].map(e=>e.textContent).join(','));
    ok(`${theme}: another body part's chip lists its exercises`, bi==='Barbell Curl', bi);
    await click('[data-pw="add-part"][data-part="Back"]');
    await click('[data-pw="add-pick"][data-ex="Lat Pulldown"]');s=await state();
    ok(`${theme}: a pick joins as "new" with its usual sets (3): 14 → 17`, s.rows.endsWith('Lat Pulldown[new]:3')&&s.total===17&&!(await p.$('.pw-add-sheet')), s.rows);
    await click('[data-pw="set-plus"]');s=await state();
    ok(`${theme}: + after a pick adds the next one not in the plan and not removed (Chest-Supported Row; Seated Cable Row was x'd)`, /Lat Pulldown\[new\]:3, Chest-Supported Row\[added\]:1$/.test(s.rows), s.rows);
    await click('[data-pw="adjust-keep"]');
    const saved=await p.evaluate(()=>pwDay('2026-09-29').rows.map(r=>r.ex+(('added' in r)?'!':'')).join(', '));
    ok(`${theme}: Keep changes saves the exercises without the marks`, saved==='Deadlift, Bent-Over Row, Pull Up, Lat Pulldown, Chest-Supported Row', saved);
    if(theme==='dark'){await boot(theme,true);await click('[data-pw="set-plus"]');await click('[data-pw="add-open"]');await p.waitForTimeout(150);await p.screenshot({path:'../add-exercise-sheet.png'});}
  }
  await boot('dark',false);await p.waitForTimeout(150);
  await click('[data-pw="set-plus"]');let s=await state();
  ok('no history: + still adds a set (fits the ask; nothing to add, so the plan grows)', s.total===15&&!/added/.test(s.rows), s.rows);
  await click('[data-pw="add-open"]');
  const empty=await p.textContent('.pw-add-list');
  ok('no history: the sheet says so instead of an empty list', /Nothing logged for this body part yet/.test(empty), empty);
  if(errors.length){bad++;console.log('FAIL page errors: '+errors.join(' | '));}
  }finally{await b.close();}
  console.log(bad?`FAIL add exercise (${bad})`:'PASS add exercise');process.exit(bad?1:0);
})();
