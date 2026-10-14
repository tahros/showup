// v4.6.311: YOUR COMPANION IN PIP'S PLACE. One character per screen: the companion you chose stands
// where Pip stood on Today, in tips, on the live workout and beside the day count (logo shows the
// wordmark alone). People who set up before companions existed meet theirs once, or say Not now.
// The one you choose first is yours for good; membership unlocks the rest.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,BASE=`http://127.0.0.1:${PORT}/`;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
const open=async(settings,sandbox)=>{const ctx=await b.newContext({viewport:{width:402,height:874},serviceWorkers:'block'});
 const db={days:{},settings:{onboarded:true,unit:'lb',theme:'light',...settings}};for(let i=1;i<=12;i++){const d=new Date(Date.UTC(2026,8,i)).toISOString().slice(0,10);db.days[d]={w:[{part:'Chest',ex:'Dip',w:0,reps:[10],at:1}],upd:1};}
 await ctx.addInitScript(([D,s])=>{if(location.protocol==='http:'&&window.name!=='seeded'){window.name='seeded';localStorage.clear();if(s){localStorage.setItem('showup:sandbox','1');localStorage.setItem('sbx:tracker-v1',D);}else localStorage.setItem('tracker-v1',D);}},[JSON.stringify(db),!!sandbox]);
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());await p.goto(BASE);await p.waitForLoadState('networkidle').catch(()=>{});await p.waitForTimeout(3000);
 return {ctx,p,errors};};
try{
 /* someone with a companion */
 {const {ctx,p,errors}=await open({clubAvatar:'bell',companionName:'Kettle',companionFree:'bell'});
  await p.evaluate(()=>{view='today';render();});await p.waitForTimeout(800);
  let d=await p.evaluate(()=>({comp:document.querySelector('#view .su-hello-row .su-companion')?.dataset.companion,pip:document.querySelectorAll('#view .su-mascot').length}));
  ok('Today: the companion stands in the hello row, and Pip is not on the page',d.comp==='bell'&&d.pip===0,d);
  await p.evaluate(()=>celebrateDayDone(true,48,0,true));await p.waitForTimeout(2600);
  d=await p.evaluate(()=>{const o=document.getElementById('dayDone');return {comp:o.querySelector('.dd-numrow .su-companion')?.dataset.companion,pip:o.querySelectorAll('.su-mascot').length,word:!!o.querySelector('.showuppp-word-only'),n:o.querySelector('.ddn')?.textContent};});
  ok('Day done: the wordmark alone, the companion beside the count, no Pip',d.comp==='bell'&&d.pip===0&&d.word&&d.n==='48',d);
  await p.evaluate(()=>document.getElementById('dayDone')?.remove());
  await p.evaluate(()=>{DB.settings.tips={on:1};lift={ex:'Barbell Bench Press',part:'Chest'};view='lift';render();});await p.waitForTimeout(2200);
  d=await p.evaluate(()=>({tip:document.querySelector('.tipn')?.dataset.tip,comp:document.querySelector('.tipn .su-companion')?.dataset.companion,img:!!document.querySelector('.tipn img.tip-pip')}));
  ok('Tips: the companion is the guide in the bubble',d.tip==='set'&&d.comp==='bell'&&!d.img,d);
  ok('no prompt for someone who already has one',await p.evaluate(()=>!adoptDue()));
  await p.evaluate(()=>{DB.settings.mascotMotion='off';view='today';render();});await p.waitForTimeout(500);
  d=await p.evaluate(()=>({mode:mascotMode(),comp:document.querySelectorAll('#view .su-companion').length}));
  ok('Mascot off: no companion either',d.mode==='off'&&d.comp===0,d);
  ok('no page errors',!errors.length,errors);await ctx.close();}
 /* someone who set up before companions existed */
 {const {ctx,p,errors}=await open({});
  await p.evaluate(()=>{view='today';render();});await p.waitForTimeout(600);
  ok('an existing user without a companion is due the meeting (not opened by itself under automation)',await p.evaluate(()=>adoptDue()&&!adoptAuto()&&!document.getElementById('adopt')));
  await p.evaluate(()=>adoptOpen());await p.waitForTimeout(2600);
  let d=await p.evaluate(()=>({t:document.querySelector('#adopt .ad-t')?.textContent,n:document.querySelectorAll('#adopt .ad-c:not(.ad-dim)').length,later:!!document.querySelector('#adopt [data-ad-later]'),modal:modalOpen()}));
  ok('the meeting: "Someone wants to come along.", nine to choose, Not now offered, a pop-up',d.t==='Someone wants to come along.'&&d.n===9&&d.later&&d.modal,d);
  await p.click('#adopt [data-ad="roller"]');await p.waitForTimeout(700);await p.click('#adopt .ad-go');await p.waitForTimeout(3200);
  d=await p.evaluate(()=>({gone:!document.getElementById('adopt'),a:DB.settings.clubAvatar,free:DB.settings.companionFree,n:DB.settings.companionName,comp:document.querySelector('#view .su-companion')?.dataset.companion,due:adoptDue()}));
  ok('Rolly comes along: kept as the free one, on Today, never asked again',d.gone&&d.a==='roller'&&d.free==='roller'&&d.n==='Rolly'&&d.comp==='roller'&&!d.due,d);
  ok('no page errors',!errors.length,errors);await ctx.close();}
 {const {ctx,p,errors}=await open({});
  await p.evaluate(()=>{view='today';render();adoptOpen();});await p.waitForTimeout(1200);await p.click('#adopt [data-ad-later]');await p.waitForTimeout(900);
  const d=await p.evaluate(()=>({gone:!document.getElementById('adopt'),asked:!!DB.settings.companionAsked,due:adoptDue(),n:DB.settings.companionName||null}));
  ok('Not now: closes, no name kept, and it does not come back',d.gone&&d.asked&&!d.due&&!d.n,d);
  ok('no page errors',!errors.length,errors);await ctx.close();}
 /* after launch: the first pick is free; the rest are a member's */
 {const {ctx,p,errors}=await open({clubAvatar:'mat',companionFree:'mat',companionName:'Matty'},true);
  await p.evaluate(()=>{document.getElementById('sbxBar')?.remove();view='sync';render();});await p.waitForTimeout(800);
  const d=await p.evaluate(()=>({live:paywallLive(),free:clubFreeIcon()[0],locked:[...document.querySelectorAll('[data-club-icon].club-locked')].map(x=>x.dataset.clubIcon),note:document.querySelector('.club-lock-note')?.textContent}));
  ok('non-member after launch: the one chosen at setup stays open, the other eight locked',d.live&&d.free==='mat'&&d.locked.length===8&&!d.locked.includes('mat')&&/rolled mat is yours/.test(d.note||''),d);
  ok('no page errors',!errors.length,errors);await ctx.close();}
}catch(e){console.log('CRASH '+e.stack);bad++;}
await b.close();console.log(bad?`FAILED ${bad}`:'ALL OK');process.exit(bad?1:0);})();
