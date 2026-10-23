// Real service-worker installation, offline city rotation, and persisted entry.
// Serve the repo locally. PW_PORT / PW_CHROME override the browser and port.
const {chromium}=require('playwright'),assert=require('assert');
const base=`http://127.0.0.1:${process.env.PW_PORT||8784}/`;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{},{timeout:60000});
  await page.waitForFunction(()=>document.querySelector('.ww-still')?.naturalWidth===4096);
  const cached=await page.evaluate(async()=>{
   const c=await caches.open('showup-'+APP_VERSION);
   return (await c.keys()).filter(r=>r.url.includes('/assets/welcome/pixel-')).length;
  });
  assert.equal(cached,12,'every welcome asset is in the installed shell');
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('.ww-still')?.naturalWidth===4096);
  assert.equal(await page.locator('.ww-heading h1').innerText(),'Life happens.\nYou show up.');
  const cities=await page.evaluate(async()=>Promise.all(WORLD_GYMS.map(async([key])=>{
   const r=await fetch('assets/welcome/pixel-'+key+'.webp');return r.ok&&(await r.arrayBuffer()).byteLength>0;
  })));
  assert(cities.length===12&&cities.every(Boolean),'all twelve cities load offline');
  const sprites=await page.evaluate(async()=>Promise.all(['tokyo-train','shanghai-boat','sydney-ferry'].map(async name=>{const img=new Image();img.src='assets/welcome/'+name+'.webp';await img.decode();return img.naturalWidth>1000;})));
  assert(sprites.every(Boolean),'all three refined vehicle sprites decode offline');
  await page.waitForFunction(()=>document.querySelector('.ww-city strong').textContent==='Shanghai',{},{timeout:16000});
  console.log('PASS installed welcome, all twelve scenes, typography and animation work offline');
  await page.click('[data-onbact="local"]');
  await page.waitForSelector('#onbName');
  assert(await page.evaluate(()=>onbWorldStop===null),'welcome animation is cleaned up');
  await page.fill('#onbName','Offline');await page.click('[data-onbact="toCrew"]');
  await page.click('[data-onbact="skip"]');await page.click('[data-onbact="look"]');
  await page.waitForFunction(()=>document.getElementById('onb').hidden);
  await page.reload();
  await page.waitForFunction(()=>typeof DB!=='undefined'&&DB.settings.onboarded);
  assert(await page.evaluate(()=>!document.querySelector('.ww-root')&&DB.settings.name==='Offline'));
  assert.deepEqual(errors,[]);
  console.log('PASS offline setup persists, returning users enter the app, no JavaScript errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
