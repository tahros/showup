// Isolated fixture and mocked GPS/providers: never accesses real location.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const origin=process.env.DAY_REVIEW_ORIGIN||'http://127.0.0.1:'+(process.env.PW_PORT||8858)+'/',out=process.env.QA_DIR||'../day-review-context-qa';fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
 // Layout/consent checks require reduced motion from navigation: MOTION_OK is
 // captured at boot. Switching later races rapid theme changes with Chromium
 // view transitions. Motion itself is covered by check-day-review.cjs.
 const p=await b.newPage({viewport:{width:393,height:852},serviceWorkers:'block',reducedMotion:'reduce'}),errors=[],requests=[];p.on('pageerror',e=>errors.push(e.message));let fail=false;
 await p.route('**/*',async r=>{if(r.request().url().endsWith('/functions/v1/day-context')){requests.push(r.request().postDataJSON());return r.fulfill({status:fail?503:200,contentType:'application/json',body:JSON.stringify({location:'Princeton, NJ',weather:{c:18,symbol:'clearsky_day',at:Date.now()},capturedAt:Date.now()})});}return r.request().url().startsWith(origin)?r.continue():r.abort();});
 await p.goto(origin);await p.waitForTimeout(3000);await p.emulateMedia({reducedMotion:'reduce'});
 await p.evaluate(()=>{
  document.querySelector('#onb')?.remove();todayISO='2026-10-07';checkDate=()=>false;loadedOK=true;
  DB={days:{},settings:{unit:'lb',name:'Sungjee Yoo',onboarded:true,theme:'light',bar:'light'}};SEED=deriveAll();
  DB.plan={d:todayISO,items:[{ex:'Deadlift',lines:[{w:135/LB,reps:[8],qualifier:'warm-up'},{w:235/LB,reps:[3,3,3]}]},{ex:'Bent-Over Row',lines:[{w:155/LB,reps:[12,12,12,12]}]},{ex:'Pull Up',lines:[{w:25/LB,reps:[6,6,6],bw:true}]},{ex:'Single-Arm Dumbbell Row',lines:[{w:60/LB,reps:[8,8,8,8]}]},{ex:'EZ Bar Curl',lines:[{w:65/LB,reps:[14,14,14]}]}]};plCapture();lift={ex:'Deadlift',part:'Back'};
  plLog({part:'Back',ex:'Deadlift',w:135/LB,reps:[8],at:Date.now()-3600000});[4,3,3].forEach(r=>plLog({part:'Back',ex:'Deadlift',w:235/LB,reps:[r],at:Date.now()-3500000}));
  lift.ex='Bent-Over Row';[12,12,12,12].forEach(r=>plLog({part:'Back',ex:'Bent-Over Row',w:155/LB,reps:[r],at:Date.now()-3400000}));
  lift={ex:'Run',part:'Run'};plLog({part:'Run',ex:'Run',w:3.3/MI,reps:[],mins:33,secs:0,at:Date.now()-60000});
  DB.days[todayISO].completedAt=Date.now();SEED=deriveAll();view='stats';applyTheme();render();window.geoCalls=0;window.geoDeny=false;
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(ok,no){geoCalls++;geoDeny?no({code:1}):ok({coords:{latitude:40.357124,longitude:-74.667221}});}}});
 });
 assert.equal(await p.evaluate(()=>geoCalls),0);assert.equal(requests.length,0);
 for(const theme of ['light','dark'])for(const width of [320,393,736]){
  await p.setViewportSize({width,height:852});await p.evaluate(theme=>{DB.settings.theme=theme;DB.settings.bar=theme;applyTheme();render();},theme);
  const align=await p.evaluate(()=>{
   const c=document.querySelector('.day-review'),rows=[...c.querySelectorAll('tbody tr')],rect=e=>e.getBoundingClientRect();
   return {warm:c.textContent.includes('warm-up'),overflow:c.scrollWidth>c.clientWidth,
    aligned:rows.every(row=>{const ds=[...row.querySelectorAll('td .dr-weight')];return ds.length<2||Math.abs(rect(ds[0]).y-rect(ds[1]).y)<.5;}),
    padding:rows.filter(r=>r.classList.contains('dr-last-lane')).every(r=>getComputedStyle(r.querySelector('td')).paddingBottom==='12px')&&getComputedStyle(c.querySelector('tbody th')).paddingTop==='12px',
    centered:[...c.querySelectorAll('tbody th')].every(th=>{const a=rect(th),b=rect(th.querySelector('.dr-exercise-label'));return Math.abs((a.top+a.bottom-b.top-b.bottom)/2)<1;}),
    noInnerLines:[...c.querySelectorAll('table td,table th')].every(td=>getComputedStyle(td).borderBottomWidth==='0px')&&[...c.querySelectorAll('.dr-continuation td')].every(td=>getComputedStyle(td).borderTopWidth==='0px'),
    laneGap:[...c.querySelectorAll('.dr-continuation')].every(row=>[...row.querySelectorAll('td')].every((td,i)=>{const prev=row.previousElementSibling.querySelectorAll('td')[i];return rect(td.firstElementChild).top-rect(prev.firstElementChild).bottom>=15.5;})),
    bottomRoom:[...c.querySelectorAll('.dr-last-lane td .dr-value')].every(v=>rect(v.parentElement).bottom-rect(v).bottom>=11.5)};
  });
  assert(!align.warm&&!align.overflow&&align.aligned&&align.padding&&align.centered&&align.noInnerLines&&align.laneGap&&align.bottomRoom,JSON.stringify(align));
  assert.equal(await p.locator('.dr-weight').first().evaluate(e=>getComputedStyle(e).fontSize),width<359?'12px':'13px');
  assert.equal(await p.locator('.dr-rep').first().evaluate(e=>getComputedStyle(e).fontSize),'11px');
 }
 await p.setViewportSize({width:393,height:852});await p.evaluate(()=>{DB.settings.theme='light';DB.settings.bar='light';applyTheme();render();});
 await p.locator('[data-dr-location]').click();await p.locator('[data-cancel]').click();assert.equal(await p.evaluate(()=>geoCalls),0);assert.equal(requests.length,0);
 await p.locator('[data-dr-location]').click();await p.locator('[data-allow]').click();await p.waitForFunction(()=>!!DB.days[todayISO].dayContext?.location);
 assert.deepEqual(requests,[{consent:true,lat:40.36,lon:-74.67}]);assert.equal(await p.locator('.dr-weather').innerText(),'64°F');assert.equal(await p.locator('.dr-weather').getAttribute('aria-label'),'64°F · Clear');assert.equal(await p.locator('.dr-weather svg').count(),1);assert((await p.locator('.dr-parts').innerText()).startsWith('Princeton, NJ · Back'));
 const stored=await p.evaluate(()=>JSON.stringify(DB.days[todayISO].dayContext));assert(!/latitude|longitude|40\.36|74\.67/.test(stored));
 assert(JSON.parse(stored).capturedAt>0,'capture metadata is preserved');
 assert.equal(await p.locator('.dr-context-status').innerText(),'');
 assert.equal(await p.locator('.dr-context-status').evaluate(e=>getComputedStyle(e).display),'none');
 assert(!(await p.locator('.day-review').innerText()).includes('Captured '));
 await p.locator('.day-review').screenshot({path:out+'/aligned-context-app.png',style:'header,nav,#calReturn,#progressSwitch,#ptr{visibility:hidden!important}'});
 await p.evaluate(()=>{
  const text=CanvasRenderingContext2D.prototype.fillText;window.drawn=[];
  CanvasRenderingContext2D.prototype.fillText=function(s,x,y,...rest){drawn.push({s:String(s),x,y,font:this.font,align:this.textAlign});return text.call(this,s,x,y,...rest);};
 });
 for(const theme of ['light','dark']){
  await p.evaluate(theme=>{DB.settings.theme=theme;DB.settings.bar=theme;applyTheme();window.drawn=[];},theme);
  await p.evaluate(()=>shareDayReview(document.querySelector('[data-dr-share]')));
  const pic=await p.evaluate(()=>_repCv.cv.toDataURL());fs.writeFileSync(out+'/aligned-context-share-'+theme+'.png',Buffer.from(pic.split(',')[1],'base64'));
  const texts=await p.evaluate(()=>drawn);assert(!texts.some(t=>t.s==='warm-up'));assert(texts.some(t=>t.s==='64°F'));assert(!texts.some(t=>t.s.includes('Clear')));assert(texts.some(t=>t.s.startsWith('Princeton, NJ')));
  assert(!texts.some(t=>/Captured|Conditions estimate/.test(t.s)));assert(texts.some(t=>t.s.includes('CC BY 4.0')),'source credit retained');
  assert(texts.some(t=>t.s==='Sungjee')&&!texts.some(t=>t.s==='Sungjee Yoo'),'first name only');
  assert(texts.some(t=>t.s==='DAY'),'day label');
  const labels=['minutes','sets','exercises','miles run'].map(s=>texts.find(t=>t.s===s));
  assert(labels.every(t=>t&&t.align==='center'));assert.deepEqual(labels.map(t=>t.x),[88,216,344,472]);
  assert(labels[0].y>texts.find(t=>t.s==='Run').y,'summary follows exercise list');
  assert(texts.filter(t=>['135','235','155'].includes(t.s)).every(t=>t.font.includes('600')),'bold weights');
  for(const load of ['135','235','155']){const pair=texts.filter(t=>t.s===load);assert.equal(pair.length,2);assert.equal(pair[0].y,pair[1].y);}
  await p.locator('#repClose').click();
 }
 await p.evaluate(()=>{window.geoDeny=true;});await p.locator('[data-dr-location]').click();await p.locator('[data-allow]').click();await p.waitForFunction(()=>document.querySelector('.dr-context-status').textContent.includes('wasn’t allowed'));assert.equal(requests.length,1);assert.equal(await p.evaluate(()=>JSON.stringify(DB.days[todayISO].dayContext)),stored);
 await p.evaluate(()=>{window.geoDeny=false;});fail=true;await p.locator('[data-dr-location]').click();await p.locator('[data-allow]').click();await p.waitForFunction(()=>document.querySelector('.dr-context-status').textContent.includes('unavailable'));assert.equal(await p.evaluate(()=>JSON.stringify(DB.days[todayISO].dayContext)),stored);
 await p.locator('[data-dr-context-remove]').click();assert.equal(await p.locator('.dr-weather').count(),0);assert(await p.evaluate(()=>DB.days[todayISO].dayContext.removed));await p.evaluate(()=>render());assert.equal(await p.locator('.dr-weather').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS light/dark three widths, warmup hidden, matched load baselines, equal padding, consent/cancel/no silent GPS, coarse request only, persisted snapshot, share, denial/offline preserve data, removal');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
