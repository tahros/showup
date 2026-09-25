const {chromium}=require('playwright'),assert=require('assert');
const origin='http://127.0.0.1:'+(process.env.PW_PORT||8843)+'/';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
 try{
 const p=await b.newPage({viewport:{width:393,height:852},serviceWorkers:'block'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 await p.goto(origin);
 await p.evaluate(()=>{
  DB={days:{},settings:{onboarded:true,unit:'lb',skin:'minimal',flow:'refined',theme:'light',bar:'light',mascotMotion:'still',liveFold:true}};
  todayISO='2026-09-24';checkDate=()=>false;document.querySelector('#onb')?.remove();SEED=deriveAll();view='today';applyTheme();render();
 });
 for(const theme of ['light','dark'])for(const width of [320,393,430]){
  await p.setViewportSize({width,height:852});
  await p.evaluate(theme=>{DB.settings.theme=theme;DB.settings.bar=theme;applyTheme();render();},theme);
  await p.waitForTimeout(150);
  const normal=await p.evaluate(()=>{
   const h=document.querySelector('header'),g=h.querySelector('.hglass'),n=document.querySelector('#nav');
   return {height:h.getBoundingClientRect().height,title:getComputedStyle(document.querySelector('#hDate')).fontSize,
    gear:document.querySelector('.nav-settings-gear').getBoundingClientRect().width,
    material:getComputedStyle(g).backgroundImage,nav:getComputedStyle(n,'::before').backgroundImage};
  });
  assert.equal(normal.height,64,JSON.stringify(normal));assert.equal(normal.title,'14px');assert.equal(normal.gear,24);
  assert.equal(normal.material,normal.nav);assert.equal(await p.locator('#nav button').count(),4);
  const alignment=await p.evaluate(()=>[...document.querySelectorAll('#nav .ng')].map(e=>{const r=e.getBoundingClientRect();return r.top+r.height/2}));
  assert(Math.max(...alignment)-Math.min(...alignment)<1,'all five icons share a center line');
  if(width===393)await p.screenshot({path:'../floating-normal-'+theme+'.png'});
 }
 await p.evaluate(()=>{
  DB.days[todayISO]={w:[{part:'Chest',ex:'Incline Barbell Bench Press',w:75,reps:[8,8,6],at:Date.now()}],lastAt:Date.now(),doneEx:[],donePart:[],upd:1,sugX:{},planOpen:{}};
  lastSetAt=Date.now();SEED=deriveAll();view='lift';lift.part='Chest';lift.ex='Incline Barbell Bench Press';render();tickRest();
 });
 const before=await p.evaluate(()=>JSON.stringify(DB.days));
 for(const theme of ['light','dark'])for(const width of [320,393,430]){
  await p.setViewportSize({width,height:852});
  await p.evaluate(theme=>{DB.settings.theme=theme;DB.settings.bar=theme;applyTheme();render();tickRest();},theme);
  await p.waitForTimeout(200);
  const g=await p.evaluate(()=>{
   const h=document.querySelector('header'),f=document.querySelector('#liveWorkoutFinish'),t=document.querySelector('#hTimer');
   return {header:h.getBoundingClientRect().toJSON(),finish:f.getBoundingClientRect().toJSON(),timer:t.getBoundingClientRect().toJSON(),
    title:getComputedStyle(document.querySelector('#hDate')).fontSize,extra:getComputedStyle(document.documentElement).getPropertyValue('--live-workout-extra'),
    ink:getComputedStyle(document.querySelector('#hDate')).color,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert(await p.locator('#liveWorkoutFinish').isVisible());
  assert.equal(await p.locator('header #liveWorkoutBar').count(),1);
  assert(g.timer.right<=g.finish.left+1,JSON.stringify(g));assert(g.finish.right<=g.header.right);assert(!g.overflow);
  assert.equal(g.title,'14px');assert.equal(g.ink,'rgb(255, 255, 255)');assert.equal(g.extra.trim(),'0px');
  if(width===393)await p.screenshot({path:'../floating-header-'+theme+'.png'});
 }
 for(const skin of ['classic','minimal','retro']){
  await p.evaluate(skin=>{DB.settings.skin=skin;applyTheme();render();tickRest();},skin);
  assert(await p.locator('#liveWorkoutFinish').isVisible());
  assert.equal(await p.locator('#nav button').count(),4);
 }
 await p.evaluate(()=>{DB.settings.skin='minimal';applyTheme();render();tickRest()});
 await p.setViewportSize({width:320,height:852});
 await p.evaluate(()=>{lift.ex='Very Long Single Arm Incline Dumbbell Bench Press';renderHeader();syncHeaderHeight()});
 await p.waitForTimeout(100);
 const long=await p.evaluate(()=>({bottom:document.querySelector('header').getBoundingClientRect().bottom,pad:parseFloat(getComputedStyle(document.querySelector('#app')).paddingTop)}));
 assert(long.pad>=long.bottom,'long title reserves its measured height');
 await p.evaluate(()=>{lift.ex='Incline Barbell Bench Press';renderHeader()});
 await p.setViewportSize({width:852,height:393});
 await p.evaluate(()=>{tickRest();tickBig()});
 assert.equal(await p.locator('body > #hTimer').count(),1,'landscape uses the existing large timer');
 await p.setViewportSize({width:393,height:852});
 await p.evaluate(()=>{tickRest();tickBig()});
 assert.equal(await p.locator('header #hTimer + #liveWorkoutBar').count(),1,'portrait restores timer before Finish');
 await p.locator('#gearBtn').click();assert.equal(await p.evaluate(()=>view),'sync');
 assert.equal(await p.locator('#gearBtn').getAttribute('aria-current'),'page');
 await p.locator('#liveWorkoutFinish').click();assert(await p.locator('#workoutFinishDialog').isVisible());
 await p.locator('#workoutKeepTraining').click();assert.equal(await p.evaluate(()=>JSON.stringify(DB.days)),before);
 await p.locator('#liveWorkoutFinish').click();await p.locator('#doneAllBtn').click();
 assert(await p.evaluate(()=>DB.days[todayISO].doneAll));assert(await p.locator('#liveWorkoutBar').isHidden());
 assert.equal(await p.evaluate(()=>JSON.stringify(DB.days[todayISO].w)),JSON.stringify(JSON.parse(before)['2026-09-24'].w));
 assert(await p.locator('header #hTimer').isHidden());
 await p.locator('#dayDone button').filter({hasText:/^Done$/}).click();
 await p.waitForTimeout(500);
 await p.evaluate(()=>{DB.days[todayISO]={w:[],rest:true};view='today';render();renderHeader()});
 await p.locator('header.resting').waitFor({state:'visible'});
 assert(await p.locator('#liveWorkoutBar').isHidden());
 for(const theme of ['light','dark']){
  await p.evaluate(theme=>{DB.settings.theme=theme;DB.settings.bar=theme;applyTheme();render()},theme);
  const same=await p.evaluate(()=>getComputedStyle(document.querySelector('.hglass')).backgroundImage===getComputedStyle(document.querySelector('#nav'),'::before').backgroundImage);
  assert(same,'Rest shares the nav material');await p.screenshot({path:'../floating-rest-'+theme+'.png'});
 }
 assert.deepEqual(errors,[]);console.log('PASS floating header: six normal/six active layouts, materials, 14/24/64 dimensions, timer ordering, folded-state Finish, fifth Settings tab, completion and record preservation.');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
