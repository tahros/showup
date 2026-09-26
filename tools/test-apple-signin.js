/* test-apple-signin.js DIR — v4.6.145: Sign in with Apple (App Review 4.8), and revoking it.
 * Real: every script in index.html order; supabase/functions/apple-link and
 * delete-account, imported and driven with fakes behind their injected fetch;
 * the ES256 client secret, verified against a key made here.
 * Faked: the ShowUpApple plugin, Supabase, Apple.
 * Rules: the button exists only in a build whose capability is on; Apple gets
 * sha256(nonce), Supabase the raw nonce; a relay email is an ordinary email;
 * cancelling is silent; a refusal leaves you signed out; apple-link stores a
 * refresh token only for the caller's own account, only with the secrets;
 * deleting the account revokes it at Apple first. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),nodeCrypto=require('crypto');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
const settle=async(n=40)=>{for(let i=0;i<n;i++)await new Promise(r=>setTimeout(r,0));};
const RELAY='x7y2k9q4mz@privaterelay.appleid.com';

async function boot({shell=true,plugin=true,enabled=true,apple=async o=>({idToken:'apple.id.token',code:'c0de-abcdef-12345'}),supabase=()=>({status:200,body:{access_token:'at',refresh_token:'rt',expires_in:3600,user:{id:'u-1',email:RELAY}}})}={}){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext(),calls=[],asked=[];
  w.localStorage.setItem('showup:planning-interface','previous');
  w.localStorage.setItem('tracker-v1',JSON.stringify({days:{},settings:{onboarded:true}}));
  if(shell){
    const A={status:async()=>({enabled}),signIn:async o=>{asked.push(o);return apple(o);}};
    const cap={isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins:{Filesystem:{}},isPluginAvailable:n=>plugin&&n==='ShowUpApple'};
    if(plugin)cap.Plugins.ShowUpApple=A;
    w.Capacitor=cap;
  }
  w.fetch=async(u,o={})=>{
    u=String(u);calls.push({u,o,body:o.body?JSON.parse(o.body):null});
    if(u.includes('/auth/v1/token?grant_type=id_token')){const r=supabase(o);return {ok:r.status<300,status:r.status,json:async()=>r.body};}
    if(u.includes('/functions/v1/apple-link')) return {ok:true,status:200,json:async()=>({stored:true})};
    throw new Error('offline');
  };
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(srcs[s],ctx,{filename:s});
  await settle(60);
  const run=c=>vm.runInContext(c,ctx);
  await run('appleSignInBoot()');
  return {w,run,calls,asked,toast:()=>w.document.getElementById('toast')?.textContent||''};
}
const openSettings=b=>{b.run(`view='sync';render();`);return b.w.document;};

async function client(){
  { const b=await boot();
    const d=openSettings(b);
    ok('capability on, signed out: Continue with Apple is shown, above Google', !!d.getElementById('appleBtn') && d.getElementById('appleBtn').compareDocumentPosition(d.getElementById('googleBtn'))&4);
    ok('the button carries the system Apple glyph and the words', /Continue with Apple/.test(d.getElementById('appleBtn').textContent) && d.querySelector('#appleBtn .apple-glyph').textContent==='');
    b.run(`window.__t=[];const __toast=toast;toast=function(m){__t.push(String(m));return __toast.apply(this,arguments);};`);
    d.getElementById('appleBtn').dispatchEvent(new b.w.MouseEvent('click',{bubbles:true}));await settle(80);
    const tok=b.calls.find(c=>c.u.includes('grant_type=id_token'));
    ok('Supabase gets the Apple identity token, provider apple', tok && tok.body.provider==='apple' && tok.body.id_token==='apple.id.token');
    const raw=tok?.body.nonce||'', hashed=b.asked[0]?.nonce||'';
    ok('Apple is given sha256(nonce); Supabase the raw nonce', raw.length===64 && hashed===nodeCrypto.createHash('sha256').update(raw).digest('hex'), hashed.slice(0,12)+' vs '+raw.slice(0,12));
    ok('signed in, with the hide-my-email relay address as the email', b.run('session&&session.user.email')===RELAY && b.run('__t.some(m=>/^Signed in as x7y2/.test(m))'), b.run('JSON.stringify(__t)'));
    const link=b.calls.find(c=>c.u.includes('/functions/v1/apple-link'));
    ok('the one-time code goes to apple-link, with the new session\'s token', link && link.body.code==='c0de-abcdef-12345' && link.o.headers.Authorization==='Bearer at');
    ok('Settings flips to signed in (the Apple button is gone)', (b.run(`view='sync';render();`),!b.w.document.getElementById('appleBtn')));
  }
  { const b=await boot({enabled:false});
    ok('capability off (a personal-team build): no Apple button, and signing in is refused', !openSettings(b).getElementById('appleBtn') && (await b.run('signInApple()'))==='unavailable');
  }
  { const b=await boot({plugin:false});
    ok('an older build without the plugin: no Apple button', !openSettings(b).getElementById('appleBtn'));
  }
  { const b=await boot({shell:false});
    ok('the website: no Apple button', !openSettings(b).getElementById('appleBtn'));
  }
  { const b=await boot({apple:async()=>{throw new Error('cancelled');}});
    const r=await b.run('signInApple()');
    ok('cancelling Apple\'s sheet: quiet, nothing sent, still signed out', r==='cancelled' && !b.calls.length && !b.run('session') && !/did not finish/.test(b.toast()));
  }
  { const b=await boot({apple:async()=>{throw new Error('failed');}});
    const r=await b.run('signInApple()');
    ok('Apple fails: says so plainly, signed out', r==='failed' && /did not finish/.test(b.toast()) && !b.run('session'));
  }
  { const b=await boot({supabase:()=>({status:400,body:{}})});
    const r=await b.run('signInApple()');
    ok('Supabase refuses the token: toast, no session, no apple-link call', r==='rejected' && !b.run('session') && !b.calls.some(c=>c.u.includes('apple-link')));
  }
}

/* ---------------- server ---------------- */
const SB='https://proj.supabase.co',ANON='anon-key-123',SERVICE='service-role-xyz',UID='11111111-2222-3333-4444-555555555555';
const {privateKey,publicKey}=nodeCrypto.generateKeyPairSync('ec',{namedCurve:'P-256'});
const PEM=privateKey.export({type:'pkcs8',format:'pem'});
const baseEnv={SUPABASE_URL:SB,SUPABASE_ANON_KEY:ANON,SUPABASE_SERVICE_ROLE_KEY:SERVICE};
const appleEnv={...baseEnv,APPLE_TEAM_ID:'TEAM123456',APPLE_KEY_ID:'KEY1234567',APPLE_PRIVATE_KEY:PEM.replace(/\n/g,'\\n')};
function fake({tokens={'user-token':UID},appleOk=true,stored=null}={}){
  const calls=[],db={apple_tokens:stored?[{user_id:UID,refresh_token:stored}]:[]},apple=[];
  const net=async(u,o={})=>{
    const h=o.headers||{};calls.push((o.method||'GET')+' '+u.replace(SB,''));
    const res=(status,body)=>({ok:status<300,status,json:async()=>body});
    if(u===SB+'/auth/v1/user'){const t=(h.Authorization||'').slice(7);return tokens[t]?res(200,{id:tokens[t]}):res(401,{id:'99999999-9999-4999-8999-999999999999'});}
    if(u.startsWith('https://appleid.apple.com/')){const f=Object.fromEntries(new URLSearchParams(o.body));apple.push({u,f});
      if(u.endsWith('/auth/token')) return appleOk?res(200,{refresh_token:'apple-refresh-1',access_token:'x',id_token:'y'}):res(400,{error:'invalid_grant'});
      if(u.endsWith('/auth/revoke')) return res(200,{});}
    if(u===SB+'/rest/v1/apple_tokens'&&o.method==='POST'){ if(h.Authorization!=='Bearer '+SERVICE) return res(401,{}); const row=JSON.parse(o.body); db.apple_tokens=db.apple_tokens.filter(r=>r.user_id!==row.user_id).concat(row); return res(201,null); }
    if(u.startsWith(SB+'/rest/v1/apple_tokens?')){ if(h.Authorization!=='Bearer '+SERVICE) return res(401,{}); return res(200,db.apple_tokens.map(r=>({refresh_token:r.refresh_token}))); }
    if(/\/auth\/v1\/admin\/users\//.test(u)&&o.method==='DELETE') return res(200,{});
    if(u.startsWith(SB+'/rest/v1/app_state')) return res(200,[]);
    return res(404,{});
  };
  return {net,calls,db,apple};
}
const req=(fn,body,token='user-token')=>new Request(SB+'/functions/v1/'+fn,{method:'POST',headers:Object.assign({'content-type':'application/json',origin:'capacitor://localhost'},token?{authorization:'Bearer '+token}:{}),body:JSON.stringify(body)});
function verifyJwt(jwt){
  const [h,b,s]=jwt.split('.');const dec=x=>JSON.parse(Buffer.from(x,'base64url').toString());
  const okSig=nodeCrypto.verify('sha256',Buffer.from(h+'.'+b),{key:publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(s,'base64url'));
  return {head:dec(h),body:dec(b),okSig};
}
async function server(){
  const imp=f=>import(require('url').pathToFileURL(path.join(dir,f)).href);
  const {handle:link}=await imp('supabase/functions/apple-link/index.ts');
  const {handle:del}=await imp('supabase/functions/delete-account/index.ts');
  const envOf=o=>k=>o[k];
  { const f=fake();const r=await link(req('apple-link',{code:'c0de-abcdef-12345'}),envOf(appleEnv),f.net);const j=await r.json();
    ok('apple-link: exchanges the code at Apple and keeps the refresh token for the caller', r.status===200&&j.stored===true&&f.db.apple_tokens[0]?.user_id===UID&&f.db.apple_tokens[0]?.refresh_token==='apple-refresh-1', JSON.stringify(j));
    const x=f.apple[0];const v=verifyJwt(x.f.client_secret);
    ok('apple-link: the client secret is an ES256 JWT Apple can check (kid, team, audience, bundle id, 5 minutes)', v.okSig && v.head.alg==='ES256' && v.head.kid==='KEY1234567' && v.body.iss==='TEAM123456' && v.body.aud==='https://appleid.apple.com' && v.body.sub==='co.yooooooooo.showup' && v.body.exp-v.body.iat===300, JSON.stringify(v));
    ok('apple-link: grant_type authorization_code, client_id the bundle id', x.f.grant_type==='authorization_code'&&x.f.client_id==='co.yooooooooo.showup'&&x.f.code==='c0de-abcdef-12345'); }
  { const f=fake();const r=await link(req('apple-link',{code:'c0de-abcdef-12345'}),envOf(baseEnv),f.net);const j=await r.json();
    ok('apple-link without the Apple secrets: stores nothing, calls nobody at Apple, says so', r.status===200&&j.stored===false&&j.reason==='not-configured'&&!f.apple.length); }
  { const f=fake();const r=await link(req('apple-link',{code:'c0de-abcdef-12345'},ANON),envOf(appleEnv),f.net);
    ok('apple-link: the anon key is not a user (401), nothing stored', r.status===401&&!f.db.apple_tokens.length); }
  { const f=fake();const r=await link(req('apple-link',{code:'c0de-abcdef-12345',user_id:'99999999-9999-4999-8999-999999999999'},'forged'),envOf(appleEnv),f.net);
    ok('apple-link: a forged token and a body user_id store nothing', r.status===401&&!f.db.apple_tokens.length); }
  { const f=fake({appleOk:false});const r=await link(req('apple-link',{code:'c0de-abcdef-12345'}),envOf(appleEnv),f.net);
    ok('apple-link: Apple refuses the code: 502, nothing stored', r.status===502&&!f.db.apple_tokens.length); }
  { const f=fake();const r=await link(req('apple-link',{code:'<script>'}),envOf(appleEnv),f.net);
    ok('apple-link: a malformed code is refused before anything is asked', r.status===400&&!f.calls.length); }
  { const f=fake({stored:'apple-refresh-1'});const r=await del(req('delete-account',{confirm:'DELETE'}),envOf(appleEnv),f.net);
    const rv=f.apple.find(a=>a.u.endsWith('/auth/revoke'));
    const iRevoke=f.calls.findIndex(c=>c.includes('apple_tokens')),iDelete=f.calls.findIndex(c=>c.startsWith('DELETE /auth/v1/admin/users/'));
    ok('delete-account: revokes the Apple token first, then deletes the account', r.status===200&&rv&&rv.f.token==='apple-refresh-1'&&rv.f.token_type_hint==='refresh_token'&&iRevoke>=0&&iRevoke<iDelete, f.calls.join(' | '));
    ok('delete-account: the revoke carries a valid client secret', verifyJwt(rv.f.client_secret).okSig); }
  { const f=fake();const r=await del(req('delete-account',{confirm:'DELETE'}),envOf(baseEnv),f.net);
    ok('delete-account without the Apple secrets: unchanged (no extra calls)', r.status===200&&!f.apple.length&&!f.calls.some(c=>c.includes('apple_tokens'))); }
  { const f=fake();const r=await del(req('delete-account',{confirm:'DELETE'}),envOf(appleEnv),f.net);
    ok('delete-account: a Google account (no Apple token) is deleted as before', r.status===200&&!f.apple.length); }
}
(async()=>{ await client(); await server();
  console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
