/* Real WebGL regression checks. Fresh browser, synthetic data, local requests
   only. Run against the repository server at :8768 (or MASCOT_TEST_URL). */
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
(async()=>{
 const url=process.env.MASCOT_TEST_URL||'http://127.0.0.1:8768/';
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe',args:['--enable-unsafe-swiftshader']});
 try{
 const context=await browser.newContext({viewport:{width:720,height:440},deviceScaleFactor:1,serviceWorkers:'block'});
 await context.route('**/*',r=>r.request().url().startsWith(url)||r.request().url().startsWith('data:')?r.continue():r.abort());
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/Shader Error|program not valid/.test(m.text()))errors.push(m.text());});
 await page.goto(url);
 const result=await page.evaluate(async()=>{
  document.body.innerHTML='<div id="finish-stage" style="width:720px;height:440px"></div>';
  const {createMascot}=await import('./js/mascot-renderer.js');
  const stage=document.querySelector('#finish-stage'),checks=[];
  async function pixels(png){const im=new Image();im.src=png;await im.decode();const c=document.createElement('canvas');c.width=720;c.height=440;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);return ctx.getImageData(0,0,720,440).data;}
  for(const [tone,theme,face] of [['chrome','light',54],['white','dark',48],['blue','light',255]]){
   const m=createMascot(stage,{tone,theme,still:true});
   const png=m.capture(),a=await pixels(png),b=await pixels('assets/mascot-'+tone+'.png');
   let difference=0,facePixels=0;for(let i=0;i<a.length;i++){difference+=Math.abs(a[i]-b[i]);}
   for(let i=0;i<a.length;i+=4)if(a[i+3]>250&&Math.abs(a[i]-face)<2&&Math.abs(a[i+1]-face)<2&&Math.abs(a[i+2]-face)<2)facePixels++;
   const stillA=m.captureFrame(0).toDataURL(),stillB=m.captureFrame(6500).toDataURL();
   checks.push({tone,assetDiff:difference/a.length,alpha:a[3],facePixels,stillFrozen:stillA===stillB});
   m.update({still:false});const movingA=m.captureFrame(3300).toDataURL(),movingB=m.captureFrame(6500).toDataURL();
   checks.at(-1).animated=movingA!==movingB;m.dispose();
  }
  // One reused instance must agree with a freshly created instance after every
  // theme/tone switch, including crossing matte/metal/clearcoat shader variants.
  const shared=createMascot(stage,{tone:'chrome',theme:'light',still:true});
  for(const [tone,theme] of [['white','dark'],['blue','light'],['blue','dark'],['chrome','light']]){
   shared.update({tone,theme,still:true});const changed=shared.capture();
   const fresh=createMascot(stage,{tone,theme,still:true});checks.push({tone,theme,switchMatches:changed===fresh.capture()});fresh.dispose();
  }
  shared.dispose();
  return {checks,remainingCanvases:stage.querySelectorAll('canvas').length};
 });
 for(const check of result.checks){
  if('assetDiff' in check){assert(check.assetDiff<.01,JSON.stringify(check));assert.equal(check.alpha,0);assert(check.facePixels>100);assert(check.stillFrozen);assert(check.animated);}
  else assert(check.switchMatches,JSON.stringify(check));
 }
 assert.equal(result.remainingCanvases,0);
 console.log('PASS transparent PNG parity, face shades, animation, still mode, theme/tone switches, and disposal.');
 await page.reload();await page.setViewportSize({width:393,height:852});
 const out=process.env.MASCOT_QA_DIR||path.resolve('../mascot-finish-qa');fs.mkdirSync(out,{recursive:true});
 for(const theme of ['light','dark']){
  await page.evaluate(theme=>{
   document.getElementById('onb')?.remove();DB.settings.onboarded=true;DB.settings.name='Sungjee';DB.settings.sex='M';DB.settings.theme=theme;DB.settings.mascotMotion='animated';
   DB.days={};const d=new Date(todayISO+'T12:00');d.setDate(d.getDate()-1);
   DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8],at:1}],upd:1};
   SEED=deriveAll();view='today';applyTheme();render();window.profileBefore=JSON.stringify({name:DB.settings.name,sex:DB.settings.sex,days:DB.days});
  },theme);
  await page.locator('.su-ready canvas').first().waitFor();await page.waitForTimeout(500);
  await page.screenshot({path:path.join(out,theme+'-today.png')});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  assert.equal(await page.locator('.su-mascot canvas').count(),0);
  assert(await page.locator('.su-mascot img').first().evaluate(im=>im.complete&&im.naturalWidth>0&&getComputedStyle(im).visibility==='visible'));
  assert(await page.evaluate(()=>window.profileBefore===JSON.stringify({name:DB.settings.name,sex:DB.settings.sex,days:DB.days})));
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.su-ready canvas').first().waitFor();
 }
 assert.deepEqual(errors,[]);console.log('PASS mobile Today, reduced-motion fallback, resume, profile/history preservation; no WebGL errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
