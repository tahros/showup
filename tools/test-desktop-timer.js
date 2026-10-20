/* test-desktop-timer.js DIR -- v4.6.362: the big clock is for a phone turned sideways.
 * On a desktop browser (wider than tall, mouse, tall screen) the blue "Since workout" clock took
 * over the whole app after a finished workout and could not be left. It now needs landscape AND
 * a touch screen AND a phone's short side -- the same test as the portrait veil.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined&&!c?' → '+JSON.stringify(g):''));if(!c)fails++;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
function media(dev){return q=>{const has=k=>q.includes(k);let m=true;
  if(has('orientation:landscape'))m=m&&dev.landscape;if(has('orientation:portrait'))m=m&&!dev.landscape;
  if(has('pointer:coarse'))m=m&&dev.coarse;if(has('pointer:fine'))m=m&&!dev.coarse;if(has('hover:hover'))m=m&&!dev.coarse;
  const mh=q.match(/max-height:\s*(\d+)px/);if(mh)m=m&&dev.h<=+mh[1];
  if(has('prefers-reduced-motion:reduce'))m=false;if(!/orientation|pointer|hover|max-height|reduced-motion|no-preference/.test(q))m=false;
  return {matches:m,addEventListener(){},removeEventListener(){}};};}
async function boot(dev,{live=false}={}){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext();w.matchMedia=media(dev);
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('offline');};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  const at=Date.now()-3*3600e3;
  const days={'2026-10-19':{w:[{part:'Chest',ex:'Bench Press',w:60,reps:[8],at}],doneAll:!live,completedAt:live?undefined:at+60000,upd:1}};
  w.localStorage.setItem('tracker-v1',JSON.stringify({days,settings:{onboarded:true,unit:'lb'}}));
  for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
  vm.runInContext(`todayISO='2026-10-19';checkDate=()=>false;`,ctx);await sleep(300);
  if(live)vm.runInContext(`lastSetAt=Date.now()-30000;`,ctx);
  vm.runInContext(`tickRest();tickBig();`,ctx);await sleep(50);
  return {run:c=>vm.runInContext(c,ctx),w};
}
(async()=>{
  const desktop={landscape:true,coarse:false,h:900},phone={landscape:true,coarse:true,h:402},upright={landscape:false,coarse:true,h:874},ipad={landscape:true,coarse:true,h:1024};
  let a=await boot(desktop);
  ok('desktop browser, workout finished: no big clock',!a.run(`document.documentElement.classList.contains('bigtimer')`)&&!a.run(`document.getElementById('hTimer').classList.contains('recovery')`));
  ok('...and the app stays reachable (the timer is back in the header)',a.run(`document.getElementById('hTimer').parentElement!==document.body`));
  a=await boot(desktop,{live:true});
  ok('desktop browser, mid-workout: no full-screen set timer either',!a.run(`document.documentElement.classList.contains('bigtimer')`));
  a=await boot(phone);
  ok('phone turned sideways, workout finished: the blue clock, as designed',a.run(`document.documentElement.classList.contains('bigtimer')`)&&a.run(`document.getElementById('hTimer').classList.contains('recovery')`));
  a=await boot(phone,{live:true});
  ok('phone turned sideways, mid-workout: the red set timer, as designed',a.run(`document.documentElement.classList.contains('bigtimer')`)&&!a.run(`document.getElementById('hTimer').classList.contains('recovery')`));
  a=await boot(upright);
  ok('phone upright: no big clock',!a.run(`document.documentElement.classList.contains('bigtimer')`));
  a=await boot(ipad);
  ok('tablet sideways (tall screen): no big clock, same as the portrait veil',!a.run(`document.documentElement.classList.contains('bigtimer')`));
  const css=fs.readFileSync(path.join(dir,'css/app.css'),'utf8'),js=fs.readFileSync(path.join(dir,'js/derive.js'),'utf8');
  ok('one definition of a phone sideways, shared with the portrait veil',css.includes('(orientation:landscape) and (pointer:coarse) and (max-height:500px)')&&js.includes("'(orientation:landscape) and (pointer:coarse) and (max-height:500px)'")&&!/matchMedia\('\(orientation:landscape\)'\)/.test(js));
  console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
