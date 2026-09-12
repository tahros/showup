/* ShowUp mascot integration. Decorative, optional, lazy and entirely local.
   No workout data is sent to the renderer. */
function mascotMode(){return ['still','off'].includes(DB.settings.mascotMotion)?DB.settings.mascotMotion:'animated';}
/* v4.2.4: TONE IS NOT A MOTION. Blue was only reachable as mode 'cool', and
   mode also chooses the animation -- so asking for a blue mascot meant giving
   up whatever it was doing. The completion moment wants blue AND its jump,
   then blue AND its dance. tone is its own argument now; mode keeps the
   motion, and 'cool' still implies blue so nothing that asked for it changes. */
function mascotTone(mode,tone){
  if(tone)return tone;
  if(mode==='cool')return 'blue';
  /* v4.5.16: CHROME in the light theme. The charcoal read as a hole punched in a
     pale card; a flat lift fixed that but read as a greyed-out control. Chrome is
     the same render with a bright crown, a dark horizon through the handle where
     sky meets ground, and bounce light underneath -- the gradient IS the material,
     which is why it is baked into the asset rather than layered in CSS. mascot.css
     adds one slow highlight on top so the metal is lit rather than printed. The
     dark theme keeps white: a light mascot on a dark card already has the contrast
     this was reaching for. */
  return document.documentElement.dataset.theme==='dark'?'white':'chrome';
}
function mascotHTML(mode='hello',className='',tone=''){
  if(mascotMode()==='off')return '';
  /* v4.5.15: the RESOLVED tone rides on the element, not just an explicitly asked
     one. CSS needs to know the mascot is chrome to hang its highlight on,
     and "chrome" is a resolution, never a request -- nothing passes it. Writing
     only the requested tone left the attribute empty in exactly the case that
     needed it. The renderer reads the same attribute, so both agree by
     construction rather than by two lookups that could drift. */
  const resolved=mascotTone(mode,tone);
  return '<span class="su-mascot '+className+'" data-mascot="'+mode+'" data-mascot-tone="'+resolved+'" aria-hidden="true"><img src="assets/mascot-'+resolved+'.png" alt="" width="360" height="220"></span>';
}
function workoutCompletionMetrics(record){
  const rows=record?.w||[];
  const end=Number(record?.completedAt);
  const starts=rows.map(row=>{
    const at=Number(row.at);
    if(!Number.isFinite(at)||at<946684800000||at>end)return null;
    const run=row.part==='Run'?Math.max(0,(Number(row.mins)||0)*60+(Number(row.secs)||0))*1000:0;
    return at-run;
  }).filter(n=>n!==null);
  // Unknown legacy timestamps stay unknown. Viewing the card never supplies "now".
  const minutes=Number.isFinite(end)&&starts.length&&starts.length===rows.length?Math.max(1,Math.round((end-Math.min(...starts))/60000)):null;
  const sets=rows.reduce((sum,row)=>sum+(row.part==='Run'?1:Math.max(1,(row.reps||[]).length)),0);
  const exercises=new Set(rows.map(row=>row.part+'\u0000'+row.ex)).size;
  return {minutes,sets,exercises};
}
function completionMetricsHTML(record){
  const m=workoutCompletionMetrics(record);
  return '<div class="su-completion-metrics">'+
    [[m.minutes==null?'—':m.minutes,m.minutes===1?'minute':'minutes'],[m.sets,m.sets===1?'set':'sets'],[m.exercises,m.exercises===1?'exercise':'exercises']]
    .map(([n,label])=>'<div'+(n==='—'?' title="Duration unavailable: older sets have no recorded start time"':'')+'><b>'+n+'</b> <span>'+label+'</span></div>').join('')+'</div>';
}
function stampWorkoutCompletion(record,now=Date.now()){
  record.completedAt=now;
  // Only an explicit completion can earn the milestone. Imports and renders cannot.
  const count=Object.values(DB.days).filter(d=>d.w?.length).length;
  if(count===25&&!DB.settings.mascot25Date) DB.settings.mascot25Date=todayISO;
}
function mascotMilestoneHTML(){
  return '<div class="su-milestone"><div class="su-milestone-grid" aria-label="25 training sessions">'+
    Array.from({length:25},(_,i)=>'<i aria-hidden="true" style="animation-delay:'+i*45+'ms"></i>').join('')+
    '</div></div>';
}
const mascotMarks={};
function mascotReceiptMark(){
  const tone=document.documentElement.dataset.theme==='dark'?'white':'charcoal';
  return mascotMarks[tone]?.complete&&mascotMarks[tone]?.naturalWidth?mascotMarks[tone]:null;
}
for(const tone of ['white','charcoal']){
  const image=new Image();image.src='assets/mascot-mark-'+tone+'.png';mascotMarks[tone]=image;
}
(function mascotLifecycle(){
  if(typeof MutationObserver==='undefined'||typeof IntersectionObserver==='undefined'||typeof ResizeObserver==='undefined')return;
  const live=new Map(),pending=new Set(),visible=new Set();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let modulePromise,scheduled=false;
  const still=()=>mascotMode()!=='animated'||reduced.matches;
  function remove(el){
    live.get(el)?.dispose();live.delete(el);el.classList.remove('su-ready');
  }
  async function mount(el){
    if(pending.has(el)||live.has(el)||!visible.has(el)||document.hidden||live.size>=2||el.dataset.failed)return;
    // Static fallbacks are intentional for reduced-motion and the Still setting.
    if(still())return;
    pending.add(el);
    try{
      modulePromise ||= import('./mascot-renderer.js');
      const module=await modulePromise;
      if(!el.isConnected||!visible.has(el)||document.hidden||still()||live.size>=2)return;
      const instance=module.createMascot(el,{mode:el.dataset.mascot,tone:el.dataset.mascotTone||'',theme:document.documentElement.dataset.theme,still:false});
      live.set(el,instance);el.classList.add('su-ready');
      /* v4.1.2: TAP TO SAY HELLO. The mascot stays aria-hidden and out of the
         tab order on purpose: it carries no information and performs no
         action, so a focus stop and a label on every screen it appears on
         would be furniture for a joke. Touch reaches it; nothing is lost to
         anyone who cannot see it, because there is nothing there to lose.
         Pointer, not click: a click on iOS waits 300ms behind the tap, and a
         mascot that answers late reads as broken rather than shy. */
      if(!el.dataset.tapBound){
        el.dataset.tapBound='1';
        // Plate replay restarts the approved jump without simulating a user tap.
        el.addEventListener('mascotreplay',()=>live.get(el)?.replay());
        el.addEventListener('pointerdown',()=>{
          const inst=live.get(el); if(!inst) return;
          el.classList.remove('su-poke'); void el.offsetWidth; el.classList.add('su-poke');
          inst.replay();
        },{passive:true});
      }
    }catch(_){el.dataset.failed='true';el.querySelector('canvas')?.remove();}
    finally{pending.delete(el);}
  }
  const intersection=new IntersectionObserver(entries=>{
    entries.forEach(({target,isIntersecting})=>{
      if(isIntersecting){visible.add(target);mount(target);}
      else{visible.delete(target);remove(target);}
    });
    visible.forEach(mount);
  });
  function reconcile(){
    scheduled=false;
    const mode=mascotMode(),theme=document.documentElement.dataset.theme;
    document.documentElement.dataset.mascotMotion=mode;
    // Browser/install identity stays blue in both themes; only in-page art changes.
    for(const el of [...visible,...live.keys()]){
      if(!el.isConnected){remove(el);visible.delete(el);intersection.unobserve(el);}
    }
    document.querySelectorAll('[data-mascot]').forEach(el=>{
      const image=el.querySelector('img');
      const path='assets/mascot-'+mascotTone(el.dataset.mascot,el.dataset.mascotTone)+'.png';
      if(image&&image.getAttribute('src')!==path)image.src=path;
      if(!el.dataset.observed){el.dataset.observed='true';intersection.observe(el);}
      if(mode==='off'||still()||document.hidden)remove(el);
      else if(live.has(el))live.get(el).update({theme,still:false});
      else mount(el);
    });
  }
  function queue(){if(!scheduled){scheduled=true;queueMicrotask(reconcile);}}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  new MutationObserver(queue).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  document.addEventListener('visibilitychange',queue);
  reduced.addEventListener('change',queue);
  window.addEventListener('pagehide',()=>{live.forEach((_,el)=>remove(el));});
  window.addEventListener('pageshow',queue);
  document.addEventListener('mascotsettingschange',queue);
  queue();
})();
