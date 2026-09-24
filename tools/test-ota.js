/* test-ota.js DIR — v4.6.110: over-the-air updates for the iOS app.
 * Faked: the injected Plugins.CapacitorUpdater and the network. Real: every line
 * of js/ota.js, loaded in index.html order. Each rule in ota.js's header is one
 * assertion here; the numeric version compare is asserted with the pair that a
 * string compare gets wrong.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
const APP=/APP_VERSION\s*=\s*'v([\d.]+)'/.exec(srcs['js/core.js'])[1];
const bump=(v,n=1)=>{const p=v.split('.').map(Number);p[p.length-1]+=n;return p.join('.');};
const h='a'.repeat(64);
const manifest=(over={})=>({v:1,version:bump(APP),requires:['CapacitorUpdater','Filesystem'],
  files:[{file_name:'index.html',file_hash:h,download_url:'https://tahros.github.io/showup/index.html?ota=x'},
         {file_name:'js/app.js',file_hash:'b'.repeat(64),download_url:'https://tahros.github.io/showup/js/app.js?ota=x'}],...over});

/* v4.6.114: the fake now models the plugin's real state machine (read from its
   Swift source): delay conditions, a next bundle, a current bundle; a LAUNCH
   clears 'kill' delays; a BACKGROUND installs next only if no delay remains;
   set() switches and reloads at once. The v4.6.110 fake had none of this, and
   a queued update that could never install passed every test. */
function fakeUpdater(){
  const calls=[],listeners={},state={bundles:[],downloadFails:0,readyAt:null,delays:[],next:null,current:{id:'builtin',version:'1.0',status:'success'}};
  const byId=id=>state.bundles.find(b=>b.id===id);
  const sim={
    launch(){ state.delays=state.delays.filter(d=>d.kind!=='kill'); },
    background(){ if(state.delays.length) return 'delayed';
      const n=state.next; if(n&&n.version!==state.current.version){ state.current=n; state.next=null; calls.push('install:'+n.id); return 'installed'; } return 'nothing'; },
  };
  const api={
    getNextBundle(){calls.push('getNext');return Promise.resolve(state.next?{...state.next}:null);},
    current(){calls.push('current');return Promise.resolve({bundle:{...state.current},native:'1.0'});},
    set(o){calls.push('set:'+o.id);const b=byId(o.id);if(!b)return Promise.reject(new Error('no bundle'));state.current=b;state.reloaded=(state.reloaded||0)+1;return Promise.resolve();},
    delete(o){calls.push('delete:'+o.id);if(o.id===state.current.id)return Promise.reject(new Error('current'));
      if(state.next&&state.next.id===o.id&&state.next.id!==state.current.id)return Promise.reject(new Error('cannot delete the next bundle'));   // as the real plugin
      state.bundles=state.bundles.filter(b=>b.id!==o.id);if(state.next&&state.next.id===o.id)state.next=null;return Promise.resolve();},
    notifyAppReady(){calls.push('notifyAppReady');state.readyAt=calls.length;return Promise.resolve({bundle:{id:'builtin'}});},
    addListener(ev,fn){(listeners[ev]=listeners[ev]||[]).push(fn);calls.push('listen:'+ev);return Promise.resolve({remove(){}});},
    list(){calls.push('list');return Promise.resolve({bundles:state.bundles.slice()});},
    download(o){calls.push('download:'+o.version);state.lastDownload=o;
      if(state.downloadFails>0){state.downloadFails--;return Promise.reject(new Error('Computed checksum is not equal'));}
      const b={id:'b'+state.bundles.length,version:o.version,status:'success',checksum:'',downloaded:''};state.bundles.push(b);return Promise.resolve(b);},
    setMultiDelay(o){calls.push('delay:'+o.delayConditions.map(c=>c.kind).join(','));state.delays=o.delayConditions.slice();return Promise.resolve();},
    next(o){calls.push('next:'+o.id);const b=byId(o.id)||(o.id===state.current.id?state.current:null);if(!b)return Promise.reject(new Error('no bundle'));state.next=b;return Promise.resolve({id:o.id});},
  };
  return {api,calls,listeners,state,sim};
}
async function boot({shell=true,plugins=['CapacitorUpdater','Filesystem'],serve=()=>manifest(),status=200,local={},up:upIn=null}={}){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext(),up=upIn||fakeUpdater(),fetches=[];
  for(const [k,v] of Object.entries(local)) w.localStorage.setItem(k,JSON.stringify(v));
  w.localStorage.setItem('showup:planning-interface','previous');
  if(shell){const P={};if(plugins.includes('CapacitorUpdater'))P.CapacitorUpdater=up.api;if(plugins.includes('Filesystem'))P.Filesystem={};
    w.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins:P,isPluginAvailable:n=>plugins.includes(n)};}
  w.fetch=(u,o)=>{fetches.push(String(u));
    if(!String(u).startsWith('https://tahros.github.io/showup/ota.json')) return Promise.reject(new Error('offline'));
    if(status==='throw') return Promise.reject(new Error('offline'));
    const body=serve();return Promise.resolve({ok:status===200,status,json:()=>typeof body==='string'?Promise.reject(new Error('bad json')):Promise.resolve(body)});};
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(srcs[s],ctx,{filename:s});
  vm.runInContext(`todayISO='2026-09-23';checkDate=()=>false;`,ctx);
  const run=c=>vm.runInContext(c,ctx);
  return {w,run,up,fetches,check:force=>run(`otaCheck(${force!==false})`)};
}

(async()=>{
 /* 1. a browser does nothing at all */
 { const b=await boot({shell:false});
   ok('browser: no plugin is found', b.run('otaPlugin()===null'));
   ok('browser: otaCheck declines without a request', await b.check()==='no-shell' && b.fetches.length===0, b.fetches.join(','));
 }
 /* 2. notifyAppReady is the FIRST thing the bundle does */
 { const b=await boot();
   ok('shell: notifyAppReady is called as the script loads -- the first updater call', b.up.calls[0]==='notifyAppReady', b.up.calls.slice(0,3).join(' '));
   ok('shell: and it listens for rollback', b.up.calls.includes('listen:updateFailed'));
 }
 /* 3. the happy path: newer -> download the manifest -> hold for a cold start -> queue */
 { const b=await boot(); const r=await b.check();
   ok('newer version: queued', r==='queued:'+bump(APP), r);
   ok('the download is the manifest (per-file hashes), not a zip', b.up.state.lastDownload?.manifest?.length===2 && b.up.state.lastDownload.manifest[0].file_hash===h);
   const i=b.up.calls.indexOf('delay:kill'), j=b.up.calls.findIndex(c=>c.startsWith('next:'));
   ok('it waits for a COLD START: the kill delay is set before next()', i>0 && j>i, b.up.calls.join(' '));
   ok('the manifest was fetched uncached from the live site', /^https:\/\/tahros\.github\.io\/showup\/ota\.json\?t=\d+$/.test(b.fetches.at(-1)), b.fetches.at(-1));
 }
 /* 4. not newer */
 { const b=await boot({serve:()=>manifest({version:APP})}); ok('same version: nothing downloaded', await b.check()==='current' && !b.up.calls.some(c=>c.startsWith('download')));}
 { const older=APP.replace(/\d+$/,m=>String(Math.max(0,+m-1)));
   const b=await boot({serve:()=>manifest({version:older})}); ok('older version: nothing downloaded', await b.check()==='current');}
 /* 5. numeric compare -- the pair a string compare gets wrong */
 { const b=await boot();
   ok('4.6.110 is newer than 4.6.99 (as strings it is not)', b.run(`otaNewer('4.6.110','4.6.99')`)===true && b.run(`otaNewer('4.6.99','4.6.110')`)===false);
   ok('5.0 is newer than 4.99.99', b.run(`otaNewer('5.0','4.99.99')`)===true);
   ok('equal is not newer', b.run(`otaNewer('4.6.9','4.6.9')`)===false);
 }
 /* 6. a bundle that needs native code this binary lacks is skipped */
 { const b=await boot({serve:()=>manifest({requires:['CapacitorUpdater','Filesystem','HealthKit']})});
   const r=await b.check(); ok('missing native plugin: skipped, and says which', r==='needs-native:HealthKit' && !b.up.calls.some(c=>c.startsWith('download')), r);}
 /* 7. malformed manifests never reach the updater */
 for(const [name,body] of [['bad json','<html>'],['wrong schema',{v:2,version:'9.9.9',requires:[],files:[]}],
   ['no files',manifest({files:[]})],['no index.html',manifest({files:[{file_name:'js/app.js',file_hash:h,download_url:'https://x/y'}]})],
   ['short hash',manifest({files:[{file_name:'index.html',file_hash:'abc',download_url:'https://x/y'}]})],
   ['http url',manifest({files:[{file_name:'index.html',file_hash:h,download_url:'http://x/y'}]})],
   ['non-numeric version',manifest({version:'4.6.x'})]]){
   const b=await boot({serve:()=>body}); const r=await b.check();
   ok(`malformed (${name}): rejected before the updater sees it`, ['invalid'].includes(r) && !b.up.calls.some(c=>c.startsWith('download')), r);}
 /* 8. network failure is quiet */
 { const b=await boot({status:'throw'}); ok('offline: no throw, no download', await b.check()==='offline');}
 { const b=await boot({status:404}); ok('404: no throw, no download', await b.check()==='fetch-404');}
 /* 9. three failures and the version is left alone */
 { const b=await boot(); b.up.state.downloadFails=99;
   const rs=[]; for(let i=0;i<4;i++) rs.push(await b.check());
   ok('a failing download is retried, then given up after three', rs.join(',')==='download-failed,download-failed,download-failed,bad', rs.join(','));
   ok('...and exactly three downloads were attempted', b.up.calls.filter(c=>c.startsWith('download')).length===3);
 }
 /* 10. a rollback marks the version bad for good */
 { const b=await boot(); b.up.listeners.updateFailed[0]({bundle:{version:bump(APP)}});
   ok('updateFailed (rollback): that version is never tried again', await b.check()==='bad' && !b.up.calls.some(c=>c.startsWith('download')));}
 /* 11. an already-downloaded bundle is queued, not fetched again */
 { const b=await boot(); b.up.state.bundles.push({id:'kept',version:bump(APP),status:'success'});
   const r=await b.check(); ok('already downloaded: queued without a second download', r==='queued:'+bump(APP) && !b.up.calls.some(c=>c.startsWith('download')) && b.up.calls.includes('next:kept'), b.up.calls.join(' '));}
 /* 12. throttling: the foreground check does not hammer the network */
 { const b=await boot({serve:()=>manifest({version:APP})}); await b.check(true); const n=b.fetches.length;
   ok('a second foreground check within 30 min is throttled', await b.check(false)==='throttled' && b.fetches.length===n);}
 /* 14. v4.6.114: the lifecycle on the phone, end to end, against the plugin's real rules */
 { const b1=await boot(); const r=await b1.check(); const up=b1.up, id=up.state.next?.id;
   ok('launch 1: downloaded and queued as next', r==='queued:'+bump(APP) && !!id, r);
   ok('launch 1: nothing applied mid-session', up.state.current.id==='builtin' && !up.state.reloaded);
   ok('backgrounding during launch 1 installs nothing (the kill hold)', up.sim.background()==='delayed');
   up.sim.launch();                                   // swipe away, open again
   const b2=await boot({up}); const boot2=await b2.run('otaBoot');
   ok('launch 2: the queued update is applied at launch', boot2==='applying:'+bump(APP) && up.calls.includes('set:'+id), boot2);
   ok('launch 2: it is now the running bundle', up.state.current.id===id && up.state.reloaded===1);
 }
 { /* the exact trap found on the phone: without the launch-time set, the plugin never installs */
   const b1=await boot(); await b1.check(); const up=b1.up;
   up.sim.launch(); await b1.check(true);            // the 4-second check re-arms the hold...
   ok('the trap, reproduced: launch clears the hold, the check re-arms it, background installs nothing', up.sim.background()==='delayed');
 }
 { /* a bundle left over that is not newer than the running code: never applied, deleted */
   const up=fakeUpdater(); const older=APP.replace(/\d+$/,m=>String(Math.max(0,+m-1)));
   up.state.bundles.push({id:'old1',version:older,status:'pending'},{id:'same1',version:APP,status:'pending'});
   up.state.next=up.state.bundles[0];
   const b=await boot({up}); const r=await b.run('otaBoot');
   ok('an older pending bundle is never applied (no downgrade after a native rebuild)', !up.calls.some(c=>c.startsWith('set:')), up.calls.join(' '));
   ok('bundles not newer than the running code are deleted', r==='tidied:2' && up.state.bundles.length===0, r);
 }
 { /* v4.6.116: the downgrade found on the phone. A native rebuild ships NEWER code than an
      old bundle still queued as next; the plugin would install that bundle on the next background. */
   const up=fakeUpdater(); const older=APP.replace(/\d+$/,m=>String(Math.max(0,+m-1)));
   up.state.bundles.push({id:'stale',version:older,status:'pending'}); up.state.next=up.state.bundles[0];
   up.sim.launch();
   const b=await boot({up}); await b.run('otaBoot');
   ok('after a rebuild: the stale bundle is no longer next', !up.state.next||up.state.next.id==='builtin', JSON.stringify(up.state.next));
   ok('after a rebuild: backgrounding installs nothing (no downgrade)', up.sim.background()!=='installed' && up.state.current.id==='builtin', up.calls.join(' '));
   ok('after a rebuild: the stale bundle is deleted', !up.state.bundles.some(b=>b.id==='stale'));
 }
 { /* a newer bundle marked bad is not applied */
   const up=fakeUpdater(); up.state.bundles.push({id:'nb',version:bump(APP),status:'pending'}); up.state.next=up.state.bundles[0];
   const b=await boot({up,local:{'showup:ota:bad':[bump(APP)]}}); await b.run('otaBoot');
   ok('a newer bundle already marked bad is not applied', !up.calls.includes('set:nb'));
   ok('...nor left as next for the plugin to install on background', up.sim.background()!=='installed');
 }
 { /* the next bundle is reused, not downloaded again */
   const up=fakeUpdater(); up.state.bundles.push({id:'nx',version:bump(APP),status:'pending'}); up.state.next=up.state.bundles[0];
   up.api.list=()=>Promise.resolve({bundles:[]});      // even if list() misses it
   const b=await boot({up}); up.state.current={id:'builtin',version:'1.0'}; const r=await b.check();
   ok('already next: queued again without a second download', r==='queued:'+bump(APP) && !up.calls.some(c=>c.startsWith('download')), up.calls.join(' '));
 }
 { /* browser: the boot hook does nothing */
   const b=await boot({shell:false}); ok('browser: no launch-time apply', b.run('otaBoot')===null);
 }
 /* 13. the real ota.json on disk matches the files it lists */
 { const m=JSON.parse(fs.readFileSync(path.join(dir,'ota.json'),'utf8'));
   ok('ota.json version is this build\'s version', m.version===APP, m.version+' vs '+APP);
   const b=await boot(); ok('ota.json passes the client\'s own validation', b.run(`otaValid(${JSON.stringify(m)})`));
   const distDir=path.join(dir,'dist'); const stale=fs.existsSync(distDir)?m.files.filter(f=>{const p=path.join(distDir,f.file_name);return !fs.existsSync(p)||crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==f.file_hash;}).map(f=>f.file_name):['(no dist/)'];
   ok('every hash in ota.json matches the built file', stale.length===0, stale.slice(0,4).join(','));
   ok('no test screenshot is in the update', !m.files.some(f=>/session-live|live-workout|header-glass|qa\.png/.test(f.file_name)));
 }
 console.log(fails?`FAIL ${fails}`:'ALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
