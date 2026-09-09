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
let PMIX_MODE='sets';   // v3.3.277: 'sets' (default identity) | 'weight' (opt-in reading)
/* weight totals must fit a 12.5px bar: compact thousands, one decimal under
   10k, none above — "5.5k", "12k" — and plain numbers below 1000. */
const pmixFmtV=v=>PMIX_MODE==='weight'
  ? (v>=9950 ? Math.round(v/1000)+'k' : v>=1000 ? (v/1000).toFixed(1)+'k' : fmt(Math.round(v)))
  : fmt(Math.round(v));
/* v3.3.122: press a column and read that day out in full. The chart is
   discrete, so this is an index lookup rather than the interpolation the
   line charts need. */
/* v3.3.208: a receipt, not a performance verdict. Set count is comparable
   across equipment, but more sets are not automatically a better workout,
   so the old up/down trend is deliberately gone. */
function pmixSummary(){
  const el=document.getElementById('pmixSum'); if(!el) return;
  const rows=partMix(PMIX_DAYS,PMIX_MODE), P=PMIX_FOCUS;
  const vals=rows.map(r=>P?(r.by[P]||0):r.total).filter(v=>v>0);
  if(!vals.length){ el.textContent=''; return; }
  const sum=vals.reduce((a,b)=>a+b,0), avg=sum/vals.length;
  el.innerHTML=PMIX_MODE==='weight'
    ? `${P?`<b style="color:${PART_COLORS[P]}">${P}</b>`:'All strength'}
    · ${fmt(Math.round(sum))} ${isLb()?'lb':'kg'} lifted across ${vals.length} session${vals.length===1?'':'s'}
    · ${fmt(Math.round(avg))} avg`
    : `${P?`<b style="color:${PART_COLORS[P]}">${P}</b>`:'All strength'}
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
    s.setAttribute('aria-pressed',String(PMIX_FOCUS===s.dataset.pt));
  });
  pmixSummary();
}
/* v3.3.277: swap the reading, keep the place. Same scroll-preserving
   re-render as pmixSetFocus; the axis re-renders too because the scale
   changes with the data. */
function pmixSetMode(){
  PMIX_MODE = PMIX_MODE==='sets' ? 'weight' : 'sets';
  const wrap=document.getElementById('pmixWrap');
  if(wrap){
    const keep=wrap.scrollLeft, sb=wrap.style.scrollBehavior;
    wrap.style.scrollBehavior='auto';
    wrap.innerHTML=partMixSvg(PMIX_DAYS);
    const ax=wrap.parentElement.querySelector('.pmixaxis');
    if(ax) ax.outerHTML=pmixAxisSvg(partMix(PMIX_DAYS,PMIX_MODE));
    wrap.scrollLeft=keep; wrap.style.scrollBehavior=sb;
  }
  const btn=document.querySelector('[data-pmixmode]');
  if(btn){
    btn.setAttribute('aria-label',`Show ${PMIX_MODE==='sets'?'total weight':'set counts'} instead`);
    const [a,c]=btn.querySelectorAll('span');
    if(a&&c){ a.classList.toggle('on',PMIX_MODE==='sets'); c.classList.toggle('on',PMIX_MODE==='weight'); }
  }
  pmixApplyFocus();
}
function pmixSetFocus(part){
  PMIX_FOCUS = (PMIX_FOCUS===part) ? null : part;
  /* v3.3.259: labels no longer depend on focus (they are day totals), but
     the "latest" beacon still does — with a focus it marks the newest
     session containing that part — so this still re-renders. Scroll is
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
         font-family="var(--mono)" font-size="7" fill="var(--muted)">${pmixFmtV(max*i/4)}</text>`;
  }
  return s+`</svg>`;
}
let PMIX_YEARS=[];      // v3.3.123: column index -> year, for the sticky label
function partMixSvg(days){
  const rows=partMix(days,PMIX_MODE);
  PMIX_YEARS=rows.map(r=>r.d.slice(0,4));
  if(!rows.length) return '';
  /* v3.3.229: "latest" follows the story the user selected. With no focus,
     it is the newest strength session; with a focus, it is the newest
     session that actually contains that body part. An absent part gets no
     false beacon at all. */
  let latestIndex=rows.length-1;
  if(PMIX_FOCUS){
    latestIndex=-1;
    for(let i=rows.length-1;i>=0;i--) if(rows[i].by[PMIX_FOCUS]){
      latestIndex=i; break;
    }
  }
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
    const x=8+i*PMIX_COLW, latest=i===latestIndex;
    const live=latest&&r.d===todayISO&&isLive();
    s+=`<rect class="pmixcol${latest?' latest':''}${live?' live':''}" data-col="${i}"
         x="${x-2}" y="${PMIX_TOP}" width="${PMIX_COLW}"
         height="${PMIX_BASE-PMIX_TOP}"></rect>`;
    let y=PMIX_BASE, focusTop=null;
    for(const p of Object.keys(SEED.catalog)){
      const n=r.by[p]; if(!n) continue;
      const hh=(n/max)*(PMIX_BASE-PMIX_TOP);
      y-=hh;
      if(p===PMIX_FOCUS) focusTop=y;
      s+=`<rect class="pmixseg${latest&&(!PMIX_FOCUS||p===PMIX_FOCUS)?' latest':''}" data-bar-col="${i}" x="${x}" y="${y.toFixed(1)}" width="${bw}" height="${hh.toFixed(1)}"
           fill="${PART_COLORS[p]||'var(--muted)'}" data-pt="${p}"
           stroke="var(--ground)" stroke-width="0.5"></rect>`;
    }
    /* One patterned overlay cuts the coloured stack into equal set-sized
       blocks without adding thousands of SVG nodes across the archive. */
    if(r.total&&PMIX_MODE==='sets'){
      const bh=(r.total/max)*(PMIX_BASE-PMIX_TOP);
      s+=`<rect class="pmixbricks${latest?' latest':''}" data-bricks="${r.total}"
           x="${x}" y="${(PMIX_BASE-bh).toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}"
           fill="url(#pmixBrick)" pointer-events="none"></rect>`;
    }
    /* v3.3.260: BOTH numbers, each in its own register.
       The day TOTALS live in a fixed header row across the very top — one
       aligned line, the way the spreadsheet this app grew from ran a totals
       row — not perched on the bars, where 19 numbers at 19 heights read as
       noise (the v3.3.259 lesson). Today's total is bold; the archive is
       quiet. The FOCUSED part's own count returns to its segment top the
       moment a part is selected, because selecting it is what makes that
       number the story. It is skipped only when its segment crests into the
       header row itself (segTop < 16), where the two would collide and the
       total is already directly above. */
    if(r.total){
      /* v3.3.261: the row whispers with age. Full voice for the newest
         fortnight, then a linear fade to a floor it never drops below —
         tied to RECENCY, not to the viewport, so scrolling into the archive
         never fades the very numbers you scrolled there to read. Under
         focus the whole row steps back so the selected part's own numbers
         own the stage; the latest total keeps half a voice as the day's
         headline. */
      /* the totals row is about DAYS, so its emphasis anchors to the newest
         DAY — not to `latest`, which deliberately follows the focused part
         (v3.3.229) and would put the headline on the part's last appearance
         rather than on today. */
      const newest=i===rows.length-1;
      const away=rows.length-1-i;
      const op=PMIX_FOCUS ? (newest?0.55:0.28)
                          : (newest?1:Math.max(0.35, 0.92-away*0.033));
      s+=`<text x="${x+bw/2}" y="6.5" text-anchor="middle"
           font-family="var(--mono)" font-size="${PMIX_MODE==='weight'?6:6.5}" opacity="${op.toFixed(2)}"
           ${newest?'font-weight="700" fill="var(--chalk)"':'fill="var(--muted)"'}
           data-lbl="total" data-lbltot="${r.total}">${pmixFmtV(r.total)}</text>`;
    }
    if(PMIX_FOCUS && r.by[PMIX_FOCUS] && focusTop!==null){
      const v=r.by[PMIX_FOCUS];
      if(focusTop>=16) s+=`<text x="${x+bw/2}" y="${(focusTop-3).toFixed(1)}" text-anchor="middle"
           font-family="var(--mono)" font-size="6.5" fill="var(--chalk)"
           data-lbl="${PMIX_FOCUS}">${pmixFmtV(v)}</text>`;
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
  /* v3.3.230: weight is optional context, not an empty chore. Settings
     remains the place to record a first value; Stats appears only after the
     user has something real to review. */
  if(!ds.length&&!bwEdit) return '';
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
    body='';
  }else{
    const first=ds[0], last=ds[ds.length-1];
    const since=daysAgo(last);
      const head=`<div class="bwtools"><span class="bwsub">${ds.length>1
            ? `last change ${pretty(last)} · ${since===0?'today':since+'d ago'}`
            : `unchanged since ${pretty(first)}`}</span>
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
  const summary=ds.length
    ? `<span>Weight</span><span><b>${wDisp(cur)}</b> ${U()}<i>${md(ds.at(-1))}</i></span>`
    : `<span>Weight</span><span>Add</span>`;
  return `<h2 id="secWeight">Weight${hActs('bw',"Flat stretches are days you didn't weigh in.",'About the weight chart')}</h2>
    <details class="card bwcollapse" ${bwEdit?'open':''}><summary>${summary}</summary><div class="bwbody">${body}</div></details>`;

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

   The rule, in gym terms: only call a change progress when the comparison is
   unambiguous — exactly one variable moved. Two moves qualify, and no others:
   more reps at the EXACT same load, or a load heavier than anything in the
   record window (GA_RECORD_DAYS). A lighter set with more reps is a tradeoff,
   not proof of progress, so it stays Flat. This deliberately prefers missing
   a subtle gain over celebrating a warm-up, deload or technique set as growth.

   v3.3.252: this paragraph used to carry a third condition, requiring a load
   gain to ALSO hold the rep count of the previous heaviest set. v3.3.237
   deleted that condition from the code twelve lines below and left it standing
   here, so the file has documented a rule it does not implement ever since —
   and the Growth Audit tip, the only version of the rule a user ever reads,
   repeated the same error. The code was right: a first-ever 85 kg is new
   ground whatever the reps, and test-stats-repzone pins that case by name.
   Comment and tip corrected to match the code; both are now asserted.

   Celebration window: 7 days since v3.3.253 (was 28) — "Going up" means
   improved this week, the same seven days the card's set counts and Empty
   dots already describe. The record window is separate: see GA_RECORD_DAYS
   below. The whole ledger is still WALKED — the all-time set is found and
   named in the receipt — but only the last GA_RECORD_DAYS can supply the
   set a new record must beat. */
const GA_PR_DAYS=7;
/* v3.3.253 — the RECORD itself now has a horizon (maker's call, 2026-08-18).
   A lift from years ago was done by a different body: bodyweight moves,
   technique changes, straps come and go. Strength coaching treats a max as
   stale within months — e1RMs are retested every 6-12 weeks and experienced
   lifters test 2-4 times a year — so a set older than six months is not the
   same athlete's number and should not gate today's progress. 180 days is
   roughly two retest cycles: long enough that a two-week break cannot mint
   cheap re-records, short enough that the bar you must clear is one the
   current you actually set. The ALL-TIME set is still found and still named
   in the receipt — History is the ledger and nothing is forgotten — it just
   no longer stands in the way.
   GA_PR_DAYS drops 28 -> 7 in the same release: "Going up" now means
   improved THIS WEEK, the same seven days every other number on the card
   already describes. At the app's roughly weekly cadence per lift, a badge
   that outlives the next exposure is celebrating history. */
const GA_RECORD_DAYS=180;
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
/* v3.3.238: the exercise's OWN home decides its group, not the muscle
   taxonomy. Deadlift is a DUAL lift — the Train tab says "Counts as BACK"
   and offers "move to Legs" — so the maker has already answered this
   question, and the audit re-deriving Legs from EX_MUSCLE overrode an
   explicit choice. Train, History and the audit now agree, and tapping
   "move to Legs" moves the audit row with it.
   Not duplicated into both groups: the card counts "N completed sets · N
   days" per group, and a lift counted twice would overstate both — the
   same false precision the taxonomy spec rules out by crediting one
   primary muscle only.
   The taxonomy remains the fallback, and still owns Muscle coverage, where
   internal muscles are the point. */
function gaGroupForRow(r){
  const home=homePartOf(r[1])||r[0];
  return PART_VISIBLE[home]||MUSCLE_VISIBLE[exMuscle(r[1],r[0])]||home;
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
   `best` is the headline set (heaviest, then most reps). `pr` is the most
   recent unambiguous gain: more reps at the same load, or more load while
   matching/beating the previous heaviest set's reps. `live` is whether that
   gain fell inside the window. Badge and mark both read `live`, so they cannot
   disagree. */
function gaPR(ex){
  let all=null, pr=null;
  const seen=[];                    // sets from earlier days only
  const T=iso=>new Date(iso+'T00:00').getTime();
  for(const [si,s] of ex.sessions.entries()){
    /* Freeze the comparison baseline for the whole training day. A later set
       in one workout may be better than an earlier set, but that is not
       progress over time. Only prior DAYS can supply the set being beaten —
       and, since v3.3.253, only prior days within GA_RECORD_DAYS of the day
       being judged. The window ROLLS with each day, so an old day's PR is
       judged by the standard that held on that day, not by today's. */
    const cut=T(s.d)-GA_RECORD_DAYS*864e5;
    const win=seen.filter(q=>q.t>cut);
    let priorBest=null;
    for(const q of win) if(!priorBest||q.w>priorBest.w||(q.w===priorBest.w&&q.rep>priorBest.rep)) priorBest=q;
    let dayPr=null;
    for(const p of s.points){
      /* v3.3.237 — ONE condition changed from v3.3.227, and only one.
         Two things the maker has said had to be reconciled:
           (a) a heavier set is a record — a first-ever 85 kg x 6 must count
               even though an older 80 kg x 7 ran longer;
           (b) 10 kg x 12 must NEVER claim to improve on 27.5 kg x 10 —
               dropping the load and adding reps is a different intensity,
               not progress.
         Codex's rule satisfied (b) but broke (a), because a load gain also
         had to match the previous best's REP count. Dropping that single
         clause satisfies both: going heavier than anything ever lifted is a
         record on its own, while a rep gain still requires the SAME load, so
         a lighter set can never borrow credit from a heavier one. */
      const sameLoad=win.filter(q=>q.w===p.w).sort((a,b)=>b.rep-a.rep)[0];
      const repGain=sameLoad&&p.rep>sameLoad.rep;
      const loadGain=priorBest&&p.w>priorBest.w;
      if(repGain||loadGain){
        const beat=loadGain?priorBest:sameLoad;
        const candidate={d:s.d,w:p.w,rep:p.rep,beat,
          text: loadGain ? `+${wDisp(p.w-beat.w)} ${U()}`
              : `+${p.rep-beat.rep} rep${p.rep-beat.rep===1?'':'s'}`};
        /* A day's receipt names its strongest qualifying set, independent of
           logging order: heaviest first, then most reps at that load. */
        if(!dayPr||candidate.w>dayPr.w||
            (candidate.w===dayPr.w&&candidate.rep>dayPr.rep)) dayPr=candidate;
      }
    }
    /* v3.3.368: A FIRST SESSION IS NEW GROUND. With no prior day, priorBest
       is null, so loadGain is false and the very first time an exercise is
       logged came out FLAT -- under a receipt reading "no set has beaten the
       recent best", about a lift whose recent best IS that first set. It had
       beaten nothing because there was nothing there.
       The code already contains this argument: "going heavier than anything
       ever lifted is a record on its own" (v3.3.237). A first session is that
       rule's limiting case -- everything in it clears a bar that does not
       exist. It carries a badge reading "new" rather than a delta, because
       v3.3.220's law is that a row is lit IF AND ONLY IF it carries one, and
       a lit row with nothing to show would break that pair.
       Strictly the FIRST session (si===0), not merely any day whose record
       window happens to be empty. Coming back after six months is a return,
       not a debut, and that case already has its own receipt copy. */
    if(!dayPr&&si===0&&s.points.length){
      let first=null;
      for(const p of s.points) if(!first||p.w>first.w||(p.w===first.w&&p.rep>first.rep)) first=p;
      dayPr={d:s.d,w:first.w,rep:first.rep,beat:null,text:'new'};
    }
    if(dayPr) pr=dayPr;
    /* Only after every set has been judged do today's sets become history. */
    for(const p of s.points){
      if(!all||p.w>all.w||(p.w===all.w&&p.rep>all.rep)) all={w:p.w,rep:p.rep,d:s.d};
      seen.push({w:p.w,rep:p.rep,d:s.d,t:T(s.d)});
    }
  }
  /* two record rows: `best` is the RECENT record — the heaviest inside the
     window ending today, the set a new record must actually clear. `all` is
     the all-time set, kept for the receipt because the ledger forgets
     nothing, carrying no authority over what counts as progress. */
  let best=null;
  for(const q of seen) if(daysAgo(q.d)<GA_RECORD_DAYS&&(!best||q.w>best.w||(q.w===best.w&&q.rep>best.rep))) best={w:q.w,rep:q.rep,d:q.d};
  const live=!!pr&&daysAgo(pr.d)<GA_PR_DAYS;
  return {best,all,pr,live,change:live?pr:null};
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
  /* v3.3.370: "Growth audit" was named like a tax procedure. This card is the
     front door of the thing the maker wants ShowUp to be most -- an app that
     helps you GROW -- and it should ask the question the user arrived with
     rather than describe the process it runs. The rule underneath is
     unchanged; only the words a person reads. */
  return `<h2>Are you growing?${hActs('ga',"Dot: no sets in 7 days · line: no clear gain · trend: a later day went heavier than anything in the last six months, or did more reps at a load used in them.",'About growing')}</h2>
    <div class="card gacard" data-gacard="${ga.grp}">
      <select id="gaGrp" class="gasel" aria-label="Body part">${data.order.map(v=>
        `<option value="${v}" ${v===ga.grp?'selected':''}>${v}</option>`).join('')}</select>
      <div class="gahead"><small>${g.sets} completed set${g.sets===1?'':'s'} · ${g.days.size} day${g.days.size===1?'':'s'}</small>
        ${gaIcon(g.signal,'gastate')}</div>
      <div class="garows">${shown.length?shown.map(e=>`<div class="garow${ga.open===e.id?' open':''}" data-gaex="${e.id}">
        <b>${e.name}</b><span class="garight">${e.record.change?`<span class="gadelta">${e.record.change.text}</span>`:''}${gaIcon(e.ago>=GA_RECENT_DAYS?'empty':e.record.live?'up':'flat','gabadge')}</span></div>${
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
  /* v3.3.368: the receipt reads the LIVE record, the same object the badge
     and the mark read (v3.3.220's law), not the historical `pr`. They were
     the same thing until a debut could set `pr` -- and a debut 250 days ago
     is a record that exists but is long dead, so the row went dark while the
     receipt still said "Improved to". One row, two answers, which is exactly
     the contradiction v3.3.220 was written to end. */
  const r=e.record, pr=r.change;
  if(!r.all) return `<div class="garcpt"><div class="note">No completed sets yet.</div></div>`;
  /* v3.3.239: ALWAYS name the record standing in the way, and when nothing
     improved, say what the last session had to beat. v3.3.253: that record is
     now the RECENT best — the heaviest set of the last six months, the one a
     new record must actually clear. The all-time set keeps its own row when
     it differs: the ledger forgets nothing, it just stopped being the bar. */
  const row=([k,v,w])=>`<div class="garcrow"><span class="garck">${k}</span><b>${v}</b><span class="garcw">${w}</span></div>`;
  const mk=(k,p)=>[k,`${wTxt(e.name,p.w)} \u00d7 ${p.rep}`,gaDay(p.d)];
  const same=(a,b)=>a&&b&&a.w===b.w&&a.rep===b.rep&&a.d===b.d;
  const allRow=(r.all&&!same(r.all,r.best))?mk('All-time',r.all):null;
  if(!pr){
    if(!r.best) return `<div class="garcpt">${row(mk('All-time',r.all))}
      <div class="garcnote">Nothing in the last six months \u2014 the first sessions back rebuild the baseline, and records resume once there is recent work to beat.</div></div>`;
    return `<div class="garcpt">${row(mk('Recent best',r.best))}${allRow?row(allRow):''}
      <div class="garcnote">No set has beaten the recent best \u2014 a record needs a heavier load than it, or more reps at a load used in the last six months.</div></div>`;
  }
  const rows=[mk('Improved to',pr)];
  if(pr.beat) rows.push(mk('Previous best',pr.beat));
  /* only when a record row disagrees with the lines above it — otherwise it
     would just repeat them */
  if(r.best&&!same(r.best,pr)&&!same(r.best,pr.beat)) rows.push(mk('Recent best',r.best));
  if(r.all&&!same(r.all,pr)&&!same(r.all,pr.beat)&&!same(r.all,r.best)) rows.push(mk('All-time',r.all));
  return `<div class="garcpt">${rows.map(row).join('')}</div>`;
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
  /* v3.3.350: the card is a MATRIX -- muscle group by day -- and a matrix
     needs a shared axis. Every row used to draw its own seven dots in an
     elastic 1fr column with no header, so nothing anchored them: they were
     seven marks floating in whatever width was left over. On a phone that
     column is barely wider than the dots; at the app's 520px cap it is 130px
     wider, and all of it pooled into a hole between the dots and the numbers.
     The gap was the symptom; the missing axis was the fault.
     Seven named day columns now span the row, the same seven for every
     group, so the width is CONSUMED by the axis instead of pooling. It also
     buys a reading the card could not give before: a COLUMN is legible --
     Monday was shoulders, arms and core. And it speaks the app's own
     vocabulary, the weekday rail v3.3.335 put on the attendance heatmap.
     The tail is three tracks, not one string: the day COUNT right-aligned,
     its UNIT left-aligned, then the dot, then the sets. Splitting the count
     from its unit is what makes "1 day" and "2 days" share a column -- and it
     is the app's existing unit-faint grammar, the one behind "165.3 lb" and
     "20 d ago".
     v3.3.352: the card is ONE grid and each row is display:contents, so the
     tail columns are max-content, measured across every row in each cell's
     OWN font. The earlier version declared ch widths on the ROW -- where ch
     resolves against the row's sans while the cells render in mono, cutting
     every track for a wider character than it holds. Nothing is measured in
     JS now; the layout measures itself. */
  const WD=days.map(d=>new Date(d+'T00:00')
    .toLocaleDateString('en-US',{weekday:'narrow'}));
  const head=`<div class="mchead" aria-hidden="true"><span></span>
      <span class="mcdots">${WD.map(w=>`<i>${w}</i>`).join('')}</span>
      <span></span><span></span><span></span><span></span></div>`;
  /* v3.3.354: the separator is an ELEMENT spanning the grid, not a border on
     each cell -- cells are centre-aligned and each drew its own top edge, so
     the rule came out as offset dashes. One before every row but the first. */
  const line='<i class="mcline" aria-hidden="true"></i>';
  const body=VISIBLE_GROUPS.map((v,vi)=>{
    const gg=groups[v];
    const open=_mcOpen===v;
    let inner='';
    if(open){
      /* v3.3.357: the FULL roster, trained first, then what is missing --
         and a muscle with nothing logged says "not this week" rather than
         "0 days \u00b7 0 sets". The fact is the same; the arithmetic is not.
         Three zeroes stacked up read as a score, and a seven-day window is
         not a verdict on a muscle -- it says nothing about last Tuesday.
         Ordering is by days trained, then by the roster's own order, so an
         untrained muscle always sinks to the bottom of its group and the
         list does not reshuffle as the week fills in. */
      const order=(GROUP_MUSCLES[v]||[]);
      const rows=Object.entries(gg.mus).sort((a,b)=>
        b[1].days.size-a[1].days.size || order.indexOf(a[0])-order.indexOf(b[0]));
      inner=`<div class="mcinner">${rows.length?rows.map(([m,st])=>{
        const none=!st.sets;
        return `<div class="mcirow${none?' mcinone':''}"><span class="mciname">${MUSCLE_LABEL[m]||m}</span>
          <span class="mciwhen">${none?'not this week'
            :`<b>${st.days.size}</b> day${st.days.size===1?'':'s'} \u00b7 ${st.sets} set${st.sets===1?'':'s'}`}</span></div>`;
        }).join('')
        :`<div class="note">No sets in the last 7 days.</div>`}</div>`;
    }
    return `${vi?line:''}<div class="mcrow ${open?'open':''}" data-mcg="${v}">
      <span class="mcname">${v}</span>
      <span class="mcdots">${gg.dots.map(on=>`<i class="${on?'on':''}"></i>`).join('')}</span>
      <b class="mcv">${gg.days.size}</b>
      <span class="mcu">day${gg.days.size===1?'':'s'}</span>
      <span class="mcsep" aria-hidden="true">\u00b7</span>
      <span class="mcs">${gg.sets} set${gg.sets===1?'':'s'}</span>
    </div>${inner}`;
  }).join('');
  return `<div class="mcgrid">${head}${line}${body}</div>`;
}
document.addEventListener('click',e=>{
  const r=e.target.closest&&e.target.closest('[data-mcg]');
  if(!r) return;
  _mcOpen=_mcOpen===r.dataset.mcg?null:r.dataset.mcg;
  const card=document.querySelector('.mccard');
  if(card) card.innerHTML=muscleCard(); else render();
});
/* v3.3.307: the month calendar becomes a YEAR HEATMAP whose runs join up.
   The grid was 42 cells for 31 days — blanks before the 1st, greyed future
   days after today, twelve dead cells out of forty-two, which is most of why
   it read as broken. And History already draws a real month calendar, so
   this card was carrying a worse second copy.
   Weeks are columns, weekdays are rows, so consecutive days run DOWN a
   column: a streak is a vertical stroke. Adjacent trained days drop the
   radius between them and overlap by a hair, so a run renders as ONE bar
   rather than a column of squares — which is the property this section is
   named for. A rest day genuinely breaks the stroke. */
/* v3.3.334: the calendar runs the WHOLE ledger, not a window onto it.
   35 weeks was chosen as "the width a phone can hold" -- but the grid has
   scrolled sideways since v3.3.307, so the phone was never the constraint;
   the number was. A section titled "show up -- that's the whole game",
   sitting above a lifetime day count, was showing eight months of it.
   HEAT_MIN_WEEKS is a floor, not a width: a ledger three weeks old still
   gets a grid worth looking at rather than four lonely columns. */
const HEAT_MIN_WEEKS=35;
/* v3.3.469: ONE BUILDER, TWO CARDS. `inverse` draws the same section with
   every mark reversed: the squares that were blue for a trained day are the
   rest green for a day you did not train, the count is days rested, the
   streak is the current run of rest days, and the share is the complement.
   Same markup, same classes, same grid, same scroller -- the ONLY difference
   is which days light and in what colour, so the two cards cannot drift in
   typography or dimension. Days before the ledger's first day are not "rest";
   they are before, and stay unlit in both cards. */
function currentRhythmSection(inverse){
  const dates=workoutDates(),now=new Date(todayISO+'T00:00');
  const R=inverse?restStats():null;
  const streak=inverse?(R?restRunNow(R):0):currentStreak(),best=inverse?(R?restRunBest(R):0):longestStreak();
  /* end the grid on today's column; start on the Monday of the ledger's
     first week, or HEAT_MIN_WEEKS back, whichever reaches further */
  const end=new Date(now); end.setDate(end.getDate()+(7-((now.getDay()+6)%7)-1));
  const iso=d=>d.toLocaleDateString('en-CA');
  const floorStart=new Date(end); floorStart.setDate(floorStart.getDate()-(HEAT_MIN_WEEKS*7-1));
  let start=floorStart;
  if(SEED.totals.first){
    const f=new Date(SEED.totals.first+'T00:00');
    f.setDate(f.getDate()-((f.getDay()+6)%7));          // back to that week's Monday
    if(f<start) start=f;
  }
  /* count the span in DAYS and divide -- adding weeks to a Date across a DST
     boundary drifts by an hour and can land the grid a day out */
  const HEAT_WEEKS=Math.max(HEAT_MIN_WEEKS, Math.ceil((daysBetween(iso(start),iso(end))+1)/7));
  const days=[];
  for(let k=0;k<HEAT_WEEKS*7;k++){
    const d=new Date(start); d.setDate(d.getDate()+k);
    days.push(iso(d));
  }
  const on=inverse?(x=>x>=(SEED.totals.first||'9999')&&x<=todayISO&&!dates.has(x)):(x=>dates.has(x));
  /* Month ticks. v3.3.308: a label is emitted only where the month actually
     CHANGES, and only if there is room for it. The old rule fired on column 0
     AND on any column whose Monday fell in the first week — so a window
     starting on Dec 29 printed DEC at column 0 and JAN at column 1, one
     column apart, and the two labels sat on top of each other. A 3-letter
     label needs roughly three columns of width, so a tick is skipped unless
     it clears the previous one by that much. */
  /* v3.3.338: EVERY month, THREE letters. JAN FEB MAR ...
     The row has now been all three ways, so the record should say what
     settled it: MEASUREMENT, once anyone bothered. A month spans ~4.35
     columns and a column is --hcell + column-gap = 15px, so a month owns
     ~65px; "JAN" at 10px mono is 18px. Forty-seven pixels of clear air.
     v3.3.335 thinned to quarters and v3.3.337 shortened to one letter, both
     to escape a "picket fence" -- which was a look remembered from the 7px
     grid (11px pitch, 48px per month), and even there the labels never
     actually touched. Two releases spent dodging a collision that the
     arithmetic says does not exist. A three-letter label NAMES the month;
     one letter asks the reader to count from the year, and J is three
     different months.
     TICK_GAP stays retired, and the clearance is CHECKED rather than argued:
     the shortest month is 28 days = exactly 4 columns, 60px, against 18px of
     ink. test-scrollpos measures it, so widening the label or narrowing the
     cell fails there instead of on the maker's phone -- v3.3.336 is what
     asserting an invariant instead of checking it costs.
     lastM is still seeded from column 0 so a PARTIAL first month never claims
     a label one column from the real one (v3.3.308's fix, still load-bearing:
     the same partial-first-unit trap the year row fell into). */
  const ticks=[]; let lastM=new Date(days[0]+'T00:00').getMonth();
  for(let c=0;c<HEAT_WEEKS;c++){
    const d=new Date(days[c*7]+'T00:00'), m=d.getMonth();
    if(m===lastM) continue;
    lastM=m;
    ticks.push({c,label:d.toLocaleDateString('en-US',{month:'short'}).toUpperCase()});
  }
  /* v3.3.334: YEARS, in their own row above the grid and inside the same
     scroller, so the label travels with the columns it names. A label lands
     wherever January begins.
     v3.3.336: v3.3.334's comment claimed "no crowding rule to apply: two
     years cannot be closer than 52 columns". That is false for the FIRST
     year, which is a partial one -- a ledger opened in December puts 2021 at
     column 0 and 2022 three columns later, and the two labels print on top of
     each other. Exactly the collision v3.3.308 fixed for the month row; I
     asserted the invariant instead of checking it.
     The rule: where two labels cannot both fit, the PARTIAL one yields. A
     stub of December is the least useful mark on the row, the year it belongs
     to is already named in "since Dec 2021" directly above, and dropping the
     later label would leave a whole year of columns wearing the wrong number.
     YEAR_GAP is measured, not guessed: "2021" + gap + "365 days" is about 85px
     of mono, and a column is --hcell + column-gap = 15px, so ~6 columns are
     needed and 7 leaves margin. */
  const YEAR_GAP=7;
  /* v3.3.335: the year carries its own DAY COUNT. The row cost a line and
     said only what a calendar says; with the count it becomes the one place
     you can scroll back and compare years at a glance — and it is a count of
     DAYS, the app's own unit, not a volume. Counted from the whole ledger
     rather than from the visible columns, so a year that starts mid-grid
     still reports its true total. */
  const perYear={};
  for(const d of dates){ const y=d.slice(0,4); perYear[y]=(perYear[y]||0)+1; }
  const years=[]; let lastY=null;
  for(let c=0;c<HEAT_WEEKS;c++){
    const y=new Date(days[c*7]+'T00:00').getFullYear();
    if(y===lastY) continue;
    lastY=y;
    years.push({c, label:String(y), n:perYear[String(y)]||0});
  }
  /* the partial first year yields to the full one it would collide with */
  if(years.length>1 && years[1].c-years[0].c < YEAR_GAP) years.shift();
  const cells=days.map((x,k)=>{
    const future=x>todayISO, isToday=x===todayISO, done=on(x);
    /* v3.3.314: every day is its OWN square. v3.3.307 joined consecutive days
       into a stroke so a run read as its length — I argued for it, the maker
       tried both on device and chose the plain grid. Recorded as a reversal,
       not a bug: the joined version said something a heatmap cannot, but it
       also made a dense year read as slabs rather than as days, and the
       streak count above already states the run in words. */
    const cls=['hc'];
    if(done) cls.push('on');
    if(future) cls.push('fut');
    if(isToday) cls.push('tod');
    return `<i class="${cls.join(' ')}" role="img" aria-label="${x}${done?(inverse?' \u00b7 rested':' \u00b7 trained'):future?' \u00b7 future':(inverse?' \u00b7 trained':' \u00b7 rest')}"></i>`;
  }).join('');
  const liveTotal=msLiveTotal(),firstDay=SEED.totals.first;
  const total=inverse?(R?R.rests:0):liveTotal;
  let lifetime='';
  if(firstDay){
    const span=Math.max(1,daysBetween(firstDay,todayISO)+1-((((DB.days[todayISO]||{}).w)||[]).length?0:1));
    const since=new Date(firstDay+'T00:00').toLocaleDateString('en-US',{month:'short',year:'numeric'});
    /* the attendance card leaves an EMPTY today out of its denominator (the
       day is not over); the rest card counts a declared rest today as a
       rest, so its share is rests over every day including today. The two
       need not sum to 100 on a rest morning, and that is honest. */
    const pct=inverse?Math.round((R?R.rests/R.daysIn:0)*100):Math.round(liveTotal/span*100);
    lifetime=`${pct}% of days since ${since}`;   // v3.3.470: "of every day" -> "of days", both cards
  }
  const head=inverse
    ?`<h2 id="secRest">Rest — that's the other half${hActs('restrhythm','Every day since your first, one square each; the days you did not train are green. It opens on today.','About Rest')}</h2>`
    :`<h2 id="secDays">Show up — that's the whole game${hActs('rhythm','Every day since your first, one square each. Scroll back through the years; it opens on today.','About Show up')}</h2>`;
  return `${head}
    <div class="card crcard${inverse?' resting':''}">
      <div class="crhead">
        <span class="crtotal"><b>${fmt(total)}</b><small>${inverse?'days rested':'days in'}</small></span>
        <span class="crstreak">${inverse?`<span>resting ${streak} day${streak===1?'':'s'}</span><span>longest ${best}</span>`:`streak ${streak} day${streak===1?'':'s'} \u00b7 best ${best}`}</span>
      </div>
      ${lifetime?`<div class="crsince">${lifetime}</div>`:''}
      <!-- v3.3.332: the month row lives INSIDE the scroller, beside the grid.
           It used to be a sibling of .heatwrap, so the two resolved their 35
           columns against DIFFERENT widths: the grid carries min-width:100%
           and overflows its scroller to whatever 35 columns actually need,
           while the ticks were a plain card child capped at the card's width.
           Same template, two containers, so every label drifted left of its
           column and the last one dangled off the end entirely.
           .heatscroll already existed in the sheet, unused, with the comment
           "month row + grid scroll together" -- the fix was written and never
           wired up. One box now sizes both, so a label cannot be anywhere but
           over its own column, at any width, scrolled or not. -->
      <!-- v3.3.335: the weekday rail is STATIC, a sibling of the scroller, so
           it holds while five years of columns slide past it. M W F S: four
           marks on the even rows, counted by twos, so the S at the bottom is
           unambiguously Sunday by position rather than by letter. It is the
           row that explains the shape of the week — a Mon-to-Sat trainer's
           Sunday stripe reads as a rest day rather than as missing data.
           aria-hidden: the cells already name their own dates, and a screen
           reader does not need seven more letters to get through. -->
      <div class="heatframe">
        <div class="wdrail" aria-hidden="true">${['M','','W','','F','','S'].map(d=>`<span>${d}</span>`).join('')}</div>
        <div class="heatwrap"><div class="heatscroll">
        <div class="heatyears" style="--hw:${HEAT_WEEKS}">${years.map(y=>`<span style="--c:${y.c}">${y.label}<small>${y.n} days</small></span>`).join('')}</div>
        <div class="heatgrid" style="--hw:${HEAT_WEEKS}">${cells}</div>
        <div class="heatticks" style="--hw:${HEAT_WEEKS}">${ticks.map(t=>`<span style="--c:${t.c}">${t.label}</span>`).join('')}</div>
      <!-- v3.3.512: three closes here, not four -- heatscroll, heatwrap,
           heatframe. The fourth used to close the CARD, which put anything
           added below the grid outside it as a sibling; the card's own close
           is the one at the end. -->
      </div></div></div>
      ${inverse?weekShape(R):''}
    </div>`;
}

/* ---- v3.3.512: THE WEEK SHAPE ----------------------------------------
   The rest card counted: 771 days, 45% of days. A count is an accumulation,
   and accumulation is the logic this app rejects everywhere else -- it just
   happens to be counting the inverse of the streak. The SHAPE is not
   something you can run up. It says consistency was never training every day;
   it was a rhythm held for years, which is the thesis stated as a fact about
   the maker rather than as a slogan.
   It sits UNDER the grid, not instead of it: count, then share, then five
   months of texture, then the rhythm across all of it.
   RATE, NOT COUNT. Sunday would top a raw tally simply because the record
   contains more Sundays, and a ledger that starts mid-week is lopsided from
   its first row. Each column is rests-on-that-weekday over how many of that
   weekday there have been.
   The sentence comes from the data or it does not come at all: a flat record
   says so, rather than crowning whichever column happens to be tallest. And
   nothing here is a target -- no ideal ratio, no badge for a long run. */
function weekShape(R){
  if(!R||!R.dowTotal) return '';
  const ORDER=[1,2,3,4,5,6,0], LET=['M','T','W','T','F','S','S'];
  const NAME=['Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays','Sundays'];
  const cols=ORDER.map((d,i)=>({d,let:LET[i],name:NAME[i],
    n:R.dow[d]||0, of:R.dowTotal[d]||0,
    rate:(R.dowTotal[d]||0)?(R.dow[d]||0)/R.dowTotal[d]:0}));
  /* not enough of any weekday yet to say anything honest about a rhythm */
  if(Math.min(...cols.map(c=>c.of))<4) return '';
  const sorted=[...cols].sort((a,b)=>b.rate-a.rate);
  const top=sorted[0], second=sorted[1];
  const spread=top.rate-sorted[sorted.length-1].rate;
  let line;
  if(top.rate>=.5&&top.rate-second.rate>=.12)
    line=`You rest on ${top.name}.`;
  else if(spread<.15)
    line=`You rest evenly across the week.`;
  else if(top.rate-sorted[2].rate>=.12)
    line=`You rest on ${top.name} and ${second.name}.`;
  else
    line=`You rest most on ${top.name}.`;
  const sub=(top.rate>=.5&&top.rate-second.rate>=.12)
    ? `${Math.round(top.rate*100)}% of them, across ${fmt(R.daysIn)} days.`
    : `across ${fmt(R.daysIn)} days.`;
  const bars=cols.map(c=>{
    const pct=Math.round(c.rate*100), lead=c===top&&spread>=.15;
    return `<span class="rwbar${lead?' lead':''}" role="img"
      aria-label="${c.name}: rested ${c.n} of ${c.of}, ${pct}%">
      <i style="--h:${Math.max(4,Math.round(c.rate*100))}%"></i>
      <b>${c.let}</b><small>${pct}%</small></span>`;
  }).join('');
  return `<div class="restweek">
    <p class="rwline">${line}</p>
    <p class="rwsub mono">${sub}</p>
    <div class="rwbars">${bars}</div>
    <div class="rwfoot mono"><span>rest days by weekday</span><span>longest run ${fmt(R.longest||0)}</span></div>
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
  /* v3.3.232: same numbers, two units. The share denominator is the days
     ELAPSED this year — both years are measured against the same stretch of
     calendar, which is what makes the comparison fair. */
  const elapsed=daysElapsedThisYear(), shares=raceShares();
  const pctOf=n=>Math.round(n/elapsed*100);
  const showN=n=>shares?pctOf(n)+'%':n;
  const unit=shares?'of the year':'days';
  const gapPts=pctOf(current.total)-pctOf(previous.total);
  const gapCopy=shares
    ?(gapPts>0?`+${gapPts} pts<small>ahead</small>`:gapPts<0?`${Math.abs(gapPts)} pts<small>behind</small>`:`Even<small>same date</small>`)
    :(gap>0?`+${gap} day${gap===1?'':'s'}<small>ahead</small>`:gap<0?`${Math.abs(gap)} day${gap===-1?'':'s'}<small>behind</small>`:`Even<small>same date</small>`);
  /* v3.3.370: the card compares two years; the heading now says so. */
  return `<h2>This year vs last${hActs('yoy2','Cumulative workout days through the same calendar date in both years. Drag the chart to compare any earlier date.','About this year vs last')}</h2>
    <div class="card conrace" data-current-year="${current.year}" data-previous-year="${previous.year}"
      data-cur="${current.total}" data-prev="${previous.total}" data-denom="${elapsed}"
      data-unit-total="days" data-unit-share="of the year" data-gap-unit="days">
      <div class="conkick" data-con-date>YOU VS YOU · ${race.label.toUpperCase()}</div>
      <div class="conscore" data-raceswap role="button" tabindex="0"
        aria-label="Show ${shares?'totals':'share of the year'} instead"><span><small>${previous.year} you</small><b data-con-count="${previous.year}">${showN(previous.total)}</b><small data-con-unit>${unit}</small></span>
        <strong class="congap ${gap>=0?'up':''}" data-con-gap>${gapCopy}</strong>
        <span><small>${current.year} you</small><b data-con-count="${current.year}">${showN(current.total)}</b><small data-con-unit>${unit}</small></span></div>
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
/* v3.3.473: DAILY RUNS. The last 28 days, one bar per day, in the unit the
   card's own toggle chooses (mi/km) -- a view preference stored as a setting
   so it survives, separate from the app's weight unit, because a person can
   lift in lb and think in km. Bars reuse Monthly pace's grammar: same SVG
   frame, same faint baseline, the accent for a run, nothing for a day without
   one. Today is rightmost and labelled. Below: the window's total and the
   average per run day, in the same unit. Nothing here is a target. */
/* v3.3.474: DAILY RUNS, ALL OF IT. v3.3.473 showed a fixed 28-day window; the
   card now draws every day from the first run to today in a horizontal
   scroller, opened on today, exactly as What you did does. Borrowed wholesale
   from partMixSvg so the two read as one family: same column width, same
   dashed guides at every axis tick, a soft labelled rule at each month and a
   firmer one at each year, and the left edge always names its year.
   What is NOT borrowed: the y-axis. What you did counts sets, which are
   whole numbers; runs are distances, so the axis picks a round step (1, 2,
   2.5, 5, 10...) and labels it in the chosen unit -- an axis with no numbers
   on it is a shape, not a measure.
   The footer resets on the 1st: it reads the CURRENT MONTH to date, because
   a running total that never resets is a number you stop looking at. */
/* v3.3.476: DAILY RUNS IS A LINE OF RUNS. v3.3.475 drew a bar per calendar
   day in What you did's grammar; the maker read it and it was hard to follow --
   most columns were empty and the shape was lost. Two changes, at his word:
   the chart is a LINE WITH DOTS, and the x-axis is RUNS, not days. Every
   column is a run, so the line is continuous and the archive is dense.
   What survives from What you did, on purpose, so the two still read as one
   family: the column pitch, the top and base, the dashed guide at every axis
   tick, the month rule and the year rule, the totals row along the top, the
   rotated date under every column, the fixed axis column with its pinned year,
   and the scroller that opens on today.
   The trade this makes: with days removed, a week without a run looks like a
   day without one. The dates under the columns still tell you, and the month
   rules still land where the calendar turns -- but the gap is no longer a
   shape. That was the price of legibility, and he chose it. */
const DRUN_COLW=PMIX_COLW, DRUN_H=PMIX_H, DRUN_TOP=PMIX_TOP, DRUN_BASE=PMIX_BASE;
/* v3.3.481: THE UNIT IS THE APP'S. v3.3.473 gave the card its own mi/km
   switch; by 476 that had become the caption, and it persisted a 'km' the
   maker never meant to keep -- the card read km while every other run figure
   on the page read mi. One unit per app: the caption is a label now, the
   stored preference is ignored, and the card follows lb -> mi, kg -> km like
   the Running month card above it. */
function runUnit(){ return DU(); }
function drunMode(){ return DB.settings.runMode==='pace'?'pace':'dist'; }
/* distance: a round step from zero, with a step of headroom (What you did's).
   pace: NOT from zero -- no run takes zero minutes, and an axis from 0 would
   squash every run into the top inch. It brackets the actual range instead,
   so a minute of difference is a visible minute. */
function drunAxis(max){
  const steps=[0.5,1,2,2.5,5,10,20,25,50];
  for(const st of steps){ const n=Math.ceil(max/st)+(Math.ceil(max/st)*st-max<st*0.25?1:0); if(n>=3&&n<=5) return {step:st,n,bot:0}; }
  const st=steps[steps.length-1]; return {step:st,n:Math.max(3,Math.ceil(max/st)+1),bot:0};
}
/* v3.3.481: THE PACE AXIS CALIBRATES TO THE BODY OF THE RUNS, NOT THE
   OUTLIERS. One walked run in 2021 at 41'/km stretched the axis to 41' and
   flattened five years of 6'30" runs into a line at the bottom. The range is
   now the 5th-95th percentile of the paces, padded; anything outside is
   drawn at the rim, hollow, so it is still there but does not own the axis.
   Steps are the ones a runner reads -- 15s, 30s, 1', 2', 5' -- not 10'15". */
function drunPaceAxis(vals){
  const v=[...vals].sort((a,b)=>a-b); if(!v.length) return {step:60,n:3,bot:0};
  const q=p=>v[Math.min(v.length-1,Math.max(0,Math.floor(p*(v.length-1))))];
  const lo=q(0.05), hi=q(0.95);
  const pad=Math.max(15,(hi-lo)*0.3);
  const rawBot=Math.max(0,lo-pad), rawTop=hi+pad;
  const steps=[15,30,60,120,300,600];
  let step=steps[steps.length-1];
  for(const st of steps){ const n=Math.ceil((rawTop-Math.floor(rawBot/st)*st)/st); if(n>=3&&n<=6){ step=st; break; } }
  const bot=Math.floor(rawBot/step)*step; const n=Math.max(3,Math.ceil((rawTop-bot)/step));
  return {step,n,bot,clip:true};
}
function drunRows(u,mode){
  const days=runDays(); if(!days.length) return [];
  const conv=km=>u==='mi'?km*MI:km;
  const out=[];
  for(const r of days){
    if(mode==='pace'){ if(!(r.timed>0&&r.sec>0)) continue; out.push({d:r.d, v:r.sec/(u==='mi'?r.timed*MI:r.timed)}); }
    else out.push({d:r.d, v:conv(r.km)});
  }
  return out;
}
function drunFmt(v,mode){ return mode==='pace'?paceStr(v):(v>=10?String(Math.round(v)):(Math.round(v*10)/10).toFixed(1)); }
function dailyRunsSvg(rows,u,mode,ax){
  const W=Math.max(320,rows.length*DRUN_COLW+16);
  const span=(ax.bot+ax.step*ax.n-ax.bot)||1;
  const top=ax.bot+ax.step*ax.n;
  const inRange=v=>v>=ax.bot&&v<=top;
  const Y=v=>{ const c=ax.clip?Math.max(ax.bot,Math.min(top,v)):v; return DRUN_BASE-((c-ax.bot)/span)*(DRUN_BASE-DRUN_TOP); };
  const cx=i=>8+i*DRUN_COLW+(DRUN_COLW-2.5)/2;
  let s=`<svg viewBox="0 0 ${W} ${DRUN_H}" width="${W}" height="${DRUN_H}" style="height:${DRUN_H}px" data-drun role="img" aria-label="${mode==='pace'?'Pace per '+u:'Distance in '+u} for every run, oldest first">
    <defs><linearGradient id="drunFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--accent)" stop-opacity=".16"></stop>
      <stop offset="1" stop-color="var(--accent)" stop-opacity="0"></stop></linearGradient></defs>`;
  /* guides first; everything after paints over them */
  for(let i=0;i<=ax.n;i++){ const y=Y(ax.bot+i*ax.step);
    s+=`<line x1="4" y1="${y.toFixed(1)}" x2="${W-4}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width="0.6"${i?' stroke-dasharray="2 3"':''}></line>`; }
  let prevM=null, prevY=null;
  rows.forEach((r,i)=>{
    const m=r.d.slice(0,7), yy=r.d.slice(0,4), x=8+i*DRUN_COLW-2;
    if(prevY!==null && yy!==prevY){
      s+=`<line x1="${x}" y1="${DRUN_TOP}" x2="${x}" y2="${DRUN_BASE+4}" stroke="var(--muted)" stroke-width="1.4" opacity="0.85"></line>
          <text x="${x+3}" y="${DRUN_TOP+7}" font-family="var(--mono)" font-size="8" font-weight="700" fill="var(--muted)" data-yrmark="${yy}">${yy}</text>`;
    }else if(prevM!==null && m!==prevM){
      s+=`<line x1="${x}" y1="${DRUN_TOP}" x2="${x}" y2="${DRUN_BASE+4}" stroke="var(--line)" stroke-width="0.8" opacity="0.55"></line>
          <text x="${x+3}" y="${DRUN_TOP+7}" font-family="var(--mono)" font-size="7" fill="var(--faint)">${new Date(r.d+'T00:00').toLocaleDateString('en-US',{month:'short'})}</text>`;
    }
    prevM=m; prevY=yy;
  });
  /* the line. Distance carries a fill (miles accumulate); pace does not (a
     pace is a level, and area under it would mean nothing). */
  const pts=rows.map((r,i)=>`${cx(i).toFixed(1)},${Y(r.v).toFixed(1)}`).join(' ');
  if(rows.length>1){
    if(mode==='dist') s+=`<polygon class="drfill" points="${pts} ${cx(rows.length-1).toFixed(1)},${DRUN_BASE} ${cx(0).toFixed(1)},${DRUN_BASE}" fill="url(#drunFill)"></polygon>`;
    s+=`<polyline class="drline" points="${pts}" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"></polyline>`;
  }
  /* dots, and the totals row. In DISTANCE every dot is labelled, as What you
     did labels every day. In PACE only the newest and each new best are --
     1,700 paces in one row is noise, and the ones that mean something are
     "now" and "the day it got faster". */
  let best=Infinity;
  rows.forEach((r,i)=>{
    const newest=i===rows.length-1, isBest=mode==='pace'&&r.v<best;
    if(mode==='pace'&&r.v<best) best=r.v;
    const out=ax.clip&&!inRange(r.v);
    s+=`<circle class="drdot${newest?' newest':''}${out?' out':''}" data-i="${i}" data-d="${r.d}" data-v="${drunFmt(r.v,mode)}" cx="${cx(i).toFixed(1)}" cy="${Y(r.v).toFixed(1)}" r="${newest?3.4:2.4}"
         fill="${newest&&!out?'var(--accent)':'var(--ground)'}" stroke="var(--accent)" stroke-width="${out?1:1.6}"${out?' stroke-dasharray="1.5 1.5"':''}></circle>`;
    if(mode==='dist'||newest||isBest){
      const away=rows.length-1-i;
      const op=newest?1:Math.max(0.35,0.92-away*0.033);
      s+=`<text x="${cx(i).toFixed(1)}" y="6.5" text-anchor="middle" font-family="var(--mono)" font-size="6.5" opacity="${op.toFixed(2)}"
           ${newest?'font-weight="700" fill="var(--chalk)"':'fill="var(--muted)"'} data-lbl="total">${drunFmt(r.v,mode)}</text>`;
    }
    const lab=(+r.d.slice(5,7))+'/'+(+r.d.slice(8,10));
    s+=`<text x="${cx(i).toFixed(1)}" y="${DRUN_BASE+6}" transform="rotate(-90 ${cx(i).toFixed(1)} ${DRUN_BASE+6})" text-anchor="end" font-family="var(--mono)" font-size="7" fill="var(--muted)">${lab}</text>`;
  });
  return s+'</svg>';
}
function dailyRunsSection(){
  const u=runUnit(), mode=drunMode(), rows=drunRows(u,mode);
  if(!rows.length) return '';
  const vals=rows.map(r=>r.v);
  const ax=mode==='pace'?drunPaceAxis(vals):drunAxis(Math.max(0.1,...vals));
  const labs=[]; for(let i=ax.n;i>=0;i--){ const v=ax.bot+i*ax.step; labs.push(`<span>${drunFmt(v,mode)}</span>`); }
  /* the footer is THIS MONTH to date: it resets on the 1st, so the number
     answers "how am I doing now" rather than accumulating forever. */
  const mo=todayISO.slice(0,7), mrows=rows.filter(r=>r.d.startsWith(mo));
  const monthName=new Date(todayISO+'T00:00').toLocaleDateString('en-US',{month:'long'});
  const f=v=>(Math.round(v*100)/100).toFixed(2);
  let foot;
  if(mode==='pace'){
    const avg=mrows.length?mrows.reduce((a,r)=>a+r.v,0)/mrows.length:0;
    foot=`<span><b>${mrows.length?paceStr(avg):'\u2014'}</b> per ${u} in ${monthName}</span><span>${mrows.length?`best ${paceStr(Math.min(...mrows.map(r=>r.v)))}`:'no timed runs yet'}</span>`;
  }else{
    const tot=mrows.reduce((a,r)=>a+r.v,0), avg=mrows.length?tot/mrows.length:0;
    foot=`<span><b>${f(tot)}</b> ${u} in ${monthName}</span><span>${mrows.length} run${mrows.length===1?'':'s'}${mrows.length?` \u00b7 ${f(avg)} ${u} each`:''}</span>`;
  }
  return `<h2>Daily runs${hActs('dailyruns','One point per run day, oldest first. Units follow Settings: kg uses km; lb uses miles. Drag to scroll; hold briefly, then drag to scrub (mouse: press and drag). The readout shows the selected date, total distance and pace over timed distance only. Switch dist/pace to change the line. Lower pace is faster; points at the rim still show their actual pace when scrubbed. The footer counts this month only.','About Daily runs')}</h2>
    <div class="card drcard">
      <div class="pmixhead">
        <span class="drunit mono" data-drcap>${mode==='pace'?'min / '+u:u+' / run'}</span>
        <span class="drread mono" data-drread hidden></span>
        <button type="button" class="pmixmode" data-drunmode aria-label="Show ${mode==='dist'?'pace':'distance'} instead"><span class="${mode==='dist'?'on':''}">dist</span><span class="${mode==='pace'?'on':''}">pace</span></button>
      </div>
      <div class="drrow">
        <div class="draxis"><span class="dryr" data-dryr data-dryr0="${rows[0].d.slice(0,4)}">${rows[0].d.slice(0,4)}</span>${labs.join('')}</div>
        <div class="pmixwrap drwrap" id="drWrap" data-drun-mode="${mode}" data-drun-unit="${u}">${dailyRunsSvg(rows,u,mode,ax)}</div>
      </div>
      <div class="tot">${foot}</div></div>`;
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

  // v3.3.230: lifetime total + current rhythm are one attendance hero.
  let h=currentRhythmSection();   // v3.3.469: the v3.3.468 rest lead was reverted at the maker's word
  cut('kpis');
  /* v3.3.208: Session Build keeps the honest part mix and the live-growing
     skyline, but every unit is now one completed set — never mixed tonnage. */
  /* v3.3.370: "Session build" describes the chart's construction; this says
     what it is of. */
  h+=`<h2>What you did${hActs('pmix',"One block per completed set, stacked by body part. Tap a label to follow it; tap again for all. The sets/weight switch reads the same days as total weight lifted. Runs stay separate.",'About what you did')}</h2>
      <div class="card">
        <div class="pmixhead"><button type="button" class="pmixmode" data-pmixmode
          aria-label="Show ${PMIX_MODE==='sets'?'total weight':'set counts'} instead"><span class="${PMIX_MODE==='sets'?'on':''}">sets</span><span class="${PMIX_MODE==='weight'?'on':''}">${isLb()?'lb':'kg'}</span></button></div>
        <div class="pmixlgdwrap"><div class="pmixlgd" role="group" aria-label="Follow a body part">${Object.keys(SEED.catalog).filter(p=>p!=='Run').map(p=>
          `<button type="button" data-pt="${p}" aria-pressed="${PMIX_FOCUS===p}" style="--pmix-part:${PART_COLORS[p]||'var(--muted)'}"><i></i><span>${p}</span></button>`).join('')}</div></div>
        <div class="pmixbox">
          <span class="pmixyr" id="pmixYr"></span>
          ${pmixAxisSvg(partMix(PMIX_DAYS))}
          <div class="pmixwrap" id="pmixWrap">${partMixSvg(PMIX_DAYS)}</div>
          <button class="pmixnow" id="pmixNow" aria-label="Back to latest">→</button>
        </div>
        <div class="pmixsum" id="pmixSum"></div>
      </div>`;
  cut('pmix');
  /* v3.3.370: "Muscle coverage" is insurance language. "This week" was the
     first proposal and is WRONG -- this is a rolling seven days ending today,
     not a calendar week, and a name that misstates its own window is worse
     than a clinical one. */
  h+=`<h2>The last 7 days${hActs('mc','Days each group trained in the last 7, by each set\u2019s primary muscle. Tap a group for detail. Runs excluded.','About the last 7 days')}</h2>
      <div class="card mccard">${muscleCard()}</div>`;
  cut('mc');
  h+=growthAuditSection();
  cut('rz');
  /* v3.3.271: five retired time sections DELETED — Consistency curves,
     Last 6 months, Days by month, Weekdays, Every month. Retired from the
     assembly in v3.3.213/230, their builders kept running every render
     (~11.8k chars built and thrown away) and their continued presence here
     misled a reader into describing them as live (v3.3.254's deploy note
     carries that confession). buildcheck still fails if any of them returns
     to the declared order; git remembers the code. */
  h+=consistencyRaceSection();
  cut('consrace');
  h+=monthlyPaceSection();
  cut('mpace');
  /* v3.3.111: "Last 30 days, vs your usual" removed on the maker's call — no
     value found in it. Its entire last30/drift computation went with it;
     nothing else read those. */
  h+=bwCard();                       // v3.3.230: conditional, emitted near the bottom
  cut('wt');
  // sections emit in one declared order (v3.3.111). v3.3.257, maker's order:
  // the session just built leads (the page opens on what you did), then this
  // week's coverage, then the audit's verdict, then the attendance hero, then
  // pace and the year story.
  h = _S.pmix + _S.mc + _S.rz + _S.kpis + _S.mpace + _S.consrace;

  // the whole Run story lives here now (was its own tab in v2.04 — reverted)
  /* v3.3.473: Daily runs sits directly after the Running month card, before
     Distance/Pace/Every week. runStatsHTML217 returns all four run sections
     as one string, so the daily card is spliced in ahead of its second h2. */
  { const rs=runStatsHTML217(); const j=rs.indexOf('<h2',rs.indexOf('<h2')+1);
    h+= j>0 ? rs.slice(0,j)+dailyRunsSection()+rs.slice(j) : rs+dailyRunsSection(); }

  // Weight is personal context, not a prerequisite; no entry means no section.
  h+=_S.wt;

  // records — kept, but demoted below the days story
  /* v3.3.271: the if(false) Records tables DELETED — switched off long ago,
     never re-enabled. prFor() stays alive in the Train tab's go-to rows and
     the progression chart. */
  h+=`<h2>Settings</h2>
      <button class="btn ghost" id="settingsBtn">⚙︎ Settings, account &amp; sync</button>
      <div class="note" style="text-align:center">${session?`Signed in as ${session.user.email||'—'}`:'Not signed in — data is on this device only'} · ${APP_VERSION}</div>`;
  $('#view').innerHTML=h;
  bindPaceAll();   // v3.3.236: the pace chart reads by touch

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
