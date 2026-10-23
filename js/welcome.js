/* First-run presentation only; existing delegated authentication and setup remain intact. */
const WORLD_GYMS=[["seoul","Seoul"],["tokyo","Tokyo"],["shanghai","Shanghai"],["bangkok","Bangkok"],["manila","Manila"],["la","Los Angeles"],["nyc","New York"],["saopaulo","São Paulo"],["london","London"],["paris","Paris"],["rome","Rome"],["sydney","Sydney"]];
let onbWorldStop=null;
function onbWorldHTML(){
  return `<section class="ww-root" aria-label="Welcome to ShowUppp">
    <div class="ww-scene" aria-hidden="true"><img class="ww-visible" src="assets/welcome/pixel-tokyo.webp" alt="" fetchpriority="high"><img alt=""><canvas class="ww-lights"></canvas></div><div class="ww-scrim"></div>
    <div class="ww-surface" aria-hidden="true"></div>
    <div class="ww-brand" role="img" aria-label="ShowUppp"><div class="ww-pip-place" aria-hidden="true"><div class="ww-pip"><img class="ww-still" src="assets/welcome/pip-white-4096.png" alt="" width="4096" height="2456"><div class="ww-stage"></div></div></div><img class="ww-wordmark" src="assets/welcome/wordmark-white.svg" alt="" aria-hidden="true"></div>
    <button type="button" class="ww-motion" aria-label="Pause animation" aria-pressed="false"></button>
    <div class="ww-heading"><h1><span>Life happens.</span><span>You show up.</span></h1></div>
    <div class="ww-city"><strong>Tokyo</strong></div>
    <div class="ww-actions" aria-label="Join ShowUppp">
      <button type="button" class="ww-apple" data-onbact="apple">${ONB_APPLE}<span>Continue with Apple</span></button>
      <button type="button" class="ww-google" data-onbact="signin">${ONB_GOOGLE}<span>Continue with Google</span></button>
      <button type="button" class="ww-local" data-onbact="local">Continue without an account</button>
      <p>Sign in to sync. Or keep it on this device.</p>
    </div></section>`;
}

function onbWorldMount(host){
 const root=host.querySelector('.ww-root');if(!root)return;
 const media=matchMedia('(prefers-reduced-motion: reduce)'),layers=[...root.querySelectorAll('.ww-scene img')],button=root.querySelector('.ww-motion'),still=root.querySelector('.ww-still');
 let disposed=false,paused=media.matches,index=1,active=0,busy=false,timer=0,effects=null,model=null,raf=0,time=0,last=performance.now(),painted=0,frame=0;
 const requests=new Map(),pending=new Set();
 const icons={pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1.2"/><rect x="14" y="4" width="5" height="16" rx="1.2"/></svg>',play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.8c0-.8.9-1.3 1.6-.9l12 7.2a1.05 1.05 0 0 1 0 1.8l-12 7.2c-.7.4-1.6-.1-1.6-.9z"/></svg>'};
 const alive=()=>!disposed&&!host.hidden&&root.isConnected;
 const ambient=()=>alive()&&!document.hidden&&!document.querySelector('dialog[open]');
 const running=()=>ambient()&&!paused;
 function fallback(){if(alive()&&still.getAttribute('src')!=='assets/welcome/pip.png')still.src='assets/welcome/pip.png';}
 still.addEventListener('error',fallback);
 function load(i){if(requests.has(i))return requests.get(i);const promise=new Promise((resolve,reject)=>{
  const img=new Image();let timeout;const cancel=()=>{clearTimeout(timeout);img.onload=img.onerror=null;pending.delete(cancel);reject(new Error('City image unavailable'));};pending.add(cancel);timeout=setTimeout(cancel,15000);
  img.onload=()=>{clearTimeout(timeout);img.onload=img.onerror=null;pending.delete(cancel);resolve(img);};img.onerror=cancel;img.src='assets/welcome/pixel-'+WORLD_GYMS[i][0]+'.webp';
 });requests.set(i,promise);promise.catch(()=>requests.delete(i));return promise;}
 function schedule(){clearTimeout(timer);if(running()&&!busy)timer=setTimeout(advance,8500);}
 async function advance(){if(!running()||busy)return;busy=true;let cleanup;const next=(index+1)%WORLD_GYMS.length;
  try{await load(next);if(!running())return;const other=1-active;layers[other].src='assets/welcome/pixel-'+WORLD_GYMS[next][0]+'.webp';await layers[other].decode();if(!running())return;
   if(effects&&!media.matches)cleanup=await effects.reveal({from:layers[active],to:layers[other],nextIndex:next});
   if(!alive())return;layers[other].classList.add('ww-visible');layers[active].classList.remove('ww-visible');active=other;index=next;root.querySelector('.ww-city strong').textContent=WORLD_GYMS[index][1];
   load((index+1)%WORLD_GYMS.length).catch(()=>{});
  }catch(e){/* Retain the current scene and all entry actions on a failed load. */}finally{cleanup?.();busy=false;if(alive())schedule();}
 }
 function sync(){if(!alive()){stop();return;}root.classList.toggle('ww-paused',!running());root.classList.toggle('ww-suspended',!ambient());root.classList.toggle('ww-reduced',media.matches);button.innerHTML=icons[paused?'play':'pause'];button.setAttribute('aria-label',paused?'Resume city transitions':'Pause city transitions');button.setAttribute('aria-pressed',String(paused));schedule();}
 function toggle(){paused=!paused;sync();}
 function preference(){if(media.matches)paused=true;sync();}
 function paint(t){if(!model)return;const canvas=model.captureFrame(t);canvas.dataset.frame=String(++frame);canvas.dataset.time=String(Math.round(t));}
 function tick(now){if(!alive()){stop();return;}if(ambient()&&!media.matches){time+=Math.min(now-last,80);if(now-painted>1000/24){paint(time);painted=now;}}else if(media.matches&&time!==0){time=0;paint(0);}last=now;raf=requestAnimationFrame(tick);}
 function stop(){if(disposed)return;disposed=true;clearTimeout(timer);cancelAnimationFrame(raf);effects?.dispose();model?.dispose();pending.forEach(fn=>fn());hidden.disconnect();dialogs.disconnect();document.removeEventListener('visibilitychange',sync);window.removeEventListener('pagehide',stop);media.removeEventListener?.('change',preference);button.removeEventListener('click',toggle);still.removeEventListener('error',fallback);if(onbWorldStop===stop)onbWorldStop=null;}
 const hidden=new MutationObserver(()=>{if(!alive())stop();});hidden.observe(host,{attributes:true,attributeFilter:['hidden'],childList:true});if(host.parentNode)hidden.observe(host.parentNode,{childList:true});
 const dialogs=new MutationObserver(sync);dialogs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
 button.addEventListener('click',toggle);document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',stop);media.addEventListener?.('change',preference);
 onbWorldStop=stop;sync();if(still.complete&&!still.naturalWidth)fallback();load(2).catch(()=>{});
 import('./welcome-effects.js').then(m=>{if(alive())effects=m.mountCityEffects(root,()=>({index,active}),media);}).catch(()=>{});
 import('./welcome-pip.js').then(m=>{if(!alive())return;try{model=m.createMascot(root.querySelector('.ww-stage'),{theme:'dark',tone:'white',mode:'idle',shadow:false,comparisonMotion:true});model.pause();root.querySelector('.ww-pip').classList.add('ww-ready');paint(0);last=performance.now();raf=requestAnimationFrame(tick);}catch(e){root.querySelector('.ww-stage').replaceChildren();}}).catch(()=>{});
}
window.addEventListener('pageshow',event=>{if(event.persisted&&!onbWorldStop){const host=document.getElementById('onb'),root=host?.querySelector('.ww-root');if(root&&!host.hidden){root.outerHTML=onbWorldHTML();onbWorldMount(host);}}});
