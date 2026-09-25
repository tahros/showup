/* test-health.js DIR — v4.6.132: Apple Health, write-only, iOS app only.
 * Faked: the ShowUpHealth plugin the app registers natively (tools/ios-config.py).
 * Real: every script in index.html order, the ledger, stampWorkoutCompletion,
 * the Settings card and its handler. Today is pinned to 2030-01-07.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
const TODAY='2030-01-07', T=h=>+new Date(TODAY+'T00:00')+h*3600e3;
async function boot({shell=true,plugin=true,grant='authorized',prefs=null,days={},how='plugins'}={}){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext(),calls=[],saved=[];
  w.localStorage.setItem('showup:planning-interface','previous');
  w.localStorage.setItem('tracker-v1',JSON.stringify({days,settings:{onboarded:true}}));
  if(prefs) w.localStorage.setItem('showup:health',JSON.stringify(prefs));
  if(shell){
    const H={
      status(){calls.push('status');return Promise.resolve({status:grant==='authorized'?'authorized':'notDetermined'});},
      requestAuthorization(){calls.push('auth');return Promise.resolve({status:grant});},
      saveWorkout(o){calls.push('save');saved.push(o);return Promise.resolve({saved:true,uuid:'u'+saved.length});},
    };
    const Plugins={Filesystem:{}};
    const cap={isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins,isPluginAvailable:n=>plugin&&how==='plugins'&&n==='ShowUpHealth'};
    if(plugin&&how==='plugins') Plugins.ShowUpHealth=H;
    if(plugin&&how==='headers'){ cap.PluginHeaders=[{name:'ShowUpHealth',methods:[]}]; cap.nativePromise=(p,m,o)=>H[m](o); }
    w.Capacitor=cap;
  }
  w.fetch=()=>Promise.reject(new Error('offline'));
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(srcs[s],ctx,{filename:s});
  for(let i=0;i<60;i++) await new Promise(r=>setTimeout(r,0));
  vm.runInContext(`todayISO='${TODAY}';checkDate=()=>false;SEED=deriveAll();`,ctx);
  const run=c=>vm.runInContext(c,ctx);
  const settle=async()=>{for(let i=0;i<30;i++)await new Promise(r=>setTimeout(r,0));};
  return {w,run,calls,saved,settle,toast:()=>w.document.getElementById('toast')?.textContent||''};
}
const lift=(h,ex='Bench Press')=>({part:'Chest',ex,w:100,reps:[5],at:T(h)});
const cardio=(h,ex,km,mins)=>({part:'Cardio',ex,w:km,mins,secs:0,at:T(h)});
const J=o=>JSON.stringify(o);

(async()=>{
 /* 1. the website, and an older iOS build that has no Health plugin */
 { const b=await boot({shell:false});
   ok('browser: no plugin, nothing sent', await b.run(`healthOnComplete({w:[]},Date.now())`)==='no-shell');
   b.run('renderSync()'); ok('browser: Settings has no Apple Health card', !b.w.document.querySelector('[data-hl]'));
 }
 { const b=await boot({plugin:false});
   ok('an iOS build without the plugin (before the Mac rebuild): no card, no calls', b.run('hlPlugin()')===null && (b.run('renderSync()'),!b.w.document.querySelector('[data-hl]')));
 }
 /* 2. the plugin found through its header alone (no proxy object) */
 { const b=await boot({how:'headers',prefs:{on:true}});
   ok('plugin reached through the bridge header + nativePromise when no proxy exists', !!b.run('hlPlugin()') && (await b.run(`healthOnComplete({w:[${J(lift(9))},${J(lift(9.5))}]},${T(10)})`))==='saved:1');
 }
 /* 3. off by default */
 { const b=await boot({days:{[TODAY]:{w:[lift(9),lift(9.5)]}}});
   ok('off by default: no permission prompt at launch', b.calls.length===0);
   b.run(`stampWorkoutCompletion(DB.days[todayISO],${T(10)})`); await b.settle();
   ok('off: pressing Finish writes nothing to Health', b.saved.length===0 && !b.calls.includes('auth'));
   b.run('renderSync()'); const d=b.w.document;
   ok('iOS app: Settings shows the Apple Health card, Off selected', !!d.querySelector('[data-hl="off"].sel'));
   ok('and says it never reads, and nothing earlier is sent', /never reads your Health data/.test(d.body.textContent) && /nothing earlier is sent/.test(d.body.textContent));
   /* 4. turning it on from the card */
   d.querySelector('[data-hl="on"]').dispatchEvent(new b.w.MouseEvent('click',{bubbles:true})); await b.settle();
   ok('On: asks iOS, then the switch holds, on this device only', b.calls.includes('auth') && JSON.parse(b.w.localStorage.getItem('showup:health')).on===true && b.run('!("health" in DB.settings)'));
   ok('the card re-renders with On selected', !!d.querySelector('[data-hl="on"].sel'));
 }
 /* 5. permission refused */
 { const b=await boot({grant:'denied'});
   ok('refused: stays off and says where to allow it', await b.run('healthToggle(true)')==='denied' && JSON.parse(b.w.localStorage.getItem('showup:health')).on===false && /Health app/.test(b.toast()), b.toast());
 }
 { const b=await boot({grant:'unavailable'});
   ok('no Health on this device: says so, stays off', await b.run('healthToggle(true)')==='unavailable' && !JSON.parse(b.w.localStorage.getItem('showup:health')||'{}').on);
 }
 /* 6. what a finished session becomes */
 { const b=await boot();
   const W=rows=>JSON.parse(b.run(`JSON.stringify(hlWorkouts(todayISO,${J(rows)},${T(10)}))`));
   let w=W([lift(9),lift(9.4),lift(9.8)]);
   ok('lifting: one strength workout, first set to the moment Finish was pressed', w.length===1 && w[0].activity==='strength' && w[0].start===T(9) && w[0].end===T(10), J(w));
   w=W([cardio(9.5,'Run',5,30)]);
   ok('a run: its own workout, ending when logged, lasting its time, with metres', w.length===1 && w[0].activity==='running' && w[0].end===T(9.5) && w[0].start===T(9.5)-30*60e3 && w[0].meters===5000, J(w));
   w=W([lift(8),lift(8.8),cardio(9.5,'Cycling',20,30)]);
   ok('lifting then a ride: strength ends at the last set, the ride is separate', w.length===2 && w[0].activity==='strength' && w[0].end===T(8.8) && w[1].activity==='cycling' && w[1].meters===20000, J(w));
   w=W([cardio(9,'Elliptical',0,20),cardio(9.5,'Swimming',1.5,40),cardio(9.8,'Rowing',2,10)]);
   ok('elliptical has no distance; swim and row carry theirs', J(w.map(x=>[x.activity,x.meters||0]))===J([['elliptical',0],['swimming',1500],['rowing',2000]]), J(w));
   w=W([cardio(9,'Walk',0,25)]);
   ok('a walk with no distance logged: time only, no invented metres', w.length===1 && w[0].activity==='walking' && !('meters' in w[0]), J(w));
   w=W([{...lift(9),at:undefined},lift(9.5)]);
   ok('a set without a recorded time: the strength workout is skipped, not guessed', w.length===0, J(w));
   w=JSON.parse(b.run(`JSON.stringify(hlWorkouts(todayISO,${J([lift(9.99)])},${T(9.99)+20e3}))`));
   ok('under a minute: skipped', w.length===0, J(w));
   w=W([{...lift(9),ex:'Cycling',part:'Legs',reps:[12]}]);
   ok('a "Cycling" row with reps is a set (the record\'s own rule), so it is strength', w.length===1 && w[0].activity==='strength', J(w));
   ok('no calories, no heart rate, nothing unmeasured', !J(W([lift(9),cardio(9.5,'Run',5,30)])).match(/energy|kcal|calor|heart/i));
 }
 /* 7. once per session */
 { const b=await boot({prefs:{on:true},days:{[TODAY]:{w:[lift(9),lift(9.5)]}}});
   b.run(`stampWorkoutCompletion(DB.days[todayISO],${T(10)})`); await b.settle();
   ok('Finish (on): the session is written once', b.saved.length===1 && b.saved[0].id===`showup-${TODAY}-strength-${T(9)}`, J(b.saved));
   b.run(`stampWorkoutCompletion(DB.days[todayISO],${T(10.2)})`); await b.settle();
   ok('pressing Finish again with nothing new: no second write', b.saved.length===1, J(b.saved.map(s=>s.id)));
   b.run(`DB.days[todayISO].w.push(${J(cardio(11,'Run',5,30))});stampWorkoutCompletion(DB.days[todayISO],${T(11.1)})`); await b.settle();
   ok('a run added and finished later: only the new session goes', b.saved.length===2 && b.saved[1].activity==='running', J(b.saved.map(s=>s.id)));
   ok('the sent ids are kept on this device', JSON.parse(b.w.localStorage.getItem('showup:health')).sent.length===2);
 }
 { const b=await boot({prefs:{on:true,sent:[`showup-${TODAY}-strength-${T(9)}`]},days:{[TODAY]:{w:[lift(9),lift(9.5)]}}});
   b.run(`stampWorkoutCompletion(DB.days[todayISO],${T(10)})`); await b.settle();
   ok('already sent from this phone (a reload, a sync): not sent again', b.saved.length===0);
 }
 /* 8. a failed write is retried at the next Finish, not recorded as sent */
 { const b=await boot({prefs:{on:true},days:{[TODAY]:{w:[lift(9),lift(9.5)]}}});
   b.run(`Capacitor.Plugins.ShowUpHealth.saveWorkout=()=>Promise.reject(new Error('nope'))`);
   ok('write refused by iOS: not marked sent', (await b.run(`healthOnComplete(DB.days[todayISO],${T(10)})`))==='saved:0' && JSON.parse(b.w.localStorage.getItem('showup:health')).sent.length===0);
 }
 console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
