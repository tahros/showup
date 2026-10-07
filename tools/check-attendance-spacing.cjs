/* Real phone proportions: compact whitespace, unchanged marks, clear controls.
   PW_PORT=8784; ATTENDANCE_ORIGIN optionally points at the deployed app. */
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const origin=process.env.ATTENDANCE_ORIGIN||'http://127.0.0.1:'+(process.env.PW_PORT||8784)+'/';
(async()=>{const browser=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
 for(const theme of ['light','dark']){
  const p=await browser.newPage({viewport:{width:393,height:852},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());await p.goto(origin);
  await p.evaluate(theme=>{document.querySelector('#onb')?.remove();todayISO='2026-10-07';checkDate=()=>false;DB.settings={...DB.settings,onboarded:true,name:'Sungjee Yoo',theme,bar:theme};DB.days={};for(let t=Date.UTC(2021,11,1),i=0;t<=Date.UTC(2026,9,7);t+=86400000,i++)if(i%7<4)DB.days[new Date(t).toISOString().slice(0,10)]={doneAll:true,w:[{part:i%2?'Shoulder':'Legs',ex:'Squat',w:50,reps:[8]}]};SEED=deriveAll();view='stats';applyTheme();render();document.documentElement.style.setProperty('--bar-top','56px');document.documentElement.style.setProperty('--bar-bot','22px');},theme);
  await p.waitForTimeout(4000);await p.evaluate(()=>{window.beforeSpacing=JSON.stringify(DB);const c=document.querySelector('.attendance-card');heatReplay.play(c);heatReplay.finish();});
  for(const width of [393,430,320]){
   await p.setViewportSize({width,height:852});await p.waitForTimeout(200);
   for(const part of ['All workouts','Shoulder']){
    await p.evaluate(part=>document.querySelector(`[data-attendance-part="${part}"]`).click(),part);await p.waitForTimeout(350);
    // Re-align after the browser's scroll anchoring settles on the shorter card.
    for(let i=0;i<2;i++){await p.evaluate(()=>{const card=document.querySelector('.attendance-card'),bottom=document.querySelector('header').getBoundingClientRect().bottom;scrollBy({top:card.getBoundingClientRect().top-bottom-8,behavior:'instant'});});await p.waitForTimeout(100);}
    await p.waitForTimeout(1000);
    const result=await p.evaluate(()=>{const c=document.querySelector('.attendance-card'),box=s=>c.querySelector(s).getBoundingClientRect(),comp=box('.at-composition'),story=box('.at-story'),over=box('.at-overview'),rail=box('.at-parts'),actions=box('.at-actions'),nav=document.querySelector('nav').getBoundingClientRect(),M=c._attendance.M,G=attendanceView.geometry(M,comp.width,comp.height);
     const marks=[...c.querySelectorAll('.at-mini')].map(e=>e.getBoundingClientRect());
     return {opacity:getComputedStyle(c).opacity,reserve:G.reserve,height:comp.height,graph:over.height,railGap:story.top-rail.bottom,headingGap:over.top-story.bottom,navGap:nav.top-actions.bottom,tap:box('.heat-share').height,contained:marks.every(r=>r.top>=over.top&&r.bottom<=over.bottom&&r.left>=over.left-.1&&r.right<=over.right+.1),aligned:c._attendance.mini.every(([el,d])=>{const r=el.getBoundingClientRect(),g=G.overview(d);return Math.abs(r.left-comp.left-g.x)<.1&&Math.abs(r.top-comp.top-g.y)<.1;}),overflow:document.documentElement.scrollWidth>innerWidth};});
    assert.equal(result.opacity,'1','card must actually be visible');assert.equal(result.reserve,84);assert.equal(result.height,414);assert.equal(result.graph,330,'do not shrink the calendar');assert(Math.abs(result.railGap-6)<.1);assert(result.headingGap>=7,'filtered count must not overlap year headings');assert(result.navGap>=4,'Replay/Share must clear the tab bar: '+JSON.stringify({theme,width,part,result}));assert(result.tap>=44);assert(result.contained&&result.aligned&&!result.overflow,'all dates stay inside and aligned with replay geometry');
    if(process.env.QA_DIR){fs.mkdirSync(process.env.QA_DIR,{recursive:true});await p.screenshot({path:process.env.QA_DIR+'/spacing-'+theme+'-'+width+'-'+(part==='All workouts'?'all':'shoulder')+'.png'});}
   }
  }
  assert.equal(await p.evaluate(()=>JSON.stringify(DB)),await p.evaluate(()=>beforeSpacing),'saved history stays untouched');assert.deepEqual(errors,[]);console.log('PASS '+theme+': compact All/Shoulder, 320/393/430px, unchanged 330px graph, canvas/DOM alignment, 44px actions clear nav');await p.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
