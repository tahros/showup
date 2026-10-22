/* ShowUp — today.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- Daily Fire: today vs every day you've ever trained ---------- */
let _fireDist=null;
function fireDist(kind){
  if(_fireDist&&_fireDist.kind===kind) return _fireDist.v;
  const v=[];
  for(const rows of Object.values(SEED.sessions)){
    let x=0;
    for(const r of rows){
      if(kind==='km'){ if(r[1]==='Run') x+=r[2]; }
      else { if(r[1]!=='Run') x+=r[2]*(r[3]||[]).reduce((a,b)=>a+b,0); }
    }
    if(x>0) v.push(x);
  }
  v.sort((a,b)=>a-b);
  _fireDist={kind,v};
  return v;
}
/* v3.3.34: while a session is live, the Today hero follows the lift you're
   actually doing — the same chart the exercise view shows (v3.3.18), because
   "beats 14 of your last 15" is fuel mid-set and "bigger than 11% of 921 days"
   is not: the day's total starts every session at the bottom of its own
   distribution. Daily Fire returns the moment the day is sealed, when the
   whole-day percentile is the honest summary. */
function liveExNow(){
  if(!isLive()) return null;
  const t=dayMeta();
  for(let i=t.w.length-1;i>=0;i--){
    const s=t.w[i];
    if(s.ex&&!isCardioEx(s.ex)&&!t.doneEx.includes(s.ex)) return s.ex;   // v4.6.108: no cardio activity is ever 'in progress'
  }
  return null;
}
function livePartNow(){
  const ex=liveExNow();
  if(!ex) return null;
  const t=dayMeta();
  for(let i=t.w.length-1;i>=0;i--) if(t.w[i].ex===ex) return t.w[i].part||null;
  return null;
}
/* v3.3.40: the Today hero shows the PART's progression, not the exercise's.
   The exercise chart already sits at the bottom of the exercise view — the
   same chart twice taught nothing new. Part level answers a question that
   screen can't: how does today's whole Shoulder session compare to the last
   fourteen. Today's bar is red while the session is live. */
/* v3.3.45: Daily Fire is gone and Rhythm takes the top slot.
   v3.3.285: the live part digest is gone too, so Today leads with Rhythm in
   BOTH states — one hero, not two. The digest was the last place in the app
   that delivered a mid-session verdict: "volume down 70% vs your previous 5
   sessions", in red, while you are still lifting. Nothing else here grades a
   session in progress, and a warm-up set legitimately reads as 70% down. The
   number was accurate and useless, which is exactly the kind of claim this
   app declines to make. */
function todayHeroHTML(){
  /* v3.3.319: today's PLAN leads this tab, not Rhythm. Rhythm restated the
     streak and the day count that the header already carries and that Stats
     tells properly; the plan is the one thing you open Today to read. */
  return planningWorkspace()?pwTodayHTML():planSectionHTML();
}
/* ============ v3.1 Clean Slate: onboarding · demo · honest empty states ============ */
function hasAnyDays(){ return Object.values(DB.days).some(v=>v.w&&v.w.length); }
let onbStep=1, onbSel=null, onbUnit='kg';
function onbEl(){ let el=document.getElementById('onb'); if(!el){ el=document.createElement('div'); el.id='onb'; document.body.appendChild(el);} return el; }
function demoEl(){
  let el=document.getElementById('demoBar');
  if(!el){
    el=document.createElement('div'); el.id='demoBar'; el.hidden=true;
    const hd=document.querySelector('header');
    if(hd) hd.insertBefore(el, hd.firstChild); else document.body.appendChild(el);
  }
  return el;
}
/* v4.6.384: maybeOnboard could open the first run but never close it. Signing in
   from the blue door to an account with history pulled the history, marked the
   app onboarded, and left the door on top of it (Sungjee, 2026-10-22). Once the
   app is onboarded, an open first run has nothing left to ask: it closes, and
   Today shows the training that just arrived. */
function onbCloseDone(){
  const el=document.getElementById('onb'); if(!el||el.hidden) return false;
  if(onbLater) return false;   // v4.6.387: a routine being set up from Today is not the first run -- a sync landing mid-setup leaves it open
  el.hidden=true; onbShown=0; onbHist=[]; render(); return true;
}
function maybeOnboard(){
  if(DB.settings.onboarded||DB.settings.demo){ onbCloseDone(); return; }
  if(hasAnyDays()||SEED.totals.sessions>0){ DB.settings.onboarded='auto'; save(); onbCloseDone(); return; }
  const signedIn=!!localStorage.getItem(SKEY);
  if(signedIn&&!pulledOK) return;                  // cloud may still hold their history — wait for the verdict
  onbHist=[]; onbStep=signedIn?'you':1; onbRender();
}
/* ============ v4.6.262: THE FIRST RUN, REDESIGNED ============================
   Four screens, one look: a blue front door, then three short steps on the
   app's own ground. Each screen plays its entrance ONCE and settles; a
   re-render of the same screen (a unit tap, a part toggle) does not replay it.
   1 Welcome   -- brand blue, five weeks of day squares filling in (a few stay
                  empty: life happens), the approved animated lockup, the line.
   2 Training  -- every part picked to start; Sixpack reads as Core, Run as Cardio.
   3 About you -- Pip answers the name as it is typed; bodyweight is optional.
   4 You're in -- where to start: Train, Plan, or Today. All three finish onboarding.
   The barbell question is gone: the standard bar is the default and lives on
   the plate line and in Settings. */
let onbName='', onbBw='', onbShown=0;
const ONB_DAYS=[1,1,1,0,1,1,0, 1,1,1,1,1,1,0, 1,1,1,0,1,1,0, 1,1,1,1,0,1,0, 1,1,1,1,1,1,0];
const ONB_CK=icon('check',ICON_SZ.sm);
const ONB_AR=icon('arrowR',ICON_SZ.sm,0,'ob-ar');
const ONB_APPLE='<svg class="ob-lg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.37 12.73c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.65zM14.1 5.98c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.09 1.76-.95 2.8 1.01.08 2.04-.51 2.67-1.28z"/></svg>';
const ONB_GOOGLE='<svg class="ob-lg" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
const ONB_PLUS=icon('plus',ICON_SZ.sm);
const ONB_CAL=icon('calendar',ICON_SZ.sm);
const ONB_IMPORT=icon('download',ICON_SZ.sm);
const ONB_EYE=icon('eye',ICON_SZ.sm);
const ICON_PASTE_ONB=icon('paste',ICON_SZ.sm);
/* the approved animated lockup (Lifted p trio + Pip), white on the blue door whatever the theme */
function onbLockup(){
  const m=typeof mascotHTML==='function'?mascotHTML('hello','','white').replace('.png',typeof isRetro==='function'&&isRetro()?'.png':'-body.png'):'';
  return '<div class="showuppp-lockup showuppp-c'+(m?'':' showuppp-word-only')+'" role="img" aria-label="ShowUppp">'+
    (m?'<span class="showuppp-character"><i class="showuppp-ground" aria-hidden="true"></i>'+m+'</span>':'')+showupppCompletionLettersHTML()+'</div>';
}
function onbTop(cur,total=4,skip=false){
  return `<div class="ob-top"><button type="button" class="ob-back" data-onbact="back" aria-label="${onbLater&&cur<=1?'Close':'Back'}" style="visibility:${cur>1||onbLater?'visible':'hidden'}">‹</button>`+
    `<div class="ob-prog" aria-label="Step ${cur} of ${total}">${Array.from({length:total},(_,k)=>`<i class="${k+1<=cur?'on':''}"></i>`).join('')}</div>`+
    (skip?`<button type="button" class="ob-skip" data-onbact="skip">Skip</button>`:`<span class="ob-stepn">${String(cur).padStart(2,'0')} / ${String(total).padStart(2,'0')}</span>`)+`</div>`;
}
/* v4.6.372: TWO WAYS IN. The second screen asks how you are starting, and each
   answer gets only the screens it needs.
   fork  -- "I have a routine" / "Start me fresh" / Just looking around
   have  -- where the routine lives: another app (import), my notes or head
            (paste), or I'll log as I go (pick body parts)
   fresh -- experience, days a week, goal, minutes; one tap each. The answers
            pick a fixed template (no writer, works offline) that becomes the
            rotation, with session 1 planned for today, weights by feel.
   you   -- name and units, last, for both.
   The crew member is met after the first finished workout, not here. */
let onbPath=null,onbHave=null,onbHist=[],onbF=null,onbLater=false;
/* v4.6.387: SET UP A ROUTINE LATER. Whoever skipped the routine at first run
   (Just looking around, I'll log as I go) meets the same screens from Today:
   the nudge on the Today card, or Plan while nothing is planned. Asking for a
   routine IS the choice, so it opens straight on Basics, then Routine: two
   steps. Back on Basics closes it and nothing is saved. */
function rtNeedsSetup(){
  const rot=(DB.settings.plannerPreferences||{}).rotation;   // a routine you chose, not the starter order the planner falls back on
  if(rtOn()||(rot&&(Array.isArray(rot)?rot.length:rot.sessions?.length)))return false;
  if(pwSaved(todayISO)?.items?.length)return false;
  const ahead=[...(DB.plan?.d>todayISO?[DB.plan.d]:[]),...Object.keys(DB.week?.days||{}).filter(d=>d>todayISO)];
  return !ahead.some(d=>pwSaved(d)?.items?.length);
}
function onbRoutineOpen(){
  onbLater=true;onbPath='fresh';onbHave=null;onbHist=[];onbShown=0;
  onbFreshInit();const s=DB.settings;
  if(ONB_GOALS.some(g=>g[0]===s.objective))onbF.goal=s.objective;
  if(s.weekStart==='monday'||s.weekStart==='sunday')onbF.weekStart=s.weekStart;
  onbStep='basics';onbRender();
}
function onbLaterClose(){onbLater=false;onbF=null;onbPath=null;onbEl().hidden=true;onbShown=0;}
/* v4.6.372: START ME FRESH, the approved four-screen flow (handoff 2026-10-21):
   01 Start  -- the fork.
   02 Basics -- goal, the days you train, units, and an optional name and
                bodyweight, on one screen.
   03 Routine -- a usable arrangement at once ("Looks good"); Change opens a
                template sheet (preview, then Use, with Undo); Customize opens a
                tray of body parts: drag a chip onto a session, drag one between
                sessions, or tap a chip and then "Add <part>"; x removes;
                sessions reorder by their handle (drag, Move up/down, arrow keys).
   04 Today  -- the real Today, with session 1 planned and the rotation shown.
   What is saved is what the planner already uses: objective, trainDays and
   your order (rotation). Edits survive Back; changing days re-suggests only an
   arrangement you have not touched. Sessions are an order, not dates: a
   missed day means the next session waits. Saving logs nothing and starts no
   timer. */
const ONB_GOALS=[['grow','Build muscle'],['strength','Get stronger'],['lose','Lose weight']];
const ONB_TRAY=['Chest','Back','Shoulder','Legs','Biceps','Triceps','Sixpack','Run'];
const ONB_TPLS=[['full','Full body','A little of everything, each session.'],['ul','Upper / Lower','Alternate upper-body and lower-body sessions.'],['ppl','Push / Pull / Legs','Group pushing, pulling and leg work.'],['body','Body-part days','Give each session its own focus.'],['own','My own','Arrange your own body-part combinations.']];
function onbDayOrder(){return onbF.weekStart==='monday'?[1,2,3,4,5,6,0]:[0,1,2,3,4,5,6];}
/* v4.6.378: A ROUTINE IS A NUMBER OF DAYS, NOT A SET OF WEEKDAYS. Days shift,
   so first-run asks how many days a week, the sessions read Day 1, Day 2..., the
   Routine screen adds and removes days, and an optional Extra day sits apart: it
   is offered once the week's main days are done and never stands in for one. */
function onbDayLab(i){return 'Day '+(i+1);}
function onbCardAt(i){return i===-1?onbF.extra:onbF.cards[i];}
function onbSuggest(){const n=onbF.count;return n<=3?'full':n===4?'ul':'ppl';}
function onbTrainN(){return onbF.cards?onbF.cards.filter(c=>!c.rest).length:onbF.count;}
function onbRestN(){return onbF.cards?onbF.cards.filter(c=>c.rest).length:0;}
function onbDaysText(){const n=onbTrainN(),r=onbRestN();return `${n} ${n===1?'day':'days'}${r?` + ${r} rest`:''}${onbF.extra?' + extra':''} · any days`;}
/* v4.6.387: A REST DAY IN THE ORDER. Push, Pull, Legs, Rest, Push, Pull, Legs:
   a rest card sits between sessions and is saved as restAfter (session index
   -> rest days after it). The day after that session is left open; a day you
   did not train already counts as the rest, so a missed day never adds one. */
const ONB_REST=()=>({rest:true,name:'Rest',parts:[]});
/* v4.6.374: a session's title is what is in it. A set that is one of the
   splits keeps that split's name (Push, Upper, Full body); anything else reads
   its body parts ("Chest + Back"), with Cardio in front when it is there. */
function onbSesNamed(parts){
  const lifts=parts.filter(t=>t!=='Run'),key=x=>x.slice().sort().join(),cardio=parts.includes('Run');
  if(!lifts.length)return cardio?'Cardio':'Empty session';
  let nm=onbSesTemplate(parts)||null;
  if(!nm)nm=lifts.length>3?lifts.slice(0,3).map(partLabel).join(' + ')+' +'+(lifts.length-3):lifts.map(partLabel).join(' + ');
  return (cardio?'Cardio + ':'')+nm;
}
function onbSesTemplate(parts){const lifts=parts.filter(t=>t!=='Run'),key=x=>x.slice().sort().join(),cur=onbF&&onbF.template;   /* the template you are in names first: Legs + Core is Legs in Push / Pull / Legs, Lower in Upper / Lower */
  for(const z of [...PF_SPLITS.filter(x=>x[0]===cur),...PF_SPLITS.filter(x=>x[0]!==cur)])if(z[3])for(const [n,ps] of z[3])if(key(ps)===key(lifts))return n;return '';}
function onbRename(){for(const c of onbF.cards)if(!c.rest)c.name=onbSesNamed(c.parts);if(onbF.extra)onbF.extra.name=onbSesNamed(onbF.extra.parts);}
/* the sessions a template makes for n days: its own sessions in turn, one per training day */
function onbCards(k,n){
  n=Math.max(1,n);
  if(k==='own')return Array.from({length:n},()=>({name:'Empty session',parts:[]}));
  if(k==='body')return Array.from({length:n},(_,i)=>{const p=BODY_PARTS[i%BODY_PARTS.length];return {name:partLabel(p),parts:[p]};});
  const z=PF_SPLITS.find(x=>x[0]===k);const base=z&&z[3]?z[3]:[['Full body',BODY_PARTS.slice()]];
  return Array.from({length:n},(_,i)=>{const [name,parts]=base[i%base.length];return {name,parts:parts.slice()};});
}
/* what goes into Your order: an untouched template keeps its own sessions
   (Upper, Lower -- not Upper, Lower, Upper, which would put two uppers back to
   back the next week); anything you arranged is kept exactly as you left it */
function onbRotation(){
  if(!onbF.edited&&['full','ul','ppl'].includes(onbF.template)){const z=PF_SPLITS.find(x=>x[0]===onbF.template);return {preset:onbF.template,sessions:z[3].map(([name,parts])=>({name,parts:parts.slice()}))};}
  return {preset:'own',sessions:onbF.cards.filter(c=>c.parts.length).map(c=>({name:onbSesTemplate(c.parts),parts:c.parts.slice()}))};
}
function onbFreshInit(){
  const mon=!/^en-(US|CA)|^ja|^ko/i.test(navigator.language||'en-US');
  onbF={goal:'grow',weekStart:mon?'monday':'sunday',count:3,extra:null,template:null,cards:null,edited:false,edit:false,sel:null,menu:-1,hist:[],notice:'A starting point, not a commitment.',sheet:null,profileOpen:false};
}
function onbRoutineReady(){   // the arrangement when Basics hands over: suggested, unless you already shaped one
  if(!onbF.cards||(!onbF.edited&&onbF.cards.length!==onbF.count)){onbF.template=onbF.template&&onbF.edited?onbF.template:onbSuggest();onbF.cards=onbCards(onbF.template,onbF.count);}
}
function onbSnap(){onbF.hist.push(JSON.stringify({template:onbF.template,cards:onbF.cards,edited:onbF.edited,count:onbF.count,extra:onbF.extra}));if(onbF.hist.length>12)onbF.hist.shift();}
function onbSay(t){onbF.notice=t;const l=document.getElementById('onbLive');if(l)l.textContent=t;}
function onbPut(part,to,from){const c=onbCardAt(to);if(!c||from===to)return;
  if(c.rest){onbSay('A rest day stays empty.');onbRender();return;}
  if(c.parts.includes(part)){onbSay(partLabel(part)+' is already in '+c.name+'.');onbRender();return;}
  onbSnap();if(part==='Run')c.parts.unshift(part);else c.parts.push(part);
  if(from!=null&&onbCardAt(from))onbCardAt(from).parts=onbCardAt(from).parts.filter(p=>p!==part);
  const was=c.name;onbF.sel=null;onbF.edited=true;onbRename();onbSay(partLabel(part)+(from!=null?' moved to ':' added to ')+was+'.');onbRender();
  const el=document.querySelector(`#onb [data-rtcard="${to}"]`);if(el){el.classList.remove('ob-settle');void el.offsetWidth;el.classList.add('ob-settle');}}
function onbMove(from,to){if(from===to||to<0||to>=onbF.cards.length)return;onbSnap();const c=onbF.cards.splice(from,1)[0];onbF.cards.splice(to,0,c);onbF.menu=-1;onbF.edited=true;onbSay(c.name+' moved to '+(onbDayLab(to)||'session '+(to+1))+'.');onbRender();}
function onbFreshToday(){
  const ses=onbF.cards.find(x=>x.parts.some(t=>t!=='Run'))||onbF.cards[0]||{parts:[]};
  const lifts=ses.parts.filter(t=>t!=='Run'),pool=lifts.map(t=>(TRAIN_STARTERS[t]||[]).filter(e=>!/Plank/.test(e)&&catFor(t).includes(e)));
  const n=lifts.length>=4?6:5,out=[];
  for(let r=0;out.length<n&&r<6;r++)for(const l of pool){if(out.length>=n)break;if(l[r]&&!out.includes(l[r]))out.push(l[r]);}
  const reps=i=>onbF.goal==='lose'?12:onbF.goal==='strength'?(i===0?5:8):10;
  return {name:onbSesTemplate(ses.parts)||lifts.map(partLabel).join(' + '),cardio:ses.parts.includes('Run'),items:out.map((ex,i)=>({ex,sets:3,reps:reps(i)}))};
}
function onbFreshApply(){
  const T=onbFreshToday(),rot=onbRotation();
  const used=new Set(onbF.cards.flatMap(c=>c.parts));
  DB.settings.myParts=[...BODY_PARTS.filter(p=>used.has(p)||!onbF.edited),...(used.has('Run')?['Run']:[])];
  DB.settings.objective=onbF.goal;DB.settings.weekStart=onbF.weekStart;DB.settings.onbRoutine=todayISO;
  const prev=DB.settings.plannerPreferences||{};
  const restAfter={};let si=-1;   // rests counted against the sessions that are kept (filled ones)
  for(const c of onbF.cards){if(c.rest){const at=si<0?'last':si;restAfter[at]=(restAfter[at]||0)+1;}else if(c.parts.length)si++;}
  if(restAfter.last){restAfter[si]=(restAfter[si]||0)+restAfter.last;delete restAfter.last;}
  DB.settings.plannerPreferences={...prev,frequency:onbTrainN(),trainDays:[],rotation:rot,restAfter:Object.keys(restAfter).length?restAfter:null,extra:onbF.extra&&onbF.extra.parts.length?{name:onbSesTemplate(onbF.extra.parts),parts:onbF.extra.parts.slice()}:null,orderMode:'own',avoid:prev.avoid||[]};
  const text=(T.cardio?'Run — by feel\n':'')+T.items.map(x=>`${x.ex}\n  by feel × ${Array(x.sets).fill(x.reps).join(' ')}`).join('\n');
  try{ const {items}=planItemsFrom(parsePlan(text)); planSave(items,'',text,todayISO); if(DB.plan){ DB.plan.title=T.name; DB.plan.auto='routine'; } DB.settings.routineAutoAt=todayISO; DB.settings.routineWrote={[todayISO]:text}; DB.settings.routineAuto=true; }catch(e){}
  if(typeof pwState!=='undefined'&&pwState&&typeof pw==='function'){ try{ pw().objective=onbF.goal; }catch(e){} }
}
/* v4.6.375: Basics changes in place. A tap used to redraw the screen, so the
   goal's thumb and the day circles jumped to their new state; patched, the
   thumb slides and the circles fade, as they do in Preferences. */
function onbBasicsPatch(){
  const el=document.querySelector('#onb .ob-basics');if(!el||onbStep!=='basics')return false;
  const seg=el.querySelector('.pf-seg'),gi=ONB_GOALS.findIndex(x=>x[0]===onbF.goal),g=PF_GOALS.find(x=>x[0]===onbF.goal)||PF_GOALS[0];
  if(seg)seg.style.setProperty('--i',String(Math.max(0,gi)));
  el.querySelectorAll('.pf-segb').forEach(b=>{const on=b.dataset.v===onbF.goal;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
  const caps=el.querySelectorAll('.pf-pref-cap');if(caps[0])caps[0].innerHTML=g[2];
  el.querySelectorAll('.pf-dowb').forEach(b=>{const on=+b.dataset.v===onbF.count;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
  if(caps[1])caps[1].innerHTML=onbCountCap();
  return true;
}
/* v4.6.375: picking a template changes the sheet in place: the tick moves, the
   week preview and the button follow, and nothing slides or jumps */
function onbCountCap(){const n=onbF.count;return `<strong>${n} days a week</strong> · any days you like. Miss one and the rest move up.`;}
function onbSheetPatch(){
  const sh=document.querySelector('#onb .ob-sheet');if(!sh||!onbF.sheet)return false;
  const k=onbF.sheet,pick=ONB_TPLS.find(x=>x[0]===k),CK=icon('check',ICON_SZ.sm);
  sh.querySelectorAll('.ob-tpl').forEach(b=>{const on=b.dataset.v===k;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));const ic=b.querySelector(':scope > .ic');if(on&&!ic)b.insertAdjacentHTML('beforeend',CK);if(!on&&ic)ic.remove();});
  const wk=sh.querySelector('.ob-tpl-week');if(wk)wk.innerHTML=onbCards(k,onbF.cards?onbF.cards.length:onbF.count).map((c,i)=>`<div><small>${onbDayLab(i)}</small><span>${hesc(c.name)}</span></div>`).join('');
  const go=sh.querySelector('[data-onbact="fapply"]');if(go)go.textContent='Use '+pick[1];
  return true;
}
function onbGo(step){ onbHist.push(onbStep); onbStep=step; onbRender(); }
function onbPos(){   // where this screen sits in its path, and how long the path is
  const path=onbLater?['basics','routine']:onbPath==='have'?['you','crew','fork','have']:['you','crew','fork','basics','routine'];
  return [Math.max(1,path.indexOf(onbStep)+1),path.length,!onbLater&&(onbStep==='you'||onbStep==='crew')];   // name and crew can be skipped, as before
}
function onbChoice(act,val,title,sub,on){
  return `<button type="button" class="ob-card ob-pick ob-rise${on?' on':''}" data-onbact="${act}" data-v="${val}" aria-pressed="${!!on}"><span class="ob-ct"><b>${title}</b>${sub?`<span>${sub}</span>`:''}</span>${ONB_AR}</button>`;
}
function onbBubble(){
  const n=onbName.trim();
  return n?`<span class="ob-hi">Hi, ${hesc(n)}!</span><span class="ob-hi2">Nice to meet you.</span>`:`<span class="ob-hi">Hi there!</span><span class="ob-hi2">I'm Pip. Who are you?</span>`;
}
function onbRender(){
  if(typeof onbWorldStop==='function')onbWorldStop();
  const el=onbEl(); el.hidden=false;
  if(!onbSel) onbSel=new Set(Object.keys(SEED0.catalog));
  const replay=onbShown!==onbStep; onbShown=onbStep;
  const d=s=>`style="--ob-d:${s}s"`;
  let b='';
  if(onbStep===1){
    b=onbWorldHTML();
  }else if(onbStep==='crew'){
    /* v4.6.312: THE COMPANION, IN SETUP -- kept (v4.6.372): Pip has met you; now one of the crew comes along. */
    const n=onbName.trim();
    b=`<div class="ob ob-step ob-adopt ad-root">${onbTop(...onbPos())}${typeof adoptMarkup==='function'?adoptMarkup(n?`${hesc(n)}, someone wants to come along.`:'Someone wants to come along.'):''}</div>`;
  }else if(onbStep==='fork'){
    /* v4.6.372: "You're in" keeps its layout and its entrance -- the crew member jumps in, the cards
       rise one by one -- and asks the one question that decides the rest: how are you starting? */
    const n=onbName.trim();
    b=`<div class="ob ob-step ob-goal">${onbTop(...onbPos())}
      <p class="ob-in ob-rise" ${d(.05)}>You're in${n?', '+hesc(n):''}.</p>
      <p class="ob-q ob-rise" ${d(.15)}>How are you starting?</p>
      <div class="ob-jump">${(typeof companionHTML==='function'&&companionHTML('ob-comp'))||(typeof mascotHTML==='function'?mascotHTML('hello','ob-pip'):'')}<svg class="ob-lines" viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 12l4-9M12 17l12-6M14 25h10"/></svg></div>
      <button type="button" class="ob-card pri ob-rise" ${d(1.1)} data-onbact="path" data-v="fresh"><span class="ob-ic">${ONB_PLUS}</span><span class="ob-ct"><b>Start me fresh</b><span>A starting point. Made yours.</span></span>${ONB_AR}</button>
      <button type="button" class="ob-card ob-rise" ${d(1.25)} data-onbact="path" data-v="have"><span class="ob-ic">${ONB_IMPORT}</span><span class="ob-ct"><b>I have a routine</b><span>Bring it over and keep going</span></span>${ONB_AR}</button>
      <div class="ob-sp"></div><button type="button" class="ob-link ob-look ob-rise" ${d(1.45)} data-onbact="look">Just looking around</button><p class="ob-foot ob-rise" ${d(1.6)}>Either way, you'll know what to do today.</p></div>`;
  }else if(onbStep==='have'){
    b=`<div class="ob ob-step">${onbTop(...onbPos())}
      <h1 class="ob-h ob-rise" ${d(.05)}>Where's your<br>routine now?</h1>
      <p class="ob-sub ob-rise" ${d(.15)}>Bring it in once. Pick up where you left off.</p>
      ${[['import','In another app','Strong, Hevy or a spreadsheet: bring your history',ONB_IMPORT],['paste','In my notes or my head','Paste or type it, we turn it into your plan',ICON_PASTE_ONB],['log','I\'ll log as I go','Pick what you train and start today',ONB_PLUS]].map(([v,t,sub,ic],i)=>`<button type="button" class="ob-card ob-rise${onbHave===v?' on':''}" ${d((.3+i*.1).toFixed(2))} data-onbact="have" data-v="${v}"><span class="ob-ic">${ic}</span><span class="ob-ct"><b>${t}</b><span>${sub}</span></span>${ONB_AR}</button>`).join('')}
      <div class="ob-sp"></div></div>`;
  }else if(onbStep==='basics'){
    const n=onbF.count,lb=onbUnit==='lb',g=PF_GOALS.find(x=>x[0]===onbF.goal)||PF_GOALS[0];
    b=`<div class="ob ob-step pf-workspace ob-basics">${onbTop(...onbPos())}<h1 class="ob-h ob-rise" ${d(.05)}>Make it fit<br>your life.</h1><p class="ob-sub ob-rise" ${d(.12)}>A few basics. Nothing set in stone.</p>
      <div class="ob-sec ob-rise" ${d(.2)}><span class="ob-lbl">What are you training for?</span><div class="pf-seg" role="group" aria-label="Goal" style="--n:3;--i:${ONB_GOALS.findIndex(x=>x[0]===onbF.goal)}">${ONB_GOALS.map(([v,t])=>`<button type="button" class="pf-segb${v===onbF.goal?' on':''}" data-onbact="fgoal" data-v="${v}" aria-pressed="${v===onbF.goal}">${t}</button>`).join('')}</div><p class="pf-pref-cap">${g[2]}</p></div>
      <div class="ob-sec ob-rise" ${d(.28)}><span class="ob-lbl">How many days a week?</span><div class="pf-dow ob-count" role="group" aria-label="Days a week">${[2,3,4,5,6,7].map(x=>`<button type="button" class="pf-dowb${x===n?' on':''}" data-onbact="fcount" data-v="${x}" aria-pressed="${x===n}" aria-label="${x} days a week">${x}</button>`).join('')}</div>
        <p class="pf-pref-cap" aria-live="polite">${onbCountCap()}</p></div>
      <div class="ob-sp"></div><button type="button" class="ob-go" data-onbact="frt">See my routine →</button><p class="ob-foot2">Change any of this later in Settings.</p></div>`;
  }else if(onbStep==='routine'){
    const t=ONB_TPLS.find(x=>x[0]===onbF.template)||ONB_TPLS[0],E=onbF.edit,sel=onbF.sel,X=icon('close',ICON_SZ.sm),GR=icon('grip',ICON_SZ.sm);
    const chip=(p,i)=>E?`<button type="button" class="pf-rot-tag ob-rt-chip${p==='Run'?' cardio':''}" data-rtdrag="${p}" data-rtfrom="${i}" data-onbact="frm" data-v="${i}" data-p="${p}" aria-label="Remove ${hesc(partLabel(p))} from ${hesc(onbCardAt(i).name)}; drag to move">${hesc(partLabel(p))}${X}</button>`:`<span class="pf-rot-tag${p==='Run'?' cardio':''}">${hesc(partLabel(p))}</span>`;
    /* v4.6.387: THE DAY COLUMN IS THE HANDLE. Day N with the grip under it, down the card's left edge
       (all of it grabs); title and chips get the full width. In Customize every chip carries grip dots. */
    const DOTS='<i class="ob-dots" aria-hidden="true"></i>';
    const chipE=(p,i)=>E?`<button type="button" class="pf-rot-tag ob-rt-chip${p==='Run'?' cardio':''}" data-rtdrag="${p}" data-rtfrom="${i}" data-onbact="frm" data-v="${i}" data-p="${p}" aria-label="Remove ${hesc(partLabel(p))} from ${hesc(onbCardAt(i).name)}; drag to move">${DOTS}<span>${hesc(partLabel(p))}</span>${X}</button>`:chip(p,i);
    const side=(i,label,what)=>`<button type="button" class="ob-rt-side" data-rthandle="${i}" data-onbact="fmenu" data-v="${i}" aria-label="${onbDayLab(i)}: ${what}. Drag to move, or tap for options." aria-expanded="${onbF.menu===i}" style="--i:${i}"><span class="ob-rt-day">${onbDayLab(i)}</span><span class="ob-rt-grip" aria-hidden="true">${GR}</span></button>`;
    const order=(i,drop)=>onbF.menu===i?`<div class="ob-rt-order"><button type="button" data-onbact="fmove" data-v="${i}" data-dir="-1" ${i===0?'disabled':''}>↑ Move up</button><button type="button" data-onbact="fmove" data-v="${i}" data-dir="1" ${i===onbF.cards.length-1?'disabled':''}>↓ Move down</button>${drop}</div>`:'';
    const restCard=(c,i)=>`<section class="ob-rt-ses ob-rt-rest" data-rtcard="${i}" aria-label="${onbDayLab(i)}, rest day">${side(i,'Rest','move the rest day')}<div class="ob-rt-main"><b class="ob-rt-name">Rest</b><p class="ob-rt-restnote">A day off. Nothing to log.</p>${order(i,`<button type="button" class="ob-rt-drop" data-onbact="fdrop" data-v="${i}">Remove rest day</button>`)}</div></section>`;
    const cards=onbF.cards.map((c,i)=>c.rest?restCard(c,i):`<section class="ob-rt-ses" data-rtcard="${i}" aria-label="${onbDayLab(i)}, ${hesc(c.name)}">${side(i,c.name,'move '+hesc(c.name))}<div class="ob-rt-main"><b class="ob-rt-name">${hesc(c.name)}</b>
      <div class="ob-rt-chips">${(E?c.parts:c.parts.slice(0,3)).map(p=>chipE(p,i)).join('')}${!E&&c.parts.length>3?`<button type="button" class="ob-rt-more" data-onbact="fcustom" aria-label="Show all body parts">+${c.parts.length-3}</button>`:''}${!c.parts.length?'<em>Drop body parts here</em>':''}</div>
      ${sel&&!c.parts.includes(sel)?`<button type="button" class="ob-rt-add" data-onbact="fplace" data-v="${i}">+ Add ${hesc(partLabel(sel))}</button>`:''}
      ${order(i,`<button type="button" class="ob-rt-drop" data-onbact="fdrop" data-v="${i}" ${onbTrainN()<=1?'disabled':''}>Remove day</button>`)}</div></section>`).join('');
    const XC=onbF.extra,xcard=XC?`<section class="ob-rt-ses ob-rt-extra" data-rtcard="-1" aria-label="Extra day, ${hesc(XC.name)}"><div class="ob-rt-side ob-rt-side-x"><span class="ob-rt-day">Extra</span></div><div class="ob-rt-main"><div class="ob-rt-top"><b class="ob-rt-name">${hesc(XC.name)}</b><button type="button" class="ob-rt-xdel" data-onbact="fdropx" aria-label="Remove the extra day">${X}</button></div>
      <div class="ob-rt-chips">${(E?XC.parts:XC.parts.slice(0,3)).map(p=>chipE(p,-1)).join('')}${!E&&XC.parts.length>3?`<button type="button" class="ob-rt-more" data-onbact="fcustom" aria-label="Show all body parts">+${XC.parts.length-3}</button>`:''}${!XC.parts.length?'<em>Drop body parts here</em>':''}</div>
      ${sel&&!XC.parts.includes(sel)?`<button type="button" class="ob-rt-add" data-onbact="fplace" data-v="-1">+ Add ${hesc(partLabel(sel))}</button>`:''}
      <p class="ob-rt-xnote">Optional. Offered once your ${onbTrainN()} days are done.</p></div></section>`:`<button type="button" class="ob-rt-addses ob-rt-addx" data-onbact="faddx">+ Add an extra day</button>`;
    b=`<div class="ob ob-step pf-workspace ob-routine">${onbTop(...onbPos())}<h1 class="ob-h ob-rise" ${d(.05)}>Your week,<br>your way.</h1><p class="ob-sub ob-rise" ${d(.12)}>We've made a start. Keep it, or make it yours.</p>
      <div class="ob-rt-plan ob-rise" ${d(.18)}><div><b>${hesc(t[1])}</b><span>${onbDaysText()}</span></div><button type="button" class="ob-rt-link" data-onbact="fchange">Change</button></div>
      ${E?(()=>{   /* v4.6.387: the tray says which parts are in your week and which are not in it yet */
        const use=p=>onbF.cards.filter(c=>!c.rest&&c.parts.includes(p)).length+(onbF.extra&&onbF.extra.parts.includes(p)?1:0);
        const pool=p=>{const n=use(p);return `<button type="button" class="pf-pal-chip ob-rt-pool ${n?'used':'fresh'}${sel===p?' held':''}" data-rtdrag="${p}" data-onbact="fpool" data-v="${p}" aria-pressed="${sel===p}" aria-label="${hesc(partLabel(p))}, ${n?`in ${n} ${n===1?'day':'days'}`:'not in your week yet'}"><i class="ob-dots" aria-hidden="true"></i><span>${hesc(partLabel(p))}</span>${n?`<i class="ob-rt-n">×${n}</i>`:''}</button>`;};
        const fresh=ONB_TRAY.filter(p=>!use(p)),used=ONB_TRAY.filter(p=>use(p));
        return `<div class="ob-rt-tray"><div class="ob-rt-tray-h"><b>Body parts</b><button type="button" class="ob-rt-link" data-onbact="fdone">Done</button></div><p>Drag onto a day, or tap one, then a day.</p>${fresh.length?`<span class="ob-rt-grp">Not in your week</span><div class="ob-rt-chips">${fresh.map(pool).join('')}</div>`:''}${used.length?`<span class="ob-rt-grp">In your week</span><div class="ob-rt-chips">${used.map(pool).join('')}</div>`:''}</div>`;})()
        :`<div class="ob-rt-bar"><span>Your sessions</span><button type="button" class="ob-rt-link" data-onbact="fcustom">Customize</button></div>`}
      <div class="ob-rt-list">${cards}</div>
      ${onbF.cards.length<7?`<div class="ob-rt-adds"><button type="button" class="ob-rt-addses" data-onbact="faddses">+ Add a day</button>${onbTrainN()>=2?`<button type="button" class="ob-rt-addses ob-rt-addrest" data-onbact="faddrest">+ Add a rest day</button>`:''}</div>`:''}
      <div class="ob-rt-bar ob-rt-xbar"><span>When you have time</span></div>
      ${xcard}
      <div class="ob-rt-feed"><span>${hesc(onbF.notice)}</span>${onbF.hist.length?`<button type="button" class="ob-rt-link" data-onbact="fundo">Undo</button>`:''}</div>
      <div class="ob-sp"></div><button type="button" class="ob-go" data-onbact="fsave">Looks good →</button><p class="ob-foot2">Miss a day? Your next session waits for you.</p>
      <div class="ob-live" id="onbLive" aria-live="polite"></div></div>`;
    if(onbF.sheet){const k=onbF.sheet,pick=ONB_TPLS.find(x=>x[0]===k),sug=onbSuggest();
      b+=`<div class="ob-sheet-wrap" data-onbact="fsheetbg"><section class="ob-sheet" role="dialog" aria-modal="true" aria-labelledby="obSheetT"><div class="ob-sheet-grip"></div><div class="ob-sheet-h"><div class="ob-sheet-t" id="obSheetT" role="heading" aria-level="2">Find your rhythm.</div><button type="button" class="ob-sheet-x" data-onbact="fclose" aria-label="Close">${X}</button></div>
        <p class="ob-sub">Same ${onbF.cards.length} ${onbF.cards.length===1?'day':'days'}. A different way to arrange them.</p>
        ${ONB_TPLS.map(([v,name,desc])=>`<button type="button" class="ob-tpl${v===k?' on':''}" data-onbact="ftpl" data-v="${v}" aria-pressed="${v===k}"><span><b>${name}</b><small>${desc}</small></span>${v===sug?'<i>Suggested</i>':''}${v===k?icon('check',ICON_SZ.sm):''}</button>`).join('')}
        <div class="ob-tpl-week">${onbCards(k,onbF.cards.length).map((c,i)=>`<div><small>${onbDayLab(i)}</small><span>${hesc(c.name)}</span></div>`).join('')}</div>
        <button type="button" class="ob-go" data-onbact="fapply">Use ${hesc(pick[1])}</button><p class="ob-foot2">Replaces your sessions. You can undo.</p></section></div>`;}
  }else if(onbStep==='you'){
    const lb=onbUnit==='lb';
    b=`<div class="ob ob-step ob-about">${onbTop(...onbPos())}
      <div class="ob-hello">${typeof mascotHTML==='function'?mascotHTML('hello','ob-pip'):''}<div class="ob-bubble" id="onbBubble" aria-live="polite">${onbBubble()}</div></div>
      <label class="ob-lbl ob-rise" ${d(.6)} for="onbName">What should we call you?</label>
      <input class="ob-name ob-rise${onbName?' filled':''}" ${d(.7)} id="onbName" type="text" autocapitalize="words" autocomplete="given-name" maxlength="40" placeholder="Your first name" value="${hesc(onbName)}">
      <div class="ob-row ob-rise" ${d(.8)}><span class="ob-lbl">Your units</span><span class="ob-seg" role="group" aria-label="Units"><button type="button" class="${lb?'':'on'}" data-onbu="kg" aria-pressed="${!lb}">kg</button><button type="button" class="${lb?'on':''}" data-onbu="lb" aria-pressed="${lb}">lb</button></span></div>
      <label class="ob-opt ob-rise" ${d(.9)} for="onbBw">Bodyweight <span>· Optional</span></label>
      <div class="ob-field ob-rise" ${d(.95)}><input id="onbBw" type="number" inputmode="decimal" placeholder="Enter weight" value="${hesc(onbBw)}"><b>${lb?'lb':'kg'}</b></div>
      <p class="ob-why ob-rise" ${d(1)}>Used for bodyweight exercise calculations.</p>
      <button type="button" class="ob-link ob-notnow ob-rise" ${d(1.05)} data-onbact="notnow">Not now</button>
      <div class="ob-sp"></div><button type="button" class="ob-go" data-onbact="toCrew">Continue</button></div>`;
  }
  el.dataset.step=onbStep;
  el.classList.toggle('ob-still',!replay);
  /* v4.6.375: a redraw of the same screen keeps its place -- the scroll stays
     where it was, and an open sheet does not slide in again */
  const keepY=replay?0:el.scrollTop,sheetWas=!!el.querySelector('.ob-sheet');
  el.classList.toggle('ob-sheet-still',!replay&&sheetWas);
  el.innerHTML=b;
  if(!replay)el.scrollTop=keepY;
  if(onbStep==='crew'&&typeof adoptBind==='function'){const r=el.querySelector('.ob-adopt');if(r)adoptBind(r,()=>{onbGo('fork');});}
  if(onbStep===1)onbWorldMount(el);
  if(onbStep==='you'||onbStep==='basics'){
    const nm=el.querySelector('#onbName'), bw=el.querySelector('#onbBw'), bb=el.querySelector('#onbBubble');
    nm?.addEventListener('input',()=>{ onbName=nm.value.slice(0,40); nm.classList.toggle('filled',!!onbName); if(bb){ bb.innerHTML=onbBubble(); bb.classList.remove('bump'); void bb.offsetWidth; bb.classList.add('bump'); } });
    bw?.addEventListener('input',()=>{ onbBw=bw.value; });
  }
}
function onbPathFinish(){
  if(onbPath==='fresh'){ onbFreshApply(); onbFinish(false,'fresh'); return; }
  onbFinish(false,onbHave==='import'?'import':onbHave==='paste'?'paste':'train');
}
function onbFinish(skip,go){
  if(onbLater){   // v4.6.387: set up from Today -- name, units, parts and first-run tips stay as they were
    onbLater=false;DB.settingsAt=Date.now();save(true);onbEl().hidden=true;onbShown=0;
    if(go==='import'&&typeof impOpen==='function'){view='today';render();impOpen('onboarding');return;}
    if(go==='paste'&&typeof pwOpen==='function'){view='today';render();pwOpen(todayISO);try{const s=pw();s.pasteText='';s.editIndex=undefined;s.editAll=false;pwGo('paste');}catch(e){}return;}
    view='today';render();if(go==='fresh')toast('Your routine is set. Today is planned.');return;
  }
  if(!skip){
    if(onbPath!=='fresh') DB.settings.myParts=[...onbSel];
    DB.settings.unit=onbUnit;
    const nm=onbName.trim().slice(0,40);
    if(nm) DB.settings.name=nm;
    const bw=parseFloat(onbBw);
    if(bw>0) DB.settings.bodyKg=onbUnit==='lb'?+(bw*0.45359237).toFixed(1):bw;
  }
  DB.settings.onboarded=APP_VERSION; DB.settingsAt=Date.now();
  tipsStart(); /* v4.6.277: a new user gets the three first-set tips */
  save(true); onbEl().hidden=true; onbShown=0;
  if(go==='train'&&typeof liftEnter==='function'){ liftEnter({}); view='lift'; }
  else if(go==='plan'&&typeof pwOpen==='function'){ view='today'; render(); pwOpen(null,'dates'); return; }
  else if(go==='import'&&typeof impOpen==='function'){ view='today'; render(); impOpen('onboarding'); return; }   // v4.6.274
  else if(go==='paste'&&typeof pwOpen==='function'){ view='today'; render(); pwOpen(todayISO); try{const s=pw();s.pasteText='';s.editIndex=undefined;s.editAll=false;pwGo('paste');}catch(e){} return; }   // v4.6.372
  else if(go==='fresh'){ view='today'; }   // v4.6.372: today's session 1 is already planned
  else{ view='today'; DB.settings.lookAround=1; }   // v4.6.287: sample data is offered on this path only
  render();
}
/* ---- demo: 70 days of clearly-borrowed life ---- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function demoLoad(){
  const rnd=mulberry32(918); DB.days={};
  const rot=['Chest','Back','Legs','Shoulder']; let pi=0;
  for(let i=70;i>=1;i--){
    const c=new Date(todayISO+'T00:00'); c.setDate(c.getDate()-i);
    const d=c.toLocaleDateString('en-CA');
    if(rnd()<0.2&&i>1) continue;
    const w=[]; let at=1;
    if(rnd()<0.85){
      const p=rot[pi++%rot.length];
      for(const ex of SEED0.catalog[p].slice(0,3)){
        const e=SEED0.equip[ex]||'machine';
        const base=e==='barbell'?40:e==='smith'?30:e==='dumbbell'?10:25;
        const wt=base+Math.floor((70-i)/18)*(e==='dumbbell'?2:5);
        for(let k=0;k<3;k++) w.push({part:p,ex,w:wt,reps:[10+Math.floor(rnd()*5)],at:at++});
      }
    }
    if(rnd()<0.55) w.push({part:'Run',ex:'Run',w:+(2.5+rnd()*1.7).toFixed(2),reps:[],mins:Math.round(20+rnd()*14),at:at++});
    if(w.length) DB.days[d]={w,lastAt:at-1,upd:Date.now()};
  }
  DB.settings.demo=true; save();
  SEED=deriveAll(); _fireDist=null;
  onbEl().hidden=true; demoBarSync(); render();
  toast('Demo data loaded — nothing here syncs anywhere');
}
function demoClear(){
  DB.days={}; delete DB.settings.demo; delete DB.settings.onboarded; delete DB.settings.myParts; allowEmptySave=true;   // v4.6.106: an empty ledger on purpose
  save(); SEED=deriveAll(); _fireDist=null;
  demoBarSync(); render(); maybeOnboard();
}
function demoBarSync(){
  const el=demoEl();
  /* v4.6.287: the header became a floating glass pill and hid the red strip behind it. The bar
     is now its own small pill, just above the tab bar, on every tab. */
  if(el.parentElement!==document.body) document.body.appendChild(el);
  if(!demoBarSync.placed){ demoBarSync.placed=1; const place=()=>{ const b=document.getElementById('demoBar'); if(!b||b.hidden) return; const n=document.getElementById('nav'),r=n&&n.getBoundingClientRect(); const t=document.getElementById('sbxBar'),tr=t&&t.getBoundingClientRect(),stack=tr&&r&&tr.bottom>r.top-60&&tr.top<r.top?tr.height+8:0; b.style.bottom=(r&&r.height>0?innerHeight-r.top+8+stack:16)+'px'; };   /* above the owner's test bar when that sits there too */ addEventListener('resize',place); setInterval(place,600); requestAnimationFrame(place); }
  el.hidden=!DB.settings.demo;
  document.body.style.paddingTop='';                 // clear any offset from older builds
  if(DB.settings.demo)
    el.innerHTML=`<span>Sample data</span><button data-onbact="democlear">Use for real</button>`;
}
/* ============ v3.3.372 — DAY ONE ============================================
   What a new user met before: a card saying "Log your first set", whose button
   dropped them into the FULL Train tab -- body-part grid, go-to lists, plan
   section, the same dense screen a 953-day user sees with every number blank.
   The first five minutes were the least designed part of the product.
   Day one now asks ONE QUESTION AT A TIME: what did you train, then which
   lift, then the real logger. Steps two and three exist ONLY on day one; from
   day two the normal Train tab returns, because by then its numbers mean
   something and the shortcuts would be in the way.
   The logger itself is untouched on purpose. The first set is logged in the
   real app, not a tutorial copy of it, so nothing has to be relearned
   tomorrow.
   PREVIEW: d1.preview renders the whole flow over live data and writes
   NOTHING -- the maker can look at it on his own device without logging out.
   Every action below checks it. */
let d1={step:0, part:null, preview:false};
const d1Parts=()=>Object.keys(SEED.catalog||{});
function dayOneHTML(){
  const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const bar=d1.preview
    ? `<div class="d1bar mono">Preview \u00b7 day one<button class="chip" data-d1="exit">Exit</button></div>` : '';
  if(d1.step===1) return `${bar}<div class="card d1card">
      <button class="d1back" data-d1="back" aria-label="Back">\u2190</button>
      <h3 class="d1q">What did you train?</h3>
      <div class="d1grid">${d1Parts().map(p=>
        `<button class="d1tile" data-d1part="${esc(p)}">${esc(partLabel(p))}</button>`).join('')}</div>
    </div>`;
  if(d1.step===2){
    const list=(SEED.catalog[d1.part]||[]).slice(0,8);
    return `${bar}<div class="card d1card">
      <button class="d1back" data-d1="back" aria-label="Back">\u2190</button>
      <h3 class="d1q">${esc(d1.part)}</h3>
      <div class="d1list">${list.map(x=>
        `<button class="d1row" data-d1ex="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    </div>`;
  }
  /* step 0 -- the square you are about to fill, stated before it is explained */
  return `${bar}<div class="card d1card d1hero">
      ${mascotHTML('hello','su-first-day')}
      <i class="d1sq" aria-hidden="true"></i>
      <h3 class="d1h">One set is day one.</h3>
      <p class="muted d1p">ShowUppp counts days, not perfection.</p>
      <button class="onbbtn pri" data-d1="start">Log your first set</button>
      ${refinedFlow()&&!d1.preview?(planningWorkspace()?`<div class="pw-actions">${pwAction('open','Plan','sparkle')}${pwAction('paste-open','Paste','paste','',`data-date="${todayISO}"`)}</div>`:`<div class="flow-dayone-plan"><span class="mono muted">Have a routine?</span><span class="planedge"><button class="pedge" data-planpaste>${icon('paste',ICON_SZ.sm)}Paste</button><button class="pedge pwrite" data-planwrite>${icon('sparkle',ICON_SZ.sm)}Write</button></span></div>`):''}
      <button class="onbbtn" data-imp-open="dayone">Bring my logs over</button>
      ${d1.preview?`<button class="d1link" data-d1="moment">See the moment</button>`
                  :`<button class="d1link" data-onbact="demo">Explore with sample data</button>`}
    </div>`;
}
function emptyHero(which){
  const cta=`<div class="onbctas"><button class="onbbtn pri" data-onbact="golift">Log your first set</button>
    <button class="onbbtn ghost" data-onbact="demo">Explore with sample data</button></div>`;
  if(which==='stats') return `<div class="card emptyhero"><h3>Nothing to count yet</h3>
    <p class="muted">This tab will hold your streaks, year consistency, records, and lifetime volume — all derived from days you log. It starts working at one set.</p>${cta}</div>`;
  if(which==='history') return `<div class="card emptyhero"><h3>No history yet</h3>
    <p class="muted">Every day you train lands here, forever. That can start today.</p>${cta}</div>`;
  return `<div class="card emptyhero"><h3>Your first day starts with one set</h3>
    <p class="muted">ShowUppp counts days, not perfection. Log one set and today turns blue — the streak takes care of itself.</p>${cta}</div>`;
}
document.addEventListener('click',e=>{
  const chip=e.target.closest('[data-onbp]');
  if(chip){ const p=chip.dataset.onbp; onbSel.has(p)&&onbSel.size>1?onbSel.delete(p):onbSel.add(p); onbRender(); return; }
  const u=e.target.closest('[data-onbu]');
  if(u){ const nu=u.dataset.onbu; if(onbBw&&nu!==onbUnit){ const v=parseFloat(onbBw); if(v>0) onbBw=String(Math.round(v*(nu==='lb'?2.20462262:0.45359237)*10)/10); } onbUnit=nu; onbRender(); return; }   // v4.6.372: bodyweight follows the unit
  /* v3.3.372: day one's own actions. In PREVIEW none of these may write:
     picking a lift shows the logger for real on day one, but in preview it
     stops at the ceremony instead, because entering the logger over live data
     is one tap away from adding a set to a 953-day ledger. */
  const dp=e.target.closest('[data-d1part]');
  if(dp){ d1.part=dp.dataset.d1part; d1.step=2; render(); return; }
  const dx=e.target.closest('[data-d1ex]');
  if(dx){
    if(d1.preview){ celebrateDayDone(true,1); return; }
    lift.part=d1.part; lift.ex=dx.dataset.d1ex; lift.weight=0;
    view='lift'; d1.step=0; render(); return;
  }
  /* v3.3.376: replay the day's own ceremony, on request only. preview=true
     so it never re-stamps or writes -- the day is already stamped, and asking
     to see it again is not a second completion. */
  /* v3.3.377: one shareable artifact, reachable two ways -- the replay runs
     the same ceremony and lands on the same card. */
  const _rd=e.target.closest('[data-replayday]');
  if(_rd){
    /* v4.6.146: on a finished day the whole card is the replay button, so one tap
       on the mascot opened the summary and the second and third never reached it.
       A tap on the MASCOT now waits a beat (450ms, reset by each tap): three taps
       make the secret (js/mascot.js) and the summary stays shut; one or two
       open the summary as before, once. Taps anywhere else on the card are
       immediate. */
    if(e.target.closest('.su-mascot')){
      clearTimeout(window._replayTap);
      window._replayTap=setTimeout(()=>{ if(!window.gymTour?.open&&_rd.isConnected) celebrateDayDone(true,undefined,undefined,undefined,_rd); },450);
      return;
    }
    celebrateDayDone(true,undefined,undefined,undefined,_rd); return;
  }
  const d=e.target.closest('[data-d1]');
  if(d){
    const act=d.dataset.d1;
    if(act==='start'){ d1.step=1; render(); }
    else if(act==='back'){ d1.step=d1.step>1?d1.step-1:0; render(); }
    else if(act==='moment'){ celebrateDayDone(true,1); }
    else if(act==='exit'){ d1.preview=false; d1.step=0; d1.part=null; render(); }
    else if(act==='soon') toast('Importing your old logs is coming');
    return;
  }
  const a=e.target.closest('[data-onbact]');
  if(!a) return;
  const act=a.dataset.onbact;
  if(act==='signin') signInGoogle();
  else if(act==='apple'){ if(typeof appleReady==='function'&&appleReady()&&typeof signInApple==='function') signInApple(); else toast('Apple sign-in arrives with the App Store app'); }
  else if(act==='local'){ onbHist=[]; onbStep='you'; onbRender(); }
  else if(act==='path'){ onbPath=a.dataset.v; if(onbPath==='fresh'&&!onbF)onbFreshInit(); onbGo(onbPath==='fresh'?'basics':'have'); }
  else if(act==='have'){ onbHave=a.dataset.v; onbPathFinish(); }
  else if(act==='fgoal'){ onbF.goal=a.dataset.v; if(!onbBasicsPatch()) onbRender(); }
  else if(act==='fcount'){ onbF.count=+a.dataset.v; if(!onbBasicsPatch()) onbRender(); }
  else if(act==='fprofile'){ onbF.profileOpen=!onbF.profileOpen; }   /* <details> toggles itself; remembered across re-renders */
  else if(act==='frt'){ onbRoutineReady(); onbGo('routine'); }
  else if(act==='fchange'){ onbF.sheet=onbF.template||onbSuggest(); onbRender(); document.querySelector('#onb .ob-tpl.on')?.focus(); }
  else if(act==='ftpl'){ onbF.sheet=a.dataset.v; if(!onbSheetPatch()) onbRender(); document.querySelector(`#onb .ob-tpl[data-v="${a.dataset.v}"]`)?.focus(); }
  else if(act==='fclose'||(act==='fsheetbg'&&e.target===a)){ onbF.sheet=null; onbRender(); document.querySelector('#onb [data-onbact="fchange"]')?.focus(); }
  else if(act==='fapply'){ onbSnap(); onbF.template=onbF.sheet; onbF.cards=onbCards(onbF.template,onbF.cards.length); onbF.edited=onbF.template==='own'; onbF.edit=onbF.template==='own'; onbF.sel=null; onbF.sheet=null; onbSay('New arrangement. All yours to adjust.'); onbRender(); }
  else if(act==='fcustom'){ onbF.edit=true; onbSay('Drag to arrange. Tap works too.'); onbRender(); }
  else if(act==='fdone'){ onbF.edit=false; onbF.sel=null; onbSay('Your routine is ready.'); onbRender(); }
  else if(act==='fpool'){ if(onbDragJust)return; onbF.sel=onbF.sel===a.dataset.v?null:a.dataset.v; onbSay(onbF.sel?'Tap a session to add '+partLabel(onbF.sel)+'.':'Drag to arrange. Tap works too.'); onbRender(); }
  else if(act==='fplace'){ onbPut(onbF.sel,+a.dataset.v,null); }
  else if(act==='frm'){ if(onbDragJust)return; onbSnap(); const c=onbCardAt(+a.dataset.v); c.parts=c.parts.filter(p=>p!==a.dataset.p); onbF.edited=true; onbRename(); onbSay(partLabel(a.dataset.p)+' removed.'); onbRender(); }
  else if(act==='fmenu'){ if(onbDragJust)return; const v=+a.dataset.v; onbF.menu=onbF.menu===v?-1:v; onbRender(); }
  else if(act==='fmove'){ onbMove(+a.dataset.v,+a.dataset.v+(+a.dataset.dir)); }
  else if(act==='fundo'){ const h=onbF.hist.pop(); if(h){ Object.assign(onbF,JSON.parse(h)); onbF.sel=null; onbF.menu=-1; onbSay('Change undone.'); onbRender(); } }
  else if(act==='faddses'){ const n=onbF.cards.length; if(n>=7)return; onbSnap();
    /* an untouched template grows the way it would have been made for one more day; anything you arranged gets an empty day to fill */
    if(!onbF.edited&&onbF.template!=='own')onbF.cards=onbCards(onbF.template,n+1); else { onbF.cards.push({name:'Empty session',parts:[]}); onbF.edit=true; }
    onbF.count=onbTrainN(); onbF.sel=null; onbF.menu=-1; onbSay(onbDayLab(n)+' added. '+onbTrainN()+' days a week.'); onbRender(); }
  else if(act==='faddrest'){ const n=onbF.cards.length,t=onbTrainN(); if(n>=7||t<2)return; onbSnap();
    /* it goes where a rest usually sits: halfway through the order (Push, Pull, Legs, Rest, Push, Pull, Legs); drag it anywhere */
    let seen=0,pos=n;for(let i=0;i<n;i++){if(!onbF.cards[i].rest)seen++;if(seen===Math.ceil(t/2)){pos=i+1;break;}}
    onbF.cards.splice(pos,0,ONB_REST()); onbF.edited=true; onbF.sel=null; onbF.menu=-1;
    onbSay('Rest day added after '+(onbF.cards[pos-1]?.name||'the last session')+'. Drag it anywhere.'); onbRender();
    const el=document.querySelector(`#onb [data-rtcard="${pos}"]`);if(el){el.classList.remove('ob-settle');void el.offsetWidth;el.classList.add('ob-settle');} }
  else if(act==='fdrop'){ const i=+a.dataset.v,n=onbF.cards.length,gone=onbF.cards[i]; if(!gone||(!gone.rest&&onbTrainN()<=1))return; onbSnap();
    if(!gone.rest&&!onbF.edited&&onbF.template!=='own')onbF.cards=onbCards(onbF.template,n-1); else onbF.cards.splice(i,1);
    onbF.count=onbTrainN(); onbF.menu=-1; onbSay(gone.rest?'Rest day removed.':(gone.name+' removed. '+onbTrainN()+' days a week.')); onbRender(); }
  else if(act==='faddx'){ onbSnap(); onbF.extra={name:'',parts:['Biceps','Triceps']}; onbRename(); onbSay('Extra day added. It never takes a main day\'s place.'); onbRender(); }
  else if(act==='fdropx'){ onbSnap(); onbF.extra=null; onbSay('Extra day removed.'); onbRender(); }
  else if(act==='fsave'){ if(onbF.cards.some(c=>!c.rest&&!c.parts.length)||(onbF.extra&&!onbF.extra.parts.length)){ onbSay('Add a body part to each empty session first.'); onbRender(); return; } if(onbF.edited&&onbF.template!=='own') onbF.template=onbF.template; onbPathFinish(); }
  else if(act==='toCrew'){ onbGo('crew'); }
  else if(act==='notnow'){ onbBw=''; onbGo('crew'); }
  else if(act==='look'){ onbFinish(false,'look'); }
  else if(act==='rotedit'){ if(typeof pwOpen==='function'){ view='today'; render(); pwOpen(todayISO); try{ const j=pfState(); j.prefOrigin='dates'; j.prefs=pfStagePrefs(); pfNavigate('prefs'); }catch(e){} } }
  else if(act==='back'){ if(onbHist.length){ onbStep=onbHist.pop(); onbRender(); } else if(onbLater) onbLaterClose(); }
  else if(act==='skip'){ DB.settings.companionAsked=todayISO; if(!DB.settings.companionName){DB.settings.clubAvatar='pip';DB.settings.companionFree='pip';} onbHist.push(onbStep); onbStep='fork'; onbRender(); }   // v4.6.311: skip goes past the companion too; the dealt one comes along
  else if(act==='go') onbFinish(false,a.dataset.onbgo);
  else if(act==='finish') onbFinish(false);
  else if(act==='demo') demoLoad();
  else if(act==='democlear') demoClear();
  else if(act==='golift'){ lift.ret='today'; view='lift'; render(); }   // v3.3.434: back to Today
});
/* v3.3.66 — the greeting is a STATE, not decoration. It belongs to "hasn't
   trained yet today" and it leaves the moment the first set lands, like every
   other live state in this app. A permanent name banner is wallpaper in three
   days; this one is only ever seen on arrival. */
/* v3.3.76 — variation without cringe. The word tracks the clock through five
   bands, one word each, so 4am and 11pm get their own dry nod instead of a
   wrong 'Morning'/'Evening'. Pure function so the clock can be tested.
   The subline stays a receipt — the day count — and inside the last 75 days
   before a round thousand it counts down to it, because that is a fact, not
   a compliment. No exclamation marks anywhere in this card, ever. */
function helloPart(hr){
  return hr<5?'Early':hr<12?'Morning':hr<18?'Afternoon':hr<22?'Evening':'Late';
}
/* v3.3.526: THE COUNTDOWN GOES. "961 days in \u00b7 39 to 1,000." -- the maker
   struck the tail, and the app had already written the argument against it
   twice. v3.3.98: no countdowns to small rungs, "because anticipation-farming
   is the mechanism, not the size" -- which is true of a big rung too; the size
   was never what made it a countdown. v3.3.437 then took it off rest days
   because "42 to 1,000 is a thing to chase; neither is what today is". Today
   is not a thing to chase on a training day either.
   It also sits against the standing rule directly: no escalation, no countdown
   timers, and ceremony frequency inversely proportional to occasion frequency.
   A number that ticks down every morning for 75 mornings is the most frequent
   ceremony in the app.
   msNearThousand goes with it -- helloSub was its only caller, and the comment
   claiming the Rhythm card shared it had been stale for a while. The day-1,000
   MOMENT is untouched; a moment on the day is not a countdown to it. */
function helloSub(d){
  if(!d) return '';
  return `${fmt(d)} days in.`;
}
function helloCard(){
  const n=firstName();
  /* v3.3.437: RESTING SHORTENS THE LINE. "Morning" is a time of day and
     "42 to 1,000" is a thing to chase; neither is what today is. The day
     COUNT stays, because a rest day is still a day you kept the record — it
     is the countdown that goes, since you are not closing on anything today.
     The name goes with it: "Rest, Sungjee." reads as an instruction. */
  if(restingToday())
    return `<div class="hello resting"><span class="hi">Rest day</span></div>`;   /* v4.6.343: the count goes too -- Rest day says it (Sungjee) */
  const part=helloPart(new Date().getHours());
  const sub=helloSub(SEED.totals.sessions);
  return `<div class="hello"><span class="hi">${part}${n?', '+n:''}.</span>${
    sub?`<span class="hisub">${sub}</span>`:''}</div>`;
}
/* count-up: the number climbs from the previous rung, ~1.6s ease-out, once
   per render of a pending moment. Reduced motion → static, guarded by the
   media query at call time. Inline animation, no fill-mode, no stacking. */
function countUpEl(el,dur){
  if(!el) return;
  try{ if(matchMedia('(prefers-reduced-motion: reduce)').matches) return; }catch(e){}
  const from=+el.dataset.from||0, to=+el.dataset.to||0; if(to<=from) return;
  const t0=performance.now();
  const step=(t)=>{
    const p=Math.min(1,(t-t0)/dur), e2=1-Math.pow(1-p,3);
    el.textContent=fmt(Math.round(from+(to-from)*e2));
    if(p<1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function msCountUp(){ countUpEl(document.querySelector('.msmoment .msnum'),1600); }
/* the day number ticks over ONCE per app open, not on every tab switch —
   an earned response to a real event, not a decoration that repeats. */
let _dayUpPlayed=false;
function dayCountUp(){
  if(_dayUpPlayed) return;
  const el=document.querySelector('.rhythm .big.dayn'); if(!el) return;
  _dayUpPlayed=true; countUpEl(el,900);
}
/* One decision before training. Rest, active and completed days keep their
   established screens. A future plan is context, never today's prescription. */
/* v4.6.372: the card's Start. "Run first" (v4.6.131) is right for someone who
   opens with a run -- it was written for one -- and wrong for a beginner whose
   plan has no run in it: their Start opened a run. It stays for anyone who has
   run in the last three weeks and not yet today; everyone else starts on the
   plan's first exercise not yet done. */
/* v4.6.372: until the first workout, Today shows the rotation onboarding made, with Edit (Preferences) */
/* v4.6.376: THE ROUTINE PLANS EVERY TRAINING DAY. The routine says what comes
   next; the days you train say when. A training day with nothing saved gets
   its next session written the morning it arrives -- your own exercises at your
   last weights, starters by feel until you have them -- and a missed day moves
   nothing: the session waits for the next training day. What you save yourself
   (Plan, Paste, the writer) always wins. Today shows the coming days as it shows
   anyone's plans (v4.6.380: the This week card is gone). Preferences
   can switch it off (routineAuto:false). v4.6.376: it is on for whoever sets up a
   routine in first-run setup (routineAuto:true); a week you already plan by hand is
   never written over. */
function rtSessions(){try{const r=typeof pfOrderRot==='function'?pfOrderRot():null;return r&&r.sessions&&r.sessions.length?r.sessions:null;}catch(e){return null;}}
function rtTrainDays(){const p=DB.settings.plannerPreferences||{};return Array.isArray(p.trainDays)?p.trainDays:[];}
function rtFreq(){return Math.max(0,Math.min(7,+(DB.settings.plannerPreferences||{}).frequency||0));}
/* v4.6.378: no set weekdays -- the week fills from today: the next main session
   each day until the week has its number, then the Extra once, then rest */
function rtFlex(){return !rtTrainDays().length&&rtFreq()>0;}
function rtExtra(){const x=(DB.settings.plannerPreferences||{}).extra;return x&&x.parts&&x.parts.length?x:null;}
function rtRests(n){const r=(DB.settings.plannerPreferences||{}).restAfter;if(!r||typeof r!=='object')return null;const o={};let any=0;for(const [k,v] of Object.entries(r)){const i=+k;if(Number.isInteger(i)&&i>=0&&i<n&&v>0){o[i]=Math.min(3,v|0);any=1;}}return any?o:null;}
function rtIdx(){const s=DB.settings;if(!s.routineIdx||typeof s.routineIdx!=='object')s.routineIdx={};return s.routineIdx;}
function rtKinds(){const s=DB.settings;if(!s.routineKinds||typeof s.routineKinds!=='object')s.routineKinds={};return s.routineKinds;}
function rtWeekOf(d){const t=new Date(d+'T12:00'),off=(t.getDay()-(DB.settings.weekStart==='monday'?1:0)+7)%7;t.setDate(t.getDate()-off);return t.toLocaleDateString('en-CA');}
function rtOn(){return DB.settings.routineAuto===true&&!!rtSessions()&&(rtTrainDays().length>0||rtFlex());}
function rtName(x){return x?(x.name||x.parts.filter(t=>t!=='Run').map(partLabel).join(' + ')||'Cardio'):'';}
function rtAddDays(iso,n){const t=new Date(iso+'T12:00');t.setDate(t.getDate()+n);return t.toLocaleDateString('en-CA');}
function rtTrained(iso){return (DB.days[iso]?.w||[]).some(s=>(s.reps||[]).length||isCardio(s));}
/* a session as plan text: Cardio as last logged, then per body part your most
   recent exercises at their last line, or the starters by feel */
function rtDayText(ses){
  const parts=ses.parts,lifts=parts.filter(t=>t!=='Run'),main=lifts.filter(t=>t!=='Sixpack'),lines=[];
  /* core is one exercise when it shares the day; the rest of the six go to the main parts */
  const perOf=t=>t==='Sixpack'?(main.length?1:3):Math.max(1,Math.min(3,Math.ceil((6-(lifts.includes('Sixpack')&&main.length?1:0))/Math.max(1,main.length))));
  if(parts.includes('Run')&&typeof pfCardioLine==='function')lines.push(pfCardioLine());
  const goal=DB.settings.objective||'grow',reps=goal==='lose'?12:goal==='strength'?8:10;let total=0;
  for(const p of lifts){if(total>=7)break;
    const mine=(typeof pwDoneFor==='function'?pwDoneFor([p]):[]).filter(ex=>!(typeof isAvoided==='function'&&isAvoided(ex))&&pwLastLine(ex)).slice(0,perOf(p));
    const pool=mine.length?mine:(TRAIN_STARTERS[p]||[]).filter(e=>!/Plank/.test(e)&&catFor(p).includes(e)).slice(0,perOf(p));
    for(const ex of pool){if(total>=7)break;const l=mine.includes(ex)?pwLastLine(ex):null;
      lines.push(`${ex}\n  ${l?`${l.load} × ${l.reps.join(' ')}`:`by feel × ${[reps,reps,reps].join(' ')}`}`);total++;}}
  return lines.join('\n');
}
/* v4.6.376: THE WEEK IS WRITTEN INTO PLAN. Each training day in the next seven
   gets its session saved as a real plan the moment the week is looked at, so
   Plan and This week are the same data. routineWrote remembers exactly what the
   routine wrote on each day, which is how a day stays the routine's:
     untouched (its text is still what was written) -- rewritten whenever the
       order moves: a missed day, a day trained, new weights, a changed routine;
     edited by you -- yours, never rewritten; it takes its turn in the order;
     removed by you -- left empty, and the order steps round it.
   Today's own session, once written, stays as it is until it is trained. A
   missed day that was never touched simply leaves the plan: it is not a record
   and nothing counts it. */
function rtWrote(){const s=DB.settings;if(!s.routineWrote||typeof s.routineWrote!=='object')s.routineWrote={};return s.routineWrote;}
/* a day is still the routine's while it holds what the routine wrote -- compared
   by content, not by text: Plan's Save writes the same sets back in its own
   words, and saving a day unchanged does not make it yours */
function rtSig(items){return (items||[]).map(i=>i.ex+':'+(i.lines||[]).map(l=>[l.nw?'f':l.bw?'b'+(+l.w||0):+l.w||0,l.su||'',(l.reps||[]).join(' ')].join('@')).join(',')).join('|');}
function rtOwn(d){const b=typeof pwSaved==='function'?pwSaved(d):null,w=rtWrote()[d];
  if(b&&b.items&&b.items.length){if(w==null)return 'saved';if(String(b.raw||'')===w)return 'auto';
    try{return rtSig(b.items)===rtSig(planItemsFrom(parsePlan(w)).items)?'auto':'saved';}catch(e){return 'saved';}}
  return w!=null?'gone':null;}
function rtPut(d,x,text,kind){
  const {items}=planItemsFrom(parsePlan(text)),title=kind==='extra'?'Extra · '+rtName(x):rtName(x),wk=DB.week&&DB.week.days?DB.week:{days:{}};
  if(DB.plan&&DB.plan.d!==d&&DB.plan.d>=todayISO&&DB.plan.items?.length&&!wk.days[DB.plan.d])wk.days[DB.plan.d]={title:DB.plan.title||'',items:DB.plan.items,note:DB.plan.note||'',raw:DB.plan.raw||''};
  wk.days[d]={title,items,note:'',raw:text};
  if(d===todayISO||DB.plan?.d===d)DB.plan={d,items,note:'',raw:text,title,auto:'routine'};
  DB.week=wk;rtWrote()[d]=text;if(kind==='extra')rtKinds()[d]='extra';else delete rtKinds()[d];}
function rtDrop(d){if(DB.week?.days)delete DB.week.days[d];if(DB.plan?.d===d)DB.plan=null;delete rtWrote()[d];delete rtKinds()[d];}
function rtSyncWeek(o={}){
  if(!rtOn())return false;const ses=rtSessions();if(!ses)return false;
  const days=rtTrainDays(),wrote=rtWrote(),before=JSON.stringify([DB.week,DB.plan,wrote,rtKinds(),DB.settings.routineIdx||null]);
  /* the days behind you: a routine day you never touched or trained leaves the plan */
  for(const d of Object.keys(wrote))if(d<todayISO){if(rtOwn(d)==='auto'&&!rtTrained(d)&&DB.week?.days)delete DB.week.days[d];delete wrote[d];}
  for(const d of Object.keys(rtKinds()))if(d<todayISO)delete rtKinds()[d];
  const flex=rtFlex(),N=rtFreq(),XS=rtExtra(),cnt={},xUsed={};
  if(flex){const w0=rtWeekOf(todayISO);let n=0;for(let x=w0;x<todayISO;x=rtAddDays(x,1))if(rtTrained(x))n++;cnt[w0]=n;}
  let k=pfRotNext(ses);
  /* v4.6.387: rest days in the order. owed = rest days still due after the session last trained;
     each day since then that you did not train has already paid one */
  const RA=flex?rtRests(ses.length):null,after=j=>RA?(RA[((j%ses.length)+ses.length)%ses.length]||0):0;let owed=0;
  const n=ses.length,IX=RA?rtIdx():null,mark=(d,j)=>{if(IX)IX[d]=((j%n)+n)%n;};
  if(RA){const last=Object.keys(DB.days).filter(x=>x<=todayISO&&rtTrained(x)).sort().at(-1);
    /* Push, Pull, Legs, Rest, Push, Pull, Legs has two of each: the log alone cannot tell which Legs
       was last, so the turn each written day took is kept, and the last trained day says where you are */
    if(last&&IX[last]!=null)k=(IX[last]+1)%n;
    for(const d of Object.keys(IX))if(d<(last||todayISO))delete IX[d];
    if(last){owed=after(k-1);if(last<todayISO)owed=Math.max(0,owed-(Math.round((new Date(todayISO+'T12:00')-new Date(last+'T12:00'))/864e5)-1));}}
  for(let i=0;i<7;i++){const d=rtAddDays(todayISO,i),dow=new Date(d+'T12:00').getDay(),st=rtOwn(d),wk=rtWeekOf(d);cnt[wk]=cnt[wk]||0;
    if(i===0&&rtTrained(d)){cnt[wk]++;continue;}            // logged: frozen, and already counted in the order
    if(st==='saved'){mark(d,k);k++;cnt[wk]++;owed=after(k-1);continue;}               // yours: takes its turn
    if(st==='gone')continue;                                // you removed it: stepped round
    if(i===0&&st==='auto'&&!o.today&&DB.settings.routineAutoAt===todayISO){if(rtKinds()[d]==='extra')xUsed[wk]=1;else{if(IX&&IX[d]==null)mark(d,k);k++;cnt[wk]++;owed=after(k-1);}continue;}   // this morning's session, once written today, stays as written
    if(flex&&owed>0){owed--;if(st==='auto')rtDrop(d);rtKinds()[d]='rest';continue;}   // a rest day in your order
    if(rtKinds()[d]==='rest')delete rtKinds()[d];
    let x,kind='main';
    if(flex){if(cnt[wk]<N){x=ses[k%ses.length];mark(d,k);k++;cnt[wk]++;owed=after(k-1);}else if(XS&&!xUsed[wk]){x=XS;kind='extra';xUsed[wk]=1;}else{if(st==='auto')rtDrop(d);continue;}}
    else{if(!days.includes(dow)){if(st==='auto')rtDrop(d);continue;}x=ses[k%ses.length];k++;}
    const text=rtDayText(x);if(!text)continue;
    const cur=st==='auto'?pwSaved(d):null,title=kind==='extra'?'Extra · '+rtName(x):rtName(x);
    if(!cur||cur.raw!==text||(DB.week?.days?.[d]?.title||'')!==title||(rtKinds()[d]||'main')!==kind)rtPut(d,x,text,kind);}
  if(DB.week?.days){const all=Object.keys(DB.week.days).sort();if(all.length){DB.week.from=all[0];DB.week.to=all.at(-1);DB.week.raw=DB.week.raw||'';}else DB.week=null;}
  const fresh=DB.settings.routineAutoAt!==todayISO;DB.settings.routineAutoAt=todayISO;
  if(JSON.stringify([DB.week,DB.plan,wrote,rtKinds(),DB.settings.routineIdx||null])===before){if(fresh)save(true);return false;}
  DB.weekAt=DB.planAt=Date.now();
  if(typeof planRailRefresh==='function')planRailRefresh();save(true);return true;
}
/* the coming week, read straight from Plan (the read model the checks use) */
function rtWeek(n=7){
  const out=[];
  for(let i=0;i<n;i++){const d=rtAddDays(todayISO,i);
    if(i===0&&rtTrained(d)){out.push({d,kind:'done',name:'Trained'});continue;}
    const st=rtOwn(d),b=pwSaved(d);
    if(st==='auto'||st==='saved'){out.push({d,kind:st==='auto'&&rtKinds()[d]==='extra'?'extra':st,name:(DB.week?.days?.[d]?.title)||(b.title)||pwParts(pwRead(planText(b))).map(partLabel).join(' + ')});continue;}
    out.push({d,kind:'rest',name:'Rest'});}
  return out;
}
function todayRotationHTML(){
  if(!DB.settings.onbRoutine||SEED.totals.sessions>0)return '';
  const p=DB.settings.plannerPreferences||{},r=p.rotation,days=(p.trainDays||[]).slice();if(!r||!r.sessions||!r.sessions.length||!days.length)return '';
  const ord=(weekStartDow()===1?[1,2,3,4,5,6,0]:[0,1,2,3,4,5,6]).filter(d=>days.includes(d));
  const name=x=>x.name||x.parts.map(partLabel).join(' + ');
  return `<section class="today-rot"><div class="today-rot-h"><span>Your rotation</span><button type="button" class="today-rot-edit" data-onbact="rotedit">Edit</button></div><div class="today-rot-days">${ord.map((d,i)=>`<div><small>${PF_DOW[d]}</small><span>${hesc(name(r.sessions[i%r.sessions.length]))}</span></div>`).join('')}</div><p>Sessions go in order. Miss a day and the next one waits.</p></section>`;
}
function todayFirstHTML(items){
  const ranLately=Object.keys(DB.days||{}).some(d=>d<todayISO&&d>=(()=>{const t=new Date(todayISO+'T12:00');t.setDate(t.getDate()-21);return t.toLocaleDateString('en-CA');})()&&(DB.days[d].w||[]).some(s=>s.ex==='Run'));
  const ranToday=(DB.days[todayISO]?.w||[]).some(s=>s.ex==='Run');
  const cardioFirst=DB.plan&&DB.plan.d===todayISO&&/^Run\b/.test(String(DB.plan.raw||'').trim());   // session 1 opens with cardio
  if((ranLately||cardioFirst)&&!ranToday) return `<div class="today-focus-next"><div><small>Run first</small><b>Run</b></div><button class="btn" data-ex="Run" data-part="Run">Start →</button></div>`;
  const done=new Set((DB.days[todayISO]?.w||[]).map(s=>s.ex)),it=items.find(x=>x.ex&&!done.has(x.ex))||items[0];
  if(!it||!it.ex) return '';
  const part=typeof homePartOf==='function'?homePartOf(it.ex):'';
  return `<div class="today-focus-next"><div><small>First up</small><b>${hesc(it.ex)}</b></div><button class="btn" data-ex="${hesc(it.ex)}" data-part="${hesc(part||'')}">Start →</button></div>`;
}
function focusedTodayHTML(){
  rtSyncWeek();   // v4.6.376: the routine keeps the coming week written into Plan
  const now=planNow(),items=(now?.items||[]).map(planItemShape),fresh=SEED.totals.sessions===0;
  const next=nextPlanItem(),sets=items.reduce((n,it)=>n+(it.lines||[]).reduce((s,l)=>s+(l.reps||[]).length,0),0);
  const future=[...new Set([...(DB.plan?.d>todayISO?[DB.plan.d]:[]),...Object.keys(DB.week?.days||{}).filter(d=>d>todayISO)])].filter(d=>pwSaved(d)?.items?.length).sort();
  const parts=items.length?(now?.title&&now.d===todayISO?now.title:pwParts(pwRead(planText(now))).map(partLabel).join(' + ')):'';   // v4.6.372: a session made from a template keeps its name
  const restToday=!items.length&&rtOn()&&rtKinds()[todayISO]==='rest'&&!rtTrained(todayISO);   // v4.6.387
  let h=`<section class="today-focus"><div class="su-hello-row">${fresh?'<div class="hello"><span class="hi">Welcome to ShowUppp.</span></div>':helloCard()}${(typeof companionHTML==='function'&&companionHTML('su-hello-comp'))||mascotHTML('hello')}</div>${typeof trialCardHTML==='function'?trialCardHTML():''}<div class="card today-focus-card"><div class="today-focus-kicker">${items.length?'Today’s workout':'Today'}</div>${items.length?'':`<h3>${restToday?'Rest day.':fresh?'Start with one set.':'What’s today’s workout?'}</h3>`}`;
  if(items.length){
    h+=`<details class="today-focus-plan" data-pw-fold="focus:${todayISO}" ${pwFoldOpen('focus:'+todayISO)?'open':'' }><summary><div class="today-focus-title"><h3>${hesc(parts||'Your workout')}</h3>${icon('chevron',ICON_SZ.md)}</div><div class="mono muted today-focus-meta">${sets} ${sets===1?'set':'sets'} · ${items.length} ${items.length===1?'exercise':'exercises'}</div></summary><div class="today-focus-plan-content">${planCardHTML(now,false)}</div></details>${todayFirstHTML(items)}`;
  }else{const setup=!future.length&&rtNeedsSetup();   // v4.6.387: no routine and nothing planned -- offer the routine setup, under the one set
    h+=`<p class="today-focus-copy">${restToday?'Your routine has today off. Train anyway if you like.':`Choose an exercise and log what you do.${fresh&&!setup?' No plan needed.':''}`}</p><button class="btn${restToday?' ghost':''}" id="goLift">Choose exercise →</button>${setup?`<button type="button" class="today-routine" data-routine-setup><span>Want a routine? <b>Set one up in a minute</b></span>${icon('arrowR',ICON_SZ.sm)}</button>`:''}`;}
  /* v4.6.287: "Just looking around" -- sample data lives here now, not on the first screen */
  const sampleLink=fresh&&DB.settings.lookAround&&!DB.settings.demo?`<button type="button" class="today-sample" data-onbact="demo">See it with sample data</button>`:'';
  h+='</div>';
  if(future.length){
    const first=future[0];const later=d=>pwLaterDayHTML(d).replace('</summary>',`${icon('chevron',ICON_SZ.sm)}</summary>`).replace('class="pw-later-day"','class="pw-later-day today-focus-later"');/* v4.6.148: ONE LINE FOR THE FUTURE. Tomorrow's row plus an "N more planned
       days" fold made two lines about days that are not today. One plan ahead
       keeps its own row; two or more fold into a single line that names the
       count and the next day, and opens to every day, tomorrow first. */
    if(future.length===1){let firstHTML=later(first);if(!items.length&&first===tomorrowISO()&&pwFoldOpen('later:'+first,true))firstHTML=firstHTML.replace('<details ','<details open ');h+=`<div class="today-focus-upcoming">${firstHTML}</div>`;}
    else{const nx=pwSaved(first),nxParts=nx?pwDayName(first,nx):'';
      h+=`<details class="today-focus-more" data-pw-fold="future" ${pwFoldOpen('future')?'open':''}><summary><span class="tfm-count">${future.length} planned days</span><span class="tfm-next">${first===tomorrowISO()?'Tomorrow':hesc(pwDate(first))}${nxParts?' · '+hesc(nxParts):''}</span>${icon('chevron',ICON_SZ.sm)}</summary>${future.map(later).join('')}</details>`;}
  }
  h+=`<div class="today-focus-tools">${items.length?pwAction('open-date','Edit plan','edit','',`data-date="${todayISO}"`):pwAction('open','Plan','sparkle')}${pwAction('paste-open','Paste','paste','',`data-date="${items.length?todayISO:future[0]||todayISO}"`)}${pwDatesButton()}</div>`;
  const s=pw();if(s.dates.some(d=>d>=todayISO&&s.book[d]&&s.book[d].source!=='Saved plan'&&(s.book[d].rows.length||s.book[d].parts.length)))h+=pwAction('resume','Resume draft','edit','today-focus-secondary');
  // Keep rescheduling available without putting a second call-to-action card on Today.
  if(items.length&&planShiftable(planRunFrom(todayISO),1).ok)h+=`<div class="pw-home"><button type="button" class="pw-push" data-pw="plan-push-ask"><span>Can’t train today?</span><b>Push the week ${icon('chevron',ICON_SZ.sm)}</b></button></div>`;
  if(!fresh)h+='<button class="btn ghost restbtn today-focus-rest" id="restBtn">Rest day</button>';
  /* v4.6.380: THE WEEK SHOWS AS EVERY WEEK DOES. The routine's days are real plans,
     so Today shows them the way it shows anyone's: Tomorrow, then N more plans.
     A second card for the same days (This week, v4.6.376) said it twice. */
  if(!rtOn())h+=todayRotationHTML();
  h+=sampleLink;
  const template=document.createElement('template');template.innerHTML=h+'</section>';
  template.content.querySelectorAll('details').forEach(d=>{const s=d.querySelector(':scope > summary');if(s){s.classList.add('pw-fold-summary');s.setAttribute('aria-expanded',String(d.open));}});
  return template.innerHTML;
}
/* v4.6.359: ONE STACK, ONE ACTION, WHILE A SESSION IS LIVE (Sungjee, 2026-10-20:
   "this very screen looks very cluttered and not organized"). Mid-run, Today said
   "a run is live" three times (the red bar, a red-outlined card, Continue Run),
   offered two buttons for "what next" (blue Start, red Continue), and kept the
   plan's four editing tools on screen while nobody edits a plan. Approved mock
   "Today during a live run": the red bar stays the live signal; one plan card
   carries the day, its progress in sets, and the single Next button; what is
   logged is a plain list. The tools and the other planned days live inside the
   card's fold, one tap away, not deleted. Only with a plan for today and a
   session open -- every other state keeps its own layout. */
function liveTodayHTML(t){
  const now=planNow(),items=(now.items||[]).map(planItemShape);
  const parts=pwParts(pwRead(planText(now))).map(partLabel).join(' + ')||'Your workout';
  const planned=it=>(it.lines||[]).reduce((s,l)=>s+(l.reps||[]).length,0);
  const total=items.reduce((n,it)=>n+planned(it),0);
  const done=Math.min(total,items.reduce((n,it)=>n+Math.min(planned(it),t.w.filter(s=>s.ex===it.ex).length),0));
  /* a run in the plan counts as done once one is logged: planLoggedToday() asks for reps, which cardio rows never carry */
  const next=(now.items||[]).find(i=>!t.w.some(s=>s.ex===i.ex))||null;
  const future=[...new Set([...(DB.plan?.d>todayISO?[DB.plan.d]:[]),...Object.keys(DB.week?.days||{}).filter(d=>d>todayISO)])].filter(d=>pwSaved(d)?.items?.length).sort();
  const open=pwFoldOpen('live:'+todayISO);
  /* v4.6.381: no big Next button (Sungjee, 2026-10-22: "hideous") -- the plan in the
     card's fold and the logged list say where you are; a dotted tip, once, says the
     red bar is the way back to the exercise you are on */
  const cur=(typeof lift!=='undefined'&&lift.ex&&exOpen(lift.ex)?lift.ex:null)||[...t.w].reverse().find(s=>exOpen(s.ex))?.ex||null;
  const tipOn=cur&&DB.settings.ltTipOff!==true,tip=tipOn?`<div class="lt-tip"><i class="lt-tip-up" aria-hidden="true">${icon('arrowU',ICON_SZ.md)}</i><span>Tap the red bar to go back to <b>${hesc(cur)}</b>.</span><button type="button" data-lttip>Don’t show again</button></div>`:'';
  let h=`<section class="pw-home lt">${tip}<div class="card lt-plan"><details class="lt-fold" data-pw-fold="live:${todayISO}" ${open?'open':''}><summary class="pw-fold-summary" aria-expanded="${open}"><span class="lt-head"><small>Today · ${hesc(pwDate(todayISO))}</small><b>${hesc(parts)}</b></span>${icon('chevron',ICON_SZ.sm)}</summary><div class="lt-fold-body">`;
  h+=`<div class="pw-home-tools" role="group" aria-label="Plan actions">${pwAction('open','Plan','sparkle')}${pwAction('open-date','Edit','edit','',`data-date="${todayISO}"`)}${pwAction('paste-open','Paste','paste','',`data-date="${todayISO}"`)}${pwAction('plan-copy','Copy','copy','',`data-date="${todayISO}"`)}</div>${planCardHTML(now,true)}`;
  if(future.length)h+=`<details class="pw-later pw-later-visible" data-pw-fold="later" ${pwFoldOpen('later',false)?'open':''}><summary class="pw-later-heading pw-fold-summary" aria-expanded="${pwFoldOpen('later',false)}"><span>${future.length} more ${future.length===1?'plan':'plans'}</span><small>${hesc(pwWeekdays(future))}</small></summary><div class="pw-later-list">${future.map(pwLaterDayHTML).join('')}</div></details>`;
  h+=`</div></details>`;
  if(total){const pc=Math.round(done/total*100);h+=`<div class="lt-progress" role="img" aria-label="${done} of ${total} sets done"><i style="width:${pc}%"></i></div><div class="lt-count mono">${done} of ${total} ${total===1?'set':'sets'}</div>`;}
  if(!next)h+=`<p class="lt-done">Every exercise in your plan is logged.</p>`;
  h+=`</div><h2 class="lt-h">Logged today</h2><div class="card lt-log">`;
  const byEx=new Map();t.w.forEach(s=>{if(!byEx.has(s.ex))byEx.set(s.ex,[]);byEx.get(s.ex).push(s);});
  for(const [ex,list] of byEx){
    const live=exOpen(ex),part=list[list.length-1].part;
    const what=list.every(isCardio)?list.map(cardioLine).filter(Boolean).join(', '):`${list.length} ${list.length===1?'set':'sets'}`;
    h+=`<button type="button" class="lt-row${live?' on':''}" data-ex="${hesc(ex)}" data-part="${hesc(part)}"><b>${hesc(ex)}</b><span class="mono">${hesc(what)}</span></button>`;
  }
  return h+`</div></section>`;
}
document.addEventListener('click',e=>{if(!e.target.closest('[data-lttip]'))return;DB.settings.ltTipOff=true;DB.settingsAt=Date.now();save(true);render();});
/* v4.6.361: A FINISHED DAY, PLAINLY (approved mock "Today after the workout",
   Sungjee 2026-10-20). Under the day card: the next plan as one card whose arrow
   opens it with its tools (Plan, Edit, Paste, Copy) inside, the other planned
   days folded under it; then what was trained as ONE card -- each part a small
   heading with its total, each exercise a plain row. No outlined boxes, no
   ticks (on a finished day every row is done), no separate parts line. */
function closedTodayHTML(t){
  const setsOf=p=>(p?.items||[]).map(planItemShape).reduce((n,it)=>n+(it.lines||[]).reduce((s,l)=>s+(l.reps||[]).length,0),0);
  const future=[...new Set([...(DB.plan?.d>todayISO?[DB.plan.d]:[]),...Object.keys(DB.week?.days||{}).filter(d=>d>todayISO)])].filter(d=>pwSaved(d)?.items?.length).sort();
  let h='<section class="pw-home lt ld">';
  if(future.length){
    const d=future[0],plan=pwSaved(d),n=setsOf(plan),open=pwFoldOpen('next:'+d);
    const parts=pwParts(pwRead(planText(plan))).map(partLabel).join(' + ')||'Your workout';
    h+=`<h2 class="lt-h">${d===tomorrowISO()?'Tomorrow':'Next plan'}</h2><div class="card lt-plan ld-next"><details class="lt-fold" data-pw-fold="next:${d}" ${open?'open':''}><summary class="pw-fold-summary" aria-expanded="${open}"><span class="lt-head"><small>${hesc(pwDate(d))}${n?` · ${n} ${n===1?'set':'sets'}`:''}</small><b>${hesc(parts)}</b></span>${icon('chevron',ICON_SZ.sm)}</summary><div class="lt-fold-body">`;
    h+=`<div class="pw-home-tools" role="group" aria-label="Plan actions">${pwAction('open','Plan','sparkle')}${pwAction('open-date','Edit','edit','',`data-date="${d}"`)}${pwAction('paste-open','Paste','paste','',`data-date="${d}"`)}${pwAction('plan-copy','Copy','copy','',`data-date="${d}"`)}</div>${planCardHTML(plan,false)}</div></details>`;
    const rest=future.slice(1);
    if(rest.length)h+=`<details class="pw-later pw-later-visible" data-pw-fold="later" ${pwFoldOpen('later',false)?'open':''}><summary class="pw-later-heading pw-fold-summary" aria-expanded="${pwFoldOpen('later',false)}"><span>${rest.length} more ${rest.length===1?'plan':'plans'}</span><small>${hesc(pwWeekdays(rest))}</small>${icon('chevron',ICON_SZ.sm)}</summary><div class="pw-later-list ld-later-list">${rest.map(d=>{const p=pwSaved(d),k=setsOf(p),o=pwFoldOpen('later:'+d),pp=pwParts(pwRead(planText(p))).map(partLabel).join(' + ')||'Your workout';
      /* v4.6.365: each later day is the Tomorrow row again, smaller -- date and sets over the parts,
         a chevron on the right -- not the planner's raw fold (a bare disclosure triangle, the date
         and parts stacked over a right-aligned set count). One row shape for every day ahead. */
      return `<details class="lt-fold ld-later-day" data-pw-fold="later:${d}" ${o?'open':''}><summary class="pw-fold-summary" aria-expanded="${o}"><span class="lt-head"><small>${hesc(pwDate(d))}${k?` · ${k} ${k===1?'set':'sets'}`:''}</small><b>${hesc(pp)}</b></span>${icon('chevron',ICON_SZ.sm)}</summary><div class="lt-fold-body"><div class="pw-home-tools" role="group" aria-label="Actions for ${hesc(pwDate(d))} plan">${pwAction('open-date','Edit','edit','',`data-date="${d}"`)}${pwAction('paste-open','Paste','paste','',`data-date="${d}"`)}${pwAction('plan-copy','Copy','copy','',`data-date="${d}"`)}</div>${planCardHTML(p,false)}</div></details>`;}).join('')}</div></details>`;
    h+='</div>';
  }else{
    h+=`<h2 class="lt-h">Next plan</h2><div class="card lt-plan"><p class="lt-done">Nothing planned yet.</p><div class="pw-home-tools" role="group" aria-label="Plan actions">${pwAction('open','Plan','sparkle')}${pwAction('paste-open','Paste','paste','',`data-date="${tomorrowISO()}"`)}</div></div>`;
  }
  const byPart=new Map();t.w.forEach(s=>{if(!byPart.has(s.part))byPart.set(s.part,[]);byPart.get(s.part).push(s);});
  h+=`<h2 class="lt-h">Trained today</h2><div class="card lt-log ld-log">`;
  for(const [part,sets] of byPart){
    const vol=sets.reduce((a,s)=>a+volOf(s),0),km=sets.filter(s=>s.ex==='Run').reduce((a,s)=>a+s.w,0);
    const lifts=sets.filter(s=>!isCardio(s)),reps=lifts.every(s=>!isHold(s.su))?lifts.reduce((a,s)=>a+(s.reps||[]).reduce((x,y)=>x+y,0),0):0;
    const total=km?`${dDisp(km)} ${DU()}`:vol?`${vDisp(vol)} ${U()}`:reps?`${fmt(reps)} reps`:'';
    h+=`<div class="ld-part"><b>${hesc(partLabel(part))}</b>${total?`<span class="mono">${total}</span>`:''}</div>`;
    const byEx=new Map();sets.forEach(s=>{if(!byEx.has(s.ex))byEx.set(s.ex,[]);byEx.get(s.ex).push(s);});
    for(const [ex,list] of byEx){
      const what=list.every(isCardio)?list.map(cardioLine).filter(Boolean).join(', '):`${list.length} ${list.length===1?'set':'sets'}`;
      h+=`<button type="button" class="lt-row" data-ex="${hesc(ex)}" data-part="${hesc(part)}"><b>${hesc(ex)}</b><span class="mono">${hesc(what)}</span></button>`;
    }
  }
  return h+'</div></section>';
}
function renderToday(){
  /* v4.6.311: someone who set up before companions existed meets theirs here, once */
  if(typeof adoptDue==='function'&&adoptAuto()&&!window._adoptT)window._adoptT=setTimeout(()=>{window._adoptT=0;if(adoptDue())adoptOpen();},1400);
  if(lift.plan==='workspace'){pwRender();return;}
  /* v3.3.319: the paste/preview screen is a full-tab takeover that renderLift
     has owned since v3.3.278. Now that Paste lives on Today, this tab has to
     open it too — otherwise the button the maker taps does nothing. Same
     shape as renderLift's: commit and stop. */
  if(lift.plan==='paste'||lift.plan==='preview'){ $('#view').innerHTML=planScreenHTML(); if(lift.plan==='paste') requestAnimationFrame(planBoxGrow); return; }
  if(lift.plan==='write'){ $('#view').innerHTML=writerScreenHTML(); return; }   // v3.3.400: the writer's ask screen
  if(lift.plan==='writing'){ $('#view').innerHTML=writerWaitHTML(); return; }   // v3.3.406: the wait, as a receipt
  if(refinedFlow()) planWake();
  if(d1.preview || (SEED.totals.sessions===0 && !((DB.days[todayISO]||{}).w||[]).length && !(refinedFlow()&&planningWorkspace()) && !(refinedFlow()&&planNow()))){
    $('#view').innerHTML=dayOneHTML(); return; }
  planWake();   // v3.3.397: a plan written last night for today feeds the rail now
  const P=trainingPlan();
  const t=day(todayISO);
  const logged=t.w.length>0;
  msFloorInit();
  const msN=msPending();
  const donePartsRaw=[...new Set(t.w.map(s=>s.part))];
  const doneLift=donePartsRaw.filter(p=>p!=='Run');
  const ranRaw=t.w.some(isCardio);   // v4.6.108: any cardio counts -- a ride answers the Cardio nudge
  const cur=yearCurves()[thisYear];
  const pct=cur?Math.round(cur.curve[cur.end-1]*100):0;

  let h='';
  /* v4.6.284: no Today card for the early rungs (10, 20, 30, 50). They land inside the 20-day
     trial, where the free-days card already counts the days, and DAY 20 sat on top of the
     moment the paywall arrives. They are acknowledged quietly, so none returns later. */
  if(msN&&msN<100){ DB.settings.msAck=Math.max(DB.settings.msAck||0,msN); save(true); }
  /* v4.6.284: the free-days card shows after training too (non-members, paywall live) */
  if(logged&&typeof trialCardHTML==='function') h+=trialCardHTML();
  if(msN&&msN>=100){
    const tier=msTier(msN);
    /* thousand tier: the record itself is the spectacle — the month grid
       cascades in square by square and the number lands on top. No
       confetti; the fireworks are the receipts. */
    let cascade='';
    if(tier==='thousand'){
      const gd=gridData(); const keys=Object.keys(gd.mDays).sort();
      cascade='<div class="msgrid">'+keys.map((k,i)=>
        `<i style="opacity:${(0.25+0.75*gd.mDays[k]/gd.max).toFixed(2)};animation-delay:${Math.min(i*28,1600)}ms"></i>`).join('')+'</div>';
    }
    h+=`<div class="card msmoment ${tier}" data-ms="${msN}">
      ${cascade}
      <div class="mskick">DAY</div>
      <div class="msnum" data-from="${msPrevRung(msN)}" data-to="${msN}">${fmt(msN)}</div>
      <div class="msline">${msLine(msN)}</div>
      <div class="row" style="gap:8px;margin-top:11px">
        <button class="btn ghost" id="msShare" style="flex:1;margin:0">Share as image</button>
        <button class="btn ghost" id="msDismiss" style="flex:1;margin:0">Carry on</button>
      </div>
    </div>`;
  }

  if(!logged&&!restingToday()&&refinedFlow()&&planningWorkspace()){
    $('#view').innerHTML=h+focusedTodayHTML();msCountUp();dayCountUp();return;
  }
  if(!logged){
    // ---- before the gym: what should I train
    h+=`<div class="su-hello-row">${helloCard()}${(typeof companionHTML==='function'&&companionHTML('su-hello-comp'+(restingToday()?' su-comp-rest':'')))||mascotHTML(restingToday()?'rest':'hello')}</div>${typeof trialCardHTML==='function'?trialCardHTML():''}`;
    /* v3.3.319: before the gym, the plan is what you came to read — the same
       section the mid-session branch leads with, so Today shows one thing in
       both states. Rhythm left with it; it restated the streak and the day
       count that the header already carries and that Stats tells properly. */
    h+=todayHeroHTML();
    /* v3.3.79: annotation, never homework. The button sits here; it never
       prompts, never nags, and an undeclared rest day is not a lesser rest
       day. Tap again to undo — every state walks out. Gone the moment a
       set lands (the whole !logged branch is). */
    /* v3.3.374 hid this button whenever a plan existed for today, on the
       argument that declaring a plan is itself a statement that today is not
       a rest day. v3.3.436 RESTATES: that premise died when plans stopped
       being a morning decision. The writer (v3.3.400) writes days ahead and
       the rail (v3.3.397) wakes a plan written last night; a plan is now a
       forecast, and the morning keeps its vote. On 2026-09-04 the maker had
       six exercises written for the day and no way to say "not today" --
       the one screen that could record the decision refused to ask. Pattern
       3 from the handoff: a dead constraint outliving its premise.
       The button keeps one home, plan or no plan: beneath the plan section,
       above Train next. It stays annotation, never homework (v3.3.79): the
       plan is untouched, Train next still names the plan's first exercise,
       and training always wins if a set lands anyway. */
    const _pl0=planNow();
    const _rest=!!(DB.days[todayISO]&&DB.days[todayISO].rest);
    h+=`<button class="btn ghost restbtn ${_rest?'on':''}" id="restBtn">${
      _rest?'Undo rest day':'Rest day'}</button>`;
    /* v3.3.374: WITH A PLAN, "Train next" IS THE PLAN. The planner answers
       "what should I train?" from the rotation; the moment you save a plan you
       have answered it yourself, and a card arguing with your own decision is
       noise. It names the first item you have NOT logged, not the first item:
       "first" is right until you finish it and wrong for the rest of the
       session. planLoggedToday() already drives the tick marks on the plan
       rows, so this advances with them.
       When every item is logged the card goes quiet rather than falling back
       to the rotation -- the honest next action then is the day-end button. */
    const _next=nextPlanItem();
    /* v3.3.437: RESTING ANSWERS "WHAT SHOULD I TRAIN?" WITH NOTHING, so the
       rail stops asking. Train next, the run nudge and the door to other
       parts are all one question in three voices -- a Start button under a
       declared rest day is the screen not listening.
       What replaces them is a FACT, not a prompt: which part is next, from
       the same rotation the app already trusts (or from tomorrow's saved plan
       if one exists -- the plan outranks the guess). No button on it. The
       Train tab is still one tap away in the nav; this line is not the only
       door, it is just not a door. */
    if(restingToday()){
      const _tm=tomorrowISO();
      const _wkT=DB.week&&DB.week.days&&DB.week.days[_tm];
      const _pnT=(DB.plan&&DB.plan.d===_tm)?DB.plan:null;
      const _srcT=_pnT||_wkT;
      let _label='';
      if(_srcT){
        const seen=new Set(), order=Object.keys(SEED0.catalog);
        for(const it of (_srcT.items||[])){ const pt=homePartOf(it.ex); if(pt) seen.add(pt); }
        _label=order.filter(p=>seen.has(p)).concat([...seen].filter(p=>!order.includes(p))).join(' \u00b7 ');
      }
      if(!_label) _label=P.pick||'';
      /* the carry is offered only when there is something to carry and
         nowhere it would land on: a plan of TODAY'S OWN (never the week's --
         moving one day out of a week would leave a hole in it) and no plan
         already stamped for tomorrow. */
      const _carry=!!(DB.plan&&DB.plan.d===todayISO&&(DB.plan.items||[]).length&&!_srcT);
      if(_carry){
        h+=`<div class="row spread card tmwnext" style="margin-top:11px;padding:11px 14px">
              <span class="mono" style="font-size:11px">${_label?`Tomorrow \u00b7 ${hesc(_label)}`:'Tomorrow'}</span>${
              _carry?`<button class="chip" data-carrytmw>carry today's plan →</button>`:''}</div>`;
      }
      /* v3.3.469: THE OTHER HALF. On a rest day Today carries the attendance
         card inverted -- the same section Stats shows, drawn by the same
         function, with the days you did NOT train lit in the rest green. The
         one place green enters a grid of days, and it is the day's own frame,
         shown only while the frame is true. */
      h+=currentRhythmSection(true);
      $('#view').innerHTML=h; msCountUp(); dayCountUp(); return;
    }
    if(_pl0){
      h+=`<h2>Train next</h2>`;
      if(_next){
        h+=`<div class="card tnextplan"><div class="row spread">
              <div><div style="font-family:var(--disp);font-weight:700;font-size:18px">${_next.ex}</div>
              <div class="mono muted" style="font-size:11px;margin-top:2px">next in your plan</div></div>
              <button class="chip on" data-planex="${_next.ex}">Start →</button>
            </div></div>`;
      }else{
        h+=`<div class="card"><div class="mono muted" style="text-align:center;padding:4px 0">
              Every exercise in your plan is logged.</div></div>`;
      }
    }
    else{
    h+=`<h2>Train next</h2>`;
    if(P.pick){
      const i0=P.info[P.pick];
      /* v3.3.276: the card makes ONE claim (maker's call — the two-clause
         line squeezed the Start button into a two-line wrap). The claim is
         the last real session, the fact the pick rests on; cadence and the
         overdue percentage stay in the numbers behind the pick, not on the
         card. */
      const sub = i0.live
        ? (i0.sinceF!==i0.since?`full session ${i0.sinceF}d ago`:`${i0.since}d since`)
        : (i0.days===0 ? `not trained yet` : `${i0.since}d since · ${i0.days} day${i0.days===1?'':'s'} logged`);
      h+=`<div class="card"><div class="row spread">
            <div><div style="font-family:var(--disp);font-weight:700;font-size:18px">${P.pick}</div>
            <div class="mono muted" style="font-size:11px;margin-top:2px">
              ${sub}</div></div>
            <button class="chip on" data-go="${P.pick}">Start →</button>
          </div></div>`;
      if(P.addon){
        const ai=P.info[P.addon];
        h+=`<div class="row spread card" style="margin-top:6px;padding:11px 14px">
              <span class="mono muted" style="font-size:11px">Add on: <b style="color:var(--chalk)">${P.addon}</b> · ${ai.since}d since</span>
              <button class="chip" data-go="${P.addon}">+</button></div>`;
      }
    }
    }   /* end: no plan for today -- the rotation answers instead */
    /* the run nudge and the door to other parts survive either branch: an
       add-on is not a claim about what to train, and the door is navigation. */
    if(P.run){
      h+=`<div class="row spread card" style="margin-top:6px;padding:11px 14px">
            <span class="mono muted" style="font-size:11px">Run · ${P.run.since}d since (you run most days)</span>
            <button class="chip" data-go="Run">Go</button></div>`;
    }
    /* v3.3.248: the door counts everything below the pick, cold parts
       included — before, a new user had no mains, so the way through to the
       rest of the body was missing entirely. */
    const rest=(P.mains.length?P.mains:P.coldMains).slice(1);
    if(rest.length){
      /* v3.3.86: the Readiness board is gone from Today — the Lift tab's
         part list IS that board, and Today keeps a door instead of a copy.
         One receipt survives on the door: the due count. */
      const nDue=rest.filter(p=>P.score(p)>=1).length;
      h+=`<button class="btn ghost" id="goLift" style="margin-top:11px">Train other parts${nDue?` · ${nDue} due`:''} →</button>`;
    }
    $('#view').innerHTML=h; msCountUp(); dayCountUp(); return;
  }

  // ---- mid-session: what am I doing right now
  /* v3.3.412: A CLOSED DAY POINTS FORWARD. The header already knows three
     states -- empty and breathing, red, filled and still -- but this body
     did not: after the day-end was pressed it still led with the plan,
     offered a recommendation, invited another part, and buried the one thing
     that said "closed" at the very bottom. The screen's order said KEEP GOING
     while the header said DONE.
     Order and weight fix it, not a new element. On a closed day the finished
     card LEADS; Train next and Add another part leave, because a closed day
     has no next; the plan header points to tomorrow (lift.js, the ledger
     rule); the plan card recedes to a receipt. Training Today stays: it is
     the record. No check mark, no colour, no banner -- closed is a quiet
     state, and its cue is that the screen stops asking things of you. */
  const _closed=dayClosed();
  const _closedCard=()=>{
    const _n=SEED.totals.sessions+(t.w.length?1:0);
    /* v3.3.500: THREE LINES BECOME TWO WORDS. The maker struck out "Day", the
       "· Workout complete" tail and the reopen sentence, and every strike is
       the same edit: the card was saying things the screen already says.
       The square above the number has meant a day since the app began -- that
       is the whole vocabulary -- so "Day 961" spends a word restating the
       glyph it sits under. "Workout complete" restates a card whose entire
       reason for existing is that the day is complete, and which the header
       already says in its third state. And "Another set reopens today" is a
       note about database behaviour: true, but a footnote about mechanism
       under the number that counts the streak.
       What is left is the square, the count, and the date. The aria-label
       still carries the state and the invitation for anyone who cannot see
       the card do it visually. */
    return `<button class="card dayclosed" data-replayday="1" aria-label="Day ${fmt(_n)}, ${pretty(todayISO)}. Today is complete; logging another set reopens it. Tap to see it again.">
          ${(typeof companionHTML==='function'&&companionHTML('su-hello-comp su-comp-rest crew-fit'))||mascotHTML('cool')}
          <b class="dcn">${fmt(_n)}</b>
          <span class="dcm">${_n===1?'day':'days'} of showing up</span>
        </button>`;
  };
  if(_closed) h+=_closedCard();
  if(_closed&&planningWorkspace()){h+=closedTodayHTML(t);$('#view').innerHTML=h;msCountUp();dayCountUp();return;}
  if(!_closed&&isLive()&&planningWorkspace()&&planNow()?.items?.length){
    h+=liveTodayHTML(t);$('#view').innerHTML=h;msCountUp();dayCountUp();return;
  }
  h+=todayHeroHTML();
  /* v3.3.374: MID-SESSION IS WHEN "what's next" ACTUALLY MATTERS, and until
     now Today answered it only BEFORE the first set -- the moment the first
     set landed, this branch took over and Train next disappeared entirely.
     That made "the first UNLOGGED item" indistinguishable from "the first
     item": by the time one was logged, the card was already gone. The rule
     was unobservable, which is another way of saying it was not a rule.
     Here it is real. The card advances as each exercise is logged, and goes
     quiet when the plan is done rather than sending you back to the rotation
     -- the next action then is the day-end button. */
  {
    const _plm=planNow();
    /* v3.3.412: no recommendation on a closed day -- the question "what
       should I train?" was answered when the day-end was pressed. */
    const _nx=(_plm&&!_closed)?(_plm.items||[]).find(i=>!planLoggedToday(i.ex)):null;
    if(_nx) h+=`<h2>Train next</h2>
      <div class="card tnextplan"><div class="row spread">
        <div><div style="font-family:var(--disp);font-weight:700;font-size:18px">${_nx.ex}</div>
        <div class="mono muted" style="font-size:11px;margin-top:2px">next in your plan</div></div>
        <button class="chip on" data-planex="${_nx.ex}">Start →</button>
      </div></div>`;
  }
  /* v3.3.285: the parts trained today move off the heading onto their own
     quiet line. Inline, four parts wrapped into the title and collided with
     it; the heading is a label and should stay one short thing. */
  h+=`<h2>${_closed&&planningWorkspace()?'Trained today':'Training today'}</h2>`;
  if(!_closed&&isLive()&&mascotMode()!=='off'){
    const activeSets=workoutCompletionMetrics({...t,completedAt:Date.now()}).sets;   // v4.6.69: the session you are in, not the day
    h+=`<div class="su-active-row"><div><strong>You're in.</strong><span class="mono muted">${activeSets} set${activeSets===1?'':'s'} logged</span></div>${(typeof companionHTML==='function'&&companionHTML('su-hello-comp su-comp-active'))||mascotHTML('active')}</div>`;
  }
  if(doneLift.length) h+=`<div class="todaypartsline mono">${doneLift.map(partLabel).join(' · ')}</div>`;
  const byPart={};
  t.w.forEach(s=>{(byPart[s.part]=byPart[s.part]||[]).push(s);});
  for(const [part,sets] of Object.entries(byPart)){
    const byEx={};
    sets.forEach(s=>{(byEx[s.ex]=byEx[s.ex]||[]).push(s);});
    const vol=sets.reduce((a,s)=>a+volOf(s),0);
    const km=sets.filter(s=>s.ex==='Run').reduce((a,s)=>a+s.w,0);
    h+=`<div class="card" style="margin-bottom:6px">
          <div class="row spread" style="margin-bottom:6px">
            <b style="font-size:14px">${part}</b>
            <span class="mono muted" style="font-size:11px">${vol?vDisp(vol)+' '+U():''}${km?dDisp(km)+' '+DU():''}</span>
          </div>`;
    for(const [ex,list] of Object.entries(byEx)){
      const detail = list.every(isCardio)
        ? list.map(cardioLine).join('  ')
        : list.map(s=>`${wLabel(ex,s.w)}×${s.reps[0]}`).join('  ');
      const open=exOpen(ex)&&!(_closed&&planningWorkspace());
      /* v3.3.299: no trailing arrow — the row is the button, and the arrow
         was the middle-child-of-space-between problem in a third place. The
         sets count moves into a fixed column so it lines up down the card. */
      h+=`<button class="item todayrow ${open?'':'fin'}" data-ex="${ex}" data-part="${part}">
            <span style="flex:1;min-width:0"><b>${ex}</b><div class="sub">${detail}</div></span>
            <span class="tsets">${list.length} set${list.length>1?'s':''}</span>
          </button>`;
    }
    if(partOpen(part)&&!(_closed&&planningWorkspace())) h+=`<button class="chip on ${isLive()?'livego':''}" data-go="${part}" style="margin-top:2px">Continue ${part} →</button>`;
    h+=`</div>`;
  }

  // still worth a nudge if the run isn't in yet
  if(!ranRaw && P.run && !(_closed&&planningWorkspace())){
    h+=`<div class="row spread card" style="margin-top:6px;padding:11px 14px">
          <span class="mono muted" style="font-size:11px">Cardio not logged yet · ${P.run.since}d since</span>
          <button class="chip" data-go="Run">Go</button></div>`;
  }

  /* v3.3.371: the ORDER here was already right and I said otherwise -- the
     chips come first, the button that ends the day comes last, which is the
     correct sequence for the last thing you do. The real fault was that the
     one action closing the session looked like every other button and sat
     wherever the page happened to end, often below the fold. It is the only
     route to the day-done ceremony (v3.3.369), so a person could finish a
     workout and never find the moment the app was built to give them.
     It STICKS to the bottom of the screen while a session is live, and it
     names the count -- so it states what you are about to put in the book
     rather than asking for a decision. */
  /* v3.3.375: the button sits DIRECTLY UNDER THE WORK IT CLOSES, above the
     offer to add more. v3.3.371 made it position:sticky so it could not fall
     below the fold -- and sticky with a `bottom` offset pins an element
     UPWARDS when its natural place is lower than the pin line, so on a short
     page it lifted off the end of the document and painted straight over the
     part chips that precede it. It was reachable and in the way.
     In flow, immediately after the session cards, it is reachable for the
     same reason without overlapping anything: you meet it the moment you
     finish reading what you did, and "Add another part" reads as the
     alternative to it rather than as something to scroll past first. */
  h+=dayCloseHTML();   // v3.3.457: the same close Train has, from one helper
  /* v3.3.376: THE FINISHED DAY IS WORTH LOOKING AT. What stood here was two
     lines of grey mono -- "Workout complete . 23 sets - logging another set
     reopens it" -- which is the end state of the thing this whole app is
     about, written as a footnote about database behaviour. The day you closed
     out had less visual weight than a part chip.
     It is a card now, in the SAME PLACE the button was, so the page does not
     change shape when you finish: today's square filled, the day count, and
     the same words the ceremony uses. One voice for the moment and its
     aftermath.
     TAP TO SEE IT AGAIN. The once-a-day stamp exists so the ceremony does not
     INTERRUPT you twice; a deliberate tap is not an interruption, so it
     replays on request and never on arrival. Re-opening Today on a finished
     day stays quiet.
     The reopen sentence survives, small and underneath: it is a mechanic, and
     true, but it is not the point. */
  /* v3.3.412: the finished card moved to the TOP of a closed day (above).
     Down here it was the last thing on the page, after an invitation to add
     more -- the order said keep going. And a closed day offers no other
     parts: the chips are for an open session. */
  if(_closed){ $('#view').innerHTML=h; msCountUp(); dayCountUp(); return; }
  h+=`<h2 class="quiet">Add another part</h2><div class="chips">`;
  P.mains.filter(p=>!doneLift.includes(p)).forEach(p=>{
    const i1=P.info[p];
    h+=`<button class="chip" data-go="${p}">${p}<span class="n">${i1.since===0?'today':i1.since+'d ago'}</span></button>`;
  });
  P.addons.filter(p=>!doneLift.includes(p)).forEach(p=>{
    h+=`<button class="chip" data-go="${p}">${p}<span class="n">${P.info[p].since}d ago</span></button>`;
  });
  h+=`</div>`;
  /* the count is the whole argument for pressing it: it names what you are
     about to put in the book, so the button states a fact rather than asking
     for a decision. */
  $('#view').innerHTML=h; msCountUp(); dayCountUp();
}

/* ---------- Lift ---------- */
function exLastFor(ex){
  let last=SEED.exLast[ex]||null;
  for(const [d,v] of Object.entries(DB.days))
    if(v.w.some(s=>s.ex===ex) && (!last||d>last)) last=d;
  return last;
}
/* sessions in the last 365 days — how much of a staple this lift is */
function exFreq(ex){
  const cut=new Date(); cut.setDate(cut.getDate()-365);
  const cISO=cut.toLocaleDateString('en-CA');
  let n=SEED.exFreq[ex]||0;                       // true count from the imported history
  for(const [d,v] of Object.entries(DB.days))     // plus anything logged in the app since
    if(d>=cISO && d>SEED.totals.last && v.w.some(s=>s.ex===ex)) n++;
  return n;
}
/* Go-to = a lift you're actually running right now: done in the last 60 days,
   and more than a one-off. Everything else with history is Occasional.        */
function exTier(ex){
  const ov=(DB.settings.tierOv||{})[ex];
  const last=exLastFor(ex);
  if(!last) return 'new';
  const ago=daysAgo(last);
  if(ov==='core') return ago<=365 ? 'goto' : 'sometimes';   // pins expire after a year away
  if(ov==='other') return 'sometimes';
  /* v3.3.146: what you did TODAY is today's staple, whatever the lifetime
     count says — a deadlift after 1,162 days away sat in "Sometimes" while
     its sets were on the board, which read as the app disagreeing with the
     day. Self-correcting by construction: tomorrow ago=1 and the habit
     heuristics below take over, so one visit does not fake a staple — it
     only counts as one while it IS one. The explicit 'other' pin above
     still wins: a lift you demoted by hand stays demoted. */
  if(ago===0) return 'goto';
  // A repeated RECENT habit is a go-to, whatever the lifetime count says —
  // switching staples (Smith → Barbell incline) shows up here within weeks.
  const recent60=histFor(ex).filter(p=>daysAgo(p.d)<=60).length;
  if(recent60>=2) return 'goto';
  return (ago<=60 && exFreq(ex)>=3) ? 'goto' : 'sometimes';
}

/* Completed-set progression lives in progression.js. histFor remains the
   existing coaching summary; it is not a chart data source. */
/* last ~14 sessions of top-set weight, as a tiny sparkline */
/* Stuck at the same top weight for 3+ sessions? Say so, once, quietly.
   Bodyweight-only moves are excluded (their progression is reps, not load), and a
   dismissal sticks for that exercise until the weight actually moves. */
function overloadNudge(ex){
  const pts=histFor(ex);
  if(pts.length<3) return null;
  const dis0=DB.settings.nudgeX||{};
  // BODYWEIGHT: you can't "add 2.5 kg to yourself" — progression is REPS.
  if(isBody(ex)){
    const rT=pts[pts.length-1].r;
    if(!rT) return null;
    let nr=0;
    for(let i=pts.length-1;i>=0;i--){ if(pts[i].r===rT) nr++; else break; }
    if(nr<3) return null;
    if(dis0[ex]==='r'+rT) return null;
    return {mode:'reps', n:nr, topR:rT, nextR:rT+1};
  }
  const top=pts[pts.length-1].w;
  if(!top) return null;
  let n=0;
  for(let i=pts.length-1;i>=0;i--){ if(Math.abs(pts[i].w-top)<0.01) n++; else break; }
  if(n<3) return null;
  const dis=DB.settings.nudgeX||{};
  if(dis[ex]===top) return null;                 // dismissed at this exact weight
  // Next weight = the smallest step UP you've ever actually used on this exercise
  // (your history is the gym's inventory). Only if nothing above exists, fall back
  // to an equipment-honest increment — dumbbells rack in 2s, not 2.5s.
  const used=[...new Set([
    ...Object.values(SEED.sessions).flat().filter(r=>r[1]===ex).map(r=>r[2]),
    ...Object.values(DB.days).flatMap(v=>v.w.filter(s=>s.ex===ex).map(s=>s.w))
  ])].filter(w=>w>top+0.01).sort((a,b)=>a-b);
  // Suggestions are IRON, not arithmetic (Sungjee's rule: never decimals):
  // every candidate — history included — snaps to buildable, integer loads.
  // kg: barbell/smith = bar + 5 kg total steps; dumbbells = whole-kg bells;
  // stacks = 5s. lb: 10 lb barbell steps; 5 lb bells/stacks. Must beat the top.
  /* v3.3.251: everything that is not a bar snaps through wLaw — the same
     authority the +/- buttons obey. These two had drifted: this snapper has
     always put stacks on 5s ("stacks = 5s", below the line above) while the
     stepper moved them by 2, so Today could name 45 kg on a Chest Press and
     the stepper could not land there — 44 went to 46. A suggestion you
     cannot reach is worse than none.
     The bar keeps its own lb branch on purpose: a 20 kg bar is 44.1 lb, so
     the honest law would print decimals, and suggestions are IRON. */
  const eq=equipOf(ex), bb=usesPlates(ex);   // v4.6.61: the EZ bar is a bar too — one definition, in usesPlates
  const {s:lawS,a:lawA}=wLaw(ex);
  const snapSug=v=>{
    if(bb){
      if(isLb()) return toKg(Math.round(toU(v)/10)*10);
      const bar=barKg(ex);
      return bar+Math.round((v-bar)/5)*5;
    }
    return toKg(Math.max(lawA, lawA+Math.round((toU(v)-lawA)/lawS)*lawS));
  };
  const step=bb?(isLb()?toKg(10):5):toKg(lawS);
  let next=snapSug(used.length?used[0]:top+step);
  while(next<=top+0.01) next+=step;
  return {mode:'w', n, top, next};
}
function histFor(ex){
  const pts=(SEED.hist[ex]||[]).map(([d,w,r])=>({d,w,r}));
  for(const [d,v] of Object.entries(DB.days)){
    const sets=v.w.filter(s=>s.ex===ex);
    if(!sets.length) continue;
    const w=Math.max(...sets.map(s=>s.w));
    /* SLICE 3: a hold's number is seconds; it is not a rep count and cannot
       be the day's best one. */
    const r=Math.max(0,...sets.filter(s=>!isHold(s.su)).flatMap(s=>s.reps));
    const i=pts.findIndex(p=>p.d===d);
    if(i>=0) pts[i]={d,w,r}; else pts.push({d,w,r});
  }
  return pts.sort((a,b)=>a.d.localeCompare(b.d)).slice(-14);
}


/* D2: the marker GLIDES to its new rank — one motion, ≤400ms, honest events only */


/* ---------- D2 close: the milestone moment ----------
   One earned full-screen beat when a lifetime hundred falls. Iron-themed:
   the number, the unit, the day count. No confetti. Tap anywhere to return.
   One entrance motion, 380ms, none under reduced-motion. */
function msMoment(hit){
  let ov=document.getElementById('msOv');
  if(!ov){
    ov=document.createElement('div'); ov.id='msOv';
    document.body.appendChild(ov);
    ov.addEventListener('click',()=>{ ov.style.display='none'; });
  }
  const totalDays=SEED.totals.sessions+((((DB.days[todayISO]||{}).w)||[]).length?1:0);
  ov.innerHTML=`<div class="msIn">
    <div class="msNum mono">${fmt(hit)}</div>
    <div class="msUnit mono">LIFETIME ${DU()==='km'?'KILOMETERS':'MILES'}</div>
    <hr class="msRule">
    <div class="msSub mono">crossed ${wd(todayISO)} · day ${fmt(totalDays)} of showing up</div>
    <div class="msTap">tap to continue</div>
  </div>`;
  ov.style.display='flex';
}

/* v4.6.277: first-run tips; v4.6.279: one for every way in. Each tip shows once, at the moment it's
   needed, for a new user only (the first run turns them on; Settings → Show tips again turns them
   back on). A tip goes on its own when you do what it says, or on Got it. Pip waves in, two rings
   pulse round the thing meant; nothing is blocked. Hidden while a dialog, the first run or a text
   field is up -- unless the tip's own target is inside that screen (the importer).
     Train   ex  the exercise list       set  the set screen       fin  Finish, after the first set
     Plan    pd  the Dates calendar      pp   Plan / Paste         pe   ✎ on the Edit page    pt  Start, on Today
     Import  i1  Upload a CSV            i2   the items to check   i3   View my progress
     Look    l1  Choose exercise         l2   the Stats tab        l3   the Settings tab
   State: DB.settings.tips = {on:1, <key>:1 …}; `on` drops when every key is done. */
const TIPS=[
  {k:'set',sel:'#addrep',t:'Swipe for reps, then tap Add set',s:'One set is a day shown up.',dir:'up',ax:.5,r:18,done:'#addrep',also:['ex']},
  {k:'ex',sel:'#view [data-ex]',when:()=>view==='lift'&&!document.getElementById('addrep'),t:'Tap any exercise to log it',dir:'down',ax:.14,r:20,done:'#view [data-ex]'},
  {k:'fin',sel:'#liveWorkoutFinish',when:t=>t.set||(t.ex&&!document.getElementById('addrep')),t:'Tap Finish when you’re done',s:'Or keep adding sets and exercises.',dir:'up',ax:.5,r:999,done:'#liveWorkoutFinish'},
  {k:'pd',sel:()=>`.pf-dates-page [data-pw="date"][data-date="${todayISO}"]`,t:'Tap the days you’ll train',s:'Today is picked. Tap more days to add them.',dir:'down',ax:.5,r:12,done:'.pf-dates-page [data-pw="date"]'},
  {k:'pp',sel:'.pf-dates-page [data-pw="pf-generate"]',when:t=>t.pd,t:'Tap Plan and we’ll write the workouts',s:'Or Paste one from a coach.',dir:'down',ax:.5,r:16,done:'[data-pw="pf-generate"],[data-pw="paste"],[data-pw="paste-open"]'},
  {k:'pe',sel:'.pf-routine-page [data-pw="pf-row-toggle"]',t:'Tap ✎ to change weights or reps',s:'Happy with it? Save at the bottom.',dir:'down',ax:.5,r:12,done:'[data-pw="pf-row-toggle"],[data-pw="pf-save"]'},
  {k:'pt',sel:'#view .today-focus-card .btn[data-ex]',when:()=>view==='today',t:'Your plan waits here',s:'Tap Start when you’re at the gym.',dir:'up',ax:.5,r:14,done:'#view .today-focus-card .btn[data-ex]'},
  {k:'i1',sel:'#imp [data-imp="file"]',when:()=>!document.querySelector('#imp .im-item'),t:'Export from Strong or Hevy, then upload it here',s:'The steps are under How to export.',dir:'up',ax:.5,r:20,done:'#imp [data-imp="file"]'},
  {k:'i2',sel:'#imp .im-item:not(.im-ok):not(.im-ready)',t:'Check the items marked for you',s:'Nothing is saved until you tap Import.',dir:'up',ax:.5,r:18,done:'#imp [data-imp="confirm"],#imp [data-imp="part"],#imp [data-imp="keep"],#imp [data-imp="toconfirm"]'},
  {k:'i3',sel:'#imp [data-imp="progress"]',t:'Your past days count now',s:'See them in your progress.',dir:'down',ax:.5,r:16,done:'#imp [data-imp="progress"],#imp [data-imp="log"],#imp [data-imp="undo"]'},
  {k:'l1',sel:'#goLift',when:()=>view==='today'&&tipLogged()===0,t:'Ready when you are',s:'Choose an exercise to log your first set.',dir:'up',ax:.5,r:12,done:'#goLift'},
  {k:'l2',sel:'#nav [data-v="stats"]',when:t=>view==='today'&&(t.l1||t.pt||tipLogged()>0),t:'Your progress lives in Stats',s:'It fills in as you log.',dir:'down',ax:.5,r:20,done:'#nav [data-v="stats"]'},
  {k:'l3',sel:'#nav [data-v="sync"]',when:t=>view==='today'&&t.l2,t:'Everything you set up is in Settings',s:'Units, body parts, and these tips.',dir:'down',ax:.5,r:20,done:'#nav [data-v="sync"]'}
];
const TIP_BY=Object.fromEntries(TIPS.map(x=>[x.k,x]));
let tipCur=null,tipQ=0;
function tipLogged(){return typeof loggedDays==='function'?loggedDays():Object.values(DB.days||{}).filter(d=>d&&(d.w||[]).length).length;}
function tipSel(c){return typeof c.sel==='function'?c.sel():c.sel;}
function tipsState(){const t=DB.settings.tips;return t&&typeof t==='object'?t:null;}
function tipsStart(){DB.settings.tips={on:1};DB.settingsAt=Date.now();}
function tipDone(k){const t=tipsState();if(!t||t[k])return;t[k]=1;(TIP_BY[k]?.also||[]).forEach(x=>t[x]=1);if(TIPS.every(x=>t[x.k]))t.on=0;DB.settingsAt=Date.now();save(true);if(tipCur?.k===k)tipHide();tipQueue();}
function tipVisible(el){if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&getComputedStyle(el).visibility!=='hidden';}
function tipBlocked(el){
  if(document.querySelector('#onb:not([hidden])'))return true;
  const a=document.activeElement;if(a&&a.matches&&a.matches('input,textarea,select,[contenteditable]'))return true;
  return [...document.querySelectorAll('[aria-modal="true"],#imp')].some(x=>!x.hidden&&!x.contains(el)&&x.getClientRects().length>0&&getComputedStyle(x).visibility!=='hidden'&&+getComputedStyle(x).opacity>0);
}
function tipWhich(){
  const t=tipsState();if(!t||!t.on)return null;
  for(const c of TIPS){
    if(t[c.k]||(c.when&&!c.when(t)))continue;
    const el=document.querySelector(tipSel(c));
    if(tipVisible(el)&&!tipBlocked(el))return c.k;
  }
  return null;
}
function tipHide(now){
  if(!tipCur)return;const {n,ring}=tipCur;tipCur=null;
  if(now||!n.isConnected){n.remove();ring.remove();return;}
  n.classList.add('out');ring.classList.add('out');setTimeout(()=>{n.remove();ring.remove();},300);
}
/* v4.6.306: THE TIP RIDES WITH THE PAGE. It was position:fixed and re-placed on every scroll
   event; iOS scrolls on the compositor and fires scroll late, so the bubble and the ring trailed
   the button a frame behind and jittered. Now they sit in the same layer as their target: in the
   page (absolute, page coordinates), inside a scrolling pop-up (absolute, in that pop-up), or
   fixed only when the target itself is fixed (the tab bar, the header). Scrolling moves them with
   the target natively, and a scroll only rechecks, writing the same numbers. The side (above or
   below) is chosen when the tip appears, so it can't flip mid-scroll. */
function tipHost(el){
  for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){
    const cs=getComputedStyle(a);
    if(/(auto|scroll)/.test(cs.overflowY)&&a.scrollHeight>a.clientHeight+1&&cs.position!=='static')return {host:a,mode:'in'};
    if(cs.position==='fixed'||cs.position==='sticky')return {host:document.body,mode:'fixed'};
  }
  return {host:document.body,mode:'page'};
}
function tipPlace(fresh){
  if(!tipCur)return;const {n,ring,k}=tipCur,c=TIP_BY[k],el=document.querySelector(tipSel(c));
  if(!tipVisible(el)){tipHide(true);return;}
  const r=el.getBoundingClientRect(),{host,mode}=tipHost(el);
  if(n.parentNode!==host){host.append(ring,n);}
  const pos=mode==='fixed'?'fixed':'absolute';n.style.position=ring.style.position=pos;
  /* v4.6.308: a tip in the page passes UNDER the header and the tab bar (z 20/30) as it scrolls,
     like the page itself; one on the bars or in a pop-up stays on top */
  const under=mode==='page';n.style.zIndex=under?'19':'';ring.style.zIndex=under?'18':'';
  let ox=0,oy=0;
  if(mode==='page'){ox=scrollX;oy=scrollY;}
  else if(mode==='in'){const h=host.getBoundingClientRect();ox=host.scrollLeft-h.left-host.clientLeft;oy=host.scrollTop-h.top-host.clientTop;}
  const px=v=>Math.round(v*2)/2+'px';
  Object.assign(ring.style,{left:px(r.left+ox),top:px(r.top+oy),width:px(r.width),height:px(r.height)});
  /* the rings grow ~10px each side whatever the target's size: scale per axis */
  ring.style.setProperty('--tip-sx',((r.width+28)/(r.width+8)).toFixed(4));ring.style.setProperty('--tip-sy',((r.height+28)/(r.height+8)).toFixed(4));
  const w=n.offsetWidth,h=n.offsetHeight,left=Math.max(14,Math.min(innerWidth-14-w,r.left+r.width*c.ax-w/2));
  let dir=tipCur.dir;
  if(fresh||!dir){
    /* the room above ends at the header and below at the tab bar, not the screen's edges */
    const top=under?(document.querySelector('header')?.getBoundingClientRect().bottom||0):0,bottom=under?(document.getElementById('nav')?.getBoundingClientRect().top||innerHeight):innerHeight;
    dir=c.dir;if(dir==='down'&&r.top-h-14<top+8)dir='up';if(dir==='up'&&r.bottom+16+h>bottom-8)dir='down';tipCur.dir=dir;}
  n.classList.toggle('up',dir==='up');n.classList.toggle('down',dir==='down');
  n.style.left=px(left+ox);n.style.top=px((dir==='down'?r.top-h-14:r.bottom+16)+oy);
  const ax=Math.max(18,Math.min(w-32,r.left+r.width*c.ax-left-7));
  n.style.setProperty('--tip-ax',ax+'px');n.style.transformOrigin=`${ax+7}px ${dir==='down'?'100%':'0%'}`;
}
/* A still PNG, not the 3D Pip: the pill is ink, so Pip takes the opposite tone (white on black,
   charcoal on white), and a tip shouldn't spin up a WebGL scene. */
function tipPip(){if(typeof mascotMode==='function'&&mascotMode()==='off')return '';const comp=typeof companionHTML==='function'?companionHTML('tip-pip tip-comp'):'';if(comp)return comp;return `<img class="tip-pip" src="assets/mascot-${DB.settings.companionName&&DB.settings.clubAvatar==='pip'?'blue':document.documentElement.dataset.theme==='dark'?'charcoal':'white'}.png" alt="" width="360" height="220" aria-hidden="true">`;}
function tipShow(k){
  const c=TIP_BY[k];tipHide(true);
  const n=document.createElement('div');n.className='tipn';n.setAttribute('role','status');n.dataset.tip=k;
  n.innerHTML=tipPip()+`<span class="tipt">${c.t}${c.s?`<small>${c.s}</small>`:''}</span><button type="button" data-tip-ok>Got it</button>`;
  const ring=document.createElement('div');ring.className='tipr';ring.style.setProperty('--tip-r',c.r+'px');ring.setAttribute('aria-hidden','true');
  document.body.append(ring,n);tipCur={n,ring,k};tipPlace(true);
}
function tipCheck(){
  tipQ=0;const k=tipWhich();
  if(!k){if(tipCur)tipHide(true);return;}
  if(tipCur&&tipCur.k===k){tipPlace();return;}
  tipShow(k);
}
function tipQueue(){if(tipQ||(!tipCur&&!tipsState()?.on))return;tipQ=setTimeout(tipCheck,350);}
document.addEventListener('click',e=>{
  const t=tipsState();if(!t||!t.on)return;
  if(e.target.closest('[data-tip-ok]')){tipDone(e.target.closest('.tipn')?.dataset.tip);return;}
  const hit=TIPS.find(c=>!t[c.k]&&e.target.closest(c.done));
  if(hit)tipDone(hit.k);else tipQueue();
},true);
let tipRaf=0;addEventListener('scroll',()=>{if(tipCur&&!tipRaf)tipRaf=requestAnimationFrame(()=>{tipRaf=0;tipPlace();});},{passive:true,capture:true});
addEventListener('resize',()=>{if(tipCur)tipCur.dir=null;tipQueue();});
document.addEventListener('focusin',()=>tipQueue());document.addEventListener('focusout',()=>tipQueue());
new MutationObserver(()=>{const t=tipsState();if(t&&t.on)tipQueue();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
function tipsSettingsHTML(){return `<button class="btn ghost" data-tips-again style="margin:6px 0 0">Show tips again</button>`;}
document.addEventListener('click',e=>{if(!e.target.closest('[data-tips-again]'))return;tipsStart();save(true);toast('Tips are back.');});
/* v4.6.372: the Routine screen's drag. A chip from the tray or a session, or a
   session's handle, lifts after 7px of travel: a lifted copy follows the
   finger, a session under it lights as the drop target, and letting go adds,
   moves or reorders. Below 7px it is a tap and the tap alternatives run.
   Reduced motion keeps the lift, drops the settle. */
let onbDrag=null,onbDragJust=false;
document.addEventListener('pointerdown',e=>{
  if(!onbF||onbStep!=='routine'||onbF.sheet||e.button>0)return;
  const el=e.target.closest('#onb [data-rtdrag],#onb [data-rthandle]');if(!el)return;
  if(el.dataset.rtdrag&&!onbF.edit)return;
  onbDrag={x:e.clientX,y:e.clientY,id:e.pointerId,part:el.dataset.rtdrag||null,from:el.dataset.rtfrom!=null?+el.dataset.rtfrom:null,card:el.dataset.rthandle!=null?+el.dataset.rthandle:null,on:false,ghost:null,src:el};
});
/* v4.6.378: A SESSION MOVES AS ITSELF. Dragging a session lifted a small
   capsule with its name, so nothing on screen said "this card is moving". Now
   the whole card lifts -- title, chips and all -- tilted and raised under the
   finger; where it came from stays as a dashed slot; the other sessions slide
   out of the way as it passes, and each card's day reads the day it would land
   on. Letting go settles the card into its slot. Chips keep their capsule:
   a chip is the whole of itself already. */
function onbLiftCard(D,e){   // v4.6.387: the card itself moves (no copy, no empty slot) -- what you hold is what you see
  const card=D.src.closest('.ob-rt-ses'),sc=document.getElementById('onb');if(!card||!sc)return false;
  const list=[...sc.querySelectorAll('.ob-rt-list .ob-rt-ses[data-rtcard]')],tops=list.map(c=>c.getBoundingClientRect().top),hs=list.map(c=>c.offsetHeight);
  const gap=list.length>1?Math.max(0,tops[1]-tops[0]-hs[0]):6;
  Object.assign(D,{ghost:null,cardEl:card,list,tops,hs,gap,y0:e.clientY,dy:e.clientY-card.getBoundingClientRect().top,h:card.offsetHeight,scroll0:sc.scrollTop,to:D.card});
  card.classList.add('ob-rt-moving');requestAnimationFrame(()=>card.classList.add('up'));
  document.getElementById('onb').classList.add('ob-rt-known');onbF.moved=true;
  return true;
}
function onbShift(D,from,to){const sum=(a,b)=>{let t=0;for(let k=a;k<=b;k++)t+=D.hs[k]+D.gap;return t;};return to>from?sum(from+1,to):to<from?-sum(to,from-1):0;}
function onbCardTo(D,y){
  const sc=document.getElementById('onb'),ds=sc.scrollTop-D.scroll0,mid=y-D.dy+D.h/2;let to=0,best=Infinity;
  D.tops.forEach((t,i)=>{const d=Math.abs(t-ds+D.hs[i]/2-mid);if(d<best){best=d;to=i;}});
  if(to===D.to)return;D.to=to;const from=D.card,step=D.hs[from]+D.gap;
  D.list.forEach((c,j)=>{const k=j===from?to:from<to&&j>from&&j<=to?j-1:from>to&&j>=to&&j<from?j+1:j;
    if(j!==from)c.style.transform=k===j?'':`translateY(${k<j?-step:step}px)`;const day=c.querySelector('.ob-rt-day');if(day)day.textContent=onbDayLab(k);});
  try{navigator.vibrate&&navigator.vibrate(6);}catch(_){}
}
document.addEventListener('pointermove',e=>{
  const D=onbDrag;if(!D||e.pointerId!==D.id)return;
  if(!D.on){if(Math.hypot(e.clientX-D.x,e.clientY-D.y)<=7)return;D.on=true;
    if(!(D.card!=null&&onbLiftCard(D,e))){const g=document.createElement('div');g.className='ob-rt-ghost';g.textContent=D.part?partLabel(D.part):onbF.cards[D.card]?.name||'';document.getElementById('onb').appendChild(g);D.ghost=g;D.src.classList.add('ob-lifted');}
    document.documentElement.classList.add('ob-dragging');}
  e.preventDefault();
  if(D.cardEl){D.cardEl.style.translate=`0 ${e.clientY-D.y0+document.getElementById('onb').scrollTop-D.scroll0}px`;onbCardTo(D,e.clientY);}
  else{D.ghost.style.transform=`translate(${e.clientX-30}px,${e.clientY-28}px) rotate(-3deg)`;
    document.querySelectorAll('#onb .ob-rt-ses.ob-drop').forEach(c=>c.classList.remove('ob-drop'));
    const t=document.elementFromPoint(e.clientX,e.clientY)?.closest('#onb [data-rtcard]');
    if(t&&!(D.part&&+t.dataset.rtcard===D.from))t.classList.add('ob-drop');}
  /* keep a long list in reach: scroll the page near its edges */
  const sc=document.getElementById('onb'),r=sc.getBoundingClientRect();if(e.clientY>r.bottom-70)sc.scrollTop+=8;else if(e.clientY<r.top+90)sc.scrollTop-=8;
  if(D.cardEl)onbCardTo(D,e.clientY);
},{passive:false});
function onbDragEnd(e,cancel){
  const D=onbDrag;if(!D||e.pointerId!==D.id)return;onbDrag=null;
  document.documentElement.classList.remove('ob-dragging');
  if(!D.on)return;
  onbDragJust=true;setTimeout(()=>{onbDragJust=false;},250);
  if(D.cardEl){
    const to=cancel?D.card:D.to,c=D.cardEl,still=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const land=()=>{if(to!==D.card)onbMove(D.card,to);else onbRender();};
    if(still){land();return;}
    c.classList.remove('up');c.style.transition='translate .2s var(--settle),scale .2s,rotate .2s,box-shadow .2s';c.style.translate=`0 ${onbShift(D,D.card,to)}px`;setTimeout(land,210);return;
  }
  D.ghost?.remove();D.src.classList.remove('ob-lifted');
  document.querySelectorAll('#onb .ob-rt-ses.ob-drop').forEach(c=>c.classList.remove('ob-drop'));
  if(cancel)return;
  const t=document.elementFromPoint(e.clientX,e.clientY)?.closest('#onb [data-rtcard]');if(!t)return;
  onbPut(D.part,+t.dataset.rtcard,D.from);
}
document.addEventListener('pointerup',e=>onbDragEnd(e,false));
document.addEventListener('pointercancel',e=>onbDragEnd(e,true));
document.addEventListener('keydown',e=>{
  if(!onbF||onbStep!=='routine')return;
  if(onbF.sheet&&e.key==='Escape'){e.preventDefault();onbF.sheet=null;onbRender();document.querySelector('#onb [data-onbact="fchange"]')?.focus();return;}
  const h=e.target.closest&&e.target.closest('#onb [data-rthandle]');
  if(h&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();const from=+h.dataset.rthandle,to=from+(e.key==='ArrowUp'?-1:1);onbMove(from,to);document.querySelector(`#onb [data-rthandle="${Math.max(0,Math.min(to,onbF.cards.length-1))}"]`)?.focus();}
});

/* v4.6.387: the Today card's routine nudge */
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-routine-setup]')){e.preventDefault();onbRoutineOpen();}});
