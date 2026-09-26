/* test-plan-preview-log.js DIR — v4.6.139: another day's plan steps aside once you log.
 * Real: every script in index.html order, plLog, plSessionRows and the Train card.
 * Faked: nothing but the date. The maker's report (2026-09-25): no EZ Bar Curl in
 * Friday's plan, Saturday's plan has it; two sets logged Friday night showed beside
 * Saturday's targets as "Unlinked", and "Done with EZ Bar Curl" was missing. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
async function boot(){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext();
  w.localStorage.setItem('showup:planning-interface','previous');
  w.localStorage.setItem('tracker-v1',JSON.stringify({days:{},settings:{onboarded:true,unit:'lb'}}));
  w.fetch=()=>Promise.reject(new Error('offline'));
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(srcs[s],ctx,{filename:s});
  for(let i=0;i<60;i++) await new Promise(r=>setTimeout(r,0));
  const run=c=>vm.runInContext(c,ctx);
  run(`todayISO='2026-09-25';checkDate=()=>false;`);
  return {w,run};
}
const SEED=(today,tomorrow)=>`(()=>{const L=2.2046,N=Date.now();
  DB.days={'2026-09-18':{w:[{ex:'EZ Bar Curl',part:'Biceps',w:65/L,reps:[10,12,12,12],at:N-7*864e5}]}};
  DB.week={days:{${today?`'2026-09-25':planItemsFrom(pwRead(${JSON.stringify(today)})),`:''}'2026-09-26':planItemsFrom(pwRead(${JSON.stringify(tomorrow)}))}};
  SEED=deriveAll();view='lift';lift.part='Biceps';lift.ex='EZ Bar Curl';render();})()`;
const LOG=n=>`(()=>{const L=2.2046,N=Date.now();for(let k=0;k<${n};k++){const s={ex:'EZ Bar Curl',part:'Biceps',w:65/L,reps:[12],at:N-(${n}-k)*90e3};plLog(s);const t=DB.days[todayISO];if(!t.w.includes(s))t.w.push(s);}SEED=deriveAll();render();})()`;
const card=b=>{const d=b.w.document,t=d.body.textContent;return {unlinked:/Unlinked/.test(t),sat:/Sat, 9\/26/.test(t),preview:/Upcoming plan/.test(t),done:!!d.getElementById('doneExBtn')};};
(async()=>{
 { const b=await boot();b.run(SEED('','EZ Bar Curl\n75 lb × 10 10 10 10'));
   let c=card(b);
   ok("before logging: Saturday's plan still previews", c.sat&&c.preview, JSON.stringify(c));
   b.run(LOG(2));c=card(b);
   ok("logged tonight: no \"Unlinked\", no Saturday column", !c.unlinked&&!c.sat&&!c.preview, JSON.stringify(c));
   ok("and \"Done with EZ Bar Curl\" is there", c.done, JSON.stringify(c));
   const r=[...b.w.document.querySelectorAll('.sc-history')].length, n=[...b.w.document.querySelectorAll('.sc-now')].length;
   ok('sets line up with last time, row by row (4 last, 2 logged)', r>=4 && n>=2, JSON.stringify({r,n}));
   ok("Saturday's plan itself is untouched", b.run(`DB.week.days['2026-09-26'].items[0].ex`)==='EZ Bar Curl');
 }
 { const b=await boot();b.run(SEED('EZ Bar Curl\n65 lb × 12 12 12 12','EZ Bar Curl\n75 lb × 10 10 10 10'));
   b.run(LOG(2));
   const linked=JSON.parse(b.run(`JSON.stringify(DB.days[todayISO].w.map(s=>!!s.planRef))`)),c=card(b);
   ok("today's own plan: sets link without a tap, as before", linked.join()==='true,true' && !c.unlinked, JSON.stringify({linked,c}));
 }
 console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
