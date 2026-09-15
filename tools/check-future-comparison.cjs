const {chromium}=require('playwright'),assert=require('assert');
(async()=>{
 const b=await chromium.launch({executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
 try{
  const p=await b.newPage({viewport:{width:393,height:852},serviceWorkers:'block'});
  await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());
  await p.goto('http://127.0.0.1:8784/');
  await p.evaluate(()=>{
   todayISO='2026-09-15';checkDate=()=>false;
   DB={days:{},settings:{unit:'lb',onboarded:true,partOv:{}},week:{days:{}}};
   for(const d of ['2026-09-17','2026-09-16'])DB.week.days[d]={items:[{ex:'Incline Barbell Bench Press',lines:[{w:65,reps:[10,10,10,9]}]}]};
   lift={ex:'Incline Barbell Bench Press',part:'Chest',weight:40};view='lift';document.querySelector('#onb')?.remove();render();
  });
  assert.equal(await p.locator('[data-sc-edit-plan]').getAttribute('data-sc-edit-plan'),'2026-09-16');
  assert.equal(await p.locator('.sc-session [data-link-slot]').count(),0);
  assert((await p.locator('.sc-table thead').innerText()).includes('9/16'));
  const before=await p.evaluate(()=>JSON.stringify(DB));
  await p.locator('.sc-session').screenshot({path:'../future-plan-comparison.png'});
  await p.locator('[data-sc-edit-plan]').click();
  assert.equal(await p.evaluate(()=>pw().active),'2026-09-16');
  assert.equal(await p.evaluate(()=>pfState().page),'edit');
  await p.evaluate(()=>pfBack());assert.equal(await p.evaluate(()=>view),'lift');
  assert.equal(await p.evaluate(()=>JSON.stringify(DB)),before);
  await p.setViewportSize({width:320,height:740});
  assert(await p.locator('.sc-session').evaluate(e=>e.scrollWidth<=e.clientWidth));
  await p.evaluate(()=>{
   const ex=lift.ex,last={d:'2026-09-10',sets:[[45,[10]],[55,[10]],[70,[10,10,10,9]],[80,[5]]]};
   DB.week.days['2026-09-16'].items[0].lines=[{w:45,reps:[10],qual:'warm-up'},{w:55,reps:[10],qual:'warm-up'},{w:75,reps:[8,8,8,8]},{w:80,reps:[6]}];
   document.querySelector('#view').innerHTML=plSessionHTML(ex,last,[]);
  });
  assert.equal(await p.locator('.sc-table thead th').count(),4);
  assert(await p.locator('.sc-session').evaluate(e=>e.scrollWidth<=e.clientWidth));
  assert.equal(await p.locator('.sc-warm-mark').count(),2);
  assert.equal(await p.locator('.sc-qual').count(),0);
  assert.equal((await p.locator('[data-sc-details]').innerText()).trim(),'Expand');
  assert.equal(await p.locator('.sc-tools button .ic').count(),2);
  await p.setViewportSize({width:393,height:852});
  await p.locator('.sc-session').screenshot({path:'../comparison-spacing-warmups.png'});
  assert(await p.evaluate(()=>{
   DB.plan={d:todayISO,items:[{ex:lift.ex,lines:[{w:50,reps:[8]}]}]};
   return plDisplayPlan(lift.ex).date===todayISO&&!plSessionRows(lift.ex,null,[]).preview;
  }));
  assert(await p.evaluate(()=>{
   DB.plan=null;DB.week.days={};
   return plDisplayPlan(lift.ex)===null&&!plSessionHTML(lift.ex,null,[]).includes('data-sc-edit-plan');
  }));
  console.log('PASS future plan date, earliest selection, no log linkage, edit/back, read-only, narrow layout');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
