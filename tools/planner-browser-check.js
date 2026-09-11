// Isolated real-browser QA. Uses only synthetic data; blocks every nonlocal request.
// Usage: node tools/planner-browser-check.js URL OUTPUT_DIR [CHROMIUM_EXE]
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const url=process.argv[2]||'http://127.0.0.1:8913/',out=process.argv[3];if(!out)throw Error('Provide an output directory');
const routine='Squat\n  135 lb × 8 (warm-up)\n  205 lb × 8 8 8 8\n\nRomanian Deadlift\n  165 lb × 10 10 10\n\nDumbbell Lunge\n  35 lb × 10 10 10\n\nStanding Calf Raise\n  by feel × 15 15 15 15\n\nHanging Leg Raise\n  BW × 12 10 10';
(async()=>{
  fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,...(process.argv[4]?{executablePath:process.argv[4]}:{})});
  const errors=[];
  for(const theme of ['light','dark'])for(const width of [320,393,430,1000]){
    const ctx=await browser.newContext({viewport:{width,height:852},colorScheme:theme,reducedMotion:'reduce',serviceWorkers:'block'});
    await ctx.route('**/*',r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():r.abort());
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
    await page.evaluate(theme=>{
      DB.settings.onboarded=true;DB.settings.theme=theme;DB.settings.skin='minimal';DB.settings.unit='lb';DB.settings.myParts=['Legs','Chest','Back','Shoulder','Biceps','Triceps','Sixpack'];
      DB.days={};DB.plan=null;DB.week=null;todayISO='2026-09-10';checkDate=()=>false;
      DB.days['2026-09-08']={w:[{part:'Legs',ex:'Squat',w:90,reps:[8,8,8],at:1}],upd:1};
      SEED=deriveAll();view='today';lift.plan=null;document.getElementById('onb')?.remove();applyTheme();render();
    },theme);
    async function capture(name){
      await page.evaluate(()=>window.scrollTo(0,0));
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      assert(!overflow,`${theme} ${width} ${name} overflows`);
      if(width===393)await page.screenshot({path:path.join(out,`${theme}-${name}.png`),fullPage:true});
    }
    await capture('today');await page.locator('[data-pw="open-date"]').first().click();await capture('dates');
    await page.locator('[data-pw="focus"]').click();await page.locator('[data-pw="part"][data-part="Legs"]').click();await page.locator('[data-pw="part"][data-part="Sixpack"]').click();await capture('focus');
    await page.locator('[data-pw="workspace"]').click();await page.locator('[data-pw="paste"]').first().click();await page.locator('[data-pw-field="pasteText"]').fill(routine);await capture('paste');
    await page.locator('[data-pw="readpaste"]').click();await capture('candidate');await page.locator('[data-pw="apply"]').click();await capture('editor');
    await page.locator('[data-pw="adjust"]').click();await capture('adjust');await page.locator('[data-pw="edit"]').click();await page.locator('[data-pw="review"]').click();await capture('review');
    await page.locator('[data-pw="save"]').click();await capture('saved');
    const sets=await page.evaluate(()=>DB.week.days['2026-09-10'].items.reduce((n,i)=>n+i.lines.reduce((n,l)=>n+l.reps.length,0),0));assert.equal(sets,18);
    await page.evaluate(()=>{day(todayISO).w=[{part:'Chest',ex:'Barbell Bench Press',w:70,reps:[8,8],at:1}];day(todayISO).doneAll=true;SEED=deriveAll();render();});await capture('completed');
    assert(await page.locator('[data-replayday]').count());assert(await page.getByText('Plan ahead',{exact:true}).count());
    console.log(`PASS real browser ${theme} ${width}px: dates → focus → paste → edit → adjust → review → save; completed Today`);await ctx.close();
  }
  await browser.close();assert.deepEqual(errors,[]);console.log('PASS no browser exceptions or horizontal overflow');
})().catch(e=>{console.error(e);process.exit(1)});
