// Isolated real-browser QA. Uses only synthetic data; blocks every nonlocal request.
// Usage: node tools/planner-browser-check.js URL OUTPUT_DIR [CHROMIUM_EXE]
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const url=process.argv[2]||'http://127.0.0.1:8913/',out=process.argv[3];if(!out)throw Error('Provide an output directory');
const routine='Squat\n  135 lb × 8 (warm-up)\n  205 lb × 8 8 8 8\n\nRomanian Deadlift\n  165 lb × 10 10 10\n\nDumbbell Lunge\n  35 lb × 10 10 10\n\nStanding Calf Raise\n  by feel × 15 15 15 15\n\nHanging Leg Raise\n  BW × 12 10 10';
(async()=>{
  fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,...(process.argv[4]?{executablePath:process.argv[4]}:{})});
  const errors=[];
  for(const theme of ['light','dark'])for(const width of [320,393,430,1000]){
    const ctx=await browser.newContext({viewport:{width,height:852},colorScheme:theme,reducedMotion:width===393?'no-preference':'reduce',serviceWorkers:'block'});
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
      await page.waitForTimeout(400);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      assert(!overflow,`${theme} ${width} ${name} overflows`);
      if(width===393)await page.screenshot({path:path.join(out,`${theme}-${name}.png`),fullPage:true});
    }
    await capture('today');await page.locator('[data-pw="open-date"]').first().click();await capture('empty-editor');
    await page.locator('[data-pw="dates-toggle"]').click();await capture('dates');
    const done=await page.locator('[data-pw="dates-done"]').boundingBox(),nav=await page.locator('#nav').boundingBox();assert(done.y>=0&&done.y+done.height<nav.y,'calendar CTA clears tab bar');
    await page.locator('[data-pw="dates-done"]').click();await page.locator('[data-pw="part"][data-part="Legs"]').click();await page.locator('[data-pw="part"][data-part="Sixpack"]').click();await capture('focus');
    const widths=await page.locator('.pw-parts .pw-btn').evaluateAll(bs=>bs.map(b=>b.getBoundingClientRect().width));assert(Math.max(...widths)-Math.min(...widths)<1,'equal body part widths');
    if(width===393){await page.evaluate(()=>{window.checkedWriter=writerGenerateChecked;writerGenerateChecked=()=>new Promise(()=>{});});await page.locator('[data-pw="generate"]').click();await capture('writing');assert.equal(await page.locator('.writing .wsq').count(),56);await page.locator('[data-pw="cancel"]').click();await page.evaluate(()=>{writerGenerateChecked=window.checkedWriter;});}
    await page.locator('[data-pw="paste"]').first().click();await page.locator('[data-pw-field="pasteText"]').fill(routine);await capture('paste');
    await page.locator('[data-pw="text-select"]').click();assert(await page.locator('[data-pw-field="pasteText"]').evaluate(el=>el.selectionEnd===el.value.length&&el.selectionStart===0));
    await page.locator('[data-pw="readpaste"]').click();await capture('candidate');await page.locator('[data-pw="apply"]').click();await capture('editor');
    assert.equal(await page.locator('.pw-editor-head h1').innerText(),'Edit your plan');
    await page.locator('[data-pw="lock"]').first().click();
    const grip=page.locator('[data-pw-grip="0"]');await grip.scrollIntoViewIfNeeded();
    const gb=await grip.boundingBox(),target=await page.locator('[data-pw-row="1"]').boundingBox();
    await page.mouse.move(gb.x+gb.width/2,gb.y+gb.height/2);await page.mouse.down();await page.waitForTimeout(200);
    await page.mouse.move(gb.x+gb.width/2,target.y+target.height-5,{steps:8});await page.waitForTimeout(100);await page.mouse.up();
    assert(await page.evaluate(()=>pwDay(pw().active).rows[0].ex==='Romanian Deadlift'&&pwDay(pw().active).locks.includes(1)),'drag order and lock');
    await page.locator('[data-pw="undo"]').click();assert(await page.evaluate(()=>pwDay(pw().active).rows[0].ex==='Squat'));
    if(width===393){
      // Real touch input, including cancellation; no synthetic click shortcut.
      const cdp=await ctx.newCDPSession(page),handle=page.locator('[data-pw-grip="0"]');await handle.scrollIntoViewIfNeeded();
      const p=await handle.boundingBox(),r=await page.locator('[data-pw-row="1"]').boundingBox(),x=p.x+22,y=p.y+22;
      for(const cancel of [true,false]){
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await page.waitForTimeout(220);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:r.y+r.height-5}]});await page.waitForTimeout(120);
        await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
        assert(await page.evaluate(cancel=>pwDay(pw().active).rows[0].ex===(cancel?'Squat':'Romanian Deadlift'),cancel),'touch drag / cancel');
      }
      await page.locator('[data-pw="undo"]').click();await cdp.detach();
    }
    await page.locator('[data-pw="adjust"]').click();await capture('adjust');await page.locator('[data-pw="edit"]').click();await capture('ready-to-save');
    const save=await page.locator('[data-pw="save"]').boundingBox(),bar=await page.locator('#nav').boundingBox();assert(save.y+save.height<bar.y,'Save clears tab bar');
    await page.locator('[data-pw="save"]').click();await capture('saved');
    const sets=await page.evaluate(()=>DB.week.days['2026-09-10'].items.reduce((n,i)=>n+i.lines.reduce((n,l)=>n+l.reps.length,0),0));assert.equal(sets,18);
    await page.evaluate(()=>{day(todayISO).w=[{part:'Chest',ex:'Barbell Bench Press',w:70,reps:[8,8],at:1}];day(todayISO).doneAll=true;SEED=deriveAll();render();});await capture('completed');
    assert(await page.locator('[data-replayday]').count());assert(await page.getByText('Plan ahead',{exact:true}).count());
    await page.evaluate(()=>{for(const d of ['2026-09-11','2026-09-12'])DB.week.days[d]={...pwCopy(DB.week.days[todayISO]),d};render();});
    await capture('plan-ahead');await page.emulateMedia({reducedMotion:'no-preference'});
    const fold=page.locator('.pw-fold');assert.equal((await fold.boundingBox()).height,0);
    await page.locator('[data-pw="upcoming"]').click();await page.waitForTimeout(70);const midway=(await fold.boundingBox()).height;
    await page.waitForTimeout(320);const full=(await fold.boundingBox()).height;assert(midway>0&&midway<full,'disclosure animates between endpoints');
    assert.equal(await page.locator('[data-pw="upcoming"]').getAttribute('aria-expanded'),'true');await capture('coming-up');
    await page.locator('[data-pw="upcoming"]').click();await page.waitForTimeout(320);assert.equal((await fold.boundingBox()).height,0);
    console.log(`PASS real browser ${theme} ${width}px: one editor, inline dates/focus/paste/adjust, direct save; completed Today`);await ctx.close();
  }
  await browser.close();assert.deepEqual(errors,[]);console.log('PASS no browser exceptions or horizontal overflow');
})().catch(e=>{console.error(e);process.exit(1)});
