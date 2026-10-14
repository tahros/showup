// v4.6.312: TOGETHER, THE CREW, THE PINS. Each companion keeps the logged days that fell while it
// was with you (the first counts from your first logged day). Switching asks when there is history,
// keeps the old one's days, and switching back picks them up. Pins mark days together: 7, 25, 50,
// 100, 250, 365. The day one is earned, it lands on the companion on the day-done screen.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,BASE=`http://127.0.0.1:${PORT}/`;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
const iso=n=>{const d=new Date('2026-10-14T12:00');d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
const open=async(N,settings,w=402)=>{const ctx=await b.newContext({viewport:{width:w,height:874},serviceWorkers:'block'});
 const days={};for(let i=1;i<=N;i++)days[iso(i)]={w:[{part:'Chest',ex:'Dip',w:0,reps:[10],at:1}],upd:1};
 const db={days,settings:{onboarded:true,unit:'lb',theme:'light',name:'Sungjee',companionAsked:'x',...settings}};
 await ctx.addInitScript(D=>{if(location.protocol==='http:'&&window.name!=='seeded'){window.name='seeded';localStorage.clear();localStorage.setItem('tracker-v1',D);}},JSON.stringify(db));
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());await p.goto(BASE);await p.waitForLoadState('networkidle').catch(()=>{});await p.waitForTimeout(3000);
 await p.evaluate(()=>{todayISO='2026-10-14';});return {ctx,p,errors};};
try{
 /* a first companion counts from the first logged day */
 {const {ctx,p,errors}=await open(60,{clubAvatar:'bell',companionName:'Kettle',companionFree:'bell'});
  await p.evaluate(()=>{view='sync';render();});await p.waitForTimeout(700);
  let d=await p.evaluate(()=>({t:document.querySelector('.club-together')?.textContent.replace(/\s+/g,' ').trim(),pins:document.querySelectorAll('.club-together .crew-pin').length,top:document.querySelector('.club-avatar-pin svg')?.getAttribute('class')}));
  ok('first companion: "With Kettle · 60 days together", three pins (7, 25, 50), silver on the avatar',/With Kettle\s*60 days together/.test(d.t)&&d.pins===3&&/crew-pin-silver/.test(d.top||''),d);
  await p.click('[data-club-picker]');await p.waitForTimeout(500);
  d=await p.evaluate(()=>({h:document.querySelector('.club-picker-heading b').textContent,cur:document.querySelector('[data-club-icon="bell"]').textContent.replace(/\s+/g,' ').trim(),other:document.querySelector('[data-club-icon="plate"]').textContent.trim()}));
  ok('the picker is Your crew: Kettle "With you · 60 days", the rest by their names',d.h==='Your crew'&&/Kettle\s*With you · 60 days/.test(d.cur)&&d.other==='Weight plate',d);
  await p.click('[data-club-icon="plate"]');await p.waitForTimeout(400);
  d=await p.evaluate(()=>({box:document.querySelector('.crew-confirm:not([hidden])')?.textContent.replace(/\s+/g,' ').trim(),still:clubAvatar()[0]}));
  ok('switching asks first and changes nothing yet',/Kettle has been with you 60 days\. Switch to Plato\? Kettle keeps every day\./.test(d.box||'')&&d.still==='bell',d);
  await p.click('[data-crew-stay]');await p.waitForTimeout(200);
  ok('Stay keeps Kettle',await p.evaluate(()=>!!document.querySelector('.crew-confirm[hidden]')&&clubAvatar()[0]==='bell'));
  await p.click('[data-club-icon="plate"]');await p.waitForTimeout(300);await p.click('[data-crew-go]');await p.waitForTimeout(700);
  d=await p.evaluate(()=>({a:clubAvatar()[0],n:DB.settings.companionName,k:crewDays('bell'),pl:crewDays('plate'),open:!document.querySelector('.club-picker').hidden,t:document.querySelector('.club-together').textContent.replace(/\s+/g,' ').trim()}));
  ok('Plato comes along at 0 days; Kettle keeps 60; the shelf stays open',d.a==='plate'&&d.n==='Plato'&&d.k===60&&d.pl===0&&d.open&&/With Plato\s*0 days together/.test(d.t),d);
  await p.evaluate(()=>{DB.days[todayISO]={w:[{part:'Chest',ex:'Dip',w:0,reps:[10],at:Date.now()}]};});
  ok('a day logged now counts for Plato, not Kettle',await p.evaluate(()=>crewDays('plate')===1&&crewDays('bell')===60));
  await p.click('[data-club-icon="bell"]');await p.waitForTimeout(300);await p.click('[data-crew-go]');await p.waitForTimeout(600);
  d=await p.evaluate(()=>({a:clubAvatar()[0],n:DB.settings.companionName,k:crewDays('bell'),pl:crewDays('plate')}));
  /* a switch on the same day: today goes with whoever is with you now -- the app cannot know the hour of the switch */
  ok('switching back the same day: Kettle picks up at 60 and today comes with him (61); Plato back to 0',d.a==='bell'&&d.n==='Kettle'&&d.k===61&&d.pl===0,d);
  await p.click('[data-crew-rename]');await p.waitForTimeout(200);await p.fill('.crew-rename-in','Kettlebelle');await p.click('[data-crew-save]');await p.waitForTimeout(600);
  ok('Rename: Kettlebelle on the card and in the crew',await p.evaluate(()=>DB.settings.companionName==='Kettlebelle'&&DB.settings.crew.bell.name==='Kettlebelle'&&/Kettlebelle/.test(document.querySelector('.club-together').textContent)));
  const f=await p.evaluate(()=>{const c=document.querySelector('.club-card');return c.scrollWidth<=c.clientWidth+1;});ok('the card fits',f);
  ok('no page errors',!errors.length,errors);await ctx.close();}
 /* the day a pin is earned */
 {const {ctx,p,errors}=await open(24,{clubAvatar:'bell',companionName:'Kettle',companionFree:'bell'},320);
  await p.evaluate(()=>{DB.days[todayISO]={w:[{part:'Chest',ex:'Dip',w:0,reps:[10],at:Date.now()}]};SEED=deriveAll();celebrateDayDone(true,25,0,true);});await p.waitForTimeout(3400);
  let d=await p.evaluate(()=>({line:document.querySelector('#dayDone .dd-crew')?.textContent.replace(/\s+/g,' ').trim(),pin:document.querySelector('#dayDone .dd-comp-pin svg')?.getAttribute('class'),fits:(()=>{const r=document.querySelector('#dayDone .dd-crew').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})()}));
  ok('25 days together: the bronze medal lands on Kettle, and the line says so',d.line==='Kettle earned the bronze medal: 25 days together.'&&/crew-pin-bronze/.test(d.pin||'')&&d.fits,d);
  await p.evaluate(()=>document.getElementById('dayDone').remove());
  await p.evaluate(()=>{DB.days[iso1='2026-10-15']={w:[{part:'Chest',ex:'Dip',w:0,reps:[10],at:1}]};todayISO='2026-10-15';celebrateDayDone(true,26,0,true);});await p.waitForTimeout(1200);
  ok('the next day: no line, no pin dropping',await p.evaluate(()=>!document.querySelector('#dayDone .dd-crew')&&!document.querySelector('#dayDone .dd-comp-pin')));
  ok('no page errors',!errors.length,errors);await ctx.close();}
 /* no companion yet: none of it */
 {const {ctx,p,errors}=await open(30,{});
  await p.evaluate(()=>{view='sync';render();});await p.waitForTimeout(600);
  ok('without a named companion: no together line, the picker is Make it yours',await p.evaluate(()=>!document.querySelector('.club-together')&&document.querySelector('.club-picker-heading b').textContent==='Make it yours.'&&!DB.settings.crew));
  ok('no page errors',!errors.length,errors);await ctx.close();}
}catch(e){console.log('CRASH '+e.stack);bad++;}
await b.close();console.log(bad?`FAILED ${bad}`:'ALL OK');process.exit(bad?1:0);})();
