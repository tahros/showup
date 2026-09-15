const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
 const p=await b.newPage({serviceWorkers:'block'});
 await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());
 await p.goto('http://127.0.0.1:8784/');
 for(const width of [320,393,430])for(const first of [0,1]){
  await p.setViewportSize({width,height:852});
  await p.evaluate(first=>{DB={days:{},settings:{onboarded:true,unit:'lb'}};todayISO='2026-09-15';checkDate=()=>false;weekStartDow=()=>first;document.querySelector('#onb')?.remove();lift={};pwOpen('2026-09-15');},first);
  await p.locator('.pf-calendar').waitFor();
  await p.waitForFunction(first=>document.querySelector('.pf-calendar>span')?.textContent===(first?'M':'S'),first);
  const errors=await p.evaluate(first=>{
   const grid=document.querySelector('.pf-calendar'),heads=[...grid.children].slice(0,7);
   const textCenter=el=>{const r=document.createRange();r.selectNodeContents(el);const box=r.getBoundingClientRect();return box.x+box.width/2;};
   return [...grid.querySelectorAll('[data-date]')].map(el=>{
    const day=new Date(el.dataset.date+'T12:00').getDay(),column=(day-first+7)%7;
    return Math.abs(textCenter(heads[column])-textCenter(el.querySelector('span')));
   });
  },first);
  assert(Math.max(...errors)<1,`${width}px week start ${first}: header offset ${Math.max(...errors)}px`);
 }
 console.log('PASS weekday text aligns with every date at 320/393/430px, Sunday and Monday starts');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
