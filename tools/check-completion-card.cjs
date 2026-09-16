const {chromium}=require('playwright'),assert=require('assert');
(async()=>{
 const b=await chromium.launch({executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
 try{
  const p=await b.newPage({viewport:{width:393,height:852},serviceWorkers:'block'});
  await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());
  await p.goto('http://127.0.0.1:8784/');
  await p.evaluate(()=>{DB={days:{},settings:{onboarded:true,unit:'lb',mascotMotion:'animated'}};DB.days[todayISO]={w:[{part:'Chest',ex:'Dip',w:0,reps:[10]}],doneAll:true,upd:1,donePart:[],doneEx:[]};SEED=deriveAll();view='today';document.querySelector('#onb')?.remove();render();});
  const card=p.locator('.card.dayclosed');
  assert(await card.isVisible());assert.equal(await card.locator('.dcm').innerText(),'day of showing up');
  const before=await p.evaluate(()=>JSON.stringify(DB.days));
  assert.equal(await card.evaluate(e=>getComputedStyle(e,'::after').animationIterationCount),'infinite');
  await card.click();assert.equal(await p.locator('#dayDone.dd-connected').count(),1);
  assert(await p.locator('#dayDone .ddn').evaluate(e=>e.getAnimations().length>0));
  assert.equal(await p.evaluate(()=>JSON.stringify(DB.days)),before);
  await p.locator('#dayDone button').filter({hasText:/^Done$/}).click();
  await p.evaluate(()=>{ddCardArrival={date:todayISO,milestone:true};ddGreetCompletedCard();});
  assert.equal(await p.evaluate(()=>ddCardArrival),null);
  assert(await card.evaluate(e=>e.getAnimations().length>0));
  await p.emulateMedia({reducedMotion:'reduce'});await card.click();
  assert.equal(await p.locator('#dayDone.dd-connected').count(),0);
  console.log('PASS mobile card, caption, infinite glow, connected animation, replay preserves logs, one-time milestone, reduced motion');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
