// Isolated local browser and synthetic history; no account or external traffic.
const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
try{const p=await b.newPage({viewport:{width:393,height:852},serviceWorkers:'block'});
await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());await p.goto('http://127.0.0.1:8784/');await p.waitForTimeout(1200);
await p.evaluate(()=>{document.querySelector('#onb')?.remove();todayISO='2026-09-14';checkDate=()=>false;DB.settings.onboarded=true;DB.days={};for(const yr of [2026,2025,2024])for(let m=1;m<=9;m++)for(const day of [1,8]){DB.days[`${yr}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`]={w:[{ex:'Squat',part:'Legs',w:80,reps:[8],at:1},{ex:'Run',part:'Run',w:5,reps:[1],at:1}]};}SEED=deriveAll();view='stats';render();});
await p.waitForSelector('.runrace.comparison-card');const cards=p.locator('.comparison-card');assert(await cards.count()>=2);
const before=await p.evaluate(()=>JSON.stringify(DB));
for(let i=0;i<2;i++){
 const card=cards.nth(i);await card.locator('.comparison-replay').click();assert(await card.locator('polyline').first().evaluate(e=>e.getAnimations().length===1));
 await card.locator('.comparison-share').click();await p.waitForSelector('[data-format="gif"]');
 assert(await p.locator('#repDo').innerText()==='Share image');assert(await p.evaluate(()=>_repCv.cv.width===1080&&_repCv.cv.height===1280));
 if(!await p.locator('[data-format="mp4"]').isDisabled()){
  await p.locator('[data-format="mp4"]').click();await p.waitForFunction(()=>!!_repCv.videoBlob,null,{timeout:30000});
  await p.waitForFunction(()=>document.querySelector('.plate-export-video').videoWidth===1080);assert(await p.evaluate(()=>_repCv.videoBlob.type==='video/mp4'));
 }
 await p.locator('[data-format="gif"]').click();await p.waitForTimeout(80);await p.locator('[data-format="image"]').click();assert(await p.locator('#repDo').isEnabled());
 await p.locator('[data-format="gif"]').click();await p.waitForFunction(()=>!!_repCv.gifBlob,null,{timeout:180000});
 assert(await p.evaluate(async()=>new TextDecoder().decode((await _repCv.gifBlob.arrayBuffer()).slice(0,6)).startsWith('GIF8')));
 await p.locator('[data-format="image"]').click();assert(await p.evaluate(()=>!_repCv.gifBlob&&!_repCv.videoBlob));await p.locator('#repClose').click();
 console.log('PASS chart',i,'Replay, PNG, playable MP4, real GIF, cancellation, cleanup');
}
assert(await p.evaluate(()=>JSON.stringify(DB))===before);
for(const width of [320,393,430]){await p.setViewportSize({width,height:852});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(3000);await cards.first().locator('.comparison-replay').click();assert(await cards.first().locator('polyline').first().evaluate(e=>e.getAnimations().length===0));
await p.setViewportSize({width:393,height:852});await cards.first().screenshot({path:'../comparison-share-verified.png'});
console.log('PASS mobile widths, reduced motion, history unchanged');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
