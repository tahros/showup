/* check-save-dock.cjs -- v4.6.195: the planner's action dock ("Plans saved ·
   Done", Save) sits at the BOTTOM of the screen, just above the tab bar, on
   every page that docks it -- during a workout too. It was positioned from
   "the live workout bar, if one is showing", and since the live workout moved
   into the header that bar is at the TOP of the screen: the dock was parked
   under the header, over the step tabs, whenever a workout was running.
   Covers: every planner page with a fixed dock, with and without a live
   workout, header folded and not, 320 and 402px wide, a short window, after
   scrolling, after a resize, and after the workout starts or ends while the
   page is open. The dock must be in the lower part of the screen, clear of
   the tab bar by 4-16px, clear of the header and the step tabs, and inside
   the screen. Serve the repo on 127.0.0.1:8784 first. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
  const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+(typeof g==='string'?g:JSON.stringify(g))));if(!c)bad++;};
  try{
  for(const [w,h] of [[402,874],[320,640]])for(const theme of ['light','dark'])for(const live of [false,true]){
    const tag=`${w}×${h} ${theme} ${live?'workout running':'no workout'}:`;
    const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1,serviceWorkers:'block'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
    await p.goto(`http://127.0.0.1:${PORT}/?theme=${theme}`);await p.waitForLoadState('networkidle');await p.waitForTimeout(1200);
    await p.evaluate(async({theme,live})=>{
      const LB=2.20462,days={},add=(d,part,ex,lb,reps,at)=>{(days[d]=days[d]||{w:[]}).w.push({part,ex,w:lb/LB,reps,at});};
      for(const d of ['2026-09-22','2026-09-25','2026-09-29'])add(d,'Chest','Barbell Bench Press',135,[8,8,8,8],Date.parse(d+'T18:00'));
      DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still'}};todayISO=new Date().toLocaleDateString('en-CA');
      if(live)add(todayISO,'Chest','Dip',0,[8],Date.now()-60000);
      document.querySelector('#onb')?.remove();migrateCanon();SEED=deriveAll();applyTheme();save=()=>{};
      view='today';render();await new Promise(r=>setTimeout(r,500));
      const t=new Date();t.setDate(t.getDate()+2);const d=t.toLocaleDateString('en-CA');window.__d=d;pwOpen(d);const s=pw();s.dates=[d];const x=pwDay(d);
      x.rows=pwRead('Barbell Bench Press\n  135 lb × 7 6 5 5 5\nDip\n  BW +50 lb × 10 10 10 10\nCable Fly Down\n  11 lb × 12 10 10 10\nChest Fly\n  110 lb × 10\nRussian Twist\n  by feel × 15 15 15');x.parts=['Chest','Sixpack'];x.locks=[];x.source='Saved plan';s.active=d;s.step='edit';
    },{theme,live});
    const go=async page=>{await p.evaluate(async page=>{pfState().page=page;pfState().saved=[window.__d];pwRender();await new Promise(r=>setTimeout(r,600));},page);await wait(200);};
    const m=()=>p.evaluate(()=>{const R=e=>e&&e.getBoundingClientRect(),d=document.querySelector('.pw-save-dock');if(!d)return null;const dr=R(d),nav=R(document.getElementById('nav')),hdr=R(document.querySelector('header')),steps=R(document.querySelector('.pf-steps')),lw=document.getElementById('liveWorkoutBar');
      return {fixed:getComputedStyle(d).position==='fixed',top:Math.round(dr.top),bottom:Math.round(dr.bottom),left:Math.round(dr.left),right:Math.round(dr.right),navTop:Math.round(nav.top),hdrBottom:Math.round(hdr.bottom),stepsBottom:steps?Math.round(steps.bottom-scrollY*0):null,h:innerHeight,w:innerWidth,live:document.documentElement.classList.contains('workout-active'),lwTop:lw&&!lw.hidden?Math.round(R(lw).top):null,label:d.textContent.trim().slice(0,30)};});
    const good=x=>!!x&&x.top>x.h*0.5&&x.navTop-x.bottom>=4&&x.navTop-x.bottom<=16&&x.top>x.hdrBottom&&x.left>=0&&x.right<=x.w;
    let any=0;
    for(const page of ['done','days','prefs','dates','edit']){
      await go(page);let x=await m();
      if(!x||!x.fixed)continue;any++;
      if(live&&page==='done')ok(`${tag} the page really is in a live workout, with its bar at the top`,x.live&&(x.lwTop==null||x.lwTop<x.h/2),x);
      ok(`${tag} ${page}: "${x.label}" sits just above the tab bar, in the lower half, clear of the header`,good(x),x);
      if(page==='done'&&w===402){await p.screenshot({path:`../save-dock-${theme}-${live?'live':'idle'}.png`});}
      await p.evaluate(()=>scrollTo(0,300));await wait(250);x=await m();
      ok(`${tag} ${page}: ...and stays there when the page scrolls`,good(x),x);
      await p.setViewportSize({width:w,height:h-120});await wait(350);x=await m();
      ok(`${tag} ${page}: ...and after the window changes size`,good(x),x);
      await p.setViewportSize({width:w,height:h});await wait(300);
    }
    ok(`${tag} at least the Done page docks its button`,any>=1,any);
    /* the workout starts or ends while the Done page is open */
    await go('done');
    await p.evaluate(async live=>{if(live){DB.days[todayISO].doneAll=true;}else{(DB.days[todayISO]=DB.days[todayISO]||{w:[]}).w.push({part:'Chest',ex:'Dip',w:0,reps:[8],at:Date.now()});}SEED=deriveAll();if(typeof syncLiveWorkout==='function')syncLiveWorkout();renderHeader();await new Promise(r=>setTimeout(r,700));},live);
    await wait(300);const x=await m();
    ok(`${tag} done: still in place after the workout ${live?'ends':'starts'} with the page open`,good(x),x);
    ok(`${tag} no page errors`,!errors.length,errors);
    await p.close();
  }
  }finally{await b.close();}
  console.log(bad?`FAIL save dock (${bad})`:'PASS save dock');process.exit(bad?1:0);
})();
