/* Approved planner journey. Reuses planner.js parsing, checked generation,
   local owner-scoped drafts and saved plan schema. No mock routines or dates. */
const pfLegacy={open:pwOpen,render:pwRender,handle:pwHandle,apply:pwApply,payload:pwPayload,save:pwSave};
function pfOn(){return (pwState?.journey?.prefOrigin==='settings'||planningWorkspace())&&localStorage.getItem('showup:planner-flow')!=='legacy';}
function pfState(){const s=pw();s.journey=s.journey||{page:'dates',furthest:1,anchor:[],removed:[],saved:[]};return s.journey;}
function pfDates(){return [...pw().dates].sort();}
function pfSavedSelection(){const dates=pfDates();return dates.length>0&&dates.every(d=>d>=todayISO&&!!pwSaved(d)?.items?.length);}
function pfTrackScreen(){
 const s=pw(),j=pfState(),screen={page:j.page,step:s.step,active:s.active,dates:j.page==='dates'?[...s.dates]:undefined,clear:!!j.clear,emptyConfirm:!!j.emptyConfirm,group:j.group?pwCopy(j.group):null};
 const key=x=>JSON.stringify([x.page,x.step,x.active,x.clear,x.emptyConfirm,!!x.group]);
 j.history=j.history||[];
 if(!j.returning&&j.lastScreen&&key(screen)!==key(j.lastScreen))j.history.push({...j.lastScreen,scroll:window.scrollY});
 j.returning=false;j.lastScreen=screen;
}
/* v4.6.72: THE ARROW IS NAVIGATION, NOT UNDO. The header arrow ran pfBack(),
   which pops the flow's own step history first -- Dates back to Preferences --
   and only leaves the workspace once that is empty. The maker's rule: the
   arrow goes to the PREVIOUS NAVIGATION POINT, the screen you entered from,
   whatever step you are on. j.returnView has always recorded that point
   (today, lift through the Edit Plan door, sync from Settings); pfLeave goes
   there directly. pfBack keeps the step-popping for the one control that
   means "undo": Cancel while a write is running. `to` lets the Today tab send
   the same leave home rather than to where you came from. */
function pfLeave(to){
 const s=pw(),j=pfState();pwRequest++;lift.writeAbort?.abort();writerWaitStop();s.busy=false;
 const destination=to||(j.prefOrigin==='settings'?'sync':j.returnView||'today');
 j.prefOrigin=null;j.lastScreen=null;j.history=[];s.step='edit';s.candidate=null;pwPersist();lift.plan=null;view=destination;render({soft:true});
}
function pfBack(){
 const s=pw(),j=pfState();pwRequest++;lift.writeAbort?.abort();writerWaitStop();s.busy=false;
 let previous;
 while(j.history?.length){
  const candidate=j.history.pop();
  if(['busy','candidate'].includes(candidate.step))continue;
  if(['days','edit','done'].includes(candidate.page)&&!pfMatch())continue;
  if(candidate.page==='edit'&&!s.dates.includes(candidate.active))continue;
  previous=candidate;break;
 }
 if(!previous){pfLeave();return;}
 Object.assign(j,{page:previous.page,clear:previous.clear,emptyConfirm:previous.emptyConfirm,group:previous.group,returning:true});
 if(previous.dates)s.dates=[...previous.dates];s.step=previous.step;s.active=previous.active;s.error='';s.candidate=null;pwPersist();pwRender();window.scrollTo(0,previous.scroll||0);
}
function pfMatch(){return JSON.stringify(pfDates())===JSON.stringify([...pfState().anchor].sort());}
/* v4.6.173: the avoid list is READ from the per-exercise verdicts (core.js
   exPref), which are the one source; the copy in plannerPreferences is legacy, still honoured for a device on an older version */
function pfPrefs(){const p=pwCopy(DB.settings.plannerPreferences||{frequency:5,mode:'auto',minutes:45,minSets:20,maxSets:25,emphasis:{},avoid:[],split:'auto'});const legacy=(p.avoid||[]).filter(n=>String(n||'').trim());p.avoid=[...new Set([...exPrefNames('avoid'),...legacy])];   /* a device on an older version may still write the legacy list: both count */
 /* v4.6.201: THE PREFERENCES THAT CHANGE A PLAN. The page asked for days a week,
    minutes, seven Less/Balanced/More sliders and a split: four things that
    reached the writer as a line of JSON in a note and decided nothing, written
    before the planner had body parts and muscles per day, an auto set target,
    Avoid and Hold. What is kept is what the app acts on:
      mode      'auto' (your usual for the day's parts) or 'limit' (never more than maxSets).
                A stored 'sets' range from before reads as a limit at its maximum; 'time' as auto.
      warmup    a lighter set before the first lift (default on)
      trainDays weekdays 0-6 the Dates step opens with; null until you save some
    The old keys stay in the stored object, untouched, for a device still on an older version. */
 p.mode=p.mode==='sets'||p.mode==='limit'?'limit':'auto';if(!Number.isInteger(p.maxSets))p.maxSets=25;
 p.warmup=p.warmup!==false;p.trainDays=Array.isArray(p.trainDays)?p.trainDays.filter(n=>n>=0&&n<=6):null;p.emphasis=p.emphasis||{};
 p.rotation=pfRotClean(p.rotation);
 return p;}
/* v4.6.203: YOUR SPLIT IS AN ORDER, NOT A CALENDAR. "Your split" used to be a
   dropdown that reached the writer as a word in a note. A split is the order
   you train body parts in -- Shoulder, Back, Chest, Legs, Arms, Chest -- and it
   slides when a day is skipped, so it is kept as a list of sessions with no
   weekday on them. Next up is read from the log (pfRotNext); the dates you
   pick are filled in that order (pfSplitFill). rotation is null until you
   save one, and then nothing about planning changes for you. */
/* v4.6.204: the tiles said "5 days", "3 days", "2 or 4 days": a count of days on a thing that has no days, and for Body part a count that was simply wrong for anyone training seven parts. A body-part split is one session for each part you train, so it is built from that list and the tile counts what it built. */
const PF_SPLITS=[['body','Body part','',null],
 ['ppl','Push / Pull / Legs','',[['Push',['Chest','Shoulder','Triceps']],['Pull',['Back','Biceps']],['Legs',['Legs','Sixpack']]]],
 ['ul','Upper / Lower','',[['Upper',['Chest','Back','Shoulder','Biceps','Triceps']],['Lower',['Legs','Sixpack']]]],
 ['full','Full body','Everything, every session',[['Full body',['Chest','Back','Shoulder','Legs','Sixpack']]]],
 ['own','My own','Set each session yourself',null],
 ['none','No split','Choose body parts day by day',null]];   /* v4.6.209: the way back to no split is a choice you can see, not a second tap on a lit tile */
function pfRotClean(r){if(!r||!Array.isArray(r.sessions))return null;const mine=myPartsSet(),ok=x=>x==='Run'||(BODY_PARTS.includes(x)&&mine.has(x)),ses=r.sessions.map(x=>({name:String(x?.name||'').slice(0,24),parts:[...new Set((x?.parts||[]).filter(ok))]})).filter(x=>x.parts.length);
 return ses.length?{preset:r.preset!=='none'&&PF_SPLITS.some(z=>z[0]===r.preset)?r.preset:'own',sessions:ses}:null;}
function pfMyParts(){const m=myPartsSet();return BODY_PARTS.filter(x=>x!=='Run'&&m.has(x));}
function pfRotPreset(k,mine=pfMyParts()){if(k==='body')return mine.map(x=>({name:'',parts:[x]}));const d=PF_SPLITS.find(z=>z[0]===k);return d&&d[3]?d[3].map(([name,parts])=>({name,parts:parts.filter(x=>mine.includes(x))})).filter(x=>x.parts.some(z=>z!=='Sixpack')||x.name==='Core'):null;}   /* a Legs day with the legs switched off is not kept as a day of core */
function pfSplitSub(k,mine){if(k==='own')return 'Set each session yourself';if(k==='none')return 'Choose body parts day by day';if(k==='full')return 'Everything, every session';const n=pfRotPreset(k,mine).length,t=n+(n===1?' session':' sessions');return k==='body'?t+' · one part each':t;}
/* which session comes next: the recent log is laid against the order, newest
   day weighing most, so two sessions with the same parts (Chest twice in six)
   are told apart by what came before them */
function pfRotNext(sessions){const n=sessions.length;if(!n)return 0;const hist=[];
 for(const d of Object.keys(DB.days).filter(d=>d<=todayISO).sort().reverse()){const ps=[...new Set((DB.days[d].w||[]).filter(x=>(x.reps||[]).length||x.km>0||x.min>0).map(x=>homePartOf(x.ex)||x.part).filter(Boolean))];if(ps.length)hist.push(ps);if(hist.length>=Math.max(n,3))break;}
 if(!hist.length)return 0;
 const sim=(a,b)=>{const B=new Set(b),i=a.filter(x=>B.has(x)).length;return i/((a.length+B.size-i)||1);};
 let best=0,top=0;for(let i=0;i<n;i++){let sc=0;hist.forEach((h,j)=>{sc+=sim(h,sessions[((i-j)%n+n)%n].parts)/(j+1);});if(sc>top+1e-9){top=sc;best=i;}}
 return top>0?(best+1)%n:0;}
/* the session each of these dates takes: in order from Next up; a plan already saved on a day in between takes its turn too */
function pfRotAssign(sessions,dates){const n=sessions.length,out={},ds=[...dates].sort(),last=ds[ds.length-1];if(!n||!last)return out;const sel=new Set(ds);let cur=pfRotNext(sessions);const d0=new Date(todayISO+'T12:00');
 for(let k=0;k<370;k++){const d=new Date(d0);d.setDate(d0.getDate()+k);const iso=d.toLocaleDateString('en-CA');if(iso>last)break;
  if(k===0&&(DB.days[iso]?.w||[]).some(x=>(x.reps||[]).length&&homePartOf(x.ex)!=='Run'))continue;   /* today is already in the log, and Next up has counted it */
  if(sel.has(iso)){out[iso]=cur;cur=(cur+1)%n;}else if(pwSaved(iso)?.items?.length)cur=(cur+1)%n;}
 return out;}
/* the dates the planner opens on: your training weekdays across seven days from the day it would open on */
function pfTrainDates(t){if(!t||!t.length)return [];const start=dayClosed()?tomorrowISO():writeDateISO(),out=[],d0=new Date(start+'T12:00');
 for(let k=0;k<7;k++){const d=new Date(d0);d.setDate(d0.getDate()+k);if(t.includes(d.getDay()))out.push(d.toLocaleDateString('en-CA'));}return out;}
/* an empty day you have selected takes its session's body parts; one you set yourself, drafted or saved is never touched */
function pfSplitFill(){const r=pfPrefs().rotation;if(!r)return;const s=pw(),map=pfRotAssign(r.sessions,s.dates);
 for(const d of s.dates){const b=pwDay(d),ses=r.sessions[map[d]];if(!ses||b.rows.length||pwSaved(d)?.items?.length||(b.partsPick&&!b.splitFill))continue;
  if(b.parts.join()!==ses.parts.join()||!b.splitFill){b.parts=ses.parts.slice();b.partsPick=true;b.splitFill=true;}}}
/* v4.6.203: A STARTING SIZE WHERE THERE IS NO HISTORY. The auto Set target needs
   three logged days for a body part; someone starting a split has none and got
   "the count is yours to set". With a split saved, a part without a usual
   starts from about ten sets a week (six for arms and core) -- the low end of
   what the dose-response reviews support -- divided by how often the split
   trains it, never under three, and the starters share what is left of twenty
   sets in the session. Your own numbers replace it part by part. */
function pfStarterSets(parts,known,rotation){const big=['Chest','Back','Shoulder','Legs'],raw=parts.map(x=>{const f=Math.max(1,rotation.sessions.filter(z=>z.parts.includes(x)).length);return Math.max(3,Math.ceil((big.includes(x)?10:6)/f));});
 const sum=raw.reduce((a,n)=>a+n,0),room=Math.max(0,20-known);return sum<=room?raw:raw.map(n=>Math.max(3,Math.floor(n*room/sum)));}
const PF_GOALS=[['grow','Grow','Working sets of <strong>8 to 12 reps</strong>, 10 to 15 on cable and isolation work. Never under 8.'],['lose','Lose weight','Working sets of <strong>12 to 15 reps</strong> and shorter sessions. Never under 12.'],['strength','Strength','<strong>3 to 6 reps</strong> on the main lift, with warm-up lines, then 6 to 10 on the rest.']];
const PF_DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
/* the weekdays you have trained on in at least half of the last eight weeks: what the page offers before you have chosen */
function pfUsualDays(){const n=Array(7).fill(0),t=new Date(todayISO+'T12:00');for(let k=1;k<=56;k++){const d=new Date(t);d.setDate(t.getDate()-k);const iso=d.toLocaleDateString('en-CA');if((DB.days[iso]?.w||[]).length)n[d.getDay()]++;}return n.map((c,i)=>c>=4?i:-1).filter(i=>i>=0);}
function pfWeekOrder(){const f=weekStartDow();return Array.from({length:7},(_,i)=>(f+i)%7);}
function pfSummary(p=pfPrefs()){const goal=(PF_GOALS.find(g=>g[0]===pw().objective)||PF_GOALS[0])[1],days=p.trainDays&&p.trainDays.length?pfWeekOrder().filter(d=>p.trainDays.includes(d)).map(d=>PF_DOW[d]).join(' '):'',held=typeof exHoldNames==='function'?exHoldNames().length:0;return [goal,days,p.mode==='limit'?'up to '+p.maxSets+' sets':'auto size',p.warmup?'':'no warm-up',p.rotation?(p.rotation.preset==='own'?p.rotation.sessions.length+'-session split':PF_SPLITS.find(z=>z[0]===p.rotation.preset)[1]):'',p.avoid.length+' avoided',held?held+' held':''].filter(Boolean).join(' · ');}
function pfShort(d){return new Date(d+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'numeric',day:'numeric'});}
/* v4.6.81: pfCompactPrefs() DELETED. The dates card opened with a summary of
   the planning preferences and an Edit button, two rows above the calendar --
   and that button read as "edit these dates", which is the one thing it did
   not do: it left for Preferences, a tab already sitting at the top of this
   very screen. Two doors to the same room, one of them mislabelled. The tab
   is the door. */function pfDateRange(){const ds=pfDates(),short=d=>new Date(d+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});return ds.length?hesc(short(ds[0])+(ds.length>1?' – '+short(ds.at(-1)):'')):'';}
function pfCalendarDraft(d){
 const b=pw().book?.[d];
 return d>=todayISO&&!!b&&((b.source!=='Saved plan'&&!!(b.rows?.length||(b.parts?.length&&!b.splitFill)||b.cleared))||b.target!=null);   /* v4.6.203: body parts your split put on an empty day are not a draft of yours */
}
/* v4.6.122: WHAT A DAY ALREADY IS, on the Dates calendar. The calendar only
   ever said what a day was GOING to be (saved plan, draft), so a day whose
   plan you had finished looked exactly like one still ahead of you (the maker,
   2026-09-24). One rule, whatever the date:
   - a day with a saved plan that you trained on shows the saved-plan calendar
     with a check, in blue: "that plan, done";
   - a day you trained on with no plan shows the app's own mark for a day, a
     small blue square (the header strip speaks the same language);
   - today counts once the session is closed (Complete), not while it is live.
   A draft still outranks both on today and later: you are editing it. A done
   day stays selectable -- a second session in the evening is normal. */
function pfDone(d,trained){
 if(!trained.has(d))return false;
 if(d<todayISO)return true;
 if(d>todayISO)return false;
 const t=DB.days[d];return !!t&&(t.w||[]).length>0&&(!!t.doneAll||!sessionOpen(t));
}
function pfStatusIcon(kind){
 if(kind==='trained')return '<i class="pf-trained" aria-hidden="true"></i>';
 if(kind==='done')return '<svg class="pf-status-icon pf-done" width="'+ICON_SZ.sm+'" height="'+ICON_SZ.sm+'" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M6 2h2v3h8V2h2v3h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2V2ZM4 9v11h16V9H4Z"/><path d="M7.5 14.5l3 3 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 if(kind==='lands')return '<svg class="pf-status-icon" width="'+ICON_SZ.sm+'" height="'+ICON_SZ.sm+'" viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2.6 2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg>';
 const path=kind==='draft'?'<path d="m3 16 12-12 5 5-12 12-6 1 1-6Zm13-13 1-1a2 2 0 0 1 3 0l2 2a2 2 0 0 1 0 3l-1 1-5-5Z"/>':'<path fill-rule="evenodd" d="M6 2h2v3h8V2h2v3h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2V2ZM4 9v2h16V9H4Zm2 5v3h3v-3H6Zm5 0v3h3v-3h-3Z"/>';
 return '<svg class="pf-status-icon" width="'+ICON_SZ.sm+'" height="'+ICON_SZ.sm+'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'+path+'</svg>';
}
function pfDateKinds(){const dates=pfDates(),drafts=dates.filter(pfCalendarDraft),saved=dates.filter(d=>!drafts.includes(d)&&d>=todayISO&&!!pwSaved(d)?.items?.length);return {dates,drafts,saved,fresh:dates.filter(d=>!saved.includes(d)&&!drafts.includes(d))};}
function pfSelectSubset(dates){if(!dates.length)return false;pw().dates=[...dates];if(!dates.includes(pw().active))pw().active=dates[0];dates.forEach(d=>pwDay(d));return true;}
/* v4.6.203: what your split has put on the empty days you picked, said on the Dates step */
function pfSplitLine(){const r=pfPrefs().rotation;if(!r)return '';const ds=pfDates().filter(d=>{const b=pw().book?.[d];return b&&b.splitFill&&!b.rows.length;});if(!ds.length)return '';
 return '<p class="pf-date-breakdown pf-split-line">'+ds.map(d=>{const b=pw().book[d],x=r.sessions.find(z=>z.parts.join()===b.parts.join());return '<span><b>'+hesc(new Date(d+'T12:00').toLocaleDateString('en-US',{weekday:'short'}))+'</b> '+hesc((x&&x.name)||b.parts.map(partLabel).join(' + '))+'</span>';}).join('')+'</p>';}
function pfDateFooter(){
 const s=pw(),{dates,saved,fresh,drafts}=pfDateKinds(),n=dates.length;
 const plural=(n,one)=>n+' '+one+(n===1?'':'s');
 const action=(a,label,glyph,primary=false,extra='')=>pwAction(a,label,glyph,(primary?'primary':'')+(s.busy&&a==='pf-generate'?' pf-generating':''),s.busy?'disabled':extra);
 /* v4.6.101: when every selected day already has a plan there is nothing to
    plan, and "Plan new days" was sitting there disabled as the primary. The
    two things you can do with saved plans take the row instead: Edit, Move. */
 const allSaved=!s.busy&&saved.length&&!fresh.length&&!drafts.length;
 let main=s.busy?action('pf-generate','Creating your draft','sparkle',true):allSaved?action('pf-edit-selected','Edit '+plural(saved.length,'plan'),'edit',true)+action('pf-move','Move '+plural(saved.length,'plan'),'move'):action('pf-generate',fresh.length?'Plan '+plural(fresh.length,'new day'):'Plan new days','sparkle',true,fresh.length?'data-subset="fresh"':'disabled')+action('pf-edit-selected',saved.length?'Edit '+plural(saved.length,'plan'):'Edit saved plans','edit',false,saved.length?'':'disabled');
 /* v4.6.101: MOVE. Saved plans among the selected days can be shifted by N
    days; the calendar shows where they land while you step. It sits with
    Generate and Paste, and takes the footer over while it is open so the
    one question on screen is "where to". */
 const j=pfState(),mv=j.move;
 if(mv&&!s.busy){
  const plan=planShiftable(saved,mv.delta),n=plan.moves.length,abs=Math.abs(mv.delta);
  const words=mv.delta===0?'No change':abs+(abs===1?' day ':' days ')+(mv.delta>0?'later':'earlier');
  const first=plan.moves[0]?.to,last=plan.moves.at(-1)?.to;
  const problem=!plan.ok&&plan.reason==='past'?'Nothing can land before today.':!plan.ok&&plan.reason==='landsOnLogged'?hesc(pwDate(plan.date))+' has a logged workout; nothing can land on it.':!plan.ok&&plan.reason==='logged'?hesc(pwDate(plan.date))+' has a logged workout and can\u2019t move.':'';
  const replaces=plan.ok&&plan.replaces.length?plan.replaces.map(d=>hesc(pwDate(d))).join(', ')+' already '+(plan.replaces.length===1?'has a plan; it will be replaced.':'have plans; they will be replaced.'):'';
  return '<div class="pf-selection" aria-live="polite"><strong>Move <span class="pf-count">'+n+'</span> '+(n===1?'plan':'plans')+'</strong><span>'+(plan.ok&&first?hesc(pwDate(first))+(n>1?' \u2013 '+hesc(pwDate(last)):''):'')+'</span></div>'
   +'<div class="pf-move" role="group" aria-label="Move by"><span class="pf-move-label">Move by<b>'+words+'</b></span><span class="pf-move-ctl">'+pwButton('pf-move-step','\u2212','pw-icon','data-delta="-1" aria-label="One day earlier"')+'<output aria-live="polite">'+(mv.delta>0?'+':'')+mv.delta+'</output>'+pwButton('pf-move-step','+','pw-icon','data-delta="1" aria-label="One day later"')+'</span></div>'
   +(problem?'<p class="pf-move-note pf-move-problem">'+problem+'</p>':replaces?'<p class="pf-move-note">'+replaces+'</p>':'<p class="pf-move-note">Logged workouts stay untouched. Drafts move with their days.</p>')
   +'<div class="pf-date-actions">'+pwButton('pf-move-cancel','Cancel')+pwButton('pf-move-go',plan.ok?'Move '+plural(n,'plan'):'Move','primary',plan.ok?'':'disabled')+'</div>';
 }
 const summary=[fresh.length?plural(fresh.length,'new day'):'',saved.length?plural(saved.length,'saved plan'):'',drafts.length?plural(drafts.length,'draft'):''].filter(Boolean).join(' · ');
 const changes=drafts.filter(d=>pwSaved(d)?.items?.length);
 const resume=drafts.length&&!s.busy?'<div class="pf-draft-resume">'+action('pf-resume-drafts','Resume '+plural(drafts.length,'draft'),'edit')+'</div>':'';
 const secondary=!s.busy?'<div class="pf-date-secondary">'+action('pf-generate','Generate instead','sparkle',false,n?'':'disabled')+action('pf-paste-dates','Paste','paste',false,n?'':'disabled')+'</div>':'';
 return '<div class="pf-selection" aria-live="polite"><strong>'+(n?'<span class="pf-count">'+n+'</span> '+(n===1?'day':'days')+' selected<span class="pf-range">· '+pfDateRange()+'</span>':'Choose dates above')+'</strong>'+(n&&!s.busy?pwButton('pf-unselect','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>Unselect all','pf-unselect'):'')+'</div><p class="pf-date-breakdown">'+(summary||'Select dates to create, edit or resume.')+'</p>'+pfSplitLine()+(changes.length?'<p class="pf-draft-detail">'+changes.map(d=>hesc(pwDate(d))).join(' · ')+': unsaved changes to saved '+(changes.length===1?'plan':'plans')+'</p>':'')+resume+'<div class="pf-date-actions">'+main+'</div>'+secondary+'<p class="pf-date-help">Logged workouts stay untouched.</p>'+(s.busy?pwButton('pf-back','Cancel','pw-text'):'');
}
let pfMotion=null;
function pfPlayMotion(){const m=pfMotion;pfMotion=null;if(!m)return;const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const animate=(el,frames,duration=260)=>{if(el?.animate)el.animate(reduced?[{opacity:.6},{opacity:1}]:frames,{duration:reduced?100:duration,easing:'cubic-bezier(.22,.7,.25,1)'});};
 /* v4.6.80: PICKING A DAY IS AN INK FLOOD, AND THE CELL NEVER PAINTS.
    This animated the BUTTON's background from white to accent over 180ms, from
    the days when a selected day was a filled rounded cell. Since v4.6.78 the
    fill lives on the day's ::before and the button's own corners went square to
    make room for it -- so the leftover was painting a hard-cornered square
    behind the rounded one on every tap. That is the flash the maker saw.
    What replaces it: colour floods out from the centre of the square and is
    clipped by its corner, the number turning white once the ink has passed
    under it. Nothing moves -- no scale on the cell, so forty numbers in a grid
    stay still while one of them fills. The scale went with the background. */
 if(m.kind==='date'){
  const button=document.querySelector(`.pf-calendar [data-date="${m.date}"]`);
  if(button&&!reduced){
   const cls=button.classList.contains('selected')?'pf-ink':'pf-ink-out';
   button.classList.add(cls);
   button.addEventListener('animationend',()=>button.classList.remove(cls),{once:true});
  }
  if(m.before!==pw().dates.length)animate(document.querySelector('.pf-count'),[{transform:`translateY(${pw().dates.length>m.before?'-100%':'100%'})`,opacity:0},{transform:'translateY(0)',opacity:1}]);
  animate(document.querySelector('.pf-selection .pf-range,.pf-selection>span'),[{opacity:.35},{opacity:1}],180);
 }
 if(m.kind==='month')for(const el of document.querySelectorAll('.pf-calendar,.pf-date-sheet .pw-month'))animate(el,[{transform:`translateX(${m.dir*16}px)`,opacity:0},{transform:'translateX(0)',opacity:1}]);
 if(m.kind==='arrive')animate(document.querySelector('.pf-workspace'),[{transform:'translateY(12px)',opacity:0},{transform:'translateY(0)',opacity:1}],360);
}
function pfAnchor(){const j=pfState();if(!pfMatch()){j.furthest=2;j.saved=[];}j.anchor=pfDates();j.furthest=Math.max(j.furthest,2);}
/* v4.6.75: THE WEEK IS A STRIP ON THE ROUTINE PAGE. The overview listed one
   card per day and a day was 127px of nothing; the maker chose a strip of day
   chips above the routine instead, so 'days' lands on the first day's routine.
   pfDaysHTML stays for the saved review; nothing routes to it as a page. */
function pfNavigate(page){const s=pw(),j=pfState();if(page==='days'){page=s.dates.length?'edit':'dates';if(!s.dates.includes(s.active))s.active=pfDates()[0]||null;}if(['days','edit','done'].includes(page)&&!pfMatch())page='dates';j.page=page;s.step='edit';s.datesOpen=false;s.error='';j.clear=false;j.emptyConfirm=false;j.group=null;pwPersist();pwRender();window.scrollTo(0,0);}
function pfStepbar(){const j=pfState(),current={prefs:0,dates:1,days:2,edit:2,done:3}[j.page]??2;return `<div role="navigation" class="pf-steps" aria-label="Planning steps">${['Preferences','Dates','Edit','Done'].map((label,i)=>{const allowed=(i===2&&pfSavedSelection())||(i<=j.furthest&&(i<2||pfMatch()));return pwButton('pf-stage',`<b>${i}</b><span>${label}</span>`,`${i===current?'pf-current':''} ${i<current?'pf-passed':''}`,`data-stage="${i}" ${allowed?'':'disabled'} ${i===current?'aria-current="step"':''}`);}).join('')}</div>`;}
function pfPrefHTML(){const j=pfState(),p=(j.prefs&&j.prefs.avoidAdd&&j.prefs.trainDays&&j.prefs.rotation&&j.prefs.parts)?j.prefs:(j.prefs=pfStagePrefs());
 const seg=(act,opts,cur,cls='')=>`<div class="pf-seg ${cls}" role="group" style="--n:${opts.length};--i:${Math.max(0,opts.findIndex(o=>o[0]===cur))}">${opts.map(([v,t])=>`<button type="button" class="pf-segb${cur===v?' on':''}" data-pw="${act}" data-value="${v}" aria-pressed="${cur===v}">${t}</button>`).join('')}</div>`;
 const X='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',OK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
 const picker=(kind,label)=>`<button type="button" class="pf-xchip pf-xchip-add" data-pw="pf-xpick-open" data-kind="${kind}" aria-haspopup="dialog" aria-label="${label}">+ Add</button>`;
 const heldTxt=ex=>{const w=isHeld(ex)?heldW(ex):exLastTopKg(ex);return w==null?'':`<em>${hesc(isBody(ex)?(w>0.01?'BW+'+wDisp(w)+' '+U():'BW'):wDisp(w)+' '+U())}</em>`;};
 const goal=PF_GOALS.find(g=>g[0]===p.goal)||PF_GOALS[0],avoid=pfShown(p,'avoid'),hold=pfShown(p,'hold');
 return `<div class="pf-prefs">
<div class="card"><h3>What are you training for?</h3>${seg('pf-goal',PF_GOALS.map(g=>[g[0],g[1]]),goal[0])}<p class="pf-pref-cap">${goal[2]}</p></div>
<div class="card"><h3>Your week</h3>
 <div class="pf-pref-row"><span>Week starts on</span>${seg('pf-weekstart',[['sunday','Sunday'],['monday','Monday']],p.weekStart,'pf-seg-sm')}</div>
 <div class="pf-pref-row pf-pref-block"><span>Days you train<small>Dates opens with these picked for the next seven days.</small></span><div class="pf-dow" role="group" aria-label="Days you train">${(p.weekStart==='monday'?[1,2,3,4,5,6,0]:[0,1,2,3,4,5,6]).map(d=>`<button type="button" class="pf-dowb${p.trainDays.includes(d)?' on':''}" data-pw="pf-trainday" data-value="${d}" aria-pressed="${p.trainDays.includes(d)}" aria-label="${PF_DOW[d]}">${PF_DOW[d][0]}</button>`).join('')}</div></div></div>
<div class="card pf-myparts"><h3>Body parts you train</h3><div class="pf-mypart-chips" role="group" aria-label="Body parts you train">${BODY_PARTS.filter(t=>t!=='Run').map(t=>`<button type="button" class="pf-mypart${p.parts.includes(t)?' on':''}" data-pw="pf-mypart" data-part="${hesc(t)}" aria-pressed="${p.parts.includes(t)}">${hesc(t)}</button>`).join('')}</div><p class="pf-pref-cap">Plans, your split and the body-part choices on each day use only these. The same setting as What you train in Settings: a part you switch off is hidden, and every set you logged for it is kept.</p></div>
${pfSplitCardHTML(p,j)}
<div class="card"><h3>Each session</h3>
 <div class="pf-pref-row"><span>Size<small>${p.mode==='limit'?'Your usual for the day’s body parts, never more than this.':'Auto is what you usually do for the day’s body parts.'}</small></span>${seg('pf-size',[['auto','Auto'],['limit','Set a limit']],p.mode,'pf-seg-sm')}</div>
 ${p.mode==='limit'?`<div class="pf-pref-row pf-pref-limit"><label for="pf-max">Most sets in a session</label><input id="pf-max" type="number" inputmode="numeric" min="1" max="100" data-pf-pref="maxSets" value="${p.maxSets}"></div>`:''}
 <div class="pf-pref-row"><span>Warm-up set on the first lift<small>A lighter set before the heaviest exercise.</small></span><button type="button" class="pf-switch${p.warmup?' on':''}" data-pw="pf-warmup" role="switch" aria-checked="${!!p.warmup}" aria-label="Warm-up set on the first lift"></button></div></div>
<div class="card"><h3>Exercises</h3>
 <div class="pf-pref-grp"><span>Avoid<small>left out of every plan</small></span><div class="pf-xchips">${avoid.map((ex,i)=>`<button type="button" class="pf-xchip" data-pw="pf-unavoid" data-index="${i}" aria-label="Stop avoiding ${hesc(ex)}">${hesc(ex)} ${X}</button>`).join('')}${picker('avoid','Avoid an exercise')}</div></div>
 <div class="pf-pref-grp"><span>Hold the weight<small>reps can move, the load does not go up</small></span><div class="pf-xchips">${hold.map((ex,i)=>`<button type="button" class="pf-xchip" data-pw="pf-unhold" data-index="${i}" aria-label="Stop holding ${hesc(ex)}">${hesc(ex)} ${heldTxt(ex)} ${X}</button>`).join('')}${picker('hold','Hold the weight of an exercise')}</div></div></div>
<div class="card pf-rules"><span class="pf-rules-h">How every plan is built</span><ul>${['Only the body parts you set for the day. Nothing is added on its own.','Exercises hit the muscles you chose for the day.','Heaviest lifts first, core last.','No more sets on an exercise than you usually do.','Short of the target, an exercise is recommended. Sets are never stacked.','If the reps are not in reach, the weight comes down.'].map(t=>`<li>${OK}<span>${t}</span></li>`).join('')}</ul></div>
</div>`;}
/* v4.6.202: bring the page in line with the staged copy WITHOUT replacing it:
   the same markup is built off-screen and only what differs is carried over --
   classes and pressed states on the controls, the thumb's position, the
   caption, the limit row, the weekday order. Returns false if the page is not
   the one on screen (then the caller renders). */
function pfPrefPatch(){
 const live=document.querySelector('.pf-workspace .pf-prefs');if(!live)return false;
 const t=document.createElement('template');t.innerHTML=pfPrefHTML();const next=t.content.querySelector('.pf-prefs');if(!next)return false;
 /* the weekday row re-orders when the week's first day changes */
 const ld=live.querySelector('.pf-dow'),nd=next.querySelector('.pf-dow'),order=e=>[...e.querySelectorAll('.pf-dowb')].map(x=>x.dataset.value).join();
 if(ld&&nd&&order(ld)!==order(nd))for(const v of order(nd).split(',')){const e=ld.querySelector(`.pf-dowb[data-value="${v}"]`);if(e)ld.append(e);}   /* moved, not rebuilt */
 /* the limit row comes and goes with Size */
 const ll=live.querySelector('.pf-pref-limit'),nl=next.querySelector('.pf-pref-limit');
 if(nl&&!ll){const after=live.querySelector('[data-pw="pf-size"]')?.closest('.pf-pref-row');if(!after)return false;nl.classList.add('pf-reveal');after.after(nl.cloneNode(true));}
 else if(ll&&!nl)ll.remove();
 const pair=(sel,fn)=>{const a=[...live.querySelectorAll(sel)],b=[...next.querySelectorAll(sel)];if(a.length!==b.length)return false;a.forEach((e,i)=>fn(e,b[i]));return true;};
 const ok=pair('.pf-seg',(e,n)=>{e.style.setProperty('--i',n.style.getPropertyValue('--i'));})
  &&pair('.pf-segb,.pf-dowb,.pf-switch',(e,n)=>{e.classList.toggle('on',n.classList.contains('on'));for(const k of ['aria-pressed','aria-checked'])if(n.hasAttribute(k))e.setAttribute(k,n.getAttribute(k));})
  &&pair('.pf-pref-cap,.pf-pref-row>span>small',(e,n)=>{if(e.innerHTML!==n.innerHTML)e.innerHTML=n.innerHTML;});
 return ok;
}
/* v4.6.207: SESSIONS ARE BUILT BY MOVING BODY PARTS INTO THEM. A session was
   edited by opening it and ticking parts: fine for one, but it hid the shape of
   the whole split, and it had no place for Cardio -- which is not a session for
   the maker (he does it before every one) and IS a session for someone else.
   So the parts are chips in a strip, Cardio among them, and each session is a
   box that holds chips. Drag a chip onto a session, or tap a chip to pick it
   up and tap the sessions it belongs in. A chip can sit in as many sessions as
   you like. The order of the chips in a session is the order you do them:
   Cardio first means cardio before lifting. */
function pfSplitCardHTML(p,j){const r=p.rotation,ses=r.sessions,GR='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 9h14M5 15h14"/></svg>',X='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
 const sel=(j.rotSel||[]).filter(i=>i>=0&&i<ses.length),pal=['Run',...p.parts],held=!sel.length&&pal.includes(j.rotHeld)?j.rotHeld:null,next=ses.some(x=>x.parts.length)?pfRotNext(ses):-1;
 const rows=ses.map((x,i)=>{const has=held&&x.parts.includes(held);
  return `<div class="pf-ses${i===next&&ses.length>1?' next':''}${sel.includes(i)?' sel':''}${held&&!has?' can':''}" data-pf-rot="${i}"${held&&!has?` data-pw="pf-rot-put" data-index="${i}" role="button" tabindex="0" aria-label="Add ${hesc(partLabel(held))} to session ${i+1}"`:''}><button type="button" class="pf-rot-n" data-pw="pf-rot-sel" data-index="${i}" aria-pressed="${sel.includes(i)}" aria-label="Session ${i+1}: ${sel.includes(i)?'selected':'select'}">${i+1}</button><div class="pf-ses-in">${x.name?`<span class="pf-rot-name">${hesc(x.name)}</span>`:''}${x.parts.map((t,k)=>`<span class="pf-rot-tag${t==='Run'?' cardio':''}${t===held?' hit':''}" data-pf-chip="${hesc(t)}" data-ses="${i}" data-k="${k}">${hesc(partLabel(t))}<button type="button" class="pf-rot-x" data-pw="pf-rot-x" data-index="${i}" data-k="${k}" aria-label="Take ${hesc(partLabel(t))} out of session ${i+1}">${X}</button></span>`).join('')}${held&&!has?`<span class="pf-rot-ghost">+ ${hesc(partLabel(held))}</span>`:''}${!x.parts.length&&!held?`<em>Drop a body part here</em><button type="button" class="pf-rot-remove" data-pw="pf-rot-remove" data-index="${i}">Remove</button>`:''}${i===next&&ses.length>1&&!held?'<span class="pf-rot-next" title="The session the planner gives you first">Next up</span>':''}</div><button type="button" class="pf-rot-grip" data-pf-rot-grip="${i}" aria-label="Reorder session ${i+1}: drag, or use the arrow keys">${GR}</button></div>`;}).join('');
 const real=ses.filter(x=>x.parts.length),dates=pfTrainDates(p.trainDays),map=real.length?pfRotAssign(real,dates):{};
 const up=real.length&&dates.length?`<span class="pf-split-h">Coming up</span><div class="pf-up">${dates.map(d=>{const x=real[map[d]];return x?`<span><b>${hesc(pfShort(d))}</b>${hesc(x.name||x.parts.map(partLabel).join(' + '))}</span>`:'';}).join('')}</div>`:'';
 const st=real.length?(()=>{const x=real[pfRotNext(real)]||real[0],a=pwAutoTarget(x.parts);if(!a||!a.missing.length)return '';const known=a.per.reduce((t,y)=>t+(y[1]||0),0),n=pfStarterSets(a.missing,known,{sessions:real});return ` No history yet for ${hesc(a.missing.join(', '))}, so ${a.missing.length>1?'they start':'it starts'} at <strong>${a.missing.map((m,k)=>hesc(m)+' '+n[k]).join(' · ')}</strong> sets; your own numbers take over after three logged days.`;})():'';
 const X2='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',allHave=t=>sel.length>0&&sel.every(i=>ses[i].parts.includes(t)),anyAll=pal.some(allHave);
 const strip=`<div class="pf-pal"><div class="pf-pal-h">${sel.length?`<span class="pf-selbar"><b>${sel.length} selected</b><button type="button" class="pf-unsel" data-pw="pf-rot-unsel">${X2}Unselect all</button></span><em>${anyAll?'Tap a lit one to take it out':'Tap a body part to add it'}</em>`:`<span>Body parts</span><em>${held?'Tap the sessions '+hesc(partLabel(held))+' belongs in':'Drag onto a session, or tap one'}</em>`}</div><div class="pf-pal-chips" role="group" aria-label="Body parts to place">${pal.map(t=>`<button type="button" class="pf-pal-chip${t===held?' held':''}${allHave(t)?' all':''}" data-pf-chip="${hesc(t)}" data-pal="1" aria-pressed="${t===held||allHave(t)}">${hesc(partLabel(t))}</button>`).join('')}</div></div>`;
 const SP='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4z"/><path d="M19 15l.9 2.6L22.5 18l-2.6.9L19 21.5l-.9-2.6-2.6-.9 2.6-.4z"/></svg>',UN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/></svg>',OK2='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
 const ordh=`<div class="pf-ordh"><span class="pf-split-h">The order you train in</span>${j.rotUndo?`<button type="button" class="pf-fill undo" data-pw="pf-rot-undo">${UN}Undo</button>`:`<button type="button" class="pf-fill" data-pw="pf-rot-fill">${SP}Fill for me</button>`}</div>`,did=j.rotUndo&&j.rotMsg?`<p class="pf-did" role="status">${OK2}<span>${hesc(j.rotMsg)}</span></p>`:'';
 return `<div class="card pf-split"><h3>Your split</h3><div class="pf-tiles" role="group" aria-label="Your split">${PF_SPLITS.map(([k,t])=>`<button type="button" class="pf-tile${(k==='none'?!r.preset:r.preset===k)?' on':''}" data-pw="pf-split" data-value="${k}" aria-pressed="${k==='none'?!r.preset:r.preset===k}"><b>${t}</b><small>${pfSplitSub(k,p.parts)}</small></button>`).join('')}</div>
 <div class="pf-split-body">${ses.length?`${strip}${ordh}${did}<div class="pf-rots${held?' holding':''}">${rows}</div><button type="button" class="pf-rot-add" data-pw="pf-rot-add">+ Add a session</button>${up}<p class="pf-pref-cap pf-split-note">${real.length?'Tap a number to select a session, then tap body parts to add them to every selected session. Or drag a body part onto one session. The order of the chips is the order you do them: Cardio first means cardio before lifting, and it does not count toward the Set target.':'Fill for me builds the order from what you have logged, or from the body parts you train if there is no log yet. Or build it yourself: tap a number to select a session, then tap body parts.'}${st}</p>`:`<p class="pf-pref-cap pf-split-note">No split is set: you choose body parts for each day in the plan, as before. Pick one to set the order you train in.${r.own&&r.own.length?' Your own sessions are kept under My own.':''}</p>`}</div></div>`;}
/* the split card changes shape (chips and sessions come and go), so its body is replaced on its own; the tiles are kept so they can animate */
function pfSplitRefresh(){const live=document.querySelector('.pf-workspace .pf-prefs .pf-split');if(!live)return false;const j=pfState(),t=document.createElement('template');t.innerHTML=pfSplitCardHTML(j.prefs,j);const next=t.content.firstElementChild;
 const lt=[...live.querySelectorAll('.pf-tile')],nt=[...next.querySelectorAll('.pf-tile')];lt.forEach((e,i)=>{e.classList.toggle('on',nt[i].classList.contains('on'));e.setAttribute('aria-pressed',nt[i].getAttribute('aria-pressed'));const a=e.querySelector('small'),b=nt[i].querySelector('small');if(a.textContent!==b.textContent)a.textContent=b.textContent;});
 live.querySelector('.pf-split-body').innerHTML=next.querySelector('.pf-split-body').innerHTML;pfPalTop();return true;}
/* the strip of chips stays in reach while you scroll through the sessions: it sticks just under the header */
function pfPalTop(){const h=document.querySelector('header'),w=document.querySelector('.pf-workspace');if(h&&w)w.style.setProperty('--pf-pal-top',Math.round(h.getBoundingClientRect().bottom+8)+'px');}
/* put a part into a session (at a place, or where it belongs: Cardio first, the rest last), or take one out */
function pfRotPut(r,i,t,at){const x=r.sessions[i];if(!x||x.parts.includes(t))return false;const k=at==null?(t==='Run'?0:x.parts.length):Math.max(0,Math.min(x.parts.length,at));x.parts.splice(k,0,t);x.name='';pfRotTouch(r);return true;}
function pfRotTake(r,i,k){const x=r.sessions[i];if(!x||x.parts[k]==null)return false;x.parts.splice(k,1);x.name='';pfRotTouch(r);return true;}
/* v4.6.209: FILL FOR ME. One tap builds the whole order, to be corrected rather
   than assembled. With a log it is read from what you did: each logged day of
   the last eight weeks becomes its body parts in the order you did them
   (cardio where you did it), and the cycle that best repeats is the order --
   so the maker's six come back as six, Chest twice, cardio first. A week with
   a skipped day does not break it: the cycle only has to repeat most of the
   time. Without enough of a log it is laid out from the body parts you train:
   the big ones a session each, arms together, core on alternate sessions.
   It is a guess, and says where it came from; Undo puts back what was there. */
function pfRotAutoFill(p){
 const mine=new Set(p.parts),cut=new Date(todayISO+'T12:00');cut.setDate(cut.getDate()-56);const cutISO=cut.toLocaleDateString('en-CA'),days=[];
 for(const d of Object.keys(DB.days||{}).filter(d=>d>=cutISO&&d<=todayISO).sort()){const seen=[];
  for(const x of [...(DB.days[d].w||[])].sort((a,b)=>(a.at||0)-(b.at||0))){if(!((x.reps||[]).length||x.km>0||x.min>0))continue;const t=homePartOf(x.ex)||x.part;if(!t||(t!=='Run'&&!mine.has(t))||seen.includes(t))continue;seen.push(t);}
  if(seen.length){const lift=seen.filter(t=>t!=='Run'),run=seen.includes('Run');days.push({d,parts:run?(seen[0]==='Run'?['Run',...lift]:[...lift,'Run']):lift,key:[...seen].sort().join('+')});}}
 const n=days.length;let best=0,score=0;
 for(let L=1;L<=Math.min(10,n-3);L++){let hit=0,tot=0;for(let i=Math.max(L,n-4*L);i<n;i++){tot++;if(days[i].key===days[i-L].key)hit++;}const sc=tot?hit/tot:0;if(sc>score+0.02){score=sc;best=L;}}
 if(best&&score>=0.6){let cyc=days.slice(n-best);
  /* start the order where your week starts: the session done on the earliest weekday, counted from the week's first day */
  const wd=x=>(new Date(x.d+'T12:00').getDay()-weekStartDow()+7)%7,k=cyc.reduce((m,x,i)=>wd(x)<wd(cyc[m])?i:m,0);cyc=[...cyc.slice(k),...cyc.slice(0,k)];
  const ses=cyc.map(x=>({name:'',parts:x.parts.slice()})),weeks=Math.max(1,Math.round((new Date(todayISO)-new Date(days[0].d))/6048e5)),card=ses.filter(x=>x.parts.includes('Run')).length;
  return {sessions:ses,msg:`Filled from your last ${weeks} ${weeks===1?'week':'weeks'}: ${ses.length} ${ses.length===1?'session':'sessions'}${card===ses.length?(ses.every(x=>x.parts[0]==='Run')?', cardio before each':', cardio in each'):''}. Change anything with the chips.`};}
 const big=['Chest','Back','Shoulder','Legs'].filter(t=>mine.has(t)),arms=['Biceps','Triceps'].filter(t=>mine.has(t)),ses=big.map(t=>({name:'',parts:[t]}));
 if(arms.length)ses.push({name:'',parts:arms});if(mine.has('Sixpack')){if(ses.length)ses.forEach((x,i)=>{if(i%2===0)x.parts.push('Sixpack');});else ses.push({name:'',parts:['Sixpack']});}
 return {sessions:ses,msg:'Filled from the body parts you train'+(n?' (too little in your log to read an order from)':'')+'. Change anything with the chips.'};}
/* a tap on a body part in the strip. With sessions selected it goes into every one of them (or, when they all have it, comes out of them all); with none selected it is picked up, to be tapped into sessions one at a time */
function pfPalTap(t){const j=pfState(),r=j.prefs&&j.prefs.rotation;if(!r)return;const sel=(j.rotSel||[]).filter(i=>r.sessions[i]);
 if(sel.length){if(sel.every(i=>r.sessions[i].parts.includes(t)))sel.forEach(i=>pfRotTake(r,i,r.sessions[i].parts.indexOf(t)));else sel.forEach(i=>pfRotPut(r,i,t));j.rotHeld=null;}else j.rotHeld=j.rotHeld===t?null:t;}
/* any edit to a preset makes it yours */
function pfRotTouch(r){r.preset='own';r.own=pwCopy(r.sessions);const j=pfState();j.rotUndo=null;j.rotMsg='';}
/* the page edits a copy; nothing changes until Save */
/* v4.6.206: THE EXERCISE PICKER IS THE APP'S OWN SHEET. "+ Add" under Avoid and
   Hold opened the phone's dropdown: system chrome over the page, a hundred
   names in one column, no search, one pick and it shut. It is a bottom sheet
   now, like Add exercise on the Edit step: search, a chip for each body part
   you train, exercises grouped by muscle with yours first, as many ticked as
   you like, and one button that says what it will do. Avoid tells you when you
   last did each one; Hold tells you the weight it would hold at and offers only
   what you have logged, because there is nothing to hold otherwise. It adds to
   the page's staged lists; nothing is stored until Save preferences. */
const PF_PICK={avoid:['Avoid an exercise','Left out of every plan. Your log is kept.','Avoid','Already avoided'],hold:['Hold the weight','Reps can move. The load does not go up.','Hold','Already held']};
function pfPickList(){const j=pfState(),k=j.pick,p=j.prefs,hold=k.kind==='hold',have=pfShown(p,k.kind),q=canonKey(k.q||''),same=(a,b)=>canonKey(a)===canonKey(b);
 const all=pwAllExercises().filter(ex=>p.parts.includes(homePartOf(ex))&&(!hold||exLastTopKg(ex)!=null));
 const parts=p.parts.filter(pt=>all.some(ex=>homePartOf(ex)===pt)),part=parts.includes(k.part)?k.part:parts[0];k.part=part||null;
 const pool=q?all.filter(ex=>canonKey(ex).includes(q)):all.filter(ex=>homePartOf(ex)===part),groups=[];
 for(const pt of q?parts:[part])for(const m of (PART_MUSCLES[pt]||[])){const list=pool.filter(ex=>homePartOf(ex)===pt&&exMuscle(ex,pt)===m);if(!list.length)continue;
  list.sort((a,b)=>(SEED.exLast?.[b]||'').localeCompare(SEED.exLast?.[a]||''));   /* yours first, most recent first; the rest keep the catalog's order */
  groups.push({label:(q?pt+' · ':'')+(MUSCLE_LABEL[m]||m),list});}
 return {parts,part,groups,have,same,q,hold};}
function pfPickSub(ex,d){const isHave=d.have.some(x=>d.same(x,ex)),last=SEED.exLast?.[ex];if(isHave)return d.hold?'Already held':'Already avoided';
 if(d.hold){const w=exLastTopKg(ex);return 'Would hold at '+(isBody(ex)?(w>0.01?'BW+'+wDisp(w)+' '+U():'BW'):wDisp(w)+' '+U());}
 if(!last)return 'Not done yet';const dt=new Date(last+'T12:00'),days=Math.round((new Date(todayISO+'T12:00')-dt)/864e5);
 return 'Last done '+dt.toLocaleDateString('en-US',days<7?{weekday:'short',month:'short',day:'numeric'}:dt.getFullYear()===+todayISO.slice(0,4)?{month:'short',day:'numeric'}:{month:'short',day:'numeric',year:'numeric'});}
function pfPickListHTML(d){const k=pfState().pick,OK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
 if(!d.groups.length)return `<p class="pf-pick-empty">${d.q?'No exercise matches “'+hesc(k.q)+'”.':d.hold?'Nothing logged yet. Hold needs a weight on record, so log the exercise once first.':'Nothing to show for these body parts.'}</p>`;
 return d.groups.map(g=>`<div class="pf-pick-mh"><span>${hesc(g.label)}</span><span>${g.list.length}</span></div>`+g.list.map(ex=>{const isHave=d.have.some(x=>d.same(x,ex)),on=k.sel.some(x=>d.same(x,ex)),nw=!d.hold&&!isHave&&!SEED.exLast?.[ex];
  return `<button type="button" class="pf-pick-row${isHave?' have':on?' on':''}" data-pw="pf-xpick-toggle" data-ex="${hesc(ex)}" role="checkbox" aria-checked="${isHave||on}" ${isHave?'aria-disabled="true"':''}><span><b>${hesc(ex)}${nw?'<span class="pf-pick-new">NEW</span>':''}</b><small>${hesc(pfPickSub(ex,d))}</small></span><i class="pf-pick-ck">${OK}</i></button>`;}).join('')).join('');}
function pfPickGoText(){const k=pfState().pick,n=k.sel.length,t=PF_PICK[k.kind];return n?`${t[2]} ${n} ${n===1?'exercise':'exercises'}`:'Choose exercises';}
function pfPickHTML(){const k=pfState().pick,t=PF_PICK[k.kind],d=pfPickList();
 return `<div class="pw-add-scrim pf-pick-scrim" data-pw="pf-xpick-close"></div><div class="pw-add-sheet pf-pick" role="dialog" aria-modal="true" aria-labelledby="pfPickTitle"><div class="pf-pick-top"><div class="pf-pick-grab" aria-hidden="true"></div><div class="pw-add-head"><div><h3 id="pfPickTitle">${t[0]}</h3><p class="pf-pick-sub">${t[1]}</p></div><button type="button" class="pw-add-close" data-pw="pf-xpick-close" aria-label="Close">×</button></div>
 <label class="pw-add-search">${typeof PW_MAG!=='undefined'?PW_MAG:''}<input type="search" data-pf-pick-q placeholder="Search exercises" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search" aria-label="Search exercises" value="${hesc(k.q||'')}"></label>
 <div class="pf-pick-parts" role="group" aria-label="Body part">${d.parts.map(pt=>`<button type="button" class="pf-pick-part${!d.q&&pt===d.part?' on':''}" data-pw="pf-xpick-part" data-part="${hesc(pt)}" aria-pressed="${!d.q&&pt===d.part}">${hesc(pt)}</button>`).join('')}</div></div>
 <div class="pf-pick-list">${pfPickListHTML(d)}</div><div class="pf-pick-foot"><button type="button" class="pf-pick-go" data-pw="pf-xpick-go" ${k.sel.length?'':'disabled'}>${pfPickGoText()}</button></div></div>`;}
function pfPickMount(){let h=document.getElementById('pfPick');if(!h){h=document.createElement('div');h.id='pfPick';h.className='pf-workspace pf-pick-host';document.body.append(h);}h.innerHTML=pfPickHTML();document.documentElement.classList.add('pf-xpick-open');}
function pfPickClose(now){const j=pfState(),h=document.getElementById('pfPick');j.pick=null;document.documentElement.classList.remove('pf-xpick-open');if(!h)return;if(now||matchMedia('(prefers-reduced-motion: reduce)').matches){h.remove();return;}h.classList.add('out');setTimeout(()=>h.remove(),220);}
function pfPickRefreshList(){const h=document.getElementById('pfPick');if(!h)return;const d=pfPickList(),l=h.querySelector('.pf-pick-list');l.innerHTML=pfPickListHTML(d);l.scrollTop=0;h.querySelectorAll('.pf-pick-part').forEach(e=>{const on=!d.q&&e.dataset.part===d.part;e.classList.toggle('on',on);e.setAttribute('aria-pressed',on);});}
/* v4.6.205: AVOID AND HOLD ARE READ LIVE; THE PAGE KEEPS ONLY WHAT YOU CHANGED ON IT.
   The page edited a COPY of both lists, taken when it was first opened and kept
   with the draft. Avoid an exercise from the Plan or its own page after that
   and the copy did not know: the list here showed without it -- and Save then
   made the lists match the copy, which REMOVED it. A stale copy could delete
   an Avoid you had just set. Now the lists are what is true this moment, plus
   the exercises you added here and minus the ones you took off here, and Save
   applies exactly those taps and nothing else. */
function pfShown(p,kind){const live=kind==='hold'?(typeof exHoldNames==='function'?exHoldNames():[]):pfPrefs().avoid,add=p[kind+'Add']||[],del=p[kind+'Del']||[],same=(a,b)=>canonKey(a)===canonKey(b);
 return [...live.filter(n=>!del.some(d=>same(d,n))),...add.filter(n=>!live.some(l=>same(l,n)))];}
function pfListEdit(p,kind,ex,on){const add=p[kind+'Add'],del=p[kind+'Del'],same=x=>canonKey(x)===canonKey(ex),drop=a=>{const i=a.findIndex(same);if(i>=0)a.splice(i,1);return i>=0;};
 if(on){if(!drop(del)&&!pfShown(p,kind).some(same))add.push(ex);}else if(!drop(add))del.push(ex);}
function pfStagePrefs(){const p=pfPrefs();p.goal=['grow','lose','strength'].includes(pw().objective)?pw().objective:'grow';p.weekStart=weekStartDow()===1?'monday':'sunday';if(!p.trainDays)p.trainDays=pfUsualDays();p.avoidAdd=[];p.avoidDel=[];p.holdAdd=[];p.holdDel=[];p.parts=pfMyParts();{const keepOwn=pfRotClean({preset:'own',sessions:p.rotOwn||[]});p.rotation=p.rotation?{preset:p.rotation.preset,sessions:pwCopy(p.rotation.sessions),own:p.rotation.preset==='own'?pwCopy(p.rotation.sessions):(keepOwn?keepOwn.sessions:null)}:{preset:null,sessions:[],own:keepOwn?keepOwn.sessions:null};}const J=pfState();J.rotSel=[];J.rotUndo=null;J.rotMsg='';pfState().rotHeld=null;return p;}
function pfCalendar(){const s=pw(),j=pfState(),landing=new Set(j.move?planShiftable(pfDateKinds().saved,j.move.delta).moves.map(m=>m.to):[]),base=new Date((s.month||todayISO.slice(0,7)+'-01')+'T12:00'),first=weekStartDow(),offset=(base.getDay()-first+7)%7,n=new Date(base.getFullYear(),base.getMonth()+1,0).getDate(),trained=workoutDates(),seen={done:false,trained:false};return `<div class="card pf-date-sheet"><div class="pw-month">${pwButton('month',icon('chevron',ICON_SZ.sm,180),'pw-icon','data-delta="-1" aria-label="Previous month"')}<strong>${base.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong>${pwButton('month',icon('chevron',ICON_SZ.sm),'pw-icon','data-delta="1" aria-label="Next month"')}</div><div class="pw-calendar pf-calendar">${Array.from({length:7},(_,i)=>`<span>${['S','M','T','W','T','F','S'][(first+i)%7]}</span>`).join('')}${'<span></span>'.repeat(offset)}${Array.from({length:n},(_,i)=>{const date=new Date(base);date.setDate(i+1);const d=pwISO(date),selected=s.dates.includes(d),draft=pfCalendarDraft(d),planned=!!pwSaved(d)?.items?.length,saved=d>=todayISO&&planned;const lands=landing.has(d);const done=!draft&&pfDone(d,trained),mark=done?(planned?'done':'trained'):null;if(mark)seen[mark]=true;const status=mark?pfStatusIcon(mark):d<todayISO?'':draft?pfStatusIcon('draft'):saved?pfStatusIcon('saved'):lands?pfStatusIcon('lands'):'';const said=mark==='done'?'plan done':mark==='trained'?'trained':d<todayISO?'past date':draft?(saved?'draft, unsaved changes to saved plan':'new unsaved draft'):saved?'plan saved':'no plan';return pwButton('date',`<span>${i+1}</span><small class="pf-day-status" aria-hidden="true">${status}</small>`,`${selected?'selected':''} ${draft?'pf-has-draft':''} ${lands&&!selected?'pf-lands':''} ${mark?'pf-is-'+mark:''}`,`data-date="${d}" aria-pressed="${selected}" aria-label="${hesc(pwDate(d,true))}, ${said}" ${d<todayISO?'disabled':''}`);}).join('')}</div><div class="pf-calendar-key"><span class="pf-keys"><span><i class="pf-key-selected" aria-hidden="true"></i> Selected</span><span>${pfStatusIcon('saved')} Saved plan</span>${j.move&&!pfDateKinds().drafts.length?'':`<span>${pfStatusIcon('draft')} Draft</span>`}${j.move?`<span>${pfStatusIcon('lands')} Lands here</span>`:''}${seen.done?`<span class="pf-key-done">${pfStatusIcon('done')} Done</span>`:''}${seen.trained?`<span>${pfStatusIcon('trained')} Trained</span>`:''}</span><span>Up to 7 days</span></div></div>`;}
function pfRoutine(rows){return pwRowsHTML(rows).replace(/<pre class="pw-prescription">([\s\S]*?)<\/pre>/g,(_,text)=>`<pre class="pw-prescription">${pfOneLine(text.split('\n').map(x=>x.trim())).join('\n')}</pre>`);}
/* v4.6.210: sets at the same load read on one line ("35 lb × 14 14 14"), as on Today's plan card; a warm-up or a noted line stays its own */
function pfOneLine(lines){const out=[];for(const x of lines){const m=/^(.*×\s*)(\d[\d\s]*)$/.exec(x),q=out[out.length-1];if(m&&q&&q.k===m[1])q.r.push(m[2].trim());else out.push(m?{k:m[1],r:[m[2].trim()]}:{t:x});}return out.map(o=>o.t!=null?o.t:o.k+o.r.join(' '));}
function pfDaysHTML(){const s=pw(),j=pfState(),days=pfDates(),all=days.length&&days.every(d=>j.open?.[d]);return `<div class="pf-right">${pwButton('pf-expand',icon(all?'collapse':'expand',ICON_SZ.sm)+(all?' Collapse All':' Expand All'),'pw-text')}</div>${days.map(d=>{const b=pwDay(d);return `<section class="pf-day" data-pf-day="${d}"><div class="pf-day-date">${hesc(pfShort(d))}</div><div class="card"><button class="pw-btn pf-day-grip" data-pf-day-grip="${d}" aria-label="Reorder workout for ${hesc(pfShort(d))}; drag or use arrow keys">${icon('grip',ICON_SZ.sm)}</button><details data-pf-fold="${d}" ${j.open?.[d]?'open':''}><summary><strong>${hesc((b.parts.length?b.parts:pwParts(b.rows)).join(' + ')||'Choose body parts')}</strong></summary>${pfRoutine(b.rows)}</details><div class="pw-card-heading"><span class="pw-small">${pwSetCount(b.rows)} sets · ${pwExercises(b.rows).length} exercises</span>${pwAction('pf-edit-day','Edit','edit','pw-text',`data-date="${d}"`)}</div></div></section>`;}).join('')}`;}
function pfGroups(r){const groups=[];for(const [index,line]of(r.lines||[]).entries()){const key=JSON.stringify({...line,reps:undefined,raw:undefined});const g=groups.at(-1);if(g?.key===key){g.indices.push(index);g.line.reps.push(...line.reps);}else groups.push({key,indices:[index],line:{...pwCopy(line)}});}return groups;}
function pfHistoryLines(rows){
 const groups=[];
 for(const r of rows){
  const key=JSON.stringify([r.ex,r.w,r.su||'',r.qual||'',r.bw||false,r.tag||'']);
  const last=groups.at(-1);
  if(!isCardio(r)&&last?.key===key)last.reps.push(...(r.reps||[]));
  else groups.push({key,row:r,reps:[...(r.reps||[])]});
 }
 return groups.map(({row:r,reps})=>hesc(isCardio(r)?cardioLine(r):Math.round(toU(r.w))+' '+U()+' × '+reps.join(' ')+(isHold(r.su)?' sec':'')+(r.qual?' ('+r.qual+')':''))).join('<br>');
}
function pfLineText(ex,line){return pwText([{kind:'ex',ex,lines:[line]}]).split('\n').slice(1).map(x=>x.trim()).join('\n');}
/* v4.6.73: THE ROUTINE PAGE SHOWS LAST TIME, AND EDITS IN PLACE.
   The page listed each exercise's prescription as a line of text and sent
   every change through a form card: tap the pencil, tap Edit on a line, fill
   two fields, Keep changes. The maker's ask was to see what he did LAST TIME
   next to what he plans, without breaking the layout -- and the answer that
   survived eleven boards is a spine: weight right-aligned, the x centred to
   the pixel, reps left-aligned into invisible columns, one per set. The plan
   sits on the spine in ink; last time sits under it a step lighter, folded
   the way it was lifted (consecutive same-weight sets on one line), with the
   date as a small chip after the final line. Anything that changed since
   last time is blue, compared position by position.
   Edit opens the exercise in place: the same lines, every number a dotted
   chip; a tapped chip IS the input. A bin in the gutter deletes a line; a
   plus chip adds a set; Add a line and Remove exercise sit under the lines,
   and a removal leaves an Undo strip where the thing was. No warm-up marks
   on this page: a qualifier a plan was pasted with is kept on the line but
   not shown or asked for. */
const pfMD=d=>{const [,m,dd]=String(d).split('-').map(Number);return m+'/'+dd;};
function pfLoadText(line){const unit=line.unit||U(),w=+Number(line.w||0).toFixed(4);return line.nw?'By feel':line.bw?(w?`BW+${w} ${unit}`:'BW'):`${line.est?'≈':''}${w} ${unit}`;}
function pfLastGroups(ex){
 const last=typeof lastFor==='function'&&typeof SEED!=='undefined'?lastFor(ex):null;if(!last?.sets?.length)return null;
 const groups=[];
 for(const s of last.sets){const w=+s[0]||0,reps=(s[1]||[]).map(Number).filter(Number.isFinite);if(!reps.length)continue;const g=groups.at(-1);if(g&&Math.abs(g.w-w)<1e-6)g.reps.push(...reps);else groups.push({w,reps:[...reps]});}
 if(!groups.length)return null;
 return {d:last.d,groups:groups.map(g=>({load:isBody(ex)&&g.w<=0.01?'BW':(isBody(ex)?'BW+':'')+wDisp(g.w)+' '+U(),reps:g.reps}))};
}
function pfSpineLine(load,reps,cls,ref,tail='',compare=false){
 const wup=compare&&!ref;                       // no line at this load last time: the load is the change
 const rs=reps.map((r,i)=>`<i${ref&&(i>=ref.reps.length||ref.reps[i]!==r)?' class="pe-up"':''}>${hesc(String(r))}</i>`).join('');
 return `<div class="pe-line ${cls}"><span class="pe-w${wup?' pe-up':''}">${hesc(load)}</span><span class="pe-x" aria-hidden="true">×</span><span class="pe-r"><span class="pe-reps">${rs}</span>${tail}</span></div>`;
}
function pfChipOpen(i,k,field,rep){const c=pfState().chip;return !!c&&c.row===i&&c.line===k&&c.field===field&&(field==='w'||c.rep===rep);}
function pfChip(i,k,field,rep,text,aria,step){
 if(pfChipOpen(i,k,field,rep))return `<input id="peInput" class="pe-chip pe-in${field==='w'?' pe-cw':''}" type="number" inputmode="${field==='r'?'numeric':'decimal'}" step="${field==='r'?1:step}" min="0" value="${hesc(String(text))}" aria-label="${aria}">`;
 return `<button type="button" class="pe-chip${field==='w'?' pe-cw':''}" data-pw="pf-chip" data-index="${i}" data-line="${k}" data-field="${field}"${field==='r'?` data-rep="${rep}"`:''} aria-label="${aria}">${hesc(String(text))}</button>`;
}
function pfEditLine(ex,i,k,g){
 const c=pfState().chip,open=c&&c.row===i&&c.line===k,line=g.line,unit=line.unit||U();
 const wText=open&&c.field==='w'?(c.fresh?c.fresh.w:line.nw?'':+Number(line.w||0).toFixed(4)):pfLoadText(line);
 const reps=line.reps.map((r,ri)=>pfChip(i,k,'r',ri,r,`Set ${ri+1}: ${r}${isHold(line.su)?' seconds':' reps'}`)).join('');
 return `<div class="pe-line pe-edit"><button type="button" class="pe-del" data-pw="pf-del-line" data-index="${i}" data-line="${k}" aria-label="Delete ${hesc(pfLoadText(line))} × ${hesc(line.reps.join(' '))}">${icon('trash',ICON_SZ.sm)}</button><span class="pe-w">${pfChip(i,k,'w',0,wText,`Weight, ${unit}`,typeof wStep==='function'?wStep(ex):'any')}</span><span class="pe-x" aria-hidden="true">×</span><span class="pe-r">${reps}<button type="button" class="pe-chip pe-add" data-pw="pf-add-rep" data-index="${i}" data-line="${k}" aria-label="Add a set">+</button></span></div>`;
}
function pfStripHTML(text){return `<div class="pe-removed" role="status"><span>Removed <b>${hesc(text)}</b></span>${pwButton('undo','\u21BA Undo','pe-undo')}</div>`;}
function pfRefs(groups,last){
 const all=last?.groups||[],used=new Set();
 return groups.map(g=>{
  const key=pfLoadText(g.line).replace(/^\u2248/,'');
  let k=all.findIndex((x,ix)=>!used.has(ix)&&x.load===key);
  const fresh=k<0;
  if(fresh)k=all.findIndex(x=>x.load===key);   // a second line at a load already used: same reference, not a new load
  if(k<0)return null;
  used.add(k);
  return {...all[k],fresh:false};
 });
}
function pfExerciseHTML(r,i){
 const j=pfState(),b=pwDay(pw().active),open=!!j.routineOpen?.[pw().active]?.[i],groups=pfGroups(r),last=isCardio(r)?null:pfLastGroups(r.ex),strip=b.strip&&b.strip.row===i&&b.strip.line!=null?b.strip:null;
 /* v4.6.76: BLUE MEANS YOU CHANGED IT, AND A LOAD IS COMPARED TO ITSELF.
    Lines were matched by their position in the list, counted from the end --
    so adding a warm-up above shifted every line onto the wrong reference and
    a plan that repeated last week's 95 x 10 came out blue against last week's
    115. A plan line is compared to the LAST-TIME LINE AT THE SAME LOAD: the
    weight goes blue only when that load is new to this exercise, and the reps
    only where they differ from what that same load actually did. */
 const refs=pfRefs(groups,last);
 const lines=[];
 groups.forEach((g,k)=>{
  if(strip&&strip.line===k)lines.push(pfStripHTML(strip.text));
  const ref=refs[k],tail=isHold(g.line.su)?'<span class="pe-q">sec</span>':'';
  lines.push(open?pfEditLine(r.ex,i,k,g):pfSpineLine(pfLoadText(g.line),g.line.reps,'pe-plan',ref,tail,!!last));
 });
 if(strip&&strip.line>=groups.length)lines.push(pfStripHTML(strip.text));
 if(last)last.groups.forEach((g,k)=>lines.push(pfSpineLine(g.load,g.reps,'pe-last',null,k===last.groups.length-1?`<span class="pe-d">${hesc(pfMD(last.d))}</span>`:'')));
 const toggle=pwButton('pf-row-toggle',open?icon('check',ICON_SZ.sm)+' Done':icon('edit',ICON_SZ.sm),'pf-row-toggle pe-toggle'+(open?' primary':''),`data-index="${i}" aria-expanded="${open}" aria-label="${open?'Done editing':'Edit'} ${hesc(r.ex)}"`);
 /* v4.6.185: one quiet line. Add a line on the left; Remove and Avoid on the
    right, apart from the editing action, single words, no boxes. */
 const actions=open?`<div class="pe-actions">${pwButton('pf-add-line',icon('clear',ICON_SZ.sm,45)+' Add a line','pe-btn pe-add',`data-index="${i}"`)}<span class="pe-gap"></span>${pwButton('pf-remove-ex',icon('trash',ICON_SZ.sm)+' Remove','pe-btn pe-danger',`data-index="${i}" aria-label="Remove ${hesc(r.ex)} from this day"`)}<i class="pe-div" aria-hidden="true"></i>${pwButton('pf-xp-avoid',XP_ICON+' Avoid','pe-btn pe-avoid',`data-index="${i}" aria-label="Avoid ${hesc(r.ex)} from now on"`)}</div>`:'';
 /* an avoided exercise is not edited, it is decided: its name, dimmed, the
    Avoided tag, and the panel */
 if(isAvoided(r.ex))return `<article class="pw-exercise pw-editable pe-ex xp-avoided" data-pw-row="${i}"><button class="pw-btn pw-grip" data-pw-grip="${i}" aria-label="Reorder ${hesc(r.ex)}; drag or use arrow keys">${icon('grip',ICON_SZ.sm)}</button><div class="pf-ex-summary"><div><strong>${hesc(r.ex)}</strong><span class="pf-mtag xp-avtag">${XP_ICON}Avoided</span></div></div>${pfAvoidFlag(b,r,i)}</article>`;
 return `<article class="pw-exercise pw-editable pe-ex${open?' pe-open':''}" data-pw-row="${i}"><button class="pw-btn pw-grip" data-pw-grip="${i}" aria-label="Reorder ${hesc(r.ex)}; drag or use arrow keys">${icon('grip',ICON_SZ.sm)}</button><div class="pf-ex-summary"><div><strong>${hesc(r.ex)}</strong>${pfMuscleTag(b,r.ex)}${typeof xhTag==='function'?xhTag(r.ex):''}</div>${toggle}</div><div class="pe-lines">${lines.join('')}</div>${actions}${b.swapped&&b.swapped.row===i&&b.swapped.to===r.ex?`<span class="xp-was">swapped from ${hesc(b.swapped.from.ex)}${pwButton('pf-xp-undo','Undo','xp-undo',`data-index="${i}"`)}</span>`:''}</article>`;
}
/* v4.6.174: AN AVOIDED EXERCISE IN A PLAN. A saved plan is something you
   approved, so the app does not rewrite it on its own: the row is set apart
   and offers the swap. Up to two lifts for the SAME primary muscle (the ones
   you have done first, most recent first; then any you have not), never
   another avoided one or one already in the day -- and Remove, always,
   because skipping that muscle today is a real choice too. */
function pfSwapOptions(b,r){
 const part=homePartOf(r.ex)||(SEED.ex2part||{})[r.ex]||'',mus=exMuscle(r.ex,part);if(!mus||mus==='unassigned')return [];
 const have=new Set(b.rows.map(x=>x.ex).filter(Boolean)),seen=new Set(),all=[];
 for(const [p,list] of Object.entries(SEED.catalog||{}))if(p!=='Run')for(const ex of list)if(!seen.has(ex)){seen.add(ex);all.push([ex,p]);}
 for(const ex of Object.keys((typeof customs==='function'&&customs())||{}))if(!seen.has(ex)){seen.add(ex);all.push([ex,homePartOf(ex)||'']);}
 const fit=all.filter(([ex,p])=>ex!==r.ex&&!have.has(ex)&&!isAvoided(ex)&&exMuscle(ex,p)===mus).map(([ex])=>ex);
 /* done first (most recent first), then the day's own body part first --
    Deadlift works the hamstrings too, but it lives on Back */
 const same=ex=>(homePartOf(ex)||'')===part?0:1,isDone=ex=>SEED.lastSess?.[ex]&&pwLastLine(ex)?0:1;
 return fit.sort((a,c)=>isDone(a)-isDone(c)||same(a)-same(c)||(SEED.exLast[c]||'').localeCompare(SEED.exLast[a]||'')||a.localeCompare(c)).slice(0,2);
}
const pfMuscleWord=m=>(MUSCLE_LABEL[m]||m).replace(/^mid /,'');
/* "another hamstring lift", not "another hamstrings lift" */
const pfMuscleAdj=m=>({hamstrings:'hamstring',calves:'calf',quads:'quad',glutes:'glute',lats:'lat',obliques:'oblique'})[m]||pfMuscleWord(m);
/* v4.6.185: one soft panel, two kinds of row. The dashed box of nested cards
   it replaces read as an error; this reads as a choice. Swap rows first (the
   first carries the only accent), then Leave it out, which says what still
   trains that muscle today -- or that nothing does. The header undoes the
   avoid: "Undo avoid" when it was set on this page a moment ago, "Include
   again" for one you avoided before. */
function pfAvoidFlag(b,r,i){
 const part=homePartOf(r.ex)||'',mus=exMuscle(r.ex,part),word=MUSCLE_LABEL[mus]||mus,opts=pfSwapOptions(b,r);
 const short=d=>new Date(d+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
 const day=new Date(pw().active+'T12:00').toLocaleDateString('en-US',{weekday:'long'});
 const cover=pwExercises(b.rows).filter(x=>x!==r&&x.ex!==r.ex&&!isAvoided(x.ex)&&mus&&mus!=='unassigned'&&exMuscle(x.ex,homePartOf(x.ex)||'')===mus).map(x=>x.ex);
 const names=cover.length>2?cover.slice(0,-1).join(', ')+' and '+cover.at(-1):cover.join(' and ');
 const left=mus==='unassigned'||!mus?`Not on ${day}`:cover.length?`${names} cover${cover.length===1?'s':''} ${word}`:`No ${word} on ${day}`;
 const btn=(ex,k)=>{const l=SEED.lastSess?.[ex]&&pwLastLine(ex);return `<button type="button" class="pw-btn xp-swap${k?'':' first'}" data-pw="pf-xp-swap" data-index="${i}" data-ex="${hesc(ex)}"><span><strong>${hesc(ex)}</strong><small>${l?hesc(l.load+' × '+l.reps.join(' '))+' · last '+short(SEED.exLast[ex]):'New to you · starts by feel'}</small></span><i>Swap</i></button>`;};
 return `<div class="xp-flag"><div class="xp-flag-h"><p>${opts.length?'Replace it on '+hesc(day):'No other '+hesc(word)+' exercise to swap in'}</p>${pwButton('pf-xp-include',pfState().xpNow===exIdOf(r.ex)?'Undo avoid':'Include again','xp-include',`data-index="${i}"`)}</div>${opts.map(btn).join('')}<button type="button" class="pw-btn xp-swap ghost" data-pw="pf-remove-ex" data-index="${i}"><span><strong>Leave it out</strong><small>${hesc(left)}</small></span><i>Remove</i></button></div>`;
}
/* the row a swap puts in: your last working sets, or, for a lift you have not
   done, the same number of sets by feel at the reps the avoided one asked for */
function pfSwapRow(old,ex){
 const n=(old.lines||[]).filter(l=>!/warm/i.test((l.qual||'')+(l.tag||''))).reduce((a,l)=>a+(l.reps||[]).length,0)||3;
 const own=SEED.lastSess?.[ex]&&pwExerciseRow(ex,n);if(own){delete own.added;return own;}
 const reps=((old.lines||[]).at(-1)||{}).reps||[10];
 return pwRead(`${ex}\n  by feel × ${Array.from({length:n},(_,k)=>reps[Math.min(k,reps.length-1)]).join(' ')}`)[0];
}
function pfEditRows(){const b=pwDay(pw().active),strip=b.strip&&b.strip.line==null?b.strip:null;return '<div class="pw-exercises">'+b.rows.map((r,i)=>{
 const before=strip&&strip.row===i?pfStripHTML(strip.text):'';
 if(pfIsCardioRow(r)){const [nm,...rest]=String(r.raw||r.ex||'').split(/\s+[\u2014\u2013]\s+/);return before+'<article class="pw-exercise pf-cardio" data-pw-row="'+i+'"><div class="pf-ex-summary"><div><strong>'+hesc(nm.trim())+'</strong><span class="pf-mtag">Cardio</span></div><p class="pf-cardio-line">'+hesc(rest.join(' \u2014 ').trim()||'by feel')+'</p></div>'+pwButton('editrow',icon('edit',ICON_SZ.sm),'pf-cardio-edit',`data-index="${i}" aria-label="Edit ${hesc(nm.trim())}"`)+'</article>';}
 if(r.kind!=='ex'||!r.ex)return before+'<div data-pw-row="'+i+'" class="pw-unread"><pre>'+hesc(r.raw||'')+'</pre>'+pwButton('editrow','Edit text','',`data-index="${i}"`)+'</div>';
 return before+pfExerciseHTML(r,i);
 }).join('')+(strip&&strip.row>=b.rows.length?pfStripHTML(strip.text):'')+'</div>';}
/* one gesture = one undo point, and a strip only ever describes the LAST one */
function pfChange(b){delete b.strip;delete b.swapped;pwUndoPoint(b);b.source='Your draft';b.target=null;}
function pfSetGroup(b,i,g,line){
 pfChange(b);delete line.raw;if(line.w>0)delete line.nw;
 const reps=line.reps,lines=Array.from({length:Math.ceil(reps.length/12)},(_,k)=>({...line,reps:reps.slice(k*12,k*12+12)}));
 b.rows[i].lines.splice(g.indices[0],g.indices.length,...lines);if(!b.locks.includes(i))b.locks.push(i);
}
function pfChipCommit(){
 const j=pfState(),c=j.chip;if(!c)return false;j.chip=null;
 const inp=document.getElementById('peInput'),b=pwDay(pw().active),r=b.rows[c.row],g=r&&pfGroups(r)[c.line];
 if(!inp||!g)return false;
 const v=Number(inp.value),line=pwCopy(g.line);
 if(c.field==='w'){if(inp.value.trim()===''||!Number.isFinite(v)||v<0||v>10000)return false;if(v===+Number(line.w||0).toFixed(4))return false;line.w=+v.toFixed(4);}
 else{
  /* v4.6.76: CLEARING A REP REMOVES IT. + adds a set to a line, and nothing
     took one away: 0 was refused as an invalid rep count, which is true of a
     rep you keep and wrong for one you are deleting. Empty or 0 removes that
     set; clearing a line's last rep removes the line, with the same Undo
     strip the bin leaves, because a line of no sets is not a line. */
  const blank=inp.value.trim()==='';
  if(blank||v===0){
   if(line.reps.length<2){
    const text=pfLoadText(g.line)+' \u00d7 '+g.line.reps.join(' ');
    pfChange(b);r.lines=r.lines.filter((_,x)=>!g.indices.includes(x));
    b.strip={row:c.row,line:c.line,text};if(!b.locks.includes(c.row))b.locks.push(c.row);
    pwPersist();return true;
   }
   line.reps.splice(c.rep,1);
  }
  else if(!Number.isInteger(v)||v<1||v>10000||line.reps[c.rep]===v)return false;
  else line.reps[c.rep]=v;
 }
 pfSetGroup(b,c.row,g,line);pwPersist();return true;
}
function pfRoutineHandle(a,el,b,j){
 const i=+el.dataset.index,k=+el.dataset.line,r=b.rows[i],g=r&&pfGroups(r)[k];
 if(a==='pf-chip'){const next={row:i,line:k,field:el.dataset.field,rep:+el.dataset.rep||0};if(j.chip&&j.chip.row===next.row&&j.chip.line===next.line&&j.chip.field===next.field&&j.chip.rep===next.rep)return;pfChipClose(true);j.chip=next;}
 else if(a==='pf-add-rep'){pfChipClose(true);if(!g)return;const line=pwCopy(g.line);line.reps.push(line.reps.at(-1)||8);pfSetGroup(b,i,g,line);}
 else if(a==='pf-del-line'){pfChipClose(true);if(!g)return;const text=pfLoadText(g.line)+' × '+g.line.reps.join(' ');pfChange(b);r.lines=r.lines.filter((_,x)=>!g.indices.includes(x));b.strip={row:i,line:k,text};if(!b.locks.includes(i))b.locks.push(i);}
 else if(a==='pf-add-line'){if(!r)return;pfChipClose(true);const from=r.lines.at(-1)||{w:0,unit:U(),reps:[8]},line={w:0,unit:from.unit||U(),reps:[from.reps.at(-1)||8]};if(from.su)line.su=from.su;if(from.bw)line.bw=true;pfChange(b);r.lines.push(line);if(!b.locks.includes(i))b.locks.push(i);j.chip={row:i,line:pfGroups(r).length-1,field:'w',rep:0,fresh:{w:+Number(from.w||0).toFixed(4)}};}
 else if(a==='pf-xp-swap'){pfChipClose(false);if(!r)return;const ex=el.dataset.ex,nr=ex&&pfSwapRow(r,ex);if(!nr||nr.kind!=='ex')return;pfChange(b);b.swapped={row:i,from:pwCopy(r),to:ex};b.rows[i]=nr;const pt=homePartOf(ex);if(pt&&Array.isArray(b.parts)&&!b.parts.includes(pt))b.parts.push(pt);}   /* v4.6.174 */
 /* v4.6.185: Avoid, from the plan. The same verdict as the switch on the exercise's
    page (setExPref): the writer and the app's own picks leave it out from now
    on. The day is not touched -- the row turns into the panel that asks. */
 else if(a==='pf-xp-avoid'){pfChipClose(true);if(!r||!r.ex)return;setExPref(r.ex,'avoid');j.xpNow=exIdOf(r.ex);const o=j.routineOpen?.[pw().active];if(o)delete o[i];}
 else if(a==='pf-xp-include'){if(!r||!r.ex)return;setExPref(r.ex,null);if(j.xpNow===exIdOf(r.ex))delete j.xpNow;}
 else if(a==='pf-xp-undo'){pfChipClose(false);const w=b.swapped;if(!w||w.row!==i)return;pfChange(b);b.rows[i]=w.from;}
 else if(a==='pf-remove-ex'){pfChipClose(false);if(!r)return;pfChange(b);b.rows.splice(i,1);b.locks=b.locks.filter(x=>x!==i).map(x=>x>i?x-1:x);b.strip={row:i,text:r.ex||'exercise'};const o=j.routineOpen?.[pw().active];if(o){const n={};for(const [key,v] of Object.entries(o)){const x=+key;if(x<i)n[x]=v;else if(x>i)n[x-1]=v;}j.routineOpen[pw().active]=n;}}
}
document.addEventListener('pointerdown',e=>{
 /* a tap on another chip while one is open: commit first, then open. The
    click that follows would land on a re-rendered element, so the chip
    opens from here and the click finds it already open. */
 if(!pfOn())return;const chip=e.target.closest('[data-pw="pf-chip"]');if(!chip||!pfState().chip)return;
 e.preventDefault();pfHandle('pf-chip',chip);
});
document.addEventListener('keydown',e=>{
 if(e.target.id!=='peInput'||!pfOn())return;
 if(e.key==='Enter'){e.preventDefault();pfChipClose(true);pwPersist();pwRender();}
 else if(e.key==='Escape'){e.preventDefault();pfChipClose(false);pwPersist();pwRender();}
});
document.addEventListener('focusout',e=>{
 if(e.target.id!=='peInput'||!pfOn()||!pfState().chip||e.target!==document.getElementById('peInput'))return;
 pfChipClose(true);pwPersist();pwRender();
});
/* close the open chip: commit (or not), then drop a fresh line nothing was typed into */
function pfChipClose(commit){
 const j=pfState(),c=j.chip;if(!c)return;
 if(commit)pfChipCommit();else j.chip=null;
 if(c.fresh){const b=pwDay(pw().active),r=b.rows[c.row],g=r&&pfGroups(r)[c.line];if(g&&!(g.line.w>0)&&!g.line.bw&&!g.line.nw)r.lines=r.lines.filter((_,x)=>!g.indices.includes(x));}
}
function pfFocusChip(){const inp=document.getElementById('peInput');if(!inp)return;inp.focus();try{inp.select();}catch(_e){}}
function pfHistoryHTML(compact=false){const s=pw(),parts=s.active?(pwDay(s.active).parts.length?pwDay(s.active).parts:pwParts(pwDay(s.active).rows)):[],date=Object.keys(DB.days).filter(d=>d<(s.active||todayISO)&&(DB.days[d].w||[]).length&&(!parts.length||(DB.days[d].w||[]).some(r=>r.part===parts[0]))).sort().at(-1);if(!date)return '';const rows=DB.days[date].w,exercises=[...new Set(rows.map(r=>r.ex))],sets=rows.reduce((n,r)=>n+(r.ex==='Run'?1:(r.reps||[]).length),0);return `<details class="card pf-history" ${compact?'':'open'}><summary><strong>Last workout day</strong><span>${hesc(pfShort(date))}</span></summary><p class="pw-small">${sets} sets · ${exercises.length} exercises · Entire day</p>${exercises.map(ex=>`<div class="pf-history-row"><strong>${hesc(ex)}</strong><p class="mono">${pfHistoryLines(rows.filter(r=>r.ex===ex))}</p></div>`).join('')}</details>`;}
/* v4.6.76: A DAY THAT IS NOT SAVED SAYS SO. Every edit lands in a draft that
   only Save writes, and once the week is a strip the edited day can be three
   taps away -- so the chip carries a dot, and the dock counts them. A day with
   no saved plan behind it counts as unsaved too: it is, until Save runs. */
function pfDirty(d){const b=pw().book?.[d];return !!b&&(b.source!=='Saved plan'||!pwSaved(d)?.items?.length);}
function pfDirtyDates(){return pfDates().filter(pfDirty);}
function pfWeekStrip(){const s=pw();return `<div class="pf-strip" role="tablist" aria-label="Planned days">${pfDates().map(d=>{const b=pwDay(d),ps=(b.parts.length?b.parts:pwParts(b.rows)),part=partLabel(ps.find(x=>x!=='Run')||ps[0]||'')||'\u2014'   /* v4.6.207: a day is named by what it trains; Cardio only when that is all it is */,on=d===s.active,dirty=pfDirty(d);return pwButton('pf-pick-day',`<b>${hesc(new Date(d+'T12:00').toLocaleDateString('en-US',{weekday:'short'}))}</b><s>${hesc(pfMD(d))}</s><u>${hesc(part)}</u>${dirty?'<em class="pf-dot" aria-hidden="true"></em>':''}`,'pf-chip'+(on?' selected':'')+(dirty?' pf-edited':''),`data-date="${d}" role="tab" aria-selected="${on}" aria-label="${hesc(pfShort(d))}${dirty?', unsaved changes':''}"`);}).join('')}</div>`;}
function pfDayHTML(){return pfWeekStrip()+`<div class="pf-day-body">${pfDayBodyHTML()}</div>`;}
/* body parts for the day you are editing: the chips show what the day trains;
   choosing different ones marks Regenerate, which rewrites the day for them */
function pfPartList(){return Object.keys(SEED.catalog).filter(x=>x==='Run'||myPartsSet().has(x));}
function pfPartsSel(b){return b.partsPick||b.parts.length?b.parts:pwParts(b.rows);}
function pfPartsPending(b){return !!b.partsPick&&b.parts.slice().sort().join()!==pwParts(b.rows).slice().sort().join();}
/* v4.6.183: THE FOCUS ROWS AND THE MUSCLE TAGS. A chest day came back as three
   incline movements and nothing on the page said so, or let the maker ask for
   lower chest. Each selected body part with more than one muscle gets its own
   row of that part's muscles; a tapped muscle leads the part on the next
   Regenerate. Every exercise carries its muscle as a small tag (accent when it
   is a focus), so the balance of a day can be read down the names. */
const PF_MUSCLE_SHORT=MUSCLE_SHORT;
function pfFocus(b){const parts=pfPartsSel(b);return (b.focus||[]).filter(m=>parts.includes(MUSCLE_PART[m]));}
function pfFocusPending(b){return !!b.focusPick&&pfFocus(b).slice().sort().join()!==(b.focusGen||[]).slice().sort().join();}
function pfMuscleTag(b,ex){const p=homePartOf(ex);if(!p||(PART_MUSCLES[p]||[]).length<2)return '';const m=exMuscle(ex,p);if(!PF_MUSCLE_SHORT[m])return '';
 return `<span class="pf-mtag${pfFocus(b).includes(m)?' on':''}">${hesc(PF_MUSCLE_SHORT[m])}</span>`;}
function pfFocusHTML(b){const sel=pfPartsSel(b),f=pfFocus(b),parts=pfPartList().filter(p=>sel.includes(p)&&(PART_MUSCLES[p]||[]).length>1);if(!parts.length)return '';
 return `<div class="pf-focus" role="group" aria-labelledby="pfFocusLabel"><span class="pf-parts-label" id="pfFocusLabel">Focus · optional</span>${parts.map(p=>`<div class="pf-focus-row"><b>${hesc(partLabel(p))}</b><div class="pf-focus-chips">${PART_MUSCLES[p].map(m=>pwButton('pf-focus',hesc(PF_MUSCLE_SHORT[m]||MUSCLE_LABEL[m]||m),'pf-focus-chip'+(f.includes(m)?' selected':''),`data-muscle="${hesc(m)}" aria-pressed="${f.includes(m)}" aria-label="${hesc(MUSCLE_LABEL[m]||m)} first"`)).join('')}</div></div>`).join('')}</div>`;}
/* "Chest · lower chest first + Sixpack" */
function pfPartsText(b){const f=pfFocus(b);return pfPartsSel(b).map(p=>{const m=f.filter(x=>MUSCLE_PART[x]===p).map(x=>MUSCLE_LABEL[x]||x);return p+(m.length?' · '+m.join(' and ')+' first':'');}).join(' + ');}
/* "9 of 11 Chest sets on lower chest", for a day built with a focus */
function pfFocusStat(b){const f=pfFocus(b);if(!f.length||pfFocusPending(b))return '';
 return [...new Set(f.map(m=>MUSCLE_PART[m]))].map(p=>{const rows=pwExercises(b.rows).filter(r=>homePartOf(r.ex)===p),mine=f.filter(m=>MUSCLE_PART[m]===p),on=rows.filter(r=>mine.includes(exMuscle(r.ex,p)));
  return rows.length?` · ${pwSetCount(on)} of ${pwSetCount(rows)} ${p} sets on ${mine.map(m=>MUSCLE_LABEL[m]||m).join(' and ')}`:'';}).join('');}
/* v4.6.183: THE SET TARGET CALCULATES ITSELF. Auto is the sum of what you usually
   do for each selected body part (pwUsualSets); in the sets-range preference it
   stays inside your range. The day is "yours" once you step it away from that,
   and stays so until Back to auto or a change of body parts. target is what the
   next Regenerate builds to. */
function pfAutoFor(parts){
 const a=pwAutoTarget(parts);if(!a)return null;const p=pfPrefs();
 if(a.missing.length&&p.rotation){const known=a.per.reduce((t,x)=>t+(x[1]||0),0),st=pfStarterSets(a.missing,known,p.rotation);a.start=a.missing.slice();a.per=a.per.map(x=>x[1]==null?[x[0],st[a.missing.indexOf(x[0])]]:x);a.missing=[];a.total=a.per.reduce((t,x)=>t+x[1],0);}
 if(a.total!=null&&p.mode==='limit'&&a.total>p.maxSets){a.range=String(p.maxSets);a.total=p.maxSets;}   /* v4.6.201: a limit only ever lowers the number; nothing is padded up to a minimum any more */
 return a;
}
function pfAuto(b){
 const a=pfAutoFor(pfPartsSel(b));if(!a)return null;
 const total=pwSetCount(b.rows),pending=pfPartsPending(b);
 a.mine=a.total!=null&&(!!b.setsMine||(!pending&&total>0&&total!==a.total));
 a.target=a.total==null||a.mine?(total||null):a.total;
 return a;
}
function pfAutoHTML(b,a){
 if(!a)return '';const names=a.per.map(x=>x[0]);
 if(a.total==null)return `<p class="pf-auto-line" role="status">No usual yet for ${hesc(a.missing.join(' + '))}: fewer than three logged days in eight weeks, so the count is yours to set.</p>`;
 const per=a.per.map(x=>`<b>${hesc(x[0])} ${x[1]}</b>`).join(' + '),range=a.range?` · kept to your limit of ${a.range}`:'';
 return a.mine?`<p class="pf-auto-line" role="status">Your usual is <b>${a.total}</b>${a.per.length>1?' · '+a.per.map(x=>hesc(x[0])+' '+x[1]).join(' + '):''}${range} · ${pwButton('pf-auto','Back to auto','pf-auto-back')}</p>`
  :a.start?`<p class="pf-auto-line" role="status">${per} · a starting size for ${hesc(a.start.join(' + '))} until three days are logged${range}</p>`
  :`<p class="pf-auto-line" role="status">${per} · what you usually do on ${names.length>1?'these days':'a '+hesc(names[0])+' day'}${range}</p>`;
}
function pfPartsHTML(b){const sel=pfPartsSel(b);
 return `<div class="pf-parts" role="group" aria-labelledby="pfPartsLabel"><span class="pf-parts-label" id="pfPartsLabel">Body parts</span><div class="pf-parts-chips">${pfPartList().map(x=>pwButton('pf-part',hesc(partLabel(x)),'pf-part'+(sel.includes(x)?' selected':''),`data-part="${hesc(x)}" aria-pressed="${sel.includes(x)}"`)).join('')}</div></div>`;}
function pfDayBodyHTML(){pfDropStaleTargets();const s=pw(),b=pwDay(s.active),j=pfState(),total=pwSetCount(b.rows),auto=pfAuto(b),parts=pfPartsPending(b)||pfFocusPending(b),
  want=b.target!=null?b.target:parts&&auto?.target?auto.target:total,changed=want!==total;
 return pfPartsHTML(b)+pfFocusHTML(b)+`<div class="pf-routine-controls"><div class="pf-total"><span class="pf-total-label">Set target${auto&&auto.total!=null?`<i class="pf-auto-tag${auto.mine?' mine':''}">${auto.mine?'Yours':'Auto'}</i>`:''}</span><div class="pw-stepper">${pwButton('pf-minus','\u2212','','aria-label="Decrease total sets"'+(!b.rows.length?' disabled':''))}<output class="${changed?'pf-changed':''}">${want}</output>${pwButton('pf-plus','+','','aria-label="Increase total sets"'+(!b.rows.length?' disabled':''))}</div></div><div class="pf-tools">${pwAction('pf-regenerate','Regenerate','sparkle','pf-quiet-regenerate'+(changed||parts?' pf-beam pf-target-pending':''))}${pwButton('paste',icon('paste',ICON_SZ.sm),'pw-icon pf-tool','aria-label="Paste a routine" title="Paste"')}${pwButton('pf-clear',icon('clear',ICON_SZ.sm),'pw-icon pf-tool','aria-label="Clear this day" title="Clear"')}</div></div>${pfAutoHTML(b,auto)}<p class="pf-target-hint" role="status">${parts?(pfPartsSel(b).length?hesc(pfPartsText(b)):'No parts chosen: the writer picks')+(changed?' \u00b7 '+want+' sets':'')+' \u00b7 Regenerate to rebuild this day':changed?total+' current \u2192 '+want+' target \u00b7 Regenerate to apply':total+' sets \u00b7 '+pwExercises(b.rows).length+' exercises'+hesc(pfFocusStat(b))}</p><div class="card pf-routine-card">${b.rows.length?pfEditRows():'<p>No exercises yet.</p>'}</div><div class="pf-add-summary">${pwButton('add-open',icon('clear',ICON_SZ.sm,45)+' Add exercise','pf-add-button','data-ctx="edit"')}</div>${b.undo&&!b.strip?pwButton('undo','Undo','pw-text'):''}${s.addOpen&&s.addCtx==='edit'?pwAddSheetHTML(s):''}`;
}
/* v4.6.77: PICKING A DAY IS NOT A NAVIGATION. Every chip tap ran pfNavigate,
   which rebuilt the whole workspace, played the 'arrive' motion -- the page
   translating 12px and fading, 360ms -- and then scrolled to the top. Three
   movements to swap the content under a strip that never moves. The strip is
   a tab bar: the chips flip their own selected state and only the body below
   them is rewritten, in place, with the scroll left where it was. */
function pfSwapDay(){
 const body=document.querySelector('.pf-day-body'),strip=document.querySelector('.pf-strip');
 if(!body||!strip)return pwRender();
 const active=pw().active;
 for(const chip of strip.querySelectorAll('.pf-chip')){
  const on=chip.dataset.date===active;
  chip.classList.toggle('selected',on);chip.setAttribute('aria-selected',String(on));
 }
 const y=window.scrollY;
 body.innerHTML=pfDayBodyHTML();
 /* the new day can be shorter than the scroll position the old one allowed */
 const max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
 if(y>max)window.scrollTo(0,max);
 pwPositionDock();
}
/* v4.6.159: since v4.6.157 Set target changes the routine live and leaves no
   target pending, so a target that disagrees with the routine is a leftover
   from an older draft. It kept Save disabled after an exercise was added;
   drop it here rather than hold the save for a Regenerate nobody asked for. */
function pfDropStaleTargets(){for(const d of pw().dates){const b=pwDay(d);if(b.target!=null&&b.target!==pwSetCount(b.rows))b.target=null;}}
function pfPending(){pfDropStaleTargets();return false;}
function pfFitSets(rows,min,max,locked=[]){
 const rs=pwCopy(rows),warm=l=>/warm|prep/i.test((l.qual||'')+(l.tag||'')),work=r=>r.lines.filter(l=>!warm(l)).reduce((n,l)=>n+l.reps.length,0);
 const ex=rs.map((r,i)=>({r,i})).filter(x=>x.r.kind==='ex'&&x.r.ex&&(x.r.lines||[]).length&&!locked.includes(pwText([x.r])));   // locked = the fixed rows' text, so a removed row before them cannot shift the match
 const from=pwSetCount(rs);let total=from;
 const lastWork=r=>[...r.lines].reverse().find(l=>!warm(l)&&l.reps.length);
 while(total>max){
  const c=ex.filter(x=>work(x.r)>1).sort((a,b)=>work(b.r)-work(a.r)||b.i-a.i)[0];if(!c)break;
  const l=lastWork(c.r);l.reps.pop();if(!l.reps.length)c.r.lines.splice(c.r.lines.indexOf(l),1);total--;
 }
 /* still over with one working set each: whole exercises go, last first, until it fits */
 const gone=[];
 while(total>max){
  const c=[...ex].reverse().find(x=>!gone.includes(x)&&rs.includes(x.r));if(!c)break;
  total-=pwSetCount([c.r]);rs.splice(rs.indexOf(c.r),1);gone.push(c);
 }
 while(total<min){
  const c=ex.filter(x=>rs.includes(x.r)&&lastWork(x.r)).sort((a,b)=>work(a.r)-work(b.r)||a.i-b.i)[0];if(!c)break;
  const l=lastWork(c.r);l.reps.push(l.reps[l.reps.length-1]);total++;
 }
 return {rows:rs,from,to:total,dropped:gone.map(x=>x.r.ex)};
}
/* v4.6.184: THE FOCUS IS NOT LEFT TO THE WRITER. v4.6.183 told the writer the
   day's focus, sent a short answer back once, and then let the day stand as
   written -- so Mid + Lower chest came back as Dip and three incline movements,
   "3 of 14 Chest sets on mid chest and lower chest". Which muscle an exercise
   trains is a fact the app holds (exMuscle), so the app decides: in a body part
   with a focus, every exercise that is not on a focus muscle is swapped for one
   that is. The counterpart is the closest by name (Incline Barbell Bench Press
   -> Barbell Bench Press, Cable Fly Up -> Cable Fly Down), a focus muscle with
   nothing yet goes first, and what you have done comes before what you have
   not. A swapped-in exercise you have done takes your last working sets; one
   new to you starts by feel. Exercises you fixed stay, avoided ones are never
   brought in, and a row with no counterpart left is kept. Checks names each swap. */
const PF_SWAP_STOP=new Set(['incline','decline','flat','up','down','low','high','upper','lower','machine']);
function pfFocusSwap(day,focus,locked=[]){
 const tok=ex=>new Set(canonKey(ex).split(' ').filter(t=>t&&!PF_SWAP_STOP.has(t))),sim=(a,b)=>{const x=tok(a),y=tok(b),n=[...x].filter(t=>y.has(t)).length;return n/Math.max(1,new Set([...x,...y]).size);};
 const done=ex=>!!(SEED.lastSess?.[ex]&&pwLastLine(ex)),warm=l=>/warm|prep/i.test((l.qual||'')+(l.tag||''));
 for(const p of new Set(focus.map(m=>MUSCLE_PART[m]))){
  const ms=focus.filter(m=>MUSCLE_PART[m]===p),have=new Set(pwExercises(day.rows).map(r=>r.ex));
  const pool=pwAllExercises().filter(ex=>homePartOf(ex)===p&&ms.includes(exMuscle(ex,p))&&!isAvoided(ex)&&!pfPrefs().avoid.some(a=>canonKey(a)===canonKey(ex)));
  const count=m=>pwExercises(day.rows).filter(r=>homePartOf(r.ex)===p&&exMuscle(r.ex,p)===m).length;
  day.rows.forEach((r,i)=>{
   if(r.kind!=='ex'||!r.ex||homePartOf(r.ex)!==p||ms.includes(exMuscle(r.ex,p))||locked.includes(pwText([r])))return;
   const cands=pool.filter(ex=>!have.has(ex));if(!cands.length)return;
   const key=ex=>[count(exMuscle(ex,p))?1:0,-sim(r.ex,ex),done(ex)?0:1];
   cands.sort((a,b)=>{const x=key(a),y=key(b);for(let k=0;k<3;k++)if(x[k]!==y[k])return x[k]-y[k];return (SEED.exLast?.[b]||'').localeCompare(SEED.exLast?.[a]||'')||a.localeCompare(b);});
   const ex=cands[0],work=(r.lines||[]).filter(l=>!warm(l)),sets=work.reduce((a,l)=>a+(l.reps||[]).length,0)||3,last=work[work.length-1]?.reps||[10];
   const n=Math.max(1,Math.min(sets,done(ex)?pwTypicalSets(ex):sets,6));
   const row=done(ex)?pwExerciseRow(ex,n):pwRead(`${ex}\n  by feel × ${Array.from({length:n},()=>last[last.length-1]||10).join(' ')}`)[0];
   if(!row||row.kind!=='ex')return;delete row.added;
   (day.notes=day.notes||[]).push(`${ex}: in for ${r.ex} — ${MUSCLE_LABEL[exMuscle(ex,p)]||exMuscle(ex,p)} is this day’s focus`+(done(ex)?'':', new to you, so it starts by feel')+'.');
   day.rows[i]=row;have.add(ex);
  });
 }
}
/* v4.6.193: the stepper's rows, with what it brings in PLACED, not appended: an
   added chest fly goes with the chest work, ahead of the core, where it would
   be done. st.base is the day as the stepping began and st.locks its fixed
   rows as they were then, so the fixed rows follow their exercises. */
function pfAllocate(b,st,target){
 const baseLocks=st.locks||b.locks||[],out=pwAllocateSets({...b,rows:pwCopy(st.base),locks:baseLocks},target);
 const rows=out.filter(r=>!r.added);let locks=baseLocks.slice();
 for(const r of out.filter(r=>r.added)){const idx=pwPlaceIndex(rows,r.ex);rows.splice(idx,0,r);locks=locks.map(i=>i>=idx?i+1:i);}
 b.rows=rows.map(r=>{delete r.added;return r;});b.locks=locks;
}
/* v4.6.197: the exercises the app recommends to close a gap to the set target.
   Mutates day.rows; returns the rows it added. */
function pfRecommend(day,parts,focus,lockedText,goal){
 const added=[],warm=l=>/warm|prep/i.test((l.qual||'')+(l.tag||'')),work=r=>(r.lines||[]).filter(l=>!warm(l)),nWork=r=>work(r).reduce((a,l)=>a+(l.reps||[]).length,0);
 const fl=(typeof WRITER_REP_FLOOR!=='undefined'&&WRITER_REP_FLOOR[pw().objective])||0;
 for(let pass=0;pass<2;pass++){
  const gap=goal-pwSetCount(day.rows);if(gap<=0)break;
  const exs=pwExercises(day.rows),have=new Set(exs.map(r=>r.ex)),free=exs.filter(r=>!lockedText.includes(pwText([r]))&&homePartOf(r.ex)!=='Run');
  if(3-gap>free.reduce((a,r)=>a+Math.max(0,nWork(r)-3),0))break;      /* three more would overshoot and nothing can give */
  const fParts=new Set(focus.map(m=>MUSCLE_PART[m])),strength=parts.filter(p=>p!=='Run');
  const pool=pwAllExercises().filter(ex=>{const p=homePartOf(ex);return strength.includes(p)&&!have.has(ex)&&!isAvoided(ex)&&!pfPrefs().avoid.some(a=>canonKey(a)===canonKey(ex))&&(!fParts.has(p)||focus.includes(exMuscle(ex,p)));});
  if(!pool.length)break;
  const done=ex=>!!(SEED.lastSess?.[ex]&&pwLastLine(ex)),mCount=ex=>exs.filter(r=>exMuscle(r.ex,homePartOf(r.ex))===exMuscle(ex,homePartOf(ex))).length,pCount=p=>exs.filter(r=>homePartOf(r.ex)===p).length;
  /* the part the day covers least first (a day of Chest + Sixpack is short on chest long before core); then the muscle with the least; an isolation lift once the part has two compounds; yours before new */
  const comp=p=>exs.filter(r=>homePartOf(r.ex)===p&&pwTier(r.ex)<2).length,wantIso=ex=>comp(homePartOf(ex))>=2;
  const key=ex=>{const p=homePartOf(ex);return [p==='Sixpack'?1:0,mCount(ex),(pwTier(ex)>=2)===wantIso(ex)?0:1,done(ex)?0:1,pCount(p)];};
  const idx=new Map(pool.map((ex,i)=>[ex,i]));
  pool.sort((x,y)=>{const a=key(x),b=key(y);for(let k=0;k<a.length;k++)if(a[k]!==b[k])return a[k]-b[k];return (SEED.exLast?.[y]||'').localeCompare(SEED.exLast?.[x]||'')||idx.get(x)-idx.get(y);});
  const ex=pool[0],n=3,reps=Math.max(fl,pwTier(ex)>=2?12:10);
  const row=done(ex)?pwExerciseRow(ex,n):pwRead(`${ex}\n  by feel × ${Array.from({length:n},()=>reps).join(' ')}`)[0];
  if(!row||row.kind!=='ex')break;delete row.added;
  day.rows.splice(pwPlaceIndex(day.rows,ex),0,row);added.push(row);
  const m=exMuscle(ex,homePartOf(ex));
  (day.notes=day.notes||[]).push(`${ex}: recommended for ${MUSCLE_LABEL[m]||m||homePartOf(ex)} to reach your ${goal} sets`+(done(ex)?'':' — new to you, so it starts by feel')+'.');
  /* what it overshoots by comes off the exercises carrying the most */
  for(let over=pwSetCount(day.rows)-goal;over>0;over--){
   const big=free.filter(r=>nWork(r)>3).sort((a,b)=>nWork(b)-nWork(a)||pwTier(b.ex)-pwTier(a.ex))[0];if(!big)break;   /* a tie: the accessory gives before the main lift */
   const l=work(big).filter(l=>(l.reps||[]).length>1).pop();if(!l)break;l.reps.pop();
  }
 }
 return added;
}
/* v4.6.201: THE WARM-UP IS YOUR CALL. Some plans came back with a warm-up line
   and some without -- the writer's mood. On: the day's first exercise opens
   with one lighter set (about two thirds of its top weight, on the rack's own
   steps) and no other exercise carries one. Off: none are written. Bodyweight
   and by-feel lines have nothing to scale from and are left alone, and so is
   anything you fixed. */
function pfWarmup(day,on,lockedText=[]){
 const warm=l=>/warm|prep/i.test((l.qual||'')+(l.tag||'')),exs=day.rows.filter(r=>r.kind==='ex'&&r.ex&&homePartOf(r.ex)!=='Run'&&!lockedText.includes(pwText([r])));
 let cut=0;const first=exs[0];
 for(const r of exs){if(on&&r===first)continue;const keep=r.lines.filter(l=>!warm(l));if(keep.length&&keep.length!==r.lines.length){cut+=r.lines.length-keep.length;r.lines=keep;}}
 if(cut&&!on)(day.notes=day.notes||[]).push('Warm-up sets left out: your preference.');
 if(!on||!first||first.lines.some(warm))return;
 const kgL=l=>l.unit==='kg'?l.w:l.unit==='lb'?l.w/LB:toKg(l.w),work=first.lines.filter(l=>!l.nw&&!l.bw&&l.w>0&&(l.reps||[]).length);if(!work.length||isBody(first.ex))return;
 const top=Math.max(...work.map(kgL)),{s:st,a}=wLaw(first.ex),face=a+Math.floor((toU(top*0.67)-a)/st+1e-6)*st;
 if(!(face>0)||toKg(face)>=top-0.3)return;
 const line=pwRead(`${first.ex}\n  ${wDisp(toKg(face))} ${U()} × 10 (warm-up)`)[0]?.lines?.[0];if(!line)return;
 first.lines.unshift(line);(day.notes=day.notes||[]).push(`${first.ex}: warm-up set added at ${wDisp(toKg(face))} ${U()}.`);
}
/* v4.6.207: THE DAY'S CARDIO. A day whose body parts include Cardio gets one
   cardio line, and the app writes it, not the writer: your most recent cardio
   entry, as you logged it (same exercise, same distance and time), never an
   invented number. It goes first when Cardio is the first of the day's parts
   and last otherwise. It has no sets, so it never counts toward the Set
   target. A plan line is cardio by what it names, whatever kind the parser
   gave it. */
function pfIsCardioRow(r){if(!r)return false;if(r.cardio)return true;if(r.kind==='ex'&&(r.lines||[]).some(l=>(l.reps||[]).length))return false;
 const head=String(r.ex||r.name||r.raw||'').split(/\s+[—–-]\s+|\n/)[0].trim();return !!head&&(isCardioEx(head)||(!!r.ex&&isCardioEx(r.ex)));}
function pfCardioLine(){
 for(const d of Object.keys(DB.days||{}).filter(d=>d<=todayISO).sort().reverse())for(const x of [...(DB.days[d].w||[])].reverse())if(x.ex&&isCardioEx(x.ex)&&!(x.reps||[]).length&&(x.km>0||x.min>0))
  return x.ex+' — '+[x.km>0?dDisp(x.km).replace(/\.?0+$/,'')+' '+DU():'',x.min>0?Math.round(x.min)+' min':''].filter(Boolean).join(' · ');
 return 'Run — by feel';}
function pfCardio(day,src){
 const want=!!src.partsPick&&(src.parts||[]).includes('Run'),had=day.rows.some(pfIsCardioRow);if(!want&&!had)return;
 day.rows=day.rows.filter(r=>!pfIsCardioRow(r));
 if(day.notes)day.notes=day.notes.filter(n=>!(/could not be read/.test(n)&&isCardioEx(String(n).split(':')[0].trim())));
 if(!want)return;
 const row={kind:'note',raw:pfCardioLine(),cardio:true};
 if(src.parts[0]==='Run')day.rows.unshift(row);else day.rows.push(row);
}
function pfValidateCandidate(candidate,dates){
 const p=pfPrefs();
 /* v4.6.147: a day the writer added that you did not pick is dropped; a day it
    left out (or left empty) keeps your draft, and the others still arrive. */
 for(const d of Object.keys(candidate.days))if(!dates.includes(d))delete candidate.days[d];
 for(const [date,day] of Object.entries(candidate.days)){
  const avoided=day.rows.filter(r=>r.kind==='ex'&&r.ex&&(exPref(r.ex)==='avoid'||p.avoid.some(ex=>canonKey(ex)===canonKey(r.ex))));   // v4.6.173: by id, so an alias is caught too
  /* v4.6.147: an avoided exercise comes out of the day; the rest of the plan stays */
  if(avoided.length){day.rows=day.rows.filter(r=>!avoided.includes(r));(day.notes=day.notes||[]).push('Removed '+avoided.map(r=>r.ex).join(', ')+': on your avoid list.');}
  /* v4.6.150: body parts you chose on the Edit page are the day. An exercise
     the writer added for another part comes out (yours locked stay); if that
     would leave nothing, the writer's day is kept and the Checks say so. */
  const src=pwDay(date);
  if(candidate.type!=='adjust'&&candidate.type!=='paste'&&src.partsPick&&src.parts.length){
   const keep=new Set((src.locks||[]).map(i=>src.rows[i]?.ex).filter(Boolean)),
     off=day.rows.filter(r=>r.kind==='ex'&&!keep.has(r.ex)&&homePartOf(r.ex)&&!src.parts.includes(homePartOf(r.ex)));
   if(off.length&&pwSetCount(day.rows.filter(r=>!off.includes(r)))){day.rows=day.rows.filter(r=>!off.includes(r));(day.notes=day.notes||[]).push('Removed '+off.map(r=>r.ex).join(', ')+': not in '+src.parts.join(' + ')+'.');}
   else if(off.length)(day.notes=day.notes||[]).push('The writer did not write for '+src.parts.join(' + ')+'; its day is shown as written.');

   /* a set target changed alongside the parts: one Regenerate applies both */
   if(src.target!=null&&pwSetCount(day.rows)!==src.target){const fit=pfFitSets(day.rows,src.target,src.target,(src.locks||[]).map(i=>pwText([src.rows[i]])));day.rows=fit.rows;(day.notes=day.notes||[]).push('Set count fitted to your target: '+fit.from+' → '+fit.to+' sets'+(fit.dropped.length?' (removed '+fit.dropped.join(', ')+')':'')+'.');}
  }
  /* v4.6.183: THE FOCUS LEADS ITS PART, AND THE DAY LANDS ON ITS TARGET. Both are
     arithmetic, so the app does them. Inside each body part's exercises the
     focus muscles' come first, in the writer's order (a day with fixed
     exercises is left in place -- their positions are yours). Then the count:
     the number you set, or your usual for the day's parts. */
  if(candidate.type==='generate'){
   const f=pwFocus({...src,rows:day.rows,parts:src.partsPick&&src.parts.length?src.parts:pwParts(day.rows)});
   if(f.length)pfFocusSwap(day,f,(src.locks||[]).map(i=>pwText([src.rows[i]])));
   for(const p of new Set(f.map(m=>MUSCLE_PART[m]))){
    const rs=day.rows.filter(r=>r.kind==='ex'&&homePartOf(r.ex)===p);
    if(rs.length&&!rs.some(r=>f.includes(exMuscle(r.ex,p))))(day.notes=day.notes||[]).push('The writer wrote no '+f.filter(m=>MUSCLE_PART[m]===p).map(m=>MUSCLE_LABEL[m]||m).join(' or ')+' exercise for this day. Add one with Add exercise, or Regenerate.');
   }
   /* v4.6.193: the day in a sound order (pwTier): the free bar first, then the
      other compound lifts, then isolation and cable work, core last. Inside a
      tier the writer's order stands, a focus muscle's lifts ahead of the rest.
      Exercises you fixed keep their places. */
   {const lockedText=(src.locks||[]).map(i=>pwText([src.rows[i]])),fixed=new Set(day.rows.map((r,i)=>lockedText.includes(pwText([r]))?i:-1).filter(i=>i>=0));
    pwOrderRows(day.rows,fixed,r=>f.includes(exMuscle(r.ex,homePartOf(r.ex)||'')));}
   pfWarmup(day,p.warmup,(src.locks||[]).map(i=>pwText([src.rows[i]])));
   if(src.target!=null&&pwSetCount(day.rows)!==src.target)day.rows=pfFitSets(day.rows,src.target,src.target,(src.locks||[]).map(i=>pwText([src.rows[i]]))).rows;   /* the number you set still holds with the warm-up in it */
   /* v4.6.196: no exercise carries more working sets than five, or than you usually do if that is more */
   {const lockedT=(src.locks||[]).map(i=>pwText([src.rows[i]])),warm=l=>/warm|prep/i.test((l.qual||'')+(l.tag||''));
    for(const r of day.rows){if(r.kind!=='ex'||!r.ex||lockedT.includes(pwText([r]))||homePartOf(r.ex)==='Run')continue;
     const usual=SEED.exSets?.[r.ex]?.length?pwTypicalSets(r.ex):0,cap=usual?(usual>5?usual:Math.max(3,usual)):5;   /* v4.6.198: your usual for THIS exercise (3 to 5, more only if that is your habit); five when there is no record */let n=(r.lines||[]).filter(l=>!warm(l)).reduce((a,l)=>a+(l.reps||[]).length,0);if(n<=cap)continue;const was=n;
     for(let k=r.lines.length-1;k>=0&&n>cap;k--){const l=r.lines[k];if(warm(l))continue;while(l.reps.length>1&&n>cap){l.reps.pop();n--;}}
     if(n<was)(day.notes=day.notes||[]).push(`${r.ex}: ${was} working sets written, kept to ${n}`+(usual&&cap===Math.max(3,usual)&&cap<5?' — your usual':'')+'.');}}
   const mine=!!src.rows.length&&!!pfAuto(src)?.mine,au=pfAutoFor(src.partsPick&&src.parts.length?src.parts:pwParts(day.rows)),goal=src.target!=null?null:mine?pwSetCount(src.rows):au?.total;
   /* v4.6.196: THE COUNT IS REACHED THE WAY + REACHES IT, NOT BY PADDING. Short
      of the target, the day used to get sets piled onto whatever it had (six
      sets of bench, five of dips, to make 17 from three exercises). It now
      goes through pwAllocateSets: each exercise up to your usual working sets
      and no further, then another exercise for the day's parts (a focus
      muscle's first), placed in order. Over the target, sets come off the
      exercise carrying the most. Rows that are not exercises are out first,
      so the count is of real sets. */
   if(goal&&pwSetCount(day.rows)&&pwSetCount(day.rows)!==goal){
    const lockedText=(src.locks||[]).map(i=>pwText([src.rows[i]])),from=pwSetCount(day.rows);
    const exRows=day.rows.filter(r=>r.kind==='ex'&&r.ex&&(r.lines||[]).some(l=>(l.reps||[]).length));
    const tmp={rows:exRows,locks:exRows.map((r,k)=>lockedText.includes(pwText([r]))?k:-1).filter(k=>k>=0),parts:src.partsPick&&src.parts.length?src.parts:pwParts(exRows),focus:f};
    /* your usual is not a reason to stack sets: without a number you set yourself, the day stops at each exercise's usual sets plus what can be added */
    /* in a body part with a focus, what is added is on a focus muscle too -- the swap above just took the others out */
    const fParts=new Set(f.map(m=>MUSCLE_PART[m])),skip=pwAddCandidates(tmp).filter(ex=>{const p=homePartOf(ex);return fParts.has(p)&&!f.includes(exMuscle(ex,p));});
    const lim=pwSetLimits(tmp,skip),eff=mine?goal:Math.min(goal,Math.max(lim.full+lim.extra,lim.min));
    /* v4.6.196: an exercise brought in to fill the count comes with a real block of
       sets or not at all -- one leftover set of Incline Bench is not an exercise */
    const out=pwAllocateSets(tmp,eff,skip),rows=out.filter(r=>!r.added),added=out.filter(r=>r.added&&pwSetCount([r])>=Math.min(3,pwTypicalSets(r.ex)));
    for(const r of added){rows.splice(pwPlaceIndex(rows,r.ex),0,r);delete r.added;}
    day.rows=rows;
    /* v4.6.197: SHORT OF THE TARGET, THE APP RECOMMENDS. The day used to stop
       ("holds 16 sets; the target is 17") when the record had nothing left to
       add in full. A coach would add a movement: one more exercise for the
       muscle the day covers least (a focus muscle where there is a focus),
       yours first, then one you have not done, by feel; never one you avoid.
       It comes in as a block of three, and the sets it overshoots by come off
       the exercises carrying the most, never below three. */
    for(const rec of pfRecommend(day,tmp.parts,f,lockedText,goal))added.push(rec);
    const to=pwSetCount(day.rows);
    if(to!==from)(day.notes=day.notes||[]).push('Set count '+(mine?'fitted to your target':au?.range&&to<from?'kept to your limit of '+au.range:'fitted to your usual')+': '+from+' → '+to+' sets'+(added.length?' (added '+added.map(r=>r.ex).join(', ')+')':'')+'.');
    if(to!==goal)(day.notes=day.notes||[]).push('The day holds '+to+' sets at your usual sets per exercise; the target is '+goal+'. Add an exercise, or use + to go past it.');
   }
   pfCardio(day,src);
   /* v4.6.197: what the app brought in itself meets the rep floor the same way
      the writer's lines do: from the record, lowering the load when it has to */
   {const fl=(typeof WRITER_REP_FLOOR!=='undefined'&&WRITER_REP_FLOOR[pw().objective])||0,lockedT=(src.locks||[]).map(i=>pwText([src.rows[i]]));
    if(fl)for(const r of day.rows){if(r.kind!=='ex'||!r.ex||lockedT.includes(pwText([r])))continue;
     const fit=writerFloorFit(r.ex,r.lines,fl,pw().objective);r.lines=fit.lines;for(const n of fit.notes)if(!(day.notes=day.notes||[]).includes(n))day.notes.push(n);}}
   /* a Check that counted reps before the sets were fitted no longer describes the day */
   if(day.notes)day.notes=day.notes.filter(n=>{const m=/^(.+): same .+ for (\d+) total reps, under your last (\d+)/.exec(n);if(!m)return true;const r=day.rows.find(x=>x.ex===m[1]);
    return !r||r.lines.filter(l=>!/warm|prep/i.test((l.qual||'')+(l.tag||''))).reduce((a,l)=>a+l.reps.reduce((x,y)=>x+y,0),0)===+m[2];});
  }
  const total=pwSetCount(day.rows);
  if(!total&&!day.rows.some(pfIsCardioRow)){delete candidate.days[date];continue;}
  if(candidate.type!=='adjust'&&p.mode==='limit'&&total>p.maxSets){
   /* v4.6.147: a writer answer a few sets outside the range used to throw away
      the WHOLE draft ("outside your 15-25 set range. Your draft is
      unchanged."), leaving the maker with nothing for any of the dates. The
      range is arithmetic, so the app does it: working sets come off the
      exercise with the most (each keeps one) or go on the one with the fewest
      (repeating its last set), warm-ups and locked exercises untouched, and
      the day's Checks say what moved. Only a day that cannot fit (more
      exercises than the maximum) is still refused. */
   /* v4.6.147 (maker): the plan is what was asked for, so nothing here refuses.
      If one working set each is still too many, whole exercises go (last first);
      only exercises you locked yourself are kept even past the maximum. */
   const fit=pfFitSets(day.rows,1,p.maxSets,(pwDay(date).locks||[]).map(i=>pwText([pwDay(date).rows[i]])));
   day.rows=fit.rows;(day.notes=day.notes||[]).push('Set count kept to your limit of '+p.maxSets+': '+fit.from+' → '+fit.to+' sets'+(fit.dropped.length?' (removed '+fit.dropped.join(', ')+')':'')+'.');
  }
 }
 candidate.missing=dates.filter(d=>!candidate.days[d]).sort();
 if(!Object.keys(candidate.days).length)throw Error('The writer did not return a usable plan. Your draft is unchanged. Tap Plan to try again.');
}
/* v4.6.212: REMOVE PLAN REMOVES IT, THERE AND THEN. It used to only mark the
   day "to be removed when you save" and drop it from the selection -- but its
   draft stayed in the book, so the calendar still drew the Draft pencil, and
   with the day no longer selected there was no Save that would carry the
   removal out. Now the saved plan and the draft for that day both go at once,
   and the toast offers Undo. The log is never touched. */
function pfRemoveDayNow(d){const s=pw(),j=pfState();if(!d)return;const at=Date.now(),snap={week:pwCopy(DB.week||null),plan:pwCopy(DB.plan||null),book:s.book&&s.book[d]?pwCopy(s.book[d]):null};
 if(pwSaved(d)){const days=pwCopy(DB.week?.days||{});delete days[d];if(DB.plan?.d===d){DB.plan=null;DB.planAt=at;}const all=Object.keys(days).sort();DB.week=all.length?{from:all[0],to:all.at(-1),days,raw:'',at}:null;DB.weekAt=at;planRailRefresh();save(true);}
 if(s.book)delete s.book[d];s.dates=s.dates.filter(x=>x!==d);j.anchor=(j.anchor||[]).filter(x=>x!==d);j.removed=(j.removed||[]).filter(x=>x.date!==d);if(j.open)delete j.open[d];s.active=s.dates[0]||null;j.clear=false;pwPersist();pfNavigate('days');
 toastUndo('Plan removed · '+pfShort(d),()=>{const t=Date.now();DB.week=snap.week;DB.weekAt=t;if(snap.plan&&snap.plan.d===d){DB.plan=snap.plan;DB.planAt=t;}if(snap.book){pw().book=pw().book||{};pw().book[d]=snap.book;}planRailRefresh();save(true);pwPersist();pwRender();});}
function pfSaveButton(){return pwButton('pf-save',pw().dates.length?`Save ${pw().dates.length} ${pw().dates.length===1?'day':'days'}`:'Save changes','primary',(!pw().dates.length&&!pfState().removed.length)||pfPending()?'disabled':'');}
function pfDoneHTML(){
 const j=pfState(),saved=j.saved||[],planned=saved.filter(x=>x.sets),all=planned.length&&planned.every(x=>j.doneOpen?.[x.date]);
 return `<div class="pf-done"><div class="pf-done-tools"><span>${planned.length} ${planned.length===1?'day':'days'} saved</span>${planned.length?pwButton('pf-done-expand',icon(all?'collapse':'expand',ICON_SZ.sm)+(all?' Collapse All':' Expand All'),'pw-text'):''}</div>${saved.map(x=>{
  const rows=x.rows||pwRead(planText(pwSaved(x.date))),count=pwExercises(rows).length;
  return `<section class="pf-day pf-done-day"><div class="pf-day-date">${hesc(pfShort(x.date))}</div><div class="card">${x.sets?`<details data-pf-saved-fold="${x.date}" ${j.doneOpen?.[x.date]?'open':''}><summary><span class="pf-done-label"><strong>${hesc(x.parts.join(' + ')||'Workout')}</strong><span>${x.sets} sets · ${count} exercises</span></span></summary>${pfRoutine(rows)}</details>`:'<div class="pf-no-plan">No plan</div>'}</div></section>`;
 }).join('')}</div>`;
}
function pfRender(){pfTrackScreen();renderHeader();pfSplitFill();requestAnimationFrame(pfPalTop);if(document.getElementById('pfPick')&&pfState().page!=='prefs')pfPickClose(true);const s=pw(),j=pfState(),panel=['paste','editrow','adjust','candidate','busy'].includes(s.step)&&!(s.step==='busy'&&j.page==='dates');if(panel){pfLegacy.render();const box=document.querySelector('.pw-workspace');if(box){box.classList.add('pf-workspace');box.querySelector('.pw-editor-head')?.remove();box.insertAdjacentHTML('afterbegin',pfStepbar());if(s.step==='paste'&&!s.editAll)box.querySelector('.pw-input-panel')?.insertAdjacentHTML('beforeend',`<label class="pw-small"><input type="checkbox" data-pf-paste-all ${j.pasteAll?'checked':''}> Use this routine for all selected days</label>`);}return;}let body='',footer='',heading={dates:'Choose your dates',prefs:'Your preferences',days:'Edit your plan',edit:'Edit your routine',done:'Your dates are updated'}[j.page];
 if(j.page==='prefs'){body=pfPrefHTML();footer=pwButton('pf-prefs-save','Save preferences','primary');}
 else if(j.page==='dates'){body=pfCalendar();footer=pfDateFooter();}
 else if(j.page==='days'){body=pfDaysHTML();footer='<div class="pf-primary-row">'+pwButton('pf-edit-first','Edit first day →','primary',s.dates.length?'':'disabled')+pfSaveButton()+'</div><p class="pw-small">Saves every routine above to its date.</p>';}
 else if(j.page==='edit'&&s.active){body=pfDayHTML();const dirty=pfDirtyDates().length;footer='<div class="pf-compact-save"><div><strong>'+s.dates.length+' planned '+(s.dates.length===1?'day':'days')+'</strong><p>'+(dirty?dirty+(dirty===1?' day has':' days have')+' unsaved changes.':'Everything here is saved.')+'</p></div>'+pwAction('pf-save','Save','check','primary',pfPending()?'disabled':'')+'</div>';}
 else if(j.page==='done'){body=pfDoneHTML();footer=pwButton('close','Plans saved · Done','primary');}
 if(j.clear){body=`<div class="card pf-ask" role="alert"><h3>Remove the plan for ${hesc(pfShort(s.active))}?</h3><p class="pf-ask-note">Your logged workouts stay.</p><div class="pf-conflict-actions">${pwButton('pf-clear-cancel','Cancel')}${pwButton('pf-remove-day','Remove plan','primary')}</div></div>`;footer='';}
 if(j.emptyConfirm){const empty=pfDates().filter(d=>!pwSetCount(pwDay(d).rows)),valid=s.dates.length-empty.length;body=`<div class="card" role="alert"><h3>Empty days won’t be saved</h3>${empty.map(d=>`<p><strong>${hesc(pwDate(d))}</strong><br>0 planned sets · No plan</p>`).join('')}<p class="pw-small">These dates will become No plan. Any existing saved plan on these dates will be removed. Logged workouts stay untouched.</p>${pwButton('pf-confirm-save',valid?'Save '+valid+' days & clear empty days':'Set dates to No plan','primary')}${pwButton('pf-clear-cancel','Back to editing')}</div>`;footer='';}
 if(s.conflict){body=`<div class="card" role="alert"><h3>Newer plan · ${hesc(pwDate(s.conflict))}</h3>${pfRoutine(pwRead(planText(pwSaved(s.conflict))))}<div class="pf-conflict-actions">${pwButton('load-newer','Use newer plan')}${pwButton('replace-newer','Keep my draft')}</div></div>`;footer='';}
 $('#view').innerHTML=pwFoldMarkup(`<section class="pw-workspace pf-workspace${j.page==='dates'?' pf-dates-page':j.page==='edit'?' pf-routine-page':j.page==='days'?' pf-overview-page':''}" aria-label="Planning workspace">${j.prefOrigin==='settings'&&j.page==='prefs'?'':pfStepbar()}${s.error?`<p class="pw-message" role="alert">${hesc(s.error)}</p>`:''}${body}<span id="pw-reorder-help" class="pw-sr-only">Drag or use arrow keys to reorder.</span><span id="pw-reorder-status" role="status" class="pw-sr-only"></span>${footer?`<div class="pw-save-dock pf-dock">${footer}</div>`:''}</section>`);if(s.busy)document.querySelectorAll('.pf-date-sheet button,.pf-steps button').forEach(b=>b.disabled=true);pfPlayMotion();requestAnimationFrame(pwPositionDock);pfFocusChip();
}
pwRender=function(){return pfOn()?pfRender():pfLegacy.render();};
/* v4.6.201: THE DATES STEP OPENS ON YOUR WEEK. With nothing selected, the
   planner used to open on one day. If you have said which weekdays you train,
   it opens with those picked across the next seven days, from the day it
   would have opened on. */
function pfPickTrainDays(){const s=pw(),t=pfPrefs().trainDays;if(!t||!t.length||!s.active)return;const out=[],d0=new Date(s.active+'T12:00');
 for(let k=0;k<7;k++){const d=new Date(d0);d.setDate(d0.getDate()+k);if(t.includes(d.getDay()))out.push(d.toLocaleDateString('en-CA'));}
 if(!out.length)return;s.dates=out;s.active=out[0];s.month=out[0].slice(0,7)+'-01';out.forEach(x=>pwDay(x));}
pwOpen=function(d,step){if(!pfOn())return pfLegacy.open(d,step);const s=pw(),j=pfState();j.history=[];j.lastScreen=null;j.returnView=view==='sync'?'sync':'today';if(s.busy){pwRequest++;lift.writeAbort?.abort();s.busy=false;}if(d){s.dates=[d];s.active=d;s.month=d.slice(0,7)+'-01';pwDay(d);}else{const had=s.dates.some(x=>x>=todayISO);pwFreshenDates();if(!had)pfPickTrainDays();}/* v4.6.61: same rule as the legacy open, from the same helper */j.page=step==='dates'?'dates':d&&pwSaved(d)?'edit':d?'dates':j.page;j.prefOrigin=null;if(d&&pwSaved(d))pfAnchor();lift.plan='workspace';view='today';s.step='edit';pwPersist();render({soft:true});};
pwApply=function(add=false){if(!pfOn())return pfLegacy.apply(add);const c=pw().candidate;if(!c)return;const generated=c.type==='generate',adjust=c.type==='adjust';if(c.type==='paste'&&c.index===undefined&&pfState().pasteAll){const one=Object.values(c.days)[0];c.days=Object.fromEntries(pfDates().map(d=>[d,pwCopy(one)]));}pfLegacy.apply(add);for(const d of Object.keys(c.days)){pwDay(d).target=null;}pfAnchor();pfMotion={kind:'arrive'};pfNavigate(generated?'days':'edit');};
pwPayload=function(dates,action){const p=pfLegacy.payload(dates,action);if(!pfOn())return p;const prefs=pfPrefs();p.workspace.preferences=prefs;
 /* v4.6.183: the day's focus muscles and its set target go to the writer as
    their own fields, per date -- said outright, like payload.avoid, not left
    for it to infer from a note. usual_sets is every part's usual, for days
    whose parts the writer chooses itself. */
 for(const x of p.workspace.schedule){const f=pfFocus(pwDay(x.date));if(f.length)x.focus=f.map(m=>({part:MUSCLE_PART[m],muscle:m}));}
 if(action==='generate')for(const x of p.workspace.drafts){const b=pwDay(x.date),a=pfAuto(b);if(a?.target&&b.target==null)x.target_total_sets=a.target;}
 p.workspace.usual_sets=Object.fromEntries(pfPartList().filter(x=>x!=='Run').map(x=>[x,pwUsualSets(x)]).filter(x=>x[1]!=null));
 p.note=[p.note,'Planning preferences: '+JSON.stringify({size:prefs.mode==='limit'?{max_sets:prefs.maxSets}:'auto',warm_up:prefs.warmup,avoid:prefs.avoid}),"Respect avoided exercises: leave them out; when one would have been chosen, pick another exercise for the same muscle. Prefer the exercises the person returns to most (their Go-to) when choosing between options. Only generate the explicitly selected dates. Write only for the body parts set for each date: do not add core, or any other part, on your own. Do not write cardio lines, even for a date whose parts include Run: the app adds that day's cardio itself.",prefs.warmup?'Open each day with ONE lighter warm-up line on its first exercise (about two thirds of the working weight, marked "(warm-up)"); no other warm-up lines.':'Do not write warm-up lines.',prefs.mode==='limit'?`Each selected day must total at most ${prefs.maxSets} sets, counting every set including warm-ups.`:''].filter(Boolean).join('\n');return p;};
function pfMoveDay(from,to){const ds=pfDates(),a=ds.indexOf(from),b=ds.indexOf(to);if(a<0||b<0||a===b)return;const bundles=ds.map(d=>pwCopy(pwDay(d))),[moved]=bundles.splice(a,1);bundles.splice(b,0,moved);ds.forEach((d,i)=>{const old=pwDay(d);pw().book[d]={...bundles[i],base:old.base,source:'Your draft'};});pwPersist();pwRender();}
function pfSave(confirm=false){const s=pw(),j=pfState();if(!pfMatch())throw Error('Restore the editing dates, or generate a new draft first.');if(pfPending())throw Error('Regenerate the changed total sets before saving.');const empty=s.dates.filter(d=>!pwSetCount(pwDay(d).rows));if(empty.length&&!confirm){j.emptyConfirm=true;pwRender();return;}
 const dates=[...new Set([...s.dates,...j.removed.map(x=>x.date)])];if(!dates.length)throw Error('Choose at least one date.');
 for(const d of dates){if(d<todayISO)throw Error('A draft date has passed. Choose today or a future date.');const base=j.removed.find(x=>x.date===d)?.base??pwDay(d).base;if(base!==pwFingerprint(d)){s.conflict=d;throw Error(`${pwDate(d)} changed on another device. Review it before saving.`);}}
 const days=pwCopy(DB.week?.days||{}),at=Date.now();j.saved=dates.map(d=>({date:d,sets:j.removed.some(x=>x.date===d)?0:pwSetCount(pwDay(d).rows),parts:pwParts(pwDay(d).rows),rows:pwCopy(pwDay(d).rows)}));
 for(const d of dates){const remove=empty.includes(d)||j.removed.some(x=>x.date===d);if(remove){delete days[d];if(DB.plan?.d===d){DB.plan=null;DB.planAt=at;}}else{const b=pwDay(d),doc={...planItemsFrom(b.rows),raw:pwText(b.rows),title:pwParts(b.rows).join(' + ')};days[d]=doc;if(DB.plan?.d===d){DB.plan={d,...doc};DB.planAt=at;}}}
 const all=Object.keys(days).sort();DB.week=all.length?{from:all[0],to:all.at(-1),days,raw:'',at}:null;DB.weekAt=at;planRailRefresh();save(true);for(const d of s.dates){const b=pwDay(d);b.base=pwFingerprint(d);b.source='Saved plan';delete b.undo;delete b.strip;}j.removed=[];j.furthest=3;j.emptyConfirm=false;pfNavigate('done');
}
pwSave=function(){return pfOn()?pfSave():pfLegacy.save();};
function pfHandle(a,el){const s=pw(),j=pfState(),d=el.dataset.date,i=+el.dataset.index,b=s.active?pwDay(s.active):null;
 if(a==='pf-settings'){j.history=[];j.lastScreen=null;j.returnView='sync';j.prefOrigin='settings';j.prefs=pfStagePrefs();lift.plan='workspace';view='today';pfNavigate('prefs');return;}
 if(a==='pf-prefs'){j.prefOrigin=j.page;j.prefs=pfStagePrefs();pfNavigate('prefs');return;}
 if(a==='pf-move'){j.move={delta:1};pfRender();return;}
 if(a==='pf-move-step'){if(!j.move)return;j.move.delta+=+el.dataset.delta;if(j.move.delta===0)j.move.delta+=+el.dataset.delta;pfRender();return;}
 if(a==='pf-move-cancel'){j.move=null;pfRender();return;}
 if(a==='pf-move-go'){if(!j.move)return;const r=planShift(pfDateKinds().saved,j.move.delta);if(!r.ok)return;j.move=null;pfRender();toastUndo('Moved '+r.moves.length+(r.moves.length===1?' plan':' plans'),()=>{r.undo();pfRender();});return;}
 if(a==='pf-leave'){pfLeave();return;}
 if(a==='pf-back'){pfBack();return;}
 if(a==='pf-stage'){j.prefOrigin=null;const n=+el.dataset.stage;if(n===2&&pfSavedSelection()){s.dates.forEach(d=>pwDay(d));if(!s.dates.includes(s.active))s.active=pfDates()[0];pfAnchor();}else if(n>j.furthest||n>=2&&!pfMatch())return;if(n===0&&j.page!=='prefs')j.prefs=null;   /* v4.6.205: coming back to Preferences starts from what is saved, not from a copy left behind */
  pfNavigate(['prefs','dates','days','done'][n]);return;}
 if(a.startsWith('pf-')&&['pf-goal','pf-weekstart','pf-trainday','pf-size','pf-warmup','pf-unavoid','pf-unhold','pf-prefs-save','pf-split','pf-rot-put','pf-rot-x','pf-rot-remove','pf-rot-add','pf-rot-sel','pf-rot-unsel','pf-rot-fill','pf-rot-undo','pf-mypart','pf-xpick-open'].includes(a)&&!(j.prefs&&j.prefs.avoidAdd&&j.prefs.trainDays&&j.prefs.rotation&&j.prefs.parts))j.prefs=pfStagePrefs();
 /* v4.6.202: THE SWITCHES MOVE. Every tap on this page re-rendered it, so a
    toggle jumped from one state to the other: there was no element left to
    animate. These five now change the staged copy and patch the page in place
    (pfPrefPatch), so the thumb slides and the colours cross-fade. */
 if(['pf-goal','pf-weekstart','pf-trainday','pf-size','pf-warmup'].includes(a)){const p=j.prefs,v=el.dataset.value;
  if(a==='pf-goal')p.goal=v;else if(a==='pf-weekstart')p.weekStart=v==='monday'?'monday':'sunday';
  else if(a==='pf-trainday'){const n=+v,t=p.trainDays;p.trainDays=t.includes(n)?t.filter(x=>x!==n):[...t,n].sort();}
  else if(a==='pf-size')p.mode=v==='limit'?'limit':'auto';else p.warmup=!p.warmup;
  pwPersist();if(!pfPrefPatch())pwRender();else if(a==='pf-trainday'||a==='pf-weekstart')pfSplitRefresh();return;}
 if(a==='pf-xpick-open'){j.pick={kind:el.dataset.kind==='hold'?'hold':'avoid',part:null,q:'',sel:[]};pfPickMount();return;}
 if(a==='pf-xpick-close'){pfPickClose();return;}
 if(a.startsWith('pf-xpick-')){const k=j.pick,h=document.getElementById('pfPick');if(!k||!j.prefs||!h){pfPickClose(true);return;}
  if(a==='pf-xpick-part'){k.part=el.dataset.part;if(k.q){k.q='';const inp=h.querySelector('[data-pf-pick-q]');if(inp)inp.value='';}pfPickRefreshList();}
  else if(a==='pf-xpick-toggle'){const ex=el.dataset.ex,same=x=>canonKey(x)===canonKey(ex);if(pfShown(j.prefs,k.kind).some(same))return;const at=k.sel.findIndex(same);if(at>=0)k.sel.splice(at,1);else k.sel.push(ex);
   el.classList.toggle('on',at<0);el.setAttribute('aria-checked',at<0);const go=h.querySelector('.pf-pick-go');go.textContent=pfPickGoText();go.disabled=!k.sel.length;}
  else if(a==='pf-xpick-go'){if(!k.sel.length)return;for(const ex of k.sel)pfListEdit(j.prefs,k.kind,ex,true);pfPickClose();pwPersist();pwRender();}
  return;}
 /* v4.6.204: a body part switched off leaves the split too: a preset is rebuilt from what is left, your own sessions lose that part (and a session left with nothing goes) */
 if(a==='pf-mypart'){const p=j.prefs,t=el.dataset.part,r=p.rotation;if(p.parts.includes(t)){if(p.parts.length<=1)return;p.parts=p.parts.filter(x=>x!==t);}else p.parts=BODY_PARTS.filter(x=>x===t||p.parts.includes(x));
  if(r.preset&&r.preset!=='own')r.sessions=pfRotPreset(r.preset,p.parts);else if(r.preset==='own'){r.sessions=r.sessions.map(x=>({...x,parts:x.parts.filter(z=>z==='Run'||p.parts.includes(z))})).filter(x=>x.parts.length);r.own=pwCopy(r.sessions);if(!r.sessions.length){r.preset=null;r.own=null;}}
  if(r.own)r.own=r.own.map(x=>({...x,parts:x.parts.filter(z=>z==='Run'||p.parts.includes(z))})).filter(x=>x.parts.length);j.rotHeld=null;
  pwPersist();const live=document.querySelector('.pf-workspace .pf-prefs .pf-myparts');if(!live){pwRender();return;}
  live.querySelectorAll('.pf-mypart').forEach(e=>{const on=p.parts.includes(e.dataset.part);e.classList.toggle('on',on);e.setAttribute('aria-pressed',on);});if(!pfSplitRefresh())pwRender();return;}
 if(['pf-split','pf-rot-put','pf-rot-x','pf-rot-remove','pf-rot-add','pf-rot-sel','pf-rot-unsel','pf-rot-fill','pf-rot-undo'].includes(a)){const r=j.prefs.rotation,v=el.dataset.value;j.rotSel=j.rotSel||[];
  if(a==='pf-split'){if(r.preset==='own')r.own=pwCopy(r.sessions);if(v==='none'||(r.preset===v&&v!=='own')){r.preset=null;r.sessions=[];}else{r.preset=v;r.sessions=v==='own'?(r.own&&r.own.length?pwCopy(r.own):[{name:'',parts:[]}]):pfRotPreset(v,j.prefs.parts);}j.rotHeld=null;j.rotSel=[];j.rotUndo=null;j.rotMsg='';}
  /* v4.6.209: SELECT THE SESSIONS, THEN TAP THE PARTS. Chip-first placed one part in one session at a time; Cardio in six sessions was six taps after the pick-up. A session's number selects it (any number of them), and a body part tapped in the strip then goes into every selected session -- or, when they all have it, comes out of them all. */
  else if(a==='pf-rot-sel'){j.rotHeld=null;j.rotSel=j.rotSel.includes(i)?j.rotSel.filter(x=>x!==i):[...j.rotSel,i].sort((x,y)=>x-y);}
  else if(a==='pf-rot-unsel')j.rotSel=[];
  else if(a==='pf-rot-fill'){const before={preset:r.preset,sessions:pwCopy(r.sessions),own:r.own?pwCopy(r.own):null},f=pfRotAutoFill(j.prefs);if(f&&f.sessions.length){r.sessions=f.sessions;pfRotTouch(r);j.rotUndo=before;j.rotMsg=f.msg;j.rotSel=[];j.rotHeld=null;}}
  else if(a==='pf-rot-undo'){if(j.rotUndo){r.preset=j.rotUndo.preset;r.sessions=j.rotUndo.sessions;r.own=j.rotUndo.own;}j.rotUndo=null;j.rotMsg='';j.rotSel=[];}
  else if(a==='pf-rot-put'){if(j.rotHeld)pfRotPut(r,i,j.rotHeld);}
  else if(a==='pf-rot-x'){if(j.rotHeld)pfRotPut(r,i,j.rotHeld);else pfRotTake(r,i,+el.dataset.k);}   /* while a chip is held, a tap anywhere in a session places it: it never lands on an x and takes something out */
  else if(a==='pf-rot-remove'){r.sessions.splice(i,1);pfRotTouch(r);j.rotSel=[];if(!r.sessions.length){r.preset=null;r.own=null;}}
  else{r.sessions.push({name:'',parts:[]});pfRotTouch(r);}
  pwPersist();if(!pfSplitRefresh())pwRender();return;}
 if(false){}
 else if(a==='pf-unavoid'){const ex=pfShown(j.prefs,'avoid')[i];if(ex)pfListEdit(j.prefs,'avoid',ex,false);}
 else if(a==='pf-unhold'){const ex=pfShown(j.prefs,'hold')[i];if(ex)pfListEdit(j.prefs,'hold',ex,false);}
 else if(a==='pf-prefs-save'){const p=j.prefs;if(!p||(p.mode==='limit'&&(!Number.isInteger(p.maxSets)||p.maxSets<1||p.maxSets>100)))throw Error('Use a whole number of sets from 1 to 100.');
  for(const n of p.avoidDel)setExPref(n,null);for(const n of p.avoidAdd)if(exPref(n)!=='avoid')setExPref(n,'avoid');
  for(const n of p.holdDel)setExHold(n,false);for(const n of p.holdAdd)if(!isHeld(n))setExHold(n,true);
  s.objective=p.goal;DB.settings.objective=p.goal;DB.settings.weekStart=p.weekStart;
  if(p.parts&&p.parts.length)DB.settings.myParts=p.parts.slice();
  const {goal:_g,weekStart:_w,parts:_p,avoidAdd:_a,avoidDel:_b,holdAdd:_c,holdDel:_d,hold:_h,...keep}=p;keep.avoid=exPrefNames('avoid');   /* the legacy copy says what the one source says */keep.rotation=pfRotClean(p.rotation);{const own=pfRotClean({preset:'own',sessions:(p.rotation&&(p.rotation.preset==='own'?p.rotation.sessions:p.rotation.own))||[]});keep.rotOwn=own?own.sessions:[];}   /* v4.6.209: your own sessions are kept behind a preset or No split, so My own brings them back */
  DB.settings.plannerPreferences=pwCopy(keep);DB.settingsAt=Date.now();save(true);j.prefs=null;if(j.prefOrigin==='settings'){j.prefOrigin=null;lift.plan=null;view='sync';render();return;}pfNavigate(j.prefOrigin||'dates');return;}
 else if(a==='pf-dates'){pfNavigate('dates');return;}
 /* v4.6.200: UNSELECT ALL. Six days picked meant six taps to start over. One
    control clears the selection, exactly as tapping each day off would:
    saved plans and drafts are not touched, only which days are picked. */
 else if(a==='pf-unselect'){if(!s.dates.length)return;s.dates=[];s.active=null;pwPersist();pwRender();return;}
 else if(a==='pf-resume-drafts'){if(!pfSelectSubset(pfDateKinds().drafts))return;pfAnchor();pfMotion={kind:'arrive'};pfNavigate('days');return;}
 else if(a==='pf-edit-selected'){if(!pfSelectSubset(pfDateKinds().saved))return;pfAnchor();pfMotion={kind:'arrive'};pfNavigate('days');return;}
 else if(a==='pf-generate'){if(!s.dates.length)return;if(el.dataset.subset==='fresh'&&!pfSelectSubset(pfDateKinds().fresh))return;j.anchorBefore=pwCopy(j.anchor);pwGenerate();return;}
 else if(a==='pf-paste-dates'){if(!s.dates.length)return;s.active=s.dates[0];s.editIndex=undefined;s.pasteText='';s.step='paste';}
 else if(a==='pf-expand'){j.open=j.open||{};const open=!s.dates.every(x=>j.open[x]);s.dates.forEach(x=>j.open[x]=open);}
 else if(a==='pf-done-expand'){j.doneOpen=j.doneOpen||{};const dates=(j.saved||[]).filter(x=>x.sets).map(x=>x.date),open=!dates.every(d=>j.doneOpen[d]);dates.forEach(d=>j.doneOpen[d]=open);}
 else if(a==='pf-pick-day'){
  if(!d||d===s.active)return;                 // the day you are on: nothing moves
  pfChipClose(true);                          // an open rep chip commits before the day goes
  s.active=d;j.group=null;s.error='';pwPersist();pfSwapDay();return;
 }
 else if(a==='pf-edit-day'||a==='pf-edit-first'){s.active=d||pfDates()[0];pfMotion={kind:'arrive'};pfNavigate('edit');return;}
 else if(a==='pf-row-toggle'){pfChipClose(true);j.routineOpen=j.routineOpen||{};const open=j.routineOpen[s.active]||(j.routineOpen[s.active]={});open[i]=!open[i];}
 else if(['pf-chip','pf-add-rep','pf-del-line','pf-add-line','pf-remove-ex','pf-xp-swap','pf-xp-undo','pf-xp-avoid','pf-xp-include'].includes(a)){if(!b)return;pfRoutineHandle(a,el,b,j);}
 else if(a==='pf-clear'){j.clear=true;}
 else if(a==='pf-clear-cancel'){j.clear=false;j.emptyConfirm=false;}
 else if(a==='pf-empty-day'){pwUndoPoint(b);b.rows=[];b.parts=[];delete b.partsPick;b.locks=[];b.target=null;b.cleared=true;b.source='Your draft';j.clear=false;}
 else if(a==='pf-remove-day'){pfRemoveDayNow(s.active);return;}
 /* v4.6.157: Set target changes the routine LIVE, by the same rule as Total sets
    (pwAllocateSets): each exercise to your usual working sets, then the day's
    most recent exercise not in the plan. It used to only set a number for
    Regenerate. The rows it started from are kept per day, so - takes the added
    exercises away first; any other edit to the day starts a fresh base. */
 else if(a==='pf-plus'||a==='pf-minus'){
  j.stepBase=j.stepBase||{};let st=j.stepBase[s.active];
  if(!st||JSON.stringify(st.out)!==JSON.stringify(b.rows)){pwUndoPoint(b);st={base:pwCopy(b.rows),locks:(b.locks||[]).slice()};}
  pfAllocate(b,st,pwSetCount(b.rows)+(a==='pf-plus'?1:-1));
  b.target=null;b.source='Your draft';st.out=pwCopy(b.rows);j.stepBase[s.active]=st;
  /* v4.6.183: stepping away from the auto number makes the count yours */
  const au=pfAutoFor(pfPartsSel(b));b.setsMine=!!au&&au.total!=null&&pwSetCount(b.rows)!==au.total;}
 /* v4.6.183: Back to auto. The day's rows go to your usual total by the same
    rule as + and - (when the day is waiting on Regenerate, only the number
    changes: Regenerate builds to it). */
 else if(a==='pf-auto'){delete b.setsMine;const au=pfAutoFor(pfPartsSel(b));
  if(au&&au.total!=null&&b.rows.length&&!pfPartsPending(b)&&pwSetCount(b.rows)!==au.total){const st=j.stepBase?.[s.active],same=st&&JSON.stringify(st.out)===JSON.stringify(b.rows);pwUndoPoint(b);
   /* from the rows the stepping started at, so an exercise + brought in leaves again */
   pfAllocate(b,same?st:{base:pwCopy(b.rows),locks:(b.locks||[]).slice()},au.total);b.target=null;b.source='Your draft';if(same)st.out=pwCopy(b.rows);else delete j.stepBase?.[s.active];
   if(pwSetCount(b.rows)!==au.total)toast('This day’s exercises reach '+pwSetCount(b.rows)+' sets; Regenerate builds to '+au.total+'.');}}
 else if(a==='pf-part'){const p=el.dataset.part,cur=pfPartsSel(b);b.parts=cur.includes(p)?cur.filter(v=>v!==p):[...cur,p];b.partsPick=true;delete b.splitFill;
  /* v4.6.183: the count follows the body parts again, and a focus leaves with its part */
  delete b.setsMine;if(b.focus?.length){b.focus=b.focus.filter(m=>b.parts.includes(MUSCLE_PART[m]));b.focusPick=true;}}
 else if(a==='pf-focus'){const m=el.dataset.muscle,cur=pfFocus(b);b.focus=cur.includes(m)?cur.filter(v=>v!==m):[...cur,m];b.focusPick=true;}
 else if(a==='pf-regenerate'){pwGenerate(!pfPartsPending(b)&&!pfFocusPending(b)&&b.target!=null&&b.target!==pwSetCount(b.rows),true);return;}
 else if(a==='pf-save'||a==='pf-confirm-save'){pfSave(a==='pf-confirm-save');return;}
 pwPersist();pwRender();
}
pwHandle=function(e){if(e.target.closest('[data-pw="pf-settings"]')){pfHandle('pf-settings',e.target.closest('[data-pw]'));return true;}if(!pfOn())return pfLegacy.handle(e);const el=e.target.closest('[data-pw]');if(!el)return false;const a=el.dataset.pw,s=pw(),j=pfState();try{if(s.busy&&a!=='pf-back'&&a!=='pf-leave')return true;if(a==='date'||a==='month')pfMotion={kind:a,date:el.dataset.date,dir:+el.dataset.delta||1,before:s.dates.length};if(a.startsWith('pf-')){pfHandle(a,el);return true;}if(a==='date'){const result=pfLegacy.handle(e);j.removed=j.removed.filter(x=>!s.dates.includes(x.date));pwPersist();return result;}if(a==='load-newer'||a==='replace-newer'){const d=s.conflict,result=pfLegacy.handle(e);if(d){if(a==='load-newer')j.removed=j.removed.filter(x=>x.date!==d);else j.removed.forEach(x=>{if(x.date===d)x.base=pwFingerprint(d);});s.step='edit';pwPersist();pwRender();}return result;}if(a==='save'){pfSave();return true;}if(a==='dates-toggle'){pfNavigate('dates');return true;}if(a==='day'){s.active=el.dataset.date;pfNavigate('edit');return true;}if(a==='back'&&['paste','editrow','candidate'].includes(s.step)){s.candidate=null;pfNavigate(pfMatch()?'edit':'dates');return true;}if(a==='edit'){s.candidate=null;pfNavigate(pfMatch()?'edit':'dates');return true;}return pfLegacy.handle(e);}catch(err){s.error=err.message;pwRender();return true;}};
document.addEventListener('input',e=>{if(!pfOn())return;if(e.target.matches?.('[data-pf-pick-q]')){const k=pfState().pick;if(k){k.q=e.target.value;pfPickRefreshList();}return;}const key=e.target.dataset.pfPref,part=e.target.dataset.pfEmphasis;if(!key&&!part)return;const p=pfState().prefs;if(!p)return;if(part){p.emphasis[part]=+e.target.value;e.target.setAttribute('aria-valuetext',['Less','Balanced','More'][+e.target.value+1]);}else p[key]=key==='split'?e.target.value:+e.target.value;pwPersist();});
document.addEventListener('change',e=>{if(!pfOn())return;if(e.target.matches('[data-pf-paste-all]')){pfState().pasteAll=e.target.checked;pwPersist();return;}const hold=e.target.matches('[data-pf-hold]');if(!hold&&!e.target.matches('[data-pf-avoid]'))return;const p=pfState().prefs,ex=e.target.value;if(ex&&p&&p.avoidAdd){pfListEdit(p,hold?'hold':'avoid',ex,true);pwPersist();pwRender();}});
document.addEventListener('toggle',e=>{if(!pfOn()||!e.target.isConnected)return;const j=pfState();if(e.target.matches?.('[data-pf-saved-fold]')){j.doneOpen=j.doneOpen||{};j.doneOpen[e.target.dataset.pfSavedFold]=e.target.open;pwPersist();return;}if(!e.target.matches?.('[data-pf-fold]'))return;j.open=j.open||{};j.open[e.target.dataset.pfFold]=e.target.open;pwPersist();},true);
(()=>{
 let drag=null;
 function target(e){
  document.querySelectorAll('.pf-drop-target').forEach(el=>el.classList.remove('pf-drop-target'));
  const row=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-pf-day]');
  if(row&&row!==drag?.row)row.classList.add('pf-drop-target');
  return row?.dataset.pfDay;
 }
 function finish(e,cancel=false){
  if(!drag||(e?.pointerId!=null&&e.pointerId!==drag.id))return;
  const from=drag,to=!cancel&&e?target(e):null;drag=null;
  from.row.classList.remove('pf-dragging');
  document.querySelectorAll('.pf-drop-target').forEach(el=>el.classList.remove('pf-drop-target'));
  try{from.grip.releasePointerCapture(from.id);}catch(_){}
  if(to&&from.row.isConnected&&from.owner===pwKey())pfMoveDay(from.date,to);
 }
 document.addEventListener('pointerdown',e=>{
  const g=e.target.closest('[data-pf-day-grip]');if(!g||e.button!==0||drag)return;
  drag={date:g.dataset.pfDayGrip,owner:pwKey(),id:e.pointerId,grip:g,row:g.closest('[data-pf-day]')};
  drag.row.classList.add('pf-dragging');try{g.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();
 });
 document.addEventListener('pointermove',e=>{if(drag&&e.pointerId===drag.id){target(e);e.preventDefault();}});
 document.addEventListener('pointerup',e=>finish(e));
 document.addEventListener('pointercancel',e=>finish(e,true));
 document.addEventListener('lostpointercapture',e=>finish(e,true));
 window.addEventListener('blur',()=>finish(null,true));
 document.addEventListener('keydown',e=>{
  if(drag&&e.key==='Escape'){e.preventDefault();finish(null,true);return;}
  const g=e.target.closest('[data-pf-day-grip]');if(!g||drag||!['ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();const ds=pfDates(),i=ds.indexOf(g.dataset.pfDayGrip),d=ds[i+(e.key==='ArrowUp'?-1:1)];
  if(d){pfMoveDay(g.dataset.pfDayGrip,d);document.querySelector(`[data-pf-day-grip="${d}"]`)?.focus();}
 });
})();
/* v4.6.203: sessions in Your split are reordered by their handle: drag, or the arrow keys */
(()=>{let d=null;
 const rowAt=e=>document.elementFromPoint(e.clientX,e.clientY)?.closest('.pf-ses'),clear=()=>document.querySelectorAll('.pf-ses.pf-drop').forEach(x=>x.classList.remove('pf-drop'));
 const move=(from,to)=>{const j=pfState(),r=j.prefs?.rotation;if(!r||from===to||!r.sessions[from]||!r.sessions[to])return;const [x]=r.sessions.splice(from,1);r.sessions.splice(to,0,x);j.rotSel=[];j.rotHeld=null;pfRotTouch(r);pwPersist();if(!pfSplitRefresh())pwRender();};
 const end=(e,cancel)=>{if(!d||(e?.pointerId!=null&&e.pointerId!==d.id))return;const from=d;d=null;from.row.classList.remove('pf-dragging');const t=!cancel&&e?rowAt(e):null;clear();try{from.grip.releasePointerCapture(from.id);}catch(_){}if(t)move(from.i,+t.dataset.pfRot);};
 document.addEventListener('pointerdown',e=>{const g=e.target.closest?.('[data-pf-rot-grip]');if(!g||e.button!==0||d||!pfOn())return;d={i:+g.dataset.pfRotGrip,id:e.pointerId,grip:g,row:g.closest('.pf-ses')};d.row.classList.add('pf-dragging');try{g.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();});
 document.addEventListener('pointermove',e=>{if(!d||e.pointerId!==d.id)return;clear();const t=rowAt(e);if(t&&t!==d.row)t.classList.add('pf-drop');e.preventDefault();});
 document.addEventListener('pointerup',e=>end(e));document.addEventListener('pointercancel',e=>end(e,true));
 document.addEventListener('keydown',e=>{const g=e.target.closest?.('[data-pf-rot-grip]');if(!g||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const i=+g.dataset.pfRotGrip,to=i+(e.key==='ArrowUp'?-1:1);move(i,to);document.querySelector(`[data-pf-rot-grip="${to}"]`)?.focus();});
})();
/* v4.6.206: the picker sheet closes on Escape, and on a pull down from its top */
(()=>{let t=null;
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('pfPick')){e.preventDefault();pfPickClose();}});
 document.addEventListener('touchstart',e=>{const top=e.target.closest?.('.pf-pick-top');if(!top||e.target.closest('input,button'))return;t={y:e.touches[0].clientY,sheet:top.closest('.pf-pick'),dy:0};},{passive:true});
 document.addEventListener('touchmove',e=>{if(!t)return;t.dy=Math.max(0,e.touches[0].clientY-t.y);t.sheet.style.transition='none';t.sheet.style.transform=`translateY(${t.dy}px)`;},{passive:true});
 const end=()=>{if(!t)return;const x=t;t=null;x.sheet.style.transition='';if(x.dy>90)pfPickClose();else x.sheet.style.transform='';};
 document.addEventListener('touchend',end);document.addEventListener('touchcancel',end);
})();
/* v4.6.207: body-part chips are moved into sessions. A press that does not
   travel is a tap (a chip in the strip is picked up or put down); one that
   travels is a drag: from the strip onto a session, between sessions, to
   another place in the same session, or out of every session to take it away. */
(()=>{let d=null,raf=0;
 const sesAt=(x,y)=>document.elementFromPoint(x,y)?.closest('.pf-ses');
 const indexAt=(ses,x,y,skip)=>{let k=0;for(const c of ses.querySelectorAll('.pf-rot-tag')){if(c===skip)continue;const r=c.getBoundingClientRect();if(y>r.bottom||(y>=r.top&&x>r.left+r.width/2))k++;}return k;};
 const clear=()=>document.querySelectorAll('.pf-ses.pf-drop').forEach(x=>x.classList.remove('pf-drop'));
 const okOn=t=>{if(!t||!d)return false;const r=pfState().prefs?.rotation,ti=+t.dataset.pfRot;return !!r?.sessions[ti]&&((!d.pal&&ti===d.ses)||!r.sessions[ti].parts.includes(d.part));};
 const paint=()=>{if(!d||!d.fly)return;d.fly.style.left=Math.round(d.x-d.fly.offsetWidth/2)+'px';d.fly.style.top=Math.round(d.y-d.fly.offsetHeight-16)+'px';clear();const t=sesAt(d.x,d.y);if(okOn(t))t.classList.add('pf-drop');};
 const tick=()=>{if(!d||!d.moved)return;const hb=document.querySelector('header')?.getBoundingClientRect().bottom||0;if(d.y<hb+6)scrollBy(0,-8);else if(d.y>innerHeight-150)scrollBy(0,8);paint();raf=requestAnimationFrame(tick);};   /* the page follows the chip: up when it is carried over the header, down when it nears the dock */
 const stop=()=>{if(!d)return;clearTimeout(d.hold);cancelAnimationFrame(raf);d.fly?.remove();d.src.classList.remove('pf-lift');clear();document.documentElement.classList.remove('pf-chip-drag');try{d.src.releasePointerCapture(d.id);}catch(_){}d=null;};
 const done=()=>{pwPersist();if(!pfSplitRefresh())pwRender();};
 document.addEventListener('pointerdown',e=>{const c=e.target.closest?.('[data-pf-chip]');if(!c||e.button!==0||d||e.target.closest('.pf-rot-x')||!pfOn()||!pfState().prefs?.rotation)return;
  d={id:e.pointerId,src:c,part:c.dataset.pfChip,pal:!!c.dataset.pal,ses:+c.dataset.ses,k:+c.dataset.k,x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY,moved:false,fly:null,armed:true,hold:0};
  /* A chip INSIDE a session sits where a thumb lands to scroll the page, and a
     drag that ends outside every session takes the chip away. So under a finger
     it is picked up by a short hold, not by a swipe: move first and the page
     scrolls as usual; hold, feel it lift, then move. A mouse drags at once, and
     so does a chip in the strip, where there is nothing to lose. */
  if(!d.pal&&e.pointerType==='touch'){d.armed=false;const mine=d;d.hold=setTimeout(()=>{if(d!==mine)return;mine.armed=true;mine.src.classList.add('pf-lift');try{navigator.vibrate?.(8);}catch(_){}},220);}
  try{c.setPointerCapture(e.pointerId);}catch(_){}});
 document.addEventListener('touchmove',e=>{if(d&&d.armed&&(d.moved||!d.pal))e.preventDefault();},{passive:false});
 document.addEventListener('pointermove',e=>{if(!d||e.pointerId!==d.id)return;d.x=e.clientX;d.y=e.clientY;
  if(!d.armed){if(Math.hypot(d.x-d.x0,d.y-d.y0)>=8)stop();return;}
  if(!d.moved){if(Math.hypot(d.x-d.x0,d.y-d.y0)<8)return;d.moved=true;d.fly=document.createElement('span');d.fly.className='pf-fly';d.fly.textContent=partLabel(d.part);document.body.append(d.fly);d.src.classList.add('pf-lift');document.documentElement.classList.add('pf-chip-drag');raf=requestAnimationFrame(tick);}
  paint();e.preventDefault();},{passive:false});
 document.addEventListener('pointerup',e=>{if(!d||e.pointerId!==d.id)return;const j=pfState(),r=j.prefs?.rotation,cur=d;
  if(!cur.moved){stop();if(cur.pal&&r){pfPalTap(cur.part);done();}return;}
  const t=sesAt(e.clientX,e.clientY),good=okOn(t),over=!!document.elementFromPoint(e.clientX,e.clientY)?.closest('.pf-pal');let at=0,ti=-1;if(good){ti=+t.dataset.pfRot;at=indexAt(t,e.clientX,e.clientY,!cur.pal&&ti===cur.ses?cur.src:null);}
  stop();if(!r)return;
  if(cur.pal){if(good)pfRotPut(r,ti,cur.part,at);}
  else if(good){const a=r.sessions[cur.ses].parts;a.splice(cur.k,1);r.sessions[ti].parts.splice(Math.min(r.sessions[ti].parts.length,at),0,cur.part);r.sessions[cur.ses].name='';r.sessions[ti].name='';pfRotTouch(r);}
  else if(!t&&over)pfRotTake(r,cur.ses,cur.k);   /* carried back to the strip: taken out. Let go anywhere else and nothing changes */
  j.rotHeld=null;done();});
 document.addEventListener('pointercancel',e=>{if(d&&e.pointerId===d.id)stop();});
 window.addEventListener('blur',stop);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&d)stop();if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('.pf-ses[data-pw="pf-rot-put"]')){e.preventDefault();pfHandle('pf-rot-put',e.target);}});
})();
