const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
 const p=await b.newPage({viewport:{width:393,height:852},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());await p.goto('http://127.0.0.1:8784/');
 await p.evaluate(()=>{checkDate=()=>false;todayISO='2026-09-16';document.querySelector('#onb')?.remove();DB={days:{'2026-09-10':{w:[{ex:'Incline Barbell Bench Press',part:'Chest',w:60,reps:[8,8],at:1}],doneAll:true}},settings:{onboarded:true,unit:'lb',mascotMotion:'off'}};view='stats';lift={};});
 for(const state of ['active','completed','reopened','inactive','run']){
  await p.evaluate(state=>{DB.days[todayISO]=state==='inactive'?{w:[]}:{w:state==='run'?[{ex:'Run',part:'Run',w:4,reps:[],mins:25,at:Date.now()}]:[{ex:'Incline Barbell Bench Press',part:'Chest',w:65,reps:[8,8],at:Date.now()}],doneAll:state==='completed'};lift={};SEED=deriveAll();renderStats();},state);
  await p.waitForTimeout(200);assert.equal(await p.locator('.progression-section').count(),1,state+' has one progression chart');
  const live=['active','reopened','run'].includes(state);assert.equal(await p.locator('[data-pg-role="live"]').count(),live?1:0);assert.equal(await p.locator('[data-pg-role="stats"]').count(),live?0:1);
  if(live){assert(await p.evaluate(()=>{const chart=document.querySelector('[data-pg-role="live"]'),coverage=document.querySelector('.mccard');return !coverage||!!(chart.compareDocumentPosition(coverage)&Node.DOCUMENT_POSITION_FOLLOWING);}));await p.locator('[data-pg-action="dots"]').click();assert.equal(await p.locator('.progression-section').count(),1);}
 }
 assert.deepEqual(errors,[]);console.log('PASS active/completed/reopened/inactive/run: one chart, upper live position, mode switching, no runtime errors');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
