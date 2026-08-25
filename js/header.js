/* ShowUp — header.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- header ---------- */
function renderHeader(){
  const _tf=document.getElementById('tipFloat'); if(_tf) _tf.hidden=true;
  const live=isLive();
  const trained=(day(todayISO).w||[]).length>0;
  const hdr=document.querySelector('header');
  hdr.classList.toggle('live',live);
  const _rd=DB.days&&DB.days[todayISO];
  hdr.classList.toggle('resting', !!(_rd&&_rd.rest&&!(_rd.w||[]).length));  // v3.3.81: the mirror of live
  const inEx = view==='lift' && lift.ex && !lift.copy;
  hdr.classList.toggle('exmode',!!inEx);
  if(inEx){
    $('#hSub').classList.remove('donetoday');   // stale ✓ from the last non-live render
    $('#hDate').textContent=lift.ex;
    const n=day(todayISO).w.filter(s=>s.ex===lift.ex).length;
    $('#hSub').textContent=`${lift.part} · ${n?n+' set'+(n>1?'s':'')+' logged':'no sets yet'}`;
    $('#hStreak').textContent='';
    return;
  }
  $('#hDate').textContent=wd(todayISO);
  const t=day(todayISO);
  const lifts=t.w.filter(s=>s.ex!=='Run');
  const km=t.w.filter(s=>s.ex==='Run').reduce((a,s)=>a+s.w,0);
  const parts=[...new Set(lifts.map(s=>s.part))];
  const bits=[];
  if(lifts.length)bits.push(lifts.length+' set'+(lifts.length>1?'s':'')+(parts.length?' · '+parts.join(' · '):''));
  if(km)bits.push(dDisp(km)+DU());
  const sub=$('#hSub');
  sub.textContent=bits.length?bits.join(' · '):'Nothing logged yet';
  // done today, workout closed → a plain, permanent ✓. Live → the pulsing dot instead.
  sub.classList.toggle('donetoday', trained && !live);
  const s=currentStreak();
  /* v3.3.79: a DECLARED rest day shows the leaf where the fire sits — the
     header's one-emoji vocabulary, second word. Fire is the burn, leaf is
     the regrowth. The streak MATH is untouched: the moment sets exist the
     flag is already gone (cleared in save()), so this branch can only hold
     on a genuinely restful day. The hero card below keeps its unchanged
     'ends at midnight' honesty — the chip states the decision, not a
     promise. */
  const _rt=DB.days&&DB.days[todayISO];
  if(_rt&&_rt.rest&&!(_rt.w||[]).length){
    $('#hStreak').textContent='🍃 rest';
    $('#hStreak').classList.remove('atrisk');
    $('#hStreak').classList.add('restchip');
  }else{
    $('#hStreak').textContent=s?'🔥 '+s+'d':'';
    $('#hStreak').classList.remove('restchip');
    $('#hStreak').classList.toggle('atrisk', streakAtRisk());
  }
  /* v3.3.243: the bar is fixed, so its height is reserved by #app — keep
     the reservation exact after every state change. */
  syncHeaderHeight(); watchHeaderHeight();
}

/* How the year is actually going: rest days, the current gap, and last year at
   this exact point in the calendar. */
function rhythm(){
  const dates=workoutDates();
  const trainedToday=dates.has(todayISO);
  const elapsed=elapsedDays();                                  // v3.3.95: one definition, shared with the chart
  const trainedYTD=[...dates].filter(d=>d.startsWith(thisYear)).length;
  const restYTD=elapsed-trainedYTD;
  const curves=yearCurves();
  const ly=String(+thisYear-1);
  const lyPct=curves[ly]?curves[ly].curve[Math.min(elapsed,curves[ly].end)-1]:null;
  const pct=trainedYTD/elapsed;
  // current gap: days since the last workout (0 if trained today)
  // v3.2.2: rest days exist only in the PAST TENSE. An empty today is not a
  // rest day — it's unwritten until midnight. Count completed days only.
  let gap=0;
  const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-1);
  while(!dates.has(d.toLocaleDateString('en-CA'))){ gap++; d.setDate(d.getDate()-1); if(gap>400) break; }
  // last 21 days
  const strip=[];
  for(let i=20;i>=0;i--){
    const c=new Date(todayISO+'T00:00'); c.setDate(c.getDate()-i);
    const iso=c.toLocaleDateString('en-CA');
    strip.push({iso, on:dates.has(iso), today:iso===todayISO});
  }
  const rest21=strip.filter(s=>!s.on&&!s.today).length;
  return {pct,lyPct,ly,trainedYTD,restYTD,elapsed,gap,strip,rest21,trainedToday};
}
/* v3.3.319: rhythmCard() deleted (-2.2KB). Today was its only host and
   the maker replaced it with today's plan; a builder with no caller is
   dead weight that still has to be read. Same call as v3.3.285, which
   deleted partDigest() when its last host went. The Stats tab's Show up
   section is a different function and is untouched. */

/* D1 (DESIGN.md): explanations live behind a dot, where the sentence used
   to be. Tap ⓘ → the old note expands in place; tap again → gone. */
/* v3.3.112: one action group per section header, always right-aligned.
   Every data section carries the (i); the download icon appears only where a
   share card actually exists, so its absence reads as deliberate rather than
   missing. The (i) is chalk (passive: explains), download is accent (active:
   does something) — and the ids are the SAME ids the old in-card buttons
   used, so the router needed no change at all. */
/* v3.3.130: the per-section share button is GONE. Seven download icons were
   seven entry points to one action; they now collapse into the Report card
   carousel at the bottom of Stats. hActs keeps its name and its call sites —
   it just has nothing left to do but the tip. */
function hActs(id,text,label){
  return `<span class="hacts">${iBtn(id,text,label)}</span>`;
}
/* v3.3.152: per the disclosure rulebook — every trigger carries a SPECIFIC
   accessibility label ("About the pace chart"), not a generic "Info", plus
   aria-expanded that the open handler keeps truthful. */
function iBtn(id,text,label){
  return `<span class="notei"><button class="ibtn tipi" data-tip="${id}" aria-label="${label||'About this section'}" aria-expanded="false" aria-controls="tipFloat">i</button><span class="tipbubble" id="tip-${id}" hidden>${text}</span></span>`;
}
/* v3.3.16: the bubble is PORTALED — one #tipFloat node living directly on
   <body>, filled from the tip's content on demand. Why: every #view>.card
   carries the `rise` entrance animation with fill-mode:both, and a filled
   transform animation keeps a stacking context alive forever (WebKit honors
   the fill). Any bubble rendered inside a card can be painted over by every
   later card, whatever its z-index — v3.3.13's in-place fixed positioning
   lost to exactly this. A body-level node has no ancestor but body: nothing
   left to trap it, nothing left to clip it. */
function tipFloatEl(){
  let tf=document.getElementById('tipFloat');
  if(!tf){
    tf=document.createElement('span');
    tf.id='tipFloat'; tf.className='tipbubble float'; tf.hidden=true;
    tf.setAttribute('role','status');   // v3.3.152: announce on open, no focus move
    document.body.appendChild(tf);
  }
  return tf;
}
/* v3.3.154: the bubble is position:fixed, so scrolling detached it from its
   trigger and it floated over unrelated content until the next tap — the
   rulebook says close when context moves, and the first stranger user found
   the gap in a day. Capture-phase so scrolls inside nested containers count;
   passive so the scroll itself never janks. */
document.addEventListener('scroll',()=>{
  const tf=document.getElementById('tipFloat');
  if(tf&&!tf.hidden){ tf.hidden=true;
    document.querySelectorAll('.tipi[aria-expanded="true"]').forEach(x=>x.setAttribute('aria-expanded','false')); }
},{capture:true,passive:true});
const _tipExpand=v=>{document.querySelectorAll('.tipi[aria-expanded="true"]')
  .forEach(x=>x.setAttribute('aria-expanded','false'));
  if(v) v.setAttribute('aria-expanded','true');};
document.addEventListener('click',e=>{
  const b=e.target.closest('.tipi');
  const tf=tipFloatEl();
  if(!b){ tf.hidden=true; _tipExpand(null); return; }     // any other tap closes
  if(!tf.hidden&&tf.dataset.tip===b.dataset.tip){ tf.hidden=true; _tipExpand(null); return; }
  const src=document.getElementById('tip-'+b.dataset.tip);
  if(!src) return;
  tf.innerHTML=src.innerHTML;
  tf.dataset.tip=b.dataset.tip;
  tf.classList.remove('up');
  tf.hidden=false;
  _tipExpand(b);
  tf.style.left='8px'; tf.style.top='8px'; tf.style.bottom='auto';
  const r=tf.getBoundingClientRect();
  if(!r.height) return;                                   // no layout (tests) — leave default
  const br=b.getBoundingClientRect();
  const nv=document.querySelector('nav');
  const navH=nv?nv.getBoundingClientRect().height:64;
  const L=Math.min(Math.max(8,br.left-10), window.innerWidth-r.width-8);
  /* v3.3.152: prefer ABOVE the trigger. Triggers sit in section headings,
     so the content being explained is BELOW them — opening downward covered
     exactly the thing the tip was describing (the rulebook's screenshot
     caught this on the Legs card). Flip below only near the top edge. */
  let T=br.top-9-r.height;
  if(T<8){ T=br.bottom+9; }
  else tf.classList.add('up');
  if(T+r.height>window.innerHeight-navH-8&&!tf.classList.contains('up')){
    T=Math.max(8,br.top-9-r.height); tf.classList.add('up');
  }
  tf.style.left=L+'px'; tf.style.top=T+'px';
});
