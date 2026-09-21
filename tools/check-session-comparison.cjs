const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(x=>x&&fs.existsSync(x));
const PORT=process.env.PW_PORT||'8791';
(async()=>{const b=await chromium.launch(CHROME?{headless:true,executablePath:CHROME}:{headless:true});try{
for(const theme of ['light','dark'])for(const width of [320,393,430]){
 const p=await b.newPage({viewport:{width,height:900},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:'+PORT+'/')?r.continue():r.abort());await p.goto('http://127.0.0.1:'+PORT+'/');
 for(const scenario of ['both','plan','last','neither']){
 await p.evaluate(({theme,scenario})=>{todayISO='2026-09-22';checkDate=()=>false;DB={days:{},settings:{unit:'lb',onboarded:true,theme}};SEED={...SEED,last:{},sessions:1};
 if(['both','last'].includes(scenario))DB.days['2026-09-15']={w:[{ex:'Lat Pulldown',part:'Back',w:56.699,reps:[8,8,8,8],at:1}]};
 if(['both','plan'].includes(scenario))DB.plan={d:todayISO,items:[{ex:'Lat Pulldown',lines:[{w:58.967,reps:[8,8,8,8]}]}]};
 lift={part:'Back',ex:'Lat Pulldown',weight:54.431,rep:6};view='lift';document.querySelector('#onb')?.remove();
 for(let i=0;i<4;i++)plLog({ex:lift.ex,part:'Back',w:54.431,reps:[6],at:100+i});lift.justSaved=true;applyTheme();render();}, {theme,scenario});
 await p.waitForTimeout(150);const card=p.locator('.sc-session');assert.equal(await card.count(),1);
 assert.equal(await card.locator('thead th').count(),scenario==='both'?4:scenario==='neither'?2:3);
 assert(!(await card.innerText()).includes('That set counts.'));assert.equal(await p.locator('.sess-then').count(),0);
 /* v4.6.96: the card's terminal action ends the EXERCISE and names it; the
    day is ended from the live bar, which is the only door to that sheet now.
    The label carries a variable-length exercise name in a slot narrower than
    the page, so it is checked for clipping, not just for being present. */
 assert.equal(await card.locator('#scFinishBtn').count(),0);
 assert.equal(await card.locator('#doneExBtn').count(),1);
 assert.equal((await card.locator('#doneExBtn').innerText()).trim(),'\u2713 Done with Lat Pulldown');
 assert(await card.locator('#doneExBtn').evaluate(b=>{const r=b.getBoundingClientRect(),c=b.closest('.sc-session').getBoundingClientRect();
   return b.scrollWidth<=b.clientWidth+1&&b.scrollHeight<=b.clientHeight+1&&r.left>=c.left-1&&r.right<=c.right+1&&r.height>=44;}),'done button fits its slot');
 assert.equal(await p.locator('#liveWorkoutFinish').count(),1,'the day still ends from the live bar');
 assert.equal(await card.locator('tbody tr').count(),4);assert.equal(await card.locator('.sc-result').count(),1);
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const before=await p.evaluate(()=>JSON.stringify(DB));await card.locator('.sc-result summary').last().click();assert.equal(await p.evaluate(()=>JSON.stringify(DB)),before);
 if(scenario==='both'&&width===393){await card.screenshot({path:'../session-live-'+theme+'.png'});await p.locator('#sessEdit').click();assert(await p.locator('#sessEdit').innerText()==='DONE');await p.locator('#sessEdit').click();assert.equal(await p.locator('.sc-session').count(),1);}
 }
 const invariants=await p.evaluate(()=>{
 const ex='Lat Pulldown',last={w:50,r:8},target={w:55,reps:8},below={w:45,r:6},trade={w:60,r:6},both={w:60,r:8};
 return plSetOutcome(ex,below,last,target).label==='Set done'&&!plSetOutcome(ex,trade,last,target).win&&plSetOutcome(ex,both,last,target).label==='Beat both'&&!plSetOutcome('Pull Up',both,last,target).win;
 });assert(invariants);assert.equal(errors.length,0,errors.join('\n'));console.log('PASS four scenarios, edit, read-only, geometry and outcomes '+theme+' '+width);await p.close();
}
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
