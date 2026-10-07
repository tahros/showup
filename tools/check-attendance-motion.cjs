/* Serve repo on PW_PORT (8784 default). Real renderer/lifecycle regressions:
   one retained canvas, live sheen after completion/seek, no data writes,
   theme/resize continuity, reduced motion and header separation. */
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const origin=process.env.ATTENDANCE_ORIGIN||'http://127.0.0.1:'+(process.env.PW_PORT||8784)+'/';
(async()=>{const browser=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
try{for(const theme of ['light','dark']){
 const p=await browser.newPage({viewport:{width:393,height:852},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());await p.goto(origin);
 await p.evaluate(theme=>{document.querySelector('#onb')?.remove();todayISO='2026-10-06';checkDate=()=>false;DB.settings={...DB.settings,onboarded:true,name:'Motion QA',theme,bar:theme};DB.days={};for(let t=Date.UTC(2021,11,1);t<=Date.UTC(2026,9,6);t+=86400000)if(Math.floor(t/86400000)%3!==0)DB.days[new Date(t).toISOString().slice(0,10)]={w:[{part:'Shoulder',ex:'Overhead Press',w:10,reps:[8]}]};DB.days[todayISO]={w:[{part:'Legs',ex:'Squat',w:20,reps:[8]}]};SEED=deriveAll();view='stats';applyTheme();render();window.beforeMotion=JSON.stringify(DB);},theme);
 // Let the app's existing onboarding/save migration settle before measuring
 // this presentation-only feature. The test fixture replaces the initial DB.
 await p.locator('.attendance-card').scrollIntoViewIfNeeded();await p.waitForTimeout(4000);await p.evaluate(()=>{window.beforeMotion=JSON.stringify(DB);});
 await p.evaluate(()=>{heatReplay.play(document.querySelector('.attendance-card'));heatReplay.live.seek(1330);});
 if(process.env.QA_DIR){fs.mkdirSync(process.env.QA_DIR,{recursive:true});await p.locator('.attendance-card').screenshot({path:process.env.QA_DIR+'/pulse-'+theme+'.png'});}
 const pulse=await p.evaluate(()=>{const c=document.querySelector('.attendance-card');return {phase:c.dataset.phase,count:+c.dataset.revealed,expected:attendanceView.phase(attendanceView.model(),1330).count};});assert.equal(pulse.phase,'pulse');assert.equal(pulse.count,pulse.expected);
 // Hold any replay frame: ambient light must keep advancing independently.
 const held=await p.evaluate(()=>{const s=document.querySelector('.attendance-card')._attendance.scene;return [s.elapsed,s.ambient];});await p.waitForTimeout(200);const heldAfter=await p.evaluate(()=>{const s=document.querySelector('.attendance-card')._attendance.scene;return [s.elapsed,s.ambient];});assert.equal(held[0],heldAfter[0]);assert(heldAfter[1]>held[1]);
 await p.evaluate(()=>{const c=document.querySelector('.attendance-card');window.originalCanvas=c.querySelector('canvas');c._attendance.scene.seek(heatReplay.duration());});
 const a=await p.locator('.at-replay-canvas').screenshot();await p.waitForTimeout(700);const b=await p.locator('.at-replay-canvas').screenshot();assert(!a.equals(b),'shimmer must keep changing pixels after completion');
 assert(await p.evaluate(()=>{const c=document.querySelector('.attendance-card');return c.querySelector('canvas')===originalCanvas&&c.dataset.phase==='complete'&&+c.dataset.revealed===attendanceView.model().total&&!heatReplay.live;}));
 for(const width of [320,393]){await p.setViewportSize({width,height:852});await p.waitForTimeout(100);assert(await p.evaluate(()=>document.querySelector('.at-replay-canvas')===originalCanvas),'resize must not replace the scene');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(process.env.QA_DIR)await p.locator('.attendance-card').screenshot({path:process.env.QA_DIR+'/complete-'+theme+'-'+width+'.png'});}
 await p.evaluate(()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';});assert(await p.evaluate(()=>document.querySelector('.at-replay-canvas')===originalCanvas));await p.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>!document.querySelector('.at-replay-canvas'));assert(await p.evaluate(()=>getComputedStyle(document.querySelector('.at-mini.on')).animationName==='none'));
 await p.emulateMedia({reducedMotion:'no-preference'});await p.locator('.at-motion').selectOption('Off');assert(await p.evaluate(()=>getComputedStyle(document.querySelector('.at-mini.on')).animationName==='none'));
 const changes=await p.evaluate(()=>{const before=JSON.parse(beforeMotion),out=[];function visit(a,b,k){if(JSON.stringify(a)===JSON.stringify(b))return;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const key of new Set([...Object.keys(a),...Object.keys(b)]))visit(a[key],b[key],k+'.'+key);}else out.push({key:k,before:a,after:b});}visit(before,DB,'DB');return out;});assert.deepEqual(changes,[],'saved history/profile must not change: '+JSON.stringify(changes));assert.deepEqual(errors,[]);console.log('PASS '+theme+': ripple, continuous retained renderer, shimmer, resize/theme, Off/reduced motion, data preserved');await p.close();
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
