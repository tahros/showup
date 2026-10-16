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
await p.locator('#hTimer .rt-buddy').evaluate(e=>e.decode());
assert(await p.locator('#hTimer .rt-buddy').evaluate(e=>e.complete&&e.naturalWidth===1080&&getComputedStyle(e).animationName==='none'&&e.src.endsWith('/roaming/pip.webp')));
for(const id of await p.evaluate(()=>clubChoices().map(x=>x[0]))){
 await p.evaluate(id=>{DB.settings.clubAvatar=id;DB.settings.companionName=id;DB.settings.companionFree=id;tickRest();},id);
 await p.locator('.rt-buddy').evaluate(e=>e.decode());
 assert(await p.locator('.rt-buddy').evaluate((e,id)=>e.dataset.crewId===id&&e.src.endsWith('/roaming/'+id+'.webp')&&e.naturalWidth===1080&&e.naturalHeight===120,id));
 assert(await p.evaluate(()=>lastSetAt===window.testAnchor));
}
await p.evaluate(()=>{DB.settings.clubAvatar='mat';tickRest();});await p.locator('.rt-buddy').evaluate(e=>e.decode());
await p.screenshot({path:'../Crew-Final-Review/White-Crew-Timer.png'});
console.log('PASS ten white selected crews; switching does not reset timer');
await p.evaluate(()=>{window.buddyNode=document.querySelector('.rt-buddy');window.srcChanges=0;window.buddyObserver=new MutationObserver(ms=>window.srcChanges+=ms.filter(m=>m.attributeName==='src').length);buddyObserver.observe(buddyNode,{attributes:true});tickRest();tickRest();});
await p.waitForTimeout(50);assert.equal(await p.evaluate(()=>window.srcChanges),0);
const stageBox=await p.locator('#hTimer').boundingBox(),laneBox=await p.locator('.rt-buddy').boundingBox(),clockBox=await p.locator('.rt-time').boundingBox();
assert(Math.abs(laneBox.width-stageBox.width)<2);assert(Math.abs(clockBox.x+clockBox.width/2-426)<2);
assert(laneBox.y>clockBox.y+clockBox.height);
await p.evaluate(()=>{DB.settings.mascotMotion='still';document.documentElement.dataset.mascotMotion='still';tickRest();});await p.locator('.rt-buddy').evaluate(e=>e.decode());assert(await p.locator('.rt-buddy').evaluate(e=>e.src.includes('/white/')&&!e.classList.contains('rt-roaming')));
await p.evaluate(()=>{DB.settings.mascotMotion='off';document.documentElement.dataset.mascotMotion='off';tickRest();});assert(!await p.locator('.rt-buddy').isVisible());
await p.evaluate(()=>{DB.settings.mascotMotion='animated';document.documentElement.dataset.mascotMotion='animated';tickRest();});
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
await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>{tickBigDigits();tickRest();});
assert(await p.locator('.rt-buddy').evaluate(e=>e.src.includes('/white/')&&!e.classList.contains('rt-roaming')));
assert.equal(await p.locator('.rt-colon').evaluate(e=>getComputedStyle(e).opacity),'1');
assert.equal(await p.locator('.rt-buddy').evaluate(e=>getComputedStyle(e).animationName),'none');
assert.equal(await p.locator('#hTimer').evaluate(e=>getComputedStyle(e,'::after').animationName),'none');
await p.setViewportSize({width:393,height:852});await p.evaluate(()=>tickBig());assert.equal(await p.locator('.rt-detail').isVisible(),false);
await p.setViewportSize({width:667,height:375});await p.evaluate(()=>tickBig());assert(await p.locator('.rt-time').isVisible());
await p.evaluate(()=>{day(todayISO).doneAll=true;tickRest();tickBig();});assert(!await p.evaluate(()=>document.documentElement.classList.contains('bigtimer')));
await p.evaluate(()=>{stampWorkoutCompletion(day(todayISO),Date.now()-125000);tickRest();tickBig();tickBigDigits();});
assert(await p.locator('#hTimer').evaluate(e=>e.classList.contains('recovery')));
assert.equal(await p.locator('.rt-min').textContent(),'2');
assert(!await p.locator('.rt-ctx').isVisible());assert(!await p.locator('.rt-detail').isVisible());
assert(await p.locator('.rt-wordmark').isVisible());
assert(await p.locator('#hTimer').evaluate(e=>getComputedStyle(e).backgroundImage.includes('radial-gradient')));
await p.emulateMedia({reducedMotion:'no-preference'});
await p.setViewportSize({width:852,height:393});await p.evaluate(()=>{tickRest();tickBig();});
assert.equal(await p.locator('.rt-caption').innerText(),'Since workout');
for(const id of await p.evaluate(()=>clubChoices().map(x=>x[0]))){
 await p.evaluate(id=>{DB.settings.clubAvatar=id;DB.settings.companionName=id;DB.settings.companionFree=id;tickRest();},id);
 await p.waitForFunction(id=>{const el=document.querySelector('#hTimer');return el._recoveryCrew?.id===id&&el._recoveryCrew?.ready&&el.classList.contains('rt-synced');},id);
 await p.waitForFunction(()=>document.querySelector('.rt-sync').getContext('2d').getImageData(0,0,2160,240).data.some(x=>x>0));
 assert.deepEqual(await p.evaluate(()=>[0,7000,14000,21000].map(recoveryFrame)),[0,420,0,420]);
 assert(await p.evaluate(()=>{const el=document.querySelector('#hTimer'),s=el._recoveryCrew,c=el.querySelector('.rt-sync');return s.offsets.length===840&&s.pages.size<=2&&c.width===2160&&c.height===240&&[...s.pages.values()].some(p=>p.ready&&p.image.naturalWidth===3840&&p.image.naturalHeight===1920);}));
}
// Sixty distinct frame addresses per second, with exact seven-second arrivals.
assert.equal(await p.evaluate(()=>new Set(Array.from({length:60},(_,i)=>recoveryFrame((i+.01)*1000/60))).size),60);
// Seek through every one-second HD page, including wraparound. The selected
// Crew must remain visible without retaining the full decoded animation.
for(let page=0;page<14;page++){
 await p.evaluate(n=>{day(todayISO).completedAt=Date.now()-(28000+n*1000+100);tickRest();},page);
 await p.waitForFunction(n=>{const s=document.querySelector('#hTimer')._recoveryCrew;return s.ready&&Math.floor(s.frame/60)===n;},page);
 assert(await p.evaluate(()=>document.querySelector('#hTimer')._recoveryCrew.pages.size<=2));
}
console.log('PASS all 14 HD pages, bounded decoded-page references, full-resolution canvas');
await p.route('**/assets/crew/synced/frames.json',r=>r.fulfill({contentType:'application/json',body:'{"count":120,"crews":{}}'}));
await p.evaluate(()=>{syncRecoveryCrew.manifest=null;document.querySelector('#hTimer')._recoveryCrew.id=null;tickRest();});
await p.waitForTimeout(150);
assert(!await p.locator('.rt-sync').isVisible());assert(await p.locator('.rt-buddy').isVisible());
await p.unroute('**/assets/crew/synced/frames.json');
await p.evaluate(()=>{syncRecoveryCrew.manifest=null;document.querySelector('#hTimer')._recoveryCrew.id=null;tickRest();});
await p.waitForFunction(()=>document.querySelector('#hTimer')._recoveryCrew.ready);
await p.evaluate(()=>{day(todayISO).completedAt=Date.now()-33884000;tickRest();tickBigDigits();});
assert((await p.locator('.rt-digits').innerText()).startsWith('09:24:'));
const recoveryStamp=await p.evaluate(()=>day(todayISO).completedAt);
await p.locator('.rt-quiet').click();assert.equal(await p.locator('.rt-quiet').getAttribute('aria-pressed'),'true');
assert(await p.evaluate(()=>document.querySelector('.rt-digits').textContent.startsWith(String(new Date().getHours()).padStart(2,'0')+':')));
assert(!/AM|PM/.test(await p.locator('.rt-period').innerText()));
await p.locator('.rt-quiet').press('Enter');assert.equal(await p.evaluate(()=>day(todayISO).completedAt),recoveryStamp);
const geometry=await p.evaluate(()=>{const e=document.querySelector('#hTimer'),q=e.querySelector('.rt-quiet'),mark=e.querySelector('.rt-wordmark');return {y:parseFloat(e.style.getPropertyValue('--rt-crew-y')),ideal:(q.offsetTop+q.offsetHeight+e.clientHeight)/2,mark:mark.offsetTop,clock:q.offsetTop};});
assert(Math.abs(geometry.y-(geometry.ideal-10))<1);assert(geometry.mark<geometry.clock);
assert.equal(await p.locator('#hTimer').evaluate(e=>getComputedStyle(e,'::after').animationName),'rtRecoveryPulse');
assert.equal(await p.locator('#hTimer').evaluate(e=>getComputedStyle(e,'::after').animationDuration),'8s');
assert(await p.locator('.rt-quiet').evaluate(e=>getComputedStyle(e).zIndex==='1'));
const pulse=await p.evaluate(async()=>{
 const el=document.querySelector('#hTimer'),a=el.getAnimations({subtree:true}).find(a=>a.animationName==='rtRecoveryPulse');
 const boxes=()=>['.rt-quiet','.rt-wordmark','.rt-sync'].map(s=>{const r=el.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height];});
 a.pause();a.currentTime=0;await new Promise(requestAnimationFrame);
 const low=+getComputedStyle(el,'::after').opacity,before=boxes();
 a.currentTime=4000;await new Promise(requestAnimationFrame);
 const high=+getComputedStyle(el,'::after').opacity,after=boxes();a.play();
 return {low,high,before,after};
});
assert(Math.abs(pulse.low-.04)<.001&&Math.abs(pulse.high-.12)<.001);
assert.deepEqual(pulse.before,pulse.after,'background pulse must not move or scale foreground content');
await p.evaluate(()=>{DB.settings.mascotMotion='off';document.documentElement.dataset.mascotMotion='off';tickRest();});
assert(!await p.locator('.rt-sync').isVisible());assert(!await p.locator('.rt-buddy').isVisible());
await p.evaluate(()=>{DB.settings.mascotMotion='animated';document.documentElement.dataset.mascotMotion='animated';tickRest();});
await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>tickRest());assert(!await p.locator('.rt-sync').isVisible());assert(await p.locator('.rt-buddy').isVisible());
assert.equal(await p.locator('#hTimer').evaluate(e=>getComputedStyle(e,'::after').animationName),'none');
await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>{day(todayISO).completedAt=Date.now()-125000;tickRest();});
await p.locator('.rt-buddy').evaluate(e=>e.decode());
await p.screenshot({path:'../Crew-Final-Review/Recovery-Timer-Preview/Recovery-Timer-Live.png'});
await p.setViewportSize({width:393,height:852});await p.evaluate(()=>{tickRest();tickBig();});
assert(!await p.evaluate(()=>document.documentElement.classList.contains('bigtimer')));
await p.setViewportSize({width:852,height:393});await p.evaluate(()=>{tickRest();tickBig();tickBigDigits();});
assert.equal(await p.locator('.rt-min').textContent(),'2');
await p.evaluate(()=>{day(todayISO).doneAll=false;lastSetAt=Date.now();tickRest();tickBig();});
assert(!await p.locator('#hTimer').evaluate(e=>e.classList.contains('recovery')));
assert(!await p.locator('.rt-wordmark').isVisible());assert(await p.locator('.rt-ctx').isVisible());
assert.deepEqual(errors,[]);console.log('PASS red stage and recovery: completion anchor, minimal layout, rotation, selected Crew and resumed red timer');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
