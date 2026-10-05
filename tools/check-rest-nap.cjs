// Serve app on PW_PORT (8795). Synthetic state only; screenshots go to temp.
const {chromium}=require('playwright'),assert=require('assert'),path=require('path'),os=require('os');
(async()=>{const b=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe',args:['--enable-unsafe-swiftshader']});try{
const p=await b.newPage({viewport:{width:393,height:852},serviceWorkers:'block'}),errors=[];
p.on('pageerror',e=>errors.push(e.message));const origin='http://127.0.0.1:'+(process.env.PW_PORT||8795)+'/';await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());await p.goto(origin);
await p.evaluate(()=>{document.querySelector('#onb')?.remove();DB.settings.onboarded=true;DB.settings.mascotMotion='animated';DB.days[todayISO]={w:[],rest:true};view='today';render({inplace:true});});
await p.waitForSelector('.su-mascot.su-ready canvas');
for(const theme of ['light','dark']){
await p.evaluate(theme=>{DB.settings.theme=theme;applyTheme();},theme);
const scale=await p.locator('.su-hello-row canvas').evaluate(c=>getComputedStyle(c).transform);assert.equal(scale,'matrix(0.8, 0, 0, 0.8, 0, 0)');
await p.locator('.su-hello-row .su-mascot').click();await p.waitForTimeout(500);await p.screenshot({path:path.join(os.tmpdir(),'pip-rest-'+theme+'-214.png')});
}
const result=await p.evaluate(async()=>{const {createMascot}=await import('./js/mascot-renderer.js');const el=document.createElement('div');el.style.cssText='width:224px;height:137px';document.body.append(el);const m=createMascot(el,{mode:'rest',theme:'dark'});const frame=t=>m.captureFrame(t).toDataURL();const a=frame(0),c=frame(3200),d=frame(12000);m.update({still:true});const e=frame(0),f=frame(6000);m.dispose();el.remove();return {changes:a!==c,seam:a===d,static:e===f};});assert(result.changes&&result.seam&&result.static);assert.deepEqual(errors,[]);console.log('PASS actual Rest canvas scale, both themes, tap, changing poses, seamless loop, static fallback, no page errors');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
