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
   DB.days['2026-09-12']={w:[...Array.from({length:4},()=>({part:'Legs',ex:'Squat',w:185/LB,reps:[8]})),{part:'Sixpack',ex:'Hanging Leg Raise',w:0,reps:[12,12,12]}]};
   todayISO='2026-09-13';checkDate=()=>false;lift={part:'Legs',ex:'Squat'};SEED=deriveAll();document.getElementById('onb')?.remove();applyTheme();pwOpen('2026-09-14');
  },theme);
  const verify=async label=>{
   await page.waitForTimeout(1100); // Capture settled app entry/view transitions.
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),theme+' '+width+' '+label+' overflow');
   assert(await page.evaluate(()=>{
    const hdr=document.querySelector('header'),date=document.querySelector('#hDate'),week=document.querySelector('#hWeek'),gear=document.querySelector('#gearBtn');
    const rect=e=>e.getBoundingClientRect(),center=e=>rect(e).top+rect(e).height/2;
    const css=getComputedStyle(date),font=[css.fontFamily,css.fontSize,css.fontWeight].join('|');
    hdr.classList.remove('planmode');const normal=getComputedStyle(date),standard=[normal.fontFamily,normal.fontSize,normal.fontWeight].join('|');hdr.classList.add('planmode');
    return font===standard&&Math.abs(center(date)-center(gear))<1&&Math.abs(center(week)-center(gear))<1&&
     week.children.length===7&&rect(week).width>0&&date.scrollWidth<=date.clientWidth+1&&rect(date).right<=rect(week).left;
   }),theme+' '+width+' '+label+' shared date font, centered header and visible streak');
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
  await verify('days-collapsed');
  assert(await page.evaluate(()=>{
   const card=document.querySelector('.pf-day>.card').getBoundingClientRect(),row=document.querySelector('.pf-primary-row'),buttons=[...row.children].map(e=>e.getBoundingClientRect());
   return card.height<130&&Math.abs(buttons[0].top-buttons[1].top)<1&&!document.querySelector('.pf-history,.pw-editor-head');
  }),'compact overview and single-row CTAs');
  await page.locator('[data-pw="pf-expand"]').click();await verify('days');
  await page.locator('[data-pw="pf-edit-first"]').click();await verify('routine');
  assert((await page.locator('.pf-history-row').first().textContent()).includes('185 lb × 8 8 8 8'));
  assert(await page.evaluate(()=>!document.querySelector('[data-pw="pf-dates"]')&&getComputedStyle(document.querySelector('header .hback')).display!=='none'));
  await page.locator('header .hback').click();
  assert(await page.locator('[data-pw="pf-edit-first"]').count()===1);
  await page.locator('[data-pw="pf-edit-first"]').click();
  await page.locator('[data-pw-grip="0"]').focus();await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(()=>pwDay(pw().active).rows[0].ex),'Hanging Leg Raise');
  await page.locator('[data-pw="pf-plus"]').click();
  assert(await page.locator('.pf-beam').count()===1);await page.locator('[data-pw="pf-minus"]').click();
  await page.locator('[data-pw="pf-save"]').click();await verify('done');
  assert(await page.evaluate(()=>plCurrent('2026-09-14').targets.length===8));
  await page.locator('[data-stage="1"]').click();await verify('saved-dates');
  assert(await page.evaluate(()=>{
   const dot=document.querySelector('.pf-calendar .selected .pf-plan-dot'),probe=document.createElement('span');
   if(!dot||getComputedStyle(dot).color!=='rgb(255, 255, 255)'||getComputedStyle(dot).backgroundColor!=='rgba(0, 0, 0, 0)')return false;
   dot.closest('button').classList.remove('selected');
   probe.style.color='var(--accent)';document.body.append(probe);
   const same=getComputedStyle(dot).color===getComputedStyle(probe).color;probe.remove();
   dot.closest('button').classList.add('selected');return same;
  }),'saved-plan dots are white when selected and theme blue otherwise');
  await page.locator('[data-stage="2"]').click();
  assert(await page.locator('[data-pw="pf-edit-first"]').count()===1);
  assert.equal(errors.length,0,errors.join('\n'));console.log('PASS '+theme+' '+width+'px planner flow, real clicks and save');
  await ctx.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
