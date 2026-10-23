// v4.6.392: tips take turns. A tip closed with Got it starts a rest (TIP_GAP and a different
// screen); the next step of something you just did follows at once; the tab-bar tips show at
// most one a day.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,BASE=`http://127.0.0.1:${PORT}/`;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
try{
 const fresh=async()=>{const ctx=await b.newContext({viewport:{width:402,height:874},serviceWorkers:'block'});
  await ctx.addInitScript(()=>{if(location.protocol==='http:'&&window.name!=='s'){window.name='s';localStorage.clear();localStorage.setItem('tracker-v1',JSON.stringify({days:{},settings:{onboarded:true,unit:'kg',tips:{on:1}}}));}});
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
  await p.goto(BASE);await p.waitForTimeout(3500);return {ctx,p,errors};};
 const tip=p=>p.evaluate(()=>document.querySelector('.tipn:not(.out)')?.dataset.tip||null);
 const go=(p,v)=>p.evaluate(v=>{if(v==='lift')liftEnter({});view=v;render();},v);
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 /* Today: l1, then nothing straight after Got it */
 {const {ctx,p,errors}=await fresh();
  ok('Today: the first tip is "Choose an exercise to start"',await tip(p)==='l1',await tip(p));
  const fs13=await p.evaluate(()=>({fs:getComputedStyle(document.querySelector('.tipn .tipt')).fontSize,tsa:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tsa'))||0}));
  ok('tip text is 13px (plus the text-size setting)',parseFloat(fs13.fs)===13+fs13.tsa,fs13);
  await p.click('[data-tip-ok]');await wait(1500);
  ok('Got it: no second tip follows on the same screen',await tip(p)===null,await tip(p));
  await go(p,'stats');await wait(500);await go(p,'today');await wait(1200);
  ok('another screen and back, inside the rest: still none',await tip(p)===null,await tip(p));
  await p.evaluate(()=>{DB.settings.tips.at=Date.now()-5*60e3;});await go(p,'stats');await wait(500);await go(p,'today');await wait(1200);
  ok('rest over, same day: the tab-bar tip waits for tomorrow',await tip(p)===null,await tip(p));
  await p.evaluate(()=>{DB.settings.tips.day='2000-01-01';});await go(p,'stats');await wait(500);await go(p,'today');await wait(1200);
  ok('the next day: "Your progress lives in Stats"',await tip(p)==='l2',await tip(p));
  await p.click('[data-tip-ok]');await wait(1200);
  ok('and Settings does not follow it',await tip(p)===null,await tip(p));
  ok('no page errors (today)',!errors.length,errors);await ctx.close();}
 /* Train: the flow you are doing follows at once */
 {const {ctx,p,errors}=await fresh();
  await go(p,'lift');await wait(1400);
  ok('Train: "Tap an exercise to log it"',await tip(p)==='ex',await tip(p));
  await p.evaluate(()=>document.querySelector('#view [data-ex]').click());await wait(1500);
  ok('tapping an exercise brings the next step at once: "Swipe for reps…"',await tip(p)==='set',await tip(p));
  await p.click('[data-tip-ok]');await wait(1200);
  ok('Got it on that step: nothing follows',await tip(p)===null,await tip(p));
  ok('no page errors (train)',!errors.length,errors);await ctx.close();}
}finally{await b.close();}
console.log(bad?`${bad} FAILED`:'all OK');process.exit(bad?1:0);})();
