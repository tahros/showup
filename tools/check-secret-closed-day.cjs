/* check-secret-closed-day.cjs — v4.6.146: the gym film on a FINISHED day.
 * Needs a local server on :8784 (python3 -m http.server 8784 from the repo) and
 * Chromium; PW_CHROME overrides the path below.
 * Found on the phone: after completing a workout the Today card becomes the
 * replay button, so one tap on the mascot opened the day summary and the
 * secret's second and third taps never reached the mascot.
 * 1. Three quick taps on the mascot of a finished day: the film opens, the
 *    summary does not.
 * 2. One tap on the mascot: the summary opens (after a short beat), once.
 * 3. A tap elsewhere on the card: the summary opens at once. */
const {chromium}=require('playwright'),assert=require('assert');
const EXE=process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe';
(async()=>{const b=await chromium.launch({executablePath:EXE});
try{
 const page=async()=>{const p=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());
  await p.goto('http://127.0.0.1:8784/');await p.waitForTimeout(1200);
  await p.evaluate(()=>{document.querySelector('#onb')?.remove();const N=Date.now();DB.days[todayISO]={w:[{part:'Legs',ex:'Squat',w:100,reps:[5],at:N-3600e3}],doneAll:true,closed:[N-60e3],completedAt:N-60e3,doneEx:['Squat'],donePart:['Legs']};DB.settings.dayDone=todayISO;SEED=deriveAll();view='today';render();});
  await p.waitForTimeout(800);return p;};
 const mascot=p=>p.locator('[data-replayday] .su-mascot').first();
 { const p=await page();await mascot(p).scrollIntoViewIfNeeded();const bx=await mascot(p).boundingBox();assert(bx,'a mascot on the finished card');
   for(let i=0;i<3;i++){await p.mouse.click(bx.x+bx.width/2,bx.y+bx.height/2);await p.waitForTimeout(120);}
   await p.waitForTimeout(700);
   assert.equal(await p.locator('#gymTour').count(),1,'the film opens');assert.equal(await p.locator('#dayDone').count(),0,'the summary stays shut');
   console.log('PASS three taps on a finished day\'s mascot: the film, not the summary');await p.close(); }
 { const p=await page();await mascot(p).click();await p.waitForTimeout(150);
   assert.equal(await p.locator('#dayDone').count(),0,'waits a beat');await p.waitForTimeout(600);
   assert.equal(await p.locator('#dayDone').count(),1,'then the summary');assert.equal(await p.locator('#gymTour').count(),0);
   console.log('PASS one tap on the mascot: the summary, after a beat');await p.close(); }
 { const p=await page();const card=p.locator('[data-replayday]').first();const cb=await card.boundingBox();
   await p.mouse.click(cb.x+12,cb.y+12);await p.waitForTimeout(200);
   assert.equal(await p.locator('#dayDone').count(),1,'at once');
   console.log('PASS a tap elsewhere on the card: the summary at once');await p.close(); }
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
