// v4.6.261: "Start as a new user" -- the owner's test mode. The real record, sign-in and backups stay
// exactly as they were; the app runs on empty sbx: keys until Exit, which brings everything back.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,SHOT=process.env.SHOT,BASE=`http://127.0.0.1:${PORT}/`;
const OWNER='sungjee.u@gmail.com';
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
try{
 const real={days:{},settings:{onboarded:true,unit:'lb',skin:'minimal',theme:'dark',bar:'dark',weekStart:'monday'}};
 for(let i=1;i<=30;i++){const d=new Date(Date.UTC(2026,8,i)).toISOString().slice(0,10);real.days[d]={w:[{part:'Chest',ex:'Dip',w:0,reps:[10],at:1}],upd:1};}
 const REAL=JSON.stringify(real);
 const sess=email=>JSON.stringify({access_token:'x',refresh_token:'y',expires_at:Date.now()+36e5,user:{id:'u1',email}});
 for(const [w,h] of [[402,874],[320,640]]){const tag=`${w}:`;
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:SHOT?2:1,serviceWorkers:'block'});
  await ctx.addInitScript(([REAL,S])=>{if(window.top===window&&location.protocol==='http:'&&window.name!=='seeded'){window.name='seeded';localStorage.clear();localStorage.setItem('tracker-v1',REAL);localStorage.setItem('tracker-session',S);localStorage.setItem('showup-theme','dark');}},[REAL,sess(OWNER)]);
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
  const boot=async()=>{await p.waitForLoadState('networkidle').catch(()=>{});await p.waitForTimeout(3200);};
  await p.goto(BASE);await boot();
  const raw=()=>p.evaluate(()=>{const g=k=>SBX_RAW.get.call(localStorage,k);return {db:g('tracker-v1'),sess:g('tracker-session'),flag:g('showup:sandbox'),sbx:Object.keys(localStorage).filter(k=>k.startsWith('sbx:')).length};});
  const look=()=>p.evaluate(()=>({sandbox:SANDBOX,bar:!!document.getElementById('sbxBar'),onb:!!document.querySelector('#onb:not([hidden])'),days:Object.values(DB.days).filter(v=>v&&(v.w||[]).length).length,signed:!!session,email:session?.user?.email||null,
   theme:document.documentElement.dataset.theme,sw:document.documentElement.scrollWidth,vw:innerWidth}));
  let d=await look();
  ok(`${tag} real app: owner signed in, 30 days, no test bar`,!d.sandbox&&!d.bar&&d.days===30&&d.email===OWNER,d);
  /* the door, in Settings, owner only */
  await p.evaluate(()=>{prevView=view;view='sync';render();});await p.waitForTimeout(500);
  const btn=await p.$('#sbxStart');
  ok(`${tag} Settings shows "Start as a new user" under the owner dashboard`,!!btn&&await p.evaluate(()=>{const a=document.getElementById('ownerLink'),b=document.getElementById('sbxStart');return !!a&&!!b&&a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING;}));
  if(SHOT&&w===402){await btn.scrollIntoViewIfNeeded();await p.screenshot({path:`${SHOT}/tm-settings.png`});}
  await Promise.all([p.waitForNavigation(),btn.click()]);await boot();
  d=await look();let r=await raw();
  ok(`${tag} test mode: an empty app, signed out, first-run screen, the amber bar`,d.sandbox&&d.bar&&d.onb&&d.days===0&&!d.signed&&d.sw<=d.vw,d);
  const SNAP=r.db,real30=x=>Object.values(JSON.parse(x).days).filter(v=>v&&(v.w||[]).length).length===30;
  ok(`${tag} test mode: the real record (30 days) and the owner's sign-in are still there`,real30(r.db)&&JSON.parse(r.sess).user.email===OWNER&&r.flag==='1',{flag:r.flag});
  if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/tm-firstrun.png`});
  /* v4.6.276: on the first run the bar sits at the top; in the app, just above the tab bar, clear of the header */
  const pos=()=>p.evaluate(()=>{const a=document.getElementById('sbxBar').getBoundingClientRect(),n=document.getElementById('nav').getBoundingClientRect(),h=document.querySelector('header').getBoundingClientRect();return {top:a.top,bottom:a.bottom,navTop:n.top,headerBottom:h.bottom,vh:innerHeight};});
  let ps=await pos();ok(`${tag} first run: the test bar is at the top`,ps.top<60,ps);
  /* use it: sample data goes to the test keys only */
  await p.click('[data-onbact="demo"]');await p.waitForTimeout(800);
  d=await look();r=await raw();
  ok(`${tag} sample data in test mode lands in the test keys; the real record still byte-identical`,d.days>0&&r.db===SNAP&&r.sbx>0,{days:d.days,sbx:r.sbx,same:r.db===SNAP});
  await p.waitForTimeout(700);ps=await pos();
  ok(`${tag} in the app: the test bar sits just above the tab bar, clear of the header`,ps.bottom<=ps.navTop&&ps.navTop-ps.bottom<=14&&ps.top>ps.headerBottom,ps);
  if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/tm-app.png`});
  /* the owner's own account is refused in test mode */
  const refused=await p.evaluate(async O=>{await saveSession({access_token:'a',refresh_token:'b',expires_at:Date.now()+36e5,user:{id:'u1',email:O}});return {s:session,stored:localStorage.getItem('tracker-session'),pushed:await cloudPushNow()};},OWNER);
  ok(`${tag} signing in with the owner's account in test mode is refused (no session kept, nothing pushed)`,refused.s===null&&!refused.stored&&refused.pushed===false,refused);
  /* Start over */
  await p.click('#sbxBar [data-sbx="tools"]');await Promise.all([p.waitForNavigation(),p.click('#sbxBar [data-sbx="restart"]')]);await boot();
  d=await look();
  ok(`${tag} Start over: back to an empty first run, still in test mode`,d.sandbox&&d.bar&&d.onb&&d.days===0,d);
  /* v4.6.283: the bar's tools -- fill to 20, the paywall on day 21, a free test purchase, fold, move */
  await p.click('[data-onbact="local"]');await p.waitForTimeout(600);await p.click('[data-onbact="skip"]');await p.waitForTimeout(700);await p.click('[data-onbact="go"][data-onbgo="look"]');await p.waitForTimeout(1200);
  await p.evaluate(()=>{const t=DB.settings.tips;if(t)t.on=0;document.querySelectorAll('.tipn,.tipr').forEach(e=>e.remove());});
  await p.click('#sbxBar [data-sbx="tools"]');await p.waitForTimeout(200);
  if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/tm-tools.png`});
  await p.click('#sbxBar [data-sbx="fill"]');await p.waitForTimeout(500);
  let t=await p.evaluate(()=>({days:loggedDays(),today:(DB.days[todayISO]?.w||[]).length,card:document.getElementById('mbTrial')?.textContent||'',panel:document.querySelector('#sbxBar .sx-panel').textContent,founding:!!DB.settings.founding}));
  ok(`${tag} Fill to 20: 20 logged days before today, the Today card reads 20 of 20, no founding mark`,t.days===20&&t.today===0&&/20 of 20 free days/.test(t.card)&&/Logged days: 20/.test(t.panel)&&!t.founding,t);
  if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/tm-filled.png`});
  await p.evaluate(()=>{liftEnter({});view='lift';lift.part='Legs';lift.ex='Squat';render();});await p.waitForTimeout(500);
  await p.evaluate(()=>document.getElementById('addrep').click());await p.waitForTimeout(800);
  t=await p.evaluate(()=>({wall:!!document.getElementById('paywall'),today:(DB.days[todayISO]?.w||[]).length}));
  ok(`${tag} the first set on day 21 opens the paywall and writes nothing`,t.wall&&t.today===0,t);
  if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/tm-paywall.png`});
  await p.click('#paywall [data-mb-buy]');await p.waitForTimeout(600);
  t=await p.evaluate(()=>({wall:!!document.getElementById('paywall'),member:isMember(),ent:JSON.parse(localStorage.getItem('showup:entitlement')||'null'),realEnt:SBX_RAW.get.call(localStorage,'showup:entitlement')}));
  ok(`${tag} Continue in test mode: a free test membership (yearly), kept in the test keys only`,!t.wall&&t.member&&t.ent?.test&&t.ent.plan==='yearly'&&!t.realEnt,t);
  await p.evaluate(()=>document.getElementById('addrep').click());await p.waitForTimeout(600);
  t=await p.evaluate(()=>({wall:!!document.getElementById('paywall'),today:(DB.days[todayISO]?.w||[]).length}));
  ok(`${tag} as a member, day 21 logs`,!t.wall&&t.today===1,t);
  await p.click('#sbxBar [data-sbx="unmember"]');await p.waitForTimeout(300);
  ok(`${tag} Cancel: not a member any more`,!(await p.evaluate(()=>isMember())));
  /* v4.6.284: after training today, a non-member still sees the free days; no DAY 20 card */
  await p.evaluate(()=>{view='today';render();});await p.waitForTimeout(500);
  t=await p.evaluate(()=>({card:document.getElementById('mbTrial')?.textContent||'',ms:!!document.querySelector('#view .msmoment'),trained:(DB.days[todayISO]?.w||[]).length}));
  ok(`${tag} Today after training: the free-days card (20 of 20), no DAY 20 card`,t.trained>0&&/20 of 20 free days/.test(t.card)&&!t.ms,t);
  if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/tm-today-trained.png`});
  /* fold, then move the dot */
  await p.click('#sbxBar [data-sbx="fold"]');await p.waitForTimeout(200);
  let b0=await p.evaluate(()=>{const r=document.getElementById('sbxBar').getBoundingClientRect();return {w:r.width,x:r.left+r.width/2,y:r.top+r.height/2,folded:document.getElementById('sbxBar').classList.contains('sx-folded')};});
  ok(`${tag} Fold: a small dot`,b0.folded&&b0.w<=40,b0);
  await p.mouse.move(b0.x,b0.y);await p.mouse.down();await p.mouse.move(b0.x-120,b0.y-300,{steps:8});await p.mouse.up();await p.waitForTimeout(200);
  let b1=await p.evaluate(()=>{const r=document.getElementById('sbxBar').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,folded:document.getElementById('sbxBar').classList.contains('sx-folded')};});
  ok(`${tag} dragging the dot moves it and doesn't open it`,Math.abs(b1.x-(b0.x-120))<4&&Math.abs(b1.y-(b0.y-300))<4&&b1.folded,{b0,b1});
  if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/tm-folded.png`});
  await p.click('#sbxBar [data-sbx="unfold"]');await p.waitForTimeout(200);
  ok(`${tag} tapping the dot opens the bar where it is`,!(await p.evaluate(()=>document.getElementById('sbxBar').classList.contains('sx-folded'))));
  await p.reload();await boot();
  let b2=await p.evaluate(()=>{const r=document.getElementById('sbxBar').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
  ok(`${tag} the place is remembered after a reload`,Math.abs(b2.y-b1.y)<6,{b1,b2});
  await p.click('#sbxBar [data-sbx="tools"]');await p.click('#sbxBar [data-sbx="home"]');await p.waitForTimeout(700);
  ps=await pos();ok(`${tag} Reset position: back above the tab bar`,ps.bottom<=ps.navTop&&ps.navTop-ps.bottom<=14,ps);
  /* Exit */
  await p.evaluate(()=>{const pn=document.querySelector('#sbxBar .sx-panel');if(pn.hidden)document.querySelector('#sbxBar [data-sbx="tools"]').click();});await p.waitForTimeout(200);
  await Promise.all([p.waitForNavigation(),p.click('#sbxBar [data-sbx="exit"]')]);await boot();
  d=await look();r=await raw();
  ok(`${tag} Exit: the real app is back -- 30 days, owner signed in, no bar, no test keys left, no test membership`,!d.sandbox&&!d.bar&&!d.onb&&d.days===30&&d.email===OWNER&&!r.flag&&r.sbx===0&&real30(r.db)&&!(await p.evaluate(()=>localStorage.getItem('showup:entitlement'))),{d,r:{flag:r.flag,sbx:r.sbx}});
  await p.evaluate(()=>SBX_RAW.del.call(localStorage,'showup:sandbox-ui'));
  /* not the owner: no door */
  await p.evaluate(()=>{session.user.email='someone@else.com';prevView=view;view='sync';render();});await p.waitForTimeout(400);
  ok(`${tag} anyone else: no "Start as a new user"`,!(await p.$('#sbxStart')));
  ok(`${tag} no page errors`,!errors.length,errors);
  await ctx.close();}
}finally{await b.close();}
console.log(bad?`${bad} FAILED`:'all OK');process.exit(bad?1:0);})();
