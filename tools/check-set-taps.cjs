const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
 const p=await b.newPage({viewport:{width:393,height:852},serviceWorkers:'block'});
 await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());await p.goto('http://127.0.0.1:8784/');
 for(const kind of ['history','plan','now']){
  await p.evaluate(()=>{todayISO='2026-09-15';checkDate=()=>false;DB={days:{},settings:{unit:'lb',onboarded:true},week:{days:{}}};const ex='Bench Press';DB.week.days['2026-09-16']={items:[{ex,lines:[{w:60,reps:[8,8,8,8,9]}]}]};DB.days[todayISO]={w:[{ex,part:'Chest',w:55,reps:[6,6,6,6,7]}]};lift={ex,part:'Chest',weight:10,rep:1};view='lift';document.querySelector('#onb')?.remove();render();document.querySelector('#view').innerHTML=plSessionHTML(ex,{d:'2026-09-10',sets:[[50,[10,10,10,10,11]]]},DB.days[todayISO].w);});
  const before=await p.evaluate(()=>JSON.stringify(DB.days[todayISO].w));
  await p.evaluate(kind=>{document.querySelector('#view').innerHTML=plSessionHTML(lift.ex,{d:'2026-09-10',sets:[[50,[10,10,10,10,11]]]},DB.days[todayISO].w);const buttons=document.querySelectorAll('.sc-'+kind+' button.sc-rep');buttons[buttons.length-1].click();},kind);
  const expected={history:[50,11],plan:[60,9],now:[55,7]}[kind];assert.deepEqual(await p.evaluate(()=>[lift.weight,lift.rep]),expected);assert.equal(await p.evaluate(()=>JSON.stringify(DB.days[todayISO].w)),before);
 }
 await p.locator('#sessEdit').click();assert.equal(await p.evaluate(()=>lift.editToday),true);
 console.log('PASS individual Last, future Plan and Logged chips load weight AND reps; records unchanged; Edit Logged opens editor');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
