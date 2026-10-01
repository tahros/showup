/* node tools/check-brand-lockup.cjs .
 * Self-served Chromium regression: traced A/C, themes, sizes, motion settings,
 * WebGL failure fallback, completion dismiss and saved workout preservation.
 * PW_CHROME selects Chromium; QA_DIR optionally saves visual-review PNGs.
 * BRAND_TEST_ORIGIN optionally verifies the deployed build in isolated pages.
 */
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(process.argv[2]||'.');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2'};
(async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=process.env.BRAND_TEST_ORIGIN||'http://127.0.0.1:'+server.address().port+'/';
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const p=await browser.newPage({viewport:{width:393,height:852},serviceWorkers:'block',reducedMotion:'reduce'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  await p.goto(origin,{waitUntil:'networkidle'});
  const snap=async name=>{if(process.env.QA_DIR){fs.mkdirSync(process.env.QA_DIR,{recursive:true});await p.screenshot({path:path.join(process.env.QA_DIR,name+'.png'),fullPage:true});}};
  for(const theme of ['light','dark'])for(const width of [320,393,768]){
   await p.setViewportSize({width,height:852});
   await p.evaluate(theme=>{DB.settings.theme=theme;DB.settings.mascotMotion='still';applyTheme();onbStep=1;onbRender();},theme);
   await p.locator('.onblogo .showuppp-lettering').evaluate(img=>img.decode());
   assert.equal(await p.locator('.onblogo [aria-label="ShowUppp"]').count(),1);
   assert((await p.locator('.onblogo .showuppp-lettering').getAttribute('src')).endsWith('showuppp-a.svg'));
   assert.equal(await p.locator('[data-onbact]').count(),3,'onboarding choices unchanged');
   assert(await p.locator('[data-onbact="local"]').isVisible());
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
   if(width===393)await snap('welcome-'+theme);
  }
  await p.evaluate(()=>{document.querySelector('#onb')?.remove();DB.settings.onboarded=true;DB.days[todayISO]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8,8],at:Date.now()}],doneAll:true,upd:1};SEED=deriveAll();render();});
  const before=await p.evaluate(()=>JSON.stringify(DB.days));
  for(const theme of ['light','dark'])for(const width of [320,393,768]){
   await p.setViewportSize({width,height:852});
   await p.evaluate(theme=>{DB.settings.theme=theme;applyTheme();celebrateDayDone(true,12,0,true);},theme);
   assert.equal(await p.locator('#dayDone .showuppp-lettering [data-letter]').count(),8);
   const resting=await p.locator('#dayDone [data-letter]').evaluateAll(es=>es.map(e=>({letter:e.dataset.letter,rect:e.getBoundingClientRect().toJSON()})));
   const ps=resting.filter(e=>e.letter.startsWith('p')).map(e=>e.rect.bottom);
   assert(ps[0]>ps[1]&&ps[1]>ps[2],'approved Lifted p trio rises at rest');
   const offsets=await p.locator('#dayDone [data-letter] path').evaluateAll(es=>es.map(e=>e.getAttribute('transform')));
   assert.deepEqual(offsets,['translate(0 0)','translate(0 0)','translate(0 0)','translate(0 0)','translate(0 0)','translate(0 -8)','translate(0 -1)','translate(0 6)'],'exact approved Lifted p trio offsets');
   assert(Math.max(...resting.slice(0,4).map(e=>e.rect.bottom))<Math.min(...resting.slice(4).map(e=>e.rect.top)),'two distinct rows at rest');
   assert.equal(await p.locator('#dayDone .showuppp-burst').count(),0,'no particles in static mode');
   assert.equal(await p.locator('#dayDone .su-mascot canvas').count(),0,'Still is a static PNG');
   assert.equal(await p.locator('#dayDone .ddbrand').evaluate(el=>getComputedStyle(el).animationName),'none');
   const g=await p.locator('#dayDone .showuppp-lockup').boundingBox();assert(g.x>=0&&g.x+g.width<=width);
   const sizing=await p.locator('#dayDone .showuppp-lockup').evaluate(el=>({mascot:el.querySelector('.showuppp-character').getBoundingClientRect().width,letters:el.querySelector('.showuppp-lettering').getBoundingClientRect().width,gap:parseFloat(getComputedStyle(el).gap)}));
   assert(Math.abs(sizing.mascot-96.6)<.1&&Math.abs(sizing.letters-100.44)<.1&&sizing.gap===14,'approved twice-reduced lettering / unchanged Compact mascot and Open gap');
   assert(await p.locator('#dayDone [data-dd="done"]').isVisible());
   if(width===393)await snap('complete-'+theme);
   await p.locator('#dayDone [data-dd="done"]').click();await p.locator('#dayDone').waitFor({state:'detached'});
   assert.equal(await p.evaluate(()=>JSON.stringify(DB.days)),before,'preview and dismissal do not rewrite workouts');
  }
  // OS reduce overrides Animated, without suppressing the branding or image.
  await p.evaluate(()=>{DB.settings.mascotMotion='animated';document.dispatchEvent(new Event('mascotsettingschange'));celebrateDayDone(true,12,0,true);});
  await p.waitForTimeout(300);
  assert.equal(await p.locator('#dayDone canvas').count(),0);
  assert.equal(await p.locator('#dayDone .ddbrand').evaluate(el=>getComputedStyle(el).animationName),'none');
  await p.locator('#dayDone [data-dd="done"]').click();await p.locator('#dayDone').waitFor({state:'detached'});
  await p.emulateMedia({reducedMotion:'no-preference'});
  await p.setViewportSize({width:393,height:852});
  await p.evaluate(()=>{DB.settings.mascotMotion='still';document.dispatchEvent(new Event('mascotsettingschange'));celebrateDayDone(true,12,0,true);});
  await p.waitForTimeout(300);
  assert.equal(await p.locator('#dayDone canvas').count(),0,'Still works independently of the OS setting');
  await p.locator('#dayDone [data-dd="done"]').click();await p.locator('#dayDone').waitFor({state:'detached'});
  await p.evaluate(()=>{DB.settings.mascotMotion='animated';document.dispatchEvent(new Event('mascotsettingschange'));DB.settings.theme='light';applyTheme();celebrateDayDone(true,12,0,true);});
  assert.equal(await p.locator('#dayDone canvas').count(),0,'approved poster choreography has no competing renderer');
  assert.equal(await p.locator('#dayDone .showuppp-ground').count(),1,'exactly one ground shadow');
  assert((await p.locator('#dayDone .su-mascot img').getAttribute('src')).endsWith('mascot-blue-body.png'),'moving poster has no baked ground');
  await p.locator('#dayDone .su-mascot img').evaluate(async img=>{
    await img.decode();
    const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
    const x=c.getContext('2d');x.drawImage(img,0,0);
    const data=x.getImageData(0,340,c.width,c.height-340).data;
    if(data.some((v,i)=>i%4===3&&v!==0))throw Error('baked shadow pixels below body');
  });
  const letters=await p.locator('#dayDone [data-letter]').evaluateAll(es=>es.map(e=>({letter:e.dataset.letter,animations:e.getAnimations().length})));
  assert.equal(letters.length,8);assert(letters.every(e=>e.animations===1),'every letter animates independently');
  await p.waitForTimeout(400);
  const transforms=await p.locator('#dayDone [data-letter]').evaluateAll(es=>es.slice(0,4).map(e=>getComputedStyle(e).transform));
  assert(new Set(transforms).size===4,'Show is a stagger, not one moving word');
  await snap('complete-animated');
  // Sample the real one-shot at its blue-accent beat without altering timelines.
  await p.waitForTimeout(1200);
  assert.equal(await p.locator('#dayDone .showuppp-burst').count(),8);
  assert.notEqual(await p.locator('#dayDone [data-letter="p3"]').evaluate(e=>getComputedStyle(e).color),'rgb(44, 44, 44)','ppp receives the blue accent');
  assert.notEqual(await p.locator('#dayDone .showuppp-lettering').evaluate(e=>getComputedStyle(e).transform),'none','whole lockup adds a gentle pop');
  await snap('complete-pop-blue');
  await p.waitForFunction(()=>document.querySelectorAll('#dayDone .showuppp-burst').length===0);
  assert(await p.locator('#dayDone [data-letter]').evaluateAll(es=>es.every(e=>e.getAnimations().length===0&&getComputedStyle(e).transform==='none')),'settles once without looping');
  assert.equal(await p.locator('#dayDone .showuppp-burst').count(),0,'one-shot particles are removed');
  assert.equal(await p.locator('#dayDone .showuppp-c').evaluate(e=>e.getAnimations({subtree:true}).length),0,'all timelines settle');
  await p.evaluate(()=>showupppAnimate(document.querySelector('#dayDone')));
  await p.emulateMedia({reducedMotion:'reduce'});
  await p.waitForFunction(()=>[...document.querySelectorAll('#dayDone [data-letter]')].every(e=>e.getAnimations().length===0));
  assert(await p.locator('#dayDone [data-letter]').evaluateAll(es=>es.every(e=>e.getAnimations().length===0)),'live reduced-motion change cancels motion');
  assert.equal(await p.locator('#dayDone .showuppp-burst').count(),0,'reduced motion clears the burst');
  await p.emulateMedia({reducedMotion:'no-preference'});
  await p.locator('#dayDone [data-dd="done"]').click();await p.locator('#dayDone').waitFor({state:'detached'});
  await p.evaluate(()=>{DB.settings.theme='dark';applyTheme();celebrateDayDone(true,12,0,true);});
  await p.waitForTimeout(1650);
  assert.equal(await p.locator('#dayDone .showuppp-lettering').evaluate(e=>getComputedStyle(e).filter),'none','dark theme retains blue accents');
  assert.notEqual(await p.locator('#dayDone [data-letter="p3"]').evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)','dark theme p trio receives the accent');
  await snap('complete-pop-dark');
  await p.evaluate(()=>{DB.settings.mascotMotion='still';document.dispatchEvent(new Event('mascotsettingschange'));});
  assert.equal(await p.locator('#dayDone .showuppp-c').evaluate(e=>e.getAnimations({subtree:true}).length),0,'live Still change cancels the whole pop');
  assert.equal(await p.locator('#dayDone .showuppp-burst').count(),0);
  await p.locator('#dayDone [data-dd="done"]').click();await p.locator('#dayDone').waitFor({state:'detached'});
  await p.evaluate(()=>{DB.settings.theme='light';DB.settings.mascotMotion='animated';applyTheme();});
  // Exercise the existing connected ink flight with the new two-part hero.
  await p.evaluate(()=>{const source=document.createElement('div');source.id='brand-flight-source';source.style.cssText='position:fixed;left:40px;top:300px;width:180px';source.innerHTML=mascotHTML('cool','','blue')+'<b class="dcn">12</b>';document.body.append(source);celebrateDayDone(true,12,0,true,source);});
  assert.equal(await p.locator('#dayDone.dd-inked').count(),1);
  assert.equal(await p.locator('#dayDone .showuppp-ground').evaluate(e=>getComputedStyle(e).visibility),'hidden','no stranded shadow during ink flight');
  assert((await p.locator('#dayDone .su-mascot img').getAttribute('src')).endsWith('mascot-white-body.png'));
  await p.waitForFunction(()=>!document.querySelector('#dayDone.dd-ink')&&getComputedStyle(document.querySelector('#dayDone .ddink')).clipPath.startsWith('circle(0px'));
  await p.waitForFunction(()=>[...document.querySelectorAll('#dayDone [data-letter]')].every(e=>e.getAnimations().length===1));
  assert.equal(await p.locator('#dayDone .showuppp-lettering').evaluate(e=>getComputedStyle(e).visibility),'visible');
  assert.equal(await p.locator('#dayDone .su-mascot').getAttribute('data-mascot-tone'),'blue');
  // Replaying cancels the old timelines rather than accumulating duplicate jumps.
  await p.evaluate(()=>{showupppAnimate(document.querySelector('#dayDone'));showupppAnimate(document.querySelector('#dayDone'));});
  assert.equal(await p.locator('#dayDone .showuppp-burst').count(),8,'replay has one burst only');
  await p.evaluate(()=>{window.brandAnimationRefs=document.querySelector('#dayDone .showuppp-c').getAnimations({subtree:true}).filter(a=>!a.effect.target.matches('.su-mascot'));});
  await p.locator('#dayDone [data-dd="done"]').click();await p.locator('#dayDone').waitFor({state:'detached'});
  const remaining=await p.evaluate(()=>window.brandAnimationRefs.filter(a=>a.playState!=='idle').map(a=>({target:a.effect.target.getAttribute('class'),letter:a.effect.target.dataset.letter,state:a.playState})));
  assert.deepEqual(remaining,[],'dismissal cancels all logo animations: '+JSON.stringify(remaining));
  await p.locator('#brand-flight-source').evaluate(e=>e.remove());
  // Off leaves the welcome lettering, and keeps the existing no-mascot ceremony.
  await p.evaluate(()=>{DB.settings.mascotMotion='off';document.dispatchEvent(new Event('mascotsettingschange'));const host=document.createElement('div');host.id='brand-off-test';host.innerHTML=showupppLogoHTML('a');document.body.append(host);celebrateDayDone(true,12,0,true);});
  assert.equal(await p.locator('#brand-off-test .su-mascot,#dayDone .su-mascot').count(),0);
  assert.equal(await p.locator('#brand-off-test .showuppp-lettering').count(),1);
  assert.equal(await p.evaluate(()=>JSON.stringify(DB.days)),before);
  assert.deepEqual(errors,[]);
  // Failed WebGL must leave the local PNG in place, never an empty lockup.
  const fallback=await browser.newPage({serviceWorkers:'block'});
  await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:get.call(this,kind,...args);};});
  await fallback.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  await fallback.goto(origin,{waitUntil:'networkidle'});await fallback.waitForTimeout(700);
  assert(await fallback.locator('.onblogo .su-mascot img').isVisible());
  assert(await fallback.locator('.onblogo .su-mascot img').evaluate(i=>i.complete&&i.naturalWidth>0));
  await fallback.close();
  const offline=await browser.newContext({reducedMotion:'reduce'}),op=await offline.newPage();
  await op.goto(origin,{waitUntil:'networkidle'});
  // First installation deliberately reloads on controllerchange.
  await op.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await op.waitForLoadState('networkidle');await op.waitForTimeout(500);
  for(const name of ['a','c'])assert(await op.evaluate(async name=>!!(await caches.match('assets/showuppp-'+name+'.svg')),name),'lettering is precached');
  for(const tone of ['blue','white'])assert(await op.evaluate(async tone=>!!(await caches.match('assets/mascot-'+tone+'-body.png')),tone),'shadow-free posters are precached');
  await offline.setOffline(true);await op.reload();
  await op.locator('.onblogo .showuppp-lettering').evaluate(i=>i.decode());
  await op.evaluate(()=>{document.querySelector('#onb')?.remove();celebrateDayDone(true,12,0,true);});
  assert.equal(await op.locator('#dayDone .showuppp-lettering [data-letter]').count(),8,'offline vector available');
  await op.locator('#dayDone .su-mascot img').evaluate(i=>i.decode());
  await offline.close();
  console.log('PASS A/C artwork, 6 welcome + 6 completion layouts, still/off/OS-reduce/animated/WebGL fallback, unchanged workout data');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
