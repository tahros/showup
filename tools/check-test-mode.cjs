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
  /* use it: sample data goes to the test keys only */
  await p.click('[data-onbact="demo"]');await p.waitForTimeout(800);
  d=await look();r=await raw();
  ok(`${tag} sample data in test mode lands in the test keys; the real record still byte-identical`,d.days>0&&r.db===SNAP&&r.sbx>0,{days:d.days,sbx:r.sbx,same:r.db===SNAP});
  /* the owner's own account is refused in test mode */
  const refused=await p.evaluate(async O=>{await saveSession({access_token:'a',refresh_token:'b',expires_at:Date.now()+36e5,user:{id:'u1',email:O}});return {s:session,stored:localStorage.getItem('tracker-session'),pushed:await cloudPushNow()};},OWNER);
  ok(`${tag} signing in with the owner's account in test mode is refused (no session kept, nothing pushed)`,refused.s===null&&!refused.stored&&refused.pushed===false,refused);
  /* Start over */
  await Promise.all([p.waitForNavigation(),p.click('#sbxBar [data-sbx="restart"]')]);await boot();
  d=await look();
  ok(`${tag} Start over: back to an empty first run, still in test mode`,d.sandbox&&d.bar&&d.onb&&d.days===0,d);
  /* Exit */
  await Promise.all([p.waitForNavigation(),p.click('#sbxBar [data-sbx="exit"]')]);await boot();
  d=await look();r=await raw();
  ok(`${tag} Exit: the real app is back -- 30 days, owner signed in, no bar, no test keys left`,!d.sandbox&&!d.bar&&!d.onb&&d.days===30&&d.email===OWNER&&!r.flag&&r.sbx===0&&real30(r.db),{d,r:{flag:r.flag,sbx:r.sbx}});
  /* not the owner: no door */
  await p.evaluate(()=>{session.user.email='someone@else.com';prevView=view;view='sync';render();});await p.waitForTimeout(400);
  ok(`${tag} anyone else: no "Start as a new user"`,!(await p.$('#sbxStart')));
  ok(`${tag} no page errors`,!errors.length,errors);
  await ctx.close();}
}finally{await b.close();}
console.log(bad?`${bad} FAILED`:'all OK');process.exit(bad?1:0);})();
