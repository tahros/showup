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
await p.locator('.day-review').scrollIntoViewIfNeeded();await p.waitForTimeout(3500);assert.equal(await p.locator('.day-review thead th').nth(1).innerText(),'Last');assert.equal(await p.locator('.day-review tbody tr').count(),5);
await p.locator('.day-review').screenshot({path:path.join(out,'no-plan.png')});
assert.deepEqual(errors,[]);console.log('PASS placement, motion, share, reduced motion, no-plan, no runtime errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
