// PW_PORT=8859 node tools/check-timer-crew-toggle.cjs
const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
const origin='http://127.0.0.1:'+(process.env.PW_PORT||8859)+'/';
const p=await b.newPage({viewport:{width:852,height:393},hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());await p.goto(origin);
await p.evaluate(()=>{document.querySelector('#onb')?.remove();DB={days:{},settings:{onboarded:true,unit:'lb',skin:'minimal',theme:'dark',clubAvatar:'bell',companionName:'bell',companionFree:'bell'}};checkDate=()=>false;const at=Date.now()-22000;DB.days[todayISO]={w:[{ex:'Bench Press',part:'Chest',w:toKg(135),reps:[8],at}],lastAt:at,doneEx:[],donePart:[]};lastSetAt=at;view='lift';lift.ex='Bench Press';lift.part='Chest';lift.plan=null;lift.copy=false;SEED=deriveAll();applyTheme();render();tickRest();tickBig();});
const button=p.locator('.rt-crew-toggle'),buddy=p.locator('.rt-buddy');
assert(await button.isVisible());assert(await buddy.isVisible());
const anchor=await p.evaluate(()=>lastSetAt);
await button.tap();assert(!await buddy.isVisible());assert.equal(await button.getAttribute('aria-label'),'Show Crew');assert(await button.isVisible());
await p.evaluate(()=>tickRest());assert(!await buddy.isVisible());assert.equal(await p.evaluate(()=>lastSetAt),anchor);
await button.press('Enter');assert(await buddy.isVisible());assert.equal(await button.getAttribute('aria-pressed'),'true');
await p.screenshot({path:'../Crew-Final-Review/Crew-Toggle-Live-Red.png'});
await button.tap();
await p.evaluate(()=>{day(todayISO).doneAll=true;stampWorkoutCompletion(day(todayISO),Date.now()-125000);tickRest();tickBig();});
assert(await p.locator('#hTimer').evaluate(e=>e.classList.contains('recovery')));assert(!await buddy.isVisible());
const completed=await p.evaluate(()=>day(todayISO).completedAt);
await button.tap();await p.waitForFunction(()=>document.querySelector('#hTimer')._recoveryCrew?.ready);assert(await p.locator('.rt-sync').isVisible());
for(const id of await p.evaluate(()=>clubChoices().map(x=>x[0]))){await p.evaluate(id=>{DB.settings.clubAvatar=id;DB.settings.companionName=id;DB.settings.companionFree=id;tickRest();},id);await button.locator('img').evaluate(e=>e.decode());assert((await button.locator('img').getAttribute('src')).endsWith('/'+id+'.webp'));}
await button.tap();assert(!await p.locator('.rt-sync').isVisible());assert(!await buddy.isVisible());assert(await p.evaluate(()=>document.querySelector('#hTimer')._recoveryCrew.pages.size===0));
await p.locator('.rt-quiet').tap();assert(!await p.locator('.rt-sync').isVisible());assert.equal(await p.evaluate(()=>day(todayISO).completedAt),completed);
await p.setViewportSize({width:393,height:852});await p.evaluate(()=>{tickRest();tickBig();});assert(!await button.isVisible());
await p.setViewportSize({width:852,height:393});await p.evaluate(()=>{tickRest();tickBig();});assert.equal(await button.getAttribute('aria-pressed'),'false');
await button.tap();await p.waitForFunction(()=>document.querySelector('#hTimer')._recoveryCrew?.ready);assert(await p.locator('.rt-sync').isVisible());
await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>tickRest());assert(await buddy.isVisible());await button.tap();assert(!await buddy.isVisible());await button.tap();assert(await buddy.isVisible());
await p.evaluate(()=>{document.documentElement.dataset.mascotMotion='off';tickRest();});assert(await button.isDisabled());assert(!await buddy.isVisible());
assert.deepEqual(errors,[]);console.log('PASS both timers, all 10 icons, keyboard/touch, no timestamp changes, hidden playback stopped, clock switch, rotation, reduced motion and Appearance off');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
