// v4.6.303: Settings → Account & data → Membership, acted out in test mode (no charge):
// renews date, switch plan, cancel with a confirm, the end date, resume. Fits 320 to 430, light and dark.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,BASE=`http://127.0.0.1:${PORT}/`;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
try{for(const [w,theme] of [[402,'light'],[320,'dark'],[430,'dark']]){const tag=`${w} ${theme}:`;
 const ctx=await b.newContext({viewport:{width:w,height:800},serviceWorkers:'block'});
 const db={days:{},settings:{onboarded:true,unit:'lb',theme}};for(let i=1;i<=24;i++){const d=new Date(Date.UTC(2026,8,i)).toISOString().slice(0,10);db.days[d]={w:[{part:'Chest',ex:'Dip',w:0,reps:[10],at:1}],upd:1};}
 await ctx.addInitScript(([D,t])=>{if(location.protocol==='http:'&&window.name!=='seeded'){window.name='seeded';localStorage.clear();localStorage.setItem('showup:sandbox','1');localStorage.setItem('sbx:tracker-v1',D);localStorage.setItem('showup-theme',t);}},[JSON.stringify(db),theme]);
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
 await p.goto(BASE);await p.waitForLoadState('networkidle').catch(()=>{});await p.waitForTimeout(2800);
 await p.evaluate(()=>{sbxMemberSet('yearly');view='sync';render();});await p.waitForTimeout(700);await p.evaluate(()=>{document.querySelector('[data-club-group=account]').open=true;});await p.waitForTimeout(300);
 const row=()=>p.evaluate(()=>document.querySelector('.mbm-entry')?.textContent.replace(/\s+/g,' ').trim());
 ok(`${tag} Account & data opens with the Membership row`,/Yearly · \$29\.99 a year\s*Renews /.test(await row()),await row());
 await p.click('.mbm-entry');await p.waitForTimeout(700);
 const fit=()=>p.evaluate(()=>{const m=document.getElementById('mbManage');const bad=[...m.querySelectorAll('button,.mbm-row,.mbm-card')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.left<-1||r.right>innerWidth+1);}).map(e=>e.className);return {bad,sw:m.scrollWidth<=m.clientWidth+1};});
 let f=await fit();ok(`${tag} the screen fits the width`,f.sw&&!f.bad.length,f);
 await p.click('[data-mbm-plan=monthly]');await p.waitForTimeout(200);await p.click('[data-mbm-switch]');await p.waitForTimeout(300);
 let t=await p.evaluate(()=>({then:[...document.querySelectorAll('#mbManage .mbm-row')].some(r=>/^Then\s*Monthly/.test(r.textContent)),undo:!!document.querySelector('[data-mbm-undo]'),plan:mbSub().plan.plan}));
 ok(`${tag} Yearly → Monthly waits for the year to end ("Then Monthly", Keep Yearly offered)`,t.then&&t.undo&&t.plan==='yearly',t);
 await p.click('[data-mbm-undo]');await p.waitForTimeout(200);
 await p.click('[data-mbm-cancel]');await p.waitForTimeout(300);
 t=await p.evaluate(()=>({confirm:!!document.querySelector('.mbm-confirm'),renews:mbSub().renews}));
 ok(`${tag} Cancel asks first and changes nothing yet`,t.confirm&&t.renews,t);
 f=await fit();ok(`${tag} the confirm fits the width`,f.sw&&!f.bad.length,f);
 await p.click('[data-mbm-keep]');await p.waitForTimeout(200);
 ok(`${tag} Keep membership closes the confirm`,!(await p.$('.mbm-confirm'))&&await p.evaluate(()=>mbSub().renews));
 await p.click('[data-mbm-cancel]');await p.waitForTimeout(200);await p.click('[data-mbm-cancel-yes]');await p.waitForTimeout(400);
 t=await p.evaluate(()=>({renews:mbSub().renews,member:isMember(),pill:document.querySelector('#mbManage .mbm-pill').textContent,resume:!!document.querySelector('[data-mbm-resume]')}));
 ok(`${tag} cancelled: still a member until the end date, which the screen shows, with Resume`,!t.renews&&t.member&&/Ends /.test(t.pill)&&t.resume,t);
 await p.click('[data-mbm-close]');await p.waitForTimeout(400);
 ok(`${tag} the Settings row now says Ends`,/Ends /.test(await row()),await row());
 await p.click('.mbm-entry');await p.waitForTimeout(500);await p.click('[data-mbm-resume]');await p.waitForTimeout(300);
 ok(`${tag} Resume renews again`,await p.evaluate(()=>mbSub().renews&&/Active/.test(document.querySelector('#mbManage .mbm-pill').textContent)));
 await p.evaluate(()=>{const e=JSON.parse(localStorage.getItem('showup:entitlement'));e.plan='monthly';localStorage.setItem('showup:entitlement',JSON.stringify(e));mbManagePaint();});
 await p.click('[data-mbm-plan=yearly]');await p.waitForTimeout(200);
 ok(`${tag} Monthly → Yearly says it starts today`,/Starts today/.test(await p.evaluate(()=>document.querySelector('.mbm-when').textContent)));
 await p.click('[data-mbm-switch]');await p.waitForTimeout(300);
 ok(`${tag} switched to Yearly now`,await p.evaluate(()=>mbSub().plan.plan==='yearly'));
 ok(`${tag} no page errors`,!errors.length,errors);await ctx.close();}
}catch(e){console.log('CRASH '+e.stack);bad++;}
await b.close();console.log(bad?`FAILED ${bad}`:'ALL OK');process.exit(bad?1:0);})();
