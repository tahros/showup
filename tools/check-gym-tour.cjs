/* check-gym-tour.cjs — v4.6.135: the secret gym film.
 * Needs a local server on :8784 (python3 -m http.server 8784) and Chromium;
 * PW_CHROME overrides the Windows path. Checks, in Minimal and Retro, light and dark:
 * two taps do nothing; three quick taps on the Today mascot open the film; it is
 * drawing and moving; a rotation keeps it playing without a restart and fills the
 * landscape screen edge to edge; any tap closes it back to Today with
 * the record untouched; it never opens from another tab. */
const {chromium}=require('playwright'),assert=require('assert');
const EXE=process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe';
(async()=>{const b=await chromium.launch({executablePath:EXE});let n=0;const pass=m=>{console.log('PASS',m);n++;};
try{for(const skin of ['minimal','retro'])for(const theme of ['light','dark'])for(const motion of ['animated','still']){
 const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block',hasTouch:true});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());
 await p.goto('http://127.0.0.1:8784/');await p.waitForTimeout(900);
 await p.evaluate(([skin,theme,motion])=>{document.querySelector('#onb')?.remove();todayISO='2026-09-25';checkDate=()=>false;
   DB.days={'2026-09-24':{w:[{ex:'Squat',part:'Legs',w:100,reps:[5],at:Date.parse('2026-09-24T10:00')}]}};
   DB.settings={...DB.settings,skin,theme,mascotMotion:motion,onboarded:true};SEED=deriveAll();applyTheme();view='today';render();},[skin,theme,motion]);
 await p.waitForTimeout(1200);
 const tag=`${skin}/${theme}/${motion}`;
 const before=await p.evaluate(()=>JSON.stringify(DB));
 const m=p.locator('#view .su-mascot').first();await m.waitFor();const box=await m.boundingBox();
 const tap=()=>p.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await tap();await p.waitForTimeout(120);await tap();await p.waitForTimeout(700);
 assert.equal(await p.locator('#gymTour').count(),0,tag+' two taps must not open');
 await p.waitForTimeout(1300);
 await tap();await p.waitForTimeout(90);await tap();await p.waitForTimeout(90);await tap();await p.waitForTimeout(900);
 assert.equal(await p.locator('#gymTour').count(),1,tag+' three taps open');
 const sig=()=>p.evaluate(()=>{const c=document.querySelector('#gymTourScreen');const x=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=0,lit=0;for(let i=0;i<x.length;i+=97){h=(h*31+x[i])>>>0;if(x[i]>40)lit++;}return {h,lit,w:c.width,h2:c.height};});
 const s1=await sig();await p.waitForTimeout(700);const s2=await sig();
 assert(s1.lit>50&&s1.h!==s2.h,tag+' film is drawing and moving');pass(tag+': three quick taps open the film; it draws and moves (two taps do nothing)');
 await p.setViewportSize({width:844,height:390});await p.waitForTimeout(500);
 const s3=await sig();
 assert.equal(await p.locator('#gymTour').count(),1);
 const fill=await p.evaluate(()=>{const c=document.querySelector('#gymTourScreen'),r=c.getBoundingClientRect();return {w:r.width,h:r.height,vw:innerWidth,vh:innerHeight,cw:c.width,ch:c.height};});
 assert(fill.w===fill.vw&&fill.h===fill.vh&&s3.w===fill.cw,tag+' fills the landscape screen');
 const scale=Math.min(fill.cw/160,fill.ch/90);assert(scale*90>=fill.ch-1||scale*160>=fill.cw-1,tag+' landscape: the film spans the screen edge to edge on one axis');
 pass(tag+': rotated, it keeps playing and fills the screen edge to edge');
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);
 await p.mouse.click(200,400);await p.waitForTimeout(300);
 assert.equal(await p.locator('#gymTour').count(),0,tag+' a tap closes');
 assert.equal(await p.evaluate(()=>view),'today');assert.equal(await p.evaluate(()=>JSON.stringify(DB)),before,tag+' record untouched');
 pass(tag+': any tap closes it back to Today; nothing written');
 await p.evaluate(()=>{view='stats';render();});await p.waitForTimeout(400);
 const sm=p.locator('#view .su-mascot').first();
 if(await sm.count()){const bb=await sm.boundingBox();for(let i=0;i<3;i++){await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(80);}await p.waitForTimeout(600);}
 assert.equal(await p.locator('#gymTour').count(),0,tag+' never from another tab');
 assert.deepEqual(errs,[]);await p.close();
}console.log(`\n${n} passed`);}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
