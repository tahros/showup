const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
const p=await b.newPage({serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8795/')?r.continue():r.abort());await p.goto('http://127.0.0.1:8795/');
async function setup(kind='sunday'){await p.evaluate(kind=>{todayISO='2026-09-20';checkDate=()=>false;document.querySelector('#onb')?.remove();DB={days:{'2026-09-19':{w:[{ex:'Squat',part:'Legs',w:135,reps:[8],at:1}],doneAll:true}},settings:{onboarded:true,unit:'lb',mascotMotion:'off'},week:{days:{}}};const doc=planItemsFrom(pwRead('Squat\n135 lb × 8 8 8\n\nHanging Leg Raise\nBW × 12 12'));for(const d of ['2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25'])DB.week.days[d]={...pwCopy(doc),d};if(kind==='today')DB.plan={...pwCopy(doc),d:todayISO};if(kind==='closed')DB.days[todayISO]={w:[{ex:'Squat',part:'Legs',w:135,reps:[8],at:1}],doneAll:true};if(kind==='gap')delete DB.week.days['2026-09-21'];if(kind==='empty')DB.week.days={};if(kind==='single'){DB.plan={...pwCopy(doc),d:'2026-09-21'};DB.week.days={}}pwState=null;pwOwner=null;localStorage.removeItem(pwKey());SEED=deriveAll();lift={};view='today';render({inplace:true});},kind);await p.waitForTimeout(450);}

await p.setViewportSize({width:393,height:852});
for(const [width,height] of [[320,568],[393,852],[430,932]]){
 await p.setViewportSize({width,height});await setup();
 const plans=await p.evaluate(()=>JSON.stringify(DB.week));
 await p.locator('#restBtn').click();await p.waitForTimeout(1100);
 assert(await p.locator('body').evaluate(e=>e.classList.contains('rest-home')));
 assert.equal(await p.locator('.hello .hi').textContent(),'Rest day');
 assert(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'collapsed Rest fits viewport');
 assert.notEqual(await p.locator('meta[name="theme-color"]').getAttribute('content'),'#F2F3F6');
 assert.equal(await p.locator('header .h-weekrow').isVisible(),false);
 assert.equal(await p.locator('#view .crcard').count(),0);
 await p.locator('[data-rest-menu]').click();
 assert.equal(await p.locator('#restPlanMenu').isVisible(),true);
 assert.equal(await p.locator('#restPlanMenu [data-pw]:visible').count(),3);
 await p.locator('[data-rest-menu-close]').click();
 assert.equal(await p.locator('#restPlanMenu').isVisible(),false);
 assert.equal(await p.locator('.pw-rest-later').getAttribute('open'),null);
 assert.equal(await p.locator('.pw-home-tools button').count(),3);
 assert.equal(await p.locator('.pw-home .pw-saved>summary:visible').count(),1);
 assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
 await p.locator('.pw-rest-later>summary').click();await p.waitForTimeout(400);
 assert.equal(await p.locator('.pw-later-day>summary:visible').count(),4);
 await p.locator('#restBtn').click();await p.waitForTimeout(1100);
 assert(!(await p.locator('body').evaluate(e=>e.classList.contains('rest-home'))));
 assert(!(await p.locator('html').evaluate(e=>e.classList.contains('rest-home'))));
 assert.equal(await p.evaluate(()=>JSON.stringify(DB.week)),plans);
 assert.equal(await p.evaluate(()=>!!DB.days[todayISO].doneAll),false);
}
await setup();await p.evaluate(()=>{DB.settings.mascotMotion='still';render({inplace:true});});await p.locator('#restBtn').click();await p.waitForTimeout(1100);
await p.screenshot({path:'rest-home-verified.png'});
await p.emulateMedia({reducedMotion:'reduce'});await p.locator('#restBtn').click();await p.waitForTimeout(150);
assert(!(await p.locator('body').evaluate(e=>e.classList.contains('rest-home'))));
for(const kind of ['today','empty','gap']){await setup(kind);await p.locator('#restBtn').click();await p.waitForTimeout(150);assert.equal(await p.locator('.pw-home-tools button').count(),3);}
assert.deepEqual(errors,[]);console.log('PASS rest morph, undo, mobile, disclosures, reduced motion, no-plan and existing-plan cases, records preserved');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
