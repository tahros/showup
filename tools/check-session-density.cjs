// Optional local backup is read into an isolated offline browser; never persisted.
const fs=require('fs'),assert=require('assert'),{chromium}=require('playwright');
const backup=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2],'utf8')).doc:null;
const sessions=[];for(const [d,day] of Object.entries(backup?.days||{})){const exs={};for(const s of day.w||[]){if(s.ex==='Run')continue;(exs[s.ex]??=[]).push(s);}for(const [ex,rows]of Object.entries(exs))sessions.push({d,ex,rows,count:rows.reduce((n,s)=>n+(s.reps||[]).length,0)});}
const largest=sessions.sort((a,b)=>b.count-a.count)[0]||{d:'2022-04-14',ex:'Incline Smith Machine Bench Press',count:28,rows:[25,35,45,60,45,35,25].map(w=>({w,reps:[12,10,10,8]}))};
const mostReps=sessions.filter(s=>!s.rows.some(r=>r.su)).sort((a,b)=>Math.max(...b.rows.flatMap(r=>r.reps||[]))-Math.max(...a.rows.flatMap(r=>r.reps||[])))[0]||{d:'2023-03-30',ex:'Dumbbell Combination',count:1,rows:[{w:7,reps:[120]}]};
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
 for(const theme of ['light','dark'])for(const width of [320,393,430]){
 const p=await browser.newPage({viewport:{width,height:852},serviceWorkers:'block'});await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());await p.goto('http://127.0.0.1:8784/');
 for(const mode of ['screenshot','history','all','high-reps']){
 const record=mode==='screenshot'?{d:'2026-09-10',ex:'Incline Barbell Bench Press',count:7,rows:[[95,[10]],[115,[10]],[155,[10,10,10,9]],[175,[5]]].map(([w,reps])=>({w:w/2.2046226218,reps}))}:mode==='high-reps'?mostReps:largest;
 await p.evaluate(({record,mode,theme})=>{todayISO='2026-09-22';checkDate=()=>false;DB={days:{},settings:{unit:'lb',theme,onboarded:true}};SEED={...SEED,last:{},sessions:1};lift={ex:record.ex,part:'Chest',weight:record.rows[0].w};view='lift';document.querySelector('#onb')?.remove();const rows=record.rows.map(s=>({...s,ex:record.ex,part:'Chest'}));DB.days[record.d]={w:rows};if(mode==='all'){DB.plan={d:todayISO,items:[{ex:record.ex,lines:rows.map(s=>({w:s.w,reps:s.reps}))}]};rows.forEach(s=>s.reps.forEach((r,i)=>plLog({ex:record.ex,part:'Chest',w:s.w,reps:[r],at:Date.now()+i})));lift.justSaved=true;}applyTheme();render();},{record,mode,theme});
 const card=p.locator('.sc-session');const measurement=await card.evaluate(e=>({height:e.getBoundingClientRect().height,overflow:e.scrollWidth>e.clientWidth+1,rows:e.querySelectorAll('tbody tr').length,headers:[...e.querySelectorAll('thead th')].map(h=>h.getBoundingClientRect().top),cells:[...e.querySelectorAll('tbody td')].map(td=>({w:td.clientWidth,sw:td.scrollWidth}))}));
 assert(!measurement.overflow);assert(measurement.cells.every(c=>c.sw<=c.w+1),'Cell contents fit');assert(Math.max(...measurement.headers)-Math.min(...measurement.headers)<1,'Headers align');assert(measurement.height<=652,mode+' card exceeds available screen: '+measurement.height);
 if(mode!=='high-reps'){assert.equal(await card.locator('.sc-history .sc-rep').count(),record.count);assert.equal(measurement.rows,mode==='screenshot'?4:7);if(mode==='screenshot')assert(measurement.height<400);const before=await p.evaluate(()=>JSON.stringify(DB));await card.locator('[data-sc-details]').click();assert.equal(await card.locator('tbody tr').count(),record.count);await card.locator('[data-sc-details]').click();assert.equal(await p.evaluate(()=>JSON.stringify(DB)),before);}
 if(width===393&&mode==='history'){await card.evaluate(e=>{e.scrollIntoView({block:'start'});window.scrollBy(0,-110);});await card.screenshot({path:'../compact-history-'+theme+'.png'});}
 console.log('PASS '+theme+' '+width+' '+mode+' '+record.count+' sets; '+Math.round(measurement.height)+'px');
 }await p.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
