/* ShowUp mascot integration. Decorative, optional, lazy and entirely local.
   No workout data is sent to the renderer. */
function mascotMode(){return ['still','off'].includes(DB.settings.mascotMotion)?DB.settings.mascotMotion:'animated';}
function mascotHTML(mode='hello',className=''){
  if(mascotMode()==='off')return '';
  const tone=document.documentElement.dataset.theme==='dark'?'white':'charcoal';
  return '<span class="su-mascot '+className+'" data-mascot="'+mode+'" aria-hidden="true"><img src="assets/mascot-'+tone+'.png" alt="" width="360" height="220"></span>';
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
      const instance=module.createMascot(el,{mode:el.dataset.mascot,theme:document.documentElement.dataset.theme,still:false});
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
    const favicon=document.querySelector('link[rel="icon"]');
    const iconPath=theme==='dark'?'assets/mascot-mark-white.png':'favicon-32.png';
    if(favicon&&favicon.getAttribute('href')!==iconPath)favicon.setAttribute('href',iconPath);
    for(const el of [...visible,...live.keys()]){
      if(!el.isConnected){remove(el);visible.delete(el);intersection.unobserve(el);}
    }
    document.querySelectorAll('[data-mascot]').forEach(el=>{
      const image=el.querySelector('img');
      const path='assets/mascot-'+(theme==='dark'?'white':'charcoal')+'.png';
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
