/* ShowUp â€” stats.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- Stats: days first ---------- */
/* v3.3.92: '2025' moves from accent-soft (a BACKGROUND grade â€” 2.10:1 dark /
   1.58:1 light as a stroke) to --chart-soft, the same hue at chart grade.
   The mapping itself is a validated exception to no-categorical-palettes:
   it is a blue+neutral lightness ramp with direct end-labels, weight
   redundancy on the current year, and stable year identity across the
   consistency chart, distance chart, and both share cards. */
const YEAR_COLORS={ '2022':'var(--faint)','2023':'var(--muted)','2024':'var(--accent-dim)','2025':'var(--chart-soft)','2026':'var(--accent)' };
/* v3.3.67 â€” your weight, drawn as the sparse series it actually is.
   A STEP line, not a curve: between two weigh-ins the app knows nothing, and
   carry-forward is literally a step function. A smooth line would draw days
   you never measured, which is a lie the chart has no business telling.
   No goal line, no trend verdict, no red/green. This app scores attendance,
   not your body â€” the number is context for load maths and a quiet record. */
let bwEdit=false;
/* v3.3.72 â€” the month grid's DATA, lifted out so the HTML grid and the canvas
   share card read one source. The PAINT is duplicated on purpose (canvas
   cannot reuse a <span>), but the arithmetic must not be â€” that is exactly
   how resealDay() and foldSets() were born. */
/* v3.3.73 â€” the month in progress is DIMMER, not merely dashed. Its count is
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
   thousand rects â€” cheap enough that lazy loading bought nothing but the
   bug. */
let PMIX_DAYS=99999;
/* v3.3.121: tapping a legend name isolates that part. Applied by mutating
   the rendered rects rather than re-rendering, so the scroll position â€” and
   any weeks loaded backwards â€” survive the tap. */
let PMIX_FOCUS=null;
/* v3.3.122: press a column and read that day out in full. The chart is
   discrete, so this is an index lookup rather than the interpolation the
   line charts need. */
/* v3.3.125: the drag-scrubber is gone. Tapping is the only interaction now
   and it does one thing â€” follow a body part â€” so this line says that, and
   says what you are following once you have chosen. */
function pmixHint(){
  const el=document.getElementById('pmixRead');
  if(!el) return;
  el.innerHTML = PMIX_FOCUS
    ? `Showing <b style="color:${PART_COLORS[PMIX_FOCUS]}">${PMIX_FOCUS}</b> Â· tap again to show all`
    : 'One block = one completed set Â· tap to follow a body part';
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
    Â· ${fmt(sum)} completed set${sum===1?'':'s'} across ${vals.length} session${vals.length===1?'':'s'}
    Â· ${fmt(+avg.toFixed(1))} avg`;
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
  /* labels only exist for the focused part, so this re-renders â€” scroll is
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
/* v3.3.125: columns 17â†’12 and bars 13â†’10 (â‰ˆ20% narrower, gap halved), so
   more of the archive is legible at once. PMIX_H 232â†’186 because the drawn
   content ended near y=182 â€” rotated dates run from PMIX_BASE+6 down about
   26px â€” leaving ~50px of empty box under every render. */
const PMIX_COLW=15, PMIX_H=186, PMIX_TOP=8, PMIX_BASE=150;   // v3.3.127: bars 10â†’12.5, exactly 25% wider
const PMIX_AXW=25;   // v3.3.126: 34â†’25, ~26% of the left gutter reclaimed
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
  /* soft rule at each month; a firmer one, labelled, at each year â€” without
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
    // every column names its day, rotated â€” as the spreadsheet does
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
               value="${cur>0?wDisp(cur):''}" placeholder="â€”"></div>
      <div class="btnrow">
        <button class="btn ghost" id="bwCancel">Cancel</button>
        <button class="btn" id="bwSave">Save</button>
      </div>
      <div class="note">Recorded against today. Enter it only when it has changed â€” silence means unchanged.</div>`;
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
            ? `last change ${pretty(last)} Â· ${since===0?'today':since+'d ago'}`
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
      const Y=v=>95-(v-lo)/(hi-lo)*75;   // v3.3.113: baseline 84â†’95, span 66â†’75 (Ã—1.135 into the 118 box)
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
  return `<h2 id="secWeight">Weight${hActs('bw',"Flat stretches are day×]¸âÚ$z{-®éÜj×¶CÆVæC¶B³Ó"—°¢6öç7BƒÓ#²†Bó3cb’£3"Â—“Ó“Ö7W'fU¶EÒ£s°¢G2³ÖG·‚çFôf—†VBƒ—ÒÂG·—’çFôf—†VBƒ—Ò°¢Ğ¢6öç7B7W#×“ÓÓ×F†—5–V#°¢‚³ÖÇöÇ–Æ–æRFF×—#Ò"G·—Ò"ö–çG3Ò"G·G7Ò"f–ÆÃÒ&æöæR"7G&ö¶SÒ"Gµ”T%ô4ôÄõ%5·•×ÇÂwf"‚ÒÖ×WFVB’wÒ ¢7G&ö¶R×v–GFƒÒ"G¶7W#ó"ã#£ãÒ"÷6—G“Ò"G¶7W#ó¢ãwÒ"7G&ö¶RÖÆ–æV¦ö–ãÒ'&÷VæB#ãÂ÷öÇ–Æ–æSæ°¢6öç7BÇƒÓ#²‚†VæBÓ’ó3cb’£3"ÂÇ“#Ó“Ö7W'fU¶VæBÓÒ£s°¢VæDÆ&VÇ2çW6‚‡·’ÆÇ‚ÆÇ“¦Ç“"Æ7W"Ç7C¤ÖF‚ç&÷VæB†7W'fU¶VæBÓÒ£—Ò“°¢–b†7W"’‚³ÖÆ6—&6ÆR6Æ73Ò&&V6öâ"7ƒÒ"G¶Ç‡Ò"7“Ò"G¶Ç“'Ò"#Ò#2ã""f–ÆÃÒ'f"‚ÒÖ66VçB’#ãÂö6—&6ÆSæ°¢Ğ¢VæDÆ&VÇ2ç6÷'B‚†Æ"“ÓææÇ’Ö"æÇ’“°¢f÷"†ÆWB“Ó¶“ÆVæDÆ&VÇ2æÆVæwFƒ¶’²²¢–b†VæDÆ&VÇ5¶•ÒæÇ’ÖVæDÆ&VÇ5¶’ÓÒæÇ“Ã‚’VæDÆ&VÇ5¶•ÒæÇ“ÖVæDÆ&VÇ5¶’ÓÒæÇ’³ƒ°¢f÷"†6öç7BÂöbVæDÆ&VÇ2¢‚³ÖÇFW‡BFF×—#Ò"G´Âç—Ò"ƒÒ"G´ÖF‚æÖ–â„ÂæÇ‚³BÃ3"’çFôf—†VBƒ—Ò"“Ò"G²„ÂæÇ’³"ãR’çFôf—†VBƒ—Ò"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#r ¢f–ÆÃÒ"Gµ”T%ô4ôÄõ%5´Âç•×ÇÂwf"‚ÒÖ×WFVB’wÒ"föçB×vV–v‡CÒ"G´Âæ7W#ós£CÒ#âG´Âç7GÒSÂ÷FW‡Cæ°¢‚³ÖÂ÷7fsãÂöF—cãÂöF—cæ²òòc2ã2ã#¢6†&RÖ÷fVBFòF†R†VFW  ¢òò†VFÖ¢#bvVV·2ÂvVV¶F’&–ÂöâF†RÆVgBÂÖöçF‡27&÷72F†RF÷ ¢6öç7BFWF–ÃÖÆÄF—2‚“°¢7WB‚v6öç2r“°¢‚³ÖÆƒ#äÆ7BbÖöçF‡2G¶„7G2‚v†VBrÂtöæR6öÇVÖâW"vVV²âf–ÆÆVB7V&W2&RG&–æVBF—2ârÂt&÷WBF†RbÖÖöçF‚†VFÖr—ÓÂöƒ#ãÆF—b6Æ73Ò&6&B#ãÆF—b6Æ73Ò&†VGw&#à¢ÆF—b6Æ73Ò'vG&–Â#âGµ²u2rÂtÒrÂuBrÂurrÂuBrÂtbrÂu2uÒæÖ†CÓæÇ7ãâG¶GÓÂ÷7ãæ’æ¦ö–â‚rr—ÓÂöF—cà¢ÆF—b6Æ73Ò&†VF6öÇ2#ãÆF—b6Æ73Ò&†VG67&öÆÂ#æ°¢6öç7B7F'C#ÖæWrFFR‡FöF”•4ò²uC£r“°¢7F'C"ç6WDFFR‡7F'C"ævWDFFR‚’×7F'C"ævWDF’‚’Ó#R£r“°¢ÆWB×&÷sÒrrÂw&–CÒrrÂÆ7DÓÒÓ°¢f÷"†ÆWBsÓ·sÃ#c·r²²—°¢6öç7Bf—'7CÖæWrFFR‡7F'C"“²f—'7Bç6WDFFR‡7F'C"ævWDFFR‚’·r£r“°¢6öç7BÓÖf—'7BævWDÖöçF‚‚“°¢×&÷r³ÖÇ7â6Æ73Ò&ÖÆ"#âG¶ÒÓÖÆ7DÓöf—'7BçFôÆö6ÆTFFU7G&–ær‚vVâÕU2rÇ¶ÖöçFƒ¢w6†÷'BwÒ“¢rwÓÂ÷7ãæ°¢Æ7DÓÖÓ°¢w&–B³ÖÆF—b6Æ73Ò'v²#æ°¢f÷"†ÆWBFCÓ¶FCÃs¶FB²²—°¢6öç7B3ÖæWrFFR‡7F'C"“²2ç6WDFFR‡7F'C"ævWDFFR‚’·r£r¶FB“°¢6öç7B—6óÖ2çFôÆö6ÆTFFU7G&–ær‚vVâÔ4r“°¢6öç7BgWGW&SÖ—6óçFöF”•4ó°¢w&–B³ÖÆ’FFÖÃÒ"G¶FFW2æ†2†—6ò“ó#£Ò"6Æ73Ò"G¶—6óÓÓ×FöF”•4óòwFöF’s¢rwÒG¶gWGW&SòvgWBs¢rwÒ"F—FÆSÒ"G¶—6÷Ò#ãÂö“æ°¢Ğ¢w&–B³ÖÂöF—cæ°¢Ğ¢‚³ÖÆF—b6Æ73Ò&×&÷r#âG¶×&÷wÓÂöF—cãÆF—b6Æ73Ò&†VB#âG¶w&–GÓÂöF—cãÂöF—cæ°¢‚³ÖÂöF—cãÂöF—cãÂöF—cæ° ¢òòF—2W"ÖöçF‚&'0¢6öç7B×3Ôö&¦V7BæVçG&–W2†ÖöçF„6÷VçG2’ç6÷'B‚’ç6Æ–6R‚Ó"“°¢6öç7BF”ödÖöçFƒÒ·FöF”•4òç6Æ–6Rƒ‚“°¢6öç7BF—4–äÖöçFƒÖæWrFFR‚·F†—5–V"Â¶ÖöçF„¶W’ç6Æ–6RƒR’Ã’ævWDFFR‚“°¢6öç7BG&–æVEF†—3ÖÖöçF„6÷VçG5¶ÖöçF„¶W•×ÇÃ°¢7WB‚vÆ7Cbr“°¢‚³ÖÆƒ#äF—2'’ÖöçF‚G¶„7G2‚vF&ÒrÂuF†RF6†VBÆ–æRÖ&·2#F—2ârÂt&÷WBF†RÖöçF†Ç’6†'Br—ÓÂöƒ#ãÆF—b6Æ73Ò&6&B#à¢ÆF—b6Æ73Ò'¦ööÖ†–çB#ç–æ6‚Fò¦ööÓÂöF—cà¢ÆF—b6Æ73Ò'¦ööÒ"FF×¦ööÓà¢Ç7frf–Wt&÷ƒÒ#33S"7G–ÆSÒ'v–GFƒ£S¶†V–v‡C¦WFò#à¢ÆÆ–æRƒÒ#‚"“Ò"G³#bÓ#ó3£'Ò"ƒ#Ò#3b"“#Ò"G³#bÓ#ó3£'Ò"7G&ö¶SÒ'f"‚ÒÖÆ–æR’"7G&ö¶R×v–GFƒÒ#ãb"7G&ö¶RÖF6†'&“Ò#"2#ãÂöÆ–æSà¢ÇFW‡BƒÒ#3’"“Ò"G³#‚Ó#ó3£'Ò"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#r"f–ÆÃÒ'f"‚ÒÖ×WFVB’#ã#Â÷FW‡Cæ°¢×2æf÷$V6‚‚…¶ÒÆåÒÆ’“Óç°¢6öç7B7W#ÖÓÓÓÖÖöçF„¶W“°¢6öç7B&ƒÔÖF‚æÖ‚ƒ"Æâó3£"’ÂƒÓ‚¶’£#RãS²òòc2ã2ã#“¢7âƒÓâ"Â&6VÆ–æR“BÓâ#`¢–b†7W"—²òòF6†VB÷WFÆ–æRÒF—2VÆ6VBÂ6ò6†÷'B&"—6âwBÖ—7&V@¢6öç7BvƒÖF”ödÖöçF‚ó3£#°¢‚³ÖÇ&V7BƒÒ"G·‡Ò"“Ò"G³#bÖv‡Ò"v–GFƒÒ#r"†V–v‡CÒ"G¶v‡Ò"'ƒÒ#2"f–ÆÃÒ&æöæR ¢7G&ö¶SÒ'f"‚ÒÖ66VçB’"7G&ö¶R×v–GFƒÒ#ã‚"7G&ö¶RÖF6†'&“Ò#""#ãÂ÷&V7Cæ°¢Ğ¢‚³ÖÇ&V7B6Æ73Ò&v&""ƒÒ"G·‡Ò"“Ò"G³#bÖ&‡Ò"v–GFƒÒ#r"†V–v‡CÒ"G¶&‡Ò"'ƒÒ#2"f–ÆÃÒ'f"‚ÒÖ66VçB’"÷6—G“Ò"G¶7W#ó¢ãSWÒ#ãÂ÷&V7Cæ°¢–b†7W"—°¢òòG&–æVB6÷VçB6—G2”å4”DRF†Rf–ÆÃ²F†RçVÖ&W"&÷fRF†RF6†W2—2F—2VÆ6V@¢6öç7BvƒÖF”ödÖöçF‚ó3£#°¢‚³ÖÇFW‡BƒÒ"G·‚³‚ãWÒ"“Ò"G³#bÖv‚Ó7Ò"FW‡BÖæ6†÷#Ò&Ö–FFÆR"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#r"f–ÆÃÒ'f"‚ÒÖ×WFVB’#âG¶F”ödÖöçF‡ÓÂ÷FW‡Cà¢ÇFW‡BƒÒ"G·‚³‚ãWÒ"“Ò"G´ÖF‚æÖ–âƒ#2Ã#bÖ&‚³’—Ò"FW‡BÖæ6†÷#Ò&Ö–FFÆR"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#r"föçB×vV–v‡CÒ#s"f–ÆÃÒ"6ffb#âG¶çÓÂ÷FW‡Cæ°¢ÖVÇ6W°¢‚³ÖÇFW‡BƒÒ"G·‚³‚ãWÒ"“Ò"G³#bÖ&‚Ó7Ò"FW‡BÖæ6†÷#Ò&Ö–FFÆR"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#r"f–ÆÃÒ'f"‚ÒÖ×WFVB’#âG¶çÓÂ÷FW‡Cæ°¢Ğ¢‚³ÖÇFW‡BƒÒ"G·‚³‚ãWÒ"“Ò#3’"FW‡BÖæ6†÷#Ò&Ö–FFÆR"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#r"f–ÆÃÒ"G¶7W#òwf"‚ÒÖ66VçB’s¢wf"‚ÒÖ×WFVB’wÒ#âG¶Òç6Æ–6RƒR—ÓÂ÷FW‡Cæ°¢Ò“°¢‚³ÖÂ÷7fsãÂöF—cà¢ÆF—b6Æ73Ò'F÷B#ãÇ7ããÆ#âG·G&–æVEF†—7ÓÂö#âG&–æVB+rG¶F”ödÖöçF‚×G&–æVEF†—7Ò&W7FVCÂ÷7ããÇ7ãâG¶F”ödÖöçF‡ÒF—2–çFòG¶ÖöçF„¶W’ç6Æ–6RƒR—ÓÂ÷7ããÂöF—cãÂöF—cæ° ¢òòÖöçF†Ç’¶Ò(	BF†R'VâF"÷vç2F†R6†'G2æ÷s²F†—2Ö7F–ÆÂfVVG2F†P¢òò6ö×÷6—F–öâ÷fW&Æ’gW'F†W"F÷vâà¢6öç7B¶Ô'“×·Ó°¢f÷"†6öç7B¶ÒÇeÒöbö&¦V7BæVçG&–W2…4TTBæÖöçF†Ç’’’¶Ô'•¶ÕÓ×bæ¶×ÇÃ°¢f÷"†6öç7B¶BÇeÒöbö&¦V7BæVçG&–W2„D"æF—2’—°¢–b†CÃÕ4TTBçF÷FÇ2æÆ7B’6öçF–çVS°¢f÷"†6öç7B2öbbçr’–b‡2æWƒÓÓÒu'Vâr’¶Ô'•¶Bç6Æ–6RƒÃr•ÓÒ†¶Ô'•¶Bç6Æ–6RƒÃr•×ÇÃ’·2çs°¢Ğ ¢òòv†–6‚vVV¶F—2–÷R6†÷rW(	BÆ7B3cRF—2Âöââ'6öÇWFR(	3R66ÆP¢6öç7B÷vC×vDF—7B‚“²òòc2ã2ãC¢öæR6÷W&6RÂ7fr²6&@¢6öç7BvE7CÕ÷vBç7C°¢6öç7BvD&W7CÔÖF‚æÖ‚‚ââçvE7B“°¢ò¢c2ã2ãCc¢F†R66VçBÖ&·2DôD’w2vVV¶F’(	BF†R&÷r–÷Rw&R7FæF–ær–â(	@¢æ÷BF†R7FF—7F–6ÆÇ’7G&öævW7BöæRâF†R7G&öævW7B7F–ÆÂvWG2V–W@¢6&WB&÷fR—G2&"6òF†RGFW&â7F—2f—6–&ÆRv—F†÷WB6ö×WF–ærv—F€¢FöF’f÷"F†RöæRÆ÷VB6öÆ÷W"â…F–W3¢f—'7BÖF6‚v–ç2F†R6&WC²FöF¢Çv—2v–ç2F†R66VçBWfVâ–bFöF’—2Ç6òF†R7G&öævW7Bâ’¢ğ¢6öç7BvEFöF“ÖæWrFFR‡FöF”•4ò²uC£r’ævWDF’‚“°¢6öç7B&W7D“×vE7Bæ–æFW„öb‡vD&W7B“°¢7WB‚vF&Òr“°¢‚³ÖÆƒ#åvVV¶F—2G¶„7G2‚wvBrÂuÇS#V#"Ö&·2–÷W"7G&öævW7BvVV¶F’â&ÇVR—2FöF’ârÂt&÷WBF†RvVV¶F’6†'Br—ÓÂöƒ#ãÆF—b6Æ73Ò&6&B#à¢Ç7frf–Wt&÷ƒÒ#33S"7G–ÆSÒ'v–GFƒ£S¶†V–v‡C¦WFò#æ²òòc2ã2ã#“¢(i#S‡c2ã2ã2†B7WBC(i#ƒ²BF†B†V–v‡BF†R6&WBæBF†RRÆ&VÂ†Bæ÷v†W&RFòvò¢f÷"†6öç7Bröb³Ã#RÃSÃsRÃÒ—°¢6öç7B“Ó#bÖró£3²òòc2ã2ã#“¢&6VÆ–æR“N(i##bÂ7âƒ(i#0¢‚³ÖÆÆ–æRƒÒ##B"“Ò"G·—Ò"ƒ#Ò#3b"“#Ò"G·—Ò"7G&ö¶SÒ'f"‚ÒÖÆ–æR’"7G&ö¶R×v–GFƒÒ#ãb"G¶sòw7G&ö¶RÖF6†'&“Ò#"2"s¢rwÓãÂöÆ–æSà¢ÇFW‡BƒÒ##"“Ò"G·’³7Ò"FW‡BÖæ6†÷#Ò&VæB"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#r"f–ÆÃÒ'f"‚ÒÖ×WFVB’#âG¶wÓÂ÷FW‡Cæ°¢Ğ¢²u2rÂtÒrÂuBrÂurrÂuBrÂtbrÂu2uÒæf÷$V6‚‚†Æ"Æ’“Óç°¢6öç7B×vE7E¶•ÒÂFöF“Ö“ÓÓ×vEFöF’Â&W7CÖ“ÓÓÖ&W7D“°¢6öç7B&ƒÔÖF‚æÖ‚ƒ"Ç£2’ÂƒÓ3"¶’£C°¢‚³ÖÇ&V7B6Æ73Ò&v&"vBÖ6öÂ"ƒÒ"G·‡Ò"“Ò"G³#bÖ&‡Ò"v–GFƒÒ##b"†V–v‡CÒ"G¶&‡Ò"'ƒÒ#B ¢f–ÆÃÒ"G·FöF“òwf"‚ÒÖ66VçB’s¢wf"‚ÒÖ66VçBÖF–Ò’wÒ"÷6—G“Ò"G·FöF“ó¢ãgÒ#ãÂ÷&V7Cæ°¢ò¢c2ã2ã#“¢öæR7F6²ÂÇv—2F†R6ÖR÷&FW"(	B&"ÂF†VâRB&÷fR—BÀ¢F†VâF†R6&WB&÷fRF†BâF†RöÆB6öFR'&æ6†VBF†RR÷6—F–öâöà¢FöF’ö&W7BæBWBF†R6&WBBf—†VB‚&÷fRF†R&"Â6òF’F†@¢v2$õD‚FöF’æB7G&öævW7B…GVRÂ–âF†Rf–VÆB&W÷'B’G&WrF†VÒ@¢Væ—G2'BÂöâF÷öbV6‚÷F†W"â÷6—F–öâæòÆöævW"FWVæG2öà¢v†–6‚fÆw2&R6WBÂ6òæò6öÖ&–æF–öâ6â6öÆÆ–FRâ¢ğ¢6öç7B7E“Ó#bÖ&‚ÓC°¢‚³ÖÇFW‡BƒÒ"G·‚³7Ò"“Ò"G·7E—Ò"FW‡BÖæ6†÷#Ò&Ö–FFÆR"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#‚"f–ÆÃÒ"G·FöF“òwf"‚ÒÖ66VçB’s¢wf"‚ÒÖ×WFVB’wÒ"föçB×vV–v‡CÒ"G·FöF“ós£CÒ#âG´ÖF‚ç&÷VæB‡£—ÒSÂ÷FW‡Cæ°¢–b†&W7B’‚³ÖÇFW‡BƒÒ"G·‚³7Ò"“Ò"G·7E’ÓÒ"FW‡BÖæ6†÷#Ò&Ö–FFÆR"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#’"f–ÆÃÒ'f"‚ÒÖ×WFVB’#î)k#Â÷FW‡Cæ°¢‚³ÖÇFW‡BƒÒ"G·‚³7Ò"“Ò#C"FW‡BÖæ6†÷#Ò&Ö–FFÆR"föçBÖfÖ–Ç“Ò'f"‚ÒÖÖöæò’"föçB×6—¦SÒ#’"f–ÆÃÒ"G·FöF“òwf"‚ÒÖ6†Æ²’s¢wf"‚ÒÖ×WFVB’wÒ"föçB×vV–v‡CÒ"G·FöF“ós£CÒ#âG¶Æ'ÓÂ÷FW‡Cæ°¢Ò“°¢‚³ÖÂ÷7fsãÆF—b6Æ73Ò&æ÷FR#âRöbV6‚vVV¶F’G&–æVBÂÆ7B3cRF—2+r)k"–÷W"7G&öævW7CÂöF—cãÂöF—cæ° ¢òòÖöçF‚Ö'’ÖÖöçF‚6ö×÷6—F–öâ(	BF†R6†VWBw2%v†–6‚'BÒ’Ö—76–ær÷WCò"6†'@¢ò¢c2ãã3¢F†R7F6¶VBÖÖöçF‡26†'BæBF†R&F"&RvöæR…7Væv¦VRw0¢fW&F–7C¢öæRæVVFVB67&öÆÆ–ærÂF†R÷F†W"&ö×FVBæ÷F†–ær’â&WÆ6VB'¢Gvò67&öÆÂÖg&VRf–Ww2F†BV6‚ç7vW"ôäRVW7F–öââ¢ğ ¢ò¢ÒÒÒ$†fR’¶WB6†÷v–ærWò"(	BWfW'’ÖöçF‚WfW"ÂöæR67&VVâÒÒÒ¢ğ¢6öç7BövCÖw&–DFF‚“°¢6öç7BÔF—3ÕövBæÔF—2Âw“ÕövBç“Âw“ÕövBç“ÂtÖƒÕövBæÖ‚ÂÓÕövBæÓÂÔæ÷sÕövBæÔæ÷s°¢7WB‚wvBr“°¢‚³ÖÆƒ"–CÒ'6V5'G2#äWfW'’ÖöçF‚G¶„7G2‚vÖw&–BrÂtF&¶W"ÖVç2Ö÷&RF—2âFÖöçF‚Fò÷Vâ—BârÂt&÷WBF†RÖöçF‚w&–Br—ÓÂöƒ#ãÆF—b6Æ73Ò&6&B#à¢ÆF—b6Æ73Ò&Öw&–B#ãÇ7ããÂ÷7ãâG²t¤dÔÔ¤¤4ôäBrç7Æ—B‚rr’æÖ†3ÓæÇ7â6Æ73Ò&ÖrÖ‚#âG¶7ÓÂ÷7ãæ’æ¦ö–â‚rr—Ö°¢f÷"†ÆWB“Öw“·“ÃÖw“·’²²—°¢‚³ÖÇ7â6Æ73Ò&Ör×’Ööæò#ârGµ7G&–ær‡’’ç6Æ–6Rƒ"—ÓÂ÷7ãæ°¢f÷"†ÆWBÓÓ¶ÓÃÓ#¶Ò²²—°¢6öç7B³ÖG·—ÒÒGµ7G&–ær†Ò’çE7F'Bƒ"Âsr—Ö°¢6öç7BãÖÔF—5¶µ×ÇÃ°¢6öç7B÷WCÖ³ÆÓÇÆ³æÔæ÷s°¢6öç7BÔÖF‚ç&÷VæB†ÖtÇ††âÆtÖ‚Æ³ÓÓÖÔæ÷r’£“°¢‚³ÖÇ7â6Æ73Ò&ÖrÖ2ÖöæòG¶³ÓÓÖÔæ÷sòv7W"s¢rwÒ"G¶÷WCòrs¦FFÖÖ³Ò"G¶·Ò&Ò7G–ÆSÒ"G¶ãö&6¶w&÷VæC¦6öÆ÷"ÖÖ—‚†–â7&v"Âf"‚ÒÖ66VçB’G¶ÒRÂG&ç7&VçB–¢rwÒ#âG¶÷WCòrs¢†çÇÂ|+rr—ÓÂ÷7ãæ°¢Ğ¢Ğ¢‚³ÖÂöF—cãÆF—b–CÒ&ÖW‡#ãÂöF—cà¢ÂöF—cæ²òòc2ã2ã#¢6†&RÖ÷fVBFòF†R†VFW  ¢7WB‚vVÒr“°¢ò¢c2ã2ã¢$Æ7B3F—2Âg2–÷W"W7VÂ"&VÖ÷fVBöâF†RÖ¶W"w26ÆÂ(	Bæğ¢fÇVRf÷VæB–â—Bâ—G2VçF—&RÆ7C3öG&–gB6ö×WFF–öâvVçBv—F‚—C°¢æ÷F†–ærVÇ6R&VBF†÷6Râ¢ğ¢‚³Ö't6&B‚“²òòc2ã2ãc“¢–÷RÂ&Vf÷&RF†R'BÖ'’×'BG&–g@¢‚³ÖÖôvöÄ6&D…DÔÂ‚“²òòc2ã2ãc#¢F†RvöÂ6—G2VæFW"vV–v‡BÂ&÷fR%Tà¢7WB‚wwBr“° ¢ò¢c2ã2ã3¢%&W÷'B6&B"$UEU$å2Â'WBæ÷B2F†Rc2ã2ã6V7F–öâF†@¢v2&VÖ÷fVBâF†BöæRv2ÖöçF‚×7FWW"v—F‚—G2÷vâ6†&R6&BâF†—0¢öæR—2F†Rw26–ævÆR6†&R7W&f6S¢&÷FFRFòF†R6&B–÷RvçBÂF†Và¢6VæB—BâWfW'’W"×6V7F–öâ6†&R'WGFöâ—2vöæR–âff÷W"öb—Bâ¢ğ¢‚³ÖÆƒ"–CÒ'6V5&W÷'B#å&W÷'B6&BG¶„7G2‚w&WrÂu7v—RFò6&BÂF†Vâ6†&R—B2â–ÖvRârÂt&÷WBF†R&W÷'B6&Br—ÓÂöƒ#à¢ÆF—b6Æ73Ò&6&B&W6&B"–CÒ'&W6&B#à¢ÆF—b6Æ73Ò'&Wæb#à¢Æ'WGFöâ6Æ73Ò'&W""–CÒ'&W&Wb"&–ÖÆ&VÃÒ%&Wf–÷W26&B#î(“Âö'WGFöãà¢ÆF—b6Æ73Ò'&WGFÂ"–CÒ'&WGFÂ#âfæ'7³ÂöF—cà¢Æ'WGFöâ6Æ73Ò'&W""–CÒ'&WæW‡B"&–ÖÆ&VÃÒ$æW‡B6&B#î(£Âö'WGFöãà¢ÂöF—cà¢ÆF—b6Æ73Ò'&WF‡VÖ'w&#ãÆ–Ör–CÒ'&WF‡VÖ""ÇCÒ""6Æ73Ò'&WF‡VÖ"#ãÂöF—cà¢ÆF—b6Æ73Ò&æ÷FR&WF÷G2"–CÒ'&WF÷G2#ãÂöF—cà¢Æ'WGFöâ6Æ73Ò&'Fâ"–CÒ'&W6†&R#å6†&R2–ÖvSÂö'WGFöãà¢Æ'WGFöâ6Æ73Ò&'Fâv†÷7B"–CÒ'&WÆÂ"7G–ÆSÒ&Ö&v–ã£‡‚#å6fRÆÂG·6†&T6&G2‚’æÆVæwF‡ÓÂö'WGFöãà¢ÂöF—cæ°¢7WB‚w&Wr“°¢òò6V7F–öç2VÖ—B–âöæRFV6Æ&VB÷&FW"‡c2ã2ã¢‚Òõ2æ·—2²õ2ç'¢²õ2çÖ—‚²õ2æÖ2²õ2æ–r²õ2æ6öç2²õ2æVÒ²õ2æF&Ò²õ2æÆ7Cb²õ2çvB²õ2çwC° ¢òòF†Rv†öÆR'Vâ7F÷'’Æ—fW2†W&Ræ÷r‡v2—G2÷vâF"–âc"ãB(	B&WfW'FVB¢‚³×'Vå7FG4…DÔÂ‚“° ¢òò&V6÷&G2(	B¶WBÂ'WBFVÖ÷FVB&VÆ÷rF†RF—27F÷'¢‚³ÖÆƒ"–CÒ'6V5&V6÷&G2#å&V6÷&G3Âöƒ#æ°¢f÷"†6öç7B'Böbö&¦V7Bæ¶W—2…4TTBæ6FÆör’—°¢–b‡'CÓÓÒu'Vâr’6öçF–çVS°¢6öç7B&÷w3Ö6Df÷"‡'B’æÖ†SÓå¶RÇ$f÷"†R’ÆW…F–W"†R•Ò’æf–ÇFW"‚…²ÇÒ“Óçæ×sã’ç6÷'B‚†Æ"“Óæ%³Òæ×rÖ³Òæ×r“°¢–b‚&÷w2æÆVæwF‚’6öçF–çVS°¢6öç7B6÷&S×&÷w2æf–ÇFW"‡#Óç%³%ÓÓÓÒvv÷Fòr’Â÷F†W#×&÷w2æf–ÇFW"‡#Óç%³%ÒÓÒvv÷Fòr“°¢‚³ÖÆƒ"6Æ73Ò'V–WB"7G–ÆSÒ&Ö&v–â×F÷£g‚#âG·'GÓÂöƒ#æ°¢–b†6÷&RæÆVæwF‚—°¢‚³ÖÇF&ÆR6Æ73Ò'&V2Ö6÷&R#ãÇG#ãÇFƒä6÷&RW†W&6—6W3Â÷FƒãÇF‚7G–ÆSÒ'FW‡BÖÆ–vã§&–v‡B#åF÷‚GµR‚—Ò“Â÷FƒãÂ÷G#æ°¢6÷&Ræf÷$V6‚‚…¶RÇÒ“Óç¶‚³ÖÇG#ãÇFCãÆ#âG¶WÓÂö#ãÂ÷FCãÇFB6Æ73Ò&â#ãÆ#âG·tF—7‡æ×r—ÓÂö#â9rG·æ×w'Ğ¢Æ'WGFöâ6Æ73Ò'FÖ÷fR"FF×F–W"ÖWƒÒ"G¶WÒ"FF×F–W"×FóÒ&÷F†W""F—FÆSÒ$Ö÷fRFò÷F†W"#î(i3Âö'WGFöããÂ÷FCãÂ÷G#æ·Ò“°¢‚³ÖÂ÷F&ÆSæ°¢Ğ¢–b†÷F†W"æÆVæwF‚—°¢‚³ÖÇF&ÆR6Æ73Ò'&V2Ö÷F†W"#ãÇG#ãÇFƒä÷F†W#Â÷FƒãÇFƒãÂ÷FƒãÂ÷G#æ°¢÷F†W"æf÷$V6‚‚…¶RÇÒ“Óç¶‚³ÖÇG#ãÇFCâG¶WÓÂ÷FCãÇFB6Æ73Ò&â#âG·tF—7‡æ×r—Ò9rG·æ×w'Ğ¢Æ'WGFöâ6Æ73Ò'FÖ÷fR"FF×F–W"ÖWƒÒ"G¶WÒ"FF×F–W"×FóÒ&6÷&R"F—FÆSÒ$Ö÷fRFò6÷&R#î(iÂö'WGFöããÂ÷FCãÂ÷G#æ·Ò“°¢‚³ÖÂ÷F&ÆSæ°¢Ğ¢Ğ ¢‚³Õõ2ç&W²òòc2ã2ã3¢F†RW†—B(	B–÷R†fR6VVâF†RçVÖ&W'2Â†W&R—2F†R&V6V—@ ¢‚³ÖÆƒ#å6WGF–æw3Âöƒ#à¢Æ'WGFöâ6Æ73Ò&'Fâv†÷7B"–CÒ'6WGF–æw4'Fâ#î)©ûˆâ6WGF–æw2Â66÷VçBf×²7–æ3Âö'WGFöãà¢ÆF—b6Æ73Ò&æ÷FR"7G–ÆSÒ'FW‡BÖÆ–vã¦6VçFW"#âG·6W76–öãö6–væVB–â2G·6W76–öâçW6W"æVÖ–ÇÇÂ~(	BwÖ¢tæ÷B6–væVB–â(	BFF—2öâF†—2FWf–6RöæÇ’wÒ+rG´õdU%4”ôçÓÂöF—cæ°¢B‚r7f–Wrr’æ–ææW$…DÔÃÖƒ°¢'¤&–æDÆÂ‚“°¢ò¢c2ã2ãC#¢F†RbÖÖöçF‚†VFÖ'Vç2öÆFW7B(i"æWvW7BÂ6ò—G2FVfVÇ@¢67&öÆÂ÷6—F–öâ6†÷vVB¦çV'’æB†–BFöF’â&²—BBF†R&–v‡@¢VFvR(	BF†R7W'&VçBvVV²—2F†Rv†öÆRö–çBöbF†R7G&—â67&öÆÄÆVgBöà¢F†R67&öÆÆW"—G6VÆbÂæWfW"67&öÆÄ–çFõf–WrÂv†–6‚v÷VÆBG&rF†RvRâ¢ğ¢ò¢c2ã2ã“¢æÆVvVæCG&÷VBg&öÒF†—2Æ—7B(	B—Bw&2æ÷r–ç7FVBö`¢67&öÆÆ–ærÂ6òF†W&R—2æò&–v‡BVFvRFò&²BâF†—2&¶–ærv2F†P¢v÷&¶&÷VæBf÷"F†R67&öÆÆW"†–F–ærF†R7W'&VçB–V"Âv†–6‚—2W†7FÇ¢F†R'Vr—Bf–ÆVBFò&WfVçBâ¢ğ¢Fö7VÖVçBçVW'•6VÆV7F÷$ÆÂ‚ræ†VF6öÇ2Âæ†VBr’æf÷$V6‚†VÃÓç°¢–b†VÂç67&öÆÅv–GFƒæVÂæ6Æ–VçEv–GF‚’VÂç67&öÆÄÆVgCÖVÂç67&öÆÅv–GFƒ°¢Ò“°¢–b‡G—Vöb–çE&W6&CÓÓÒvgVæ7F–öâr’–çE&W6&B‚“²òòc2ã2ã3¢f–ÆÂF†R&W÷'B6&B&Wf–Wp§Ğ  ¢ò¢ÒÒÒÒÒÒÒÒÒÒC3¢Fw&–BÖöçF‚Â—B÷Vç2–âÆ6RÒÒÒÒÒÒÒÒÒÒ¢ğ¦ÆWBöÖW‡³ÖçVÆÃ°¦Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚v6Æ–6²rÆSÓç°¢6öç7B3ÖRçF&vWBæ6Æ÷6W7B‚ræÖrÖ5¶FFÖÖµÒr“²–b‚2’&WGW&ã°¢6öç7B&÷ƒÖFö7VÖVçBævWDVÆVÖVçD'”–B‚vÖW‡r“²–b‚&÷‚’&WGW&ã°¢6öç7B³Ö2æFF6WBæÖ³°¢–b…öÖW‡³ÓÓÖ²—²öÖW‡³ÖçVÆÃ²&÷‚æ–ææW$…DÔÃÒrs²&WGW&ã²Ğ¢öÖW‡³Ö³°¢6öç7B&6SÖæWrFFR‡FöF”•4ò²uC£r“²&6Rç6WDFFRƒ“°¢6öç7BFwCÖæWrFFR†²²rÓC£r“°¢6öç7BöfcÒ†&6RævWDgVÆÅ–V"‚’×FwBævWDgVÆÅ–V"‚’’£"²†&6RævWDÖöçF‚‚’×FwBævWDÖöçF‚‚’“°¢6öç7B&C×&WFF†öfb“²òòc2ã2ã¢F†RöæÇ’&VÖ–æ–ær6ÆÆW ¢&÷‚æ–ææW$…DÔÃÖÆF—b6Æ73Ò&ÖW‡–â#à¢ÆF—b6Æ73Ò'&WÆ–æRÖöæò#âG·&BæÆ&VÇÒ(	BG·&BæäGÒF’G·&BæäCÓÓÓòrs¢w2wÒ+rG¶f×B„ÖF‚ç&÷VæB‡&BçföÂ’—Ò¶r+rG·&Bæ¶ÒçFôf—†VBƒ—ÒG´ER‚—ÒG·&Bæ×ƒãö+r&W7B7G&V²G·&Bæ×‡ÖF¢rwÓÂöF—cà¢ÆF—b6Æ73Ò&ÖW‡F÷G2#âG·&BæF—2æÖ†CÓæÆ’6Æ73Ò"G¶BægWCòvbs¢†BçG#òwBs¢rr—Ò"F—FÆSÒ"G¶BæGÒ#ãÂö“æ’æ¦ö–â‚rr—ÓÂöF—cà¢ÂöF—cæ°§Ò“°  ¢ò¢ÒÒÒÒÒÒÒÒÒÒc2ã2ã3¢F–V"–âç’–õ’ÆVvVæB(	B—6öÆFR—G2Æ–æRÒÒÒÒÒÒÒÒÒÒ¢ğ¦Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚v6Æ–6²rÆSÓç°¢6öç7B–#ÖRçF&vWBæ6Æ÷6W7B‚ræÆVvVæC¶FF×—%Òr“²–b‚–"’&WGW&ã°¢6öç7B6&C×–"æ6Æ÷6W7B‚ræ6&Br“²–b‚6&B’&WGW&ã°¢6öç7B—#×–"æFF6WBç—#°¢6öç7BÖ&·3Ö6&BçVW'•6VÆV7F÷$ÆÂ‚w7fr¶FF×—%ÒÂæÆVvVæC¶FF×—%Òr“°¢–b†6&BæFF6WBç—6VÃÓÓ×—"—°¢FVÆWFR6&BæFF6WBç—6VÃ°¢Ö&·2æf÷$V6‚†ÓÓæÒæ6Æ74Æ—7Bç&VÖ÷fR‚w6VÅ’r’“°¢ÖVÇ6W°¢6&BæFF6WBç—6VÃ×—#°¢Ö&·2æf÷$V6‚†ÓÓæÒæ6Æ74Æ—7BçFövvÆR‚w6VÅ’rÆÒæFF6WBç—#ÓÓ×—"’“°¢Ğ§Ò“° 