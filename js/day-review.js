/* Whole-day review: read-only, frozen plan OR previous exercise session.
   No new storage, guessed weather/location, retroactive plan links or scores.
   The DOM and share canvas consume the same formatted model. Today emerges
   from blank space; references stay still. All encoding stays on-device. */
// equipOf() creates an override bag on legacy profiles; this view must not.
const dayReviewBody=ex=>(DB.settings.equipOv?.[ex]||DB.settings.custom?.[ex]?.equip||(EZ_NAME.test(ex||'')?'ezbar':null)||SEED.equip[ex]||'machine')==='body';
function dayReviewTotals(record){
  const rows=record?.w||[];
  // Completion's timing rules apply to EACH recorded session, not a whole-day
  // first-to-last span (which would count a lunch break as exercise).
  let remaining=rows.slice(),minutes=0,known=!!rows.length;
  while(remaining.length){
    const stamps=remaining.map(r=>Number(r.at));
    const latest=Math.max(...stamps),next=rows.filter(r=>!remaining.includes(r)).map(r=>+r.at);
    const limit=next.length?Math.min(...next):Infinity;
    const ends=[...(record.closed||[]),record.completedAt].map(Number).filter(n=>Number.isFinite(n)&&n>=latest&&n<limit).sort((a,b)=>a-b);
    const last=sessionRows({w:remaining,closed:record.closed},ends[0]??latest+1);
    if(!last.length){known=false;break;}
    const m=workoutCompletionMetrics({w:last,completedAt:ends[0]});
    if(m.minutes==null)known=false;else minutes+=m.minutes;
    remaining=remaining.filter(r=>!last.includes(r));
  }
  // Completion's per-entry count across ALL sessions. Shape, not the Cardio
  // part name: a legacy weighted Cycling row still contains lifting sets.
  const sets=rows.reduce((n,r)=>n+(isCardio(r)?1:Math.max(1,(r.reps||[]).length)),0);
  return {minutes:known?minutes:null,sets,exercises:new Set(rows.map(r=>r.part+'\0'+r.ex)).size,
    distance:rows.filter(r=>r.ex==='Run'&&isCardio(r)).reduce((n,r)=>n+(Number(r.w)||0),0)};
}
function dayReviewModel(date=todayISO){
  const days=allDays(),record=DB.days?.[date]||{w:days[date]||[]},work=record.w||[],basis=plBasis(date);
  const planned=!!basis,items=basis?.content?.items||[],names=[];
  const key=ex=>plExerciseId(ex);
  const add=ex=>{if(ex&&!names.some(n=>key(n)===key(ex)))names.push(ex);};
  if(planned)items.forEach(i=>add(i.ex));work.forEach(r=>add(r.ex));
  const expand=rows=>rows.flatMap(source=>isCardio(source)?[{source,cardio:true,w:+source.w||0,mins:+source.mins||0,secs:+source.secs||0}]:
    (source.reps||[]).map(r=>({...source,source,r:+r,w:+source.w||0})));
  const prior=Object.keys(days).filter(d=>d<date).sort().reverse();
  const rows=names.map(ex=>{
    const actual=expand(work.filter(r=>key(r.ex)===key(ex)));
    const lastDate=planned?null:prior.find(d=>days[d].some(r=>key(r.ex)===key(ex)));
    const ref=planned?(basis.targets||[]).filter(t=>plSameExercise(t,ex)).map(t=>({...t,r:t.reps})):
      expand(lastDate?days[lastDate].filter(r=>key(r.ex)===key(ex)):[]);
    const inPlan=items.some(i=>key(i.ex)===key(ex));
    let addedSets=Math.max(0,actual.length-ref.length),repGain=0,weightGain=0;
    const comparable=(a,b)=>b&&!a.cardio&&!b.cardio&&!isHold(a.su)&&!isHold(b.su)&&!a.nw&&!b.nw&&!a.est&&!b.est&&!plWarm(b)&&!dayReviewBody(ex)&&a.w>0&&b.w>0;
    actual.forEach((a,i)=>{
      // Plan matches are ID-based only. Unlinked legacy rows remain facts,
      // never falsely attributed to a target by ordinal or weight.
      const b=planned?ref.find(t=>a.source.planRef?.setId===t.id):ref[i];
      if(comparable(a,b)){
        a.weightGain=a.w>b.w+.00001;
        a.repGain=Math.abs(a.w-b.w)<.00001&&a.r>b.r;
        if(a.weightGain)weightGain=Math.max(weightGain,a.w-b.w);
        if(a.repGain)repGain+=a.r-b.r;
      }
      a.extra=ref.length>0&&i>=ref.length;
    });
    const delta=[];
    if(weightGain)delta.push('+'+wDisp(weightGain)+' '+U());
    if(repGain)delta.push('+'+repGain+' reps');
    if(ref.length&&addedSets)delta.push('+'+addedSets+' '+(addedSets===1?'set':'sets'));
    const note=planned?(!inPlan&&actual.length?'Added today':!ref.length&&inPlan?'No set targets':''):(lastDate?new Date(lastDate+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric',...(lastDate.slice(0,4)!==date.slice(0,4)?{year:'numeric'}:{})}):'First session');
    return {ex,ref,actual,note,delta};
  });
  const totals=dayReviewTotals(record),parts=[...new Set(work.map(r=>r.part==='Run'?(r.ex==='Run'?'Run':partLabel(r.part)):r.part).filter(Boolean))];
  const values=[totals.minutes==null?'—':String(totals.minutes),String(totals.sets),String(totals.exercises),String(+toD(totals.distance).toFixed(2))];
  return {date,planned,rows,parts,totals,values,labels:['minutes','sets','exercises',isLb()?'miles run':'km run'],unit:U(),distanceUnit:DU(),
    title:new Date(date+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',...(date.slice(0,4)!==todayISO.slice(0,4)?{year:'numeric'}:{})}),name:String(DB.settings?.name||'')};
}
function dayReviewGroups(sets,ex){
  const groups=[];
  for(const s of sets){
    const load=s.cardio?(cardioOf(ex).dist?String(+toD(s.w).toFixed(2))+' '+DU():'Time'):s.nw?'By feel':(s.est?'≈':'')+((s.bw||dayReviewBody(ex))?(s.w?'BW + '+wDisp(s.w):'BW'):wDisp(s.w));
    const tag=s.cardio?(s.mins||s.secs?String(s.mins)+':'+String(s.secs).padStart(2,'0'):''):String(setNum(s.r,s.su));
    const id=JSON.stringify([load,s.su||'',!!s.weightGain,!!s.cardio,s.qualifier||'']);
    const last=groups.at(-1),chip={label:tag,gain:!!s.repGain||!!s.extra};
    if(last?.id===id&&!s.cardio)last.chips.push(chip);
    else groups.push({id,load,gain:!!s.weightGain,chips:tag?[chip]:[],qualifier:s.qualifier||''});
  }
  return groups;
}
function dayReviewSection(){
  const m=dayReviewModel();
  const cell=(sets,ex,actual)=>{
    if(!sets.length)return '<span class="dr-empty"'+(actual?' data-dr-reveal':'')+'>—</span>';
    return dayReviewGroups(sets,ex).map(g=>`<div class="dr-value"><span class="dr-weight${g.gain?' dr-gain':''}"${actual?' data-dr-reveal':''}>${hesc(g.load)}</span><span class="dr-reps">${g.chips.map(c=>`<span class="dr-rep${c.gain?' dr-gain':''}"${actual?' data-dr-reveal':''}>${hesc(c.label)}</span>`).join('')}</span>${g.qualifier?`<small>${hesc(g.qualifier)}</small>`:''}</div>`).join('');
  };
  return `<section class="card day-review" aria-label="Whole-day workout comparison">
    <div class="dr-heading"><h3>${hesc(m.title)}</h3></div>
    ${m.parts.length?`<p class="dr-parts">${m.parts.map(hesc).join(' · ')}</p>`:'<p class="dr-parts">Your day, one set at a time.</p>'}
    <table aria-label="${m.planned?'Plan':'Last session'} compared with today"><colgroup><col><col><col></colgroup><thead><tr><th scope="col">${m.unit} · reps</th><th scope="col">${m.planned?'Plan':'Last'}</th><th scope="col"><span data-dr-reveal>Today</span></th></tr></thead><tbody>
    ${m.rows.map(r=>`<tr><th scope="row">${hesc(r.ex)}${r.note?`<small class="dr-note">${hesc(r.note)}</small>`:''}${r.delta.length?`<span class="dr-delta" data-dr-reveal>${r.delta.map(hesc).join(' · ')}</span>`:''}</th><td>${cell(r.ref,r.ex,false)}</td><td class="dr-actual">${cell(r.actual,r.ex,true)}</td></tr>`).join('')}
    </tbody></table>${!m.rows.length?'<p class="dr-empty-day">Your logged sets will appear here.</p>':''}
    <div class="dr-totals">${m.values.map((n,i)=>`<div data-dr-reveal${i===0&&n==='—'?' title="Duration unavailable until a timed session is completed"':''}><b>${n}</b><span>${m.labels[i]}</span></div>`).join('')}</div>
    <div class="dr-actions"><button type="button" data-dr-replay><span aria-hidden="true">↻</span> Replay</button><button type="button" class="dr-share" data-dr-share${!m.totals.sets?' disabled':''}>${ICO_SHARE} Share</button></div>
  </section>`;
}
let dayReviewObserver=null;
function dayReviewReplay(card){
  if(!card)return;
  card.getAnimations?.({subtree:true}).forEach(a=>a.cancel());card.classList.remove('dr-pending');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||!card.animate)return;
  const reveal=(el,delay)=>el.animate(el.classList.contains('dr-gain')?[{opacity:0,transform:'translateY(8px) scale(.96)'},{opacity:1,transform:'translateY(-1px) scale(1.04)',offset:.7},{opacity:1,transform:'translateY(0) scale(1)'}]:[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{delay,duration:540,fill:'backwards',easing:'cubic-bezier(.2,.75,.25,1)'});
  reveal(card.querySelector('thead [data-dr-reveal]'),180);
  card.querySelectorAll('tbody tr').forEach((row,i)=>{row.querySelectorAll('.dr-actual [data-dr-reveal]').forEach((el,j)=>reveal(el,420+i*260+j*35));const delta=row.querySelector('.dr-delta');if(delta)reveal(delta,720+i*260);});
  card.querySelectorAll('.dr-totals>div').forEach((el,i)=>reveal(el,540+card.querySelectorAll('tbody tr').length*260+i*70));
}
function bindDayReview(){
  dayReviewObserver?.disconnect();dayReviewObserver=null;
  const card=document.querySelector('.day-review');if(!card)return;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&typeof IntersectionObserver==='function'&&card.animate){
    card.classList.add('dr-pending');
    dayReviewObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){dayReviewObserver.disconnect();dayReviewReplay(card);}},{threshold:.01});
    dayReviewObserver.observe(card);
  }
}
document.addEventListener('click',e=>{
  const replay=e.target.closest('[data-dr-replay]'),share=e.target.closest('[data-dr-share]');
  if(replay)dayReviewReplay(replay.closest('.day-review'));
  if(share&&!share.disabled)shareDayReview(share);
});

/* The export uses the same formatted values as the DOM, but lays text out
   explicitly so it stays sharp and never depends on screenshot libraries. */
function dayReviewExportModel(){
  const m=dayReviewModel(),css=getComputedStyle(document.documentElement),read=(key,fallback)=>css.getPropertyValue(key).trim()||fallback;
  return {...m,rows:m.rows.map(r=>({...r,refGroups:dayReviewGroups(r.ref,r.ex),actualGroups:dayReviewGroups(r.actual,r.ex)})),dark:document.documentElement.dataset.theme==='dark',
    colors:{paper:read('--surface','#fff'),ink:read('--chalk','#202124'),muted:read('--muted','#727272'),line:read('--line','#ededed'),chip:read('--surface2','#f5f5f5'),blue:read('--accent','#3546d8'),blueText:read('--accent-ink','#3546d8'),soft:'color-mix(in srgb, '+read('--accent','#3546d8')+' 11%, '+read('--surface','#fff')+')'}};
}
function drawDayReview(data,time,canvas){
  const cv=canvas||document.createElement('canvas'),scale=1080/393;
  if(cv.width!==1080)cv.width=1080;
  const ctx=cv.getContext('2d'),sans='"ShowUp Export Plex", "IBM Plex Sans", sans-serif',mono='"IBM Plex Mono", monospace',C=data.colors;
  const wrap=(s,width,size=14.5)=>{ctx.font='500 '+size+'px '+sans;const lines=[];let line='';for(const word of String(s).split(/\s+/)){if(line&&ctx.measureText(line+' '+word).width>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;};
  const chips=g=>{const lines=[[]];let used=0;ctx.font='500 12px '+sans;for(const chip of g.chips){const w=Math.max(17,ctx.measureText(chip.label).width+7);if(used+w>96&&lines.at(-1).length){lines.push([]);used=0;}lines.at(-1).push({...chip,w});used+=w+3;}return lines;};
  const groupHeight=g=>23+(g.chips.length?chips(g).length*25:0)+(g.qualifier?wrap(g.qualifier,96,10).length*13:0);
  const rowHeight=r=>Math.max(70,34+wrap(r.ex,112).length*19+(r.note?wrap(r.note,112,11).length*14+4:0)+r.delta.length*15,
    28+r.refGroups.reduce((s,g)=>s+groupHeight(g)+8,0),28+r.actualGroups.reduce((s,g)=>s+groupHeight(g)+8,0));
  const meta=wrap(data.parts.join(' · '),345,13),top=158+meta.length*19,heights=data.rows.map(rowHeight),bottom=top+heights.reduce((a,b)=>a+b,0);
  const h=bottom+102,height=Math.ceil(h*scale/2)*2;
  if(cv.height!==height)cv.height=height;
  ctx.setTransform(scale,0,0,scale,0,0);ctx.fillStyle=C.paper;ctx.fillRect(0,0,393,h+1);
  const text=(s,x,y,size=14,color=C.ink,align='left',font=sans,weight=400)=>{ctx.font=weight+' '+size+'px '+font;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(s,x,y);};
  const rule=y=>{ctx.strokeStyle=C.line;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(24,y);ctx.lineTo(369,y);ctx.stroke();};
  const reveal=(delay,paint)=>{const p=Number.isFinite(time)?Math.max(0,Math.min(1,(time-delay)/540)):1;ctx.save();ctx.globalAlpha=p;ctx.translate(0,8*Math.pow(1-p,3));paint();ctx.restore();};
  if(data.logo)ctx.drawImage(data.logo,24,24,98,98*data.logo.height/data.logo.width);
  // Name wraps rather than colliding with the approved lockup.
  wrap(data.name,215,11).slice(0,2).forEach((s,i)=>text(s,369,42+i*14,11,C.muted,'right'));rule(76);
  text(data.title,24,113,23,C.ink,'left',sans,500);
  meta.forEach((line,i)=>text(line,24,139+i*19,13,C.muted));
  text(data.unit+' · reps',24,top-14,11,C.muted);text(data.planned?'Plan':'Last',204,top-14,12,C.muted,'center');
  reveal(180,()=>text('Today',318,top-14,12,C.blueText,'center',sans,500));
  let y=top;
  const groups=(list,cx,actual,delay)=>{
    if(!list.length){const paint=()=>text('—',cx,y+37,13,C.muted,'center');actual?reveal(delay,paint):paint();return;}
    let gy=y+27,j=0;
    list.forEach(g=>{
      const at=gy,load=()=>{if(actual&&g.gain){ctx.font='400 14px '+mono;const w=ctx.measureText(g.load).width+12;ctx.fillStyle=C.blue;ctx.beginPath();ctx.roundRect(cx-w/2,at-16,w,23,6);ctx.fill();}text(g.load,cx,at,14,actual?(g.gain?(data.dark?'#111529':'#fff'):C.blueText):C.muted,'center',mono);};
      actual?reveal(delay+j++*35,load):load();gy+=10;
      if(g.chips.length)chips(g).forEach(line=>{let x=cx-line.reduce((s,c)=>s+c.w+3,0)/2;const cy=gy;
        line.forEach(c=>{const left=x,paint=()=>{ctx.fillStyle=actual?(c.gain?C.blue:C.soft):C.chip;ctx.beginPath();ctx.roundRect(left,cy,c.w,21,5);ctx.fill();text(c.label,left+c.w/2,cy+15,12,actual?(c.gain?(data.dark?'#111529':'#fff'):C.blueText):C.muted,'center',sans,500);};actual?reveal(delay+j++*35,paint):paint();x+=c.w+3;});gy+=25;
      });
      if(g.qualifier)wrap(g.qualifier,96,10).forEach(line=>{text(line,cx,gy+10,10,C.muted,'center');gy+=13;});
      gy+=13;
    });
  };
  data.rows.forEach((r,i)=>{rule(y);let ty=y+29;wrap(r.ex,112).forEach(line=>{text(line,24,ty,14.5,C.ink,'left',sans,500);ty+=19;});
    if(r.note){ty+=2;wrap(r.note,112,11).forEach(line=>{text(line,24,ty,11,C.muted);ty+=14;});}
    r.delta.forEach((line,j)=>{const yy=ty+5+j*15;reveal(420+i*260+300,()=>text(line,24,yy,11,C.blueText,'left',sans,500));});
    groups(r.refGroups,204,false,0);groups(r.actualGroups,318,true,420+i*260);y+=heights[i];
  });
  rule(bottom);data.values.forEach((v,i)=>reveal(540+data.rows.length*260+i*70,()=>{const x=24+(i+.5)*345/4;text(v,x,bottom+42,23,C.ink,'center',sans,500);text(data.labels[i],x,bottom+64,12,C.ink,'center');}));
  return cv;
}
async function shareDayReview(button){
  button.disabled=true;
  // Freeze data/units/theme before asynchronous font loading.
  const data=dayReviewExportModel();
  try{
    const module=await import('./plate-gif.js'),video=await import('./plate-video.js');
    const logo=new Image();logo.src='assets/showuppp-lifted-lockup-'+(data.dark?'dark':'light')+'.png';
    await Promise.all([logo.decode(),module.loadExportFonts(),document.fonts.load('400 14px "IBM Plex Mono"')]);data.logo=logo;
    if(!button.isConnected)return; // Do not reopen a share after leaving this day/account.
    await showCard(()=>drawDayReview(data),'showuppp-your-day-'+data.date,false);
    bindPlateExport(data,null,module,video,{gif:false,render:(t,c)=>drawDayReview(data,matchMedia('(prefers-reduced-motion: reduce)').matches?undefined:t,c),duration:Math.max(3500,1800+data.rows.length*260),label:'Your day, set by set'});
  }catch(e){toast('Could not prepare your day. Please try again.');}
  finally{if(button.isConnected)button.disabled=false;}
}
