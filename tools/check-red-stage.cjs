// PW_PORT=8847 node tools/check-red-stage.cjs — actual application, isolated record.
const {chromium}=require('playwright'),assert=require('assert');
const origin='http://127.0.0.1:'+(process.env.PW_PORT||8847)+'/';
(async()=>{const b=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
const p=await b.newPage({viewport:{width:852,height:393},serviceWorkers:'block'}),errors=[];
p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());await p.goto(origin);
await p.evaluate(()=>{document.querySelector('#onb')?.remove();DB={days:{},settings:{onboarded:true,unit:'lb',skin:'minimal',theme:'light'}};checkDate=()=>false;
const at=Date.now()-84000;DB.days[todayISO]={w:[{ex:'Incline Barbell Bench Press',part:'Chest',w:toKg(165),reps:[8],at}],lastAt:at,doneEx:[],donePart:[]};
lastSetAt=at;window.testAnchor=at;view='lift';lift.ex='Incline Barbell Bench Press';lift.part='Chest';lift.plan=null;lift.copy=false;SEED=deriveAll();applyTheme();render();tickRest();tickBig();});
assert.equal(await p.locator('#hTimer .rt-ctx').innerText(),'Incline Barbell Bench Press');
await p.evaluate(()=>{const button=document.createElement('button');button.id='doneExBtn';document.body.appendChild(button);button.click();button.remove();tickRest();tickBig();});
assert.equal(await p.locator('#hTimer .rt-ctx').innerText(),'Between exercises');assert(await p.evaluate(()=>lastSetAt===window.testAnchor));
await p.evaluate(()=>{lift.ex='Incline Dumbbell Bench Press';lift.part='Chest';view='lift';render();tickRest();tickBig();});
assert.equal(await p.locator('#hTimer .rt-ctx').innerText(),'Incline Dumbbell Bench Press');assert(await p.evaluate(()=>lastSetAt===window.testAnchor));
assert.equal(await p.locator('#hTimer .rt-detail').innerText(),'');
await p.evaluate(()=>{DB.plan={d:todayISO,items:[{ex:'Incline Dumbbell Bench Press',lines:[{w:toKg(60),reps:[8,8]}]}]};tickRest();});
assert.equal(await p.locator('#hTimer .rt-detail').innerText(),'Next · 60 lb × 8');
assert(await p.evaluate(()=>lastSetAt===window.testAnchor));
assert(await p.evaluate(()=>document.querySelector('#hTimer').parentElement===document.body));
await p.evaluate(()=>{window.colonNode=document.querySelector('.rt-colon');tickRest();});assert(await p.evaluate(()=>window.colonNode===document.querySelector('.rt-colon')));
assert(await p.locator('.rt-colon').evaluate(e=>parseFloat(getComputedStyle(e).opacity)>0));
assert.equal(await p.locator('#hTimer').evaluate(e=>getComputedStyle(e,'::before').display),'none');
assert(await p.locator('#hTimer .rt-buddy').isVisible());
assert(await p.locator('#hTimer .rt-buddy').evaluate(e=>e.complete&&e.naturalWidth>0&&getComputedStyle(e).animationName==='rtBuddyHop'));
assert.equal(await p.locator('#hTimer').evaluate(e=>getComputedStyle(e,'::after').animationName),'rtSunPulse');
assert.equal(await p.locator('#hTimer .rt-ctx').evaluate(e=>getComputedStyle(e).fontSize),await p.locator('#hTimer .rt-detail').evaluate(e=>getComputedStyle(e).fontSize));
assert(await p.locator('#hTimer').evaluate(e=>getComputedStyle(e).gap.endsWith('px')));
await p.evaluate(()=>{lastSetAt=Date.now()-990;tickBigDigits();});
await p.waitForTimeout(150);
assert(await p.evaluate(()=>{const e=Date.now()-lastSetAt,s=document.querySelector('.rt-sec').textContent,o=+getComputedStyle(document.querySelector('.rt-colon')).opacity;return s===String(Math.floor(e/1000)%60).padStart(2,'0')&&(e%1000<500?o===1:o<.3)}));
for(const skin of ['minimal','classic','retro'])for(const theme of ['light','dark']){
await p.evaluate(({skin,theme})=>{DB.settings.skin=skin;DB.settings.theme=theme;applyTheme();tickRest();tickBig();},{skin,theme});
assert(await p.locator('#hTimer .rt-ctx').isVisible());assert.equal(await p.locator('#hTimer .rt-sub').isVisible(),false);
assert(await p.locator('#hTimer').evaluate(e=>getComputedStyle(e,'::after').backgroundImage.includes('radial-gradient')));
const bounds=await p.locator('.rt-ctx').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=852&&bounds.y>=0);
if(skin==='minimal')await p.screenshot({path:'../red-stage-actual-'+theme+'.png'});
}
await p.evaluate(()=>{plLog({part:'Chest',ex:lift.ex,w:toKg(60),reps:[8],at:Date.now()});reopen(lift.ex,lift.part);tickRest();});
assert((await p.locator('.rt-time').textContent()).startsWith('0:0'));assert((await p.locator('.rt-detail').innerText()).includes('Last · 60 lb × 8'),await p.locator('.rt-detail').innerText());
await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>tickBigDigits());
assert.equal(await p.locator('.rt-colon').evaluate(e=>getComputedStyle(e).opacity),'1');
assert.equal(await p.locator('.rt-buddy').evaluate(e=>getComputedStyle(e).animationName),'none');
assert.equal(await p.locator('#hTimer').evaluate(e=>getComputedStyle(e,'::after').animationName),'none');
await p.setViewportSize({width:393,height:852});await p.evaluate(()=>tickBig());assert.equal(await p.locator('.rt-detail').isVisible(),false);
await p.setViewportSize({width:667,height:375});await p.evaluate(()=>tickBig());assert(await p.locator('.rt-time').isVisible());
await p.evaluate(()=>{day(todayISO).doneAll=true;tickRest();tickBig();});assert(!await p.evaluate(()=>document.documentElement.classList.contains('bigtimer')));
assert.deepEqual(errors,[]);console.log('PASS red stage: completion/navigation retain clock, current exercise, log resets, persistent colon, themes, rotation, reduced motion, Finish exits');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
