// PORT=8784 node tools/check-crew-motion.cjs; tests all approved crew assets and lifecycle.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const BASE=`http://127.0.0.1:${process.env.PORT||8784}/`;
(async()=>{const b=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
const c=await b.newContext({viewport:{width:393,height:852},serviceWorkers:'block'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
await c.addInitScript(()=>{if(location.protocol==='http:'&&!sessionStorage.seeded){sessionStorage.seeded='1';localStorage.setItem('tracker-v1',JSON.stringify({days:{},settings:{onboarded:true,theme:'light',name:'Review',clubAvatar:'mat',companionFree:'mat',companionName:'Matty',companionAsked:'yes'}}));}});
await p.goto(BASE);await p.waitForTimeout(2000);
const ids=await p.evaluate(()=>clubChoices().map(c=>c[0]));assert.equal(ids.length,10);
for(const id of ids){for(const suffix of ['','-rest-still','-hello','-tap','-medal','-rest']){const r=await p.request.get(BASE+`assets/crew/${id}${suffix}.webp`);assert(r.ok(),id+suffix);}
await p.evaluate(id=>{DB.settings.clubAvatar=id;DB.settings.companionFree=id;DB.settings.companionName=id;view='sync';render();},id);
await p.waitForSelector(`.club-avatar-button [data-crew="${id}"][data-crew-playing="hello"]`);await p.evaluate(()=>document.querySelector('.club-avatar-button [data-crew]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));
await p.waitForSelector(`.club-avatar-button [data-crew-playing="tap"]`);
for(const moment of ['rest','medal']){await p.evaluate(({id,moment})=>{document.querySelector('.club-avatar-button').innerHTML=clubIconHTML([id],true,moment);},{id,moment});await p.waitForSelector(`.club-avatar-button [data-crew-playing="${moment}"]`);}
console.log('PASS',id,'assets + all four moments');}
await p.evaluate(()=>{DB.settings.clubAvatar='mat';DB.settings.companionFree='mat';view='sync';render();});await p.waitForTimeout(300);
await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(200);assert(await p.evaluate(()=>[...document.querySelectorAll('[data-crew]')].every(e=>e.dataset.crewPlaying!=='hello'&&e.dataset.crewPlaying!=='tap')));console.log('PASS reduced motion stops');
await p.emulateMedia({reducedMotion:'no-preference'});
for(const theme of ['light','dark']){await p.evaluate(theme=>{DB.settings.theme=theme;applyTheme();view='sync';render();},theme);await p.waitForTimeout(300);await p.screenshot({path:`crew-profile-${theme}.png`});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
await p.evaluate(()=>{const box=document.createElement('div');box.id='crew-test';box.style='position:fixed;inset:100px 20px;z-index:999999;background:white';box.innerHTML=clubIconHTML(['mat'],true,'rest');document.body.append(box);});await p.waitForSelector('#crew-test [data-crew-playing="rest"]');
await p.evaluate(()=>{document.querySelector('#crew-test').innerHTML=clubIconHTML(['bottle'],true,'medal');});await p.waitForSelector('#crew-test [data-crew-playing="medal"]');console.log('PASS rest and medal lifecycle');
await p.evaluate(()=>{document.querySelector('#crew-test').style.display='none';});await p.waitForFunction(()=>document.querySelector('#crew-test [data-crew]').dataset.crewPlaying==='false');console.log('PASS hidden animation stops');
assert.deepEqual(errors,[]);console.log('PASS no page errors, 10 characters, 60 images');await c.close();
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
