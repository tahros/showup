// Actual service-worker install, then all HD pages with networking disabled.
const {chromium}=require('playwright'),assert=require('assert'),path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
 try{
  const context=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:3});
  await context.route('https://**',r=>r.abort());
  const p=await context.newPage();await p.goto('http://127.0.0.1:'+(process.env.PW_PORT||8847)+'/');
  await p.waitForFunction(()=>navigator.serviceWorker.controller,{},{timeout:60000});
  // The app reloads once on controllerchange; allow that navigation to settle.
  await p.waitForTimeout(1000);await p.waitForLoadState('load');
  const count=await p.evaluate(async version=>{const k=(await caches.keys()).find(k=>k==='showup-v'+version);if(!k)return 0;return (await(await caches.open(k)).keys()).filter(r=>r.url.includes('/crew/synced/')&&r.url.endsWith('.webp')).length;},require('../package.json').version);
  assert.equal(count,140);
  await context.setOffline(true);
  await p.evaluate(()=>{
   document.querySelector('#onb')?.remove();
   DB={days:{},settings:{onboarded:true,skin:'minimal',theme:'dark',clubAvatar:'bag',companionName:'bag',companionFree:'bag',mascotMotion:'animated'}};
   DB.days[todayISO]={w:[],doneAll:true,completedAt:Date.now()-125000};lastSetAt=null;SEED=deriveAll();applyTheme();render();tickRest();tickBig();
  });
  for(let n=0;n<14;n++){
   await p.evaluate(n=>{day(todayISO).completedAt=Date.now()-(28000+n*1000+100);tickRest();},n);
   await p.waitForFunction(n=>{const s=document.querySelector('#hTimer')._recoveryCrew;return s?.ready&&Math.floor(s.frame/60)===n;},n);
   assert(await p.locator('.rt-sync').isVisible());
  }
  await p.evaluate(()=>{day(todayISO).completedAt=Date.now()-33886500;tickRest();});
  await p.waitForTimeout(300);
  await p.screenshot({path:path.resolve(__dirname,'../../Crew-Final-Review/HD-Recovery-7s/HD-Live-Retina.png')});
  console.log('PASS offline: 140 HD pages cached; all 14 selected-Crew pages play without network at 3x display density');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
