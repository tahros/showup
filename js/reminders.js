/* ShowUp — reminders.js (v4.6.118): gentle reminders, iOS app only.
   Classic script, loaded after writer.js (it reads writerHabitDays).

   WHAT IT SENDS. At most ONE notification per day, and only facts:
   - a PLANNED day: one note at your chosen morning time, "Planned: <title>".
     The plan is already the reminder, so nothing follows it that day.
   - an UNPLANNED usual training day: one line 30 minutes after the time you
     usually start on that weekday, if nothing is logged yet. Today's names
     the part the rotation has due ("Legs is due."); later days cannot know
     that yet, so they say "Your usual training time." and are rewritten with
     the part when the app is opened that day.
   - a rest day -- declared, or a weekday you do not usually train -- gets
     nothing.
   Never: streak counts, day numbers, "don't break", exclamation marks, a
   second nudge, or anything special on a milestone day (the product's
   standing rules: no escalation, no scores, no guilt).

   WHERE THE FACTS COME FROM. The ledger, nothing new is collected:
   - usual weekdays: writerHabitDays() -- trained on that weekday in at least
     half of the last eight weeks (the same fact the writer prefills with);
   - usual time: the median time of each day's FIRST logged set on that
     weekday over the same eight weeks, needing at least three such days, and
     only between 06:00 and 21:30 after the +30 (quiet hours);
   - plans: plDocument(d), the saved plan for that date;
   - today's due part: trainingPlan().pick.

   HOW. Everything is local: @capacitor/local-notifications schedules on the
   phone, no server, no push token. The next seven days are scheduled at
   once (iOS keeps them even if the app is not opened), and rescheduled after
   every save -- so logging a set cancels today's line within seconds -- and
   whenever the app comes back to the foreground. The switch lives on this
   device only (localStorage), never in synced settings: turning it on on one
   phone must not raise a permission prompt on another. Off by default; iOS
   asks for permission only when you turn it on. */
const REM_KEY='showup:reminders';
const REM_ID0=7100, REM_DAYS=7, REM_AFTER=30, REM_EARLIEST=6*60, REM_LATEST=21*60+30;
const remPlugin=()=>{ try{ return NATIVE_SHELL?(window.Capacitor?.Plugins?.LocalNotifications||null):null; }catch(e){ return null; } };
function remPrefs(){
  let p={}; try{ p=JSON.parse(localStorage.getItem(REM_KEY)||'{}')||{}; }catch(e){}
  const m=/^([01]\d|2[0-3]):([0-5]\d)$/.test(p.morning||'')?p.morning:'07:00';
  return {on:p.on===true, morning:m};
}
function remSetPrefs(p){ try{ localStorage.setItem(REM_KEY,JSON.stringify({on:!!p.on,morning:p.morning})); }catch(e){} }
const remWeekday=iso=>new Date(iso+'T00:00').toLocaleDateString('en-US',{weekday:'long'});
const remAddDays=(iso,n)=>{ const d=new Date(iso+'T00:00'); d.setDate(d.getDate()+n); return d.toLocaleDateString('en-CA'); };
const remAt=(iso,min)=>{ const d=new Date(iso+'T00:00'); d.setHours(Math.floor(min/60),min%60,0,0); return d; };

/* weekday (0-6) -> minutes after midnight you usually log your first set */
function remUsualTimes(){
  const habit=typeof writerHabitDays==='function'?writerHabitDays():new Set();
  const from=remAddDays(todayISO,-56), by={};
  for(const [d,v] of Object.entries(DB.days)){
    if(d<from||d>=todayISO) continue;
    const ats=(v.w||[]).map(s=>+s.at||0).filter(Boolean); if(!ats.length) continue;
    const t=new Date(Math.min(...ats));
    if(t.toLocaleDateString('en-CA')!==d) continue;          // edited in later: not a start time
    const wd=t.getDay(); (by[wd]=by[wd]||[]).push(t.getHours()*60+t.getMinutes());
  }
  const out={};
  for(const wd of habit){
    const xs=(by[wd]||[]).sort((a,b)=>a-b); if(xs.length<3) continue;
    const mid=xs.length>>1, med=xs.length%2?xs[mid]:Math.round((xs[mid-1]+xs[mid])/2);
    out[wd]=med;
  }
  return out;
}
/* what a saved plan is called: its title, else its parts */
function remPlanLabel(iso){
  const doc=typeof plDocument==='function'?plDocument(iso):null; if(!doc) return null;
  if(String(doc.title||'').trim()) return String(doc.title).trim();
  const items=(doc.items||[]).map(i=>typeof planItemShape==='function'?planItemShape(i):i).filter(Boolean);
  const parts=[...new Set(items.map(i=>i.part||(typeof homePartOf==='function'?homePartOf(i.ex):null)).filter(Boolean))];
  return parts.length?parts.map(p=>typeof partLabel==='function'?partLabel(p):p).join(' + '):null;
}
/* the notifications the next seven days should carry -- pure, for the tests */
function remPlan(now=Date.now()){
  const pr=remPrefs(); if(!pr.on) return [];
  const usual=remUsualTimes(), out=[];
  const [mh,mm]=pr.morning.split(':').map(Number);
  let pick=null; try{ pick=trainingPlan().pick||null; }catch(e){}
  for(let i=0;i<REM_DAYS;i++){
    const d=remAddDays(todayISO,i), day=DB.days[d]||{};
    if(day.rest) continue;                                   // a declared rest day: nothing
    if((day.w||[]).length) continue;                         // already trained: nothing
    const wd=new Date(d+'T00:00').getDay(), title=remWeekday(d);
    const label=remPlanLabel(d);
    let at, body;
    if(label){ at=remAt(d,mh*60+mm); body='Planned: '+label+'.'; }
    else if(wd in usual){
      const min=usual[wd]+REM_AFTER;
      if(min<REM_EARLIEST||min>REM_LATEST) continue;          // quiet hours
      at=remAt(d,min);
      body=(i===0&&pick)?(partLabel(pick)+' is due.'):'Your usual training time.';
    } else continue;                                         // not a usual day: rest
    if(+at<=now) continue;
    out.push({id:REM_ID0+i, title, body, schedule:{at}});
  }
  return out;
}
let remSig=null, remTimer=null;
async function remApply(force){
  const P=remPlugin(); if(!P) return 'no-shell';
  const want=remPlan(), sig=JSON.stringify(want.map(n=>[n.id,n.body,+n.schedule.at]));
  if(!force&&sig===remSig) return 'unchanged';
  try{
    await P.cancel({notifications:Array.from({length:REM_DAYS},(_,i)=>({id:REM_ID0+i}))});
    if(want.length) await P.schedule({notifications:want});
    remSig=sig; return 'scheduled:'+want.length;
  }catch(e){ return 'error'; }
}
/* after any save, and on return to the app; coalesced */
function remQueue(){ if(!remPlugin()) return; clearTimeout(remTimer); remTimer=setTimeout(()=>remApply(false),1500); }
/* the switch */
async function remToggle(on){
  const P=remPlugin(); if(!P) return 'no-shell';
  const pr=remPrefs();
  if(on){
    let st=null; try{ st=await P.requestPermissions(); }catch(e){}
    if(!st||st.display!=='granted'){ remSetPrefs({...pr,on:false}); toast('Notifications are off for ShowUp. Turn them on in iOS Settings.'); return 'denied'; }
  }
  remSetPrefs({...pr,on:!!on});
  const r=await remApply(true);
  toast(on?'Reminders on':'Reminders off');
  return r;
}
async function remSetMorning(hhmm){
  if(!/^([01]\d|2[0-3]):([0-5]\d)$/.test(hhmm||'')) return 'invalid';
  remSetPrefs({...remPrefs(),morning:hhmm}); return remApply(true);
}
if(remPlugin()){
  addEventListener('load',()=>setTimeout(()=>remApply(true),2500));
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') remQueue(); });
}
