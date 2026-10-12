// v4.6.277: first-run tips -- three nudges for a new user, each once, each at its moment:
// the exercise list, the set screen, then Finish after the first set. Existing users never see them;
// Settings -> Show tips again brings them back.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,SHOT=process.env.SHOT,BASE=`http://127.0.0.1:${PORT}/`;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
try{for(const [w,h] of [[402,874],[320,640]])for(const theme of ['light','dark']){if(w===320&&theme==='dark')continue;const tag=`${theme} ${w}:`;
 const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:SHOT?2:1,serviceWorkers:'block',colorScheme:theme});
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
 await p.goto(BASE+'?theme='+theme);await p.waitForTimeout(4500);
 const tip=()=>p.evaluate(()=>{const n=document.querySelector('.tipn'),r=n?.getBoundingClientRect();if(!n)return null;const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
   return {k:n.dataset.tip,text:n.querySelector('.tipt').textContent,ring:!!document.querySelector('.tipr'),inView:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,onTop:!!hit?.closest('.tipn'),bg:getComputedStyle(n).backgroundColor};});
 ok(`${tag} the first run shows no tip`,(await tip())===null);
 await p.click('[data-onbact="local"]');await p.waitForTimeout(700);await p.click('[data-onbact="skip"]');await p.waitForTimeout(900);
 await p.click('[data-onbact="go"][data-onbgo="train"]');await p.waitForTimeout(1600);
 let t=await tip();
 ok(`${tag} the exercise list: "Tap any exercise to log it", in view, on top`,t&&t.k==='ex'&&/Tap any exercise to log it/.test(t.text)&&t.ring&&t.inView&&t.onTop,t);
 if(theme==='light')ok(`${tag} the pill is ink (black on light)`,t&&t.bg==='rgb(27, 27, 27)',t?.bg);else ok(`${tag} the pill is ink (white on dark)`,t&&t.bg==='rgb(251, 251, 251)',t?.bg);
 if(SHOT)await p.screenshot({path:`${SHOT}/tip-ex-${theme}-${w}.png`});
 await p.click('#view [data-ex]');await p.waitForTimeout(1400);
 t=await tip();ok(`${tag} the set screen: swipe for reps, then Add set`,t&&t.k==='set'&&/Swipe for reps/.test(t.text)&&t.inView&&t.onTop,t);
 if(SHOT)await p.screenshot({path:`${SHOT}/tip-set-${theme}-${w}.png`});
 await p.click('#addrep');await p.waitForTimeout(1500);
 t=await tip();ok(`${tag} the celebration plays with no tip over it`,t===null,t);
 await p.evaluate(()=>[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Done'&&x.offsetParent).click());await p.waitForTimeout(1600);
 t=await tip();ok(`${tag} after the first set: "Tap Finish when you’re done" with Got it`,t&&t.k==='fin'&&/Tap Finish/.test(t.text)&&t.inView&&t.onTop,t);
 if(SHOT)await p.screenshot({path:`${SHOT}/tip-fin-${theme}-${w}.png`});
 await p.click('[data-tip-ok]');await p.waitForTimeout(800);
 let s=await p.evaluate(()=>({tip:!!document.querySelector('.tipn,.tipr'),tips:DB.settings.tips}));
 ok(`${tag} Got it: gone, all three Train tips marked done`,!s.tip&&s.tips.ex&&s.tips.set&&s.tips.fin,s);
 await p.evaluate(()=>{const b=document.querySelector('header .hback, #liveWorkoutBack, [aria-label="Back"]');b&&b.click();});await p.waitForTimeout(900);
 await p.evaluate(()=>{liftEnter({});view='lift';render();});await p.waitForTimeout(900);
 ok(`${tag} never again: the exercise list stays clear`,(await tip())===null);
 /* Settings brings them back */
 await p.evaluate(()=>{view='sync';render();});await p.waitForTimeout(600);
 await p.evaluate(()=>document.querySelector('[data-tips-again]').click());await p.waitForTimeout(300);
 await p.evaluate(()=>{liftEnter({});view='lift';render();});await p.waitForTimeout(1200);
 t=await tip();ok(`${tag} Settings → Show tips again: the first tip is back`,t&&t.k==='ex',t);
 ok(`${tag} no page errors`,!errors.length,errors);await ctx.close();}
 /* v4.6.279: a tip for every way in -- Plan, Import, Just looking around */
 for(const theme of ['light','dark']){
  const fresh=async(go,stub)=>{const ctx=await b.newContext({viewport:{width:402,height:874},deviceScaleFactor:SHOT?2:1,serviceWorkers:'block',colorScheme:theme});
   const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
   await p.goto(BASE+'?theme='+theme);await p.waitForTimeout(4500);
   await p.click('[data-onbact="local"]');await p.waitForTimeout(700);await p.click('[data-onbact="skip"]');await p.waitForTimeout(900);
   if(stub)await p.evaluate(()=>{writeSession=async()=>({days:[{date:todayISO,part:'Chest',title:'Chest',text:'Barbell Bench Press\n  95 lb × 8 8 8\n\nCable Fly Down\n  35 lb × 14 14 14'}],reason:null});});
   await p.click(`[data-onbact="go"][data-onbgo="${go}"]`);await p.waitForTimeout(1800);return {ctx,p,errors};};
  const tip=p=>p.evaluate(()=>{const n=document.querySelector('.tipn:not(.out)');if(!n)return null;const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {k:n.dataset.tip,text:n.querySelector('.tipt').textContent,ok:!!n.querySelector('[data-tip-ok]'),inView:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,onTop:!!hit?.closest('.tipn')};});
  const want=async(p,k,re,name)=>{await p.waitForFunction(k=>document.querySelector('.tipn:not(.out)')?.dataset.tip===k,k,{timeout:4000}).catch(()=>{});await p.waitForTimeout(600);const t=await tip(p);ok(`${theme}: ${name}`,t&&t.k===k&&re.test(t.text)&&t.ok&&t.inView&&t.onTop,t);if(SHOT)await p.screenshot({path:`${SHOT}/tip-${k}-${theme}.png`});return t;};
  const clickJs=(p,sel)=>p.evaluate(s=>document.querySelector(s).click(),sel);
  /* Plan */
  {const {ctx,p,errors}=await fresh('plan',true);
   await want(p,'pd',/Tap the days you’ll train/,'Plan → Dates: "Tap the days you’ll train", at today');
   await p.click('[data-tip-ok]');await want(p,'pp',/Tap Plan and we’ll write the workouts/,'Plan → then "Tap Plan and we’ll write the workouts", at the Plan button');
   await p.click('[data-pw="pf-generate"]');await p.waitForTimeout(2200);
   await want(p,'pe',/Tap ✎ to change weights or reps/,'Plan → Edit: "Tap ✎ to change weights or reps"');
   await clickJs(p,'[data-pw="pf-save"]');await p.waitForTimeout(1500);await clickJs(p,'[data-pw="close"]');await p.waitForTimeout(1500);
   await want(p,'pt',/Your plan waits here/,'Plan → Today: "Your plan waits here", at Start');
   await p.click('[data-tip-ok]');
   await want(p,'l2',/Your progress lives in Stats/,'Plan → then the Stats tab');
   ok(`${theme}: no page errors (plan)`,!errors.length,errors);await ctx.close();}
  /* Import */
  {const {ctx,p,errors}=await fresh('import');
   await want(p,'i1',/Export from Strong or Hevy/,'Import: "Export from Strong or Hevy, then upload it here"');
   await p.setInputFiles('#impCsv',require('path').join(__dirname,'fixtures/strong-sample.csv'));await p.waitForTimeout(1200);
   await want(p,'i2',/Check the items marked for you/,'Import → review: "Check the items marked for you"');
   for(let i=0;i<8;i++){const did=await p.evaluate(()=>{const c=document.querySelector('#imp [data-imp="confirm"]');if(c){c.click();return 1;}const pt=document.querySelector('#imp .im-item:not(.im-ok) [data-imp="part"]');if(pt){pt.click();return 1;}const k=document.querySelector('#imp [data-imp="keep"]');if(k){k.click();return 1;}return 0;});if(!did)break;await p.waitForTimeout(100);}
   await clickJs(p,'#imp [data-imp="toconfirm"]');await p.waitForTimeout(700);await clickJs(p,'#imp [data-imp="commit"]');await p.waitForTimeout(1200);
   await want(p,'i3',/Your past days count now/,'Import → done: "Your past days count now"');
   ok(`${theme}: no page errors (import)`,!errors.length,errors);await ctx.close();}
  /* Just looking around */
  {const {ctx,p,errors}=await fresh('look');
   await want(p,'l1',/Ready when you are/,'Look: "Ready when you are", at Choose exercise');
   await p.click('[data-tip-ok]');await want(p,'l2',/Your progress lives in Stats/,'Look → the Stats tab');
   await p.click('[data-tip-ok]');await want(p,'l3',/Everything you set up is in Settings/,'Look → the Settings tab');
   await p.click('[data-tip-ok]');await p.waitForTimeout(700);
   ok(`${theme}: Look → after the last, no tip`,(await tip(p))===null);
   ok(`${theme}: no page errors (look)`,!errors.length,errors);await ctx.close();}
 }
 /* an existing user (onboarded before tips existed) never sees them */
 {const ctx=await b.newContext({viewport:{width:402,height:874},serviceWorkers:'block'});
  await ctx.addInitScript(()=>{if(location.protocol==='http:'&&window.name!=='s'){window.name='s';localStorage.clear();localStorage.setItem('tracker-v1',JSON.stringify({days:{},settings:{onboarded:true,unit:'kg'}}));}});
  const p=await ctx.newPage();await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
  await p.goto(BASE);await p.waitForTimeout(4000);await p.evaluate(()=>{liftEnter({});view='lift';render();});await p.waitForTimeout(1200);
  ok('an existing user: no tips',!(await p.$('.tipn')));
  await p.evaluate(()=>document.querySelector('#view [data-ex]').click());await p.waitForTimeout(1200);
  ok('an existing user: no tip on the set screen either',!(await p.$('.tipn')));await ctx.close();}
}finally{await b.close();}
console.log(bad?`${bad} FAILED`:'all OK');process.exit(bad?1:0);})();
