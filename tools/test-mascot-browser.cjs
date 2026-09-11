/* Isolated-browser visual and interaction QA. Never reads a browser profile.
   Uses synthetic workouts and blocks every non-local network request. */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe',args:['--enable-unsafe-swiftshader']});
 const out=process.env.MASCOT_QA_DIR||path.resolve('../mascot-qa');fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,serviceWorkers:'block'});
 await context.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8768/')?route.continue():route.abort());
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8768');await page.waitForTimeout(600);
 const alpha=await page.evaluate(async()=>{
   const results=[];
   for(const name of ['mascot-charcoal','mascot-white','mascot-mark-charcoal','mascot-mark-white']){
     const im=new Image();im.src='assets/'+name+'.png';await im.decode();
     const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;
     const x=c.getContext('2d');x.drawImage(im,0,0);const data=x.getImageData(0,0,c.width,c.height).data;
     results.push({name,corner:data[3],hasInk:data.some((n,i)=>i%4===3&&n>240)});
   }return results;
 });
 assert(alpha.every(a=>a.corner===0&&a.hasInk));
 async function setup(theme,days,closed){
   await page.evaluate(({theme,days,closed})=>{
     document.getElementById('dayDone')?.remove();
     document.getElementById('onb')?.remove();
     DB.settings.onboarded=true;DB.settings.theme=theme;DB.settings.mascotMotion='animated';DB.settings.firstName='Sungjee';
     delete DB.settings.dayDone;delete DB.settings.mascot25Date;
     DB.days={};
     for(let i=1;i<days;i++){const date=new Date(todayISO+'T12:00');date.setDate(date.getDate()-i);DB.days[date.toLocaleDateString('en-CA')]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8]}],upd:1};}
     const now=Date.now();
     DB.days[todayISO]={w:days?[{part:'Run',ex:'Run',w:2,reps:[],mins:15,secs:0,at:now-20*60000},
       {part:'Chest',ex:'Incline Barbell Bench Press',w:70,reps:[8,8,7,6],at:now-18*60000},
       {part:'Sixpack',ex:'Hanging Leg Raise',w:0,reps:[12,12,12,12],at:now-10*60000}]:[],doneEx:[],donePart:[],doneAll:closed,upd:now};
     if(closed)stampWorkoutCompletion(DB.days[todayISO],now);
     SEED=deriveAll();view='today';lift.ex=null;applyTheme();render();
   },{theme,days,closed});
   await page.waitForTimeout(650);
 }
 for(const theme of ['light','dark']){
   await setup(theme,3,false);
   await page.locator('.su-mascot canvas').first().waitFor({timeout:10000});
   const pulseA=await page.locator('[data-mascot="active"] canvas').evaluate(c=>c.toDataURL());
   await page.waitForTimeout(400);
   assert.notEqual(await page.locator('[data-mascot="active"] canvas').evaluate(c=>c.toDataURL()),pulseA);
   await page.screenshot({path:path.join(out,theme+'-active.png'),fullPage:true});
   await page.evaluate(()=>{const b=document.createElement('button');b.id='doneAllBtn';document.getElementById('view').appendChild(b);b.click();});
   await page.waitForTimeout(1500);
   assert.equal(await page.locator('.su-completion-metrics').innerText(),'35\nminutes\n9\nsets\n3\nexercises');
   await page.screenshot({path:path.join(out,theme+'-complete.png'),fullPage:true});
   await page.locator('[data-dd="done"]').click();await page.waitForTimeout(3400);
   await page.screenshot({path:path.join(out,theme+'-today-complete.png'),fullPage:true});
   assert.equal(await page.locator('.dayclosed [data-mascot="cool"]').count(),1);
   const coolA=await page.locator('[data-mascot="cool"] canvas').evaluate(c=>c.toDataURL());
   await page.waitForTimeout(400);
   assert.notEqual(await page.locator('[data-mascot="cool"] canvas').evaluate(c=>c.toDataURL()),coolA);
   const receipt=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1080;drawDayCard(c.getContext('2d'),1080,todayISO);return c.toDataURL();});
   fs.writeFileSync(path.join(out,theme+'-receipt.png'),Buffer.from(receipt.split(',')[1],'base64'));
 }
 await setup('dark',25,false);
 await page.evaluate(()=>{const b=document.createElement('button');b.id='doneAllBtn';document.getElementById('view').appendChild(b);b.click();});
 await page.locator('[data-dd="milestone"]').click();
 await page.waitForTimeout(1400);
 assert.equal(await page.locator('.su-milestone-grid i').count(),25);
 await page.screenshot({path:path.join(out,'milestone25.png'),fullPage:true});
 await page.locator('[data-dd="done"]').click();
 for(const width of [320,393,430]){
   await page.setViewportSize({width,height:852});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 await page.locator('[data-mascot="cool"] canvas').evaluate(c=>c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
 await page.waitForTimeout(150);
 assert.equal(await page.locator('[data-mascot="cool"] img').evaluate(im=>getComputedStyle(im).visibility),'visible');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);
 assert.equal(await page.locator('.su-mascot canvas').count(),0);
 await page.evaluate(()=>{DB.settings.mascotMotion='off';document.dispatchEvent(new Event('mascotsettingschange'));render();});
 assert.equal(await page.locator('[data-mascot]').count(),0);
 assert.deepEqual(errors,[]);
 await browser.close();console.log('PASS themes, active/completed, real duration, milestone, 320–430px, reduced motion, Off. Screens: '+out);
})().catch(e=>{console.error(e);process.exit(1)});
