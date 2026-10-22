/* First-run presentation only. Authentication remains in today's delegated
   data-onbact handlers. No storage writes, account changes or setup decisions.
   The official 4096px still breathes through CSS, including in WKWebView.
   A smaller approved still is retained as a loading-error fallback. */
const WORLD_GYMS=[
  ['seoul','Seoul'],['tokyo','Tokyo'],
  ['nyc','New York'],['la','Los Angeles'],
  ['london','London'],['paris','Paris'],
  ['shanghai','Shanghai'],['bangkok','Bangkok'],
  ['manila','Manila'],['sydney','Sydney'],
  ['rome','Rome'],['saopaulo','São Paulo']
];
let onbWorldStop=null;
function onbWorldHTML(){
  return `<section class="ww-root" aria-label="Welcome to ShowUppp">
    <div class="ww-scene" aria-hidden="true"><img class="ww-visible" src="assets/welcome/seoul.webp" alt="" fetchpriority="high"><img alt=""></div><div class="ww-scrim"></div>
    <img class="ww-brand" src="assets/welcome/logo.png" alt="ShowUppp" width="106" height="40">
    <button type="button" class="ww-motion" aria-label="Pause animation" aria-pressed="false"></button>
    <div class="ww-heading"><h1><span>Life happens.</span><span>You show up.</span></h1></div>
    <div class="ww-city"><strong>Seoul</strong></div>
    <div class="ww-pip-place" aria-hidden="true"><div class="ww-contact"></div><div class="ww-pip"><img class="ww-still" src="assets/welcome/pip-white-4096.png" alt="" width="4096" height="2456"></div></div>
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
  let disposed=false,paused=media.matches,index=0,active=0,busy=false,timer=0,fadeTimer=0;
  const requests=new Map();
  function fallback(){if(!disposed&&still.getAttribute('src')!=='assets/welcome/pip.png')still.src='assets/welcome/pip.png';}
  still.addEventListener('error',fallback);
  const icons={pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1.2"/><rect x="14" y="4" width="5" height="16" rx="1.2"/></svg>',play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.8c0-.8.9-1.3 1.6-.9l12 7.2a1.05 1.05 0 0 1 0 1.8l-12 7.2c-.7.4-1.6-.1-1.6-.9z"/></svg>'};
  const running=()=>!disposed&&!paused&&!document.hidden&&!host.hidden&&root.isConnected;
  function load(i){if(requests.has(i))return requests.get(i);const promise=new Promise((resolve,reject)=>{const img=new Image(),timeout=setTimeout(()=>{img.onload=img.onerror=null;reject(new Error('City image timed out'));},15000);img.onload=()=>{clearTimeout(timeout);resolve(img);};img.onerror=()=>{clearTimeout(timeout);reject(new Error('City image unavailable'));};img.src='assets/welcome/'+WORLD_GYMS[i][0]+'.webp';});requests.set(i,promise);promise.catch(()=>requests.delete(i));return promise;}
  function schedule(){clearTimeout(timer);if(running()&&!media.matches&&!busy)timer=setTimeout(advance,8500);}
  async function advance(){if(!running()||media.matches||busy)return;busy=true;const next=(index+1)%WORLD_GYMS.length;try{await load(next);if(!running()||media.matches){busy=false;return;}const other=1-active;layers[other].src='assets/welcome/'+WORLD_GYMS[next][0]+'.webp';if(layers[other].decode)await layers[other].decode();if(!running()||media.matches){busy=false;return;}layers[other].classList.add('ww-visible');layers[active].classList.remove('ww-visible');active=other;index=next;root.querySelector('.ww-city strong').textContent=WORLD_GYMS[index][1];fadeTimer=setTimeout(()=>{busy=false;schedule();},1400);load((index+1)%WORLD_GYMS.length).catch(()=>{});}catch(e){busy=false;schedule();}}
  function sync(){if(disposed)return;const stopped=!running()||media.matches;root.classList.toggle('ww-paused',stopped);button.innerHTML=icons[paused?'play':'pause'];button.setAttribute('aria-label',paused?'Play animation':'Pause animation');button.setAttribute('aria-pressed',String(paused));schedule();}
  function toggle(){paused=!paused;sync();}
  function preference(){if(media.matches)paused=true;sync();}
  function stop(){if(disposed)return;disposed=true;clearTimeout(timer);clearTimeout(fadeTimer);hidden?.disconnect();document.removeEventListener('visibilitychange',sync);media.removeEventListener?.('change',preference);button.removeEventListener('click',toggle);still.removeEventListener('error',fallback);if(onbWorldStop===stop)onbWorldStop=null;}
  const hidden=typeof MutationObserver==='function'?new MutationObserver(()=>{if(host.hidden||!root.isConnected)stop();}):null;hidden?.observe(host,{attributes:true,attributeFilter:['hidden'],childList:true});
  button.addEventListener('click',toggle);document.addEventListener('visibilitychange',sync);media.addEventListener?.('change',preference);
  onbWorldStop=stop;sync();if(still.complete&&!still.naturalWidth)fallback();if(!media.matches)load(1).catch(()=>{});
}
