/* test-storage-quota.js DIR — v4.6.349: "Not saved — storage unavailable".
 * Every safety copy (five day backups, pre-units, pre-restore) was a full copy of
 * the record in localStorage. A long history filled the ~5 MB quota and then the
 * record itself could not save. The rules:
 *  - a full localStorage never stops the record saving: the copies are dropped
 *    and the write retried;
 *  - safety copies live in IndexedDB; boot moves any old ones out of localStorage;
 *  - five day copies are kept;
 *  - a restore on a full device still restores.
 * jsdom's localStorage enforces the real 5,000,000-unit quota. IndexedDB is a
 * small in-memory fake (jsdom has none).
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const tick=()=>new Promise(r=>setTimeout(r,0));
const settle=async(n=60)=>{for(let i=0;i<n;i++)await tick();};

function fakeIDB(){
  const stores={};
  const req=(fn)=>{ const r={}; setTimeout(()=>{ r.result=fn(); r.onsuccess&&r.onsuccess(); },0); return r; };
  const db={ transaction(name,mode){ const m=stores[name], t={};
      const op=f=>{ const r={}; r.result=f(); return r; };
      t.objectStore=()=>({ put:(v,k)=>op(()=>{ m.set(k,v); return k; }), get:k=>op(()=>m.get(k)),
        getAllKeys:()=>op(()=>[...m.keys()]), delete:k=>op(()=>{ m.delete(k); }), clear:()=>op(()=>{ m.clear(); }) });
      setTimeout(()=>t.oncomplete&&t.oncomplete(),0); return t; },
    createObjectStore(n){ stores[n]=new Map(); } };
  return { stores, open(){ const r={}; setTimeout(()=>{ r.result=db; if(!stores.bak){ r.onupgradeneeded&&r.onupgradeneeded(); } r.onsuccess&&r.onsuccess(); },0); return r; } };
}

const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
const big=n=>'x'.repeat(Math.max(0,n));
const used=ls=>Object.keys(ls).reduce((a,k)=>a+k.length+ls.getItem(k).length,0);
function record(){
  const days={};
  for(let i=0;i<40;i++){ const d=new Date(Date.UTC(2026,7,1+i)).toISOString().slice(0,10);
    days[d]={w:[{part:'Chest',ex:'Bench Press',w:80,reps:[8,8,8],at:1}],upd:1}; }
  return {days,settings:{}};
}
async function app({idb=true,fill=0,backups=[]}={}){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext();
  const I=idb?fakeIDB():null; if(I) w.indexedDB=I;
  w.localStorage.setItem('tracker-v1',JSON.stringify(record()));
  for(const [k,n] of backups) w.localStorage.setItem('showup:bak:'+k,big(n));
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('offline');};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(srcs[s],ctx,{filename:s});
  vm.runInContext(`todayISO='2026-10-17';checkDate=()=>false;`,ctx);
  await settle();
  const run=c=>vm.runInContext(c,ctx);
  const lsBak=()=>Object.keys(w.localStorage).filter(k=>k.startsWith('showup:bak:'));
  const toast=()=>w.document.getElementById('toast')?.textContent||'';
  return {w,run,I,lsBak,toast};
}

(async()=>{
  /* 1. no IndexedDB, storage packed with old copies: the record still saves */
  {
    const a=await app({idb:false,backups:[['2026-10-12',1e6],['2026-10-13',1e6],['2026-10-14',1e6],['2026-10-15',1e6]]});
    ok('setup: old copies stay put when there is nowhere to move them', a.lsBak().length===4, a.lsBak().length);
    a.w.localStorage.setItem('showup:pad',big(5e6-used(a.w.localStorage)-20));
    let packed=false; try{ a.w.localStorage.setItem('showup:probe',big(200)); }catch(e){ packed=true; }
    ok('setup: localStorage is genuinely full', packed);
    a.run(`DB.days['2026-10-17']={w:[{part:'Back',ex:'Row',w:60,reps:[10],at:2}],upd:Date.now()}`);
    const r=a.run('dbWrite()');
    ok('full storage: the record saves anyway', r===true && JSON.parse(a.w.localStorage.getItem('tracker-v1')).days['2026-10-17'], r);
    ok('full storage: the safety copies made the room', a.lsBak().length===0, a.lsBak().join(','));
    a.run('save()'); await new Promise(r=>setTimeout(r,500));
    ok('full storage: no "Not saved" toast', !/Not saved/.test(a.toast()), a.toast());
  }
  /* 2. IndexedDB present: boot moves the old copies out and the day copy goes there */
  {
    const days=['2026-10-08','2026-10-09','2026-10-10','2026-10-11','2026-10-12','2026-10-13','2026-10-14'];
    const a=await app({backups:[...days.map(d=>[d,1000]),['preunits',500]]});
    await settle();
    const keys=[...a.I.stores.bak.keys()].sort();
    ok('boot: no safety copy left in localStorage', a.lsBak().length===0, a.lsBak().join(','));
    ok('boot: old copies moved to IndexedDB, five days kept', keys.filter(k=>/^\d{4}/.test(k)).length===5 && keys.includes('preunits') && keys.includes('2026-10-17'), keys.join(','));
    ok('boot: today\'s copy is the real record', JSON.parse(a.I.stores.bak.get('2026-10-17')).days['2026-08-01']);
    ok('boot: the oldest days were the ones dropped', !keys.includes('2026-10-08') && !keys.includes('2026-10-09') && !keys.includes('2026-10-10'), keys.join(','));
    const before=a.I.stores.bak.get('2026-10-17');
    a.run(`DB.days['2026-10-17']={w:[{part:'Back',ex:'Row',w:60,reps:[10],at:2}],upd:Date.now()}`); a.run('dailyBackup()'); await settle();
    ok('day copy: taken once a day, not overwritten', a.I.stores.bak.get('2026-10-17')===before);
  }
  /* 3. a restore on a full device still restores (the pre-restore copy used to throw) */
  {
    const a=await app();
    a.w.localStorage.setItem('showup:pad',big(5e6-used(a.w.localStorage)-20));
    let packed=false; try{ a.w.localStorage.setItem('showup:probe',big(200)); }catch(e){ packed=true; }
    ok('setup: localStorage is genuinely full', packed);
    a.w.confirm=()=>true;
    let reloads=0; a.run('location.reload=()=>{}');
    const backup=JSON.stringify({days:{'2026-09-01':{w:[{part:'Legs',ex:'Squat',w:100,reps:[5],at:1}],upd:1}},settings:{}});
    a.run(`window.__rb=${JSON.stringify(backup)}`);
    a.run(`restoreBackup(new File([window.__rb],'b.json',{type:'application/json'}))`);
    await new Promise(r=>setTimeout(r,400)); await settle();
    ok('restore on full device: the restore goes through', /Restored/.test(a.toast()) && a.run(`!!DB.days['2026-09-01']`), a.toast());
    ok('restore: the pre-restore copy is in IndexedDB', !!a.I.stores.bak.get('prerestore') && !a.w.localStorage.getItem('showup:bak:prerestore'));
  }
  /* 4. the source rule */
  const src=order.map(s=>srcs[s]).join('\n');
  ok('source: nothing writes a showup:bak: key to localStorage', !/localStorage\.setItem\(\s*['"`]showup:bak/.test(src) && !/localStorage\.setItem\(k, raw\)/.test(src));
  console.log(fails?`\n${fails} FAILED`:'\nALL PASS'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
