/* ShowUp — header.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- header ---------- */
function renderHeader(){
  const live=isLive();
  const trained=(day(todayISO).w||[]).length>0;
  const hdr=document.querySelector('header');
  hdr.classList.toggle('live',live);
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
  $('#hStreak').textContent=s?'🔥 '+s+'d':'';
  $('#hStreak').classList.toggle('atrisk', streakAtRisk());
}

/* How the year is actually going: rest days, the current gap, and last year at
   this exact point in the calendar. */
function rhythm(){
  const dates=workoutDates();
  const trainedToday=dates.has(todayISO);
  const elapsed=Math.max(1,doy(todayISO)-(trainedToday?0:1));   // unwritten today doesn't count against you
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
function rhythmCard(){
  const r=rhythm(), ly=r.ly;
  const pctN=Math.round(r.pct*100), lyN=r.lyPct!=null?Math.round(r.lyPct*100):null;
  const delta=lyN!=null?pctN-lyN:null;
  const lead = r.trainedToday
    ? `<b class="big ok">Trained today</b>`
    : r.gap===0
      ? `<b class="big ok">${currentStreak()}d</b><span class="unit"> streak · ${streakAtRisk()?'<b class="atriskTxt">ends at midnight</b>':'today unwritten'}</span>`
      : `<b class="big">${r.gap}</b><span class="unit"> rest day${r.gap>1?'s':''} in a row · today unwritten</span>`;
  let h=`<div class="card rhythm">
    <div class="row spread" style="align-items:flex-end">
      <div>${lead}
        <div class="mono muted" style="font-size:11px;margin-top:2px">
          ${r.rest21} rest day${r.rest21===1?'':'s'} in the last 21</div>
      </div>
      <div style="text-align:right">
        <div class="mono" style="font-size:22px;font-weight:700;color:var(--accent)">${pctN}%</div>
        <div class="mono muted" style="font-size:10px">of ${thisYear} trained</div>
      </div>
    </div>
    <div class="strip">`;
  r.strip.forEach(s=>{
    h+=`<i class="${s.on?'on':''} ${s.today?(s.on?'now':(streakAtRisk()?'now pend atrisk':'now pend')):''}" title="${s.iso}"></i>`;
  });
  h+=`</div>
    <div class="mono muted" style="font-size:10px;display:flex;justify-content:space-between;margin-top:4px">
      <span>3 weeks ago</span><span>today</span></div>`;
  if(lyN!=null){
    const w1=Math.max(2,pctN), w2=Math.max(2,lyN);
    h+=`<div class="vs">
          <div class="vsrow"><span class="y">${thisYear}</span>
            <span class="bar"><i style="width:${w1}%;background:var(--accent)"></i></span>
            <span class="p">${pctN}%</span></div>
          <div class="vsrow"><span class="y">${ly}</span>
            <span class="bar"><i style="width:${w2}%;background:var(--muted)"></i></span>
            <span class="p">${lyN}%</span></div>
          <div class="mono" style="font-size:11px;margin-top:6px;color:${delta>=0?'var(--accent)':'var(--record)'}">
            ${delta>=0?'+':''}${delta} points vs the same day last year
            <span class="muted">· ${r.trainedYTD} trained / ${r.restYTD} rested of ${r.elapsed} days</span></div>
        </div>`;
  }
  h+=`</div>`;
  return h;
}

/* D1 (DESIGN.md): explanations live behind a dot, where the sentence used
   to be. Tap ⓘ → the old note expands in place; tap again → gone. */
function iBtn(id,text){
  return `<span class="notei"><button class="ibtn tipi" data-tip="${id}" aria-label="What is this?">i</button><span class="tipbubble" id="tip-${id}" hidden>${text}</span></span>`;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('.tipi');
  const open=document.querySelector('.tipbubble:not([hidden])');
  if(open&&(!b||open.id!=='tip-'+b.dataset.tip)) open.hidden=true;   // one bubble at a time
  if(!b) return;
  const t=document.getElementById('tip-'+b.dataset.tip);
  if(!t) return;
  t.hidden=!t.hidden;
  if(t.hidden) return;
  /* place it where it can actually be read: above the dot if the nav would
     clip it, left-aligned to the edge if it would run off screen */
  /* v3.3.13: bubbles float above EVERYTHING — position:fixed at the dot,
     so no card, transform or stacking context can ever cut one off. */
  t.classList.remove('up','right');
  t.classList.add('float');
  t.style.left='8px'; t.style.top='8px'; t.style.bottom='auto';
  const r=t.getBoundingClientRect();
  if(!r.height) return;                                  // no layout (tests) — leave default
  const br=b.getBoundingClientRect();
  const nv=document.querySelector('nav');
  const navH=nv?nv.getBoundingClientRect().height:64;
  const L=Math.min(Math.max(8,br.left-10), window.innerWidth-r.width-8);
  let T=br.bottom+9;
  if(T+r.height>window.innerHeight-navH-8){ T=br.top-9-r.height; t.classList.add('up'); }
  t.style.left=L+'px'; t.style.top=T+'px';
});
