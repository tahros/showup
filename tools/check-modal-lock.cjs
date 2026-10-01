/* check-modal-lock.cjs -- v4.6.179: a pop-up holds the page still. The
   maker's case: the planner's "Add to Friday" sheet open, a scroll past the
   sheet's own list moved the plan behind it and "↑ top" showed over the sheet.
   For the Add sheet (scroll past its end, scroll on the scrim, close by ×, by
   the scrim, by picking an exercise), the share preview and the "Complete
   today's workout?" dialog: the page does not move, the button is hidden,
   and closing puts the page back where it was. Light and dark, 320 and 402px.
   Nothing is logged to a real record. Serve the repo on 127.0.0.1:8784 first. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
  const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+g));if(!c)bad++;};
  try{
  for(const theme of ['light','dark'])for(const width of [320,402]){
    const tag=`${theme} ${width}:`;
    const p=await b.newPage({viewport:{width,height:874},serviceWorkers:'block',hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
    await p.goto(`http://127.0.0.1:${PORT}/?theme=${theme}`);await p.waitForLoadState('networkidle');await p.waitForTimeout(1200);
    /* the page's own position: scrollY normally, -body.top while pinned */
    const st=()=>p.evaluate(()=>{const t=document.getElementById('calReturn');return {at:Math.round(scrollY-(parseFloat(document.body.style.top)||0)),lock:document.documentElement.classList.contains('modal-open'),btn:!t.hidden&&getComputedStyle(t).display!=='none'};});
    const plan=async()=>{await p.evaluate(async theme=>{
      const days={};for(let i=1;i<120;i+=3){const d=new Date('2026-10-01T12:00');d.setDate(d.getDate()-i);days[d.toLocaleDateString('en-CA')]={w:['Squat','Leg Extension','Lying Leg Curl','Seated Leg Curl','Leg Press','Dumbbell Lunge','Hack Squat','Walking Lunge'].map((ex,k)=>({part:'Legs',ex,w:60+k*5,reps:[10,10,10],at:d.getTime()+k}))};}
      DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still'}};todayISO='2026-10-01';checkDate=()=>false;document.querySelector('#onb')?.remove();migrateCanon();SEED=deriveAll();applyTheme();
      view='today';render();await new Promise(r=>setTimeout(r,300));const d='2026-10-02';pwOpen(d);const s=pw();s.dates=[d];const x=pwDay(d);
      x.rows=pwRead(['Squat','Leg Extension','Lying Leg Curl','Triceps Pushdown','Skull Crusher','Hanging Leg Raise','Dumbbell Curl','Cable Crunch'].map(e=>e+'\n  45 lb × 12\n  50 lb × 10 10 10').join('\n'));x.parts=['Legs'];x.locks=[];x.source='Saved plan';s.active=d;s.step='edit';pfState().page='edit';pwRender();
      await new Promise(r=>setTimeout(r,500));window.scrollTo(0,700);},theme);await wait(300);};
    const openSheet=async()=>{await p.evaluate(()=>document.querySelector('[data-pw="add-open"]').click());await wait(400);};
    await plan();
    let r0=await st();
    ok(`${tag} before: the plan is scrolled and "↑ top" shows`,r0.at===700&&r0.btn&&!r0.lock,JSON.stringify(r0));
    await openSheet();
    let r=await st();
    ok(`${tag} Add sheet open: page held at the same place, button hidden`,r.lock&&r.at===700&&!r.btn,JSON.stringify(r));
    await p.mouse.move(width/2,820);for(let i=0;i<8;i++){await p.mouse.wheel(0,500);await wait(60);}await wait(300);
    r=await st();const inner=await p.evaluate(()=>document.querySelector('.pw-add-sheet').scrollTop);
    ok(`${tag} scrolling past the sheet's list moves the sheet, not the page`,r.at===700&&inner>0&&!r.btn,JSON.stringify({...r,inner}));
    await p.mouse.move(width/2,120);for(let i=0;i<4;i++){await p.mouse.wheel(0,-500);await wait(60);}await wait(300);
    r=await st();
    ok(`${tag} scrolling on the dimmed backdrop moves nothing`,r.at===700&&!r.btn,JSON.stringify(r));
    /* v4.6.180: A FINGER DRAG ON THE SHEET MOVES NOTHING BUT THE SHEET'S LIST.
       Real touch input (not wheel): the app's own gestures -- pull-to-refresh
       on a downward drag, the rubber band on an upward one -- shift #view with
       a transform, and a transformed #view re-anchors its position:fixed
       children: the sheet left the bottom edge and rode up the screen. Measured
       MID-DRAG, finger still down. */
    const cdp=await p.context().newCDPSession(p);
    const drag=async(x,y0,y1)=>{
      const pt=y=>[{x,y,id:1,radiusX:8,radiusY:8,force:1}];
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pt(y0)});
      for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pt(y0+(y1-y0)*i/8)});await wait(25);}
      const mid=await p.evaluate(()=>{const v=document.getElementById('view'),sh=document.querySelector('.pw-add-sheet'),sc=document.querySelector('.pw-add-scrim');
        return {tf:getComputedStyle(v).transform,sheetBottom:Math.round(sh.getBoundingClientRect().bottom),scrimTop:Math.round(sc.getBoundingClientRect().top),scrimBottom:Math.round(sc.getBoundingClientRect().bottom),h:innerHeight,cls:document.body.className};});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(350);
      return mid;};
    const still=m=>m.tf==='none'&&m.sheetBottom===m.h&&m.scrimTop===0&&m.scrimBottom===m.h&&!/pulling|banding/.test(m.cls);
    let m=await drag(width/2,560,800);
    ok(`${tag} finger drags DOWN on the sheet: it stays on the bottom edge (no pull-to-refresh)`,still(m),JSON.stringify(m));
    m=await drag(width/2,800,420);
    ok(`${tag} finger drags UP on the sheet: it stays on the bottom edge (no rubber band)`,still(m),JSON.stringify(m));
    m=await drag(width/2,120,330);
    ok(`${tag} finger drags on the backdrop: nothing shifts`,still(m)&&await p.evaluate(()=>!!document.querySelector('.pw-add-sheet')),JSON.stringify(m));
    r=await st();
    ok(`${tag} ...and the page behind is where it was`,r.lock&&r.at===700,JSON.stringify(r));
    await p.evaluate(()=>document.querySelector('.pw-add-close').click());await wait(400);
    r=await st();
    ok(`${tag} closed by ×: back at the same place, button back`,!r.lock&&r.at===700&&r.btn,JSON.stringify(r));
    await openSheet();await p.mouse.click(width/2,60);await wait(400);
    r=await st();
    ok(`${tag} closed by the backdrop: unlocked, same place`,!r.lock&&r.at===700,JSON.stringify(r));
    await openSheet();await p.evaluate(()=>[...document.querySelectorAll('.pw-add-pick[data-ex]:not([disabled])')][0].click());await wait(500);
    r=await st();
    ok(`${tag} closed by picking an exercise: unlocked`,!r.lock&&await p.evaluate(()=>document.body.style.position===''),JSON.stringify(r));
    /* the share preview */
    await p.evaluate(async()=>{lift.plan=null;view='stats';render();await new Promise(r=>setTimeout(r,600));window.scrollTo(0,900);});await wait(300);
    const y0=(await st()).at;
    await p.evaluate(async()=>{const c=shareCards()[0];await showCard(c.draw,c.label,true);});await wait(400);
    r=await st();
    ok(`${tag} share preview open: page held, button hidden`,r.lock&&r.at===y0&&!r.btn,JSON.stringify({...r,y0}));
    await p.evaluate(()=>document.getElementById('repClose').click());await wait(300);
    r=await st();
    ok(`${tag} share preview closed: back at the same place`,!r.lock&&r.at===y0,JSON.stringify({...r,y0}));
    /* the Complete-workout dialog */
    await p.evaluate(async()=>{const now=Date.now();DB.days[todayISO]={w:[{part:'Legs',ex:'Squat',w:100,reps:[5],at:now-60000}]};SEED=deriveAll();lastSetAt=now-60000;view='stats';render();await new Promise(r=>setTimeout(r,500));window.scrollTo(0,800);await new Promise(r=>setTimeout(r,200));openWorkoutFinish();});await wait(400);
    r=await st();const y1=r.at;
    ok(`${tag} Complete-workout dialog: page locked, button hidden`,r.lock&&!r.btn&&y1>0,JSON.stringify(r));
    await p.evaluate(()=>document.getElementById('workoutKeepTraining').click());await wait(300);
    r=await st();
    ok(`${tag} ...Keep training unlocks, same place`,!r.lock&&r.at===y1,JSON.stringify({...r,y1}));
    if(errors.length){bad++;console.log('FAIL page errors: '+errors.join(' | '));}
    await p.close();
  }
  }finally{await b.close();}
  console.log(bad?`FAIL modal lock (${bad})`:'PASS modal lock');process.exit(bad?1:0);
})();
