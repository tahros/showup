// PW_PORT=8858 node tools/check-day-review.cjs . -- isolated synthetic account.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const origin=process.env.DAY_REVIEW_ORIGIN||'http://127.0.0.1:'+(process.env.PW_PORT||8858)+'/',out=process.env.QA_DIR||'../day-review-release-qa';
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
try{const p=await browser.newPage({viewport:{width:393,height:852},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());await p.goto(origin);await p.waitForTimeout(2200);
await p.evaluate(()=>{
 document.querySelector('#onb')?.remove();todayISO='2026-10-07';checkDate=()=>false;
 DB={days:{},settings:{unit:'lb',name:'Sungjee Yoo',onboarded:true,theme:'light',bar:'light',equipOv:{},custom:{}}};
 DB.plan={d:todayISO,items:[{ex:'Run',lines:[]},{ex:'Squat',lines:[{w:185/LB,reps:[8,8,8,8]}]},{ex:'Leg Press',lines:[{w:270/LB,reps:[12,12,12,12]}]},{ex:'Leg Curl',lines:[{w:70/LB,reps:[12,12,12,12]}]},{ex:'Hanging Leg Raise',lines:[{w:0,bw:true,reps:[15,15,15]}]},{ex:'Cable Crunch',lines:[{w:50/LB,reps:[15,15,15]}]}]};
 SEED=deriveAll();plCapture();lift={ex:'Run',part:'Run'};const start=Date.parse('2026-10-07T10:00:00');let n=0;
 const add=(part,ex,w,reps)=>{lift.ex=ex;lift.part=part;plLog({part,ex,w:w/LB,reps,at:start+(++n)*60000});};
 plLog({part:'Run',ex:'Run',w:2.8/MI,reps:[],mins:20,secs:0,at:start+20*60000});n=20;
 [8,8,6].forEach(r=>add('Legs','Squat',195,[r]));[14,14,12,12].forEach(r=>add('Legs','Leg Press',270,[r]));[15,15,15,12].forEach(r=>add('Sixpack','Hanging Leg Raise',0,[r]));[12,12].forEach(r=>add('Shoulder','Lateral Raise',15,[r]));
 DB.days[todayISO].completedAt=start+58*60000;DB.days[todayISO].doneAll=true;SEED=deriveAll();view='stats';applyTheme();render();window.reviewFixture=JSON.stringify(DB);
});
await p.locator('.day-review').waitFor();
assert(await p.evaluate(()=>document.querySelector('.attendance-card').nextElementSibling.matches('.day-review')),'placement below attendance');
for(const theme of ['light','dark'])for(const width of [320,393,736]){
 await p.setViewportSize({width,height:852});await p.evaluate(theme=>{DB.settings.theme=theme;DB.settings.bar=theme;applyTheme();view='stats';render();},theme);
 await p.locator('.day-review').scrollIntoViewIfNeeded();await p.waitForTimeout(3700);
 const checks=await p.evaluate(()=>{const c=document.querySelector('.day-review');return {overflow:c.scrollWidth>c.clientWidth,cols:c.querySelectorAll('thead th').length,footer:[...c.querySelectorAll('.dr-totals b')].map(n=>n.textContent),size:getComputedStyle(c.querySelector('.dr-totals b')).fontSize,exercise:getComputedStyle(c.querySelector('tbody th')).fontSize};});
 assert(!checks.overflow);assert.equal(checks.cols,3);assert.deepEqual(checks.footer,['58','14','5','2.8']);assert.equal(checks.size,'23px');
 assert.equal(await p.locator('.day-review tbody th').first().evaluate(e=>getComputedStyle(e).textTransform),'none');
 await p.locator('.day-review').screenshot({path:path.join(out,`day-${theme}-${width}.png`),style:'header, nav, #calReturn, #progressSwitch {visibility:hidden!important}'});
 console.log('PASS',theme,width,checks);
}
await p.setViewportSize({width:393,height:852});
const initial=await p.evaluate(()=>{const c=document.querySelector('.day-review');window.beforeReplay=JSON.stringify(DB);dayReviewReplay(c);return [...c.querySelectorAll('[data-dr-reveal]')].every(e=>+getComputedStyle(e).opacity===0);});assert(initial,'all Today values start blank');
await p.waitForTimeout(950);assert(await p.evaluate(()=>{const c=document.querySelector('.day-review');return +getComputedStyle(c.querySelector('tbody tr:first-child .dr-actual [data-dr-reveal]')).opacity>.8&&+getComputedStyle(c.querySelector('tbody tr:last-child .dr-actual [data-dr-reveal]')).opacity===0;}),'top-down reveal');
await p.waitForTimeout(2800);assert(await p.evaluate(()=>JSON.stringify(DB)===beforeReplay),'replay read only');
await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>dayReviewReplay(document.querySelector('.day-review')));assert(await p.evaluate(()=>[...document.querySelectorAll('.day-review [data-dr-reveal]')].every(e=>+getComputedStyle(e).opacity===1)),'reduced motion');
await p.emulateMedia({reducedMotion:'no-preference'});
for(const theme of ['light','dark']){
 await p.evaluate(theme=>{DB.settings.theme=theme;DB.settings.bar=theme;applyTheme();},theme);
 await p.evaluate(()=>shareDayReview(document.querySelector('[data-dr-share]')));await p.waitForTimeout(500);
 assert.equal(await p.locator('.plate-export-options button').count(),2,'image/video only');
 const image=await p.evaluate(()=>_repCv.cv.toDataURL());fs.writeFileSync(path.join(out,`share-${theme}.png`),Buffer.from(image.split(',')[1],'base64'));
 if(theme==='dark'&&!process.env.SKIP_VIDEO){
  const videoButton=p.locator('[data-format="mp4"]');
  if(await videoButton.isEnabled()){
   await videoButton.click();await p.waitForFunction(()=>!!_repCv?.videoBlob,{},{timeout:40000});
   const meta=await p.locator('.plate-export-video').evaluate(async v=>{if(!v.videoWidth)await new Promise(r=>v.addEventListener('loadedmetadata',r,{once:true}));return {w:v.videoWidth,h:v.videoHeight,d:v.duration};});
   assert.equal(meta.w,1080);assert(meta.h>1280&&meta.d>4);console.log('PASS decoded MP4',meta);
   const bytes=await p.evaluate(async()=>Array.from(new Uint8Array(await _repCv.videoBlob.arrayBuffer())));fs.writeFileSync(path.join(out,'day-review.mp4'),Buffer.from(bytes));
  }else console.log('MP4 unsupported by this test browser');
 }
 await p.locator('#repClose').click();
}
await p.evaluate(()=>{DB.days[todayISO].planBasis={revision:null};DB.days['2026-10-02']={w:[{part:'Legs',ex:'Squat',w:185/LB,reps:[8,8,8,8]}]};SEED=deriveAll();render();});
await p.locator('.day-review').scrollIntoViewIfNeeded();await p.waitForTimeout(3500);assert.equal(await p.locator('.day-review thead th').nth(1).innerText(),'Last');assert.equal(await p.locator('.day-review tbody tr').count(),6);
assert((await p.locator('.day-review tbody').innerText()).includes('New load'));
await p.locator('.dr-original summary').click();assert(await p.locator('.dr-original').evaluate(e=>e.open));
await p.locator('.dr-original summary').click();
await p.locator('.day-review').screenshot({path:path.join(out,'no-plan.png')});
await p.evaluate(()=>{window.dateNavBefore=JSON.stringify(DB);window.attendanceBefore=document.querySelector('.attendance-card');});
await p.locator('[data-dr-step="-1"]').click();
assert.equal(await p.locator('.day-review').getAttribute('data-dr-selected'),'2026-10-06');
assert.equal(await p.locator('.day-review thead th').nth(2).innerText(),'Logged');
assert.equal(await p.locator('.dr-empty-day').innerText(),'No workout logged on this day.');
assert(await p.locator('[data-dr-share]').isDisabled());
assert(await p.evaluate(()=>todayISO==='2026-10-07'&&attendanceBefore===document.querySelector('.attendance-card')),'no global date or page rerender');
await p.locator('[data-dr-calendar]').click();assert(await p.locator('#drCalendar').isVisible());
assert(await p.locator('[data-dr-date="2026-10-08"]').isDisabled());
await p.locator('[data-dr-date="2026-10-02"]').click();
assert.equal(await p.locator('#drCalendar').count(),0);assert.equal(await p.locator('.day-review tbody th').first().innerText(),'Squat\nFirst session');
assert.equal(await p.locator('[data-dr-location]').count(),0,'no current weather on a historical workout');
const historical=await p.evaluate(()=>dayReviewExportModel());assert.equal(historical.date,'2026-10-02');assert.equal(historical.actualLabel,'Logged');assert.equal(historical.dayCount,1);assert.equal(historical.totals.sets,4);
assert(await p.evaluate(()=>JSON.stringify(DB)===dateNavBefore),'date navigation and historical export are read only');
await p.locator('[data-dr-today]').click();assert(await p.locator('[data-dr-step="1"]').isDisabled());assert.equal(await p.locator('.day-review').getAttribute('data-dr-selected'),'2026-10-07');
await p.locator('[data-dr-calendar]').click();await p.locator('[data-dr-month="-1"]').click();assert((await p.locator('.dr-month').innerText()).includes('September 2026'));
await p.keyboard.press('Escape');assert.equal(await p.locator('#drCalendar').count(),0);
assert(await p.locator('[data-dr-calendar]').evaluate(e=>e===document.activeElement));
assert(await p.evaluate(()=>dayReviewValidDate('2024-02-29')&&!dayReviewValidDate('2025-02-29')&&!dayReviewValidDate('2026-10-08')&&dayReviewShift('2026-03-09',-1)==='2026-03-08'&&dayReviewShift('2026-01-01',-1)==='2025-12-31'));
for(const width of [320,393]){await p.setViewportSize({width,height:852});await p.locator('[data-dr-calendar]').click();assert(await p.locator('.day-review').evaluate(e=>e.scrollWidth<=e.clientWidth));await p.locator('.day-review').screenshot({path:path.join(out,`date-calendar-${width}.png`),style:'header,nav,#calReturn,#progressSwitch{visibility:hidden!important}'});await p.keyboard.press('Escape');}
console.log('PASS selected-date records, historical export, calendar, rollover, future guard, read-only navigation and narrow layouts');
await p.evaluate(()=>{
 const row=(w,reps)=>({part:'Shoulder',ex:'Dumbbell Shoulder Press',w,reps});
 DB.days['2026-08-03']={w:[row(16,[30,30,30,25]),row(20,[20]),row(22,[12,10,10]),row(22,[12]),row(12,[25,20,20]),row(12,[20])]};
 DB.days['2026-07-27']={w:[row(16,[35,30,16,30]),row(20,[15,20,15,16]),row(12,[20,20,30,30])]};
 SEED=deriveAll();drSelection='2026-08-03';window.matchBefore=JSON.stringify(DB);render();
});
await p.emulateMedia({reducedMotion:'reduce'});
for(const theme of ['light','dark'])for(const width of [320,393]){
 await p.setViewportSize({width,height:852});await p.evaluate(theme=>{DB.settings.theme=theme;DB.settings.bar=theme;applyTheme();render();},theme);
 await p.locator('.day-review').scrollIntoViewIfNeeded();
 assert.equal(await p.locator('.day-review tbody tr').count(),4);
 assert.equal(await p.locator('.day-review .dr-actual .dr-rep').count(),13);
 assert.equal(await p.locator('.day-review .dr-gain').count(),0);
 assert(await p.locator('.day-review').evaluate(e=>e.scrollWidth<=e.clientWidth));
 const aligned=await p.locator('.day-review tbody tr').evaluateAll(rows=>rows.slice(0,3).every(r=>{const w=r.querySelectorAll('.dr-weight');return w.length===2&&w[0].textContent===w[1].textContent&&Math.abs(w[0].getBoundingClientRect().y-w[1].getBoundingClientRect().y)<1;}));assert(aligned);
 await p.locator('.day-review').screenshot({path:path.join(out,`matched-${theme}-${width}.png`),style:'header,nav,#calReturn,#progressSwitch{visibility:hidden!important}'});
 const result=await p.evaluate(()=>{const data=dayReviewExportModel();return {count:data.rows[0].lanes.length,png:drawDayReview(data).toDataURL()};});assert.equal(result.count,4);
 fs.writeFileSync(path.join(out,`matched-share-${theme}.png`),Buffer.from(result.png.split(',')[1],'base64'));
}
await p.locator('.dr-original summary').click();assert((await p.locator('.dr-original p').first().innerText()).startsWith('35.3'));
assert(await p.evaluate(()=>JSON.stringify(DB.days)===JSON.stringify(JSON.parse(matchBefore).days)),'matched rendering preserves records');
console.log('PASS matched weights, original order, alignment, all reps, narrow themes and shared canvas');
assert.deepEqual(errors,[]);console.log('PASS placement, motion, share, reduced motion, no-plan, no runtime errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
