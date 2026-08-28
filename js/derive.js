/* ShowUp — derive.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ============ v3.3.194 — muscle–exercise taxonomy ============
   Two layers (per spec). Layer 1: six VISIBLE groups — the vocabulary the
   app speaks. Layer 2: ten INTERNAL muscles — the resolution the data
   keeps. Every internal muscle rolls up to exactly one visible group.
   Primary-muscle attribution only: one completed set credits ONE muscle.
   Secondary muscles are RECORDED for a few big compounds but NEVER counted —
   double-counting would let one deadlift paint three groups green.
   The spec's 30 movement patterns are absorbed into this mapping over the
   app's real catalog rather than injected as new selectable names: entries
   like "Pull-Up or Lat Pulldown" name two DISTINCT lifts in the ledger, and
   folding them is the merge Phase 1 exists to forbid. */
const VISIBLE_GROUPS=['Chest','Back','Shoulders','Arms','Legs','Core'];
/* v3.3.196: catalog part → visible group. One map, used by every surface
   that speaks in groups; the ledger keeps storing the underlying part. */
const PART_VISIBLE={Chest:'Chest',Back:'Back',Shoulder:'Shoulders',Legs:'Legs',
  Biceps:'Arms',Triceps:'Arms',Sixpack:'Core',Run:'Run'};
/* v3.3.357: Chest and Shoulders were single muscles, so expanding either one
   repeated its parent row and could never show a gap.
   CHEST splits by the pec's two heads: the clavicular (upper) and the
   sternocostal (mid/lower). Real anatomy, and pressing angle biases them --
   incline favours the upper head, flat and decline the lower. It is a BIAS,
   not two independent muscles: both heads work in every press, which is why
   the labels read "upper" and "mid / lower" rather than naming two things
   that could be trained apart. ("Inner" and "outer" chest are not anatomy and
   do not appear here.)
   SHOULDERS splits into the deltoid's three heads -- anterior, lateral,
   posterior -- which genuinely can be trained apart, and which is the point:
   the rear delt is the muscle a pressing-heavy programme misses, and it is
   exactly what this card could not say before. */
const MUSCLE_VISIBLE={'upper-chest':'Chest', chest:'Chest',
  lats:'Back','upper-back':'Back',
  'front-delts':'Shoulders','side-delts':'Shoulders','rear-delts':'Shoulders',
  biceps:'Arms',triceps:'Arms',quads:'Legs',hamstrings:'Legs',calves:'Legs',
  glutes:'Legs',core:'Core'};
/* the label a muscle wears on screen. Only where the key is not already the
   words a person would use; everything else prints its own key. */
const MUSCLE_LABEL={'upper-chest':'upper chest', chest:'mid / lower chest',
  'upper-back':'upper back', 'front-delts':'front delts',
  'side-delts':'side delts', 'rear-delts':'rear delts'};
/* v3.3.357: THE ROSTER. Coverage used to build this list from the sets you
   logged, so a muscle you skipped did not exist in the data and could not be
   drawn -- the card could only ever show what you DID. Seeded from
   MUSCLE_VISIBLE so a group's roster is its rollup read backwards and the two
   cannot drift; the order here is the order on screen. */
const GROUP_MUSCLES=Object.entries(MUSCLE_VISIBLE)
  .reduce((a,[m,v])=>((a[v]=a[v]||[]).push(m),a),{});
const EX_MUSCLE={
  /* Chest — all pressing/fly patterns */
  'Incline Smith Machine Bench Press':'upper-chest','Flat Smith Machine Bench Press':'chest',
  'Incline Dumbbell Bench Press':'upper-chest','Chest Press':'chest','Chest Fly':'chest',
  'Cable Fly Up':'upper-chest',   /* low-to-high: the clavicular head */
  'Cable Fly Down':'chest',       /* high-to-low: the sternocostal head */
  'Chest Squeeze':'chest','Dip':'chest',
  'Barbell Bench Press':'chest','Incline Barbell Bench Press':'upper-chest',
  'Decline Barbell Bench Press':'chest','Dumbbell Bench Press':'chest',
  'Decline Dumbbell Bench Press':'chest','Machine Chest Press':'chest',
  'Cable Crossover':'chest','Incline Cable Fly':'upper-chest','Low Cable Fly':'upper-chest',
  'Dumbbell Pullover':'chest','Landmine Press':'chest','Svend Press':'chest',
  'Push Up':'chest','Weighted Push Up':'chest',
  /* Back — vertical pulls → lats; rows/hinges/shrugs → upper-back or as noted */
  'Pull Up':'lats','Lat Pulldown':'lats','Chin Up':'lats','Weighted Pull Up':'lats',
  'Straight-Arm Pulldown':'lats','Close-Grip Lat Pulldown':'lats',
  'Bent-Over Row':'upper-back','Seated Cable Row':'upper-back',
  'Single-Arm Dumbbell Row':'upper-back','T-Bar Row':'upper-back','Pendlay Row':'upper-back',
  'Inverted Row':'upper-back','Chest-Supported Row':'upper-back','Machine Row':'upper-back',
  'Barbell Shrug':'upper-back',
  'Deadlift':'hamstrings','Rack Pull':'upper-back',
  /* Shoulder */
  /* presses drive the front head; raises to the side, the lateral; anything
     pulling the arm BACKWARD, the rear. */
  'Dumbbell Shoulder Press':'front-delts','Lateral Raise':'side-delts',
  'Dumbbell Front Raise':'front-delts','Dumbbell Combination':'side-delts',
  'Dumbbell Bent Over Side Raise':'rear-delts','Rear Deltoids':'rear-delts',
  'Overhead Barbell Press':'front-delts','Arnold Press':'front-delts',
  'Machine Shoulder Press':'front-delts','Cable Lateral Raise':'side-delts',
  'Face Pull':'rear-delts','Upright Row':'side-delts','Reverse Pec Deck':'rear-delts',
  'Landmine Lateral Raise':'side-delts','Cable Rear Delt Fly':'rear-delts',
  /* Legs — squat/lunge → quads; curls/RDL → hamstrings; thrust → glutes; calf → calves */
  'Squat':'quads','Front Squat':'quads','Hack Squat':'quads','Leg Press':'quads',
  'Goblet Squat':'quads','Leg Extension':'quads','Bulgarian Split Squat':'quads',
  'Dumbbell Lunge':'quads','Walking Lunge':'quads','Step Up':'quads',
  'Romanian Deadlift':'hamstrings','Lying Leg Curl':'hamstrings','Seated Leg Curl':'hamstrings',
  'Hip Thrust':'glutes',
  'Standing Calf Raise':'calves','Seated Calf Raise':'calves',
  /* Arms */
  'Barbell Curl':'biceps','Dumbbell Curl':'biceps','Hammer Curl':'biceps',
  'EZ Bar Curl':'biceps','Preacher Curl':'biceps','Cable Curl':'biceps',
  'Incline Dumbbell Curl':'biceps','Concentration Curl':'biceps','Spider Curl':'biceps',
  'Reverse Curl':'biceps','Cable Hammer Curl':'biceps',
  'Overhead Triceps Extension':'triceps','Close Grip Bench Press':'triceps',
  'Triceps Pushdown':'triceps','Rope Pushdown':'triceps','Skull Crusher':'triceps',
  'Bench Dip':'triceps','Dumbbell Kickback':'triceps','Overhead Cable Extension':'triceps',
  'Diamond Push Up':'triceps',
  /* Core */
  'Hanging Leg Raise':'core','Leg Raise':'core','Plank':'core','Cable Crunch':'core',
  'Russian Twist':'core','Ab Wheel Rollout':'core','Bicycle Crunch':'core','Sit Up':'core',
  'Decline Sit Up':'core','Mountain Climber':'core','Side Plank':'core'};
/* recorded, never counted */
const EX_MUSCLE_2ND={'Deadlift':['glutes','upper-back'],'Squat':['glutes','core'],
  'Romanian Deadlift':['glutes'],'Hip Thrust':['hamstrings'],'Dip':['triceps'],
  'Barbell Bench Press':['triceps','shoulders'],'Pull Up':['biceps'],
  'Bent-Over Row':['lats','biceps'],'Overhead Barbell Press':['triceps'],
  'Bulgarian Split Squat':['glutes'],'Dumbbell Lunge':['glutes'],'Walking Lunge':['glutes']};
/* v3.3.357: an unmapped Shoulder exercise lands on the front head -- the one
   a press hits, which is what an unrecognised shoulder movement most often
   is. It is a guess, and it is the reason a new exercise should get a real
   EX_MUSCLE entry rather than riding the fallback. */
const PART_FALLBACK={Chest:'chest',Back:'upper-back',Shoulder:'front-delts',
  Biceps:'biceps',Triceps:'triceps',Sixpack:'core'};   // Legs deliberately absent
function exMuscle(ex,part){
  return EX_MUSCLE[ex]||PART_FALLBACK[part]||'unassigned';
}
/* last-7-days coverage: per visible group, the distinct DAYS (first — days
   over volume) and completed sets; per internal muscle the same, plus the
   per-day dot strip. Reads the canonical merge every other reader uses. */
function muscleCoverage(){
  const days=[]; for(let i=6;i>=0;i--){
    const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-i);
    days.push(d.toLocaleDateString('en-CA'));
  }
  /* v3.3.357: seeded with the FULL roster at zero, so a muscle you did not
     train is a row that says so instead of a row that does not exist. */
  const g={}; for(const v of VISIBLE_GROUPS){
    g[v]={days:new Set(),sets:0,dots:days.map(()=>false),mus:{}};
    for(const m of (GROUP_MUSCLES[v]||[])) g[v].mus[m]={days:new Set(),sets:0};
  }
  days.forEach((iso,di)=>{
    const rows=iso===todayISO
      ?((DB.days[iso]||{}).w||[]).map(s2=>[s2.part,s2.ex,s2.w,s2.reps||[]])
      :(SEED.sessions[iso]||[]);
    for(const r of rows){
      if(r[1]==='Run'||!(r[3]||[]).length) continue;
      const m=exMuscle(r[1],r[0]);
      const vis=MUSCLE_VISIBLE[m]||({Legs:'Legs'})[r[0]]||MUSCLE_VISIBLE[PART_FALLBACK[r[0]]]||'Core';
      const gg=g[vis]; if(!gg) continue;
      gg.days.add(iso); gg.sets+=r[3].length; gg.dots[di]=true;
      gg.mus[m]=gg.mus[m]||{days:new Set(),sets:0};   // a stray key still counts
      gg.mus[m].days.add(iso); gg.mus[m].sets+=r[3].length;
    }
  });
  return {days,groups:g};
}
function deriveAll(){
  const S={};
  for(const d of Object.keys(DB.days).sort()){
    if(d>=todayISO) continue;
    /* v3.3.191: index 6 carries the canonical id so readers can count by
       identity instead of by the display string. Positions 0–5 are
       unchanged — every existing consumer keeps working. */
    const rows=(DB.days[d].w||[]).map(s=>[s.part,s.ex,s.w,s.reps||[],s.mins??null,s.secs??null,s.cid,s.su]);
    if(rows.length) S[d]=rows;
  }
  const days=Object.keys(S).sort();
  const isRunR=r=>r[1]==='Run';
  /* SLICE 3: a HOLD's number is seconds, not reps, so nothing here may
     multiply it or rank it. isHoldR is the one predicate; every site that
     reads a rep VALUE (rather than counting sets) consults it.
     Volume: weight x seconds is not a number, and a weighted plank would
     otherwise contribute w*60 to a day's tonnage. Sets still count -- that
     is reps.length and it is untouched, which is the whole point of the
     v3.3.341 storage choice. */
  const isHoldR=r=>r[7]==='s';
  const volR=r=>(isRunR(r)||isHoldR(r))?0:r[2]*(r[3]||[]).reduce((a,b)=>a+b,0);
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
          if(isHoldR(r)) continue;      // SLICE 3: 'best set' means reps at a weight
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
  /* v3.3.149: the WIDER rule. This used to require isLive(), so tapping
     ✓ Complete stopped the clock for the rest of the visit — finish a part,
     start prepping the next exercise, and there was nothing to read. But
     "time since my last set" is useful whenever it is short, whatever has
     been marked done; the 30-minute guard already says "you left".
     lastSetAt is null until something is logged today, so a rest day and an
     unwritten morning still show nothing. */
  const show = !!lastSetAt && Math.floor((Date.now()-lastSetAt)/1000)<=1800;
  el.classList.toggle('on',show);          // visibility is the timer's own, not the header's
  el.classList.toggle('done',show&&!isLive());
  if(!show){ el.textContent=''; return; }
  const s=Math.max(0,Math.floor((Date.now()-lastSetAt)/1000));
  el.textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
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
  /* v3.3.244: REGISTER, and check for a new worker on every launch. The app
     shipped without a register() call at all — the worker running on a device
     was whatever some past version installed, and the only thing that ever
     refreshed it was pull-to-refresh. Everyone else ran a release behind:
     stale-while-revalidate serves the cached shell first and only then fetches
     the new one, so a fix landed on screen one launch after it shipped. With
     an explicit update() at boot, skipWaiting and the reload above, a deploy
     goes live on the next launch instead. */
  addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js')
      .then(reg=>{ reg.update().catch(()=>{}); })
      .catch(()=>{});
  });
}
addEventListener('pagehide', flushSave);
