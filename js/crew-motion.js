/* Approved 3D renders, transparent and single-shot. Ten characters share this
   lifecycle; no CSS stretching, off-screen work, or profile/data mutations. */
const active=new Map(),assets=new Map(),reduce=matchMedia('(prefers-reduced-motion: reduce)');
const allowed=()=>!document.hidden&&!reduce.matches&&(typeof mascotMode!=='function'||mascotMode()==='animated');
const stillURL=el=>`assets/crew/${el.dataset.crew}${el.dataset.crewMoment==='rest'?'-rest-still':''}.webp`;
function stop(el){const s=active.get(el);if(!s)return;s.ticket++;clearTimeout(s.timer);if(s.url)URL.revokeObjectURL(s.url);s.url=null;const img=el.querySelector('.crew-art');if(img)img.src=stillURL(el);el.dataset.crewPlaying='false';}
async function play(el,moment){const s=active.get(el);if(!s||!s.visible||!allowed()||el.closest('.club-locked,.ad-dim'))return;
 stop(el);const ticket=s.ticket,url=`assets/crew/${el.dataset.crew}-${moment}.webp`;
 try{if(!assets.has(url))assets.set(url,fetch(url).then(r=>{if(!r.ok)throw Error('Crew asset');return r.blob();}).catch(e=>{assets.delete(url);throw e;}));const blob=await assets.get(url);
 if(!el.isConnected||s.ticket!==ticket||!s.visible||!allowed())return;
 s.url=URL.createObjectURL(blob);const img=el.querySelector('.crew-art');img.src=s.url;el.dataset.crewPlaying=moment;
 s.timer=setTimeout(()=>stop(el),4100);
 }catch(_){stop(el);}
}
const observer=new IntersectionObserver(entries=>{for(const e of entries){const s=active.get(e.target);if(!s)continue;s.visible=e.isIntersecting;if(!s.visible)stop(e.target);else if(e.target.classList.contains('club-animate'))play(e.target,e.target.dataset.crewMoment||'hello');}},{threshold:.15});
function scan(){for(const[el,s]of active)if(!el.isConnected){stop(el);observer.unobserve(el);active.delete(el);}
 document.querySelectorAll('[data-crew]').forEach(el=>{if(active.has(el))return;active.set(el,{ticket:0,visible:false});observer.observe(el);});}
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});scan();
document.addEventListener('pointerdown',e=>{const el=e.target.closest?.('[data-crew]');if(!el||el.closest('.club-locked,.ad-dim'))return;play(el,'tap');if(el.dataset.crew==='headphones'&&allowed()&&(typeof loggerPrefs==='undefined'||loggerPrefs.sound)){try{sound.currentTime=0;sound.play().catch(()=>{});}catch(_){}}},{passive:true});
document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const el=e.target.querySelector?.('[data-crew]');if(el)play(el,'tap');});
const sound=new Audio('assets/crew/beats-cue.wav');sound.preload='none';sound.volume=.45;
function refresh(){sound.pause();for(const[el,s]of active){stop(el);if(allowed()&&s.visible&&el.classList.contains('club-animate'))play(el,el.dataset.crewMoment||'hello');}}
document.addEventListener('visibilitychange',refresh);document.addEventListener('mascotsettingschange',refresh);reduce.addEventListener('change',refresh);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-logger-feedback="sound"]'))sound.pause();});
// Existing plate replay sends the same event as Pip; retain that interaction.
document.addEventListener('mascotreplay',e=>{const el=e.target.matches?.('[data-crew]')?e.target:e.target.querySelector?.('[data-crew]');if(el)play(el,'tap');},true);
