// Isolated local browser and synthetic history; no account or external traffic.
const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
try{const p=await b.newPage({viewport:{width:393,height:852},serviceWorkers:'block'});
await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());await p.goto('http://127.0.0.1:8784/');await p.waitForTimeout(1200);
await p.evaluate(()=>{document.querySelector('#onb')?.remove();todayISO='2026-09-14';checkDate=()=>false;DB.settings.onboarded=true;DB.days={};for(const yr of [2026,2025,2024])for(let m=1;m<=9;m++)for(const day of [1,8]){DB.days[`${yr}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`]={w:[{ex:'Squat',part:'Legs',w:80,reps:[8],at:1},{ex:'Run',part:'Run',w:5,reps:[1],at:1}]};}SEED=deriveAll();view='stats';render();});
await p.waitForSelector('.runrace.comparison-card');const cards=p.locator('.comparison-card');assert(await cards.count()>=2);
const before=await p.evaluate(()=>JSON.stringify(DB));
await p.evaluate(()=>{const bind=bindPlateExport;bindPlateExport=(data,mascot,gif,video,options)=>{
 window.exportFrames=[0,1500,3500].map(time=>{const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),texts=[],moves=[];
 const text=ctx.fillText.bind(ctx),move=ctx.moveTo.bind(ctx);ctx.fillText=(...args)=>{texts.push(String(args[0]));text(...args);};ctx.moveTo=(...args)=>{if(ctx.getLineDash().join(',')==='6,6')moves.push(args);move(...args);};options.render(time,canvas);return {texts,cursor:moves.at(-1)[0]};});return bind(data,mascot,gif,video,options);
};});
for(let i=0;i<2;i++){
 const card=cards.nth(i),read=()=>card.evaluate(c=>({index:+c.querySelector('input').value,value:c.querySelector('strong i').textContent,date:c.querySelector('.comparison-date').textContent,cursor:+c.querySelector('line.comparison-marker').getAttribute('x1'),points:c.querySelector('polyline').points.numberOfItems}));
 const final=await read();await card.locator('.comparison-replay').click();const start=await read();await p.waitForTimeout(1300);const middle=await read();
 assert(start.index<middle.index&&middle.index<final.index,'Replay advances real date index');assert(start.cursor<middle.cursor&&middle.cursor<final.cursor,'Scrub line travels with date');
 assert(start.points<middle.points&&middle.points<final.points,'Actual SVG geometry grows');assert(start.value!==middle.value&&middle.value!==final.value,'Totals change with actual history');assert(start.date!==middle.date,'Date updates');
 await p.waitForFunction(i=>document.querySelectorAll('.comparison-card')[i].dataset.playing==='false',i);assert.deepStrictEqual(await read(),final,'Replay ends at exact original state');
 await card.locator('.comparison-replay').click();await p.waitForTimeout(250);await card.locator('input').evaluate(e=>{e.value=100;e.dispatchEvent(new Event('input'));});await p.waitForTimeout(200);assert((await read()).index===100,'Manual scrubbing cancels playback');
 await card.locator('.comparison-replay').click();await p.waitForTimeout(100);await card.locator('.comparison-replay').click();await p.waitForFunction(i=>document.querySelectorAll('.comparison-card')[i].dataset.playing==='false',i);assert((await read()).index===100,'Repeated replay retains scrubbed endpoint');
 await card.locator('.comparison-latest').click();
 await card.locator('.comparison-share').click();await p.waitForSelector('[data-format="gif"]');
 const frames=await p.evaluate(()=>window.exportFrames);assert(frames[0].cursor<frames[1].cursor&&frames[1].cursor<frames[2].cursor,'Export scrub line moves');assert(frames[0].texts[1]!==frames[1].texts[1]&&frames[1].texts[1]!==frames[2].texts[1],'Export date changes');assert(frames[0].texts[3]!==frames[1].texts[3]&&frames[1].texts[3]!==frames[2].texts[3],'Export values advance');
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
await p.emulateMedia({reducedMotion:'reduce'});await cards.first().locator('.comparison-replay').click();await p.waitForTimeout(1200);assert(await cards.first().locator('input').evaluate(e=>+e.value>0&&+e.value<+e.max),'Explicit reduced-motion Replay advances in discrete steps');await p.waitForFunction(()=>document.querySelector('.comparison-card').dataset.playing==='false');
await p.setViewportSize({width:393,height:852});await cards.first().screenshot({path:'../comparison-share-verified.png'});
console.log('PASS mobile widths, reduced motion, history unchanged');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
