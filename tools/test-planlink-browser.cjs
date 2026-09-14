// Synthetic, isolated mobile UI and reload coverage. No real account access.
const {chromium}=require('playwright'),fs=require('fs'),assert=require('assert'),path=require('path');
const url=process.argv[2]||'http://127.0.0.1:8773/',out=process.argv[3];
if(!out)throw Error('Provide a screenshot directory');
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,...(process.argv[4]?{executablePath:process.argv[4]}:{})});
  const errors=[];
  for(const theme of ['light','dark'])for(const width of [320,393,430]){
    const ctx=await browser.newContext({viewport:{width,height:852},colorScheme:theme,serviceWorkers:'block'});
    await ctx.route('**/*',r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():r.abort());
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
    await page.waitForFunction(()=>typeof render==='function'&&typeof plLog==='function');
    await page.evaluate(theme=>{
      DB={days:{},settings:{name:'Test User',sex:'M',onboarded:true,theme,unit:'lb',mascotMotion:'off',myParts:['Legs','Sixpack']}};
      todayISO='2026-09-13';checkDate=()=>false;lift={ex:'Squat',part:'Legs',weight:60};view='lift';
      DB.days['2026-09-10']={w:[{part:'Legs',ex:'Squat',w:90,reps:[8],at:1}],doneAll:true,upd:1};
      planSave([{ex:'Squat',lines:[{w:60,reps:[8],qual:'warm-up'},{w:100,reps:[8,8]}]}],'','',todayISO);
      SEED=deriveAll();document.getElementById('onb')?.remove();applyTheme();render();
    },theme);
    await page.locator('.pl-details summary').click();
    await page.locator('[data-link-slot="2"]').click();
    assert.equal(await page.evaluate(()=>day(todayISO).w.length),0);
    await page.locator('#wv').fill('210');
    await page.evaluate(()=>repRulerTo(6,false));
    await page.locator('#addrep').click();
    assert.equal(await page.evaluate(()=>day(todayISO).w[0].planRef.target.ordinal),2);
    await page.locator('.pl-details summary').click();
    await page.locator('.plan-link').scrollIntoViewIfNeeded();
    await page.evaluate(()=>window.scrollBy(0,document.querySelector('.plan-link').getBoundingClientRect().top-150));
    await page.waitForTimeout(2200); // let the real saved-set toast finish
    const geometry=await page.evaluate(()=>{
      const c=document.querySelector('.plan-link'),rect=c.getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth>innerWidth+1,
        clipped:[...c.querySelectorAll('.pl-result span')].some(e=>e.scrollWidth>e.clientWidth+1),
        width:rect.width,buttons:[...c.querySelectorAll('.pl-result,.pl-extra')].map(e=>e.getBoundingClientRect().height)};
    });
    assert(!geometry.overflow&&!geometry.clipped,JSON.stringify({theme,width,geometry}));
    assert(geometry.buttons.every(h=>h>=44));
    await page.locator('.plan-link').screenshot({path:path.join(out,theme+'-'+width+'.png')});
    await page.evaluate(()=>{localStorage.setItem(KEY,JSON.stringify(DB));stashWhere();});
    await page.reload();await page.waitForFunction(()=>typeof plBasis==='function');
    const restored=await page.evaluate(()=>{
      todayISO='2026-09-13';checkDate=()=>false;
      return {id:DB.days[todayISO]?.w[0]?.planRef?.setId,basis:plBasis(todayISO)?.targets.length,name:DB.settings.name,sex:DB.settings.sex};
    });
    assert(restored.id&&restored.basis===3&&restored.name==='Test User'&&restored.sex==='M',JSON.stringify(restored));
    console.log('PASS '+theme+' '+width+'px; target selection, actual log, 44px controls, no overflow, reload + profile');
    await ctx.close();
  }
  assert.equal(errors.length,0,errors.join('\n'));
  const offline=await browser.newContext({viewport:{width:393,height:852},serviceWorkers:'allow'});
  await offline.route('**/*',r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():r.abort());
  const page=await offline.newPage();await page.goto(url);
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await offline.setOffline(true);await page.reload();
  await page.waitForFunction(()=>typeof plLog==='function'&&typeof render==='function');
  assert(await page.evaluate(()=>!!document.getElementById('view')));
  console.log('PASS offline reload serves the new linkage module from the PWA cache');
  await offline.close();await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
