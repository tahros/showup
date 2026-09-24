/* test-delete-account.js DIR — v4.6.113: deleting the account (App Store 5.1.1(v)).
 * Two halves, both real code:
 *  - the server, supabase/functions/delete-account/index.ts, imported and driven
 *    with a fake Supabase (auth + admin + rest) behind its injected fetch;
 *  - the app, every script in index.html order, with confirm/prompt/fetch faked.
 * The rules: only the caller can be deleted (id from the caller's token, never
 * the body); the anon key is not a user; nothing happens without the typed
 * DELETE; the device is wiped only after the server says deleted; any failure
 * leaves the device exactly as it was.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const SB='https://proj.supabase.co', ANON='anon-key-123', SERVICE='service-role-xyz';
const UID='11111111-2222-3333-4444-555555555555', OTHER='99999999-8888-7777-6666-555555555555';
const tick=()=>new Promise(r=>setTimeout(r,0));
const settle=async(n=40)=>{for(let i=0;i<n;i++)await tick();};

/* ---------------- server ---------------- */
function fakeSupabase({tokens={'user-token':UID},authDown=false,deleteStatus=200,leftover=false}={}){
  const calls=[];
  const users=new Set([UID,OTHER]);
  const rows=new Set([UID,OTHER]);
  const net=async(u,o={})=>{
    const m=o.method||'GET', h=o.headers||{}; calls.push(m+' '+u.replace(SB,''));
    const res=(status,body)=>({ok:status>=200&&status<300,status,json:async()=>body});
    if(u===SB+'/auth/v1/user'){
      if(authDown) throw new Error('down');
      const t=(h.Authorization||'').replace('Bearer ','');
      return tokens[t]?res(200,{id:tokens[t],email:'me@x.co'}):res(401,{msg:'bad jwt',id:OTHER});   // a refusal's body is never trusted
    }
    const adm=u.match(/\/auth\/v1\/admin\/users\/(.+)$/);
    if(adm&&m==='DELETE'){
      if(h.Authorization!=='Bearer '+SERVICE) return res(401,{});
      if(deleteStatus!==200) return res(deleteStatus,{});
      users.delete(adm[1]); if(!leftover) rows.delete(adm[1]);   // ON DELETE CASCADE
      return res(200,{});
    }
    const rest=u.match(/\/rest\/v1\/app_state\?user_id=eq\.([^&]+)/);
    if(rest){
      if(h.Authorization!=='Bearer '+SERVICE) return res(401,{});
      if(m==='GET') return res(200,rows.has(rest[1])?[{user_id:rest[1]}]:[]);
      if(m==='DELETE'){ rows.delete(rest[1]); return res(204,null); }
    }
    return res(404,{});
  };
  return {net,calls,users,rows};
}
const env=k=>({SUPABASE_URL:SB,SUPABASE_ANON_KEY:ANON,SUPABASE_SERVICE_ROLE_KEY:SERVICE})[k];
const req=({method='POST',token='user-token',body={confirm:'DELETE'},origin='capacitor://localhost',raw}={})=>
  new Request(SB+'/functions/v1/delete-account',{method,headers:Object.assign({'content-type':'application/json',origin},token?{authorization:'Bearer '+token}:{}),
    body:method==='POST'?(raw!==undefined?raw:JSON.stringify(body)):undefined});

async function server(){
  const {handle}=await import(path.join(dir,'supabase/functions/delete-account/index.ts'));
  { const f=fakeSupabase(); const r=await handle(req(),env,f.net); const j=await r.json();
    ok('server: the caller is deleted', r.status===200&&j.deleted===true&&!f.users.has(UID), r.status);
    ok('server: their row goes with them (cascade)', !f.rows.has(UID));
    ok('server: nobody else is touched', f.users.has(OTHER)&&f.rows.has(OTHER));
    ok('server: the id came from the caller\'s own token (auth/v1/user asked first)', f.calls[0]==='GET /auth/v1/user' && f.calls[1]==='DELETE /auth/v1/admin/users/'+UID, f.calls.slice(0,2).join(' , '));
    ok('server: the iOS app\'s origin is allowed', r.headers.get('access-control-allow-origin')==='capacitor://localhost');
  }
  { const f=fakeSupabase(); const r=await handle(req({body:{confirm:'DELETE',user_id:OTHER,id:OTHER}}),env,f.net);
    ok('server: an id in the body is ignored -- you can only delete yourself', r.status===200&&f.users.has(OTHER)&&!f.users.has(UID));
  }
  { const f=fakeSupabase(); const r=await handle(req({token:ANON}),env,f.net);
    ok('server: the anon key is not a user -- refused, nothing deleted', r.status===401&&f.users.size===2, r.status);
  }
  { const f=fakeSupabase(); const r=await handle(req({token:null}),env,f.net);
    ok('server: no token -- refused', r.status===401&&f.calls.length===0);
  }
  { const f=fakeSupabase(); const r1=await handle(req({body:{}}),env,f.net), r2=await handle(req({raw:'not json'}),env,f.net);
    ok('server: no {"confirm":"DELETE"} -- refused before any call', r1.status===400&&r2.status===400&&f.calls.length===0);
  }
  { const f=fakeSupabase(); const r=await handle(req({method:'GET'}),env,f.net);
    ok('server: GET is refused', r.status===405&&f.users.size===2);
  }
  { const f=fakeSupabase(); const r=await handle(new Request(SB+'/x',{method:'OPTIONS',headers:{origin:'https://tahros.github.io'}}),env,f.net);
    ok('server: CORS preflight answers for the web app', r.status===200&&r.headers.get('access-control-allow-origin')==='https://tahros.github.io');
    const e=await handle(new Request(SB+'/x',{method:'OPTIONS',headers:{origin:'https://evil.example'}}),env,f.net);
    ok('server: and not for another site', e.headers.get('access-control-allow-origin')!=='https://evil.example');
  }
  { const f=fakeSupabase({deleteStatus:500}); const r=await handle(req(),env,f.net);
    ok('server: the auth delete fails -- reported as failure, row untouched', r.status===502&&f.rows.has(UID)&&f.users.has(UID), r.status);
  }
  { const f=fakeSupabase({authDown:true}); const r=await handle(req(),env,f.net);
    ok('server: auth unreachable -- nothing deleted', r.status===502&&f.users.size===2);
  }
  { const f=fakeSupabase({leftover:true}); const r=await handle(req(),env,f.net);
    ok('server: a row left without a cascade is deleted outright', r.status===200&&!f.rows.has(UID)&&f.rows.has(OTHER));
  }
  { const f=fakeSupabase(); const r=await handle(req(),k=>k==='SUPABASE_SERVICE_ROLE_KEY'?undefined:env(k),f.net);
    ok('server: missing service key -- 500, no calls', r.status===500&&f.calls.length===0);
  }
}

/* ---------------- app ---------------- */
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
async function app({confirmAns=true,typed='DELETE',status=200,throwNet=false,expired=false}={}){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext(),calls=[],asked=[];
  w.localStorage.setItem('showup:planning-interface','previous');
  w.localStorage.setItem('tracker-v1',JSON.stringify({days:{'2026-09-20':{w:[{part:'Chest',ex:'Bench Press',w:185,reps:[5],at:1}],upd:5}},settings:{cloud:{url:SB,anon:ANON}}}));
  w.localStorage.setItem('showup:bak:2026-09-20','{"days":{}}');
  w.localStorage.setItem('tracker-session',JSON.stringify({access_token:'AT',refresh_token:'RT',expires_at:Date.now()+3600e3,user:{id:UID,email:'me@x.co'}}));
  w.confirm=m=>{asked.push(m);return confirmAns;};
  w.prompt=m=>{asked.push(m);return typed;};
  w.fetch=async(u,o={})=>{u=String(u);calls.push({u,o});
    if(u.includes('/functions/v1/delete-account')){ if(throwNet) throw new Error('offline'); return {ok:status===200,status,json:async()=>({deleted:status===200})}; }
    if(u.includes('grant_type=refresh_token')) return {ok:false,status:400,json:async()=>({})};
    throw new Error('offline');};
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  let reloaded=0;
  for(const s of order) vm.runInContext(srcs[s],ctx,{filename:s});
  vm.runInContext(`todayISO='2026-09-24';checkDate=()=>false;`,ctx);
  await settle();
  vm.runInContext(`forgetDevice=(orig=>async()=>{ window.__forgot=(window.__forgot||0)+1; location.reload=()=>{}; try{ await orig(); }catch(e){} })(forgetDevice);`,ctx);
  const run=c=>vm.runInContext(c,ctx);
  if(expired) run('session.expires_at=Date.now()-1e6');     // the token lapsed while the app sat open
  let mark=0;
  const del=async()=>{ mark=calls.length; const r=await run('deleteAccount()'); await settle(); return r; };
  const kept=()=>!!w.localStorage.getItem('tracker-v1')&&!!w.localStorage.getItem('showup:bak:2026-09-20')&&run('!!session');
  const toast=()=>w.document.getElementById('toast')?.textContent||'';
  return {w,run,calls,asked,del,kept,toast,after:()=>calls.slice(mark),fnCalls:()=>calls.filter(c=>c.u.includes('delete-account'))};
}
async function client(){
  { const a=await app(); const r=await a.del(); const c=a.fnCalls()[0];
    ok('app: confirm, type DELETE -> deleted', r==='deleted', r);
    ok('app: one POST to /functions/v1/delete-account', a.fnCalls().length===1&&c.o.method==='POST'&&c.u===SB+'/functions/v1/delete-account');
    ok('app: it carries the user\'s token, not just the anon key', c.o.headers.Authorization==='Bearer AT'&&c.o.headers.apikey===ANON);
    ok('app: body {"confirm":"DELETE"}', c.o.body==='{"confirm":"DELETE"}');
    ok('app: the device is then wiped: record, backups, session', !a.w.localStorage.getItem('tracker-v1')&&!a.w.localStorage.getItem('showup:bak:2026-09-20')&&a.run('session===null')&&a.run('window.__forgot===1'));
    ok('app: the confirm names what is erased and what is not', /Erased now/.test(a.asked[0])&&/other devices/.test(a.asked[0])&&/cannot be undone/.test(a.asked[0])&&/Backup/.test(a.asked[0]));
    ok('app: nothing was pushed to the cloud first', !a.after().some(c=>c.u.includes('/rest/v1/app_state')));
  }
  { const a=await app({confirmAns:false}); const r=await a.del();
    ok('app: cancel at the first step -> no call, nothing wiped', r==='cancelled'&&a.fnCalls().length===0&&a.kept());
  }
  for(const t of [null,'','delete me','DELET']){
    const a=await app({typed:t}); const r=await a.del();
    ok(`app: typed ${JSON.stringify(t)} -> no call, nothing wiped`, r==='cancelled'&&a.fnCalls().length===0&&a.kept());
  }
  { const a=await app({typed:' delete '}); ok('app: " delete " counts (case and spaces forgiven)', await a.del()==='deleted'); }
  { const a=await app({status:500}); const r=await a.del();
    ok('app: server 500 -> says nothing was deleted, device untouched', r==='failed'&&a.kept()&&/Nothing was deleted/.test(a.toast()), a.toast());
  }
  { const a=await app({status:404}); const r=await a.del();
    ok('app: function not deployed (404) -> says so, device untouched', r==='failed'&&a.kept()&&/not set up/.test(a.toast()), a.toast());
  }
  { const a=await app({throwNet:true}); const r=await a.del();
    ok('app: offline -> device untouched', r==='offline'&&a.kept());
  }
  { const a=await app({expired:true}); const r=await a.del();
    ok('app: expired sign-in -> asks to sign in again, no call', r==='no-token'&&a.fnCalls().length===0&&!!a.w.localStorage.getItem('tracker-v1'), r+' '+a.fnCalls().length+' '+!!a.w.localStorage.getItem('tracker-v1'));
  }
  { const a=await app(); a.run('renderSync()');
    const b=a.w.document.getElementById('deleteAcctBtn');
    ok('app: Settings shows Delete account when signed in', !!b&&/Delete account/.test(b.textContent));
    a.run('session=null; renderSync()');
    ok('app: and not when signed out', !a.w.document.getElementById('deleteAcctBtn'));
  }
}
(async()=>{ await server(); await client();
  console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
