const {chromium}=require('playwright'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe',args:['--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:393,height:852}});
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:8768');
 await page.waitForTimeout(2000);
 await page.evaluate(()=>navigator.serviceWorker.ready);
 const keys=await page.evaluate(async()=>{
   const names=await caches.keys();const key='showup-'+APP_VERSION;if(!names.includes(key))throw new Error('Current release cache missing: '+key);const cache=await caches.open(key);
   return (await cache.keys()).map(r=>new URL(r.url).pathname);
 });
 for(const filename of ['js/mascot-renderer.js','vendor/three-r169.module.min.js','assets/mascot-white.png','assets/mascot-charcoal.png','assets/mascot-mark-white.png','assets/mascot-mark-charcoal.png'])
   assert(keys.includes('/'+filename),filename+' must be precached');
 await context.setOffline(true);await page.reload();await page.waitForTimeout(600);
 await page.evaluate(()=>{
   document.getElementById('onb')?.remove();DB.settings.onboarded=true;
   DB.days[todayISO]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8],at:Date.now()}],doneAll:true,doneEx:[],donePart:[]};
   SEED=deriveAll();view='today';render();
 });
 await page.locator('[data-mascot="cool"] canvas').waitFor({timeout:10000});
 assert(await page.locator('[data-mascot="cool"] img').evaluate(im=>im.complete&&im.naturalWidth>0));
 await browser.close();console.log('PASS offline reload: local geometry, renderer, PNG fallbacks and WebGL animation.');
})().catch(e=>{console.error(e);process.exit(1)});
