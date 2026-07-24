/* ShowUp — derive.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
function deriveAll(){
  const S={};
  for(const d of Object.keys(DB.days).sort()){
    if(d>=todayISO) continue;
    const rows=(DB.days[d].w||[]).map(s=>[s.part,s.ex,s.w,s.reps||[],s.mins??null,s.secs??null]);
    if(rows.length) S[d]=rows;
  }
  const days=Object.keys(S).sort();
  const isRunR=r=>r[1]==='Run';
  const volR=r=>isRunR(r)?0:r[2]*(r[3]||[]).reduce((a,b)=>a+b,0);
  const D={sessions:S, dates:days, catalog:SEED0.catalog, ex2part:SEED0.ex2part, equip:SEED0.equip};
  if(!days.length){ D.totals={sessions:0,first:null,last:'0000-00-00',km:0,vol:0};
    D.monthly={};D.partCount={};D.partLast={};D.partDays={};D.exLast={};D.exFreq={};
    D.pr={};D.hist={};D.repFreq={};D.last={};D.lastSess={}; return D; }
  let kmF=0, v=0;
  for(const d of days) for(const r of S[d]){ if(isRunR(r)) kmF+=r[2]; else v+=volR(r); }
  D.totals={sessions:days.length, first:days[0], last:days[days.length-1],
            km:+kmF.toFixed(1), vol:Math.round(v)};
  const bank=x=>{const f=Math.floor(x),r=x-f;return r>0.5?f+1:r<0.5?f:(f%2===0?f:f+1);};
  D.monthly={};
  for(const d of days){
    const m=d.slice(0,7);
    const o=D.monthly[m]=D.monthly[m]||{days:0,vol:0,km:0,sets:0};
    o.days++;
    for(const r of S[d]){
      if(isRunR(r)){o.kmF=(o.kmF||0)+r[2];}
      else{o.vol+=volR(r);o.sets+=(r[3]||[]).length;}
    }
  }
  for(const o of Object.values(D.monthly)){o.km=+((o.kmF||0)).toFixed(1);delete o.kmF;o.vol=bank(o.vol);}
  D.partCount={};D.partLast={};D.partDays={};D.exLast={};D.exFreq={};
  D.pr={};D.hist={};D.repFreq={};D.last={};D.lastSess={};
  const cutD=new Date(todayISO+'T00:00:00'); cutD.setDate(cutD.getDate()-365);
  const freqCut=cutD.toLocaleDateString('en-CA');
  const repCount={};
  for(const d of days){
    const parts=new Set(), exs={};
    for(const r of S[d]){ parts.add(r[0]); (exs[r[1]]=exs[r[1]]||[]).push(r); }
    for(const r of S[d]) D.partCount[r[0]]=(D.partCount[r[0]]||0)+1;
    for(const p of parts){
      D.partLast[p]=d;
      D.partDays[p]=D.partDays[p]||[];
      if(d>freqCut) D.partDays[p].push(d);
    }
    for(const [ex,rows] of Object.entries(exs)){
      D.exLast[ex]=d;
      if(d>freqCut) D.exFreq[ex]=(D.exFreq[ex]||0)+1;
      if(ex!=='Run'){
        const pr=D.pr[ex]=D.pr[ex]||{mw:0,mwr:0,mwd:null,bv:0,bvr:0,bvw:0,bvd:null};
        for(const r of rows){
          const reps=r[3]||[];
          for(const rep of reps){
            if(r[2]>pr.mw){pr.mw=r[2];pr.mwr=rep;pr.mwd=d;}
            else if(r[2]===pr.mw&&rep>pr.mwr){pr.mwr=rep;pr.mwd=d;}
            const sv=r[2]*rep;
            if(sv>pr.bv){pr.bv=sv;pr.bvr=rep;pr.bvw=r[2];pr.bvd=d;}
          }
          const rc=repCount[ex]=repCount[ex]||{c:{},o:{},n:0};
          for(const rep of reps){ rc.c[rep]=(rc.c[rep]||0)+1; if(!(rep in rc.o)) rc.o[rep]=rc.n++; }
        }
      }else{
        for(const r of rows){
          const reps=r[3]||[];
          if(reps.length){
            const rc=repCount[ex]=repCount[ex]||{c:{},o:{},n:0};
            for(const rep of reps){ rc.c[rep]=(rc.c[rep]||0)+1; if(!(rep in rc.o)) rc.o[rep]=rc.n++; }
          }
        }
      }
      let hw=0, hr=0;
      for(const r of rows){
        if(isRunR(r)){ hw+=r[2]; }
        else { if(r[2]>hw) hw=r[2]; for(const rep of r[3]||[]) if(rep>hr) hr=rep; }
      }
      if(ex==='Run') hw=Math.round(hw*100)/100;
      (D.hist[ex]=D.hist[ex]||[]).push([d,hw,hr]);
      D.last[ex]={d, sets:rows.map(r=>[r[2],r[3]||[],r[4],r[5]])};
      const lr=rows.filter(r=>isRunR(r)||(r[3]||[]).length).map(r=>[r[2],r[3]||[]]);
      if(lr.length) D.lastSess[ex]={d, rows:lr};
    }
  }
  for(const ex of Object.keys(D.hist)) D.hist[ex]=D.hist[ex].slice(-14);
  for(const [ex,rc] of Object.entries(repCount))
    D.repFreq[ex]=Object.keys(rc.c).sort((a,b)=>rc.c[b]-rc.c[a]||rc.o[a]-rc.o[b]).map(k=>+k).slice(0,8);
  return D;
}

function migrateV3(){
  if(DB.settings.v3migrated) return 0;
  if(!Object.keys(SEED0.sessions).length){ DB.settings.v3migrated=APP_VERSION; return 0; }
  let added=0;
  const arch=buildArchive().days;
  for(const [d,v] of Object.entries(arch)){
    if(DB.days[d]) continue;                     // never overwrite app-logged days
    const day={w:v.w.map(s=>({...s}))};
    day.upd=legacyStamp(d,day);
    DB.days[d]=day; added++;
  }
  DB.settings.v3migrated=APP_VERSION;
  return added;
}
/* v3.0.1: the sheet-era treadmill logged MILES; weights were always kg.
   Forensics (2026-07-18): 901-run median pace 12.7-14.5 min/unit → miles
   (=7'54"/km, matching app-measured 7'46"/km); Pull Up/Dip = 70 (his kg
   bodyweight) in every year → weights kg. Convert Run distances only,
   for days on or before the sheet-era boundary. Idempotent via synced flag;
   converted days are stamped so LWW carries the fix to every device. */
/* v3.3.66: bodyweight moves from a scalar setting to a dated series. The scalar
   carried no history, so every past bodyweight lift was valued at today's
   weight. Seed ONE entry at the first logged day, which makes the whole archive
   read at that weight — for this archive that is not a guess: the v3.0.1
   forensics found Pull Up/Dip = 70 in every sheet-era year. Idempotent via a
   synced flag; the seeded day is stamped so LWW carries it to every device. */
function migrateBw(){
  if(DB.settings.bwSeeded) return 0;
  DB.settings.bwSeeded=APP_VERSION;
  if(Object.keys(DB.days).some(d=>DB.days[d].bw>0)) return 0;   // a series already exists
  const kg=DB.settings.bodyKg;
  if(!(kg>0)) return 0;                                          // nothing to carry over
  const first=Object.keys(DB.days).filter(d=>(DB.days[d].w||[]).length).sort()[0];
  if(!first) return 0;
  DB.days[first].bw=+(+kg).toFixed(1);
  DB.days[first].upd=Date.now();
  return 1;
}
function migrateMiles(){
  if(DB.settings.miConverted) return 0;
  const CUT='2026-07-10';                       // last sheet-era day (SEED0.totals.last)
  let fixed=0;
  for(const [d,v] of Object.entries(DB.days)){
    if(d>CUT||!v.w) continue;
    let touched=false;
    for(const s of v.w){
      if(s.ex==='Run'&&s.w>0){ s.w=+(s.w*1.609344).toFixed(2); touched=true; fixed++; }
    }
    if(touched) v.upd=Date.now();
  }
  DB.settings.miConverted=APP_VERSION;
  if(fixed){
    // milestone bookkeeping catches up silently — no false celebration toast
    const days=runDays(); 
    const total=toD(days.reduce((a,r)=>a+r.km,0));
    DB.settings.kmMilestone=Math.floor(total/100)*100;
  }
  return fixed;
}
/* v3.0.2: the sheet's weight ledger, decoded with Sungjee (2026-07-18):
   - smith: already total kg — UNTOUCHED (calibration: 60→60, 35→35 exact)
   - dumbbell: lb ledger of kg iron → ×0.45359237, snapped to 1 kg bells
     (26.45 lb → 12 kg exactly; 45 lb → 20 kg)
   - barbell: PER-SIDE lb, excluding the 45 lb bar → (2×side+45)×0.45359237,
     0.1 kg precision (Row 45/side → 61.2; Squat 110/side → 120.2)
   - machine/cable: lb stack faces → ×conv, snapped to 2.5 kg stack steps
   - body: Pull Up stays 70 (his kg bodyweight); Dip → 70 everywhere (the 25/50
     rows were noise); Leg Raise & Hanging Leg Raise → 0 = bodyweight label,
     no fabricated volume; Chest Squeeze = lb plate → conv, 1.25 kg grid
   Cut: rows before 2026-07-13 (his benchmark Monday). One targeted post-cut
   fix: Dumbbell Combination rows at 22 → 10 (admitted leftover habit). */
function migrateUnits(){
  if(DB.settings.unitsFixed) return 0;
  try{ localStorage.setItem('showup:bak:preunits', JSON.stringify(DB.days)); }catch(e){}
  const CUT='2026-07-13', LB=0.45359237;
  const snap=(x,g)=>Math.round(x/g)*g;
  const r1=x=>Math.round(x*10)/10;
  const eq=ex=>SEED0.equip[ex]||'machine';
  let fixed=0;
  for(const [d,v] of Object.entries(DB.days)){
    if(!v.w) continue;
    let touched=false;
    for(const s of v.w){
      if(s.ex==='Run') continue;
      if(d>=CUT){
        if(s.ex==='Dumbbell Combination'&&s.w===22){ s.w=10; touched=true; fixed++; }
        continue;
      }
      const e=eq(s.ex); const w0=s.w;
      if(e==='smith') continue;
      if(s.ex==='Pull Up'){ s.w=70; }
      else if(s.ex==='Dip'){ s.w=70; }
      else if(s.ex==='Leg Raise'||s.ex==='Hanging Leg Raise'){ s.w=0; }
      else if(s.ex==='Chest Squeeze'){ s.w=snap(s.w*LB,1.25); }
      else if(e==='dumbbell'){ s.w=Math.max(1,Math.round(s.w*LB)); }
      else if(e==='barbell'){ s.w=r1((2*s.w+45)*LB); }
      else { s.w=snap(s.w*LB,2.5); }              // machine / cable stacks
      if(s.w!==w0){ touched=true; fixed++; }
    }
    if(touched) v.upd=Date.now();
  }
  DB.settings.unitsFixed=APP_VERSION;
  return fixed;
}
function dailyBackup(){
  try{
    const k='showup:bak:'+todayISO;
    if(localStorage.getItem(k)) return;
    localStorage.setItem(k, JSON.stringify({days:DB.days,settings:DB.settings,settingsAt:DB.settingsAt}));
    Object.keys(localStorage).filter(x=>x.startsWith('showup:bak:')).sort().slice(0,-5)
      .forEach(x=>localStorage.removeItem(x));            // keep the last 5 days
  }catch(e){}
}
function flushSave(){
  if(session) cloudPushNow(true);       // phone → cloud on every background/close (keepalive)
  if(!saveDirty) return;
  clearTimeout(saveTimer); saveDirty=false;
  try{ localStorage.setItem(KEY, JSON.stringify(DB)); }catch(e){}
  store.set(KEY, JSON.stringify(DB));   // async layer too, if it gets the chance
}
document.addEventListener('change',e=>{
  if(e.target && e.target.id==='wv' && lift.ex){
    lift.weight=toKg(+e.target.value||0);
    saveExW(lift.ex,lift.weight);save(true);
  }
});
function tickRest(){
  const el=$('#hTimer'); if(!el) return;
  if(isLive()&&lastSetAt){
    const s=Math.max(0,Math.floor((Date.now()-lastSetAt)/1000));
    if(s>1800){ el.textContent=''; return; }   // 30+ min isn't "rest between sets" anymore
    el.textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  } else el.textContent='';
}
setInterval(tickRest,1000);
/* hold a set tile ~0.5s to edit it; a plain tap still deletes.
   Scroll movement cancels the hold, and the click that follows a fired
   long-press is swallowed so it can't delete the set being edited. */
let lpTimer=null, lpFired=false, lpX=0, lpY=0;
document.addEventListener('pointerdown',e=>{
  const tile=e.target.closest('.settile[data-del]');
  if(!tile) return;
  lpFired=false; lpX=e.clientX; lpY=e.clientY;
  lpTimer=setTimeout(()=>{
    lpFired=true;
    lift.editSet=+tile.dataset.del;
    try{ navigator.vibrate&&navigator.vibrate(10); }catch(_e){}
    renderLift();
  },480);
});
document.addEventListener('pointermove',e=>{
  if(lpTimer&&(Math.abs(e.clientX-lpX)>10||Math.abs(e.clientY-lpY)>10)){clearTimeout(lpTimer);lpTimer=null;}
});
['pointerup','pointercancel'].forEach(ev=>document.addEventListener(ev,()=>{clearTimeout(lpTimer);lpTimer=null;}));
document.addEventListener('focusin',e=>{
  if(['wv','rc','rk','rm','rs','barIn','bodyW'].includes(e.target.id)) setTimeout(()=>e.target.select(),0);
});
if('serviceWorker' in navigator){
  let reloadedForUpdate=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(reloadedForUpdate) return; reloadedForUpdate=true;
    stashWhere(); flushSave(); location.reload();   // the new version is live — restart into it once
  });
}
addEventListener('pagehide', flushSave);
