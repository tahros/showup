/* test-durable.js DIR — v4.6.106: the durable record inside the iOS shell.
 *
 * Every failure here is an app-lifecycle failure that no browser reproduces,
 * so the suite fakes the one thing that matters: Capacitor's injected
 * Plugins.Filesystem, with switches for a bridge that errors, a write that
 * never returns (the app was killed), and a slot that was truncated mid-write.
 * The rules under test are the four in core.js: localStorage stays as the
 * synchronous write-ahead log; two slots, newest wins; nothing saves until a
 * read has SUCCEEDED; an empty ledger never overwrites a stored one by accident.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));

/* a Filesystem the way the iOS runtime injects it: methods on Plugins.Filesystem */
function fakeFS(){
  const files=new Map(), mode={readFail:false,hang:false,truncateNext:false}, log=[];
  const missing=p=>Object.assign(new Error('Operation failed because file does not exist'),{code:'OS-PLUG-FILE-0008',path:p});
  const api={
    async stat({path}){ log.push('stat '+path); if(mode.readFail) throw new Error('bridge unavailable'); if(!files.has(path)) throw missing(path); return {size:files.get(path).length}; },
    async readFile({path}){ log.push('read '+path); if(mode.readFail) throw new Error('bridge unavailable'); if(!files.has(path)) throw missing(path); return {data:files.get(path)}; },
    async writeFile({path,data}){ log.push('write '+path); if(mode.hang) return new Promise(()=>{}); files.set(path, mode.truncateNext?data.slice(0,Math.floor(data.length/2)):data); mode.truncateNext=false; return {uri:path}; },
    async readdir({path}){ return {files:[...files.keys()].filter(k=>k.startsWith(path)).map(k=>({name:k.slice(path.length)}))}; },
    async deleteFile({path}){ log.push('delete '+path); files.delete(path); },
    async rmdir({path}){ log.push('rmdir '+path); for(const k of [...files.keys()]) if(k.startsWith(path+'/')) files.delete(k); },
  };
  return {api,files,mode,log};
}
const rec=(days,at)=>JSON.stringify({days,settings:{onboarded:true},savedAt:at});
const D=n=>{const o={};for(let i=1;i<=n;i++)o['2026-01-'+String(i).padStart(2,'0')]={w:[{part:'Legs',ex:'Squat',w:60,reps:[5],at:at0+i}],doneAll:true,upd:at0+i};return o;};
const at0=1758000000000;

async function boot({native=false,fsx=null,local=null}={}){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext();
  if(local!=null) w.localStorage.setItem('tracker-v1',local);
  w.localStorage.setItem('showup:planning-interface','previous');
  if(native) w.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins:{Filesystem:fsx.api}};
  w.fetch=()=>Promise.reject(new Error('offline'));
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.confirm=()=>true;
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(srcs[s],ctx,{filename:s});
  vm.runInContext(`todayISO='2026-09-22';checkDate=()=>false;`,ctx);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
  const run=c=>vm.runInContext(c,ctx);
  const t0=Date.now(); while(Date.now()-t0<3000){ if(run('typeof SEED!=="undefined"&&SEED&&SEED.totals&&typeof loadedOK!=="undefined"')) break; await new Promise(r=>setTimeout(r,10)); }
  await new Promise(r=>setTimeout(r,20));
  return {w,run,dom};
}
const tick=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  /* A. a browser: no Capacitor, behaviour exactly as before */
  { const {w,run}=await boot({local:rec(D(3),at0+100)});
    ok('A browser: NATIVE_SHELL is false and no durable layer is offered', run('NATIVE_SHELL===false && durable.available()===false'));
    ok('A browser: the record loads from localStorage', run('daysWithWork(DB)')===3, run('daysWithWork(DB)'));
    ok('A browser: loadedOK is true after a normal boot', run('loadedOK===true'));
    run(`DB.days['2026-02-01']={w:[{part:'Legs',ex:'Squat',w:60,reps:[5],at:1}],upd:Date.now()};save();`); await tick(450);
    ok('A browser: a save lands in localStorage', JSON.parse(w.localStorage.getItem('tracker-v1')).days['2026-02-01']!=null);
  }
  /* B. the bridge errors on read: nothing may save until a read succeeds */
  { const fsx=fakeFS(); fsx.mode.readFail=true;
    const {w,run}=await boot({native:true,fsx,local:rec(D(5),at0+100)});
    ok('B read error: loadedOK is false', run('loadedOK===false'));
    ok('B read error: the in-memory DB still came up from localStorage', run('daysWithWork(DB)')===5, run('daysWithWork(DB)'));
    run(`DB.days['2026-02-01']={w:[{part:'Legs',ex:'Squat',w:60,reps:[5],at:1}],upd:Date.now()};save();`); await tick(450);
    ok('B read error: save() is REFUSED — localStorage untouched', JSON.parse(w.localStorage.getItem('tracker-v1')).days['2026-02-01']==null);
    ok('B read error: nothing was written to a slot', ![...fsx.files.keys()].some(k=>k.includes('db.')), [...fsx.files.keys()].join(','));
    ok('B read error: the toast says WHY (history not finished loading)', /not finished loading/.test(w.document.body.textContent));
    fsx.mode.readFail=false; await run('dbRead()');
    ok('B recovery: a later successful read flips loadedOK', run('loadedOK===true'));
    run('save()'); await tick(450);
    ok('B recovery: and the pending change now saves', JSON.parse(w.localStorage.getItem('tracker-v1')).days['2026-02-01']!=null);
  }
  /* C. first native launch: slots absent, localStorage present -> slots fill, and alternate */
  { const fsx=fakeFS();
    const {run}=await boot({native:true,fsx,local:rec(D(4),at0+100)});
    ok('C first launch: absent slots are not an error', run('loadedOK===true && daysWithWork(DB)===4'));
    run('save()'); await tick(450);
    const first=[...fsx.files.keys()].find(k=>k.includes('db.'));
    ok('C first save: exactly one slot written, and read back', first!=null && [...fsx.files.keys()].filter(k=>k.includes('db.')).length===1, first);
    ok('C first save: the slot holds the full record with savedAt', JSON.parse(fsx.files.get(first)).savedAt>0);
    run('save()'); await tick(450);
    ok('C second save: goes to the OTHER slot', [...fsx.files.keys()].filter(k=>k.includes('db.')).length===2, [...fsx.files.keys()].filter(k=>k.includes('db.')).join(' '));
  }
  /* D. newest wins, in both directions */
  { const fsx=fakeFS(); fsx.files.set('showup/db.a.json',rec(D(9),at0+500));
    const {run}=await boot({native:true,fsx,local:rec(D(2),at0+100)});
    ok('D slot newer than localStorage: the slot wins', run('daysWithWork(DB)')===9, run('daysWithWork(DB)'));
  }
  { const fsx=fakeFS(); fsx.files.set('showup/db.a.json',rec(D(2),at0+100));
    const {run}=await boot({native:true,fsx,local:rec(D(9),at0+500)});
    ok('D localStorage newer than the slot: localStorage wins (the WAL was ahead)', run('daysWithWork(DB)')===9, run('daysWithWork(DB)'));
  }
  /* E. a slot truncated mid-write is skipped, not fatal */
  { const fsx=fakeFS(); fsx.files.set('showup/db.a.json',rec(D(7),at0+700).slice(0,40)); fsx.files.set('showup/db.b.json',rec(D(6),at0+600));
    const {run}=await boot({native:true,fsx,local:null});
    ok('E truncated slot: loadedOK stays true (corrupt is not "could not read")', run('loadedOK===true'));
    ok('E truncated slot: the intact slot is used', run('daysWithWork(DB)')===6, run('daysWithWork(DB)'));
    run('save()'); await tick(450);
    ok('E next write: overwrites the TRUNCATED slot, not the good one', JSON.parse(fsx.files.get('showup/db.a.json')).savedAt>0 && JSON.parse(fsx.files.get('showup/db.b.json')).savedAt===at0+600);
  }
  /* F. the zero-day guard */
  { const fsx=fakeFS();
    const {w,run}=await boot({native:true,fsx,local:rec(D(8),at0+100)});
    run('DB.days={};save();'); await tick(450);
    ok('F empty ledger by accident: REFUSED — localStorage still holds 8 days', Object.keys(JSON.parse(w.localStorage.getItem('tracker-v1')).days).length===8);
    run('allowEmptySave=true;save();'); await tick(450);
    ok('F empty ledger on purpose (allowEmptySave): written', Object.keys(JSON.parse(w.localStorage.getItem('tracker-v1')).days).length===0);
  }
  /* G. killed mid-save: the sync WAL is what survives */
  { const fsx=fakeFS();
    const {w,run}=await boot({native:true,fsx,local:rec(D(3),at0+100)});
    fsx.mode.hang=true;
    run(`DB.days['2026-03-03']={w:[{part:'Legs',ex:'Squat',w:100,reps:[3],at:1}],upd:Date.now()};save();flushSave();`);
    ok('G kill mid-save: localStorage has the new set SYNCHRONOUSLY, before any bridge promise', JSON.parse(w.localStorage.getItem('tracker-v1')).days['2026-03-03']!=null);
    ok('G kill mid-save: the slot write was started (and never finished)', fsx.log.some(l=>l.startsWith('write showup/db.')) && ![...fsx.files.keys()].some(k=>k.includes('db.')));
  }
  /* H. sign-out clears the durable record too */
  { const fsx=fakeFS(); fsx.files.set('showup/db.a.json',rec(D(2),at0+100)); fsx.files.set('showup/bak/2026-09-20.json','{}');
    const {run}=await boot({native:true,fsx,local:rec(D(2),at0+100)});
    await run('durable.removeAll()');
    ok('H sign-out path: removeAll clears the slots and the backups', ![...fsx.files.keys()].some(k=>k.startsWith('showup/')), [...fsx.files.keys()].join(','));
  }
  /* I. the daily backup is mirrored and pruned to five */
  { const fsx=fakeFS(); for(const d of ['09-14','09-15','09-16','09-17','09-18']) fsx.files.set('showup/bak/2026-'+d+'.json','{}');
    const {run}=await boot({native:true,fsx,local:rec(D(2),at0+100)}); await tick(50);
    const baks=[...fsx.files.keys()].filter(k=>k.startsWith('showup/bak/')).sort();
    ok('I daily backup: mirrored into the shell and pruned to the last five', baks.length===5 && baks[4]==='showup/bak/2026-09-22.json' && !baks.includes('showup/bak/2026-09-14.json'), baks.map(b=>b.slice(11)).join(' '));
  }
  /* J. a write whose bytes do not land: the slot is not trusted, and the next save retries it */
  { const fsx=fakeFS();
    const {run}=await boot({native:true,fsx,local:rec(D(3),at0+100)});
    fsx.mode.truncateNext=true;
    run('save()'); await tick(450);
    const written=[...fsx.files.keys()].filter(k=>k.includes('db.'));
    ok('J short write: the read-back catches it (the slot holds a truncated record)', written.length===1 && !(()=>{try{JSON.parse(fsx.files.get(written[0]));return true;}catch(e){return false;}})(), written.join(','));
    run('save()'); await tick(450);
    ok('J short write: the NEXT save retries the SAME slot rather than moving on', [...fsx.files.keys()].filter(k=>k.includes('db.')).length===1 && JSON.parse(fsx.files.get(written[0])).savedAt>0);
  }
  console.log(fails?`FAIL ${fails}`:'ALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
