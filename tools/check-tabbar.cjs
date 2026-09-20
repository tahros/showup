/* check-tabbar.cjs -- v4.6.79: THE CHROME ABOVE THE CONTENT DOES NOT MOVE.
   The planner's four tabs are one bar that stays put while the thing under it
   changes. The dates page had given that bar its own margins -- 4px above,
   6px less below -- so every tap slid the bar down and pulled the content up,
   in opposite directions, and the top margin collapsed through the workspace
   so the whole page went with it. jsdom cannot see any of that; this opens the
   real app at a phone width, walks Preferences -> Dates -> Edit -> Done and
   back, and asserts the step bar's top and bottom, and the first thing under
   it, land on the same pixel every time.
   Runs like the other check-*.cjs: serve the repo on 127.0.0.1:8784 first. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});
  const p=await b.newPage({serviceWorkers:'block'});
  const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());
  await p.goto('http://127.0.0.1:8784/');
  let bad=0;
  const seed=()=>p.evaluate(()=>{DB={days:{},settings:{onboarded:true,unit:'lb',mascotMotion:'still'},plan:null,week:null,planTracking:null};todayISO='2026-09-19';checkDate=()=>false;document.querySelector('#onb')?.remove();
    const P={'2026-09-21':"Dumbbell Shoulder Press\n  35 lb \u00d7 10 8\n  60 lb \u00d7 8 8 8 8\nLateral Raise\n  40 lb \u00d7 12 12 10 10",'2026-09-22':"Bent-Over Row\n  185 lb \u00d7 8 8 8 8"};
    const week={};for(const [d,t] of Object.entries(P))week[d]={...planItemsFrom(pwRead(t)),raw:t,title:''};
    DB.week={from:'2026-09-21',to:'2026-09-22',days:week,raw:'',at:Date.now()};
    DB.settings.plannerPreferences={frequency:5,mode:'sets',minutes:45,minSets:15,maxSets:25,emphasis:{Chest:1},avoid:[],split:'auto'};
    SEED=deriveAll();if(typeof pwState!=='undefined'&&pwState){pw().book={};delete pw().journey;}view='today';pwOpen('2026-09-21');
    const s=pw();s.dates=Object.keys(P);s.dates.forEach(d=>pwDay(d));s.active='2026-09-21';s.month='2026-09-01';pfAnchor();});
  const visit=async page=>{
    await p.evaluate(pg=>{if(pg==='prefs')pfState().prefs=pfPrefs();pfNavigate(pg);},page);
    await p.waitForTimeout(140);
    return p.evaluate(()=>{
      const box=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return [Math.round(r.top),Math.round(r.bottom)];};
      const steps=box('.pf-steps');
      const under=box('.pf-workspace .card, .pf-workspace .pf-strip, .pf-workspace .pf-day, .pf-workspace .pw-message');
      return {page:pfState().page,stepsTop:steps&&steps[0],stepsBottom:steps&&steps[1],underTop:under&&under[0],
        wsTop:Math.round(document.querySelector('.pf-workspace').getBoundingClientRect().top)};
    });
  };
  for(const width of [320,390,430]){
    await p.setViewportSize({width,height:874});
    await seed();
    const seen=[];
    for(const pg of ['prefs','dates','edit','done','dates','edit','prefs']) seen.push(await visit(pg));
    const key=x=>[x.stepsTop,x.stepsBottom,x.wsTop].join('/');
    const keys=[...new Set(seen.map(key))];
    // 'done' has no card under the bar, so underTop is compared across the rest
    const unders=[...new Set(seen.filter(x=>x.underTop!=null).map(x=>x.underTop))];
    const ok=keys.length===1&&unders.length===1;
    if(!ok)bad++;
    console.log(`${ok?'OK  ':'FAIL'} ${width}px  bar=${keys.join(' | ')}  firstUnder=${unders.join(' | ')}`);
    if(!ok)for(const s of seen)console.log('        '+JSON.stringify(s));
  }
  console.log(bad||errors.length?`FAIL ${bad} widths, errors: ${JSON.stringify(errors)}`:'PASS the tab bar and the content under it hold one position across Preferences, Dates, Edit and Done');
  await b.close(); process.exit(bad||errors.length?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
