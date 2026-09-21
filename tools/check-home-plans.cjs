const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(x=>x&&fs.existsSync(x));
const PORT=process.env.PW_PORT||'8795';
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});try{
const p=await b.newPage({serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:'+PORT+'/')?r.continue():r.abort());await p.goto('http://127.0.0.1:'+PORT+'/');
async function setup(kind='sunday'){await p.evaluate(kind=>{todayISO='2026-09-20';checkDate=()=>false;document.querySelector('#onb')?.remove();DB={days:{'2026-09-19':{w:[{ex:'Squat',part:'Legs',w:135,reps:[8],at:1}],doneAll:true}},settings:{onboarded:true,unit:'lb',mascotMotion:'off'},week:{days:{}}};const doc=planItemsFrom(pwRead('Squat\n135 lb × 8 8 8\n\nHanging Leg Raise\nBW × 12 12'));for(const d of ['2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25'])DB.week.days[d]={...pwCopy(doc),d};if(kind==='today')DB.plan={...pwCopy(doc),d:todayISO};if(kind==='closed')DB.days[todayISO]={w:[{ex:'Squat',part:'Legs',w:135,reps:[8],at:1}],doneAll:true};if(kind==='gap')delete DB.week.days['2026-09-21'];if(kind==='empty')DB.week.days={};if(kind==='single'){DB.plan={...pwCopy(doc),d:'2026-09-21'};DB.week.days={}}pwState=null;pwOwner=null;localStorage.removeItem(pwKey());SEED=deriveAll();lift={};view='today';render({inplace:true});},kind);await p.waitForTimeout(450);}
for(const kind of ['sunday','today','closed','gap','empty','single']){await setup(kind);const summary=await p.locator('.pw-home details>summary').allTextContents();const expected=kind==='today'?7:kind==='gap'?5:kind==='empty'?0:kind==='single'?1:6;assert.equal(summary.length,expected,kind);if(expected){assert(!(await p.locator('.pw-home').textContent()).includes('Plan your next workout'));assert(summary[0].includes(kind==='today'?'Today':kind==='gap'?'Tue, Sep 22':'Tomorrow'));}else assert((await p.locator('.pw-home').textContent()).includes('Plan your next workout'));assert.equal(await p.locator('.pw-home-tools button').count(),2);
  /* v4.6.95: the day you are about to train is the card; every day behind it
     is under one lid. Today planned -> today is the card and TOMORROW FOLDS;
     today done, or today unplanned -> tomorrow is the card and does not fold.
     The lid opens by default, so no planned day vanishes from a screen that
     showed it yesterday. */
  const fold=p.locator('details.pw-later');const hasFold=await fold.count();
  if(hasFold){assert(await fold.evaluate(f=>f.open),kind+' fold open by default');
    assert.equal(await p.locator('.pw-plan-group>.pw-later-day').count(),0,kind+' has no day pinned beside the lid');
    const card=(await p.locator('.pw-plan-group>.pw-saved>summary').first().innerText()).split('\n')[0];
    assert(card.startsWith(kind==='today'?'Today':kind==='gap'?'Tue, Sep 22':'Tomorrow'),kind+' card is '+card);
    const folded=await p.locator('.pw-later-list>.pw-later-day>summary').allInnerTexts();
    assert.equal(folded.some(x=>x.startsWith('Tomorrow')),kind==='today',kind+' tomorrow folded = '+(kind==='today'));}
  else assert(['empty','single'].includes(kind),kind+' should carry a fold');}
await setup();const snapshot=await p.evaluate(()=>JSON.stringify([DB.days,DB.week,DB.plan]));
for(const width of [320,393,430])for(const theme of ['light','dark']){await p.setViewportSize({width,height:1100});await p.evaluate(t=>{DB.settings.theme=t;applyTheme();},theme);assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));assert.equal(await p.locator('.pw-later-day>summary:visible').count(),4);const buttons=await p.locator('.pw-home-tools button').evaluateAll(bs=>bs.map(b=>({height:b.getBoundingClientRect().height,icons:b.querySelectorAll('.ic').length})));assert(buttons.every(b=>b.height===36&&b.icons===1));}
/* v4.6.94: shut once, shut thereafter. The fold is the whole point of the row --
   it has to survive the next render, which is when the old disclosures forgot. */
{const fold=p.locator('details.pw-later');const tall=await fold.evaluate(f=>f.getBoundingClientRect().height);
 await p.locator('.pw-later>summary').click();await p.waitForTimeout(450);
 assert.equal(await fold.evaluate(f=>f.open),false,'fold shuts on tap');
 assert(await fold.evaluate(f=>f.getBoundingClientRect().height)<tall/3,'shut fold is one row tall');
 assert.equal(await p.evaluate(()=>pw().folds.later),false,'shut state is remembered');
 await p.evaluate(()=>render({inplace:true}));await p.waitForTimeout(350);
 assert.equal(await p.locator('details.pw-later').evaluate(f=>f.open),false,'still shut after a re-render');
 assert.equal(await p.locator('.pw-later-day:visible').count(),0,'the lid hides every day behind the card');
 await p.locator('.pw-later>summary').click();await p.waitForTimeout(450);
 assert.equal(await p.locator('details.pw-later').evaluate(f=>f.open),true,'and it opens again');}
await p.locator('[data-pw-fold="future:2026-09-21"]>summary').click();await p.waitForTimeout(350);assert(await p.locator('[data-pw-fold="future:2026-09-21"] .plancard').isVisible());await p.locator('[data-pw-fold="future:2026-09-21"] [data-pw="open-date"]').click();assert.equal(await p.evaluate(()=>pw().active),'2026-09-21');assert.equal(await p.evaluate(()=>JSON.stringify([DB.days,DB.week,DB.plan])),snapshot);
await setup();await p.locator('.pw-home-tools [data-pw="open"]').click();assert.equal(await p.evaluate(()=>pfState().page),'dates');await p.locator('header .hback').click();assert.equal(await p.evaluate(()=>lift.plan),null);
await p.locator('.pw-home-tools [data-pw="paste-open"]').click();assert.equal(await p.evaluate(()=>pw().active),'2026-09-21');assert.equal(await p.evaluate(()=>pw().step),'paste');assert.equal(await p.evaluate(()=>JSON.stringify([DB.days,DB.week,DB.plan])),snapshot);
assert.deepEqual(errors,[]);console.log('PASS Sunday, today, completed, gap, empty, DB.plan-only; date visibility, mobile themes, expansion, Edit, Plan, Paste, header return and unchanged records');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
