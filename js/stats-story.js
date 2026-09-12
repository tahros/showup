/* v4.5.0 — connected workout history and pinned multi-year comparisons.
   Installs before first render; never mutates profile or workout records. */
(()=>{
/* Weight-first daily plate columns. */
const reviewSvg=partMixSvg,reviewAxis=pmixAxisSvg,reviewRender=renderStats;
let reviewSelected=null;
partMixSvg=days=>{
 const markup=reviewSvg(days),doc=new DOMParser().parseFromString(markup,'text/html'),svg=doc.querySelector('svg');if(!svg)return markup;
 if(PMIX_MODE==='weight'){
  const scale=(PMIX_BASE-PMIX_TOP)/pmixNiceMax(pmixMax(partMix(days,PMIX_MODE)),PMIX_MODE),quantum=isLb()?500:250;   /* v4.5.3: the SAME rounded top the axis prints, or this overlay draws past the gridlines */
  svg.querySelectorAll('.pmixseg').forEach(el=>{
   const x=+el.getAttribute('x'),y=+el.getAttribute('y'),w=+el.getAttribute('width'),h=+el.getAttribute('height'),step=quantum*scale;
   for(let bottom=y+h;bottom>y+.0001;bottom-=step){const height=Math.min(step,bottom-y),plate=document.createElementNS('http://www.w3.org/2000/svg','rect');for(const [k,v]of Object.entries({class:'pmixplate'+(el.classList.contains('latest')?' latest':''),x,y:bottom-height,width:w,height:Math.max(.01,height-Math.min(1.1,height*.34))   /* v4.5.4: the gap between plates was up to .45px -- a hairline that vanished on a phone. A third of the plate, capped at 1.1px, so a stack reads as plates rather than a bar. */,rx:Math.min(1.2,height/2),fill:el.getAttribute('fill'),'data-plate-unit':quantum,'data-pt':el.getAttribute('data-pt')}))plate.setAttribute(k,v);el.parentNode.insertBefore(plate,el);}el.remove();
  });
 }const rows=partMix(days,PMIX_MODE);svg.querySelectorAll('.pmixcol').forEach(c=>{const date=rows[+c.dataset.col]?.d;if(date){c.setAttribute('tabindex','0');c.setAttribute('role','button');c.setAttribute('aria-label',new Date(date+'T00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}));}});
 // Scale plotted geometry only. Text is rendered at native 11px, never stretched.
 svg.querySelectorAll('text').forEach(t=>t.remove());
 /* v4.5.3: this compact renderer squashed the plot into a FIXED 164-high box
   while the plot's own height is PMIX_H. When PMIX_H grew the box did not, so
   the full-height column targets drew past the bottom. Both follow PMIX_H now:
   the plot area keeps its share of the box and the box keeps its proportion. */
 /* at least as tall as the plot it contains: the column targets run the full
    PMIX_BASE and a shorter box puts them past its own bottom edge. This is
    also where the height the legend gave back actually lands. */
 const PMIXC_H=Math.max(PMIX_BASE+16,Math.round(PMIX_H*0.9)), PMIXC_PLOT=Math.round(PMIXC_H*0.52);
 const ns='http://www.w3.org/2000/svg',g=document.createElementNS(ns,'g'),scale=PMIXC_PLOT/(PMIX_BASE-PMIX_TOP);
 g.setAttribute('transform',`translate(0 ${34-PMIX_TOP*scale}) scale(1 ${scale})`);
 [...svg.children].filter(e=>e.tagName.toLowerCase()!=='defs').forEach(e=>g.append(e));svg.append(g);
 rows.forEach((r,i)=>{const x=8+i*PMIX_COLW+(PMIX_COLW-2.5)/2,t=document.createElementNS(ns,'text');for(const [k,v]of Object.entries({x,y:PMIXC_H-38,transform:`rotate(-90 ${x} ${PMIXC_H-38})`,'text-anchor':'end','font-family':'var(--mono)','font-size':11,fill:'var(--muted)'}))t.setAttribute(k,v);t.textContent=(+r.d.slice(5,7))+'/'+(+r.d.slice(8,10));svg.append(t);});
 svg.setAttribute('viewBox',`0 0 ${svg.getAttribute('width')} ${PMIXC_H}`);svg.setAttribute('height',String(PMIXC_H));svg.style.height=PMIXC_H+'px';svg.setAttribute('preserveAspectRatio','xMinYMin meet');return svg.outerHTML;
};
/* v4.5.4: THIS OVERRODE THE REAL AXIS. stats.js grew pmixNiceMax so the ticks
   land on round numbers, and this copy -- which the review card actually uses
   -- kept computing max/4 from the RAW max. The maker went on seeing
   8.7k / 17k / 26k / 35k while the suite proved the rounded version worked,
   because nothing on his screen was running it.
   It also hard-coded a 164-high box and 21.5px tick spacing while the plot
   beside it follows PMIX_H, so the ticks drifted from the gridlines they name.
   Same rounded max, same geometry, same type as the legend. */
pmixAxisSvg=()=>{
  const max=pmixNiceMax(pmixMax(partMix(PMIX_DAYS,PMIX_MODE)),PMIX_MODE);
  const H=Math.max(PMIX_BASE+16,Math.round(PMIX_H*0.9)), plot=Math.round(H*0.52);
  const scale=plot/(PMIX_BASE-PMIX_TOP), base=PMIX_BASE*scale+(34-PMIX_TOP*scale), top=PMIX_TOP*scale+(34-PMIX_TOP*scale);
  return `<svg class="pmixaxis" width="42" height="${H}" viewBox="0 0 42 ${H}">`+
    Array.from({length:5},(_,i)=>{
      const y=base-(i/4)*(base-top);
      return `<text x="38" y="${(y+3.5).toFixed(1)}" text-anchor="end" font-family="var(--body)" font-size="11" fill="var(--muted)">${pmixFmtV(max*i/4)}</text>`;
    }).join('')+'</svg>';
};
pmixSetFocus=()=>{};
function reviewDay(date){
 reviewSelected=date;const el=document.getElementById('review-day');if(!date||!el)return;
 const m=plateMetrics(DB.days[date]);el.innerHTML='<strong>'+new Date(date+'T00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+'</strong><span>'+plateNumber(m.kg)+' '+U()+' · '+m.sets+' sets</span>';
 const rows=partMix(PMIX_DAYS,PMIX_MODE);document.querySelectorAll('.pmixcol').forEach(c=>{const selected=rows[+c.dataset.col]?.d===date;c.classList.toggle('latest',selected);c.setAttribute('tabindex',selected?'0':'-1');c.setAttribute('aria-pressed',String(selected));c.querySelectorAll('.pmixplate').forEach(p=>p.classList.toggle('latest',selected));});
 if(document.querySelector('.work-combined'))updateWork(date);
}
function reviewDecorate(){
 const root=document.getElementById('view');root.classList.add('review-stats');const box=document.getElementById('pmixWrap');if(box){const card=box.closest('.card');
 const key=document.createElement('div');key.className='review-scale';key.textContent=PMIX_MODE==='weight'?'One plate · '+(isLb()?'500 lb':'250 kg'):'One block · one set';card.querySelector('.pmixhead').prepend(key);
 const receipt=document.createElement('div');receipt.id='review-day';receipt.setAttribute('aria-live','polite');card.querySelector('.pmixbox').after(receipt);
 box.addEventListener('keydown',e=>{const c=e.target.closest('.pmixcol');if(!c||!['Enter',' ','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const index=+c.dataset.col+(e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0),date=partMix(PMIX_DAYS,PMIX_MODE)[index]?.d;if(date){reviewDay(date);const next=box.querySelector('[data-col="'+index+'"]');next?.focus({preventScroll:true});next?.scrollIntoView?.({block:'nearest',inline:'nearest'});}});
 card.querySelector('.pmixlgd').setAttribute('aria-label','Body-part colors');card.querySelectorAll('.pmixlgd button').forEach(b=>{const span=document.createElement('span');span.innerHTML=b.innerHTML;span.style.cssText=b.style.cssText;b.replaceWith(span);});
 let down;box.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY},{passive:true});box.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;const rows=partMix(PMIX_DAYS,PMIX_MODE),i=Math.floor((e.clientX-box.getBoundingClientRect().left+box.scrollLeft-8)/PMIX_COLW);if(rows[i])reviewDay(rows[i].d);down=null;},{passive:true});reviewDay(storyWorkoutDate());}
 const show=root.querySelector('.crhead');if(show){const mark=document.createElement('picture');mark.className='review-mascot';mark.innerHTML='<img src="assets/mascot-mark-'+(document.documentElement.dataset.theme==='dark'?'white':'charcoal')+'.png" alt="Show Up mascot">';show.append(mark);}
 root.querySelectorAll('h2').forEach(h=>{const t=h.firstChild;if(t?.nodeType===3&&t.textContent.startsWith('Show up —'))t.textContent='Show up';});
 bindPmix();bindHeat();pmixSummary();
}
renderStats=()=>{reviewRender();reviewDecorate();};
const reviewMode=pmixSetMode;pmixSetMode=()=>{reviewMode();const k=document.querySelector('.review-scale');if(k)k.textContent=PMIX_MODE==='weight'?'One plate · '+(isLb()?'500 lb':'250 kg'):'One block · one set';reviewDay(reviewSelected||partMix(PMIX_DAYS,PMIX_MODE).at(-1)?.d);};
const style=document.createElement('style');style.textContent=`
#view.review-stats h2{font-family:var(--body);font-size:17px;font-weight:600;text-transform:none;letter-spacing:-.2px;margin-top:32px;margin-bottom:12px;align-items:center;gap:10px}
#view.review-stats>h2:first-child{margin-top:12px}
#view.review-stats>.card{border-radius:22px;box-shadow:0 3px 5px #00000003,0 12px 32px #00000006;margin-bottom:18px}
#view.review-stats>.plate-card{box-shadow:0 3px 5px #00000004,0 16px 38px #00000008}
#view.review-stats .pmixhead{align-items:center;justify-content:space-between;gap:12px}
#view.review-stats .review-scale{font:400 11px var(--mono);color:var(--muted)}
/* v4.5.4: NOWRAP, scrolled. This rule is the review card's own, and it set
   flex-wrap:wrap -- so the nowrap added to .pmixlgd in app.css never reached
   this screen and eight parts still broke onto a second line. Fixed where the
   wrap actually lives rather than by out-specifying it from elsewhere. */
#view.review-stats .pmixlgd{display:flex;gap:14px;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none}
#view.review-stats .pmixlgd::-webkit-scrollbar{display:none}
#view.review-stats .pmixlgd>span{display:inline-flex;align-items:center;gap:5px;flex:0 0 auto;white-space:nowrap;font:400 11px var(--body);color:var(--muted)}
#view.review-stats .pmixlgd>span i{width:7px;height:7px;border-radius:2px}
#view.review-stats .pmixplate.latest{transform-box:fill-box;transform-origin:center bottom;animation:pmixrise var(--dur-arrive) var(--settle) both}
#view.review-stats #review-day{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px;padding:13px 0 0;font:400 12px var(--body);color:var(--muted)}
#view.review-stats #review-day strong{font-weight:500;color:var(--chalk)}
#view.review-stats .pmixsum{font-size:10px;line-height:1.7;padding-top:12px;color:var(--muted)}
#view.review-stats .gasel{font:500 17px var(--body);border-radius:13px;padding:13px 15px;background:var(--surface2);color:var(--chalk);margin-bottom:14px}
#view.review-stats .gahead{margin-bottom:10px}
#view.review-stats .garow{padding-top:14px;padding-bottom:14px}
#view.review-stats .garow>b{font:500 14px var(--body)}
#view.review-stats .gadelta{font-size:11px;border-radius:8px}
#view.review-stats .pg-read{border-radius:15px;background:var(--surface2);padding:10px 18px}
#view.review-stats .pg-read-value{font:600 23px var(--body);letter-spacing:-.4px}
#view.review-stats .pg-read-date{font-size:11px}
#view.review-stats .pg-head h3{font:600 18px var(--body);letter-spacing:-.3px}
#view.review-stats .crhead{position:relative;align-items:center;flex-wrap:wrap;padding-right:66px;gap:10px}
#view.review-stats .crtotal b{font:600 42px var(--body);letter-spacing:-1.5px;line-height:1.1}
#view.review-stats .crstreak{font-size:11px;line-height:1.6}
#view.review-stats .review-mascot{position:absolute;right:-10px;top:0;width:78px;height:52px}
#view.review-stats .review-mascot img{width:100%;height:100%;object-fit:contain}
#view.review-stats .crsince{font-size:11px;margin-top:10px}
#view.review-stats .heatframe{margin-top:24px}
#view.review-stats .woven-tools{margin-bottom:15px}
#view.review-stats .woven-receipt{padding-top:16px}
#view.review-stats .woven-ex{padding-top:12px;padding-bottom:12px}
#view.review-stats .woven-exname{font-size:13px;font-weight:500}
#view.review-stats .woven-lines{font-size:11px;line-height:1.7}
#view.review-stats .tot{font-size:12px;line-height:1.6}
#view.review-stats .conkick{font-size:11px;letter-spacing:.5px}
#view.review-stats .congap{font-family:var(--body);letter-spacing:-1px}
#view.review-stats .drcard,#view.review-stats .mpacecard{padding-top:20px}
@media(max-width:360px){#view.review-stats .crhead{padding-right:55px}#view.review-stats .review-mascot{width:65px}#view.review-stats .pmixlgd{gap:9px}}
@media(prefers-reduced-motion:reduce){#view.review-stats .pmixplate.latest{animation:none}}
`;document.head.append(style);
document.addEventListener('click',()=>setTimeout(()=>document.getElementById('view')?.classList.toggle('review-stats',view==='stats'),0));
PMIX_MODE='weight';PMIX_FOCUS=null;


/* Selected workout context is shared by the summary and accumulation chart. */
const storyPlate=plateStatsHTML,storyBind=bindPlateStats,storyGrowth=growthAuditSection,storyYear=consistencyRaceSection,storyWeight=bwCard,storySettings=renderSync;
function storyWorkoutDate(){return reviewSelected&&DB.days[reviewSelected]?reviewSelected:(plateCurrent().sets?todayISO:Object.keys(DB.days).sort().reverse().find(d=>d<=todayISO&&plateMetrics(DB.days[d]).sets));}
function storyAtDate(date,fn){const original=todayISO;todayISO=date;try{return fn();}finally{todayISO=original;}}
plateStatsHTML=()=>{const date=storyWorkoutDate();if(!date)return '<h2>Your first workout</h2><div class="card story-empty">'+mascotHTML('idle')+'<h3>Start with one set.</h3><p>Your workout story will appear here.</p><button class="btn" onclick="view=\'lift\';render()">Start training</button></div>';return storyAtDate(date,()=>storyPlate()).replace('Today completed',date===todayISO?'Today completed':'Your last workout');};
bindPlateStats=()=>{const date=storyWorkoutDate();if(!date)return;storyBind(date,date!==todayISO);const share=document.querySelector('.plate-share');if(share)share.onclick=()=>storyAtDate(date,()=>sharePlateCard());};
growthAuditSection=()=>{const html=storyGrowth(),g=growthAuditData().groups[ga.grp];if(!g)return html;const records=g.ex.filter(e=>e.ago<GA_RECENT_DAYS).map(e=>gaPR(e).change).filter(Boolean);const heavier=records.filter(r=>r.beat&&r.w>r.beat.w+.001).length,reps=records.filter(r=>r.beat&&Math.abs(r.w-r.beat.w)<.001&&r.rep>r.beat.rep).length;const headline=records.length?records.length+' exercise'+(records.length===1?' is':'s are')+' progressing':g.sets?'No new strength record yet':'Build your baseline';const detail=records.length?'Compared with the recent records below.':'Your logged sets are the evidence—not a prediction.';const summary='<div class="story-growth"><h3>'+headline+'</h3><p>'+detail+'</p><div class="story-signals"><span><b>'+heavier+'</b> heavier weight</span><span><b>'+reps+'</b> more repetitions</span></div><small>Additional sets measure training volume, not a strength record.</small></div>';return html.replace('<div class="gahead">',summary+'<div class="gahead">');};
consistencyRaceSection=()=>{const year=+todayISO.slice(0,4),end=todayISO.slice(5),years=[year,year-1],data=years.map(y=>{const dates=Object.keys(DB.days).filter(d=>d.startsWith(y+'-')&&d.slice(5)<=end&&plateMetrics(DB.days[d]).sets);return {year:y,days:dates.length,kg:dates.reduce((n,d)=>n+plateMetrics(DB.days[d]).kg,0),exists:dates.length>0};});const cutoff=new Date(todayISO+'T00:00').toLocaleDateString('en-US',{month:'long',day:'numeric'});return '<h2>This year vs last</h2><div class="card story-year"><p class="story-period">January 1 – '+cutoff+' · both years</p><div class="story-compare"><span></span>'+data.map(d=>'<b>'+d.year+'</b>').join('')+'<span>Days trained</span>'+data.map(d=>'<strong>'+ (d.exists?d.days:'—')+'</strong>').join('')+'<span>Weight moved</span>'+data.map(d=>'<strong>'+(d.exists?plateNumber(d.kg)+' '+U():'—')+'</strong>').join('')+'</div>'+(!data[1].exists?'<p class="story-missing">No previous-year records yet. No comparison claimed.</p>':'')+'</div>';};
// Relocate the existing history UI, not the data it reads.
renderSync=()=>{storySettings();const root=document.getElementById('view'),holder=document.createElement('section');holder.id='story-weight-settings';holder.innerHTML=storyWeight()||'<h2 id="secWeight">Weight history</h2><div class="card"><p>No weight entries yet.</p></div>';root.append(holder);};
const storyRender=renderStats;
renderStats=()=>{const keep=bwCard;bwCard=()=>'';try{storyRender();}finally{bwCard=keep;}const root=document.getElementById('view');root.querySelectorAll('.review-mascot').forEach(e=>e.remove());const headings=[...root.querySelectorAll('h2')],distance=headings.find(h=>h.textContent.trim().startsWith('Distance'));if(distance){const dates=Object.keys(DB.days).filter(d=>DB.days[d].w.some(s=>s.ex==='Run')).sort();const date=d=>new Date(d+'T00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});const group=document.createElement('div');group.className='story-running';group.innerHTML='<h2>Your running story</h2><p>'+date(dates[0])+' – '+date(dates.at(-1))+'</p><span>Distance tracks how far. Pace tracks time per '+DU()+'.</span>';distance.before(group);}
};
const storyStyle=document.createElement('style');storyStyle.textContent=`
.story-growth{padding:2px 0 19px;margin-bottom:17px;border-bottom:1px solid var(--line)}
.story-growth h3{font:600 23px/1.2 var(--body);letter-spacing:-.6px;margin:0 0 8px;color:var(--chalk)}
.story-growth p,.story-growth small{font:400 11px/1.6 var(--body);color:var(--muted);margin:0}
.story-signals{display:flex;flex-wrap:wrap;gap:16px;margin:15px 0 10px;font:400 12px var(--body)}
.story-signals b{font-size:17px;margin-right:3px}
.story-compare{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px 10px;align-items:center;font:400 12px var(--body)}
.story-compare strong{font:500 14px var(--body);overflow-wrap:anywhere}.story-compare b{font-weight:500}.story-compare span{color:var(--muted)}
.story-period{font:400 12px var(--body);color:var(--muted);margin:0 0 24px}
.story-missing{border-top:1px solid var(--line);padding-top:15px;margin-top:20px;font:400 11px/1.6 var(--body);color:var(--muted)}
.story-running{margin-top:34px;border-top:1px solid var(--line);padding-top:3px}.story-running p,.story-running span{font:400 11px/1.6 var(--body);color:var(--muted)}
.story-empty{text-align:center}.story-empty .su-mascot{max-width:80px;margin:auto}
#view.review-stats .crhead{padding-right:0}
`;document.head.append(storyStyle);


/* Fixed calendar periods, historical overlays, and the approved Stats story. */
const v4Woven=wovenSection,v4Growth=growthAuditSection,v4Pace=monthlyPaceSection;
// Reuse the original race card and native scrubbing, not the replacement table.
consistencyRaceSection=()=>{const real=consistencyRaceData;let h;try{consistencyRaceData=()=>({...real(),hasPrevious:true});h=storyYear();}finally{consistencyRaceData=real;}return h;};
function v4YearControls(card,kind){
 const current=+todayISO.slice(0,4),available=new Set(Object.keys(DB.days).filter(d=>kind!=='distance'||DB.days[d].w.some(s=>s.ex==='Run')).map(d=>+d.slice(0,4)));
 const row=document.createElement('div');row.className='v4-years';row.setAttribute('aria-label','Years shown');
 for(let y=current;y>=Math.min(2022,...available);y--){const label=document.createElement('label');label.innerHTML='<input type="checkbox" value="'+y+'" '+(y>=current-1&&available.has(y)?'checked ':'')+(!available.has(y)?'disabled ':'')+'>'+y+(!available.has(y)?'<small>no data</small>':'');row.append(label);}
 card.prepend(row);const svg=card.querySelector('svg');if(!svg)return;
 if(!available.has(current-1)){card.querySelector('.conscore')?.setAttribute('hidden','');svg.querySelectorAll('[data-yr="'+(current-1)+'"],polygon').forEach(e=>e.remove());const note=document.createElement('p');note.className='v4-note';note.textContent='No previous-year records in the attached log. Add a year when its history is available.';row.after(note);}
 const read=document.createElement('div');read.className='v4-read';read.setAttribute('aria-live','polite');card.append(read);
 const start=new Date(current,0,1),end=new Date(todayISO+'T00:00'),dates=[];for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1))dates.push([d.getMonth(),d.getDate()]);
 const series=new Map();for(const y of available){let total=0,last='';const a=dates.map(([m,d])=>{const iso=y+'-'+String(m+1).padStart(2,'0')+'-'+String(Math.min(d,new Date(y,m+1,0).getDate())).padStart(2,'0');if(iso!==last){const record=DB.days[iso];if(kind==='distance')total+=(record?.w||[]).filter(s=>s.ex==='Run').reduce((n,s)=>n+toD(s.w),0);else if(plateMetrics(record).sets)total++;}last=iso;return total;});series.set(y,a);}
 function draw(){const chosen=[...row.querySelectorAll('input:checked')].map(c=>+c.value);const maximum=Math.max(1,...chosen.map(y=>series.get(y)?.at(-1)||0));const ymax=Math.ceil(maximum/10)*10,x0=34,xw=288,y0=182,yh=150;
 svg.querySelectorAll('polyline,polygon,.conend,.v4-line,.v4-grid,.v4-y').forEach(e=>e.remove());svg.querySelectorAll('line,text').forEach(e=>{if(+e.getAttribute('y')<190||e.tagName==='line')e.remove();});
 const node=(tag,attrs)=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));svg.append(el);return el;};
 for(let i=0;i<=4;i++){const yy=y0-yh*i/4;node('line',{x1:x0,x2:x0+xw,y1:yy,y2:yy,stroke:'var(--line)','stroke-dasharray':'2 3',class:'v4-grid'});node('text',{x:28,y:yy+3,'text-anchor':'end','font-size':7,fill:'var(--muted)',class:'v4-y'}).textContent=Math.round(ymax*i/4);}
 chosen.forEach((y,j)=>node('polyline',{'data-yr':y,'data-values':series.get(y).join(','),points:series.get(y).map((v,i)=>(x0+i/(dates.length-1)*xw)+','+(y0-v/ymax*yh)).join(' '),fill:'none',stroke:y===current?'var(--accent)':'var(--muted)','stroke-width':y===current?2.5:1.5,'stroke-dasharray':y===current?'none':(j+2)+' 3',class:'v4-line'}));
 svg.setAttribute('data-smax',ymax);show(dates.length-1);}
 function show(i){const [m,d]=dates[i];read.textContent=new Date(current,m,d).toLocaleDateString('en-US',{month:'long',day:'numeric'})+' · '+[...row.querySelectorAll('input:checked')].map(c=>c.value+': '+Math.round(series.get(+c.value)[i]).toLocaleString()+' '+(kind==='distance'?DU():'days')).join(' · ');}
 row.addEventListener('change',draw);svg.addEventListener('pointermove',e=>{const r=svg.getBoundingClientRect(),i=Math.round(Math.max(0,Math.min(1,((e.clientX-r.left)/r.width*340-34)/288))*(dates.length-1));show(i);});
 const slider=document.createElement('input');slider.type='range';slider.min=0;slider.max=dates.length-1;slider.value=slider.max;slider.setAttribute('aria-label','Scrub comparison date');slider.style.width='100%';slider.oninput=()=>show(+slider.value);card.append(slider);draw();
}
const v4Render=renderStats;renderStats=()=>{const keep=[wovenSection,growthAuditSection,monthlyPaceSection];wovenSection=()=>'';growthAuditSection=()=>'';monthlyPaceSection=()=>'';try{v4Render();}finally{[wovenSection,growthAuditSection,monthlyPaceSection]=keep;}const root=document.getElementById('view');const heads=[...root.querySelectorAll('h2')];for(const h of heads){const t=h.firstChild;if(t?.nodeType!==3)continue;const s=t.textContent.trim();if(s==='Every week'){h.nextElementSibling?.remove();h.remove();}if(s==='Progression')t.textContent='Your progress';if(s==='Show up')t.textContent='Your daily streak';if(s==='The last 7 days'){t.textContent='This week';const p=document.createElement('p');p.className='v4-note';p.textContent=weekDays().map(d=>new Date(d+'T00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})).filter((_,i)=>i===0||i===6).join(' – ');h.nextElementSibling.prepend(p);}}
 const running=heads.find(h=>h.textContent.startsWith('Running ·'));if(running){const intro=root.querySelector('.story-running');if(intro)running.before(intro);}
 // A historical runner still has a distance story even with no run this year.
 if(!root.querySelector('.runrace')&&Object.entries(DB.days).some(([d,r])=>d<=todayISO&&(r.w||[]).some(s=>s.ex==='Run'&&s.w>0))){const heading=document.createElement('h2'),card=document.createElement('div');heading.textContent='Distance';card.className='card conrace runrace';const pace=root.querySelector('.pacecard')?.previousElementSibling;if(pace){pace.before(heading,card);}else root.append(heading,card);}
 root.querySelectorAll('.conrace').forEach(c=>comparisonCard(c,c.classList.contains('runrace')?'distance':'days'));
 const titleMap=new Map([
  ['Today completed','Workout complete'],
  ['What you did','Your work adds up'],
  ['Your progress','Your strength progress'],
  ['Your daily streak','You keep showing up'],
  ['This year vs last','Year over year'],
  ['Daily runs','Run by run'],
  ['Distance','Distance over time'],
  ['Pace','Pace over time'],
  ['Settings','Your data']
 ]);
 root.querySelectorAll('h2').forEach(h=>{
  const t=h.firstChild;if(t?.nodeType!==3)return;const current=t.textContent.trim();
  if(titleMap.has(current))t.textContent=titleMap.get(current);
  else if(current.startsWith('Running · ')){t.textContent=current.slice(10)+' so far';h.classList.add('story-subhead');}
  if(['Run by run','Distance over time','Pace over time'].includes(t.textContent.trim()))h.classList.add('story-subhead');
 });
};
const v4Style=document.createElement('style');v4Style.textContent='.v4-years{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:18px}.v4-years label{display:flex;align-items:center;gap:5px;font:500 12px var(--body);min-height:32px}.v4-years small{font-size:10px;color:var(--muted)}.v4-note,.v4-read{font:400 11px/1.6 var(--body);color:var(--muted);margin:8px 0 18px}.v4-read{min-height:36px;margin-top:12px}.conscore[hidden]{display:none}#view.review-stats h2.story-subhead{font-size:14px;font-weight:500;color:var(--muted);margin-top:24px;margin-bottom:10px}';document.head.append(v4Style);


/* Shared Stats-page geometry, typography, color, and motion contract. */
const systemRender=renderStats,systemSync=renderSync;
const systemLongDate=iso=>new Date(iso+'T00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
function systemDates(root){
 const workout=storyWorkoutDate();const plate=root.querySelector('.plate-date');if(plate&&workout)plate.textContent=systemLongDate(workout).replace(', ',' · ');
 const week=root.querySelector('.mccard .v4-note');if(week){const d=weekDays(),a=new Date(d[0]+'T00:00'),b=new Date(d[6]+'T00:00'),sameYear=a.getFullYear()===b.getFullYear();week.textContent=a.toLocaleDateString('en-US',{month:'long',day:'numeric',...(!sameYear?{year:'numeric'}:{})})+'–'+(sameYear&&a.getMonth()===b.getMonth()?b.getDate():b.toLocaleDateString('en-US',{month:'long',day:'numeric'}))+', '+b.getFullYear();}
 const pg=root.querySelector('.pg-period');if(pg){const main=pg.querySelector('.pg-period-main'),year=pg.querySelector('.pg-period-year');if(main){main.textContent=main.textContent.replace(/\bJan\b/g,'January').replace(/\bFeb\b/g,'February').replace(/\bMar\b/g,'March').replace(/\bApr\b/g,'April').replace(/\bJun\b/g,'June').replace(/\bJul\b/g,'July').replace(/\bAug\b/g,'August').replace(/\bSep\b/g,'September').replace(/\bOct\b/g,'October').replace(/\bNov\b/g,'November').replace(/\bDec\b/g,'December');}if(year)year.textContent=year.textContent.trim();}
 root.querySelectorAll('.plate-date,#review-day,.v4-note,.pg-period,.pg-read-date,.story-running p,.conkick').forEach(e=>e.classList.add('stats-date'));
}
function systemUnits(root){
 const total=root.querySelector('.plate-total');if(total&&total.childNodes.length>1){const unit=[...total.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());if(unit){const span=document.createElement('span');span.className='stats-unit';span.textContent=unit.textContent.trim();unit.replaceWith(span);}}
 const receipt=root.querySelector('#review-day span');if(receipt&&!receipt.querySelector('.stats-unit'))receipt.innerHTML=receipt.textContent.replace(/\b(lb|kg|mi|km)\b/g,'<small class="stats-unit">$1</small>');
 root.querySelectorAll('.pg-read-value,.runmonthhero strong,.conscore [data-con-unit],.drunit,.tot').forEach(e=>e.classList.add('stats-measure'));
 root.querySelectorAll('.drunit').forEach(e=>{e.textContent=e.textContent.replace('MI / RUN','mi per run').replace('KM / RUN','km per run').replace('MIN / MI','min per mi').replace('MIN / KM','min per km');});
}
function systemControls(root){
 root.querySelectorAll('.plate-share,.pg-share').forEach(e=>e.classList.add('stats-share'));
 root.querySelectorAll('.pg-range-nav button,.pg-pages button,.woven-pages button,.woven-arrows button').forEach(e=>e.classList.add('stats-chevron'));
 root.querySelectorAll('.card').forEach(e=>e.classList.add('stats-card'));
 root.querySelectorAll('h2').forEach(e=>e.classList.add('stats-title'));
}
function systemColorRoles(root){
 root.querySelectorAll('.drcard .drline').forEach(e=>e.setAttribute('stroke','var(--accent)'));
 root.querySelectorAll('.drcard .drdot').forEach(e=>e.setAttribute('fill','var(--accent)'));
 root.querySelectorAll('.pacecard polyline').forEach(e=>e.setAttribute('stroke','var(--accent)'));
 root.querySelectorAll('.pacecard .pacepoint').forEach(e=>e.setAttribute('fill','var(--accent)'));
 root.querySelectorAll('.pacecard .paceval').forEach(e=>{e.setAttribute('fill',e.classList.contains('latest')?'var(--accent)':'var(--muted)');e.setAttribute('font-size','6.5');e.setAttribute('font-weight',e.classList.contains('latest')?'600':'500');});
}
function systemApply(){const root=document.getElementById('view');if(!root||view!=='stats')return;root.classList.add('stats-system');systemDates(root);systemUnits(root);systemControls(root);systemColorRoles(root);root.querySelector('.pmixsum')?.remove();root.querySelectorAll('.plate-legend:empty').forEach(e=>e.remove());}
renderStats=()=>{systemRender();systemApply();combineWork();document.querySelectorAll('.heatscroll').forEach(e=>{const months=e.querySelector('.heatticks'),grid=e.querySelector('.heatgrid');if(months&&grid)e.insertBefore(months,grid);});};
renderSync=()=>{systemSync();const root=document.getElementById('view');root?.classList.add('stats-system');systemControls(root);systemUnits(root);};
const systemStyle=document.createElement('style');systemStyle.textContent=`
#view.stats-system{--stats-edge:0px;--stats-radius:22px;--stats-pad-x:18px;--stats-pad-y:20px;--stats-section:30px;--stats-heading:10px}
#view.stats-system .stats-card{box-sizing:border-box;width:calc(100% - var(--stats-edge)*2);margin-left:var(--stats-edge);margin-right:var(--stats-edge);margin-bottom:0;border-radius:var(--stats-radius);padding:var(--stats-pad-y) var(--stats-pad-x);box-shadow:0 2px 5px #00000003,0 10px 28px #00000007}
#view.stats-system .plate-card{padding-top:0}
#view.stats-system .progression-section{margin:0}
#view.stats-system .progression-card{border-radius:var(--stats-radius)}
#view.stats-system h2.stats-title{box-sizing:border-box;margin:var(--stats-section) var(--stats-edge) var(--stats-heading);padding:0;width:calc(100% - var(--stats-edge)*2)}
#view.stats-system h2.stats-title:first-child{margin-top:14px}
#view.stats-system h2.story-subhead{margin-top:22px}
#view.stats-system .stats-date{font-family:var(--mono);font-size:11px;font-weight:400;letter-spacing:.015em;text-transform:none;color:var(--muted);font-variant-numeric:tabular-nums}
#view.stats-system .plate-date{white-space:nowrap;font-size:10px}
#view.stats-system #review-day strong{font:500 12px var(--mono)}
#view.stats-system .stats-unit{font-family:var(--mono);font-size:.48em;font-weight:400;color:var(--muted);white-space:nowrap;margin-left:5px;letter-spacing:0}
#view.stats-system #review-day .stats-unit{font-size:10px;margin-left:1px}
#view.stats-system .stats-measure{font-variant-numeric:tabular-nums}
#view.stats-system .conscore b{font:500 21px/1 var(--body);letter-spacing:-.3px}
#view.stats-system .runmonthhero strong{font:500 27px/1 var(--body);letter-spacing:-.5px}
#view.stats-system .runmonthgrid b{font:500 12px var(--body)}
#view.stats-system .tot b{font-size:13px;font-weight:500}
#view.stats-system .stats-share{display:grid;place-items:center;flex:0 0 44px;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:var(--surface2);color:var(--muted)}
#view.stats-system .stats-share svg{width:18px;height:18px}
#view.stats-system .stats-chevron{display:grid;place-items:center;flex:0 0 44px;width:44px;height:44px;padding:0;border:1px solid color-mix(in srgb,var(--chalk) 13%,var(--surface));border-radius:50%;background:var(--surface2);color:var(--chalk);font:400 22px var(--body)}
#view.stats-system .stats-chevron:disabled{color:var(--faint);opacity:.45}
#view.stats-system .crtotal>b{color:var(--accent-ink)}
#view.stats-system .heatgrid .hc.on{background-color:var(--accent)}
#view.stats-system .heatgrid .hc.tod::after{border-color:var(--accent)}
#view.stats-system .mcdots i.on{background:var(--accent)}
#view.stats-system :is(.v4-years,.conrace)>input[type=range]{accent-color:var(--accent)}
#view.stats-system .drcard .drdot.pick{fill:var(--accent)}
#view.stats-system .pacecard .pacehalo{stroke:var(--accent)}
#view.stats-system .pmixhead,#view.stats-system .drunit{min-height:44px}
#view.stats-system .pmixlgd{margin-top:4px;margin-bottom:12px}
#view.stats-system .review-scale{font-size:10px}
#view.stats-system #review-day{padding-top:12px}
#view.stats-system .story-running{box-sizing:border-box;width:calc(100% - var(--stats-edge)*2);margin:var(--stats-section) var(--stats-edge) 0;padding-top:0;border-top:0}
#view.stats-system .story-running h2{width:100%;margin:0 0 8px}
#view.stats-system .story-running p{margin:0 0 3px}
#view.stats-system .story-running span{display:block;margin:0}
#view.stats-system .v4-years{margin-bottom:12px}
#view.stats-system .v4-note{margin-top:0;margin-bottom:14px}
#view.stats-system .v4-read{min-height:18px;margin:8px 0 4px}
#view.stats-system .runmonthgrid span{padding:8px 7px}
#view.stats-system .runmonthgoal{padding:11px 0}
#view.stats-system .runmonthfoot{margin-top:10px;padding-top:10px}
#view.stats-system .plate-caption{margin-top:10px}
#view.stats-system .plate-legend{margin-top:9px}
@media(max-width:360px){#view.stats-system{--stats-edge:0px;--stats-pad-x:14px}#view.stats-system .plate-date{font-size:9px}}
`;document.head.append(systemStyle);
/* One date owns the receipt, canvas and share snapshot. Browsing never writes logs. */
function combineWork(){
 const hero=document.querySelector('.plate-card'),history=document.getElementById('pmixWrap')?.closest('.card');
 if(!hero||!history)return;
 const heading=history.previousElementSibling;if(heading?.tagName==='H2')heading.remove();
 const shell=document.createElement('div');shell.className='card stats-card work-combined';hero.before(shell);
 const title=shell.previousElementSibling;if(title?.tagName==='H2')title.textContent=reviewSelected===todayISO&&DB.days[todayISO]?.doneAll?'Workout complete':'Your work, stacking up';
 hero.classList.remove('card','stats-card');hero.classList.add('work-hero');shell.append(hero);
 history.classList.remove('card','stats-card');history.classList.add('work-history');shell.append(history);
 const receipt=history.querySelector('#review-day');if(receipt)receipt.hidden=true;
 installWorkPeriods(history);
 const wrap=history.querySelector('#pmixWrap'),selectedIndex=partMix(PMIX_DAYS,PMIX_MODE).findIndex(d=>d.d===reviewSelected);wrap.style.scrollBehavior='auto';wrap.scrollLeft=selectedIndex<0?wrap.scrollWidth:8+(selectedIndex+.5)*PMIX_COLW-wrap.clientWidth/2;
 const latest=document.createElement('button');latest.className='work-latest';latest.textContent='Latest ↗';latest.onclick=()=>{const date=Object.keys(DB.days).sort().reverse().find(d=>d<=todayISO&&plateMetrics(DB.days[d]).sets);if(date)reviewDay(date);const box=document.getElementById('pmixWrap');box.scrollLeft=box.scrollWidth;};history.querySelector('.pmixhead').append(latest);
 history.setAttribute('aria-label','Select a day to see its workout above');
}
function installWorkPeriods(history){
 const wrap=history.querySelector('#pmixWrap');if(!wrap)return;
 const rail=document.createElement('div');rail.className='work-periods';rail.setAttribute('aria-label','Visible year and month');wrap.parentElement.append(rail);
 const sync=()=>{
  const rows=partMix(PMIX_DAYS,PMIX_MODE),left=wrap.scrollLeft;if(!rows.length){rail.replaceChildren();return;}
  rail.replaceChildren();
  for(const [length,top]of [[4,0],[7,14]]){
   const periods=[];rows.forEach((r,i)=>{const key=r.d.slice(0,length);if(periods.at(-1)?.key!==key)periods.push({key,x:8+i*PMIX_COLW,label:length===4?key:new Date(r.d+'T00:00').toLocaleDateString('en-US',{month:'short'})   /* v4.5.5 */});});
   let index=0;while(index+1<periods.length&&periods[index+1].x<=left+2)index++;
   const current=periods[index],next=periods[index+1],label=document.createElement('span');label.textContent=current.label;label.style.top=top+'px';rail.append(label);
   const width=label.getBoundingClientRect().width||current.label.length*7;
   label.style.left=Math.min(2,next?next.x-left-width-10:2)+'px';
   let edge=next?next.x-left:Infinity;
   for(let j=index+1;j<periods.length;j++){const p=periods[j],x=p.x-left;if(x>wrap.clientWidth)break;if(x<edge)continue;const incoming=document.createElement('span');incoming.textContent=p.label;incoming.style.cssText='top:'+top+'px;left:'+x+'px';rail.append(incoming);edge=x+(incoming.getBoundingClientRect().width||p.label.length*7)+10;}
  }
  /* v4.5.5: THE DATES WERE ALWAYS THERE, AND ALWAYS HIDDEN. This line hides a
     label once it scrolls out of the visible window -- and when it runs before
     the wrap has a width (clientWidth 0), EVERY label fails the test and is
     hidden. Nothing re-ran it until a scroll, so on a fresh paint the axis
     was empty and the maker saw a blank band where his dates should be, three
     releases running. The wrap already clips with overflow, so hiding is only
     cosmetic; it never runs against a width of zero now. */
  if(wrap.clientWidth>0) wrap.querySelectorAll('svg>text').forEach(t=>{const x=+t.getAttribute('x');t.style.visibility=x-11<left||x>left+wrap.clientWidth?'hidden':'';});
  else wrap.querySelectorAll('svg>text').forEach(t=>{t.style.visibility='';});
 };
 wrap.addEventListener('scroll',sync,{passive:true});new MutationObserver(sync).observe(wrap,{childList:true});sync();requestAnimationFrame(sync);
}
function updateWork(date){
 const shell=document.querySelector('.work-combined');if(!shell)return;
 const old=shell.querySelector('.work-hero'),doc=document.createElement('div');
 const m=plateMetrics(DB.days[date]);
 doc.innerHTML=m.sets?storyAtDate(date,()=>storyPlate()):'<div class="work-hero work-empty"><div class="plate-date">'+new Date(date+'T00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+'</div><strong>No workout recorded</strong></div>';
 const next=doc.querySelector('.plate-card,.work-hero');next.classList.remove('card');next.classList.add('work-hero');old.replaceWith(next);
 if(m.sets){next.querySelector('.plate-date').textContent=systemLongDate(date).replace(', ',' · ');next.querySelector('.plate-date').classList.add('stats-date');systemUnits(next);systemControls(next);storyBind(date,true);next.querySelector('.plate-share').onclick=()=>storyAtDate(date,()=>sharePlateCard());}
 else plateCancel();
 const title=shell.previousElementSibling;if(title?.tagName==='H2')title.textContent=date===todayISO&&DB.days[date]?.doneAll?'Workout complete':'Your work, stacking up';
}
const comparisonMemory=new Map();
function comparisonCard(card,kind){
 const current=+todayISO.slice(0,4),records=Object.keys(DB.days).filter(d=>d<=todayISO&&(kind==='distance'?(DB.days[d]?.w||[]).some(s=>s.ex==='Run'):plateMetrics(DB.days[d]).sets));
 const available=[...new Set(records.map(d=>+d.slice(0,4)))].sort((a,b)=>b-a);
 if(!available.length){card.innerHTML='<p>No records to compare yet.</p>';return;}
 const dates=[];for(let d=new Date(current,0,1);d<=new Date(todayISO+'T00:00');d.setDate(d.getDate()+1))dates.push([d.getMonth(),d.getDate()]);
 const memory=comparisonMemory.get(kind)||{years:available.slice(0,2),index:dates.length-1};comparisonMemory.set(kind,memory);
 memory.years=memory.years.filter(y=>available.includes(y));if(!memory.years.length)memory.years=[available[0]];
 memory.index=Math.min(memory.index,dates.length-1);
 const series=new Map();available.forEach(y=>{let total=0,last='';series.set(y,dates.map(([m,d])=>{const iso=y+'-'+String(m+1).padStart(2,'0')+'-'+String(Math.min(d,new Date(y,m+1,0).getDate())).padStart(2,'0');if(iso!==last){const r=DB.days[iso];total+=kind==='distance'?(r?.w||[]).filter(s=>s.ex==='Run'&&s.completed!==false).reduce((n,s)=>n+toD(s.w),0):(plateMetrics(r).sets?1:0);}last=iso;return total;}));});
 card.classList.add('comparison-card');card.innerHTML='<div class="comparison-years"></div><div class="comparison-heading"><span class="comparison-date"></span><button class="comparison-latest">Latest ↗</button></div><div class="comparison-values" aria-live="polite"></div><svg class="comparison-plot" viewBox="0 0 340 210" role="img" aria-label="Cumulative '+(kind==='distance'?'distance':'training days')+' by year"></svg><input class="comparison-scrub" type="range" min="0" max="'+(dates.length-1)+'" aria-label="Scrub comparison date"><p class="comparison-foot">'+(kind==='distance'?'Distance accumulated':'Training days accumulated')+' · same calendar date</p>';
 const palette=['var(--accent)','#B36F47','#349484','#9875B8','#BE8C38'];
 const color=y=>palette[available.indexOf(y)%palette.length];
 const svg=card.querySelector('svg'),slider=card.querySelector('input'),values=card.querySelector('.comparison-values');
 const difference=document.createElement('p');difference.className='comparison-delta';values.after(difference);
 const node=(tag,attrs,text)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text!==undefined)e.textContent=text;svg.append(e);return e;};
 let maximum=1;
 const x=i=>32+i/Math.max(1,dates.length-1)*296,y=v=>178-v/maximum*158;
 function show(i){memory.index=Math.max(0,Math.min(dates.length-1,i));slider.value=memory.index;const [m,d]=dates[memory.index];const label=new Date(current,m,d).toLocaleDateString('en-US',{month:'long',day:'numeric'});card.querySelector('.comparison-date').textContent=label;slider.setAttribute('aria-valuetext',label);card.querySelector('.comparison-latest').disabled=memory.index===dates.length-1;
 values.innerHTML=memory.years.map(yr=>'<div style="--year-color:'+color(yr)+'"><span>'+yr+'</span><strong>'+series.get(yr)[memory.index].toLocaleString('en-US',{maximumFractionDigits:kind==='distance'?1:0})+' <small>'+(kind==='distance'?DU():'days')+'</small></strong></div>').join('');
 difference.hidden=memory.years.length<2;if(!difference.hidden){const [a,b]=memory.years,scale=kind==='distance'?10:1,delta=Math.round((series.get(a)[memory.index]-series.get(b)[memory.index])*scale)/scale;difference.textContent=(delta===0?'Same total':(delta>0?'+':'−')+Math.abs(delta).toLocaleString()+' '+(kind==='distance'?DU():'days'))+' · '+a+' vs '+b;}
 svg.querySelectorAll('.comparison-marker').forEach(e=>e.remove());node('line',{class:'comparison-marker',x1:x(memory.index),x2:x(memory.index),y1:14,y2:178,stroke:'var(--muted)','stroke-dasharray':'3 3'});
 const groups=new Map();memory.years.forEach(yr=>{const key=Math.round(y(series.get(yr)[memory.index]));if(!groups.has(key))groups.set(key,[]);groups.get(key).push(yr);});
 groups.forEach(years=>years.forEach((yr,i)=>node('circle',{class:'comparison-marker','data-year':yr,cx:x(memory.index),cy:y(series.get(yr)[memory.index]),r:4.5+(years.length-1-i)*2.5,fill:'var(--surface)',stroke:color(yr),'stroke-width':2})));
 }
 function draw(){const row=card.querySelector('.comparison-years');row.innerHTML=memory.years.map(yr=>'<button aria-label="Remove '+yr+' from comparison" style="--year-color:'+color(yr)+'" data-year="'+yr+'">'+yr+' <span>×</span></button>').join('')+'<details><summary>+ Year</summary><div>'+available.filter(yr=>!memory.years.includes(yr)).map(yr=>'<button data-add="'+yr+'">'+yr+'</button>').join('')+'</div></details>';
 row.querySelector('details').hidden=memory.years.length===available.length;
 row.querySelectorAll('[data-year]').forEach(b=>{b.disabled=memory.years.length===1;b.onclick=()=>{memory.years=memory.years.filter(yr=>yr!==+b.dataset.year);draw();};});row.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{memory.years.push(+b.dataset.add);memory.years.sort((a,b)=>b-a);draw();});
 maximum=Math.max(1,...memory.years.map(yr=>series.get(yr).at(-1)));maximum=Math.ceil(maximum/4)*4;svg.replaceChildren();for(let n=0;n<=4;n++){const value=maximum*n/4;node('line',{x1:32,x2:328,y1:y(value),y2:y(value),stroke:'var(--line)','stroke-dasharray':'2 4'});node('text',{x:26,y:y(value)+3,'text-anchor':'end',fill:'var(--muted)','font-size':8},Math.round(value));}
 [0,Math.floor((dates.length-1)/3),Math.floor((dates.length-1)*2/3),dates.length-1].forEach(i=>{const [m,d]=dates[i];node('text',{x:x(i),y:199,'text-anchor':i===0?'start':i===dates.length-1?'end':'middle',fill:'var(--muted)','font-size':8},new Date(current,m,d).toLocaleDateString('en-US',{month:'short',day:'numeric'}));});
 memory.years.forEach(yr=>node('polyline',{'data-year':yr,points:series.get(yr).map((v,i)=>x(i)+','+y(v)).join(' '),fill:'none',stroke:color(yr),'stroke-width':2.4,'stroke-dasharray':available.indexOf(yr)?['5 3','2 4','8 3 2 3'][(available.indexOf(yr)-1)%3]:'none','stroke-linejoin':'round'}));show(memory.index);}
 slider.oninput=()=>show(+slider.value);card.querySelector('.comparison-latest').onclick=()=>show(dates.length-1);
 const scrub=e=>{const r=svg.getBoundingClientRect();show(Math.round(((e.clientX-r.left)/r.width*340-32)/296*(dates.length-1)));};
 let pointer=null;svg.addEventListener('pointerdown',e=>{pointer=e.pointerId;svg.setPointerCapture?.(e.pointerId);scrub(e);});svg.addEventListener('pointermove',e=>{if(pointer!==null&&pointer===e.pointerId)scrub(e);});svg.addEventListener('pointerup',e=>{if(pointer===e.pointerId){scrub(e);svg.releasePointerCapture?.(e.pointerId);pointer=null;}});svg.addEventListener('pointercancel',()=>{pointer=null;});draw();
}
const compactStyle=document.createElement('style');compactStyle.textContent=`
#view.stats-system .work-combined{padding:12px 16px 14px;overflow:hidden}
#view.stats-system .work-hero{padding:0;box-shadow:none;background:none;border-radius:0;margin:0;height:328.5px}
#view.stats-system .work-hero .plate-heading{height:44px;min-height:44px;margin:0;padding-top:0}
#view.stats-system .work-hero .plate-scene{height:148.5px;margin:0}
#view.stats-system .work-hero .plate-total{font-size:13px;margin:0;height:45px;display:flex;align-items:center;justify-content:center;gap:7px}#view.stats-system .work-hero .plate-total b{font-size:34px}
#view.stats-system .work-hero .plate-total .stats-unit{font-size:11px}
#view.stats-system .work-hero .plate-caption{font-size:11px;margin:0;height:23px;padding-top:4px}
#view.stats-system .work-hero .plate-bank{display:block;height:20px;margin:0;font-size:10px;line-height:20px}
#view.stats-system .work-hero .plate-bank:empty{display:none;height:0}   /* v4.5.5: the empty bank was a 20px band under the caption */
#view.stats-system .work-history [data-lbl]{display:none}
#view.stats-system .work-hero .plate-legend{display:none}
#view.stats-system .work-hero .plate-replay{min-height:32px;padding:4px 10px;margin:8px auto;font-size:11px}
#view.stats-system .work-history{background:none;box-shadow:none;padding:8px 0 0;margin:0;border-radius:0;border-top:1px solid var(--line)}
#view.stats-system .work-history .pmixhead{min-height:30px}#view.stats-system .work-history .pmixlgd{gap:6px 12px;margin:3px 0 7px}
#view.stats-system .work-history .pmixlgdwrap{overflow:visible;mask-image:none;-webkit-mask-image:none}#view.stats-system .work-history .pmixlgd{width:auto;max-width:100%}#view.stats-system .work-history .pmixlgd>span{white-space:nowrap}
#view.stats-system .work-history .pmixlgdwrap::after{display:none}
.work-latest{border:0;background:none;color:var(--accent-ink);font:500 11px var(--body);min-height:36px}.work-history .review-scale{display:none}
#view.stats-system .work-history #review-day{display:none}
#view.stats-system .work-history .pmixnow{display:none}
#view.stats-system .work-history .pmixbox{margin:0}#view.stats-system .work-history :is(.pmixaxis,.pmixwrap>svg){height:164px!important}
#view.stats-system .work-history #pmixYr{display:none}
#view.stats-system .work-periods{position:absolute;left:44px;right:0;top:0;height:30px;overflow:hidden;pointer-events:none;background:var(--surface);z-index:1}
#view.stats-system .work-periods span{position:absolute;white-space:nowrap;font:400 11px/14px var(--body);color:var(--muted)}   /* v4.5.5: the same size and face as the axis beside it */
#view.stats-system .work-empty{min-height:240px;display:grid;place-content:center;gap:20px;text-align:center}
.comparison-years{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.comparison-years button,.comparison-years summary,.comparison-latest{border:1px solid var(--line);background:var(--surface2);border-radius:12px;padding:10px 12px;color:var(--chalk);font:500 12px var(--body);cursor:pointer}
.comparison-years button[data-year]{border-color:var(--year-color);color:var(--year-color)}.comparison-years button span{opacity:.6;margin-left:6px}.comparison-years details{position:relative}.comparison-years details>div{position:absolute;z-index:3;min-width:90px;padding:6px;background:var(--surface);box-shadow:0 6px 20px #0002;border-radius:12px}.comparison-years details button{display:block;width:100%}
.comparison-heading{display:flex;align-items:center;justify-content:space-between;margin:16px 0 10px;font:500 12px var(--body)}.comparison-latest:disabled{opacity:.35}.comparison-values{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px}.comparison-values>div{flex:1;min-width:85px;border-left:3px solid var(--year-color);padding-left:10px}.comparison-values span{display:block;font:400 11px var(--mono);color:var(--muted)}.comparison-values strong{font:600 25px var(--body);font-variant-numeric:tabular-nums}.comparison-values small{font:400 11px var(--body);color:var(--muted)}.comparison-plot{width:100%;display:block;touch-action:pan-y}.comparison-scrub{width:100%;accent-color:var(--accent);min-height:40px}.comparison-foot{font:400 10px var(--body);color:var(--muted);margin:2px 0 0}
.comparison-delta{font:500 12px var(--body);color:var(--accent-ink);background:var(--surface2);border-radius:10px;padding:9px 12px;margin:0 0 12px;font-variant-numeric:tabular-nums}
#view.stats-system .heatticks{margin-top:0;margin-bottom:8px;line-height:12px}#view.stats-system .wdrail{padding-top:40px}
.pg-title-row .pg-title{flex:1;min-width:0}.pg-search-open{display:grid;place-items:center;width:44px;height:44px;flex:0 0 44px;border:0;border-radius:50%;background:var(--surface2);color:var(--chalk)}
.pg-library{margin:12px 0 18px}.pg-parts{display:flex;gap:7px;overflow-x:auto;padding-bottom:10px}.pg-parts button{flex:0 0 auto;padding:9px 12px;border-radius:18px;border:1px solid var(--line);background:var(--surface2);color:var(--muted);font:500 11px var(--body)}.pg-parts button[aria-pressed=true]{background:var(--accent);color:white;border-color:var(--accent)}
.pg-exercise-shelf{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pg-exercise-shelf button,.pg-search-results button{padding:12px;text-align:left;border:1px solid var(--line);border-radius:12px;background:var(--surface2);color:var(--chalk);min-width:0}.pg-exercise-shelf strong,.pg-search-results strong{display:block;font:500 12px/1.35 var(--body)}.pg-exercise-shelf small,.pg-search-results small{display:block;margin-top:5px;font:400 10px var(--mono);color:var(--muted)}.pg-exercise-shelf button[aria-pressed=true]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,var(--surface))}
.pg-search-dialog{box-sizing:border-box;width:min(440px,calc(100% - 28px));max-height:75dvh;border:1px solid var(--line);border-radius:22px;padding:20px;background:var(--surface);color:var(--chalk)}.pg-search-dialog::backdrop{background:#0008;backdrop-filter:blur(4px)}.pg-search-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.pg-search-heading h3{font:600 19px var(--body);margin:0}.pg-search-heading button{width:44px;height:44px;border:0;border-radius:50%;font-size:25px;background:var(--surface2);color:var(--chalk)}.pg-search-dialog input{box-sizing:border-box;width:100%;margin:12px 0;padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--surface2);color:var(--chalk);font:400 16px var(--body)}.pg-search-results{display:grid;gap:8px}.pg-search-results button[hidden]{display:none}
`;document.head.append(compactStyle);
})();
