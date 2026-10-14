// v4.6.308: joining from Settings scrolled down. The pop-up lock held the page at the old scroll, so
// the club card sat off screen above: the welcome flew the coin off the top, and letting go put the
// page back at the bottom. Now the coin lands on the card, in view, and the page stays at the top.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,BASE=`http://127.0.0.1:${PORT}/`;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
try{for(const [w,h,from] of [[402,874,'membership'],[320,640,'row']]){const tag=`${w} via ${from}:`;
 const ctx=await b.newContext({viewport:{width:w,height:h},serviceWorkers:'block'});
 const db={days:{},settings:{onboarded:true,unit:'lb',theme:'light',...(from==='membership'?{clubAvatar:'bell',companionFree:'bell',companionName:'Kettle',companionAsked:'x'}:{})}};for(let i=1;i<=24;i++){const d=new Date(Date.UTC(2026,8,i)).toISOString().slice(0,10);db.days[d]={w:[{part:'Chest',ex:'Dip',w:0,reps:[10],at:1}],upd:1};}
 await ctx.addInitScript(D=>{if(location.protocol==='http:'&&window.name!=='seeded'){window.name='seeded';localStorage.clear();localStorage.setItem('showup:sandbox','1');localStorage.setItem('sbx:tracker-v1',D);}},JSON.stringify(db));
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
 await p.goto(BASE);await p.waitForLoadState('networkidle').catch(()=>{});await p.waitForTimeout(2800);
 await p.evaluate(()=>{view='sync';render();});await p.waitForTimeout(700);
 if(from==='membership'){await p.evaluate(()=>{const d=document.querySelector('[data-club-group=account]');d.open=true;d.scrollIntoView();});await p.waitForTimeout(300);await p.click('.mbm-entry');await p.waitForTimeout(500);await p.click('[data-mbm-join]');}
 else{await p.evaluate(()=>{scrollTo(0,document.body.scrollHeight);paywallOpen('settings');});}
 await p.waitForTimeout(2600);
 const sy=await p.evaluate(()=>_modalY);ok(`${tag} Settings was scrolled down when the paywall opened`,sy>200,sy);
 await p.evaluate(()=>{window.__s=[];const f=()=>{const fl=document.querySelector('#memberWelcome .mw-flight'),t=document.querySelector('.club-card [data-club-coin]');if(fl&&t){const a=fl.getBoundingClientRect(),c=t.getBoundingClientRect();__s.push([a.left,a.top,a.width,c.left,c.top,c.width]);}if(__s.length<2000)window.__r=requestAnimationFrame(f);};f();});
 await p.click('[data-mb-buy]');await p.waitForTimeout(900);
 /* v4.6.313: the party belongs to your companion once you have one; Pip otherwise */
 const party=await p.evaluate(()=>({comp:document.querySelector('#memberWelcome .mw-comp .su-companion')?.dataset.companion||null,pip:!!document.querySelector('#memberWelcome img.mw-pip'),want:DB.settings.companionName?clubAvatar()[0]:null}));
 ok(`${tag} the welcome party is ${from==='membership'?'your companion':'Pip (no companion yet)'}`,party.want?party.comp===party.want&&!party.pip:party.pip&&!party.comp,party);
 await p.waitForFunction(()=>!document.getElementById('memberWelcome'),null,{timeout:15000});await p.waitForTimeout(300);
 const s=await p.evaluate(()=>{cancelAnimationFrame(__r);return __s;}),last=s.at(-1),offTop=s.some(x=>x[1]<-x[2]);
 ok(`${tag} the coin flies within the screen and lands on the club card's coin`,s.length>30&&!offTop&&Math.abs(last[0]-last[3])<=2&&Math.abs(last[1]-last[4])<=2&&Math.abs(last[2]-last[5])<=2&&last[4]>0&&last[4]<h,{last,offTop});
 const a=await p.evaluate(()=>({sy:scrollY,locked:document.documentElement.classList.contains('modal-open'),coin:document.querySelector('.club-card [data-club-coin]').getBoundingClientRect().top}));
 ok(`${tag} after the welcome the page stays at the top, the coin where it landed`,a.sy===0&&!a.locked&&Math.abs(a.coin-last[4])<=2,{a,landed:last[4]});
 ok(`${tag} no page errors`,!errors.length,errors);await ctx.close();}
}catch(e){console.log('CRASH '+e.stack);bad++;}
await b.close();console.log(bad?`FAILED ${bad}`:'ALL OK');process.exit(bad?1:0);})();
