/* ShowUp — stats.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- Stats: days first ---------- */
/* v3.3.92: '2025' moves from accent-soft (a BACKGROUND grade — 2.10:1 dark /
   1.58:1 light as a stroke) to --chart-soft, the same hue at chart grade.
   The mapping itself is a validated exception to no-categorical-palettes:
   it is a blue+neutral lightness ramp with direct end-labels, weight
   redundancy on the current year, and stable year identity across the
   consistency chart, distance chart, and both share cards. */
const YEAR_COLORS={ '2022':'var(--faint)','2023':'var(--muted)','2024':'var(--accent-dim)','2025':'var(--chart-soft)','2026':'var(--accent)' };
/* v3.3.67 — your weight, drawn as the sparse series it actually is.
   A STEP line, not a curve: between two weigh-ins the app knows nothing, and
   carry-forward is literally a step function. A smooth line would draw days
   you never measured, which is a lie the chart has no business telling.
   No goal line, no trend verdict, no red/green. This app scores attendance,
   not your body — the number is context for load maths and a quiet record. */
let bwEdit=false;
/* v3.3.72 — the month grid's DATA, lifted out so the HTML grid and the canvas
   share card read one source. The PAINT is duplicated on purpose (canvas
   cannot reuse a <span>), but the arithmetic must not be — that is exactly
   how resealDay() and foldSets() were born. */
/* v3.3.73 — the month in progress is DIMMER, not merely dashed. Its count is
   partial and must not read as a finished one. Expressed as alpha rather than
   a colour, so it behaves identically in light and dark. Shared by the HTML
   grid and the canvas card. */
function mgAlpha(n,max,cur){ return n?(0.14+0.74*n/max)*(cur?0.45:1):0; }
/* v3.3.116: one column per training day, stacked by part. Sized so a
   column is legible on a phone; the wrapper scrolls and PMIX_DAYS grows
   when you reach the left edge. */
/* v3.3.122: the whole archive renders at once. Loading backwards meant
   prepending columns and then correcting scrollLeft, and correcting
   scrollLeft mid-momentum is what produced the lurch the maker hit. A
   typical day carries one or two parts, so ~930 days is a couple of
   thousand rects — cheap enough that lazy loading bought nothing but the
   bug. */
let PMIX_DAYS=99999;
/* v3.3.121: tapping a legend name isolates that part. Applied by mutating
   the rendered rects rather than re-rendering, so the scroll position — and
   any weeks loaded backwards — survive the tap. */
let PMIX_FOCUS=null;
/* v3.3.122: press a column and read that day out in full. The chart is
   discrete, so this is an index lookup rather than the interpolation the
   line charts need. */
/* v3.3.125: the drag-scrubber is gone. Tapping is the only interaction now
   and it does one thing — follow a body part — so this line says that, and
   says what you are following once you have chosen. */
function pmixHint(){
  const el=document.getElementById('pmixRead');
  if(!el) return;
  el.innerHTML = PMIX_FOCUS
    ? `Showing <b style="color:${PART_COLORS[PMIX_FOCUS]}">${PMIX_FOCUS}</b> · tap again to show all`
    : 'Tap a bar or a name to follow one body part';
}
/* v3.3.123: what the chart adds up to, and which way it is going. With a
   part isolated it speaks about that part; otherwise about every lift.
   Trend compares the most recent third of the SESSIONS THAT COUNT against
   the third before it — sessions, not calendar days, so a quiet fortnight
   does not read as a decline in something you simply did not train. */
function pmixSummary(){
  const el=document.getElementById('pmixSum'); if(!el) return;
  const rows=partMix(PMIX_DAYS), P=PMIX_FOCUS;
  const vals=rows.map(r=>P?(r.by[P]||0):r.total).filter(v=>v>0);
  if(!vals.length){ el.textContent=''; return; }
  const sum=vals.reduce((a,b)=>a+b,0), avg=sum/vals.length;
  let trend='';
  if(vals.length>=6){
    const k=Math.floor(vals.length/3);
    const recent=vals.slice(-k).reduce((a,b)=>a+b,0)/k;
    const before=vals.slice(-2*k,-k).reduce((a,b)=>a+b,0)/k;
    if(before>0){
      const d=Math.round((recent/before-1)*100);
      trend=` · <b class="${d>=0?'up':'dn'}">${d>=0?'+':''}${d}%</b> vs earlier`;
    }
  }
  el.innerHTML=`${P?`<b style="color:${PART_COLORS[P]}">${P}</b>`:'All lifts'}
    · ${pmixTick(sum)} ${U()} across ${vals.length} session${vals.length===1?'':'s'}
    · ${pmixTick(avg)} avg${trend}`;
}
function pmixApplyFocus(){
  const wrap=document.getElementById('pmixWrap');
  if(wrap) wrap.querySelectorAll('rect[data-pt]').forEach(r=>{
    r.style.opacity = (!PMIX_FOCUS || r.dataset.pt===PMIX_FOCUS) ? '' : '0.12';
  });
  document.querySelectorAll('.pmixlgd [data-pt]').forEach(s=>{
    s.classList.toggle('on',  PMIX_FOCUS===s.dataset.pt);
    s.classList.toggle('off', !!PMIX_FOCUS && PMIX_FOCUS!==s.dataset.pt);
  });
  pmixHint();
  pmixSummary();
}
function pmixSetFocus(part){
  PMIX_FOCUS = (PMIX_FOCUS===part) ? null : part;
  /* labels only exist for the focused part, so this re-renders — scroll is
     saved and restored by hand, and smooth scrolling is suppressed across
     the swap so it does not glide. */
  const wrap=document.getElementById('pmixWrap');
  if(wrap){
    const keep=wrap.scrollLeft, sb=wrap.style.scrollBehavior;
    wrap.style.scrollBehavior='auto';
    wrap.innerHTML=partMixSvg(PMIX_DAYS);
    wrap.scrollLeft=keep; wrap.style.scrollBehavior=sb;
  }
  pmixApplyFocus();
  pmixSummary();
}
/* v3.3.125: columns 17→12 and bars 13→10 (≈20% narrower, gap halved), so
   more of the archive is legible at once. PMIX_H 232→186 because the drawn
   content ended near y=182 — rotated dates run from PMIX_BASE+6 down about
   26px — leaving ~50px of empty box under every render. */
const PMIX_COLW=15, PMIX_H=186, PMIX_TOP=8, PMIX_BASE=150;   // v3.3.127: bars 10→12.5, exactly 25% wider
const PMIX_AXW=25;   // v3.3.126: 34→25, ~26% of the left gutter reclaimed
/* v3.3.120: the plot's vertical scale must be identical in the fixed axis
   and the scrolling body, so BOTH read this one function. */
function pmixMax(rows){ return Math.max(...rows.map(r=>r.total), 1); }
/* v3.3.127: thousands separators. A lifetime total renders as 6,620k rather
   than 6620k — the k-value itself runs past a thousand once the archive is
   large, and the digits ran together. fmt() already exists for this. */
const pmixTick=v=> v>=1000 ? fmt(+(v/1000).toFixed(v>=10000?0:1))+'k' : fmt(Math.round(v));
function pmixAxisSvg(rows){
  const max=pmixMax(rows);
  let s=`<svg class="pmixaxis" viewBox="0 0 ${PMIX_AXW} ${PMIX_H}" width="${PMIX_AXW}"
      height="${PMIX_H}" style="height:${PMIX_H}px">`;
  for(let i=0;i<=4;i++){
    const y=PMIX_BASE-(i/4)*(PMIX_BASE-PMIX_TOP);
    s+=`<text x="${PMIX_AXW-4}" y="${(y+2.5).toFixed(1)}" text-anchor="end"
         font-family="var(--mono)" font-size="7" fill="var(--muted)">${pmixTick(max*i/4)}</text>`;
  }
  return s+`</svg>`;
}
let PMIX_YEARS=[];      // v3.3.123: column index -> year, for the sticky label
function partMixSvg(days){
  const rows=partMix(days);
  PMIX_YEARS=rows.map(r=>r.d.slice(0,4));
  if(!rows.length) return '';
  const max=pmixMax(rows);
  const W=Math.max(320,rows.length*PMIX_COLW+16);
  let s=`<svg viewBox="0 0 ${W} ${PMIX_H}" width="${W}" height="${PMIX_H}"
      style="height:${PMIX_H}px" data-pmix>`;
  // horizontal guides at every axis tick, so the labels beside them mean something
  for(let i=0;i<=4;i++){
    const y=PMIX_BASE-(i/4)*(PMIX_BASE-PMIX_TOP);
    s+=`<line x1="4" y1="${y.toFixed(1)}" x2="${W-4}" y2="${y.toFixed(1)}"
         stroke="var(--line)" stroke-width="0.6"${i?' stroke-dasharray="2 3"':''}></line>`;
  }
  /* soft rule at each month; a firmer one, labelled, at each year — without
     it a scroll into 2023 looks exactly like a scroll into 2026. */
  let prevM=null, prevY=null;
  rows.forEach((r,i)=>{
    const m=r.d.slice(0,7), y=r.d.slice(0,4), x=8+i*PMIX_COLW-2;
    if(prevY!==null && y!==prevY){
      s+=`<line x1="${x}" y1="${PMIX_TOP}" x2="${x}" y2="${PMIX_BASE+4}"
           stroke="var(--muted)" stroke-width="1.4" opacity="0.85"></line>
          <text x="${x+3}" y="${PMIX_TOP+7}" font-family="var(--mono)" font-size="8"
           font-weight="700" fill="var(--muted)" data-yrmark="${y}">${y}</text>`;
    }else if(prevM!==null && m!==prevM){
      s+=`<line x1="${x}" y1="${PMIX_TOP}" x2="${x}" y2="${PMIX_BASE+4}"
           stroke="var(--line)" stroke-width="0.8" opacity="0.55"></line>
          <text x="${x+3}" y="${PMIX_TOP+7}" font-family="var(--mono)" font-size="7"
           fill="var(--faint)">${new Date(r.d+'T00:00').toLocaleDateString('en-US',{month:'short'})}</text>`;
    }
    prevM=m; prevY=y;
  });
  // the first visible column names its year too, so the left edge is never mute
  s+=`<text x="10" y="${PMIX_TOP+7}" font-family="var(--mono)" font-size="8"
       font-weight="700" fill="var(--muted)" data-yrmark="${rows[0].d.slice(0,4)}"
       >${rows[0].d.slice(0,4)}</text>`;
  rows.forEach((r,i)=>{
    const x=8+i*PMIX_COLW, bw=PMIX_COLW-2.5;
    s+=`<rect class="pmixcol${i===rows.length-1?' latest':''}" data-col="${i}"
         x="${x-2}" y="${PMIX_TOP}" width="${PMIX_COLW}"
         height="${PMIX_BASE-PMIX_TOP}"></rect>`;
    let y=PMIX_BASE;
    for(const p of Object.keys(SEED.catalog)){
      const n=r.by[p]; if(!n) continue;
      const hh=(n/max)*(PMIX_BASE-PMIX_TOP);
      y-=hh;
      s+=`<rect x="${x}" y="${y.toFixed(1)}" width="${bw}" height="${hh.toFixed(1)}"
           fill="${PART_COLORS[p]||'var(--muted)'}" data-pt="${p}"
           stroke="var(--ground)" stroke-width="0.5"></rect>`;
    }
    // while a part is isolated, that part's own volume is written above it
    if(PMIX_FOCUS && r.by[PMIX_FOCUS]){
      const v=r.by[PMIX_FOCUS], top=PMIX_BASE-(v/max)*(PMIX_BASE-PMIX_TOP);
      s+=`<text x="${x+bw/2}" y="${(top-3).toFixed(1)}" text-anchor="middle"
           font-family="var(--mono)" font-size="6.5" fill="var(--chalk)"
           data-lbl="${PMIX_FOCUS}">${pmixTick(v)}</text>`;
    }
    // every column names its day, rotated — as the spreadsheet does
    const lab=(+r.d.slice(5,7))+'/'+(+r.d.slice(8,10));
    s+=`<text x="${x+bw/2}" y="${PMIX_BASE+6}" transform="rotate(-90 ${x+bw/2} ${PMIX_BASE+6})"
         text-anchor="end" font-family="var(--mono)" font-size="7"
         fill="var(--muted)">${lab}</text>`;
  });
  s+=`</svg>`;
  return s;
}
function gridData(){
  const mDays={};
  for(const d of Object.keys(SEED.sessions)) mDays[d.slice(0,7)]=(mDays[d.slice(0,7)]||0)+1;
  if(((DB.days[todayISO]||{}).w||[]).length){
    const mk=todayISO.slice(0,7); mDays[mk]=(mDays[mk]||0)+1;
  }
  const first=SEED.totals.first||todayISO;
  return { mDays, first,
    y0:+first.slice(0,4), y1:+todayISO.slice(0,4),
    max:Math.max(...Object.values(mDays),1),
    m0:first.slice(0,7), mNow:todayISO.slice(0,7),
    total:SEED.totals.sessions+((((DB.days[todayISO]||{}).w)||[]).length?1:0) };
}
function bwCard(){
  const ds=bwDays(), cur=bwNow();
  let body;

  if(bwEdit){
    body=`<div class="fld"><label>Weight today (${U()})</label>
        <input id="bwIn" type="number" inputmode="decimal" step="0.1"
               value="${cur>0?wDisp(cur):''}" placeholder="—"></div>
      <div class="btnrow">
        <button class="btn ghost" id="bwCancel">Cancel</button>
        <button class="btn" id="bwSave">Save</button>
      </div>
      <div class="note">Recorded against today. Enter it only when it has changed — silence means unchanged.</div>`;
  }else if(!ds.length){
    body=`<div class="row spread">
        <span class="mono muted" style="font-size:12px">No weight recorded yet.</span>
        <button class="chip" id="bwEditBtn">Add</button></div>`;
  }else{
    const first=ds[0], last=ds[ds.length-1];
    const since=daysAgo(last);
    const head=`<div class="row spread" style="align-items:flex-end">
        <div><div class="bwnow">${wDisp(cur)} <span style="font-size:13px;font-weight:500">${U()}</span></div>
          <div class="bwsub">${ds.length>1
            ? `last change ${pretty(last)} · ${since===0?'today':since+'d ago'}`
            : `unchanged since ${pretty(first)}`}</div></div>
        <button class="chip" id="bwEditBtn">Update</button></div>`;

    let chart='';
    {
      const pts=ds.map(d=>({t:Date.parse(d+'T00:00'), v:toU(DB.days[d].bw)}));
      const t0=pts[0].t, t1=Math.max(Date.parse(todayISO+'T00:00')+864e5, pts[pts.length-1].t);
      const span=Math.max(1,t1-t0);
      const vals=pts.map(p=>p.v);
      const minV=Math.min(...vals), maxV=Math.max(...vals);
      let lo=minV, hi=maxV;
      if(hi-lo<2){ const m=(hi+lo)/2; lo=m-1; hi=m+1; }         // a near-flat series must not amplify into noise
      const pad=(hi-lo)*0.22; lo-=pad; hi+=pad;
      const X=t=>32+(t-t0)/span*268;
      const Y=v=>95-(v-lo)/(hi-lo)*75;   // v3.3.113: baseline 84→95, span 66→75 (×1.135 into the 118 box)
      const n1=v=>String(Math.round(v*10)/10);
      let grid='';
      for(const gv of (minV===maxV?[minV]:[maxV,minV])){
        const gy=Y(gv);
        grid+=`<line x1="32" y1="${gy.toFixed(1)}" x2="300" y2="${gy.toFixed(1)}" stroke="var(--line)" stroke-width="0.6" stroke-dasharray="2 3"></line>
               <text x="28" y="${(gy+2.5).toFixed(1)}" text-anchor="end" font-family="var(--mono)" font-size="7" fill="var(--muted)">${n1(gv)}</text>`;
      }
      let d='', prevY=0, dots='';
      pts.forEach((p,i)=>{
        const x=X(p.t), y=Y(p.v);
        d += i===0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}`
                   : ` L ${x.toFixed(1)} ${prevY.toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)}`;
        prevY=y;
        dots+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" fill="var(--accent)"></circle>`;
      });
      d+=` L ${X(t1).toFixed(1)} ${prevY.toFixed(1)}`;           // carry the last weight forward to today
      chart=`<div class="zoom" data-zoom><svg viewBox="0 0 330 118" style="width:100%;height:auto">
          ${grid}
          <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="1.6"
                stroke-linejoin="round" stroke-linecap="round"></path>
          ${dots}
          <text x="${X(t1).toFixed(1)}" y="${(prevY-5).toFixed(1)}" text-anchor="end" font-family="var(--mono)"
                font-size="8" font-weight="700" fill="var(--accent-ink)">${n1(toU(cur))}</text>
          <text x="32" y="112" font-family="var(--mono)" font-size="7" fill="var(--muted)">${md(first)}</text>
          <text x="300" y="112" text-anchor="end" font-family="var(--mono)" font-size="7" fill="var(--muted)">today</text>
        </svg></div>`;
    }
    body=head+chart;
  }
  return `<h2 id="secWeight">Weight${hActs('bw',"Flat stretches are days you didn't weigh in.",'About the weight chart')}</h2><div class="card">${body}</div>`;

}
/* v3.3.111: sections are cut into a buffer as they're built, then emitted
   in one declared order at the bottom. Reordering Stats used to mean moving
   long blocks of markup around; now it means editing one line. The order
   below is the maker's, from the v3.3.111 review. */
/* ================= v3.3.181 — Rep zones (Stats only) =================
   Question-addressed: "where do my working sets land?" Born from a real
   blind spot — 12 incline press sets on one day, all under 5 or over 14
   reps, zero in 6–12, and no surface said so. This card is that mirror.
   Register: counts of SETS (tonnage stays demoted), blunt empty buckets
   (an empty 6–12 renders "0 sets" plainly — no warning color; red means
   live and this is not live), read-only (Stats never writes).
   Boundaries are named constants with ONE definition site — "pairs of
   numbers that should be one constant" is a recorded anti-pattern here,
   and buildcheck holds the door. */
const REPZONE_MAX_STRENGTH=5;      // 1..5 reps  → strength
const REPZONE_MAX_GROWTH=12;       // 6..12 reps → growth; 13+ → endurance
const REPZONE_LABELS=[
  ['<'+(REPZONE_MAX_STRENGTH+1),'strength'],
  [(REPZONE_MAX_STRENGTH+1)+'\u2013'+REPZONE_MAX_GROWTH,'growth'],
  [(REPZONE_MAX_GROWTH+1)+'+','endurance']];
function repZone(reps){
  return reps<=REPZONE_MAX_STRENGTH?0:reps<=REPZONE_MAX_GROWTH?1:2;
}
/* v3.3.185: the window selector is gone (maker's call — one more control
   than the question needs). The window is a CONSTANT, not state; the
   "only N sessions logged" note still tells the truth when the record is
   shorter than it. */
const REPZONE_WINDOW=10;
/* v3.3.206: dot radius = DOT_MIN + DOT_GROW*sqrt(count-1). The floor makes a
   single-set dot a real touch target; the growth keeps repeats heavier, so
   size still encodes count rather than every dot going uniform. */
const DOT_MIN=5.5,DOT_GROW=2.2;
/* v3.3.188: Rep zones breaks out per body part — one section each, so the
   part chips are gone and selection is per-part (a lift chosen for Back
   stays chosen when you scroll past Chest). */
const rz={grp:null,ex:null};
/* every date's rows, today included — the same merge the day receipt uses,
   so the mirror reads the canonical record, not a reconstruction */
function rzAllSessions(){
  const out=SEED.dates.map(d=>[d,SEED.sessions[d]]);
  const t=((DB.days[todayISO]||{}).w||[]).map(s2=>[s2.part,s2.ex,s2.w,s2.reps||[],s2.mins,s2.secs,s2.cid]);
  if(t.length) out.push([todayISO,t]);
  return out;
}
/* v3.3.191: Rep Zones counts by CANONICAL ID, not by the logged string.
   Renaming an exercise used to split its history into two series — the
   series you were reading would simply lose everything logged under the
   old name. Ids are resolved from the row's cid when migration has stamped
   it, else derived from the string (no minting: a read-only view must
   never write to the record). Display is always the display name. */
const rowCid=r=>r[6]||canonId(r[1],false)||r[1];
function rzExercises(){
  const seen={};
  for(const [,rows] of rzAllSessions())
    for(const r of rows) if(r[1]!=='Run'&&(r[3]||[]).length) seen[rowCid(r)]=1;
  return Object.keys(seen);
}
function repZoneData(ex,N){
  /* "last N sessions OF THAT EXERCISE": days it was actually trained,
     newest first — not last N calendar days */
  const sess=rzAllSessions()
    .filter(([,rows])=>rows.some(r=>rowCid(r)===ex&&(r[3]||[]).length))
    .sort((a,b)=>a[0]<b[0]?1:-1).slice(0,N);
  const counts=[0,0,0];
  for(const [,rows] of sess) for(const r of rows){
    if(rowCid(r)!==ex) continue;
    for(const rep of (r[3]||[])) counts[repZone(rep)]++;   // reps:[] (runs/cardio) adds nothing
  }
  const ds=sess.map(x=>x[0]).sort();
  return {counts,used:sess.length,first:ds[0],last:ds[ds.length-1]};
}
/* v3.3.183: the scatter's dots — every set of the window as (weight, reps),
   AGGREGATED by exact position: count sizes the dot (two identical sets are
   one bigger dot, never a jittered fake position), and age drives opacity
   (0 = the newest session; older sessions fade). Recency IS the trend here:
   weight×reps has no time axis, so a fitted line would be a fiction — the
   cloud's solid edge moving is the honest version. */
function repZoneSets(ex,N){
  const sess=rzAllSessions()
    .filter(([,rows])=>rows.some(r=>rowCid(r)===ex&&(r[3]||[]).length))
    .sort((a,b)=>a[0]<b[0]?1:-1).slice(0,N);
  const dots={};
  sess.forEach(([iso,rows],age)=>{
    for(const r of rows){
      if(rowCid(r)!==ex) continue;
      for(const rep of (r[3]||[])){
        const k=r[2]+'@'+rep;
        /* v3.3.206: `last` is the most recent session this exact weight x rep
           appeared in. Sessions arrive newest-first, so the first one to
           create the dot is already the latest — but take the max anyway
           rather than depending on the sort order staying that way. */
        if(!dots[k]) dots[k]={w:r[2],rep,n:0,age,last:iso};
        dots[k].n++; dots[k].age=Math.min(dots[k].age,age);
        if(iso>dots[k].last) dots[k].last=iso;
      }
    }
  });
  return {dots:Object.values(dots),used:sess.length};
}
function repZoneScatterSvg(ex){
  const {dots,used}=repZoneSets(ex,REPZONE_WINDOW);
  if(!dots.length) return '';
  /* v3.3.196: the plot's own inset. Band labels now sit ABOVE the plot
     rather than inside its top edge, and the x-axis sits well below the
     lowest dot — the maker circled dots touching both frames. TOPPAD is
     the label strip; BOTPAD is axis air. */
  /* v3.3.205: axis geometry as NAMED GAPS rather than tuned literals, so the
     two spacings the maker asked about are each one number.
       AXIS_LAB_X  air between the rotated "weight (kg)" and the tick numbers
       TICK_GAP_X  air between a y tick number and the plot's left edge
       TICK_GAP_Y  air between the axis line and the x tick numbers
       XLAB_GAP    air between the x tick numbers and "reps per set"
     H is DERIVED from the last of them — previously H was fixed and the
     label was placed from the bottom, so the two moved independently and
     the gap drifted. */
  const W=340,TOPPAD=30,BOTPAD=30;
  const AXIS_LAB_X=9,TICK_GAP_X=8,TICK_GAP_Y=12,XLAB_GAP=13;
  const X0=52,XW=W-X0-8;                 // was 34: the y label had no room
  const Y0=TOPPAD+164,YH=Y0-TOPPAD;
  const H=Y0+TICK_GAP_Y+XLAB_GAP+6;
  const reps=Math.max(REPZONE_MAX_GROWTH+3,...dots.map(d=>d.rep));
  const ws=dots.map(d=>d.w);
  let wLo=Math.min(...ws),wHi=Math.max(...ws);
  if(wLo===wHi){wLo-=5;wHi+=5;}
  /* v3.3.189: pad the weight axis so the largest dot never kisses the plot
     edge. The old 12% was computed before radius existed; the biggest dot
     is ~8px, so the pad must cover it in DATA units as well as clear the
     band labels up top. */
  const span=wHi-wLo, maxR=DOT_MIN+DOT_GROW*Math.sqrt(Math.max(...dots.map(d=>d.n))-1);
  const pad=Math.max(span*0.18,span*(maxR+6)/Math.max(1,YH));
  wLo-=pad; wHi+=pad;
  const x=rep=>X0+(rep/(reps+1))*XW;
  const y=w2=>Y0-((w2-wLo)/(wHi-wLo))*YH;
  /* zone bands from the SAME constants as the buckets — one definition site.
     Boundaries sit at n+0.5 so integer reps land inside their band. */
  const b1=x(REPZONE_MAX_STRENGTH+0.5), b2=x(REPZONE_MAX_GROWTH+0.5);
  let h2=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" class="rzscat" aria-label="Weight by reps per set">`;
  /* v3.3.207: a transparent backdrop over the whole plot. Without it an <svg>
     only receives pointer events where something is actually drawn, so a
     finger landing between dots produced NO event and the nearest-dot
     snapping never ran — the exact failure the snapping exists to prevent. */
  h2+=`<rect class="rzpad" x="${X0}" y="${(Y0-YH).toFixed(1)}" width="${XW}" height="${YH}"
        fill="transparent"></rect>`;
  h2+=`<rect x="${b1.toFixed(1)}" y="${(Y0-YH).toFixed(1)}" width="${(b2-b1).toFixed(1)}" height="${YH}"
        fill="var(--accent)" opacity="0.07"></rect>`;
  for(const bx of [b1,b2])
    h2+=`<line x1="${bx.toFixed(1)}" y1="${Y0-YH}" x2="${bx.toFixed(1)}" y2="${Y0}" stroke="var(--line)" stroke-width="0.8" stroke-dasharray="3 3"></line>`;
  REPZONE_LABELS.forEach(([range],i)=>{
    const cx=[(X0+b1)/2,(b1+b2)/2,(b2+X0+XW)/2][i];
    h2+=`<text x="${cx.toFixed(1)}" y="${(Y0-YH-9).toFixed(1)}" text-anchor="middle" font-family="var(--mono)" font-size="7.5" fill="var(--faint)">${range}</text>`;
  });
  // y ticks: lo / mid / hi weight
  for(const wv of [Math.min(...ws),(wLo+wHi)/2,Math.max(...ws)]){
    const yy=y(wv);
    h2+=`<line x1="${X0}" y1="${yy.toFixed(1)}" x2="${X0+XW}" y2="${yy.toFixed(1)}" stroke="var(--line)" stroke-width="0.5" stroke-dasharray="2 4"></line>
        <text x="${X0-TICK_GAP_X}" y="${(yy+2.5).toFixed(1)}" text-anchor="end" font-family="var(--mono)" font-size="7" fill="var(--muted)">${wDisp(wv)}</text>`;
  }
  // x ticks every 5 reps
  for(let rv=5;rv<=reps;rv+=5)
    h2+=`<text x="${x(rv).toFixed(1)}" y="${Y0+TICK_GAP_Y}" text-anchor="middle" font-family="var(--mono)" font-size="7" fill="var(--muted)">${rv}</text>`;
  h2+=`<line x1="${X0}" y1="${Y0}" x2="${X0+XW}" y2="${Y0}" stroke="var(--line)" stroke-width="0.8"></line>`;
  /* v3.3.186: the axes say what they are (maker's ask) */
  h2+=`<text x="${(X0+XW/2).toFixed(1)}" y="${Y0+TICK_GAP_Y+XLAB_GAP}" text-anchor="middle" font-family="var(--mono)" font-size="7.5" fill="var(--muted)" class="rzxlab">reps per set</text>`;
  h2+=`<text x="${AXIS_LAB_X}" y="${(Y0-YH/2).toFixed(1)}" text-anchor="middle" font-family="var(--mono)" font-size="7.5" fill="var(--muted)" class="rzylab" transform="rotate(-90 ${AXIS_LAB_X} ${(Y0-YH/2).toFixed(1)})">weight (${U()})</text>`;
  // dots: newest solid, oldest faint; count sizes
  for(const d of dots.sort((a,b)=>b.age-a.age)){
    const op=used>1?(0.35+0.65*(1-d.age/(used-1))):1;
    /* v3.3.206: radius from the named DOT_MIN/DOT_GROW constants — the floor
       makes a single-set dot a real target, the growth keeps repeats heavier.
       Count is still the encoding; the dots got bigger, not uniform. */
    const r=(DOT_MIN+DOT_GROW*Math.sqrt(d.n-1)).toFixed(1);
    /* v3.3.205: each dot is tappable. The hit target is a transparent circle
       at a thumb-sized radius behind the visible one — a 3px dot is not a
       tap target, and growing the dot to be tappable would lie about count. */
    /* the tap target is gone: with snapping, the nearest dot wins from
       anywhere in the plot, so a per-dot hit circle is dead weight. The dot
       carries its own geometry for the distance sort instead. */
    h2+=`<circle class="rzdot" cx="${x(d.rep).toFixed(1)}" cy="${y(d.w).toFixed(1)}" r="${r}"
          fill="var(--accent)" opacity="${op.toFixed(2)}"
          data-w="${d.w}" data-rep="${d.rep}" data-n="${d.n}" data-age="${d.age}"
          data-last="${d.last}"></circle>`;
  }
  /* the readout lives in ONE fixed place under the chart instead of floating
     beside the dot: no positioning maths, nothing to clip at the card edge,
     and the chart never reflows when it fills. */
  /* v3.3.206: the selection is a HALO ring, not a stroke on the dot — at
     these radii a stroke reads as "slightly darker", which is exactly the
     "which one is selected?" problem. A detached ring outside the dot is
     unmistakable, and being one element it can move with the scrub without
     touching every circle. */
  h2+=`<circle class="rzhalo" r="0" cx="0" cy="0" fill="none"
        stroke="var(--chalk)" stroke-width="1.6" opacity="0" pointer-events="none"></circle>`;
  h2+=`</svg><div class="rzcap" data-rzcap>&nbsp;</div>`;
  return h2;
}
/* v3.3.198 — ONE Rep-zone section. The per-part sections, the three-part
   default and the expander are all gone (maker's call, one release later):
   a body-part DROPDOWN plus a single card says the same thing with one
   control and no scroll. The exercise rail is ordered by SETS LOGGED,
   most to least — the part's centre of gravity by the plainest possible
   measure — and an exercise with no sets never appears, because a rep-zone
   chart of nothing is not a finding. Parts are visible groups (v3.3.194),
   so Biceps+Triceps read as Arms and Sixpack as Core. */
function rzSetsById(){
  const sets={};
  for(const [,rows] of rzAllSessions())
    for(const r of rows){
      if(r[1]==='Run'||!(r[3]||[]).length) continue;
      const id=rowCid(r); sets[id]=(sets[id]||0)+r[3].length;
    }
  return sets;
}
function repZoneSections(){
  const exs=rzExercises();                       // already sets-only
  if(!exs.length) return `<h2 class="rzh">Rep zones${hActs('rz','Sets per rep range, last '+REPZONE_WINDOW+' sessions. Bigger dot = a repeated set; newer sessions solid. Runs excluded.','About rep zones')}</h2>
    <div class="card rzcard"><div class="note">No weighted sets yet. The zones will be here when the sets are.</div></div>`;
  const sets=rzSetsById();
  const byPart={};
  for(const e of exs){
    const g2=PART_VISIBLE[homePartOf(canonName(e))]||homePartOf(canonName(e))||'Other';
    (byPart[g2]=byPart[g2]||[]).push(e);
  }
  const order=[...VISIBLE_GROUPS.filter(pt=>byPart[pt]),
               ...Object.keys(byPart).filter(pt=>!VISIBLE_GROUPS.includes(pt))];
  /* opens on the group that matters today: trained today, else the plan's
     next pick — the same authority as Today's Train-next card */
  if(!rz.grp||!byPart[rz.grp]){
    const plan=trainingPlan();
    const todayG=[...new Set(((DB.days[todayISO]||{}).w||[])
      .filter(s2=>s2.ex!=='Run'&&(s2.reps||[]).length)
      .map(s2=>PART_VISIBLE[s2.part]||s2.part))].find(g2=>byPart[g2]);
    const pickG=PART_VISIBLE[plan.pick]||plan.pick;
    rz.grp=todayG||(byPart[pickG]?pickG:order[0]);
  }
  /* v3.3.199: ordered by TOTAL SETS LOGGED, most first — and the number is
     printed on the chip. The maker read the rail as mis-sorted; with the
     count invisible there was no way to tell a sorting bug from a surprising
     history. Now the order is checkable at a glance, and the chip and the
     comparator read the same value. */
  const shown=byPart[rz.grp].slice().sort((a,b)=>(sets[b]||0)-(sets[a]||0)
    ||canonName(a).localeCompare(canonName(b)));
  if(!rz.ex||!shown.includes(rz.ex)) rz.ex=shown[0];
  return `<h2 class="rzh">Rep zones${hActs('rz','Sets per rep range, last '+REPZONE_WINDOW+' sessions. Bigger dot = a repeated set; newer sessions solid. Runs excluded.','About rep zones')}</h2>
    <div class="card rzcard" data-rzcard="${rz.grp}">
      <select id="rzGrp" class="rzsel" aria-label="Body part">${order.map(g2=>
        `<option value="${g2}" ${g2===rz.grp?'selected':''}>${g2}</option>`).join('')}</select>
      <div class="rzlifts">${shown.map(e=>
        `<button class="chip ${e===rz.ex?'on':''}" data-rzx="${e}" data-rzpart="${rz.grp}"
          >${canonName(e)}<i>${sets[e]||0}</i></button>`).join('')}</div>
      <div class="rzbody">${rzBody(rz.ex)}</div>
    </div>`;
}
/* v3.3.198: the lift-chip handler. Deleted TWICE now by rewrites of the
   surrounding section builder (v3.3.188, and again here) — it lives next to
   the dropdown handler so the two are found and moved together. Swaps the
   card body in place: no render(), no scroll jump. */
/* v3.3.206 — reading the scatter by touch.
   Precision was the problem: a dot is a few pixels and a fingertip is not.
   So the plot snaps to the NEAREST dot from anywhere inside it, measured in
   SCREEN pixels rather than data units — visual proximity is what a finger
   means, and measuring in data units would make the tall weight axis punish
   vertical misses more than horizontal ones.

   Snapping is unlimited by design (maker's call): a distance cap would blank
   the readout mid-drag in empty corners, which reads as broken. The cost is
   that a far-away dot can be selected, which is why the selection is a halo
   you cannot miss.

   Gesture grammar follows bindScrub (v3.3.108): the surface is on the
   tab-swipe blocklist and touch-action:none, so a horizontal drag cannot
   change tabs and a vertical one cannot scroll the page. The reading STAYS
   after release. */
function rzPick(svg,clientX,clientY){
  const dots=[...svg.querySelectorAll('.rzdot')];
  if(!dots.length) return null;
  const box=svg.getBoundingClientRect();
  const vb=(svg.getAttribute('viewBox')||'0 0 1 1').split(/\s+/).map(Number);
  const sx=box.width/(vb[2]||1), sy=box.height/(vb[3]||1);
  let best=null,bd=Infinity;
  for(const d of dots){
    const px=box.left+(+d.getAttribute('cx'))*sx;
    const py=box.top +(+d.getAttribute('cy'))*sy;
    const dist=(px-clientX)**2+(py-clientY)**2;
    if(dist<bd){ bd=dist; best=d; }
  }
  return best;
}
function rzSelect(svg,dot){
  if(!svg||!dot) return;
  const halo=svg.querySelector('.rzhalo');
  if(halo){
    halo.setAttribute('cx',dot.getAttribute('cx'));
    halo.setAttribute('cy',dot.getAttribute('cy'));
    halo.setAttribute('r',String((+dot.getAttribute('r'))+5));
    halo.setAttribute('opacity','1');
  }
  svg.querySelectorAll('.rzdot.on').forEach(c=>c.classList.remove('on'));
  dot.classList.add('on');
  const cap=svg.parentNode&&svg.parentNode.querySelector('[data-rzcap]');
  if(!cap) return;
  const n=+dot.dataset.n;
  cap.innerHTML=`<b>${wDisp(+dot.dataset.w)}</b>${U()} \u00d7 <b>${dot.dataset.rep}</b> reps`
    +(n>1?` \u00b7 ${n} sets`:'')
    +` \u00b7 ${rzWhen(dot.dataset.last)}`;
}
function rzClear(svg){
  if(!svg) return;
  const halo=svg.querySelector('.rzhalo');
  if(halo) halo.setAttribute('opacity','0');
  svg.querySelectorAll('.rzdot.on').forEach(c=>c.classList.remove('on'));
  const cap=svg.parentNode&&svg.parentNode.querySelector('[data-rzcap]');
  if(cap) cap.innerHTML='&nbsp;';
}
/* "Aug 7", with the year only when it is not this one */
function rzWhen(iso){
  if(!iso) return '';
  const d=new Date(iso+'T00:00');
  const opts={month:'short',day:'numeric'};
  if(iso.slice(0,4)!==todayISO.slice(0,4)) opts.year='numeric';
  return d.toLocaleDateString('en-US',opts);
}
/* one pointer binding for the plot: press, drag, release */
function bindRzScrub(svg){
  if(!svg||svg._rzBound) return; svg._rzBound=1;
  let down=false;
  const at=e=>rzPick(svg,e.clientX,e.clientY);
  const start=e=>{
    if(e.isPrimary===false) return;              // second finger of a pinch
    down=true;
    if(svg.setPointerCapture&&e.pointerId!=null){ try{svg.setPointerCapture(e.pointerId);}catch(_){} }
    const d=at(e);
    /* pressing the already-selected dot toggles the reading off */
    if(d&&d.classList.contains('on')){
      rzClear(svg); down=false; return;
    }
    rzSelect(svg,d);
  };
  const move=e=>{ if(!down) return; e.preventDefault(); rzSelect(svg,at(e)); };
  const end=()=>{ down=false; };                 // the reading stays
  /* v3.3.207: POINTER EVENTS ONLY. Binding touch* alongside them meant a
     phone fired both for a single tap, so start() ran twice — the first run
     selected the dot, the second saw it already selected and toggled it off.
     Net effect on a phone: nothing ever appeared selected, while a mouse
     (which fires only pointerdown) worked perfectly. touch-action:none on
     .rzscat is what stops the page scrolling, so no touch listener is
     needed for that either. */
  svg.addEventListener('pointerdown',start);
  svg.addEventListener('pointermove',move);
  svg.addEventListener('pointerup',end);
  svg.addEventListener('pointercancel',end);
}
document.addEventListener('click',e=>{
  const xc=e.target.closest&&e.target.closest('[data-rzx]');
  if(!xc) return;
  rz.ex=xc.dataset.rzx;
  const card=xc.closest('.rzcard'), body=card&&card.querySelector('.rzbody');
  if(!body){ render(); return; }
  card.querySelectorAll('.rzlifts .chip').forEach(c=>c.classList.toggle('on',c.dataset.rzx===rz.ex));
  body.innerHTML=rzBody(rz.ex);
  rzBindAll();
});
document.addEventListener('change',e=>{
  if(!e.target||e.target.id!=='rzGrp') return;
  rz.grp=e.target.value; rz.ex=null;              // the new part picks its own top lift
  const card=document.querySelector('.rzcard');
  if(card) card.outerHTML=repZoneSections().split('</h2>')[1]; else render();
  rzBindAll();
});
/* v3.3.190: the bars + chart of ONE lift, on their own — so a chip tap can
   swap this alone instead of re-rendering Stats. A full render() reset the
   scroll to the top of the tab, which made picking a lift feel like
   leaving the page you were reading. */
/* v3.3.206: bind after every path that puts a scatter in the DOM — full
   render, lift-chip swap, and dropdown swap. The binding is idempotent
   (svg._rzBound), so calling it more than once is free; missing one of the
   three would ship a chart that silently ignores touch. */
function rzBindAll(){
  document.querySelectorAll('.rzcard .rzscat').forEach(bindRzScrub);
}
function rzBody(ex){
  const {counts}=repZoneData(ex,REPZONE_WINDOW);
  const max=Math.max(...counts,1);
  let out=`<div class="rzrows">`;
  REPZONE_LABELS.forEach(([range,name],i)=>{
    out+=`<div class="rzrow">
      <span class="rzlab">${range}<i>${name}</i></span>
      <span class="rzbar"><i style="width:${counts[i]?Math.round(counts[i]/max*100):0}%"></i></span>
      <span class="rzn"><b>${counts[i]}</b> set${counts[i]===1?'':'s'}</span>
    </div>`;
  });
  return out+`</div>`+repZoneScatterSvg(ex);
}
/* ============ v3.3.192 — intent gaps ============
   Question-addressed: "what did I mean to train, and haven't?" The ledger
   already answers it — exercises carrying a weight and zero sets are stated
   intentions that never became training, and they sit there for weeks. This
   surfaces them. No taxonomy, no recommender, no prescriptions; it proposes
   nothing the person hasn't already written down themselves.

   Register: statement of fact. No scolding, no encouragement, no score, no
   percentage of compliance, no streak language. Red is reserved for live.
   An empty list is a good outcome stated in one plain line, not congratulated.

   Keyed by CANONICAL ID (Phase 1), so a renamed exercise cannot appear as a
   stale ghost beside its own active self. */
const INTENT_GAP_DAYS=21;
const retired=()=>DB.settings.retired||(DB.settings.retired={});
function intentGaps(){
  const lastReal={},seen={};
  const scan=(iso,rows)=>{
    for(const r of rows){
      if(r[1]==='Run') continue;
      const id=rowCid(r); if(!id) continue;
      seen[id]=r[1];                                   // display via canonName, this is a fallback
      if((r[3]||[]).length) lastReal[id]=lastReal[id]&&lastReal[id]>iso?lastReal[id]:iso;
    }
  };
  for(const [iso,rows] of Object.entries(SEED.sessions)) scan(iso,rows);
  scan(todayISO,((DB.days[todayISO]||{}).w||[])
    .map(s2=>[s2.part,s2.ex,s2.w,s2.reps||[],s2.mins,s2.secs,s2.cid]));
  const out=[];
  for(const id of Object.keys(seen)){
    if(retired()[id]) continue;
    const last=lastReal[id];
    const days=last?daysAgo(last):null;               // null = never a completed set
    if(days!==null&&days<=INTENT_GAP_DAYS) continue;
    out.push({id,name:canonName(id)||seen[id],days});
  }
  /* never-logged first (the strongest signal), then longest-idle */
  return out.sort((a,b)=>(a.days===null?-1:0)-(b.days===null?-1:0)||(b.days||0)-(a.days||0));
}
function intentGapCard(){
  const gaps=intentGaps();
  if(!gaps.length) return `<div class="note">Nothing stated and untrained.</div>`;
  return `<div class="igrows">${gaps.map(g=>`<div class="igrow">
    <span class="igname">${g.name}</span>
    <span class="igwhen">${g.days===null?'never logged with reps':`<b>${g.days}</b> days`}</span>
    <button class="igx" data-igretire="${g.id}" aria-label="Stop showing ${g.name}">\u00d7</button>
  </div>`).join('')}</div>`;
}
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-igretire]');
  if(!b) return;
  retired()[b.dataset.igretire]=1;                    // preference, never the ledger
  DB.settingsAt=Date.now(); save(true); render();
});
/* ============ v3.3.194 — muscle coverage (7 days) ============
   Register: statement of trained days. No targets, no ideal frequency, no
   warnings — an untrained group is a light dot row and "0 days", in the
   same voice as a full one. Tap a group to open its internal receipt
   in place (no render(): the v3.3.190 lesson — a reader mid-scroll stays
   where they are). */
let _mcOpen=null;
function muscleCard(){
  const {days,groups}=muscleCoverage();
  return VISIBLE_GROUPS.map(v=>{
    const gg=groups[v];
    const open=_mcOpen===v;
    let inner='';
    if(open){
      const rows=Object.entries(gg.mus).sort((a,b)=>b[1].days.size-a[1].days.size);
      inner=`<div class="mcinner">${rows.length?rows.map(([m,st])=>
        `<div class="mcirow"><span class="mciname">${m}</span>
          <span class="mciwhen"><b>${st.days.size}</b> day${st.days.size===1?'':'s'} \u00b7 ${st.sets} set${st.sets===1?'':'s'}</span></div>`).join('')
        :`<div class="note">No sets in the last 7 days.</div>`}</div>`;
    }
    return `<div class="mcrow ${open?'open':''}" data-mcg="${v}">
      <span class="mcname">${v}</span>
      <span class="mcdots">${gg.dots.map(on=>`<i class="${on?'on':''}"></i>`).join('')}</span>
      <span class="mcn"><b>${gg.days.size}</b> day${gg.days.size===1?'':'s'} \u00b7 ${gg.sets} set${gg.sets===1?'':'s'}</span>
    </div>${inner}`;
  }).join('');
}
document.addEventListener('click',e=>{
  const r=e.target.closest&&e.target.closest('[data-mcg]');
  if(!r) return;
  _mcOpen=_mcOpen===r.dataset.mcg?null:r.dataset.mcg;
  const card=document.querySelector('.mccard');
  if(card) card.innerHTML=muscleCard(); else render();
});
function renderStats(){
  const _S={}; const cut=k=>{ _S[k]=h; h=''; };
  if(SEED.totals.sessions===0 && !hasAnyDays()){ $('#view').innerHTML=emptyHero('stats'); return; }
  const dates=workoutDates();
  const curves=yearCurves();
  const monthKey=todayISO.slice(0,7);

  // monthly workout-day counts (seed monthly + user days)
  const mdays={};
  for(const [m,v] of Object.entries(SEED.monthly)) mdays[m]=new Set();
  for(const d of dates){const m=d.slice(0,7);(mdays[m]=mdays[m]||new Set()).add(d);}
  const monthCounts=Object.fromEntries(Object.entries(mdays).map(([m,s])=>[m,s.size||((SEED.monthly[m]||{}).days||0)]));
  // seed monthly.days already correct pre-app; the dates set covers everything, so:
  for(const [m,v] of Object.entries(SEED.monthly)) monthCounts[m]=Math.max(monthCounts[m]||0,v.days);

  const thisYearDays=[...dates].filter(d=>d.startsWith(thisYear)).length;
  const trainedToday=dates.has(todayISO);
  const elapsed=elapsedDays();                                  // v3.3.95: one definition, shared with the chart
  const consNow=thisYearDays/elapsed;
  const lastYear=String(+thisYear-1);
  const lyCurve=curves[lastYear];
  const lyAtSamePoint=lyCurve?lyCurve.curve[Math.min(elapsed,lyCurve.end)-1]:null;
  const diff=lyAtSamePoint!=null?Math.round((consNow-lyAtSamePoint)*100):null;

  let h=`<h2 id="secDays">Show up — that's the whole game</h2>
    <div class="kpis">
      ${(()=>{
        /* v3.3.99: the game itself, finally under its own heading. Total days
           is THE number — the greeting says it, Settings says it, and the
           section titled "that's the whole game" somehow didn't. First card,
           flagship type via :first-child, and the section's ONE accent: the
           percentages are derived from this number and read chalk. Caption is
           the lifetime pace — receipts at life scale, the truest denominator
           the app has. */
        const total=msLiveTotal(), first=SEED.totals.first;
        let cap='';
        if(first){
          const span=Math.max(1,daysBetween(first,todayISO)+1-((((DB.days[todayISO]||{}).w)||[]).length?0:1));
          const since=new Date(first+'T00:00').toLocaleDateString('en-US',{month:'short',year:'numeric'});
          cap=`<div class="d">${Math.round(total/span*100)}% of all days since ${since}</div>`;
        }
        /* v3.3.100: the hero takes the whole row — number left, words right,
           so hierarchy comes from WIDTH and the row stays short. */
        return `<div class="kpi hero accent"><div class="v">${fmt(total)}</div>
          <span><div class="l">days of showing up</div>${cap}</span></div>`;
      })()}
      <div class="kpi"><div class="v">${Math.round(consNow*100)}%</div><div class="l">of ${thisYear}</div>
        ${diff!=null?`<div class="d ${diff>=0?'delta up':'delta down'}">${diff>=0?'+':''}${diff} vs ${lastYear}</div>`:''}</div>
      ${(()=>{
        const dNow=+todayISO.slice(8);
        const cur=(monthCounts[monthKey]||0)/dNow;
        const pv=new Date(+thisYear,+monthKey.slice(5)-1,0);            // last day of prev month
        const pKey=pv.toLocaleDateString('en-CA').slice(0,7);
        const pN=Math.min(dNow,pv.getDate());
        let pDays=0;
        for(let d2=1;d2<=pN;d2++) if(dates.has(`${pKey}-${String(d2).padStart(2,'0')}`)) pDays++;
        const diff=Math.round((cur-pDays/pN)*100);
        const pName=pv.toLocaleDateString('en-US',{month:'short'});
        return `<div class="kpi"><div class="v">${Math.round(cur*100)}%</div>
          <div class="l">of ${new Date(+thisYear,+monthKey.slice(5)-1,1).toLocaleDateString('en-US',{month:'short'})}</div>
          <div class="d mono" style="color:${diff>=0?'var(--accent)':'var(--record)'}">${diff>=0?'+':''}${diff} vs ${pName}</div></div>`;
      })()}
      <div class="kpi"><div class="v">${currentStreak()}</div><div class="l">streak · best ${longestStreak()}</div></div>
    </div>`;

  // consistency chart — the Dashboard bottom graph
  cut('kpis');
  /* v3.3.116: part mix — which parts got worked, day by day, so an
     under-served one is visible by its absence. Second from the top on the
     maker's call. Scrolls sideways and loads older weeks at its left edge. */
  h+=`<h2>Part mix${hActs('pmix',"Volume per body part per day. Runs excluded — km don't add to kg.",'About the part mix')}</h2>
      <div class="card">
        <div class="pmixlgd">${Object.keys(SEED.catalog).filter(p=>p!=='Run').map(p=>
          `<span data-pt="${p}"><i style="background:${PART_COLORS[p]||'var(--muted)'}"></i>${p}</span>`).join('')}</div>
        <div class="pmixread" id="pmixRead">Tap a bar or a name to follow one body part</div>
        <div class="pmixbox">
          <span class="pmixyr" id="pmixYr"></span>
          ${pmixAxisSvg(partMix(PMIX_DAYS))}
          <div class="pmixwrap" id="pmixWrap">${partMixSvg(PMIX_DAYS)}</div>
          <button class="pmixnow" id="pmixNow" aria-label="Back to latest">→</button>
        </div>
        <div class="pmixsum" id="pmixSum"></div>
      </div>`;
  cut('pmix');
  h+=`<h2>Muscle coverage \u00b7 7 days${hActs('mc','Days each group trained in the last 7, by each set\u2019s primary muscle. Tap a group for detail. Runs excluded.','About muscle coverage')}</h2>
      <div class="card mccard">${muscleCard()}</div>`;
  cut('mc');
  h+=`<h2>Stated, not trained${hActs('ig','Exercises in your log with no completed set in the last '+INTENT_GAP_DAYS+' days, or none ever. Tap \u00d7 to stop showing one.','About stated, not trained')}</h2>
      <div class="card igcard">${intentGapCard()}</div>`;
  cut('ig');
  h+=repZoneSections();
  cut('rz');
  h+=`<h2>Consistency${hActs('yoy','Percent of days trained, per year. The bold line is this year.','About the consistency chart')}</h2><div class="card">
      `;
  /* v3.3.109: the legend moves ABOVE the chart. While scrubbing it IS the
     readout, and below the chart it sat under the hand doing the scrubbing.
     It also has to be built before the chart is emitted, so `years` is
     resolved up here now. */
  const years=Object.keys(curves).filter(y=>y>='2022').sort();
  h+=`<div class="legend1">`;
  for(const y of years){
    const c=curves[y], cur=y===thisYear;
    h+=`<span class="${cur?'cur':''}" data-yr="${y}" role="button"><i style="background:${YEAR_COLORS[y]}"></i>${y}<b>${Math.round(c.curve[c.end-1]*100)}%</b></span>`;
  }
  h+=`</div>
      <div class="zoomhint">pinch / scroll to zoom · double-tap to reset</div>
      <div class="zoom" data-zoom>
      <svg viewBox="0 0 340 220" style="width:100%;height:auto"
        data-scrub="pct" data-sx0="20" data-sxw="302" data-sy0="190" data-syh="170" data-smax="1">`;
  /* v3.3.129: 170 -> 220 tall. baseline 140 -> 190, span 120 -> 170. The
     data-sy0/data-syh anchors MUST track the geometry or the legend reports
     the wrong % while scrubbing — the readout is derived from them. */
  // y grid + labels
  for(const g of [0,0.25,0.5,0.75,1]){
    const y=190-g*170;
    h+=`<line x1="20" y1="${y}" x2="322" y2="${y}" stroke="var(--line)" stroke-width="0.6" ${g?'stroke-dasharray="2 3"':''}></line>
        <text x="16" y="${y+3}" text-anchor="end" font-family="var(--mono)" font-size="7" fill="var(--muted)">${g*100}%</text>`;
  }
  // x months
  ['J','F','M','A','M','J','J','A','S','O','N','D'].forEach((m,i)=>{
    const x=20+((i*30.4+15)/366)*302;
    h+=`<line x1="${x}" y1="190" x2="${x}" y2="193" stroke="var(--line)" stroke-width="0.6"></line>
        <text x="${x}" y="202" text-anchor="middle" font-family="var(--mono)" font-size="7" fill="var(--muted)">${m}</text>`;
  });
  /* v3.3.129: end-of-line % tags used to be emitted inline, so four years
     finishing within a few points of each other stacked into an unreadable
     smear (60/57 in the field report). Collect them, nudge apart, THEN
     emit — the same pass the distance chart has used since v3.3.89. */
  const endLabels=[];
  for(const y of years){
    const {curve,end}=curves[y];
    let pts='';
    for(let d=0;d<end;d+=2){
      const x=20+(d/366)*302, yy=190-curve[d]*170;
      pts+=`${x.toFixed(1)},${yy.toFixed(1)} `;
    }
    const cur=y===thisYear;
    h+=`<polyline data-yr="${y}" points="${pts}" fill="none" stroke="${YEAR_COLORS[y]||'var(--muted)'}"
         stroke-width="${cur?2.2:1.1}" opacity="${cur?1:.7}" stroke-linejoin="round"></polyline>`;
    const lx=20+((end-1)/366)*302, ly2=190-curve[end-1]*170;
    endLabels.push({y,lx,ly:ly2,cur,pct:Math.round(curve[end-1]*100)});
    if(cur) h+=`<circle class="beacon" cx="${lx}" cy="${ly2}" r="3.2" fill="var(--accent)"></circle>`;
  }
  endLabels.sort((a,b)=>a.ly-b.ly);
  for(let i=1;i<endLabels.length;i++)
    if(endLabels[i].ly-endLabels[i-1].ly<8) endLabels[i].ly=endLabels[i-1].ly+8;
  for(const L of endLabels)
    h+=`<text data-yr="${L.y}" x="${Math.min(L.lx+4,312).toFixed(1)}" y="${(L.ly+2.5).toFixed(1)}" font-family="var(--mono)" font-size="7"
          fill="${YEAR_COLORS[L.y]||'var(--muted)'}" font-weight="${L.cur?700:400}">${L.pct}%</text>`;
  h+=`</svg></div></div>`;   // v3.3.112: share moved to the header

  // heatmap: 26 weeks, weekday rail on the left, months across the top
  const detail=allDays();
  cut('cons');
  h+=`<h2>Last 6 months${hActs('heat','One column per week. Filled squares are trained days.','About the 6-month heatmap')}</h2><div class="card"><div class="heatwrap">
        <div class="wdrail">${['S','M','T','W','T','F','S'].map(d=>`<span>${d}</span>`).join('')}</div>
        <div class="heatcols"><div class="heatscroll">`;
  const start2=new Date(todayISO+'T00:00');
  start2.setDate(start2.getDate()-start2.getDay()-25*7);
  let mrow='', grid='', lastM=-1;
  for(let w=0;w<26;w++){
    const first=new Date(start2); first.setDate(start2.getDate()+w*7);
    const m=first.getMonth();
    mrow+=`<span class="mlab">${m!==lastM?first.toLocaleDateString('en-US',{month:'short'}):''}</span>`;
    lastM=m;
    grid+=`<div class="wk">`;
    for(let dd=0;dd<7;dd++){
      const c=new Date(start2); c.setDate(start2.getDate()+w*7+dd);
      const iso=c.toLocaleDateString('en-CA');
      const future=iso>todayISO;
      grid+=`<i data-l="${dates.has(iso)?2:0}" class="${iso===todayISO?'today':''} ${future?'fut':''}" title="${iso}"></i>`;
    }
    grid+=`</div>`;
  }
  h+=`<div class="mrow">${mrow}</div><div class="heat">${grid}</div></div>`;
  h+=`</div></div></div>`;

  // days per month bars
  const ms=Object.entries(monthCounts).sort().slice(-12);
  const dayOfMonth=+todayISO.slice(8);
  const daysInMonth=new Date(+thisYear,+monthKey.slice(5),0).getDate();
  const trainedThis=monthCounts[monthKey]||0;
  cut('last6');
  h+=`<h2>Days by month${hActs('dbm','The dashed line marks 20 days.','About the monthly chart')}</h2><div class="card">
      <div class="zoomhint">pinch to zoom</div>
      <div class="zoom" data-zoom>
      <svg viewBox="0 0 330 150" style="width:100%;height:auto">
      <line x1="8" y1="${126-20/31*112}" x2="316" y2="${126-20/31*112}" stroke="var(--line)" stroke-width="0.6" stroke-dasharray="2 3"></line>
      <text x="319" y="${128-20/31*112}" font-family="var(--mono)" font-size="7" fill="var(--muted)">20</text>`;
  ms.forEach(([m,n],i)=>{
    const cur=m===monthKey;
    const bh=Math.max(2,n/31*112), x=8+i*25.5;   // v3.3.129: span 80 -> 112, baseline 94 -> 126
    if(cur){                                  // dashed outline = days elapsed, so a short bar isn't misread
      const gh=dayOfMonth/31*112;
      h+=`<rect x="${x}" y="${126-gh}" width="17" height="${gh}" rx="3" fill="none"
            stroke="var(--accent)" stroke-width="0.8" stroke-dasharray="2 2"></rect>`;
    }
    h+=`<rect class="gbar" x="${x}" y="${126-bh}" width="17" height="${bh}" rx="3" fill="var(--accent)" opacity="${cur?1:.55}"></rect>`;
    if(cur){
      // trained count sits INSIDE the fill; the number above the dashes is days elapsed
      const gh=dayOfMonth/31*112;
      h+=`<text x="${x+8.5}" y="${126-gh-3}" text-anchor="middle" font-family="var(--mono)" font-size="7" fill="var(--muted)">${dayOfMonth}</text>
          <text x="${x+8.5}" y="${Math.min(123,126-bh+9)}" text-anchor="middle" font-family="var(--mono)" font-size="7" font-weight="700" fill="#fff">${n}</text>`;
    }else{
      h+=`<text x="${x+8.5}" y="${126-bh-3}" text-anchor="middle" font-family="var(--mono)" font-size="7" fill="var(--muted)">${n}</text>`;
    }
    h+=`<text x="${x+8.5}" y="139" text-anchor="middle" font-family="var(--mono)" font-size="7" fill="${cur?'var(--accent)':'var(--muted)'}">${m.slice(5)}</text>`;
  });
  h+=`</svg></div>
      <div class="tot"><span><b>${trainedThis}</b> trained · ${dayOfMonth-trainedThis} rested</span><span>${dayOfMonth} days into ${monthKey.slice(5)}</span></div></div>`;

  // monthly km — the Run tab owns the charts now; this map still feeds the
  // composition overlay further down.
  const kmBy={};
  for(const [m,v] of Object.entries(SEED.monthly)) kmBy[m]=v.km||0;
  for(const [d,v] of Object.entries(DB.days)){
    if(d<=SEED.totals.last) continue;
    for(const s of v.w) if(s.ex==='Run') kmBy[d.slice(0,7)]=(kmBy[d.slice(0,7)]||0)+s.w;
  }

  // which weekdays you show up — last 365 days, on an absolute 0–100% scale
  const _wd=wdDist();                       // v3.3.114: one source, svg + card
  const wdPct=_wd.pct;
  const wdBest=Math.max(...wdPct);
  /* v3.3.46: the accent marks TODAY's weekday — the row you're standing in —
     not the statistically strongest one. The strongest still gets a quiet
     caret above its bar so the pattern stays visible without competing with
     today for the one loud colour. (Ties: first match wins the caret; today
     always wins the accent even if today is also the strongest.) */
  const wdToday=new Date(todayISO+'T00:00').getDay();
  const bestI=wdPct.indexOf(wdBest);
  cut('dbm');
  h+=`<h2>Weekdays${hActs('wd','\u25b2 marks your strongest weekday. Blue is today.','About the weekday chart')}</h2><div class="card">
      <svg viewBox="0 0 330 150" style="width:100%;height:auto">`;   // v3.3.129: 118→150 (v3.3.113 had cut 140→118; at that height the caret and the % label had nowhere to go)
  for(const g of [0,25,50,75,100]){
    const y=126-g/100*113;    // v3.3.129: baseline 94→126, span 81→113
    h+=`<line x1="24" y1="${y}" x2="316" y2="${y}" stroke="var(--line)" stroke-width="0.6" ${g?'stroke-dasharray="2 3"':''}></line>
        <text x="21" y="${y+3}" text-anchor="end" font-family="var(--mono)" font-size="7" fill="var(--muted)">${g}</text>`;
  }
  ['S','M','T','W','T','F','S'].forEach((lab,i)=>{
    const p=wdPct[i], today=i===wdToday, best=i===bestI;
    const bh=Math.max(2,p*113), x=32+i*41;
    h+=`<rect class="gbar wd-col" x="${x}" y="${126-bh}" width="26" height="${bh}" rx="4"
          fill="${today?'var(--accent)':'var(--accent-dim)'}" opacity="${today?1:.6}"></rect>`;
    /* v3.3.129: one stack, always the same order — bar, then % 4 above it,
       then the caret 11 above that. The old code branched the % position on
       today/best and put the caret at a fixed 8 above the bar, so a day that
       was BOTH today and strongest (Tue, in the field report) drew them 4
       units apart, on top of each other. Position no longer depends on
       which flags are set, so no combination can collide. */
    const pctY=126-bh-4;
    h+=`<text x="${x+13}" y="${pctY}" text-anchor="middle" font-family="var(--mono)" font-size="8" fill="${today?'var(--accent)':'var(--muted)'}" font-weight="${today?700:400}">${Math.round(p*100)}%</text>`;
    if(best) h+=`<text x="${x+13}" y="${pctY-11}" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="var(--muted)">▲</text>`;
    h+=`<text x="${x+13}" y="141" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="${today?'var(--chalk)':'var(--muted)'}" font-weight="${today?700:400}">${lab}</text>`;
  });
  h+=`</svg><div class="note">% of each weekday trained, last 365 days · ▲ your strongest</div></div>`;

  // month-by-month composition — the sheet's "Which part am I missing out?" chart
  /* v3.1.13: the stacked-months chart and the radar are gone (Sungjee's
     verdict: one needed scrolling, the other prompted nothing). Replaced by
     two scroll-free views that each answer ONE question. */

  /* --- "Have I kept showing up?" — every month ever, one screen --- */
  const _gd=gridData();
  const mDays=_gd.mDays, gy0=_gd.y0, gy1=_gd.y1, gMax=_gd.max, m0=_gd.m0, mNow=_gd.mNow;
  cut('wd');
  h+=`<h2 id="secParts">Every month${hActs('mgrid','Darker means more days. Tap a month to open it.','About the month grid')}</h2><div class="card">
      <div class="mgrid"><span></span>${'JFMAMJJASOND'.split('').map(c=>`<span class="mg-h">${c}</span>`).join('')}`;
  for(let y=gy0;y<=gy1;y++){
    h+=`<span class="mg-y mono">'${String(y).slice(2)}</span>`;
    for(let m=1;m<=12;m++){
      const k=`${y}-${String(m).padStart(2,'0')}`;
      const n=mDays[k]||0;
      const out=k<m0||k>mNow;
      const a=Math.round(mgAlpha(n,gMax,k===mNow)*100);
      h+=`<span class="mg-c mono ${k===mNow?'cur':''}" ${out?'':`data-mk="${k}"`} style="${n?`background:color-mix(in srgb, var(--accent) ${a}%, transparent)`:''}">${out?'':(n||'·')}</span>`;
    }
  }
  h+=`</div><div id="mexp"></div>
      </div>`;   // v3.3.112: share moved to the header

  cut('em');
  /* v3.3.111: "Last 30 days, vs your usual" removed on the maker's call — no
     value found in it. Its entire last30/drift computation went with it;
     nothing else read those. */
  h+=bwCard();                       // v3.3.69: you, before the part-by-part drift
  h+=moGoalCardHTML();               // v3.3.162: the goal sits under Weight, above RUN
  cut('wt');

  /* v3.3.130: "Report card" RETURNS, but not as the v3.3.111 section that
     was removed. That one was a month-stepper with its own share card. This
     one is the app's single share surface: rotate to the card you want, then
     send it. Every per-section share button is gone in favour of it. */
  h+=`<h2 id="secReport">Report card${hActs('rep','Swipe to a card, then share it as an image.','About the report card')}</h2>
      <div class="card repcard" id="repCard">
        <div class="repnav">
          <button class="repar" id="repPrev" aria-label="Previous card">‹</button>
          <div class="repttl" id="repTtl">&nbsp;</div>
          <button class="repar" id="repNext" aria-label="Next card">›</button>
        </div>
        <div class="repthumbwrap"><img id="repThumb" alt="" class="repthumb"></div>
        <div class="note repdots" id="repDots"></div>
        <button class="btn" id="repShare">Share as image</button>
        <button class="btn ghost" id="repAll" style="margin:8px 0 0">Save all ${shareCards().length}</button>
      </div>`;
  cut('rep');
  // sections emit in one declared order (v3.3.111)
  h = _S.kpis + _S.rz + _S.pmix + _S.mc + _S.ig + _S.cons + _S.em + _S.dbm + _S.last6 + _S.wd + _S.wt;

  // the whole Run story lives here now (was its own tab in v2.04 — reverted)
  h+=runStatsHTML();

  // records — kept, but demoted below the days story
  h+=`<h2 id="secRecords">Records</h2>`;
  for(const part of Object.keys(SEED.catalog)){
    if(part==='Run') continue;
    const rows=catFor(part).map(e=>[e,prFor(e),exTier(e)]).filter(([,p])=>p.mw>0).sort((a,b)=>b[1].mw-a[1].mw);
    if(!rows.length) continue;
    const core=rows.filter(r=>r[2]==='goto'), other=rows.filter(r=>r[2]!=='goto');
    h+=`<h2 class="quiet" style="margin-top:16px">${part}</h2>`;
    if(core.length){
      h+=`<table class="rec-core"><tr><th>Core exercises</th><th style="text-align:right">Top (${U()})</th></tr>`;
      core.forEach(([e,p])=>{h+=`<tr><td><b>${e}</b></td><td class="n"><b>${wDisp(p.mw)}</b> × ${p.mwr}
        <button class="tmove" data-tier-ex="${e}" data-tier-to="other" title="Move to Other">↓</button></td></tr>`;});
      h+=`</table>`;
    }
    if(other.length){
      h+=`<table class="rec-other"><tr><th>Other</th><th></th></tr>`;
      other.forEach(([e,p])=>{h+=`<tr><td>${e}</td><td class="n">${wDisp(p.mw)} × ${p.mwr}
        <button class="tmove" data-tier-ex="${e}" data-tier-to="core" title="Move to Core">↑</button></td></tr>`;});
      h+=`</table>`;
    }
  }

  h+=_S.rep;                         // v3.3.130: the exit — you have seen the numbers, here is the receipt

  h+=`<h2>Settings</h2>
      <button class="btn ghost" id="settingsBtn">⚙︎ Settings, account &amp; sync</button>
      <div class="note" style="text-align:center">${session?`Signed in as ${session.user.email||'—'}`:'Not signed in — data is on this device only'} · ${APP_VERSION}</div>`;
  $('#view').innerHTML=h;
  rzBindAll();
  /* v3.3.42: the 6-month heatmap runs oldest → newest, so its default
     scroll position showed January and hid today. Park it at the right
     edge — the current week is the whole point of the strip. scrollLeft on
     the scroller itself, never scrollIntoView, which would drag the page. */
  /* v3.3.109: .legend1 dropped from this list — it wraps now instead of
     scrolling, so there is no right edge to park at. This parking was the
     workaround for the scroller hiding the current year, which is exactly
     the bug it failed to prevent. */
  document.querySelectorAll('.heatcols,.heat').forEach(el=>{
    if(el.scrollWidth>el.clientWidth) el.scrollLeft=el.scrollWidth;
  });
  if(typeof paintRepCard==='function') paintRepCard();   // v3.3.130: fill the report card preview
}


/* ---------- D3: tap a grid month, it opens in place ---------- */
let _mexpK=null;
document.addEventListener('click',e=>{
  const c=e.target.closest('.mg-c[data-mk]'); if(!c) return;
  const box=document.getElementById('mexp'); if(!box) return;
  const k=c.dataset.mk;
  if(_mexpK===k){ _mexpK=null; box.innerHTML=''; return; }
  _mexpK=k;
  const base=new Date(todayISO+'T00:00'); base.setDate(1);
  const tgt=new Date(k+'-01T00:00');
  const off=(base.getFullYear()-tgt.getFullYear())*12+(base.getMonth()-tgt.getMonth());
  const rd=repData(off);   // v3.3.111: the only remaining caller
  box.innerHTML=`<div class="mexpIn">
    <div class="repline mono">${rd.label} — ${rd.nD} day${rd.nD===1?'':'s'} · ${fmt(Math.round(rd.vol))} kg · ${rd.km.toFixed(1)} ${DU()}${rd.mx>1?` · best streak ${rd.mx}d`:''}</div>
    <div class="mexpDots">${rd.days.map(d=>`<i class="${d.fut?'f':(d.tr?'t':'')}" title="${d.d}"></i>`).join('')}</div>
  </div>`;
});


/* ---------- v3.3.13: tap a year in any YoY legend — isolate its line ---------- */
document.addEventListener('click',e=>{
  const yb=e.target.closest('.legend1 [data-yr]'); if(!yb) return;
  const card=yb.closest('.card'); if(!card) return;
  const yr=yb.dataset.yr;
  const marks=card.querySelectorAll('svg [data-yr], .legend1 [data-yr]');
  if(card.dataset.ysel===yr){
    delete card.dataset.ysel;
    marks.forEach(m=>m.classList.remove('selY'));
  }else{
    card.dataset.ysel=yr;
    marks.forEach(m=>m.classList.toggle('selY',m.dataset.yr===yr));
  }
});
