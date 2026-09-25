/* test-plan-fold.js DIR — v4.6.137: once today's workout has started, tomorrow folds.
 * Real: every script in index.html order and pwTodayHTML(). Faked: nothing but the date.
 * The maker's report (2026-09-25): mid-workout, Today's plan showed "1 more plan · Sat"
 * AND a separate "Tomorrow · Sat" card -- the same plan twice. Rule: with a plan today
 * and a set logged, the next plan lives only in the fold. Before the first set nothing
 * changes, and every future plan appears exactly once. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
const TODAY='2026-09-25',TOM='2026-09-26',SUN='2026-09-27';
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
  run(`todayISO='${TODAY}';checkDate=()=>false;`);
  return run;
}
const plan=t=>`planItemsFrom(pwRead(${JSON.stringify(t)}))`;
function look(run){
  const out=JSON.parse(run(`(()=>{const t=document.createElement('template');t.innerHTML=pwTodayHTML();
    const cards=[...t.content.querySelectorAll('.pw-future')].map(e=>e.dataset.pwFold);
    const folded=[...t.content.querySelectorAll('.pw-later-day')].map(e=>e.dataset.pwFold);
    const more=t.content.querySelector('.pw-later-heading span')?.textContent||'';
    return JSON.stringify({cards,folded,more,push:!!t.content.querySelector('.pw-push'),today:!!t.content.querySelector('[data-pw-fold="today"]')});})()`));
  return out;
}
(async()=>{
 const legs=plan('Dumbbell Lunge\n50 lb × 10 10 10\nStanding Calf Raise\n135 lb × 12 12 12'),arms=plan('Barbell Curl\n60 lb × 10 10 10');
 /* 1. the maker's case: today planned, a set logged, tomorrow planned */
 { const run=await boot();
   run(`DB.week={days:{'${TODAY}':${legs},'${TOM}':${arms}}};DB.days['${TODAY}']={w:[{ex:'Dumbbell Lunge',part:'Legs',w:50/2.2046,reps:[10],at:Date.now()}]};SEED=deriveAll();`);
   const L=look(run);
   ok('started today: no separate Tomorrow card', L.cards.length===0, JSON.stringify(L));
   ok('tomorrow lives in the fold, once', L.folded.join()==='later:'+TOM && /^1 more plan$/.test(L.more), JSON.stringify(L));
   ok("today's plan still on top", L.today);
 }
 /* 2. before the first set: unchanged -- the push line, tomorrow in the fold */
 { const run=await boot();
   run(`DB.week={days:{'${TODAY}':${legs},'${TOM}':${arms}}};SEED=deriveAll();`);
   const L=look(run);
   ok('not started yet: unchanged (push line, tomorrow folded)', L.push && L.cards.length===0 && L.folded.join()==='later:'+TOM, JSON.stringify(L));
 }
 /* 3. no plan today: the next plan is the headline card, not folded */
 { const run=await boot();
   run(`DB.week={days:{'${TOM}':${arms},'${SUN}':${legs}}};DB.days['${TODAY}']={w:[{ex:'Barbell Curl',part:'Biceps',w:25,reps:[10],at:Date.now()}]};SEED=deriveAll();`);
   const L=look(run);
   ok('no plan today: tomorrow is the headline card; only later plans fold', L.cards.join()==='future:'+TOM && L.folded.join()==='later:'+SUN, JSON.stringify(L));
 }
 /* 4. started, two future plans: both fold, each once */
 { const run=await boot();
   run(`DB.week={days:{'${TODAY}':${legs},'${TOM}':${arms},'${SUN}':${legs}}};DB.days['${TODAY}']={w:[{ex:'Dumbbell Lunge',part:'Legs',w:22,reps:[10],at:Date.now()}]};SEED=deriveAll();`);
   const L=look(run);
   ok('started with two plans ahead: "2 more plans", each exactly once', L.cards.length===0 && L.folded.join()===`later:${TOM},later:${SUN}` && /^2 more plans$/.test(L.more), JSON.stringify(L));
 }
 console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
