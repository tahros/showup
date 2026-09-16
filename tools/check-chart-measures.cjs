const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
const p=await browser.newPage({serviceWorkers:'block',hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8794/')?r.continue():r.abort());await p.goto('http://127.0.0.1:8794/');
await p.evaluate(()=>{todayISO='2026-09-16';checkDate=()=>false;document.querySelector('#onb')?.remove();DB={days:{[todayISO]:{w:[{ex:'Bench Press',part:'Chest',w:135,reps:[8,8,6],at:1}],doneAll:true}},settings:{onboarded:true,unit:'lb',mascotMotion:'off'},week:{days:{}}};SEED=deriveAll();view='stats';render({inplace:true});});await p.waitForTimeout(500);
const before=await p.evaluate(()=>JSON.stringify(DB.days));
for(const width of [320,393,430])for(const theme of ['light','dark']){
await p.setViewportSize({width,height:1000});await p.evaluate(t=>{DB.settings.theme=t;applyTheme();},theme);
const box=await p.locator('.pmix-measures').boundingBox();assert(box&&box.height<=50);
await p.locator('[data-pmixmode="sets"]').click();assert.equal(await p.evaluate(()=>PMIX_MODE),'sets');
await p.locator('[data-pmixmode="sets"]').click();assert.equal(await p.evaluate(()=>PMIX_MODE),'sets');
assert.equal(await p.locator('[data-pmixmode="sets"]').getAttribute('aria-pressed'),'true');
await p.locator('[data-pmixmode="weight"]').click();assert.equal(await p.evaluate(()=>PMIX_MODE),'weight');
const metrics=await p.evaluate(()=>{const row=document.querySelector('.pmixhead'),control=document.querySelector('.pmix-measures'),latest=document.querySelector('.work-latest');return{padding:getComputedStyle(control).paddingTop,gap:latest.getBoundingClientRect().left-control.getBoundingClientRect().right,rowHeight:row.getBoundingClientRect().height};});assert.equal(metrics.padding,'3px');assert(metrics.gap>=0);assert(metrics.rowHeight<=50);
}
assert.equal(await p.evaluate(()=>JSON.stringify(DB.days)),before);assert.deepEqual(errors,[]);console.log('PASS measure switching, selected no-op, pressed states, compact spacing and Latest alignment at 320/393/430 light/dark; records unchanged');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
