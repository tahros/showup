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
    const positions=()=>[rect(hdr).height,rect(gear).x,rect(gear).y,rect(week).x,rect(week).y];
    const plannerPositions=positions();
    hdr.classList.remove('planmode');const normal=getComputedStyle(date),standard=[normal.fontFamily,normal.fontSize,normal.fontWeight].join('|'),todayPositions=positions();hdr.classList.add('planmode');
    if(date.textContent!=='Plan'||plannerPositions.some((v,i)=>Math.abs(v-todayPositions[i])>.1))return false;
    const title=document.querySelector('.pf-routine-date');
    if(title){const c=getComputedStyle(title);if(c.font!==css.font||c.letterSpacing!==css.letterSpacing)return false;}
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
  assert(await page.evaluate(()=>{
   const rect=e=>e.getBoundingClientRect(),cy=e=>rect(e).top+rect(e).height/2;
   const out=document.querySelector('.pf-total output'),minus=document.querySelector('[data-pw="pf-minus"]'),plus=document.querySelector('[data-pw="pf-plus"]');
   const centered=Math.abs((rect(out).left+rect(out).right)/2-(rect(minus).right+rect(plus).left)/2)<1;
   return !document.querySelector('.pw-setup,[data-pw="lock"]')&&document.querySelector('.pf-routine-date')&&centered&&parseFloat(getComputedStyle(out).fontSize)<=20&&
    [...document.querySelectorAll('.pw-editable')].every(e=>Math.abs(cy(e.querySelector('.pw-grip'))-cy(e.querySelector('.pw-ex-title')))<1)&&
    [...document.querySelectorAll('.pf-row-button')].every(e=>e.querySelector('svg'))&&
    Math.abs(rect(document.querySelector('.pf-add-button')).width-rect(document.querySelector('.pf-add-summary')).width)<1;
  }),'compact routine title, centered set count, aligned grips and icon buttons');
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
  assert.equal(await page.locator('.pf-done [data-pw="pf-edit-day"],.pf-done [data-pw-grip],.pf-done [data-pw="editrow"]').count(),0);
  assert.equal(await page.locator('.pf-dock [data-pw="close"]').textContent(),'Plans saved · Done');
  await page.locator('[data-pw="pf-done-expand"]').click();await verify('done-expanded');
  assert.equal(await page.locator('[data-pf-saved-fold][open]').count(),2);
  await page.locator('[data-pw="pf-done-expand"]').click();
  assert.equal(await page.locator('[data-pf-saved-fold][open]').count(),0);
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
  await page.evaluate(()=>{lift.plan=null;view='today';pw().upcomingOpen=true;render({soft:true});});
  await page.locator('[data-pw="open-date"][data-date="2026-09-15"]').click();
  assert.equal(await page.evaluate(()=>pfState().page),'edit');
  assert.equal(await page.evaluate(()=>pw().active),'2026-09-15');
  await page.locator('[data-stage="1"]').click();
  await page.locator('[data-pw="pf-prefs"]').click();
  await page.locator('header .hback').click();
  assert.equal(await page.evaluate(()=>pfState().page),'dates');
  await page.locator('header .hback').click();
  assert.equal(await page.evaluate(()=>pfState().page),'edit');
  assert.equal(await page.evaluate(()=>pw().active),'2026-09-15');
  await page.locator('header .hback').click();
  assert.equal(await page.evaluate(()=>view==='today'&&!lift.plan),true);
  assert.equal(errors.length,0,errors.join('\n'));console.log('PASS '+theme+' '+width+'px planner flow, direct Today edit and screen-history Back');
  await ctx.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
