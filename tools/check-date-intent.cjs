const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
 const p=await b.newPage({viewport:{width:393,height:852},serviceWorkers:'block'});
 await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());await p.goto('http://127.0.0.1:8784/');
 await p.evaluate(()=>{DB={days:{},settings:{onboarded:true,unit:'lb'}};todayISO='2026-09-15';checkDate=()=>false;document.querySelector('#onb')?.remove();lift={};const doc=planItemsFrom(pwRead('Squat\n135 lb × 8 8 8'));DB.week={days:{'2026-09-16':doc}};window.savedBefore=JSON.stringify(DB.week);pwOpen('2026-09-16','dates');});
 await p.locator('.pf-date-secondary').waitFor();assert.equal(await p.locator('.pf-date-secondary .ic').count(),2);
 for(const width of [320,393,430]){await p.setViewportSize({width,height:852});const g=await p.evaluate(()=>{const d=document.querySelector('.pf-dock').getBoundingClientRect(),nav=document.querySelector('nav').getBoundingClientRect();return {width:document.documentElement.scrollWidth,viewport:innerWidth,bottom:d.bottom,nav:nav.top,calendar:document.querySelector('.pf-calendar').getBoundingClientRect().height};});console.log(width,g);assert(g.width<=g.viewport);assert(g.calendar<=250);}
 await p.screenshot({path:'../date-intent-live-check.png',fullPage:true});
 await p.locator('[data-date="2026-09-20"]').click();assert.equal(await p.locator('[data-subset="fresh"]').innerText(),'Plan 1 day');
 await p.locator('[data-pw="pf-edit-selected"]').click();assert.deepEqual(await p.evaluate(()=>pw().dates),['2026-09-16']);assert.equal(await p.evaluate(()=>pfState().page),'days');
 await p.locator('[data-pw="pf-edit-first"]').click();assert(await p.locator('[data-pw="pf-edit-line"]').count());
 await p.locator('header [data-pw="pf-back"]').click();await p.locator('header [data-pw="pf-back"]').click();assert.deepEqual((await p.evaluate(()=>pw().dates)).sort(),['2026-09-16','2026-09-20']);
 await p.evaluate(()=>{writerGenerateChecked=()=>new Promise(resolve=>window.finishDraft=resolve);});await p.locator('[data-subset="fresh"]').click();assert.deepEqual(await p.evaluate(()=>pw().dates),['2026-09-20']);assert(await p.locator('.pf-generating').count());
 await p.evaluate(()=>window.finishDraft({rows:[{kind:'day',iso:'2026-09-20'},...pwRead('Squat\n135 lb × 8 8 8')],notes:[]}));await p.locator('[data-pw="pf-edit-first"]').waitFor();
 assert(await p.evaluate(()=>JSON.stringify(DB.week)===savedBefore));assert.equal(await p.evaluate(()=>Object.values(DB.days).flatMap(d=>d.w||[]).length),0);
 console.log('PASS compact calendar, icon buttons, mixed edit/generate subsets, full editor, Back selection, unchanged saved plans/logs');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
