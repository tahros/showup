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
    : 'One block = one completed set · tap to follow a body part';
}
/* v3.3.208: a receipt, not a performance verdict. Set count is comparable
   across equipment, but more sets are not automatically a better workout,
   so the old up/down trend is deliberately gone. */
function pmixSummary(){
  const el=document.getElementById('pmixSum'); if(!el) return;
  const rows=partMix(PMIX_DAYS), P=PMIX_FOCUS;
  const vals=rows.map(r=>P?(r.by[P]||0):r.total).filter(v=>v>0);
  if(!vals.length){ el.textContent=''; return; }
  const sum=vals.reduce((a,b)=>a+b,0), avg=sum/vals.length;
  el.innerHTML=`${P?`<b style="color:${PART_COLORS[P]}">${P}</b>`:'All strength'}
    · ${fmt(sum)} completed set${sum===1?'':'s'} across ${vals.length} session${vals.length===1?'':'s'}
    · ${fmt(+avg.toFixed(1))} avg`;
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
const pmixTick=v=>fmt(Math.round(v));
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
  const bw=PMIX_COLW-2.5, unit=(PMIX_BASE-PMIX_TOP)/max;
  let s=`<svg viewBox="0 0 ${W} ${PMIX_H}" width="${W}" height="${PMIX_H}"
      style="height:${PMIX_H}px" data-pmix>
      <defs><pattern id="pmixBrick" width="1" height="${unit.toFixed(4)}"
        patternUnits="userSpaceOnUse" patternTransform="translate(0 ${PMIX_BASE})">
        <path d="M0 .4H1" stroke="var(--ground)" stroke-width=".8"></path>
      </pattern></defs>`;
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
    const x=8+i*PMIX_COLW, latest=i===rows.length-1;
    const live=latest&&r.d===todayISO&&isLive();
    s+=`<rect class="pmixcol${latest?' latest':''}${live?' live':''}" data-col="${i}"
         x="${x-2}" y="${PMIX_TOP}" width="${PMIX_COLW}"
         height="${PMIX_BASE-PMIX_TOP}"></rect>`;
    let y=PMIX_BASE;
    for(const p of Object.keys(SEED.catalog)){
      const n=r.by[p]; if(!n) continue;
      const hh=(n/max)*(PMIX_BASE-PMIX_TOP);
      y-=hh;
      s+=`<rect class="pmixseg${latest?' latest':''}" x="${x}" y="${y.toFixed(1)}" width="${bw}" height="${hh.toFixed(1)}"
           fill="${PART_COLORS[p]||'var(--muted)'}" data-pt="${p}"
           stroke="var(--ground)" stroke-width="0.5"></rect>`;
    }
    /* One patterned overlay cuts the coloured stack into equal set-sized
       blocks without adding thousands of SVG nodes across the archive. */
    if(r.total){
      const bh=(r.total/max)*(PMIX_BASE-PMIX_TOP);
      s+=`<rect class="pmixbricks${latest?' latest':''}" data-bricks="${r.total}"
           x="${x}" y="${(PMIX_BASE-bh).toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}"
           fill="url(#pmixBrick)" pointer-events="none"></rect>`;
    }
    // while a part is isolated, that part's own set count is written above it
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
/* ================= v3.3.211 — Growth Audit (Stats only) ================
   Rep Zones described where repetitions landed, then labelled 6–12 as
   "growth" and 13+ as "endurance". That was too much information and too
   much certainty: rep count alone cannot tell whether a set caused growth.

   Growth Audit uses only observable facts. The visible model has three states:
   EMPTY means no set in the last seven days; GOING UP means a comparable best
   moved inside the same canonical exercise; everything active without that
   confirmed move is FLAT. The richer confidence states stay internal. */
const GA_RECENT_DAYS=7;
const GA_HISTORY_DAYS=42;
/* v3.3.220 — ONE standard for the badge and the mark.
   Before this a row could read "+2.5 kg" beside a flat mark, because the two
   were computed by different machines on different clocks: the badge from a
   weight-first record book with 42-day memory, the mark from a strict Pareto
   walk over the last 6 sessions. Both were defensible; together on one row
   they contradicted each other, and the maker read that (correctly) as a bug.
   They are now the SAME object — a row is lit if and only if it carries a
   badge, because both come from gaPR().

   The rule, in gym terms: a set is a PR when nothing ever logged beats it on
   BOTH axes — no earlier set at that weight or heavier already had that many
   reps. So 50x10 after 45x15 is a PR (new heaviest), 75x4 after 75x2 is a PR
   (rep record at that weight), and a 20kg x 30 deload is NOT one unless 30
   reps at 20kg or more was genuinely never done. That per-weight comparison
   is what stops "or more reps" becoming a light-day loophole.

   Window: 28 days (maker's call, argued from cadence). At roughly weekly
   exposure per body part that is about four sessions of a lift — the same
   count the previous design used for "worth reviewing". Four exposures with
   no PR and the arrow goes dark, so a stall surfaces inside a month. The
   WHOLE ledger is searched for the record; only its DATE is windowed. */
const GA_PR_DAYS=28;
const ga={grp:null,open:null};
const GA_SIGNAL_LABELS={empty:'Empty',flat:'Flat',up:'Going up'};
const gaIcon=(key,cls)=>`<i class="${cls} ga-${key}" role="img"
  aria-label="${GA_SIGNAL_LABELS[key]}" title="${GA_SIGNAL_LABELS[key]}"></i>`;
/* canonical identity survives display-name edits and merges */
const rowCid=r=>r[6]||canonId(r[1],false)||r[1];
function gaAllSessions(){
  const out=SEED.dates.map(d=>[d,SEED.sessions[d]]);
  const t=((DB.days[todayISO]||{}).w||[]).map(s2=>
    [s2.part,s2.ex,s2.w,s2.reps||[],s2.mins,s2.secs,s2.cid]);
  if(t.length) out.push([todayISO,t]);
  return out;
}
function gaGroupForRow(r){
  const m=exMuscle(r[1],r[0]);
  return MUSCLE_VISIBLE[m]||PART_VISIBLE[r[0]]||r[0];
}
/* One entry per canonical exercise, with one session per actual training day.
   Folded sheet rows and one-row-per-set app data become the same point list. */
function gaExerciseSessions(){
  const out={};
  for(const [iso,rows] of gaAllSessions()){
    const onDay={};
    for(const r of rows){
      if(r[1]==='Run'||!(r[3]||[]).length) continue;
      const id=rowCid(r), e=onDay[id]=onDay[id]||{
        d:iso,id,name:canonName(id)||r[1],group:gaGroupForRow(r),points:[],sets:0};
      for(const rep of r[3]) e.points.push({w:+r[2]||0,rep:+rep||0});
      e.sets+=r[3].length;
    }
    for(const [id,e] of Object.entries(onDay)){
      const x=out[id]=out[id]||{id,name:e.name,group:e.group,sessions:[],sets:0};
      x.name=e.name; x.group=e.group; x.sessions.push(e); x.sets+=e.sets;
    }
  }
  return out;
}
/* The record book AND the growth signal, from one walk over the ledger.
   `best` is the headline set (heaviest, then most reps) — unchanged, it is
   simply what the row displays. `pr` is the most recent set that beat every
   earlier set per-weight; `live` is whether that fell inside the window.
   Badge and mark both read `live`, so they cannot disagree. */
function gaPR(ex){
  let best=null, pr=null;
  const seen=[];                    // every set logged, chronological
  for(const s of ex.sessions) for(const p of s.points){
    if(!best||p.w>best.w||(p.w===best.w&&p.rep>best.rep)) best={w:p.w,rep:p.rep,d:s.d};
    const beaten=seen.some(q=>q.w>=p.w&&q.rep>=p.rep);
    if(seen.length&&!beaten){
      /* Name the gain against the benchmark the rule itself uses. A set is a
         PR because nothing at this weight-or-heavier had these reps, and
         nothing at these reps-or-more was this heavy — so those two are the
         only honest comparisons. Weight leads when both exist; it is the
         headline number on the row. */
      const sameReps=seen.filter(q=>q.rep>=p.rep).sort((a,b)=>b.w-a.w)[0];
      const sameW=seen.filter(q=>q.w>=p.w).sort((a,b)=>b.rep-a.rep)[0];
      pr={d:s.d,w:p.w,rep:p.rep,
          beat: sameReps||sameW||null,          // the set the receipt names
          text: sameReps ? `+${wDisp(p.w-sameReps.w)} ${U()}`
              : sameW ? `+${p.rep-sameW.rep} rep${p.rep-sameW.rep===1?'':'s'}`
              : 'New best'};
    }
    seen.push({w:p.w,rep:p.rep});
  }
  const live=!!pr&&daysAgo(pr.d)<GA_PR_DAYS;
  return {best,pr,live,change:live?pr:null};
}
function growthAuditData(){
  const exMap=gaExerciseSessions();
  const groups=Object.fromEntries(VISIBLE_GROUPS.map(g=>[g,{name:g,sets:0,days:new Set(),ex:[]}]))
  for(const [iso,rows] of gaAllSessions()){
    for(const r of rows){
      if(r[1]==='Run'||!(r[3]||[]).length) continue;
      const g=groups[gaGroupForRow(r)],ago=daysAgo(iso);
      if(g&&ago>=0&&ago<GA_RECENT_DAYS){g.sets+=r[3].length;g.days.add(iso);}
    }
  }
  for(const ex of Object.values(exMap)){
    const g=groups[ex.group]; if(!g) continue;
    const last=ex.sessions.at(-1).d;
    g.ex.push({...ex,live:gaPR(ex).live,last,ago:daysAgo(last)});
  }
  for(const g of Object.values(groups)){
    g.ex.sort((a,b)=>a.ago-b.ago||a.name.localeCompare(b.name));
    g.ago=g.ex.length?Math.min(...g.ex.map(e=>e.ago)):Infinity;
    const activeEx=g.ex.filter(e=>e.ago<GA_RECENT_DAYS);
    /* a group is going up when any lift trained recently holds a live PR */
    g.signal=!g.sets?'empty':activeEx.some(e=>e.live)?'up':'flat';
  }
  const order=VISIBLE_GROUPS.slice().sort((a,b)=>groups[a].ago-groups[b].ago||a.localeCompare(b));
  return {groups,order};
}
function growthAuditSection(){
  const data=growthAuditData(),groups=data.groups;
  if(!ga.grp||!groups[ga.grp]) ga.grp=data.order[0];
  const g=groups[ga.grp],recent=g.ex.filter(e=>e.ago<GA_HISTORY_DAYS);
  const shown=(recent.length?recent:g.ex).slice(0,4).map(e=>({...e,record:gaPR(e)}));
  return `<h2>Growth audit${hActs('ga',"Dot: no completed sets in 7 days · line: trained, no confirmed gain · trend: comparable best moved.",'About Growth audit')}</h2>
    <div class="card gacard" data-gacard="${ga.grp}">
      <select id="gaGrp" class="gasel" aria-label="Body part">${data.order.map(v=>
        `<option value="${v}" ${v===ga.grp?'selected':''}>${v}</option>`).join('')}</select>
      <div class="gahead"><small>${g.sets} completed set${g.sets===1?'':'s'} · ${g.days.size} day${g.days.size===1?'':'s'}</small>
        ${gaIcon(g.signal,'gastate')}</div>
      <div class="garows">${shown.length?shown.map(e=>`<div class="garow${ga.open===e.id?' open':''}" data-gaex="${e.id}">
        <b>${e.name}</b><span class="garight">${e.record.best?`<span class="garecord"><span class="garecordlabel">Heaviest</span><strong>${wTxt(e.name,e.record.best.w)} × ${e.record.best.rep}</strong></span>`:''}
          ${e.record.change?`<span class="gadelta">${e.record.change.text}</span>`:''}${gaIcon(e.ago>=GA_RECENT_DAYS?'empty':e.record.live?'up':'flat','gabadge')}</span></div>${
        ga.open===e.id?gaReceipt(e):''}`).join(''):
        `<div class="note">No completed sets recorded for this group.</div>`}</div>
    </div>`;
}
/* v3.3.221: tap a row to see WHICH logged set is the PR. The row prints the
   all-time best and the delta; those are summaries, and the maker asked which
   actual record earned them. This states the set, the day it was done, and
   the set it beat — the same three facts the rule itself compares, so the
   receipt is the rule made visible rather than a second explanation.
   Opens in place (no render(), no scroll jump) — the v3.3.190 lesson. */
const gaDay=iso=>{
  const [y,m,d]=iso.split('-');
  return `${+m}/${+d}/${y.slice(-2)}`;
};
function gaReceipt(e){
  const r=e.record, pr=r.pr;
  if(!r.best) return `<div class="garcpt"><div class="note">No completed sets yet.</div></div>`;
  if(!pr) return `<div class="garcpt"><div class="garcnote">No improvement yet.</div></div>`;
  const rows=[];
  if(pr) rows.push(['Improved to',`${wTxt(e.name,pr.w)} \u00d7 ${pr.rep}`,gaDay(pr.d)]);
  if(pr&&pr.beat) rows.push(['Previous best',`${wTxt(e.name,pr.beat.w)} \u00d7 ${pr.beat.rep}`,'']);
  return `<div class="garcpt">${rows.map(([k,v,w])=>
    `<div class="garcrow"><span class="garck">${k}</span><b>${v}</b><span class="garcw">${w}</span></div>`).join('')}</div>`;
}
document.addEventListener('click',e=>{
  const row=e.target.closest&&e.target.closest('[data-gaex]');
  if(!row) return;
  ga.open=ga.open===row.dataset.gaex?null:row.dataset.gaex;
  const card=document.querySelector('.gacard');
  if(card) card.outerHTML=growthAuditSection().split('</h2>')[1]; else render();
});
document.addEventListener('change',e=>{
  if(!e.target||e.target.id!=='gaGrp') return;
  ga.grp=e.target.value;
  const card=document.querySelector('.gacard');
  if(card) card.outerHTML=growthAuditSection().split('</h2>')[1]; else render();
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
function currentRhythmSection(){
  const dates=workoutDates(),now=new Date(todayISO+'T00:00'),year=now.getFullYear(),month=now.getMonth();
  const first=new Date(year,month,1),last=new Date(year,month+1,0).getDate();
  const offset=(first.getDay()+6)%7,today=now.getDate(),week=Math.floor((offset+today-1)/7);
  const streak=currentStreak(),best=longestStreak(),active=new Set();
  const end=new Date(now);
  if(!dates.has(todayISO)) end.setDate(end.getDate()-1);
  for(let i=0;i<streak;i++){
    active.add(end.toLocaleDateString('en-CA')); end.setDate(end.getDate()-1);
  }
  const cells=[];
  for(let i=0;i<offset;i++) cells.push('<i class="crblank" aria-hidden="true"></i>');
  let monthDays=0;
  for(let day=1;day<=last;day++){
    const d=new Date(year,month,day),iso=d.toLocaleDateString('en-CA');
    const done=dates.has(iso),future=iso>todayISO,isToday=iso===todayISO;
    if(done) monthDays++;
    const cls=['crday'];
    if(done) cls.push('crdone');
    if(active.has(iso)) cls.push('cractive');
    if(future) cls.push('crfuture');
    if(isToday) cls.push('crtoday');
    if(Math.floor((offset+day-1)/7)===week) cls.push('crweek');
    cells.push(`<span class="${cls.join(' ')}" role="img" aria-label="${iso}${done?' · completed workout':future?' · future':' · no completed workout'}">${day}</span>`);
  }
  const monthName=now.toLocaleDateString('en-US',{month:'long'});
  return `<h2>Current rhythm${hActs('rhythm','Your active streak and completed workout days in the current month. Today fills with the first completed set.','About Current rhythm')}</h2>
    <div class="card crcard">
      <div class="crhead"><span><small>Current streak</small><b>${streak} day${streak===1?'':'s'}</b></span>
        <span class="crbest"><small>Best</small><b>${best}</b><small>days</small></span></div>
      <div class="crmonth"><span>${monthName.toUpperCase()} ${year}</span><b>${monthDays} day${monthDays===1?'':'s'}</b></div>
      <div class="crweekdays">${'MTWTFSS'.split('').map(v=>`<span>${v}</span>`).join('')}</div>
      <div class="crgrid">${cells.join('')}</div>
    </div>`;
}
function consistencyRaceSection(){
  const race=consistencyRaceData();
  if(!race.hasPrevious) return '';
  const {current,previous,gap}=race,x0=34,xw=288,y0=182,yh=150;
  const max=Math.max(10,Math.ceil(Math.max(current.total,previous.total)/10)*10);
  const pts=curve=>curve.map((v,i)=>`${(x0+i/Math.max(1,curve.length-1)*xw).toFixed(1)},${(y0-v/max*yh).toFixed(1)}`);
  const cp=pts(current.curve),pp=pts(previous.curve);
  const area=cp.concat(pp.slice().reverse()).join(' ');
  const grid=[0,.25,.5,.75,1].map(p=>{
    const y=y0-p*yh,v=Math.round(max*p);
    return `<line x1="${x0}" y1="${y}" x2="${x0+xw}" y2="${y}" stroke="var(--line)" stroke-width=".6" ${p?'stroke-dasharray="2 3"':''}></line>
      <text x="${x0-5}" y="${y+3}" text-anchor="end" font-family="var(--mono)" font-size="7" fill="var(--muted)">${v}</text>`;
  }).join('');
  const now=new Date(todayISO+'T00:00'),mNow=now.getMonth(),start=new Date(now.getFullYear(),0,1);
  const span=Math.max(1,daysBetween(start.toLocaleDateString('en-CA'),todayISO));
  const months=[];
  for(let m=0;m<=mNow;m++){
    const d=new Date(now.getFullYear(),m,1),frac=Math.min(1,daysBetween(start.toLocaleDateString('en-CA'),d.toLocaleDateString('en-CA'))/span);
    months.push(`<text x="${x0+frac*xw}" y="202" text-anchor="middle" font-family="var(--mono)" font-size="7" fill="var(--muted)">${'JFMAMJJASOND'[m]}</text>`);
  }
  const cy=+cp[cp.length-1].split(',')[1],py=+pp[pp.length-1].split(',')[1];
  const cLabel=Math.max(12,cy-7),pLabel=Math.min(177,py+12);
  const gapCopy=gap>0?`+${gap} day${gap===1?'':'s'}<small>ahead</small>`:gap<0?`${Math.abs(gap)} day${gap===-1?'':'s'}<small>behind</small>`:`Even<small>same date</small>`;
  return `<h2>Consistency${hActs('yoy2','Cumulative workout days through the same calendar date in both years. Drag the chart to compare any earlier date.','About Consistency')}</h2>
    <div class="card conrace" data-current-year="${current.year}" data-previous-year="${previous.year}">
      <div class="conkick" data-con-date>YOU VS YOU · ${race.label.toUpperCase()}</div>
      <div class="conscore"><span><small>${previous.year} you</small><b data-con-count="${previous.year}">${previous.total}</b><small>days</small></span>
        <strong class="congap ${gap>=0?'up':''}" data-con-gap>${gapCopy}</strong>
        <span><small>${current.year} you</small><b data-con-count="${current.year}">${current.total}</b><small>days</small></span></div>
      <div class="zoom conzoom" data-zoom><svg viewBox="0 0 340 215" role="img" aria-label="${current.year}: ${current.total} workout days. ${previous.year}: ${previous.total} workout days through ${race.label}."
        data-scrub="race" data-sx0="${x0}" data-sxw="${xw}" data-sy0="${y0}" data-syh="${yh}" data-smax="${max}" data-scrub-year="${current.year}">
        ${grid}<polygon points="${area}" fill="var(--accent-soft)" opacity=".72"></polygon>
        <polyline data-yr="${previous.year}" data-values="${previous.curve.join(',')}" points="${pp.join(' ')}" fill="none" stroke="var(--faint)" stroke-width="1.5" stroke-linejoin="round"></polyline>
        <polyline data-yr="${current.year}" data-values="${current.curve.join(',')}" points="${cp.join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"></polyline>
        <circle class="conend" cx="${x0+xw}" cy="${py}" r="3" fill="var(--surface)" stroke="var(--faint)" stroke-width="1.5"></circle>
        <circle class="beacon conend" cx="${x0+xw}" cy="${cy}" r="3.2" fill="var(--accent)"></circle>
        <text class="conend" x="${x0+xw-5}" y="${cLabel}" text-anchor="end" font-family="var(--mono)" font-size="7" font-weight="700" fill="var(--accent)">${current.year} · ${current.total}</text>
        <text class="conend" x="${x0+xw-5}" y="${pLabel}" text-anchor="end" font-family="var(--mono)" font-size="7" fill="var(--muted)">${previous.year} · ${previous.total}</text>
        ${months.join('')}
        <text x="9" y="107" text-anchor="middle" transform="rotate(-90 9 107)" font-family="var(--mono)" font-size="7" fill="var(--muted)">DAYS SHOWN UP</text>
      </svg></div>
    </div>`;
}
function monthlyPaceSection(){
  const data=monthlyPaceData(12),ms=data.months,max=Math.max(5,Math.ceil(Math.max(...ms.map(v=>v.days),1)/5)*5);
  let bars='',yearRuns=[];
  ms.forEach((m,i)=>{
    const h=Math.max(2,m.days/max*92),x=8+i*25.5,month='JFMAMJJASOND'[+m.key.slice(5)-1];
    bars+=`<rect class="gbar" x="${x}" y="${126-h}" width="17" height="${h}" rx="3" fill="${m.current?'var(--accent)':'var(--accent-dim)'}" opacity="${m.current?1:.58}"></rect>`;
    bars+=`<text x="${x+8.5}" y="${126-h-4}" text-anchor="middle" font-family="var(--mono)" font-size="7" font-weight="${m.current?700:400}" fill="${m.current?'var(--accent)':'var(--muted)'}">${m.days}</text>
      <text x="${x+8.5}" y="140" text-anchor="middle" font-family="var(--mono)" font-size="7" fill="${m.current?'var(--chalk)':'var(--muted)'}">${month}</text>`;
    const y=m.key.slice(0,4),last=yearRuns.at(-1);
    if(last&&last.y===y) last.end=i; else yearRuns.push({y,start:i,end:i});
  });
  yearRuns.forEach(r=>{const x=8+((r.start+r.end)/2)*25.5+8.5;bars+=`<text x="${x}" y="153" text-anchor="middle" font-family="var(--mono)" font-size="6.5" fill="var(--faint)">${r.y}</text>`;});
  const cur=ms.at(-1),tip=`Workout days by day ${cur.cutoff} of each month, so the current partial month compares fairly.`;
  return `<h2>Monthly pace${hActs('mpace',tip,'About Monthly pace')}</h2><div class="card mpacecard">
    <svg viewBox="0 0 330 160" role="img" aria-label="Workout days through day ${cur.cutoff} for each of the last 12 months">
      <text x="8" y="12" font-family="var(--mono)" font-size="7" fill="var(--faint)">YEAR</text>
      <line x1="8" y1="126" x2="316" y2="126" stroke="var(--line)" stroke-width=".6"></line>${bars}</svg>
    <div class="tot"><span><b>${cur.days}</b> days this month</span><span>all bars through day ${cur.cutoff}</span></div></div>`;
}
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
  h+=currentRhythmSection();
  cut('rhythm');
  /* v3.3.208: Session Build keeps the honest part mix and the live-growing
     skyline, but every unit is now one completed set — never mixed tonnage. */
  h+=`<h2>Session build${hActs('pmix',"One block per completed strength set, stacked by body part. Runs stay separate.",'About Session build')}</h2>
      <div class="card">
        <div class="pmixlgd">${Object.keys(SEED.catalog).filter(p=>p!=='Run').map(p=>
          `<span data-pt="${p}"><i style="background:${PART_COLORS[p]||'var(--muted)'}"></i>${p}</span>`).join('')}</div>
        <div class="pmixread" id="pmixRead">One block = one completed set · tap to follow a body part</div>
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
  h+=growthAuditSection();
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
  h+=consistencyRaceSection();
  cut('consrace');
  h+=monthlyPaceSection();
  cut('mpace');
  /* v3.3.111: "Last 30 days, vs your usual" removed on the maker's call — no
     value found in it. Its entire last30/drift computation went with it;
     nothing else read those. */
  h+=bwCard();                       // v3.3.69: you, before the part-by-part drift
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
  h = _S.kpis + _S.rhythm + _S.rz + _S.pmix + _S.mc + _S.consrace + _S.mpace + _S.wt;

  // the whole Run story lives here now (was its own tab in v2.04 — reverted)
  h+=runStatsHTML217();

  // records — kept, but demoted below the days story
  if(false) h+=`<h2 id="secRecords">Records</h2>`;
  if(false) for(const part of Object.keys(SEED.catalog)){
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
