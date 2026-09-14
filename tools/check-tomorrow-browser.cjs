const {chromium}=require('playwright'),assert=require('assert');
(async()=>{
 const b=await chromium.launch({executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe',headless:true});
 for(const theme of ['light','dark'])for(const width of [320,393,430]){
  const p=await b.newPage({viewport:{width,height:852}});
  await p.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:8784'?r.continue():r.abort());
  await p.goto('http://127.0.0.1:8784/');
  await p.evaluate(theme=>{todayISO='2026-09-14';checkDate=()=>false;DB={days:{'2026-09-14':{w:[{part:'Legs',ex:'Squat',w:90,reps:[8],at:1}],doneAll:true}},settings:{unit:'lb',onboarded:true,theme}};DB.week={days:{'2026-09-15':planItemsFrom(pwRead('Deadlift\n135 lb × 8 8 8\nEZ Bar Curl\n55 lb × 12 12 12'))}};view='today';lift={};document.querySelector('#onb')?.remove();applyTheme();render();},theme);
  await p.waitForTimeout(1100);
  const card=p.locator('.pw-future');
  assert((await card.locator('summary').textContent()).includes('Back + Biceps'));
  await card.locator('summary').click();await p.waitForTimeout(400);
  assert(await card.evaluate(e=>e.open));
  assert(await p.evaluate(()=>{const row=document.querySelector('.pw-future-actions'),rr=row.getBoundingClientRect(),buttons=[...row.querySelectorAll('button')].map(e=>e.getBoundingClientRect());return buttons.length===2&&buttons.every(r=>Math.abs((r.top+r.bottom)/2-(rr.top+rr.bottom)/2)<1)&&Math.abs(buttons[0].width-buttons[1].width)<1&&buttons[0].left-rr.left>=15&&rr.right-buttons[1].right>=15&&document.documentElement.scrollWidth<=innerWidth+1;}));
  if(process.argv[2])await p.screenshot({path:process.argv[2]+'/'+theme+'-'+width+'.png',fullPage:true});
  await card.locator('summary').click();await p.waitForTimeout(400);assert(!(await card.evaluate(e=>e.open)));
  console.log('PASS tomorrow focus, centered action row and disclosure '+theme+' '+width);await p.close();
 }
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
