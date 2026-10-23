// PORT=8784 node tools/check-welcome-world-motion.cjs
// Run the shipped effect module against all shipped city images. No auth calls.
const {chromium}=require('playwright'),assert=require('assert');
const BASE=process.env.BASE||`http://127.0.0.1:${process.env.PORT||8784}/`;
(async()=>{const b=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
const p=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(BASE);await p.waitForSelector('.ww-root');
await p.evaluate(async()=>{onbWorldStop?.();window.motionModule=await import('./js/welcome-effects.js');window.motionReduced={matches:false};window.motionRoot=document.querySelector('.ww-root');motionRoot.classList.remove('ww-suspended','ww-reduced');motionRoot.classList.add('ww-paused');});
const cities=await p.evaluate(()=>WORLD_GYMS);assert.equal(cities.length,12);
for(let i=0;i<cities.length;i++){
 await p.evaluate(async i=>{window.motionTest?.dispose();const img=motionRoot.querySelector('.ww-scene img');img.src='assets/welcome/pixel-'+WORLD_GYMS[i][0]+'.webp';await img.decode();window.motionTest=motionModule.mountCityEffects(motionRoot,()=>({index:i,active:0}),motionReduced);},i);
 await p.waitForTimeout(180);const first=await p.locator('.ww-lights').evaluate(c=>({pixels:c.toDataURL(),frame:c.dataset.frame}));await p.waitForTimeout(1100);const second=await p.locator('.ww-lights').evaluate(c=>({pixels:c.toDataURL(),frame:c.dataset.frame,city:c.dataset.city,lights:Number(c.dataset.lightCount),train:c.dataset.train,traffic:c.dataset.trafficFrame}));
 assert.equal(second.city,cities[i][0]);assert(second.lights>=30,second.city+' mapped windows');assert.notEqual(first.pixels,second.pixels,second.city+' visible animation');assert.notEqual(first.frame,second.frame,second.city+' runs while city pause is set');
 if(second.city==='saopaulo')assert(second.traffic,'traffic layer runs');
 console.log('PASS '+second.city+': artwork loads, '+second.lights+' mapped lights, moving pixels while city changes paused');
}
await p.evaluate(()=>{motionReduced.matches=true});await p.waitForTimeout(200);assert(await p.locator('.ww-lights').evaluate(c=>[...c.getContext('2d').getImageData(0,0,c.width,c.height).data].every(v=>v===0)));console.log('PASS reduced motion clears ambient layers');
await p.evaluate(()=>{motionReduced.matches=false;motionRoot.classList.add('ww-suspended')});const held=await p.locator('.ww-lights').getAttribute('data-frame');await p.waitForTimeout(250);assert.equal(await p.locator('.ww-lights').getAttribute('data-frame'),held);console.log('PASS suspended screen holds all ambient effects');
await p.evaluate(()=>motionTest.dispose());await p.waitForTimeout(200);assert.equal(await p.locator('.ww-lights').getAttribute('data-frame'),held);assert.deepEqual(errors,[]);console.log('PASS effect disposal and no JavaScript errors');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
