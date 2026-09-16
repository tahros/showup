const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
 const p=await b.newPage({viewport:{width:393,height:852},serviceWorkers:'block'});
 await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());await p.goto('http://127.0.0.1:8784/');
 for(const width of [320,393,430])for(const expanded of [false,true]){
  await p.setViewportSize({width,height:852});
  await p.evaluate(expanded=>{todayISO='2026-09-16';checkDate=()=>false;DB={days:{},settings:{unit:'lb',onboarded:true,theme:'light'},week:{days:{}}};const ex='Incline Barbell Bench Press';lift={ex,part:'Chest',weight:10,rep:1,scDetails:expanded?ex:null};view='lift';document.querySelector('#onb')?.remove();applyTheme();planSave([{ex,lines:[{w:toKg(95),reps:[10],qual:'warm-up'},{w:toKg(115),reps:[10],qual:'warm-up'},{w:toKg(165),reps:[8,8,8,8]},{w:toKg(175),reps:[6]}]}],'','',todayISO);plLog({ex,part:'Chest',w:toKg(95),reps:[10],at:Date.now()});SEED=deriveAll();render();document.querySelector('#view').innerHTML=plSessionHTML(ex,{d:'2026-09-10',sets:[[toKg(95),[10]],[toKg(115),[10]],[toKg(155),[10,10,10,9]],[toKg(175),[5]]]},DB.days[todayISO].w);},expanded);
  const g=await p.evaluate(()=>{const mark=document.querySelector('.sc-outcome-mark'),row=mark.closest('tr'),table=mark.closest('table'),r=mark.getBoundingClientRect(),t=table.getBoundingClientRect(),before=row.getBoundingClientRect().height;mark.hidden=true;const after=row.getBoundingClientRect().height;mark.hidden=false;return {before,after,right:r.right,edge:t.right,overflow:document.documentElement.scrollWidth>innerWidth};});
  assert.equal(g.before,g.after,'Marker must not add row height');assert(g.right<=g.edge+14,'Marker stays inside card inset');assert(!g.overflow);
  assert.equal(await p.locator('.sc-compact-result,.sc-result').count(),0);
  const before=await p.evaluate(()=>JSON.stringify(DB));await p.locator('.sc-outcome-mark').click();assert.equal(await p.evaluate(()=>JSON.stringify(DB)),before);
  if(width===393&&!expanded)await p.locator('.sc-session').screenshot({path:'../quiet-feedback-implemented.png'});
 }
 console.log('PASS compact/expanded at 320/393/430, no row-height change, no status lines or overflow, feedback does not modify workout');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
