function mascotMode(){return 'animated';}
function showupppAnimate(host){
  const root=host?.querySelector('.showuppp-c');
  root?._stopShowuppp?.();
  if(!root||!root.animate||mascotMode()!=='animated'||document.hidden)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  if(reduce.matches)return;
  let running=[];
  const particles=[];
  function stop(){
    running.forEach(a=>a.cancel());running=[];
    particles.forEach(p=>p.remove());
    if(root._stopShowuppp===stop)delete root._stopShowuppp;
    host.removeEventListener('dd-left',stop);
    document.removeEventListener('visibilitychange',stop);
    document.removeEventListener('mascotsettingschange',stop);
    reduce.removeEventListener('change',stop);
  }
  root._stopShowuppp=stop;
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
{transform:'scale(1.18,1.4)',opacity:.35,filter:'blur(1.2px)',offset:.36},
{transform:'scale(1.18,1.4)',opacity:.35,filter:'blur(1.2px)',offset:.43},
{transform:'scaleX(1.15)',opacity:1,offset:.65},
{transform:'scaleX(.85)',opacity:.65,offset:.79},
{transform:'scaleX(1)',opacity:1,offset:1}
],1400);
['s','h','o','w'].forEach((letter,i)=>{
const lean=[-7,5,-5,7][i];
animate(root.querySelector('[data-letter="'+letter+'"]'),[
pose('translateY(0) rotate(0deg) scale(1)',0),
pose('translateY(0) rotate(0deg) scale(1)',.04),
pose('translateY(5px) rotate('+(-lean*.4)+'deg) scale(1.08,.86)',.12),
pose('translateY(-42px) rotate('+lean+'deg) scale(.95,1.08)',.28),
pose('translateY(-34px) rotate(0deg) scale(1)',.43),
pose('translateY(-34px) rotate(0deg) scale(1)',.58),
pose('translateY(3px) rotate(0deg) scale(1.045,.955)',.76),
pose('translateY(-5px) rotate(0deg) scale(1)',.87),
pose('translateY(0) rotate(0deg) scale(1)',1)
],3000,i*75);
});
const wordmark=root.querySelector('.showuppp-lettering');
const baseColor=getComputedStyle(wordmark).color;
const accent=getComputedStyle(root).getPropertyValue('--accent-ink').trim();
['u','p1','p2','p3'].forEach((letter,i)=>{
const height=[23,25,30,35][i],lean=[-5,7,-7,9][i];
animate(root.querySelector('[data-letter="'+letter+'"]'),[
{...pose('translateY(0) rotate(0deg) scale(1)',0),color:baseColor},
{...pose('translateY(0) rotate(0deg) scale(1)',.05),color:baseColor},
pose('translateY(13px) rotate('+(-lean*.4)+'deg) scale(1.08,.82)',.18),
{...pose('translateY(-'+height+'px) rotate('+lean+'deg) scale(.94,1.08)',.39),color:accent},
pose('translateY(6px) rotate('+(-lean*.35)+'deg) scale(1.07,.9)',.58),
{...pose('translateY(-8px) rotate(2deg) scale(1)',.75),color:accent},
pose('translateY(2px) rotate(0deg) scale(1.01,.98)',.90),
{...pose('translateY(0) rotate(0deg) scale(1)',1),color:baseColor}
],1900,380+i*200);
});
animate(wordmark,[
pose('rotate(0deg) scale(1)',0),
pose('rotate(-2deg) scale(.95)',.09),
pose('rotate(1deg) scale(1.06)',.26),
pose('rotate(-1deg) scale(1.025)',.48),
pose('rotate(.5deg) scale(1.015)',.74),
pose('rotate(0deg) scale(.99)',.88),
pose('rotate(0deg) scale(1)',1)
],3500);
// A small, local burst from the approved preview, never a page-wide confetti loop.
[[86,4,-14,-21,-25],[92,18,22,-14,50],[98,44,28,0,90],[88,88,20,18,150],
 [52,0,-18,-18,-60],[44,44,-20,4,65],[72,100,4,23,120],[25,12,-15,-23,-40]]
 .forEach(([x,y,dx,dy,turn],i)=>{
  const dot=document.createElement('i');dot.className='showuppp-burst';
  dot.setAttribute('aria-hidden','true');dot.style.left=x+'%';dot.style.top=y+'%';
  root.append(dot);particles.push(dot);
  animate(dot,[
   {opacity:0,transform:'translate(0,0) rotate(0deg) scale(.1)',offset:0},
   {opacity:1,offset:.15},{opacity:.9,offset:.65},
   {opacity:0,transform:'translate('+dx+'px,'+dy+'px) rotate('+turn+'deg) scale(.25)',offset:1}
  ],800,1100+i*40);
 });

  Promise.allSettled(running.map(a=>a.finished)).then(stop);
}
