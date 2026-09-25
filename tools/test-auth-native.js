/* test-auth-native.js DIR — v4.6.111: Google sign-in inside the iOS app.
 * Faked: the injected Plugins.Browser and Plugins.App, and the network. Real:
 * every script, loaded in index.html order, including the boot that registers
 * the link listener. Each rule in core.js's "sign-in inside the iOS app"
 * header is one assertion here. The PKCE challenge is checked against Node's
 * own SHA-256, and the fallback SHA-256 against it byte for byte.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
const SB='https://proj.supabase.co', ANON='anon-key-123';
const LINK='co.yooooooooo.showup://login';
const b64url=b=>Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const tick=()=>new Promise(r=>setTimeout(r,0));
const settle=async(n=20)=>{for(let i=0;i<n;i++)await tick();};

async function boot({shell=true,plugins=['App','Browser'],launch=null,token=200,noSubtle=false,seed=null}={}){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext(),calls=[],listeners={},fetches=[];
  w.TextEncoder=TextEncoder; // jsdom does not expose the browser encoding API.
  w.localStorage.setItem('showup:planning-interface','previous');
  if(seed) w.localStorage.setItem('showup:pkce',JSON.stringify(seed));
  w.localStorage.setItem('tracker-v1',JSON.stringify({days:{},settings:{cloud:{url:SB,anon:ANON}}}));
  if(!w.crypto||!w.crypto.getRandomValues) Object.defineProperty(w,'crypto',{value:{},configurable:true});
  w.crypto.getRandomValues=a=>crypto.randomFillSync(a);
  if(noSubtle){ try{Object.defineProperty(w.crypto,'subtle',{value:undefined,configurable:true});}catch(e){} }
  else if(!w.crypto.subtle) Object.defineProperty(w.crypto,'subtle',{value:crypto.webcrypto.subtle,configurable:true});
  if(shell){
    const P={};
    if(plugins.includes('Browser')) P.Browser={open(o){calls.push('open');calls.opened=o.url;return Promise.resolve();},close(){calls.push('close');return Promise.resolve();}};
    if(plugins.includes('App')) P.App={addListener(ev,fn){calls.push('listen:'+ev);(listeners[ev]=listeners[ev]||[]).push(fn);return Promise.resolve({remove(){}});},
      getLaunchUrl(){calls.push('launch');return Promise.resolve(launch?{url:launch()}:undefined);}};
    w.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins:P,isPluginAvailable:n=>plugins.includes(n)};
  }
  w.fetch=(u,o={})=>{u=String(u);fetches.push({u,o});
    if(u.startsWith(SB+'/auth/v1/token?grant_type=pkce')){
      if(token==='throw') return Promise.reject(new Error('offline'));
      const body={access_token:'AT',refresh_token:'RT',expires_in:3600,user:{id:'u1',email:'me@x.co'}};
      return Promise.resolve({ok:token===200,status:token,json:()=>Promise.resolve(body)});}
    return Promise.reject(new Error('offline'));};
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(srcs[s],ctx,{filename:s});
  vm.runInContext(`todayISO='2026-09-24';checkDate=()=>false;`,ctx);
  await settle(40);
  const run=c=>vm.runInContext(c,ctx);
  const pkce=()=>JSON.parse(w.localStorage.getItem('showup:pkce')||'null');
  const tokenCalls=()=>fetches.filter(f=>f.u.includes('grant_type=pkce'));
  const toast=()=>w.document.getElementById('toast')?.textContent||'';
  return {w,run,calls,listeners,fetches,pkce,tokenCalls,toast,link:async l=>{const r=await run(`handleAuthLink(${JSON.stringify(l)})`);await settle();return r;}};
}
async function startSignIn(b){ b.run('signInGoogle()'); await settle(); return new URL(b.calls.opened); }

(async()=>{
 /* 1. the fallback SHA-256 is SHA-256 */
 { const b=await boot({shell:false});
   const cases=['','abc','a'.repeat(55),'a'.repeat(56),'a'.repeat(64),'b'.repeat(119),'헬로 ✓',crypto.randomBytes(32).toString('hex')];
   const bad=cases.filter(s=>b.run(`Array.from(sha256js(${JSON.stringify(s)})).map(x=>x.toString(16).padStart(2,'0')).join('')`)!==crypto.createHash('sha256').update(s).digest('hex'));
   ok('sha256js matches Node for empty, block edges (55/56/64), two blocks, unicode, a real verifier', bad.length===0, bad.map(s=>s.length).join(','));
   ok('browser: the boot hook stands down', await b.run('nativeAuthBoot()')==='no-shell');
 }
 /* 2. the web path is unchanged: no Browser plugin is touched */
 { const b=await boot({shell:false});
   try{ b.run('signInGoogle()'); }catch(e){}
   ok('browser: sign-in stores no PKCE verifier (the web path is the old redirect)', b.pkce()===null);
 }
 /* 3. boot: the app listens for links and asks for the launch link */
 { const b=await boot();
   ok('shell: boot registers appUrlOpen', b.calls.includes('listen:appUrlOpen'), b.calls.join(' '));
   ok('shell: boot reads the launch link', b.calls.includes('launch'));
 }
 /* 4. starting sign-in */
 { const b=await boot(); const u=await startSignIn(b); const p=u.searchParams, rec=b.pkce();
   ok('opens the in-app Safari sheet, not a page redirect', b.calls.includes('open') && b.w.location.href.startsWith('https://tahros.github.io/'));
   ok('goes to Supabase authorize', u.origin+u.pathname===SB+'/auth/v1/authorize', u.origin+u.pathname);
   ok('provider google', p.get('provider')==='google');
   ok('redirect_to is the app link, not the web page', p.get('redirect_to')===LINK, p.get('redirect_to'));
   ok('method s256', p.get('code_challenge_method')==='s256');
   ok('apikey rides in the query', p.get('apikey')===ANON);
   ok('a 64-hex verifier is stored with a time', rec && /^[0-9a-f]{64}$/.test(rec.v) && Math.abs(Date.now()-rec.at)<5000);
   ok('the verifier itself never leaves the phone', !u.href.includes(rec.v));
   ok('challenge = base64url(SHA-256(verifier))', p.get('code_challenge')===b64url(crypto.createHash('sha256').update(rec.v).digest()), p.get('code_challenge'));
   /* 5. the happy path back */
   const r=await b.link(LINK+'?code=abc123-DEF_456');
   ok('code link: signed in', r==='signed-in', r);
   ok('the Safari sheet is closed', b.calls.includes('close'));
   const t=b.tokenCalls()[0], body=t&&JSON.parse(t.o.body);
   ok('exchange: one POST to /token?grant_type=pkce', b.tokenCalls().length===1 && t.o.method==='POST');
   ok('exchange: apikey header', t.o.headers.apikey===ANON);
   ok('exchange: body is {auth_code, code_verifier}', body.auth_code==='abc123-DEF_456' && body.code_verifier===rec.v, t.o.body);
   ok('session saved with both tokens and the email', b.run('session&&session.access_token==="AT"&&session.refresh_token==="RT"&&session.user.email==="me@x.co"'));
   ok('session expiry is about an hour out', b.run('Math.abs(session.expires_at-Date.now()-3600e3)<5000'));
   ok('the verifier is spent', b.pkce()===null);
   /* 6. replay */
   b.run('session=null');
   const r2=await b.link(LINK+'?code=abc123-DEF_456');
   ok('replayed link: refused, no second exchange', r2==='no-verifier' && b.tokenCalls().length===1, r2);
 }
 /* 7. the listener path (warm app) */
 { const b=await boot(); await startSignIn(b);
   b.listeners.appUrlOpen[0]({url:LINK+'?code=warmcode99'}); await settle();
   ok('appUrlOpen with a code signs in', b.run('session&&session.access_token==="AT"'));
 }
 /* 8. cold start: the app was killed while the sheet was open, then launched by the link */
 { const v=crypto.randomBytes(32).toString('hex');
   const b=await boot({seed:{v,at:Date.now()-60e3},launch:()=>LINK+'?code=coldcode99'});
   const body=b.tokenCalls()[0]&&JSON.parse(b.tokenCalls()[0].o.body);
   ok('launch link + stored verifier: signed in at boot', b.run('session&&session.access_token==="AT"') && body && body.code_verifier===v && body.auth_code==='coldcode99');
   const c=await boot({launch:()=>LINK+'?code=coldcode99'});
   ok('launch link with no verifier stored: no exchange', c.tokenCalls().length===0 && c.run('session===null'));
 }
 /* 9. expiry */
 { const b=await boot(); await startSignIn(b); const rec=b.pkce();
   b.w.localStorage.setItem('showup:pkce',JSON.stringify({v:rec.v,at:Date.now()-11*60*1000}));
   ok('an 11-minute-old verifier is refused', await b.link(LINK+'?code=abc12345')==='no-verifier' && b.tokenCalls().length===0);
   await startSignIn(b); const rec2=b.pkce();
   b.w.localStorage.setItem('showup:pkce',JSON.stringify({v:rec2.v,at:Date.now()+60*60*1000}));
   ok('a verifier dated in the future is refused', await b.link(LINK+'?code=abc12345')==='no-verifier' && b.tokenCalls().length===0);
   await startSignIn(b); const rec3=b.pkce();
   b.w.localStorage.setItem('showup:pkce',JSON.stringify({v:rec3.v,at:Date.now()-9*60*1000}));
   ok('a 9-minute-old verifier still works', await b.link(LINK+'?code=abc12345')==='signed-in');
 }
 /* 10. links that are not ours */
 { const b=await boot(); await startSignIn(b);
   const bad=['https://evil.example/login?code=abc12345','co.yooooooooo.showup://loginx?code=abc12345','co.yooooooooo.showupx://login?code=abc12345','evil://login?code=abc12345','not a url',null];
   const res=[]; for(const l of bad) res.push(await b.link(l));
   ok('foreign links are ignored', res.every(r=>r==='ignored'), res.join(','));
   ok('and they do not spend the verifier or close the sheet', b.pkce()!==null && !b.calls.includes('close') && b.tokenCalls().length===0);
 }
 /* 11. tokens in a link are never accepted */
 { const b=await boot(); await startSignIn(b);
   const r=await b.link(LINK+'#access_token=FORGEDTOKEN12345&refresh_token=X&expires_in=3600');
   ok('implicit tokens in the link: refused', r==='no-code' && b.run('session===null') && b.tokenCalls().length===0, r);
   await startSignIn(b);
   ok('a code with junk characters is refused', await b.link(LINK+'?code=%3Cscript%3E')==='no-code');
 }
 /* 12. error link */
 { const b=await boot(); await startSignIn(b);
   const r=await b.link(LINK+'?error=access_denied&error_description=User%20cancelled');
   ok('error link: reported, not exchanged', r==='error' && b.tokenCalls().length===0, r);
   ok('the error is shown', /Sign-in failed: User cancelled/.test(b.toast()), b.toast());
   ok('and the verifier is spent', b.pkce()===null);
 }
 /* 13. server says no / network down */
 { const b=await boot({token:400}); await startSignIn(b);
   ok('token 400: rejected, no session', await b.link(LINK+'?code=abc12345')==='rejected' && b.run('session===null'));
   const c=await boot({token:'throw'}); await startSignIn(c);
   ok('token fetch throws: offline, no session', await c.link(LINK+'?code=abc12345')==='offline' && c.run('session===null'));
 }
 /* 14. no crypto.subtle (not a secure context): same challenge from the fallback */
 { const b=await boot({noSubtle:true});
   const u=await startSignIn(b), rec=b.pkce();
   ok('without crypto.subtle the challenge is still correct', rec && u.searchParams.get('code_challenge')===b64url(crypto.createHash('sha256').update(rec.v).digest()));
 }
 /* 15. an old app binary without the Browser plugin */
 { const b=await boot({plugins:['App']});
   let threw=false; try{ b.run('signInGoogle()'); await settle(); }catch(e){ threw=true; }
   ok('no Browser plugin: says so, does not throw, stores nothing', !threw && b.pkce()===null && /app update/.test(b.toast()), b.toast());
 }
 console.log(fails?`\n${fails} FAILED`:'\nall passed');
 process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
