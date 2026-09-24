/* test-signin-merge.js DIR — v4.6.112: the first pull after sign-in combines days.
 * The incident (2026-09-24): sets logged in the PWA in the morning were
 * replaced by test sets logged in the signed-out iOS build, because sign-in's
 * pull kept whichever copy of the day was newer, whole. Faked: the network and
 * the injected Browser/App plugins. Real: every script in index.html order and
 * both sign-in paths (the web hash return and the iOS app link).
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
const SB='https://proj.supabase.co', ANON='anon-key-123', LINK='co.yooooooooo.showup://login';
const tick=()=>new Promise(r=>setTimeout(r,0));
const settle=async(n=40)=>{for(let i=0;i<n;i++)await tick();};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const TODAY='2026-09-24', YDAY='2026-09-23';
const T0=Date.parse('2026-09-24T12:00:00Z');
const set=(ex,w,r,at)=>({part:'Chest',ex,w,reps:[r],at});
const PWA=[set('Bench Press',185,5,T0-3e6),set('Bench Press',185,5,T0-2.9e6),set('Incline DB Press',60,8,T0-2.5e6)];
const XC=[set('Pull Up',0,8,T0-60e3)];

/* remote: a function returning the cloud doc for each GET, or a status number */
async function boot({native=true,local={},remote=()=>null,getDelays=[],webReturn=false}={}){
  const url='https://tahros.github.io/showup/'+(webReturn?'#access_token=WEBAT&refresh_token=WEBRT&expires_in=3600':'');
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url,runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext(),pushes=[],gets=[];
  w.localStorage.setItem('showup:planning-interface','previous');
  w.localStorage.setItem('tracker-v1',JSON.stringify({days:local,settings:{cloud:{url:SB,anon:ANON}}}));
  if(!w.crypto||!w.crypto.getRandomValues) Object.defineProperty(w,'crypto',{value:{},configurable:true});
  w.crypto.getRandomValues=a=>crypto.randomFillSync(a);
  if(!w.crypto.subtle) Object.defineProperty(w.crypto,'subtle',{value:crypto.webcrypto.subtle,configurable:true});
  if(native){
    const P={Browser:{open(){return Promise.resolve();},close(){return Promise.resolve();}},
             App:{addListener(){return Promise.resolve({remove(){}});},getLaunchUrl(){return Promise.resolve(undefined);}}};
    w.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins:P,isPluginAvailable:n=>!!P[n]};
  }
  let getN=0;
  w.fetch=async(u,o={})=>{u=String(u);
    if(u.includes('grant_type=pkce')) return {ok:true,status:200,json:async()=>({access_token:'AT',refresh_token:'RT',expires_in:3600,user:{id:'u1',email:'me@x.co'}})};
    if(u.includes('/auth/v1/user')) return {ok:true,status:200,json:async()=>({id:'u1',email:'me@x.co'})};
    if(u.includes('/rest/v1/app_state')&&(o.method||'GET')==='GET'){
      const i=getN++; gets.push(i); if(getDelays[i]) await wait(getDelays[i]);
      const r=remote(i);
      if(typeof r==='number') return {ok:false,status:r,json:async()=>({})};
      const doc=JSON.parse(JSON.stringify(r));
      return {ok:true,status:200,json:async()=>doc?[{doc,updated_at:new Date().toISOString()}]:[]};
    }
    if(u.includes('/rest/v1/app_state')&&o.method==='POST'){ pushes.push(JSON.parse(o.body)); return {ok:true,status:201,json:async()=>({})}; }
    throw new Error('offline');
  };
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(srcs[s],ctx,{filename:s});
  vm.runInContext(`todayISO='${TODAY}';checkDate=()=>false;`,ctx);
  await settle();
  const run=c=>vm.runInContext(c,ctx);
  const sets=d=>run(`JSON.stringify((DB.days['${d}']||{}).w||[])`);
  const exs=d=>JSON.parse(sets(d)).map(s=>s.ex+'@'+s.w+'x'+s.reps[0]);
  return {w,run,pushes,gets,exs,
    signIn:async()=>{ run('signInGoogle()'); await settle();
      await run(`handleAuthLink('${LINK}?code=abc12345')`); await settle(80); }};
}
const cloud=(todayUpd,extra={})=>({days:{[TODAY]:{w:PWA,upd:todayUpd,doneEx:['Bench Press']},[YDAY]:{w:[set('Squat',225,5,T0-86e6)],upd:T0-86e6}},settings:{},settingsAt:0,...extra});
const localXC=upd=>({[TODAY]:{w:XC,upd}});

(async()=>{
 /* 1. the incident: the signed-out device's day is NEWER than the cloud's */
 { const b=await boot({local:localXC(T0),remote:()=>cloud(T0-2e6)});
   ok('before sign-in: the iOS build has only its own set', b.exs(TODAY).join()==='Pull Up@0x8');
   await b.signIn();
   const e=b.exs(TODAY);
   ok('after sign-in: today holds BOTH devices\' sets', e.length===4 && e.includes('Pull Up@0x8') && e.filter(x=>x.startsWith('Bench')).length===2, e.join(' | '));
   ok('in the order they were logged', e[0]==='Bench Press@185x5' && e[3]==='Pull Up@0x8', e.join(' | '));
   ok('the cloud\'s completion state comes along', b.run(`(DB.days['${TODAY}'].doneEx||[]).includes('Bench Press')`));
   ok('the combined day is stamped now, so other devices take it whole', b.run(`Math.abs(DB.days['${TODAY}'].upd-Date.now())<5000`));
   ok('a day only the cloud had is adopted', b.exs(YDAY).join()==='Squat@225x5');
   await wait(1500); await settle();
   const last=b.pushes[b.pushes.length-1];
   ok('the push carries the combined day', last && last.doc.days[TODAY].w.length===4, b.pushes.length+' pushes');
 }
 /* 2. the cloud's day is the newer one: still combined, not replaced */
 { const b=await boot({local:localXC(T0-3e6),remote:()=>cloud(T0)});
   await b.signIn();
   ok('cloud newer: still both, nothing discarded', b.exs(TODAY).length===4, b.exs(TODAY).join(' | '));
 }
 /* 3. the same set on both sides is not doubled */
 { const b=await boot({local:{[TODAY]:{w:[PWA[0],...XC],upd:T0}},remote:()=>cloud(T0-2e6)});
   await b.signIn();
   ok('a set both sides have appears once', b.exs(TODAY).length===4, b.exs(TODAY).join(' | '));
 }
 /* 4. only the FIRST pull combines: after that, newest-wins, so deletions travel */
 { let n=0; const b=await boot({local:localXC(T0),remote:i=>{
     if(i===0) return cloud(T0-2e6);
     return {days:{[TODAY]:{w:[PWA[0]],upd:Date.now()+60e3}},settings:{},settingsAt:0};}});
   await b.signIn();
   ok('first pull combined', b.exs(TODAY).length===4);
   await b.run('cloudPull()'); await settle();
   ok('the next pull honours a newer day whole (a deletion elsewhere sticks)', b.exs(TODAY).join()==='Bench Press@185x5', b.exs(TODAY).join(' | '));
 }
 /* 5. two pulls in flight: the plain one lands first, and it must be the one that combines */
 { const b=await boot({local:localXC(T0),remote:()=>cloud(T0-2e6),getDelays:[80,0]});
   b.run('signInGoogle()'); await settle();
   const p=b.run(`handleAuthLink('${LINK}?code=abc12345')`);
   await settle(); b.run('cloudPull()');
   await p; await wait(200); await settle(80);
   ok('race: whichever pull merges first combines, and the later one keeps the result', b.exs(TODAY).length===4, b.exs(TODAY).join(' | ')+' gets='+b.gets.length);
 }
 /* 6. a failed pull does not spend the combine */
 { const b=await boot({local:localXC(T0),remote:i=>i===0?500:cloud(T0-2e6)});
   await b.signIn();
   ok('the failed first pull changed nothing', b.exs(TODAY).join()==='Pull Up@0x8');
   await b.run('cloudPull()'); await settle();
   ok('the next successful pull still combines', b.exs(TODAY).length===4, b.exs(TODAY).join(' | '));
 }
 /* 7. an ordinary open (no sign-in) is untouched: newest-wins */
 { const b=await boot({native:false,local:localXC(T0),remote:()=>cloud(T0+60e3)});
   b.run(`session={access_token:'AT',refresh_token:'RT',expires_at:Date.now()+3600e3,user:{id:'u1'}}`);
   await b.run('cloudPull()'); await settle();
   ok('no sign-in: a newer cloud day still replaces (sync between synced devices unchanged)', b.exs(TODAY).length===3 && !b.exs(TODAY).includes('Pull Up@0x8'), b.exs(TODAY).join(' | '));
 }
 /* 8. the web sign-in return combines too */
 { const b=await boot({native:false,webReturn:true,local:localXC(T0),remote:()=>cloud(T0-2e6)});
   await wait(200); await settle(80);
   ok('web: signing in via the page return combines the day', b.exs(TODAY).length===4, b.exs(TODAY).join(' | '));
 }
 console.log(fails?`\n${fails} FAILED`:'\nall passed');
 process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
