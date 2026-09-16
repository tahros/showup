const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
const p=await b.newPage({viewport:{width:393,height:852},serviceWorkers:'block'});await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());await p.goto('http://127.0.0.1:8784/');
const result=await p.evaluate(()=>{
 todayISO='2026-09-16';checkDate=()=>false;DB={days:{},settings:{unit:'lb',onboarded:true},week:{days:{}}};const ex='Incline Barbell Bench Press';lift={ex,part:'Chest',weight:0};view='lift';document.querySelector('#onb')?.remove();
 planSave([{ex,lines:[{w:toKg(95),reps:[10],qual:'warm-up'},{w:toKg(115),reps:[10],qual:'warm-up'},{w:toKg(165),reps:[8,8,8,8]},{w:toKg(175),reps:[6]}]}],'','',todayISO);
 const last={d:'2026-09-10',sets:[[toKg(95),[10]],[toKg(115),[10]],[toKg(155),[10,10,10,9]],[toKg(175),[5]]]};
 const paint=()=>document.querySelector('#view').innerHTML=plSessionHTML(ex,last,DB.days[todayISO].w);
 for(const w of [95,115])plLog({part:'Chest',ex,w:toKg(w),reps:[10],at:Date.now()});SEED=deriveAll();render();paint();
 const labels=()=>[...document.querySelectorAll('.sc-table tbody th')].map(x=>x.textContent);const before=labels();
 const chips=[...document.querySelectorAll('.sc-plan button.sc-rep')].filter(x=>x.textContent==='8');chips[3].click();const chosen=plChoice(ex).target.ordinal;
 plLog({part:'Chest',ex,w:toKg(165),reps:[8],at:Date.now()});paint();const after=labels(),linked=DB.days[todayISO].w.at(-1).planRef.target.ordinal;
 plLog({part:'Chest',ex,w:toKg(160),reps:[7],at:Date.now()});paint();const varied=labels(),loads=[...document.querySelectorAll('.sc-now .sc-weight')].map(x=>x.textContent);
 lift.scDetails=ex;paint();document.querySelector('.sc-slot[data-link-slot="6"]').click();const explicit=plChoice(ex).target.ordinal;
 plLog({part:'Chest',ex,w:toKg(165),reps:[8],at:Date.now()});lift.scDetails=null;paint();const outOfOrder=labels();
 return {before,chosen,after,linked,varied,loads,explicit,outOfOrder,links:DB.days[todayISO].w.map(s=>s.planRef.target.ordinal)};
});
assert.deepEqual(result.before,['1W','2W','3–6','7']);assert.equal(result.chosen,3);assert.equal(result.linked,3);assert.deepEqual(result.after,result.before);assert.deepEqual(result.varied,result.before);assert(result.loads.some(s=>s.includes('160')));assert(result.loads.some(s=>s.includes('165')));assert.equal(result.explicit,6);assert.deepEqual(result.outOfOrder,result.before);assert.deepEqual(result.links,[1,2,3,4,6]);
console.log('PASS last-chip tap loads numbers without skipping; stable 3–6 during partial/different-load/out-of-order logging; explicit slot selection preserved',JSON.stringify(result));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
