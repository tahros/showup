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
   await p.locator('#dayDone .showuppp-lettering').evaluate(img=>img.decode());
   assert((await p.locator('#dayDone .showuppp-lettering').getAttribute('src')).endsWith('showuppp-c.svg'));
   assert.equal(await p.locator('#dayDone .su-mascot canvas').count(),0,'Still is a static PNG');
   assert.equal(await p.locator('#dayDone .ddbrand').evaluate(el=>getComputedStyle(el).animationName),'none');
   const g=await p.locator('#dayDone .showuppp-lockup').boundingBox();assert(g.x>=0&&g.x+g.width<=width);
   const sizing=await p.locator('#dayDone .showuppp-character').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.firstElementChild.getBoundingClientRect();return {ratio:b.width/a.width,center:Math.abs((a.y+a.height/2)-(b.y+b.height/2))};});
   assert(sizing.ratio>1.79&&sizing.ratio<1.81&&sizing.center<1,'existing hero rules must not shrink or displace the mascot');
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
  await p.evaluate(()=>{DB.settings.mascotMotion='still';document.dispatchEvent(new Event('mascotsettingschange'));celebrateDayDone(true,12,0,true);});
  await p.waitForTimeout(300);
  assert.equal(await p.locator('#dayDone canvas').count(),0,'Still works independently of the OS setting');
  await p.locator('#dayDone [data-dd="done"]').click();await p.locator('#dayDone').waitFor({state:'detached'});
  await p.evaluate(()=>{DB.settings.mascotMotion='animated';document.dispatchEvent(new Event('mascotsettingschange'));DB.settings.theme='light';applyTheme();celebrateDayDone(true,12,0,true);});
  await p.locator('#dayDone .su-ready canvas').waitFor({timeout:15000});
  await snap('complete-animated');
  await p.locator('#dayDone [data-dd="done"]').click();await p.locator('#dayDone').waitFor({state:'detached'});
  // Exercise the existing connected ink flight with the new two-part hero.
  await p.evaluate(()=>{const source=document.createElement('div');source.id='brand-flight-source';source.style.cssText='position:fixed;left:40px;top:300px;width:180px';source.innerHTML=mascotHTML('cool','','blue')+'<b class="dcn">12</b>';document.body.append(source);celebrateDayDone(true,12,0,true,source);});
  assert.equal(await p.locator('#dayDone.dd-inked').count(),1);
  await p.waitForFunction(()=>!document.querySelector('#dayDone.dd-ink')&&getComputedStyle(document.querySelector('#dayDone .ddink')).clipPath.startsWith('circle(0px'));
  assert.equal(await p.locator('#dayDone .showuppp-lettering').evaluate(e=>getComputedStyle(e).visibility),'visible');
  assert.equal(await p.locator('#dayDone .su-mascot').getAttribute('data-mascot-tone'),'blue');
  await p.locator('#dayDone [data-dd="done"]').click();await p.locator('#dayDone').waitFor({state:'detached'});
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
  await offline.setOffline(true);await op.reload();
  await op.locator('.onblogo .showuppp-lettering').evaluate(i=>i.decode());
  await op.evaluate(()=>{document.querySelector('#onb')?.remove();celebrateDayDone(true,12,0,true);});
  await op.locator('#dayDone .showuppp-lettering').evaluate(i=>i.decode());
  await offline.close();
  console.log('PASS A/C artwork, 6 welcome + 6 completion layouts, still/off/OS-reduce/animated/WebGL fallback, unchanged workout data');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
