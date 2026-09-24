/* ShowUp — ota.js (v4.6.110): over-the-air web updates for the iOS app.
   Classic script, loaded right after core.js.

   WHAT IT DOES. The App Store build carries a copy of these web files. After
   each deploy, ota.json (published beside the site) lists every file with its
   SHA-256. On launch and on return to the app, the shell reads it; if it names
   a newer version, the updater fetches ONLY the files whose hash changed --
   each one verified natively, a mismatch throws before anything is installed
   -- and queues the result for the next COLD START. Never mid-session: a
   'kill' delay condition keeps it waiting while the app is merely backgrounded
   (checked against the plugin's Swift source, DelayUpdateUtils).

   WHAT KEEPS IT SAFE.
   - notifyAppReady() is the first thing this file does. A bundle that cannot
     get this far within 10 s is rolled back to the last one that worked, and
     'updateFailed' marks its version bad so it is never tried again.
   - requires: every native plugin the web bundle expects. If the installed
     binary lacks one, the update is skipped -- a web bundle can never assume
     native code the phone does not have. build-ota.py writes this list from
     package.json and refuses a dependency it cannot name.
   - versions compare NUMERICALLY (4.6.110 > 4.6.99; as strings it is not).
   - three failed attempts at one version and it is left alone.
   - nothing runs in a browser: no Capacitor, no plugin, no request.
   - the plugin's own Capgo endpoints (updates, stats, channels) are all set to
     "" in capacitor.config.json, so it contacts no third party. */
const OTA_URL='https://tahros.github.io/showup/ota.json';
const OTA_BAD='showup:ota:bad', OTA_TRIES='showup:ota:tries';
const otaPlugin=()=>{ try{ return NATIVE_SHELL?(window.Capacitor?.Plugins?.CapacitorUpdater||null):null; }catch(e){ return null; } };
const otaNewer=(a,b)=>{ const x=String(a).split('.').map(Number), y=String(b).split('.').map(Number);
  for(let i=0;i<Math.max(x.length,y.length);i++){ const d=(x[i]||0)-(y[i]||0); if(d) return d>0; } return false; };
const otaJSON=(k,d)=>{ try{ return JSON.parse(localStorage.getItem(k))||d; }catch(e){ return d; } };
const otaPut=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const otaMarkBad=v=>{ const b=otaJSON(OTA_BAD,[]); if(v&&!b.includes(v)){ b.push(v); otaPut(OTA_BAD,b.slice(-20)); } };
let otaBusy=false, otaLast=0, otaLog=[];
/* first thing: this bundle started. Anything that stops us reaching this line
   within appReadyTimeout is exactly what the rollback exists for. */
(()=>{ const P=otaPlugin(); if(!P) return;
  try{ P.notifyAppReady(); }catch(e){}
  try{ P.addListener('updateFailed',e=>otaMarkBad(e?.bundle?.version)); }catch(e){}
})();
function otaValid(m){
  return !!m&&m.v===1&&typeof m.version==='string'&&/^\d+(\.\d+)*$/.test(m.version)
    &&Array.isArray(m.requires)&&Array.isArray(m.files)&&m.files.length>0
    &&m.files.every(f=>f&&typeof f.file_name==='string'&&/^[0-9a-f]{64}$/.test(f.file_hash||'')&&/^https:\/\//.test(f.download_url||''))
    &&m.files.some(f=>f.file_name==='index.html');
}
/* -> a short reason string; the suite asserts on it */
async function otaCheck(force){
  const P=otaPlugin(); if(!P) return 'no-shell';
  if(otaBusy) return 'busy';
  if(!force&&Date.now()-otaLast<30*60*1000) return 'throttled';
  otaBusy=true; otaLast=Date.now();
  try{
    let r,m;
    try{ r=await fetch(OTA_URL+'?t='+Date.now(),{cache:'no-store'}); }catch(e){ return 'offline'; }
    if(!r.ok) return 'fetch-'+r.status;
    try{ m=await r.json(); }catch(e){ return 'invalid'; }   // reachable but not a manifest
    if(!otaValid(m)) return 'invalid';
    const cur=String(APP_VERSION).replace(/^v/,'');
    if(!otaNewer(m.version,cur)) return 'current';
    if(otaJSON(OTA_BAD,[]).includes(m.version)) return 'bad';
    const cap=window.Capacitor;
    const missing=m.requires.filter(n=>!(cap?.isPluginAvailable?.(n)));
    if(missing.length) return 'needs-native:'+missing.join(',');
    const tries=otaJSON(OTA_TRIES,{});
    if((tries[m.version]||0)>=3){ otaMarkBad(m.version); return 'bad'; }
    let bundle=null;
    try{ const l=await P.list(); bundle=(l?.bundles||[]).find(b=>b.version===m.version&&b.status!=='error')||null;
      if((l?.bundles||[]).some(b=>b.version===m.version&&b.status==='error')&&!bundle){ otaMarkBad(m.version); return 'bad'; } }catch(e){}
    if(!bundle){
      tries[m.version]=(tries[m.version]||0)+1; otaPut(OTA_TRIES,tries);
      try{ bundle=await P.download({version:m.version,url:OTA_URL,checksum:'',manifest:m.files}); }
      catch(e){ return 'download-failed'; }
    }
    await P.setMultiDelay({delayConditions:[{kind:'kill'}]});   // cold start only -- never mid-session
    await P.next({id:bundle.id});
    return 'queued:'+m.version;
  }catch(e){ return 'error'; }
  finally{ otaBusy=false; }
}
if(otaPlugin()){
  addEventListener('load',()=>setTimeout(()=>otaCheck(true).then(r=>otaLog.push(r)),4000));
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') otaCheck(false).then(r=>otaLog.push(r)); });
}
