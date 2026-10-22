// PORT=8784 node tools/check-pip-completed-size.cjs
// Approved +60% on Today's completed-day Pip only. Real app, no account/network writes.
const {chromium}=require('playwright'),assert=require('assert'),path=require('path');
const BASE=process.env.PIP_BASE||`http://127.0.0.1:${process.env.PORT||8784}/`;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
 try{
 const page=await browser.newPage({viewport:{width:393,height:852},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
 await page.goto(BASE);
 await page.evaluate(()=>{
  DB={days:{},settings:{onboarded:true,unit:'lb',skin:'minimal',flow:'refined',theme:'dark',bar:'dark',mascotMotion:'still',clubAvatar:'pip',companionFree:'pip',companionName:'Pip',companionAsked:'yes'}};
  todayISO='2026-10-21';checkDate=()=>false;document.querySelector('#onb')?.remove();
  DB.days[todayISO]={w:[{part:'Back',ex:'Deadlift',w:135,reps:[8],at:1}],doneAll:true,upd:1};
  SEED=deriveAll();view='today';applyTheme();render();
 });
 const metrics=()=>page.evaluate(()=>{
  const card=document.querySelector('.card.dayclosed'),pip=card.querySelector('.su-mascot'),img=card.querySelector('img');
  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
  return {card:rect(card),count:rect(card.querySelector('.dcn')),header:rect(document.querySelector('header')),pip:pip&&rect(pip),img:rect(img),scale:pip&&getComputedStyle(pip).scale,overflow:document.documentElement.scrollWidth>innerWidth};
 });
 for(const width of [320,360,393,430])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:852});
  await page.evaluate(theme=>{DB.settings.theme=theme;DB.settings.bar=theme;applyTheme();render();},theme);
  await page.waitForSelector('.card.dayclosed .crew-art');
  await page.evaluate(()=>Promise.all([...document.querySelectorAll('.card.dayclosed img')].map(i=>i.decode())));
  const enlarged=await metrics();
  await page.addStyleTag({content:'.card.dayclosed>.su-mascot{scale:1!important}',id:'pip-baseline'}).then(el=>el.evaluate(e=>e.id='pip-baseline'));
  const baseline=await metrics();await page.locator('#pip-baseline').evaluate(e=>e.remove());
  assert(Math.abs(enlarged.img.w/baseline.img.w-1.6)<.001,'width +60%');
  assert(Math.abs(enlarged.img.h/baseline.img.h-1.6)<.001,'height +60%');
  assert.deepStrictEqual(enlarged.card,baseline.card,'card layout unchanged');
  assert.deepStrictEqual(enlarged.count,baseline.count,'number position unchanged');
  assert.deepStrictEqual(enlarged.header,baseline.header,'header unchanged');
  assert(!enlarged.overflow,'no horizontal overflow');
  // Visible blue body ends at 341/512 of the square rest artwork, centered by object-fit.
  const bodyBottom=enlarged.img.y+(enlarged.img.h-Math.min(enlarged.img.w,enlarged.img.h))/2+Math.min(enlarged.img.w,enlarged.img.h)*341/512;
  assert(bodyBottom<enlarged.count.y-4,'body clears the count');
  if(width===393&&process.env.PIP_QA_DIR)await page.screenshot({path:path.join(process.env.PIP_QA_DIR,`pip-completed-${theme}.png`)});
  console.log('PASS size/layout/header',width,theme);
 }
 for(const id of ['bottle','bag']){
  await page.evaluate(id=>{DB.settings.clubAvatar=id;DB.settings.companionFree=id;DB.settings.companionName=id;render();},id);
  const unchanged=await metrics();assert.equal(unchanged.pip,null);assert.equal(unchanged.scale,null);
  const size=await page.locator('.card.dayclosed .su-hello-comp').boundingBox();assert.equal(size.width,90);assert.equal(size.height,90);
  console.log('PASS unchanged',id);
 }
 await page.evaluate(()=>{DB.settings.clubAvatar='pip';DB.settings.companionFree='pip';DB.settings.companionName='Pip';DB.settings.mascotMotion='animated';render();});
 await page.waitForSelector('.card.dayclosed [data-crew-playing="rest"]');
 await page.locator('.card.dayclosed [data-crew]').dispatchEvent('pointerdown');
 await page.waitForSelector('.card.dayclosed [data-crew-playing="tap"]');
 assert.equal((await metrics()).scale,'1.6');console.log('PASS rest animation and tap replay at approved size');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>document.querySelector('.card.dayclosed .crew-art').src.endsWith('pip-rest-still.webp'));
 assert.equal((await metrics()).scale,'1.6');console.log('PASS reduced motion');
 await page.evaluate(()=>{DB.days[todayISO].doneAll=false;render();});
 assert.equal(await page.locator('.card.dayclosed').count(),0);
 assert.equal(await page.locator('#view .su-mascot').first().evaluate(e=>getComputedStyle(e).scale),'none');
 console.log('PASS other Pip placement unchanged');
 await page.evaluate(()=>{DB.days[todayISO].doneAll=true;DB.settings.mascotMotion='off';render();});
 assert.equal(await page.locator('.card.dayclosed .su-mascot').count(),0);console.log('PASS hidden mascot');
 assert.deepStrictEqual(errors,[]);console.log('PASS no browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
