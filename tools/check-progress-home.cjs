// PW_PORT=8847 node tools/check-progress-home.cjs; local server, real Chromium.
const {chromium}=require('playwright'),assert=require('assert');
const origin='http://127.0.0.1:'+(process.env.PW_PORT||8847)+'/';
setTimeout(()=>{console.error('FAIL Progress/Today browser check exceeded 90 seconds');process.exit(1)},90000).unref();
(async()=>{const b=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
const p=await b.newPage({viewport:{width:393,height:852},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());await p.goto(origin);
async function seed(scenario){await p.evaluate(scenario=>{document.querySelector('#onb')?.remove();todayISO='2026-09-25';checkDate=()=>false;flowLayout='refined';DB={days:{},settings:{onboarded:true,name:'Sungjee',unit:'lb',skin:'minimal',theme:'light',barTheme:'light',mascotMotion:'still'}};lift.plan=null;lift.ex=null;lift.part=null;d1.preview=false;
if(scenario!=='new')DB.days['2026-09-23']={w:[{ex:'Squat',part:'Legs',w:60,reps:[8,8,8]}],doneAll:true};
if(scenario==='planned'||scenario==='tomorrow')DB.plan={d:scenario==='planned'?todayISO:'2026-09-26',items:[{ex:'Squat',lines:[{w:60,reps:[8,8,8]}]},{ex:'Hanging Leg Raise',lines:[{w:0,reps:[12,12,12]}]}]};SEED=deriveAll();view='today';applyTheme();render();},scenario);await p.waitForTimeout(350);}
for(const scenario of ['new','week','month','tomorrow']){await seed(scenario);assert(await p.locator('#goLift').isVisible());assert.equal(await p.locator('.today-focus-card').count(),1);if(scenario!=='new')assert((await p.locator('.today-focus-card h3').innerText()).includes('What’s today’s workout?'));const before=await p.evaluate(()=>JSON.stringify({days:DB.days,plan:DB.plan}));await p.locator('#goLift').click();await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>view),'lift');assert.equal(await p.evaluate(()=>JSON.stringify({days:DB.days,plan:DB.plan})),before);}
await seed('planned');assert((await p.locator('.today-focus-meta').innerText()).includes('6 sets · 2 exercises'));
assert.equal(await p.locator('.today-focus-title h3').evaluate(e=>getComputedStyle(e).fontSize),'21px');
assert.equal(await p.locator('.today-focus').evaluate(e=>getComputedStyle(e).marginTop),'-20px');
assert(await p.locator('.pw-push').isVisible());assert((await p.locator('#restBtn').boundingBox()).height>=52);
const planBefore=await p.evaluate(()=>JSON.stringify(DB.plan));
await p.locator('.today-focus-plan>summary').click();await p.waitForTimeout(350);
assert(await p.locator('.today-focus-plan-content .planrow').first().isVisible());
await p.evaluate(()=>render());await p.waitForTimeout(350);
assert(await p.locator('.today-focus-plan').evaluate(e=>e.open));assert.equal(await p.evaluate(()=>JSON.stringify(DB.plan)),planBefore);
await p.locator('.today-focus-plan>summary').click();await p.waitForTimeout(350);
assert(!await p.locator('.today-focus-plan').evaluate(e=>e.open));
await p.screenshot({path:'../today-release-130.png'});
await p.locator('.today-focus-next [data-planex="Squat"]').click();await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>lift.ex),'Squat');
await p.locator('#nav [data-progress]').click();await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>view),'history');assert(await p.locator('#progressSwitch').isVisible());assert.equal(await p.locator('#nav button').count(),4);
await p.locator('[data-progress-view="stats"]').click();await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>view),'stats');await p.locator('#nav [data-v="today"]').click();await p.waitForTimeout(300);assert(await p.locator('#progressSwitch').isHidden());await p.locator('#nav [data-progress]').click();await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>view),'stats');assert.equal(await p.evaluate(()=>localStorage.getItem('showup:progress-view')),'stats');
for(const theme of ['light','dark'])for(const width of [320,393,430]){await p.setViewportSize({width,height:852});await p.evaluate(theme=>{DB.settings.theme=theme;DB.settings.barTheme=theme;applyTheme();view='today';render();},theme);await p.waitForTimeout(200);assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));if(width===393)await p.screenshot({path:'../progress-home-'+theme+'.png'});}
await seed('tomorrow');const before=await p.evaluate(()=>JSON.stringify(DB.plan));assert(await p.locator('.today-focus-upcoming details').evaluate(e=>e.open));await p.locator('.today-focus-upcoming summary').click();await p.waitForTimeout(350);assert(!await p.locator('.today-focus-upcoming details').evaluate(e=>e.open));await p.locator('.today-focus-upcoming summary').click();await p.waitForTimeout(350);assert(await p.locator('.today-focus-upcoming [data-pw="open-date"]').isVisible());assert.equal(await p.evaluate(()=>JSON.stringify(DB.plan)),before);
await p.locator('.today-focus-tools [aria-label="Choose dates"]').click();await p.waitForTimeout(350);assert.equal(await p.evaluate(()=>lift.plan),'workspace');assert(await p.locator('header.planmode').isVisible());
await seed('month');await p.evaluate(()=>{DB.days[todayISO]={w:[],rest:true};render()});await p.waitForTimeout(300);assert.equal(await p.locator('.today-focus').count(),0);assert(await p.locator('header.resting').isVisible());
await seed('month');await p.evaluate(()=>{DB.days[todayISO]={w:[{ex:'Squat',part:'Legs',w:60,reps:[8],at:Date.now()}],doneEx:[],donePart:[]};SEED=deriveAll();render()});await p.waitForTimeout(300);assert.equal(await p.locator('.today-focus').count(),0);assert(await p.locator('#liveWorkoutFinish').isVisible());assert.deepEqual(errors,[]);console.log('PASS Progress/Today: all states, four tabs, remembered view, copy, Train routing, plan preservation, themes, narrow layouts and live/rest compatibility');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
