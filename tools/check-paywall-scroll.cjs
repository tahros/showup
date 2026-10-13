// v4.6.301: Join the club scrolls both ways. The pull-to-refresh and the bottom band
// ran under the paywall (a full-screen page on <body>), so with the page behind at the
// top a finger dragging down to scroll the paywall back up was taken as a pull: the
// scroll froze and the page behind slid. The paywall now counts as a pop-up.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,BASE=`http://127.0.0.1:${PORT}/`;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
try{
 const db={days:{},settings:{onboarded:true,unit:'lb',skin:'minimal',theme:'dark',bar:'dark',weekStart:'monday'}};
 for(let i=1;i<=12;i++){const d=new Date(Date.UTC(2026,8,i)).toISOString().slice(0,10);db.days[d]={w:[{part:'Chest',ex:'Dip',w:0,reps:[10],at:1}],upd:1};}
 for(const [w,h] of [[402,874],[320,568]]){const tag=`${w}:`;
  const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:true,serviceWorkers:'block'});
  await ctx.addInitScript(D=>{if(window.top===window&&window.name!=='seeded'){window.name='seeded';localStorage.clear();localStorage.setItem('tracker-v1',D);localStorage.setItem('showup-theme','dark');}},JSON.stringify(db));
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
  await p.goto(BASE);await p.waitForLoadState('networkidle').catch(()=>{});await p.waitForTimeout(3000);
  await p.evaluate(()=>{scrollTo(0,0);paywallOpen('test');});await p.waitForTimeout(900);
  const cdp=await ctx.newCDPSession(p);
  const drag=async(y1,y2)=>{const x=w/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y1}]});
   const n=14;let pulled=false;for(let i=1;i<=n;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y1+(y2-y1)*i/n}]});await p.waitForTimeout(16);
    if(await p.evaluate(()=>document.body.classList.contains('pulling')||document.body.classList.contains('banding')))pulled=true;}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(500);return pulled;};
  const st=()=>p.evaluate(()=>{const e=document.getElementById('paywall');return {top:e.scrollTop,max:e.scrollHeight-e.clientHeight,locked:document.documentElement.classList.contains('modal-open'),pageY:scrollY};});
  let s=await st();
  ok(`${tag} the paywall is open, taller than the screen, and holds the page behind still`,s.max>40&&s.locked,s);
  let pulled=await drag(h*.75,h*.2);let s1=await st();
  ok(`${tag} a drag up scrolls Join the club down`,s1.top>s.top+40&&!pulled,{s,s1,pulled});
  await p.evaluate(()=>{const e=document.getElementById('paywall');e.scrollTop=e.scrollHeight;});await p.waitForTimeout(200);
  const s2=await st();pulled=await drag(h*.25,h*.8);const s3=await st();
  ok(`${tag} from the bottom, a drag down scrolls it back up -- no pull-to-refresh, no band underneath`,s3.top<s2.top-40&&!pulled,{s2,s3,pulled});
  pulled=await drag(h*.75,h*.2);const s4=await st();pulled=await drag(h*.25,h*.8)||pulled;const s5=await st();
  ok(`${tag} back and forth keeps scrolling both ways`,s4.top>s3.top&&s5.top<s4.top&&!pulled,{s3,s4,s5,pulled});
  await p.evaluate(()=>document.querySelector('[data-mb-later]').click());await p.waitForTimeout(900);
  s=await p.evaluate(()=>({wall:!!document.getElementById('paywall'),locked:document.documentElement.classList.contains('modal-open'),pos:document.body.style.position}));
  ok(`${tag} Not now closes it and lets the page scroll again`,!s.wall&&!s.locked&&!s.pos,s);
  ok(`${tag} no page errors`,!errors.length,errors);
  await ctx.close();}
}catch(e){console.log('CRASH '+e.stack);bad++;}
await b.close();console.log(bad?`FAILED ${bad}`:'ALL OK');process.exit(bad?1:0);})();
