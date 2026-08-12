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
          <text x="32" y="112" font-family="var(--mono)" font-size="7" fill="var(--mutedóŽ|¶‰žËkºwµçA™¥±°ô‰Ù…È ´µµÕÑ•¤ˆø‘íµôð½Ñ•áÐù€ì4(€ô¤ì4(€€¼¨ØÌ¸Ì¸ÄÈäè•¹µ½˜µ±¥¹”€”Ñ…ÌÕÍ•Ñ¼‰”•µ¥ÑÑ•¥¹±¥¹”°Í¼™½ÕÈå•…ÉÌ4(€€€€™¥¹¥Í¡¥¹œÝ¥Ñ¡¥¸„™•ÜÁ½¥¹ÑÌ½˜•… ½Ñ¡•ÈÍÑ…­•¥¹Ñ¼…¸Õ¹É•…‘…‰±”4(€€€€Íµ•…È€ ØÀ¼ÔÜ¥¸Ñ¡”™¥•±É•Á½ÉÐ¤¸½±±•ÐÑ¡•´°¹Õ‘”…Á…ÉÐ°Q!84(€€€€•µ¥ÐƒŠPÑ¡”Í…µ”Á…ÍÌÑ¡”‘¥ÍÑ…¹”¡…ÉÐ¡…ÌÕÍ•Í¥¹”ØÌ¸Ì¸àä¸€¨¼4(€½¹ÍÐ•¹‘1…‰•±Ìõmtì4(€™½È¡½¹ÍÐä½˜å•…ÉÌ¥ì4(€€€½¹ÍÐíÕÉÙ”±•¹‘ôõÕÉÙ•Ímåtì4(€€€±•ÐÁÑÌôœœì4(€€€™½È¡±•ÐôÀíñ•¹í¬ôÈ¥ì4(€€€€€½¹ÍÐàôÈÀ¬¡¼ÌØØ¤¨ÌÀÈ°åäôÄäÀµÕÉÙ•m‘t¨ÄÜÀì4(€€€€€ÁÑÌ¬õ€‘íà¹Ñ½¥á• Ä¥ô°‘íåä¹Ñ½¥á• Ä¥ô€ì4(€€€ô4(€€€½¹ÍÐÕÈõäôôõÑ¡¥Íe•…Èì4(€€€ ¬õ€ñÁ½±å±¥¹”‘…Ñ„µåÈôˆ‘íåôˆÁ½¥¹ÑÌôˆ‘íÁÑÍôˆ™¥±°ô‰¹½¹”ˆÍÑÉ½­”ôˆ‘íeI}=1=IMmåuñðÙ…È ´µµÕÑ•¤ôˆ4(€€€€€€€€ÍÑÉ½­”µÝ¥‘Ñ ôˆ‘íÕÈüÈ¸ÈèÄ¸Åôˆ½Á…¥Ñäôˆ‘íÕÈüÄè¸ÝôˆÍÑÉ½­”µ±¥¹•©½¥¸ô‰É½Õ¹ˆøð½Á½±å±¥¹”ù€ì4(€€€½¹ÍÐ±àôÈÀ¬ ¡•¹´Ä¤¼ÌØØ¤¨ÌÀÈ°±äÈôÄäÀµÕÉÙ•m•¹´Åt¨ÄÜÀì4(€€€•¹‘1…‰•±Ì¹ÁÕÍ ¡íä±±à±±äé±äÈ±ÕÈ±ÁÐé5…Ñ ¹É½Õ¹¡ÕÉÙ•m•¹´Åt¨ÄÀÀ¥ô¤ì4(€€€¥˜¡ÕÈ¤ ¬õ€ñ¥É±”±…ÍÌô‰‰•…½¸ˆàôˆ‘í±áôˆäôˆ‘í±äÉôˆÈôˆÌ¸Èˆ™¥±°ô‰Ù…È ´µ…•¹Ð¤ˆøð½¥É±”ù€ì4(€ô4(€•¹‘1…‰•±Ì¹Í½ÉÐ ¡„±ˆ¤ôù„¹±äµˆ¹±ä¤ì4(€™½È¡±•Ð¤ôÄí¤ñ•¹‘1…‰•±Ì¹±•¹Ñ í¤¬¬¤4(€€€¥˜¡•¹‘1…‰•±Ím¥t¹±äµ•¹‘1…‰•±Ím¤´Åt¹±äðà¤•¹‘1…‰•±Ím¥t¹±äõ•¹‘1…‰•±Ím¤´Åt¹±ä¬àì4(€™½È¡½¹ÍÐ0½˜•¹‘1…‰•±Ì¤4(€€€ ¬õ€ñÑ•áÐ‘…Ñ„µåÈôˆ‘í0¹åôˆàôˆ‘í5…Ñ ¹µ¥¸¡0¹±à¬Ð°ÌÄÈ¤¹Ñ½¥á• Ä¥ôˆäôˆ‘ì¡0¹±ä¬È¸Ô¤¹Ñ½¥á• Ä¥ôˆ™½¹Ðµ™…µ¥±äô‰Ù…È ´µµ½¹¼¤ˆ™½¹ÐµÍ¥é”ôˆÜˆ4(€€€€€€€€€™¥±°ôˆ‘íeI}=1=IMm0¹åuñðÙ…È ´µµÕÑ•¤ôˆ™½¹ÐµÝ•¥¡Ðôˆ‘í0¹ÕÈüÜÀÀèÐÀÁôˆø‘í0¹ÁÑô”ð½Ñ•áÐù€ì4(€ ¬õ€ð½ÍÙœøð½‘¥Øøð½‘¥Øù€ì€€€¼¼ØÌ¸Ì¸ÄÄÈèÍ¡…É”µ½Ù•Ñ¼Ñ¡”¡•…‘•È4(4(€€¼¼¡•…Ñµ…Àè€ÈØÝ••­Ì°Ý••­‘…äÉ…¥°½¸Ñ¡”±•™Ð°µ½¹Ñ¡Ì…É½ÍÌÑ¡”Ñ½À4(€½¹ÍÐ‘•Ñ…¥°õ…±±…åÌ ¤ì4(€ÕÐ ½¹Ìœ¤ì4(€ ¬õ€ñ Èù1…ÍÐ€Øµ½¹Ñ¡Ì‘í¡ÑÌ ¡•…Ðœ°=¹”½±Õµ¸Á•ÈÝ••¬¸¥±±•ÍÅÕ…É•Ì…É”ÑÉ…¥¹•‘…åÌ¸œ°‰½ÕÐÑ¡”€Øµµ½¹Ñ ¡•…Ñµ…Àœ¥ôð½ Èøñ‘¥Ø±…ÍÌô‰…Éˆøñ‘¥Ø±…ÍÌô‰¡•…ÑÝÉ…Àˆø4(€€€€€€€€ñ‘¥Ø±…ÍÌô‰Ý‘É…¥°ˆø‘ílLœ°4œ°Pœ°\œ°Pœ°œ°Lt¹µ…À¡ôù€ñÍÁ…¸ø‘í‘ôð½ÍÁ…¸ù€¤¹©½¥¸ œœ¥ôð½‘¥Øø4(€€€€€€€€ñ‘¥Ø±…ÍÌô‰¡•…Ñ½±Ìˆøñ‘¥Ø±…ÍÌô‰¡•…ÑÍÉ½±°ˆù€ì4(€½¹ÍÐÍÑ…ÉÐÈõ¹•Ü…Ñ”¡Ñ½‘…å%M<¬PÀÀèÀÀœ¤ì4(€ÍÑ…ÉÐÈ¹Í•Ñ…Ñ”¡ÍÑ…ÉÐÈ¹•Ñ…Ñ” ¤µÍÑ…ÉÐÈ¹•Ñ…ä ¤´ÈÔ¨Ü¤ì4(€±•ÐµÉ½Üôœœ°É¥ôœœ°±…ÍÑ4ô´Äì4(€™½È¡±•ÐÜôÀíÜðÈØíÜ¬¬¥ì4(€€€½¹ÍÐ™¥ÉÍÐõ¹•Ü…Ñ”¡ÍÑ…ÉÐÈ¤ì™¥ÉÍÐ¹Í•Ñ…Ñ”¡ÍÑ…ÉÐÈ¹•Ñ…Ñ” ¤­Ü¨Ü¤ì4(€€€½¹ÍÐ´õ™¥ÉÍÐ¹•Ñ5½¹Ñ  ¤ì4(€€€µÉ½Ü¬õ€ñÍÁ…¸±…ÍÌô‰µ±…ˆˆø‘í´„ôõ±…ÍÑ4ý™¥ÉÍÐ¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µULœ±íµ½¹Ñ èÍ¡½ÉÐô¤èœôð½ÍÁ…¸ù€ì4(€€€±…ÍÑ4õ´ì4(€€€É¥¬õ€ñ‘¥Ø±…ÍÌô‰Ý¬ˆù€ì4(€€€™½È¡±•Ð‘ôÀí‘ðÜí‘¬¬¥ì4(€€€€€½¹ÍÐŒõ¹•Ü…Ñ”¡ÍÑ…ÉÐÈ¤ìŒ¹Í•Ñ…Ñ”¡ÍÑ…ÉÐÈ¹•Ñ…Ñ” ¤­Ü¨Ü­‘¤ì4(€€€€€½¹ÍÐ¥Í¼õŒ¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¤ì4(€€€€€½¹ÍÐ™ÕÑÕÉ”õ¥Í¼ùÑ½‘…å%M<ì4(€€€€€É¥¬õ€ñ¤‘…Ñ„µ°ôˆ‘í‘…Ñ•Ì¹¡…Ì¡¥Í¼¤üÈèÁôˆ±…ÍÌôˆ‘í¥Í¼ôôõÑ½‘…å%M<üÑ½‘…äœèœô€‘í™ÕÑÕÉ”ü™ÕÐœèœôˆÑ¥Ñ±”ôˆ‘í¥Í½ôˆøð½¤ù€ì4(€€€ô4(€€€É¥¬õ€ð½‘¥Øù€ì4(€ô4(€ ¬õ€ñ‘¥Ø±…ÍÌô‰µÉ½Üˆø‘íµÉ½Ýôð½‘¥Øøñ‘¥Ø±…ÍÌô‰¡•…Ðˆø‘íÉ¥‘ôð½‘¥Øøð½‘¥Øù€ì4(€ ¬õ€ð½‘¥Øøð½‘¥Øøð½‘¥Øù€ì4(4(€€¼¼‘…åÌÁ•Èµ½¹Ñ ‰…ÉÌ4(€½¹ÍÐµÌõ=‰©•Ð¹•¹ÑÉ¥•Ì¡µ½¹Ñ¡½Õ¹ÑÌ¤¹Í½ÉÐ ¤¹Í±¥” ´ÄÈ¤ì4(€½¹ÍÐ‘…å=™5½¹Ñ ô­Ñ½‘…å%M<¹Í±¥” à¤ì4(€½¹ÍÐ‘…åÍ%¹5½¹Ñ õ¹•Ü…Ñ” ­Ñ¡¥Íe•…È°­µ½¹Ñ¡-•ä¹Í±¥” Ô¤°À¤¹•Ñ…Ñ” ¤ì4(€½¹ÍÐÑÉ…¥¹•‘Q¡¥Ìõµ½¹Ñ¡½Õ¹ÑÍmµ½¹Ñ¡-•åuñðÀì4(€ÕÐ ±…ÍÐØœ¤ì4(€ ¬õ€ñ Èù…åÌ‰äµ½¹Ñ ‘í¡ÑÌ ‘‰´œ°Q¡”‘…Í¡•±¥¹”µ…É­Ì€ÈÀ‘…åÌ¸œ°‰½ÕÐÑ¡”µ½¹Ñ¡±ä¡…ÉÐœ¥ôð½ Èøñ‘¥Ø±…ÍÌô‰…Éˆø4(€€€€€€ñ‘¥Ø±…ÍÌô‰é½½µ¡¥¹ÐˆùÁ¥¹ Ñ¼é½½´ð½‘¥Øø4(€€€€€€ñ‘¥Ø±…ÍÌô‰é½½´ˆ‘…Ñ„µé½½´ø4(€€€€€€ñÍÙœÙ¥•Ý	½àôˆÀ€À€ÌÌÀ€ÄÔÀˆÍÑå±”ô‰Ý¥‘Ñ èÄÀÀ”í¡•¥¡Ðé…ÕÑ¼ˆø4(€€€€€€ñ±¥¹”àÄôˆàˆäÄôˆ‘ìÄÈØ´ÈÀ¼ÌÄ¨ÄÄÉôˆàÈôˆÌÄØˆäÈôˆ‘ìÄÈØ´ÈÀ¼ÌÄ¨ÄÄÉôˆÍÑÉ½­”ô‰Ù…È ´µ±¥¹”¤ˆÍÑÉ½­”µÝ¥‘Ñ ôˆÀ¸ØˆÍÑÉ½­”µ‘…Í¡…ÉÉ…äôˆÈ€Ìˆøð½±¥¹”ø4(€€€€€€ñÑ•áÐàôˆÌÄäˆäôˆ‘ìÄÈà´ÈÀ¼ÌÄ¨ÄÄÉôˆ™½¹Ðµ™…µ¥±äô‰Ù…È ´µµ½¹¼¤ˆ™½¹ÐµÍ¥é”ôˆÜˆ™¥±°ô‰Ù…È ´µµÕÑ•¤ˆøÈÀð½Ñ•áÐù€ì4(€µÌ¹™½É…  ¡m´±¹t±¤¤ôùì4(€€€½¹ÍÐÕÈõ´ôôõµ½¹Ñ¡-•äì4(€€€½¹ÍÐ‰ õ5…Ñ ¹µ…à È±¸¼ÌÄ¨ÄÄÈ¤°àôà­¤¨ÈÔ¸Ôì€€€¼¼ØÌ¸Ì¸ÄÈäèÍÁ…¸€àÀ€´ø€ÄÄÈ°‰…Í•±¥¹”€äÐ€´ø€ÄÈØ4(€€€¥˜¡ÕÈ¥ì€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€¼¼‘…Í¡•½ÕÑ±¥¹”€ô‘…åÌ•±…ÁÍ•°Í¼„Í¡½ÉÐ‰…È¥Í¸Ðµ¥ÍÉ•…4(€€€€€½¹ÍÐ õ‘…å=™5½¹Ñ ¼ÌÄ¨ÄÄÈì4(€€€€€ ¬õ€ñÉ•Ðàôˆ‘íáôˆäôˆ‘ìÄÈØµ¡ôˆÝ¥‘Ñ ôˆÄÜˆ¡•¥¡Ðôˆ‘í¡ôˆÉàôˆÌˆ™¥±°ô‰¹½¹”ˆ4(€€€€€€€€€€€ÍÑÉ½­”ô‰Ù…È ´µ…•¹Ð¤ˆÍÑÉ½­”µÝ¥‘Ñ ôˆÀ¸àˆÍÑÉ½­”µ‘…Í¡…ÉÉ…äôˆÈ€Èˆøð½É•Ðù€ì4(€€€ô4(€€€ ¬õ€ñÉ•Ð±…ÍÌô‰‰…Èˆàôˆ‘íáôˆäôˆ‘ìÄÈØµ‰¡ôˆÝ¥‘Ñ ôˆÄÜˆ¡•¥¡Ðôˆ‘í‰¡ôˆÉàôˆÌˆ™¥±°ô‰Ù…È ´µ…•¹Ð¤ˆ½Á…¥Ñäôˆ‘íÕÈüÄè¸ÔÕôˆøð½É•Ðù€ì4(€€€¥˜¡ÕÈ¥ì4(€€€€€€¼¼ÑÉ…¥¹•½Õ¹ÐÍ¥ÑÌ%9M%Ñ¡”™¥±°ìÑ¡”¹Õµ‰•È…‰½Ù”Ñ¡”‘…Í¡•Ì¥Ì‘…åÌ•±…ÁÍ•4(€€€€€½¹ÍÐ õ‘…å=™5½¹Ñ ¼ÌÄ¨ÄÄÈì4(€€€€€ ¬õ€ñÑ•áÐàôˆ‘íà¬à¸Õôˆäôˆ‘ìÄÈØµ ´ÍôˆÑ•áÐµ…¹¡½Èô‰µ¥‘‘±”ˆ™½¹Ðµ™…µ¥±äô‰Ù…È ´µµ½¹¼¤ˆ™½¹ÐµÍ¥é”ôˆÜˆ™¥±°ô‰Ù…È ´µµÕÑ•¤ˆø‘í‘…å=™5½¹Ñ¡ôð½Ñ•áÐø4(€€€€€€€€€€ñÑ•áÐàôˆ‘íà¬à¸Õôˆäôˆ‘í5…Ñ ¹µ¥¸ ÄÈÌ°ÄÈØµ‰ ¬ä¥ôˆÑ•áÐµ…¹¡½Èô‰µ¥‘‘±”ˆ™½¹Ðµ™…µ¥±äô‰Ù…È ´µµ½¹¼¤ˆ™½¹ÐµÍ¥é”ôˆÜˆ™½¹ÐµÝ•¥¡ÐôˆÜÀÀˆ™¥±°ôˆ™™˜ˆø‘í¹ôð½Ñ•áÐù€ì4(€€€õ•±Í•ì4(€€€€€ ¬õ€ñÑ•áÐàôˆ‘íà¬à¸Õôˆäôˆ‘ìÄÈØµ‰ ´ÍôˆÑ•áÐµ…¹¡½Èô‰µ¥‘‘±”ˆ™½¹Ðµ™…µ¥±äô‰Ù…È ´µµ½¹¼¤ˆ™½¹ÐµÍ¥é”ôˆÜˆ™¥±°ô‰Ù…È ´µµÕÑ•¤ˆø‘í¹ôð½Ñ•áÐù€ì4(€€€ô4(€€€ ¬õ€ñÑ•áÐàôˆ‘íà¬à¸ÕôˆäôˆÄÌäˆÑ•áÐµ…¹¡½Èô‰µ¥‘‘±”ˆ™½¹Ðµ™…µ¥±äô‰Ù…È ´µµ½¹¼¤ˆ™½¹ÐµÍ¥é”ôˆÜˆ™¥±°ôˆ‘íÕÈüÙ…È ´µ…•¹Ð¤œèÙ…È ´µµÕÑ•¤ôˆø‘í´¹Í±¥” Ô¥ôð½Ñ•áÐù€ì4(€ô¤ì4(€ ¬õ€ð½ÍÙœøð½‘¥Øø4(€€€€€€ñ‘¥Ø±…ÍÌô‰Ñ½ÐˆøñÍÁ…¸øñˆø‘íÑÉ…¥¹•‘Q¡¥Íôð½ˆøÑÉ…¥¹•ƒ
Ü€‘í‘…å=™5½¹Ñ µÑÉ…¥¹•‘Q¡¥ÍôÉ•ÍÑ•ð½ÍÁ…¸øñÍÁ…¸ø‘í‘…å=™5½¹Ñ¡ô‘…åÌ¥¹Ñ¼€‘íµ½¹Ñ¡-•ä¹Í±¥” Ô¥ôð½ÍÁ…¸øð½‘¥Øøð½‘¥Øù€ì4(4(€€¼¼µ½¹Ñ¡±ä­´ƒŠPÑ¡”IÕ¸Ñ…ˆ½Ý¹ÌÑ¡”¡…ÉÑÌ¹½ÜìÑ¡¥Ìµ…ÀÍÑ¥±°™••‘ÌÑ¡”4(€€¼¼½µÁ½Í¥Ñ¥½¸½Ù•É±…ä™ÕÉÑ¡•È‘½Ý¸¸4(€½¹ÍÐ­µ	äõíôì4(€™½È¡½¹ÍÐm´±Ùt½˜=‰©•Ð¹•¹ÑÉ¥•Ì¡M¹µ½¹Ñ¡±ä¤¤­µ	åmµtõØ¹­µñðÀì4(€™½È¡½¹ÍÐm±Ùt½˜=‰©•Ð¹•¹ÑÉ¥•Ì¡¹‘…åÌ¤¥ì4(€€€¥˜¡ðõM¹Ñ½Ñ…±Ì¹±…ÍÐ¤½¹Ñ¥¹Õ”ì4(€€€™½È¡½¹ÍÐÌ½˜Ø¹Ü¤¥˜¡Ì¹•àôôôIÕ¸œ¤­µ	åm¹Í±¥” À°Ü¥tô¡­µ	åm¹Í±¥” À°Ü¥uñðÀ¤­Ì¹Üì4(€ô4(4(€€¼¼Ý¡¥ Ý••­‘…åÌå½ÔÍ¡½ÜÕÀƒŠP±…ÍÐ€ÌØÔ‘…åÌ°½¸…¸…‰Í½±ÕÑ”€ÃŠLÄÀÀ”Í…±”4(€½¹ÍÐ}ÝõÝ‘¥ÍÐ ¤ì€€€€€€€€€€€€€€€€€€€€€€€¼¼ØÌ¸Ì¸ÄÄÐè½¹”Í½ÕÉ”°ÍÙœ€¬…É4(€½¹ÍÐÝ‘AÐõ}Ý¹ÁÐì4(€½¹ÍÐÝ‘	•ÍÐõ5…Ñ ¹µ…à ¸¸¹Ý‘AÐ¤ì4(€€¼¨ØÌ¸Ì¸ÐØèÑ¡”…•¹Ðµ…É­ÌQ=dÌÝ••­‘…äƒŠPÑ¡”É½Üå½ÔÉ”ÍÑ…¹‘¥¹œ¥¸ƒŠP4(€€€€¹½ÐÑ¡”ÍÑ…Ñ¥ÍÑ¥…±±äÍÑÉ½¹•ÍÐ½¹”¸Q¡”ÍÑÉ½¹•ÍÐÍÑ¥±°•ÑÌ„ÅÕ¥•Ð4(€€€€…É•Ð…‰½Ù”¥ÑÌ‰…ÈÍ¼Ñ¡”Á…ÑÑ•É¸ÍÑ…åÌÙ¥Í¥‰±”Ý¥Ñ¡½ÕÐ½µÁ•Ñ¥¹œÝ¥Ñ 4(€€€€Ñ½‘…ä™½ÈÑ¡”½¹”±½Õ½±½ÕÈ¸€¡Q¥•Ìè™¥ÉÍÐµ…Ñ Ý¥¹ÌÑ¡”…É•ÐìÑ½‘…ä4(€€€€…±Ý…åÌÝ¥¹ÌÑ¡”…•¹Ð•Ù•¸¥˜Ñ½‘…ä¥Ì…±Í¼Ñ¡”ÍÑÉ½¹•ÍÐ¸¤€¨¼4(€½¹ÍÐÝ‘Q½‘…äõ¹•Ü…Ñ”¡Ñ½‘…å%M<¬PÀÀèÀÀœ¤¹•Ñ…ä ¤ì4(€½¹ÍÐ‰•ÍÑ$õÝ‘AÐ¹¥¹‘•á=˜¡Ý‘	•ÍÐ¤ì4(€ÕÐ ‘‰´œ¤ì4(€ ¬õ€ñ Èù]••­‘…åÌ‘í¡ÑÌ Ýœ°qÔÈÕˆÈµ…É­Ìå½ÕÈÍÑÉ½¹•ÍÐÝ••­‘…ä¸	±Õ”¥ÌÑ½‘…ä¸œ°‰½ÕÐÑ¡”Ý••­‘…ä¡…ÉÐœ¥ôð½ Èøñ‘¥Ø±…ÍÌô‰…Éˆø4(€€€€€€ñÍÙœÙ¥•Ý	½àôˆÀ€À€ÌÌÀ€ÄÔÀˆÍÑå±”ô‰Ý¥‘Ñ èÄÀÀ”í¡•¥¡Ðé…ÕÑ¼ˆù€ì€€€¼¼ØÌ¸Ì¸ÄÈäè€ÄÄãŠHÄÔÀ€¡ØÌ¸Ì¸ÄÄÌ¡…ÕÐ€ÄÐÃŠHÄÄàì…ÐÑ¡…Ð¡•¥¡ÐÑ¡”…É•Ð…¹Ñ¡”€”±…‰•°¡…¹½Ý¡•É”Ñ¼¼¤4(€™½È¡½¹ÍÐœ½˜lÀ°ÈÔ°ÔÀ°ÜÔ°ÄÀÁt¥ì4(€€€½¹ÍÐäôÄÈØµœ¼ÄÀÀ¨ÄÄÌì€€€€¼¼ØÌ¸Ì¸ÄÈäè‰…Í•±¥¹”€äÓŠHÄÈØ°ÍÁ…¸€àÇŠHÄÄÌ4(€€€ ¬õ€ñ±¥¹”àÄôˆÈÐˆäÄôˆ‘íåôˆàÈôˆÌÄØˆäÈôˆ‘íåôˆÍÑÉ½­”ô‰Ù…È ´µ±¥¹”¤ˆÍÑÉ½­”µÝ¥‘Ñ ôˆÀ¸Øˆ€‘íœüÍÑÉ½­”µ‘…Í¡…ÉÉ…äôˆÈ€Ìˆœèœôøð½±¥¹”ø4(€€€€€€€€ñÑ•áÐàôˆÈÄˆäôˆ‘íä¬ÍôˆÑ•áÐµ…¹¡½Èô‰•¹ˆ™½¹Ðµ™…µ¥±äô‰Ù…È ´µµ½¹¼¤ˆ™½¹ÐµÍ¥é”ôˆÜˆ™¥±°ô‰Ù…È ´µµÕÑ•¤ˆø‘íôð½Ñ•áÐù€ì4(€ô4(€lLœ°4œ°Pœ°\œ°Pœ°œ°Lt¹™½É…  ¡±…ˆ±¤¤ôùì4(€€€½¹ÍÐÀõÝ‘AÑm¥t°Ñ½‘…äõ¤ôôõÝ‘Q½‘…ä°‰•ÍÐõ¤ôôõ‰•ÍÑ$ì4(€€€½¹ÍÐ‰ õ5…Ñ ¹µ…à È±À¨ÄÄÌ¤°àôÌÈ­¤¨ÐÄì4(€€€ ¬õ€ñÉ•Ð±…ÍÌô‰‰…ÈÝµ½°ˆàôˆ‘íáôˆäôˆ‘ìÄÈØµ‰¡ôˆÝ¥‘Ñ ôˆÈØˆ¡•¥¡Ðôˆ‘í‰¡ôˆÉàôˆÐˆ4(€€€€€€€€€™¥±°ôˆ‘íÑ½‘…äüÙ…È ´µ…•¹Ð¤œèÙ…È ´µ…•¹Ðµ‘¥´¤ôˆ½Á…¥Ñäôˆ‘íÑ½‘…äüÄè¸Ùôˆøð½É•Ðù€ì4(€€€€¼¨ØÌ¸Ì¸ÄÈäè½¹”ÍÑ…¬°…±Ý…åÌÑ¡”Í…µ”½É‘•ÈƒŠP‰…È°Ñ¡•¸€”€Ð…‰½Ù”¥Ð°4(€€€€€€Ñ¡•¸Ñ¡”…É•Ð€ÄÄ…‰½Ù”Ñ¡…Ð¸Q¡”½±½‘”‰É…¹¡•Ñ¡”€”Á½Í¥Ñ¥½¸½¸4(€€€€€€Ñ½‘…ä½‰•ÍÐ…¹ÁÕÐÑ¡”…É•Ð…Ð„™¥á•€à…‰½Ù”Ñ¡”‰…È°Í¼„‘…äÑ¡…Ð4(€€€€€€Ý…Ì	=Q Ñ½‘…ä…¹ÍÑÉ½¹•ÍÐ€¡QÕ”°¥¸Ñ¡”™¥•±É•Á½ÉÐ¤‘É•ÜÑ¡•´€Ð4(€€€€€€Õ¹¥ÑÌ…Á…ÉÐ°½¸Ñ½À½˜•… ½Ñ¡•È¸A½Í¥Ñ¥½¸¹¼±½¹•È‘•Á•¹‘Ì½¸4(€€€€€€Ý¡¥ ™±…Ì…É”Í•Ð°Í¼¹¼½µ‰¥¹…Ñ¥½¸…¸½±±¥‘”¸€¨¼4(€€€½¹ÍÐÁÑdôÄÈØµ‰ ´Ðì4(€€€ ¬õ€ñÑ•áÐàôˆ‘íà¬ÄÍôˆäôˆ‘íÁÑeôˆÑ•áÐµ…¹¡½Èô‰µ¥‘‘±”ˆ™½¹Ðµ™…µ¥±äô‰Ù…È ´µµ½¹¼¤ˆ™½¹ÐµÍ¥é”ôˆàˆ™¥±°ôˆ‘íÑ½‘…äüÙ…È ´µ…•¹Ð¤œèÙ…È ´µµÕÑ•¤ôˆ™½¹ÐµÝ•¥¡Ðôˆ‘íÑ½‘…äüÜÀÀèÐÀÁôˆø‘í5…Ñ ¹É½Õ¹¡À¨ÄÀÀ¥ô”ð½Ñ•áÐù€ì4(€€€¥˜¡‰•ÍÐ¤ ¬õ€ñÑ•áÐàôˆ‘íà¬ÄÍôˆäôˆ‘íÁÑd´ÄÅôˆÑ•áÐµ…¹¡½Èô‰µ¥‘‘±”ˆ™½¹Ðµ™…µ¥±äô‰Ù…È ´µµ½¹¼¤ˆ™½¹ÐµÍ¥é”ôˆäˆ™¥±°ô‰Ù…È ´µµÕÑ•¤ˆûŠZÈð½Ñ•áÐù€ì4(€€€ ¬õ€ñÑ•áÐàôˆ‘íà¬ÄÍôˆäôˆÄÐÄˆÑ•áÐµ…¹¡½Èô‰µ¥‘‘±”ˆ™½¹Ðµ™…µ¥±äô‰Ù…È ´µµ½¹¼¤ˆ™½¹ÐµÍ¥é”ôˆäˆ™¥±°ôˆ‘íÑ½‘…äüÙ…È ´µ¡…±¬¤œèÙ…È ´µµÕÑ•¤ôˆ™½¹ÐµÝ•¥¡Ðôˆ‘íÑ½‘…äüÜÀÀèÐÀÁôˆø‘í±…‰ôð½Ñ•áÐù€ì4(€ô¤ì4(€ ¬õ€ð½ÍÙœøñ‘¥Ø±…ÍÌô‰¹½Ñ”ˆø”½˜•… Ý••­‘…äÑÉ…¥¹•°±…ÍÐ€ÌØÔ‘…åÌƒ
ÜƒŠZÈå½ÕÈÍÑÉ½¹•ÍÐð½‘¥Øøð½‘¥Øù€ì4(4(€€¼¼µ½¹Ñ µ‰äµµ½¹Ñ ½µÁ½Í¥Ñ¥½¸ƒŠPÑ¡”Í¡••ÐÌ€‰]¡¥ Á…ÉÐ…´$µ¥ÍÍ¥¹œ½ÕÐüˆ¡…ÉÐ4(€€¼¨ØÌ¸Ä¸ÄÌèÑ¡”ÍÑ…­•µµ½¹Ñ¡Ì¡…ÉÐ…¹Ñ¡”É…‘…È…É”½¹”€¡MÕ¹©•”Ì4(€€€€Ù•É‘¥Ðè½¹”¹••‘•ÍÉ½±±¥¹œ°Ñ¡”½Ñ¡•ÈÁÉ½µÁÑ•¹½Ñ¡¥¹œ¤¸I•Á±…•‰ä4(€€€€ÑÝ¼ÍÉ½±°µ™É•”Ù¥•ÝÌÑ¡…Ð•… …¹ÍÝ•È=9ÅÕ•ÍÑ¥½¸¸€¨¼4(4(€€¼¨€´´´€‰!…Ù”$­•ÁÐÍ¡½Ý¥¹œÕÀüˆƒŠP•Ù•Éäµ½¹Ñ •Ù•È°½¹”ÍÉ••¸€´´´€¨¼4(€½¹ÍÐ}õÉ¥‘…Ñ„ ¤ì4(€½¹ÍÐµ…åÌõ}¹µ…åÌ°äÀõ}¹äÀ°äÄõ}¹äÄ°5…àõ}¹µ…à°´Àõ}¹´À°µ9½Üõ}¹µ9½Üì4(€ÕÐ Ýœ¤ì4(€ ¬õ€ñ È¥ô‰Í•A…ÉÑÌˆùÙ•Éäµ½¹Ñ ‘í¡ÑÌ µÉ¥œ°…É­•Èµ•…¹Ìµ½É”‘…åÌ¸Q…À„µ½¹Ñ Ñ¼½Á•¸¥Ð¸œ°‰½ÕÐÑ¡”µ½¹Ñ É¥œ¥ôð½ Èøñ‘¥Ø±…ÍÌô‰…Éˆø4(€€€€€€ñ‘¥Ø±…ÍÌô‰µÉ¥ˆøñÍÁ…¸øð½ÍÁ…¸ø‘ì)55))M=9œ¹ÍÁ±¥Ð œœ¤¹µ…À¡Œôù€ñÍÁ…¸±…ÍÌô‰µœµ ˆø‘íôð½ÍÁ…¸ù€¤¹©½¥¸ œœ¥õ€ì4(€™½È¡±•ÐäõäÀíäðõäÄíä¬¬¥ì4(€€€ ¬õ€ñÍÁ…¸±…ÍÌô‰µœµäµ½¹¼ˆøœ‘íMÑÉ¥¹œ¡ä¤¹Í±¥” È¥ôð½ÍÁ…¸ù€ì4(€€€™½È¡±•Ð´ôÄí´ðôÄÈí´¬¬¥ì4(€€€€€½¹ÍÐ¬õ€‘íåô´‘íMÑÉ¥¹œ¡´¤¹Á…‘MÑ…ÉÐ È°œÀœ¥õ€ì4(€€€€€½¹ÍÐ¸õµ…åÍm­uñðÀì4(€€€€€½¹ÍÐ½ÕÐõ¬ñ´Áññ¬ùµ9½Üì4(€€€€€½¹ÍÐ„õ5…Ñ ¹É½Õ¹¡µ±Á¡„¡¸±5…à±¬ôôõµ9½Ü¤¨ÄÀÀ¤ì4(€€€€€ ¬õ€ñÍÁ…¸±…ÍÌô‰µœµŒµ½¹¼€‘í¬ôôõµ9½ÜüÕÈœèœôˆ€‘í½ÕÐüœœé‘…Ñ„µµ¬ôˆ‘í­ô‰ôÍÑå±”ôˆ‘í¸ý‰…­É½Õ¹é½±½Èµµ¥à¡¥¸ÍÉˆ°Ù…È ´µ…•¹Ð¤€‘í…ô”°ÑÉ…¹ÍÁ…É•¹Ð¥€èœôˆø‘í½ÕÐüœœè¡¹ñðŸ
Üœ¥ôð½ÍÁ…¸ù€ì4(€€€ô4(€ô4(€ ¬õ€ð½‘¥Øøñ‘¥Ø¥ô‰µ•áÀˆøð½‘¥Øø4(€€€€€€ð½‘¥Øù€ì€€€¼¼ØÌ¸Ì¸ÄÄÈèÍ¡…É”µ½Ù•Ñ¼Ñ¡”¡•…‘•È4(4(€ÕÐ •´œ¤ì4(€ ¬õ½¹Í¥ÍÑ•¹åI…•M•Ñ¥½¸ ¤ì4(€ÕÐ ½¹ÍÉ…”œ¤ì4(€ ¬õµ½¹Ñ¡±åA…•M•Ñ¥½¸ ¤ì4(€ÕÐ µÁ…”œ¤ì4(€€¼¨ØÌ¸Ì¸ÄÄÄè€‰1…ÍÐ€ÌÀ‘…åÌ°ÙÌå½ÕÈÕÍÕ…°ˆÉ•µ½Ù•½¸Ñ¡”µ…­•ÈÌ…±°ƒŠP¹¼4(€€€€Ù…±Õ”™½Õ¹¥¸¥Ð¸%ÑÌ•¹Ñ¥É”±…ÍÐÌÀ½‘É¥™Ð½µÁÕÑ…Ñ¥½¸Ý•¹ÐÝ¥Ñ ¥Ðì4(€€€€¹½Ñ¡¥¹œ•±Í”É•…Ñ¡½Í”¸€¨¼4(€ ¬õ‰Ý…É ¤ì€€€€€€€€€€€€€€€€€€€€€€€¼¼ØÌ¸Ì¸Øäèå½Ô°‰•™½É”Ñ¡”Á…ÉÐµ‰äµÁ…ÉÐ‘É¥™Ð4(€ÕÐ ÝÐœ¤ì4(4(€€¼¨ØÌ¸Ì¸ÄÌÀè€‰I•Á½ÉÐ…ÉˆIQUI9L°‰ÕÐ¹½Ð…ÌÑ¡”ØÌ¸Ì¸ÄÄÄÍ•Ñ¥½¸Ñ¡…Ð4(€€€€Ý…ÌÉ•µ½Ù•¸Q¡…Ð½¹”Ý…Ì„µ½¹Ñ µÍÑ•ÁÁ•ÈÝ¥Ñ ¥ÑÌ½Ý¸Í¡…É”…É¸Q¡¥Ì4(€€€€½¹”¥ÌÑ¡”…ÁÀÌÍ¥¹±”Í¡…É”ÍÕÉ™…”èÉ½Ñ…Ñ”Ñ¼Ñ¡”…Éå½ÔÝ…¹Ð°Ñ¡•¸4(€€€€Í•¹¥Ð¸Ù•ÉäÁ•ÈµÍ•Ñ¥½¸Í¡…É”‰ÕÑÑ½¸¥Ì½¹”¥¸™…Ù½ÕÈ½˜¥Ð¸€¨¼4(€ ¬õ€ñ È¥ô‰Í•I•Á½ÉÐˆùI•Á½ÉÐ…É‘í¡ÑÌ É•Àœ°MÝ¥Á”Ñ¼„…É°Ñ¡•¸Í¡…É”¥Ð…Ì…¸¥µ…”¸œ°‰½ÕÐÑ¡”É•Á½ÉÐ…Éœ¥ôð½ Èø4(€€€€€€ñ‘¥Ø±…ÍÌô‰…ÉÉ•Á…Éˆ¥ô‰É•Á…Éˆø4(€€€€€€€€ñ‘¥Ø±…ÍÌô‰É•Á¹…Øˆø4(€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰É•Á…Èˆ¥ô‰É•ÁAÉ•Øˆ…É¥„µ±…‰•°ô‰AÉ•Ù¥½ÕÌ…ÉˆûŠäð½‰ÕÑÑ½¸ø4(€€€€€€€€€€ñ‘¥Ø±…ÍÌô‰É•ÁÑÑ°ˆ¥ô‰É•ÁQÑ°ˆø™¹‰ÍÀìð½‘¥Øø4(€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰É•Á…Èˆ¥ô‰É•Á9•áÐˆ…É¥„µ±…‰•°ô‰9•áÐ…ÉˆûŠèð½‰ÕÑÑ½¸ø4(€€€€€€€€ð½‘¥Øø4(€€€€€€€€ñ‘¥Ø±…ÍÌô‰É•ÁÑ¡Õµ‰ÝÉ…Àˆøñ¥µœ¥ô‰É•ÁQ¡Õµˆˆ…±Ðôˆˆ±…ÍÌô‰É•ÁÑ¡Õµˆˆøð½‘¥Øø4(€€€€€€€€ñ‘¥Ø±…ÍÌô‰¹½Ñ”É•Á‘½ÑÌˆ¥ô‰É•Á½ÑÌˆøð½‘¥Øø4(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸ˆ¥ô‰É•ÁM¡…É”ˆùM¡…É”…Ì¥µ…”ð½‰ÕÑÑ½¸ø4(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸¡½ÍÐˆ¥ô‰É•Á±°ˆÍÑå±”ô‰µ…É¥¸èáÁà€À€ÀˆùM…Ù”…±°€‘íÍ¡…É•…É‘Ì ¤¹±•¹Ñ¡ôð½‰ÕÑÑ½¸ø4(€€€€€€ð½‘¥Øù€ì4(€ÕÐ É•Àœ¤ì4(€€¼¼Í•Ñ¥½¹Ì•µ¥Ð¥¸½¹”‘•±…É•½É‘•È€¡ØÌ¸Ì¸ÄÄÄ¤4(€ €ô}L¹­Á¥Ì€¬}L¹É¡åÑ¡´€¬}L¹Éè€¬}L¹Áµ¥à€¬}L¹µŒ€¬}L¹½¹ÍÉ…”€¬}L¹µÁ…”€¬}L¹ÝÐì(4(€€¼¼Ñ¡”Ý¡½±”IÕ¸ÍÑ½Éä±¥Ù•Ì¡•É”¹½Ü€¡Ý…Ì¥ÑÌ½Ý¸Ñ…ˆ¥¸ØÈ¸ÀÐƒŠPÉ•Ù•ÉÑ•¤4(€ ¬õÉÕ¹MÑ…ÑÍ!Q50ÈÄÜ ¤ì(4(€€¼¼É•½É‘ÌƒŠP­•ÁÐ°‰ÕÐ‘•µ½Ñ•‰•±½ÜÑ¡”‘…åÌÍÑ½Éä4(€¥˜¡™…±Í”¤ ¬õ€ñ È¥ô‰Í•I•½É‘ÌˆùI•½É‘Ìð½ Èù€ì(€¥˜¡™…±Í”¤™½È¡½¹ÍÐÁ…ÉÐ½˜=‰©•Ð¹­•åÌ¡M¹…Ñ…±½œ¤¥ì(€€€¥˜¡Á…ÉÐôôôIÕ¸œ¤½¹Ñ¥¹Õ”ì4(€€€½¹ÍÐÉ½ÝÌõ…Ñ½È¡Á…ÉÐ¤¹µ…À¡”ôùm”±ÁÉ½È¡”¤±•áQ¥•È¡”¥t¤¹™¥±Ñ•È ¡l±Át¤ôùÀ¹µÜøÀ¤¹Í½ÉÐ ¡„±ˆ¤ôù‰lÅt¹µÜµ…lÅt¹µÜ¤ì4(€€€¥˜ …É½ÝÌ¹±•¹Ñ ¤½¹Ñ¥¹Õ”ì4(€€€½¹ÍÐ½É”õÉ½ÝÌ¹™¥±Ñ•È¡ÈôùÉlÉtôôô½Ñ¼œ¤°½Ñ¡•ÈõÉ½ÝÌ¹™¥±Ñ•È¡ÈôùÉlÉt„ôô½Ñ¼œ¤ì4(€€€ ¬õ€ñ È±…ÍÌô‰ÅÕ¥•ÐˆÍÑå±”ô‰µ…É¥¸µÑ½ÀèÄÙÁàˆø‘íÁ…ÉÑôð½ Èù€ì4(€€€¥˜¡½É”¹±•¹Ñ ¥ì4(€€€€€ ¬õ€ñÑ…‰±”±…ÍÌô‰É•Œµ½É”ˆøñÑÈøñÑ ù½É”•á•É¥Í•Ìð½Ñ øñÑ ÍÑå±”ô‰Ñ•áÐµ…±¥¸éÉ¥¡ÐˆùQ½À€ ‘íT ¥ô¤ð½Ñ øð½ÑÈù€ì4(€€€€€½É”¹™½É…  ¡m”±Át¤ôùí ¬õ€ñÑÈøñÑøñˆø‘í•ôð½ˆøð½ÑøñÑ±…ÍÌô‰¸ˆøñˆø‘íÝ¥ÍÀ¡À¹µÜ¥ôð½ˆøƒ\€‘íÀ¹µÝÉô4(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰Ñµ½Ù”ˆ‘…Ñ„µÑ¥•Èµ•àôˆ‘í•ôˆ‘…Ñ„µÑ¥•ÈµÑ¼ô‰½Ñ¡•ÈˆÑ¥Ñ±”ô‰5½Ù”Ñ¼=Ñ¡•ÈˆûŠLð½‰ÕÑÑ½¸øð½Ñøð½ÑÈù€íô¤ì4(€€€€€ ¬õ€ð½Ñ…‰±”ù€ì4(€€€ô4(€€€¥˜¡½Ñ¡•È¹±•¹Ñ ¥ì4(€€€€€ ¬õ€ñÑ…‰±”±…ÍÌô‰É•Œµ½Ñ¡•ÈˆøñÑÈøñÑ ù=Ñ¡•Èð½Ñ øñÑ øð½Ñ øð½ÑÈù€ì4(€€€€€½Ñ¡•È¹™½É…  ¡m”±Át¤ôùí ¬õ€ñÑÈøñÑø‘í•ôð½ÑøñÑ±…ÍÌô‰¸ˆø‘íÝ¥ÍÀ¡À¹µÜ¥ôƒ\€‘íÀ¹µÝÉô4(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰Ñµ½Ù”ˆ‘…Ñ„µÑ¥•Èµ•àôˆ‘í•ôˆ‘…Ñ„µÑ¥•ÈµÑ¼ô‰½É”ˆÑ¥Ñ±”ô‰5½Ù”Ñ¼½É”ˆûŠDð½‰ÕÑÑ½¸øð½Ñøð½ÑÈù€íô¤ì4(€€€€€ ¬õ€ð½Ñ…‰±”ù€ì4(€€€ô4(€ô4(4(€ ¬õ}L¹É•Àì€€€€€€€€€€€€€€€€€€€€€€€€€¼¼ØÌ¸Ì¸ÄÌÀèÑ¡”•á¥ÐƒŠPå½Ô¡…Ù”Í••¸Ñ¡”¹Õµ‰•ÉÌ°¡•É”¥ÌÑ¡”É••¥ÁÐ4(4(€ ¬õ€ñ ÈùM•ÑÑ¥¹Ìð½ Èø4(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸¡½ÍÐˆ¥ô‰Í•ÑÑ¥¹Í	Ñ¸ˆûŠjg¾â8M•ÑÑ¥¹Ì°…½Õ¹Ð€™…µÀìÍå¹Œð½‰ÕÑÑ½¸ø4(€€€€€€ñ‘¥Ø±…ÍÌô‰¹½Ñ”ˆÍÑå±”ô‰Ñ•áÐµ…±¥¸é•¹Ñ•Èˆø‘íÍ•ÍÍ¥½¸ýM¥¹•¥¸…Ì€‘íÍ•ÍÍ¥½¸¹ÕÍ•È¹•µ…¥±ñðŸŠPõ€è9½ÐÍ¥¹•¥¸ƒŠP‘…Ñ„¥Ì½¸Ñ¡¥Ì‘•Ù¥”½¹±äôƒ
Ü€‘íAA}YIM%=9ôð½‘¥Øù€ì4(€€ œÙ¥•Üœ¤¹¥¹¹•É!Q50õ ì4(€¥˜¡ÑåÁ•½˜Á…¥¹ÑI•Á…Éôôô™Õ¹Ñ¥½¸œ¤Á…¥¹ÑI•Á…É ¤ì€€€¼¼ØÌ¸Ì¸ÄÌÀè™¥±°Ñ¡”É•Á½ÉÐ…ÉÁÉ•Ù¥•Ü4)ô4(4(4(¼¨€´´´´´´´´´´ÌèÑ…À„É¥µ½¹Ñ °¥Ð½Á•¹Ì¥¸Á±…”€´´´´´´´´´´€¨¼4)±•Ð}µ•áÁ,õ¹Õ±°ì4)‘½Õµ•¹Ð¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ±”ôùì4(€½¹ÍÐŒõ”¹Ñ…É•Ð¹±½Í•ÍÐ œ¹µœµm‘…Ñ„µµ­tœ¤ì¥˜ …Œ¤É•ÑÕÉ¸ì4(€½¹ÍÐ‰½àõ‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% µ•áÀœ¤ì¥˜ …‰½à¤É•ÑÕÉ¸ì4(€½¹ÍÐ¬õŒ¹‘…Ñ…Í•Ð¹µ¬ì4(€¥˜¡}µ•áÁ,ôôõ¬¥ì}µ•áÁ,õ¹Õ±°ì‰½à¹¥¹¹•É!Q50ôœœìÉ•ÑÕÉ¸ìô4(€}µ•áÁ,õ¬ì4(€½¹ÍÐ‰…Í”õ¹•Ü…Ñ”¡Ñ½‘…å%M<¬PÀÀèÀÀœ¤ì‰…Í”¹Í•Ñ…Ñ” Ä¤ì4(€½¹ÍÐÑÐõ¹•Ü…Ñ”¡¬¬œ´ÀÅPÀÀèÀÀœ¤ì4(€½¹ÍÐ½™˜ô¡‰…Í”¹•ÑÕ±±e•…È ¤µÑÐ¹•ÑÕ±±e•…È ¤¤¨ÄÈ¬¡‰…Í”¹•Ñ5½¹Ñ  ¤µÑÐ¹•Ñ5½¹Ñ  ¤¤ì4(€½¹ÍÐÉõÉ•Á…Ñ„¡½™˜¤ì€€€¼¼ØÌ¸Ì¸ÄÄÄèÑ¡”½¹±äÉ•µ…¥¹¥¹œ…±±•È4(€‰½à¹¥¹¹•É!Q50õ€ñ‘¥Ø±…ÍÌô‰µ•áÁ%¸ˆø4(€€€€ñ‘¥Ø±…ÍÌô‰É•Á±¥¹”µ½¹¼ˆø‘íÉ¹±…‰•±ôƒŠP€‘íÉ¹¹ô‘…ä‘íÉ¹¹ôôôÄüœœèÌôƒ
Ü€‘í™µÐ¡5…Ñ ¹É½Õ¹¡É¹Ù½°¤¥ô­œƒ
Ü€‘íÉ¹­´¹Ñ½¥á• Ä¥ô€‘íT ¥ô‘íÉ¹µàøÄý€ƒ
Ü‰•ÍÐÍÑÉ•…¬€‘íÉ¹µáõ‘€èœôð½‘¥Øø4(€€€€ñ‘¥Ø±…ÍÌô‰µ•áÁ½ÑÌˆø‘íÉ¹‘…åÌ¹µ…À¡ôù€ñ¤±…ÍÌôˆ‘í¹™ÕÐü˜œè¡¹ÑÈüÐœèœœ¥ôˆÑ¥Ñ±”ôˆ‘í¹‘ôˆøð½¤ù€¤¹©½¥¸ œœ¥ôð½‘¥Øø4(€€ð½‘¥Øù€ì4)ô¤ì4(4(4(¼¨€´´´´´´´´´´ØÌ¸Ì¸ÄÌèÑ…À„å•…È¥¸…¹äe½d±••¹ƒŠP¥Í½±…Ñ”¥ÑÌ±¥¹”€´´´´´´´´´´€¨¼4)‘½Õµ•¹Ð¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ±”ôùì4(€½¹ÍÐåˆõ”¹Ñ…É•Ð¹±½Í•ÍÐ œ¹±••¹Äm‘…Ñ„µåÉtœ¤ì¥˜ …åˆ¤É•ÑÕÉ¸ì4(€½¹ÍÐ…Éõåˆ¹±½Í•ÍÐ œ¹…Éœ¤ì¥˜ ……É¤É•ÑÕÉ¸ì4(€½¹ÍÐåÈõåˆ¹‘…Ñ…Í•Ð¹åÈì4(€½¹ÍÐµ…É­Ìõ…É¹ÅÕ•ÉåM•±•Ñ½É±° ÍÙœm‘…Ñ„µåÉt°€¹±••¹Äm‘…Ñ„µåÉtœ¤ì4(€¥˜¡…É¹‘…Ñ…Í•Ð¹åÍ•°ôôõåÈ¥ì4(€€€‘•±•Ñ”…É¹‘…Ñ…Í•Ð¹åÍ•°ì4(€€€µ…É­Ì¹™½É… ¡´ôù´¹±…ÍÍ1¥ÍÐ¹É•µ½Ù” Í•±dœ¤¤ì4(€õ•±Í•ì4(€€€…É¹‘…Ñ…Í•Ð¹åÍ•°õåÈì4(€€€µ…É­Ì¹™½É… ¡´ôù´¹±…ÍÍ1¥ÍÐ¹Ñ½±” Í•±dœ±´¹‘…Ñ…Í•Ð¹åÈôôõåÈ¤¤ì4(€ô4)ô¤ì4(