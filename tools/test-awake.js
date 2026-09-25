/* test-awake.js DIR — v4.6.136: the iOS app keeps the screen awake natively.
 * Faked: the ShowUpAwake plugin (tools/ios-config.py), orientation and the clock.
 * Real: every script in index.html order, tickRest/tickWake/syncWakeLock.
 * Rule (maker's option B): awake only while a workout is live, the phone is
 * sideways and the rest timer is showing -- which ends 30 minutes after the
 * last set -- and off the moment any of those stops, or the app is hidden. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
async function boot({shell=true,plugin=true,how='plugins'}={}){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext(),calls=[];
  w.localStorage.setItem('showup:planning-interface','previous');
  w.localStorage.setItem('tracker-v1',JSON.stringify({days:{},settings:{onboarded:true}}));
  if(shell){
    const A={set(o){calls.push(o.on);return Promise.resolve({on:o.on});}};
    const cap={isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins:{Filesystem:{}},isPluginAvailable:n=>plugin&&how==='plugins'&&n==='ShowUpAwake'};
    if(plugin&&how==='plugins')cap.Plugins.ShowUpAwake=A;
    if(plugin&&how==='headers'){cap.PluginHeaders=[{name:'ShowUpAwake',methods:[]}];cap.nativePromise=(p,m,o)=>A[m](o);}
    w.Capacitor=cap;
  }
  let landscape=false;
  w.matchMedia=q=>({matches:/landscape/.test(q)?landscape:false,addEventListener(){},removeEventListener(){}});
  w.fetch=()=>Promise.reject(new Error('offline'));w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(srcs[s],ctx,{filename:s});
  for(let i=0;i<60;i++) await new Promise(r=>setTimeout(r,0));
  const run=c=>vm.runInContext(c,ctx);
  run(`DB.days[todayISO]={w:[{ex:'Squat',part:'Legs',w:100,reps:[5],at:Date.now()-60e3}]};`);   // a live session
  const step=async()=>{run('tickRest();tickWake();');for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,0));};
  return {w,run,calls,step,turn:v=>{landscape=v;}};
}
(async()=>{
 { const b=await boot();
   b.run(`lastSetAt=Date.now()-60e3`);await b.step();
   ok('upright, timer running: not held', b.calls.length===0, JSON.stringify(b.calls));
   b.turn(true);await b.step();
   ok('sideways + live + timer showing: iOS told to stay awake', b.calls.join()==='true', JSON.stringify(b.calls));
   await b.step();await b.step();
   ok('told once, not every second', b.calls.length===1);
   b.turn(false);await b.step();
   ok('turned upright: released', b.calls.join()==='true,false');
   b.turn(true);await b.step();
   b.run(`lastSetAt=Date.now()-31*60e3`);await b.step();
   ok('30 minutes after the last set the timer ends, and so does staying awake', b.calls.join()==='true,false,true,false', JSON.stringify(b.calls));
   b.run(`lastSetAt=Date.now()-60e3`);await b.step();
   b.run(`DB.days[todayISO].doneAll=true`);await b.step();
   ok('workout finished: released', b.calls.at(-1)===false && b.calls.length===6, JSON.stringify(b.calls));
   b.run(`DB.days[todayISO].doneAll=false`);await b.step();
   Object.defineProperty(b.w.document,'hidden',{configurable:true,get:()=>true});
   b.run(`syncWakeLock()`);await b.step();
   ok('app hidden: released', b.calls.at(-1)===false, JSON.stringify(b.calls));
 }
 { const b=await boot({how:'headers'});b.turn(true);b.run(`lastSetAt=Date.now()-60e3`);await b.step();
   ok('reached through the bridge header when no proxy exists', b.calls.join()==='true', JSON.stringify(b.calls)); }
 { const b=await boot({plugin:false});b.turn(true);b.run(`lastSetAt=Date.now()-60e3`);await b.step();
   ok('older iOS build without the plugin: nothing native called (web Wake Lock path unchanged)', b.calls.length===0); }
 { const b=await boot({shell:false});b.turn(true);b.run(`lastSetAt=Date.now()-60e3`);await b.step();
   ok('the website: nothing native called', b.calls.length===0); }
 console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
