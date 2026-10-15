// v4.6.315: YOUR MEDALS; THE CREW BY NAME. Medals count your logged days (Days trained), never a
// companion's: 10, 25, 50, 100, 250, 500, 1,000. The highest sits by your name; the row sits under
// the facts; the day one is earned it drops onto your day count. The crew is your companions by
// name; switching is a plain choice. Pip as your companion is blue.
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
 {const {ctx,p,errors}=await open(60,{clubAvatar:'bell',companionName:'Kettle',companionFree:'bell',crew:{plate:{name:'Plato',spans:[['2026-01-01','2026-09-01']]},bell:{name:'Kettle',spans:[['2026-09-01',null]]}}});
  await p.evaluate(()=>{view='sync';render();});await p.waitForTimeout(700);
  let d=await p.evaluate(()=>({on:[...document.querySelectorAll('.club-medal.on small')].map(x=>x.textContent),slots:document.querySelectorAll('.club-medal').length,next:document.querySelector('.club-medals-next')?.textContent,byName:document.querySelector('.club-name-medal svg')?.getAttribute('class'),together:!!document.querySelector('.club-together'),avatarPin:!!document.querySelector('.club-avatar-pin'),crew:JSON.stringify(DB.settings.crew)}));
  ok('60 logged days: seven slots, 10/25/50 earned, "40 days to the gold medal.", silver by the name',d.slots===7&&d.on.join()==='10,25,50'&&d.next==='40 days to the gold medal.'&&/medal-silver/.test(d.byName||''),d);
  ok('no per-companion days anywhere; the old spans are folded into names',!d.together&&!d.avatarPin&&!/spans/.test(d.crew)&&/Plato/.test(d.crew),d.crew);
  /* v4.6.325: open by a direct tap event; the crew art now swaps frames on pointerdown */
  await p.evaluate(()=>document.querySelector('[data-club-picker]').click());await p.waitForTimeout(500);
  d=await p.evaluate(()=>({cur:document.querySelector('[data-club-icon="bell"]').textContent.replace(/\s+/g,' ').trim(),plato:document.querySelector('[data-club-icon="plate"]').textContent.trim(),first:document.querySelector('.club-icon-grid button').dataset.clubIcon}));
  ok('the crew by name: Pip first, Kettle "With you", Plato by name',d.first==='pip'&&/Kettle\s*With you/.test(d.cur)&&d.plato==='Plato',d);
  await p.click('[data-club-icon="plate"]');await p.waitForTimeout(700);
  d=await p.evaluate(()=>({a:clubAvatar()[0],n:DB.settings.companionName,confirm:!!document.querySelector('.crew-confirm:not([hidden])'),open:!document.querySelector('.club-picker').hidden,on:document.querySelectorAll('.club-medal.on').length}));
  ok('switching is a plain choice: Plato at once, no prompt, medals unchanged',d.a==='plate'&&d.n==='Plato'&&!d.confirm&&d.open&&d.on===3,d);
  await p.evaluate(()=>scrollTo(0,400));await p.click('[data-club-icon="plate"]');await p.waitForTimeout(900);
  ok('...and the page rises to the top, to the membership card (v4.6.327)',await p.evaluate(()=>scrollY<4));
  ok('tapping Plato again is the choice: the picker closes, no Done needed (v4.6.325)',await p.evaluate(()=>clubAvatar()[0]==='plate'&&document.querySelector('.club-picker').hidden&&document.querySelector('.club-avatar-button').getAttribute('aria-expanded')==='false'));
  await p.evaluate(()=>document.querySelector('[data-club-picker]').click());await p.waitForTimeout(400);
  await p.click('[data-crew-rename]');await p.waitForTimeout(200);await p.fill('.crew-rename-in','Plates');await p.click('[data-crew-save]');await p.waitForTimeout(600);
  ok('Rename: Plates',await p.evaluate(()=>DB.settings.companionName==='Plates'&&DB.settings.crew.plate.name==='Plates'));
  const f=await p.evaluate(()=>{const c=document.querySelector('.club-card');return c.scrollWidth<=c.clientWidth+1;});ok('the card fits',f);
  ok('no page errors',!errors.length,errors);await ctx.close();}
 /* the day a medal is earned -- 320 wide, with a companion */
 {const {ctx,p,errors}=await open(24,{clubAvatar:'bell',companionName:'Kettle',companionFree:'bell'},320);
  await p.evaluate(()=>{DB.days[todayISO]={w:[{part:'Chest',ex:'Dip',w:0,reps:[10],at:Date.now()}]};SEED=deriveAll();celebrateDayDone(true,25,0,true);});await p.waitForTimeout(3400);
  let d=await p.evaluate(()=>({line:document.querySelector('#dayDone .dd-crew')?.textContent.replace(/\s+/g,' ').trim(),medal:document.querySelector('#dayDone .dd-num-medal svg')?.getAttribute('class'),n:document.querySelector('#dayDone .ddn')?.textContent,comp:!!document.querySelector('#dayDone .dd-companion'),fits:(()=>{const r=document.querySelector('#dayDone .dd-crew').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})()}));
  ok('25 days: the bronze medal drops onto the count, Kettle beside it, and the line is yours',d.line==='You earned the bronze medal: 25 days of showing up.'&&/medal-bronze/.test(d.medal||'')&&d.n==='25'&&d.comp&&d.fits,d);
  await p.evaluate(()=>{document.getElementById('dayDone').remove();celebrateDayDone(true,26,0,true);});await p.waitForTimeout(1200);
  ok('26 days: no medal, no line',await p.evaluate(()=>!document.querySelector('#dayDone .dd-crew')&&!document.querySelector('#dayDone .dd-num-medal')));
  ok('no page errors',!errors.length,errors);await ctx.close();}
 /* Pip as your companion is blue; medals show even with no companion */
 {const {ctx,p,errors}=await open(12,{clubAvatar:'pip',companionFree:'pip',companionName:'Pip'});
  await p.evaluate(()=>{view='today';render();});await p.waitForTimeout(900);
  const tone=await p.evaluate(()=>document.querySelector('#view .su-hello-row .su-mascot')?.dataset.mascotTone);
  await p.evaluate(()=>{view='sync';render();});await p.waitForTimeout(700);
  let d={tone,tile:await p.evaluate(()=>{const e=document.querySelector('.club-avatar-button [data-crew="pip"]'),i=e?.querySelector('.crew-art');return !!e&&i?.complete&&i.naturalWidth>0;})};
  ok('Pip as your companion: approved blue crew render on Today and profile',d.tone==='blue'&&d.tile,d);
  ok('no page errors',!errors.length,errors);await ctx.close();}
 {const {ctx,p,errors}=await open(12,{companionAsked:undefined});
  await p.evaluate(()=>{view='sync';render();});await p.waitForTimeout(600);
  const d=await p.evaluate(()=>({on:document.querySelectorAll('.club-medal.on').length,crew:!!DB.settings.crew,h:document.querySelector('.club-picker-heading b').textContent,tone:mascotTone('hello')}));
  ok('no companion yet: your medals still show (10), no crew, Make it yours, Pip not blue',d.on===1&&!d.crew&&d.h==='Make it yours.'&&d.tone!=='blue',d);
  ok('no page errors',!errors.length,errors);await ctx.close();}
}catch(e){console.log('CRASH '+e.stack);bad++;}
await b.close();console.log(bad?`FAILED ${bad}`:'ALL OK');process.exit(bad?1:0);})();
