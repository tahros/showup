/* ShowUp — core.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
const APP_VERSION = 'v3.3.3';
const SEED0 = {catalog:{"Chest":["Incline Smith Machine Bench Press","Flat Smith Machine Bench Press","Incline Dumbbell Bench Press","Chest Press","Pectoral Fly","Cable Fly Up","Cable Fly Down","Chest Squeeze","Dip","Barbell Bench Press","Incline Barbell Bench Press","Decline Barbell Bench Press","Dumbbell Bench Press","Decline Dumbbell Bench Press","Machine Chest Press","Cable Crossover","Incline Cable Fly","Low Cable Fly","Dumbbell Pullover","Landmine Press","Svend Press","Push Up","Weighted Push Up"],"Back":["Pull Up","Lat Pull Down","Bent-Over Row","Row","Deadlift","Chin Up","Weighted Pull Up","Seated Cable Row","Single-Arm Dumbbell Row","T-Bar Row","Pendlay Row","Barbell Shrug","Rack Pull","Straight-Arm Pulldown","Close-Grip Lat Pull Down","Inverted Row","Chest-Supported Row","Machine Row"],"Shoulder":["Dumbbell Press","Dumbbell Side Raise","Dumbbell Front Raise","Dumbbell Combination","Dumbbell Bent Over Side Raise","Rear Deltoids","Overhead Barbell Press","Arnold Press","Machine Shoulder Press","Cable Lateral Raise","Face Pull","Upright Row","Reverse Pec Deck","Landmine Lateral Raise","Cable Rear Delt Fly"],"Legs":["Squat","Dumbbell Lunge","Front Squat","Hack Squat","Leg Press","Romanian Deadlift","Bulgarian Split Squat","Walking Lunge","Leg Extension","Lying Leg Curl","Seated Leg Curl","Hip Thrust","Goblet Squat","Standing Calf Raise","Seated Calf Raise","Step Up"],"Biceps":["Barbell Curl","Dumbbell Curl","Hammer Curl","EZ Bar Curl","Preacher Curl","Cable Curl","Incline Dumbbell Curl","Concentration Curl","Spider Curl","Reverse Curl","Cable Hammer Curl"],"Triceps":["Overhead Triceps Extension","Close Grip Bench Press","Triceps Pushdown","Rope Pushdown","Skull Crusher","Bench Dip","Dumbbell Kickback","Overhead Cable Extension","Diamond Push Up"],"Sixpack":["Hanging Leg Raise","Leg Raise","Plank","Cable Crunch","Russian Twist","Ab Wheel Rollout","Bicycle Crunch","Sit Up","Decline Sit Up","Mountain Climber","Side Plank"],"Run":["Run"]},ex2part:{"Incline Smith Machine Bench Press":"Chest","Flat Smith Machine Bench Press":"Chest","Incline Dumbbell Bench Press":"Chest","Chest Press":"Chest","Pectoral Fly":"Chest","Cable Fly Up":"Chest","Cable Fly Down":"Chest","Chest Squeeze":"Chest","Dip":"Chest","Barbell Bench Press":"Chest","Incline Barbell Bench Press":"Chest","Decline Barbell Bench Press":"Chest","Dumbbell Bench Press":"Chest","Decline Dumbbell Bench Press":"Chest","Machine Chest Press":"Chest","Cable Crossover":"Chest","Incline Cable Fly":"Chest","Low Cable Fly":"Chest","Dumbbell Pullover":"Chest","Landmine Press":"Chest","Svend Press":"Chest","Push Up":"Chest","Weighted Push Up":"Chest","Pull Up":"Back","Lat Pull Down":"Back","Bent-Over Row":"Back","Row":"Back","Deadlift":"Back","Chin Up":"Back","Weighted Pull Up":"Back","Seated Cable Row":"Back","Single-Arm Dumbbell Row":"Back","T-Bar Row":"Back","Pendlay Row":"Back","Barbell Shrug":"Back","Rack Pull":"Back","Straight-Arm Pulldown":"Back","Close-Grip Lat Pull Down":"Back","Inverted Row":"Back","Chest-Supported Row":"Back","Machine Row":"Back","Dumbbell Press":"Shoulder","Dumbbell Side Raise":"Shoulder","Dumbbell Front Raise":"Shoulder","Dumbbell Combination":"Shoulder","Dumbbell Bent Over Side Raise":"Shoulder","Rear Deltoids":"Shoulder","Overhead Barbell Press":"Shoulder","Arnold Press":"Shoulder","Machine Shoulder Press":"Shoulder","Cable Lateral Raise":"Shoulder","Face Pull":"Shoulder","Upright Row":"Shoulder","Reverse Pec Deck":"Shoulder","Landmine Lateral Raise":"Shoulder","Cable Rear Delt Fly":"Shoulder","Squat":"Legs","Dumbbell Lunge":"Legs","Front Squat":"Legs","Hack Squat":"Legs","Leg Press":"Legs","Romanian Deadlift":"Legs","Bulgarian Split Squat":"Legs","Walking Lunge":"Legs","Leg Extension":"Legs","Lying Leg Curl":"Legs","Seated Leg Curl":"Legs","Hip Thrust":"Legs","Goblet Squat":"Legs","Standing Calf Raise":"Legs","Seated Calf Raise":"Legs","Step Up":"Legs","Barbell Curl":"Biceps","Dumbbell Curl":"Biceps","Hammer Curl":"Biceps","EZ Bar Curl":"Biceps","Preacher Curl":"Biceps","Cable Curl":"Biceps","Incline Dumbbell Curl":"Biceps","Concentration Curl":"Biceps","Spider Curl":"Biceps","Reverse Curl":"Biceps","Cable Hammer Curl":"Biceps","Overhead Triceps Extension":"Triceps","Close Grip Bench Press":"Triceps","Triceps Pushdown":"Triceps","Rope Pushdown":"Triceps","Skull Crusher":"Triceps","Bench Dip":"Triceps","Dumbbell Kickback":"Triceps","Overhead Cable Extension":"Triceps","Diamond Push Up":"Triceps","Hanging Leg Raise":"Sixpack","Leg Raise":"Sixpack","Plank":"Sixpack","Cable Crunch":"Sixpack","Russian Twist":"Sixpack","Ab Wheel Rollout":"Sixpack","Bicycle Crunch":"Sixpack","Sit Up":"Sixpack","Decline Sit Up":"Sixpack","Mountain Climber":"Sixpack","Side Plank":"Sixpack","Run":"Run"},equip:{"Incline Smith Machine Bench Press":"smith","Flat Smith Machine Bench Press":"smith","Incline Dumbbell Bench Press":"dumbbell","Chest Press":"machine","Pectoral Fly":"machine","Cable Fly Up":"cable","Cable Fly Down":"cable","Chest Squeeze":"body","Dip":"body","Barbell Bench Press":"barbell","Incline Barbell Bench Press":"barbell","Decline Barbell Bench Press":"barbell","Dumbbell Bench Press":"dumbbell","Decline Dumbbell Bench Press":"dumbbell","Machine Chest Press":"machine","Cable Crossover":"cable","Incline Cable Fly":"cable","Low Cable Fly":"cable","Dumbbell Pullover":"dumbbell","Landmine Press":"barbell","Svend Press":"dumbbell","Push Up":"body","Weighted Push Up":"body","Pull Up":"body","Lat Pull Down":"cable","Bent-Over Row":"barbell","Row":"cable","Deadlift":"barbell","Chin Up":"body","Weighted Pull Up":"body","Seated Cable Row":"cable","Single-Arm Dumbbell Row":"dumbbell","T-Bar Row":"barbell","Pendlay Row":"barbell","Barbell Shrug":"barbell","Rack Pull":"barbell","Straight-Arm Pulldown":"cable","Close-Grip Lat Pull Down":"cable","Inverted Row":"body","Chest-Supported Row":"cable","Machine Row":"cable","Dumbbell Press":"dumbbell","Dumbbell Side Raise":"dumbbell","Dumbbell Front Raise":"dumbbell","Dumbbell Combination":"dumbbell","Dumbbell Bent Over Side Raise":"dumbbell","Rear Deltoids":"machine","Overhead Barbell Press":"barbell","Arnold Press":"dumbbell","Machine Shoulder Press":"machine","Cable Lateral Raise":"cable","Face Pull":"cable","Upright Row":"barbell","Reverse Pec Deck":"machine","Landmine Lateral Raise":"cable","Cable Rear Delt Fly":"cable","Squat":"barbell","Dumbbell Lunge":"dumbbell","Front Squat":"barbell","Hack Squat":"machine","Leg Press":"machine","Romanian Deadlift":"barbell","Bulgarian Split Squat":"dumbbell","Walking Lunge":"dumbbell","Leg Extension":"machine","Lying Leg Curl":"machine","Seated Leg Curl":"machine","Hip Thrust":"barbell","Goblet Squat":"barbell","Standing Calf Raise":"machine","Seated Calf Raise":"machine","Step Up":"dumbbell","Barbell Curl":"barbell","Dumbbell Curl":"dumbbell","Hammer Curl":"dumbbell","EZ Bar Curl":"barbell","Preacher Curl":"barbell","Cable Curl":"cable","Incline Dumbbell Curl":"dumbbell","Concentration Curl":"dumbbell","Spider Curl":"dumbbell","Reverse Curl":"barbell","Cable Hammer Curl":"cable","Overhead Triceps Extension":"machine","Close Grip Bench Press":"barbell","Triceps Pushdown":"cable","Rope Pushdown":"cable","Skull Crusher":"barbell","Bench Dip":"body","Dumbbell Kickback":"dumbbell","Overhead Cable Extension":"cable","Diamond Push Up":"body","Hanging Leg Raise":"body","Leg Raise":"body","Plank":"body","Cable Crunch":"cable","Russian Twist":"body","Ab Wheel Rollout":"body","Bicycle Crunch":"body","Sit Up":"body","Decline Sit Up":"body","Mountain Climber":"body","Side Plank":"body","Run":"run"},sessions:{},dates:[],monthly:{},pr:{},hist:{},last:{},lastSess:{},repFreq:{},exFreq:{},exLast:{},partCount:{},partLast:{},partDays:{},totals:{sessions:0,first:null,last:'0000-00-00',km:0,vol:0}};
/* v3.2.1: the 918-day seed literal is GONE (~75% of this file). History lives
   in doc.days (Supabase + localStorage). Full seed preserved forever in git
   tag v3.2-last-seed for disaster recovery. Fresh installs boot empty or
   restore from the cloud on sign-in. */


/* ---------- state ---------- */
let SEED=SEED0;   // replaced at boot by deriveAll() — v3.0
const KEY = 'tracker-v1';
let DB = {days:{}, settings:{theme:'dark', unit:'kg', barKg:20, smithKg:20, barByEx:{}, gh:{owner:'',repo:'',path:'workout-data.json',token:''}, lastSync:null}};
let view = 'today';
let prevView = 'today';
/* a refresh should put you back exactly where you were — same tab, same part,
   same exercise. Stashed in sessionStorage so it dies with the tab, not the app. */
const VKEY='showup:where';
function stashWhere(){
  try{ sessionStorage.setItem(VKEY, JSON.stringify({view, prevView, lift:{part:lift.part,ex:lift.ex}})); }catch(e){}
}
function restoreWhere(){
  try{
    const w=JSON.parse(sessionStorage.getItem(VKEY)||'null');
    if(!w) return;
    sessionStorage.removeItem(VKEY);
    if(w.view) view=w.view;
    if(w.prevView) prevView=w.prevView;
    if(w.lift){ lift.part=w.lift.part||null; lift.ex=w.lift.ex||null; }
    document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===view));
  }catch(e){}
}
let lift = {part:null, ex:null, weight:0, editBar:false, copy:false, info:false, adding:false, newEquip:'barbell', suggestOpen:null};
let hist = {y:null, m:null};   // History tab selection; null = current
const undoStack=[];                       // snapshots of today's sets, for revert
function snapshot(label){
  undoStack.push({label, w:JSON.parse(JSON.stringify(day(todayISO).w))});
  if(undoStack.length>20) undoStack.shift();
}
function undo(){
  const s=undoStack.pop();
  if(!s) return toast('Nothing to undo');
  day(todayISO).w=s.w;
  reanchorRest();
  save();renderHeader();toast(`Undid: ${s.label}`);
  renderLift();
}
let todayISO = new Date().toLocaleDateString('en-CA');
// if the app lives across midnight, roll the day over instead of logging into yesterday
function checkDate(){
  const now=new Date().toLocaleDateString('en-CA');
  if(now!==todayISO){ todayISO=now; lift.copy=false; lift.suggestOpen=null; render(); }
}
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) checkDate(); });
setInterval(checkDate, 60*1000);
const thisYear = todayISO.slice(0,4);

/* ================= CLOUD (Supabase) =================
   Fill these two constants after creating your Supabase project (see README),
   or paste them into Settings — either works. The anon key is safe to publish;
   row-level security keeps each user's data private to their sign-in. */
const CLOUD_URL  = 'https://anmmqhgnsuutufladfik.supabase.co';   // baked in — v2.06
const CLOUD_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubW1xaGduc3V1dHVmbGFkZmlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NjQ1MjQsImV4cCI6MjA5OTQ0MDUyNH0.GfJN3jAmtR-Eg6QjXvytJLPVwshxud9FNWApOcUVWWg';  // anon key is public by design

/* People paste whatever the dashboard shows — the project URL, the RESTful endpoint
   (…/rest/v1), a trailing slash. Reduce any of them to the bare origin, because every
   endpoint path (/auth/v1/…, /rest/v1/…) is appended by us. */
function normUrl(raw){
  let u=(raw||'').trim();
  if(!u) return '';
  if(!/^https?:\/\//i.test(u)) u='https://'+u;
  try{ return new URL(u).origin; }
  catch(e){ return u.replace(/\/.*$/,'').replace(/\/+$/,''); }
}
const cloudCfg=()=>({
  url:normUrl(DB.settings.cloud?.url||CLOUD_URL),
  anon:(DB.settings.cloud?.anon||CLOUD_ANON).trim()
});
const cloudReady=()=>!!(cloudCfg().url&&cloudCfg().anon);

let session=null;                             // {access_token,refresh_token,expires_at,user:{id,email}}
const SKEY='tracker-session';
async function loadSession(){ try{const r=await store.get(SKEY); session=r?JSON.parse(r):null;}catch(e){session=null;} }
async function saveSession(s){ session=s; await store.set(SKEY, s?JSON.stringify(s):''); }

/* after Google redirects back, the tokens arrive in the URL hash */
async function captureOAuth(){
  if(typeof location==='undefined') return;
  const err=new URLSearchParams(location.search).get('error_description')
        || new URLSearchParams(location.hash.slice(1)).get('error_description');
  if(err){
    history.replaceState(null,'',location.pathname);
    return toast('Sign-in failed: '+decodeURIComponent(err).slice(0,80));
  }
  if(!location.hash.includes('access_token')) return;
  const p=new URLSearchParams(location.hash.slice(1));
  const at=p.get('access_token'), rt=p.get('refresh_token'), ei=+(p.get('expires_in')||3600);
  history.replaceState(null,'',location.pathname+location.search);
  if(!at) return;
  let user={};
  try{
    const r=await fetch(cloudCfg().url+'/auth/v1/user',{headers:{apikey:cloudCfg().anon,Authorization:'Bearer '+at}});
    if(r.ok){const u=await r.json(); user={id:u.id,email:u.email};}
  }catch(e){}
  await saveSession({access_token:at,refresh_token:rt,expires_at:Date.now()+ei*1000,user});
  toast('Signed in'+(user.email?' as '+user.email:''));
  cloudPull();
}
async function freshToken(){
  if(!session) return null;
  if(Date.now()<session.expires_at-60000) return session.access_token;
  try{
    const r=await fetch(cloudCfg().url+'/auth/v1/token?grant_type=refresh_token',{
      method:'POST',headers:{apikey:cloudCfg().anon,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:session.refresh_token})});
    if(!r.ok){await saveSession(null);syncState('signedout');
      toast('Cloud sign-in expired — open ⚙ to sign in again');return null;}
    const j=await r.json();
    await saveSession({access_token:j.access_token,refresh_token:j.refresh_token,
      expires_at:Date.now()+j.expires_in*1000,user:session.user});
    return j.access_token;
  }catch(e){return null;}
}
async function cloudTest(){
  const {url,anon}=cloudCfg();
  if(!url||!anon) return toast('URL and key are both needed');
  try{
    const r=await fetch(url+'/auth/v1/settings',{headers:{apikey:anon}});
    if(r.status===401||r.status===403) return toast('Key rejected — check the anon public key');
    if(!r.ok) return toast('Reached '+url+' but got '+r.status);
    const j=await r.json();
    const google=j?.external?.google;
    toast(google ? 'Connected ✓ Google sign-in is on' : 'Connected ✓ but Google provider is OFF in Supabase');
  }catch(e){ toast('Cannot reach '+url+' — check the URL'); }
}
function signInGoogle(){
  if(DB.settings.demo){ DB.days={}; delete DB.settings.demo; save(); }   // real life starts clean
  if(!cloudReady()) return toast('Set the Supabase URL & key in Settings first');
  const {url,anon}=cloudCfg();
  const back=location.origin+location.pathname;
  // a full-page redirect can't carry headers, so the apikey must go in the query string
  const q=new URLSearchParams({provider:'google', redirect_to:back, apikey:anon});
  location.href=`${url}/auth/v1/authorize?${q}`;
}
async function signOut(){
  /* v3.1.1: logout = this device forgets you. Data is synced BEFORE the wipe
     so nothing is lost; if sync can't be confirmed, we ask before discarding.
     Signing back in restores everything from the cloud. */
  if(hasAnyDays()&&!DB.settings.demo){
    const ok=await cloudPushNow();
    if(!ok && !confirm('Could not confirm a cloud sync. Sign out anyway and discard the local copy? (Anything already synced is safe.)')) return;
  }
  await saveSession(null);
  try{
    localStorage.removeItem(KEY);
    localStorage.removeItem(SKEY);
    Object.keys(localStorage).filter(k=>k.startsWith('showup:bak')).forEach(k=>localStorage.removeItem(k));
    sessionStorage.clear();
  }catch(e){}
  try{ location.reload(); }catch(e){}
}

/* one row per user: the whole app state as a document */
/* Postgres jsonb re-sorts object keys, so a set that leaves as {part,ex,w,…}
   returns as {at,ex,part,…}. Any identity check must therefore be key-order
   insensitive — this signature is, and it's the only set identity we use. */
const sig=s=>JSON.stringify(Object.keys(s).sort().reduce((o,k)=>(o[k]=s[k],o),{}));

/* Repair: collapse EXACT duplicate sets within a day — but only ones carrying an
   `at` timestamp. Two real sets can't share the same millisecond, so an identical
   sig incl. `at` is provably a merge artifact (the jsonb bug), never real training.
   Pre-timestamp sets are left alone: identical old sets may be legitimate repeats. */
/* Deterministic stamp for pre-v2.19 days: lastAt if known, else noon of that day.
   Both devices compute the same value for the same day, so stamped-vs-unstamped
   asymmetries (the "laptop stays red" bug) cannot occur: equal stamps fall into
   the flag-merging union; a real edit stamps Date.now() and wins outright. */
function legacyStamp(d,v){ return v.lastAt || (Date.parse(d+'T12:00:00')||1); }
function stampLegacyDays(){
  for(const [d,v] of Object.entries(DB.days))
    if(v.w&&v.w.length&&!v.upd) v.upd=legacyStamp(d,v);
}
function repairDupes(){
  let removed=0;
  for(const day of Object.values(DB.days)){
    if(!day.w||day.w.length<2) continue;
    const seen=new Set(), keep=[];
    for(const s of day.w){
      if(s.at!=null){
        const k=sig(s);
        if(seen.has(k)){removed++;continue;}
        seen.add(k);
      }
      keep.push(s);
    }
    if(keep.length!==day.w.length) day.w=keep;
  }
  return removed;
}

/* Push REPLACES the whole cloud document, so it is only ever safe after this
   device has merged the cloud into itself. pulledOK gates every push; a fresh
   install (or any device that hasn't pulled yet this boot) physically cannot
   overwrite the cloud with an empty or partial copy. This is the bug that ate
   data on reinstall (v2.09 and earlier). */
let SYNC='';
function syncState(s){
  if(s===SYNC) return; SYNC=s;
  const g=document.getElementById('gearBtn'); if(!g) return;
  g.classList.toggle('warn', s==='signedout'||s==='error');
  g.title = s==='signedout' ? 'Not syncing — sign in again'
          : s==='error'     ? 'Cloud sync failing — data is safe on this device'
          : 'Settings, account & sync';
}
let pulledOK=false, lastPullAt=0;
async function cloudPull(){
  const tok=await freshToken(); if(!tok) return;
  try{
    const r=await fetch(cloudCfg().url+'/rest/v1/app_state?select=doc,updated_at',{
      headers:{apikey:cloudCfg().anon,Authorization:'Bearer '+tok}});
    if(!r.ok) return toast('Cloud pull failed ('+r.status+')');
    const rows=await r.json();
    if(!rows.length){ pulledOK=true; cloudPush(); maybeOnboard(); return; }   // cloud confirmed empty: safe to seed
    const remote=rows[0].doc||{};
    let merged=0;
    for(const [d,rv] of Object.entries(remote.days||{})){
      const lv=DB.days[d];
      if(rv.w&&rv.w.length&&!rv.upd) rv.upd=legacyStamp(d,rv);
      if(!lv){DB.days[d]=rv;merged++;continue;}
      const lu=lv.upd||0, ru=rv.upd||0;
      if(ru>lu){ DB.days[d]=rv; merged++; continue; }   // remote day is newer: take it whole
      if(lu>ru) continue;                                // local day is newer: keep it whole
      // both unstamped (pre-v2.19 legacy): key-order-safe union of sets —
      // AND of the completion state, which the old union silently dropped
      // (that's how a workout completed on the phone stayed "live" on the laptop).
      const seen=new Set(lv.w.map(sig));
      for(const s of rv.w||[]) if(!seen.has(sig(s))){lv.w.push(s);seen.add(sig(s));merged++;}
      if(rv.doneEx)   lv.doneEx  =[...new Set([...(lv.doneEx||[]),  ...rv.doneEx])];
      if(rv.donePart) lv.donePart=[...new Set([...(lv.donePart||[]),...rv.donePart])];
      if(rv.doneAll)  lv.doneAll = true;      // completed anywhere = completed everywhere
      if(rv.lastAt)   lv.lastAt  = Math.max(lv.lastAt||0, rv.lastAt);
      if(rv.sugX)     lv.sugX    = Object.assign({}, rv.sugX, lv.sugX||{});
    }
    if(remote.settings && (remote.settingsAt||0) > (DB.settingsAt||0)){
      DB.settings={...DB.settings,...remote.settings};
      DB.settingsAt=remote.settingsAt;
      applyTheme();
    }
    DB.settings.lastCloud=Date.now();
    lastPullAt=Date.now();
    SEED=deriveAll(); _fireDist=null;
    const fixed=repairDupes();
    if(fixed) merged=Math.max(0,merged-fixed);
    _avgVol=null;
    pulledOK=true;                                        // local is now a superset of the cloud
    maybeOnboard();
    save(); render();
    if(merged) toast('Cloud: merged '+merged+' item(s)');
  }catch(e){}
}
/* ---- history archive (v2.13, stage 1 of moving data out of index.html) ----
   The full imported history (918 days back to 2021-12-13) converted to the
   app's day format and carried in every cloud push under doc.archive. The app
   still RENDERS from the embedded seed for now; this puts the raw data where
   it belongs — your Supabase row — and is the substrate v3.0 will switch to. */
let _archive=null;
function buildArchive(){
  if(_archive) return _archive;
  const days={};
  let rows=0, km=0;
  for(const [d,list] of Object.entries(SEED0.sessions)){
    days[d]={w:list.map(r=>{
      const s={part:r[0],ex:r[1],w:r[2],reps:r[3]||[]};
      if(r[4]!=null) s.mins=r[4];
      if(r[5]!=null) s.secs=r[5];
      if(r[1]==='Run') km+=r[2];
      rows++; return s;
    })};
  }
  _archive={v:1, from:SEED0.totals.first, to:SEED0.totals.last,
            daysN:Object.keys(days).length, rows, km:Math.round(km*10)/10, days};
  return _archive;
}
let cloudTimer=null;
async function cloudPushNow(keepalive){
  if(DB.settings.demo) return false;               // demo data never leaves the device
  const tok=await freshToken(); if(!tok){ syncState('signedout'); return false; }
  if(!pulledOK) return false;   // a device that hasn't restored yet never overwrites the cloud
  try{
    const doc={days:DB.days, settings:DB.settings, settingsAt:DB.settingsAt||Date.now(), suggest:DB.suggest};
    const r=await fetch(cloudCfg().url+'/rest/v1/app_state',{
      method:'POST',
      keepalive:!!keepalive,     // lets the request finish even as iOS backgrounds the app
      headers:{apikey:cloudCfg().anon,Authorization:'Bearer '+tok,'Content-Type':'application/json',
               Prefer:'resolution=merge-duplicates'},
      body:JSON.stringify({user_id:session.user.id, doc, updated_at:new Date().toISOString()})});
    if(r.ok){ DB.settings.lastCloud=Date.now(); syncState('ok'); return true; }
    syncState('error'); return false;
  }catch(e){ syncState('error'); return false; }
}
function cloudPush(){
  clearTimeout(cloudTimer);
  cloudTimer=setTimeout(cloudPushNow, 1200);
}

/* ---------- storage adapter: claude.ai artifact storage -> localStorage (browser / iOS build) ---------- */
const store = {
  async get(k){
    try{ if(typeof window!=='undefined' && window.storage){ const r=await window.storage.get(k); return r?r.value:null; } }catch(e){}
    try{ return localStorage.getItem(k); }catch(e){ return null; }
  },
  async set(k,v){
    try{ if(typeof window!=='undefined' && window.storage){ await window.storage.set(k,v); return true; } }catch(e){}
    try{ localStorage.setItem(k,v); return true; }catch(e){ return false; }
  }
};
async function load(){
  const raw = await store.get(KEY);
  if(raw){ try{ const d=JSON.parse(raw); DB={...DB,...d, settings:{...DB.settings,...(d.settings||{}), gh:{...DB.settings.gh,...((d.settings||{}).gh||{})}}}; }catch(e){} }
  if(!DB.days) DB.days={};
  applyTheme();
}
let saveTimer=null, saveDirty=false;
function save(markSettings){
  if(markSettings) DB.settingsAt=Date.now();
  saveDirty=true;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(async()=>{
    saveDirty=false;
    const ok = await store.set(KEY, JSON.stringify(DB));
    if(!ok){ saveDirty=true; toast('Not saved — storage unavailable'); }
  },350);
  if(session) cloudPush();
}
/* iOS kills a home-screen app the instant it's swiped away — a debounced save
   still in its 350ms window would be lost (this is why the theme "reset").
   localStorage.setItem is synchronous, so it completes even during pagehide. */
/* The 1,500 km moment. Crossing any 100-unit boundary is a real event, so mark it
   once — not a banner that nags forever. */
function checkMilestone(){
  const days=runDays(); if(!days.length) return;
  const total=toD(days.reduce((a,r)=>a+r.km,0));
  const hit=Math.floor(total/100)*100;
  if(!hit) return;
  const seen=DB.settings.kmMilestone||0;
  if(seen===0){ DB.settings.kmMilestone=hit; save(true); return; }   // first run: just record
  if(hit>seen){
    DB.settings.kmMilestone=hit;
    DB.settings.kmMilestoneAt=todayISO;
    save(true);
    setTimeout(()=>toast(`🎉 ${fmt(hit)} ${DU()} — all time. You crossed it.`),700);
  }
}
/* ================== v3.0: single source of truth ==================
   All stats derive at boot from raw days. This builder reproduced every
   embedded seed map BYTE-EXACTLY in the offline harness (2026-07-17) across
   918 days / 7,845 rows. Windows anchor at TODAY at runtime; totals.last lands
   on the last day BEFORE today, so every `d > SEED.totals.last` live-today
   code path works unchanged. */
