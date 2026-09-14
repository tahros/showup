const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
(async()=>{
 const out=process.argv[2];fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe',headless:true});
 for(const theme of ['light','dark'])for(const width of [320,393,430]){
  const ctx=await browser.newContext({viewport:{width,height:852},serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];
  await ctx.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:8784'?r.continue():r.abort());
  page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8784/');
  await page.waitForFunction(()=>typeof pfOpen==='function'||typeof pfState==='function');
  await page.evaluate(theme=>{
   DB={days:{},settings:{name:'Test User',sex:'M',unit:'lb',theme,onboarded:true,myParts:['Legs','Sixpack']}};
   todayISO='2026-09-13';checkDate=()=>false;lift={part:'Legs',ex:'Squat'};SEED=deriveAll();document.getElementById('onb')?.remove();applyTheme();pwOpen('2026-09-14');
  },theme);
  const verify=async label=>{
   await page.waitForTimeout(1100); // Capture settled app entry/view transitions.
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),theme+' '+width+' '+label+' overflow');
   await page.screenshot({path:path.join(out,theme+'-'+width+'-'+label+'.png'),fullPage:true});
  };
  await verify('dates');await page.locator('[data-pw="pf-prefs"]').click();await verify('preferences');
  await page.locator('[data-value="7"]').click();await page.locator('[data-pw="pf-prefs-save"]').click();
  await page.evaluate(()=>{
   for(const d of ['2026-09-14','2026-09-15']){
    const b=pwDay(d);b.rows=pwRead('Squat\n135 lb × 10 (warm-up)\n225 lb × 8 8 8 8\nHanging Leg Raise\nBW × 12 12 12');b.parts=['Legs','Sixpack'];
   }
   pw().dates=['2026-09-14','2026-09-15'];pfAnchor();pfNavigate('days');
  });
  await page.locator('[data-pw="pf-expand"]').click();await verify('days');
  await page.locator('[data-pw="pf-edit-first"]').click();await verify('routine');
  await page.locator('[data-pw-grip="0"]').focus();await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(()=>pwDay(pw().active).rows[0].ex),'Hanging Leg Raise');
  await page.locator('[data-pw="pf-plus"]').click();
  assert(await page.locator('.pf-beam').count()===1);await page.locator('[data-pw="pf-minus"]').click();
  await page.locator('[data-pw="pf-save"]').click();await verify('done');
  assert(await page.evaluate(()=>plCurrent('2026-09-14').targets.length===8));
  await page.locator('[data-stage="1"]').click();await page.locator('[data-stage="2"]').click();
  assert(await page.locator('[data-pw="pf-edit-first"]').count()===1);
  assert.equal(errors.length,0,errors.join('\n'));console.log('PASS '+theme+' '+width+'px planner flow, real clicks and save');
  await ctx.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
