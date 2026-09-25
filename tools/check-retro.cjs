const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
const p=await b.newPage({serviceWorkers:'block',viewport:{width:393,height:852}}),errors=[];
p.on('pageerror',e=>errors.push(e.message));
await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8795/')?r.continue():r.abort());
await p.goto('http://127.0.0.1:8795/');
await p.evaluate(()=>{
todayISO='2026-09-20';checkDate=()=>false;document.getElementById('onb')?.remove();
DB={days:{'2026-09-20':{doneEx:[],donePart:[],sugX:{},planOpen:{},w:[{part:'Chest',ex:'Incline Barbell Bench Press',w:75,reps:[8],at:Date.now()}]}},settings:{onboarded:true,name:'Preview',unit:'lb',theme:'light',skin:'minimal',mascotMotion:'still'}};
SEED=deriveAll();view='sync';applyTheme();render();window.beforeRecords=JSON.stringify(DB.days);
});
await p.locator('[data-skn="retro"]').click();
assert.equal(await p.evaluate(()=>DB.settings.skin),'retro');
assert.equal(await p.evaluate(()=>localStorage.getItem('showup-skin')),'retro');
assert.equal(await p.locator('#retroSoundBtn').getAttribute('aria-pressed'),'false');
await p.locator('#retroSoundBtn').click();
assert.equal(await p.locator('#retroSoundBtn').getAttribute('aria-pressed'),'true');
await p.locator('#retroSoundBtn').click();
// The renderer is finite, responds to the motion preference, and cleans up.
await p.evaluate(()=>{DB.settings.mascotMotion='animated';window.testHost=document.createElement('div');testHost.style.width='168px';document.body.appendChild(testHost);window.testSprite=createRetroMascot(testHost,{mode:'jump',tone:'blue'});window.spriteBefore=testHost.querySelector('canvas').toDataURL();testSprite.replay();});
await p.waitForTimeout(400);
assert(await p.evaluate(()=>testHost.querySelector('canvas').toDataURL()!==spriteBefore));
await p.waitForTimeout(3300);   // v4.6.135: the film's jump (2.7s) and its settle, then back to standing
assert(await p.evaluate(()=>testHost.querySelector('canvas').toDataURL()===spriteBefore));
await p.emulateMedia({reducedMotion:'reduce'});
await p.evaluate(()=>testSprite.replay());await p.waitForTimeout(400);
assert(await p.evaluate(()=>testHost.querySelector('canvas').toDataURL()===spriteBefore));
await p.evaluate(()=>{testSprite.dispose();if(testHost.querySelector('canvas'))throw Error('Canvas not disposed');testHost.remove();DB.settings.mascotMotion='still';});
await p.emulateMedia({reducedMotion:'no-preference'});
for(const theme of ['light','dark']){
await p.evaluate(t=>{DB.settings.theme=t;applyTheme();render();},theme);
const colors=await p.evaluate(()=>{
const props=['--ground','--surface','--chalk','--accent','--rest'],get=()=>props.map(k=>getComputedStyle(document.documentElement).getPropertyValue(k));
const retro=get();DB.settings.skin='minimal';applyTheme();const minimal=get();DB.settings.skin='retro';applyTheme();return {retro,minimal};
});/* v4.6.135: Retro wears the gym film's palette now; rest green is shared */
assert.equal(colors.retro[0].trim(),theme==='dark'?'#0B0D14':'#E6E8EB');assert.equal(colors.retro[4],colors.minimal[4]);assert.notDeepEqual(colors.retro,colors.minimal);
for(const width of [320,393,430]){
await p.setViewportSize({width,height:900});
for(const v of ['today','sync','lift','history','stats']){
await p.evaluate(v=>{view=v;lift.plan=false;lift.part='Chest';lift.ex='Incline Barbell Bench Press';render();},v);
await p.waitForTimeout(80);
assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),theme+' '+width+' '+v+' overflow');
assert.equal(await p.locator('nav').count(),1);
}
}
}
await p.evaluate(()=>{window.savedDay=DB.days[todayISO];DB.days[todayISO]={w:[],rest:true};view='today';render();});
await p.waitForTimeout(150);await p.screenshot({path:'retro-rest-verified.png',fullPage:true});
await p.evaluate(()=>{DB.days[todayISO]=savedDay;view='sync';render();});
const result=await p.evaluate(()=>{
const c=document.createElement('canvas');c.width=1080;drawDayCard(c.getContext('2d'),1080,todayISO);
const mark=retroMark();return {unchanged:JSON.stringify(DB.days)===beforeRecords,mark:mark.width,receiptHeight:c.height,mono:getComputedStyle(document.body).fontFamily};
});if(!result.unchanged)console.log(await p.evaluate(()=>({before:beforeRecords,after:JSON.stringify(DB.days)})));assert(result.unchanged);assert.equal(result.mark,48);assert(result.receiptHeight>0);assert(result.mono.includes('Mono'));
await p.locator('[data-skn="classic"]').click();assert.equal(await p.evaluate(()=>document.documentElement.dataset.skin),'classic');assert.equal(await p.locator('#retroSoundBtn').count(),0);
await p.locator('[data-skn="minimal"]').click();assert.equal(await p.evaluate(()=>document.documentElement.dataset.appearance),'minimal');
assert.deepEqual(errors,[]);console.log('PASS Retro persistence, three appearances, optional sounds, palette parity, all views at 320/393/430, share render and unchanged records');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
