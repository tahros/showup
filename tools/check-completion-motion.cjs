const {chromium}=require('playwright'),assert=require('assert');
(async()=>{
 const b=await chromium.launch({executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe',headless:true});
 for(const theme of ['light','dark'])for(const reducedMotion of ['no-preference','reduce']){
  const p=await b.newPage({viewport:{width:393,height:852},reducedMotion});
  await p.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:8784'?r.continue():r.abort());
  await p.goto('http://127.0.0.1:8784/');
  await p.evaluate(theme=>{DB.settings.theme=theme;DB.settings.mascotMotion='animated';applyTheme();document.querySelector('#onb')?.remove();},theme);
  await p.waitForTimeout(1500);
  let previous='';
  for(const variant of ['rise','arc','land']){
   await p.evaluate(()=>celebrateDayDone(true,964,0,true));
   const current=await p.locator('#dayDone').getAttribute('data-entrance');assert(current!==previous);previous=current;
   await p.evaluate(variant=>document.querySelector('#dayDone').dataset.entrance=variant,variant);
   const animation=await p.locator('.ddhero').evaluate(e=>getComputedStyle(e).animationName);
   assert.equal(animation,reducedMotion==='reduce'?'none':'ddcinema-'+variant);
   await p.waitForTimeout(1250);
   assert.equal(await p.locator('.ddn').textContent(),'964');
   assert(await p.locator('.ddhero').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}));
   await p.locator('[data-dd="done"]').click();assert.equal(await p.locator('#dayDone').count(),0);
   await p.waitForTimeout(1100);
  }
  await p.evaluate(()=>{DB.settings.mascotMotion='still';celebrateDayDone(true,964,0,true);});
  assert.equal(await p.locator('#dayDone').getAttribute('data-entrance'),null);
  console.log('PASS completion variants, nonrepeat, final count, dismissal and still mode '+theme+' '+reducedMotion);await p.close();
 }
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
