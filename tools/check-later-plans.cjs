const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
try{for(const theme of ['light','dark'])for(const width of [320,393,430]){
 const p=await b.newPage({viewport:{width,height:852},serviceWorkers:'block'});await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());await p.goto('http://127.0.0.1:8784/');
 await p.evaluate(theme=>{todayISO='2026-09-15';checkDate=()=>false;DB={days:{},settings:{unit:'lb',onboarded:true,theme}};const plan=()=>planItemsFrom(pwRead('Deadlift\n135 lb × 8 8 8\nEZ Bar Curl\n55 lb × 12 12 12'));DB.week={days:Object.fromEntries(['2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-19'].map(d=>[d,plan()]))};DB.week.days['2026-09-18']={items:[]};view='today';lift={};document.querySelector('#onb')?.remove();applyTheme();render();},theme);await p.waitForTimeout(1100);
 const footer=p.locator('.pw-later>summary');assert((await footer.innerText()).includes('2 later plans'));
 assert(await p.locator('[data-pw-fold="today"]').evaluate(e=>!e.open),'Footer visible with today collapsed');
 await footer.click();await p.waitForTimeout(300);assert(await p.locator('.pw-later-day').count()===2);
 await p.locator('.pw-later-day>summary').first().click();await p.waitForTimeout(300);assert(await p.locator('.pw-later-day').first().evaluate(e=>e.open));assert(await p.locator('.pw-later-day .plancard').first().isVisible());
 const before=await p.evaluate(()=>JSON.stringify(DB));await p.evaluate(()=>render());await p.waitForTimeout(300);assert(await p.locator('.pw-later').evaluate(e=>e.open));assert(await p.locator('.pw-later-day').first().evaluate(e=>e.open));assert(await p.evaluate(()=>JSON.stringify(DB))===before);
 await footer.click();await p.waitForTimeout(300);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(width===393)await p.screenshot({path:'../later-footer-'+theme+'.png',fullPage:true});
 await p.evaluate(()=>{delete DB.week.days['2026-09-19'];render();});assert((await footer.innerText()).includes('1 later plan'));
 await p.evaluate(()=>{delete DB.week.days['2026-09-17'];render();});assert(await p.locator('.pw-later').count()===0,'Tomorrow alone never shows later footer');
 await p.evaluate(()=>{DB.days[todayISO]={doneAll:true,w:[{ex:'Deadlift',part:'Back',w:60,reps:[8],at:1}]};DB.week.days['2026-09-17']=DB.week.days['2026-09-16'];render();});assert((await footer.innerText()).includes('1 later plan'));
 await p.evaluate(()=>{delete DB.week.days['2026-09-16'];render();});assert(await p.locator('.pw-later').count()===0,'Only later plan already displayed is not duplicated');
 await p.evaluate(()=>{DB.days={'2026-09-14':DB.days[todayISO]};DB.week.days['2026-09-19']=DB.week.days['2026-09-17'];delete DB.week.days[todayISO];SEED=deriveAll();render();});assert((await footer.innerText()).includes('2 later plans'),'No-today-plan card retains access');
 console.log('PASS later footer, expansion, persistence, filtering, empty plans and dedup '+theme+' '+width);await p.close();
}}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
