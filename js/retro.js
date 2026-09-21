/* Optional Retro appearance. No workout, goal, navigation or reward state. */
function isRetro(){return document.documentElement.dataset.appearance==='retro';}
const retroImages=new Map();
function retroInk(mode,tone){
  const css=getComputedStyle(document.documentElement);
  return css.getPropertyValue(mode==='rest'?'--rest-ink':tone==='blue'?'--accent-ink':'--chalk').trim()||'#777';
}
function retroDraw(canvas,mode='hello',tone='',frame=0){
  canvas.width=84;canvas.height=56;
  const x=canvas.getContext('2d');x.imageSmoothingEnabled=false;
  const hop=[0,0,1,4,7,9,9,7,4,1,0,0][frame%12];
  const lift=mode==='rest'?0:hop,ox=21,oy=22-lift;
  x.fillStyle=retroInk(mode,tone);
  x.globalAlpha=.12;x.fillRect(24,49,36,1);x.globalAlpha=1;
  // Reference-led wide handle, stepped plates, separated eyes and smile.
  for(let y=0;y<24;y++)for(let a=0;a<42;a++){
    let plate=false;
    for(const start of [0,32]){const z=a-start;plate||=(z>=4&&z<7)||(y>=2&&y<22&&z>=2&&z<9)||(y>=5&&y<19&&z>=0&&z<10);}
    const hit=plate||(a>=9&&a<33&&y>=7&&y<17);
    const eyes=mode==='rest'?(y===11&&((a>=16&&a<19)||(a>=23&&a<26))):((a>=16&&a<19)||(a>=23&&a<26))&&y>=9&&y<12;
    const smile=((a===18||a===23)&&y===14)||(a>=19&&a<23&&y===15);
    if(hit&&!eyes&&!smile)x.fillRect(ox+a,oy+y,1,1);
  }
  if(frame>=5&&frame<=7){x.fillRect(15,13,1,3);x.fillRect(14,14,3,1);x.fillRect(66,18,1,3);x.fillRect(65,19,3,1);}
  return canvas;
}
function retroStill(mode,tone){
  const key=mode+'|'+retroInk(mode,tone);
  if(!retroImages.has(key))retroImages.set(key,retroDraw(document.createElement('canvas'),mode,tone).toDataURL());
  return retroImages.get(key);
}
function retroMark(){
  const c=retroDraw(document.createElement('canvas'),'hello','');
  // Square share mark, with integer-aligned source pixels and transparent padding.
  const out=document.createElement('canvas');out.width=out.height=48;
  out.getContext('2d').drawImage(c,18,18,48,32,0,8,48,32);return out;
}
function createRetroMascot(el,{mode='hello',tone=''}={}){
  const canvas=document.createElement('canvas');el.appendChild(canvas);
  let timer=null,disposed=false;
  function draw(frame=0){
    if(disposed)return;
    retroDraw(canvas,mode,tone,frame);
    const scale=Math.max(1,Math.floor(el.getBoundingClientRect().width/84));
    canvas.style.width=84*scale+'px';canvas.style.height=56*scale+'px';
  }
  function stop(){clearTimeout(timer);timer=null;}
  function replay(){
    stop();draw();if(document.hidden||mascotMode()!=='animated'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let frame=0;function step(){if(disposed||document.hidden)return;draw(frame++);if(frame<12)timer=setTimeout(step,90);else draw();}step();
  }
  const resize=new ResizeObserver(()=>draw());resize.observe(el);draw();
  // Celebrate only in the existing completion overlay. Ordinary renders stay quiet.
  if(el.closest('#dayDone'))replay();
  return {replay,pause:stop,captureFrame(ms){stop();draw(ms<1080?Math.floor(ms/90):0);return canvas;},update(){draw();},dispose(){disposed=true;stop();resize.disconnect();canvas.remove();}};
}
let retroAudio=null;
function retroSound(kind='click'){
  if(!isRetro()||DB.settings.retroSound!==true||document.hidden)return;
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    retroAudio ||= new Audio();if(retroAudio.state==='suspended')retroAudio.resume().catch(()=>{});
    const notes=kind==='complete'?[523,659,784]:[660];
    notes.forEach((freq,i)=>{
      const o=retroAudio.createOscillator(),g=retroAudio.createGain(),t=retroAudio.currentTime+i*.09;
      o.type='square';o.frequency.value=freq;g.gain.setValueAtTime(.018,t);g.gain.exponentialRampToValueAtTime(.0001,t+.075);
      o.connect(g);g.connect(retroAudio.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+.08);
    });
  }catch(_){}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&retroAudio?.state==='running')retroAudio.suspend().catch(()=>{});});
