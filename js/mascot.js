/* ShowUp mascot integration. Decorative, optional, lazy and entirely local.
   No workout data is sent to the renderer. */
function mascotMode(){return ['still','off'].includes(DB.settings.mascotMotion)?DB.settings.mascotMotion:'animated';}
/* v4.2.4: TONE IS NOT A MOTION. Blue was only reachable as mode 'cool', and
   mode also chooses the animation -- so asking for a blue mascot meant giving
   up whatever it was doing. The completion moment wants blue AND its jump,
   then blue AND its dance. tone is its own argument now; mode keeps the
   motion, and 'cool' still implies blue so nothing that asked for it changes. */
/* v4.6.99: retint a mascot already on screen -- the live renderer if it has
   one, and always the still fallback and the dataset, so a later reconcile
   (or a mount that lands after the ask) agrees with what is being shown. */
function mascotTint(el,tone){
  if(!el)return;
  el.dataset.mascotTone=tone||'';
  const image=el.querySelector('img');
  if(image){
    const resolved=mascotTone(el.dataset.mascot,tone);
    const path=(typeof isRetro==='function'&&isRetro())?retroStill(el.dataset.mascot,resolved):'assets/mascot-'+resolved+'.png';
    if(image.getAttribute('src')!==path)image.src=path;
  }
  el.dispatchEvent(new CustomEvent('mascottone',{detail:tone||''}));
}
function mascotTone(mode,tone){
  if(tone)return tone;
  if(mode==='cool')return 'blue';
  /* Light uses silver with ultra-soft moving reflections. Dark uses matte white
     with very-light body shading. PNGs are sampled from the same 3D material. */
  return document.documentElement.dataset.theme==='dark'?'white':'chrome';
}
function mascotHTML(mode='hello',className='',tone=''){
  if(mascotMode()==='off')return '';
  // The PNG and renderer use the same resolved tone, including explicit blue.
  const resolved=mascotTone(mode,tone);
  const src=isRetro()?retroStill(mode,resolved):'assets/mascot-'+resolved+'.png';
  return '<span class="su-mascot '+className+'" data-mascot="'+mode+'" data-mascot-tone="'+resolved+'" aria-hidden="true"><img src="'+src+'" alt="" width="360" height="220"></span>';
}
/* Approved A / C artwork, traced from the maker's board (see trace-showuppp.cjs).
   Presentation only: no timers, settings writes or completion bookkeeping.
   Keep the existing renderer lifecycle, static PNG and OS motion fallback. */
function showupppLogoHTML(variant='a',completion=false){
  const v=variant==='c'?'c':'a';
  const tone=completion?'blue':document.documentElement.dataset.theme==='dark'?'white':'charcoal';
  const mascot=mascotHTML(completion?'jump':'hello','',tone);
  return '<div class="showuppp-lockup showuppp-'+v+(mascot?'':' showuppp-word-only')+'" role="img" aria-label="ShowUppp">'+
    (mascot?'<span class="showuppp-character">'+(v==='c'?'<i class="showuppp-ground" aria-hidden="true"></i>':'')+mascot+'</span>':'')+
    (v==='c'?"<svg class=\"showuppp-lettering\" viewBox=\"0 0 350 232\" aria-hidden=\"true\"><path data-letter=\"s\" fill=\"#2c2c2c\" fill-rule=\"evenodd\" d=\"M 44.500 11.698 C 38.013 12.558, 30.282 15.274, 25.854 18.249 C 10.185 28.773, 10.207 51.285, 25.896 60.693 C 29.690 62.968, 35.572 64.916, 46.360 67.470 C 63.822 71.604, 65.460 72.283, 67.013 76.031 C 67.927 78.239, 67.849 79.391, 66.626 81.756 C 64.587 85.699, 59.908 87.512, 51.937 87.446 C 42.675 87.370, 36.368 84.141, 33.317 77.914 L 31.070 73.328 21.448 75.414 L 11.826 77.500 12.439 81.342 C 13.998 91.098, 22.072 99.706, 32.762 103.008 C 47.543 107.574, 64.242 106.314, 76.356 99.718 C 89.420 92.606, 94.743 76.904, 88.403 64.182 C 84.444 56.237, 76.787 52.449, 55.505 47.908 C 40.673 44.743, 36.805 41.897, 38.447 35.355 C 39.691 30.400, 53.286 28.003, 61.258 31.334 C 64.568 32.717, 69 37.623, 69 39.904 C 69 40.507, 69.563 41.006, 70.250 41.014 C 71.576 41.028, 88.229 36.868, 88.888 36.358 C 89.101 36.193, 88.674 33.908, 87.939 31.282 C 84.233 18.047, 64.320 9.069, 44.500 11.698  \"/><path data-letter=\"h\" fill=\"#2c2c2c\" fill-rule=\"evenodd\" d=\"M 97.667 11.667 C 97.300 12.033, 97 32.958, 97 58.167 L 97 104 107.425 104 L 117.850 104 118.175 84.070 C 118.473 65.801, 118.672 63.906, 120.565 61.320 C 125.629 54.402, 135.009 53.406, 139.404 59.321 C 141.347 61.936, 141.523 63.665, 141.822 83.071 L 142.145 104 152.572 104 L 163 104 163.118 93.750 C 163.554 55.889, 163.123 52.031, 157.721 45.477 C 153.489 40.344, 148.003 38.049, 139.899 38.022 C 132.011 37.996, 127.762 39.264, 122.809 43.124 C 120.778 44.706, 118.866 46, 118.559 46 C 118.251 46, 118 38.125, 118 28.500 L 118 11 108.167 11 C 102.758 11, 98.033 11.300, 97.667 11.667  \"/><path data-letter=\"o\" fill=\"#2c2c2c\" fill-rule=\"evenodd\" d=\"M 195.105 36.518 C 182.612 40.027, 173.951 47.609, 170.472 58.083 C 167.901 65.824, 168.768 79.833, 172.230 86.500 C 184.311 109.761, 221.715 111.419, 235.769 89.316 C 243.912 76.509, 242.902 58.255, 233.438 47.199 C 225.327 37.722, 208.003 32.896, 195.105 36.518  M 197.756 54.569 C 193.629 56.808, 191 62.816, 191 70.010 C 191 80.332, 195.555 86.081, 204.242 86.723 C 214.044 87.447, 219.323 81.622, 219.399 70 C 219.450 62.344, 217.451 57.855, 212.701 54.960 C 208.866 52.621, 201.692 52.434, 197.756 54.569 \"/><path data-letter=\"w\" fill=\"#2c2c2c\" fill-rule=\"evenodd\" d=\"M 240.378 35.544 C 240.719 36.431, 241.884 40.609, 242.968 44.829 C 244.051 49.048, 247.877 62.388, 251.469 74.473 C 255.061 86.559, 258 97.021, 258 97.723 C 258 98.680, 260.691 98.997, 268.750 98.989 L 279.500 98.977 284.916 80.955 C 287.895 71.042, 290.623 63.285, 290.979 63.716 C 291.336 64.147, 292.356 66.975, 293.246 70 C 294.136 73.025, 296.512 80.787, 298.525 87.250 L 302.186 99 312.995 99 L 323.805 99 325.834 92.250 C 327.443 86.897, 333.162 66.590, 341.746 35.750 C 342.188 34.164, 341.253 34, 331.752 34 L 321.270 34 317.068 51.750 C 312.216 72.247, 312.148 72.482, 311.356 71.689 C 311.028 71.361, 308.403 62.859, 305.522 52.796 L 300.285 34.500 290.892 34.500 L 281.500 34.500 276.529 52.750 C 273.795 62.787, 271.304 71, 270.993 71 C 270.683 71, 268.420 62.788, 265.964 52.750 L 261.500 34.500 250.630 34.215 C 240.968 33.962, 239.828 34.109, 240.378 35.544  \"/><path data-letter=\"u\" fill=\"#2c2c2c\" fill-rule=\"evenodd\" d=\"M 17.190 160.750 L 17.500 194.500 20.306 200.214 C 26.182 212.181, 36.694 218.023, 53.703 218.773 C 75.106 219.717, 87.987 211.849, 93.933 194.199 C 95.843 188.529, 96 185.747, 96 157.532 L 96 127 84.540 127 L 73.081 127 72.790 158.250 C 72.503 189.146, 72.474 189.537, 70.171 192.765 C 66.871 197.392, 62.516 199.409, 55.927 199.362 C 48.886 199.312, 44.608 196.887, 41.979 191.456 C 40.141 187.660, 40 185.217, 40 157.184 L 40 127 28.440 127 L 16.879 127 17.190 160.750 \"/><path data-letter=\"p1\" fill=\"#2c2c2c\" fill-rule=\"evenodd\" d=\"M 135.169 144.555 C 132.237 146.043, 129.601 147.876, 129.312 148.630 C 128.379 151.060, 127 150.087, 127 147 L 127 144 115.989 144 L 104.978 144 105.239 185.250 L 105.500 226.500 116 226.500 L 126.500 226.500 126.778 212.750 C 126.931 205.188, 127.249 199, 127.484 199 C 127.719 199, 129.529 200.098, 131.506 201.440 C 142.332 208.786, 159.101 206.242, 168.459 195.834 C 174.154 189.500, 176.500 182.734, 176.375 173 C 176.144 154.895, 165.361 143.213, 148 142.261 C 141.364 141.897, 139.886 142.161, 135.169 144.555  M 136.450 160.407 C 126.019 164.950, 124.013 179.717, 133 185.806 C 135.904 187.774, 137.422 188.104, 141.915 187.743 C 146.599 187.367, 147.780 186.817, 150.665 183.669 C 153.640 180.422, 154 179.407, 153.996 174.265 C 153.992 167.213, 151.439 162.499, 146.510 160.440 C 142.316 158.687, 140.412 158.681, 136.450 160.407\"/><path data-letter=\"p2\" fill=\"#2c2c2c\" fill-rule=\"evenodd\" d=\"M 217.748 124.366 C 215.684 125.136, 212.422 126.966, 210.498 128.434 L 207 131.102 207 128.051 L 207 125 196 125 L 185 125 185 166.500 L 185 208 196 208 L 207 208 207 194 C 207 181.112, 207.625 177.967, 209.564 181.103 C 209.938 181.709, 212.552 183.280, 215.373 184.593 C 229.414 191.131, 246.587 184.687, 253.694 170.214 C 256.171 165.170, 256.500 163.386, 256.499 155 C 256.498 144.292, 254.812 139.272, 248.984 132.635 C 242.020 124.703, 227.295 120.805, 217.748 124.366  M 214.182 141.971 C 207.626 146.085, 205.200 157.077, 209.424 163.524 C 213.236 169.343, 222.724 171.376, 228.476 167.608 C 232.537 164.947, 235.350 157.819, 234.521 152.290 C 233.024 142.306, 222.310 136.870, 214.182 141.971 \"/><path data-letter=\"p3\" fill=\"#2c2c2c\" fill-rule=\"evenodd\" d=\"M 299.500 106.132 C 297.850 106.734, 294.813 108.546, 292.750 110.160 L 289 113.094 289 109.547 L 289 106 278 106 L 267 106 267 148 L 267 190 278 190 L 289 190 289 176 C 289 168.300, 289.255 162, 289.567 162 C 289.878 162, 291.566 163.069, 293.317 164.376 C 304.521 172.740, 323.197 169.464, 332.161 157.563 C 344.593 141.056, 339.544 117.008, 321.722 107.840 C 316.831 105.324, 304.347 104.365, 299.500 106.132  M 297.071 123.752 C 291.467 126.609, 289.500 130.179, 289.500 137.493 C 289.500 142.873, 289.881 144.251, 292 146.548 C 301.595 156.947, 316.006 151.142, 315.996 136.882 C 315.988 125.233, 306.744 118.819, 297.071 123.752 \"/></svg>":'<img class="showuppp-lettering" src="assets/showuppp-a.svg" alt="" aria-hidden="true" width="345" height="230">')+'</div>';
}
/* Approved single-shot 2.5D choreography on the existing 3D poster. Keeping
   this lockup out of the live renderer avoids two competing jump timelines. */
function showupppAnimate(host){
  const root=host?.querySelector('.showuppp-c');
  if(!root||!root.animate||mascotMode()!=='animated'||document.hidden)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  if(reduce.matches)return;
  let running=[];
  function stop(){
    running.forEach(a=>a.cancel());running=[];
    host.removeEventListener('dd-left',stop);
    document.removeEventListener('visibilitychange',stop);
    document.removeEventListener('mascotsettingschange',stop);
    reduce.removeEventListener('change',stop);
  }
  host.addEventListener('dd-left',stop,{once:true});
  document.addEventListener('visibilitychange',stop);
  document.addEventListener('mascotsettingschange',stop);
  reduce.addEventListener('change',stop);
  function animate(el,frames,duration,delay=0){
    if(!el)return;
    running.push(el.animate(frames,{duration,delay,fill:'none',easing:'linear'}));
  }
  function pose(transform,offset,easing='cubic-bezier(.3,0,.3,1)'){return {transform,offset,easing};}
  animate(root.querySelector('.showuppp-character img'),[
pose('translateY(0) scale(1) rotate(0deg)',0),
pose('translateY(3px) scale(1.1,.86) rotate(-3deg)',.12),
pose('translateY(-32px) scale(.95,1.08) rotate(5deg)',.34),
pose('translateY(-35px) scale(1) rotate(3deg)',.43,'cubic-bezier(.55,0,.85,.5)'),
pose('translateY(2px) scale(1.12,.85) rotate(-2deg)',.65),
pose('translateY(-9px) scale(.98,1.04) rotate(1deg)',.79),
pose('translateY(1px) scale(1.03,.97) rotate(0deg)',.91),
pose('translateY(0) scale(1) rotate(0deg)',1)
],1400);
animate(root.querySelector('.showuppp-ground'),[
{transform:'scaleX(1)',opacity:1,offset:0},
{transform:'scaleX(1.1)',opacity:1,offset:.12},
{transform:'scaleX(.6)',opacity:.35,offset:.36},
{transform:'scaleX(.6)',opacity:.35,offset:.43},
{transform:'scaleX(1.15)',opacity:1,offset:.65},
{transform:'scaleX(.85)',opacity:.65,offset:.79},
{transform:'scaleX(1)',opacity:1,offset:1}
],1400);
['s','h','o','w'].forEach((letter,i)=>{
const height=[58,62,66,70][i];
animate(root.querySelector('[data-letter="'+letter+'"]'),[
pose('translateY(0)',0),
pose('translateY(3px)',.07),
pose('translateY(-'+height+'px)',.24),
pose('translateY(-'+(height+8)+'px)',.42),
pose('translateY(-'+height+'px)',.70),
pose('translateY(2px)',.88),
pose('translateY(-5px)',.95),
pose('translateY(0)',1)
],1600,i*85);
});
['u','p1','p2','p3'].forEach((letter,i)=>{
const height=[31,40,47,50][i];
animate(root.querySelector('[data-letter="'+letter+'"]'),[
pose('translateY(0) scale(1)',0),
pose('translateY(3px) scale(1.04,.94)',.12),
pose('translateY(-'+height+'px) scale(.98,1.04)',.42),
pose('translateY(3px) scale(1.07,.91)',.7),
pose('translateY(-8px) scale(.99,1.02)',.84),
pose('translateY(0) scale(1)',1)
],700,250+i*100);
});

  Promise.allSettled(running.map(a=>a.finished)).then(stop);
}
/* v4.6.69: A DAY CAN HOLD MORE THAN ONE WORKOUT.
   The day is the unit of showing up -- the square, the streak, History, the
   daily total all stay day-sized. But the BAR and the completion CARD describe
   a workout, and a set logged at 3 pm after an 11 am Complete is not the same
   workout: the bar read "399 min" and a second Complete would have printed a
   six-hour session. Nothing was modelled below the day.
   The rule, chosen by the maker: Complete closes a session -- the next set
   starts a new one, no question asked, because Complete was the answer. And a
   set two hours or more after the previous one also starts a new session,
   silently, for the person who forgot to press it; two hours is longer than
   any rest, so a real workout never splits.
   Sessions are DERIVED, never stored: the day keeps an append-only list of
   its completion times (`closed`) and the sets keep their `at`; everything
   else is arithmetic on those. A record without `closed` and without gaps is
   one session, which is every day that existed before this. */
const SESSION_GAP_MS=2*60*60*1000;
function sessionRows(record,end){
  const rows=record?.w||[];
  const closed=(record?.closed||[]).map(Number).filter(c=>Number.isFinite(c)&&(!Number.isFinite(end)||c<end));
  const lastClosed=closed.length?Math.max(...closed):-Infinity;
  const dated=rows.map((r,i)=>({r,i,at:Number(r.at)}));
  const sorted=dated.slice().sort((a,b)=>Number.isFinite(a.at)&&Number.isFinite(b.at)?a.at-b.at:a.i-b.i);
  let start=0;
  for(let k=1;k<sorted.length;k++){
    const p=sorted[k-1].at,c=sorted[k].at;
    if(!Number.isFinite(p)||!Number.isFinite(c))continue;
    if((p<=lastClosed&&c>lastClosed)||c-p>=SESSION_GAP_MS)start=k;
  }
  return sorted.slice(start).map(x=>x.r);
}
function workoutCompletionMetrics(record){
  const end=Number(record?.completedAt);
  const rows=sessionRows(record,end);
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
    [(m.minutes==null?['—','minutes']:m.minutes<100?[m.minutes,m.minutes===1?'minute':'minutes']:[`${Math.floor(m.minutes/60)} h ${m.minutes%60}`,'min']),[m.sets,m.sets===1?'set':'sets'],[m.exercises,m.exercises===1?'exercise':'exercises']]
    .map(([n,label])=>'<div'+(n==='—'?' title="Duration unavailable: older sets have no recorded start time"':'')+'><b>'+n+'</b> <span>'+label+'</span></div>').join('')+'</div>';
}
function stampWorkoutCompletion(record,now=Date.now()){
  retroSound('complete');
  record.completedAt=now;
  /* v4.6.132: Apple Health (js/health.js) -- writes nothing unless switched on in the iOS app */
  if(typeof healthOnComplete==='function') healthOnComplete(record,now).catch(()=>{});
  /* the session boundary, kept: completedAt alone is overwritten by the next
     Complete, and the boundary between the two workouts would go with it */
  const closed=Array.isArray(record.closed)?record.closed:(record.closed=[]);
  if(!closed.includes(now))closed.push(now);
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
  if(isRetro())return retroMark();
  const tone=document.documentElement.dataset.theme==='dark'?'white':'chrome';
  return mascotMarks[tone]?.complete&&mascotMarks[tone]?.naturalWidth?mascotMarks[tone]:null;
}
for(const tone of ['white','chrome']){
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
    if(el.closest('.showuppp-c'))return; // This one-shot lockup owns its motion.
    if(pending.has(el)||live.has(el)||!visible.has(el)||document.hidden||live.size>=2||el.dataset.failed)return;
    // Static fallbacks are intentional for reduced-motion and the Still setting.
    if(still())return;
    pending.add(el);
    try{
      const skin=isRetro()?'retro':'normal';
      const module=isRetro()?{createMascot:createRetroMascot}:await (modulePromise ||= import('./mascot-renderer.js'));
      if(skin!==(isRetro()?'retro':'normal'))return;
      if(!el.isConnected||!visible.has(el)||document.hidden||still()||live.size>=2)return;
      const instance=module.createMascot(el,{mode:el.dataset.mascot,tone:el.dataset.mascotTone||'',theme:document.documentElement.dataset.theme,still:false});
      el.dataset.renderSkin=skin;
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
        /* v4.6.99: and its TONE can change mid-show. The ink entrance floods
           the screen with ShowUp Blue, and a blue mascot inside blue is a
           mascot you cannot see -- it turns white for the crossing, which is
           the installed icon's own pairing, and blue again as it lands. */
        el.addEventListener('mascottone',e=>live.get(el)?.update({tone:e.detail||''}));
        el.addEventListener('pointerdown',()=>{
          if(el.closest('[data-replayday]'))return; // The whole card opens the achievement; no competing poke.
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
    if(typeof ddGreetCompletedCard==='function')ddGreetCompletedCard();
    const mode=mascotMode(),theme=document.documentElement.dataset.theme;
    document.documentElement.dataset.mascotMotion=mode;
    // Browser/install identity stays blue in both themes; only in-page art changes.
    for(const el of [...visible,...live.keys()]){
      if(!el.isConnected){remove(el);visible.delete(el);intersection.unobserve(el);}
    }
    document.querySelectorAll('[data-mascot]').forEach(el=>{
      const image=el.querySelector('img');
      const tone=mascotTone(el.dataset.mascot,el.dataset.mascotTone);
      const path=isRetro()?retroStill(el.dataset.mascot,tone):'assets/mascot-'+tone+'.png';
      if(image&&image.getAttribute('src')!==path)image.src=path;
      if(!el.dataset.observed){el.dataset.observed='true';intersection.observe(el);}
      if(live.has(el)&&el.dataset.renderSkin!==(isRetro()?'retro':'normal'))remove(el);
      if(mode==='off'||still()||document.hidden)remove(el);
      else if(live.has(el))live.get(el).update({theme,still:false});
      else mount(el);
    });
  }
  function queue(){if(!scheduled){scheduled=true;queueMicrotask(reconcile);}}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  new MutationObserver(queue).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-appearance']});
  document.addEventListener('visibilitychange',queue);
  reduced.addEventListener('change',queue);
  window.addEventListener('pagehide',()=>{live.forEach((_,el)=>remove(el));});
  window.addEventListener('pageshow',queue);
  document.addEventListener('mascotsettingschange',queue);
  queue();
})();

/* v4.6.135: THE SECRET. Three taps on the Today mascot, each within 600ms of
   the last, open the gym film (js/gym-tour.js) full screen. It loops, keeps
   playing through a rotation (the film reflows to the new size; sideways it
   fills the screen), and any tap closes it back to Today exactly as it was.
   Nothing on screen points at it. Works in every look and motion setting, as
   long as a mascot is there to tap. Reads and writes nothing. */
(()=>{
  let taps=[],open=null;
  function close(){
    if(!open)return;
    const o=open;open=null;o.player?.stop();o.el.remove();document.removeEventListener('keydown',o.key,true);
    document.documentElement.classList.remove('gym-tour-open');
  }
  async function play(){
    if(open)return;
    const el=document.createElement('div');el.id='gymTour';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
    el.setAttribute('aria-label','ShowUp gym film. Tap anywhere to close.');
    el.innerHTML='<canvas id="gymTourScreen" role="img" aria-label="Pixel-art ShowUp dumbbell mascot jumping through twelve US gyms, one per month."></canvas>';
    const key=e=>{if(e.key==='Escape'||e.key==='Enter'||e.key===' '){e.preventDefault();close();}};
    open={el,key,player:null};document.body.append(el);document.documentElement.classList.add('gym-tour-open');
    document.addEventListener('keydown',key,true);
    /* the tap that opened it must not close it: listen from the next one */
    setTimeout(()=>{if(open&&open.el===el)el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();close();});},350);
    try{
      const {playGymTour}=await import('./gym-tour.js');
      if(open&&open.el===el)open.player=playGymTour(el.querySelector('canvas'));
    }catch(_){close();}
  }
  document.addEventListener('pointerdown',e=>{
    const m=e.target.closest?.('.su-mascot');
    if(!m||open||typeof view==='undefined'||view!=='today'||!m.closest('#view')||m.closest('#dayDone')){taps=[];return;}
    const now=performance.now();taps=taps.filter(t=>now-t<600*2);taps.push(now);
    if(taps.length>=3&&taps[taps.length-1]-taps[taps.length-3]<1200){taps=[];play();}
  },{capture:true,passive:true});
  window.gymTour={play,close,get open(){return open;}};
})();

