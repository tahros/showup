const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
 const p=await b.newPage({viewport:{width:393,height:852},serviceWorkers:'block'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());await p.goto('http://127.0.0.1:8784/');
 await p.evaluate(()=>{DB={days:{},settings:{onboarded:true,unit:'lb',mascotMotion:'still'}};todayISO='2026-09-15';checkDate=()=>false;document.querySelector('#onb')?.remove();SEED=deriveAll();view='today';render();});
 assert(await p.locator('#liveWorkoutBar').isHidden());
 await p.evaluate(()=>{DB.days[todayISO]={w:[{part:'Back',ex:'Deadlift',w:100,reps:[8,8,6],at:Date.now()-42*60000}],doneEx:[],donePart:[],upd:1};SEED=deriveAll();render();});
 assert(await p.locator('#liveWorkoutBar').isVisible());assert((await p.locator('.live-workout-meta').innerText()).includes('3 sets'));
 assert.equal(await p.locator('#nav button').count(),4);assert.equal(await p.locator('#view #doneAllBtn').count(),0);
 const before=await p.evaluate(()=>JSON.stringify(DB.days));
 await p.locator('#liveWorkoutFinish').click();assert(await p.locator('#workoutFinishDialog').isVisible());
 await p.locator('#workoutKeepTraining').click();assert.equal(await p.evaluate(()=>JSON.stringify(DB.days)),before);
 for(const width of [320,393,430])for(const theme of ['light','dark']){
  await p.setViewportSize({width,height:852});await p.evaluate(theme=>{DB.settings.theme=theme;applyTheme();render();},theme);
  for(const v of ['today','lift','stats','history']){
   await p.evaluate(v=>{view=v;lift.part=null;lift.ex=null;render();},v);await p.waitForTimeout(100);
   const g=await p.evaluate(()=>{const a=document.querySelector('#liveWorkoutBar').getBoundingClientRect(),n=document.querySelector('#nav').getBoundingClientRect();return {gap:n.top-a.bottom,left:a.left,right:a.right,overflow:document.documentElement.scrollWidth>innerWidth,padding:parseFloat(getComputedStyle(document.querySelector('#app')).paddingBottom)};});
   assert(g.gap>=9);assert(g.left>=0&&g.right<=width+1);assert(!g.overflow);assert(g.padding>=190);
  }
 }
 await p.evaluate(()=>{view='lift';lift.part='Run';render();});assert.equal(await p.locator('#view #doneAllBtn').count(),0);
 await p.locator('#liveWorkoutFinish').click();await p.keyboard.press('Escape');assert.equal(await p.locator('#workoutFinishDialog').count(),0);
 await p.locator('#liveWorkoutFinish').click();await p.locator('#doneAllBtn').click();
 assert(await p.evaluate(()=>DB.days[todayISO].doneAll));assert(await p.locator('#dayDone').isVisible());assert(await p.locator('#liveWorkoutBar').isHidden());
 assert.equal(await p.evaluate(()=>JSON.stringify(DB.days[todayISO].w)),JSON.stringify(JSON.parse(before)['2026-09-15'].w));
 await p.locator('#dayDone button').filter({hasText:/^Done$/}).click();
 await p.evaluate(()=>{plLog({part:'Back',ex:'Deadlift',w:100,reps:[8],at:Date.now()});reopen('Deadlift','Back');renderHeader();renderLift();});
 assert(await p.locator('#liveWorkoutBar').isVisible());assert((await p.locator('.live-workout-meta').innerText()).includes('4 sets'));
 await p.evaluate(()=>{DB.days[todayISO].w.forEach(s=>delete s.at);render();});assert(!(await p.locator('.live-workout-meta').innerText()).includes('min'));
 await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('.live-workout-title i').evaluate(e=>getComputedStyle(e).animationName),'none');
 await p.screenshot({path:'../live-workout-implemented.png',fullPage:false});
 await p.evaluate(()=>{pwOpen('2026-09-17');pw().dates=['2026-09-17'];const d=pwDay('2026-09-17');d.rows=pwRead('Squat\n195 lb × 8 8 8');d.parts=['Legs'];pw().active='2026-09-17';pfAnchor();pfNavigate('days');});
 await p.waitForTimeout(150);
 const spacing=await p.evaluate(()=>({dock:document.querySelector('.pw-save-dock').getBoundingClientRect().bottom,bar:document.querySelector('#liveWorkoutBar').getBoundingClientRect().top}));assert(spacing.dock<=spacing.bar-7);
 assert.deepEqual(errors,[]);console.log('PASS no-plan, empty, grouped sets, 24 mobile tab/theme layouts, single control, cancel/Escape, completion, reopen, unknown duration, reduced motion, no runtime errors');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
