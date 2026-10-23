// PORT=8786 node tools/check-welcome-tiles.cjs
// Exercise the actual shipped canvas effect with solid scenes so corner colors
// prove direction, opacity, pause isolation, resizing and cancellation.
const {chromium}=require('playwright'),assert=require('assert');
const BASE=process.env.BASE||`http://127.0.0.1:${process.env.PORT||8786}/`;
(async()=>{const b=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
try{const p=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});await p.goto(BASE);await p.waitForSelector('.ww-root');
 const result=await p.evaluate(async()=>{
  onbWorldStop?.();const root=document.querySelector('.ww-root'),scene=root.querySelector('.ww-scene'),imgs=[...scene.querySelectorAll('img')];root.classList.remove('ww-paused');
  for(const [i,color] of ['#0000ff','#ff0000'].entries()){const c=document.createElement('canvas');c.width=390;c.height=526;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,c.width,c.height);imgs[i].src=c.toDataURL();await imgs[i].decode();}
  const {mountCityEffects}=await import('./js/welcome-effects.js');const effects=mountCityEffects(root,()=>({index:1,active:0}),{matches:false});window.tileTestEffects=effects;
  window.tileTestDone=false;effects.reveal({from:imgs[0],to:imgs[1],nextIndex:2}).then(clean=>{clean();window.tileTestDone=true;});
  await new Promise(resolve=>{function check(){const c=scene.querySelector('.ww-transition');if(Number(c.dataset.step)>=3){root.classList.add('ww-paused');resolve();}else requestAnimationFrame(check);}requestAnimationFrame(check);});
  const c=scene.querySelector('.ww-transition'),x=c.getContext('2d'),at=(a,b)=>[...x.getImageData(a,b,1,1).data];return {tl:at(1,1),tr:at(c.width-2,1),bl:at(1,c.height-2),br:at(c.width-2,c.height-2),step:c.dataset.step};
 });
 assert.deepEqual(result.br,[255,0,0,255]);for(const k of ['tl','tr','bl'])assert.deepEqual(result[k],[0,0,255,255]);console.log('PASS fine reveal begins at bottom-right, with all other corners unchanged and opaque');
 const frame=await p.locator('.ww-lights').getAttribute('data-frame');await p.waitForTimeout(500);assert.equal(await p.locator('.ww-transition').getAttribute('data-step'),result.step);assert.notEqual(await p.locator('.ww-lights').getAttribute('data-frame'),frame);console.log('PASS city pause holds the tile wave while ambient lights advance');
 await p.setViewportSize({width:320,height:568});assert(await p.locator('.ww-transition').evaluate(c=>c.width===Math.round(c.clientWidth*devicePixelRatio)));await p.evaluate(()=>document.querySelector('.ww-root').classList.remove('ww-paused'));await p.waitForFunction(()=>window.tileTestDone);assert.equal(await p.locator('.ww-transition').count(),0);console.log('PASS resize mid-transition and resume finish without leftover canvas');
 await p.evaluate(()=>window.tileTestEffects.dispose());const held=await p.locator('.ww-lights').getAttribute('data-frame');await p.waitForTimeout(300);assert.equal(await p.locator('.ww-lights').getAttribute('data-frame'),held);console.log('PASS disposing the welcome cancels ambient frames');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
